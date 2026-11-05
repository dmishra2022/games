// localStorage adapter for persisted state. SPEC-002 section 4.

import {
  defaultPersisted,
  type PersistedState,
  type UpgradeKey,
} from './reducer';

const KEY = 'neon-plinko:v1';

/** Returns a validated PersistedState or defaults. Never throws. */
export function loadPersisted(): PersistedState {
  if (typeof localStorage === 'undefined') return defaultPersisted();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPersisted();
    const parsed = JSON.parse(raw) as unknown;
    return migrate(parsed);
  } catch {
    return defaultPersisted();
  }
}

export function savePersisted(state: PersistedState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota exceeded; ignore.
  }
}

export function clearPersisted(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // noop
  }
}

/**
 * Validate and coerce unknown input into a PersistedState. For
 * saveVersion 1 this is a straight shape check; later versions will
 * chain through here.
 */
export function migrate(input: unknown): PersistedState {
  if (typeof input !== 'object' || input === null) return defaultPersisted();
  const o = input as Record<string, unknown>;
  if (o.saveVersion !== 1) return defaultPersisted();

  const upgradesIn =
    typeof o.upgrades === 'object' && o.upgrades !== null
      ? (o.upgrades as Record<string, unknown>)
      : {};
  const clampLevel = (v: unknown): number => {
    const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
    return Math.max(0, Math.min(5, n));
  };

  const settingsIn =
    typeof o.settings === 'object' && o.settings !== null
      ? (o.settings as Record<string, unknown>)
      : {};

  const statsIn =
    typeof o.stats === 'object' && o.stats !== null
      ? (o.stats as Record<string, unknown>)
      : {};

  const upgradeKeys: UpgradeKey[] = ['multiDrop', 'pegBonus', 'bucketBias'];
  const upgrades: Record<UpgradeKey, number> = {
    multiDrop: 0,
    pegBonus: 0,
    bucketBias: 0,
  };
  for (const k of upgradeKeys) upgrades[k] = clampLevel(upgradesIn[k]);

  return {
    saveVersion: 1,
    credits:
      typeof o.credits === 'number' && Number.isFinite(o.credits)
        ? Math.max(0, Math.floor(o.credits))
        : 0,
    highScore:
      typeof o.highScore === 'number' && Number.isFinite(o.highScore)
        ? Math.max(0, Math.floor(o.highScore))
        : 0,
    upgrades,
    stats: {
      totalDrops:
        typeof statsIn.totalDrops === 'number' &&
        Number.isFinite(statsIn.totalDrops)
          ? Math.max(0, Math.floor(statsIn.totalDrops))
          : 0,
    },
    settings: {
      sfxMuted: !!settingsIn.sfxMuted,
    },
  };
}

/** Simple debounce helper. */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): T & { flush: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const wrapper = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) fn(...lastArgs);
    }, ms);
  }) as T & { flush: () => void; cancel: () => void };

  wrapper.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs) fn(...lastArgs);
    }
  };
  wrapper.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  return wrapper;
}
