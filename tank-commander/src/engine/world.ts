// World factory. SPEC-001 section 8.3.

import { ARENA_H, ARENA_W, MAX, WAVES_PER_ARENA } from './constants';
import { buildArena } from './arenas';
import { createEmptyShellPool } from './shells';
import { createEmptyTankPool, spawnPlayerTank } from './tank';
import { spawnWave } from './waves';
import type { MetaState, World } from './types';

export const defaultMeta = (): MetaState => ({
  hp: 0,
  damage: 0,
  reload: 0,
  armor: 0,
});

export function createWorld(opts: {
  arenaIndex: number;
  meta: MetaState;
}): World {
  const build = buildArena(opts.arenaIndex);
  const world: World = {
    time: 0,
    arenaW: ARENA_W,
    arenaH: ARENA_H,
    arenaIndex: opts.arenaIndex,
    tanks: createEmptyTankPool(MAX.tanks),
    shells: createEmptyShellPool(MAX.shells),
    walls: build.walls,
    wave: 1,
    wavesPerArena: WAVES_PER_ARENA,
    waveClearedAt: null,
    pending: [],
    nextTankId: 0,
    playerKills: 0,
    waveSpawnQueue: [],
  };
  spawnPlayerTank(world, build.playerSpawn, opts.meta);
  spawnWave(world, 1);
  return world;
}

/** For SPEC-002 arena transitions; rebuilds walls + spawns. */
export function loadArena(world: World, arenaIndex: number): void {
  const build = buildArena(arenaIndex);
  world.arenaIndex = arenaIndex;
  world.walls = build.walls;
  // Reset enemies + shells; keep player.
  for (let i = 1; i < world.tanks.length; i++) {
    world.tanks[i]!.active = false;
  }
  for (const s of world.shells) s.active = false;
  const player = world.tanks[0]!;
  player.p = { x: build.playerSpawn.x, y: build.playerSpawn.y };
  world.wave = 1;
  world.waveClearedAt = null;
  spawnWave(world, 1);
}
