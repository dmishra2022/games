// Canvas rendering for Tank Commander. SPEC-003 will polish further;
// Phase 1 already draws distinct tank, turret, walls, shells.

import type { Camera } from './camera';
import type { FxState } from './fx';
import type { Tank, TankKind, World } from '../engine/types';

const BG_TOP = '#141510';
const BG_BOTTOM = '#0d0f0a';
const GRID = 'rgba(140,138,125,0.05)';
const COLOR_PLAYER_HULL = '#6b7a35';
const COLOR_PLAYER_TURRET = '#8ca044';
const COLOR_ENEMY = {
  grunt: '#8b1e1e',
  sniper: '#b25a88',
  flanker: '#b1562a',
  heavy: '#6b2a8b',
};
const COLOR_SHELL = '#ffcf59';
const COLOR_SHELL_ENEMY = '#ff7a7a';
const COLOR_ROCK = '#4a4a42';
const COLOR_CRATE = '#8c6a3a';

export type Viewport = { w: number; h: number };

function enemyColor(kind: TankKind): string {
  return COLOR_ENEMY[kind as keyof typeof COLOR_ENEMY] ?? '#ff4d6d';
}

function drawTank(
  ctx: CanvasRenderingContext2D,
  tank: Tank,
  toSX: (x: number) => number,
  toSY: (y: number) => number,
  reducedMotion: boolean,
): void {
  const x = toSX(tank.p.x);
  const y = toSY(tank.p.y);
  const r = tank.r;
  const hullLen = r * 2.3;
  const hullWid = r * 1.8;
  const turretLen = r * 1.8;
  const turretWid = r * 0.9;
  const barrelLen = r * 1.9;
  const barrelWid = r * 0.4;
  const hullColor =
    tank.side === 'player' ? COLOR_PLAYER_HULL : enemyColor(tank.kind);
  const turretColor =
    tank.side === 'player' ? COLOR_PLAYER_TURRET : enemyColor(tank.kind);

  // Hull body.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tank.hullAngle);
  if (!reducedMotion) {
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
  }
  ctx.fillStyle = hullColor;
  ctx.fillRect(-hullLen / 2, -hullWid / 2, hullLen, hullWid);
  // Tread pads.
  ctx.fillStyle = '#1e2015';
  ctx.fillRect(-hullLen / 2, -hullWid / 2, hullLen, hullWid * 0.18);
  ctx.fillRect(
    -hullLen / 2,
    hullWid / 2 - hullWid * 0.18,
    hullLen,
    hullWid * 0.18,
  );
  ctx.restore();

  // Turret + barrel.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tank.turretAngle);
  ctx.fillStyle = turretColor;
  ctx.fillRect(-turretLen / 2, -turretWid / 2, turretLen, turretWid);
  // Barrel points forward.
  ctx.fillStyle = '#2e3220';
  ctx.fillRect(0, -barrelWid / 2, barrelLen, barrelWid);
  // Cupola dot.
  ctx.fillStyle = '#1e2015';
  ctx.beginPath();
  ctx.arc(-turretLen / 4, 0, turretWid * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // HP bar (on top of each tank).
  if (tank.hp < tank.maxHp) {
    const w = r * 2.2;
    const h = 3;
    const hpFrac = Math.max(0, Math.min(1, tank.hp / tank.maxHp));
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - w / 2, y - r - 10, w, h);
    ctx.fillStyle =
      tank.side === 'player' ? '#5bc0eb' : hpFrac > 0.33 ? '#f0a830' : '#8b1e1e';
    ctx.fillRect(x - w / 2, y - r - 10, w * hpFrac, h);
  }

  // Reload indicator (small arc) for the player.
  if (tank.side === 'player' && tank.reload > 0) {
    const w = r * 2.2;
    const h = 2;
    const frac = 1 - tank.reload / Math.max(tank.reloadTime, 0.001);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - w / 2, y - r - 5, w, h);
    ctx.fillStyle = '#f0a830';
    ctx.fillRect(x - w / 2, y - r - 5, w * frac, h);
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

  const camX = cam.x + shake.x;
  const camY = cam.y + shake.y;
  const toSX = (wx: number) => wx - camX + vp.w / 2;
  const toSY = (wy: number) => wy - camY + vp.h / 2;

  // Grid (world-aligned).
  const grid = 80;
  const offX = (((camX - vp.w / 2) % grid) + grid) % grid;
  const offY = (((camY - vp.h / 2) % grid) + grid) % grid;
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -offX; x < vp.w; x += grid) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, vp.h);
  }
  for (let y = -offY; y < vp.h; y += grid) {
    ctx.moveTo(0, y);
    ctx.lineTo(vp.w, y);
  }
  ctx.stroke();

  // Arena bounds (dim).
  ctx.strokeStyle = 'rgba(177,86,42,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(toSX(0), toSY(0), world.arenaW, world.arenaH);

  // Tread decals.
  if (!fx.reducedMotion) {
    for (const t of fx.tread) {
      const alpha = Math.min(0.4, t.life / 1500);
      ctx.save();
      ctx.translate(toSX(t.x), toSY(t.y));
      ctx.rotate(t.a);
      ctx.fillStyle = `rgba(30, 32, 21, ${alpha})`;
      ctx.fillRect(-8, -1, 16, 2);
      ctx.restore();
    }
  }

  // Walls.
  for (const w of world.walls) {
    if (!w.active) continue;
    const x = toSX(w.x0);
    const y = toSY(w.y0);
    const ww = w.x1 - w.x0;
    const hh = w.y1 - w.y0;
    if (w.kind === 'rock') {
      ctx.fillStyle = COLOR_ROCK;
      ctx.fillRect(x, y, ww, hh);
      ctx.strokeStyle = '#2a2a24';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, ww - 1, hh - 1);
    } else {
      ctx.fillStyle = COLOR_CRATE;
      ctx.fillRect(x, y, ww, hh);
      ctx.strokeStyle = '#4a361f';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, ww - 2, hh - 2);
      // Damage indicator: darker as HP drops.
      const frac = Math.max(0, Math.min(1, w.hp / 60));
      if (frac < 1) {
        ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - frac)})`;
        ctx.fillRect(x, y, ww, hh);
      }
    }
  }

  // Shells.
  for (const s of world.shells) {
    if (!s.active) continue;
    ctx.fillStyle =
      s.ownerSide === 'player' ? COLOR_SHELL : COLOR_SHELL_ENEMY;
    ctx.beginPath();
    ctx.arc(toSX(s.p.x), toSY(s.p.y), s.r, 0, Math.PI * 2);
    ctx.fill();
    // Tiny trail.
    if (!fx.reducedMotion) {
      ctx.strokeStyle = `rgba(255,207,89,0.4)`;
      ctx.lineWidth = s.r;
      ctx.beginPath();
      ctx.moveTo(toSX(s.p.x), toSY(s.p.y));
      ctx.lineTo(toSX(s.p.x - s.v.x * 0.03), toSY(s.p.y - s.v.y * 0.03));
      ctx.stroke();
    }
  }

  // Tanks.
  for (const t of world.tanks) {
    if (!t.active) continue;
    drawTank(ctx, t, toSX, toSY, fx.reducedMotion);
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

  // Vignette (always slight; stronger when the player is hit).
  const now = performance.now();
  const vignetteStrength =
    now < fx.vignetteUntil
      ? Math.min(1, (fx.vignetteUntil - now) / 220) * 0.9
      : 0.25;
  if (vignetteStrength > 0) {
    const grad = ctx.createRadialGradient(
      vp.w / 2,
      vp.h / 2,
      Math.min(vp.w, vp.h) * 0.25,
      vp.w / 2,
      vp.h / 2,
      Math.max(vp.w, vp.h) * 0.75,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${vignetteStrength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vp.w, vp.h);
  }

  // Damage flash (red tint).
  if (now < fx.damageFlashUntil) {
    const a = Math.min(0.35, (fx.damageFlashUntil - now) / 400);
    ctx.fillStyle = `rgba(139, 30, 30, ${a})`;
    ctx.fillRect(0, 0, vp.w, vp.h);
  }

  // Dev HUD.
  if (import.meta.env?.DEV) {
    ctx.fillStyle = '#f0a830';
    ctx.font = '12px "Teko", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const player = world.tanks[0];
    ctx.fillText(
      `wave ${world.wave}/${world.wavesPerArena}  hp=${Math.ceil(player?.hp ?? 0)}/${player?.maxHp ?? 0}  kills=${world.playerKills}  t=${world.time.toFixed(1)}s`,
      8,
      8,
    );
  }
}
