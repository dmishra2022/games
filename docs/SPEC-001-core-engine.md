# SPEC-001 — Core Engine Loop

Status: draft → active
Depends on: `SPEC-000-master.md`
Phase: 1 (per `game/master_prompt.md`)

Goal: produce the minimum playable prototype. A ball drops from the
top of the board, bounces off a triangular peg grid, scores points per
peg hit, lands in a bucket, and resolves a multiplier. Placeholder
visuals only. No menus, no upgrades, no audio, no ads.

---

## 1. Scope

In scope:

- Deterministic peg grid generation.
- 2D rigid-body physics: gravity, circle-circle collision, world
  bounds, bucket detection.
- Fixed-timestep accumulator game loop with sub-stepping.
- Canvas rendering of ball, pegs, buckets, and a debug HUD text layer.
- Pointer + keyboard input to arm and drop a ball.
- Pure functions for `stepSimulation` and `resolveBucket` so they
  are unit-testable.

Out of scope (deferred):

- Multiple simultaneous or queued balls (SPEC-002).
- Upgrade effects on scoring/physics (SPEC-002).
- Visual polish, particles, trail, glow (SPEC-003).
- Audio (SPEC-003).
- Monetization (SPEC-004).

---

## 2. Numeric defaults

All units are "virtual board units" (400 wide × 600 tall) unless
noted.

### 2.1 World

| Param | Value | Notes |
|-------|-------|-------|
| `boardWidth` | 400 | virtual units |
| `boardHeight` | 600 | virtual units |
| `gravity` | 900 u/s² | tuned for ~1.3s fall through a 10-row grid |
| `wallRestitution` | 0.6 | left/right walls |
| `pegRestitution` | 0.72 | ball off peg |
| `airFriction` | 0.0005 | multiplicative per sim-step at 120Hz |
| `maxBallSpeed` | 1200 u/s | hard clamp per step |
| `settleSpeed` | 20 u/s | below this at bucket y, treat as landed |

### 2.2 Ball

| Param | Value |
|-------|-------|
| `ballRadius` | 7 |
| `spawnY` | 20 |
| `initialVy` | 0 (pure gravity drop) |
| `initialVx` | 0 (aim handled by spawn X) |

### 2.3 Peg grid

Triangular / offset grid.

| Param | Value |
|-------|-------|
| `pegRadius` | 5 |
| `pegRows` | 10 |
| `pegCols` | 9 (base), rows alternate 9/8 |
| `firstPegY` | 110 |
| `rowSpacingY` | 40 |
| `colSpacingX` | 42 |
| `gridCenterX` | 200 |

Row `r` (0-indexed) has `pegCols` pegs if `r % 2 == 0`, else
`pegCols - 1`. Odd rows are shifted right by `colSpacingX / 2`. The
whole grid is centered on `gridCenterX`.

### 2.4 Buckets

7 buckets across the bottom.

| Index | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|-------|---|---|---|---|---|---|---|
| Multiplier | 8 | 3 | 1 | 0.5 | 1 | 3 | 8 |

Buckets are rectangles of width `boardWidth / 7 ≈ 57.14`, from
`y = 540` to `y = 600`, laid out left-to-right with no gaps.

### 2.5 Scoring (minimal for SPEC-001)

| Event | Value |
|-------|-------|
| Peg hit (first time this drop) | `+10` to run score |
| Combo | +1 per consecutive peg hit without airborne gap > 500ms; applied as `score += 10 * combo` |
| Bucket land | `runScore` printed to debug HUD multiplied by bucket mult; no credits conversion yet (SPEC-002) |

---

## 3. Simulation algorithm

```
stepSimulation(state, dt):
  dt = min(dt, 1/30)                 # clamp
  while dt > 0:
    stepDt = min(dt, 1/120)
    integrate(ball, stepDt)
    clampSpeed(ball, maxBallSpeed)
    collideWithWalls(ball)
    collideWithPegs(ball, pegs)
    maybeResolveBucket(ball, buckets)
    decayCombo(state, stepDt)
    dt -= stepDt
```

### 3.1 Integration

Semi-implicit Euler:

```
ball.v.y += gravity * stepDt
ball.v   *= (1 - airFriction)
ball.p   += ball.v * stepDt
```

### 3.2 Wall collisions

- If `ball.p.x - r < 0`: reflect `vx *= -wallRestitution`, clamp
  `ball.p.x = r`.
- Same mirrored for right wall.
- No top wall (ball spawns inside).
- Bottom (`y >= boardHeight`) is handled by bucket resolution.

### 3.3 Peg collisions

For each peg (broad phase: AABB check against ball position + 2 ×
pegRadius):

```
d = ball.p - peg.p
dist = length(d)
if dist < ball.r + peg.r:
  n = d / dist                                 # normalized
  overlap = (ball.r + peg.r) - dist
  ball.p += n * overlap                        # positional correction
  vn = dot(ball.v, n)
  if vn < 0:
    ball.v -= (1 + pegRestitution) * vn * n    # reflect
  if peg not in state.hitPegsThisDrop:
    state.hitPegsThisDrop.add(peg.id)
    emit('PEG_HIT', peg.id)
```

Each peg can only emit one `PEG_HIT` per drop (prevents multi-tap
score spam from micro-bounces).

### 3.4 Bucket resolution

```
if ball.p.y + ball.r >= bucketTopY:
  for b in buckets:
    if ball.p.x >= b.x0 and ball.p.x < b.x1:
      emit('BUCKET_LAND', { bucket: b, runScore })
      state.active = false
      break
```

A ball lower than `bucketTopY` with speed `< settleSpeed` and still
in-bounds also resolves (prevents stuck balls).

---

## 4. Module contracts

### 4.1 `src/engine/types.ts`

```ts
export type Vec2 = { x: number; y: number };

export type Ball = {
  p: Vec2;
  v: Vec2;
  r: number;
  active: boolean;
};

export type Peg = {
  id: number;
  p: Vec2;
  r: number;
};

export type Bucket = {
  index: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  multiplier: number;
};

export type SimConfig = {
  boardWidth: number;
  boardHeight: number;
  gravity: number;
  wallRestitution: number;
  pegRestitution: number;
  airFriction: number;
  maxBallSpeed: number;
  settleSpeed: number;
};

export type SimState = {
  ball: Ball;
  pegs: Peg[];
  buckets: Bucket[];
  hitPegsThisDrop: Set<number>;
  runScore: number;
  combo: number;
  comboTimerMs: number;
  config: SimConfig;
  lastEvent: EngineEvent | null;
};

export type EngineEvent =
  | { type: 'PEG_HIT'; pegId: number; comboAfter: number }
  | { type: 'BUCKET_LAND'; bucketIndex: number; multiplier: number; runScore: number }
  | { type: 'DROP_STARTED'; spawnX: number }
  | { type: 'DROP_SETTLED' };
```

### 4.2 `src/engine/pegLayout.ts`

```ts
export function buildPegs(config: PegLayoutConfig): Peg[];
export function buildBuckets(config: BucketLayoutConfig): Bucket[];
```

Pure. Given config, returns deterministic arrays.

### 4.3 `src/engine/physics.ts`

```ts
export function stepSimulation(state: SimState, dt: number): EngineEvent[];
export function spawnBall(state: SimState, spawnX: number): void;
export function resolveBucket(ball: Ball, buckets: Bucket[]): Bucket | null;
```

Pure for inputs other than the mutable `state` reference.

### 4.4 `src/engine/gameLoop.ts`

```ts
export type LoopHandle = { stop: () => void };

export function startLoop(
  onTick: (dt: number) => void,
  onFrame: () => void,
): LoopHandle;
```

Uses `requestAnimationFrame`, computes delta from `performance.now()`,
calls `onTick(dt)` then `onFrame()` once per frame.

### 4.5 `src/canvas/GameCanvas.tsx`

Mounts a canvas, owns the sim state ref, listens to pointer/keyboard,
pushes engine events into a callback prop so SPEC-002 can route them
to the reducer.

Props:

```ts
type Props = {
  onEvent?: (e: EngineEvent) => void;
};
```

### 4.6 `src/canvas/draw.ts`

```ts
export function drawFrame(ctx: CanvasRenderingContext2D, state: SimState): void;
```

Placeholder visuals only (SPEC-003 replaces):

- Background: solid `#0b0b16`.
- Pegs: filled circles `#5ad7ff`.
- Ball: filled circle `#ff5ad7`.
- Buckets: outlined rectangles `#2a2a44`, multiplier text `#ffffff`.
- Debug HUD: top-left text "score: N  combo: xN".

---

## 5. Input

| Device | Action | Effect |
|--------|--------|--------|
| Mouse/touch move over board | — | update `aimX` |
| Mouse down / tap | release | if no ball active, `spawnBall(aimX)` |
| `Space` | key down | spawn at last `aimX` or center |
| `ArrowLeft` / `ArrowRight` | key down | `aimX ± 1` |

`aimX` is clamped to `[ballRadius, boardWidth - ballRadius]`.

---

## 6. Rendering strategy

- `GameCanvas` creates a canvas sized to `logicalW × logicalH` CSS
  pixels equal to its container, with backing store of
  `logicalW * dpr`, `logicalH * dpr` where `dpr = min(window.devicePixelRatio, 2)`.
- A single transform scales from virtual (400×600) to backing-store
  pixels: `ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0)`.
- `draw.ts` always draws in virtual units.
- Resize listener re-measures container and re-applies transform.

---

## 7. Acceptance criteria

- [ ] Ball drops when the player taps/clicks in the top gutter and
      bounces off at least some pegs before resolving to a bucket.
- [ ] Peg hit count = `hitPegsThisDrop.size` matches the number of
      unique pegs the ball actually visually touched (verified by
      debug overlay).
- [ ] A ball never passes through a peg (no tunneling) at normal
      gravity for 1000 consecutive drops in a stress test (manual
      sampling: 50 drops without visible tunneling).
- [ ] A ball always resolves to exactly one bucket (verified by
      `resolveBucket` unit tests).
- [ ] `stepSimulation` and `buildPegs` are unit-tested; tests pass
      under `npm run test`.
- [ ] Canvas scales correctly from a 320px-wide viewport up to a
      1440px-wide desktop viewport without stretching pegs.
- [ ] No React re-render occurs during a drop (verified by a
      `useRef`-based frame counter + a `console.log` on component
      re-render during manual QA).

---

## 8. Task breakdown

| ID | Task | Deliverable |
|----|------|-------------|
| 1.1 | Scaffold Vite + React + TS + Tailwind + Vitest in `game/neon-plinko/` | `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, Vitest runnable |
| 1.2 | Finalize SPEC-001 numeric defaults | this file |
| 1.3 | Implement `types.ts`, `config/board.ts`, `pegLayout.ts` | compiles, unit test for peg count |
| 1.4 | Implement `physics.ts` with sub-stepping; add `physics.test.ts` | tests pass |
| 1.5 | Implement `gameLoop.ts`, `GameCanvas.tsx`, `draw.ts`, minimal `App.tsx` | playable in `npm run dev` |
| 1.6 | Wire input (pointer, keyboard) | manual QA passes |
| 1.7 | Fix edge cases (tunneling, stuck ball), finalize debug HUD | acceptance criteria satisfied |

---

## 9. Manual QA checklist

1. Launch `npm run dev`, open `http://localhost:5173`.
2. Click near the left edge of the top gutter → ball spawns there,
   falls, bounces, lands in a bucket.
3. Click near the right edge → same.
4. Spam-click: only one ball on screen at a time.
5. Press `Space` with mouse off-canvas → ball spawns at center.
6. Resize window from narrow to wide → board remains 2:3, pegs
   proportionally spaced.
7. Open devtools, throttle CPU to 4× → ball still resolves without
   tunneling (dt clamp works).
8. Reload page → clean slate, no state leakage.
