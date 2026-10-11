// Monolith Systems HQ, exterior. Used in the intro (dusk) and ending (dawn).
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, rng } from '../../engine/raster';
import { dith } from '../../engine/palette';

function paint(p: Surface, g: Game) {
  const time: 'dusk' | 'dawn' | 'night' = g.flag('ext_time') ?? 'dusk';
  const sky = time === 'dawn' ? [1, 9, 11, 13, 12, 14] : time === 'night' ? [0, 0, 1, 1, 5] : [1, 5, 13, 12, 14, 14];
  p.gradV(0, 0, 320, 120, sky);
  const r = rng(77);
  if (time !== 'dawn') for (let i = 0; i < 70; i++) p.plot(Math.floor(r() * 320), Math.floor(r() * 50), r() < 0.3 ? 15 : 7);
  // sun / moon
  if (time === 'night') {
    p.circle(260, 26, 9, 15);
    p.circle(264, 23, 8, dith(15, 7, 3));
  } else {
    p.glow(250, 104, 30, 14, -1, 20);
    p.ellipse(250, 104, 16, 12, 14);
    p.ellipse(250, 104, 12, 9, 15);
  }
  // distant hills & city
  p.poly([0, 112, 40, 100, 90, 106, 150, 96, 210, 104, 270, 98, 320, 106, 320, 124, 0, 124], 5);
  let bx = 0;
  while (bx < 320) {
    const bw = 8 + Math.floor(r() * 14),
      bh = 8 + Math.floor(r() * 22);
    p.rect(bx, 120 - bh, bw, bh, time === 'dawn' ? 1 : 0);
    for (let wy = 120 - bh + 2; wy < 118; wy += 3)
      for (let wx = bx + 1; wx < bx + bw - 1; wx += 2) if (r() < 0.15) p.plot(wx, wy, 14);
    bx += bw + 1 + Math.floor(r() * 4);
  }
  // ground
  p.rect(0, 120, 320, 70, dith(2, 0, 6));
  p.gradV(0, 120, 320, 70, [0, 2, 2]);
  // road
  p.poly([0, 168, 320, 158, 320, 190, 0, 190], 8);
  p.rect(0, 166, 320, 1, 7);
  for (let x = 4; x < 320; x += 24) p.rect(x, 176 - Math.round(x * 0.03), 12, 1, 14);
  // the HQ: a slab of 1980s corporate concrete & glass
  const hx = 90,
    hy = 32,
    hw = 140,
    hh = 108;
  p.rect(hx - 6, hy + hh - 4, hw + 12, 8, 7);
  p.rect(hx, hy, hw, hh, dith(8, 7, 6));
  p.rect(hx, hy, 6, hh, 7);
  p.rect(hx + hw - 6, hy, 6, hh, 0);
  // 5 floors of windows
  for (let f = 0; f < 5; f++) {
    const fy = hy + 8 + f * 18;
    p.rect(hx + 10, fy, hw - 20, 11, 1);
    for (let wx = hx + 10; wx < hx + hw - 10; wx += 10) {
      p.vline(wx, fy, fy + 10, 8);
      const lit = (wx * 13 + f * 7) % 5 === 0 || (f === 2 && wx === hx + 50);
      if (lit) p.rect(wx + 1, fy + 1, 9, 9, f === 2 && wx === hx + 50 ? 14 : dith(14, 1, 10));
    }
    // reflections of the sky
    if (time !== 'night') for (let k = 0; k < 6; k++) p.line(hx + 14 + k * 18, fy + 9, hx + 20 + k * 18, fy + 1, dith(1, 13, 6));
  }
  // entrance
  p.rect(hx + 50, hy + hh - 20, 40, 20, 0);
  p.rect(hx + 52, hy + hh - 18, 17, 18, 3);
  p.rect(hx + 71, hy + hh - 18, 17, 18, 3);
  p.rect(hx + 44, hy + hh - 24, 52, 4, 7);
  // sign on top
  p.rect(hx + 20, hy - 10, hw - 40, 10, 0);
  p.micro(hx + 26, hy - 8, 'MONOLITH SYSTEMS', 11);
  p.vline(hx + 70, hy - 24, hy - 10, 7);
  p.plot(hx + 70, hy - 25, 12);
  // monument sign
  p.rect(30, 140, 50, 16, 7);
  p.rect(32, 142, 46, 12, 8);
  p.micro(35, 144, 'MONOLITH', 15);
  p.micro(35, 150, 'EST. 1987', 14);
  // trees
  for (const [tx, ty] of [
    [14, 150],
    [262, 146],
    [296, 152],
  ]) {
    p.rect(tx - 1, ty - 12, 3, 12, 6);
    p.ellipse(tx, ty - 18, 10, 9, 2);
    p.ellipse(tx - 3, ty - 21, 6, 5, 10);
  }
  // parked cars
  const car = (x: number, y: number, col: number) => {
    p.rect(x, y - 6, 26, 6, col);
    p.poly([x + 5, y - 6, x + 8, y - 11, x + 18, y - 11, x + 22, y - 6], col);
    p.rect(x + 8, y - 10, 5, 3, 11);
    p.rect(x + 14, y - 10, 5, 3, 11);
    p.circle(x + 6, y, 2, 0);
    p.circle(x + 20, y, 2, 0);
  };
  car(240, 160, 4);
  car(190, 162, 9);
  if (time === 'dawn') car(130, 162, 14);
}

export const exterior: RoomDef = {
  id: 'exterior',
  title: 'Monolith Systems HQ',
  cutscene: true,
  music: null,
  draw: paint,
  walk: [[0, 150, 320, 40]],
  start: [160, 180],
  enter(g) {
    g.player.visible = false;
  },
};
