# SPEC-000 — Neon Plinko Master Specification

Status: draft → active
Owner: game team
Last updated: Phase 0

This is the root specification for the Neon Plinko project. Every other
spec (`SPEC-001`..`SPEC-004`) refines a slice of this document and must
not contradict it. If a feature spec needs to change a global rule here,
update this file in the same change.

---

## 1. Vision

Build a short-session, mobile-first, visually loud "neon plinko"
browser game. Players tap/click at the top of a board, a ball cascades
through a triangular peg grid, and lands in a multiplier bucket at the
bottom. Peg hits award points; buckets award credits used to buy
upgrades. The game is a single page, works offline after first load,
persists progress in `localStorage`, and has no backend.

The build follows the four phases in `game/master_prompt.md`:

1. Core engine (SPEC-001)
2. UI + persistence (SPEC-002)
3. Polish + audio (SPEC-003)
4. Monetization hooks (SPEC-004)

Phases are strictly ordered: no visual polish before the core loop
works end-to-end, no ad hooks before the UI exists.

---

## 2. Glossary

| Term | Definition |
|------|------------|
| Board | Fixed logical playfield, 400 (w) × 600 (h) virtual units, scaled to the viewport |
| Peg | Static circle on the board the ball can bounce off |
| Bucket | Axis-aligned rectangular zone at the bottom of the board with a scoring multiplier |
| Ball | Dynamic circle; physics-driven; one active at a time in v1 |
| Drop | A single ball launch from spawn to bucket settle |
| Run score | Points accumulated this session from peg hits (resets on page refresh) |
| High score | Best run score ever recorded (persisted) |
| Credits | Persistent soft currency; awarded by buckets, spent on upgrades |
| Combo | Multiplier applied to peg hit score, grows while ball is airborne |
| Upgrade | Permanent, persistent purchase affecting peg bonus, bucket bias, or multi-ball queue |

---

## 3. Non-goals (v1)

- No multiplayer, no backend, no accounts.
- No external asset packs: no image or audio file dependencies. All
  visuals come from Canvas 2D + CSS. All SFX come from Web Audio
  oscillators.
- No external state libraries (Redux, Zustand, Jotai, etc.). React
  Context + `useReducer` only.
- No real ad SDK integration. Only typed stub wrappers (SPEC-004).
- No level editor, no procedural level unlocks beyond the single board.
- No analytics/telemetry.

---

## 4. Global non-functional requirements

### 4.1 Performance

- Game loop: single `requestAnimationFrame`, delta-time integration,
  max `dt` clamped to `1/30s` to avoid tunneling; physics internally
  sub-steps at `1/120s` fixed when `dt > 1/120s`.
- Simulation state lives in refs/plain objects, not React state. React
  re-renders only when HUD-relevant values change (score, credits,
  combo, balls remaining, game phase).
- Target: 60 fps on a mid-range phone (iPhone 11 class / Pixel 5
  class) with full peg grid + one ball + particles.

### 4.2 Rendering

- Playfield uses HTML5 Canvas 2D.
- Menus, HUD, modals, buttons use React DOM + Tailwind.
- Canvas backing store sized to `logicalSize * devicePixelRatio`,
  capped at DPR 2 to protect low-end GPUs.

### 4.3 Input

- Pointer (mouse + touch) sets horizontal spawn position inside the
  top gutter; release / tap commits the drop.
- Keyboard: `Space` drops at last pointer X (or center), `Esc`
  toggles pause, `ArrowLeft` / `ArrowRight` nudge aim by 1 virtual
  unit when a drop is armed.
- All interactive controls have ≥44px touch targets on mobile.

### 4.4 Responsiveness

- Fixed 2:3 aspect ratio stage (400×600 virtual, matching board).
- Container uses `max-height: 100dvh` and letterboxes on wider
  screens; portrait phones get edge-to-edge playfield with HUD
  overlayed.
- Breakpoints: single breakpoint at `md` (≥768px) switches HUD from
  overlay to side panel. No separate desktop/mobile builds.

### 4.5 Persistence

- All persisted state keyed under `neon-plinko:v1` in `localStorage`.
- Schema is versioned:

  ```ts
  type PersistedState = {
    saveVersion: 1;
    credits: number;
    highScore: number;
    upgrades: { multiDrop: number; pegBonus: number; bucketBias: number };
    stats: { totalDrops: number };
    settings: { sfxMuted: boolean };
  };
  ```

- Writes are debounced to 500ms and also flushed on
  `visibilitychange: hidden`.
- Reads happen once on mount; corruption or version mismatch resets
  to defaults with a non-blocking toast.

### 4.6 Accessibility

- Respect `prefers-reduced-motion`: disable ball trail, peg glow
  pulses, and particle bursts.
- Visible focus rings on all interactive elements (`focus-visible`).
- Color contrast ≥ 4.5:1 for all HUD text against its background.
- No audio autoplay; Web Audio context is unlocked on first user
  gesture.

### 4.7 Browser support

- Latest 2 versions of Chrome, Safari, Firefox, Edge.
- iOS Safari 15+ and Android Chrome 110+.

---

## 5. High-level architecture

```
┌───────────────┐  pointer / key  ┌───────────────┐
│  InputLayer   │────────────────▶│   GameCanvas  │
└───────────────┘                 │  (rAF loop)   │
                                  │               │
                                  │ step(dt) ───▶ │
                                  │   physics     │
                                  │   collisions  │
                                  │               │
                                  │ draw() ◀───── │
                                  └──────┬────────┘
                                         │ engine events
                                         ▼
                                  ┌───────────────┐
                                  │  GameContext  │  useReducer
                                  │   reducer     │─────┐
                                  └──────┬────────┘     │
                                         │              ▼
                                         │       ┌───────────────┐
                                         │       │ localStorage  │
                                         ▼       └───────────────┘
                                  ┌───────────────┐
                                  │  React HUD /  │
                                  │  Menus / Mods │
                                  └──────┬────────┘
                                         │
                                         ▼
                                  ┌───────────────┐
                                  │  ads stubs    │ (SPEC-004)
                                  └───────────────┘
```

Key invariant: engine → reducer is one-way. The reducer never pushes
state back into the simulation except via a declarative config object
that the engine reads at the start of each drop.

---

## 6. Game states (FSM)

```
             +----------+
             |   boot   |
             +----+-----+
                  |
                  v
             +----------+     play         +-----------+
             |   menu   | ───────────────▶ |  playing  |
             +----+-----+                  +-----+-----+
                  ▲                              │
          back    │              esc / pause     │
                  │              ◀───────────────┤
                  │                              │
             +----+-----+                  +-----+-----+
             |  summary |◀─────out of──────│  paused   │
             +----------+   balls          +-----------+
```

- `boot`: load persisted state, unlock settings; auto-transitions to
  `menu`.
- `playing`: canvas is active; drops consume balls.
- `paused`: canvas is frozen; overlay with resume / settings.
- `summary`: shown when balls hit 0; offers refill (credits or
  rewarded-ad stub) or return to menu.
- Upgrades modal is reachable from `menu` and `paused` only; never
  mid-drop.

---

## 7. Economy

Baseline tuning (SPEC-002 refines):

| Source | Amount |
|--------|--------|
| Bucket land, multiplier `m` | `floor(runScore * m)` credits added |
| Peg hit | `basePegPoints * comboMultiplier` points toward run score |

Upgrades (3 tracks, 5 levels each):

| Upgrade | Effect per level | Cost formula |
|---------|------------------|--------------|
| `multiDrop` | +1 queued ball per drop (max 5 total) | `50 * 2^level` credits |
| `pegBonus` | +25% peg hit points | `40 * 2^level` credits |
| `bucketBias` | +4% weighting toward higher-multiplier buckets* | `60 * 2^level` credits |

*`bucketBias` is implemented as a soft nudge in `pegLayout` by
shifting the leftmost peg column, not as rigged collisions. Full
details in SPEC-002.

Starting state: 15 balls, 0 credits, all upgrades at level 0.

---

## 8. File + directory layout (target)

```
game/
  master_prompt.md
  docs/
    SPEC-000-master.md         (this file)
    SPEC-001-core-engine.md
    SPEC-002-ui-persistence.md
    SPEC-003-polish-audio.md
    SPEC-004-monetization.md
  neon-plinko/                 (Vite app root)
    index.html
    package.json
    tsconfig.json
    vite.config.ts
    tailwind.config.js
    postcss.config.js
    src/
      main.tsx
      App.tsx
      index.css
      engine/
        types.ts
        pegLayout.ts
        physics.ts
        gameLoop.ts
      canvas/
        GameCanvas.tsx
        draw.ts
      config/
        board.ts
      state/
        GameContext.tsx
        reducer.ts
        storage.ts
      ui/
        MainMenu.tsx
        Hud.tsx
        UpgradesModal.tsx
        PauseOverlay.tsx
        SummaryOverlay.tsx
        Button.tsx
      audio/
        synth.ts
      monetization/
        ads.ts
    src/__tests__/
      physics.test.ts
      pegLayout.test.ts
      reducer.test.ts
```

Everything outside `game/` is unrelated to this project.

---

## 9. Open questions (resolved before SPEC-001 is final)

- Balls per round: **15** (locked v1).
- One active ball at a time in v1; multi-drop upgrade queues balls
  back-to-back with a 150ms stagger, not simultaneous physics.
- Bucket layout: **7 buckets**, multipliers `[8, 3, 1, 0.5, 1, 3, 8]`
  (symmetric, risk/reward edges).

---

## 10. Acceptance criteria (project-wide)

The project is "SPEC-000 compliant" when, independent of any individual
feature spec:

- [ ] `npm run dev` boots a page that reaches the `menu` state.
- [ ] `npm run build` produces a static bundle that works when served
      from any static host.
- [ ] `npm run test` runs Vitest unit tests and passes.
- [ ] Persisted state survives a page refresh.
- [ ] No console errors on load, drop, pause, upgrade purchase, or
      return to menu.
