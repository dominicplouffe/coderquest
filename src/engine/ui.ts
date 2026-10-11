// Sierra-style windows: message boxes, the text-input line, the menu bar,
// button dialogs, save/restore and inventory.

import { Surface, Img } from './raster';
import { textWidth, wrapText, LINE_H } from './font';
import { DARKER } from './palette';

export const UI = {
  bg: 15,
  fg: 0,
  border: 4,
  titleBg: 4,
  titleFg: 15,
  hiBg: 1,
  hiFg: 15,
  dim: 8,
};

export interface KeyIn {
  key: string;
  code: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export interface Modal {
  /** freeze the world while shown */
  blocks: boolean;
  /** modal draws over the whole screen (title, credits) */
  fullscreen?: boolean;
  draw(s: Surface, t: number): void;
  key?(k: KeyIn): void;
  click?(x: number, y: number, button: number): void;
  move?(x: number, y: number): void;
  tick?(t: number): void;
  cursor?: 'arrow' | 'wait' | 'none';
  /** set by game when the modal is closed */
  closed?: boolean;
}

export function shade(s: Surface, x: number, y: number, w: number, h: number, times = 2) {
  for (let yy = Math.max(0, y); yy < Math.min(s.h, y + h); yy++)
    for (let xx = Math.max(0, x); xx < Math.min(s.w, x + w); xx++) {
      const i = yy * s.w + xx;
      let c = s.px[i];
      for (let k = 0; k < times; k++) c = DARKER[c];
      s.px[i] = c;
    }
}

export function drawWindow(s: Surface, x: number, y: number, w: number, h: number, title?: string) {
  shade(s, x + 3, y + 3, w, h);
  s.rect(x, y, w, h, UI.bg);
  s.frame(x, y, w, h, UI.border);
  s.frame(x + 2, y + 2, w - 4, h - 4, UI.border);
  if (title) {
    const tw = textWidth(title) + 12;
    const tx = x;
    const ty = y - 11;
    shade(s, tx + 3, ty + 3, tw, 11);
    s.rect(tx, ty, tw, 12, UI.titleBg);
    s.frame(tx, ty, tw, 12, UI.border);
    s.text(tx + 6, ty + 2, title, UI.titleFg);
  }
}

export function drawButton(s: Surface, x: number, y: number, w: number, label: string, selected: boolean) {
  const h = 13;
  s.rect(x, y, w, h, selected ? UI.hiBg : UI.bg);
  s.frame(x, y, w, h, UI.fg);
  if (selected) s.frame(x - 1, y - 1, w + 2, h + 2, UI.fg);
  s.text(x + Math.floor((w - textWidth(label)) / 2), y + 3, label, selected ? UI.hiFg : UI.fg);
}

// ---------------------------------------------------------------- message box
export interface MessageOpts {
  title?: string;
  icon?: Img | null;
  width?: number;
  /** vertical placement hint */
  y?: number;
  /** auto-dismiss after this many ticks (no input needed) */
  timeout?: number;
}

export class MessageBox implements Modal {
  blocks = true;
  lines: string[];
  w: number;
  h: number;
  x: number;
  y: number;
  age = 0;
  constructor(
    public text: string,
    public opts: MessageOpts,
    public done: () => void,
  ) {
    const iconW = opts.icon ? opts.icon.w + 10 : 0;
    const maxW = opts.width ?? (opts.icon ? 196 : 236);
    this.lines = wrapText(text, maxW);
    const tw = Math.max(...this.lines.map(textWidth), opts.title ? textWidth(opts.title) : 0);
    this.w = Math.max(tw + 18 + iconW, 60);
    this.h = Math.max(this.lines.length * LINE_H + 14, opts.icon ? opts.icon.h + 14 : 0);
    this.x = Math.round((320 - this.w) / 2);
    const cy = opts.y ?? 82;
    this.y = Math.max(opts.title ? 26 : 14, Math.min(196 - this.h, Math.round(cy - this.h / 2)));
  }
  tick() {
    this.age++;
    if (this.opts.timeout && this.age >= this.opts.timeout) this.done();
  }
  draw(s: Surface) {
    drawWindow(s, this.x, this.y, this.w, this.h, this.opts.title);
    let tx = this.x + 9;
    if (this.opts.icon) {
      const ic = this.opts.icon;
      const iy = this.y + Math.floor((this.h - ic.h) / 2);
      s.blit({ ...ic, ox: 0, oy: 0 }, this.x + 8, iy);
      tx += ic.w + 10;
    }
    const ty = this.y + 7 + Math.max(0, Math.floor((this.h - 14 - this.lines.length * LINE_H) / 2));
    this.lines.forEach((ln, i) => s.text(tx, ty + i * LINE_H, ln, UI.fg));
  }
  key(k: KeyIn) {
    if (this.age < 6) return;
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(k.key)) return;
    this.done();
  }
  click() {
    if (this.age < 6) return;
    this.done();
  }
}

// ---------------------------------------------------------------- text input
export class InputBox implements Modal {
  blocks = true;
  text: string;
  histIdx: number;
  age = 0;
  constructor(
    initial: string,
    public history: string[],
    public submit: (s: string) => void,
    public cancel: () => void,
  ) {
    this.text = initial;
    this.histIdx = history.length;
  }
  tick() {
    this.age++;
  }
  draw(s: Surface, t: number) {
    const x = 10,
      y = 168,
      w = 300,
      h = 20;
    drawWindow(s, x, y, w, h);
    const prompt = '>';
    s.text(x + 7, y + 6, prompt, UI.fg);
    let shown = this.text;
    const maxW = w - 26;
    while (textWidth(shown) > maxW) shown = shown.slice(1);
    const tw = s.text(x + 14, y + 6, shown, UI.fg);
    if (Math.floor(t / 16) % 2 === 0) s.rect(x + 15 + (shown ? tw : -1), y + 13, 5, 1, UI.fg);
  }
  key(k: KeyIn) {
    if (k.key === 'Enter') {
      this.submit(this.text);
    } else if (k.key === 'Escape') {
      this.cancel();
    } else if (k.key === 'Backspace') {
      this.text = this.text.slice(0, -1);
    } else if (k.key === 'ArrowUp' || k.key === 'F3') {
      if (this.history.length) {
        this.histIdx = Math.max(0, this.histIdx - 1);
        this.text = this.history[this.histIdx] ?? this.text;
      }
    } else if (k.key === 'ArrowDown') {
      this.histIdx = Math.min(this.history.length, this.histIdx + 1);
      this.text = this.history[this.histIdx] ?? '';
    } else if (k.key.length === 1 && !k.ctrl && !k.meta) {
      if (this.text.length < 70) this.text += k.key;
    }
  }
  click(x: number, y: number) {
    if (y < 160 && this.age > 4) this.cancel();
  }
}

// ---------------------------------------------------------------- button dialog
export class Dialog implements Modal {
  blocks = true;
  sel = 0;
  lines: string[];
  w: number;
  h: number;
  x: number;
  y: number;
  bw: number;
  age = 0;
  constructor(
    public text: string,
    public buttons: string[],
    public done: (i: number) => void,
    public opts: { title?: string; icon?: Img | null; cancel?: number; sel?: number } = {},
  ) {
    this.sel = opts.sel ?? 0;
    const iconW = opts.icon ? opts.icon.w + 10 : 0;
    this.lines = wrapText(text, opts.icon ? 200 : 240);
    this.bw = Math.max(...buttons.map((b) => textWidth(b) + 14), 44);
    const btnRow = buttons.length * (this.bw + 6) - 6;
    this.w = Math.max(Math.max(...this.lines.map(textWidth)) + 18 + iconW, btnRow + 18, opts.title ? textWidth(opts.title) + 20 : 0);
    this.h = Math.max(this.lines.length * LINE_H, opts.icon ? opts.icon.h : 0) + 34;
    this.x = Math.round((320 - this.w) / 2);
    this.y = Math.round((200 - this.h) / 2);
  }
  tick() {
    this.age++;
  }
  btnX(i: number) {
    const total = this.buttons.length * (this.bw + 6) - 6;
    return this.x + Math.floor((this.w - total) / 2) + i * (this.bw + 6);
  }
  draw(s: Surface) {
    drawWindow(s, this.x, this.y, this.w, this.h, this.opts.title);
    let tx = this.x + 9;
    if (this.opts.icon) {
      s.blit({ ...this.opts.icon, ox: 0, oy: 0 }, this.x + 8, this.y + 8);
      tx += this.opts.icon.w + 10;
    }
    this.lines.forEach((ln, i) => s.text(tx, this.y + 8 + i * LINE_H, ln, UI.fg));
    const by = this.y + this.h - 19;
    this.buttons.forEach((b, i) => drawButton(s, this.btnX(i), by, this.bw, b, i === this.sel));
  }
  key(k: KeyIn) {
    if (this.age < 6) return;
    if (k.key === 'ArrowLeft' || (k.key === 'Tab' && k.shift)) this.sel = (this.sel + this.buttons.length - 1) % this.buttons.length;
    else if (k.key === 'ArrowRight' || k.key === 'Tab') this.sel = (this.sel + 1) % this.buttons.length;
    else if (k.key === 'Enter' || k.key === ' ') this.done(this.sel);
    else if (k.key === 'Escape' && this.opts.cancel !== undefined) this.done(this.opts.cancel);
    else {
      const i = this.buttons.findIndex((b) => b[0].toLowerCase() === k.key.toLowerCase());
      if (i >= 0) this.done(i);
    }
  }
  hit(x: number, y: number): number {
    const by = this.y + this.h - 19;
    for (let i = 0; i < this.buttons.length; i++) {
      const bx = this.btnX(i);
      if (x >= bx && x < bx + this.bw && y >= by && y < by + 13) return i;
    }
    return -1;
  }
  move(x: number, y: number) {
    const i = this.hit(x, y);
    if (i >= 0) this.sel = i;
  }
  click(x: number, y: number) {
    if (this.age < 6) return;
    const i = this.hit(x, y);
    if (i >= 0) this.done(i);
  }
}

// ---------------------------------------------------------------- menu bar
export interface MenuItem {
  label: string;
  key?: string;
  action: () => void;
  enabled?: () => boolean;
  checked?: () => boolean;
  sep?: boolean;
}
export interface Menu {
  title: string;
  items: MenuItem[];
}

export class MenuBar implements Modal {
  blocks = true;
  open = -1;
  sel = 0;
  xs: number[] = [];
  constructor(
    public menus: Menu[],
    public close: () => void,
    startOpen = 0,
  ) {
    let x = 8;
    for (const m of menus) {
      this.xs.push(x);
      x += textWidth(m.title) + 12;
    }
    this.open = startOpen;
    this.sel = this.firstEnabled(startOpen);
  }
  firstEnabled(mi: number) {
    if (mi < 0) return 0;
    const items = this.menus[mi].items;
    for (let i = 0; i < items.length; i++) if (!items[i].sep && (items[i].enabled?.() ?? true)) return i;
    return 0;
  }
  dropRect(mi: number) {
    const m = this.menus[mi];
    const w = Math.max(...m.items.map((it) => textWidth(it.label) + (it.key ? textWidth(it.key) + 22 : 10))) + 14;
    const x = Math.min(this.xs[mi] - 4, 316 - w);
    const h = m.items.length * 11 + 6;
    return { x, y: 10, w, h };
  }
  draw(s: Surface) {
    s.rect(0, 0, 320, 10, UI.bg);
    s.hline(0, 319, 9, UI.fg);
    this.menus.forEach((m, i) => {
      const x = this.xs[i];
      const w = textWidth(m.title) + 8;
      if (i === this.open) {
        s.rect(x - 4, 0, w, 9, UI.fg);
        s.text(x, 1, m.title, UI.bg);
      } else s.text(x, 1, m.title, UI.fg);
    });
    if (this.open >= 0) {
      const r = this.dropRect(this.open);
      shade(s, r.x + 3, r.y + 3, r.w, r.h);
      s.rect(r.x, r.y, r.w, r.h, UI.bg);
      s.frame(r.x, r.y, r.w, r.h, UI.fg);
      this.menus[this.open].items.forEach((it, i) => {
        const y = r.y + 3 + i * 11;
        if (it.sep) {
          for (let x = r.x + 4; x < r.x + r.w - 4; x += 2) s.plot(x, y + 5, UI.dim);
          return;
        }
        const en = it.enabled?.() ?? true;
        const hi = i === this.sel;
        if (hi) s.rect(r.x + 2, y, r.w - 4, 11, UI.fg);
        const fg = hi ? UI.bg : en ? UI.fg : UI.dim;
        const label = (it.checked?.() ? '•' : '') + it.label;
        s.text(r.x + 7, y + 2, label, fg);
        if (it.key) s.text(r.x + r.w - 6 - textWidth(it.key), y + 2, it.key, fg);
      });
    }
  }
  activate() {
    if (this.open < 0) return;
    const it = this.menus[this.open].items[this.sel];
    if (!it || it.sep || !(it.enabled?.() ?? true)) return;
    this.close();
    it.action();
  }
  moveSel(d: number) {
    const items = this.menus[this.open].items;
    for (let k = 0; k < items.length; k++) {
      this.sel = (this.sel + d + items.length) % items.length;
      if (!items[this.sel].sep) break;
    }
  }
  key(k: KeyIn) {
    if (k.key === 'Escape') this.close();
    else if (k.key === 'ArrowLeft') {
      this.open = (this.open + this.menus.length - 1) % this.menus.length;
      this.sel = this.firstEnabled(this.open);
    } else if (k.key === 'ArrowRight') {
      this.open = (this.open + 1) % this.menus.length;
      this.sel = this.firstEnabled(this.open);
    } else if (k.key === 'ArrowDown') this.moveSel(1);
    else if (k.key === 'ArrowUp') this.moveSel(-1);
    else if (k.key === 'Enter' || k.key === ' ') this.activate();
  }
  hitTitle(x: number, y: number) {
    if (y >= 10) return -1;
    for (let i = this.menus.length - 1; i >= 0; i--) if (x >= this.xs[i] - 4) return i;
    return -1;
  }
  hitItem(x: number, y: number) {
    if (this.open < 0) return -1;
    const r = this.dropRect(this.open);
    if (x < r.x || x >= r.x + r.w || y < r.y + 3 || y >= r.y + r.h - 3) return -1;
    return Math.floor((y - r.y - 3) / 11);
  }
  move(x: number, y: number) {
    const t = this.hitTitle(x, y);
    if (t >= 0 && t !== this.open) {
      this.open = t;
      this.sel = this.firstEnabled(t);
    }
    const i = this.hitItem(x, y);
    if (i >= 0 && !this.menus[this.open].items[i].sep) this.sel = i;
  }
  click(x: number, y: number) {
    const t = this.hitTitle(x, y);
    if (t >= 0) {
      this.open = t;
      this.sel = this.firstEnabled(t);
      return;
    }
    const i = this.hitItem(x, y);
    if (i >= 0) {
      this.sel = i;
      this.activate();
    } else this.close();
  }
}

// ---------------------------------------------------------------- save / restore
export interface SlotInfo {
  desc: string;
  date: string;
}

export class SaveDialog implements Modal {
  blocks = true;
  sel = 0;
  editing = false;
  text = '';
  age = 0;
  constructor(
    public mode: 'save' | 'restore',
    public slots: (SlotInfo | null)[],
    public defaultDesc: string,
    public done: (slot: number | null, desc: string) => void,
  ) {
    if (mode === 'restore') {
      const first = slots.findIndex((s) => s);
      this.sel = Math.max(0, first);
    } else {
      const empty = slots.findIndex((s) => !s);
      this.sel = empty >= 0 ? empty : 0;
    }
  }
  tick() {
    this.age++;
  }
  readonly x = 24;
  readonly y = 28;
  readonly w = 272;
  readonly h = 158;
  draw(s: Surface, t: number) {
    drawWindow(s, this.x, this.y, this.w, this.h, this.mode === 'save' ? 'Save a Game' : 'Restore a Game');
    const hint =
      this.mode === 'save'
        ? this.editing
          ? 'Type a description, then press ENTER.'
          : 'Choose a slot and press ENTER.'
        : 'Choose a game to restore.';
    s.text(this.x + 9, this.y + 7, hint, UI.dim);
    for (let i = 0; i < this.slots.length; i++) {
      const y = this.y + 21 + i * 11;
      const sl = this.slots[i];
      const hi = i === this.sel;
      if (hi) s.rect(this.x + 6, y - 1, this.w - 12, 11, UI.hiBg);
      const fg = hi ? UI.hiFg : sl ? UI.fg : UI.dim;
      s.text(this.x + 9, y + 1, `${i + 1}.`, fg);
      let label = sl ? sl.desc : '- empty -';
      if (hi && this.editing) {
        label = this.text;
        const w = s.text(this.x + 24, y + 1, label, fg);
        if (Math.floor(t / 16) % 2 === 0) s.rect(this.x + 25 + w, y + 8, 5, 1, fg);
      } else {
        s.text(this.x + 24, y + 1, label, fg);
        if (sl) s.text(this.x + this.w - 10 - textWidth(sl.date), y + 1, sl.date, hi ? UI.hiFg : UI.dim);
      }
    }
    s.text(this.x + 9, this.y + this.h - 13, 'ESC cancels.', UI.dim);
  }
  confirm() {
    if (this.mode === 'restore') {
      if (this.slots[this.sel]) this.done(this.sel, '');
      return;
    }
    if (!this.editing) {
      this.editing = true;
      this.text = this.slots[this.sel]?.desc ?? this.defaultDesc;
      return;
    }
    this.done(this.sel, this.text.trim() || this.defaultDesc);
  }
  key(k: KeyIn) {
    if (this.age < 4) return;
    if (k.key === 'Escape') {
      if (this.editing) this.editing = false;
      else this.done(null, '');
      return;
    }
    if (k.key === 'Enter') return this.confirm();
    if (this.editing) {
      if (k.key === 'Backspace') this.text = this.text.slice(0, -1);
      else if (k.key.length === 1 && !k.ctrl && !k.meta && this.text.length < 34) this.text += k.key;
      return;
    }
    if (k.key === 'ArrowDown') this.sel = (this.sel + 1) % this.slots.length;
    if (k.key === 'ArrowUp') this.sel = (this.sel + this.slots.length - 1) % this.slots.length;
    if (/^[0-9]$/.test(k.key)) this.sel = (parseInt(k.key, 10) + 9) % 10;
  }
  click(x: number, y: number) {
    if (this.age < 4) return;
    const i = Math.floor((y - this.y - 20) / 11);
    if (x > this.x && x < this.x + this.w && i >= 0 && i < this.slots.length) {
      if (i === this.sel) this.confirm();
      else {
        this.sel = i;
        this.editing = false;
      }
    } else if (x < this.x || x > this.x + this.w || y < this.y || y > this.y + this.h) this.done(null, '');
  }
}

// ---------------------------------------------------------------- inventory
export interface InvEntry {
  id: string;
  name: string;
  icon: Img;
}

export class InventoryWindow implements Modal {
  blocks = true;
  sel = 0;
  age = 0;
  readonly cols = 3;
  readonly cw = 100;
  readonly rh = 24;
  constructor(
    public items: InvEntry[],
    public view: (id: string) => void,
    public close: () => void,
  ) {}
  tick() {
    this.age++;
  }
  get rows() {
    return Math.max(1, Math.ceil(this.items.length / this.cols));
  }
  get rect() {
    const w = this.cols * this.cw + 14;
    const h = this.rows * this.rh + 28;
    return { x: Math.round((320 - w) / 2), y: Math.max(22, Math.round((200 - h) / 2)), w, h };
  }
  draw(s: Surface) {
    const r = this.rect;
    drawWindow(s, r.x, r.y, r.w, r.h, 'You are carrying:');
    if (!this.items.length) {
      s.textC(160, r.y + 12, 'Nothing at all.', UI.fg);
    }
    this.items.forEach((it, i) => {
      const cx = r.x + 7 + (i % this.cols) * this.cw;
      const cy = r.y + 7 + Math.floor(i / this.cols) * this.rh;
      const hi = i === this.sel;
      if (hi) s.rect(cx, cy, this.cw - 2, this.rh - 1, UI.hiBg);
      s.blit({ ...it.icon, ox: 0, oy: 0 }, cx + 2, cy + Math.floor((this.rh - 1 - it.icon.h) / 2));
      const lines = wrapText(it.name, this.cw - 30);
      lines.slice(0, 2).forEach((ln, k) => s.text(cx + 26, cy + (lines.length > 1 ? 3 : 8) + k * 9, ln, hi ? UI.hiFg : UI.fg));
    });
    s.text(r.x + 9, r.y + r.h - 14, 'ENTER to examine, ESC to close.', UI.dim);
  }
  key(k: KeyIn) {
    if (this.age < 4) return;
    const n = this.items.length;
    if (k.key === 'Escape' || k.key === 'Tab') return this.close();
    if (!n) {
      if (k.key === 'Enter') this.close();
      return;
    }
    if (k.key === 'ArrowRight') this.sel = (this.sel + 1) % n;
    else if (k.key === 'ArrowLeft') this.sel = (this.sel + n - 1) % n;
    else if (k.key === 'ArrowDown') this.sel = Math.min(n - 1, this.sel + this.cols);
    else if (k.key === 'ArrowUp') this.sel = Math.max(0, this.sel - this.cols);
    else if (k.key === 'Enter' || k.key === ' ') this.view(this.items[this.sel].id);
  }
  hit(x: number, y: number) {
    const r = this.rect;
    const col = Math.floor((x - r.x - 7) / this.cw);
    const row = Math.floor((y - r.y - 7) / this.rh);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return -1;
    const i = row * this.cols + col;
    return i < this.items.length ? i : -1;
  }
  move(x: number, y: number) {
    const i = this.hit(x, y);
    if (i >= 0) this.sel = i;
  }
  click(x: number, y: number) {
    if (this.age < 4) return;
    const i = this.hit(x, y);
    const r = this.rect;
    if (i >= 0) this.view(this.items[i].id);
    else if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) this.close();
  }
}
