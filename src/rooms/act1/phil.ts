// Phil's corner office: sunset windows, the executive desk, the swear jar,
// a putting green, and Phil pacing on the phone with the investors.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import type { Actor } from '../../engine/actor';
import { Surface, rng } from '../../engine/raster';
import { dith } from '../../engine/palette';
import { skyline, fluorescent } from '../../art/lib';
import { ceilingBand, sideWallL, sideWallR, lerpY, quad, frontDesk, plaque, shadow, BASE_NOUNS, itemNouns } from '../../art/office_props';
import { award } from '../../content/points';
import { addNpc, convo } from '../../content/helpers';
import { act1Raw, readAsLook, topicOf, topicLine, type Topics } from './natural';

const SEAM = 104;
const LX = 26;
const RX = 292;
const PACE_Y = 116;
const PACE: [number, number] = [56, 232];

const lfloor = (x: number) => lerpY(0, 134, LX, SEAM, x);
const rfloor = (x: number) => lerpY(RX, SEAM, 320, 134, x);

function paint(p: Surface, g: Game) {
  const keycardGiven = !!g.flag('phil_gave_keycard');
  // ---------------------------------------------------------------- walls & windows
  p.rect(0, 0, 320, SEAM, 7);
  // ---------------------------------------------------------------- floor: dark wood (drawn first; walls cover it)
  p.rect(0, SEAM, 320, 190 - SEAM, 6);
  for (let i = 0; i < 9; i++) {
    const y = SEAM + 3 + Math.round(i * i * 1.15 + i * 2);
    if (y < 190) p.hline(0, 319, y, dith(6, 0, 6));
  }
  p.speckle(0, SEAM, 320, 86, 0, 0.012, 9);
  p.hline(LX, RX, SEAM, 0);
  ceilingBand(p, LX, RX, 10, 7);
  fluorescent(p, 120, 2, 30, false);
  fluorescent(p, 200, 2, 30, false);
  // back wall: windows above warm walnut paneling
  p.rect(LX, 10, RX - LX, SEAM - 10, 7);
  // the big corner windows (back wall)
  skyline(p, LX + 4, 13, 168, 60, { seed: 97, time: 'dusk' });
  for (const mx of [LX + 4 + 56, LX + 4 + 112]) p.rect(mx - 1, 13, 3, 60, 8);
  p.frame(LX + 3, 12, 170, 62, 8);
  p.hline(LX + 4, LX + 171, 13, 7);
  // left wall: windows wrap around the corner
  p.poly([0, -6, LX, 10, LX, SEAM, 0, 134], 7);
  p.clip(0, 0, LX, 190);
  skyline(p, 0, 3, LX + 2, 72, { seed: 31, time: 'dusk' });
  p.clip();
  p.poly([0, -6, LX, 10, LX, 13, 0, 0], 7);
  p.line(0, 0, LX, 12, 8);
  p.poly([0, 89, LX, 74, LX, SEAM, 0, 134], 6);
  p.line(0, 88, LX, 73, 8);
  p.line(0, 89, LX, 74, 14);
  p.vline(12, 6, 78, 8);
  p.vline(LX, 10, SEAM, 8);
  // walnut paneling under the windows
  p.rect(LX, 74, RX - LX, SEAM - 74, 6);
  p.hline(LX, RX, 74, 14);
  p.hline(LX, RX, 75, 8);
  for (let x = LX + 14; x < RX; x += 28) p.vline(x, 76, SEAM - 3, dith(6, 0, 8));
  p.rect(LX, SEAM - 3, RX - LX, 3, 8);
  p.hline(LX, RX, SEAM - 3, 14);
  // right section of the back wall: photo, poster, bookshelf
  p.rect(LX + 174, 10, RX - LX - 174, 64, 7);
  // framed photo: MONOLITH SYSTEMS, 1987
  p.rect(206, 24, 24, 20, 14);
  p.rect(208, 26, 20, 13, 7);
  p.rect(208, 32, 20, 7, 8);
  p.rect(214, 28, 9, 9, dith(15, 7, 6)); // the Monolith, in sepia-ish
  p.rect(215, 30, 7, 2, 1);
  p.plot(216, 33, 10);
  p.plot(219, 33, 12);
  // young Phil (tie, hair) and young Denis (ponytail)
  p.rect(210, 31, 3, 3, 16);
  p.rect(210, 29, 3, 2, 6);
  p.rect(210, 34, 3, 5, 1);
  p.plot(211, 34, 4);
  p.rect(224, 31, 3, 3, 16);
  p.rect(224, 29, 3, 2, 6);
  p.plot(227, 30, 6);
  p.rect(224, 34, 3, 5, 6);
  p.rect(208, 40, 20, 3, 15);
  p.micro(209, 40, '1987', 0);
  // SYNERGY poster
  p.rect(233, 16, 31, 40, 0);
  p.rect(235, 18, 27, 26, 1);
  p.gradV(235, 18, 27, 14, [1, 5, 13, 12, 14]);
  p.rect(235, 36, 27, 8, 1);
  p.hline(235, 261, 37, 9);
  // a rowing crew at sunrise
  p.hline(238, 258, 35, 0);
  for (let x = 240; x < 258; x += 4) {
    p.vline(x, 32, 34, 0);
    p.line(x, 35, x - 2, 38, 6);
  }
  p.micro(235, 47, 'SYNERGY', 15);
  // bookshelf
  const bx = 266,
    bw = 24;
  p.at(108, () => {
    p.rect(bx, 34, bw, 72, 6);
    p.frame(bx, 34, bw, 72, 0);
    const r = rng(5);
    for (let sh = 0; sh < 5; sh++) {
      const sy = 37 + sh * 14;
      p.rect(bx + 2, sy, bw - 4, 11, 0);
      let x = bx + 2;
      while (x < bx + bw - 3) {
        const w = 1 + Math.floor(r() * 3);
        const h = 7 + Math.floor(r() * 4);
        const c = [4, 1, 2, 14, 15, 5, 8, 12, 9][Math.floor(r() * 9)];
        if (sh === 2 && x > bx + 13) {
          // golf trophy on the middle shelf
          p.rect(bx + 15, sy + 8, 5, 3, 14);
          p.rect(bx + 16, sy + 4, 3, 4, 14);
          p.rect(bx + 15, sy + 2, 5, 2, 14);
          break;
        }
        p.rect(x, sy + 11 - h, w, h, c);
        x += w + (r() < 0.2 ? 1 : 0);
      }
      p.hline(bx + 1, bx + bw - 2, sy + 11, 14);
      p.hline(bx + 1, bx + bw - 2, sy + 12, 6);
    }
  });

  // right wall with the doorway back to the open office
  p.poly([RX, 10, 320, -6, 320, 134, RX, SEAM], 7);
  p.poly([RX, 74, 320, 89, 320, 134, RX, SEAM], 6);
  p.line(RX, 74, 320, 89, 14);
  p.line(RX, 75, 320, 90, 8);
  const dn = 317,
    df = 299;
  const dnb = rfloor(dn),
    dfb = rfloor(df);
  const dnt = dnb - 56,
    dft = dfb - 47;
  // frame
  quad(p, dn + 2, dnb, dnt - 3, df - 2, dft - 2, dfb, 8);
  // the open office beyond: gray wall, blue wainscot, dark carpet
  quad(p, dn, dnb, dnt, df, dft, dfb, 7);
  quad(p, dn, dnb, dnb - 22, df, dfb - 19, dfb, 1);
  quad(p, dn, dnb, dnb - 9, df, dfb - 7, dfb, 8);
  p.line(df, dfb - 19, dn, dnb - 22, 9);
  // the door leaf swung back against the wall
  quad(p, df - 1, dfb, dft, df - 6, dft - 3, dfb - 4, 6);
  p.line(df - 1, dft, df - 1, dfb, 14);
  p.vline(RX, 10, SEAM, 8);

  // ---------------------------------------------------------------- rug & green
  // executive rug under the desk
  p.poly([60, 124, 252, 124, 272, 172, 40, 172], 4);
  for (let i = 0; i < 6; i++) {
    const cx = 88 + i * 28;
    p.poly([cx, 141, cx + 4, 146, cx, 151, cx - 4, 146], 12);
  }
  p.lines([60, 124, 252, 124, 272, 172, 40, 172, 60, 124], 14);
  p.lines([66, 128, 246, 128, 263, 168, 49, 168, 66, 128], 14);

  // putting green, front right
  p.poly([180, 160, 292, 160, 306, 186, 172, 186], 10);
  p.poly([183, 162, 290, 162, 302, 184, 176, 184], 2);
  p.poly([183, 162, 290, 162, 291, 164, 182, 164], dith(2, 10, 6));
  p.ellipse(276, 172, 4, 1, 0);
  p.vline(278, 150, 172, 15);
  p.poly([279, 150, 286, 152, 279, 155], 12);
  p.ellipse(222, 176, 1, 1, 15);
  p.plot(222, 175, 15);
  p.ellipse(222, 178, 2, 0, dith(2, 0, 8));
  // a "ball return" tee mat
  p.rect(186, 175, 8, 4, 8);

  // credenza under the windows: golf trophies & a TV
  p.at(110, () => {
    p.rect(40, 92, 150, 16, 6);
    p.rect(40, 91, 150, 2, 14);
    p.hline(40, 189, 107, 0);
    for (let x = 52; x < 190; x += 34) {
      p.frame(x - 8, 96, 26, 9, 0);
      p.rect(x + 4, 99, 2, 2, 14);
    }
    // little golf trophies
    for (const tx of [48, 60, 170]) {
      p.rect(tx, 87, 5, 4, 14);
      p.rect(tx + 1, 84, 3, 3, 14);
      p.plot(tx + 2, 83, 15);
    }
    // a tiny plant
    p.rect(150, 86, 6, 5, 4);
    p.line(153, 86, 149, 80, 2);
    p.line(153, 86, 157, 79, 10);
    p.line(153, 86, 153, 78, 2);
  });

  // ---------------------------------------------------------------- the executive desk and chair
  // leather chair behind the desk
  p.at(138, () => {
    p.rect(145, 104, 20, 24, 0);
    p.rect(147, 102, 16, 2, 0);
    p.rect(147, 105, 16, 21, dith(0, 8, 2));
    p.hline(148, 161, 102, 8);
    p.vline(155, 106, 125, 0);
    p.rect(143, 116, 3, 12, 0);
    p.rect(164, 116, 3, 12, 0);
  });
  const top = frontDesk(p, 100, 152, 108, { h: 19, depth: 9, top: 6, body: 6, trim: 14 });
  p.at(152, () => {
    // banker's lamp
    p.rect(110, top - 1, 9, 2, 14);
    p.vline(114, top - 7, top - 1, 14);
    p.poly([108, top - 7, 120, top - 7, 118, top - 11, 110, top - 11], 2);
    p.hline(109, 119, top - 7, 10);
    // nameplate
    p.rect(132, top + 4, 26, 5, 0);
    p.micro(134, top + 4, 'PHIL', 14);
    p.plot(151, top + 6, 14);
    p.plot(153, top + 6, 14);
    // phone base (handset is with Phil)
    p.rect(124, top, 8, 4, 0);
    p.hline(125, 130, top, 8);
    // papers and the RULES binder
    p.rect(162, top + 1, 11, 3, 15);
    p.rect(164, top - 1, 11, 2, 7);
    p.rect(140, top - 2, 12, 4, 1);
    p.vline(141, top - 2, top + 1, 15);
    // the swear jar
    p.rect(188, top - 9, 9, 11, dith(11, 15, 4));
    p.frame(188, top - 9, 9, 11, 3);
    p.rect(189, top - 7, 7, 8, 10);
    p.speckle(189, top - 7, 7, 8, 2, 0.4, 3);
    p.rect(189, top - 11, 7, 2, 8);
    p.rect(189, top - 4, 7, 3, 15);
    p.micro(189, top - 4, '$', 0);
    p.plot(194, top - 3, 0);
  });
  // putter leaning against the desk's right end
  p.at(153, () => {
    p.line(210, 132, 214, 151, 7);
    p.rect(213, 150, 5, 2, 8);
    p.rect(209, 131, 2, 3, 0);
  });
  // shadows
  shadow(p, 154, 153, 56, 1);
  void keycardGiven;
}

// ---------------------------------------------------------------- Phil

function philPace(g: Game, a: Actor) {
  a.data.wait = 90;
  a.behavior = (act) => {
    if (act.data.busy || act.moving || g.busy) return;
    if (act.data.wait > 0) {
      act.data.wait--;
      return;
    }
    const goRight = act.x < (PACE[0] + PACE[1]) / 2;
    act.setPath([{ x: goRight ? PACE[1] : PACE[0], y: PACE_Y }]);
    act.data.wait = 70 + Math.floor(Math.random() * 120);
  };
}

/** Stop Phil's pacing; if he's hidden behind his big chair, have him step clear first. */
async function philHold(g: Game, a: Actor | undefined) {
  if (!a) return;
  a.data.busy = true;
  a.stop();
  if (a.x > 128 && a.x < 182) await g.walk(a, a.x < 155 ? 126 : 186, PACE_Y, { direct: true });
}

async function philTalk(g: Game, lines: [string, string][]) {
  const a = g.actor('phil');
  await philHold(g, a);
  const gap = 22;
  const x = a ? (g.player.x < a.x ? a.x - gap : a.x + gap) : 160;
  const tx = Math.max(40, Math.min(250, x));
  await g.approach([tx, PACE_Y + 2]);
  if (a) {
    a.faceToward(g.player.x, g.player.y);
    g.player.faceToward(a.x, a.y);
  }
  await convo(g, lines);
  if (a) {
    a.data.busy = false;
    a.data.wait = 120;
  }
}

/** Phil intervenes from wherever he is pacing. */
async function philStops(g: Game, text: string) {
  const a = g.actor('phil');
  if (a) {
    a.data.busy = true;
    a.stop();
    a.faceToward(g.player.x, g.player.y);
  }
  await g.talk('phil', text);
  if (a) {
    a.data.busy = false;
    a.data.wait = 60;
  }
}

const PHIL_AFTER = [
  "(into the phone) Mr. Henderson, my best engineer is on it. Personally. Right now. (to you) Why are you still here? Go! Go!",
  "Say hi to Denis for me. We go back a long way. He still hasn't forgiven me for the Great Cable Purge of '96.",
  "(into the phone) No, the demo is absolutely still on. Monday at nine. Our systems are... resting. Recharging. Like a power nap.",
  "If you see the Monolith, tell it... no. Don't tell it anything. Just fix it.",
];
const PHIL_BEFORE = [
  "Report first, Dominic. Paperwork is what separates us from the animals. The on-call SRE files those. That's Fahim, in the NOC.",
  "(into the phone) Yes, Mr. Henderson, everything is fine. It's a... planned... feature. A resilience feature. (covering the phone) Incident report. Please.",
  "I'd love to bend the rules, Dominic, but I wrote them. In pen. Laminated. Section four: 'The basement requires an incident report.' Section five: 'See section four.'",
];

const PHIL_TOPICS: Topics = [
  [/denis|dennis|greybeard|graybeard|sysadmin/, "Denis and I started this company in a garage in 1987. He wrote every line of the Monolith. I wrote the business plan on a napkin. His part turned out to be harder. He's lived down in that basement since '99. I keep telling him to take a vacation. He keeps telling me the Monolith would get lonely."],
  [/photo|picture|1987|garage|founding|history/, "Day one. Denis and me, and the Monolith, the day we turned her on. We said we'd fix the date handling 'before it matters.' I'm sure we did. Didn't we?"],
  [/aidan|intern|runbook/, "Poor kid. Don't tell him I said this, but he followed the runbook perfectly. I wrote that runbook. In 1999. Maybe I should update the runbook."],
  [/fahim|sre|on ?call|noc/, "Fahim is the best SRE I've ever had. He writes beautiful incident reports. I have them framed. Well. Laminated. He's in the NOC, if he's conscious."],
  [/krishna|lab|helmet|ndi/, "Krishna's building a helmet that lets you debug from the inside. Legal says it's fine as long as nobody uses it. So please don't tell Legal."],
  [/adriana|architect/, "Adriana went down to the basement to look into a date bug hours ago. I'm sure she's fine. She's the smartest person in the building. Present company... included, mostly."],
  [/mike|sales|quantum/, "Mike sold Quantum Sync to the investors. I don't know what Quantum Sync is. Neither does Mike. It's on the roadmap now."],
  [/nicholas|nick|div|website/, "Nicholas? Lovely kid. Has he centered that thing yet? The... the box? He's been at it since Tuesday."],
  [/golf|putt|green|putter|ball|club|trophies|trophy/, 'Golf teaches patience, Dominic. Patience, focus, and how to lose gracefully. Mostly the last one.'],
  [/monolith|mainframe/, "The Monolith has run this company since 1987. Payroll, billing, the doors, the elevators, the coffee machine, the parking gate. Every time someone suggested replacing it, the estimate came back bigger than the company. So we... didn't."],
  [/report|incident|paperwork|form|sev/, (g) =>
    g.flag('phil_gave_keycard')
      ? "Fahim's report is going in the binder. Volume twelve. Right next to his other beautiful reports."
      : g.has('report')
        ? "Is that it? Is that the report? Well, don't just stand there waving it around, Dominic. SHOW it to me."
        : "An incident report, filed and signed by the on-call SRE. That's Fahim, in the NOC. He writes beautiful reports. When he's awake."],
  [/key ?card|master key|keys?$|card|access|clearance|stair|basement|lockdown|door|elevator|permission|authori/, (g) =>
    g.flag('phil_gave_keycard')
      ? "The keycard opens everything: the stairwell, the basement, every door in the building. And the executive bathroom. Please. Not the executive bathroom."
      : "My master keycard opens the stairwell and every other door in the building. It's yours the moment I see an incident report from the on-call SRE. Rules are rules. I laminated them."],
  [/investor|henderson|demo|monday|call|phone|money|funding/, "(covering the phone) Mr. Henderson. Lead investor. He arrives Monday at nine with four colleagues and a very large checkbook. The demo has to work, Dominic. It HAS to."],
  [/coffee|teapot|smartbrew/, "The coffee machine is on the Monolith too? Of course it is. I signed that contract myself. The SmartBrew salesman was very persuasive."],
  [/rules|binder|rule book|policy|process|section/, "Volume twelve. I'm drafting volume thirteen: 'Rules About Rules.' It's going to be my best work."],
  [/swear|jar|curse/, 'A dollar a swear. Tonight alone I have funded Q3 bowling and most of Q4.'],
  [/bathroom|toilet|restroom|washroom/, "The executive bathroom is for executives. It has a heated seat. Let's not talk about the executive bathroom."],
  [/synergy|poster/, 'Synergy, Dominic. It means we all work together. Tonight it mostly means you work and I hold the phone.'],
  [/outage|production|prod|down|panic|crash/, "(into the phone) Yes, Mr. Henderson, everything is fine. It's a... planned... feature. (covering the phone) It is not fine, Dominic. Fix it."],
];

function cycle(g: Game, key: string, list: string[]): string {
  const i = (g.flag(key) ?? 0) % list.length;
  g.inc(key);
  return list[i];
}

export const phil: RoomDef = {
  id: 'phil',
  title: "Phil's Office",
  act: 1,
  music: 'office',
  start: [270, 160, 'left'],
  draw: paint,
  walk: [[0, 137, LX, SEAM + 8, RX, SEAM + 8, 320, 137, 320, 189, 0, 189]],
  blocks: [
    [98, 128, 112, 25], // desk + chair
    [36, 104, 156, 8], // credenza
    [262, 104, 30, 6], // bookshelf
    [206, 140, 12, 13], // putter
  ],
  look: "Phil's corner office. Floor-to-ceiling windows full of sunset wrap around two walls, behind an executive desk the size of a small aircraft carrier. There's a bookshelf, a putting green, a SYNERGY poster, and a swear jar that is clearly doing a lot of business today.\n\nPhil is pacing by the window, phone glued to his ear.",
  hotspots: [
    {
      id: 'window',
      nouns: ['window', 'windows', 'skyline', 'city', 'sunset', 'view', 'corner windows'],
      area: [0, 0, 200, 74],
      at: [120, 116],
      look: "Two walls of glass, and the whole city on fire with sunset. It's the kind of view you get after thirty years of very long meetings. Somewhere down there, investors are booking flights for Monday.",
    },
    {
      id: 'photo',
      nouns: ['photo', 'photograph', 'picture', 'framed photo', 'frame', '1987'],
      area: [204, 22, 28, 24],
      at: [218, 116],
      look: 'A framed photo: "MONOLITH SYSTEMS, 1987." Two young men grinning in front of a beige mainframe the size of a minivan. One has a full head of hair and a truly unforgivable tie: Phil. The other has a ponytail, a pager on each hip, and a cable draped over his shoulder like a scarf: Denis.',
    },
    {
      id: 'poster',
      nouns: ['poster', 'synergy', 'synergy poster', 'motivational poster', 'rowers', 'rowing'],
      area: [232, 15, 33, 42],
      at: [248, 116],
      look: 'A motivational poster: a rowing crew at sunrise, oars in perfect unison, above the word SYNERGY. In small print: "Together, we can do the work of one."',
    },
    {
      id: 'bookshelf',
      nouns: ['bookshelf', 'shelf', 'shelves', 'books', 'book', 'bookcase', 'golf trophy'],
      area: [264, 32, 28, 76],
      at: [272, 116],
      look: 'Phil\'s bookshelf: "Leading Through Process," "Process: The Process," "Who Moved My Mainframe?", "Golf Is Not A Metaphor (But It Is)," and a pristine copy of "The Mythical Man-Month" with the spine uncracked. On the middle shelf, a golf trophy has pride of place.',
    },
    {
      id: 'desk',
      nouns: ['desk', 'executive desk', 'big desk', 'nameplate', 'papers', 'binder', 'rules', 'rule book'],
      area: [98, 120, 112, 33],
      at: [154, 158],
      look: 'An executive desk the size of a small aircraft carrier, polished to a mirror shine. On it: a green banker\'s lamp, a phone base with no handset, a binder labeled RULES (VOL. 12), a nameplate reading PHIL, and a swear jar.',
    },
    {
      id: 'swearjar',
      nouns: ['swear jar', 'jar', 'money', 'cash', 'dollars', 'bills'],
      area: [186, 108, 13, 15],
      at: [196, 158],
      look: "A big glass jar labeled SWEAR JAR, stuffed with dollar bills. Phil fines himself a dollar per swear. The jar is full; it's been a long quarter. Tonight alone looks like about forty dollars.",
    },
    {
      id: 'lamp',
      nouns: ['lamp', 'bankers lamp', 'green lamp', 'desk lamp'],
      area: [107, 112, 14, 11],
      at: [112, 158],
      look: "A green banker's lamp. Phil got it because it looked 'like a CEO lamp.' It doesn't work during the power outage, which makes it exactly as useful as most CEO accessories.",
    },
    {
      id: 'chair',
      nouns: ['chair', 'executive chair', 'leather chair', 'phils chair'],
      area: [143, 101, 24, 24],
      at: [154, 158],
      look: 'A towering black leather executive chair. It reclines, massages, and, according to Phil, "inspires decisive thinking." It has a cup holder.',
    },
    {
      id: 'green',
      nouns: ['putting green', 'green', 'golf', 'hole', 'flag', 'turf'],
      area: [172, 148, 136, 40],
      at: [230, 170],
      look: 'An indoor putting green, complete with a hole, a little red flag, and a single golf ball. Phil says he does his best thinking here. Nobody has ever seen him sink a putt.',
    },
    {
      id: 'ball',
      nouns: ['ball', 'golf ball', 'golfball'],
      area: [219, 173, 6, 5],
      at: [230, 178],
      look: 'A golf ball, monogrammed "P." It has the haunted look of a ball that has missed a lot of putts.',
    },
    {
      id: 'putter',
      nouns: ['putter', 'golf club', 'club', 'iron'],
      area: [207, 128, 12, 25],
      at: [222, 158],
      look: 'A gleaming putter, leaning against the desk. It has its own little leather cover with "PHIL" embroidered on it. This is clearly the most loved object in the room.',
    },
    {
      id: 'credenza',
      nouns: ['credenza', 'cabinet', 'trophies', 'golf trophies', 'cabinets', 'trophy', 'tv', 'credenza drawers', 'credenza drawer', 'sideboard'],
      area: [38, 80, 154, 28],
      at: [110, 116],
      look: 'A walnut credenza crowded with little golf trophies. CLUB CHAMPION 2003. MOST IMPROVED 2004. HONORABLE MENTION 2005. PARTICIPANT 2006 through 2025.',
    },
    {
      id: 'philplant',
      nouns: ['plant', 'potted plant', 'little plant', 'red pot', 'flower', 'flowers'],
      area: [146, 77, 13, 15],
      at: [150, 116],
      look: "A small potted plant on the credenza, the only living thing in this office Phil hasn't scheduled a meeting with. It looks well-watered. Phil probably has a rule about it.",
    },
    {
      id: 'rug',
      nouns: ['rug', 'red rug', 'persian rug'],
      area: [40, 153, 230, 19],
      at: [150, 165],
      look: "An expensive red rug. It really ties the room together. Phil's words, not yours.",
    },
    {
      id: 'door',
      nouns: ['doorway', 'door', 'office door', 'open office'],
      area: [296, 60, 22, 70],
      at: [300, 136],
      look: 'The door back out to the open office.',
    },
  ],
  exits: [
    { area: [315, 120, 5, 70], to: 'office', at: [18, 150, 'right'], dir: 'east' },
    { area: [296, 116, 22, 12], to: 'office', at: [18, 150, 'right'] },
  ],
  enter(g) {
    const a = addNpc(g, 'phil', g.flag('phil_gave_keycard') ? 120 : 200, PACE_Y, 'left');
    a.data.gap = 22;
    philPace(g, a);
  },
  front(g, s) {
    // Phil's cordless handset, pressed to his ear
    const a = g.actor('phil');
    if (!a || !a.visible) return;
    const x = Math.round(a.x),
      y = Math.round(a.y);
    if (a.dir === 'left') {
      s.rect(x - 2, y - 33, 2, 4, 0);
      s.plot(x - 3, y - 30, 0);
    } else if (a.dir === 'right') {
      s.rect(x + 2, y - 33, 2, 4, 0);
      s.plot(x + 4, y - 30, 0);
    } else if (a.dir === 'down') {
      s.rect(x + 4, y - 33, 2, 5, 0);
    } else s.rect(x - 5, y - 33, 2, 4, 0);
  },
  overlay(g, s, t) {
    // aviation lights blinking on the skyscrapers
    if (Math.floor(t / 45) % 2 === 0) {
      s.plot(83, 30, 12);
      s.plot(161, 26, 12);
    } else s.plot(20, 30, 12);
    // a plane crossing the sunset, very slowly
    const px = 300 - ((t / 6) % 360);
    if (px > LX + 6 && px < LX + 168) {
      s.hline(Math.round(px), Math.round(px) + 2, 22, 0);
      if (Math.floor(t / 20) % 2) s.plot(Math.round(px) - 1, 22, 12);
    }
    // the golf ball occasionally wobbles toward the hole and gives up
    void g;
  },
  raw: async (g, text) => {
    if (await act1Raw(g, text)) return true;
    if (/^\s*(putt|golf|swing|chip|tee off)\b/i.test(text)) {
      await g.approach('putter');
      await philStops(g, 'Not the putter.');
      return true;
    }
    return false;
  },
  nouns: {
    ...BASE_NOUNS,
    ...itemNouns(['report', 'keycard', 'candy', 'coffee', 'duck', 'badge', 'mug']),
    plane: ['plane', 'airplane', 'jet', 'aircraft'],
    drawer: ['drawer', 'drawers', 'desk drawer', 'desk drawers'],
    phil: ['phil', 'guy', 'man', 'person', 'someone', 'somebody', 'ceo', 'boss', 'bald guy', 'the boss'],
    handset: ['handset', 'cordless', 'cordless phone', 'phils phone', 'phone base', 'desk phone', 'receiver'],
    bathroom: ['bathroom', 'executive bathroom', 'restroom', 'toilet', 'washroom', 'bathroom door'],
  },
  verbs: {
    'look phil': async (g) =>
      g.say(
        `Phil, CEO and founder of Monolith Systems. Navy blazer, glasses, a shining dome with a gray fringe, and the posture of a man who has been on the phone with investors for two hours. ${
          g.flag('phil_gave_keycard') ? 'He looks a little lighter now that someone else is holding the keycard.' : 'He keeps glancing at the golf putter like it might offer some advice.'
        }`,
      ),
    'talk phil,ask phil ?,tell phil ?,say phil,hello phil,help phil': async (g, c) => {
      const topic = topicOf(c);
      const line = topicLine(g, topic, PHIL_TOPICS);
      if (line) return void (await philTalk(g, [['phil', line]]));
      if (g.flag('phil_gave_keycard')) return void (await philTalk(g, [['phil', cycle(g, 'phil_after_i', PHIL_AFTER)]]));
      if (!g.flag('phil_talked')) {
        g.set('phil_talked');
        await philTalk(g, [
          ['phil', "(into the phone) Yes, Mr. Henderson, everything is fine. It's a... planned... feature. Hold one moment, please. (covering the phone) Dominic! Thank goodness."],
          ['me', 'Phil, I need to get into the basement. Somebody has to look at the Monolith in person.'],
          ['phil', "Absolutely. Whatever you need, the answer is yes. As long as you have an incident report."],
          ['me', "Phil. Production is down. The doors are locked. The coffee machine thinks it's a teapot."],
          ['phil', "And that is EXACTLY the kind of thing that belongs in an incident report. Basement access during a lockdown requires a filed report from the on-call SRE. Rules are rules, Dominic. I should know. I wrote them."],
          ['phil', "Bring me an incident report and I'll give you my master keycard. It opens every door in the building. (into the phone) Sorry, Mr. Henderson. Where were we? Right. Synergy."],
        ]);
        return;
      }
      if (topic && c.verb === 'ask') return void (await philTalk(g, [['phil', "(covering the phone) I'm afraid I don't know a thing about that, Dominic. Ask me about golf. Or rules. Mostly rules."]]));
      await philTalk(g, [['phil', cycle(g, 'phil_before_i', PHIL_BEFORE)]]);
    },
    'give|show report phil,put report desk,give|show report desk': async (g) => {
      if (!g.has('report')) return false;
      await philTalk(g, [
        ['me', "Here's your incident report. Signed by the on-call SRE."],
        ['phil', '(into the phone) Mr. Henderson, I\'m going to have to call you back. Something is... being processed.'],
      ]);
      const a = g.actor('phil');
      if (a) a.data.busy = true;
      g.removeItem('report');
      await g.say('Phil takes the report and reads it. His lips move slightly at "SEV-1." At "All services down," he goes pale. At "Remote access: impossible," he sits down on the edge of the credenza.');
      await convo(g, [
        ['phil', "Well. That's... comprehensive. Fahim always did write a beautiful report."],
        ['phil', 'Okay. Okay. Here. My master keycard. It opens the stairwell, the basement, every door in the building.'],
        ['phil', "It also opens the executive bathroom. Please don't use the executive bathroom."],
      ]);
      g.set('phil_gave_keycard');
      award(g, 'show_report_phil');
      g.addItem('keycard');
      await g.pose(null, 'reach', 400);
      await convo(g, [['phil', "Go save the company, Dominic. And if you see Denis down there... tell him I said the photo still hangs in my office."]]);
      if (a) {
        a.data.busy = false;
        a.data.wait = 120;
      }
    },
    'give|show * phil': async (g, c) => {
      if (!c.noun || !g.has(c.noun)) return false;
      const lines: Record<string, string> = {
        keycard: "No, no, you keep that. I trust you. Mostly. Just stay out of the executive bathroom.",
        candy: "A BREAK! bar? Dominic, I haven't had a break since 1987. Keep it. Somebody needs one more than me.",
        coffee: "Is that coffee? Real coffee? No. No, you need that more than I do. Or someone does. Fahim, probably.",
        duck: '...A rubber duck. Is this a "you should talk to the duck instead of me" thing? Because I respect that.',
        keyboard: "That's very bright. Is it supposed to be that bright? Is that billable?",
        badge: "Yes, yes, I know who you are, Dominic. You've worked here eleven years.",
        mug: "WORLD'S OKAYEST PROGRAMMER. Ha! Accurate, but we both know you're better than okay. Now go.",
      };
      await philStops(g, lines[c.noun] ?? "That's not an incident report, Dominic. I can tell. Incident reports have a coffee ring on them.");
    },
    // ---------------- golf
    'take putter,use putter,play golf,play green,play,hit ball,putt,putt ball,use putter ball,take|remove putter cover': async (g, c) => {
      if (c.verb === 'play' && c.noun && !['golf', 'green', 'ball', 'putter'].includes(c.noun)) return false;
      await g.approach('putter');
      await g.pose(null, 'reach', 250);
      await philStops(g, 'Not the putter.');
    },
    'take ball,kick|touch|push ball': async (g) => {
      await g.approach('ball');
      await philStops(g, "Not the ball either. That's my lucky ball. It's never gone in, but it's lucky.");
    },
    'take green,take|look/under rug,take rug,lift rug': async (g, c) => {
      if (c.noun === 'rug') return void (await g.say('You peek under the rug. Nothing but more polished floor and a very old golf tee.'));
      await g.say("It's glued to the floor. Phil had it installed by a professional greenskeeper.");
    },
    // ---------------- swear jar
    'take swearjar,take money,steal money,search swearjar,open swearjar,use swearjar,put * swearjar': async (g, c) => {
      if (c.verb === 'put' && c.noun) return void (await g.say("You don't have any dollar bills to spare, and you haven't sworn. Out loud, anyway."));
      await g.approach('swearjar');
      await g.pose(null, 'reach', 300);
      await philStops(g, "Ah-ah-ah! That's the team-building fund. Q3 bowling night is entirely financed by my vocabulary.");
    },
    curse: async (g) => {
      if (!g.actor('phil')) return false;
      await philStops(g, "Language, Dominic! (he pulls out his wallet and stuffs a dollar into the jar on your behalf) I'll put it on your tab.");
    },
    'read desk,read rules,look rules,open rules,read binder': 'The binder is labeled RULES (VOL. 12). You flip to a random page: "Section 4.2: Basement access during a lockdown requires an incident report filed by the on-call SRE. Section 4.3: See section 4.2." Phil is nothing if not consistent.',
    'look/under desk,search desk,open desk': async (g) => {
      await g.approach('desk');
      await philStops(g, "Please don't rummage in my desk. There's nothing exciting in there anyway. Golf tees, antacids, and the business plan for this company, written on a napkin.");
    },
    'open|search credenza,look/in credenza': async (g) => {
      await g.approach('credenza');
      await g.say('You peek inside the credenza: four hundred golf balls, a framed scorecard from 2003, and a box of BREAK! bars labeled EMERGENCY. It is empty. Phil had an emergency.');
    },
    'take credenza': async (g) => {
      await g.approach('credenza');
      await philStops(g, "Those trophies are sentimental, Dominic. 'Participant, 2014.' Do you know how hard I worked to participate in 2014?");
    },
    'look light': "The overhead lights are out, like everywhere else in the building. Phil's office doesn't need them: the sunset is doing all the work, and the work is magnificent.",
    'look plane': 'A tiny plane crawls across the sunset. Somebody is leaving town for the weekend. Lucky them.',
    'read photo': async (g) => g.say('A brass plate under the photo reads: "MONOLITH SYSTEMS, 1987. Day one. We\'ll fix the dates later. -D"'),
    'take photo': async (g) => {
      await g.approach('photo');
      await philStops(g, "Please leave that where it is. That's Denis and me, the day we turned the Monolith on. Best day of my career. Also the last day I had hair.");
    },
    'take poster': "It's screwed to the wall. Synergy is permanent.",
    'read poster': 'SYNERGY. "Together, we can do the work of one."',
    'take|read book,read bookshelf,take bookshelf,search bookshelf': async (g) => {
      await g.approach('bookshelf');
      await g.say('You pull out "Who Moved My Mainframe?" and flip through it. Chapter one is just the sentence "Nobody. Nobody moves the mainframe." You put it back.');
    },
    'sit chair,sit,sit desk': async (g) => {
      await g.say("You lower yourself into Phil's leather chair. It's like being hugged by a very expensive cow.");
      await philStops(g, "Comfortable, isn't it? Don't get used to it. That chair is earned, Dominic. Over decades. Of meetings.");
      await g.say('You get back up. There is a production outage to fix, and the chair was starting to whisper about stock options.');
    },
    'open desk,search desk,look/in desk,open drawer,search drawer': async (g) => {
      await g.approach('desk');
      await philStops(g, "My desk drawers are for CEO eyes only. There's nothing exciting in there, anyway. Golf tees and antacids.");
    },
    'turnon|turnoff|use lamp': 'You click the lamp. Nothing. The building is on emergency power, and banker\'s lamps are apparently not an emergency.',
    'take lamp,take desk,take chair,take bookshelf': "It's executive furniture. It was built to stay exactly where it is, forever, like Phil's quarterly targets.",
    'take|use desk phone,call ?': async (g, c) => {
      if (c.verb === 'call' && c.noun) return false;
      await philStops(g, "I've got the handset, Dominic. I've had it for two hours. Mr. Henderson is very... thorough.");
    },
    'look bathroom,go|enter|use|open bathroom': async (g) => {
      await philStops(g, g.has('keycard') ? "Dominic. I saw you look at that door. Please don't use the executive bathroom. It has a heated seat and I would like it to stay MY heated seat." : "That's the executive bathroom. It's for executives. You'd need a master keycard. Which you don't have. Which is the point.");
    },
    'look/through window': 'The sun is going down behind the city. The view from up here is incredible. So is the outage.',
    'open|close window,break window': "These windows don't open. Phil had them sealed after a regrettable incident involving a golf ball and the parking lot.",
    'attack phil,kick phil,push phil': "You consider it, briefly, the way every employee has considered it at least once. Then you remember he's a nice guy having a terrible day. Like you.",
    'hug phil,comfort phil': async (g) => {
      await philStops(g, "(muffled) Oh. Oh, thank you, Dominic. I needed that. Now please go fix my company.");
    },
    'look keycard': async (g) => {
      if (g.has('keycard')) return false;
      await g.say("Phil's master keycard is clipped to his belt, swinging gently as he paces. It opens every door in the building. He'll hand it over for an incident report, and not one second before.");
    },
    'take|steal|use keycard,ask phil keycard': async (g) => {
      if (g.has('keycard')) return false;
      await philStops(g, g.has('report') ? "Report first, keycard second. That's the process. SHOW me the report, Dominic." : "The keycard stays on my belt until I see an incident report from the on-call SRE, Dominic. That's Fahim. In the NOC.");
    },
    'look phone,look handset': async (g) => {
      await g.say(`Phil's cordless handset is clamped to his ear${g.flag('phil_gave_keycard') ? ', still' : ''}. On the other end: Mr. Henderson, the lead investor, and a great deal of synergy. Your own phone, meanwhile, is still at 0%.`);
    },
    'take|use handset': async (g) => {
      await philStops(g, "I've got the handset, Dominic. I've had it for two hours. Mr. Henderson is very... thorough.");
    },
    'take|water|touch philplant': 'You leave the plant alone. It is thriving in here, which makes one of you.',
    'look denis': async (g) => g.say('Denis is down in the basement. Up here, there is only young Denis, in the photo on the wall: ponytail, a pager on each hip, and a cable draped over his shoulder like a scarf, grinning in front of the Monolith in 1987.'),
    'jump window,climb window': "The windows are sealed. Phil had them sealed after a regrettable incident involving a golf ball and the parking lot. Also: no. Absolutely not.",
    'read *': readAsLook,
  },
};
