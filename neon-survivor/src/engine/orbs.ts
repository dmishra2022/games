// XP orb movement + attraction. SPEC-001 section 6.5.

import { WORLD } from './constants';
import type { Vec2, World } from './types';
import { findInactive } from './world';

export function spawnOrb(world: World, p: Vec2, value: number): void {
  const slot = findInactive(world.orbs);
  if (!slot) return;
  slot.active = true;
  slot.p = { x: p.x, y: p.y };
  slot.v = { x: 0, y: 0 };
  slot.value = value;
  slot.attracting = false;
}

export function moveOrbs(world: World, dt: number): void {
  const { player } = world;
  const pr = player.pickupRadius;
  const pr2 = pr * pr;
  for (const o of world.orbs) {
    if (!o.active) continue;
    const dx = player.p.x - o.p.x;
    const dy = player.p.y - o.p.y;
    const d2 = dx * dx + dy * dy;
    if (!o.attracting && d2 <= pr2) o.attracting = true;
    if (o.attracting) {
      const len = Math.sqrt(d2) || 1;
      const inv = 1 / len;
      o.v.x = dx * inv * WORLD.orbPickupSpeed;
      o.v.y = dy * inv * WORLD.orbPickupSpeed;
      o.p.x += o.v.x * dt;
      o.p.y += o.v.y * dt;
    }
  }
}
