/** Shared game constants — imported by physics, render, gameplay, SFX */
export const ROW_Z = 0;
export const GHOST_Z = ROW_Z + 0.42;
export const QUEUE_STRIP_SCALE = 0.52;
export const QUEUE_STRIP_LANE = 0.09;
export const QUEUE_TOP_BAND = 0.38;

/** @deprecated import from ./ball-mass.js */
export { FRUIT_DENSITY, fruitMassForRadius } from './ball-mass.js';

/** Merge only when circle distance ≤ (r1+r2) × mult — lower = must touch more (less “vacuum merge”). */
export const MERGE_DIST_MULT = 1.045;
/** Two max-tier fruits: slightly looser than normal (big radii + solver slack). */
export const JACKPOT_MERGE_DIST_MULT = 1.12;

export const FRUITS = [
  { radius: 0.485, color: 0xe53935 },
  { radius: 0.638, color: 0xfdd835 },
  { radius: 0.836, color: 0x00bcd4 },
  { radius: 1.089, color: 0xff9100 },
  { radius: 1.43, color: 0x8e24aa },
  { radius: 1.881, color: 0x43a047 },
  { radius: 2.464, color: 0xb8956b },
];

export const MERGE_POINTS = FRUITS.map((_, i) => (i + 1) * 15);
export const MERGEABLE_TYPE_MAX = FRUITS.length - 2;
export const MAX_RADIUS = FRUITS[FRUITS.length - 1].radius;

export const CUP_BASE = {
  halfX: 5,
  get halfZ() {
    return Math.max(0.52, MAX_RADIUS + 0.08);
  },
  wallT: 0.14,
};

export const DROP_TYPE_MAX = 3;
export const DROP_COOLDOWN_MS = 280;
export const GAME_OVER_DWELL_SEC = 0.95;

/** Level pacing — higher goals & steeper curve = slower unlocks, more pressure */
export const LEVEL_GOAL_START = 320;
export const LEVEL_GOAL_SCALE = 1.32;
export const LEVEL_GOAL_ADD = 62;
/** Lose line: this many units below cup rim (smaller = line higher = stricter). */
export const GAME_OVER_BELOW_RIM = 0.065;

export const COMBO_CHAIN_SEC = 1.9;
export const COMBO_MAX_MULT = 4;
export const COMBO_MULT_PER_TIER = 0.35;

export const DANGER_PULSE_BAND = 1.35;
export const DROP_VY_PER_LEVEL = 0.028;
export const DROP_VY_LEVEL_CAP = 0.38;
