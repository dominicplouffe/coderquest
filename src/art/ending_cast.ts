// Extra people for the ending: the two investors who fly in for Monday's demo.
import { buildPerson, Look } from './humanoid';
import { Actor, Dir, SpriteSet } from '../engine/actor';
import { X } from '../engine/palette-ext';

const LOOKS: Record<string, { name: string; look: Look }> = {
  henderson: {
    name: 'Mr. Henderson',
    look: {
      skin: X.skinL,
      skinShade: X.skinLs,
      hair: 15,
      hairStyle: 'short',
      mustache: 15,
      shirt: 15,
      shirtShade: 7,
      coat: { color: 6, shade: 0 },
      tie: 14,
      collar: 15,
      pants: 6,
      pantsShade: 0,
      shoes: 0,
      build: 'wide',
    },
  },
  whitfield: {
    name: 'Ms. Whitfield',
    look: {
      skin: X.skinD,
      skinShade: X.skinDs,
      hair: 0,
      hairStyle: 'bun',
      shirt: 15,
      shirtShade: 7,
      coat: { color: 0, shade: 8 },
      collar: 15,
      pants: 0,
      pantsShade: 8,
      shoes: 0,
      mouth: 4,
      build: 'thin',
    },
  },
};

const cache = new Map<string, SpriteSet>();

/** Create one of the investors ('henderson' or 'whitfield') as an actor. */
export function investor(id: 'henderson' | 'whitfield', x: number, y: number, dir: Dir = 'down', pose: string | null = null): Actor {
  let set = cache.get(id);
  if (!set) {
    set = buildPerson(LOOKS[id].look);
    cache.set(id, set);
  }
  const a = new Actor(id, LOOKS[id].name, set, x, y, dir);
  a.pose = pose;
  return a;
}
