import { useGame } from '../state/GameContext';
import Button, { formatTime } from './Button';

type Props = {
  onOpenMeta: () => void;
};

export default function MainMenu({ onOpenMeta }: Props) {
  const { state, dispatch, resetProgress } = useGame();

  const confirmReset = () => {
    const ok = window.confirm(
      'Reset all progress? Credits, meta-upgrades, and best run will be erased.',
    );
    if (ok) resetProgress();
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-ns-bg/85 p-4 backdrop-blur-sm">
      <h1 className="text-center font-display text-4xl font-bold uppercase tracking-[0.3em] text-ns-cyan drop-shadow-[0_0_14px_rgba(57,226,255,0.55)] md:text-6xl">
        Neon
        <br />
        <span className="text-ns-magenta drop-shadow-[0_0_14px_rgba(255,61,240,0.55)]">
          Survivor
        </span>
      </h1>

      <div className="flex w-full max-w-[260px] flex-col gap-3">
        <Button
          variant="primary"
          onClick={() => dispatch({ type: 'START_RUN' })}
        >
          Play
        </Button>
        <Button variant="secondary" onClick={onOpenMeta}>
          Upgrades
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-5 text-center font-display">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400">
            Best time
          </div>
          <div className="text-2xl font-bold text-ns-cyan">
            {formatTime(state.bestTimeSeconds)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400">
            Best lvl
          </div>
          <div className="text-2xl font-bold text-ns-lime">
            {state.bestLevel}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400">
            Credits
          </div>
          <div className="text-2xl font-bold text-ns-amber">
            {state.credits.toLocaleString()}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={state.settings.sfxMuted}
          onChange={() => dispatch({ type: 'TOGGLE_SFX' })}
          className="h-4 w-4 accent-ns-magenta"
        />
        Mute SFX
      </label>

      <button
        type="button"
        onClick={confirmReset}
        className="text-xs uppercase tracking-widest text-neutral-500 underline-offset-2 hover:text-ns-red hover:underline focus:outline-none focus-visible:text-ns-red"
      >
        Reset progress
      </button>
    </div>
  );
}
