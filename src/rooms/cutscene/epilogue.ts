// Curtain call: a little stage where each character steps into the spotlight
// for their "where are they now" epilogue card. Cutscene only.
import type { RoomDef } from '../../engine/types';
import { Surface, rng } from '../../engine/raster';
import { dith } from '../../engine/palette';

/** Who is in the spotlight (cast id), set by the ending script. */
export const EPI = { who: '' };
export const STAGE_X = 160;
export const STAGE_Y = 120;

function paint(p: Surface) {
  p.clear(0);
  // a few stars painted on the backdrop
  const r = rng(1999);
  for (let i = 0; i < 60; i++) p.plot(44 + Math.floor(r() * 232), 20 + Math.floor(r() * 90), r() < 0.25 ? 15 : r() < 0.5 ? 7 : 8);
  // the spotlight beam
  p.poly([STAGE_X - 9, 14, STAGE_X + 9, 14, STAGE_X + 34, STAGE_Y, STAGE_X - 34, STAGE_Y], dith(0, 8, 3));
  p.poly([STAGE_X - 5, 14, STAGE_X + 5, 14, STAGE_X + 20, STAGE_Y, STAGE_X - 20, STAGE_Y], dith(0, 8, 5));
  // stage floor: planks
  p.rect(0, STAGE_Y - 4, 320, 74, 6);
  p.gradV(0, STAGE_Y - 4, 320, 10, [0, 6]);
  for (let y = STAGE_Y + 2; y < 182; y += 7) p.hline(0, 319, y, dith(6, 0, 10));
  for (let i = 0; i < 26; i++) {
    const y = STAGE_Y + 2 + 7 * (i % 9);
    const x = Math.floor(r() * 300);
    p.vline(x, y + 1, y + 6, 0);
  }
  // the pool of light on the boards
  p.ellipse(STAGE_X, STAGE_Y + 1, 34, 7, dith(6, 7, 8));
  p.ellipse(STAGE_X, STAGE_Y + 1, 24, 5, dith(7, 15, 5));
  // stage lip and footlights
  p.rect(0, 182, 320, 8, 8);
  p.hline(0, 319, 182, 7);
  for (let x = 20; x < 320; x += 40) {
    p.rect(x - 3, 183, 7, 3, 0);
    p.plot(x, 183, 14);
  }
  // curtains: red velvet drapes with gold tie-backs, and a valance with fringe
  const drape = (x0: number, x1: number) => {
    for (let x = x0; x < x1; x++) {
      const k = (x - x0) % 8;
      p.vline(x, 0, 181, k < 1 ? 0 : k < 3 ? 4 : k < 6 ? 12 : 4);
    }
  };
  drape(0, 44);
  drape(276, 320);
  p.rect(36, 96, 8, 4, 14);
  p.rect(276, 96, 8, 4, 14);
  for (let x = 0; x < 320; x++) {
    const k = x % 10;
    p.vline(x, 0, 12, k < 1 ? 0 : k < 4 ? 4 : 12);
  }
  for (let x = 0; x < 320; x += 2) p.vline(x, 13, 14 + (x % 4 === 0 ? 2 : 0), 14);
  p.hline(0, 319, 12, 6);
  // the banner
  const t = 'WHERE ARE THEY NOW?';
  p.text(161 - 54, 25, t, 6, true);
  p.text(160 - 54, 24, t, 14, true);
}

/** Each character's signature prop, held at their side. */
function prop(s: Surface, who: string, t: number) {
  const x = STAGE_X + 7,
    y = STAGE_Y - 19;
  switch (who) {
    case 'dominic': // the rubber duck
      s.ellipse(x + 3, y + 3, 3, 2, 14);
      s.rect(x + 4, y - 1, 3, 3, 14);
      s.plot(x + 7, y, 6);
      s.plot(x + 5, y, 0);
      break;
    case 'aidan': // the new runbook
      s.rect(x, y - 3, 7, 9, 4);
      s.rect(x + 1, y - 1, 5, 2, 15);
      s.vline(x, y - 3, y + 5, 12);
      break;
    case 'nicholas': // a rainbow keyboard
      s.rect(x - 1, y + 1, 13, 4, 8);
      for (let k = 0; k < 12; k += 2) s.plot(x + k, y + 2, [12, 14, 10, 11, 9, 13][((k >> 1) + Math.floor(t / 8)) % 6]);
      break;
    case 'mike': // Salesperson of the Year, again
      s.rect(x, y - 4, 7, 4, 14);
      s.plot(x - 1, y - 3, 14);
      s.plot(x + 7, y - 3, 14);
      s.rect(x + 3, y, 1, 3, 14);
      s.rect(x + 1, y + 3, 5, 2, 6);
      if (Math.floor(t / 20) % 3 === 0) s.plot(x + 2, y - 3, 15);
      break;
    case 'fahim': // I SURVIVED THE FRIDAY DEPLOY mug, steaming
      s.rect(x, y, 5, 6, 15);
      s.plot(x + 5, y + 1, 15);
      s.plot(x + 6, y + 2, 15);
      s.plot(x + 5, y + 3, 15);
      s.plot(x + 2, y + 2, 4);
      s.plot(x + 1 + (Math.floor(t / 15) % 2), y - 2, 7);
      s.plot(x + 2, y - 4 + (Math.floor(t / 15) % 2), 7);
      break;
    case 'phil': // a putter and a ball
      s.line(x + 1, y - 4, x + 4, y + 18, 7);
      s.rect(x + 3, y + 18, 4, 1, 8);
      s.circle(x + 10, y + 18, 1, 15);
      break;
    case 'krishna': // NDI helmet v3, with a much bigger LOG OUT button
      s.ellipse(x + 4, y + 2, 5, 4, 7);
      s.hline(x - 1, x + 9, y + 5, 8);
      s.plot(x + 1, y + 1, 11);
      s.plot(x + 4, y - 1, Math.floor(t / 12) % 2 ? 10 : 2);
      s.plot(x + 7, y + 1, 11);
      s.rect(x + 3, y + 3, 3, 2, 12);
      break;
    case 'denis': // a beach umbrella and sunglasses
      s.vline(x + 10, y - 16, y + 19, 7);
      for (let k = -8; k <= 8; k++) {
        const top = y - 16 + Math.round((k * k) / 12);
        s.vline(x + 10 + k, top, y - 12, (k + 8) % 6 < 3 ? 12 : 15);
      }
      break;
    case 'adriana': // her laptop, all tests green
      s.rect(x, y, 10, 7, 8);
      s.rect(x + 1, y + 1, 8, 5, 0);
      for (let k = 0; k < 3; k++) s.hline(x + 2, x + 3 + ((k * 3) % 5), y + 2 + k, 10);
      s.rect(x - 1, y + 7, 12, 1, 7);
      break;
  }
}

export const epilogue: RoomDef = {
  id: 'epilogue',
  title: 'Curtain Call',
  cutscene: true,
  draw: paint,
  walk: [[0, STAGE_Y - 6, 320, 60]],
  start: [STAGE_X, STAGE_Y, 'down'],
  enter(g) {
    g.player.visible = false;
  },
  front(g, s, t) {
    const a = EPI.who === 'dominic' ? g.player : g.actor(EPI.who);
    if (a && a.visible) prop(s, EPI.who, t);
  },
};
