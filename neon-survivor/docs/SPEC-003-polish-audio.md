# SPEC-003 — Visual Polish and Audio

Status: draft → active
Depends on: SPEC-000..002
Phase: 3

Goal: make the arena feel alive — particles, screen shake, damage
flashes, neon glow — and add synthesized SFX for every meaningful
event. No external assets.

---

## 1. Visual polish

### 1.1 Entity glow

- Player: shadowBlur 14, cyan.
- Enemies: shadowBlur 8, color per kind.
- Bullets: shadowBlur 6, white.
- Orbs: shadowBlur 10, lime.

### 1.2 Trails

- Player trail: 6 fading previous positions, drawn under the player.
- Bullet trail: single slim streak behind the bullet (cheap; drawn
  by elongating its path by `v * 0.025`).

### 1.3 Particles

Object pool of 256 particles. Spawn events:

- Enemy killed: 10 particles, speed 80..220, color = enemy color,
  life 300..600ms.
- Player hurt: 14 particles, speed 60..200, color red, life
  350..600ms.
- Orb collected: 6 small particles, lime, life 200..300ms.
- Level up: radial burst of 24, cyan + lime mix, life 450..700ms.

Gravity-free; linear decay.

### 1.4 Screen shake

- `trauma` value 0..1; decays exponentially (half-life ~120ms).
- On player hurt: `trauma += 0.5`.
- On level up: `trauma += 0.3`.
- Camera position offset by `trauma^2 * (sin(f*t), cos(f*t)) *
  12 u`.

### 1.5 Damage flash

- Player hurt triggers a red radial vignette for 180ms (CSS DOM
  layer over canvas).

### 1.6 Reduced motion

- `prefers-reduced-motion: reduce` disables:
  - Trails
  - Particles beyond a single flash
  - Screen shake (`trauma` is clamped to 0)
  - Damage vignette (fades instantly)

---

## 2. Audio

File: `audio/synth.ts`.

```ts
export function initAudio(): void;
export function setMuted(m: boolean): void;
export function playShot(): void;
export function playHit(): void;
export function playKill(): void;
export function playPickup(): void;
export function playHurt(): void;
export function playLevelUp(): void;
export function playUiClick(): void;
```

Master gain 0.15. `initAudio()` called on first user gesture.

| Event | Voice |
|-------|-------|
| Shot (throttled) | triangle 880 → 1100, 50ms |
| Enemy hit | square 220 → 180, 30ms, tiny |
| Enemy kill | sine chord 440+660, 180ms |
| Pickup | triangle 1200 → 1600, 50ms |
| Player hurt | sawtooth 180 → 90, 250ms |
| Level up | sine 440 → 880, 350ms |
| UI click | triangle 500, 30ms |

Shot sound is throttled to at most 20 Hz because the Blaster can
fire that often with upgrades.

---

## 3. Task breakdown

| ID | Task |
|----|------|
| 3.1 | Finalize spec |
| 3.2 | `canvas/draw.ts` v2: glow, trails, particle pool |
| 3.3 | Screen shake + camera offset |
| 3.4 | `audio/synth.ts` + wire into engine events |
| 3.5 | CSS damage vignette + reduced-motion handling |
