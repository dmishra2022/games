# SPEC-001 — Core Engine Loop

Status: draft → active
Depends on: `SPEC-000-master.md`
Phase: 1

Goal: produce the minimum playable arena with one player tank, one
arena, one wave of AI tanks, shell physics, explosions, and
destructible walls. Placeholder visuals only.

---

## 1. Scope

In scope:

- Fixed-timestep loop with sub-stepping (same shape as other games).
- Entities: `Tank`, `Shell`, `Wall`, `Explosion`, `World`.
- Hull + turret independent rotation; forward/back drive; wall
  collisions via circle-vs-AABB.
- Reload timer and shell spawn.
- Shell flight, AABB vs circle collisions with walls, circle vs
  circle with tanks, explosion AoE damage with falloff.
- Wall destruction when HP ≤ 0 for destructible walls.
- Wave system: when all enemy tanks of the current wave are
  destroyed, 2s banner then next wave; after last wave, emit
  `ARENA_CLEARED`.
- One built-in arena and one placeholder wave for v1 end-to-end
  smoke test. SPEC-002 wires in all three arenas and full wave
  progression.
- 3 enemy AI archetypes: grunt, sniper, flanker.

Out of scope (deferred):

- Menus, HUD, meta shop, persistence — SPEC-002.
- Polish, muzzle flash, smoke trails — SPEC-003.
- Audio — SPEC-003.
- Ads — SPEC-004.

---

## 2. World coordinate system

- Virtual arena is 1200 × 800 world units. Walls define the border.
- Camera follows the player with soft smoothing and lead based on
  velocity. Camera is clamped so it doesn't scroll past arena edges.
- DPR capped at 2.

---

## 3. Entities

### 3.1 Tank

```ts
type TankSide = 'player' | 'enemy';
type EnemyKind = 'grunt' | 'sniper' | 'flanker' | 'heavy';

type Tank = {
  active: boolean;
  id: number;
  side: TankSide;
  kind: EnemyKind | 'player';
  p: Vec2;
  v: Vec2;           // cached linear velocity
  hullAngle: number; // radians
  turretAngle: number;
  hullTurnRate: number;    // rad/s
  turretTurnRate: number;  // rad/s
  driveSpeed: number;      // u/s forward
  reverseSpeed: number;    // u/s reverse
  r: number;               // collision radius
  hp: number;
  maxHp: number;
  reload: number;          // seconds until next shot
  reloadTime: number;
  shellDamage: number;
  shellSpeed: number;
  armorMul: number;        // damage taken multiplier
  // AI control (ignored for player).
  aiState: AiState;
  aiMemory: AiMemory;
  // Last input for the frame (set by player code or AI).
  input: TankInput;
};

type TankInput = {
  drive: number;        // -1..1 (forward/reverse)
  hullTurn: number;     // -1..1 (left/right)
  turretTargetX: number;
  turretTargetY: number;
  fire: boolean;        // request to fire this frame
};
```

### 3.2 Shell

```ts
type Shell = {
  active: boolean;
  p: Vec2;
  v: Vec2;
  r: number;         // 3
  dmg: number;
  ownerId: number;   // tank id that fired (prevents self-hit until N frames)
  ownerSide: TankSide;
  life: number;      // seconds remaining
  spawnCooldown: number; // seconds remaining during which owner is immune
};
```

### 3.3 Wall

```ts
type WallKind = 'rock' | 'crate';
type Wall = {
  active: boolean;
  kind: WallKind;
  // Axis-aligned bounds.
  x0: number; y0: number; x1: number; y1: number;
  hp: number;    // Infinity for 'rock'
};
```

### 3.4 Explosion (transient event for FX; dealt immediately)

Not a persistent entity; damage resolved inline in `resolveShellHit`.
Visual lifetime is handled by SPEC-003 particles.

### 3.5 World

```ts
type World = {
  time: number;
  arenaW: number; arenaH: number;
  tanks: Tank[];     // player at index 0
  shells: Shell[];   // pool
  walls: Wall[];
  wave: number;      // 1-based within an arena
  arenaIndex: number;// 0..2
  waveClearedAt: number | null; // seconds; when non-null, 2s banner before next wave
  pending: EngineEvent[];
  nextTankId: number;
  playerKills: number;
};
```

---

## 4. Constants

```ts
export const PLAYER = {
  r: 16, hp: 100, hullTurnRate: 2.2, turretTurnRate: 3.2,
  driveSpeed: 90, reverseSpeed: 55,
  reloadTime: 1.2, shellDamage: 30, shellSpeed: 360,
};

export const ENEMY = {
  grunt:   { r: 16, hp: 60,  hullTurnRate: 1.8, turretTurnRate: 2.4,
             driveSpeed: 75,  reverseSpeed: 45, reloadTime: 1.8,
             shellDamage: 18, shellSpeed: 320 },
  sniper:  { r: 15, hp: 45,  hullTurnRate: 1.5, turretTurnRate: 1.8,
             driveSpeed: 55,  reverseSpeed: 35, reloadTime: 3.2,
             shellDamage: 32, shellSpeed: 460 },
  flanker: { r: 13, hp: 35,  hullTurnRate: 3.0, turretTurnRate: 3.2,
             driveSpeed: 130, reverseSpeed: 90, reloadTime: 1.1,
             shellDamage: 12, shellSpeed: 300 },
  heavy:   { r: 22, hp: 180, hullTurnRate: 1.2, turretTurnRate: 1.6,
             driveSpeed: 60,  reverseSpeed: 35, reloadTime: 2.4,
             shellDamage: 36, shellSpeed: 340 },
};

export const SHELL = {
  r: 3,
  life: 1.8,
  // Seconds after spawn during which owner can't be hit (prevents
  // self-detonation at muzzle).
  ownerImmunity: 0.08,
  explosionRadius: 24,
};

export const MAX = { tanks: 16, shells: 48, walls: 64 };
```

---

## 5. Simulation algorithm

```
stepWorld(world, dt):
  dt = min(dt, 1/30)
  while dt > 0:
    sdt = min(dt, 1/120)
    for each alive tank: computeInput(tank, world)   // player's is pre-set
    for each alive tank: integrateTank(tank, sdt)    // turn hull, drive
    resolveTankWallCollisions(world)
    resolveTankTankCollisions(world)
    for each alive tank: rotateTurret(tank, sdt)
    for each alive tank: handleFire(tank, world)
    integrateShells(world, sdt)
    resolveShellCollisions(world)
    updateWaveState(world, sdt)
    world.time += sdt
    dt -= sdt
```

### 5.1 Tank drive

- `hullAngle += hullTurnRate * input.hullTurn * sdt`
- Forward unit vector `fx = cos(hullAngle), fy = sin(hullAngle)`
- `speed = input.drive >= 0 ? driveSpeed : reverseSpeed`
- `v = fx * input.drive * speed, fy * input.drive * speed`
- `p += v * sdt`
- After position update, resolve collisions.

### 5.2 Tank ↔ wall collisions

Walls are AABBs. Circle-AABB resolution: find nearest point on the
AABB to the circle center; if distance < radius, push the circle
out along the normal by `radius - dist` and zero the normal
component of velocity.

### 5.3 Tank ↔ tank collisions

Circle-circle: equal push, split evenly.

### 5.4 Turret rotation

Targeted angle = atan2(target - p). Rotate towards target angle at
`turretTurnRate * sdt` clamped by shortest-arc delta.

### 5.5 Fire

If `reload <= 0` and `input.fire`:

- Spawn one shell at `p + (cos turretAngle, sin turretAngle) * (r + 6)`
  with velocity `(cos, sin) * shellSpeed`.
- Set `reload = reloadTime`.
- Emit `SHELL_FIRED` event.

### 5.6 Shell lifecycle

- Integrate position; decrement `life`, `spawnCooldown`.
- If `life <= 0`, deactivate silently.
- If AABB overlap with a wall: resolve impact — damage wall by
  `shellDamage`, explode at impact, deactivate shell. Indestructible
  walls still absorb the shell.
- If circle overlap with a tank (and not owner during immunity):
  explode at shell position, deactivate.

### 5.7 Explosion

- Damage all tanks whose center is within `explosionRadius`.
- Falloff: `dmgDealt = shellDmg * (1 - clamp(d / radius, 0, 1))`
- Ignore `armorMul` scaling for hull vs hull (apply armor only on
  player taking damage, see SPEC-002).
- Walls within radius are not affected (walls are only damaged by
  direct impact — simpler, feels tactical).
- Emit `TANK_HIT { id, dmg }` per tank. If `hp <= 0`, mark inactive
  and emit `TANK_DESTROYED { id, kind, side }`. If it was a player,
  also emit `PLAYER_DIED`.

### 5.8 Wave state

```
if all enemy tanks destroyed and waveClearedAt == null:
  waveClearedAt = world.time
  emit WAVE_CLEARED { wave }
if waveClearedAt != null and world.time - waveClearedAt >= 2.0:
  waveClearedAt = null
  if wave < lastWaveOfArena:
    spawnWave(world, wave + 1)
    wave += 1
  else:
    emit ARENA_CLEARED { arenaIndex }
```

For Phase 1 we hard-code one arena and one wave (grunts) to validate
end-to-end. SPEC-002 wires arena rotation.

---

## 6. AI archetypes

Each tank's AI runs every sub-step. Memory holds last decision
timestamp to avoid jitter.

### 6.1 Grunt

- Move: pursue player; maintain distance 120..220.
- Turret: aim at player's predicted position (`playerPos + playerVel *
  0.15`).
- Fire: whenever reload is ready AND the turret is within ±8° of
  the aim direction AND no wall line-of-sight blocker (simple
  raycast from muzzle to target against AABB walls).

### 6.2 Sniper

- Move: strafe slowly; if player is < 300 units away, back off; if
  > 500, close.
- Turret: same aim; waits for ±4° accuracy before firing.
- Fire: standard reload gate; emphasizes patience from long reload.

### 6.3 Flanker

- Move: dash around the player at distance 100..160 trying to pass
  right side of them.
- Turret: snap-aim; fires often, lower accuracy requirement ±12°.

### 6.4 Heavy

- Move: slow pursue, keep distance 150..250.
- Turret: ±6°; fires through walls if destructible (shells still
  blocked by indestructible rocks).

---

## 7. Engine events

```ts
type EngineEvent =
  | { type: 'SHELL_FIRED'; ownerId: number; ownerSide: 'player' | 'enemy'; p: Vec2 }
  | { type: 'EXPLOSION'; p: Vec2; radius: number; ownerSide: 'player' | 'enemy' }
  | { type: 'TANK_HIT'; id: number; side: TankSide; dmg: number; hp: number }
  | { type: 'TANK_DESTROYED'; id: number; kind: Tank['kind']; side: TankSide }
  | { type: 'WALL_DESTROYED'; x0: number; y0: number; x1: number; y1: number }
  | { type: 'WAVE_CLEARED'; wave: number }
  | { type: 'ARENA_CLEARED'; arenaIndex: number }
  | { type: 'PLAYER_DIED' };
```

---

## 8. Module contracts

### 8.1 `engine/types.ts`

All types declared above.

### 8.2 `engine/math.ts`

Pure helpers:

```ts
export function shortestAngleDiff(a: number, b: number): number;
export function rotateToward(current: number, target: number, maxDelta: number): number;
export function circleAabb(cx: number, cy: number, r: number, aabb: {x0,y0,x1,y1}): { overlap: number; nx: number; ny: number } | null;
export function rayAabb(x: number, y: number, dx: number, dy: number, maxT: number, aabb): number | null;
```

### 8.3 `engine/world.ts`

```ts
export function createWorld(opts: { arenaIndex: number; meta: MetaState }): World;
```

Builds world + player + first wave for given arena.

### 8.4 `engine/tank.ts`

```ts
export function spawnTank(world: World, args: SpawnTankArgs): Tank | null;
export function integrateTank(tank: Tank, sdt: number): void;
export function rotateTurret(tank: Tank, sdt: number): void;
export function handleFire(tank: Tank, world: World): void;
```

### 8.5 `engine/shells.ts`

```ts
export function spawnShell(world: World, args: SpawnShellArgs): void;
export function integrateShells(world: World, sdt: number): void;
export function resolveShellCollisions(world: World): void;
```

### 8.6 `engine/walls.ts`

```ts
export function createWall(x0: number, y0: number, x1: number, y1: number, kind: WallKind): Wall;
export function damageWall(wall: Wall, dmg: number): void;
```

### 8.7 `engine/ai.ts`

```ts
export function updateAi(tank: Tank, world: World, sdt: number): void;
```

Branches by `tank.kind`.

### 8.8 `engine/arenas.ts`

```ts
export function buildArena(index: number): { walls: Wall[]; playerSpawn: Vec2; enemySpawns: Vec2[] };
```

Three fixed arenas with distinctive wall layouts (1 open, 1 maze,
1 corridors).

### 8.9 `engine/waves.ts`

```ts
export function waveDefForArena(arenaIndex: number, wave: number): EnemyKind[];
export function spawnWave(world: World, wave: number): void;
```

### 8.10 `engine/step.ts`

```ts
export function stepWorld(world: World, dt: number): EngineEvent[];
export function applyPlayerInput(world: World, input: Partial<TankInput>): void;
```

---

## 9. Acceptance criteria

- [ ] Player tank drives smoothly; hull turns at `hullTurnRate`,
      turret at `turretTurnRate`.
- [ ] Shells spawn at the muzzle, fly, and impact tanks or walls.
- [ ] Explosions deal damage with falloff and emit TANK_HIT events.
- [ ] Destructible walls can be shot down; indestructible ones absorb
      shells.
- [ ] When all enemies are dead, a `WAVE_CLEARED` event fires; after
      2s, the next wave spawns (or `ARENA_CLEARED`).
- [ ] Unit tests cover: `shortestAngleDiff`, `rotateToward`,
      `circleAabb`, shell spawning + fire cadence, wave definitions.
- [ ] No React re-renders inside the rAF loop (sim lives in refs).
- [ ] Playable in `npm run dev`: player can clear the first wave.

---

## 10. Manual QA checklist

1. `npm run dev` → tank spawns in arena.
2. `W` drives forward; `S` reverses; `A/D` rotate hull.
3. Mouse cursor controls turret; it tracks smoothly.
4. Left-click fires one shell; reload gauge prevents spam.
5. Shoot a destructible crate — it breaks after ~2 hits.
6. Shoot a rock — shell explodes, rock remains.
7. Shoot an enemy tank — HP depletes; after enough hits, tank is
   destroyed and emits a destroyed event.
8. After clearing the wave, 2s banner then next wave spawns.
9. Driving into a wall doesn't tunnel through it.

---

## 11. Task breakdown

| ID | Task |
|----|------|
| 1.1 | Scaffold Vite + React + TS + Tailwind + Vitest in `game/tank-commander/` |
| 1.2 | Finalize this file |
| 1.3 | Implement `types`, `constants`, `math` + math tests |
| 1.4 | Implement `world`, `tank`, `shells`, `walls` + unit tests |
| 1.5 | Implement `ai` (grunt first, then sniper/flanker/heavy) + light tests |
| 1.6 | Implement `arenas` and `waves` + tests for wave definitions |
| 1.7 | Implement `step` and a minimal `GameCanvas` shell that runs end-to-end |
