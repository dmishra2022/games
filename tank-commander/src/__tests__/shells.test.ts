import { describe, it, expect } from 'vitest';
import { PLAYER_STATS, SHELL } from '../engine/constants';
import {
  createEmptyShellPool,
  integrateShells,
  resolveShellCollisions,
  spawnShell,
} from '../engine/shells';
import {
  createEmptyTankPool,
  spawnEnemyTank,
  spawnPlayerTank,
} from '../engine/tank';
import { createWall } from '../engine/walls';
import { defaultMeta } from '../engine/world';
import type { World } from '../engine/types';

function emptyWorld(): World {
  return {
    time: 0,
    arenaW: 1200,
    arenaH: 800,
    arenaIndex: 0,
    tanks: createEmptyTankPool(8),
    shells: createEmptyShellPool(16),
    walls: [],
    wave: 1,
    wavesPerArena: 5,
    waveClearedAt: null,
    pending: [],
    nextTankId: 0,
    playerKills: 0,
    waveSpawnQueue: [],
  };
}

describe('spawnShell', () => {
  it('activates a slot with owner metadata', () => {
    const w = emptyWorld();
    spawnShell(w, {
      p: { x: 50, y: 50 },
      v: { x: 100, y: 0 },
      dmg: 20,
      ownerId: 7,
      ownerSide: 'player',
    });
    const s = w.shells.find((x) => x.active)!;
    expect(s).toBeTruthy();
    expect(s.ownerSide).toBe('player');
    expect(s.spawnCooldown).toBe(SHELL.ownerImmunity);
    expect(s.life).toBe(SHELL.life);
  });
});

describe('integrateShells', () => {
  it('advances position and decrements life; deactivates when expired', () => {
    const w = emptyWorld();
    spawnShell(w, {
      p: { x: 0, y: 0 },
      v: { x: 100, y: 0 },
      dmg: 10,
      ownerId: 0,
      ownerSide: 'player',
    });
    const s = w.shells.find((x) => x.active)!;
    integrateShells(w, 0.1);
    expect(s.p.x).toBeCloseTo(10, 4);
    expect(s.life).toBeCloseTo(SHELL.life - 0.1, 4);
    integrateShells(w, SHELL.life + 1);
    expect(s.active).toBe(false);
  });
});

describe('resolveShellCollisions', () => {
  it('damages a tank inside the AoE and emits TANK_HIT', () => {
    const w = emptyWorld();
    spawnPlayerTank(w, { x: 500, y: 500 }, defaultMeta());
    const e = spawnEnemyTank(w, 'grunt', { x: 500, y: 400 })!;
    const hpBefore = e.hp;
    // Player shell lands next to the enemy.
    spawnShell(w, {
      p: { x: e.p.x, y: e.p.y + 5 }, // inside AoE and inside its body
      v: { x: 0, y: 0 },
      dmg: 30,
      ownerId: w.tanks[0]!.id,
      ownerSide: 'player',
    });
    resolveShellCollisions(w);
    expect(e.hp).toBeLessThan(hpBefore);
    const hitEv = w.pending.find(
      (ev) => ev.type === 'TANK_HIT' && ev.side === 'enemy',
    );
    expect(hitEv).toBeTruthy();
  });

  it('kills an enemy and increments playerKills', () => {
    const w = emptyWorld();
    spawnPlayerTank(w, { x: 500, y: 500 }, defaultMeta());
    const e = spawnEnemyTank(w, 'grunt', { x: 500, y: 400 })!;
    const prevKills = w.playerKills;
    spawnShell(w, {
      p: { x: e.p.x, y: e.p.y },
      v: { x: 0, y: 0 },
      dmg: 999,
      ownerId: w.tanks[0]!.id,
      ownerSide: 'player',
    });
    resolveShellCollisions(w);
    expect(e.active).toBe(false);
    expect(w.playerKills).toBe(prevKills + 1);
    expect(w.pending.find((ev) => ev.type === 'TANK_DESTROYED')).toBeTruthy();
  });

  it('respects owner immunity during spawn cooldown', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 500, y: 500 }, defaultMeta())!;
    const hpBefore = p.hp;
    spawnShell(w, {
      p: { x: p.p.x, y: p.p.y },
      v: { x: 0, y: 0 },
      dmg: 50,
      ownerId: p.id,
      ownerSide: 'player',
    });
    resolveShellCollisions(w);
    expect(p.hp).toBe(hpBefore);
  });

  it('applies armor to player-side damage', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(
      w,
      { x: 500, y: 500 },
      { hp: 0, damage: 0, reload: 0, armor: 5 },
    )!;
    // Clear the spawn cooldown so player can be hit.
    spawnShell(w, {
      p: { x: p.p.x, y: p.p.y + 5 },
      v: { x: 0, y: 0 },
      dmg: 20,
      ownerId: 999, // not the player
      ownerSide: 'enemy',
    });
    const s = w.shells.find((x) => x.active)!;
    s.spawnCooldown = 0;
    resolveShellCollisions(w);
    const hitEv = w.pending.find(
      (ev) => ev.type === 'TANK_HIT' && ev.side === 'player',
    );
    expect(hitEv).toBeTruthy();
    // Damage should be scaled by armorMul = 0.92^5 ≈ 0.659.
    if (hitEv && hitEv.type === 'TANK_HIT') {
      expect(hitEv.dmg).toBeLessThan(20);
      expect(hitEv.dmg).toBeGreaterThan(0);
    }
  });

  it('damages a crate wall and destroys it when HP drops to 0', () => {
    const w = emptyWorld();
    w.walls = [createWall(100, 100, 160, 160, 'crate')];
    spawnShell(w, {
      p: { x: 130, y: 130 },
      v: { x: 0, y: 0 },
      dmg: 999,
      ownerId: 1,
      ownerSide: 'player',
    });
    resolveShellCollisions(w);
    const crate = w.walls[0]!;
    expect(crate.active).toBe(false);
    expect(
      w.pending.find((ev) => ev.type === 'WALL_DESTROYED'),
    ).toBeTruthy();
  });

  it('rocks are indestructible but still stop shells', () => {
    const w = emptyWorld();
    w.walls = [createWall(100, 100, 160, 160, 'rock')];
    spawnShell(w, {
      p: { x: 130, y: 130 },
      v: { x: 0, y: 0 },
      dmg: 999,
      ownerId: 1,
      ownerSide: 'player',
    });
    resolveShellCollisions(w);
    const rock = w.walls[0]!;
    expect(rock.active).toBe(true);
    // Shell should be deactivated.
    expect(w.shells.filter((s) => s.active).length).toBe(0);
  });

  it('PLAYER_DIED fires when the player hp hits zero', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 500, y: 500 }, defaultMeta())!;
    spawnShell(w, {
      p: { x: p.p.x, y: p.p.y + 2 },
      v: { x: 0, y: 0 },
      dmg: 9999,
      ownerId: 999,
      ownerSide: 'enemy',
    });
    w.shells.find((x) => x.active)!.spawnCooldown = 0;
    resolveShellCollisions(w);
    expect(
      w.pending.find((ev) => ev.type === 'PLAYER_DIED'),
    ).toBeTruthy();
    expect(p.active).toBe(false);
  });

  // Reference used in tests above; ensures player stats weren't broken.
  it('player tank uses expected base damage', () => {
    expect(PLAYER_STATS.shellDamage).toBeGreaterThan(0);
  });
});
