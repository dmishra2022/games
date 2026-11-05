// Shell lifecycle and explosion resolution. SPEC-001 5.6-5.7.

import { CREDITS, SHELL } from './constants';
import { pointInAabb } from './math';
import type { Shell, TankSide, Vec2, World } from './types';
import { damageWall } from './walls';

export type SpawnShellArgs = {
  p: Vec2;
  v: Vec2;
  dmg: number;
  ownerId: number;
  ownerSide: TankSide;
};

function findInactive<T extends { active: boolean }>(pool: T[]): T | null {
  for (const s of pool) if (!s.active) return s;
  return null;
}

export function createEmptyShellPool(size: number): Shell[] {
  return Array.from({ length: size }, () => ({
    active: false,
    p: { x: 0, y: 0 },
    v: { x: 0, y: 0 },
    r: SHELL.r,
    dmg: 0,
    ownerId: -1,
    ownerSide: 'enemy',
    life: 0,
    spawnCooldown: 0,
  }));
}

export function spawnShell(world: World, a: SpawnShellArgs): void {
  const slot = findInactive(world.shells);
  if (!slot) return;
  slot.active = true;
  slot.p = { x: a.p.x, y: a.p.y };
  slot.v = { x: a.v.x, y: a.v.y };
  slot.r = SHELL.r;
  slot.dmg = a.dmg;
  slot.ownerId = a.ownerId;
  slot.ownerSide = a.ownerSide;
  slot.life = SHELL.life;
  slot.spawnCooldown = SHELL.ownerImmunity;
}

export function integrateShells(world: World, sdt: number): void {
  for (const s of world.shells) {
    if (!s.active) continue;
    s.p.x += s.v.x * sdt;
    s.p.y += s.v.y * sdt;
    s.life -= sdt;
    s.spawnCooldown = Math.max(0, s.spawnCooldown - sdt);
    if (s.life <= 0) s.active = false;
  }
}

/**
 * Detonate a shell at its current position. Deals explosion damage
 * with linear falloff to every tank within radius (except the owner
 * during spawn cooldown).
 */
function detonate(world: World, shell: Shell): void {
  const radius = SHELL.explosionRadius;
  world.pending.push({
    type: 'EXPLOSION',
    p: { x: shell.p.x, y: shell.p.y },
    radius,
    ownerSide: shell.ownerSide,
  });
  for (const t of world.tanks) {
    if (!t.active) continue;
    if (t.id === shell.ownerId && shell.spawnCooldown > 0) continue;
    const dx = t.p.x - shell.p.x;
    const dy = t.p.y - shell.p.y;
    const d = Math.hypot(dx, dy);
    if (d > radius + t.r) continue;
    const effD = Math.max(0, d - t.r);
    const falloff = 1 - Math.min(1, effD / radius);
    let dmg = shell.dmg * falloff;
    if (dmg <= 0) continue;
    if (t.side === 'player') dmg *= t.armorMul;
    t.hp -= dmg;
    const events = world.pending;
    events.push({
      type: 'TANK_HIT',
      id: t.id,
      side: t.side,
      dmg,
      hp: Math.max(0, t.hp),
    });
    if (t.hp <= 0) {
      t.active = false;
      events.push({
        type: 'TANK_DESTROYED',
        id: t.id,
        kind: t.kind,
        side: t.side,
      });
      if (t.side === 'enemy' && shell.ownerSide === 'player') {
        world.playerKills += 1;
      }
      if (t.side === 'player') {
        events.push({ type: 'PLAYER_DIED' });
      }
    }
  }
  shell.active = false;
}

export function resolveShellCollisions(world: World): void {
  for (const s of world.shells) {
    if (!s.active) continue;
    // Walls (point-in-AABB — shells are tiny and fast).
    let hitWall = false;
    for (const w of world.walls) {
      if (!w.active) continue;
      if (!pointInAabb(s.p.x, s.p.y, w)) continue;
      // Damage destructible walls; indestructible absorbs the shell.
      if (w.kind !== 'rock') {
        const hadHp = w.hp;
        damageWall(w, s.dmg);
        if (!w.active && hadHp > 0) {
          world.pending.push({
            type: 'WALL_DESTROYED',
            x0: w.x0,
            y0: w.y0,
            x1: w.x1,
            y1: w.y1,
          });
        }
      }
      detonate(world, s);
      hitWall = true;
      break;
    }
    if (hitWall) continue;

    // Tanks (ignore owner during spawn cooldown).
    for (const t of world.tanks) {
      if (!t.active) continue;
      if (t.id === s.ownerId && s.spawnCooldown > 0) continue;
      const dx = t.p.x - s.p.x;
      const dy = t.p.y - s.p.y;
      const rr = t.r + s.r;
      if (dx * dx + dy * dy <= rr * rr) {
        detonate(world, s);
        break;
      }
    }
  }
}

export { CREDITS };
