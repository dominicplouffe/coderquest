// The R&D Lab: Krishna, the Neural Debugging Interface v2 (sparking on its
// stand), an oscilloscope, a robot arm with a temper, a 3D printer and the
// infamous CABLE DRAWER OF DESPAIR.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, rng } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { fluorescent, keyboard, whiteboard } from '../../art/lib';
import { shadow, BASE_NOUNS, itemNouns, COMPUTER_NOUNS } from '../../art/office_props';
import { award } from '../../content/points';
import { addNpc, convo } from '../../content/helpers';
import { HALL_ARRIVE } from './hallway';

const SEAM = 104;
const BENCH = { x: 100, z: 121, w: 124, h: 18, depth: 6 };
const KRISHNA: [number, number] = [150, 130];
const STAND = { x: 254, z: 138 };
const PRINTER = { x: 280, z: 128 };

function paint(p: Surface, g: Game) {
  const given = !!g.flag('helmet_given');
  // ---------------------------------------------------------------- floor: anti-static tiles
  p.rect(0, SEAM, 320, 190 - SEAM, 8);
  for (let i = -10; i <= 10; i++) {
    const xb = 160 + i * 32;
    p.line(160 + (xb - 160) * 0.6, SEAM, xb, 189, 7);
  }
  let y = SEAM + 4,
    step = 5;
  while (y < 190) {
    p.hline(0, 319, y, 7);
    y += step;
    step = Math.ceil(step * 1.3);
  }
  // yellow-and-black safety line around the helmet stand
  p.lines([STAND.x - 18, STAND.z + 2, STAND.x + 18, STAND.z + 2, STAND.x + 24, STAND.z + 14, STAND.x - 24, STAND.z + 14, STAND.x - 18, STAND.z + 2], 14);

  // ---------------------------------------------------------------- walls
  p.rect(0, 0, 320, SEAM, 7);
  p.rect(0, 0, 320, 10, 15);
  for (let x = 0; x < 320; x += 32) p.vline(x, 0, 9, 7);
  p.hline(0, 319, 9, 8);
  fluorescent(p, 80, 2, 40, false);
  fluorescent(p, 240, 2, 40, false);
  // lab wall: pale panels with a blue safety stripe
  for (let x = 0; x < 320; x += 40) p.vline(x, 10, SEAM - 4, dith(7, 8, 8));
  p.rect(0, 80, 320, 4, 9);
  p.hline(0, 319, 79, 1);
  p.rect(0, SEAM - 3, 320, 3, 0);

  // whiteboard: the brain diagram
  whiteboard(p, 36, 20, 58, 36);
  // a brain
  p.ellipse(56, 37, 11, 8, 13);
  p.ellipseO(56, 37, 11, 8, 5);
  p.line(56, 30, 56, 44, 5);
  p.line(48, 34, 52, 37, 5);
  p.line(60, 34, 64, 38, 5);
  p.line(47, 40, 51, 41, 5);
  // arrow to a box labeled MONOLITH
  p.line(68, 37, 78, 37, 0);
  p.plot(77, 36, 0);
  p.plot(77, 38, 0);
  p.frame(79, 32, 13, 10, 0);
  p.rect(82, 34, 7, 6, 8);
  p.micro(38, 49, 'NDI V2', 1);
  p.micro(66, 49, '= ?!', 4);
  // safety poster
  p.rect(10, 24, 18, 24, 14);
  p.frame(10, 24, 18, 24, 0);
  p.rect(12, 27, 14, 9, 0);
  p.ellipse(16, 31, 2, 2, 15);
  p.ellipse(22, 31, 2, 2, 15);
  p.hline(18, 20, 31, 15);
  p.micro(12, 39, 'EYES', 0);

  // Adriana's vitals monitor on the wall (heart trace drawn by overlay)
  p.rect(226, 22, 48, 30, 8);
  p.rect(228, 24, 44, 26, 0);
  p.micro(230, 26, 'ADRIANA', 10);
  p.micro(230, 43, 'VITALS OK', 2);
  // cable from the vitals monitor across the wall and down to the floor
  p.line(274, 40, 300, 48, 0);
  p.line(300, 48, 302, SEAM - 2, 0);

  // ---------------------------------------------------------------- the CABLE DRAWER OF DESPAIR
  p.at(134, () => {
    p.rect(8, 104, 30, 30, 8);
    p.frame(8, 104, 30, 30, 0);
    for (let k = 0; k < 3; k++) {
      p.frame(10, 106 + k * 9, 26, 8, 0);
      p.rect(21, 109 + k * 9, 4, 1, 7);
    }
    // label
    p.rect(11, 96, 24, 7, 15);
    p.frame(11, 96, 24, 7, 0);
    p.micro(13, 97, 'CABLE', 4);
    // the middle drawer bursting with cables
    const r = rng(9);
    for (let k = 0; k < 14; k++) {
      const x0 = 12 + Math.floor(r() * 22);
      const c = [0, 4, 1, 14, 15, 2, 6][Math.floor(r() * 7)];
      p.line(x0, 114, x0 + Math.floor(r() * 9) - 4, 117 + Math.floor(r() * 9), c);
    }
  });

  // ---------------------------------------------------------------- the workbench
  const { x, z, w, h, depth } = BENCH;
  const top = z - h - depth;
  p.at(z, () => {
    // pegboard behind the bench with tools
    p.rect(x + 4, 58, w - 8, 30, 6);
    for (let yy = 60; yy < 86; yy += 3) for (let xx = x + 6; xx < x + w - 6; xx += 3) p.plot(xx, yy, dith(6, 0, 8));
    p.frame(x + 4, 58, w - 8, 30, 0);
    // tools: pliers, screwdrivers, a hammer that says DEBUGGER
    p.line(x + 12, 62, x + 12, 74, 12);
    p.line(x + 16, 62, x + 16, 72, 14);
    p.line(x + 20, 62, x + 20, 75, 9);
    p.rect(x + 28, 62, 10, 3, 8);
    p.rect(x + 32, 65, 2, 10, 6);
    p.line(x + 44, 62, x + 42, 74, 7);
    p.line(x + 46, 62, x + 48, 74, 7);
    // coils of wire
    p.ellipseO(x + 60, 70, 5, 5, 4);
    p.ellipseO(x + 60, 70, 3, 3, 4);
    p.ellipseO(x + 76, 69, 5, 5, 10);
    // bench top
    p.rect(x, top, w, depth, 15);
    p.hline(x, x + w - 1, top, 7);
    p.rect(x - 1, top + depth, w + 2, 2, 8);
    // legs and a lower shelf with parts bins
    p.rect(x + 1, top + depth + 2, 3, h - 2, 8);
    p.rect(x + w - 4, top + depth + 2, 3, h - 2, 8);
    p.rect(x + 4, z - 6, w - 8, 2, 8);
    for (let k = 0; k < 7; k++) {
      p.rect(x + 8 + k * 16, z - 11, 12, 5, [4, 1, 14, 2, 4, 9, 14][k]);
      p.hline(x + 8 + k * 16, x + 19 + k * 16, z - 11, 15);
    }
    p.hline(x, x + w - 1, z - 1, 0);
    // oscilloscope (trace drawn by overlay)
    p.rect(x + 6, top - 15, 26, 16, 8);
    p.rect(x + 8, top - 13, 15, 11, 0);
    for (let k = 0; k < 3; k++) p.plot(x + 26 + (k % 2) * 2, top - 12 + k * 3, 7);
    p.frame(x + 6, top - 15, 26, 16, 0);
    // soldering station with a curl of smoke
    p.rect(x + 38, top - 4, 10, 5, 4);
    p.line(x + 46, top - 4, x + 52, top - 10, 7);
    // laptop with a brain scan
    p.rect(x + 60, top - 12, 20, 12, 0);
    p.rect(x + 61, top - 11, 18, 10, 1);
    p.ellipse(x + 70, top - 6, 5, 3, 13);
    p.rect(x + 58, top, 24, 2, 8);
    keyboard(p, x + 60, top + 1, 20, 8, 7);
    // a prototype circuit board and loose parts
    p.rect(x + 86, top - 2, 14, 4, 2);
    p.plot(x + 89, top - 1, 14);
    p.plot(x + 93, top, 4);
    p.plot(x + 96, top - 1, 15);
    // coffee mug: Krishna's, says "PhD"
    p.rect(x + 104, top - 5, 4, 5, 15);
    p.plot(x + 108, top - 3, 15);
  });
  // the robot arm, mounted on the right end of the bench
  // (the moving parts are drawn by the overlay; this is the base)
  p.at(z, () => {
    p.rect(x + w - 16, top - 4, 12, 4, 14);
    p.rect(x + w - 13, top - 8, 6, 4, 8);
  });

  // ---------------------------------------------------------------- the NDI helmet on its stand
  p.at(STAND.z, () => {
    const sx = STAND.x,
      sz = STAND.z;
    // pedestal
    p.rect(sx - 9, sz - 4, 19, 4, 8);
    p.hline(sx - 9, sx + 9, sz - 4, 7);
    p.rect(sx - 3, sz - 26, 7, 22, 7);
    p.vline(sx + 3, sz - 26, sz - 5, 8);
    p.rect(sx - 6, sz - 28, 13, 3, 8);
    if (!given) {
      // the helmet: a silver dome bristling with wires
      p.ellipse(sx, sz - 38, 11, 10, 8);
      p.ellipse(sx, sz - 38, 10, 9, 7);
      p.ellipse(sx - 3, sz - 42, 4, 3, 15);
      p.plot(sx - 5, sz - 43, 15);
      p.rect(sx - 11, sz - 38, 23, 8, 8);
      p.rect(sx - 10, sz - 38, 21, 7, 7);
      // visor band
      p.rect(sx - 9, sz - 36, 19, 4, 1);
      p.hline(sx - 8, sx + 8, sz - 36, 9);
      p.hline(sx - 10, sx + 10, sz - 31, 8);
      // ear pods
      p.rect(sx - 13, sz - 37, 3, 5, 8);
      p.rect(sx + 11, sz - 37, 3, 5, 8);
      // antennae with colored tips
      p.line(sx - 5, sz - 46, sx - 9, sz - 53, 8);
      p.line(sx + 5, sz - 46, sx + 9, sz - 53, 8);
      p.line(sx, sz - 47, sx, sz - 52, 8);
      // wires: one to the empty power socket, a couple dangling
      p.line(sx + 12, sz - 33, sx + 15, sz - 24, 0);
      p.line(sx + 15, sz - 24, sx + 14, sz - 7, 0);
      p.line(sx - 12, sz - 33, sx - 14, sz - 26, 4);
      p.line(sx - 14, sz - 26, sx - 11, sz - 22, 4);
      p.line(sx - 6, sz - 30, sx - 7, sz - 25, 2);
    } else {
      p.rect(sx - 4, sz - 30, 9, 2, 0);
    }
    // little sign on the pedestal
    p.rect(sx - 5, sz - 20, 11, 6, 15);
    p.micro(sx - 4, sz - 19, 'NDI', 1);
  });
  // a power socket box at the foot of the stand: "20,000 mAh+"
  p.at(STAND.z + 1, () => {
    p.rect(STAND.x + 10, STAND.z - 7, 8, 7, given ? 8 : 0);
    p.frame(STAND.x + 10, STAND.z - 7, 8, 7, 8);
  });
  shadow(p, STAND.x, STAND.z + 1, 10, 1);

  // ---------------------------------------------------------------- the 3D printer
  p.at(PRINTER.z, () => {
    const px = PRINTER.x;
    // little table
    p.rect(px - 4, PRINTER.z - 16, 36, 3, 6);
    p.rect(px - 2, PRINTER.z - 13, 2, 13, 8);
    p.rect(px + 28, PRINTER.z - 13, 2, 13, 8);
    // printer frame
    p.rect(px, PRINTER.z - 44, 28, 28, 0);
    p.frame(px, PRINTER.z - 44, 28, 28, 8);
    p.rect(px + 2, PRINTER.z - 42, 24, 22, dith(0, 1, 3));
    p.rect(px + 2, PRINTER.z - 20, 24, 3, 8);
    p.rect(px + 2, PRINTER.z - 44, 24, 2, 4);
    // spool on top
    p.ellipse(px + 14, PRINTER.z - 47, 4, 3, 14);
    p.ellipse(px + 14, PRINTER.z - 47, 1, 1, 0);
  });
}

// ---------------------------------------------------------------- Krishna

function cycle(g: Game, key: string, list: string[]): string {
  const i = (g.flag(key) ?? 0) % list.length;
  g.inc(key);
  return list[i];
}

const BEFORE = [
  'Twenty thousand milliamp-hours, minimum. A phone power bank is usually ten. I need something absurd. Something a person who is constantly on their phone, selling things, would carry.',
  "Adriana's vitals are steady. Heart rate seventy-two. Brain activity: extremely busy. Wherever she is in there, she's thinking very hard.",
  "The NDI translates a system's state into something your brain understands: places, people, objects. The Monolith's code is so old I expect it will look... medieval. With dragons. Probably dragons.",
  'Please do not touch the robot arm. It has a temper. I programmed the temper. That was a mistake.',
];
const AFTER = [
  'Remember: the Monolith speaks DB-25. Denis has the adapter. Denis has every adapter. Denis IS an adapter.',
  "When you're inside, things will look strange. Trust your instincts. And if you find Adriana, tell her I want my prototype back. In one piece. Her too.",
  "If you get stuck in there, talk something through. Out loud. To anyone. Even a rubber duck. Especially a rubber duck. The NDI does very interesting things with a strong mental model.",
  "Don't use the helmet up here. Without the Monolith on the other end, it's a very expensive hat. It also gives you a very funny haircut.",
];

async function approachKrishna(g: Game) {
  const k = g.actor('krishna');
  if (!k) return;
  k.data.busy = true;
  k.pose = null;
  const x = g.player.x < k.x ? k.x - 22 : k.x + 22;
  await g.approach([x, k.y + 2]);
  k.faceToward(g.player.x, g.player.y);
  g.player.faceToward(k.x, k.y);
}

function release(g: Game) {
  const k = g.actor('krishna');
  if (!k) return;
  k.data.busy = false;
  k.dir = 'up';
}

async function krishnaStops(g: Game, text: string) {
  const k = g.actor('krishna');
  if (k) {
    k.data.busy = true;
    k.pose = null;
    k.faceToward(g.player.x, g.player.y);
  }
  await g.talk('krishna', text);
  release(g);
}

export const lab: RoomDef = {
  id: 'lab',
  title: 'R&D Lab',
  act: 1,
  music: 'office',
  start: [160, 182, 'up'],
  draw: paint,
  walk: [[0, SEAM + 8, 320, SEAM + 8, 320, 189, 0, 189]],
  blocks: [
    [98, 104, 128, 18], // bench
    [6, 104, 34, 31], // cable drawer
    [STAND.x - 10, STAND.z - 6, 21, 8], // helmet stand
    [PRINTER.x - 6, PRINTER.z - 12, 40, 13], // printer table
    [KRISHNA[0] - 5, KRISHNA[1] - 3, 10, 5],
  ],
  look: (g) =>
    `The R&D lab: part workshop, part science fair, part fire hazard. There's a workbench crowded with an oscilloscope, a laptop and a robot arm; a 3D printer humming in the corner; a whiteboard with a diagram of a brain; and a cabinet whose label simply reads CABLE DRAWER OF DESPAIR.\n\n${
      g.flag('helmet_given')
        ? 'The helmet stand in the middle of the room is empty. The helmet is with you.'
        : 'In the middle of the room, on a pedestal, sits a silver helmet bristling with wires, sparking gently.'
    }`,
  hotspots: [
    {
      id: 'helmet',
      nouns: ['helmet', 'ndi', 'ndi helmet', 'neural debugging interface', 'interface', 'prototype', 'v2', 'silver helmet', 'headset'],
      area: [STAND.x - 14, STAND.z - 55, 29, 26],
      at: [STAND.x - 20, STAND.z + 2],
      when: (g) => !g.flag('helmet_given'),
      look: 'The Neural Debugging Interface, version two: a silver dome bristling with wires, antennae and blinking LEDs, with an optional chin strap. It sparks every few seconds, like it\'s thinking about something. A cable runs from it to an empty socket labeled "20,000 mAh+ ONLY".',
    },
    {
      id: 'stand',
      nouns: ['stand', 'pedestal', 'helmet stand', 'socket', 'power socket', 'safety line'],
      area: [STAND.x - 10, STAND.z - 30, 30, 30],
      at: [STAND.x - 20, STAND.z + 2],
      look: (g) => (g.flag('helmet_given') ? 'The helmet stand, empty now, with a little sign that says NDI.' : 'A chrome pedestal with a little sign that says NDI, inside a yellow safety line. At its base, an empty power socket labeled "20,000 mAh+ ONLY."'),
    },
    {
      id: 'bench',
      nouns: ['bench', 'workbench', 'work bench', 'table', 'pegboard', 'tools', 'parts', 'bins', 'parts bins', 'soldering iron', 'circuit board'],
      area: [100, 56, 124, 66],
      at: [128, 132],
      look: "Krishna's workbench: a pegboard of tools, a soldering station, parts bins in every color, a laptop showing a brain scan, an oscilloscope, a prototype circuit board, and a mug that says PhD. Everything is labeled. Some labels are labeled.",
    },
    {
      id: 'scope',
      nouns: ['oscilloscope', 'scope', 'trace', 'heartbeat', 'waveform'],
      area: [104, 80, 30, 18],
      at: [118, 132],
      look: "An oscilloscope. Krishna has it hooked up to the building's power line, so the trace shows the Monolith's heartbeat, more or less. Right now it looks less like a heartbeat and more like a panic attack.",
    },
    {
      id: 'laptop',
      nouns: ['laptop', 'brain scan', 'scan'],
      area: [158, 84, 24, 16],
      at: [168, 132],
      look: "A laptop showing a brain scan with a big area lit up and labeled \"debugging cortex.\" You're fairly sure that's not a real part of the brain. Krishna is fairly sure it is now.",
    },
    {
      id: 'arm',
      nouns: ['robot arm', 'arm', 'robot', 'robotic arm', 'claw', 'gripper'],
      area: [204, 52, 26, 50],
      at: [214, 128],
      look: "A robotic arm bolted to the end of the bench, slowly turning to follow you around the room. It has a little sticky note on it that says \"DO NOT TOUCH. HAS OPINIONS.\"",
    },
    {
      id: 'printer',
      nouns: ['3d printer', 'printer', 'spool', 'filament', 'print'],
      area: [PRINTER.x - 4, PRINTER.z - 52, 36, 52],
      at: [PRINTER.x - 6, PRINTER.z + 6],
      look: 'A 3D printer, humming away. On the print bed, layer by careful layer, a tiny rubber duck is taking shape. It is forty percent done. It will be done sometime on Tuesday.',
    },
    {
      id: 'drawer',
      nouns: ['cable drawer', 'cable drawer of despair', 'drawer', 'drawers', 'cabinet', 'cables', 'cable', 'despair'],
      area: [7, 95, 32, 40],
      at: [44, 140],
      look: 'A gray cabinet labeled, in Krishna\'s neat handwriting, "CABLE DRAWER OF DESPAIR." The middle drawer cannot close, because the cables inside have formed a single, writhing organism.',
    },
    {
      id: 'whiteboard',
      nouns: ['whiteboard', 'white board', 'board', 'brain', 'brain diagram', 'diagram'],
      area: [34, 18, 62, 42],
      at: [64, 116],
      look: 'A whiteboard with a diagram of a brain, an arrow, and a box labeled MONOLITH. Underneath: "NDI V2 = ?!" Somebody has added a little stick figure inside the box, waving.',
    },
    {
      id: 'vitals',
      nouns: ['vitals', 'vitals monitor', 'heart monitor', 'heart rate', 'adrianas vitals', 'ekg', 'ecg'],
      area: [225, 21, 50, 32],
      at: [248, 118],
      look: "A monitor on the wall labeled ADRIANA. A steady green heartbeat trace, and the words VITALS OK. Krishna's been watching it like a hawk. Wherever Adriana is right now, her body is fine. It's the rest of her that's somewhere else.",
    },
    {
      id: 'poster',
      nouns: ['poster', 'safety poster', 'goggles', 'safety goggles', 'eyes'],
      area: [9, 23, 20, 26],
      at: [24, 116],
      look: 'A safety poster: a pair of goggles and the word EYES. It used to say PROTECT YOUR EYES, but someone cut out the other words. Now it just says EYES, which is somehow more threatening.',
    },
  ],
  exits: [{ area: [0, 186, 320, 4], to: 'hallway', at: HALL_ARRIVE.lab, dir: 'south|out' }],
  enter(g) {
    const k = addNpc(g, 'krishna', KRISHNA[0], KRISHNA[1], 'up');
    k.data.gap = 22;
    k.behavior = (a, t) => {
      if (a.data.busy || a.talking || g.busy) return;
      const ph = t % 300;
      a.pose = (ph > 100 && ph < 130) || (ph > 200 && ph < 215) ? 'reach' : null;
      if (ph === 260) a.dir = 'left';
      if (ph === 290) a.dir = 'up';
    };
  },
  afterEnter: async (g) => {
    if (g.flag('lab_greeted')) return;
    g.set('lab_greeted');
    await g.wait(400);
    const k = g.actor('krishna');
    if (k) {
      k.data.busy = true;
      k.dir = 'down';
    }
    await g.talk('krishna', "Dominic! You badged in! The door locks are on the Monolith too, so I've been in here for two hours with nothing but snacks and SCIENCE. Come, come! Look at this!");
    release(g);
  },
  overlay(g, s, t) {
    const { x, z, h, depth, w } = BENCH;
    const top = z - h - depth;
    // oscilloscope: a jittery panicked waveform
    const ox = x + 8,
      oy = top - 13;
    s.rect(ox, oy, 15, 11, 0);
    s.hline(ox, ox + 14, oy + 5, 2);
    let py = oy + 5;
    for (let k = 0; k < 15; k++) {
      const v = Math.round(Math.sin((k + t / 3) * 0.9) * 3 + (((k * 7 + (t >> 2)) % 5) - 2) * 0.6);
      const yy = Math.max(oy, Math.min(oy + 10, oy + 5 + v));
      s.vline(ox + k, Math.min(py, yy), Math.max(py, yy), 10);
      py = yy;
    }
    // soldering smoke
    const sp = (t >> 3) % 8;
    s.plot(x + 52 + (sp % 2), top - 11 - sp, 7);
    // Adriana's heartbeat
    const hx = 230,
      hy = 36;
    s.rect(hx, hy - 4, 40, 8, 0);
    for (let k = 0; k < 40; k++) {
      const ph = (k + (t >> 1)) % 20;
      const v = ph === 8 ? -4 : ph === 9 ? 3 : ph === 10 ? -1 : 0;
      s.plot(hx + k, hy + v, 10);
    }
    // the robot arm: slowly sweeping
    const bx = x + w - 10,
      by = top - 8;
    const a1 = -Math.PI / 2 + Math.sin(t / 90) * 0.5;
    const ex = bx + Math.cos(a1) * 18,
      ey = by + Math.sin(a1) * 18;
    const a2 = a1 + 1.2 + Math.sin(t / 50) * 0.4;
    const hx2 = ex + Math.cos(a2) * 14,
      hy2 = ey + Math.sin(a2) * 14;
    s.line(bx, by, ex, ey, 14, 2);
    s.line(ex, ey, hx2, hy2, 14, 2);
    s.rect(Math.round(ex) - 1, Math.round(ey) - 1, 3, 3, 8);
    s.plot(Math.round(hx2) - 1, Math.round(hy2), 0);
    s.plot(Math.round(hx2) + 1, Math.round(hy2) + 1, 0);
    s.plot(Math.round(hx2), Math.round(hy2) + 2, 0);
    // 3D printer head going back and forth, a tiny duck growing
    const px = PRINTER.x,
      pz = PRINTER.z;
    const head = px + 5 + Math.round((Math.sin(t / 15) + 1) * 8);
    s.hline(px + 2, px + 25, pz - 36, 8);
    s.rect(head, pz - 37, 4, 3, 7);
    s.plot(head + 1, pz - 34, 12);
    s.rect(px + 11, pz - 24, 6, 3, 14);
    s.rect(px + 14, pz - 26, 3, 2, 14);
    s.plot(px + 17, pz - 25, 6);
    // the helmet: blinking LEDs and the occasional spark
    if (!g.flag('helmet_given')) {
      const sx = STAND.x,
        sz = STAND.z;
      const on = Math.floor(t / 12) % 4;
      s.plot(sx - 6, sz - 34, on === 0 ? 12 : 11);
      s.plot(sx - 2, sz - 34, on === 1 ? 10 : 11);
      s.plot(sx + 2, sz - 34, on === 2 ? 14 : 11);
      s.plot(sx + 6, sz - 34, on === 3 ? 13 : 11);
      s.plot(sx - 9, sz - 54, Math.floor(t / 20) % 2 ? 12 : 4);
      s.plot(sx + 9, sz - 54, Math.floor(t / 20) % 2 ? 4 : 10);
      s.plot(sx, sz - 53, Math.floor(t / 33) % 2 ? 14 : 6);
      const sp2 = t % 170;
      if (sp2 < 10) {
        const r = rng(Math.floor(t / 170) + 3);
        const cx = sx + Math.floor(r() * 22) - 11,
          cy = sz - 48 + Math.floor(r() * 12);
        s.plot(cx, cy, 15);
        s.plot(cx + 1, cy - 1, 14);
        s.plot(cx - 1, cy + 1, 14);
        if (sp2 < 4) {
          s.plot(cx + 2, cy - 2, 11);
          s.plot(cx - 2, cy - 1, 11);
        }
      }
    } else {
      // the socket now glows with borrowed sales power
      s.plot(STAND.x + 13, STAND.z - 4, Math.floor(t / 30) % 2 ? 11 : 9);
    }
  },
  nouns: { ...BASE_NOUNS, ...itemNouns(['powerbank', 'phone', 'esckey', 'candy', 'coffee', 'duck', 'keycard', 'badge']), ...COMPUTER_NOUNS },
  verbs: {
    'look krishna': async (g) =>
      g.say(
        "Krishna: R&D genius, glasses, crisp white lab coat with seven pens in the pocket. He has the delighted, slightly unhinged look of a man whose experiment is about to get its first real test. You suspect you are the experiment.",
      ),
    'talk krishna,ask krishna ?,tell krishna ?,say krishna,hello krishna': async (g, c) => {
      await approachKrishna(g);
      const topic = c.noun2 ?? '';
      const topics: Record<string, string> = {
        adriana: "She took the v1 prototype down to the Monolith three hours ago, before the crash, to chase a weird date bug. She plugged in and hasn't come out. Her vitals are fine. She's just... in there.",
        denis: 'Denis has been looking after the Monolith since before I was born. He has every cable ever made. I once asked him for a FireWire 400 to 800 adapter, and he handed it to me without looking.',
        helmet: 'Neural Debugging Interface, version two. Better shielding, a proper logout routine, and a stylish chin strap.',
        arm: 'His name is Gerald. Do not make eye contact.',
        mike: "Mike? Lovely man. Sold a client a feature called 'Quantum Sync' this morning. I've been asked to build it. I don't know what it is.",
      };
      if (topic && topics[topic]) {
        await g.talk('krishna', topics[topic]);
        return release(g);
      }
      if (g.flag('helmet_given')) {
        await g.talk('krishna', cycle(g, 'krishna_after_i', AFTER));
        return release(g);
      }
      if (!g.flag('krishna_talked')) {
        g.set('krishna_talked');
        await convo(g, [
          ['krishna', "Behold! The Neural Debugging Interface. Version two. It maps your consciousness onto a running system, so you can debug it from the INSIDE. Walk the call stack! Shake hands with the threads! Look a race condition right in the eye!"],
          ['me', 'That sounds incredibly unsafe.'],
          ['krishna', "Incredibly! But also incredibly effective. Adriana took the v1 prototype down to the Monolith three hours ago, to chase a strange date bug in the core."],
          ['krishna', "She hasn't come out. Her vitals are fine, I'm watching them on that monitor. Heart rate normal. Brain activity... very busy. But she isn't responding."],
          ['krishna', "The v2 is ready. But the building's power is unstable, and if the power blinks while you're inside, the session drops, and... let's not finish that sentence."],
          ['krishna', 'I need a battery. A BIG one. Twenty thousand milliamp-hours, at least. Who carries a battery that big around an office?'],
        ]);
        return release(g);
      }
      await g.talk('krishna', g.has('powerbank') ? 'Is that... is that a power bank in your hand? How many milliamp-hours? No, don\'t tell me. Just GIVE it to me.' : cycle(g, 'krishna_before_i', BEFORE));
      release(g);
    },
    'give|show powerbank krishna,put|plug powerbank stand|helmet,use powerbank stand|helmet,plug helmet powerbank,give powerbank': async (g) => {
      if (!g.has('powerbank')) return false;
      await approachKrishna(g);
      await convo(g, [
        ['me', 'Will forty thousand milliamp-hours do?'],
        ['krishna', "FORTY THOUSAND? That's not a power bank, that's a small nation's power grid! Where did you get... is this Mike's? Never mind. Don't tell me. Plausible deniability."],
      ]);
      g.removeItem('powerbank');
      const k = g.actor('krishna');
      if (k) {
        await g.walk(k, STAND.x - 16, STAND.z + 2, { direct: true });
        k.dir = 'right';
        await g.pose(k, 'reach', 600);
        g.sfx('zap');
        g.flash(11, 100);
        await g.pose(k, 'reach', 600);
      }
      g.set('helmet_given');
      g.redraw();
      await g.say("Krishna wires the power bank into the helmet with a soldering iron, three zip ties and a great deal of muttering. The helmet's lights flicker... then glow a steady, confident blue. He lifts it off the stand.");
      if (k) {
        await g.walk(k, g.player.x < STAND.x ? g.player.x + 20 : g.player.x - 20, g.player.y, { direct: true });
        k.faceToward(g.player.x, g.player.y);
        g.player.faceToward(k.x, k.y);
      }
      await convo(g, [
        ['krishna', "Stable power! Beautiful. It's yours. Wear it at the Monolith, not before. Out here, it's just a very expensive hat."],
        ['krishna', "One thing: the Monolith's port is a DB-25 serial port from 1987. You'll need an adapter. Denis has every cable ever made."],
      ]);
      g.addItem('helmet');
      award(g, 'give_bank_krishna');
      await g.pose(null, 'reach', 400);
      await g.say('Krishna hands you the Neural Debugging Interface. It is heavier than it looks, warm, and humming faintly, like it knows where it is going.');
      if (k) {
        await g.walk(k, KRISHNA[0], KRISHNA[1], { direct: true });
        k.dir = 'up';
      }
      release(g);
    },
    'give|show * krishna': async (g, c) => {
      if (!c.noun || !g.has(c.noun)) return false;
      await approachKrishna(g);
      const lines: Record<string, string> = {
        phone: "A phone with zero percent battery. I'm sorry for your loss. No, this won't power the helmet. Phones are tiny. I need a brick.",
        keyboard: "Ooh, the Rainbow Warrior! Nicholas's pride and joy. Lovely LEDs. Pathetic battery for my purposes, though. I need twenty thousand milliamp-hours, not twenty thousand colors.",
        esckey: 'An ESC key. Very philosophical. Keep it. You may need to escape something someday.',
        candy: 'Tempting, but no. Sugar makes my hands shake, and I solder for a living.',
        coffee: "Coffee? I don't drink coffee. I simply vibrate at a naturally high frequency.",
        duck: 'A rubber duck! For debugging! Hold on to that. The NDI does very interesting things with a strong mental model.',
        helmet: "Keep it! It's yours now. Bring it back in one piece. Bring YOURSELF back in one piece, too.",
        keycard: "Phil's master keycard! He let you have it? You must have brought him paperwork.",
        badge: "Yes, yes, I know who you are. Your badge photo is very... young.",
      };
      await g.talk('krishna', lines[c.noun] ?? "Interesting! Useless for my purposes, but interesting. I need a battery: twenty thousand milliamp-hours or more.");
      release(g);
    },
    'take helmet,wear helmet,use helmet,touch helmet,take stand': async (g, c) => {
      if (g.flag('helmet_given') || g.has('helmet')) return false;
      if (c.noun === 'stand' && c.verb === 'take') return void (await g.say("It's bolted to the floor, inside a yellow safety line. Krishna takes his safety lines very seriously."));
      await g.approach([STAND.x - 20, STAND.z + 2]);
      g.player.dir = 'right';
      await g.pose(null, 'reach', 300);
      await krishnaStops(g, "Ah! No no no! It's not powered! You'd just be wearing a very expensive hat. Find me a battery. Twenty thousand milliamp-hours, at least.");
    },
    'turnon helmet,plug helmet': async (g) => {
      if (g.flag('helmet_given')) return false;
      await krishnaStops(g, "It needs power first! The building's mains are too unstable. Twenty thousand milliamp-hours of battery, minimum. Something big. Something brick-like.");
    },
    'touch|use|push|shake|attack arm,talk arm,take arm': async (g) => {
      await g.approach('arm');
      g.sfx('thud');
      await g.say('You reach toward the robot arm. It swivels to face you, opens its gripper, and makes a gesture that is very rude in at least three cultures.');
      await krishnaStops(g, "Sorry! Sorry. Gerald is in a mood. I gave him a personality module. In hindsight, I gave him MY personality module.");
    },
    'open|search drawer,look/in drawer,take cable|drawer,search cable': async (g, c) => {
      await g.approach('drawer');
      await g.pose(null, 'reach', 400);
      if (c.verb === 'take') {
        await g.say("You tug on a cable. The entire drawer tugs back. The cables have become a single organism, and it has decided to keep you.");
        return void (await krishnaStops(g, "Careful! Don't pull. If you need a cable, ask Denis. He knows where every cable in the world is. Mine are... emotionally unavailable."));
      }
      await g.say('You open the CABLE DRAWER OF DESPAIR. Inside: USB-A, USB-B, mini-USB, micro-USB, three kinds of Lightning, FireWire, PS/2, SCSI, a VGA cable with all of its pins bent, and one cable that appears to be both ends of itself.\n\nNo DB-25, though. Nobody has a DB-25. Nobody except, possibly, Denis.');
    },
    'close drawer': 'The drawer cannot close. The cables will not allow it.',
    'use|turnon|turnoff printer,take printer,look/in printer': async (g) => {
      await g.approach('printer');
      await g.say("The 3D printer is busy printing a tiny rubber duck. Forty percent done. You don't want to interrupt it. Interrupted 3D prints become modern art.");
    },
    'look light': "The overhead lights are dark; the lab runs on the glow of monitors, the oscilloscope, and whatever the helmet is doing. Every few seconds, it sparks, and the whole room flickers like a thunderstorm in a very small box.",
    'look computer': async (g) => g.say(lab.hotspots!.find((h) => h.id === 'laptop')!.look as string),
    'use|type laptop,use computer,type,type ?': async (g) => {
      await g.approach('laptop');
      await krishnaStops(g, "Please don't touch the laptop! It's calibrating the debugging cortex. If you open a browser tab right now, Adriana might start dreaming about cookie banners.");
    },
    'use|touch|turnon scope': async (g) => {
      await g.approach('scope');
      await g.say("You fiddle with the oscilloscope's knobs. The trace gets bigger, then smaller, then exactly as panicked as before.");
    },
    'take|use|turnon bench,use soldering iron,take tools': async (g) => {
      await krishnaStops(g, "Please don't touch anything on the bench. Everything there is either very hot, very sharp, or very load-bearing for Monday's demo.");
    },
    'type|use whiteboard,take whiteboard': "You pick up a marker, add a tiny question mark to the brain, and put the marker down. Science.",
    'take vitals,touch vitals,fix vitals': async (g) => {
      await krishnaStops(g, "Don't touch that! That's Adriana's heart rate. As long as it's steady, she's okay. I'd like to keep it that way.");
    },
    'take poster': 'EYES stays on the wall. EYES is watching.',
    'sit,sit *': "The only chair in the lab is a stool with three legs of different lengths. Krishna claims it's an 'active sitting experience.' You stay standing.",
    'smell,smell ?': 'The lab smells like solder, hot plastic, and faintly of ozone from the helmet. It smells like the future, if the future were slightly on fire.',
  },
};
