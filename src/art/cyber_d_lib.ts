// Shared scenery & scripting helpers for the Act II part-2 rooms
// (deadlock, bridge, dragon, core).
import { Surface, microWidth } from '../engine/raster';
import type { Fill } from '../engine/palette';
import type { Game } from '../engine/game';

/** The subset of Surface drawing calls our sprite painters use. */
export interface Painter {
  plot(x: number, y: number, f: Fill): void;
  hline(x0: number, x1: number, y: number, f: Fill): void;
  vline(x: number, y0: number, y1: number, f: Fill): void;
  rect(x: number, y: number, w: number, h: number, f: Fill): void;
  line(x0: number, y0: number, x1: number, y1: number, f: Fill, thick?: number): void;
  micro(x: number, y: number, s: string, f: Fill): number;
}

/** Paints horizontally mirrored into a Surface of width W, but keeps text readable. */
export class MirrorPainter implements Painter {
  constructor(
    public s: Surface,
    public W: number,
  ) {}
  plot(x: number, y: number, f: Fill) {
    this.s.plot(this.W - 1 - x, y, f);
  }
  hline(x0: number, x1: number, y: number, f: Fill) {
    this.s.hline(this.W - 1 - x1, this.W - 1 - x0, y, f);
  }
  vline(x: number, y0: number, y1: number, f: Fill) {
    this.s.vline(this.W - 1 - x, y0, y1, f);
  }
  rect(x: number, y: number, w: number, h: number, f: Fill) {
    this.s.rect(this.W - x - w, y, w, h, f);
  }
  line(x0: number, y0: number, x1: number, y1: number, f: Fill, thick = 1) {
    const o = thick > 1 ? 1 : 0;
    this.s.line(this.W - 1 - x0 - o, y0, this.W - 1 - x1 - o, y1, f, thick);
  }
  micro(x: number, y: number, str: string, f: Fill) {
    const w = microWidth(str);
    return this.s.micro(this.W - 1 - (x + w - 1), y, str, f);
  }
}

/**
 * A calm neon perspective floor: black, sparse radiating lines, a handful of
 * perspective cross-lines that get brighter toward the viewer.
 */
export function neonFloor(
  p: Surface,
  horizon: number,
  bottom: number,
  opts: { near?: number; far?: number; radial?: number; vanish?: number; spacing?: number; glow?: number; rows?: number[] } = {},
) {
  const near = opts.near ?? 5;
  const far = opts.far ?? 1;
  const radial = opts.radial ?? far;
  const vx = opts.vanish ?? 160;
  const sp = opts.spacing ?? 40;
  const H = bottom - horizon;
  p.rect(0, horizon, 320, H, 0);
  for (let i = -16; i <= 16; i++) {
    const xb = vx + i * sp;
    const x0 = vx + (xb - vx) * 0.12;
    p.line(x0, horizon + 1, xb, bottom, radial);
  }
  const rows = opts.rows ?? [0.04, 0.12, 0.25, 0.43, 0.66, 0.94];
  for (const t of rows) {
    const y = Math.round(horizon + H * t);
    p.hline(0, 319, y, t < 0.2 ? far : near);
  }
  p.hline(0, 319, horizon, opts.glow ?? 13);
}

/** Run fn(k) for k in (0,1] over `frames` ticks. */
export async function tween(g: Game, frames: number, fn: (k: number) => void) {
  for (let i = 1; i <= frames; i++) {
    fn(i / frames);
    await g.wait(17);
  }
}

/** Detach the player from whatever script was walking them (without resolving it). */
export function haltPlayer(g: Game) {
  const p = g.player;
  p.onArrive = null;
  p.path = [];
  p.heading = null;
  p.moving = false;
  p.frame = 0;
}
