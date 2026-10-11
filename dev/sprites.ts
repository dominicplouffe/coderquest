import { Surface } from '../src/engine/raster';
import { RGBA32 } from '../src/engine/palette';
import { person, LOOKS } from '../src/art/cast';

const s = new Surface(320, 200);
s.clear(7);
s.rect(0, 100, 320, 100, 3);
const ids = Object.keys(LOOKS);
let x = 12;
const anims = ['stand_down', 'walk_down', 'stand_up', 'walk_right', 'walk_left', 'sit_down', 'type_up', 'cheer_down', 'reach_right'];
let row = 0;
for (const id of ids) {
  const set = person(id);
  const col = row % 5;
  const yrow = Math.floor(row / 5);
  let xx = 4 + col * 64;
  const yy = 45 + yrow * 50;
  s.blit(set.stand_down.frames[0], xx + 8, yy);
  s.blit(set.walk_right.frames[0], xx + 26, yy);
  s.blit(set.walk_right.frames[1], xx + 42, yy);
  s.blit(set.stand_up.frames[0], xx + 58, yy);
  row++;
}
// font test
s.text(4, 150, "Coder's Quest: The Friday Deploy! 0123456789", 0);
s.text(4, 161, 'The quick brown fox jumps over the lazy dog. gjpqy', 15);
s.text(4, 172, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ?!.,;:"()[]{}<>/\\@#$%&*+=-_~', 14);
s.micro(4, 184, 'MONOLITH SYSTEMS INC. EST 1987', 0);
// walk cycle for dominic big
const d = person('dominic');
let wx = 200;
for (const f of d.walk_right.frames) { s.blit(f, wx, 145); wx += 18; }
const cv = document.getElementById('c') as HTMLCanvasElement;
const ctx = cv.getContext('2d')!;
const im = ctx.createImageData(320, 200);
const u32 = new Uint32Array(im.data.buffer);
for (let i = 0; i < s.px.length; i++) u32[i] = RGBA32[s.px[i]];
ctx.putImageData(im, 0, 0);
(window as any).ready = true;
