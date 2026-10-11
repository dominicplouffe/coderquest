// Art for the server room: THE MONOLITH (a 1987 mainframe), Denis's corner,
// the NDI chairs, the helmets, and the digitize particle effect.
import { Surface, Img, rng, TRANSPARENT, microWidth } from '../engine/raster';
import { dith } from '../engine/palette';
import { serverRack, fluorescent } from './lib';
import { textWidth } from '../engine/font';

export const CEIL = 14;
export const SEAM = 108;
/** NDI chairs: x of each chair, feet y of whoever sits in it. */
export const CHAIR_A = 196; // Adriana
export const CHAIR_B = 228; // Dominic
export const CHAIR_Y = 142;
/** Monolith cabinets */
export const TAPE_A = 100,
  TAPE_B = 130,
  CPU = 160,
  CPU_W = 56,
  DISK = 218;
export const PORT: [number, number] = [203, 84];
export const CONSOLE = { x: 102, y: 112, w: 50, front: 128 };

export type Mode = 'panic' | 'calm' | 'busy' | 'green' | 'digitize';

/** Helmet cables, from the serial port down to the top of each chair back. */
export const CABLE_A = [PORT[0] - 4, PORT[1] + 4, PORT[0] - 7, 94, PORT[0] - 10, 101, CHAIR_A + 1, 106, CHAIR_A + 2, CHAIR_Y - 33];
export const CABLE_B = [PORT[0] + 7, PORT[1] + 6, PORT[0] + 10, 95, PORT[0] + 16, 101, CHAIR_B - 4, 105, CHAIR_B, CHAIR_Y - 33];

/** Point at fraction k (0 = port end, 1 = chair end) along a polyline. */
function along(pts: number[], k: number): [number, number] {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const d = Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
    segs.push(d);
    total += d;
  }
  let want = k * total;
  for (let j = 0; j < segs.length; j++) {
    if (want <= segs[j] || j === segs.length - 1) {
      const f = segs[j] ? Math.min(1, want / segs[j]) : 0;
      const i = j * 2;
      return [Math.round(pts[i] + (pts[i + 2] - pts[i]) * f), Math.round(pts[i + 1] + (pts[i + 3] - pts[i + 1]) * f)];
    }
    want -= segs[j];
  }
  return [pts[0], pts[1]];
}

/** The leftmost wall in steep perspective: x of the floor seam at a given y. */
export const seamX = (y: number) => 26 - ((y - SEAM) * 26) / 82;

// ------------------------------------------------------------------ static picture

let rackLeds: [number, number, number][] = [];

export function paintServerRoom(p: Surface, o: { connected: boolean; act3: boolean; tileUp: boolean }) {
  // ---- ceiling: drop tiles and two light fixtures
  p.rect(0, 0, 320, CEIL, 7);
  for (let x = 0; x < 320; x += 32) p.vline(x, 0, CEIL - 1, 8);
  p.hline(0, 319, 7, 8);
  p.hline(0, 319, CEIL - 1, 0);
  fluorescent(p, 64, 2, 40, true);
  fluorescent(p, 270, 2, 40, true);
  // halon nozzle
  p.rect(150, CEIL - 1, 3, 3, 8);

  // ---- back wall: dark acoustic panels
  p.rect(0, CEIL, 320, SEAM - CEIL, 8);
  for (let x = 30; x < 320; x += 40) p.vline(x, CEIL, SEAM - 1, 0);
  p.hline(0, 319, CEIL, 0);
  p.hline(0, 319, CEIL + 1, 7);
  p.rect(0, SEAM - 3, 320, 3, 0);

  // ---- raised floor: anti-static blue tiles in perspective, a few perforated vent tiles
  p.rect(0, SEAM, 320, 190 - SEAM, 1);
  p.gradV(0, SEAM, 320, 10, [0, 1]);
  const rows: number[] = [];
  let yy = SEAM + 6,
    step = 8;
  while (yy < 190) {
    rows.push(yy);
    yy += step;
    step = Math.round(step * 1.22);
  }
  const lines = [-9, -7, -5, -3, -1, 1, 3, 5, 7, 9].map((k) => k * 20);
  // vents: (column index, row index)
  const vents = [
    [3, 2],
    [6, 3],
    [2, 4],
  ];
  for (const [ci, ri] of vents) {
    const y0 = ri === 0 ? SEAM : rows[ri - 1],
      y1 = rows[ri] ?? 190;
    for (let y = y0 + 1; y < y1; y++) {
      const t = (y - SEAM) / (190 - SEAM);
      const xa = 160 + lines[ci] * (0.45 + t * 0.9) + 1,
        xb = 160 + lines[ci + 1] * (0.45 + t * 0.9);
      for (let x = Math.ceil(xa); x < xb; x++) if ((x + y) % 2 === 0 && y % 2 === 0) p.plot(x, y, 9);
    }
  }
  for (const r of rows) {
    p.hline(0, 319, r, 0);
    p.hline(0, 319, r + 1, 9);
  }
  for (const k of lines) p.line(160 + k * 0.45, SEAM, 160 + k * 1.35, 190, 0);
  if (o.tileUp) {
    // one tile pried up near Denis's corner: cables underneath
    p.poly([40, 132, 62, 132, 66, 144, 36, 144], 0);
    for (let i = 0; i < 6; i++) p.line(38 + i * 4, 138 + (i % 2), 46 + i * 3, 142, [12, 10, 14, 9, 13, 15][i]);
    p.poly([36, 144, 66, 144, 64, 147, 38, 147], 8);
    p.poly([42, 118, 62, 116, 62, 131, 40, 132], 7);
    p.frame(42, 118, 20, 14, 8);
  }

  // ---- the left wall, nearly edge-on, with the vault door back to the basement
  p.poly([0, 0, 26, CEIL, 26, SEAM, 0, 190], 8);
  p.line(26, CEIL, 26, SEAM, 0);
  p.poly([0, 186, 26, SEAM - 4, 26, SEAM, 0, 190], 0);
  // door: near edge x=3, far edge x=17
  p.poly([1, 126, 19, 88, 19, 138, 1, 184], 0);
  for (let y = 86; y < 186; y++)
    for (let x = 1; x < 20; x++) {
      const top = 126 - (x - 1) * 2.1,
        bot = 184 - (x - 1) * 2.55;
      if (y < top || y > bot) continue;
      const inner = x >= 4 && x <= 16 && y > top + 4 && y < bot - 1;
      if (!inner) p.plot(x, y, ((y + x * 2) >> 2) % 2 ? 14 : 0);
    }
  p.poly([4, 131, 16, 94, 16, 135, 4, 178], 7);
  p.poly([5, 140, 15, 108, 15, 112, 5, 145], 8); // big locking wheel bar
  p.circle(10, 128, 3, 8);
  p.circle(10, 128, 1, 15);
  p.line(4, 131, 16, 94, 15);
  // halon warning
  p.rect(3, 50, 18, 16, 4);
  p.frame(3, 50, 18, 16, 0);
  p.micro(5, 52, 'FIRE', 15);
  p.micro(5, 58, 'RUN', 14);

  // ---- Denis's corner
  // framed Y2K SURVIVOR t-shirt
  p.rect(31, 28, 21, 25, 0);
  p.rect(32, 29, 19, 23, 1);
  p.poly([36, 31, 39, 31, 41, 33, 43, 31, 46, 31, 49, 35, 47, 37, 46, 36, 46, 49, 37, 49, 37, 36, 36, 37, 34, 35], 15);
  p.micro(36, 37, 'Y2K', 4);
  p.hline(38, 45, 43, 8);
  p.hline(38, 44, 45, 8);
  // pegboard with every cable ever made
  p.rect(55, 22, 24, 46, 6);
  p.frame(55, 22, 24, 46, 0);
  for (let y = 25; y < 66; y += 4) for (let x = 58; x < 78; x += 4) p.plot(x, y, 0);
  const coils: [number, number, number, number][] = [
    [61, 30, 4, 12],
    [72, 29, 3, 10],
    [62, 42, 3, 14],
    [72, 41, 4, 9],
    [62, 55, 4, 15],
    [72, 54, 3, 11],
  ];
  for (const [cx, cy, r, c] of coils) {
    p.ellipseO(cx, cy + r, r, r + 1, c);
    p.ellipseO(cx, cy + r, r - 1, r, c);
    p.plot(cx, cy - 1, 7);
  }
  p.vline(67, 26, 64, 13);
  p.rect(66, 64, 3, 2, 7);
  // shelf with Denis's own green-screen terminal
  p.rect(78, 76, 22, 2, 6);
  p.hline(78, 99, 78, 0);
  p.rect(80, 58, 18, 18, 7);
  p.frame(80, 58, 18, 18, 0);
  p.rect(82, 60, 14, 11, 0);
  p.rect(83, 72, 12, 2, 8);
  p.plot(95, 73, 10);
  // army cot
  p.at(110, () => {
    p.line(31, 108, 37, 100, 0);
    p.line(37, 108, 31, 100, 0);
    p.line(68, 108, 74, 100, 0);
    p.line(74, 108, 68, 100, 0);
    p.rect(29, 96, 48, 5, 2);
    p.hline(29, 76, 96, 10);
    p.hline(29, 76, 100, 0);
    p.rect(30, 93, 12, 4, 15); // pillow
    p.hline(30, 41, 93, 7);
    p.rect(44, 94, 30, 3, 2); // folded blanket
    p.hline(44, 73, 94, 10);
  });
  // milk crate with a hot plate and a pot of ramen
  p.at(110, () => {
    p.rect(80, 96, 18, 12, 1);
    for (let x = 82; x < 98; x += 3) p.vline(x, 98, 106, 0);
    p.hline(80, 97, 96, 9);
    p.rect(81, 93, 16, 3, 8);
    p.hline(81, 96, 93, 7);
    p.plot(83, 94, 12);
    p.rect(85, 87, 9, 6, 7);
    p.hline(85, 93, 87, 15);
    p.rect(94, 89, 3, 1, 0);
    p.hline(86, 92, 88, 14);
  });

  // ---- overhead cable tray, with fat bundles dropping into the cabinets
  for (const hx of [104, 160, 222, 280]) p.vline(hx, CEIL, CEIL + 2, 0);
  p.rect(94, CEIL + 2, 224, 4, 0);
  p.hline(94, 317, CEIL + 2, 8);
  for (let x = 96; x < 316; x += 2) p.plot(x, CEIL + 4, [12, 10, 14, 9, 15, 13][((x - 96) / 2) % 6 | 0]);
  const bundle = (x: number, y1: number) => {
    p.rect(x, CEIL + 6, 5, y1 - CEIL - 6, 0);
    for (let y = CEIL + 6; y < y1; y++) {
      p.plot(x + 1, y, (y >> 1) % 2 ? 9 : 1);
      p.plot(x + 2, y, (y >> 1) % 3 ? 8 : 7);
      p.plot(x + 3, y, (y >> 1) % 2 ? 4 : 12);
    }
  };
  bundle(110, 30);
  bundle(140, 30);
  bundle(204, 24);
  bundle(236, 44);

  // ---- THE MONOLITH
  // shadow on the floor
  p.rect(TAPE_A - 2, SEAM, 152, 3, 0);
  tapeDrive(p, TAPE_A);
  tapeDrive(p, TAPE_B);
  cpuCabinet(p, o);
  diskCabinet(p);
  // brand plate across the top of the tape drives
  p.rect(TAPE_A, 30, 58, 6, 1);
  p.hline(TAPE_A, TAPE_A + 57, 30, 9);
  p.micro(TAPE_A + Math.floor((58 - microWidth('SINCE 1987')) / 2), 31, 'SINCE 1987', 15);

  // ---- modern racks, a little embarrassed to be here
  rackLeds = [...serverRack(p, 256, 52, 24, 56, 5), ...serverRack(p, 284, 52, 24, 56, 9)];
  p.rect(258, 46, 20, 6, 14);
  p.micro(259, 47, 'CLOUD', 0);
  p.rect(286, 46, 20, 6, 14);
  p.micro(288, 47, '2009', 0);
  // digital wall clock frame
  p.rect(262, 22, 44, 19, 0);
  p.frame(262, 22, 44, 19, 7);
  p.frame(263, 23, 42, 17, 8);

  // ---- operator console: a desk with a beige IBM-style terminal
  const C = CONSOLE;
  p.at(C.front, () => {
    p.rect(C.x, C.y, C.w, 5, 7);
    p.hline(C.x, C.x + C.w - 1, C.y, 15);
    p.rect(C.x, C.y + 5, C.w, C.front - C.y - 5, 8);
    p.hline(C.x, C.x + C.w - 1, C.y + 5, 0);
    p.rect(C.x + 2, C.y + 7, C.w - 4, C.front - C.y - 9, dith(8, 0, 3));
    p.rect(C.x + 1, C.front - 1, 3, 1, 0);
    p.rect(C.x + C.w - 4, C.front - 1, 3, 1, 0);
    // terminal
    p.rect(114, 90, 28, 22, 7);
    p.hline(114, 141, 90, 15);
    p.vline(114, 90, 111, 15);
    p.vline(141, 90, 111, 8);
    p.rect(117, 93, 22, 15, 0);
    p.rect(118, 108, 20, 3, 8);
    p.plot(138, 109, 10);
    // keyboard
    p.rect(115, C.y + 1, 26, 3, 15);
    for (let x = 116; x < 140; x += 2) p.plot(x, C.y + 2, 7);
    p.hline(115, 140, C.y + 3, 8);
  });

  // ---- cables from the Monolith's serial port to the NDI chairs
  cable(p, CABLE_A);
  if (o.connected) {
    p.rect(PORT[0] + 4, PORT[1] + 1, 6, 5, 7); // the adapter
    p.frame(PORT[0] + 4, PORT[1] + 1, 6, 5, 0);
    cable(p, CABLE_B);
  }
  chair(p, CHAIR_A);
  chair(p, CHAIR_B);
}

function cabinetBody(p: Surface, x: number, y: number, w: number) {
  p.rect(x, y, w, SEAM - y, 7);
  p.hline(x, x + w - 1, y, 15);
  p.vline(x, y, SEAM - 1, 15);
  p.vline(x + w - 1, y, SEAM - 1, 8);
  p.rect(x, SEAM - 5, w, 5, 1); // blue plinth
  p.hline(x, x + w - 1, SEAM - 5, 9);
}

function tapeDrive(p: Surface, x: number) {
  cabinetBody(p, x, 36, 28);
  // smoked glass window for the reels
  p.rect(x + 3, 39, 22, 46, 0);
  p.frame(x + 2, 38, 24, 48, 8);
  // vacuum columns
  p.rect(x + 6, 88, 4, 12, 0);
  p.rect(x + 18, 88, 4, 12, 0);
  p.frame(x + 5, 87, 6, 14, 8);
  p.frame(x + 17, 87, 6, 14, 8);
  // LOAD / REWIND buttons
  p.rect(x + 12, 89, 4, 2, 15);
  p.rect(x + 12, 93, 4, 2, 9);
  p.rect(x + 12, 97, 4, 2, 4);
}

function cpuCabinet(p: Surface, o: { act3: boolean }) {
  const x = CPU,
    w = CPU_W;
  cabinetBody(p, x, 24, w);
  // blue header with the name
  p.rect(x, 24, w, 12, 1);
  p.hline(x, x + w - 1, 24, 9);
  p.hline(x, x + w - 1, 35, 0);
  const t = 'MONOLITH';
  p.text(x + 4, 26, t, 15);
  p.text(x + 4, 27, t, 15);
  p.text(x + 5, 26, t, 15);
  // beacon base
  p.rect(x + 25, 21, 7, 3, 8);
  // light panel
  p.rect(x + 3, 39, w - 6, 24, 0);
  p.frame(x + 2, 38, w - 4, 26, 8);
  // status display
  p.rect(x + 5, 66, w - 10, 9, 0);
  p.frame(x + 4, 65, w - 8, 11, 8);
  // the big red RESTART button, under a duct-taped cover with a note
  p.rect(x + 13, 78, 13, 11, 8);
  p.circle(x + 19, 83, 4, 4);
  p.circle(x + 18, 82, 2, 12);
  p.frame(x + 13, 78, 13, 11, 15);
  p.line(x + 12, 77, x + 27, 90, 15);
  p.line(x + 27, 77, x + 12, 90, 15);
  if (!o.act3) {
    p.rect(x + 3, 79, 8, 7, 14);
    p.micro(x + 4, 80, 'NO', 4);
  } else {
    p.rect(x + 3, 79, 8, 7, 14);
    p.micro(x + 4, 80, 'NO!', 4);
  }
  p.micro(x + 5, 90, 'RESTART', 4);
  // DB-25 serial port
  p.rect(PORT[0] - 6, PORT[1] - 3, 18, 10, 8);
  p.frame(PORT[0] - 6, PORT[1] - 3, 18, 10, 0);
  p.poly([PORT[0] - 4, PORT[1] - 1, PORT[0] + 10, PORT[1] - 1, PORT[0] + 9, PORT[1] + 4, PORT[0] - 3, PORT[1] + 4], 0);
  for (let i = 0; i < 6; i++) p.plot(PORT[0] - 2 + i * 2, PORT[1] + 1, 14);
  p.rect(PORT[0] - 6, PORT[1] - 3, 7, 6, 15); // the splitter Adriana's in
  p.micro(PORT[0] - 4, PORT[1] + 8, 'DB25', 0);
  // toggle switches
  for (let i = 0; i < 9; i++) {
    p.rect(x + 5 + i * 5, 97, 3, 4, 8);
    p.plot(x + 6 + i * 5, 96, 15);
  }
}

function diskCabinet(p: Surface) {
  const x = DISK;
  cabinetBody(p, x, 44, 32);
  // smoked dome over the disk pack
  p.rect(x + 3, 47, 26, 17, 0);
  p.frame(x + 2, 46, 28, 19, 8);
  // two drive fronts
  for (const y of [68, 86]) {
    p.rect(x + 3, y, 26, 14, 9);
    p.frame(x + 3, y, 26, 14, 1);
    p.rect(x + 6, y + 5, 12, 2, 1);
    p.hline(x + 6, x + 17, y + 5, 15);
  }
}

/** A thick, slightly lumpy cable. */
function cable(p: Surface, pts: number[]) {
  p.lines(pts, 0, 2);
  p.lines(pts.map((v, i) => (i % 2 ? v : v + 1)), 8);
}

/** NDI chair: an old high-backed black office chair facing the viewer. */
function chair(p: Surface, cx: number) {
  p.at(CHAIR_Y, () => {
    // tufted brown leather back
    p.rect(cx - 7, CHAIR_Y - 31, 15, 21, 0);
    p.rect(cx - 6, CHAIR_Y - 30, 13, 19, 6);
    p.hline(cx - 6, cx + 6, CHAIR_Y - 30, 14);
    p.vline(cx + 6, CHAIR_Y - 29, CHAIR_Y - 12, 4);
    for (let ty = CHAIR_Y - 26; ty < CHAIR_Y - 12; ty += 5) for (let tx = cx - 3; tx <= cx + 3; tx += 3) p.plot(tx, ty, 4);
    // seat
    p.rect(cx - 8, CHAIR_Y - 11, 17, 4, 0);
    p.hline(cx - 7, cx + 7, CHAIR_Y - 11, 6);
    p.hline(cx - 7, cx + 7, CHAIR_Y - 10, 4);
    // armrests
    p.rect(cx - 9, CHAIR_Y - 16, 3, 7, 0);
    p.rect(cx + 7, CHAIR_Y - 16, 3, 7, 0);
    p.hline(cx - 9, cx - 7, CHAIR_Y - 16, 6);
    p.hline(cx + 7, cx + 9, CHAIR_Y - 16, 6);
    // stem and five-star base
    p.rect(cx, CHAIR_Y - 7, 2, 5, 8);
    p.hline(cx - 7, cx + 8, CHAIR_Y - 2, 0);
    p.plot(cx - 7, CHAIR_Y - 1, 0);
    p.plot(cx + 8, CHAIR_Y - 1, 0);
    p.plot(cx, CHAIR_Y - 1, 0);
  });
}

// ------------------------------------------------------------------ animation

/** Everything that moves in the server room. */
export function animateServerRoom(s: Surface, t: number, mode: Mode, o: { minute: string; ampm: string; day: string; display: string; displayColor: number; console: string[]; pulseA: boolean; pulseB: boolean }) {
  // ---- data pulses along the helmet cables
  if (o.pulseA) {
    const k = ((t % 90) / 90) ** 1.2;
    const [x, y] = along(CABLE_A, 1 - k);
    s.plot(x, y, 11);
    s.plot(x + 1, y, 3);
  }
  if (o.pulseB)
    for (let i = 0; i < 5; i++) {
      const [x, y] = along(CABLE_B, 1 - ((t * 2 + i * 13) % 60) / 60);
      s.rect(x, y, 2, 2, i % 2 ? 15 : 11);
    }
  const fast = mode === 'busy' || mode === 'green' || mode === 'digitize';
  // ---- tape reels
  for (const [i, x] of [TAPE_A, TAPE_B].entries()) {
    let ang: number;
    if (mode === 'panic') {
      // jerking back and forth, looking for something they lost in 1999
      const k = Math.floor(t / 37 + i * 3);
      const dir = rng(k)() < 0.5 ? -1 : 1;
      ang = (t % 37) * 0.25 * dir + k * 1.3;
    } else ang = (t * (fast ? 0.35 : 0.06) + i * 1.7) * (i ? -1 : 1);
    reel(s, x + 14, 51, 9, ang, 6 + Math.round(Math.sin(t / 300 + i) * 1));
    reel(s, x + 14, 73, 9, -ang * 1.2, 5);
    // a little tape between the reels
    s.vline(x + 23, 51, 73, 6);
    // glass glint
    s.line(x + 5, 42, x + 9, 38 + 4, 8);
    // vacuum columns: tape loops bob up and down
    for (const [j, cx] of [x + 7, x + 19].entries()) {
      const h = 3 + Math.round((Math.sin(t / (fast ? 4 : mode === 'panic' ? 9 : 25) + i * 2 + j * 1.5) + 1) * 4);
      s.vline(cx, 88, 88 + h, 6);
      s.vline(cx + 1, 88, 88 + h, 6);
    }
  }
  // ---- the light panel
  const lx = CPU + 4,
    ly = 41;
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 12; c++) {
      let col = 0;
      const k = r * 12 + c;
      if (mode === 'panic') {
        const v = rng(k * 977 + Math.floor(t / 6))();
        col = v < 0.35 ? 12 : v < 0.5 ? 14 : v < 0.55 ? 15 : 4;
      } else if (mode === 'calm') {
        const v = rng(k * 131 + Math.floor(t / 40))();
        col = v < 0.3 ? 14 : v < 0.45 ? 10 : 6;
      } else if (mode === 'busy') {
        col = (c + r + Math.floor(t / 3)) % 6 === 0 ? 15 : rng(k + Math.floor(t / 4) * 61)() < 0.5 ? 10 : 2;
      } else if (mode === 'green') {
        col = (c - Math.floor(t / 4) + 60) % 12 < 3 ? 15 : 10;
      } else {
        const v = rng(k * 7 + Math.floor(t / 2))();
        col = v < 0.3 ? 11 : v < 0.5 ? 15 : v < 0.7 ? 9 : 13;
      }
      s.rect(lx + c * 4, ly + r * 4, 2, 2, col);
    }
  // ---- status display
  const blink = mode === 'panic' ? Math.floor(t / 20) % 2 === 0 : true;
  if (blink) s.micro(CPU + 6 + Math.max(0, Math.floor((CPU_W - 12 - microWidth(o.display)) / 2)), 68, o.display, o.displayColor);
  // ---- disk pack spinning under its smoked dome
  for (let k = 0; k < 6; k++) {
    const y = 49 + k * 2;
    s.hline(DISK + 6, DISK + 25, y, 8);
    const hx = DISK + 6 + ((t * (fast ? 3 : 1) + k * 5) % 20);
    s.hline(hx, Math.min(DISK + 25, hx + 3), y, 15);
  }
  s.rect(DISK + 14, 61, 4, 2, 7);
  // drive LEDs
  s.plot(DISK + 24, 73, (t >> 3) % 3 ? 10 : 2);
  s.plot(DISK + 24, 91, (t >> 2) % 5 ? 10 : 2);
  s.plot(DISK + 26, 73, mode === 'panic' ? ((t >> 4) % 2 ? 12 : 4) : 2);
  s.plot(DISK + 26, 91, mode === 'panic' ? ((t >> 4) % 2 ? 4 : 12) : 2);
  // ---- beacon on top (panic only)
  if (mode === 'panic') {
    const ph = (t % 40) / 40;
    s.rect(CPU + 25, 15, 7, 6, 4);
    s.rect(CPU + 26, 14, 5, 1, 4);
    const bx = CPU + 25 + Math.round(Math.abs(Math.sin(ph * Math.PI)) * 5);
    s.rect(bx, 15, 2, 5, 12);
    if (ph < 0.25) s.plot(bx, 14, 15);
    // the sweep catches the ceiling
    const sx = Math.round(CPU + 28 + Math.cos(ph * Math.PI * 2) * 120);
    if (ph > 0.05 && ph < 0.45) for (let y = 1; y < CEIL - 1; y += 2) for (let x = sx - 8; x < sx + 8; x += 2) s.plot(x + (y & 2 ? 1 : 0), y, 12);
  } else {
    s.rect(CPU + 25, 15, 7, 6, mode === 'green' ? 2 : 4);
    s.rect(CPU + 26, 14, 5, 1, mode === 'green' ? 2 : 4);
    s.rect(CPU + 26, 16, 2, 3, mode === 'green' ? 10 : 12);
  }
  // ---- racks
  for (let i = 0; i < rackLeds.length; i++) {
    const [x, y, c] = rackLeds[i];
    const on = ((t / 12 + i * 7.3) | 0) % 3 !== 0;
    s.plot(x, y, on ? c : 0);
  }
  // ---- Denis's terminal: a log scrolling by
  const scroll = Math.floor(t / 18);
  for (let r = 0; r < 5; r++) {
    const rr = rng((scroll + r) * 17);
    const len = 3 + Math.floor(rr() * 9);
    s.hline(83, 83 + len, 61 + r * 2, mode === 'panic' && rr() < 0.3 ? 12 : 10);
  }
  // ---- the operator console screen
  o.console.forEach((ln, i) => (ln.startsWith('!') ? s.micro(118, 95 + i * 6, ln.slice(1), 12) : s.micro(118, 95 + i * 6, ln, 10)));
  const last = o.console[o.console.length - 1] ?? '';
  if (last.endsWith('>') && Math.floor(t / 30) % 2 === 0) s.rect(118 + microWidth(last) + 2, 95 + (o.console.length - 1) * 6, 2, 5, 10);
  // ---- the clock
  s.rect(264, 24, 40, 15, 0);
  s.micro(266, 26, o.day, 4);
  s.micro(266, 32, o.ampm, 4);
  const colon = Math.floor(t / 30) % 2 === 0;
  const tm = colon ? o.minute : o.minute.replace(':', ' ');
  s.text(303 - textWidth(o.minute), 27, tm, 12);
  // ---- steam from the ramen
  for (let i = 0; i < 3; i++) {
    const ph = (t + i * 20) % 60;
    s.plot(87 + i * 2 + Math.round(Math.sin((t + i * 13) / 9)), 86 - Math.floor(ph / 8), ph < 40 ? 7 : 8);
  }
}

function reel(s: Surface, cx: number, cy: number, r: number, ang: number, tape: number) {
  s.circle(cx, cy, r, 8);
  s.circle(cx, cy, tape, 6);
  s.ellipseO(cx, cy, r, r, 7);
  s.circle(cx, cy, 2, 15);
  for (let k = 0; k < 3; k++) {
    const a = ang + (k * Math.PI * 2) / 3;
    const x1 = cx + Math.cos(a) * (r - 1),
      y1 = cy + Math.sin(a) * (r - 1);
    s.line(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, x1, y1, 0);
  }
  s.plot(cx, cy, 0);
}

// ------------------------------------------------------------------ helmets

/** Pixels of an NDI helmet, relative to (head center x, head top y). v1 = Adriana's taped prototype. */
export function helmetPixels(v: 1 | 2, t: number): [number, number, number][] {
  // rows relative to the head's top row; the head is 9px wide (dx -4..4)
  const v1 = [
    '..R.....G..',
    '..8.....8..',
    '..0777770..',
    '.077F777770',
    '07F77777780',
    '07777777880',
    '0WWWWWWWWW0',
    '000000r0000',
    '8.........8',
  ];
  const v2 = [
    '...........',
    '.....C.....',
    '...07F770..',
    '..07FF7780.',
    '.07F7F77780',
    '.07777F7880',
    '.0LCCCCC9L0',
    '.0bbbbbbb0.',
    '.8.......8.',
  ];
  const rows = v === 1 ? v1 : v2;
  const blink = Math.floor(t / 25) % 2;
  const key: Record<string, number> = {
    '0': 0,
    '7': 7,
    '8': 8,
    F: 15,
    W: 15,
    R: blink ? 12 : 4,
    G: blink ? 2 : 10,
    r: 12,
    C: 11,
    L: Math.floor(t / 15) % 2 ? 10 : 2,
    b: 1,
    '9': 9,
  };
  const out: [number, number, number][] = [];
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      out.push([c - 5, r - 4, key[ch]]);
    }
  });
  return out;
}

export function drawHelmet(s: Surface, cx: number, top: number, v: 1 | 2, t: number) {
  for (const [dx, dy, c] of helmetPixels(v, t)) s.plot(cx + dx, top + dy, c);
}

/** Adriana, slumped in her chair wearing the v1 prototype: a custom frame built from her sitting sprite. */
export function slumpedImage(base: Img, t: number): Img {
  const out: Img = { ...base, data: base.data.slice() };
  const W = out.w;
  const cx = base.ox;
  // bow the head: move rows 8..15 (the head, when seated) one pixel down
  const tmp = base.data.slice();
  for (let y = 8; y <= 15; y++) for (let x = 0; x < W; x++) out.data[y * W + x] = TRANSPARENT;
  for (let y = 8; y <= 15; y++)
    for (let x = 0; x < W; x++) {
      const c = tmp[y * W + x];
      if (c !== TRANSPARENT) out.data[(y + 1) * W + x] = c;
    }
  for (const [dx, dy, c] of helmetPixels(1, t)) {
    const x = cx + dx,
      y = 9 + dy;
    if (x >= 0 && x < W && y >= 0 && y < out.h) out.data[y * W + x] = c;
  }
  return out;
}

// ------------------------------------------------------------------ digitize particles

export interface Particle {
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  c: number;
  delay: number;
  seed: number;
}

/** Collect a figure's opaque pixels as particles (screen coordinates). */
export function particlesFrom(img: Img, fx: number, fy: number, extra: [number, number, number][], target: [number, number]): Particle[] {
  const out: Particle[] = [];
  const x0 = Math.round(fx) - img.ox,
    y0 = Math.round(fy) - img.oy;
  const r = rng(99);
  const push = (x: number, y: number, c: number) => {
    out.push({ x0: x, y0: y, tx: target[0] + Math.round((r() - 0.5) * 34), ty: target[1] + Math.round((r() - 0.5) * 18), c, delay: SCAN + (y - y0) * 1.6 + r() * 30, seed: r() });
  };
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const c = img.data[y * img.w + x];
      if (c !== TRANSPARENT) push(x0 + x, y0 + y, c);
    }
  for (const [x, y, c] of extra) push(x, y, c);
  return out;
}

const HOLO = [11, 15, 9, 13, 11, 3];
/** ticks spent sweeping a scanline down the figure before it starts to come apart */
const SCAN = 40;

/**
 * Draw particles at local time `lt` (ticks since start). Each pixel waits its delay,
 * rises, then arcs into the target. reverse = stream back in from the target.
 */
export function drawParticles(s: Surface, ps: Particle[], lt: number, reverse: boolean) {
  const FLY = 70;
  let minY = 999,
    maxY = -999;
  for (const p of ps) {
    minY = Math.min(minY, p.y0);
    maxY = Math.max(maxY, p.y0);
  }
  const scanY = reverse ? -1 : minY + ((maxY - minY + 4) * lt) / (SCAN - 6);
  for (const p of ps) {
    let k = (lt - p.delay) / FLY;
    if (reverse) k = 1 - (lt - p.delay * 0.6) / FLY;
    if (k <= 0) {
      // still part of the figure: a scanline turns it into a shimmering hologram
      const c = (lt + p.seed * 40) % 8 < 1 ? 15 : HOLO[Math.floor(p.seed * 6 + lt / 6) % HOLO.length];
      if (!reverse && Math.abs(p.y0 - scanY) < 1.5) s.plot(p.x0, p.y0, 15);
      else s.plot(p.x0, p.y0, reverse || p.y0 < scanY ? c : p.c);
      continue;
    }
    if (k >= 1) continue;
    const e = k * k * (3 - 2 * k);
    // rise first, then curve to the target
    const midx = p.x0 + (p.seed - 0.5) * 50,
      midy = Math.min(p.y0, p.ty) - 30 - p.seed * 30;
    const a = 1 - e;
    const x = a * a * p.x0 + 2 * a * e * midx + e * e * p.tx;
    const y = a * a * p.y0 + 2 * a * e * midy + e * e * p.ty;
    const c = HOLO[Math.floor(p.seed * 6 + lt / 3) % HOLO.length];
    s.plot(Math.round(x), Math.round(y), c);
    if (k < 0.8) s.plot(Math.round(x), Math.round(y) + 1, c === 15 ? 11 : 1);
  }
}
