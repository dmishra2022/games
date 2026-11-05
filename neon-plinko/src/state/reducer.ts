// SPEC-002 section 3. Pure reducer; no side effects.

export type UpgradeKey = 'multiDrop' | 'pegBonus' | 'bucketBias';
export type GamePhase = 'menu' | 'playing' | 'paused' | 'summary';

export type PersistedState = {
  saveVersion: 1;
  credits: number;
  highScore: number;
  upgrades: Record<UpgradeKey, number>;
  stats: { totalDrops: number };
  settings: { sfxMuted: boolean };
};

export type AppState = PersistedState & {
  phase: GamePhase;
  ballsRemaining: number;
  runScore: number;
  lastCombo: number;
  lastBucketMultiplier: number | null;
  showUpgrades: boolean;
  // Pending extra balls to spawn due to multiDrop upgrade. GameCanvas
  // reads this and queues spawns; reducer decrements as balls fly.
  queuedDrops: number;
};

export const STARTING_BALLS = 15;
export const REFILL_BALLS = 5;
export const REFILL_COST = 25;
export const MAX_UPGRADE_LEVEL = 5;

export const UPGRADE_META: Record<
  UpgradeKey,
  {
    label: string;
    description: string;
    costAt: (level: number) => number;
    effectAt: (level: number) => string;
  }
> = {
  pegBonus: {
    label: 'Peg Bonus',
    description: 'Each peg hit awards more points.',
    costAt: (lvl) => 40 * 2 ** lvl,
    effectAt: (lvl) => `+${lvl * 25}% peg points`,
  },
  multiDrop: {
    label: 'Multi-Drop',
    description: 'Queue extra balls per launch.',
    costAt: (lvl) => 50 * 2 ** lvl,
    effectAt: (lvl) => `+${lvl} queued balls`,
  },
  bucketBias: {
    label: 'Bucket Bias',
    description: 'Nudge the grid toward lucky edges.',
    costAt: (lvl) => 60 * 2 ** lvl,
    effectAt: (lvl) => `+${lvl * 4}% edge bias`,
  },
};

export function pegScoreMultiplier(pegBonusLevel: number): number {
  return 1 + 0.25 * pegBonusLevel;
}

export const defaultPersisted = (): PersistedState => ({
  saveVersion: 1,
  credits: 0,
  highScore: 0,
  upgrades: { multiDrop: 0, pegBonus: 0, bucketBias: 0 },
  stats: { totalDrops: 0 },
  settings: { sfxMuted: false },
});

export const initialState = (): AppState => ({
  ...defaultPersisted(),
  phase: 'menu',
  ballsRemaining: STARTING_BALLS,
  runScore: 0,
  lastCombo: 1,
  lastBucketMultiplier: null,
  showUpgrades: false,
  queuedDrops: 0,
});

export type Action =
  | { type: 'HYDRATE'; persisted: PersistedState }
  | { type: 'START_RUN' }
  | { type: 'RETURN_TO_MENU' }
  | { type: 'OPEN_PAUSE' }
  | { type: 'RESUME' }
  | { type: 'OPEN_UPGRADES' }
  | { type: 'CLOSE_UPGRADES' }
  | { type: 'PEG_HIT'; comboAfter: number; basePoints: number }
  | { type: 'BUCKET_LAND'; multiplier: number; runScore: number }
  | { type: 'DROP_SETTLED' }
  | { type: 'DROP_CONSUMED' }
  | { type: 'QUEUE_EXTRA_DROPS'; count: number }
  | { type: 'CONSUME_QUEUED_DROP' }
  | { type: 'BUY_UPGRADE'; key: UpgradeKey }
  | { type: 'TOGGLE_SFX' }
  | { type: 'REFILL_BALLS' }
  | { type: 'GRANT_FREE_BALLS'; amount: number }
  | { type: 'RESET_PROGRESS' };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.persisted };

    case 'START_RUN':
      return {
        ...state,
        phase: 'playing',
        runScore: 0,
        lastCombo: 1,
        lastBucketMultiplier: null,
        queuedDrops: 0,
        // Fresh run: refill to starting balls if currently empty.
        ballsRemaining:
          state.ballsRemaining <= 0 ? STARTING_BALLS : state.ballsRemaining,
      };

    case 'RETURN_TO_MENU':
      return { ...state, phase: 'menu', showUpgrades: false };

    case 'OPEN_PAUSE':
      return state.phase === 'playing' ? { ...state, phase: 'paused' } : state;

    case 'RESUME':
      return state.phase === 'paused' ? { ...state, phase: 'playing' } : state;

    case 'OPEN_UPGRADES':
      return { ...state, showUpgrades: true };

    case 'CLOSE_UPGRADES':
      return { ...state, showUpgrades: false };

    case 'PEG_HIT': {
      const scaled = Math.round(
        action.basePoints *
          action.comboAfter *
          pegScoreMultiplier(state.upgrades.pegBonus),
      );
      return {
        ...state,
        runScore: state.runScore + scaled,
        lastCombo: action.comboAfter,
      };
    }

    case 'BUCKET_LAND': {
      const credits =
        state.credits + Math.floor(action.runScore * action.multiplier);
      const highScore = Math.max(state.highScore, action.runScore);
      return {
        ...state,
        credits,
        highScore,
        lastBucketMultiplier: action.multiplier,
      };
    }

    case 'DROP_SETTLED': {
      // Reset per-drop score for the next ball; keep accumulated credits/high.
      // If no balls remain and no queued drops, go to summary.
      const noMore =
        state.ballsRemaining <= 0 && state.queuedDrops <= 0;
      return {
        ...state,
        runScore: 0,
        lastCombo: 1,
        phase: noMore ? 'summary' : state.phase,
      };
    }

    case 'DROP_CONSUMED':
      return {
        ...state,
        ballsRemaining: Math.max(0, state.ballsRemaining - 1),
        stats: { ...state.stats, totalDrops: state.stats.totalDrops + 1 },
      };

    case 'QUEUE_EXTRA_DROPS':
      return { ...state, queuedDrops: state.queuedDrops + action.count };

    case 'CONSUME_QUEUED_DROP':
      return {
        ...state,
        queuedDrops: Math.max(0, state.queuedDrops - 1),
      };

    case 'BUY_UPGRADE': {
      const level = state.upgrades[action.key];
      if (level >= MAX_UPGRADE_LEVEL) return state;
      const cost = UPGRADE_META[action.key].costAt(level);
      if (state.credits < cost) return state;
      return {
        ...state,
        credits: state.credits - cost,
        upgrades: { ...state.upgrades, [action.key]: level + 1 },
      };
    }

    case 'TOGGLE_SFX':
      return {
        ...state,
        settings: { ...state.settings, sfxMuted: !state.settings.sfxMuted },
      };

    case 'REFILL_BALLS': {
      if (state.credits < REFILL_COST) return state;
      return {
        ...state,
        credits: state.credits - REFILL_COST,
        ballsRemaining: state.ballsRemaining + REFILL_BALLS,
        phase: state.phase === 'summary' ? 'playing' : state.phase,
      };
    }

    case 'GRANT_FREE_BALLS': {
      if (action.amount <= 0) return state;
      return {
        ...state,
        ballsRemaining: state.ballsRemaining + action.amount,
        phase: state.phase === 'summary' ? 'playing' : state.phase,
      };
    }

    case 'RESET_PROGRESS':
      return initialState();

    default:
      return state;
  }
}

export function pickPersisted(state: AppState): PersistedState {
  return {
    saveVersion: state.saveVersion,
    credits: state.credits,
    highScore: state.highScore,
    upgrades: state.upgrades,
    stats: state.stats,
    settings: state.settings,
  };
}
