import { MAX, WORLD } from './constants';
import type {
  Bullet,
  Enemy,
  MetaState,
  Orb,
  Player,
  World,
} from './types';

export const defaultMeta = (): MetaState => ({
  hp: 0,
  damage: 0,
  speed: 0,
  xpGain: 0,
});

function emptyEnemy(id: number): Enemy {
  return {
    active: false,
    id,
    kind: 'grunt',
    p: { x: 0, y: 0 },
    v: { x: 0, y: 0 },
    r: 10,
    hp: 0,
    dmg: 0,
    speed: 0,
    xpReward: 0,
    lastContactAt: -Infinity,
    hitFlash: 0,
  };
}

function emptyBullet(): Bullet {
  return {
    active: false,
    p: { x: 0, y: 0 },
    v: { x: 0, y: 0 },
    r: WORLD.bulletRadius,
    dmg: 0,
    pierce: 0,
    life: 0,
    hitSet: new Set<number>(),
  };
}

function emptyOrb(): Orb {
  return {
    active: false,
    p: { x: 0, y: 0 },
    v: { x: 0, y: 0 },
    value: 0,
    attracting: false,
  };
}

/** Pure factory. Builds a fresh World from meta-upgrade levels. */
export function createWorld(meta: MetaState): World {
  const player: Player = {
    p: { x: 0, y: 0 },
    v: { x: 0, y: 0 },
    r: WORLD.playerRadius,
    maxHp: WORLD.playerBaseMaxHp + 20 * meta.hp,
    hp: 0,
    speed: WORLD.playerBaseSpeed * (1 + 0.05 * meta.speed),
    xp: 0,
    level: 1,
    pickupRadius: WORLD.playerBasePickupRadius,
    damageMultiplier: 1 + 0.1 * meta.damage,
    fireRateMultiplier: 1,
    projectileCount: 1,
    xpMultiplier: 1 + 0.1 * meta.xpGain,
    hpRegenPerSec: 0,
    bulletPierce: 0,
    invulnUntil: 0,
    alive: true,
  };
  player.hp = player.maxHp;

  const enemies: Enemy[] = Array.from({ length: MAX.enemies }, (_, i) =>
    emptyEnemy(i),
  );
  const bullets: Bullet[] = Array.from({ length: MAX.bullets }, () =>
    emptyBullet(),
  );
  const orbs: Orb[] = Array.from({ length: MAX.orbs }, () => emptyOrb());

  return {
    time: 0,
    player,
    enemies,
    bullets,
    orbs,
    weapons: [{ kind: 'blaster', level: 1, cooldown: 0 }],
    spawner: { accumulator: 0 },
    input: { ax: 0, ay: 0 },
    nextEnemyId: MAX.enemies, // ids above pool indexes for new spawns
    pendingEvents: [],
    kills: 0,
  };
}

export function findInactive<T extends { active: boolean }>(
  pool: T[],
): T | null {
  for (const item of pool) if (!item.active) return item;
  return null;
}
