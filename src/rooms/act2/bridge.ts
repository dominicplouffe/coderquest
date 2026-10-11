// The Null Void (/dev/null). A sagging bridge of linked-list nodes spans the
// void between the Boot Sector (east) and the Legacy Dragon's Lair (west). One
// node is missing: a gap labeled NULL. Step in it and you fall forever.
// PUT NODE IN GAP -> bridge_fixed. Reach the west end -> bridge_crossed.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, rng, microWidth } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { award } from '../../content/points';
import { hash } from '../../art/creatures_d';
import { tween, haltPlayer } from '../../art/cyber_d_lib';

// ---- bridge geometry. The list runs west (HEAD, toward the dragon) to east
// (TAIL, at the Boot Sector). The nodes float in a gentle arch over the void.
const NW = 34; // node width
const STRIDE = 42; // node + pointer link
const X0 = -14; // first node's left edge
const MISSING = 2; // index of the missing node
const DATA = ['HEAD', 'CAFE', 'ACED', 'BEEF', 'F00D', 'DEAD', 'C0DE', 'TAIL'];
const nodeX = (i: number) => X0 + i * STRIDE;
const archY = (x: number) => {
  const u = Math.max(0, Math.min(1, (x - 20) / 280));
  return 156 - 34 * Math.sin(Math.PI * u) ** 1.3;
};
const nodeTop = (i: number) => Math.round(archY(nodeX(i) + NW / 2));
/** y of the walking surface (top face of a node, or the pointer beam) at x. */
function deckTop(x: number): number {
  const i = Math.floor((x - X0) / STRIDE);
  if (i < 0) return nodeTop(0);
  if (i >= DATA.length - 1 && x >= nodeX(DATA.length - 1)) return nodeTop(DATA.length - 1);
  const xs = nodeX(i);
  if (x < xs + NW) return nodeTop(i);
  const k = (x - xs - NW) / (STRIDE - NW);
  return Math.round(nodeTop(i) + (nodeTop(i + 1) - nodeTop(i)) * k);
}
const GAP_X0 = nodeX(MISSING) - 8; // end of the previous node
const GAP_X1 = nodeX(MISSING + 1); // start of the next node

let voidMask: Uint8Array | null = null;
let fixing: { x: number; y: number; k: number } | null = null;
let falling = false;
let nullFlash = 0;

// ------------------------------------------------------------------ painting

function drawNode(p: Surface, i: number, fresh = false) {
  const x = nodeX(i);
  const xc = x + NW / 2;
  const top = nodeTop(i);
  const edge = fresh ? 14 : 11;
  void xc;
  // top face (the walkway)
  p.rect(x, top, NW, 11, 1);
  p.hline(x + 1, x + NW - 2, top + 3, 9);
  p.hline(x + 1, x + NW - 2, top + 7, 9);
  for (let gx = x + 6; gx < x + NW - 2; gx += 7) p.vline(gx, top + 1, top + 9, 9);
  p.vline(x, top, top + 10, 11);
  p.vline(x + NW - 1, top, top + 10, 3);
  p.hline(x, x + NW - 1, top, 11);
  p.hline(x, x + NW - 1, top + 10, edge);
  // front face: [ data | next ]
  const fy = top + 11;
  p.rect(x, fy, NW, 12, 1);
  p.frame(x, fy, NW, 12, edge);
  p.vline(x + 23, fy, fy + 11, edge);
  p.rect(x + 2, fy + 2, 20, 8, 0);
  const label = DATA[i];
  p.micro(x + 2 + Math.floor((20 - microWidth(label)) / 2), fy + 3, label, fresh ? 14 : 15);
  // the next pointer's dot
  p.rect(x + 27, fy + 4, 3, 3, 15);
  p.plot(x + 28, fy + 5, 14);
  // underside
  p.hline(x + 1, x + NW - 2, fy + 12, dith(1, 0, 8));
  p.hline(x + 3, x + NW - 4, fy + 13, dith(5, 0, 12));
}

/** Pointer from node i's next cell to node i+1: a narrow beam you can walk on, and the arrow. */
function drawLink(p: Surface, i: number) {
  const x = nodeX(i) + NW;
  const x1 = nodeX(i + 1);
  const ta = nodeTop(i),
    tb = nodeTop(i + 1);
  p.poly([x - 1, ta + 3, x1, tb + 3, x1, tb + 8, x - 1, ta + 8], 1);
  p.line(x - 1, ta + 3, x1, tb + 3, 9);
  p.line(x - 1, ta + 8, x1, tb + 8, 3);
  // the arrow on the front faces
  const ya = ta + 16,
    yb = tb + 16;
  p.line(nodeX(i) + 30, ya, x + 2, ya, 14);
  p.line(x + 2, ya, x1 - 2, yb, 14);
  p.line(x1 - 4, yb - 2, x1 - 2, yb, 14);
  p.line(x1 - 4, yb + 2, x1 - 2, yb, 14);
}

function paint(p: Surface, g: Game) {
  const fixed = !!g.flag('bridge_fixed');
  const r = rng(7);
  // ---- the void: black overhead, bruised purple toward the depths
  p.rect(0, 0, 320, 190, 0);
  p.gradV(0, 160, 320, 12, [0, 1]);
  p.rect(0, 172, 320, 18, 1);
  p.gradV(0, 178, 320, 8, [1, 5]);
  p.rect(0, 186, 320, 4, 5);
  // the drain at the bottom of /dev/null
  for (let k = 7; k >= 1; k--) {
    const rx = 18 * k,
      ry = 2.6 * k;
    p.ellipse(160, 190, rx, ry, k % 2 ? 5 : dith(5, 1, 8));
  }
  p.ellipse(160, 190, 14, 3, 0);
  // faint stars (things that fell in long ago)
  for (let i = 0; i < 60; i++) p.plot(Math.floor(r() * 320), Math.floor(r() * 120), r() < 0.15 ? 13 : r() < 0.5 ? 8 : 1);

  // ---- the Null Moon: a vast empty-set symbol hanging over the void
  {
    const mx = 236,
      my = 50,
      mr = 24;
    p.glow(mx, my, mr + 8, 1, -1, mr + 8);
    p.ellipse(mx, my, mr - 3, mr - 3, 0);
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      for (let d = mr - 2; d <= mr + 1; d++) {
        const x = Math.round(mx + Math.cos(rad) * d);
        const y = Math.round(my + Math.sin(rad) * d);
        p.plot(x, y, d === mr - 2 ? 13 : d === mr + 1 ? 1 : 5);
      }
    }
    p.line(mx - mr - 6, my + mr + 6, mx + mr + 6, my - mr - 6, 5, 3);
    p.line(mx - mr - 5, my + mr + 5, mx + mr + 5, my - mr - 5, 13);
  }
  // ---- far west: the green COBOL castle, waiting at the end of the list
  const cx0 = 10,
    cy = 104;
  p.glow(40, cy - 24, 36, 2, -1, 20);
  const castle: number[] = [
    cx0, cy, cx0, cy - 44, cx0 + 4, cy - 52, cx0 + 8, cy - 44, cx0 + 8, cy - 30,
    cx0 + 52, cy - 30, cx0 + 52, cy - 40, cx0 + 56, cy - 47, cx0 + 60, cy - 40, cx0 + 60, cy,
  ];
  p.poly(castle, 0);
  for (let x = cx0 + 10; x < cx0 + 52; x += 6) p.rect(x, cy - 33, 3, 3, 2);
  for (let y = cy - 26; y < cy - 1; y += 3) {
    let x = cx0 + 10 + ((y * 7) % 5);
    while (x < cx0 + 50) {
      const len = 2 + Math.floor(r() * 6);
      p.hline(x, Math.min(cx0 + 50, x + len), y, r() < 0.15 ? 10 : 2);
      x += len + 2;
    }
  }
  p.lines(castle.concat([cx0, cy]), 2);
  p.lines(castle.slice(0, 10), 10);
  p.lines(castle.slice(10), 10);
  p.rect(cx0 + 26, cy - 14, 8, 14, 0);
  p.ellipse(cx0 + 30, cy - 14, 4, 3, 0);
  p.glow(cx0 + 30, cy - 6, 5, 11, -1, 7);
  p.rect(cx0 + 3, cy - 38, 2, 4, 10);
  p.rect(cx0 + 55, cy - 34, 2, 4, 10);

  // ---- far east: the Boot Sector's light spilling in
  p.rect(314, 120, 6, 70, 0);
  p.vline(314, 120, 189, 11);
  for (let y = 124; y < 190; y += 6) p.hline(315, 319, y, 3);
  p.hline(312, 319, 120, 11);
  p.plot(314, 119, 15);

  // snapshot of the void (zeros only fall where nothing else is painted)
  const before = p.px.slice();

  // ---- the bridge
  for (let i = 0; i < DATA.length; i++) {
    const missing = i === MISSING && !fixed;
    const linkMissing = !fixed && (i === MISSING - 1 || i === MISSING);
    if (!linkMissing && i < DATA.length - 1) drawLink(p, i);
    if (!missing) drawNode(p, i, fixed && i === MISSING);
  }
  // the final pointer, off to the east (to the Boot Sector)
  {
    const x = nodeX(DATA.length - 1) + NW;
    const t = nodeTop(DATA.length - 1);
    p.rect(x - 1, t + 3, 320 - x + 1, 6, 1);
    p.hline(x - 1, 319, t + 3, 9);
    p.hline(x - 1, 319, t + 8, 3);
  }
  if (!fixed) {
    // the dangling pointer: CAFE.next -> NULL (the ground symbol)
    const x = nodeX(MISSING - 1);
    const fy = nodeTop(MISSING - 1) + 16;
    p.line(x + 30, fy, x + 38, fy, 14);
    p.vline(x + 38, fy, fy + 8, 14);
    p.hline(x + 34, x + 42, fy + 8, 14);
    p.hline(x + 35, x + 41, fy + 10, 14);
    p.hline(x + 37, x + 39, fy + 12, 14);
    // ghost outline of the node that should be here
    const gx = nodeX(MISSING);
    const gt = nodeTop(MISSING);
    for (let k = 0; k < NW; k += 3) {
      p.plot(gx + k, gt, 8);
      p.plot(gx + k, gt + 22, 8);
    }
    for (let k = 0; k < 23; k += 3) {
      p.plot(gx, gt + k, 8);
      p.plot(gx + NW - 1, gt + k, 8);
    }
    // MIND THE GAP, painted on the decks either side
    p.micro(GAP_X1 + 3, nodeTop(MISSING + 1) + 3, 'MIND THE', 14);
    p.micro(nodeX(MISSING - 1) + 9, nodeTop(MISSING - 1) + 3, 'GAP', 14);
  }

  // build the mask of untouched void pixels
  voidMask = new Uint8Array(320 * 190);
  for (let i = 0; i < voidMask.length; i++) voidMask[i] = p.px[i] === before[i] ? 1 : 0;
}

// ------------------------------------------------------------------ animation

const ORPHANS = ['UNDEFINED', 'NAN', '*PTR', 'NULL', '0XDEADBEEF', '{}', 'TODO', '[OBJECT OBJECT]', 'NIL', 'VOID*'];

function overlay(g: Game, s: Surface, t: number) {
  const m = voidMask;
  const put = (x: number, y: number, c: number) => {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= 320 || y >= 190) return;
    if (m && !m[y * 320 + x]) return;
    s.px[y * 320 + x] = c;
  };
  const zero = (x: number, y: number, c: number) => {
    // 3x5 zero
    for (let k = 0; k < 3; k++) {
      put(x + k, y, c);
      put(x + k, y + 4, c);
    }
    for (let k = 1; k < 4; k++) {
      put(x, y + k, c);
      put(x + 2, y + k, c);
    }
  };
  // the drain turns, slowly
  for (let k = 2; k <= 7; k++) {
    for (let arm = 0; arm < 3; arm++) {
      const ang = t / (40 + k * 12) + arm * 2.094 + k * 0.5;
      const x = 160 + Math.cos(ang) * 18 * k;
      const y = 190 + Math.sin(ang) * 2.6 * k;
      if (y < 190) {
        put(x, y, k < 4 ? 13 : 5);
        put(x + 1, y, k < 4 ? 15 : 13);
      }
    }
  }
  // falling zeros, three parallax layers
  for (let i = 0; i < 70; i++) {
    const layer = i % 3;
    const speed = [0.25, 0.55, 1.1][layer];
    const col = [1, 5, 13][layer];
    if (layer === 2 && i % 2) continue;
    const x = Math.floor(hash(i * 17 + 3) * 316);
    const y = ((hash(i * 31 + 7) * 210 + t * speed) % 210) - 10;
    zero(x, Math.floor(y), hash(i * 7) < 0.08 ? 15 : col);
    // a short motion trail on the fast ones
    if (layer === 2) put(x + 1, Math.floor(y) - 2, 5);
  }
  // orphaned objects drifting slowly through the void
  for (let i = 0; i < 4; i++) {
    const txt = ORPHANS[(i * 3 + Math.floor(t / 1400)) % ORPHANS.length];
    const w = microWidth(txt);
    const x = ((hash(i * 91) * 400 - t * (0.05 + i * 0.02)) % 400 + 400) % 400 - 40;
    const y = 18 + i * 26 + Math.round(Math.sin((t + i * 300) / 90) * 3);
    if (x + w < 0 || x > 320) continue;
    const col = [8, 5, 1, 8][i];
    // draw micro text via a temp: only on void pixels
    const tmp = new Surface(w + 1, 6);
    tmp.micro(0, 0, txt, 1);
    for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < w; xx++) if (tmp.px[yy * (w + 1) + xx]) put(x + xx, y + yy, col);
  }
  // the NULL sign over the gap
  if (!g.flag('bridge_fixed')) {
    const gx = nodeX(MISSING);
    const gy = nodeTop(MISSING) - 4;
    const flick = hash(Math.floor(t / 3)) < 0.1 || nullFlash > 0;
    const col = flick ? 15 : Math.floor(t / 30) % 2 ? 13 : 12;
    const txt = 'NULL';
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ])
      s.text(gx + 4 + dx, gy + dy + Math.round(Math.sin(t / 25)), txt, 5);
    s.text(gx + 4, gy + Math.round(Math.sin(t / 25)), txt, col);
    if (nullFlash > 0) nullFlash--;
    // sparks crackling off the broken ends
    for (const ex of [GAP_X0 + 1, GAP_X1]) {
      if (hash(t * 5 + ex) < 0.3) {
        const ey = deckTop(ex) + 2 + Math.floor(hash(t + ex) * 18);
        s.plot(ex + (ex === GAP_X1 ? -1 : 1) * Math.floor(hash(t * 3) * 3), ey, hash(t) < 0.5 ? 11 : 15);
      }
    }
  }
}

function front(g: Game, s: Surface, t: number) {
  if (fixing) {
    // the new node sails into place, trailing sparkles
    const { x, y, k } = fixing;
    const w = Math.round(6 + k * (NW - 6));
    const h = Math.round(3 + k * 19);
    s.rect(Math.round(x - w / 2), Math.round(y - h / 2), w, h, 1);
    s.frame(Math.round(x - w / 2), Math.round(y - h / 2), w, h, Math.floor(t / 3) % 2 ? 14 : 15);
    for (let i = 0; i < 6; i++) s.plot(Math.round(x - w / 2 + hash(t * 7 + i) * w), Math.round(y - h / 2 + hash(t * 3 + i) * h), 15);
    for (let i = 0; i < 4; i++) s.plot(Math.round(x + 4 + hash(t + i * 13) * 14), Math.round(y - 4 + hash(t * 9 + i) * 8), 14);
  }
}

// ------------------------------------------------------------------ deaths & puzzle

async function fallToDeath(g: Game, how: 'gap' | 'jump') {
  if (falling) return;
  falling = true;
  const p = g.player;
  haltPlayer(g);
  p.ghost = true;
  if (how === 'gap') {
    const gx = (GAP_X0 + GAP_X1) / 2;
    p.place(Math.max(GAP_X0 + 12, Math.min(GAP_X1 - 12, p.x)), p.y, p.dir);
    void gx;
    nullFlash = 90;
    g.sfx('error');
    // the Wile E. Coyote beat: look down first
    p.dir = 'down';
    await g.wait(700);
  } else {
    await g.pose(null, 'cheer', 300);
  }
  g.sfx('teleport');
  p.pose = 'cheer';
  let vy = 0.5;
  const dirs = ['down', 'left', 'up', 'right'] as const;
  for (let f = 0; f < 120 && p.y < 240; f++) {
    vy += 0.18;
    p.y += vy;
    if (f % 6 === 0) p.dir = dirs[(f / 6) % 4];
    await g.wait(17);
  }
  p.visible = false;
  p.pose = null;
  falling = false;
  if (how === 'gap')
    return g.die(
      'NullPointerException: Dominic\n    at Bridge.cross(NullVoid.cbl:42)\n    at Dominic.walk(Legs.java:2)\n\nYou stepped onto a node that wasn\'t there. You are now pointing at nothing, forever, which is exactly what NULL means.',
      { title: 'NullPointerException' },
    );
  return g.die("You leap into the void. /dev/null accepts you without complaint, the way it accepts everything. The write succeeds. Nothing is ever read back.\n\nYour data has been discarded.", { title: 'Redirected to /dev/null' });
}

async function fixBridge(g: Game) {
  if (g.flag('bridge_fixed')) return void (await g.say('The bridge is already whole. Every node points to the next, the way nature intended.'));
  if (!g.has('node')) return void (await g.say("You'd need a node to fill the gap. You don't have one. Somebody who knows everything might, though. Somebody who answers questions. Grudgingly."));
  await g.approach([GAP_X1 + 7, deckTop(GAP_X1 + 7) + 6]);
  g.player.face('left');
  await g.pose(null, 'reach', 400);
  g.removeItem('node');
  g.sfx('digitize');
  const sx = g.player.x - 8,
    sy = g.player.y - 22;
  const tx = nodeX(MISSING) + NW / 2,
    ty = deckTop(tx) + 11;
  fixing = { x: sx, y: sy, k: 0 };
  await tween(g, 50, (k) => {
    const e = k * k * (3 - 2 * k);
    fixing = { x: sx + (tx - sx) * e, y: sy + (ty - sy) * e - Math.sin(k * Math.PI) * 14, k: e };
  });
  fixing = null;
  g.set('bridge_fixed');
  g.redraw();
  g.sfx('clink');
  g.flash(14, 90);
  award(g, 'bridge_fixed');
  await g.say('You hold the node over the gap. It floats free of your hand, drifts into place, and snaps in with a satisfying click. CAFE.next swings up from NULL to point at the new node; the new node points at BEEF. The data field lights up: ACED.\n\nThe linked list is whole again. The bridge hums.');
}

// ------------------------------------------------------------------ room

function walkArea(): number[] {
  const top: number[] = [];
  const bot: number[] = [];
  for (let x = 0; x <= 320; x += 2) {
    top.push(x, deckTop(x) + 3);
    bot.unshift(x, deckTop(x) + 9);
  }
  return [...top, ...bot];
}

export const bridge: RoomDef = {
  id: 'bridge',
  title: 'The Null Void',
  act: 2,
  music: 'void',
  start: [300, 160, 'left'],
  draw: paint,
  walk: () => [walkArea()],
  look: (g) =>
    g.flag('bridge_fixed')
      ? 'The Null Void: an endless purple dark where zeros fall forever. A bridge of linked-list nodes spans it, sagging gently, every pointer now pointing where it should. Far to the west, a castle glows green.'
      : "The Null Void: an endless purple dark where zeros fall like rain and never land. A bridge of linked-list nodes spans it, each one pointing to the next... except where one is simply missing. In the gap, a sign glows: NULL.\n\nFar to the west, a castle glows green. Someone has painted MIND THE GAP on the deck.",
  nouns: {
    zeros: ['zeros', 'zeroes', 'zero', 'falling zeros', 'rain'],
    labels: ['head', 'head node', 'tail', 'tail node', 'cafe', 'beef', 'food', 'f00d', 'dead', 'c0de', 'data', 'data fields', 'labels', 'hex'],
    orphans: ['debris', 'orphans', 'orphaned objects', 'undefined', 'nan', 'floating text'],
  },
  hotspots: [
    {
      id: 'void',
      nouns: ['void', 'null void', 'abyss', 'chasm', 'darkness', 'dev null', 'devnull', 'pit', 'below', 'space', 'nothing', 'purple'],
      area: [0, 0, 320, 140],
      look: "/dev/null. Everything written here disappears forever, and the void reports success every single time. Zeros fall through it like rain. You look down for a while. The void doesn't look back. It doesn't do anything back. That's the whole point of it.",
    },
    {
      id: 'moon',
      nouns: ['moon', 'empty set', 'symbol', 'null moon', 'circle', 'slash'],
      area: [204, 18, 64, 64],
      look: 'A vast empty-set symbol hangs in the sky over the void, a ring with a slash through it, glowing a faint purple. The Null Moon. It illuminates nothing, which is fitting.',
    },
    {
      id: 'castle',
      nouns: ['castle', 'fortress', 'green castle', 'lair', 'distance'],
      area: [8, 52, 72, 60],
      look: 'Far to the west, at the end of the list, a castle glows phosphor green. Even from here you can see that its walls are written in COBOL.',
    },
    {
      id: 'grid',
      nouns: ['grid', 'platform', 'boot sector', 'ledge', 'anchor'],
      area: [262, 112, 58, 40],
      look: 'The edge of the Boot Sector, back to the east. Solid ground, or what passes for it in here.',
    },
    {
      id: 'bridge',
      nouns: ['bridge', 'linked list', 'list', 'nodes', 'deck', 'walkway', 'span'],
      area: [0, 118, 320, 72],
      look: (g) =>
        g.flag('bridge_fixed')
          ? 'A bridge built as a singly linked list: HEAD, CAFE, ACED, BEEF, F00D, DEAD, C0DE, TAIL. Each node holds its data and a pointer to the next. It is, at last, fully traversable.'
          : "A bridge built as a singly linked list. Each node is a box with a data field and a NEXT pointer: HEAD, CAFE, then... nothing. CAFE's pointer dangles into NULL. On the far side, BEEF, F00D, DEAD, C0DE and TAIL carry on as if nothing were wrong. You can't get from CAFE to BEEF without the node in between.",
    },
    {
      id: 'arrows',
      nouns: ['arrow', 'arrows', 'pointers', 'next pointer', 'links', 'beam', 'beams'],
      area: [20, 128, 300, 30],
      look: 'Glowing NEXT pointers, each one a narrow beam from one node to the next. You can walk on them, carefully. Pointers are sturdier than they look. Most of them, anyway.',
    },
    {
      id: 'gap',
      nouns: ['gap', 'hole', 'null', 'missing node', 'null pointer', 'null sign', 'sign', 'mind the gap', 'empty space'],
      area: [GAP_X0 - 4, 112, GAP_X1 - GAP_X0 + 8, 50],
      at: [GAP_X1 + 7, deckTop(GAP_X1 + 7) + 6],
      look: (g) =>
        g.flag('bridge_fixed')
          ? "There's no gap anymore. The Oracle's node fills it, data field glowing ACED, pointers neatly in place."
          : "Where a node should be, there is only a dotted outline and a flickering sign: NULL. CAFE's next pointer dangles over the edge and ends in the little ground symbol that means 'nothing here.' It means it.\n\nMIND THE GAP is painted on the deck, in case the giant glowing NULL wasn't enough.",
    },
    {
      id: 'newnode',
      nouns: ['new node', 'aced'],
      area: [GAP_X0, 130, GAP_X1 - GAP_X0, 30],
      when: (g) => !!g.flag('bridge_fixed'),
      look: "The Oracle's node sits snugly in the bridge, data field glowing ACED. It's the newest thing in the whole Monolith and it knows it.",
    },
  ],
  exits: [
    { area: [314, 140, 6, 40], to: 'boot', at: [18, 160, 'right'], dir: 'east|out' },
    { area: [0, 140, 6, 40], to: 'dragon', at: [300, 165, 'left'], dir: 'west' },
  ],
  zones: [
    {
      area: [GAP_X0 + 3, 100, GAP_X1 - GAP_X0 - 6, 90],
      when: (g) => !g.flag('bridge_fixed'),
      enter: (g) => fallToDeath(g, 'gap'),
    },
    {
      area: [0, 140, 40, 40],
      when: (g) => !!g.flag('bridge_fixed') && !g.scored('bridge_crossed'),
      enter: async (g) => {
        award(g, 'bridge_crossed');
      },
    },
  ],
  enter() {
    fixing = null;
    falling = false;
    nullFlash = 0;
  },
  overlay,
  front,
  verbs: {
    // ---------------------------------------------------------------- the fix
    'put|use|drop|plug node gap|bridge|newnode|void|arrows|null,fix bridge|gap|arrows|newnode node,put|use node,fix bridge|gap|arrows|null,put node': async (g) => {
      await fixBridge(g);
    },
    'throw node ?': "Throw the node into the void? It would fall forever and you'd still have a hole in your bridge. Put it IN the gap instead.",
    // ---------------------------------------------------------------- deaths
    'jump ?,climb ?,enter|go void|gap,swim ?,fly ?': async (g, c) => {
      if (c.verb === 'fly') return void (await g.say("You flap your arms. In here, you're made of data, which is lighter than air, but not by much."));
      if (c.verb === 'swim') return void (await g.say('There is nothing to swim in. There is nothing at all. That is rather the problem.'));
      if (c.noun === 'gap' && g.flag('bridge_fixed')) return false;
      if ((c.verb === 'go' || c.verb === 'enter') && c.noun === 'gap') {
        await g.walk(null, (GAP_X0 + GAP_X1) / 2, deckTop(GAP_X0 + 25) + 6);
        return;
      }
      if (c.verb === 'jump' && c.noun === 'gap' && !g.flag('bridge_fixed')) {
        await g.say("You take a running jump at the gap. Halfway across, you remember that in this world momentum is just a variable, and nobody initialized it.");
        return fallToDeath(g, 'jump');
      }
      if (c.verb === 'climb') return void (await g.say('Climb down? To where? There is no bottom. There is no down. There is only further.'));
      return fallToDeath(g, 'jump');
    },
    'go down': async (g) => fallToDeath(g, 'jump'),
    'go bridge|arrows|newnode,walk bridge': async (g) => {
      // "cross the bridge": head for whichever end is farther away
      const west = g.player.x > 160;
      await g.walk(null, west ? 2 : 318, 160);
    },
    // ---------------------------------------------------------------- scenery
    'look down,look/under bridge': "Below the bridge, the void just keeps going. Zeros fall past the nodes and dwindle to nothing. You can't see a bottom. There isn't one. That's what makes it a void instead of a hole.",
    'look sky': 'Above the void hangs a vast empty-set symbol, the Null Moon, and from the dark around it zeros are born and start to fall.',
    'look up': 'Above you, zeros are born out of the dark and start falling. Nobody knows where they come from. Nobody knows where they go. That is the whole of /dev/null theology.',
    'look|read labels,read bridge|nodes|arrows': async (g) => {
      await g.say(
        `Each node's data field holds a little hex: HEAD, CAFE, ${g.flag('bridge_fixed') ? 'ACED, ' : '(nothing), '}BEEF, F00D, DEAD, C0DE, TAIL. Whoever built this bridge was hungry, and had opinions about coffee.`,
      );
    },
    'search void|zeros': 'You search the void. There is nothing in it. You check twice. There is still nothing in it, which makes it, technically, the most successful search of your career.',
    'look zeros': 'Zeros, falling forever. Every value anyone ever discarded, every log line piped to /dev/null, every "> /dev/null 2>&1". They all end up here, as zeros, falling.',
    'take|catch zeros': "You catch a falling zero. It's nothing. Literally nothing. You let it go and it keeps falling, unbothered.",
    'look orphans': 'Orphaned objects drift through the void: an UNDEFINED, a NAN that refuses to equal itself, a dangling *PTR, an [OBJECT OBJECT] that nobody ever overrode toString() on. Nothing references them. Nothing ever will.',
    'take|catch orphans': "They drift just out of reach. Nobody holds a reference to them, and it turns out you can't start now.",
    'take bridge|arrows|nodes': "Taking pieces of the bridge you're standing on is a bold refactoring strategy. You decline.",
    'take|use gap': async (g) => {
      if (g.flag('bridge_fixed')) return false;
      await g.say("You can't take a gap. It's the absence of something. What it needs is something put INTO it.");
    },
    'listen': 'The zeros make a faint hiss as they fall, like a modem dialing into nowhere.',
    'wait': async (g) => {
      await g.say(g.flag('bridge_fixed') ? 'You wait. Zeros fall. The bridge hums contentedly.' : 'You wait. A zero falls. Another zero falls. The gap does not fill itself. Gaps never do.');
    },
    'say ?': async (g, c) => {
      if (!/null/.test(c.rest)) return false;
      await g.say('"NULL," you say. The void says nothing back, which, technically, is the same answer.');
    },
    'fix bridge,fix ?': async (g, c) => {
      if (c.noun && !['bridge', 'gap', 'arrows', 'null'].includes(c.noun)) return false;
      await fixBridge(g);
    },
  },
};
