import { discoveredCount, discoveredMoleculeCount } from './atoms-discovery.js';
import { CURATED_SKIN_IDS, RELEASE_FLAGS } from '../release-flags.js';

const LS_EQUIPPED = 'atoms-skin-equipped-v1';
const LS_AD_UNLOCKED = 'atoms-skin-ad-unlocked-v1';
const LS_PLAY_SECONDS = 'atoms-play-seconds-v1';

export const ATOM_SKINS = [
  {
    id: 'default',
    name: 'Default Lab',
    tier: 'basic',
    unlock: { type: 'free' },
    accent: 0x93d7ff,
    flavor: 'Clean educational baseline for atom visuals.',
  },
  {
    id: 'neon_glow',
    name: 'Neon Glow',
    tier: 'basic',
    unlock: { type: 'free' },
    accent: 0x6f8cff,
    flavor: 'Electric outlines with a soft pulse.',
  },
  {
    id: 'plasma_core',
    name: 'Plasma Core',
    tier: 'basic',
    unlock: { type: 'discover_elements', value: 8 },
    accent: 0xff9f67,
    flavor: 'Inner core glows like a tiny star.',
  },
  {
    id: 'crystal_lattice',
    name: 'Crystal Lattice',
    tier: 'basic',
    unlock: { type: 'discover_elements', value: 14 },
    accent: 0x9ce7ff,
    flavor: 'Translucent crystalline facets.',
  },
  {
    id: 'metallic_sheen',
    name: 'Metallic Sheen',
    tier: 'basic',
    unlock: { type: 'play_minutes', value: 20 },
    accent: 0xd8c9a4,
    flavor: 'Polished gold/silver/copper tones.',
  },
  {
    id: 'stellar_nucleosynthesis',
    name: 'Stellar Nucleosynthesis',
    tier: 'premium',
    unlock: { type: 'ad_optional' },
    accent: 0x7cc8ff,
    flavor: 'Deep-space glow with orbiting star sparks.',
  },
  {
    id: 'quantum_wave',
    name: 'Quantum Wave',
    tier: 'premium',
    unlock: { type: 'ad_optional' },
    accent: 0xb6a6ff,
    flavor: 'Soft probability-wave shells.',
  },
  {
    id: 'fire_plasma',
    name: 'Fire Plasma',
    tier: 'premium',
    unlock: { type: 'ad_optional' },
    accent: 0xff7c57,
    flavor: 'Hot orange-red flowing energy.',
  },
  {
    id: 'ice_lattice',
    name: 'Ice Lattice',
    tier: 'premium',
    unlock: { type: 'ad_optional' },
    accent: 0x88d5ff,
    flavor: 'Frozen light-blue crystalline frost.',
  },
  {
    id: 'bio_luminescent',
    name: 'Bio-Luminescent',
    tier: 'premium',
    unlock: { type: 'ad_optional' },
    accent: 0x72ffcb,
    flavor: 'Soft deep-sea style green glow.',
  },
  {
    id: 'golden_ratio',
    name: 'Golden Ratio',
    tier: 'premium',
    unlock: { type: 'ad_optional' },
    accent: 0xffd26e,
    flavor: 'Elegant golden finish with subtle spiral feel.',
  },
  {
    id: 'bohr_classic',
    name: 'Bohr Classic',
    tier: 'rare',
    unlock: { type: 'discover_elements', value: 24 },
    accent: 0x9dc9ff,
    flavor: 'Retro orbit-shell educational style.',
  },
  {
    id: 'electron_cloud',
    name: 'Electron Cloud',
    tier: 'rare',
    unlock: { type: 'discover_molecules', value: 4 },
    accent: 0xa6d2ff,
    flavor: 'Modern fuzzy quantum cloud rendering.',
  },
  {
    id: 'rainbow_fusion',
    name: 'Rainbow Fusion',
    tier: 'rare',
    unlock: { type: 'discover_molecules', value: 7 },
    accent: 0xff9cf0,
    flavor: 'Slow spectrum-shifting fusion palette.',
  },
  {
    id: 'dark_matter',
    name: 'Dark Matter',
    tier: 'rare',
    unlock: { type: 'play_minutes', value: 90 },
    accent: 0x5c52ff,
    flavor: 'Black-purple body with starlight specks.',
  },
];
const CURATED_SKIN_SET = new Set(CURATED_SKIN_IDS);

export function getEnabledAtomSkins() {
  if (RELEASE_FLAGS.enableSkinsLab) return ATOM_SKINS;
  return ATOM_SKINS.filter((skin) => CURATED_SKIN_SET.has(skin.id));
}

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function readAdUnlockedSet() {
  try {
    const raw = localStorage.getItem(LS_AD_UNLOCKED);
    const arr = safeParse(raw || '[]', []);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeAdUnlockedSet(set) {
  try {
    localStorage.setItem(LS_AD_UNLOCKED, JSON.stringify([...set].sort()));
  } catch {}
}

export function addAtomPlaySeconds(deltaSec) {
  if (!Number.isFinite(deltaSec) || deltaSec <= 0) return;
  try {
    const current = Number(localStorage.getItem(LS_PLAY_SECONDS) || '0');
    const next = Math.max(0, Math.floor(current + deltaSec));
    localStorage.setItem(LS_PLAY_SECONDS, String(next));
  } catch {}
}

export function getAtomSkinStats() {
  let playSeconds = 0;
  try {
    playSeconds = Number(localStorage.getItem(LS_PLAY_SECONDS) || '0');
  } catch {
    playSeconds = 0;
  }
  return {
    discoveredElements: discoveredCount(),
    discoveredMolecules: discoveredMoleculeCount(),
    playMinutes: Math.floor(Math.max(0, playSeconds) / 60),
  };
}

export function getEquippedAtomSkinId() {
  const enabled = getEnabledAtomSkins();
  try {
    const raw = localStorage.getItem(LS_EQUIPPED);
    if (!raw) return 'default';
    if (enabled.some((s) => s.id === raw)) return raw;
  } catch {}
  return enabled.find((s) => s.id === 'default')?.id ?? enabled[0]?.id ?? 'default';
}

export function setEquippedAtomSkinId(id) {
  if (!getEnabledAtomSkins().some((s) => s.id === id)) return getEquippedAtomSkinId();
  try {
    localStorage.setItem(LS_EQUIPPED, id);
  } catch {}
  return id;
}

export function getAtomSkinUnlockState(skin, stats = getAtomSkinStats()) {
  const unlock = skin.unlock ?? { type: 'free' };
  const adUnlocked = readAdUnlockedSet();
  if (unlock.type === 'free') return { unlocked: true, reason: 'free' };
  if (unlock.type === 'ad_optional') {
    return {
      unlocked: adUnlocked.has(skin.id),
      reason: adUnlocked.has(skin.id) ? 'ad_unlocked' : 'ad_optional',
      requiresAd: !adUnlocked.has(skin.id),
    };
  }
  if (unlock.type === 'discover_elements') {
    const need = Number(unlock.value || 0);
    return {
      unlocked: stats.discoveredElements >= need,
      reason: `discover_elements:${need}`,
      progress: `${stats.discoveredElements}/${need}`,
    };
  }
  if (unlock.type === 'discover_molecules') {
    const need = Number(unlock.value || 0);
    return {
      unlocked: stats.discoveredMolecules >= need,
      reason: `discover_molecules:${need}`,
      progress: `${stats.discoveredMolecules}/${need}`,
    };
  }
  if (unlock.type === 'play_minutes') {
    const need = Number(unlock.value || 0);
    return {
      unlocked: stats.playMinutes >= need,
      reason: `play_minutes:${need}`,
      progress: `${stats.playMinutes}/${need}`,
    };
  }
  return { unlocked: false, reason: 'unknown' };
}

/**
 * Rewarded-ad unlock hook.
 * Current implementation is intentionally local-only (player-initiated).
 * Integrate ad SDK by calling this only after ad completion callback succeeds.
 */
export function unlockAtomSkinByAd(id) {
  if (!RELEASE_FLAGS.enableSkinsLab) return false;
  if (!ATOM_SKINS.some((s) => s.id === id)) return false;
  const skin = ATOM_SKINS.find((s) => s.id === id);
  if (skin?.unlock?.type !== 'ad_optional') return false;
  const s = readAdUnlockedSet();
  s.add(id);
  writeAdUnlockedSet(s);
  return true;
}

export function getEquippedAtomSkinDef() {
  const enabled = getEnabledAtomSkins();
  const id = getEquippedAtomSkinId();
  return enabled.find((s) => s.id === id) ?? enabled[0] ?? ATOM_SKINS[0];
}
