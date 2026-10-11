// Dominic's Cubicle. The game starts here, Friday 4:59 PM.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Surface } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { officeWindow, carpet, desk, monitor, codeLines, keyboard, mug, plant, partition, fluorescent, ceiling, poster } from '../../art/lib';
import { award } from '../../content/points';
import { pickUp, npc } from '../../content/helpers';
import { act1Raw, readAsLook, rerun } from './natural';

function paint(p: Surface, g: Game) {
  const alert = !!g.flag('intro_alert');
  // ---- the office beyond: ceiling, far wall, windows at dusk
  p.rect(0, 0, 320, 12, 7);
  for (let x = 0; x < 320; x += 40) p.vline(x, 0, 11, 8);
  p.hline(0, 319, 11, 8);
  fluorescent(p, 60, 4, 44, !alert);
  fluorescent(p, 160, 4, 44, !alert);
  fluorescent(p, 260, 4, 44, !alert);
  p.rect(0, 12, 320, 58, 7);
  p.hline(0, 319, 12, 8);
  officeWindow(p, 16, 18, 86, 34, { seed: 11, time: 'dusk', panes: 3 });
  officeWindow(p, 118, 18, 86, 34, { seed: 23, time: 'dusk', panes: 3 });
  officeWindow(p, 220, 18, 86, 34, { seed: 37, time: 'dusk', panes: 3 });
  // distant cubicle farm: rows of partition tops with glowing monitors
  p.rect(0, 62, 320, 22, 8);
  p.rect(0, 62, 320, 2, 7);
  for (let x = 6; x < 320; x += 34) {
    p.vline(x, 62, 83, 7);
    if ((x / 34) % 3 !== 1) {
      p.rect(x + 12, 58, 9, 5, 0);
      p.rect(x + 13, 59, 7, 3, alert ? 4 : 3);
    }
  }
  p.rect(0, 72, 320, 12, 8);
  p.hline(0, 319, 72, 7);

  // ---- neighbouring cubicles at the far left / right edges
  p.poly([0, 76, 20, 80, 20, 122, 0, 136], 7);
  p.poly([300, 80, 320, 76, 320, 136, 300, 122], 7);
  p.vline(20, 80, 122, 8);
  p.vline(300, 80, 122, 8);

  // ---- floor: cubicle carpet + aisle runner in the foreground
  carpet(p, 84, 190, { a: 8, b: 0 });
  // aisle runner in the foreground
  p.rect(0, 151, 320, 39, 1);
  p.hline(0, 319, 151, 9);
  p.hline(0, 319, 152, 0);
  p.speckle(0, 153, 320, 37, 0, 0.03, 17);

  // ---- Dominic's cubicle: back partition (1.5m = ~32px tall)
  const PT = 82,
    PB = 116;
  partition(p, 60, PT, 200, PB - PT, 7);
  p.speckle(60, PT + 3, 200, PB - PT - 3, 9, 0.04, 5);
  // left side panel, coming toward the viewer
  p.poly([30, 68, 60, PT, 60, PB, 30, 148], dith(7, 8, 3));
  p.lines([30, 68, 60, PT], 8);
  p.lines([30, 69, 60, PT + 1], 8);
  p.rect(28, 68, 3, 81, 8);
  p.vline(28, 68, 148, 7);
  // right side panel
  p.poly([260, PT, 290, 68, 290, 148, 260, PB], dith(7, 8, 3));
  p.lines([260, PT, 290, 68], 8);
  p.lines([260, PT + 1, 290, 69], 8);
  p.rect(290, 68, 3, 81, 8);
  p.vline(292, 68, 148, 0);

  // cork board + calendar pinned to the back partition
  p.rect(70, PT + 4, 26, 16, 6);
  p.frame(70, PT + 4, 26, 16, 8);
  p.speckle(71, PT + 5, 24, 14, 14, 0.12, 3);
  p.rect(73, PT + 6, 11, 12, 15);
  p.ellipse(78, PT + 13, 2, 1, 7);
  p.vline(78, PT + 7, PT + 11, 6);
  p.rect(86, PT + 6, 4, 4, 14);
  p.rect(90, PT + 11, 4, 4, 13);
  p.rect(85, PT + 13, 4, 4, 10);
  p.rect(232, PT + 4, 14, 14, 15);
  p.rect(232, PT + 4, 14, 4, 4);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) p.plot(234 + c * 3, PT + 10 + r * 3, 8);
  p.plot(243, PT + 13, 4);
  // coat hook on the left panel, with badge on its lanyard
  p.rect(44, 86, 3, 2, 8);
  if (!g.flag('badge_taken')) {
    p.line(45, 88, 43, 94, 1);
    p.line(46, 88, 48, 94, 1);
    p.rect(42, 94, 7, 8, 15);
    p.frame(42, 94, 7, 8, 8);
    p.rect(43, 95, 3, 3, 16);
    p.hline(43, 47, 99, 1);
  }

  // ---- the desk (front edge on the floor at y=118)
  p.at(118, () => {
    p.poly([66, 98, 254, 98, 258, 104, 62, 104], 6);
    p.hline(66, 254, 98, 14);
    p.rect(62, 104, 197, 2, 0);
    p.rect(64, 106, 193, 12, 6);
    p.rect(66, 107, 189, 10, dith(6, 0, 4));
    p.rect(64, 116, 193, 2, 0);
    // drawer pedestal
    p.rect(214, 106, 26, 12, 8);
    p.frame(214, 106, 26, 12, 0);
    p.hline(215, 238, 110, 0);
    p.hline(215, 238, 114, 0);
    p.rect(225, 108, 4, 1, 7);
    p.rect(225, 112, 4, 1, 7);
    p.rect(225, 116, 4, 1, 7);
  });
  if (g.flag('drawer_open')) {
    p.at(124, () => {
      // drawer box pulled out of the pedestal, seen from above
      p.poly([215, 107, 239, 107, 243, 117, 211, 117], 0);
      p.lines([215, 107, 211, 117], 7);
      p.lines([239, 107, 243, 117], 7);
      p.hline(215, 239, 107, 8);
      // contents: pens, granola bar, the duck
      p.line(216, 115, 222, 113, 4);
      p.line(217, 116, 223, 114, 1);
      p.rect(233, 112, 6, 3, 6);
      p.hline(233, 238, 112, 14);
      if (!g.flag('duck_taken')) {
        p.ellipse(227, 114, 3, 1, 14);
        p.rect(228, 110, 3, 3, 14);
        p.plot(231, 111, 6);
        p.plot(229, 110, 0);
      }
      // drawer front
      p.rect(210, 117, 34, 5, 8);
      p.frame(210, 117, 34, 5, 0);
      p.rect(224, 119, 6, 1, 7);
    });
  }
  // ---- things on the desk
  p.at(118, () => {
    // monitor (bezel 36x22) on a stand
    monitor(p, 140, 75, 38, 21, alert ? 4 : 1, { bezel: 0 });
    if (!alert) codeLines(p, 142, 77, 34, 17, 3);
    else {
      p.micro(146, 79, 'CORE', 15);
      p.micro(146, 86, 'PANIC', 14);
    }
    // sticky notes on the bezel
    p.rect(136, 77, 4, 4, 14);
    p.rect(178, 80, 4, 4, 13);
    // keyboard + mouse
    keyboard(p, 145, 100, 28, 8, 7);
    if (!g.flag('note_found')) p.rect(170, 103, 3, 1, 14);
    p.rect(179, 101, 3, 2, 7);
    // photo frame
    p.rect(96, 92, 10, 8, 6);
    p.rect(97, 93, 8, 6, 9);
    p.rect(97, 96, 8, 3, 14);
    p.plot(100, 94, 16);
    p.plot(100, 95, 16);
    // desk lamp
    p.rect(80, 96, 7, 2, 8);
    p.line(83, 96, 80, 86, 8);
    p.poly([75, 83, 85, 85, 84, 89, 75, 87], 0);
    // plant "Kevin"
    plant(p, 202, 98, 0.45, 4);
    // mug
    if (!g.flag('mug_taken')) mug(p, 190, 93, 15);
    // papers
    p.rect(112, 95, 14, 2, 15);
    p.rect(113, 94, 12, 1, 7);
  });
  // ---- office chair, pulled out in front of the desk
  p.at(134, () => {
    p.hline(150, 168, 134, 8);
    p.plot(150, 133, 0);
    p.plot(168, 133, 0);
    p.rect(158, 127, 2, 7, 8);
    p.rect(150, 123, 19, 4, 0);
    p.rect(151, 123, 17, 1, 8);
    p.rect(152, 106, 15, 17, 0);
    p.rect(153, 107, 13, 15, dith(0, 1, 5));
  });
}

export const cubicle: RoomDef = {
  id: 'cubicle',
  title: "Dominic's Cubicle",
  act: 1,
  music: 'office',
  start: [190, 140, 'up'],
  draw: paint,
  walk: [
    [0, 152, 320, 38],
    [38, 152, 64, 121, 256, 121, 282, 152],
  ],
  blocks: [[146, 124, 26, 12]],
  look: "Your cubicle. Your home away from home, and lately, your home. A desk, a monitor, a chair, a succulent named Kevin, and the ever-present hum of fluorescent lights. Through the far windows, the sun is setting on what was supposed to be a long weekend.",
  hotspots: [
    { id: 'desk', nouns: ['desk', 'table', 'desktop', 'my desk'], area: [62, 98, 197, 20], at: [120, 126], look: 'Your desk: a battlefield of cables, sticky notes, and a keyboard that has survived four reorganizations. There is a drawer on the right side.' },
    { id: 'papers', nouns: ['papers', 'paper', 'paperwork', 'documents', 'printouts'], area: [111, 93, 16, 5], at: [120, 126], look: 'A stack of printouts: last sprint\'s retro notes. Action item one: "Never deploy on a Friday." Action item two: "See action item one."' },
    {
      id: 'computer',
      nouns: ['computer', 'monitor', 'screen', 'pc', 'display', 'terminal', 'workstation', 'messages', 'chat', 'chat messages', 'red screen', 'core panic'],
      area: [138, 74, 42, 24],
      at: [150, 124],
      look: (g) =>
        g.flag('intro_alert')
          ? 'Your monitor screams in red: MONOLITH CORE PANIC. ALL SERVICES DOWN. Below that, 4,096 unread chat messages. You decide, wisely, not to read them.'
          : 'Your monitor shows the code you were about to commit before the weekend.',
    },
    { id: 'keyboard', nouns: ['keyboard', 'desk keyboard', 'my keyboard', 'keys'], area: [143, 99, 32, 5], at: [150, 124], look: (g) => (g.flag('note_found') ? 'Your keyboard. You know every crumb in it by name.' : 'Your keyboard. You know every crumb in it by name. Something yellow is peeking out from underneath it.') },
    { id: 'mouse', nouns: ['mouse', 'mouse pad'], area: [177, 99, 7, 5], at: [178, 124], look: 'A mouse. It squeaks less than the real ones in the basement, supposedly.' },
    { id: 'mug', nouns: ['mug', 'cup', 'coffee mug', 'coffee cup'], area: [188, 91, 9, 8], at: [190, 124], when: (g) => !g.flag('mug_taken'), look: "Your favorite mug: WORLD'S OKAYEST PROGRAMMER. It's empty. Tragic." },
    { id: 'drawer', nouns: ['drawer', 'drawers', 'desk drawer', 'pedestal'], area: [210, 105, 34, 15], at: [226, 128], look: (g) => (g.flag('drawer_open') ? (g.flag('duck_taken') ? 'Inside the open drawer: three dead pens and a granola bar from 2019.' : 'Inside the open drawer: your trusty rubber duck, three dead pens, and a granola bar from 2019.') : 'A desk drawer. It contains the essentials of your professional life.') },
    { id: 'duck', nouns: ['duck', 'rubber duck', 'ducky'], area: [224, 110, 10, 6], at: [226, 128], when: (g) => !!g.flag('drawer_open') && !g.flag('duck_taken'), look: 'Your rubber duck. It has listened patiently to every bug you have ever explained out loud.' },
    { id: 'granola', nouns: ['granola', 'granola bar', 'bar'], area: [233, 111, 8, 5], at: [226, 128], when: (g) => !!g.flag('drawer_open'), look: 'A granola bar that expired in 2019. It may have achieved sentience. Best let it be.' },
    { id: 'pens', nouns: ['pens', 'pen', 'dead pens', 'three pens'], area: [215, 112, 9, 5], at: [226, 128], when: (g) => !!g.flag('drawer_open'), look: 'Three dead pens. You keep them for sentimental reasons, and because throwing them away would mean admitting they are dead.' },
    { id: 'photo', nouns: ['photo', 'picture', 'frame', 'photograph', 'beach photo'], area: [95, 91, 12, 10], at: [100, 124], look: 'A framed photo of you at the beach: sunburned, smiling, and blissfully unaware of the Monolith.' },
    { id: 'plant', nouns: ['plant', 'kevin', 'succulent', 'pot'], area: [194, 86, 16, 13], at: [202, 124], look: 'Kevin, your succulent. Kevin is the only thing in this office that thrives on neglect.' },
    { id: 'lamp', nouns: ['lamp', 'desk lamp'], area: [74, 82, 14, 16], at: [84, 124], look: 'A desk lamp, angled to produce maximum glare on your screen.' },
    { id: 'poster', nouns: ['poster', 'kitten', 'cat', 'cork board', 'corkboard', 'board'], area: [70, 86, 26, 16], at: [84, 124], look: 'A tiny poster of a kitten clinging to a branch: HANG IN THERE. Someone has added "(production)" in red pen. It was you.' },
    { id: 'notes', nouns: ['sticky notes', 'notes', 'bezel', 'post its', 'post it notes', 'postits', 'postit notes', 'monitor notes'], area: [134, 75, 50, 9], at: [150, 124], look: 'Sticky notes cover your monitor bezel: "TODO: fix everything", "NEVER deploy on Fridays", and "Water Kevin".' },
    { id: 'calendar', nouns: ['calendar', 'date'], area: [231, 85, 16, 15], at: [238, 128], look: "Your calendar. Today is Friday. Circled in red: 'LONG WEEKEND!!!' The red circle is starting to feel ironic." },
    { id: 'hook', nouns: ['hook', 'coat hook', 'peg'], area: [40, 84, 10, 6], at: [62, 140], look: (g) => (g.flag('badge_taken') ? 'An empty coat hook.' : 'A coat hook on the cubicle wall. Your ID badge is hanging from it on its lanyard.') },
    { id: 'badge', nouns: ['badge', 'id badge', 'id', 'lanyard', 'id card'], area: [40, 87, 11, 16], at: [62, 140], when: (g) => !g.flag('badge_taken'), look: 'Your employee ID badge, hanging on its lanyard. It opens most doors on this floor, assuming the building still believes in you.' },
    { id: 'chair', nouns: ['chair', 'office chair', 'seat'], area: [148, 105, 22, 30], at: [159, 142], look: 'Your ergonomic office chair. Its ergonomics expired around the same time as the granola bar.' },
    { id: 'window', nouns: ['window', 'windows', 'skyline', 'city', 'sunset', 'sky'], area: [12, 14, 296, 42], look: 'Over the partitions, through the far windows, the sun sets over the city. Everyone else is heading home for the weekend.' },
    { id: 'cubicles', nouns: ['cubicles', 'other cubicles', 'cubicle farm', 'office'], area: [0, 56, 320, 26], look: (g) => (g.flag('intro_alert') ? 'Row after row of cubicles, every monitor glowing the same alarming red.' : 'Row after row of cubicles stretch into the distance. Most of them are already empty for the weekend.') },
    { id: 'partition', nouns: ['partition', 'partitions', 'wall', 'walls', 'cubicle', 'cubicle wall', 'fabric', 'panel'], area: [28, 68, 264, 14], look: 'Gray-blue fabric walls, upholstered in the precise color of corporate resignation.' },
  ],
  exits: [{ area: [314, 152, 6, 38], to: 'office', at: [36, 176, 'right'], dir: 'east|south|out' }],
  nouns: {
    light: ['light', 'lights', 'lighting', 'fluorescent', 'fluorescents', 'fluorescent lights', 'fluorescent light', 'ceiling lights', 'overhead lights', 'tubes'],
    cables: ['cables', 'cable', 'wires', 'wire', 'tangle', 'sock', 'lost sock'],
    aisle: ['aisle', 'runner', 'way out', 'exit'],
  },
  raw: (g, text) => act1Raw(g, text),
  verbs: {
    // drawer
    'open drawer,pull drawer': async (g) => {
      if (g.flag('drawer_open')) return void (await g.say("It's already open."));
      await g.approach('drawer');
      await g.pose(null, 'reach', 300);
      g.set('drawer_open');
      g.sfx('door');
      g.redraw();
      await g.say(g.flag('duck_taken') ? 'You open the drawer. Three dead pens and an ancient granola bar.' : 'You slide open the drawer. Inside: your trusty rubber duck, three dead pens, and a granola bar from 2019.');
    },
    'close drawer,push drawer': async (g) => {
      if (!g.flag('drawer_open')) return void (await g.say("It's already closed."));
      await g.approach('drawer');
      g.set('drawer_open', false);
      g.redraw();
      await g.say('You slide the drawer shut.');
    },
    'look/in drawer,search drawer': async (g) => {
      if (!g.flag('drawer_open')) return void (await g.say("You'll have to open it first."));
      await g.say(g.flag('duck_taken') ? 'Three dead pens and a granola bar from 2019. Nothing you need.' : 'Your rubber duck, three dead pens, and a granola bar from 2019.');
    },
    'take duck': async (g) => {
      if (g.has('duck') || g.flag('duck_taken')) return false;
      if (!g.flag('drawer_open')) return void (await g.say("You don't see a duck. Your duck lives in your desk drawer, which is closed."));
      await g.approach('drawer');
      g.set('duck_taken');
      award(g, 'take_duck');
      await pickUp(g, 'duck', "You take your rubber duck. Every great debugging session starts with explaining the problem to a duck. If you ever get stuck, TALK TO DUCK.");
      g.redraw();
    },
    'take granola|pens,eat granola,look granola|pens': async (g, c) => {
      if (!g.flag('drawer_open')) return void (await g.say(c.verb === 'look' ? "Your desk drawer is closed. Whatever's in there is keeping to itself." : "Your desk drawer is closed. OPEN DRAWER first. Not that anything in there is edible."));
      if (c.verb === 'look') return false;
      if (c.noun === 'pens') return void (await g.say('Three dead pens. You leave them to rest in peace. They gave everything they had to sprint planning.'));
      await g.say('The granola bar expired in 2019. It has developed a personality. Leave it be.');
    },
    // mug
    'take mug': async (g) => {
      if (g.flag('mug_taken')) return false;
      await g.approach('mug');
      g.set('mug_taken');
      award(g, 'take_mug');
      await pickUp(g, 'mug', "You take your WORLD'S OKAYEST PROGRAMMER mug. It's empty, but hope springs eternal.");
      g.redraw();
    },
    // badge
    'take badge,take hook,take lanyard': async (g) => {
      if (g.flag('badge_taken')) return false;
      await g.approach('badge');
      g.set('badge_taken');
      award(g, 'take_badge');
      await pickUp(g, 'badge', 'You take your ID badge off the hook. You never know which doors are going to need convincing tonight.');
      g.redraw();
    },
    // the note under the keyboard
    'look/under keyboard,lift keyboard,move keyboard,search keyboard,look/under desk,pull note': async (g, c) => {
      if (c.noun === 'desk' && c.prep !== 'under') return false;
      if (c.noun === 'desk') return void (await g.say('Under your desk: a tangle of cables, a lost sock, and the shame of a thousand dropped snacks.'));
      await g.approach('keyboard');
      if (g.has('note') || g.flag('note_taken')) return void (await g.say("Nothing else under there but crumbs. Lots of crumbs. An archaeologist could date them."));
      g.set('note_found');
      await g.pose(null, 'reach', 300);
      g.set('note_taken');
      award(g, 'take_note');
      g.addItem('note');
      g.redraw();
      await g.say('You lift the keyboard. Underneath, among the crumbs, is a sticky note in your own handwriting:\n\n"HOW TO CENTER A DIV (for Nicholas. AGAIN.)"\n\nYou take it. Nicholas has asked you this approximately forty times.');
    },
    'take note,take sticky': async (g) => {
      if (g.has('note')) return false;
      if (!g.flag('note_found')) {
        await g.approach('keyboard');
        return void (await g.say('There are sticky notes all over your monitor, but they are load-bearing. There does seem to be something yellow poking out from under your keyboard, though.'));
      }
      return false;
    },
    'take keyboard': async (g) => {
      if (g.has('keyboard')) return false; // Nicholas's RGB keyboard, already in hand
      if (!g.flag('note_found')) return void (await rerun(g, 'look under keyboard'));
      await g.say("You'd rather not. Your muscle memory is calibrated to that keyboard. Besides, it's attached to a computer that can't reach anything anymore.");
    },
    'take computer,take monitor': 'It is screwed to the desk. Ever since the Great Monitor Heist of 2019.',
    'take photo': 'You leave it where it is. Beach-you is your emotional support during on-call shifts.',
    'take plant': 'Kevin stays. Kevin has seniority.',
    'take poster,take calendar': "It's better where it is.",
    'take notes': 'Those sticky notes are load-bearing. Remove one and the whole monitor might fall.',
    'type|use|login computer,turnon computer,type,login': async (g) => {
      await g.approach('computer');
      await g.pose(null, 'reach', 500);
      g.sfx('error');
      await g.say(g.flag('intro_alert') ? 'You type furiously. Connection refused. Connection refused. Connection refused. Nothing in the building can reach the Monolith. Somebody is going to have to go down there in person.' : 'You type a few lines. It can wait until Monday. Probably.');
    },
    'turnoff|reboot computer': "Turning your computer off and on won't turn production back on. You've thought about it, though.",
    'sit chair,sit': "You sink into your chair. It squeaks its usual complaint. Then you remember production is down and stand back up. No rest for the senior engineer.",
    'touch|hug plant': 'You give Kevin a gentle pat. He is spiky in the way only succulents and senior engineers can be.',
    'talk plant,ask|tell plant ?': "You tell Kevin about the outage. Kevin takes it in stride, the way only a succulent can. Good listener. Terrible debugger. That's what the duck is for.",
    'search desk': async (g) =>
      g.say(
        `Cables, sticky notes, a keyboard, Kevin, a photo of beach-you. ${g.flag('drawer_open') ? 'The drawer on the right is open.' : 'There is a drawer on the right side.'}${g.flag('note_found') ? '' : ' And is that something yellow peeking out from under the keyboard?'}`,
      ),
    'go|enter|exit cubicles|aisle': async (g) => {
      await g.walk(null, 316, 170);
      if (g.room?.id === 'cubicle') g.goto('office', [36, 176, 'right']);
    },
    'turnon|turnoff|use lamp': 'You click the lamp. It flickers, considers its options, and stays exactly as it was.',
    'look/through window': 'Over the partitions, through the far windows, the sun sets over the city. Everyone else is heading home for the weekend.',
    'look light': (g) =>
      g.say(
        g.flag('intro_alert')
          ? 'The fluorescent lights hum overhead. Since the Monolith went down, half of them are out and the other half are flickering in sympathy.'
          : 'Fluorescent lights, humming the song of their people.',
      ),
    'turnon|turnoff|fix|reboot light,use light': 'The lights are wired into the building management system, which runs on, you guessed it, the Monolith. The desk lamp is the only light you control, and it has opinions.',
    'look cables,look/under desk,search cables': 'Under your desk: a tangle of cables, a lost sock, and the shame of a thousand dropped snacks. One cable connects to nothing at all. You are afraid to unplug it.',
    'take|pull|unplug cables': "You've learned the hard way never to pull a mystery cable. Last time, the printer on the fourth floor caught fire.",
    'look aisle': 'The aisle runs off to the right, out to the open office.',
    'look|talk|search|comfort|tap aidan,ask|tell aidan ?': async (g) => {
      if (g.actor('aidan')) return false;
      await g.say(g.flag('aidan_comforted') ? 'Aidan is back at his desk in the open office, writing his postmortem.' : 'Aidan fled up the aisle to the open office to hide under his desk. Forever, he said. Somebody should probably check on him.');
    },
    'look|talk|ask|tell|search mike|nicholas|fahim|phil|krishna|denis|adriana,ask|tell mike|nicholas|fahim|phil|krishna|denis|adriana ?': async (g, c) => {
      if (c.noun && g.actor(c.noun)) return false;
      await g.say("Nobody here but you, Kevin, and the hum of the fluorescent lights. Everyone else is out in the rest of the building. (WHERE IS someone? will tell you where to look.)");
    },
    'read *': readAsLook,
  },
};

/** Opening scene in the cubicle (played once at the very start). */
export async function cubicleIntro(g: Game) {
  const p = g.player;
  p.place(190, 140, 'up');
  await g.wait(800);
  await g.say("FRIDAY, 4:59 PM.\n\nOne minute until a long weekend. You've closed every ticket. You've watered Kevin. Nothing can go wrong now.", { title: 'Monolith Systems Inc.' });
  const aidan = g.add(npc('aidan', 335, 170, 'left'));
  await g.walk(aidan, 270, 168, { direct: true });
  await g.walk(aidan, 232, 146, { direct: true });
  aidan.dir = 'left';
  p.faceToward(aidan.x, aidan.y);
  await g.talk(aidan, 'Hey Dominic! Guess what? I just did my first production deploy! All by myself!');
  await g.talk(p, "...On a Friday? At five o'clock?");
  await g.talk(aidan, 'The runbook said step four was "Restart the Monolith," so I restarted it! It went down super fast. It\'s coming back up any second now.');
  await g.talk(p, "Aidan. Nobody has restarted the Monolith since 1999. Nobody even knew it COULD restart.");
  await g.talk(aidan, 'Huh. Well, it was really easy. There was a big red button.');
  // The lights go out
  g.sfx('crash');
  g.flash(0, 300);
  g.shake(600);
  g.set('intro_alert');
  g.redraw();
  g.music(null);
  await g.wait(700);
  g.sfx('alarm');
  await g.wait(400);
  await g.say('The lights flicker. Every screen on the floor turns red. Somewhere, a pager goes off. Then forty more.');
  await g.say("\"Attention, everyone. This is Phil. Production is down. All of it. The Monolith is in some kind of... panic. Also, the building's security system runs on it, so most of the doors are locked. And the elevators. And the coffee machine.\"\n\n\"The investors arrive Monday at nine for the big demo. Dominic, you're our most senior engineer. Fix it. Please. Phil out.\"", { title: 'Intercom' });
  await g.talk(aidan, 'Oh no. Oh no no no. I broke the Monolith. I broke EVERYTHING. I am going to go hide under my desk. Forever.');
  aidan.dir = 'right';
  await g.walk(aidan, 270, 168, { direct: true });
  await g.walk(aidan, 340, 170, { direct: true });
  g.remove(aidan);
  g.music('office');
  await g.say("Your long weekend just became a long night. Somewhere in this building, there has to be a way to fix this.\n\n(Type commands like LOOK, OPEN DRAWER, or TAKE MUG. Click to walk. Press F1 for help.)");
  g.set('intro_done');
}
