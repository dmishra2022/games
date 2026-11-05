// Camera that follows the player, clamped to the arena bounds.

import type { Vec2, World } from '../engine/types';

export type Camera = { x: number; y: number };

export function createCamera(start: Vec2 = { x: 0, y: 0 }): Camera {
  return { x: start.x, y: start.y };
}

export function updateCamera(
  cam: Camera,
  world: World,
  vpW: number,
  vpH: number,
  dt: number,
): void {
  const player = world.tanks[0];
  if (!player) return;
  // Soft follow with velocity lead.
  const leadX = player.v.x * 0.12;
  const leadY = player.v.y * 0.12;
  const tx = player.p.x + leadX;
  const ty = player.p.y + leadY;
  const k = 1 - Math.exp(-dt * 6);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
  // Clamp so the camera never shows outside the arena.
  const halfW = vpW / 2;
  const halfH = vpH / 2;
  cam.x = Math.max(halfW, Math.min(world.arenaW - halfW, cam.x));
  cam.y = Math.max(halfH, Math.min(world.arenaH - halfH, cam.y));
}
