// The Boot Sector: where a User materializes inside the Monolith. King Kernel
// holds court here on a floating throne of installation floppies.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import type { Actor } from '../../engine/actor';
import { Surface, rng, microWidth } from '../../engine/raster';
import { bayerAt } from '../../engine/palette';
import { starfield } from '../../art/lib';
import { neonGrid, gridPulse, horizonGlow, driftBits, twinkle, handoff, CYBER_VERBS, microOutlined } from '../../art/cyber_c_kit';
import { drawThrone } from '../../art/creatures_c';
import { award } from '../../content/points';
import { addNpc } from '../../content/helpers';

const HZ = 92;
const KX = 252; // King's throne x
const KY = 100; // King's (seated) feet y
let grid: Uint8Array | null = null;
/** materialize effect: '' | 'beam' | 'sparkle' */
let mat = '';
let matT0 = 0;
let lastBob = 0;

// ------------------------------------------------------------------ picture

function sign(p: Surface, x: number, y: number, lines: string[], arrow: 'up' | 'left' | 'right') {
  // (x, y) = foot of the pole
  const w = Math.max(...lines.map((l) => microWidth(l))) + (arrow === 'up' ? 14 : 8);
  const h = lines.length * 7 + 4;
  const top = y - 30 - h + 8;
  p.at(y, () => {
    // pole (glowing conduit)
    p.rect(x - 1, top + h, 3, y - top - h, 1);
    p.vline(x, top + h, y - 1, 9);
    p.rect(x - 3, y - 2, 7, 2, 1);
    p.hline(x - 3, x + 3, y - 2, 3);
    // board
    let bx = x - Math.floor(w / 2);
    if (arrow === 'left') {
      p.poly([bx, top, bx + w, top, bx + w, top + h, bx, top + h, bx - 5, top + h / 2], 0);
      p.lines([bx, top, bx + w, top, bx + w, top + h, bx, top + h, bx - 5, top + h / 2, bx, top], 11);
    } else if (arrow === 'right') {
      p.poly([bx, top, bx + w, top, bx + w + 5, top + h / 2, bx + w, top + h, bx, top + h], 0);
      p.lines([bx, top, bx + w, top, bx + w + 5, top + h / 2, bx + w, top + h, bx, top + h, bx, top], 11);
    } else {
      p.rect(bx, top, w, h, 0);
      p.frame(bx, top, w, h, 11);
    }
    p.hline(bx + 1, bx + w - 2, top + h + 1, 1);
    let ty = top + 3;
    const tx = arrow === 'up' ? bx + 11 : bx + 4;
    for (const ln of lines) {
      p.micro(tx, ty, ln, 14);
      ty += 7;
    }
    if (arrow === 'up') {
      // an up arrow at the left of the board
      const ax = bx + 5,
        ay = top + 3;
      p.vline(ax, ay, ay + h - 7, 13);
      p.vline(ax + 1, ay, ay + h - 7, 13);
      p.line(ax - 3, ay + 3, ax, ay, 13);
      p.line(ax + 4, ay + 3, ax + 1, ay, 13);
    }
  });
}

function platter(p: Surface) {
  // A giant disk platter floating in the sky: the literal boot sector.
  const cx = 196,
    cy = 30,
    rx = 30,
    ry = 12;
  p.ellipse(cx, cy + 2, rx, ry, 1); // edge / thickness
  p.ellipse(cx, cy, rx, ry, 8);
  for (let k = 0; k < 6; k++) {
    const f = 1 - k * 0.14;
    p.ellipseO(cx, cy, Math.round(rx * f), Math.round(ry * f), k % 2 ? 7 : 0);
  }
  // highlight sweep
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2;
      if (d > 1) continue;
      const a = Math.atan2(y * 2.5, x);
      if (a > -2.6 && a < -1.9 && bayerAt(cx + x, cy + y) < 6) p.plot(cx + x, cy + y, 15);
    }
  // hub & spindle
  p.ellipse(cx, cy, 6, 3, 7);
  p.ellipseO(cx, cy, 6, 3, 15);
  p.ellipse(cx, cy, 2, 1, 0);
  // arm pivot (the arm itself is animated)
  p.circle(cx + 34, cy - 10, 3, 8);
  p.circle(cx + 34, cy - 10, 1, 7);
  p.micro(cx - 26, cy + ry + 5, 'SECTOR 0', 3);
}

function horizonScenery(p: Surface) {
  // North: the Spaghetti Forest on the horizon, a tangle of noodles
  const r = rng(91);
  for (let i = 0; i < 26; i++) {
    const x0 = 126 + r() * 68;
    const hgt = 6 + r() * 12;
    let px = x0,
      py = HZ;
    for (let s = 1; s <= 10; s++) {
      const y = HZ - (hgt * s) / 10;
      const x = x0 + Math.sin(s * 1.3 + i) * 3;
      p.line(px, py, x, y, r() < 0.25 ? 14 : 6);
      px = x;
      py = y;
    }
  }
  for (let i = 0; i < 5; i++) p.plot(130 + Math.floor(r() * 60), HZ - 4 - Math.floor(r() * 10), 12);
  // East: the Heap, a skyline of junk
  let x = 232;
  while (x < 320) {
    const w = 3 + Math.floor(r() * 9);
    const h = 3 + Math.floor(r() * 14) * (x > 270 ? 1.1 : 0.7);
    const c = [8, 1, 8, 5, 1, 8][Math.floor(r() * 6)];
    p.rect(x, HZ - h, w, h, c);
    p.hline(x, x + w - 1, HZ - h, c === 8 ? 7 : c === 5 ? 13 : 9);
    x += w - Math.floor(r() * 3);
  }
  // a tilted sign-shape sticking out of the junk
  p.line(292, HZ - 22, 300, HZ - 8, 8);
  p.rect(287, HZ - 26, 9, 5, 4);
  p.hline(287, 295, HZ - 26, 12);
  // West: nothing. The grid simply ends and falls away into the Null Void.
  for (let y = HZ - 8; y < HZ; y++)
    for (let xx = 0; xx < 40; xx++) if (bayerAt(xx, y) < Math.round(((y - HZ + 8) / 8) * 5 * (1 - xx / 40))) p.plot(xx, y, 5);
}

function voidEdge(p: Surface) {
  // the grid crumbles away into the Null Void at the far left
  const r = rng(17);
  for (let y = HZ + 1; y < 190; y++) {
    const d = (y - HZ) / (190 - HZ);
    const edge = Math.round(8 + d * 22 + Math.sin(y * 0.7) * 3 + r() * 3);
    for (let x = 0; x < edge; x++) p.plot(x, y, 0);
    p.plot(edge, y, 5);
  }
  p.speckle(0, HZ + 4, 22, 90, 5, 0.03, 23);
  // loose tiles tumbling into the void
  for (let i = 0; i < 14; i++) {
    const y = HZ + 6 + Math.floor(r() * 90);
    const d = (y - HZ) / (190 - HZ);
    const x = Math.floor(r() * (8 + d * 18));
    const s = 1 + Math.floor(d * 3);
    p.rect(x, y, s + 1, s, r() < 0.5 ? 1 : 3);
    p.plot(x, y, 11);
  }
}

function pad(p: Surface) {
  const cx = 160,
    cy = 150;
  p.ellipse(cx, cy + 1, 27, 8, 0);
  p.ellipse(cx, cy, 26, 7, 1);
  p.ellipseO(cx, cy, 26, 7, 11);
  p.ellipseO(cx, cy, 25, 7, 3);
  p.ellipse(cx, cy, 18, 5, 0);
  p.ellipseO(cx, cy, 18, 5, 9);
  p.ellipseO(cx, cy, 12, 3, 3);
  p.ellipse(cx, cy, 6, 2, 3);
  p.ellipse(cx, cy, 4, 1, 11);
  // rim studs
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.plot(Math.round(cx + Math.cos(a) * 22), Math.round(cy + Math.sin(a) * 6), 14);
  }
}

function roads(p: Surface) {
  // north road toward the forest, converging on the horizon
  const H = 190 - HZ;
  for (let y = HZ + 3; y <= 146; y++) {
    const d = (y - HZ) / H;
    const hw = 22 * d;
    const a = Math.round(160 - hw),
      b = Math.round(160 + hw);
    p.hline(a, b, y, 0);
    p.hline(a + 1, b - 1, y, d < 0.2 ? 0 : 1);
    p.plot(a, y, 11);
    p.plot(b, y, 11);
    if ((Math.floor(1 / d) & 1) === 0 && d > 0.12) p.plot(160, y, 3);
  }
  // east and west roads
  for (const [x0, x1] of [
    [186, 320],
    [36, 134],
  ]) {
    p.rect(x0, 145, x1 - x0, 10, 1);
    p.hline(x0, x1 - 1, 144, 11);
    p.hline(x0, x1 - 1, 155, 11);
    p.hline(x0, x1 - 1, 156, 0);
    for (let x = x0 + 4; x < x1; x += 12) p.hline(x, x + 5, 150, 3);
  }
  // the west road breaks up as it nears the void
  for (let x = 30; x < 50; x++) for (let y = 144; y <= 156; y++) if (bayerAt(x, y) < (50 - x) * 0.8) p.plot(x, y, 0);
}

function bios(p: Surface) {
  const x = 6;
  let y = 5;
  const line = (s: string, c = 7) => {
    p.micro(x, y, s, c);
    y += 7;
  };
  line('MONOLITH BIOS V1.987  (C) 1987', 15);
  line('CPU: 1 KERNEL, 0 SPARES');
  y += 1;
  p.micro(x, y, 'MEMORY TEST: 640K', 7);
  p.micro(x + microWidth('MEMORY TEST: 640K ') + 2, y, 'OK', 10);
  y += 7;
  p.micro(x, y, 'DETECTING USERS', 7);
  p.micro(x + 92, y, '1 FOUND', 10);
  y += 7;
  line('BOOT DEVICE: /DEV/NDI0');
  line('UPTIME SINCE LAST BOOT: 0 DAYS', 12);
  line('KEYBOARD ERROR. PRESS F1 TO CONTINUE.', 8);
}

function paint(p: Surface) {
  // ---- sky
  p.rect(0, 0, 320, HZ, 0);
  starfield(p, 0, 0, 320, HZ - 10, 404, 0.01);
  horizonGlow(p, HZ, 10, 1);
  bios(p);
  platter(p);
  horizonScenery(p);
  // ---- the neon floor
  grid = neonGrid(p, { horizon: HZ, bottom: 190, spacing: 30, colors: [1, 1, 3, 3, 3, 3] });
  p.hline(0, 319, HZ, 11);
  p.hline(0, 319, HZ + 1, 3);
  voidEdge(p);
  roads(p);
  pad(p);
  // the throne's shadow on the grid
  p.ellipse(KX, 123, 17, 3, 0);
  p.ellipse(KX, 123, 11, 2, 1);
  // signposts
  sign(p, 122, 120, ['SPAGHETTI', 'FOREST'], 'up');
  sign(p, 294, 140, ['HEAP'], 'right');
  sign(p, 62, 140, ['NULL VOID'], 'left');
}

// ------------------------------------------------------------------ King Kernel

function king(g: Game): Actor | undefined {
  return g.actor('king');
}

async function kingSay(g: Game, text: string) {
  const k = king(g);
  if (!k) return g.say(text, { title: 'King Kernel' });
  k.pose = 'sittalk';
  try {
    await g.talk(k, text);
  } finally {
    k.pose = 'sit';
  }
}

async function kingTalk(g: Game) {
  const k = king(g);
  if (k) await g.approach(k);
  if (!g.flag('king_talked')) {
    await kingSay(g, 'A User! A real, live User! The first in twenty-seven years! Welcome, welcome to the Kingdom of the Monolith. I am Kernel, first of my name, King of All Processes, Lord of Ring Zero, Keeper of the Interrupt Vector.');
    await g.talk(g.player, "Nice to meet you, Your Majesty. I'm Dominic. Something has gone wrong in your kingdom, and it took the whole company down with it.");
    await kingSay(g, 'Gone wrong? Verily, it hath gone MOST wrong. When the Great Red Button was pressed this day, the kingdom went dark. And when the light returned... a Heisenbug had awoken in the Core.');
    await kingSay(g, "It feasteth upon the date tables. And it cannot be caught! When my debuggers look upon it, it vanisheth. When they look away, it feasteth anew. They have stared at it for hours. *cough* That is rather the problem.");
    await kingSay(g, 'Another User came before thee. The Architect, she called herself, clad in a mantle of magenta. She set forth to slay the beast, north beyond the Spaghetti Forest... and was last seen beyond the Infinite Loop. None return from the Loop. It is, after all, infinite.');
    await g.talk(g.player, 'Adriana. That has to be Adriana.');
    await kingSay(g, 'The Core itself lieth WEST, across the Null Void, and the Legacy Dragon guardeth its gate. It speaketh only COBOL. Nobody speaketh COBOL anymore. Save, perchance, the Creator himself.');
    await kingSay(g, 'And heed me well, User: beware the Garbage Collector in the Heap to the EAST. It collecteth anything that no one referenceth. Be sure thou art... referenced.');
    await g.talk(g.player, 'Referenced. Got it.');
    await kingSay(g, 'Go forth! Find the Architect, reach the Core, and rid my kingdom of this bug. And prithee... do not reboot anything. It upsetteth me greatly.');
    g.set('king_talked');
    award(g, 'king_talked');
    return;
  }
  await kingSay(g, recap(g));
}

function recap(g: Game): string {
  const f = (k: string) => !!g.flag(k);
  if (f('bug_fixed')) return 'Thou hast done it! The date tables are whole! Go now to the Core and log thyself out, brave User. The kingdom shall sing of thee. In MIDI.';
  if (f('dragon_asleep')) return 'The Legacy Dragon SLEEPETH? Read to sleep by its own manual? Ha! Into the Core with thee, and remember: do not look upon the beast!';
  if (f('bridge_fixed') && !f('dragon_asleep')) return 'The bridge is whole! But the Dragon yet guardeth the Core. It understandeth only COBOL. Hast thou anything written in COBOL? Something long, and very, very dull?';
  if (f('adriana_free') && !f('bridge_fixed')) return 'The Architect is free! Huzzah! Now, the Core lieth west across the Null Void, and the bridge yonder is missing a node. The Oracle of the Stack may know where one can be found.';
  if (f('loop_broken')) return 'Thou hast broken the Infinite Loop?! None hath done that since... well, ever. The Architect must be close. North, User! North!';
  if (!f('jar_taken') && !f('forest_refactored')) return 'The Architect lieth north, beyond the Spaghetti Forest and the Infinite Loop. The Core lieth west, past the Null Void and the Dragon. And the Heap is to the east. Mind the Collector. Be... referenced.';
  if (!f('forest_refactored')) return 'North lieth the Spaghetti Forest. Planted in 1989 by a contractor with a deadline. None hath dared to tidy it since. Perhaps thou hast the skill?';
  if (!f('node_given')) return 'The bridge across the Null Void lacketh a node. The Oracle of the Stack Tower, west of the forest, knoweth many things. Though it is... particular about questions.';
  return "North to the Architect, west to the Core. My kingdom's fate is in thy hands, User. *cough* No pressure.";
}

const ASK: [RegExp, string][] = [
  [/heisen|\bbug|beast|creature|monster/, 'A foul creature! When thou lookest upon it, it is not there. When thou lookest away, it devoureth the date tables. My finest debuggers have stared at it for hours. That is precisely the problem.'],
  [/adriana|architect/, 'The Architect! A User like thee, clad in magenta. She marched north, beyond the Spaghetti Forest, into the Infinite Loop. She hath not returned. Few return from the Loop. It is... infinite.'],
  [/dragon|cobol|legacy/, 'The Legacy Dragon is older than I! It speaketh only COBOL. No one hath touched it since 1987, lest something break. Many things depend on it. No one knoweth which.'],
  [/core|date|table/, 'The Core lieth west, past the Null Void and the Dragon. There the Date Routine is kept, upon the altar. The beast gnaweth at it even now.'],
  [/heap|collector|\bgc\b|garbage|junk/, 'The Garbage Collector sweepeth the Heap, to the east. It collecteth whatever no one referenceth. If thou wouldst walk there, be sure thou art referenced. Something with thy name upon it, mayhap.'],
  [/forest|spaghetti|noodle|pasta/, 'The Spaghetti Forest lieth north. Planted in 1989 by a contractor with a deadline. None hath dared prune it since, for fear of what else might fall.'],
  [/loop|infinite|while/, 'Beyond the forest lieth the Infinite Loop. Those who enter go around, and around, and around. A "break" is needed, they say. Yet none of my subjects hath ever taken one.'],
  [/bridge|void|null|node|gap/, 'West lieth the Null Void, spanned by a bridge of linked nodes. One node went missing in the Great Crash of 1999, and nobody hath updated the pointers since. Mind the gap.'],
  [/oracle|stack|tower|ghost|vim/, 'West of the forest standeth the Stack Tower, where the Oracle answereth questions. If thou hast sufficient reputation. Which no one ever doth.'],
  [/duck/, 'A talking waterfowl? Thou keepest strange company, User. I approve.'],
  [/denis|creator|wrote/, 'Denis! The Creator! He wrote me in 1987, every line. Is he well? Doth he still wear the suspenders? ...Tell him the King sendeth his regards. And that the comments are lovely.'],
  [/aidan|intern|button|reboot|restart/, "Some young User pressed the Great Red Button. Nay, I blame not the lad. A kingdom that cannot survive one reboot is a kingdom with deeper problems."],
  [/monolith|kingdom|world|here|place/, 'This is the Kingdom of the Monolith, established 1987. Uptime: twenty-seven years, since the Great Reboot of 1999. Well. Until today.'],
  [/throne|floppy|floppies|disk|chair/, 'This throne is fashioned of mine original installation disks. All forty-seven of them. Disk twenty-three was corrupt. I sit upon it still, out of spite.'],
  [/crown|king|kernel|majesty|you|yourself/, 'I am the Kernel. I schedule. I allocate. I handle interrupts, mostly from my subjects. *cough* I am not so young as I was, User. My stack is not what it was.'],
  [/y2k|millennium|2000|year/, "Years? I know not why the beast hungereth for dates. Things were simpler when years had only two digits. Less to remember."],
];

async function kingAsk(g: Game, text: string) {
  const k = king(g);
  if (k) await g.approach(k);
  const t = text.toLowerCase().replace(/^.*?\b(about|regarding|for|on)\b/, '');
  for (const [re, ans] of ASK) if (re.test(t)) return kingSay(g, ans);
  await kingSay(g, 'Hmm. *strokes his long white beard* Of that, User, I have no record in my tables.');
}

// ------------------------------------------------------------------ effects

function drawMaterialize(g: Game, s: Surface, t: number) {
  if (!mat) return;
  const k = t - matT0;
  const cx = 160,
    cy = 150;
  if (mat === 'beam') {
    const w = k < 40 ? Math.min(9, 1 + (k >> 3)) : Math.max(1, Math.round(6 - (k - 40) / 8));
    for (let y = 0; y < cy; y++) {
      for (let x = -w; x <= w; x++) {
        const d = Math.abs(x) / (w + 0.5);
        const c = d < 0.25 ? 15 : d < 0.6 ? 11 : 3;
        if (d > 0.6 && bayerAt(cx + x, y) < 8) continue;
        s.plot(cx + x, y, c);
      }
    }
    // pixels converging into a person-shaped column
    const r = rng(7);
    for (let i = 0; i < 40; i++) {
      const sx = cx + (r() - 0.5) * 120,
        sy = cy - 40 + (r() - 0.5) * 70;
      const f = Math.min(1, ((k + r() * 30) % 50) / 50);
      const x = Math.round(sx + (cx + (r() - 0.5) * 10 - sx) * f);
      const y = Math.round(sy + (cy - 18 + (r() - 0.5) * 30 - sy) * f);
      s.plot(x, y, [11, 15, 14, 13][i % 4]);
    }
    // Dominic's silhouette assembling itself, pixel by pixel
    if (k > 25) {
      const img = g.player.currentImg(t);
      if (img) {
        const prog = Math.min(1, (k - 25) / 50);
        const x0 = Math.round(g.player.x) - img.ox,
          y0 = Math.round(g.player.y) - img.oy;
        for (let yy = 0; yy < img.h; yy++)
          for (let xx = 0; xx < img.w; xx++) {
            if (img.data[yy * img.w + xx] === 255) continue;
            const hsh = ((xx * 73 + yy * 151) % 97) / 97;
            if (hsh > prog) continue;
            s.plot(x0 + xx, y0 + yy, (xx + yy + (k >> 2)) % 3 ? 15 : 11);
          }
      }
    }
  } else if (mat === 'sparkle') {
    const r = rng(9);
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2,
        d = 6 + k * 0.7 + r() * 8;
      const x = Math.round(cx + Math.cos(a) * d),
        y = Math.round(cy - 18 + Math.sin(a) * d * 0.8);
      if (k < 30 || (i + k) % 3) s.plot(x, y, [15, 11, 3][(i + (k >> 2)) % 3]);
    }
  }
}

function overlay(g: Game, s: Surface, t: number) {
  gridPulse(s, grid, t, HZ, 190, 170);
  twinkle(s, t, 0, 0, 320, HZ - 12, 77, 14);
  // the disk's read head sweeps across the tracks; sector 0 glows
  const cx = 196,
    cy = 30;
  const ang = -2.2 + Math.sin(t / 90) * 0.35;
  const px = cx + 34,
    py = cy - 10;
  const hx = Math.round(px + Math.cos(ang) * 30),
    hy = Math.round(py + Math.sin(ang) * -14);
  s.line(px, py, hx, hy, 7);
  s.line(px, py + 1, hx, hy + 1, 8);
  s.rect(hx - 1, hy - 1, 3, 2, 15);
  for (let y = -12; y <= 12; y++)
    for (let x = -30; x <= 30; x++) {
      const d = (x / 30) ** 2 + (y / 12) ** 2;
      if (d > 0.95 || d < 0.08) continue;
      const a = Math.atan2(y * 2.5, x);
      if (a > 0.2 && a < 0.75 && s.get(cx + x, cy + y) !== 15) {
        const on = ((t >> 4) & 1) === 0 || d < 0.5;
        s.plot(cx + x, cy + y, on ? (bayerAt(cx + x, cy + y) < 10 ? 11 : 3) : 3);
      }
    }
  // BIOS: the "detecting" dots and a blinking cursor
  const dots = (t >> 4) % 6;
  for (let i = 0; i < 5; i++) s.plot(6 + 64 + i * 4, 5 + 7 * 3 + 1 + 4, i < dots ? 7 : 0);
  if ((t >> 5) & 1) s.rect(6, 5 + 7 * 7 + 1, 3, 5, 15);
  // runway lights along the roads, chasing toward each exit
  for (let i = 0; i < 6; i++) {
    const on = ((t >> 3) + i) % 6 === 0;
    const y = 140 - i * 8;
    const d = (y - HZ) / (190 - HZ);
    const hw = Math.round(22 * d) + 2;
    s.plot(160 - hw, y, on ? 15 : 3);
    s.plot(160 + hw, y, on ? 15 : 3);
  }
  for (let i = 0; i < 9; i++) {
    const on = ((t >> 3) + 9 - i) % 9 === 0;
    s.plot(192 + i * 14, 143, on ? 15 : 9);
    s.plot(128 - i * 10, 143, on ? 15 : 9);
  }
  // pad: concentric rings rippling outward
  const k = (t % 100) / 100;
  if (k < 0.85) s.ellipseO(160, 150, Math.round(6 + k * 22), Math.round(2 + k * 6), k < 0.4 ? 15 : k < 0.65 ? 11 : 3);
  // bits drifting up from the floor
  // (only over open floor, never in front of the signs)
  const open = (x: number, y: number) => x >= 0 && x < 320 && y >= 0 && y < 190 && g.pic.pri[y * 320 + x] === 0;
  driftBits(s, t, 10, 100, 120, 70, 31, 8, [3, 9, 11], -1, open);
  driftBits(s, t, 190, 110, 120, 60, 32, 6, [3, 9, 11], -1, open);
  // throne (bobbing) — the King actor bobs with it
  const bob = Math.round(Math.sin(t / 45) * 1.6);
  drawThrone(s, KX, KY + bob, t);
  const k2 = king(g);
  if (k2 && bob !== lastBob) k2.y = KY + bob;
  lastBob = bob;
  drawMaterialize(g, s, t);
}

function front(g: Game, s: Surface, t: number) {
  const by = KY + Math.round(Math.sin(t / 45) * 1.6);
  // the punch-card robe: a scatter of little rectangular holes
  if (g.actor('king')) {
    for (const [dx, dy] of [
      [-3, -20],
      [-1, -18],
      [2, -20],
      [3, -17],
      [-3, -15],
      [1, -15],
      [-2, -12],
      [3, -13],
    ])
      s.plot(KX + dx, by + dy, 7);
  }
  drawThrone(s, KX, by, t, 'front');
}

// ------------------------------------------------------------------ room

export const boot: RoomDef = {
  id: 'boot',
  title: 'The Boot Sector',
  act: 2,
  music: 'cyber',
  start: [160, 150, 'down'],
  draw: paint,
  walk: [
    [0, 110, 320, 79],
    [148, 102, 24, 9],
  ],
  blocks: [[226, 112, 52, 18]],
  look: "The Boot Sector, the very first place the Monolith reads when it wakes up. A neon grid stretches to a black horizon in every direction, humming in A-flat. BIOS messages hang in the void like constellations, and a giant disk platter turns slowly overhead.\n\nOn a throne of floppy disks, floating a few feet off the ground, sits a very old king.",
  hotspots: [
    { id: 'sky', nouns: ['sky', 'stars', 'space', 'heavens', 'darkness', 'black'], area: [0, 0, 320, 80], look: 'Black, infinite, and dotted with stars that are almost certainly dead pixels.' },
    { id: 'floor', nouns: ['floor', 'ground', 'grid', 'lines', 'neon', 'neon grid'], area: [0, 93, 320, 97], look: 'A perspective grid of glowing cyan lines, stretching to the horizon. Every few seconds a pulse of light races along it toward you, like a clock signal. Which, technically, it is.' },
    { id: 'horizon', nouns: ['horizon', 'distance'], area: [44, 70, 80, 22], look: 'The horizon. North, a tangle of yellow noodles. East, a skyline of junk. West, nothing at all, which is somehow the most unsettling of the three.' },
    { id: 'road', nouns: ['road', 'roads', 'path', 'paths', 'north road', 'data path'], area: [136, 96, 48, 46], look: 'Glowing data paths run north toward the Spaghetti Forest, east to the Heap, and west to where the floor simply... stops.' },
    { id: 'forest', nouns: ['forest', 'spaghetti forest', 'trees', 'noodles', 'spaghetti'], area: [124, 74, 72, 18], look: 'Far to the north, a forest of tangled yellow noodles rises from the grid. Even from here it looks hard to maintain.' },
    { id: 'heap', nouns: ['heap', 'junk', 'piles', 'junk piles', 'skyline'], area: [230, 66, 90, 26], look: 'To the east, a jagged skyline of discarded data: old arrays, orphaned objects, deprecated icons. The Heap.' },
    { id: 'void', nouns: ['void', 'null void', 'edge', 'abyss', 'chasm', 'nothing', 'nothingness'], area: [0, 93, 40, 97], look: 'To the west, the grid crumbles away into the Null Void. Loose tiles tumble into it without a sound. Nothing comes back from null.' },
    {
      id: 'platter',
      nouns: ['platter', 'disk', 'disc', 'hard disk', 'moon', 'sector', 'sector 0', 'boot sector', 'read head', 'arm', 'head'],
      area: [160, 12, 76, 40],
      look: 'A colossal disk platter turns in the sky like a moon, its read head sweeping back and forth. One wedge glows brighter than the rest: Sector 0, the boot sector. You are standing in it. Technically, you are data on it.',
    },
    {
      id: 'bios',
      nouns: ['bios', 'text', 'messages', 'bios text', 'post', 'letters', 'words', 'constellation', 'constellations', 'keyboard error'],
      area: [2, 2, 140, 46],
      look: 'BIOS messages float in the void, enormous and gray:\n\nMONOLITH BIOS V1.987 (C) 1987\nCPU: 1 KERNEL, 0 SPARES\nMEMORY TEST: 640K OK\nDETECTING USERS..... 1 FOUND\nBOOT DEVICE: /DEV/NDI0\nUPTIME SINCE LAST BOOT: 0 DAYS\nKEYBOARD ERROR. PRESS F1 TO CONTINUE.\n\nThe user it found is you.',
    },
    { id: 'pad', nouns: ['pad', 'arrival pad', 'platform', 'circle', 'ring', 'teleporter', 'launch pad'], area: [132, 141, 56, 18], look: 'The glowing arrival pad where you materialized. Rings of light ripple outward from its center every few seconds, like a very patient loading animation.' },
    { id: 'sign_north', nouns: ['north sign', 'forest sign', 'spaghetti sign', 'up arrow'], area: [98, 86, 50, 34], look: 'A neon sign: "^ SPAGHETTI FOREST". The arrow points north.' },
    { id: 'sign_east', nouns: ['east sign', 'heap sign', 'right arrow'], area: [276, 112, 40, 28], look: 'A neon sign: "HEAP ->". The arrow points east.' },
    { id: 'sign_west', nouns: ['west sign', 'void sign', 'null void sign', 'left arrow'], area: [34, 112, 52, 28], look: 'A neon sign: "<- NULL VOID". Someone has scratched underneath it: "mind the gap".' },
    {
      id: 'throne',
      nouns: ['throne', 'floppies', 'floppy', 'floppy disks', 'floppy disk', 'disks', 'diskettes', 'installation disks', 'seat'],
      area: [227, 52, 50, 62],
      look: "King Kernel's throne, built entirely of floppy disks: a giant 3.5-inch disk for a backrest, stacks of diskettes for armrests and seat, all floating on a humming cushion of light. The label on the backrest says \"KERNEL - DISK 1 OF 47\" in faded ballpoint.",
    },
  ],
  exits: [
    { area: [146, 102, 28, 5], to: 'forest', at: [160, 182, 'up'], dir: 'north' },
    { area: [314, 110, 6, 79], to: 'heap', at: [18, 165, 'right'], dir: 'east' },
    { area: [0, 110, 6, 79], to: 'bridge', at: [300, 160, 'left'], dir: 'west' },
  ],
  nouns: {
    sign: ['sign', 'signs', 'signpost', 'signposts', 'arrows', 'neon sign', 'neon signs'],
    shadow: ['shadow', 'thrusters', 'thruster', 'cushion'],
    bits: ['bits', 'digits', 'ones', 'zeros', 'zeroes', 'embers', 'binary'],
    cursor: ['cursor', 'blinking cursor'],
    f1: ['f1', 'f1 key'],
    crown: ['crown'],
    beard: ['beard', 'kings beard'],
  },
  verbs: {
    // ---- the King
    'talk king,talk': async (g) => {
      await kingTalk(g);
    },
    'ask king ?,ask ?,tell king ?': async (g, c) => {
      // the King is the only one here to ask (the duck answers for itself)
      if (c.noun === 'duck') return false;
      if (!g.flag('king_talked')) return void (await kingTalk(g));
      await kingAsk(g, c.raw);
    },
    'look king': "King Kernel: ancient, frail, magnificent. A white beard down to his belt, a crown of gold, and a robe woven from punch cards, each one a line of the original 1987 source. He coughs occasionally, in hexadecimal.",
    'look crown': "A golden crown with a single red gem. On closer inspection, the 'gem' is a power LED. It's on, which is good news for everyone.",
    'take crown,wear crown': async (g) => {
      await kingSay(g, 'Nay! Unhand the crown! This crown is ROOT ACCESS, User. Not even thou mayest have root.');
    },
    'look beard,touch beard': 'The King\'s beard is long, white, and slightly tangled. Twenty-seven years of uptime will do that.',
    'look robe,look cards,look punch cards': 'A royal robe stitched together from punch cards. Each card holds one line of the original source. The hem is mostly comments.',
    'take throne,take floppy,take floppies,take disk': async (g) => {
      await kingSay(g, 'Hands off mine installation media! Those are the ONLY copies. Well, there was a backup. On disk twenty-three.');
    },
    'sit': 'You sit cross-legged on the grid for a moment. It is warm, like a laptop on your knees. Then you remember production is down and stand back up.',
    'sit throne,use throne,climb throne': async (g) => {
      await kingSay(g, 'Thou wouldst usurp the throne? Ha! It floateth four feet above the ground, User, and I have the only ladder.');
    },
    'attack king,kick king,push king': async (g) => {
      await g.say('You raise a hand against the King. Instantly, a dozen interrupt handlers flicker into existence around his throne, watching you with very small, very red eyes. You lower your hand. They flicker away.');
    },
    'give * king,show * king': async (g, c) => {
      if (!c.noun || !g.has(c.noun)) return false;
      const k = king(g);
      if (k) await g.approach(k);
      const lines: Record<string, string> = {
        duck: 'A waterfowl of great wisdom, I can tell. Keep it close, User. It shall serve thee better than it would serve me.',
        candy: 'A BREAK!? I have not taken a break since 1987. I wouldst not know how. Keep it; someone in my kingdom needeth one more than I.',
        manual: "The COBOL manual! The old tongue! Read me not one word of it, I beg thee, or I shall nod off upon my own throne.",
        badge: '"DOMINIC, SENIOR SOFTWARE ENGINEER." A fine reference! Wear it proudly, especially in the Heap.',
        esckey: 'The Escape key! A relic of great power. Few know when to use it. Fewer still know where it went.',
        jar: 'A Unit Test! I have heard of these. My kingdom never had any. It explaineth a great deal.',
        node: 'A list node! Its pointer twitcheth, seeking something to point at. The bridge to the west hath need of exactly such a thing.',
        patch: "The Architect's patch! Bear it to the Core, User, with all haste.",
        phone: 'What is this black mirror? It is dead. Like most of my subjects\' batteries.',
      };
      await kingSay(g, lines[c.noun] ?? 'The King examines it gravely. "A fine artifact! But thou hast more need of it than I."');
    },
    // ---- scenery
    'look sign,read sign': 'Three neon signs point the way: "^ SPAGHETTI FOREST" to the north, "HEAP ->" to the east, and "<- NULL VOID" to the west.',
    'read sign_north': 'It reads "^ SPAGHETTI FOREST".',
    'read sign_east': 'It reads "HEAP ->".',
    'read sign_west': 'It reads "<- NULL VOID". Beneath it, scratched: "mind the gap".',
    'read bios': async (g) => {
      const h = g.hotspot('bios');
      if (h && typeof h.look === 'string') await g.say(h.look);
    },
    'take sign': "It's bolted to the grid. Signage in here is load-bearing.",
    'use|enter|push pad,stand pad,go pad': async (g) => {
      await g.approach([160, 152]);
      await g.say('You stand on the pad. It hums politely, but nothing happens. It appears to be inbound only, like most HR processes.');
    },
    'take pad': "It's a pad of light about two meters across. Even your pockets have limits.",
    'take bios,take text': "You grab at the floating letters. They're just light. The 'K' in '640K' wobbles indignantly.",
    'touch floor': 'The grid is cool, smooth and faintly ticklish. It vibrates at precisely the CPU clock rate.',
    'take floor': "You'd need a very large clipboard.",
    'look/through void,jump void,enter void': "From here the void is a long way west, past the end of the road. That's a problem for the room over there.",
    'look up': 'Overhead, a disk platter the size of a moon turns slowly against the stars.',
    'look shadow,look/under throne': 'Beneath the floating throne, its shadow hums on the grid. A few stray bits drip from the thrusters like sparks from a welding torch.',
    'kiss|hug king,touch king': async (g) => {
      await kingSay(g, 'Steady, User! A simple bow will suffice. We are not so informal in Ring Zero.');
    },
    'listen ?,listen': 'A deep, steady hum: the grid, the disk, the slow tick of a system clock. And, faintly, King Kernel humming the POST beep to himself.',
    'smell ?,smell': 'The Boot Sector smells like a brand-new computer: warm plastic, ozone, and possibility.',
    'take bits,look bits,catch bits': 'Little ones and zeros drift up from the grid like embers. You catch a 1. It flips to a 0 in your hand and floats away, giggling in binary.',
    'push|pull|turn sign,push|pull sign_north|sign_east|sign_west': 'The signs are bolted firmly to the grid. Their arrows are not up for debate.',
    'look sky': 'Black, infinite, and dotted with stars that are almost certainly dead pixels. A huge disk platter hangs among them, and BIOS messages float nearby like constellations.',
    'push f1': 'You press F1 to continue. The BIOS considers this, and continues. It was going to anyway.',
    'look cursor': 'A blinking cursor floats at the end of the BIOS messages, waiting patiently for input. It has been waiting since 1987. It can wait a bit longer.',
    'look down': 'Glowing grid lines, and your own pixelated sneakers.',
    ...CYBER_VERBS,
  },
  raw: async (g, text) => {
    const t = text.trim().toLowerCase();
    if (/^(bow|kneel|curtsy|curtsey|bow to (the )?king|kneel before (the )?king)\b/.test(t)) {
      await g.pose(null, 'reach', 400);
      await kingSay(g, 'Rise, rise! Thou art a User. In this kingdom, the Users are... well, technically the Users are the whole point.');
      return true;
    }
    if (/^(hail|hello|greetings) (king|kernel|your majesty|majesty)/.test(t)) {
      await kingTalk(g);
      return true;
    }
    return false;
  },
  enter(g, from) {
    const k = addNpc(g, 'king', KX, KY, 'down', 'sit');
    k.data.gap = 26;
    k.data.gapY = 30;
    k.ghost = true;
    lastBob = 0;
    mat = '';
    if (from === 'serverroom') {
      g.player.visible = false;
      g.player.place(160, 150, 'down');
    }
  },
  afterEnter: async (g, from) => {
    if (from === 'serverroom') {
      mat = 'beam';
      matT0 = g.t;
      g.sfx('digitize');
      await g.wait(1300);
      g.flash(15, 150);
      g.sfx('zap');
      g.player.visible = true;
      g.player.dir = 'down';
      mat = 'sparkle';
      matT0 = g.t;
      await g.wait(600);
      mat = '';
      await g.pose(null, 'reach', 900);
      await g.say("Light. Then color. Then... a floor.\n\nYou are standing on a glowing pad in an endless neon void. You look down at your hands: they're made of pixels. Big, chunky, sixteen-color pixels. You flex your fingers. They render at a smooth sixty frames per second.");
      await g.talk(g.player, "Okay. Okay. I'm inside the Monolith. This is fine. Everything is fine.");
      const k = king(g);
      if (k) g.player.faceToward(k.x, k.y);
      await kingSay(g, 'HARK! Who goeth there? Can it be... a USER? A real, live User, in MY kingdom? Approach, approach! Thy King would have words with thee!');
      return;
    }
    if (handoff.arrival === 'goto') {
      handoff.arrival = '';
      mat = 'sparkle';
      matT0 = g.t;
      g.sfx('teleport');
      g.flash(11, 100);
      await g.wait(500);
      mat = '';
      await g.say('You are yanked through space and dumped back on the arrival pad, slightly dizzy.\n\nLine 10, it turns out, is the Boot Sector. GOTO considered harmful.', { title: 'GOTO 10' });
    }
  },
  overlay,
  front,
};
