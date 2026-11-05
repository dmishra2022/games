// GameCanvas owns the simulation state ref, the rAF loop, and input
// routing. Engine events are forwarded via `onEvent` so the reducer
// (SPEC-002) can update HUD state. Visual extras (trail, particle
// pool, pulse timers) live here per SPEC-003.

import { useEffect, useRef } from 'react';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BUCKET_LAYOUT,
  PEG_LAYOUT,
  SCORING,
  SIM_CONFIG,
} from '../config/board';
import { startLoop } from '../engine/gameLoop';
import { buildBuckets, buildPegs } from '../engine/pegLayout';
import { createSimState, spawnBall, stepSimulation } from '../engine/physics';
import type { EngineEvent, SimState } from '../engine/types';
import {
  createRenderExtras,
  drawFrame,
  emitBucketBurst,
  emitPegBurst,
  updateParticles,
  updateTrail,
} from './draw';
import { playBucket, playPeg } from '../audio/synth';

type ForwardedEvent = EngineEvent & { basePoints?: number };

type Props = {
  onEvent?: (e: ForwardedEvent) => void;
  active: boolean;
  pegBonusLevel: number;
  bucketBiasLevel: number;
  queuedDrops: number;
  onConsumedQueuedDrop?: () => void;
  sfxMuted: boolean;
};

export default function GameCanvas({
  onEvent,
  active,
  pegBonusLevel,
  bucketBiasLevel,
  queuedDrops,
  onConsumedQueuedDrop,
  sfxMuted,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<SimState | null>(null);
  const extrasRef = useRef(createRenderExtras());
  const activeRef = useRef(active);
  const pegBonusRef = useRef(pegBonusLevel);
  const queuedDropsRef = useRef(queuedDrops);
  const onEventRef = useRef(onEvent);
  const onConsumedQueuedRef = useRef(onConsumedQueuedDrop);
  const sfxMutedRef = useRef(sfxMuted);
  const nextQueuedSpawnAtRef = useRef<number | null>(null);
  const lastSpawnXRef = useRef<number>(BOARD_WIDTH / 2);
  const lastFrameRef = useRef<number>(performance.now());

  activeRef.current = active;
  pegBonusRef.current = pegBonusLevel;
  queuedDropsRef.current = queuedDrops;
  onEventRef.current = onEvent;
  onConsumedQueuedRef.current = onConsumedQueuedDrop;
  sfxMutedRef.current = sfxMuted;

  if (!stateRef.current) {
    stateRef.current = buildSimState(bucketBiasLevel);
  }

  useEffect(() => {
    const s = stateRef.current;
    if (!s || s.dropActive) return;
    const next = buildSimState(bucketBiasLevel);
    s.pegs = next.pegs;
    s.buckets = next.buckets;
    s.hitPegsThisDrop.clear();
  }, [bucketBiasLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reduced motion detection.
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMotion = () => {
      extrasRef.current.reducedMotion = mql.matches;
    };
    applyMotion();
    mql.addEventListener('change', applyMotion);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const aspect = BOARD_WIDTH / BOARD_HEIGHT;
      let cssW = rect.width;
      let cssH = rect.width / aspect;
      if (cssH > rect.height) {
        cssH = rect.height;
        cssW = cssH * aspect;
      }
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      const sx = (cssW * dpr) / BOARD_WIDTH;
      const sy = (cssH * dpr) / BOARD_HEIGHT;
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener('orientationchange', resize);

    const clientToBoardX = (clientX: number): number => {
      const rect = canvas.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(1, nx)) * BOARD_WIDTH;
    };

    const state = stateRef.current!;

    const forward = (evs: EngineEvent[]) => {
      const bonus = pegBonusRef.current;
      const basePoints = Math.round(
        SCORING.basePegPoints * (1 + 0.25 * bonus),
      );
      const now = performance.now();
      for (const e of evs) {
        if (e.type === 'PEG_HIT') {
          const peg = state.pegs.find((p) => p.id === e.pegId);
          if (peg) {
            extrasRef.current.pegHits.set(peg.id, now);
            emitPegBurst(extrasRef.current, peg.p.x, peg.p.y);
          }
          if (!sfxMutedRef.current) playPeg();
          onEventRef.current?.({ ...e, basePoints });
        } else if (e.type === 'BUCKET_LAND') {
          const bucket = state.buckets[e.bucketIndex];
          if (bucket) {
            extrasRef.current.bucketHits.set(bucket.index, now);
            emitBucketBurst(
              extrasRef.current,
              (bucket.x0 + bucket.x1) / 2,
              bucket.y0 + 4,
              e.multiplier,
            );
          }
          if (!sfxMutedRef.current) playBucket(e.multiplier);
          onEventRef.current?.(e);
        } else {
          onEventRef.current?.(e);
        }
      }
    };

    const trySpawn = (x: number) => {
      const r = state.ball.r;
      const clamped = Math.max(r, Math.min(BOARD_WIDTH - r, x));
      lastSpawnXRef.current = clamped;
      state.aimX = clamped;
      const evs = spawnBall(state, clamped);
      forward(evs);
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!activeRef.current) return;
      const r = state.ball.r;
      const x = clientToBoardX(ev.clientX);
      state.aimX = Math.max(r, Math.min(BOARD_WIDTH - r, x));
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (!activeRef.current) return;
      ev.preventDefault();
      trySpawn(clientToBoardX(ev.clientX));
    };

    const onKey = (ev: KeyboardEvent) => {
      if (!activeRef.current) return;
      const r = state.ball.r;
      if (ev.key === ' ' || ev.code === 'Space') {
        ev.preventDefault();
        trySpawn(state.aimX);
      } else if (ev.key === 'ArrowLeft') {
        state.aimX = Math.max(r, state.aimX - 4);
      } else if (ev.key === 'ArrowRight') {
        state.aimX = Math.min(BOARD_WIDTH - r, state.aimX + 4);
      }
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);

    const loop = startLoop(
      (dt) => {
        const now = performance.now();
        const dtMs = now - lastFrameRef.current;
        lastFrameRef.current = now;
        extrasRef.current.now = now;
        updateParticles(extrasRef.current, dtMs);

        if (!activeRef.current) return;
        const evs = stepSimulation(state, dt);
        updateTrail(extrasRef.current, state);
        forward(evs);

        if (!state.dropActive && queuedDropsRef.current > 0) {
          if (nextQueuedSpawnAtRef.current === null) {
            nextQueuedSpawnAtRef.current = now + 180;
          } else if (now >= nextQueuedSpawnAtRef.current) {
            onConsumedQueuedRef.current?.();
            trySpawn(lastSpawnXRef.current);
            nextQueuedSpawnAtRef.current = null;
          }
        } else if (state.dropActive) {
          nextQueuedSpawnAtRef.current = null;
        }
      },
      () => {
        drawFrame(ctx, state, extrasRef.current);
      },
    );

    return () => {
      loop.stop();
      ro.disconnect();
      mql.removeEventListener('change', applyMotion);
      window.removeEventListener('orientationchange', resize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        className="rounded-md shadow-neon-cyan outline-none"
        aria-label="Neon Plinko board"
      />
    </div>
  );
}

function buildSimState(bucketBiasLevel: number): SimState {
  const biasShift = 0.5 * bucketBiasLevel;
  const pegs = buildPegs({
    ...PEG_LAYOUT,
    gridCenterX: PEG_LAYOUT.gridCenterX + biasShift,
  });
  const buckets = buildBuckets({
    count: BUCKET_LAYOUT.count,
    boardWidth: BOARD_WIDTH,
    y0: BUCKET_LAYOUT.y0,
    y1: BUCKET_LAYOUT.y1,
    multipliers: BUCKET_LAYOUT.multipliers,
  });
  return createSimState(pegs, buckets, SIM_CONFIG);
}
