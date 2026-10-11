// The Break Room: the SmartBrew 3000 (418 I'M A TEAPOT), an ancient coffee pot
// (do not drink), a vending machine (do not shake) holding Mike's BREAK! bar
// hostage, and a fridge whose magnet holds the answer to Denis's riddle.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface, rng } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { fluorescent, mug as drawMug, clock } from '../../art/lib';
import { segDigit, shadow } from '../../art/office_props';
import { award } from '../../content/points';
import { addNpc, convo } from '../../content/helpers';
import { HALL_ARRIVE } from './hallway';

const SEAM = 106;
const WALL_TOP = 24;
// coffee machine
const CM = { x: 112, y: 69, w: 26, h: 20 };
// vending machine
const VM = { x: 250, y: 72, w: 34, h: 43, z: 115 };
const FR = { x: 16, y: 70, w: 30, h: 40, z: 111 };
const MIKE_POS: [number, number] = [238, 128];

let brewT = -1; // frame when a brew started (for the mug-under-spout animation)
let vendT = -1; // frame when the candy drop started

function checkerFloor(p: Surface, y0: number, y1: number) {
  // big perspective checkerboard: vanishing point above the picture
  const vx = 160;
  const rows: number[] = [];
  let y = y0,
    step = 5;
  while (y < y1) {
    rows.push(y);
    y += step;
    step = Math.min(30, Math.ceil(step * 1.3));
  }
  rows.push(y1);
  for (let r = 0; r < rows.length - 1; r++) {
    const ya = rows[r],
      yb = rows[r + 1];
    for (let i = -14; i < 14; i++) {
      const xa0 = vx + (i * 22 * (ya - 60)) / 60,
        xa1 = vx + ((i + 1) * 22 * (ya - 60)) / 60;
      const xb0 = vx + (i * 22 * (yb - 60)) / 60,
        xb1 = vx + ((i + 1) * 22 * (yb - 60)) / 60;
      const c = (r + i) & 1 ? 15 : 7;
      p.poly([xa0, ya, xa1, ya, xb1, yb, xb0, yb], c);
    }
  }
}

function paint(p: Surface, g: Game) {
  const rebooted = !!g.flag('coffee_rebooted');
  const off = !!g.flag('coffee_off');
  const candy = !!g.flag('candy_bought');
  const fridgeOpen = !!g.flag('br_fridge_open');

  // ---------------------------------------------------------------- floor & walls
  p.rect(0, SEAM, 320, 190 - SEAM, 7);
  checkerFloor(p, SEAM, 190);
  p.gradV(0, SEAM, 320, 3, [8, 7]);
  // ceiling
  p.rect(0, 0, 320, WALL_TOP, 7);
  for (let i = -6; i <= 6; i++) p.line(160 + i * 64, 0, 160 + i * 52, WALL_TOP, 8);
  for (const y of [7, 16]) p.hline(0, 319, y, 8);
  p.hline(0, 319, WALL_TOP - 1, 8);
  fluorescent(p, 90, 9, 44, false);
  fluorescent(p, 230, 9, 44, false);
  // air vent and smoke detector
  p.rect(150, 9, 20, 6, 8);
  for (let k = 0; k < 3; k++) p.hline(151, 168, 10 + k * 2, 0);
  p.ellipse(300, 18, 4, 1, 15);
  p.plot(300, 19, 12);
  // walls: retro mint above a wood chair rail
  p.rect(0, WALL_TOP, 320, SEAM - WALL_TOP, 11);
  p.hline(0, 319, WALL_TOP, 8);
  p.hline(0, 319, WALL_TOP + 1, 3);
  p.rect(0, 92, 320, SEAM - 92, 6);
  p.hline(0, 319, 91, 14);
  p.hline(0, 319, 92, 0);
  p.rect(0, SEAM - 2, 320, 2, 0);

  // ---------------------------------------------------------------- counter run
  // backsplash tiles
  p.rect(64, 66, 156, 22, 15);
  for (let x = 64; x <= 220; x += 6) p.vline(x, 66, 87, 7);
  for (let y = 66; y <= 87; y += 5) p.hline(64, 219, y, 7);
  // upper cabinets
  p.rect(62, 40, 160, 24, 6);
  p.hline(62, 221, 40, 14);
  p.hline(62, 221, 63, 0);
  for (let x = 62; x < 222; x += 32) {
    p.frame(x + 2, 42, 28, 20, 0);
    p.frame(x + 4, 44, 24, 16, 14);
    p.hline(x + 5, x + 26, 59, 0);
    p.rect(x + (x % 64 === 62 ? 26 : 4), 50, 1, 4, 14);
  }
  // counter (front edge on the floor at 112)
  p.at(112, () => {
    p.rect(62, 87, 160, 6, 7);
    p.hline(62, 221, 87, 15);
    p.rect(60, 92, 164, 2, 8);
    p.rect(62, 94, 160, 18, 6);
    for (let x = 62; x < 222; x += 20) {
      p.frame(x + 1, 95, 18, 15, 0);
      p.rect(x + 9, 98, 2, 1, 14);
    }
    p.hline(62, 221, 111, 0);
  });
  // sink (in the counter top) with a faucet
  p.at(112, () => {
    p.rect(70, 88, 22, 4, 8);
    p.rect(71, 89, 20, 2, 0);
    p.vline(81, 79, 88, 7);
    p.hline(81, 86, 79, 7);
    p.vline(86, 79, 82, 7);
    p.rect(77, 86, 2, 2, 7);
    p.rect(84, 86, 2, 2, 7);
    // mugs left "soaking"
    p.rect(73, 86, 3, 3, 12);
    p.rect(88, 86, 3, 3, 9);
  });
  // coffee machine: the SmartBrew 3000
  p.at(112, () => {
    const { x, y, w, h } = CM;
    p.rect(x, y, w, h, 8);
    p.rect(x + 1, y + 1, w - 2, h - 2, 7);
    p.vline(x + w - 2, y + 1, y + h - 2, 8);
    p.hline(x + 1, x + w - 2, y + 1, 15);
    // display bezel
    p.rect(x + 3, y + 3, w - 6, 8, 0);
    // brew alcove + spout + drip tray
    p.rect(x + 7, y + 12, 12, 7, 0);
    p.rect(x + 12, y + 12, 2, 2, 8);
    p.rect(x + 6, y + h - 2, 14, 2, 8);
    // brand + power switch
    p.micro(x + 2, y + h - 7, '', 0);
    p.rect(x + w - 5, y + 13, 3, 3, off ? 8 : 4);
    p.plot(x + w - 4, y + 14, off ? 0 : 12);
    // power cord down to the wall outlet
    p.line(x + w, y + 16, x + w + 4, y + 16, 0);
    if (!off) p.line(x + w + 4, y + 16, 146, 80, 0);
  });
  // wall outlet
  p.rect(144, 77, 5, 7, 15);
  p.frame(144, 77, 5, 7, 8);
  p.plot(146, 79, 0);
  p.plot(146, 82, 0);
  if (off) {
    // the unplugged cord dangles over the counter edge
    p.at(112, () => {
      p.line(CM.x + CM.w + 4, CM.y + 16, CM.x + CM.w + 7, 92, 0);
      p.rect(CM.x + CM.w + 6, 92, 3, 2, 8);
    });
  }
  // the ancient coffee pot on its warmer
  p.at(112, () => {
    p.rect(152, 84, 16, 5, 0);
    p.rect(153, 85, 14, 3, 8);
    p.plot(165, 86, 12);
    // glass carafe full of sludge
    p.poly([154, 75, 166, 75, 167, 84, 153, 84], 7);
    p.poly([155, 78, 165, 78, 166, 84, 154, 84], 0);
    p.hline(155, 165, 78, 6);
    p.vline(155, 76, 83, 15);
    p.rect(158, 72, 4, 3, 0);
    p.rect(167, 77, 2, 5, 0);
  });
  // microwave (blinking 12:00 drawn by the overlay)
  p.at(112, () => {
    p.rect(176, 76, 34, 13, 7);
    p.frame(176, 76, 34, 13, 8);
    p.rect(178, 78, 20, 9, 0);
    p.rect(179, 79, 18, 7, dith(0, 8, 3));
    p.rect(200, 78, 8, 4, 0);
    for (let k = 0; k < 3; k++) p.hline(201, 207, 83 + k, k % 2 ? 8 : 15);
  });
  // paper towels + a sad sponge
  p.at(112, () => {
    p.rect(212, 79, 5, 9, 15);
    p.vline(214, 77, 88, 8);
    p.rect(98, 87, 5, 2, 14);
    p.hline(98, 102, 86, 10);
  });

  // poster: HAVE YOU TRIED TURNING IT OFF AND ON AGAIN?
  p.rect(226, 36, 22, 28, 0);
  p.rect(227, 37, 20, 26, 1);
  p.circle(237, 46, 5, 11);
  p.circle(237, 46, 3, 1);
  p.vline(237, 41, 46, 11);
  p.micro(232, 53, 'OFF', 15);
  p.micro(229, 59, '+', 14);
  p.micro(234, 59, 'ON', 15);

  // wall clock (6:12 PM)
  clock(p, 34, 52, 5, 6, 12);

  // ---------------------------------------------------------------- fridge
  p.at(FR.z, () => {
    const { x, y, w, h } = FR;
    p.rect(x, y, w, h, 15);
    p.rect(x + w - 3, y, 3, h, 7);
    p.frame(x, y, w, h, 8);
    p.hline(x + 1, x + w - 2, y + 13, 8); // freezer line
    p.rect(x + 3, y + 5, 1, 5, 8);
    p.rect(x + 3, y + 17, 1, 9, 8);
    p.rect(x + 1, y + h - 3, w - 2, 3, 8);
    if (!fridgeOpen) {
      // magnets: pizza, dentist, letters... and THE joke magnet
      const mags: [number, number, number][] = [
        [x + 7, y + 3, 12],
        [x + 13, y + 6, 10],
        [x + 20, y + 2, 9],
        [x + 8, y + 17, 14],
        [x + 22, y + 25, 13],
        [x + 10, y + 30, 4],
        [x + 18, y + 33, 2],
      ];
      for (const [mx, my, mc] of mags) p.rect(mx, my, 3, 2, mc);
      // takeout menu
      p.rect(x + 6, y + 20, 7, 9, 14);
      p.hline(x + 7, x + 11, y + 22, 4);
      p.hline(x + 7, x + 11, y + 24, 8);
      // the light-bulb joke magnet (white with a tiny yellow bulb)
      p.rect(x + 15, y + 15, 9, 7, 15);
      p.frame(x + 15, y + 15, 9, 7, 0);
      p.rect(x + 16, y + 16, 2, 2, 14);
      p.plot(x + 16, y + 18, 8);
      p.hline(x + 19, x + 22, y + 17, 0);
      p.hline(x + 19, x + 21, y + 19, 0);
    }
  });
  if (fridgeOpen) {
    p.at(FR.z, () => {
      const { x, y, w, h } = FR;
      // interior
      p.rect(x + 2, y + 15, w - 5, h - 18, 11);
      p.rect(x + 3, y + 16, w - 7, h - 20, 15);
      for (const sy of [y + 23, y + 30]) p.hline(x + 3, x + w - 5, sy, 7);
      // MIKE'S sandwich, milk, meal-prep boxes, a ketchup packet
      p.rect(x + 5, y + 19, 9, 4, 14);
      p.rect(x + 6, y + 20, 7, 1, 6);
      p.rect(x + 8, y + 18, 4, 1, 15);
      p.rect(x + 16, y + 17, 4, 6, 15);
      p.frame(x + 16, y + 17, 4, 6, 9);
      for (let k = 0; k < 3; k++) p.rect(x + 5 + k * 6, y + 25, 5, 5, 2);
      p.rect(x + 8, y + 33, 3, 2, 4);
      // door swung open to the right, showing the magnets edge-on
      p.poly([x + w, y, x + w + 9, y + 3, x + w + 9, y + h - 2, x + w, y + h], 7);
      p.line(x + w, y, x + w + 9, y + 3, 8);
      p.vline(x + w + 9, y + 3, y + h - 2, 8);
      p.rect(x + w + 2, y + 18, 5, 2, 15);
      p.rect(x + w + 2, y + 26, 5, 2, 15);
    });
  }

  // ---------------------------------------------------------------- vending machine
  p.at(VM.z, () => {
    const { x, y, w, h } = VM;
    p.rect(x, y, w, h, 1);
    p.frame(x, y, w, h, 0);
    p.rect(x + 2, y + 2, w - 4, 6, 4);
    p.micro(x + 4, y + 3, 'SNACKS', 14);
    // glass front with rows of snacks
    p.rect(x + 3, y + 10, 21, 26, 0);
    const r = rng(17);
    const cols = [12, 14, 10, 13, 9, 15, 6];
    for (let row = 0; row < 4; row++) {
      const ry = y + 11 + row * 6;
      for (let k = 0; k < 4; k++) {
        if (row === 1 && k === 2) continue; // the stuck BREAK! slot
        const c = cols[Math.floor(r() * cols.length)];
        p.rect(x + 4 + k * 5, ry, 4, 4, c);
        p.hline(x + 4 + k * 5, x + 7 + k * 5, ry + 5, 8);
      }
      p.hline(x + 3, x + 23, ry + 6, 7);
    }
    // glass reflection
    p.line(x + 5, y + 34, x + 15, y + 11, 8);
    // keypad, coin slot, coin return
    p.rect(x + 25, y + 10, 7, 9, 8);
    for (let ky = 0; ky < 3; ky++) for (let kx = 0; kx < 2; kx++) p.plot(x + 27 + kx * 2, y + 12 + ky * 2, 15);
    p.rect(x + 26, y + 21, 5, 4, 8);
    p.vline(x + 28, y + 22, y + 24, 0);
    p.rect(x + 25, y + 28, 7, 6, 8);
    p.rect(x + 26, y + 30, 5, 3, 0);
    // pickup bin
    p.rect(x + 3, y + 37, 21, 5, 8);
    p.rect(x + 4, y + 38, 19, 3, 0);
    // WARNING sticker on the side panel
    p.rect(x + 25, y + 36, 7, 7, 14);
    p.poly([x + 28, y + 37, x + 31, y + 42, x + 25, y + 42], 0);
    p.plot(x + 28, y + 40, 14);
  });
  // the BREAK! bar stuck in its coil (drawn separately so it can vanish)
  if (!candy) {
    p.at(VM.z, () => {
      const bx = VM.x + 14,
        by = VM.y + 17;
      p.poly([bx, by, bx + 5, by + 2, bx + 4, by + 6, bx - 1, by + 4], 4);
      p.plot(bx + 1, by + 2, 14);
      p.plot(bx + 3, by + 3, 14);
      // the coil spiral
      p.line(bx - 1, by - 1, bx + 5, by - 1, 7);
    });
  }

  // ---------------------------------------------------------------- table & chairs
  // chair behind the table (seen from the front, background priority = behind the table)
  p.at(146, () => {
    p.rect(152, 124, 14, 14, 4);
    p.hline(152, 165, 124, 12);
    p.vline(153, 138, 146, 8);
    p.vline(164, 138, 146, 8);
  });
  p.at(164, () => {
    // table top
    p.poly([120, 141, 200, 141, 206, 149, 114, 149], 6);
    p.hline(120, 199, 141, 14);
    p.rect(114, 149, 93, 2, 0);
    // legs
    p.rect(118, 151, 3, 13, 8);
    p.rect(200, 151, 3, 13, 8);
    p.rect(134, 151, 2, 8, 8);
    p.rect(185, 151, 2, 8, 8);
    // the box of donuts (empty) and a newspaper
    p.rect(126, 140, 18, 6, 13);
    p.rect(127, 141, 16, 4, 15);
    p.plot(135, 142, 12);
    p.rect(166, 142, 16, 4, 7);
    p.hline(167, 181, 143, 8);
    p.hline(167, 178, 145, 8);
  });
  // side chairs
  for (const [cx, flip] of [
    [106, false],
    [214, true],
  ] as [number, boolean][]) {
    p.at(166, () => {
      const back = flip ? cx + 4 : cx - 6;
      p.rect(back, 136, 3, 30, 4);
      p.rect(cx - 6, 150, 13, 3, 4);
      p.hline(cx - 6, cx + 6, 150, 12);
      p.vline(flip ? cx - 5 : cx + 5, 153, 165, 8);
      p.vline(back + 1, 153, 165, 8);
    });
  }
  shadow(p, 160, 165, 48, 1);
}

// ---------------------------------------------------------------- helpers

function cycle(g: Game, key: string, list: string[]): string {
  const i = (g.flag(key) ?? 0) % list.length;
  g.inc(key);
  return list[i];
}

const MIKE_LINES = [
  "I've been feeding this thing quarters since four o'clock, Dom. FOUR quarters. That's a whole dollar. That's an entire dollar's worth of BREAK! bar hanging there, mocking me.",
  "If I had one more quarter, the next thing that drops would knock mine loose. That's basic physics. Or basic sales. Honestly, same thing.",
  "You know what this is, Dom? This is a hostage situation. And I don't negotiate with vending machines. Except I've been negotiating for two hours.",
  "My phone's fine, by the way. I've got this baby. Forty thousand milliamp-hours. I once powered an entire sales retreat off this thing. In Fresno. Don't ask.",
];

/** For a generic "machine": is the player closer to the vending machine than the SmartBrew? */
function nearerVending(g: Game) {
  return Math.abs(g.player.x - (VM.x + 10)) < Math.abs(g.player.x - (CM.x + 13));
}

async function approachVending(g: Game) {
  await g.approach([VM.x - 6, 124]);
  g.player.dir = 'right';
}

async function mikeSays(g: Game, text: string) {
  const m = g.actor('mike');
  if (!m) return g.say(text, { title: 'Mike' });
  m.data.busy = true;
  m.pose = null;
  m.faceToward(g.player.x, g.player.y);
  await g.talk(m, text);
  m.data.busy = false;
  m.dir = 'right';
}

/** Turn the SmartBrew back on (from off). Awards the reboot the first time. */
async function bootMachine(g: Game, how: string) {
  g.set('coffee_off', false);
  g.sfx('beep');
  g.redraw();
  await g.say(how);
  await g.wait(400);
  g.sfx('brew');
  if (!g.flag('coffee_rebooted')) {
    g.set('coffee_rebooted');
    award(g, 'reboot_coffee');
    await g.say('The display flickers to life:\n\n"SMARTBREW 3000 v4.1.8"\n"Contacting Monolith... TIMEOUT."\n"Running on local firmware. Monolith unreachable. Brewing anyway."\n\nThe display settles on a cheerful green READY. Have you tried turning it off and on again? You have now.');
  } else {
    await g.say('The SmartBrew boots straight back up on local firmware. READY.');
  }
}

async function brew(g: Game) {
  await g.approach([CM.x + 13, 118]);
  g.player.dir = 'up';
  if (g.has('coffee')) return void (await g.say("Your mug is already full of hot coffee. Fahim's eyes would light up just smelling it."));
  if (g.flag('coffee_off')) return void (await g.say("The machine is switched off. It's hard to brew coffee with a very expensive paperweight."));
  if (!g.flag('coffee_rebooted')) {
    if (g.has('mug')) {
      await g.pose(null, 'reach', 400);
      g.sfx('error');
      return void (await g.say('You set your mug under the spout and press BREW. The display flashes:\n\n"418 I\'M A TEAPOT."\n\nIt refuses to brew coffee on the grounds that it is a teapot. It is not a teapot. Maybe it just needs a fresh start.'));
    }
    g.sfx('error');
    return void (await g.say('You press BREW. "418 I\'M A TEAPOT." It refuses on principle. Also, you have nothing to put the coffee in.'));
  }
  if (!g.has('mug')) return void (await g.say("You press BREW and stop yourself just in time. Without a mug, it would brew directly onto the floor. Your mug is back at your desk... or wherever you left it."));
  await g.pose(null, 'reach', 400);
  g.removeItem('mug');
  brewT = g.t;
  g.sfx('brew');
  await g.wait(1600);
  brewT = -1;
  g.addItem('coffee');
  award(g, 'fill_mug');
  await g.pose(null, 'reach', 300);
  await g.say('You slide your mug under the spout and press BREW. The SmartBrew gurgles, hisses, and fills your WORLD\'S OKAYEST PROGRAMMER mug with steaming, beautiful, local-firmware coffee.\n\nIt smells like hope. Somebody in this building needs this more than you do.');
}

async function shakeDeath(g: Game) {
  await approachVending(g);
  await g.pose(null, 'reach', 300);
  g.sfx('thud');
  g.shake(400);
  await g.wait(500);
  g.sfx('thud');
  g.shake(600);
  await g.wait(400);
  g.sfx('crash');
  g.flash(15, 150);
  g.shake(900);
  g.player.visible = false;
  return g.die('You grab the vending machine and give it a good, manly rock. It rocks back. Then forward. Then, with the slow majesty of a felled redwood, it keeps going.\n\nThe sticker did warn you. In capital letters.\n\nYou survived twelve production outages, three reorgs and a Friday deploy. It was the snack that finally got you.', { title: 'Snack Attack' });
}

async function drinkDeath(g: Game) {
  await g.approach([160, 118]);
  g.player.dir = 'up';
  await g.pose(null, 'reach', 400);
  await g.say('You pour a splash of the ancient coffee into a paper cup. It pours like motor oil. It hisses on contact with the paper. Bravely, foolishly, you take a sip.');
  g.sfx('zap');
  g.flash(2, 200);
  g.shake(500);
  await g.wait(500);
  return g.die('The coffee has achieved sentience. It does not appreciate being drunk.\n\nYour last thought, as the room fades to brown, is that it tasted faintly of 1999.', { title: 'Bad Brew' });
}

async function buyCandy(g: Game) {
  if (!g.has('quarter')) {
    await approachVending(g);
    return void (await g.say(
      g.flag('coin_found')
        ? "You don't have any change."
        : "You pat your pockets. No cash, no coins. Your phone, and the credit card that lives inside it, died at lunch. If only money grew in vending machines.",
    ));
  }
  await approachVending(g);
  await g.pose(null, 'reach', 400);
  g.removeItem('quarter');
  g.sfx('coin');
  await g.say('You drop the quarter into the slot and punch in the code for a BREAK! bar. The coil in row three begins to turn...');
  vendT = g.t;
  g.sfx('vend');
  await g.wait(700);
  g.set('candy_bought');
  g.redraw();
  g.sfx('thud');
  g.shake(250);
  await g.wait(500);
  vendT = -1;
  g.addItem('candy');
  award(g, 'buy_candy');
  await g.say("...and your BREAK! bar drops. On its way down it clips the coil above, and Mike's stuck bar shakes loose too. THUNK. THUNK. Two BREAK! bars in the bin.\n\nYou take yours.");
  const m = g.actor('mike');
  if (m) {
    m.data.busy = true;
    m.pose = 'cheer';
    m.dir = 'down';
    await g.wait(500);
    m.pose = null;
    m.faceToward(g.player.x, g.player.y);
  }
  await convo(g, [
    ['mike', "DOM! DOM! Did you SEE that? BOTH OF THEM! Two-for-one! That's not a snack, that's a DEAL! You just closed a two-for-one deal on a vending machine!"],
    ['mike', "You know what? You've earned this. Here. Take my power bank. No, I insist. Forty thousand milliamp-hours of pure gratitude."],
    ['me', "Mike, I can't take your power bank."],
    ['mike', "You can and you will. Sales is all about relationships, Dom. And this relationship just got a BREAK!"],
  ]);
  g.addItem('powerbank');
  award(g, 'mike_bank');
  await g.pose(null, 'reach', 400);
  await g.say("Mike presses his enormous power bank into your hands. It's the size and weight of a brick, with four smug blue LEDs.");
  if (m) {
    await g.talk(m, "Right! Back to my desk. I've got a guy named Gary who thinks we're having an outage. We are, but he doesn't need to know that.");
    m.dir = 'down';
    await g.walk(m, m.x - 20, 160, { direct: true });
    await g.walk(m, 150, 200, { direct: true });
    g.remove(m);
  }
}

async function findCoin(g: Game) {
  await g.approach([VM.x + 4, 120]);
  g.player.dir = 'up';
  await g.pose(null, 'reach', 400);
  if (g.flag('coin_found')) return void (await g.say('You check the coin return again, out of habit. Empty. Lightning does not strike the same coin return twice.'));
  g.set('coin_found');
  award(g, 'coin_return');
  g.addItem('quarter');
  g.sfx('coin');
  await g.say("You poke a finger into the coin return, the way everyone does, expecting nothing.\n\nThere's a quarter in it! The machine must have spat one back at some point during Mike's two-hour negotiation. You take it.");
  if (g.actor('mike')) await mikeSays(g, "Wait. Was that... was that MY quarter? You know what, keep it. That machine already has four of mine. Maybe you'll have better luck.");
}

export const breakroom: RoomDef = {
  id: 'breakroom',
  title: 'Break Room',
  act: 1,
  music: 'office',
  start: [160, 182, 'up'],
  draw: paint,
  walk: [[0, 116, 320, 116, 320, 189, 0, 189]],
  blocks: (g) => [
    [12, 110, 40, 8], // fridge
    [VM.x - 2, 110, VM.w + 4, 8], // vending machine
    [104, 140, 112, 26], // table and chairs
    ...(g.flag('candy_bought') ? [] : [[MIKE_POS[0] - 5, MIKE_POS[1] - 3, 10, 5]]),
  ],
  look: (g) =>
    `The break room: the beating heart of the office, and currently its most dysfunctional organ. Along the counter: a sink full of "soaking" mugs, the SmartBrew 3000 coffee machine, an ancient coffee pot, and a microwave blinking 12:00. There's a fridge plastered with magnets, a table with an empty donut box, and a vending machine.${
      g.flag('candy_bought') ? '' : ' Mike from Sales is locked in mortal combat with the vending machine.'
    }`,
  hotspots: [
    {
      id: 'coffeemaker',
      nouns: ['coffee machine', 'coffeemaker', 'coffee maker', 'smartbrew', 'smartbrew 3000', 'brewer', 'espresso machine', 'spout', 'brew button'],
      area: [CM.x - 1, CM.y - 1, CM.w + 2, CM.h + 2],
      at: [CM.x + 13, 118],
      look: (g) =>
        g.flag('coffee_off')
          ? 'The SmartBrew 3000, switched off. Its display is dark. It looks peaceful, for once.'
          : g.flag('coffee_rebooted')
            ? 'The SmartBrew 3000, running proudly on local firmware. Its display reads READY in a calm, unbothered green.'
            : 'The SmartBrew 3000: an Internet-connected, cloud-enabled, AI-optimized coffee machine that, for reasons nobody can explain, runs its firmware off the Monolith. Its display reads:\n\n"418 I\'M A TEAPOT."\n\nIt is not a teapot.',
    },
    {
      id: 'cmdisplay',
      nouns: ['coffee display', 'teapot', '418', 'error', 'error message', 'display', 'screen'],
      area: [CM.x + 3, CM.y + 3, CM.w - 6, 8],
      at: [CM.x + 13, 118],
      look: (g) =>
        g.flag('coffee_off') ? 'The display is dark.' : g.flag('coffee_rebooted') ? 'READY.' : '"418 I\'M A TEAPOT." An HTTP status code from a 1998 April Fools\' RFC. Somebody at SmartBrew has a sense of humor. You do not, at the moment.',
    },
    {
      id: 'cord',
      nouns: ['cord', 'power cord', 'plug', 'outlet', 'socket', 'wall outlet', 'power switch', 'switch'],
      area: [CM.x + CM.w - 6, CM.y + 10, 40 - CM.w + 18, 16],
      at: [CM.x + 20, 118],
      look: (g) => (g.flag('coffee_off') ? "The SmartBrew's power switch is off." : "The SmartBrew's power cord runs to a wall outlet. Its power switch glows red. Both look very easy to switch off. And on again."),
    },
    {
      id: 'pot',
      nouns: ['pot', 'coffee pot', 'old coffee', 'ancient coffee', 'old pot', 'carafe', 'warmer', 'sludge', 'old coffee pot', 'ancient coffee pot', 'burner'],
      area: [151, 70, 20, 20],
      at: [160, 118],
      look: "An ancient glass coffee pot on a warmer that has never, ever been switched off. Its contents were brewed sometime during a previous administration. It has a skin. The skin has a skin.\n\nOccasionally, it bubbles. Nobody has turned it on.",
    },
    {
      id: 'microwave',
      nouns: ['microwave', 'microwave oven', 'clock display', '12 00'],
      area: [175, 75, 36, 15],
      at: [192, 118],
      look: "A microwave, blinking 12:00 since the power blip. Inside, someone's reheated fish from lunch. Nobody will admit it's theirs. Everybody knows it's Gary from Accounting.",
    },
    {
      id: 'sink',
      nouns: ['sink', 'faucet', 'tap', 'dirty mugs', 'mugs', 'dishes', 'sponge'],
      area: [68, 77, 36, 15],
      at: [82, 118],
      look: 'A sink full of mugs that people are "letting soak." Some have been soaking since the last reorg. The faucet drips with the patience of a mainframe.',
    },
    {
      id: 'cabinets',
      nouns: ['cabinets', 'cabinet', 'cupboard', 'cupboards', 'upper cabinets', 'counter', 'countertop', 'drawers'],
      area: [62, 40, 160, 24],
      at: [140, 118],
      look: 'Wooden cabinets above the counter, and more below it. Over the years they have collected paper plates, plastic forks and approximately four hundred sugar packets. Never coffee filters. There are never coffee filters.',
    },
    {
      id: 'poster',
      nouns: ['poster', 'it poster', 'off and on', 'turning it off and on again'],
      area: [225, 35, 24, 30],
      at: [236, 118],
      look: 'A poster from the IT department, featuring a giant power button: "HAVE YOU TRIED TURNING IT OFF AND ON AGAIN?"\n\nIt is the most effective piece of technical documentation in the building.',
    },
    {
      id: 'fridge',
      nouns: ['fridge', 'refrigerator', 'freezer', 'icebox', 'magnets', 'fridge magnets', 'menu', 'takeout menu'],
      area: [FR.x - 1, FR.y - 1, FR.w + 12, FR.h + 2],
      at: [36, 120],
      look: (g) =>
        g.flag('br_fridge_open')
          ? "The fridge is open. Inside: a sandwich labeled \"MIKE'S - DO NOT EAT. I KNOW WHO YOU ARE.\", a carton of oat milk that expired in March, a stack of identical meal-prep boxes, and a single lonely ketchup packet."
          : 'The office fridge. Its door is a mosaic of magnets: a pizza place, a dentist, a takeout menu from 2016, and one white magnet with a little light bulb on it and a joke printed underneath.',
    },
    {
      id: 'magnet',
      nouns: ['magnet', 'joke magnet', 'white magnet', 'light bulb magnet', 'joke', 'bulb magnet', 'light bulb'],
      area: [FR.x + 14, FR.y + 14, 11, 9],
      at: [36, 120],
      when: (g) => !g.flag('br_fridge_open'),
      look: 'The white magnet has a tiny light bulb on it, and a joke:\n\n"Q: How many programmers does it take to change a light bulb?\nA: None. That\'s a hardware problem."\n\nIt\'s an oldie. Denis-level old.',
    },
    {
      id: 'sandwich',
      nouns: ['sandwich', 'mikes sandwich', 'label', 'food', 'lunch'],
      area: [FR.x + 4, FR.y + 17, 11, 7],
      at: [36, 120],
      when: (g) => !!g.flag('br_fridge_open'),
      look: 'A sandwich in plastic wrap, labeled in angry capitals: "MIKE\'S - DO NOT EAT. I KNOW WHO YOU ARE." The handwriting is confident. The threat seems credible.',
    },
    {
      id: 'vending',
      nouns: ['vending machine', 'vending', 'snack machine', 'candy machine', 'vendor', 'snacks', 'glass', 'coil', 'keypad', 'sticker', 'warning sticker', 'warning'],
      area: [VM.x - 1, VM.y - 1, VM.w + 2, VM.h + 2],
      at: [VM.x - 6, 124],
      look: (g) =>
        `A snack vending machine, humming to itself. ${
          g.flag('candy_bought') ? "The slot where Mike's BREAK! bar was stuck is empty now." : "In the third row, a BREAK! bar dangles from its coil at a heartbreaking angle, stuck fast."
        } On the side there's a coin slot, a coin return, and a yellow sticker:\n\n"WARNING: DO NOT ROCK OR TILT. MACHINE MAY TIP OVER CAUSING SERIOUS INJURY OR DEATH."`,
    },
    {
      id: 'stuckbar',
      nouns: ['stuck bar', 'stuck candy', 'mikes bar', 'mikes candy', 'break bar in machine', 'stuck break bar'],
      area: [VM.x + 12, VM.y + 17, 9, 9],
      at: [VM.x - 6, 124],
      when: (g) => !g.flag('candy_bought'),
      look: "Mike's BREAK! bar, hanging from the end of its coil by one corner of the wrapper. So close to freedom. A gentle nudge from above would probably knock it loose.",
    },
    {
      id: 'coinreturn',
      nouns: ['coin return', 'return', 'coin slot', 'slot', 'change slot', 'return slot'],
      area: [VM.x + 24, VM.y + 20, 9, 15],
      at: [VM.x + 4, 120],
      look: (g) => (g.flag('coin_found') ? 'The coin return. Empty. You already got the one quarter it had in it.' : 'The coin slot, and below it a little coin return flap. Everybody checks the coin return. It is the law.'),
    },
    {
      id: 'bin',
      nouns: ['bin', 'pickup bin', 'flap', 'tray', 'pickup'],
      area: [VM.x + 2, VM.y + 39, 23, 7],
      at: [VM.x - 6, 124],
      look: 'The pickup bin at the bottom of the vending machine. Empty, unless you count hope.',
    },
    {
      id: 'table',
      nouns: ['table', 'donuts', 'donut', 'donut box', 'box', 'newspaper', 'chairs', 'chair'],
      area: [104, 120, 116, 46],
      at: [160, 172],
      look: 'A break room table, sticky in places that defy explanation. On it: yesterday\'s newspaper and a pink donut box, empty except for a single, lonely sprinkle.',
    },
    {
      id: 'clock',
      nouns: ['clock', 'wall clock', 'time'],
      area: [28, 46, 13, 13],
      at: [40, 120],
      look: "The wall clock says 6:12 PM. The investors arrive Monday at 9:00 AM. That's sixty-two hours and forty-eight minutes, not that you're counting.",
    },
  ],
  exits: [{ area: [0, 186, 320, 4], to: 'hallway', at: HALL_ARRIVE.breakroom, dir: 'south|out' }],
  enter(g) {
    if (!g.flag('candy_bought')) {
      const m = addNpc(g, 'mike', MIKE_POS[0], MIKE_POS[1], 'right');
      m.data.gap = 18;
      // slap the machine every so often
      m.behavior = (a, t) => {
        if (a.data.busy || a.talking || g.busy) {
          if (a.pose === 'reach') a.pose = null;
          return;
        }
        const k = t % 260;
        a.pose = (k > 200 && k < 212) || (k > 224 && k < 236) ? 'reach' : null;
      };
    }
  },
  afterEnter: async (g) => {
    if (g.flag('candy_bought') || g.flag('br_mike_greeted')) return;
    g.set('br_mike_greeted');
    const m = g.actor('mike');
    if (!m) return;
    m.data.busy = true;
    await g.pose(m, 'reach', 250);
    g.sfx('thud');
    await g.pose(m, 'reach', 250);
    g.sfx('thud');
    await g.talk(m, "Come ON! That's MY BREAK! bar!");
    m.data.busy = false;
  },
  overlay(g, s, t) {
    // SmartBrew display
    const dx = CM.x + 4,
      dy = CM.y + 4;
    if (!g.flag('coffee_off')) {
      if (g.flag('coffee_rebooted')) {
        s.micro(dx, dy, 'READY', 10);
      } else {
        const k = Math.floor(t / 40) % 4;
        if (k < 2) s.micro(dx + 3, dy, '418', 12);
        else s.micro(dx + 3, dy, k === 2 ? 'TEA' : 'POT', 14);
      }
    }
    // the ancient pot bubbles ominously and gives off greenish fumes
    const ph = t % 140;
    if (ph < 50) {
      s.plot(158 + ((ph >> 4) & 1), 80, 8);
      s.plot(162, 81, ph < 25 ? 8 : 0);
    }
    const fum = (t >> 3) % 12;
    s.plot(159 + (fum % 3) - 1, 70 - fum, fum < 6 ? 2 : 8);
    if (fum > 3) s.plot(161 - (fum % 2), 73 - fum, 2);
    // microwave clock blinking 12:00
    if (Math.floor(t / 35) % 2 === 0) s.micro(180, 80, '12:00', 10);
    // the sink drips
    const dp = t % 90;
    if (dp < 12) s.plot(86, 82 + (dp >> 1), 11);
    // vending machine hum light
    s.plot(VM.x + 31, VM.y + 3, Math.floor(t / 50) % 2 ? 10 : 2);
    // brewing: mug under the spout with steam
    if (brewT >= 0) {
      drawMug(s, CM.x + 11, CM.y + 14, 15, { steam: Math.floor(t / 8) % 2 === 0 });
      if ((t - brewT) % 6 < 4) s.vline(CM.x + 13, CM.y + 14, CM.y + 15, 6);
    }
    // the candy drop
    if (vendT >= 0) {
      const k = Math.min(18, Math.floor((t - vendT) / 3));
      s.rect(VM.x + 14, VM.y + 17 + k, 5, 3, 4);
      if (k > 6) s.rect(VM.x + 9, VM.y + 23 + Math.min(12, k - 6), 5, 3, 4);
    }
  },
  front(g, s) {
    // Mike's giant power bank, clutched in his hand
    const m = g.actor('mike');
    if (!m || !m.visible || g.flag('candy_bought')) return;
    const x = Math.round(m.x),
      y = Math.round(m.y);
    if (m.pose === 'reach') return;
    const hx = m.dir === 'left' ? x - 4 : m.dir === 'right' ? x - 1 : x + 4;
    s.rect(hx, y - 18, 4, 6, 8);
    s.plot(hx + 1, y - 16, 11);
    s.plot(hx + 2, y - 16, 11);
  },
  nouns: {
    machine: ['machine', 'machines'],
    water: ['water', 'tap water', 'glass of water'],
  },
  verbs: {
    // ---------------- the SmartBrew 3000
    'look machine,look computer': async (g) => g.say('Which machine? There are two: the SmartBrew 3000 coffee machine, and the vending machine. Both are having a bad day.'),
    'reboot coffeemaker|machine|computer|cmdisplay|cord,reboot': async (g, c) => {
      if (!c.noun && !g.near('coffeemaker', 60)) return false;
      await g.approach([CM.x + 13, 118]);
      g.player.dir = 'up';
      await g.pose(null, 'reach', 400);
      g.set('coffee_off', true);
      g.sfx('beep');
      g.redraw();
      await g.wait(700);
      await bootMachine(g, 'You flip the power switch off. The SmartBrew powers down with a sad little descending chime. You count to ten, the way the IT poster recommends, and flip it back on.');
    },
    'turnoff|unplug coffeemaker|machine|computer|cord|cmdisplay,pull cord,turn coffeemaker|cord,flip coffeemaker|cord,push|use cord': async (g, c) => {
      await g.approach([CM.x + 13, 118]);
      g.player.dir = 'up';
      if (g.flag('coffee_off')) {
        if (c.verb === 'flip' || c.verb === 'push' || c.verb === 'use' || c.verb === 'turn') return void (await bootMachine(g, 'You flip the power switch back on. The SmartBrew chimes.'));
        return void (await g.say("It's already off."));
      }
      await g.pose(null, 'reach', 400);
      g.set('coffee_off', true);
      g.sfx('beep');
      g.redraw();
      await g.say(
        c.verb === 'unplug' || c.verb === 'pull'
          ? 'You yank the plug out of the wall. The SmartBrew dies with a sad little descending chime. Its display goes dark.'
          : 'You flip the power switch. The SmartBrew powers down with a sad little descending chime. Its display goes dark.',
      );
    },
    'turnon|plug coffeemaker|machine|computer|cord|cmdisplay,put|plug cord outlet': async (g) => {
      await g.approach([CM.x + 13, 118]);
      g.player.dir = 'up';
      if (!g.flag('coffee_off')) {
        return void (await g.say(g.flag('coffee_rebooted') ? "It's already on and READY." : "It's already on. It's just on in a teapot sort of way. It might need a proper fresh start."));
      }
      await g.pose(null, 'reach', 400);
      await bootMachine(g, 'You switch the SmartBrew back on. It chimes, whirs, and thinks about its life.');
    },
    'fill|put|use mug|coffee ?,fill ?,take coffee,use|push coffeemaker|cmdisplay,use|push machine|computer': async (g, c) => {
      const n2 = c.noun2;
      if (n2 === 'pot' || (c.verb === 'fill' && c.noun === 'pot')) {
        await g.approach('pot');
        return void (await g.say('You tilt the ancient pot over your mug. The coffee does not pour. It... oozes. Then it reconsiders and slides back into the pot. You set it down very carefully.'));
      }
      if (n2 === 'sink' || n2 === 'water') {
        await g.approach('sink');
        return void (await g.say('Water? In the coffee mug? The mug would never forgive you. You give it a rinse and leave it empty.'));
      }
      if (n2 && ['vending', 'coinreturn', 'bin', 'fridge', 'microwave', 'mike'].includes(n2)) return false;
      if (c.verb === 'take' && g.has('coffee')) return false;
      if (c.verb === 'fill' && c.noun && !['mug', 'coffee', 'coffeemaker', 'machine', 'computer'].includes(c.noun)) return false;
      if (c.verb === 'put' && !n2) return false;
      if ((c.verb === 'use' || c.verb === 'push') && (c.noun === 'machine' || c.noun === 'computer') && nearerVending(g)) return false;
      await brew(g);
    },
    'attack coffeemaker|cmdisplay,attack machine|computer': async (g, c) => {
      if (c.noun !== 'coffeemaker' && c.noun !== 'cmdisplay' && nearerVending(g)) return false;
      await g.approach([CM.x + 13, 118]);
      g.sfx('thud');
      await g.say(g.flag('coffee_rebooted') ? "Please don't kick the only working thing on this floor." : '"418 I\'M A TEAPOT." Kicking it seems to have made it more confident.');
    },
    'fix|debug coffeemaker|cmdisplay|machine': async (g) =>
      g.say(g.flag('coffee_rebooted') ? "It's working. Don't touch it." : "You squint at the SmartBrew. It's not broken, exactly. It just can't reach the Monolith and has panicked into teapot mode. What's the first thing IT always says?"),
    'read cmdisplay,read poster': async (g, c) => g.say(c.noun === 'poster' ? '"HAVE YOU TRIED TURNING IT OFF AND ON AGAIN?"' : (breakroom.hotspots!.find((h) => h.id === 'cmdisplay')!.look as (g: Game) => string)(g)),
    'take coffeemaker': "It's bolted to the counter, and it weighs about as much as a small car. A small, sulky car.",
    // ---------------- the ancient coffee pot
    'drink pot,drink ?': async (g, c) => {
      if (c.noun === 'coffee' && !c.noun2 && g.has('coffee')) return false;
      if (c.noun === 'pot' || c.noun2 === 'pot') return drinkDeath(g);
      if (c.noun === 'coffee' || c.noun === 'coffeemaker') {
        return void (await g.say("The only coffee in here right now is in that ancient pot, and it has been there since before the Monolith's last reboot. The SmartBrew might make you a fresh cup, if it ever stops believing it's a teapot."));
      }
      if (c.noun === 'sink' || c.noun === 'water' || !c.noun) return void (await g.say('You slurp some tap water from your cupped hands. Refreshing, but it is not coffee.'));
      return false;
    },
    'take|use|pour|empty pot': async (g) => {
      await g.approach('pot');
      await g.say("You grab the handle. The pot doesn't move. It seems to be fused to the warmer, possibly by choice. Also, you can feel it watching you.");
    },
    'turnoff|turnon pot': "The warmer's switch is fused in the ON position. It has been on since 1999. Like the Monolith. Coincidence? Almost certainly. Probably.",
    'smell pot,smell': async (g, c) => {
      if (c.noun && c.noun !== 'pot') return false;
      await g.say('The break room smells like burnt toast, regret, and, faintly, from the direction of the ancient pot, ozone.');
    },
    'eat pot': "It's coffee. You don't eat coffee. Although this coffee might be chewable.",
    // ---------------- vending machine
    'shake vending|machine|computer|stuckbar,push|pull vending|stuckbar,push|pull machine|computer,climb vending,lift vending': async (g, c) => {
      if ((c.noun === 'machine' || c.noun === 'computer') && c.verb !== 'shake' && !nearerVending(g)) return false;
      return shakeDeath(g);
    },
    'attack vending|stuckbar,attack machine|computer': async (g) => {
      await approachVending(g);
      g.sfx('thud');
      g.shake(250);
      await g.say('You give the vending machine a solid kick. It rocks ominously forward... hangs there for one long, terrible second... and settles back with a clunk. The BREAK! bar does not budge.\n\nThe WARNING sticker suddenly seems very relevant.');
      if (g.actor('mike')) await mikeSays(g, "Whoa! Easy, Dom! I already tried that. You don't want to know how I learned about the sticker.");
    },
    'look/in coinreturn,search coinreturn,look coinreturn,push|open|use coinreturn,search vending|machine,look/in vending|machine,take coinreturn,put hands coinreturn': async (g, c) => {
      if (c.verb === 'look' && !c.prep && g.flag('coin_found')) return false;
      await findCoin(g);
    },
    'buy candy,buy ?,use vending,push button,put|use|give quarter vending|coinreturn|machine|computer|stuckbar,put quarter,use quarter,give quarter mike': async (g, c) => {
      if (c.verb === 'buy' && c.noun && !['candy', 'vending', 'stuckbar', 'machine', 'computer'].includes(c.noun)) return false;
      if (c.verb === 'give' && c.noun2 === 'mike') {
        if (!g.has('quarter')) return false;
        return void (await mikeSays(g, "Dom, I appreciate it. I really do. But I've used up all my luck on this machine. You do the honors. Buy something. Buy anything. Just make it drop."));
      }
      if (g.flag('candy_bought') && !g.has('quarter')) {
        await approachVending(g);
        return void (await g.say("You've got your BREAK! bar, and you're out of quarters. Best not to push your luck with this machine."));
      }
      await buyCandy(g);
    },
    'take stuckbar,take candy,get candy,reach stuckbar,take ?': async (g, c) => {
      if (c.verb === 'take' && c.noun === 'candy' && g.has('candy')) return false;
      if (c.noun !== 'stuckbar' && c.noun !== 'candy' && c.noun !== 'bin') return false;
      if (g.flag('candy_bought')) return void (await g.say("There's nothing left in the machine you can reach."));
      await approachVending(g);
      await g.pose(null, 'reach', 500);
      await g.say('You reach up through the pickup flap, the way every human being has tried at least once. Your arm gets about as far as your elbow. You extract it with your dignity mostly intact.');
      if (g.actor('mike')) await mikeSays(g, 'Tried that. Lost a watch.');
    },
    'read vending,read sticker,look sticker': 'The sticker reads: "WARNING: DO NOT ROCK OR TILT. MACHINE MAY TIP OVER CAUSING SERIOUS INJURY OR DEATH." There is a little drawing of a stick figure being flattened. The stick figure looks hungry.',
    // ---------------- Mike
    'look mike': async (g) =>
      g.say(
        g.actor('mike')
          ? "Mike from Sales: blond hair, gray suit, red tie, and the energy of a man on his fourth espresso and zero BREAK! bars. In one hand he clutches an enormous power bank. With the other, he's slapping the vending machine."
          : 'Mike went back to his desk in the open office, a happy man.',
      ),
    'talk mike,ask mike ?,tell mike ?,say mike,hello mike': async (g) => {
      if (!g.actor('mike')) return false;
      await g.approach(g.actor('mike')!);
      if (!g.flag('br_mike_talked')) {
        g.set('br_mike_talked');
        const m = g.actor('mike')!;
        m.data.busy = true;
        m.pose = null;
        m.faceToward(g.player.x, g.player.y);
        await convo(g, [
          ['mike', "Dom! My guy! Thank God. You're an engineer. Engineer this. That's MY BREAK! bar. I paid for it. Twice. It's stuck on the coil like a hostage."],
          ['me', 'Have you tried turning it off and on again?'],
          ['mike', "Don't joke, Dom. I'm out of change. I'm out of patience. I'm almost out of blood sugar. If somebody bought one more thing out of that row, the whole coil would turn and knock mine loose."],
          ['mike', "And before you ask, no, I'm not shaking it. Read the sticker. I read the sticker. I learned to read the sticker the hard way."],
        ]);
        m.data.busy = false;
        m.dir = 'right';
        return;
      }
      await mikeSays(g, cycle(g, 'br_mike_i', MIKE_LINES));
    },
    'look powerbank': async (g) => {
      if (g.has('powerbank')) return false;
      if (!g.actor('mike')) return false;
      await g.say("Mike's power bank. It's the size of a brick and it has four smug blue LEDs. You could charge a small data center with it.");
    },
    'take|ask|borrow powerbank,ask mike powerbank,ask mike *': async (g, c) => {
      if (!g.actor('mike')) return false;
      if (c.verb === 'ask' && c.noun2 && c.noun2 !== 'powerbank' && c.noun !== 'powerbank') return false;
      if (c.verb === 'ask' && c.noun === 'mike' && !c.noun2) return false;
      await g.approach(g.actor('mike')!);
      await mikeSays(g, "This? This is my baby, Dom. Forty thousand milliamp-hours. I'm not parting with her on an empty stomach. Ask me again when I've got my BREAK! bar.");
    },
    'give|show * mike': async (g, c) => {
      if (!g.actor('mike') || !c.noun || !g.has(c.noun)) return false;
      await g.approach(g.actor('mike')!);
      if (c.noun === 'coffee') return void (await mikeSays(g, "Coffee? Ooh. No. No, I'm a tea man after six. Besides, I think Fahim would actually die without that. Literally. Go check on him."));
      if (c.noun === 'phone') return void (await mikeSays(g, "Dead phone? Ha! Amateur. When I get my BREAK! back, maybe we can talk about my power bank."));
      await mikeSays(g, "Appreciate the thought, Dom, but unless it's a quarter or a BREAK! bar, it's not going to help me right now.");
    },
    'attack|push|shake mike': "Mike's having a hard enough day. Besides, he'd probably try to upsell you mid-fight.",
    // ---------------- fridge
    'open fridge|magnet|sandwich': async (g) => {
      await g.approach('fridge');
      if (g.flag('br_fridge_open')) return void (await g.say("It's already open. The fridge is humming about it."));
      await g.pose(null, 'reach', 300);
      g.set('br_fridge_open');
      g.sfx('door');
      g.redraw();
      await g.say("You open the fridge. Inside: a sandwich labeled \"MIKE'S - DO NOT EAT. I KNOW WHO YOU ARE.\", a carton of oat milk that expired in March, eleven identical meal-prep boxes, and a single lonely ketchup packet.");
    },
    'close fridge,push fridge': async (g) => {
      if (!g.flag('br_fridge_open')) return void (await g.say("It's already closed."));
      await g.approach('fridge');
      g.set('br_fridge_open', false);
      g.sfx('door');
      g.redraw();
      await g.say('You close the fridge. The magnets rattle in protest.');
    },
    'look/in fridge,search fridge': async (g) => {
      if (!g.flag('br_fridge_open')) {
        await g.approach('fridge');
        g.set('br_fridge_open');
        g.sfx('door');
        g.redraw();
      }
      await g.say("Inside the fridge: Mike's sandwich (\"DO NOT EAT. I KNOW WHO YOU ARE.\"), expired oat milk, eleven meal-prep boxes that all say \"CHICKEN + RICE (DAY 3)\", and a ketchup packet. Nothing you need. Probably nothing anyone needs.");
    },
    'read magnet,look magnet,read joke': async (g) => {
      await g.approach('fridge');
      if (g.flag('br_fridge_open')) {
        g.set('br_fridge_open', false);
        g.redraw();
        await g.say('You swing the fridge door closed to look at the magnets.');
      }
      g.set('magnet_read');
      await g.say('The white magnet has a tiny light bulb on it, and a joke:\n\n"Q: How many programmers does it take to change a light bulb?\nA: None. That\'s a hardware problem."\n\nIt\'s an oldie. The kind of joke someone who has been in this business since the 1980s would love.');
    },
    'read fridge,read menu': 'The takeout menu is for a pizza place that closed in 2016. The magnets are mostly from dentists. One, a white one with a little light bulb on it, has a joke printed on it.',
    'take magnet': async (g) => {
      await g.approach('fridge');
      await g.say("You'd take it, but it's holding up the takeout menu, which is holding up the dentist magnet, which is holding up... the whole system is load-bearing. Better to just remember the joke.");
    },
    'take|eat sandwich': async (g) => {
      if (!g.flag('br_fridge_open')) return void (await g.say("You don't see a sandwich. The fridge is closed."));
      await g.approach('fridge');
      await g.say('You reach for the sandwich. The label stares back at you: "I KNOW WHO YOU ARE." You decide you don\'t want to find out whether that\'s true.');
      if (g.actor('mike')) await mikeSays(g, "Dom. DOM. I can see you. I can always see you.");
    },
    'take|drink milk,take ketchup,eat ketchup,take food,eat food': "Everything in that fridge is either expired, labeled with a threat, or both.",
    'take fridge': "It's a fridge. Even you can't carry a fridge, and you once carried a 42U server rack up three flights of stairs.",
    // ---------------- dressing
    'open|use microwave': async (g) => {
      await g.approach('microwave');
      await g.say('You open the microwave. The ghost of reheated fish escapes like an unhandled exception. You close it again, quickly.');
    },
    'take microwave,turnon|turnoff microwave,fix microwave': 'The microwave is fine. It just thinks it is 12:00. Honestly, it has a better grip on reality than the coffee machine.',
    'use|turnon|turnoff sink,drink sink,drink water,take water,wash ?,clean mug': async (g, c) => {
      if (c.verb === 'wash' && c.noun && c.noun !== 'mug' && c.noun !== 'hands') return false;
      await g.approach('sink');
      await g.pose(null, 'reach', 300);
      g.sfx('splash');
      await g.say(g.has('mug') ? "You give your mug a quick rinse. It's still empty, but now it's clean and empty. Progress." : 'You splash some cold water on your face. It does not fix production, but it helps.');
    },
    'take mugs,take sink': "Those mugs are 'soaking.' Removing one would violate the break room social contract.",
    'open|search cabinets,look/in cabinets': async (g) => {
      await g.approach('cabinets');
      await g.pose(null, 'reach', 300);
      await g.say('Paper plates. Plastic forks. Approximately four hundred sugar packets. A single, dusty bag of decaf that nobody has ever opened. No coffee filters. There are never coffee filters.');
    },
    'take poster': 'IT would never forgive you. That poster has closed more tickets than anyone in the building.',
    'take|eat donut,search table,open box,look/in box,take table': async (g) => {
      await g.approach('table');
      await g.say('The donut box is empty except for a single sprinkle. You consider it. You leave it for someone who needs it more.');
    },
    'sit,sit table|chair': "You sit for a second. The chair wobbles. The table is sticky. You get up. There's a production outage to fix.",
    'read table': "Yesterday's newspaper. The business section has a little article: \"MONOLITH SYSTEMS PREPARES FOR BIG INVESTOR DEMO.\" Somebody has drawn a skull on it. You suspect Fahim.",
    'take clock,fix clock': "The clock is the only thing in the building that knows what time it is. Leave it be.",
  },
};
