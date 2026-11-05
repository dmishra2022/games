import { META_KEYS, META_MAX_LEVEL, META_META } from '../engine/meta';
import { useGame } from '../state/GameContext';

export default function MetaShop() {
  const { state, dispatch } = useGame();
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-start overflow-y-auto bg-tc-bg/90 py-10 text-tc-steel">
      <div className="mb-6 text-center">
        <h2 className="font-display text-4xl tracking-widest text-tc-amber">
          WORKSHOP
        </h2>
        <div className="mt-1 text-xs uppercase tracking-widest text-tc-rust">
          Credits:{' '}
          <span className="font-display text-xl text-tc-amber">
            {state.credits}
          </span>
        </div>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-3 px-6 sm:grid-cols-2">
        {META_KEYS.map((k) => {
          const lvl = state.meta[k];
          const meta = META_META[k];
          const atCap = lvl >= META_MAX_LEVEL;
          const cost = atCap ? Infinity : meta.costAt(lvl);
          const canAfford = state.credits >= cost;
          return (
            <div
              key={k}
              className="flex flex-col gap-2 rounded-sm border border-tc-ash bg-tc-panel p-4"
            >
              <div className="flex items-baseline justify-between">
                <div className="font-display text-xl uppercase tracking-widest text-tc-amber">
                  {meta.label}
                </div>
                <div className="text-xs uppercase tracking-widest text-tc-steel/70">
                  LVL {lvl}/{META_MAX_LEVEL}
                </div>
              </div>
              <div className="text-sm text-tc-steel/80">{meta.description}</div>
              <div className="text-xs text-tc-steel/60">
                Current: {meta.effectAt(lvl)}
              </div>
              <button
                disabled={atCap || !canAfford}
                onClick={() => dispatch({ type: 'BUY_META', key: k })}
                className={`mt-2 rounded-sm px-3 py-2 font-display text-sm uppercase tracking-widest transition ${
                  atCap
                    ? 'border border-tc-ash/60 text-tc-steel/40'
                    : canAfford
                      ? 'border-2 border-tc-amber bg-tc-amber/10 text-tc-amber hover:bg-tc-amber/20'
                      : 'border border-tc-ash text-tc-steel/40'
                }`}
              >
                {atCap ? 'MAXED' : `UPGRADE · ${cost}c`}
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => dispatch({ type: 'CLOSE_SHOP' })}
        className="mt-8 rounded-sm border border-tc-ash px-6 py-2 font-display text-sm uppercase tracking-widest text-tc-steel hover:border-tc-amber hover:text-tc-amber"
      >
        Back to HQ
      </button>
    </div>
  );
}
