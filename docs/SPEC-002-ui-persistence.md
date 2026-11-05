# SPEC-002 — Interface, State, and Persistence

Status: draft → active
Depends on: `SPEC-000-master.md`, `SPEC-001-core-engine.md`
Phase: 2 (per `game/master_prompt.md`)

Goal: layer menus, HUD, and upgrades on top of the core engine, and
persist all progress to `localStorage` so a page refresh preserves
credits, high score, upgrades, and settings.

---

## 1. Scope

In scope:

- React Context + `useReducer` holding **persisted** app state.
- `localStorage` load on mount, debounced save on change, flush on
  visibility hidden.
- Main Menu, HUD, Upgrades Modal, Pause Overlay, Summary Overlay.
- Engine events (`PEG_HIT`, `BUCKET_LAND`, `DROP_SETTLED`) are routed
  to the reducer to update score, credits, high score, and balls
  remaining.
- Finite ball-per-run budget with refill via credits or SPEC-004 ad
  stub.
- Upgrade effects wired into the sim: `pegBonus` scales peg points,
  `multiDrop` queues extra balls per spawn, `bucketBias` nudges peg
  grid centering slightly.

Out of scope (deferred):

- Visual polish, particles, trail (SPEC-003).
- Audio (SPEC-003).
- Real ads (SPEC-004).

---

## 2. State model

```ts
type GamePhase = 'menu' | 'playing' | 'paused' | 'summary';

type PersistedState = {
  saveVersion: 1;
  credits: number;
  highScore: number;
  upgrades: {
    multiDrop: number;   // 0..5
    pegBonus: number;    // 0..5
    bucketBias: number;  // 0..5
  };
  stats: { totalDrops: number };
  settings: { sfxMuted: boolean };
};

type EphemeralState = {
  phase: GamePhase;
  ballsRemaining: number;
  runScore: number;
  lastCombo: number;
  lastBucketMultiplier: number | null;
  showUpgrades: boolean;
};

type AppState = PersistedState & EphemeralState;
```

Only `PersistedState` fields are serialized. `EphemeralState` is
re-initialized every mount.

### 2.1 Starting values

- `credits`: 0
- `highScore`: 0
- all upgrades at `0`
- `stats.totalDrops`: 0
- `settings.sfxMuted`: false
- `ballsRemaining`: 15 (reset per new session; refill via shop later)

---

## 3. Actions

```ts
type Action =
  | { type: 'START_RUN' }
  | { type: 'RETURN_TO_MENU' }
  | { type: 'OPEN_PAUSE' }
  | { type: 'RESUME' }
  | { type: 'OPEN_UPGRADES' }
  | { type: 'CLOSE_UPGRADES' }
  | { type: 'PEG_HIT'; comboAfter: number }
  | { type: 'BUCKET_LAND'; multiplier: number; runScore: number }
  | { type: 'DROP_SETTLED' }
  | { type: 'DROP_CONSUMED' }
  | { type: 'BUY_UPGRADE'; key: UpgradeKey }
  | { type: 'TOGGLE_SFX' }
  | { type: 'REFILL_BALLS'; amount: number; cost: number }
  | { type: 'RESET_PROGRESS' }
  | { type: 'HYDRATE'; persisted: PersistedState };
```

Reducer invariants:

- `credits` never negative.
- `highScore = max(prev.highScore, lastSettledRunScore)` on
  `BUCKET_LAND`.
- `BUCKET_LAND` adds `floor(runScore * multiplier)` credits.
- `DROP_CONSUMED` decrements `ballsRemaining` (floor at 0). Emitted
  by GameCanvas on `DROP_STARTED`.
- Transitioning to `summary` only happens on `DROP_SETTLED` when
  `ballsRemaining === 0`.

---

## 4. Persistence

### 4.1 Load

- On mount, read key `neon-plinko:v1`.
- If missing → use defaults.
- If present but `saveVersion !== 1` or JSON parse fails → use
  defaults and show a transient banner "Save reset" (banner is
  cosmetic; implemented as temporary state field in Phase 3).

### 4.2 Save

- Writes are debounced 500ms.
- Also flushed synchronously on `document.visibilitychange ===
  'hidden'` and on `beforeunload`.
- Write is wrapped in try/catch; failures logged (quota exceeded,
  private mode) and otherwise ignored.

### 4.3 Migration helper

```ts
function migrate(input: unknown): PersistedState;
```

For v1 it only validates; later versions will chain here.

---

## 5. UI components

### 5.1 Main Menu

Elements:

- Game title ("NEON PLINKO")
- "Play" primary CTA (START_RUN)
- "Upgrades" (OPEN_UPGRADES)
- High-score and credit badges
- SFX toggle switch
- "Reset progress" link (confirm dialog)

### 5.2 HUD (while playing)

Top row (overlay on canvas, non-blocking):

- Run score, left aligned
- Combo badge, center, pulses on peg hit
- Balls remaining, right

Bottom row:

- Credits readout
- "Pause" icon button

Mobile: HUD is a top strip; desktop: top-right side panel.

### 5.3 Upgrades Modal

Three cards: `multiDrop`, `pegBonus`, `bucketBias`.

Each card shows:

- Name + 1-line description
- Current level dots (0..5)
- Next-level effect preview
- Cost (`40 * 2^level`, `50 * 2^level`, `60 * 2^level`)
- "Buy" button (disabled if `credits < cost` or `level >= 5`)

### 5.4 Pause Overlay

- "Resume"
- "Upgrades"
- "Settings" (SFX toggle)
- "Return to Menu"

### 5.5 Summary Overlay

- Shown when balls run out.
- Shows run score, credits earned this session.
- "Refill 5 balls (cost: 25 credits)" button (disabled if
  insufficient).
- "Back to Menu".

---

## 6. Upgrade mechanics

| Upgrade | Max level | Formula effect | Cost (level L) |
|---------|-----------|----------------|----------------|
| `multiDrop` | 5 | +1 ball queued per spawn | `50 * 2^L` |
| `pegBonus` | 5 | peg points = `base * (1 + 0.25 * L)` | `40 * 2^L` |
| `bucketBias` | 5 | peg grid centered X shifts by `0.5 * L` units toward the player's last aim side | `60 * 2^L` |

`multiDrop`: when the player spawns, we queue `multiDrop` additional
balls with a 180ms stagger. The engine still processes one at a time
(SPEC-001 constraint). Queued balls are decremented from
`ballsRemaining` as each actually spawns.

`pegBonus`: GameCanvas reads the current `pegBonus` level from
context on each `DROP_STARTED` and scales points before dispatching
`PEG_HIT`.

`bucketBias`: at `OPEN_UPGRADES` purchase time, the sim config is
re-generated: `gridCenterX = 200 + sign(lastAimDelta) * level * 0.5`.
Marginal effect; justified for simplicity v1.

---

## 7. Engine ↔ reducer wiring

GameCanvas receives:

```ts
type Props = {
  onEvent: (e: EngineEvent) => void;
  pegBonusLevel: number;
  bucketBias: number;
  multiDropLevel: number;
  phase: GamePhase; // paused halts rAF ticks
};
```

Internally when physics emits:

- `DROP_STARTED` → dispatch `DROP_CONSUMED`.
- `PEG_HIT` → dispatch `PEG_HIT`.
- `BUCKET_LAND` → dispatch `BUCKET_LAND`.
- `DROP_SETTLED` → dispatch `DROP_SETTLED` (reducer handles
  queue→next spawn or summary transition).

`phase === 'paused'` → GameCanvas skips `onTick`.

---

## 8. Acceptance criteria

- [ ] Playing works end-to-end: play → drop balls → run out →
      summary → back to menu.
- [ ] Credits and high score survive refresh.
- [ ] Buying an upgrade deducts credits atomically; UI reflects it
      immediately.
- [ ] Mute setting survives refresh.
- [ ] Reset Progress clears localStorage after confirmation.
- [ ] All buttons: `focus-visible`, hover, active, disabled states.
- [ ] Touch targets ≥ 44px on `max-width: 640px`.

---

## 9. Task breakdown

| ID | Task |
|----|------|
| 2.1 | Finalize this spec |
| 2.2 | `state/reducer.ts`, `state/storage.ts`, `state/GameContext.tsx`; unit test reducer |
| 2.3 | Replace engine event console log in `App.tsx` with dispatcher |
| 2.4 | Implement `MainMenu`, `Hud`, `UpgradesModal`, `PauseOverlay`, `SummaryOverlay`, `Button` |
| 2.5 | Wire upgrade effects (pegBonus → score, bucketBias → sim config, multiDrop → spawn queue) |
| 2.6 | Add high-score update + migration helper + flush on visibilitychange |
