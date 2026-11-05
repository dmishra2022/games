import { describe, expect, it } from 'vitest';
import { applyUpgrade, pickUpgradeChoices, UPGRADES } from '../engine/upgrades';
import { createWorld, defaultMeta } from '../engine/world';

describe('applyUpgrade', () => {
  it('stacks damage multiplicatively', () => {
    const w = createWorld(defaultMeta());
    const before = w.player.damageMultiplier;
    applyUpgrade(w, 'blaster-damage');
    applyUpgrade(w, 'blaster-damage');
    expect(w.player.damageMultiplier).toBeCloseTo(before * 1.25 * 1.25, 4);
  });

  it('unlocks orbital weapon only once', () => {
    const w = createWorld(defaultMeta());
    applyUpgrade(w, 'unlock-orbital');
    applyUpgrade(w, 'unlock-orbital');
    const orbitals = w.weapons.filter((wp) => wp.kind === 'orbital').length;
    expect(orbitals).toBe(1);
  });

  it('heals when picking max HP upgrade', () => {
    const w = createWorld(defaultMeta());
    w.player.hp = 50;
    applyUpgrade(w, 'player-maxhp');
    expect(w.player.hp).toBe(70);
    expect(w.player.maxHp).toBe(100 + 20);
  });
});

describe('pickUpgradeChoices', () => {
  it('returns at most 3 distinct choices', () => {
    const picks = pickUpgradeChoices(3, {});
    expect(new Set(picks).size).toBe(picks.length);
    expect(picks.length).toBeLessThanOrEqual(3);
  });

  it('hides orbital-damage when orbital is locked', () => {
    for (let i = 0; i < 200; i++) {
      const picks = pickUpgradeChoices(3, {});
      expect(picks).not.toContain('orbital-damage');
    }
  });

  it('excludes upgrades past their maxStacks', () => {
    const applied = { 'blaster-damage': UPGRADES['blaster-damage'].maxStacks };
    for (let i = 0; i < 200; i++) {
      const picks = pickUpgradeChoices(3, applied);
      expect(picks).not.toContain('blaster-damage');
    }
  });
});
