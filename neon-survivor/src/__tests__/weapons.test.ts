import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../engine/enemies';
import { updateWeapons } from '../engine/weapons';
import { createWorld, defaultMeta } from '../engine/world';
import { WORLD } from '../engine/constants';

describe('blaster', () => {
  it('fires roughly at blasterBaseInterval', () => {
    const w = createWorld(defaultMeta());
    spawnEnemy(w, 'grunt', { x: 50, y: 0 });
    let shots = 0;
    // 3 seconds of ticks at 1/60s.
    const steps = 3 * 60;
    for (let i = 0; i < steps; i++) {
      const before = w.bullets.filter((b) => b.active).length;
      updateWeapons(w, 1 / 60);
      const after = w.bullets.filter((b) => b.active).length;
      shots += Math.max(0, after - before);
      // Age bullets so the active count resets.
      for (const b of w.bullets) if (b.active) b.life = 0;
    }
    const expected = 3 / WORLD.blasterBaseInterval;
    expect(shots).toBeGreaterThanOrEqual(Math.floor(expected));
    expect(shots).toBeLessThanOrEqual(Math.ceil(expected) + 1);
  });

  it('spawns projectileCount bullets per shot', () => {
    const w = createWorld(defaultMeta());
    spawnEnemy(w, 'grunt', { x: 50, y: 0 });
    w.player.projectileCount = 3;
    // Force a cooldown at 0 then fire.
    const blaster = w.weapons.find((wp) => wp.kind === 'blaster')!;
    blaster.cooldown = 0;
    updateWeapons(w, 0);
    const active = w.bullets.filter((b) => b.active).length;
    expect(active).toBe(3);
  });
});
