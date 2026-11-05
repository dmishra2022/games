# SPEC-002 — Interface, State, and Persistence

Status: draft → active
Depends on: `SPEC-000-master.md`, `SPEC-001-core-engine.md`
Phase: 2

Goal: layer menus, HUD, level-up card picker, pause, defeat summary,
and meta-upgrade shop onto the core engine, and persist meta levels +
best run + settings into `localStorage`.

---

## 1. Scope

In scope:

- `GameContext` + `useReducer` holding both persisted and ephemeral
  state.
- `localStorage` load on mount, debounced save, flush on visibility.
- MainMenu, HUD (HP bar, XP bar, level, time, kills), Pause overlay,
  Defeat overlay, Level-up card picker, Meta shop.
- Mobile virtual joystick.
- Pause while level-up overlay is open (simulation stops ticking).
- Reset-progress flow with confirmation.

Out of scope (deferred):

- Visual polish, particles, screen shake — SPEC-003.
- Audio — SPEC-003.
- Ad hooks — SPEC-004.

---

## 2. State model

```ts
type GamePhase = 'menu' | 'playing' | 'paused' | 'defeated';

type PersistedState = {
  saveVersion: 1;
  credits: number;
  bestTimeSeconds: number;
  bestLevel: number;
  meta: { hp: number; damage: number; speed: number; xpGain: number };
  stats: { totalRuns: number; totalKills: number };
  settings: { sfxMuted: boolean };
};

type EphemeralState = {
  phase: GamePhase;
  // Run mirror of world (updated in response to events).
  runTime: number;
  runKills: number;
  runLevel: number;
  runXp: number;         // XP into current level
  runXpNeeded: number;
  hp: number;
  maxHp: number;
  // Level-up overlay queue + current picker choices.
  pendingLevelUps: number;
  currentChoices: UpgradeId[];
  showMetaShop: boolean;
  // Count of in-run upgrades applied, for pickUpgradeChoices filter.
  appliedUpgrades: Partial<Record<UpgradeId, number>>;
};
```

The engine `World` lives outside the reducer in a ref; the reducer
holds the UI-visible slice only. The reducer is updated by engine
events (`PLAYER_HURT`, `ENEMY_KILLED`, `ORB_COLLECTED`, `LEVEL_UP`,
`PLAYER_DIED`) and by UI actions.

---

## 3. Actions

```ts
type Action =
  | { type: 'HYDRATE'; persisted: PersistedState }
  | { type: 'START_RUN' }
  | { type: 'OPEN_PAUSE' } | { type: 'RESUME' }
  | { type: 'OPEN_META_SHOP' } | { type: 'CLOSE_META_SHOP' }
  | { type: 'BUY_META'; key: keyof MetaState }
  | { type: 'TOGGLE_SFX' }
  | { type: 'RESET_PROGRESS' }
  | { type: 'RETURN_TO_MENU' }
  | { type: 'SYNC_RUN'; hp: number; maxHp: number;
      runLevel: number; runXp: number; runXpNeeded: number;
      runTime: number; runKills: number }
  | { type: 'EVENT_PLAYER_HURT'; damage: number }
  | { type: 'EVENT_ENEMY_KILLED' }
  | { type: 'EVENT_ORB_COLLECTED'; xp: number }
  | { type: 'EVENT_LEVEL_UP' }
  | { type: 'PICK_UPGRADE'; id: UpgradeId }
  | { type: 'EVENT_PLAYER_DIED'; timeSurvived: number; kills: number; level: number }
  | { type: 'REVIVE_GRANT' };
```

### 3.1 Key behaviours

- `START_RUN` resets ephemeral state, requests a fresh `World` from
  GameCanvas via a prop-based `runId`.
- Engine events update HP, XP, kills. On `EVENT_LEVEL_UP`, push into
  `pendingLevelUps`. If `currentChoices.length === 0`, roll three
  choices and transition engine ticking to **paused during picker**.
- `PICK_UPGRADE` applies via a callback into the live world ref
  (owned by GameCanvas), decrements `pendingLevelUps`, re-rolls
  choices if still non-zero, else clears choices and resumes.
- `EVENT_PLAYER_DIED` transitions to `defeated`, updates `credits`
  (run reward), `bestTimeSeconds`, `bestLevel`, `stats.totalRuns`.
- `REVIVE_GRANT` (used by SPEC-004 ad path) restores HP to 50% of
  max, applies 2s invuln through the engine ref, and sets phase back
  to `playing`.

### 3.2 Run reward formula

`creditsEarned = kills + 10 * level + floor(timeSeconds / 30) * 5`

---

## 4. Persistence

Key: `neon-survivor:v1`.

- `loadPersisted()` returns a validated `PersistedState` or defaults.
- Debounced 500ms writes; flush on `visibilitychange: hidden` and
  `beforeunload`.
- `migrate(input)` is the single entry point for loading; version
  mismatch → defaults.

---

## 5. UI components

### 5.1 Main Menu (`MainMenu.tsx`)

- Title "NEON SURVIVOR"
- Primary CTA "Play"
- Secondary CTAs: "Upgrades" (opens meta shop), SFX toggle
- Readouts: best time (M:SS), best level, credits
- "Reset progress" (confirm)

### 5.2 HUD (`Hud.tsx`)

Top-left HP bar (filled by `hp/maxHp`).
Top-right time + kills.
Bottom XP bar spanning viewport (filled by `runXp / runXpNeeded`).
Centered `Level N` badge.

Pause button top-right (tappable), ≥44px.

### 5.3 Level-up overlay (`LevelUpOverlay.tsx`)

- Shown while `currentChoices.length > 0`.
- Pauses the engine via `active={false}` on `GameCanvas`.
- 3 large cards side-by-side on desktop, stacked on mobile.
- Each card has label, description, "+Lv X/Max" stacks preview.
- Click or `1`/`2`/`3` keyboard keys picks a card.

### 5.4 Meta shop (`MetaShop.tsx`)

- Modal reachable from main menu.
- 4 upgrades: HP, Damage, Speed, XP Gain.
- Each card shows: label, level dots, next-level effect, cost
  (`costForMeta`), Buy button (disabled when unaffordable or maxed).

### 5.5 Pause overlay (`PauseOverlay.tsx`)

- "Resume", "Main Menu", SFX toggle.

### 5.6 Defeat overlay (`DefeatOverlay.tsx`)

- "Defeated" title + stats (time, level, kills, credits earned).
- Revive button (calls ad hook, SPEC-004).
- Back to menu.

### 5.7 Joystick (`Joystick.tsx`)

- Only visible on touch pointers.
- Fixed-position in bottom-left; emits an `{ax, ay}` unit vector.
- Deadzone 15% of the base radius.

---

## 6. Engine ↔ UI wiring

`GameCanvas` props:

```ts
type Props = {
  meta: MetaState;
  active: boolean;         // false while paused/level-up/defeated
  runId: number;           // changes to force world rebuild
  worldRef?: React.MutableRefObject<World | null>;
  onEvent?: (e: EngineEvent) => void;
  joystick?: { ax: number; ay: number };
};
```

The App:

- Listens for engine events and dispatches reducer actions.
- Throttles `SYNC_RUN` to ~10 Hz so HUD doesn't re-render per frame.
- Pauses engine while `pendingLevelUps > 0 || phase !== 'playing'`.

---

## 7. Acceptance criteria

- [ ] Menu → Play transitions to `playing`.
- [ ] HUD HP, XP, level, time update at least 10 times per second.
- [ ] Level up opens a modal; picking a card applies the upgrade to
      the live world and resumes.
- [ ] Death opens defeat overlay; credits earned are visible and
      added to persisted total.
- [ ] Meta purchases deduct credits atomically; UI reflects immediately.
- [ ] Refresh preserves credits, meta levels, best time, SFX pref.
- [ ] `Esc` toggles pause. `1`/`2`/`3` picks a card.
- [ ] On touch, a joystick appears bottom-left and the player
      responds.

---

## 8. Task breakdown

| ID | Task |
|----|------|
| 2.1 | Finalize this spec |
| 2.2 | `state/reducer.ts`, `state/storage.ts`, `state/GameContext.tsx` + tests |
| 2.3 | `ui/Button`, `MainMenu`, `Hud`, `PauseOverlay`, `DefeatOverlay`, `LevelUpOverlay`, `MetaShop`, `Joystick` |
| 2.4 | App glue: engine events → dispatch; `runId`-based world rebuild; pause/active wiring |
| 2.5 | Run reward formula + migration helper |
