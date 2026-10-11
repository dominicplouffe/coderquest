#!/usr/bin/env node
// Plays Coder's Quest from a brand-new game to the end credits in a headless browser,
// following scripts/walkthrough.txt, and checks that all 256 points are collected.
//
//   npm test
//
// Requires Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
import { createServer } from 'vite';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, server: { port: 0, open: false }, logLevel: 'error' });
await server.listen();
const addr = server.httpServer.address();
const url = `http://localhost:${addr.port}/?turbo=8`;
console.log(`Serving on ${url}`);
const steps = process.argv[2] ?? path.join(root, 'scripts', 'walkthrough.txt');
const out = path.join(root, 'shots');
const child = spawn(process.execPath, [path.join(root, 'scripts', 'play.mjs'), url, steps, out], { stdio: 'inherit' });
const code = await new Promise((r) => child.on('exit', r));
await server.close();
process.exit(code ?? 1);
