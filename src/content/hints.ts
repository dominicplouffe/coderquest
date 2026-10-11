// Rubber-duck debugging as an in-game hint system. Ask the duck twice about
// the same problem and it gets more specific.
import type { Game } from '../engine/game';
import { award } from './points';

type Text = string | ((g: Game) => string);
type Hint = [cond: (g: Game) => boolean, vague: Text, specific: Text];

const f = (g: Game, k: string) => !!g.flag(k);
const inRoom = (g: Game, id: string) => g.room?.id === id;

const ACT1: Hint[] = [
  // where you're standing comes first: a dark stairwell or a live puddle is the problem right now
  [
    (g) => inRoom(g, 'stairwell') && !f(g, 'keyboard_on'),
    'That stairwell is darker than a terminal with the brightness turned down. Walking down it blind is a poor career move. Do you have anything that glows?',
    (g) =>
      g.has('keyboard')
        ? "TURN ON KEYBOARD. Nicholas's RGB keyboard is absurdly bright."
        : "Nicholas's spare RGB keyboard has more LEDs than a Christmas tree. Help him center his div (the answer is under YOUR keyboard) and he'll give it to you. Then TURN ON KEYBOARD.",
  ],
  [(g) => inRoom(g, 'basement') && !f(g, 'breaker_off'), 'That puddle is electrified. Maybe you can cut power to just that part of the basement. Read the labels carefully.', 'OPEN PANEL, then TURN OFF BREAKER 3. Definitely not breaker 1.'],
  [(g) => !g.has('badge') && !f(g, 'lab_open'), 'You can\'t get far in this building without your ID.', 'Your ID badge is hanging on the coat hook in your cubicle. TAKE BADGE.'],
  [(g) => !f(g, 'fahim_awake') && !g.has('mug') && !g.has('coffee'), 'Somebody in this building badly needs caffeine, and you\'ll need something to carry it in.', 'Fahim in the NOC is running on fumes. Take your mug from your desk.'],
  [(g) => !f(g, 'fahim_awake') && !f(g, 'coffee_rebooted'), 'The coffee machine thinks it\'s a teapot. What\'s the first thing IT always tells you to try?', 'Have you tried turning it off and on again? TURN OFF MACHINE, then TURN ON MACHINE. (Or just RESTART MACHINE.)'],
  [(g) => !f(g, 'fahim_awake') && !g.has('coffee'), 'The coffee machine works again. Now you just need a vessel.', 'Put your mug in the machine: FILL MUG or PUT MUG IN MACHINE.'],
  [(g) => !f(g, 'fahim_awake'), 'Fahim needs that coffee more than you do.', 'Go to the NOC and GIVE COFFEE TO FAHIM.'],
  [(g) => !f(g, 'phil_gave_keycard'), 'Phil runs a tight ship. He won\'t authorize anything without paperwork.', 'SHOW REPORT TO PHIL in his office.'],
  [(g) => !f(g, 'nick_helped') && !g.has('note'), 'Nicholas has been trying to center a div since Tuesday. Haven\'t you written the answer down before?', 'Something yellow is hiding under your own keyboard, back in your cubicle. LOOK UNDER KEYBOARD.'],
  [(g) => !f(g, 'nick_helped') && !f(g, 'nick_attention'), 'Nicholas can\'t hear a thing through those headphones.', 'TAP NICHOLAS on the shoulder.'],
  [(g) => !f(g, 'nick_helped'), 'You have exactly what Nicholas needs.', 'GIVE NOTE TO NICHOLAS.'],
  [(g) => !f(g, 'lab_open'), 'Krishna\'s lab has a badge reader.', 'Stand by the lab door and USE BADGE ON READER.'],
  [(g) => !f(g, 'coin_found') && !f(g, 'candy_bought'), 'Mike\'s snack is stuck in the vending machine. Vending machines sometimes give back more than snacks.', 'LOOK IN COIN RETURN on the vending machine.'],
  [(g) => !f(g, 'candy_bought'), 'You have a quarter. Vending machines love quarters.', 'BUY CANDY (or PUT QUARTER IN MACHINE). And whatever you do, don\'t shake it.'],
  [(g) => !f(g, 'helmet_given'), 'Krishna\'s helmet needs a serious battery. Who in this office carries a brick-sized one?', 'GIVE POWER BANK TO KRISHNA in the lab.'],
  [(g) => !f(g, 'stairs_open'), 'The stairwell door needs higher clearance than yours.', 'Use Phil\'s master keycard on the stairwell door\'s reader: USE KEYCARD ON READER.'],
  [(g) => !f(g, 'keyboard_on'), 'That stairwell is darker than a terminal with the brightness turned down. Do you have anything that glows?', 'TURN ON KEYBOARD. Nicholas\'s RGB keyboard is absurdly bright.'],
  [(g) => !f(g, 'breaker_off'), 'That puddle is electrified. Maybe you can cut power to just that part of the basement. Read the labels carefully.', 'OPEN PANEL, then TURN OFF BREAKER 3. Definitely not breaker 1.'],
  [(g) => !f(g, 'door_open'), 'Denis will only open for someone who knows the name of his first love. Old photos tell old stories.', 'LOOK AT PHOTO in the basement corridor, then KNOCK ON DOOR and SAY GERTRUDE.'],
  [(g) => !f(g, 'denis_trust'), 'Denis\'s riddle is an old programmer joke. You\'ve seen it somewhere in this building... maybe while getting a snack?', 'The answer is on the break room fridge: "None. That\'s a hardware problem." SAY NONE.'],
  [(g) => !f(g, 'helmet_connected'), 'The helmet needs to talk to the Monolith, and the Monolith only speaks 1987.', 'PLUG ADAPTER INTO MONOLITH (you\'ll need the helmet and Denis\'s adapter).'],
  // optional points, before you leave the building behind
  [(g) => !f(g, 'aidan_comforted'), 'Before you go in, one loose end: somebody upstairs is hiding under a desk, convinced this is all his fault. A senior engineer could set him straight.', "If you want every point: TALK TO AIDAN in the open office. Blameless postmortems! Otherwise, you're ready: WEAR HELMET."],
  [(g) => g.has('keyboard') && !f(g, 'esc_taken'), "One loose end: the Rainbow Warrior's ESC key is a little loose. You never know when you'll need to escape something.", "If you want every point: PRY ESC KEY off the RGB keyboard. Otherwise, you're ready: WEAR HELMET."],
  [() => true, 'Everything is connected. There\'s only one thing left to do, and it\'s probably a terrible idea.', 'WEAR HELMET.'],
];

const ACT2: Hint[] = [
  [(g) => !f(g, 'king_talked'), 'That old king seems to be in charge around here. Sort of.', 'TALK TO KING.'],
  [(g) => !f(g, 'jar_taken'), 'Something important was thrown away in the Heap, east of the Boot Sector. The Garbage Collector there collects anything nobody references.', 'WEAR BADGE before entering the Heap, so you\'re referenced. Then TAKE JAR.'],
  [(g) => !f(g, 'forest_refactored'), 'The Spaghetti Forest to the north is a tangled mess. It\'s practically begging for a refactor.', 'In the forest, type REFACTOR SPAGHETTI (or UNTANGLE CODE).'],
  [(g) => !f(g, 'vim_solved'), 'There\'s a poor process at the Stack Tower who has been stuck in Vim since 1991. You know how to exit Vim, right?', 'SAY :Q! to the process. (Colon, Q, exclamation point.)'],
  [(g) => !f(g, 'node_given'), 'The Oracle will answer you now. Something is missing from the bridge over the Null Void.', 'ASK ORACLE ABOUT BRIDGE.'],
  [(g) => !f(g, 'loop_broken'), 'An infinite loop. Every programmer knows the keyword to get out of one. Or you could just... escape.', 'Type BREAK, or USE ESC KEY.'],
  [(g) => !f(g, 'adriana_free'), 'Two threads, each waiting forever for the other. One of them really just needs to take a break.', 'GIVE BREAK BAR TO THREAD.'],
  [(g) => !f(g, 'patch_given'), 'Adriana is free. She was working on something before she got stuck.', 'TALK TO ADRIANA.'],
  [(g) => !f(g, 'bridge_fixed'), 'The bridge over the Null Void is missing a node. Don\'t step on the gap.', 'PUT NODE IN GAP (or USE NODE ON BRIDGE).'],
  [(g) => !f(g, 'dragon_asleep'), 'The Legacy Dragon only understands COBOL. Have you ever tried reading that manual out loud? It could put a dragon to sleep.', 'READ MANUAL TO DRAGON.'],
  [(g) => !f(g, 'jar_placed'), 'You can\'t debug a Heisenbug by watching it. You need a test that catches it for you.', 'PUT JAR ON ALTAR.'],
  [(g) => !f(g, 'bug_caught'), 'The bug vanishes whenever you look at it. So... don\'t look.', 'CLOSE EYES.'],
  [(g) => !f(g, 'bug_fixed'), 'You have a failing test. Now make it pass with Adriana\'s work.', 'APPLY PATCH (or PUT PATCH ON ALTAR).'],
  [() => true, 'Your work in here is done. Time to go home. Well, back to the server room.', 'LOG OUT.'],
];

const ACT3: Hint[] = [
  [(g) => !f(g, 'y2k_told'), 'Denis deserves to know what you found in there.', 'TALK TO DENIS.'],
  [(g) => !f(g, 'committed'), 'A fix that isn\'t committed is just a rumor.', 'COMMIT (or GIT COMMIT) at the terminal.'],
  [(g) => !f(g, 'reviewed'), 'Nobody merges to main without a code review. Not even you. Especially not tonight.', 'ASK ADRIANA TO REVIEW the code.'],
  [(g) => !f(g, 'tested'), 'Reviewed is good. Tested is better.', 'RUN TESTS.'],
  [(g) => !f(g, 'midnight'), 'Look at the clock. Then remember Rule Number One, from the NOC wall.', 'NEVER deploy on a Friday. WAIT until midnight first.'],
  [() => true, 'It\'s Saturday. Ship it.', 'DEPLOY.'],
];

export async function duckHint(g: Game) {
  const act = g.flag('act') ?? 1;
  const list = act >= 3 ? ACT3 : act === 2 ? ACT2 : ACT1;
  const idx = list.findIndex(([cond]) => cond(g));
  const [, vague, specific] = list[Math.max(0, idx)];
  const key = `hint_${act}_${idx}`;
  const seen = g.inc(key);
  const pick = seen >= 2 ? specific : vague;
  const text = typeof pick === 'function' ? pick(g) : pick;
  if (act >= 2) {
    if (!g.flag('duck_talked')) {
      g.set('duck_talked');
      award(g, 'duck_talked');
      await g.say('You hold up the duck, out of habit, to explain your problem.\n\nThe duck blinks. The duck CLEARS ITS THROAT.\n\n"Finally! Twenty years of listening to you mumble about null pointers and I can finally talk BACK."', { title: 'Rubber Duck' });
    }
    await g.say(`"Quack. ${text}"${seen < 2 ? '\n\n(Ask again for a more specific hint.)' : ''}`, { title: 'Rubber Duck' });
  } else {
    await g.say(
      `You explain your problem to the rubber duck, out loud, in detail. The duck stares back, silent and judgmental. But somehow, saying it out loud helps:\n\n${text}${seen < 2 ? '\n\n(Explain it again for a clearer idea.)' : ''}`,
      { title: 'Rubber Duck Debugging' },
    );
  }
}
