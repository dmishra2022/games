// Pure math helpers. SPEC-001 section 8.2.

import type { Aabb } from './types';

/** Smallest signed difference `b - a` wrapped to (-PI, PI]. */
export function shortestAngleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Rotate `current` toward `target` by at most `maxDelta` radians. */
export function rotateToward(
  current: number,
  target: number,
  maxDelta: number,
): number {
  const diff = shortestAngleDiff(current, target);
  if (Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

/**
 * Circle-vs-AABB overlap test. Returns a resolution normal and the
 * depth, or null if no overlap. The normal points *out of* the AABB
 * toward the circle (so the caller can push the circle by
 * `n * overlap`).
 */
export function circleAabb(
  cx: number,
  cy: number,
  r: number,
  b: Aabb,
): { overlap: number; nx: number; ny: number } | null {
  const closestX = Math.max(b.x0, Math.min(cx, b.x1));
  const closestY = Math.max(b.y0, Math.min(cy, b.y1));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 < 1e-10) {
    // Center is inside the box; resolve on the shorter axis.
    const leftPen = cx - b.x0;
    const rightPen = b.x1 - cx;
    const topPen = cy - b.y0;
    const botPen = b.y1 - cy;
    const minPen = Math.min(leftPen, rightPen, topPen, botPen);
    if (minPen === leftPen) return { overlap: r + leftPen, nx: -1, ny: 0 };
    if (minPen === rightPen) return { overlap: r + rightPen, nx: 1, ny: 0 };
    if (minPen === topPen) return { overlap: r + topPen, nx: 0, ny: -1 };
    return { overlap: r + botPen, nx: 0, ny: 1 };
  }
  const d = Math.sqrt(d2);
  return { overlap: r - d, nx: dx / d, ny: dy / d };
}

/**
 * Point-vs-AABB test used by shells (treat as infinitesimal point).
 */
export function pointInAabb(px: number, py: number, b: Aabb): boolean {
  return px >= b.x0 && px <= b.x1 && py >= b.y0 && py <= b.y1;
}

/**
 * Ray vs AABB, returning the smallest positive t along the ray if it
 * hits within `maxT`, else null. Used for LOS checks by the AI.
 */
export function rayAabb(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  maxT: number,
  b: Aabb,
): number | null {
  let tMin = 0;
  let tMax = maxT;
  for (let axis = 0; axis < 2; axis++) {
    const o = axis === 0 ? ox : oy;
    const d = axis === 0 ? dx : dy;
    const lo = axis === 0 ? b.x0 : b.y0;
    const hi = axis === 0 ? b.x1 : b.y1;
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;
    } else {
      const inv = 1 / d;
      let t0 = (lo - o) * inv;
      let t1 = (hi - o) * inv;
      if (t0 > t1) {
        const tmp = t0;
        t0 = t1;
        t1 = tmp;
      }
      if (t0 > tMin) tMin = t0;
      if (t1 < tMax) tMax = t1;
      if (tMin > tMax) return null;
    }
  }
  return tMin >= 0 ? tMin : null;
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function length(x: number, y: number): number {
  return Math.hypot(x, y);
}
