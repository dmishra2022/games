# SPEC-000 — Tank Commander Master Specification

Status: draft → active
Project: `game/tank-commander/`

Root spec for a top-down, browser-based tank combat game with a
grimy, war-torn aesthetic. Player drives a single tank with
independent hull and turret, fires explosive shells, uses cover, and
clears waves of AI tanks across three arenas. Credits earned buy
permanent meta-upgrades. No backend, no external assets.

Follows the four-phase workflow from `game/master_prompt.md`:

1. Core engine (SPEC-001)
2. UI + persistence (SPEC-002)
3. Polish + audio (SPEC-003)
4. Monetization hooks (SPEC-004)

---

## 1. Vision

Short, tense runs of 5–10 minutes. Tank movement is heavy and
deliberate: the hull turns slowly, the turret turns faster, the
reload gauge punishes greedy shooting. Cover matters. Dying is
real — a single flanking tank can wreck a run. The game should feel
dangerous and loud, not cute. Aesthetic: muted olive / rust / ash
with hot muzzle flashes and burning wrecks for contrast.

Pacing arc per arena:

| Wave | Enemies | Notes |
|------|---------|-------|
| 1 | 2 grunts | Learn aim, drive, fire |
| 2 | 3 grunts | Density check |
| 3 | 2 grunts + 1 sniper | Introduce long-range threat |
| 4 | 1 grunt + 2 flankers | Introduce speed threat |
| 5 (boss wave) | 4 grunts + 1 sniper + 1 heavy | Crescendo |

Three arenas; arenas rotate in order, run ends after all 15 waves
cleared (`victory`) or player tank destroyed (`defeated`).

---

## 2. Glossary

| Term | Definition |
|------|------------|
| Tank | A chassis with HP, hull angle, turret angle, reload timer, AI script (or player input) |
| Hull | The tank body; drives, turns slowly, carries HP |
| Turret | Separately rotating weapon mount; aims and fires |
| Shell | Fast short-lived projectile; on hit creates an explosion |
| Explosion | Instant AoE damage event: radius, falloff, pushback |
| Wall | Static rectangle; destructible (HP) or indestructible |
| Arena | A fixed layout of walls + spawn points |
| Wave | A pre-defined group of enemy tanks that must all be destroyed to advance |
| Meta-upgrade | Persistent upgrade purchased between runs, modifies starting stats |
| Credits | Persistent soft currency; earned from kills + wave clears |

---

## 3. Non-goals (v1)

- No backend, no multiplayer, no accounts, no leaderboards.
- No external art/audio assets; Canvas 2D + Web Audio only.
- No tracked treads physics beyond simple hull-angle driving.
- No fog of war or explicit line-of-sight culling (walls still
  block shells).
- No infantry, no aircraft, no mines.
- No sprite animations — rotations only.

---

## 4. Global non-functional requirements

### 4.1 Performance

- 60 fps on a mid-range phone with up to **12 tanks**, **30 shells**,
  **200 particles** simultaneously, and ~30 walls.
- Single `requestAnimationFrame` loop. Fixed-timestep accumulator at
  1/120s sub-steps; outer `dt` clamped to 1/30s.
- Sim state in plain objects / refs. React re-renders only on HUD
  slice changes (HP, reload, wave, score, phase).

### 4.2 Rendering

- HTML5 Canvas 2D in world units; camera translates + scales to the
  viewport. DPR capped at 2.
- Entities are composed of rotated rectangles and circles; no
  external sprites.
- React DOM + Tailwind for menus, HUD, modals.

### 4.3 Controls

| Platform | Drive | Turret | Fire | Pause |
|----------|-------|--------|------|-------|
| Desktop | W/S forward/reverse, A/D rotate hull | mouse cursor aims | left-click or Space | Esc |
| Mobile | Left joystick: y=drive, x=hull rotate | Right joystick: direction aims turret | Right joystick released with non-zero vector fires if loaded | Pause button |

Alternative desktop scheme: arrow keys mirror WASD. Auto-fire toggle
is a setting (`settings.autoFire`): when on, fires automatically on
reload if turret is pointed near an enemy (±8°).

### 4.4 Responsiveness

- Full-viewport canvas on both desktop and mobile. UI overlays the
  canvas; pause button is ≥44px.

### 4.5 Persistence

Key: `tank-commander:v1`.

```ts
type PersistedState = {
  saveVersion: 1;
  credits: number;
  bestWave: number;           // 1..15
  arenasCleared: number;
  meta: {
    hp: number;      // 0..5 : +20 max HP per level
    damage: number;  // 0..5 : +10% shell damage
    reload: number;  // 0..5 : +8% reload speed
    armor: number;   // 0..5 : incoming damage -8%
  };
  stats: { totalRuns: number; totalKills: number };
  settings: { sfxMuted: boolean; autoFire: boolean };
};
```

Debounced 500ms writes; flush on `visibilitychange: hidden` and
`beforeunload`. Corruption or version mismatch falls back to
defaults.

### 4.6 Accessibility

- Respect `prefers-reduced-motion`: disable screen shake, trail
  effects, and particle bursts beyond one flash.
- `focus-visible` rings on all interactive controls.
- Touch targets ≥44px.
- Audio unlocked on first user gesture.

---

## 5. Game states (FSM)

```
              +----------+
              |   boot   |
              +----+-----+
                   | hydrate
                   v
              +----------+     play       +-----------+
              |   menu   | -------------> |  playing  |
              +----+-----+                +-----+-----+
                   ^                     wave  │
      back         |                     clear │  esc/pause
                   |                      v    v
              +----+-----+         +-----------+
              | victory  |<--all--+|  paused   |
              +----+-----+ waves   +-----------+
                   |         ^
                   | hp=0    |
                   v         |
              +----------+   |
              | defeated |   |
              +----------+   |
                   |         |
                   +-- repair ad -+ (SPEC-004)
```

- `menu`: title, "Deploy", Meta shop, best wave.
- `playing`: arena active.
- `paused`: Esc / pause button.
- `wave-clear`: not a state — handled as a 2s "cleared" banner
  inside `playing` before the next wave spawns.
- `defeated`: run ended. Options: repair (ad), back to menu.
- `victory`: all 15 waves cleared. Return to menu.

---

## 6. Economy

Per-run rewards:

| Source | Credits |
|--------|---------|
| Kill (grunt / flanker) | 3 |
| Kill (sniper) | 5 |
| Kill (heavy) | 10 |
| Wave clear | 15 + 5 × wave index |
| Arena clear | 75 |
| Full victory (all 15) | 250 |

Meta-upgrades (each 5 levels):

| Upgrade | Effect per level | Cost (level L) |
|---------|------------------|----------------|
| HP | +20 starting HP | `80 * (L+1)` |
| Damage | +10% shell damage | `100 * (L+1)` |
| Reload | +8% reload speed | `90 * (L+1)` |
| Armor | incoming damage -8% (multiplicative) | `110 * (L+1)` |

Starting stats at meta all zero: HP 100, shell damage 30, reload
1.2s, armor 1.0× damage taken.

---

## 7. File layout

```
game/
  neon-plinko/            (existing)
  neon-survivor/          (existing)
  tank-commander/
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
        constants.ts
        math.ts
        world.ts
        tank.ts
        shells.ts
        walls.ts
        ai.ts
        arenas.ts
        waves.ts
        step.ts
        meta.ts
      canvas/
        GameCanvas.tsx
        camera.ts
        draw.ts
        fx.ts
      state/
        GameContext.tsx
        reducer.ts
        storage.ts
      ui/
        MainMenu.tsx
        Hud.tsx
        PauseOverlay.tsx
        DefeatOverlay.tsx
        VictoryOverlay.tsx
        MetaShop.tsx
        WaveBanner.tsx
        Joystick.tsx
        Button.tsx
      audio/
        synth.ts
      monetization/
        ads.ts
    src/__tests__/
      math.test.ts
      tank.test.ts
      shells.test.ts
      ai.test.ts
      waves.test.ts
      reducer.test.ts
      ads.test.ts
```

---

## 8. Open questions resolved

- Single shell type (HE) in v1; shell cosmetics vary by shooter kind.
- Shells are blocked by indestructible walls; destructible walls take
  shell damage then collapse.
- Explosion radius 24 u, falloff linear from center.
- Mini-map NOT included in v1.
- Repair from defeat restores 50% HP and keeps current wave + arena
  position.

---

## 9. Project-wide acceptance

- [ ] `npm run dev` boots to the main menu.
- [ ] `npm run build` yields a static bundle.
- [ ] `npm run test` passes all unit tests.
- [ ] A full run — menu → play → clear wave 1 → die → menu — works
      without console errors.
- [ ] Refresh preserves credits, meta levels, best wave.
