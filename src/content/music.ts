// The Coder's Quest soundtrack: an original score for three voices plus a
// noise channel, in the spirit of the 1987 Sierra soundtracks.
//
// Melodies are written by hand in MML (see src/engine/audio.ts). "|" marks bar
// lines; the player ignores them, but they keep the phrasing readable and let
// tools check that every bar adds up. Bass lines and arpeggios are generated
// from chord progressions by `comp()`, which writes plain MML with absolute
// octaves. `tr()` transposes a melody, so the title hook can come back in
// other keys (the Act II "cyber" theme, the ending and the credits).
//
// Voices: @0 square, @1 pulse 25%, @2 pulse 12%, @3 triangle (bass), @5 drums
// (k kick, s snare, h hat, c crash). Every track of a song has the same length,
// so loops stay in sync.
import type { Song } from '../engine/audio';

// ================================================================== helpers
const NN = ['c', 'c+', 'd', 'd+', 'e', 'f', 'f+', 'g', 'g+', 'a', 'a+', 'b'];
const CN = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const LETTER: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const QUAL: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '5': [0, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  add9: [0, 4, 7, 14],
  m7b5: [0, 3, 6, 10],
};

/** MIDI note number -> absolute MML note ("o4c+"). */
const abs = (m: number) => `o${Math.floor(m / 12) - 1}${NN[((m % 12) + 12) % 12]}`;
/** Place a pitch class inside the octave window [lo, lo+12). */
const place = (pc: number, lo: number) => lo + ((((pc - lo) % 12) + 12) % 12);
const accOf = (s?: string) => (s === '#' ? 1 : s === 'b' ? -1 : 0);

interface Chord {
  root: number;
  bass: number;
  ivs: number[];
}

function chord(sym: string): Chord {
  const m = /^([A-G])([#b]?)([a-z0-9]*)(?:\/([A-G])([#b]?))?$/.exec(sym);
  if (!m || !(m[3] in QUAL)) throw new Error(`music: bad chord "${sym}"`);
  const root = (LETTER[m[1].toLowerCase()] + accOf(m[2]) + 12) % 12;
  const bass = m[4] ? (LETTER[m[4].toLowerCase()] + accOf(m[5]) + 12) % 12 : root;
  return { root, bass, ivs: QUAL[m[3]] };
}

function beatsOf(len: string): number {
  const m = /^(\d+)(\.*)$/.exec(len);
  if (!m) throw new Error(`music: bad length "${len}"`);
  let b = 4 / Number(m[1]);
  let add = b / 2;
  for (let i = 0; i < m[2].length; i++) {
    b += add;
    add /= 2;
  }
  return b;
}

function tone(t: string, c: Chord, next: Chord, lo: number): number | null {
  const r = place(c.root, lo);
  const fifth = c.ivs.find((i) => i >= 6 && i <= 8) ?? 7;
  switch (t) {
    case 'X':
      return null;
    case 'R':
      return place(c.bass, lo);
    case 'O':
      return place(c.bass, lo) + 12;
    case 'F':
      return r + fifth;
    case 'f':
      return r + fifth - 12;
    case 'T':
      return r + c.ivs[1];
    case 'S':
      return r + (c.ivs[3] ?? 12);
    case 'A':
      return place(next.bass, lo) - 1;
  }
  const k = Number(t);
  if (!Number.isInteger(k)) throw new Error(`music: bad tone "${t}"`);
  const tones = [...new Set(c.ivs.map((i) => place((c.root + i) % 12, lo)))].sort((a, b) => a - b);
  return tones[k % tones.length] + 12 * Math.floor(k / tones.length);
}

/**
 * Accompaniment from a chord chart.
 *  chords:  one token per bar ("C", "Am7", "E/G#"); comma-joined chords share a bar
 *           ("C,G"); "|" tokens are copied through as bar lines.
 *  pattern: one bar of steps "<tone>:<len>" (len defaults to `len`); ";" separates
 *           alternative bar patterns used in rotation.
 *  tones:   R root (or slash bass), O octave, F fifth, f fifth below, T third,
 *           S seventh, A chromatic approach to the next chord, X rest;
 *           digits = chord tones voiced upward from `lo` (a MIDI note number).
 */
function comp(chords: string, pattern: string, lo: number, len = '8'): string {
  const toks = chords.trim().split(/\s+/);
  const bars = toks.filter((b) => b !== '|').map((b) => b.split(',').map(chord));
  const pats = pattern.split(';').map((p) =>
    p
      .trim()
      .split(/\s+/)
      .map((s) => {
        const [t, l] = s.split(':');
        return { t, l: l ?? len };
      }),
  );
  const out: string[] = [];
  let bi = 0;
  for (const tok of toks) {
    if (tok === '|') {
      out.push('|');
      continue;
    }
    const cs = bars[bi];
    const nextBar = bars[(bi + 1) % bars.length][0];
    const pat = pats[bi % pats.length];
    const total = pat.reduce((s, st) => s + (st.t === '|' ? 0 : beatsOf(st.l)), 0);
    let pos = 0;
    for (const st of pat) {
      if (st.t === '|') {
        out.push('|');
        continue;
      }
      const ci = Math.min(cs.length - 1, Math.floor((pos + 1e-6) / (total / cs.length)));
      const m = tone(st.t, cs[ci], ci + 1 < cs.length ? cs[ci + 1] : nextBar, lo);
      out.push(m === null ? `r${st.l}` : abs(m) + st.l);
      pos += beatsOf(st.l);
    }
    bi++;
  }
  return out.join(' ');
}

function expand(src: string): string {
  let s = src;
  for (let guard = 0; guard < 50 && s.includes('['); guard++) s = s.replace(/\[([^[\]]*)\](\d*)/g, (_, body, n) => body.repeat(n ? parseInt(n, 10) : 2));
  return s;
}

/** Transpose a melody by `semis` semitones (rewrites every note with an absolute octave). */
function tr(src: string, semis: number): string {
  const s = expand(src.toLowerCase());
  let out = '';
  let oct = 4;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === 'o' && /\d/.test(s[i + 1] ?? '')) {
      let j = i + 1;
      while (/\d/.test(s[j] ?? '')) j++;
      oct = parseInt(s.slice(i + 1, j), 10);
      i = j;
    } else if (ch === '<' || ch === '>') {
      oct += ch === '>' ? 1 : -1;
      i++;
    } else if (ch in LETTER) {
      let semi = LETTER[ch];
      i++;
      while (s[i] === '+' || s[i] === '#' || s[i] === '-') semi += s[i++] === '-' ? -1 : 1;
      out += ' ' + abs(12 * (oct + 1) + semi + semis);
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/** Transpose a chord chart. */
const trCh = (chords: string, semis: number) => chords.replace(/([A-G])([#b]?)/g, (_, l: string, a: string) => CN[(LETTER[l.toLowerCase()] + accOf(a) + semis + 120) % 12]);

const join = (...parts: string[]) => parts.join(' ');
const rep = (s: string, n: number) => Array(n).fill(s).join(' ');

// ================================================================== TITLE
// "Coder's Quest" main theme, C major with a heroic flat-seven. The hook
// (sol-do, do-re-mi-sol in a dotted rhythm) comes back all over the game.
const TI = 'o5 c4 r8 c8 c8 c8 g4 | f4. e8 d4 <b-4 | >c4 r8 c8 c8 c8 a4 | g2. r4 |';
const TI_H = 'o4 e4 r8 e8 e8 e8 >e4 | d4. c8 <b-4 f4 | a4 r8 a8 a8 a8 >f4 | d2. r4 |';
const TI_B = 'o3 c4 r8 c8 c8 c8 <g4 | b-4 r8 b-8 b-8 b-8 f4 | f4 r8 f8 f8 f8 >c4 | <g4 r8 g8 a4 b4 |';
const TI_D = 'c4 r8 s8 s8 s8 k4 | k4. k8 s4 s4 | c4 r8 s8 s8 s8 k4 | k4 s16 s16 s16 s16 s8 s8 s16 s16 s16 s16 |';

const TA = 'o4 g8 >c8 c8. d16 e4 g4 | f8 e8 d8 f8 b-4 f4 | a8 g8 f8 a8 >c4 <a4 | g4. f8 e4 d4 | e8 >c8 c8. <b16 a4 e4 | f8 a8 a8. g16 f4 c4 | d8 e8 f8 g8 a8 g8 f8 d8 | e4 c2 r4 |';
const TA_CH = 'C | Bb | F | C,G | Am | F | G7 | C |';
const TB = 'o5 r8 c8 f8 g8 a4 a4 | r8 d8 g8 a8 b4 b4 | >c4 <b8 g8 e4. g8 | a2. r4 | r8 d8 f8 a8 >d4 c4 | <b-4 a8 g8 f4 d4 | g4. a8 b4 >d4 | c8 <b8 a8 g8 f8 e8 d8 <b8 |';
const TB_CH = 'F | G | C | Am | Dm | Bb | G | G7 |';

const ROCK = 'k8 h8 s8 h8 k8 k8 s8 h8 |';
const FILL = 'k8 h8 s8 h8 s16 s16 s16 s16 s8 s8 |';
const HALF = 'k8 h8 h8 h8 s8 h8 h8 h8 |';

const title: Song = {
  tracks: [
    join('t138 @1 v12 l8', TI, TA, TB, '@0 v11', TA),
    join('@2 v8 l8', TI_H, comp(TA_CH, '0 1 2 1 3 1 2 1', 55), comp(TB_CH, '2:2 1:4 0:4', 60), comp(TA_CH, rep('0 1 2 3', 4), 60, '16')),
    join('@3 v11 l8', TI_B, comp(TA_CH, 'R R O R F R O R', 41), comp(TB_CH, 'R:4. F:8 O:4 F:4', 41), comp(TA_CH, 'R R O R F R O R', 41)),
    join('@5 v7 l8', TI_D, 'c8 h8 s8 h8 k8 k8 s8 h8 |', rep(ROCK, 6), FILL, 'c8 h8 h8 h8 s8 h8 h8 h8 |', rep(HALF, 6), FILL, 'c8 h8 s8 h8 k8 k8 s8 h8 |', rep(ROCK, 6), FILL),
  ],
};

// ================================================================== OFFICE
// Light, swinging elevator jazz in F. Swing 8ths are written as 6+12
// (two-thirds + one-third of a beat). Quiet, so it never wears out its welcome.
const OA = 'o5 r6 c12 f6 a12 >c4 <a4 | g6 f12 d4 r2 | r6 d12 g6 b-12 >d4 <b-4 | a6 g12 e4 r2 | r6 e12 a6 >c12 e4 c4 | <b6 a12 f+4 r2 | g6 a12 b-6 >c12 d6 c12 <b-6 g12 | a2 r2 |';
const OB = 'o5 f6 d12 f6 a12 >c4 <a4 | g6 f12 d-4 r2 | e6 c12 e6 g12 b4 g4 | f+6 e12 c4 r2 | d6 c12 d6 f12 b-4 g4 | g6 f12 e6 d12 c4 r4 | a6 g12 f6 a12 >c6 <a12 f4 | e6 f12 g6 a12 b-4 r4 |';
const OA_CH = 'Fmaj7 | Dm7 | Gm7 | C7 | Am7 | D7 | Gm7,C7 | F6 |';
const OB_CH = 'Bbmaj7 | Bbm6 | Am7 | D7 | Gm7 | C7 | F6 | C7 |';
const O_WALK = 'o2 f4 a4 >c4 c+4 | d4 c4 <a4 a-4 | g4 b-4 >d4 d-4 < | >c4 <b-4 g4 e4 | a4 >c4 e4 d+4 | d4 c4 <a4 f+4 | g4 b-4 >c4 <e4 |';
const O_WALK_B = 'b-4 >d4 f4 d4 | d-4 <b-4 g4 b4 | a4 >c4 e4 e-4 | d4 f+4 a4 a-4 | g4 f4 d4 e4 | c4 <b-4 g4 e4 | f4 a4 >c4 d4 | c4 <b-4 g4 e4 |';
const O_COMP = '0:4 2:6 1:12 3:4 2:6 1:12';

const office: Song = {
  gain: 0.6,
  tracks: [
    join('t112 @1 v9 q6 l8', OA, OB, OA),
    join('@2 v6 q7', comp(OA_CH, O_COMP, 53), comp(OB_CH, O_COMP, 53), comp(OA_CH, O_COMP, 53)),
    join('@3 v10 q6', O_WALK, 'f4 a4 >c4 <a4 |', O_WALK_B, O_WALK, 'f4 a4 >c4 <e4 |'),
    join('@5 v4', rep('k4 h6 h12 h4 h6 h12 | h4 h6 h12 h4 s6 h12 |', 12)),
  ],
};

// ================================================================== NOC
// Network Operations Center: E minor, a semitone siren, a 16th-note pulse.
const NA = 'o4 e4. f+8 g4 a4 | b2. r4 | >c4. <b8 a4 g4 | f+2. r4 | e4. f+8 g4 b4 | >e2. r4 | f4. e8 d4 c4 | <b4 >d+4 f+4 a4 |';
const NB = 'o5 e4 r8 e8 g4 e4 | b4. a8 g4 f+4 | g4 r8 g8 e4 c4 | d4. e8 f+4 a4 | a4 r8 a8 >c4 <a4 | g4. f+8 e4 g4 | f+2 d+2 | <b2. r4 |';
const NC = 'o4 a1 | >c2 <b2 | a1 | f1 | g1 | e2 g2 | f+1 | d+2 f+2 |';
const N_CH = 'Em | Em | C | D | Em | Em | F | B7 | Em | Em | C | D | Am | C | B | B | Am | Am | F | F | C | C | B | B |';
const NA_SIREN = 'o5 [b8 >c8 <]4 | [b8 >c8 <]4 | [g8 a-8]4 | [a8 b-8]4 | [b8 >c8 <]4 | [b8 >c8 <]4 | [a8 b-8]4 | [a+8 b8]4 |';
const NC_SIREN = 'o4 [e8 f8]4 | [e8 f8]4 | [c8 d-8]4 | [c8 d-8]4 | [g8 a-8]4 | [g8 a-8]4 | [f+8 g8]4 | [d+8 e8]4 |';

const noc: Song = {
  gain: 0.9,
  tracks: [
    join('t144 @0 v10 l8', NA, NB, NC),
    join('@2 v6 l8', NA_SIREN, comp('Em | Em | C | D | Am | C | B | B |', rep('0 1 2 1', 4), 59, '16'), NC_SIREN),
    join('@3 v11', comp(N_CH, 'R R O R R R O R R R O R R O R O', 40, '16')),
    join('@5 v7 l8', 'c8 h8 s8 h8 k8 k8 s8 h8 |', rep(ROCK, 6), FILL, rep(ROCK, 7), FILL, rep('k4 h8 h8 h4 h8 h8 |', 7), 's16 s16 s16 s16 s16 s16 s16 s16 s8 s8 s8 s8 |'),
  ],
};

// ================================================================== BASEMENT
// Dark and slow: a chromatic lament in the bass, a lonely pulse melody,
// drips from the pipes and a far-away heartbeat.
const basement: Song = {
  tracks: [
    join(
      't72 @1 v8 l8',
      'o4 r2 d4 f4 | e2. r4 | r2 e4 g4 | f2. r4 | r4 f8 e8 d4 c+4 | e1 | r2 f4 g4 | a2 g+2 |',
      'o5 d2 r8 c+8 d8 f8 | e2. r4 | r4 g8 f8 e4 c4 | d2. r4 | c+2 d2 | <b-2 g2 | a1 | r1 |',
    ),
    join(
      '@2 v5 q2',
      'r2. o6 a16 r16 r8 | r1 | r4 o6 e16 r8. r2 | r1 | r2 o6 c+16 r16 o5 a16 r16 r4 | r1 | r1 | r4 o6 d16 r8. r2 |',
      'r1 | r2. o6 f16 r16 r8 | r1 | r4 o5 b16 r8. r2 | r1 | r2 o6 c+16 r16 r8 r4 | r1 | r1 |',
    ),
    '@3 v11 o3 d1 | c+1 | c1 | <b1 | b-1 | a1 | b-1 | a1 | >d1 | c+1 | c1 | <b1 | b-1 | g1 | a1 | a1 |',
    join('@5 v5', rep('k8 r16 k16 r4 r2 |', 16)),
  ],
};

// ================================================================== SERVER ROOM
// The Monolith thinks: two arpeggios in different cycles (3 against 4, and a
// 5-note figure over 8ths) phase against a tape-drive bass.
const SR_CH = 'Am | Am | F | F | C | C | G | G | Am | Am | F | F | Dm | Dm | E | E |';
const serverroom: Song = {
  gain: 0.85,
  tracks: [
    join('t120 @2 v7', comp(SR_CH, '0 1 2 0 1 2 0 1 2 0 1 2 0 1 2 3', 57, '16')),
    join('@1 v5', comp('Am F C G Am F Dm E', '0 1 2 3 4 0 1 2 | 3 4 0 1 2 3 4 0 |', 64)),
    join('@3 v10', comp(SR_CH, 'R:4. R:8 O:4. R:8', 40)),
    join('@5 v4', rep('k8 h16 h16 h8 h16 h16 k8 h16 h16 h8 h16 h16 |', 16)),
  ],
};

// ================================================================== CYBER
// Act II, inside the Monolith: D Lydian shimmer (that raised fourth is the
// "wonder"), and in the middle the title hook, transposed into the machine.
const CYA = 'o5 f+2. a4 | g+2. e4 | f+4. e8 d4 a4 | b2. r4 | d4. c+8 <b4 >d4 | e4. d8 <b4 g4 | a2. >c+4 | e2. r4 |';
const CYB = 'o4 a8 >d8 d8. e16 f+4 a4 | g8 f+8 e8 g8 >c4 <g4 | b8 a8 g8 b8 >d4 <b4 | a4. g8 f+4 e4 | f+8 >d8 d8. c+16 <b4 f+4 | g8 b8 b8. a16 g4 d4 | e8 f+8 g+8 a8 b8 >c+8 d8 <b8 | >c+2. r4 |';
const CYA2 = 'o5 f+2. a4 | g+2. e4 | f+4. e8 d4 a4 | b2. r4 | b4. a8 g4 d4 | e4. f+8 g4 b4 | a2 d4 e4 | c+2. r4 |';
const CY_CH = 'D | E/D | D | E/D | Bm | G | A | A | D | C | G | D | Bm | G | E/G# | A | D | E/D | D | E/D | G | Em | Asus4 | A |';
const cyber: Song = {
  gain: 0.9,
  tracks: [
    join('t108 @1 v10 l8', CYA, CYB, CYA2),
    join('@2 v7', comp(CY_CH, '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1', 62, '16')),
    join('@3 v10', comp(CY_CH, 'R:4. R:8 O:4 R:4', 38)),
    join('@5 v5', 'c8 h16 h16 h8 h8 s8 h8 h8 h8 |', rep('k8 h16 h16 h8 h8 s8 h8 h8 h8 |', 23)),
  ],
};

// ================================================================== FOREST
// The Spaghetti Forest: an oom-pah-pah waltz in G that keeps tripping over
// its own chromatic noodles.
const FA =
  'o5 d4 c+8 d8 <b4 | g2 r4 | >c4 <b8 >c8 <a4 | f+2 r4 | a4 g+8 a8 >c4 | <b4 a4 f+4 | g4 b4 >d4 | g2 r4 | ' +
  'f+4 f8 e8 e-8 d8 | d4 <b4 g4 | e4 g4 >c4 | e-2 r4 | d4 <b8 a8 g4 | g+4 b4 >e4 | c+4 <a8 b8 >c+8 e8 | d4 r4 <a4 |';
const FB =
  'o4 e4 g4 b4 | a+4 >c+8 d+8 f+4 | g4 f+8 e8 d+8 e8 | b2 r4 | <g4 b4 >e4 | c4 <a8 b8 >c4 | <b4 a+8 b8 f+4 | e2 r4 | ' +
  'o5 e4 g8 f+8 e8 c8 | d4 <b4 g4 | a4 >c8 <b8 a8 f+8 | a2 r4 | g4 b4 >d4 | e-4 g8 f8 e-8 d8 | c4 <a4 f+4 | g2 r4 |';
const F_CH = 'G | G | Am | D7 | D7 | D7 | G | G | D7 | G7 | C | Cm | G | E7 | A7 | D7 | Em | B7 | Em | B7 | Em | Am | B7 | Em | C | G | Am | D7 | G | Eb | D7 | G |';
const forest: Song = {
  gain: 0.85,
  tracks: [
    join('t160 @0 v10 q6 l8', FA, FB),
    join('@2 v6 q3', comp(F_CH, 'X:4 1:4 2:4', 55)),
    join('@3 v11 q5', comp(F_CH, 'R:4 X:2 ; f:4 X:2', 43)),
    join('@5 v4', rep('k4 h4 h4 | k4 h4 s4 |', 16)),
  ],
};

// ================================================================== STACK
// The Oracle of the Stack: D minor leaning on the Phrygian E-flat, an
// ocarina-like triangle melody over slow rising arpeggios.
const ST_CH = 'Dm | Eb | Dm | Eb | Bb | C | Dm | A | Gm | Eb | Dm | Bb | Gm | A | Dm | Dm |';
const stack: Song = {
  tracks: [
    join('t76 @3 v8 l8', 'o5 a2. g8 f8 | g2 e-2 | f4. e8 d2 | b-2. a8 g8 | f2 d2 | e2 g2 | a1 | c+2 e2 |', 'd2. c8 <b-8 | >e-2 g2 | f4. e8 d4 a4 | f2. r4 | g2 b-2 | a2 e4 c+4 | d1 | r1 |'),
    join('@2 v6', comp(ST_CH, '0 1 2 3 4 3 2 1', 62)),
    join('@3 v9', comp(ST_CH, 'R:1', 38)),
  ],
};

// ================================================================== LOOP
// while (true) { ... }: a dominant pedal that never comes home. The tune climbs
// to the leading tone every time, and every time it starts over.
const L_MEL = 'o5 c8 d8 e8 f8 g8 f8 e8 d8 | c8 d8 e8 f8 g4 f4 | e8 f8 g8 a8 b8 a8 g8 f8 | e8 f8 g8 a8 b4 r4 |';
const L_CH = rep('Dm7/G | G7 | Fmaj7/G | G7 |', 4);
const loop: Song = {
  gain: 0.85,
  tracks: [
    join('t132 @1 v10 l8', 'r1 | r1 | r1 | r1 |', L_MEL, L_MEL, L_MEL),
    join('@2 v6', comp(L_CH, rep('0 1 2 3', 4), 60, '16')),
    join('@3 v11', comp(L_CH, 'R R O R R R O R', 40)),
    join('@5 v6 l8', rep(join('c8 h8 s8 h8 k8 h8 s8 h8 |', rep('k8 h8 s8 h8 k8 h8 s8 h8 |', 3)), 4)),
  ],
};

// ================================================================== DEADLOCK
// Thread A and Thread B: each grabs a note (a lock) and holds it, waiting for
// the other to let go. They clash, fall silent, try again, collide, and wait.
const deadlock: Song = {
  gain: 0.9,
  tracks: [
    join(
      't96 @1 v10 l8',
      'o4 c8 e-8 g8 >c8 <g2 | g1 | g2 r2 | r1 |',
      'r1 | r2 b2 | b2 r2 | r1 |',
      'o4 g8 a-8 g8 a-8 g8 a-8 g4 | g2. r4 | r1 | r2 g4 r4 |',
      'o5 c8 r8 c8 r8 c8 r8 c4 | c2 r2 | d-1 | r1 |',
    ),
    join(
      '@0 v8 l8',
      'r1 | o4 r2 a-2 | a-2 r2 | r1 |',
      'o4 f8 a-8 >c8 f8 c2 | c1 | c2 r2 | r1 |',
      'o4 a-8 g8 a-8 g8 a-8 g8 a-4 | a-2. r4 | r1 | r2 r4 a-4 |',
      'o4 r8 b8 r8 b8 r8 b8 r4 | r2 b2 | >c1 | r1 |',
    ),
    join('@3 v11 q2', comp('Cm | Cm | Fm | G | Cm | Cm | Ab | G | Cm | Cm | Db | G | Cm | Cm | Db | G |', 'R:4 R:4 R:4 R:4', 36)),
    join('@5 v5', rep('k4 h4 h4 h4 | h4 h4 h4 h4 |', 8)),
  ],
};

// ================================================================== VOID
// The Null Void: a slow B-flat minor line and its own echo, a beat behind.
const VM = 'o5 f2 r4 d-4 | c2. r4 | r4 b-4 a-4 g-4 | f2. r4 | e-2 r4 g-4 | f2. r4 | e2 c2 | r1 | b-2 r4 >d-4 | c2. <b-4 | a2 r4 >c4 | <f2';
const voidSong: Song = {
  tracks: [
    join('t66 @1 v9 l8', VM, 'r2 |'),
    join('@2 v4 l8 r8', VM.replace(/\|/g, ''), 'r4.'),
    '@3 v10 o2 b-1 | b-1 | g-1 | g-1 | e-1 | e-1 | f1 | f1 | b-1 | g-1 | f1 | f1 |',
  ],
};

// ================================================================== DRAGON
// The Legacy Dragon: modal and medieval. Open fifths in the bass, then the
// tune doubled in parallel fifths, like a choir of very old monks.
const DM1 = 'o4 d4. d8 a4 a4 | b-4. a8 g4 a4 | g4. g8 e4 c4 | e2 d4 c4 | d4. d8 a4 >d4 | c4 <b-4 f4 d4 | g4. a8 g4 e4 | a2. r4 |';
const DM2 = 'o5 d2 c4 <a4 | b2 a4 g4 | a4. g8 f4 e4 | g2. r4 | d4 f4 a4 >d4 | c4 <b-4 a4 g4 | a4. g8 e4 c+4 | e2 <a2 |';
const DR_CH1 = 'Dm | Dm | C | C | Dm | Bb | C | A |';
const DR_CH2 = 'Dm | G | Dm | C | Dm | Bb | A | A |';
const DR_DRUMS = 'k4 k8 k8 s4 k4 |';
const dragon: Song = {
  gain: 0.95,
  tracks: [
    join('t92 @0 v11 l8', DM1, DM2),
    join('@2 v8 l8', comp('D5 | D5 | C5 | C5 | D5 | Bb5 | C5 | A5 |', '0:2 1:2', 50), tr(DM2, -7)),
    join('@3 v12', comp(join(DR_CH1, DR_CH2), 'R R R:4 F:4 R:4', 38)),
    join('@5 v8 l8', 'c4 k8 k8 s4 k4 |', rep(DR_DRUMS, 6), 'k4 s8 s8 s8 s8 c4 |', 'c4 k8 k8 s4 k4 |', rep(DR_DRUMS, 6), 'k4 s8 s8 s8 s8 c4 |'),
  ],
};

// ================================================================== CORE
// Boss fight with the Heisenbug: E minor/Phrygian chug, double-time pulse.
const RIFF_E = 'e8 e16 e16 b8 e16 e16 >d8 <e16 e16 b8 g8 |';
const RIFF_F = 'f8 f16 f16 >c8 <f16 f16 >e-8 <f16 f16 >c8 <a8 |';
const CR1 = join('o5', RIFF_E, 'a8 g8 f+8 g8 e4 r4 |', RIFF_F, 'b8 a8 g8 f+8 e4 r4 |', RIFF_E, 'a8 b8 >c8 d8 e4 d4 | c8 <b8 a8 g8 e4 g4 | f+4 d+4 <b4 >d+4 |');
const CR2 = 'o5 e2 a4. g8 | e2. r4 | f4. g8 a4 >c4 | <a2. r4 | g4. a8 b4 >d4 | <b2 g4 b4 | >d+4. c+8 <b4 a4 | f+2 d+2 |';
const CR3 = join('o5', RIFF_E, RIFF_F, RIFF_E, RIFF_F, 'g8 e8 g8 >c8 <g8 e8 g8 >c8 | <a8 f+8 a8 >d8 <a8 f+8 a8 >d8 | d+4 <b4 f+4 b4 | >d+4 f+4 d+4 r4 |');
const CR_CH = 'Em | Em | F | Em | Em | Em | C | B | Am | Am | F | F | G | G | B | B | Em | F | Em | F | C | D | B | B |';
const CR_DR = 'k8 h8 s8 k8 k8 h8 s8 h8 |';
const CR_FILL = 's16 s16 s16 s16 s16 s16 s16 s16 s8 s8 c4 |';
const core: Song = {
  gain: 0.9,
  tracks: [
    join('t172 @0 v11 l8', CR1, CR2, CR3),
    join('@2 v7', comp(CR_CH, rep('0 1 2 1', 4), 59, '16')),
    join('@3 v12', comp(CR_CH, rep('R R O R', 4), 40, '16')),
    join('@5 v8 l8', 'c8 h8 s8 k8 k8 h8 s8 h8 |', rep(CR_DR, 6), CR_FILL, 'c8 h8 s8 h8 k8 h8 s8 h8 |', rep('k8 h8 s8 h8 k8 h8 s8 h8 |', 6), CR_FILL, 'c8 h8 s8 k8 k8 h8 s8 h8 |', rep(CR_DR, 6), CR_FILL),
  ],
};

// ================================================================== DEPLOY
// Act III: 11:58 PM, Friday. A clock ticks, a heartbeat, and a line that
// climbs toward midnight. The ticking doubles for the last eight bars.
const TICK = 'o6 c16 r8. o5 g16 r8. o6 c16 r8. o5 g16 r8. |';
const TICK2 = 'o6 c16 r16 o5 g16 r16 o6 c16 r16 o5 g16 r16 o6 c16 r16 o5 g16 r16 o6 c16 r16 o5 g16 r16 |';
const DP1 = 'Fm | Fm | Db | Db | Fm | Fm | C | C |';
const DP2 = 'Fm | Eb | Db | C | Fm | Eb | Db | C |';
const DP3 = 'Db | Ddim | Eb | Edim | Fm | Gb | Gdim | C |';
const deploy: Song = {
  gain: 0.9,
  tracks: [
    join(
      't104 @1 v9 l8',
      'r1 | r1 | r1 | r1 | o4 c4. d-8 c2 | r1 | c4. d-8 c4 <b4 | >c1 |',
      'o4 f4. g8 a-4 >c4 | <g2 e-2 | f4. e-8 d-4 c4 | e2 c2 | f4. g8 a-4 >c4 | e-2 <b-2 | a-4. g8 f4 d-4 | e2 g2 |',
      'o4 a-4 >d-4 f4 a-4 | <a-4 >d4 f4 a-4 | <b-4 >e-4 g4 b-4 | <b-4 >e4 g4 b-4 | >c2 <a-4 f4 | >d-2 <b-4 g-4 | >d-2 <b-4 g4 | >c1 |',
    ),
    join('@2 v6 q1', rep(TICK, 16), rep(TICK2, 8)),
    join('@3 v11', comp(DP1, 'R R X:4 X:2', 41), comp(DP2, 'R R X:4 R R X:4', 41), comp(DP3, 'R R R R R R R R', 41)),
    join('@5 v4 l8', rep('h4 h4 h4 h4 |', 8), 'v5', rep('k4 h4 h4 h4 |', 8), 'v6', rep('k8 h8 k8 h8 k8 h8 k8 h8 |', 6), 'v7 s16 s16 s16 s16 s16 s16 s16 s16 s16 s16 s16 s16 s16 s16 s16 s16 |', 'v8 s8 s8 s8 s8 s16 s16 s16 s16 c4 |'),
  ],
};

// ================================================================== ENDING
// The title theme returns a whole step higher, in D: the fanfare, the hook as
// a march, the lyrical middle, and the hook again with everything playing.
const MARCH = 'k4 s8 s8 k4 s4 |';
const ending: Song = {
  tracks: [
    join('t116 @1 v12 l8', tr(TI, 2), tr(TA, 2), tr(TB, 2), '@0 v12', tr(TA, 2)),
    join('@2 v8 l8', tr(TI_H, 2), comp(trCh(TA_CH, 2), '0:4 1:4 2:4 1:4', 57), comp(trCh(TB_CH, 2), '2:2 1:4 0:4', 62), comp(trCh(TA_CH, 2), rep('0 1 2 3', 4), 62, '16')),
    join('@3 v11 l8', tr(TI_B, 2), comp(trCh(TA_CH, 2), 'R:4 O:4 R:4 O:4', 38), comp(trCh(TB_CH, 2), 'R:4. F:8 O:4 F:4', 38), comp(trCh(TA_CH, 2), 'R R O R F R O R', 38)),
    join('@5 v7 l8', TI_D, 'c4 s8 s8 k4 s4 |', rep(MARCH, 6), 'k4 s16 s16 s16 s16 s8 s8 c4 |', 'c8 h8 h8 h8 s8 h8 h8 h8 |', rep(HALF, 6), FILL, 'c8 h8 s8 h8 k8 k8 s8 h8 |', rep(ROCK, 6), 'k8 h8 s8 h8 s16 s16 s16 s16 c4 |'),
  ],
};

// ================================================================== CREDITS
// A warm new tune in G, the title hook in G, a bridge, and the tune again,
// this time ending on the tonic.
const CW = 'o5 d4 g4 b4. a8 | a4 f+4 d2 | e4 g4 b4. >c8 | c4 <b4 a4 g4 | d4 g4 b4. >d8 | c4 <a4 e4 c4 | d4 f+4 a4 >c4 |';
const CW_CH = 'G | D/F# | Em | C | G | Am7 | D7 | G |';
const CB = 'o5 b4. a8 g4 e4 | e4. d8 c4 e4 | d4. c8 <b4 g4 | a2. r4 | >b4. >c8 d4 <b4 | >c4 <b4 a4 g4 | e4 f+4 g4 a4 | f+2 d2 |';
const CB_CH = 'Em | C | G | D | Em | C | Am | D7 |';
const credits: Song = {
  gain: 0.9,
  tracks: [
    join('t120 @1 v11 l8', CW, '<b2. r4 |', tr(TA, -5), CB, '@0 v11', CW, '<g2. r4 |'),
    join('@2 v7 l8', comp(CW_CH, '0 1 2 1 0 1 2 1', 55), comp(trCh(TA_CH, -5), rep('0 1 2 3', 4), 55, '16'), comp(CB_CH, '2:2 1:2', 60), comp(CW_CH, '0 1 2 3 2 1 2 3', 55)),
    join('@3 v10', comp(CW_CH, 'R:4. R:8 F:4 R:4', 40), comp(trCh(TA_CH, -5), 'R R O R F R O R', 40), comp(CB_CH, 'R:4. F:8 O:4 F:4', 40), comp(CW_CH, 'R R O R F R O R', 40)),
    join('@5 v6 l8', rep('k4 h8 h8 s4 h8 h8 |', 7), FILL, 'c8 h8 s8 h8 k8 k8 s8 h8 |', rep(ROCK, 6), FILL, 'c8 h8 h8 h8 s8 h8 h8 h8 |', rep(HALF, 6), FILL, 'c8 h8 s8 h8 k8 k8 s8 h8 |', rep(ROCK, 6), 'k8 h8 s8 h8 s16 s16 s16 s16 c4 |'),
  ],
};

export const SONGS: Record<string, Song> = {
  title,
  office,
  noc,
  basement,
  serverroom,
  cyber,
  forest,
  stack,
  loop,
  deadlock,
  void: voidSong,
  dragon,
  core,
  deploy,
  ending,
  credits,
};
