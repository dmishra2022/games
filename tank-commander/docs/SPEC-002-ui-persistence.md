# SPEC-002 — UI, State, Persistence

**Status:** Draft → Implemented
**Scope:** Phase 2 of `master_prompt.md` applied to Tank Commander. Converts the raw engine (SPEC-001) into a playable round: menus, HUD, meta-shop, overlays, pause, persistence. No new gameplay mechanics beyond what SPEC-001 already defines.

---

## 1. UI topology

The React tree is `GameProvider` → `App` → one of the UI screens below, plus the always-mounted `GameCanvas` once the player is in a run.

```
<GameProvider>
  <App>
    <GameCanvas />                 (active only while phase === 'playing')
    ├── <MainMenu />               (phase === 'menu')
    ├── <PauseOverlay />           (phase === 'paused')
    ├── <DefeatOverlay />          (phase === 'defeat')
    ├── <VictoryOverlay />         (phase === 'victory')
    ├── <WaveBanner />             (shown ~1.5s after WAVE_CLEARED)
    ├── <MetaShop />               (phase === 'shop')
    └── <Hud>                      (phase === 'playing' or 'paused')
          <StatusRow />
          <Joystick side="left" /> (touch-only)
          <Joystick side="right" />
          <FireButton />
          <PauseButton />
    </Hud>
  </App>
</GameProvider>
```

All overlays are plain `<div>`s absolutely positioned over the canvas container; the canvas itself only re-mounts when `runId` changes (new run).

---

## 2. State machine

```ts
type Phase =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'defeat'
  | 'victory'
  | 'shop';
```

Transitions (the engine never changes `phase` directly; it emits `EngineEvent`s and the reducer decides):

| From       | Event / action           | To         |
| ---------- | ------------------------ | ---------- |
| menu       | `START_RUN`              | playing    |
| menu       | `OPEN_SHOP`              | shop       |
| shop       | `CLOSE_SHOP`             | menu       |
| playing    | `PAUSE`                  | paused     |
| paused     | `RESUME`                 | playing    |
| paused     | `QUIT_TO_MENU`           | menu       |
| playing    | engine `PLAYER_DIED`     | defeat     |
| defeat     | `RETURN_TO_MENU`         | menu       |
| defeat     | `REWARDED_REPAIR` (SPEC-004) | playing (partial repair) |
| playing    | engine `ARENA_CLEARED` on last arena | victory |
| victory    | `RETURN_TO_MENU`         | menu       |

`QUIT_TO_MENU` discards the current run; `RETURN_TO_MENU` collects pending credits first.

---

## 3. Reducer shape

```ts
type AppState = {
  phase: Phase;
  runId: number;             // bumped on each new run → remounts GameCanvas
  credits: number;           // persistent soft-currency
  meta: MetaState;           // persistent upgrade levels
  settings: { sfx: boolean; reducedMotion: boolean };
  // Transient (re-derived from engine events each frame via SYNC_FROM_WORLD)
  hud: {
    hp: number; maxHp: number;
    reload: number; reloadTime: number;
    arenaIndex: number;
    wave: number; wavesPerArena: number;
    enemiesLeft: number;
    kills: number;
  };
  waveBanner: { wave: number; shownAt: number } | null;
  arenaRunCredits: number;   // credits earned during current run (pending commit)
  lastPlayedAt: number;      // for display only
};

type Action =
  | { type: 'START_RUN' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'QUIT_TO_MENU' }
  | { type: 'RETURN_TO_MENU' }
  | { type: 'OPEN_SHOP' }
  | { type: 'CLOSE_SHOP' }
  | { type: 'BUY_META'; key: keyof MetaState }
  | { type: 'TOGGLE_SFX' }
  | { type: 'TOGGLE_REDUCED_MOTION' }
  | { type: 'SYNC_FROM_WORLD'; hud: AppState['hud'] }
  | { type: 'ENGINE_EVENT'; event: EngineEvent }
  | { type: 'REWARDED_REPAIR_APPLIED' };          // SPEC-004
```

Engine → reducer mapping (`ENGINE_EVENT`):
- `TANK_DESTROYED` with `side==='enemy'` → `arenaRunCredits += CREDITS.kill[kind]`.
- `WAVE_CLEARED` → `arenaRunCredits += waveClearBase + waveClearPerWave*(wave-1)`; sets `waveBanner`.
- `ARENA_CLEARED` → `arenaRunCredits += CREDITS.arenaClear`; if last arena, add `CREDITS.victory` + phase → `victory`.
- `PLAYER_DIED` → phase → `defeat`.

Credits are committed to persistent `credits` on `RETURN_TO_MENU`, `QUIT_TO_MENU`, or `TOGGLE` events that leave the run.

---

## 4. Persistence

Key: `tank-commander:v1`.

```ts
type Persisted = {
  v: 1;
  credits: number;
  meta: MetaState;
  settings: { sfx: boolean; reducedMotion: boolean };
  lastPlayedAt: number;
};
```

- Writes are debounced (250 ms) and also forced on `visibilitychange: hidden` and `beforeunload`.
- Read in `GameProvider` initializer; on parse failure, reset to defaults. No partial migration in v1.

---

## 5. HUD contents (desktop + mobile)

Top bar (absolute):
- Left: `WAVE n/5` and `ARENA n/3`.
- Center: HP bar (red→amber at ≤33%), with numeric readout.
- Right: Reload indicator + credits earned in the run + pause button.

Mobile-only: on-screen left stick (drive+hull-turn), right stick (aim), fire button. Auto-fire toggle in Settings.

Pause button triggers `PAUSE`.

---

## 6. Menus

**Main menu**
- Game title "TANK COMMANDER" + subtitle.
- `DEPLOY` → `START_RUN`.
- `WORKSHOP` → `OPEN_SHOP`.
- Settings row (sfx, reduced motion toggles).

**Pause overlay**
- `RESUME`, `QUIT TO HQ`.
- Shows wave/arena, HP.

**Defeat overlay**
- "YOU WERE DESTROYED"
- Credits earned this run, cumulative credits.
- `RETURN TO HQ`.
- SPEC-004 slot: rewarded-ad `REPAIR AND CONTINUE` button if offered.

**Victory overlay**
- "CAMPAIGN COMPLETE"
- Final credits + bonus.
- `RETURN TO HQ`.

**Meta shop**
- One card per `MetaKey` (hp, damage, reload, armor) with label, description, effect, cost, current level, and BUY button.
- Max level 5 each; disabled at cap or insufficient credits.

**Wave banner**
- Centered strip `WAVE n` with sub-text `INCOMING` for 2 seconds.

---

## 7. Mobile controls

Dual-stick with dead-zone 0.12, radius 60 px. Right stick doubles as aim + fire-while-held. Buttons use `touchstart`/`touchend` only (no `pointerdown` to avoid synthetic mouse events on iOS).

Reduced motion:
- Shake disabled (fx.reducedMotion handles this).
- Wave banner fades instead of slides.

---

## 8. Tasks

- [x] 2.1 Reducer in `state/reducer.ts` + context `state/GameContext.tsx` + persistence in `state/storage.ts`.
- [x] 2.2 HUD, menus, overlays.
- [x] 2.3 `MetaShop` using `engine/meta.ts`.
- [x] 2.4 Mobile joystick + fire button.
- [x] 2.5 Wire `GameCanvas` → reducer via `onEvent`/`onSyncFrame`.

---

## 9. Acceptance

- Start-to-death-to-restart loop completes without reloading the page.
- Credits accumulate across runs and purchases persist across page reloads.
- Pausing stops the simulation (no AI movement, no shells moving).
- Clearing all 3×5 waves reaches the Victory screen.
