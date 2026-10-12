// Scenery helpers for the Act I office floor (office, phil, hallway, breakroom,
// noc, lab). Everything here follows the room scale in docs/ENGINE.md:
// a standing person is 37px, desks ~18px high, doors ~24x46.
import { Surface, Img, makeImg, TRANSPARENT, rng, microWidth } from '../engine/raster';
import { dith, Fill } from '../engine/palette';
import { X } from '../engine/palette-ext';
import { ITEMS } from '../content/items';

// ------------------------------------------------------------------ architecture

/**
 * Ceiling band with acoustic tiles. The ceiling is the trapezoid between the top of
 * the picture and the back wall's top edge (y1), between the side-wall corners.
 */
export function ceilingBand(p: Surface, lx: number, rx: number, y1: number, fill: Fill = 7) {
  p.poly([0, 0, 320, 0, rx, y1, lx, y1], fill);
  // tile grid converging toward the vanishing point
  const vx = 160;
  for (let i = -8; i <= 8; i++) {
    const xb = vx + i * 40;
    const xt = vx + i * 40 * ((rx - lx) / 320);
    p.line(xb, 0, xt, y1, 8);
  }
  p.hline(Math.round(lx), Math.round(rx), Math.round(y1), 8);
  for (const y of [Math.round(y1 * 0.45)]) {
    const t = y / y1;
    p.hline(Math.round(lx * t), Math.round(320 - (320 - rx) * t), y, 8);
  }
}

/** Left perspective side wall: from screen edge (top yt0, floor yf0) to back corner (bx, top yt1, floor yf1). */
export function sideWallL(p: Surface, bx: number, yt0: number, yf0: number, yt1: number, yf1: number, fill: Fill) {
  p.poly([0, yt0, bx, yt1, bx, yf1, 0, yf0], fill);
  p.vline(bx, yt1, yf1, 8);
}
export function sideWallR(p: Surface, bx: number, yt0: number, yf0: number, yt1: number, yf1: number, fill: Fill) {
  p.poly([bx, yt1, 320, yt0, 320, yf0, bx, yf1], fill);
  p.vline(bx, yt1, yf1, 8);
}

/** Interpolate along a line from (x0,y0) to (x1,y1) at x. */
export function lerpY(x0: number, y0: number, x1: number, y1: number, x: number) {
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

/** A quadrilateral (e.g. a door on a perspective wall). pts: near-bottom, near-top, far-top, far-bottom */
export function quad(p: Surface, nx: number, nyb: number, nyt: number, fx: number, fyt: number, fyb: number, fill: Fill) {
  p.poly([nx, nyb, nx, nyt, fx, fyt, fx, fyb], fill);
}

/** Simple illuminated EXIT sign. */
export function exitSign(p: Surface, x: number, y: number, text = 'EXIT') {
  const w = microWidth(text) + 6;
  p.rect(x, y, w, 9, 8);
  p.rect(x + 1, y + 1, w - 2, 7, 0);
  p.micro(x + 3, y + 2, text, 10);
}

/** A framed sign with a header strip. */
export function plaque(p: Surface, x: number, y: number, w: number, h: number, lines: string[], bg: Fill = 6, fg = 14, frame = 0) {
  p.rect(x, y, w, h, bg);
  p.frame(x, y, w, h, frame);
  const total = lines.length * 7 - 2;
  let yy = y + Math.floor((h - total) / 2);
  for (const ln of lines) {
    p.micro(x + Math.floor((w - microWidth(ln)) / 2), yy, ln, fg);
    yy += 7;
  }
}

/** Big chunky 7-segment style digit (5x9), for counters and LED signs. */
const SEG: Record<string, number[]> = {
  '0': [1, 1, 1, 0, 1, 1, 1],
  '1': [0, 0, 1, 0, 0, 1, 0],
  '2': [1, 0, 1, 1, 1, 0, 1],
  '3': [1, 0, 1, 1, 0, 1, 1],
  '4': [0, 1, 1, 1, 0, 1, 0],
  '5': [1, 1, 0, 1, 0, 1, 1],
  '6': [1, 1, 0, 1, 1, 1, 1],
  '7': [1, 0, 1, 0, 0, 1, 0],
  '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1],
};
export function segDigit(p: Surface, x: number, y: number, d: string, on: number, off = -1) {
  const s = SEG[d] ?? SEG['8'];
  const seg = (i: number, f: () => void) => {
    if (s[i]) f();
  };
  const segOff = (i: number, f: () => void) => {
    if (!s[i] && off >= 0) f();
  };
  const parts: [number, () => void, () => void][] = [
    [0, () => p.hline(x + 1, x + 3, y, on), () => p.hline(x + 1, x + 3, y, off)],
    [1, () => p.vline(x, y + 1, y + 3, on), () => p.vline(x, y + 1, y + 3, off)],
    [2, () => p.vline(x + 4, y + 1, y + 3, on), () => p.vline(x + 4, y + 1, y + 3, off)],
    [3, () => p.hline(x + 1, x + 3, y + 4, on), () => p.hline(x + 1, x + 3, y + 4, off)],
    [4, () => p.vline(x, y + 5, y + 7, on), () => p.vline(x, y + 5, y + 7, off)],
    [5, () => p.vline(x + 4, y + 5, y + 7, on), () => p.vline(x + 4, y + 5, y + 7, off)],
    [6, () => p.hline(x + 1, x + 3, y + 8, on), () => p.hline(x + 1, x + 3, y + 8, off)],
  ];
  for (const [i, a, b] of parts) {
    seg(i, a);
    segOff(i, b);
  }
}

// ------------------------------------------------------------------ furniture

/** A solid highlight color for the top edge of a surface of the given color. */
export function hlOf(c: number): number {
  return ({ 0: 8, 1: 9, 2: 10, 3: 11, 4: 12, 5: 13, 6: 14, 7: 15, 8: 7, 15: 7 } as Record<number, number>)[c] ?? 15;
}

/**
 * A work desk seen from the user's side: the kneehole faces the camera.
 * x = left edge, z = front edge on the floor (priority), w = width.
 * Returns the y of the desktop's back edge (where monitors stand).
 */
export function workDesk(
  p: Surface,
  x: number,
  z: number,
  w: number,
  opts: { h?: number; depth?: number; top?: number; edge?: number; body?: number; knee?: [number, number]; pedestal?: 'left' | 'right' | 'none'; kneeFill?: Fill } = {},
): number {
  const h = opts.h ?? 18;
  const depth = opts.depth ?? 8;
  const top = opts.top ?? 7;
  const edge = opts.edge ?? 8;
  const body = opts.body ?? 8;
  const yTop = z - h - depth;
  const yFront = z - h;
  const knee = opts.knee ?? [x + Math.floor(w * 0.3), x + Math.floor(w * 0.7)];
  // kneehole interior stays at background priority so actors tucked in it still show
  p.rect(knee[0], yFront + 2, knee[1] - knee[0], h - 2, opts.kneeFill ?? dith(0, 8, 3));
  p.hline(knee[0], knee[1] - 1, z - 1, 0);
  p.at(z, () => {
    // desktop
    p.rect(x, yTop, w, depth, top);
    p.hline(x, x + w - 1, yTop, hlOf(top));
    p.rect(x, yFront, w, 2, edge);
    p.hline(x, x + w - 1, yFront + 2, 0);
    // left side panel / right side panel
    const panel = (x0: number, x1: number) => {
      p.rect(x0, yFront + 3, x1 - x0, h - 3, body);
      p.vline(x0, yFront + 3, z - 1, 0);
      p.vline(x1 - 1, yFront + 3, z - 1, 0);
    };
    panel(x, knee[0]);
    panel(knee[1], x + w);
    // pedestal drawers
    const ped = opts.pedestal ?? 'left';
    const drawers = (x0: number, x1: number) => {
      for (let i = 0; i < 3; i++) {
        const dy = yFront + 4 + i * Math.floor((h - 5) / 3);
        p.hline(x0 + 1, x1 - 2, dy, 0);
        p.rect(Math.floor((x0 + x1) / 2) - 2, dy + 2, 4, 1, 7);
      }
    };
    if (ped === 'left') drawers(x, knee[0]);
    else if (ped === 'right') drawers(knee[1], x + w);
    p.hline(x, x + w - 1, z - 1, 0);
  });
  return yTop + 2;
}

/**
 * An executive / reception desk facing the camera (the person sits behind it).
 * x = left, z = front floor edge, w = width. Returns desktop back-edge y.
 */
export function frontDesk(p: Surface, x: number, z: number, w: number, opts: { h?: number; depth?: number; top?: number; body?: number; trim?: number; panel?: Fill } = {}): number {
  const h = opts.h ?? 18;
  const depth = opts.depth ?? 6;
  const top = opts.top ?? 6;
  const body = opts.body ?? 6;
  const trim = opts.trim ?? 14;
  const yTop = z - h - depth;
  const yFront = z - h;
  p.at(z, () => {
    p.rect(x, yTop, w, depth, top);
    p.hline(x, x + w - 1, yTop, hlOf(top));
    p.rect(x - 1, yFront, w + 2, 2, trim === -1 ? top : trim);
    p.rect(x, yFront + 2, w, h - 2, body);
    if (opts.panel !== undefined) p.rect(x + 3, yFront + 5, w - 6, h - 9, opts.panel);
    p.frame(x + 3, yFront + 5, w - 6, h - 9, 0);
    p.hline(x + 4, x + w - 5, yFront + h - 5, hlOf(body));
    p.vline(x + w - 4, yFront + 6, yFront + h - 5, hlOf(body));
    p.hline(x, x + w - 1, z - 1, 0);
  });
  return yTop + 1;
}

/** Office chair seen from behind (back faces the camera). (x,z) = floor under seat. */
export function chairBack(p: Surface, x: number, z: number, color = 0, opts: { high?: boolean; hl?: number } = {}) {
  const hl = opts.hl ?? 8;
  p.at(z, () => {
    // star base
    p.hline(x - 6, x + 6, z - 1, 8);
    p.plot(x - 6, z - 2, 0);
    p.plot(x + 6, z - 2, 0);
    p.plot(x, z - 2, 0);
    p.vline(x, z - 7, z - 2, 8);
    // seat
    p.rect(x - 6, z - 9, 13, 2, color);
    p.hline(x - 6, x + 6, z - 9, hl);
    // back (mid-back height, so the sitter's shoulders show above it)
    const bt = opts.high ? z - 22 : z - 17;
    p.rect(x - 5, bt, 11, z - 10 - bt, color);
    p.hline(x - 4, x + 4, bt, hl);
    p.vline(x - 5, bt + 1, z - 11, hl);
    p.vline(x, z - 10, z - 8, 8);
  });
}

/** Office chair from the front/side, empty. */
export function chairFront(p: Surface, x: number, z: number, color = 0, hl = 8) {
  p.at(z, () => {
    p.hline(x - 6, x + 6, z - 1, 8);
    p.plot(x - 6, z - 2, 0);
    p.plot(x + 6, z - 2, 0);
    p.vline(x, z - 7, z - 2, 8);
    p.rect(x - 5, z - 20, 11, 10, color);
    p.hline(x - 4, x + 4, z - 20, hl);
    p.rect(x - 7, z - 10, 15, 3, color);
    p.hline(x - 6, x + 6, z - 10, hl);
    // armrests
    p.vline(x - 7, z - 14, z - 10, 8);
    p.vline(x + 7, z - 14, z - 10, 8);
  });
}

/** A toppled office chair lying on its side. (x,z) = floor center. */
export function chairToppled(p: Surface, x: number, z: number, color = 0) {
  p.at(z, () => {
    // back lying flat toward the left
    p.rect(x - 12, z - 6, 12, 5, color);
    p.hline(x - 11, x - 1, z - 6, 8);
    // seat standing on edge
    p.rect(x - 1, z - 11, 3, 10, color);
    // post and base sticking out to the right
    p.hline(x + 2, x + 7, z - 6, 8);
    p.vline(x + 8, z - 10, z - 2, 8);
    p.plot(x + 9, z - 10, 0);
    p.plot(x + 9, z - 2, 0);
    p.plot(x + 9, z - 6, 0);
    p.hline(x - 12, x + 9, z - 1, dith(0, 8, 4));
  });
}

/** A monitor seen from behind (case only). */
export function monitorBack(p: Surface, x: number, y: number, w: number, h: number, color = 8) {
  p.rect(x, y, w, h, color);
  p.rect(x + 2, y + 2, w - 4, h - 4, dith(color, 0, 4));
  p.rect(x + Math.floor(w / 2) - 1, y + h, 3, 3, 8);
  p.rect(x + Math.floor(w / 2) - 4, y + h + 3, 9, 1, 0);
}

/** Tall potted plant (ficus/snake plant). (x, z) = floor center. */
export function tallPlant(p: Surface, x: number, z: number, h = 34, seed = 3, pot: number = 6) {
  const r = rng(seed);
  p.at(z, () => {
    // leaves: fan of strappy leaves
    const n = Math.round(h * 0.7);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 1.9;
      const len = h * (0.45 + r() * 0.55);
      const x1 = x + Math.cos(a) * len * 0.55;
      const y1 = z - 9 + Math.sin(a) * len;
      p.line(x, z - 9, x1, y1, r() < 0.5 ? 2 : 10);
      if (r() < 0.6) p.plot(Math.round(x1), Math.round(y1), 10);
    }
    // pot
    p.poly([x - 6, z - 10, x + 6, z - 10, x + 5, z, x - 5, z], pot);
    p.hline(x - 6, x + 6, z - 10, pot === 6 ? 14 : 7);
    p.hline(x - 5, x + 5, z - 9, dith(pot, 0, 6));
    p.vline(x + 4, z - 8, z - 1, dith(pot, 0, 8));
    p.hline(x - 5, x + 5, z, 0);
  });
}

/** Floor shadow ellipse under an object. */
export function shadow(p: Surface, cx: number, y: number, rx: number, ry = 1, col = 0) {
  p.ellipse(cx, y, rx, ry, dith(8, col, 8));
}

/** Water cooler. (x,z) = floor center. */
export function waterCooler(p: Surface, x: number, z: number) {
  p.at(z, () => {
    // cabinet
    p.rect(x - 6, z - 20, 13, 20, 15);
    p.rect(x + 4, z - 20, 3, 20, 7);
    p.frame(x - 6, z - 20, 13, 20, 8);
    p.rect(x - 6, z - 20, 13, 2, 7);
    // recessed tap alcove with hot/cold taps
    p.rect(x - 4, z - 16, 9, 6, 8);
    p.rect(x - 3, z - 16, 2, 2, 9);
    p.rect(x + 2, z - 16, 2, 2, 4);
    p.hline(x - 4, x + 4, z - 11, 0);
    // paper cone dispenser on the side
    p.rect(x + 7, z - 17, 2, 7, 7);
    p.plot(x + 7, z - 10, 15);
    p.hline(x - 6, x + 6, z - 1, 0);
    // the upside-down jug
    p.rect(x - 1, z - 22, 3, 2, 9);
    p.rect(x - 5, z - 34, 11, 12, 11);
    p.hline(x - 4, x + 4, z - 35, 11);
    p.hline(x - 4, x + 4, z - 22, 9);
    p.rect(x + 3, z - 33, 2, 10, 9);
    p.vline(x - 3, z - 33, z - 25, 15);
    p.hline(x - 5, x + 5, z - 30, 9);
    p.hline(x - 5, x + 5, z - 26, 9);
  });
}

// ------------------------------------------------------------------ screens & gadgets

/** A red "everything is down" dashboard screen. */
export function alertScreen(p: Surface, x: number, y: number, w: number, h: number, seed = 1) {
  const r = rng(seed);
  p.rect(x, y, w, h, 4);
  for (let yy = y + 1; yy < y + h - 1; yy += 2) {
    const len = 2 + Math.floor(r() * (w - 4));
    p.hline(x + 1, x + Math.min(w - 2, len), yy, r() < 0.3 ? 14 : 12);
  }
}

/** A cardboard box. (x, z) = front-left floor corner. */
export function box(p: Surface, x: number, z: number, w: number, h: number, label?: string) {
  p.at(z, () => {
    p.rect(x, z - h, w, h, 6);
    p.rect(x + 1, z - h - 2, w, 2, dith(6, 14, 6));
    p.vline(x + w, z - h - 1, z - 1, dith(6, 0, 6));
    p.hline(x + Math.floor(w / 2) - 1, x + Math.floor(w / 2) + 1, z - h, 14);
    p.vline(x + Math.floor(w / 2), z - h, z - h + 3, 14);
    if (label) p.micro(x + 2, z - h + 5, label, 0);
    p.hline(x, x + w, z - 1, 0);
  });
}

/** Clone an image and apply pixel edits [x, y, color] (color TRANSPARENT to erase). */
export function editImg(img: Img, edits: [number, number, number][]): Img {
  const out: Img = { ...img, data: img.data.slice() };
  for (const [x, y, c] of edits) if (x >= 0 && y >= 0 && x < img.w && y < img.h) out.data[y * img.w + x] = c;
  return out;
}

/** Find pixels of a given color in an image region. */
export function findPx(img: Img, color: number, y0 = 0, y1 = img.h): [number, number][] {
  const out: [number, number][] = [];
  for (let y = y0; y < y1; y++) for (let x = 0; x < img.w; x++) if (img.data[y * img.w + x] === color) out.push([x, y]);
  return out;
}

/**
 * Aidan, hiding under his desk: a little hugging-his-knees sprite (13x17).
 * Built from his palette (red cap, yellow hoodie, blue jeans, light-red shoes).
 */
export function aidanCrouch(mouthOpen = false, blink = false): Img {
  const rows = [
    '....CCCCC....',
    '...CCCCCCC...',
    '...ccccccc...',
    '..hSESSSESh..',
    '...SSSSSSS...',
    '...SSSsSSS...',
    '....SSMSS....',
    '..YYYsSsYYY..',
    '.YYPPPYPPPYY.',
    '.YYPPPyPPPYY.',
    '.YSSYYYYYSSY.',
    '.YYPPPyPPPYY.',
    '..yPPPyPPPy..',
    '...PPP.PPP...',
    '...PPp.pPP...',
    '..ZZZZ.ZZZZ..',
    '..zzzz.zzzz..',
  ];
  return imgFromRowsLocal(rows, {
    C: 4,
    c: 0,
    h: X.hairAuburn,
    S: X.skinL,
    s: X.skinLs,
    E: blink ? X.skinLs : 0,
    M: mouthOpen ? 0 : X.skinLs,
    Y: 14,
    y: 6,
    P: 1,
    p: 0,
    Z: 12,
    z: 4,
  });
}

function imgFromRowsLocal(rows: string[], key: Record<string, number>): Img {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const img = makeImg(w, h, Math.floor(w / 2), h - 1);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ') continue;
      const c = key[ch];
      img.data[y * w + x] = c ?? TRANSPARENT;
    }
  return img;
}

/**
 * The parser's built-in generic nouns, re-declared locally in each office-floor room
 * so they keep their canonical ids even if another room's hotspot hijacks the word
 * in the global vocabulary. (Room hotspot nouns still take precedence locally.)
 */
export const BASE_NOUNS: Record<string, string[]> = {
  floor: ['floor', 'ground', 'carpet'],
  wall: ['wall', 'walls'],
  ceiling: ['ceiling', 'roof'],
  door: ['door', 'doors', 'doorway'],
  window: ['window', 'windows'],
  light: ['light', 'lights', 'lamp', 'lighting'],
  self: ['me', 'myself', 'self', 'dominic', 'dom'],
};

/** The parser's generic "computer" vocabulary, for rooms that actually have computers. */
export const COMPUTER_NOUNS: Record<string, string[]> = {
  computer: ['computer', 'pc', 'workstation', 'terminal', 'machine', 'monitor', 'screen', 'display', 'computers'],
};

/** Local copies of item vocabularies (same canonical ids), immune to global noun hijacking. */
export function itemNouns(ids: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of ids) {
    const it = ITEMS.find((i) => i.id === id);
    if (it) out[id] = it.nouns;
  }
  return out;
}
