// SPEC-004 monetization wrappers. Public API is stable; the actual ad
// surface is pluggable via VITE_AD_PROVIDER (see providers/index.ts).
// Default `none` preserves pre-Phase-3 behaviour so tests stay green.

import { provider } from './providers';

export type AdResult =
  | 'shown'
  | 'skipped'
  | 'rewarded'
  | 'dismissed'
  | 'failed';

const INTERSTITIAL_MIN_INTERVAL_MS = 120_000;
const INTERSTITIAL_SESSION_CAP = 3;
let interstitialsThisSession = 0;
let lastInterstitialAt = -Infinity;

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function devLog(...args: unknown[]): void {
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[ads]', ...args);
  }
}

export function isAdSupported(): boolean {
  return provider.isReady();
}

export async function showInterstitialAd(): Promise<AdResult> {
  const now = nowMs();
  if (interstitialsThisSession >= INTERSTITIAL_SESSION_CAP) {
    devLog('interstitial skipped: session cap reached');
    return 'skipped';
  }
  if (now - lastInterstitialAt < INTERSTITIAL_MIN_INTERVAL_MS) {
    devLog('interstitial skipped: too soon');
    return 'skipped';
  }

  try {
    if (!isAdSupported()) {
      devLog('interstitial: no provider, skipping');
      return 'skipped';
    }
    const ok = await provider.showInterstitial();
    if (!ok) return 'failed';
    interstitialsThisSession++;
    lastInterstitialAt = now;
    return 'shown';
  } catch {
    return 'failed';
  }
}

export async function triggerRewardedAd(): Promise<AdResult> {
  try {
    if (!isAdSupported()) {
      if (import.meta.env?.DEV) {
        devLog('rewarded: no provider, granting reward (dev stub)');
        return 'rewarded';
      }
      devLog('rewarded: no provider, skipping');
      return 'skipped';
    }
    const ok = await provider.showRewarded();
    return ok ? 'rewarded' : 'dismissed';
  } catch {
    return 'failed';
  }
}

export function adsGameplayStart(): void {
  provider.gameplayStart?.();
}
export function adsGameplayStop(): void {
  provider.gameplayStop?.();
}
export function adsHappyTime(score?: number): void {
  provider.happytime?.(score);
}

/** Test-only helper. */
export function _resetAdCaps(): void {
  interstitialsThisSession = 0;
  lastInterstitialAt = -Infinity;
}
