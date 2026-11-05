// Tank movement, turret, fire. SPEC-001 sections 5.1-5.5.

import {
  ENEMY_STATS,
  PLAYER_STATS,
} from './constants';
import { circleAabb, rotateToward } from './math';
import { spawnShell } from './shells';
import type {
  EnemyKind,
  MetaState,
  Tank,
  TankInput,
  Vec2,
  World,
} from './types';

export type SpawnTankArgs = {
  side: 'player' | 'enemy';
  kind: Tank['kind'];
  p: Vec2;
  hullAngle?: number;
  meta?: MetaState;
};

const emptyInput = (): TankInput => ({
  drive: 0,
  hullTurn: 0,
  turretTargetX: 0,
  turretTargetY: 0,
  fire: false,
});

function findInactive<T extends { active: boolean }>(pool: T[]): T | null {
  for (const t of pool) if (!t.active) return t;
  return null;
}

/** Reusable placeholder tank struct for the pool (not yet implemented) */
function makeEmptyTank(id: number): Tank {
  return {
    active: false,
    id,
    side: 'enemy',
    kind: 'grunt',
    p: { x: 0, y: 0 },
    v: { x: 0, y: 0 },
    hullAngle: 0,
    turretAngle: 0,
    hullTurnRate: 0,
    turretTurnRate: 0,
    driveSpeed: 0,
    reverseSpeed: 0,
    r: 0,
    hp: 0,
    maxHp: 0,
    reload: 0,
    reloadTime: 0,
    shellDamage: 0,
    shellSpeed: 0,
    armorMul: 1,
    aiState: 'pursue',
    aiMemory: {
      lastDecisionAt: -Infinity,
      wanderTarget: { x: 0, y: 0 },
      lastAimDelta: 0,
      flankSign: Math.random() < 0.5 ? -1 : 1,
    },
    input: emptyInput(),
  };
}

export function createEmptyTankPool(size: number): Tank[] {
  return Array.from({ length: size }, (_, i) => makeEmptyTank(i));
}

export function spawnPlayerTank(
  world: World,
  p: Vec2,
  meta: MetaState,
): Tank | null {
  const slot = findInactive(world.tanks);
  if (!slot) return null;
  const s = PLAYER_STATS;
  slot.active = true;
  slot.id = world.nextTankId++;
  slot.side = 'player';
  slot.kind = 'player';
  slot.p = { x: p.x, y: p.y };
  slot.v = { x: 0, y: 0 };
  slot.hullAngle = -Math.PI / 2; // face up
  slot.turretAngle = -Math.PI / 2;
  slot.hullTurnRate = s.hullTurnRate;
  slot.turretTurnRate = s.turretTurnRate;
  slot.driveSpeed = s.driveSpeed;
  slot.reverseSpeed = s.reverseSpeed;
  slot.r = s.r;
  slot.maxHp = s.hp + 20 * meta.hp;
  slot.hp = slot.maxHp;
  slot.reloadTime = s.reloadTime * Math.pow(0.92, meta.reload);
  slot.reload = 0;
  slot.shellDamage = s.shellDamage * (1 + 0.1 * meta.damage);
  slot.shellSpeed = s.shellSpeed;
  slot.armorMul = Math.pow(0.92, meta.armor);
  slot.input = emptyInput();
  return slot;
}

export function spawnEnemyTank(
  world: World,
  kind: EnemyKind,
  p: Vec2,
): Tank | null {
  const slot = findInactive(world.tanks);
  if (!slot) return null;
  const s = ENEMY_STATS[kind];
  slot.active = true;
  slot.id = world.nextTankId++;
  slot.side = 'enemy';
  slot.kind = kind;
  slot.p = { x: p.x, y: p.y };
  slot.v = { x: 0, y: 0 };
  slot.hullAngle = Math.PI / 2; // face down (toward player spawn)
  slot.turretAngle = Math.PI / 2;
  slot.hullTurnRate = s.hullTurnRate;
  slot.turretTurnRate = s.turretTurnRate;
  slot.driveSpeed = s.driveSpeed;
  slot.reverseSpeed = s.reverseSpeed;
  slot.r = s.r;
  slot.maxHp = s.hp;
  slot.hp = s.hp;
  slot.reloadTime = s.reloadTime;
  slot.reload = s.reloadTime * Math.random();
  slot.shellDamage = s.shellDamage;
  slot.shellSpeed = s.shellSpeed;
  slot.armorMul = 1;
  slot.aiState = 'pursue';
  slot.aiMemory.lastDecisionAt = -Infinity;
  slot.aiMemory.wanderTarget = { x: p.x, y: p.y };
  slot.aiMemory.lastAimDelta = 0;
  slot.aiMemory.flankSign = Math.random() < 0.5 ? -1 : 1;
  slot.input = emptyInput();
  return slot;
}

export function integrateTank(tank: Tank, sdt: number): void {
  // Hull rotation.
  const turn = Math.max(-1, Math.min(1, tank.input.hullTurn));
  tank.hullAngle += tank.hullTurnRate * turn * sdt;
  // Drive.
  const drive = Math.max(-1, Math.min(1, tank.input.drive));
  const speed = drive >= 0 ? tank.driveSpeed : tank.reverseSpeed;
  const fx = Math.cos(tank.hullAngle);
  const fy = Math.sin(tank.hullAngle);
  tank.v.x = fx * drive * speed;
  tank.v.y = fy * drive * speed;
  tank.p.x += tank.v.x * sdt;
  tank.p.y += tank.v.y * sdt;
  // Reload timer always counts down.
  tank.reload = Math.max(0, tank.reload - sdt);
}

export function resolveTankWallCollisions(world: World): void {
  for (const t of world.tanks) {
    if (!t.active) continue;
    for (const w of world.walls) {
      if (!w.active) continue;
      const hit = circleAabb(t.p.x, t.p.y, t.r, w);
      if (!hit) continue;
      t.p.x += hit.nx * hit.overlap;
      t.p.y += hit.ny * hit.overlap;
      const vn = t.v.x * hit.nx + t.v.y * hit.ny;
      if (vn < 0) {
        t.v.x -= vn * hit.nx;
        t.v.y -= vn * hit.ny;
      }
    }
  }
}

export function resolveTankTankCollisions(world: World): void {
  const ts = world.tanks;
  for (let i = 0; i < ts.length; i++) {
    const a = ts[i]!;
    if (!a.active) continue;
    for (let j = i + 1; j < ts.length; j++) {
      const b = ts[j]!;
      if (!b.active) continue;
      const dx = b.p.x - a.p.x;
      const dy = b.p.y - a.p.y;
      const rr = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1e-6;
      const nx = dx / d;
      const ny = dy / d;
      const overlap = rr - d;
      const half = overlap * 0.5;
      a.p.x -= nx * half;
      a.p.y -= ny * half;
      b.p.x += nx * half;
      b.p.y += ny * half;
    }
  }
}

export function rotateTurret(tank: Tank, sdt: number): void {
  const dx = tank.input.turretTargetX - tank.p.x;
  const dy = tank.input.turretTargetY - tank.p.y;
  if (Math.abs(dx) + Math.abs(dy) < 1e-6) return;
  const target = Math.atan2(dy, dx);
  tank.turretAngle = rotateToward(
    tank.turretAngle,
    target,
    tank.turretTurnRate * sdt,
  );
}

export function handleFire(tank: Tank, world: World): void {
  if (!tank.input.fire) return;
  if (tank.reload > 0) return;
  const cos = Math.cos(tank.turretAngle);
  const sin = Math.sin(tank.turretAngle);
  const muzzleX = tank.p.x + cos * (tank.r + 6);
  const muzzleY = tank.p.y + sin * (tank.r + 6);
  spawnShell(world, {
    p: { x: muzzleX, y: muzzleY },
    v: { x: cos * tank.shellSpeed, y: sin * tank.shellSpeed },
    dmg: tank.shellDamage,
    ownerId: tank.id,
    ownerSide: tank.side,
  });
  tank.reload = tank.reloadTime;
  world.pending.push({
    type: 'SHELL_FIRED',
    ownerId: tank.id,
    ownerSide: tank.side,
    p: { x: muzzleX, y: muzzleY },
  });
}
