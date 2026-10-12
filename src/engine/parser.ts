// A Sierra-style text parser. Turns "give the coffee to Fahim" into
// { verb: 'give', noun: 'coffee', prep: 'to', noun2: 'fahim' }.

export interface Command {
  raw: string;
  text: string;
  words: string[];
  verb: string | null;
  /** the verb phrase as typed */
  verbWord: string | null;
  noun: string | null;
  nounWord: string | null;
  prep: string | null;
  noun2: string | null;
  noun2Word: string | null;
  num: number | null;
  /** first word we could not understand */
  unknown: string | null;
  /** everything after the verb, as typed (for say/type) */
  rest: string;
  is(spec: string): boolean;
}

// canonical verb -> phrases. A phrase may carry an implied preposition via "phrase>prep".
const VERBS: Record<string, string[]> = {
  look: [
    'look at', 'look in>in', 'look inside>in', 'look into>in', 'look under>under', 'look beneath>under',
    'look below>under', 'look behind>behind', 'look through>through', 'look out>through', 'look out of>through',
    'look on>on', 'look over', 'look around', 'look', 'l', 'examine', 'x', 'inspect', 'check out', 'check',
    'view', 'observe', 'study', 'watch', 'see', 'peer at', 'peer into>in', 'peer', 'gaze at', 'gaze',
    'stare at', 'stare', 'glance at', 'glance', 'describe', 'admire', 'ogle',
  ],
  search: ['search through', 'search in', 'search', 'rummage through', 'rummage in', 'rummage', 'frisk', 'dig through', 'look for', 'find'],
  read: ['read', 'peruse', 'skim'],
  take: ['pick up', 'take', 'get', 'grab', 'obtain', 'acquire', 'steal', 'collect', 'snatch', 'nab', 'snag', 'borrow', 'retrieve', 'keep', 'carry'],
  drop: ['put down', 'drop', 'discard', 'throw away', 'dump', 'ditch', 'release'],
  use: ['use', 'utilize', 'operate', 'apply', 'swipe', 'scan', 'employ', 'try'],
  open: ['open up', 'open', 'pry open'],
  unlock: ['unlock'],
  close: ['close', 'shut'],
  talk: [
    'talk to', 'talk with', 'talk', 'speak to', 'speak with', 'speak', 'chat with', 'chat to', 'chat',
    'converse with', 'converse', 'greet', 'hello', 'hi', 'hey', 'howdy', 'interrogate', 'question',
  ],
  ask: ['ask'],
  tell: ['tell', 'inform', 'warn'],
  say: ['say', 'shout', 'yell', 'scream', 'whisper', 'answer', 'reply', 'respond', 'utter', 'speak the', 'cry out'],
  give: ['give', 'hand', 'offer', 'feed', 'donate', 'return', 'trade'],
  show: ['show', 'present', 'flash'],
  push: ['push', 'press', 'shove', 'depress', 'hit button>on', 'click'],
  pull: ['pull', 'yank', 'tug', 'drag'],
  turnon: ['turn on', 'switch on', 'power on', 'power up', 'activate', 'enable', 'boot up', 'boot', 'start up', 'light up', 'illuminate'],
  turnoff: ['turn off', 'switch off', 'power off', 'power down', 'deactivate', 'disable', 'shut down', 'shutdown', 'shut off', 'kill power to'],
  turn: ['turn', 'rotate', 'twist', 'spin', 'switch'],
  flip: ['flip', 'toggle'],
  reboot: ['reboot', 'restart', 'reset', 'power cycle', 'cycle'],
  unplug: ['unplug', 'disconnect', 'detach'],
  plug: ['plug in', 'plug', 'connect', 'hook up', 'attach', 'jack into>into', 'jack in'],
  put: ['put', 'place', 'insert', 'stick', 'set', 'lay', 'slide', 'load', 'drop in>in', 'pop'],
  wear: ['put on', 'wear', 'don', 'equip', 'strap on'],
  remove: ['take off', 'remove', 'doff', 'unequip', 'pull off'],
  pry: ['pry off', 'pry', 'pop off', 'prise', 'yank off', 'detach key'],
  drink: ['drink', 'sip', 'gulp', 'chug', 'quaff', 'slurp'],
  eat: ['eat', 'consume', 'devour', 'munch', 'bite', 'nibble', 'chew'],
  smell: ['smell', 'sniff', 'whiff'],
  listen: ['listen to', 'listen', 'hear'],
  touch: ['touch', 'feel', 'pet', 'rub', 'stroke', 'pat', 'caress'],
  kiss: ['kiss', 'smooch', 'make out with'],
  hug: ['hug', 'embrace', 'cuddle'],
  attack: ['attack', 'hit', 'punch', 'kick', 'kill', 'fight', 'strike', 'slap', 'smack', 'beat', 'destroy', 'smash', 'murder', 'stab', 'whack', 'bash', 'shoot'],
  break: ['break out of', 'break out', 'break'],
  throw: ['throw', 'toss', 'hurl', 'chuck', 'fling', 'lob'],
  climb: ['climb up', 'climb down', 'climb', 'scale', 'ascend', 'descend'],
  jump: ['jump over', 'jump into>into', 'jump in>into', 'jump off', 'jump out', 'jump', 'leap', 'hop'],
  sit: ['sit on', 'sit in', 'sit down', 'sit at', 'sit'],
  stand: ['stand up', 'stand', 'get up'],
  sleep: ['sleep', 'nap', 'lie down', 'lay down', 'rest', 'snooze'],
  type: ['type in', 'type', 'key in', 'input', 'write', 'enter password', 'code'],
  login: ['log in to', 'log into', 'log in', 'login', 'log on', 'logon', 'sign in'],
  logout: ['log out', 'logout', 'log off', 'logoff', 'sign out', 'disconnect from', 'jack out', 'unplug from'],
  call: ['call', 'phone', 'dial', 'ring', 'telephone'],
  lick: ['lick'],
  dance: ['dance', 'boogie'],
  sing: ['sing', 'hum', 'whistle'],
  pray: ['pray'],
  cry: ['cry', 'weep', 'sob'],
  laugh: ['laugh', 'giggle', 'chuckle'],
  think: ['think', 'ponder', 'contemplate', 'meditate'],
  wait: ['wait', 'z', 'stay', 'idle', 'linger', 'sit tight'],
  go: ['go to', 'go into>into', 'go in>into', 'go through>through', 'go', 'walk to', 'walk into>into', 'walk', 'run to', 'run', 'move to', 'move', 'head to', 'head', 'travel to', 'proceed', 'step into>into', 'step', 'cross', 'follow'],
  enter: ['enter', 'get in', 'board'],
  exit: ['exit', 'leave', 'get out', 'go out', 'go back', 'back'],
  escape: ['escape', 'esc', 'flee'],
  knock: ['knock on', 'knock at', 'knock', 'rap on', 'bang on', 'pound on'],
  fix: ['fix', 'repair', 'patch', 'solve', 'correct', 'mend', 'edit', 'change', 'modify', 'rewrite', 'refactor', 'update'],
  debug: ['debug', 'troubleshoot', 'diagnose', 'trace'],
  deploy: ['deploy', 'ship it', 'ship', 'release', 'git push', 'push to production', 'push to prod', 'push the fix', 'push fix', 'go live', 'launch'],
  commit: ['git commit', 'commit', 'check in', 'merge'],
  test: ['run tests', 'run the tests', 'run test', 'run unit tests', 'run the unit tests', 'test', 'execute tests'],
  review: ['review', 'approve', 'code review'],
  fill: ['fill up', 'fill', 'refill', 'top up', 'brew'],
  pour: ['pour', 'spill', 'empty'],
  buy: ['buy', 'purchase', 'pay for', 'order', 'vend'],
  shake: ['shake', 'rock', 'tilt', 'jostle', 'wiggle', 'jiggle', 'rattle'],
  tap: ['tap on', 'tap', 'nudge', 'poke', 'prod', 'wave at', 'wave to', 'wave', 'get attention of', 'get attention', 'attract attention of', 'snap fingers at', 'snap'],
  wake: ['wake up', 'wake', 'awaken', 'rouse'],
  comfort: ['comfort', 'reassure', 'console', 'encourage', 'cheer up', 'calm down', 'calm', 'forgive', 'praise', 'compliment'],
  thank: ['thank', 'thanks'],
  apologize: ['apologize to', 'apologize', 'say sorry', 'sorry'],
  explain: ['explain to', 'explain', 'describe problem', 'rubber duck'],
  catch: ['catch', 'trap', 'capture', 'grab bug', 'net', 'contain', 'bottle'],
  hide: ['hide', 'duck', 'crouch'],
  smile: ['smile at', 'smile', 'wink at', 'wink', 'flirt with', 'flirt'],
  blink: ['blink'],
  cover: ['cover', 'avert', 'look away', 'turn away', 'turn around'],
  close_eyes: ['close eyes', 'close my eyes', 'shut eyes', 'shut my eyes', 'cover eyes', 'cover my eyes', 'squint'],
  open_eyes: ['open eyes', 'open my eyes', 'uncover eyes'],
  play: ['play', 'play with'],
  dig: ['dig'],
  swim: ['swim'],
  fly: ['fly'],
  cut: ['cut', 'slice'],
  tie: ['tie', 'knot', 'bind'],
  center: ['center', 'centre', 'align'],
  hack: ['hack', 'hack into', 'crack'],
  sudo: ['sudo'],
  help: ['help', 'help me', 'commands', 'what can i do', 'instructions'],
  hint: ['hint', 'hints', 'clue', 'i am stuck', 'im stuck', 'stuck'],
  inventory: ['inventory', 'inv', 'i', 'items', 'what do i have', 'what am i carrying'],
  score: ['score', 'points'],
  save: ['save game', 'save'],
  restore: ['restore game', 'restore', 'load game', 'load'],
  restartgame: ['restart game', 'start over', 'new game'],
  quit: ['quit game', 'quit', 'exit game'],
  version: ['version', 'about', 'credits'],
  pause: ['pause'],
  curse: ['damn', 'dammit', 'shit', 'fuck', 'crap', 'hell', 'ass', 'bitch', 'bastard', 'piss', 'swear', 'curse', 'cuss'],
  make: ['make', 'prepare', 'cook', 'build', 'craft'],
  lift: ['lift up', 'lift', 'raise', 'hoist', 'tip'],
  water: ['water'],
  charge: ['recharge', 'charge'],
  squeeze: ['squeeze', 'squish', 'squeak', 'honk'],
  xyzzy: ['xyzzy', 'plugh', 'plover'],
};

const STOP = new Set([
  'the', 'a', 'an', 'some', 'my', 'your', 'his', 'her', 'its', 'their', 'our', 'this', 'that', 'these', 'those',
  'please', 'now', 'then', 'quickly', 'carefully', 'just', 'very', 'really', 'gently', 'again', 'it', 'him', 'them',
  'all', 'any', 'kindly', 'slowly', 'lol', 'up', 'down', 'piece', 'bit', 'bunch', 'whole', 'try', 'to', 'and', 'other',
  'there', 'until', 'till', 'closely', 'harder', 'deeply', 'quietly', 'politely', 'firmly', 'hard', 'softly', 'nicely', 'mr', 'ms', 'mrs', 'sir', 'dr', 'old', 'big', 'little',
]);

const PREPS = new Set([
  'in', 'into', 'inside', 'on', 'onto', 'at', 'to', 'with', 'under', 'beneath', 'below', 'behind', 'through',
  'from', 'about', 'for', 'over', 'off', 'out', 'of', 'toward', 'towards', 'near', 'using', 'upon', 'by', 'across', 'against', 'around',
]);
const PREP_CANON: Record<string, string> = {
  into: 'in', inside: 'in', onto: 'on', upon: 'on', beneath: 'under', below: 'under', towards: 'to', toward: 'to',
  using: 'with', by: 'with', across: 'over', against: 'on',
};

const NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, none: 0, first: 1, second: 2, third: 3,
};

const DIRS: Record<string, string> = {
  n: 'north', north: 'north', s: 'south', south: 'south', e: 'east', east: 'east', w: 'west', west: 'west',
  u: 'up', up: 'up', d: 'down', down: 'down', left: 'west', right: 'east', forward: 'north', backward: 'south',
  upstairs: 'up', downstairs: 'down', northeast: 'east', northwest: 'west', southeast: 'east', southwest: 'west',
  ne: 'east', nw: 'west', se: 'east', sw: 'west',
};

/** Words that are people/creatures: "give fahim coffee" gets reordered to "give coffee fahim". */
export const ANIMATE = new Set<string>();

// --------------------------------------------------------------- vocabulary
type PhraseMap = Map<string, string>;
/** items, people and built-in words: meaningful everywhere */
const globalNouns: PhraseMap = new Map();
/** words that belong to some room: recognized everywhere, but only resolve to "not here" elsewhere */
const elsewhereNouns: PhraseMap = new Map();
const verbPhrases: { words: string[]; verb: string; prep: string | null }[] = [];
for (const [verb, list] of Object.entries(VERBS)) {
  for (const entry of list) {
    const [phrase, prep] = entry.split('>');
    verbPhrases.push({ words: phrase.split(' '), verb, prep: prep ?? null });
  }
}
verbPhrases.sort((a, b) => b.words.length - a.words.length);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function addNouns(map: Record<string, string[]>, target: PhraseMap = globalNouns) {
  for (const [id, phrases] of Object.entries(map)) {
    target.set(normalize(id), id);
    for (const p of phrases) target.set(normalize(p), id);
  }
}

/** Register a room's vocabulary as known words without letting it shadow other rooms. */
export function addKnownNouns(map: Record<string, string[]>) {
  for (const [id, phrases] of Object.entries(map)) {
    for (const p of [id, ...phrases]) {
      const k = normalize(p);
      if (!elsewhereNouns.has(k)) elsewhereNouns.set(k, `elsewhere:${id}`);
    }
  }
}

export function makeLocal(map: Record<string, string[]> | undefined): PhraseMap {
  const m: PhraseMap = new Map();
  if (map) addNouns(map, m);
  return m;
}

export function isKnownWord(w: string): boolean {
  if (STOP.has(w) || PREPS.has(w) || w in NUMBERS || w in DIRS || /^\d+$/.test(w)) return true;
  for (const k of globalNouns.keys()) if (k.split(' ').includes(w)) return true;
  for (const k of elsewhereNouns.keys()) if (k.split(' ').includes(w)) return true;
  for (const v of verbPhrases) if (v.words.includes(w)) return true;
  return false;
}

function matchSpec(c: Command, spec: string): boolean {
  const parts = spec.trim().split(/\s+/);
  const [vpart, ppart] = parts[0].split('/');
  if (vpart !== '*' && !vpart.split('|').includes(c.verb ?? '')) return false;
  if (ppart !== undefined && !ppart.split('|').includes(c.prep ?? '-')) return false;
  const n = parts[1];
  if (n === undefined) {
    if (c.noun !== null) return false;
  } else if (n === '?') {
    // anything
  } else if (n === '*') {
    if (c.noun === null) return false;
  } else if (!n.split('|').includes(c.noun ?? '-')) return false;
  const n2 = parts[2];
  if (n2 !== undefined) {
    if (n2 === '*') {
      if (c.noun2 === null) return false;
    } else if (n2 === '?') {
      // any
    } else if (!n2.split('|').includes(c.noun2 ?? '-')) return false;
  }
  return true;
}

export function parse(raw: string, local?: PhraseMap, extraLocal?: PhraseMap): Command {
  const text = normalize(raw);
  let words = text.length ? text.split(' ') : [];
  const c: Command = {
    raw,
    text,
    words,
    verb: null,
    verbWord: null,
    noun: null,
    nounWord: null,
    prep: null,
    noun2: null,
    noun2Word: null,
    num: null,
    unknown: null,
    rest: '',
    is(spec: string) {
      return spec.split(',').some((s) => matchSpec(this, s));
    },
  };
  if (!words.length) return c;

  // strip leading politeness / subject
  while (words.length && ['please', 'i', 'lets', 'let', 'us', 'dominic', 'can', 'you', 'want', 'will', 'would', 'should', 'to', 'like', 'try'].includes(words[0]) && words.length > 1) {
    words = words.slice(1);
  }

  // verb phrase
  let vi = 0;
  for (const vp of verbPhrases) {
    if (vp.words.length <= words.length && vp.words.every((w, i) => words[i] === w)) {
      c.verb = vp.verb;
      c.verbWord = vp.words.join(' ');
      c.prep = vp.prep;
      vi = vp.words.length;
      break;
    }
  }
  if (!c.verb) {
    if (words[0] in DIRS && words.length === 1) {
      c.verb = 'go';
      c.verbWord = words[0];
      c.noun = DIRS[words[0]];
      c.nounWord = words[0];
      return c;
    }
  }
  let restWords = words.slice(vi);
  c.rest = restWords.join(' ');

  // particles: "turn X on/off", "pick X up", "put X on", "take X off", "plug X in", "wake X up"
  const last = restWords[restWords.length - 1];
  if (c.verb && restWords.length >= 2) {
    if ((c.verb === 'turn' || c.verb === 'switch' || c.verb === 'flip') && (last === 'on' || last === 'off')) {
      c.verb = last === 'on' ? 'turnon' : 'turnoff';
      restWords = restWords.slice(0, -1);
    } else if (c.verb === 'put' && last === 'on' && !restWords.slice(0, -1).some((w) => PREPS.has(w))) {
      c.verb = 'wear';
      restWords = restWords.slice(0, -1);
    } else if (c.verb === 'take' && last === 'off' && !restWords.slice(0, -1).some((w) => PREPS.has(w))) {
      c.verb = 'remove';
      restWords = restWords.slice(0, -1);
    } else if (c.verb === 'take' && last === 'up') {
      restWords = restWords.slice(0, -1);
    } else if (c.verb === 'plug' && last === 'in') {
      restWords = restWords.slice(0, -1);
    } else if (c.verb === 'wake' && last === 'up') {
      restWords = restWords.slice(0, -1);
    } else if (c.verb === 'pry' && last === 'off') {
      restWords = restWords.slice(0, -1);
    }
  }
  if (c.verb === 'go' && restWords.length && restWords[0] in DIRS && restWords.length === 1) {
    c.noun = DIRS[restWords[0]];
    c.nounWord = restWords[0];
    return c;
  }
  if (c.verb === 'look' && restWords.length === 1 && restWords[0] in DIRS) {
    // "look up", "look down" -> treat as a look at that direction
    c.noun = DIRS[restWords[0]];
    c.nounWord = restWords[0];
    return c;
  }

  // noun phrases
  const nouns: { id: string; word: string }[] = [];
  let prepSeen: string | null = null;
  let i = 0;
  const lookup = (phrase: string): string | undefined =>
    local?.get(phrase) ?? extraLocal?.get(phrase) ?? globalNouns.get(phrase) ?? elsewhereNouns.get(phrase);
  while (i < restWords.length) {
    const w = restWords[i];
    let matched = false;
    for (let len = Math.min(4, restWords.length - i); len >= 1; len--) {
      const phrase = restWords.slice(i, i + len).join(' ');
      const id = lookup(phrase);
      if (id !== undefined && !(len === 1 && STOP.has(phrase) && !local?.has(phrase))) {
        nouns.push({ id, word: phrase });
        if (nouns.length === 2 && prepSeen && !c.prep) c.prep = prepSeen;
        else if (nouns.length === 2 && prepSeen) c.prep = c.prep ?? prepSeen;
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if (/^\d+$/.test(w)) c.num = parseInt(w, 10);
    else if (w in NUMBERS) {
      if (c.num === null) c.num = NUMBERS[w];
    } else if (PREPS.has(w)) {
      if (nouns.length >= 1) prepSeen = PREP_CANON[w] ?? w;
      else if (!c.prep) c.prep = PREP_CANON[w] ?? w;
    } else if (STOP.has(w)) {
      // ignore
    } else if (w in DIRS) {
      if (!nouns.length) nouns.push({ id: DIRS[w], word: w });
    } else if (!c.unknown) c.unknown = w;
    i++;
  }
  if (nouns[0]) {
    c.noun = nouns[0].id;
    c.nounWord = nouns[0].word;
  }
  if (nouns[1]) {
    c.noun2 = nouns[1].id;
    c.noun2Word = nouns[1].word;
    if (prepSeen) c.prep = prepSeen;
  }
  // "give fahim the coffee" -> give coffee to fahim
  if (c.noun && c.noun2 && !prepSeen && ['give', 'show', 'throw'].includes(c.verb ?? '') && ANIMATE.has(c.noun) && !ANIMATE.has(c.noun2)) {
    [c.noun, c.noun2] = [c.noun2, c.noun];
    [c.nounWord, c.noun2Word] = [c.noun2Word, c.nounWord];
    c.prep = 'to';
  }
  // "look around" / "look at room" -> plain look
  if (c.verb === 'look' && (c.noun === 'room' || c.noun === 'around' || c.noun === 'everything')) {
    c.noun = null;
    c.nounWord = null;
  }
  if (c.verb === 'look' && c.verbWord === 'look around') c.noun = c.noun ?? null;
  if (!c.verb && words.length) c.unknown = c.unknown ?? words[0];
  return c;
}

addNouns({
  room: ['room', 'area', 'here', 'place', 'surroundings', 'around', 'scene'],
  self: ['me', 'myself', 'self', 'yourself', 'dominic', 'dom'],
  eyes: ['eyes', 'eye'],
  floor: ['floor', 'ground', 'carpet'],
  wall: ['wall', 'walls'],
  ceiling: ['ceiling', 'roof'],
  door: ['door', 'doors', 'doorway'],
  window: ['window', 'windows'],
  light: ['light', 'lights', 'lamp', 'lighting'],
  sky: ['sky'],
  hands: ['hand', 'hands', 'pocket', 'pockets'],
  code: ['code', 'source code', 'source', 'program', 'software', 'line of code', 'lines of code', 'codebase'],
  bug: ['bug', 'bugs'],
  computer: ['computer', 'pc', 'workstation', 'terminal', 'machine', 'monitor', 'screen', 'display'],
  password: ['password', 'passcode', 'passphrase', 'pass word'],
  everything: ['everything', 'all'],
  north: ['north'],
  south: ['south'],
  east: ['east'],
  west: ['west'],
  up: ['upward'],
  down: ['downward'],
});
