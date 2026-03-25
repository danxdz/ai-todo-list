/**
 * Periodic stack — 18 tiers (H–Ar). Radii scale from the original 7-tier fruit curve
 * so early physics match marble mode; larger tiers grow gradually for a manageable cup.
 */
export const ROW_Z = 0;
export const GHOST_Z = ROW_Z + 0.42;
export const QUEUE_STRIP_SCALE = 0.52;
export const QUEUE_STRIP_LANE = 0.09;
export const QUEUE_TOP_BAND = 0.38;

export const FRUIT_DENSITY = 12600;

export function fruitMassForRadius(r) {
  const volume = (4 / 3) * Math.PI * r ** 3;
  return FRUIT_DENSITY * volume;
}

export const MERGE_DIST_MULT = 1.045;
export const JACKPOT_MERGE_DIST_MULT = 1.12;

export const FRUITS = [
  {
    radius: 0.485,
    color: 0x64b5f6,
    symbol: 'H',
    name: 'Hydrogen',
    atomicNumber: 1,
    fact: 'Most common element in the universe — stars are mostly hydrogen!',
  },
  {
    radius: 0.638,
    color: 0xffee58,
    symbol: 'He',
    name: 'Helium',
    atomicNumber: 2,
    fact: 'Makes balloons float and gives your voice a silly high pitch!',
  },
  {
    radius: 0.836,
    color: 0xef5350,
    symbol: 'Li',
    name: 'Lithium',
    atomicNumber: 3,
    fact: 'Powers phones, laptops, and electric cars.',
  },
  {
    radius: 1.089,
    color: 0xa1887f,
    symbol: 'Be',
    name: 'Beryllium',
    atomicNumber: 4,
    fact: 'Super light and strong — used in spacecraft and X-ray windows.',
  },
  {
    radius: 1.43,
    color: 0x81c784,
    symbol: 'B',
    name: 'Boron',
    atomicNumber: 5,
    fact: 'Makes borosilicate glass (Pyrex) that survives huge temperature changes.',
  },
  {
    radius: 1.881,
    color: 0x5d4037,
    symbol: 'C',
    name: 'Carbon',
    atomicNumber: 6,
    fact: 'The backbone of life — diamonds, graphite, and every living thing!',
  },
  {
    radius: 2.464,
    color: 0x7e57c2,
    symbol: 'N',
    name: 'Nitrogen',
    atomicNumber: 7,
    fact: '78% of the air you breathe — also used in fertilizers.',
  },
  {
    radius: 2.72,
    color: 0xff8a65,
    symbol: 'O',
    name: 'Oxygen',
    atomicNumber: 8,
    fact: 'You breathe it every second — without it, nothing could burn or live!',
  },
  {
    radius: 2.95,
    color: 0x4fc3f7,
    symbol: 'F',
    name: 'Fluorine',
    atomicNumber: 9,
    fact: 'Most reactive element — used in toothpaste to protect teeth.',
  },
  {
    radius: 3.18,
    color: 0x81d4fa,
    symbol: 'Ne',
    name: 'Neon',
    atomicNumber: 10,
    fact: 'Makes those bright glowing signs in cities!',
  },
  {
    radius: 3.42,
    color: 0xffb74d,
    symbol: 'Na',
    name: 'Sodium',
    atomicNumber: 11,
    fact: 'Explodes when dropped in water — part of table salt (NaCl).',
  },
  {
    radius: 3.65,
    color: 0xaed581,
    symbol: 'Mg',
    name: 'Magnesium',
    atomicNumber: 12,
    fact: 'Burns with a super bright white flame — used in fireworks.',
  },
  {
    radius: 3.88,
    color: 0xffd54f,
    symbol: 'Al',
    name: 'Aluminium',
    atomicNumber: 13,
    fact: 'Lightest metal used for airplanes, cans, and foil.',
  },
  {
    radius: 4.12,
    color: 0x90a4ae,
    symbol: 'Si',
    name: 'Silicon',
    atomicNumber: 14,
    fact: 'The main ingredient in computer chips and beach sand.',
  },
  {
    radius: 4.35,
    color: 0xffd54f,
    symbol: 'P',
    name: 'Phosphorus',
    atomicNumber: 15,
    fact: 'Glows in the dark — used in matches and fertilizers.',
  },
  {
    radius: 4.58,
    color: 0xffb300,
    symbol: 'S',
    name: 'Sulfur',
    atomicNumber: 16,
    fact: 'Smells like rotten eggs and is used to make gunpowder.',
  },
  {
    radius: 4.82,
    color: 0x4db6ac,
    symbol: 'Cl',
    name: 'Chlorine',
    atomicNumber: 17,
    fact: 'Kills germs in swimming pools and is part of table salt.',
  },
  {
    radius: 5.05,
    color: 0x81d4fa,
    symbol: 'Ar',
    name: 'Argon',
    atomicNumber: 18,
    fact: 'Used in light bulbs because it doesn’t react with anything.',
  },
];

export const MERGE_POINTS = FRUITS.map((e) => Math.round(e.atomicNumber * 14));
export const MERGEABLE_TYPE_MAX = FRUITS.length - 2;
export const MAX_RADIUS = FRUITS[FRUITS.length - 1].radius;

export const CUP_BASE = {
  halfX: 5,
  get halfZ() {
    return Math.max(0.52, MAX_RADIUS + 0.08);
  },
  wallT: 0.14,
};

/** Queue only draws from tiers 0..DROP_TYPE_MAX so early play stays forgiving. */
export const DROP_TYPE_MAX = 5;
export const DROP_COOLDOWN_MS = 420;
export const GAME_OVER_DWELL_SEC = 0.95;

export const LEVEL_GOAL_START = 320;
export const LEVEL_GOAL_SCALE = 1.32;
export const LEVEL_GOAL_ADD = 62;
export const GAME_OVER_BELOW_RIM = 0.065;

export const COMBO_CHAIN_SEC = 1.9;
export const COMBO_MAX_MULT = 4;
export const COMBO_MULT_PER_TIER = 0.35;

export const DANGER_PULSE_BAND = 1.35;
export const DROP_VY_PER_LEVEL = 0.028;
export const DROP_VY_LEVEL_CAP = 0.38;
