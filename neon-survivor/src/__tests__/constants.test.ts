import { describe, expect, it } from 'vitest';
import { enemyKindWeights, xpToNextLevel } from '../engine/constants';

describe('xpToNextLevel', () => {
  it('matches the formula 10 + 8*L + 2*L^2', () => {
    for (const L of [1, 2, 5, 10, 20]) {
      expect(xpToNextLevel(L)).toBe(10 + 8 * L + 2 * L * L);
    }
  });

  it('is strictly increasing', () => {
    let prev = -1;
    for (let l = 1; l < 30; l++) {
      const v = xpToNextLevel(l);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });
});

describe('enemyKindWeights', () => {
  it('sums to roughly 1 at every tier', () => {
    for (const t of [0, 30, 60, 120, 180, 300]) {
      const w = enemyKindWeights(t);
      expect(w.grunt + w.fast + w.tank).toBeCloseTo(1, 5);
    }
  });

  it('introduces tanks only after 60s', () => {
    expect(enemyKindWeights(59).tank).toBe(0);
    expect(enemyKindWeights(60).tank).toBeGreaterThan(0);
  });
});
