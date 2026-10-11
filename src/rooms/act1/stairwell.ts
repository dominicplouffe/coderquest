// The fire stairs: from the 3rd floor (top-left landing) zig-zagging down to the
// basement (bottom-right). Pitch black until Dominic lights Nicholas's RGB keyboard.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import type { Command } from '../../engine/parser';
import { Surface } from '../../engine/raster';
import { DARKER } from '../../engine/palette';
import { award } from '../../content/points';
import { blockWall, fireDoor, bigStencil, cardboardBox, pipeV, pipeH, tubeOn } from '../../art/basement_props';

// ---- geometry. Feet centerlines of the four landings; flights run between XA and XB.
const D = 6; // half-depth of a tread band (feet stand anywhere in c-D..c+D)
const T = 9; // thickness of a stringer / slab below its front edge
const Y0 = 74,
  Y1 = 110,
  Y2 = 146,
  Y3 = 182;
const XA = 112,
  XB = 200;
const N = 8; // steps per flight
const RISE = (Y1 - Y0) / N;
const RUN = (XB - XA) / N;

/** Centerline y of a flight at x (dirRight: descends to the right). */
const flightY = (x: number, top: number, dirRight: boolean) => top + ((dirRight ? x - XA : XB - x) / (XB - XA)) * (Y1 - Y0);

// walkable polygons
const L0: number[] = [4, Y0 - D, XA - 2, 2 * D];
const F1: number[] = [XA - 2, Y0 - D, XB, Y1 - D, XB, Y1 + D, XA - 2, Y0 + D];
const L1: number[] = [XB - 2, Y1 - D, 316 - (XB - 2), 2 * D];
const F2: number[] = [XB + 2, Y1 - D, XA, Y2 - D, XA, Y2 + D, XB + 2, Y1 + D];
const L2: number[] = [4, Y2 - D, XA - 2, 2 * D];
const F3: number[] = [XA - 2, Y2 - D, XB, Y3 - D, XB, Y3 + D, XA - 2, Y2 + D];
const L3: number[] = [XB - 2, Y3 - D, 316 - (XB - 2), 2 * D];

// door leaves (top-left corners)
const DOOR3: [number, number] = [14, Y0 - D - 46];
const DOOR2: [number, number] = [262, Y1 - D - 46];
const DOOR1: [number, number] = [26, Y2 - D - 46];
const DOORB: [number, number] = [264, Y3 - D - 46];

const lit = (g: Game) => !!g.flag('keyboard_on');

// ------------------------------------------------------------------ painting

/** A landing: tread band, front slab face, and a railing along its front edge. */
function landing(p: Surface, x0: number, x1: number, c: number, rail: boolean, railFrom = x0, railTo = x1) {
  p.rect(x0, c - D, x1 - x0, 2 * D, 7);
  p.hline(x0, x1 - 1, c - D, 8);
  p.speckle(x0, c - D + 1, x1 - x0, 2 * D - 2, 8, 0.05, c);
  p.hline(x0, x1 - 1, c + D - 1, 14); // safety nosing
  p.rect(x0, c + D, x1 - x0, T, 8);
  p.hline(x0, x1 - 1, c + D, 7);
  p.hline(x0, x1 - 1, c + D + T - 1, 0);
  if (rail) railing(p, railFrom, railTo, () => c, c + D + 1);
}

/** Railing: balusters every 6px, a yellow handrail 18px above the front edge. */
function railing(p: Surface, x0: number, x1: number, edge: (x: number) => number, z: number | ((x: number) => number)) {
  const zf = typeof z === 'number' ? () => z : z;
  for (let x = Math.ceil(x0); x <= x1; x++) {
    const fy = Math.round(edge(x) + D - 1);
    p.at(zf(x), () => {
      if ((x - Math.ceil(x0)) % 6 === 0 || x === Math.floor(x1)) p.vline(x, fy - 16, fy, 0);
      p.plot(x, fy - 18, 14);
      p.plot(x, fy - 17, 6);
    });
  }
}

/** One flight of N steps. dirRight: descends left-to-right from (XA, top) to (XB, top+36). */
function flight(p: Surface, top: number, dirRight: boolean, stringerZ = 0) {
  const steps: { x0: number; x1: number; c: number }[] = [];
  for (let i = 0; i < N; i++) {
    const a = dirRight ? XA + i * RUN : XB - (i + 1) * RUN;
    steps.push({ x0: Math.round(a), x1: Math.round(a + RUN), c: Math.round(top + RISE * (i + 1)) });
  }
  // stringer (side face of the flight) with a sawtooth top following the steps
  p.at(stringerZ, () => {
    for (const s of steps) {
      const yb0 = flightY(s.x0, top, dirRight) + D + T + 2;
      const yb1 = flightY(s.x1, top, dirRight) + D + T + 2;
      p.poly([s.x0, s.c + D, s.x1, s.c + D, s.x1, yb1, s.x0, yb0], 8);
      p.hline(s.x0, s.x1 - 1, s.c + D, 7);
      p.line(s.x0, Math.round(yb0), s.x1, Math.round(yb1), 0);
    }
  });
  // treads
  for (const s of steps) {
    p.rect(s.x0, s.c - D, s.x1 - s.x0, 2 * D, 7);
    p.hline(s.x0, s.x1 - 1, s.c - D, 8);
    p.speckle(s.x0, s.c - D + 1, s.x1 - s.x0, 2 * D - 2, 8, 0.05, s.x0 + s.c);
    p.hline(s.x0, s.x1 - 1, s.c + D - 1, 14);
    // riser edge on the lower side
    const ex = dirRight ? s.x1 - 1 : s.x0;
    p.vline(ex, s.c - D, s.c + D, 8);
  }
}

/** Painted dado band following a walk segment (wall paint behind landings / back flights). */
function dadoFlight(p: Surface, top: number, dirRight: boolean) {
  const xa = XA,
    xb = XB;
  const ya = flightY(xa, top, dirRight) - D,
    yb = flightY(xb, top, dirRight) - D;
  p.poly([xa, ya - 22, xb, yb - 22, xb, yb, xa, ya], 1);
  p.line(xa, ya - 22, xb, yb - 22, 14);
  p.line(xa, ya - 23, xb, yb - 23, 6);
}
function dadoLanding(p: Surface, x0: number, x1: number, c: number) {
  p.rect(x0, c - D - 22, x1 - x0, 22, 1);
  p.hline(x0, x1 - 1, c - D - 22, 14);
  p.hline(x0, x1 - 1, c - D - 23, 6);
}

function cardReader(p: Surface, x: number, y: number) {
  p.rect(x, y, 5, 8, 8);
  p.frame(x, y, 5, 8, 0);
  p.rect(x + 1, y + 4, 3, 2, 0);
}

function paint(p: Surface, g: Game) {
  // ---- the shaft: painted concrete block
  blockWall(p, 0, 0, 320, 190, 8, 0);
  p.rect(0, 0, 320, 6, 0);
  p.hline(0, 319, 6, 8);
  // standpipe running the full height, valve at every landing
  pipeV(p, 306, 7, 190, 4, 4, 12, 0);
  for (const c of [Y0, Y1, Y2, Y3]) {
    p.rect(303, c - 30, 10, 3, 4);
    p.circle(300, c - 29, 3, 12);
    p.circle(300, c - 29, 1, 4);
  }
  // a pipe along the basement ceiling (the drip comes from here)
  pipeH(p, 204, 258, Y1 + D + T + 2, 4, 7, 15, 8, 26);
  p.rect(256, Y1 + D, 3, T + 6, 8); // elbow up into the slab

  // ---- painted dado bands that follow the stairs
  dadoLanding(p, 0, XA, Y0);
  dadoFlight(p, Y0, true);
  dadoLanding(p, XB, 304, Y1);
  dadoLanding(p, 0, XA, Y2);
  dadoFlight(p, Y2, true);
  dadoLanding(p, XB, 304, Y3);

  // ---- doors, floor numbers, signage
  fireDoor(p, DOOR3[0], DOOR3[1], { sign: 'NO RE|ENTRY' });
  bigStencil(p, 48, 14, '3F', 14);
  fireDoor(p, DOOR2[0], DOOR2[1], { sign: 'NO RE|ENTRY' });
  cardReader(p, 292, Y1 - D - 28);
  bigStencil(p, 210, 42, '2F', 14);
  fireDoor(p, DOOR1[0], DOOR1[1], { sign: 'NO RE|ENTRY' });
  cardReader(p, 56, Y2 - D - 28);
  bigStencil(p, 66, 94, '1F', 14);
  fireDoor(p, DOORB[0], DOORB[1], { sign: 'B1' });
  bigStencil(p, 206, 134, 'B1', 14);
  // warning plate beside the basement door
  p.rect(234, DOORB[1] + 8, 26, 7, 14);
  p.frame(234, DOORB[1] + 8, 26, 7, 0);
  p.micro(236, DOORB[1] + 9, 'DENIS!', 4);

  // dead emergency light
  p.rect(76, 26, 18, 7, 7);
  p.frame(76, 26, 18, 7, 0);
  p.circle(79, 24, 2, 8);
  p.circle(90, 24, 2, 8);
  p.plot(79, 24, 0);
  p.plot(90, 24, 0);
  p.rect(82, 28, 6, 3, 0);
  p.plot(83, 29, 4); // a long-dead indicator

  // ---- graffiti
  p.micro(120, 14, 'DENIS WAS HERE 87', 13);
  // carved heart: D+G
  const hx = 176,
    hy = 30;
  p.lines([hx, hy + 3, hx - 3, hy, hx - 6, hy, hx - 8, hy + 3, hx - 8, hy + 6, hx, hy + 14, hx + 8, hy + 6, hx + 8, hy + 3, hx + 6, hy, hx + 3, hy, hx, hy + 3], 12);
  p.micro(hx - 5, hy + 4, 'D+G', 15);
  p.micro(126, 24, 'TABS', 10);
  p.line(125, 26, 141, 26, 12);
  p.micro(126, 31, 'SPACES', 10);
  p.micro(114, 104, 'NEVER', 12);
  p.micro(114, 110, 'REBOOT', 12);
  p.micro(139, 110, '!!', 12);
  p.micro(206, 62, 'WORKS ON MY', 11);
  p.micro(212, 68, 'MACHINE', 11);
  p.micro(168, 142, 'HERE BE', 10);
  p.micro(168, 148, 'DRAGONS', 10);
  p.lines([197, 141, 197, 151, 194, 148, 197, 151, 200, 148], 10);
  // a smiley on the 2F wall
  p.circle(246, 48, 4, 0);
  p.circle(246, 48, 3, 14);
  p.plot(245, 47, 0);
  p.plot(247, 47, 0);
  p.hline(245, 247, 50, 0);

  // ---- the basement level: floor and storage under the stairs
  p.rect(0, Y3 - D, 320, 190 - (Y3 - D), 8);
  p.hline(0, 319, Y3 - D, 0);
  p.speckle(0, Y3 - D + 1, 320, 12, 0, 0.06, 5);
  cardboardBox(p, 6, 164, 28, 13, 'XMAS 98');
  cardboardBox(p, 36, 167, 22, 10, 'Y2K');
  cardboardBox(p, 62, 169, 30, 8, 'DO NOT');
  // little puddle where the drip lands
  p.ellipse(240, Y3 + 3, 6, 1, 1);
  p.hline(237, 241, Y3 + 3, 9);

  // ---- landings & flights, back to front (lower = nearer)
  landing(p, 0, XA, Y0, true);
  flight(p, Y0, true);
  railing(p, XA, 178, (x) => flightY(x, Y0, true), (x) => flightY(x, Y0, true) + D + RISE + 2);
  landing(p, XB, 320, Y1, true, 204, 302);
  landing(p, 0, XA, Y2, true, 0, 106);
  flight(p, Y2, true);
  railing(p, XA + 4, XB - 2, (x) => flightY(x, Y2, true), (x) => flightY(x, Y2, true) + D + RISE + 2);
  // L3 is the basement floor itself; just its nosing toward the stairs
  p.rect(XB, Y3 - D, 120, 2 * D, 7);
  p.hline(XB, 319, Y3 - D, 0);
  p.speckle(XB, Y3 - D + 1, 120, 2 * D, 8, 0.06, 9);
  // the front flight (F2) occludes the back flight (F3) and the people on it
  flight(p, Y1, false, 189);
  railing(p, XA + 2, XB - 4, (x) => flightY(x, Y1, false), 189);
}

// ------------------------------------------------------------------ helpers

function setLight(g: Game) {
  // lit: the engine's rainbow light radius. Dark: front() paints the darkness itself,
  // leaving only a faint glow from the nearest door's wired-glass window.
  g.light = lit(g) ? { r: 60, rainbow: true } : null;
  darkAtBottom = g.player.y > Y2;
}
let darkAtBottom = false;

/** Pitch darkness with a dim glow around a door window (cx, cy). */
function paintDark(g: Game, s: Surface, t: number) {
  const bottom = darkAtBottom;
  const [dx, dy] = bottom ? DOORB : DOOR3;
  const cx = dx + 17,
    cy = dy + 14;
  const glowOn = bottom ? tubeOn(t) : true;
  const R = glowOn ? 30 : 22;
  const px = s.px;
  for (let y = 0; y < 190; y++)
    for (let x = 0; x < 320; x++) {
      const i = y * 320 + x;
      const d = Math.hypot(x - cx, (y - cy) * 1.3) / R;
      if (d >= 1) px[i] = 0;
      else {
        const thr = BAYER[((y & 3) << 2) | (x & 3)] / 16;
        if (d < 0.5) px[i] = DARKER[px[i]];
        else px[i] = thr > (d - 0.5) / 0.5 ? DARKER[DARKER[px[i]]] : 0;
      }
    }
  // the glass itself glows with the light from beyond
  const gc = glowOn ? 11 : 3;
  s.rect(dx + 15, dy + 6, 5, 12, gc);
  for (let k = 0; k < 12; k += 3) s.hline(dx + 15, dx + 19, dy + 6 + k, glowOn ? 15 : 9);
  s.vline(dx + 17, dy + 6, dy + 17, glowOn ? 15 : 9);
  // a thin line of light under the door
  if (glowOn) for (let x = dx + 1; x < dx + 23; x += 2) s.plot(x, dy + 46, 8);
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Which level is Dominic on (0 top .. 3 basement)? */
function level(g: Game): number {
  const y = g.player.y;
  const ys = [Y0, Y1, Y2, Y3];
  let best = 0;
  ys.forEach((c, i) => {
    if (Math.abs(y - c) < Math.abs(y - ys[best])) best = i;
  });
  return best;
}

async function fallInDark(g: Game) {
  const p = g.player;
  p.stop();
  await g.say("You feel for the first step with your foot. There it is. Probably. You put your weight on it.");
  g.sfx('thud');
  g.shake(500);
  p.visible = false;
  await g.wait(300);
  g.sfx('crash');
  g.shake(700);
  await g.wait(900);
  return g.die("You missed the first step. And all the others.\n\nThe stairwell lights, like everything else in this building, run on the Monolith. Next time, bring a light. Preferably one with more LEDs than common sense.", { title: 'Stack Underflow' });
}

let lighting = false;
async function lightUp(g: Game) {
  lighting = true;
  g.set('keyboard_on');
  g.sfx('beep');
  for (let r = 6; r <= 60; r += 6) {
    g.light = { r, rainbow: true };
    await g.wait(40);
  }
  g.light = { r: 60, rainbow: true };
  lighting = false;
  award(g, 'light_keyboard');
  await g.say("You flip the switch on the Rainbow Warrior.\n\nThe stairwell EXPLODES into color. Red, orange, green, cyan and violet chase each other across the concrete like a roller rink in 1987. Nicholas would weep with pride.\n\nBelow you, the stairs zig-zag down into the dark, toward the basement.");
}

const darkLook = async (g: Game, c: Command) => {
  if (lit(g)) return false;
  if (c.noun && (g.has(c.noun) || c.noun === 'self' || c.noun === 'hands')) return false;
  if (c.noun === 'door' && level(g) === 0) return void (await g.say('You can just make out the door you came through, thanks to the feeble light leaking through its little wired-glass window. It lights up exactly nothing useful.'));
  if (c.noun === 'basementdoor' && level(g) === 3) return void (await g.say('A sliver of flickering light leaks through the little window of the basement door. Everything else is black.'));
  await g.say(c.noun ? "It's too dark to see that. It's too dark to see anything." : "It's pitch black. You can't see a thing.\n\nSomewhere far below, water drips. Somewhere further below than that, something very old hums.");
};

async function leaveTop(g: Game) {
  await g.walk(null, 26, Y0 - D + 1);
}
async function leaveBottom(g: Game) {
  if (!lit(g) && level(g) < 3) {
    await g.walk(null, XA - 4, Y0);
    await g.walk(null, XA + 20, flightY(XA + 20, Y0, true));
    return;
  }
  await g.walk(null, 276, Y3 - D + 1);
}

// ------------------------------------------------------------------ the room

export const stairwell: RoomDef = {
  id: 'stairwell',
  title: 'Stairwell',
  act: 1,
  music: 'basement',
  start: [44, Y0, 'right'],
  draw: paint,
  walk: [L0, F1, L1, F2, L2, F3, L3],
  look: (g) =>
    lit(g)
      ? 'The fire stairs, lit up like a 1987 roller disco by the keyboard in your hands. Bare concrete flights zig-zag down from the third floor past the locked doors of 2F and 1F to the basement. There is graffiti on the walls, a dead emergency light, and a lot of shadows that your rainbow keeps chasing around.'
      : "It's pitch black. You can't see a thing.\n\nSomewhere far below, water drips. Somewhere further below than that, something very old hums.",
  hotspots: [
    {
      id: 'door',
      nouns: ['door', 'doors', 'fire door', 'top door', 'third floor door', '3f door', 'hallway door', 'exit door', 'no re entry'],
      area: [DOOR3[0] - 3, DOOR3[1] - 3, 30, 49],
      at: [30, Y0 - 2],
      look: 'The fire door back to the third floor. It has a NO RE-ENTRY sign, which tonight is more of a philosophy than a rule: it opens from this side just fine.',
    },
    {
      id: 'door2f',
      nouns: ['second floor door', '2f door', '2nd floor door', 'floor 2 door', 'door 2', 'locked door', 'locked doors'],
      area: [DOOR2[0] - 3, DOOR2[1] - 3, 36, 49],
      at: [274, Y1 - 2],
      look: 'The door to the second floor. Locked. The card reader beside it glows a smug little red. The building is in lockdown, and it is taking it very personally.',
    },
    {
      id: 'door1f',
      nouns: ['first floor door', '1f door', '1st floor door', 'ground floor door', 'lobby door', 'door 1'],
      area: [DOOR1[0] - 3, DOOR1[1] - 3, 36, 49],
      at: [38, Y2 - 2],
      look: "The door to the first floor and the lobby. Locked tight, card reader glowing red. Freedom is right there, and it's on the wrong side of a Monolith outage.",
    },
    {
      id: 'basementdoor',
      nouns: ['basement door', 'b1 door', 'bottom door', 'b1', 'basement', 'denis sign'],
      area: [DOORB[0] - 3, DOORB[1] - 12, 30, 58],
      at: [276, Y3 - 3],
      look: 'The door to the basement, B1. Someone has added a plate above it that just says DENIS! with an exclamation point, the way other buildings say HIGH VOLTAGE. A flickering light leaks through its little window.',
    },
    {
      id: 'stairs',
      nouns: ['stairs', 'stair', 'steps', 'step', 'staircase', 'flight', 'flights', 'stairwell', 'stairway', 'landing', 'landings'],
      area: [XA, Y0 - D, XB, Y1 - D, XB, Y2 + D + T, XA, Y2 + D + T],
      look: 'Bare concrete stairs with yellow safety nosing, zig-zagging down through the building like a very slow, very manual elevator. Three floors to go.',
    },
    {
      id: 'railing',
      nouns: ['railing', 'rail', 'handrail', 'banister', 'bannister', 'railings', 'balusters'],
      area: [0, Y0 - 14, XA, 16],
      look: 'A steel railing with a handrail painted safety yellow. It is the only cheerful thing in the stairwell, and it is trying its best.',
    },
    {
      id: 'graffiti',
      nouns: ['graffiti', 'writing', 'scrawl', 'heart', 'tag', 'tags', 'initials', 'carving', 'smiley', 'smiley face'],
      area: [114, 10, 74, 36],
      look: 'Graffiti, layered over decades:\n\n"DENIS WAS HERE 87"\nA carved heart: "D+G"\n"TABS" (crossed out) "SPACES"\n"NEVER REBOOT!!"\n"WORKS ON MY MACHINE"\n"HERE BE DRAGONS", with an arrow pointing down.\n\nYou get the feeling the basement has a reputation.',
    },
    {
      id: 'elight',
      nouns: ['emergency light', 'emergency lights', 'battery light', 'emergency lamp', 'light fixture', 'fixture'],
      area: [74, 20, 22, 14],
      at: [84, Y0 - 2],
      look: 'An emergency light. It has exactly one job, which is to turn on in exactly this kind of emergency. A tag on it says it was last tested in March 1999. It has been resting since.',
    },
    {
      id: 'numbers',
      nouns: ['sign', 'signs', 'number', 'numbers', 'floor number', 'floor numbers', '3f', '2f', '1f', 'stencil'],
      area: [46, 12, 26, 18],
      look: 'Big stenciled floor numbers in yellow paint: 3F, 2F, 1F, B1. The B1 is painted a little more nervously than the others.',
    },
    {
      id: 'standpipe',
      nouns: ['pipe', 'pipes', 'standpipe', 'fire pipe', 'valve', 'valves', 'red pipe', 'hose connection'],
      area: [296, 7, 18, 183],
      look: 'A red fire standpipe runs the full height of the stairwell, with a hose valve at every landing. The valves are painted shut. All of them.',
    },
    {
      id: 'spider',
      nouns: ['spider', 'web', 'cobweb', 'cobwebs', 'thread'],
      area: [84, Y0 + D + T, 10, 26],
      look: "A spider dangles from the underside of the 3rd floor landing, minding its own business. Since the lights went out, it's essentially in charge of the stairwell.",
    },
    {
      id: 'boxes',
      nouns: ['boxes', 'box', 'junk', 'storage', 'decorations', 'christmas decorations', 'cardboard'],
      area: [4, 162, 90, 18],
      look: 'Boxes shoved under the stairs: "XMAS 98", "Y2K", and one that just says "DO NOT". Somebody has been storing things here since before you were hired. Possibly before you were born.',
    },
    {
      id: 'drip',
      nouns: ['drip', 'water', 'puddle', 'leak', 'drop', 'droplet'],
      area: [228, Y1 + D + T + 2, 22, Y3 + 6 - (Y1 + D + T + 2)],
      at: [244, Y3 - 2],
      look: 'A slow, patient drip from the pipe above, making a slow, patient puddle on the basement floor. Drip. Drip. Drip. Like a log file nobody reads.',
    },
  ],
  exits: [
    { area: [12, Y0 - D - 2, 28, 5], to: 'hallway', at: [275, 122, 'down'], dir: 'up|north|out|west' },
    { area: [262, Y3 - D - 2, 28, 5], to: 'basement', at: [22, 160, 'right'], dir: 'down|south|east' },
  ],
  zones: [
    { area: [XA + 6, Y0 - D - 2, XB - 8, Y1 - D - 2, XB - 8, Y1 + D + 2, XA + 6, Y0 + D + 2], when: (g) => !lit(g), enter: fallInDark },
    { area: [XB - 6, Y1 - D - 2, XA + 6, Y2 - D - 2, XA + 6, Y2 + D + 2, XB - 6, Y1 + D + 2], when: (g) => !lit(g), enter: fallInDark },
    { area: [XA + 6, Y2 - D - 2, XB - 8, Y3 - D - 2, XB - 8, Y3 + D + 2, XA + 6, Y2 + D + 2], when: (g) => !lit(g), enter: fallInDark },
  ],
  nouns: {
    reader: ['reader', 'card reader', 'badge reader', 'keycard reader', 'scanner'],
    lightswitch: ['light switch', 'switch', 'lightswitch', 'switches'],
    walls: ['wall', 'walls', 'concrete', 'block', 'blocks', 'cinder blocks', 'paint', 'stripe'],
  },
  verbs: {
    'look ?,read ?,search ?': darkLook,
    // the dramatic version of TURN ON KEYBOARD (items.ts defers to us in here)
    'turnon|use keyboard,push * keyboard': async (g) => {
      if (!g.has('keyboard') || lit(g)) return false;
      await lightUp(g);
    },
    'turnon|use|push|flip lightswitch,turnon light,use light': async (g) => {
      await g.say(
        lit(g)
          ? 'You find the light switch by rainbow-light and flip it. Click. Nothing. Click-click-click. Nothing. The stairwell lights run on the Monolith, like everything else in this building, including apparently your patience.'
          : "You grope along the wall and find a light switch. Click. Nothing. Click-click-click. Nothing.\n\nThe stairwell lights run on the Monolith, like everything else in this building. If only you had something that glows.",
      );
    },
    'turnon|fix|push|use|reboot elight': "You give the emergency light a hopeful whack. It doesn't even flicker. Its battery went to the great recycling bin in the sky sometime around Y2K.",
    'turnon|use phone,use phone light,use phone flashlight': "You reach for your phone's flashlight. Your phone, at 0% battery, reaches back for nothing.",
    'drop|throw keyboard': 'And plunge yourself back into total darkness? The keyboard stays in your hands, blazing away.',
    'open|use|push|enter door': async (g) => {
      const lv = level(g);
      if (lv === 3) return void (await leaveBottom(g));
      if (lv === 0) return void (await leaveTop(g));
      if (!lit(g)) return void (await g.say("Somewhere around here there's a door. You can't see it."));
      await g.approach(lv === 1 ? 'door2f' : 'door1f');
      g.sfx('doorlocked');
      await g.say('You push the panic bar. It clunks against the lock and goes nowhere. The card reader blinks red at you, almost apologetically. Lockdown.');
    },
    'open|use|push|unlock door2f|door1f,use|swipe keycard|badge door2f|door1f|reader,use reader': async (g, c) => {
      if (!lit(g)) return void (await g.say("You can't see a thing. Doors, readers and dignity are all lost in the dark."));
      const id = c.noun === 'door2f' || c.noun2 === 'door2f' ? 'door2f' : c.noun === 'door1f' || c.noun2 === 'door1f' ? 'door1f' : level(g) === 1 ? 'door2f' : 'door1f';
      await g.approach(id);
      g.sfx('doorlocked');
      if (c.noun === 'keycard' || c.noun === 'badge') return void (await g.say("You swipe it. The reader thinks about it, beeps sadly, and stays red. The stairwell readers can't reach the Monolith either. Only the 3rd floor door was wired to Phil's emergency override."));
      await g.say('Locked. The card reader blinks red. The building is in lockdown and is taking it very personally. Anyway, you need to go DOWN.');
    },
    'open|use|push|enter basementdoor': async (g) => leaveBottom(g),
    'knock door|door2f|door1f,knock': async (g) => {
      g.sfx('knock');
      await g.say("You knock. The sound echoes up and down the shaft. Nobody answers: everyone sensible went home at five o'clock.");
    },
    'knock basementdoor': async (g) => {
      g.sfx('knock');
      await g.say("You knock on the basement door. Nobody answers. It doesn't seem to be locked, though. Denis apparently trusts the stairwell to keep people out. Fair.");
    },
    'go|climb stairs,climb,climb down': async (g, c) => {
      const up = c.words.includes('up') || c.verbWord === 'climb up' || c.verbWord === 'ascend';
      if (up) return void (await leaveTop(g));
      await leaveBottom(g);
    },
    'jump railing|stairs|down,climb railing,jump': async (g, c) => {
      if (!c.noun) return void (await g.say(lit(g) ? 'You hop in place. The rainbow hops with you. Very festive.' : 'You jump. In place. In the dark. It accomplishes nothing, but it counts as cardio.'));
      if (!lit(g)) return void (await g.say("You can't even see where 'down' is. Which, ironically, is the whole problem."));
      await g.approach([g.player.x, g.player.y]);
      g.sfx('thud');
      g.player.visible = false;
      g.shake(600);
      await g.wait(500);
      g.sfx('crash');
      await g.wait(600);
      return g.die("You vault the railing to take the express route down.\n\nIt is, technically, faster than the stairs. It is not, technically, survivable.", { title: 'Express Route' });
    },
    'use railing,touch railing': 'You keep one hand on the railing, like a responsible adult who has read the safety poster.',
    'put railing': "You consider sliding down the banister like it's 1987 and you're twelve. Your lower back files a formal objection before you even get a leg over.",
    'take|pull|break railing': "It's bolted into the concrete. Fire code. Some rules even this building still follows.",
    'take|catch|attack|touch spider': "You leave the spider alone. It's the only one in this building with a working bug-catching system.",
    'talk spider': 'You ask the spider how it\'s doing. It continues doing spider things. Honestly, a better listener than most of your sprint retros.',
    'take|search|open boxes': 'You poke at the boxes. XMAS 98: tinsel and a dot-matrix "HAPPY HOLIDAYS" banner. Y2K: four hundred pages of compliance checklists, all signed "Denis". DO NOT: you do not.',
    'drink|touch|take drip': "It's basement water, of unknown provenance, dripping from a pipe of unknown purpose. You have standards. Low ones, tonight, but standards.",
    'take|read|turn standpipe,open standpipe': 'You try a valve. Painted shut. They are all painted shut. In an actual fire, you suspect the plan is "Denis".',
    'take elight': "It's bolted to the wall and dead anyway. Which describes a lot of things in this building.",
    'look walls,touch walls': async (g) => {
      if (!lit(g)) return void (await g.say('You put a hand on the wall. Cold concrete block. It is very much a wall. That is all you can tell in the dark.'));
      await g.say('Painted concrete block, with a blue stripe that follows the stairs down and a yellow line along its top. Someone in 1987 thought this was cheerful.');
    },
    'listen,listen ?': "Drip. Drip. Hum.\n\nSomewhere far below, a very old machine is having a very bad day.",
    'smell,smell ?': 'Concrete, dust, a hint of mildew, and a faint whiff of ozone drifting up from below.',
    'sit,sit stairs': 'You sit on a step for a moment. It is cold, it is hard, and production is still down. You get up.',
    'wait': async (g) => {
      await g.say(lit(g) ? 'You wait. The rainbow cycles. The spider climbs up a bit. Production remains down.' : "You wait for your eyes to adjust. They adjust to 'pitch black'.");
    },
    'call': 'This is the stairwell. The stairs ARE the elevator. They are just very, very manual.',
    'turnoff light': "There's nothing on to turn off. That's the problem.",
  },
  enter(g) {
    setLight(g);
    if (lit(g)) award(g, 'light_keyboard');
  },
  afterEnter: async (g, from) => {
    if (from === 'hallway' && !lit(g)) {
      g.sfx('door');
      await g.say(
        g.has('keyboard')
          ? "The fire door swings shut behind you with a heavy CLUNK.\n\nIt is pitch black. The stairwell lights must run on the Monolith too, like everything else in this building. Somewhere below, water drips.\n\nYou are carrying, among other things, the brightest keyboard in the building."
          : "The fire door swings shut behind you with a heavy CLUNK.\n\nIt is pitch black. The stairwell lights must run on the Monolith too, like everything else in this building. Walking down three flights of concrete stairs blind seems like a poor career move. You need some kind of light.",
      );
    } else if (from === 'hallway' && lit(g) && (g.state.visited['stairwell'] ?? 0) <= 1) {
      await g.say('The Rainbow Warrior throws a slow-cycling disco glow over bare concrete. The stairs zig-zag down into the dark, toward the basement.');
    }
  },
  tick(g) {
    // TURN ON KEYBOARD may have been handled by the item itself
    if (lit(g) && !g.light?.rainbow && !lighting) {
      g.light = { r: 60, rainbow: true };
      award(g, 'light_keyboard');
    }
  },
  overlay(g, s, t) {
    // the spider bobs on its thread
    const sy = Y0 + D + T + 2 + Math.round(9 + 7 * Math.sin(t / 50));
    s.vline(88, Y0 + D + T, sy - 1, 7);
    s.rect(87, sy, 3, 2, 0);
    s.plot(86, sy - 1, 0);
    s.plot(90, sy - 1, 0);
    s.plot(86, sy + 2, 0);
    s.plot(90, sy + 2, 0);
    // the drip from the basement pipe
    const ph = t % 110;
    const px = 240,
      py0 = Y1 + D + T + 7;
    if (ph < 50) {
      if (ph > 20) s.plot(px, py0, 9);
    } else if (ph < 72) {
      const k = (ph - 50) / 22;
      s.plot(px, Math.round(py0 + k * k * (Y3 + 2 - py0)), 11);
    } else if (ph < 80) {
      s.plot(px - 2, Y3 + 1, 11);
      s.plot(px + 2, Y3 + 1, 11);
      s.plot(px, Y3, 15);
    }
    // locked doors' card readers blink red
    const on = Math.floor(t / 30) % 2 === 0;
    s.plot(294, Y1 - D - 23, on ? 12 : 4);
    s.plot(58, Y2 - D - 23, on ? 12 : 4);
    // the basement's flickering tube leaks under the B1 door and through its window
    const bright = tubeOn(t);
    s.hline(DOORB[0] + 1, DOORB[0] + 22, DOORB[1] + 46, bright ? 14 : 6);
    if (bright) {
      s.hline(DOORB[0] + 15, DOORB[0] + 19, DOORB[1] + 7, 14);
      s.hline(DOORB[0] + 15, DOORB[0] + 19, DOORB[1] + 10, 14);
    }
    // the hallway is lit: its glow comes through the 3F door's window
    s.plot(DOOR3[0] + 16, DOOR3[1] + 8, 15);
    s.plot(DOOR3[0] + 18, DOOR3[1] + 13, 15);
  },
  front(g, s, t) {
    if (!lit(g)) return paintDark(g, s, t);
    // Dominic holds the blazing keyboard in front of him
    const p = g.player;
    if (!p.visible || p.dir === 'up' || p.pose) return;
    const cols = [12, 14, 10, 11, 9, 13];
    const y = Math.round(p.y) - 16;
    const x0 = Math.round(p.x) + (p.dir === 'left' ? -8 : p.dir === 'right' ? 1 : -4);
    const w = p.dir === 'down' ? 9 : 7;
    s.rect(x0, y, w, 2, 0);
    for (let i = 0; i < w; i++) s.plot(x0 + i, y, cols[(i + Math.floor(t / 6)) % cols.length]);
  },
};
