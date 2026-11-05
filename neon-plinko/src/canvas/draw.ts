// Canvas renderer. SPEC-003 visual polish.

import type { SimState } from '../engine/types';

const COLOR_BG_TOP = '#0b0b16';
const COLOR_BG_BOTTOM = '#120b1c';
const COLOR_PEG = '#5ad7ff';
const COLOR_BALL = '#ff5ad7';
const COLOR_BUCKET_LOW = '#5ad7ff';
const COLOR_BUCKET_MID = '#ff5ad7';
const COLOR_BUCKET_HIGH = '#ffe15a';
const COLOR_DEBUG = '#ffe15a';
const GRID_LINE = 'rgba(90,215,255,0.06)';

const TRAIL_LEN = 10;
const MAX_PARTICLES = 128;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
  active: boolean;
};

export type RenderExtras = {
  // Timestamp (ms) each peg was last hit. Enables fade-out ring.
  pegHits: Map<number, number>;
  // Timestamp (ms) each bucket was last landed in.
  bucketHits: Map<number, number>;
  // Ball trail positions (newest last).
  trail: Array<{ x: number; y: number }>;
  particles: Particle[];
  reducedMotion: boolean;
  // Monotonic time source (performance.now()).
  now: number;
};

export function createRenderExtras(): RenderExtras {
  return {
    pegHits: new Map(),
    bucketHits: new Map(),
    trail: [],
    particles: Array.from({ length: MAX_PARTICLES }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      r: 2,
      color: '#ffffff',
      active: false,
    })),
    reducedMotion: false,
    now: 0,
  };
}

function spawnParticle(
  extras: RenderExtras,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  color: string,
  r = 2,
) {
  for (const p of extras.particles) {
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

export function emitPegBurst(extras: RenderExtras, x: number, y: number): void {
  if (extras.reducedMotion) return;
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 100;
    spawnParticle(
      extras,
      x,
      y,
      Math.cos(a) * s,
      Math.sin(a) * s,
      300 + Math.random() * 200,
      COLOR_PEG,
    );
  }
}

export function emitBucketBurst(
  extras: RenderExtras,
  x: number,
  y: number,
  multiplier: number,
): void {
  if (extras.reducedMotion) return;
  const color =
    multiplier >= 3
      ? COLOR_BUCKET_HIGH
      : multiplier >= 1
        ? COLOR_BUCKET_MID
        : COLOR_BUCKET_LOW;
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const s = 120 + Math.random() * 120;
    spawnParticle(
      extras,
      x,
      y,
      Math.cos(a) * s,
      Math.sin(a) * s,
      500 + Math.random() * 400,
      color,
      2 + Math.random() * 1.5,
    );
  }
}

export function updateParticles(extras: RenderExtras, dtMs: number): void {
  const dt = dtMs / 1000;
  for (const p of extras.particles) {
    if (!p.active) continue;
    p.vy += 400 * dt; // gravity
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dtMs;
    if (p.life <= 0) p.active = false;
  }
}

export function updateTrail(extras: RenderExtras, state: SimState): void {
  if (extras.reducedMotion) {
    extras.trail.length = 0;
    return;
  }
  if (!state.dropActive) {
    extras.trail.length = 0;
    return;
  }
  extras.trail.push({ x: state.ball.p.x, y: state.ball.p.y });
  if (extras.trail.length > TRAIL_LEN) extras.trail.shift();
}

function bucketColor(mult: number): string {
  if (mult >= 3) return COLOR_BUCKET_HIGH;
  if (mult >= 1) return COLOR_BUCKET_MID;
  return COLOR_BUCKET_LOW;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: SimState,
  extras: RenderExtras,
): void {
  const { boardWidth, boardHeight } = state.config;
  const { now, reducedMotion } = extras;

  // Background gradient.
  const bg = ctx.createLinearGradient(0, 0, 0, boardHeight);
  bg.addColorStop(0, COLOR_BG_TOP);
  bg.addColorStop(1, COLOR_BG_BOTTOM);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, boardWidth, boardHeight);

  // Subtle grid.
  if (!reducedMotion) {
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let y = 40; y < boardHeight; y += 40) {
      ctx.moveTo(0, y);
      ctx.lineTo(boardWidth, y);
    }
    ctx.stroke();
  }

  // Buckets with gradient fills and pulse.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 16px "Rajdhani", system-ui, sans-serif';
  for (const b of state.buckets) {
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    const base = bucketColor(b.multiplier);
    const hitAt = extras.bucketHits.get(b.index) ?? 0;
    const sinceHit = now - hitAt;
    const pulse =
      hitAt && sinceHit < 400 && !reducedMotion ? 1 - sinceHit / 400 : 0;

    const grad = ctx.createLinearGradient(0, b.y0, 0, b.y1);
    grad.addColorStop(0, base + '00');
    grad.addColorStop(1, base + (pulse > 0 ? 'ff' : '55'));
    ctx.fillStyle = grad;
    ctx.fillRect(b.x0, b.y0, w, h);

    ctx.strokeStyle = base;
    ctx.lineWidth = pulse > 0 ? 2 : 1;
    ctx.strokeRect(b.x0 + 0.5, b.y0 + 0.5, w - 1, h - 1);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`x${b.multiplier}`, b.x0 + w / 2, b.y0 + h / 2);
  }

  // Pegs with glow + hit flash ring.
  for (const peg of state.pegs) {
    if (!reducedMotion) {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = COLOR_PEG;
    }
    ctx.fillStyle = COLOR_PEG;
    ctx.beginPath();
    ctx.arc(peg.p.x, peg.p.y, peg.r, 0, Math.PI * 2);
    ctx.fill();
    if (!reducedMotion) ctx.restore();

    const hitAt = extras.pegHits.get(peg.id);
    if (hitAt) {
      const sinceHit = now - hitAt;
      if (sinceHit < 250) {
        if (reducedMotion) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(peg.p.x, peg.p.y, peg.r + 1, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const t = sinceHit / 250;
          ctx.strokeStyle = `rgba(255,255,255,${1 - t})`;
          ctx.lineWidth = 1 + 2 * (1 - t);
          ctx.beginPath();
          ctx.arc(peg.p.x, peg.p.y, peg.r + 2 + t * 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        extras.pegHits.delete(peg.id);
      }
    }
  }

  // Particles.
  for (const p of extras.particles) {
    if (!p.active) continue;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Trail then ball.
  if (!reducedMotion) {
    for (let i = 0; i < extras.trail.length; i++) {
      const t = extras.trail[i]!;
      const a = (i + 1) / extras.trail.length;
      ctx.fillStyle = COLOR_BALL;
      ctx.globalAlpha = a * 0.4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, state.ball.r * (0.5 + 0.5 * a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Aim indicator when idle.
  if (!state.dropActive) {
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = COLOR_BALL;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(state.aimX, 0);
    ctx.lineTo(state.aimX, state.config.spawnY + 10);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 90, 215, 0.35)';
    ctx.beginPath();
    ctx.arc(state.aimX, state.config.spawnY, state.ball.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.ball.active) {
    if (!reducedMotion) {
      ctx.save();
      ctx.shadowBlur = 14;
      ctx.shadowColor = COLOR_BALL;
    }
    ctx.fillStyle = COLOR_BALL;
    ctx.beginPath();
    ctx.arc(state.ball.p.x, state.ball.p.y, state.ball.r, 0, Math.PI * 2);
    ctx.fill();
    if (!reducedMotion) ctx.restore();
  }

  // Dev-only debug readout.
  if (import.meta.env?.DEV) {
    ctx.fillStyle = COLOR_DEBUG;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '12px "Rajdhani", system-ui, sans-serif';
    ctx.fillText(`score: ${state.runScore}  combo: x${state.combo}`, 6, 6);
  }
}
