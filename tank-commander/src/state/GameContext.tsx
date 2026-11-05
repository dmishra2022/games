// Provider wiring reducer + persistence + engine sync.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { EngineEvent, World } from '../engine/types';
import {
  flushPersisted,
  loadPersisted,
  savePersistedDebounced,
} from './storage';
import {
  initialState,
  reducer,
  type Action,
  type AppState,
  type HudSnapshot,
} from './reducer';

type Ctx = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  onEngineEvent: (e: EngineEvent) => void;
  onSyncFrame: (world: World) => void;
};

const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const persisted = useMemo(() => loadPersisted(), []);
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () =>
      initialState({
        credits: persisted.credits,
        meta: persisted.meta,
        settings: persisted.settings,
        lastPlayedAt: persisted.lastPlayedAt,
      }),
  );

  // Persist on change.
  useEffect(() => {
    savePersistedDebounced({
      v: 1,
      credits: state.credits,
      meta: state.meta,
      settings: state.settings,
      lastPlayedAt: Date.now(),
    });
  }, [state.credits, state.meta, state.settings]);

  // Flush persistence on page hide / unload.
  useEffect(() => {
    const flush = () => flushPersisted();
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', flush);
    };
  }, []);

  // Auto-clear the wave banner after 1.8s.
  useEffect(() => {
    if (!state.waveBanner) return;
    const t = setTimeout(() => dispatch({ type: 'CLEAR_WAVE_BANNER' }), 1800);
    return () => clearTimeout(t);
  }, [state.waveBanner]);

  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const onEngineEvent = useCallback((e: EngineEvent) => {
    dispatchRef.current({ type: 'ENGINE_EVENT', event: e });
  }, []);

  const onSyncFrame = useCallback((world: World) => {
    const player = world.tanks[0];
    const enemiesLeft = world.tanks.filter(
      (t) => t.active && t.side === 'enemy',
    ).length;
    const hud: HudSnapshot = {
      hp: Math.max(0, player?.hp ?? 0),
      maxHp: player?.maxHp ?? 100,
      reload: player?.reload ?? 0,
      reloadTime: player?.reloadTime ?? 1.2,
      arenaIndex: world.arenaIndex,
      wave: world.wave,
      wavesPerArena: world.wavesPerArena,
      enemiesLeft,
      kills: world.playerKills,
    };
    dispatchRef.current({ type: 'SYNC_FROM_WORLD', hud });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ state, dispatch, onEngineEvent, onSyncFrame }),
    [state, onEngineEvent, onSyncFrame],
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame(): Ctx {
  const v = useContext(GameCtx);
  if (!v) throw new Error('useGame must be used inside <GameProvider>');
  return v;
}
