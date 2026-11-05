import { useGame } from '../state/GameContext';

export default function MainMenu() {
  const { state, dispatch } = useGame();
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center bg-tc-bg/85 text-tc-steel">
      <div className="mb-8 text-center">
        <h1 className="font-display text-6xl tracking-widest text-tc-amber drop-shadow-[0_0_8px_rgba(240,168,48,0.4)] sm:text-7xl">
          TANK COMMANDER
        </h1>
        <div className="mt-1 text-xs uppercase tracking-[0.4em] text-tc-rust">
          Ironhide Division · Operation Smokescreen
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3 px-6">
        <button
          onClick={() => dispatch({ type: 'START_RUN' })}
          className="rounded-sm border-2 border-tc-amber bg-tc-amber/10 px-6 py-3 font-display text-2xl uppercase tracking-widest text-tc-amber transition hover:bg-tc-amber/25 active:scale-[0.98]"
        >
          Deploy
        </button>
        <button
          onClick={() => dispatch({ type: 'OPEN_SHOP' })}
          className="rounded-sm border border-tc-ash bg-tc-panel px-6 py-3 font-display text-xl uppercase tracking-widest text-tc-steel transition hover:border-tc-amber hover:text-tc-amber"
        >
          Workshop
        </button>
      </div>

      <div className="mt-8 flex items-center gap-6 text-xs uppercase tracking-widest">
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
          Reduced Motion {state.settings.reducedMotion ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="mt-8 text-sm text-tc-steel/70">
        Credits:{' '}
        <span className="font-display text-xl text-tc-amber">
          {state.credits}
        </span>
      </div>

      <div className="mt-10 max-w-md px-6 text-center text-xs text-tc-steel/60">
        WASD / Arrows to drive. Mouse aims, left-click fires.<br />
        On mobile: left stick drives, right stick aims and fires.
      </div>
    </div>
  );
}
