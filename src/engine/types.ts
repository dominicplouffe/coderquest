import type { Game } from './game';
import type { Command } from './parser';
import type { Surface, Img } from './raster';
import type { Dir } from './actor';

/** A handler for a parsed command. Return false to fall through to defaults. */
export type Handler = (g: Game, c: Command) => void | boolean | Promise<void | boolean>;

/** A response is either a literal string to print, or a handler. */
export type Response = string | Handler;

/** Rectangle [x, y, w, h] or polygon [x0,y0,x1,y1,...] in picture coordinates (0..319, 0..189). */
export type Area = number[];

export interface Hotspot {
  id: string;
  /** extra words that refer to this thing (id is always included) */
  nouns?: string[];
  area: Area;
  /** description for "look" (string or function) */
  look?: string | ((g: Game) => string | void | Promise<void>);
  /** where Dominic stands to interact [x, y] (feet) */
  at?: [number, number];
  /** whether it currently exists */
  when?: (g: Game) => boolean;
}

export interface Exit {
  /** trigger rectangle the player's feet must enter [x,y,w,h] */
  area: Area;
  to: string;
  /** arrival position in the destination [x, y, dir?] */
  at: [number, number, Dir?];
  when?: (g: Game) => boolean;
  /** return a message to block the exit */
  blocked?: (g: Game) => string | void;
  /** direction word(s) that also take this exit ("go north") */
  dir?: string;
}

export interface Zone {
  area: Area;
  enter: (g: Game) => void | Promise<void>;
  when?: (g: Game) => boolean;
}

export interface RoomDef {
  id: string;
  /** human-readable name, used for save-game descriptions */
  title: string;
  music?: string | null;
  /** paint the background picture (called on entry and on g.redraw()) */
  draw(p: Surface, g: Game): void;
  /** walkable polygons/rects (feet positions) */
  walk: Area[] | ((g: Game) => Area[]);
  /** non-walkable holes */
  blocks?: Area[] | ((g: Game) => Area[]);
  /** default arrival point when no exit specifies one */
  start?: [number, number, Dir?];
  hotspots?: Hotspot[];
  exits?: Exit[];
  zones?: Zone[];
  /** local vocabulary: canonical id -> phrases */
  nouns?: Record<string, string[]>;
  /** command patterns: "verb[/prep] [noun] [noun2]" -> response */
  verbs?: Record<string, Response>;
  /** room description for plain "look" */
  look?: string | ((g: Game) => string | void | Promise<void>);
  /** set up NPCs etc. (synchronous) */
  enter?(g: Game, from: string | null): void;
  /** scripted sequence that runs after the room appears */
  afterEnter?(g: Game, from: string | null): void | Promise<void>;
  leave?(g: Game, to: string): void;
  /** per-tick logic (60Hz), only while the world is not frozen */
  tick?(g: Game): void;
  /** per-frame animated drawing on top of the background, behind actors */
  overlay?(g: Game, s: Surface, t: number): void;
  /** per-frame drawing in front of actors */
  front?(g: Game, s: Surface, t: number): void;
  /** raw text hook, for passwords and free-form answers */
  raw?(g: Game, text: string): boolean | void | Promise<boolean | void>;
  /** hide the status bar & disallow input (cutscene-only rooms) */
  cutscene?: boolean;
  /** act number shown nowhere but useful for debug */
  act?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  nouns: string[];
  look: string | ((g: Game) => string);
  icon: () => Img;
  /** handlers that apply anywhere while carried */
  verbs?: Record<string, Response>;
}
