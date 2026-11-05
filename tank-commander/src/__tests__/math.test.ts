import { describe, it, expect } from 'vitest';
import {
  circleAabb,
  clamp,
  pointInAabb,
  rayAabb,
  rotateToward,
  shortestAngleDiff,
} from '../engine/math';
import type { Aabb } from '../engine/types';

const box: Aabb = { x0: 0, y0: 0, x1: 100, y1: 100 };

describe('shortestAngleDiff', () => {
  it('returns zero for equal angles', () => {
    expect(shortestAngleDiff(1.2, 1.2)).toBeCloseTo(0, 6);
  });
  it('wraps across -PI/PI boundary', () => {
    // From 3.1 rad to -3.1 rad should be ~+0.0832 (short way), not -6.2.
    const d = shortestAngleDiff(3.1, -3.1);
    expect(Math.abs(d)).toBeLessThan(Math.PI);
    expect(d).toBeCloseTo(2 * Math.PI - 6.2, 2);
  });
  it('returns negative when target is clockwise', () => {
    expect(shortestAngleDiff(0, -1)).toBeCloseTo(-1, 6);
  });
});

describe('rotateToward', () => {
  it('snaps to target when within maxDelta', () => {
    expect(rotateToward(0, 0.05, 0.1)).toBeCloseTo(0.05, 6);
  });
  it('steps by maxDelta toward target', () => {
    expect(rotateToward(0, 1, 0.1)).toBeCloseTo(0.1, 6);
    expect(rotateToward(0, -1, 0.1)).toBeCloseTo(-0.1, 6);
  });
  it('takes the shortest arc', () => {
    // Current = PI - 0.01, target = -PI + 0.01, step 0.1.
    const r = rotateToward(Math.PI - 0.01, -Math.PI + 0.01, 0.1);
    // Short-way diff is +0.02, so we should snap past PI into -PI+... territory,
    // but any value within 0.1 of target along shortest arc is correct.
    const diff = Math.abs(shortestAngleDiff(r, -Math.PI + 0.01));
    expect(diff).toBeLessThan(1e-6);
  });
});

describe('circleAabb', () => {
  it('returns null when outside', () => {
    expect(circleAabb(-20, 50, 5, box)).toBeNull();
  });
  it('resolves from the left side', () => {
    const r = circleAabb(-2, 50, 5, box)!;
    expect(r).not.toBeNull();
    expect(r.nx).toBeCloseTo(-1, 6);
    expect(r.ny).toBeCloseTo(0, 6);
    expect(r.overlap).toBeCloseTo(3, 6);
  });
  it('resolves from the top side', () => {
    const r = circleAabb(50, -2, 5, box)!;
    expect(r.nx).toBeCloseTo(0, 6);
    expect(r.ny).toBeCloseTo(-1, 6);
    expect(r.overlap).toBeCloseTo(3, 6);
  });
  it('resolves around a corner diagonally', () => {
    const r = circleAabb(-2, -2, 5, box)!;
    // Closest point is (0,0); normal points up-left.
    expect(r.nx).toBeLessThan(0);
    expect(r.ny).toBeLessThan(0);
    expect(r.overlap).toBeGreaterThan(0);
  });
});

describe('pointInAabb', () => {
  it('detects interior points', () => {
    expect(pointInAabb(50, 50, box)).toBe(true);
  });
  it('rejects exterior points', () => {
    expect(pointInAabb(-1, 50, box)).toBe(false);
    expect(pointInAabb(50, 101, box)).toBe(false);
  });
});

describe('rayAabb', () => {
  it('hits a box straight ahead', () => {
    const t = rayAabb(-10, 50, 1, 0, 200, box);
    expect(t).not.toBeNull();
    expect(t!).toBeCloseTo(10, 6);
  });
  it('misses a box that is off-axis', () => {
    expect(rayAabb(-10, -50, 1, 0, 200, box)).toBeNull();
  });
  it('respects maxT', () => {
    expect(rayAabb(-10, 50, 1, 0, 5, box)).toBeNull();
  });
});

describe('clamp', () => {
  it('clamps correctly', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(100, 0, 10)).toBe(10);
  });
});
