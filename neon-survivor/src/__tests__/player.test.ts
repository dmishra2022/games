import { describe, expect, it } from 'vitest';
import { movePlayer } from '../engine/player';
import { applyInput } from '../engine/step';
import { createWorld, defaultMeta } from '../engine/world';

describe('player movement', () => {
  it('moves at base speed along cardinal axes', () => {
    const w = createWorld(defaultMeta());
    applyInput(w, 1, 0);
    movePlayer(w, 1); // 1 second
    expect(w.player.p.x).toBeCloseTo(w.player.speed, 4);
    expect(w.player.p.y).toBeCloseTo(0, 4);
  });

  it('normalizes diagonal input so diagonal is not faster', () => {
    const w = createWorld(defaultMeta());
    applyInput(w, 1, 1);
    movePlayer(w, 1);
    const dist = Math.hypot(w.player.p.x, w.player.p.y);
    expect(dist).toBeCloseTo(w.player.speed, 2);
  });

  it('does not move when dead', () => {
    const w = createWorld(defaultMeta());
    applyInput(w, 1, 0);
    w.player.alive = false;
    movePlayer(w, 0.5);
    expect(w.player.p.x).toBe(0);
  });

  it('regenerates HP when hpRegenPerSec > 0', () => {
    const w = createWorld(defaultMeta());
    w.player.hp = 50;
    w.player.hpRegenPerSec = 10;
    movePlayer(w, 1);
    expect(w.player.hp).toBeCloseTo(60, 4);
  });
});
