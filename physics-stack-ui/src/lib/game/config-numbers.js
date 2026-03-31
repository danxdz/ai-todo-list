/**
 * Number Stack — two identical numbers merge into the next tier (1+1→2, 2+2→3, …).
 */

export const ROW_Z = 0;
export const GHOST_Z = ROW_Z + 0.42;
export const QUEUE_STRIP_SCALE = 0.52;
export const QUEUE_STRIP_LANE = 0.09;
export const QUEUE_TOP_BAND = 0.38;

export { FRUIT_DENSITY, fruitMassForRadius } from './ball-mass.js';

export const MERGE_DIST_MULT = 1.045;
export const JACKPOT_MERGE_DIST_MULT = 1.12;

/** Tier index i displays number i + 1 (twelve tiers: 1 … 12). */
export const FRUITS = [
  { radius: 0.52, color: 0xff6b6b, number: 1, fact: 'One!' },
  { radius: 0.7, color: 0xffa56b, number: 2, fact: 'Two!' },
  { radius: 0.9, color: 0xffe66b, number: 3, fact: 'Three!' },
  { radius: 1.15, color: 0x9fff6b, number: 4, fact: 'Four!' },
  { radius: 1.45, color: 0x6be6ff, number: 5, fact: 'Five!' },
  { radius: 1.8, color: 0x6b9fff, number: 6, fact: 'Six!' },
  { radius: 2.2, color: 0xb66bff, number: 7, fact: 'Seven!' },
  { radius: 2.6, color: 0xff6be6, number: 8, fact: 'Eight!' },
  { radius: 3.0, color: 0xff9ff3, number: 9, fact: 'Nine!' },
  { radius: 3.35, color: 0x54a0ff, number: 10, fact: 'Ten!' },
  { radius: 3.65, color: 0xff6b9f, number: 11, fact: 'Eleven!' },
  { radius: 3.9, color: 0xffd93d, number: 12, fact: 'Twelve!' },
];

export const MERGE_POINTS = FRUITS.map((_, i) => (i + 1) * 20);
/** Two of the same tier ≤ this index merge into tier+1; top tier pair triggers jackpot. */
export const MERGEABLE_TYPE_MAX = FRUITS.length - 2;
export const MAX_RADIUS = FRUITS[FRUITS.length - 1].radius;

export const CUP_BASE = {
  halfX: 5,
  get halfZ() {
    return Math.max(0.52, MAX_RADIUS + 0.08);
  },
  wallT: 0.14,
};

/** Max tier index in the drop pool when fully unlocked (0 = “1”, …). */
export const DROP_TYPE_MAX = 4;
/** Early levels only drop the smallest tiers (0..DROP_START_MAX_INDEX); each level adds one more tier. */
export const DROP_START_MAX_INDEX = 3;
export const DROP_COOLDOWN_MS = 280;
export const GAME_OVER_DWELL_SEC = 0.95;

/** Softer curve — fewer “impossible” jumps between levels */
export const LEVEL_GOAL_START = 240;
export const LEVEL_GOAL_SCALE = 1.22;
export const LEVEL_GOAL_ADD = 48;

export const COMBO_CHAIN_SEC = 1.9;
export const COMBO_MAX_MULT = 4;
export const COMBO_MULT_PER_TIER = 0.35;

export const DANGER_PULSE_BAND = 1.35;
export const DROP_VY_PER_LEVEL = 0.028;
export const DROP_VY_LEVEL_CAP = 0.38;

export const GAME_OVER_BELOW_RIM = 0.065;
