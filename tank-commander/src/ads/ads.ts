// Ad wrappers for Tank Commander. SPEC-004 + Phase-3 pluggable providers.
// Flip VITE_AD_PROVIDER at build time to swap portals.

import { provider } from './providers';

export type AdPlacement = 'repair' | 'interstitial';

const STATE = {
  lastInterstitialAt: 0,
  minIntervalMs: 90_000,
};

/** Rewarded flow (used by the Defeat overlay's repair button). */
export async function showRewardedAd(placement: AdPlacement): Promise<boolean> {
  try {
    if (!provider.isReady()) {
      // Dev stub: grant the reward so UI flows are testable locally.
      if (import.meta.env?.DEV) return true;
      return false;
    }
    void placement;
    return await provider.showRewarded();
  } catch {
    return false;
  }
}

/** Interstitial flow with a 90-second cooldown. */
export async function maybeShowInterstitial(): Promise<void> {
  const now = Date.now();
  if (now - STATE.lastInterstitialAt < STATE.minIntervalMs) return;
  if (!provider.isReady()) return;
  try {
    const ok = await provider.showInterstitial();
    if (ok) STATE.lastInterstitialAt = now;
  } catch {
    /* swallow */
  }
}

export function resetInterstitialCooldown(): void {
  STATE.lastInterstitialAt = 0;
}

/** Lifecycle hooks for portals that track gameplay segments. */
export function adsGameplayStart(): void {
  provider.gameplayStart?.();
}
export function adsGameplayStop(): void {
  provider.gameplayStop?.();
}
export function adsHappyTime(score?: number): void {
  provider.happytime?.(score);
}
