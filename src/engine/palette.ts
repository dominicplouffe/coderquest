import { EXT_RGB } from './palette-ext';

// The classic 16-color EGA palette, plus ordered-dither "fills" that let us
// paint the in-between shades Sierra artists faked with checkerboards.

export const PALETTE: [number, number, number][] = [
  [0x00, 0x00, 0x00], // 0 black
  [0x00, 0x00, 0xaa], // 1 blue
  [0x00, 0xaa, 0x00], // 2 green
  [0x00, 0xaa, 0xaa], // 3 cyan
  [0xaa, 0x00, 0x00], // 4 red
  [0xaa, 0x00, 0xaa], // 5 magenta
  [0xaa, 0x55, 0x00], // 6 brown
  [0xaa, 0xaa, 0xaa], // 7 light gray
  [0x55, 0x55, 0x55], // 8 dark gray
  [0x55, 0x55, 0xff], // 9 light blue
  [0x55, 0xff, 0x55], // 10 light green
  [0x55, 0xff, 0xff], // 11 light cyan
  [0xff, 0x55, 0x55], // 12 light red
  [0xff, 0x55, 0xff], // 13 light magenta
  [0xff, 0xff, 0x55], // 14 yellow
  [0xff, 0xff, 0xff], // 15 white
];

export const C = {
  black: 0,
  blue: 1,
  green: 2,
  cyan: 3,
  red: 4,
  magenta: 5,
  brown: 6,
  lgray: 7,
  dgray: 8,
  lblue: 9,
  lgreen: 10,
  lcyan: 11,
  lred: 12,
  lmagenta: 13,
  yellow: 14,
  white: 15,
} as const;

/** Full palette: 16 EGA colors followed by the extended skin/hair tones. */
export const ALL_RGB: [number, number, number][] = [...PALETTE, ...EXT_RGB];

/** Packed RGBA (little-endian ABGR) for fast Uint32 writes. Padded to 256. */
export const RGBA32 = new Uint32Array(256);
ALL_RGB.forEach(([r, g, b], i) => (RGBA32[i] = ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0));

/** A two-color ordered pattern. Pixel = mask[(y&3)*4+(x&3)] ? b : a */
export interface Dither {
  a: number;
  b: number;
  m: Uint8Array;
}

export type Fill = number | Dither;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const maskCache = new Map<number, Uint8Array>();
function bayerMask(level: number): Uint8Array {
  let m = maskCache.get(level);
  if (!m) {
    m = new Uint8Array(16);
    for (let i = 0; i < 16; i++) m[i] = BAYER[i] < level ? 1 : 0;
    maskCache.set(level, m);
  }
  return m;
}

/**
 * Ordered dither between colors a and b. level 0 = all a, 16 = all b,
 * 8 = classic 50% checkerboard.
 */
export function dith(a: number, b: number, level = 8): Dither {
  return { a, b, m: bayerMask(Math.max(0, Math.min(16, Math.round(level)))) };
}

const NAMED: Record<string, number[]> = {
  checker: [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
  hline: [1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
  vline: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  diag: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  adiag: [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
  grid: [1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  dots: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  brick: [1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0],
  weave: [1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1],
};

/** Named two-color pattern (checker, hline, vline, diag, adiag, grid, dots, brick, weave). */
export function pat(a: number, b: number, name: keyof typeof NAMED | string): Dither {
  const src = NAMED[name] ?? NAMED.checker;
  return { a, b, m: Uint8Array.from(src) };
}

export function fillAt(f: Fill, x: number, y: number): number {
  if (typeof f === 'number') return f;
  return f.m[((y & 3) << 2) | (x & 3)] ? f.b : f.a;
}

/** Bayer threshold (0..15) at a pixel; useful for custom gradient logic. */
export function bayerAt(x: number, y: number): number {
  return BAYER[((y & 3) << 2) | (x & 3)];
}

/** Darkening map used for night/dim effects. */
export const DARKER = Uint8Array.from([0, 0, 0, 1, 0, 1, 8, 8, 0, 1, 2, 3, 4, 5, 6, 7, 17, 6, 19, 6, 21, 0, 0, 6]);
/** Brightening map. */
export const LIGHTER = Uint8Array.from([8, 9, 10, 11, 12, 13, 14, 15, 7, 11, 14, 15, 13, 15, 15, 15, 15, 16, 16, 18, 18, 20, 6, 12]);
