// Bullet lifecycle + spawning. SPEC-001 section 6.4.

import { WORLD } from './constants';
import type { Vec2, World } from './types';
import { findInactive } from './world';

export type SpawnBulletArgs = {
  p: Vec2;
  dir: Vec2;    // unit vector
  dmg: number;
  pierce: number;
};

export function spawnBullet(world: World, args: SpawnBulletArgs): void {
  const slot = findInactive(world.bullets);
  if (!slot) return;
  slot.active = true;
  slot.p = { x: args.p.x, y: args.p.y };
  slot.v = {
    x: args.dir.x * WORLD.bulletSpeed,
    y: args.dir.y * WORLD.bulletSpeed,
  };
  slot.r = WORLD.bulletRadius;
  slot.dmg = args.dmg;
  slot.pierce = args.pierce;
  slot.life = WORLD.bulletLife;
  slot.hitSet.clear();
}

export function moveBullets(world: World, dt: number): void {
  for (const b of world.bullets) {
    if (!b.active) continue;
    b.p.x += b.v.x * dt;
    b.p.y += b.v.y * dt;
    b.life -= dt;
    if (b.life <= 0) {
      b.active = false;
      b.hitSet.clear();
    }
  }
}
