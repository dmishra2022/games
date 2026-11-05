import { describe, expect, it } from 'vitest';
import {
  initialState,
  reducer,
  REFILL_BALLS,
  REFILL_COST,
  STARTING_BALLS,
  UPGRADE_META,
  type AppState,
} from '../state/reducer';
import { migrate } from '../state/storage';

describe('reducer', () => {
  it('starts a run and switches to playing', () => {
    const next = reducer(initialState(), { type: 'START_RUN' });
    expect(next.phase).toBe('playing');
    expect(next.ballsRemaining).toBe(STARTING_BALLS);
  });

  it('decrements balls on DROP_CONSUMED but never below 0', () => {
    let s = initialState();
    s = reducer(s, { type: 'START_RUN' });
    for (let i = 0; i < STARTING_BALLS + 3; i++) {
      s = reducer(s, { type: 'DROP_CONSUMED' });
    }
    expect(s.ballsRemaining).toBe(0);
    expect(s.stats.totalDrops).toBe(STARTING_BALLS + 3);
  });

  it('awards credits = floor(runScore * multiplier) on BUCKET_LAND', () => {
    const s = reducer(initialState(), {
      type: 'BUCKET_LAND',
      runScore: 123,
      multiplier: 3,
    });
    expect(s.credits).toBe(369);
    expect(s.highScore).toBe(123);
  });

  it('updates highScore to the max of previous and new score', () => {
    const base = { ...initialState(), highScore: 500 };
    const s = reducer(base, {
      type: 'BUCKET_LAND',
      runScore: 400,
      multiplier: 1,
    });
    expect(s.highScore).toBe(500);
  });

  it('transitions to summary when no balls and queue is empty on settle', () => {
    let s = initialState();
    s = reducer(s, { type: 'START_RUN' });
    s = { ...s, ballsRemaining: 0, queuedDrops: 0 };
    s = reducer(s, { type: 'DROP_SETTLED' });
    expect(s.phase).toBe('summary');
  });

  it('does not transition to summary while queued drops remain', () => {
    let s = initialState();
    s = reducer(s, { type: 'START_RUN' });
    s = { ...s, ballsRemaining: 0, queuedDrops: 2, phase: 'playing' };
    s = reducer(s, { type: 'DROP_SETTLED' });
    expect(s.phase).toBe('playing');
  });

  it('buys an upgrade only when credits are sufficient', () => {
    let s = { ...initialState(), credits: 10 };
    s = reducer(s, { type: 'BUY_UPGRADE', key: 'pegBonus' });
    expect(s.upgrades.pegBonus).toBe(0);
    expect(s.credits).toBe(10);
    s = { ...s, credits: 100 };
    s = reducer(s, { type: 'BUY_UPGRADE', key: 'pegBonus' });
    expect(s.upgrades.pegBonus).toBe(1);
    expect(s.credits).toBe(100 - UPGRADE_META.pegBonus.costAt(0));
  });

  it('refills balls at the configured cost', () => {
    let s: AppState = { ...initialState(), credits: 50, ballsRemaining: 0, phase: 'summary' };
    s = reducer(s, { type: 'REFILL_BALLS' });
    expect(s.credits).toBe(50 - REFILL_COST);
    expect(s.ballsRemaining).toBe(REFILL_BALLS);
    expect(s.phase).toBe('playing');
  });

  it('refuses refill without credits', () => {
    const s = reducer(
      { ...initialState(), credits: 0, ballsRemaining: 0 },
      { type: 'REFILL_BALLS' },
    );
    expect(s.ballsRemaining).toBe(0);
  });

  it('GRANT_FREE_BALLS adds balls without touching credits', () => {
    const s = reducer(
      { ...initialState(), credits: 0, ballsRemaining: 0, phase: 'summary' },
      { type: 'GRANT_FREE_BALLS', amount: 5 },
    );
    expect(s.ballsRemaining).toBe(5);
    expect(s.credits).toBe(0);
    expect(s.phase).toBe('playing');
  });

  it('GRANT_FREE_BALLS is a no-op for zero/negative amount', () => {
    const base: AppState = {
      ...initialState(),
      credits: 10,
      ballsRemaining: 3,
    };
    const s = reducer(base, { type: 'GRANT_FREE_BALLS', amount: 0 });
    expect(s).toBe(base);
  });

  it('toggles sfx mute idempotently', () => {
    let s = initialState();
    expect(s.settings.sfxMuted).toBe(false);
    s = reducer(s, { type: 'TOGGLE_SFX' });
    expect(s.settings.sfxMuted).toBe(true);
    s = reducer(s, { type: 'TOGGLE_SFX' });
    expect(s.settings.sfxMuted).toBe(false);
  });
});

describe('migrate', () => {
  it('returns defaults for unknown input', () => {
    const d = migrate(null);
    expect(d.saveVersion).toBe(1);
    expect(d.credits).toBe(0);
  });

  it('rejects wrong saveVersion', () => {
    const d = migrate({ saveVersion: 99, credits: 500 });
    expect(d.credits).toBe(0);
  });

  it('clamps upgrade levels into [0,5]', () => {
    const d = migrate({
      saveVersion: 1,
      credits: 5,
      highScore: 7,
      upgrades: { multiDrop: -4, pegBonus: 99, bucketBias: 2.5 },
      stats: { totalDrops: 10 },
      settings: { sfxMuted: true },
    });
    expect(d.upgrades.multiDrop).toBe(0);
    expect(d.upgrades.pegBonus).toBe(5);
    expect(d.upgrades.bucketBias).toBe(2);
    expect(d.settings.sfxMuted).toBe(true);
  });
});
