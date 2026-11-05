import { useGame } from '../state/GameContext';

export default function WaveBanner() {
  const { state } = useGame();
  if (!state.waveBanner) return null;
  const wave = state.waveBanner.wave;
  const last = wave > state.hud.wavesPerArena;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[28%] z-20 flex justify-center"
      aria-live="polite"
    >
      <div className="rounded-sm border-2 border-tc-amber bg-tc-bg/80 px-8 py-3 text-center font-display tracking-[0.3em] shadow-tc-amber">
        <div className="text-2xl text-tc-amber">
          {last ? 'ARENA CLEARED' : `WAVE ${wave}`}
        </div>
        <div className="mt-1 text-xs uppercase text-tc-rust">
          {last ? 'ROLL OUT' : 'INCOMING'}
        </div>
      </div>
    </div>
  );
}
