// The 5th-floor conference room, Monday 9:00 AM: the investor demo from the
// ending. Cutscene only; content/ending.ts stages the people and changes the
// slides via the CONF state object.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, microWidth, rng } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { ceiling, fluorescent, clock, baseboard, mug } from '../../art/lib';
import { bigText } from '../../content/title';
import { addNpc } from '../../content/helpers';
import { investor } from '../../art/ending_cast';

export type Slide = 'title' | 'live' | 'go' | 'roadmap' | 'thanks';
export const CONF = { slide: 'title' as Slide, t0: 0 };

/** Seat x positions along the far side of the table; seated feet are at SEAT_Y. */
export const SEATS = { henderson: 160, whitfield: 179, dominic: 198, adriana: 217, krishna: 236, nicholas: 255, fahim: 274 };
export const SEAT_Y = 126;
/** Where the standing people are. */
export const SPOTS = { denis: [14, 118], mike: [100, 137], phil: [128, 131], aidan: [308, 123] } as const;

const SCR = { x: 24, y: 18, w: 100, h: 52 };

/** A window onto a bright Monday morning: blue sky, clouds, a sunlit city. */
function dayWindow(p: Surface, x: number, y: number, w: number, h: number) {
  p.clip(x, y, x + w, y + h);
  p.gradV(x, y, w, h, [9, 9, 11, 11, 15]);
  for (const [cx, cy, rx] of [
    [x + 22, y + 9, 9],
    [x + 31, y + 8, 6],
    [x + 88, y + 14, 11],
    [x + 99, y + 12, 6],
  ])
    p.ellipse(cx, cy, rx, 3, 15);
  const r = rng(61);
  for (const layer of [0, 1]) {
    let bx = x - Math.floor(r() * 8);
    while (bx < x + w) {
      const bw = 7 + Math.floor(r() * 14);
      const bh = Math.floor(h * (layer ? 0.18 + r() * 0.25 : 0.3 + r() * 0.4));
      const top = y + h - bh;
      p.rect(bx, top, bw, bh, layer ? 8 : 7);
      p.vline(bx, top, y + h - 1, layer ? 7 : 15);
      for (let wy = top + 2; wy < y + h - 1; wy += 3)
        for (let wx = bx + 2; wx < bx + bw - 1; wx += 2) if (r() < 0.5) p.plot(wx, wy, layer ? 7 : 9);
      bx += bw + 1 + Math.floor(r() * 3);
    }
  }
  p.clip();
  p.frame(x - 1, y - 1, w + 2, h + 2, 15);
  p.frame(x - 2, y - 2, w + 4, h + 4, 8);
  for (let i = 1; i < 3; i++) p.vline(x + Math.round((w * i) / 3), y, y + h - 1, 15);
  for (let yy = y; yy < y + Math.floor(h * 0.3); yy += 2) p.hline(x, x + w - 1, yy, 7);
  p.hline(x, x + w - 1, y + Math.floor(h * 0.3), 8);
  p.rect(x - 3, y + h + 2, w + 6, 2, 15);
  p.hline(x - 3, x + w + 2, y + h + 4, 8);
}

function chairBack(p: Surface, x: number) {
  p.rect(x - 6, 93, 13, 21, 0);
  p.rect(x - 5, 94, 11, 18, dith(0, 8, 3));
  p.hline(x - 5, x + 5, 93, 8);
}

function paint(p: Surface) {
  // ---- ceiling with lights
  ceiling(p, 0, 9, 7);
  fluorescent(p, 74, 3, 44);
  fluorescent(p, 160, 3, 44);
  fluorescent(p, 246, 3, 44);
  // ---- walls: light gray above a wood wainscot
  p.rect(0, 9, 320, 75, 7);
  p.hline(0, 319, 9, 8);
  p.rect(0, 84, 320, 16, 6);
  p.hline(0, 319, 83, 8);
  p.hline(0, 319, 84, dith(6, 14, 4));
  for (let x = 10; x < 320; x += 22) p.vline(x, 86, 98, dith(6, 0, 8));
  // ---- the big screen
  p.rect(SCR.x - 6, SCR.y - 6, SCR.w + 12, SCR.h + 12, 8);
  p.rect(SCR.x - 4, SCR.y - 4, SCR.w + 8, SCR.h + 8, 0);
  p.rect(SCR.x + SCR.w / 2 - 6, SCR.y + SCR.h + 6, 12, 2, 8);
  p.plot(SCR.x + SCR.w + 1, SCR.y + SCR.h + 1, 10);
  // ---- the clock, says 9:00, and the company plaque
  clock(p, 154, 26, 8, 9, 0);
  p.rect(137, 42, 35, 30, 6);
  p.frame(137, 42, 35, 30, 14);
  p.rect(150, 46, 9, 16, 0);
  p.vline(150, 46, 61, 8);
  p.plot(152, 49, 10);
  p.plot(155, 52, 12);
  p.plot(152, 55, 11);
  p.micro(155 - microWidth('EST.1987') / 2, 64, 'EST.1987', 14);
  // ---- windows onto a bright Monday morning
  dayWindow(p, 184, 16, 124, 54);
  // ---- floor: blue boardroom carpet
  p.rect(0, 100, 320, 90, 1);
  p.gradV(0, 100, 320, 12, [0, 1]);
  p.speckle(0, 108, 320, 82, 9, 0.005, 7);
  p.speckle(0, 108, 320, 82, 0, 0.012, 8);
  baseboard(p, 101, 8);
  // ---- executive chairs behind the far side of the table
  for (const x of Object.values(SEATS)) chairBack(p, x);
  // ---- the long table (actors seated behind it are hidden below the tabletop)
  p.at(135, () => {
    p.poly([146, 114, 296, 114, 304, 128, 138, 128], 6);
    p.hline(147, 295, 114, dith(6, 7, 8));
    p.hline(150, 292, 116, dith(6, 0, 3));
    p.rect(138, 128, 167, 2, 0);
    p.rect(140, 130, 163, 5, dith(6, 0, 6));
    p.hline(140, 302, 134, 0);
    // laptops (lids toward us) and paper in front of the seats
    for (const x of [SEATS.dominic, SEATS.adriana, SEATS.nicholas]) {
      p.rect(x - 4, 116, 9, 5, 8);
      p.hline(x - 4, x + 4, 116, 7);
      p.plot(x, 118, 15);
      p.rect(x - 5, 121, 11, 1, 7);
    }
    for (const x of [SEATS.henderson, SEATS.whitfield]) {
      p.rect(x - 9, 120, 6, 4, 15);
      p.hline(x - 8, x - 5, 121, 8);
    }
    // water glasses and coffee
    for (const x of [SEATS.henderson, SEATS.whitfield, SEATS.krishna, SEATS.fahim]) p.rect(x + 6, 117, 2, 3, 11);
    mug(p, SEATS.krishna - 4, 117, 15);
    mug(p, SEATS.fahim - 4, 117, 4);
    // the speakerphone
    p.poly([262, 122, 270, 122, 266, 119], 0);
    p.plot(266, 121, 10);
    // a box of donuts (Mike brought donuts)
    p.rect(146, 117, 13, 5, 14);
    p.hline(146, 158, 117, 15);
    for (const [dx, c] of [
      [148, 13],
      [151, 6],
      [154, 13],
      [157, 12],
    ])
      p.plot(dx, 119, c);
  });
}

function slide(s: Surface, t: number) {
  const { x, y, w, h } = SCR;
  const cx = x + w / 2;
  switch (CONF.slide) {
    case 'title': {
      s.gradV(x, y, w, h, [1, 1, 9]);
      s.rect(x + 8, y + 10, 10, 26, 0);
      s.vline(x + 8, y + 10, y + 35, 8);
      s.plot(x + 11, y + 14, 10);
      s.plot(x + 14, y + 19, 12);
      s.plot(x + 11, y + 24, 11);
      s.text(x + 26, y + 10, 'MONOLITH', 15, true);
      s.text(x + 26, y + 21, 'SYSTEMS', 15, true);
      s.micro(x + 26, y + 33, 'Q3 INVESTOR DEMO', 14);
      s.micro(x + 8, y + 44, 'MONDAY 9:00 AM', 11);
      break;
    }
    case 'live': {
      s.rect(x, y, w, h, 0);
      const blink = Math.floor(t / 20) % 2 === 0;
      s.micro(x + 4, y + 3, 'PRODUCTION', 15);
      s.circle(x + w - 22, y + 5, 2, blink ? 12 : 4);
      s.micro(x + w - 17, y + 3, 'LIVE', 12);
      const rows = ['MONOLITH CORE', 'DATE ROUTINE', 'DOORS', 'COFFEE'];
      rows.forEach((r, i) => {
        s.micro(x + 4, y + 12 + i * 7, r, 7);
        s.micro(x + w - 18, y + 12 + i * 7, 'OK', 10);
        s.plot(x + w - 22, y + 14 + i * 7, 10);
      });
      for (let k = 0; k < w - 8; k++) {
        const v = Math.round(3 * Math.sin((k + t / 3) / 4));
        s.plot(x + 4 + k, y + h - 8 + v, 10);
      }
      break;
    }
    case 'go': {
      s.rect(x, y, w, h, 0);
      s.textC(cx, y + 4, 'ALL SYSTEMS', 10, true);
      bigText(s, cx, y + 16, 'GO', 3, 10, 2, 0, 15, t, 2);
      for (const ox of [x + 10, x + w - 18]) {
        s.line(ox, y + 27, ox + 3, y + 30, 10, 2);
        s.line(ox + 3, y + 30, ox + 8, y + 22, 10, 2);
      }
      const ft = 'Y2K-SAFE SINCE SAT 12:00 AM';
      s.micro(cx - microWidth(ft) / 2, y + h - 8, ft, 2);
      break;
    }
    case 'roadmap': {
      s.rect(x, y, w, h, 15);
      s.rect(x, y, w, 9, 4);
      s.micro(x + 4, y + 2, "Q4 ROADMAP (MIKE'S DRAFT)", 15);
      const items = ['AI-POWERED', 'ON THE BLOCKCHAIN', 'IN THE CLOUD', 'IN SPACE'];
      items.forEach((it, i) => {
        const yy = y + 13 + i * 9;
        s.rect(x + 5, yy + 1, 2, 2, i === 3 ? 4 : 1);
        s.micro(x + 10, yy, it, i === 3 ? 4 : 0);
      });
      // a little rocket, launching
      const ry = y + 26 - (Math.floor(t / 8) % 3);
      s.poly([x + 84, ry, x + 88, ry + 6, x + 80, ry + 6], 7);
      s.rect(x + 81, ry + 6, 7, 10, 7);
      s.plot(x + 84, ry + 9, 9);
      s.poly([x + 81, ry + 12, x + 78, ry + 17, x + 81, ry + 16], 4);
      s.poly([x + 87, ry + 12, x + 90, ry + 17, x + 87, ry + 16], 4);
      s.rect(x + 83, ry + 16, 3, 2 + (Math.floor(t / 4) % 3), Math.floor(t / 4) % 2 ? 14 : 12);
      break;
    }
    case 'thanks': {
      s.gradV(x, y, w, h, [1, 5, 13]);
      s.textC(cx, y + 9, 'THANK YOU,', 15, true);
      s.textC(cx, y + 21, 'TEAM MONOLITH', 14, true);
      for (let i = 0; i < 14; i++) {
        const px = x + ((i * 37 + Math.floor(t / 3) * (i % 3 + 1)) % w);
        const py = y + 34 + ((i * 13 + Math.floor(t / 5)) % 16);
        s.plot(px, py, [14, 10, 11, 12, 15][i % 5]);
      }
      break;
    }
  }
}

export const conference: RoomDef = {
  id: 'conference',
  title: 'Conference Room',
  cutscene: true,
  draw: paint,
  walk: [[0, 136, 320, 54]],
  start: [SEATS.dominic, SEAT_Y, 'down'],
  enter(g: Game) {
    // Dominic is at the table with everyone else
    g.player.place(SEATS.dominic, SEAT_Y, 'down');
    g.player.pose = 'sit';
    g.add(investor('henderson', SEATS.henderson, SEAT_Y, 'left', 'sit'));
    g.add(investor('whitfield', SEATS.whitfield, SEAT_Y, 'left', 'sit'));
    for (const id of ['adriana', 'krishna', 'nicholas', 'fahim'] as const) addNpc(g, id, SEATS[id], SEAT_Y, 'down', 'sit');
    addNpc(g, 'denis', SPOTS.denis[0], SPOTS.denis[1], 'right');
    addNpc(g, 'mike', SPOTS.mike[0], SPOTS.mike[1], 'right');
    addNpc(g, 'phil', SPOTS.phil[0], SPOTS.phil[1], 'right');
    addNpc(g, 'aidan', SPOTS.aidan[0], SPOTS.aidan[1], 'left');
  },
  overlay(_g, s, t) {
    slide(s, t);
  },
};
