// The server room: THE MONOLITH, Denis, and Adriana in the NDI chair.
// Act I: earn Denis's trust, connect the helmet, get digitized.
// Act III: wake up at 11:58 PM Friday, commit, review, test... and wait.
import type { RoomDef } from '../../engine/types';
import type { Game } from '../../engine/game';
import type { Command } from '../../engine/parser';
import type { Actor } from '../../engine/actor';
import { Img } from '../../engine/raster';
import { parse } from '../../engine/parser';
import { award } from '../../content/points';
import { addNpc, convo, fidget } from '../../content/helpers';
import { person } from '../../art/cast';
import { playEnding } from '../../content/ending';
import { act1Raw, readAsLook } from './natural';
import {
  paintServerRoom,
  animateServerRoom,
  drawHelmet,
  slumpedImage,
  particlesFrom,
  drawParticles,
  helmetPixels,
  Particle,
  Mode,
  SEAM,
  CHAIR_A,
  CHAIR_B,
  CHAIR_Y,
  CONSOLE,
  PORT,
  CPU,
  seamX,
} from '../../art/basement_serverroom';

// ------------------------------------------------------------------ transient state

let mode: Mode | null = null; // override for the Monolith's animation
let domHelmet = false; // draw the v2 helmet on Dominic (seated)
let parts: Particle[] | null = null;
let partStart = 0;
let partReverse = false;
let blackFade = 0; // 0..1 fade to black at the end of the digitize
let slumpCache: Record<number, Img> = {};

const act = (g: Game) => (g.flag('act') ?? 1) as number;
const act3 = (g: Game) => act(g) >= 3;
const PANEL_TARGET: [number, number] = [CPU + 28, 50];

// ------------------------------------------------------------------ state → display

function clockText(g: Game): { minute: string; ampm: string; day: string } {
  if (!act3(g)) return { minute: ' 6:30', ampm: 'PM', day: 'FRI' };
  if (g.flag('midnight')) return { minute: '12:00', ampm: 'AM', day: 'SAT' };
  return { minute: g.flag('committed') ? '11:59' : '11:58', ampm: 'PM', day: 'FRI' };
}

function display(g: Game): [string, number] {
  if (mode === 'digitize') return ['LINK 9600', 11];
  if (g.flag('deployed') || mode === 'green') return ['ONLINE', 10];
  if (!act3(g)) return ['CORE PANIC', 12];
  if (g.flag('midnight')) return ['SAT 00 00', 10];
  if (g.flag('tested')) return ['TESTS PASS', 10];
  if (g.flag('reviewed')) return ['APPROVED', 14];
  if (g.flag('committed')) return ['COMMITTED', 14];
  return ['PATCHED', 14];
}

function consoleLines(g: Game): string[] {
  if (!act3(g)) return ['!CORE', '!PANIC'];
  if (g.flag('deployed') || mode === 'green') return ['SHIP', 'IT'];
  if (g.flag('midnight')) return ['SAT', '>'];
  if (g.flag('tested')) return ['PASS', '>'];
  if (g.flag('reviewed')) return ['LGTM', '>'];
  if (g.flag('committed')) return ['GIT', 'OK'];
  return ['READY', '>'];
}

function curMode(g: Game): Mode {
  if (mode) return mode;
  if (g.flag('deployed')) return 'green';
  return act3(g) ? 'calm' : 'panic';
}

// ------------------------------------------------------------------ helpers

function adrianaSlumped(g: Game) {
  const a = g.actor('adriana');
  if (!a) return;
  a.pose = 'sit';
  a.dir = 'down';
  const base = person('adriana').sit_down.frames[0];
  slumpCache = {};
  a.custom = (t) => {
    const k = Math.floor(t / 25) % 2;
    return (slumpCache[k] ??= slumpedImage(base, k * 25));
  };
}

function headTop(a: Actor) {
  return Math.round(a.y) - (a.pose === 'sit' || a.pose === 'type' || a.pose === 'sittalk' ? 30 : 36);
}

/** Particles for Dominic seated in chair B with his helmet on. */
function dominicParticles(g: Game): Particle[] {
  const p = g.player;
  const img = p.currentImg(g.t)!;
  const top = headTop(p);
  const extra = helmetPixels(2, 0).map(([dx, dy, c]) => [Math.round(p.x) + dx, top + dy, c] as [number, number, number]);
  return particlesFrom(img, p.x, p.y, extra, PANEL_TARGET);
}

async function sitInChairB(g: Game) {
  const p = g.player;
  if (!(Math.abs(p.x - CHAIR_B) < 2 && Math.abs(p.y - CHAIR_Y) < 2 && p.pose === 'sit')) {
    await g.walk(null, CHAIR_B + 1, CHAIR_Y + 12);
    await g.walk(null, CHAIR_B, CHAIR_Y, { direct: true });
    p.place(CHAIR_B, CHAIR_Y, 'down');
    p.pose = 'sit';
  }
}

async function standFromChairB(g: Game) {
  const p = g.player;
  p.pose = null;
  await g.walk(null, CHAIR_B + 1, CHAIR_Y + 14, { direct: true });
  p.dir = 'down';
}

function saveCheckpoint(g: Game) {
  // The wake-up is a scene, not a command, so the engine hasn't checkpointed it yet:
  // "Try Again" should never replay it.
  g.checkpoint = g.serialize();
}

// ------------------------------------------------------------------ Act I: Denis's trust

const RIDDLE = 'How many programmers does it take to change a light bulb?';

async function talkDenisAct1(g: Game) {
  await g.approach('denis');
  const d = g.actor('denis')!;
  d.faceToward(g.player.x, g.player.y);
  if (g.flag('denis_trust')) {
    if (!g.flag('helmet_connected'))
      return void (await convo(g, [
        ['denis', g.has('helmet') ? "Adapter goes in her serial port. That DB-25 on the front of the main cabinet, next to Adriana's cable. Then you hook that helmet into the adapter. Then you put it on, and may Grace Hopper have mercy on your soul." : "You'll need a helmet to go in after her. Krishna's got a second one up in the lab. Adapter goes in the serial port, helmet goes in the adapter. Simple."],
      ]));
    return void (await convo(g, [
      ['denis', "Well? Put it on. Sit in that chair and put it on. I'll keep an eye on your vitals."],
      ['denis', 'And on the Monolith. Mostly the Monolith.'],
    ]));
  }
  if (!g.flag('riddle_asked')) {
    g.set('riddle_asked');
    await convo(g, [
      ['denis', "So. You want to go in after Adriana. Into MY machine."],
      ['denis', "I don't let just anybody touch Gertrude's granddaughter. I need to know you're a real programmer, not one of those people who think 'the cloud' is a place."],
      ['denis', `One question. Every real programmer knows the answer. ${RIDDLE}`],
    ]);
    return;
  }
  await g.talk(d, `Still waiting. ${RIDDLE}`);
}

async function riddleSolved(g: Game) {
  g.set('denis_trust');
  award(g, 'riddle_denis');
  const d = g.actor('denis');
  if (d) {
    await g.approach('denis');
    d.faceToward(g.player.x, g.player.y);
    void g.pose(d, 'cheer', 900);
  }
  await convo(g, [
    ['denis', "HA! None! It's a HARDWARE problem!"],
    ['narrator', 'Denis slaps his knee hard enough to register on the Monolith\'s seismograph. If it had one. It probably has one.'],
    ['denis', "Alright. Alright, Senior Engineer. You'll do."],
    ['denis', "Listen. I wrote her code in 1987. Every line. I've kept her running ever since. Haven't let her reboot since 1999. Not ONCE."],
    ['denis', "And today some kid follows a runbook I wrote as a JOKE, and pushes the big red button, and she panics, and I KNEW. I knew something was waiting in there for her to wake up."],
    ['denis', "Adriana went in to find out what. Three hours ago. She's stuck. So you're going in after her."],
  ]);
  g.addItem('adapter');
  await g.say('Denis pulls a cable adapter out of his shirt pocket like a magician producing a dove, and presses it into your hand. Then he rummages under the cot and comes up with a book thick enough to stop a door.\n\nYou receive the DB-25 Adapter and the COBOL Manual.');
  g.addItem('manual', true);
  await convo(g, [
    ['denis', "The adapter goes in her serial port. Most important cable ever made. Treat it with respect."],
    ['denis', "And take the manual. In there, the old parts only speak COBOL. Volume one of seven. Don't read it before bed."],
  ]);
}

const ANSWER_OK = /\b(none|zero|0|hardware|nobody|no one|noone|zilch|nada)\b/i;

function isAnswer(text: string) {
  const c = parse(text);
  if (c.verb === null) return true;
  return ['say', 'tell', 'answer'].includes(c.verb) || (c.verb === 'type' && !c.noun);
}

// ------------------------------------------------------------------ Act I: the helmet

async function connectHelmet(g: Game) {
  if (g.flag('helmet_connected')) return void (await g.say("It's already connected: helmet, adapter, Monolith. A beautiful 1987-to-2026 daisy chain."));
  if (!g.has('adapter') && !g.has('helmet')) return void (await g.say("You don't have anything to connect to the Monolith."));
  if (!g.has('adapter'))
    return void (await g.say("The helmet's plug is a sleek modern connector. The Monolith's port is a DB-25 from 1987. They are not on speaking terms. You'll need an adapter. Denis, by all accounts, has every cable ever made."));
  if (!g.has('helmet')) return void (await g.say("You could plug the adapter in, but there's nothing to plug into the adapter. You need Krishna's NDI helmet."));
  await g.approach('port');
  g.player.dir = 'up';
  await g.pose(null, 'reach', 600);
  g.removeItem('adapter');
  g.set('helmet_connected');
  award(g, 'connect_helmet');
  g.sfx('clink');
  g.redraw();
  await g.say("You plug the DB-25 adapter into the Monolith's serial port and tighten the little thumbscrews, finger-tight, while Denis watches you like a hawk. Then you run the helmet's cable into the adapter.\n\nThe visor flickers to life: CONNECTED. MONOLITH-1 @ 9600 BAUD.");
  if (g.actor('denis')) await g.talk('denis', 'Ninety-six hundred baud. Luxury.');
}

async function wearHelmet(g: Game) {
  if (!g.has('helmet')) return void (await g.say("You don't have a helmet. Adriana's wearing the only other one, and Denis would never forgive you."));
  if (!g.flag('helmet_connected')) {
    await g.say("You put on Krishna's helmet. The visor lights up with two words: NO SIGNAL.\n\nYou take it off again. It needs to be connected to the Monolith first.");
    if (g.flag('denis_trust') && g.actor('denis')) await g.talk('denis', 'Adapter. Port. THEN helmet. Like civilized people.');
    return;
  }
  await digitize(g);
}

async function digitize(g: Game) {
  const p = g.player;
  await sitInChairB(g);
  await g.wait(300);
  await g.say("You sit down in the chair next to Adriana and lower Krishna's helmet onto your head. It smells like new electronics and old ambition.");
  domHelmet = true;
  g.sfx('beep');
  await g.wait(500);
  if (g.actor('denis')) await g.talk('denis', "Bring her back, kid. And whatever's in there... don't let it eat you.");
  // the machine takes notice
  mode = 'digitize';
  g.music(null);
  g.sfx('digitize');
  for (let i = 0; i < 3; i++) {
    g.flash(11, 70);
    await g.wait(220);
  }
  g.shake(400);
  await g.wait(500);
  // pixel by pixel, Dominic is uploaded into the Monolith
  parts = dominicParticles(g);
  partStart = g.t;
  partReverse = false;
  p.visible = false;
  domHelmet = false;
  g.sfx('teleport');
  await g.wait(1600);
  g.sfx('digitize');
  await g.wait(1900);
  parts = null;
  g.flash(15, 300);
  g.sfx('zap');
  for (let i = 1; i <= 10; i++) {
    blackFade = i / 10;
    await g.wait(60);
  }
  award(g, 'wear_helmet');
  g.set('act', 2);
  p.visible = true;
  p.pose = null;
  if (!g.rooms['boot']) {
    // (Act II not installed in this build)
    blackFade = 0;
    await g.say('Your body stays in the chair. The rest of you goes... somewhere else.\n\n(Act II is still under construction.)');
    return;
  }
  g.goto('boot', [160, 150, 'down']);
}

// ------------------------------------------------------------------ Act III

async function wakeScene(g: Game) {
  const p = g.player;
  const ad = g.actor('adriana')!;
  const d = g.actor('denis')!;
  await g.wait(400);
  // Dominic streams back out of the Monolith into the chair
  p.place(CHAIR_B, CHAIR_Y, 'down');
  p.pose = 'sit';
  parts = dominicParticles(g);
  partStart = g.t;
  partReverse = true;
  p.visible = false;
  g.sfx('teleport');
  await g.wait(2600);
  parts = null;
  p.visible = true;
  domHelmet = true;
  g.flash(15, 150);
  g.sfx('digitize');
  await g.wait(600);
  await g.say("You open your eyes.\n\nYou're back in the server room, slumped in the chair, with Krishna's helmet on your head and a crick in your neck. Your hands are made of hands again. The digital clock on the wall says 11:58 PM.\n\nFriday. It is still Friday.");
  domHelmet = false;
  g.sfx('take');
  await g.say('You pull off the helmet. Your hair will never recover.');
  // Adriana wakes up too
  g.flash(11, 100);
  g.sfx('beep');
  ad.custom = null;
  ad.pose = 'sit';
  await g.wait(500);
  await convo(g, [
    ['adriana', '...Dominic?'],
    ['me', "Welcome back. The patch is in. The bug's in a jar. Well, it was. It's a butterfly now. Long story."],
    ['adriana', 'I was there for the good part. Nice work in the Core.'],
  ]);
  ad.pose = null;
  await g.walk(ad, CHAIR_A - 2, CHAIR_Y + 16, { direct: true });
  ad.dir = 'down';
  await g.pose(ad, 'cheer', 700);
  await g.talk(ad, "Four hours in a deadlock. My back thinks it's 1987.");
  // Denis comes over
  d.dir = 'right';
  await g.walk(d, 150, CHAIR_Y + 12, { direct: true });
  d.faceToward(p.x, p.y);
  await convo(g, [
    ['denis', "You're back. BOTH of you. Do you know what time it is? Four hours you've been sitting there twitching."],
    ['denis', "Well? Don't keep an old man waiting. What WAS it? What's been eating my Monolith?"],
  ]);
  await standFromChairB(g);
  g.set('act3_arrived');
  saveCheckpoint(g);
}

async function talkDenisAct3(g: Game) {
  await g.approach('denis');
  const d = g.actor('denis')!;
  d.faceToward(g.player.x, g.player.y);
  if (!g.flag('y2k_told')) {
    g.set('y2k_told');
    await convo(g, [
      ['me', "It was Y2K, Denis. The Millennium Bug. A two-digit year in the date routine."],
      ['me', "It's been asleep in the Core since 1999, because nobody ever rebooted the Monolith. When Aidan restarted it, it woke up and started eating the date tables."],
      ['narrator', 'Denis is quiet for a long moment.'],
      ['denis', "I KNEW it. I wrote that date routine in 1987. Two digits. 'We'll fix it before 2000,' I said."],
      ['denis', "Then 1999 came around, and I panicked, and I thought: if I never reboot her, the bug never wakes up. So I never rebooted her. Twenty-seven years I sat on that bug like a hen on an egg."],
      ['denis', "...So it was never the kid's fault."],
      ['me', "It was never Aidan's fault. A system that falls over from one restart was a time bomb anyway."],
      ['denis', "I'll tell him myself. Personally. With an apology, and a cable of his choosing."],
    ]);
    award(g, 'y2k_told');
    return;
  }
  if (!g.flag('committed')) return void (await g.talk(d, "Well, don't look at ME. It's your fix. Commit it. The console's right there."));
  if (!g.flag('reviewed')) return void (await g.talk(d, "In my day we did code review by printing it out and throwing it at each other. Ask Adriana. She's got better aim."));
  if (!g.flag('tested')) return void (await g.talk(d, 'Tests. Run them. I want to see that bug fail to fail.'));
  if (!g.flag('midnight')) return void (await g.talk(d, "Everything's green. Twenty-seven years, and it comes down to the next few minutes. Funny old world. Do what you gotta do, kid."));
  await g.talk(d, "It's Saturday. Go on. Ship it. I want to watch her come back up the right way.");
}

async function talkAdrianaAct3(g: Game) {
  await g.approach('adriana');
  const a = g.actor('adriana')!;
  a.faceToward(g.player.x, g.player.y);
  if (!g.flag('committed')) return void (await g.talk(a, 'First things first. Commit the fix. Then I review it. Then we test it. In that order. We are professionals.'));
  if (!g.flag('reviewed')) return review(g);
  if (!g.flag('tested')) return void (await g.talk(a, 'Approved. Now run the tests. All of them. Even the one in the jar.'));
  if (!g.flag('midnight')) {
    await g.talk(a, "Everything's green. All that's left is shipping it.");
    await g.say('She glances at the clock on the wall. Then back at you. She says nothing at all. Architects are like that.');
    return;
  }
  await g.talk(a, "It's Saturday, Dominic. Ship it.");
}

async function useConsole(g: Game, ms = 900) {
  await g.approach('computer');
  g.player.dir = 'up';
  for (let i = 0; i < Math.round(ms / 150); i++) {
    g.sfx('type');
    await g.pose(null, 'reach', 150);
  }
}

async function commit(g: Game) {
  if (!act3(g)) {
    await useConsole(g, 450);
    g.sfx('error');
    return void (await g.say("You type GIT COMMIT into the Monolith's console. It answers: CORE PANIC. SEE DENIS.\n\nThere's nothing to commit yet, anyway. The fix, whatever it is, is somewhere inside that machine."));
  }
  if (g.flag('committed')) return void (await g.say('Already committed. Your working tree is clean, which is more than can be said for the rest of the basement.'));
  await useConsole(g);
  g.set('committed');
  award(g, 'committed');
  await g.say('$ git commit -am "Fix Y2K: use 4-digit years in date routine"\n\n[main 2000ad1] Fix Y2K: use 4-digit years in date routine\n 1 file changed, 2 insertions(+), 2 deletions(-)\n\nTwo characters. Twenty-seven years. One commit.', { title: 'Console' });
}

async function review(g: Game) {
  if (!act3(g)) return void (await g.say("Adriana is in no state to review anything. She's slumped in her chair, deep inside the Monolith."));
  const a = g.actor('adriana')!;
  if (!g.flag('committed')) {
    await g.approach('adriana');
    return void (await g.talk(a, "Review what? There's nothing to review yet. Commit it first. I don't review vibes."));
  }
  if (g.flag('reviewed')) return void (await g.talk(a, 'I already approved it. Twice, if you count the part where I wrote it.'));
  await g.approach('computer');
  g.player.dir = 'up';
  await g.walk(a, CONSOLE.x + CONSOLE.w + 10, CONSOLE.front + 6, { direct: true });
  a.dir = 'left';
  await convo(g, [
    ['adriana', "Let's see it."],
    ['narrator', 'Adriana leans over the console and reads the diff. Both lines of it. Twice. She scrolls up to check the test, then scrolls back down.'],
    ['adriana', "Four-digit years. Boundary test for 1999 to 2000. And a regression test that is, technically, a jar."],
    ['adriana', 'LGTM. Ship it...'],
    ['adriana', '...well. Not yet. Tests first.'],
  ]);
  g.set('reviewed');
  award(g, 'reviewed');
}

async function runTests(g: Game) {
  if (!act3(g)) {
    await useConsole(g, 450);
    g.sfx('error');
    return void (await g.say('You try to run the test suite. The console answers: CORE PANIC. SEE DENIS. Even the tests are hiding.'));
  }
  if (g.flag('tested')) return void (await g.say('You already ran them. 1,999 tests, 1,999 green. Running them again would just be showing off.'));
  if (!g.flag('committed')) return void (await g.say("Run the tests on what? You haven't even committed the fix yet."));
  if (!g.flag('reviewed')) {
    if (g.actor('adriana')) await g.talk('adriana', "Review first, then tests. We do things in order down here. Like civilized people. Ask me.");
    return;
  }
  await useConsole(g);
  mode = 'busy';
  g.sfx('type');
  await g.wait(400);
  await g.say('$ ./run_tests.sh\n\nRunning 1,999 tests...', { title: 'Console' });
  for (let i = 0; i < 6; i++) {
    g.sfx('beep');
    await g.wait(220);
  }
  mode = null;
  g.set('tested');
  award(g, 'tested');
  await g.say('1999 / 1999 PASSED. 0 FAILED.\n\nIncluding test_y2k_rollover, test_leap_year_2000, and test_the_bug_stays_in_the_jar.\n\nEverything is green.', { title: 'Console' });
}

async function waitForMidnight(g: Game) {
  if (!act3(g)) return void (await g.say('You wait. The Monolith keeps panicking. Adriana keeps not waking up. Waiting is not, it turns out, a strategy.'));
  if (g.flag('midnight')) return void (await g.say("It's Saturday. There's nothing left to wait for. Except, possibly, the deploy."));
  if (!g.flag('tested')) {
    if (!g.flag('committed')) return void (await g.say("Time passes. Well, a little of it does. The clock on the wall doesn't seem to be in any hurry, and neither, apparently, is your fix."));
    return void (await g.say('Time passes. The clock clicks over to 11:59 PM, and seems very pleased with itself about it. You still have work to do.'));
  }
  await g.say('You lean back against the console and watch the clock. 11:59 PM, Friday.\n\nAdriana folds her arms. Denis takes off his glasses and polishes them. Nobody says the words "Rule Number One," but everyone is thinking them.');
  await convo(g, [
    ['denis', 'Ten seconds.'],
    ['adriana', 'Five. Four. Three...'],
    ['denis', 'Two...'],
    ['me', 'One.'],
  ]);
  g.set('midnight');
  g.sfx('beep');
  g.flash(14, 60);
  await g.wait(400);
  award(g, 'midnight');
  await g.say('The clock clicks over: 12:00 AM. SAT.\n\nIt is now Saturday.');
}

async function deploy(g: Game) {
  if (!act3(g)) {
    if (g.actor('denis')) {
      await g.approach('denis');
      return void (await g.talk('denis', "Deploy? DEPLOY? Kid, a deploy is how we got INTO this mess. Nothing's getting deployed until we know what's wrong with her."));
    }
    return void (await g.say('Deploy what? Nobody even knows what is wrong yet.'));
  }
  if (g.flag('deployed')) return;
  if (!g.flag('committed')) return void (await g.say("Deploy what? You haven't committed anything yet. Right now the fix is just a feeling."));
  await useConsole(g);
  if (!g.flag('midnight')) {
    // Rule #1
    await g.say('$ ./deploy.sh --production', { title: 'Console' });
    mode = 'green';
    g.sfx('digitize');
    await g.wait(1300);
    await g.say("The Monolith hums. The tape reels spin up. The light panel cascades green. For one glorious second, everything works.\n\nThen the clock on the wall catches your eye. 11:59 PM.\n\nFRIDAY.");
    mode = 'panic';
    g.music(null);
    g.sfx('alarm');
    g.flash(12, 200);
    g.shake(1200);
    await g.wait(500);
    g.sfx('crash');
    g.flash(4, 300);
    await g.wait(900);
    return g.die('You deployed on a Friday. Again.\n\nThe universe has a sense of humor, and a sense of irony. The Monolith panics harder than ever, the coffee machine upstairs declares itself a teapot for life, and on the NOC wall, RULE #1: NEVER DEPLOY ON A FRIDAY quietly turns a deeper shade of red.', { title: 'Rule Number One' });
  }
  // Saturday, 12:00 AM: ship it
  await g.say('$ git push origin main\n$ ./deploy.sh --production\n\nIt is Saturday. You press Enter.', { title: 'Console' });
  mode = 'busy';
  g.sfx('digitize');
  await g.wait(1200);
  mode = 'green';
  g.sfx('fanfare');
  g.flash(10, 120);
  g.set('deployed');
  award(g, 'deployed');
  const d = g.actor('denis');
  const a = g.actor('adriana');
  g.player.dir = 'down';
  if (d) void g.pose(d, 'cheer', 2400);
  if (a) void g.pose(a, 'cheer', 2400);
  void g.pose(null, 'cheer', 2400);
  await g.say("The Monolith hums: a deep, steady, healthy hum you didn't know you'd been missing. The tape reels spin up smooth and even. The light panel blooms green from left to right. On the display: ONLINE.\n\nUpstairs, very faintly, a coffee machine says READY.\n\nDenis whoops. Adriana grins. Somewhere, a pager stops beeping. Then forty more.");
  await g.talk('denis', 'She came back up the RIGHT way. First time since 1999. Hah!');
  await playEnding(g);
}

// ------------------------------------------------------------------ "ask denis about ..."

async function askDenis(g: Game, c: Command) {
  const d = g.actor('denis');
  if (!d) return;
  await g.approach('denis');
  d.faceToward(g.player.x, g.player.y);
  const topic = c.noun2 ?? c.unknown ?? '';
  const w = c.words.join(' ');
  const has = (...k: string[]) => k.some((x) => topic === x || w.includes(x));
  let line: string;
  if (!act3(g) && !g.flag('denis_trust') && has('riddle', 'answer', 'bulb', 'light', 'hint'))
    line = `It's a riddle, not a code review. No hints. ${RIDDLE}`;
  else if (has('gertrude', 'photo', 'pdp'))
    line = "Gertrude. PDP-11, serial number 4471. 1979. She taught me everything. They sold her for scrap in '86. I cried for a week. Then I built THIS one, and I promised myself: this one, I'd never let go.";
  else if (has('monolith', 'mainframe', 'machine', 'computer'))
    line = act3(g) ? "Listen to her. Hear that? That's a patched kernel waiting to happen." : "Gertrude's granddaughter, in spirit. 1987. Thirty-two megabytes of RAM, which was a scandal at the time. Runs payroll, billing, the coffee machine, the doors, and apparently my blood pressure.";
  else if (has('adriana', 'architect'))
    line = act3(g) ? 'Sharpest architect this building ever had. Wrote the fix while two threads were sitting on her. Hmph. Kids these days. Impressive kids.' : "Smartest one of the lot. Went in three hours ago to find out what's wrong. Vitals are fine. She's just... not coming out. Something's holding her.";
  else if (has('aidan', 'intern', 'kid'))
    line = act3(g) && g.flag('y2k_told') ? "I owe that boy an apology. And a cable. Maybe two cables." : "The intern? He followed the runbook. Step four: 'Restart the Monolith.' I wrote that in 1988. As a JOKE. Nobody was supposed to actually DO it.";
  else if (has('bug', 'heisenbug', 'butterfly', 'jar', 'patch', 'date routine', 'kingdom', 'inside', 'dragon'))
    line = act3(g)
      ? g.flag('y2k_told')
        ? 'A two-digit year. Twenty-seven years I guarded that machine, and the thing eating her was MY bug all along. Hmph. Good work in there, kid.'
        : "Well? Out with it. What WAS in there?"
      : "Something's been chewing on her date tables since the restart. Adriana went in to find out what. Whatever it is, it's been waiting a long time.";
  else if (has('runbook', 'step four', 'joke'))
    line = "Runbook's from 1988. Step four was a joke. Step five says 'Pray.' Step six is a recipe for chili. Nobody reads past step four.";
  else if (has('helmet', 'ndi', 'krishna'))
    line = "Krishna's contraption. Lets you debug a system from the inside. I don't trust anything with that many LEDs, but I've seen it work. Adriana's wearing the first one.";
  else if (has('y2k', 'millennium', '1999', '2000', 'shirt', 'survivor'))
    line = act3(g) && g.flag('y2k_told') ? "Twenty-seven years I guarded that bug. Turns out you can't hide from a date. It always comes." : "Y2K? Survived it. Didn't reboot. Didn't NEED to. That's the trick: if you never reboot, nothing can go wrong. ...Until somebody reboots.";
  else if (has('cobol', 'manual', 'book'))
    line = "Volume one of seven. Most boring book ever printed. I used to read it to my cat. Cat slept for a week.";
  else if (has('adapter', 'db25', 'serial', 'db 25') && (g.has('adapter') || g.flag('helmet_connected')))
    line = g.flag('helmet_connected') ? "It's in her serial port, where it belongs. Most important cable ever made. Don't touch it." : "You've GOT it. Adapter goes in her serial port, the DB-25 on the front of the main cabinet. Then the helmet goes in the adapter.";
  else if (has('cable', 'cables', 'adapter', 'pegboard', 'db25', 'serial'))
    line = "Every cable ever made. RS-232, Centronics, Token Ring, SCSI. If they made it, I kept it. People laugh. Then they need a cable.";
  else if (has('reboot', 'restart', 'button'))
    line = "We don't say that word down here.";
  else if (has('ramen', 'hot plate', 'hotplate', 'food', 'pot'))
    line = 'Chicken flavor. Same pot since 1994. The flavor is mostly the pot now.';
  else if (has('cot', 'bed', 'sleep', 'home'))
    line = "Live here? No. I just haven't gone home since 1999. Different thing.";
  else if (has('phil', 'ceo', 'boss'))
    line = "Phil? Good kid. Was a junior salesman when we started. Still owes me twelve dollars from 1989.";
  else if (has('clock', 'time', 'midnight', 'friday'))
    line = act3(g) ? "It's a clock. It tells time. Some of us even listen to it." : "Six-thirty. On a Friday. Of all the days to bring down a mainframe.";
  else if (has('self', 'dominic', 'me'))
    line = act3(g) ? "You? You'll do. You'll do just fine." : 'You? Jury\'s still out.';
  else line = "Denis strokes his beard. \"Never heard of it. And I've heard of everything.\"";
  if (line.startsWith('Denis strokes')) await g.say(line);
  else await g.talk(d, line);
}

function doorBlock(g: Game): string {
  return `Denis steps in front of the door. "Where do you think you're going? ${g.flag('midnight') ? "It's Saturday" : "It's almost midnight"}. The deploy is HERE."`;
}

function monolithLook(g: Game): string {
  if (g.flag('deployed')) return 'THE MONOLITH, fully online and humming happily: every light green, every reel turning smooth and even. It looks, if a mainframe can look anything, relieved.';
  if (act3(g)) return `THE MONOLITH, calmer now. Its reels turn slowly, its light panel pulses a patient amber, and its display reads ${display(g)[0]}. It feels like the whole machine is holding its breath.`;
  return "THE MONOLITH. A 1987 mainframe the size of a family car: two tape drives with their reels twitching back and forth, a main cabinet with MONOLITH in white letters on a blue header and a light panel flashing a frantic panic, and a disk cabinet humming under a smoked dome. A red beacon spins on top.\n\nIt has not been rebooted since 1999. Until today.";
}

// ------------------------------------------------------------------ the room

export const serverroom: RoomDef = {
  id: 'serverroom',
  title: 'Server Room',
  act: 1,
  start: [40, 170, 'right'],
  draw(p, g) {
    paintServerRoom(p, { connected: !!g.flag('helmet_connected'), act3: act3(g), tileUp: false });
  },
  walk: [[seamX(114) + 2, 114, 316, 114, 316, 186, seamX(186) + 1, 186]],
  blocks: [
    [CONSOLE.x - 2, CONSOLE.y - 2, CONSOLE.w + 4, CONSOLE.front - CONSOLE.y + 4],
    [CHAIR_A - 9, CHAIR_Y - 12, 19, 14],
    [CHAIR_B - 9, CHAIR_Y - 12, 19, 14],
  ],
  look: (g) =>
    act3(g)
      ? `The server room, close to midnight. THE MONOLITH hums at the back of the room, calmer now: its reels turn slowly and its lights pulse a patient amber, as if it knows something is coming. Denis's corner, the newer racks, the two NDI chairs. And the clock on the wall, which says ${clockText(g).minute.trim()} ${clockText(g).ampm}, ${clockText(g).day === 'SAT' ? 'SATURDAY' : 'FRIDAY'}.`
      : "The server room. Raised floor, humming air conditioning, and at the back, filling the room the way a whale fills a bathtub: THE MONOLITH. A 1987 mainframe in beige and IBM blue, tape reels twitching, light panel blinking out a frantic CORE PANIC, red beacon spinning on top.\n\nIn one corner, Denis has made a home: a cot, a hot plate, a wall of cables. In front of the Monolith, Adriana sits slumped in a chair, wearing a helmet wired into the machine. The chair next to her is empty.",
  hotspots: [
    {
      id: 'monolith',
      nouns: ['monolith', 'mainframe', 'the monolith', 'cabinet', 'cabinets', 'beast'],
      area: [100, 14, 150, 94],
      at: [176, 124],
      look: (g) => monolithLook(g),
    },
    {
      id: 'reels',
      nouns: ['reels', 'reel', 'tape', 'tapes', 'tape drive', 'tape drives', 'tape reels', 'vacuum columns'],
      area: [100, 36, 58, 72],
      at: [146, 124],
      look: (g) => (act3(g) ? 'The tape reels turn slowly and evenly now, like a heartbeat after a long run.' : "Two big tape drives behind smoked glass. Their reels jerk back and forth, back and forth, like they're looking for something they lost in 1999. Which, in a sense, they are."),
    },
    {
      id: 'lightpanel',
      nouns: ['light panel', 'panel', 'lights', 'blinkenlights', 'blinking lights', 'leds', 'lamps'],
      area: [CPU + 2, 38, 52, 26],
      at: [188, 124],
      look: (g) => (act3(g) ? 'Sixty little lamps, pulsing a calm, patient amber.' : 'Sixty little lamps in a grid, flashing red and yellow in a pattern that, if you squint, spells out "HELP" in a font from 1987.'),
    },
    {
      id: 'statusdisplay',
      nouns: ['status display', 'readout', 'status', 'status screen'],
      area: [CPU + 4, 65, 48, 11],
      at: [188, 124],
      look: (g) => `The Monolith's status display reads: ${display(g)[0]}.`,
    },
    {
      id: 'button',
      nouns: ['button', 'red button', 'big red button', 'restart button', 'reset button', 'cover', 'duct tape', 'tape x', 'no note'],
      area: [CPU + 2, 76, 26, 20],
      at: [178, 124],
      look: 'A big red button labeled RESTART, under a hinged plastic cover. The cover has been duct-taped shut in a big X, with a sticky note slapped on top that just says "NO". The tape is fresh. Very fresh. Today-fresh.',
    },
    {
      id: 'port',
      nouns: ['port', 'serial port', 'db25 port', 'db 25 port', 'socket', 'splitter', 'plug', 'jack'],
      area: [PORT[0] - 7, PORT[1] - 4, 20, 16],
      at: [212, 124],
      look: (g) =>
        g.flag('helmet_connected')
          ? "The Monolith's DB-25 serial port. Adriana's cable is plugged into one side of a splitter, and your adapter, with Krishna's helmet hanging off it, into the other."
          : "A DB-25 serial port on the front of the main cabinet: twenty-five pins of 1987's finest. Adriana's helmet cable runs into one side of a splitter. The other side is free. A DB-25 is not, alas, a USB-C.",
    },
    {
      id: 'disk',
      nouns: ['disk', 'disks', 'disk drive', 'disk drives', 'disk pack', 'dome', 'platters', 'hard drive'],
      area: [218, 44, 32, 64],
      at: [236, 124],
      look: 'The disk cabinet: a stack of platters the size of dinner plates spinning under a smoked dome. Total capacity: 300 megabytes. Denis calls it "the big one".',
    },
    {
      id: 'beacon',
      nouns: ['beacon', 'red light', 'alarm light', 'siren', 'warning light'],
      area: [CPU + 22, 12, 14, 12],
      at: [188, 124],
      look: (g) => (act3(g) ? "The beacon on top of the Monolith has stopped spinning. Small mercies." : "A red rotating beacon on top of the Monolith, sweeping the ceiling with alarm. It hasn't spun since 1999. It seems to be making up for lost time."),
    },
    {
      id: 'computer',
      nouns: ['computer', 'console', 'terminal', 'crt', 'operator console', 'desk', 'screen', 'monitor', 'display', 'green screen', 'console keyboard', 'workstation', 'pc'],
      area: [CONSOLE.x, 88, CONSOLE.w, CONSOLE.front - 88],
      at: [128, CONSOLE.front + 8],
      look: (g) =>
        act3(g)
          ? `The Monolith's operator console: a beige terminal with a green screen and a keyboard you could stop a bullet with. It's online and waiting for you. The screen shows: ${consoleLines(g).join(' ').replace(/!/g, '')}`
          : "The Monolith's operator console: a beige terminal with a glowing green screen and a keyboard you could stop a bullet with. Every line on the screen ends in the same two words: CORE PANIC.",
    },
    {
      id: 'racks',
      nouns: ['racks', 'rack', 'servers', 'server racks', 'new servers', 'cloud', 'cloud label', 'migration'],
      area: [254, 44, 56, 64],
      at: [282, 124],
      look: 'Two modern server racks, humming politely beside the Monolith like teenagers at a family dinner. A yellowed label on one says "CLOUD MIGRATION PHASE 1 (2009)". Someone has added, in pen: "lol".',
    },
    {
      id: 'clock',
      nouns: ['clock', 'wall clock', 'digital clock', 'time', 'midnight', 'led clock'],
      area: [262, 22, 44, 19],
      at: [282, 124],
      look: (g) => {
        const c = clockText(g);
        if (!act3(g)) return `A big red LED clock: ${c.minute.trim()} PM, FRI. It's been a long Friday, and it isn't over.`;
        if (g.flag('midnight')) return 'The clock reads: 12:00 AM. SAT.\n\nSaturday. Blessed, deployable Saturday.';
        return `The clock reads: ${c.minute} PM. FRI.\n\nFriday. Still Friday. Very much Friday.`;
      },
    },
    {
      id: 'chairb',
      nouns: ['chair', 'chairs', 'empty chair', 'ndi chair', 'second chair', 'seat'],
      area: [CHAIR_B - 9, CHAIR_Y - 31, 19, 31],
      at: [CHAIR_B + 1, CHAIR_Y + 12],
      look: (g) =>
        act3(g)
          ? 'The chair you just spent four hours in. It has a you-shaped dent in it now.'
          : g.flag('helmet_connected')
            ? 'The empty chair next to Adriana. The new cable runs from the Monolith\'s port to the helmet in your hands, and the chair is waiting. It looks a lot like a dentist\'s chair, if your dentist were a mainframe.'
            : 'An empty chair next to Adriana\'s, facing out from the Monolith. It looks like it has been waiting for someone.',
    },
    {
      id: 'cot',
      nouns: ['cot', 'bed', 'army cot', 'blanket', 'pillow'],
      area: [28, 92, 50, 17],
      at: [54, 124],
      look: "Denis's army cot, with a green wool blanket folded with military precision. He sleeps here. He might live here. Nobody has ever checked.",
    },
    {
      id: 'hotplate',
      nouns: ['hot plate', 'hotplate', 'pot', 'ramen', 'noodles', 'crate', 'milk crate', 'stove', 'soup'],
      area: [79, 84, 20, 25],
      at: [90, 124],
      look: 'A milk crate with a hot plate on it, and on the hot plate, a dented pot of instant ramen, simmering gently. It smells like chicken flavor and 1994.',
    },
    {
      id: 'shirt',
      nouns: ['shirt', 't shirt', 'tshirt', 'frame', 'y2k shirt', 'survivor', 'y2k survivor'],
      area: [30, 27, 23, 33],
      at: [42, 124],
      look: 'A framed T-shirt: "Y2K SURVIVOR". It is signed, in marker: "To Denis. Great job. - Denis".',
    },
    {
      id: 'cables',
      nouns: ['cables', 'pegboard', 'cable wall', 'coils', 'cable collection'],
      area: [54, 21, 26, 48],
      at: [66, 124],
      look: "Denis's cable wall: every cable ever made, coiled with loving precision and hung by type. RS-232. Centronics. Token Ring. SCSI. A coil of something labeled 'DO NOT ASK'. If a cable has ever existed, Denis has it.",
    },
    {
      id: 'denisterm',
      nouns: ['denis terminal', 'small terminal', 'shelf', 'his terminal', 'green terminal', 'log'],
      area: [78, 56, 22, 22],
      at: [90, 124],
      look: (g) => (act3(g) ? "Denis's own little green-screen terminal on a shelf. The log scrolling across it has calmed down: no more PANIC, just a steady drip of OK." : "Denis's own little green-screen terminal on a shelf, scrolling a log. Every line ends in PANIC. Some lines end in PANIC PANIC."),
    },
    {
      id: 'door',
      nouns: ['door', 'steel door', 'vault door', 'wheel', 'fire sign', 'halon', 'halon sign'],
      area: [0, 48, 22, 136],
      at: [14, 166],
      look: 'The inside of the vault door back to the basement corridor, with a locking wheel. Next to it, a red sign: "IN CASE OF FIRE: HALON SYSTEM WILL DISCHARGE. ALSO, RUN."',
    },
    {
      id: 'floor',
      nouns: ['floor', 'tiles', 'tile', 'raised floor', 'floor tile', 'vent', 'vents'],
      area: [30, 140, 280, 46],
      look: 'A raised floor of removable tiles, a few of them perforated to blow cold air up into the machines. Underneath, according to legend, are forty years of cables.',
    },
  ],
  exits: [
    {
      area: [0, 140, 13, 46],
      to: 'basement',
      at: [264, 136, 'down'],
      dir: 'west|out',
      blocked: (g) => (act3(g) && !g.flag('deployed') ? doorBlock(g) : undefined),
    },
  ],
  nouns: {
    gertrude: ['gertrude', 'pdp', 'pdp 11', 'pdp11'],
    adrianashelmet: ['v1', 'v1 helmet', 'her helmet', 'adrianas helmet', 'prototype helmet', 'colander'],
    riddle: ['riddle', 'question', 'light bulb', 'lightbulb', 'bulb'],
    denis: ['denis', 'dennis', 'old man', 'old guy', 'guy', 'man', 'greybeard', 'graybeard', 'sysadmin', 'beard', 'bearded guy'],
  },
  raw: async (g, text) => {
    if (await act1Raw(g, text)) return true;
    const t = text.toLowerCase().trim();
    // a couple of verbs the parser doesn't know
    if (/^(lie|lay|nap)\b/.test(t) && /cot|bed|down|nap/.test(t)) {
      if (g.actor('denis')) await g.talk('denis', act3(g) ? 'After the deploy, you can sleep for a week. On your OWN cot.' : 'That is MY cot. Get your own Y2K.');
      return true;
    }
    if (/^(lift|raise|pry up|pull up)\b/.test(t) && /tile|floor/.test(t)) {
      await g.approach([60, 148]);
      await g.pose(null, 'reach', 400);
      await g.say('You lift a floor tile and peer underneath. Cables. Forty years of cables, in strata, like rock layers: beige, gray, blue, and one brief, regrettable period of orange. Also a mummified sandwich. You put the tile back.');
      return true;
    }
    // Act I: the riddle
    if (!act3(g) && g.flag('riddle_asked') && !g.flag('denis_trust') && g.actor('denis')) {
      if (ANSWER_OK.test(t) && isAnswer(text)) {
        await riddleSolved(g);
        return true;
      }
      if (isAnswer(text) && !/^(hint|help|inventory|look|score)$/.test(t)) {
        await g.approach('denis');
        g.actor('denis')!.faceToward(g.player.x, g.player.y);
        const c = parse(text);
        if (/\b(1|one|2|two|3|three|4|5|6|10|ten|100|a hundred|million|all of them|everyone)\b/.test(t))
          await g.talk('denis', 'Nope. Think about it. What kind of problem is a light bulb? Come back when you know.');
        else if (c.verb === 'say' && !c.rest) return false;
        else await g.talk('denis', 'Nope. Think about it. Come back when you know.');
        return true;
      }
    }
    // Act III: git and friends at the console
    if (act3(g)) {
      if (/^git (status|st)$/.test(t)) {
        await g.say(
          g.flag('deployed')
            ? 'On branch main. Everything up to date. Everything deployed. Everything... fine.'
            : g.flag('committed')
              ? "On branch main.\nYour branch is ahead of 'origin/main' by 1 commit.\n  (use \"git push\" to publish your local commits)\n\nnothing to commit, working tree clean"
              : 'On branch main.\nChanges not staged for commit:\n\tmodified:   core/date_routine.cbl\n\nOne file. Two characters. Twenty-seven years.',
          { title: 'Console' },
        );
        return true;
      }
      if (/^git diff/.test(t)) {
        await g.say('--- a/core/date_routine.cbl\n+++ b/core/date_routine.cbl\n-    05 WS-YEAR       PIC 99.\n+    05 WS-YEAR       PIC 9999.\n-    IF WS-YEAR > 99\n+    IF WS-YEAR > 1999', { title: 'Console' });
        return true;
      }
      if (/^git log/.test(t) && g.flag('committed')) {
        await g.say('commit 2000ad1 (HEAD -> main)\nAuthor: Dominic\n    Fix Y2K: use 4-digit years in date routine\n\ncommit 0000001\nAuthor: Denis\nDate: 1987\n    Initial commit. TODO: fix dates before 2000', { title: 'Console' });
        return true;
      }
      if (/^lgtm!?$/.test(t) || (/^ship it!?$/.test(t) && !g.flag('reviewed'))) {
        await g.say(g.flag('reviewed') ? "That's what Adriana said." : "That's Adriana's line. Ask her to REVIEW it first.");
        return true;
      }
    }
    return false;
  },
  verbs: {
    // ---- Denis
    'talk denis,help denis,hello denis': async (g) => {
      if (act3(g)) return talkDenisAct3(g);
      await talkDenisAct1(g);
    },
    'ask denis ?,tell denis ?': async (g, c) => {
      if (act3(g) && !g.flag('y2k_told') && (c.words.includes('y2k') || c.words.includes('bug') || c.verb === 'tell')) return talkDenisAct3(g);
      if (!act3(g) && !g.flag('denis_trust') && c.verb === 'tell' && ANSWER_OK.test(c.raw)) return riddleSolved(g);
      if (!c.noun2 && !c.unknown && c.verb === 'ask') return void (await g.say('Ask Denis about what?'));
      await askDenis(g, c);
    },
    'give * denis,show * denis': async (g, c) => {
      await g.approach('denis');
      if (c.noun === 'duck') return void (await g.talk('denis', 'Rubber duck debugging. Good. Good! At least they still teach SOMETHING upstairs.'));
      if (c.noun === 'keyboard') return void (await g.talk('denis', "RGB. Hmph. In my day keyboards came in one color: 'beige', and you LIKED it."));
      if (c.noun === 'helmet') return void (await g.talk('denis', "Krishna's v2. Nicer than the one Adriana's wearing. That one's held together with duct tape and optimism."));
      if (c.noun === 'manual') return void (await g.talk('denis', "Keep it. You'll need it more than me. I've got it memorized. Unfortunately."));
      if (c.noun === 'keycard') return void (await g.talk('denis', "Phil's master card. Means Phil trusts you. Means nothing down here."));
      if (c.noun === 'badge') return void (await g.talk('denis', 'Senior Software Engineer. Hmph. Nice photo. You looked younger.'));
      await g.talk('denis', "Don't need it. Don't want it. Unless it's a cable.");
    },
    'look gertrude': "Gertrude isn't here. She's in a photo out in the corridor, and in Denis's heart, and possibly on his screensaver.",
    'look denis': async (g) => {
      await g.say(
        act3(g)
          ? "Denis looks ten years younger than he did at six-thirty. Which still leaves him looking roughly 1987. His long gray beard is practically glowing."
          : 'Denis: the legendary greybeard. Long gray hair, a longer gray beard, suspenders, and the bearing of a man who has personally hand-wired more computers than you have used. He wrote the Monolith\'s code in 1987, and he has the expression of a man who wants to know who touched it.',
      );
    },
    'attack|kick denis': 'Denis has survived Y2K, three reorgs, and the 1993 Token Ring incident. You are not going to be the thing that takes him down.',
    // ---- Adriana
    'look adriana': async (g) => {
      if (act3(g)) return void (await g.say('Adriana, awake and very much herself again: magenta blazer, sharp eyes, and the faint impatience of an architect who has just spent four hours in a deadlock and would like to get on with it.'));
      await g.say("Adriana, the lead architect, slumped in the chair. She's wearing the v1 prototype helmet: a chunky silver thing held together with duct tape, its cable running into the Monolith. She's breathing slow and steady, eyes closed behind the visor, and smiling faintly, like she's found something interesting in there.\n\nShe does not respond to anything.");
    },
    'talk adriana,ask adriana ?,tell adriana ?': async (g, c) => {
      if (act3(g)) {
        const w = c.words.join(' ');
        if (c.verb === 'ask' && /review|approve|look|check|lgtm|code|commit|diff|pr\b|pull|merge/.test(w)) return review(g);
        if (c.verb === 'ask' && /test/.test(w)) return void (await g.talk('adriana', g.flag('tested') ? 'All green. I watched.' : 'Tests are your job. RUN TESTS. I review, you test, Denis supervises.'));
        if (c.verb === 'ask' && /deploy|ship|push|release/.test(w)) return void (await g.talk('adriana', g.flag('midnight') ? "It's Saturday. Ship it." : "You're the senior engineer. You know the rules."));
        return talkAdrianaAct3(g);
      }
      await g.approach([CHAIR_A + 14, CHAIR_Y + 10]);
      await g.say('You say her name. Nothing. Then, very softly, Adriana mumbles:\n\n"...no, YOU let go first..."\n\nAnd she goes quiet again.');
    },
    'wake|shake|tap|push|pull|attack|touch adriana,remove|take adrianashelmet,unplug|remove|take|pull helmet adriana,unplug adriana': async (g, c) => {
      if (act3(g)) return void (await g.talk('adriana', c.verb === 'attack' ? 'Try it and I reject your pull request. Forever.' : "I'm awake, I'm awake. Four hours in a deadlock will do that to a person."));
      if (g.actor('denis')) {
        await g.talk('denis', "DON'T! Pull her out mid-session and her brain gets garbage collected!");
        await g.say('You back away from Adriana. Slowly.');
      } else await g.say("You think better of it. Pulling someone out of the Monolith mid-session doesn't seem like a great idea.");
    },
    'give * adriana,show * adriana': async (g, c) => {
      if (!act3(g)) return void (await g.say("Adriana is somewhere very far away, inside the Monolith. She doesn't notice."));
      await g.approach('adriana');
      if (c.noun === 'duck') return void (await g.talk('adriana', "I've met your duck. In there. It has OPINIONS."));
      await g.talk('adriana', "Thanks, but I'm good. Unless it's a commit. Is it a commit?");
    },
    // ---- the helmet
    'wear helmet,use helmet,sit chairb,sit': async (g, c) => {
      if (act3(g)) {
        if (c.verb === 'sit') return void (await g.say("You've done enough sitting in that chair for one night. Possibly for one lifetime."));
        return void (await g.say("Not a chance. You've seen the inside of that machine, and once was plenty. Besides, the work out here isn't finished."));
      }
      if (c.verb === 'sit') {
        if (g.flag('helmet_connected') && g.has('helmet')) return wearHelmet(g);
        await sitInChairB(g);
        await g.say("You sit in the empty chair next to Adriana. It's still warm from... no, it's the Monolith's exhaust vent. Probably.");
        await standFromChairB(g);
        return;
      }
      await wearHelmet(g);
    },
    'remove helmet': async (g) => {
      if (act3(g)) return void (await g.say('You already took it off. Your hair will never recover.'));
      return false;
    },
    'take helmet': async (g) => {
      if (act3(g)) return void (await g.say("Adriana took her helmet off already, and yours is safely in your inventory. You don't need another souvenir."));
      if (g.actor('denis')) await g.talk('denis', "Don't touch Adriana's helmet! Pull her out mid-session and her brain gets garbage collected!");
    },
    'plug|put|use|insert|connect adapter ?,plug|connect|attach|put helmet monolith|port|adapter,plug|connect helmet,use helmet monolith|port,use adapter,plug adapter,connect monolith|port,plug|put * port': async (g, c) => {
      if (c.noun === 'helmet' && !c.noun2 && c.verb === 'use') return wearHelmet(g);
      await connectHelmet(g);
    },
    'unplug|remove|take adapter': async (g) => {
      if (!g.flag('helmet_connected')) return false;
      await g.say("Unplug it? You'd have to explain to Denis why you're unplugging his most important cable. You leave it.");
    },
    // ---- the Monolith
    'push|use|open|attack|turnon button,reboot|turnoff|unplug|fix monolith,reboot|turnoff|unplug computer,reboot,turnoff power,push|pull|flip|turn monolith': async (g, c) => {
      if (c.verb === 'reboot' && !c.noun) return false;
      const d = g.actor('denis');
      if (d) {
        await g.approach('button');
        g.player.dir = 'up';
        await g.say("You reach for the Monolith's controls. Denis's hand clamps around your wrist with the speed of a man who has been waiting twenty-seven years to do exactly that.");
        d.faceToward(g.player.x, g.player.y);
        await g.talk(d, act3(g) ? "NO. We've had ENOUGH restarts for one lifetime. We fix it, we deploy it. Properly." : 'NO. Nobody touches that button. NOBODY. That button is how we got here.');
        return;
      }
      await g.say('Better not.');
    },
    'talk monolith': async (g) => {
      await g.say(act3(g) ? 'You tell the Monolith it\'s going to be alright. Its lights pulse amber in a way that might be agreement.' : 'You tell the Monolith to calm down. It panics harder. You know the feeling.');
    },
    'touch|pet|hug monolith': async (g) => {
      if (g.actor('denis')) await g.talk('denis', act3(g) ? "Gentle. She's had a long night." : 'Easy. EASY. She bites.');
    },
    'take reels|disk|lightpanel|monolith|computer': 'The Monolith weighs about as much as a small house. It is going nowhere. Neither, apparently, is Denis.',
    'kick|attack monolith': async (g) => {
      if (g.actor('denis')) await g.talk('denis', 'Kick her and I kick you. And I have been kicking things since 1971.');
    },
    // ---- the console & Act III actions
    'commit ?': commit,
    'review ?': async (g) => review(g),
    'test ?': async (g, c) => {
      if (c.noun === 'jarbug' || c.noun === 'jar') return false;
      await runTests(g);
    },
    'deploy ?': deploy,
    'wait ?': waitForMidnight,
    'use|type computer,type ?,login computer,turnon computer,type': async (g, c) => {
      if (act3(g)) {
        const w = c.rest.toLowerCase();
        if (/commit/.test(w)) return commit(g);
        if (/test/.test(w)) return runTests(g);
        if (/deploy|push|ship/.test(w)) return deploy(g);
        await useConsole(g, 450);
        return void (await g.say(
          !g.flag('committed')
            ? 'The console is online and ready. Your fix is sitting in the working tree, waiting to be committed.'
            : !g.flag('reviewed')
              ? 'Your commit is sitting there, waiting for a code review.'
              : !g.flag('tested')
                ? 'Reviewed and approved. The test suite is right there.'
                : g.flag('midnight')
                  ? 'Everything is committed, reviewed and tested. The deploy script is waiting.'
                  : 'Committed. Reviewed. Tested. The deploy script is right there. The clock on the wall is right there too.',
          { title: 'Console' },
        ));
      }
      await useConsole(g, 450);
      g.sfx('error');
      await g.say('You type at the console. It answers every command with the same two words: CORE PANIC. Then, after a pause: SEE DENIS.\n\nYou look at Denis. Denis looks at you.');
    },
    // ---- Denis's corner
    'sit|sleep cot,sleep': async (g) => {
      if (g.actor('denis')) return void (await g.talk('denis', act3(g) ? "After the deploy, you can sleep for a week. On your OWN cot." : 'That is MY cot. Get your own Y2K.'));
      await g.say('Tempting. But no.');
    },
    'eat|drink|take hotplate': async (g) => {
      if (g.actor('denis')) return void (await g.talk('denis', "Hands off. That's load-bearing ramen."));
      await g.say('Better not.');
    },
    'turnoff|turnon|use hotplate': "You'd better leave Denis's hot plate alone. It's the only thing in this room that has been running longer than the Monolith.",
    'take shirt': async (g) => {
      if (g.actor('denis')) return void (await g.talk('denis', "Touch the shirt and you'll be a Y2K survivor survivor."));
    },
    'take cables': async (g) => {
      if (g.actor('denis')) return void (await g.talk('denis', g.flag('denis_trust') ? "You've got the one you need. Leave the rest. They're SORTED." : 'Hands OFF my cables. You want a cable, you earn a cable.'));
    },
    'look/under floor,lift|open|pull|take floor,look/in floor': async (g) => {
      await g.approach([60, 148]);
      await g.pose(null, 'reach', 400);
      await g.say('You lift a floor tile and peer underneath. Cables. Forty years of cables, in strata, like rock layers: beige, gray, blue, and one brief, regrettable period of orange. Also a mummified sandwich. You put the tile back.');
    },
    'look computer': async (g, c) => {
      // "machine" / "computer" here means the Monolith; "terminal", "screen" etc. mean the console
      if (!['machine', 'computer'].includes(c.nounWord ?? '')) return false;
      await g.say(monolithLook(g));
    },
    'look light': async (g) => {
      await g.say(act3(g) ? 'The light panel on the Monolith: sixty little lamps, pulsing a calm, patient amber.' : 'The light panel on the Monolith: sixty little lamps flashing red and yellow in a pattern that, if you squint, spells out "HELP" in a font from 1987. Up on the ceiling, a pair of fluorescent fixtures hum along.');
    },
    'take|steal|look/through racks': 'The racks hum at you politely. You leave them be.',
    'take clock': "It's bolted to the wall. In a server room, everything is bolted to something.",
    'open|use door': async (g) => {
      if (act3(g) && !g.flag('deployed')) return void (await g.say(doorBlock(g)));
      await g.walk(null, 8, 168);
    },
    'listen,listen ?': async (g) => {
      await g.say(act3(g) ? 'The Monolith hums: low, steady, patient. The air conditioning roars. The ramen simmers.' : "The Monolith's hum has a wobble in it, like a washing machine with a brick inside. The air conditioning roars. The ramen simmers. Denis mutters at his terminal.");
    },
    'smell,smell ?': 'Ozone, hot dust, chicken ramen, and the unmistakable smell of 1987.',
    'read *': readAsLook,
  },
  enter(g, from) {
    // the only way in during Act II is logging out of the Core: that's Act III
    if (act(g) === 2) g.set('act', 3);
    mode = null;
    domHelmet = false;
    parts = null;
    blackFade = 0;
    g.music(act3(g) ? 'deploy' : 'serverroom');
    if (!act3(g)) {
      const d = addNpc(g, 'denis', 84, 144, 'right');
      d.data.gap = 20;
      d.behavior = fidget(['right', 'right', 'down', 'left'], 300);
      addNpc(g, 'adriana', CHAIR_A, CHAIR_Y, 'down', 'sit');
      adrianaSlumped(g);
      return;
    }
    // ---- Act III
    if (!g.flag('act3_arrived') && from !== '__restore') {
      const d = addNpc(g, 'denis', 120, 150, 'right');
      d.data.gap = 20;
      addNpc(g, 'adriana', CHAIR_A, CHAIR_Y, 'down', 'sit');
      adrianaSlumped(g);
      g.player.place(CHAIR_B, CHAIR_Y, 'down');
      g.player.pose = 'sit';
      g.player.visible = false; // still inside the Monolith; streams back in during the wake-up
      return;
    }
    // awake (or restored mid-wake-up: skip straight to awake)
    g.set('act3_arrived');
    const d = addNpc(g, 'denis', 150, CHAIR_Y + 12, 'right');
    d.data.gap = 20;
    d.behavior = fidget(['right', 'down', 'left'], 360);
    const a = addNpc(g, 'adriana', CHAIR_A - 2, CHAIR_Y + 16, 'down');
    a.data.gap = 18;
    a.behavior = fidget(['down', 'left', 'right'], 420);
    if (!g.walkmap.ok(g.player.x, g.player.y) || (Math.abs(g.player.x - CHAIR_B) < 4 && Math.abs(g.player.y - CHAIR_Y) < 4)) g.player.place(CHAIR_B + 1, CHAIR_Y + 14, 'down');
    g.player.pose = null;
  },
  afterEnter: async (g, from) => {
    if (act3(g)) {
      if (!g.flag('act3_arrived')) await wakeScene(g);
      return;
    }
    if (from === 'basement' && !g.flag('denis_met')) {
      g.set('denis_met');
      const d = g.actor('denis')!;
      d.faceToward(g.player.x, g.player.y);
      await convo(g, [
        ['denis', "So. You're the one who knew about Gertrude. Hmph. Name?"],
        ['me', 'Dominic. Third floor. Senior engineer.'],
        ['denis', "SENIOR. Hah. I've got cables older than you."],
        ['denis', "Look at her. Look at the state of her. Panicking. First time since 1999. Somebody RESTARTED her."],
        ['me', "Aidan. The intern. It's in the runbook."],
        ['denis', "The RUNBOOK. Step four was a JOKE. And now Adriana's gone in there after whatever's wrong, and she hasn't come out."],
        ['denis', 'If you want to help, talk to me. If you want to touch anything, DON\'T.'],
      ]);
    }
  },
  leave(g) {
    mode = null;
    domHelmet = false;
    parts = null;
    blackFade = 0;
    g.player.visible = true;
  },
  overlay(g, s, t) {
    const [txt, col] = display(g);
    animateServerRoom(s, t, curMode(g), {
      ...clockText(g),
      display: txt,
      displayColor: col,
      console: consoleLines(g),
      pulseA: !act3(g) || !g.flag('act3_arrived'),
      pulseB: mode === 'digitize' || (act3(g) && !g.flag('act3_arrived')),
    });
  },
  front(g, s, t) {
    const p = g.player;
    if (domHelmet && p.visible) drawHelmet(s, Math.round(p.x), headTop(p), 2, t);
    if (parts) drawParticles(s, parts, g.t - partStart, partReverse);
    if (blackFade > 0) {
      const lvl = Math.round(blackFade * 16);
      const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      for (let y = 0; y < 190; y++) for (let x = 0; x < 320; x++) if (B[((y & 3) << 2) | (x & 3)] < lvl) s.px[y * 320 + x] = 0;
    }
  },
};
