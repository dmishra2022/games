import { useGame } from '../state/GameContext';

export default function PauseOverlay() {
  const { state, dispatch } = useGame();
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-tc-bg/80 text-tc-steel">
      <div className="w-full max-w-sm px-6 text-center">
        <h2 className="font-display text-4xl tracking-widest text-tc-amber">
          PAUSED
        </h2>
        <div className="mt-2 text-xs uppercase tracking-widest text-tc-rust">
          ARENA {state.hud.arenaIndex + 1} · WAVE {state.hud.wave}/
          {state.hud.wavesPerArena}
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => dispatch({ type: 'RESUME' })}
            className="rounded-sm border-2 border-tc-amber bg-tc-amber/10 px-6 py-3 font-display text-xl uppercase tracking-widest text-tc-amber hover:bg-tc-amber/25"
          >
            Resume
          </button>
          <button
            onClick={() => dispatch({ type: 'QUIT_TO_MENU' })}
            className="rounded-sm border border-tc-ash px-6 py-3 font-display text-lg uppercase tracking-widest text-tc-steel hover:border-tc-amber hover:text-tc-amber"
          >
            Quit to HQ
          </button>
          <div className="mt-2 flex justify-center gap-4 text-xs uppercase tracking-widest">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SFX' })}
              className={`rounded-sm border px-3 py-1 ${
                state.settings.sfx
                  ? 'border-tc-amber text-tc-amber'
                  : 'border-tc-ash text-tc-steel/60'
              }`}
            >
              SFX {state.settings.sfx ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_REDUCED_MOTION' })}
              className={`rounded-sm border px-3 py-1 ${
                state.settings.reducedMotion
                  ? 'border-tc-amber text-tc-amber'
                  : 'border-tc-ash text-tc-steel/60'
              }`}
            >
              RM {state.settings.reducedMotion ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
