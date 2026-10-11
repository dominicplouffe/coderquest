// The NOC: a dark room, a wall of red dashboards, RULE #1, and Fahim, the
// on-call SRE, who has been awake for 36 hours and needs coffee to reboot.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, rng, TRANSPARENT } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { textWidth } from '../../engine/font';
import { Actor } from '../../engine/actor';
import { serverRack, blinkLeds, keyboard } from '../../art/lib';
import { lerpY, segDigit, chairBack, editImg, box } from '../../art/office_props';
import { person } from '../../art/cast';
import { X } from '../../engine/palette-ext';
import { award } from '../../content/points';
import { convo } from '../../content/helpers';
import { HALL_ARRIVE } from './hallway';

const SEAM = 102;
const LX = 30;
const RX = 290;
const CONSOLE_Z = 140;
const FAHIM_SLUMP: [number, number] = [201, 158];
const FAHIM_WORK: [number, number] = [201, 151];
// video wall: 4 x 3 screens
const VW = { x: 58, y: 25, cols: 4, rows: 3, w: 50, h: 17, gap: 2 };

let leds: [number, number, number][] = [];

function screenRect(c: number, r: number) {
  return { x: VW.x + c * (VW.w + VW.gap), y: VW.y + r * (VW.h + VW.gap) };
}

function paint(p: Surface, g: Game) {
  const awake = !!g.flag('fahim_awake');
  // ---------------------------------------------------------------- floor: raised data-center tiles
  p.rect(0, SEAM, 320, 190 - SEAM, 8);
  for (let i = -9; i <= 9; i++) {
    const xb = 160 + i * 36;
    p.line(160 + (xb - 160) * 0.55, SEAM, xb, 189, 0);
  }
  let y = SEAM + 4,
    step = 5;
  while (y < 190) {
    p.hline(0, 319, y, 0);
    y += step;
    step = Math.ceil(step * 1.3);
  }
  // a couple of perforated vent tiles
  for (const [vx, vy] of [
    [96, 170],
    [218, 150],
  ])
    for (let k = 0; k < 4; k++) p.hline(vx, vx + 18, vy + k * 2, dith(8, 0, 8));
  // the red glow of the dashboards across the floor
  p.rect(LX, SEAM, RX - LX, 3, dith(8, 4, 6));

  // ---------------------------------------------------------------- walls (dark, acoustic panels)
  p.rect(0, 0, 320, SEAM, 1);
  p.rect(0, 0, 320, 9, 0);
  for (let x = 0; x < 320; x += 20) p.vline(x, 0, 8, 8);
  p.rect(LX, 9, RX - LX, SEAM - 9, 1);
  for (let x = LX + 13; x < RX; x += 26) p.vline(x, 9, SEAM - 4, 0);
  p.hline(LX, RX, 9, 8);
  // side walls in perspective (darker)
  p.poly([0, 0, LX, 9, LX, SEAM, 0, 128], 0);
  p.poly([RX, 9, 320, 0, 320, 128, RX, SEAM], 0);
  p.line(LX, 9, LX, SEAM, 8);
  p.line(RX, 9, RX, SEAM, 8);
  p.line(0, 128, LX, SEAM, 8);
  p.line(RX, SEAM, 320, 128, 8);
  p.rect(LX, SEAM - 3, RX - LX, 3, 0);

  // ---------------------------------------------------------------- RULE #1 banner
  const msg = 'RULE #1: NEVER DEPLOY ON A FRIDAY.';
  const tw = textWidth(msg);
  const bx = Math.round(160 - tw / 2) - 6;
  p.rect(bx, 11, tw + 12, 12, 15);
  p.frame(bx, 11, tw + 12, 12, 4);
  p.frame(bx + 1, 12, tw + 10, 10, 12);
  p.text(bx + 6, 13, msg, 4);
  // little hand-drawn skull and crossbones, for emphasis
  p.plot(bx + tw + 14, 14, 15);

  // ---------------------------------------------------------------- the video wall
  p.rect(VW.x - 4, VW.y - 3, VW.cols * (VW.w + VW.gap) + 6, VW.rows * (VW.h + VW.gap) + 4, 0);
  p.frame(VW.x - 4, VW.y - 3, VW.cols * (VW.w + VW.gap) + 6, VW.rows * (VW.h + VW.gap) + 4, 8);
  for (let r = 0; r < VW.rows; r++)
    for (let c = 0; c < VW.cols; c++) {
      const { x, y } = screenRect(c, r);
      p.rect(x, y, VW.w, VW.h, 4);
      p.frame(x, y, VW.w, VW.h, 8);
    }

  // ---------------------------------------------------------------- left wall: server rack + incident counter
  leds = serverRack(p, 4, 60, 18, 56, 23, 122);
  // DAYS SINCE LAST INCIDENT (on the left wall, in perspective-ish)
  p.rect(4, 18, 24, 38, 15);
  p.frame(4, 18, 24, 38, 8);
  p.rect(5, 19, 22, 5, 4);
  p.micro(7, 19, 'DAYS', 15);
  p.micro(6, 26, 'SINCE', 0);
  p.micro(6, 32, 'INCDT', 0);
  p.rect(10, 39, 11, 14, 0);

  // right wall: a whiteboard of on-call shame + a coat hook with a hoodie
  p.poly([296, 24, 316, 22, 316, 60, 296, 58], 15);
  p.lines([296, 24, 316, 22, 316, 60, 296, 58, 296, 24], 8);
  for (let k = 0; k < 4; k++) p.line(299, 30 + k * 7, 313, 29 + k * 7, k === 1 ? 4 : 1);
  p.micro(299, 26, 'ROTA', 4);

  // ---------------------------------------------------------------- the console
  p.at(CONSOLE_Z, () => {
    // desk surface (slightly curved feel: raised ends)
    p.poly([44, 118, 276, 118, 284, 124, 36, 124], 8);
    p.hline(44, 275, 118, 7);
    p.rect(36, 124, 249, 2, 7);
    p.rect(38, 126, 245, CONSOLE_Z - 126, 7);
    p.hline(38, 282, 126, 15);
    for (let x = 60; x < 280; x += 40) {
      p.frame(x - 16, 128, 32, CONSOLE_Z - 131, 8);
      p.rect(x - 2, 131, 4, 2, 8);
    }
    p.hline(36, 284, CONSOLE_Z - 1, 0);
    // operator monitors along the console
    for (const mx of [50, 84, 118, 152, 250]) {
      p.rect(mx, 103, 22, 14, 0);
      p.rect(mx + 1, 104, 20, 12, 4);
      p.rect(mx + 10, 117, 3, 2, 8);
    }
    // Fahim's own monitor, a terminal
    p.rect(185, 101, 32, 17, 8);
    p.rect(186, 102, 30, 15, 0);
    p.rect(199, 118, 4, 1, 8);
    keyboard(p, 188, 120, 26, 8, 7);
    keyboard(p, 54, 120, 20, 8, 7);
    keyboard(p, 120, 120, 22, 8, 7);
    // energy drink cans everywhere
    const cans: [number, number, number][] = [
      [76, 115, 10],
      [80, 116, 2],
      [112, 115, 14],
      [116, 116, 10],
      [176, 115, 9],
      [221, 116, 10],
      [226, 115, 12],
      [246, 115, 10],
      [276, 116, 14],
    ];
    for (const [cx, cy, cc] of cans) {
      p.rect(cx, cy, 3, 5, cc);
      p.plot(cx + 1, cy, 7);
    }
    // a crushed can tipped over
    p.rect(200, 121, 5, 2, 10);
  });
  // ---------------------------------------------------------------- pizza boxes & more cans on the floor
  box(p, 274, 176, 26, 5);
  p.at(171, () => {
    p.rect(276, 162, 24, 4, 14);
    p.rect(277, 163, 22, 2, 6);
    p.rect(274, 167, 28, 4, 15);
    p.rect(275, 168, 26, 2, 7);
    p.micro(279, 169, 'PIZZA', 4);
  });
  for (const [cx, cy, cc] of [
    [250, 178, 10],
    [262, 183, 14],
    [40, 172, 10],
  ] as [number, number, number][])
    p.at(cy, () => {
      p.rect(cx, cy - 2, 5, 2, cc);
      p.plot(cx, cy - 2, 7);
    });
  // Fahim's chair
  if (awake) chairBack(p, FAHIM_WORK[0], FAHIM_WORK[1] + 4, 1, { hl: 9 });
  else {
    // swiveled toward the room; drawn behind him (background priority)
    const cx = FAHIM_SLUMP[0];
    p.rect(cx - 8, 125, 17, 18, 0);
    p.rect(cx - 7, 126, 15, 16, 1);
    p.hline(cx - 6, cx + 6, 126, 9);
    p.rect(cx - 11, 139, 23, 3, 1);
    p.hline(cx - 11, cx + 11, 139, 9);
    p.vline(cx, 142, 154, 8);
    p.hline(cx - 7, cx + 7, 157, 8);
    p.hline(cx - 7, cx + 7, 158, 0);
  }
}

// ---------------------------------------------------------------- Fahim

/** Fahim, slumped: head sunk into his shoulders, heavy eyelids, a little drool. */
function zombieFahim(x: number, y: number): Actor {
  const set = { ...person('fahim') };
  const base = set.sit_down.frames[0];
  const out = editImg(base, []);
  const W = base.w;
  // the head occupies rows 8..16 when seated; sink it two pixels into the shoulders
  for (let yy = 16; yy >= 8; yy--)
    for (let xx = 0; xx < W; xx++) {
      const c = base.data[yy * W + xx];
      if (c !== TRANSPARENT) out.data[(yy + 2) * W + xx] = c;
      if (yy < 10) out.data[yy * W + xx] = TRANSPARENT;
    }
  // heavy eyelids (the eyes are now on row 13) and a glint of drool
  for (let xx = 6; xx < 13; xx++) if (base.data[11 * W + xx] === 0) out.data[13 * W + xx] = X.skinMs;
  out.data[17 * W + 11] = 11;
  set.sit_down = { frames: [out] };
  const a = new Actor('fahim', 'Fahim', set, x, y, 'down');
  a.pose = 'sit';
  return a;
}

function cycle(g: Game, key: string, list: string[]): string {
  const i = (g.flag(key) ?? 0) % list.length;
  g.inc(key);
  return list[i];
}

const ZOMBIE = [
  '...coffee...',
  '...mmmrrph... is it Tuesday...? ...coffee...',
  '...the dashboards are red... they have always been red... coffee...',
  '...I see you... you are... not coffee...',
  '...pager... make it stop... ...coffee...',
  "...zzz... no, I'm awake... I'm awake... ...coffee...",
];

const FLAVOR = [
  "Uptime: zero minutes. Morale: surprisingly decent, now that I've had coffee. I'm going to need about nine more of those.",
  "Rule Number One exists for a reason. Ask me about the Great Friday Deploy of 2019 sometime. Actually, don't. I still have the pager scars.",
  "Denis lives in the basement. Literally, he has a cot down there. Be nice to him. He's very protective of that machine. He calls it 'she.'",
  "Fun fact: the Monolith's uptime counter rolled over twice. It was at, like, nine thousand days. Was. Past tense.",
];

function progressLine(g: Game): string {
  if (!g.flag('phil_gave_keycard')) return g.has('report') ? "Take that incident report to Phil. He'll laminate it, then he'll give you what you need. In that order." : "Phil needs the incident report. Did you lose it? Please tell me you didn't lose it.";
  if (!g.flag('helmet_given')) return "If you're going inside that thing, you'll want Krishna's helmet. The R&D lab is down the hall, past the elevators. Badge reader by the door.";
  if (!g.flag('stairs_open')) return "Phil's keycard should open the stairwell. It's the red fire door at the end of the hall.";
  return "The stairwell lights run on the Monolith too, so it's pitch black in there. Bring something that glows. Or a lot of courage. Glowing is better.";
}

export const noc: RoomDef = {
  id: 'noc',
  title: 'Network Operations Center',
  act: 1,
  music: 'noc',
  start: [160, 182, 'up'],
  draw: paint,
  walk: [[0, 131, LX, SEAM + 6, RX, SEAM + 6, 320, 131, 320, 189, 0, 189]],
  blocks: (g) => [
    [34, 104, 252, 37], // console
    g.flag('fahim_awake') ? [FAHIM_WORK[0] - 10, 141, 21, 14] : [FAHIM_SLUMP[0] - 12, 141, 25, 19], // Fahim + chair
    [270, 158, 34, 20], // pizza boxes
    [0, 118, 26, 8], // rack
  ],
  look: (g) =>
    `The Network Operations Center. Dark, cold, and lit almost entirely by a wall of dashboards, every one of them bleeding red. Above them, a banner: RULE #1: NEVER DEPLOY ON A FRIDAY. The console below is a landfill of energy drink cans, and the corner holds a tower of pizza boxes.\n\n${
      g.flag('fahim_awake') ? 'Fahim is at the console, typing at a terrifying speed.' : 'Fahim, the on-call SRE, is slumped in his chair, facing away from the screens, staring into the middle distance. He has been awake for thirty-six hours.'
    }`,
  hotspots: [
    {
      id: 'videowall',
      nouns: ['dashboards', 'dashboard', 'video wall', 'screens', 'monitors', 'wall of monitors', 'graphs', 'graph', 'alerts', 'red screens', 'big screens', 'charts'],
      area: [54, 22, 214, 64],
      at: [160, 168],
      look: 'A wall of twelve dashboards. Request rate: zero. Error rate: one hundred percent. Latency: "yes." One graph is just a red line going straight down off the bottom of the screen and continuing, presumably, into the earth\'s core. A world map shows every data center as a little red dot. There is one data center. It is in the basement.',
    },
    {
      id: 'rule',
      nouns: ['rule', 'rule 1', 'rule one', 'banner', 'big sign', 'rule sign', 'friday', 'never deploy on a friday'],
      area: [56, 10, 208, 14],
      at: [160, 168],
      look: 'A big hand-painted banner over the dashboards:\n\n"RULE #1: NEVER DEPLOY ON A FRIDAY."\n\nUnderneath, in smaller letters someone added later: "This means you." And later still, in different handwriting: "This means ESPECIALLY you, Aidan."',
    },
    {
      id: 'counter',
      nouns: ['days since last incident', 'incident counter', 'counter', 'days', 'sign', 'number'],
      area: [3, 17, 26, 40],
      at: [36, 150],
      look: 'A little sign: DAYS SINCE LAST INCIDENT: 0. The 0 is a seven-segment display. It has been 0 for so long that the other segments have burned out.',
    },
    {
      id: 'console',
      nouns: ['console', 'desk', 'noc console', 'fahims monitor', 'fahims terminal', 'operator monitors', 'cursor'],
      area: [36, 100, 250, 40],
      at: [196, 148],
      look: (g) =>
        `The NOC console: a long, curved desk of monitors, keyboards and empty energy drink cans. ${g.flag('fahim_awake') ? 'Fahim\'s terminal is scrolling logs faster than any human could read. Fahim reads them anyway.' : "Fahim's own terminal shows a blinking cursor and the word \"coffee\" typed four hundred times."}`,
    },
    {
      id: 'cans',
      nouns: ['cans', 'can', 'energy drinks', 'energy drink', 'energy drink cans', 'drinks', 'empty cans'],
      area: [74, 112, 204, 12],
      at: [196, 148],
      look: "Energy drink cans: Monster Volt, Rockstar Zero, Ultra Peach, and three brands you're fairly sure are illegal in Europe. All empty. Fahim stopped responding to them around hour twenty-nine. He's past energy drinks now. He needs the real thing.",
    },
    {
      id: 'pizza',
      nouns: ['pizza', 'pizza boxes', 'pizza box', 'boxes', 'box', 'tower'],
      area: [270, 156, 34, 22],
      at: [262, 174],
      look: 'A tower of pizza boxes, carefully stacked in the shape of a tower of pizza boxes. Each one is labeled with a date and an incident number. It is, in its way, a monument.',
    },
    {
      id: 'rack',
      nouns: ['rack', 'server rack', 'server', 'servers', 'leds', 'blinking lights'],
      area: [2, 58, 22, 64],
      at: [32, 140],
      look: "A server rack in the corner, the NOC's monitoring stack. It blinks very busily for a machine whose only job tonight is to report that everything is broken.",
    },
    {
      id: 'oncall',
      nouns: ['whiteboard', 'oncall board', 'on call board', 'schedule', 'on call schedule', 'rota'],
      area: [294, 20, 24, 42],
      at: [288, 140],
      look: 'The on-call schedule, on a little whiteboard. This week: FAHIM. Next week: FAHIM. The week after that, someone has written "FAHIM?" and then crossed out the question mark.',
    },
  ],
  exits: [{ area: [0, 186, 320, 4], to: 'hallway', at: HALL_ARRIVE.noc, dir: 'south|out' }],
  enter(g) {
    if (g.flag('fahim_awake')) {
      const f = g.add(new Actor('fahim', 'Fahim', person('fahim'), FAHIM_WORK[0], FAHIM_WORK[1], 'up'));
      f.pose = 'type';
    } else g.add(zombieFahim(FAHIM_SLUMP[0], FAHIM_SLUMP[1]));
  },
  afterEnter: async (g) => {
    if (g.flag('fahim_awake') || g.flag('noc_seen')) return;
    g.set('noc_seen');
    await g.wait(600);
    await g.talk('fahim', '...coffee...');
  },
  overlay(g, s, t) {
    // dashboards: scrolling red graphs, blinking alerts
    const awake = !!g.flag('fahim_awake');
    for (let r = 0; r < VW.rows; r++)
      for (let c = 0; c < VW.cols; c++) {
        const { x, y } = screenRect(c, r);
        const k = r * VW.cols + c;
        const ix = x + 2,
          iy = y + 2,
          w = VW.w - 4,
          h = VW.h - 4;
        s.rect(ix, iy, w, h, 4);
        if (k === 5 || k === 2) {
          // big blinking ERROR / 503 tiles
          if (Math.floor((t + k * 13) / 30) % 2 === 0) {
            s.rect(ix, iy, w, h, 12);
            s.micro(ix + Math.floor(w / 2) - 8, iy + 4, k === 5 ? 'ERROR' : '503', 15);
          } else s.micro(ix + Math.floor(w / 2) - 8, iy + 4, k === 5 ? 'ERROR' : '503', 12);
          continue;
        }
        if (k === 9) {
          // the world map with one red dot
          s.rect(ix + 4, iy + 3, 10, 6, 0);
          s.rect(ix + 18, iy + 2, 14, 8, 0);
          s.rect(ix + 34, iy + 4, 8, 5, 0);
          if (Math.floor(t / 20) % 2) s.plot(ix + 9, iy + 6, 14);
          continue;
        }
        // scrolling line graph heading for zero
        const rr = rng(k * 7 + 1);
        const base = rr() * 6;
        let py = iy + 2;
        for (let xx = 0; xx < w; xx++) {
          const tt = xx + Math.floor(t / 4) + k * 11;
          const v = Math.sin(tt * 0.3 + base) * 1.5 + ((tt * 7) % 5) * 0.3;
          const yy = Math.min(iy + h - 1, Math.round(iy + 2 + ((xx / w) * (h - 4)) + v));
          s.vline(ix + xx, Math.min(py, yy), Math.max(py, yy), k % 3 === 0 ? 14 : 15);
          py = yy;
        }
        s.hline(ix, ix + w - 1, iy + h - 1, 12);
      }
    // incident counter: 0
    segDigit(s, 13, 41, '0', Math.floor(t / 50) % 2 ? 12 : 4, -1);
    // rack LEDs
    blinkLeds(s, t, leds, 9);
    // operator monitors flicker
    for (const [i, mx] of [50, 84, 118, 152, 250].entries()) {
      if ((t + i * 37) % 120 < 60) s.hline(mx + 2, mx + 18, 106 + (i % 3) * 3, 12);
      s.hline(mx + 2, mx + 6 + ((t >> 3) + i * 3) % 12, 112, 14);
    }
    // Fahim's terminal
    if (awake) {
      for (let k = 0; k < 6; k++) {
        const len = 4 + (((t >> 2) + k * 7) % 20);
        s.hline(188, 188 + Math.min(26, len), 103 + k * 2, k % 3 === 0 ? 10 : 2);
      }
    } else {
      s.micro(188, 104, 'COFFEE', 2);
      s.micro(188, 110, 'COFFE', 2);
      if (Math.floor(t / 30) % 2) s.rect(208, 110, 2, 5, 10);
    }
    // red rotating alarm beacon on the ceiling
    const ph = (t >> 2) % 16;
    s.rect(158, 3, 5, 4, ph < 8 ? 12 : 4);
    if (ph < 4) {
      s.line(156, 5, 140, 2, 4);
      s.line(156, 6, 140, 9, 4);
    } else if (ph >= 8 && ph < 12) {
      s.line(164, 5, 180, 2, 4);
      s.line(164, 6, 180, 9, 4);
    }
  },
  verbs: {
    'look fahim': async (g) =>
      g.say(
        g.flag('fahim_awake')
          ? 'Fahim, SRE, fully caffeinated: beard, dark hoodie, eyes like lasers. He is typing at a speed that should not be physically possible, and muttering about TCP retransmits.'
          : 'Fahim, the on-call SRE: beard, dark hoodie, and the thousand-yard stare of a man who has been awake for thirty-six hours. His eyelids are at half-mast. A thin line of drool glistens in the dashboard light. He is mumbling something. It sounds like "coffee."',
      ),
    'talk fahim,ask fahim ?,tell fahim ?,say fahim,hello fahim': async (g, c) => {
      await g.approach([226, 160]);
      g.player.faceToward(FAHIM_SLUMP[0], FAHIM_SLUMP[1]);
      if (!g.flag('fahim_awake')) return void (await g.talk('fahim', cycle(g, 'fahim_z_i', ZOMBIE)));
      const f = g.actor('fahim');
      const topic = c.noun2 ?? '';
      const topics: Record<string, string> = {
        adriana: "Adriana went down to the basement three hours ago, before the crash. Her badge status is still green. She's not answering her phone. Then again, nobody's phone works. It's probably fine. It's probably fine.",
        krishna: "Krishna's building a brain-computer interface in the R&D lab. For debugging. From the INSIDE. I said that's insane. He said 'thank you.'",
        denis: "Denis wrote the Monolith's original code. In 1987. He's been its sysadmin ever since. I think he's the only person alive who understands it. Also possibly the only person alive who's met it.",
        phil: "Phil loves process. Give him paperwork and he'll give you anything. Except the putter.",
        aidan: "Aidan? Poor kid. The runbook told him to restart the Monolith. That runbook was written in 1999. I've filed a ticket to update it. Ticket number one, actually.",
        mike: "Mike sold a client 'Quantum Sync' this morning. I don't know what it is. Mike doesn't know what it is. The client is VERY excited.",
        nicholas: "Nicholas has been trying to center a div since Tuesday. His keyboards have keyboards.",
        rule: "Rule Number One. Never deploy on a Friday. It's the only rule I've ever been able to enforce. Tonight it enforced itself.",
      };
      if (topic && topics[topic]) {
        if (f) f.dir = 'down';
        await g.talk('fahim', topics[topic]);
        if (f) f.dir = 'up';
        return;
      }
      if (f) f.dir = 'down';
      await g.talk('fahim', g.flag('fahim_status_shown') ? cycle(g, 'fahim_flavor_i', FLAVOR) : progressLine(g));
      g.set('fahim_status_shown', !g.flag('fahim_status_shown'));
      if (f) f.dir = 'up';
    },
    'wake|tap|shake|touch|push fahim,attack fahim,slap fahim,yell fahim': async (g) => {
      await g.approach([226, 160]);
      if (g.flag('fahim_awake')) return void (await g.say("He's awake. He's VERY awake. Possibly more awake than any human has ever been."));
      await g.pose(null, 'reach', 300);
      await g.say('You give Fahim a gentle shake. One eye opens about a millimeter. It focuses on you, determines that you are not coffee, and closes again.');
      await g.talk('fahim', '...coffee...');
    },
    'give|show coffee fahim,put coffee fahim,give|show coffee console': async (g) => {
      if (!g.has('coffee')) return false;
      await g.approach([224, 160]);
      g.player.faceToward(FAHIM_SLUMP[0], FAHIM_SLUMP[1]);
      if (g.flag('fahim_awake')) {
        return void (await g.talk('fahim', "Another one? You're a hero. Actually, no, I'm good. Any more and I'll be able to see sound. Keep it for yourself. You've got a long night ahead."));
      }
      await g.pose(null, 'reach', 400);
      await g.say("You hold the steaming mug under Fahim's nose. His nostrils twitch. One eye opens. Then the other. A hand rises, slowly, like something from a graveyard at midnight, and closes around the mug.\n\nHe drinks. Then he CHUGS.");
      g.removeItem('coffee');
      g.sfx('splash');
      await g.wait(500);
      // eyes snap open
      g.remove('fahim');
      const f = g.add(new Actor('fahim', 'Fahim', person('fahim'), FAHIM_SLUMP[0], FAHIM_SLUMP[1], 'down'));
      f.pose = 'sit';
      g.sfx('beep');
      g.flash(15, 80);
      await g.wait(300);
      f.pose = 'sittalk';
      await convo(g, [
        ['fahim', "OKAY. I'm up. I'm UP. Hi, Dominic. Thank you. Status report:"],
        ['fahim', "At 4:59 PM the Monolith received a restart command. It hasn't come back. Core panic, every service down, and it's not answering on any port. I've tried SSH, telnet, serial-over-LAN, and yelling."],
        ['fahim', "Nothing can reach it remotely. Someone has to go down to the basement and deal with it in person. That someone is you, because I am contractually obligated to watch these dashboards be red."],
        ['fahim', "Problem: the building's in lockdown. The stairwell needs CEO clearance, and Phil won't authorize anything without paperwork. So..."],
      ]);
      f.pose = 'sit';
      await g.say('Fahim pulls a sheet off the printer, scribbles a signature on it, and slaps it into your hand.');
      g.addItem('report');
      g.set('fahim_awake');
      award(g, 'give_coffee_fahim');
      f.pose = 'sittalk';
      await convo(g, [
        ['fahim', "Incident report. SEV-1. Signed, sealed, and only slightly coffee-stained. Take it to Phil."],
        ['fahim', "Two more things. Krishna in the R&D lab has been building some kind of brain-computer helmet for debugging. If anyone can get inside the Monolith, it's with that thing."],
        ['fahim', "And Adriana went down to the basement three hours ago, before any of this happened. Nobody's heard from her since."],
        ['fahim', 'Go. I\'ll keep the dashboards company. And Dominic... whatever happens down there, remember Rule Number One.'],
      ]);
      // back to work
      g.remove('fahim');
      const w = g.add(new Actor('fahim', 'Fahim', person('fahim'), FAHIM_WORK[0], FAHIM_WORK[1], 'up'));
      w.pose = 'type';
      g.redraw();
      g.sfx('type');
      await g.say('Fahim spins his chair around to face the dashboards and starts typing at a speed that should not be physically possible.');
    },
    'give|show mug fahim': async (g) => {
      if (!g.has('mug')) return false;
      await g.approach([224, 160]);
      if (g.flag('fahim_awake')) return void (await g.talk('fahim', "An empty mug. Is this a metaphor? I've been up too long for metaphors."));
      await g.say('Fahim peers into the empty mug. Then at you. The look on his face holds the betrayal of a thousand on-call shifts.');
      await g.talk('fahim', '...empty...');
    },
    'give|show * fahim': async (g, c) => {
      if (!c.noun || !g.has(c.noun)) return false;
      await g.approach([224, 160]);
      if (!g.flag('fahim_awake')) return void (await g.talk('fahim', c.noun === 'candy' ? '...sugar... no... that just makes the crash worse... ...coffee...' : '...not... coffee...'));
      if (c.noun === 'report') return void (await g.talk('fahim', "Don't give it back to me! Give it to Phil! That's the whole point of the paperwork!"));
      await g.talk('fahim', "Unless that fixes a core panic, I'm good. Thanks though.");
    },
    'read rule,look friday': async (g) => g.say('"RULE #1: NEVER DEPLOY ON A FRIDAY." Somebody has underlined FRIDAY three times.'),
    'take rule,fix rule': "That banner is the closest thing this company has to a constitution. You leave it up.",
    'read videowall,read counter,read oncall': async (g, c) => {
      const hs = noc.hotspots!.find((h) => h.id === c.noun)!;
      await g.say(typeof hs.look === 'string' ? hs.look : ((hs.look as (g: Game) => string)(g) as string));
    },
    'type,type ?,use|type console,login,login ?,use computer,type computer,fix videowall,reboot videowall,turnoff videowall': async (g) => {
      await g.approach([236, 146]);
      g.player.dir = 'up';
      await g.pose(null, 'reach', 500);
      g.sfx('error');
      await g.say(
        g.flag('fahim_awake')
          ? "You lean over and type `ping monolith`. Request timed out. Request timed out. Request timed out. Fahim gently moves your hand off his keyboard. \"I've tried that,\" he says. \"Three thousand times.\""
          : 'You type `ping monolith` at a spare keyboard. Request timed out. Request timed out. Request timed out. Nothing on this floor can reach it.',
      );
    },
    'take|drink|eat cans,take can,drink energy drink': "Empty. Every single one. Fahim has achieved a level of caffeine tolerance where energy drinks are basically water. He needs the real thing: actual coffee.",
    'take|eat|open pizza,search pizza,look/in pizza': async (g) => {
      await g.approach('pizza');
      await g.say('You flip open the top box. A single crust, petrified, from incident #4417. You close the lid respectfully.');
    },
    'take rack,turnoff|reboot rack': "That's the monitoring stack. If you turn it off, the dashboards will go dark, and then Fahim will know nothing. He already knows that everything is broken, but he likes to know it in real time.",
    'take|fix counter': "It's been 0 for a long time. It will be 0 for a while longer. Fixing the Monolith is the only thing that will change that number.",
    'sit,sit *': "There's no free chair. NOC chairs are claimed by on-call engineers, and they defend them like dragons.",
    'take dashboards,take videowall': "Each of those screens weighs as much as you do. Also, Fahim needs them to stare at.",
    'take console': "It's bolted to the raised floor, and so, at this point, is Fahim.",
  },
};
