// The basement corridor: pipes, a dying fluorescent tube, an electrified puddle,
// Denis's breaker panel, and the steel door to the server room.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { inArea } from '../../engine/game';
import { Surface, rng, microWidth } from '../../engine/raster';
import { dith, DARKER } from '../../engine/palette';
import { parse } from '../../engine/parser';
import { award } from '../../content/points';
import { act1Raw, readAsLook } from './natural';
import { blockWall, pipeH, pipeV, bracket, cardboardBox, tubeOn } from '../../art/basement_props';

const SEAM = 118; // wall/floor seam
const WB = 122; // back edge of the walkable floor
const DOOR = { x: 248, y: 64, w: 32, h: 54 }; // the server room door
const PANEL = { x: 88, y: 72, w: 22, h: 27 };
const PUDDLE = [156, 119, 170, 118, 184, 120, 200, 118, 218, 119, 230, 123, 236, 131, 233, 140, 240, 150, 246, 162, 242, 172, 250, 182, 248, 190, 142, 190, 136, 182, 142, 172, 138, 162, 146, 151, 142, 140, 150, 131, 148, 124];
const CABLE_END: [number, number] = [190, 140];

// transient state (not saved): the eye-slot is open after a knock
let slotOpen = false;
let slotAt = 0;

const safe = (g: Game) => !!g.flag('breaker_off');
const PUDDLE_ZONE = [154, 121, 230, 121, 238, 150, 244, 189, 140, 189, 144, 150];
const westOfPuddle = (g: Game) => g.player.x < 160;

// ------------------------------------------------------------------ painting

function paint(p: Surface, g: Game) {
  // ---- back wall: painted block with the same blue dado as the stairwell
  blockWall(p, 0, 0, 320, SEAM, 8, 0);
  p.rect(0, SEAM - 22, 320, 22, 1);
  p.hline(0, 319, SEAM - 22, 14);
  p.hline(0, 319, SEAM - 23, 6);
  // the wall is lit in a soft pool below the fluorescent tube
  litPool(p, 117, 40, 62, 54);
  p.rect(0, 0, 320, 6, 0);

  // ---- ceiling pipes
  pipeH(p, 0, 320, 7, 6, 15, 15, 7, 46); // big insulated pipe
  pipeH(p, 0, 320, 16, 3, 6, 14, 0, 0); // copper water line
  pipeH(p, 0, 320, 21, 2, 4, 12, 0, 0); // sprinkler main
  for (let x = 30; x < 320; x += 64) {
    p.vline(x, 23, 25, 4);
    p.rect(x - 1, 26, 3, 1, 12);
  }
  // cable tray to the server room
  p.rect(150, 26, 170, 2, 0);
  p.hline(150, 319, 25, 8);
  for (let x = 152; x < 320; x += 3) p.plot(x, 26, [12, 14, 10, 9, 15][(x / 3) % 5 | 0]);
  p.poly([246, 26, 286, 26, 282, 30, 250, 30], 0);
  for (const x of [20, 110, 200, 290]) bracket(p, x, 0, 7, 6);
  // the leaking joint above the puddle
  p.rect(193, 15, 4, 5, 6);
  p.hline(193, 196, 15, 14);
  // a pipe drops down the wall at the far left, and a gauge
  pipeV(p, 30, 19, SEAM - 22, 3, 6, 14, 0);
  p.circle(31, 62, 3, 15);
  p.ellipseO(31, 62, 3, 3, 0);
  p.line(31, 62, 33, 60, 4);

  // ---- left wall in perspective, with the fire door back to the stairwell
  p.poly([0, 0, 24, 30, 24, SEAM, 0, SEAM + 24], 8);
  p.poly([0, SEAM + 2, 24, SEAM - 20, 24, SEAM, 0, SEAM + 24], 1);
  p.line(0, SEAM + 1, 24, SEAM - 21, 14);
  p.line(24, 30, 24, SEAM, 0);
  p.poly([5, 85, 19, 77, 19, SEAM + 5, 5, SEAM + 19], 0);
  p.poly([6, 87, 18, 79, 18, SEAM + 5, 6, SEAM + 18], 4);
  p.poly([7, 89, 17, 83, 17, 96, 7, 102], 12);
  p.poly([12, 90, 15, 88, 15, 96, 12, 98], 1);
  p.line(7, 106, 17, 100, 7);
  p.micro(9, 66, 'B1', 14);

  // ---- photo of young Denis and Gertrude
  const fx = 36,
    fy = 74;
  p.rect(fx, fy, 22, 18, 6);
  p.frame(fx, fy, 22, 18, 0);
  p.rect(fx + 2, fy + 2, 18, 14, 14);
  p.gradV(fx + 2, fy + 2, 18, 14, [15, 14, 6]);
  // Gertrude, the PDP-11: a cabinet with a light panel
  p.rect(fx + 11, fy + 3, 7, 13, 7);
  p.rect(fx + 12, fy + 5, 5, 2, 1);
  p.plot(fx + 12, fy + 5, 12);
  p.plot(fx + 14, fy + 5, 14);
  p.plot(fx + 16, fy + 6, 12);
  p.hline(fx + 12, fx + 16, fy + 9, 8);
  p.hline(fx + 12, fx + 16, fy + 12, 8);
  // young Denis: brown hair, beard, big glasses, hugging her
  p.rect(fx + 5, fy + 4, 5, 5, 6);
  p.rect(fx + 6, fy + 5, 3, 2, 16);
  p.plot(fx + 6, fy + 5, 0);
  p.plot(fx + 8, fy + 5, 0);
  p.rect(fx + 5, fy + 9, 6, 7, 2);
  p.hline(fx + 7, fx + 12, fy + 10, 16);
  // little brass caption plate
  p.rect(fx - 2, fy + 20, 26, 6, 6);
  p.frame(fx - 2, fy + 20, 26, 6, 0);
  p.micro(fx, fy + 21, 'GERTRUDE', 14);

  // ---- 1999 calendar
  p.rect(64, 75, 15, 19, 15);
  p.frame(64, 75, 15, 19, 8);
  p.rect(64, 75, 15, 5, 4);
  p.micro(65, 75, 'DEC', 15);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) p.plot(66 + c * 3, 82 + r * 3, 12);
  p.ellipseO(75, 91, 2, 1, 4);

  // ---- breaker panel
  const P = PANEL;
  if (!g.flag('panel_open')) {
    p.rect(P.x, P.y, P.w, P.h, 7);
    p.frame(P.x, P.y, P.w, P.h, 0);
    p.hline(P.x + 1, P.x + P.w - 2, P.y + 1, 15);
    p.vline(P.x + 1, P.y + 1, P.y + P.h - 2, 15);
    p.rect(P.x + P.w - 5, P.y + 11, 2, 5, 8);
    // Y2K READY sticker and a lightning-bolt warning
    p.rect(P.x + 3, P.y + 4, 13, 6, 10);
    p.micro(P.x + 4, P.y + 5, 'Y2K', 0);
    p.poly([P.x + 9, P.y + 14, P.x + 15, P.y + 24, P.x + 3, P.y + 24], 14);
    p.lines([P.x + 10, P.y + 17, P.x + 8, P.y + 20, P.x + 10, P.y + 20, P.x + 8, P.y + 23], 0);
  } else {
    p.rect(P.x, P.y, P.w, P.h, 8);
    p.frame(P.x, P.y, P.w, P.h, 0);
    p.rect(P.x + 2, P.y + 2, P.w - 4, P.h - 4, 0);
    // the door, swung open to the left
    p.poly([P.x - 1, P.y, P.x - 7, P.y + 3, P.x - 7, P.y + P.h + 2, P.x - 1, P.y + P.h - 1], 7);
    p.vline(P.x - 7, P.y + 3, P.y + P.h + 2, 15);
    // three big breakers with tape labels
    for (let i = 0; i < 3; i++) {
      const by = P.y + 4 + i * 7;
      const off = (i === 1 && g.flag('vending_off')) || (i === 2 && safe(g));
      p.rect(P.x + 3, by, 16, 6, 8);
      p.rect(P.x + 4, by + 1, 5, 4, i === 0 ? 4 : 15);
      p.micro(P.x + 5, by, String(i + 1), i === 0 ? 15 : 0);
      // the switch handle: right = ON, left = OFF
      p.rect(off ? P.x + 11 : P.x + 15, by + 1, 3, 4, i === 0 ? 12 : 7);
    }
  }

  // ---- junction box with the frayed cable
  p.rect(176, 19, 3, 57, 8); // conduit
  p.vline(176, 19, 75, 7);
  p.rect(172, 75, 12, 10, 7);
  p.frame(172, 75, 12, 10, 0);
  p.rect(174, 77, 8, 6, 0);
  p.plot(176, 79, 4);
  p.plot(179, 80, 14);

  // ---- the server room door
  const Dr = DOOR;
  // hazard-striped frame
  p.rect(Dr.x - 5, Dr.y - 5, Dr.w + 10, Dr.h + 5, 0);
  for (let y = Dr.y - 4; y < SEAM; y++)
    for (let x = Dr.x - 4; x < Dr.x + Dr.w + 4; x++) {
      if (x >= Dr.x && x < Dr.x + Dr.w && y >= Dr.y) continue;
      p.plot(x, y, ((x + y) >> 2) % 2 ? 14 : 0);
    }
  if (g.flag('door_open')) {
    // the room beyond: dark, with the cold glow of a great many LEDs
    p.rect(Dr.x, Dr.y, Dr.w, Dr.h, 0);
    p.gradV(Dr.x, Dr.y + 30, Dr.w, Dr.h - 30, [0, 1, 3]);
    p.rect(Dr.x + 4, Dr.y + 8, 10, 30, 8);
    p.rect(Dr.x + 18, Dr.y + 4, 12, 34, 7);
    p.rect(Dr.x + 20, Dr.y + 8, 8, 10, 1);
    // the door leaf swung inward
    p.poly([Dr.x + Dr.w - 1, Dr.y, Dr.x + Dr.w - 7, Dr.y + 4, Dr.x + Dr.w - 7, SEAM - 4, Dr.x + Dr.w - 1, SEAM], 7);
    p.vline(Dr.x + Dr.w - 7, Dr.y + 4, SEAM - 4, 15);
  } else {
    p.rect(Dr.x, Dr.y, Dr.w, Dr.h, 7);
    p.rect(Dr.x + 2, Dr.y + 2, Dr.w - 4, Dr.h - 4, dith(7, 8, 2));
    p.hline(Dr.x, Dr.x + Dr.w - 1, Dr.y, 15);
    p.vline(Dr.x, Dr.y, SEAM - 1, 15);
    p.vline(Dr.x + Dr.w - 1, Dr.y, SEAM - 1, 8);
    // rivets
    for (let y = Dr.y + 4; y < SEAM - 2; y += 6) {
      p.plot(Dr.x + 3, y, 8);
      p.plot(Dr.x + Dr.w - 4, y, 8);
    }
    for (let x = Dr.x + 6; x < Dr.x + Dr.w - 4; x += 5) {
      p.plot(x, Dr.y + 3, 8);
      p.plot(x, SEAM - 4, 8);
    }
    // stenciled SERVER ROOM
    p.micro(Dr.x + 4, Dr.y + 32, 'SERVER', 0);
    p.micro(Dr.x + 8, Dr.y + 38, 'ROOM', 0);
    // eye-slot (closed)
    p.rect(Dr.x + 8, Dr.y + 13, 16, 8, 8);
    p.frame(Dr.x + 8, Dr.y + 13, 16, 8, 0);
    p.rect(Dr.x + 10, Dr.y + 15, 12, 4, 7);
    p.hline(Dr.x + 10, Dr.x + 21, Dr.y + 15, 15);
    p.rect(Dr.x + 14, Dr.y + 16, 4, 2, 8);
    // heavy hinges
    p.rect(Dr.x - 1, Dr.y + 8, 3, 6, 8);
    p.rect(Dr.x - 1, Dr.y + 40, 3, 6, 8);
  }
  // sign above the door
  const sw = 72,
    sx = Dr.x + Dr.w / 2 - sw / 2;
  p.rect(sx, 42, sw, 17, 15);
  p.frame(sx, 42, sw, 17, 0);
  p.rect(sx + 1, 43, sw - 2, 7, 4);
  p.micro(sx + Math.floor((sw - microWidth('AUTHORIZED ONLY')) / 2), 44, 'AUTHORIZED ONLY', 15);
  p.micro(sx + Math.floor((sw - microWidth('THAT MEANS DENIS')) / 2), 52, 'THAT MEANS DENIS', 0);
  // the doorbell nobody has fixed since 1994
  p.rect(Dr.x + Dr.w + 6, 86, 5, 7, 8);
  p.frame(Dr.x + Dr.w + 6, 86, 5, 7, 0);
  p.circle(Dr.x + Dr.w + 8, 89, 1, 4);
  p.rect(Dr.x + Dr.w + 5, 94, 8, 5, 15);
  p.hline(Dr.x + Dr.w + 6, Dr.x + Dr.w + 11, 96, 4);

  // ---- floor: cold concrete, darker toward the wall
  p.rect(0, SEAM, 320, 190 - SEAM, 7);
  p.gradV(0, SEAM, 320, 10, [8, 7]);
  p.poly([0, SEAM + 24, 24, SEAM, 0, SEAM], 8);
  p.hline(0, 319, SEAM, 0);
  p.speckle(0, SEAM + 14, 320, 190 - SEAM - 14, 8, 0.012, 41);
  // expansion joints
  for (let i = -6; i <= 6; i++) p.line(160 + i * 26, SEAM + 1, 160 + i * 60, 190, 8);
  p.hline(0, 319, 150, 8);
  // painted safety line along the wall
  p.hline(24, 319, SEAM + 3, 14);
  // stains
  const r = rng(7);
  for (let i = 0; i < 8; i++) p.ellipse(10 + r() * 300, 140 + r() * 45, 4 + r() * 6, 1 + r() * 2, dith(7, 8, 6));

  // ---- the puddle, spanning the corridor: dark wet rim, then water that mirrors the wall
  p.poly(PUDDLE.map((v, i) => (i % 2 ? v : v + (v < 193 ? -3 : 3))), 8); // dark wet rim
  puddleReflection(p);
  // the cable: out of the junction box, down the wall, across the floor, into the water
  p.lines([178, 85, 180, 98, 179, 110, 181, SEAM, 184, 126, 186, 132, CABLE_END[0], CABLE_END[1]], 0, 2);
  p.lines([179, 86, 181, 98, 180, 110, 182, SEAM], 8);
  if (!safe(g)) {
    // frayed copper end
    p.plot(CABLE_END[0] + 1, CABLE_END[1] - 1, 6);
    p.plot(CABLE_END[0] + 2, CABLE_END[1], 14);
  }

  // ---- mop & bucket and the WET FLOOR sign
  p.at(130, () => {
    p.line(140, 88, 134, 122, 6, 2); // mop handle against the wall
    p.rect(126, 120, 14, 9, 14);
    p.rect(126, 120, 14, 2, 6);
    p.hline(127, 138, 124, 6);
    p.rect(128, 116, 10, 4, 8);
    p.rect(124, 122, 2, 5, 8);
    p.ellipse(134, 128, 6, 1, 0);
    p.rect(129, 112, 6, 5, 7); // mop head poking out
  });
  p.at(127, () => {
    p.poly([150, 108, 156, 108, 160, 127, 146, 127], 14);
    p.poly([150, 108, 156, 108, 157, 112, 149, 112], 6);
    p.micro(150, 114, '!', 0);
    p.hline(147, 159, 126, 6);
  });

  // ---- Denis's Y2K emergency stash at the dead end
  p.at(132, () => {
    cardboardBox(p, 288, 104, 30, 22, 'Y2K');
    cardboardBox(p, 292, 88, 24, 16, 'BEANS');
    p.rect(296, 80, 14, 8, 8); // hand-crank radio
    p.frame(296, 80, 14, 8, 0);
    p.circle(300, 84, 2, 7);
    p.vline(308, 74, 80, 7);
    for (let i = 0; i < 4; i++) {
      p.rect(286 + i * 4, 124, 3, 4, 7);
      p.hline(286 + i * 4, 288 + i * 4, 125, 4);
    }
  });
}

/** A soft pool of light on the block wall: dark blocks become light blocks, with a dithered rim. */
function litPool(p: Surface, cx: number, cy: number, rx: number, ry: number) {
  const LIT: Record<number, number> = { 8: 7, 0: 8 };
  for (let y = Math.max(0, cy - ry); y < Math.min(SEAM - 22, cy + ry); y++)
    for (let x = Math.max(0, cx - rx); x < Math.min(320, cx + rx); x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d >= 1) continue;
      const c = p.get(x, y);
      const lit = LIT[c];
      if (lit === undefined) continue;
      if (d < 0.86 || BAYER[((y & 3) << 2) | (x & 3)] / 16 > (d - 0.86) / 0.14) p.plot(x, y, lit);
    }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Water: deep blue with a lighter band reflecting the lit wall, glints, and the cable's dark reflection. */
function puddleReflection(p: Surface) {
  p.poly(PUDDLE, 1);
  // a lighter band where the water mirrors the wall's light pool
  const inner = PUDDLE.map((v, i) => (i % 2 ? Math.min(v, 150) : v));
  for (let y = 121; y < 150; y++) {
    // ripple lines that thin out toward the viewer
    const every = y < 132 ? 2 : y < 142 ? 3 : 5;
    if (y % every) continue;
    p.clip(0, y, 320, y + 1);
    p.poly(inner, 9);
  }
  p.clip();
  // reflected yellow safety line at the far edge, broken by ripples
  for (let x = 156; x < 230; x += 5) p.hline(x, x + 2, 122, 6);
  // the cable's reflection, wobbling down from where it enters the water
  for (let y = CABLE_END[1] + 2; y < 168; y += 2) p.plot(CABLE_END[0] + Math.round(Math.sin(y * 0.7) * 1.5), y, 0);
  // glints
  p.hline(160, 170, 128, 11);
  p.hline(204, 218, 135, 11);
  p.hline(166, 180, 158, 9);
  p.hline(212, 226, 170, 9);
  p.hline(150, 158, 180, 9);
  p.hline(226, 236, 184, 9);
  p.hline(180, 186, 186, 11);
}

// ------------------------------------------------------------------ helpers

async function electrocute(g: Game, how: string) {
  const p = g.player;
  p.stop();
  g.sfx('zap');
  const white = new Uint8Array(256).fill(15);
  const black = new Uint8Array(256).fill(0);
  for (let i = 0; i < 8; i++) {
    p.map = i % 2 ? black : white;
    g.flash(i % 2 ? 0 : 15, 50);
    await g.wait(90);
  }
  p.map = null;
  g.sfx('crash');
  g.shake(400);
  p.visible = false;
  await g.wait(700);
  return g.die(`${how}\n\nYou are now a conductor. Not the musical kind.`, { title: 'Shocking Development' });
}

async function slotScene(g: Game) {
  slotOpen = true;
  slotAt = g.t;
  g.sfx('clink');
  await g.wait(400);
  await g.talk('denis', 'Who goes there?', { title: 'Voice Behind the Door' });
  await g.talk('denis', 'Doesn\'t matter. Nobody gets in without the password. Speak the name of my first love.', { title: 'Voice Behind the Door' });
}

async function knock(g: Game) {
  if (g.flag('door_open')) return void (await g.say("It's already open. Somewhere inside, Denis is waiting. Impatiently."));
  if (!safe(g) && westOfPuddle(g)) return void (await g.say("To knock on that door you'd have to wade through a puddle with a live cable in it. You'd rather keep your nervous system the way it is."));
  await g.approach('door');
  g.player.dir = 'up';
  g.sfx('knock');
  await g.wait(500);
  if (slotOpen) return void (await g.talk('denis', 'I HEARD you the first time. The name. Of my first love.', { title: 'Voice Behind the Door' }));
  await g.say('BONG, BONG, BONG. The door is so thick your knocks barely make a sound. Then: footsteps. A bolt. And the little eye-slot slides open with a CLACK.\n\nTwo bushy gray eyebrows and a pair of extremely suspicious eyes regard you.');
  await slotScene(g);
}

async function openSesame(g: Game) {
  g.set('door_open');
  slotOpen = false;
  award(g, 'password_gertrude');
  await g.talk('denis', '...Gertrude.', { title: 'Voice Behind the Door' });
  await g.wait(600);
  await g.talk('denis', "Nobody's said her name out loud in thirty years. Hm.", { title: 'Voice Behind the Door' });
  g.sfx('clink');
  await g.wait(300);
  g.sfx('thud');
  await g.wait(300);
  g.sfx('door');
  g.redraw();
  await g.say('The slot slams. Bolts clunk, one after another: three, four, nine of them. With a groan of steel, the server room door swings open.');
  await g.talk('denis', "Well? Don't just stand there letting the cold air out. Get in here.", { title: 'Denis' });
}

// ------------------------------------------------------------------ breakers

async function breaker(g: Game, n: number | null, on: boolean, all = false) {
  if (!safe(g) && !westOfPuddle(g) && g.player.x > 240) return void (await g.say("The breaker panel is back on the other side of the puddle. You'd rather not wade back through it while it's... lively."));
  await g.approach('panel');
  g.player.dir = 'up';
  if (!g.flag('panel_open')) {
    g.set('panel_open');
    g.sfx('door');
    g.redraw();
    await g.say('You swing open the panel door first. Inside are three big breakers, each labeled in Denis\'s handwriting:\n\n1: MONOLITH - DO NOT TOUCH!!!\n2: VENDING MACHINES\n3: BASEMENT AUX');
  }
  if (all) {
    await g.pose(null, 'reach', 400);
    return blackout(g, 'You throw all three breakers at once, like they do in the movies.');
  }
  if (n === null || n < 1 || n > 3) return void (await g.say('Which breaker? There are three: 1 (MONOLITH - DO NOT TOUCH!!!), 2 (VENDING MACHINES) and 3 (BASEMENT AUX).'));
  if (on) {
    if (n === 3 && safe(g)) return void (await g.say('You consider re-electrifying the puddle. You decide the puddle has suffered enough. So have you.'));
    return void (await g.say(n === 1 ? "Breaker 1 is ON, and you would very much like it to stay that way." : `Breaker ${n} is already on.`));
  }
  await g.pose(null, 'reach', 400);
  if (n === 1) return blackout(g, 'You flip breaker 1: MONOLITH - DO NOT TOUCH!!!');
  if (n === 2) {
    g.sfx('thud');
    g.set('vending_off');
    g.redraw();
    await g.wait(700);
    await g.say(
      g.flag('candy_bought')
        ? 'You flip breaker 2: VENDING MACHINES. Far, far above you, a vending machine powers down with a sad little whine. Somewhere, Mike senses a disturbance in the snack supply.'
        : 'You flip breaker 2: VENDING MACHINES. Far, far above you, faint but unmistakable, Mike screams.',
    );
    g.set('vending_off', false);
    g.redraw();
    g.sfx('thud');
    await g.say('You flip it back on. Mike has been through enough tonight.');
    return;
  }
  // breaker 3: the right one
  if (safe(g)) return void (await g.say('Breaker 3 is already off. The puddle is just a puddle now.'));
  g.sfx('thud');
  g.set('breaker_off');
  award(g, 'breaker_off');
  g.redraw();
  await g.wait(400);
  await g.say('You flip breaker 3: BASEMENT AUX.\n\nWith a sad little fizz, the cable in the puddle goes quiet. The puddle is now just a puddle: big, dirty, and perfectly harmless.');
}

async function blackout(g: Game, what: string) {
  g.sfx('thud');
  await g.wait(200);
  g.music(null);
  g.dark = true;
  g.sfx('crash');
  await g.wait(1200);
  await g.say('Silence. Real silence. The hum you hadn\'t even noticed, the one that has filled this building since 1987, stops.\n\nFrom behind the steel door, a grown man begins to weep.');
  return g.die(`${what}\n\nThe Monolith, which was merely panicking, is now merely furniture. You have turned a partial outage into a total outage. Monday's investor demo will consist of Phil reading the README aloud.`, { title: 'Total Outage' });
}

/** Is this raw input an attempt to answer Denis (rather than another command)? */
function isAnswer(text: string) {
  const c = parse(text);
  return c.verb === null || ['say', 'tell', 'answer', 'type'].includes(c.verb) || c.verbWord === 'answer' || c.verbWord === 'reply';
}

// ------------------------------------------------------------------ the room

export const basement: RoomDef = {
  id: 'basement',
  title: 'Basement Corridor',
  act: 1,
  music: 'basement',
  start: [22, 160, 'right'],
  draw: paint,
  walk: [[0, 144, 24, WB, 316, WB, 316, 188, 0, 188]],
  blocks: [
    [122, WB - 2, 22, 9],
    [284, WB - 4, 36, 12],
  ],
  look: (g) =>
    `The basement corridor. Pipes crowd the ceiling, a fluorescent tube flickers like it's trying to send you a message in Morse code, and the air smells like 1987.\n\nA wide puddle stretches clear across the corridor${safe(g) ? ', with a frayed cable dangling into it, mercifully dead' : ', and a frayed cable dangles into it, sparking merrily'}. At the far end stands a heavy steel door marked SERVER ROOM${g.flag('door_open') ? ', standing open' : ''}.`,
  hotspots: [
    {
      id: 'door',
      nouns: ['door', 'steel door', 'server room door', 'server door', 'vault door', 'heavy door', 'server room', 'serverroom'],
      area: [DOOR.x - 4, DOOR.y - 4, DOOR.w + 8, SEAM - DOOR.y + 4],
      at: [264, 126],
      look: (g) =>
        g.flag('door_open')
          ? "The server room door stands open. Cold air and the blinking of a great many lights spill out. So does a faint smell of ozone and instant ramen."
          : 'A heavy steel door, battleship gray and studded with rivets, in a hazard-striped frame. Stenciled on it: SERVER ROOM. There is no handle on this side. There is a little sliding eye-slot at eye level, and next to the door, a doorbell with a tag on it.',
    },
    {
      id: 'slot',
      nouns: ['slot', 'eye slot', 'eyeslot', 'peephole', 'peep hole', 'hatch', 'grille'],
      area: [DOOR.x + 8, DOOR.y + 13, 16, 9],
      at: [264, 126],
      when: (g) => !g.flag('door_open'),
      look: () => (slotOpen ? 'Two bushy gray eyebrows and a pair of extremely suspicious eyes stare at you through the slot. They blink, slowly. They are waiting for the name of their first love.' : 'A little sliding eye-slot in the door, at eye level. It is closed. It looks like the kind of slot that opens when you knock.'),
    },
    {
      id: 'sign',
      nouns: ['sign', 'warning sign', 'authorized sign', 'notice', 'plate'],
      area: [DOOR.x - 20, 42, 72, 17],
      at: [264, 126],
      look: 'The sign above the door reads: "AUTHORIZED PERSONNEL ONLY. THAT MEANS DENIS." Someone has underlined DENIS twice.',
    },
    {
      id: 'bell',
      nouns: ['doorbell', 'bell', 'button', 'buzzer', 'tag', 'out of order', 'intercom', 'door bell'],
      area: [DOOR.x + DOOR.w + 4, 85, 10, 15],
      at: [284, 126],
      look: 'A doorbell. The tag hanging from it reads: "OUT OF ORDER SINCE 1994. KNOCK. LOUDLY."',
    },
    {
      id: 'panel',
      nouns: ['panel', 'breaker panel', 'breaker box', 'fuse box', 'electrical panel', 'box', 'circuit breaker panel', 'sticker', 'y2k sticker'],
      area: [PANEL.x - 8, PANEL.y - 1, PANEL.w + 9, PANEL.h + 4],
      at: [99, 126],
      look: (g) =>
        g.flag('panel_open')
          ? `Inside the panel are three big breakers, each with a label in Denis's handwriting:\n\n1: MONOLITH - DO NOT TOUCH!!!\n2: VENDING MACHINES\n3: BASEMENT AUX${safe(g) ? '\n\nBreaker 3 is off.' : ''}`
          : 'A gray electrical panel with a lightning-bolt warning and a proud green sticker: "Y2K READY!" The panel door is closed.',
    },
    {
      id: 'breaker',
      nouns: ['breaker', 'breakers', 'switch', 'switches', 'circuit breaker', 'circuit', 'circuits', 'label', 'labels', 'fuse', 'fuses', 'lever'],
      area: [PANEL.x + 2, PANEL.y + 2, PANEL.w - 4, PANEL.h - 4],
      at: [99, 126],
      when: (g) => !!g.flag('panel_open'),
      look: (g) => `Three big breakers, labeled in Denis's handwriting:\n\n1: MONOLITH - DO NOT TOUCH!!!\n2: VENDING MACHINES\n3: BASEMENT AUX${safe(g) ? '\n\nBreaker 3 is off.' : '\n\nAll three are on.'}`,
    },
    {
      id: 'photo',
      nouns: ['photo', 'photograph', 'picture', 'frame', 'framed photo', 'gertrude', 'pdp', 'pdp 11', 'pdp11', 'caption', 'brass plate'],
      area: [34, 72, 28, 26],
      at: [48, 128],
      look: 'A framed photo, faded to orange with age. A young man with a magnificent brown beard and enormous glasses has his arms around a PDP-11 minicomputer, cheek pressed lovingly to her front panel.\n\nThe caption, in careful handwriting: "ME AND GERTRUDE, 1979. TRUE LOVE."',
    },
    {
      id: 'calendar',
      nouns: ['calendar', 'december', '1999', 'date'],
      area: [63, 74, 17, 21],
      at: [72, 128],
      look: 'A wall calendar, still open to DECEMBER 1999. Every day is crossed off up to the 31st, which is circled three times in red. Underneath, in block capitals: "DON\'T PANIC. DON\'T REBOOT."',
    },
    {
      id: 'puddle',
      nouns: ['puddle', 'water', 'flood', 'pool', 'wet floor', 'floor water'],
      area: PUDDLE,
      at: [140, 150],
      look: (g) =>
        safe(g)
          ? 'A wide, dirty puddle, fed by a dripping pipe joint overhead. The cable in it is dead now. It is just water. Wet, cold, perfectly legal water.'
          : "A wide, dirty puddle stretches clear across the corridor, fed by a dripping pipe joint overhead. A frayed cable dangles into it from a junction box on the wall, sparking merrily. If you walk through that, you'll be the most conductive thing in the building.",
    },
    {
      id: 'cable',
      nouns: ['cable', 'wire', 'frayed cable', 'power cable', 'sparks', 'spark', 'live wire', 'cord'],
      area: [174, 84, 22, 62],
      at: [146, 134],
      look: (g) => (safe(g) ? 'A frayed cable, hanging from the junction box into the puddle. Dead as a doornail now, thanks to breaker 3.' : "A frayed cable hangs out of a junction box, down the wall and into the puddle, where its bare copper end spits sparks. Somebody really should turn that off at the breaker."),
    },
    {
      id: 'jbox',
      nouns: ['junction box', 'junction', 'conduit', 'electrical box'],
      area: [170, 72, 16, 14],
      at: [146, 130],
      look: 'A junction box with its cover long gone. A frayed cable spills out of it like it is trying to escape. Given the state of the basement, you can relate.',
    },
    {
      id: 'light',
      nouns: ['light', 'lights', 'lamp', 'tube', 'fluorescent', 'fluorescent light', 'fluorescent tube', 'flickering light', 'ceiling light'],
      area: [94, 28, 46, 8],
      look: 'A fluorescent tube in its final days, flickering like it is trying to send you a message in Morse code. The message appears to be "HELP".',
    },
    {
      id: 'pipes',
      nouns: ['pipes', 'pipe', 'drip', 'leak', 'joint', 'pipe joint', 'sprinkler', 'sprinklers', 'cable tray'],
      area: [0, 6, 320, 22],
      look: 'Pipes of every vintage crowd the ceiling: insulated steam, copper water, red sprinkler mains, and a cable tray stuffed with wires that disappears into the wall above the server room door. A joint in the copper line drips steadily into the puddle below.',
    },
    {
      id: 'mop',
      nouns: ['mop', 'bucket', 'mop bucket', 'wringer'],
      area: [122, 86, 22, 44],
      at: [132, 136],
      look: 'A mop and a bucket. The bucket is cracked. Someone tried. Someone gave up. You respect both decisions.',
    },
    {
      id: 'wetsign',
      nouns: ['wet floor sign', 'caution sign', 'yellow sign', 'a frame', 'caution', 'cone', 'safety cone', 'wet floor', 'caution cone'],
      area: [145, 106, 16, 22],
      at: [140, 136],
      look: 'A yellow sign: CAUTION! WET FLOOR. It undersells the situation considerably.',
    },
    {
      id: 'stash',
      nouns: ['stash', 'supplies', 'y2k supplies', 'beans', 'cans', 'can', 'radio', 'boxes', 'box', 'crate', 'rations', 'water bottles'],
      area: [284, 72, 36, 58],
      at: [278, 140],
      look: 'Denis\'s Y2K emergency supplies: forty cans of beans, a hand-crank radio, a case of bottled water, and six reels of backup tape. Every single item has a sticker: "BEST BEFORE 01/01/00".\n\nHe never threw any of it out. Just in case.',
    },
    {
      id: 'stairdoor',
      nouns: ['stairwell door', 'stair door', 'fire door', 'stairwell', 'stairs', 'b1 door', 'red door'],
      area: [4, 76, 18, 62],
      at: [16, 150],
      look: 'The red fire door back to the stairwell.',
    },
    {
      id: 'gauge',
      nouns: ['gauge', 'dial', 'pressure gauge', 'clock', 'round thing', 'needle'],
      area: [26, 56, 10, 12],
      at: [36, 128],
      look: "A round pressure gauge on the wall, which you took for a clock at first. The needle points firmly into the red. It has pointed into the red since 1991. Everyone agreed this was probably fine.",
    },
  ],
  exits: [
    { area: [0, 128, 6, 62], to: 'stairwell', at: [262, 184, 'left'], dir: 'west|out|up' },
    {
      area: [DOOR.x + 2, WB - 4, DOOR.w - 4, 7],
      to: 'serverroom',
      at: [40, 170, 'right'],
      dir: 'east|in|north',
      when: (g) => !!g.flag('door_open'),
    },
  ],
  zones: [
    {
      area: PUDDLE_ZONE,
      when: (g) => !safe(g),
      enter: (g) => electrocute(g, 'You splash boldly into the puddle. The frayed cable in it takes this personally.'),
    },
    {
      area: PUDDLE_ZONE,
      when: (g) => safe(g),
      enter: async (g) => {
        g.sfx('splash');
        if (!g.flag('puddle_waded')) {
          g.set('puddle_waded');
          await g.say('Squelch. Your sneakers are now full of basement water, but you are not dead. Net positive.');
        }
      },
    },
  ],
  nouns: {
    rat: ['rat', 'rats', 'mouse', 'rodent'],
    power: ['power', 'electricity', 'current', 'juice'],
    aux: ['aux', 'basement aux', 'auxiliary', 'basement auxiliary', 'breaker three', 'third breaker'],
    vendbreaker: ['vending machines', 'vending machine', 'vending', 'vending breaker'],
  },
  raw: async (g, text) => {
    if (await act1Raw(g, text)) return true;
    const t = text.toLowerCase();
    if (g.flag('door_open')) {
      // saying the password again once the door is already open
      if (/gertrude|gertie|gerty/.test(t)) {
        const pc = parse(text);
        if (!pc.verb || ['say', 'tell', 'answer', 'type', 'call'].includes(pc.verb)) {
          await g.say('The door is already open. Denis heard you the first time. So, probably, did Gertrude.');
          return true;
        }
      }
      return false;
    }
    if (/gertrude|gertie|gerty/.test(t)) {
      // LOOK AT GERTRUDE, READ GERTRUDE etc. mean the photo, not the password
      const pc = parse(text);
      if (pc.verb && !['say', 'tell', 'answer', 'type', 'knock', 'talk', 'ask', 'call'].includes(pc.verb)) return false;
      if (!slotOpen) {
        if (!safe(g) && westOfPuddle(g)) {
          await g.say("You say \"Gertrude\" to the corridor. The corridor doesn't care. Whoever might care is behind that steel door, on the far side of a sparking puddle.");
          return true;
        }
        await g.say('You knock first. It seems polite.');
        await g.approach('door');
        g.player.dir = 'up';
        g.sfx('knock');
        await g.wait(500);
        await g.say('Footsteps. A bolt. The little eye-slot slides open with a CLACK, revealing two bushy gray eyebrows and a pair of extremely suspicious eyes.');
        await slotScene(g);
      }
      await g.talk(g.player, 'Gertrude.');
      await openSesame(g);
      return true;
    }
    if (!slotOpen || !isAnswer(text)) return false;
    if (/pdp/.test(t)) {
      await g.talk('denis', 'Her NAME. Not her model number. Have some respect.', { title: 'Voice Behind the Door' });
      return true;
    }
    if (/\bdenis\b|\bdennis\b/.test(t)) {
      await g.talk('denis', "That's MY name. Common mistake. WRONG.", { title: 'Voice Behind the Door' });
    } else if (/password|open sesame|please|let me in/.test(t)) {
      await g.talk('denis', "Cute. WRONG.", { title: 'Voice Behind the Door' });
    } else await g.talk('denis', 'WRONG.', { title: 'Voice Behind the Door' });
    slotOpen = false;
    g.sfx('door');
    await g.say('The slot slams shut. You hear footsteps shuffle away, muttering about "kids these days" and "not even a GUESS at the hardware."');
    return true;
  },
  verbs: {
    // ---- the door
    'knock door|slot,knock,knock/on|at door|slot': knock,
    'open|push|pull|unlock door': async (g) => {
      if (g.flag('door_open')) return void (await g.say("It's already open. Go on in."));
      await g.say("There's no handle on this side. Just a sign, a little eye-slot, and a strong sense of being judged. The traditional interface for a door like this is knocking.");
    },
    'open|push|look/in|look/through slot': async (g, c) => {
      if (c.verb === 'look' && slotOpen) return void (await g.say('You peer into the slot. An eye peers back. It is not impressed by what it sees.'));
      if (c.verb === 'look') return false;
      await g.say(slotOpen ? "It's already open. Two eyes are glaring out of it. They want a name." : 'It only opens from the inside. The documented API appears to be knocking.');
    },
    'push|use|call|ring bell': async (g) => {
      if (!safe(g) && westOfPuddle(g)) return void (await g.say("The doorbell is on the far side of the electrified puddle. It's out of order anyway, according to its tag."));
      await g.approach('bell');
      g.sfx('error');
      await g.say('You press the doorbell. Nothing. The tag says: "OUT OF ORDER SINCE 1994. KNOCK. LOUDLY."');
    },
    'attack|break door': async (g) => {
      await g.say("You kick the steel door. It's three inches thick. Your foot is not. Somewhere inside, someone says \"Ow\" on your behalf. Sarcastically.");
    },
    'use keycard|badge door,use keycard|badge,use keycard|badge reader': "There's no card reader on this door. Denis doesn't trust card readers. Denis barely trusts doors.",
    'talk denis,talk door,talk slot,ask denis ?,tell denis ?,say': async (g, c) => {
      if (c.verb === 'say' && c.rest) return false;
      if (g.flag('door_open')) return void (await g.say("Denis is inside. Go on in."));
      if (slotOpen) return void (await g.talk('denis', "Small talk is for people who've earned it. The NAME. Of my first LOVE.", { title: 'Voice Behind the Door' }));
      await g.say('You talk to the door. The door, being three inches of steel, does not answer. Maybe knock.');
    },
    'look ceiling': 'Pipes of every vintage crowd the ceiling: insulated steam, copper water, red sprinkler mains, and a cable tray stuffed with wires. One of them drips.',
    'look eyes': async (g) => {
      if (!slotOpen) return false;
      await g.say('Two bushy gray eyebrows and a pair of extremely suspicious eyes stare at you through the slot.');
    },
    'look denis': async (g) => {
      if (slotOpen) return void (await g.say('Through the slot: bushy gray eyebrows, a lot of suspicion, and the general aura of a man who has not seen sunlight since the first Bush administration.'));
      return false;
    },
    // ---- breakers
    'open panel': async (g) => {
      if (g.flag('panel_open')) return void (await g.say("It's already open."));
      if (!safe(g) && g.player.x > 240) return void (await g.say("The panel is back on the other side of the puddle."));
      await g.approach('panel');
      g.player.dir = 'up';
      await g.pose(null, 'reach', 300);
      g.set('panel_open');
      g.sfx('door');
      g.redraw();
      await g.say('You swing the panel door open. Inside are three big breakers, each labeled in Denis\'s handwriting:\n\n1: MONOLITH - DO NOT TOUCH!!!\n2: VENDING MACHINES\n3: BASEMENT AUX');
    },
    'close panel': async (g) => {
      if (!g.flag('panel_open')) return void (await g.say("It's already closed."));
      await g.approach('panel');
      g.set('panel_open', false);
      g.sfx('door');
      g.redraw();
      await g.say('You close the panel door.');
    },
    'read breaker|panel,read': async (g, c) => {
      if (c.noun !== 'breaker' && c.noun !== 'panel') return false;
      if (!g.flag('panel_open')) return void (await g.say('The labels are inside the panel. The outside just says "Y2K READY!", which is the kind of promise you learn not to trust.'));
      await g.say("1: MONOLITH - DO NOT TOUCH!!!\n2: VENDING MACHINES\n3: BASEMENT AUX");
    },
    'turnoff|flip|throw|push|pull|turn|use|attack|cut|break breaker|panel|power,turnoff|flip|throw|pull|attack|cut power': async (g, c) => {
      const all = c.words.includes('all') || c.words.includes('every') || c.words.includes('everything');
      if (c.verb === 'attack' && c.noun === 'panel' && !all && c.num === null) return void (await g.say('You give the panel a good whack. It whacks back with a faint 60-cycle hum. Let\'s use the switches like a professional.'));
      await breaker(g, c.num, false, all);
    },
    'turnoff ?': async (g, c) => {
      if (c.noun !== 'everything') return false;
      await breaker(g, null, false, true);
    },
    'turnon|reset breaker,turnon power': async (g, c) => {
      await breaker(g, c.num, true);
    },
    // ---- the puddle and the cable
    'touch|take|pull|unplug|move|use|grab|remove cable,touch|take|grab sparks': async (g) => {
      if (safe(g)) {
        await g.approach('cable');
        return void (await g.say('You nudge the dead cable out of the puddle with your toe. Safety first. Well, safety second. Safety came in a distant third tonight.'));
      }
      await g.approach('cable');
      return electrocute(g, 'You reach for the sparking cable to move it out of the water.');
    },
    'fix|repair cable,fix|repair jbox': "You're a software engineer. Your relationship with hardware is strictly \"turn it off and on again\". Though turning it OFF might be a start.",
    'turnoff cable|jbox|sparks,unplug|turnoff puddle': 'There is no switch on the cable itself. Power comes from somewhere. Probably that breaker panel down the hall.',
    'turnoff|flip|throw|push|pull|turn|cut|use aux': async (g) => breaker(g, 3, false),
    'turnon|reset aux': async (g) => breaker(g, 3, true),
    'look|read aux': (g) => g.say(`Breaker 3, labeled BASEMENT AUX in Denis's handwriting.${safe(g) ? ' It is off.' : ''}`),
    'turnoff|flip|throw|push|pull|turn|cut vendbreaker': async (g) => breaker(g, 2, false),
    // "enter door" / "go through the door" once Denis has opened it
    'go|enter door': async (g) => {
      if (!g.flag('door_open')) return false;
      await g.walk(null, DOOR.x + 16, WB + 2);
      await g.walk(null, DOOR.x + 16, WB);
    },
    'go|enter puddle': async (g) => {
      // walking THROUGH it, not just up to it
      const fromEast = g.player.x > 200;
      await g.walk(null, fromEast ? 128 : 256, 158);
    },
    'jump puddle,jump/over puddle,jump': async (g, c) => {
      if (!c.noun && c.verbWord === 'jump') return void (await g.say('You hop on the spot. The puddle is unimpressed.'));
      await g.say(safe(g) ? "No need. It's only water now. You can just walk through it like a regular, wet person." : 'The puddle is a good eight feet across. You are a senior engineer, not an Olympic long jumper. Your Olympic event is "competitive sitting".');
    },
    'drink|lick|eat puddle': 'No. No, no, no. Absolutely not.',
    'touch puddle': async (g) => {
      if (safe(g)) return void (await g.say('You dip a finger in. Cold, gritty, and blessedly current-free.'));
      await g.say("You reach toward the water and then stop, because there is a sparking cable lying in it and you are only tired, not stupid.");
    },
    'use|take mop,clean|fix puddle,use mop puddle,use mop': async (g) => {
      if (!safe(g)) {
        await g.approach('mop');
        await g.say('You grab the mop and give the puddle a determined swipe. The mop handle is wet. The puddle is live.');
        return electrocute(g, 'You mopped an electrified puddle with a damp mop.');
      }
      await g.say('You give the puddle a few half-hearted swipes with the mop. The pipe keeps dripping. It is a battle you cannot win, so you put the mop back.');
    },
    'take|kick|use bucket': "It's cracked. It is, in many ways, the patron saint of this basement.",
    'take|move wetsign': "It's doing important work, warning people about a wet floor. It should also warn them about the electrified part, but nobody's perfect.",
    'fix|close|turnoff pipes,fix leak': "You'd need a wrench, a ladder, and a plumber. You have a rubber duck. The duck is not a plumber.",
    // ---- other props
    'take photo': "It's screwed to the wall. Of course it is. Denis screws down everything he loves.",
    'read photo,read caption': '"ME AND GERTRUDE, 1979. TRUE LOVE."',
    'take calendar': 'You leave it. It has been on December 1999 for twenty-seven years, and it would be cruel to make it turn the page now.',
    'read calendar': 'DECEMBER 1999. The 31st is circled three times in red: "DON\'T PANIC. DON\'T REBOOT."',
    'read sign': 'AUTHORIZED PERSONNEL ONLY. THAT MEANS DENIS.',
    'take|eat stash,open stash': "The beans expired on January 1st, 2000. Technically, they're the only things in this building that handled the date change correctly. You leave Denis's supplies alone.",
    'use|turnon stash': 'You crank the radio. It crackles to life: "...and the stroke of midnight came and went, and nothing happened. Back to you, Bob." It is a recording. From 1999. Denis has been listening to it on loop.',
    'turnoff|fix|reboot light,turnon light': 'Fluorescent tubes are hardware. Hardware is a problem for other people. Mostly for Denis.',
    'take light': "It's up near the ceiling, flickering away. You leave it to its Morse code.",
    'look rat,take|catch rat': "You catch a glimpse of a rat along the base of the wall. It's large, well-fed, and moves with the confidence of someone who has seniority here.",
    'open|use stairdoor': async (g) => {
      await g.walk(null, 4, 160);
    },
    'listen,listen ?': async (g) => {
      await g.say(safe(g) ? 'Drip. Drip. Behind the steel door, the deep, uneasy hum of a very old machine.' : 'Drip. Drip. ZZZT. Drip. ZZZT-ZZZT. Behind the steel door, the deep, uneasy hum of a very old machine.');
    },
    'smell,smell ?': 'Damp concrete, hot dust, ozone, and, faintly, from behind the steel door: instant ramen.',
    'wait': async (g) => {
      await g.say(safe(g) ? 'You wait. The tube flickers. The pipe drips. The Monolith stays down.' : 'You wait. The tube flickers. The cable sparks. The Monolith stays down. Time to do something.');
    },
    'read *': readAsLook,
  },
  enter(g) {
    slotOpen = false;
    // "Try Again" may resume from a moment that was already ankle-deep in the live puddle: step back
    if (!safe(g) && inArea(PUDDLE_ZONE, g.player.x, g.player.y)) g.player.place(128, 156, 'right');
  },
  afterEnter: async (g, from) => {
    if (from === 'stairwell' && (g.state.visited['basement'] ?? 0) <= 1) {
      await g.say('You push through the fire door into the basement. A fluorescent tube flickers overhead. Pipes drip. And somewhere down the corridor, something goes ZZZT.');
    }
  },
  overlay(g, s, t) {
    // the dying fluorescent tube
    const on = tubeOn(t);
    s.rect(94, 28, 46, 5, 8);
    s.rect(95, 29, 44, 3, on ? 15 : 7);
    if (on) s.hline(96, 137, 32, dith(15, 7, 8));
    s.vline(98, 22, 27, 0);
    s.vline(135, 22, 27, 0);
    // drip from the pipe joint into the puddle, with ripples
    const ph = t % 96;
    if (ph < 34) {
      if (ph > 12) s.plot(195, 21, 11);
    } else if (ph < 56) {
      const k = (ph - 34) / 22;
      s.plot(195, Math.round(21 + k * k * (146 - 21)), 11);
    } else if (ph < 90) {
      const r = Math.floor((ph - 56) / 5) + 1;
      s.ellipseO(195, 146, r * 2, r, (ph - 56) % 10 < 5 ? 9 : 11);
    }
    // sparks from the frayed cable
    if (!safe(g)) {
      const [cx, cy] = CABLE_END;
      const r = rng(Math.floor(t / 3));
      const burst = t % 140 < 14;
      const n = burst ? 10 : r() < 0.5 ? 3 : 0;
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2,
          d = 1 + r() * (burst ? 9 : 4);
        s.plot(Math.round(cx + Math.cos(a) * d), Math.round(cy - 2 - Math.abs(Math.sin(a)) * d), r() < 0.5 ? 14 : 15);
      }
      if (burst) s.glow(cx, cy, 6, 15, -1, 4);
      if (t % 140 === 0 && !g.dying) g.sfx('spark');
    }
    // the eye-slot: Denis's eyes
    if (!g.flag('door_open') && slotOpen) {
      const x = DOOR.x + 10,
        y = DOOR.y + 15;
      s.rect(x, y, 12, 4, 0);
      s.rect(x + 11, y, 3, 4, 7); // the cover, slid aside
      const blink = (t - slotAt) % 200 > 190;
      s.hline(x + 1, x + 4, y, 7); // bushy brows
      s.hline(x + 7, x + 10, y, 7);
      s.plot(x, y + 1, 7);
      s.plot(x + 11, y + 1, 7);
      if (!blink) {
        const look = (t >> 6) % 3 === 1 ? 1 : 0;
        s.hline(x + 1, x + 4, y + 2, 15);
        s.hline(x + 7, x + 10, y + 2, 15);
        s.rect(x + 2 + look, y + 2, 2, 1, 0);
        s.rect(x + 8 + look, y + 2, 2, 1, 0);
        s.hline(x + 1, x + 4, y + 3, 17);
        s.hline(x + 7, x + 10, y + 3, 17);
      } else {
        s.hline(x + 1, x + 4, y + 2, 17);
        s.hline(x + 7, x + 10, y + 2, 17);
      }
    }
    // through the open door: the server room's blinkenlights
    if (g.flag('door_open')) {
      for (let i = 0; i < 9; i++) {
        const lx = DOOR.x + 5 + (i % 3) * 3,
          ly = DOOR.y + 11 + Math.floor(i / 3) * 6;
        s.plot(lx, ly, ((t >> 4) + i * 5) % 3 ? 10 : 0);
      }
      for (let i = 0; i < 6; i++) s.plot(DOOR.x + 21 + (i % 3) * 3, DOOR.y + 10 + Math.floor(i / 3) * 4, ((t >> 3) + i * 7) % 4 ? 12 : 14);
    }
    // the resident rat makes a run along the wall now and then
    const rp = t % 1500;
    if (rp < 160) {
      const rx = Math.round(330 - rp * 2.2);
      if (rx > 26 && rx < 300) {
        const ry = WB - 1;
        s.rect(rx, ry - 2, 5, 2, 8);
        s.plot(rx - 1, ry - 2, 8);
        s.plot(rx - 1, ry - 3, 6);
        s.hline(rx + 5, rx + 8, ry - 1, 6);
        s.plot(rx + ((rp >> 2) % 2), ry, 0);
        s.plot(rx + 3 + ((rp >> 2) % 2), ry, 0);
      }
    }
  },
  front(g, s, t) {
    // when the tube stutters off, the corridor drops into gloom
    if (!tubeOn(t)) for (let i = 0; i < s.px.length; i++) s.px[i] = DARKER[s.px[i]];
  },
};
