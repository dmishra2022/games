// Three fixed arenas with distinct layouts.

import { ARENA_H, ARENA_W } from './constants';
import { createWall } from './walls';
import type { Vec2, Wall } from './types';

export type ArenaBuild = {
  walls: Wall[];
  playerSpawn: Vec2;
  enemySpawns: Vec2[];
};

function border(): Wall[] {
  const t = 24;
  return [
    createWall(-t, -t, ARENA_W + t, 0, 'rock'),
    createWall(-t, ARENA_H, ARENA_W + t, ARENA_H + t, 'rock'),
    createWall(-t, 0, 0, ARENA_H, 'rock'),
    createWall(ARENA_W, 0, ARENA_W + t, ARENA_H, 'rock'),
  ];
}

function arenaOpen(): ArenaBuild {
  // Scattered rocks + some destructible crates.
  const walls = [
    ...border(),
    createWall(220, 180, 300, 260, 'rock'),
    createWall(880, 180, 960, 260, 'rock'),
    createWall(220, 540, 300, 620, 'rock'),
    createWall(880, 540, 960, 620, 'rock'),
    createWall(540, 360, 660, 440, 'rock'),

    createWall(400, 250, 460, 310, 'crate'),
    createWall(740, 250, 800, 310, 'crate'),
    createWall(400, 490, 460, 550, 'crate'),
    createWall(740, 490, 800, 550, 'crate'),
    createWall(300, 400, 340, 440, 'crate'),
    createWall(860, 400, 900, 440, 'crate'),
  ];
  return {
    walls,
    playerSpawn: { x: 600, y: 700 },
    enemySpawns: [
      { x: 180, y: 120 },
      { x: 1020, y: 120 },
      { x: 600, y: 100 },
      { x: 300, y: 300 },
      { x: 900, y: 300 },
      { x: 600, y: 200 },
    ],
  };
}

function arenaMaze(): ArenaBuild {
  const walls = [
    ...border(),
    // Vertical corridors.
    createWall(200, 100, 240, 500, 'rock'),
    createWall(400, 300, 440, 700, 'rock'),
    createWall(600, 100, 640, 500, 'rock'),
    createWall(760, 300, 800, 700, 'rock'),
    createWall(960, 100, 1000, 500, 'rock'),
    // Scattered crates for destructible cover.
    createWall(300, 600, 360, 660, 'crate'),
    createWall(500, 180, 560, 240, 'crate'),
    createWall(700, 600, 760, 660, 'crate'),
    createWall(900, 580, 960, 640, 'crate'),
    createWall(100, 500, 160, 560, 'crate'),
    createWall(1040, 500, 1100, 560, 'crate'),
  ];
  return {
    walls,
    playerSpawn: { x: 600, y: 720 },
    enemySpawns: [
      { x: 120, y: 120 },
      { x: 1080, y: 120 },
      { x: 320, y: 200 },
      { x: 880, y: 200 },
      { x: 500, y: 120 },
      { x: 700, y: 120 },
    ],
  };
}

function arenaCorridors(): ArenaBuild {
  // Two horizontal bands with a central killzone.
  const walls = [
    ...border(),
    createWall(0, 240, 420, 280, 'rock'),
    createWall(780, 240, 1200, 280, 'rock'),
    createWall(0, 520, 420, 560, 'rock'),
    createWall(780, 520, 1200, 560, 'rock'),
    // Crates in the middle "killzone".
    createWall(540, 360, 600, 420, 'crate'),
    createWall(600, 360, 660, 420, 'crate'),
    createWall(540, 420, 600, 480, 'crate'),
    createWall(600, 420, 660, 480, 'crate'),
    // Left + right cover.
    createWall(100, 340, 160, 460, 'crate'),
    createWall(1040, 340, 1100, 460, 'crate'),
  ];
  return {
    walls,
    playerSpawn: { x: 600, y: 700 },
    enemySpawns: [
      { x: 120, y: 120 },
      { x: 1080, y: 120 },
      { x: 320, y: 120 },
      { x: 880, y: 120 },
      { x: 600, y: 80 },
      { x: 600, y: 160 },
    ],
  };
}

export function buildArena(index: number): ArenaBuild {
  switch (index % 3) {
    case 0:
      return arenaOpen();
    case 1:
      return arenaMaze();
    default:
      return arenaCorridors();
  }
}
