// Tuning. See SPEC-001 section 4.

import type { EnemyKind } from './types';

export const ARENA_W = 1200;
export const ARENA_H = 800;

export const WAVES_PER_ARENA = 5;
export const ARENA_COUNT = 3;

export const PLAYER_STATS = {
  r: 16,
  hp: 100,
  hullTurnRate: 2.2,
  turretTurnRate: 3.2,
  driveSpeed: 90,
  reverseSpeed: 55,
  reloadTime: 1.2,
  shellDamage: 30,
  shellSpeed: 360,
};

type EnemyStats = {
  r: number;
  hp: number;
  hullTurnRate: number;
  turretTurnRate: number;
  driveSpeed: number;
  reverseSpeed: number;
  reloadTime: number;
  shellDamage: number;
  shellSpeed: number;
  fireAimDeg: number;
};

export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  grunt: {
    r: 16,
    hp: 60,
    hullTurnRate: 1.8,
    turretTurnRate: 2.4,
    driveSpeed: 75,
    reverseSpeed: 45,
    reloadTime: 1.8,
    shellDamage: 18,
    shellSpeed: 320,
    fireAimDeg: 8,
  },
  sniper: {
    r: 15,
    hp: 45,
    hullTurnRate: 1.5,
    turretTurnRate: 1.8,
    driveSpeed: 55,
    reverseSpeed: 35,
    reloadTime: 3.2,
    shellDamage: 32,
    shellSpeed: 460,
    fireAimDeg: 4,
  },
  flanker: {
    r: 13,
    hp: 35,
    hullTurnRate: 3.0,
    turretTurnRate: 3.2,
    driveSpeed: 130,
    reverseSpeed: 90,
    reloadTime: 1.1,
    shellDamage: 12,
    shellSpeed: 300,
    fireAimDeg: 12,
  },
  heavy: {
    r: 22,
    hp: 180,
    hullTurnRate: 1.2,
    turretTurnRate: 1.6,
    driveSpeed: 60,
    reverseSpeed: 35,
    reloadTime: 2.4,
    shellDamage: 36,
    shellSpeed: 340,
    fireAimDeg: 6,
  },
};

export const SHELL = {
  r: 3,
  life: 1.8,
  ownerImmunity: 0.08,
  explosionRadius: 24,
};

export const MAX = {
  tanks: 16,
  shells: 48,
  walls: 64,
};

export const CREDITS = {
  kill: {
    grunt: 3,
    flanker: 3,
    sniper: 5,
    heavy: 10,
  } as Record<EnemyKind, number>,
  waveClearBase: 15,
  waveClearPerWave: 5,
  arenaClear: 75,
  victory: 250,
};

export const WAVE_CLEARED_DELAY = 2.0; // seconds
