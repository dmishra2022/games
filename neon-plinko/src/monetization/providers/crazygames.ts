// CrazyGames SDK v3 adapter.
// Docs: https://docs.crazygames.com/sdk/html5/

import type { AdProvider } from './types';

type CrazyGamesSdk = {
  init: () => Promise<void>;
  ad: { requestAd: (type: 'midgame' | 'rewarded') => Promise<void> };
  game: {
    gameplayStart: () => void;
    gameplayStop: () => void;
    happytime: () => void;
  };
};

function sdk(): CrazyGamesSdk | null {
  const w = window as unknown as { CrazyGames?: { SDK: CrazyGamesSdk } };
  return w.CrazyGames?.SDK ?? null;
}

let ready = false;
let initPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sdk()) return resolve();
    const s = document.createElement('script');
    s.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('crazygames sdk failed to load'));
    document.head.appendChild(s);
  });
}

export const crazygamesProvider: AdProvider = {
  name: 'crazygames',
  async init() {
    if (ready) return;
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        await loadScript();
        const s = sdk();
        if (!s) throw new Error('sdk not present after load');
        await s.init();
        ready = true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ads/crazygames] init failed:', err);
        ready = false;
      }
    })();
    return initPromise;
  },
  isReady() {
    return ready;
  },
  async showInterstitial() {
    if (!ready) return false;
    try {
      await sdk()!.ad.requestAd('midgame');
      return true;
    } catch {
      return false;
    }
  },
  async showRewarded() {
    if (!ready) return false;
    try {
      await sdk()!.ad.requestAd('rewarded');
      return true;
    } catch {
      return false;
    }
  },
  gameplayStart() {
    sdk()?.game.gameplayStart();
  },
  gameplayStop() {
    sdk()?.game.gameplayStop();
  },
  happytime() {
    sdk()?.game.happytime();
  },
};
