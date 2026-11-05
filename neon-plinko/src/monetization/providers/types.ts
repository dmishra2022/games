// Shared provider contract. Each adapter implements this and ads.ts
// routes calls to the active one based on VITE_AD_PROVIDER.

export type AdProvider = {
  readonly name: string;
  /** Lazy-init; resolved once per page load. */
  init(): Promise<void>;
  /** Returns true if the provider is loaded and ready to serve ads. */
  isReady(): boolean;
  /** Shows an interstitial. Resolves true if the ad played. */
  showInterstitial(): Promise<boolean>;
  /** Shows a rewarded ad. Resolves true only when the user earned the reward. */
  showRewarded(): Promise<boolean>;
  /** Lifecycle hooks used by some portals (Poki, CrazyGames). */
  gameplayStart?(): void;
  gameplayStop?(): void;
  happytime?(score?: number): void;
};
