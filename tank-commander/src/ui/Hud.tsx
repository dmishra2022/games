import { useGame } from '../state/GameContext';

export default function Hud() {
  const { state, dispatch } = useGame();
  const hud = state.hud;
  const hpFrac = Math.max(0, Math.min(1, hud.hp / Math.max(1, hud.maxHp)));
  const reloadFrac =
    hud.reloadTime > 0 ? 1 - hud.reload / hud.reloadTime : 1;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none text-tc-steel">
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 flex items-start justify-between px-3 py-2 text-xs uppercase tracking-widest sm:px-6 sm:py-3">
        <div className="pointer-events-auto flex flex-col gap-0.5 rounded-sm bg-tc-panel/70 px-3 py-1 backdrop-blur">
          <div>
            <span className="text-tc-rust">ARENA</span>{' '}
            <span className="font-display text-tc-amber">
              {hud.arenaIndex + 1}/{state.arenaCount}
            </span>
          </div>
          <div>
            <span className="text-tc-rust">WAVE</span>{' '}
            <span className="font-display text-tc-amber">
              {hud.wave}/{hud.wavesPerArena}
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex min-w-[180px] max-w-[320px] flex-1 flex-col items-center gap-1 px-4 sm:min-w-[260px]">
          <div className="flex w-full items-center gap-2">
            <span className="font-display text-tc-rust">HP</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-sm border border-tc-ash bg-tc-bg">
              <div
                className={`h-full ${
                  hpFrac > 0.33 ? 'bg-tc-olive' : 'bg-tc-blood'
                }`}
                style={{ width: `${hpFrac * 100}%` }}
              />
            </div>
            <span className="min-w-[48px] text-right font-display text-tc-amber">
              {Math.ceil(hud.hp)}
            </span>
          </div>
          <div className="flex w-full items-center gap-2">
            <span className="font-display text-tc-rust">RLD</span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-sm border border-tc-ash bg-tc-bg">
              <div
                className="h-full bg-tc-amber"
                style={{ width: `${reloadFrac * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-1">
          <div className="rounded-sm bg-tc-panel/70 px-3 py-1 backdrop-blur">
            <span className="text-tc-rust">KILLS</span>{' '}
            <span className="font-display text-tc-amber">{hud.kills}</span>
          </div>
          <div className="rounded-sm bg-tc-panel/70 px-3 py-1 backdrop-blur">
            <span className="text-tc-rust">PAY</span>{' '}
            <span className="font-display text-tc-amber">
              +{state.arenaRunCredits}
            </span>
          </div>
          <button
            onClick={() => dispatch({ type: 'PAUSE' })}
            className="pointer-events-auto rounded-sm border border-tc-ash bg-tc-panel/80 px-3 py-1 font-display text-xs text-tc-steel hover:border-tc-amber hover:text-tc-amber"
          >
            ‖ PAUSE
          </button>
        </div>
      </div>
    </div>
  );
}
