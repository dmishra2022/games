import { describe, it, expect } from 'vitest';
import {
  initialState,
  reducer,
  type AppState,
} from '../state/reducer';
import { CREDITS } from '../engine/constants';
import { META_META } from '../engine/meta';

function freshState(credits = 0): AppState {
  return initialState({
    credits,
    meta: { hp: 0, damage: 0, reload: 0, armor: 0 },
    settings: { sfx: true, reducedMotion: false },
    lastPlayedAt: 0,
  });
}

describe('reducer phase transitions', () => {
  it('START_RUN enters playing and bumps runId', () => {
    const s = freshState();
    const s2 = reducer(s, { type: 'START_RUN' });
    expect(s2.phase).toBe('playing');
    expect(s2.runId).toBe(s.runId + 1);
    expect(s2.arenaRunCredits).toBe(0);
  });
  it('PAUSE/RESUME toggles state only from playing', () => {
    let s = reducer(freshState(), { type: 'START_RUN' });
    s = reducer(s, { type: 'PAUSE' });
    expect(s.phase).toBe('paused');
    s = reducer(s, { type: 'RESUME' });
    expect(s.phase).toBe('playing');
    // PAUSE from menu is a no-op.
    expect(reducer(freshState(), { type: 'PAUSE' }).phase).toBe('menu');
  });
  it('QUIT_TO_MENU commits run credits', () => {
    let s = reducer(freshState(5), { type: 'START_RUN' });
    s = {
      ...s,
      arenaRunCredits: 20,
    };
    const s2 = reducer(s, { type: 'QUIT_TO_MENU' });
    expect(s2.phase).toBe('menu');
    expect(s2.credits).toBe(25);
    expect(s2.arenaRunCredits).toBe(0);
  });
});

describe('reducer engine events', () => {
  it('TANK_DESTROYED grants credits for enemy kills', () => {
    const s = reducer(freshState(), { type: 'START_RUN' });
    const s2 = reducer(s, {
      type: 'ENGINE_EVENT',
      event: {
        type: 'TANK_DESTROYED',
        id: 1,
        kind: 'grunt',
        side: 'enemy',
      },
    });
    expect(s2.arenaRunCredits).toBe(CREDITS.kill.grunt);
  });
  it('WAVE_CLEARED awards bonus and sets banner', () => {
    const s = reducer(freshState(), { type: 'START_RUN' });
    const s2 = reducer(s, {
      type: 'ENGINE_EVENT',
      event: { type: 'WAVE_CLEARED', wave: 3 },
    });
    expect(s2.arenaRunCredits).toBe(
      CREDITS.waveClearBase + CREDITS.waveClearPerWave * 2,
    );
    expect(s2.waveBanner?.wave).toBe(4);
  });
  it('final ARENA_CLEARED triggers victory', () => {
    const s = reducer(freshState(), { type: 'START_RUN' });
    const s2 = reducer(s, {
      type: 'ENGINE_EVENT',
      event: { type: 'ARENA_CLEARED', arenaIndex: 2 },
    });
    expect(s2.phase).toBe('victory');
    expect(s2.arenaRunCredits).toBe(CREDITS.arenaClear + CREDITS.victory);
  });
  it('PLAYER_DIED transitions to defeat', () => {
    const s = reducer(freshState(), { type: 'START_RUN' });
    const s2 = reducer(s, {
      type: 'ENGINE_EVENT',
      event: { type: 'PLAYER_DIED' },
    });
    expect(s2.phase).toBe('defeat');
  });
});

describe('rewarded repair', () => {
  it('REWARDED_REPAIR_APPLIED transitions defeat → playing and marks revive used', () => {
    let s = reducer(freshState(), { type: 'START_RUN' });
    s = reducer(s, { type: 'ENGINE_EVENT', event: { type: 'PLAYER_DIED' } });
    expect(s.phase).toBe('defeat');
    const s2 = reducer(s, { type: 'REWARDED_REPAIR_APPLIED' });
    expect(s2.phase).toBe('playing');
    expect(s2.reviveUsed).toBe(true);
  });
  it('second REWARDED_REPAIR_APPLIED in a run is a no-op', () => {
    let s = reducer(freshState(), { type: 'START_RUN' });
    s = reducer(s, { type: 'ENGINE_EVENT', event: { type: 'PLAYER_DIED' } });
    s = reducer(s, { type: 'REWARDED_REPAIR_APPLIED' });
    s = reducer(s, { type: 'ENGINE_EVENT', event: { type: 'PLAYER_DIED' } });
    expect(s.phase).toBe('defeat');
    const s2 = reducer(s, { type: 'REWARDED_REPAIR_APPLIED' });
    expect(s2).toBe(s); // no-op → same reference
  });
  it('START_RUN resets reviveUsed', () => {
    let s = reducer(freshState(), { type: 'START_RUN' });
    s = reducer(s, { type: 'ENGINE_EVENT', event: { type: 'PLAYER_DIED' } });
    s = reducer(s, { type: 'REWARDED_REPAIR_APPLIED' });
    s = reducer(s, { type: 'ENGINE_EVENT', event: { type: 'PLAYER_DIED' } });
    s = reducer(s, { type: 'RETURN_TO_MENU' });
    const s2 = reducer(s, { type: 'START_RUN' });
    expect(s2.reviveUsed).toBe(false);
  });
});

describe('reducer meta shop', () => {
  it('BUY_META spends credits and increments level', () => {
    const base = freshState(500);
    const cost = META_META.hp.costAt(0);
    const s = reducer(base, { type: 'BUY_META', key: 'hp' });
    expect(s.meta.hp).toBe(1);
    expect(s.credits).toBe(500 - cost);
  });
  it('BUY_META is a no-op when insufficient credits', () => {
    const base = freshState(1);
    const s = reducer(base, { type: 'BUY_META', key: 'hp' });
    expect(s.meta.hp).toBe(0);
    expect(s.credits).toBe(1);
  });
  it('BUY_META caps at level 5', () => {
    const base: AppState = { ...freshState(10_000), meta: { hp: 5, damage: 0, reload: 0, armor: 0 } };
    const s = reducer(base, { type: 'BUY_META', key: 'hp' });
    expect(s.meta.hp).toBe(5);
    expect(s.credits).toBe(10_000);
  });
});
