// Enemy spawn + seek. SPEC-001 sections 3.2 and 6.2.

import { ENEMY_TUNING, WORLD } from './constants';
import type { Enemy, EnemyKind, Vec2, World } from './types';
import { findInactive } from './world';

/** Spawn an enemy at a given position. Scales stats by run time. */
export function spawnEnemy(world: World, kind: EnemyKind, p: Vec2): Enemy | null {
  const slot = findInactive(world.enemies);
  if (!slot) return null;
  const t = world.time;
  const base = ENEMY_TUNING[kind];
  const hpScale = 1 + WORLD.enemyHpScalePerMin * (t / 60);
  const speedScale = 1 + WORLD.enemySpeedScalePerMin * (t / 60);
  slot.active = true;
  slot.id = world.nextEnemyId++;
  slot.kind = kind;
  slot.p = { x: p.x, y: p.y };
  slot.v = { x: 0, y: 0 };
  slot.r = base.r;
  slot.hp = base.hp * hpScale;
  slot.dmg = base.dmg;
  slot.speed = base.speed * speedScale;
  slot.xpReward = base.xpReward;
  slot.lastContactAt = -Infinity;
  slot.hitFlash = 0;
  return slot;
}

export function moveEnemies(world: World, dt: number): void {
  const { player } = world;
  for (const e of world.enemies) {
    if (!e.active) continue;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
    const dx = player.p.x - e.p.x;
    const dy = player.p.y - e.p.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      e.v.x = 0;
      e.v.y = 0;
      continue;
    }
    const inv = 1 / len;
    e.v.x = dx * inv * e.speed;
    e.v.y = dy * inv * e.speed;
    e.p.x += e.v.x * dt;
    e.p.y += e.v.y * dt;
  }
}
