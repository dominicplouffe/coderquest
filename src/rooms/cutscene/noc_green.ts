// The NOC at 12:00 AM Saturday, as seen in the ending: the big board goes from
// red, to "deploying", to green one panel at a time. Cutscene only; the ending
// script (content/ending.ts) drives the NOC state object below.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, rng, microWidth } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { keyboard, mug, officeChair } from '../../art/lib';
import { addNpc } from '../../content/helpers';

export type NocPhase = 'red' | 'deploy' | 'green';
/** Scripted state: phase, the tick it started, and how many panels have turned green. */
export const NOC = { phase: 'red' as NocPhase, t0: 0, flips: 0 };
/** Ticks the deploy progress bar takes to fill. */
export const DEPLOY_TICKS = 170;

interface Panel {
  x: number;
  y: number;
  label: string;
  down: string;
  up: string;
}
const PW = 46,
  PH = 28;
const PANELS: Panel[] = [
  { x: 12, y: 16, label: 'MONOLITH', down: 'CORE PANIC', up: 'ONLINE' },
  { x: 60, y: 16, label: 'DOORS', down: 'LOCKED', up: 'OPEN' },
  { x: 214, y: 16, label: 'PAYROLL', down: 'DOWN', up: 'UP' },
  { x: 262, y: 16, label: 'BILLING', down: 'DOWN', up: 'UP' },
  { x: 12, y: 46, label: 'ELEVATORS', down: 'FW 1/4096', up: 'RUNNING' },
  { x: 60, y: 46, label: 'COFFEE', down: '418 TEAPOT', up: 'BREWING' },
  { x: 214, y: 46, label: 'PROD API', down: '503', up: '200 OK' },
  { x: 262, y: 46, label: 'VENDING', down: 'JAMMED', up: 'OK' },
];
const CENTER = { x: 110, y: 16, w: 100, h: 58 };

// little LEDs on the console slope
const LEDS: [number, number, number][] = (() => {
  const r = rng(404);
  const out: [number, number, number][] = [];
  for (let x = 26; x < 294; x += 5) {
    if (x > 118 && x < 200) continue; // keyboards
    if (r() < 0.55) out.push([x, 101 + Math.floor(r() * 3), r() < 0.5 ? 12 : r() < 0.5 ? 14 : 10]);
  }
  return out;
})();

function paint(p: Surface) {
  // ---- the room: dark walls, acoustic panels
  p.gradV(0, 0, 320, 98, [0, 0, 1, 1]);
  for (let x = 0; x < 320; x += 32) p.vline(x, 80, 97, 0);
  p.hline(0, 319, 79, 0);
  // ---- the sign
  const sign = 'RULE #1: NEVER DEPLOY ON A FRIDAY.';
  const sw = microWidth(sign) + 10;
  p.rect(160 - sw / 2, 2, sw, 10, 0);
  p.frame(160 - sw / 2, 2, sw, 10, 4);
  p.micro(160 - sw / 2 + 5, 4, sign, 12);
  // alarm beacons either side of the sign
  for (const bx of [160 - sw / 2 - 9, 160 + sw / 2 + 5]) {
    p.rect(bx, 9, 5, 3, 8);
    p.rect(bx + 1, 5, 3, 4, 4);
  }
  // ---- the video wall
  p.rect(8, 13, 304, 64, 0);
  p.frame(8, 13, 304, 64, 8);
  for (const pn of PANELS) {
    p.rect(pn.x, pn.y, PW, PH, 8);
    p.rect(pn.x + 1, pn.y + 1, PW - 2, PH - 2, 0);
  }
  p.rect(CENTER.x, CENTER.y, CENTER.w, CENTER.h, 8);
  p.rect(CENTER.x + 1, CENTER.y + 1, CENTER.w - 2, CENTER.h - 2, 0);
  // ---- under the wall: a clock (left) and the incident counter (right)
  p.rect(12, 82, 54, 11, 0);
  p.frame(12, 82, 54, 11, 8);
  p.rect(232, 81, 78, 15, 0);
  p.frame(232, 81, 78, 15, 8);
  p.micro(235, 83, 'DAYS SINCE LAST', 7);
  p.micro(235, 89, 'INCIDENT:', 7);
  p.frame(295, 83, 13, 11, 8);
  // ---- floor: old brown carpet, darker toward the wall
  p.rect(0, 98, 320, 92, 6);
  p.gradV(0, 98, 320, 30, [0, 6]);
  p.speckle(0, 112, 320, 78, 0, 0.03, 12);
  // ---- the console
  p.at(121, () => {
    p.poly([24, 98, 296, 98, 301, 106, 19, 106], 8);
    p.hline(24, 295, 98, 7);
    p.rect(18, 106, 284, 14, 0);
    p.hline(18, 301, 106, 7);
    p.hline(18, 301, 119, 8);
    for (let x = 58; x < 300; x += 40) p.vline(x, 108, 118, 8);
    keyboard(p, 124, 101, 24, 0, 7);
    keyboard(p, 172, 101, 24, 0, 7);
    // the 3 AM survival kit: pizza boxes, energy drinks, a mug
    p.rect(34, 96, 22, 3, 6);
    p.hline(34, 55, 96, 14);
    p.rect(36, 93, 19, 3, 6);
    p.hline(36, 54, 93, 14);
    for (const [cx, col] of [
      [64, 3],
      [68, 10],
      [72, 3],
      [252, 13],
      [256, 3],
    ])
      p.rect(cx, 94, 2, 4, col), p.plot(cx, 94, 7);
    mug(p, 228, 93, 15);
    // a red phone
    p.rect(276, 95, 8, 3, 4);
    p.rect(277, 94, 6, 1, 12);
  });
  // Fahim's chair
  officeChair(p, 160, 151, 0, { back: false });
}

function panelScreen(s: Surface, pn: Panel, i: number, t: number) {
  const x = pn.x + 2,
    y = pn.y + 2,
    w = PW - 4,
    h = PH - 4;
  const up = NOC.phase === 'green' && NOC.flips > i;
  if (up) {
    s.rect(x, y, w, h, 0);
    s.micro(x + 2, y + 2, pn.label, 10);
    s.micro(x + 2, y + 9, pn.up, 15);
    // healthy, wiggly graph
    for (let k = 0; k < w - 4; k++) {
      const gy = y + h - 4 - Math.round(2 + 2 * Math.sin((k + t / 4 + i * 9) / 3) + (k % 7 === 0 ? 1 : 0));
      s.vline(x + 2 + k, gy + 1, y + h - 2, 2);
      s.plot(x + 2 + k, gy, 10);
    }
    // check mark beside the status
    s.line(x + w - 9, y + 11, x + w - 7, y + 13, 10);
    s.line(x + w - 7, y + 13, x + w - 3, y + 9, 10);
  } else {
    const on = Math.floor((t + i * 11) / 24) % 2 === 0;
    s.rect(x, y, w, h, on ? 4 : 0);
    s.micro(x + 2, y + 2, pn.label, on ? 15 : 12);
    s.micro(x + 2, y + 9, pn.down, on ? 14 : 12);
    // flatline
    s.hline(x + 2, x + w - 3, y + h - 3, on ? 12 : 4);
    if ((t + i * 7) % 90 < 6) s.vline(x + 8 + ((i * 5) % 20), y + h - 7, y + h - 3, 12);
  }
}

function centerScreen(s: Surface, t: number) {
  const x = CENTER.x + 2,
    y = CENTER.y + 2,
    w = CENTER.w - 4,
    h = CENTER.h - 4,
    cx = x + w / 2;
  const allGreen = NOC.phase === 'green' && NOC.flips > PANELS.length;
  if (NOC.phase === 'red') {
    const on = Math.floor(t / 20) % 2 === 0;
    s.rect(x, y, w, h, on ? 4 : 0);
    s.textC(cx, y + 6, 'SEV-1', on ? 15 : 12, true);
    s.textC(cx, y + 18, 'PRODUCTION DOWN', on ? 14 : 12);
    s.micro(cx - microWidth('MONOLITH: CORE PANIC') / 2, y + 32, 'MONOLITH: CORE PANIC', on ? 15 : 4);
    s.micro(cx - microWidth('ALL SERVICES UNREACHABLE') / 2, y + 40, 'ALL SERVICES UNREACHABLE', on ? 15 : 4);
  } else if (!allGreen) {
    const frac = NOC.phase === 'green' ? 1 : Math.min(1, (t - NOC.t0) / DEPLOY_TICKS);
    s.rect(x, y, w, h, 1);
    s.textC(cx, y + 4, 'DEPLOYING', 11, true);
    s.micro(cx - microWidth('Y2K-FIX  (4-DIGIT YEARS)') / 2, y + 15, 'Y2K-FIX  (4-DIGIT YEARS)', 14);
    s.frame(x + 6, y + 23, w - 12, 7, 15);
    s.rect(x + 7, y + 24, Math.round((w - 14) * frac), 5, 10);
    const pct = `${Math.floor(frac * 100)}%`;
    s.micro(cx - microWidth(pct) / 2, y + 32, pct, 15);
    const logs = ['COMMIT 2000AD', 'REVIEW: LGTM', 'TESTS: 1 OF 1 PASS', 'MONOLITH CORE: OK'];
    const n = Math.min(logs.length, Math.floor(frac * (logs.length + 0.99)));
    logs.slice(Math.max(0, n - 2), n).forEach((ln, k) => s.micro(x + 6, y + 40 + k * 6, '> ' + ln, 11));
    if (Math.floor(t / 15) % 2 === 0) s.rect(x + 6, y + 52, 3, 1, 15);
  } else {
    s.rect(x, y, w, h, 0);
    // a big check mark, glowing
    const gx = x + 12,
      gy = y + 26;
    s.line(gx - 6, gy, gx - 1, gy + 6, 10, 3);
    s.line(gx - 1, gy + 6, gx + 8, gy - 8, 10, 3);
    s.textC(cx + 10, y + 7, 'ALL SYSTEMS', 10, true);
    s.textC(cx + 10, y + 19, 'OPERATIONAL', 10, true);
    const secs = Math.floor((t - NOC.t0) / 60) + 1;
    const up = `UPTIME 00:00:${String(Math.min(59, secs)).padStart(2, '0')}`;
    s.micro(cx + 10 - microWidth(up) / 2, y + 33, up, 15);
    // healthy heartbeat line across the bottom
    for (let k = 0; k < w - 8; k++) {
      const ph = (k + Math.floor(t / 2)) % 32;
      const dy = ph === 10 ? -5 : ph === 11 ? 4 : ph === 12 ? -2 : 0;
      s.plot(x + 4 + k, y + h - 8 + dy, 10);
    }
  }
}

export const nocGreen: RoomDef = {
  id: 'noc_green',
  title: 'Network Operations Center',
  cutscene: true,
  draw: paint,
  walk: [[0, 124, 320, 66]],
  start: [160, 170, 'up'],
  enter(g: Game) {
    g.player.visible = false;
    addNpc(g, 'fahim', 160, 147, 'up', 'type');
    addNpc(g, 'phil', 72, 157, 'up');
    addNpc(g, 'mike', 104, 164, 'up');
    addNpc(g, 'nicholas', 214, 162, 'up');
    addNpc(g, 'krishna', 246, 155, 'up');
    addNpc(g, 'aidan', 278, 165, 'up');
  },
  overlay(_g, s, t) {
    PANELS.forEach((pn, i) => panelScreen(s, pn, i, t));
    centerScreen(s, t);
    const green = NOC.phase === 'green';
    // beacons
    const sw = microWidth('RULE #1: NEVER DEPLOY ON A FRIDAY.') + 10;
    for (const bx of [160 - sw / 2 - 9, 160 + sw / 2 + 5]) {
      const on = Math.floor(t / 10) % 2 === 0;
      s.rect(bx + 1, 5, 3, 4, green ? 10 : on ? 12 : 4);
      if (!green && on) s.plot(bx + 2, 4, 14);
    }
    // the clock
    const clk = green || NOC.phase === 'deploy' ? 'SAT 12:00 AM' : 'FRI 11:59 PM';
    s.micro(39 - microWidth(clk) / 2, 85, clk, Math.floor(t / 30) % 2 ? 12 : 4);
    // the incident counter (it stays at zero: it's a brand new day)
    s.rect(296, 84, 11, 9, 0);
    s.text(299, 85, '0', green ? 10 : 12);
    // the glow of the board on the console top and the carpet
    const glow = green ? 2 : 4;
    s.hline(24, 295, 99, dith(8, glow, 6));
    s.hline(22, 297, 103, dith(8, glow, 4));
    s.hline(18, 301, 121, dith(6, glow, 5));
    s.hline(18, 301, 122, dith(6, glow, 3));
    for (const [lx, ly, c] of LEDS) s.plot(lx, ly, ((t / 9 + lx) | 0) % 4 ? (green ? 10 : c) : 0);
  },
};
