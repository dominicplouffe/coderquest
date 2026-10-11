// A small chiptune engine in the spirit of the 3-voice + noise sound chips
// Sierra composed for in the 80s. Songs are written in MML (Music Macro Language):
//
//   t120  tempo (quarter notes per minute)     o4  octave      < >  octave down/up
//   l8    default note length (1,2,4,8,16,32)  v10 volume 0-15 @n  instrument
//   c d e f g a b  notes, with + / # (sharp) or - (flat), optional length and dots
//   r     rest     &  tie (extends previous note)   q6  gate (1-8, staccato)
//   [ ... ]3  repeat block 3 times
//   Instruments: @0 square  @1 pulse 25%  @2 pulse 12%  @3 triangle  @4 saw  @5 drums
//   On the drum instrument: k = kick, s = snare, h = hi-hat, c = crash, t = tom

export interface Song {
  tracks: string[];
  loop?: boolean;
  /** overall volume scale for this song */
  gain?: number;
}

interface Ev {
  t: number;
  d: number;
  f: number;
  v: number;
  inst: number;
  drum?: string;
  gate: number;
}

interface Compiled {
  events: Ev[];
  length: number;
}

const SEMI: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

function expandRepeats(src: string): string {
  // innermost-first expansion of [ ... ]n
  let s = src;
  for (let guard = 0; guard < 50 && s.includes('['); guard++) {
    s = s.replace(/\[([^\[\]]*)\](\d*)/g, (_, body, n) => body.repeat(n ? parseInt(n, 10) : 2));
  }
  return s;
}

function compileTrack(src: string, startTempo: number): { evs: Ev[]; len: number; tempo: number } {
  const s = expandRepeats(src.toLowerCase().replace(/\s+/g, ''));
  let i = 0;
  let tempo = startTempo;
  let oct = 4;
  let deflen = 4;
  let vol = 10;
  let inst = 0;
  let gate = 7;
  let t = 0;
  const evs: Ev[] = [];
  const num = (): number | null => {
    const m = /^\d+/.exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    return parseInt(m[0], 10);
  };
  const dur = (): number => {
    const n = num();
    let beats = 4 / (n ?? deflen);
    let add = beats / 2;
    while (s[i] === '.') {
      beats += add;
      add /= 2;
      i++;
    }
    return (beats * 60) / tempo;
  };
  while (i < s.length) {
    const ch = s[i++];
    if (ch === 't') tempo = num() ?? tempo;
    else if (ch === 'o') oct = num() ?? oct;
    else if (ch === '>') oct++;
    else if (ch === '<') oct--;
    else if (ch === 'l') {
      deflen = num() ?? deflen;
    } else if (ch === 'v') vol = num() ?? vol;
    else if (ch === '@') inst = num() ?? inst;
    else if (ch === 'q') gate = num() ?? gate;
    else if (ch === 'r') t += dur();
    else if (ch === '&') {
      const d = dur();
      const last = evs[evs.length - 1];
      if (last) last.d += d;
      t += d;
    } else if (inst === 5 && 'kshct'.includes(ch)) {
      const d = dur();
      evs.push({ t, d, f: 0, v: vol / 15, inst, drum: ch, gate });
      t += d;
    } else if (ch in SEMI) {
      let semi = SEMI[ch];
      while (s[i] === '+' || s[i] === '#' || s[i] === '-') {
        semi += s[i] === '-' ? -1 : 1;
        i++;
      }
      const d = dur();
      const midi = 12 * (oct + 1) + semi;
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      evs.push({ t, d, f, v: vol / 15, inst, gate });
      t += d;
    }
  }
  return { evs, len: t, tempo };
}

export function compileSong(song: Song): Compiled {
  let events: Ev[] = [];
  let length = 0;
  // tempo set on the first track propagates as the default to others
  const first = /t(\d+)/.exec(song.tracks[0] ?? '');
  const baseTempo = first ? parseInt(first[1], 10) : 120;
  for (const tr of song.tracks) {
    const { evs, len } = compileTrack(tr, baseTempo);
    events = events.concat(evs);
    length = Math.max(length, len);
  }
  events.sort((a, b) => a.t - b.t);
  return { events, length };
}

export class AudioSys {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  waves: PeriodicWave[] = [];
  noise!: AudioBuffer;
  songs: Record<string, Song> = {};
  compiled: Record<string, Compiled> = {};
  current: string | null = null;
  private songStart = 0;
  private nextIdx = 0;
  private loopOffset = 0;
  private timer: number | null = null;
  private active: { stop: (t: number) => void }[] = [];
  soundOn = true;
  musicOn = true;
  volume = 0.7;

  register(songs: Record<string, Song>) {
    Object.assign(this.songs, songs);
  }

  /** Must be called from a user gesture. */
  unlock() {
    if (!this.ctx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC() as AudioContext;
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume * 0.5;
      // gentle low-pass + compressor to tame raw square waves
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 7000;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      this.master.connect(lp).connect(comp).connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.musicOn && this.soundOn ? 0.55 : 0;
      this.musicBus.connect(this.master);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = this.soundOn ? 0.8 : 0;
      this.sfxBus.connect(this.master);
      const mk = (duty: number) => {
        const N = 48;
        const re = new Float32Array(N);
        const im = new Float32Array(N);
        for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
        return ctx.createPeriodicWave(re, im);
      };
      const tri = () => {
        const N = 32;
        const re = new Float32Array(N);
        const im = new Float32Array(N);
        for (let n = 1; n < N; n += 2) im[n] = (8 / (Math.PI * Math.PI)) * ((n - 1) / 2 % 2 ? -1 : 1) / (n * n);
        return ctx.createPeriodicWave(re, im);
      };
      const saw = () => {
        const N = 40;
        const re = new Float32Array(N);
        const im = new Float32Array(N);
        for (let n = 1; n < N; n++) im[n] = (2 / (n * Math.PI)) * (n % 2 ? 1 : -1);
        return ctx.createPeriodicWave(re, im);
      };
      this.waves = [mk(0.5), mk(0.25), mk(0.125), tri(), saw()];
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.current && this.timer === null) this.startScheduler();
  }

  setSound(on: boolean) {
    this.soundOn = on;
    this.applyGains();
  }
  setMusic(on: boolean) {
    this.musicOn = on;
    this.applyGains();
  }
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx) this.master.gain.value = this.volume * 0.5;
  }
  private applyGains() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.musicOn && this.soundOn ? 0.55 : 0, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.soundOn ? 0.8 : 0, t, 0.05);
  }

  play(name: string | null) {
    if (name === this.current) return;
    this.stopMusic();
    if (!name || !this.songs[name]) return;
    this.current = name;
    if (!this.compiled[name]) this.compiled[name] = compileSong(this.songs[name]);
    if (this.ctx) this.startScheduler();
  }

  stopMusic() {
    this.current = null;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx) {
      const t = this.ctx.currentTime;
      for (const a of this.active) a.stop(t);
    }
    this.active = [];
  }

  private startScheduler() {
    if (!this.ctx || !this.current) return;
    this.songStart = this.ctx.currentTime + 0.08;
    this.nextIdx = 0;
    this.loopOffset = 0;
    const tick = () => this.schedule();
    this.timer = window.setInterval(tick, 40);
    tick();
  }

  private schedule() {
    if (!this.ctx || !this.current) return;
    const song = this.compiled[this.current];
    const def = this.songs[this.current];
    if (!song || !song.events.length) return;
    const horizon = this.ctx.currentTime + 0.25;
    for (let guard = 0; guard < 400; guard++) {
      if (this.nextIdx >= song.events.length) {
        if (def.loop === false) {
          if (this.timer !== null) clearInterval(this.timer);
          this.timer = null;
          return;
        }
        this.loopOffset += song.length;
        this.nextIdx = 0;
      }
      const ev = song.events[this.nextIdx];
      const at = this.songStart + this.loopOffset + ev.t;
      if (at > horizon) break;
      if (at >= this.ctx.currentTime - 0.05) this.voice(ev, at, this.musicBus, def.gain ?? 1);
      this.nextIdx++;
    }
    // prune finished voices list occasionally
    if (this.active.length > 200) this.active = this.active.slice(-100);
  }

  private voice(ev: Ev, at: number, bus: GainNode, gain: number) {
    const ctx = this.ctx!;
    if (ev.drum) return this.drum(ev.drum, at, ev.v * gain, bus);
    if (ev.f <= 0) return;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.waves[ev.inst] ?? this.waves[0]);
    osc.frequency.value = ev.f;
    const g = ctx.createGain();
    const len = Math.max(0.03, ev.d * (ev.gate / 8));
    const peak = ev.v * gain * (ev.inst === 3 ? 0.9 : 0.32);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + 0.006);
    g.gain.setValueAtTime(peak, at + Math.max(0.007, len - 0.03));
    g.gain.linearRampToValueAtTime(peak * 0.75, at + len * 0.7);
    g.gain.linearRampToValueAtTime(0, at + len);
    osc.connect(g).connect(bus);
    osc.start(at);
    osc.stop(at + len + 0.02);
    const entry = { stop: (t: number) => { try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); osc.stop(t + 0.01); } catch { /* already stopped */ } } };
    if (bus === this.musicBus) this.active.push(entry);
  }

  private drum(kind: string, at: number, v: number, bus: GainNode) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.connect(bus);
    let stopper: AudioScheduledSourceNode;
    if (kind === 'k' || kind === 't') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f0 = kind === 'k' ? 140 : 220;
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(kind === 'k' ? 40 : 90, at + 0.12);
      g.gain.setValueAtTime(v * 0.9, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.16);
      o.connect(g);
      o.start(at);
      o.stop(at + 0.2);
      stopper = o;
    } else {
      const n = ctx.createBufferSource();
      n.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = kind === 's' ? 'bandpass' : 'highpass';
      f.frequency.value = kind === 's' ? 1800 : kind === 'c' ? 5000 : 7000;
      const len = kind === 's' ? 0.12 : kind === 'c' ? 0.5 : 0.04;
      g.gain.setValueAtTime(v * (kind === 's' ? 0.5 : 0.25), at);
      g.gain.exponentialRampToValueAtTime(0.001, at + len);
      n.connect(f).connect(g);
      n.start(at, Math.random() * 0.5);
      n.stop(at + len + 0.02);
      stopper = n;
    }
    if (bus === this.musicBus) this.active.push({ stop: (t) => { try { stopper.stop(t); } catch { /* */ } } });
  }

  /** Play a one-shot MML phrase on the sfx bus. */
  phrase(mml: string | string[], gain = 1) {
    if (!this.ctx || !this.soundOn) return;
    const song = compileSong({ tracks: Array.isArray(mml) ? mml : [mml] });
    const at0 = this.ctx.currentTime + 0.02;
    for (const ev of song.events) this.voice(ev, at0 + ev.t, this.sfxBus, gain);
  }

  /** Noise burst / sweep effects. */
  sfx(name: string) {
    if (!this.ctx || !this.soundOn) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.01;
    const sweep = (f0: number, f1: number, dur: number, inst = 0, vol = 0.25) => {
      const o = ctx.createOscillator();
      o.setPeriodicWave(this.waves[inst]);
      o.frequency.setValueAtTime(f0, now);
      o.frequency.exponentialRampToValueAtTime(f1, now + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, now);
      g.gain.linearRampToValueAtTime(0, now + dur);
      o.connect(g).connect(this.sfxBus);
      o.start(now);
      o.stop(now + dur + 0.02);
    };
    const noise = (dur: number, freq: number, vol = 0.3, type: BiquadFilterType = 'lowpass') => {
      const n = ctx.createBufferSource();
      n.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      n.connect(f).connect(g).connect(this.sfxBus);
      n.start(now);
      n.stop(now + dur + 0.05);
    };
    switch (name) {
      case 'points':
        this.phrase('t220 o5 l32 @1 v12 c e g > c8', 1);
        break;
      case 'take':
        this.phrase('t240 o5 l32 @1 v10 g > c', 1);
        break;
      case 'door':
        noise(0.25, 600, 0.35);
        sweep(180, 90, 0.18, 3, 0.4);
        break;
      case 'doorlocked':
        this.phrase('t200 o3 l16 @0 v10 c r c', 1);
        break;
      case 'beep':
        this.phrase('t240 o6 l16 @2 v10 c', 1);
        break;
      case 'error':
        this.phrase('t180 o3 l8 @4 v11 c < g', 1);
        break;
      case 'zap':
        sweep(2000, 80, 0.6, 2, 0.25);
        noise(0.5, 3000, 0.15, 'highpass');
        break;
      case 'digitize':
        this.phrase(['t300 o4 l32 @1 v10 [c e g > c e g > c < < <]4 > > c4', 't300 o3 l32 @2 v8 [g > c e g < c e]4 g4'], 1);
        break;
      case 'thud':
        sweep(120, 40, 0.25, 3, 0.6);
        noise(0.2, 300, 0.3);
        break;
      case 'splash':
        noise(0.6, 2000, 0.3, 'bandpass');
        break;
      case 'spark':
        noise(0.12, 5000, 0.3, 'highpass');
        break;
      case 'crash':
        noise(1.0, 1200, 0.5);
        sweep(200, 30, 0.8, 4, 0.3);
        break;
      case 'clink':
        this.phrase('t300 o6 l32 @2 v9 e g+', 1);
        break;
      case 'roar':
        sweep(220, 60, 1.0, 4, 0.35);
        noise(1.0, 400, 0.3);
        break;
      case 'coin':
        this.phrase('t300 o6 l32 @1 v9 b > e8', 1);
        break;
      case 'vend':
        noise(0.4, 400, 0.25);
        this.phrase('t200 o3 l16 @3 v12 c c', 1);
        break;
      case 'brew':
        noise(1.2, 900, 0.18, 'bandpass');
        break;
      case 'type':
        noise(0.03, 3000, 0.15, 'highpass');
        break;
      case 'knock':
        this.phrase('t300 o2 l16 @3 v15 c r c r c', 1);
        break;
      case 'elevator':
        this.phrase('t120 o6 l8 @2 v8 e c', 1);
        break;
      case 'alarm':
        this.phrase('t240 o5 l16 @1 v10 [a > c <]4', 1);
        break;
      case 'teleport':
        sweep(100, 2400, 0.9, 1, 0.22);
        break;
      case 'bug':
        this.phrase('t400 o6 l64 @2 v8 c c+ d c c+ d c c+ d', 1);
        break;
      case 'fanfare':
        this.phrase(['t160 o5 l16 @1 v12 c c c8 g4', 't160 o4 l16 @0 v9 e e e8 b4'], 1);
        break;
      case 'death':
        this.phrase(['t90 o4 l8 @1 v12 e d c < b4. a2', 't90 o3 l8 @3 v12 c < b a g4. a2'], 1);
        break;
      case 'step':
        noise(0.02, 800, 0.08);
        break;
      default:
        this.phrase('t240 o5 l32 @0 v8 c', 1);
    }
  }
}
