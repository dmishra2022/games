// Wave definitions and spawn helpers. SPEC-000 section 1 + SPEC-001 5.8.

import type { EnemyKind, World } from './types';
import { WAVES_PER_ARENA } from './constants';
import { spawnEnemyTank } from './tank';
import { buildArena } from './arenas';

/**
 * Returns the enemy kinds that should be present in the given 1-indexed
 * wave (1..5) for an arena. The schedule is identical across arenas in
 * v1; SPEC-002 is where we expand per-arena variation if desired.
 */
export function waveDefForArena(
  _arenaIndex: number,
  wave: number,
): EnemyKind[] {
  switch (wave) {
    case 1:
      return ['grunt', 'grunt'];
    case 2:
      return ['grunt', 'grunt', 'grunt'];
    case 3:
      return ['grunt', 'grunt', 'sniper'];
    case 4:
      return ['grunt', 'flanker', 'flanker'];
    case 5:
      return ['grunt', 'grunt', 'grunt', 'grunt', 'sniper', 'heavy'];
    default:
      return ['grunt'];
  }
}

export function spawnWave(world: World, wave: number): void {
  const build = buildArena(world.arenaIndex);
  const kinds = waveDefForArena(world.arenaIndex, wave);
  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[i]!;
    const p = build.enemySpawns[i % build.enemySpawns.length]!;
    spawnEnemyTank(world, kind, p);
  }
}

export { WAVES_PER_ARENA };
