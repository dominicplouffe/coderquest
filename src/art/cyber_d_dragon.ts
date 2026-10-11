// The Legacy Dragon: a colossal wyrm coiled before a castle of COBOL.
// Punch-card scales, a belly of green-bar printout, wings of magnetic tape,
// reading glasses. Painted into the room background (two head poses); the
// room animates the eye, smoke, breathing and snoring on top.

import { Surface, rng } from '../engine/raster';
import { dith } from '../engine/palette';

// mask values
const BODY = 1;
const BELLY = 2;
const WING = 3;
const HORN = 4;
const HEAD = 5;
const JAW = 6;

export interface DragonInfo {
  /** mask of dragon pixels (1 = dragon) for the breathing effect */
  mask: Uint8Array;
  /** eye center */
  eye: [number, number];
  /** nostril */
  nose: [number, number];
  /** mouth (fire comes out here) */
  mouth: [number, number];
}

function disc(m: Surface, x: number, y: number, r: number, v: number) {
  m.ellipse(Math.round(x), Math.round(y), Math.max(1, Math.round(r)), Math.max(1, Math.round(r)), v);
}

/** A tube along a cubic (4 pts) or quadratic (3 pts) Bezier, radius r0 -> r1. */
function tube(m: Surface, pts: [number, number][], r0: number, r1: number, v: number) {
  const n = 70;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let x: number, y: number;
    if (pts.length === 3) {
      const [a, b, c] = pts;
      x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0];
      y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1];
    } else {
      const [a, b, c, d] = pts;
      const u = 1 - t;
      x = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0];
      y = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1];
    }
    disc(m, x, y, r0 + (r1 - r0) * t, v);
  }
}

/** The head silhouette, relative to an origin (ox, oy) = skull center. Facing right. */
const HS = 1.25; // head scale
const WRIST: [number, number] = [96, 38];
const ELBOW: [number, number] = [110, 84];
const FINGERS: [number, number][] = [
  [16, 52],
  [14, 90],
  [30, 112],
];

function headMask(m: Surface, ox: number, oy: number, open: boolean) {
  const P = (pts: number[]) => pts.map((v, i) => Math.round(v * HS) + (i % 2 ? oy : ox));
  // skull
  m.ellipse(ox, oy, Math.round(12 * HS), Math.round(10 * HS), HEAD);
  // snout, with the nostril bump at the tip
  m.poly(P([2, -9, 22, -6, 31, -4, 35, -1, 36, 4, 33, 8, 26, 9, 4, 10]), HEAD);
  // lower jaw (dropped open a little when awake)
  const d = open ? 3 : 0;
  m.poly(P([-6, 8, 30, 9 + d, 29, 13 + d, 14, 17 + d, -4, 14]), JAW);
  // cheek frill
  m.poly(P([-10, 2, -17, 8, -11, 7, -15, 13, -8, 11, -9, 4]), HEAD);
  // horns, curving back over the neck
  const S = (x: number, y: number): [number, number] => [ox + x * HS, oy + y * HS];
  tube(m, [S(-2, -7), S(-10, -16), S(-22, -16), S(-30, -10)], 3.2, 0.6, HORN);
  tube(m, [S(4, -9), S(0, -22), S(-12, -26), S(-18, -22)], 3, 0.6, HORN);
}

function headDetails(p: Surface, ox: number, oy: number, open: boolean, asleep: boolean) {
  const X = (v: number) => ox + Math.round(v * HS);
  const Y = (v: number) => oy + Math.round(v * HS);
  const d = open ? 3 : 0;
  // forehead plate: one big punch card
  p.poly([X(-6), Y(-9), X(9), Y(-8), X(10), Y(-3), X(-5), Y(-4)], 15);
  p.lines([X(-6), Y(-9), X(9), Y(-8), X(10), Y(-3), X(-5), Y(-4), X(-6), Y(-9)], 7);
  for (let k = 0; k < 5; k++) p.plot(X(-3 + k * 3), Y(-7 + (k % 2)), 0);
  p.plot(X(-5), Y(-8), 0);
  // heavy, grumpy brow ridge (sleepy: relaxed)
  if (!asleep) {
    p.line(X(-2), Y(-3), X(14), Y(0), 0, 2);
    p.line(X(-2), Y(-4), X(13), Y(-1), 15);
  } else {
    p.line(X(-2), Y(-2), X(14), Y(-1), 8);
  }
  // eye socket (the overlay paints the eye itself)
  if (!asleep) p.ellipse(X(8), Y(2), 5, 3, 0);
  else {
    p.line(X(4), Y(2), X(12), Y(3), 0);
    p.plot(X(6), Y(4), 0);
    p.plot(X(9), Y(4), 0);
  }
  // nostril
  p.rect(X(31), Y(-2), 3, 2, 0);
  p.plot(X(30), Y(-3), 8);
  // the mouth: dark gap, red inside, teeth
  if (open) {
    p.poly([X(4), Y(10), X(31), Y(8), X(29), Y(10 + d), X(6), Y(11 + d)], 4);
    p.line(X(6), Y(11), X(29), Y(9), 12);
    for (let x = 8; x < 30; x += 4) {
      p.plot(X(x), Y(10 - Math.floor(x / 14)), 15);
      p.plot(X(x + 1), Y(10 - Math.floor(x / 14)), 15);
      p.plot(X(x), Y(11 - Math.floor(x / 14)), 15);
    }
    for (let x = 10; x < 28; x += 5) p.plot(X(x), Y(11 + d), 15);
    // fang
    p.line(X(26), Y(8), X(26), Y(12), 15);
  } else {
    p.line(X(2), Y(10), X(32), Y(8), 0);
    for (let x = 8; x < 30; x += 6) p.plot(X(x), Y(10), 15);
  }
  // reading glasses perched on the snout (slid to the tip when asleep)
  const gx = asleep ? 26 : 20,
    gy = asleep ? 2 : 0;
  p.ellipse(X(gx), Y(gy), 5, 3, dith(11, 1, 6));
  p.ellipseO(X(gx), Y(gy), 5, 3, 0);
  p.hline(X(gx) - 4, X(gx) + 4, Y(gy) - 3, 8);
  p.plot(X(gx - 1), Y(gy - 1), 15);
  p.line(X(gx - 4), Y(gy - 1), X(12), Y(-2), 8);
  // printout beard under the chin
  for (let k = 0; k < 4; k++) {
    const bx = X(2 + k * 4);
    const len = asleep ? 2 : 6 + (k % 2) * 3;
    for (let yy = 0; yy < len; yy++) p.plot(bx + (yy > 5 ? 1 : 0), Y(15 + d) + yy, yy % 3 === 0 ? 10 : 15);
  }
}

/**
 * Paint the dragon. asleep = head lowered to the ground, eyes shut.
 * Returns geometry for the animation overlay.
 */
export function paintDragon(p: Surface, asleep: boolean): DragonInfo {
  const m = new Surface(320, 190);
  m.writePri = false;
  const r = rng(1987);
  const H: [number, number] = asleep ? [160, 147] : [160, 80];

  // ---------------------------------------------------------------- the silhouette mask
  // a half-spread bat wing behind the body: arm up to the wrist, three
  // fingers fanning back, scalloped tape membrane strung between them
  {
    const arc = (x0: number, y0: number, x1: number, y1: number, bulge: number) => {
      const out: number[] = [];
      for (let k = 1; k < 6; k++) {
        const t = k / 6;
        const x = x0 + (x1 - x0) * t,
          y = y0 + (y1 - y0) * t;
        // push the midpoint toward the wrist (concave scallop)
        const s2 = Math.sin(t * Math.PI) * bulge;
        out.push(x + (WRIST[0] - x) * s2, y + (WRIST[1] - y) * s2);
      }
      return out;
    };
    const pts = [
      ...WRIST,
      ...FINGERS[0],
      ...arc(FINGERS[0][0], FINGERS[0][1], FINGERS[1][0], FINGERS[1][1], 0.22),
      ...FINGERS[1],
      ...arc(FINGERS[1][0], FINGERS[1][1], FINGERS[2][0], FINGERS[2][1], 0.25),
      ...FINGERS[2],
      ...arc(FINGERS[2][0], FINGERS[2][1], 96, 120, 0.18),
      96, 120, ELBOW[0], ELBOW[1],
    ];
    m.poly(pts, WING);
  }
  // tail: from the haunch, curling out into the foreground
  tube(m, [[30, 150], [-4, 168], [20, 186], [70, 181]], 13, 5, BODY);
  tube(m, [[70, 181], [88, 179], [100, 175]], 5, 3, BODY);
  // main coil
  m.ellipse(78, 140, 64, 27, BODY);
  m.ellipse(62, 128, 44, 18, BODY);
  // haunch / back leg
  m.ellipse(36, 152, 20, 14, BODY);
  // foreleg
  m.poly([112, 138, 138, 134, 150, 160, 152, 170, 120, 170, 122, 156], BODY);
  // neck
  if (!asleep) tube(m, [[112, 142], [156, 142], [140, 100], [160, 88]], 19, 11, BODY);
  else tube(m, [[112, 140], [150, 134], [140, 152], [152, 150]], 19, 11, BODY);
  headMask(m, H[0], H[1], !asleep);
  // belly plates: the underside of the coil and the front of the neck
  {
    const belly = new Surface(320, 190);
    belly.writePri = false;
    belly.ellipse(84, 158, 56, 9, 1);
    if (!asleep) tube(belly, [[126, 154], [166, 146], [154, 106], [166, 96]], 8, 4, 1);
    else tube(belly, [[126, 154], [160, 150], [150, 160], [158, 160]], 8, 4, 1);
    for (let i = 0; i < m.px.length; i++) if (belly.px[i] && m.px[i] === BODY) m.px[i] = BELLY;
  }

  const mask = new Uint8Array(320 * 190);
  for (let i = 0; i < mask.length; i++) mask[i] = m.px[i] ? 1 : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= 320 || y >= 190 ? 0 : m.px[y * 320 + x]);

  // ---------------------------------------------------------------- paint
  // shadow on the ground beneath it
  p.ellipse(84, 172, 78, 9, dith(0, 8, 4));
  p.at(171, () => {
    // wing membrane: magnetic tape, wound in long strands
    for (let y = 30; y < 125; y++)
      for (let x = 30; x < 120; x++) {
        if (at(x, y) !== WING) continue;
        const ang = Math.atan2(y - WRIST[1], x - WRIST[0]);
        const strand = Math.floor(ang * 40) % 5;
        const dist = Math.hypot(x - WRIST[0], y - WRIST[1]);
        p.plot(x, y, strand === 0 ? 4 : strand === 2 && Math.floor(dist) % 6 === 0 ? 14 : 6);
      }
    // wing bones: the arm (shoulder, elbow, wrist), then the long fingers
    p.line(100, 120, ELBOW[0], ELBOW[1], 7, 3);
    p.line(ELBOW[0], ELBOW[1], WRIST[0], WRIST[1], 7, 3);
    p.line(99, 119, ELBOW[0] - 1, ELBOW[1], 15);
    p.line(ELBOW[0] - 1, ELBOW[1], WRIST[0], WRIST[1] - 1, 15);
    for (const [fx, fy] of FINGERS) {
      p.line(WRIST[0], WRIST[1], fx, fy, 8, 2);
      p.line(WRIST[0], WRIST[1] - 1, fx, fy - 1, 7);
      // claw-tip
      p.plot(fx - 1, fy, 15);
      p.plot(fx - 2, fy + 1, 7);
    }
    const wrist = WRIST;
    // a few tears in the tape
    for (const [hx, hy] of [
      [52, 70],
      [40, 98],
      [70, 92],
    ]) {
      p.plot(hx, hy, 0);
      p.plot(hx + 1, hy + 1, 0);
      p.plot(hx, hy + 1, 0);
    }

    // body base
    for (let y = 30; y < 190; y++)
      for (let x = 0; x < 215; x++) {
        const v = at(x, y);
        if (v === BODY) p.plot(x, y, 7);
        else if (v === HORN) p.plot(x, y, 14);
      }
    // punch-card scales, overlapping like shingles (drawn top rows first)
    for (let row = 0; row < 40; row++) {
      const y = 40 + row * 4;
      const off = (row % 2) * 5;
      for (let x = -10 + off; x < 215; x += 10) {
        const cx = x + 5,
          cy = y + 2;
        if (at(cx, cy) !== BODY) continue;
        // lighter on top, darker toward the ground
        const tier = cy > 156 || (cy > 150 && cx < 60) ? 2 : cy > 140 || (cy > 134 && cx < 50) ? 1 : 0;
        const low = tier > 0;
        const face = [15, 7, 8][tier];
        const edge = [7, 8, 0][tier];
        for (let yy = 0; yy < 5; yy++)
          for (let xx = 0; xx < 10; xx++) {
            const px = x + xx,
              py = y + yy;
            if (at(px, py) !== BODY) continue;
            let c = face;
            if (yy === 4 || xx === 9) c = edge;
            if (xx === 0 && yy === 0) c = edge; // clipped corner, like a real card
            p.plot(px, py, c);
          }
        // the holes
        for (let k = 0; k < 3; k++) {
          const hx = x + 1 + Math.floor(r() * 8),
            hy = y + 1 + Math.floor(r() * 3);
          if (at(hx, hy) === BODY) p.plot(hx, hy, low ? 0 : 8);
        }
      }
    }
    // the head: smooth hide, lit from above
    for (let y = 30; y < 190; y++)
      for (let x = 100; x < 215; x++) {
        const v = at(x, y);
        if (v !== HEAD && v !== JAW) continue;
        const rel = y - H[1];
        let c = v === JAW ? (rel > 13 ? 8 : 7) : rel < -4 ? 15 : rel < 5 ? 7 : 8;
        if (v === HEAD && rel >= -4 && rel < -1 && (x + y) % 2) c = 15;
        if (v === JAW && rel > 11 && (x + y) % 2) c = 8;
        p.plot(x, y, c);
      }
    // green-bar printout belly with tractor-feed holes
    for (let y = 30; y < 190; y++)
      for (let x = 0; x < 215; x++) {
        if (at(x, y) !== BELLY) continue;
        const band = Math.floor(y / 3) % 2;
        p.plot(x, y, band ? 10 : 15);
        const leftEdge = at(x - 2, y) !== BELLY,
          rightEdge = at(x + 2, y) !== BELLY;
        if ((leftEdge || rightEdge) && y % 3 === 1) p.plot(x, y, 8);
      }
    // dorsal ridge: little spines along the top of the coil
    for (let x = 18; x < 112; x += 8) {
      let top = -1;
      for (let y = 100; y < 160; y++)
        if (at(x, y) === BODY) {
          top = y;
          break;
        }
      if (top < 0 || at(x, top - 1) === WING || at(x, top - 2) === WING) continue;
      p.poly([x - 3, top + 1, x, top - 6, x + 3, top + 1], 15);
      p.line(x, top - 6, x + 3, top + 1, 7);
      p.plot(x, top - 4, 8);
    }
    // spines down the back of the neck
    if (!asleep) {
      for (let k = 0; k < 6; k++) {
        const t = 0.2 + k * 0.13;
        // back edge of the neck curve, approximated
        const nx = Math.round(112 + (128 - 112) * t + Math.sin(t * Math.PI) * -6) + 4,
          ny = Math.round(142 - (142 - 92) * t);
        let ex = nx;
        while (ex > 90 && at(ex - 1, ny) === BODY) ex--;
        if (at(ex - 1, ny) === WING) continue;
        p.poly([ex + 1, ny - 3, ex - 5, ny - 2, ex + 1, ny + 2], 15);
        p.line(ex - 5, ny - 2, ex + 1, ny + 2, 7);
      }
    }
    // outline: black edges, a white rim along the top
    for (let y = 1; y < 189; y++)
      for (let x = 1; x < 215; x++) {
        const v = at(x, y);
        if (!v) continue;
        const up = at(x, y - 1),
          dn = at(x, y + 1),
          lf = at(x - 1, y),
          rt = at(x + 1, y);
        const edge = (n: number) => !n || (v === WING && n !== WING) || (n === WING && v !== WING);
        if (edge(dn) || edge(lf) || edge(rt)) p.plot(x, y, 0);
        else if (edge(up)) p.plot(x, y, v === WING ? 14 : 15);
        else if (v === JAW && up === HEAD) p.plot(x, y, 0);
      }
    // horn ridges
    for (let y = 0; y < 190; y++)
      for (let x = 100; x < 215; x++) if (at(x, y) === HORN && (x * 2 + y) % 5 === 0) p.plot(x, y, 6);

    // foreleg claws
    for (let k = 0; k < 4; k++) {
      const cx = 122 + k * 7;
      p.poly([cx, 167, cx + 4, 167, cx + 6, 172, cx + 1, 171], 15);
      p.plot(cx + 5, 171, 7);
      p.plot(cx, 167, 0);
    }
    // tail spade
    p.poly([98, 172, 108, 166, 112, 176, 104, 180, 98, 178], 15);
    p.lines([98, 172, 108, 166, 112, 176, 104, 180, 98, 178, 98, 172], 0);
    p.line(100, 175, 108, 172, 8);

    headDetails(p, H[0], H[1], !asleep, asleep);
  });

  const at2 = (x: number, y: number): [number, number] => [H[0] + Math.round(x * HS), H[1] + Math.round(y * HS)];
  return { mask, eye: at2(8, 2), nose: at2(32, -2), mouth: at2(30, asleep ? 9 : 10) };
}
