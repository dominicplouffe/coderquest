// Creatures for Act II, part 2 (inside the Monolith): Thread A & Thread B (the
// deadlocked guard robots), the Heisenbug / Millennium Bug, the butterfly it
// becomes, and a few effect sprites (padlocks, hourglass, log-out dissolve).
//
// Everything is painted procedurally into small Surfaces so the robots can be
// posed per animation state; images are cached by pose key.

import { Surface, Img, TRANSPARENT, flipImg, imgFromRows } from '../engine/raster';
import { Painter, MirrorPainter } from './cyber_d_lib';

/** Paint a sprite into a transparent Surface and wrap it as an Img. */
export function paintImg(w: number, h: number, ox: number, oy: number, draw: (s: Surface) => void): Img {
  const s = new Surface(w, h);
  s.px.fill(TRANSPARENT);
  s.writePri = false;
  draw(s);
  return { w, h, data: s.px, ox, oy };
}

/** Same image, drawn `dy` pixels higher (for hovering / bobbing creatures). */
export function lift(img: Img, dy: number): Img {
  return dy ? { ...img, oy: img.oy + dy } : img;
}

// ======================================================================= padlocks

/** A brass padlock, 9x13. (x,y) = top-left. num = '1' | '2'. */
export function drawPadlock(s: Painter, x: number, y: number, num: string, open = false, glow = false) {
  // shackle
  const sx = open ? x + 1 : x + 2;
  const sy = open ? y - 3 : y;
  s.vline(sx, sy + 1, y + 5, 7);
  s.vline(sx + 1, sy + 1, y + 5, 15);
  s.hline(sx + 1, sx + 4, sy, 7);
  s.plot(sx + 2, sy, 15);
  s.vline(sx + 5, sy + 1, open ? sy + 3 : y + 5, 8);
  s.vline(sx + 4, sy + 1, open ? sy + 3 : y + 5, 7);
  // body
  s.rect(x, y + 5, 9, 8, glow ? 15 : 14);
  s.rect(x + 1, y + 6, 7, 6, 14);
  s.vline(x + 8, y + 5, y + 12, 6);
  s.hline(x, x + 8, y + 12, 6);
  s.hline(x, x + 7, y + 5, 15);
  s.micro(x + 3, y + 6, num, 0);
}

export function padlockImg(num: string, open = false): Img {
  return paintImg(10, 17, 4, 16, (s) => drawPadlock(s, 0, open ? 4 : 4, num, open));
}

// ======================================================================= Thread A / B

export interface ThreadLook {
  wind: number;
  windShade: number;
  letter: string;
}
export const THREAD_A: ThreadLook = { wind: 11, windShade: 3, letter: 'A' };
export const THREAD_B: ThreadLook = { wind: 13, windShade: 5, letter: 'B' };

export type ThreadEyes = 'glare' | 'glare2' | 'wide' | 'happy' | 'work' | 'off';
export type ThreadHold = 'lock' | 'offer' | 'two' | 'none' | 'bar' | 'grab';

export interface ThreadPose {
  eyes?: ThreadEyes;
  hold?: ThreadHold;
  /** number on the clutched lock */
  lock?: string;
  /** number on the second lock (hold 'two') */
  lock2?: string;
  /** remaining BREAK! bar fingers (hold 'bar'), 0..4 */
  bar?: number;
  /** mouth grille lit (talking / munching) */
  grille?: boolean;
  /** body offset in px (tremble / slump) */
  bob?: number;
  dx?: number;
  /** antenna light on */
  antenna?: boolean;
}

const TW = 38;
const TH = 50;
const TCX = 14;

/** Draw a thread-spool guard robot facing right. Ground line is y = TH-1. */
function drawThread(s: Painter, L: ThreadLook, P: ThreadPose) {
  const cx = TCX + (P.dx ?? 0);
  const G = TH - 1;
  const b = P.bob ?? 0; // upper body offset (positive = lower)
  const eyes = P.eyes ?? 'glare';
  const hold = P.hold ?? 'lock';
  // ---- feet & legs (never bob)
  s.rect(TCX - 7, G - 1, 6, 2, 8);
  s.hline(TCX - 7, TCX - 2, G - 1, 7);
  s.rect(TCX + 2, G - 1, 7, 2, 8);
  s.hline(TCX + 2, TCX + 8, G - 1, 7);
  s.plot(TCX + 8, G, 0);
  s.rect(TCX - 5, G - 8, 2, 7, 8);
  s.vline(TCX - 5, G - 8, G - 2, 7);
  s.rect(TCX + 3, G - 8, 2, 7, 8);
  s.vline(TCX + 3, G - 8, G - 2, 7);
  s.plot(TCX - 4, G - 5, 15);
  s.plot(TCX + 4, G - 5, 15);
  // ---- bottom flange (spool)
  const by = G - 11 + b;
  s.rect(cx - 9, by, 19, 3, 7);
  s.hline(cx - 9, cx + 9, by, 15);
  s.hline(cx - 9, cx + 9, by + 2, 8);
  s.plot(cx - 9, by + 1, 8);
  s.plot(cx + 9, by + 1, 8);
  // ---- barrel wound with thread
  const top = G - 28 + b;
  for (let y = top; y < by; y++) {
    const odd = (y - top) % 2 === 0;
    s.hline(cx - 6, cx + 6, y, odd ? L.wind : L.windShade);
    s.plot(cx - 5, y, odd ? 15 : L.wind);
    s.plot(cx - 4, y, L.wind);
    s.plot(cx + 5, y, L.windShade);
    s.plot(cx + 6, y, odd ? L.windShade : 0);
    // the thread winds diagonally: a few crossing strands
    if ((y - top) % 4 === 1) s.plot(cx + ((y * 3) % 9) - 4, y, 15);
  }
  // a loose end of thread hanging off the spool
  s.line(cx - 6, top + 9, cx - 8, top + 13, L.wind);
  s.plot(cx - 8, top + 14, L.windShade);
  // ---- top flange
  s.rect(cx - 9, top - 3, 19, 3, 7);
  s.hline(cx - 9, cx + 9, top - 3, 15);
  s.hline(cx - 9, cx + 9, top - 1, 8);
  s.plot(cx - 9, top - 2, 8);
  s.plot(cx + 9, top - 2, 8);
  // ---- neck
  s.rect(cx - 1, top - 5, 3, 2, 8);
  s.plot(cx, top - 5, 7);
  // ---- head (rounded box) facing right
  const hy = top - 15;
  s.rect(cx - 6, hy + 1, 13, 9, 7);
  s.hline(cx - 5, cx + 5, hy, 7);
  s.hline(cx - 4, cx + 4, hy - 1, 7);
  // outline & shading
  s.hline(cx - 4, cx + 4, hy - 2, 8);
  s.plot(cx - 5, hy - 1, 8);
  s.plot(cx + 5, hy - 1, 8);
  s.plot(cx - 6, hy, 8);
  s.plot(cx + 6, hy, 8);
  s.vline(cx - 7, hy + 1, hy + 9, 8);
  s.vline(cx + 7, hy + 1, hy + 9, 8);
  s.hline(cx - 6, cx + 6, hy + 10, 8);
  s.hline(cx - 4, cx + 2, hy - 1, 15);
  s.vline(cx - 6, hy + 1, hy + 8, 15);
  s.hline(cx - 5, cx + 6, hy + 9, 8);
  // letter on the side of the head
  s.micro(cx - 5, hy + 2, L.letter, L.windShade);
  s.plot(cx - 3, hy + 8, 8);
  // visor: its shape carries the expression
  const glare = eyes === 'glare' || eyes === 'glare2';
  if (glare) {
    // top edge slants down toward the front: a scowl
    s.rect(cx - 1, hy + 2, 3, 5, 0);
    s.rect(cx + 2, hy + 3, 3, 4, 0);
    s.rect(cx + 5, hy + 4, 3, 3, 0);
    s.hline(cx - 1, cx + 1, hy + 1, 8);
    s.hline(cx + 2, cx + 4, hy + 2, 8);
    s.hline(cx + 5, cx + 7, hy + 3, 8);
    s.hline(cx + 3, cx + 6, hy + 5, 12);
    s.hline(cx + 4, cx + 5, hy + 6, 4);
    s.plot(cx + 2, hy + 5, 4);
    s.plot(cx + 6, hy + 4, 4);
    if (eyes === 'glare2') s.plot(cx + 5, hy + 5, 15);
  } else if (eyes === 'wide') {
    // tall visor, big round startled eye
    s.rect(cx - 1, hy + 2, 9, 5, 0);
    s.hline(cx, cx + 6, hy + 1, 8);
    s.rect(cx + 3, hy + 3, 3, 3, 14);
    s.plot(cx + 4, hy + 4, 15);
    s.plot(cx + 3, hy + 3, 6);
    s.plot(cx + 5, hy + 5, 6);
  } else {
    s.rect(cx - 1, hy + 3, 9, 4, 0);
    s.hline(cx, cx + 7, hy + 2, 8);
    if (eyes === 'happy') {
      s.plot(cx + 3, hy + 5, 10);
      s.plot(cx + 4, hy + 4, 10);
      s.plot(cx + 5, hy + 4, 10);
      s.plot(cx + 6, hy + 5, 10);
    } else if (eyes === 'work') {
      s.hline(cx + 3, cx + 6, hy + 5, 2);
      s.hline(cx + 4, cx + 5, hy + 5, 10);
    } else {
      s.hline(cx + 3, cx + 6, hy + 5, 8);
    }
  }
  s.plot(cx - 2, hy + 4, 0);
  // mouth grille: vertical slots
  for (let x = cx + 2; x <= cx + 6; x++) s.plot(x, hy + 8, P.grille ? (x % 2 ? 14 : 12) : x % 2 ? 0 : 8);
  if (P.grille) s.hline(cx + 3, cx + 5, hy + 9, 4);
  // antenna
  s.vline(cx - 3, hy - 5, hy - 2, 8);
  s.rect(cx - 4, hy - 7, 3, 2, P.antenna === false ? 8 : L.wind);
  if (P.antenna !== false) s.plot(cx - 3, hy - 7, 15);
  // ---- arms & what they hold
  const sh = top - 2; // shoulder line
  const arm = (pts: number[]) => {
    for (let i = 0; i + 3 < pts.length; i += 2) s.line(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], 8, 2);
    for (let i = 0; i + 3 < pts.length; i += 2) s.line(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], 7);
    for (let i = 2; i + 1 < pts.length - 2; i += 2) s.plot(pts[i], pts[i + 1], 15);
  };
  const hand = (x: number, y: number) => {
    s.rect(x, y, 2, 2, 7);
    s.plot(x, y, 15);
  };
  if (hold === 'lock') {
    // clutched to the chest, both arms wrapped around it
    arm([cx + 8, sh, cx + 12, sh + 5, cx + 11, sh + 11]);
    drawPadlock(s, cx + 2, sh + 3, P.lock ?? '1');
    arm([cx - 8, sh + 1, cx - 8, sh + 7, cx + 2, sh + 13]);
    hand(cx + 10, sh + 11);
    hand(cx + 2, sh + 12);
  } else if (hold === 'offer') {
    // arms stretched out, lock held at arm's length
    arm([cx + 8, sh, cx + 14, sh + 3, cx + 18, sh + 4]);
    arm([cx - 8, sh + 1, cx + 2, sh + 6, cx + 16, sh + 8]);
    drawPadlock(s, cx + 17, sh - 3, P.lock ?? '1');
    hand(cx + 17, sh + 3);
    hand(cx + 15, sh + 8);
  } else if (hold === 'grab') {
    // reaching forward with an open claw
    arm([cx + 8, sh, cx + 14, sh + 2, cx + 20, sh + 2]);
    s.plot(cx + 21, sh + 1, 7);
    s.plot(cx + 22, sh, 15);
    s.plot(cx + 21, sh + 4, 7);
    s.plot(cx + 22, sh + 4, 15);
    drawPadlock(s, cx + 2, sh + 3, P.lock ?? '1');
    arm([cx - 8, sh + 1, cx - 8, sh + 7, cx + 2, sh + 13]);
    hand(cx + 2, sh + 12);
  } else if (hold === 'two') {
    // one lock clutched, the other held up high in triumph
    arm([cx - 8, sh + 1, cx - 8, sh + 7, cx + 2, sh + 13]);
    drawPadlock(s, cx + 2, sh + 3, P.lock ?? '2');
    hand(cx + 2, sh + 12);
    arm([cx + 8, sh, cx + 13, sh - 2, cx + 14, sh - 6]);
    drawPadlock(s, cx + 11, sh - 18, P.lock2 ?? '1');
    hand(cx + 13, sh - 7);
  } else if (hold === 'bar') {
    // both hands holding a BREAK! bar up to the grille
    const n = Math.max(0, Math.min(4, P.bar ?? 4));
    const bx = cx + 7;
    const byy = hy + 7;
    // wrapper (peeled back) + remaining wafer fingers
    s.rect(bx, byy, 3, 3, 4);
    s.plot(bx, byy - 1, 12);
    s.plot(bx + 1, byy + 3, 12);
    for (let i = 0; i < n; i++) {
      s.rect(bx + 3 + i * 2, byy, 2, 3, 6);
      s.plot(bx + 3 + i * 2, byy, 14);
    }
    arm([cx + 8, sh, cx + 12, sh + 2, bx + 1, byy + 3]);
    arm([cx - 8, sh + 1, cx - 2, sh + 3, bx - 1, byy + 3]);
    hand(bx - 1, byy + 2);
    hand(bx + 1, byy + 3);
  } else {
    // arms hanging loose at the sides
    arm([cx + 8, sh, cx + 10, sh + 6, cx + 10, sh + 11]);
    hand(cx + 9, sh + 11);
    arm([cx - 8, sh + 1, cx - 10, sh + 7, cx - 10, sh + 11]);
    hand(cx - 11, sh + 11);
  }
}

const threadCache = new Map<string, Img>();
/** Image of a thread robot. facing: 'right' (Thread A) or 'left' (Thread B). */
export function threadImg(L: ThreadLook, P: ThreadPose, facing: 'left' | 'right'): Img {
  const key = `${L.letter}|${facing}|${JSON.stringify(P)}`;
  let img = threadCache.get(key);
  if (!img) {
    img =
      facing === 'left'
        ? paintImg(TW, TH, TW - 1 - TCX, TH - 1, (s) => drawThread(new MirrorPainter(s, TW), L, P))
        : paintImg(TW, TH, TCX, TH - 1, (s) => drawThread(s, L, P));
    threadCache.set(key, img);
  }
  return img;
}

// ======================================================================= hourglass (wait cursor)

/** Little spinning hourglass, the universal symbol for "waiting". (x,y) = center. */
export function drawHourglass(s: Surface, x: number, y: number, t: number) {
  const phase = Math.floor(t / 10) % 8;
  if (phase >= 6) {
    // turning over: drawn sideways
    s.hline(x - 4, x + 4, y - 3, 7);
    s.hline(x - 4, x + 4, y + 3, 7);
    s.poly([x - 3, y - 2, x + 3, y - 2, x, y, x + 3, y + 2, x - 3, y + 2, x, y], 15);
    s.vline(x - 4, y - 3, y + 3, phase === 6 ? 14 : 7);
    s.vline(x + 4, y - 3, y + 3, 7);
    return;
  }
  // frame
  s.hline(x - 3, x + 3, y - 5, 14);
  s.hline(x - 3, x + 3, y + 5, 14);
  s.plot(x - 3, y - 4, 6);
  s.plot(x + 3, y - 4, 6);
  s.plot(x - 3, y + 4, 6);
  s.plot(x + 3, y + 4, 6);
  // glass
  s.line(x - 2, y - 4, x, y, 15);
  s.line(x + 2, y - 4, x, y, 15);
  s.line(x - 2, y + 4, x, y, 15);
  s.line(x + 2, y + 4, x, y, 15);
  // sand: top drains while bottom fills
  const k = phase; // 0..5
  if (k < 4) s.hline(x - 1 + (k > 1 ? 1 : 0), x + 1 - (k > 1 ? 1 : 0), y - 3 + Math.floor(k / 2), 14);
  if (k < 2) s.plot(x, y - 2, 14);
  if (k % 2 === 0 && k < 5) s.plot(x, y + 1 + (k % 3), 14);
  if (k >= 1) s.hline(x - 1, x + 1, y + 4, 14);
  if (k >= 3) s.plot(x, y + 3, 14);
}

// ======================================================================= Heisenbug

// A glitchy beetle-ish insect, facing right. w=wing, B=body, b=body shade,
// H=head, e=eye, a=antenna, l=leg, x=hot pixel.
const BUG_A = [
  '.......a..a....',
  '........aa.....',
  '..ww.ww.a......',
  '.wwwwwwww......',
  '..wwwwwwwHHH...',
  '.BBbBBbBBHeHa..',
  'xBbBBbBBbHHHH..',
  '.BBbBBbBBHH....',
  '..l.l..l..l....',
  '.l..l...l..l...',
];
const BUG_B = [
  '.......a..a....',
  '........aa.....',
  '........a......',
  '..wwwwwww......',
  '.wwwwwwwwHHH...',
  '.BBbBBbBBHeHa..',
  'xBbBBbBBbHHHH..',
  '.BBbBBbBBHH....',
  '.l..l..l...l...',
  '..l..l..l.l....',
];
const BUG_KEY = (body: number, shade: number, eye: number, wing: number) => ({ w: wing, B: body, b: shade, H: 0, e: eye, a: 8, l: 0, x: 12 });

const bugCache = new Map<string, Img>();
function bugBase(frame: number, body: number, shade: number, eye: number, wing: number, flip: boolean): Img {
  const key = `${frame}|${body}|${shade}|${eye}|${wing}|${flip}`;
  let img = bugCache.get(key);
  if (!img) {
    img = imgFromRows(frame ? BUG_B : BUG_A, BUG_KEY(body, shade, eye, wing), 7, 9);
    if (flip) img = flipImg(img);
    bugCache.set(key, img);
  }
  return img;
}

/** Cheap deterministic hash → [0,1). */
export function hash(n: number): number {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/**
 * The Heisenbug, glitching. Returns a fresh image each call: chromatic
 * aberration ghosts, sheared scanlines, palette flicker. `seed` varies per bug.
 */
export function heisenbugImg(t: number, flip: boolean, intensity = 1): Img {
  const frame = Math.floor(t / 3) % 2;
  const g = hash(Math.floor(t / 4) * 7 + 3);
  const palettes: [number, number, number, number][] = [
    [13, 5, 14, 11],
    [13, 5, 15, 3],
    [12, 4, 14, 11],
    [10, 2, 15, 9],
    [15, 13, 12, 11],
  ];
  const pal = g < 0.7 ? palettes[0] : palettes[1 + Math.floor(hash(t) * 4)];
  const base = bugBase(frame, pal[0], pal[1], pal[2], pal[3], flip);
  const W = base.w + 6;
  const H = base.h + 2;
  const out = new Uint8Array(W * H).fill(TRANSPARENT);
  const put = (x: number, y: number, c: number) => {
    if (x >= 0 && y >= 0 && x < W && y < H) out[y * W + x] = c;
  };
  // chromatic ghosts: red to one side, blue to the other
  const split = intensity > 0 && hash(t * 13 + 1) < 0.55 * intensity ? 1 + Math.floor(hash(t * 5) * 2) : 0;
  for (let y = 0; y < base.h; y++) {
    // sheared scanlines
    const shear = intensity > 0 && hash(Math.floor(t / 2) * 31 + y) < 0.12 * intensity ? Math.round((hash(t + y * 17) - 0.5) * 6) : 0;
    for (let x = 0; x < base.w; x++) {
      const c = base.data[y * base.w + x];
      if (c === TRANSPARENT) continue;
      if (split) {
        put(x + 3 - split, y + 1, 12);
        put(x + 3 + split, y + 1, 9);
      }
    }
    for (let x = 0; x < base.w; x++) {
      const c = base.data[y * base.w + x];
      if (c === TRANSPARENT) continue;
      put(x + 3 + shear, y + 1, c);
    }
  }
  // dead pixels / static
  if (intensity > 0) for (let i = 0; i < 3; i++) if (hash(t * 3 + i * 101) < 0.35 * intensity) put(Math.floor(hash(t + i * 7) * W), Math.floor(hash(t * 7 + i) * H), [15, 11, 13, 10][i % 4]);
  return { w: W, h: H, data: out, ox: base.ox + 3, oy: base.oy + 1 };
}

/** A calm, un-glitched bug (for the jar). */
export function plainBugImg(flip = false): Img {
  return bugBase(0, 13, 5, 14, 11, flip);
}

/** Draw a tiny trapped bug inside a jar at (x,y) top-left of a 5x4 area. */
export function drawJarBug(s: Surface, x: number, y: number, t: number) {
  const j = Math.floor(t / 5) % 4;
  const dx = [0, 1, 0, -1][j];
  s.hline(x + 1 + dx, x + 3 + dx, y + 1, 13);
  s.hline(x + dx, x + 3 + dx, y + 2, 5);
  s.plot(x + 4 + dx, y + 1, 14);
  s.plot(x + 1 + dx, y + (j % 2 ? 0 : 3), 11);
  s.plot(x + 3 + dx, y + (j % 2 ? 3 : 0), 11);
}

// ======================================================================= butterfly

const FLY_A = [
  '.y.......y.',
  'yYy.a.a.yYy',
  'yWYy.a.yYWy',
  'yYYYyByYYYy',
  '.yYYYBYYYy.',
  '..yGGBGGy..',
  '..yGg.gGy..',
  '...yy.yy...',
];
const FLY_B = [
  '...........',
  '....a.a....',
  '..yy.a.yy..',
  '.yYYyByYYy.',
  '..yYYBYYy..',
  '...yGBGy...',
  '...yg.gy...',
  '...........',
];
const FLY_KEY = { y: 2, Y: 10, W: 15, G: 14, g: 6, B: 0, a: 8 };
let flyImgs: Img[] | null = null;
export function butterflyImg(t: number): Img {
  if (!flyImgs) flyImgs = [imgFromRows(FLY_A, FLY_KEY, 5, 7), imgFromRows(FLY_B, FLY_KEY, 5, 7)];
  return flyImgs[Math.floor(t / 5) % 2];
}

// ======================================================================= log-out dissolve

/**
 * Dissolve an actor image upward into light: p in [0,1]. Pixels vanish
 * bottom-up in a dithered, noisy front; a band of cyan/white sparks marks the edge.
 */
export function dissolveImg(src: Img, p: number, seed = 1): Img {
  const W = src.w;
  const H = src.h + 24;
  const out = new Uint8Array(W * H).fill(TRANSPARENT);
  const lift = 24;
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < W; x++) {
      const c = src.data[y * W + x];
      if (c === TRANSPARENT) continue;
      // threshold rises from the feet to the head
      const rel = 1 - y / src.h; // 0 at the feet, 1 at the head
      const n = hash(seed * 977 + y * W + x) * 0.35;
      const th = rel * 0.65 + n;
      const i = (y + lift) * W + x;
      if (p > th + 0.22) {
        // gone; maybe a rising spark
        const up = Math.floor((p - th - 0.22) * 70 * (0.5 + hash(x * 31 + y)));
        if (hash(x * 13 + y * 7 + seed) < 0.25 && y + lift - up >= 0 && up < 30) out[(y + lift - up) * W + x] = up % 3 ? 11 : 15;
      } else if (p > th) out[i] = (x + y) % 2 ? 11 : 15;
      else out[i] = c;
    }
  return { w: W, h: H, data: out, ox: src.ox, oy: src.oy + lift };
}

// ======================================================================= punch card pile

/** A smoking little pile of punch cards: what is left of Dominic after compilation. */
export function cardPileImg(t: number): Img {
  return paintImg(24, 26, 12, 25, (s) => {
    const cards = [
      [3, 21, 14],
      [8, 19, 12],
      [5, 17, 13],
      [9, 15, 10],
      [6, 13, 11],
    ];
    for (const [x, y, w] of cards) {
      s.rect(x, y, w, 4, 15);
      s.hline(x, x + w - 1, y + 3, 7);
      s.plot(x, y, 7);
      for (let k = 2; k < w - 1; k += 3) s.plot(x + k, y + 1 + (k % 2), 0);
    }
    s.micro(9, 22, 'A.OUT', 0);
    // smoke
    for (let i = 0; i < 4; i++) {
      const ph = (t / 3 + i * 12) % 48;
      const yy = 12 - Math.floor(ph / 4);
      const xx = 11 + Math.round(Math.sin((t + i * 40) / 14) * 2) + (i % 2);
      if (yy >= 0) s.plot(xx, yy, ph < 24 ? 7 : 8);
      if (yy >= 0 && ph < 30) s.plot(xx + 1, yy, 8);
    }
  });
}
