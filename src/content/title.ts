// Title screen: starfield, the Monolith Systems tower, scrolling neon grid,
// and the big beveled CODER'S QUEST logo.
import type { Game } from '../engine/game';
import type { Modal, KeyIn } from '../engine/ui';
import { Surface, rng } from '../engine/raster';
import { glyph, textWidth } from '../engine/font';
import { dith } from '../engine/palette';
import { UI, drawWindow } from '../engine/ui';

/** Draw text in the main font scaled up with a 3D extruded bevel. */
export function bigText(s: Surface, cx: number, y: number, text: string, scale: number, face: number, side: number, shadow: number, hilite: number, t = 0, depth = 3) {
  const w = (textWidth(text) + text.length) * scale;
  let x = Math.round(cx - w / 2);
  const draws: [number, number][] = [];
  for (const ch of text) {
    if (ch === ' ') {
      x += 4 * scale;
      continue;
    }
    const g = glyph(ch);
    for (let ry = 0; ry < g.rows.length; ry++)
      for (let rx = 0; rx < g.w; rx++) if (g.rows[ry][rx]) draws.push([x + rx * scale, y + ry * scale]);
    x += (g.w + 1) * scale + Math.floor(scale / 3);
  }
  // extrusion
  for (let d = depth; d >= 1; d--) for (const [px, py] of draws) s.rect(px + d, py + d, scale, scale, d === depth ? shadow : side);
  // face with a sweeping shimmer
  for (const [px, py] of draws) {
    const sweep = Math.abs(((px - t * 2) % 260) + 260) % 260 < 10;
    s.rect(px, py, scale, scale, sweep ? hilite : face);
    s.hline(px, px + scale - 1, py, sweep ? 15 : hilite);
  }
}

export class TitleScreen implements Modal {
  blocks = true;
  fullscreen = true;
  sel = 0;
  age = 0;
  options: { label: string; act: () => void }[];
  stars: [number, number, number][] = [];
  constructor(public g: Game) {
    const r = rng(42);
    for (let i = 0; i < 120; i++) this.stars.push([Math.floor(r() * 320), Math.floor(r() * 110), Math.floor(r() * 100)]);
    this.options = [{ label: 'Start a New Game', act: () => this.close(() => g.newGame()) }];
    if (g.hasAutosave()) this.options.push({ label: 'Continue Where You Left Off', act: () => this.close(() => g.loadAutosave()) });
    this.options.push({ label: 'Restore a Saved Game', act: () => g.restoreDialog() });
    this.options.push({ label: 'How to Play', act: () => g.hooks.help(g) });
  }
  close(fn: () => void) {
    this.g.pop(this);
    fn();
  }
  tick() {
    this.age++;
  }
  draw(s: Surface, t: number) {
    s.clear(0);
    // sky
    s.gradV(0, 0, 320, 120, [0, 0, 1, 5]);
    for (const [x, y, ph] of this.stars) {
      const tw = (t + ph * 7) % 120;
      s.plot(x, y, tw < 6 ? 15 : ph % 3 === 0 ? 7 : 8);
    }
    // moon
    s.glow(52, 34, 18, 1, -1);
    s.circle(52, 34, 11, 15);
    s.circle(48, 38, 2, 7);
    s.circle(56, 30, 3, 7);
    s.circle(57, 39, 1, 7);
    s.ellipseO(52, 34, 11, 11, 7);
    // distant city
    const r = rng(9);
    let bx = 0;
    while (bx < 320) {
      const bw = 10 + Math.floor(r() * 18),
        bh = 14 + Math.floor(r() * 26);
      s.rect(bx, 120 - bh, bw, bh, 0);
      s.vline(bx, 120 - bh, 119, 1);
      for (let wy = 120 - bh + 3; wy < 118; wy += 4)
        for (let wx = bx + 2; wx < bx + bw - 2; wx += 3) if (r() < 0.25) s.plot(wx, wy, (wx + wy + Math.floor(t / 90)) % 7 === 0 ? 1 : 14);
      bx += bw + 1;
    }
    // the Monolith Systems tower
    const tx = 270;
    s.rect(tx, 30, 40, 90, 0);
    s.rect(tx + 2, 32, 36, 88, 8);
    s.rect(tx + 4, 32, 2, 88, dith(8, 7, 6));
    for (let fy = 36; fy < 116; fy += 6)
      for (let fx = tx + 8; fx < tx + 36; fx += 6) {
        const lit = fy === 96 && fx === tx + 20; // Dominic's window, 3rd floor
        s.rect(fx, fy, 3, 3, lit ? (Math.floor(t / 30) % 2 ? 14 : 15) : (fx * 7 + fy * 3) % 11 === 0 ? 6 : 0);
      }
    s.rect(tx + 16, 22, 8, 8, 0);
    s.vline(tx + 20, 12, 22, 7);
    s.plot(tx + 20, 11, Math.floor(t / 20) % 2 ? 12 : 4);
    s.micro(tx + 2, 24, 'MONOLITH', 11);
    // neon grid floor, scrolling
    s.rect(0, 120, 320, 80, 0);
    s.hline(0, 319, 120, 13);
    for (let i = -12; i <= 12; i++) s.line(160 + i * 5, 120, 160 + i * 52, 200, 5);
    const phase = (t % 30) / 30;
    for (let k = 0; k < 9; k++) {
      const z = k + phase;
      const yy = 120 + Math.round(80 * Math.pow(z / 9, 2.2));
      if (yy > 120 && yy < 200) s.hline(0, 319, yy, k < 2 ? 5 : 13);
    }
    // logo
    bigText(s, 160, 58, "CODER'S QUEST", 3, 14, 6, 4, 15, t, 4);
    const sub = 'The Friday Deploy';
    s.text(160 - Math.floor(textWidth(sub) / 2) + 1, 87, sub, 0);
    s.text(160 - Math.floor(textWidth(sub) / 2), 86, sub, 11);
    // menu
    const bw = 170,
      bh = this.options.length * 11 + 10;
    const mx = 160 - bw / 2,
      my = 196 - bh;
    drawWindow(s, mx, my, bw, bh);
    this.options.forEach((o, i) => {
      const y = my + 5 + i * 11;
      const hi = i === this.sel;
      if (hi) s.rect(mx + 4, y - 1, bw - 8, 11, UI.hiBg);
      s.textC(160, y + 1, o.label, hi ? UI.hiFg : UI.fg);
    });
    const star = 'STARRING DOMINIC';
    s.micro(160 - 33, 99, star, 7);
  }
  key(k: KeyIn) {
    if (this.age < 10) return;
    const n = this.options.length;
    if (k.key === 'ArrowDown' || k.key === 'Tab') this.sel = (this.sel + 1) % n;
    else if (k.key === 'ArrowUp') this.sel = (this.sel + n - 1) % n;
    else if (k.key === 'Enter' || k.key === ' ') this.options[this.sel].act();
    else if (k.key === 'F7') this.g.restoreDialog();
  }
  hit(x: number, y: number) {
    const bh = this.options.length * 11 + 10;
    const my = 196 - bh;
    if (x < 75 || x > 245) return -1;
    const i = Math.floor((y - my - 4) / 11);
    return i >= 0 && i < this.options.length ? i : -1;
  }
  move(x: number, y: number) {
    const i = this.hit(x, y);
    if (i >= 0) this.sel = i;
  }
  click(x: number, y: number) {
    if (this.age < 10) return;
    const i = this.hit(x, y);
    if (i >= 0) this.options[i].act();
  }
}

export function showTitle(g: Game) {
  g.modals = [];
  g.push(new TitleScreen(g));
  g.music('title');
}

export async function help(g: Game) {
  await g.say(
    "Coder's Quest is played like the classic adventures: by typing commands. Just start typing and press ENTER.\n\n" +
      'Try things like: LOOK, LOOK AT DESK, OPEN DRAWER, TAKE MUG, TALK TO FAHIM, GIVE COFFEE TO FAHIM, USE BADGE ON READER, INVENTORY.\n\n' +
      'Walk with the ARROW KEYS (tap to start, tap again to stop) or CLICK where you want to go. RIGHT-CLICK (or shift-click) anything to look at it.',
    { title: 'How to Play', width: 250 },
  );
  await g.say(
    'TAB  Inventory          F5  Save game\nF3   Retype command     F7  Restore game\nESC  Menu bar           F9  Restart\nF2   Sound on/off       F1  This help\n\nSave often. This is an 80s adventure: there are many ways to die, and they are all your fault.\n\nStuck? TALK TO DUCK.',
    { title: 'Keys', width: 250 },
  );
}

export async function about(g: Game) {
  await g.say(
    "CODER'S QUEST\nThe Friday Deploy\nVersion 1.0\n\nA tribute to the 16-color graphic adventures of the 1980s.\n\nStarring Dominic, with Nicholas, Mike, Krishna, Fahim, Denis, Phil, Adriana and Aidan.\n\nPainted in 16 colors. Scored for 3 voices and a noise channel. Powered by too much coffee.",
    { title: 'About', width: 240 },
  );
}
