// AppState reducer. SPEC-002 section 3.

import { CREDITS } from '../engine/constants';
import { META_MAX_LEVEL, META_META } from '../engine/meta';
import type { EngineEvent, MetaState } from '../engine/types';

export type Phase =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'defeat'
  | 'victory'
  | 'shop';

export type HudSnapshot = {
  hp: number;
  maxHp: number;
  reload: number;
  reloadTime: number;
  arenaIndex: number;
  wave: number;
  wavesPerArena: number;
  enemiesLeft: number;
  kills: number;
};

export type AppState = {
  phase: Phase;
  runId: number;
  credits: number;
  meta: MetaState;
  settings: { sfx: boolean; reducedMotion: boolean };
  hud: HudSnapshot;
  waveBanner: { wave: number; shownAt: number } | null;
  arenaRunCredits: number;
  lastPlayedAt: number;
  arenaCount: number;
  reviveUsed: boolean;
};

export type Action =
  | { type: 'START_RUN' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'QUIT_TO_MENU' }
  | { type: 'RETURN_TO_MENU' }
  | { type: 'OPEN_SHOP' }
  | { type: 'CLOSE_SHOP' }
  | { type: 'BUY_META'; key: keyof MetaState }
  | { type: 'TOGGLE_SFX' }
  | { type: 'TOGGLE_REDUCED_MOTION' }
  | { type: 'SYNC_FROM_WORLD'; hud: HudSnapshot }
  | { type: 'ENGINE_EVENT'; event: EngineEvent }
  | { type: 'REWARDED_REPAIR_APPLIED' }
  | { type: 'CLEAR_WAVE_BANNER' };

export const ARENA_COUNT = 3;

export const initialHud = (): HudSnapshot => ({
  hp: 100,
  maxHp: 100,
  reload: 0,
  reloadTime: 1.2,
  arenaIndex: 0,
  wave: 1,
  wavesPerArena: 5,
  enemiesLeft: 0,
  kills: 0,
});

export const initialState = (opts: {
  credits: number;
  meta: MetaState;
  settings: AppState['settings'];
  lastPlayedAt: number;
}): AppState => ({
  phase: 'menu',
  runId: 0,
  credits: opts.credits,
  meta: opts.meta,
  settings: opts.settings,
  hud: initialHud(),
  waveBanner: null,
  arenaRunCredits: 0,
  lastPlayedAt: opts.lastPlayedAt,
  arenaCount: ARENA_COUNT,
  reviveUsed: false,
});

function commitRunCredits(state: AppState): AppState {
  if (state.arenaRunCredits <= 0) return state;
  return {
    ...state,
    credits: state.credits + state.arenaRunCredits,
    arenaRunCredits: 0,
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'START_RUN':
      return {
        ...state,
        phase: 'playing',
        runId: state.runId + 1,
        arenaRunCredits: 0,
        hud: initialHud(),
        waveBanner: null,
        reviveUsed: false,
      };
    case 'PAUSE':
      if (state.phase !== 'playing') return state;
      return { ...state, phase: 'paused' };
    case 'RESUME':
      if (state.phase !== 'paused') return state;
      return { ...state, phase: 'playing' };
    case 'QUIT_TO_MENU': {
      const committed = commitRunCredits(state);
      return { ...committed, phase: 'menu' };
    }
    case 'RETURN_TO_MENU': {
      const committed = commitRunCredits(state);
      return { ...committed, phase: 'menu' };
    }
    case 'OPEN_SHOP':
      return { ...state, phase: 'shop' };
    case 'CLOSE_SHOP':
      return { ...state, phase: 'menu' };
    case 'BUY_META': {
      const key = action.key;
      const lvl = state.meta[key];
      if (lvl >= META_MAX_LEVEL) return state;
      const cost = META_META[key].costAt(lvl);
      if (state.credits < cost) return state;
      return {
        ...state,
        credits: state.credits - cost,
        meta: { ...state.meta, [key]: lvl + 1 },
      };
    }
    case 'TOGGLE_SFX':
      return {
        ...state,
        settings: { ...state.settings, sfx: !state.settings.sfx },
      };
    case 'TOGGLE_REDUCED_MOTION':
      return {
        ...state,
        settings: {
          ...state.settings,
          reducedMotion: !state.settings.reducedMotion,
        },
      };
    case 'SYNC_FROM_WORLD':
      return { ...state, hud: action.hud };
    case 'CLEAR_WAVE_BANNER':
      return { ...state, waveBanner: null };
    case 'ENGINE_EVENT': {
      const e = action.event;
      if (e.type === 'TANK_DESTROYED' && e.side === 'enemy') {
        const kind =
          e.kind === 'player'
            ? 'grunt'
            : (e.kind as 'grunt' | 'sniper' | 'flanker' | 'heavy');
        const gain = CREDITS.kill[kind] ?? 3;
        return { ...state, arenaRunCredits: state.arenaRunCredits + gain };
      }
      if (e.type === 'WAVE_CLEARED') {
        const bonus =
          CREDITS.waveClearBase + CREDITS.waveClearPerWave * (e.wave - 1);
        return {
          ...state,
          arenaRunCredits: state.arenaRunCredits + bonus,
          waveBanner: { wave: e.wave + 1, shownAt: Date.now() },
        };
      }
      if (e.type === 'ARENA_CLEARED') {
        let s: AppState = {
          ...state,
          arenaRunCredits: state.arenaRunCredits + CREDITS.arenaClear,
        };
        if (e.arenaIndex >= state.arenaCount - 1) {
          s = {
            ...s,
            arenaRunCredits: s.arenaRunCredits + CREDITS.victory,
            phase: 'victory',
          };
        }
        return s;
      }
      if (e.type === 'PLAYER_DIED') {
        return { ...state, phase: 'defeat' };
      }
      return state;
    }
    case 'REWARDED_REPAIR_APPLIED':
      if (state.reviveUsed) return state;
      return { ...state, phase: 'playing', reviveUsed: true };
    default:
      return state;
  }
}
