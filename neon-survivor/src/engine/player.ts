// Player movement & regeneration. SPEC-001 section 6.1.

import type { World } from './types';

export function movePlayer(world: World, dt: number): void {
  const { player, input } = world;
  if (!player.alive) {
    player.v.x = 0;
    player.v.y = 0;
    return;
  }
  // Normalize axis so diagonals aren't faster.
  const len = Math.hypot(input.ax, input.ay);
  if (len > 1e-6) {
    const inv = 1 / len;
    player.v.x = input.ax * inv * player.speed;
    player.v.y = input.ay * inv * player.speed;
  } else {
    player.v.x = 0;
    player.v.y = 0;
  }
  player.p.x += player.v.x * dt;
  player.p.y += player.v.y * dt;

  if (player.hpRegenPerSec > 0 && player.hp < player.maxHp) {
    player.hp = Math.min(
      player.maxHp,
      player.hp + player.hpRegenPerSec * dt,
    );
  }
}
