import { describe, expect, it } from 'vitest';
import { BUCKET_LAYOUT, BOARD_WIDTH, PEG_LAYOUT } from '../config/board';
import { buildBuckets, buildPegs } from '../engine/pegLayout';

describe('buildPegs', () => {
  it('produces 10-row offset grid with correct total count', () => {
    const pegs = buildPegs(PEG_LAYOUT);
    // 5 even rows * 9 + 5 odd rows * 8 = 85
    expect(pegs).toHaveLength(5 * 9 + 5 * 8);
  });

  it('assigns unique ids', () => {
    const pegs = buildPegs(PEG_LAYOUT);
    expect(new Set(pegs.map((p) => p.id)).size).toBe(pegs.length);
  });

  it('centers each row horizontally on gridCenterX', () => {
    const pegs = buildPegs(PEG_LAYOUT);
    const rowY = PEG_LAYOUT.firstPegY;
    const rowPegs = pegs.filter((p) => p.p.y === rowY);
    const avg =
      rowPegs.reduce((acc, p) => acc + p.p.x, 0) / rowPegs.length;
    expect(avg).toBeCloseTo(PEG_LAYOUT.gridCenterX, 5);
  });

  it('offsets odd rows by half a column', () => {
    const pegs = buildPegs(PEG_LAYOUT);
    const evenRow = pegs
      .filter((p) => p.p.y === PEG_LAYOUT.firstPegY)
      .sort((a, b) => a.p.x - b.p.x);
    const oddRow = pegs
      .filter((p) => p.p.y === PEG_LAYOUT.firstPegY + PEG_LAYOUT.rowSpacingY)
      .sort((a, b) => a.p.x - b.p.x);
    // First odd peg should be about half a column right of first even peg.
    expect(oddRow[0]!.p.x - evenRow[0]!.p.x).toBeCloseTo(
      PEG_LAYOUT.colSpacingX / 2,
      5,
    );
  });
});

describe('buildBuckets', () => {
  it('produces buckets covering the full board width without gaps', () => {
    const buckets = buildBuckets({
      count: BUCKET_LAYOUT.count,
      boardWidth: BOARD_WIDTH,
      y0: BUCKET_LAYOUT.y0,
      y1: BUCKET_LAYOUT.y1,
      multipliers: BUCKET_LAYOUT.multipliers,
    });
    expect(buckets).toHaveLength(7);
    expect(buckets[0]!.x0).toBe(0);
    expect(buckets[6]!.x1).toBe(BOARD_WIDTH);
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i]!.x0).toBeCloseTo(buckets[i - 1]!.x1, 10);
    }
  });

  it('throws when multipliers length does not match count', () => {
    expect(() =>
      buildBuckets({
        count: 5,
        boardWidth: BOARD_WIDTH,
        y0: 0,
        y1: 10,
        multipliers: [1, 2, 3],
      }),
    ).toThrow();
  });
});
