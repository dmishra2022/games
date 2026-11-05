# SPEC-000 — Neon Survivor Master Specification

Status: draft → active
Project: `game/neon-survivor/`

Root spec for a mobile-first, browser-based bullet-heaven survivor.
Player moves with WASD / virtual joystick, weapons auto-fire, enemies
swarm in, killing them drops XP orbs, collecting orbs levels you up
and lets you pick one of three upgrades. Runs end when HP hits 0.
Credits earned per run buy permanent meta-upgrades that persist in
`localStorage`.

Follows the same 4-phase SDD workflow as `game/master_prompt.md`:

1. Core engine (SPEC-001)
2. UI + persistence (SPEC-002)
3. Polish + audio (SPEC-003)
4. Monetization hooks (SPEC-004)

---

## 1. Vision

Short, snackable runs of 3–6 minutes. Every 20–30 seconds the player
makes an interesting choice (pick an upgrade). Visually loud neon,
satisfying number scaling, meta progression between runs. No
backend, no assets, single Vite bundle.

Minute-by-minute arc (target):

| Minute | Density | Pace |
|--------|---------|------|
| 0:00–0:30 | Sparse grunts | Learn controls, move, dodge |
| 0:30–1:30 | Groups of 4–6, first upgrade pick | Pop a weapon upgrade; feel power jump |
| 1:30–3:00 | Mixed fast + tank enemies | Decisions matter; kite swarms |
| 3:00–5:00 | Dense swarm, projectile count maxes | "Build" starts to carry the run |
| 5:00+ | Overwhelm; HP chip damage | Push for one more level before death |

---

## 2. Glossary

| Term | Meaning |
|------|---------|
| Run | One attempt from spawn to death |
| Player | The controlled entity; single-stick movement, auto-fire |
| Enemy | AI unit that walks toward the player; has HP + contact damage |
| Bullet | Short-lived projectile spawned by a weapon |
| Weapon | A system that periodically spawns bullets or applies damage |
| XP orb | Pickup dropped by dead enemies; grants XP within pickup radius |
| Level | Integer player stat; each level grants an upgrade pick |
| Upgrade card | In-run choice of 1 of 3 upgrade options at level up |
| Meta-upgrade | Persistent purchase between runs, scales starting stats |
| Credits | Persistent currency; earned per run, spent on meta-upgrades |

---

## 3. Non-goals (v1)

- No backend, no accounts, no leaderboards.
- No external art or audio files; Canvas 2D + Web Audio only.
- No state libraries beyond React Context + `useReducer`.
- No bosses in v1 (difficulty scaling via spawner only).
- No multiplayer.
- No level editor.

---

## 4. Global non-functional requirements

### 4.1 Performance targets

- 60 fps on a 2021 mid-range phone with up to **120 enemies**, **200
  bullets**, **200 XP orbs**, **256 particles** simultaneously.
- Single `requestAnimationFrame` loop; fixed-timestep accumulator
  with sub-steps at 1/120s, outer dt clamped to 1/30s.
- All simulation state is kept in plain objects / arrays stored in
  refs. React re-renders only on HUD-relevant deltas (HP, XP, level,
  elapsed time, phase).

### 4.2 Architecture

```
Input (keyboard, pointer, touch joystick)
          │
          ▼
    GameCanvas (rAF loop)
          │ step()
          ▼
   ┌──────────────────────┐
   │ player / enemies     │
   │ bullets / weapons    │
   │ xp orbs / spawner    │
   │ collisions / damage  │
   └─────┬────────────────┘
         │ events
         ▼
   React Reducer (HUD, level-up picker, phases)
         │
         ├── localStorage (meta, settings, high score)
         └── ad stubs (revive, interstitial)
```

### 4.3 Rendering

- HTML5 Canvas 2D for everything in the arena.
- Camera follows the player with slight lead based on movement
  direction.
- Logical virtual size: canvas is drawn in **world units** scaled to
  CSS px (camera handles translation). DPR capped at 2.
- React DOM + Tailwind for menus, HUD, level-up card picker, pause.

### 4.4 Controls

| Platform | Movement | Pause | Confirm |
|----------|----------|-------|---------|
| Desktop | WASD or arrow keys | Esc | Space / Enter |
| Mobile  | On-screen joystick (bottom-left) | Pause button top-right | Tap card |

Auto-fire is always on. No manual shoot button.

### 4.5 Persistence

Key: `neon-survivor:v1`.

```ts
type PersistedState = {
  saveVersion: 1;
  credits: number;
  bestTimeSeconds: number;
  bestLevel: number;
  meta: {
    hp: number;     // 0..5
    damage: number; // 0..5
    speed: number;  // 0..5
    xpGain: number; // 0..5
  };
  stats: { totalRuns: number; totalKills: number };
  settings: { sfxMuted: boolean };
};
```

Writes debounced 500ms, flushed on `visibilitychange: hidden` and
`beforeunload`. Corruption or version mismatch falls back to
defaults.

### 4.6 Accessibility

- Respect `prefers-reduced-motion`: no screen shake, no particle
  trails, flat enemy death flashes.
- All interactive controls have `focus-visible` rings.
- Touch targets ≥ 44px.

---

## 5. Game states (FSM)

```
                    +----------+
                    |   boot   |
                    +----+-----+
                         │ hydrate persisted
                         ▼
                    +----------+
                    |   menu   |
                    +----+-----+
                   play │       │ meta
                        ▼       ▼
                    +----------+     esc
                    | playing  | ───────▶ paused
                    +----+-----+ ◀───────
                 HP=0 │
                      ▼
                    +----------+
                    | defeated |
                    +----------+
                     back / revive
```

- `menu`: title, "Play", meta-upgrades button, best run, credits.
- `playing`: arena active.
- `levelUp`: not a separate state — overlays `playing` with a modal
  card picker; simulation is paused while open.
- `paused`: Esc / pause button; modal overlay.
- `defeated`: run ended; summary + revive / return to menu.

---

## 6. Economy

Per-run rewards:

| Source | Credits |
|--------|---------|
| Each kill | 1 |
| Each level reached | 10 |
| Each 30 seconds survived | 5 |

Meta-upgrades (each 5 levels):

| Upgrade | Effect per level | Cost (level L) |
|---------|------------------|----------------|
| HP | +20 starting max HP | `60 * (L+1)` |
| Damage | +10% base damage | `80 * (L+1)` |
| Speed | +5% move speed | `70 * (L+1)` |
| XP Gain | +10% XP from orbs | `90 * (L+1)` |

Starting stats at meta all zero: HP 100, damage 10, speed 180 u/s,
xpMultiplier 1.0.

---

## 7. File layout

```
game/
  neon-plinko/            (existing, unrelated)
  neon-survivor/
    index.html
    package.json
    tsconfig.json
    vite.config.ts
    tailwind.config.js
    postcss.config.js
    docs/
      SPEC-000-master.md     (this file)
      SPEC-001-core-engine.md
      SPEC-002-ui-persistence.md
      SPEC-003-polish-audio.md
      SPEC-004-monetization.md
    src/
      main.tsx
      App.tsx
      index.css
      engine/
        types.ts
        world.ts            // factory for initial world state
        player.ts
        enemies.ts
        bullets.ts
        orbs.ts
        weapons.ts
        spawner.ts
        step.ts             // orchestrates per-frame update
        upgrades.ts         // in-run upgrade catalogue + apply
        meta.ts             // meta-upgrade catalogue + apply
        constants.ts
      canvas/
        GameCanvas.tsx
        draw.ts
        camera.ts
      state/
        GameContext.tsx
        reducer.ts
        storage.ts
      ui/
        MainMenu.tsx
        Hud.tsx
        LevelUpOverlay.tsx
        MetaShop.tsx
        PauseOverlay.tsx
        DefeatOverlay.tsx
        Joystick.tsx
        Button.tsx
      audio/
        synth.ts
      monetization/
        ads.ts
    src/__tests__/
      player.test.ts
      enemies.test.ts
      weapons.test.ts
      reducer.test.ts
      upgrades.test.ts
```

---

## 8. Open-questions resolved

- Single weapon (Blaster) at run start. Second weapon (Orbital) is
  unlocked via upgrade pick, not by default.
- Pickup radius starts small (40 u); XP orbs attract within radius
  and seek the player with velocity.
- Revive restores HP to 50% and grants 2 seconds of i-frames.

---

## 9. Project-wide acceptance

- [ ] `npm run dev` boots to a menu state in `game/neon-survivor`.
- [ ] `npm run build` yields a static bundle.
- [ ] `npm run test` passes all unit tests.
- [ ] A full run from menu → play → die → menu works without errors.
- [ ] Refreshing the page preserves credits, best time, meta levels.
