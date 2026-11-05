// Poki SDK v2 adapter.
// Docs: https://sdk.poki.com/

import type { AdProvider } from './types';

type PokiSdk = {
  init: () => Promise<void>;
  commercialBreak: () => Promise<void>;
  rewardedBreak: () => Promise<boolean>;
  gameplayStart: () => void;
  gameplayStop: () => void;
  happyTime: (score?: number) => void;
};

function sdk(): PokiSdk | null {
  const w = window as unknown as { PokiSDK?: PokiSdk };
  return w.PokiSDK ?? null;
}

let ready = false;
let initPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sdk()) return resolve();
    const s = document.createElement('script');
    s.src = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('poki sdk failed to load'));
    document.head.appendChild(s);
  });
}

export const pokiProvider: AdProvider = {
  name: 'poki',
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
        console.warn('[ads/poki] init failed:', err);
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
      await sdk()!.commercialBreak();
      return true;
    } catch {
      return false;
    }
  },
  async showRewarded() {
    if (!ready) return false;
    try {
      return await sdk()!.rewardedBreak();
    } catch {
      return false;
    }
  },
  gameplayStart() {
    sdk()?.gameplayStart();
  },
  gameplayStop() {
    sdk()?.gameplayStop();
  },
  happytime(score) {
    sdk()?.happyTime(score);
  },
};
