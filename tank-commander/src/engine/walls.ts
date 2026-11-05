// Wall helpers. SPEC-001 section 8.6.

import type { Wall, WallKind } from './types';

export function createWall(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  kind: WallKind,
): Wall {
  return {
    active: true,
    kind,
    x0,
    y0,
    x1,
    y1,
    hp: kind === 'rock' ? Infinity : 60,
  };
}

export function damageWall(wall: Wall, dmg: number): void {
  if (wall.kind === 'rock') return;
  wall.hp -= dmg;
  if (wall.hp <= 0) wall.active = false;
}
