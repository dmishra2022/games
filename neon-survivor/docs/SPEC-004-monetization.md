# SPEC-004 — Monetization Hooks

Status: draft → active
Depends on: SPEC-000..003
Phase: 4

Goal: expose a single, typed import surface for ads so a real
provider (CrazyGames, Poki, AdSense) can be swapped in by editing
only `src/monetization/ads.ts`. Default implementation never grants
real rewards in production without a provider attached.

---

## 1. Public API

```ts
export type AdResult =
  | 'shown' | 'skipped' | 'rewarded' | 'dismissed' | 'failed';

export function isAdSupported(): boolean;
export function showInterstitialAd(): Promise<AdResult>;
export function triggerRewardedAd(): Promise<AdResult>;
```

Only `src/monetization/ads.ts` may reference ad SDK symbols.

---

## 2. Call sites

| Trigger | Call | On success |
|---------|------|------------|
| Defeat overlay "Revive (ad)" | `triggerRewardedAd()` | `REVIVE_GRANT`: restore HP to 50%, grant 2s invuln |
| "Main Menu" from pause or defeat | `showInterstitialAd()` | silent; return to menu either way |

### 2.1 Frequency capping

Interstitials:

- Minimum 120 seconds between interstitials.
- At most 3 interstitials per session.
- Reset on page reload.

Rewarded ads are never rate-limited (player-initiated).

---

## 3. Default stub behaviour

- `isAdSupported()` returns `false`.
- `showInterstitialAd()` resolves `'skipped'` after noop in production.
- `triggerRewardedAd()` resolves `'rewarded'` in dev builds so the
  revive flow can be tested, and `'skipped'` in production so no free
  rewards leak.

All ad functions must never throw. They swallow errors and resolve
to `'failed'`.

---

## 4. Acceptance criteria

- [ ] Grep of `src/` for `CrazyGames`, `PokiSDK`, or `window.ad*`
      shows matches only in `monetization/ads.ts`.
- [ ] Revive button on Defeat overlay only restores HP on a
      `'rewarded'` result.
- [ ] Interstitial frequency cap holds across repeated rapid clicks
      (observable via DEV log).
- [ ] Production build without a provider never grants a rewarded
      outcome.

---

## 5. Task breakdown

| ID | Task |
|----|------|
| 4.1 | Finalize spec |
| 4.2 | Expand `ads.ts` with frequency capping + typed AdResult |
| 4.3 | Hook interstitial on return-to-menu paths |
| 4.4 | Vitest cover that stubs don't throw and respect caps |
