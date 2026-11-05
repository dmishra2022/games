import { useGame } from '../state/GameContext';
import { formatTime } from './Button';

export default function Hud() {
  const { state, dispatch } = useGame();
  const hpPct = state.maxHp > 0 ? (state.hp / state.maxHp) * 100 : 0;
  const xpPct =
    state.runXpNeeded > 0 ? (state.runXp / state.runXpNeeded) * 100 : 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Top row */}
      <div className="pointer-events-auto flex items-start justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent p-2 md:p-3">
        <div className="min-w-[140px] font-display md:min-w-[200px]">
          <div className="flex items-baseline justify-between text-[10px] uppercase tracking-widest text-neutral-300">
            <span>HP</span>
            <span>
              {Math.ceil(state.hp)}/{state.maxHp}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-ns-dim/60">
            <div
              className="h-full bg-ns-red transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
            />
          </div>
        </div>

        <div className="text-center font-display">
          <div className="text-[10px] uppercase tracking-widest text-neutral-300">
            Level
          </div>
          <div className="text-2xl font-bold leading-none text-ns-lime">
            {state.runLevel}
          </div>
        </div>

        <div className="flex items-start gap-2 font-display">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-neutral-300">
              Time
            </div>
            <div className="text-lg font-bold leading-none text-ns-cyan">
              {formatTime(state.runTime)}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-neutral-300">
              Kills
            </div>
            <div className="text-lg font-bold leading-none text-white">
              {state.runKills}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'OPEN_PAUSE' })}
            aria-label="Pause"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ns-panel/80 text-white hover:bg-ns-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <span aria-hidden="true" className="text-lg">
              ||
            </span>
          </button>
        </div>
      </div>

      {/* Bottom XP bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 p-2 md:p-3">
        <div className="flex items-baseline justify-between text-[10px] uppercase tracking-widest text-neutral-300">
          <span>XP</span>
          <span>
            {Math.floor(state.runXp)}/{state.runXpNeeded}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-sm bg-ns-dim/60">
          <div
            className="h-full bg-ns-cyan shadow-ns-cyan transition-all duration-150"
            style={{ width: `${Math.max(0, Math.min(100, xpPct))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
