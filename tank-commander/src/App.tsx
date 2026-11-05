// Full Tank Commander app composition (SPEC-002).

import { useEffect, useRef, useState } from 'react';
import GameCanvas from './canvas/GameCanvas';
import type { World } from './engine/types';
import { GameProvider, useGame } from './state/GameContext';
import MainMenu from './ui/MainMenu';
import MetaShop from './ui/MetaShop';
import Hud from './ui/Hud';
import WaveBanner from './ui/WaveBanner';
import PauseOverlay from './ui/PauseOverlay';
import DefeatOverlay from './ui/DefeatOverlay';
import VictoryOverlay from './ui/VictoryOverlay';
import Joystick from './ui/Joystick';
import { maybeShowInterstitial } from './ads/ads';
import {
  musicStart,
  musicStop,
  setDuck,
  setSfxEnabled,
  unlockAudio,
} from './audio/synth';

function isTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

function AppInner() {
  const { state, dispatch, onEngineEvent, onSyncFrame } = useGame();
  const worldRef = useRef<World | null>(null);
  const [touch] = useState<boolean>(() => isTouch());
  const leftJoyRef = useRef({ ax: 0, ay: 0 });
  const rightJoyRef = useRef({ ax: 0, ay: 0 });
  const [, setJoyTick] = useState(0);

  // Side-effect: on returning to the menu, maybe show interstitial.
  const prevPhaseRef = useRef(state.phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev !== 'menu' && state.phase === 'menu') {
      void maybeShowInterstitial();
    }
    prevPhaseRef.current = state.phase;
  }, [state.phase]);

  // Audio: unlock on first user gesture (pointerdown/keydown).
  useEffect(() => {
    const onGesture = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
    window.addEventListener('pointerdown', onGesture, { once: false });
    window.addEventListener('keydown', onGesture, { once: false });
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, []);

  // Audio: reflect SFX toggle.
  useEffect(() => {
    setSfxEnabled(state.settings.sfx);
  }, [state.settings.sfx]);

  // Audio: start/stop music based on phase; duck when paused.
  useEffect(() => {
    if (state.phase === 'playing') {
      musicStart();
      setDuck(false);
    } else if (state.phase === 'paused') {
      setDuck(true);
    } else {
      musicStop();
    }
  }, [state.phase]);

  // Apply repair: when REWARDED_REPAIR_APPLIED fires, refill player hp.
  const prevPhaseRef2 = useRef(state.phase);
  useEffect(() => {
    if (prevPhaseRef2.current === 'defeat' && state.phase === 'playing') {
      const w = worldRef.current;
      if (w) {
        const p = w.tanks[0];
        if (p) {
          p.active = true;
          p.hp = Math.min(p.maxHp, p.maxHp * 0.6);
          p.reload = 0;
        }
      }
    }
    prevPhaseRef2.current = state.phase;
  }, [state.phase]);

  const canvasActive = state.phase === 'playing';
  const showCanvas =
    state.phase === 'playing' ||
    state.phase === 'paused' ||
    state.phase === 'defeat' ||
    state.phase === 'victory';

  return (
    <div
      className="relative mx-auto flex h-[100dvh] w-full max-w-[1600px] flex-col bg-tc-bg text-tc-steel"
      style={{ touchAction: 'none' }}
    >
      <div className="relative h-full w-full overflow-hidden">
        {showCanvas && (
          <GameCanvas
            meta={state.meta}
            active={canvasActive}
            runId={state.runId}
            reducedMotion={state.settings.reducedMotion}
            worldRef={worldRef}
            onEvent={onEngineEvent}
            onSyncFrame={onSyncFrame}
            joystickLeft={touch ? leftJoyRef.current : undefined}
            joystickRight={touch ? rightJoyRef.current : undefined}
            autoFire={touch}
          />
        )}

        {/* HUD on top of the canvas during play / pause */}
        {(state.phase === 'playing' || state.phase === 'paused') && <Hud />}
        {state.waveBanner && <WaveBanner />}

        {/* Touch controls */}
        {touch && (state.phase === 'playing' || state.phase === 'paused') && (
          <>
            <Joystick
              side="left"
              onChange={(ax, ay) => {
                leftJoyRef.current.ax = ax;
                leftJoyRef.current.ay = ay;
                setJoyTick((t) => (t + 1) & 1023);
              }}
            />
            <Joystick
              side="right"
              onChange={(ax, ay) => {
                rightJoyRef.current.ax = ax;
                rightJoyRef.current.ay = ay;
                setJoyTick((t) => (t + 1) & 1023);
              }}
            />
          </>
        )}

        {state.phase === 'menu' && <MainMenu />}
        {state.phase === 'shop' && <MetaShop />}
        {state.phase === 'paused' && <PauseOverlay />}
        {state.phase === 'defeat' && <DefeatOverlay />}
        {state.phase === 'victory' && <VictoryOverlay />}
      </div>

      {/* Esc to pause/resume from anywhere. */}
      <KeyBindings
        onEsc={() => {
          if (state.phase === 'playing') dispatch({ type: 'PAUSE' });
          else if (state.phase === 'paused') dispatch({ type: 'RESUME' });
        }}
      />
    </div>
  );
}

function KeyBindings({ onEsc }: { onEsc: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') onEsc();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onEsc]);
  return null;
}

export default function App() {
  return (
    <GameProvider>
      <AppInner />
    </GameProvider>
  );
}
