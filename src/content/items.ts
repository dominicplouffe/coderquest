import { Surface, Img, TRANSPARENT } from '../engine/raster';
import { dith } from '../engine/palette';
import type { ItemDef } from '../engine/types';
import type { Game } from '../engine/game';
import { award } from './points';
import { duckHint } from './hints';

function icon(draw: (s: Surface) => void, w = 20, h = 20): () => Img {
  let cached: Img | null = null;
  return () => {
    if (cached) return cached;
    const s = new Surface(w, h);
    s.px.fill(TRANSPARENT);
    s.writePri = false;
    draw(s);
    cached = { w, h, data: s.px, ox: 0, oy: 0 };
    return cached;
  };
}

const drawMug = (s: Surface, full: boolean) => {
  s.rect(4, 5, 10, 12, 15);
  s.frame(4, 5, 10, 12, 8);
  s.rect(14, 8, 3, 1, 8);
  s.rect(16, 8, 1, 6, 8);
  s.rect(14, 13, 3, 1, 8);
  s.rect(5, 9, 8, 2, 1);
  s.micro(5, 12, 'OK', 4);
  if (full) {
    s.hline(5, 12, 6, 6);
    s.plot(7, 3, 7);
    s.plot(8, 2, 7);
    s.plot(7, 1, 7);
    s.plot(11, 3, 7);
    s.plot(10, 2, 7);
    s.plot(11, 1, 7);
  }
  s.hline(4, 13, 17, 8);
};

export const ITEMS: ItemDef[] = [
  {
    id: 'phone',
    name: 'Your Phone',
    nouns: ['phone', 'cellphone', 'cell phone', 'smartphone', 'mobile', 'iphone', 'android'],
    look: 'Your trusty smartphone. Battery: 0%. You forgot to charge it. Again. It is currently a very expensive paperweight.',
    icon: icon((s) => {
      s.rect(6, 2, 9, 16, 0);
      s.frame(6, 2, 9, 16, 8);
      s.rect(7, 4, 7, 11, 1);
      s.micro(8, 7, '0', 12);
      s.plot(10, 16, 8);
    }),
    verbs: {
      'call|use|turnon phone,call ?': async (g, c) => {
        // "ring the doorbell", "call the elevator": that's the room's business, not the phone's
        if (c.verb === 'call' && c.noun && c.noun !== 'phone' && g.hotspot(c.noun)) return false;
        await g.say('You stab at the power button. The screen flashes a tiny red battery icon and dies. You really need to start charging this thing at night.');
      },
      'read phone,look/at phone messages,search phone': 'The screen stays black. Whatever messages are waiting on there will have to keep waiting. Battery: 0%.',
      'plug phone powerbank,put phone powerbank,use powerbank phone': "You plug your phone into the power bank. 1%... 2%... You don't have time to wait for a full charge. Production is down!",
    },
  },
  {
    id: 'duck',
    name: 'Rubber Duck',
    nouns: ['duck', 'rubber duck', 'ducky', 'duckie', 'rubber ducky', 'quackers'],
    look: (g) =>
      (g.flag('act') ?? 1) >= 2
        ? "Your rubber duck. In here, it has a voice, opinions, and absolutely no filter. If you're stuck, TALK TO THE DUCK."
        : "A yellow rubber duck, veteran of a thousand debugging sessions. When you're stuck, try talking to it. (Really. Type TALK TO DUCK.)",
    icon: icon((s) => {
      s.ellipse(9, 13, 7, 4, 14);
      s.ellipse(12, 7, 4, 4, 14);
      s.rect(15, 7, 4, 2, 6);
      s.plot(13, 6, 0);
      s.hline(4, 9, 11, 6);
      s.plot(3, 10, 14);
      s.plot(2, 9, 14);
      s.hline(4, 14, 17, dith(14, 6, 8));
    }),
    verbs: {
      'talk duck,explain ?,explain * duck,ask duck ?,hint,tell duck ?,show * duck': async (g) => {
        await duckHint(g);
      },
      'touch|push|hug duck,squeeze duck': async (g) => {
        g.sfx('beep');
        await g.say('SQUEAK! You feel a little better.');
      },
      'kiss duck': 'You give the duck a little peck. It remains professionally unmoved.',
      'eat duck': "Absolutely not. That duck has seen you through more production incidents than anyone at this company.",
      'drop|throw duck': "You'd never abandon your duck. It's the best listener in the whole building.",
    },
  },
  {
    id: 'mug',
    name: 'Coffee Mug',
    nouns: ['mug', 'cup', 'coffee mug', 'coffee cup', 'empty mug'],
    look: "Your favorite mug. It says WORLD'S OKAYEST PROGRAMMER. It's empty, which is a tragedy of the highest order.",
    icon: icon((s) => drawMug(s, false)),
    verbs: {
      'drink mug': "It's empty. You lick the rim, briefly considering your life choices.",
      'fill mug,use mug': async (g) => {
        if (g.room?.id === 'breakroom') return false;
        await g.say(
          g.flag('coffee_rebooted')
            ? 'Your mug wants coffee, and the only working coffee machine is in the break room, off the elevator lobby.'
            : "Your mug wants coffee. The coffee machine is in the break room, off the elevator lobby. Last you heard, it thinks it's a teapot.",
        );
      },
    },
  },
  {
    id: 'coffee',
    name: 'Mug of Coffee',
    nouns: ['coffee', 'mug of coffee', 'cup of coffee', 'hot coffee', 'fresh coffee', 'java', 'joe', 'mug', 'cup'],
    look: 'A steaming mug of fresh, dark coffee. It smells like productivity. Fahim would sell his own keyboard for this.',
    icon: icon((s) => drawMug(s, true)),
    verbs: {
      'drink coffee': async (g) => {
        g.removeItem('coffee');
        g.addItem('mug', true);
        await g.say('You gulp down the coffee. Ahh. Your neurons light up like a Christmas tree. ...Wait. Wasn\'t that supposed to be for Fahim? Better get another cup.');
      },
      'pour coffee': "Pouring perfectly good coffee on the floor? What are you, a monster?",
    },
  },
  {
    id: 'note',
    name: 'Sticky Note',
    nouns: ['note', 'sticky note', 'sticky', 'post it', 'postit', 'paper note', 'yellow note'],
    look: 'A yellow sticky note in your handwriting:\n\n"HOW TO CENTER A DIV\n(for Nicholas. AGAIN.)\ndisplay: flex;\njustify-content: center;\nalign-items: center;"',
    icon: icon((s) => {
      s.rect(3, 3, 14, 14, 14);
      s.rect(3, 3, 14, 2, dith(14, 6, 6));
      for (let y = 7; y < 16; y += 2) s.hline(5, 5 + ((y * 7) % 9) + 3, y, 1);
      s.plot(16, 16, 6);
    }),
    verbs: {
      'read note': async (g) => g.examine('note'),
      'eat note': 'You consider eating the note to destroy the evidence of how many times you have explained this to Nicholas. You decide against it.',
    },
  },
  {
    id: 'badge',
    name: 'ID Badge',
    nouns: ['badge', 'id badge', 'id', 'id card', 'lanyard', 'employee badge', 'name tag', 'nametag'],
    look: (g) =>
      `Your employee badge: DOMINIC - SENIOR SOFTWARE ENGINEER. The photo was taken on your first day, before this job aged you.${g.flag('badge_worn') ? " You're wearing it clipped to your hoodie." : ''}`,
    icon: icon((s) => {
      s.line(5, 1, 9, 6, 1);
      s.line(15, 1, 11, 6, 1);
      s.rect(5, 6, 11, 13, 15);
      s.frame(5, 6, 11, 13, 8);
      s.rect(7, 8, 5, 5, 16);
      s.rect(7, 8, 5, 2, 22);
      s.plot(8, 10, 0);
      s.plot(10, 10, 0);
      s.hline(7, 13, 15, 1);
      s.hline(7, 11, 17, 8);
      s.rect(9, 5, 3, 2, 7);
    }),
    verbs: {
      'wear badge,show badge,put badge self': async (g) => {
        if (g.flag('badge_worn')) return void (await g.say("You're already wearing your badge. Proudly."));
        g.set('badge_worn');
        await g.say("You clip your badge onto your hoodie. Now everyone knows exactly who you are. Including any process that's checking.");
        if (g.room?.id === 'heap') award(g, 'gc_badge');
      },
      'remove badge': async (g) => {
        if (!g.flag('badge_worn')) return void (await g.say("You're not wearing it."));
        if (g.room?.id === 'heap') return void (await g.say('Take off your badge? Here? With the Garbage Collector looking for unreferenced objects? Bold. Very bold. No.'));
        g.set('badge_worn', false);
        await g.say('You unclip your badge and pocket it.');
      },
    },
  },
  {
    id: 'keyboard',
    name: 'RGB Keyboard',
    nouns: ['keyboard', 'rgb keyboard', 'mechanical keyboard', 'rainbow warrior', 'spare keyboard', 'rgb', 'keeb', 'wireless keyboard', 'rgb lights', 'keyboard lights'],
    look: (g) => {
      let t = "Nicholas's spare mechanical keyboard, the 'Rainbow Warrior'. It has more LEDs than a Christmas tree and a battery that lasts a month.";
      if (g.flag('keyboard_on')) t += ' It is blazing in every color of the rainbow.';
      else t += ' The lights are currently off.';
      t += g.flag('esc_taken') ? ' Its ESC key is missing.' : ' The ESC keycap looks a little loose.';
      return t;
    },
    icon: icon((s) => {
      s.rect(1, 7, 18, 8, 0);
      s.frame(1, 7, 18, 8, 8);
      const cols = [12, 14, 10, 11, 9, 13];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 8; c++) {
          if (r === 0 && c === 0) continue;
          s.plot(3 + c * 2, 9 + r * 2, cols[(c + r) % cols.length]);
        }
      s.hline(5, 14, 15, 8);
    }),
    verbs: {
      'turnon|use|light keyboard,push * keyboard': async (g) => {
        if (g.flag('keyboard_on')) return void (await g.say("It's already on. Any brighter and it would need its own zip code."));
        g.set('keyboard_on');
        g.sfx('beep');
        if (g.room?.id === 'stairwell') return false; // stairwell handles the dramatic version
        await g.say('You flip the switch. The keyboard erupts in a cycling rainbow glow. It is, frankly, too much. It is beautiful.');
      },
      'turnoff keyboard': async (g) => {
        if (!g.flag('keyboard_on')) return void (await g.say("It's already off."));
        if (g.room?.id === 'stairwell') return void (await g.say("Turning off your only light source in a pitch-black stairwell? That's the kind of decision that ends adventures."));
        g.set('keyboard_on', false);
        await g.say('The rainbow fades. The keyboard sulks in the dark.');
      },
      'take|pry|remove|get|pull esckey,take|pry|remove|get|pull esckey keyboard,pry keyboard': async (g) => {
        if (g.flag('esc_taken')) return void (await g.say('You already have the ESC key.'));
        g.set('esc_taken');
        g.addItem('esckey');
        award(g, 'take_esc');
        await g.say("You wiggle the loose ESC keycap and it pops off with a satisfying click. You pocket it. You never know when you'll need to escape.");
      },
      'type keyboard,type ?': async (g, c) => {
        if (g.room?.id && ['cubicle', 'office', 'noc', 'serverroom'].includes(g.room.id)) return false;
        await g.say(`You type "${c.rest || 'hello world'}" on the wireless keyboard. It's not connected to anything, so nothing happens, but the clacking is deeply satisfying.`);
      },
    },
  },
  {
    id: 'esckey',
    name: 'ESC Key',
    nouns: ['esckey', 'esc key', 'escape key', 'esc', 'keycap', 'key cap', 'escape keycap', 'esc keycap'],
    look: "The Escape key from Nicholas's keyboard. Every programmer's favorite key. Pressing it rarely helps, but it always feels like it should.",
    icon: icon((s) => {
      s.rect(3, 4, 14, 12, 7);
      s.rect(4, 5, 12, 9, 15);
      s.frame(3, 4, 14, 12, 8);
      s.hline(3, 16, 16, 0);
      s.micro(5, 7, 'ESC', 0);
    }),
    verbs: {
      'push|use esckey,escape': "You press the ESC key. Nothing happens. Then again, nothing here needs escaping. Yet.",
    },
  },
  {
    id: 'report',
    name: 'Incident Report',
    nouns: ['report', 'incident report', 'printout', 'paper', 'paperwork', 'sev1', 'sev 1', 'form'],
    look: 'Fahim\'s incident report:\n\n"SEV-1: MONOLITH CORE PANIC. All services down. Remote access: impossible. Required: physical access to the Monolith in the basement. Approval needed: CEO."\n\nThere\'s a coffee ring on it. Fahim\'s signature.',
    icon: icon((s) => {
      s.rect(4, 2, 12, 16, 15);
      s.frame(4, 2, 12, 16, 8);
      s.rect(5, 3, 10, 3, 4);
      s.micro(6, 4, 'SEV', 15);
      for (let y = 8; y < 16; y += 2) s.hline(6, 13, y, 8);
      s.ellipseO(12, 13, 3, 2, 6);
    }),
    verbs: { 'read report': async (g) => g.examine('report') },
  },
  {
    id: 'keycard',
    name: 'Master Keycard',
    nouns: ['keycard', 'master keycard', 'key card', 'master key', 'access card', 'phils card'],
    look: "Phil's master keycard. It opens every door in the building, including the executive bathroom. Especially the executive bathroom.",
    icon: icon((s) => {
      s.rect(2, 5, 16, 11, 14);
      s.frame(2, 5, 16, 11, 6);
      s.rect(4, 8, 4, 3, 6);
      s.hline(4, 9, 9, 14);
      s.micro(10, 7, 'M', 4);
      s.hline(3, 16, 13, 6);
    }),
  },
  {
    id: 'quarter',
    name: 'Quarter',
    nouns: ['quarter', 'coin', 'money', 'change', 'cents', 'twenty five cents', '25 cents'],
    look: 'A shiny quarter. Twenty-five whole cents. In this economy!',
    icon: icon((s) => {
      s.circle(10, 10, 7, 7);
      s.ellipseO(10, 10, 7, 7, 8);
      s.circle(9, 9, 4, 15);
      s.circle(10, 10, 3, 7);
      s.micro(9, 8, '25', 8);
    }),
    verbs: {
      'flip|throw quarter': async (g) => {
        await g.say(Math.random() < 0.5 ? 'You flip the quarter. Heads. You decide that means "keep going".' : 'You flip the quarter. Tails. You decide that means "keep going" too.');
      },
    },
  },
  {
    id: 'candy',
    name: 'BREAK! Bar',
    nouns: ['candy', 'break bar', 'break', 'candy bar', 'chocolate', 'chocolate bar', 'bar', 'snack', 'breakbar'],
    look: 'A BREAK! chocolate bar. The wrapper says: "Need a break? Have a BREAK!" Four crunchy wafer fingers of pure productivity loss.',
    icon: icon((s) => {
      s.poly([1, 9, 18, 6, 19, 12, 2, 15], 4);
      s.micro(4, 8, 'BREAK', 14);
      s.line(1, 9, 2, 15, 12);
      s.line(18, 6, 19, 12, 12);
    }),
    verbs: {
      'eat candy': "You're tempted. Oh, you're SO tempted. But something tells you that somebody, somewhere, is going to need a BREAK! more than you.",
    },
  },
  {
    id: 'powerbank',
    name: 'Power Bank',
    nouns: ['powerbank', 'power bank', 'battery', 'battery pack', 'brick', 'charger', 'power pack'],
    look: "Mike's enormous power bank: 40,000 mAh. It weighs about as much as a brick and looks exactly like one, except for the four smug blue LEDs.",
    icon: icon((s) => {
      s.rect(3, 6, 14, 10, 8);
      s.frame(3, 6, 14, 10, 0);
      s.hline(4, 15, 7, 7);
      for (let i = 0; i < 4; i++) s.plot(6 + i * 2, 13, 11);
      s.line(17, 9, 19, 4, 0);
    }),
  },
  {
    id: 'helmet',
    name: 'NDI Helmet',
    nouns: ['helmet', 'ndi', 'ndi helmet', 'neural debugging interface', 'interface', 'headset', 'vr helmet', 'debugger', 'prototype'],
    look: 'Krishna\'s Neural Debugging Interface, v2. A silver helmet bristling with wires and blinking lights. A label on the back reads: "DO NOT USE. (Unless you really, really have to.)"',
    icon: icon((s) => {
      s.ellipse(10, 11, 8, 7, 7);
      s.rect(2, 11, 17, 6, 7);
      s.rect(4, 10, 13, 4, 1);
      s.hline(5, 15, 10, 11);
      s.line(5, 4, 3, 0, 8);
      s.line(15, 4, 17, 0, 8);
      s.plot(3, 0, 12);
      s.plot(17, 0, 10);
      s.hline(2, 18, 17, 8);
    }),
    verbs: {
      'wear helmet': async (g) => {
        if ((g.flag('act') ?? 1) >= 2) return void (await g.say("You're already wearing it. That's how you got here."));
        if (g.room?.id === 'serverroom') return false;
        await g.say("You try the helmet on. Without being connected to anything, it's just a very expensive hat. You take it off before anyone sees.");
      },
      'remove helmet': async (g) => {
        if ((g.flag('act') ?? 1) === 2) return false;
        await g.say("You're not wearing it.");
      },
    },
  },
  {
    id: 'adapter',
    name: 'DB-25 Adapter',
    nouns: ['adapter', 'db25', 'db 25', 'db25 adapter', 'serial adapter', 'cable', 'serial cable', 'dongle', 'connector'],
    look: 'A USB-C to DB-25 serial adapter. Denis says it\'s "the most important cable ever made." He says that about all of his cables.',
    icon: icon((s) => {
      s.poly([2, 5, 12, 5, 11, 12, 3, 12], 7);
      s.frame(2, 5, 11, 8, 8);
      for (let i = 0; i < 4; i++) s.plot(4 + i * 2, 8, 0);
      s.rect(12, 7, 3, 3, 8);
      s.line(15, 8, 19, 14, 0);
      s.rect(16, 14, 3, 4, 8);
    }),
  },
  {
    id: 'manual',
    name: 'COBOL Manual',
    nouns: ['manual', 'cobol manual', 'book', 'cobol book', 'reference', 'reference manual', 'cobol'],
    look: '"COBOL-85 Reference Manual, Volume 1 of 7." 1,200 pages of the most soporific prose ever committed to paper. Denis has annotated it in three colors of ink.',
    icon: icon((s) => {
      s.rect(3, 3, 13, 15, 2);
      s.rect(16, 4, 2, 14, 15);
      s.frame(3, 3, 13, 15, 0);
      s.rect(5, 6, 9, 4, 10);
      s.micro(5, 7, 'COB', 0);
      s.hline(3, 17, 18, 0);
    }),
    verbs: {
      'read manual': async (g) => {
        if (g.room?.id === 'dragon') return false;
        await g.say('You open to a random page. "PERFORM VARYING WS-IDX FROM 1 BY 1 UNTIL WS-IDX > WS-MAX..." Your eyelids grow heavy. Your head droops. You snap awake. This book is a weapon.');
      },
    },
  },
  {
    id: 'jar',
    name: 'Unit Test Jar',
    nouns: ['jar', 'test jar', 'unit test', 'unit test jar', 'test', 'glass jar', 'tests'],
    look: 'A glass jar with a label that reads TEST. Someone threw it in the Heap to "ship faster." Bugs hate it. Bugs hate it SO much.',
    icon: icon((s) => {
      s.rect(5, 3, 10, 3, 8);
      s.rect(4, 6, 12, 12, dith(11, 0, 4));
      s.frame(4, 6, 12, 12, 11);
      s.rect(6, 10, 8, 4, 15);
      s.micro(6, 10, 'TEST', 1);
      s.vline(6, 7, 9, 15);
    }),
  },
  {
    id: 'jarbug',
    name: 'Bug in a Jar',
    nouns: ['jarbug', 'jar', 'test jar', 'bug', 'millennium bug', 'heisenbug', 'trapped bug', 'unit test', 'test'],
    look: 'The Millennium Bug, trapped in your unit test. The label glows red: TEST FAILED. A reproducible failing test is a beautiful, beautiful thing.',
    icon: icon((s) => {
      s.rect(5, 3, 10, 3, 8);
      s.rect(4, 6, 12, 12, dith(4, 0, 6));
      s.frame(4, 6, 12, 12, 12);
      s.ellipse(10, 12, 3, 2, 12);
      s.plot(9, 11, 14);
      s.line(6, 9, 8, 11, 0);
      s.line(14, 9, 12, 11, 0);
      s.micro(6, 15, 'FAIL', 15);
    }),
  },
  {
    id: 'node',
    name: 'List Node',
    nouns: ['node', 'list node', 'linked list node', 'linked list', 'link', 'next node', 'pointer', 'block'],
    look: 'A glowing linked-list node, handed to you by the Oracle. Its "next" pointer twitches eagerly, looking for something to point at.',
    icon: icon((s) => {
      s.rect(2, 6, 11, 9, 1);
      s.frame(2, 6, 11, 9, 11);
      s.vline(8, 6, 14, 11);
      s.micro(3, 8, 'V', 15);
      s.plot(10, 10, 14);
      s.line(10, 10, 18, 10, 14);
      s.line(18, 10, 15, 7, 14);
      s.line(18, 10, 15, 13, 14);
    }),
  },
  {
    id: 'patch',
    name: "Adriana's Patch",
    nouns: ['patch', 'adrianas patch', 'fix', 'y2k fix', 'software patch', 'embroidered patch', 'cloth patch'],
    look: 'The patch Adriana wrote before she got deadlocked. It\'s a literal embroidered patch that reads "Y2K FIX: 4-DIGIT YEARS". In here, code and craft are apparently the same thing.',
    icon: icon((s) => {
      s.circle(10, 10, 8, 5);
      s.ellipseO(10, 10, 8, 8, 13);
      s.circle(10, 10, 6, 1);
      s.micro(4, 6, 'Y2K', 14);
      s.micro(4, 12, 'FIX', 15);
    }),
    verbs: {
      'wear patch': "It's a software patch. If you wore it over one eye you'd be a pirate, and software piracy is a crime.",
    },
  },
];

export function itemName(g: Game, id: string) {
  return g.items[id]?.name ?? id;
}
