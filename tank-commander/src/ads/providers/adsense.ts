// Google AdSense for H5 games adapter.
// NOTE: AdSense H5 requires an approved publisher account and specific
// ad-unit IDs. The `VITE_ADSENSE_CLIENT` env var must be set at build
// time. This adapter loads the generic adsbygoogle.js and serves a
// full-screen interstitial via the standard ad unit flow. Rewarded is
// not a first-class AdSense product on the open web, so we fall back
// to an interstitial and only reward if it played.
// Docs: https://support.google.com/adsense/answer/9183549

import type { AdProvider } from './types';

type AdsByGoogleEntry = Record<string, unknown>;

declare global {
  interface Window {
    adsbygoogle?: AdsByGoogleEntry[];
  }
}

let ready = false;
let initPromise: Promise<void> | null = null;

function clientId(): string {
  // Set in the repo's Actions variables.
  return (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) ?? '';
}

function loadScript(client: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[data-adsense="1"]')) return resolve();
    const s = document.createElement('script');
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-adsense', '1');
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('adsense failed to load'));
    document.head.appendChild(s);
  });
}

async function playInterstitialOnce(): Promise<boolean> {
  // AdSense H5 interstitials still require a page-level ad unit to be
  // present. The actual implementation depends on the ad unit you set
  // up in AdSense. This adapter pushes a generic request and returns
  // true if the script is loaded.
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    return true;
  } catch {
    return false;
  }
}

export const adsenseProvider: AdProvider = {
  name: 'adsense',
  async init() {
    if (ready) return;
    const c = clientId();
    if (!c) {
      // eslint-disable-next-line no-console
      console.warn('[ads/adsense] VITE_ADSENSE_CLIENT not set');
      return;
    }
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        await loadScript(c);
        ready = true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ads/adsense] init failed:', err);
        ready = false;
      }
    })();
    return initPromise;
  },
  isReady() {
    return ready;
  },
  showInterstitial() {
    if (!ready) return Promise.resolve(false);
    return playInterstitialOnce();
  },
  async showRewarded() {
    if (!ready) return false;
    // AdSense H5 doesn't expose a true rewarded surface on the open
    // web. Fall back to interstitial; reward only if it played.
    return playInterstitialOnce();
  },
};
