// Enemy spawner. SPEC-001 section 7.

import {
  WORLD,
  enemyKindWeights,
} from './constants';
import { spawnEnemy } from './enemies';
import type { EnemyKind, World } from './types';

function pickKind(t: number, rnd: number): EnemyKind {
  const w = enemyKindWeights(t);
  if (rnd < w.grunt) return 'grunt';
  if (rnd < w.grunt + w.fast) return 'fast';
  return 'tank';
}

function currentInterval(t: number): number {
  const v =
    WORLD.spawnIntervalStart - WORLD.spawnIntervalDecayPerMin * (t / 60);
  return Math.max(WORLD.spawnIntervalFloor, v);
}

export function updateSpawner(world: World, dt: number): void {
  if (!world.player.alive) return;
  world.spawner.accumulator += dt;
  const interval = currentInterval(world.time);
  while (world.spawner.accumulator >= interval) {
    world.spawner.accumulator -= interval;
    const kind = pickKind(world.time, Math.random());
    const angle = Math.random() * Math.PI * 2;
    const r = WORLD.spawnRadius;
    const p = {
      x: world.player.p.x + Math.cos(angle) * r,
      y: world.player.p.y + Math.sin(angle) * r,
    };
    spawnEnemy(world, kind, p);
  }
}

// Exposed for tests.
export const _internal = { pickKind, currentInterval };
