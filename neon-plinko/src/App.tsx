import { useCallback, useEffect } from 'react';
import GameCanvas from './canvas/GameCanvas';
import { GameProvider, useGame } from './state/GameContext';
import type { EngineEvent } from './engine/types';
import MainMenu from './ui/MainMenu';
import Hud from './ui/Hud';
import PauseOverlay from './ui/PauseOverlay';
import SummaryOverlay from './ui/SummaryOverlay';
import UpgradesModal from './ui/UpgradesModal';
import { initAudio, setMuted } from './audio/synth';

function Game() {
  const { state, dispatch } = useGame();

  // Esc toggles pause while playing.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      if (state.phase === 'playing') dispatch({ type: 'OPEN_PAUSE' });
      else if (state.phase === 'paused') dispatch({ type: 'RESUME' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.phase, dispatch]);

  // Unlock Web Audio on first user gesture. See SPEC-003 4.2.
  useEffect(() => {
    const unlock = () => {
      initAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Keep the audio engine mute state in sync with reducer settings.
  useEffect(() => {
    setMuted(state.settings.sfxMuted);
  }, [state.settings.sfxMuted]);

  const handleEvent = useCallback(
    (e: EngineEvent & { basePoints?: number }) => {
      switch (e.type) {
        case 'DROP_STARTED':
          dispatch({ type: 'DROP_CONSUMED' });
          // Queue extra drops from the multiDrop upgrade. We queue
          // only on player-initiated spawns, not on queued auto-spawns.
          // GameCanvas calls trySpawn directly for queued ones which
          // also emits DROP_STARTED; to avoid cascading, we queue
          // based on the current pending state in reducer only if
          // queuedDrops == 0 right now and ballsRemaining allows it.
          if (state.queuedDrops === 0 && state.upgrades.multiDrop > 0) {
            const canQueue = Math.min(
              state.upgrades.multiDrop,
              Math.max(0, state.ballsRemaining - 1), // -1 because we just consumed one
            );
            if (canQueue > 0) {
              dispatch({ type: 'QUEUE_EXTRA_DROPS', count: canQueue });
            }
          }
          break;
        case 'PEG_HIT':
          dispatch({
            type: 'PEG_HIT',
            comboAfter: e.comboAfter,
            basePoints: e.basePoints ?? 10,
          });
          break;
        case 'BUCKET_LAND':
          dispatch({
            type: 'BUCKET_LAND',
            multiplier: e.multiplier,
            runScore: e.runScore,
          });
          break;
        case 'DROP_SETTLED':
          dispatch({ type: 'DROP_SETTLED' });
          break;
      }
    },
    [dispatch, state.queuedDrops, state.upgrades.multiDrop, state.ballsRemaining],
  );

  // Canvas is "active" (physics advances, input listens) only while
  // playing.
  const canvasActive = state.phase === 'playing';

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-neon-bg p-2 md:p-6">
      <div className="relative aspect-[2/3] h-full max-h-[100dvh] w-full max-w-[min(100vw,calc((100dvh-16px)*2/3))]">
        <GameCanvas
          onEvent={handleEvent}
          active={canvasActive}
          pegBonusLevel={state.upgrades.pegBonus}
          bucketBiasLevel={state.upgrades.bucketBias}
          queuedDrops={state.queuedDrops}
          onConsumedQueuedDrop={() => dispatch({ type: 'CONSUME_QUEUED_DROP' })}
          sfxMuted={state.settings.sfxMuted}
        />
        {state.phase === 'menu' && <MainMenu />}
        {(state.phase === 'playing' || state.phase === 'paused') && <Hud />}
        <PauseOverlay />
        <SummaryOverlay />
        <UpgradesModal />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}
