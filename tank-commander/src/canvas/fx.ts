// Visual effects state: particles + trauma. SPEC-003 refines this.
// Phase 1 only needs the structure; particles stay empty for now.

const MAX_PARTICLES = 256;

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
  kind: 'dust' | 'spark' | 'smoke';
};

export type FxState = {
  particles: Particle[];
  trauma: number;
  vignetteUntil: number;
  damageFlashUntil: number;
  reducedMotion: boolean;
  // Smoke/tread segments: short line decals under tanks.
  tread: Array<{ x: number; y: number; life: number; a: number }>;
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
      kind: 'dust',
    })),
    trauma: 0,
    vignetteUntil: 0,
    damageFlashUntil: 0,
    reducedMotion: false,
    tread: [],
  };
}

function spawn(
  fx: FxState,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  color: string,
  r: number,
  kind: Particle['kind'],
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
      p.kind = kind;
      return;
    }
  }
}

export function burstExplosion(
  fx: FxState,
  x: number,
  y: number,
  radius: number,
): void {
  if (fx.reducedMotion) {
    spawn(fx, x, y, 0, 0, 180, '#f0a830', 6, 'dust');
    return;
  }
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 160;
    const col = i % 3 === 0 ? '#ffcf59' : i % 3 === 1 ? '#b1562a' : '#4a4a42';
    spawn(
      fx,
      x,
      y,
      Math.cos(a) * s,
      Math.sin(a) * s,
      280 + Math.random() * 260,
      col,
      2 + Math.random() * 2,
      'dust',
    );
  }
  // Smoke puffs inside the radius.
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * radius * 0.6;
    spawn(
      fx,
      x + Math.cos(a) * r,
      y + Math.sin(a) * r,
      Math.cos(a) * 18,
      Math.sin(a) * 18,
      500 + Math.random() * 400,
      '#2b2f20',
      3 + Math.random() * 3,
      'smoke',
    );
  }
}

export function burstMuzzle(
  fx: FxState,
  x: number,
  y: number,
  angle: number,
): void {
  if (fx.reducedMotion) {
    spawn(fx, x, y, 0, 0, 60, '#ffcf59', 3, 'spark');
    return;
  }
  for (let i = 0; i < 8; i++) {
    const spread = (Math.random() - 0.5) * 0.5;
    const a = angle + spread;
    const s = 200 + Math.random() * 200;
    spawn(
      fx,
      x,
      y,
      Math.cos(a) * s,
      Math.sin(a) * s,
      120 + Math.random() * 80,
      '#ffcf59',
      1.6,
      'spark',
    );
  }
}

export function addTrauma(fx: FxState, v: number): void {
  if (fx.reducedMotion) return;
  fx.trauma = Math.min(1, fx.trauma + v);
}

export function triggerVignette(fx: FxState, ms: number): void {
  if (fx.reducedMotion) return;
  fx.vignetteUntil = performance.now() + ms;
}

export function triggerDamageFlash(fx: FxState, ms: number): void {
  fx.damageFlashUntil = performance.now() + ms;
}

export function addTread(fx: FxState, x: number, y: number, a: number): void {
  if (fx.reducedMotion) return;
  fx.tread.push({ x, y, life: 1500, a });
  if (fx.tread.length > 120) fx.tread.shift();
}

export function updateFx(fx: FxState, dtMs: number): void {
  const dt = dtMs / 1000;
  for (const p of fx.particles) {
    if (!p.active) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const drag = p.kind === 'smoke' ? 0.9 : 1.5;
    p.vx *= 1 - drag * dt;
    p.vy *= 1 - drag * dt;
    p.life -= dtMs;
    if (p.life <= 0) p.active = false;
  }
  for (const t of fx.tread) t.life -= dtMs;
  fx.tread = fx.tread.filter((t) => t.life > 0);
  fx.trauma *= Math.pow(0.5, dtMs / 140);
  if (fx.trauma < 0.001) fx.trauma = 0;
}

export function shakeOffset(fx: FxState, timeSec: number): {
  x: number;
  y: number;
} {
  if (fx.trauma <= 0) return { x: 0, y: 0 };
  const t2 = fx.trauma * fx.trauma;
  const mag = 10 * t2;
  return {
    x: Math.sin(timeSec * 60) * mag,
    y: Math.cos(timeSec * 47 + 1) * mag,
  };
}
