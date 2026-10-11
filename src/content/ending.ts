// The ending. Called by the server room right after the successful DEPLOY at
// 12:00 AM Saturday:
//   1. the NOC: the big board turns green, panel by panel
//   2. Saturday dawn over HQ
//   3. Monday 9:00 AM: the investor demo in the conference room
//   4. curtain call: an epilogue card for every character
//   5. the credits roll, final score and rank -> title screen
import type { Game } from '../engine/game';
import type { Actor } from '../engine/actor';
import type { Modal, KeyIn } from '../engine/ui';
import { Surface, rng } from '../engine/raster';
import { NAMES } from '../art/cast';
import { addNpc } from './helpers';
import { bigText } from './title';
import { NOC, DEPLOY_TICKS } from '../rooms/cutscene/noc_green';
import { CONF, SEATS, SEAT_Y } from '../rooms/cutscene/conference';
import { EPI, STAGE_X, STAGE_Y } from '../rooms/cutscene/epilogue';

/** Message boxes in the ending sit low on the screen, below the action... */
const LOW = 172;
/** ...except in the NOC, where they cover the console strip instead of the crowd. */
const NOC_Y = 104;
let boxY = LOW;

/** A line of dialogue. Seated speakers facing us get a talking animation too. */
async function line(g: Game, who: string, text: string) {
  const a: Actor | undefined = who === 'dominic' ? g.player : g.actor(who);
  const prev = a?.pose ?? null;
  if (a && prev === 'sit' && a.dir === 'down') a.pose = 'sittalk';
  try {
    await g.talk(a ?? who, text, { y: boxY });
  } finally {
    if (a && prev === 'sit') a.pose = prev;
  }
}

const narrate = (g: Game, text: string, title?: string) => g.say(text, { y: boxY, title });

function pose(g: Game, ids: string[], p: string | null, dir?: 'up' | 'down' | 'left' | 'right') {
  for (const id of ids) {
    const a = id === 'dominic' ? g.player : g.actor(id);
    if (!a) continue;
    a.pose = p;
    if (dir) a.dir = dir;
  }
}

// ================================================================ 1. the NOC
async function nocScene(g: Game) {
  NOC.phase = 'red';
  NOC.flips = 0;
  NOC.t0 = g.t;
  boxY = NOC_Y;
  g.goto('noc_green');
  g.music('deploy');
  await g.wait(1000);
  await narrate(g, 'Three floors up, everyone who spent the night locked in the building has crowded into the NOC to watch the big board.', 'Saturday, 12:00:01 AM');
  await line(g, 'fahim', 'Deploy is rolling out. Commit... review... tests... come on, come on...');
  NOC.phase = 'deploy';
  NOC.t0 = g.t;
  // let the progress bar fill (DEPLOY_TICKS at 60 ticks/s), keyboard clatter included
  for (let k = 0; k < 6; k++) {
    g.sfx('type');
    await g.wait((DEPLOY_TICKS * 1000) / 60 / 6);
  }
  await g.wait(300);
  g.music(null);
  await g.wait(700);
  // the board turns green, one panel at a time
  NOC.phase = 'green';
  for (let i = 1; i <= 8; i++) {
    NOC.flips = i;
    g.sfx('beep');
    await g.wait(230);
  }
  await g.wait(250);
  NOC.flips = 9;
  NOC.t0 = g.t;
  g.sfx('fanfare');
  g.flash(10, 120);
  await g.wait(500);
  g.music('ending');
  const fahim = g.actor('fahim');
  if (fahim) fahim.place(160, 158, 'down');
  pose(g, ['fahim', 'phil', 'mike', 'nicholas', 'krishna', 'aidan'], 'cheer', 'down');
  await g.wait(1400);
  await line(g, 'phil', "It's green. It's ALL green!");
  await line(g, 'fahim', 'Monolith core: up. Doors: unlocked. Elevators: running. Coffee machine: ...brewing. Actual coffee.');
  await line(g, 'krishna', 'And the helmet telemetry says Dominic and Adriana both logged out cleanly. The NDI works! Mostly!');
  await line(g, 'mike', "I'm calling the investors! ...At a reasonable hour. I'm calling the investors at a reasonable hour.");
  pose(g, ['aidan'], null);
  await line(g, 'aidan', "So I didn't break the company forever?");
  await line(g, 'fahim', 'Incident resolved. Somebody reset the counter.');
  await line(g, 'nicholas', "It's already at zero.");
  await line(g, 'fahim', "It's a NEW zero. Now everybody go home. The doors open now.");
  await g.wait(400);
}

// ================================================================ 2. dawn
async function dawnScene(g: Game) {
  boxY = LOW;
  g.set('ext_time', 'dawn');
  g.goto('exterior');
  g.music('title');
  await g.wait(1600);
  await narrate(g, 'The sun rises over Monolith Systems. The doors open. The elevators run. The coffee machine brews, and no longer insists that it is a teapot.', 'Saturday, 6:12 AM');
  await narrate(g, 'Dominic drives home, sleeps for fourteen hours, and dreams in COBOL.');
  await g.wait(500);
}

// ================================================================ 3. Monday
async function conferenceScene(g: Game) {
  CONF.slide = 'title';
  g.goto('conference');
  g.music('office');
  await g.wait(1200);
  await narrate(g, 'The fifth-floor conference room. The doors work. The coffee works. The investors have arrived, and so has everyone who spent Friday night locked in the building.', 'Monday, 9:00 AM');
  await line(g, 'phil', 'Mr. Henderson, Ms. Whitfield: welcome to Monolith Systems. You may have heard about a small... incident on Friday.');
  await line(g, 'henderson', 'We heard your building locked itself, and your coffee machine declared that it was a teapot.');
  await line(g, 'phil', 'A planned resilience exercise. Which we passed. Mike?');
  pose(g, ['mike'], 'cheer');
  await line(g, 'mike', "Thanks, Phil! Folks, I'm not going to show you slides. I'm going to show you production. LIVE.");
  pose(g, ['mike'], null);
  CONF.slide = 'live';
  g.sfx('beep');
  await line(g, 'whitfield', 'Live? On a Monday morning? That is either very confident or very foolish.');
  await line(g, 'mike', 'Dominic, would you do the honors?');
  // Dominic stands up and runs the demo
  g.player.pose = null;
  g.player.dir = 'down';
  await g.wait(300);
  await line(g, 'dominic', 'Sure. Running the full demo, end to end, on the Monolith.');
  g.player.dir = 'left';
  for (let k = 0; k < 5; k++) {
    g.sfx('type');
    await g.wait(130);
  }
  await g.wait(400);
  CONF.slide = 'go';
  CONF.t0 = g.t;
  g.sfx('fanfare');
  g.flash(10, 100);
  await g.wait(900);
  g.player.dir = 'down';
  await narrate(g, 'Every light on the screen turns green. Somewhere in the basement, a mainframe older than most of the people in this room purrs contentedly.');
  await line(g, 'whitfield', 'Four-millisecond response time. Impressive. What did you change?');
  await line(g, 'dominic', 'Two digits. Well, four. We taught it what year it is.');
  await line(g, 'adriana', 'We also gave the Monolith its very first unit test. It passed. Eventually.');
  await line(g, 'krishna', 'And not a single engineer was garbage collected!');
  await line(g, 'henderson', "...I'm sorry, what?");
  await line(g, 'krishna', 'Legacy term. Very technical. Nothing to worry about.');
  pose(g, ['mike'], 'cheer');
  await line(g, 'mike', "And that's just today! By Q4, the Monolith will be AI-powered, on the blockchain, and running in the cloud.");
  CONF.slide = 'roadmap';
  g.sfx('beep');
  await line(g, 'mike', 'In SPACE.');
  pose(g, ['mike'], null);
  await line(g, 'phil', 'Mike.');
  await line(g, 'mike', '...By Q5.');
  await line(g, 'fahim', 'I am not doing on-call for space.');
  CONF.slide = 'go';
  await line(g, 'henderson', "Phil, I've been in this business for forty years. That is the first live demo I have ever seen that didn't crash.");
  await line(g, 'whitfield', "We're in. Where do we sign?");
  await line(g, 'phil', 'Oh, we have forms. So many forms.');
  // celebration!
  CONF.slide = 'thanks';
  g.music('ending');
  g.sfx('points');
  pose(g, ['dominic', 'adriana', 'krishna', 'nicholas', 'fahim', 'mike', 'phil', 'aidan'], 'cheer', 'down');
  await g.wait(1500);
  await narrate(g, 'The room erupts. Nicholas high-fives Krishna. Mike high-fives everyone, twice. Denis permits himself one small, approving nod.');
  pose(g, ['adriana', 'krishna', 'nicholas', 'fahim'], 'sit', 'down');
  pose(g, ['dominic', 'mike', 'aidan'], null, 'down');
  pose(g, ['phil'], null, 'right');
  await g.wait(400);
  // Phil thanks Dominic
  await line(g, 'phil', 'Dominic. On Friday at five, this company was down, locked and decaffeinated. By midnight you had fixed all of it. Thank you.');
  await line(g, 'dominic', 'Technically it was 12:00 AM Saturday. Rule number one.');
  await line(g, 'phil', '...Of course. Rule number one.');
  // Aidan
  g.actor('aidan')!.dir = 'left';
  await line(g, 'aidan', "Um. Everyone? About Friday. I'm really, really sorry I pressed the big red button.");
  g.actor('denis')!.dir = 'right';
  await line(g, 'denis', 'Kid. That bug had been sitting in my date routine since 1987. I wrote it. Two digits for the year. All you did was wake it up.');
  await line(g, 'denis', "It wasn't your fault. It never was.");
  await line(g, 'adriana', 'Blameless postmortem, Aidan. And for the record, you found a thirty-nine-year-old bug on your very first deploy.');
  await line(g, 'phil', "Which is why we'd like to offer you a full-time position. You start next Monday. Not on a Friday.");
  pose(g, ['aidan'], 'cheer', 'down');
  await line(g, 'aidan', "REALLY?! I won't let you down! I'll never touch a big red button again!");
  pose(g, ['aidan'], null);
  await line(g, 'denis', "Touch all the buttons you like. Just read the runbook first. I'm rewriting it.");
  // Denis takes a vacation
  await line(g, 'denis', 'And Phil. While everyone is here: I am taking a vacation.');
  await line(g, 'phil', "Denis, you haven't taken a vacation since 1999.");
  await line(g, 'denis', 'Twenty-seven years of saved-up days. Somewhere with a beach and no mainframes.');
  await line(g, 'denis', 'Fahim. The Monolith is yours while I am gone. If it needs a reboot...');
  await g.wait(600);
  await line(g, 'denis', '...reboot it. On a Tuesday. Gently.');
  await line(g, 'fahim', 'Can I get that in writing?');
  await line(g, 'phil', "I'll draft a form.");
  // Nicholas gets the last word
  await line(g, 'nicholas', 'Hey, Dominic? Quick question. How do you center a div... vertically?');
  g.player.dir = 'right';
  await g.wait(500);
  g.player.dir = 'down';
  await line(g, 'dominic', "I'll write you another sticky note.");
  await g.wait(400);
  await narrate(g, 'And so the Friday Deploy passed into legend.\n\nBut whatever became of our heroes?');
}

// ================================================================ 4. curtain call
const EPILOGUES: [string, string][] = [
  ['dominic', 'Dominic finally took his long weekend, one week late and four days long. The rubber duck still sits on his desk. It has not said a word since Friday night. He checks on it anyway.'],
  ['aidan', "Aidan joined full-time and rewrote the deploy runbook. Step one now reads: \"Is it Friday? Go home.\" New interns study his first deploy as a cautionary tale and, secretly, as an inspiration."],
  ['nicholas', "Nicholas centered the div. Then he centered another one. He now gives a popular conference talk, \"Flexbox: A Love Story\", and owns thirty-eight keyboards. Just in case, he keeps Dominic's sticky note on his monitor."],
  ['mike', 'Mike closed the largest deal in company history and was named Salesperson of the Year for the second time. At the time of writing, the Monolith is not in space. Mike remains confident about Q5.'],
  ['fahim', 'Fahim slept for nineteen hours, then automated half the on-call rotation. The NOC sign now reads DAYS SINCE LAST INCIDENT: 214. His new mug says I SURVIVED THE FRIDAY DEPLOY.'],
  ['phil', 'Phil introduced Form FD-1, the Friday Deploy Exception Request. Nobody has ever filed one. His swear jar has been empty since Monday, and he finally broke 90 on the golf course.'],
  ['krishna', 'The Neural Debugging Interface earned Krishna two patents and one very confused safety review. Version 3 has its own battery and a much bigger LOG OUT button.'],
  ['denis', 'Denis spent three weeks on a beach in Portugal: his first vacation since 1999. While he was away, Fahim rebooted the Monolith on a Tuesday afternoon. It came right back up. Denis sent it a postcard.'],
  ['adriana', 'Adriana now leads the Monolith modernization: tests, documentation, even a backup. Threads A and B were refactored into a lock-free queue, and are by all accounts very happy together.'],
];

async function curtainCall(g: Game) {
  EPI.who = '';
  g.goto('epilogue');
  await g.wait(900);
  for (const [id, text] of EPILOGUES) {
    let a: Actor;
    if (id === 'dominic') {
      a = g.player;
      a.place(STAGE_X - 60, STAGE_Y, 'right');
      a.pose = null;
      a.visible = true;
    } else a = addNpc(g, id, STAGE_X - 60, STAGE_Y, 'right');
    a.speed = 1.6;
    await g.walk(a, STAGE_X, STAGE_Y, { direct: true });
    a.dir = 'down';
    EPI.who = id;
    await g.wait(250);
    await g.say(text, { title: NAMES[id], y: LOW });
    EPI.who = '';
    a.dir = 'right';
    await g.walk(a, STAGE_X + 64, STAGE_Y, { direct: true });
    if (a === g.player) a.visible = false;
    else g.remove(a);
    a.speed = 1;
  }
  await g.wait(300);
}

// ================================================================ 5. credits
export function rankFor(score: number): string {
  if (score >= 256) return 'Legendary Greybeard';
  if (score >= 240) return 'Principal Engineer';
  if (score >= 192) return 'Senior Engineer';
  if (score >= 128) return 'Software Engineer';
  if (score >= 64) return 'Junior Developer';
  return 'Unpaid Intern';
}

type CKind = 'logo' | 'sub' | 'head' | 'name' | 'role' | 'text' | 'gap' | 'big';
interface CLine {
  k: CKind;
  s: string;
}
/** ticks the logo holds before the credits start to roll */
const HOLD = 150;
const H: Record<CKind, number> = { logo: 34, big: 26, sub: 14, head: 16, name: 10, role: 14, text: 10, gap: 10 };

const CAST: [string, string][] = [
  ['Adriana', 'Lead Architect, Deadlock Survivor'],
  ['Aidan', 'Summer Intern, Presser of Buttons'],
  ['Nicholas', 'Frontend Developer, Centerer of Divs'],
  ['Mike', 'Mike from Sales'],
  ['Fahim', 'Site Reliability Engineer, Awake 36 Hours'],
  ['Phil', 'CEO, Keeper of Forms'],
  ['Krishna', 'R&D, Inventor of the Neural Debugging Interface'],
  ['Denis', 'Sysadmin, Guardian of the Monolith since 1987'],
];
const FEATURING: [string, string][] = [
  ['King Kernel', 'Ruler of the Monolith'],
  ['The Rubber Duck', 'Hint System'],
  ['The Garbage Collector', 'Itself'],
  ['PID 1991', 'A Ghost Stuck in Vim'],
  ['The Oracle of the Stack', 'Closed as Duplicate'],
  ['Thread A and Thread B', 'Lock-Free at Last'],
  ['The Legacy Dragon', 'Very Sleepy'],
  ['The Millennium Bug', 'Now a Feature'],
  ['Mr. Henderson and Ms. Whitfield', 'The Investors'],
  ['THE MONOLITH', 'Itself, since 1987'],
];

function creditLines(): CLine[] {
  const L: CLine[] = [];
  const add = (k: CKind, s = '') => L.push({ k, s });
  add('logo', "CODER'S QUEST");
  add('sub', 'The Friday Deploy');
  add('gap');
  add('text', 'A Monolith Systems Production');
  add('gap');
  add('gap');
  add('head', 'STARRING');
  add('big', 'Dominic');
  add('role', 'as himself');
  add('gap');
  add('head', 'WITH');
  for (const [n, r] of CAST) add('name', n), add('role', r);
  add('gap');
  add('head', 'FEATURING');
  for (const [n, r] of FEATURING) add('name', n), add('role', r);
  add('gap');
  add('gap');
  add('name', 'Written, painted and composed');
  add('name', 'in 16 colors and 3 voices');
  add('text', '(plus one noise channel)');
  add('gap');
  add('gap');
  add('head', 'GAME DESIGN');
  add('text', 'A 1987 state of mind');
  add('gap');
  add('head', 'PARSER');
  add('text', 'Understands most of what you type');
  add('gap');
  add('head', 'QUALITY ASSURANCE');
  add('text', 'Everyone who ever deployed on a Friday');
  add('gap');
  add('head', 'SPECIAL THANKS');
  add('text', 'The rubber duck');
  add('text', 'Whoever wrote the runbook');
  add('text', 'The coffee machine, for coming back');
  add('text', 'The 16-color adventures of the 1980s');
  add('gap');
  add('gap');
  add('text', 'No Monoliths were harmed in the making of this game...');
  add('text', 'permanently.');
  add('gap');
  add('text', 'No code was deployed on a Friday.');
  add('text', '(Except that one time.)');
  add('gap');
  add('text', 'Any resemblance to real production incidents');
  add('text', 'is entirely too accurate.');
  return L;
}

class CreditsRoll implements Modal {
  blocks = true;
  fullscreen = true;
  cursor = 'none' as const;
  age = 0;
  /** starts with the logo already on screen */
  scroll = 96;
  finished = false;
  finAge = 0;
  lines = creditLines();
  total: number;
  stars: [number, number, number][] = [];
  constructor(
    public g: Game,
    public done: () => void,
  ) {
    this.total = this.lines.reduce((s, l) => s + H[l.k], 0);
    const r = rng(1987);
    for (let i = 0; i < 110; i++) this.stars.push([Math.floor(r() * 320), Math.floor(r() * 140), Math.floor(r() * 100)]);
  }
  tick() {
    this.age++;
    if (this.finished) this.finAge++;
    else if (this.age > HOLD) {
      this.scroll += 0.34;
      if (this.scroll > this.total + 140) this.finished = true;
    }
  }
  backdrop(s: Surface, t: number) {
    s.rect(0, 0, 320, 150, 0);
    for (const [x, y, ph] of this.stars) {
      const tw = (t + ph * 7) % 140;
      s.plot(x, y, tw < 5 ? 15 : ph % 3 === 0 ? 7 : ph % 3 === 1 ? 8 : 1);
    }
    // a thin glow along the horizon
    s.gradV(0, 136, 320, 14, [0, 1, 5]);
    // the Monolith Systems tower on the horizon, with one window still lit
    s.rect(292, 116, 22, 34, 0);
    s.vline(292, 116, 149, 8);
    for (let fy = 120; fy < 146; fy += 5) for (let fx = 295; fx < 312; fx += 5) s.rect(fx, fy, 2, 2, fx === 300 && fy === 135 ? 14 : 1);
    s.vline(303, 108, 115, 7);
    s.plot(303, 107, Math.floor(t / 25) % 2 ? 10 : 2);
    // neon grid floor
    s.rect(0, 150, 320, 50, 0);
    s.hline(0, 319, 150, 13);
    for (let i = -12; i <= 12; i++) s.line(160 + i * 5, 150, 160 + i * 40, 200, 5);
    const phase = (t % 30) / 30;
    for (let k = 0; k < 7; k++) {
      const yy = 150 + Math.round(50 * Math.pow((k + phase) / 7, 2.2));
      if (yy > 150 && yy < 200) s.hline(0, 319, yy, k < 2 ? 5 : 13);
    }
  }
  draw(s: Surface, t: number) {
    this.backdrop(s, t);
    if (!this.finished) this.drawRoll(s, t);
    else this.drawScore(s, t);
  }
  drawRoll(s: Surface, t: number) {
    s.clip(0, 0, 320, 136);
    let y = 140 - this.scroll;
    for (const l of this.lines) {
      const h = H[l.k];
      if (y > -40 && y < 140) {
        const edge = y < 10 || y > 124;
        const c = (col: number) => (edge ? 8 : col);
        switch (l.k) {
          case 'logo':
            bigText(s, 160, Math.round(y), l.s, 2, 14, 6, 4, 15, t, 3);
            break;
          case 'big':
            bigText(s, 160, Math.round(y), l.s, 2, 11, 3, 1, 15, t, 2);
            break;
          case 'sub':
            s.textC(160, Math.round(y), l.s, c(11));
            break;
          case 'head':
            s.textC(160, Math.round(y), l.s, c(14), true);
            break;
          case 'name':
            s.textC(160, Math.round(y), l.s, c(15));
            break;
          case 'role':
            s.textC(160, Math.round(y), l.s, c(11));
            break;
          case 'text':
            s.textC(160, Math.round(y), l.s, c(7));
            break;
        }
      }
      y += h;
    }
    s.clip();
  }
  drawScore(s: Surface, t: number) {
    const st = this.g.state;
    const score = st.score;
    bigText(s, 160, 10, 'THE END', 3, 14, 6, 4, 15, t, 3);
    if (this.finAge < 20) return;
    s.textC(160, 44, `Your score: ${score} of 256`, 15, true);
    if (this.finAge < 40) return;
    s.textC(160, 58, 'Rank:', 7);
    s.textC(160, 69, rankFor(score), 11, true);
    let y = 83;
    if (score >= 256) {
      s.textC(160, y, '256 of 256. Good thing we used a 16-bit integer.', 10);
      y += 12;
    }
    if (this.finAge < 60) return;
    const mins = Math.floor(st.ticks / 3600);
    const time = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
    s.textC(160, y + 4, `Moves: ${st.moves}     Deaths: ${st.deaths}     Time: ${time}`, 7);
    if (this.finAge < 80) return;
    s.textC(160, y + 20, 'Thank you for playing!', 14, true);
    if (this.finAge > 110 && Math.floor(t / 30) % 2 === 0) s.textC(160, 124, 'Press any key', 7);
  }
  skip() {
    if (this.age < 90) return;
    if (!this.finished) {
      this.finished = true;
      this.finAge = 0;
    } else if (this.finAge > 110) this.done();
  }
  key(k: KeyIn) {
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'F11'].includes(k.key)) return;
    this.skip();
  }
  click() {
    this.skip();
  }
}

function rollCredits(g: Game): Promise<void> {
  g.music('credits');
  return new Promise<void>((resolve) => {
    const roll: CreditsRoll = new CreditsRoll(g, () => {
      g.pop(roll);
      resolve();
    });
    g.push(roll);
  });
}

// ================================================================ the whole thing
export async function playEnding(g: Game): Promise<void> {
  g.hideStatus = true;
  await nocScene(g);
  await dawnScene(g);
  await conferenceScene(g);
  await curtainCall(g);
  await rollCredits(g);
  g.hideStatus = false;
  g.toTitle();
}

// exported for testing individual parts
export const _parts = { nocScene, dawnScene, conferenceScene, curtainCall, rollCredits, SEATS, SEAT_Y };
