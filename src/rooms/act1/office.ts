// The Open Office: Nicholas, Aidan (hiding), Mike (after the candy), the
// architecture whiteboard and the outage counter. Exits: Phil (left),
// cubicle aisle (bottom-left), elevator lobby (right).
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, rng, microWidth } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { Actor } from '../../engine/actor';
import { officeWindow, monitor, codeLines, keyboard, mug, plant, fluorescent, whiteboard, partition } from '../../art/lib';
import {
  ceilingBand,
  sideWallL,
  sideWallR,
  lerpY,
  quad,
  exitSign,
  workDesk,
  frontDesk,
  chairBack,
  chairToppled,
  tallPlant,
  waterCooler,
  alertScreen,
  box,
  segDigit,
  aidanCrouch, BASE_NOUNS, itemNouns, COMPUTER_NOUNS } from '../../art/office_props';
import { award } from '../../content/points';
import { addNpc, convo } from '../../content/helpers';

// ---- geometry
const SEAM = 100; // back wall / floor seam
const LX = 34; // left back corner
const RX = 286; // right back corner
const LF0 = 128; // left wall floor line at screen edge
const RF0 = 128;
const NICK: [number, number] = [92, 141];
const AIDAN_HIDE: [number, number] = [206, 137];
const AIDAN_SIT: [number, number] = [206, 143];
const MIKE: [number, number] = [262, 113];

const lfloor = (x: number) => lerpY(0, LF0, LX, SEAM, x);
const rfloor = (x: number) => lerpY(RX, SEAM, 320, RF0, x);

function paint(p: Surface, g: Game) {
  const helped = !!g.flag('nick_helped');
  const comforted = !!g.flag('aidan_comforted');
  const mikeHere = !!g.flag('candy_bought');

  // ---------------------------------------------------------------- floor (walls are painted over it)
  p.rect(0, 0, 320, 190, 7);
  p.rect(0, SEAM, 320, 190 - SEAM, 8);
  p.gradV(LX, SEAM, RX - LX, 8, [0, 8]);
  p.speckle(0, SEAM + 2, 320, 88, 0, 0.02, 41);
  // ---------------------------------------------------------------- walls
  // back wall: light gray with a corporate-blue wainscot
  p.rect(LX, 12, RX - LX, SEAM - 12, 7);
  p.gradV(LX, 12, RX - LX, 4, [8, 7]);
  p.rect(LX, 78, RX - LX, SEAM - 78, 1);
  p.hline(LX, RX, 77, 9);
  p.hline(LX, RX, 78, 15);
  p.hline(LX, RX, 76, 8);
  // side walls (slightly shaded)
  sideWallL(p, LX, -8, LF0, 12, SEAM, 7);
  sideWallR(p, RX, -8, RF0, 12, SEAM, 7);
  // side-wall wainscot in perspective
  p.poly([0, lerpY(0, 91, LX, 77, 0), LX, 77, LX, SEAM, 0, LF0], 1);
  p.line(0, 90, LX, 76, 9);
  p.line(0, 91, LX, 77, 15);
  p.poly([RX, 77, 320, 90, 320, RF0, RX, SEAM], 1);
  p.line(RX, 76, 320, 90, 9);
  p.line(RX, 77, 320, 91, 15);
  ceilingBand(p, LX, RX, 12, 7);
  // fluorescent fixtures (unlit: the building is on emergency power)
  fluorescent(p, 100, 3, 36, false);
  fluorescent(p, 160, 3, 36, false);
  fluorescent(p, 220, 3, 36, false);

  // ---------------------------------------------------------------- floor
  // baseboards
  p.rect(LX, SEAM - 2, RX - LX, 2, 0);
  p.line(0, LF0 - 1, LX, SEAM - 1, 0);
  p.line(RX, SEAM - 1, 320, RF0 - 1, 0);
  // the blue aisle runner back to the cubicles (bottom-left)
  p.poly([0, 165, 52, 165, 78, 190, 0, 190], 1);
  p.line(0, 165, 52, 165, 9);
  p.line(52, 165, 78, 189, 9);
  p.speckle(0, 167, 70, 23, 0, 0.03, 8);

  // ---------------------------------------------------------------- left wall: Phil's door
  const nx = 7,
    fx = 25;
  const nyb = lfloor(nx),
    fyb = lfloor(fx);
  const nyt = nyb - 50,
    fyt = fyb - 45;
  quad(p, nx - 2, nyb, nyt - 3, fx + 2, fyt - 2, fyb, 8); // frame
  quad(p, nx - 1, nyb, nyt - 2, fx + 1, fyt - 1, fyb, 6);
  // the oak door, standing ajar: warm dusk light spills through the gap
  quad(p, nx, nyb, nyt, fx, fyt, fyb, 6);
  quad(p, fx - 3, fyb, fyt, fx, fyt, fyb, 13);
  p.line(fx - 1, fyt + 2, fx - 1, fyb - 1, 14);
  p.line(fx - 3, fyt, fx - 3, fyb, 0);
  // recessed panels
  const pl = (t0: number, t1: number) => quad(p, nx + 3, lerpY(0, nyb, 1, nyt, t1), lerpY(0, nyb, 1, nyt, t0), fx - 6, lerpY(0, fyb, 1, fyt, t0), lerpY(0, fyb, 1, fyt, t1), 4);
  pl(0.1, 0.45);
  pl(0.55, 0.9);
  // brass knob
  p.rect(fx - 6, Math.round((fyb + fyt) / 2) + 1, 2, 2, 14);
  // brass name plate
  p.poly([nx + 2, nyt - 10, fx - 2, fyt - 8, fx - 2, fyt - 4, nx + 2, nyt - 5], 14);
  p.line(nx + 3, nyt - 7, fx - 4, fyt - 6, 6);

  // ---------------------------------------------------------------- right wall: lobby doorway
  const rnx = 313,
    rfx = 295;
  const rnb = rfloor(rnx),
    rfb = rfloor(rfx);
  quad(p, rnx + 2, rnb, rnb - 53, rfx - 2, rfb - 48, rfb, 8);
  quad(p, rnx, rnb, rnb - 50, rfx, rfb - 46, rfb, 7);
  // lobby beyond: lighter tile floor and a far wall
  quad(p, rnx, rnb, rnb - 50, rfx, rfb - 46, rfb, 15);
  quad(p, rnx, rnb - 22, rnb - 50, rfx, rfb - 46, rfb - 20, 7);
  quad(p, rnx, rnb, rnb - 12, rfx, rfb - 10, rfb, 7);
  p.line(rfx, rfb - 10, rnx, rnb - 12, 8);
  p.line(rfx, rfb - 20, rnx, rnb - 22, 8);
  exitSign(p, 293, rfb - 60, 'EXIT');

  // ---------------------------------------------------------------- back wall dressing
  // the ARCHITECTURE whiteboard
  whiteboard(p, 42, 24, 72, 42);
  p.micro(54, 26, 'ARCHITECTURE', 1);
  p.hline(54, 100, 32, 1);
  // little boxes for every system, all arrowing into the MONOLITH
  const sysBox = (bx: number, by: number, lbl: string, col: number) => {
    const w = microWidth(lbl) + 4;
    p.frame(bx, by, w, 8, col);
    p.micro(bx + 2, by + 2, lbl, col);
  };
  sysBox(45, 35, 'WEB', 2);
  sysBox(45, 56, 'API', 2);
  sysBox(99, 35, 'DB', 9);
  sysBox(99, 56, 'HR', 9);
  sysBox(70, 56, 'CRM', 5);
  // the big box
  p.rect(59, 42, 40, 11, 15);
  p.frame(59, 42, 40, 11, 0);
  p.hline(60, 97, 53, 8);
  p.micro(62, 45, 'MONOLITH', 0);
  const arrow = (x0: number, y0: number, x1: number, y1: number, col = 0) => {
    p.line(x0, y0, x1, y1, col);
    p.plot(x1 - Math.sign(x1 - x0), y1, col);
    p.plot(x1, y1 - Math.sign(y1 - y0), col);
  };
  arrow(56, 43, 59, 45);
  arrow(56, 57, 59, 51);
  arrow(102, 43, 98, 45);
  arrow(102, 56, 98, 51);
  arrow(77, 56, 77, 54);
  // a long desperate arrow from HR all the way round to WEB
  p.line(107, 64, 107, 65, 1);
  p.line(52, 65, 107, 65, 1);
  p.line(48, 65, 48, 64, 1);
  // the mystery
  p.micro(87, 35, '???', 4);
  arrow(91, 41, 88, 43, 4);

  // windows with the dusk skyline
  officeWindow(p, 124, 18, 104, 40, { seed: 51, time: 'dusk', panes: 3 });

  // DAYS SINCE LAST OUTAGE sign
  p.rect(238, 18, 44, 30, 15);
  p.frame(238, 18, 44, 30, 0);
  p.rect(239, 19, 42, 6, 2);
  p.micro(242, 20, 'SAFETY', 15);
  p.micro(241, 27, 'DAYS SINCE', 0);
  p.micro(241, 33, 'LAST OUTAGE', 0);
  p.rect(254, 38, 12, 9, 0);
  p.frame(253, 37, 14, 11, 8);
  // (the digit itself is drawn by the overlay so it can blink)

  // corner plant in the back-left
  tallPlant(p, 42, 106, 36, 7);

  // distant cubicle row under the windows (red monitors)
  p.at(104, () => {
    partition(p, 122, 84, 108, 18, 8, 7);
    for (let x = 126; x < 228; x += 18) {
      p.vline(x - 2, 84, 101, 7);
      p.rect(x + 3, 80, 9, 5, 0);
      p.rect(x + 4, 81, 7, 3, 4);
    }
    p.hline(122, 229, 101, 0);
  });

  // water cooler between whiteboard and cubicles
  waterCooler(p, 116, 105);

  // ---------------------------------------------------------------- Mike's desk (sales corner)
  // high-back chair behind the desk (background priority so Mike draws over it)
  p.rect(256, 78, 13, 22, 0);
  p.rect(257, 79, 11, 20, dith(0, 8, 3));
  p.hline(257, 267, 78, 8);
  const mTop = frontDesk(p, 236, 121, 50, { top: 6, body: 6, trim: 14, h: 18, depth: 6 });
  p.at(121, () => {
    // nameplate
    p.rect(249, mTop + 1, 23, 6, 0);
    p.rect(250, mTop + 1, 21, 5, 14);
    p.micro(251, mTop + 1, 'SALES', 0);
    // trophy: SALESPERSON OF THE YEAR 2019
    p.rect(275, mTop - 3, 7, 3, 0);
    p.rect(277, mTop - 6, 3, 3, 14);
    p.rect(275, mTop - 11, 7, 5, 14);
    p.plot(274, mTop - 10, 14);
    p.plot(282, mTop - 10, 14);
    p.vline(276, mTop - 10, mTop - 8, 15);
    // desk phone with blinking-message light (overlay)
    p.rect(239, mTop - 3, 9, 4, 0);
    p.rect(240, mTop - 5, 7, 2, 8);
    // business card stack, papers
    p.rect(250, mTop - 1, 6, 2, 15);
    p.rect(264, mTop, 8, 2, 7);
    if (!mikeHere) {
      // a lonely headset waits
      p.plot(260, mTop - 3, 8);
      p.plot(261, mTop - 4, 8);
      p.plot(262, mTop - 3, 8);
    }
  });

  // ---------------------------------------------------------------- Nicholas's desk: a keyboard shrine
  const nTop = workDesk(p, 52, 138, 80, { h: 15, depth: 6, top: 15, edge: 7, body: 7, knee: [76, 110], pedestal: 'left' });
  p.at(138, () => {
    // twin monitors
    monitor(p, 69, nTop - 20, 24, 16, 1, { bezel: 0 });
    monitor(p, 95, nTop - 20, 24, 16, 15, { bezel: 0 });
    codeLines(p, 71, nTop - 18, 20, 12, 7, [10, 11, 13, 14, 15]);
    // the stack of keyboards (left end)
    const kc = [13, 10, 14, 11, 12];
    for (let i = 0; i < 5; i++) {
      const y = nTop - 2 - i * 3;
      p.rect(53, y, 14, 3, i % 2 ? 0 : 8);
      for (let k = 54; k < 66; k += 2) p.plot(k, y + 1, kc[(k + i) % kc.length]);
    }
    // more keyboards on a little stand on the right end
    p.rect(121, nTop - 10, 2, 10, 8);
    p.rect(128, nTop - 10, 2, 10, 8);
    for (let i = 0; i < 3; i++) {
      const y = nTop - 10 + i * 4;
      p.rect(120, y, 11, 2, i === 1 ? 15 : 0);
      for (let k = 121; k < 130; k += 2) p.plot(k, y, kc[(k + i * 2) % kc.length]);
    }
    // his keyboard and a mug
    keyboard(p, 82, nTop + 1, 22, 0, 12);
    mug(p, 111, nTop - 3, 4);
  });
  // boxes of keyboards on the floor beside the desk
  box(p, 34, 140, 14, 10, 'KB');
  box(p, 36, 131, 11, 8);
  chairBack(p, NICK[0], NICK[1] + 4, 0, { hl: 4 });

  // ---------------------------------------------------------------- Aidan's desk
  const aTop = workDesk(p, 170, 138, 68, { h: 15, depth: 6, top: 7, edge: 8, body: 8, knee: [194, 220], pedestal: 'right', kneeFill: dith(0, 8, 2) });
  p.at(138, () => {
    monitor(p, 193, aTop - 20, 28, 16, 0, { bezel: 8 });
    // MY FIRST DEPLOY!!! sticky note
    p.rect(222, aTop - 18, 5, 5, 14);
    p.hline(223, 226, aTop - 16, 6);
    keyboard(p, 196, aTop + 1, 22, 8, 7);
    // laptop sticker-bomb and a stress ball
    p.rect(176, aTop - 3, 12, 4, 7);
    p.plot(178, aTop - 2, 12);
    p.plot(181, aTop - 2, 10);
    p.plot(184, aTop - 1, 13);
    p.circle(230, aTop - 1, 2, 12);
  });
  if (comforted) chairBack(p, AIDAN_SIT[0], AIDAN_SIT[1] + 4, 4, { hl: 12 });
  else chairToppled(p, 252, 152, 4);

  // ---------------------------------------------------------------- foreground plant (bottom-right)
  p.at(189, () => {
    const r = rng(77);
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 - 0.4 + (r() - 0.5) * 1.6;
      const len = 22 + r() * 16;
      const x1 = 312 + Math.cos(a) * len,
        y1 = 178 + Math.sin(a) * len;
      p.line(312, 178, x1, y1, r() < 0.5 ? 2 : 10);
      p.ellipse(Math.round(x1), Math.round(y1), 3, 1, r() < 0.5 ? 2 : 10);
    }
    p.poly([302, 176, 320, 176, 320, 190, 304, 190], 6);
    p.hline(302, 319, 176, 14);
  });
}

// ---------------------------------------------------------------- NPC helpers

function aidanHiding(): Actor {
  const closed = aidanCrouch(false);
  const open = aidanCrouch(true);
  const blink = aidanCrouch(false, true);
  const a = new Actor('aidan', 'Aidan', { stand: { frames: [closed] }, talk: { frames: [open, closed] } }, AIDAN_HIDE[0], AIDAN_HIDE[1], 'down');
  a.custom = (t) => {
    if (a.talking) return Math.floor(t / 7) % 2 ? closed : open;
    return t % 200 < 7 ? blink : closed;
  };
  return a;
}

async function seatedTalk(g: Game, id: string, text: string) {
  const a = g.actor(id);
  if (!a) return g.say(text, { title: id });
  const prev = a.pose;
  const prevDir = a.dir;
  if (a.dir === 'down') a.pose = 'sittalk';
  await g.talk(a, text);
  a.pose = prev;
  a.dir = prevDir;
}

/** Turn Nicholas toward Dominic for a chat, then back to his screen. */
async function nickChat(g: Game, lines: [string, string][]) {
  const n = g.actor('nicholas');
  if (n) {
    n.pose = 'sit';
    n.dir = g.player.x < n.x ? 'left' : 'right';
  }
  await convo(g, lines);
  if (n) {
    n.pose = 'type';
    n.dir = 'up';
  }
}

async function approachNick(g: Game) {
  const x = g.player.x < NICK[0] ? 70 : 114;
  await g.approach([x, 146]);
  g.player.faceToward(NICK[0], NICK[1] - 4);
}

async function approachAidan(g: Game) {
  await g.approach([226, 154]);
  g.player.dir = 'left';
}

async function getNickAttention(g: Game, how: string) {
  await approachNick(g);
  if (g.flag('nick_attention')) {
    return void (await nickChat(g, [['nicholas', 'I can hear you, I can hear you. The headphones are on "ambient" now. Ambient is still pretty loud.']]));
  }
  await g.pose(null, 'reach', 400);
  await g.say(how);
  g.set('nick_attention');
  award(g, 'nick_attention');
  await nickChat(g, [
    ['nicholas', "Dominic! Hey! Whoa, why is everything red? Is that a new theme?"],
    ['me', 'The Monolith is down. Production is down. Everything is down.'],
    ['nicholas', "Oh, THAT. Yeah, I saw a few alerts. I've been a little busy. I've been trying to center this div since Tuesday."],
    ['nicholas', "I tried margin: auto. I tried text-align: center. I tried asking it nicely. I tried a TABLE, Dominic. I used a table. In this decade."],
    ['nicholas', "You've done this before, right? You wouldn't happen to have it written down somewhere?"],
  ]);
}

const NICK_AFTER = [
  "I've centered eleven divs since you gave me that note. Horizontally AND vertically. I'm unstoppable. Next week: dark mode.",
  'If you go anywhere dark, turn that keyboard on. The Rainbow Warrior is brighter than my future, and my future just got very bright.',
  "Krishna's been building some kind of brain helmet in the lab. Don't put it on. Or do. I'm a frontend guy, what do I know about brains.",
  'Thirty-six keyboards left. I may need to reorder. Purely for redundancy. High availability, you know?',
];
const AIDAN_AFTER = [
  "I'm writing the postmortem! Blameless, like you said. Section one, 'What Went Well.' So far it just says 'the deploy itself.'",
  "Denis is the guy in the basement. At onboarding he showed us a photo of some ancient computer and called it 'my first love.' I thought that was a bit too.",
  "If you see the Monolith, tell it I'm sorry. Is that weird? That's weird. Don't tell it.",
  "Nicholas has been trying to center that div since Tuesday. I offered to help on Wednesday. He couldn't hear me.",
];
const MIKE_LINES = [
  "(into the phone) No, Gary, it's not an outage. It's a planned resilience exercise. Very forward-thinking. Our competitors don't even HAVE outages this advanced. (to you) Dom! My guy! Thanks again for the BREAK!",
  "You know what you are, Dom? You're a closer. Ever think about Sales? The commission structure is unbelievable. Unbelievable as in I don't fully understand it.",
  'I sold a client a feature called "Quantum Sync" this morning. Can you guys build that by Monday? No? Tuesday? I said Monday.',
  "How's the power bank treating you? Forty thousand milliamp-hours. That thing could jump-start a car. I know because I tried. Don't tell Krishna.",
];

function cycle(g: Game, key: string, list: string[]): string {
  const i = (g.flag(key) ?? 0) % list.length;
  g.inc(key);
  return list[i];
}

export const office: RoomDef = {
  id: 'office',
  title: 'The Open Office',
  act: 1,
  music: 'office',
  start: [160, 160, 'down'],
  draw: paint,
  walk: [[0, LF0 + 3, LX, SEAM + 6, RX, SEAM + 6, 320, RF0 + 3, 320, 189, 0, 189]],
  blocks: (g) => [
    [50, 116, 84, 23], // Nicholas's desk
    [82, 139, 21, 9], // Nicholas + chair
    [168, 116, 72, 23], // Aidan's desk
    g.flag('aidan_comforted') ? [196, 139, 21, 9] : [238, 145, 26, 9], // Aidan's chair
    [232, 100, 58, 22], // Mike's desk corner
    [108, 100, 17, 7], // water cooler
    [34, 100, 16, 8], // back corner plant
    [30, 122, 20, 20], // keyboard boxes
    [300, 172, 20, 18], // foreground plant
  ],
  raw: async (g, text) => {
    if (/^\s*(erase|wipe|clean|scrub)\b/i.test(text)) {
      await g.approach('whiteboard');
      await g.say("You reach for the eraser, then stop. That diagram is the only documentation the Monolith has had since 1987. Erasing it would be a crime against archaeology.");
      return true;
    }
    return false;
  },
  look: (g) =>
    `The open office: forty desks, zero walls, and an ambient noise level HR describes as "collaborative." Every monitor on the floor glows the same shade of panic red. There's a whiteboard, a water cooler, and a sign proudly counting the days since the last outage.${
      g.flag('aidan_comforted') ? '' : ' From under one of the desks, someone is sniffling.'
    }\n\nPhil's office is to the left, the elevator lobby to the right, and the aisle back to your cubicle runs off to the bottom left.`,
  hotspots: [
    {
      id: 'whiteboard',
      nouns: ['whiteboard', 'white board', 'board', 'diagram', 'architecture', 'architecture diagram', 'drawing', 'boxes', 'arrows', 'marker'],
      area: [40, 22, 76, 46],
      at: [76, 110],
      look: 'A whiteboard titled ARCHITECTURE. In the middle: a big box labeled MONOLITH. Around it, a little box for every system the company owns, with arrows pointing at the Monolith from every direction. One arrow just points at a large red "???".\n\nIt is, by a wide margin, the most accurate architecture diagram in the company.',
    },
    {
      id: 'outagesign',
      nouns: ['sign', 'outage sign', 'safety sign', 'counter', 'days since last outage', 'days', 'number', 'zero'],
      area: [237, 17, 46, 32],
      at: [226, 112],
      look: 'DAYS SINCE LAST OUTAGE: 0.\n\nSomeone already reset it. Underneath, in faded Sharpie: "Personal best: 41 (2014)."',
    },
    {
      id: 'window',
      nouns: ['window', 'windows', 'skyline', 'city', 'sunset', 'dusk', 'view'],
      area: [121, 15, 110, 46],
      at: [176, 110],
      look: "Through the windows, the sun is setting over the city. Somewhere out there, people are starting their weekends. You vaguely remember weekends. They're the days the pager goes off.",
    },
    {
      id: 'cooler',
      nouns: ['cooler', 'water cooler', 'water', 'jug', 'water jug', 'fountain', 'paper cup', 'cups'],
      area: [108, 72, 18, 34],
      at: [118, 112],
      look: "A water cooler, gurgling thoughtfully to itself. It's the office's original social network, and the only thing on this floor that hasn't gone down tonight.",
    },
    {
      id: 'cubicles',
      nouns: ['cubicles', 'cubicle row', 'partitions', 'red monitors', 'other monitors', 'monitors', 'cubicle farm'],
      area: [120, 76, 112, 28],
      at: [176, 110],
      look: 'Row after row of cubicles, every monitor glowing the same alarming red. Collectively, they look like a very sad Christmas display.',
    },
    {
      id: 'officeplant',
      nouns: ['plant', 'plants', 'ficus', 'snake plant', 'pot', 'potted plant', 'leaves'],
      area: [30, 66, 26, 42],
      at: [52, 114],
      look: 'A snake plant in the corner, the official office plant of people who forget to water things. It has outlived three reorgs and a CFO.',
    },
    {
      id: 'bigplant',
      nouns: ['big plant', 'fern', 'foreground plant'],
      area: [290, 140, 30, 50],
      at: [292, 168],
      look: "A large fern in a brass pot. Facilities calls it a 'biophilic design element.' Everyone else calls it Gerald.",
    },
    {
      id: 'kbboxes',
      nouns: ['box', 'boxes', 'cardboard', 'cardboard boxes', 'kb boxes'],
      area: [33, 120, 17, 21],
      at: [40, 146],
      look: 'Cardboard boxes labeled "KB." Inside each one, nestled in bubble wrap: another keyboard. Nicholas buys them the way other people buy houseplants.',
    },
    {
      id: 'nickdesk',
      nouns: ['nicholass desk', 'nicks desk', 'nicholas desk', 'nick desk', 'shrine'],
      area: [52, 76, 80, 62],
      at: [114, 146],
      look: (g) =>
        `Nicholas's desk is a shrine to mechanical keyboards: stacked, racked, boxed, and lovingly lit. In the middle of it all sit two monitors full of CSS${g.flag('nick_helped') ? ' and one triumphantly centered div.' : ' and one deeply uncooperative div.'}`,
    },
    {
      id: 'keyboards',
      nouns: ['keyboards', 'army of keyboards', 'keyboard army', 'stack of keyboards', 'keyboard stack', 'mechanical keyboards', 'keebs', 'switches', 'keycaps'],
      area: [52, 96, 14, 20],
      at: [70, 146],
      look: "Keyboards. Dozens of them. Linear switches, tactile switches, clicky switches, and one that appears to be carved from a single piece of walnut. Each one has a name. You suspect most of them have never typed a single semicolon.",
    },
    {
      id: 'kbstand',
      nouns: ['stand', 'keyboard stand', 'rack', 'keyboard rack', 'display stand'],
      area: [118, 98, 14, 16],
      at: [114, 146],
      look: 'A little display rack for three more keyboards. Nicholas rotates them weekly, "so they all feel loved."',
    },
    {
      id: 'nickscreen',
      nouns: ['nicholass screen', 'nicholass monitor', 'nicholass computer', 'nicks screen', 'nicks monitor', 'div', 'css', 'browser', 'page', 'web page'],
      area: [68, 88, 52, 22],
      at: [114, 146],
      look: (g) =>
        g.flag('nick_helped')
          ? 'On Nicholas\'s screen, a single div sits proudly in the dead center of the page. He has given it a tiny party hat.'
          : "Nicholas's screens: a browser with one small box labeled \"div\" cowering in the corner, and an editor full of increasingly desperate attempts to move it to the middle.\n\n\"margin: auto auto auto auto auto;\"\n\"position: please;\"\n\"center: true !important;\"",
    },
    {
      id: 'aidandesk',
      nouns: ['aidans desk', 'aidan desk', 'interns desk', 'laptop', 'stress ball'],
      area: [170, 78, 68, 60],
      at: [226, 154],
      look: (g) =>
        `Aidan's desk: a sticker-covered laptop, a stress ball that has seen recent action, and a sticky note on the monitor that says "MY FIRST DEPLOY!!!" in purple gel pen.${g.flag('aidan_comforted') ? '' : ' Underneath the desk, wedged into the kneehole, is Aidan.'}`,
    },
    {
      id: 'aidanscreen',
      nouns: ['aidans screen', 'aidans monitor', 'aidans computer', 'deploy console', 'console', 'deploy screen', 'confetti'],
      area: [192, 88, 30, 18],
      at: [226, 154],
      look: "Aidan's monitor still shows the deploy console: \"DEPLOY STATUS: SUCCESS!\" in cheerful green, with animated confetti. Technically, the deploy did succeed. It's everything after the deploy that didn't.",
    },
    {
      id: 'stickynote',
      nouns: ['sticky note on monitor', 'my first deploy', 'gel pen note', 'purple note'],
      area: [220, 89, 7, 7],
      at: [226, 154],
      look: '"MY FIRST DEPLOY!!!" Three exclamation points, a little drawing of a rocket, and a heart. You have to look away for a second.',
    },
    {
      id: 'aidanchair',
      nouns: ['aidans chair', 'toppled chair', 'knocked over chair', 'fallen chair'],
      area: [238, 138, 26, 16],
      at: [250, 160],
      when: (g) => !g.flag('aidan_comforted'),
      look: "Aidan's chair, knocked over in his dive for cover. It looks about as stressed as he does.",
    },
    {
      id: 'mikedesk',
      nouns: ['mikes desk', 'mike desk', 'sales desk', 'sales corner', 'nameplate', 'business cards', 'cards'],
      area: [234, 96, 54, 26],
      at: [246, 128],
      look: (g) =>
        g.flag('candy_bought')
          ? 'The sales corner. Mike is back behind his desk, phone wedged against his shoulder, BREAK! bar in hand, closing something.'
          : 'The sales corner: a nameplate that just says SALES, a desk phone with a blinking message light, a stack of business cards, and a gold trophy. Mike\'s chair is empty; he\'s probably off fighting a vending machine.',
    },
    {
      id: 'trophy',
      nouns: ['trophy', 'gold trophy', 'award', 'salesperson of the year'],
      area: [273, 84, 11, 14],
      at: [272, 126],
      look: "A gold trophy: SALESPERSON OF THE YEAR 2019. Mike keeps it polished. Mike keeps mentioning it, too. The 2020 through 2025 trophies are, he says, \"on back order.\"",
    },
    {
      id: 'deskphone',
      nouns: ['desk phone', 'telephone', 'mikes phone', 'message light', 'voicemail'],
      area: [238, 92, 11, 7],
      at: [246, 128],
      look: 'A desk phone. The message light is blinking: 37 new voicemails. All of them start with "Hey Mike, quick question about the demo..."',
    },
    {
      id: 'phildoor',
      nouns: ['phils door', 'phil door', 'ceo door', 'ceos office', 'phils office', 'corner office', 'office door', 'brass plate', 'oak door'],
      area: [3, 60, 26, 64],
      at: [16, 132],
      look: "A heavy oak door with a brass plate: PHIL - CEO. It's standing ajar, spilling sunset light across the carpet. From inside you can hear Phil on the phone, using the word \"synergy\" defensively.",
    },
    {
      id: 'lobbydoor',
      nouns: ['doorway', 'lobby', 'elevator lobby', 'exit', 'exit sign', 'hallway'],
      area: [292, 56, 24, 68],
      at: [302, 132],
      look: 'The doorway to the elevator lobby. The EXIT sign above it is still lit, which makes it the most optimistic thing on the floor.',
    },
    {
      id: 'aisle',
      nouns: ['aisle', 'runner', 'rug', 'blue carpet', 'cubicle aisle', 'my cubicle', 'cubicle'],
      area: [0, 165, 78, 25],
      at: [30, 178],
      look: "The aisle back to the cubicle farm. Your cubicle is down there, somewhere between Accounting and the copier that eats staples.",
    },
    {
      id: 'light',
      nouns: ['lights', 'light', 'fluorescent', 'fluorescent lights', 'ceiling lights', 'fixture', 'tube'],
      area: [70, 0, 180, 9],
      look: 'The overhead lights went out with the Monolith. The building is running on emergency power, and one of the tubes keeps trying to come back, like a developer who said "just one more fix."',
    },
  ],
  exits: [
    { area: [0, LF0 - 2, 5, 165 - LF0 + 2], to: 'phil', at: [296, 160, 'left'], dir: 'west' },
    { area: [0, 123, 38, 99, 44, 106, 6, 132], to: 'phil', at: [296, 160, 'left'] },
    { area: [0, 168, 5, 22], to: 'cubicle', at: [300, 170, 'left'], dir: 'south' },
    { area: [0, 186, 36, 4], to: 'cubicle', at: [300, 170, 'left'] },
    { area: [315, RF0 - 2, 5, 172 - RF0], to: 'hallway', at: [18, 165, 'right'], dir: 'east' },
    { area: [282, 99, 320, 121, 320, 131, 284, 110], to: 'hallway', at: [18, 165, 'right'] },
  ],
  nouns: {
    ...BASE_NOUNS,
    ...itemNouns(['note', 'keyboard', 'duck', 'mug', 'coffee', 'candy', 'powerbank']),
    ...COMPUTER_NOUNS,
    headphones: ['headphones', 'headphone', 'red headphones', 'cans', 'music', 'synthwave'],
    desk: ['desk', 'desks', 'table', 'workstations'],
    chair: ['chair', 'chairs', 'office chair'],
    drawer: ['drawer', 'drawers', 'desk drawer'],
  },
  enter(g) {
    const n = addNpc(g, 'nicholas', NICK[0], NICK[1], 'up', 'type');
    n.data.gap = 22;
    if (g.flag('aidan_comforted')) addNpc(g, 'aidan', AIDAN_SIT[0], AIDAN_SIT[1], 'up', 'type');
    else g.add(aidanHiding());
    if (g.flag('candy_bought')) addNpc(g, 'mike', MIKE[0], MIKE[1], 'down', 'sit');
  },
  overlay(g, s, t) {
    // a flickering fluorescent tube that keeps trying to come back
    const r = (Math.sin(t * 0.37) + Math.sin(t * 0.113) * 1.3 + Math.sin(t * 1.7) * 0.4) > 1.4;
    if (r) {
      s.rect(143, 4, 34, 2, 15);
      s.hline(144, 175, 6, dith(15, 7, 8));
    }
    // DAYS SINCE LAST OUTAGE: 0 (blinking)
    if (Math.floor(t / 40) % 4 !== 3) segDigit(s, 258, 38, '0', 12, -1);
    else segDigit(s, 258, 38, '0', 4, -1);
    // Mike's voicemail light
    if (Math.floor(t / 30) % 2 === 0) s.plot(246, 95, 12);
    // water cooler bubble
    const bp = t % 300;
    if (bp < 40) s.plot(116 + ((bp >> 3) & 1), 84 - Math.floor(bp / 5), 15);
    // Nicholas's div: wandering until it's centered
    const sx = 97,
      sy = 101;
    s.rect(sx, sy, 20, 12, 15);
    s.hline(sx, sx + 19, sy, 7);
    s.plot(sx + 1, sy, 12);
    s.plot(sx + 3, sy, 14);
    s.plot(sx + 5, sy, 10);
    if (g.flag('nick_helped')) {
      s.frame(sx + 6, sy + 4, 8, 6, 9);
      s.rect(sx + 7, sy + 5, 6, 4, 11);
      s.plot(sx + 10, sy + 2, 13);
      s.plot(sx + 9, sy + 3, 13);
      s.plot(sx + 11, sy + 3, 14);
    } else {
      const k = Math.floor(t / 50) % 6;
      const pos = [
        [0, 1],
        [12, 1],
        [12, 6],
        [0, 6],
        [2, 3],
        [9, 4],
      ][k];
      s.frame(sx + pos[0], sy + 1 + pos[1], 8, 5, 9);
      s.rect(sx + pos[0] + 1, sy + 2 + pos[1], 6, 3, 11);
    }
    // Aidan's monitor: DEPLOY SUCCESS with confetti
    const mx = 195,
      my = 101;
    s.rect(mx, my, 24, 12, 0);
    s.micro(mx + 1, my + 1, 'DEPLOY', 10);
    s.micro(mx + 2, my + 6, 'OK!', 10);
    const cr = rng(Math.floor(t / 12));
    const cc = [12, 14, 13, 11, 10];
    for (let i = 0; i < 6; i++) s.plot(mx + Math.floor(cr() * 24), my + Math.floor(cr() * 12), cc[i % cc.length]);
  },
  front(g, s, t) {
    // Mike's phone, wedged against his shoulder, and his BREAK! bar
    const m = g.actor('mike');
    if (m && m.visible) {
      const x = Math.round(m.x),
        y = Math.round(m.y);
      s.rect(x + 3, y - 26, 2, 4, 0);
      s.plot(x + 3, y - 27, 8);
      // munch: the bar goes up to his mouth every few seconds
      const up = t % 240 < 40;
      s.rect(x - 6, up ? y - 23 : y - 19, 4, 2, 4);
      s.plot(x - 5, up ? y - 23 : y - 19, 14);
    }
  },
  verbs: {
    'look desk': async (g) => {
      const x = g.player.x;
      const id = x < 150 ? 'nickdesk' : x < 230 ? 'aidandesk' : 'mikedesk';
      const hs = office.hotspots!.find((h) => h.id === id)!;
      await g.say(typeof hs.look === 'string' ? hs.look : ((hs.look as (g: Game) => string)(g) as string));
    },
    'look/under desk,search desk,look/under aidandesk,search aidandesk,look/under nickdesk,search nickdesk,search mikedesk': async (g, c) => {
      const aidan = c.noun === 'aidandesk' || (c.noun === 'desk' && g.player.x > 150 && g.player.x < 240);
      if (aidan && !g.flag('aidan_comforted')) {
        await approachAidan(g);
        return void (await g.say("Under Aidan's desk: Aidan. He looks up at you with the eyes of a kicked puppy who has just learned what a core panic is. Maybe talk to him."));
      }
      await g.say("You glance under the desk. Cables, dust bunnies, a single sock, and a stress ball that rolled there in 2023. Nothing that will fix production.");
    },
    'open|search drawer': "Your coworkers' desk drawers are their own business. HR training module seven was very clear about this. There was a quiz.",
    'look chair': async (g) =>
      g.say(
        g.flag('aidan_comforted')
          ? "The office chairs: Nicholas's (black, broken in), Aidan's (red, back on its wheels), and Mike's (black leather, high-backed, a little too big for the desk)."
          : "The office chairs: Nicholas's (black, broken in), Mike's (black leather, high-backed), and Aidan's, which is lying on its side where he abandoned it.",
      ),
    'look nicholas': async (g) =>
      g.say(
        `Nicholas: frontend developer, keyboard collector, owner of the biggest red headphones in the tri-state area. ${
          g.flag('nick_helped') ? 'He is radiating the pure joy of a man whose div is finally centered.' : 'He has the thousand-yard stare of a man who has been trying to center a div since Tuesday.'
        }`,
      ),
    'look aidan': async (g) =>
      g.say(
        g.flag('aidan_comforted')
          ? 'Aidan, the summer intern, is back in his chair, typing up a blameless postmortem with the intensity of a man defusing a bomb.'
          : "Aidan, the summer intern, is wedged under his desk, hugging his knees. Only his red cap and two very wide eyes are visible. He looks like someone who just pressed a big red button. Because he is.",
      ),
    'look mike': async (g) =>
      g.say(
        g.actor('mike')
          ? "Mike from Sales, back at his desk: phone wedged against one shoulder, BREAK! bar in hand, already selling tonight's outage to someone as a \"resilience feature.\""
          : "Mike isn't at his desk. Judging by the faint shouting coming from the direction of the break room, he's found something to argue with.",
      ),
    // ---------------- Nicholas
    'talk nicholas,ask nicholas ?,tell nicholas ?,say nicholas': async (g) => {
      await approachNick(g);
      if (!g.flag('nick_attention')) {
        await g.say("He can't hear you over his music. You can hear it, though: synthwave, at a volume that violates several OSHA guidelines.");
        return;
      }
      if (!g.flag('nick_helped')) {
        await nickChat(
          g,
          g.has('note')
            ? [['nicholas', "Wait. Is that a sticky note in your hand? Is that... in YOUR handwriting? Dominic. Is that THE note?"]]
            : [['nicholas', "Flexbox? Grid? Prayer? I'm open to anything. I KNOW you wrote this down for me once. Probably more than once. Probably on a sticky note."]],
        );
        return;
      }
      await nickChat(g, [['nicholas', cycle(g, 'nick_talk_i', NICK_AFTER)]]);
    },
    'tap|wake|touch nicholas,remove|take|pull|lift|move headphones,tap headphones,touch headphones': async (g) => {
      await getNickAttention(g, 'You tap Nicholas on the shoulder. He jumps about a foot, then slides off his headphones. A wave of synthwave escapes into the room like a startled bird.');
    },
    'attack|shake|push nicholas': async (g) => {
      if (!g.flag('nick_attention')) return void (await getNickAttention(g, "A gentle shoulder-shake would do. You opt for the gentle shoulder-shake. Nicholas yelps and pulls off his headphones."));
      await g.say("He can hear you now. There's no need to escalate. This isn't a code review.");
    },
    'give|show note nicholas,put note nicholas,give|show note desk': async (g) => {
      if (!g.has('note')) return false;
      await approachNick(g);
      if (!g.flag('nick_attention')) {
        await g.say("You slide the sticky note into Nicholas's field of view, right on top of his keyboard. He freezes mid-keystroke, reads it, and rips off his headphones.");
        g.set('nick_attention');
        award(g, 'nick_attention');
      } else await g.say('You hand Nicholas the sticky note.');
      g.removeItem('note');
      g.set('nick_helped');
      const n = g.actor('nicholas');
      if (n) {
        n.pose = 'type';
        n.dir = 'up';
      }
      g.sfx('type');
      await g.wait(900);
      g.redraw();
      await nickChat(g, [
        ['nicholas', 'display: flex. justify-content: center. align-items: center. ...Three lines? THREE LINES?'],
        ['nicholas', "IT'S IN THE MIDDLE. Dominic, it's in the MIDDLE! Look at it! Look at my beautiful div! I'm framing this note. I'm going to be buried with this note."],
        ['nicholas', 'I owe you. Here. Take the Rainbow Warrior. It\'s my spare.'],
        ['nicholas', "Take it. I have thirty-seven more. It's got a battery that lasts a month and enough LEDs to land a plane."],
      ]);
      award(g, 'give_note_nick');
      g.addItem('keyboard');
      await g.pose(null, 'reach', 400);
      await g.say('Nicholas hands you a gleaming wireless mechanical keyboard. Its keycaps shimmer with every color you can name and a few you can\'t. He turns back to his screen, already humming, centering things with reckless abandon.');
    },
    'give|show * nicholas': async (g, c) => {
      if (!c.noun || !g.has(c.noun)) return false;
      await approachNick(g);
      if (!g.flag('nick_attention')) return void (await g.say("You wave it in front of him. He nods along to the beat, eyes locked on his div. He hasn't noticed you exist."));
      if (c.noun === 'keyboard') return void (await g.say('Nicholas waves it away. "No takebacks. It\'s yours. Also I have thirty-seven more."'));
      await nickChat(g, [['nicholas', "Unless that's going to center a div, I don't think I need it. No offense."]]);
    },
    'listen headphones,listen nicholas,listen music,listen': async (g) =>
      g.flag('nick_attention')
        ? g.say('The office hums with server-less silence, plus the faint thump of synthwave from the headphones around Nicholas\'s neck.')
        : g.say('Synthwave thumps out of Nicholas\'s headphones: neon arpeggios, gated reverb, and a saxophone solo that refuses to end. You can feel the bass in your fillings.'),
    'center ?,fix div|css|code|page,help nicholas': async (g) => {
      if (g.flag('nick_helped')) return void (await g.say("The div is already centered. It's a rare and beautiful sight. Don't touch it."));
      if (g.has('note')) return void (await g.say("You could explain it again, but you already wrote it down. Just give Nicholas the note."));
      await g.say("You know the answer, of course. You've explained it to Nicholas about forty times. In fact, you got so tired of explaining it that you wrote it down once. Where did you put that note...?");
    },
    'take keyboard|keyboards|kbstand,take kbboxes,open kbboxes': async (g, c) => {
      if (g.has('keyboard') && c.noun === 'keyboard') return false;
      if (g.flag('nick_helped')) return void (await g.say("You already have the Rainbow Warrior. One RGB keyboard is plenty for anyone. Nicholas would disagree."));
      await g.say("You reach for a keyboard. Somewhere behind those headphones, Nicholas's spider-sense tingles. His hand twitches toward it like a dragon guarding its hoard. Better ask nicely.");
    },
    'type,use|type nickscreen,type ?': async (g, c) => {
      if (c.noun && !['nickscreen', 'aidanscreen', 'computer', 'keyboards', 'nickdesk', 'aidandesk'].includes(c.noun)) return false;
      await g.say("Typing on a coworker's computer while they're sitting right there is a fireable offense in at least three countries. Besides, every machine on this floor just says MONOLITH UNREACHABLE.");
    },
    // ---------------- Aidan
    'talk aidan,comfort aidan,hug|touch|tap aidan,tell aidan ?,ask aidan ?,say aidan,apologize aidan,thank aidan,help aidan': async (g) => {
      await approachAidan(g);
      if (g.flag('aidan_comforted')) {
        const a = g.actor('aidan');
        if (a) a.dir = 'right';
        await g.talk('aidan', cycle(g, 'aidan_talk_i', AIDAN_AFTER));
        if (a) a.dir = 'up';
        return;
      }
      await convo(g, [
        ['me', 'Aidan. Hey. Come on out. Nobody is mad at you.'],
        ['aidan', "Phil is mad. The investors are going to be mad. The MONOLITH is mad, Dominic. I didn't even know a computer could BE mad."],
        ['me', "Listen. We do blameless postmortems here. If a whole company falls over because one person pressed one button, the company was a time bomb. You just happened to be standing next to it when it went off."],
        ['aidan', '...Really?'],
        ['me', "Really. Also, you read the runbook. Nobody reads the runbook. You're already ahead of most of us."],
        ['aidan', "I DID read the runbook! The deploy only changed one comment. I fixed a typo! And then step four said 'Restart the Monolith,' so I restarted the Monolith."],
        ['aidan', 'Although... at onboarding there was this guy from the basement. Denis? Big gray beard? He kept yelling "NEVER REBOOT IT!" and pointing at people. I thought it was a bit.'],
        ['me', 'It was not a bit.'],
        ['aidan', "Oh. OH. Okay. Okay! I'm going to start the postmortem doc. Blameless. Lots of timestamps. Thanks, Dominic."],
      ]);
      g.set('aidan_comforted');
      award(g, 'comfort_aidan');
      // Aidan climbs out and gets back in his chair
      const hid = g.actor('aidan');
      if (hid) g.remove(hid);
      const a = addNpc(g, 'aidan', 210, 150, 'down');
      g.redraw();
      await g.wait(300);
      await g.walk(a, AIDAN_SIT[0], AIDAN_SIT[1] + 1, { direct: true });
      a.place(AIDAN_SIT[0], AIDAN_SIT[1], 'up');
      a.pose = 'type';
      await g.say('Aidan crawls out from under his desk, rights his chair, and starts typing with the grim focus of someone writing his first incident report.');
    },
    'take|pull aidan,wake aidan': async (g) => {
      if (g.flag('aidan_comforted')) return false;
      await g.say("You can't drag him out. He'll come out when he's ready. Maybe try talking to him.");
    },
    'attack aidan,kick aidan': "It wasn't his fault. Well, it was a little bit his fault. But mostly it was a 27-year-old architecture decision's fault.",
    'give|show * aidan': async (g, c) => {
      if (!c.noun || !g.has(c.noun)) return false;
      await approachAidan(g);
      if (c.noun === 'candy') return void (await g.talk('aidan', "Ooh. No. Thank you. My stomach is still in production. Maybe someone else needs a break more than me."));
      if (c.noun === 'duck') return void (await g.talk('aidan', "Is that... a rubber duck? Oh, for debugging! I read about that. Does it work? Don't answer. I want to believe."));
      await g.talk('aidan', "Oh! Um. Thanks? I'm not sure what I'd do with that. I'm not sure what I'd do with anything right now.");
    },
    // ---------------- Mike (after the candy)
    'talk mike,ask mike ?,tell mike ?,say mike': async (g) => {
      if (!g.actor('mike')) return false;
      await g.approach([246, 130]);
      g.player.faceToward(MIKE[0], MIKE[1]);
      await seatedTalk(g, 'mike', cycle(g, 'mike_office_i', MIKE_LINES));
    },
    'give|show * mike': async (g, c) => {
      if (!g.actor('mike') || !c.noun || !g.has(c.noun)) return false;
      await g.approach([246, 130]);
      if (c.noun === 'powerbank') return void (await seatedTalk(g, 'mike', "No no no, Dom. A gift is a gift. Sales is all about relationships. Keep it."));
      await seatedTalk(g, 'mike', "Dom, I'd love to take that off your hands, but I'm on with Gary. Gary needs me. Gary doesn't know he needs me yet.");
    },
    // ---------------- dressing
    'drink cooler|water,use cooler,take cooler|water,fill * cooler,put * cooler,turnon cooler,push cooler': async (g, c) => {
      await g.approach('cooler');
      if (c.verb === 'take' && c.noun === 'cooler') return void (await g.say("It weighs forty pounds and it's the only thing on this floor still working. Leave it be."));
      if ((c.verb === 'fill' || c.verb === 'put') && (c.noun === 'mug' || c.noun === 'coffee')) return void (await g.say("Water? In the coffee mug? The mug would never forgive you. Some things are sacred."));
      await g.pose(null, 'reach', 400);
      g.sfx('splash');
      await g.say('You fill a little paper cone and drink. Ahh. Refreshing, but it\'s not coffee.');
    },
    'take whiteboard,type whiteboard,fix whiteboard,use whiteboard,take marker,draw ?': async (g) => {
      await g.approach('whiteboard');
      await g.pose(null, 'reach', 500);
      await g.say('You uncap a marker and add a tiny box labeled "ME" with an arrow pointing at the "???". Then you erase it. Too soon.');
    },
    'read whiteboard': async (g) => g.say(office.hotspots!.find((h) => h.id === 'whiteboard')!.look as string),
    'take|fix|reboot|push outagesign,change outagesign': "You could set it to 1. But that would be lying, and Fahim would know. Fahim always knows.",
    'read outagesign': 'DAYS SINCE LAST OUTAGE: 0. Personal best: 41 (2014).',
    'take trophy,touch trophy': async (g) => {
      await g.approach('trophy');
      await g.say(g.actor('mike') ? 'Mike\'s hand lands on the trophy before yours does, without him even looking up from his call. Salesman reflexes.' : 'You pick it up. It is surprisingly heavy, and the engraving reads "SALESPERSON OF THE YEAR 2019." You put it back exactly where it was. Mike would notice. Mike notices everything shiny.');
    },
    'take officeplant|bigplant,take plant': 'The plants stay. They have been here longer than most of the engineers.',
    'water officeplant|bigplant,water plant': "You don't have any water handy. Well, there's the cooler, but these plants have survived this long on neglect alone. Why ruin a good thing?",
    'take|use deskphone,call ?,push deskphone': async (g, c) => {
      if (c.verb === 'call' && c.noun !== 'deskphone') return false;
      await g.say("You pick up Mike's desk phone. Dead silence. The phones run through the Monolith, too. Of course they do.");
    },
    'take light,fix light,turnon|turnoff light': "The lights are wired through the building management system, which runs on, you guessed it, the Monolith.",
    'sit,sit *': "Every chair on this floor belongs to someone who'd ask why it's warm. Besides, production is down. No sitting.",
    'take aidanchair,fix aidanchair,push|pull aidanchair': "You'd set it upright, but that's Aidan's call. It's his dramatic gesture. Let him have it.",
    'take nickscreen|aidanscreen|cubicles': 'Every monitor in this building is cable-locked to a desk. Ever since the Great Monitor Heist of 2019.',
    'look door': async (g) => {
      if (g.player.x > 160) return void (await g.say(office.hotspots!.find((h) => h.id === 'lobbydoor')!.look as string));
      await g.say(office.hotspots!.find((h) => h.id === 'phildoor')!.look as string);
    },
    'open|close lobbydoor': 'There is no door on the lobby doorway. Facilities removed it in 2016 to "encourage flow." Mostly it encourages drafts.',
    'open|close phildoor,knock phildoor,open|close door,knock door': async (g, c) => {
      if (c.noun === 'door' && g.player.x > 160) return void (await g.say('There is no door on the lobby doorway, just an EXIT sign and a draft. Phil\'s door, on the far side of the office, is ajar.'));
      await g.approach('phildoor');
      if (c.verb === 'knock') return void (await g.say('You knock on the open door. From inside, Phil calls: "It\'s open! Unless you\'re an investor. Then it\'s also open, but please wait one moment."'));
      await g.say("Phil's door is already ajar. Phil believes in an open-door policy. He wrote a forty-page memo about it. Just walk on in.");
    },
    'go|enter phildoor,go|enter phil': async (g) => {
      await g.walk(null, 16, 118);
      g.goto('phil', [296, 160, 'left']);
    },
    'go|enter lobbydoor,go|enter elevator': async (g) => {
      await g.walk(null, 304, 114);
      g.goto('hallway', [18, 165, 'right']);
    },
    'go|enter aisle': async (g) => {
      await g.walk(null, 3, 178);
      g.goto('cubicle', [300, 170, 'left']);
    },
    'look/through window': 'The sun is setting over the city. Long shadows, pink sky, everyone else on their way to dinner. You have a date with a mainframe.',
    'look headphones': "Nicholas's enormous red over-ear headphones. Studio-grade. Noise-cancelling. Dominic-cancelling.",
    'look computer,use|take|turnon|reboot computer': "Every computer on this floor shows the same thing: MONOLITH UNREACHABLE. Turning them off and on again won't help. You checked. Twice.",
  },
};
