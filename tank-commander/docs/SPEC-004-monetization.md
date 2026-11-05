# SPEC-004 — Monetization

**Status:** Draft → Implemented
**Scope:** Phase 4 of `master_prompt.md`. Minimal, portal-safe ad surface. Ads are opt-in rewards and lightly placed interstitials; nothing blocks core play.

---

## 1. Placements

| Placement        | Trigger                                   | Reward                         | Frequency cap       |
| ---------------- | ----------------------------------------- | ------------------------------ | ------------------- |
| Rewarded repair  | Defeat overlay button                     | Revive with 60% HP in same wave | Once per run       |
| Interstitial     | On `RETURN_TO_MENU` / `QUIT_TO_MENU`      | None (ad only)                 | ≥ 90 s between plays |

All ad calls are wrapped in `src/ads/ads.ts`. The production code should import that module only; the SDK (CrazyGames / Poki / AdSense) is injected inside the module and swapped by `import.meta.env.VITE_AD_PROVIDER`.

## 2. Contract

```ts
export type AdPlacement = 'repair' | 'interstitial';

export async function showRewardedAd(p: AdPlacement): Promise<boolean>;
export async function maybeShowInterstitial(): Promise<void>;
export function resetInterstitialCooldown(): void;
```

- `showRewardedAd` resolves `true` on reward granted, `false` on skip/error. Always safe to await.
- `maybeShowInterstitial` is a no-op if the cooldown has not elapsed.
- The stub ships a 200–300 ms delay to mimic real latency so UI transitions don't look instant.

## 3. Reward application

`DefeatOverlay` calls `showRewardedAd('repair')` and dispatches `REWARDED_REPAIR_APPLIED` on success. The `App` component's effect flips `player.active = true` and sets `player.hp = maxHp * 0.6`, clears reload. The `repair` button is hidden if the player has already revived this run (controlled via `reviveUsed` in state).

To support "once per run", the reducer tracks `reviveUsed` which resets on `START_RUN`.

## 4. Settings

- Users can disable ad prompts under "Preferences" (if we ever add one). For now the defeat screen always shows the ad button because Phase 4 scope caps features.

## 5. Tasks

- [x] 4.1 Finalise `ads.ts` adapter shape and frequency cap.
- [x] 4.2 Wire rewarded repair into `DefeatOverlay` + reducer (`reviveUsed`).
- [x] 4.3 Wire interstitial on `RETURN_TO_MENU` / `QUIT_TO_MENU`.
- [x] 4.4 Hide the repair button after one use per run.

## 6. Acceptance

- Defeat → click repair → player returns to game with partial HP in the same wave.
- Second defeat in the same run does not offer repair.
- Returning to menu once triggers an ad; returning again within 90 s does not.
- All ad flows degrade gracefully if the ad SDK is absent.
