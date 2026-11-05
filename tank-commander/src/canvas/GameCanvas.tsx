// GameCanvas owns the World, rAF loop, input, and FX. Engine events
// are forwarded via onEvent (SPEC-002 routes them to the reducer).

import { useEffect, useRef } from 'react';
import {
  applyPlayerInput,
  stepWorld,
} from '../engine/step';
import type {
  EngineEvent,
  MetaState,
  World,
} from '../engine/types';
import { createWorld } from '../engine/world';
import { createCamera, updateCamera } from './camera';
import { drawFrame } from './draw';
import {
  addTrauma,
  addTread,
  burstExplosion,
  burstMuzzle,
  createFxState,
  shakeOffset,
  triggerDamageFlash,
  triggerVignette,
  updateFx,
} from './fx';
import {
  sfxEnemyFire,
  sfxExplosion,
  sfxPlayerFire,
  sfxTankDestroyed,
  sfxTankHitPlayer,
  sfxWallDestroyed,
  sfxWaveCleared,
} from '../audio/synth';

type Props = {
  meta: MetaState;
  active: boolean;
  runId: number;
  reducedMotion?: boolean;
  worldRef?: React.MutableRefObject<World | null>;
  onEvent?: (e: EngineEvent) => void;
  onSyncFrame?: (world: World) => void;
  joystickLeft?: { ax: number; ay: number };
  joystickRight?: { ax: number; ay: number };
  autoFire?: boolean;
  onHurtVignette?: (untilMs: number) => void;
};

export default function GameCanvas({
  meta,
  active,
  runId,
  reducedMotion,
  worldRef,
  onEvent,
  onSyncFrame,
  joystickLeft,
  joystickRight,
  autoFire,
  onHurtVignette,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const worldLocalRef = useRef<World | null>(null);
  const cameraRef = useRef(createCamera());
  const fxRef = useRef(createFxState());
  const activeRef = useRef(active);
  const onEventRef = useRef(onEvent);
  const onSyncRef = useRef(onSyncFrame);
  const onVignetteRef = useRef(onHurtVignette);
  const joyLeftRef = useRef(joystickLeft);
  const joyRightRef = useRef(joystickRight);
  const autoFireRef = useRef(autoFire);
  const metaRef = useRef(meta);
  const runIdRef = useRef(runId);
  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef({ x: 0, y: 0, down: false });
  const vpRef = useRef({ w: 0, h: 0 });
  const treadAccumRef = useRef(0);
  const syncAccumRef = useRef(0);

  activeRef.current = active;
  onEventRef.current = onEvent;
  onSyncRef.current = onSyncFrame;
  onVignetteRef.current = onHurtVignette;
  joyLeftRef.current = joystickLeft;
  joyRightRef.current = joystickRight;
  autoFireRef.current = autoFire;
  metaRef.current = meta;
  // reducedMotion prop overrides OS media query (settings toggle).
  if (reducedMotion !== undefined && fxRef.current) {
    fxRef.current.reducedMotion = reducedMotion;
  }

  if (!worldLocalRef.current) {
    worldLocalRef.current = createWorld({ arenaIndex: 0, meta });
    if (worldRef) worldRef.current = worldLocalRef.current;
    // Seed camera to player position.
    const p = worldLocalRef.current.tanks[0]!.p;
    cameraRef.current = createCamera(p);
  }

  useEffect(() => {
    if (runIdRef.current === runId) return;
    runIdRef.current = runId;
    const fresh = createWorld({ arenaIndex: 0, meta: metaRef.current });
    worldLocalRef.current = fresh;
    if (worldRef) worldRef.current = fresh;
    cameraRef.current = createCamera(fresh.tanks[0]!.p);
    fxRef.current = createFxState();
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    fxRef.current.reducedMotion = mql.matches;
  }, [runId, worldRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMotion = () => (fxRef.current.reducedMotion = mql.matches);
    applyMotion();
    mql.addEventListener('change', applyMotion);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      vpRef.current.w = rect.width;
      vpRef.current.h = rect.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener('orientationchange', resize);

    const onKeyDown = (ev: KeyboardEvent) => {
      keysRef.current[ev.key.toLowerCase()] = true;
      if (ev.key === ' ') ev.preventDefault();
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      keysRef.current[ev.key.toLowerCase()] = false;
    };
    const onMouseMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ev.clientX - rect.left;
      mouseRef.current.y = ev.clientY - rect.top;
    };
    const onMouseDown = (ev: MouseEvent) => {
      if (ev.button === 0) mouseRef.current.down = true;
    };
    const onMouseUp = (ev: MouseEvent) => {
      if (ev.button === 0) mouseRef.current.down = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    let last = performance.now();
    let rafId = 0;

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const world = worldLocalRef.current!;
      const fx = fxRef.current;
      const vp = vpRef.current;
      const cam = cameraRef.current;

      // Collect input.
      if (activeRef.current) {
        const k = keysRef.current;
        let drive = 0;
        let turn = 0;
        if (k['w'] || k['arrowup']) drive += 1;
        if (k['s'] || k['arrowdown']) drive -= 1;
        if (k['a'] || k['arrowleft']) turn -= 1;
        if (k['d'] || k['arrowright']) turn += 1;
        const jl = joyLeftRef.current;
        if (jl && (Math.abs(jl.ax) > 0 || Math.abs(jl.ay) > 0)) {
          drive += -jl.ay; // push up = forward
          turn += jl.ax;
        }
        // Clamp.
        drive = Math.max(-1, Math.min(1, drive));
        turn = Math.max(-1, Math.min(1, turn));

        // Turret target: mouse (world space) or right joystick (relative to player).
        let targetX: number;
        let targetY: number;
        const player = world.tanks[0];
        const jr = joyRightRef.current;
        if (jr && (Math.abs(jr.ax) > 0 || Math.abs(jr.ay) > 0)) {
          // Relative aim: offset from player position by joystick vector * 200.
          targetX = (player?.p.x ?? 0) + jr.ax * 200;
          targetY = (player?.p.y ?? 0) + jr.ay * 200;
        } else {
          const sx = mouseRef.current.x;
          const sy = mouseRef.current.y;
          targetX = sx - vp.w / 2 + cam.x;
          targetY = sy - vp.h / 2 + cam.y;
        }

        // Fire gate: mouse button, Space, right joystick active, or autoFire.
        const space = !!k[' '];
        const rightActive =
          jr && Math.hypot(jr.ax, jr.ay) > 0.2;
        let fire = mouseRef.current.down || space || !!rightActive;
        if (autoFireRef.current && !fire && player) {
          // Auto-fire when reload ready and turret within ±8° of an enemy.
          if (player.reload <= 0) {
            let nearest: {
              dx: number;
              dy: number;
              d2: number;
            } | null = null;
            for (const t of world.tanks) {
              if (!t.active || t.side !== 'enemy') continue;
              const dx = t.p.x - player.p.x;
              const dy = t.p.y - player.p.y;
              const d2 = dx * dx + dy * dy;
              if (!nearest || d2 < nearest.d2) nearest = { dx, dy, d2 };
            }
            if (nearest) {
              const aim = Math.atan2(nearest.dy, nearest.dx);
              const diff = Math.abs(((aim - player.turretAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
              if (diff < 0.14) fire = true;
            }
          }
        }

        applyPlayerInput(world, {
          drive,
          hullTurn: turn,
          turretTargetX: targetX,
          turretTargetY: targetY,
          fire,
        });

        const events = stepWorld(world, dt);
        for (const e of events) {
          onEventRef.current?.(e);
          if (e.type === 'SHELL_FIRED') {
            const owner = world.tanks.find((t) => t.id === e.ownerId);
            if (owner) {
              burstMuzzle(fx, e.p.x, e.p.y, owner.turretAngle);
              if (e.ownerSide === 'player') {
                addTrauma(fx, 0.05);
                sfxPlayerFire();
              } else {
                sfxEnemyFire();
              }
            }
          } else if (e.type === 'EXPLOSION') {
            burstExplosion(fx, e.p.x, e.p.y, e.radius);
            addTrauma(fx, 0.25);
            sfxExplosion();
          } else if (e.type === 'TANK_HIT' && e.side === 'player') {
            triggerVignette(fx, 220);
            triggerDamageFlash(fx, 240);
            onVignetteRef.current?.(performance.now() + 220);
            sfxTankHitPlayer();
          } else if (e.type === 'TANK_DESTROYED') {
            addTrauma(fx, e.kind === 'heavy' ? 0.6 : 0.3);
            sfxTankDestroyed();
          } else if (e.type === 'WALL_DESTROYED') {
            sfxWallDestroyed();
          } else if (e.type === 'WAVE_CLEARED') {
            sfxWaveCleared();
          }
        }

        // Tread decals (every ~8 units traveled).
        if (player && player.active) {
          const speed = Math.hypot(player.v.x, player.v.y);
          if (speed > 10) {
            treadAccumRef.current += speed * dt;
            while (treadAccumRef.current > 14) {
              treadAccumRef.current -= 14;
              addTread(fx, player.p.x, player.p.y, player.hullAngle);
            }
          }
        }

        syncAccumRef.current += dt;
        if (syncAccumRef.current >= 0.1) {
          syncAccumRef.current = 0;
          onSyncRef.current?.(world);
        }
      }

      updateCamera(cam, world, vp.w, vp.h, Math.min(dt, 1 / 30));
      updateFx(fx, dt * 1000);
      const shake = shakeOffset(fx, world.time);
      drawFrame(ctx, world, cam, vp, fx, shake);

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mql.removeEventListener('change', applyMotion);
      window.removeEventListener('orientationchange', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full outline-none"
        aria-label="Tank Commander arena"
      />
    </div>
  );
}
