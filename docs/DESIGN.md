# Coder's Quest: The Friday Deploy — Design Bible

> SPOILERS. This document is the complete design: story, rooms, puzzles, flags and the
> 256-point table. It is the single source of truth for everyone building rooms.

## Pitch

A 1987-style Sierra graphic adventure (think *Space Quest III*, *King's Quest IV*, *Leisure
Suit Larry 2*): 320×200, 16 EGA colors, a typed text parser, three-voice music, lots of
deaths, and 256 points. Humor: dry, warm, nerdy. Jokes come from real developer life
(Friday deploys, "have you tried turning it off and on again", exiting Vim, centering a
div, rubber-duck debugging, COBOL, Y2K). Never mean-spirited toward the cast — they're
real people the player knows. Everyone is competent at something; the humor is in the
situation, not in humiliating anyone.

Score display: **Score: X of 256**. (At 256/256 the ending notes: "Good thing we used a
16-bit integer.")

## Story

**Monolith Systems Inc.** has run its entire business since 1987 on **THE MONOLITH**, a
mainframe in the basement that has not been rebooted since 1999. Friday, 4:59 PM: Aidan the
summer intern does his first production deploy, follows the ancient runbook step "Restart the
Monolith"… and presses the big red button. The Monolith panics. Production is down, the
building's doors lock, the elevators and coffee machine die. Investors arrive Monday 9 AM.

**Act I — The Office.** Dominic fights his way through the locked-down 3rd floor and into
the basement to reach the Monolith. Along the way he caffeinates Fahim, gets Phil's master
keycard, helps Nicholas center a div, earns Mike's power bank, and gets Krishna's experimental
**Neural Debugging Interface (NDI)** helmet. In the basement, Denis — the greybeard sysadmin
who wrote the original code in 1987 and has guarded the machine ever since — tests him, then
hands him a COBOL manual and the adapter. Adriana, the lead architect, is slumped in a chair
wearing the v1 prototype helmet: she went in three hours ago and hasn't come out.

**Act II — Inside the Monolith.** Dominic is digitized into the Monolith: a strange neon
kingdom built from legacy code, ruled by the frail **King Kernel**. A **Heisenbug** — a bug
that vanishes whenever anyone looks at it — is devouring the Core. Dominic's rubber duck can
talk in here (and becomes the hint system). He refactors the Spaghetti Forest, tells a ghost
how to exit Vim, gets a node from the Oracle of the Stack, breaks the Infinite Loop, frees
Adriana from a Deadlock by giving a thread a BREAK! bar, fixes the linked-list bridge over the
Null Void, puts the Legacy Dragon to sleep by reading it the COBOL manual, then traps the
Heisenbug in a Unit Test Jar **by closing his eyes**. The trapped bug reveals its true name:
**the Millennium Bug** (Y2K) — a two-digit-year bug, dormant since 1999 because the Monolith
was never restarted. Aidan's restart woke it. It wasn't Aidan's fault; it was waiting for 27
years. Dominic applies Adriana's patch (4-digit years) and logs out.

**Act III — The Deploy.** Back in the server room at 11:58 PM Friday. Dominic commits the fix,
gets Adriana's code review, runs the tests… and must **wait until midnight** (Rule #1: NEVER
DEPLOY ON A FRIDAY; deploying early is a death). At 12:00 AM Saturday he deploys. Ending:
Monday's demo goes perfectly; epilogue for every character; credits; final score & rank.

## Cast (use these names exactly; ids in parentheses)

| Character | id | Role & personality | Look |
|---|---|---|---|
| **Dominic** | `dominic` | Hero. Senior software engineer. Dry wit, calm under fire. | Brown hair, teal hoodie, light jeans |
| **Aidan** | `aidan` | Summer intern, eager, mortified after the deploy. Not his fault. | Red cap, yellow hoodie, lanyard |
| **Nicholas** | `nicholas` | Frontend dev, mechanical keyboard collector, giant headphones, has been trying to center a div since Tuesday. | Curly black hair, red headphones, green tee |
| **Mike** | `mike` | Mike from Sales. Big personality, enormous power bank, sold features that don't exist yet. Generous. | Blond, gray suit, red tie |
| **Fahim** | `fahim` | SRE on call in the NOC, awake for 36 hours, zombie until caffeinated, then razor sharp. | Beard, dark hoodie |
| **Phil** | `phil` | CEO. Loves process, paperwork and golf. Kind but harried; on the phone with investors. | Bald w/ gray sides, glasses, navy blazer |
| **Krishna** | `krishna` | R&D genius who built the NDI helmet. Enthusiastic, precise, slightly mad-scientist. | Glasses, white lab coat |
| **Denis** | `denis` | Legendary greybeard sysadmin. Wrote the Monolith's code in 1987, lives in the basement, hasn't let it reboot since 1999. Gruff, loves riddles and cables. | Long gray hair, long beard, suspenders |
| **Adriana** | `adriana` | Lead architect. Brilliant, decisive. Went into the Monolith first; trapped in a deadlock. She wrote the fix. | Long dark hair, magenta blazer |
| **King Kernel** | `king` | Elderly ruler of the Monolith's world. Speaks in slightly archaic computer-ese. | Crown, white beard, punch-card robe |

Non-cast creatures (Act II): the Garbage Collector (robot), the Oracle (big face in a CRT), a
Vim-trapped ghost process ("PID 1991"), Thread A & Thread B (guard robots), the Legacy Dragon
(COBOL-breathing), the Heisenbug/Millennium Bug (glitchy insect).

## World map & room ids

```
ACT I (3rd floor)                                   BASEMENT
 [phil] — [office] — [hallway] —(stair door)→ [stairwell] → [basement] → [serverroom]
             |          |  |  |
        [cubicle]  [breakroom][noc][lab]

ACT II (inside the Monolith)
             [deadlock]
                 |
              [loop]
                 |
 [stack] —— [forest]
                 |
 [bridge] ——  [boot] —— [heap]
    |
 [dragon] → [core] → (log out) → [serverroom] (Act III)
```

## Room connections and arrival points

Arrival coordinates are feet positions `[x, y, facing]` in the destination room. If a
coordinate is not walkable the engine snaps to the nearest walkable point, but please honor
these so transitions feel continuous. Exit trigger areas must not contain the arrival point
of the reverse trip.

| From | Exit | To | Arrive at |
|---|---|---|---|
| cubicle | right edge of aisle | office | `[36, 176, 'right']` |
| office | bottom-left corner (to cubicles) | cubicle | `[300, 170, 'left']` |
| office | left edge | phil | `[296, 160, 'left']` |
| phil | right edge | office | `[18, 150, 'right']` |
| office | right edge | hallway | `[18, 165, 'right']` |
| hallway | left edge | office | `[302, 160, 'left']` |
| hallway | break room door | breakroom | `[160, 182, 'up']` |
| hallway | NOC door | noc | `[160, 182, 'up']` |
| hallway | lab door (needs `lab_open`) | lab | `[160, 182, 'up']` |
| hallway | stairwell door (needs `stairs_open`) | stairwell | `[44, 74, 'right']` (top landing) |
| breakroom | bottom edge | hallway | in front of break room door |
| noc | bottom edge | hallway | in front of NOC door |
| lab | bottom edge | hallway | in front of lab door |
| stairwell | top landing door | hallway | in front of stairwell door |
| stairwell | bottom landing | basement | `[22, 160, 'right']` |
| basement | left edge | stairwell | bottom landing |
| basement | server room door (needs `door_open`) | serverroom | `[40, 170, 'right']` |
| serverroom | left door | basement | in front of server room door |
| serverroom | wear helmet (cutscene) | boot | `[160, 150, 'down']` |
| boot | north | forest | `[160, 182, 'up']` |
| forest | south | boot | `[160, 120, 'down']` |
| boot | east | heap | `[18, 165, 'right']` |
| heap | west | boot | `[302, 160, 'left']` |
| boot | west | bridge | `[300, 160, 'left']` |
| bridge | east | boot | `[18, 160, 'right']` |
| forest | west | stack | `[300, 170, 'left']` |
| stack | east | forest | `[18, 165, 'right']` |
| forest | north (needs `forest_refactored`) | loop | `[160, 182, 'up']` |
| loop | south | forest | north end of forest path |
| loop | north (needs `loop_broken`) | deadlock | `[160, 182, 'up']` |
| deadlock | south | loop | north end of loop |
| bridge | west (needs `bridge_fixed`; gap = death) | dragon | `[300, 165, 'left']` |
| dragon | east | bridge | `[22, 160, 'right']` |
| dragon | gate (needs `dragon_asleep`) | core | `[160, 182, 'up']` |
| core | south | dragon | in front of gate |
| core | LOG OUT (after `bug_fixed`) | serverroom (Act III) | Dominic in the NDI chair |

## Items (ids)

| id | Name | Where from | Used for |
|---|---|---|---|
| `phone` | Your Phone | start | jokes (dead battery) |
| `duck` | Rubber Duck | cubicle drawer | hint system (TALK TO DUCK) |
| `mug` | Coffee Mug | cubicle desk | fill at coffee machine |
| `coffee` | Mug of Coffee | breakroom machine (with mug) | give to Fahim |
| `note` | Sticky Note | under cubicle keyboard | give to Nicholas |
| `badge` | ID Badge | cubicle coat hook | lab door reader; WEAR BADGE in the Heap |
| `keyboard` | RGB Keyboard | Nicholas | light for the stairwell (TURN ON KEYBOARD) |
| `esckey` | ESC Key | pry off keyboard | escape the Infinite Loop |
| `report` | Incident Report | Fahim | show to Phil |
| `keycard` | Master Keycard | Phil | stairwell door reader |
| `quarter` | Quarter | vending coin return | buy candy |
| `candy` | BREAK! Bar | vending machine | give to Thread A (deadlock) |
| `powerbank` | Power Bank | Mike | give to Krishna |
| `helmet` | NDI Helmet | Krishna | wear at the Monolith |
| `adapter` | DB-25 Adapter | Denis | connect helmet to the Monolith |
| `manual` | COBOL Manual | Denis | read to the Legacy Dragon |
| `jar` | Unit Test Jar | the Heap | trap the Heisenbug in the Core |
| `jarbug` | Bug in a Jar | Core (jar after capture) | proof; becomes a butterfly |
| `node` | List Node | the Oracle | fix the bridge |
| `patch` | Adriana's Patch | Adriana | apply in the Core |

Use `g.addItem(id)` / `g.removeItem(id)` / `g.has(id)`. Item descriptions and global item
verbs (e.g. TURN ON KEYBOARD, WEAR BADGE, TALK TO DUCK, PRY ESC KEY) live in
`src/content/items.ts`.

## Flags (g.flag / g.set)

All game state lives in `g.state.flags`. Use exactly these names.

**Global:** `act` (1, 2, 3)

**Act I:** `intro_alert`, `intro_done`, `drawer_open`, `duck_taken`, `mug_taken`,
`badge_taken`, `note_found`, `note_taken`, `aidan_comforted`, `nick_attention`, `nick_helped`,
`esc_taken`, `keyboard_on`, `coffee_off` (machine currently switched off), `coffee_rebooted`,
`fahim_awake`, `coin_found`, `candy_bought`, `phil_gave_keycard`, `lab_open`,
`helmet_given`, `stairs_open`, `breaker_off`, `panel_open`, `door_open`, `denis_trust`,
`helmet_connected`, `badge_worn`

**Act II:** `king_talked`, `duck_talked`, `jar_taken`, `vim_solved`, `oracle_asked`,
`node_given`, `forest_refactored`, `loop_broken`, `loop_count`, `adriana_free`,
`patch_given`, `bridge_fixed`, `dragon_asleep`, `jar_placed`, `bug_caught`, `bug_fixed`

**Act III:** `y2k_told`, `committed`, `reviewed`, `tested`, `midnight`, `deployed`

## Puzzles, room by room

Points come from `src/content/points.ts` via `award(g, 'id')`. Every award must be
reachable exactly once.

### cubicle — Dominic's Cubicle *(done — reference implementation)*
Opening scene with Aidan. OPEN DRAWER → TAKE DUCK (2). TAKE MUG (2). LOOK UNDER KEYBOARD →
note (3). TAKE BADGE (2).

### office — The Open Office (music `office`)
Rows of cubicles, a whiteboard ("ARCHITECTURE": a big box labeled MONOLITH with arrows
everywhere and a "???"), a "DAYS SINCE LAST OUTAGE: 0" sign, water cooler, windows with dusk
skyline. Exits: cubicle (bottom-left), phil (left), hallway (right).
- **Nicholas** sits at his desk typing (pose `type`, facing `up` or side), wearing huge
  headphones. TALK TO NICHOLAS before attention: "He can't hear you over his music. You can
  hear it though — synthwave, at a volume that violates several OSHA guidelines."
  TAP NICHOLAS / REMOVE HEADPHONES / WAVE AT NICHOLAS → `nick_attention` (2). He explains he's
  been trying to center a div since Tuesday. GIVE NOTE TO NICHOLAS → `nick_helped` (8): he's
  overjoyed, gives you his spare RGB keyboard, the "Rainbow Warrior" ("Take it. I have
  thirty-seven more. It's got a battery that lasts a month and enough LEDs to land a plane.").
  `g.addItem('keyboard')`. After this he goes back to work, triumphant.
- **Aidan** is hiding under his desk (crouched or sitting on the floor, `sit` pose, partly
  hidden). TALK TO AIDAN / COMFORT AIDAN → `aidan_comforted` (5): Dominic tells him
  it's a blameless postmortem — a system that falls over from one restart was a time bomb
  anyway. Aidan perks up and mentions the deploy only changed one comment and the runbook said
  to restart the Monolith; Denis in the basement "kept yelling NEVER REBOOT IT" at the
  onboarding.
- **Mike** appears here only after `candy_bought` (at his desk, on the phone, munching his
  BREAK! bar). Talking to him gives fun sales-speak. Before that, his desk is empty with a
  "SALESPERSON OF THE YEAR 2019" trophy.
- Whiteboard, water cooler (DRINK WATER: "refreshing, but it's not coffee"), plants,
  windows, Nicholas's desk with an army of keyboards.

### phil — Phil's Office (music `office`)
Corner office, big windows (dusk), large desk, putting green with golf ball & putter,
"SYNERGY" poster, swear jar on desk, framed photo "Monolith Systems, 1987" (young Phil and
young Denis in front of the Monolith), bookshelf.
- **Phil** paces by the window on the phone with investors ("Yes, Mr. Henderson, everything is
  fine. It's a... planned... feature."). TALK TO PHIL: he can't authorize basement access
  without an incident report — rules are rules, he wrote them.
- SHOW/GIVE REPORT TO PHIL → `phil_gave_keycard` (8): he reads it, pales, hands over his
  master keycard ("It also opens the executive bathroom. Please don't use the executive
  bathroom."). `removeItem('report')`, `addItem('keycard')`.
- Fun: PUTT / PLAY GOLF / TAKE PUTTER (Phil: "Not the putter."), swear jar ("Phil fines himself
  a dollar per swear. The jar is full; it's been a long quarter."), TAKE MONEY from swear jar →
  Phil stops you.

### hallway — Elevator Lobby (music `office`)
A long hallway. Back wall doors (left→right): **Break Room**, **NOC**, **elevators** (two
doors, "OUT OF ORDER" sign: "FIRMWARE UPDATE IN PROGRESS: 1 OF 4,096"), **R&D Lab** (badge
reader with red/green light), **Stairwell** fire door (keycard reader, red light, sign
"STAIRS — AUTHORIZED ACCESS ONLY DURING LOCKDOWN"). A plaque: "MONOLITH SYSTEMS — PROUDLY
NEVER REBOOTED SINCE 1999". Fire extinguisher, potted plant, window. Exit left → office.
- Lab door: USE BADGE ON READER (or SWIPE BADGE / OPEN DOOR with badge) → `lab_open` (3),
  light turns green, door opens. Without badge: "The reader blinks red. You need a badge."
- Stairwell door: USE KEYCARD ON READER → `stairs_open` (3). Using the badge: "ACCESS DENIED.
  DEVELOPER CLEARANCE INSUFFICIENT." Without keycard the door won't open.
- PULL FIRE ALARM → "You consider it. Then you consider the sprinklers above the server racks,
  and your career. You don't." CALL ELEVATOR / PUSH BUTTON → elevator joke.
- Door exits: walking into an open door's threshold area leaves; closed/locked doors block with
  a message.

### breakroom — Break Room (music `office`)
- **Coffee machine** ("SmartBrew 3000", an IoT machine running on the Monolith) shows
  `418 I'M A TEAPOT`. A poster: "HAVE YOU TRIED TURNING IT OFF AND ON AGAIN?". REBOOT/RESTART
  MACHINE, or TURN OFF MACHINE then TURN ON MACHINE, or UNPLUG then PLUG IN →
  `coffee_rebooted` (5): it boots ("Running on local firmware. Monolith unreachable. Brewing
  anyway."), display shows READY. KICK MACHINE: "418 I'M A TEAPOT. Kicking it seems to have made
  it more confident."
- FILL MUG / PUT MUG IN MACHINE / GET COFFEE (with mug, after reboot) → `fill_mug` (3):
  `removeItem('mug')`, `addItem('coffee')`. Without mug: "It would brew directly onto the
  floor." Before reboot: teapot error. Coffee can be refilled later if Dominic drinks it (no
  dead ends) — just don't award twice.
- **Ancient coffee pot** on a warmer: "brewed sometime during a previous administration."
  DRINK COFFEE FROM POT / DRINK OLD COFFEE → **death** ("The coffee has achieved sentience. It
  does not appreciate being drunk.").
- **Vending machine** with a BREAK! bar stuck in a coil. Sticker: "WARNING: DO NOT ROCK OR TILT.
  MACHINE MAY TIP OVER CAUSING SERIOUS INJURY OR DEATH." SHAKE/ROCK/TILT/PUSH MACHINE → **death**
  (crushed; "It was the snack that finally got you.").
- **Mike** stands at the vending machine, slapping it ("Come ON! That's MY BREAK! bar!"). Holding
  his giant power bank. TALK: he's been feeding it quarters; his BREAK! bar is stuck; he's out
  of change.
- LOOK IN COIN RETURN / CHECK COIN RETURN / SEARCH VENDING MACHINE → `coin_found` (3):
  `addItem('quarter')`.
- BUY CANDY / PUT QUARTER IN MACHINE / USE QUARTER ON MACHINE → `candy_bought` (5): two bars
  drop — yours, and Mike's stuck one gets knocked loose. Mike is ecstatic and gives you his power
  bank → `mike_bank` (5) ("Sales is all about relationships, Dom."). `addItem('candy')`,
  `addItem('powerbank')`, `removeItem('quarter')`. Mike then leaves (walks out the bottom); he
  appears at his desk in the office afterward.
- Fridge: OPEN FRIDGE — contents include a sandwich labeled "MIKE'S — DO NOT EAT. I KNOW WHO YOU
  ARE." **Fridge magnet** (important clue): "Q: How many programmers does it take to change a
  light bulb? A: None. That's a hardware problem." (LOOK AT MAGNET / READ MAGNET / LOOK AT
  FRIDGE mentions the magnets.) Microwave, sink, table with chairs.

### noc — Network Operations Center (music `noc`)
Dark room; a wall of monitors with red dashboards (animate: blinking, scrolling graphs). Big
sign: **"RULE #1: NEVER DEPLOY ON A FRIDAY."** and "DAYS SINCE LAST INCIDENT: 0". Energy drink
cans, pizza boxes.
- **Fahim** slumped at the console (pose `sit`), mumbling "...coffee..." TALK before coffee:
  incoherent zombie mumbling. GIVE COFFEE TO FAHIM → `fahim_awake` (8): he chugs, eyes snap
  open, rapid-fire SRE briefing: Monolith core panic, nothing can reach it remotely, someone
  must go to the basement; stairwell is badge-locked, needs CEO clearance → hands over the
  incident report (`addItem('report')`, `removeItem('coffee')`). Mentions Krishna's helmet
  project and that Adriana "went down to the basement three hours ago and nobody's heard from
  her." After this he's awake, typing (pose `type`) and gives useful status lines.

### lab — R&D Lab (music `office`)
Krishna's workbench, the NDI v2 helmet on a stand (sparking slightly), oscilloscope, a robot
arm, 3D printer, whiteboard with a brain diagram, "CABLE DRAWER OF DESPAIR".
- **Krishna** at his bench. TALK: explains the Neural Debugging Interface: it lets a person
  debug a system from the inside. Adriana took the v1 prototype down to the Monolith three
  hours ago and hasn't come out (vitals fine). The v2 is ready, but the building's power is
  unstable; it needs a big battery (20,000 mAh+).
- GIVE POWER BANK TO KRISHNA → `helmet_given` (8): he wires it in and hands you the helmet
  (`addItem('helmet')`, `removeItem('powerbank')`). "One thing: the Monolith's port is a DB-25
  serial port from 1987. You'll need an adapter. Denis has every cable ever made."
- TAKE HELMET before then: Krishna stops you ("It's not powered! You'd just be wearing a very
  expensive hat.").

### stairwell — Stairwell (music `basement`)
Concrete fire stairs zig-zagging down from the 3rd floor (top-left landing, door) to the
basement (bottom-right). Graffiti, railing, a dead emergency light.
- Without light (`keyboard_on` false): the room is pitch black (`g.dark = true` or `g.light`
  with tiny radius) and the text says "It's pitch black. You can't see a thing." Walking onto
  the stairs (zone) without light → **death** (fall: "You missed the first step. And all the
  others.").
- TURN ON KEYBOARD (item verb sets `keyboard_on`; the stairwell detects it in `tick` or handles
  `turnon keyboard` itself) → rainbow light radius around Dominic (`g.light = {r: 60,
  rainbow: true}`) and `light_keyboard` (5) the first time the stairwell is lit. If the keyboard
  is already on when entering, award on entry. Then the stairs are walkable to the bottom exit.

### basement — Basement Corridor (music `basement`)
Dim corridor: pipes on the ceiling, flickering fluorescent light, a mop bucket, a **framed
photo** on the wall (young Denis hugging a PDP-11: "ME AND GERTRUDE, 1979. TRUE LOVE."), a
**breaker panel**, a **puddle** across the corridor with a frayed cable sparking into it
(animate sparks), and at the far end the heavy steel **server room door** with a sign
"AUTHORIZED PERSONNEL ONLY. THAT MEANS DENIS." and a little sliding eye-slot.
- Walking into the puddle while `breaker_off` is false → **death** (electrocution; "You are now
  a conductor. Not the musical kind."). TOUCH CABLE → death too.
- OPEN PANEL → `panel_open`: three breakers labeled "1: MONOLITH — DO NOT TOUCH!!!", "2:
  VENDING MACHINES", "3: BASEMENT AUX". TURN OFF BREAKER 3 (FLIP SWITCH 3, etc. — use `c.num`)
  → `breaker_off` (5): sparks stop. BREAKER 1 → **death** (game over: the Monolith loses power
  entirely; "You have turned a partial outage into a total outage."). BREAKER 2 → "Somewhere
  upstairs, Mike screams." (harmless).
- KNOCK ON DOOR → the slot opens; Denis: "Who goes there? Speak the name of my first love."
  SAY GERTRUDE (raw handler; also accept just "gertrude") → `door_open` (5): door unlocks.
  Wrong answer: "WRONG." Slot slams.

### serverroom — Server Room (music `serverroom`; Act III `deploy`)
THE MONOLITH: a huge 1987 mainframe (beige/blue cabinets, spinning tape reels, blinking light
panels, a CRT console). Raised floor tiles, newer server racks, Denis's corner (cot, hot plate,
green-screen terminal, a framed "Y2K SURVIVOR" t-shirt), a wall clock, and a chair with
**Adriana** slumped in it wearing the v1 helmet, cables running into the Monolith.
- **Denis** TALK: gruff greeting. Before trusting you he poses a riddle: "How many programmers
  does it take to change a light bulb?" Raw handler accepts answers containing "none", "zero",
  "0", "hardware" → `denis_trust` (8): he laughs, tells the story (never rebooted since 1999,
  "I knew this would happen"), hands over the COBOL manual and the DB-25 adapter
  (`addItem('manual')`, `addItem('adapter')`): "In there, the old parts only speak COBOL." Wrong
  answers: "Nope. Think about it. Come back when you know."
- LOOK AT ADRIANA: unresponsive, breathing, smiling faintly. TAKE HELMET (Adriana's) → Denis:
  "Don't! Pull her out mid-session and her brain gets garbage collected."
- PLUG ADAPTER INTO MONOLITH / CONNECT HELMET TO MONOLITH (needs helmet + adapter) →
  `helmet_connected` (3).
- WEAR HELMET (after connected) → `wear_helmet` (5): Dominic sits in the second chair, digitize
  effect (sfx `digitize`, flashes, pixel scatter), `g.set('act', 2)`, `g.goto('boot',
  [160,150,'down'])`. WEAR HELMET before connecting: "NO SIGNAL".
- Clock shows ~6:30 PM in Act I.
- **Act III** (`act === 3`): Dominic wakes up in the chair at 11:58 PM. Adriana wakes too
  (stands, stretches). Denis is there. The console terminal is now usable.
  - TALK TO DENIS → `y2k_told` (3): Dominic tells him it was Y2K. Denis: "I KNEW it. I wrote that
    date routine in 1987. Two digits. 'We'll fix it before 2000,' I said..." He's moved; it was
    never Aidan's fault.
  - COMMIT / GIT COMMIT (at the console) → `committed` (5).
  - ASK ADRIANA TO REVIEW / REVIEW CODE (needs committed) → `reviewed` (5): "LGTM. Ship it...
    well. Not yet."
  - RUN TESTS / TEST (needs reviewed) → `tested` (5): all green.
  - DEPLOY before midnight → **death** ("You deployed on a Friday. Again. The universe has a
    sense of humor, and a sense of irony. The Monolith panics harder than ever...").
    Denis/Adriana should *not* stop you (Sierra rules), but LOOK AT CLOCK shows 11:59 PM FRIDAY,
    and the duck hints Rule #1.
  - WAIT / WAIT UNTIL MIDNIGHT (needs tested; if before tests, waiting is just "Time passes")
    → `midnight` (6): the clock ticks to 12:00 AM. "It is now Saturday."
  - DEPLOY after midnight → `deployed` (10): the Monolith hums, lights go green, everybody
    cheers → `await playEnding(g)` (from `src/content/ending.ts`).

### boot — Boot Sector (music `cyber`)
Black void, cyan perspective grid floor, a glowing arrival pad, floating BIOS text, signposts
("↑ SPAGHETTI FOREST", "HEAP →", "← NULL VOID"), and **King Kernel** on a floating throne made of
floppy disks. Exits north/east/west.
- On first arrival (from serverroom): digitize-in effect; Dominic looks at his pixel hands;
  `afterEnter` short scene. King Kernel calls out.
- TALK TO KING → `king_talked` (3): "A User! The first in twenty-seven years!" He explains: a
  Heisenbug has awoken in the Core and is eating the date tables; the Architect (Adriana) went
  to stop it, was last seen north beyond the Infinite Loop; the Core lies west across the Null
  Void, guarded by the Legacy Dragon; beware the Garbage Collector in the Heap — "it collects
  anything no one references. Be sure you are... referenced." Later talks give recaps.

### heap — The Heap (music `cyber`)
Piles of discarded objects (colorful blocks: old strings, arrays, deprecated icons, a broken
floppy, a "DEPRECATED" sign). The **Garbage Collector** (large robot with a trash-can body and a
claw) patrols.
- If Dominic is in the Heap without `badge_worn`, the GC notices ("UNREFERENCED OBJECT
  DETECTED") and approaches; if it reaches him → **death** ("You have been garbage collected.
  Your memory has been freed."). Give the player a few seconds to leave or WEAR BADGE.
- WEAR BADGE here (item verb) awards `gc_badge` (5) — handle also on entry if already worn (GC
  scans you: "REFERENCE FOUND: DOMINIC, SENIOR SOFTWARE ENGINEER. CARRY ON." → award).
- The **Unit Test Jar** sits on a junk pile. TAKE JAR → `jar_taken` + `take_jar` (5).
- SEARCH JUNK: funny finds (a 2003 toolbar, an unused variable named `temp2`, a thousand
  abandoned `TODO`s).

### forest — Spaghetti Forest (music `forest`)
Trees made of tangled yellow noodles (with a few red "meatballs" — global variables), GOTO
signposts ("GOTO 10"), a carved "TODO: refactor this mess (1989)". The north path is blocked by
a dense tangle until refactored.
- REFACTOR / UNTANGLE / FIX / CLEAN UP SPAGHETTI (or TREES / CODE / PATH / FOREST) →
  `forest_refactored` (4): noodles straighten into a neat path; redraw.
- FOLLOW SIGN / GO TO 10 → teleports you back to the Boot Sector ("GOTO considered harmful.").
- EAT SPAGHETTI → joke. Exits: south boot, west stack, north loop (after refactor).

### stack — Stack Overflow Tower (music `stack`)
A tower of stacked frames (rectangles labeled main(), init(), parse(), parse(), parse()…)
rising off the top of the screen. At its base, **the Oracle**: a giant face in a glowing CRT.
Near it hovers the **ghost process "PID 1991"**, stuck in Vim since 1991 ("HOW DO I GET OUT OF
THIS EDITOR?!").
- TALK TO ORACLE before reputation: "You need 50 reputation to ask a question."
- Answer the ghost: raw text containing `:q!`, `:q`, `:wq`, `:x`, `zz`, or "escape colon q" →
  `vim_solved` (8): the ghost escapes, thanks you, fades into the light; "+50 reputation".
  GIVE ESC KEY TO GHOST → "Good start! But he still needs the command." TALK TO GHOST gives the
  plea.
- ASK ORACLE ABOUT anything (after vim) → `oracle_asked` (4) first time. Topics: bridge / void /
  node / null → the Oracle gives the **List Node** (`node_given`, `take_node` 5,
  `addItem('node')`) ("Marked as duplicate of 'How do I fix a broken linked list?'. Here, take
  this."); bug / heisenbug → "Observing it makes it vanish. Don't look; write a test."; adriana →
  "Last seen beyond the Infinite Loop. Closed as off-topic."; dragon → "Legacy systems can be
  soothed with their own documentation."; vim → "Duplicate."; anything else → "Closed as
  opinion-based."

### loop — The Infinite Loop (music `loop`)
A circular arena; an arch reading `while (true) {` and a closing `}`; an iteration counter
(`loop_count`) displayed in the sky. Walking out any edge except south (before breaking)
returns you to the same screen with `loop_count` incremented ("Iteration 1,025...").
- BREAK / TYPE BREAK / USE ESC KEY / PRESS ESC / ESCAPE / CTRL C → `loop_broken` (8): the arch
  shatters, the north exit opens to the Deadlock.
- After 5 iterations the duck chimes in with a nudge.

### deadlock — The Deadlock (music `deadlock`)
A chamber with a cage in the center holding **Adriana**. Two guard robots, **Thread A** (holds
Lock 1, waits for Lock 2) and **Thread B** (holds Lock 2, waits for Lock 1), frozen staring at
each other.
- TALK TO ADRIANA (caged): "Dominic! These two have been waiting for each other for three hours.
  Neither will let go first. Classic deadlock."
- GIVE CANDY TO THREAD (A or B) → `adriana_free` (10): "Need a break? Have a BREAK!" The thread
  takes a break, releases its lock; the other grabs it, finishes, releases; cage opens.
  `removeItem('candy')`. ATTACK THREAD → "They don't even notice. They're very busy waiting."
- TALK TO ADRIANA (freed) → `patch_given` (5): she explains the bug — it's a Heisenbug, it
  vanishes when observed; "Don't look at it. Trap it in a test." She gives her patch
  (`addItem('patch')`) — she was writing it when the threads grabbed her. She logs out ("I'll
  keep Denis from rebooting anything") — fades away.

### bridge — The Null Void (music `void`)
A chasm of black/purple void with falling zeros; a bridge of linked-list nodes (boxes with
arrows) spanning west; one node missing (a gap labeled NULL).
- Walking onto the gap before `bridge_fixed` → **death** ("NullPointerException: Dominic").
- PUT NODE IN GAP / USE NODE ON BRIDGE / FIX BRIDGE (with node) → `bridge_fixed` (8),
  `removeItem('node')`, redraw.
- Reaching the west end the first time → `bridge_crossed` (2) (on entering dragon from bridge is
  fine too).

### dragon — Legacy Dragon's Lair (music `dragon`)
A castle gate built of green monochrome COBOL source; a huge **Legacy Dragon** (punch-card
scales, smoke) coiled before it.
- Approaching the gate while awake → it roars COBOL fire → **death** ("You have been compiled.").
- TALK TO DRAGON: it speaks only COBOL ("IDENTIFICATION DIVISION. PROGRAM-ID. GO-AWAY.").
- READ MANUAL TO DRAGON / READ MANUAL / SHOW MANUAL TO DRAGON / GIVE MANUAL TO DRAGON →
  `dragon_asleep` (10): Dominic reads aloud; by page three the dragon is snoring (animate Zzz).
  Keep the manual.
- Gate → Core once asleep; first entry awards `core_entered` (2) (in core's enter).

### core — The Core (music `core`)
A circular chamber; a central **altar** with the glowing Date Routine (`IF YY > 99...`), a giant
"99 → 00" counter, and the **Heisenbug** flitting around (glitchy sprite, teleports, flickers).
- LOOK AT BUG → it vanishes the moment you look; reappears elsewhere. CATCH/ATTACK BUG → **death**
  ("You swing at the bug. It isn't there. Then it is. Behind you.").
- PUT JAR ON ALTAR (with jar) → `jar_placed` (5).
- CLOSE EYES (after jar placed) → `bug_caught` (10): screen goes black, buzzing, a *clink*; OPEN
  EYES (or any key) — the bug is in the jar, the label glows TEST FAILED. `removeItem('jar')`,
  `addItem('jarbug')`. Reading the altar now reveals it's the **Millennium Bug** (Y2K).
  CLOSE EYES before placing the jar: "The buzzing gets closer. Then it moves on. Without a trap,
  closing your eyes accomplishes nothing."
- APPLY PATCH / PUT PATCH ON ALTAR / FIX CODE (with patch, after bug caught) → `bug_fixed` (10):
  4-digit years; the test turns green; the bug becomes a harmless butterfly ("It's not a bug,
  it's a feature.") and flutters off. `removeItem('patch')`, `removeItem('jarbug')`. A glowing
  LOG OUT portal appears.
- LOG OUT / EXIT / REMOVE HELMET / ENTER PORTAL (after fixed) → `logout` (5), `g.set('act', 3)`,
  `g.goto('serverroom', ...)`.

## Deaths (Sierra flavor — at least one per area)
Ancient coffee; shaking the vending machine; dark stairwell; electrified puddle / cable;
breaker 1; Garbage Collector; `rm -rf` in cyberspace (global); null gap; dragon fire; attacking
the Heisenbug; deploying on Friday. Each death message is funny and specific. Use
`return g.die(text, { title })`.

## Ending (content/ending.ts)
After the deploy: dashboards go green (NOC), Saturday dawn over HQ (exterior with
`ext_time = 'dawn'`), Monday 9 AM demo in the conference room (Phil and Mike presenting to the
investors, everyone present), then an epilogue card for each character, then a scrolling credits
roll with the final score and a rank:

| Score | Rank |
|---|---|
| 0–63 | Unpaid Intern |
| 64–127 | Junior Developer |
| 128–191 | Software Engineer |
| 192–239 | Senior Engineer |
| 240–255 | Principal Engineer |
| 256 | Legendary Greybeard ("256 of 256. Good thing we used a 16-bit integer.") |
