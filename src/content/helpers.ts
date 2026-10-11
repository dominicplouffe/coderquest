// Small helpers shared by room scripts.
import { Actor, Dir } from '../engine/actor';
import { person, NAMES } from '../art/cast';
import type { Game } from '../engine/game';

/** Create a cast member actor. pose: e.g. 'sit', 'type', 'cheer' (or null to stand). */
export function npc(id: string, x: number, y: number, dir: Dir = 'down', pose: string | null = null): Actor {
  const a = new Actor(id, NAMES[id] ?? id, person(id), x, y, dir);
  a.pose = pose;
  return a;
}

/** Add a cast member to the current room (replacing any existing one with that id). */
export function addNpc(g: Game, id: string, x: number, y: number, dir: Dir = 'down', pose: string | null = null): Actor {
  g.remove(id);
  return g.add(npc(id, x, y, dir, pose));
}

/** Give an item to the player with a message (no-op if already held). */
export async function pickUp(g: Game, item: string, text: string) {
  g.addItem(item);
  await g.pose(null, 'reach', 350);
  await g.say(text);
}

/** Have an NPC face the player. */
export function faceEachOther(g: Game, a: Actor) {
  a.faceToward(g.player.x, g.player.y);
  g.player.faceToward(a.x, a.y);
}

/** Simple idle behavior: occasionally glance around. */
export function fidget(dirs: Dir[], every = 240): (a: Actor, t: number) => void {
  return (a, t) => {
    if (a.moving || a.talking || a.pose) return;
    if (t % every === 0) a.dir = dirs[Math.floor(Math.random() * dirs.length)];
  };
}

/** Run an NPC conversation: alternating lines [speaker, text]. 'me' = Dominic. */
export async function convo(g: Game, lines: [string, string][]) {
  for (const [who, text] of lines) {
    if (who === 'me' || who === 'dominic') await g.talk(g.player, text);
    else if (who === 'narrator') await g.say(text);
    else {
      const a = g.actor(who);
      if (a) await g.talk(a, text);
      else await g.say(text, { title: NAMES[who] ?? who });
    }
  }
}
