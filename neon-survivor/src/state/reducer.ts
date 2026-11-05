// SPEC-002 section 3. Pure reducer; no side effects.

import { pickUpgradeChoices, UPGRADES, type UpgradeId } from '../engine/upgrades';
import { META_MAX_LEVEL, META_META, type MetaKey } from '../engine/meta';
import type { MetaState } from '../engine/types';

export type GamePhase = 'menu' | 'playing' | 'paused' | 'defeated';

export type PersistedState = {
  saveVersion: 1;
  credits: number;
  bestTimeSeconds: number;
  bestLevel: number;
  meta: MetaState;
  stats: { totalRuns: number; totalKills: number };
  settings: { sfxMuted: boolean };
};

export type AppState = PersistedState & {
  phase: GamePhase;
  runId: number;          // bumps every START_RUN; forces world rebuild
  runTime: number;
  runKills: number;
  runLevel: number;
  runXp: number;
  runXpNeeded: number;
  hp: number;
  maxHp: number;
  pendingLevelUps: number;
  currentChoices: UpgradeId[];
  showMetaShop: boolean;
  appliedUpgrades: Partial<Record<UpgradeId, number>>;
  lastRunReward: number;  // credits earned on last defeat
};

export const defaultPersisted = (): PersistedState => ({
  saveVersion: 1,
  credits: 0,
  bestTimeSeconds: 0,
  bestLevel: 0,
  meta: { hp: 0, damage: 0, speed: 0, xpGain: 0 },
  stats: { totalRuns: 0, totalKills: 0 },
  settings: { sfxMuted: false },
});

export const initialState = (): AppState => ({
  ...defaultPersisted(),
  phase: 'menu',
  runId: 0,
  runTime: 0,
  runKills: 0,
  runLevel: 1,
  runXp: 0,
  runXpNeeded: 20,
  hp: 100,
  maxHp: 100,
  pendingLevelUps: 0,
  currentChoices: [],
  showMetaShop: false,
  appliedUpgrades: {},
  lastRunReward: 0,
});

export type Action =
  | { type: 'HYDRATE'; persisted: PersistedState }
  | { type: 'START_RUN' }
  | { type: 'OPEN_PAUSE' }
  | { type: 'RESUME' }
  | { type: 'OPEN_META_SHOP' }
  | { type: 'CLOSE_META_SHOP' }
  | { type: 'BUY_META'; key: MetaKey }
  | { type: 'TOGGLE_SFX' }
  | { type: 'RESET_PROGRESS' }
  | { type: 'RETURN_TO_MENU' }
  | {
      type: 'SYNC_RUN';
      hp: number;
      maxHp: number;
      runLevel: number;
      runXp: number;
      runXpNeeded: number;
      runTime: number;
      runKills: number;
    }
  | { type: 'EVENT_PLAYER_HURT'; damage: number }
  | { type: 'EVENT_ENEMY_KILLED' }
  | { type: 'EVENT_LEVEL_UP' }
  | { type: 'PICK_UPGRADE'; id: UpgradeId }
  | {
      type: 'EVENT_PLAYER_DIED';
      timeSurvived: number;
      kills: number;
      level: number;
    }
  | { type: 'REVIVE_GRANT' };

function rollChoices(
  applied: Partial<Record<UpgradeId, number>>,
): UpgradeId[] {
  return pickUpgradeChoices(3, applied);
}

function runReward(timeSeconds: number, kills: number, level: number): number {
  return (
    kills +
    10 * level +
    Math.floor(timeSeconds / 30) * 5
  );
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.persisted };

    case 'START_RUN':
      return {
        ...state,
        phase: 'playing',
        runId: state.runId + 1,
        runTime: 0,
        runKills: 0,
        runLevel: 1,
        runXp: 0,
        runXpNeeded: 20,
        pendingLevelUps: 0,
        currentChoices: [],
        appliedUpgrades: {},
        showMetaShop: false,
        lastRunReward: 0,
      };

    case 'OPEN_PAUSE':
      return state.phase === 'playing'
        ? { ...state, phase: 'paused' }
        : state;

    case 'RESUME':
      return state.phase === 'paused' ? { ...state, phase: 'playing' } : state;

    case 'OPEN_META_SHOP':
      return { ...state, showMetaShop: true };

    case 'CLOSE_META_SHOP':
      return { ...state, showMetaShop: false };

    case 'BUY_META': {
      const lvl = state.meta[action.key];
      if (lvl >= META_MAX_LEVEL) return state;
      const cost = META_META[action.key].costAt(lvl);
      if (state.credits < cost) return state;
      return {
        ...state,
        credits: state.credits - cost,
        meta: { ...state.meta, [action.key]: lvl + 1 },
      };
    }

    case 'TOGGLE_SFX':
      return {
        ...state,
        settings: { ...state.settings, sfxMuted: !state.settings.sfxMuted },
      };

    case 'RESET_PROGRESS':
      return initialState();

    case 'RETURN_TO_MENU':
      return {
        ...state,
        phase: 'menu',
        showMetaShop: false,
        currentChoices: [],
        pendingLevelUps: 0,
      };

    case 'SYNC_RUN':
      return {
        ...state,
        hp: action.hp,
        maxHp: action.maxHp,
        runLevel: action.runLevel,
        runXp: action.runXp,
        runXpNeeded: action.runXpNeeded,
        runTime: action.runTime,
        runKills: action.runKills,
      };

    case 'EVENT_PLAYER_HURT':
      return state; // HP will arrive via SYNC_RUN

    case 'EVENT_ENEMY_KILLED':
      return {
        ...state,
        runKills: state.runKills + 1,
        stats: { ...state.stats, totalKills: state.stats.totalKills + 1 },
      };

    case 'EVENT_LEVEL_UP': {
      const pending = state.pendingLevelUps + 1;
      // If no overlay open yet, roll the first set of choices.
      const choices =
        state.currentChoices.length === 0
          ? rollChoices(state.appliedUpgrades)
          : state.currentChoices;
      return {
        ...state,
        pendingLevelUps: pending,
        currentChoices: choices,
      };
    }

    case 'PICK_UPGRADE': {
      if (!state.currentChoices.includes(action.id)) return state;
      const applied = { ...state.appliedUpgrades };
      applied[action.id] = (applied[action.id] ?? 0) + 1;
      // Clamp to maxStacks.
      const max = UPGRADES[action.id].maxStacks;
      if ((applied[action.id] ?? 0) > max) applied[action.id] = max;
      const remaining = state.pendingLevelUps - 1;
      const nextChoices = remaining > 0 ? rollChoices(applied) : [];
      return {
        ...state,
        appliedUpgrades: applied,
        pendingLevelUps: Math.max(0, remaining),
        currentChoices: nextChoices,
      };
    }

    case 'EVENT_PLAYER_DIED': {
      const reward = runReward(
        action.timeSurvived,
        action.kills,
        action.level,
      );
      const bestTime = Math.max(state.bestTimeSeconds, action.timeSurvived);
      const bestLevel = Math.max(state.bestLevel, action.level);
      return {
        ...state,
        phase: 'defeated',
        credits: state.credits + reward,
        bestTimeSeconds: bestTime,
        bestLevel,
        stats: { ...state.stats, totalRuns: state.stats.totalRuns + 1 },
        lastRunReward: reward,
      };
    }

    case 'REVIVE_GRANT':
      return { ...state, phase: 'playing' };

    default:
      return state;
  }
}

export function pickPersisted(s: AppState): PersistedState {
  return {
    saveVersion: s.saveVersion,
    credits: s.credits,
    bestTimeSeconds: s.bestTimeSeconds,
    bestLevel: s.bestLevel,
    meta: s.meta,
    stats: s.stats,
    settings: s.settings,
  };
}

export { runReward };
