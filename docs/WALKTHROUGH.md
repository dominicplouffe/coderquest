# Coder's Quest: The Friday Deploy — Complete Walkthrough

> **SPOILERS!** Everything below gives the game away. Try the duck first (`TALK TO DUCK`,
> twice for a more specific hint).

This route collects all **256 points**. Points are shown in brackets. The same route is run
automatically by `npm test` (`scripts/walkthrough.txt`).

---

## Act I — Friday, 4:59 PM

### Dominic's Cubicle
| Command | Points |
|---|---|
| `OPEN DRAWER`, `TAKE DUCK` — your hint system | 2 |
| `TAKE MUG` | 2 |
| `LOOK UNDER KEYBOARD` — the "how to center a div" sticky note | 3 |
| `TAKE BADGE` (on the coat hook) | 2 |

Walk east into the open office.

### The Open Office
| Command | Points |
|---|---|
| `TAP NICHOLAS` — he can't hear you through those headphones | 2 |
| `GIVE NOTE TO NICHOLAS` — he gives you his spare RGB keyboard | 8 |
| `PRY ESC KEY` — pop the loose Escape keycap off the keyboard | 5 |
| `TALK TO AIDAN` (hiding under his desk) — a blameless postmortem | 5 |

Go east to the elevator lobby.

### Break Room
| Command | Points |
|---|---|
| `TURN OFF MACHINE`, `TURN ON MACHINE` — the coffee machine thought it was a teapot | 5 |
| `FILL MUG` | 3 |
| `LOOK IN COIN RETURN` — a quarter | 3 |
| `BUY CANDY` — two BREAK! bars drop; Mike gets his, and gives you his power bank | 5 + 5 |

Read the **fridge magnet** while you're here (you'll need it later). Don't drink from the
ancient coffee pot. Don't shake the vending machine.

### Network Operations Center (NOC)
| Command | Points |
|---|---|
| `GIVE COFFEE TO FAHIM` — he wakes up and hands you the incident report | 8 |

Note the sign: **RULE #1: NEVER DEPLOY ON A FRIDAY.**

### R&D Lab
| Command | Points |
|---|---|
| `USE BADGE ON READER` (lab door, in the lobby) | 3 |
| `GIVE POWER BANK TO KRISHNA` — he gives you the NDI helmet | 8 |

### Phil's Office (west of the open office)
| Command | Points |
|---|---|
| `SHOW REPORT TO PHIL` — he gives you his master keycard | 8 |

### The Stairwell
| Command | Points |
|---|---|
| `USE KEYCARD ON READER` (stairwell door, in the lobby) | 3 |
| `TURN ON KEYBOARD` — it's pitch black; walking in the dark is fatal | 5 |

### Basement Corridor
| Command | Points |
|---|---|
| `LOOK AT PHOTO` — "Me and Gertrude, 1979. True love." | — |
| `OPEN PANEL`, `TURN OFF BREAKER 3` — kills the cable sparking in the puddle. **Not breaker 1.** | 5 |
| `KNOCK ON DOOR`, `SAY GERTRUDE` | 5 |

### The Server Room
| Command | Points |
|---|---|
| `TALK TO DENIS`, then answer his riddle: `SAY NONE` (it's a hardware problem) — the COBOL manual and DB-25 adapter | 8 |
| `PLUG ADAPTER INTO MONOLITH` | 3 |
| `WEAR HELMET` — you are digitized | 5 |

---

## Act II — Inside the Monolith

### Boot Sector
| Command | Points |
|---|---|
| `TALK TO KING` | 3 |
| `TALK TO DUCK` — it can talk in here! | 2 |

### The Heap (east)
| Command | Points |
|---|---|
| `WEAR BADGE` — so the Garbage Collector knows you're referenced (do it fast!) | 5 |
| `TAKE JAR` — the Unit Test Jar | 5 |

### Spaghetti Forest (north of the Boot Sector)
| Command | Points |
|---|---|
| `REFACTOR SPAGHETTI` — opens the path north | 4 |

### Stack Overflow Tower (west of the forest)
| Command | Points |
|---|---|
| `SAY :Q!` — the ghost has been stuck in Vim since 1991 | 8 |
| `ASK ORACLE ABOUT BRIDGE` — first question, and the Oracle gives you a list node | 4 + 5 |

### The Infinite Loop (north of the forest)
| Command | Points |
|---|---|
| `BREAK` (or `USE ESC KEY`) | 8 |

### The Deadlock (north)
| Command | Points |
|---|---|
| `GIVE BREAK BAR TO THREAD A` — "Need a break? Have a BREAK!" | 10 |
| `TALK TO ADRIANA` — she gives you her patch and tells you how to catch the bug | 5 |

### The Null Void (west of the Boot Sector)
| Command | Points |
|---|---|
| `PUT NODE IN GAP` — don't step in the gap before you do | 8 |
| Walk west across the bridge | 2 |

### Legacy Dragon's Lair
| Command | Points |
|---|---|
| `READ MANUAL TO DRAGON` — COBOL is extremely soporific | 10 |
| Enter the gate | 2 |

### The Core
| Command | Points |
|---|---|
| `PUT JAR ON ALTAR` | 5 |
| `CLOSE EYES` — a Heisenbug vanishes when observed, so don't observe it | 10 |
| `READ ALTAR` — it's the Millennium Bug (Y2K) | — |
| `APPLY PATCH` — 4-digit years; it's not a bug, it's a feature | 10 |
| `LOG OUT` | 5 |

---

## Act III — 11:58 PM, Friday

### The Server Room
| Command | Points |
|---|---|
| `TALK TO DENIS` | 3 |
| `COMMIT` | 5 |
| `ASK ADRIANA TO REVIEW` | 5 |
| `RUN TESTS` | 5 |
| `WAIT` — it's still Friday! (Rule #1) | 6 |
| `DEPLOY` | 10 |

Enjoy the ending. **256 of 256: Legendary Greybeard.**

---

## Ways to die (collect them all)

- Drink the ancient coffee in the break room.
- Shake (or rock, or tilt) the vending machine.
- Walk down the stairwell in the dark, or jump over the railing.
- Wade into the electrified puddle, or touch the sparking cable.
- Turn off breaker 1.
- Linger in the Heap without your badge.
- Eat a meatball in the Spaghetti Forest.
- Climb the Stack Overflow Tower.
- Step into the bridge's NULL gap, or jump into the void.
- Walk up to the dragon's gate while it's awake, or attack it.
- Try to catch or attack the Heisenbug with your bare hands.
- Type `rm -rf /` anywhere inside the Monolith.
- Deploy on a Friday.

## Easter eggs

`SUDO MAKE ME A SANDWICH` · `XYZZY` · `GIT BLAME` · `GIT LOG` · `WHOAMI` · `LS` · `PWD` ·
`FIZZBUZZ` · `42` · `HELLO WORLD` · `KISS DUCK` · `TAKE KEVIN` · and the konami code.
