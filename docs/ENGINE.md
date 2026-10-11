# Coder's Quest Engine — Room Author's Guide

Everything is TypeScript under `src/`. The engine is a tiny SCI0-style adventure engine.

```
src/engine/   palette, raster (Surface), font, actor, walk (A*), parser, ui, audio, game
src/art/      lib.ts (scenery helpers), humanoid.ts + cast.ts (character sprites)
src/content/  items, points, hints (the duck), defaults (fallback replies), globals, title, intro, music, ending
src/rooms/    one file per room; rooms/index.ts registers them
```

Run `npx tsc --noEmit` to typecheck. The dev server: `npx vite` (http://localhost:5173).
Jump straight into a room for testing: `http://localhost:5173/?room=heap&act=2&items=badge,duck&flags=king_talked`.

## Screen & scale (READ THIS — it matters most)

* Logical screen 320×200. Status bar is rows 0–9; **the room picture is 320×190** and all room
  coordinates (art, walk areas, hotspots, actor positions) are picture coordinates, y=0 at the
  top of the picture.
* **A standing adult is 37 px tall and ~11 px wide.** Actor (x,y) is the point between their
  feet. Draw every room at this scale:
  * door ≈ 22–26 w × 44–48 h; ceiling ≈ 60–75 px above the floor/wall seam
  * desk/table top ≈ 16–20 px above the floor; chair seat ≈ 9 px, chair back ≈ 18 px
  * monitor ≈ 18–24 w × 14–20 h; keyboard ≈ 24×3; mug 4×5
  * server rack ≈ 22–30 w × 50–60 h; a mainframe cabinet can be big (80–140 w × 60–80 h)
* Typical layout: wall from y≈10 to the seam at y≈100–120; floor below; the walkable floor
  usually y≈115–188. Characters don't scale with depth, so keep the walkable depth band modest.
* Sierra composition: strong horizontals, readable silhouettes, one or two focal props, a
  little ambient animation. Leave the walkable floor fairly uncluttered and calm.

## Palette & style rules

* Scenery uses the 16 EGA colors only: `0 black 1 blue 2 green 3 cyan 4 red 5 magenta 6 brown
  7 lgray 8 dgray 9 lblue 10 lgreen 11 lcyan 12 lred 13 lmagenta 14 yellow 15 white`.
  (Indices 16–23 are reserved for character skin/hair.)
* `dith(a, b, level)` makes ordered-dither fills (level 0..16; 8 = 50% checker). **Use dithers
  sparingly** — big 50% dither areas look like noise when scaled up. Prefer solid fills with
  dithered *bands* for shading/gradients (`p.gradV`), small textures, and glows.
* Make sure characters read against floors: avoid floors in the same color as clothing. Dominic
  wears a teal (3) hoodie and light-blue (9) jeans.
* Text on signs: `p.micro(x, y, 'TEXT', color)` (3×5 font, uppercase) or `p.text()` (main font).
* Cyberspace rooms: black backgrounds, neon EGA brights (11, 13, 10, 14, 9), grids, glow.

## Surface drawing API (`p` in `draw(p, g)`)

`rect, frame, hline, vline, line(x0,y0,x1,y1,fill,thick), lines(pts), poly(pts, fill),
polyO(pts, fill, outline), ellipse, ellipseO, circle, gradV(x,y,w,h,[colors]),
gradH, glow(cx,cy,r,inner,outer), speckle(x,y,w,h,fill,density,seed), text, textC, micro, blit(img,x,y)`.
`rng(seed)` gives a deterministic random function (always seed randomness so pictures don't change).

### Priority (depth) — how actors get hidden behind furniture
Each pixel also stores a priority. Background art has priority 0 and never hides actors.
Wrap anything that should hide an actor standing *behind* it in `p.at(z, () => {...})`, where
`z` is the y of the object's front edge on the floor. An actor whose feet y < z is hidden by
those pixels; an actor in front (y > z) draws over them.

### Art helpers (`src/art/lib.ts`)
`skyline, officeWindow, wall, baseboard, carpet, tileFloor, concrete, bricks, ceiling,
fluorescent, desk, monitor, codeLines, keyboard, mug, plant, officeChair, door, poster,
whiteboard, clock, partition, serverRack (returns LED list), blinkLeds, gridFloor, starfield,
bits, codeSlab, glowText, signpost`. Read the source for parameters. Feel free to create new
helpers **in your own files** (do not edit shared files other agents are using).

## RoomDef (`src/engine/types.ts`)

```ts
export const heap: RoomDef = {
  id: 'heap', title: 'The Heap', music: 'cyber',
  draw(p, g) { ... },                  // paint the background (re-run by g.redraw())
  walk: [[x,y,w,h], [x0,y0,x1,y1,...]],// walkable rects/polygons (feet positions)
  blocks: [...],                       // holes in the walkable area (or a function of g)
  start: [160, 160, 'down'],
  look: 'Room description for plain LOOK.',
  hotspots: [{ id: 'jar', nouns: ['jar','test jar'], area: [x,y,w,h], at: [x,y],
               when: (g) => !g.flag('jar_taken'), look: 'A jar...' }],
  exits: [{ area: [0,120,6,70], to: 'boot', at: [302,160,'left'], dir: 'west',
            when?, blocked?: (g) => g.flag('x') ? undefined : 'A message' }],
  zones: [{ area: [...], when: (g) => !g.flag('bridge_fixed'), enter: async (g) => { ... } }],
  nouns: { junk: ['junk','pile','piles','garbage'] },  // extra local vocabulary
  verbs: {
    'take jar': async (g) => { await g.approach('jar'); ... },
    'look/in junk,search junk': 'You find nothing.',   // string = just print it
  },
  enter(g, from) { /* sync: add NPCs, set lights */ },
  afterEnter: async (g, from) => { /* scripted scene after the room appears (skipped on restore) */ },
  tick(g) { /* 60 Hz while not frozen */ },
  overlay(g, s, t) { /* animated drawing behind actors, every frame */ },
  front(g, s, t)   { /* animated drawing in front of actors */ },
  raw: async (g, text) => { /* free-text hook (passwords, ':q!'); return true if handled */ },
};
```

### Verb patterns
Keys are `"verb[/prep] [noun] [noun2]"`, comma-separated alternatives, `|` alternatives per
slot. `*` = any noun (required), `?` = anything/none; omitted noun = must be no noun; omitted
noun2 = ignored. Verbs/nouns are canonical ids (synonyms are resolved by the parser — see the
`VERBS` table in `src/engine/parser.ts`: `look, take, use, open, close, talk, ask, tell, say,
give, show, push, pull, turnon, turnoff, reboot, unplug, plug, put, wear, remove, pry, drink, eat,
attack, break, shake, tap, wake, comfort, fix, type, read, search, knock, buy, fill, wait,
deploy, commit, test, review, catch, close_eyes, open_eyes, escape, go, enter, exit...`).
Examples: `'give coffee fahim'`, `'use|put badge reader'`, `'look/under keyboard'`,
`'ask oracle *'`, `'talk nicholas'`. Handlers run in order; returning `false` falls through.
Hotspot `id`s and their `nouns` are added to the vocabulary automatically. NPCs: the cast ids
(`fahim`, `denis`, ...) are global nouns; add extra local words like `guard`, `ghost` via `nouns`.
`c.num` holds a number typed ("breaker 3"), `c.rest` the text after the verb, `c.raw` the
original input.

Order of dispatch: room `raw` → global easter eggs → room `verbs` → hotspot `look` → room
`look` → carried items' verbs → global verbs → `content/defaults.ts` fallback.

### Game API (`g`) used in handlers

```ts
await g.say(text, { title?, icon? })     // message box; await until dismissed
await g.talk(actorOrId, text)              // titled with the speaker's name, mouth animates
await g.choose(text, ['Yes','No'])         // returns index
await g.wait(ms)
await g.approach('hotspotId' | actor | [x,y])   // walk Dominic there & face it (returns bool)
await g.walk(actor|null, x, y, { direct? })     // null = Dominic; NPCs usually direct
await g.pose(actor|null, 'reach', ms)      // temporary pose: reach, cheer, sit, type, talk
g.near(target, dist)                       // proximity check
g.flag(k) / g.set(k, v=true) / g.inc(k)
g.has(item) / g.addItem(item) / g.removeItem(item)
award(g, 'point_id')                       // from src/content/points.ts — never g.award directly
g.add(actor) / g.remove(actorOrId) / g.actor(id)
g.goto(roomId, [x, y, dir])
g.redraw()                                 // repaint picture & rebuild walk mask after flag changes
g.sfx(name)                                // points take door doorlocked beep error zap digitize thud splash spark crash clink roar coin vend brew type knock elevator alarm teleport bug fanfare death step
g.music(name | null)
g.flash(color, ms) / g.shake(ms)
g.light = { r: 60, rainbow: true } | null  // darkness except a circle around Dominic
g.dark = true                              // full blackout
g.palMap[i] = j                            // palette remap (reset on room change)
return g.die(text, { title })              // Sierra death dialog (Try Again / Restore / Restart / Quit)
g.player                                   // Dominic's Actor (x, y, dir, visible, pose)
g.t                                        // frame counter (60/s)
```

NPCs: `import { addNpc, npc, convo } from '../../content/helpers'` →
`const f = addNpc(g, 'fahim', 120, 140, 'up', 'sit')` in `enter()`. Poses: `null` (stand/walk),
`'sit'`, `'type'`, `'cheer'`, `'reach'`, `'sittalk'`. Set `actor.data.gap = 24` to control how
far Dominic stands from them when approaching. `convo(g, [['fahim','...'], ['me','...']])` plays
a dialogue. Talking NPCs automatically animate their mouths (standing poses).

Custom creatures: build an `Img` via `imgFromRows(rows, key)` or paint into a small `Surface`,
then `new Actor(id, name, { stand: { frames: [img] }, ... })`. For glitchy/animated creatures
use `actor.custom = (t) => img` to supply a frame per tick.

## Conventions

* Every interaction that needs Dominic to be somewhere should `await g.approach(...)` first.
* Award points with `award(g, 'id')` exactly where the design says; awards are idempotent.
* Give every hotspot a `look`. Respond to obvious attempts (TAKE, OPEN, USE, TALK) with
  specific, funny text. A great Sierra room answers almost anything sensible the player types.
* Deaths: `return g.die('Funny specific text.', { title: 'Short Title' })`.
* No dead ends: the game must always remain winnable.
* Keep text in a dry, warm, nerdy voice. Short paragraphs. No meanness toward the cast.
