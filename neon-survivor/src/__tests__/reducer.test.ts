import { describe, expect, it } from 'vitest';
import {
  initialState,
  reducer,
  runReward,
  type AppState,
} from '../state/reducer';
import { migrate } from '../state/storage';
import { META_META } from '../engine/meta';

describe('reducer', () => {
  it('START_RUN bumps runId and clears ephemerals', () => {
    const base = initialState();
    const a = reducer(base, { type: 'START_RUN' });
    const b = reducer(a, { type: 'START_RUN' });
    expect(a.runId).toBe(base.runId + 1);
    expect(b.runId).toBe(a.runId + 1);
    expect(a.phase).toBe('playing');
    expect(a.runKills).toBe(0);
    expect(a.runLevel).toBe(1);
    expect(a.appliedUpgrades).toEqual({});
  });

  it('BUY_META spends credits and increments the level', () => {
    const base: AppState = { ...initialState(), credits: 500 };
    const cost = META_META.hp.costAt(0);
    const next = reducer(base, { type: 'BUY_META', key: 'hp' });
    expect(next.credits).toBe(500 - cost);
    expect(next.meta.hp).toBe(1);
  });

  it('BUY_META is a no-op when unaffordable', () => {
    const base: AppState = { ...initialState(), credits: 0 };
    const next = reducer(base, { type: 'BUY_META', key: 'hp' });
    expect(next).toBe(base);
  });

  it('EVENT_LEVEL_UP opens choices on first trigger and queues further ups', () => {
    let s = initialState();
    s = reducer(s, { type: 'START_RUN' });
    s = reducer(s, { type: 'EVENT_LEVEL_UP' });
    expect(s.currentChoices.length).toBeGreaterThan(0);
    expect(s.pendingLevelUps).toBe(1);
    s = reducer(s, { type: 'EVENT_LEVEL_UP' });
    // Queue grows; choices should still be present (one pick at a time).
    expect(s.pendingLevelUps).toBe(2);
    expect(s.currentChoices.length).toBeGreaterThan(0);
  });

  it('PICK_UPGRADE applies and clears choices when queue empties', () => {
    let s = initialState();
    s = reducer(s, { type: 'START_RUN' });
    s = reducer(s, { type: 'EVENT_LEVEL_UP' });
    const pick = s.currentChoices[0]!;
    s = reducer(s, { type: 'PICK_UPGRADE', id: pick });
    expect(s.appliedUpgrades[pick]).toBe(1);
    expect(s.pendingLevelUps).toBe(0);
    expect(s.currentChoices).toEqual([]);
  });

  it('EVENT_PLAYER_DIED awards credits and updates bests', () => {
    const s = reducer(initialState(), {
      type: 'EVENT_PLAYER_DIED',
      timeSurvived: 120,
      kills: 50,
      level: 7,
    });
    const reward = runReward(120, 50, 7);
    expect(s.credits).toBe(reward);
    expect(s.lastRunReward).toBe(reward);
    expect(s.bestTimeSeconds).toBe(120);
    expect(s.bestLevel).toBe(7);
    expect(s.phase).toBe('defeated');
    expect(s.stats.totalRuns).toBe(1);
  });

  it('TOGGLE_SFX is idempotent', () => {
    let s = initialState();
    s = reducer(s, { type: 'TOGGLE_SFX' });
    expect(s.settings.sfxMuted).toBe(true);
    s = reducer(s, { type: 'TOGGLE_SFX' });
    expect(s.settings.sfxMuted).toBe(false);
  });
});

describe('migrate', () => {
  it('returns defaults for garbage input', () => {
    expect(migrate(null).credits).toBe(0);
    expect(migrate({ saveVersion: 42 }).credits).toBe(0);
  });

  it('clamps meta levels to [0,5]', () => {
    const d = migrate({
      saveVersion: 1,
      credits: 5,
      bestTimeSeconds: 10,
      bestLevel: 3,
      meta: { hp: -1, damage: 99, speed: 2, xpGain: 2.7 },
      stats: { totalRuns: 1, totalKills: 2 },
      settings: { sfxMuted: true },
    });
    expect(d.meta.hp).toBe(0);
    expect(d.meta.damage).toBe(5);
    expect(d.meta.speed).toBe(2);
    expect(d.meta.xpGain).toBe(2);
    expect(d.settings.sfxMuted).toBe(true);
  });
});

describe('runReward', () => {
  it('matches the documented formula', () => {
    expect(runReward(0, 0, 1)).toBe(10);
    expect(runReward(60, 25, 4)).toBe(25 + 40 + 10);
    expect(runReward(180, 100, 10)).toBe(100 + 100 + 30);
  });
});
