// The Legacy Dragon's Lair. A castle gate built of green monochrome COBOL,
// and before it, coiled, the Legacy Dragon: punch-card scales, a belly of
// green-bar printout, reading glasses. Approach the gate while it's awake and
// you get compiled. READ MANUAL TO DRAGON -> dragon_asleep.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, rng, microWidth } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { Actor } from '../../engine/actor';
import { ANIMATE } from '../../engine/parser';
import { award } from '../../content/points';
import { paintDragon, DragonInfo } from '../../art/cyber_d_dragon';
import { cardPileImg, hash } from '../../art/creatures_d';
import { tween, haltPlayer } from '../../art/cyber_d_lib';

ANIMATE.add('dragon');

const GATE_X0 = 188;
const GATE_X1 = 220;
const GATE_CX = 204;
const SEAM = 112;
const READ_SPOT: [number, number] = [262, 162];

let info: DragonInfo | null = null;
let drowsy = 0; // 0 awake .. 3 nearly asleep (eyelids)
let glare = 0; // ticks of angry glare (eyes flare, smoke thickens)
let fire: { t0: number; tx: number; ty: number } | null = null;
let yawn = 0;
let reading = false;
let talks = 0;
let dying = false;

const COBOL = [
  'IDENTIFICATION DIVISION.',
  'PROGRAM-ID. PAYROLL.',
  'AUTHOR. DENIS.',
  'DATE-WRITTEN. 1987.',
  'ENVIRONMENT DIVISION.',
  'DATA DIVISION.',
  'WORKING-STORAGE SECTION.',
  '01 WS-DATE PIC 9(6).',
  '05 WS-YY PIC 99.',
  '05 WS-MM PIC 99.',
  'MOVE WS-YY TO OUT-YY.',
  'PERFORM 1000-INIT.',
  'ADD 1 TO WS-COUNT.',
  'IF WS-YY > 99',
  'GO TO 9999-EXIT.',
  'COMPUTE WS-PAY = WS-HRS * WS-RATE.',
  "DISPLAY 'PAYROLL OK'.",
  'READ EMP-FILE AT END',
  'MOVE ZEROES TO WS-TOTAL.',
  'STOP RUN.',
  'PERFORM UNTIL WS-EOF',
  'END-PERFORM.',
  'CLOSE EMP-FILE.',
  'EXIT PROGRAM.',
];

// ------------------------------------------------------------------ painting

/** A block of wall built from lines of green COBOL source. */
function codeWall(p: Surface, x0: number, y0: number, x1: number, y1: number, seed: number) {
  const r = rng(seed);
  p.rect(x0, y0, x1 - x0, y1 - y0, 0);
  p.clip(x0, y0, x1, y1);
  let k = Math.floor(r() * COBOL.length);
  for (let y = y0 + 1; y < y1; y += 6) {
    let x = x0 + 1 - Math.floor(r() * 30);
    while (x < x1) {
      const line = COBOL[k++ % COBOL.length];
      const bright = r() < 0.08;
      p.micro(x, y, line, bright ? 10 : 2);
      x += microWidth(line) + 6;
    }
  }
  // masonry joints: the code is laid in courses of big stones
  for (let y = y0 + 12; y < y1; y += 12) p.hline(x0, x1 - 1, y, 0);
  for (let y = y0, row = 0; y < y1; y += 12, row++)
    for (let x = x0 + (row % 2 ? 14 : 0) + (seed % 7); x < x1; x += 28) p.vline(x, y, Math.min(y1 - 1, y + 11), 0);
  p.clip();
}

function paint(p: Surface, g: Game) {
  const asleep = !!g.flag('dragon_asleep');
  const r = rng(85);
  // ---- night sky, a few dim green stars
  p.rect(0, 0, 320, 190, 0);
  for (let i = 0; i < 40; i++) p.plot(Math.floor(r() * 320), Math.floor(r() * 40), r() < 0.3 ? 2 : 8);

  // ---- the castle of COBOL
  // curtain wall
  codeWall(p, 40, 44, 272, SEAM, 3);
  // merlons
  for (let x = 40; x < 272; x += 14) {
    p.rect(x, 36, 8, 8, 0);
    p.frame(x, 36, 8, 9, 2);
    p.hline(x, x + 7, 36, 10);
  }
  p.hline(40, 271, 44, 10);
  // left tower
  codeWall(p, 0, 12, 44, SEAM, 7);
  for (let x = 0; x < 44; x += 11) {
    p.rect(x, 4, 7, 8, 0);
    p.frame(x, 4, 7, 9, 2);
    p.hline(x, x + 6, 4, 10);
  }
  p.hline(0, 43, 12, 10);
  p.vline(43, 12, SEAM, 10);
  // right tower
  codeWall(p, 266, 16, 316, SEAM, 9);
  for (let x = 266; x < 316; x += 11) {
    p.rect(x, 8, 7, 8, 0);
    p.frame(x, 8, 7, 9, 2);
    p.hline(x, x + 6, 8, 10);
  }
  p.hline(266, 315, 16, 10);
  p.vline(266, 16, SEAM, 10);
  p.vline(315, 16, SEAM, 2);
  // arrow slits
  for (const [sx, sy] of [
    [286, 34],
    [298, 62],
    [286, 84],
  ]) {
    p.rect(sx, sy, 3, 10, 0);
    p.frame(sx - 1, sy - 1, 5, 12, 10);
  }
  // tower banner (COBOL, stacked)
  p.rect(292, 18, 11, 34, 2);
  p.frame(292, 18, 11, 34, 10);
  'COBOL'.split('').forEach((ch, i) => p.micro(296, 21 + i * 6, ch, 15));
  p.poly([292, 52, 297, 47, 303, 52], 0);
  // the gate: an arch through the wall, portcullis raised
  const archTop = 62,
    archCY = 78,
    rad = (GATE_X1 - GATE_X0) / 2;
  p.rect(GATE_X0 - 4, archCY, GATE_X1 - GATE_X0 + 8, SEAM - archCY, 0);
  p.ellipse(GATE_CX, archCY, rad + 4, rad + 4, 0);
  // voussoirs (bright code stones around the arch)
  for (let a = 0; a <= 180; a += 15) {
    const rd = (a * Math.PI) / 180;
    const x = GATE_CX + Math.cos(rd) * (rad + 2),
      y = archCY - Math.sin(rd) * (rad + 2);
    p.plot(Math.round(x), Math.round(y), 10);
    p.plot(Math.round(x), Math.round(y) - 1, 10);
  }
  p.vline(GATE_X0 - 2, archCY, SEAM - 1, 10);
  p.vline(GATE_X1 + 1, archCY, SEAM - 1, 10);
  // the passage within, lit from deep inside by the Core
  p.rect(GATE_X0, archCY, GATE_X1 - GATE_X0, SEAM - archCY, 0);
  p.ellipse(GATE_CX, archCY, rad, rad, 0);
  p.glow(GATE_CX, 110, 13, 1, -1, 12);
  p.glow(GATE_CX, 110, 7, 3, -1, 6);
  p.hline(GATE_CX - 2, GATE_CX + 2, 109, 11);
  // raised portcullis: the bottom teeth peek out under the arch
  for (let x = GATE_X0 + 3; x < GATE_X1 - 2; x += 5) {
    p.vline(x, archTop + 2, archTop + 10, 2);
    p.plot(x, archTop + 11, 10);
  }
  p.hline(GATE_X0 + 2, GATE_X1 - 3, archTop + 6, 2);
  // the lintel inscription
  const ins = 'PROCEDURE DIVISION.';
  const iw = microWidth(ins);
  p.rect(GATE_CX - iw / 2 - 6, 48, iw + 12, 9, 0);
  p.frame(GATE_CX - iw / 2 - 6, 48, iw + 12, 9, 10);
  p.micro(GATE_CX - iw / 2 - 2, 50, ins, 10);

  // ---- the ground: scorched flagstones
  p.rect(0, SEAM, 320, 190 - SEAM, 0);
  p.gradV(0, SEAM, 320, 8, [2, 0]);
  p.hline(0, 319, SEAM, 10);
  for (let row = 0; row < 12; row++) {
    const y = SEAM + 4 + Math.round(row * row * 0.55 + row * 2);
    if (y > 189) break;
    p.hline(0, 319, y, 8);
    const w = 18 + row * 4;
    for (let x = (row % 2) * Math.floor(w / 2); x < 320; x += w) {
      const ny = SEAM + 4 + Math.round((row + 1) * (row + 1) * 0.55 + (row + 1) * 2);
      p.vline(x, y, Math.min(189, ny), 8);
    }
  }
  // a worn path of lighter stones from the east to the gate
  p.poly([GATE_X0 + 2, SEAM + 1, GATE_X1 - 2, SEAM + 1, 300, 168, 320, 172, 320, 184, 272, 186, 214, 140], dith(0, 8, 5));
  // scorch marks
  for (const [sx, sy, rx] of [
    [214, 132, 16],
    [240, 150, 12],
    [176, 176, 10],
  ]) {
    p.ellipse(sx, sy, rx, Math.round(rx / 3), 0);
    p.ellipseO(sx, sy, rx, Math.round(rx / 3), dith(8, 0, 8));
  }
  // shed punch cards scattered about
  for (let i = 0; i < 14; i++) {
    const x = 160 + Math.floor(r() * 150),
      y = 122 + Math.floor(r() * 64);
    if (y > 150 && x > 250 && x < 300) continue;
    p.rect(x, y, 5, 2, r() < 0.5 ? 15 : 7);
    p.plot(x + 1 + Math.floor(r() * 3), y, 0);
  }
  // the last consultant to propose a rewrite
  p.at(186, () => {
    const bx = 214,
      by = 178;
    // skull
    p.ellipse(bx, by - 4, 4, 3, 15);
    p.plot(bx - 1, by - 4, 0);
    p.plot(bx + 2, by - 4, 0);
    p.hline(bx - 1, bx + 2, by - 1, 7);
    // ribs & bones
    for (let k = 0; k < 4; k++) p.hline(bx + 6, bx + 12, by - 4 + k * 2, 15);
    p.vline(bx + 9, by - 5, by + 3, 7);
    p.line(bx + 13, by + 1, bx + 22, by + 3, 15);
    p.line(bx + 13, by - 1, bx + 21, by - 2, 15);
    p.line(bx + 3, by + 1, bx - 4, by + 5, 15);
    // the slide deck, charred
    p.rect(bx - 16, by - 2, 12, 8, 15);
    p.rect(bx - 16, by - 2, 12, 2, 4);
    p.hline(bx - 14, bx - 7, by + 2, 8);
    p.hline(bx - 14, bx - 9, by + 4, 8);
    p.plot(bx - 5, by + 5, 0);
    p.plot(bx - 6, by + 5, 6);
  });
  // a warning sign stuck in the ground
  p.at(150, () => {
    p.rect(279, 120, 2, 28, 6);
    p.rect(266, 110, 30, 14, 6);
    p.frame(266, 110, 30, 14, 0);
    p.micro(269, 112, 'HERE BE', 15);
    p.micro(269, 118, 'LEGACY', 14);
  });
  // the bridge's HEAD node, poking in from the east
  p.rect(306, 156, 14, 11, 1);
  p.hline(306, 319, 156, 11);
  p.hline(306, 319, 166, 11);
  p.vline(306, 156, 166, 11);
  p.rect(306, 167, 14, 12, 1);
  p.frame(306, 167, 15, 12, 11);
  p.micro(309, 170, 'HE', 15);

  // ---- the dragon
  info = paintDragon(p, asleep);
}

// ------------------------------------------------------------------ animation

function overlay(g: Game, s: Surface, t: number) {
  const asleep = !!g.flag('dragon_asleep');
  // the blinking cursor moon
  if (Math.floor(t / 32) % 2 === 0) {
    s.rect(232, 14, 9, 14, 10);
    s.vline(232, 14, 27, 2);
  } else s.frame(232, 14, 9, 14, 2);
  // a cursor blinks at the end of the lintel inscription
  if (Math.floor(t / 20) % 2 === 0) s.rect(GATE_CX + Math.ceil(microWidth('PROCEDURE DIVISION.') / 2), 50, 3, 5, 10);
  // the Core's light pulses deep in the gateway
  const pulse = Math.floor(t / 12) % 6;
  if (pulse < 3) s.plot(GATE_CX + pulse - 1, 104, 15);
  if (!info) return;
  // breathing: the coil and wing rise a pixel on the in-breath
  const period = asleep ? 220 : 150;
  const inhale = Math.sin((t / period) * Math.PI * 2) > 0.2;
  if (inhale) {
    const M = info.mask;
    const pic = g.pic.px;
    for (let x = 8; x < 120; x++)
      for (let y = 30; y < 136; y++) {
        const below = (y + 1) * 320 + x;
        if (M[below]) s.px[y * 320 + x] = pic[below];
      }
  }
  // the eye
  const [ex, ey] = info.eye;
  if (!asleep) {
    const blink = t % 300 < 7 || drowsy >= 3;
    const lid = Math.min(2, drowsy);
    if (!blink) {
      const flare = glare > 0 || fire;
      s.rect(ex - 3, ey - 1, 7, 3, flare ? 12 : 14);
      s.hline(ex - 2, ex + 2, ey + 1, flare ? 4 : 6);
      // slit pupil follows Dominic
      const pl = g.player;
      const dx = Math.max(-2, Math.min(2, Math.round((pl.x - ex) / 30)));
      const dy = pl.y - 20 < ey - 6 ? -1 : 0;
      s.vline(ex + dx, ey - 1 + dy, ey + 1 + dy, 0);
      if (flare) s.plot(ex + dx, ey - 1, 15);
      // drooping lids as the manual takes effect
      for (let k = 0; k < lid; k++) s.hline(ex - 3, ex + 3, ey - 1 + k, 7);
    } else {
      s.hline(ex - 3, ex + 3, ey, 0);
      s.hline(ex - 3, ex + 3, ey - 1, 7);
    }
    if (glare > 0) glare--;
  }
  // smoke from the nostrils (and a flicker of flame when angry)
  const [nx, ny] = info.nose;
  const puffs = asleep ? 3 : glare > 0 ? 6 : 4;
  const every = asleep ? 70 : glare > 0 ? 18 : 40;
  for (let i = 0; i < puffs; i++) {
    const age = (t + i * every) % (every * puffs);
    if (age > 80) continue;
    const px = nx + 2 + Math.round(age * 0.25 + Math.sin((age + i * 9) / 7) * 2);
    const py = ny - 2 - Math.round(age * 0.35);
    const rr = 1 + Math.floor(age / 30);
    const col = age < 25 ? 7 : 8;
    s.ellipse(px, py, rr, rr, col);
    if (age < 10) s.plot(px, py, 15);
  }
  if (glare > 0 && t % 6 < 3) {
    s.plot(nx, ny + 1, 14);
    s.plot(nx + 1, ny, 12);
  }
  if (yawn > 0) {
    // a lazy smoke ring
    const k = 60 - yawn;
    s.ellipseO(info.mouth[0] + 4 + k / 2, info.mouth[1] - 6 - k / 2, 3 + k / 12, 2 + k / 20, 7);
    yawn--;
  }
  // snoring: uppercase Z's, of course
  if (asleep) {
    for (let i = 0; i < 3; i++) {
      const age = (t + i * 60) % 180;
      const zx = nx + 4 + Math.round(age * 0.22 + Math.sin(age / 15) * 3);
      const zy = ny - 6 - Math.round(age * 0.3);
      const big = age > 70;
      if (big) s.text(zx, zy - 4, 'Z', age > 140 ? 2 : 10);
      else s.micro(zx, zy, 'Z', 15);
    }
  }
}

const FIRE_WORDS = ['MOVE', 'PERFORM', 'COMPUTE', 'GO TO', 'PIC 9(2)', 'STOP RUN', 'ADD', 'DIVISION', 'ZEROES', 'EXIT', 'IF', 'END-IF'];

function front(g: Game, s: Surface, t: number) {
  if (fire && info) {
    const age = t - fire.t0;
    const [mx, my] = info.mouth;
    for (let i = 0; i < 40; i++) {
      const born = i * 2;
      const a = age - born;
      if (a < 0 || a > 40) continue;
      const k = a / 26;
      const x = mx + (fire.tx - mx) * k + (hash(i * 7) - 0.5) * 18 * k;
      const y = my + (fire.ty - my) * k + (hash(i * 13) - 0.5) * 16 * k - Math.sin(k * Math.PI) * 6;
      const col = a < 6 ? 15 : a < 14 ? 14 : a < 24 ? 12 : 4;
      if (i % 3 === 0) s.micro(Math.round(x) - 6, Math.round(y) - 2, FIRE_WORDS[i % FIRE_WORDS.length], col);
      else s.glow(Math.round(x), Math.round(y), 3 + Math.floor(a / 10), col, -1);
    }
  }
}

// ------------------------------------------------------------------ deaths & puzzle

async function breatheFire(g: Game, reason: 'gate' | 'attack') {
  if (dying) return;
  dying = true;
  const p = g.player;
  haltPlayer(g);
  p.faceToward(info?.eye[0] ?? 160, p.y);
  glare = 9999;
  g.sfx('roar');
  g.shake(400);
  await g.wait(500);
  fire = { t0: g.t, tx: p.x, ty: p.y - 18 };
  g.sfx('crash');
  await g.wait(450);
  g.flash(14, 120);
  g.sfx('zap');
  p.visible = false;
  const pile = new Actor('cardpile', 'Punch Cards', { stand: { frames: [] } }, p.x, p.y, 'down');
  pile.custom = (tt) => cardPileImg(tt);
  g.add(pile);
  await g.wait(700);
  fire = null;
  glare = 0;
  dying = false;
  const why =
    reason === 'gate'
      ? 'You step toward the gate. The Legacy Dragon rears up, inhales like a vacuum tube warming, and breathes a roaring torrent of COBOL. MOVE. PERFORM. COMPUTE. STOP RUN.'
      : 'You take a swing at the Legacy Dragon. It looks at you over its reading glasses with profound disappointment, then breathes a roaring torrent of COBOL.';
  return g.die(`${why}\n\nWhen the smoke clears, all that remains of you is a neat little stack of punch cards and a file named A.OUT.\n\nYou have been compiled.`, { title: 'You Have Been Compiled' });
}

async function readToDragon(g: Game) {
  if (g.flag('dragon_asleep')) return void (await g.say("The dragon is already asleep. Reading it more COBOL now would just be cruel. To you."));
  if (!g.has('manual')) return void (await g.say("You don't have anything to read to it."));
  reading = true;
  await g.approach(READ_SPOT);
  g.player.face('left');
  await g.pose(null, 'reach', 300);
  g.player.pose = 'reach';
  await g.say('You open the COBOL-85 Reference Manual, Volume 1 of 7, clear your throat, and begin to read aloud.');
  await g.talk(g.player, '"Chapter One. The IDENTIFICATION DIVISION. The IDENTIFICATION DIVISION must be the first division of every program. It identifies the program."');
  glare = 0;
  await g.say("The dragon's head tilts. Its eyes narrow... and then, slowly, unfocus. Something in it recognizes the cadence. Its own documentation.", { title: 'Legacy Dragon' });
  drowsy = 1;
  await g.talk(g.player, '"The PROGRAM-ID paragraph is required. Its entry shall be a program-name, which is a user-defined word, subject to the following general rules, of which there are forty-one..."');
  drowsy = 2;
  yawn = 60;
  g.sfx('roar');
  await g.say('The Legacy Dragon yawns enormously. A smoke ring the size of a tractor tire drifts lazily toward the stars.', { title: 'Legacy Dragon' });
  await g.talk(g.player, '"Chapter Two. The ENVIRONMENT DIVISION. The CONFIGURATION SECTION. The SOURCE-COMPUTER paragraph. The OBJECT-COMPUTER paragraph. The SPECIAL-NAMES paragraph, which may contain the following clauses..."');
  drowsy = 3;
  await g.say("Its eyelids droop like a deprecated API. Its head sags lower, and lower...", { title: 'Legacy Dragon' });
  await g.talk(g.player, '"...a level-88 condition-name entry may be specified with a VALUE clause, in which case..." Page three. You turn the page.');
  // the head comes down to rest on the ground
  g.set('dragon_asleep');
  drowsy = 0;
  g.player.pose = null;
  g.redraw();
  g.sfx('thud');
  g.shake(250);
  award(g, 'dragon_asleep');
  reading = false;
  await g.say("By page three, the Legacy Dragon is snoring. Its great head settles to the flagstones, glasses askew, and a stream of tiny uppercase Z's drifts out of its nostrils.\n\nThe gate is clear.\n\nYou close the manual. You may never open it again. You keep it anyway; you never know when you'll need to put something to sleep.");
}

// ------------------------------------------------------------------ text

const LOOK_DRAGON = (g: Game) =>
  g.flag('dragon_asleep')
    ? "The Legacy Dragon is fast asleep, its huge head resting on the flagstones, reading glasses slid down to the end of its snout. Its punch-card scales rise and fall. Tiny Z's drift out of its nostrils, in uppercase, naturally. Let sleeping legacy systems lie."
    : "The Legacy Dragon: a colossal wyrm whose scales are punch cards, whose belly is a long fold of green-bar printout, and whose wings are tattered magnetic tape. Reading glasses perch on its snout. It has guarded this gate since 1987 and, by its own account, runs the entire company's payroll.\n\nIts amber eyes follow you everywhere you go.";

const TALKS = [
  "IDENTIFICATION DIVISION. PROGRAM-ID. GO-AWAY.",
  "DATA DIVISION. WORKING-STORAGE SECTION. 01 INTRUDER PIC X(7) VALUE 'DOMINIC'. 01 MOOD PIC X(5) VALUE 'ANGRY'.",
  'PROCEDURE DIVISION. IF INTRUDER APPROACHES GATE PERFORM INCINERATE-INTRUDER END-IF. STOP RUN.',
  "DISPLAY 'REWRITE IT IN JAVA?' UPON CONSOLE. ...THE LAST ONE WHO SAID THAT IS OVER THERE.",
  'I HAVE RUN PAYROLL SINCE 1987. THIRTY-NINE YEARS. NOT ONE DAY OFF. NOT ONE NIGHT OF SLEEP. NOBODY EVEN READS MY DOCUMENTATION ANYMORE.',
];

// ------------------------------------------------------------------ room

export const dragon: RoomDef = {
  id: 'dragon',
  title: "Legacy Dragon's Lair",
  act: 2,
  music: 'dragon',
  start: [300, 165, 'left'],
  draw: paint,
  walk: [[150, 114, 190, 114, 190, 109, 218, 109, 218, 114, 319, 114, 319, 189, 98, 189, 112, 178, 150, 170]],
  blocks: (g) => (g.flag('dragon_asleep') ? [[128, 134, 66, 34]] : []),
  look: (g) =>
    g.flag('dragon_asleep')
      ? "The Legacy Dragon's Lair. The castle walls are written in glowing green COBOL, and the gate beneath PROCEDURE DIVISION stands open. Before it, the Legacy Dragon sleeps, snoring in uppercase. A blinking cursor hangs in the sky like a moon."
      : "The Legacy Dragon's Lair. A castle whose every stone is a line of glowing green COBOL looms over a field of scorched flagstones. Its gate stands open beneath the words PROCEDURE DIVISION.\n\nCoiled before it, filling half the courtyard, is the Legacy Dragon. It is very large, very old, and very awake. A blinking cursor hangs in the sky like a moon.",
  nouns: {
    dragon: ['dragon', 'legacy dragon', 'wyrm', 'beast', 'monster', 'lizard', 'legacy system'],
    scales: ['scales', 'scale', 'punch card', 'punch cards', 'cards', 'card'],
    belly: ['belly', 'printout', 'green bar', 'greenbar', 'paper', 'fanfold'],
    wings: ['wing', 'wings', 'tape', 'magnetic tape'],
    glasses: ['glasses', 'reading glasses', 'spectacles', 'specs'],
    eyes: ['eyes', 'eye', 'dragon eye', 'dragon eyes'],
    smoke: ['smoke', 'nostril', 'nostrils', 'nose', 'snout'],
    zzz: ['zzz', 'zs', 'z', 'snore', 'snoring'],
  },
  hotspots: [
    {
      id: 'castle',
      nouns: ['castle', 'wall', 'walls', 'fortress', 'towers', 'tower', 'battlements', 'code', 'cobol code', 'stones', 'bricks'],
      area: [0, 0, 320, SEAM],
      look: "The castle is built entirely of COBOL: every stone a line of glowing green source code, stacked in courses like brick. MOVE WS-YY TO OUT-YY. PERFORM 1000-INIT. ADD 1 TO WS-COUNT. It's the payroll system. The castle IS the payroll system. Thirty-nine years of it.",
    },
    {
      id: 'moon',
      nouns: ['moon', 'cursor', 'blinking cursor', 'block', 'sky', 'stars'],
      area: [226, 8, 22, 26],
      look: 'A great green block cursor hangs in the sky where a moon should be, blinking patiently. Waiting for input. It has been waiting since 1987.',
    },
    {
      id: 'banner',
      nouns: ['banner', 'flag', 'pennant'],
      area: [290, 16, 15, 38],
      look: 'A green banner hangs from the tower, spelling out C-O-B-O-L in a vertical column, like a proud old house sigil.',
    },
    {
      id: 'inscription',
      nouns: ['inscription', 'lintel', 'procedure division', 'carving', 'words'],
      area: [164, 46, 82, 12],
      look: 'Carved over the gate in glowing letters: PROCEDURE DIVISION. In COBOL, it is where the program finally starts doing things. In here, it is where the Core begins. A cursor blinks after the period.',
    },
    {
      id: 'gate',
      nouns: ['gate', 'gateway', 'arch', 'archway', 'entrance', 'portcullis', 'door', 'passage'],
      area: [GATE_X0 - 4, 60, GATE_X1 - GATE_X0 + 8, 54],
      at: [GATE_CX, 122],
      look: (g) =>
        g.flag('dragon_asleep')
          ? 'The gate stands open, portcullis raised. Deep inside, a cold blue-white light pulses: the Core. With the dragon asleep, nothing stands between you and it.'
          : 'The gate stands open, portcullis raised, and deep inside a cold blue-white light pulses: the Core. The gate is not the problem. The forty tons of dragon between you and it are the problem.',
    },
    {
      id: 'skeleton',
      nouns: ['skeleton', 'bones', 'skull', 'consultant', 'remains', 'deck', 'slides', 'slide deck', 'body'],
      area: [194, 168, 42, 16],
      at: [222, 184],
      look: 'The charred remains of someone in a once-nice blazer, still clutching a slide deck. The title slide survives: "MODERNIZATION ROADMAP: REWRITE IN JAVA (Q3 1998)." The dragon took the proposal under advisement.',
    },
    {
      id: 'sign',
      nouns: ['sign', 'warning sign', 'here be legacy', 'post', 'signpost'],
      area: [264, 108, 34, 40],
      at: [280, 156],
      look: 'A hand-painted sign: HERE BE LEGACY. The paint is old, the warning is older.',
    },
    {
      id: 'scorch',
      nouns: ['scorch', 'scorch marks', 'burns', 'burn marks', 'ground', 'flagstones', 'floor'],
      area: [150, 116, 170, 74],
      look: "The flagstones are scorched in long, tidy streaks. The dragon's aim is excellent. It has had thirty-nine years of practice.",
    },
    {
      id: 'bridgeend',
      nouns: ['bridge', 'node', 'head node', 'east', 'list'],
      area: [300, 150, 20, 32],
      look: 'The HEAD node of the linked-list bridge, back across the Null Void to the east.',
    },
  ],
  exits: [
    { area: [314, 140, 6, 50], to: 'bridge', at: [22, 160, 'right'], dir: 'east|out' },
    { area: [192, 109, 24, 4], to: 'core', at: [160, 182, 'up'], dir: 'north|in', when: (g) => !!g.flag('dragon_asleep') },
  ],
  zones: [
    {
      // the approach to the gate: instant compilation
      area: [150, 109, 86, 41],
      when: (g) => !g.flag('dragon_asleep') && !reading,
      enter: (g) => breatheFire(g, 'gate'),
    },
    {
      // fair warning
      area: [150, 150, 236, 150, 236, 114, 262, 114, 262, 158, 150, 158],
      when: (g) => !g.flag('dragon_asleep') && !reading,
      enter: async (g) => {
        if (g.player.moving) g.player.stop();
        glare = 240;
        g.sfx('roar');
        await g.say("The dragon's eyes snap to you. A low rumble rolls out of its chest, like a line printer warming up, and smoke curls from its nostrils. It does not want you one step closer to that gate.");
      },
    },
  ],
  enter(g, from) {
    drowsy = 0;
    glare = 0;
    fire = null;
    yawn = 0;
    reading = false;
    talks = 0;
    dying = false;
    if (from === 'bridge') award(g, 'bridge_crossed');
  },
  async afterEnter(g, from) {
    if (from === 'bridge' && !g.flag('dragon_asleep') && !g.flag('dragon_seen')) {
      g.set('dragon_seen');
      await g.wait(400);
      glare = 120;
      g.sfx('roar');
      await g.say("Something enormous shifts in front of the castle. Punch cards rustle like a million pages turning at once. Two amber eyes open, and fix on you over a pair of reading glasses.");
    }
  },
  overlay,
  front,
  verbs: {
    // ---------------------------------------------------------------- the solution
    'read manual dragon,read manual,read dragon manual,show|give manual dragon,use manual dragon,read ? dragon,read/to manual ?': async (g, c) => {
      if (c.verb === 'read' && c.noun && c.noun !== 'manual' && c.noun !== 'dragon') return false;
      if (c.verb === 'read' && c.noun === 'dragon' && c.noun2 !== 'manual' && !g.has('manual')) return false;
      await readToDragon(g);
    },
    // ---------------------------------------------------------------- the dragon
    'look dragon': async (g) => void (await g.say(LOOK_DRAGON(g))),
    'talk|ask|tell dragon ?': async (g) => {
      if (g.flag('dragon_asleep'))
        return void (await g.say("The dragon mumbles in its sleep: \"...PERFORM SLEEP UNTIL WS-MORNING... ZZZ... DISPLAY 'FIVE MORE MINUTES'...\"", { title: 'Legacy Dragon' }));
      await g.approach(READ_SPOT);
      g.player.face('left');
      if (talks === 0) await g.talk(g.player, 'Hello? Nice dragon? I just need to get into the Core.');
      glare = 120;
      g.sfx('roar');
      await g.say(TALKS[talks % TALKS.length], { title: 'Legacy Dragon' });
      if (talks === TALKS.length - 1) await g.say("For a moment it looks less like a monster and more like a very tired old system that nobody has read the manual for in a very long time.");
      talks++;
    },
    'say ?': async (g, c) => {
      if (g.flag('dragon_asleep')) return void (await g.say('Shh. Let sleeping legacy systems lie.'));
      const t = c.rest.toLowerCase();
      if (/hello world|identification division|cobol|move|perform|stop run|display/.test(t)) {
        glare = 60;
        return void (await g.say("You attempt some COBOL. The dragon listens, then corrects your syntax in a voice like a dot-matrix printer: \"PERIOD MISSING. LINE 1. SEVERITY: FATAL.\"", { title: 'Legacy Dragon' }));
      }
      return false;
    },
    'attack|kick|push|pull dragon': async (g) => {
      if (g.flag('dragon_asleep')) return void (await g.say('Let sleeping legacy systems lie. Seriously. Waking up legacy systems that were running fine is how this entire night started.'));
      return breatheFire(g, 'attack');
    },
    'wake dragon,tap|touch|poke dragon': async (g) => {
      if (g.flag('dragon_asleep')) return void (await g.say("Absolutely not. Waking a legacy system that was peacefully running is exactly how this whole night started. Aidan would back you up on this."));
      await g.say("Wake it? It's extremely awake. That's the problem. It watches you over its glasses like a reviewer reading your first pull request.");
    },
    'give|show candy|duck|node|jar|patch|esckey|badge dragon': async (g, c) => {
      if (!c.noun || !g.has(c.noun)) return false;
      if (g.flag('dragon_asleep')) return void (await g.say("It's asleep. Don't push your luck."));
      glare = 90;
      await g.say(`The dragon sniffs at the ${g.items[c.noun]?.name ?? c.noun}. "INVALID DATA TYPE," it rumbles. "EXPECTED: PIC X(80). RECEIVED: NONSENSE."`, { title: 'Legacy Dragon' });
    },
    'sing,sing ?': async (g) => {
      if (g.flag('dragon_asleep')) return void (await g.say('You hum very, very quietly. The dragon snores along, slightly off-key.'));
      glare = 90;
      await g.say('You hum a lullaby. The dragon\'s eyes narrow. "SYNTAX ERROR," it rumbles. Whatever lulls a COBOL dragon to sleep, it isn\'t Brahms.', { title: 'Legacy Dragon' });
    },
    'look scales': 'Each scale is a punch card: eighty columns, cream-colored, rectangular holes, top corner clipped. Some still carry faint print. You make out a payroll record from 1991. Somebody named Gary got a raise.',
    'take scales': async (g) => {
      await g.approach([246, 170]);
      await g.pose(null, 'reach', 300);
      await g.say("You pick up a shed card from the flagstones. It's a line of the payroll program: ADD OVERTIME-PAY TO GROSS-PAY. Someone's paycheck depends on it. You put it back exactly where you found it.");
    },
    'look belly': "The dragon's underside is a long fold of continuous green-bar printer paper, sprocket holes and all. If you squint you could probably read the 1987 payroll run off its belly.",
    'look wings': 'Folded wings of tattered brown magnetic tape, stretched over long bones. When it breathes, they rustle like a reel-to-reel drive spooling up.',
    'look glasses': async (g) =>
      void (await g.say(g.flag('dragon_asleep') ? 'Its reading glasses have slid down to the very end of its snout. It looks, frankly, adorable. Do not tell it that.' : "Half-moon reading glasses, perched on its snout. It squints at you over the top of them, the way a senior developer squints at a pull request with no tests.")),
    'take glasses': async (g) => void (await g.say(g.flag('dragon_asleep') ? "You consider borrowing its glasses. Its nostril twitches. You reconsider." : "You'd have to get within arm's length of its mouth. That is not a length you want to get within.")),
    'look eyes': async (g) => void (await g.say(g.flag('dragon_asleep') ? 'Closed, contentedly. It looks like it has needed this nap since 1999.' : 'Amber, slit-pupiled, and watching you. They follow you wherever you walk. You try a step to the left. So do they.')),
    'look smoke': 'Smoke curls lazily from its nostrils. Every so often a stray character drifts out with it: a period, a stray PIC 9.',
    'look zzz': async (g) => void (await g.say(g.flag('dragon_asleep') ? "Little Z's drift up from its nostrils. Uppercase only. COBOL doesn't really do lowercase." : "There aren't any. Yet.")),
    'eat|drink ?': async (g, c) => {
      if (c.noun !== 'scales' && c.noun !== 'belly') return false;
      await g.say('You are not that hungry, and that is somebody\'s payroll.');
    },
    // ---------------------------------------------------------------- the gate
    'enter|go gate,go north,enter castle,go castle': async (g) => {
      if (g.flag('dragon_asleep')) {
        await g.walk(null, GATE_CX, 111);
        return;
      }
      await g.walk(null, GATE_CX, 120);
    },
    'open|close gate': 'The gate is already open. Getting through it is the hard part.',
    'read castle|gate|inscription': async (g) => {
      await g.say("You read a stretch of wall:\n\nIF WS-YY > 99\n    GO TO 9999-EXIT.\nMOVE WS-YY TO OUT-YY.\nPERFORM 1000-INIT.\n\nTwo-digit years. Hm. You file that away.");
    },
    'take skeleton|deck|slides': "You leave the consultant's slide deck where it lies. Some roadmaps are best left un-followed.",
    'read skeleton': 'The title slide reads: "MODERNIZATION ROADMAP: REWRITE IN JAVA (Q3 1998)." Slide two is charcoal.',
    'take sign': 'It is staked firmly into the flagstones. Also, it is right.',
    'hide': async (g) => {
      if (g.flag('dragon_asleep')) return void (await g.say("You tiptoe. The dragon snores on. You could walk past it banging a drum, probably, but why risk it."));
      await g.say("You try to sneak. The dragon's pupils track you with perfect precision. Legacy systems may be slow, but they never stop watching.");
    },
    'wait': async (g) => void (await g.say(g.flag('dragon_asleep') ? 'You wait. The dragon snores. Somewhere a payroll batch job hums along without it.' : 'You wait. The dragon waits. It has been waiting since 1987. It is much better at this than you are.')),
    'listen': async (g) => void (await g.say(g.flag('dragon_asleep') ? 'Snoring, like a line printer gently printing nothing.' : 'A low rumble, like a mainframe fan bearing that should have been replaced in 1994.')),
  },
};
