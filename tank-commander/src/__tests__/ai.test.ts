import { describe, it, expect } from 'vitest';
import { updateAi } from '../engine/ai';
import { createWall } from '../engine/walls';
import {
  createEmptyTankPool,
  spawnEnemyTank,
  spawnPlayerTank,
} from '../engine/tank';
import { createEmptyShellPool } from '../engine/shells';
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

describe('updateAi', () => {
  it('idles when there is no live player', () => {
    const w = emptyWorld();
    // Occupy slot 0 as the player, spawn enemy into slot 1, then "kill"
    // the player so updateAi hits the no-live-player branch.
    const p = spawnPlayerTank(w, { x: 0, y: 0 }, defaultMeta())!;
    const e = spawnEnemyTank(w, 'grunt', { x: 300, y: 300 })!;
    p.active = false;
    updateAi(e, w, 0.016);
    expect(e.input.drive).toBe(0);
    expect(e.input.fire).toBe(false);
  });

  it('grunt drives toward the player when far', () => {
    const w = emptyWorld();
    spawnPlayerTank(w, { x: 600, y: 600 }, defaultMeta());
    const e = spawnEnemyTank(w, 'grunt', { x: 600, y: 100 })!;
    // Face away from the player, so driveTowards should turn toward the
    // target point which is below us → positive hullTurn.
    e.hullAngle = -Math.PI / 2;
    updateAi(e, w, 0.016);
    expect(e.input.drive).not.toBe(0);
    expect(Math.abs(e.input.hullTurn)).toBeGreaterThan(0);
  });

  it('fires when turret is aligned and LOS is clear', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 600, y: 600 }, defaultMeta())!;
    const e = spawnEnemyTank(w, 'grunt', { x: 600, y: 400 })!;
    // Pre-align turret.
    e.turretAngle = Math.atan2(p.p.y - e.p.y, p.p.x - e.p.x);
    e.reload = 0;
    updateAi(e, w, 0.016);
    expect(e.input.fire).toBe(true);
  });

  it('does not fire when an indestructible wall blocks LOS', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 600, y: 600 }, defaultMeta())!;
    const e = spawnEnemyTank(w, 'grunt', { x: 600, y: 400 })!;
    // Rock wall between enemy (y=400) and player (y=600).
    w.walls = [createWall(400, 480, 800, 520, 'rock')];
    e.turretAngle = Math.atan2(p.p.y - e.p.y, p.p.x - e.p.x);
    e.reload = 0;
    updateAi(e, w, 0.016);
    expect(e.input.fire).toBe(false);
  });

  it('shoots through crates (destructible walls do not block LOS)', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 600, y: 600 }, defaultMeta())!;
    const e = spawnEnemyTank(w, 'grunt', { x: 600, y: 400 })!;
    w.walls = [createWall(400, 480, 800, 520, 'crate')];
    e.turretAngle = Math.atan2(p.p.y - e.p.y, p.p.x - e.p.x);
    e.reload = 0;
    updateAi(e, w, 0.016);
    expect(e.input.fire).toBe(true);
  });

  it('sniper backs away when the player is too close', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 600, y: 600 }, defaultMeta())!;
    const e = spawnEnemyTank(w, 'sniper', { x: 600, y: 500 })!;
    // Point sniper hull straight at player so "drive forward" would mean
    // closing. If it backs away, drive should be <= 0.
    e.hullAngle = Math.atan2(p.p.y - e.p.y, p.p.x - e.p.x);
    updateAi(e, w, 0.016);
    expect(e.input.drive).toBeLessThanOrEqual(0);
  });

  it('respects reload gate', () => {
    const w = emptyWorld();
    const p = spawnPlayerTank(w, { x: 600, y: 600 }, defaultMeta())!;
    const e = spawnEnemyTank(w, 'grunt', { x: 600, y: 400 })!;
    e.turretAngle = Math.atan2(p.p.y - e.p.y, p.p.x - e.p.x);
    e.reload = 1.0;
    updateAi(e, w, 0.016);
    expect(e.input.fire).toBe(false);
  });
});
