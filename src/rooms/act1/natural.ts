// Natural-English helpers shared by the Act I / Act III rooms: the things real
// first-time players type that the parser has no verb for ("make coffee",
// "where is Fahim?", "charge my phone"), "ask X about Y" topic matching, and
// READ falling back to LOOK for anything with writing on it.
import type { Game } from '../../engine/game';
import { parse, normalize, type Command } from '../../engine/parser';

/** Re-run a rewritten command through the normal dispatch (and fallback). */
export async function rerun(g: Game, text: string): Promise<boolean> {
  const c = parse(text, g.localNouns);
  g.resolveItemNouns(c);
  if (!(await g.dispatch(c))) await g.hooks.fallback(g, c);
  return true;
}

/** The subject of "ask X about Y" / "ask X for Y" / "tell X about Y", normalized ('' if none). */
export function topicOf(c: Command): string {
  const w = c.words;
  const i = w.findIndex((x) => x === 'about' || x === 'for' || x === 'regarding' || x === 'on');
  if (i >= 0) return w.slice(i + 1).join(' ');
  if (c.verb === 'ask' || c.verb === 'tell') return [c.noun2Word, c.unknown].filter(Boolean).join(' ');
  return '';
}

export type Topics = [RegExp, string | ((g: Game) => string)][];

/** The first topic line whose pattern matches, or null. */
export function topicLine(g: Game, topic: string, table: Topics): string | null {
  if (!topic) return null;
  for (const [re, line] of table) if (re.test(topic)) return typeof line === 'string' ? line : line(g);
  return null;
}

/** "read X" for a hotspot that has a description but no READ handler: show the description. */
export async function readAsLook(g: Game, c: Command): Promise<boolean | void> {
  // carried items keep their own READ (the manual, the note...)
  if (!c.noun || c.noun2 || g.has(c.noun)) return false;
  const hs = g.hotspot(c.noun);
  if (hs?.look) {
    if (typeof hs.look === 'string') return void (await g.say(hs.look));
    const out = await hs.look(g);
    if (typeof out === 'string') await g.say(out);
    return;
  }
  // room vocabulary with its own LOOK handler ("read terminal" -> the console)
  if (g.present(c.noun) && c.nounWord) return void (await rerun(g, `look ${c.nounWord}`));
  return false;
}

const act = (g: Game) => (g.flag('act') ?? 1) as number;
const here = (g: Game) => g.room?.id ?? '';

/** Where things and people are, for "where is X?" (Act I and the Act III server room). */
function whereIs(g: Game, what: string): string | null {
  const w = what.replace(/^(the|my|a|an|mr|ms)\s+/, '').trim();
  const is = (re: RegExp) => re.test(w);
  const a3 = act(g) >= 3;
  if (a3) {
    if (is(/^(adriana|architect)/)) return 'Right here in the server room, wide awake and waiting to review your code.';
    if (is(/^(denis|dennis|greybeard|graybeard)/)) return 'Right here, guarding the Monolith. He never really leaves.';
    if (is(/^(aidan|aiden|intern|nicholas|nick|mike|fahim|phil|krishna|everyone|everybody)/)) return 'Upstairs, three floors and one very long night away. The deploy is down here.';
    if (is(/^(clock|time)/)) return 'On the wall, above the newer racks. It is very interested in midnight.';
    if (is(/^(console|terminal|computer|keyboard)/)) return "The Monolith's operator console, right in front of the big machine.";
  }
  if (is(/^(aidan|aiden|intern|the kid)/))
    return g.flag('aidan_comforted')
      ? 'Aidan is back at his desk in the open office, writing a very blameless postmortem.'
      : 'Aidan said he was going to hide under his desk. Forever. His desk is in the open office, just up the aisle from your cubicle.';
  if (is(/^(nicholas|nick|nic)\b/)) return 'Nicholas is at his desk in the open office, behind a fortress of keyboards and an enormous pair of red headphones.';
  if (is(/^(mike|michael|salesman|sales)/))
    return g.flag('candy_bought') ? "Mike is back at his sales desk in the open office, on the phone with someone named Gary." : "Mike is in the break room, off the elevator lobby, losing an argument with a vending machine. You can probably hear him from here.";
  if (is(/^(fahim|sre|on call)/))
    return g.flag('fahim_awake') ? 'Fahim is in the NOC, off the elevator lobby, typing at an impossible speed.' : 'Fahim is in the NOC, off the elevator lobby. He has been on call for thirty-six hours, so "in the NOC" may be generous. His body is there, anyway.';
  if (is(/^(phil|ceo|boss|philip|phillip)\b/)) return "Phil is in his corner office, through the door on the left side of the open office. On the phone. Still.";
  if (is(/^(krishna|scientist)/)) return "Krishna is in the R&D lab, off the elevator lobby, past the elevators. The door has a badge reader.";
  if (is(/^(denis|dennis|sysadmin|greybeard|graybeard)/))
    return g.flag('door_open') ? 'Denis is in the server room in the basement, guarding the Monolith.' : 'Everybody says Denis lives in the basement, with the Monolith. Nobody is entirely sure they are joking.';
  if (is(/^(adriana|adrianna|architect)/))
    return g.flag('door_open')
      ? 'In the server room, slumped in a chair, wearing a helmet wired into the Monolith.'
      : g.flag('fahim_awake')
        ? "Fahim said she went down to the basement three hours ago, and nobody's heard from her since."
        : "Nobody up here seems to have seen Adriana in hours. Somebody who watches the systems all day might know more.";
  if (is(/^(rubber )?duck/)) return g.has('duck') ? 'Right here in your hand, ready to listen. TALK TO DUCK.' : 'In your desk drawer, back in your cubicle. Where else would a duck live?';
  if (is(/^(coffee )?mug|^cup$/)) return g.has('mug') || g.has('coffee') ? "In your hand. You'd never misplace that mug." : g.flag('mug_taken') ? 'Fahim has it now. It is in good hands.' : 'On your desk, in your cubicle.';
  if (is(/^(id )?badge|^lanyard/)) return g.has('badge') ? "Right here. Don't lose it." : 'Hanging on the coat hook in your cubicle.';
  if (is(/^(master )?key ?card|^keys?$/)) return g.has('keycard') ? 'In your pocket.' : "Clipped to Phil's belt. It opens every door in the building.";
  if (is(/^(ndi )?helmet/)) return g.has('helmet') || g.flag('helmet_connected') ? 'You have it.' : "On a pedestal in Krishna's R&D lab, sparking gently.";
  if (is(/^(power ?bank|battery|charger)/)) return g.has('powerbank') ? 'In your pocket, weighing about as much as a brick.' : g.flag('helmet_given') ? "Inside Krishna's helmet now." : "Clutched in Mike's hand, in the break room. He's very attached to it.";
  if (is(/^(coffee|coffee machine|coffeemaker|coffee maker|smartbrew|teapot|caffeine|espresso)/)) return 'The coffee machine is in the break room, off the elevator lobby: the first door past the open office.';
  if (is(/^(break ?room|kitchen|kitchenette|vending machine|snacks?|food)/)) return 'The break room is off the elevator lobby, through the doorway on the right side of the open office. First door on the left.';
  if (is(/^(noc|network operations)/)) return 'The NOC is off the elevator lobby, next to the break room.';
  if (is(/^(r ?(and|n)? ?d|lab|laboratory)/)) return "The R&D lab is off the elevator lobby, just past the elevators. It has a badge reader.";
  if (is(/^(stair|fire door|fire exit|exit)/)) return 'The stairwell is the red fire door at the far right end of the elevator lobby.';
  if (is(/^(elevator|lift)/)) return 'In the elevator lobby. Both out of order, mid-firmware-update.';
  if (is(/^(basement|server ?room|monolith|mainframe|data ?center)/))
    return here(g) === 'basement' ? 'Behind that heavy steel door at the end of this corridor.' : 'Down in the basement. The elevators are out, so: the stairwell, at the far end of the elevator lobby.';
  if (is(/^(lobby|hallway|hall|corridor)$/)) return here(g) === 'basement' ? "You're in it." : 'The elevator lobby is through the doorway on the right side of the open office.';
  if (is(/^(phils office|corner office|ceos office)/)) return 'Through the big oak door on the left side of the open office.';
  if (is(/^(open )?office$/)) return 'The open office sits between your cubicle and the elevator lobby.';
  if (is(/^(my )?(cubicle|desk)/)) return 'Down the aisle at the bottom left of the open office.';
  if (is(/^(bathroom|restroom|toilet|washroom|loo|mens room)/)) return 'Around the corner from the lobby, and locked down by the Monolith like everything else. You can hold it. You are a professional.';
  if (is(/^(quarter|coins?|money|change|cash)/)) return g.has('quarter') ? 'In your pocket. Twenty-five whole cents.' : g.flag('coin_found') ? 'You spent it. Wisely.' : "You don't have any change. Then again, where do stray coins end up in an office like this?";
  if (is(/^(sticky )?note|^post ?it/)) return g.has('note') ? 'In your pocket.' : g.flag('nick_helped') ? 'Nicholas is having it framed.' : "You wrote the answer down for Nicholas once. You stuck it somewhere you'd see every day and never look. Somewhere around your desk, probably.";
  if (is(/^(rgb )?keyboard|^rainbow warrior/)) return g.has('keyboard') ? 'In your hands, all the colors of the rainbow.' : "You mean a fancy one? Nicholas has thirty-seven of them.";
  if (is(/^(light|flashlight|torch|lamp)/)) return "Your phone's flashlight would be perfect, if your phone weren't at 0%. Something else that glows, then. Something with a LOT of LEDs.";
  if (is(/^gertrude/)) return g.state.visited['basement'] ? 'In a faded photo in the basement corridor, and in somebody\'s heart.' : "You've never heard of a Gertrude. Not yet, anyway.";
  if (is(/^(kevin|plant|succulent)/)) return 'Kevin is on your desk, in your cubicle, thriving on neglect.';
  if (is(/^(investors|henderson|mr henderson)/)) return "On the other end of Phil's phone, mostly. They arrive in person Monday at nine.";
  if (is(/^(everyone|everybody|people|coworkers)/)) return "Most people went home at five. The ones who didn't are scattered around the third floor: the open office, the break room, the NOC and the R&D lab.";
  return null;
}

// what "it" and "him/her" last referred to (per room; not saved)
let lastThing: { word: string; seq: number } | null = null;
let lastPerson: string | null = null;
let lastItem: { id: string; word: string; seq: number } | null = null; // a carried item: the one you just got, or just mentioned
let prevInv: string[] = [];
let lastRoom = '';
let seq = 0;
/** verbs whose object has to be something you're holding */
const HOLD_VERBS = ['put', 'give', 'show', 'throw', 'drop', 'wear', 'drink', 'eat', 'pour'];

/** Visible NPCs in the room (not Dominic). */
function npcsHere(g: Game) {
  return g.actors.filter((a) => a !== g.player && a.visible && a.name);
}

/** Natural phrasings for the Act I rooms (and the Act III server room). Call first from a room's raw hook. */
export async function act1Raw(g: Game, raw: string): Promise<boolean> {
  const n = normalize(raw);
  const room = here(g);
  const pc = parse(raw, g.localNouns);
  if (room !== lastRoom) {
    lastThing = lastPerson = null;
    lastRoom = room;
  }
  // whatever you just picked up is the most likely "it"
  const gained = g.state.inv.filter((i) => !prevInv.includes(i));
  if (gained.length) {
    const id = gained[gained.length - 1];
    lastItem = { id, word: g.items[id]?.nouns[0] ?? id, seq: ++seq };
  }
  prevInv = [...g.state.inv];

  // pronouns: "turn it off", "give it to him", "put it in the slot", "ask her about the bug"
  if (/\b(it|them|him|her)\b/.test(n) && !/\b(it|them)\b/.test(pc.verbWord ?? '')) {
    const isActor = (id: string | null) => !!(id && g.actor(id));
    const partOfNoun = /\b(it|them|him|her)\b/.test(`${pc.nounWord ?? ''} ${pc.noun2Word ?? ''}`);
    let out = n;
    if (!partOfNoun) {
      if (lastPerson && !isActor(pc.noun) && !isActor(pc.noun2)) out = out.replace(/\b(him|her)\b/, lastPerson);
      // "it" before any other noun is the object of the sentence
      const itPos = n.search(/\b(it|them)\b/);
      const nounPos = pc.nounWord ? n.indexOf(pc.nounWord) : -1;
      const itIsObject = itPos >= 0 && (!pc.noun || isActor(pc.noun) || (!pc.noun2 && nounPos > itPos));
      const item = lastItem && g.has(lastItem.id) ? lastItem : null;
      const ref =
        item && (HOLD_VERBS.includes(pc.verb ?? '') || !lastThing || item.seq > lastThing.seq) ? item.word : lastThing?.word ?? null;
      if (ref && itIsObject) out = out.replace(/\b(it|them)\b/, ref);
    }
    if (out !== n) return rerun(g, out);
  }
  if (pc.noun && pc.nounWord) {
    if (g.actor(pc.noun)) lastPerson = pc.nounWord;
    else if (!['self', 'room', 'everything', 'north', 'south', 'east', 'west', 'up', 'down'].includes(pc.noun)) {
      lastThing = { word: pc.nounWord, seq: ++seq };
      if (g.has(pc.noun)) lastItem = { id: pc.noun, word: pc.nounWord, seq };
    }
  }
  if (pc.noun2 && pc.noun2Word && g.actor(pc.noun2)) lastPerson = pc.noun2Word;

  // "ask about the helmet" with nobody named: ask whoever is here
  if ((pc.verb === 'ask' || pc.verb === 'tell') && !(pc.noun && g.actor(pc.noun)) && /^(ask|tell)\b/.test(n) && !/\bduck\b/.test(n)) {
    const who = npcsHere(g);
    if (who.length === 1) return rerun(g, n.replace(/^(ask|tell)\b/, `$1 ${who[0].id}`));
    if (who.length > 1) return said(g, `Ask whom? ${who.map((a) => a.name).join(' or ')}? (Try ASK ${who[0].name.toUpperCase()} ABOUT something.)`);
  }

  // "where is X?" / "where can I find X?"
  let m = /^(?:where(?: is| are|s|re)?|wheres|where can i find|where do i find|how do i find|how do i get to|how do i reach|how do i go to)\s+(.+)$/.exec(n);
  if (m && !/^(am i|is this|are we|this place)$/.test(m[1])) {
    const who = presentPerson(g, m[1]);
    await g.say(who ? `${who} is right here.` : whereIs(g, m[1]) ?? "You're not sure. LOOK around, or explain the problem to your duck.");
    return true;
  }
  m = /^(?:find|locate|look for|search for)\s+(?:the |my )?(.+)$/.exec(n);
  if (m) {
    const who = presentPerson(g, m[1]);
    if (who) return said(g, `${who} is right here.`);
    const ans = whereIs(g, m[1]);
    const c2 = parse(m[1], g.localNouns);
    if (ans && !(c2.noun && (g.hotspot(c2.noun) || g.has(c2.noun)))) return said(g, ans);
  }

  // talking to a duck you haven't picked up yet
  if (/^(talk|speak|chat|explain|ask|tell|consult)\b.*\bduck/.test(n) && !g.has('duck') && act(g) === 1) {
    if (room === 'cubicle')
      await g.say(g.flag('drawer_open') ? 'Your duck is right there in the open drawer, listening already. Pick it up first: TAKE DUCK.' : 'Your rubber duck lives in your desk drawer, which is closed. OPEN DRAWER, then TAKE DUCK.');
    else await g.say("Your rubber duck is still in your desk drawer, back in your cubicle. It's a good listener, but not THAT good.");
    return true;
  }

  // "make coffee" (the parser has no MAKE)
  if (/^(make|prepare|brew)( me| myself| us)?( a| some| another| fresh| more)?( cup| mug| pot| fresh)?( of)? (coffee|cup of coffee|espresso|latte|cappuccino|americano|joe|java)\b/.test(n) || /^(make|brew) (a )?(cup|pot|brew)$/.test(n)) {
    if (room === 'breakroom') return rerun(g, 'fill mug');
    if (act(g) >= 3) return said(g, 'Upstairs, very faintly, you imagine a coffee machine saying READY. Coffee after the deploy. Rule Number Two.');
    return said(
      g,
      g.flag('coffee_rebooted')
        ? 'The coffee machine is in the break room, off the elevator lobby. It is working again, thanks to you.'
        : "The coffee machine is in the break room, off the elevator lobby. Last you heard, it thinks it's a teapot.",
    );
  }
  if (/^make (a |some )?tea\b/.test(n)) return said(g, "The SmartBrew insists it's a teapot, but it has never made a cup of tea in its life. Coffee is the only beverage that will fix tonight.");

  // "charge my phone"
  if (/^(charge|recharge|plug in|plug|power up|juice up)\b.*\bphone\b/.test(n)) {
    if (g.has('powerbank')) return rerun(g, 'use power bank on phone');
    if (room === 'breakroom' && g.actor('mike'))
      return said(g, "Mike's power bank could charge your phone in seconds. Mike's power bank is also not leaving Mike's hand. Not on an empty stomach, anyway.");
    return said(g, 'Your charger is at home, plugged in next to your bed, where it does the most good. Your phone stays at 0%.');
  }

  // "water kevin" / "water the plants"
  if (/^water\b/.test(n) || /^give (some )?water to\b/.test(n)) {
    if (room === 'cubicle') return said(g, "You don't have any water. Kevin will be fine. Kevin is always fine. You watered him this morning, anyway.");
    if (room === 'office') return said(g, "There's the water cooler, but these plants have survived this long on neglect alone. Why ruin a good thing?");
    return said(g, "You don't have any water handy, and nothing here looks thirsty. Except Fahim, and he's thirsty for something else entirely.");
  }

  // "lift the keyboard" / "move keyboard" (the note puzzle)
  if (room === 'cubicle' && /^(lift|raise|move|flip|tilt|turn over|shift|pick up|look beneath|check beneath|peek under|peer under)\b.*\bkeyboard\b/.test(n)) return rerun(g, 'look under keyboard');

  // swearing (the parser only knows the words themselves)
  if (/^(swear|curse|cuss)\b/.test(n)) return rerun(g, 'damn');

  // "take everything (from the drawer)"
  m = /^(?:take|get|grab|pick up|steal|collect|empty) (?:all|everything|it all|the lot)\b(.*)$/.exec(n);
  if (m) {
    if (room === 'cubicle' && /drawer/.test(m[1]) && g.flag('drawer_open') && !g.flag('duck_taken')) return rerun(g, 'take duck');
    return said(g, "One thing at a time. You're a senior engineer, not a raccoon. LOOK around, then TAKE what you need by name.");
  }

  // LOOK AT <a word nobody here knows>: say so, instead of re-describing the whole room
  if (pc.verb === 'look' && !pc.noun && pc.unknown && !(room === 'stairwell' && !g.flag('keyboard_on'))) {
    const w = pc.unknown;
    if (/^(stuff|things?|items?|objects?|it|around|everywhere|anything|something)$/.test(w)) return false;
    if (/^(outside|out|view|scenery)$/.test(w) && g.present('window')) return rerun(g, 'look through window');
    return said(g, `You don't see any "${w}" here. (LOOK on its own describes the room; anything you see in the picture is worth a LOOK AT.)`);
  }

  // ducks are for squeezing (the parser has no SQUEEZE)
  if (/^(squeeze|squeak|honk|boop|squish)\b.*\bduck/.test(n) && g.has('duck')) return rerun(g, 'touch duck');

  return false;
}

/** The name of a visible NPC that the phrase refers to, if they're in this room. */
function presentPerson(g: Game, phrase: string): string | null {
  const c = parse(phrase, g.localNouns);
  const a = c.noun ? g.actor(c.noun) : null;
  return a && a !== g.player && a.visible && a.name ? a.name : null;
}

async function said(g: Game, text: string): Promise<boolean> {
  await g.say(text);
  return true;
}
