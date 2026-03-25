/**
 * Pure gameplay helpers — scoring, combo math (state lives in main for now).
 */

export function scoreWithMultiplier(basePoints, multiplier) {
  return Math.floor(basePoints * multiplier);
}

export function nextComboMultiplier(comboChain, maxMult, perTier) {
  return Math.min(maxMult, 1 + comboChain * perTier);
}
