# SPEC-003 — Visual Polish and Audio

Status: draft → active
Depends on: `SPEC-000-master.md`, `SPEC-001-core-engine.md`, `SPEC-002-ui-persistence.md`
Phase: 3 (per `game/master_prompt.md`)

Goal: replace placeholder visuals with a neon aesthetic (glow, trail,
particles, bucket pulses) and add synthesized SFX via Web Audio API.
No external image or audio assets.

---

## 1. Color tokens (Tailwind config)

| Token | Hex | Role |
|-------|-----|------|
| `neon-bg` | `#0b0b16` | board + page background |
| `neon-panel` | `#141428` | modal/menu panels |
| `neon-dim` | `#2a2a44` | borders, deltas |
| `neon-cyan` | `#5ad7ff` | pegs, HUD score |
| `neon-magenta` | `#ff5ad7` | ball, primary CTA |
| `neon-yellow` | `#ffe15a` | credits, highlight |

Already added to `tailwind.config.js` in Phase 2.

---

## 2. Canvas visual rules

- Pegs: filled circle (`neon-cyan`) + outer stroke glow using
  `shadowBlur = 8` and `shadowColor` matching peg color. On hit, peg
  pulses: a transient outer ring that fades over ~250ms.
- Ball: filled circle (`neon-magenta`) with glow, trail of 10 fading
  previous positions.
- Buckets: filled gradient fill based on multiplier (higher = more
  intense neon), text uppercase. When ball lands, bucket pulses
  bright for 400ms.
- Background: subtle vertical gradient from `#0b0b16` → `#120b1c`,
  with a thin horizontal grid every 40 units at 6% alpha.

Reduced motion (`prefers-reduced-motion: reduce`):

- No trail; no particles; peg hit ring is replaced with a 1-frame
  color flash.
- No ball glow (saves fillrate on low-end devices).

---

## 3. Particle pool

- Fixed array of up to 128 particles.
- On peg hit, spawn 6 particles with random angles (full 360°), speed
  60..160 u/s, life 300..500ms, color `neon-cyan`.
- On bucket land, spawn 20 particles upward (angle −45°..−135°),
  speed 120..240 u/s, life 500..900ms, color depending on multiplier
  tier (`neon-yellow` ≥3, `neon-magenta` ≥1, `neon-cyan` <1).
- Updated at the same step rate as the sim (semi-implicit integration
  with gravity 400).

---

## 4. Web Audio synth

A tiny `synth` module exposes:

```ts
export function initAudio(): void;              // called on first user gesture
export function setMuted(muted: boolean): void;
export function playPeg(): void;
export function playBucket(multiplier: number): void;
export function playPurchase(): void;
export function playClick(): void;
```

### 4.1 Voicings

| Event | Oscillator | Freq | Duration | Env |
|-------|-----------|------|----------|-----|
| Peg hit | triangle | 880 Hz slide → 1100 Hz | 60ms | attack 2ms, release 50ms |
| Bucket land (m≥3) | sine chord 440+660+880 | — | 400ms | attack 10ms, release 380ms |
| Bucket land (m<3) | sine 440 | — | 200ms | attack 10ms, release 180ms |
| Purchase | square | 660 → 990 | 150ms | attack 2ms, release 120ms |
| Click | triangle | 440 | 40ms | attack 2ms, release 30ms |

Master gain = 0.15 to protect ears on default device volume.

### 4.2 Unlock

- `AudioContext` is created on first user gesture (any
  `pointerdown`/`keydown` on the document).
- Mute state read from `settings.sfxMuted` reactive to toggle.

---

## 5. Motion polish (DOM)

- Menu entrance: fade-in opacity 0 → 1 over 180ms.
- HUD score and credits: when they change, briefly scale 1.0 → 1.1 →
  1.0 over 180ms using Tailwind `transition-transform`.
- Combo badge pulses on each peg hit (already keyed in Phase 2);
  colorizes brighter at combo ≥ 5.

All animations respect `prefers-reduced-motion`.

---

## 6. Acceptance criteria

- [ ] Ball visibly glows and leaves a trail during a drop.
- [ ] Peg flashes when first hit; no visible flash on duplicate
      contact (because physics dedups).
- [ ] Bucket pulses on land; particles fire upward.
- [ ] SFX plays on peg hit; mute toggle silences everything.
- [ ] With `prefers-reduced-motion` enabled, no trail, no particles,
      no pulses — plain colored draws remain.
- [ ] No audio plays before any user gesture.

---

## 7. Task breakdown

| ID | Task |
|----|------|
| 3.1 | Finalize this spec |
| 3.2 | Tailwind palette (already applied in Phase 2) — verified |
| 3.3 | Rewrite `draw.ts`: glow, trail, particle pool, bucket pulse |
| 3.4 | `audio/synth.ts` + hook into reducer events |
| 3.5 | Motion polish on HUD/menu + reduced-motion branch |
