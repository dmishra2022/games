# SPEC-003 — Polish & Audio

**Status:** Draft → Implemented
**Scope:** Phase 3 of `master_prompt.md`. Grimy, chunky "diesel + smoke" feel. Visual effects (screen shake, muzzle flash, tread decals, smoke, vignette, damage flash) and synthesised Web Audio. No new gameplay changes.

---

## 1. Visual direction

- Palette: `tc-bg` (near-black olive), `tc-amber` muzzle highlights, `tc-rust` for warnings, `tc-blood` for HP loss, `tc-ash` for walls.
- Scene has a subtle vignette during combat and a hard red vignette pulse (240 ms) whenever the player takes damage.
- Enemy tanks hue-shift per kind (grunt crimson, sniper violet-pink, flanker orange-rust, heavy deep purple) so the player can read threats at a glance even with reduced motion.
- Shells have a short motion-blur streak at speed; impacts emit radial dust + inner smoke puffs.
- Tread decals fade over ~1.5 s, orienting to the hull angle.
- Screen shake uses trauma-squared magnitude (Jonas Tyroller style). Max 10 px.
- All effects are muted when `prefers-reduced-motion` or the in-game toggle is on.

## 2. Audio direction

- Pure Web Audio, no asset files.
- Unlocked on the first user gesture (START_RUN or BUY_META).
- Volume ducked by 25% while paused.

### Sfx table

| Event             | Shape                        | Freq (Hz) | Duration | Gain  |
| ----------------- | ---------------------------- | --------- | -------- | ----- |
| Player fire       | square 180 → 100, FM punch   | 180       | 0.18 s   | 0.22  |
| Enemy fire        | square 140 → 80              | 140       | 0.18 s   | 0.14  |
| Explosion         | filtered noise burst         | ~140 LP   | 0.35 s   | 0.28  |
| Tank hit (player) | sawtooth 200 → 60            | 200       | 0.15 s   | 0.26  |
| Tank destroyed    | noise + 60 Hz sine           | 60        | 0.45 s   | 0.32  |
| Wall destroyed    | short noise, hp filter       | 2 kHz LP  | 0.12 s   | 0.18  |
| Wave cleared      | triad pad (A2, C#3, E3)      | —         | 0.6 s    | 0.20  |
| UI click          | triangle 440 → 320           | 440       | 0.07 s   | 0.14  |

### Music

Looping atmospheric drone during play:
- Sawtooth @ 110 Hz, −18 dB.
- Low-pass @ 700 Hz with slow LFO on cutoff (0.08 Hz).
- Sine @ 55 Hz for ground rumble, −24 dB.
- Pauses when `phase !== 'playing'`.

## 3. Modules

- `audio/synth.ts` — AudioContext, sfx functions, music stop/start, reactive on `settings.sfx`.
- `canvas/fx.ts` already holds particles/trauma/tread (added in SPEC-001). Extends with `damageFlashUntil`.
- `canvas/draw.ts` consumes new flash state and the vignette.

## 4. Tasks

- [x] 3.1 Expand `fx.ts` with damage flash state.
- [x] 3.2 Hook engine events in `GameCanvas` to sfx + fx triggers.
- [x] 3.3 `audio/synth.ts` with lazy unlock + settings-aware volume + ducking.
- [x] 3.4 Vignette and reduced-motion compliance in `draw.ts`.

## 5. Acceptance

- First click/tap unlocks audio within 100 ms.
- Explosions shake the camera and spawn ≥16 particles (fewer in reduced motion).
- SFX toggle persists and silences future sounds immediately.
- No visible CSS jank or clipped text on 360 × 640 viewports.
