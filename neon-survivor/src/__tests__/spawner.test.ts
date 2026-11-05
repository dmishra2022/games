import { describe, expect, it } from 'vitest';
import { _internal, updateSpawner } from '../engine/spawner';
import { createWorld, defaultMeta } from '../engine/world';
import { MAX } from '../engine/constants';

describe('spawner internals', () => {
  it('shortens interval over time but never below floor', () => {
    const start = _internal.currentInterval(0);
    const mid = _internal.currentInterval(120);
    const far = _internal.currentInterval(60 * 20);
    expect(mid).toBeLessThan(start);
    expect(far).toBeGreaterThanOrEqual(0.25);
  });

  it('pickKind distribution matches early-game bias', () => {
    const counts = { grunt: 0, fast: 0, tank: 0 };
    for (let i = 0; i < 2000; i++) {
      const k = _internal.pickKind(10, Math.random());
      counts[k] += 1;
    }
    expect(counts.grunt / 2000).toBeGreaterThan(0.7);
    expect(counts.tank).toBe(0);
  });
});

describe('spawner', () => {
  it('fills the pool but never exceeds MAX.enemies', () => {
    const w = createWorld(defaultMeta());
    // Simulate a long time and many spawn attempts.
    for (let i = 0; i < 1000; i++) {
      updateSpawner(w, 1.0);
    }
    const active = w.enemies.filter((e) => e.active).length;
    expect(active).toBeLessThanOrEqual(MAX.enemies);
    expect(active).toBe(MAX.enemies); // should be full
  });

  it('does not spawn after the player dies', () => {
    const w = createWorld(defaultMeta());
    w.player.alive = false;
    updateSpawner(w, 10);
    const active = w.enemies.filter((e) => e.active).length;
    expect(active).toBe(0);
  });
});
