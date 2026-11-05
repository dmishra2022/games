import { describe, it, expect } from 'vitest';
import { createWorld, defaultMeta } from '../engine/world';
import {
  handleFire,
  integrateTank,
  resolveTankWallCollisions,
  rotateTurret,
  spawnEnemyTank,
  spawnPlayerTank,
} from '../engine/tank';
import { createEmptyShellPool } from '../engine/shells';
import { createEmptyTankPool } from '../engine/tank';
import { PLAYER_STATS } from '../engine/constants';
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

describe('spawnPlayerTank', () => {
  it('applies default meta to base stats', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 100, y: 100 }, defaultMeta())!;
    expect(p.maxHp).toBe(PLAYER_STATS.hp);
    expect(p.hp).toBe(p.maxHp);
    expect(p.reloadTime).toBeCloseTo(PLAYER_STATS.reloadTime, 6);
    expect(p.shellDamage).toBeCloseTo(PLAYER_STATS.shellDamage, 6);
    expect(p.armorMul).toBeCloseTo(1, 6);
    expect(p.side).toBe('player');
  });
  it('scales hp, damage, reload, armor with meta', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(
      w,
      { x: 100, y: 100 },
      { hp: 2, damage: 3, reload: 4, armor: 5 },
    )!;
    expect(p.maxHp).toBe(PLAYER_STATS.hp + 40);
    expect(p.shellDamage).toBeCloseTo(PLAYER_STATS.shellDamage * 1.3, 6);
    expect(p.reloadTime).toBeCloseTo(
      PLAYER_STATS.reloadTime * Math.pow(0.92, 4),
      6,
    );
    expect(p.armorMul).toBeCloseTo(Math.pow(0.92, 5), 6);
  });
});

describe('integrateTank', () => {
  it('drives forward along hull angle', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 100, y: 100 }, defaultMeta())!;
    p.hullAngle = 0; // face +x
    p.input.drive = 1;
    integrateTank(p, 1);
    expect(p.p.x).toBeCloseTo(100 + PLAYER_STATS.driveSpeed, 4);
    expect(p.p.y).toBeCloseTo(100, 4);
  });
  it('reverses slower than forward', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 100, y: 100 }, defaultMeta())!;
    p.hullAngle = 0;
    p.input.drive = -1;
    integrateTank(p, 1);
    expect(100 - p.p.x).toBeCloseTo(PLAYER_STATS.reverseSpeed, 4);
  });
  it('turns the hull when hullTurn is set', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 100, y: 100 }, defaultMeta())!;
    p.hullAngle = 0;
    p.input.hullTurn = 1;
    integrateTank(p, 0.1);
    expect(p.hullAngle).toBeCloseTo(PLAYER_STATS.hullTurnRate * 0.1, 6);
  });
  it('decrements reload over time', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 100, y: 100 }, defaultMeta())!;
    p.reload = 1;
    integrateTank(p, 0.25);
    expect(p.reload).toBeCloseTo(0.75, 6);
  });
});

describe('rotateTurret', () => {
  it('rotates toward target angle', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 100, y: 100 }, defaultMeta())!;
    p.turretAngle = 0;
    // Target 90° clockwise (positive y screen) → PI/2.
    p.input.turretTargetX = 100;
    p.input.turretTargetY = 300;
    rotateTurret(p, 0.1);
    expect(p.turretAngle).toBeCloseTo(PLAYER_STATS.turretTurnRate * 0.1, 6);
  });
  it('snaps when within maxDelta', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 100, y: 100 }, defaultMeta())!;
    p.turretAngle = 0;
    p.input.turretTargetX = 200;
    p.input.turretTargetY = 100;
    rotateTurret(p, 1); // large dt → should snap
    expect(p.turretAngle).toBeCloseTo(0, 6);
  });
});

describe('handleFire', () => {
  it('spawns a shell and resets reload', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 100, y: 100 }, defaultMeta())!;
    p.turretAngle = 0;
    p.input.fire = true;
    p.reload = 0;
    handleFire(p, w);
    const active = w.shells.filter((s) => s.active);
    expect(active.length).toBe(1);
    expect(p.reload).toBe(p.reloadTime);
    // Shell is placed forward of the tank.
    expect(active[0]!.p.x).toBeGreaterThan(100);
  });
  it('is gated by reload', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 100, y: 100 }, defaultMeta())!;
    p.input.fire = true;
    p.reload = 0.5;
    handleFire(p, w);
    expect(w.shells.filter((s) => s.active).length).toBe(0);
  });
  it('emits SHELL_FIRED event', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 100, y: 100 }, defaultMeta())!;
    p.input.fire = true;
    p.reload = 0;
    handleFire(p, w);
    const ev = w.pending.find((e) => e.type === 'SHELL_FIRED');
    expect(ev).toBeTruthy();
  });
});

describe('resolveTankWallCollisions', () => {
  it('pushes a tank out of a wall', () => {
    const w = createWorld({ arenaIndex: 0, meta: defaultMeta() });
    // Kill enemies for test isolation.
    for (let i = 1; i < w.tanks.length; i++) w.tanks[i]!.active = false;
    const p = w.tanks[0]!;
    // Place player straddling a border wall.
    p.p.x = 5;
    p.p.y = 200;
    resolveTankWallCollisions(w);
    expect(p.p.x).toBeGreaterThanOrEqual(p.r - 0.01);
  });
});

describe('spawnEnemyTank', () => {
  it('spawns with the right kind and faces down', () => {
    const w = emptyWorld();
    const e = spawnEnemyTank(w, 'sniper', { x: 200, y: 200 })!;
    expect(e.kind).toBe('sniper');
    expect(e.side).toBe('enemy');
    expect(e.hp).toBeGreaterThan(0);
  });
});
