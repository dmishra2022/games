// Web Audio synthesis for Tank Commander. SPEC-003.

type Ctx = {
  ac: AudioContext;
  master: GainNode;
  musicGain: GainNode;
  music?: {
    saw: OscillatorNode;
    sub: OscillatorNode;
    filter: BiquadFilterNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
  };
};

let ctxRef: Ctx | null = null;
let enabled = true;
let duck = 1;

function ac(): Ctx | null {
  if (typeof window === 'undefined') return null;
  if (ctxRef) return ctxRef;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const context = new AC();
    const master = context.createGain();
    master.gain.value = 0.6;
    master.connect(context.destination);
    const musicGain = context.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(master);
    ctxRef = { ac: context, master, musicGain };
    return ctxRef;
  } catch {
    return null;
  }
}

export function unlockAudio(): void {
  const c = ac();
  if (!c) return;
  if (c.ac.state === 'suspended') {
    void c.ac.resume();
  }
}

export function setSfxEnabled(on: boolean): void {
  enabled = on;
  const c = ac();
  if (!c) return;
  c.master.gain.setTargetAtTime(on ? 0.6 : 0, c.ac.currentTime, 0.02);
}

export function setDuck(on: boolean): void {
  // Duck 25% while paused.
  duck = on ? 0.75 : 1;
  const c = ac();
  if (!c) return;
  c.master.gain.setTargetAtTime(
    enabled ? 0.6 * duck : 0,
    c.ac.currentTime,
    0.05,
  );
}

function tone(
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  gain: number,
): void {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const t = c.ac.currentTime;
  const osc = c.ac.createOscillator();
  const g = c.ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(c.master);
  osc.start(t);
  osc.stop(t + dur + 0.04);
}

function noiseBurst(
  dur: number,
  gain: number,
  filterHz: number,
  filterType: BiquadFilterType = 'lowpass',
): void {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const sr = c.ac.sampleRate;
  const len = Math.max(1, Math.floor(sr * dur));
  const buf = c.ac.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.ac.createBufferSource();
  src.buffer = buf;
  const filter = c.ac.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterHz;
  const g = c.ac.createGain();
  const t = c.ac.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(c.master);
  src.start(t);
  src.stop(t + dur + 0.04);
}

export function sfxPlayerFire(): void {
  tone('square', 180, 100, 0.18, 0.22);
  noiseBurst(0.06, 0.1, 1800, 'highpass');
}

export function sfxEnemyFire(): void {
  tone('square', 140, 80, 0.18, 0.14);
}

export function sfxExplosion(): void {
  noiseBurst(0.35, 0.28, 140, 'lowpass');
  tone('sine', 90, 40, 0.3, 0.14);
}

export function sfxTankHitPlayer(): void {
  tone('sawtooth', 200, 60, 0.15, 0.26);
}

export function sfxTankDestroyed(): void {
  noiseBurst(0.45, 0.22, 500, 'lowpass');
  tone('sine', 60, 30, 0.4, 0.3);
}

export function sfxWallDestroyed(): void {
  noiseBurst(0.12, 0.18, 2000, 'lowpass');
}

export function sfxWaveCleared(): void {
  tone('triangle', 220, 220, 0.6, 0.14); // A3
  setTimeout(() => tone('triangle', 277.18, 277.18, 0.55, 0.13), 60); // C#4
  setTimeout(() => tone('triangle', 329.63, 329.63, 0.5, 0.12), 120); // E4
}

export function sfxUiClick(): void {
  tone('triangle', 440, 320, 0.07, 0.14);
}

export function musicStart(): void {
  const c = ac();
  if (!c || c.music) return;
  const saw = c.ac.createOscillator();
  saw.type = 'sawtooth';
  saw.frequency.value = 110;
  const sub = c.ac.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = 55;
  const filter = c.ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  const lfo = c.ac.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  const lfoGain = c.ac.createGain();
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const sawGain = c.ac.createGain();
  sawGain.gain.value = 0.12;
  const subGain = c.ac.createGain();
  subGain.gain.value = 0.08;
  saw.connect(filter);
  filter.connect(sawGain);
  sawGain.connect(c.musicGain);
  sub.connect(subGain);
  subGain.connect(c.musicGain);

  const t = c.ac.currentTime;
  c.musicGain.gain.setValueAtTime(0, t);
  c.musicGain.gain.linearRampToValueAtTime(0.6, t + 0.8);

  saw.start();
  sub.start();
  lfo.start();
  c.music = { saw, sub, filter, lfo, lfoGain };
}

export function musicStop(): void {
  const c = ac();
  if (!c || !c.music) return;
  const t = c.ac.currentTime;
  c.musicGain.gain.cancelScheduledValues(t);
  c.musicGain.gain.setValueAtTime(c.musicGain.gain.value, t);
  c.musicGain.gain.linearRampToValueAtTime(0, t + 0.4);
  const m = c.music;
  setTimeout(() => {
    try {
      m.saw.stop();
      m.sub.stop();
      m.lfo.stop();
    } catch {
      /* already stopped */
    }
  }, 500);
  c.music = undefined;
}
