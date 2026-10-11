// What happens when nothing more specific handles a command.
import type { Game } from '../engine/game';
import type { Command } from '../engine/parser';
import { inArea, areaCenter } from '../engine/game';

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

function nounName(g: Game, c: Command, which: 1 | 2 = 1): string {
  const id = which === 1 ? c.noun : c.noun2;
  const word = which === 1 ? c.nounWord : c.noun2Word;
  if (id && g.items[id] && g.has(id)) return g.items[id].name.toLowerCase().replace(/^your /, '');
  const a = id ? g.actor(id) : null;
  if (a) return a.name;
  return word ?? id ?? 'that';
}

function isPerson(g: Game, id: string | null) {
  return !!(id && g.actor(id));
}

async function goDir(g: Game, dir: string): Promise<boolean> {
  const exits = (g.room?.exits ?? []).filter((e) => (e.when?.(g) ?? true) && e.dir && e.dir.split('|').includes(dir));
  if (!exits.length) return false;
  const e = exits[0];
  const msg = e.blocked?.(g);
  if (msg) {
    await g.say(msg);
    return true;
  }
  // walk to a walkable point inside (or nearest to) the exit area, then leave
  const c = areaCenter(e.area);
  let best = g.walkmap.nearest(c.x, c.y);
  if (best && !inArea(e.area, best.x, best.y)) {
    // search the area for any walkable point
    const a = e.area;
    const [x0, y0, w, h] = a.length === 4 ? a : [0, 0, 320, 190];
    outer: for (let y = y0; y < y0 + h; y += 2)
      for (let x = x0; x < x0 + w; x += 2)
        if (g.walkmap.ok(x, y) && inArea(a, x, y)) {
          best = { x, y };
          break outer;
        }
  }
  if (best) await g.walk(null, best.x, best.y);
  g.goto(e.to, e.at);
  return true;
}

export async function fallback(g: Game, c: Command) {
  const act = g.flag('act') ?? 1;
  if (!c.verb) {
    const w = c.unknown ?? c.words[0] ?? '';
    return g.say(
      pick([
        `I don't understand "${w}".`,
        `Sorry, "${w}" isn't a word I know. Try something like LOOK, TAKE, USE, TALK TO, or GIVE.`,
        `"${w}"? I'm a text parser, not a mind reader.`,
      ]),
    );
  }
  if (!c.noun && c.unknown && !['say', 'type', 'go', 'wait', 'look'].includes(c.verb)) {
    return g.say(pick([`You don't see any "${c.unknown}" around here.`, `I don't know what a "${c.unknown}" is, but there isn't one here.`]));
  }
  // a noun that isn't here at all
  if (c.noun && !g.present(c.noun) && !['go', 'say', 'type', 'ask', 'tell', 'think', 'call', 'help', 'hint'].includes(c.verb)) {
    if (!['self', 'floor', 'wall', 'ceiling', 'eyes', 'hands', 'room', 'everything', 'north', 'south', 'east', 'west', 'up', 'down'].includes(c.noun)) {
      return g.say(pick(["You don't see that here.", `There's no ${c.nounWord ?? 'such thing'} here.`, `What ${c.nounWord ?? 'thing'}? You don't see one.`]));
    }
  }
  const n = nounName(g, c);
  const person = isPerson(g, c.noun);
  switch (c.verb) {
    case 'look':
      if (!c.noun) return g.say(act >= 2 ? 'Glowing code stretches in every direction.' : 'Nothing out of the ordinary. Well, nothing more out of the ordinary than usual.');
      if (c.noun === 'self') return g.say(act >= 2 ? "You're made of glowing pixels now, and frankly you've never looked better." : "You're Dominic: senior software engineer, debugger of last resort, owner of a hoodie that has seen things. You look like someone who should have left the office an hour ago.");
      if (c.noun === 'floor') return g.say(act >= 2 ? 'The floor is made of light. It hums faintly in A-flat.' : "It's the floor. It's doing its job, which is more than production can say.");
      if (c.noun === 'ceiling') return g.say('Nothing up there but the ceiling, holding up the rest of the building.');
      if (c.noun === 'wall') return g.say("It's a wall. It's not going anywhere, and neither is this outage unless you do something.");
      if (['north', 'south', 'east', 'west', 'up', 'down'].includes(c.noun)) return g.say(`You look ${c.noun}. Nothing new.`);
      return g.say(person ? `${n} looks back at you.` : pick([`It's just ${aOr(n)}. Nothing special.`, `You see nothing special about the ${n}.`, `The ${n} looks exactly as you'd expect.`]));
    case 'search':
      return g.say(c.noun ? `You search the ${n} thoroughly and find nothing of interest.` : 'You poke around but find nothing new.');
    case 'read':
      return g.say(c.noun ? `There's nothing on the ${n} worth reading.` : 'Read what?');
    case 'take':
      if (c.noun && g.has(c.noun)) return g.say('You already have it.');
      if (person) return g.say(`${n} is not something you can put in your pocket. Not without an HR investigation.`);
      if (!c.noun) return g.say('Take what?');
      return g.say(pick(["You can't take that.", 'That would not fit in your pockets.', "It's better off where it is.", 'Nice try, but no.']));
    case 'drop':
      if (c.noun && g.has(c.noun)) return g.say("You'd better hang on to that. You never know when you'll need it.");
      return g.say("You don't have that.");
    case 'use':
      if (!c.noun) return g.say('Use what?');
      if (c.noun && c.noun2) return g.say(`You can't figure out how to use the ${n} with the ${nounName(g, c, 2)}.`);
      return g.say(pick([`You can't figure out how to use the ${n} here.`, `Using the ${n} here doesn't accomplish anything.`]));
    case 'open':
    case 'unlock':
      return g.say(c.noun ? `The ${n} doesn't open.` : 'Open what?');
    case 'close':
      return g.say(c.noun ? `The ${n} isn't something you can close.` : 'Close what?');
    case 'close_eyes':
    case 'cover':
      return g.say('You close your eyes and count to ten. When you open them, everything is exactly where you left it, including all of your problems.');
    case 'open_eyes':
      return g.say('Your eyes are already open. Painfully so.');
    case 'talk':
      if (!c.noun) {
        const npc = g.actors.find((a) => a !== g.player && a.visible && a.name);
        if (npc) return g.say(`Try TALK TO ${npc.name.toUpperCase()}.`);
        return g.say('There is nobody here to talk to.');
      }
      if (c.noun === 'self') return g.say('Talking to yourself? Maybe you should talk to your duck instead. It\'s a better listener.');
      if (person) return g.say(`${n} doesn't seem to have anything else to say right now.`);
      return g.say(pick([`The ${n} doesn't respond. Most things don't.`, `You strike up a conversation with the ${n}. It's a better listener than most of your coworkers, but a worse talker.`]));
    case 'ask':
    case 'tell':
      if (person) return g.say(`${n} shrugs. "I don't know anything about that."`);
      return g.say('There is nobody here to ask.');
    case 'say':
      if (!c.rest) return g.say('Say what?');
      return g.say(`You say "${c.rest}". Nobody seems to care.`);
    case 'give':
    case 'show':
      if (c.noun && !g.has(c.noun)) return g.say(`You don't have ${aOr(n)}.`);
      if (c.noun2 && isPerson(g, c.noun2)) return g.say(`${nounName(g, c, 2)} doesn't seem interested in the ${n}.`);
      if (c.noun2) return g.say(`The ${nounName(g, c, 2)} doesn't seem interested.`);
      return g.say(`${c.verb === 'give' ? 'Give' : 'Show'} it to whom?`);
    case 'push':
    case 'pull':
    case 'turn':
    case 'flip':
    case 'shake':
    case 'tap':
    case 'touch':
      if (person && c.verb === 'tap') return g.say(`${n} glances at you. "Yeah?"`);
      if (person && c.verb === 'touch') return g.say(`${n} gives you a look that says "personal space."`);
      return g.say(c.noun ? pick(['Nothing happens.', `You ${c.verbWord} the ${n}. Nothing happens.`, 'That accomplishes nothing.']) : `${cap(c.verbWord ?? c.verb)} what?`);
    case 'turnon':
      return g.say(c.noun ? `You can't turn the ${n} on.` : 'Turn on what?');
    case 'turnoff':
      return g.say(c.noun ? `You can't turn the ${n} off.` : 'Turn off what?');
    case 'reboot':
      return g.say(c.noun ? `Have you tried turning the ${n} off and on again? You can't, actually. It doesn't have a switch.` : 'Reboot what?');
    case 'plug':
    case 'unplug':
      return g.say(c.noun ? `You can't ${c.verbWord} the ${n}.` : `${cap(c.verbWord ?? c.verb)} what?`);
    case 'put':
      if (c.noun && !g.has(c.noun)) return g.say(`You don't have ${aOr(n)}.`);
      return g.say(c.noun2 ? `Putting the ${n} there wouldn't accomplish anything.` : 'Put it where?');
    case 'wear':
      return g.say(c.noun ? `You can't wear the ${n}.` : 'Wear what?');
    case 'remove':
      return g.say(c.noun ? `You aren't wearing the ${n}.` : 'Remove what?');
    case 'pry':
      return g.say(c.noun ? `You can't pry anything off the ${n}.` : 'Pry what?');
    case 'drink':
      return g.say(c.noun ? `You can't drink the ${n}.` : "You're thirsty, but there's nothing here to drink.");
    case 'eat':
      return g.say(c.noun ? `The ${n} is not on the menu.` : "You're hungry, but there's no time for dinner. Production is down.");
    case 'smell':
      return g.say(act >= 2 ? 'Cyberspace smells faintly of ozone and old floppy disks.' : 'It smells like recycled air, burnt coffee, and panic.');
    case 'listen':
      return g.say(act >= 2 ? 'You hear the steady hum of a billion transistors. And, distantly, something buzzing.' : 'You hear the hum of the ventilation and, somewhere, a pager going off.');
    case 'kiss':
      return g.say("Wrong game. You're thinking of a certain gentleman in a leisure suit.");
    case 'hug':
      return g.say(person ? `${n} awkwardly pats you on the back. It's been a long day for everyone.` : `You hug the ${n}. It doesn't hug back.`);
    case 'attack':
    case 'break':
      if (c.verb === 'break' && !c.noun) return g.say('Break what? Breaking things is how we got into this mess in the first place.');
      return g.say(person ? `Assaulting ${n} would get you fired, arrested, and featured in a very awkward all-hands meeting.` : 'Violence is never the answer. Well, almost never. Not now, anyway.');
    case 'throw':
      return g.say(c.noun && g.has(c.noun) ? "You'd better not throw that around. You might need it." : 'Throw what?');
    case 'climb':
      return g.say("You're a software engineer, not a mountaineer.");
    case 'jump':
      return g.say('You jump up and down. You feel slightly sillier, but no closer to fixing production.');
    case 'sit':
      return g.say("There's no time to sit around. Production is down!");
    case 'stand':
      return g.say("You're already standing.");
    case 'sleep':
      return g.say('Sleep? On a Friday night with production down? You can sleep when the dashboards are green.');
    case 'type':
      return g.say("There's nothing here to type on.");
    case 'login':
      return g.say("There's nothing here to log in to.");
    case 'logout':
      return g.say(act === 2 ? "You'll have to find the way out first. The Core, probably." : "You're not logged in to anything.");
    case 'call':
      return g.say('Your phone battery died at lunch. Typical.');
    case 'lick':
      return g.say("Gross. You've been in this building for twelve hours. You don't know where anything has been.");
    case 'dance':
      return g.say('You bust out a move. Nobody saw. That is probably for the best.');
    case 'sing':
      return g.say("You hum the Coder's Quest theme. It's catchy. Somebody should put it in a game.");
    case 'pray':
      return g.say('You offer a quick prayer to the gods of uptime. They do not answer. They never do.');
    case 'cry':
      return g.say("There's no crying in software engineering. Well, there is. But not right now.");
    case 'laugh':
      return g.say("You laugh. It comes out a little manic. That's normal for a Friday deploy.");
    case 'think':
      return g.say(g.has('duck') ? 'You think hard. Then you remember: your rubber duck is an excellent listener. TALK TO DUCK.' : 'You think hard. If only you had someone (or something) to talk your problems through with.');
    case 'hint':
      return g.say('If only you had someone (or something) to talk your problems through with. Something small, yellow, and squeaky, perhaps.');
    case 'wait':
      return g.say(pick(['Time passes.', 'You wait. Production stays down.', "You wait. Nothing fixes itself. It never does."]));
    case 'go':
    case 'enter':
    case 'exit': {
      if (c.noun && ['north', 'south', 'east', 'west', 'up', 'down'].includes(c.noun)) {
        if (await goDir(g, c.noun)) return;
        return g.say("You can't go that way.");
      }
      if (c.verb === 'exit' || (c.verb === 'go' && !c.noun)) {
        const exits = (g.room?.exits ?? []).filter((e) => (e.when?.(g) ?? true) && e.dir);
        if (exits.length === 1) {
          await goDir(g, exits[0].dir!.split('|')[0]);
          return;
        }
        return g.say('Which way? Walk to an exit, or try a direction like GO NORTH.');
      }
      if (c.noun && g.hotspot(c.noun)) {
        await g.approach(c.noun);
        return;
      }
      if (c.noun && g.actor(c.noun)) {
        await g.approach(g.actor(c.noun)!);
        return;
      }
      return g.say("You can't go there from here. Try walking with the arrow keys or the mouse.");
    }
    case 'escape':
      return g.say("There's nothing to escape from here. Not yet, anyway.");
    case 'knock':
      return g.say(c.noun ? `Knock knock. Nobody answers the ${n}.` : 'Knock on what?');
    case 'fix':
      return g.say(c.noun ? `You can't fix the ${n}. Not without finding the real problem first.` : 'Fix what? You have to find the problem before you can fix it.');
    case 'debug':
      return g.say("Debugging requires something to debug. You haven't found the real problem yet.");
    case 'deploy':
      return g.say(act >= 3 ? 'Deploy from where? You need a terminal.' : "Deploy?! Deploying is what got everyone into this mess. Let's find out what's actually broken first.");
    case 'commit':
      return g.say("There's nothing to commit. Your working tree is clean. Your conscience, less so.");
    case 'test':
      return g.say('All zero of your tests pass. Technically a 100% success rate.');
    case 'review':
      return g.say("There's nothing to review yet.");
    case 'fill':
      return g.say(c.noun ? `You can't fill the ${n} here.` : 'Fill what?');
    case 'pour':
      return g.say("There's nothing here to pour.");
    case 'buy':
      return g.say("There's nothing here to buy.");
    case 'wake':
      return g.say(person ? `${n} is already awake. Mostly.` : "You're awake. Unfortunately.");
    case 'comfort':
      return g.say(person ? `${n} appreciates the sentiment.` : "That doesn't need comforting.");
    case 'thank':
      return g.say(person ? `${n} nods. "Anytime."` : "You're welcome.");
    case 'apologize':
      return g.say(person ? `${n} looks puzzled. "For what?"` : 'Apology noted.');
    case 'explain':
      return g.say(g.has('duck') ? 'Explain it to whom? Your duck is a great listener. TALK TO DUCK.' : 'There is nobody here to explain it to.');
    case 'catch':
      return g.say('Catch what?');
    case 'hide':
      return g.say("There's nowhere to hide. Besides, hiding from production problems never works. Ask Aidan.");
    case 'smile':
      return g.say(person ? `You smile at ${n}. ${n} smiles back, a little confused.` : "You smile. It's a good look on you.");
    case 'blink':
      return g.say('You blink. Still here.');
    case 'play':
      return g.say('No time for games. Well, other than this one.');
    case 'dig':
      return g.say("There's nothing to dig with, and nothing to dig in.");
    case 'swim':
      return g.say("There's nowhere to swim. Except in technical debt.");
    case 'fly':
      return g.say("You flap your arms. You do not fly. You're a developer, not a bird.");
    case 'cut':
      return g.say("You don't have anything to cut with.");
    case 'tie':
      return g.say("You can't tie that.");
    case 'center':
      return g.say('Centering things is famously the hardest problem in computer science.');
    case 'hack':
      return g.say("You're a professional. Professionals don't 'hack'. They 'engineer creative solutions under pressure'.");
    case 'sudo':
      return g.say('Dominic is not in the sudoers file. This incident will be reported.');
    case 'help':
      return g.hooks.help(g);
    case 'score':
      return g.say(`Your score is ${g.state.score} out of 256. You have made ${g.state.moves} moves and died ${g.state.deaths} time${g.state.deaths === 1 ? '' : 's'}.`);
    case 'version':
      return g.hooks.about(g);
    case 'inventory':
      return g.showInventory();
    case 'curse':
      return g.say(pick(['Hey! Watch your language. This is a family adventure.', 'Such language! What would your code reviewer say?', "That kind of talk won't fix production."]));
    case 'xyzzy':
      return g.say('A hollow voice says, "Fool."');
    default:
      return g.say(pick(["You can't do that.", "That doesn't work.", "Let's not and say we did."]));
  }
}

function aOr(n: string) {
  return /^[aeiou]/i.test(n) ? `an ${n}` : `a ${n}`;
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
