import { Img } from './raster';
import { Pt, WalkMap } from './walk';

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Anim {
  frames: Img[];
  /** ticks (1/60s) per frame for time-based anims */
  rate?: number;
  loop?: boolean;
}

export type SpriteSet = Record<string, Anim>;

/** Base walking speed in pixels per second at "normal" game speed. */
export const WALK_SPEED_X = 44;
export const WALK_SPEED_Y = 26;

export class Actor {
  id: string;
  name: string;
  x = 160;
  y = 150;
  dir: Dir = 'down';
  set: SpriteSet;
  visible = true;
  /** a forced animation name (e.g. 'sit', 'type'); if missing for dir, falls back */
  pose: string | null = null;
  frame = 0;
  private tickCount = 0;
  private walkAcc = 0;
  path: Pt[] = [];
  moving = false;
  speed = 1;
  /** keyboard-driven walk vector */
  heading: { dx: number; dy: number } | null = null;
  /** ignore walkable mask (scripted NPCs) */
  ghost = false;
  /** override priority baseline; null = use y */
  z: number | null = null;
  /** draw above everything regardless of priority */
  front = false;
  talking = false;
  private talkTick = 0;
  onArrive: ((ok: boolean) => void) | null = null;
  /** optional per-tick behavior */
  behavior: ((a: Actor, t: number) => void) | null = null;
  /** palette remap applied when drawing */
  map: Uint8Array | null = null;
  /** optional custom image provider (overrides animation logic) */
  custom: ((t: number) => Img | null) | null = null;
  /** solid footprint half-width for click-blocking (0 = none) */
  data: Record<string, any> = {};
  stuckTicks = 0;

  constructor(id: string, name: string, set: SpriteSet, x = 160, y = 150, dir: Dir = 'down') {
    this.id = id;
    this.name = name;
    this.set = set;
    this.x = x;
    this.y = y;
    this.dir = dir;
  }

  place(x: number, y: number, dir?: Dir) {
    this.x = x;
    this.y = y;
    if (dir) this.dir = dir;
    this.stop();
  }

  stop() {
    const cb = this.onArrive;
    this.path = [];
    this.moving = false;
    this.heading = null;
    this.onArrive = null;
    this.frame = 0;
    if (cb) cb(false);
  }

  face(dir: Dir) {
    this.dir = dir;
  }

  faceToward(x: number, y: number) {
    const dx = x - this.x,
      dy = y - this.y;
    if (Math.abs(dx) > Math.abs(dy) * 1.2) this.dir = dx < 0 ? 'left' : 'right';
    else this.dir = dy < 0 ? 'up' : 'down';
  }

  setPath(path: Pt[], onArrive?: (ok: boolean) => void) {
    const prev = this.onArrive;
    this.onArrive = null;
    if (prev) prev(false);
    this.path = path.slice();
    this.heading = null;
    this.moving = this.path.length > 0;
    this.onArrive = onArrive ?? null;
    this.stuckTicks = 0;
    if (!this.moving && onArrive) {
      this.onArrive = null;
      onArrive(true);
    }
  }

  private animFor(name: string): Anim | undefined {
    return this.set[`${name}_${this.dir}`] ?? this.set[name];
  }

  currentImg(t: number): Img | null {
    if (this.custom) {
      const c = this.custom(t);
      if (c) return c;
    }
    let anim: Anim | undefined;
    if (this.pose) anim = this.animFor(this.pose);
    if (!anim && this.moving) anim = this.animFor('walk');
    if (!anim && this.talking) anim = this.animFor('talk');
    if (!anim) anim = this.animFor('stand') ?? Object.values(this.set)[0];
    if (!anim || !anim.frames.length) return null;
    let f: number;
    if (this.moving && !this.pose) f = this.frame % anim.frames.length;
    else if (anim.rate) {
      const fr = Math.floor(this.tickCount / anim.rate);
      f = anim.loop === false ? Math.min(fr, anim.frames.length - 1) : fr % anim.frames.length;
    } else f = 0;
    if (this.talking && !this.moving && !this.pose) {
      const talk = this.animFor('talk');
      if (talk) return talk.frames[Math.floor(this.talkTick / 7) % talk.frames.length];
    }
    return anim.frames[f];
  }

  resetAnimClock() {
    this.tickCount = 0;
  }

  update(walk: WalkMap | null, speedMul: number) {
    this.tickCount++;
    if (this.talking) this.talkTick++;
    if (this.behavior) this.behavior(this, this.tickCount);
    const vx = (WALK_SPEED_X * this.speed * speedMul) / 60;
    const vy = (WALK_SPEED_Y * this.speed * speedMul) / 60;

    if (this.path.length) {
      const tgt = this.path[0];
      const dx = tgt.x - this.x,
        dy = tgt.y - this.y;
      const len = Math.sqrt((dx / vx) ** 2 + (dy / vy) ** 2);
      // choose facing with hysteresis
      const hx = Math.abs(dx) / vx,
        hy = Math.abs(dy) / vy;
      if (hx > hy * 1.15) this.dir = dx < 0 ? 'left' : 'right';
      else if (hy > hx * 1.15) this.dir = dy < 0 ? 'up' : 'down';
      if (len <= 1) {
        this.advanceWalk(Math.abs(dx), Math.abs(dy));
        this.x = tgt.x;
        this.y = tgt.y;
        this.path.shift();
        if (!this.path.length) {
          this.moving = false;
          this.frame = 0;
          const cb = this.onArrive;
          this.onArrive = null;
          if (cb) cb(true);
        }
      } else {
        const sx = dx / len,
          sy = dy / len;
        this.x += sx;
        this.y += sy;
        this.moving = true;
        this.advanceWalk(Math.abs(sx), Math.abs(sy));
      }
    } else if (this.heading) {
      const { dx, dy } = this.heading;
      const nx = this.x + dx * vx,
        ny = this.y + dy * vy;
      const can = (x: number, y: number) => this.ghost || !walk || walk.ok(x, y);
      if (dx && dy === 0) this.dir = dx < 0 ? 'left' : 'right';
      else if (dy && dx === 0) this.dir = dy < 0 ? 'up' : 'down';
      else if (dx && dy) this.dir = dx < 0 ? 'left' : 'right';
      if (can(nx, ny)) {
        this.x = nx;
        this.y = ny;
        this.moving = true;
        this.advanceWalk(Math.abs(dx * vx), Math.abs(dy * vy));
      } else if (dx && dy && can(nx, this.y)) {
        this.x = nx;
        this.moving = true;
        this.advanceWalk(Math.abs(dx * vx), 0);
      } else if (dx && dy && can(this.x, ny)) {
        this.y = ny;
        this.moving = true;
        this.advanceWalk(0, Math.abs(dy * vy));
      } else {
        this.heading = null;
        this.moving = false;
        this.frame = 0;
      }
    }
  }

  private advanceWalk(ax: number, ay: number) {
    const horiz = this.dir === 'left' || this.dir === 'right';
    this.walkAcc += horiz ? ax : ay * 1.4;
    const stride = horiz ? 4 : 4;
    while (this.walkAcc >= stride) {
      this.walkAcc -= stride;
      this.frame++;
    }
  }
}
