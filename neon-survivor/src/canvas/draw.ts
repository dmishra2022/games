// Canvas renderer. SPEC-003 adds glow, trails, particles.

import type { Camera } from './camera';
import type { FxState } from './fx';
import type { World } from '../engine/types';
import { xpToNextLevel } from '../engine/constants';

const BG_TOP = '#07010f';
const BG_BOTTOM = '#120823';
const GRID = 'rgba(57, 226, 255, 0.07)';
const COLOR_PLAYER = '#39e2ff';
const COLOR_BULLET = '#ffffff';
const COLOR_ORB = '#9bff5a';
const COLOR_GRUNT = '#ff4d6d';
const COLOR_FAST = '#ffd166';
const COLOR_TANK = '#ff3df0';
const COLOR_HIT = '#ffffff';
const COLOR_DEBUG = '#ffd166';

export type Viewport = { w: number; h: number };

export function enemyColor(kind: 'grunt' | 'fast' | 'tank'): string {
  switch (kind) {
    case 'grunt':
      return COLOR_GRUNT;
    case 'fast':
      return COLOR_FAST;
    case 'tank':
      return COLOR_TANK;
  }
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  world: World,
  cam: Camera,
  vp: Viewport,
  fx: FxState,
  shake: { x: number; y: number },
): void {
  // Background gradient.
  const bg = ctx.createLinearGradient(0, 0, 0, vp.h);
  bg.addColorStop(0, BG_TOP);
  bg.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, vp.w, vp.h);

  // Scrolling grid (cheap, parallax-free).
  const gridStep = 60;
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const offX = (((cam.x + shake.x) % gridStep) + gridStep) % gridStep;
  const offY = (((cam.y + shake.y) % gridStep) + gridStep) % gridStep;
  for (let x = -offX; x < vp.w; x += gridStep) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, vp.h);
  }
  for (let y = -offY; y < vp.h; y += gridStep) {
    ctx.moveTo(0, y);
    ctx.lineTo(vp.w, y);
  }
  ctx.stroke();

  const camX = cam.x + shake.x;
  const camY = cam.y + shake.y;
  const toSX = (wx: number) => wx - camX + vp.w / 2;
  const toSY = (wy: number) => wy - camY + vp.h / 2;

  // Pickup radius hint.
  ctx.strokeStyle = 'rgba(155, 255, 90, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(
    toSX(world.player.p.x),
    toSY(world.player.p.y),
    world.player.pickupRadius,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  // Orbs with glow.
  for (const o of world.orbs) {
    if (!o.active) continue;
    if (!fx.reducedMotion) {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = COLOR_ORB;
    }
    ctx.fillStyle = COLOR_ORB;
    ctx.beginPath();
    ctx.arc(toSX(o.p.x), toSY(o.p.y), 3, 0, Math.PI * 2);
    ctx.fill();
    if (!fx.reducedMotion) ctx.restore();
  }

  // Enemies with glow + hit flash.
  for (const e of world.enemies) {
    if (!e.active) continue;
    const color = e.hitFlash > 0 ? COLOR_HIT : enemyColor(e.kind);
    if (!fx.reducedMotion) {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = enemyColor(e.kind);
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(toSX(e.p.x), toSY(e.p.y), e.r, 0, Math.PI * 2);
    ctx.fill();
    if (!fx.reducedMotion) ctx.restore();
  }

  // Bullets with mini-streak.
  for (const b of world.bullets) {
    if (!b.active) continue;
    if (!fx.reducedMotion) {
      ctx.save();
      ctx.shadowBlur = 6;
      ctx.shadowColor = COLOR_BULLET;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = b.r;
      ctx.beginPath();
      ctx.moveTo(toSX(b.p.x), toSY(b.p.y));
      ctx.lineTo(toSX(b.p.x - b.v.x * 0.025), toSY(b.p.y - b.v.y * 0.025));
      ctx.stroke();
    }
    ctx.fillStyle = COLOR_BULLET;
    ctx.beginPath();
    ctx.arc(toSX(b.p.x), toSY(b.p.y), b.r, 0, Math.PI * 2);
    ctx.fill();
    if (!fx.reducedMotion) ctx.restore();
  }

  // Particles.
  for (const p of fx.particles) {
    if (!p.active) continue;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(toSX(p.x), toSY(p.y), p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Player trail then player.
  if (!fx.reducedMotion && fx.trail.length > 0) {
    for (let i = 0; i < fx.trail.length; i++) {
      const t = fx.trail[i]!;
      const a = (i + 1) / fx.trail.length;
      ctx.fillStyle = COLOR_PLAYER;
      ctx.globalAlpha = a * 0.3;
      ctx.beginPath();
      ctx.arc(toSX(t.x), toSY(t.y), world.player.r * (0.45 + 0.55 * a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (!fx.reducedMotion) {
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = COLOR_PLAYER;
  }
  ctx.fillStyle = COLOR_PLAYER;
  ctx.beginPath();
  ctx.arc(
    toSX(world.player.p.x),
    toSY(world.player.p.y),
    world.player.r,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  if (!fx.reducedMotion) ctx.restore();

  // I-frame ring around player.
  if (world.player.invulnUntil > world.time) {
    ctx.strokeStyle = 'rgba(57, 226, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      toSX(world.player.p.x),
      toSY(world.player.p.y),
      world.player.r + 4,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  // Dev HUD.
  if (import.meta.env?.DEV) {
    ctx.fillStyle = COLOR_DEBUG;
    ctx.font = '12px "Orbitron", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lvl = world.player.level;
    const need = xpToNextLevel(lvl);
    ctx.fillText(
      `t=${world.time.toFixed(1)}s  hp=${Math.ceil(world.player.hp)}/${world.player.maxHp}  lvl=${lvl}  xp=${Math.floor(world.player.xp)}/${need}  kills=${world.kills}`,
      8,
      8,
    );
  }
}
