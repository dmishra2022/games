import { useGame } from '../state/GameContext';
import Button from './Button';

type Props = {
  onReturnToMenu: () => void;
};

export default function PauseOverlay({ onReturnToMenu }: Props) {
  const { state, dispatch } = useGame();
  if (state.phase !== 'paused') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paused"
      className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/75 backdrop-blur-sm"
    >
      <h2 className="font-display text-3xl font-bold uppercase tracking-widest text-ns-cyan">
        Paused
      </h2>
      <div className="flex w-full max-w-[220px] flex-col gap-2">
        <Button variant="primary" onClick={() => dispatch({ type: 'RESUME' })}>
          Resume
        </Button>
        <Button
          variant="ghost"
          onClick={() => dispatch({ type: 'TOGGLE_SFX' })}
        >
          {state.settings.sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
        </Button>
        <Button variant="ghost" onClick={onReturnToMenu}>
          Main Menu
        </Button>
      </div>
    </div>
  );
}
