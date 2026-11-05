import { useGame } from '../state/GameContext';
import Button from './Button';

export default function MainMenu() {
  const { state, dispatch, resetProgress } = useGame();

  const confirmReset = () => {
    const ok = window.confirm(
      'Reset all progress? Credits, upgrades, and high score will be erased.',
    );
    if (ok) resetProgress();
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-neon-bg/85 backdrop-blur-sm">
      <h1 className="font-display text-5xl font-bold uppercase tracking-[0.3em] text-neon-cyan drop-shadow-[0_0_12px_rgba(90,215,255,0.6)] md:text-6xl">
        Neon
        <br />
        <span className="text-neon-magenta drop-shadow-[0_0_12px_rgba(255,90,215,0.6)]">
          Plinko
        </span>
      </h1>

      <div className="flex w-full max-w-[260px] flex-col gap-3">
        <Button
          variant="primary"
          onClick={() => dispatch({ type: 'START_RUN' })}
        >
          Play
        </Button>
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: 'OPEN_UPGRADES' })}
        >
          Upgrades
        </Button>
      </div>

      <div className="flex gap-6 text-center font-display">
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-400">
            High score
          </div>
          <div className="text-2xl font-bold text-neon-cyan">
            {state.highScore.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-400">
            Credits
          </div>
          <div className="text-2xl font-bold text-neon-yellow">
            {state.credits.toLocaleString()}
          </div>
        </div>
      </div>

      <label className="mt-2 flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={state.settings.sfxMuted}
          onChange={() => dispatch({ type: 'TOGGLE_SFX' })}
          className="h-4 w-4 accent-neon-magenta"
        />
        Mute SFX
      </label>

      <button
        type="button"
        onClick={confirmReset}
        className="text-xs uppercase tracking-widest text-neutral-500 underline-offset-2 hover:text-red-400 hover:underline focus:outline-none focus-visible:text-red-400"
      >
        Reset progress
      </button>
    </div>
  );
}
