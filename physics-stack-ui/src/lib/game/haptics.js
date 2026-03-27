/** Mobile vibration (no-op on desktop / unsupported). */

function canVibrate() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Short pulse scaled by merge “intensity” (combo, etc.) */
export function vibrateMerge(intensity = 1) {
  if (!canVibrate()) return;
  const k = Math.min(2.4, Math.max(0.45, intensity));
  navigator.vibrate(Math.round(8 + k * 22));
}

/** Stronger pattern for jackpot */
export function vibrateJackpot(intensity = 1) {
  if (!canVibrate()) return;
  const k = Math.min(2.6, Math.max(0.7, intensity));
  const mid = Math.round(18 + k * 12);
  const end = Math.round(28 + k * 18);
  navigator.vibrate([22, 45, mid, 40, end]);
}

export function cancelVibration() {
  if (!canVibrate()) return;
  navigator.vibrate(0);
}
