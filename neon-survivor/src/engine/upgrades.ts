// In-run upgrade catalogue. Phase 1 defines the data model and the
// `applyUpgrade` function so the engine is wired. SPEC-002 introduces
// the UI card picker and random selection logic.

import type { World } from './types';

export type UpgradeId =
  | 'blaster-damage'
  | 'blaster-rate'
  | 'blaster-count'
  | 'blaster-pierce'
  | 'unlock-orbital'
  | 'orbital-damage'
  | 'player-speed'
  | 'player-pickup'
  | 'player-maxhp'
  | 'player-regen';

export type Upgrade = {
  id: UpgradeId;
  label: string;
  description: string;
  // Apply mutates the world player/weapons; returns next description
  // if the upgrade is repeatable so the next pick can preview it.
  apply: (world: World) => void;
  maxStacks: number;
  // Current stack count is derived from the world where applicable
  // (e.g. projectileCount) or tracked in the reducer (SPEC-002).
};

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  'blaster-damage': {
    id: 'blaster-damage',
    label: 'Overcharge',
    description: '+25% blaster damage.',
    maxStacks: 8,
    apply: (w) => {
      w.player.damageMultiplier *= 1.25;
    },
  },
  'blaster-rate': {
    id: 'blaster-rate',
    label: 'Rapid Fire',
    description: '+25% blaster fire rate.',
    maxStacks: 6,
    apply: (w) => {
      w.player.fireRateMultiplier *= 1.25;
    },
  },
  'blaster-count': {
    id: 'blaster-count',
    label: 'Fork',
    description: '+1 blaster projectile.',
    maxStacks: 4,
    apply: (w) => {
      w.player.projectileCount += 1;
    },
  },
  'blaster-pierce': {
    id: 'blaster-pierce',
    label: 'Pierce',
    description: '+1 bullet pierce.',
    maxStacks: 3,
    apply: (w) => {
      w.player.bulletPierce += 1;
    },
  },
  'unlock-orbital': {
    id: 'unlock-orbital',
    label: 'Orbital',
    description: 'Unlock the orbital weapon.',
    maxStacks: 1,
    apply: (w) => {
      if (!w.weapons.find((wp) => wp.kind === 'orbital')) {
        w.weapons.push({ kind: 'orbital', level: 1, cooldown: 0 });
      }
    },
  },
  'orbital-damage': {
    id: 'orbital-damage',
    label: 'Orbital +Dmg',
    description: '+25% orbital damage (requires orbital).',
    maxStacks: 5,
    apply: (w) => {
      const o = w.weapons.find((wp) => wp.kind === 'orbital');
      if (o) o.level += 1;
    },
  },
  'player-speed': {
    id: 'player-speed',
    label: 'Boots',
    description: '+15% movement speed.',
    maxStacks: 5,
    apply: (w) => {
      w.player.speed *= 1.15;
    },
  },
  'player-pickup': {
    id: 'player-pickup',
    label: 'Magnet',
    description: '+40% pickup radius.',
    maxStacks: 5,
    apply: (w) => {
      w.player.pickupRadius *= 1.4;
    },
  },
  'player-maxhp': {
    id: 'player-maxhp',
    label: 'Shield',
    description: '+20 max HP and heal 20.',
    maxStacks: 5,
    apply: (w) => {
      w.player.maxHp += 20;
      w.player.hp = Math.min(w.player.maxHp, w.player.hp + 20);
    },
  },
  'player-regen': {
    id: 'player-regen',
    label: 'Regen',
    description: '+0.5 HP/sec regeneration.',
    maxStacks: 5,
    apply: (w) => {
      w.player.hpRegenPerSec += 0.5;
    },
  },
};

export function listUpgradeIds(): UpgradeId[] {
  return Object.keys(UPGRADES) as UpgradeId[];
}

/**
 * Pick `n` distinct upgrade ids weighted by maxStacks and current
 * applied counts. The reducer owns `applied` to avoid introducing
 * mutable module state.
 */
export function pickUpgradeChoices(
  n: number,
  applied: Partial<Record<UpgradeId, number>>,
  rng: () => number = Math.random,
): UpgradeId[] {
  const pool = listUpgradeIds().filter((id) => {
    const used = applied[id] ?? 0;
    if (used >= UPGRADES[id].maxStacks) return false;
    // Hide orbital-damage until orbital is unlocked.
    if (id === 'orbital-damage' && (applied['unlock-orbital'] ?? 0) === 0)
      return false;
    return true;
  });
  const out: UpgradeId[] = [];
  const copy = [...pool];
  const count = Math.min(n, copy.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}

export function applyUpgrade(world: World, id: UpgradeId): void {
  const u = UPGRADES[id];
  if (!u) return;
  u.apply(world);
}
