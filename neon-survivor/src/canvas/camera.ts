// Smooth camera that follows the player with slight lead based on
// velocity. Rendering uses canvas transform; the camera only stores
// world-space position.

import type { Player } from '../engine/types';

export type Camera = { x: number; y: number };

export function createCamera(): Camera {
  return { x: 0, y: 0 };
}

export function updateCamera(cam: Camera, player: Player, dt: number): void {
  // Target: a little ahead of the player in the direction of motion.
  const leadX = player.v.x * 0.15;
  const leadY = player.v.y * 0.15;
  const tx = player.p.x + leadX;
  const ty = player.p.y + leadY;
  // Critically-damped-ish follow (exponential smoothing).
  const k = 1 - Math.exp(-dt * 6);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
}
