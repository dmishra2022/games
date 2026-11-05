// Tank Commander engine types. See SPEC-001 section 3.

export type Vec2 = { x: number; y: number };
export type Aabb = { x0: number; y0: number; x1: number; y1: number };

export type TankSide = 'player' | 'enemy';
export type EnemyKind = 'grunt' | 'sniper' | 'flanker' | 'heavy';
export type TankKind = EnemyKind | 'player';
export type WallKind = 'rock' | 'crate';

export type MetaState = {
  hp: number;
  damage: number;
  reload: number;
  armor: number;
};

export type AiMemory = {
  // When the AI last made a high-level decision (seconds).
  lastDecisionAt: number;
  // Current micro-goal position (world space).
  wanderTarget: Vec2;
  // Last accuracy sample for firing gate (radians).
  lastAimDelta: number;
  // Preferred side/time multiplier for flankers.
  flankSign: 1 | -1;
};

export type AiState = 'pursue' | 'strafe' | 'reposition';

export type TankInput = {
  drive: number;        // -1..1
  hullTurn: number;     // -1..1
  turretTargetX: number;
  turretTargetY: number;
  fire: boolean;
};

export type Tank = {
  active: boolean;
  id: number;
  side: TankSide;
  kind: TankKind;
  p: Vec2;
  v: Vec2;
  hullAngle: number;
  turretAngle: number;
  hullTurnRate: number;
  turretTurnRate: number;
  driveSpeed: number;
  reverseSpeed: number;
  r: number;
  hp: number;
  maxHp: number;
  reload: number;
  reloadTime: number;
  shellDamage: number;
  shellSpeed: number;
  armorMul: number;
  aiState: AiState;
  aiMemory: AiMemory;
  input: TankInput;
};

export type Shell = {
  active: boolean;
  p: Vec2;
  v: Vec2;
  r: number;
  dmg: number;
  ownerId: number;
  ownerSide: TankSide;
  life: number;
  spawnCooldown: number;
};

export type Wall = {
  active: boolean;
  kind: WallKind;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  hp: number;
};

export type EngineEvent =
  | { type: 'SHELL_FIRED'; ownerId: number; ownerSide: TankSide; p: Vec2 }
  | {
      type: 'EXPLOSION';
      p: Vec2;
      radius: number;
      ownerSide: TankSide;
    }
  | {
      type: 'TANK_HIT';
      id: number;
      side: TankSide;
      dmg: number;
      hp: number;
    }
  | {
      type: 'TANK_DESTROYED';
      id: number;
      kind: TankKind;
      side: TankSide;
    }
  | {
      type: 'WALL_DESTROYED';
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    }
  | { type: 'WAVE_CLEARED'; wave: number }
  | { type: 'ARENA_CLEARED'; arenaIndex: number }
  | { type: 'PLAYER_DIED' };

export type World = {
  time: number;
  arenaW: number;
  arenaH: number;
  arenaIndex: number;
  tanks: Tank[];
  shells: Shell[];
  walls: Wall[];
  wave: number;
  wavesPerArena: number;
  waveClearedAt: number | null;
  pending: EngineEvent[];
  nextTankId: number;
  playerKills: number;
  waveSpawnQueue: Array<{ kind: EnemyKind; p: Vec2; at: number }>;
};
