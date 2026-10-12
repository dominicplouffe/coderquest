// Shared art + behaviour kit for the Act II "group C" rooms (Boot Sector, Heap,
// Spaghetti Forest, Stack Overflow Tower, Infinite Loop).
import { Surface, Img, TRANSPARENT, rng, microWidth } from '../engine/raster';
import { bayerAt } from '../engine/palette';
import type { Fill } from '../engine/palette';
import type { Game } from '../engine/game';
import type { Response } from '../engine/types';
import { parse } from '../engine/parser';
import { duckHint } from '../content/hints';

/** Paint a small sprite with the Surface primitives and return it as an Img. */
export function paintImg(w: number, h: number, ox: number, oy: number, draw: (s: Surface) => void): Img {
  const s = new Surface(w, h);
  s.px.fill(TRANSPARENT);
  s.writePri = false;
  draw(s);
  return { w, h, data: s.px, ox, oy };
}

/** Transient (unsaved) hand-off between rooms, e.g. "arrived via GOTO 10". */
export const handoff = { arrival: '' as '' | 'goto' };

// ------------------------------------------------------------------ floors

export interface GridOpts {
  horizon: number;
  bottom?: number;
  /** vanishing x */
  vx?: number;
  /** spacing of the vertical lines at the bottom edge */
  spacing?: number;
  /** number of horizontal lines */
  rows?: number;
  /** colours from far (horizon) to near */
  colors?: number[];
  bg?: Fill;
  /** horizontal-line depth factor (bigger = more lines bunched toward the horizon) */
  depth?: number;
  /** how far past the screen edges (at the bottom) receding lines are still drawn */
  reach?: number;
  /** minimum spacing (px) of receding lines; closer than this they're skipped */
  haze?: number;
}

/**
 * Perspective neon grid. Lines fade from dark blue at the horizon to bright
 * near the viewer. Returns a mask (colour+1 per grid pixel) that the grid
 * pulse effect uses to light up only real grid lines.
 */
export function neonGrid(p: Surface, o: GridOpts): Uint8Array {
  const hz = o.horizon;
  const bot = o.bottom ?? 190;
  const vx = o.vx ?? 160;
  const sp = o.spacing ?? 28;
  const cols = o.colors ?? [1, 1, 3, 3, 3, 11];
  const H = bot - hz;
  const mask = new Uint8Array(320 * 190);
  if (o.bg !== undefined) p.rect(0, hz, 320, H, o.bg);
  const colAt = (y: number) => cols[Math.min(cols.length - 1, Math.max(0, Math.floor(((y - hz) / H) * cols.length)))];
  const put = (x: number, y: number) => {
    if (x < 0 || x > 319 || y < 0 || y > 189) return;
    const c = colAt(y);
    p.plot(x, y, c);
    mask[y * 320 + x] = c + 1;
  };
  // vertical (receding) lines
  const maxI = Math.ceil((o.reach ?? 520) / sp);
  for (let i = -maxI; i <= maxI; i++) {
    let prev = vx;
    for (let y = hz + 1; y < bot; y++) {
      const d = (y - hz) / H;
      const x = Math.round(vx + i * sp * d);
      // skip the far haze where lines are closer than a few px
      if (sp * d < (o.haze ?? 4)) {
        prev = x;
        continue;
      }
      const a = Math.min(prev, x),
        b = Math.max(prev, x);
      if (b < -2 || a > 322) {
        prev = x;
        continue;
      }
      for (let xx = a; xx <= b; xx++) put(xx, y);
      prev = x;
    }
  }
  // horizontal lines, bunching toward the horizon
  const k0 = o.depth ?? 3.2;
  const n = o.rows ?? 40;
  let last = 999;
  for (let k = 0; k < n; k++) {
    const y = Math.round(hz + (H * k0) / (k0 + k));
    if (y <= hz + 2) break;
    if (y >= bot) continue;
    if (last - y < 3) continue;
    last = y;
    for (let x = 0; x < 320; x++) put(x, y);
  }
  return mask;
}

/** Light up grid pixels in a band travelling from the horizon toward the viewer. */
export function gridPulse(s: Surface, mask: Uint8Array | null, t: number, hz: number, bot: number, period = 150, color = 11, hot = 15) {
  if (!mask) return;
  const ph = (t % period) / period;
  // ease-in so it accelerates toward the viewer, like real perspective
  const y = Math.round(hz + (bot - hz) * ph * ph);
  for (let yy = y - 1; yy <= y + 1; yy++) {
    if (yy <= hz || yy >= bot) continue;
    const row = yy * 320;
    for (let x = 0; x < 320; x++) {
      const m = mask[row + x];
      if (m && s.px[row + x] === m - 1) s.px[row + x] = yy === y ? hot : color;
    }
  }
}

/** Dithered glow band just above a horizon. */
export function horizonGlow(p: Surface, hz: number, h: number, color = 1) {
  for (let y = 0; y < h; y++) {
    const lvl = Math.round((y / h) * 12);
    const Y = hz - h + y;
    for (let x = 0; x < 320; x++) if (bayerAt(x, Y) < lvl) p.plot(x, Y, color);
  }
}

// ------------------------------------------------------------------ ambient particles

interface Particle {
  x: number;
  y: number;
  v: number;
  ph: number;
  ch: string;
  c: number;
}
const particleCache = new Map<string, Particle[]>();
function particles(seed: number, n: number, w: number, h: number, colors: number[]): Particle[] {
  const key = `${seed}:${n}:${w}:${h}:${colors.join(',')}`;
  let ps = particleCache.get(key);
  if (!ps) {
    const r = rng(seed);
    ps = [];
    for (let i = 0; i < n; i++)
      ps.push({ x: Math.floor(r() * w), y: r() * h, v: 0.08 + r() * 0.22, ph: r() * 1000, ch: r() < 0.5 ? '0' : '1', c: colors[Math.floor(r() * colors.length)] });
    particleCache.set(key, ps);
  }
  return ps;
}

/** Binary digits drifting upward through a region, flickering as they go. */
export function driftBits(s: Surface, t: number, x: number, y: number, w: number, h: number, seed = 1, n = 14, colors = [3, 9, 11], dir = -1, ok?: (x: number, y: number) => boolean) {
  for (const p of particles(seed, n, w, h, colors)) {
    const travel = (t * p.v + p.ph) % (h + 6);
    const yy = dir < 0 ? y + h - travel : y - 6 + travel;
    const xx = x + p.x + Math.round(Math.sin((t + p.ph) / 40) * 1.5);
    const fade = travel / (h + 6);
    if (fade > 0.85 && ((t >> 2) & 1)) continue;
    const ch = ((t + p.ph) / 50) % 2 < 1 ? p.ch : p.ch === '0' ? '1' : '0';
    const Y = Math.round(yy);
    if (ok && !(ok(xx, Y) && ok(xx + 2, Y) && ok(xx, Y + 4) && ok(xx + 2, Y + 4))) continue;
    s.micro(xx, Y, ch, fade > 0.6 ? 1 : p.c);
  }
}

/** Twinkle a few stars of a starfield. */
export function twinkle(s: Surface, t: number, x: number, y: number, w: number, h: number, seed = 5, n = 10) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const sx = x + Math.floor(r() * w),
      sy = y + Math.floor(r() * h);
    const ph = Math.floor(r() * 200);
    const k = (t + ph) % 200;
    if (k < 12) {
      s.plot(sx, sy, 15);
      if (k > 3 && k < 9) {
        s.plot(sx - 1, sy, 7);
        s.plot(sx + 1, sy, 7);
        s.plot(sx, sy - 1, 7);
        s.plot(sx, sy + 1, 7);
      }
    }
  }
}

// ------------------------------------------------------------------ text

/** Micro text with a 1px dark outline (readable over anything). */
export function microOutlined(s: Surface, x: number, y: number, text: string, color: number, outline = 0) {
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
  ])
    s.micro(x + dx, y + dy, text, outline);
  s.micro(x, y, text, color);
}

export function microCentered(s: Surface, cx: number, y: number, text: string, color: number) {
  s.micro(Math.round(cx - microWidth(text) / 2), y, text, color);
}

/** Main-font text with a dark outline. */
export function textOutlined(s: Surface, x: number, y: number, text: string, color: number, outline = 0) {
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ])
    s.text(x + dx, y + dy, text, outline);
  s.text(x, y, text, color);
}

// ------------------------------------------------------------------ 7-segment display

const SEG: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
  ' ': '',
};

/** Draw a 7-segment digit string. Each digit is 7x13 px (+2 gap). Unlit segments in `dim`. */
export function sevenSeg(s: Surface, x: number, y: number, str: string, color: number, dim = -1) {
  let cx = x;
  for (const ch of str) {
    if (ch === ',' || ch === '.') {
      s.rect(cx, y + 11, 2, 2, color);
      if (ch === ',') s.plot(cx, y + 13, color);
      cx += 4;
      continue;
    }
    if (ch === ' ') {
      cx += 9;
      continue;
    }
    const on = SEG[ch] ?? '';
    const segs: Record<string, [number, number, number, number]> = {
      a: [cx + 1, y, 5, 2],
      b: [cx + 5, y + 1, 2, 5],
      c: [cx + 5, y + 7, 2, 5],
      d: [cx + 1, y + 11, 5, 2],
      e: [cx, y + 7, 2, 5],
      f: [cx, y + 1, 2, 5],
      g: [cx + 1, y + 6, 5, 1],
    };
    for (const k of 'abcdefg') {
      const [sx, sy, w, h] = segs[k];
      const lit = on.includes(k);
      if (!lit && dim < 0) continue;
      s.rect(sx, sy, w, h, lit ? color : dim);
    }
    cx += 9;
  }
  return cx - x;
}

export function sevenSegWidth(str: string) {
  let w = 0;
  for (const ch of str) w += ch === ',' || ch === '.' ? 4 : 9;
  return w;
}

/** 1,234,567 */
export function commas(n: number) {
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ------------------------------------------------------------------ shared verbs

/** Responses shared by all five rooms (spread these LAST into a room's verbs). */
export const CYBER_VERBS: Record<string, Response> = {
  'look hands': "Your hands are made of chunky, glowing pixels. You count your fingers: same number as before, though in here they're probably indexed from zero.",
  'look self': "You're rendered in sixteen glorious colors. Teal hoodie, blue jeans, a faint scan-line shimmer. Honestly? You've never looked crisper.",
  'logout,remove helmet,exit helmet': "You reach up for the helmet, but your hands find only pixels. Krishna said there'd be a way to log out once the job is done. Probably somewhere deep in the Core.",
  'sleep': "You can't sleep in here. You're running in an interrupt context.",
  'call ?': 'No signal in cyberspace. Well, one bar. But it\'s a progress bar, and it\'s stuck at 99%.',
  'debug ?': "You're already inside the debugger. It's debuggers all the way down.",
  'jump': 'You jump. For one glorious frame you are airborne. Gravity in here is a constant somebody hard-coded in 1987, and it is not negotiable.',
  'dance': 'You do a little victory dance. Somewhere, a frame rate drops.',
  'sing': 'You hum a few bars of a chiptune. The kingdom hums the bass line back.',
  'think': "You think. It feels like it uses a lot of CPU in here.",
  'hack ?': "You're not hacking the Monolith. You're debugging it. From the inside. With your face.",
  'sudo ?': 'Dominic is not in the sudoers file. This incident will be reported.',
  // in here the duck talks back: USE DUCK is as good as TALK TO DUCK
  'use duck': async (g) => {
    if (!g.has('duck')) return false;
    await duckHint(g);
  },
};

/** Run a rewritten command through the normal dispatch (for synonyms the parser doesn't know). */
export async function redo(g: Game, text: string): Promise<true> {
  const c = parse(text, g.localNouns);
  g.resolveItemNouns(c);
  if (!(await g.dispatch(c))) await g.hooks.fallback(g, c);
  return true;
}

/** Free-text synonyms shared by every Act II room (call from a room's raw hook). */
export async function cyberRaw(g: Game, text: string): Promise<boolean> {
  const t = text.trim().toLowerCase().replace(/['’]/g, '');
  // "clip on my badge", "pin the badge to my hoodie"
  if (/^(clip|pin|fasten|attach|hang)( on)? (my |the |your )?(id |employee )?badge\b/.test(t) && g.has('badge')) return redo(g, 'wear badge');
  // "hold up my badge", "wave the badge at the robot"
  if (/^(hold up|hold out|wave) (my |the |your )?(id |employee )?badge\b/.test(t) && g.has('badge')) return redo(g, g.room?.id === 'heap' ? 'show badge' : 'look at badge');
  return false;
}

/** Small helper: is the Act II rubber duck available to chime in? */
export function hasDuck(g: Game) {
  return g.has('duck');
}
