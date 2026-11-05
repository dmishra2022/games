// requestAnimationFrame-driven game loop. SPEC-001 section 4.4.

export type LoopHandle = {
  stop: () => void;
};

/**
 * Start a rAF loop. `onTick(dt)` runs simulation; `onFrame()` draws.
 * Both are called once per animation frame, tick first. `dt` is
 * seconds since the previous frame; the caller is responsible for
 * clamping and sub-stepping (see physics.ts).
 */
export function startLoop(
  onTick: (dt: number) => void,
  onFrame: () => void,
): LoopHandle {
  let running = true;
  let last = performance.now();
  let rafId = 0;

  const tick = (now: number) => {
    if (!running) return;
    const dt = (now - last) / 1000;
    last = now;
    onTick(dt);
    onFrame();
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}
