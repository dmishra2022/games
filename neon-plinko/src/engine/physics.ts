// Rigid-body physics for a single Plinko ball.
// SPEC-001 section 3.

import { SCORING } from '../config/board';
import type { Ball, Bucket, EngineEvent, Peg, SimState } from './types';

const MAX_DT = 1 / 30;
const SUB_STEP_DT = 1 / 120;

/**
 * Advance the simulation. Runs sub-steps to prevent tunneling at high
 * speed. Mutates `state`. Returns the engine events emitted during
 * this frame so the caller (GameCanvas) can forward them.
 */
export function stepSimulation(state: SimState, dt: number): EngineEvent[] {
  const events: EngineEvent[] = [];
  if (!state.dropActive) return events;

  let remaining = Math.min(dt, MAX_DT);
  while (remaining > 1e-6) {
    const stepDt = Math.min(remaining, SUB_STEP_DT);
    integrate(state.ball, state.config.gravity, state.config.airFriction, stepDt);
    clampSpeed(state.ball, state.config.maxBallSpeed);
    collideWithWalls(state.ball, state.config.boardWidth, state.config.wallRestitution);
    collidePegs(state, events);
    if (maybeResolveBucket(state, events)) {
      // Drop ended inside a bucket; stop stepping.
      return events;
    }
    decayCombo(state, stepDt * 1000);
    remaining -= stepDt;
  }

  // Safety: if ball somehow fell past the bucket row without being
  // assigned (shouldn't happen given full-width buckets), force a
  // settle so we never leak an active drop.
  if (state.ball.p.y > state.config.boardHeight + 50) {
    state.dropActive = false;
    state.ball.active = false;
    events.push({ type: 'DROP_SETTLED' });
  }
  return events;
}

function integrate(ball: Ball, gravity: number, airFriction: number, dt: number) {
  ball.v.y += gravity * dt;
  const retain = 1 - airFriction;
  ball.v.x *= retain;
  ball.v.y *= retain;
  ball.p.x += ball.v.x * dt;
  ball.p.y += ball.v.y * dt;
}

function clampSpeed(ball: Ball, maxSpeed: number) {
  const vx = ball.v.x;
  const vy = ball.v.y;
  const speed2 = vx * vx + vy * vy;
  const max2 = maxSpeed * maxSpeed;
  if (speed2 > max2) {
    const s = maxSpeed / Math.sqrt(speed2);
    ball.v.x = vx * s;
    ball.v.y = vy * s;
  }
}

function collideWithWalls(ball: Ball, boardWidth: number, restitution: number) {
  const r = ball.r;
  if (ball.p.x - r < 0) {
    ball.p.x = r;
    if (ball.v.x < 0) ball.v.x = -ball.v.x * restitution;
  } else if (ball.p.x + r > boardWidth) {
    ball.p.x = boardWidth - r;
    if (ball.v.x > 0) ball.v.x = -ball.v.x * restitution;
  }
}

function collidePegs(state: SimState, events: EngineEvent[]) {
  const { ball } = state;
  const sumR = ball.r + state.pegs[0]!.r; // all pegs share radius
  const sumR2 = sumR * sumR;
  for (const peg of state.pegs) {
    const dx = ball.p.x - peg.p.x;
    const dy = ball.p.y - peg.p.y;
    // Broad-phase AABB reject.
    if (dx > sumR || dx < -sumR) continue;
    if (dy > sumR || dy < -sumR) continue;
    const dist2 = dx * dx + dy * dy;
    if (dist2 >= sumR2) continue;
    const dist = Math.sqrt(dist2) || 1e-6;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = sumR - dist;
    // Positional correction so the ball sits exactly on the peg surface.
    ball.p.x += nx * overlap;
    ball.p.y += ny * overlap;
    const vn = ball.v.x * nx + ball.v.y * ny;
    if (vn < 0) {
      const k = -(1 + state.config.pegRestitution) * vn;
      ball.v.x += k * nx;
      ball.v.y += k * ny;
    }
    if (!state.hitPegsThisDrop.has(peg.id)) {
      state.hitPegsThisDrop.add(peg.id);
      state.combo = Math.max(1, state.combo + 1);
      state.comboTimerMs = 0;
      state.runScore += SCORING.basePegPoints * state.combo;
      events.push({ type: 'PEG_HIT', pegId: peg.id, comboAfter: state.combo });
    }
  }
}

function maybeResolveBucket(state: SimState, events: EngineEvent[]): boolean {
  const { ball, buckets } = state;
  const bucketTopY = buckets[0]!.y0;
  if (ball.p.y + ball.r < bucketTopY) return false;
  // Prefer explicit landing: when ball passes the bucket top line, pick
  // the bucket its center X falls into.
  const bucket = resolveBucket(ball, buckets);
  if (!bucket) return false;
  events.push({
    type: 'BUCKET_LAND',
    bucketIndex: bucket.index,
    multiplier: bucket.multiplier,
    runScore: state.runScore,
  });
  events.push({ type: 'DROP_SETTLED' });
  state.dropActive = false;
  state.ball.active = false;
  return true;
}

/**
 * Pure. Return the bucket a ball's center X falls into, or null if
 * none matched (shouldn't happen with full-width bucket row).
 */
export function resolveBucket(ball: Ball, buckets: Bucket[]): Bucket | null {
  for (const b of buckets) {
    if (ball.p.x >= b.x0 && ball.p.x < b.x1) return b;
  }
  // Edge case: ball exactly on right edge.
  const last = buckets[buckets.length - 1];
  if (last && ball.p.x >= last.x0 && ball.p.x <= last.x1) return last;
  return null;
}

function decayCombo(state: SimState, dtMs: number) {
  state.comboTimerMs += dtMs;
  if (state.comboTimerMs > SCORING.comboWindowMs) {
    state.combo = 1;
  }
}

/**
 * Start a new drop at the given spawn X. The spawn X is clamped so the
 * ball starts inside the board.
 */
export function spawnBall(state: SimState, spawnX: number): EngineEvent[] {
  if (state.dropActive) return [];
  const r = state.ball.r;
  const clamped = Math.max(r, Math.min(state.config.boardWidth - r, spawnX));
  state.ball.p.x = clamped;
  state.ball.p.y = state.config.spawnY;
  // Micro jitter avoids perfect vertical equilibria on center spawns.
  const jitter = state.config.spawnJitterVx;
  state.ball.v.x = (Math.random() * 2 - 1) * jitter;
  state.ball.v.y = 0;
  state.ball.active = true;
  state.dropActive = true;
  state.hitPegsThisDrop.clear();
  state.runScore = 0;
  state.combo = 1;
  state.comboTimerMs = 0;
  return [{ type: 'DROP_STARTED', spawnX: clamped }];
}

/**
 * Build an initial, inactive sim state. Caller provides pre-built pegs
 * and buckets so this remains a pure factory.
 */
export function createSimState(
  pegs: Peg[],
  buckets: Bucket[],
  config: SimState['config'],
): SimState {
  return {
    ball: {
      p: { x: config.boardWidth / 2, y: config.spawnY },
      v: { x: 0, y: 0 },
      r: config.ballRadius,
      active: false,
    },
    pegs,
    buckets,
    hitPegsThisDrop: new Set<number>(),
    runScore: 0,
    combo: 1,
    comboTimerMs: 0,
    config,
    dropActive: false,
    aimX: config.boardWidth / 2,
  };
}
