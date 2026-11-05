// Meta-upgrade catalogue (persistent progression).
// SPEC-000 section 6.

import type { MetaState } from './types';

export type MetaKey = keyof MetaState;

export const META_MAX_LEVEL = 5;

export const META_META: Record<
  MetaKey,
  {
    label: string;
    description: string;
    costAt: (lvl: number) => number;
    effectAt: (lvl: number) => string;
  }
> = {
  hp: {
    label: 'Vitality',
    description: '+20 starting max HP.',
    costAt: (lvl) => 60 * (lvl + 1),
    effectAt: (lvl) => `+${lvl * 20} HP`,
  },
  damage: {
    label: 'Power Core',
    description: '+10% base damage.',
    costAt: (lvl) => 80 * (lvl + 1),
    effectAt: (lvl) => `+${lvl * 10}% dmg`,
  },
  speed: {
    label: 'Thrusters',
    description: '+5% move speed.',
    costAt: (lvl) => 70 * (lvl + 1),
    effectAt: (lvl) => `+${lvl * 5}% speed`,
  },
  xpGain: {
    label: 'Data Siphon',
    description: '+10% XP gain.',
    costAt: (lvl) => 90 * (lvl + 1),
    effectAt: (lvl) => `+${lvl * 10}% XP`,
  },
};

export const META_KEYS: MetaKey[] = ['hp', 'damage', 'speed', 'xpGain'];
