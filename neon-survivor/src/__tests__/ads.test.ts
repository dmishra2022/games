import { beforeEach, describe, expect, it } from 'vitest';
import {
  _resetAdCaps,
  isAdSupported,
  showInterstitialAd,
  triggerRewardedAd,
} from '../monetization/ads';

describe('ads stub', () => {
  beforeEach(() => _resetAdCaps());

  it('reports no provider by default', () => {
    expect(isAdSupported()).toBe(false);
  });

  it('interstitial skips when unsupported', async () => {
    const r = await showInterstitialAd();
    expect(['skipped', 'shown']).toContain(r);
  });

  it('rewarded resolves without throwing', async () => {
    const r = await triggerRewardedAd();
    expect(['rewarded', 'skipped']).toContain(r);
  });

  it('never throws from either path', async () => {
    await expect(showInterstitialAd()).resolves.toBeDefined();
    await expect(triggerRewardedAd()).resolves.toBeDefined();
  });
});
