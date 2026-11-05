import { useGame } from '../state/GameContext';

export default function VictoryOverlay() {
  const { state, dispatch } = useGame();
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-tc-bg/85 text-tc-steel">
      <div className="w-full max-w-md px-6 text-center">
        <h2 className="font-display text-5xl tracking-widest text-tc-amber drop-shadow-[0_0_8px_rgba(240,168,48,0.5)]">
          CAMPAIGN COMPLETE
        </h2>
        <div className="mt-2 text-xs uppercase tracking-widest text-tc-rust">
          All three arenas cleared, Commander.
        </div>
        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <div>
            Kills:{' '}
            <span className="font-display text-xl text-tc-amber">
              {state.hud.kills}
            </span>
          </div>
          <div>
            Credits earned:{' '}
            <span className="font-display text-xl text-tc-amber">
              +{state.arenaRunCredits}
            </span>
          </div>
          <div>
            Total credits (post):{' '}
            <span className="font-display text-xl text-tc-amber">
              {state.credits + state.arenaRunCredits}
            </span>
          </div>
        </div>
        <button
          onClick={() => dispatch({ type: 'RETURN_TO_MENU' })}
          className="mt-6 rounded-sm border-2 border-tc-amber bg-tc-amber/10 px-6 py-3 font-display text-lg uppercase tracking-widest text-tc-amber hover:bg-tc-amber/25"
        >
          Return to HQ
        </button>
      </div>
    </div>
  );
}
