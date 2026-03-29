/**
 * Cannon body mass for merge balls — shared by fruit / numbers / atoms demos.
 * Heavier defaults reduce “launch out of the cup” from merges; atoms use real
 * relative atomic weights (H = 1.0) on top of sphere volume.
 */

/** Raised for heavy marble-like piles */
export const FRUIT_DENSITY = 38000;

/** Standard atomic weights (u), Z = 1 … 18 (H–Ar) — CRC-ish rounded */
const ATOMIC_WEIGHT_U = {
  1: 1.008,
  2: 4.0026,
  3: 6.94,
  4: 9.0122,
  5: 10.81,
  6: 12.011,
  7: 14.007,
  8: 15.999,
  9: 18.998,
  10: 20.18,
  11: 22.99,
  12: 24.305,
  13: 26.982,
  14: 28.085,
  15: 30.974,
  16: 32.06,
  17: 35.45,
  18: 39.948,
};

const H_MASS = ATOMIC_WEIGHT_U[1];
const ATOM_MASS_SOFT_EXP = 0.23;
const ATOM_MASS_MIN_RATIO = 0.92;
const ATOM_MASS_MAX_RATIO = 3.6;

/**
 * @param {number} radius
 * @param {number} [relativeMass=1] — 1 = same as old “uniform density” curve at previous density; atoms pass atomic weight / H
 */
export function massForBall(radius, relativeMass = 1) {
  const volume = (4 / 3) * Math.PI * radius ** 3;
  return FRUIT_DENSITY * volume * relativeMass;
}

/** Relative mass vs hydrogen (lightest) — use for atoms tier `atomicNumber` */
export function relativeMassFromAtomicNumber(atomicNumber) {
  const w = ATOMIC_WEIGHT_U[atomicNumber];
  if (w == null) return 1;
  return w / H_MASS;
}

/** @deprecated use massForBall — kept name for minimal churn in HTML */
export function fruitMassForRadius(r) {
  return massForBall(r, 1);
}

/**
 * @param {{ radius: number, atomicNumber?: number }} spec
 */
export function massForFruitSpec(spec) {
  if (typeof spec?.atomicMass === 'number' && Number.isFinite(spec.atomicMass) && spec.atomicMass > 0) {
    // Gameplay-safe atomic scaling:
    // - preserves real ordering from atomic masses
    // - keeps stack compression sane by heavily compressing the dynamic range
    //   (radius already scales with atomic mass in config-atoms.js)
    const rawRatio = spec.atomicMass / H_MASS;
    const softened = Math.max(
      ATOM_MASS_MIN_RATIO,
      Math.min(ATOM_MASS_MAX_RATIO, Math.pow(rawRatio, ATOM_MASS_SOFT_EXP)),
    );
    return massForBall(spec.radius, softened);
  }
  if (spec?.atomicNumber != null) {
    return massForBall(spec.radius, relativeMassFromAtomicNumber(spec.atomicNumber));
  }
  return massForBall(spec.radius, 1);
}
