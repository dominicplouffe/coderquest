// The complete point table. It must sum to exactly 256.
// Rooms award points with award(g, 'id'); each id can only be scored once.
import type { Game } from '../engine/game';

export const POINTS = {
  // ---------------- Act I: Monolith Systems HQ (111)
  take_duck: 2, // open the desk drawer and take the rubber duck
  take_mug: 2, // take Dominic's coffee mug
  take_note: 3, // find the sticky note under the keyboard
  take_badge: 2, // take Dominic's ID badge from the coat hook
  comfort_aidan: 5, // reassure Aidan (blameless postmortem!)
  nick_attention: 2, // tap Nicholas / get his attention
  give_note_nick: 8, // give Nicholas the centering-a-div note -> RGB keyboard
  take_esc: 5, // pry the ESC key off the keyboard
  reboot_coffee: 5, // turn the "teapot" coffee machine off and on again
  fill_mug: 3, // brew coffee into the mug
  give_coffee_fahim: 8, // caffeinate Fahim -> incident report
  coin_return: 3, // check the vending machine's coin return -> quarter
  buy_candy: 5, // buy a BREAK! bar (knocks Mike's stuck bar loose too)
  mike_bank: 5, // Mike gratefully hands over his power bank
  show_report_phil: 8, // show Phil the incident report -> master keycard
  open_lab: 3, // badge into the R&D lab
  give_bank_krishna: 8, // power the NDI helmet -> Krishna gives it to you
  open_stairs: 3, // keycard the stairwell door
  light_keyboard: 5, // light the dark stairwell with the RGB keyboard
  breaker_off: 5, // kill the BASEMENT AUX breaker (and only that one)
  password_gertrude: 5, // say Denis's first love's name at the server room door
  riddle_denis: 8, // answer Denis's light bulb riddle -> COBOL manual + adapter
  connect_helmet: 3, // plug the helmet into the Monolith with the adapter
  wear_helmet: 5, // put on the helmet and get digitized

  // ---------------- Act II: Inside the Monolith (111)
  king_talked: 3, // hear King Kernel's plea
  duck_talked: 2, // discover the duck can talk in here
  gc_badge: 5, // wear your badge so the Garbage Collector knows you're referenced
  take_jar: 5, // take the Unit Test Jar from the Heap
  vim_solved: 8, // tell the poor process how to exit Vim
  oracle_asked: 4, // ask the Oracle a question
  take_node: 5, // the Oracle gives you the missing linked-list node
  forest_refactored: 4, // refactor the Spaghetti Forest
  loop_broken: 8, // break out of the Infinite Loop
  adriana_free: 10, // give a thread a BREAK! and resolve the deadlock
  patch_given: 5, // talk to Adriana and receive her patch
  bridge_fixed: 8, // put the node into the broken bridge
  bridge_crossed: 2, // cross the Null Void
  dragon_asleep: 10, // read the COBOL manual to the Legacy Dragon
  core_entered: 2, // enter the Core
  jar_placed: 5, // set the Unit Test Jar on the altar
  bug_caught: 10, // close your eyes so the Heisenbug can be caught
  bug_fixed: 10, // apply Adriana's patch
  logout: 5, // log out of the Monolith

  // ---------------- Act III: The Deploy (34)
  y2k_told: 3, // tell Denis what you found
  committed: 5, // commit the fix
  reviewed: 5, // get Adriana's code review
  tested: 5, // run the tests
  midnight: 6, // wait until it is no longer Friday
  deployed: 10, // deploy!
} as const;

export type PointId = keyof typeof POINTS;

export const TOTAL_POINTS = Object.values(POINTS).reduce((a, b) => a + b, 0);

export function award(g: Game, id: PointId) {
  g.award(id, POINTS[id]);
}
