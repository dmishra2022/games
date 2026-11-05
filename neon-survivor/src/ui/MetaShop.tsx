import { useGame } from '../state/GameContext';
import {
  META_KEYS,
  META_MAX_LEVEL,
  META_META,
} from '../engine/meta';
import Button from './Button';

export default function MetaShop() {
  const { state, dispatch } = useGame();
  if (!state.showMetaShop) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Meta upgrades"
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-lg border border-ns-dim bg-ns-panel p-4 shadow-ns-cyan">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold uppercase tracking-widest text-ns-cyan">
            Permanent Upgrades
          </h2>
          <div className="text-sm text-ns-amber">
            {state.credits.toLocaleString()} credits
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {META_KEYS.map((k) => {
            const lvl = state.meta[k];
            const meta = META_META[k];
            const maxed = lvl >= META_MAX_LEVEL;
            const cost = maxed ? 0 : meta.costAt(lvl);
            const canBuy = !maxed && state.credits >= cost;
            return (
              <li
                key={k}
                className="rounded-md border border-ns-dim bg-ns-bg/60 p-3"
              >
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-base font-bold uppercase tracking-wider text-white">
                    {meta.label}
                  </div>
                  <div className="font-mono text-xs text-neutral-400">
                    Lv {lvl}/{META_MAX_LEVEL}
                  </div>
                </div>
                <div className="mt-1 text-sm text-neutral-300">
                  {meta.description}
                </div>
                <div className="mt-1 text-xs text-ns-cyan">
                  Current: {meta.effectAt(lvl)}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {Array.from({ length: META_MAX_LEVEL }, (_, i) => (
                      <span
                        key={i}
                        className={
                          'h-2 flex-1 rounded ' +
                          (i < lvl ? 'bg-ns-magenta' : 'bg-ns-dim')
                        }
                      />
                    ))}
                  </div>
                  <Button
                    variant="primary"
                    disabled={!canBuy}
                    onClick={() => dispatch({ type: 'BUY_META', key: k })}
                  >
                    {maxed ? 'Maxed' : `Buy · ${cost}`}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: 'CLOSE_META_SHOP' })}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
