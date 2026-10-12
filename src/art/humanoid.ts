// Parametric pixel-art humanoid generator. Every person in the game is built
// from the same skeleton so the cast shares one consistent Sierra-esque look,
// while hair, clothing, build and accessories make each one distinct.

import { Img, makeImg, flipImg } from '../engine/raster';
import { Anim, SpriteSet } from '../engine/actor';

export type HairStyle = 'short' | 'long' | 'bald' | 'curly' | 'spiky' | 'cap' | 'bun' | 'none';

export interface Look {
  skin: number;
  skinShade: number;
  hair: number;
  hairStyle: HairStyle;
  capColor?: number;
  beard?: number; // beard color
  longBeard?: boolean;
  mustache?: number;
  glasses?: number; // frame color
  shirt: number;
  shirtShade: number;
  sleeves?: 'long' | 'short';
  coat?: { color: number; shade: number; long?: boolean };
  tie?: number;
  collar?: number;
  hoodie?: boolean;
  lanyard?: number;
  suspenders?: number;
  headphones?: number;
  pants: number;
  pantsShade: number;
  shoes: number;
  mouth?: number;
  eyes?: number;
  height?: number; // extra leg rows (-3..3)
  build?: 'thin' | 'normal' | 'wide';
  crown?: number;
  belt?: number;
  /** stripe/pattern pixel color on shirt (e.g. hoodie logo) */
  logo?: number;
}

const W = 19;
const CX = 9;

class Painter {
  img: Img;
  constructor(h: number) {
    this.img = makeImg(W, h, CX, h - 1);
  }
  px(x: number, y: number, c: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.img.w || y >= this.img.h || c < 0) return;
    this.img.data[y * this.img.w + x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.px(x + xx, y + yy, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number, thick = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      if (thick === 1) this.px(x, y, c);
      else if (thick === 2) this.rect(x, y, 2, 1, c), this.px(x, y + 1, c);
      else this.rect(x - 1, y, 3, 1, c);
    }
  }
  /** stamp a template; chars map through key; '.' transparent */
  stamp(x: number, y: number, rows: string[], key: Record<string, number>) {
    for (let r = 0; r < rows.length; r++)
      for (let c = 0; c < rows[r].length; c++) {
        const ch = rows[r][c];
        if (ch === '.') continue;
        const col = key[ch];
        if (col !== undefined && col >= 0) this.px(x + c, y + r, col);
      }
  }
}

// ---------------------------------------------------------------- heads
// 9 columns wide. H hair, h hair-shade, S skin, s skin-shade, E eye, M mouth,
// C cap, c cap brim. Front templates are mirrored-symmetric.
const HEADS: Record<HairStyle, { front: string[]; side: string[]; back: string[] }> = {
  short: {
    front: ['..HHHHH..', '.HHHHHHH.', '.HSSSSSH.', '.SESSSES.', '.SSSSSSS.', '.SSSsSSS.', '..SMMMS..', '...SSS...'],
    side: ['...HHHH..', '..HHHHHH.', '.HHHHSSS.', '.HHHSSES.', '.HHSSSSSS', '..HSSSSS.', '...SSSMS.', '....SSS..'],
    back: ['..HHHHH..', '.HHHHHHH.', '.HHHHHHH.', '.HHHHHHH.', '.HHHHHHH.', '.SHHHHHS.', '..HHHHH..', '...SSS...'],
  },
  spiky: {
    front: ['.H.HHH.H.', '.HHHHHHH.', '.HSSSSSH.', '.SESSSES.', '.SSSSSSS.', '.SSSsSSS.', '..SMMMS..', '...SSS...'],
    side: ['..H.H.H..', '.HHHHHHH.', '.HHHHSSS.', '.HHHSSES.', '.HHSSSSSS', '..HSSSSS.', '...SSSMS.', '....SSS..'],
    back: ['.H.HHH.H.', '.HHHHHHH.', '.HHHHHHH.', '.HHHHHHH.', '.HHHHHHH.', '.SHHHHHS.', '..HHHHH..', '...SSS...'],
  },
  long: {
    front: ['..HHHHH..', '.HHHHHHH.', 'HHSSSSSHH', 'HSESSSESH', 'HSSSSSSSH', 'HSSSsSSSH', 'HHSMMMSHH', 'HH.SSS.HH'],
    side: ['...HHHH..', '..HHHHHH.', '.HHHHSSS.', 'HHHHSSES.', 'HHHSSSSSS', 'HHHSSSSS.', 'HHH.SSMS.', 'HHH..SSS.'],
    back: ['..HHHHH..', '.HHHHHHH.', 'HHHHHHHHH', 'HHHHHHHHH', 'HHHHHHHHH', 'HHHHHHHHH', 'HHHHHHHHH', 'HHHHHHHHH'],
  },
  bald: {
    front: ['..SSSSS..', '.SSSSSSS.', '.HSSSSSH.', '.SESSSES.', '.SSSSSSS.', '.SSSsSSS.', '..SMMMS..', '...SSS...'],
    side: ['...SSSS..', '..SSSSSS.', '.SSSSSSS.', '.HHSSSES.', '.HHSSSSSS', '..HSSSSS.', '...SSSMS.', '....SSS..'],
    back: ['..SSSSS..', '.SSSSSSS.', '.SSSSSSS.', '.HHHHHHH.', '.HHHHHHH.', '.HHHHHHH.', '..HHHHH..', '...SSS...'],
  },
  curly: {
    front: ['.HHHHHHH.', 'HHHHHHHHH', 'HHSSSSSHH', 'HSESSSESH', '.SSSSSSS.', '.SSSsSSS.', '..SMMMS..', '...SSS...'],
    side: ['.HHHHHH..', 'HHHHHHHH.', 'HHHHHSSS.', 'HHHHSSES.', 'HHHSSSSSS', '.HHSSSSS.', '...SSSMS.', '....SSS..'],
    back: ['.HHHHHHH.', 'HHHHHHHHH', 'HHHHHHHHH', 'HHHHHHHHH', 'HHHHHHHHH', '.HHHHHHH.', '..HHHHH..', '...SSS...'],
  },
  cap: {
    front: ['..CCCCC..', '.CCCCCCC.', '.ccccccc.', '.SESSSES.', '.SSSSSSS.', '.SSSsSSS.', '..SMMMS..', '...SSS...'],
    side: ['...CCCC..', '..CCCCCC.', '.HCCCCCcc', '.HHHSSES.', '.HHSSSSSS', '..HSSSSS.', '...SSSMS.', '....SSS..'],
    back: ['..CCCCC..', '.CCCCCCC.', '.CCcccCC.', '.HHHHHHH.', '.HHHHHHH.', '.SHHHHHS.', '..HHHHH..', '...SSS...'],
  },
  bun: {
    front: ['...HHH...', '.HHHHHHH.', '.HSSSSSH.', '.SESSSES.', '.SSSSSSS.', '.SSSsSSS.', '..SMMMS..', '...SSS...'],
    side: ['.HH.HHH..', 'HHHHHHHH.', '.HHHHSSS.', '.HHHSSES.', '.HHSSSSSS', '..HSSSSS.', '...SSSMS.', '....SSS..'],
    back: ['...HHH...', '.HHHHHHH.', '.HHHHHHH.', '.HHHHHHH.', '.HHHHHHH.', '.SHHHHHS.', '..HHHHH..', '...SSS...'],
  },
  none: {
    front: ['..SSSSS..', '.SSSSSSS.', '.SSSSSSS.', '.SESSSES.', '.SSSSSSS.', '.SSSsSSS.', '..SMMMS..', '...SSS...'],
    side: ['...SSSS..', '..SSSSSS.', '.SSSSSSS.', '.SSSSSES.', '.SSSSSSSS', '..SSSSSS.', '...SSSMS.', '....SSS..'],
    back: ['..SSSSS..', '.SSSSSSS.', '.SSSSSSS.', '.SSSSSSS.', '.SSSSSSS.', '.SSSSSSS.', '..SSSSS..', '...SSS...'],
  },
};

type View = 'front' | 'side' | 'back';

interface Pose {
  view: View;
  // front/back: leg lifts and hand drops
  liftL?: number;
  liftR?: number;
  handL?: number;
  handR?: number;
  // side: leg geometry [kneeDx, kneeDy, ankleDx, ankleDy] relative to hip/ankle baselines
  near?: [number, number, number, number];
  far?: [number, number, number, number];
  armNear?: [number, number]; // hand dx, dy relative to shoulder
  armFar?: [number, number];
  mouthOpen?: boolean;
  sit?: boolean;
  reach?: boolean;
  armsUp?: boolean;
  bob?: number; // whole-body vertical bob
  blink?: boolean;
}

function headKey(L: Look, mouthOpen: boolean, blink = false): Record<string, number> {
  return {
    H: L.hair,
    h: L.hair,
    S: L.skin,
    s: L.skinShade,
    E: blink ? L.skinShade : L.eyes ?? 0,
    M: mouthOpen ? 0 : L.mouth ?? L.skinShade,
    C: L.capColor ?? 4,
    c: L.capColor !== undefined ? shadeOf(L.capColor) : 12,
  };
}

function shadeOf(c: number): number {
  const m: Record<number, number> = { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0, 6: 0, 7: 8, 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 7 };
  return m[c] ?? 0;
}

function bodyHeight(L: Look) {
  return 37 + (L.height ?? 0);
}

/** Main draw: renders a full figure for a pose into a fresh image. */
function drawFigure(L: Look, P: Pose): Img {
  const H = bodyHeight(L) + 2;
  const p = new Painter(H);
  const adj = L.height ?? 0;
  const bob = P.bob ?? 0;
  const top = 2 + bob; // head top row (2 rows headroom for crown/spikes)
  const ny = top + 8; // neck row
  const ty = top + 9; // torso top (shoulders)
  const by = ty + 10; // belt row
  const ly = by + 1; // legs start
  const legH = 14 + adj - bob;
  const sy = ly + legH; // shoe top row
  const build = L.build ?? 'normal';
  const bw = build === 'wide' ? 1 : build === 'thin' ? -1 : 0;
  const coatC = L.coat?.color ?? L.shirt;
  const coatS = L.coat?.shade ?? L.shirtShade;
  const sleeveC = L.coat ? L.coat.color : L.sleeves === 'short' ? L.skin : L.shirt;
  const sleeveS = L.coat ? L.coat.shade : L.sleeves === 'short' ? L.skinShade : L.shirtShade;
  const hk = headKey(L, !!P.mouthOpen, !!P.blink);

  if (P.view === 'front' || P.view === 'back') {
    const back = P.view === 'back';
    // long hair falling behind shoulders (front view)
    if (L.hairStyle === 'long' && !back) {
      p.rect(CX - 4, ny, 2, 5, L.hair);
      p.rect(CX + 3, ny, 2, 5, L.hair);
    }
    // ---- legs
    if (P.sit) {
      // seated, facing camera: knees forward, shins down
      p.rect(CX - 3 - bw, ly, 7 + bw * 2, 3, L.pants);
      p.rect(CX - 3 - bw, ly + 3, 3, 6, L.pants);
      p.rect(CX + 1 + bw, ly + 3, 3, 6, L.pants);
      p.px(CX - 1 - bw, ly + 3, L.pantsShade);
      p.px(CX + 3 + bw, ly + 3, L.pantsShade);
      p.rect(CX - 4 - bw, ly + 9, 4, 2, L.shoes);
      p.rect(CX + 1 + bw, ly + 9, 4, 2, L.shoes);
    } else {
      const lL = P.liftL ?? 0,
        lR = P.liftR ?? 0;
      p.rect(CX - 3 - bw, ly, 7 + bw * 2, 2, L.pants);
      p.rect(CX - 3 - bw, ly + 2, 3, legH - 2 - lL, L.pants);
      p.rect(CX + 1 + bw, ly + 2, 3, legH - 2 - lR, L.pants);
      // inner-leg shading
      p.rect(CX - 1 - bw, ly + 2, 1, legH - 2 - lL, L.pantsShade);
      p.rect(CX + 3 + bw, ly + 2, 1, legH - 2 - lR, L.pantsShade);
      // shoes
      if (back) {
        p.rect(CX - 3 - bw, sy - lL, 3, 2, L.shoes);
        p.rect(CX + 1 + bw, sy - lR, 3, 2, L.shoes);
      } else {
        p.rect(CX - 4 - bw, sy - lL, 4, 2, L.shoes);
        p.rect(CX + 1 + bw, sy - lR, 4, 2, L.shoes);
      }
    }
    // long coat tails over upper legs
    if (L.coat?.long) {
      p.rect(CX - 4 - bw, ly, 9 + bw * 2, 6, coatC);
      p.rect(CX + 4 + bw, ly, 1, 6, coatS);
      if (!back) p.rect(CX, ly, 1, 6, coatS);
      else p.rect(CX, ly + 2, 1, 4, coatS);
    }
    // ---- torso
    const t0 = CX - 3 - bw,
      tw = 7 + bw * 2;
    p.rect(CX - 4 - bw, ty, 9 + bw * 2, 1, coatC); // shoulders
    p.rect(t0, ty + 1, tw, by - ty - 1, coatC);
    p.rect(t0 + tw - 1, ty + 1, 1, by - ty - 1, coatS);
    if (L.coat && !back) {
      // open coat shows shirt down the middle
      p.rect(CX - 1, ty, 3, by - ty, L.shirt);
      p.px(CX - 1, ty + 4, L.shirtShade);
    }
    if (L.hoodie) {
      if (back) {
        p.rect(CX - 3, ty, 7, 3, L.shirtShade);
        p.rect(CX - 2, ty + 3, 5, 1, L.shirtShade);
      } else {
        p.rect(CX - 2, ty, 5, 1, L.shirtShade);
        p.px(CX - 1, ty + 1, 15);
        p.px(CX - 1, ty + 2, 15);
        p.px(CX + 1, ty + 1, 15);
        p.px(CX + 1, ty + 2, 15);
        // kangaroo pocket
        p.rect(CX - 2, by - 3, 5, 1, L.shirtShade);
      }
    }
    if (!back && !L.hoodie && !L.coat) {
      // neckline
      p.px(CX, ty, L.skin);
      if (L.collar !== undefined) {
        p.px(CX - 1, ty, L.collar);
        p.px(CX + 1, ty, L.collar);
      }
    }
    if (!back && L.coat && L.collar !== undefined) {
      p.px(CX - 1, ty, L.collar);
      p.px(CX + 1, ty, L.collar);
    }
    if (L.tie !== undefined && !back) {
      p.rect(CX, ty + 1, 1, 6, L.tie);
      p.px(CX, ty, L.tie);
    }
    if (L.suspenders !== undefined) {
      p.rect(CX - 2, ty, 1, by - ty, L.suspenders);
      p.rect(CX + 2, ty, 1, by - ty, L.suspenders);
    }
    if (L.lanyard !== undefined && !back) {
      p.px(CX - 2, ty + 1, L.lanyard);
      p.px(CX - 1, ty + 2, L.lanyard);
      p.px(CX + 2, ty + 1, L.lanyard);
      p.px(CX + 1, ty + 2, L.lanyard);
      p.rect(CX - 1, ty + 3, 3, 3, 15);
      p.px(CX, ty + 4, 1);
    }
    if (L.logo !== undefined && !back) {
      p.px(CX - 1, ty + 4, L.logo);
      p.px(CX + 1, ty + 4, L.logo);
      p.px(CX, ty + 5, L.logo);
    }
    // belt
    if (!L.coat?.long) p.rect(t0, by, tw, 1, L.belt ?? L.pantsShade);
    // ---- arms
    const aL = CX - 5 - bw,
      aR = CX + 4 + bw;
    if (P.armsUp) {
      // drawn after the head (below) so hair and beards can't hide them
    } else if (P.reach) {
      p.rect(aL, ty + 1, 2, 8, sleeveC);
      p.rect(aL, ty + 9, 2, 2, L.skin);
      p.rect(aR, ty + 1, 2, 5, sleeveC);
      p.rect(aR, ty + 6, 2, 2, L.skin);
    } else {
      const hL = P.handL ?? 0,
        hR = P.handR ?? 0;
      p.rect(aL, ty + 1, 2, 8 + hL, sleeveC);
      p.px(aL, ty + 1, sleeveS);
      p.rect(aR, ty + 1, 2, 8 + hR, sleeveC);
      p.rect(aR + 1, ty + 1, 1, 8 + hR, sleeveS);
      p.rect(aL, ty + 9 + hL, 2, 2, L.skin);
      p.rect(aR, ty + 9 + hR, 2, 2, L.skin);
    }
    // ---- neck & head
    p.rect(CX - 1, ny, 3, 1, L.skinShade);
    const tmpl = HEADS[L.hairStyle][back ? 'back' : 'front'];
    p.stamp(CX - 4, top, tmpl, hk);
    if (L.hairStyle === 'long' && back) p.rect(CX - 3, ny, 7, 4, L.hair);
    if (!back) {
      if (L.glasses !== undefined) {
        const g = L.glasses;
        p.px(CX - 3, top + 3, g);
        p.px(CX - 1, top + 3, g);
        p.px(CX, top + 3, g);
        p.px(CX + 1, top + 3, g);
        p.px(CX + 3, top + 3, g);
        p.px(CX - 2, top + 2, g);
        p.px(CX + 2, top + 2, g);
      }
      if (L.beard !== undefined) {
        const b = L.beard;
        p.px(CX - 3, top + 5, b);
        p.px(CX + 3, top + 5, b);
        p.rect(CX - 3, top + 6, 7, 1, b);
        p.px(CX, top + 6, P.mouthOpen ? 0 : b);
        p.rect(CX - 2, top + 7, 5, 1, b);
        p.rect(CX - 1, top + 8, 3, 1, b);
        if (L.longBeard) {
          p.rect(CX - 2, ty, 5, 4, b);
          p.rect(CX - 1, ty + 4, 3, 2, b);
          p.px(CX, ty + 6, b);
        }
        if (P.mouthOpen) p.px(CX, top + 6, 0);
      }
      if (L.mustache !== undefined) {
        p.rect(CX - 2, top + 6, 5, 1, L.mustache);
        if (P.mouthOpen) p.px(CX, top + 7, 0);
      }
    } else if (L.longBeard && L.beard !== undefined) {
      p.px(CX - 3, ny, L.beard);
      p.px(CX + 3, ny, L.beard);
    }
    if (L.headphones !== undefined) {
      const c = L.headphones;
      p.rect(CX - 3, top - 1, 7, 1, c);
      p.rect(CX - 5, top + 2, 2, 3, c);
      p.rect(CX + 4, top + 2, 2, 3, c);
      p.px(CX - 4, top, c);
      p.px(CX + 4, top, c);
      p.px(CX - 5, top + 1, c);
      p.px(CX + 5, top + 1, c);
    }
    if (L.crown !== undefined) {
      const c = L.crown;
      p.rect(CX - 3, top - 1, 7, 2, c);
      p.px(CX - 3, top - 2, c);
      p.px(CX, top - 2, c);
      p.px(CX + 3, top - 2, c);
      if (!back) p.px(CX, top - 1, 12);
    }
    if (P.armsUp) {
      // a big V: shoulders out and up past the head
      const sl = CX - 4 - bw,
        sr = CX + 4 + bw;
      p.line(sl, ty + 1, sl - 3, ty - 6, sleeveC, 2);
      p.line(sr, ty + 1, sr + 3, ty - 6, sleeveC, 2);
      p.line(sl - 1, ty + 2, sl - 4, ty - 5, sleeveS, 1);
      p.line(sr + 2, ty + 2, sr + 5, ty - 5, sleeveS, 1);
      p.rect(sl - 4, ty - 9, 2, 3, L.skin);
      p.rect(sr + 3, ty - 9, 2, 3, L.skin);
    }
  } else {
    // ------------------------------------------------------------ side view (facing right)
    const hipX = CX,
      hipY = ly + 1;
    const kneeY = ly + Math.floor(legH / 2);
    const ankY = sy - 1;
    const near = P.near ?? [0, 0, 0, 0];
    const far = P.far ?? [-1, 0, -1, 0];
    const leg = (g: [number, number, number, number], c: number, shoe: number) => {
      if (P.sit) {
        // thigh forward, shin down
        p.rect(hipX - 1, hipY - 1, 6, 3, c);
        p.rect(hipX + 3, hipY + 2, 3, 6, c);
        p.rect(hipX + 3, hipY + 8, 5, 2, shoe);
        return;
      }
      const kx = hipX + g[0],
        ky = kneeY + g[1];
      const ax = hipX + g[2],
        ay = ankY + g[3];
      p.line(hipX, hipY, kx, ky, c, 3);
      p.line(kx, ky, ax, ay, c, 3);
      p.rect(ax - 1, ay + 1, 4, 2, shoe);
    };
    // far arm (behind)
    const shX = CX,
      shY = ty + 1;
    if (P.armFar && !P.reach) {
      const [fx, fy] = P.armFar;
      p.line(shX, shY, shX + fx, shY + fy, L.coat ? coatS : sleeveS, 2);
      p.rect(shX + fx, shY + fy, 2, 2, L.skinShade);
    }
    // legs
    if (!P.sit) leg(far, L.pantsShade, L.shoes === 0 ? 0 : shadeOf(L.shoes) || L.shoes);
    leg(near, L.pants, L.shoes);
    if (L.coat?.long && !P.sit) {
      p.rect(CX - 3, ly - 1, 6, 6, coatC);
      p.rect(CX - 3, ly - 1, 1, 6, coatS);
    }
    // torso
    p.rect(CX - 2 - Math.max(0, bw), ty, 5 + Math.max(0, bw) * 2, by - ty, coatC);
    p.rect(CX - 2 - Math.max(0, bw), ty, 1, by - ty, coatS);
    if (L.hoodie) p.rect(CX - 3, ty, 3, 2, L.shirtShade);
    if (L.coat) p.rect(CX + 2, ty + 1, 1, by - ty - 2, L.shirt);
    if (L.tie !== undefined) p.rect(CX + 2, ty + 1, 1, 5, L.tie);
    if (L.suspenders !== undefined) p.rect(CX, ty, 1, by - ty, L.suspenders);
    if (L.lanyard !== undefined) {
      p.px(CX + 1, ty + 1, L.lanyard);
      p.px(CX + 2, ty + 2, L.lanyard);
      p.rect(CX + 2, ty + 3, 2, 3, 15);
    }
    if (!L.coat?.long) p.rect(CX - 2 - Math.max(0, bw), by, 5 + Math.max(0, bw) * 2, 1, L.belt ?? L.pantsShade);
    // near arm
    if (P.reach) {
      p.rect(shX, shY, 7, 2, sleeveC);
      p.rect(shX + 7, shY, 2, 2, L.skin);
    } else if (P.armsUp) {
      p.rect(shX, shY - 8, 2, 9, sleeveC);
      p.rect(shX, shY - 10, 2, 2, L.skin);
    } else {
      const [hx, hy] = P.armNear ?? [0, 9];
      p.line(shX, shY, shX + hx, shY + hy, sleeveC, 2);
      // darker back edge so the arm reads against a same-colored torso
      p.line(shX - 1, shY + 1, shX + hx - 1, shY + hy - 1, sleeveS, 1);
      p.rect(shX + hx, shY + hy, 2, 2, L.skin);
    }
    // neck and head
    p.rect(CX, ny, 2, 1, L.skinShade);
    p.stamp(CX - 4, top, HEADS[L.hairStyle].side, hk);
    if (L.hairStyle === 'long') p.rect(CX - 4, ny, 3, 4, L.hair);
    if (L.glasses !== undefined) {
      p.px(CX + 1, top + 3, L.glasses);
      p.px(CX + 3, top + 3, L.glasses);
      p.px(CX + 2, top + 2, L.glasses);
      p.px(CX, top + 3, L.glasses);
    }
    if (L.beard !== undefined) {
      p.rect(CX - 1, top + 5, 4, 3, L.beard);
      p.rect(CX - 1, top + 8, 3, 1, L.beard);
      if (P.mouthOpen) p.px(CX + 2, top + 6, 0);
      if (L.longBeard) {
        p.rect(CX, ty, 4, 4, L.beard);
        p.rect(CX + 1, ty + 4, 2, 2, L.beard);
      }
    }
    if (L.mustache !== undefined) p.rect(CX + 1, top + 6, 3, 1, L.mustache);
    if (L.headphones !== undefined) {
      p.rect(CX - 2, top - 1, 5, 1, L.headphones);
      p.rect(CX - 2, top + 2, 3, 3, L.headphones);
    }
    if (L.crown !== undefined) {
      p.rect(CX - 2, top - 1, 6, 2, L.crown);
      p.px(CX - 2, top - 2, L.crown);
      p.px(CX + 1, top - 2, L.crown);
      p.px(CX + 3, top - 2, L.crown);
    }
  }
  return p.img;
}

function A(frames: Img[], rate?: number, loop = true): Anim {
  return { frames, rate, loop };
}

const SIDE_WALK: Pose[] = [
  { view: 'side', near: [1, 0, 3, 0], far: [-1, 0, -3, 0], armNear: [-3, 8], armFar: [3, 8] },
  { view: 'side', near: [1, 0, 0, 0], far: [0, -1, -2, -2], armNear: [0, 9], armFar: [0, 9], bob: 0 },
  { view: 'side', near: [-1, 0, -3, 0], far: [1, 0, 3, 0], armNear: [3, 8], armFar: [-3, 8] },
  { view: 'side', near: [1, -1, -1, -2], far: [0, 0, 0, 0], armNear: [0, 9], armFar: [0, 9], bob: 0 },
];

/** Build the complete sprite set for a person. */
export function buildPerson(L: Look): SpriteSet {
  const set: SpriteSet = {};
  const f = (p: Pose) => drawFigure(L, p);
  const both = (name: string, poses: Pose[], rate?: number, loop = true) => {
    const right = poses.map(f);
    set[`${name}_right`] = A(right, rate, loop);
    set[`${name}_left`] = A(right.map(flipImg), rate, loop);
  };
  // standing
  set.stand_down = A([f({ view: 'front' })]);
  set.stand_up = A([f({ view: 'back' })]);
  both('stand', [{ view: 'side', near: [0, 0, 0, 0], far: [-1, 0, -1, 0], armNear: [0, 9], armFar: [0, 9] }]);
  // walking
  set.walk_down = A([
    f({ view: 'front', liftL: 2, handL: 1, handR: -1 }),
    f({ view: 'front' }),
    f({ view: 'front', liftR: 2, handR: 1, handL: -1 }),
    f({ view: 'front' }),
  ]);
  set.walk_up = A([
    f({ view: 'back', liftL: 2, handL: -1, handR: 1 }),
    f({ view: 'back' }),
    f({ view: 'back', liftR: 2, handR: -1, handL: 1 }),
    f({ view: 'back' }),
  ]);
  both('walk', SIDE_WALK);
  // talking
  set.talk_down = A([f({ view: 'front', mouthOpen: true }), f({ view: 'front' })]);
  both('talk', [
    { view: 'side', near: [0, 0, 0, 0], far: [-1, 0, -1, 0], armNear: [0, 9], armFar: [0, 9], mouthOpen: true },
    { view: 'side', near: [0, 0, 0, 0], far: [-1, 0, -1, 0], armNear: [0, 9], armFar: [0, 9] },
  ]);
  set.talk_up = set.stand_up;
  // reaching / using
  set.reach_down = A([f({ view: 'front', reach: true })]);
  set.reach_up = A([f({ view: 'back', reach: true })]);
  both('reach', [{ view: 'side', near: [0, 0, 0, 0], far: [-1, 0, -1, 0], reach: true }]);
  // arms up (cheer / shock)
  set.cheer_down = A([f({ view: 'front', armsUp: true }), f({ view: 'front', armsUp: true, mouthOpen: true })], 10);
  set.cheer_up = A([f({ view: 'back', armsUp: true })]);
  both('cheer', [{ view: 'side', near: [0, 0, 0, 0], far: [-1, 0, -1, 0], armsUp: true, mouthOpen: true }]);
  // sitting
  set.sit_down = A([f({ view: 'front', sit: true, bob: 6 })]);
  set.sit_up = A([f({ view: 'back', sit: true, bob: 6 })]);
  both('sit', [{ view: 'side', sit: true, bob: 6, armNear: [3, 7], armFar: [3, 7] }]);
  // typing at a keyboard (seated)
  set.type_up = A([f({ view: 'back', sit: true, bob: 6, handL: -1 }), f({ view: 'back', sit: true, bob: 6, handR: -1 })], 6);
  set.type_down = A([f({ view: 'front', sit: true, bob: 6, handL: -1 }), f({ view: 'front', sit: true, bob: 6, handR: -1 })], 6);
  both('type', [
    { view: 'side', sit: true, bob: 6, armNear: [4, 6], armFar: [4, 6] },
    { view: 'side', sit: true, bob: 6, armNear: [5, 6], armFar: [4, 7] },
  ], 6);
  set.sittalk_down = A([f({ view: 'front', sit: true, bob: 6, mouthOpen: true }), f({ view: 'front', sit: true, bob: 6 })], 7);
  // idle blink
  set.blink_down = A([f({ view: 'front', blink: true })]);
  return set;
}
