// React Context wrapping the reducer, hydration, and persistence.
// SPEC-002 section 4.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import {
  initialState,
  pickPersisted,
  reducer,
  type Action,
  type AppState,
} from './reducer';
import {
  clearPersisted,
  debounce,
  loadPersisted,
  savePersisted,
} from './storage';

type GameContextValue = {
  state: AppState;
  dispatch: (a: Action) => void;
  resetProgress: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const didHydrate = useRef(false);

  // One-shot hydrate on mount.
  useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;
    const persisted = loadPersisted();
    dispatch({ type: 'HYDRATE', persisted });
  }, []);

  // Debounced writer plus flush-on-hide/beforeunload.
  const saver = useMemo(
    () => debounce((s: ReturnType<typeof pickPersisted>) => savePersisted(s), 500),
    [],
  );

  const latestPersisted = useRef(pickPersisted(state));
  latestPersisted.current = pickPersisted(state);

  useEffect(() => {
    // Only save after hydrate so we don't overwrite real data with
    // defaults during the first render.
    if (!didHydrate.current) return;
    saver(latestPersisted.current);
  }, [
    saver,
    state.credits,
    state.highScore,
    state.upgrades.multiDrop,
    state.upgrades.pegBonus,
    state.upgrades.bucketBias,
    state.stats.totalDrops,
    state.settings.sfxMuted,
  ]);

  useEffect(() => {
    const flush = () => {
      saver.flush();
      savePersisted(latestPersisted.current);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', flush);
    };
  }, [saver]);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      dispatch,
      resetProgress: () => {
        clearPersisted();
        dispatch({ type: 'RESET_PROGRESS' });
      },
    }),
    [state],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within <GameProvider>');
  return ctx;
}
