// The Core. A circular chamber whose floor is a giant clock face stopped at
// 23:59:59. On the central altar glows the 1987 date routine; over it, a huge
// display flips "99 -> 00". The Heisenbug flits about and vanishes whenever it
// is looked at. PUT JAR ON ALTAR, CLOSE EYES, APPLY PATCH, LOG OUT.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, rng, microWidth } from '../../engine/raster';
import { dith, Fill } from '../../engine/palette';
import { Actor } from '../../engine/actor';
import { ANIMATE } from '../../engine/parser';
import { person } from '../../art/cast';
import { award } from '../../content/points';
import { heisenbugImg, butterflyImg, drawJarBug, dissolveImg, hash, lift } from '../../art/creatures_d';
import { tween, haltPlayer } from '../../art/cyber_d_lib';
import { CYBER_VERBS, cyberRaw } from '../../art/cyber_c_kit';

ANIMATE.add('bug');

const CX = 160;
const FY = 150; // floor ellipse center
const FRX = 156;
const FRY = 40;
const ALTAR_Y = 142; // front edge of the altar on the floor
const PORTAL: [number, number] = [44, 102]; // center of the portal ring
const PORTAL_FLOOR: [number, number] = [44, 130];
const ALTAR_SPOT: [number, number] = [CX + 30, 146]; // stand here (facing left) to work at the altar

/** y of the back edge of the floor (wall/floor seam) at x. */
const seamY = (x: number) => FY - FRY * Math.sqrt(Math.max(0, 1 - ((x - CX) / FRX) ** 2));

// Heisenbug perches: [ground x, ground y, altitude]
const PERCHES: [number, number, number][] = [
  [62, 140, 28],
  [262, 136, 36],
  [232, 168, 10],
  [96, 172, 14],
  [196, 126, 20],
  [122, 126, 34],
  [286, 160, 22],
  [36, 162, 16],
  [214, 150, 44],
  [104, 148, 52],
];
const NEAR_ALTAR: [number, number, number][] = [
  [178, 130, 30],
  [142, 130, 28],
  [160, 128, 44],
  [186, 144, 14],
];

// ---- transient state
let bugT = 0; // ticks until the next jump
let hidden = 0; // ticks the bug stays vanished after being observed
let smear: { x0: number; y0: number; x1: number; y1: number; t: number } | null = null;
let burst: { x: number; y: number; t: number } | null = null;
let lookCount = 0;
let jarOnAltar: 'none' | 'trap' | 'caught' | 'fixing' | 'passed' = 'none';
let label: 'TEST' | 'FAIL' | 'PASS' = 'TEST';
let rewrite = -1; // 0..1 progress of the date routine being rewritten
let fly: Actor | null = null;
let dying = false;

// ------------------------------------------------------------------ painting

function seg(p: Surface, x: number, y: number, w: number, h: number, digit: string, on: number, off: Fill, th = 3) {
  const S: Record<string, string> = {
    '0': 'abcdef',
    '1': 'bc',
    '2': 'abged',
    '3': 'abgcd',
    '4': 'fgbc',
    '5': 'afgcd',
    '6': 'afgedc',
    '7': 'abc',
    '8': 'abcdefg',
    '9': 'abcdfg',
  };
  const lit = S[digit] ?? '';
  const mid = y + Math.floor(h / 2) - Math.floor(th / 2);
  const parts: Record<string, [number, number, number, number]> = {
    a: [x + th, y, w - 2 * th, th],
    d: [x + th, y + h - th, w - 2 * th, th],
    g: [x + th, mid, w - 2 * th, th],
    f: [x, y + th, th, Math.floor(h / 2) - th],
    b: [x + w - th, y + th, th, Math.floor(h / 2) - th],
    e: [x, mid + th, th, y + h - th - mid - th],
    c: [x + w - th, mid + th, th, y + h - th - mid - th],
  };
  for (const [k, [px, py, pw, ph]] of Object.entries(parts)) p.rect(px, py, pw, ph, lit.includes(k) ? on : off);
}

function drawDisplay(p: Surface, g: Game, glitch = 0) {
  const fixed = !!g.flag('bug_fixed');
  const x0 = 90,
    y0 = 12,
    w = 140,
    h = 46;
  p.rect(x0 - 3, y0 - 3, w + 6, h + 6, 8);
  p.frame(x0 - 3, y0 - 3, w + 6, h + 6, 7);
  p.hline(x0 - 3, x0 + w + 2, y0 - 3, 15);
  p.rect(x0, y0, w, h, 0);
  // mounting struts to the ceiling
  p.vline(x0 + 20, 0, y0 - 4, 8);
  p.vline(x0 + w - 20, 0, y0 - 4, 8);
  const lbl = fixed ? '01-01  00:00:00  YEAR' : '12-31  23:59:59  YEAR';
  p.micro(x0 + Math.floor((w - microWidth(lbl)) / 2), y0 + 2, lbl, fixed ? 10 : 7);
  if (!fixed) {
    const off = dith(0, 4, 3);
    seg(p, x0 + 8, y0 + 11, 16, 28, '9', 12, off);
    seg(p, x0 + 28, y0 + 11, 16, 28, '9', 12, off);
    const right = glitch === 1 ? '19' : '00';
    seg(p, x0 + 96, y0 + 11, 16, 28, right[0], glitch === 2 ? 4 : 12, off);
    seg(p, x0 + 116, y0 + 11, 16, 28, right[1], 12, off);
    // the arrow
    p.rect(x0 + 52, y0 + 23, 26, 4, 14);
    p.poly([x0 + 76, y0 + 18, x0 + 88, y0 + 25, x0 + 76, y0 + 32], 14);
  } else {
    const digs = '19992000';
    const off = dith(0, 2, 3);
    for (let i = 0; i < 4; i++) seg(p, x0 + 4 + i * 13, y0 + 13, 11, 22, digs[i], 10, off, 2);
    for (let i = 0; i < 4; i++) seg(p, x0 + 84 + i * 13, y0 + 13, 11, 22, digs[i + 4], 10, off, 2);
    p.rect(x0 + 58, y0 + 22, 14, 3, 10);
    p.poly([x0 + 70, y0 + 18, x0 + 80, y0 + 23, x0 + 70, y0 + 29], 10);
  }
}

function drawJar(p: Surface, x: number, y: number, lbl: string, open: boolean) {
  // x,y = bottom-center
  p.rect(x - 5, y - 11, 10, 11, dith(11, 0, 4));
  p.frame(x - 5, y - 11, 10, 11, 11);
  p.vline(x - 3, y - 9, y - 3, 15);
  // lid
  if (open) {
    p.rect(x - 9, y - 15, 7, 2, 8);
    p.plot(x - 6, y - 16, 7);
  } else p.rect(x - 6, y - 14, 12, 3, 8);
  p.hline(x - 6, x + 5, y - 12, 7);
  // label
  const col = lbl === 'PASS' ? 10 : lbl === 'FAIL' ? 12 : 15;
  p.rect(x - 5, y - 7, 10, 5, col);
  p.micro(x - 4, y - 7, lbl === 'TEST' ? 'TST' : lbl === 'PASS' ? 'OK' : 'ERR', 0);
}

function paint(p: Surface, g: Game) {
  const fixed = !!g.flag('bug_fixed');
  const r = rng(2000);
  p.rect(0, 0, 320, 190, 0);

  // ---- the wall of the cylinder: ribs that converge toward the sides, rings of light
  for (let x = 0; x < 320; x++) {
    const top = 0,
      bot = Math.round(seamY(x));
    for (let y = top; y < bot; y++) p.plot(x, y, 0);
  }
  // horizontal rings (ellipse arcs at several heights)
  for (const [hgt, col] of [
    [18, 1],
    [44, 3],
    [70, 1],
    [96, 1],
    [118, 9],
  ] as [number, number][]) {
    for (let x = 0; x < 320; x++) {
      const y = Math.round(seamY(x) - hgt * (0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - ((x - CX) / FRX) ** 2))));
      if (y >= 0) p.plot(x, y, col);
    }
  }
  // vertical ribs
  for (let k = 1; k < 18; k++) {
    const th = (k / 18) * Math.PI;
    const x = Math.round(CX - Math.cos(th) * FRX);
    const bot = Math.round(seamY(x));
    const w = Math.max(1, Math.round(Math.sin(th) * 4));
    p.rect(x - Math.floor(w / 2), 0, w, bot, 1);
    p.vline(x - Math.floor(w / 2), 0, bot - 1, 9);
    // glowing nodes up the ribs
    for (let y = 20 + (k % 3) * 9; y < bot - 4; y += 26) {
      p.plot(x, y, 11);
      if (w > 2) p.plot(x + 1, y, 3);
    }
  }
  // circuit traces between ribs
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * 300) + 10;
    const yb = seamY(x);
    const y = Math.floor(r() * (yb - 10)) + 4;
    if (x > 84 && x < 236 && y < 64) continue;
    const len = 4 + Math.floor(r() * 12);
    p.hline(x, x + len, y, 1);
    p.vline(x + len, y, y + 5, 1);
    p.plot(x, y, 3);
  }

  // ---- the giant date display
  drawDisplay(p, g);

  // ---- the floor: a clock face, stopped at 23:59:59
  for (let y = 108; y < 190; y++)
    for (let x = 0; x < 320; x++) {
      const d = ((x - CX) / FRX) ** 2 + ((y - FY) / FRY) ** 2;
      if (d <= 1) p.plot(x, y, d > 0.92 ? 1 : 0);
    }
  for (const [k, col] of [
    [1, 9],
    [0.8, 1],
    [0.55, 3],
    [0.3, 1],
  ] as [number, number][])
    p.ellipseO(CX, FY, Math.round(FRX * k), Math.round(FRY * k), col);
  // hour marks and numerals
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    const sx = Math.sin(a),
      sy = -Math.cos(a);
    const x0 = CX + sx * FRX * 0.84,
      y0 = FY + sy * FRY * 0.84;
    const x1 = CX + sx * FRX * 0.96,
      y1 = FY + sy * FRY * 0.96;
    p.line(x0, y0, x1, y1, h % 3 === 0 ? 11 : 9);
  }
  const num = (txt: string, a: number) => {
    const x = CX + Math.sin(a) * FRX * 0.72,
      y = FY - Math.cos(a) * FRY * 0.72;
    p.micro(Math.round(x - microWidth(txt) / 2), Math.round(y - 2), txt, fixed ? 10 : 11);
  };
  num('XII', 0);
  num('III', Math.PI / 2);
  num('VI', Math.PI);
  num('IX', -Math.PI / 2);

  // ---- the altar
  p.at(ALTAR_Y, () => {
    p.ellipse(CX, 140, 24, 6, 8);
    p.ellipseO(CX, 140, 24, 6, 7);
    p.rect(CX - 12, 114, 24, 26, 7);
    p.rect(CX - 12, 114, 4, 26, 15);
    p.rect(CX + 8, 114, 4, 26, 8);
    p.vline(CX - 5, 116, 138, 8);
    p.vline(CX + 5, 116, 138, 8);
    p.ellipse(CX, 140, 12, 3, 7);
    p.rect(CX - 9, 126, 18, 7, 0);
    p.micro(CX - 8, 127, 'D.1987', 14);
    // the slab
    p.ellipse(CX, 112, 21, 5, 8);
    p.ellipse(CX, 111, 20, 4, 7);
    p.ellipse(CX, 110, 18, 3, 15);
    p.glow(CX, 110, 14, fixed ? 10 : 14, -1, 3);
    if (jarOnAltar === 'trap') drawJar(p, CX + 9, 111, 'TEST', true);
    if (jarOnAltar === 'passed') drawJar(p, CX + 9, 111, 'PASS', true);
  });

  // ---- the log-out portal, once the bug is fixed
  if (fixed) {
    const [px, py] = PORTAL;
    p.ellipse(px, py + 26, 16, 4, 1);
    p.ellipseO(px, py + 26, 16, 4, 9);
    for (let k = 0; k < 3; k++) p.ellipseO(px, py, 13 - k, 22 - k, [15, 11, 3][k]);
    // the universal power / log-out symbol above it
    p.ellipseO(px, py - 34, 6, 6, 11);
    p.rect(px - 2, py - 42, 5, 4, 0);
    p.vline(px, py - 42, py - 34, 15);
    p.vline(px + 1, py - 41, py - 35, 11);
    const t = 'LOG OUT';
    p.rect(px - microWidth(t) / 2 - 2, py - 25, microWidth(t) + 4, 7, 0);
    p.micro(px - microWidth(t) / 2, py - 24, t, 15);
  }
}

// ------------------------------------------------------------------ animation

function overlay(g: Game, s: Surface, t: number) {
  const fixed = !!g.flag('bug_fixed');
  // the display glitches between 00, 19 and dark while the bug runs loose
  if (!fixed && !g.flag('bug_caught')) {
    const gl = hash(Math.floor(t / 7));
    if (gl < 0.12) drawDisplay(s, g, 1);
    else if (gl < 0.18) drawDisplay(s, g, 2);
  }
  // ring lights chase around the walls
  for (let k = 0; k < 6; k++) {
    const th = ((t / 240 + k / 6) % 1) * Math.PI;
    const x = Math.round(CX - Math.cos(th) * FRX);
    const y = Math.round(seamY(x) - 44 * (0.55 + 0.45 * Math.sin(th)));
    s.plot(x, y, 11);
    s.plot(x + 1, y, 15);
  }
  // the date routine, floating over the altar as glowing code
  const lines = fixed
    ? ['IF YYYY > 9999', '  CALL DENIS.', 'MOVE YYYY TO DATE.', '* Y2K FIX - A.']
    : rewrite >= 0
      ? ['IF YY' + 'YY'.slice(0, Math.floor(rewrite * 3)) + ' > 99' + '99'.slice(0, Math.floor(rewrite * 3)), '  MOVE 00 TO YY.', '  MOVE 19 TO CC.', 'MOVE CC+YY TO DATE.']
      : ['IF YY > 99', '  MOVE 00 TO YY.', '  MOVE 19 TO CC.', 'MOVE CC+YY TO DATE.'];
  const loose = !g.flag('bug_caught');
  for (let i = 0; i < lines.length; i++) {
    let dx = 0;
    if (loose && hash(Math.floor(t / 5) * 13 + i) < 0.15) dx = Math.round((hash(t + i) - 0.5) * 8);
    const col = fixed ? 10 : i === 2 && Math.floor(t / 20) % 2 ? 12 : 14;
    const w = microWidth(lines[i]);
    const y = 76 + i * 7 + Math.round(Math.sin((t + i * 20) / 40));
    s.micro(CX - Math.round(w / 2) + dx, y, lines[i], (loose && hash(t * 3 + i) < 0.05) ? 15 : col);
  }
  // a halo of light rising from the altar slab
  for (let i = 0; i < 6; i++) {
    const a = (t + i * 23) % 60;
    s.plot(CX - 14 + ((i * 37) % 28), 108 - Math.floor(a / 4), fixed ? (a < 30 ? 10 : 2) : a < 30 ? 14 : 6);
  }
  // the bug in the jar, rattling about
  if (jarOnAltar === 'caught' || jarOnAltar === 'fixing') {
    // draw the jar (with label state) and the trapped bug
    s.rect(CX + 4, 100, 10, 11, dith(11, 0, 4));
    s.frame(CX + 4, 100, 10, 11, 11);
    s.rect(CX + 3, 97, 12, 3, 8);
    s.hline(CX + 3, CX + 14, 99, 7);
    const col = label === 'PASS' ? 10 : 12;
    s.rect(CX + 4, 104, 10, 5, Math.floor(t / 15) % 2 && label === 'FAIL' ? 4 : col);
    s.micro(CX + 5, 104, label === 'PASS' ? 'OK' : 'ERR', 15);
    if (label !== 'PASS') drawJarBug(s, CX + 6, 101, t);
  }
  // the log-out portal swirls
  if (fixed) {
    const [px, py] = PORTAL;
    for (let i = 0; i < 26; i++) {
      const a = t / 18 + i * 0.7;
      const rr = ((i * 5 + t / 3) % 12) / 12;
      const x = px + Math.cos(a) * 11 * rr;
      const y = py + Math.sin(a) * 20 * rr;
      s.plot(Math.round(x), Math.round(y), i % 3 === 0 ? 15 : i % 3 === 1 ? 11 : 9);
    }
  }
  // Heisenbug effects: smear trail between jumps, burst where it vanished
  if (smear) {
    const k = smear.t / 8;
    for (let i = 0; i < 14; i++) {
      const u = i / 13;
      if (hash(t + i * 7) < k) continue;
      const x = smear.x0 + (smear.x1 - smear.x0) * u;
      const y = smear.y0 + (smear.y1 - smear.y0) * u + (hash(i + t) - 0.5) * 4;
      s.plot(Math.round(x), Math.round(y), [13, 12, 9, 15][i % 4]);
    }
    if (++smear.t > 8) smear = null;
  }
  if (burst) {
    const k = burst.t;
    for (let i = 0; i < 18; i++) {
      const a = i * 0.35 + k * 0.1;
      const d = k * 1.5 * (0.5 + hash(i * 3));
      s.plot(Math.round(burst.x + Math.cos(a) * d), Math.round(burst.y + Math.sin(a) * d * 0.7), [15, 13, 11, 12][i % 4]);
    }
    if (++burst.t > 14) burst = null;
  }
}

// ------------------------------------------------------------------ the Heisenbug

function bugActor(g: Game): Actor | undefined {
  return g.actor('bug');
}

function makeBug(g: Game) {
  const b = new Actor('bug', 'Heisenbug', { stand: { frames: [] } }, 262, 136, 'left');
  b.front = true;
  b.data.alt = 36;
  b.data.flip = true;
  b.custom = (t) => {
    const bob = Math.round(Math.sin(t / 6) * 2);
    // occasional total flicker-out
    if (hash(Math.floor(t / 2) + 977) < 0.06) return null;
    return lift(heisenbugImg(t, b.data.flip, 1), b.data.alt + bob);
  };
  g.remove('bug');
  g.add(b);
  bugT = 90;
  return b;
}

function jumpBug(g: Game, b: Actor, perch?: [number, number, number]) {
  const pool = g.flag('jar_placed') && !g.flag('bug_caught') && Math.random() < 0.5 ? NEAR_ALTAR : PERCHES;
  let next = perch ?? pool[Math.floor(Math.random() * pool.length)];
  // never land right on top of Dominic
  if (!perch && Math.hypot(next[0] - g.player.x, next[1] - g.player.y) < 24) next = PERCHES[(PERCHES.indexOf(next) + 3) % PERCHES.length];
  smear = { x0: b.x, y0: b.y - b.data.alt - 4, x1: next[0], y1: next[1] - next[2] - 4, t: 0 };
  b.data.flip = next[0] < b.x;
  b.place(next[0], next[1]);
  b.data.alt = next[2];
}

function tick(g: Game) {
  const b = bugActor(g);
  if (!b) return;
  if (hidden > 0) {
    hidden--;
    if (hidden === 0) {
      jumpBug(g, b);
      b.visible = true;
      burst = { x: b.x, y: b.y - b.data.alt - 4, t: 0 };
      g.sfx('bug');
    }
    return;
  }
  if (--bugT <= 0) {
    jumpBug(g, b);
    bugT = 50 + Math.floor(Math.random() * 110);
    if (Math.random() < 0.3) g.sfx('bug');
  }
}

/** Being observed: the bug simply stops being there. */
function vanish(g: Game, b: Actor, ticks = 100) {
  burst = { x: b.x, y: b.y - b.data.alt - 4, t: 0 };
  b.visible = false;
  hidden = ticks;
  g.sfx('bug');
}

const LOOKS = [
  'You look straight at the bug. Or rather, at where the bug was. The instant your eyes land on it, it isn\'t there anymore. Somewhere behind you, something buzzes smugly.',
  'You turn, quick as you can, and look right at it. Gone. Not hiding: gone. A Heisenbug only exists while nobody is watching.',
  'You try looking at it out of the corner of your eye. It knows. It always knows.',
  'You stare hard at the spot where it was. Your stare is very thorough. The bug is very absent.',
];

// ------------------------------------------------------------------ the puzzle

async function placeJar(g: Game) {
  if (g.flag('jar_placed')) return void (await g.say(g.flag('bug_caught') ? 'The test has already done its job.' : 'The jar is already on the altar, lid open, waiting. The trap is set.'));
  if (!g.has('jar')) return void (await g.say("You don't have anything to put on the altar."));
  await g.approach(ALTAR_SPOT);
  g.player.face('left');
  await g.pose(null, 'reach', 400);
  g.removeItem('jar');
  g.set('jar_placed');
  jarOnAltar = 'trap';
  g.redraw();
  g.sfx('clink');
  award(g, 'jar_placed');
  await g.say("You set the Unit Test Jar on the altar, lid open, right beside the glowing date routine. A test, ready to run.\n\nThe bug zips past it once. Twice. It's curious. It has never seen a test before; nobody in here has written one since 1987. Then it notices you watching, and blinks out of existence.");
  const b = bugActor(g);
  if (b && b.visible) vanish(g, b, 80);
}

async function closeEyes(g: Game) {
  if (g.flag('bug_caught')) return void (await g.say('You close your eyes and enjoy a moment of peace. No buzzing. No bug. Just the hum of the Core. Then you open them again; there is work to do.'));
  const b = bugActor(g);
  if (!g.flag('jar_placed')) {
    g.dark = true;
    await g.wait(400);
    g.sfx('bug');
    await g.say('You close your eyes. The buzzing gets closer... and closer... then it moves on, bored. Without a trap, closing your eyes accomplishes nothing.');
    g.dark = false;
    return;
  }
  await g.approach([CX, 168]);
  g.player.face('up');
  await g.say('You close your eyes.');
  g.dark = true;
  await g.wait(700);
  g.sfx('bug');
  await g.say('Darkness. The buzzing gets bolder, now that nobody is watching.');
  g.sfx('bug');
  await g.wait(500);
  await g.say("Bzzz... It's circling you. Closer. It must think it's won.");
  if (b) {
    b.visible = true;
    hidden = 0;
    b.place(CX + 9, 128);
    b.data.alt = 20;
  }
  g.sfx('bug');
  await g.wait(600);
  await g.say("Bzz. Bzz-bzz. It's over by the altar now. Investigating the jar. Unobserved, it has to exist somewhere, and somewhere is... in there.");
  await g.wait(400);
  g.sfx('clink');
  await g.wait(250);
  await g.say('*CLINK!*');
  g.sfx('bug');
  await g.say('Furious, muffled buzzing. Glass. A lid, snapped shut.');
  g.remove('bug');
  jarOnAltar = 'caught';
  label = 'FAIL';
  g.redraw();
  g.dark = false;
  g.flash(15, 80);
  await g.say('You open your eyes.\n\nThere, in the Unit Test Jar on the altar, sits the Heisenbug, caught red-handed and absolutely livid. The label glows red: TEST FAILED.\n\nA reproducible failure. It is the most beautiful thing you have ever seen.');
  await g.approach(ALTAR_SPOT);
  g.player.face('left');
  await g.pose(null, 'reach', 400);
  jarOnAltar = 'none';
  g.redraw();
  g.removeItem('jar');
  g.addItem('jarbug');
  g.set('bug_caught');
  award(g, 'bug_caught');
  await g.say("You pick up the jar. Now that the bug finally holds still, the glowing date routine over the altar stops glitching. You can actually read it.", { title: 'Bug in a Jar', icon: g.items.jarbug?.icon() });
}

async function applyPatch(g: Game) {
  if (g.flag('bug_fixed')) return void (await g.say('The patch is applied. The test is green. The years have four digits. There is nothing left to fix in here.'));
  if (!g.has('patch')) return void (await g.say("You'd need a fix for the date routine. Adriana was writing one, last anyone heard."));
  if (!g.flag('bug_caught'))
    return void (await g.say("You can't fix a bug you can't reproduce. If you patch it now, you'll never know whether it worked. Catch it in a test first, so you'll know the fix works when it goes green."));
  await g.approach(ALTAR_SPOT);
  g.player.face('left');
  await g.pose(null, 'reach', 400);
  g.removeItem('patch');
  jarOnAltar = 'fixing';
  label = 'FAIL';
  await g.say("You set the jar back on the altar and press Adriana's patch onto the glowing date routine. The embroidery unravels into light and threads itself into the code.");
  g.sfx('digitize');
  for (let i = 0; i <= 12; i++) {
    rewrite = i / 12;
    if (i % 2 === 0) g.sfx('type');
    await g.wait(110);
  }
  rewrite = -1;
  g.set('bug_fixed');
  g.redraw();
  g.flash(10, 120);
  g.sfx('points');
  await g.say("Two digits become four. YY becomes YYYY. Overhead, the great display rolls over: 23:59:59... 00:00:00. 1999... 2000. Not 1900. Two thousand.\n\nThe clock-face floor flushes green. Midnight, at last.");
  // the test goes green
  label = 'PASS';
  g.sfx('fanfare');
  await g.wait(600);
  await g.say('The label on the jar flickers from red to green: TEST PASSED.');
  // the bug becomes a butterfly
  g.flash(15, 100);
  g.sfx('clink');
  jarOnAltar = 'passed';
  g.redraw();
  const b = new Actor('butterfly', 'Butterfly', { stand: { frames: [] } }, CX + 9, 110, 'down');
  b.front = true;
  b.ghost = true;
  b.custom = (t) => lift(butterflyImg(t), 0);
  g.add(b);
  fly = b;
  await g.talk(g.player, "It's not a bug. It's a feature.");
  const sx = b.x,
    sy = b.y;
  await tween(g, 150, (k) => {
    b.x = sx + Math.sin(k * 9) * 30 * k - k * 60;
    b.y = sy - k * 130 + Math.sin(k * 23) * 6;
  });
  g.remove(b);
  fly = null;
  g.removeItem('jarbug');
  award(g, 'bug_fixed');
  await g.say("The Millennium Bug, transformed, flutters up through the Core and out of sight. Not a bug anymore. Just a two-digit year that finally grew up.\n\nYou leave the empty jar on the altar, still glowing green. Every fix deserves a regression test.");
  g.sfx('teleport');
  g.flash(11, 160);
  g.shake(300);
  await g.wait(300);
  await g.say('With a soft chime, a ring of light opens on the far side of the chamber, crowned with the universal symbol for "power" and the words LOG OUT.');
}

async function logOut(g: Game) {
  if (!g.flag('bug_fixed')) return void (await g.say("Not yet. The Core is still broken, and everyone upstairs is counting on you. There will be time to log out once the bug is fixed."));
  await g.approach(PORTAL_FLOOR);
  g.player.face('up');
  await g.say("You take a last look around the Core. The clock reads midnight. The years have four digits. The test is green.\n\nYou step into the light.");
  const p = g.player;
  p.ghost = true;
  await g.walk(null, PORTAL[0], PORTAL[1] + 22, { direct: true });
  g.sfx('digitize');
  const base = person('dominic').stand_up.frames[0];
  let prog = 0;
  p.custom = () => dissolveImg(base, prog, 3);
  await tween(g, 90, (k) => (prog = k * 1.3));
  p.visible = false;
  g.flash(15, 300);
  award(g, 'logout');
  await g.wait(400);
  p.custom = null;
  p.ghost = false;
  p.visible = true;
  g.set('act', 3);
  g.goto('serverroom', [96, 150, 'down']);
}

async function catchBug(g: Game, how: string) {
  if (dying) return;
  const b = bugActor(g);
  if (!b) return false;
  dying = true;
  bugT = 99999; // it holds perfectly still... for now
  const p = g.player;
  p.faceToward(b.x, b.y);
  await g.approach([Math.max(20, Math.min(300, b.x + (p.x < b.x ? -16 : 16))), Math.max(118, Math.min(184, b.y))]);
  p.faceToward(b.x, b.y);
  await g.pose(null, 'reach', 250);
  vanish(g, b, 99999);
  await g.wait(500);
  // ...then it is. Behind you.
  const behind = p.dir === 'left' ? 12 : p.dir === 'right' ? -12 : 10;
  b.place(p.x + behind, p.y + 2);
  b.data.alt = 26;
  b.data.flip = behind > 0;
  b.visible = true;
  hidden = 0;
  g.sfx('bug');
  await g.wait(450);
  haltPlayer(g);
  g.shake(500);
  for (let i = 0; i < 10; i++) {
    for (let c = 0; c < 16; c++) g.palMap[c] = Math.random() < 0.3 ? Math.floor(Math.random() * 16) : c;
    g.sfx('error');
    await g.wait(60);
  }
  g.palMap = new Uint8Array(256).map((_, i) => i);
  p.visible = false;
  dying = false;
  return g.die(
    `You ${how} the bug. It isn't there. Then it is. Behind you.\n\nThe Heisenbug sinks its mandibles into your timestamp. Your birth year rolls over from 99 to 00, and the Monolith, doing the math in two digits, concludes that you have not been born yet. Unborn processes are garbage collected immediately.`,
    { title: 'Observed Behavior' },
  );
}

// ------------------------------------------------------------------ room

function walkPoly(): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = Math.PI + (i / 48) * Math.PI; // back half, left to right
    pts.push(CX + Math.cos(a) * (FRX - 10), FY + Math.sin(a) * (FRY - 8));
  }
  pts.push(CX + FRX - 10, FY + 10, 214, 189, 106, 189, CX - FRX + 10, FY + 10);
  return pts;
}

export const core: RoomDef = {
  id: 'core',
  title: 'The Core',
  act: 2,
  music: 'core',
  start: [160, 182, 'up'],
  draw: paint,
  walk: () => [walkPoly(), [CX - 120, 150, 240, 30]],
  blocks: [[134, 130, 52, 16]],
  look: (g) => {
    if (g.flag('bug_fixed'))
      return 'The Core, healed. The great display reads 1999 -> 2000, midnight at last, and an empty, green-labeled test jar sits on the altar like a trophy. To the west, the LOG OUT portal hums.';
    return `The Core: a vast round chamber at the heart of the Monolith. The floor is a giant clock face; the display overhead says it is the last second of 1999, and has said so for twenty-seven years. On the central altar glows the 1987 date routine, and over it a huge display flips, over and over: 99 -> 00.${g.flag('bug_caught') ? '' : '\n\nSomething small and glitchy flits around the chamber. Every time you try to look at it, it isn\'t there.'}`;
  },
  nouns: {
    bug: ['bug', 'heisenbug', 'insect', 'beetle', 'critter', 'millennium bug', 'y2k bug'],
    hands: ['clock hands', 'minute hand', 'hour hand'],
  },
  hotspots: [
    {
      id: 'wall',
      nouns: ['wall', 'walls', 'ribs', 'rings', 'chamber', 'cylinder', 'circuits', 'traces', 'sky', 'ceiling', 'darkness', 'pulses', 'circuitry', 'light', 'lights'],
      area: [0, 0, 320, 108],
      look: 'The Core is a great cylinder of dark circuitry. Ribs of light curve up into the darkness, rings of light run around it, and tiny pulses chase each other along the traces like thoughts.',
    },
    {
      id: 'computer',
      nouns: ['counter', 'sign', 'digits', 'year', 'system date', 'date display', '99', 'board', 'seven segment display'],
      area: [86, 8, 148, 54],
      look: (g) =>
        g.flag('bug_fixed')
          ? '01-01, 00:00:00. 1999 -> 2000. Four digits on each side, glowing a calm green. It is the most boring, correct display you have ever seen. It is perfect.'
          : 'A huge seven-segment display. The small print reads 12-31, 23:59:59. Below it, in digits as tall as you are: 99, an arrow, then 00. Every so often the 00 flickers to 19, as if the machine is trying to decide whether it is the year 2000 or 1900. It has been trying to decide since 4:59 this afternoon.',
    },
    {
      id: 'floor',
      nouns: ['clock', 'clock face', 'numerals', 'face', 'midnight', 'roman numerals', 'numbers', 'ix', 'iii', 'vi', 'xii'],
      area: [4, 112, 312, 78],
      look: (g) =>
        g.flag('bug_fixed')
          ? 'The clock-face floor glows a calm green now. The display overhead reads 01-01, 00:00:00. Midnight. The new millennium, twenty-seven years late, has arrived at last.'
          : "The floor is a giant clock face, Roman numerals and all, with the altar as its center pin. It has no hands. It doesn't need them: the display overhead says it all. 12-31, 23:59:59. The last second of 1999. The Monolith has been living in that second for twenty-seven years.",
    },
    {
      id: 'altar',
      nouns: ['altar', 'pedestal', 'slab', 'plinth', 'date routine', 'routine', 'hologram', 'glowing code'],
      area: [134, 70, 52, 74],
      at: ALTAR_SPOT,
      look: (g) => {
        if (g.flag('bug_fixed'))
          return "The altar's code now reads:\n\nIF YYYY > 9999\n    CALL DENIS.\nMOVE YYYY TO DATE.\n* Y2K FIX - A.\n\nFour-digit years. Good for another eight thousand years, by which point it will be someone else's problem. Carved on the plinth: D.1987.";
        if (g.flag('bug_caught'))
          return "With the bug contained, the code over the altar holds still and you can finally read it:\n\nIF YY > 99\n    MOVE 00 TO YY.\n    MOVE 19 TO CC.\nMOVE CC+YY TO DATE.\n\nTwo-digit years. Carved on the plinth: D.1987. Denis.\n\nAnd the thing in your jar? It isn't just any Heisenbug. It's the MILLENNIUM BUG. Y2K. It went dormant in 1999, because the Monolith never restarted. The clock never rolled over. Until 4:59 this afternoon, when Aidan pressed the big red button and the year went from 99 to 00, and the date routine decided it was 1900.\n\nIt wasn't Aidan's fault. It had been waiting for twenty-seven years.";
        return "A stone altar carved D.1987, and floating over it, the date routine, glowing and glitching so badly you can barely read it: IF YY > 99... something... something... 19. Every time you try to focus on it, the lines jitter, as if something is chewing on them while you watch. Something that stops whenever you look.";
      },
    },
    {
      id: 'carving',
      nouns: ['carving', 'inscription', 'd 1987', 'initials', 'signature'],
      area: [150, 124, 20, 10],
      at: ALTAR_SPOT,
      look: "Carved into the altar's plinth: D.1987. Denis's initials. He wrote this date routine thirty-nine years ago, the year the Monolith was switched on.",
    },
    {
      id: 'jar',
      nouns: ['jar', 'test jar', 'unit test', 'unit test jar', 'test', 'glass jar', 'trap', 'test trap', 'the trap', 'regression test'],
      area: [CX, 96, 16, 18],
      at: ALTAR_SPOT,
      when: (g) => !!g.flag('jar_placed') && (!g.flag('bug_caught') || !!g.flag('bug_fixed')),
      look: (g) =>
        g.flag('bug_fixed')
          ? 'The empty Unit Test Jar sits on the altar, label glowing green: TEST PASSED. A regression test, standing guard. If the Millennium Bug ever comes back, this jar will catch it.'
          : 'The Unit Test Jar sits on the altar with its lid open, label reading TEST. The trap is set. The bug keeps sneaking glances at it. It just needs to go in there while nobody is watching.',
    },
    {
      id: 'portal',
      nouns: ['portal', 'ring', 'ring of light', 'exit portal', 'power symbol', 'symbol', 'gateway', 'log out', 'logout', 'log out sign', 'log out portal', 'swirl', 'swirling light', 'ring of light'],
      area: [24, 56, 42, 76],
      at: PORTAL_FLOOR,
      when: (g) => !!g.flag('bug_fixed'),
      look: 'A ring of swirling light stands on the floor, crowned with the universal power symbol and the words LOG OUT. Beyond it, very faintly, you can hear Denis arguing with somebody about cables.',
    },
  ],
  exits: [{ area: [0, 186, 320, 4], to: 'dragon', at: [204, 124, 'down'], dir: 'south|out' }],
  enter(g, from) {
    hidden = 0;
    smear = null;
    burst = null;
    lookCount = 0;
    rewrite = -1;
    fly = null;
    dying = false;
    jarOnAltar = g.flag('bug_fixed') ? 'passed' : g.flag('jar_placed') && !g.flag('bug_caught') ? 'trap' : 'none';
    label = 'TEST';
    if (!g.flag('bug_caught')) makeBug(g);
    award(g, 'core_entered');
    g.redraw();
    void from;
  },
  async afterEnter(g, from) {
    if (from === 'dragon' && !g.flag('core_greeted')) {
      g.set('core_greeted');
      await g.wait(600);
      g.sfx('bug');
      await g.say("The Core. At last. Something small zips across the chamber at the edge of your vision, chittering. You turn to look. Nothing there.\n\nOverhead, a display the size of a billboard flips: 99... 00... 99... 00...");
    }
  },
  tick,
  overlay,
  raw: async (g, text) => {
    if (await cyberRaw(g, text)) return true;
    const t = text.trim().toLowerCase().replace(/['’]/g, '');
    // "don't look at it", "stop watching the bug", "avert my eyes"
    if (/^(dont|do not|stop|quit|never|avoid|try not to|no) (look|looking|watch|watching|observ|star|peek|peeking|glanc)/.test(t) || /^(look|turn) away\b/.test(t) || /^(avert|cover|shut|close) (my |your )?(eyes|gaze)\b/.test(t)) {
      await closeEyes(g);
      return true;
    }
    return false;
  },
  verbs: {
    // ---------------------------------------------------------------- the bug
    'look bug': async (g) => {
      const b = bugActor(g);
      if (!b) return false;
      if (b.visible) vanish(g, b);
      await g.say(LOOKS[lookCount++ % LOOKS.length]);
    },
    'catch|attack|take bug,use jar bug,put jar bug,throw|flip ? bug': async (g, c) => {
      const b = bugActor(g);
      if (!b) return false;
      if (c.verb === 'catch' && ['trap', 'contain', 'bottle'].includes(c.verbWord ?? '') && g.flag('jar_placed'))
        return void (await g.say("The trap is already set. The bug isn't going to walk into it while you stand there staring. Heisenbugs only misbehave when nobody is watching."));
      // the right idea, done the wrong way: a nudge, not a death
      if ((c.verb === 'catch' && ['trap', 'contain', 'bottle'].includes(c.verbWord ?? '')) || ((c.verb === 'use' || c.verb === 'put') && c.noun === 'jar')) {
        if (b.visible) vanish(g, b);
        if (g.flag('jar_placed')) return void (await g.say("The trap is already set. The bug isn't going to walk into it while you stand there staring. Heisenbugs only misbehave when nobody is watching."));
        if (!g.has('jar')) return void (await g.say("Trap it with what? You'd need a test: something to catch it in, waiting where it feeds."));
        return void (await g.say("You raise the jar toward the bug. It sees you seeing it, and simply isn't there anymore. You can't chase a Heisenbug into a test. The test has to be waiting where the bug feeds, and nobody can be watching when it walks in."));
      }
      const how = c.verb === 'attack' ? 'swing at' : c.verb === 'take' ? 'grab for' : c.noun === 'jar' || c.noun2 === 'jar' ? 'swing the jar at' : 'lunge for';
      return catchBug(g, how);
    },
    'talk|ask|tell bug ?': async (g) => {
      const b = bugActor(g);
      if (!b) return false;
      if (b.visible) vanish(g, b);
      await g.say("You address the bug directly. It seems to take this as a form of observation, and stops existing for a while. Somewhere, it snickers in hexadecimal.");
    },
    'use|show|give duck bug': async (g) => {
      const b = bugActor(g);
      if (!b) return false;
      if (b.visible) vanish(g, b);
      await g.say('You hold the duck up to face the bug. The duck stares. The bug, being observed by a duck, stops existing. The duck looks enormously pleased with itself.\n\n"Quack," it says. "Observation works on bugs. Ask me how to actually CATCH one."');
    },
    'touch computer': async (g) =>
      void (await g.say(g.flag('bug_fixed') ? 'Warm, steady, green. A display with nothing left to worry about.' : 'The glass is warm. Under your fingertip the 00 flickers to 19 and back, as if the display is arguing with itself about which century it is.')),
    'show|give * bug': async (g) => {
      const b = bugActor(g);
      if (!b) return false;
      if (b.visible) vanish(g, b);
      await g.say("You hold it up for the bug to see. The bug sees you seeing it, and vanishes on principle.");
    },
    'listen': async (g) => void (await g.say(g.flag('bug_caught') ? 'The Core hums, steady and calm.' : 'A thin, glitchy buzzing, always just behind you. When you turn, it moves.')),
    'wait': async (g) => {
      if (g.flag('bug_caught')) return false;
      await g.say("You wait and watch. The bug waits too, as long as you're watching. Which is, you realize, the whole problem.");
    },
    // ---------------------------------------------------------------- the jar
    'drop jar': async (g) => {
      if (!g.has('jar')) return false;
      await g.say('Not on the floor; too exposed. A test has to run where the bug lives: on the altar, right next to the code it keeps eating.');
    },
    'put|use|drop jar altar|floor|wall|computer,put jar,use jar': async (g, c) => {
      if (!g.has('jar')) return false;
      if (c.noun2 === 'floor' || c.noun2 === 'wall' || c.noun2 === 'computer') return void (await g.say('Too exposed. A test has to run where the bug lives: on the altar, right next to the code it keeps eating.'));
      await placeJar(g);
    },
    'take jar': async (g) => {
      if (!g.flag('jar_placed') || g.has('jar') || g.has('jarbug')) return false;
      if (g.flag('bug_fixed')) return void (await g.say("Leave it. It's a regression test now. Its job is to sit there, forever, being green."));
      await g.say('Leave it. The test is set. Now it just has to run, unobserved.');
    },
    'look/in jar': async (g) => {
      if (g.has('jarbug')) return false;
      if (!g.flag('jar_placed')) return false;
      await g.say(g.flag('bug_fixed') ? 'Empty, clean, green. A passing test.' : "Empty, for now. It's a very inviting kind of empty.");
    },
    // ---------------------------------------------------------------- eyes
    'close_eyes,cover eyes,cover,blink': async (g, c) => {
      if (c.verb === 'blink') return void (await g.say('You blink. For one sixtieth of a second, the buzzing gets very close. Then your eyes are open again, and it is gone. Interesting...'));
      await closeEyes(g);
    },
    'open_eyes': "They're open. Wide open. That's half your problem in here.",
    'sleep': async (g) => {
      if (g.flag('bug_caught')) return false;
      await g.say("Sleep? You'd have to close your eyes for that. ...Close your eyes. Hm.");
    },
    // ---------------------------------------------------------------- the fix
    'fix|use|put|apply patch ?,fix code|altar|bug|computer|routine,put patch altar,use patch altar': async (g, c) => {
      if (c.verb === 'fix' && c.noun && !['code', 'altar', 'bug', 'computer', 'patch', 'jarbug', 'floor'].includes(c.noun)) return false;
      if (c.verb === 'fix' && !g.has('patch') && !g.flag('bug_fixed')) {
        if (!g.flag('bug_caught')) return void (await g.say("You can't fix a bug you can't even look at. First you'd need to catch it doing something, in a test."));
        return void (await g.say("You know exactly what's wrong now. You just need the fix. Adriana was writing one."));
      }
      await applyPatch(g);
    },
    'put|use jarbug altar,put jarbug,open jarbug': async (g, c) => {
      if (!g.has('jarbug')) return false;
      if (c.verb === 'open') return void (await g.say("Open the jar? And let the Millennium Bug loose again? Absolutely not. Not until it's fixed."));
      if (g.has('patch')) return applyPatch(g);
      await g.say("You set the jar on the altar for a moment. The bug glares out at you. The test still fails. You'll need an actual fix to make it pass. You pick the jar back up.");
    },
    'look code,read altar|code|routine,read carving': async (g, c) => {
      if (c.noun === 'carving') return false;
      const hs = core.hotspots!.find((h) => h.id === 'altar')!;
      await g.say((hs.look as (g: Game) => string)(g));
    },
    // ---------------------------------------------------------------- logging out
    'logout,exit,remove helmet,enter|go|use|touch|search|jump portal,exit portal,remove helmet ?': async (g, c) => {
      if (c.verb === 'exit' && c.noun && c.noun !== 'portal') return false;
      if (c.verb === 'search' && c.verbWord !== 'go through') return false;
      if (c.verb === 'exit' && !g.flag('bug_fixed')) return false;
      if (c.verb === 'remove' && !g.flag('bug_fixed')) return void (await g.say("You reach for the helmet, but your hands are made of pixels in here; there's nothing to grab. And anyway, the job isn't done."));
      await logOut(g);
    },
    // ---------------------------------------------------------------- scenery
    'look hands,push|pull|turn|move|fix hands': 'The clock face has no hands. Time in here is not the problem; the way the code counts it is.',
    'put|use jar': async (g) => {
      if (g.has('jar')) return false;
      if (g.flag('bug_fixed')) return void (await g.say("The jar is already on the altar, glowing green: a regression test, standing guard."));
      if (g.flag('jar_placed') && !g.flag('bug_caught')) return void (await g.say("The trap is already set on the altar. Now it just has to run, unobserved."));
      return false;
    },
    'take computer|altar|wall': "It's all part of the Monolith. Everything in here is load-bearing.",
    'touch|push altar': 'The altar is warm, like a CPU under load. The code above it shivers.',
    'type|hack|debug ?': async (g, c) => {
      if (c.verb === 'type' && !c.noun) return false;
      if (g.flag('bug_fixed')) return void (await g.say('Everything checks out. The best debugging session is the one that ends.'));
      await g.say(g.flag('bug_caught') ? "You know the bug. You know the code. What you need now is the fix: Adriana's patch." : "You try to step through the date routine, but every time you put a breakpoint on it, the bug isn't there. Observing it changes it. You'll need a test to catch it for you.");
    },
    // shared cyberspace replies (helmet, log out, sleep, jump, sing, dance...)
    ...CYBER_VERBS,
  },
};
