import type { AdProvider } from './types';

export const noneProvider: AdProvider = {
  name: 'none',
  async init() {
    /* no-op */
  },
  isReady() {
    return false;
  },
  async showInterstitial() {
    return false;
  },
  async showRewarded() {
    return false;
  },
};
