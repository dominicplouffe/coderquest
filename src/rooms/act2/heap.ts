// The Heap: where unreferenced objects go to wait for collection. The Garbage
// Collector patrols the junk piles, and anything nobody references gets swept.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Actor } from '../../engine/actor';
import { Surface, rng } from '../../engine/raster';
import { bayerAt } from '../../engine/palette';
import { starfield } from '../../art/lib';
import { neonGrid, gridPulse, driftBits, twinkle, microOutlined, CYBER_VERBS, cyberRaw } from '../../art/cyber_c_kit';
import { junkPile, junkItem } from '../../art/cyber_c_junk';
import { gcImg, GcPose } from '../../art/creatures_c';
import { award } from '../../content/points';

const HZ = 98;
let grid: Uint8Array | null = null;

// ------------------------------------------------------------------ the Garbage Collector's brain

type GcState = 'patrol' | 'alert' | 'chase' | 'scan' | 'eat' | 'still';
const gc = {
  state: 'patrol' as GcState,
  dir: -1 as -1 | 1,
  roll: 0, // distance rolled (for the tread animation)
  eye: 0,
  arm: 'rest' as 'rest' | 'reach',
  claw: false,
  lid: 0,
  ticks: 0, // ticks spent in the room
  chaseTicks: 0,
  beam: 0, // scan beam timer
  bubble: '' as string,
  bubbleT: 0,
};

function gcActor(g: Game) {
  return g.actor('gc');
}

function makeGc(x: number, y: number): Actor {
  const a = new Actor('gc', 'Garbage Collector', { stand: { frames: [] } }, x, y, 'left');
  a.ghost = true;
  a.data.gap = 30;
  a.custom = (t) => {
    const P: GcPose = {
      tread: Math.floor(gc.roll / 2) % 3,
      eye: gc.eye,
      arm: gc.arm,
      clawOpen: gc.claw,
      lid: gc.lid,
      alarm: gc.state === 'chase' || gc.state === 'alert' || gc.state === 'eat',
      bulb: ((t >> (gc.state === 'chase' ? 3 : 5)) & 1) === 0,
    };
    return gcImg(P, gc.dir < 0);
  };
  return a;
}

function say(g: Game, text: string, ticks = 110) {
  gc.bubble = text;
  gc.bubbleT = ticks;
  void g;
}

/** Roll the GC to a point (scripted). */
async function gcRoll(g: Game, x: number, y: number, speed = 0.7) {
  const a = gcActor(g);
  if (!a) return;
  gc.dir = x < a.x ? -1 : 1;
  const steps = Math.ceil(Math.hypot(x - a.x, y - a.y) / speed);
  const sx = (x - a.x) / Math.max(1, steps),
    sy = (y - a.y) / Math.max(1, steps);
  for (let i = 0; i < steps; i++) {
    a.x += sx;
    a.y += sy;
    gc.roll += Math.abs(sx) + Math.abs(sy);
    await g.wait(16);
  }
}

/** The badge scan: the GC finds a reference and stands down. Awards gc_badge. */
async function gcScan(g: Game) {
  const a = gcActor(g);
  const p = g.player;
  gc.state = 'scan';
  gc.arm = 'rest';
  gc.claw = false;
  if (a) {
    const side = p.x < a.x ? 1 : -1;
    const tx = Math.max(30, Math.min(290, p.x + side * 34));
    await gcRoll(g, tx, Math.max(134, Math.min(184, p.y)), 0.9);
    gc.dir = p.x < a.x ? -1 : 1;
  }
  p.faceToward(a?.x ?? p.x, a?.y ?? p.y);
  gc.beam = 70;
  g.sfx('beep');
  await g.wait(1200);
  g.sfx('points');
  await g.say('BEEP. SCANNING... REFERENCE FOUND:\n\n"DOMINIC - SENIOR SOFTWARE ENGINEER"\n\nOBJECT IS REACHABLE. CARRY ON, CITIZEN.', { title: 'Garbage Collector' });
  award(g, 'gc_badge');
  gc.state = 'patrol';
  gc.chaseTicks = 0;
  say(g, 'HAVE A NICE DAY', 120);
}

/** Caught! */
async function gcCollect(g: Game) {
  const a = gcActor(g);
  const p = g.player;
  gc.state = 'eat';
  p.stop();
  gc.arm = 'reach';
  gc.claw = true;
  say(g, 'COLLECTING...', 200);
  await g.wait(350);
  gc.claw = false;
  g.sfx('clink');
  await g.wait(250);
  // up and in
  const lift = async () => {
    for (let i = 0; i < 10; i++) {
      gc.lid = i;
      await g.wait(30);
    }
  };
  await lift();
  if (a) {
    for (let i = 0; i < 16; i++) {
      p.x += (a.x - p.x) * 0.25;
      p.y -= 1.5;
      await g.wait(30);
    }
  }
  p.visible = false;
  g.sfx('crash');
  g.shake(500);
  for (let i = 9; i >= 0; i--) {
    gc.lid = i;
    await g.wait(25);
  }
  say(g, 'MEMORY FREED', 200);
  await g.wait(700);
  await g.die("The Garbage Collector's claw closes around you, and with a businesslike CLANK you are swept into the can.\n\nNothing pointed to you, so you have been garbage collected. Somewhere, a heap graph dips by exactly one senior engineer. Next time, bring something with your name on it.", { title: 'Memory Freed' });
}

function tick(g: Game) {
  const a = gcActor(g);
  if (!a) return;
  const p = g.player;
  gc.ticks++;
  if (gc.bubbleT > 0) gc.bubbleT--;
  if (gc.beam > 0) gc.beam--;
  const worn = !!g.flag('badge_worn');
  switch (gc.state) {
    case 'patrol': {
      const sp = 0.35;
      a.x += gc.dir * sp;
      gc.roll += sp;
      if (a.x < 140) gc.dir = 1;
      if (a.x > 250) gc.dir = -1;
      a.y += (150 - a.y) * 0.02;
      gc.eye = Math.sin(gc.ticks / 25) * 5;
      gc.arm = 'rest';
      gc.claw = false;
      if (!worn && gc.ticks > 45 && p.visible && g.busy === 0) {
        gc.state = 'alert';
        g.script(async () => {
          gc.dir = p.x < a.x ? -1 : 1;
          gc.eye = gc.dir * 5;
          g.sfx('alarm');
          say(g, 'UNREFERENCED OBJECT DETECTED', 150);
          await g.wait(400);
          await g.say("The Garbage Collector stops dead. Its red eye swivels toward you and its lid rattles.\n\n\"UNREFERENCED OBJECT DETECTED. NO POINTERS FOUND. INITIATING COLLECTION.\"\n\nIt begins to trundle your way.", { title: 'Garbage Collector' });
          if (gc.state === 'alert') {
            gc.state = 'chase';
            gc.chaseTicks = 0;
          }
        });
      }
      break;
    }
    case 'chase': {
      if (worn) {
        gc.state = 'still';
        g.script(async () => {
          await gcScan(g);
        });
        break;
      }
      gc.chaseTicks++;
      gc.arm = 'reach';
      gc.claw = ((gc.chaseTicks >> 4) & 1) === 0;
      gc.dir = p.x < a.x ? -1 : 1;
      gc.eye = gc.dir * 5;
      // aim so the claw (about 22px in front) reaches Dominic
      const tx = p.x - gc.dir * 20;
      const dx = tx - a.x,
        dy = p.y - a.y;
      // slow but relentless; speeds up a little the longer it chases
      const sp = 0.38 + Math.min(0.17, gc.chaseTicks / 3000);
      const d = Math.hypot(dx, dy * 1.5);
      if (d > 1) {
        a.x += (dx / d) * sp;
        a.y += ((dy * 1.5) / d) * sp * 0.6;
        gc.roll += sp;
      }
      a.y = Math.max(130, Math.min(186, a.y));
      const dist = Math.abs(p.x - a.x);
      if (gc.bubbleT <= 0) {
        if (dist > 110) say(g, 'REF COUNT: 0', 90);
        else if (dist > 60) say(g, 'MARKING...', 90);
        else say(g, 'SWEEPING...', 90);
      }
      if (dist < 24 && Math.abs(dy) < 7 && p.visible && !g.dying) {
        gc.state = 'eat';
        g.script(async () => {
          await gcCollect(g);
        });
      }
      break;
    }
    case 'still':
      // badge already worn on arrival: roll over and check it
      gc.eye = Math.sin(gc.ticks / 25) * 5;
      if (gc.ticks > 30 && g.busy === 0 && !g.scored('gc_badge')) {
        gc.state = 'scan';
        g.script(async () => {
          await g.say('The Garbage Collector halts mid-sweep. Its red eye swivels toward you, and it trundles over with a squeak of treads.');
          await gcScan(g);
        });
      } else if (g.scored('gc_badge')) gc.state = 'patrol';
      break;
    case 'scan':
    case 'alert':
    case 'eat':
      break;
  }
}

// ------------------------------------------------------------------ picture

function memoryBar(p: Surface) {
  p.rect(8, 3, 304, 7, 0);
  p.frame(8, 3, 304, 7, 8);
  const r = rng(12);
  let x = 9;
  while (x < 311) {
    const w = 2 + Math.floor(r() * 14);
    const k = r();
    const c = k < 0.62 ? 4 : k < 0.8 ? 12 : k < 0.9 ? 5 : 0;
    p.rect(x, 4, Math.min(w, 311 - x), 5, c);
    if (c !== 0) p.hline(x, Math.min(x + w, 311) - 1, 4, c === 4 ? 12 : c === 12 ? 15 : 13);
    x += w + 1;
  }
  p.micro(8, 12, '0X0000', 8);
  p.micro(288, 12, '0XFFFF', 8);
  p.micro(126, 12, 'HEAP: 98% USED', 12);
}

function farJunk(p: Surface) {
  const r = rng(5);
  // a toxic magenta haze behind the junk skyline
  p.gradV(0, 44, 320, HZ - 44, [0, 0, 1, 5]);
  // a giant hourglass cursor, half buried (waiting forever)
  p.poly([148, 36, 180, 36, 164, 58], 1);
  p.poly([164, 58, 182, 84, 146, 84], 1);
  p.rect(142, 32, 44, 4, 8);
  p.hline(142, 185, 32, 7);
  p.lines([148, 36, 164, 58, 180, 36], 9);
  p.lines([146, 84, 164, 58, 182, 84], 9);
  p.line(152, 38, 160, 50, 11);
  p.poly([156, 76, 172, 76, 178, 84, 150, 84], 6);
  p.vline(164, 60, 75, 6);
  p.plot(164, 70, 14);
  // a giant tilted floppy
  p.poly([228, 52, 260, 58, 254, 92, 222, 86], 0);
  p.lines([228, 52, 260, 58, 254, 92], 8);
  p.poly([235, 55, 250, 58, 248, 68, 233, 65], 8);
  // the junk skyline: black silhouettes with the odd lit fragment
  let x = -6;
  while (x < 326) {
    const w = 5 + Math.floor(r() * 16);
    const hgt = 6 + Math.floor(r() * 22) + (x < 110 || x > 210 ? 8 : 0);
    if (r() < 0.25) p.poly([x, HZ, x + w / 2, HZ - hgt - 6, x + w, HZ], 0);
    else p.rect(x, HZ - hgt, w, hgt, 0);
    if (r() < 0.5) p.plot(x + Math.floor(r() * w), HZ - Math.floor(r() * hgt), [12, 14, 11, 13, 10][Math.floor(r() * 5)]);
    x += w - 2;
  }
}

function road(p: Surface) {
  // the data road from the Boot Sector peters out in the junk
  const r = rng(8);
  for (let x = 0; x < 78; x++) {
    const end = 70 + Math.round(Math.sin(x) * 2);
    for (let y = 159; y <= 170; y++) {
      if (x > end - (y & 3) * 2) continue;
      const edge = y === 159 || y === 170;
      p.plot(x, y, edge ? 11 : y === 164 && x % 12 < 6 ? 3 : 1);
    }
  }
  // junk spilling across the end of the road
  for (let i = 0; i < 5; i++) junkItem(p, 62 + i * 5, 157 + (i % 3) * 3, 7, 5, rng(100 + i), [0, 12, 3, 12, 5][i]);
  void r;
}

const JAR = [
  '..LLLLLLL..',
  '..lllllll..',
  '...O###O...',
  '.OO#####OO.',
  'O#W#######O',
  'O#W#####w#O',
  'O#W#######O',
  'O#WSSSSSS#O',
  'O#WSbbbbS#O',
  'O##SrrrSS#O',
  'O#W#######O',
  'O#########O',
  'O#.#.#.#.#O',
  '.OOOOOOOOO.',
];
const JAR_KEY: Record<string, number> = { L: 7, l: 8, O: 11, '#': 1, W: 15, w: 15, S: 15, b: 1, r: 12, '.': -1 };

function jar(p: Surface) {
  const x = 95,
    y = 100;
  // a faint cyan glow on the junk behind it
  for (let yy = -3; yy < 17; yy++)
    for (let xx = -4; xx < 15; xx++) {
      const d = Math.hypot((xx - 5) / 9, (yy - 7) / 10);
      if (d < 1 && bayerAt(x + xx, y + yy) < (1 - d) * 7) p.plot(x + xx, y + yy, 3);
    }
  JAR.forEach((row, yy) =>
    [...row].forEach((ch, xx) => {
      const c = JAR_KEY[ch];
      if (c === undefined || c < 0) return;
      if (ch === '#' && bayerAt(x + xx, y + yy) < 3) p.plot(x + xx, y + yy, 3);
      else p.plot(x + xx, y + yy, c);
    }),
  );
}

function paint(p: Surface, g: Game) {
  p.rect(0, 0, 320, HZ, 0);
  starfield(p, 0, 16, 320, HZ - 40, 222, 0.006);
  memoryBar(p);
  farJunk(p);
  grid = neonGrid(p, { horizon: HZ, bottom: 190, spacing: 40, colors: [1, 1, 5, 5, 5, 5], haze: 6, depth: 2.6 });
  p.hline(0, 319, HZ, 13);
  // floor litter: little lost bits and bytes
  const r = rng(77);
  for (let i = 0; i < 36; i++) {
    const x = Math.floor(r() * 320),
      y = HZ + 6 + Math.floor(r() * 86);
    const d = (y - HZ) / 92;
    const c = [8, 8, 7, 13, 9][Math.floor(r() * 5)];
    p.rect(x, y, 1 + Math.round(d * 2), 1, c);
  }
  road(p);
  // distant pile at the horizon
  junkPile(p, 168, HZ + 2, 34, 12, 41, { n: 10, scale: 0.6 });
  // back-left mountain of junk
  p.at(124, () => junkPile(p, 52, 124, 58, 66, 11));
  // back-right mountain, with the DEPRECATED sign
  p.at(122, () => {
    junkPile(p, 272, 122, 58, 74, 23);
    p.line(236, 60, 244, 86, 8);
    p.line(237, 60, 245, 86, 7);
    p.poly([214, 50, 258, 44, 260, 56, 216, 62], 4);
    p.lines([214, 50, 258, 44, 260, 56, 216, 62, 214, 50], 12);
    for (const [i, ch] of [...'DEPRECATED'].entries()) p.micro(219 + i * 4, 52 - Math.round(i * 0.55), ch, 15);
  });
  // the little pile with the Unit Test Jar
  p.at(133, () => {
    junkPile(p, 100, 133, 24, 20, 31, { n: 12, scale: 0.8, dull: 0.8 });
    junkItem(p, 88, 112, 10, 6, rng(3), 9);
    if (!g.flag('jar_taken')) jar(p);
  });
  // foreground clutter (in front of everything)
  p.at(190, () => {
    junkPile(p, 4, 192, 36, 20, 51, { fill: 0, rim: 8, dull: 0.8 });
    junkPile(p, 318, 192, 44, 36, 61, { fill: 0, rim: 8, dull: 0.7 });
    junkItem(p, 286, 168, 14, 12, rng(9), 4);
  });
  // exit sign back to the Boot Sector
  p.at(150, () => {
    p.rect(24, 136, 2, 14, 1);
    p.vline(25, 136, 149, 9);
    p.poly([12, 126, 40, 126, 40, 136, 12, 136, 7, 131], 0);
    p.lines([12, 126, 40, 126, 40, 136, 12, 136, 7, 131, 12, 126], 11);
    p.micro(17, 129, 'BOOT', 14);
  });
}

// ------------------------------------------------------------------ overlay

function overlay(g: Game, s: Surface, t: number) {
  gridPulse(s, grid, t, HZ, 190, 200, 13, 15);
  twinkle(s, t, 0, 16, 320, 40, 13, 8);
  // allocations flickering in the memory bar
  const r = rng(Math.floor(t / 20));
  for (let i = 0; i < 4; i++) {
    const x = 9 + Math.floor(r() * 296);
    s.rect(x, 4, 2 + Math.floor(r() * 4), 5, r() < 0.5 ? 0 : 15);
  }
  // fresh garbage dropping onto the far piles
  const k = t % 260;
  if (k < 40) {
    const fx = 60 + ((Math.floor(t / 260) * 97) % 200);
    const fy = 20 + k * 1.6;
    s.rect(fx, Math.round(fy), 4, 3, [12, 14, 13, 11][Math.floor(t / 260) % 4]);
    s.plot(fx, Math.round(fy), 15);
  } else if (k < 52) {
    const fx = 60 + ((Math.floor(t / 260) * 97) % 200);
    for (let i = 0; i < 5; i++) s.plot(fx - 3 + i * 2, 84 - ((k - 40) >> 2) - (i & 1), 7);
  }
  // the jar glints
  if (!g.flag('jar_taken')) {
    const j = t % 150;
    if (j < 16) s.plot(97 + (j >> 2), 105 + (j >> 1), 15);
    if (j > 40 && j < 52) {
      s.plot(93, 99, 15);
      s.plot(92, 99, 11);
      s.plot(94, 99, 11);
      s.plot(93, 98, 11);
      s.plot(93, 100, 11);
    }
  }
  driftBits(s, t, 4, 40, 100, 40, 61, 5, [5, 8, 13]);
  driftBits(s, t, 220, 30, 100, 40, 62, 5, [5, 8, 13]);
  // the GC's shadow
  const a = gcActor(g);
  if (a) {
    s.ellipse(Math.round(a.x), Math.round(a.y), 15, 2, 0);
  }
}

function front(g: Game, s: Surface, t: number) {
  const a = gcActor(g);
  if (!a) return;
  // scan beam
  if (gc.beam > 0) {
    const ex = Math.round(a.x + gc.dir * 2),
      ey = Math.round(a.y - 39);
    const p = g.player;
    const sweep = Math.round(p.y - 34 + ((70 - gc.beam) / 70) * 34);
    for (let i = -3; i <= 3; i++) {
      const tx = Math.round(p.x + i * 2);
      if ((i + (t >> 2)) & 1) s.line(ex, ey, tx, sweep, gc.beam > 30 ? 12 : 10);
    }
    s.hline(Math.round(p.x - 7), Math.round(p.x + 7), sweep, 15);
  }
  // speech bubble text above the robot
  if (gc.bubbleT > 0 && gc.bubble) {
    const w = gc.bubble.length * 4;
    const x = Math.max(2, Math.min(318 - w, Math.round(a.x - w / 2)));
    const y = Math.round(a.y - 64);
    if (gc.state !== 'chase' || ((t >> 3) & 3) !== 0) microOutlined(s, x, y, gc.bubble, gc.state === 'chase' || gc.state === 'eat' || gc.state === 'alert' ? 12 : 10);
  }
}

// ------------------------------------------------------------------ room

const FINDS = [
  'You rummage through the junk and find a browser toolbar from 2003. It still wants to be your default search engine.',
  'You find an unused variable named temp2. Nobody remembers what temp1 was for, either.',
  'You find a thousand abandoned TODOs, all of them in a pile labelled "LATER".',
  'You find a memory leak. It is still leaking. You put it back, carefully.',
  'You find a semicolon someone dropped in 1994. A whole program somewhere is still waiting for it.',
  'You find a perfectly good Singleton. There are three of them.',
  'You find an "Under Construction" animated GIF of a little man digging. He has been digging since 1997.',
  'You find a deprecated icon of a floppy disk. Ironic, really: it is still the save icon everywhere.',
];

export const heap: RoomDef = {
  id: 'heap',
  title: 'The Heap',
  act: 2,
  music: 'cyber',
  start: [18, 165, 'right'],
  draw: paint,
  walk: [[0, 128, 320, 61]],
  blocks: [
    [76, 124, 48, 11],
    [0, 178, 34, 12],
    [282, 166, 38, 24],
    [0, 126, 6, 2],
    [22, 146, 7, 5],
  ],
  look: (g) =>
    `The Heap: a wasteland of discarded objects. Mountains of orphaned arrays, abandoned strings, deprecated icons and broken floppies stretch to the horizon, under a sky gauge that reads HEAP: 98% USED.\n\n${
      g.flag('badge_worn')
        ? 'The Garbage Collector trundles between the piles, scanning everything with its red eye. Thanks to your badge, it leaves you alone.'
        : 'A large robot made from a trash can trundles between the piles, scanning everything with a red eye. It looks like it collects anything that nobody wants.'
    }${g.flag('jar_taken') ? '' : ' On a small pile near you, something glassy glints.'}`,
  hotspots: [
    { id: 'floor', nouns: ['floor', 'ground', 'grid', 'magenta grid'], area: [0, 99, 320, 91], look: 'A magenta grid, littered with stray bits and bytes that fell off the piles. Nobody is going to come back for them.' },
    { id: 'sky', nouns: ['sky', 'stars', 'space'], area: [0, 16, 320, 24], look: 'A black sky, faintly lit by the glow of 64 kilobytes of overcommitted memory.' },
    {
      id: 'gauge',
      nouns: ['gauge', 'bar', 'memory bar', 'memory map', 'meter', 'usage', 'heap gauge', 'graph', 'heap bar', '0x0000', '0xffff', 'addresses', 'memory', '98', '98 used', 'heap 98 used'],
      area: [6, 1, 308, 17],
      look: 'A memory map stretches across the sky from 0X0000 to 0XFFFF: red where memory is allocated, black where it is free, and a fine confetti of fragments everywhere else. HEAP: 98% USED. Somebody should really look into that. Somebody, in fact, is.',
    },
    { id: 'hourglass', nouns: ['hourglass', 'giant hourglass', 'cursor', 'wait cursor', 'sand'], area: [142, 36, 44, 50], look: 'A colossal hourglass cursor, half-buried in the far junk. It has been waiting for a process to finish since 1993. The process is never going to finish.' },
    { id: 'piles', nouns: ['junk', 'piles', 'pile', 'garbage', 'trash', 'objects', 'object', 'mountains', 'heap', 'debris', 'rubbish', 'arrays', 'strings', 'icons', 'array', 'string', 'icon', 'junk pile', 'junk piles', 'stuff', 'things', 'orphans', 'orphaned objects'], area: [0, 40, 320, 92], look: 'Heaps of discarded objects: arrays nobody indexes, strings nobody reads, icons from operating systems nobody runs. Each one was important to someone, once. Then the last pointer to it went out of scope.' },
    { id: 'floppy', nouns: ['floppy', 'broken floppy', 'giant floppy', 'disk', 'disks', 'floppies'], area: [224, 52, 40, 40], look: 'A giant floppy disk juts out of the far junk at an angle, cracked clean through. Whatever was on it is now a cautionary tale about backups.' },
    {
      id: 'sign',
      nouns: ['sign', 'deprecated sign', 'deprecated', 'red sign'],
      area: [212, 42, 50, 22],
      look: 'A red sign stuck in the junk: DEPRECATED. A smaller sign nailed underneath it reads: "THIS SIGN IS DEPRECATED. PLEASE USE THE NEW SIGN." There is no new sign.',
    },
    { id: 'computer', nouns: ['crt', 'old monitor', 'monitor', 'screen', 'tv', 'computer'], area: [282, 164, 20, 18], look: 'A cracked old CRT monitor. Its screen still glows faintly with the ghost of a screensaver: flying toasters, burned in forever.' },
    { id: 'road', nouns: ['road', 'path', 'data path'], area: [0, 156, 92, 16], look: 'The glowing road from the Boot Sector runs a little way into the Heap, then gives up, buried under junk.' },
    { id: 'boot_sign', nouns: ['boot sign', 'exit sign', 'arrow', 'neon sign'], area: [6, 124, 36, 26], look: 'A neon sign pointing west: "<- BOOT". Back the way you came.' },
    { id: 'jarpile', nouns: ['small pile', 'little pile', 'jar pile', 'toolbar'], area: [76, 112, 48, 22], look: (g) => (g.flag('jar_taken') ? 'A little pile of junk, topped by a browser toolbar. There is a jar-shaped gap where the jar used to be.' : 'A small pile of junk, topped by an old browser toolbar. Wedged on top of it is a glass jar.') },
    { id: 'jar', nouns: ['jar', 'glass jar', 'unit test', 'test jar', 'unit test jar', 'glass', 'test', 'glint', 'glinting', 'glinting thing', 'glassy', 'glassy thing', 'glass thing', 'something glassy', 'something glinting', 'shiny thing', 'something shiny', 'shiny', 'something'], area: [93, 98, 15, 18], at: [112, 137], when: (g) => !g.flag('jar_taken'), look: 'A glass jar with a screw-top lid, labelled TEST in neat handwriting. A Unit Test Jar! Somebody threw it in the Heap to "ship faster." It is completely empty and spotlessly clean, which tells you everything about how often it was used.' },
  ],
  exits: [{ area: [0, 128, 6, 61], to: 'boot', at: [302, 160, 'left'], dir: 'west' }],
  nouns: {
    bits: ['bits', 'bytes', 'byte', 'litter', 'stray bits'],
    gc: ['gc', 'garbage collector', 'collector', 'robot', 'trash can', 'can', 'bin', 'trashcan', 'droid', 'red eye', 'claw', 'lid', 'bot', 'truck', 'treads', 'antenna'],
  },
  raw: (g, text) => cyberRaw(g, text),
  verbs: {
    // ---- the badge (handled here so the Collector can react)
    'wear badge,put badge self,show badge,show badge gc,give badge gc,use badge,use badge gc,show badge self': async (g) => {
      if (!g.has('badge')) return false;
      if (g.flag('badge_worn')) {
        if (!g.scored('gc_badge')) {
          gc.state = 'scan';
          await g.say('You tap your badge pointedly.');
          await gcScan(g);
          return;
        }
        return false;
      }
      g.set('badge_worn');
      gc.state = 'scan';
      await g.pose(null, 'reach', 300);
      await g.say("You clip your badge onto your hoodie: DOMINIC - SENIOR SOFTWARE ENGINEER. Now everyone knows exactly who you are. Including any process that's checking.");
      await gcScan(g);
    },
    // ---- the jar
    'take jar,take test': async (g) => {
      if (g.flag('jar_taken')) return void (await g.say(g.has('jar') ? 'You already have the jar.' : "There's no jar here anymore."));
      if (!(await g.approach('jar'))) return;
      await g.pose(null, 'reach', 400);
      g.set('jar_taken');
      g.addItem('jar');
      award(g, 'take_jar');
      g.redraw();
      await g.say('You work the glass jar free of the junk. It\'s labelled TEST in neat handwriting: a Unit Test Jar, empty and spotless. Somebody threw it out to "ship faster."\n\nYou know exactly how that story ends. You keep it.');
    },
    'open jar': async (g) => {
      if (!g.has('jar')) return false;
      await g.say('You unscrew the lid and peer in. Empty. A trap waiting for something to catch. You screw the lid back on.');
    },
    // ---- searching
    'search piles,search ?,look/in piles,dig piles,dig': async (g, c) => {
      if (c.noun && !['piles', 'jarpile', 'room', 'floor', 'heap'].includes(c.noun)) return false;
      const i = g.inc('heap_search') - 1;
      await g.say(FINDS[i % FINDS.length]);
      if (i === FINDS.length - 1) await g.say("That's about everything worth finding. Everything else here is worth exactly what someone decided: nothing.");
    },
    'take piles,take floppy,take sign,take computer,take hourglass,take jarpile': "You don't need that. Nobody needs that. That's the whole point of the Heap.",
    'eat piles': 'You are not that hungry, and those strings are well past their expiry date.',
    'kick|push piles,climb piles': 'You nudge a pile. It shifts with a sound like a thousand null pointers being dereferenced at once, then settles. Best not.',
    'read sign': 'DEPRECATED. And underneath, smaller: "THIS SIGN IS DEPRECATED. PLEASE USE THE NEW SIGN." There is no new sign.',
    'read boot_sign': 'It says "<- BOOT".',
    // ---- the Garbage Collector
    'look gc': async (g) => {
      await g.say(
        g.flag('badge_worn')
          ? 'The Garbage Collector: a dented steel trash can on treads, with a grabbing claw, a stubby antenna and a single red eye that sweeps back and forth. Having read your badge, it now ignores you completely, like a good colleague.'
          : 'The Garbage Collector: a dented steel trash can on treads, with a grabbing claw, a stubby antenna and a single red eye that sweeps back and forth. It collects anything that nothing else points to. Nothing points to you here.',
      );
    },
    'talk gc,talk': async (g) => {
      const a = gcActor(g);
      if (!a) return false;
      if (!g.flag('badge_worn')) return void (await g.say('"UNREFERENCED OBJECTS DO NOT TALK. UNREFERENCED OBJECTS ARE COLLECTED." Its claw clacks meaningfully.', { title: 'Garbage Collector' }));
      const lines = [
        'REFERENCE COUNT: 1. GREETINGS, DOMINIC.',
        'I ONLY TAKE WHAT NOBODY NEEDS. YOU WOULD BE SURPRISED HOW MUCH THAT IS.',
        'MARK. SWEEP. MARK. SWEEP. IT IS A LIVING.',
        'DO NOT TELL ANYONE, BUT I CANNOT COLLECT CIRCULAR REFERENCES. THEY JUST HOLD EACH OTHER. IT IS QUITE SWEET.',
        'THE HEAP IS 98% FULL. I AM DOING MY BEST.',
      ];
      const i = g.inc('gc_talk') - 1;
      await g.say(lines[i % lines.length], { title: 'Garbage Collector' });
    },
    'attack gc,kick gc,push gc,tap gc,touch gc': async (g) => {
      if (!g.flag('badge_worn')) return void (await g.say("You'd rather not get any closer to that claw than you have to. Which is to say, any closer at all."));
      g.sfx('thud');
      await g.say('You give the Garbage Collector a kick. CLANG. Its eye swivels slowly toward you.\n\n"REFERENCE COUNT DECREMENTED."\n\nYou decide to stop doing that.');
    },
    'open gc,look/in gc': 'You do not want to know what is in there. Actually, you do know: everything nobody wanted. That is precisely why you do not want to look.',
    'give * gc,put * gc,throw|flip * gc': async (g, c) => {
      if (!c.noun || !g.has(c.noun)) return false;
      await g.say(`The Garbage Collector's lid flips open hungrily. You snatch the ${g.items[c.noun]?.name ?? 'thing'} back just in time. It's still referenced (by you), and you'd like to keep it that way.`);
    },
    'enter gc,climb gc': 'Voluntarily getting into the garbage? You have had some rough sprints, but not that rough.',
    'remove badge': async (g) => {
      if (!g.flag('badge_worn')) return false;
      await g.say('Take off your badge? Here? With the Garbage Collector looking for unreferenced objects? Bold. Very bold. No.');
    },
    'ask gc ?,tell gc ?': async (g) => {
      if (!gcActor(g)) return false;
      await g.say(g.flag('badge_worn') ? 'QUERY NOT UNDERSTOOD. I MARK. I SWEEP. I DO NOT CHAT. ...BUT THANK YOU FOR ASKING.' : 'UNREFERENCED OBJECTS DO NOT ASK QUESTIONS. UNREFERENCED OBJECTS ARE COLLECTED.', { title: 'Garbage Collector' });
    },
    'listen ?,listen': 'Creaks and clatters as the piles settle, the squeak of treads, and the occasional distant CLANK of something being collected forever.',
    'smell ?,smell': 'The Heap smells of hot dust, burnt-out capacitors and stale cookies. Browser cookies, mostly.',
    'look floor': 'A magenta grid, littered with stray bits and bytes that fell off the piles. Nobody is going to come back for them.',
    'take floor,take bits': 'You pick up a loose byte. It is 0xFF, which is to say, completely full of itself. You put it back.',
    'eat jar': "It's a glass jar. Even by Heap standards, that would be a bad idea.",
    'look/in jar': async (g) => {
      if (!g.has('jar')) return false;
      await g.say('Empty and spotless. A trap waiting for something to catch.');
    },
    'hide': async (g) => {
      await g.say(g.flag('badge_worn') ? 'There is no need to hide. You are referenced.' : "You crouch behind a pile of old arrays. The Garbage Collector doesn't care where you are. It cares that nothing points to you.");
    },
    ...CYBER_VERBS,
  },
  enter(g, from) {
    // After "Try Again" / a restore, the Collector restarts well away from you and
    // takes a few extra seconds before it notices you, so it can't re-catch you instantly.
    const restoring = from === '__restore';
    const gx = restoring ? (g.player.x < 160 ? 282 : 38) : from === 'boot' ? 230 : 210;
    g.add(makeGc(gx, 150));
    gc.state = 'patrol';
    gc.dir = gx > 160 ? -1 : 1;
    gc.ticks = restoring ? -100 : 0;
    gc.chaseTicks = 0;
    gc.arm = 'rest';
    gc.claw = false;
    gc.lid = 0;
    gc.beam = 0;
    gc.bubbleT = 0;
    // with the badge already on, the Collector comes over to check you shortly after you arrive
    if (g.flag('badge_worn') && !g.scored('gc_badge')) gc.state = 'still';
  },
  afterEnter: async (g) => {
    // (on a restore this is skipped; the 'still' state in tick() covers that case)
    if (gc.state !== 'still' || g.scored('gc_badge')) return;
    gc.state = 'scan';
    await g.wait(400);
    await g.say('The Garbage Collector halts mid-sweep. Its red eye swivels toward you, and it trundles over with a squeak of treads.');
    await gcScan(g);
  },
  tick,
  overlay,
  front,
};
