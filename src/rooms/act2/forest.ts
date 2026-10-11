// The Spaghetti Forest: planted in 1989 by a contractor with a deadline.
// Noodle trees, meatball "global variables", GOTO signs pointing everywhere,
// and a tangle blocking the path north until someone finally refactors it.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, rng } from '../../engine/raster';
import { bayerAt } from '../../engine/palette';
import { neonGrid, gridPulse, twinkle, handoff, CYBER_VERBS, cyberRaw } from '../../art/cyber_c_kit';
import { noodleTree, tangle, meatball, twirl, noodle } from '../../art/cyber_c_pasta';
import { award } from '../../content/points';

const HZ = 104;
let grid: Uint8Array | null = null;
/** refactor animation progress (1 = tangled) */
let tangleK = 1;

// ------------------------------------------------------------------ picture

function distantTower(p: Surface) {
  // the Stack Overflow Tower, visible far to the west through the trees
  const x = 70;
  for (let y = HZ - 6, i = 0; y > -8; y -= 5, i++) {
    const w = 8;
    const lean = Math.round(i * 0.3);
    p.rect(x - w / 2 + lean, y - 4, w, 4, 8);
    p.hline(x - w / 2 + lean, x + w / 2 + lean - 1, y - 4, 0);
    p.plot(x + w / 2 + lean - 1, y - 3, 0);
    if (i % 3 === 0) p.plot(x - 2 + lean, y - 2, 6);
  }
}

function overheadCanopy(p: Surface) {
  const r = rng(404);
  // strands draped across the top of the picture
  for (let i = 0; i < 18; i++) {
    const x0 = -20 + r() * 340;
    const sag = 6 + r() * 16;
    const w = 30 + r() * 60;
    const pts: number[] = [];
    for (let s = 0; s <= 10; s++) {
      const u = s / 10;
      pts.push(x0 + u * w, -2 + Math.sin(u * Math.PI) * sag + Math.sin(u * 9 + i) * 1.2);
    }
    noodle(p, pts, i % 3 ? 6 : 14);
  }
  // hanging vines
  for (let i = 0; i < 16; i++) {
    const x = 6 + r() * 308;
    if (x > 120 && x < 200) continue;
    const len = 10 + r() * 34;
    const pts: number[] = [x, 0];
    for (let s = 1; s <= 8; s++) pts.push(x + Math.sin(s * 1.3 + i) * 1.6, (len * s) / 8);
    noodle(p, pts, i % 2 ? 14 : 6);
    if (r() < 0.3) meatball(p, Math.round(x), Math.round(len) + 2, 2);
  }
}

function gotoSign(p: Surface) {
  // a post with three GOTO 10 boards, all pointing different ways
  const x = 238,
    foot = 134;
  p.at(foot, () => {
    p.rect(x - 1, foot - 46, 3, 46, 6);
    p.vline(x - 1, foot - 46, foot - 1, 14);
    p.hline(x - 3, x + 3, foot - 1, 6);
    const board = (bx: number, by: number, dir: 'l' | 'r' | 'u') => {
      const w = 30,
        h = 9;
      if (dir === 'l') p.poly([bx, by, bx + w, by, bx + w, by + h, bx, by + h, bx - 4, by + h / 2], 6);
      else if (dir === 'r') p.poly([bx, by, bx + w, by, bx + w + 4, by + h / 2, bx + w, by + h, bx, by + h], 6);
      else {
        p.rect(bx, by, w, h, 6);
        p.poly([bx + w / 2 - 4, by, bx + w / 2, by - 4, bx + w / 2 + 4, by], 6);
      }
      p.hline(bx, bx + w - 1, by, 14);
      p.hline(bx, bx + w - 1, by + h, 0);
      p.micro(bx + 2, by + 2, 'GOTO 10', 15);
    };
    board(x - 31, foot - 44, 'l');
    board(x + 1, foot - 34, 'r');
    board(x - 15, foot - 23, 'u');
  });
}

function todoStone(p: Surface, g: Game) {
  const x = 70,
    base = 136;
  p.at(base, () => {
    p.poly([x, base, x + 2, base - 24, x + 9, base - 30, x + 37, base - 30, x + 44, base - 23, x + 46, base], 8);
    p.lines([x, base, x + 2, base - 24, x + 9, base - 30, x + 37, base - 30, x + 44, base - 23], 7);
    p.vline(x + 45, base - 22, base, 0);
    p.speckle(x + 3, base - 27, 40, 26, 0, 0.04, 9);
    p.micro(x + 5, base - 26, 'TODO:', 15);
    p.micro(x + 5, base - 19, 'REFACTOR', 7);
    p.micro(x + 5, base - 12, 'THIS MESS', 7);
    p.micro(x + 5, base - 6, '(1989)', 7);
    if (g.flag('forest_refactored')) {
      p.line(x + 4, base - 24, x + 22, base - 22, 12);
      p.micro(x + 25, base - 26, 'DONE', 10);
    }
    p.hline(x - 2, x + 48, base, 0);
  });
}

function fork(p: Surface) {
  // a giant fork plunged tines-first into the ground, Excalibur-style
  const x = 297,
    base = 180,
    top = base - 72;
  p.at(base, () => {
    for (let y = top; y <= base; y++) {
      const k = y - top;
      const cx = x + (base - y) * 0.12;
      let w: number;
      if (k === 0) w = 3;
      else if (k < 30) w = 6;
      else if (k < 40) w = 6 - ((k - 30) * 3) / 10;
      else if (k < 50) w = 3 + ((k - 40) * 11) / 10;
      else w = 14;
      const x0 = Math.round(cx - w / 2),
        x1 = Math.round(cx + w / 2) - 1;
      if (k < 50) {
        p.hline(x0, x1, y, 7);
        p.plot(x0, y, 15);
        p.plot(x1, y, 8);
        if (k > 2 && k < 28) p.plot(x0 + 1, y, 15);
      } else {
        for (let i = 0; i < 4; i++) {
          const tx = x0 + i * 4;
          p.hline(tx, tx + 1, y, 7);
          p.plot(tx, y, 15);
        }
      }
    }
    // spaghetti wound round the tines, and the dirt it's stuck in
    twirl(p, x - 1, base - 12, 8, 77, 0.45);
    twirl(p, x, base - 6, 9, 78, 0.4);
    p.ellipse(x - 1, base, 11, 2, 6);
    p.hline(x - 10, x + 8, base - 2, 0);
    p.ellipse(x - 1, base + 1, 9, 1, 0);
  });
}

function paint(p: Surface, g: Game) {
  const done = !!g.flag('forest_refactored');
  p.rect(0, 0, 320, 190, 0);
  // faint stars through the canopy
  const r = rng(12);
  for (let i = 0; i < 40; i++) p.plot(Math.floor(r() * 320), 14 + Math.floor(r() * 70), r() < 0.3 ? 7 : 8);
  // ground: a dark grid, sauce-red near the horizon
  for (let y = HZ - 5; y < HZ; y++) for (let x = 0; x < 320; x++) if (bayerAt(x, y) < (y - HZ + 5) * 2) p.plot(x, y, 4);
  grid = neonGrid(p, { horizon: HZ, bottom: 190, spacing: 36, colors: [4, 4, 6, 6, 6, 6], haze: 6, depth: 2.6 });
  p.hline(0, 319, HZ, 12);
  distantTower(p);
  // distant trees (dim)
  noodleTree(p, 112, HZ + 2, 46, 5, { strands: 6, trunk: 2, crown: 16, meatballs: 1, cols: [6, 4] });
  noodleTree(p, 212, HZ + 2, 52, 6, { strands: 6, trunk: 2, crown: 18, meatballs: 1, cols: [6, 4] });
  noodleTree(p, 28, HZ + 2, 40, 7, { strands: 5, trunk: 2, crown: 14, meatballs: 0, cols: [6, 4] });
  noodleTree(p, 300, HZ + 2, 44, 8, { strands: 5, trunk: 2, crown: 16, meatballs: 1, cols: [6, 4] });
  // the north path: a lane of light into the darkness (beyond the tangle)
  for (let y = HZ - 1; y < 132; y++) {
    const d = (y - (HZ - 8)) / 40;
    const hw = 6 + d * 14;
    for (let x = Math.round(160 - hw); x <= Math.round(160 + hw); x++) {
      const edge = Math.abs(x - 160) > hw - 1.2;
      p.plot(x, y, edge ? (done ? 13 : 6) : y < HZ + 2 ? (done ? 5 : 0) : 0);
    }
  }
  if (done) {
    // the way north glows with the Infinite Loop's magenta light
    for (let y = 60; y < HZ; y++) {
      const hw = 5 + (y - 60) * 0.03;
      for (let x = Math.round(160 - hw); x <= Math.round(160 + hw); x++) if (bayerAt(x, y) < (y - 60) / 3) p.plot(x, y, 5);
    }
    p.micro(152, 84, 'LOOP', 13);
    p.vline(160, 74, 80, 13);
    p.line(157, 77, 160, 74, 13);
    p.line(163, 77, 160, 74, 13);
  }
  // mid trees flanking the gap
  noodleTree(p, 104, 120, 88, 21, { strands: 8, trunk: 3, crown: 28, meatballs: 2 });
  noodleTree(p, 220, 118, 92, 22, { strands: 8, trunk: 3, crown: 30, meatballs: 3 });
  // the tangle (or the neat refactored path)
  tangle(p, done ? 0 : tangleK);
  // south path back to the Boot Sector
  for (let y = 132; y < 190; y++) {
    const d = (y - (HZ - 8)) / 40;
    const hw = 6 + d * 14;
    p.hline(Math.round(160 - hw), Math.round(160 + hw), y, 0);
    p.plot(Math.round(160 - hw), y, 6);
    p.plot(Math.round(160 + hw), y, 6);
  }
  // west trail toward the Stack Tower
  for (let x = 0; x < 70; x++) {
    const y0 = 150 + Math.round(Math.sin(x / 14) * 2);
    p.hline(x, x, y0, 6);
    p.hline(x, x, y0 + 12 - Math.round(x / 30), 6);
  }
  overheadCanopy(p);
  todoStone(p, g);
  gotoSign(p);
  // big foreground trees (they hide you when you walk behind their trunks)
  p.at(152, () => noodleTree(p, 34, 152, 152, 31, { strands: 11, trunk: 4, crown: 42, meatballs: 4, thick: true }));
  p.at(150, () => noodleTree(p, 280, 150, 150, 32, { strands: 11, trunk: 4, crown: 42, meatballs: 4, thick: true }));
  fork(p);
}

// ------------------------------------------------------------------ animation

interface Bug {
  x: number;
  y: number;
  ph: number;
  sp: number;
}
const bugs: Bug[] = (() => {
  const r = rng(55);
  const out: Bug[] = [];
  for (let i = 0; i < 9; i++) out.push({ x: 20 + r() * 280, y: 30 + r() * 110, ph: r() * 100, sp: 0.5 + r() });
  return out;
})();

function overlay(g: Game, s: Surface, t: number) {
  gridPulse(s, grid, t, HZ, 190, 220, 14, 15);
  twinkle(s, t, 0, 14, 320, 60, 9, 6);
  // fireflies. Well: bugs. Glowing little bugs.
  for (const b of bugs) {
    const x = Math.round(b.x + Math.sin((t * b.sp) / 60 + b.ph) * 14);
    const y = Math.round(b.y + Math.sin((t * b.sp) / 37 + b.ph * 2) * 6);
    const k = (t + Math.floor(b.ph * 10)) % 120;
    if (k < 70) {
      s.plot(x, y, k < 40 ? 14 : 10);
      if (k > 10 && k < 30) {
        s.plot(x - 1, y, 6);
        s.plot(x + 1, y, 6);
      }
    }
  }
  // the refactored path sparkles faintly
  if (g.flag('forest_refactored')) {
    const k = t % 90;
    if (k < 30) s.plot(160 + Math.round(Math.sin(k / 4) * 6), 118 - k, 15);
  }
}

// ------------------------------------------------------------------ actions

async function refactor(g: Game) {
  if (g.flag('forest_refactored')) {
    await g.say('You already refactored the path. The rest of the forest is still spaghetti, of course, but it was already like that when you got here. Not your sprint.');
    return;
  }
  await g.approach([160, 124]);
  g.player.dir = 'up';
  await g.say('You crack your knuckles. You have untangled worse. You once refactored a 4,000-line function called doEverything().');
  await g.pose(null, 'reach', 300);
  g.sfx('type');
  for (let i = 0; i <= 24; i++) {
    tangleK = 1 - i / 24;
    g.redraw();
    if (i % 6 === 0) g.sfx('type');
    await g.wait(70);
  }
  tangleK = 1;
  g.set('forest_refactored');
  g.redraw();
  g.sfx('fanfare');
  g.flash(14, 100);
  award(g, 'forest_refactored');
  await g.say('Extract method. Rename variable. Remove dead code. Replace GOTO with loop.\n\nOne by one the noodles straighten out and fall neatly into line: two tidy columns flanking a clean, well-documented path leading north. The meatballs line up on top like named constants.\n\nThe rest of the forest is still spaghetti. But this part, at least, is beautiful.', { title: 'Refactored!' });
}

async function gotoTen(g: Game) {
  await g.approach('sign');
  g.player.dir = 'up';
  await g.say('You follow the GOTO 10 sign. All three of them, somehow, simultaneously. Space folds. Control flow jumps without asking.');
  g.sfx('teleport');
  g.flash(14, 120);
  handoff.arrival = 'goto';
  await g.wait(200);
  g.goto('boot', [160, 150, 'down']);
}

const REFACTOR_RE = /^(refactor|untangle|fix|clean( up)?|cleanup|tidy( up)?|straighten( out)?|comb|organi[sz]e|unravel|sort( out)?|restructure|rewrite|simplify|detangle|disentangle)\b/;
const FOREST_NOUN_RE = /\b(spaghetti|tree|trees|code|forest|path|tangle|tangled|noodles?|mess|pasta|it|this|knot|knots)\b/;

export const forest: RoomDef = {
  id: 'forest',
  title: 'The Spaghetti Forest',
  act: 2,
  music: 'forest',
  start: [160, 182, 'up'],
  draw: paint,
  walk: (g) => {
    const w: number[][] = [[0, 128, 320, 61]];
    // the stub of the north path (all the way through once refactored)
    if (g.flag('forest_refactored')) w.push([148, 100, 24, 30]);
    else w.push([146, 112, 28, 18]);
    return w;
  },
  blocks: [
    [12, 140, 46, 14],
    [258, 138, 44, 14],
    [66, 128, 54, 10],
    [226, 128, 26, 8],
    [284, 174, 28, 10],
  ],
  look: (g) =>
    g.flag('forest_refactored')
      ? 'The Spaghetti Forest. Noodle trees loop and twirl overhead, meatballs nestle in their crowns, and GOTO signs point in every direction at once. Off to the west, a tower of stacked boxes rises above the noodles.\n\nBut the path north is now clean, straight and well documented, flanked by two neat columns of perfectly parallel noodles. It leads toward a faint magenta glow.'
      : 'The Spaghetti Forest. Noodle trees loop and twirl overhead, tangled into one another so thoroughly that nobody can tell where one ends and the next begins. Red meatballs nestle in their crowns. GOTO signs point in every direction at once. Off to the west, a tower of stacked boxes rises above the noodles.\n\nTo the north, the path disappears into a dense, impenetrable tangle of spaghetti.',
  hotspots: [
    { id: 'canopy', nouns: ['canopy', 'branches', 'vines', 'overhead'], area: [0, 0, 320, 30], look: 'Overhead, strands of spaghetti drape from tree to tree like vines. Nobody knows which tree any of them belongs to. Nobody dares to find out.' },
    { id: 'tower', nouns: ['tower', 'stack', 'stack tower', 'distant tower', 'stack overflow tower', 'boxes', 'tower of boxes', 'frames'], area: [60, 0, 22, 100], look: 'Far to the west, through the noodles, a tower of stacked boxes rises into the sky and keeps going. The Stack Overflow Tower.' },
    {
      id: 'trees',
      nouns: ['trees', 'tree', 'noodle trees', 'noodle tree', 'forest', 'spaghetti', 'noodles', 'noodle', 'pasta', 'strands', 'trunk'],
      area: [0, 20, 320, 120],
      look: 'Trees made of spaghetti: bundles of noodles twisting up into crowns of twirled pasta, every strand looping into every other tree. A forest where everything is coupled to everything else. It smells faintly of oregano and legacy code.',
    },
    {
      id: 'meatballs',
      nouns: ['meatballs', 'meatball', 'globals', 'global variables', 'global variable', 'global', 'variables', 'balls'],
      area: [0, 0, 0, 0],
      look: 'Red meatballs nestle among the noodles: global variables. Everything in the forest depends on them, and none of it says so. Touch one and something in a completely unrelated part of the kingdom breaks.',
    },
    {
      id: 'path',
      nouns: ['path', 'north path', 'trail', 'way', 'way north', 'tangle', 'gap', 'mess', 'knot', 'ball', 'big ball', 'noodle ball', 'spaghetti ball', 'ball of spaghetti', 'ball of noodles', 'tangled ball', 'wall of spaghetti', 'do not touch sign', 'tiny sign', 'little sign', 'it works'],
      area: [124, 54, 72, 76],
      look: (g) =>
        g.flag('forest_refactored')
          ? 'The path north, freshly refactored: straight, clean and readable, lined with perfectly parallel noodles. The meatballs sit in a neat row along the top like named constants. Somewhere ahead, magenta light pulses.'
          : 'The path north vanishes into a dense knot of spaghetti: strands looping over and under each other in a way that would make a compiler weep. A tiny sign tangled in it says "DO NOT TOUCH - IT WORKS". It does not work. It really needs a good refactoring.',
    },
    {
      id: 'sign',
      nouns: ['sign', 'signs', 'signpost', 'goto', 'goto sign', 'goto signs', 'goto 10', 'boards', 'arrows'],
      area: [204, 86, 70, 48],
      at: [238, 140],
      look: 'A signpost with three boards. The one pointing left says GOTO 10. The one pointing right says GOTO 10. The one pointing up says GOTO 10. You have a bad feeling about line 10.',
    },
    {
      id: 'stone',
      nouns: ['stone', 'rock', 'todo', 'carving', 'inscription', 'todo stone', 'gravestone', 'tombstone', 'boulder'],
      area: [68, 104, 50, 34],
      at: [94, 142],
      look: (g) =>
        g.flag('forest_refactored')
          ? 'A weathered stone, carved: "TODO: REFACTOR THIS MESS (1989)". Somebody (you) has scratched a line through it and added "DONE". Thirty-seven years late, but done.'
          : 'A weathered stone, carved: "TODO: REFACTOR THIS MESS (1989)". Below it, in a dozen different hands: "+1", "still todo", "who wrote this??", "ME. -D.", "won\'t fix".',
    },
    { id: 'fork', nouns: ['fork', 'giant fork', 'sword', 'tines'], area: [284, 104, 28, 78], at: [278, 174], look: 'A giant silver fork, plunged into the ground like a sword in a stone, with spaghetti wound around its tines. Legend says whoever pulls it out will become Lead Developer.' },
    { id: 'bug', nouns: ['bugs', 'fireflies', 'firefly', 'lights', 'glowing bugs', 'insects', 'lightning bugs', 'glowing bug'], area: [0, 0, 0, 0], look: "Fireflies? No: glowing little bugs, drifting between the noodle trees. In a forest like this they're a natural part of the ecosystem. Nobody's ever had the time to fix them." },
  ],
  nouns: {
    sky: ['sky', 'stars'],
    floor: ['floor', 'ground', 'grid'],
    sauce: ['sauce', 'marinara', 'tomato sauce', 'marinara sauce', 'oregano', 'garlic'],
  },
  exits: [
    { area: [96, 186, 128, 4], to: 'boot', at: [160, 120, 'down'], dir: 'south' },
    { area: [0, 128, 5, 61], to: 'stack', at: [300, 170, 'left'], dir: 'west' },
    {
      area: [146, 112, 28, 4],
      to: 'loop',
      at: [160, 182, 'up'],
      dir: 'north',
      when: (g) => !g.flag('forest_refactored'),
      blocked: () => 'The path north is a solid wall of tangled spaghetti. You try to push through and the noodles just bounce you back, al dente and unyielding. This code needs refactoring before anyone can get through it.',
    },
    { area: [148, 100, 24, 5], to: 'loop', at: [160, 182, 'up'], dir: 'north', when: (g) => !!g.flag('forest_refactored') },
  ],
  verbs: {
    'fix trees|path|code|room|everything|meatballs,fix': async (g) => {
      await refactor(g);
    },
    'pull|push|cut|break path,pull|cut trees': async (g) => {
      if (g.flag('forest_refactored')) return false;
      await g.approach([160, 124]);
      await g.say('You yank at a strand. It stretches, sproings back, and drags three other strands with it. Brute force will not work here. This calls for a careful, methodical refactoring.');
    },
    'go sign,use sign,read sign': async (g, c) => {
      if (c.verb === 'read') return void (await g.say('All three boards say GOTO 10. They point left, right and up.'));
      await gotoTen(g);
    },
    'take sign': "It's nailed into the ground. Besides, half of the kingdom's control flow depends on that sign.",
    'take meatballs,touch meatballs': 'You reach for a meatball and stop. Everything in the forest depends on it, and none of it says so. Take it, and something in a completely unrelated part of the kingdom breaks.',
    'eat meatballs': async (g) => {
      await g.approach([200, 140]);
      await g.pose(null, 'reach', 400);
      await g.say('You pluck a meatball from a low branch and pop it in your mouth. Delicious! Hearty, rich, and... global.');
      g.sfx('crash');
      g.shake(700);
      g.flash(12, 200);
      await g.wait(500);
      return void (await g.die('Somewhere across the kingdom, forty-one unrelated modules that depended on that global variable crash at once. So does the one you are standing in.\n\nNever eat global state.', { title: 'Side Effects' }));
    },
    'eat trees,eat path': 'You slurp a noodle. It tastes like 1989: undocumented, under-tested, with a hint of global state. Al dente, though. Credit where it\'s due.',
    'take trees,take path,pull trees': async (g) => {
      await g.say('You tug on a noodle. Three trees shake, a signpost spins, and somewhere a meatball falls. Everything here is coupled to everything else. You let go, very gently.');
    },
    'climb trees': 'You try to climb a noodle tree. The noodles are al dente, but not THAT al dente.',
    'go trees': 'You pick a noodle and follow it. It loops around three trees, doubles back through a fourth, ducks under a GOTO sign and deposits you exactly where you started. Classic spaghetti control flow.',
    'use fork trees|path|sauce,use fork': async (g) => {
      if (g.flag('forest_refactored')) return void (await g.say('You twirl a little spaghetti around the giant fork, purely for the aesthetics. The path north stays clean. You feel like a real craftsperson.'));
      await g.say("You try to twirl the tangle around the giant fork. The whole forest turns with it: three trees, a signpost and a meatball you were not expecting. Forks don't fix spaghetti. A careful refactoring does.");
    },
    'look sauce': 'The forest floor glows faintly with marinara at the horizon. The whole place smells of oregano, garlic, and legacy code.',
    'take|drink|eat sauce': "There's no actual sauce here, only its glow and its smell. This forest is all noodle, no sauce. Which explains a lot.",
    'take fork,pull fork': async (g) => {
      await g.approach('fork');
      await g.pose(null, 'reach', 600);
      await g.say('You grab the fork with both hands and heave. It doesn\'t budge. Half the forest is wound around it. Removing it would require a major version bump.');
    },
    'look/under stone,move|push stone,take stone': "It's a very heavy stone. It has been sitting on this TODO since 1989, which is what TODOs are for.",
    'read stone': async (g) => {
      const h = g.hotspot('stone');
      if (h && typeof h.look === 'function') {
        const out = await h.look(g);
        if (typeof out === 'string') await g.say(out);
      }
    },
    'catch|take bug,attack bug': 'You swipe at a glowing bug. It flits out of reach, and when you look again it seems to be blinking on purpose. Fine. It\'s a feature now.',
    'go path,follow path': async (g) => {
      if (!g.flag('forest_refactored')) return void (await g.say('The path north is blocked by a solid tangle of spaghetti. Somebody will have to refactor it first.'));
      await g.walk(null, 160, 102);
    },
    'look floor': 'The forest floor: a dark grid, with a faint glow of marinara at the horizon.',
    'listen ?,listen': 'Somewhere deep in the forest, a faint voice repeats: "GOTO 10... GOTO 10... GOTO 10..."',
    'smell ?,smell': 'The air smells of oregano, garlic, and legacy code.',
    'look sky': 'Overhead, strands of spaghetti drape from tree to tree like vines. Through the gaps, a few faint stars.',
    'look up': 'Spaghetti, draped from tree to tree overhead. A meatball dangles directly above you, held up by nothing but tradition.',
    ...CYBER_VERBS,
  },
  raw: async (g, text) => {
    if (await cyberRaw(g, text)) return true;
    const t = text.trim().toLowerCase();
    if (/^(goto|go to|follow|jmp|jump to)\s*(line\s*)?10\b/.test(t) || /^goto\b/.test(t)) {
      await gotoTen(g);
      return true;
    }
    if (/^(10\s+)?(print|run|list)\b/.test(t)) {
      await g.say(t.startsWith('list') ? '10 GOTO 10' : '?SYNTAX ERROR IN 10');
      return true;
    }
    if (REFACTOR_RE.test(t) && (FOREST_NOUN_RE.test(t) || /^\S+( up| out)?$/.test(t))) {
      await refactor(g);
      return true;
    }
    return false;
  },
  enter() {
    tangleK = 1;
  },
  overlay,
};
