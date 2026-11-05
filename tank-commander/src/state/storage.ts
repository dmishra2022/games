// Versioned localStorage persistence (SPEC-002 section 4).

import type { MetaState } from '../engine/types';

const KEY = 'tank-commander:v1';

export type PersistedSettings = {
  sfx: boolean;
  reducedMotion: boolean;
};

export type Persisted = {
  v: 1;
  credits: number;
  meta: MetaState;
  settings: PersistedSettings;
  lastPlayedAt: number;
};

export const defaultPersisted = (): Persisted => ({
  v: 1,
  credits: 0,
  meta: { hp: 0, damage: 0, reload: 0, armor: 0 },
  settings: { sfx: true, reducedMotion: false },
  lastPlayedAt: Date.now(),
});

export function loadPersisted(): Persisted {
  try {
    if (typeof localStorage === 'undefined') return defaultPersisted();
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPersisted();
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (!parsed || parsed.v !== 1) return defaultPersisted();
    const d = defaultPersisted();
    return {
      v: 1,
      credits: Math.max(0, Math.floor(Number(parsed.credits ?? 0))),
      meta: {
        hp: clampLevel(parsed.meta?.hp),
        damage: clampLevel(parsed.meta?.damage),
        reload: clampLevel(parsed.meta?.reload),
        armor: clampLevel(parsed.meta?.armor),
      },
      settings: {
        sfx: parsed.settings?.sfx ?? d.settings.sfx,
        reducedMotion:
          parsed.settings?.reducedMotion ?? d.settings.reducedMotion,
      },
      lastPlayedAt: Number(parsed.lastPlayedAt ?? Date.now()),
    };
  } catch {
    return defaultPersisted();
  }
}

function clampLevel(n: unknown): number {
  const x = Math.floor(Number(n ?? 0));
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(5, x));
}

export function savePersisted(p: Persisted): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* quota or private mode: ignore */
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let queued: Persisted | null = null;

export function savePersistedDebounced(p: Persisted, ms = 250): void {
  queued = p;
  if (timer) return;
  timer = setTimeout(() => {
    if (queued) savePersisted(queued);
    queued = null;
    timer = null;
  }, ms);
}

export function flushPersisted(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queued) {
    savePersisted(queued);
    queued = null;
  }
}
