// Visual effects state: particle pool, player trail, screen trauma.
// SPEC-003 sections 1.2-1.4.

const MAX_PARTICLES = 256;
const TRAIL_LEN = 6;

export type Particle = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
};

export type FxState = {
  particles: Particle[];
  // Last N player positions for trail (world-space).
  trail: Array<{ x: number; y: number }>;
  trauma: number;           // 0..1 shake intensity
  vignetteUntil: number;    // ms wall clock when the hurt vignette ends
  reducedMotion: boolean;
};

export function createFxState(): FxState {
  return {
    particles: Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      r: 2,
      color: '#ffffff',
    })),
    trail: [],
    trauma: 0,
    vignetteUntil: 0,
    reducedMotion: false,
  };
}

function spawnOne(
  fx: FxState,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  color: string,
  r = 2,
): void {
  for (const p of fx.particles) {
    if (!p.active) {
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.color = color;
      p.r = r;
      return;
    }
  }
}

export function burstEnemyDeath(
  fx: FxState,
  x: number,
  y: number,
  color: string,
): void {
  if (fx.reducedMotion) {
    spawnOne(fx, x, y, 0, 0, 120, color, 4);
    return;
  }
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 80 + Math.random() * 140;
    spawnOne(
      fx,
      x,
      y,
      Math.cos(a) * s,
      Math.sin(a) * s,
      300 + Math.random() * 300,
      color,
    );
  }
}

export function burstHurt(fx: FxState, x: number, y: number): void {
  if (fx.reducedMotion) return;
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 140;
    spawnOne(
      fx,
      x,
      y,
      Math.cos(a) * s,
      Math.sin(a) * s,
      350 + Math.random() * 250,
      '#ff4d6d',
    );
  }
}

export function burstPickup(fx: FxState, x: number, y: number): void {
  if (fx.reducedMotion) return;
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 50 + Math.random() * 90;
    spawnOne(
      fx,
      x,
      y,
      Math.cos(a) * s,
      Math.sin(a) * s,
      200 + Math.random() * 100,
      '#9bff5a',
      1.5,
    );
  }
}

export function burstLevelUp(fx: FxState, x: number, y: number): void {
  if (fx.reducedMotion) return;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const s = 140 + Math.random() * 60;
    const color = i % 2 === 0 ? '#39e2ff' : '#9bff5a';
    spawnOne(
      fx,
      x,
      y,
      Math.cos(a) * s,
      Math.sin(a) * s,
      450 + Math.random() * 250,
      color,
      2.5,
    );
  }
}

export function addTrauma(fx: FxState, v: number): void {
  if (fx.reducedMotion) return;
  fx.trauma = Math.min(1, fx.trauma + v);
}

export function triggerVignette(fx: FxState, ms: number): void {
  if (fx.reducedMotion) {
    fx.vignetteUntil = 0;
    return;
  }
  fx.vignetteUntil = performance.now() + ms;
}

export function updateFx(
  fx: FxState,
  dtMs: number,
  playerX: number,
  playerY: number,
): void {
  const dt = dtMs / 1000;
  // Particles: linear motion, slight drag, life decay.
  for (const p of fx.particles) {
    if (!p.active) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 0.8 * dt;
    p.vy *= 1 - 0.8 * dt;
    p.life -= dtMs;
    if (p.life <= 0) p.active = false;
  }
  // Trail: sample once per frame.
  if (!fx.reducedMotion) {
    fx.trail.push({ x: playerX, y: playerY });
    if (fx.trail.length > TRAIL_LEN) fx.trail.shift();
  } else if (fx.trail.length > 0) {
    fx.trail.length = 0;
  }
  // Trauma decay (half-life ~120ms).
  fx.trauma *= Math.pow(0.5, dtMs / 120);
  if (fx.trauma < 0.001) fx.trauma = 0;
}

export function shakeOffset(fx: FxState, timeSec: number): {
  x: number;
  y: number;
} {
  if (fx.trauma <= 0) return { x: 0, y: 0 };
  const t2 = fx.trauma * fx.trauma;
  const mag = 12 * t2;
  // Deterministic noise from time to avoid per-frame Math.random.
  const fx1 = Math.sin(timeSec * 60) * mag;
  const fy1 = Math.cos(timeSec * 47 + 1) * mag;
  return { x: fx1, y: fy1 };
}
