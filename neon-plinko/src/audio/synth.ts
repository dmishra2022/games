// Web Audio synth. All SFX are generated on the fly; no file assets.
// SPEC-003 section 4.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

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

/** Call from first user gesture to unlock audio on iOS/Safari. */
export function initAudio(): void {
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(nextMuted: boolean): void {
  muted = nextMuted;
  if (master && ctx) {
    master.gain.setTargetAtTime(muted ? 0 : 0.15, ctx.currentTime, 0.01);
  }
}

type EnvelopeOpts = {
  attack: number;
  release: number;
  peak?: number;
};

function envelope(gain: GainNode, now: number, opts: EnvelopeOpts) {
  const peak = opts.peak ?? 1;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + opts.attack);
  gain.gain.linearRampToValueAtTime(
    0,
    now + opts.attack + opts.release,
  );
}

function tone(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType,
  env: EnvelopeOpts,
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

export function playPeg(): void {
  tone(880, 1100, 0.06, 'triangle', { attack: 0.002, release: 0.05, peak: 0.6 });
}

export function playBucket(multiplier: number): void {
  const c = ensure();
  if (!c || !master || muted) return;
  const now = c.currentTime;
  const freqs = multiplier >= 3 ? [440, 660, 880] : [440];
  const dur = multiplier >= 3 ? 0.4 : 0.2;
  for (const f of freqs) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    envelope(gain, now, { attack: 0.01, release: dur - 0.02, peak: 0.3 });
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }
}

export function playPurchase(): void {
  tone(660, 990, 0.15, 'square', { attack: 0.002, release: 0.12, peak: 0.4 });
}

export function playClick(): void {
  tone(440, 440, 0.04, 'triangle', { attack: 0.002, release: 0.03, peak: 0.4 });
}
