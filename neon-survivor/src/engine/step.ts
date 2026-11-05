// Orchestrates one frame of simulation. SPEC-001 sections 6 and 8.

import { moveBullets } from './bullets';
import { WORLD, xpToNextLevel } from './constants';
import { moveEnemies } from './enemies';
import { moveOrbs } from './orbs';
import { movePlayer } from './player';
import { spawnOrb } from './orbs';
import { updateSpawner } from './spawner';
import type { EngineEvent, World } from './types';
import { updateWeapons } from './weapons';

const MAX_DT = 1 / 30;
const SUB_STEP_DT = 1 / 120;

/**
 * Advance the world and return the events produced this frame.
 */
export function stepWorld(world: World, dt: number): EngineEvent[] {
  let remaining = Math.min(dt, MAX_DT);
  while (remaining > 1e-6) {
    const sdt = Math.min(remaining, SUB_STEP_DT);
    stepOnce(world, sdt);
    remaining -= sdt;
  }
  const out = world.pendingEvents;
  world.pendingEvents = [];
  return out;
}

function stepOnce(world: World, dt: number): void {
  if (world.player.alive) {
    world.time += dt;
  }
  movePlayer(world, dt);
  moveEnemies(world, dt);
  moveBullets(world, dt);
  moveOrbs(world, dt);
  updateWeapons(world, dt);
  updateSpawner(world, dt);
  resolveCollisions(world);
}

function resolveCollisions(world: World): void {
  const { player, bullets, enemies, orbs, pendingEvents } = world;

  // Bullet ↔ enemy.
  for (const b of bullets) {
    if (!b.active) continue;
    for (const e of enemies) {
      if (!e.active) continue;
      if (b.hitSet.has(e.id)) continue;
      const dx = b.p.x - e.p.x;
      const dy = b.p.y - e.p.y;
      const sr = b.r + e.r;
      if (dx * dx + dy * dy > sr * sr) continue;
      e.hp -= b.dmg;
      e.hitFlash = 0.08;
      b.hitSet.add(e.id);
      b.pierce -= 1;
      if (e.hp <= 0) {
        e.active = false;
        world.kills += 1;
        pendingEvents.push({
          type: 'ENEMY_KILLED',
          kind: e.kind,
          xpAwarded: e.xpReward,
        });
        spawnOrb(world, e.p, e.xpReward);
      }
      if (b.pierce < 0) {
        b.active = false;
        b.hitSet.clear();
        break;
      }
    }
  }

  // Player ↔ enemy (contact damage).
  if (player.alive) {
    for (const e of enemies) {
      if (!e.active) continue;
      const dx = player.p.x - e.p.x;
      const dy = player.p.y - e.p.y;
      const sr = player.r + e.r;
      if (dx * dx + dy * dy > sr * sr) continue;
      if (player.invulnUntil > world.time) continue;
      if (world.time - e.lastContactAt < WORLD.contactTickInterval) continue;
      player.hp -= e.dmg;
      e.lastContactAt = world.time;
      pendingEvents.push({
        type: 'PLAYER_HURT',
        damage: e.dmg,
        hp: Math.max(0, player.hp),
      });
      if (player.hp <= 0) {
        player.alive = false;
        player.hp = 0;
        pendingEvents.push({
          type: 'PLAYER_DIED',
          timeSurvived: world.time,
          kills: world.kills,
          level: player.level,
        });
        break;
      }
    }
  }

  // Player ↔ orb (pickup).
  for (const o of orbs) {
    if (!o.active) continue;
    const dx = player.p.x - o.p.x;
    const dy = player.p.y - o.p.y;
    const sr = player.r + 2;
    if (dx * dx + dy * dy > sr * sr) continue;
    const gained = o.value * player.xpMultiplier;
    o.active = false;
    player.xp += gained;
    pendingEvents.push({ type: 'ORB_COLLECTED', xpGained: gained });
    // Level up? Allow multiple in one frame.
    while (player.xp >= xpToNextLevel(player.level)) {
      player.xp -= xpToNextLevel(player.level);
      player.level += 1;
      pendingEvents.push({
        type: 'LEVEL_UP',
        newLevel: player.level,
      });
    }
  }
}

export function applyInput(world: World, ax: number, ay: number): void {
  world.input.ax = ax;
  world.input.ay = ay;
}
