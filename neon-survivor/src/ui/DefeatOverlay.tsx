import { useState } from 'react';
import { useGame } from '../state/GameContext';
import { triggerRewardedAd } from '../monetization/ads';
import Button, { formatTime } from './Button';

type Props = {
  onRevive: () => void;
  onReturnToMenu: () => void;
};

export default function DefeatOverlay({ onRevive, onReturnToMenu }: Props) {
  const { state } = useGame();
  const [requesting, setRequesting] = useState(false);
  if (state.phase !== 'defeated') return null;

  const handleRevive = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const result = await triggerRewardedAd();
      if (result === 'rewarded') onRevive();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Defeated"
      className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/80 p-4 backdrop-blur-sm"
    >
      <h2 className="font-display text-4xl font-bold uppercase tracking-widest text-ns-red drop-shadow-[0_0_12px_rgba(255,77,109,0.6)]">
        Defeated
      </h2>

      <div className="grid grid-cols-3 gap-5 text-center font-display">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400">
            Time
          </div>
          <div className="text-xl font-bold text-ns-cyan">
            {formatTime(state.runTime)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400">
            Level
          </div>
          <div className="text-xl font-bold text-ns-lime">
            {state.runLevel}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400">
            Kills
          </div>
          <div className="text-xl font-bold text-white">{state.runKills}</div>
        </div>
      </div>

      <div className="font-display text-center">
        <div className="text-[10px] uppercase tracking-widest text-neutral-400">
          Credits earned
        </div>
        <div className="text-3xl font-bold text-ns-amber">
          +{state.lastRunReward}
        </div>
      </div>

      <div className="flex w-full max-w-[260px] flex-col gap-2">
        <Button
          variant="secondary"
          onClick={handleRevive}
          disabled={requesting}
        >
          {requesting ? 'Loading…' : 'Revive (ad)'}
        </Button>
        <Button variant="ghost" onClick={onReturnToMenu}>
          Back to Menu
        </Button>
      </div>
    </div>
  );
}
