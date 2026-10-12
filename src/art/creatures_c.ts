// Creatures and animated props for the Act II group-C rooms:
//   * the Garbage Collector (Heap) — trash-can robot with treads, claw and a red eye
//   * PID 1991, the ghost process stuck in Vim (Stack Overflow Tower)
//   * King Kernel's floating floppy-disk throne (Boot Sector)
//   * the Oracle's CRT face (Stack Overflow Tower)
import { Surface, Img, flipImg } from '../engine/raster';
import { bayerAt, dith } from '../engine/palette';
import { paintImg } from './cyber_c_kit';

// =================================================================== Garbage Collector

export interface GcPose {
  /** tread animation frame 0..2 */
  tread: number;
  /** eye offset along the visor, -5..5 */
  eye: number;
  arm: 'rest' | 'reach';
  clawOpen: boolean;
  /** lid lift 0..10 (eating) */
  lid: number;
  alarm: boolean;
  /** antenna bulb lit */
  bulb: boolean;
}

const GC_W = 56,
  GC_H = 56,
  GC_OX = 20,
  GC_OY = 55;

function paintGc(s: Surface, P: GcPose) {
  const cx = 20;
  // ---------------------------------------------------------- treads
  const ty = 47; // top of the tread unit
  // track: a stadium shape
  s.rect(9, ty, 23, 8, 0);
  s.ellipse(9, ty + 4, 3, 4, 0);
  s.ellipse(31, ty + 4, 3, 4, 0);
  // lugs, scrolling with the tread frame
  for (let x = 7; x <= 33; x++) {
    if ((x + P.tread) % 3 === 0) {
      s.plot(x, ty, 8);
      s.plot(x, ty + 8, 8);
    }
  }
  // wheels
  for (const wx of [12, 20, 28]) {
    s.circle(wx, ty + 4, 3, 8);
    s.plot(wx - 2, ty + 2, 7);
    s.plot(wx - 1, ty + 1, 7);
    s.plot(wx, ty + 1, 7);
    // rotating spoke
    const a = (P.tread / 3) * Math.PI * 0.66 + wx;
    s.plot(Math.round(wx + Math.cos(a) * 2), Math.round(ty + 4 + Math.sin(a) * 2), 0);
    s.plot(Math.round(wx - Math.cos(a) * 2), Math.round(ty + 4 - Math.sin(a) * 2), 0);
    s.plot(wx, ty + 4, 15);
  }
  // mud guard over the tracks
  s.rect(7, ty - 2, 27, 2, 8);
  s.hline(7, 33, ty - 2, 7);
  s.plot(6, ty - 1, 8);
  s.plot(34, ty - 1, 8);

  // ---------------------------------------------------------- can body (slightly tapered)
  const top = 20,
    bot = ty - 3;
  for (let y = top; y <= bot; y++) {
    const f = (y - top) / (bot - top);
    const l = Math.round(8 + f * 2),
      r = Math.round(32 - f * 2);
    for (let x = l; x <= r; x++) {
      const u = (x - l) / (r - l);
      let c: number;
      if (u < 0.07) c = 8;
      else if (u < 0.2) c = 15;
      else if (u < 0.3) c = bayerAt(x, y) < 8 ? 15 : 7;
      else if (u < 0.66) c = 7;
      else if (u < 0.8) c = bayerAt(x, y) < 7 ? 8 : 7;
      else if (u < 0.94) c = 8;
      else c = 0;
      // corrugation ridges
      if (u > 0.12 && u < 0.9 && (x - l) % 4 === 2 && y > top + 2 && y < bot - 1) c = c === 15 ? 7 : 8;
      s.plot(x, y, c);
    }
  }
  // rims
  s.hline(8, 32, top, 15);
  s.hline(8, 32, top + 1, 8);
  s.hline(9, 31, top + 12, 8);
  s.hline(9, 31, top + 13, 15);
  s.hline(10, 30, bot - 1, 8);
  s.hline(10, 30, bot, 0);
  // hazard stripes on the lower band
  for (let y = bot - 6; y <= bot - 3; y++)
    for (let x = 11; x <= 29; x++) s.plot(x, y, (x + y) % 6 < 3 ? 14 : 0);

  // ---------------------------------------------------------- lid (dome) + eye
  const lift = Math.round(P.lid);
  const ly = 19 - lift; // lid lip row
  if (lift > 0) {
    // the open maw of the can
    s.ellipse(cx, top + 1, 11, 2, 0);
    s.plot(cx - 4, top + 1, 13);
    s.plot(cx + 3, top, 11);
    s.plot(cx + 6, top + 1, 14);
  }
  // lip
  s.rect(6, ly - 2, 29, 3, 8);
  s.hline(6, 34, ly - 2, 7);
  s.hline(7, 33, ly, 0);
  // dome
  for (let y = 0; y < 9; y++) {
    const yy = ly - 3 - y;
    const hw = Math.round(Math.sqrt(1 - (y / 9.2) ** 2) * 13);
    for (let x = cx - hw; x <= cx + hw; x++) {
      const u = (x - (cx - hw)) / (hw * 2 || 1);
      let c = 7;
      if (u < 0.12) c = 8;
      else if (u < 0.36 && y > 3) c = bayerAt(x, yy) < 10 ? 15 : 7;
      else if (u > 0.84) c = 8;
      else if (u > 0.72) c = bayerAt(x, yy) < 8 ? 8 : 7;
      s.plot(x, yy, c);
    }
  }
  // handle
  s.hline(cx - 3, cx + 2, ly - 13, 8);
  s.plot(cx - 3, ly - 12, 8);
  s.plot(cx + 2, ly - 12, 8);
  s.hline(cx - 2, cx + 1, ly - 13, 7);
  // antenna + bulb
  s.line(cx - 7, ly - 9, cx - 10, ly - 18, 8);
  s.rect(cx - 11, ly - 20, 3, 2, P.bulb ? (P.alarm ? 12 : 14) : 4);
  if (P.bulb) s.plot(cx - 11, ly - 20, 15);
  // visor slit
  s.rect(cx - 10, ly - 7, 21, 3, 0);
  s.hline(cx - 9, cx + 9, ly - 8, 8);

  // ---------------------------------------------------------- claw arm (facing right)
  const sx = 32,
    sy = 27;
  const tip = P.clawOpen ? 1 : 0;
  if (P.arm === 'rest') {
    s.line(sx, sy, sx + 5, sy + 5, 8, 2);
    s.line(sx + 1, sy, sx + 5, sy + 4, 7);
    s.circle(sx + 5, sy + 6, 1, 7);
    s.line(sx + 5, sy + 6, sx + 7, sy + 12, 8, 2);
    // claw prongs hanging down
    s.line(sx + 6, sy + 13, sx + 4 - tip, sy + 16, 7);
    s.line(sx + 8, sy + 13, sx + 10 + tip, sy + 16, 7);
    s.plot(sx + 4 - tip, sy + 17, 15);
    s.plot(sx + 10 + tip, sy + 17, 15);
    s.rect(sx + 6, sy + 12, 3, 2, 8);
  } else {
    s.line(sx, sy, sx + 6, sy - 3, 8, 2);
    s.line(sx + 1, sy - 1, sx + 6, sy - 4, 7);
    s.circle(sx + 7, sy - 3, 1, 7);
    s.line(sx + 7, sy - 3, sx + 14, sy - 2, 8, 2);
    s.hline(sx + 8, sx + 13, sy - 3, 7);
    s.rect(sx + 14, sy - 4, 2, 4, 8);
    if (P.clawOpen) {
      s.lines([sx + 16, sy - 4, sx + 18, sy - 7, sx + 20, sy - 6], 7);
      s.lines([sx + 16, sy - 1, sx + 18, sy + 2, sx + 20, sy + 1], 7);
      s.plot(sx + 20, sy - 6, 15);
      s.plot(sx + 20, sy + 1, 15);
    } else {
      s.lines([sx + 16, sy - 4, sx + 19, sy - 4, sx + 19, sy - 3], 7);
      s.lines([sx + 16, sy - 1, sx + 19, sy - 1, sx + 19, sy - 2], 7);
      s.plot(sx + 19, sy - 3, 15);
    }
  }
  // shoulder joint
  s.circle(sx, sy, 2, 8);
  s.plot(sx - 1, sy - 1, 15);
  s.plot(sx, sy, 7);
}

/** Things that must not be mirrored (text, the eye's gaze), painted in final orientation. */
function paintGcDecals(s: Surface, cx: number, P: GcPose) {
  const top = 20;
  // "GC" plate
  s.rect(cx - 6, top + 4, 12, 7, 15);
  s.frame(cx - 6, top + 4, 12, 7, 8);
  s.micro(cx - 4, top + 5, 'GC', 4);
  // status LEDs
  s.plot(cx + 8, top + 6, P.alarm ? 12 : 10);
  s.plot(cx + 8, top + 8, P.bulb ? 14 : 6);
  // the eye, scanning along the visor
  const ly = 19 - Math.round(P.lid);
  const ex = cx + Math.max(-7, Math.min(7, Math.round(P.eye)));
  if (P.alarm) {
    s.hline(cx - 9, cx + 9, ly - 6, 4);
    s.rect(ex - 2, ly - 7, 5, 3, 12);
    s.hline(ex - 1, ex + 1, ly - 6, 15);
  } else {
    s.rect(ex - 1, ly - 7, 3, 2, 12);
    s.plot(ex - 1, ly - 7, 15);
    s.plot(ex, ly - 5, 4);
  }
}

const gcCache = new Map<string, Img>();
/** The Garbage Collector for a pose, facing left or right. */
export function gcImg(P: GcPose, faceLeft: boolean): Img {
  const key = `${P.tread}|${Math.round(P.eye)}|${P.arm}|${P.clawOpen}|${Math.round(P.lid)}|${P.alarm}|${P.bulb}|${faceLeft}`;
  let img = gcCache.get(key);
  if (!img) {
    let base = paintImg(GC_W, GC_H, GC_OX, GC_OY, (s) => paintGc(s, P));
    if (faceLeft) base = flipImg(base);
    const s = new Surface(GC_W, GC_H);
    s.px.set(base.data);
    s.writePri = false;
    paintGcDecals(s, faceLeft ? GC_W - 1 - GC_OX : GC_OX, P);
    img = { w: GC_W, h: GC_H, data: s.px, ox: base.ox, oy: base.oy };
    gcCache.set(key, img);
  }
  return img;
}

// =================================================================== the ghost process (PID 1991)

export interface GhostPose {
  /** tail wave phase 0..3 */
  wave: number;
  mouth: 0 | 1 | 2;
  /** arms: 0 = clutching head, 1 = flailing up */
  arms: 0 | 1;
  /** 0 = solid, 1 = translucent, 2 = very faint */
  fade: 0 | 1 | 2;
  happy?: boolean;
}

const GH_W = 30,
  GH_H = 40;

function paintGhost(s: Surface, P: GhostPose) {
  const cx = 15;
  const headTop = 3;
  // body silhouette, row by row
  const rows: [number, number][] = [];
  for (let y = headTop; y <= 34; y++) {
    let hw: number;
    const d = y - headTop;
    if (d < 9) hw = Math.round(Math.sqrt(1 - ((9 - d) / 9.5) ** 2) * 9.5);
    else hw = 9 + Math.round((d - 9) / 8);
    rows.push([y, hw]);
  }
  for (const [y, hw] of rows) {
    for (let x = cx - hw; x <= cx + hw; x++) {
      // wavy tail
      if (y > 28) {
        const k = (x - (cx - hw) + P.wave * 2) % 8;
        const depth = k < 4 ? k : 8 - k;
        if (y - 28 > depth + 2) continue;
      }
      const u = (x - (cx - hw)) / (hw * 2 || 1);
      let c = 15;
      if (u > 0.72) c = bayerAt(x, y) < 9 ? 7 : 15;
      if (u > 0.88) c = 7;
      if (u < 0.08) c = 11;
      if (y > 24) c = bayerAt(x, y) < (y - 24) * 2 ? 11 : c;
      // translucency
      if (P.fade === 1 && y > 20 && (x + y) % 2 === 0) continue;
      if (P.fade === 2 && (x + y) % 2 === 0) continue;
      if (P.fade === 2 && y > 18 && bayerAt(x, y) < 8) continue;
      s.plot(x, y, c);
    }
  }
  // ---- face
  const ey = headTop + 8;
  if (P.happy) {
    // ^ ^ eyes
    s.plot(cx - 5, ey + 1, 1);
    s.plot(cx - 4, ey, 1);
    s.plot(cx - 3, ey + 1, 1);
    s.plot(cx + 3, ey + 1, 1);
    s.plot(cx + 4, ey, 1);
    s.plot(cx + 5, ey + 1, 1);
    s.hline(cx - 2, cx + 2, ey + 6, 1);
    s.plot(cx - 3, ey + 5, 1);
    s.plot(cx + 3, ey + 5, 1);
  } else {
    // anguished brows slanting up toward the middle
    s.line(cx - 7, ey - 2, cx - 2, ey - 5, 8);
    s.line(cx + 7, ey - 2, cx + 2, ey - 5, 8);
    // hollow, haunted eyes
    s.rect(cx - 6, ey - 2, 4, 5, 0);
    s.rect(cx + 3, ey - 2, 4, 5, 0);
    s.plot(cx - 5, ey - 1, 9);
    s.plot(cx + 4, ey - 1, 9);
    s.plot(cx - 6, ey + 4, 7);
    s.plot(cx + 6, ey + 4, 7);
    // wailing mouth
    const mh = P.mouth === 2 ? 6 : P.mouth === 1 ? 4 : 3;
    s.ellipse(cx, ey + 6 + (mh >> 1), 2 + (P.mouth === 2 ? 1 : 0), mh >> 1, 0);
    s.plot(cx, ey + 6 + mh - 1, 4);
  }
  // ---- arms
  if (P.arms === 0) {
    // clutching its head in despair
    s.lines([cx - 9, ey + 10, cx - 14, ey + 4, cx - 12, ey - 2, cx - 9, ey - 4], 11);
    s.lines([cx - 10, ey + 10, cx - 13, ey + 4, cx - 11, ey - 2], 15);
    s.lines([cx + 9, ey + 10, cx + 14, ey + 4, cx + 12, ey - 2, cx + 9, ey - 4], 11);
    s.lines([cx + 10, ey + 10, cx + 13, ey + 4, cx + 11, ey - 2], 7);
  } else {
    // flailing up in the air
    s.lines([cx - 9, ey + 10, cx - 13, ey + 2, cx - 14, ey - 6], 11);
    s.lines([cx - 10, ey + 10, cx - 12, ey + 2, cx - 13, ey - 6], 15);
    s.lines([cx + 9, ey + 10, cx + 13, ey + 2, cx + 14, ey - 6], 11);
    s.lines([cx + 10, ey + 10, cx + 12, ey + 2, cx + 13, ey - 6], 7);
    s.plot(cx - 14, ey - 7, 15);
    s.plot(cx + 14, ey - 7, 15);
  }
}

const ghCache = new Map<string, Img>();
export function ghostImg(P: GhostPose): Img {
  const key = `${P.wave}|${P.mouth}|${P.arms}|${P.fade}|${!!P.happy}`;
  let img = ghCache.get(key);
  if (!img) {
    img = paintImg(GH_W, GH_H, 15, GH_H - 1, (s) => paintGhost(s, P));
    ghCache.set(key, img);
  }
  return img;
}

/** Vim's empty-buffer tildes ("~") trailing under the ghost. */
export function tilde(s: Surface, x: number, y: number, c: number) {
  s.plot(x + 1, y, c);
  s.plot(x + 2, y, c);
  s.plot(x + 4, y, c);
  s.plot(x, y + 1, c);
  s.plot(x + 3, y + 1, c);
}

// =================================================================== floppy-disk throne

/** Stack of floppy disks seen edge-on: dark stripes with shutter glints and the odd label. */
function floppyStack(s: Surface, x: number, y: number, w: number, h: number, seed: number) {
  const cols = [1, 0, 8, 1, 0, 4, 0, 1, 8, 0];
  const hi: Record<number, number> = { 0: 8, 1: 9, 8: 7, 4: 12 };
  for (let i = 0; i < h; i += 2) {
    const k = i / 2 + seed;
    const c = cols[k % cols.length];
    const off = ((k * 5) % 3) - 1;
    s.rect(x + off, y + i, w, 2, c);
    s.hline(x + off, x + off + w - 1, y + i, hi[c] ?? 7);
    // metal shutter edge + a sliver of label
    const sx = x + off + ((k * 7) % Math.max(1, w - 6)) + 1;
    s.hline(sx, sx + 3, y + i + 1, 7);
    if (k % 3 === 0) s.plot(x + off + w - 3, y + i + 1, k % 2 ? 14 : 15);
  }
}

/**
 * King Kernel's throne. (cx, by) = where the seated King's feet are.
 * Drawn every frame so it can bob.
 */
export function drawThrone(s: Surface, cx: number, by: number, t: number, layer: 'back' | 'front' = 'back') {
  if (layer === 'front') {
    // the seat's front edge, drawn over the King's thighs so he sits IN the throne
    floppyStack(s, cx - 15, by - 11, 31, 4, 5);
    s.hline(cx - 16, cx + 16, by - 12, 14);
    s.plot(cx - 16, by - 11, 6);
    s.plot(cx + 16, by - 11, 6);
    return;
  }
  // ---- thruster glow and sparks under the base
  const gy = by + 6;
  const pulse = (t >> 3) % 4;
  s.ellipse(cx, gy, 12, 2, 1);
  s.ellipse(cx, gy, 9, 1, pulse < 2 ? 9 : 3);
  s.hline(cx - 5, cx + 5, gy, pulse === 0 ? 15 : 11);
  for (let i = 0; i < 6; i++) {
    const k = (t + i * 11) % 28;
    const sx = cx - 9 + ((i * 7) % 19);
    if (k < 20) s.plot(sx, gy + 2 + (k >> 1), k < 10 ? 11 : 3);
  }
  // ---- backrest: a giant 3.5" floppy, upright, trimmed in gold
  const bx = cx - 16,
    bt = by - 46,
    bw = 33,
    bh = 36;
  s.rect(bx - 1, bt - 1, bw + 2, bh + 2, 6);
  s.hline(bx - 1, bx + bw, bt - 1, 14);
  s.vline(bx - 1, bt - 1, bt + bh, 14);
  s.rect(bx, bt, bw, bh, 1);
  for (let y = bt + 1; y < bt + bh - 1; y++)
    for (let x = bx + 1; x < bx + bw - 1; x++) if (bayerAt(x, y) < 4 + ((y - bt) >> 3)) s.plot(x, y, 0);
  s.hline(bx, bx + bw - 1, bt, 9);
  s.vline(bx, bt, bt + bh - 1, 9);
  // chamfered corner (top right)
  s.plot(bx + bw - 1, bt, 6);
  s.plot(bx + bw, bt, 0);
  s.plot(bx + bw, bt - 1, 0);
  s.plot(bx + bw - 1, bt - 1, 0);
  // write-protect notch
  s.rect(bx + 2, bt + bh - 6, 3, 3, 0);
  s.plot(bx + 3, bt + bh - 5, 8);
  s.rect(bx + bw - 5, bt + bh - 6, 3, 3, 0);
  // the label, with his name on it
  s.rect(cx - 12, bt + 3, 25, 10, 15);
  s.hline(cx - 12, cx + 12, bt + 3, 12);
  s.hline(cx - 12, cx + 12, bt + 12, 7);
  s.micro(cx - 11, bt + 6, 'KERNEL', 1);
  // ---- armrests: stacks of floppies, capped with a flat diskette
  floppyStack(s, cx - 23, by - 21, 8, 13, 0);
  floppyStack(s, cx + 15, by - 21, 8, 13, 3);
  s.rect(cx - 25, by - 23, 11, 2, 4);
  s.hline(cx - 25, cx - 15, by - 23, 12);
  s.rect(cx + 14, by - 23, 11, 2, 4);
  s.hline(cx + 14, cx + 24, by - 23, 12);
  s.plot(cx - 20, by - 22, 14);
  s.plot(cx + 19, by - 22, 14);
  // ---- seat + base
  floppyStack(s, cx - 15, by - 11, 31, 4, 5);
  s.hline(cx - 16, cx + 16, by - 12, 14);
  floppyStack(s, cx - 12, by - 7, 25, 6, 2);
  floppyStack(s, cx - 9, by - 1, 19, 4, 7);
}

// =================================================================== the Oracle's face

export interface OracleState {
  /** -1..1, where the pupils look */
  look: number;
  /** mouth open amount 0..3 */
  mouth: number;
  blink: boolean;
  /** brightness boost (when speaking) */
  glow: boolean;
  /** frown (before you have reputation) */
  stern: boolean;
}

/**
 * The Oracle's face on a green-phosphor CRT screen (x,y,w,h = the glass).
 * Painted every frame (it blinks, looks at you and talks). The face is laid
 * out on a 50x34 design grid and scaled to the glass.
 */
export function drawOracleScreen(s: Surface, x: number, y: number, w: number, h: number, t: number, st: OracleState) {
  const k = h / 34;
  const cx = x + Math.floor(w / 2);
  const X = (dx: number) => Math.round(cx + dx * k);
  const Y = (dy: number) => Math.round(y + dy * k);
  const roll = (t >> 1) % (h + 24);
  const B = 10, // bright phosphor
    M = 2, // mid phosphor
    K = 0; // black
  const R = 17 * k;
  const fcy = y + 15 * k;
  // face shape: a broad oval with a long beard
  const faceAt = (xx: number, yy: number) => {
    const dx = (xx - cx) / R,
      dy = (yy - fcy) / R;
    if (dx * dx + dy * dy < 1) return true;
    const by = (yy - (y + 24 * k)) / k;
    return by >= 0 && Math.abs(xx - cx) / k < 12 - by * 0.9;
  };
  for (let yy = 0; yy < h; yy++) {
    const YY = y + yy;
    const scan = yy % 2 === 1;
    const inRoll = Math.abs(yy - roll + 12) < 3;
    for (let xx = 0; xx < w; xx++) {
      const XX = x + xx;
      let c = K;
      if (faceAt(XX, YY)) {
        const lx = (XX - cx) / R,
          ly = (YY - (y + 10 * k)) / (14 * k);
        const light = 1 - (lx + 0.3) ** 2 * 0.7 - ly * ly * 0.5;
        const lv = light * 26 - 4;
        c = bayerAt(XX, YY) < Math.max(0, Math.min(16, lv)) ? M : K;
        if (lv > 19 && bayerAt(XX, YY) < (lv - 19) * 2) c = B; // highlight
        if (YY > y + 25 * k) c = bayerAt(XX, YY) < 9 ? M : K; // beard texture
      } else if (bayerAt(XX, YY) < (st.glow ? 3 : 1)) c = M;
      if (scan && c === M && !inRoll) c = bayerAt(XX, YY) < 8 ? M : K;
      if (inRoll && c === K && bayerAt(XX, YY) < 4) c = M;
      s.plot(XX, YY, c);
    }
  }
  // outline of the face
  for (let a = 0; a < Math.PI * 2; a += 0.03) {
    const px = Math.round(cx + Math.cos(a) * R),
      py = Math.round(fcy + Math.sin(a) * R);
    if (py < y + 25 * k && py >= y) s.plot(px, py, B);
  }
  // beard strands
  for (let i = -3; i <= 3; i++) s.line(X(i * 3), Y(25), X(i * 2), Math.min(y + h - 1, Y(33 - Math.abs(i))), i % 2 ? M : B);
  // eyes: dark sockets, bright whites, pupils that follow you
  const ey = Y(12);
  const look = Math.round(st.look * 2 * k);
  for (const ex of [X(-7), X(7)]) {
    const ew = Math.round(4.5 * k);
    s.ellipse(ex, ey + 1, ew + 1, 4, K);
    if (st.blink) {
      s.hline(ex - ew, ex + ew, ey + 1, B);
      s.hline(ex - ew + 1, ex + ew - 1, ey + 2, M);
      continue;
    }
    s.ellipse(ex, ey + 1, ew, 2, B);
    s.rect(ex - 2 + look, ey - 1, 4, 4, K);
    s.plot(ex - 1 + look, ey, 15);
  }
  // brows: bushy, wise and judgemental
  const bd = st.stern ? 1 : 0;
  s.line(X(-14), Y(7), X(-3), Y(5 + bd), B, 2);
  s.line(X(3), Y(5 + bd), X(14), Y(7), B, 2);
  s.line(X(-14), Y(8) + 1, X(-4), Y(6 + bd) + 1, M);
  s.line(X(4), Y(6 + bd) + 1, X(14), Y(8) + 1, M);
  // nose
  s.line(X(-1), ey + 2, X(-2), Y(19), K);
  s.line(X(1), ey + 1, X(2), Y(19), B);
  s.hline(X(-3), X(3), Y(20), K);
  s.plot(X(-3), Y(19), K);
  s.plot(X(3), Y(19), K);
  // moustache
  s.line(X(-8), Y(24), X(-1), Y(22), B, 2);
  s.line(X(8), Y(24), X(1), Y(22), B, 2);
  // mouth
  const my = Y(25);
  const m = Math.max(0, Math.min(3, Math.round(st.mouth)));
  const mw = Math.round(4 * k);
  if (m === 0) {
    s.hline(cx - mw, cx + mw, my, K);
    s.hline(cx - mw + 1, cx + mw - 1, my + 1, B);
    if (st.stern) {
      s.plot(cx - mw - 1, my + 1, K);
      s.plot(cx + mw + 1, my + 1, K);
    } else {
      s.plot(cx - mw - 1, my - 1, K);
      s.plot(cx + mw + 1, my - 1, K);
    }
  } else {
    const mh = Math.round(m * k);
    s.rect(cx - mw, my, mw * 2 + 1, mh + 1, K);
    s.hline(cx - mw, cx + mw, my - 1, B);
    s.hline(cx - mw + 1, cx + mw - 1, my + mh + 1, B);
    s.vline(cx - mw - 1, my, my + mh, B);
    s.vline(cx + mw + 1, my, my + mh, B);
  }
  // glass glare
  s.line(x + 2, y + 2, x + 6, y + 2, 15);
  s.plot(x + 2, y + 3, 15);
  s.plot(x + 2, y + 4, 7);
}

/** A soft dithered halo (used for glowing CRTs and portals). */
export function halo(s: Surface, cx: number, cy: number, rx: number, ry: number, color: number, strength = 6) {
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++) {
      const d = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2);
      if (d > 1) continue;
      const lvl = Math.round((1 - d) * strength);
      if (bayerAt(cx + x, cy + y) < lvl && s.get(cx + x, cy + y) === 0) s.plot(cx + x, cy + y, color);
    }
}

export { dith };
