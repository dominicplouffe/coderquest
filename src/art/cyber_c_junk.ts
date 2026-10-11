// Junk for the Heap: piles of discarded objects, drawn procedurally.
import { Surface, rng } from '../engine/raster';
import { bayerAt } from '../engine/palette';

type R = () => number;

// ---------------------------------------------------------------- individual items
// Each draws inside the box (x, y, w, h).

function arrayBox(p: Surface, x: number, y: number, w: number, h: number, r: R) {
  const pal = [
    [1, 9, 11],
    [1, 11, 15],
    [5, 13, 15],
    [0, 3, 11],
  ][Math.floor(r() * 4)];
  p.rect(x, y, w, h, pal[0]);
  p.frame(x, y, w, h, pal[1]);
  const cells = Math.max(1, Math.floor(w / 6));
  for (let i = 1; i < cells; i++) p.vline(x + Math.round((w * i) / cells), y + 1, y + h - 2, pal[1]);
  if (h >= 7) for (let i = 0; i < cells; i++) p.micro(x + Math.round((w * i) / cells) + 2, y + Math.floor(h / 2) - 2, String(Math.floor(r() * 10)), pal[2]);
}

function stringBlock(p: Surface, x: number, y: number, w: number, h: number, r: R) {
  const words = ['HELO', 'WRLD', 'FOO', 'BAR', 'TEMP', 'NULL', 'TODO', 'ASDF', 'TEST2', 'OLD'];
  p.rect(x + 1, y, w - 2, h, 14);
  p.rect(x, y + 1, w, h - 2, 14);
  p.hline(x + 1, x + w - 2, y + h - 1, 6);
  p.vline(x + w - 1, y + 1, y + h - 2, 6);
  if (h >= 7 && w >= 14) {
    const s = words[Math.floor(r() * words.length)];
    p.micro(x + 2, y + Math.floor(h / 2) - 2, '"' + s.slice(0, Math.max(1, Math.floor((w - 8) / 4))) + '"', 6);
  }
}

function floppy(p: Surface, x: number, y: number, w: number, _h: number, r: R) {
  const s = Math.max(7, Math.min(w, 11));
  const c = [1, 0, 4, 8][Math.floor(r() * 4)];
  p.rect(x, y, s, s, c);
  p.hline(x, x + s - 1, y, c === 0 ? 8 : c === 1 ? 9 : c === 4 ? 12 : 7);
  p.rect(x + 2, y, s - 4, Math.floor(s / 3), 7);
  p.vline(x + Math.floor(s / 2), y + 1, y + Math.floor(s / 3) - 1, 0);
  p.rect(x + 1, y + Math.floor(s / 2) + 1, s - 2, Math.floor(s / 2) - 1, 15);
  p.hline(x + 2, x + s - 3, y + Math.floor(s / 2) + 2, 9);
  // broken corner
  if (r() < 0.5) {
    p.plot(x + s - 1, y + s - 1, 0);
    p.plot(x + s - 2, y + s - 1, 0);
    p.plot(x + s - 1, y + s - 2, 0);
  }
}

function crt(p: Surface, x: number, y: number, w: number, h: number, r: R) {
  p.rect(x, y, w, h - 2, 7);
  p.hline(x, x + w - 1, y, 15);
  p.vline(x + w - 1, y, y + h - 3, 8);
  p.rect(x + 2, y + 2, w - 5, h - 7, r() < 0.5 ? 1 : 0);
  if (r() < 0.6) {
    // cracked screen
    p.line(x + 3, y + 3, x + w - 5, y + h - 7, 15);
    p.line(x + Math.floor(w / 2), y + 2, x + 4, y + h - 6, 7);
  } else p.hline(x + 3, x + w - 6, y + 4, 10);
  p.rect(x + Math.floor(w / 2) - 3, y + h - 2, 6, 2, 8);
}

function folder(p: Surface, x: number, y: number, w: number, h: number) {
  p.rect(x, y + 2, w, h - 2, 14);
  p.rect(x, y, Math.floor(w / 2), 3, 14);
  p.hline(x, x + w - 1, y + 2, 15);
  p.hline(x, x + w - 1, y + h - 1, 6);
  p.vline(x + w - 1, y + 2, y + h - 1, 6);
}

function doc(p: Surface, x: number, y: number, w: number, h: number) {
  p.rect(x, y, w, h, 15);
  p.plot(x + w - 1, y, 0);
  p.plot(x + w - 2, y, 7);
  p.plot(x + w - 1, y + 1, 7);
  for (let yy = y + 2; yy < y + h - 1; yy += 2) p.hline(x + 1, x + w - 3, yy, 7);
  p.vline(x + w - 1, y + 2, y + h - 1, 7);
}

function errorX(p: Surface, x: number, y: number, w: number) {
  const r = Math.max(3, Math.floor(w / 2));
  p.circle(x + r, y + r, r, 4);
  p.ellipseO(x + r, y + r, r, r, 12);
  p.line(x + r - 2, y + r - 2, x + r + 2, y + r + 2, 15);
  p.line(x + r + 2, y + r - 2, x + r - 2, y + r + 2, 15);
}

function hourglass(p: Surface, x: number, y: number) {
  p.hline(x, x + 6, y, 15);
  p.hline(x, x + 6, y + 9, 15);
  p.poly([x + 1, y + 1, x + 6, y + 1, x + 3.5, y + 5], 7);
  p.poly([x + 3.5, y + 5, x + 6, y + 9, x + 1, y + 9], 7);
  p.plot(x + 3, y + 3, 14);
  p.hline(x + 2, x + 5, y + 8, 14);
  p.plot(x + 3, y + 6, 14);
}

function toolbar(p: Surface, x: number, y: number, w: number) {
  p.rect(x, y, w, 5, 7);
  p.hline(x, x + w - 1, y, 15);
  p.hline(x, x + w - 1, y + 4, 8);
  const cols = [12, 10, 9, 14, 13, 11];
  for (let i = 0; x + 2 + i * 4 < x + w - 3; i++) p.rect(x + 2 + i * 4, y + 1, 3, 3, cols[i % cols.length]);
}

function brace(p: Surface, x: number, y: number, r: R) {
  const ch = ['{', '}', ';', '#', '&', '*', '<', '>', '/'][Math.floor(r() * 9)];
  const c = [13, 11, 10, 14, 12][Math.floor(r() * 5)];
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ])
    p.text(x + dx, y + dy, ch, 0);
  p.text(x, y, ch, c);
}

function pointer(p: Surface, x: number, y: number) {
  const rows = ['#.....', '##....', '#w#...', '#ww#..', '#www#.', '#wwww#', '#w##..', '##.#..', '#..##.', '....#.'];
  for (let yy = 0; yy < rows.length; yy++)
    for (let xx = 0; xx < rows[yy].length; xx++) {
      const c = rows[yy][xx];
      if (c === '#') p.plot(x + xx, y + yy, 0);
      else if (c === 'w') p.plot(x + xx, y + yy, 15);
    }
}

function block(p: Surface, x: number, y: number, w: number, h: number, r: R) {
  const pal = [
    [5, 13, 0],
    [8, 7, 0],
    [4, 12, 0],
    [6, 14, 0],
    [1, 9, 0],
    [8, 7, 0],
    [3, 11, 0],
    [1, 9, 0],
  ][Math.floor(r() * 8)];
  p.rect(x, y, w, h, pal[0]);
  p.hline(x, x + w - 1, y, pal[1]);
  p.vline(x, y, y + h - 1, pal[1]);
  p.hline(x, x + w - 1, y + h - 1, pal[2]);
  p.vline(x + w - 1, y, y + h - 1, pal[2]);
}

function cable(p: Surface, x: number, y: number, w: number, r: R) {
  const c = [0, 4, 1, 8][Math.floor(r() * 4)];
  let px = x,
    py = y;
  for (let i = 1; i <= 6; i++) {
    const nx = x + (w * i) / 6,
      ny = y + Math.sin(i * 1.7 + r() * 2) * 3;
    p.line(px, py, nx, ny, c);
    p.line(px, py + 1, nx, ny + 1, c === 0 ? 8 : c);
    px = nx;
    py = ny;
  }
}

/** Draw one random junk item roughly sized w x h at (x, y). */
export function junkItem(p: Surface, x: number, y: number, w: number, h: number, r: R, kind?: number) {
  const k = kind ?? Math.floor(r() * 13);
  switch (k) {
    case 0:
    case 1:
      return arrayBox(p, x, y, w, h, r);
    case 2:
      return stringBlock(p, x, y, w, h, r);
    case 3:
      return floppy(p, x, y, w, h, r);
    case 4:
      return crt(p, x, y, Math.max(10, w), Math.max(10, h), r);
    case 5:
      return folder(p, x, y, Math.max(8, w), Math.max(6, h));
    case 6:
      return doc(p, x, y, Math.max(6, Math.min(w, 9)), Math.max(8, h));
    case 7:
      return errorX(p, x, y, Math.min(w, h, 10));
    case 8:
      return hourglass(p, x, y);
    case 9:
      return toolbar(p, x, y, Math.max(12, w));
    case 10:
      return brace(p, x, y, r);
    case 11:
      return pointer(p, x, y);
    default:
      return r() < 0.3 ? cable(p, x, y, w, r) : block(p, x, y, w, h, r);
  }
}

// ---------------------------------------------------------------- piles

export interface PileOpts {
  /** number of items */
  n?: number;
  /** item scale (1 = normal) */
  scale?: number;
  /** darken items toward the base */
  shade?: boolean;
  /** sharpness of the mound */
  peak?: number;
  /** colour of the mound itself */
  fill?: number;
  /** rim colour along the top contour */
  rim?: number;
  /** probability that an item is a dull gray block instead of something colourful */
  dull?: number;
}

/** Dull junk: crates, slabs and bent plates in grays and blues, outlined in black. */
function dullItem(p: Surface, x: number, y: number, w: number, h: number, r: R) {
  const pal = [
    [8, 7],
    [8, 7],
    [1, 9],
    [7, 15],
    [8, 7],
  ][Math.floor(r() * 5)];
  const k = r();
  if (k < 0.5) {
    p.rect(x, y, w, h, pal[0]);
    p.hline(x, x + w - 1, y, pal[1]);
    p.frame(x - 1, y - 1, w + 2, h + 2, 0);
    if (w > 8 && r() < 0.5) p.hline(x + 2, x + w - 3, y + Math.floor(h / 2), 0);
  } else if (k < 0.8) {
    // a slab lying at an angle
    const t = Math.round((r() - 0.5) * h);
    p.poly([x, y + Math.max(0, t), x + w, y + Math.max(0, -t), x + w, y + h + Math.max(0, -t) - 2, x, y + h + Math.max(0, t) - 2], pal[0]);
    p.line(x, y + Math.max(0, t), x + w, y + Math.max(0, -t), pal[1]);
  } else {
    // a pipe / rod
    p.line(x, y + h, x + w, y, 0, 3);
    p.line(x, y + h - 1, x + w, y - 1, pal[1]);
  }
}

/**
 * A mound of junk. (cx, base) = centre of the pile's front foot; halfW, h = size.
 * Returns the contour function (y of the pile's top at x).
 */
export function junkPile(p: Surface, cx: number, base: number, halfW: number, h: number, seed: number, o: PileOpts = {}) {
  const r = rng(seed);
  const peak = o.peak ?? 0.8;
  const fill = o.fill ?? 8;
  const top = (x: number) => {
    const u = (x - cx) / halfW;
    if (Math.abs(u) >= 1) return base;
    return base - h * Math.pow(1 - u * u, peak) * (0.86 + 0.14 * Math.sin(x * 0.37 + seed));
  };
  // silhouette: a dark mass with a lighter rim
  for (let x = Math.floor(cx - halfW); x <= Math.ceil(cx + halfW); x++) {
    const ty = Math.round(top(x));
    for (let y = ty; y <= base; y++) p.plot(x, y, fill);
    p.plot(x, ty, o.rim ?? 7);
  }
  // items, back (high) to front (low)
  const n = o.n ?? Math.round((halfW * h) / 26);
  const sc = o.scale ?? 1;
  const dull = o.dull ?? 0.55;
  const items: { x: number; y: number; w: number; h: number; k: number; s: number; d: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const w = Math.round((7 + r() * 12) * sc),
      hh = Math.round((5 + r() * 7) * sc);
    const x = Math.round(cx + (r() * 2 - 1) * (halfW - w / 2) - w / 2);
    const tY = top(x + w / 2);
    if (base - tY < hh * 0.8) continue;
    const y = Math.round(tY - hh * 0.3 + r() * Math.max(0, base - tY - hh * 0.9));
    items.push({ x, y, w, h: hh, k: Math.floor(r() * 13), s: Math.floor(r() * 1e9), d: r() < dull });
  }
  items.sort((a, b) => a.y + a.h - (b.y + b.h));
  for (const it of items) {
    if (it.d) dullItem(p, it.x, it.y, it.w, it.h, rng(it.s));
    else junkItem(p, it.x, it.y, it.w, it.h, rng(it.s), it.k);
  }
  // ambient occlusion: the base of the pile sinks into shadow
  if (o.shade !== false) {
    for (let x = Math.floor(cx - halfW); x <= Math.ceil(cx + halfW); x++) {
      const ty = top(x);
      const hh = base - ty;
      const solid = base - Math.min(5, hh * 0.12) - ((x * 7) % 3);
      for (let y = Math.round(base - hh * 0.22); y <= base; y++) {
        if (y >= solid || (bayerAt(x, y) < 3 && y > solid - 4)) p.plot(x, y, 0);
      }
    }
  }
  return top;
}
