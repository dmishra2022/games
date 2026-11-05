import { adsenseProvider } from './adsense';
import { crazygamesProvider } from './crazygames';
import { noneProvider } from './none';
import { pokiProvider } from './poki';
import type { AdProvider } from './types';

type ProviderKey = 'none' | 'crazygames' | 'poki' | 'adsense';

function pickProvider(): AdProvider {
  const raw =
    (import.meta.env.VITE_AD_PROVIDER as ProviderKey | undefined) ?? 'none';
  switch (raw) {
    case 'crazygames':
      return crazygamesProvider;
    case 'poki':
      return pokiProvider;
    case 'adsense':
      return adsenseProvider;
    case 'none':
    default:
      return noneProvider;
  }
}

// Build-time singleton: the provider is chosen once per bundle.
export const provider: AdProvider = pickProvider();

// Kick off init on module load so ads are warm by the time the user
// clicks. Safe in SSR / tests because providers guard on `window`.
if (typeof window !== 'undefined') {
  void provider.init();
}

export type { AdProvider };
