const LS_DISC = 'atoms-discovered-v1';
const LS_DAILY = 'atoms-daily-new-v1';
const LS_MOLECULES = 'atoms-molecules-discovered-v1';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function loadDiscoveredAtomicNumbers() {
  try {
    const raw = localStorage.getItem(LS_DISC);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((n) => typeof n === 'number') : []);
  } catch {
    return new Set();
  }
}

export function saveDiscoveredAtomicNumbers(set) {
  localStorage.setItem(LS_DISC, JSON.stringify([...set].sort((a, b) => a - b)));
}

/**
 * First time this atomic number is seen in the player’s collection.
 * @returns {{ firstEver: boolean }}
 */
export function touchDiscoveredAtomicNumber(z) {
  const s = loadDiscoveredAtomicNumbers();
  if (s.has(z)) return { firstEver: false };
  s.add(z);
  saveDiscoveredAtomicNumbers(s);

  try {
    const key = todayKey();
    let daily = null;
    try {
      daily = JSON.parse(localStorage.getItem(LS_DAILY) || 'null');
    } catch {
      daily = null;
    }
    if (!daily || daily.date !== key) {
      daily = { date: key, newCount: 0 };
    }
    daily.newCount = (daily.newCount || 0) + 1;
    localStorage.setItem(LS_DAILY, JSON.stringify(daily));
  } catch {
    /* ignore quota */
  }

  return { firstEver: true };
}

export function discoveredCount() {
  return loadDiscoveredAtomicNumbers().size;
}

export function isDiscoveredAtomicNumber(z) {
  return loadDiscoveredAtomicNumbers().has(z);
}

/** How many brand-new elements were first unlocked today (calendar UTC date). */
export function newUnlocksTodayCount() {
  try {
    const key = todayKey();
    const daily = JSON.parse(localStorage.getItem(LS_DAILY) || 'null');
    if (!daily || daily.date !== key) return 0;
    return typeof daily.newCount === 'number' ? daily.newCount : 0;
  } catch {
    return 0;
  }
}

export function loadDiscoveredMoleculeIds() {
  try {
    const raw = localStorage.getItem(LS_MOLECULES);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveDiscoveredMoleculeIds(set) {
  localStorage.setItem(LS_MOLECULES, JSON.stringify([...set].sort()));
}

/**
 * First time this molecule id is discovered by the player.
 * @returns {{ firstEver: boolean }}
 */
export function touchDiscoveredMoleculeId(id) {
  if (!id) return { firstEver: false };
  const s = loadDiscoveredMoleculeIds();
  if (s.has(id)) return { firstEver: false };
  s.add(id);
  saveDiscoveredMoleculeIds(s);
  return { firstEver: true };
}

export function discoveredMoleculeCount() {
  return loadDiscoveredMoleculeIds().size;
}

export function isDiscoveredMoleculeId(id) {
  return loadDiscoveredMoleculeIds().has(id);
}
