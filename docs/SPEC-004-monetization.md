# SPEC-004 — Monetization Hooks

Status: draft → active
Depends on: `SPEC-000-master.md`, `SPEC-002-ui-persistence.md`
Phase: 4 (per `game/master_prompt.md`)

Goal: expose a single, typed import surface for ad placements so a
real ad SDK (CrazyGames, Poki, AdSense) can be dropped in later with
zero changes outside `src/monetization/`.

Non-goals:

- Shipping an actual ad SDK.
- Analytics.
- Server-side verification.

---

## 1. Public API

```ts
// src/monetization/ads.ts

export type AdResult =
  | 'shown'
  | 'skipped'
  | 'rewarded'
  | 'dismissed'
  | 'failed';

export function isAdSupported(): boolean;
export function showInterstitialAd(): Promise<AdResult>;
export function triggerRewardedAd(): Promise<AdResult>;
```

All callers must import from `src/monetization/ads.ts`. No direct use
of global SDK objects (`window.CrazyGames`, `PokiSDK`, etc.) is
permitted anywhere else — a lint rule or review guideline enforces
this.

---

## 2. Default (stub) implementation

- `isAdSupported()` returns `false` so UI can conditionally hide ad
  buttons if a build has no provider.
- `showInterstitialAd()` resolves with `'skipped'` after a tick.
- `triggerRewardedAd()` resolves with `'rewarded'` after a tick in
  dev (so flows are testable) and `'skipped'` in production until
  wired to a real SDK (flag-controlled).

Dev builds `console.debug` each call so wiring can be verified.

---

## 3. Call sites

| Event | Call | Rationale |
|-------|------|-----------|
| Player taps "Free balls" in Summary | `triggerRewardedAd()` → on `'rewarded'`, dispatch `REFILL_BALLS` with cost 0 | Natural rewarded placement |
| Returning to menu after a run | `showInterstitialAd()` | Classic interstitial moment; frequency-capped |
| Launch (first time per session) | none in v1 | Keeps time-to-play short |

### 3.1 Frequency capping (interstitial)

- Minimum **120 seconds** between interstitials.
- At most **3** interstitials per session.
- Both counters reset on page reload.

Capping lives inside `ads.ts` so UI callers never worry about it.

---

## 4. Reward semantics

- "Rewarded ball refill" grants `REFILL_BALLS` (currently 5) at **no
  credit cost**. The reducer already decrements credits only when the
  "Refill +N for X" button is used; the ad path dispatches
  `REFILL_BALLS` with credits already set high enough OR
  temporarily/atomically adds credits before refill.

To keep the reducer pure, we add a new action:

```ts
{ type: 'GRANT_FREE_BALLS'; amount: number }
```

that adds balls without touching credits. `SummaryOverlay` dispatches
this when the ad resolves `'rewarded'`.

---

## 5. Provider plug points

```ts
// Pseudocode shape of a real impl.
export async function triggerRewardedAd(): Promise<AdResult> {
  if (!isAdSupported()) return 'skipped';
  try {
    // CrazyGames example:
    // await window.CrazyGames.SDK.ad.requestAd('rewarded');
    // return 'rewarded';
    // Poki example:
    // const ok = await PokiSDK.rewardedBreak();
    // return ok ? 'rewarded' : 'dismissed';
    return 'skipped';
  } catch {
    return 'failed';
  }
}
```

---

## 6. Acceptance criteria

- [ ] Only `src/monetization/ads.ts` references any SDK symbol.
- [ ] UI code never awaits `window.<provider>` directly.
- [ ] Frequency capping is enforced for interstitials.
- [ ] A rewarded ad resolution with `'rewarded'` adds balls without
      touching credits.
- [ ] All ad functions never throw to the caller.

---

## 7. Task breakdown

| ID | Task |
|----|------|
| 4.1 | Finalize this spec |
| 4.2 | Expand `ads.ts` with frequency capping and `AdResult` surface |
| 4.3 | Add `GRANT_FREE_BALLS` reducer action + reducer test |
| 4.4 | Wire interstitial on `RETURN_TO_MENU` call site; wire rewarded on Summary free-balls button |
