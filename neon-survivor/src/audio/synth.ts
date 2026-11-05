// Web Audio synth. All SFX generated on the fly. SPEC-003 section 2.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let lastShotAt = 0;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC =
    (window.AudioContext as typeof AudioContext | undefined) ??
    ((window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext as typeof AudioContext | undefined);
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.15;
  master.connect(ctx.destination);
  return ctx;
}

export function initAudio(): void {
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(next: boolean): void {
  muted = next;
  if (master && ctx) {
    master.gain.setTargetAtTime(muted ? 0 : 0.15, ctx.currentTime, 0.01);
  }
}

type Env = { attack: number; release: number; peak?: number };

function envelope(gain: GainNode, now: number, env: Env) {
  const peak = env.peak ?? 1;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + env.attack);
  gain.gain.linearRampToValueAtTime(0, now + env.attack + env.release);
}

function tone(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType,
  env: Env,
) {
  const c = ensure();
  if (!c || !master || muted) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  const now = c.currentTime;
  osc.frequency.setValueAtTime(freqStart, now);
  if (freqEnd !== freqStart) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, freqEnd),
      now + duration,
    );
  }
  envelope(gain, now, env);
  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

export function playShot(): void {
  const now = performance.now();
  if (now - lastShotAt < 50) return;
  lastShotAt = now;
  tone(880, 1100, 0.05, 'triangle', { attack: 0.002, release: 0.04, peak: 0.35 });
}

export function playHit(): void {
  tone(220, 180, 0.03, 'square', { attack: 0.001, release: 0.025, peak: 0.25 });
}

export function playKill(): void {
  const c = ensure();
  if (!c || !master || muted) return;
  const now = c.currentTime;
  for (const f of [440, 660]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    envelope(gain, now, { attack: 0.01, release: 0.18, peak: 0.25 });
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.22);
  }
}

export function playPickup(): void {
  tone(1200, 1600, 0.05, 'triangle', { attack: 0.001, release: 0.04, peak: 0.25 });
}

export function playHurt(): void {
  tone(180, 90, 0.25, 'sawtooth', { attack: 0.005, release: 0.2, peak: 0.4 });
}

export function playLevelUp(): void {
  tone(440, 880, 0.35, 'sine', { attack: 0.01, release: 0.32, peak: 0.45 });
}

export function playUiClick(): void {
  tone(500, 500, 0.03, 'triangle', { attack: 0.002, release: 0.025, peak: 0.35 });
}
