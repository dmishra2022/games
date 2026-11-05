// Orchestrates one frame of simulation. SPEC-001 section 5.

import { WAVE_CLEARED_DELAY } from './constants';
import { updateAi } from './ai';
import { integrateShells, resolveShellCollisions } from './shells';
import {
  handleFire,
  integrateTank,
  resolveTankTankCollisions,
  resolveTankWallCollisions,
  rotateTurret,
} from './tank';
import type { EngineEvent, TankInput, World } from './types';
import { spawnWave } from './waves';

const MAX_DT = 1 / 30;
const SUB_STEP_DT = 1 / 120;

/** Merge a partial input into the player's current frame input. */
export function applyPlayerInput(
  world: World,
  input: Partial<TankInput>,
): void {
  const p = world.tanks[0];
  if (!p || !p.active) return;
  if (input.drive !== undefined) p.input.drive = input.drive;
  if (input.hullTurn !== undefined) p.input.hullTurn = input.hullTurn;
  if (input.turretTargetX !== undefined)
    p.input.turretTargetX = input.turretTargetX;
  if (input.turretTargetY !== undefined)
    p.input.turretTargetY = input.turretTargetY;
  if (input.fire !== undefined) p.input.fire = input.fire;
}

export function stepWorld(world: World, dt: number): EngineEvent[] {
  let remaining = Math.min(dt, MAX_DT);
  while (remaining > 1e-6) {
    const sdt = Math.min(remaining, SUB_STEP_DT);
    stepOnce(world, sdt);
    remaining -= sdt;
  }
  const out = world.pending;
  world.pending = [];
  return out;
}

function stepOnce(world: World, sdt: number): void {
  // Compute AI inputs for each enemy tank before integration.
  for (const t of world.tanks) {
    if (!t.active) continue;
    if (t.side === 'enemy') updateAi(t, world, sdt);
  }
  // Integrate hull.
  for (const t of world.tanks) {
    if (!t.active) continue;
    integrateTank(t, sdt);
  }
  resolveTankWallCollisions(world);
  resolveTankTankCollisions(world);
  // Turret + fire.
  for (const t of world.tanks) {
    if (!t.active) continue;
    rotateTurret(t, sdt);
    handleFire(t, world);
  }
  // Shells.
  integrateShells(world, sdt);
  resolveShellCollisions(world);
  // Wave progression.
  updateWaveState(world, sdt);

  world.time += sdt;
}

function updateWaveState(world: World, sdt: number): void {
  void sdt;
  // Any enemy left?
  let enemiesAlive = false;
  for (const t of world.tanks) {
    if (t.active && t.side === 'enemy') {
      enemiesAlive = true;
      break;
    }
  }
  if (!enemiesAlive && world.waveClearedAt === null) {
    world.waveClearedAt = world.time;
    world.pending.push({ type: 'WAVE_CLEARED', wave: world.wave });
    return;
  }
  if (world.waveClearedAt === null) return;
  if (world.time - world.waveClearedAt < WAVE_CLEARED_DELAY) return;

  // Time to advance.
  world.waveClearedAt = null;
  if (world.wave < world.wavesPerArena) {
    world.wave += 1;
    spawnWave(world, world.wave);
  } else {
    world.pending.push({
      type: 'ARENA_CLEARED',
      arenaIndex: world.arenaIndex,
    });
  }
}
