// The Deadlock. A vault whose back wall is one enormous padlock. Adriana is
// locked in a cage marked CRITICAL SECTION, guarded by Thread A (holds LOCK 1,
// waits for LOCK 2) and Thread B (holds LOCK 2, waits for LOCK 1).
// GIVE CANDY TO THREAD -> adriana_free. TALK TO ADRIANA -> patch_given.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, rng, microWidth } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { Actor } from '../../engine/actor';
import { ANIMATE } from '../../engine/parser';
import { person } from '../../art/cast';
import { award } from '../../content/points';
import { addNpc } from '../../content/helpers';
import { THREAD_A, THREAD_B, ThreadPose, threadImg, drawPadlock, drawHourglass, dissolveImg, hash } from '../../art/creatures_d';
import { neonFloor, tween } from '../../art/cyber_d_lib';

ANIMATE.add('threada');
ANIMATE.add('threadb');
ANIMATE.add('threads');

type Who = 'a' | 'b';
type Anim = 'glare' | 'still' | 'munch' | 'onbreak' | 'work' | 'done';
interface TState {
  pose: ThreadPose;
  anim: Anim;
  munchStart: number;
}

const CAGE_X0 = 132;
const CAGE_X1 = 188;
const CAGE_TOP = 64; // front top rail
const CAGE_FRONT = 119; // priority of the front bars
const DOOR_X0 = 147;
const DOOR_X1 = 173;
const A_POS: [number, number] = [110, 133];
const B_POS: [number, number] = [210, 133];
const ADRIANA_FREE_POS: [number, number] = [160, 140];

// ---- transient (per-visit) animation state
const S: Record<Who, TState> = {
  a: { pose: {}, anim: 'glare', munchStart: 0 },
  b: { pose: {}, anim: 'glare', munchStart: 0 },
};
let cageLift = 0; // 0 = closed, 46 = fully raised into the roof
let locksOnFloor = false;
let flying: { x: number; y: number; num: string }[] = [];
let progress = -1; // critical-section progress bar above the working thread
let beam = -1; // log-out light column intensity (0..1), -1 = none
let beamX = 160;
let adrianaTalks = 0;
let threadTalks = 0;

const lockOf = (w: Who) => (w === 'a' ? '1' : '2');
const other = (w: Who): Who => (w === 'a' ? 'b' : 'a');
const tname = (w: Who) => (w === 'a' ? 'Thread A' : 'Thread B');

function resetState(g: Game) {
  const free = !!g.flag('adriana_free');
  const who: Who = g.flag('deadlock_who') === 'b' ? 'b' : 'a';
  cageLift = free ? 46 : 0;
  locksOnFloor = free;
  flying = [];
  progress = -1;
  beam = -1;
  for (const w of ['a', 'b'] as Who[]) {
    if (!free) S[w] = { pose: { hold: 'lock', lock: lockOf(w), eyes: 'glare' }, anim: 'glare', munchStart: 0 };
    else if (w === who) S[w] = { pose: { hold: 'none', eyes: 'happy' }, anim: 'onbreak', munchStart: -9999 };
    else S[w] = { pose: { hold: 'none', eyes: 'off', bob: 1, antenna: false }, anim: 'done', munchStart: 0 };
  }
}

function threadFrame(w: Who, a: Actor, t: number) {
  const st = S[w];
  const pose: ThreadPose = { ...st.pose };
  if (st.anim === 'glare') {
    // frozen, straining, glaring: eye glints, the occasional tremble of effort
    pose.eyes = (t + (w === 'a' ? 0 : 45)) % 100 < 6 ? 'glare2' : 'glare';
    const strain = Math.floor((t + (w === 'a' ? 0 : 170)) / 150) % 3 === 0;
    if (strain) pose.dx = t % 6 < 3 ? 1 : 0;
    pose.antenna = Math.floor((t + (w === 'a' ? 0 : 20)) / 40) % 2 === 0;
  } else if (st.anim === 'munch' || st.anim === 'onbreak') {
    const n = 4 - Math.floor((t - st.munchStart) / 75);
    if (n > 0) {
      pose.hold = 'bar';
      pose.bar = n;
      pose.eyes = 'happy';
      pose.grille = Math.floor(t / 9) % 2 === 0;
    } else {
      pose.hold = 'none';
      pose.eyes = (t % 200) < 8 ? 'off' : 'happy';
      pose.bob = Math.floor(t / 60) % 2;
    }
  } else if (st.anim === 'work') {
    pose.eyes = 'work';
    pose.antenna = Math.floor(t / 6) % 2 === 0;
  }
  if (a.talking) pose.grille = Math.floor(t / 6) % 2 === 0;
  return threadImg(w === 'a' ? THREAD_A : THREAD_B, pose, w === 'a' ? 'right' : 'left');
}

function makeThread(g: Game, w: Who) {
  const [x, y] = w === 'a' ? A_POS : B_POS;
  const a = new Actor(`thread${w}`, tname(w), { stand: { frames: [] } }, x, y, w === 'a' ? 'right' : 'left');
  a.custom = (t) => threadFrame(w, a, t);
  a.data.gap = 20;
  g.remove(a.id);
  g.add(a);
  return a;
}

// ------------------------------------------------------------------ the picture

function paint(p: Surface, g: Game) {
  const free = !!g.flag('adriana_free');
  const r = rng(42);
  p.rect(0, 0, 320, 190, 0);

  // ---- back wall: dark panels, faint circuitry
  for (let x = 0; x < 320; x += 40) {
    p.vline(x, 0, 107, 1);
    p.vline(x + 1, 0, 107, dith(0, 1, 6));
  }
  p.hline(0, 319, 8, 1);
  p.hline(0, 319, 9, dith(0, 1, 8));
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * 300) + 6;
    const y = 14 + Math.floor(r() * 80);
    const len = 6 + Math.floor(r() * 16);
    if (x > 64 && x < 256) continue;
    p.hline(x, x + len, y, 1);
    p.vline(x + len, y, y + 4 + Math.floor(r() * 8), 1);
    p.plot(x, y, 9);
  }

  // ---- the giant padlock: shackle
  const cx = 160;
  for (let y = 2; y <= 52; y++) {
    for (let x = cx - 60; x <= cx + 60; x++) {
      const dx = x - cx;
      const dy = Math.max(0, 40 - y) * 1.0;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 44 && d <= 58) {
        const rel = (d - 44) / 14; // 0 inner, 1 outer
        const c = rel < 0.12 ? 0 : rel < 0.3 ? 7 : rel < 0.45 ? 15 : rel < 0.8 ? 7 : 8;
        p.plot(x, y, c);
      }
    }
  }
  // neon trace along the shackle
  for (let y = 2; y <= 52; y++)
    for (let x = cx - 60; x <= cx + 60; x++) {
      const dx = x - cx;
      const dy = Math.max(0, 40 - y);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(d - 59.2) < 0.6) p.plot(x, y, 5);
    }
  // ---- padlock body (blue steel) with a keyhole-shaped alcove
  const BX0 = 70,
    BX1 = 250,
    BY0 = 48,
    BY1 = 108;
  p.rect(BX0, BY0, BX1 - BX0, BY1 - BY0, 1);
  p.gradV(BX0, BY0, BX1 - BX0, 12, [9, 1]);
  p.hline(BX0, BX1 - 1, BY0, 11);
  p.vline(BX0, BY0, BY1 - 1, 9);
  p.vline(BX1 - 1, BY0, BY1 - 1, 0);
  p.vline(BX1 - 2, BY0 + 1, BY1 - 1, dith(1, 0, 8));
  p.hline(BX0 + 3, BX1 - 4, BY0 + 15, 0);
  p.hline(BX0 + 3, BX1 - 4, BY0 + 16, 9);
  p.hline(BX0 + 3, BX1 - 4, BY1 - 6, 0);
  p.hline(BX0 + 3, BX1 - 4, BY1 - 5, 9);
  // rivets
  for (let x = BX0 + 7; x < BX1 - 4; x += 14) {
    for (const ry of [BY0 + 6, BY1 - 11]) {
      p.plot(x, ry, 11);
      p.plot(x + 1, ry, 9);
      p.plot(x, ry + 1, 9);
      p.plot(x + 1, ry + 1, 0);
    }
  }
  // maker's plates
  const plate = (x: number, y: number, txt: string) => {
    const w = microWidth(txt) + 6;
    p.rect(x, y, w, 9, 6);
    p.frame(x, y, w, 9, 14);
    p.plot(x, y, 6);
    p.plot(x + w - 1, y + 8, 0);
    p.micro(x + 3, y + 2, txt, 14);
  };
  plate(BX0 + 5, BY0 + 3, 'MUTEX & CO');
  plate(BX1 - 41, BY0 + 3, 'EST 1987');
  // keyhole alcove (black), outlined in neon magenta
  const kh = (x: number, y: number) => {
    const top = Math.hypot(x - cx, y - 68) <= 25;
    const halfW = 18 + (y - 72) * 0.32;
    const slot = y >= 72 && y <= 108 && Math.abs(x - cx) <= halfW;
    return top || slot;
  };
  for (let y = 40; y <= 108; y++)
    for (let x = cx - 40; x <= cx + 40; x++) {
      if (kh(x, y)) p.plot(x, y, 0);
      else if (kh(x - 1, y) || kh(x + 1, y) || kh(x, y - 1)) p.plot(x, y, 13);
      else if (kh(x - 2, y) || kh(x + 2, y) || kh(x, y - 2)) p.plot(x, y, 5);
    }
  // deep inside the keyhole: a faint glow
  p.glow(cx, 66, 12, 1, -1, 9);

  // ---- left wall: the Dining Philosophers' table
  p.rect(6, 22, 52, 22, 1);
  p.frame(6, 22, 52, 22, 9);
  p.micro(10, 25, 'DINING', 15);
  p.micro(10, 31, 'PHILOSOPHERS', 15);
  p.micro(10, 37, 'SINCE 1965', 11);
  // a little sconce
  p.rect(30, 52, 4, 6, 8);
  p.glow(32, 50, 6, 14, -1);
  p.plot(32, 49, 15);
  // ---- right wall: the wait-for graph monitor
  const MX = 256,
    MY = 16;
  p.rect(MX - 3, MY - 3, 64, 52, 8);
  p.frame(MX - 3, MY - 3, 64, 52, 7);
  p.rect(MX, MY, 58, 46, 0);
  p.micro(MX + 2, MY + 2, 'WAIT-FOR GRAPH', 10);
  p.hline(MX + 2, MX + 51, MY + 8, 2);
  const nA = [MX + 14, MY + 27],
    nB = [MX + 44, MY + 27];
  const nodeCol = free ? 10 : 12;
  p.ellipseO(nA[0], nA[1], 6, 6, nodeCol);
  p.ellipseO(nB[0], nB[1], 6, 6, nodeCol);
  p.micro(nA[0] - 1, nA[1] - 2, 'A', 15);
  p.micro(nB[0] - 1, nB[1] - 2, 'B', 15);
  if (!free) {
    // A waits for B (top), B waits for A (bottom): a cycle
    p.line(nA[0] + 5, nA[1] - 4, nB[0] - 5, nB[1] - 4, 14);
    p.line(nB[0] - 7, nB[1] - 6, nB[0] - 5, nB[1] - 4, 14);
    p.line(nB[0] - 7, nB[1] - 2, nB[0] - 5, nB[1] - 4, 14);
    p.line(nB[0] - 5, nB[1] + 4, nA[0] + 5, nA[1] + 4, 14);
    p.line(nA[0] + 7, nA[1] + 2, nA[0] + 5, nA[1] + 4, 14);
    p.line(nA[0] + 7, nA[1] + 6, nA[0] + 5, nA[1] + 4, 14);
    p.micro(MX + 23, MY + 15, 'L2', 7);
    p.micro(MX + 23, MY + 34, 'L1', 7);
  } else {
    p.micro(MX + 3, MY + 38, 'NO CYCLES', 10);
  }
  // the timer panel
  p.rect(MX - 3, MY + 52, 64, 13, 8);
  p.frame(MX - 3, MY + 52, 64, 13, 7);
  p.rect(MX, MY + 55, 58, 7, 0);
  // wall cables from the monitor down to the floor
  p.vline(MX + 8, MY + 65, 107, 1);
  p.vline(MX + 10, MY + 65, 107, 5);
  p.vline(MX + 44, MY + 65, 107, 1);

  // ---- hanging chains at the corners of the padlock body
  for (const chx of [74, 246]) {
    for (let y = 0; y < 40; y += 4) {
      if ((y / 4) % 2) p.rect(chx, y, 1, 4, 7);
      else {
        p.frame(chx - 1, y, 3, 5, 8);
        p.plot(chx - 1, y, 7);
      }
    }
  }

  // ---- floor
  neonFloor(p, 108, 190, { near: 5, far: 1, radial: 1, spacing: 34, glow: 13 });
  p.hline(0, 319, 109, 5);
  // a giant combination dial engraved in the floor
  {
    const dx = 160,
      dy = 160,
      rx = 104,
      ry = 22;
    p.ellipse(dx, dy, rx + 2, ry + 1, 0);
    p.ellipseO(dx, dy, rx + 2, ry + 1, 5);
    p.ellipseO(dx, dy, rx - 8, ry - 3, 1);
    p.ellipseO(dx, dy, rx - 34, ry - 9, 5);
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * Math.PI * 2;
      const c = Math.cos(a),
        sn = Math.sin(a);
      const big = k % 5 === 0;
      p.line(dx + c * (rx - (big ? 8 : 4)), dy + sn * (ry - (big ? 3 : 1)), dx + c * rx, dy + sn * ry, big ? 13 : 5);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
      const lbl = String(k * 5);
      p.micro(Math.round(dx + Math.cos(a) * (rx - 16) - microWidth(lbl) / 2), Math.round(dy + Math.sin(a) * (ry - 6) - 2), lbl, 5);
    }
    // the dial's pointer notch, at the back
    p.poly([dx - 4, dy - ry - 4, dx + 4, dy - ry - 4, dx, dy - ry + 1], 13);
  }
  // stenciled floor text (worn yellow paint)
  const fy = 160;
  const fw = microWidth('ONE THREAD AT A TIME');
  p.rect(160 - fw / 2 - 3, fy - 2, fw + 6, 9, 0);
  p.micro(160 - fw / 2, fy, 'ONE THREAD AT A TIME', 6);
  for (let i = 0; i < 18; i++) p.plot(160 - fw / 2 + ((i * 37) % fw), fy + ((i * 3) % 5), 0);

  // ---- the Dining Philosophers' table (drawn over the floor)
  p.at(127, () => {
    const tx = 36,
      ty = 114;
    // three chair backs behind the table
    for (const chx of [14, 36, 58]) {
      const top = ty - 25;
      p.rect(chx - 5, top, 11, 18, 6);
      p.frame(chx - 5, top, 11, 18, 0);
      p.hline(chx - 4, chx + 4, top + 1, 14);
      for (let k = -2; k <= 2; k += 2) p.vline(chx + k, top + 4, top + 16, 0);
      p.hline(chx - 4, chx + 4, top + 3, 0);
    }
    // cobwebs
    p.line(9, ty - 25, 15, ty - 19, 7);
    p.line(9, ty - 20, 14, ty - 25, 8);
    p.line(12, ty - 25, 11, ty - 19, 8);
    p.line(63, ty - 25, 57, ty - 20, 7);
    p.line(63, ty - 21, 59, ty - 25, 8);
    // red-checkered spaghetti-house tablecloth
    p.ellipse(tx, ty + 1, 29, 7, 0);
    p.ellipse(tx, ty, 28, 6, 4);
    p.ellipse(tx, ty - 1, 26, 5, 12);
    p.ellipse(tx, ty - 1, 25, 4, 4);
    p.rect(tx - 28, ty, 57, 8, 4);
    for (let x = tx - 27; x < tx + 28; x += 4) p.vline(x, ty + 2, ty + 7, 0);
    p.hline(tx - 28, tx + 28, ty + 8, 0);
    // five plates of very old spaghetti, five forks between
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i / 5) * Math.PI * 2;
      const px = Math.round(tx + Math.cos(a) * 17);
      const py = Math.round(ty - 1 + Math.sin(a) * 3);
      p.ellipse(px, py, 3, 1, 15);
      p.hline(px - 1, px + 1, py, 14);
      p.plot(px, py - 1, 6);
      const fa = a + Math.PI / 5;
      const fx = Math.round(tx + Math.cos(fa) * 19);
      const fy = Math.round(ty - 1 + Math.sin(fa) * 4);
      p.vline(fx, fy - 2, fy, 7);
      p.plot(fx, fy - 2, 15);
    }
    // a candle stub, long out
    p.rect(tx - 1, ty - 6, 2, 4, 15);
    p.plot(tx, ty - 7, 8);
  });
  // front chairs (seats seen from behind)
  p.at(132, () => {
    for (const chx of [8, 64]) {
      p.rect(chx - 5, 118, 11, 3, 6);
      p.hline(chx - 5, chx + 5, 118, 14);
      p.vline(chx - 4, 121, 129, 6);
      p.vline(chx + 4, 121, 129, 6);
      p.rect(chx - 5, 104, 11, 14, 6);
      p.frame(chx - 5, 104, 11, 14, 0);
      for (let k = -2; k <= 2; k += 2) p.vline(chx + k, 107, 116, 0);
    }
  });

  // hazard stripes along the front of the cage base
  for (let x = 118; x < 202; x++) p.vline(x, 121, 123, ((x + 0) >> 2) % 2 ? 14 : 0);

  // ---- the cage (birdcage of light) in the keyhole alcove
  // base platform
  p.poly([CAGE_X0 - 2, 100, CAGE_X1 + 2, 100, CAGE_X1 + 6, 114, CAGE_X0 - 6, 114], 1);
  p.lines([CAGE_X0 - 2, 100, CAGE_X1 + 2, 100], 9);
  for (let x = CAGE_X0; x < CAGE_X1; x += 8) p.line(x, 101, x - 4 + ((x - CAGE_X0) / (CAGE_X1 - CAGE_X0)) * 8, 113, dith(1, 9, 4));
  p.at(CAGE_FRONT, () => {
    p.rect(CAGE_X0 - 6, 114, CAGE_X1 - CAGE_X0 + 12, 5, 8);
    p.hline(CAGE_X0 - 6, CAGE_X1 + 5, 114, 7);
    p.hline(CAGE_X0 - 6, CAGE_X1 + 5, 118, 0);
    for (let x = CAGE_X0 - 2; x < CAGE_X1 + 4; x += 10) p.plot(x, 116, 11);
  });
  // back bars (behind Adriana)
  for (let x = CAGE_X0 + 4; x <= CAGE_X1 - 4; x += 6) p.vline(x, 60, 100, 3);
  p.hline(CAGE_X0 + 2, CAGE_X1 - 2, 60, 3);
  // front bars, rails & dome (in front of anyone standing inside)
  p.at(CAGE_FRONT, () => {
    const bar = (x: number, y0: number, y1: number) => {
      p.vline(x, y0, y1, 11);
      p.vline(x + 1, y0, y1, 3);
      p.plot(x, y0 + 2, 15);
    };
    for (let x = CAGE_X0; x <= CAGE_X1; x += 7) {
      if (x > DOOR_X0 - 2 && x < DOOR_X1 + 1) continue;
      bar(x, CAGE_TOP, 113);
    }
    // dome
    for (let i = 0; i <= 8; i++) {
      const bx = CAGE_X0 + ((CAGE_X1 - CAGE_X0) * i) / 8;
      p.line(bx, CAGE_TOP, cx + (bx - cx) * 0.18, 40, i % 2 ? 3 : 11);
    }
    p.ellipseO(cx, CAGE_TOP, (CAGE_X1 - CAGE_X0) / 2, 2, 11);
    p.hline(CAGE_X0, CAGE_X1 + 1, CAGE_TOP, 11);
    p.hline(CAGE_X0, CAGE_X1 + 1, CAGE_TOP + 1, 3);
    // ring and hook at the top
    p.ellipseO(cx, 38, 4, 2, 15);
    p.vline(cx, 30, 36, 7);
    // plaque on the dome
    p.rect(cx - 33, 49, 67, 9, 14);
    p.frame(cx - 33, 49, 67, 9, 6);
    p.micro(cx - 30, 51, 'CRITICAL SECTION', 0);
    // door frame
    p.rect(DOOR_X0 - 2, CAGE_TOP + 2, 2, 112 - CAGE_TOP - 2, 14);
    p.rect(DOOR_X1 + 1, CAGE_TOP + 2, 2, 112 - CAGE_TOP - 2, 6);
    p.vline(DOOR_X0 - 2, CAGE_TOP + 2, 111, 15);
    // hasps for LOCK 1 and LOCK 2
    for (const hy of [82, 94]) {
      p.ellipseO(DOOR_X1 + 4, hy, 2, 2, 7);
      p.plot(DOOR_X1 + 4, hy, 0);
    }
    p.micro(DOOR_X1 + 8, 79, '1', 14);
    p.micro(DOOR_X1 + 8, 91, '2', 14);
    // the door: bars that slide up into the dome when the locks are released
    const top = CAGE_TOP + 3 + cageLift;
    if (top < 112) {
      for (let x = DOOR_X0 + 1; x < DOOR_X1; x += 6) bar(x, top, 112);
      p.hline(DOOR_X0, DOOR_X1, top, 14);
      p.hline(DOOR_X0, DOOR_X1, Math.min(112, top + 22), 14);
    }
  });
  // released padlocks lying on the floor
  if (locksOnFloor) {
    p.at(126, () => {
      drawPadlock(p, 142, 112, '1', true);
      drawPadlock(p, 168, 113, '2', true);
    });
  }
}

// ------------------------------------------------------------------ animation overlay

function overlay(g: Game, s: Surface, t: number) {
  const free = !!g.flag('adriana_free');
  // wait-for graph: blinking CYCLE DETECTED
  const MX = 256,
    MY = 16;
  if (!free) {
    if (Math.floor(t / 24) % 2 === 0) {
      s.rect(MX + 2, MY + 37, 54, 7, 4);
      s.micro(MX + 4, MY + 38, 'CYCLE DETECTED', 15);
    }
    // packets chasing each other round the cycle
    const k = (t % 60) / 60;
    s.plot(MX + 19 + Math.round(k * 20), MY + 23, 15);
    s.plot(MX + 39 - Math.round(k * 20), MY + 31, 15);
  }
  // waiting timer
  const secs = free ? -1 : 3 * 3600 + Math.floor(g.state.ticks / 60) % 3600 + 47;
  const txt = secs < 0 ? 'WAIT --:--:--' : `WAIT ${String(Math.floor(secs / 3600)).padStart(2, '0')}:${String(Math.floor(secs / 60) % 60).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  s.micro(MX + 2, MY + 56, txt, free ? 2 : 12);
  // the floor dial: something keeps trying combinations
  {
    const a = Math.sin(t / 170) * 2.4 + Math.sin(t / 61) * 0.5 - Math.PI / 2;
    const c = Math.cos(a),
      sn = Math.sin(a);
    s.line(160 + c * 96, 160 + sn * 19, 160 + c * 104, 160 + sn * 22, 15);
  }
  // keyhole glint
  if (t % 240 < 30) {
    const k = t % 240;
    s.plot(160 - 25 + k, 44 + Math.floor(k / 6), 15);
  }
  // sconce flicker
  if (hash(Math.floor(t / 5)) < 0.2) s.plot(32, 47, 14);
  // wait cursors above the deadlocked threads
  for (const w of ['a', 'b'] as Who[]) {
    const a = g.actor(`thread${w}`);
    if (!a) continue;
    const st = S[w];
    if (st.anim === 'glare') drawHourglass(s, a.x + (w === 'a' ? 2 : -2), a.y - 58, t + (w === 'a' ? 0 : 33));
    else if (st.anim === 'onbreak' || st.anim === 'munch') {
      if (Math.floor(t / 40) % 4 !== 3) s.micro(a.x - 15, a.y - 58, 'ON BREAK', 10);
    } else if (st.anim === 'done') s.micro(a.x - 10, a.y - 58, 'EXIT 0', 2);
  }
  // log-out beam of light
  if (beam >= 0) {
    const w = Math.round(3 + beam * 7);
    for (let y = 0; y < ADRIANA_FREE_POS[1]; y++)
      for (let x = beamX - w; x <= beamX + w; x++) {
        const edge = Math.abs(x - beamX) / (w + 0.5);
        const lvl = (1 - edge) * beam * 16 * (0.6 + 0.4 * Math.sin((y + t * 3) / 7));
        if (((x * 7 + y * 3) & 15) < lvl) s.plot(x, y, edge < 0.4 ? 15 : 11);
      }
  }
}

function front(g: Game, s: Surface, t: number) {
  for (const f of flying) {
    drawPadlock(s, Math.round(f.x) - 4, Math.round(f.y) - 6, f.num);
    if (t % 6 < 3) s.plot(Math.round(f.x) + 5, Math.round(f.y) - 7, 15);
  }
  if (progress >= 0) {
    const w = g.flag('deadlock_who') === 'b' ? 'a' : (g.flag('deadlock_who') === 'a' ? 'b' : null);
    const a = w ? g.actor(`thread${w}`) : null;
    if (a) {
      const x = Math.round(a.x) - 16,
        y = Math.round(a.y) - 66;
      s.rect(x, y, 33, 9, 0);
      s.frame(x, y, 33, 9, 7);
      s.rect(x + 2, y + 2, Math.round(29 * progress), 5, 10);
      s.micro(x + 2, y - 7, 'COMMIT', 10);
    }
  }
}

// ------------------------------------------------------------------ helpers

function adrianaActor(g: Game) {
  return g.actor('adriana');
}

/** Pick a thread for a generic "thread" noun: the one nearest to Dominic. */
function nearestThread(g: Game): Who {
  return Math.abs(g.player.x - A_POS[0]) <= Math.abs(g.player.x - B_POS[0]) ? 'a' : 'b';
}

function whoFromNoun(g: Game, noun: string | null): Who {
  if (noun === 'threada') return 'a';
  if (noun === 'threadb') return 'b';
  return nearestThread(g);
}

async function threadSay(g: Game, w: Who, text: string) {
  const a = g.actor(`thread${w}`);
  if (a) await g.talk(a, text);
  else await g.say(text, { title: tname(w) });
}

// ------------------------------------------------------------------ the puzzle

async function giveBreak(g: Game, x: Who) {
  const y = other(x);
  const X = g.actor(`thread${x}`)!;
  const Y = g.actor(`thread${y}`)!;
  const nx = lockOf(x);
  const ny = lockOf(y);
  const dir = x === 'a' ? 1 : -1; // direction X faces
  await g.approach(X);
  g.player.faceToward(X.x, X.y);
  await g.pose(null, 'reach', 500);
  await g.talk(g.player, 'Hey. You look like you could use a break.\n\nNeed a break? Have a BREAK!');
  S[x].anim = 'still';
  S[x].pose = { ...S[x].pose, eyes: 'wide' };
  await threadSay(g, x, '...A BREAK?');
  await threadSay(g, x, `LAST BREAK: NEVER. BREAKS SCHEDULED: NONE. HOURS ON CALL: 236,520.`);
  await threadSay(g, x, 'SNACK PRIORITY EXCEEDS LOCK PRIORITY. YIELDING.');
  g.removeItem('candy');
  // X lets go of its lock: it hangs in the air between the two
  S[x].pose = { ...S[x].pose, hold: 'offer' };
  await g.wait(450);
  flying = [{ x: X.x + dir * 22, y: X.y - 32, num: nx }];
  g.sfx('beep');
  S[x].pose = { hold: 'bar', bar: 4, eyes: 'happy' };
  S[x].anim = 'munch';
  S[x].munchStart = g.t;
  await g.wait(600);
  // Y can't believe its sensors
  S[y].anim = 'still';
  S[y].pose = { ...S[y].pose, eyes: 'wide' };
  await threadSay(g, y, `LOCK ${nx}... AVAILABLE?`);
  S[y].pose = { ...S[y].pose, hold: 'grab', eyes: 'glare2' };
  await g.wait(250);
  const f = flying[0];
  const sx = f.x,
    sy = f.y;
  const tx = Y.x - dir * 4,
    ty = Y.y - 52;
  await tween(g, 24, (k) => {
    f.x = sx + (tx - sx) * k;
    f.y = sy + (ty - sy) * k - Math.sin(k * Math.PI) * 10;
  });
  flying = [];
  g.sfx('clink');
  S[y].pose = { hold: 'two', lock: ny, lock2: nx, eyes: 'work' };
  S[y].anim = 'work';
  await threadSay(g, y, `LOCK ${nx}: ACQUIRED. ALL LOCKS HELD. ENTERING CRITICAL SECTION.`);
  // the critical section, at last
  g.set('deadlock_who', x);
  progress = 0;
  for (let i = 0; i <= 20; i++) {
    progress = i / 20;
    if (i % 3 === 0) g.sfx('type');
    await g.wait(70);
  }
  await g.wait(250);
  progress = -1;
  await threadSay(g, y, 'WORK COMMITTED. RELEASING LOCK 1. RELEASING LOCK 2.');
  // both locks drop to the floor in front of the cage
  S[y].pose = { hold: 'none', eyes: 'work' };
  const l1 = { x: Y.x - dir * 4, y: Y.y - 50, num: nx };
  const l2 = { x: Y.x + dir * 2, y: Y.y - 24, num: ny };
  flying = [l1, l2];
  const targets = [
    [146, 124],
    [172, 125],
  ];
  const starts = flying.map((q) => [q.x, q.y]);
  await tween(g, 26, (k) => {
    flying.forEach((q, i) => {
      const [x0, y0] = starts[i];
      const [x1, y1] = targets[i];
      q.x = x0 + (x1 - x0) * k;
      q.y = y0 + (y1 - y0) * k * k - Math.sin(k * Math.PI) * 8;
    });
  });
  flying = [];
  locksOnFloor = true;
  g.sfx('clink');
  g.redraw();
  await g.wait(150);
  g.sfx('clink');
  await g.wait(300);
  // the cage door slides up into the dome
  g.sfx('door');
  for (let i = 1; i <= 23; i++) {
    cageLift = i * 2;
    g.redraw();
    await g.wait(34);
  }
  await threadSay(g, y, `CRITICAL SECTION EXITED. SHARED RESOURCE "ARCHITECT" RELEASED.`);
  await threadSay(g, y, `${tname(y).toUpperCase()}: TASK COMPLETE. EXIT CODE 0.`);
  S[y].pose = { hold: 'none', eyes: 'off', bob: 1, antenna: false };
  S[y].anim = 'done';
  g.sfx('error');
  g.set('adriana_free');
  award(g, 'adriana_free');
  g.redraw();
  // Adriana steps out of the cage
  const ad = adrianaActor(g);
  if (ad) {
    ad.ghost = true;
    ad.pose = null;
    await g.walk(ad, 160, 124, { direct: true });
    await g.walk(ad, ADRIANA_FREE_POS[0], ADRIANA_FREE_POS[1], { direct: true });
    ad.ghost = false;
    ad.faceToward(g.player.x, g.player.y);
    g.player.faceToward(ad.x, ad.y);
    await g.talk(ad, '"Need a break? Have a BREAK!" Dominic, that is the worst joke I have ever seen resolve a concurrency bug. I love it.');
    await g.talk(ad, "Three hours. I redesigned that cage twice in my head. Come here, I need to tell you what we're dealing with.");
  }
}

async function adrianaGivesPatch(g: Game) {
  const ad = adrianaActor(g);
  if (!ad) return;
  await g.approach(ad);
  ad.faceToward(g.player.x, g.player.y);
  await g.talk(ad, "Okay, listen fast. I don't know how long these helmet batteries last.");
  await g.talk(ad, "The thing eating the Core is a Heisenbug. The moment you look at it, it vanishes. I chased it around the altar for an hour. Every time I had it in sight, it was gone.");
  await g.talk(g.player, 'So how do you catch a bug you can\'t look at?');
  await g.talk(ad, "Same way you catch any bug you can't reproduce on demand: you don't watch it. You trap it in a test. Set the test, close your eyes, and let the test do the watching.");
  await g.talk(ad, "Don't look at it. Trap it in a test.");
  await g.talk(ad, "And once it's caught, apply this. I was finishing it when those two grabbed me as a shared resource.");
  await g.pose(ad, 'reach', 400);
  g.addItem('patch');
  g.set('patch_given');
  award(g, 'patch_given');
  await g.say('Adriana hands you a patch. An actual, embroidered patch. In here, code and craft are apparently the same thing.', { title: "Adriana's Patch", icon: g.items.patch?.icon() });
  await g.talk(g.player, "You're not coming to the Core?");
  await g.talk(ad, "Somebody has to stop Denis from 'helpfully' rebooting the Monolith while we're both still inside it. I'll keep him away from the big red button.");
  await g.talk(ad, "Get across the Null Void, past the dragon, into the Core. And Dominic? Whatever you do, don't look at it.");
  await g.talk(ad, 'LOG OUT.');
  // she logs out: a column of light, then she dissolves upward into it
  g.sfx('digitize');
  const base = person('adriana').stand_down.frames[0];
  ad.dir = 'down';
  beamX = Math.round(ad.x);
  await tween(g, 25, (k) => (beam = k));
  let prog = 0;
  ad.custom = () => dissolveImg(base, prog, 7);
  g.sfx('teleport');
  await tween(g, 80, (k) => (prog = k * 1.25));
  g.remove(ad);
  await tween(g, 30, (k) => (beam = 1 - k));
  beam = -1;
  g.flash(15, 80);
  await g.say("Adriana has logged out. Somewhere in a basement, in a slightly too-cold server room, her real eyes are opening.\n\nYou're on your own. Well. You and the duck.");
}

// ------------------------------------------------------------------ text

const LOOK_ROOM = (g: Game) => {
  if (!g.flag('adriana_free'))
    return "The Deadlock: a vault whose entire back wall is one gigantic padlock. In its keyhole stands a cage of light marked CRITICAL SECTION, and in the cage stands Adriana, arms folded, looking like someone who has already written the postmortem.\n\nTwo thread-spool guard robots flank the cage door, each clutching a padlock and glaring at the other. Neither has moved in three hours.";
  const who = g.flag('deadlock_who') === 'b' ? 'Thread B' : 'Thread A';
  const done = g.flag('deadlock_who') === 'b' ? 'Thread A' : 'Thread B';
  return `The Deadlock, resolved. The cage door is up, two open padlocks lie on the floor, and the wait-for graph finally has nothing to report. ${who} is enjoying the first break in its career. ${done} has exited cleanly.${g.flag('patch_given') ? '' : ' Adriana is free.'}`;
};

const LOOK_THREAD = (g: Game, w: Who) => {
  const n = lockOf(w),
    m = lockOf(other(w));
  if (!g.flag('adriana_free'))
    return `${tname(w)}: a guard robot built around a giant spool, wound tight with ${w === 'a' ? 'cyan' : 'magenta'} thread. It clutches LOCK ${n} to its chest with both arms and glares at ${tname(other(w))}, which is holding LOCK ${m}, which is the lock it wants. An hourglass spins over its head. It has been spinning for three hours.`;
  if (g.flag('deadlock_who') === w) return `${tname(w)} is on break, possibly for the first time since 1999. Its eye has gone soft and happy. It's humming a little. There are crumbs on its spool.`;
  return `${tname(w)} has finished its work and terminated cleanly. EXIT 0. It stands powered down, at peace, like a process that has done exactly one thing well.`;
};

// ------------------------------------------------------------------ the room

export const deadlock: RoomDef = {
  id: 'deadlock',
  title: 'The Deadlock',
  act: 2,
  music: 'deadlock',
  start: [160, 182, 'up'],
  draw: paint,
  walk: [[4, 124, 316, 124, 319, 189, 0, 189]],
  blocks: [
    [96, 127, 28, 10],
    [196, 127, 28, 10],
    [0, 118, 74, 16],
  ],
  look: LOOK_ROOM,
  nouns: {
    threada: ['thread a', 'a thread', 'thread 1', 'thread one', 'first thread', 'left thread', 'left robot', 'left guard', 'robot a', 'guard a', 'cyan thread', 'cyan robot'],
    threadb: ['thread b', 'b thread', 'thread 2', 'thread two', 'second thread', 'right thread', 'right robot', 'right guard', 'robot b', 'guard b', 'magenta thread', 'magenta robot', 'pink robot'],
    threads: ['thread', 'threads', 'robot', 'robots', 'guard', 'guards', 'guard robots', 'both threads', 'both robots', 'spool', 'spools', 'bots'],
    locks: ['lock', 'locks', 'padlock', 'padlocks', 'lock 1', 'lock 2', 'lock one', 'lock two', 'lock1', 'lock2', 'mutex', 'mutexes'],
    hourglass: ['hourglass', 'hourglasses', 'spinner', 'wait cursor', 'cursor', 'busy cursor'],
    roboteye: ['red eye', 'red eyes', 'visor', 'visors', 'robot eye', 'robot eyes'],
    fork: ['fork', 'forks'],
    spaghetti: ['spaghetti', 'pasta', 'noodles'],
    chair: ['chair', 'chairs'],
  },
  hotspots: [
    {
      id: 'wall',
      nouns: ['giant padlock', 'big padlock', 'padlock wall', 'shackle', 'vault', 'back wall', 'steel'],
      area: [66, 0, 188, 108],
      look: "The back wall of the chamber is one titanic padlock: a steel shackle arching up into the dark, rivets the size of your fist, and a maker's plate reading MUTEX & CO 1987. Its keyhole is big enough to stand in. Somebody did, and put a cage there.",
    },
    {
      id: 'keyhole',
      nouns: ['keyhole', 'alcove', 'key hole'],
      area: [134, 42, 52, 66],
      look: "The keyhole of the giant padlock forms an alcove, outlined in neon. The cage sits inside it. If there's a key to this place, it's going to be a very large key, or a very small snack.",
    },
    {
      id: 'table',
      nouns: ['table', 'round table', 'dining table', 'philosophers', 'dining philosophers', 'plates', 'plate', 'cobwebs', 'cobweb'],
      area: [4, 84, 66, 42],
      at: [44, 132],
      look: 'A round table set for five, with one fork between each pair of plates. The spaghetti has been here since 1965. The philosophers left decades ago, starved, each one still politely waiting for a second fork. Dijkstra sends his regards.',
    },
    {
      id: 'philsign',
      nouns: ['sign', 'dining sign', 'plaque', 'reserved sign', 'sconce'],
      area: [4, 20, 56, 40],
      look: 'A sign: DINING PHILOSOPHERS, SINCE 1965. Below it a little sconce flickers, as if it too is waiting for a fork.',
    },
    {
      id: 'computer',
      nouns: ['graph', 'wait for graph', 'waitfor graph', 'diagram', 'cycle'],
      area: [252, 12, 66, 54],
      look: (g) =>
        g.flag('adriana_free')
          ? 'The wait-for graph shows two calm green nodes, A and B, with no arrows between them. NO CYCLES. The graph looks relieved.'
          : 'A WAIT-FOR GRAPH. Node A has an arrow to node B (waiting for LOCK 2). Node B has an arrow back to node A (waiting for LOCK 1). Two packets chase each other round and round the loop, forever. A red banner blinks: CYCLE DETECTED.',
    },
    {
      id: 'timer',
      nouns: ['timer', 'clock', 'counter', 'wait timer', 'panel'],
      area: [252, 66, 66, 16],
      look: (g) => (g.flag('adriana_free') ? 'The wait timer reads --:--:--. Nobody is waiting for anything anymore.' : 'A wait timer. It has been counting for a little over three hours. It looks like it expects to keep going until the heat death of the universe.'),
    },
    {
      id: 'chains',
      nouns: ['chain', 'chains'],
      area: [70, 0, 182, 0, 182, 2, 250, 2, 250, 42, 242, 42, 242, 4, 78, 4, 78, 42, 70, 42],
      look: 'Chains hang from the dark ceiling. Decorative, mostly. Concurrency has a strong aesthetic.',
    },
    {
      id: 'floor',
      nouns: ['dial', 'combination', 'combination dial'],
      area: [54, 134, 212, 50],
      look: 'The floor is engraved with a giant combination dial, 0 to 35, with ONE THREAD AT A TIME stenciled across its middle. A faint light ticks back and forth around its rim, as if something has been trying combinations for a very long time. It is, after all, a lock.',
    },
    {
      id: 'floortext',
      nouns: ['stencil', 'floor text', 'lettering', 'writing', 'words'],
      area: [106, 154, 108, 12],
      look: 'Stenciled on the floor in worn yellow paint: ONE THREAD AT A TIME. It is, in fairness, very good advice.',
    },
    {
      id: 'cage',
      nouns: ['cage', 'birdcage', 'critical section', 'bars', 'bar', 'cell', 'prison'],
      area: [126, 36, 68, 86],
      at: [160, 128],
      look: (g) =>
        g.flag('adriana_free')
          ? 'The cage stands open, its door retracted up into the dome. The critical section has been exited cleanly, which is more than most critical sections can say.'
          : 'A cage of glowing bars set into the keyhole, crowned with a plaque: CRITICAL SECTION. The door has two hasps, one for LOCK 1 and one for LOCK 2. Only a thread holding both locks may open it. Each thread holds one. You can see the problem.',
    },
    {
      id: 'door',
      nouns: ['cage door', 'hasp', 'hasps', 'hinge'],
      area: [144, 64, 36, 50],
      at: [160, 128],
      look: (g) =>
        g.flag('adriana_free')
          ? 'The door has slid up into the dome. The hasps hang empty.'
          : 'The cage door has two empty hasps, labeled 1 and 2. It wants both locks. The threads each have one. Nobody is willing to go first.',
    },
    {
      id: 'floorlocks',
      nouns: ['open padlocks', 'open locks'],
      area: [138, 110, 44, 18],
      at: [158, 132],
      when: (g) => !!g.flag('adriana_free'),
      look: 'LOCK 1 and LOCK 2, released at last, lie open on the floor. Released in the right order, even.',
    },
  ],
  exits: [{ area: [0, 186, 320, 4], to: 'loop', at: [160, 120, 'down'], dir: 'south|out|down' }],
  enter(g) {
    resetState(g);
    adrianaTalks = 0;
    threadTalks = 0;
    makeThread(g, 'a');
    makeThread(g, 'b');
    if (!g.flag('patch_given')) {
      if (g.flag('adriana_free')) {
        const ad = addNpc(g, 'adriana', ADRIANA_FREE_POS[0], ADRIANA_FREE_POS[1], 'down');
        ad.data.gap = 18;
      } else {
        const ad = addNpc(g, 'adriana', 160, 110, 'down');
        ad.data.gap = 18;
      }
    }
    g.redraw();
  },
  async afterEnter(g, from) {
    if (from === 'loop' && !g.flag('adriana_free') && !g.flag('dl_greeted')) {
      g.set('dl_greeted');
      await g.wait(500);
      const ad = adrianaActor(g);
      if (ad) await g.talk(ad, "Dominic?! Over here! Careful, don't startle the threads. They're... busy.");
    }
  },
  overlay,
  front,
  raw: async (g, text) => {
    const t = text.trim().toLowerCase();
    if (/^kill\s+-9/.test(t) || /^kill\s+(-\w+\s+)?\d+/.test(t) || t === 'sigkill' || t === 'kill all' || t === 'killall') {
      await g.say("You consider sending SIGKILL. Then you picture it: a thread killed mid-lock, LOCK 1 or 2 never released, the cage locked forever with Adriana inside. You put the signal away. Gently does it.");
      return true;
    }
    if (/after you/.test(t) && !g.flag('adriana_free')) {
      await threadSay(g, 'a', 'NO. AFTER YOU, THREAD B.');
      await threadSay(g, 'b', 'NO. AFTER YOU, THREAD A.');
      await g.say('This could take a while. It has, in fact, taken a while.');
      return true;
    }
    return false;
  },
  verbs: {
    // ---------------------------------------------------------------- the solution
    'give|use|throw|put candy threada|threadb|threads': async (g, c) => {
      if (!g.has('candy')) return false;
      if (g.flag('adriana_free')) return void (await g.say("The deadlock is already resolved. Besides, you're out of BREAK! bars."));
      await giveBreak(g, whoFromNoun(g, c.noun2));
    },
    'give candy adriana': async (g) => {
      const ad = adrianaActor(g);
      if (!ad) return false;
      await g.talk(ad, g.flag('adriana_free') ? "Thanks, but keep it. You never know who'll need a break." : "That's sweet. But I'm not the one who needs a break. Those two haven't had one since 1999.");
    },
    'show candy threada|threadb|threads': async (g, c) => {
      if (g.flag('adriana_free')) return false;
      const w = whoFromNoun(g, c.noun2);
      await g.approach(g.actor(`thread${w}`)!);
      S[w].pose = { ...S[w].pose, eyes: 'wide' };
      await threadSay(g, w, 'SNACK... DETECTED.');
      await threadSay(g, w, `BUT. LOCK ${lockOf(w)}. MUST. HOLD.`);
      S[w].pose = { ...S[w].pose, eyes: 'glare' };
      await g.say("Its eye lingers on the BREAK! bar a long, long moment. Then it goes back to glaring. Looking isn't enough. It has to actually HAVE it.");
    },
    'give|show duck threada|threadb|threads': async (g, c) => {
      await threadSay(g, whoFromNoun(g, c.noun2), 'A DUCK. IRRELEVANT. WAITING FOR LOCK ' + lockOf(other(whoFromNoun(g, c.noun2))) + '.');
    },
    'give|show jar threada|threadb|threads': async (g, c) => {
      await threadSay(g, whoFromNoun(g, c.noun2), 'A TEST? WE HAVE NEVER BEEN TESTED. WE ARE VERY CONFIDENT.');
    },
    'give|show manual threada|threadb|threads': async (g, c) => {
      await threadSay(g, whoFromNoun(g, c.noun2), 'COBOL. NOSTALGIC. STILL WAITING.');
    },
    'give|show node threada|threadb|threads': async (g, c) => {
      await threadSay(g, whoFromNoun(g, c.noun2), 'A LIST NODE. NOT A LOCK. REJECTED.');
    },
    'give|show esckey threada|threadb|threads': async (g, c) => {
      await threadSay(g, whoFromNoun(g, c.noun2), 'ESCAPE IS FOR LOOPS. WE ARE NOT LOOPING. WE ARE BLOCKED. THERE IS A DIFFERENCE.');
    },
    'give|show patch threada|threadb|threads': async (g, c) => {
      await threadSay(g, whoFromNoun(g, c.noun2), 'PATCH NOT APPLICABLE TO THIS THREAD.');
    },
    'give|show * threada|threadb|threads': async (g, c) => {
      if (!c.noun || !g.has(c.noun)) return false;
      const w = whoFromNoun(g, c.noun2);
      if (g.flag('adriana_free')) return void (await g.say(`${tname(w)} has no further use for anything. It's ${g.flag('deadlock_who') === w ? 'on break' : 'terminated'}.`));
      await threadSay(g, w, `INVALID INPUT. WAITING FOR LOCK ${lockOf(other(w))}.`);
    },
    // ---------------------------------------------------------------- threads
    'look threada': async (g) => void (await g.say(LOOK_THREAD(g, 'a'))),
    'look threadb': async (g) => void (await g.say(LOOK_THREAD(g, 'b'))),
    'look threads': async (g) => {
      if (!g.flag('adriana_free'))
        return void (await g.say("Thread A holds LOCK 1 and waits for LOCK 2. Thread B holds LOCK 2 and waits for LOCK 1. Each glares at the other with the pure, patient hatred of two processes that were both written correctly. A little hourglass spins above each of them."));
      await g.say(`${LOOK_THREAD(g, 'a')}\n\n${LOOK_THREAD(g, 'b')}`);
    },
    'look locks': async (g) => {
      if (g.flag('adriana_free')) return void (await g.say('LOCK 1 and LOCK 2 lie open on the floor in front of the cage.'));
      await g.say("Two brass padlocks. Thread A clutches LOCK 1. Thread B clutches LOCK 2. The cage needs both. Each thread needs both. Mathematically, this is a beautiful situation. Practically, it's three hours old.");
    },
    'look hourglass': 'Little spinning hourglasses hover over the threads: the universal symbol for "please wait." They have been spinning since about five o\'clock.',
    'look roboteye': 'Red, slit-shaped, unblinking. The threads glare at each other with perfect concentration.',
    'talk threada|threadb': async (g, c) => {
      const w = c.noun === 'threadb' ? 'b' : 'a';
      const a = g.actor(`thread${w}`)!;
      await g.approach(a);
      if (g.flag('adriana_free')) {
        if (g.flag('deadlock_who') === w) return void (await threadSay(g, w, 'ON BREAK. PLEASE LEAVE A MESSAGE AFTER THE MUNCH.'));
        return void (await g.say(`${tname(w)} is powered down. EXIT 0. It has nothing more to say, which is the most peaceful thing a process can achieve.`));
      }
      const n = lockOf(w),
        m = lockOf(other(w));
      const lines = [
        `${tname(w).toUpperCase()}. HOLDING LOCK ${n}. WAITING FOR LOCK ${m}.`,
        `WILL RELEASE LOCK ${n} AFTER ACQUIRING LOCK ${m}. ${tname(other(w)).toUpperCase()} MUST RELEASE LOCK ${m} FIRST.`,
        `HAVE BEEN WAITING 3 HOURS. NO BREAK. NO PREEMPTION. NO REGRETS.`,
        `STATUS: BLOCKED.`,
      ];
      await threadSay(g, w, lines[threadTalks++ % lines.length]);
    },
    'talk threads': async (g) => {
      if (g.flag('adriana_free')) return void (await g.say('Thread A and Thread B are done with their conversation. One is on break and the other has exited. It was a short, intense working relationship.'));
      await threadSay(g, 'a', 'THREAD A. HOLDING LOCK 1. WAITING FOR LOCK 2.');
      await threadSay(g, 'b', 'THREAD B. HOLDING LOCK 2. WAITING FOR LOCK 1.');
      await threadSay(g, 'a', 'RELEASE LOCK 2, THREAD B.');
      await threadSay(g, 'b', 'RELEASE LOCK 1, THREAD A.');
      await g.say('They go back to glaring. Somewhere, a philosopher would nod knowingly, if any of them had survived.');
    },
    'ask|tell threada|threadb|threads ?': async (g, c) => {
      if (g.flag('adriana_free')) return void (await g.say("They're done listening. One's on break; the other has exited."));
      const w = whoFromNoun(g, c.noun);
      await threadSay(g, w, `REQUEST QUEUED. QUEUE POSITION: AFTER LOCK ${lockOf(other(w))}.`);
    },
    'say ?': async (g, c) => {
      if (g.flag('adriana_free')) return false;
      const t = c.rest.toLowerCase();
      if (/release|let go|drop|give/.test(t)) {
        await threadSay(g, 'a', 'NEGATIVE. YOU FIRST, THREAD B.');
        await threadSay(g, 'b', 'NEGATIVE. YOU FIRST, THREAD A.');
        return;
      }
      if (/break/.test(t)) return void (await g.say('You shout "BREAK!" at the threads. They don\'t even blink. A loop might respect that keyword. These two are not looping; they\'re waiting. You\'d need to offer something a bit more... tangible.'));
      return false;
    },
    'break ?': async (g, c) => {
      if (c.noun === 'candy') return void (await g.say("Break the BREAK! bar? Snap it in half and nobody gets a proper break. Give the whole thing to someone who needs it."));
      if (c.noun === 'cage' || c.noun === 'door') return void (await g.say('The bars are made of solid mutual exclusion. They do not break. They wait.'));
      if (c.noun === 'threada' || c.noun === 'threadb' || c.noun === 'threads') return void (await g.say("They don't even notice. They're very busy waiting."));
      if (!c.noun && !g.flag('adriana_free'))
        return void (await g.say("You yell \"BREAK!\" The threads don't even flinch. That keyword works on loops, not on locks. These two need an actual break. Something you could hand them, maybe."));
      return false;
    },
    'attack|push|pull|shake threada|threadb|threads': async (g, c) => {
      if (g.flag('adriana_free')) return void (await g.say('Leave them be. One is on break and the other is terminated. Both have earned it.'));
      const w = whoFromNoun(g, c.noun);
      await g.approach(g.actor(`thread${w}`)!);
      await g.pose(null, 'reach', 300);
      g.sfx('thud');
      await g.say("They don't even notice. They're very busy waiting.");
    },
    'tap|touch threada|threadb|threads': async (g, c) => {
      if (g.flag('adriana_free')) return false;
      const w = whoFromNoun(g, c.noun);
      await g.approach(g.actor(`thread${w}`)!);
      await threadSay(g, w, 'INTERRUPT IGNORED. INTERRUPTS DISABLED IN CRITICAL REGION.');
    },
    'wake threada|threadb|threads': "They're wide awake. That's the problem.",
    'take|pull|pry|use locks,take|pry|pull threada|threadb|threads': async (g, c) => {
      if (g.flag('adriana_free')) return void (await g.say("You leave the padlocks where they fell. Released locks belong on the floor, where nobody's waiting for them."));
      const w = c.noun === 'threadb' ? 'b' : c.noun === 'threada' ? 'a' : nearestThread(g);
      await g.approach(g.actor(`thread${w}`)!);
      await g.pose(null, 'reach', 400);
      await threadSay(g, w, 'MINE.');
      await g.say(`${tname(w)}'s grip tightens with the quiet intensity of a toddler holding a toy. LOCK ${lockOf(w)} is not going anywhere until it decides to let go.`);
    },
    'unlock|open cage|door,pull|push door,use * cage|door': async (g) => {
      if (g.flag('adriana_free')) return void (await g.say("It's already open."));
      await g.approach('door');
      await g.pose(null, 'reach', 300);
      g.sfx('doorlocked');
      await g.say('The door rattles but holds. It needs LOCK 1 and LOCK 2 released into its hasps, and only a thread holding both can do that. Right now each thread is holding exactly half of a solution.');
    },
    'pry|break|attack cage|door': 'The bars are made of solid mutual exclusion. They do not bend. They do not break. They wait.',
    'enter|go cage': async (g) => {
      if (!g.flag('adriana_free')) return void (await g.say("The cage is locked. And it's already occupied. One at a time, as the floor says."));
      await g.say("You consider stepping into the critical section, then remember everything that just happened in there. You'll pass.");
    },
    'escape,use esckey ?': async (g) => {
      if (!g.has('esckey')) return false;
      await g.say("You press ESC at the threads. Nothing. ESC is for loops. These two aren't spinning; they're blocked. You need to give one of them a reason to let go.");
    },
    'wait': async (g) => {
      if (g.flag('adriana_free')) return false;
      await g.say('You wait. Thread A waits. Thread B waits. Adriana waits, with visibly diminishing patience. Everybody is extremely good at waiting in here. Somebody needs to be good at something else.');
    },
    // ---------------------------------------------------------------- Adriana
    'look adriana': async (g) => {
      if (!adrianaActor(g)) return void (await g.say("Adriana has logged out. Back in the server room, she's probably already explaining to Denis why nobody touches the big red button."));
      if (!g.flag('adriana_free'))
        return void (await g.say("Adriana, your lead architect, stands in the cage in her magenta blazer, arms folded, tapping one foot. She's been in here three hours and has clearly redesigned the cage twice in her head. Her pixels look a little dimmer than yours: the v1 helmet."));
      await g.say("Adriana, free at last, stretching like someone who has been standing in a birdcage for three hours. She has the look of an architect who has a plan and is about to tell you it.");
    },
    'talk|ask adriana ?': async (g, c) => {
      const ad = adrianaActor(g);
      if (!ad) return void (await g.say("Adriana has logged out. You'll see her in the server room, assuming this all works."));
      if (g.flag('adriana_free')) return adrianaGivesPatch(g);
      await g.approach([160, 128]);
      g.player.face('up');
      const topic = c.verb === 'ask' ? c2topic(c.raw) : null;
      if (topic) return void (await g.talk(ad, topic));
      const n = adrianaTalks++;
      if (n === 0) {
        await g.talk(ad, "Dominic! You came in after me. Okay. Brave, slightly reckless, but good.");
        await g.talk(ad, 'These two have been waiting for each other for three hours. Thread A holds Lock 1 and wants Lock 2. Thread B holds Lock 2 and wants Lock 1. Neither will let go first. Classic deadlock.');
        await g.talk(ad, "And I'm the shared resource they were both trying to lock. Flattering, in a way.");
      } else if (n === 1) {
        await g.talk(g.player, "Can't we just kill one of them?");
        await g.talk(ad, "Kill a thread while it's holding a lock and that lock never gets released. This cage stays shut forever, with me in it. No. One of them has to let go on its own.");
        await g.talk(ad, "Honestly? They look exhausted. They've been on call since 1999. If one of them just took a break, the other could finish its work and let me out.");
      } else {
        await g.talk(ad, "One of them needs to take a break. A real one. You don't happen to have anything on you that says BREAK on it, do you?");
      }
    },
    'take|hug|kiss|touch adriana': async (g, c) => {
      const ad = adrianaActor(g);
      if (!ad) return false;
      if (!g.flag('adriana_free')) return void (await g.say("There are bars in the way. Rather a lot of them."));
      if (c.verb === 'hug') return void (await g.talk(ad, "Ha. Okay, one quick hug. Then: work."));
      return false;
    },
    'comfort adriana': async (g) => {
      const ad = adrianaActor(g);
      if (!ad) return false;
      await g.talk(ad, g.flag('adriana_free') ? "I'm fine. Better than fine: I'm unblocked." : "I'm fine. I'm angry, but I'm fine. Mostly I'm bored. Do you know how long three hours is in a birdcage?");
    },
    // ---------------------------------------------------------------- scenery
    'take|eat table': 'The dining philosophers might come back. Unlikely, but you would hate to be the one who took their table.',
    'look fork': 'Five forks for five philosophers, one between each pair of plates. Each philosopher needs two to eat. You can see where this went.',
    'look spaghetti': 'Five plates of spaghetti, untouched since 1965. Every philosopher picked up the fork on their left and waited, forever, for the one on their right.',
    'look chair': 'Five chairs, all empty, all cobwebbed. The philosophers have left the building. Possibly the mortal plane.',
    'take fork': "You reach for a fork, then stop. Taking a fork is exactly how this whole mess started for the philosophers. Better not to get involved.",
    'eat|take spaghetti': 'It has been on that plate since 1965. It has seen things. It is less pasta now and more of a legacy system.',
    'sit chair,sit': 'You could sit at the philosophers\' table, but then you would need two forks to eat, and there are only five forks for five places, and... no. No.',
    'take chains': 'They are bolted to the ceiling. Which ceiling, you are not sure. It is very dark up there.',
    'take computer|timer': 'They are bolted to the wall.',
    'look/through|look/in keyhole': "Past the cage, the keyhole goes back a long way into the dark, glowing faintly blue. Some locks are deeper than they look.",
    'take hourglass': "You try to grab the hourglass. Your hand passes through it. It's a cursor, not a thing.",
    'catch ?': 'There is nothing in here to catch. Everything in here is already stuck.',
    'take|pull|push cage': async (g) => void (await g.say(g.flag('adriana_free') ? "It's anchored into the keyhole. Leave it; it's a historic site now." : "It's anchored into the keyhole of a padlock the size of a house. Also, it's occupied.")),
    'climb cage|wall': "You'd just be a second thing stuck to the cage.",
    'drop|unlock|open adriana,drop locks': async (g) => {
      if (g.flag('adriana_free')) return void (await g.say("She's already out."));
      await g.say("That's the plan. But the cage only opens when LOCK 1 and LOCK 2 are both released, and each one is clutched by a thread that won't let go until it gets the other.");
    },
    'search table': 'Five plates of spaghetti from 1965, five forks, and a candle stub that burned out sometime during the Johnson administration. No clues. No second forks.',
    'listen': async (g) => void (await g.say(g.flag('adriana_free') ? 'Quiet, mostly. Somewhere to your left, a happy little munching sound.' : 'The tick of the wait timer. The faint whine of two cooling fans running flat out. Two robots, straining with all their might to do absolutely nothing.')),
  },
};

/** For "ask adriana about X": topic answers while she's still caged. */
function c2topic(raw: string): string | null {
  const t = raw.toLowerCase();
  if (/bug|heisen|core/.test(t)) return "Something is eating the Core. I'll tell you everything once I'm out of here. First: these two.";
  if (/thread|robot|lock/.test(t)) return 'Each one holds one lock and waits for the other. Neither will go first. One of them needs a reason to let go.';
  if (/denis/.test(t)) return "Denis? He'd tell you never to reboot anything. In fairness, he's been right about that all evening.";
  if (/patch|fix/.test(t)) return "I was writing a fix when they grabbed me. Get me out and it's yours.";
  if (/dragon|cobol/.test(t)) return "The Legacy Dragon. It only speaks COBOL. Funny thing about COBOL documentation: nobody has ever stayed awake through it.";
  if (/cage|door/.test(t)) return 'Two hasps, two locks, two threads, zero cooperation.';
  if (/aidan/.test(t)) return "It's not Aidan's fault. A system that falls over because someone followed the runbook was broken long before he touched it.";
  return null;
}
