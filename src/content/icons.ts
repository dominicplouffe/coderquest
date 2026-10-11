import { Surface, Img, TRANSPARENT } from '../engine/raster';

let tomb: Img | null = null;
/** A little tombstone for the death dialog. */
export function deathIcon(): Img {
  if (tomb) return tomb;
  const s = new Surface(28, 30);
  s.px.fill(TRANSPARENT);
  s.writePri = false;
  s.ellipse(14, 10, 10, 9, 7);
  s.rect(4, 10, 21, 16, 7);
  s.rect(6, 10, 17, 16, 8);
  s.ellipse(14, 10, 8, 7, 8);
  s.micro(8, 7, 'RIP', 15);
  s.micro(7, 14, 'DOM', 7);
  s.rect(1, 26, 27, 3, 2);
  s.hline(0, 27, 28, 10);
  tomb = { w: 28, h: 30, data: s.px, ox: 0, oy: 0 };
  return tomb;
}
