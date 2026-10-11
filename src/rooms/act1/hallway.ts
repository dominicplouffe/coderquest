// The Elevator Lobby: a long hallway with the doors to the break room, the NOC,
// the (very broken) elevators, the R&D lab (badge) and the stairwell (keycard).
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import type { Command } from '../../engine/parser';
import { Surface, microWidth } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { skyline, fluorescent, door as libDoor } from '../../art/lib';
import { ceilingBand, lerpY, quad, exitSign, tallPlant, plaque, BASE_NOUNS, itemNouns } from '../../art/office_props';
import { award } from '../../content/points';
import { act1Raw, readAsLook } from './natural';

const SEAM = 108;
const EX = 300; // end wall corner
const DOOR_TOP = SEAM - 46;

// door x ranges (left edge, width)
const BREAK = { x: 26, w: 24 };
const NOC = { x: 70, w: 24 };
const ELEV1 = { x: 128, w: 26 };
const ELEV2 = { x: 162, w: 26 };
const LAB = { x: 208, w: 24 };
const STAIR = { x: 262, w: 26 };
const LAB_READER = { x: 236, y: 79 };
const STAIR_READER = { x: 291, y: 79 };

/** Arrival points in front of each door (used by the rooms behind them). */
export const HALL_ARRIVE = {
  breakroom: [38, 122, 'down'] as [number, number, 'down'],
  noc: [82, 122, 'down'] as [number, number, 'down'],
  lab: [220, 122, 'down'] as [number, number, 'down'],
  stairwell: [275, 122, 'down'] as [number, number, 'down'],
};

const efloor = (x: number) => lerpY(EX, SEAM, 320, 132, x);

function signAbove(p: Surface, cx: number, y: number, text: string, bg = 1, fg = 15) {
  const w = microWidth(text) + 6;
  const x = Math.round(cx - w / 2);
  p.rect(x, y, w, 9, bg);
  p.frame(x, y, w, 9, 0);
  p.micro(x + 3, y + 2, text, fg);
}

function reader(p: Surface, x: number, y: number) {
  p.rect(x, y, 5, 9, 8);
  p.frame(x, y, 5, 9, 0);
  p.rect(x + 1, y + 4, 3, 3, 0);
  p.hline(x + 1, x + 3, y + 5, 7);
}

function paint(p: Surface, g: Game) {
  const labOpen = !!g.flag('lab_open');
  const stairsOpen = !!g.flag('stairs_open');

  // ---------------------------------------------------------------- floor: polished lobby tile
  p.rect(0, SEAM, 320, 190 - SEAM, 7);
  // tile seams in perspective
  for (let i = -12; i <= 12; i++) {
    const xb = 160 + i * 34;
    p.line(160 + (xb - 160) * 0.62, SEAM, xb, 189, 8);
  }
  let yy = SEAM + 3,
    step = 4;
  while (yy < 190) {
    p.hline(0, 319, yy, 8);
    yy += step;
    step = Math.ceil(step * 1.32);
  }
  // polished: a faint sheen under each door
  for (const d of [BREAK, NOC, LAB, STAIR]) p.hline(d.x + 3, d.x + d.w - 4, SEAM + 2, 15);
  p.hline(ELEV1.x + 2, ELEV2.x + ELEV2.w - 3, SEAM + 2, 15);
  // the company logo inlaid in the floor
  p.ellipse(160, 154, 54, 12, 8);
  p.ellipse(160, 154, 52, 11, 1);
  p.ellipse(160, 154, 49, 10, 9);
  p.ellipse(160, 154, 47, 9, 1);
  p.rect(157, 146, 6, 13, 0);
  p.hline(157, 162, 146, 8);
  p.vline(162, 147, 158, 8);
  p.micro(119, 152, 'MONOLITH', 15);
  p.micro(168, 152, 'SYSTEMS', 15);

  // ---------------------------------------------------------------- walls
  p.rect(0, 0, 320, SEAM, 7);
  ceilingBand(p, 0, EX, 10, 7);
  for (const cx of [60, 160, 250]) fluorescent(p, cx, 2, 34, false);
  // wainscot
  p.rect(0, 86, EX, SEAM - 86, 1);
  p.hline(0, EX, 85, 9);
  p.hline(0, EX, 86, 15);
  p.rect(0, SEAM - 3, EX, 3, 0);
  // end wall in perspective with a window onto the dusk
  p.poly([EX, 10, 320, 0, 320, 132, EX, SEAM], 7);
  p.poly([EX, 86, 320, 92, 320, 132, EX, SEAM], 1);
  p.line(EX, 85, 320, 91, 9);
  p.line(EX, 86, 320, 92, 15);
  p.vline(EX, 10, SEAM, 8);
  p.line(EX, SEAM, 320, 132, 0);
  p.clip(EX + 3, 0, 319, 190);
  skyline(p, EX + 3, 20, 17, 50, { seed: 13, time: 'dusk' });
  p.clip();
  quad(p, EX + 3, 20, 19, 320, 15, 16, 7);
  p.poly([EX + 3, 70, 320, 74, 320, 77, EX + 3, 72], 7);
  p.line(EX + 3, 20, EX + 3, 71, 8);
  p.line(EX + 10, 19, EX + 10, 72, 8);
  // left end: the way back to the open office
  p.rect(0, 28, 15, SEAM - 28, 8);
  p.rect(0, 30, 12, SEAM - 30, 7);
  p.rect(0, 30, 12, 4, 8);
  p.rect(0, 84, 12, SEAM - 84, 1);
  p.hline(0, 11, 83, 9);
  p.rect(0, SEAM - 6, 12, 6, 8);
  p.rect(12, 28, 3, SEAM - 28, 0);
  signAbove(p, 22, 16, '< OFFICE', 1, 15);

  // ---------------------------------------------------------------- doors
  // Break room: propped open, warm kitchen light inside
  libDoor(p, BREAK.x, DOOR_TOP, BREAK.w, 46, { color: 6, open: true, inside: 11 });
  // a glimpse of the break room: mint walls, the wood counter, the checkered floor
  p.rect(BREAK.x + 5, DOOR_TOP + 26, BREAK.w - 5, 12, 6);
  p.hline(BREAK.x + 5, BREAK.x + BREAK.w - 1, DOOR_TOP + 26, 14);
  p.rect(BREAK.x + 5, DOOR_TOP + 22, BREAK.w - 5, 4, 15);
  p.rect(BREAK.x + 12, DOOR_TOP + 16, 6, 6, 7); // the SmartBrew
  p.rect(BREAK.x + 13, DOOR_TOP + 17, 4, 2, 12);
  p.rect(BREAK.x + 5, DOOR_TOP + 38, BREAK.w - 5, 8, 7);
  for (let k = 0; k < 4; k++) p.rect(BREAK.x + 5 + k * 5, DOOR_TOP + 38 + (k & 1) * 4, 5, 4, 15);
  p.rect(BREAK.x + 5, DOOR_TOP + 38, BREAK.w - 5, 1, 8);
  p.rect(BREAK.x + 2, SEAM - 4, 4, 3, 8); // doorstop
  signAbove(p, BREAK.x + BREAK.w / 2, DOOR_TOP - 12, 'BREAK ROOM', 15, 0);

  // fire extinguisher cabinet + fire alarm pull station
  p.rect(55, 72, 10, 20, 15);
  p.frame(55, 72, 10, 20, 4);
  p.rect(58, 76, 4, 13, 4);
  p.rect(59, 74, 2, 2, 0);
  p.plot(61, 75, 0);
  // NOC: ajar, blue monitor glow spilling out
  libDoor(p, NOC.x, DOOR_TOP, NOC.w, 46, { color: 8, open: true, inside: 0 });
  p.rect(NOC.x + 6, DOOR_TOP + 6, NOC.w - 8, 12, 1);
  p.rect(NOC.x + 7, DOOR_TOP + 8, 6, 4, 4);
  p.rect(NOC.x + 14, DOOR_TOP + 8, 6, 4, 4);
  p.rect(NOC.x + 7, DOOR_TOP + 13, 13, 3, 9);
  signAbove(p, NOC.x + NOC.w / 2, DOOR_TOP - 12, 'NOC', 0, 10);
  p.hline(NOC.x + 4, NOC.x + NOC.w - 2, SEAM + 2, 9);
  // fire alarm
  p.rect(101, 74, 7, 9, 4);
  p.frame(101, 74, 7, 9, 0);
  p.rect(103, 77, 3, 3, 15);
  p.plot(104, 78, 4);

  // elevators
  p.rect(ELEV1.x - 6, DOOR_TOP - 4, ELEV2.x + ELEV2.w - ELEV1.x + 12, 52, 8);
  for (const e of [ELEV1, ELEV2]) {
    p.rect(e.x, DOOR_TOP - 2, e.w, 50, 7);
    p.vline(e.x + 2, DOOR_TOP, SEAM - 3, 15);
    p.vline(e.x + Math.floor(e.w / 2) + 2, DOOR_TOP, SEAM - 3, 15);
    p.vline(e.x + Math.floor(e.w / 2), DOOR_TOP - 1, SEAM - 2, 8);
    p.vline(e.x + Math.floor(e.w / 2) - 1, DOOR_TOP - 1, SEAM - 2, dith(7, 8, 8));
    p.vline(e.x, DOOR_TOP - 2, SEAM - 1, 0);
    p.vline(e.x + e.w - 1, DOOR_TOP - 2, SEAM - 1, 0);
    // floor indicator
    p.rect(e.x + 6, DOOR_TOP - 12, e.w - 12, 6, 0);
    p.frame(e.x + 5, DOOR_TOP - 13, e.w - 10, 8, 8);
    // OUT OF ORDER sign taped to the doors (three centered lines)
    p.rect(e.x + 2, DOOR_TOP + 12, e.w - 4, 19, 15);
    p.frame(e.x + 2, DOOR_TOP + 12, e.w - 4, 19, 7);
    const cx = e.x + Math.floor(e.w / 2);
    p.micro(cx - 5, DOOR_TOP + 13, 'OUT', 4);
    p.micro(cx - 3, DOOR_TOP + 19, 'OF', 4);
    p.micro(cx - 9, DOOR_TOP + 25, 'ORDER', 4);
    p.plot(e.x + 2, DOOR_TOP + 12, 14);
    p.plot(e.x + e.w - 3, DOOR_TOP + 12, 14);
  }
  // call buttons between the elevators
  p.rect(ELEV1.x + ELEV1.w + 1, 78, 6, 12, 0);
  p.frame(ELEV1.x + ELEV1.w + 1, 78, 6, 12, 7);
  p.rect(ELEV1.x + ELEV1.w + 3, 80, 2, 2, 14);
  p.rect(ELEV1.x + ELEV1.w + 3, 85, 2, 2, 14);
  // the plaque above the elevators
  p.rect(112, 20, 92, 24, 6);
  p.rect(113, 21, 90, 22, 14);
  p.frame(114, 22, 88, 20, 6);
  for (const [txt, ty] of [['MONOLITH SYSTEMS', 24], ['PROUDLY NEVER', 30], ['REBOOTED SINCE 1999', 36]] as const) p.micro(158 - Math.floor(microWidth(txt) / 2), ty, txt, 6);

  // R&D lab door: badge reader
  if (labOpen) {
    libDoor(p, LAB.x, DOOR_TOP, LAB.w, 46, { color: 15, open: true, inside: 0 });
    p.rect(LAB.x + 6, DOOR_TOP + 8, LAB.w - 8, 10, 1);
    p.rect(LAB.x + 8, DOOR_TOP + 10, 5, 3, 11);
    p.rect(LAB.x + 15, DOOR_TOP + 12, 4, 2, 10);
    p.rect(LAB.x + 6, DOOR_TOP + 30, LAB.w - 8, 3, 8);
  } else {
    libDoor(p, LAB.x, DOOR_TOP, LAB.w, 46, { color: 15, knob: 'right', window: true });
    p.rect(LAB.x + 2, DOOR_TOP + 2, LAB.w - 4, 42, 15);
    p.frame(LAB.x + 3, DOOR_TOP + 3, LAB.w - 6, 19, 7);
    p.frame(LAB.x + 3, DOOR_TOP + 24, LAB.w - 6, 19, 7);
    p.rect(LAB.x + 8, DOOR_TOP + 6, 8, 12, 3);
    p.frame(LAB.x + 8, DOOR_TOP + 6, 8, 12, 8);
    p.rect(LAB.x + LAB.w - 5, DOOR_TOP + 23, 3, 2, 8);
    // a hazard sticker
    p.poly([LAB.x + 12, DOOR_TOP + 28, LAB.x + 16, DOOR_TOP + 35, LAB.x + 8, DOOR_TOP + 35], 14);
    p.plot(LAB.x + 12, DOOR_TOP + 32, 0);
  }
  signAbove(p, LAB.x + LAB.w / 2, DOOR_TOP - 12, 'R&D LAB', 15, 1);
  reader(p, LAB_READER.x, LAB_READER.y);

  // potted plant between the lab and the stairs
  tallPlant(p, 249, 113, 30, 21);

  // stairwell fire door: keycard reader
  p.rect(STAIR.x - 2, DOOR_TOP - 2, STAIR.w + 4, 48, 8);
  if (stairsOpen) {
    p.rect(STAIR.x, DOOR_TOP, STAIR.w, 46, 0);
    p.rect(STAIR.x + 2, DOOR_TOP + 30, STAIR.w - 2, 16, dith(0, 8, 2));
    p.poly([STAIR.x, DOOR_TOP, STAIR.x + 6, DOOR_TOP + 3, STAIR.x + 6, SEAM - 2, STAIR.x, SEAM], 4);
  } else {
    p.rect(STAIR.x, DOOR_TOP, STAIR.w, 46, 4);
    p.frame(STAIR.x + 2, DOOR_TOP + 2, STAIR.w - 4, 42, 12);
    p.vline(STAIR.x + STAIR.w - 3, DOOR_TOP + 3, SEAM - 3, 0);
    p.hline(STAIR.x + 3, STAIR.x + STAIR.w - 3, SEAM - 3, 0);
    // wired-glass window
    p.rect(STAIR.x + 9, DOOR_TOP + 5, 8, 10, 0);
    p.frame(STAIR.x + 9, DOOR_TOP + 5, 8, 10, 8);
    for (let k = 0; k < 8; k += 3) p.vline(STAIR.x + 10 + k, DOOR_TOP + 6, DOOR_TOP + 13, 8);
    // panic bar
    p.rect(STAIR.x + 3, DOOR_TOP + 24, STAIR.w - 6, 3, 7);
    p.hline(STAIR.x + 3, STAIR.x + STAIR.w - 4, DOOR_TOP + 27, 0);
  }
  signAbove(p, STAIR.x + STAIR.w / 2, DOOR_TOP - 12, 'STAIRS', 4, 15);
  // lockdown notice beside the door
  p.rect(290, 64, 9, 12, 15);
  p.frame(290, 64, 9, 12, 4);
  p.hline(291, 297, 66, 4);
  p.hline(291, 296, 69, 0);
  p.hline(291, 297, 71, 0);
  p.hline(291, 295, 73, 0);
  reader(p, STAIR_READER.x, STAIR_READER.y);
  // EXIT sign over the stairwell
  exitSign(p, STAIR.x + 4, 28, 'EXIT');
}

// ---------------------------------------------------------------- door logic

type DoorId = 'breakdoor' | 'nocdoor' | 'elevator' | 'labdoor' | 'stairdoor';
const DOOR_X: Record<DoorId, number> = {
  breakdoor: BREAK.x + BREAK.w / 2,
  nocdoor: NOC.x + NOC.w / 2,
  elevator: ELEV1.x + 30,
  labdoor: LAB.x + LAB.w / 2,
  stairdoor: STAIR.x + STAIR.w / 2,
};

function nearestDoor(g: Game): DoorId {
  let best: DoorId = 'breakdoor';
  let bd = Infinity;
  for (const [id, x] of Object.entries(DOOR_X) as [DoorId, number][]) {
    const d = Math.abs(g.player.x - x);
    if (d < bd) {
      bd = d;
      best = id;
    }
  }
  return best;
}

/** Which reader does a generic "reader" mean? The one you're standing at, else the one that fits the card. */
function whichReader(g: Game, card: string | null): 'labreader' | 'stairreader' {
  const dl = Math.abs(g.player.x - LAB_READER.x);
  const ds = Math.abs(g.player.x - STAIR_READER.x);
  if (g.player.y < 135 && Math.min(dl, ds) < 22) {
    const near = dl < ds ? 'labreader' : 'stairreader';
    // the keycard at an already-open lab reader probably means the stairwell
    if (near === 'labreader' && card === 'keycard' && g.flag('lab_open') && !g.flag('stairs_open')) return 'stairreader';
    return near;
  }
  if (card === 'keycard') return g.flag('stairs_open') && !g.flag('lab_open') ? 'labreader' : 'stairreader';
  return 'labreader';
}

/** The card a generic "card" means. */
function whichCard(g: Game): string | null {
  if (g.has('keycard') && (!g.flag('stairs_open') || !g.has('badge'))) return 'keycard';
  if (g.has('badge')) return 'badge';
  if (g.has('keycard')) return 'keycard';
  return null;
}

async function goThrough(g: Game, id: DoorId) {
  const targets: Record<DoorId, [number, number]> = {
    breakdoor: [BREAK.x + 12, 109],
    nocdoor: [NOC.x + 12, 109],
    elevator: [158, 116],
    labdoor: [LAB.x + 12, 109],
    stairdoor: [STAIR.x + 13, 109],
  };
  if (id === 'elevator') {
    await g.approach([158, 116]);
    return void (await g.say('The elevator doors stay firmly shut. The sign taped to them says OUT OF ORDER, and the indicator above them says the firmware update is on step 1 of 4,096.'));
  }
  if (id === 'labdoor' && !g.flag('lab_open')) {
    await g.approach([LAB.x + 12, 116]);
    return void (await g.say(g.has('badge') ? 'The lab door is locked. The badge reader next to it blinks red, waiting for someone to swipe in.' : 'The lab door is locked. The reader blinks red. You need a badge.'));
  }
  if (id === 'stairdoor' && !g.flag('stairs_open')) {
    await g.approach([STAIR.x + 13, 116]);
    return void (await g.say('The stairwell fire door is locked tight. The keycard reader beside it glows a smug red. A notice reads: "STAIRS - AUTHORIZED ACCESS ONLY DURING LOCKDOWN."'));
  }
  const [x, y] = targets[id];
  await g.walk(null, x, y + 2);
  await g.walk(null, x, y);
}

async function swipe(g: Game, card: string, rdr: 'labreader' | 'stairreader') {
  const pos = rdr === 'labreader' ? LAB_READER : STAIR_READER;
  await g.approach([pos.x - 4, 116]);
  g.player.dir = 'up';
  await g.pose(null, 'reach', 400);
  if (rdr === 'labreader') {
    if (g.flag('lab_open')) return void (await g.say("The reader's light is already green. The lab door is open."));
    g.sfx('beep');
    g.set('lab_open');
    award(g, 'open_lab');
    g.sfx('door');
    g.redraw();
    await g.say(
      card === 'keycard'
        ? "You tap Phil's master keycard on the reader. BEEP. The light turns green, and the lab door swings open with a hiss. Master keys: they really do open everything."
        : 'You swipe your badge. The reader thinks about it for a long, judgmental moment... BEEP. The light turns green, and the lab door swings open with a pneumatic hiss.',
    );
    return;
  }
  // stairwell reader
  if (g.flag('stairs_open')) return void (await g.say("The reader's light is already green. The stairwell door is open."));
  if (card === 'badge') {
    g.sfx('error');
    return void (await g.say('BZZT. The tiny display reads: "ACCESS DENIED. DEVELOPER CLEARANCE INSUFFICIENT."\n\nRude, but fair.'));
  }
  g.sfx('beep');
  g.set('stairs_open');
  award(g, 'open_stairs');
  g.sfx('door');
  g.redraw();
  await g.say('You tap Phil\'s master keycard on the reader. "ACCESS GRANTED. GOOD EVENING, PHIL." The heavy fire door clunks open onto a stairwell that is darker than a terminal with the brightness turned all the way down.');
}

async function useCard(g: Game, c: Command) {
  let card = c.noun === 'card' || c.noun2 === 'card' ? whichCard(g) : c.noun;
  if (card !== 'badge' && card !== 'keycard') card = whichCard(g);
  if (!card || !g.has(card)) {
    return void (await g.say("You don't have a card to swipe. You'll need your badge, at least."));
  }
  let target: string | null = c.noun2 ?? null;
  if (!target || target === 'reader' || target === 'card') target = whichReader(g, card);
  if (target === 'labdoor') target = 'labreader';
  if (target === 'stairdoor') target = 'stairreader';
  if (target === 'door') target = nearestDoor(g) === 'stairdoor' ? 'stairreader' : 'labreader';
  if (target !== 'labreader' && target !== 'stairreader') return false;
  await swipe(g, card, target);
}

async function openDoor(g: Game, id: DoorId) {
  if (id === 'labdoor' && !g.flag('lab_open')) {
    if (g.has('badge')) return swipe(g, 'badge', 'labreader');
    if (g.has('keycard')) return swipe(g, 'keycard', 'labreader');
    await g.approach([LAB.x + 12, 116]);
    g.sfx('doorlocked');
    return void (await g.say('Locked. The reader blinks red. You need a badge.'));
  }
  if (id === 'stairdoor' && !g.flag('stairs_open')) {
    if (g.has('keycard')) return swipe(g, 'keycard', 'stairreader');
    await g.approach([STAIR.x + 13, 116]);
    g.sfx('doorlocked');
    return void (await g.say(
      g.has('badge')
        ? "The fire door won't budge, and the keycard reader beside it glows red. Your badge won't cut it: \"AUTHORIZED ACCESS ONLY DURING LOCKDOWN.\" You need higher clearance than a mere senior engineer."
        : 'The fire door is locked tight. The keycard reader beside it glows a smug red.',
    ));
  }
  if (id === 'elevator') return goThrough(g, 'elevator');
  const msgs: Record<string, string> = {
    breakdoor: 'The break room door is already propped open with a doorstop shaped like a coffee bean.',
    nocdoor: 'The NOC door is already ajar. A blue glow and a faint, sad mumbling leak out.',
    labdoor: 'The lab door is already open.',
    stairdoor: 'The stairwell door is already open. The darkness beyond it is very committed to being dark.',
  };
  await g.say(msgs[id]);
}

function doorFromNoun(g: Game, n: string | null): DoorId | null {
  if (!n) return null;
  if (n === 'door') return nearestDoor(g);
  if (['breakdoor', 'nocdoor', 'elevator', 'labdoor', 'stairdoor'].includes(n)) return n as DoorId;
  return null;
}

export const hallway: RoomDef = {
  id: 'hallway',
  title: 'Elevator Lobby',
  act: 1,
  music: 'office',
  start: [160, 140, 'down'],
  draw: paint,
  walk: [
    [0, SEAM + 5, EX - 2, SEAM + 5, 318, 133, 320, 133, 320, 189, 0, 189],
    [BREAK.x + 2, SEAM, BREAK.w - 4, 6],
    [NOC.x + 2, SEAM, NOC.w - 4, 6],
    [LAB.x + 2, SEAM, LAB.w - 4, 6],
    [STAIR.x + 2, SEAM, STAIR.w - 4, 6],
  ],
  blocks: [[241, 109, 16, 6]],
  look: 'The elevator lobby. A long, polished hallway lined with doors: the break room, the NOC, a pair of elevators that have given up on life, the R&D lab, and the stairwell. A brass plaque above the elevators boasts that the company has never rebooted since 1999. The company logo gleams in the floor tiles.\n\nThe open office is back to the left.',
  hotspots: [
    {
      id: 'breakdoor',
      nouns: ['break room', 'breakroom', 'break room door', 'kitchen', 'kitchenette', 'lounge'],
      area: [BREAK.x - 2, DOOR_TOP - 12, BREAK.w + 4, 58],
      at: [BREAK.x + 12, 118],
      look: 'The break room door, propped open with a doorstop shaped like a coffee bean. Warm light, the smell of burnt coffee, and somebody yelling at a vending machine drift out.',
    },
    {
      id: 'nocdoor',
      nouns: ['noc', 'noc door', 'network operations center', 'operations', 'ops'],
      area: [NOC.x - 2, DOOR_TOP - 12, NOC.w + 4, 58],
      at: [NOC.x + 12, 118],
      look: 'The door to the NOC, the Network Operations Center, standing ajar. A cold blue glow and a faint mumbling of "...coffee..." seep out.',
    },
    {
      id: 'extinguisher',
      nouns: ['extinguisher', 'fire extinguisher', 'cabinet', 'fire cabinet'],
      area: [54, 65, 12, 28],
      at: [60, 118],
      look: 'A fire extinguisher in a glass-fronted cabinet. Last inspected: 1999. Of course.',
    },
    {
      id: 'alarm',
      nouns: ['alarm', 'fire alarm', 'pull station', 'red box', 'lever'],
      area: [99, 72, 11, 13],
      at: [104, 118],
      look: 'A red fire alarm pull station: PULL DOWN IN CASE OF FIRE. Below it, a smaller sign: "SPRINKLERS PROTECT THIS FLOOR AND ALL FLOORS BELOW, INCLUDING THE SERVER ROOM."',
    },
    {
      id: 'elevator',
      nouns: ['elevator', 'elevators', 'lift', 'lifts', 'elevator doors', 'out of order', 'out of order sign', 'indicator', 'indicators', 'firmware'],
      area: [ELEV1.x - 4, DOOR_TOP - 14, ELEV2.x + ELEV2.w - ELEV1.x + 8, 60],
      at: [158, 118],
      look: 'Two elevators, both very closed. A sign taped across the doors: OUT OF ORDER. The little displays above them read "FIRMWARE UPDATE IN PROGRESS: 1 OF 4,096." It has read that for an hour. The elevators run on the Monolith too, apparently.',
    },
    {
      id: 'button',
      nouns: ['button', 'buttons', 'call button', 'elevator button', 'up button', 'down button'],
      area: [ELEV1.x + ELEV1.w, 77, 8, 14],
      at: [158, 118],
      look: 'Elevator call buttons, up and down. Both have been pressed so many times tonight that they look slightly worn.',
    },
    {
      id: 'plaque',
      nouns: ['plaque', 'brass plaque', 'motto', 'never rebooted'],
      area: [110, 18, 96, 28],
      at: [158, 118],
      look: '"MONOLITH SYSTEMS - PROUDLY NEVER REBOOTED SINCE 1999."\n\nSomebody has stuck a sticky note to the bottom corner: "...until today. -Aidan (sorry)"',
    },
    {
      id: 'labdoor',
      nouns: ['lab', 'lab door', 'r d lab', 'rd lab', 'r and d', 'research lab', 'laboratory', 'research'],
      area: [LAB.x - 2, DOOR_TOP - 12, LAB.w + 4, 58],
      at: [LAB.x + 12, 118],
      look: (g) =>
        g.flag('lab_open')
          ? 'The door to the R&D lab stands open. Inside: blinking equipment, the hum of a 3D printer, and the faint smell of ozone.'
          : 'The R&D lab door: white, solid, with a hazard sticker and a little window. A badge reader beside it glows red. Through the window you can see something blinking and someone in a lab coat.',
    },
    {
      id: 'labreader',
      nouns: ['lab reader', 'lab badge reader', 'lab card reader', 'lab scanner'],
      area: [LAB_READER.x - 1, LAB_READER.y - 1, 7, 11],
      at: [LAB_READER.x - 4, 116],
      look: (g) => (g.flag('lab_open') ? "The lab's badge reader glows a contented green." : "The lab's badge reader. Its light blinks red: no badge, no entry."),
    },
    {
      id: 'stairdoor',
      nouns: ['stairwell', 'stairs', 'staircase', 'stair door', 'stairwell door', 'fire door', 'exit door', 'stairway'],
      area: [STAIR.x - 2, DOOR_TOP - 12, STAIR.w + 4, 58],
      at: [STAIR.x + 13, 118],
      look: (g) =>
        g.flag('stairs_open')
          ? 'The stairwell fire door hangs open. Beyond it there is nothing but darkness. Thick, total, pitch-black darkness. The emergency lights must be on the Monolith, too.'
          : 'A heavy red fire door with a panic bar and a wired-glass window. The sign above says STAIRS. A notice beside it reads: "STAIRS - AUTHORIZED ACCESS ONLY DURING LOCKDOWN." Its keycard reader glows red.',
    },
    {
      id: 'stairreader',
      nouns: ['stairwell reader', 'stair reader', 'stairs reader', 'keycard reader', 'stairwell card reader'],
      area: [STAIR_READER.x - 1, STAIR_READER.y - 1, 7, 11],
      at: [STAIR_READER.x - 4, 116],
      look: (g) => (g.flag('stairs_open') ? "The stairwell's keycard reader glows green." : 'A keycard reader by the stairwell door. Its little screen reads: "LOCKDOWN MODE. EXECUTIVE CLEARANCE REQUIRED."'),
    },
    {
      id: 'notice',
      nouns: ['notice', 'lockdown notice', 'stairs sign', 'authorized access'],
      area: [289, 63, 11, 14],
      at: [286, 116],
      look: '"STAIRS - AUTHORIZED ACCESS ONLY DURING LOCKDOWN. By order of Facilities." Underneath, in smaller print: "Lockdown is triggered automatically by the Monolith. Please do not trigger the Monolith."',
    },
    {
      id: 'plant',
      nouns: ['plant', 'potted plant', 'snake plant', 'pot'],
      area: [238, 78, 22, 36],
      at: [249, 120],
      look: 'A potted snake plant, doing its best to make the lobby look welcoming. It is the most relaxed living thing on this floor.',
    },
    {
      id: 'window',
      nouns: ['window', 'windows', 'skyline', 'city', 'sunset', 'view'],
      area: [302, 14, 18, 62],
      at: [300, 126],
      look: 'A narrow window at the end of the hall. The sun is going down over the city, and somewhere down there, people are ordering appetizers.',
    },
    {
      id: 'logo',
      nouns: ['logo', 'floor logo', 'inlay', 'company logo', 'tiles', 'tile'],
      area: [106, 142, 108, 25],
      at: [160, 168],
      look: 'The company logo, inlaid in the floor: a black monolith in a blue ring. "MONOLITH SYSTEMS. EST. 1987." Visitors are discouraged from standing on it. Phil polishes it personally.',
    },
    {
      id: 'officeway',
      nouns: ['office', 'open office', 'office sign'],
      area: [0, 14, 16, 94],
      at: [8, 150],
      look: 'The way back to the open office, past a sign that says "< OFFICE" in case anyone forgets.',
    },
    {
      id: 'exitsign',
      nouns: ['exit sign', 'green sign', 'strobe', 'emergency light', 'beacon', 'emergency strobe'],
      area: [STAIR.x + 3, 27, 22, 11],
      at: [STAIR.x + 13, 118],
      look: 'A glowing EXIT sign above the stairwell, and above that an emergency strobe that flashes every couple of seconds, just in case anyone had forgotten that this is an emergency. Under lockdown, the EXIT sign is more of a suggestion than a promise.',
    },
  ],
  exits: [
    { area: [0, SEAM + 4, 5, 190 - SEAM - 4], to: 'office', at: [302, 160, 'left'], dir: 'west' },
    { area: [BREAK.x + 2, SEAM, BREAK.w - 4, 4], to: 'breakroom', at: [160, 182, 'up'] },
    { area: [NOC.x + 2, SEAM, NOC.w - 4, 4], to: 'noc', at: [160, 182, 'up'] },
    {
      area: [LAB.x + 2, SEAM, LAB.w - 4, 4],
      to: 'lab',
      at: [160, 182, 'up'],
      blocked: (g) => (g.flag('lab_open') ? undefined : g.has('badge') ? 'The lab door is locked. The badge reader next to it blinks red, waiting for a swipe.' : 'The lab door is locked. The reader blinks red. You need a badge.'),
    },
    {
      area: [STAIR.x + 2, SEAM, STAIR.w - 4, 4],
      to: 'stairwell',
      at: [44, 74, 'right'],
      blocked: (g) => (g.flag('stairs_open') ? undefined : 'The stairwell door is locked. The keycard reader beside it glows a smug red.'),
    },
  ],
  nouns: {
    ...BASE_NOUNS,
    ...itemNouns(['badge', 'keycard']),
    bathroom: ['bathroom', 'executive bathroom', 'restroom', 'toilet', 'washroom', 'mens room', 'ladies room'],
    sign: ['sign', 'signs', 'door signs'],
    reader: ['reader', 'readers', 'badge reader', 'card reader', 'scanner', 'card scanner', 'badge scanner', 'access reader'],
    card: ['card'],
  },
  overlay(g, s, t) {
    // elevator indicators: an eternal firmware update
    for (const e of [ELEV1, ELEV2]) {
      const x0 = e.x + 7,
        y0 = DOOR_TOP - 11;
      s.rect(x0, y0, e.w - 14, 4, 0);
      const phase = Math.floor(t / 90) % 2;
      if (phase === 0) s.micro(x0 + 1, y0 - 1 + 0, 'UPD', 10);
      else {
        // progress bar: 1 of 4096 = basically nothing
        s.hline(x0 + 1, x0 + e.w - 16, y0 + 2, 8);
        if (Math.floor(t / 15) % 2) s.plot(x0 + 1, y0 + 2, 10);
      }
    }
    // reader LEDs
    const blink = Math.floor(t / 24) % 2 === 0;
    const led = (x: number, y: number, open: boolean) => s.rect(x + 1, y + 1, 3, 2, open ? 10 : blink ? 12 : 4);
    led(LAB_READER.x, LAB_READER.y, !!g.flag('lab_open'));
    led(STAIR_READER.x, STAIR_READER.y, !!g.flag('stairs_open'));
    // the NOC's monitors flicker through the door
    if (t % 97 < 6) s.rect(NOC.x + 7, DOOR_TOP + 8, 6, 4, 12);
    // emergency strobe over the stairwell
    const st = t % 120;
    s.rect(STAIR.x + 9, 20, 8, 3, st < 6 ? 15 : 4);
    if (st < 6) s.hline(STAIR.x + 7, STAIR.x + 18, 23, 12);
  },
  verbs: {
    // ---------------- cards & readers
    'use|put|show badge|keycard|card reader|labreader|stairreader|labdoor|stairdoor|door,use badge|keycard|card,use reader|labreader|stairreader badge|keycard|card':
      async (g, c) => {
        // "use reader with badge" -> swap
        if (['reader', 'labreader', 'stairreader'].includes(c.noun ?? '') && c.noun2) {
          const n2 = c.noun2;
          c.noun2 = c.noun;
          c.noun = n2;
        }
        return useCard(g, c);
      },
    'use|push|touch reader|labreader|stairreader': async (g, c) => {
      const rdr = c.noun === 'reader' ? whichReader(g, whichCard(g)) : (c.noun as 'labreader' | 'stairreader');
      const card = rdr === 'stairreader' ? (g.has('keycard') ? 'keycard' : g.has('badge') ? 'badge' : null) : g.has('badge') ? 'badge' : g.has('keycard') ? 'keycard' : null;
      if (!card) {
        const pos = rdr === 'labreader' ? LAB_READER : STAIR_READER;
        await g.approach([pos.x - 4, 116]);
        g.sfx('error');
        return void (await g.say(rdr === 'labreader' ? 'You wave your hand at the reader. It blinks red. You need a badge.' : 'You wave your hand at the reader. It blinks red, unimpressed. It wants a keycard.'));
      }
      await swipe(g, card, rdr);
    },
    'look sign,read sign': 'Signs, signs, everywhere signs: BREAK ROOM, NOC, R&D LAB, STAIRS, EXIT, "< OFFICE," and two hand-lettered OUT OF ORDER signs taped to the elevators. The lobby is extremely well documented. If only the Monolith were.',
    'look light': "The ceiling lights are dark; everything's on emergency power. The only light comes from the windows, the EXIT sign, and a strobe over the stairwell that flashes like it's being paid by the flash.",
    'look reader': async (g) => {
      const r = whichReader(g, whichCard(g));
      const hs = hallway.hotspots!.find((h) => h.id === r)!;
      await g.say((hs.look as (g: Game) => string)(g));
    },
    'look door': async (g) => {
      const d = nearestDoor(g);
      const hs = hallway.hotspots!.find((h) => h.id === d)!;
      await g.say(typeof hs.look === 'string' ? hs.look : ((hs.look as (g: Game) => string)(g) as string));
    },
    'open|unlock|push|pull door|labdoor|stairdoor|nocdoor|breakdoor|elevator': async (g, c) => {
      const d = doorFromNoun(g, c.noun);
      if (!d) return false;
      if ((c.verb === 'push' || c.verb === 'pull') && d === 'stairdoor' && !g.flag('stairs_open')) {
        await g.approach([STAIR.x + 13, 116]);
        g.sfx('doorlocked');
        return void (await g.say('You lean on the panic bar. It makes a deeply unhelpful CLUNK. Panic bars, it turns out, do not work during a panic.'));
      }
      await openDoor(g, d);
    },
    'close door|labdoor|stairdoor|nocdoor|breakdoor': async (g, c) => {
      const d = doorFromNoun(g, c.noun);
      if (d === 'labdoor' && g.flag('lab_open')) return void (await g.say('You leave it open. The building is locked down; if it closes, the Monolith might not let it open again.'));
      if (d === 'stairdoor' && g.flag('stairs_open')) return void (await g.say("You'd rather not close it. Getting it open took executive clearance."));
      await g.say("It's fine the way it is.");
    },
    'knock door|labdoor|stairdoor|nocdoor|breakdoor|elevator': async (g, c) => {
      const d = doorFromNoun(g, c.noun) ?? 'labdoor';
      await g.approach([DOOR_X[d], 116]);
      g.sfx('knock');
      const msgs: Record<DoorId, string> = {
        labdoor: g.flag('lab_open') ? 'The door is open. Krishna waves you in from inside.' : 'You knock. A muffled, cheerful voice calls out: "Come in! Oh, wait. The door\'s locked, isn\'t it? The Monolith runs the locks. Use your badge on the reader!"',
        stairdoor: 'You knock on the fire door. The knock echoes down three flights of concrete. Nobody knocks back. That is probably good.',
        nocdoor: 'You knock. From inside, a hollow voice moans: "...coffee..."',
        breakdoor: "You knock on an open door. From inside, Mike yells: \"It's OPEN! Unlike this STUPID MACHINE!\"",
        elevator: 'You knock on the elevator doors. Somewhere in the shaft, a modem from 1994 screeches back at you.',
      };
      await g.say(msgs[d]);
    },
    'take|climb stairdoor': async (g) => goThrough(g, 'stairdoor'),
    // "go in" / "enter": through the nearest door
    'go/in|into,enter': async (g) => goThrough(g, nearestDoor(g)),
    'go down': async (g) => goThrough(g, 'stairdoor'),
    'go up': 'Up? The roof is not on the list of places that can fix the Monolith. The way to the Monolith is DOWN: the stairwell, at the far end of the lobby.',
    'go|enter door|labdoor|stairdoor|nocdoor|breakdoor|elevator': async (g, c) => {
      const d = doorFromNoun(g, c.noun);
      if (!d) return false;
      await goThrough(g, d);
    },
    // ---------------- elevators
    'push|use|touch button,call elevator,push elevator,use elevator,wait elevator,take elevator': async (g) => {
      await g.approach([158, 116]);
      g.player.dir = 'up';
      await g.pose(null, 'reach', 300);
      g.sfx('elevator');
      await g.say('You press the call button. The displays above the elevators flicker: "FIRMWARE UPDATE IN PROGRESS: 1 OF 4,096." Somewhere deep in the shaft, a modem from 1994 screeches, considers your request, and declines it.\n\nYou\'ll be taking the stairs.');
    },
    'read elevator,read plaque,read notice,read logo': async (g, c) => {
      const hs = hallway.hotspots!.find((h) => h.id === c.noun)!;
      await g.say(typeof hs.look === 'string' ? hs.look : ((hs.look as (g: Game) => string)(g) as string));
    },
    'take|remove elevator': "You peel back a corner of the OUT OF ORDER sign. Under it is another OUT OF ORDER sign, dated 2003. You smooth it back down.",
    'fix|reboot elevator,turnoff|turnon elevator': 'The elevators take their orders from the Monolith. Fix the Monolith, and the elevators will follow. Probably. Eventually. After 4,095 more firmware steps.',
    // ---------------- fire safety
    'pull|push|use|touch alarm,pull lever': async (g) => {
      await g.approach('alarm');
      g.player.dir = 'up';
      await g.say('You consider it. Then you consider the sprinklers above the server racks, and your career. You don\'t.');
    },
    'take|use|open extinguisher,break extinguisher': async (g) => {
      await g.approach('extinguisher');
      await g.say("There's no fire. Yet. Fire extinguishers are not a debugging tool, no matter what the on-call channel says at 3 AM.");
    },
    // ---------------- misc
    'take plaque,fix plaque,attack plaque': "It's bolted to the wall with the same confidence the company once had in the Monolith.",
    'take plant': 'The plant is happy here. Let one thing on this floor be happy.',
    'take logo,attack logo': 'It is inlaid in marble. Phil polished it personally. You leave it alone.',
    'take notice,take exitsign': 'Facilities would be very upset. Facilities is already very upset.',
    'look/through window,open window': 'The window is sealed, and the view is all sunset and traffic. Everyone else is going home.',
    'look bathroom,go|enter|use|open bathroom,use keycard bathroom': "The restrooms are around the corner, and they're on the Monolith's lock system too. As for the executive bathroom: Phil asked you very nicely not to. You are a man of your word. For now.",
    'go officeway,go|enter office': async (g) => {
      await g.walk(null, 3, 150);
      g.goto('office', [302, 160, 'left']);
    },
    'read *': readAsLook,
  },
  raw: async (g, text) => {
    if (await act1Raw(g, text)) return true;
    const t = text.trim().toLowerCase();
    if (/^(badge|card|key ?card|swipe) (in|into)\b/.test(t) || t === 'badge in' || t === 'swipe in' || t === 'swipe') {
      return (await useCard(g, { noun: whichCard(g), noun2: null } as unknown as Command)) !== false;
    }
    return false;
  },
};
