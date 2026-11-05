// Weapon systems. SPEC-001 section 6.3.

import { spawnBullet } from './bullets';
import { WORLD } from './constants';
import type { Enemy, World } from './types';

function findNearestEnemy(world: World): Enemy | null {
  let best: Enemy | null = null;
  let bestD2 = Infinity;
  const { player } = world;
  for (const e of world.enemies) {
    if (!e.active) continue;
    const dx = e.p.x - player.p.x;
    const dy = e.p.y - player.p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = e;
    }
  }
  return best;
}

export function updateWeapons(world: World, dt: number): void {
  if (!world.player.alive) return;
  for (const w of world.weapons) {
    w.cooldown -= dt;
    if (w.cooldown > 0) continue;
    switch (w.kind) {
      case 'blaster':
        fireBlaster(world);
        w.cooldown =
          WORLD.blasterBaseInterval / Math.max(0.01, world.player.fireRateMultiplier);
        break;
      case 'orbital':
        // Orbital is wired as a damaging aura in SPEC-002. For
        // Phase 1 it's a no-op: cooldown is set so it doesn't spin.
        w.cooldown = WORLD.orbitalBaseInterval;
        break;
    }
  }
}

function fireBlaster(world: World): void {
  const target = findNearestEnemy(world);
  if (!target) return;
  const { player } = world;
  const dx = target.p.x - player.p.x;
  const dy = target.p.y - player.p.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const n = Math.max(1, Math.floor(player.projectileCount));
  const spread = (8 * Math.PI) / 180; // ±8° total cone
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5; // -0.5..0.5
    const angle = t * spread;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const vx = ux * cos - uy * sin;
    const vy = ux * sin + uy * cos;
    spawnBullet(world, {
      p: { x: player.p.x, y: player.p.y },
      dir: { x: vx, y: vy },
      dmg: WORLD.bulletBaseDamage * player.damageMultiplier,
      pierce: player.bulletPierce,
    });
  }
}
