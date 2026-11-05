import { useGame } from '../state/GameContext';

export default function Hud() {
  const { state, dispatch } = useGame();

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between">
      <div className="pointer-events-auto flex items-start justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent p-2 md:p-3">
        <div className="font-display">
          <div className="text-[10px] uppercase tracking-widest text-neutral-300">
            Score
          </div>
          <div className="text-2xl font-bold leading-none text-neon-cyan">
            {state.runScore.toLocaleString()}
          </div>
        </div>
        <div className="font-display text-center">
          <div className="text-[10px] uppercase tracking-widest text-neutral-300">
            Combo
          </div>
          <div
            key={state.lastCombo}
            className="animate-[pulse_0.4s_ease-out_1] text-2xl font-bold leading-none text-neon-magenta"
          >
            x{state.lastCombo}
          </div>
        </div>
        <div className="font-display text-right">
          <div className="text-[10px] uppercase tracking-widest text-neutral-300">
            Balls
          </div>
          <div className="text-2xl font-bold leading-none text-white">
            {state.ballsRemaining}
          </div>
        </div>
      </div>

      <div className="pointer-events-auto flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 md:p-3">
        <div className="font-display">
          <div className="text-[10px] uppercase tracking-widest text-neutral-300">
            Credits
          </div>
          <div className="text-xl font-bold text-neon-yellow">
            {state.credits.toLocaleString()}
          </div>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: 'OPEN_PAUSE' })}
          aria-label="Pause"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-neon-panel/80 text-white hover:bg-neon-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          <span aria-hidden="true" className="text-lg">
            ||
          </span>
        </button>
      </div>
    </div>
  );
}
