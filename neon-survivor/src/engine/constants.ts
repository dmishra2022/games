// SPEC-001 section 4.

export const WORLD = {
  playerRadius: 10,
  playerBaseMaxHp: 100,
  playerBaseSpeed: 180,
  playerBasePickupRadius: 40,
  bulletRadius: 4,
  bulletLife: 1.2,
  bulletSpeed: 420,
  bulletBaseDamage: 10,
  blasterBaseInterval: 0.55,
  orbitalBaseInterval: 2.5,
  contactTickInterval: 0.5,
  orbPickupSpeed: 280,
  spawnIntervalStart: 1.6,
  spawnIntervalFloor: 0.25,
  spawnIntervalDecayPerMin: 0.35,
  enemyHpScalePerMin: 0.35,
  enemySpeedScalePerMin: 0.12,
  // World-space spawn radius around the player, outside typical
  // viewports but close enough to pressure the player.
  spawnRadius: 360,
} as const;

export const MAX = {
  enemies: 160,
  bullets: 256,
  orbs: 256,
} as const;

export const ENEMY_TUNING: Record<
  'grunt' | 'fast' | 'tank',
  {
    r: number;
    hp: number;
    dmg: number;
    speed: number;
    xpReward: number;
  }
> = {
  grunt: { r: 10, hp: 10, dmg: 8, speed: 70, xpReward: 2 },
  fast: { r: 8, hp: 6, dmg: 6, speed: 120, xpReward: 2 },
  tank: { r: 16, hp: 40, dmg: 14, speed: 50, xpReward: 6 },
};

/**
 * Weighted enemy kind distribution over time. Returns cumulative
 * thresholds for [grunt, fast, tank] summing to 1.
 */
export function enemyKindWeights(
  t: number,
): { grunt: number; fast: number; tank: number } {
  if (t < 60) return { grunt: 0.9, fast: 0.1, tank: 0 };
  if (t < 180) return { grunt: 0.6, fast: 0.25, tank: 0.15 };
  return { grunt: 0.4, fast: 0.3, tank: 0.3 };
}

/** XP needed to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return 10 + 8 * level + 2 * level * level;
}
