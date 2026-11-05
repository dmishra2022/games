// AI archetypes. SPEC-001 section 6.

import { ENEMY_STATS } from './constants';
import { rayAabb, shortestAngleDiff } from './math';
import type { Tank, World } from './types';

/**
 * Return true if any indestructible wall occludes the straight path
 * from (sx,sy) to (tx,ty). Used to gate the AI's fire decision.
 */
function losBlocked(world: World, sx: number, sy: number, tx: number, ty: number): boolean {
  const dx = tx - sx;
  const dy = ty - sy;
  const maxT = Math.hypot(dx, dy);
  if (maxT < 1e-6) return false;
  const inv = 1 / maxT;
  const nx = dx * inv;
  const ny = dy * inv;
  for (const w of world.walls) {
    if (!w.active) continue;
    if (w.kind !== 'rock') continue; // AI shoots through destructibles
    const t = rayAabb(sx, sy, nx, ny, maxT, w);
    if (t !== null && t < maxT - 1) return true;
  }
  return false;
}

function driveTowards(tank: Tank, tx: number, ty: number): void {
  const dx = tx - tank.p.x;
  const dy = ty - tank.p.y;
  const desired = Math.atan2(dy, dx);
  const delta = shortestAngleDiff(tank.hullAngle, desired);
  tank.input.hullTurn = Math.max(-1, Math.min(1, delta * 1.6));
  // Drive forward if roughly facing the right way; reverse if way off.
  const absDelta = Math.abs(delta);
  if (absDelta < Math.PI * 0.35) tank.input.drive = 1;
  else if (absDelta > Math.PI * 0.75) tank.input.drive = -1;
  else tank.input.drive = 0.3;
}

/**
 * Plan movement + aim + fire for one enemy tank.
 */
export function updateAi(tank: Tank, world: World, sdt: number): void {
  if (tank.side !== 'enemy') return;
  const player = world.tanks[0];
  if (!player || !player.active) {
    tank.input.drive = 0;
    tank.input.hullTurn = 0;
    tank.input.fire = false;
    return;
  }

  const stats = ENEMY_STATS[tank.kind as 'grunt' | 'sniper' | 'flanker' | 'heavy'];
  const dx = player.p.x - tank.p.x;
  const dy = player.p.y - tank.p.y;
  const dist = Math.hypot(dx, dy);

  // Movement intent per archetype.
  let mx = player.p.x;
  let my = player.p.y;
  switch (tank.kind) {
    case 'grunt': {
      const desired = dist < 160 ? 160 : dist > 220 ? 220 : dist;
      const sgn = dist < 170 ? -1 : 1;
      mx = tank.p.x + (dx / dist) * desired * sgn;
      my = tank.p.y + (dy / dist) * desired * sgn;
      break;
    }
    case 'sniper': {
      const minD = 300;
      const maxD = 500;
      if (dist < minD) {
        // Back away.
        mx = tank.p.x - (dx / dist) * (minD - dist);
        my = tank.p.y - (dy / dist) * (minD - dist);
      } else if (dist > maxD) {
        mx = player.p.x;
        my = player.p.y;
      } else {
        // Strafe sideways slowly.
        mx = tank.p.x + -dy / dist * 60;
        my = tank.p.y + dx / dist * 60;
      }
      break;
    }
    case 'flanker': {
      const sgn = tank.aiMemory.flankSign;
      // Target a point to the player's side at distance ~130.
      const side = 130;
      mx = player.p.x + -dy / dist * side * sgn;
      my = player.p.y + dx / dist * side * sgn;
      break;
    }
    case 'heavy': {
      const desired = dist < 150 ? 150 : dist > 250 ? 250 : dist;
      const sgn = dist < 170 ? -1 : 1;
      mx = tank.p.x + (dx / dist) * desired * sgn;
      my = tank.p.y + (dy / dist) * desired * sgn;
      break;
    }
    default:
      break;
  }
  driveTowards(tank, mx, my);

  // Turret aim with slight prediction.
  const lead = 0.15;
  const tx = player.p.x + player.v.x * lead;
  const ty = player.p.y + player.v.y * lead;
  tank.input.turretTargetX = tx;
  tank.input.turretTargetY = ty;

  const aimAngle = Math.atan2(ty - tank.p.y, tx - tank.p.x);
  const aimDelta = Math.abs(shortestAngleDiff(tank.turretAngle, aimAngle));
  tank.aiMemory.lastAimDelta = aimDelta;

  // Fire gate: within aim tolerance AND (for grunt/sniper/heavy) LOS not blocked by rock.
  const tol = (stats.fireAimDeg * Math.PI) / 180;
  const wantFire = aimDelta <= tol;
  let allowFire = wantFire;
  if (allowFire && tank.kind !== 'flanker') {
    allowFire = !losBlocked(world, tank.p.x, tank.p.y, tx, ty);
  }
  tank.input.fire = allowFire && tank.reload <= 0;

  // Keep lastDecisionAt updated so the heavy can be smoothed later.
  tank.aiMemory.lastDecisionAt = world.time;
  void sdt;
}
