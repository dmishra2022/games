import { useEffect } from 'react';
import { useGame } from '../state/GameContext';
import { UPGRADES, type UpgradeId } from '../engine/upgrades';
import Button from './Button';

type Props = {
  onPick: (id: UpgradeId) => void;
};

export default function LevelUpOverlay({ onPick }: Props) {
  const { state } = useGame();
  const choices = state.currentChoices;

  // Keyboard shortcuts 1, 2, 3.
  useEffect(() => {
    if (choices.length === 0) return;
    const onKey = (ev: KeyboardEvent) => {
      const idx = ['1', '2', '3'].indexOf(ev.key);
      if (idx >= 0 && choices[idx]) onPick(choices[idx]!);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choices, onPick]);

  if (choices.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose an upgrade"
      className="pointer-events-auto absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/75 p-4 backdrop-blur-sm"
    >
      <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-ns-lime drop-shadow-[0_0_12px_rgba(155,255,90,0.55)]">
        Level {state.runLevel}
      </h2>
      <p className="text-center text-xs uppercase tracking-widest text-neutral-300">
        Choose an upgrade
      </p>
      <div className="flex w-full max-w-4xl flex-col gap-3 md:flex-row">
        {choices.map((id, i) => {
          const u = UPGRADES[id];
          const stacks = state.appliedUpgrades[id] ?? 0;
          return (
            <Button
              key={id}
              variant={i === 0 ? 'primary' : i === 1 ? 'secondary' : 'ghost'}
              onClick={() => onPick(id)}
              className="min-h-[120px] flex-1 flex-col items-stretch justify-between gap-2 py-4 text-left normal-case"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold uppercase tracking-wider">
                  {u.label}
                </span>
                <span className="font-mono text-[10px] opacity-70">
                  {i + 1}
                </span>
              </div>
              <div className="text-xs leading-snug opacity-90">
                {u.description}
              </div>
              <div className="text-[10px] uppercase tracking-widest opacity-70">
                Stack {stacks}/{u.maxStacks}
              </div>
            </Button>
          );
        })}
      </div>
      <div className="font-display text-[10px] uppercase tracking-widest text-neutral-500">
        Queued: {state.pendingLevelUps}
      </div>
    </div>
  );
}
