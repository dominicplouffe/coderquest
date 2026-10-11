// The Stack Overflow Tower: call frames stacked on call frames, rising off the
// top of the world. At its foot, the Oracle answers questions (if you have the
// reputation). Nearby, a ghost process has been stuck in Vim since 1991.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import { Actor } from '../../engine/actor';
import { Surface, rng, microWidth } from '../../engine/raster';
import { bayerAt } from '../../engine/palette';
import { starfield } from '../../art/lib';
import { twinkle, sevenSeg, microOutlined, CYBER_VERBS } from '../../art/cyber_c_kit';
import { ghostImg, tilde, drawOracleScreen, halo } from '../../art/creatures_c';
import { noodleTree } from '../../art/cyber_c_pasta';
import { award } from '../../content/points';

const HZ = 112;
// the Oracle's CRT
const CRT = { x: 126, y: 66, w: 68, h: 58 };
const GLASS = { x: 135, y: 73, w: 50, h: 34 };
const GHOST_X = 236,
  GHOST_Y = 113;

let oracleTalking = false;
let vimCmd = ''; // shown on the ghost's command line
let vimCmdT = 0;
let ascend = 0; // ghost ascension progress (ticks)
let plus50 = 0; // "+50" floater timer

// ------------------------------------------------------------------ picture

function checkerFloor(p: Surface) {
  const bot = 190,
    vx = 160;
  for (let y = HZ + 1; y < bot; y++) {
    const d = (y - HZ) / (bot - HZ);
    const z = 1.4 / d;
    for (let x = 0; x < 320; x++) {
      const wx = (x - vx) / (d * 46);
      const cell = (Math.floor(wx) + Math.floor(z)) & 1;
      let c = cell ? 8 : 0;
      // orange seams between the slabs
      const fx = wx - Math.floor(wx),
        fz = z - Math.floor(z);
      if (d > 0.12 && (fx < 0.03 * (1 / (d + 0.2)) || fz < 0.05)) c = 6;
      if (d < 0.12) c = fz < 0.2 && d > 0.05 ? 6 : 0;
      p.plot(x, y, c);
    }
  }
  p.hline(0, 319, HZ, 14);
  p.hline(0, 319, HZ + 1, 6);
}

function skyWords(p: Surface) {
  // faint phrases hanging in the sky like constellations
  const words: [number, number, string][] = [
    [6, 18, 'POSSIBLE DUPLICATE'],
    [212, 10, 'WORKS ON MY MACHINE'],
    [262, 32, '[CLOSED]'],
    [218, 52, 'MARKED AS DUPLICATE'],
    [6, 40, 'EDIT: NEVERMIND, FIXED IT'],
  ];
  for (const [x, y, w] of words) p.micro(x, y, w, 8);
}

function distantForest(p: Surface) {
  noodleTree(p, 296, HZ + 1, 30, 9, { strands: 5, trunk: 2, crown: 11, meatballs: 1, cols: [6, 4] });
  noodleTree(p, 316, HZ + 1, 24, 10, { strands: 4, trunk: 2, crown: 9, meatballs: 0, cols: [6, 4] });
  // the trail east
  for (let x = 250; x < 320; x++) {
    const d = (x - 250) / 70;
    p.plot(x, Math.round(HZ + 8 + d * 34), 6);
    p.plot(x, Math.round(HZ + 4 + d * 22), 6);
  }
}

function crt(p: Surface) {
  const { x, y, w, h } = CRT;
  p.at(128, () => {
    // shadow on the floor
    p.ellipse(x + w / 2, 129, w / 2 + 4, 3, 0);
    // stand
    p.poly([x + 18, y + h, x + w - 18, y + h, x + w - 10, 128, x + 10, 128], 8);
    p.hline(x + 10, x + w - 10, 128, 0);
    p.hline(x + 18, x + w - 18, y + h, 7);
    // beige casing
    p.rect(x, y, w, h, 7);
    p.rect(x + 2, y + 2, w - 4, h - 4, 7);
    p.hline(x, x + w - 1, y, 15);
    p.vline(x, y, y + h - 1, 15);
    p.vline(x + w - 1, y, y + h - 1, 8);
    p.hline(x, x + w - 1, y + h - 1, 8);
    for (let yy = y + 1; yy < y + h - 1; yy++) if (bayerAt(x + w - 3, yy) < 8) p.plot(x + w - 3, yy, 8);
    // bezel around the glass
    p.rect(GLASS.x - 3, GLASS.y - 3, GLASS.w + 6, GLASS.h + 6, 8);
    p.hline(GLASS.x - 3, GLASS.x + GLASS.w + 2, GLASS.y + GLASS.h + 2, 15);
    p.vline(GLASS.x + GLASS.w + 2, GLASS.y - 3, GLASS.y + GLASS.h + 2, 15);
    p.rect(GLASS.x - 1, GLASS.y - 1, GLASS.w + 2, GLASS.h + 2, 0);
    // badge, vents, knobs, power light
    p.micro(x + 5, y + h - 9, 'ORACLE', 6);
    p.rect(x + w - 16, y + h - 10, 3, 3, 0);
    p.plot(x + w - 15, y + h - 9, 8);
    p.rect(x + w - 10, y + h - 10, 3, 3, 0);
    p.plot(x + w - 9, y + h - 9, 8);
    for (let i = 0; i < 6; i++) p.hline(x + 30 + i * 0, x + 44, y + h - 10 + (i % 3) * 2, i < 3 ? 8 : 8);
    p.plot(x + w - 5, y + h - 6, 10);
  });
}

function repBoard(p: Surface) {
  const x = 22,
    y = 58,
    w = 74,
    h = 40;
  p.at(130, () => {
    p.rect(x + w / 2 - 2, y + h, 4, 130 - y - h, 8);
    p.vline(x + w / 2 - 2, y + h, 129, 7);
    p.rect(x, y, w, h, 0);
    p.frame(x, y, w, h, 6);
    p.frame(x + 1, y + 1, w - 2, h - 2, 14);
    p.micro(x + (w - microWidth('YOUR REPUTATION')) / 2, y + 4, 'YOUR REPUTATION', 14);
    p.hline(x + 4, x + w - 5, y + 11, 6);
    // a little gold badge
    p.circle(x + 10, y + 26, 4, 6);
    p.circle(x + 10, y + 26, 2, 14);
    p.plot(x + 9, y + 25, 15);
  });
}

function paint(p: Surface, g: Game) {
  p.rect(0, 0, 320, HZ, 0);
  starfield(p, 0, 0, 320, HZ - 6, 707, 0.008);
  // amber haze at the horizon
  for (let y = HZ - 6; y < HZ; y++) for (let x = 0; x < 320; x++) if (bayerAt(x, y) < (y - HZ + 6) * 1.2) p.plot(x, y, 6);
  skyWords(p);
  distantForest(p);
  checkerFloor(p);
  repBoard(p);
  // a soft green glow around the Oracle
  halo(p, CRT.x + CRT.w / 2, CRT.y + CRT.h / 2 - 4, CRT.w / 2 + 14, CRT.h / 2 + 10, 2, 4);
  crt(p);
  poppedFrame(p);
  void g;
}

function poppedFrame(p: Surface) {
  // a call frame that got popped off the top long ago, lying where it fell
  p.at(176, () => {
    const pts = [26, 166, 84, 158, 86, 170, 28, 178];
    p.poly(pts, 8);
    p.lines([26, 166, 84, 158], 7);
    p.lines([84, 158, 86, 170, 28, 178, 26, 166], 6);
    p.line(28, 179, 86, 171, 0);
    for (const [i, ch] of [...'PARSE()'].entries()) p.micro(31 + i * 4, 166 - Math.round(i * 0.55), ch, 14);
    p.line(62, 163, 74, 161, 7);
    p.line(62, 166, 70, 165, 3);
    // a crack
    p.lines([50, 164, 52, 168, 50, 172], 0);
  });
}

// ------------------------------------------------------------------ the tower (animated)

const FRAMES = ['main()', 'init()', 'parse()', 'parse()', 'parse()', 'parse()', 'parse()', 'parse()', 'parse()'];

function drawTower(s: Surface, t: number) {
  const fw = 58,
    fh = 12;
  let y = CRT.y - fh;
  for (let i = 0; i < FRAMES.length; i++) {
    const sway = i < 2 ? 0 : Math.round(Math.sin(t / 50 + i * 0.4) * (i - 1) * 0.35 + i * 0.6);
    const x = 160 - fw / 2 + sway;
    const fill = i === 0 ? 1 : 8;
    s.rect(x, y, fw, fh, fill);
    s.hline(x, x + fw - 1, y, i === 0 ? 9 : 7);
    s.vline(x, y, y + fh - 1, 6);
    s.vline(x + fw - 1, y, y + fh - 1, 6);
    s.hline(x, x + fw - 1, y + fh - 1, 0);
    s.micro(x + 3, y + 4, FRAMES[i], i === 0 ? 15 : 14);
    // a few lines of "code" on the right of each frame
    const r = rng(i * 13 + 5);
    for (let k = 0; k < 3; k++) {
      const lx = x + 32 + Math.floor(r() * 4);
      s.hline(lx, lx + 4 + Math.floor(r() * 14), y + 3 + k * 3, k === 1 ? 3 : 7);
    }
    y -= fh;
  }
  // stack depth warning, way up top
  if ((t >> 5) % 3 !== 0) microOutlined(s, 164 + Math.round(Math.sin(t / 50 + 3.2) * 2.8 + 4.8), 2, 'DEPTH 9998', 12);
}

// ------------------------------------------------------------------ the ghost

function ghost(g: Game) {
  return g.actor('ghost');
}

function makeGhost(): Actor {
  const a = new Actor('ghost', 'PID 1991', { stand: { frames: [] } }, GHOST_X, GHOST_Y, 'left');
  a.ghost = true;
  a.data.gap = 26;
  a.data.gapY = 10;
  a.custom = (t) => {
    const flick = (t % 230) > 214 ? 2 : ascend > 0 ? (ascend > 60 ? 2 : 1) : 1;
    return ghostImg({
      wave: (t >> 3) % 4,
      mouth: a.talking ? (((t >> 3) & 1) ? 2 : 0) : ((t >> 5) % 3 === 0 ? 1 : 2),
      arms: ascend > 0 || a.data.happy ? 1 : ((t >> 6) & 1) as 0 | 1,
      fade: a.talking ? 0 : (flick as 0 | 1 | 2),
      happy: !!a.data.happy,
    });
  };
  return a;
}

// ------------------------------------------------------------------ the Oracle

async function oracleSay(g: Game, text: string) {
  oracleTalking = true;
  try {
    await g.say(text, { title: 'The Oracle' });
  } finally {
    oracleTalking = false;
  }
}

const NEED_REP = 'You need at least 50 reputation to ask a question. Your current reputation: 1.\n\nPerhaps you could start by answering somebody else\'s question?';

const TOPICS: [RegExp, string][] = [
  [/heisen|\bbugs?\b|beast|insect|creature/, 'Q: "How do I catch a bug that disappears whenever I look at it?"\n\nACCEPTED ANSWER (+4,096): Observing it makes it vanish. So don\'t look. Write a test that catches it for you.'],
  [/adriana|architect/, 'Last seen beyond the Infinite Loop, north of the forest.\n\nThis question has been closed as off-topic.'],
  [/dragon|cobol|legacy/, 'ACCEPTED ANSWER: Legacy systems can be soothed with their own documentation. Nothing puts a legacy system to sleep faster than its own manual.\n\n(Comment: "this worked for me in 1988, thx")'],
  [/\bvim\b|editor|ghost|1991|exit/, 'Duplicate.'],
  [/loop|infinite|while/, 'Q: "How do I get out of an infinite loop?"\n\nACCEPTED ANSWER (+1,287): break.\n\n(Second answer: "Have you tried pressing Escape?" +12)'],
  [/forest|spaghetti|noodle/, 'Refactor it. Next question.'],
  [/king|kernel/, 'He has a reputation of 1 and is somehow a moderator. Do not ask how.'],
  [/heap|garbage|collector|\bgc\b|badge/, 'Make sure something references you. A name tag works.\n\nThis answer was edited 47 times.'],
  [/duck/, 'Rubber duck debugging is the accepted answer to roughly 30% of all questions on this site. Have you tried it?'],
  [/div|center|centre|css/, 'Closed as duplicate of 40,000 other questions.'],
  [/oracle|yourself|\byou\b|meta/, 'Questions about the Oracle belong on Meta.'],
  [/jar|test|unit/, 'Write the test first. Then the bug has nowhere to hide. (+3 votes, -11 votes, 600 comments arguing)'],
  [/monolith|microservice/, 'Have you considered rewriting it as microservices? (-37 votes)'],
  [/meaning|life|42|universe/, '42. Closed as too broad.'],
  [/core|date|y2k|millennium|year/, 'This question is protected. It may only be answered by users with a four-digit year.'],
  [/denis/, 'User Denis (1987) has 1 answer, 0 questions, and has been "away from keyboard" since 1999.'],
  [/coffee|teapot|418/, 'Error 418: I\'m a teapot. This is an Oracle. Please direct coffee questions to the break room.'],
  [/regex|regular expression|html/, 'You cannot parse that with regex. The Oracle has seen what happens to those who try.'],
];

async function askOracle(g: Game, raw: string) {
  await g.approach([160, 140]);
  g.player.dir = 'up';
  if (!g.flag('vim_solved')) return oracleSay(g, NEED_REP);
  const t = raw
    .toLowerCase()
    .replace(/^\s*(ask|tell|question)\s+(the\s+)?(oracle\s*)?/, '')
    .replace(/^.*?\b(about|regarding|for|on|how|why|what|where|who)\b/, '');
  const topic = t.trim();
  if (!topic || /^(oracle|the oracle|ask)$/.test(topic)) return oracleSay(g, 'What is your question? Please be specific. Include a minimal reproducible example. (ASK ORACLE ABOUT something.)');
  if (!g.flag('oracle_asked')) {
    g.set('oracle_asked');
    award(g, 'oracle_asked');
    await oracleSay(g, 'Your first question! Please review the guidelines before posting. Thank you for contributing to the Stack.\n\n...Processing.');
  }
  if (/bridge|void|\bnull\b|\bnode\b|\bgap\b|linked|pointer|nullpointer|missing/.test(topic)) {
    if (g.flag('node_given')) return oracleSay(g, 'Closed as duplicate of your own previous question. (You already have the node. Check your inventory.)');
    await oracleSay(g, 'Q: "How do I fix a broken linked list over a Null Void?"\n\nMarked as duplicate of "How do I fix a broken linked list?" (asked 1999).\n\nThe accepted answer is... here. Take this.');
    g.sfx('teleport');
    g.flash(10, 100);
    await g.pose(null, 'reach', 500);
    g.set('node_given');
    award(g, 'take_node');
    g.addItem('node');
    await g.say('A small glowing box slides out of the Oracle\'s floppy slot and into your hands: a linked-list node, its "next" pointer twitching eagerly, looking for something to point at.');
    await oracleSay(g, 'Please remember to mark this answer as accepted.');
    return;
  }
  for (const [re, ans] of TOPICS) if (re.test(topic)) return oracleSay(g, ans);
  return oracleSay(g, 'This question has been closed as primarily opinion-based.');
}

async function talkOracle(g: Game) {
  await g.approach('oracle');
  if (!g.flag('vim_solved')) {
    await oracleSay(g, 'WELCOME TO THE STACK.\n\nBefore asking a question, please search to see whether it has already been answered. It has.');
    await oracleSay(g, NEED_REP);
    return;
  }
  await oracleSay(g, 'Your reputation: 51. You may ask a question.\n\nASK ORACLE ABOUT something. Be specific. Show what you have tried. Include a minimal reproducible example.');
}

// ------------------------------------------------------------------ Vim

function isVimAnswer(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (/(^|[\s"'(])zz($|[\s"'.!)])/i.test(text)) return true;
  if (/:\s*(q!?|wq!?|x!?|qa!?|wqa!?|xa!?|quit!?|q\s*!|exit|cq)(?=$|[\s"'.!,)])/.test(t)) return true;
  if (/\bcolon\s*(q|w\s*q|x|quit)\b/.test(t)) return true;
  if (/\b(escape|esc)\b.*\b(colon|:)\s*(q|wq|x)/.test(t)) return true;
  return false;
}

async function solveVim(g: Game, raw: string) {
  const a = ghost(g);
  if (!a) return;
  await g.approach(a);
  const cmd = (raw.match(/:\s*[a-z!]+/i)?.[0] ?? (/zz/i.test(raw) ? 'ZZ' : ':q!')).replace(/\s+/g, '');
  await g.talk(g.player, `Listen carefully. Press Escape. Then type ${cmd === 'ZZ' ? 'capital Z, capital Z' : cmd.split('').join(' ').replace(':', 'colon').replace('!', 'bang')}. ${cmd === 'ZZ' ? '' : 'Then press Enter.'}`);
  await g.talk(a, `Escape... ${cmd === 'ZZ' ? 'Z... Z...' : cmd.split('').join('... ').replace(':', 'colon')}...${cmd === 'ZZ' ? '' : ' ENTER?'}`);
  vimCmd = cmd;
  vimCmdT = 999;
  g.sfx('type');
  await g.wait(500);
  g.sfx('beep');
  vimCmd = '';
  a.data.happy = true;
  g.flash(15, 120);
  g.sfx('fanfare');
  await g.talk(a, "I'M OUT! I'M OUT!! THIRTY-FIVE YEARS!\n\nI only wanted to fix one typo in a config file! In 1991! Then I pressed 'i' and the whole world turned into INSERT MODE!");
  await g.talk(a, 'Thank you, stranger! Here: take my reputation. All of it. Fifty points! It\'s all I have, but where I\'m going, I won\'t need it.');
  g.set('vim_solved');
  award(g, 'vim_solved');
  plus50 = 150;
  g.sfx('points');
  g.redraw();
  // ascension
  g.sfx('digitize');
  ascend = 1;
  for (let i = 0; i < 90; i++) {
    a.y -= 1.2;
    ascend++;
    await g.wait(20);
  }
  g.remove(a);
  ascend = 0;
  await g.say('The ghost process rises into a shaft of light, waving, and is gracefully terminated. Exit code 0.\n\n+50 REPUTATION. Your reputation is now 51. You may now ask the Oracle a question.');
}

// ------------------------------------------------------------------ overlay

function overlay(g: Game, s: Surface, t: number) {
  twinkle(s, t, 0, 0, 320, HZ - 10, 31, 10);
  drawTower(s, t);
  // upvote chevrons drifting up through the sky
  for (let i = 0; i < 6; i++) {
    const x = 20 + ((i * 53) % 280) + Math.round(Math.sin(t / 60 + i) * 3);
    const y = HZ - 8 - ((t * (0.15 + i * 0.03) + i * 37) % (HZ - 10));
    const c = i % 3 === 0 ? 14 : 6;
    s.plot(x, Math.round(y), c);
    s.plot(x - 1, Math.round(y) + 1, c);
    s.plot(x + 1, Math.round(y) + 1, c);
    s.plot(x - 2, Math.round(y) + 2, c);
    s.plot(x + 2, Math.round(y) + 2, c);
  }
  // the Oracle's face
  const look = Math.max(-1, Math.min(1, (g.player.x - 160) / 70));
  const blink = t % 200 < 7;
  drawOracleScreen(s, GLASS.x, GLASS.y, GLASS.w, GLASS.h, t, {
    look,
    mouth: oracleTalking ? [0, 2, 3, 1, 2, 0][(t >> 3) % 6] : 0,
    blink,
    glow: oracleTalking,
    stern: !g.flag('vim_solved'),
  });
  // reputation display
  const rep = g.flag('vim_solved') ? '51' : ' 1';
  sevenSeg(s, 50, 72, rep, (t >> 4) % 8 === 0 && g.flag('vim_solved') ? 15 : 14);
  // the ghost's Vim: a trail of ~ and the INSERT status line
  const a = ghost(g);
  if (a && ascend === 0) {
    const gx = Math.round(a.x),
      gy = Math.round(a.y);
    for (let yy = gy + 2, k = 0; yy < 128; yy += 5, k++) if ((t >> 4) % 5 !== k % 5) tilde(s, gx - 3 + ((k * 3) % 5) - 2, yy, k > 1 ? 1 : 9);
    if (vimCmd) microOutlined(s, gx - 8, 131, vimCmd, 15);
    else if ((t >> 5) & 1) microOutlined(s, gx - 22, 131, '-- INSERT --', 15);
  }
  // a shaft of light when the ghost ascends
  if (ascend > 0) {
    for (let y = 0; y < 132; y++)
      for (let x = GHOST_X - 10; x <= GHOST_X + 10; x++) {
        const d = Math.abs(x - GHOST_X) / 10;
        if (bayerAt(x, y) < (1 - d) * Math.min(12, ascend / 4)) s.plot(x, y, d < 0.3 ? 15 : 11);
      }
  }
  if (plus50 > 0) {
    plus50--;
    const p = g.player;
    microOutlined(s, Math.round(p.x - 14), Math.round(p.y - 46 - (150 - plus50) / 10), '+50 REP', (t >> 2) & 1 ? 14 : 15);
  }
  if (vimCmdT > 0) vimCmdT--;
  // glow around the CRT when it speaks
  if (oracleTalking) halo(s, CRT.x + CRT.w / 2, CRT.y + CRT.h / 2, CRT.w / 2 + 8, CRT.h / 2 + 6, 2, 5);
}

function tick(g: Game) {
  const a = ghost(g);
  if (a && ascend === 0) a.y = GHOST_Y + Math.round(Math.sin(g.t / 40) * 2);
}

// ------------------------------------------------------------------ room

export const stack: RoomDef = {
  id: 'stack',
  title: 'The Stack Overflow Tower',
  act: 2,
  music: 'stack',
  start: [300, 170, 'left'],
  draw: paint,
  walk: [[0, 132, 320, 57]],
  blocks: [[22, 158, 68, 20]],
  look: (g) =>
    `The Stack Overflow Tower: call frames piled on call frames, main() at the bottom, then init(), then parse(), parse(), parse()... swaying gently as they rise off the top of the sky. Someone forgot the base case.\n\nThe whole tower rests on an enormous old CRT monitor. On its screen glows a giant, solemn face: the Oracle.${
      g.flag('vim_solved') ? '' : '\n\nNearby, a translucent ghost hovers in mid-air, wailing.'
    }`,
  hotspots: [
    { id: 'sky', nouns: ['sky', 'stars', 'words', 'constellations', 'phrases', 'chevrons', 'upvotes', 'arrows'], area: [0, 0, 320, 56], look: 'Words hang in the dark like constellations: POSSIBLE DUPLICATE. WORKS ON MY MACHINE. [CLOSED]. Little orange upvote chevrons drift slowly upward, like sparks from a campfire of arguments.' },
    { id: 'floor', nouns: ['floor', 'ground', 'tiles', 'plaza', 'checkerboard'], area: [0, 113, 320, 77], look: 'A plaza of dark tiles with orange seams, polished smooth by generations of programmers pacing while waiting for an answer.' },
    { id: 'forest', nouns: ['forest', 'trees', 'spaghetti', 'trail', 'path'], area: [270, 80, 50, 50], look: 'To the east, the trail winds back toward the Spaghetti Forest.' },
    { id: 'popped', nouns: ['popped frame', 'fallen frame', 'broken frame', 'old frame', 'slab'], area: [24, 156, 64, 24], at: [60, 186], look: 'A call frame lies cracked on the ground: parse(). It was popped off the top of the stack ages ago and fell all the way down. The return value is still sitting in it, unread.' },
    {
      id: 'tower',
      nouns: ['tower', 'stack', 'frames', 'frame', 'call frames', 'call stack', 'main', 'init', 'parse', 'boxes', 'stack overflow', 'depth', 'recursion'],
      area: [128, 0, 72, 66],
      look: 'A tower of call frames: main() at the bottom, then init(), then parse(), which calls parse(), which calls parse(), which calls parse()... all the way up past the sky. A warning flickers at the top: DEPTH 9998. Somebody forgot the base case, and the stack is two frames from overflowing.',
    },
    {
      id: 'oracle',
      nouns: ['oracle', 'face', 'crt', 'monitor', 'screen', 'head', 'computer', 'terminal', 'tv'],
      area: [CRT.x, CRT.y, CRT.w, CRT.h + 4],
      at: [160, 140],
      look: (g) =>
        g.flag('vim_solved')
          ? 'The Oracle: a giant face glowing green inside an enormous 1987 CRT monitor, which is also, structurally, the foundation of the entire tower. Its eyes follow you with mild interest. You have the reputation now. ASK ORACLE ABOUT something.'
          : 'The Oracle: a giant face glowing green inside an enormous 1987 CRT monitor, which is also, structurally, the foundation of the entire tower. It has seen every question ever asked, and has found most of them to be duplicates. Its eyes follow you, unimpressed.',
    },
    {
      id: 'board',
      nouns: ['board', 'reputation', 'rep', 'scoreboard', 'sign', 'reputation board', 'badge', 'number'],
      area: [20, 56, 78, 74],
      at: [59, 140],
      look: (g) => (g.flag('vim_solved') ? 'A board reads YOUR REPUTATION: 51. Fifty-one! Enough to ask a question. Not enough to vote to close one, which is probably for the best.' : 'A board reads YOUR REPUTATION: 1. One point, awarded for existing. It is not enough to do anything at all.'),
    },
  ],
  exits: [{ area: [314, 132, 6, 57], to: 'forest', at: [18, 165, 'right'], dir: 'east' }],
  nouns: {
    ghost: ['ghost', 'process', 'pid', 'pid 1991', '1991', 'spirit', 'phantom', 'specter', 'spectre', 'ghost process', 'poor process'],
    vim: ['vim', 'vi', 'editor', 'insert mode'],
  },
  verbs: {
    // ---- the ghost
    'talk ghost,talk': async (g, c) => {
      const a = ghost(g);
      if (!a) {
        if (c.noun === 'ghost') return void (await g.say('The ghost has moved on to a better place. Probably nano.'));
        return void (await talkOracle(g));
      }
      await g.approach(a);
      const i = g.inc('ghost_talk') - 1;
      const lines = [
        "HOW DO I GET OUT OF THIS EDITOR?! I've been in it since 1991! I just wanted to change ONE LINE in a config file! I pressed 'i' and now everything I type goes INTO THE FILE!",
        "I've tried everything! Ctrl-C! It just tells me to type something I don't understand! I typed 'exit'. I typed 'quit'. I typed 'PLEASE'. They're all in the file now!",
        'Is it... is it something with a colon? I have a terrible feeling it involves a colon.',
      ];
      await g.talk(a, lines[Math.min(i, lines.length - 1)]);
    },
    'look ghost': async (g) => {
      if (!ghost(g)) return void (await g.say('There is nothing left of the ghost but a faint smell of ozone and a sense of profound relief.'));
      await g.say('A translucent ghost process, PID 1991, hovering just above the floor and clutching its head. Beneath it trails a column of little blue tildes, and at the bottom, blinking forever: -- INSERT --. It has been stuck in Vim since 1991.');
    },
    'ask ghost ?,tell ghost ?': async (g) => {
      const a = ghost(g);
      if (!a) return false;
      await g.approach(a);
      await g.talk(a, 'Questions?! I have one question! HOW DO I EXIT VIM?!');
    },
    'give esckey ghost,show esckey ghost,use esckey ghost,use esckey,push esckey,escape': async (g) => {
      const a = ghost(g);
      if (!a) return false;
      await g.approach(a);
      if (g.has('esckey')) await g.say('You hold up the ESC key. The ghost presses it eagerly. The Vim status line changes: -- INSERT -- vanishes!');
      await g.talk(a, "I pressed Escape! I'm out of INSERT mode! ...But I'm STILL IN VIM! Good start, but what's the COMMAND?!");
    },
    'help ghost': async (g) => {
      const a = ghost(g);
      if (!a) return false;
      await g.approach(a);
      await g.talk(a, 'Yes! Help! Tell me what to type! Anything! SAY it, I\'ll type it!');
    },
    'attack ghost,touch ghost,take ghost,catch ghost': async (g) => {
      if (!ghost(g)) return false;
      await g.say('Your hand passes straight through the ghost. It shivers. "Please. I don\'t need a hug. I need a COMMAND."');
    },
    'look vim': 'Vim: a text editor of enormous power, which the ghost has been unable to leave for thirty-five years. Leaving Vim is, famously, the hardest thing in computing.',
    // ---- the Oracle
    'talk oracle': async (g) => {
      await talkOracle(g);
    },
    'ask oracle ?,ask ?,tell oracle ?': async (g, c) => {
      if (c.noun === 'ghost') return false;
      await askOracle(g, c.raw);
    },
    'give * oracle,show * oracle,put * oracle': async (g, c) => {
      if (!c.noun || !g.has(c.noun)) return false;
      await g.approach('oracle');
      await oracleSay(g, c.noun === 'duck' ? 'Ah, a rubber duck. The Oracle approves. The duck has answered more questions than the Oracle ever will.' : 'The Oracle does not accept gifts. Bounties, however, are always welcome.');
    },
    'attack|kick oracle,push|kick tower,attack tower': async (g) => {
      await g.say('You consider shoving the tower. Then you look up at the 9,998 frames swaying overhead, all of them balanced on that one monitor, and decide that is precisely the kind of thing that ends with a stack overflow on your head.');
    },
    'climb tower,climb oracle,climb frames,climb': async (g) => {
      await g.approach([160, 134]);
      g.player.dir = 'up';
      await g.say('You haul yourself up onto main(). Then init(). Then parse(). Then parse(). Then parse()...');
      g.sfx('alarm');
      g.shake(900);
      g.flash(12, 300);
      g.player.visible = false;
      await g.wait(700);
      return void (await g.die('...at frame 9,999 you push one frame too many. The stack overflows, the tower comes down, and you are popped off the top, never to return.\n\nYou have been caught in infinite recursion. Always check your base case.', { title: 'Stack Overflow' }));
    },
    'take tower,take frames,pop tower,pop frames,push frames': "It's a stack. Everybody pushes. Nobody ever pops.",
    'take popped,push popped,read popped': 'The frame is heavy and cracked. Inside, its return value is still waiting for somebody to read it: 0. Disappointing, after such a long fall.',
    'turnoff|unplug|reboot oracle': 'Turn off the Oracle? The entire tower is standing on it. Also, the community would never forgive you.',
    'look board,read board': async (g) => {
      const h = g.hotspot('board');
      if (h && typeof h.look === 'function') {
        const out = await h.look(g);
        if (typeof out === 'string') await g.say(out);
      }
    },
    'look sky,read sky,read words': 'Words hang in the dark like constellations: POSSIBLE DUPLICATE. WORKS ON MY MACHINE. [CLOSED]. MARKED AS DUPLICATE. EDIT: NEVERMIND, FIXED IT. That last one never says how.',
    'look up': 'The tower of call frames sways overhead and vanishes into the stars. parse() calling parse() calling parse(), forever. At the very top, a warning blinks red.',
    ...CYBER_VERBS,
  },
  raw: async (g, text) => {
    const t = text.trim().toLowerCase();
    if (isVimAnswer(text)) {
      if (!ghost(g)) {
        await g.say("You're not in Vim. Neither, thankfully, is anyone else anymore.");
        return true;
      }
      await solveVim(g, text);
      return true;
    }
    if (ghost(g)) {
      // near misses
      if (/^(say |tell ghost |type )?["']?:w["']?$/.test(t)) {
        await g.talk(ghost(g)!, 'I SAVED IT! Wonderful. Saved. Forever. ...I am STILL IN VIM!');
        return true;
      }
      if (/(ctrl|control)[\s+-]*c\b|\^c\b/.test(t)) {
        await g.talk(ghost(g)!, 'I press Ctrl-C and it just says: "Type :qa! and press <Enter> to abandon all changes and exit Vim". BUT I DON\'T KNOW WHAT THAT MEANS!');
        return true;
      }
      if (/^(say |tell ghost |type )?["']?(exit|quit|q|stop|close|bye|logout|leave)["']?\s*$/.test(t) || /^(tell|say to) ghost (to )?(exit|quit|leave)/.test(t)) {
        await g.talk(ghost(g)!, 'I TRIED THAT! It just typed it into the file! The file now ends with "exit quit stop close bye PLEASE HELP". Thirty-five years of "exit"s!');
        return true;
      }
      if (/^(say|tell ghost|tell) /.test(t) && /\b(nano|emacs|notepad|vscode|code)\b/.test(t)) {
        await g.talk(ghost(g)!, "Another editor?! I can't even get out of THIS one!");
        return true;
      }
    }
    return false;
  },
  enter(g) {
    oracleTalking = false;
    vimCmd = '';
    ascend = 0;
    plus50 = 0;
    if (!g.flag('vim_solved')) g.add(makeGhost());
  },
  tick,
  overlay,
};
