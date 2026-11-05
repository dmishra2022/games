import { useGame } from '../state/GameContext';
import { showRewardedAd } from '../ads/ads';

export default function DefeatOverlay() {
  const { state, dispatch } = useGame();

  const onRepair = async () => {
    const ok = await showRewardedAd('repair');
    if (!ok) return;
    // Partial repair: GameCanvas reads this on runId-less re-render.
    // We skip remounting the canvas; instead we mutate the live world via
    // a global event. For simplicity, we restart the current arena.
    dispatch({ type: 'REWARDED_REPAIR_APPLIED' });
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-tc-bg/85 text-tc-steel">
      <div className="w-full max-w-md px-6 text-center">
        <h2 className="font-display text-5xl tracking-widest text-tc-blood drop-shadow-[0_0_8px_rgba(139,30,30,0.5)]">
          DESTROYED
        </h2>
        <div className="mt-2 text-xs uppercase tracking-widest text-tc-rust">
          You held at Arena {state.hud.arenaIndex + 1} · Wave {state.hud.wave}
        </div>
        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <div>
            Kills this run:{' '}
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
        <div className="mt-6 flex flex-col gap-3">
          {!state.reviveUsed && (
            <button
              onClick={onRepair}
              className="rounded-sm border-2 border-tc-amber bg-tc-amber/10 px-6 py-3 font-display text-lg uppercase tracking-widest text-tc-amber hover:bg-tc-amber/25"
            >
              Repair · Watch Ad
            </button>
          )}
          <button
            onClick={() => dispatch({ type: 'RETURN_TO_MENU' })}
            className="rounded-sm border border-tc-ash px-6 py-3 font-display text-lg uppercase tracking-widest text-tc-steel hover:border-tc-amber hover:text-tc-amber"
          >
            Return to HQ
          </button>
        </div>
      </div>
    </div>
  );
}
