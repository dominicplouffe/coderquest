// Indexed-color software rasterizer. Every room background is painted with
// these primitives into a Surface, which also carries a Sierra-style
// "priority" layer: each pixel remembers the baseline (feet y) of the object
// that painted it, so actors standing behind that object are hidden by it.

import { Fill, fillAt, bayerAt } from './palette';
import { renderText, textWidth } from './font';

export interface Img {
  w: number;
  h: number;
  /** palette index per pixel, 255 = transparent */
  data: Uint8Array;
  /** origin (usually bottom-center / feet) */
  ox: number;
  oy: number;
}

export const TRANSPARENT = 255;

export function makeImg(w: number, h: number, ox = 0, oy = 0): Img {
  const data = new Uint8Array(w * h);
  data.fill(TRANSPARENT);
  return { w, h, data, ox, oy };
}

export function flipImg(img: Img): Img {
  const out = makeImg(img.w, img.h, img.w - 1 - img.ox, img.oy);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) out.data[y * img.w + (img.w - 1 - x)] = img.data[y * img.w + x];
  return out;
}

/** Build an image from strings of characters + a color key. '.' or ' ' are transparent. */
export function imgFromRows(rows: string[], key: Record<string, number>, ox?: number, oy?: number): Img {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const img = makeImg(w, h, ox ?? Math.floor(w / 2), oy ?? h - 1);
  for (let y = 0; y < h; y++) {
    const r = rows[y];
    for (let x = 0; x < r.length; x++) {
      const ch = r[x];
      if (ch === '.' || ch === ' ') continue;
      const c = key[ch];
      if (c !== undefined) img.data[y * w + x] = c;
    }
  }
  return img;
}

export function recolor(img: Img, map: Record<number, number>): Img {
  const out = { ...img, data: img.data.slice() };
  for (let i = 0; i < out.data.length; i++) {
    const c = out.data[i];
    if (c !== TRANSPARENT && map[c] !== undefined) out.data[i] = map[c];
  }
  return out;
}

export class Surface {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
  readonly pri: Uint8Array;
  /** priority written with each pixel (0 = background, never occludes) */
  z = 0;
  /** when false, drawing does not touch the priority layer */
  writePri = true;
  /** clip rectangle */
  cx0 = 0;
  cy0 = 0;
  cx1: number;
  cy1: number;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h);
    this.pri = new Uint8Array(w * h);
    this.cx1 = w;
    this.cy1 = h;
  }

  clip(x0 = 0, y0 = 0, x1 = this.w, y1 = this.h) {
    this.cx0 = Math.max(0, x0);
    this.cy0 = Math.max(0, y0);
    this.cx1 = Math.min(this.w, x1);
    this.cy1 = Math.min(this.h, y1);
  }

  /** Run fn with a temporary priority (feet-baseline) value. */
  at(z: number, fn: () => void) {
    const old = this.z;
    this.z = Math.max(0, Math.min(255, Math.round(z)));
    fn();
    this.z = old;
  }

  clear(c = 0) {
    this.px.fill(c);
    this.pri.fill(0);
  }

  plot(x: number, y: number, f: Fill) {
    x |= 0;
    y |= 0;
    if (x < this.cx0 || y < this.cy0 || x >= this.cx1 || y >= this.cy1) return;
    const i = y * this.w + x;
    this.px[i] = fillAt(f, x, y);
    if (this.writePri) this.pri[i] = this.z;
  }

  get(x: number, y: number): number {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.px[y * this.w + x];
  }

  hline(x0: number, x1: number, y: number, f: Fill) {
    y = Math.round(y);
    if (y < this.cy0 || y >= this.cy1) return;
    let a = Math.round(Math.min(x0, x1));
    let b = Math.round(Math.max(x0, x1));
    if (a < this.cx0) a = this.cx0;
    if (b >= this.cx1) b = this.cx1 - 1;
    const row = y * this.w;
    const solid = typeof f === 'number';
    for (let x = a; x <= b; x++) {
      this.px[row + x] = solid ? (f as number) : fillAt(f, x, y);
      if (this.writePri) this.pri[row + x] = this.z;
    }
  }

  vline(x: number, y0: number, y1: number, f: Fill) {
    const a = Math.round(Math.min(y0, y1));
    const b = Math.round(Math.max(y0, y1));
    for (let y = a; y <= b; y++) this.plot(x, y, f);
  }

  rect(x: number, y: number, w: number, h: number, f: Fill) {
    x = Math.round(x);
    y = Math.round(y);
    for (let yy = y; yy < y + h; yy++) this.hline(x, x + w - 1, yy, f);
  }

  frame(x: number, y: number, w: number, h: number, f: Fill) {
    this.hline(x, x + w - 1, y, f);
    this.hline(x, x + w - 1, y + h - 1, f);
    this.vline(x, y, y + h - 1, f);
    this.vline(x + w - 1, y, y + h - 1, f);
  }

  /** Bresenham line, optional thickness (square brush). */
  line(x0: number, y0: number, x1: number, y1: number, f: Fill, thick = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const o = Math.floor((thick - 1) / 2);
    for (;;) {
      if (thick <= 1) this.plot(x0, y0, f);
      else this.rect(x0 - o, y0 - o, thick, thick, f);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Polyline through flat point list [x0,y0,x1,y1,...]. */
  lines(pts: number[], f: Fill, thick = 1) {
    for (let i = 0; i + 3 < pts.length; i += 2) this.line(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], f, thick);
  }

  /** Filled polygon from flat point list (even-odd scanline fill). */
  poly(pts: number[], f: Fill) {
    const n = pts.length / 2;
    if (n < 3) return;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      minY = Math.min(minY, pts[i * 2 + 1]);
      maxY = Math.max(maxY, pts[i * 2 + 1]);
    }
    minY = Math.max(this.cy0, Math.floor(minY));
    maxY = Math.min(this.cy1 - 1, Math.ceil(maxY));
    const xs: number[] = [];
    for (let y = minY; y <= maxY; y++) {
      const sy = y + 0.5;
      xs.length = 0;
      for (let i = 0; i < n; i++) {
        const ax = pts[i * 2],
          ay = pts[i * 2 + 1];
        const j = (i + 1) % n;
        const bx = pts[j * 2],
          by = pts[j * 2 + 1];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) {
          xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.round(xs[k]);
        const b = Math.round(xs[k + 1]) - 1;
        if (b >= a) this.hline(a, b, y, f);
      }
    }
    // crisp outline so thin polys don't vanish
  }

  /** Filled polygon plus its outline in another fill. */
  polyO(pts: number[], f: Fill, outline: Fill) {
    this.poly(pts, f);
    const closed = pts.concat([pts[0], pts[1]]);
    this.lines(closed, outline);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, f: Fill) {
    if (rx <= 0 || ry <= 0) {
      this.plot(cx, cy, f);
      return;
    }
    for (let y = -ry; y <= ry; y++) {
      const t = y / (ry + 0.5);
      const hw = Math.sqrt(Math.max(0, 1 - t * t)) * (rx + 0.5);
      this.hline(Math.round(cx - hw + 0.5), Math.round(cx + hw - 0.5), cy + y, f);
    }
  }

  ellipseO(cx: number, cy: number, rx: number, ry: number, f: Fill) {
    let px = -1,
      py = -1;
    const steps = Math.max(24, Math.ceil((rx + ry) * 4));
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(a) * rx);
      const y = Math.round(cy + Math.sin(a) * ry);
      if (px >= -0.5 && (Math.abs(x - px) > 1 || Math.abs(y - py) > 1)) this.line(px, py, x, y, f);
      else this.plot(x, y, f);
      px = x;
      py = y;
    }
  }

  circle(cx: number, cy: number, r: number, f: Fill) {
    this.ellipse(cx, cy, r, r, f);
  }

  /**
   * Vertical gradient through a list of colors using ordered dithering.
   * Produces silky skies and lighting falloff within the 16 color palette.
   */
  gradV(x: number, y: number, w: number, h: number, stops: number[]) {
    if (stops.length === 1) return this.rect(x, y, w, h, stops[0]);
    const segs = stops.length - 1;
    for (let yy = 0; yy < h; yy++) {
      const t = h <= 1 ? 0 : (yy / (h - 1)) * segs;
      const si = Math.min(segs - 1, Math.floor(t));
      const frac = t - si;
      const a = stops[si],
        b = stops[si + 1];
      const lvl = Math.round(frac * 16);
      const Y = y + yy;
      for (let xx = 0; xx < w; xx++) {
        const X = x + xx;
        this.plot(X, Y, bayerAt(X, Y) < lvl ? b : a);
      }
    }
  }

  gradH(x: number, y: number, w: number, h: number, stops: number[]) {
    if (stops.length === 1) return this.rect(x, y, w, h, stops[0]);
    const segs = stops.length - 1;
    for (let xx = 0; xx < w; xx++) {
      const t = w <= 1 ? 0 : (xx / (w - 1)) * segs;
      const si = Math.min(segs - 1, Math.floor(t));
      const frac = t - si;
      const a = stops[si],
        b = stops[si + 1];
      const lvl = Math.round(frac * 16);
      const X = x + xx;
      for (let yy = 0; yy < h; yy++) {
        const Y = y + yy;
        this.plot(X, Y, bayerAt(X, Y) < lvl ? b : a);
      }
    }
  }

  /** Radial dithered glow: inner color fading to outer color within radius. */
  glow(cx: number, cy: number, r: number, inner: number, outer: number, ry = r) {
    for (let y = -ry; y <= ry; y++)
      for (let x = -r; x <= r; x++) {
        const d = Math.sqrt((x / r) ** 2 + (y / ry) ** 2);
        if (d > 1) continue;
        const lvl = Math.round((1 - d) * 16);
        const X = cx + x,
          Y = cy + y;
        if (bayerAt(X, Y) < lvl) this.plot(X, Y, inner);
        else if (outer >= 0) this.plot(X, Y, outer);
      }
  }

  /** Scatter single pixels for texture. */
  speckle(x: number, y: number, w: number, h: number, f: Fill, density: number, seed = 1) {
    const r = rng(seed);
    const n = Math.round(w * h * density);
    for (let i = 0; i < n; i++) this.plot(x + Math.floor(r() * w), y + Math.floor(r() * h), f);
  }

  /** Text in the bitmap font. Returns width drawn. */
  text(x: number, y: number, s: string, f: Fill, bold = false): number {
    return renderText(s, Math.round(x), Math.round(y), (px, py) => this.plot(px, py, f), bold);
  }

  /** Centered text. */
  textC(cx: number, y: number, s: string, f: Fill, bold = false) {
    const w = textWidth(s) + (bold ? s.length : 0);
    this.text(Math.round(cx - w / 2), y, s, f, bold);
  }

  /**
   * Tiny 3x5 "micro" text, used for signage detail where the main font
   * would be too large. Uppercase/digits only.
   */
  micro(x: number, y: number, s: string, f: Fill): number {
    let cx = Math.round(x);
    for (const ch of s.toUpperCase()) {
      const g = MICRO[ch];
      if (ch === ' ') {
        cx += 3;
        continue;
      }
      if (!g) {
        cx += 4;
        continue;
      }
      const w = g[0].length;
      for (let ry = 0; ry < g.length; ry++)
        for (let rx = 0; rx < w; rx++) if (g[ry][rx] === '#') this.plot(cx + rx, y + ry, f);
      cx += w + 1;
    }
    return cx - x;
  }

  /** Draw an image with origin at (x,y). */
  blit(img: Img, x: number, y: number, map?: Uint8Array | null) {
    const x0 = Math.round(x) - img.ox;
    const y0 = Math.round(y) - img.oy;
    for (let yy = 0; yy < img.h; yy++)
      for (let xx = 0; xx < img.w; xx++) {
        const c = img.data[yy * img.w + xx];
        if (c === TRANSPARENT) continue;
        this.plot(x0 + xx, y0 + yy, map ? map[c] : c);
      }
  }

  copyFrom(src: Surface) {
    this.px.set(src.px);
    this.pri.set(src.pri);
  }
}

export function microWidth(s: string): number {
  let w = 0;
  for (const ch of s.toUpperCase()) {
    if (ch === ' ') w += 3;
    else w += (MICRO[ch]?.[0].length ?? 3) + 1;
  }
  return w - 1;
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MICRO: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  '.': ['.', '.', '.', '.', '#'],
  ',': ['.', '.', '.', '#', '#'],
  ':': ['.', '#', '.', '#', '.'],
  '!': ['#', '#', '#', '.', '#'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  '-': ['...', '...', '###', '...', '...'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  '(': ['.#', '#.', '#.', '#.', '.#'],
  ')': ['#.', '.#', '.#', '.#', '#.'],
  '=': ['...', '###', '...', '###', '...'],
  "'": ['#', '#', '.', '.', '.'],
  '"': ['#.#', '#.#', '...', '...', '...'],
  '#': ['#.#', '###', '#.#', '###', '#.#'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  '<': ['..#', '.#.', '#..', '.#.', '..#'],
  '>': ['#..', '.#.', '..#', '.#.', '#..'],
  '{': ['.##', '.#.', '#..', '.#.', '.##'],
  '}': ['##.', '.#.', '..#', '.#.', '##.'],
  ';': ['.', '#', '.', '#', '#'],
  '_': ['...', '...', '...', '...', '###'],
  '*': ['...', '#.#', '.#.', '#.#', '...'],
  '&': ['.#.', '#.#', '.#.', '#.#', '.##'],
  '$': ['.##', '##.', '.#.', '.##', '##.'],
  '@': ['.#.', '#.#', '###', '#..', '.##'],
  '[': ['##', '#.', '#.', '#.', '##'],
  ']': ['##', '.#', '.#', '.#', '##'],
};
