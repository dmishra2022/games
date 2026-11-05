// Board-wide constants. See game/docs/SPEC-001-core-engine.md section 2.

import type { SimConfig } from '../engine/types';

export const BOARD_WIDTH = 400;
export const BOARD_HEIGHT = 600;

export const SIM_CONFIG: SimConfig = {
  boardWidth: BOARD_WIDTH,
  boardHeight: BOARD_HEIGHT,
  gravity: 900,
  wallRestitution: 0.6,
  pegRestitution: 0.72,
  // Multiplicative per 1/120s sub-step; keeps bounces lively.
  airFriction: 0.0005,
  maxBallSpeed: 1200,
  settleSpeed: 20,
  ballRadius: 7,
  spawnY: 20,
  spawnJitterVx: 8,
};

// Peg grid layout. See SPEC-001 section 2.3.
export const PEG_LAYOUT = {
  pegRadius: 5,
  rows: 10,
  cols: 9,
  firstPegY: 110,
  rowSpacingY: 40,
  colSpacingX: 42,
  gridCenterX: BOARD_WIDTH / 2,
};

// Bucket layout. See SPEC-001 section 2.4.
export const BUCKET_LAYOUT = {
  count: 7,
  y0: 540,
  y1: BOARD_HEIGHT,
  multipliers: [8, 3, 1, 0.5, 1, 3, 8] as const,
};

// Scoring constants. See SPEC-001 section 2.5.
export const SCORING = {
  basePegPoints: 10,
  // Combo increments by 1 for each consecutive peg hit, decaying
  // if no peg hit occurs within this window.
  comboWindowMs: 500,
};
