import { describe, expect, it } from 'vitest';
import {
  BOARD_WIDTH,
  BUCKET_LAYOUT,
  PEG_LAYOUT,
  SIM_CONFIG,
} from '../config/board';
import { buildBuckets, buildPegs } from '../engine/pegLayout';
import {
  createSimState,
  resolveBucket,
  spawnBall,
  stepSimulation,
} from '../engine/physics';
import type { Bucket } from '../engine/types';

function freshState() {
  const pegs = buildPegs(PEG_LAYOUT);
  const buckets = buildBuckets({
    count: BUCKET_LAYOUT.count,
    boardWidth: BOARD_WIDTH,
    y0: BUCKET_LAYOUT.y0,
    y1: BUCKET_LAYOUT.y1,
    multipliers: BUCKET_LAYOUT.multipliers,
  });
  return createSimState(pegs, buckets, SIM_CONFIG);
}

describe('resolveBucket', () => {
  const buckets: Bucket[] = [
    { index: 0, x0: 0, x1: 100, y0: 540, y1: 600, multiplier: 8 },
    { index: 1, x0: 100, x1: 200, y0: 540, y1: 600, multiplier: 1 },
    { index: 2, x0: 200, x1: 300, y0: 540, y1: 600, multiplier: 8 },
  ];

  it('returns the bucket whose range contains ball x', () => {
    expect(
      resolveBucket({ p: { x: 50, y: 550 }, v: { x: 0, y: 0 }, r: 7, active: true }, buckets)!
        .index,
    ).toBe(0);
    expect(
      resolveBucket({ p: { x: 150, y: 550 }, v: { x: 0, y: 0 }, r: 7, active: true }, buckets)!
        .index,
    ).toBe(1);
  });

  it('returns the last bucket for the rightmost edge x', () => {
    expect(
      resolveBucket({ p: { x: 300, y: 550 }, v: { x: 0, y: 0 }, r: 7, active: true }, buckets)!
        .index,
    ).toBe(2);
  });
});

describe('stepSimulation', () => {
  it('is a no-op when no drop is active', () => {
    const state = freshState();
    const evs = stepSimulation(state, 1 / 60);
    expect(evs).toHaveLength(0);
  });

  it('emits DROP_STARTED on spawn and clamps spawn X into the board', () => {
    const state = freshState();
    const evs = spawnBall(state, -50);
    expect(evs[0]).toMatchObject({ type: 'DROP_STARTED' });
    expect(state.ball.p.x).toBeGreaterThanOrEqual(state.ball.r);
    expect(state.dropActive).toBe(true);
  });

  it('eventually settles into a bucket within a bounded wall-clock budget', () => {
    const state = freshState();
    spawnBall(state, BOARD_WIDTH / 2 + 10);
    let settled = false;
    let bucketLandCount = 0;
    const maxFrames = 60 * 20; // 20s of simulated frames at 60Hz is well beyond expected fall
    for (let i = 0; i < maxFrames && !settled; i++) {
      const evs = stepSimulation(state, 1 / 60);
      for (const e of evs) {
        if (e.type === 'BUCKET_LAND') bucketLandCount++;
        if (e.type === 'DROP_SETTLED') settled = true;
      }
    }
    expect(settled).toBe(true);
    expect(bucketLandCount).toBe(1);
    expect(state.dropActive).toBe(false);
  });

  it('does not emit duplicate PEG_HIT for the same peg in one drop', () => {
    const state = freshState();
    spawnBall(state, BOARD_WIDTH / 2);
    const seenPegs = new Set<number>();
    let dup = false;
    for (let i = 0; i < 60 * 20; i++) {
      const evs = stepSimulation(state, 1 / 60);
      for (const e of evs) {
        if (e.type === 'PEG_HIT') {
          if (seenPegs.has(e.pegId)) dup = true;
          seenPegs.add(e.pegId);
        }
      }
      if (!state.dropActive) break;
    }
    expect(dup).toBe(false);
  });

  it('clamps very large dt to avoid tunneling (ball still lands)', () => {
    const state = freshState();
    spawnBall(state, BOARD_WIDTH / 2);
    let settled = false;
    for (let i = 0; i < 60 * 30 && !settled; i++) {
      const evs = stepSimulation(state, 2); // comically large dt
      for (const e of evs) if (e.type === 'DROP_SETTLED') settled = true;
    }
    expect(settled).toBe(true);
    expect(state.ball.p.x).toBeGreaterThanOrEqual(0);
    expect(state.ball.p.x).toBeLessThanOrEqual(BOARD_WIDTH);
  });
});
