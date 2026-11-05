import { describe, it, expect } from 'vitest';
import { spawnWave, waveDefForArena } from '../engine/waves';
import { createWorld, defaultMeta } from '../engine/world';

describe('waveDefForArena', () => {
  it('starts easy and ramps up', () => {
    expect(waveDefForArena(0, 1)).toEqual(['grunt', 'grunt']);
    expect(waveDefForArena(0, 1).length).toBeLessThan(
      waveDefForArena(0, 5).length,
    );
  });
  it('wave 5 includes a heavy and a sniper', () => {
    const def = waveDefForArena(0, 5);
    expect(def).toContain('heavy');
    expect(def).toContain('sniper');
  });
});

describe('spawnWave', () => {
  it('activates one enemy tank slot per wave entry', () => {
    const w = createWorld({ arenaIndex: 0, meta: defaultMeta() });
    // createWorld already called spawnWave(1); clear and re-spawn wave 5.
    for (let i = 1; i < w.tanks.length; i++) w.tanks[i]!.active = false;
    spawnWave(w, 5);
    const def = waveDefForArena(0, 5);
    const active = w.tanks.filter((t) => t.active && t.side === 'enemy').length;
    expect(active).toBe(def.length);
  });
  it('spawns tanks within the arena bounds', () => {
    const w = createWorld({ arenaIndex: 0, meta: defaultMeta() });
    for (const t of w.tanks) {
      if (!t.active || t.side !== 'enemy') continue;
      expect(t.p.x).toBeGreaterThan(0);
      expect(t.p.x).toBeLessThan(w.arenaW);
      expect(t.p.y).toBeGreaterThan(0);
      expect(t.p.y).toBeLessThan(w.arenaH);
    }
  });
});
