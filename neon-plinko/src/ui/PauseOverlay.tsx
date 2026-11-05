import { useGame } from '../state/GameContext';
import { showInterstitialAd } from '../monetization/ads';
import Button from './Button';

export default function PauseOverlay() {
  const { state, dispatch } = useGame();
  if (state.phase !== 'paused') return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paused"
      className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm"
    >
      <h2 className="font-display text-3xl font-bold uppercase tracking-widest text-neon-cyan">
        Paused
      </h2>
      <div className="flex w-full max-w-[220px] flex-col gap-2">
        <Button variant="primary" onClick={() => dispatch({ type: 'RESUME' })}>
          Resume
        </Button>
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: 'OPEN_UPGRADES' })}
        >
          Upgrades
        </Button>
        <Button
          variant="ghost"
          onClick={() => dispatch({ type: 'TOGGLE_SFX' })}
        >
          {state.settings.sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            await showInterstitialAd();
            dispatch({ type: 'RETURN_TO_MENU' });
          }}
        >
          Main Menu
        </Button>
      </div>
    </div>
  );
}
