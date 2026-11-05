// App: composes engine + state + UI. SPEC-002 section 6.

import { useCallback, useEffect, useRef, useState } from 'react';
import GameCanvas from './canvas/GameCanvas';
import { GameProvider, useGame } from './state/GameContext';
import type { EngineEvent, World } from './engine/types';
import type { UpgradeId } from './engine/upgrades';
import { applyUpgrade } from './engine/upgrades';
import { xpToNextLevel } from './engine/constants';
import MainMenu from './ui/MainMenu';
import Hud from './ui/Hud';
import LevelUpOverlay from './ui/LevelUpOverlay';
import MetaShop from './ui/MetaShop';
import PauseOverlay from './ui/PauseOverlay';
import DefeatOverlay from './ui/DefeatOverlay';
import Joystick from './ui/Joystick';
import { showInterstitialAd } from './monetization/ads';
import { initAudio, setMuted } from './audio/synth';

function Game() {
  const { state, dispatch } = useGame();
  const worldRef = useRef<World | null>(null);
  const [joystick, setJoystick] = useState({ ax: 0, ay: 0 });
  const [vignetteUntilMs, setVignetteUntilMs] = useState(0);
  const [, setVignetteTick] = useState(0);

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

  // Unlock Web Audio on first user gesture.
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

  // Keep audio mute synced with settings.
  useEffect(() => {
    setMuted(state.settings.sfxMuted);
  }, [state.settings.sfxMuted]);

  // Auto-fade the hurt vignette when its timer expires.
  useEffect(() => {
    if (vignetteUntilMs === 0) return;
    const remaining = vignetteUntilMs - performance.now();
    if (remaining <= 0) {
      setVignetteUntilMs(0);
      return;
    }
    const t = setTimeout(() => setVignetteTick((x) => x + 1), remaining);
    return () => clearTimeout(t);
  }, [vignetteUntilMs]);

  const handleEvent = useCallback(
    (e: EngineEvent) => {
      switch (e.type) {
        case 'PLAYER_HURT':
          dispatch({ type: 'EVENT_PLAYER_HURT', damage: e.damage });
          break;
        case 'ENEMY_KILLED':
          dispatch({ type: 'EVENT_ENEMY_KILLED' });
          break;
        case 'ORB_COLLECTED':
          // XP arrives via SYNC_RUN; no dispatch needed.
          break;
        case 'LEVEL_UP':
          dispatch({ type: 'EVENT_LEVEL_UP' });
          break;
        case 'PLAYER_DIED':
          dispatch({
            type: 'EVENT_PLAYER_DIED',
            timeSurvived: e.timeSurvived,
            kills: e.kills,
            level: e.level,
          });
          break;
      }
    },
    [dispatch],
  );

  const handleSync = useCallback(
    (world: World) => {
      dispatch({
        type: 'SYNC_RUN',
        hp: world.player.hp,
        maxHp: world.player.maxHp,
        runLevel: world.player.level,
        runXp: world.player.xp,
        runXpNeeded: xpToNextLevel(world.player.level),
        runTime: world.time,
        runKills: world.kills,
      });
    },
    [dispatch],
  );

  const handlePick = useCallback(
    (id: UpgradeId) => {
      const world = worldRef.current;
      if (world) applyUpgrade(world, id);
      dispatch({ type: 'PICK_UPGRADE', id });
    },
    [dispatch],
  );

  const handleRevive = useCallback(() => {
    const world = worldRef.current;
    if (world) {
      world.player.alive = true;
      world.player.hp = Math.floor(world.player.maxHp / 2);
      world.player.invulnUntil = world.time + 2;
    }
    dispatch({ type: 'REVIVE_GRANT' });
  }, [dispatch]);

  const handleReturnToMenu = useCallback(async () => {
    // Fire-and-forget interstitial (never throws).
    await showInterstitialAd();
    dispatch({ type: 'RETURN_TO_MENU' });
  }, [dispatch]);

  // Canvas ticks when playing and no level-up overlay open.
  const canvasActive =
    state.phase === 'playing' && state.currentChoices.length === 0;
  const showHud =
    state.phase === 'playing' || state.phase === 'paused';

  return (
    <div className="flex h-[100dvh] w-full bg-ns-bg">
      <div className="relative h-full w-full">
        <GameCanvas
          meta={state.meta}
          active={canvasActive}
          runId={state.runId}
          sfxMuted={state.settings.sfxMuted}
          worldRef={worldRef}
          onEvent={handleEvent}
          onSyncFrame={handleSync}
          joystick={joystick}
          onHurtVignette={setVignetteUntilMs}
        />

        {/* Damage vignette (DOM layer). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] transition-opacity duration-200"
          style={{
            opacity: vignetteUntilMs > performance.now() ? 1 : 0,
            boxShadow:
              'inset 0 0 120px 20px rgba(255, 77, 109, 0.55)',
            background:
              'radial-gradient(ellipse at center, transparent 60%, rgba(255, 77, 109, 0.25) 100%)',
          }}
        />

        {showHud && <Hud />}
        {state.phase === 'playing' && (
          <Joystick visible={true} onChange={setJoystick} />
        )}

        {state.phase === 'menu' && (
          <MainMenu
            onOpenMeta={() => dispatch({ type: 'OPEN_META_SHOP' })}
          />
        )}
        <PauseOverlay onReturnToMenu={handleReturnToMenu} />
        <DefeatOverlay
          onRevive={handleRevive}
          onReturnToMenu={handleReturnToMenu}
        />
        <LevelUpOverlay onPick={handlePick} />
        <MetaShop />
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
