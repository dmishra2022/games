import { useGame } from '../state/GameContext';
import {
  MAX_UPGRADE_LEVEL,
  UPGRADE_META,
  type UpgradeKey,
} from '../state/reducer';
import { playClick, playPurchase } from '../audio/synth';
import Button from './Button';

const ORDER: UpgradeKey[] = ['pegBonus', 'multiDrop', 'bucketBias'];

export default function UpgradesModal() {
  const { state, dispatch } = useGame();
  if (!state.showUpgrades) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upgrades"
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-lg border border-neon-dim bg-neon-panel p-4 shadow-neon-cyan">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold uppercase tracking-widest text-neon-cyan">
            Upgrades
          </h2>
          <div className="text-sm text-neon-yellow">
            {state.credits.toLocaleString()} credits
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {ORDER.map((key) => {
            const level = state.upgrades[key];
            const meta = UPGRADE_META[key];
            const maxed = level >= MAX_UPGRADE_LEVEL;
            const cost = maxed ? 0 : meta.costAt(level);
            const canBuy = !maxed && state.credits >= cost;
            return (
              <li
                key={key}
                className="rounded-md border border-neon-dim bg-neon-bg/60 p-3"
              >
                <div className="flex items-baseline justify-between">
                  <div className="font-display text-base font-bold uppercase tracking-wider text-white">
                    {meta.label}
                  </div>
                  <div className="font-mono text-xs text-neutral-400">
                    Lv {level}/{MAX_UPGRADE_LEVEL}
                  </div>
                </div>
                <div className="mt-1 text-sm text-neutral-300">
                  {meta.description}
                </div>
                <div className="mt-1 text-xs text-neon-cyan">
                  Next: {meta.effectAt(Math.min(MAX_UPGRADE_LEVEL, level + 1))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {Array.from({ length: MAX_UPGRADE_LEVEL }, (_, i) => (
                      <span
                        key={i}
                        className={
                          'h-2 flex-1 rounded ' +
                          (i < level ? 'bg-neon-magenta' : 'bg-neon-dim')
                        }
                      />
                    ))}
                  </div>
                  <Button
                    variant="primary"
                    disabled={!canBuy}
                    onClick={() => {
                      if (!state.settings.sfxMuted) playPurchase();
                      dispatch({ type: 'BUY_UPGRADE', key });
                    }}
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
            onClick={() => {
              if (!state.settings.sfxMuted) playClick();
              dispatch({ type: 'CLOSE_UPGRADES' });
            }}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
