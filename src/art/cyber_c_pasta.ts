// Spaghetti Forest scenery: noodle trees, meatballs ("global variables"),
// twirled pasta canopies and the tangle that refactors into a neat path.
import { Surface, rng } from '../engine/raster';

const NOODLE = 14;
const NOODLE_SH = 6;

/** A meatball. */
export function meatball(p: Surface, x: number, y: number, r = 3) {
  p.circle(x, y, r, 4);
  p.circle(x - 1, y - 1, Math.max(1, r - 2), 12);
  p.plot(x - 1, y - r + 1, 15);
  p.plot(x + r - 1, y + 1, 0);
  if (r >= 3) {
    p.plot(x + 1, y + r - 1, 0);
    p.plot(x - 2, y + 1, 6);
  }
}

/** A noodle: a polyline through points, with an optional darker underside (thick = 2px noodle). */
export function noodle(p: Surface, pts: number[], c = NOODLE, under = -1, thick = false) {
  if (thick) {
    const sh = under >= 0 ? under : NOODLE_SH;
    for (let i = 0; i + 3 < pts.length; i += 2) p.line(pts[i] + 1, pts[i + 1] + 1, pts[i + 2] + 1, pts[i + 3] + 1, sh);
    p.lines(pts, c);
    return;
  }
  if (under >= 0) for (let i = 0; i + 3 < pts.length; i += 2) p.line(pts[i], pts[i + 1] + 1, pts[i + 2], pts[i + 3] + 1, under);
  p.lines(pts, c);
}

/** Spaghetti twirled as if around a fork: a flattened spiral nest. */
export function twirl(p: Surface, cx: number, cy: number, r: number, seed: number, flat = 0.6) {
  const rr = rng(seed);
  const turns = 2.2 + rr() * 1.2;
  const ph = rr() * Math.PI * 2;
  let px = cx,
    py = cy;
  const steps = Math.round(turns * 22);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const a = ph + t * turns * Math.PI * 2;
    const rad = r * (0.25 + 0.75 * t);
    const x = cx + Math.cos(a) * rad,
      y = cy + Math.sin(a) * rad * flat;
    const back = Math.sin(a) < -0.2;
    p.line(px, py, x, y, back ? NOODLE_SH : NOODLE);
    px = x;
    py = y;
  }
  // a loose end hanging down
  let hx = px,
    hy = py;
  const len = 4 + rr() * 10;
  for (let i = 1; i <= 6; i++) {
    const x = px + Math.sin(i * 1.3 + ph) * 2,
      y = py + (len * i) / 6;
    p.line(hx, hy, x, y, NOODLE);
    hx = x;
    hy = y;
  }
}

export interface TreeOpts {
  strands?: number;
  /** half-width of the trunk */
  trunk?: number;
  /** canopy radius */
  crown?: number;
  meatballs?: number;
  /** colours [main, shade] (distant trees are darker) */
  cols?: [number, number];
  /** 2px noodles (foreground trees) */
  thick?: boolean;
}

/** A noodle tree. (x, base) = foot of the trunk; h = total height. */
export function noodleTree(p: Surface, x: number, base: number, h: number, seed: number, o: TreeOpts = {}) {
  const r = rng(seed);
  const n = o.strands ?? 10;
  const tw = o.trunk ?? 4;
  const crown = o.crown ?? h * 0.42;
  const [c1, c2] = o.cols ?? [NOODLE, NOODLE_SH];
  const crownY = base - h + crown * 0.7;
  // trunk strands: splayed roots -> narrow trunk -> fanning into the crown
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1
    const rootX = x + u * tw * 3.2 + (r() - 0.5) * 3;
    const ph = r() * 6.28;
    const amp = 0.8 + r() * 1.4;
    const pts: number[] = [rootX, base + (r() * 2 - 1)];
    const segs = 16;
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const y = base - (base - crownY) * t;
      // narrow toward the middle of the trunk, flaring a little at the top
      const spread = t < 0.25 ? 1 - t * 2.6 : 0.35 + (t - 0.25) * 0.5;
      const xx = x + u * tw * 3.2 * spread + Math.sin(t * 9 + ph) * amp;
      pts.push(xx, y);
    }
    // fan out into the crown
    const fanA = -Math.PI / 2 + u * 1.3 + (r() - 0.5) * 0.4;
    const lx = pts[pts.length - 2],
      ly = pts[pts.length - 1];
    pts.push(lx + Math.cos(fanA) * crown * 0.45, ly + Math.sin(fanA) * crown * 0.35);
    noodle(p, pts, i % 3 === 1 ? c2 : c1, i % 2 ? c2 : -1, o.thick);
  }
  // crown: overlapping twirls
  const nests = Math.round(crown / 4);
  for (let i = 0; i < nests; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * crown * 0.75;
    twirl(p, x + Math.cos(a) * d * 1.25, base - h + crown * 0.6 + Math.sin(a) * d * 0.55, 4 + r() * crown * 0.25, Math.floor(r() * 1e6));
  }
  // willow-like hanging strands from the crown's edge
  for (let i = 0; i < Math.round(crown / 3); i++) {
    const a = (r() - 0.5) * 2.6;
    const sx = x + Math.sin(a) * crown * 1.1;
    const sy = base - h + crown * 0.75 + Math.cos(a) * crown * 0.25;
    const len = 6 + r() * crown * 0.7;
    const pts: number[] = [sx, sy];
    for (let s = 1; s <= 6; s++) pts.push(sx + Math.sin(s * 1.1 + i) * 1.5, sy + (len * s) / 6);
    noodle(p, pts, r() < 0.5 ? c1 : c2, -1, o.thick && r() < 0.5);
  }
  // global variables hide in the crown
  const mb = o.meatballs ?? 2;
  for (let i = 0; i < mb; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * crown * 0.6;
    meatball(p, Math.round(x + Math.cos(a) * d * 1.2), Math.round(base - h + crown * 0.6 + Math.sin(a) * d * 0.5), 2 + Math.round(r() * 2));
  }
}

// ------------------------------------------------------------------ the tangle / the neat path

interface Strand {
  /** tangled control points */
  t: number[];
  /** neat (refactored) control points */
  n: number[];
  c: number;
}

let strands: Strand[] | null = null;

function buildStrands(): Strand[] {
  const r = rng(1989);
  const out: Strand[] = [];
  const N = 30;
  for (let i = 0; i < N; i++) {
    const t: number[] = [];
    const bridge = i % 3 === 2;
    const ph1 = r() * 6.28,
      ph2 = r() * 6.28,
      ph3 = r() * 6.28;
    const fx = 0.6 + r() * 1.2,
      fy = 0.7 + r() * 1.3,
      f3 = 2 + r() * 2;
    for (let s = 0; s <= 24; s++) {
      const u = s / 24;
      if (bridge) {
        // a strand slung from one tree to the other, knotting through the middle
        const x = 112 + u * 100 + Math.sin(u * 6.28 * f3 + ph1) * 10 * Math.sin(u * Math.PI);
        const y = 74 + r() * 4 + Math.sin(u * Math.PI) * (16 + r() * 20) + Math.sin(u * 6.28 * fy + ph2) * 8;
        t.push(x, Math.min(124, y));
        continue;
      }
      let a = Math.sin(u * 6.28 * fx + ph1) * 0.75 + Math.sin(u * 6.28 * f3 + ph3) * 0.3;
      let b = Math.cos(u * 6.28 * fy + ph2) * 0.8 + Math.sin(u * 6.28 * f3 + ph1) * 0.25;
      const m = Math.hypot(a, b);
      if (m > 1) {
        a /= m;
        b /= m;
      }
      // flat bottom: the tangle sits on the ground
      t.push(160 + a * 42, Math.min(124, 94 + b * 30));
    }
    // neat: two tidy pillars flanking the path, plus straight rails along it
    const n: number[] = [];
    const kind = i % 3;
    if (kind < 2) {
      const side = kind === 0 ? -1 : 1;
      const col = Math.floor(i / 3);
      const px = 160 + side * (20 + (col % 6) * 1.5);
      for (let s = 0; s <= 24; s++) n.push(px, 66 + (s / 24) * (118 - 66));
    } else {
      const col = Math.floor(i / 3);
      const side = col % 2 ? -1 : 1;
      const off = Math.floor(col / 2);
      for (let s = 0; s <= 24; s++) {
        const u = s / 24;
        const y = 122 - u * 20 - off;
        const d = (y - 96) / 26;
        n.push(160 + side * (8 + 10 * d + off * 0.5), y);
      }
    }
    out.push({ t, n, c: Math.floor(i / 3) % 3 === 1 ? NOODLE_SH : NOODLE });
  }
  return out;
}

/** The tangle blocking the north path; k = 1 fully tangled, 0 = refactored. */
export function tangle(p: Surface, k: number) {
  if (!strands) strands = buildStrands();
  const e = k * k * (3 - 2 * k); // smoothstep
  for (const st of strands) {
    const pts: number[] = [];
    for (let i = 0; i < st.t.length; i++) pts.push(st.n[i] + (st.t[i] - st.n[i]) * e);
    noodle(p, pts, st.c);
  }
  // meatballs: tangled in the mess -> lined up neatly on the pillar tops
  const mbT = [
    [140, 74],
    [176, 92],
    [158, 108],
    [184, 66],
  ];
  const mbN = [
    [138, 62],
    [182, 62],
    [146, 62],
    [174, 62],
  ];
  for (let i = 0; i < 4; i++) {
    const x = mbN[i][0] + (mbT[i][0] - mbN[i][0]) * e,
      y = mbN[i][1] + (mbT[i][1] - mbN[i][1]) * e;
    meatball(p, Math.round(x), Math.round(y), 3);
  }
}
