// Reusable scenery painters. Every room background in Coder's Quest is drawn
// procedurally from these primitives, the way Sierra's SCI0 pictures were
// built from vector fills and dither patterns.
//
// Conventions:
//   * Picture is 320x190. The back wall/floor seam in office rooms is usually y≈100–112.
//   * Call p.at(z, () => ...) for anything that should hide actors standing
//     BEHIND it, where z = the y of the object's front edge on the floor.

import { Surface, rng, microWidth } from '../engine/raster';
import { dith, pat, Fill } from '../engine/palette';

export { dith, pat };
export type { Fill };

// ------------------------------------------------------------------ sky & city

/** Dusk / night sky gradient + distant skyline with lit windows. */
export function skyline(
  p: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { seed?: number; time?: 'dusk' | 'night' | 'dawn' | 'day'; stars?: boolean } = {},
) {
  const time = opts.time ?? 'dusk';
  const skies: Record<string, number[]> = {
    dusk: [1, 5, 13, 12, 14],
    night: [0, 1, 1, 5],
    dawn: [1, 9, 13, 12, 14, 15],
    day: [9, 9, 11, 11, 15],
  };
  p.clip(x, y, x + w, y + h);
  p.gradV(x, y, w, h, skies[time]);
  const r = rng(opts.seed ?? 7);
  if (opts.stars || time === 'night') {
    for (let i = 0; i < (w * h) / 90; i++) p.plot(x + Math.floor(r() * w), y + Math.floor(r() * h * 0.6), r() < 0.2 ? 15 : 7);
  }
  // two layers of buildings
  for (const layer of [0, 1]) {
    let bx = x - Math.floor(r() * 10);
    while (bx < x + w) {
      const bw = 8 + Math.floor(r() * 16);
      const bh = Math.floor(h * (layer ? 0.25 + r() * 0.3 : 0.35 + r() * 0.45));
      const top = y + h - bh;
      const col = layer ? 0 : time === 'day' ? 8 : 1;
      p.rect(bx, top, bw, bh, col);
      if (r() < 0.3) p.rect(bx + Math.floor(bw / 2) - 1, top - 4, 2, 4, col); // antenna
      // windows
      for (let wy = top + 2; wy < y + h - 1; wy += 3)
        for (let wx = bx + 1; wx < bx + bw - 1; wx += 2) {
          if (r() < (layer ? 0.25 : 0.18)) p.plot(wx, wy, r() < 0.7 ? 14 : 15);
        }
      bx += bw + Math.floor(r() * 3);
    }
  }
  p.clip();
}

/** Office window with frame, mullions, sill and the city outside. */
export function officeWindow(
  p: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { seed?: number; time?: 'dusk' | 'night' | 'dawn' | 'day'; panes?: number; frame?: number; blinds?: boolean } = {},
) {
  const frame = opts.frame ?? 7;
  skyline(p, x, y, w, h, { seed: opts.seed, time: opts.time });
  const panes = opts.panes ?? Math.max(1, Math.round(w / 40));
  p.frame(x - 1, y - 1, w + 2, h + 2, frame);
  p.frame(x - 2, y - 2, w + 4, h + 4, 8);
  for (let i = 1; i < panes; i++) {
    const mx = x + Math.round((w * i) / panes);
    p.vline(mx, y, y + h - 1, frame);
  }
  if (opts.blinds) {
    for (let yy = y; yy < y + Math.floor(h * 0.35); yy += 2) p.hline(x, x + w - 1, yy, 7);
    p.hline(x, x + w - 1, y + Math.floor(h * 0.35), 8);
  }
  p.rect(x - 3, y + h + 2, w + 6, 2, frame);
  p.hline(x - 3, x + w + 2, y + h + 4, 8);
}

// ------------------------------------------------------------------ walls & floors

export function wall(p: Surface, y0: number, y1: number, fill: Fill, x0 = 0, x1 = 320) {
  p.rect(x0, y0, x1 - x0, y1 - y0, fill);
}

/** Baseboard along a wall/floor seam. */
export function baseboard(p: Surface, y: number, color = 8, x0 = 0, x1 = 320) {
  p.rect(x0, y - 3, x1 - x0, 3, color);
  p.hline(x0, x1 - 1, y - 4, 7);
}

/** Office carpet: a mostly-solid base, darker band at the back, subtle texture. */
export function carpet(p: Surface, y0: number, y1: number, opts: { a?: number; b?: number; seams?: boolean; vanish?: number } = {}) {
  const a = opts.a ?? 8,
    b = opts.b ?? 0;
  p.rect(0, y0, 320, y1 - y0, a);
  p.gradV(0, y0, 320, Math.min(10, y1 - y0), [b, a]);
  p.speckle(0, y0 + 6, 320, y1 - y0 - 6, b, 0.025, 31);
  if (opts.seams) {
    const vx = opts.vanish ?? 160;
    for (let i = -6; i <= 6; i++) {
      const xb = 160 + i * 64;
      p.line(vx + (xb - vx) * 0.25, y0, xb, y1, dith(a, b, 5));
    }
  }
}

/** Polished tile / linoleum floor with perspective grid. */
export function tileFloor(p: Surface, y0: number, y1: number, a = 7, b = 8, vanish = 160) {
  p.gradV(0, y0, 320, y1 - y0, [b, a]);
  for (let i = -12; i <= 12; i++) {
    const xb = 160 + i * 30;
    p.line(vanish + (xb - vanish) * 0.3, y0, xb, y1, b);
  }
  let yy = y0;
  let step = 3;
  while (yy < y1) {
    p.hline(0, 319, yy, b);
    yy += step;
    step = Math.ceil(step * 1.35);
  }
}

/** Concrete with stains. */
export function concrete(p: Surface, x: number, y: number, w: number, h: number, seed = 3) {
  p.rect(x, y, w, h, dith(8, 7, 5));
  p.speckle(x, y, w, h, 8, 0.08, seed);
  p.speckle(x, y, w, h, 7, 0.03, seed + 1);
}

export function bricks(p: Surface, x: number, y: number, w: number, h: number, brick = 4, mortar = 8, shade = 6) {
  p.rect(x, y, w, h, mortar);
  for (let row = 0; row * 5 < h; row++) {
    const off = row % 2 ? 5 : 0;
    for (let bx = -off; bx < w; bx += 10) {
      const x0 = Math.max(x, x + bx),
        x1 = Math.min(x + w - 1, x + bx + 8);
      const yy = y + row * 5;
      if (x1 >= x0) {
        p.rect(x0, yy, x1 - x0 + 1, Math.min(4, y + h - yy), brick);
        p.hline(x0, x1, yy + 3, shade);
      }
    }
  }
}

export function ceiling(p: Surface, y0: number, y1: number, fill: Fill = 7, tiles = true) {
  p.rect(0, y0, 320, y1 - y0, fill);
  if (tiles) {
    for (let x = 0; x < 320; x += 32) p.vline(x, y0, y1 - 1, 8);
    p.hline(0, 319, y1 - 1, 8);
  }
}

/** Long fluorescent ceiling light fixtures. */
export function fluorescent(p: Surface, cx: number, y: number, w = 40, lit = true) {
  p.rect(cx - w / 2, y, w, 3, 8);
  p.rect(cx - w / 2 + 1, y + 1, w - 2, 2, lit ? 15 : 7);
  if (lit) p.hline(cx - w / 2 + 2, cx + w / 2 - 3, y + 3, dith(15, 7, 8));
}

// ------------------------------------------------------------------ office props

/**
 * A desk seen from slightly above. (x,y) = top-left of the desktop surface,
 * w = width, depth = desktop depth in px, h = front panel height.
 * Priority is set to the front edge so actors behind it are hidden.
 */
export function desk(
  p: Surface,
  x: number,
  y: number,
  w: number,
  opts: { depth?: number; h?: number; top?: number; front?: number; edge?: number; drawers?: 'left' | 'right' | 'both' | 'none'; legs?: boolean } = {},
) {
  const depth = opts.depth ?? 10;
  const h = opts.h ?? 22;
  const top = opts.top ?? 6;
  const front = opts.front ?? 6;
  const edge = opts.edge ?? 14;
  const base = y + depth + h;
  p.at(base, () => {
    p.rect(x, y, w, depth, top);
    p.hline(x, x + w - 1, y, dith(top, 15, 4));
    p.rect(x, y + depth, w, 2, edge);
    if (opts.legs) {
      p.rect(x + 1, y + depth + 2, 3, h - 2, 8);
      p.rect(x + w - 4, y + depth + 2, 3, h - 2, 8);
    } else {
      p.rect(x, y + depth + 2, w, h - 2, front);
      // modesty panel shading
      p.rect(x + 2, y + depth + 4, w - 4, h - 6, dith(front, 0, 3));
    }
    const dr = opts.drawers ?? 'right';
    const drawerW = Math.min(24, Math.floor(w / 3));
    const drawCol = (dx: number) => {
      p.rect(dx, y + depth + 2, drawerW, h - 2, front);
      p.frame(dx, y + depth + 2, drawerW, h - 2, 0);
      const n = 3;
      for (let i = 0; i < n; i++) {
        const dy = y + depth + 3 + Math.floor(((h - 4) * i) / n);
        p.hline(dx + 1, dx + drawerW - 2, dy, dith(front, 0, 6));
        p.rect(dx + Math.floor(drawerW / 2) - 2, dy + 3, 4, 1, 7);
      }
    };
    if (dr === 'right' || dr === 'both') drawCol(x + w - drawerW - 2);
    if (dr === 'left' || dr === 'both') drawCol(x + 2);
  });
}

/** Flat-panel monitor on a stand. (x,y) = top-left of bezel. */
export function monitor(p: Surface, x: number, y: number, w: number, h: number, screen: Fill = 1, opts: { z?: number; bezel?: number; stand?: boolean } = {}) {
  const bezel = opts.bezel ?? 0;
  const draw = () => {
    p.rect(x, y, w, h, bezel);
    p.rect(x + 2, y + 2, w - 4, h - 4, screen);
    if (opts.stand !== false) {
      p.rect(x + Math.floor(w / 2) - 1, y + h, 3, 3, 8);
      p.rect(x + Math.floor(w / 2) - 4, y + h + 3, 9, 1, 8);
    }
    p.plot(x + w - 3, y + h - 2, 10);
  };
  if (opts.z !== undefined) p.at(opts.z, draw);
  else draw();
}

/** Fake lines of code on a screen region. */
export function codeLines(p: Surface, x: number, y: number, w: number, h: number, seed = 1, colors = [10, 11, 15, 14, 13], bg?: Fill) {
  if (bg !== undefined) p.rect(x, y, w, h, bg);
  const r = rng(seed);
  let indent = 0;
  for (let yy = y + 1; yy < y + h - 1; yy += 2) {
    if (r() < 0.12) continue;
    indent = Math.max(0, Math.min(4, indent + (r() < 0.3 ? 1 : r() < 0.3 ? -1 : 0)));
    let xx = x + 1 + indent * 2;
    while (xx < x + w - 2) {
      const len = 1 + Math.floor(r() * 6);
      const col = colors[Math.floor(r() * colors.length)];
      p.hline(xx, Math.min(x + w - 2, xx + len - 1), yy, col);
      xx += len + 1 + Math.floor(r() * 2);
      if (r() < 0.25) break;
    }
  }
}

export function keyboard(p: Surface, x: number, y: number, w = 16, color = 8, keys = 7) {
  p.rect(x, y, w, 3, color);
  for (let i = x + 1; i < x + w - 1; i += 2) p.plot(i, y + 1, keys);
  p.hline(x, x + w - 1, y + 3, 0);
}

export function mug(p: Surface, x: number, y: number, color = 15, opts: { steam?: boolean } = {}) {
  p.rect(x, y, 4, 5, color);
  p.plot(x + 4, y + 1, color);
  p.plot(x + 5, y + 2, color);
  p.plot(x + 4, y + 3, color);
  p.hline(x, x + 3, y, 7);
  if (opts.steam) {
    p.plot(x + 1, y - 2, 7);
    p.plot(x + 2, y - 3, 7);
    p.plot(x + 1, y - 4, 7);
  }
}

/** Potted plant. (x,y) = bottom-center of pot. */
export function plant(p: Surface, x: number, y: number, size = 1, seed = 1, z?: number) {
  const draw = () => {
    const r = rng(seed);
    const pw = Math.round(8 * size),
      ph = Math.round(7 * size);
    // leaves
    const n = Math.round(14 * size);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.6;
      const len = (8 + r() * 12) * size;
      const x1 = x + Math.cos(a) * len * 0.8,
        y1 = y - ph + Math.sin(a) * len;
      p.line(x, y - ph, x1, y1, r() < 0.5 ? 2 : 10);
      p.ellipse(Math.round(x1), Math.round(y1), Math.round(2 * size), Math.max(1, Math.round(1 * size)), r() < 0.6 ? 2 : 10);
    }
    p.poly([x - pw / 2, y - ph, x + pw / 2, y - ph, x + pw / 2 - 1, y, x - pw / 2 + 1, y], 6);
    p.hline(x - pw / 2, x + pw / 2 - 1, y - ph, 4);
    p.hline(x - pw / 2 + 1, x + pw / 2 - 2, y - ph + 1, dith(6, 0, 8));
  };
  if (z !== undefined) p.at(z, draw);
  else draw();
}

/** Office chair seen from behind/side. (x,y) = floor point under the seat. */
export function officeChair(p: Surface, x: number, y: number, color = 0, opts: { z?: number; back?: boolean } = {}) {
  const draw = () => {
    p.hline(x - 6, x + 6, y, 8);
    p.plot(x - 6, y - 1, 8);
    p.plot(x + 6, y - 1, 8);
    p.vline(x, y - 6, y, 8);
    p.rect(x - 7, y - 9, 15, 3, color);
    if (opts.back !== false) {
      p.rect(x - 6, y - 22, 13, 13, color);
      p.rect(x - 5, y - 21, 11, 11, dith(color, 8, 4));
    }
  };
  p.at(opts.z ?? y, draw);
}

/** Generic door. (x,y) top-left, w,h size. */
export function door(
  p: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { color?: number; frame?: number; open?: boolean; knob?: 'left' | 'right'; window?: boolean; sign?: string; signColor?: number; inside?: Fill } = {},
) {
  const col = opts.color ?? 6;
  const fr = opts.frame ?? 8;
  p.rect(x - 2, y - 2, w + 4, h + 2, fr);
  if (opts.open) {
    p.rect(x, y, w, h, opts.inside ?? 0);
    // door leaf swung inward
    p.poly([x, y, x + 5, y + 3, x + 5, y + h - 2, x, y + h], col);
  } else {
    p.rect(x, y, w, h, col);
    p.rect(x + 2, y + 2, w - 4, Math.floor(h / 2) - 3, dith(col, 0, 3));
    p.rect(x + 2, y + Math.floor(h / 2) + 1, w - 4, Math.floor(h / 2) - 3, dith(col, 0, 3));
    if (opts.window) {
      p.rect(x + Math.floor(w / 2) - 3, y + 6, 6, 10, 11);
      p.frame(x + Math.floor(w / 2) - 3, y + 6, 6, 10, 0);
    }
    const kx = opts.knob === 'left' ? x + 3 : x + w - 5;
    p.rect(kx, y + Math.floor(h / 2), 2, 2, 14);
  }
  if (opts.sign) {
    const sw = microWidth(opts.sign) + 4;
    const sx = x + Math.floor((w - sw) / 2);
    p.rect(sx, y - 10, sw, 8, opts.signColor ?? 15);
    p.frame(sx, y - 10, sw, 8, 0);
    p.micro(sx + 2, y - 8, opts.sign, 0);
  }
}

/** Framed poster / sign with micro-text lines. */
export function poster(p: Surface, x: number, y: number, w: number, h: number, bg: Fill, lines: string[], fg = 0, frame = 0) {
  p.rect(x, y, w, h, bg);
  p.frame(x, y, w, h, frame);
  const total = lines.length * 7 - 2;
  let yy = y + Math.floor((h - total) / 2);
  for (const ln of lines) {
    p.micro(x + Math.floor((w - microWidth(ln)) / 2), yy, ln, fg);
    yy += 7;
  }
}

export function whiteboard(p: Surface, x: number, y: number, w: number, h: number) {
  p.rect(x - 2, y - 2, w + 4, h + 4, 7);
  p.rect(x, y, w, h, 15);
  p.rect(x + 2, y + h + 2, w - 4, 2, 8);
  p.rect(x + 6, y + h, 4, 2, 4);
  p.rect(x + 12, y + h, 4, 2, 1);
}

export function clock(p: Surface, cx: number, cy: number, r: number, hour: number, min: number, face = 15) {
  p.circle(cx, cy, r + 1, 8);
  p.circle(cx, cy, r, face);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.plot(Math.round(cx + Math.sin(a) * (r - 1)), Math.round(cy - Math.cos(a) * (r - 1)), 8);
  }
  const ma = (min / 60) * Math.PI * 2;
  const ha = (((hour % 12) + min / 60) / 12) * Math.PI * 2;
  p.line(cx, cy, cx + Math.sin(ma) * (r - 1), cy - Math.cos(ma) * (r - 1), 0);
  p.line(cx, cy, cx + Math.sin(ha) * (r - 3), cy - Math.cos(ha) * (r - 3), 4);
}

/** Cubicle partition panel. */
export function partition(p: Surface, x: number, y: number, w: number, h: number, color: Fill = dith(7, 9, 6), trim = 8) {
  p.rect(x, y, w, h, color);
  p.rect(x, y, w, 2, trim);
  p.hline(x, x + w - 1, y + 2, dith(trim, 0, 6));
}

/** Server rack. Returns LED positions for animation. */
export function serverRack(p: Surface, x: number, y: number, w: number, h: number, seed = 1, z?: number): [number, number, number][] {
  const leds: [number, number, number][] = [];
  const draw = () => {
    const r = rng(seed);
    p.rect(x, y, w, h, 0);
    p.frame(x, y, w, h, 8);
    let yy = y + 2;
    while (yy < y + h - 4) {
      const uh = r() < 0.7 ? 3 : 5;
      p.rect(x + 2, yy, w - 4, uh, r() < 0.5 ? 8 : 0);
      p.hline(x + 2, x + w - 3, yy, 7);
      for (let lx = x + 4; lx < x + w - 4; lx += 3) {
        if (r() < 0.45) {
          const c = r() < 0.6 ? 10 : r() < 0.5 ? 14 : 12;
          p.plot(lx, yy + 1, c);
          leds.push([lx, yy + 1, c]);
        }
      }
      yy += uh + 1;
    }
  };
  if (z !== undefined) p.at(z, draw);
  else draw();
  return leds;
}

// ------------------------------------------------------------------ cyberspace

/** Perspective grid floor (Tron style) from horizon to bottom. */
export function gridFloor(p: Surface, horizon: number, bottom = 190, opts: { color?: number; far?: number; bg?: Fill; vanish?: number; spacing?: number } = {}) {
  const color = opts.color ?? 3;
  const far = opts.far ?? 1;
  const vx = opts.vanish ?? 160;
  p.rect(0, horizon, 320, bottom - horizon, opts.bg ?? 0);
  const sp = opts.spacing ?? 24;
  for (let i = -30; i <= 30; i++) {
    const xb = vx + i * sp;
    p.line(vx + (xb - vx) * 0.04, horizon, xb, bottom, i % 2 ? far : color);
  }
  let k = 0;
  for (let z = 1; z < 40; z++) {
    const yy = horizon + Math.round((bottom - horizon) * (1 / (1 + (40 - z) * 0.18)));
    if (yy >= bottom) break;
    p.hline(0, 319, yy, k++ % 2 ? far : color);
  }
  p.hline(0, 319, horizon, 11);
}

export function starfield(p: Surface, x: number, y: number, w: number, h: number, seed = 1, density = 0.012) {
  const r = rng(seed);
  const n = Math.round(w * h * density);
  for (let i = 0; i < n; i++) {
    const c = r();
    p.plot(x + Math.floor(r() * w), y + Math.floor(r() * h), c < 0.1 ? 15 : c < 0.4 ? 7 : c < 0.7 ? 8 : 9);
  }
}

/** Scattered 0s and 1s (micro font). */
export function bits(p: Surface, x: number, y: number, w: number, h: number, seed = 1, color: Fill = 2, n = 30) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) p.micro(x + Math.floor(r() * (w - 4)), y + Math.floor(r() * (h - 6)), r() < 0.5 ? '0' : '1', color);
}

/** A neon-outlined block of "code" (a function frame, a struct...). */
export function codeSlab(p: Surface, x: number, y: number, w: number, h: number, label: string, edge = 11, fill: Fill = 1, seed = 1) {
  p.rect(x, y, w, h, fill);
  p.frame(x, y, w, h, edge);
  if (label) p.micro(x + 3, y + 2, label, edge === 11 ? 15 : edge);
  codeLines(p, x + 2, y + (label ? 8 : 2), w - 4, h - (label ? 10 : 4), seed, [10, 11, 3, 15]);
}

/** Glow around text drawn in the main font. */
export function glowText(p: Surface, x: number, y: number, s: string, fg: number, glow: number) {
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ])
    p.text(x + dx, y + dy, s, glow);
  p.text(x, y, s, fg);
}

/** Simple signpost. (x,y) = foot of post. */
export function signpost(p: Surface, x: number, y: number, text: string, opts: { color?: number; board?: number; z?: number; arrow?: 'left' | 'right' | 'none' } = {}) {
  const draw = () => {
    const board = opts.board ?? 6;
    const tw = microWidth(text) + 6;
    p.rect(x - 1, y - 28, 2, 28, opts.color ?? 6);
    const bx = x - Math.floor(tw / 2);
    if (opts.arrow === 'right') p.poly([bx, y - 30, bx + tw, y - 30, bx + tw + 4, y - 26, bx + tw, y - 22, bx, y - 22], board);
    else if (opts.arrow === 'left') p.poly([bx, y - 30, bx + tw, y - 30, bx + tw, y - 22, bx, y - 22, bx - 4, y - 26], board);
    else p.rect(bx, y - 30, tw, 8, board);
    p.micro(bx + 3, y - 28, text, 15);
  };
  p.at(opts.z ?? y, draw);
}

/** Blink a set of LEDs (call from a room overlay). */
export function blinkLeds(s: Surface, t: number, leds: [number, number, number][], rate = 12) {
  for (let i = 0; i < leds.length; i++) {
    const [x, y, c] = leds[i];
    const on = ((t / rate + i * 7.3) | 0) % 3 !== 0;
    s.plot(x, y, on ? c : 0);
  }
}
