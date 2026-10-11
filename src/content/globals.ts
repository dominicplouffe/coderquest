// Global easter eggs and commands that work anywhere.
import type { Game } from '../engine/game';
import type { Response } from '../engine/types';
import { normalize, parse } from '../engine/parser';

const PATHS: Record<string, string> = {
  cubicle: '/hq/3f/cubicles/dominic',
  office: '/hq/3f/open-office',
  phil: '/hq/3f/ceo',
  hallway: '/hq/3f/lobby',
  breakroom: '/hq/3f/break-room',
  noc: '/hq/3f/noc',
  lab: '/hq/3f/r-and-d',
  stairwell: '/hq/stairwell',
  basement: '/hq/basement',
  serverroom: '/hq/basement/server-room',
  boot: '/monolith/boot',
  heap: '/monolith/heap',
  forest: '/monolith/spaghetti',
  stack: '/monolith/stack',
  loop: '/monolith/while-true',
  deadlock: '/monolith/deadlock',
  bridge: '/dev/null',
  dragon: '/monolith/legacy',
  core: '/monolith/core',
};

async function said(g: Game, text: string): Promise<boolean> {
  await g.say(text);
  return true;
}

/** Re-run a rewritten command through the normal dispatch. */
async function rerun(g: Game, text: string): Promise<boolean> {
  const c = parse(text, g.localNouns);
  g.resolveItemNouns(c);
  if (c.verb === 'look' && !c.noun && c.unknown) {
    if (/monad/.test(text)) return said(g, "A monad is just a monoid in the category of endofunctors. What's the problem?");
    return said(g, `You don't see any "${c.unknown}" here, and you're honestly not sure what one is.`);
  }
  if (!(await g.dispatch(c))) await g.hooks.fallback(g, c);
  return true;
}

export async function globalRaw(g: Game, raw: string): Promise<boolean> {
  const t = raw.trim().toLowerCase();
  const n = normalize(raw);
  const act = g.flag('act') ?? 1;
  // natural questions people type
  if (/^(where am i|where is this|what is this place|whats this place|where are we)$/.test(n)) {
    await g.say(`You're in ${g.room?.title ?? 'a mysterious place'}.`);
    return rerun(g, 'look');
  }
  if (/^(who am i|what am i)$/.test(n)) return rerun(g, 'look self');
  if (/^(what now|now what|what next|what should i do|what do i do|what do i do now|what should i do now|i am lost|im lost|i dont know what to do|any ideas|idea|ideas)$/.test(n))
    return said(g, g.has('duck') ? "When in doubt, LOOK at everything. And when that fails: TALK TO DUCK. It's what it's there for." : 'When in doubt, LOOK at everything. Your desk drawer might hold something helpful, too.');
  let m = /^(?:what|whats) (?:is |are )?(?:this |that |the |a |an )?(.+)$/.exec(n);
  if (m && !/^(this place|now|next|up)$/.test(m[1])) return rerun(g, `look ${m[1]}`);
  m = /^(?:who|whos) (?:is |are )?(?:that |the )?(.+)$/.exec(n);
  if (m) return rerun(g, `look ${m[1]}`);
  if (/^how (do|can|should) i\b/.test(n) || /^(why|when) /.test(n))
    return said(g, g.has('duck') ? 'Good question. Ask your duck: TALK TO DUCK. (Ask twice for a more specific answer.)' : "Good question. If only you had someone to talk your problems through with.");
  if (['yes', 'no', 'ok', 'okay', 'sure', 'nope', 'yep', 'maybe', 'y', 'k'].includes(n)) return said(g, 'Okay.');
  if (['thanks', 'thank you', 'thx', 'ty'].includes(n)) return said(g, "You're welcome.");
  if (/^sudo\b/.test(t)) {
    if (/make me a sandwich/.test(t)) await g.say('Okay.');
    else await g.say('Dominic is not in the sudoers file. This incident will be reported.');
    return true;
  }
  if (/\brm\s+-(rf|fr|r)\b/.test(t)) {
    if (act === 2) {
      g.sfx('zap');
      g.flash(15, 200);
      g.player.visible = false;
      await g.wait(600);
      await g.die('You typed "rm -rf" while being made of data. You have been recursively, forcefully, and very thoroughly deleted.\n\nThere is no undo. There is no trash can. There is only regret.', { title: 'File Not Found' });
      return true;
    }
    await g.say("You'd need a terminal for that. And a much, much worse day.");
    return true;
  }
  if (n === 'whoami') return said(g, 'dominic');
  if (n === 'pwd') return said(g, PATHS[g.room?.id ?? ''] ?? '/');
  if (n === 'ls' || n === 'dir' || n === 'ls la' || n === 'ls al') {
    const items = g.state.inv.map((i) => g.items[i]?.name ?? i);
    await g.say(items.length ? `You list your belongings:\n\n${items.join('\n')}` : "You're not carrying anything.");
    return true;
  }
  if (n === 'make' || n === 'make all') return said(g, 'make: *** No targets specified and no makefile found. Stop.');
  if (n === 'git blame') return said(g, "git blame says it was you. It's always you.");
  if (n === 'git status' && act < 3)
    return said(g, "On branch main.\nYour branch is up to date with 'origin/main'.\nNothing to commit, working tree clean.\n\nIf only the rest of your life were this tidy.");
  if (n === 'git log') return said(g, 'commit 1a2b3c4 (HEAD -> main)\nAuthor: Aidan <intern>\n    Fix typo in README\n\ncommit 0000001\nAuthor: Denis\nDate: 1987\n    Initial commit. TODO: fix dates before 2000');
  if (n === 'hello world' || n === 'hello computer') return said(g, 'Hello, Dominic.');
  if (n === '42' || n === 'the answer') return said(g, "That's the answer, all right. But what was the question?");
  if (['iddqd', 'idkfa', 'cheat', 'god mode', 'godmode', 'win', 'win game', 'win the game'].includes(n)) return said(g, 'If only it were that easy. God mode is scheduled for the next sprint.');
  if (['up up down down left right left right b a', 'konami', 'konami code'].includes(n)) return said(g, 'Thirty extra lives! Just kidding. You get one. Use it wisely.');
  if (['ctrl c', 'control c', 'c', 'ctrl alt delete', 'ctrl alt del', 'control alt delete'].includes(n) && g.room?.id !== 'loop')
    return said(g, "There's nothing running here that you can interrupt. Except maybe yourself.");
  if (/^:(q|wq|q!|x)$/.test(t) && g.room?.id !== 'stack') return said(g, "You're not in Vim. Thank goodness.");
  if (n === 'turn it off and on again' || n === 'turn off and on again' || n === 'have you tried turning it off and on again')
    return false; // let rooms handle via verbs
  if (n === 'fizzbuzz') return said(g, '1, 2, Fizz, 4, Buzz, Fizz, 7... You stop. This is not a job interview.');
  if (n === 'stack overflow' || n === 'google it' || n === 'google') return said(g, act === 2 ? 'The Stack Tower is west of the Spaghetti Forest.' : 'Without your phone, you are on your own. Well, you and the duck.');
  return false;
}

export const globalVerbs: Record<string, Response> = {
  'look eyes': 'Your eyes are bloodshot from twelve hours of staring at a monitor.',
  'look hands': 'The hands of a programmer: fast, precise, and slightly carpal-tunnelled.',
  'touch self,hug self': 'You give yourself a reassuring pat on the back. You deserve it.',
  'attack self': 'Self-harm is not the answer, even on a Friday deploy.',
  'eat|drink self': "You're not that hungry.",
};
