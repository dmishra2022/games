// Meta-upgrade catalogue. SPEC-000 section 6.

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
    label: 'Reinforced Hull',
    description: '+20 starting HP.',
    costAt: (lvl) => 80 * (lvl + 1),
    effectAt: (lvl) => `+${lvl * 20} HP`,
  },
  damage: {
    label: 'Heavy Ordnance',
    description: '+10% shell damage.',
    costAt: (lvl) => 100 * (lvl + 1),
    effectAt: (lvl) => `+${lvl * 10}% dmg`,
  },
  reload: {
    label: 'Autoloader',
    description: '+8% reload speed.',
    costAt: (lvl) => 90 * (lvl + 1),
    effectAt: (lvl) => `+${Math.round((1 - Math.pow(0.92, lvl)) * 100)}% rate`,
  },
  armor: {
    label: 'Composite Armor',
    description: '-8% incoming damage.',
    costAt: (lvl) => 110 * (lvl + 1),
    effectAt: (lvl) =>
      `${Math.round((1 - Math.pow(0.92, lvl)) * 100)}% less dmg taken`,
  },
};

export const META_KEYS: MetaKey[] = ['hp', 'damage', 'reload', 'armor'];
