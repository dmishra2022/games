// GameCanvas owns the World, the rAF loop, input, and visual FX
// (particles, trail, shake). Events are forwarded via onEvent.

import { useEffect, useRef } from 'react';
import { applyInput, stepWorld } from '../engine/step';
import type { EngineEvent, MetaState, World } from '../engine/types';
import { createWorld } from '../engine/world';
import { createCamera, updateCamera } from './camera';
import { drawFrame, enemyColor } from './draw';
import {
  addTrauma,
  burstEnemyDeath,
  burstHurt,
  burstLevelUp,
  burstPickup,
  createFxState,
  shakeOffset,
  triggerVignette,
  updateFx,
} from './fx';
import {
  playHurt,
  playKill,
  playLevelUp,
  playPickup,
  playShot,
} from '../audio/synth';

type Props = {
  meta: MetaState;
  active: boolean;
  runId: number;
  sfxMuted: boolean;
  worldRef?: React.MutableRefObject<World | null>;
  onEvent?: (e: EngineEvent) => void;
  onSyncFrame?: (world: World) => void;
  joystick?: { ax: number; ay: number };
  onHurtVignette?: (untilMs: number) => void;
};

export default function GameCanvas({
  meta,
  active,
  runId,
  sfxMuted,
  worldRef,
  onEvent,
  onSyncFrame,
  joystick,
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
  const joystickRef = useRef(joystick);
  const sfxMutedRef = useRef(sfxMuted);
  const keysRef = useRef<Record<string, boolean>>({});
  const vpRef = useRef({ w: 0, h: 0 });
  const metaRef = useRef(meta);
  const runIdRef = useRef(runId);
  const syncAccumRef = useRef(0);
  const prevBulletCountRef = useRef(0);

  activeRef.current = active;
  onEventRef.current = onEvent;
  onSyncRef.current = onSyncFrame;
  onVignetteRef.current = onHurtVignette;
  joystickRef.current = joystick;
  sfxMutedRef.current = sfxMuted;
  metaRef.current = meta;

  if (!worldLocalRef.current) {
    worldLocalRef.current = createWorld(meta);
    if (worldRef) worldRef.current = worldLocalRef.current;
  }

  useEffect(() => {
    if (runIdRef.current === runId) return;
    runIdRef.current = runId;
    const fresh = createWorld(metaRef.current);
    worldLocalRef.current = fresh;
    if (worldRef) worldRef.current = fresh;
    cameraRef.current = createCamera();
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
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      keysRef.current[ev.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let last = performance.now();
    let rafId = 0;

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const world = worldLocalRef.current!;
      const fx = fxRef.current;

      if (activeRef.current) {
        const k = keysRef.current;
        let ax = 0;
        let ay = 0;
        if (k['w'] || k['arrowup']) ay -= 1;
        if (k['s'] || k['arrowdown']) ay += 1;
        if (k['a'] || k['arrowleft']) ax -= 1;
        if (k['d'] || k['arrowright']) ax += 1;
        const j = joystickRef.current;
        if (j && (Math.abs(j.ax) > 0 || Math.abs(j.ay) > 0)) {
          ax += j.ax;
          ay += j.ay;
        }
        applyInput(world, ax, ay);

        const events = stepWorld(world, dt);
        for (const e of events) {
          onEventRef.current?.(e);
          // Audio + fx hooks.
          if (e.type === 'ENEMY_KILLED') {
            // Find the matching enemy (by kind) to color the burst.
            // The enemy is already deactivated; approximate using the
            // player's position as fallback particle origin.
            // Prefer the most recent inactive slot of that kind (its
            // last position still stored).
            const color = enemyColor(e.kind);
            // Find an inactive enemy with this kind and non-origin pos.
            let x = world.player.p.x;
            let y = world.player.p.y;
            for (const en of world.enemies) {
              if (!en.active && en.kind === e.kind && (en.p.x || en.p.y)) {
                x = en.p.x;
                y = en.p.y;
                break;
              }
            }
            burstEnemyDeath(fx, x, y, color);
            if (!sfxMutedRef.current) playKill();
          } else if (e.type === 'PLAYER_HURT') {
            burstHurt(fx, world.player.p.x, world.player.p.y);
            addTrauma(fx, 0.5);
            triggerVignette(fx, 180);
            onVignetteRef.current?.(performance.now() + 180);
            if (!sfxMutedRef.current) playHurt();
          } else if (e.type === 'ORB_COLLECTED') {
            burstPickup(fx, world.player.p.x, world.player.p.y);
            if (!sfxMutedRef.current) playPickup();
          } else if (e.type === 'LEVEL_UP') {
            burstLevelUp(fx, world.player.p.x, world.player.p.y);
            addTrauma(fx, 0.3);
            if (!sfxMutedRef.current) playLevelUp();
          }
        }

        // Count newly-spawned bullets as a proxy for shot SFX.
        const activeBullets = world.bullets.reduce(
          (n, b) => n + (b.active ? 1 : 0),
          0,
        );
        if (activeBullets > prevBulletCountRef.current) {
          if (!sfxMutedRef.current) playShot();
        }
        prevBulletCountRef.current = activeBullets;

        syncAccumRef.current += dt;
        if (syncAccumRef.current >= 0.1) {
          syncAccumRef.current = 0;
          onSyncRef.current?.(world);
        }
      }

      updateFx(
        fx,
        dt * 1000,
        world.player.p.x,
        world.player.p.y,
      );
      updateCamera(cameraRef.current, world.player, Math.min(dt, 1 / 30));
      const shake = shakeOffset(fx, world.time);
      drawFrame(ctx, world, cameraRef.current, vpRef.current, fx, shake);

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
        aria-label="Neon Survivor arena"
      />
    </div>
  );
}
