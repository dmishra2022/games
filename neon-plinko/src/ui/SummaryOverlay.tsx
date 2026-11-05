import { useState } from 'react';
import { useGame } from '../state/GameContext';
import { REFILL_BALLS, REFILL_COST } from '../state/reducer';
import { showInterstitialAd, triggerRewardedAd } from '../monetization/ads';
import Button from './Button';

export default function SummaryOverlay() {
  const { state, dispatch } = useGame();
  const [requestingAd, setRequestingAd] = useState(false);
  if (state.phase !== 'summary') return null;
  const canRefill = state.credits >= REFILL_COST;

  const handleFreeBalls = async () => {
    if (requestingAd) return;
    setRequestingAd(true);
    try {
      const result = await triggerRewardedAd();
      if (result === 'rewarded') {
        dispatch({ type: 'GRANT_FREE_BALLS', amount: REFILL_BALLS });
      }
    } finally {
      setRequestingAd(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Run summary"
      className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 p-4 backdrop-blur-sm"
    >
      <h2 className="font-display text-3xl font-bold uppercase tracking-widest text-neon-magenta">
        Out of balls
      </h2>
      <div className="text-center font-display">
        <div className="text-xs uppercase tracking-widest text-neutral-400">
          Credits
        </div>
        <div className="text-3xl font-bold text-neon-yellow">
          {state.credits.toLocaleString()}
        </div>
      </div>
      <div className="flex w-full max-w-[260px] flex-col gap-2">
        <Button
          variant="primary"
          onClick={() => dispatch({ type: 'REFILL_BALLS' })}
          disabled={!canRefill}
        >
          {canRefill
            ? `Refill +${REFILL_BALLS} for ${REFILL_COST}`
            : `Need ${REFILL_COST} credits`}
        </Button>
        <Button
          variant="secondary"
          onClick={handleFreeBalls}
          disabled={requestingAd}
        >
          {requestingAd ? 'Loading…' : `Free +${REFILL_BALLS} balls (ad)`}
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            await showInterstitialAd();
            dispatch({ type: 'RETURN_TO_MENU' });
          }}
        >
          Back to Menu
        </Button>
      </div>
    </div>
  );
}
