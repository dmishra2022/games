# SPEC-001 — Core Engine Loop

Status: draft → active
Depends on: `SPEC-000-master.md`
Phase: 1

Goal: produce the minimum playable arena survivor. Player moves,
weapons auto-fire, enemies spawn and converge, collisions deal
damage, kills drop XP orbs that grant levels, HP=0 ends the run.
Placeholder visuals only.

---

## 1. Scope

In scope:

- Player entity with movement input (WASD + joystick), HP, XP, level.
- Weapon system with one active weapon (Blaster) that auto-fires at
  the nearest enemy.
- Enemy entities with pathing (seek-player), contact damage, HP.
- Bullet pool.
- XP orb pool with magnetic attraction within pickup radius.
- Enemy spawner with time-based difficulty scaling.
- Collisions: bullet↔enemy, player↔enemy (contact tick damage),
  player↔orb (pickup).
- Death condition: HP ≤ 0 emits `PLAYER_DIED`.
- Deterministic-shaped data: pure functions mutate state refs; the
  outer wrapper chooses React vs pure for tests.

Out of scope (deferred):

- UI (menus, HUD, level-up picker) — SPEC-002.
- Visual polish, particles, screen shake — SPEC-003.
- Audio — SPEC-003.
- Ad hooks — SPEC-004.

---

## 2. World coordinate system

- World is an infinite 2D plane (`Vec2` floats). There are no walls.
- Camera follows the player with a dead-zone of 40 u and lead based
  on velocity.
- The visible viewport is defined by the camera and canvas
  dimensions. Rendering in SPEC-003 may also show a pseudo-grid that
  scrolls with the camera.
- Enemy spawner spawns off-screen, `~ R` units from the player (`R =
  max(viewportHalfW, viewportHalfH) + 60`).

Units: 1 unit ≈ 1 pixel on a 400×600 canvas at DPR 1; CSS scaling
handles device variance.

---

## 3. Entities

### 3.1 Player

```ts
type Player = {
  p: Vec2;
  v: Vec2;
  r: number;         // 10
  hp: number;
  maxHp: number;     // base 100 + meta.hp*20
  speed: number;     // base 180 * (1 + meta.speed*0.05)
  xp: number;        // cumulative within current level
  level: number;     // starts at 1
  pickupRadius: number; // base 40
  damageMultiplier: number;   // base 1 + meta.damage*0.1, upgrades extend
  fireRateMultiplier: number; // 1
  projectileCount: number;    // 1
  xpMultiplier: number;       // 1 + meta.xpGain*0.1
  invulnUntil: number;        // seconds; 0 = not invulnerable
  alive: boolean;
};
```

### 3.2 Enemy

```ts
type EnemyKind = 'grunt' | 'fast' | 'tank';
type Enemy = {
  active: boolean;
  kind: EnemyKind;
  p: Vec2;
  v: Vec2;
  r: number;
  hp: number;
  dmg: number;    // per contact tick (every 0.5s)
  speed: number;
  xpReward: number;
  lastContactAt: number; // seconds
};
```

Kind tuning (base at t=0):

| Kind  | r | hp | dmg/tick | speed | xp |
|-------|---|----|----------|-------|----|
| grunt | 10| 10 | 8        | 70    | 2  |
| fast  | 8 | 6  | 6        | 120   | 2  |
| tank  | 16| 40 | 14       | 50    | 6  |

### 3.3 Bullet

```ts
type Bullet = {
  active: boolean;
  p: Vec2;
  v: Vec2;
  r: number;    // 4
  dmg: number;
  pierce: number;      // remaining pierces; 0 = removed after hit
  life: number;        // seconds remaining
  hitSet: Set<number>; // enemy ids already hit (to dedupe pierce)
};
```

### 3.4 XP orb

```ts
type Orb = {
  active: boolean;
  p: Vec2;
  v: Vec2;
  value: number;
  attracting: boolean;
};
```

---

## 4. Constants

File: `engine/constants.ts`.

```ts
export const WORLD = {
  playerRadius: 10,
  playerBaseMaxHp: 100,
  playerBaseSpeed: 180,
  playerBasePickupRadius: 40,
  bulletRadius: 4,
  bulletLife: 1.2,            // seconds
  bulletSpeed: 420,
  bulletBaseDamage: 10,
  blasterBaseInterval: 0.55,  // seconds between shots
  orbitalBaseInterval: 2.5,   // one orb every N seconds? (used in SPEC-002)
  contactTickInterval: 0.5,   // seconds between repeated contact hits
  orbPickupSpeed: 280,
  // Difficulty scaling.
  spawnIntervalStart: 1.6,
  spawnIntervalFloor: 0.25,
  spawnIntervalDecayPerMin: 0.35,
  // How much enemy hp/speed scale over time (per minute).
  enemyHpScalePerMin: 0.35,
  enemySpeedScalePerMin: 0.12,
};

export const MAX = {
  enemies: 160,
  bullets: 256,
  orbs: 256,
};
```

---

## 5. XP curve

```
xpToNextLevel(level) = 10 + 8 * level + 2 * level * level
```

Level 1→2: 20 XP
Level 5→6: 100 XP
Level 10→11: 290 XP

---

## 6. Simulation algorithm (per frame)

Outer function `stepWorld(world, dt)`:

```
dt = min(dt, 1/30)
while dt > 0:
  sdt = min(dt, 1/120)
  updateInput(world, sdt)        // pending input → player.v
  movePlayer(world, sdt)
  moveEnemies(world, sdt)        // seek player
  moveBullets(world, sdt)
  moveOrbs(world, sdt)            // attract if within pickupRadius
  updateWeapons(world, sdt)       // fire if interval elapsed
  resolveCollisions(world)         // bullet↔enemy, player↔enemy, player↔orb
  updateInvulnerability(world, sdt)
  dt -= sdt
```

All collision checks are O(N·M) with small M (bullet count × enemy
count ≤ 256×160 = 40 960 pair checks worst case, well within budget
at 60Hz on JS).

### 6.1 Player movement

Input is a unit `axis` vector in world space (clamped to length 1).
`player.v = axis * player.speed`. Position integrates `p += v * dt`.

### 6.2 Enemy pathing

```
dir = normalize(player.p - enemy.p)
enemy.v = dir * enemy.speed
enemy.p += enemy.v * dt
```

Enemies don't collide with each other (keeps swarms tight).

### 6.3 Weapon: Blaster

Interval between shots = `blasterBaseInterval / fireRateMultiplier`.
On fire:

- Find the nearest enemy to the player (linear scan).
- For `projectileCount` bullets, fire in a cone of total ±8° around
  the aim direction (even spread).
- Each bullet: `dmg = bulletBaseDamage * damageMultiplier`.

### 6.4 Bullet lifecycle

- `life` decrements by dt; when ≤ 0, bullet deactivates.
- On enemy hit, if enemy not in `hitSet`:
  - deal damage, add enemy id to `hitSet`
  - `pierce -= 1`; if `pierce < 0`, bullet deactivates.

### 6.5 Orb pickup

For each orb:

- If distance to player ≤ `pickupRadius`, set `attracting = true`.
- If attracting, `orb.v = normalize(player - orb) * orbPickupSpeed`,
  `orb.p += orb.v * dt`.
- If distance ≤ `player.r + 2`, consume: `player.xp += orb.value *
  player.xpMultiplier`, orb deactivates.

### 6.6 Contact damage

For each enemy overlapping the player (`|p - p| < r_p + r_e`):

- If `player.invulnUntil > now`, skip.
- If `now - enemy.lastContactAt >= contactTickInterval`:
  - `player.hp -= enemy.dmg`
  - `enemy.lastContactAt = now`
  - Emit `PLAYER_HURT`.
- If `player.hp ≤ 0`, mark `player.alive = false`; emit
  `PLAYER_DIED`. Spawner and weapons stop updating.

---

## 7. Spawner

Difficulty scales with run time `t` (seconds).

- Spawn interval `I(t) = max(spawnIntervalFloor, spawnIntervalStart -
  spawnIntervalDecayPerMin * t / 60)`.
- At each tick, decide kind by weighted random:
  - `t < 60s`: 90% grunt, 10% fast, 0% tank
  - `60s ≤ t < 180s`: 60/25/15
  - `t ≥ 180s`: 40/30/30
- Spawn location: random point on a circle of radius `R` around
  player (world units), where `R = 360` (slightly off the largest
  viewport diagonal in v1; SPEC-002 refines when viewport is known).
- At spawn time, scale enemy stats:
  - `hp *= 1 + enemyHpScalePerMin * t / 60`
  - `speed *= 1 + enemySpeedScalePerMin * t / 60`
- If enemy pool full, skip this spawn.

---

## 8. Engine events

```ts
type EngineEvent =
  | { type: 'PLAYER_HURT'; damage: number; hp: number }
  | { type: 'ENEMY_KILLED'; kind: EnemyKind; xpAwarded: number }
  | { type: 'ORB_COLLECTED'; xpGained: number }
  | { type: 'LEVEL_UP'; newLevel: number }
  | { type: 'PLAYER_DIED' };
```

Emitted by `stepWorld` as a flat array per frame.

---

## 9. Module contracts

### 9.1 `engine/types.ts`

Shared types: `Vec2`, `Player`, `Enemy`, `Bullet`, `Orb`,
`EngineEvent`, `World`, `Weapon`, `WeaponKind`.

### 9.2 `engine/world.ts`

```ts
export function createWorld(opts: {
  meta: MetaState;
  now: number;
}): World;
```

Pure factory.

### 9.3 `engine/player.ts`

```ts
export function movePlayer(world: World, dt: number): void;
```

### 9.4 `engine/enemies.ts`

```ts
export function moveEnemies(world: World, dt: number): void;
export function spawnEnemy(world: World, kind: EnemyKind, p: Vec2): void;
```

### 9.5 `engine/bullets.ts`

```ts
export function moveBullets(world: World, dt: number): void;
export function spawnBullet(world: World, args: SpawnBulletArgs): void;
```

### 9.6 `engine/orbs.ts`

```ts
export function moveOrbs(world: World, dt: number): void;
export function spawnOrb(world: World, p: Vec2, value: number): void;
```

### 9.7 `engine/weapons.ts`

```ts
export function updateWeapons(world: World, dt: number, events: EngineEvent[]): void;
```

### 9.8 `engine/spawner.ts`

```ts
export function updateSpawner(world: World, dt: number): void;
```

### 9.9 `engine/step.ts`

```ts
export function stepWorld(world: World, dt: number): EngineEvent[];
export function levelUp(world: World): EngineEvent[];
export function applyInput(world: World, axisX: number, axisY: number): void;
```

### 9.10 `engine/upgrades.ts`

Only the catalogue and type for Phase 1. `applyUpgrade` is a no-op
hook for Phase 1 and is expanded in Phase 2.

---

## 10. Acceptance criteria

- [ ] Player moves smoothly via WASD; velocity normalises diagonal.
- [ ] Blaster fires a bullet at the nearest enemy roughly every
      `blasterBaseInterval` seconds.
- [ ] Bullets damage enemies; enemy HP → 0 deactivates enemy and
      drops an XP orb with the kind's `xpReward`.
- [ ] Orbs attract and pickup inside `pickupRadius`; XP increments.
- [ ] Reaching `xpToNextLevel(level)` XP emits a `LEVEL_UP` event and
      resets XP within level.
- [ ] Contact with an enemy damages the player at most once every
      `contactTickInterval` seconds.
- [ ] Player HP ≤ 0 emits `PLAYER_DIED`; further frames do not spawn
      enemies, don't fire weapons.
- [ ] Spawner respects `MAX.enemies`.
- [ ] Unit tests cover XP curve, weapon cadence, damage application,
      and spawner enemy-kind distribution.

---

## 11. Manual QA checklist

1. `npm run dev` → game canvas appears.
2. WASD moves the player; diagonal movement is same speed as cardinal.
3. Stand still; enemies walk toward you and start damaging you;
   HP ticks down at ~1 hit per 0.5s per touching enemy.
4. Walk away; enemies follow, bullets auto-fire backward (toward the
   now-rearmost enemy).
5. Kill enemies; orbs appear at death positions. Walk over them;
   they attract and vanish.
6. Hit level 2 within ~15 seconds of play.
7. Keep playing until HP reaches 0; player stops moving/firing; a
   `PLAYER_DIED` event logs once to console.

---

## 12. Task breakdown

| ID | Task |
|----|------|
| 1.1 | Scaffold Vite + React + TS + Tailwind + Vitest in `game/neon-survivor/` |
| 1.2 | Finalize numeric defaults (this file) |
| 1.3 | Implement `types.ts`, `constants.ts`, `world.ts` |
| 1.4 | Implement `player.ts`, `enemies.ts`, `bullets.ts`, `orbs.ts`, `weapons.ts`, `spawner.ts`, `step.ts` |
| 1.5 | Vitest unit tests: XP curve, weapon cadence, collision damage, spawner distribution |
| 1.6 | Implement `GameCanvas.tsx`, `draw.ts`, `camera.ts`, `main.tsx` playable shell |
| 1.7 | Wire input (keyboard + touch stub); manual QA runs through acceptance list |
