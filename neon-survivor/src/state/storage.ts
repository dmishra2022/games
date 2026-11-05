// localStorage adapter for persisted state. SPEC-002 section 4.

import { defaultPersisted, type PersistedState } from './reducer';
import { META_MAX_LEVEL, META_KEYS } from '../engine/meta';

const KEY = 'neon-survivor:v1';

export function loadPersisted(): PersistedState {
  if (typeof localStorage === 'undefined') return defaultPersisted();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPersisted();
    return migrate(JSON.parse(raw));
  } catch {
    return defaultPersisted();
  }
}

export function savePersisted(s: PersistedState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore quota / private-mode errors
  }
}

export function clearPersisted(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

function clampLevel(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
  return Math.max(0, Math.min(META_MAX_LEVEL, n));
}

function nonNegInt(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
  return Math.max(0, n);
}

function nonNegNum(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0;
}

export function migrate(input: unknown): PersistedState {
  if (typeof input !== 'object' || input === null) return defaultPersisted();
  const o = input as Record<string, unknown>;
  if (o.saveVersion !== 1) return defaultPersisted();

  const metaIn =
    typeof o.meta === 'object' && o.meta !== null
      ? (o.meta as Record<string, unknown>)
      : {};
  const meta = { hp: 0, damage: 0, speed: 0, xpGain: 0 };
  for (const k of META_KEYS) meta[k] = clampLevel(metaIn[k]);

  const statsIn =
    typeof o.stats === 'object' && o.stats !== null
      ? (o.stats as Record<string, unknown>)
      : {};
  const settingsIn =
    typeof o.settings === 'object' && o.settings !== null
      ? (o.settings as Record<string, unknown>)
      : {};

  return {
    saveVersion: 1,
    credits: nonNegInt(o.credits),
    bestTimeSeconds: nonNegNum(o.bestTimeSeconds),
    bestLevel: nonNegInt(o.bestLevel),
    meta,
    stats: {
      totalRuns: nonNegInt(statsIn.totalRuns),
      totalKills: nonNegInt(statsIn.totalKills),
    },
    settings: { sfxMuted: !!settingsIn.sfxMuted },
  };
}

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
