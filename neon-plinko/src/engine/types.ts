// Core engine types. See game/docs/SPEC-001-core-engine.md section 4.1.

export type Vec2 = { x: number; y: number };

export type Ball = {
  p: Vec2;
  v: Vec2;
  r: number;
  active: boolean;
};

export type Peg = {
  id: number;
  p: Vec2;
  r: number;
};

export type Bucket = {
  index: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  multiplier: number;
};

export type SimConfig = {
  boardWidth: number;
  boardHeight: number;
  gravity: number;
  wallRestitution: number;
  pegRestitution: number;
  airFriction: number;
  maxBallSpeed: number;
  settleSpeed: number;
  ballRadius: number;
  spawnY: number;
  // Max absolute horizontal velocity added at spawn, in u/s. Breaks
  // degenerate vertical equilibria (ball balanced on top of a peg).
  spawnJitterVx: number;
};

export type EngineEvent =
  | { type: 'PEG_HIT'; pegId: number; comboAfter: number }
  | {
      type: 'BUCKET_LAND';
      bucketIndex: number;
      multiplier: number;
      runScore: number;
    }
  | { type: 'DROP_STARTED'; spawnX: number }
  | { type: 'DROP_SETTLED' };

export type SimState = {
  ball: Ball;
  pegs: Peg[];
  buckets: Bucket[];
  hitPegsThisDrop: Set<number>;
  runScore: number;
  combo: number;
  // Milliseconds since last peg hit; drives combo decay.
  comboTimerMs: number;
  config: SimConfig;
  // When true, physics is active and a drop is in flight.
  dropActive: boolean;
  // Last aim X requested by input (clamped). Used by Space key spawn.
  aimX: number;
};
