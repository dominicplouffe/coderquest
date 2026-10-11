// The Infinite Loop: a circular arena under a sky of circular star trails.
// Leave by any edge but the south one and you come right back in, one
// iteration later. The only way forward is to BREAK out.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import type { Dir } from '../../engine/actor';
import { Surface, rng } from '../../engine/raster';
import { bayerAt } from '../../engine/palette';
import { twinkle, sevenSeg, sevenSegWidth, commas, microOutlined, microCentered, textOutlined, CYBER_VERBS } from '../../art/cyber_c_kit';
import { award } from '../../content/points';

const HZ = 100;
const CX = 160,
  CY = 152; // arena centre
const ARX = 168,
  ARY = 44; // arena rim radii
const POLE = { x: 160, y: 18 }; // the sky's centre of rotation

let curY = 160; // Dominic's y, for wrap-around exits
let wrapFx = 0; // flash/whoosh timer after a wrap
let breakT = 0; // the arch shattering
let rollT = 0; // counter roll animation
let wrapsThisVisit = 0;

const iter = (g: Game) => 1024 + (g.flag('loop_count') ?? 0);

// ------------------------------------------------------------------ picture

function starTrails(p: Surface) {
  const r = rng(808);
  for (let i = 0; i < 70; i++) {
    const rad = 8 + r() * 150;
    const a0 = r() * Math.PI * 2;
    const len = 0.2 + r() * 0.9;
    const c = r() < 0.15 ? 9 : r() < 0.5 ? 8 : 1;
    let px = -1,
      py = -1;
    for (let a = a0; a < a0 + len; a += 1 / rad) {
      const x = Math.round(POLE.x + Math.cos(a) * rad * 1.15),
        y = Math.round(POLE.y + Math.sin(a) * rad * 0.62);
      if (y >= HZ - 4 || y < 0) {
        px = -1;
        continue;
      }
      if (x !== px || y !== py) p.plot(x, y, c);
      px = x;
      py = y;
    }
  }
}

function arenaFloor(p: Surface) {
  // the arena floor: concentric rings and radial spokes (a polar grid)
  for (let y = HZ + 1; y < 190; y++) {
    for (let x = 0; x < 320; x++) {
      const dx = (x - CX) / ARX,
        dy = (y - CY) / ARY;
      const d = Math.sqrt(dx * dx + dy * dy);
      let c = 0;
      if (d > 1.0) {
        // outside the rim: dark ground fading to the horizon
        c = bayerAt(x, y) < 2 ? 5 : 0;
      } else {
        const ring = d * 7;
        const fr = ring - Math.floor(ring);
        const ang = Math.atan2(dy, dx);
        const spoke = ((ang / (Math.PI * 2)) * 24 + 48) % 1;
        const near = y > 140;
        if (fr < 0.07 + (near ? 0.03 : 0)) c = Math.floor(ring) % 2 ? 5 : 13;
        else if (spoke < 0.03 / Math.max(0.25, d)) c = 5;
      }
      p.plot(x, y, c);
    }
  }
  // the track: a bright ring around the field
  for (const [k, c] of [
    [1.0, 13],
    [0.985, 5],
    [0.86, 5],
  ] as [number, number][])
    p.ellipseO(CX, CY, Math.round(ARX * k), Math.round(ARY * k), c);
  // arrows painted on the track, all pointing the same way round. Forever.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.1;
    const x = CX + Math.cos(a) * ARX * 0.93,
      y = CY + Math.sin(a) * ARY * 0.93;
    if (y < HZ + 2 || y > 188) continue;
    const tx = -Math.sin(a),
      ty = Math.cos(a) * (ARY / ARX);
    const L = 4;
    p.line(x - tx * L, y - ty * L, x + tx * L, y + ty * L, 14);
    p.line(x + tx * L, y + ty * L, x + tx * L - tx * 3 - ty * 3, y + ty * L - ty * 3 + tx * 2, 14);
    p.line(x + tx * L, y + ty * L, x + tx * L - tx * 3 + ty * 3, y + ty * L - ty * 3 - tx * 2, 14);
  }
  // horizon
  p.hline(0, 319, HZ, 13);
  p.hline(0, 319, HZ + 1, 5);
}

const ARCH = { l: 116, r: 204, top: 40, base: 114, pw: 12 };

function arch(p: Surface, g: Game) {
  const broken = !!g.flag('loop_broken');
  const { l, r, top, base, pw } = ARCH;
  if (!broken) {
    p.at(base, () => {
      for (const x of [l, r - pw]) {
        p.rect(x, top + 14, pw, base - top - 14, 1);
        p.vline(x, top + 14, base - 1, 13);
        p.vline(x + pw - 1, top + 14, base - 1, 5);
        for (let y = top + 18; y < base - 2; y += 9) p.hline(x + 2, x + pw - 3, y, 5);
        p.rect(x - 2, base - 4, pw + 4, 4, 5);
        p.hline(x - 2, x + pw + 1, base - 4, 13);
      }
      // the lintel
      p.rect(l - 6, top, r - l + 12, 15, 0);
      p.frame(l - 6, top, r - l + 12, 15, 13);
      p.frame(l - 5, top + 1, r - l + 10, 13, 5);
      textOutlined(p, l + 2, top + 4, 'while (true) {', 14, 6);
    });
  } else {
    // the shattered arch: stumps and rubble
    p.at(base, () => {
      for (const [x, h] of [
        [l, 22],
        [r - pw, 14],
      ]) {
        p.rect(x, base - h, pw, h, 1);
        p.vline(x, base - h, base - 1, 13);
        p.vline(x + pw - 1, base - h, base - 1, 5);
        // jagged break
        for (let i = 0; i < pw; i++) p.vline(x + i, base - h - ((i * 7) % 4), base - h, (i * 3) % 2 ? 1 : 0);
        p.rect(x - 2, base - 4, pw + 4, 4, 5);
        p.hline(x - 2, x + pw + 1, base - 4, 13);
      }
    });
    const rr = rng(66);
    p.at(126, () => {
      for (let i = 0; i < 9; i++) {
        const x = 100 + Math.floor(rr() * 120),
          y = 114 + Math.floor(rr() * 10);
        if (x > 146 && x < 174) continue;
        const w = 4 + Math.floor(rr() * 7),
          h = 3 + Math.floor(rr() * 3);
        p.rect(x, y - h, w, h, 1);
        p.hline(x, x + w - 1, y - h, 13);
        p.hline(x, x + w - 1, y, 0);
      }
      // the fallen letters of while (true) {
      const letters = 'while(true){';
      for (let i = 0; i < letters.length; i++) {
        const x = 104 + i * 10 + Math.floor(rr() * 4),
          y = 118 + Math.floor(rr() * 6);
        if (x > 146 && x < 172) continue;
        textOutlined(p, x, y - 8, letters[i], 6, 0);
      }
    });
    // beyond: a corridor leading north to a distant red glow
    for (let y = 56; y < HZ; y++) {
      const d = (y - 56) / (HZ - 56);
      const hw = 3 + d * 12;
      for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
        const edge = Math.abs(x - CX) > hw - 1;
        if (edge) p.plot(x, y, 4);
        else if (bayerAt(x, y) < 3 + d * 3) p.plot(x, y, 4);
      }
    }
    // the far-off cage of the Deadlock
    p.rect(CX - 5, 48, 11, 10, 0);
    p.frame(CX - 5, 48, 11, 10, 12);
    for (let x = CX - 3; x <= CX + 3; x += 2) p.vline(x, 49, 56, 4);
    p.hline(CX - 7, CX + 7, 47, 12);
  }
}

function brace(p: Surface) {
  // a giant closing brace monument on the east side of the arena
  const x = 268,
    base = 130;
  p.at(base, () => {
    p.ellipse(x + 6, base - 1, 16, 3, 0);
    p.rect(x - 8, base - 6, 30, 6, 5);
    p.hline(x - 8, x + 21, base - 6, 13);
    // the brace itself, drawn thick
    const pts = [x - 2, base - 66, x + 6, base - 62, x + 7, base - 46, x + 14, base - 38, x + 7, base - 30, x + 6, base - 14, x - 2, base - 8];
    p.lines(pts, 0, 6);
    p.lines(pts, 5, 4);
    p.lines(pts, 13, 2);
    p.lines(pts.map((v, i) => (i % 2 ? v : v - 1)), 15);
  });
}

function spinnerPedestal(p: Surface) {
  const x = 46,
    base = 130;
  p.at(base, () => {
    p.ellipse(x, base - 1, 16, 3, 0);
    p.rect(x - 10, base - 22, 20, 22, 1);
    p.vline(x - 10, base - 22, base - 1, 9);
    p.vline(x + 9, base - 22, base - 1, 0);
    p.rect(x - 13, base - 25, 26, 4, 5);
    p.hline(x - 13, x + 12, base - 25, 13);
    p.micro(x - 8, base - 15, 'WAIT', 11);
    p.micro(x - 8, base - 8, '....', 11);
  });
}

function paint(p: Surface, g: Game) {
  p.rect(0, 0, 320, HZ, 0);
  starTrails(p);
  // a faint magenta aurora at the horizon
  for (let y = HZ - 10; y < HZ; y++) for (let x = 0; x < 320; x++) if (bayerAt(x, y) < (y - HZ + 10) * 0.7) p.plot(x, y, 5);
  arenaFloor(p);
  // back wall of the arena, curving round behind the field
  for (let x = 0; x < 320; x++) {
    const dx = (x - CX) / ARX;
    if (Math.abs(dx) > 1) continue;
    const y = Math.round(CY - Math.sqrt(1 - dx * dx) * ARY);
    p.vline(x, y - 5, y - 1, 1);
    p.plot(x, y - 6, 13);
  }
  arch(p, g);
  brace(p);
  spinnerPedestal(p);
  // the south gate: a gap in the rim where the path comes in
  for (let y = 182; y < 190; y++) p.hline(144, 176, y, 0);
  p.vline(143, 180, 189, 13);
  p.vline(177, 180, 189, 13);
  // the counter's frame in the sky
  p.rect(108, 2, 104, 30, 0);
  p.frame(108, 2, 104, 30, 5);
  p.frame(109, 3, 102, 28, 1);
  microCentered(p, 160, 5, g.flag('loop_broken') ? 'LOOP EXITED AFTER' : 'ITERATION', g.flag('loop_broken') ? 10 : 13);
}

// ------------------------------------------------------------------ animation

function overlay(g: Game, s: Surface, t: number) {
  const broken = !!g.flag('loop_broken');
  // stars wheeling round the pole (slowly, forever)
  const r = rng(99);
  for (let i = 0; i < 46; i++) {
    const rad = 10 + r() * 150;
    const a = r() * Math.PI * 2 + (broken ? 0 : t / (900 + rad * 3));
    const x = Math.round(POLE.x + Math.cos(a) * rad * 1.15),
      y = Math.round(POLE.y + Math.sin(a) * rad * 0.62);
    if (y < 0 || y >= HZ - 2 || (x > 107 && x < 213 && y < 33)) continue;
    s.plot(x, y, r() < 0.2 ? 15 : 7);
  }
  twinkle(s, t, 0, 34, 320, 60, 3, 6);
  // the iteration counter
  const n = commas(iter(g));
  const w = sevenSegWidth(n);
  let col = 14;
  if (rollT > 0) {
    rollT--;
    col = (rollT >> 2) & 1 ? 15 : 14;
  }
  if (broken) col = 10;
  sevenSeg(s, Math.round(160 - w / 2), 13, n, col);
  // last digit rolls when it changes
  if (rollT > 20 && !broken) {
    const lx = Math.round(160 - w / 2) + w - 9;
    s.rect(lx, 13, 8, 14, 0);
    const k = Math.floor((rollT - 20) / 3) % 10;
    sevenSeg(s, lx, 13 + ((rollT % 3) - 1), String(k), 15);
  }
  // spinner and a progress bar that never finishes
  if (!broken) {
    const sp = '|/-\\'[(t >> 3) % 4];
    const sx = 200,
      sy = 13;
    if (sp === '|') s.vline(sx, sy, sy + 6, 13);
    else if (sp === '-') s.hline(sx - 3, sx + 3, sy + 3, 13);
    else if (sp === '/') s.line(sx - 3, sy + 6, sx + 3, sy, 13);
    else s.line(sx - 3, sy, sx + 3, sy + 6, 13);
  }
  // the spinner on the pedestal: a "please wait" wheel
  const wx = 46,
    wy = 92;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const lit = (i - (broken ? 0 : t >> 3)) & 7;
    const c = lit === 0 ? 15 : lit < 3 ? 11 : lit < 5 ? 3 : 1;
    s.rect(Math.round(wx + Math.cos(a) * 7) - 1, Math.round(wy + Math.sin(a) * 7) - 1, 2, 2, c);
  }
  // the force field in the arch (before the break)
  if (!broken) {
    const { l, r: rr, top, base, pw } = ARCH;
    for (let x = l + pw; x < rr - pw; x++) {
      const k = (x * 7 + t) % 23;
      if (k < 2) s.vline(x, top + 15, base - 2, 13);
      else if (k < 4 && ((x + t) & 1)) s.vline(x, top + 15 + ((t + x) % 9), base - 2, 5);
    }
    // a light running round the track
    const a = t / 70;
    const x = Math.round(CX + Math.cos(a) * ARX * 0.93),
      y = Math.round(CY + Math.sin(a) * ARY * 0.93);
    if (y > HZ + 2 && y < 189) {
      s.rect(x - 1, y - 1, 3, 2, 15);
      s.plot(x - 2, y, 13);
      s.plot(x + 2, y, 13);
    }
  }
  // the arch shattering
  if (breakT > 0) {
    const k = 120 - breakT;
    const rr = rng(31);
    for (let i = 0; i < 40; i++) {
      const x0 = ARCH.l + rr() * (ARCH.r - ARCH.l),
        y0 = ARCH.top + rr() * 70;
      const vx = (rr() - 0.5) * 2,
        vy = -rr() * 1.5;
      const x = Math.round(x0 + vx * k),
        y = Math.round(y0 + vy * k + 0.05 * k * k);
      if (y < 125) s.rect(x, y, 2 + (i % 3), 2, [13, 5, 14, 1][i % 4]);
    }
    breakT--;
  }
  // wrap flash: speed lines whooshing across the screen
  if (wrapFx > 0) {
    const k = wrapFx;
    for (let i = 0; i < 18; i++) {
      const y = 20 + ((i * 37) % 160);
      const x0 = ((i * 53 + (40 - k) * 14) % 360) - 20;
      s.hline(x0, x0 + 30, y, i % 3 ? 13 : 15);
    }
    if (k > 20) microOutlined(s, 160 - 30, 70, `ITERATION ${commas(iter(g))}`, 15);
    wrapFx--;
  }
}

function tick(g: Game) {
  curY = Math.max(124, Math.min(186, Math.round(g.player.y)));
}

// ------------------------------------------------------------------ actions

async function breakLoop(g: Game, how: 'break' | 'esc' | 'ctrlc' | 'escape') {
  if (g.flag('loop_broken')) {
    await g.say('The loop is already broken. The arch lies in pieces, and the counter in the sky has stopped for good. It looks relieved, somehow.');
    return;
  }
  if (how === 'esc' && !g.has('esckey')) {
    await g.say("You don't have an Escape key. You'll have to find another way to break out.");
    return;
  }
  await g.approach([160, 140]);
  g.player.dir = 'up';
  if (how === 'esc') {
    await g.pose(null, 'reach', 400);
    await g.say('You hold up the ESC key from Nicholas\'s keyboard and press it, firmly, with your thumb.\n\nCLICK.');
  } else if (how === 'ctrlc') {
    await g.pose(null, 'reach', 400);
    await g.say('You hold Ctrl and C together, in mid-air, with tremendous conviction.\n\n^C');
  } else if (how === 'escape') {
    await g.say('You decide that what this situation really needs is an escape. A proper one.');
  } else {
    await g.pose(null, 'cheer', 600);
    await g.say('You take a deep breath, plant your feet, and shout the one keyword every loop fears:\n\n"BREAK!"');
  }
  g.sfx('crash');
  g.shake(900);
  g.flash(15, 150);
  breakT = 120;
  g.set('loop_broken');
  award(g, 'loop_broken');
  g.redraw();
  await g.wait(1200);
  g.sfx('fanfare');
  await g.say(`The arch reading "while (true) {" cracks down the middle and comes apart. Its letters rain down onto the arena floor. The stars stop wheeling. The counter in the sky freezes at ${commas(iter(g))}, and for the first time since 1987, the Infinite Loop... ends.\n\nBeyond the broken arch, a corridor leads north toward a dull red glow.`, { title: 'break;' });
}

async function duckNudge(g: Game, strong: boolean) {
  if (!g.has('duck')) return;
  if (!g.flag('duck_talked')) {
    g.set('duck_talked');
    award(g, 'duck_talked');
    await g.say('Something in your pocket clears its throat.\n\nYou pull out your rubber duck. It is looking at you. It BLINKS.\n\n"Dominic. Buddy. Twenty years I\'ve listened to you mumble about null pointers, and in here I can finally talk BACK."', { title: 'Rubber Duck' });
  }
  if (!strong) await g.say('"Quack. You do realise we\'ve been here before? Five times. LITERALLY. Every loop needs an exit condition, and this one doesn\'t have one. You know the keyword. Or you could just... escape."', { title: 'Rubber Duck' });
  else await g.say('"QUACK. Iteration twelve. I am begging you. Type BREAK. Or press that ESC key you pried off Nicholas\'s keyboard. Anything. I am a duck, and even I am dizzy."', { title: 'Rubber Duck' });
}

function wrapExit(area: number[], dir: string, x: number, face: Dir) {
  return {
    area,
    to: 'loop',
    dir,
    when: (g: Game) => !g.flag('loop_broken'),
    get at(): [number, number, Dir] {
      return [x, curY, face];
    },
  };
}

// ------------------------------------------------------------------ room

export const loop: RoomDef = {
  id: 'loop',
  title: 'The Infinite Loop',
  act: 2,
  music: 'loop',
  start: [160, 182, 'up'],
  draw: paint,
  walk: (g) => {
    const w: number[][] = [[0, 124, 320, 65]];
    w.push([148, 104, 24, 22]);
    void g;
    return w;
  },
  blocks: [
    [110, 110, 24, 18],
    [186, 110, 24, 18],
    [256, 122, 40, 10],
    [28, 122, 36, 10],
  ],
  look: (g) =>
    g.flag('loop_broken')
      ? `The arena of the Infinite Loop, now quiet. The "while (true) {" arch lies in pieces, its letters scattered across the floor, and the counter in the sky has frozen at ${commas(iter(g))}. Beyond the rubble, a corridor leads north toward a dull red glow.`
      : `A vast circular arena under a sky of wheeling star trails. Glowing arrows on the track all point the same way round. To the north stands a great arch inscribed "while (true) {", humming with a force field, and on the east side looms a giant closing brace. In the sky, a counter reads: ITERATION ${commas(iter(g))}.\n\nYou get the distinct feeling you have been here before.`,
  hotspots: [
    { id: 'sky', nouns: ['sky', 'stars', 'star trails', 'trails', 'circles'], area: [0, 0, 320, 60], look: 'The stars wheel slowly around a single point, leaving circular trails across the sky. Even the heavens in here are stuck in a loop.' },
    {
      id: 'counter',
      nouns: ['counter', 'iteration', 'iterations', 'number', 'display', 'progress bar', 'spinner', 'loop count', 'loop counter'],
      area: [106, 0, 108, 34],
      look: (g) =>
        g.flag('loop_broken')
          ? `The counter has stopped: LOOP EXITED AFTER ${commas(iter(g))} ITERATIONS. It's the most satisfying number you've seen all night.`
          : `A huge counter hangs in the sky: ITERATION ${commas(iter(g))}. A little spinner beside it whirls endlessly. Nobody knows who started counting at 1,024, but they were clearly a programmer.`,
    },
    { id: 'floor', nouns: ['floor', 'arena', 'track', 'rings', 'ground', 'arrows', 'circle', 'field'], area: [0, 101, 320, 89], look: 'The arena floor is a target of concentric glowing rings. Arrows painted on the track all point the same way round. There is no arrow pointing out.' },
    {
      id: 'arch',
      nouns: ['arch', 'while', 'while true', 'while loop', 'gate', 'archway', 'inscription', 'force field', 'field', 'lintel', 'rubble', 'letters', 'pillars'],
      area: [108, 36, 104, 80],
      look: (g) =>
        g.flag('loop_broken')
          ? 'The arch has collapsed into rubble, the letters of "while (true) {" scattered across the floor. Through the gap, a corridor leads north toward a distant red glow, and something that looks like a cage.'
          : 'A great arch inscribed in glowing letters: "while (true) {". Between its pillars a force field shimmers. Walk through it and you will simply come around again. The condition is always true. That is rather the point.',
    },
    { id: 'brace', nouns: ['brace', 'closing brace', 'curly brace', 'bracket', 'monument', 'statue'], area: [252, 60, 44, 72], look: 'A giant closing brace "}" stands on the east side of the arena, marking the end of the loop body. You reach the end of the loop, and you go back to the start. That is what the brace means.' },
    { id: 'pedestal', nouns: ['pedestal', 'wheel', 'loading wheel', 'please wait', 'wait sign', 'spinning wheel', 'loading'], area: [26, 80, 40, 52], look: 'A pedestal marked WAIT...., topped with a spinning "please wait" wheel. It has been spinning since 1987. It will not stop until the loop does.' },
  ],
  exits: [
    { area: [100, 186, 120, 3], to: 'forest', at: [160, 118, 'down'], dir: 'south' },
    { area: [148, 104, 24, 4], to: 'loop', at: [160, 182, 'up'], dir: 'north', when: (g) => !g.flag('loop_broken') },
    { area: [148, 104, 24, 4], to: 'deadlock', at: [160, 182, 'up'], dir: 'north', when: (g) => !!g.flag('loop_broken') },
    wrapExit([0, 124, 4, 65], 'west', 304, 'left'),
    wrapExit([316, 124, 4, 65], 'east', 16, 'right'),
    { area: [0, 124, 4, 65], to: 'loop', at: [16, 160, 'right'], dir: 'west', when: (g) => !!g.flag('loop_broken'), blocked: () => 'Now that the loop is broken, the arena wall on this side is just a wall. The only ways out are north and south.' },
    { area: [316, 124, 4, 65], to: 'loop', at: [304, 160, 'left'], dir: 'east', when: (g) => !!g.flag('loop_broken'), blocked: () => 'Now that the loop is broken, the arena wall on this side is just a wall. The only ways out are north and south.' },
  ],
  nouns: {
    loop: ['loop', 'infinite loop', 'while loop', 'cycle'],
  },
  verbs: {
    'break,break loop|arch|counter|room|everything|floor|self': async (g) => {
      await breakLoop(g, 'break');
    },
    'break candy': 'You consider snapping the BREAK! bar in half. Then it occurs to you that the bar is not the thing that needs breaking here.',
    'use|push esckey,push|use esckey loop|arch,give esckey loop': async (g) => {
      if (!g.has('esckey')) return false;
      await breakLoop(g, 'esc');
    },
    'escape,escape loop|arch|room': async (g) => {
      await breakLoop(g, 'escape');
    },
    'exit loop|arch,exit': "You can't just walk out of a loop. You'd come right back around. Loops have to be BROKEN out of.",
    'look loop': async (g) => {
      const r = loop.look;
      if (typeof r === 'function') {
        const out = await r(g);
        if (typeof out === 'string') await g.say(out);
      }
    },
    'take brace,push brace': "The closing brace is enormous and very firmly closed. Pushing it would only start the loop over. You suspect it's done that before.",
    'take counter,turnoff|reboot counter': "It's up in the sky, counting. You'd need a much longer arm, or a break statement.",
    'wait': async (g) => {
      if (g.flag('loop_broken')) return void (await g.say('Time passes. Normally, for once.'));
      g.inc('loop_count');
      rollT = 40;
      await g.say(`You wait. The stars wheel around. The counter ticks over to ${commas(iter(g))}. Waiting for an infinite loop to finish is a classic beginner mistake.`);
    },
    'take arch,take letters': async (g) => {
      if (!g.flag('loop_broken')) return void (await g.say('The letters are carved into the lintel, high above your head.'));
      await g.say('You pick up a fallen "{" from the rubble, look at it, and put it back. There is no matching "}" for it anymore. Some things are better left unclosed.');
    },
    'push|attack|touch arch': async (g) => {
      if (g.flag('loop_broken')) return false;
      await g.say('You push on the force field. It pushes back, gently but firmly, like a for loop with an off-by-one error.');
    },
    ...CYBER_VERBS,
  },
  raw: async (g, text) => {
    const t = text.trim().toLowerCase();
    if (/^(type |say |shout |yell |enter |press )?["']?break;?["']?!?$/.test(t) || /^break (out( of)?( the)? loop|out|free|the loop|loop)\b/.test(t)) {
      await breakLoop(g, 'break');
      return true;
    }
    if (/^(press|push|hit|use|type|tap)\s+(the\s+)?(esc|escape)(\s+key)?$/.test(t) || /^esc$/.test(t)) {
      await breakLoop(g, g.has('esckey') ? 'esc' : 'escape');
      return true;
    }
    if (/^(press |type |hit |send )?(ctrl|control|ctl)[\s+-]*c$|^\^c$/.test(t)) {
      await breakLoop(g, 'ctrlc');
      return true;
    }
    if (/^continue;?$/.test(t)) {
      g.inc('loop_count');
      rollT = 40;
      wrapFx = 30;
      g.sfx('teleport');
      await g.say(`"continue;" Of course. The counter happily ticks over to ${commas(iter(g))}. Very helpful. Exactly the opposite of helpful.`);
      return true;
    }
    if (/^return;?$/.test(t)) {
      await g.say('"return;" would work beautifully, if this loop were inside a function. It isn\'t. It\'s in the global scope, which explains a great deal.');
      return true;
    }
    if (/^(goto|go to) /.test(t) && !/^go to (north|south|east|west)/.test(t)) {
      await g.say('A GOTO? Inside MY loop? The arch hums disapprovingly. Dijkstra would not approve, and neither does the arch.');
      return true;
    }
    return false;
  },
  enter(g, from) {
    breakT = 0;
    rollT = 0;
    if (from === 'loop') {
      g.inc('loop_count');
      wrapFx = 40;
      rollT = 40;
      wrapsThisVisit++;
      g.sfx('teleport');
      g.flash(13, 80);
    } else {
      wrapFx = 0;
      wrapsThisVisit = 0;
    }
    curY = Math.round(g.player.y);
  },
  afterEnter: async (g, from) => {
    if (from !== 'loop') return;
    const n = g.flag('loop_count') ?? 0;
    if (n === 1) {
      await g.say(`You walk out of the arena... and walk straight back into it, from the other side. Overhead, the counter ticks over: ITERATION ${commas(iter(g))}.\n\nHm.`);
    } else if (n === 5) {
      await duckNudge(g, false);
    } else if (n === 12) {
      await duckNudge(g, true);
    }
  },
  tick,
  overlay,
};
