// Walkable-area mask and A* pathfinding for click-to-walk.

export interface Pt {
  x: number;
  y: number;
}

const CELL = 2;

export class WalkMap {
  readonly w: number;
  readonly h: number;
  mask: Uint8Array;

  constructor(w: number, h: number, polys: number[][], blocks: number[][] = []) {
    this.w = w;
    this.h = h;
    this.mask = new Uint8Array(w * h);
    for (const p of polys) this.fillPoly(p, 1);
    for (const p of blocks) this.fillPoly(p, 0);
  }

  private fillPoly(pts: number[], v: number) {
    const n = pts.length / 2;
    if (n === 2) {
      // rectangle shorthand [x,y,w,h]
      const [x, y, w, h] = pts;
      for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++)
        for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) this.mask[yy * this.w + xx] = v;
      return;
    }
    let minY = Infinity,
      maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      minY = Math.min(minY, pts[i * 2 + 1]);
      maxY = Math.max(maxY, pts[i * 2 + 1]);
    }
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(this.h - 1, Math.ceil(maxY)); y++) {
      const sy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < n; i++) {
        const ax = pts[i * 2],
          ay = pts[i * 2 + 1];
        const j = (i + 1) % n;
        const bx = pts[j * 2],
          by = pts[j * 2 + 1];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.max(0, Math.round(xs[k]));
        const b = Math.min(this.w - 1, Math.round(xs[k + 1]));
        for (let x = a; x <= b; x++) this.mask[y * this.w + x] = v;
      }
    }
  }

  /** Mark a polygon/rect walkable or not at runtime (e.g. an NPC moved). */
  set(pts: number[], walkable: boolean) {
    this.fillPoly(pts, walkable ? 1 : 0);
  }

  ok(x: number, y: number): boolean {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.mask[y * this.w + x] === 1;
  }

  nearest(x: number, y: number, maxR = 200): Pt | null {
    x = Math.round(x);
    y = Math.round(y);
    if (this.ok(x, y)) return { x, y };
    for (let r = 1; r < maxR; r++) {
      let best: Pt | null = null;
      let bd = Infinity;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.ok(x + dx, y + dy)) {
            const d = dx * dx + dy * dy * 1.5;
            if (d < bd) {
              bd = d;
              best = { x: x + dx, y: y + dy };
            }
          }
        }
      if (best) return best;
    }
    return null;
  }

  lineClear(x0: number, y0: number, x1: number, y1: number): boolean {
    const dx = x1 - x0,
      dy = y1 - y0;
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      if (!this.ok(x0 + dx * t, y0 + dy * t)) return false;
    }
    return true;
  }

  /** A* over a coarse grid, returns smoothed waypoints (excluding start). */
  findPath(sx: number, sy: number, tx: number, ty: number): Pt[] | null {
    const t = this.nearest(tx, ty);
    if (!t) return null;
    const s = this.ok(sx, sy) ? { x: Math.round(sx), y: Math.round(sy) } : this.nearest(sx, sy);
    if (!s) return null;
    if (this.lineClear(s.x, s.y, t.x, t.y)) return [t];
    const gw = Math.ceil(this.w / CELL),
      gh = Math.ceil(this.h / CELL);
    const cellOk = (cx: number, cy: number) => this.ok(cx * CELL + (CELL >> 1), cy * CELL + (CELL >> 1)) || this.ok(cx * CELL, cy * CELL);
    const scx = Math.floor(s.x / CELL),
      scy = Math.floor(s.y / CELL);
    const tcx = Math.floor(t.x / CELL),
      tcy = Math.floor(t.y / CELL);
    const N = gw * gh;
    const gScore = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap: [number, number][] = [];
    const push = (f: number, i: number) => {
      heap.push([f, i]);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p][0] <= heap[k][0]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = k * 2 + 1,
            r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    const si = scy * gw + scx;
    const ti = tcy * gw + tcx;
    gScore[si] = 0;
    push(0, si);
    const h = (i: number) => {
      const x = i % gw,
        y = (i / gw) | 0;
      return Math.hypot(x - tcx, (y - tcy) * 1.3);
    };
    let found = false;
    let iter = 0;
    while (heap.length && iter++ < 60000) {
      const [, cur] = pop();
      if (closed[cur]) continue;
      if (cur === ti) {
        found = true;
        break;
      }
      closed[cur] = 1;
      const cx = cur % gw,
        cy = (cur / gw) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx,
            ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const ni = ny * gw + nx;
          if (closed[ni] || (!cellOk(nx, ny) && ni !== ti)) continue;
          if (dx && dy && (!cellOk(cx + dx, cy) || !cellOk(cx, cy + dy))) continue;
          const ng = gScore[cur] + (dx && dy ? 1.414 : 1) * (dy ? 1.3 : 1);
          if (ng < gScore[ni]) {
            gScore[ni] = ng;
            came[ni] = cur;
            push(ng + h(ni), ni);
          }
        }
    }
    if (!found) return null;
    const raw: Pt[] = [];
    for (let i = ti; i !== -1 && i !== si; i = came[i]) {
      raw.push({ x: (i % gw) * CELL + (CELL >> 1), y: ((i / gw) | 0) * CELL + (CELL >> 1) });
    }
    raw.reverse();
    raw.push(t);
    // string-pull smoothing
    const out: Pt[] = [];
    let ax = s.x,
      ay = s.y;
    let k = 0;
    while (k < raw.length) {
      let far = k;
      for (let j = raw.length - 1; j > k; j--) {
        if (this.lineClear(ax, ay, raw[j].x, raw[j].y)) {
          far = j;
          break;
        }
      }
      const p = raw[far];
      const q = this.ok(p.x, p.y) ? p : this.nearest(p.x, p.y) ?? p;
      out.push(q);
      ax = q.x;
      ay = q.y;
      k = far + 1;
    }
    return out;
  }
}
