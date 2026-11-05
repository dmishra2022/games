// Shared engine types. See SPEC-001 section 3.

export type Vec2 = { x: number; y: number };

export type EnemyKind = 'grunt' | 'fast' | 'tank';

export type Player = {
  p: Vec2;
  v: Vec2;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  xp: number;
  level: number;
  pickupRadius: number;
  damageMultiplier: number;
  fireRateMultiplier: number;
  projectileCount: number;
  xpMultiplier: number;
  hpRegenPerSec: number;
  bulletPierce: number;
  // Seconds (world time) until which the player is invulnerable.
  invulnUntil: number;
  alive: boolean;
};

export type Enemy = {
  active: boolean;
  id: number;
  kind: EnemyKind;
  p: Vec2;
  v: Vec2;
  r: number;
  hp: number;
  dmg: number;
  speed: number;
  xpReward: number;
  lastContactAt: number;
  // Short flash timer used by the renderer; decays toward 0 each frame.
  hitFlash: number;
};

export type Bullet = {
  active: boolean;
  p: Vec2;
  v: Vec2;
  r: number;
  dmg: number;
  pierce: number;
  life: number;
  hitSet: Set<number>;
};

export type Orb = {
  active: boolean;
  p: Vec2;
  v: Vec2;
  value: number;
  attracting: boolean;
};

export type WeaponKind = 'blaster' | 'orbital';

export type Weapon = {
  kind: WeaponKind;
  level: number;     // 1-based, 0 means locked
  cooldown: number;  // seconds until next fire
};

export type MetaState = {
  hp: number;
  damage: number;
  speed: number;
  xpGain: number;
};

export type World = {
  time: number;         // seconds since run start
  player: Player;
  enemies: Enemy[];     // object pool, length == MAX.enemies
  bullets: Bullet[];    // object pool, length == MAX.bullets
  orbs: Orb[];          // object pool, length == MAX.orbs
  weapons: Weapon[];
  spawner: {
    accumulator: number; // seconds waited since last spawn
  };
  input: { ax: number; ay: number }; // normalized movement axis
  nextEnemyId: number;
  // Events buffered by sub-steps; drained each outer frame.
  pendingEvents: EngineEvent[];
  kills: number;
};

export type EngineEvent =
  | { type: 'PLAYER_HURT'; damage: number; hp: number }
  | { type: 'ENEMY_KILLED'; kind: EnemyKind; xpAwarded: number }
  | { type: 'ORB_COLLECTED'; xpGained: number }
  | { type: 'LEVEL_UP'; newLevel: number }
  | { type: 'PLAYER_DIED'; timeSurvived: number; kills: number; level: number };
