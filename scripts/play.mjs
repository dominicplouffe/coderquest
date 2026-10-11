#!/usr/bin/env node
// Drive Coder's Quest in a headless browser.
//
//   node scripts/play.mjs <url> <stepsFile> [outDir]
//
// Steps file: one step per line.
//   any text            -> typed as a game command; prints the messages it produced
//   #shot name          -> screenshot to <outDir>/name.png
//   #wait ms            -> wait
//   #goto room [x y]    -> teleport (testing only)
//   #click x y          -> left-click at picture coords (0-319, 0-189)
//   #key KeyName        -> press a key (e.g. ArrowLeft)
//   #exitto room        -> walk into the exit that leads to <room>; fails if the transition doesn't happen
//   #newgame            -> start a new game (plays the intro, auto-dismissing messages)
//   #eval js            -> evaluate JS in the page and print the result
//   #expect-flag name   -> fail if flag not truthy
//   #expect-score n     -> fail if score != n
//   #expect-item id     -> fail if item not carried
//   # anything else     -> comment
// Exit code 1 if any expectation fails or a death happens unexpectedly
// (prefix a command with ! to allow death: "!drink old coffee").
import fs from 'fs';
import path from 'path';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs'));
}

const [url, stepsFile, outDir = 'shots'] = process.argv.slice(2);
if (!url || !stepsFile) {
  console.error('usage: node scripts/play.mjs <url> <stepsFile> [outDir]');
  process.exit(2);
}
const lines = fs.readFileSync(stepsFile, 'utf8').split('\n');
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
let failed = false;
page.on('pageerror', (e) => {
  console.log('PAGE ERROR:', e.message);
  failed = true;
});
page.on('console', (m) => {
  if (m.type() === 'error') console.log('console.error:', m.text());
});
await page.goto(url);
await page.waitForFunction(() => window.game && (window.game.room || window.game.modals.length), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(300);
for (const raw of lines) {
  const line = raw.trim();
  if (!line) continue;
  if (line.startsWith('#')) {
    const [cmd, ...args] = line.slice(1).trim().split(/\s+/);
    if (cmd === 'shot') {
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(outDir, `${args[0]}.png`) });
      console.log(`  [shot ${args[0]}]`);
    } else if (cmd === 'wait') await page.waitForTimeout(Number(args[0]));
    else if (cmd === 'goto') await page.evaluate(([r, x, y]) => window.game.testGoto(r, x ? Number(x) : undefined, y ? Number(y) : undefined), args);
    else if (cmd === 'click') {
      await page.evaluate(([x, y]) => {
        const g = window.game;
        g['onClick'](Number(x), Number(y) + 10, 0);
      }, args);
      await page.evaluate(() => window.game.testCommand(''));
    } else if (cmd === 'exitto') {
      // walk Dominic into the exit leading to the given room and verify we arrive there
      const res = await page.evaluate(async (to) => {
        const g = window.game;
        const from = g.room.id;
        const ex = (g.room.exits || []).find((e) => e.to === to && (!e.when || e.when(g)));
        if (!ex) return `no open exit from ${from} to ${to}`;
        const a = ex.area;
        const pts = [];
        if (a.length === 4) {
          for (let y = a[1]; y < a[1] + a[3]; y += 1) for (let x = a[0]; x < a[0] + a[2]; x += 1) pts.push([x, y]);
        } else {
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          for (let i = 0; i < a.length; i += 2) { x0 = Math.min(x0, a[i]); x1 = Math.max(x1, a[i]); y0 = Math.min(y0, a[i + 1]); y1 = Math.max(y1, a[i + 1]); }
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pts.push([x, y]);
        }
        const inside = (x, y) => {
          if (a.length === 4) return x >= a[0] && x < a[0] + a[2] && y >= a[1] && y < a[1] + a[3];
          let c = false; const n = a.length / 2;
          for (let i = 0, j = n - 1; i < n; j = i++) { const xi = a[i*2], yi = a[i*2+1], xj = a[j*2], yj = a[j*2+1]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; }
          return c;
        };
        const ok = pts.filter(([x, y]) => g.walkmap.ok(x, y) && inside(x, y));
        if (!ok.length) return `exit ${from}->${to} has no walkable point inside its area`;
        // nearest to the player
        ok.sort((p, q) => Math.hypot(p[0] - g.player.x, p[1] - g.player.y) - Math.hypot(q[0] - g.player.x, q[1] - g.player.y));
        const [tx, ty] = ok[0];
        const path = g.walkmap.findPath(g.player.x, g.player.y, tx, ty);
        if (!path) return `no path to exit ${from}->${to}`;
        g.player.setPath(path);
        const t0 = performance.now();
        while (performance.now() - t0 < 30000) {
          await new Promise((r) => setTimeout(r, 30));
          const top = g.modals[g.modals.length - 1];
          if (top && top.done) { top.age = 99; top.done(0); }
          if (g.room.id !== from) return null;
        }
        return `walked to exit ${from}->${to} but never left (player at ${Math.round(g.player.x)},${Math.round(g.player.y)})`;
      }, args[0]);
      if (res) {
        console.log('  EXIT FAILED:', res);
        failed = true;
        await page.evaluate((to) => window.game.testGoto(to), args[0]);
      } else {
        const out = await page.evaluate(() => window.game.testCommand(''));
        console.log(`  -> ${args[0]}`);
        for (const m of out) console.log('   ' + m.replace(/\n+/g, ' / '));
      }
    } else if (cmd === 'newgame') {
      await page.evaluate(() => { const g = window.game; g.modals = []; g.newGame(); });
      const out = await page.evaluate(() => window.game.testCommand(''));
      for (const m of out) console.log('   ' + m.replace(/\n+/g, ' / '));
    } else if (cmd === 'key') {
      await page.keyboard.press(args[0]);
      await page.waitForTimeout(100);
    } else if (cmd === 'eval') {
      const r = await page.evaluate(args.join(' '));
      console.log('  eval:', JSON.stringify(r));
    } else if (cmd === 'expect-flag') {
      const v = await page.evaluate((k) => window.game.state.flags[k], args[0]);
      if (!v) {
        console.log(`  EXPECTATION FAILED: flag ${args[0]} is ${v}`);
        failed = true;
      }
    } else if (cmd === 'expect-score') {
      const v = await page.evaluate(() => window.game.state.score);
      if (v !== Number(args[0])) {
        console.log(`  EXPECTATION FAILED: score is ${v}, expected ${args[0]}`);
        failed = true;
      }
    } else if (cmd === 'expect-item') {
      const v = await page.evaluate((k) => window.game.has(k), args[0]);
      if (!v) {
        console.log(`  EXPECTATION FAILED: not carrying ${args[0]}`);
        failed = true;
      }
    }
    continue;
  }
  const allowDeath = line.startsWith('!');
  const command = allowDeath ? line.slice(1) : line;
  const out = await page.evaluate((c) => window.game.testCommand(c), command);
  const st = await page.evaluate(() => ({ room: window.game.room?.id, score: window.game.state.score, dying: window.game.dying }));
  console.log(`> ${command}   [${st.room} | score ${st.score}]`);
  for (const m of out) console.log('   ' + m.replace(/\n+/g, ' / '));
  if (st.dying) {
    if (!allowDeath) {
      console.log('  UNEXPECTED DEATH');
      failed = true;
    }
    // recover: try again from checkpoint
    await page.evaluate(() => {
      const g = window.game;
      g.modals = [];
      g.dying = false;
      if (g.checkpoint) g.load(g.checkpoint, true);
    });
    await page.waitForTimeout(200);
  }
}
const final = await page.evaluate(() => ({ room: window.game.room?.id, score: window.game.state.score, inv: window.game.state.inv }));
console.log(`FINAL: room=${final.room} score=${final.score} inv=${final.inv.join(',')}`);
await browser.close();
process.exit(failed ? 1 : 0);
