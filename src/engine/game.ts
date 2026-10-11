import { Surface, Img, TRANSPARENT } from './raster';
import { RGBA32, DARKER } from './palette';
import { Actor, Dir } from './actor';
import { WalkMap, Pt } from './walk';
import { parse, Command, makeLocal, addNouns, ANIMATE } from './parser';
import {
  Modal,
  MessageBox,
  MessageOpts,
  InputBox,
  Dialog,
  MenuBar,
  Menu,
  SaveDialog,
  SlotInfo,
  InventoryWindow,
  KeyIn,
  UI,
} from './ui';
import { AudioSys } from './audio';
import type { RoomDef, ItemDef, Hotspot, Area, Response } from './types';
import { textWidth } from './font';

export const MAX_SCORE = 256;
export const GAME_TITLE = "Coder's Quest";
const SAVE_PREFIX = 'coderquest.save.';
const AUTOSAVE_KEY = 'coderquest.autosave';
const SETTINGS_KEY = 'coderquest.settings';
const SAVE_VERSION = 1;

export interface GameState {
  v: number;
  room: string;
  px: number;
  py: number;
  pdir: Dir;
  score: number;
  awarded: Record<string, number>;
  inv: string[];
  flags: Record<string, any>;
  visited: Record<string, number>;
  moves: number;
  deaths: number;
  ticks: number;
}

export interface Settings {
  sound: boolean;
  music: boolean;
  volume: number;
  speed: number;
  crt: boolean;
  aspect: boolean;
}

/** Content hooks the engine calls into (supplied by the game content). */
export interface ContentHooks {
  newGame(g: Game): Promise<void> | void;
  showTitle(g: Game): void;
  fallback(g: Game, c: Command): Promise<void> | void;
  globalRaw?(g: Game, text: string): boolean | Promise<boolean>;
  globalVerbs?: Record<string, Response>;
  help(g: Game): Promise<void> | void;
  about(g: Game): Promise<void> | void;
  deathIcon?(): Img;
  playerSprite(): import('./actor').SpriteSet;
  hint?(g: Game): Promise<void> | void;
}

interface Waiter {
  ticks: number;
  resolve: () => void;
  gen: number;
}

export function inArea(a: Area, x: number, y: number): boolean {
  if (a.length === 4) return x >= a[0] && x < a[0] + a[2] && y >= a[1] && y < a[1] + a[3];
  let inside = false;
  const n = a.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = a[i * 2],
      yi = a[i * 2 + 1],
      xj = a[j * 2],
      yj = a[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function areaCenter(a: Area): Pt {
  if (a.length === 4) return { x: a[0] + a[2] / 2, y: a[1] + a[3] / 2 };
  let x = 0,
    y = 0;
  const n = a.length / 2;
  for (let i = 0; i < n; i++) {
    x += a[i * 2];
    y += a[i * 2 + 1];
  }
  return { x: x / n, y: y / n };
}

export function areaBottom(a: Area): Pt {
  if (a.length === 4) return { x: a[0] + a[2] / 2, y: a[1] + a[3] };
  let maxY = -Infinity,
    sx = 0,
    n = 0;
  for (let i = 0; i < a.length; i += 2) maxY = Math.max(maxY, a[i + 1]);
  for (let i = 0; i < a.length; i += 2) {
    sx += a[i];
    n++;
  }
  return { x: sx / n, y: maxY };
}

export class Game {
  // ---- display
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  off: HTMLCanvasElement;
  offCtx: CanvasRenderingContext2D;
  image: ImageData;
  u32: Uint32Array;
  screen = new Surface(320, 200);
  pic = new Surface(320, 190);
  frame = new Surface(320, 190);
  walkmap: WalkMap = new WalkMap(320, 190, []);
  palMap = new Uint8Array(256).map((_, i) => i);
  // ---- world
  rooms: Record<string, RoomDef> = {};
  items: Record<string, ItemDef> = {};
  room: RoomDef | null = null;
  player!: Actor;
  actors: Actor[] = [];
  state: GameState;
  hooks!: ContentHooks;
  localNouns = makeLocal(undefined);
  // ---- runtime
  t = 0;
  modals: Modal[] = [];
  busy = 0;
  gen = 0;
  waiters: Waiter[] = [];
  history: string[] = [];
  settings: Settings;
  audio = new AudioSys();
  checkpoint: string | null = null;
  playing = false;
  dying = false;
  mouse = { x: -1, y: -1, inside: false };
  hoverMenu = false;
  menus: Menu[] = [];
  heldKey: { key: string; at: number } | null = null;
  exitArmed = false;
  zoneInside = new Set<number>();
  // ---- effects
  shakeTicks = 0;
  flashTicks = 0;
  flashColor = 15;
  scoreFlash = 0;
  /** darkness: only a radius around the player is visible */
  light: { r: number; rainbow?: boolean; x?: number; y?: number } | null = null;
  dark = false;
  private dissolve: { old: Uint8Array; t: number; order: Uint32Array } | null = null;
  private static dissolveOrder: Uint32Array | null = null;
  private acc = 0;
  private last = 0;
  hideStatus = false;
  debug = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.off = document.createElement('canvas');
    this.off.width = 320;
    this.off.height = 200;
    this.offCtx = this.off.getContext('2d')!;
    this.image = this.offCtx.createImageData(320, 200);
    this.u32 = new Uint32Array(this.image.data.buffer);
    this.state = this.newState('');
    this.settings = this.loadSettings();
    this.audio.setSound(this.settings.sound);
    this.audio.setMusic(this.settings.music);
    this.audio.setVolume(this.settings.volume);
    this.buildMenus();
    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // =========================================================== registration
  registerRooms(list: RoomDef[]) {
    for (const r of list) {
      this.rooms[r.id] = r;
      if (r.nouns) addNouns(r.nouns);
      for (const h of r.hotspots ?? []) addNouns({ [h.id]: h.nouns ?? [] });
    }
  }
  registerItems(list: ItemDef[]) {
    for (const it of list) {
      this.items[it.id] = it;
      addNouns({ [it.id]: it.nouns });
    }
  }
  registerPeople(map: Record<string, string[]>) {
    addNouns(map);
    for (const k of Object.keys(map)) ANIMATE.add(k);
  }

  newState(room: string): GameState {
    return { v: SAVE_VERSION, room, px: 160, py: 160, pdir: 'down', score: 0, awarded: {}, inv: [], flags: {}, visited: {}, moves: 0, deaths: 0, ticks: 0 };
  }

  // =========================================================== settings
  loadSettings(): Settings {
    const d: Settings = { sound: true, music: true, volume: 0.7, speed: 1, crt: true, aspect: true };
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
      return { ...d, ...s };
    } catch {
      return d;
    }
  }
  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* storage unavailable */
    }
  }

  // =========================================================== display
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const ar = this.settings.aspect ? 4 / 3 : 320 / 200;
    let w = window.innerWidth,
      h = window.innerHeight;
    if (w / h > ar) w = h * ar;
    else h = w / ar;
    w = Math.floor(w);
    h = Math.floor(h);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.max(320, Math.round(w * dpr));
    this.canvas.height = Math.max(200, Math.round(h * dpr));
    this.ctx.imageSmoothingEnabled = false;
  }

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(100, now - this.last);
      this.last = now;
      this.acc += dt;
      let n = 0;
      while (this.acc >= 1000 / 60 && n < 6) {
        this.tick();
        this.acc -= 1000 / 60;
        n++;
      }
      if (n >= 6) this.acc = 0;
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    this.hooks.showTitle(this);
  }

  // =========================================================== main tick
  get frozen(): boolean {
    return this.modals.some((m) => m.blocks) || !this.playing;
  }

  tick() {
    this.t++;
    for (const m of this.modals) m.tick?.(this.t);
    if (this.scoreFlash > 0) this.scoreFlash--;
    if (this.flashTicks > 0) this.flashTicks--;
    if (this.shakeTicks > 0) this.shakeTicks--;
    if (this.dissolve) {
      this.dissolve.t += 1 / 14;
      if (this.dissolve.t >= 1) this.dissolve = null;
    }
    if (this.frozen || !this.room) return;
    this.state.ticks++;
    // waiters
    if (this.waiters.length) {
      const due: Waiter[] = [];
      this.waiters = this.waiters.filter((w) => {
        w.ticks--;
        if (w.ticks <= 0) {
          due.push(w);
          return false;
        }
        return true;
      });
      for (const w of due) if (w.gen === this.gen) w.resolve();
    }
    const speed = this.settings.speed;
    for (const a of this.actors) a.update(a.ghost ? null : this.walkmap, a === this.player ? speed : Math.max(1, speed * 0.9));
    this.room.tick?.(this);
    if (!this.frozen) this.checkTriggers();
  }

  private checkTriggers() {
    const r = this.room!;
    const p = this.player;
    if (!p.visible) return;
    const inExit = (r.exits ?? []).findIndex((e) => (e.when?.(this) ?? true) && inArea(e.area, p.x, p.y));
    if (inExit < 0) this.exitArmed = true;
    else if (this.exitArmed && this.busyLevel() === 0) {
      const e = r.exits![inExit];
      const msg = e.blocked?.(this);
      if (msg) {
        p.stop();
        // nudge back out of the trigger
        const c = areaCenter(e.area);
        const back = this.walkmap.nearest(p.x + Math.sign(p.x - c.x) * 6, p.y + Math.sign(p.y - c.y) * 4);
        if (back) p.place(back.x, back.y, p.dir);
        this.exitArmed = false;
        this.say(msg);
        return;
      }
      this.exitArmed = false;
      this.goto(e.to, e.at);
      return;
    } else if (this.exitArmed && this.busyLevel() > 0 && p.moving && !p.heading) {
      // scripted walks (e.g. "go north") may also leave
    }
    (r.zones ?? []).forEach((z, i) => {
      const active = z.when?.(this) ?? true;
      const inside = active && inArea(z.area, p.x, p.y);
      if (inside && !this.zoneInside.has(i)) {
        this.zoneInside.add(i);
        this.script(async () => {
          await z.enter(this);
        });
      } else if (!inside) this.zoneInside.delete(i);
    });
  }

  busyLevel() {
    return this.busy;
  }

  // =========================================================== rendering
  render() {
    const s = this.screen;
    const full = this.modals.find((m) => m.fullscreen);
    if (full) {
      s.clear(0);
      full.draw(s, this.t);
      for (const m of this.modals) if (m !== full && this.modals.indexOf(m) > this.modals.indexOf(full)) m.draw(s, this.t);
    } else if (this.room) {
      this.renderWorld();
      this.drawStatus();
      for (const m of this.modals) m.draw(s, this.t);
    } else {
      s.clear(0);
      for (const m of this.modals) m.draw(s, this.t);
    }
    this.drawCursor();
    // to RGBA
    const map = this.palMap;
    const fl = this.flashTicks > 0 ? this.flashColor : -1;
    const px = s.px,
      u32 = this.u32;
    for (let i = 0; i < 64000; i++) u32[i] = RGBA32[fl >= 0 && i >= 3200 ? fl : map[px[i]]];
    this.offCtx.putImageData(this.image, 0, 0);
    const cw = this.canvas.width,
      ch = this.canvas.height;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.off, 0, 0, cw, ch);
    if (this.settings.crt) this.drawCRT(cw, ch);
  }

  private crtGrad: CanvasGradient | null = null;
  private crtSize = '';
  private drawCRT(cw: number, ch: number) {
    const ctx = this.ctx;
    const rowH = ch / 200;
    if (rowH >= 2.5) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      const bh = Math.max(1, rowH * 0.28);
      for (let r = 0; r < 200; r++) ctx.fillRect(0, (r + 1) * rowH - bh, cw, bh);
    }
    const key = `${cw}x${ch}`;
    if (!this.crtGrad || this.crtSize !== key) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.38)');
      this.crtGrad = g;
      this.crtSize = key;
    }
    ctx.fillStyle = this.crtGrad;
    ctx.fillRect(0, 0, cw, ch);
  }

  private renderWorld() {
    const f = this.frame;
    const r = this.room!;
    f.px.set(this.pic.px);
    r.overlay?.(this, f, this.t);
    const sorted = this.actors.filter((a) => a.visible).sort((a, b) => (a.z ?? a.y) - (b.z ?? b.y));
    for (const a of sorted) this.drawActor(a);
    r.front?.(this, f, this.t);
    if (this.light) this.applyLight();
    if (this.dark) f.px.fill(0);
    const s = this.screen;
    // dissolve transition
    if (this.dissolve) {
      const d = this.dissolve;
      const cut = Math.floor(d.t * d.order.length);
      const tmp = d.old;
      // copy new frame in revealed blocks, old elsewhere
      const out = new Uint8Array(f.px);
      for (let k = cut; k < d.order.length; k++) {
        const b = d.order[k];
        const bx = (b % 160) * 2,
          by = Math.floor(b / 160) * 2;
        const i0 = by * 320 + bx;
        out[i0] = tmp[i0];
        out[i0 + 1] = tmp[i0 + 1];
        out[i0 + 320] = tmp[i0 + 320];
        out[i0 + 321] = tmp[i0 + 321];
      }
      s.px.set(out, 3200);
    } else s.px.set(f.px, 3200);
    if (this.shakeTicks > 0) {
      const dx = this.t % 4 < 2 ? 2 : -2;
      const row = new Uint8Array(320);
      for (let y = 10; y < 200; y++) {
        const o = y * 320;
        row.set(s.px.subarray(o, o + 320));
        for (let x = 0; x < 320; x++) s.px[o + x] = row[Math.min(319, Math.max(0, x - dx))];
      }
    }
  }

  drawActor(a: Actor) {
    const img = a.currentImg(this.t);
    if (!img) return;
    const f = this.frame;
    const base = a.z ?? a.y;
    const x0 = Math.round(a.x) - img.ox;
    const y0 = Math.round(a.y) - img.oy;
    const map = a.map;
    for (let yy = 0; yy < img.h; yy++) {
      const sy = y0 + yy;
      if (sy < 0 || sy >= 190) continue;
      for (let xx = 0; xx < img.w; xx++) {
        const sx = x0 + xx;
        if (sx < 0 || sx >= 320) continue;
        const c = img.data[yy * img.w + xx];
        if (c === TRANSPARENT) continue;
        const i = sy * 320 + sx;
        if (!a.front && this.pic.pri[i] > base) continue;
        f.px[i] = map ? map[c] : c;
      }
    }
  }

  private applyLight() {
    const L = this.light!;
    const f = this.frame;
    const cx = L.x ?? this.player.x;
    const cy = L.y ?? this.player.y - 18;
    const r = L.r;
    const rainbow = [12, 14, 10, 11, 9, 13];
    const tint = rainbow[Math.floor(this.t / 20) % rainbow.length];
    for (let y = 0; y < 190; y++)
      for (let x = 0; x < 320; x++) {
        const dx = x - cx,
          dy = (y - cy) * 1.25;
        const d = Math.sqrt(dx * dx + dy * dy) / r;
        const i = y * 320 + x;
        if (d > 1.15) f.px[i] = 0;
        else if (d > 0.85) {
          const th = (d - 0.85) / 0.3;
          const b = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][((y & 3) << 2) | (x & 3)] / 16;
          f.px[i] = b < th ? 0 : DARKER[f.px[i]];
        } else if (L.rainbow && d > 0.5 && ((x + y) & 3) === 0 && f.px[i] !== 0) f.px[i] = tint;
      }
  }

  private drawStatus() {
    const s = this.screen;
    if (this.hideStatus || this.room?.cutscene) {
      s.rect(0, 0, 320, 10, 0);
      return;
    }
    if (this.hoverMenu && !this.modals.length) {
      s.rect(0, 0, 320, 10, UI.bg);
      s.hline(0, 319, 9, UI.fg);
      let x = 8;
      for (const m of this.menus) {
        s.text(x, 1, m.title, UI.fg);
        x += textWidth(m.title) + 12;
      }
      return;
    }
    const flash = this.scoreFlash > 0 && Math.floor(this.scoreFlash / 6) % 2 === 0;
    s.rect(0, 0, 320, 10, flash ? 14 : UI.bg);
    s.hline(0, 319, 9, UI.fg);
    s.text(6, 1, `Score: ${this.state.score} of ${MAX_SCORE}`, UI.fg);
    const title = GAME_TITLE;
    s.text(314 - textWidth(title), 1, title, UI.fg);
    if (!this.settings.sound) s.text(150, 1, 'Sound off', UI.dim);
  }

  private drawCursor() {
    if (!this.mouse.inside) return;
    const top = this.modals[this.modals.length - 1];
    const kind = top?.cursor ?? (this.busy > 0 && !top ? 'wait' : 'arrow');
    if (kind === 'none') return;
    const s = this.screen;
    const x = Math.round(this.mouse.x),
      y = Math.round(this.mouse.y);
    const ARROW = ['#.........', '##........', '#w#.......', '#ww#......', '#www#.....', '#wwww#....', '#wwwww#...', '#wwwwww#..', '#wwwwwww#.', '#wwww#####', '#w##w#....', '##..#w#...', '#...#w#...', '.....#w#..', '.....###..'];
    const WAIT = ['#########', '#wwwwwww#', '.#wwwww#.', '..#w#w#..', '...#w#...', '..#www#..', '.#wwwww#.', '#wwwwwww#', '#########'];
    const spr = kind === 'wait' ? WAIT : ARROW;
    const ox = kind === 'wait' ? -4 : 0,
      oy = kind === 'wait' ? -4 : 0;
    for (let r = 0; r < spr.length; r++)
      for (let c = 0; c < spr[r].length; c++) {
        const ch = spr[r][c];
        if (ch === '.') continue;
        s.plot(x + c + ox, y + r + oy, ch === '#' ? 0 : 15);
      }
  }

  // =========================================================== input
  private bindInput() {
    const toKey = (e: KeyboardEvent): KeyIn => ({ key: e.key, code: e.code, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey });
    window.addEventListener('keydown', (e) => {
      this.audio.unlock();
      const k = toKey(e);
      const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace', ' ', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', 'Escape', "'", '/'];
      if (gameKeys.includes(e.key) || (e.key.length === 1 && !e.ctrlKey && !e.metaKey)) e.preventDefault();
      if (e.key === 'F11') return;
      if (e.repeat && !['Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      if (e.repeat && this.modals.length === 0) return;
      this.onKey(k);
    });
    window.addEventListener('keyup', (e) => {
      if (this.heldKey && this.heldKey.key === e.key) {
        if (performance.now() - this.heldKey.at > 350 && this.player?.heading) this.player.stop();
        this.heldKey = null;
      }
    });
    const pos = (e: MouseEvent) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 320, y: ((e.clientY - r.top) / r.height) * 200 };
    };
    this.canvas.addEventListener('mousemove', (e) => {
      const p = pos(e);
      this.mouse = { x: p.x, y: p.y, inside: true };
      const top = this.modals[this.modals.length - 1];
      top?.move?.(p.x, p.y);
      this.hoverMenu = !top && this.playing && p.y < 10 && !this.room?.cutscene && !this.hideStatus;
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.inside = false;
      this.hoverMenu = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.canvas.focus();
      this.audio.unlock();
      const p = pos(e);
      this.mouse = { x: p.x, y: p.y, inside: true };
      this.onClick(p.x, p.y, e.button === 2 || e.shiftKey || e.ctrlKey ? 2 : e.button);
    });
  }

  private onKey(k: KeyIn) {
    const top = this.modals[this.modals.length - 1];
    if (top) {
      top.key?.(k);
      return;
    }
    if (!this.playing || !this.room) return;
    // global shortcuts
    switch (k.key) {
      case 'Escape':
        return this.openMenu(0);
      case 'F1':
        return void this.hooks.help(this);
      case 'F2':
        return this.toggleSound();
      case 'F3':
        if (this.busy || this.room.cutscene) return;
        return this.openInput(this.history[this.history.length - 1] ?? '');
      case 'F5':
        return this.saveDialog();
      case 'F7':
        return this.restoreDialog();
      case 'F9':
        return this.confirmRestart();
      case 'Tab':
        if (this.busy || this.room.cutscene) return;
        return this.showInventory();
    }
    if (this.busy || this.room.cutscene) return;
    const dirs: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      Home: [-1, -1],
      PageUp: [1, -1],
      End: [-1, 1],
      PageDown: [1, 1],
    };
    if (k.key in dirs && !k.ctrl) {
      const [dx, dy] = dirs[k.key];
      const p = this.player;
      if (p.heading && p.heading.dx === dx && p.heading.dy === dy) {
        p.stop();
      } else {
        p.setPath([]);
        p.heading = { dx, dy };
        p.moving = true;
        this.heldKey = { key: k.key, at: performance.now() };
      }
      return;
    }
    if (k.key === 'Enter') return this.openInput('');
    if (k.key.length === 1 && !k.ctrl && !k.meta && !k.alt) return this.openInput(k.key);
  }

  private onClick(x: number, y: number, button: number) {
    const top = this.modals[this.modals.length - 1];
    if (top) {
      top.click?.(x, y, button);
      return;
    }
    if (!this.playing || !this.room) return;
    if (y < 10 && !this.room.cutscene && !this.hideStatus) {
      let mx = 8;
      let idx = 0;
      this.menus.forEach((m, i) => {
        if (x >= mx - 4) idx = i;
        mx += textWidth(m.title) + 12;
      });
      return this.openMenu(idx);
    }
    if (this.busy || this.room.cutscene) return;
    const gx = x,
      gy = y - 10;
    if (button === 2) {
      this.lookAtPoint(gx, gy);
      return;
    }
    const target = this.walkmap.nearest(gx, gy);
    if (!target) return;
    const path = this.walkmap.findPath(this.player.x, this.player.y, target.x, target.y);
    if (path) {
      this.player.heading = null;
      this.player.setPath(path);
    }
  }

  lookAtPoint(x: number, y: number) {
    // actors first
    const hitActor = [...this.actors]
      .filter((a) => a.visible && a !== this.player)
      .sort((a, b) => b.y - a.y)
      .find((a) => {
        const img = a.currentImg(this.t);
        if (!img) return false;
        const x0 = Math.round(a.x) - img.ox,
          y0 = Math.round(a.y) - img.oy;
        if (x < x0 || x >= x0 + img.w || y < y0 || y >= y0 + img.h) return false;
        return img.data[(Math.floor(y) - y0) * img.w + (Math.floor(x) - x0)] !== TRANSPARENT;
      });
    if (hitActor) return this.runCommand(this.synth('look', hitActor.id));
    if (this.player.visible) {
      const img = this.player.currentImg(this.t);
      if (img) {
        const x0 = Math.round(this.player.x) - img.ox,
          y0 = Math.round(this.player.y) - img.oy;
        if (x >= x0 && x < x0 + img.w && y >= y0 && y < y0 + img.h) return this.runCommand(this.synth('look', 'self'));
      }
    }
    const hs = [...(this.room?.hotspots ?? [])].reverse().find((h) => (h.when?.(this) ?? true) && inArea(h.area, x, y));
    if (hs) return this.runCommand(this.synth('look', hs.id));
    return this.runCommand(this.synth('look', null));
  }

  synth(verb: string, noun: string | null, noun2: string | null = null): Command {
    const c = parse(`${verb}`);
    c.verb = verb;
    c.noun = noun;
    c.nounWord = noun;
    c.noun2 = noun2;
    c.raw = `${verb} ${noun ?? ''}`.trim();
    c.unknown = null;
    return c;
  }

  // =========================================================== modals
  push(m: Modal) {
    this.modals.push(m);
    this.player?.heading && this.player.stop();
  }
  pop(m: Modal) {
    const i = this.modals.indexOf(m);
    if (i >= 0) this.modals.splice(i, 1);
    m.closed = true;
  }

  openInput(initial: string) {
    if (this.modals.length) return;
    const box: InputBox = new InputBox(
      initial,
      this.history,
      (text) => {
        this.pop(box);
        if (text.trim()) this.execute(text);
      },
      () => this.pop(box),
    );
    this.push(box);
  }

  openMenu(i: number) {
    if (this.modals.length) return;
    const bar: MenuBar = new MenuBar(this.menus, () => this.pop(bar), i);
    this.hoverMenu = false;
    this.push(bar);
  }

  toggleSound() {
    this.settings.sound = !this.settings.sound;
    this.audio.setSound(this.settings.sound);
    this.saveSettings();
  }

  buildMenus() {
    const speeds: [string, number][] = [
      ['Slowest', 0.6],
      ['Slow', 0.8],
      ['Normal', 1],
      ['Fast', 1.4],
      ['Fastest', 2],
    ];
    this.menus = [
      {
        title: GAME_TITLE,
        items: [
          { label: 'About the Game', action: () => this.hooks.about(this) },
          { label: 'Help', key: 'F1', action: () => this.hooks.help(this) },
          { label: '', sep: true, action: () => {} },
          { label: 'Quit to Title', key: 'Ctl-Q', action: () => this.confirmQuit() },
        ],
      },
      {
        title: 'File',
        items: [
          { label: 'Save Game', key: 'F5', action: () => this.saveDialog() },
          { label: 'Restore Game', key: 'F7', action: () => this.restoreDialog() },
          { label: '', sep: true, action: () => {} },
          { label: 'Restart Game', key: 'F9', action: () => this.confirmRestart() },
        ],
      },
      {
        title: 'Action',
        items: [
          { label: 'Inventory', key: 'Tab', action: () => this.showInventory(), enabled: () => this.busy === 0 },
          { label: 'Retype', key: 'F3', action: () => this.openInput(this.history[this.history.length - 1] ?? ''), enabled: () => this.busy === 0 },
          { label: 'Look Around', action: () => this.execute('look'), enabled: () => this.busy === 0 },
          { label: 'Ask the Duck for a Hint', action: () => this.execute('hint'), enabled: () => this.busy === 0 },
        ],
      },
      {
        title: 'Speed',
        items: speeds.map(([label, v]) => ({
          label,
          action: () => {
            this.settings.speed = v;
            this.saveSettings();
          },
          checked: () => Math.abs(this.settings.speed - v) < 0.01,
        })),
      },
      {
        title: 'Sound',
        items: [
          { label: 'Sound', key: 'F2', action: () => this.toggleSound(), checked: () => this.settings.sound },
          {
            label: 'Music',
            action: () => {
              this.settings.music = !this.settings.music;
              this.audio.setMusic(this.settings.music);
              this.saveSettings();
            },
            checked: () => this.settings.music,
          },
          { label: '', sep: true, action: () => {} },
          ...[0.3, 0.55, 0.8, 1].map((v, i) => ({
            label: `Volume ${['Low', 'Medium', 'High', 'Max'][i]}`,
            action: () => {
              this.settings.volume = v;
              this.audio.setVolume(v);
              this.saveSettings();
              this.audio.sfx('points');
            },
            checked: () => Math.abs(this.settings.volume - v) < 0.06,
          })),
        ],
      },
      {
        title: 'Display',
        items: [
          {
            label: 'CRT Scanlines',
            action: () => {
              this.settings.crt = !this.settings.crt;
              this.saveSettings();
            },
            checked: () => this.settings.crt,
          },
          {
            label: '4:3 Monitor Aspect',
            action: () => {
              this.settings.aspect = !this.settings.aspect;
              this.saveSettings();
              this.resize();
            },
            checked: () => this.settings.aspect,
          },
          {
            label: 'Full Screen',
            action: () => {
              if (document.fullscreenElement) document.exitFullscreen();
              else document.documentElement.requestFullscreen?.().then(() => this.resize());
            },
          },
        ],
      },
    ];
  }

  // =========================================================== script API
  /** Text message box. Resolves when dismissed. */
  say(text: string, opts: MessageOpts = {}): Promise<void> {
    if (this.dying) return new Promise(() => {});
    const gen = this.gen;
    return new Promise((resolve) => {
      const p = this.player;
      const cy = opts.y ?? (p && p.visible && p.y < 90 && this.room ? 140 : 70);
      const box: MessageBox = new MessageBox(text, { ...opts, y: cy }, () => {
        this.pop(box);
        if (gen === this.gen) resolve();
      });
      this.push(box);
    });
  }

  /** A character speaks (titled message box, speaking animation). */
  async talk(who: string | Actor, text: string, opts: MessageOpts = {}) {
    const a = typeof who === 'string' ? this.actor(who) : who;
    const name = typeof who === 'string' ? (a?.name ?? who) : who.name;
    if (a) a.talking = true;
    try {
      await this.say(text, { ...opts, title: opts.title ?? name });
    } finally {
      if (a) a.talking = false;
    }
  }

  /** Multiple-choice dialog. Resolves with the index chosen. */
  choose(text: string, buttons: string[], opts: { title?: string; icon?: Img | null; cancel?: number } = {}): Promise<number> {
    const gen = this.gen;
    return new Promise((resolve) => {
      const d: Dialog = new Dialog(
        text,
        buttons,
        (i) => {
          this.pop(d);
          if (gen === this.gen) resolve(i);
        },
        opts,
      );
      this.push(d);
    });
  }

  wait(ms: number): Promise<void> {
    if (this.dying) return new Promise(() => {});
    return new Promise((resolve) => this.waiters.push({ ticks: Math.max(1, Math.round((ms * 60) / 1000)), resolve, gen: this.gen }));
  }

  /** Run an async script with player input locked. */
  async script(fn: () => Promise<void> | void) {
    const myGen = this.gen;
    this.busy++;
    try {
      await fn();
    } finally {
      if (myGen === this.gen) this.busy = Math.max(0, this.busy - 1);
    }
  }

  /** Walk an actor (default player) to a point. Resolves true on arrival. */
  walk(a: Actor | null, x: number, y: number, opts: { direct?: boolean } = {}): Promise<boolean> {
    const act = a ?? this.player;
    const gen = this.gen;
    if (this.dying) return new Promise(() => {});
    return new Promise((resolve) => {
      let path: Pt[] | null;
      if (act.ghost || opts.direct) path = [{ x, y }];
      else path = this.walkmap.findPath(act.x, act.y, x, y);
      if (!path) return resolve(false);
      act.heading = null;
      act.setPath(path, (ok) => {
        if (gen === this.gen) resolve(ok);
      });
    });
  }

  /** Walk the player near a hotspot, actor, or point. */
  async approach(target: string | [number, number] | Actor, dist = 0): Promise<boolean> {
    let tx: number, ty: number;
    let faceX: number, faceY: number;
    if (Array.isArray(target)) {
      [tx, ty] = target;
      faceX = tx;
      faceY = ty - 10;
    } else {
      const act = typeof target === 'string' ? this.actor(target) : target;
      const hs = typeof target === 'string' ? this.hotspot(target) : null;
      if (act && act !== this.player) {
        const side = this.player.x < act.x ? -1 : 1;
        tx = act.x + side * (act.data.gap ?? 20);
        ty = act.y + (act.data.gapY ?? 0);
        faceX = act.x;
        faceY = act.y;
        if (!this.walkmap.ok(tx, ty)) {
          const alt = act.x - side * (act.data.gap ?? 20);
          if (this.walkmap.ok(alt, ty)) tx = alt;
        }
      } else if (hs) {
        const c = areaCenter(hs.area);
        if (hs.at) [tx, ty] = hs.at;
        else {
          const b = areaBottom(hs.area);
          tx = b.x;
          ty = b.y + 4;
        }
        faceX = c.x;
        faceY = c.y;
      } else return true;
    }
    const p = this.player;
    const d = Math.hypot(p.x - tx, (p.y - ty) * 1.4);
    if (d > Math.max(3, dist)) {
      const ok = await this.walk(p, tx, ty);
      if (!ok && Math.hypot(p.x - tx, p.y - ty) > 25) return false;
    }
    p.faceToward(faceX, faceY + 8);
    return true;
  }

  near(target: string | [number, number] | Actor, dist = 30): boolean {
    const p = this.player;
    let x: number, y: number;
    if (Array.isArray(target)) [x, y] = target;
    else {
      const act = typeof target === 'string' ? this.actor(target) : target;
      if (act) {
        x = act.x;
        y = act.y;
      } else {
        const hs = typeof target === 'string' ? this.hotspot(target) : null;
        if (!hs) return false;
        const b = hs.at ? { x: hs.at[0], y: hs.at[1] } : areaBottom(hs.area);
        x = b.x;
        y = b.y;
      }
    }
    return Math.hypot(p.x - x, (p.y - y) * 1.4) <= dist;
  }

  /** Temporarily play a pose on an actor. */
  async pose(a: Actor | null, pose: string, ms = 600) {
    const act = a ?? this.player;
    const prev = act.pose;
    act.pose = pose;
    act.resetAnimClock();
    await this.wait(ms);
    act.pose = prev;
  }

  add(a: Actor): Actor {
    if (!this.actors.includes(a)) this.actors.push(a);
    return a;
  }
  remove(a: Actor | string) {
    const act = typeof a === 'string' ? this.actor(a) : a;
    if (act) this.actors = this.actors.filter((x) => x !== act);
  }
  actor(id: string): Actor | undefined {
    return this.actors.find((a) => a.id === id);
  }
  hotspot(id: string): Hotspot | undefined {
    return this.room?.hotspots?.find((h) => h.id === id && (h.when?.(this) ?? true));
  }

  flag(k: string): any {
    return this.state.flags[k];
  }
  set(k: string, v: any = true) {
    this.state.flags[k] = v;
  }
  inc(k: string, by = 1): number {
    this.state.flags[k] = (this.state.flags[k] ?? 0) + by;
    return this.state.flags[k];
  }
  has(item: string): boolean {
    return this.state.inv.includes(item);
  }
  addItem(item: string, quiet = false) {
    if (!this.state.inv.includes(item)) this.state.inv.push(item);
    if (!quiet) this.audio.sfx('take');
  }
  removeItem(item: string) {
    this.state.inv = this.state.inv.filter((i) => i !== item);
  }
  award(id: string, pts: number) {
    if (this.state.awarded[id] !== undefined) return;
    this.state.awarded[id] = pts;
    this.state.score += pts;
    this.scoreFlash = 60;
    this.audio.sfx('points');
  }
  scored(id: string) {
    return this.state.awarded[id] !== undefined;
  }
  sfx(name: string) {
    this.audio.sfx(name);
  }
  music(name: string | null) {
    this.audio.play(name);
  }
  flash(color = 15, ms = 120) {
    this.flashColor = color;
    this.flashTicks = Math.round((ms * 60) / 1000);
  }
  shake(ms = 500) {
    this.shakeTicks = Math.round((ms * 60) / 1000);
  }

  /** Rebuild the room's picture and walk mask (after flags change). */
  redraw() {
    const r = this.room;
    if (!r) return;
    this.pic.clear(0);
    this.pic.z = 0;
    r.draw(this.pic, this);
    const walk = typeof r.walk === 'function' ? r.walk(this) : r.walk;
    const blocks = typeof r.blocks === 'function' ? r.blocks(this) : r.blocks ?? [];
    this.walkmap = new WalkMap(320, 190, walk, blocks);
  }

  // =========================================================== rooms
  private snapshotFrame(): Uint8Array {
    return this.screen.px.slice(3200);
  }

  goto(id: string, at?: [number, number, Dir?], opts: { restoring?: boolean; noDissolve?: boolean } = {}) {
    const next = this.rooms[id];
    if (!next) throw new Error(`No room "${id}"`);
    const prev = this.room;
    const old = prev && !opts.noDissolve ? this.snapshotFrame() : null;
    prev?.leave?.(this, id);
    this.room = next;
    this.state.room = id;
    this.state.visited[id] = (this.state.visited[id] ?? 0) + 1;
    this.localNouns = makeLocal({
      ...(next.nouns ?? {}),
      ...Object.fromEntries((next.hotspots ?? []).map((h) => [h.id, h.nouns ?? []])),
    });
    this.actors = [this.player];
    this.player.stop();
    this.player.visible = true;
    this.player.pose = null;
    this.player.map = null;
    this.player.z = null;
    this.player.ghost = false;
    this.light = null;
    this.dark = false;
    this.palMap = new Uint8Array(256).map((_, i) => i);
    const pos = at ?? next.start ?? [160, 160, 'down'];
    this.player.place(pos[0], pos[1], pos[2] ?? this.player.dir);
    this.redraw();
    if (!this.walkmap.ok(this.player.x, this.player.y)) {
      const p = this.walkmap.nearest(this.player.x, this.player.y);
      if (p) this.player.place(p.x, p.y, this.player.dir);
    }
    next.enter?.(this, opts.restoring ? '__restore' : prev?.id ?? null);
    this.exitArmed = !(next.exits ?? []).some((e) => inArea(e.area, this.player.x, this.player.y));
    this.zoneInside.clear();
    if (next.music !== undefined) this.music(next.music);
    if (old) {
      if (!Game.dissolveOrder) {
        const n = 160 * 95;
        const o = new Uint32Array(n);
        for (let i = 0; i < n; i++) o[i] = i;
        for (let i = n - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = o[i];
          o[i] = o[j];
          o[j] = tmp;
        }
        Game.dissolveOrder = o;
      }
      this.dissolve = { old, t: 0, order: Game.dissolveOrder };
    }
    this.syncPlayerState();
    if (!next.cutscene) {
      this.checkpoint = this.serialize();
      try {
        localStorage.setItem(AUTOSAVE_KEY, this.checkpoint);
      } catch {
        /* ignore */
      }
    }
    if (next.afterEnter && !opts.restoring) {
      const from = prev?.id ?? null;
      this.script(async () => {
        await next.afterEnter!(this, from);
      });
    }
  }

  syncPlayerState() {
    this.state.px = Math.round(this.player.x);
    this.state.py = Math.round(this.player.y);
    this.state.pdir = this.player.dir;
  }

  // =========================================================== commands
  execute(text: string) {
    const raw = text.trim();
    if (!raw) return;
    this.history.push(raw);
    if (this.history.length > 50) this.history.shift();
    this.state.moves++;
    const c = parse(raw, this.localNouns);
    this.resolveItemNouns(c);
    this.runCommand(c);
  }

  /** If a typed phrase names a carried item under a different id (e.g. "mug" for the coffee), prefer the carried one. */
  resolveItemNouns(c: Command) {
    const fix = (id: string | null, word: string | null): string | null => {
      if (!id || !word) return id;
      if (this.has(id) || this.hotspot(id) || this.actor(id)) return id;
      const w = word.toLowerCase();
      for (const inv of this.state.inv) {
        const it = this.items[inv];
        if (it && (it.nouns.includes(w) || inv === w)) return inv;
      }
      return id;
    };
    c.noun = fix(c.noun, c.nounWord);
    c.noun2 = fix(c.noun2, c.noun2Word);
  }

  runCommand(c: Command) {
    // meta commands that open UI
    switch (c.verb) {
      case 'save':
        return this.saveDialog();
      case 'restore':
        return this.restoreDialog();
      case 'restartgame':
        return this.confirmRestart();
      case 'quit':
        return this.confirmQuit();
      case 'inventory':
        if (!c.noun) return this.showInventory();
        break;
      case 'pause':
        return void this.say('Game paused. Press a key to continue.', { title: 'Paused' });
      case 'reboot':
        if (!c.noun && c.verbWord === 'restart') return this.confirmRestart();
        break;
    }
    this.script(async () => {
      if (await this.dispatch(c)) return;
      await this.hooks.fallback(this, c);
    });
  }

  private async tryVerbs(map: Record<string, Response> | undefined, c: Command): Promise<boolean> {
    if (!map) return false;
    for (const [spec, resp] of Object.entries(map)) {
      if (!c.is(spec)) continue;
      if (typeof resp === 'string') {
        await this.say(resp);
        return true;
      }
      const r = await resp(this, c);
      if (r !== false) return true;
    }
    return false;
  }

  /** Route a command through room, hotspots, items and global handlers. */
  async dispatch(c: Command): Promise<boolean> {
    const r = this.room;
    if (!r) return true;
    if (r.raw) {
      const res = await r.raw(this, c.raw);
      if (res) return true;
    }
    if (this.hooks.globalRaw && (await this.hooks.globalRaw(this, c.raw))) return true;
    if (await this.tryVerbs(r.verbs, c)) return true;
    // look at hotspots
    if (c.noun && (c.verb === 'look' || c.verb === 'read' || c.verb === 'search')) {
      const hs = this.hotspot(c.noun);
      if (hs && hs.look && c.verb === 'look') {
        if (typeof hs.look === 'string') await this.say(hs.look);
        else {
          const out = await hs.look(this);
          if (typeof out === 'string') await this.say(out);
        }
        return true;
      }
    }
    if (c.verb === 'look' && !c.noun && r.look) {
      if (typeof r.look === 'string') await this.say(r.look);
      else {
        const out = await r.look(this);
        if (typeof out === 'string') await this.say(out);
      }
      return true;
    }
    // carried items
    for (const id of [...this.state.inv]) {
      const it = this.items[id];
      if (await this.tryVerbs(it?.verbs, c)) return true;
    }
    if (c.verb === 'look' && c.noun && this.has(c.noun)) {
      await this.examine(c.noun);
      return true;
    }
    if (await this.tryVerbs(this.hooks.globalVerbs, c)) return true;
    return false;
  }

  /** Is a noun present here (hotspot, actor, carried item, or room vocabulary)? */
  present(noun: string): boolean {
    if (this.hotspot(noun)) return true;
    if (this.actor(noun)) return true;
    if (this.has(noun)) return true;
    if (this.room?.nouns && noun in this.room.nouns) return true;
    return false;
  }

  async examine(itemId: string) {
    const it = this.items[itemId];
    if (!it) return;
    const text = typeof it.look === 'string' ? it.look : it.look(this);
    await this.say(text, { title: it.name, icon: it.icon() });
  }

  showInventory() {
    if (this.modals.length) return;
    const entries = this.state.inv.filter((id) => this.items[id]).map((id) => ({ id, name: this.items[id].name, icon: this.items[id].icon() }));
    const w: InventoryWindow = new InventoryWindow(
      entries,
      (id) => {
        this.pop(w);
        this.examine(id).then(() => this.showInventory());
      },
      () => this.pop(w),
    );
    this.push(w);
  }

  // =========================================================== death
  die(text: string, opts: { title?: string; icon?: Img | null } = {}): Promise<never> {
    if (this.dying) return new Promise(() => {});
    this.cancelScripts();
    this.dying = true;
    this.state.deaths++;
    this.audio.stopMusic();
    this.audio.sfx('death');
    const epilogues = [
      "Thank you for playing Coder's Quest. Better luck next deploy.",
      "Thank you for playing Coder's Quest. Remember: save early, save often.",
      "Thank you for playing Coder's Quest. Have you tried not doing that?",
      "Thank you for playing Coder's Quest. Your stack trace will be read at the funeral.",
      "Thank you for playing Coder's Quest. This incident will be reported.",
    ];
    const epi = epilogues[this.state.deaths % epilogues.length];
    const show = () => {
      const d: Dialog = new Dialog(
        `${text}\n\n${epi}`,
        ['Try Again', 'Restore', 'Restart', 'Quit'],
        (i) => {
          this.pop(d);
          if (i === 0) {
            this.dying = false;
            if (this.checkpoint) this.load(this.checkpoint, true);
          } else if (i === 1) {
            this.restoreDialog(() => show());
          } else if (i === 2) {
            this.dying = false;
            this.restart();
          } else {
            this.dying = false;
            this.toTitle();
          }
        },
        { title: opts.title ?? 'Game Over', icon: opts.icon ?? this.hooks.deathIcon?.() ?? null },
      );
      this.push(d);
    };
    setTimeout(show, 900);
    return new Promise(() => {});
  }

  cancelScripts() {
    this.gen++;
    this.waiters = [];
    this.busy = 0;
    this.modals = this.modals.filter((m) => m.fullscreen);
    for (const a of this.actors) {
      a.onArrive = null;
      a.path = [];
      a.moving = false;
      a.heading = null;
      a.talking = false;
    }
  }

  // =========================================================== save / load
  serialize(): string {
    this.syncPlayerState();
    return JSON.stringify(this.state);
  }

  load(json: string, quiet = false) {
    let st: GameState;
    try {
      st = JSON.parse(json);
    } catch {
      this.say('That saved game appears to be corrupted.');
      return;
    }
    this.cancelScripts();
    this.dying = false;
    this.state = { ...this.newState(st.room), ...st };
    this.playing = true;
    this.hideStatus = false;
    this.goto(st.room, [st.px, st.py, st.pdir], { restoring: true, noDissolve: false });
    if (!quiet) this.audio.sfx('beep');
  }

  slots(): (SlotInfo | null)[] {
    const out: (SlotInfo | null)[] = [];
    for (let i = 0; i < 10; i++) {
      try {
        const raw = localStorage.getItem(SAVE_PREFIX + i);
        if (!raw) out.push(null);
        else {
          const d = JSON.parse(raw);
          out.push({ desc: d.desc, date: d.date });
        }
      } catch {
        out.push(null);
      }
    }
    return out;
  }

  saveDialog() {
    if (this.modals.length || !this.room || this.room.cutscene || this.dying) return;
    if (this.busy) return void this.say("You can't save right now.");
    const def = `${this.room.title}, ${this.state.score} pts`;
    const d: SaveDialog = new SaveDialog('save', this.slots(), def, (slot, desc) => {
      this.pop(d);
      if (slot === null) return;
      const now = new Date();
      const date = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      try {
        localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify({ desc, date, state: this.serialize() }));
        this.say(`Game saved in slot ${slot + 1}.`, { timeout: 90 });
      } catch {
        this.say('Unable to save: your browser has disabled storage.');
      }
    });
    this.push(d);
  }

  restoreDialog(onCancel?: () => void) {
    if (this.modals.length) return;
    const slots = this.slots();
    if (!slots.some((s) => s)) {
      this.say('There are no saved games to restore.').then(() => onCancel?.());
      return;
    }
    const d: SaveDialog = new SaveDialog('restore', slots, '', (slot) => {
      this.pop(d);
      if (slot === null) return onCancel?.();
      try {
        const raw = localStorage.getItem(SAVE_PREFIX + slot);
        if (raw) {
          this.modals = this.modals.filter((m) => !m.fullscreen);
          this.load(JSON.parse(raw).state);
        }
      } catch {
        this.say('That saved game could not be read.');
      }
    });
    this.push(d);
  }

  hasAutosave(): boolean {
    try {
      return !!localStorage.getItem(AUTOSAVE_KEY);
    } catch {
      return false;
    }
  }
  loadAutosave() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (raw) this.load(raw);
    } catch {
      /* ignore */
    }
  }

  async confirmRestart() {
    if (this.modals.length) return;
    const i = await this.choose('Restart the game from the very beginning?', ['Restart', 'Cancel'], { cancel: 1 });
    if (i === 0) this.restart();
  }
  async confirmQuit() {
    if (this.modals.length) return;
    const i = await this.choose('Quit to the title screen? Unsaved progress will be lost.', ['Quit', 'Cancel'], { cancel: 1 });
    if (i === 0) this.toTitle();
  }

  restart() {
    this.cancelScripts();
    this.dying = false;
    this.history = [];
    this.newGame();
  }

  newGame() {
    this.cancelScripts();
    this.dying = false;
    this.state = this.newState('');
    this.player = new Actor('dominic', 'Dominic', this.hooks.playerSprite());
    this.playing = true;
    this.hideStatus = false;
    this.hooks.newGame(this);
  }

  toTitle() {
    this.cancelScripts();
    this.dying = false;
    this.playing = false;
    this.room = null;
    this.actors = [];
    this.modals = [];
    this.hooks.showTitle(this);
  }

  ensurePlayer() {
    if (!this.player) this.player = new Actor('dominic', 'Dominic', this.hooks.playerSprite());
  }
}
