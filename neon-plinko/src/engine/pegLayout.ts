// Deterministic peg and bucket generators. SPEC-001 section 2.3-2.4.

import type { Bucket, Peg } from './types';

export type PegLayoutConfig = {
  pegRadius: number;
  rows: number;
  cols: number;
  firstPegY: number;
  rowSpacingY: number;
  colSpacingX: number;
  gridCenterX: number;
};

export type BucketLayoutConfig = {
  count: number;
  boardWidth: number;
  y0: number;
  y1: number;
  multipliers: readonly number[];
};

/**
 * Build the full peg grid. Even rows (0-indexed) use `cols` pegs,
 * odd rows use `cols - 1` pegs and are shifted right by half a column
 * so the grid tiles as a triangular lattice. Each peg has a stable id
 * so collisions can be deduped per-drop.
 */
export function buildPegs(cfg: PegLayoutConfig): Peg[] {
  const pegs: Peg[] = [];
  let id = 0;
  for (let r = 0; r < cfg.rows; r++) {
    const isOdd = r % 2 === 1;
    const colsThisRow = isOdd ? cfg.cols - 1 : cfg.cols;
    // Total row width spans (colsThisRow - 1) * colSpacingX.
    const rowWidth = (colsThisRow - 1) * cfg.colSpacingX;
    const startX = cfg.gridCenterX - rowWidth / 2;
    const y = cfg.firstPegY + r * cfg.rowSpacingY;
    for (let c = 0; c < colsThisRow; c++) {
      pegs.push({
        id: id++,
        p: { x: startX + c * cfg.colSpacingX, y },
        r: cfg.pegRadius,
      });
    }
  }
  return pegs;
}

export function buildBuckets(cfg: BucketLayoutConfig): Bucket[] {
  if (cfg.multipliers.length !== cfg.count) {
    throw new Error(
      `bucket multipliers length ${cfg.multipliers.length} != count ${cfg.count}`,
    );
  }
  const width = cfg.boardWidth / cfg.count;
  const buckets: Bucket[] = [];
  for (let i = 0; i < cfg.count; i++) {
    buckets.push({
      index: i,
      x0: i * width,
      x1: (i + 1) * width,
      y0: cfg.y0,
      y1: cfg.y1,
      multiplier: cfg.multipliers[i]!,
    });
  }
  return buckets;
}
