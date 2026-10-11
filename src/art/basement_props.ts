// Scenery helpers shared by the basement rooms (stairwell, basement corridor,
// server room). Owned by the basement rooms; other rooms shouldn't depend on it.
import { Surface, rng, microWidth } from '../engine/raster';
import { Fill } from '../engine/palette';

/** Concrete-block wall: solid base with staggered joints. */
export function blockWall(p: Surface, x: number, y: number, w: number, h: number, base: Fill, joint: Fill, bw = 12, bh = 6) {
  p.rect(x, y, w, h, base);
  for (let row = 0; row * bh < h; row++) {
    const yy = y + row * bh;
    p.hline(x, x + w - 1, yy, joint);
    const off = row % 2 ? bw / 2 : 0;
    for (let xx = x - off; xx < x + w; xx += bw) if (xx >= x) p.vline(xx, yy, Math.min(y + h - 1, yy + bh - 1), joint);
  }
}

/** Horizontal pipe with a highlight and a shadow; flanges every `seg` pixels. */
export function pipeH(p: Surface, x0: number, x1: number, y: number, d: number, col: number, hi: number, lo: number, seg = 0) {
  p.rect(x0, y, x1 - x0, d, col);
  p.hline(x0, x1 - 1, y, hi);
  if (d > 3) p.hline(x0, x1 - 1, y + 1, hi);
  p.hline(x0, x1 - 1, y + d - 1, lo);
  if (seg > 0)
    for (let x = x0 + seg; x < x1 - 2; x += seg) {
      p.rect(x, y - 1, 2, d + 2, lo);
      p.vline(x, y - 1, y + d, hi);
    }
}

/** Vertical pipe. */
export function pipeV(p: Surface, x: number, y0: number, y1: number, d: number, col: number, hi: number, lo: number) {
  p.rect(x, y0, d, y1 - y0, col);
  p.vline(x, y0, y1 - 1, hi);
  p.vline(x + d - 1, y0, y1 - 1, lo);
}

/** Pipe bracket hanging from a ceiling at y=top. */
export function bracket(p: Surface, x: number, top: number, y: number, d: number) {
  p.vline(x, top, y - 1, 0);
  p.hline(x - 2, x + 2, y + d, 0);
  p.vline(x - 2, y - 1, y + d, 0);
  p.vline(x + 2, y - 1, y + d, 0);
}

/** A steel fire door, 24x46. (x,y) = top-left of the leaf. */
export function fireDoor(p: Surface, x: number, y: number, opts: { color?: number; hi?: number; lo?: number; window?: boolean; bar?: boolean; sign?: string } = {}) {
  const col = opts.color ?? 4,
    hi = opts.hi ?? 12,
    lo = opts.lo ?? 0;
  p.rect(x - 3, y - 3, 30, 49, 0);
  p.rect(x - 2, y - 2, 28, 48, 7);
  p.vline(x - 2, y - 2, y + 45, 15);
  p.rect(x, y, 24, 46, col);
  p.vline(x, y, y + 45, hi);
  p.hline(x, x + 23, y, hi);
  p.vline(x + 23, y, y + 45, lo);
  // hinges
  p.rect(x - 1, y + 5, 2, 3, 8);
  p.rect(x - 1, y + 36, 2, 3, 8);
  if (opts.window !== false) {
    // wired-glass vision panel
    p.rect(x + 14, y + 5, 7, 14, 0);
    p.rect(x + 15, y + 6, 5, 12, 1);
    for (let k = 0; k < 12; k += 3) {
      p.hline(x + 15, x + 19, y + 6 + k, 9);
    }
    p.vline(x + 17, y + 6, y + 17, 9);
  }
  if (opts.bar !== false) {
    // panic bar
    p.rect(x + 2, y + 23, 20, 3, 7);
    p.hline(x + 2, x + 21, y + 23, 15);
    p.hline(x + 2, x + 21, y + 26, 0);
    p.rect(x + 2, y + 22, 2, 5, 8);
    p.rect(x + 20, y + 22, 2, 5, 8);
  }
  // kick plate
  p.rect(x + 1, y + 42, 22, 4, 8);
  p.hline(x + 1, x + 22, y + 42, 7);
  if (opts.sign) {
    // '|' separates lines; the plate sits below the panic bar
    const lines = opts.sign.split('|');
    const w = Math.max(...lines.map((l) => microWidth(l))) + 4;
    const sx = x + Math.floor((24 - w) / 2);
    p.rect(sx, y + 28, w, lines.length * 6 + 1, 15);
    p.frame(sx, y + 28, w, lines.length * 6 + 1, 8);
    lines.forEach((l, i) => p.micro(sx + Math.floor((w - microWidth(l)) / 2), y + 29 + i * 6, l, 4));
  }
}

/** Blocky stencil digits (5 wide, 7 tall, 2px strokes) for painted floor numbers. */
const BIG: Record<string, string[]> = {
  '1': ['.##..', '###..', '.##..', '.##..', '.##..', '.##..', '####.'],
  '2': ['####.', '...##', '...##', '####.', '##...', '##...', '#####'],
  '3': ['####.', '...##', '...##', '.###.', '...##', '...##', '####.'],
  B: ['####.', '##.##', '##.##', '####.', '##.##', '##.##', '####.'],
  F: ['#####', '##...', '##...', '####.', '##...', '##...', '##...'],
};
export function bigStencil(p: Surface, x: number, y: number, s: string, col: Fill, scale = 2) {
  let cx = x;
  for (const ch of s) {
    const g = BIG[ch];
    if (!g) {
      cx += 4 * scale;
      continue;
    }
    for (let r = 0; r < g.length; r++)
      for (let c = 0; c < g[r].length; c++) if (g[r][c] === '#') p.rect(cx + c * scale, y + r * scale, scale, scale, col);
    cx += 6 * scale;
  }
}

/** A cardboard box. */
export function cardboardBox(p: Surface, x: number, y: number, w: number, h: number, label?: string) {
  p.rect(x, y, w, h, 6);
  p.rect(x, y, w, 2, 14);
  p.hline(x, x + w - 1, y + 2, 6);
  p.vline(x + w - 1, y, y + h - 1, 0);
  p.hline(x, x + w - 1, y + h - 1, 0);
  p.vline(x + Math.floor(w / 2), y, y + 3, 0);
  if (label) p.micro(x + 2, y + 4, label, 0);
}

/** Shared pseudo-random flicker for the basement's dying fluorescent tube (same in every basement room). */
export function tubeOn(t: number): boolean {
  const phase = t % 600;
  if (phase < 6) return phase % 2 === 0;
  if (phase > 300 && phase < 318) return [0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0][phase - 301] === 1;
  const r = rng(Math.floor(t / 4))();
  return r > 0.015;
}
