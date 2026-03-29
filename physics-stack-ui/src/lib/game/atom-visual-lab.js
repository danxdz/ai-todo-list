import { ELEMENTS as ATOM_ELEMENTS, MOLECULE_RECIPES as BASE_MOLECULES } from './config-atoms.js';

export const ATOM_VISUAL_LAB_LS_KEY = 'physics-stack-atoms-visual-lab-v1';
export const ATOM_VISUAL_LAB_BROADCAST_CHANNEL = 'physics-stack-atoms-visual-lab';
export const ATOM_FX_PREVIEW_BROADCAST_CHANNEL = 'physics-stack-atoms-fx-preview';
const ATOM_GLOBAL_SCALE_MAX_PCT = 600;
const ATOM_RADIUS_MIN = 0.002;
const ATOM_RADIUS_MAX = 24;
export const ATOM_FX_DEFAULTS = {
  ambientDensity: 1,
  sparkDensity: 1,
  trailDensity: 1,
  dropletDensity: 1,
  bondLinkIntensity: 1,
  dropTrailDensity: 1,
};
export const ATOM_FX_PRIMITIVE_TYPES = [
  'burst',
  'sparks',
  'sparkStorm',
  'smoke',
  'shatter',
  'bond',
  'attractor',
  'orbit',
  'trails',
  'explosion',
  'waterSplash',
  'waterDroplets',
  'fire',
];
export const ATOM_FX_PRIMITIVE_STYLES = ['auto', 'electron', 'soft', 'clean', 'lite', 'full'];
export const ATOM_FX_PRIMITIVE_DEFAULTS = {
  burst_clean: {
    id: 'burst_clean',
    name: 'Burst Clean',
    type: 'burst',
    enabled: true,
    useContextColor: true,
    color: 0x8ed8ff,
    intensity: 1,
    size: 1,
    count: 1,
    speed: 1,
    duration: 1,
    opacity: 1,
    style: 'clean',
  },
  sparks_clean: {
    id: 'sparks_clean',
    name: 'Sparks Clean',
    type: 'sparks',
    enabled: true,
    useContextColor: true,
    color: 0xf6fbff,
    intensity: 1,
    size: 1,
    count: 1,
    speed: 1,
    duration: 1,
    opacity: 1,
    style: 'clean',
  },
  spark_storm_vivid: {
    id: 'spark_storm_vivid',
    name: 'Spark Storm Vivid',
    type: 'sparkStorm',
    enabled: true,
    useContextColor: true,
    color: 0xffd15a,
    intensity: 1,
    size: 1,
    count: 1,
    speed: 1,
    duration: 1,
    opacity: 1,
    radius: 1,
    spread: 1,
    style: 'full',
  },
  bond_arc_soft: {
    id: 'bond_arc_soft',
    name: 'Bond Arc Soft',
    type: 'bond',
    enabled: true,
    useContextColor: true,
    color: 0x9edcff,
    intensity: 1,
    size: 1,
    count: 1,
    speed: 1,
    duration: 1,
    opacity: 1,
    radius: 1,
    spread: 1,
    style: 'soft',
  },
  pair_attractor_soft: {
    id: 'pair_attractor_soft',
    name: 'Pair Attractor Soft',
    type: 'attractor',
    enabled: true,
    useContextColor: true,
    color: 0x9edcff,
    intensity: 1,
    size: 1,
    count: 1,
    speed: 1,
    duration: 1,
    opacity: 1,
    radius: 1,
    spread: 1,
    style: 'electron',
  },
  orbit_electron_merge: {
    id: 'orbit_electron_merge',
    name: 'Orbit Electron Merge',
    type: 'orbit',
    enabled: true,
    useContextColor: true,
    color: 0x9edcff,
    intensity: 1,
    size: 1,
    count: 1,
    speed: 1,
    duration: 1,
    opacity: 1,
    radius: 1,
    spread: 1,
    style: 'electron',
  },
  smoke_soft: {
    id: 'smoke_soft',
    name: 'Smoke Soft',
    type: 'smoke',
    enabled: true,
    useContextColor: true,
    color: 0xaee5ff,
    intensity: 1,
    size: 1,
    count: 1,
    speed: 1,
    duration: 1,
    opacity: 1,
    style: 'soft',
  },
  trails_lite: {
    id: 'trails_lite',
    name: 'Trails Lite',
    type: 'trails',
    enabled: true,
    useContextColor: true,
    color: 0x8ed8ff,
    intensity: 1,
    size: 1,
    count: 1,
    speed: 1,
    duration: 1,
    opacity: 1,
    radius: 1,
    spread: 1,
    style: 'lite',
  },
  explosion_clean: {
    id: 'explosion_clean',
    name: 'Explosion Clean',
    type: 'explosion',
    enabled: true,
    useContextColor: true,
    color: 0xcff5ff,
    intensity: 1,
    size: 1,
    count: 1,
    speed: 1,
    duration: 1,
    opacity: 1,
    style: 'clean',
  },
  water_screen_soft: {
    id: 'water_screen_soft',
    name: 'Water Screen Soft',
    type: 'waterDroplets',
    enabled: true,
    useContextColor: false,
    color: 0x8ed8ff,
    intensity: 1,
    size: 1,
    count: 1,
    speed: 1,
    duration: 1,
    opacity: 1,
    style: 'soft',
  },
};
export const ATOM_FX_PROFILE_SCOPES = ['merge', 'molecule', 'both'];
export const ATOM_FX_PROFILE_TRAILS = ['auto', 'none', 'lite', 'full'];
export const ATOM_FX_PROFILE_ELEMENTAL_MODES = ['auto', 'water', 'fire', 'smoke', 'explosion'];
export const ATOM_COLLISION_REACTIONS = ['none', 'pulse', 'bond', 'storm', 'ignite'];
export const ATOM_FX_PROFILE_DEFAULTS = {
  merge_default: {
    id: 'merge_default',
    name: 'Merge Default',
    scope: 'merge',
    enabled: true,
    burstScale: 1,
    sparkScale: 1.04,
    dropletScale: 1,
    bondScale: 1,
    smokeScale: 1,
    shatterScale: 1,
    trailScale: 0.26,
    explosionScale: 1,
    hitPauseScale: 1,
    vibrateScale: 1,
    trailStyle: 'lite',
    elementalMode: 'auto',
    stack: ['pair_attractor_soft', 'burst_clean', 'sparks_clean', 'orbit_electron_merge', 'trails_lite'],
  },
  merge_punch: {
    id: 'merge_punch',
    name: 'Merge Punch',
    scope: 'merge',
    enabled: true,
    burstScale: 1.24,
    sparkScale: 1.32,
    dropletScale: 1,
    bondScale: 1.18,
    smokeScale: 0.86,
    shatterScale: 1.08,
    trailScale: 0.2,
    explosionScale: 1.08,
    hitPauseScale: 1.12,
    vibrateScale: 1.14,
    trailStyle: 'lite',
    elementalMode: 'auto',
    stack: ['pair_attractor_soft', 'burst_clean', 'sparks_clean', 'orbit_electron_merge', 'trails_lite'],
  },
  collision_same_pop: {
    id: 'collision_same_pop',
    name: 'Collision Same Pop',
    scope: 'merge',
    enabled: true,
    burstScale: 0.46,
    sparkScale: 0.18,
    dropletScale: 1,
    bondScale: 0.92,
    smokeScale: 0.08,
    shatterScale: 0.08,
    trailScale: 0.08,
    explosionScale: 0.18,
    hitPauseScale: 0.3,
    vibrateScale: 0.18,
    trailStyle: 'lite',
    elementalMode: 'auto',
    stack: ['orbit_electron_merge'],
  },
  collision_other_flash: {
    id: 'collision_other_flash',
    name: 'Collision Other Flash',
    scope: 'merge',
    enabled: true,
    burstScale: 0.64,
    sparkScale: 0.92,
    dropletScale: 1,
    bondScale: 0.76,
    smokeScale: 0.12,
    shatterScale: 0.12,
    trailScale: 0.1,
    explosionScale: 0.22,
    hitPauseScale: 0.32,
    vibrateScale: 0.24,
    trailStyle: 'lite',
    elementalMode: 'auto',
    stack: ['burst_clean', 'sparks_clean'],
  },
  collision_special_storm: {
    id: 'collision_special_storm',
    name: 'Collision Special Storm',
    scope: 'merge',
    enabled: true,
    burstScale: 0.94,
    sparkScale: 1.28,
    dropletScale: 1,
    bondScale: 1.18,
    smokeScale: 0.22,
    shatterScale: 0.18,
    trailScale: 0.42,
    explosionScale: 0.56,
    hitPauseScale: 0.5,
    vibrateScale: 0.38,
    trailStyle: 'full',
    elementalMode: 'auto',
    stack: ['spark_storm_vivid', 'orbit_electron_merge', 'trails_lite'],
  },
  molecule_default: {
    id: 'molecule_default',
    name: 'Molecule Default',
    scope: 'molecule',
    enabled: true,
    burstScale: 1,
    sparkScale: 1,
    dropletScale: 1,
    bondScale: 1,
    smokeScale: 1,
    shatterScale: 1,
    trailScale: 1,
    explosionScale: 1,
    hitPauseScale: 1,
    vibrateScale: 1,
    trailStyle: 'auto',
    elementalMode: 'auto',
    stack: ['burst_clean', 'smoke_soft', 'trails_lite'],
  },
  molecule_premium: {
    id: 'molecule_premium',
    name: 'Molecule Premium',
    scope: 'molecule',
    enabled: true,
    burstScale: 1.28,
    sparkScale: 1.34,
    dropletScale: 1.24,
    bondScale: 1.28,
    smokeScale: 1.12,
    shatterScale: 1.2,
    trailScale: 1.38,
    explosionScale: 1.2,
    hitPauseScale: 1.18,
    vibrateScale: 1.16,
    trailStyle: 'lite',
    elementalMode: 'auto',
    stack: ['burst_clean', 'sparks_clean', 'smoke_soft', 'trails_lite', 'explosion_clean'],
  },
};
export const ATOM_VISUAL_LAYER_TYPES = ['core', 'nucleus', 'cloud', 'shell', 'halo'];

function defaultLayerTemplate() {
  return [
    {
      id: 'global_core',
      type: 'core',
      enabled: true,
      sizePct: 70,
      opacityPct: 100,
      glowPct: 12,
      spinPct: 0,
      thicknessPct: 0,
      count: 1,
    },
    {
      id: 'global_nucleus',
      type: 'nucleus',
      enabled: true,
      sizePct: 20,
      opacityPct: 96,
      glowPct: 42,
      spinPct: 0,
      thicknessPct: 0,
      count: 1,
    },
    {
      id: 'global_cloud',
      type: 'cloud',
      enabled: true,
      sizePct: 106,
      opacityPct: 11,
      glowPct: 22,
      spinPct: 26,
      thicknessPct: 0,
      count: 1,
    },
    {
      id: 'global_shell',
      type: 'shell',
      enabled: true,
      sizePct: 118,
      opacityPct: 24,
      glowPct: 22,
      spinPct: 54,
      thicknessPct: 18,
      count: 3,
      orbitRadiusPct: 108,
      spreadPct: 42,
      tiltPct: 68,
    },
    {
      id: 'global_halo',
      type: 'halo',
      enabled: true,
      sizePct: 132,
      opacityPct: 16,
      glowPct: 26,
      spinPct: 22,
      thicknessPct: 0,
      count: 1,
    },
  ];
}

export const ATOM_VISUAL_GLOBAL_DEFAULTS = {
  atomGlobalScalePct: 100,
  layerTemplate: defaultLayerTemplate(),
};

const ALLOWED_PHASES = new Set(['solid', 'liquid', 'gas']);
const MOLECULE_BY_ID = new Map(BASE_MOLECULES.map((recipe) => [recipe.id, recipe]));

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sanitizeColor(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) return Number.parseInt(trimmed.slice(1), 16);
    if (/^0x[0-9a-f]{6}$/i.test(trimmed)) return Number.parseInt(trimmed.slice(2), 16);
  }
  const n = toFiniteNumber(value);
  if (n == null) return null;
  return clamp(Math.floor(n), 0x000000, 0xffffff);
}

function sanitizeText(value, max = 120) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function sanitizeLayerType(type) {
  const text = sanitizeText(type, 20)?.toLowerCase();
  return text && ATOM_VISUAL_LAYER_TYPES.includes(text) ? text : null;
}

function sanitizeFxProfileScope(scope) {
  const value = sanitizeText(scope, 20)?.toLowerCase();
  return value && ATOM_FX_PROFILE_SCOPES.includes(value) ? value : 'both';
}

function sanitizeFxProfileTrailStyle(style) {
  const value = sanitizeText(style, 20)?.toLowerCase();
  return value && ATOM_FX_PROFILE_TRAILS.includes(value) ? value : 'auto';
}

function sanitizeFxProfileElementalMode(mode) {
  const value = sanitizeText(mode, 20)?.toLowerCase();
  return value && ATOM_FX_PROFILE_ELEMENTAL_MODES.includes(value) ? value : 'auto';
}

function sanitizeFxPrimitiveType(type) {
  const value = sanitizeText(type, 24)?.toLowerCase();
  return value && ATOM_FX_PRIMITIVE_TYPES.includes(value) ? value : 'burst';
}

function sanitizeFxPrimitiveStyle(style) {
  const value = sanitizeText(style, 20)?.toLowerCase();
  return value && ATOM_FX_PRIMITIVE_STYLES.includes(value) ? value : 'auto';
}

function sanitizeCollisionReaction(reaction) {
  const value = sanitizeText(reaction, 20)?.toLowerCase();
  return value && ATOM_COLLISION_REACTIONS.includes(value) ? value : 'none';
}

function sanitizeFxProfileId(id, fallback = null) {
  const value = sanitizeText(id, 40)?.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (value) return value;
  return fallback;
}

function sanitizeFxPrimitiveEntry(value, fallback = {}) {
  const src = value && typeof value === 'object' ? value : {};
  const out = {
    id: sanitizeFxProfileId(src.id, sanitizeFxProfileId(fallback.id, 'fx_primitive')),
    name: sanitizeText(src.name, 64) ?? sanitizeText(fallback.name, 64) ?? 'FX Primitive',
    type: sanitizeFxPrimitiveType(src.type ?? fallback.type ?? 'burst'),
    enabled: src.enabled !== false,
    useContextColor: src.useContextColor !== false,
    color: sanitizeColor(src.color ?? fallback.color ?? 0x8ed8ff) ?? 0x8ed8ff,
    intensity: clamp(Number(src.intensity ?? fallback.intensity ?? 1) || 0, 0, 3),
    size: clamp(Number(src.size ?? fallback.size ?? 1) || 0, 0, 3),
    count: clamp(Number(src.count ?? fallback.count ?? 1) || 0, 0, 6),
    speed: clamp(Number(src.speed ?? fallback.speed ?? 1) || 0, 0, 3),
    duration: clamp(Number(src.duration ?? fallback.duration ?? 1) || 0, 0, 3),
    opacity: clamp(Number(src.opacity ?? fallback.opacity ?? 1) || 0, 0, 1),
    radius: clamp(Number(src.radius ?? fallback.radius ?? 1) || 0, 0, 3),
    spread: clamp(Number(src.spread ?? fallback.spread ?? 1) || 0, 0, 3),
    style: sanitizeFxPrimitiveStyle(src.style ?? fallback.style ?? 'auto'),
  };
  return out;
}

function sanitizeFxPrimitivesMap(value) {
  const src = value && typeof value === 'object' ? value : {};
  const out = {};
  for (const [key, fallback] of Object.entries(ATOM_FX_PRIMITIVE_DEFAULTS)) {
    const clean = sanitizeFxPrimitiveEntry(src[key], fallback);
    out[key] = { ...clean, id: key };
  }
  for (const [idRaw, entry] of Object.entries(src)) {
    const id = sanitizeFxProfileId(idRaw);
    if (!id || out[id]) continue;
    const clean = sanitizeFxPrimitiveEntry(entry, { id, name: id });
    out[id] = { ...clean, id };
  }
  return out;
}

function sanitizeFxProfileEntry(value, fallback = {}) {
  const src = value && typeof value === 'object' ? value : {};
  const stackRaw = Array.isArray(src.stack ?? fallback.stack) ? src.stack ?? fallback.stack : [];
  const out = {
    id: sanitizeFxProfileId(src.id, sanitizeFxProfileId(fallback.id, 'fx_profile')),
    name: sanitizeText(src.name, 64) ?? sanitizeText(fallback.name, 64) ?? 'FX Profile',
    scope: sanitizeFxProfileScope(src.scope ?? fallback.scope ?? 'both'),
    enabled: src.enabled !== false,
    burstScale: clamp(Number(src.burstScale ?? fallback.burstScale ?? 1) || 0, 0, 3),
    sparkScale: clamp(Number(src.sparkScale ?? fallback.sparkScale ?? 1) || 0, 0, 3),
    dropletScale: clamp(Number(src.dropletScale ?? fallback.dropletScale ?? 1) || 0, 0, 3),
    bondScale: clamp(Number(src.bondScale ?? fallback.bondScale ?? 1) || 0, 0, 3),
    smokeScale: clamp(Number(src.smokeScale ?? fallback.smokeScale ?? 1) || 0, 0, 3),
    shatterScale: clamp(Number(src.shatterScale ?? fallback.shatterScale ?? 1) || 0, 0, 3),
    trailScale: clamp(Number(src.trailScale ?? fallback.trailScale ?? 1) || 0, 0, 3),
    explosionScale: clamp(Number(src.explosionScale ?? fallback.explosionScale ?? 1) || 0, 0, 3),
    hitPauseScale: clamp(Number(src.hitPauseScale ?? fallback.hitPauseScale ?? 1) || 0, 0, 3),
    vibrateScale: clamp(Number(src.vibrateScale ?? fallback.vibrateScale ?? 1) || 0, 0, 3),
    trailStyle: sanitizeFxProfileTrailStyle(src.trailStyle ?? fallback.trailStyle ?? 'auto'),
    elementalMode: sanitizeFxProfileElementalMode(
      src.elementalMode ?? fallback.elementalMode ?? 'auto',
    ),
    stack: stackRaw
      .map((id) => sanitizeFxProfileId(id))
      .filter(Boolean)
      .slice(0, 10),
  };
  return out;
}

function sanitizeFxProfilesMap(value) {
  const src = value && typeof value === 'object' ? value : {};
  const out = {};
  for (const [key, fallback] of Object.entries(ATOM_FX_PROFILE_DEFAULTS)) {
    const clean = sanitizeFxProfileEntry(src[key], fallback);
    out[key] = { ...clean, id: key };
  }
  for (const [idRaw, entry] of Object.entries(src)) {
    const id = sanitizeFxProfileId(idRaw);
    if (!id || out[id]) continue;
    const clean = sanitizeFxProfileEntry(entry, { id, name: id });
    out[id] = { ...clean, id };
  }
  return out;
}

function sanitizeLayerEntry(layer, fallbackId = '') {
  if (!layer || typeof layer !== 'object') return null;
  const type = sanitizeLayerType(layer.type);
  if (!type) return null;
  const color = sanitizeColor(layer.color);
  const out = {
    id: sanitizeText(String(layer.id ?? fallbackId), 48) ?? `${type}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    enabled: layer.enabled !== false,
    sizePct: clamp(Number(layer.sizePct ?? 100) || 0, 0, 100),
    opacityPct: clamp(Number(layer.opacityPct ?? 100) || 0, 0, 100),
    glowPct: clamp(Number(layer.glowPct ?? 0) || 0, 0, 100),
    spinPct: clamp(Number(layer.spinPct ?? 0) || 0, 0, 100),
    thicknessPct: clamp(Number(layer.thicknessPct ?? 0) || 0, 0, 100),
    count: Math.round(clamp(Number(layer.count ?? 1) || 1, 0, 8)),
    orbitRadiusPct: clamp(Number(layer.orbitRadiusPct ?? 100) || 0, 0, 180),
    spreadPct: clamp(Number(layer.spreadPct ?? 0) || 0, 0, 100),
    tiltPct: clamp(Number(layer.tiltPct ?? 50) || 0, 0, 100),
  };
  if (color != null) out.color = color;
  return out;
}

function sanitizeLayerStack(value, fallback = []) {
  const src = Array.isArray(value) ? value : [];
  const out = [];
  for (let i = 0; i < src.length; i += 1) {
    const clean = sanitizeLayerEntry(src[i], `layer_${i + 1}`);
    if (clean) out.push(clean);
  }
  if (out.length > 0) return out;
  return fallback.map((layer, index) => sanitizeLayerEntry(layer, `fallback_${index}`)).filter(Boolean);
}

function sanitizeAtomVisual(visual) {
  if (!visual || typeof visual !== 'object') return null;
  const out = {};
  const clampField = (key, min, max) => {
    const n = toFiniteNumber(visual[key]);
    if (n != null) out[key] = clamp(n, min, max);
  };
  const clampColorField = (key) => {
    const c = sanitizeColor(visual[key]);
    if (c != null) out[key] = c;
  };
  clampField('coreScale', 0, 1.2);
  clampField('nucleusScale', 0, 1);
  clampField('nucleusOpacity', 0, 1);
  clampField('nucleusEmissive', 0, 0.6);
  clampField('cloudScale', 0, 1.8);
  clampField('cloudOpacity', 0, 0.32);
  clampField('cloudGlow', 0, 0.34);
  clampField('cloudSpin', 0, 1.4);
  clampField('shellRadius', 0, 1.6);
  clampField('shellThickness', 0, 0.08);
  clampField('shellOpacity', 0, 0.4);
  clampField('shellSpin', 0, 1.4);
  clampField('roughness', 0, 1);
  clampField('metalness', 0, 1);
  clampField('transmission', 0, 1);
  clampField('clearcoat', 0, 1);
  clampField('clearcoatRoughness', 0, 1);
  clampField('ior', 1, 2.5);
  clampField('envMapIntensity', 0, 3);
  clampField('emissiveIntensity', 0, 1);
  clampField('electronCount', 0, 8);
  clampField('electronSpeed', 0, 1.8);
  clampColorField('nucleusColor');
  clampColorField('electronColor');
  clampColorField('protonColor');
  clampColorField('neutronColor');
  clampColorField('coreColor');
  clampColorField('shellColor');
  clampColorField('haloColor');
  const shellCount = toFiniteNumber(visual.shellCount);
  if (shellCount != null) out.shellCount = Math.round(clamp(shellCount, 0, 8));
  return Object.keys(out).length > 0 ? out : null;
}

function sanitizeMoleculePresentation(presentation) {
  if (!presentation || typeof presentation !== 'object') return null;
  const out = {};
  const clampField = (key, min, max) => {
    const n = toFiniteNumber(presentation[key]);
    if (n != null) out[key] = clamp(n, min, max);
  };
  clampField('atomScale', 0.24, 0.72);
  const maxAtoms = toFiniteNumber(presentation.maxAtoms);
  if (maxAtoms != null) out.maxAtoms = Math.round(clamp(maxAtoms, 2, 10));
  clampField('burstRadius', 0.18, 1.18);
  clampField('startScale', 0.45, 1.4);
  clampField('peakScale', 0.7, 2.2);
  clampField('duration', 0.45, 2.4);
  clampField('rise', 0.05, 0.72);
  clampField('floatWave', 0, 0.14);
  clampField('spinSpeed', 0, 4);
  clampField('fadeStart', 0.15, 0.9);
  clampField('smokeAt', 0.1, 0.95);
  const smokeCount = toFiniteNumber(presentation.smokeCount);
  if (smokeCount != null) out.smokeCount = Math.round(clamp(smokeCount, 2, 64));
  clampField('finalShatterAt', 0.2, 1);
  const finalShatter = toFiniteNumber(presentation.finalShatter);
  if (finalShatter != null) out.finalShatter = Math.round(clamp(finalShatter, 0, 80));
  const sparkCount = toFiniteNumber(presentation.sparkCount);
  if (sparkCount != null) out.sparkCount = Math.round(clamp(sparkCount, 3, 56));
  if (typeof presentation.showWorldEntity === 'boolean') out.showWorldEntity = presentation.showWorldEntity;
  clampField('formationZoomPeak', 1, 1.42);
  clampField('formationZoomInEnd', 0.18, 0.52);
  clampField('formationZoomHoldEnd', 0.35, 0.82);
  if (
    out.formationZoomInEnd != null &&
    out.formationZoomHoldEnd != null &&
    out.formationZoomHoldEnd <= out.formationZoomInEnd
  ) {
    out.formationZoomHoldEnd = Math.min(0.82, out.formationZoomInEnd + 0.12);
  }
  return Object.keys(out).length > 0 ? out : null;
}

function sanitizeAtomEntry(value) {
  if (!value || typeof value !== 'object') return null;
  const out = {};
  const radius = toFiniteNumber(value.radius);
  if (radius != null) out.radius = clamp(radius, 0, ATOM_RADIUS_MAX);
  const color = sanitizeColor(value.color);
  if (color != null) out.color = color;
  const name = sanitizeText(value.name, 42);
  if (name) out.name = name;
  const symbol = sanitizeText(value.symbol, 4);
  if (symbol) out.symbol = symbol;
  const fact = sanitizeText(value.fact, 220);
  if (fact) out.fact = fact;
  const phase = sanitizeText(value.phase, 12)?.toLowerCase();
  if (phase && ALLOWED_PHASES.has(phase)) out.phase = phase;
  const mergeFxId = sanitizeFxProfileId(value.mergeFxId);
  if (mergeFxId) out.mergeFxId = mergeFxId;
  const collisionFxSameId = sanitizeFxProfileId(value.collisionFxSameId);
  if (collisionFxSameId) out.collisionFxSameId = collisionFxSameId;
  const collisionFxOtherId = sanitizeFxProfileId(value.collisionFxOtherId);
  if (collisionFxOtherId) out.collisionFxOtherId = collisionFxOtherId;
  const visual = sanitizeAtomVisual(value.visual);
  if (visual) out.visual = visual;
  const layers = sanitizeLayerStack(value.layers);
  if (layers.length > 0) out.layers = layers;
  const rulesSrc = Array.isArray(value.collisionRules) ? value.collisionRules : [];
  const collisionRules = rulesSrc
    .map((rule, index) => {
      if (!rule || typeof rule !== 'object') return null;
      const targetAtomicNumber = Math.round(Number(rule.targetAtomicNumber) || 0);
      if (!Number.isFinite(targetAtomicNumber) || targetAtomicNumber <= 0) return null;
      return {
        id:
          sanitizeText(String(rule.id ?? `collision_rule_${index + 1}`), 48) ??
          `collision_rule_${index + 1}`,
        targetAtomicNumber,
        reaction: sanitizeCollisionReaction(rule.reaction),
        fxId: sanitizeFxProfileId(rule.fxId),
        intensity: clamp(Number(rule.intensity ?? 1) || 0, 0.2, 3),
      };
    })
    .filter(Boolean)
    .slice(0, 12);
  if (collisionRules.length > 0) out.collisionRules = collisionRules;
  return Object.keys(out).length > 0 ? out : null;
}

function sanitizeGlobalsConfig(value) {
  const src = value && typeof value === 'object' ? value : {};
  const atomGlobalScalePctRaw = toFiniteNumber(src.atomGlobalScalePct);
  const atomGlobalScalePct =
    atomGlobalScalePctRaw == null
      ? ATOM_VISUAL_GLOBAL_DEFAULTS.atomGlobalScalePct
      : clamp(atomGlobalScalePctRaw, 0, ATOM_GLOBAL_SCALE_MAX_PCT);
  const layerTemplate = sanitizeLayerStack(src.layerTemplate, ATOM_VISUAL_GLOBAL_DEFAULTS.layerTemplate);
  return {
    atomGlobalScalePct,
    layerTemplate,
  };
}

function sanitizeMoleculeEntry(value, recipeId = '') {
  if (!value || typeof value !== 'object') return null;
  const out = {};
  const baseRecipe = MOLECULE_BY_ID.get(recipeId);
  const name = sanitizeText(value.name, 64);
  if (name) out.name = name;
  const formula = sanitizeText(value.formula, 20);
  if (formula) out.formula = formula;
  const fact = sanitizeText(value.fact, 260);
  if (fact) out.fact = fact;

  const points = toFiniteNumber(value.points);
  if (points != null) out.points = Math.round(clamp(points, 40, 20000));
  const multiplier = toFiniteNumber(value.multiplier);
  if (multiplier != null) out.multiplier = clamp(multiplier, 1.2, 14);
  const fxIntensity = toFiniteNumber(value.fxIntensity);
  if (fxIntensity != null) out.fxIntensity = clamp(fxIntensity, 0.4, 2.8);
  const formationFxId = sanitizeFxProfileId(value.formationFxId);
  if (formationFxId) out.formationFxId = formationFxId;
  const presentation = sanitizeMoleculePresentation(value.presentation);
  if (presentation) out.presentation = presentation;

  if (baseRecipe && !out.formula) out.formula = baseRecipe.formula;
  return Object.keys(out).length > 0 ? out : null;
}

function sanitizeFxConfig(value) {
  const src = value && typeof value === 'object' ? value : {};
  const read = (key) => {
    const n = toFiniteNumber(src[key]);
    if (n == null) return ATOM_FX_DEFAULTS[key];
    return clamp(n, 0, 2.2);
  };
  return {
    ambientDensity: read('ambientDensity'),
    sparkDensity: read('sparkDensity'),
    trailDensity: read('trailDensity'),
    dropletDensity: read('dropletDensity'),
    bondLinkIntensity: read('bondLinkIntensity'),
    dropTrailDensity: read('dropTrailDensity'),
  };
}

function cloneLayer(layer) {
  return layer ? { ...layer } : null;
}

function buildEffectiveLayerStack(globalTemplate = [], atomLayers = []) {
  const globalStack = Array.isArray(globalTemplate) ? globalTemplate.map(cloneLayer).filter(Boolean) : [];
  const atomStack = Array.isArray(atomLayers) ? atomLayers.map(cloneLayer).filter(Boolean) : [];
  if (atomStack.length <= 0) return globalStack;
  if (globalStack.length <= 0) return atomStack;

  const merged = [...globalStack];
  for (const layer of atomStack) {
    const type = String(layer?.type ?? '').toLowerCase();
    const existingIndex = merged.findIndex((entry) => String(entry?.type ?? '').toLowerCase() === type);
    if (existingIndex >= 0) merged[existingIndex] = layer;
    else merged.push(layer);
  }
  return merged;
}

function layerByType(layers, type) {
  return layers.find((layer) => layer?.type === type) ?? null;
}

function layerToVisual(visual, layers) {
  const out = { ...(visual && typeof visual === 'object' ? visual : {}) };
  const core = layerByType(layers, 'core');
  if (core) {
    out.coreScale = core.enabled ? clamp(core.sizePct / 100, 0, 1.2) : 0;
    if (core.enabled && Number.isFinite(core.color)) out.coreColor = Number(core.color);
  }
  const nucleus = layerByType(layers, 'nucleus');
  if (nucleus) {
    out.nucleusScale = nucleus.enabled ? clamp(nucleus.sizePct / 100, 0, 1) : 0;
    out.nucleusOpacity = nucleus.enabled ? clamp(nucleus.opacityPct / 100, 0, 1) : 0;
    out.nucleusEmissive = nucleus.enabled ? clamp((nucleus.glowPct / 100) * 0.6, 0, 0.6) : 0;
    if (nucleus.enabled && Number.isFinite(nucleus.color)) out.nucleusColor = Number(nucleus.color);
  }
  const cloud = layerByType(layers, 'cloud');
  if (cloud) {
    out.cloudScale = cloud.enabled ? clamp(cloud.sizePct / 100, 0, 1.8) : 0;
    out.cloudOpacity = cloud.enabled ? clamp((cloud.opacityPct / 100) * 0.32, 0, 0.32) : 0;
    out.cloudGlow = cloud.enabled ? clamp((cloud.glowPct / 100) * 0.34, 0, 0.34) : 0;
    out.cloudSpin = cloud.enabled ? clamp((cloud.spinPct / 100) * 1.4, 0, 1.4) : 0;
    if (cloud.enabled && Number.isFinite(cloud.color)) out.electronColor = Number(cloud.color);
  }
  const shell = layerByType(layers, 'shell');
  if (shell) {
    const visualElectronCount = toFiniteNumber(out.electronCount);
    const visualElectronSpeed = toFiniteNumber(out.electronSpeed);
    out.shellCount = shell.enabled
      ? Math.round(clamp(visualElectronCount ?? shell.count ?? 1, 0, 8))
      : 0;
    out.shellRadius = shell.enabled ? clamp((shell.sizePct / 100) * 1.6, 0, 1.6) : 0;
    out.shellThickness = shell.enabled ? clamp((shell.thicknessPct / 100) * 0.08, 0, 0.08) : 0;
    out.shellOpacity = shell.enabled ? clamp((shell.opacityPct / 100) * 0.4, 0, 0.4) : 0;
    out.shellSpin = shell.enabled
      ? clamp(Math.max((shell.spinPct / 100) * 1.4, visualElectronSpeed ?? 0), 0, 1.4)
      : 0;
    if (shell.enabled && Number.isFinite(shell.color)) out.shellColor = Number(shell.color);
  }
  const halo = layerByType(layers, 'halo');
  if (halo && halo.enabled) {
    const haloBoost = clamp((halo.glowPct / 100) * 0.24, 0, 0.24);
    out.cloudGlow = clamp((out.cloudGlow ?? 0) + haloBoost, 0, 0.34);
    out.cloudScale = clamp((out.cloudScale ?? 1) * (1 + (halo.sizePct / 100) * 0.16), 0, 1.8);
    if (Number.isFinite(halo.color)) out.haloColor = Number(halo.color);
  }
  return out;
}

function averageColors(colors, fallback) {
  if (!Array.isArray(colors) || colors.length <= 0) return fallback;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const color of colors) {
    const c = Number(color) || fallback;
    r += (c >> 16) & 255;
    g += (c >> 8) & 255;
    b += c & 255;
  }
  const n = colors.length;
  const rr = Math.round(r / n);
  const gg = Math.round(g / n);
  const bb = Math.round(b / n);
  return (rr << 16) | (gg << 8) | bb;
}

export function sanitizeAtomVisualLabState(state) {
  const out = {
    atoms: {},
    molecules: {},
    fx: { ...ATOM_FX_DEFAULTS },
    fxPrimitives: sanitizeFxPrimitivesMap({}),
    fxProfiles: sanitizeFxProfilesMap({}),
    globals: sanitizeGlobalsConfig(ATOM_VISUAL_GLOBAL_DEFAULTS),
  };
  if (!state || typeof state !== 'object') return out;

  const atoms = state.atoms && typeof state.atoms === 'object' ? state.atoms : {};
  for (const [key, value] of Object.entries(atoms)) {
    const z = Number(key);
    if (!Number.isInteger(z) || z <= 0) continue;
    const clean = sanitizeAtomEntry(value);
    if (clean) out.atoms[z] = clean;
  }

  const molecules = state.molecules && typeof state.molecules === 'object' ? state.molecules : {};
  for (const [id, value] of Object.entries(molecules)) {
    if (!MOLECULE_BY_ID.has(id)) continue;
    const clean = sanitizeMoleculeEntry(value, id);
    if (clean) out.molecules[id] = clean;
  }

  out.fx = sanitizeFxConfig(state.fx);
  out.fxPrimitives = sanitizeFxPrimitivesMap(state.fxPrimitives);
  out.fxProfiles = sanitizeFxProfilesMap(state.fxProfiles);
  out.globals = sanitizeGlobalsConfig(state.globals);

  return out;
}

export function loadAtomVisualLabState() {
  try {
    const raw = localStorage.getItem(ATOM_VISUAL_LAB_LS_KEY);
    if (!raw) return sanitizeAtomVisualLabState({});
    return sanitizeAtomVisualLabState(JSON.parse(raw));
  } catch {
    return sanitizeAtomVisualLabState({});
  }
}

export function saveAtomVisualLabState(state) {
  const clean = sanitizeAtomVisualLabState(state);
  try {
    localStorage.setItem(ATOM_VISUAL_LAB_LS_KEY, JSON.stringify(clean));
  } catch {}
  return clean;
}

export function applyAtomVisualOverrides(elements, state = loadAtomVisualLabState()) {
  if (!Array.isArray(elements) || elements.length === 0) return [];
  const atoms = state?.atoms ?? {};
  const globalScalePct = clamp(
    Number(state?.globals?.atomGlobalScalePct ?? ATOM_VISUAL_GLOBAL_DEFAULTS.atomGlobalScalePct),
    0,
    ATOM_GLOBAL_SCALE_MAX_PCT,
  );
  const globalScale = globalScalePct / 100;
  const globalLayers = sanitizeLayerStack(
    state?.globals?.layerTemplate,
    ATOM_VISUAL_GLOBAL_DEFAULTS.layerTemplate,
  );
  const fxPrimitives = sanitizeFxPrimitivesMap(state?.fxPrimitives);
  const fxProfiles = sanitizeFxProfilesMap(state?.fxProfiles);
  const out = [];
  for (const spec of elements) {
    if (!spec || typeof spec !== 'object') continue;
    const atomicNumber = Number(spec.atomicNumber);
    const atomKey = Number.isFinite(atomicNumber) ? atomicNumber : null;
    const override = atomKey != null ? atoms?.[atomKey] : null;
    const safeOverride = override && typeof override === 'object' ? override : null;
    const sourceRadius = Number.isFinite(safeOverride?.radius) ? safeOverride.radius : spec.radius;
    const physicsRadius = clamp(Number(sourceRadius) || 0.4, ATOM_RADIUS_MIN, ATOM_RADIUS_MAX);
    const scaledRadius = clamp(physicsRadius * globalScale, ATOM_RADIUS_MIN, ATOM_RADIUS_MAX);
    const atomLayers = sanitizeLayerStack(safeOverride?.layers);
    const effectiveLayers = buildEffectiveLayerStack(globalLayers, atomLayers);
    const mergedVisual = {
      ...(spec.visual && typeof spec.visual === 'object' ? spec.visual : {}),
      ...((safeOverride?.visual && typeof safeOverride.visual === 'object' ? safeOverride.visual : {}) ?? {}),
    };
    const visual = layerToVisual(mergedVisual, effectiveLayers);
    out.push({
      ...spec,
      radius: scaledRadius,
      physicsRadius,
      ...(safeOverride?.name ? { name: safeOverride.name } : null),
      ...(safeOverride?.symbol ? { symbol: safeOverride.symbol } : null),
      ...(safeOverride?.fact ? { fact: safeOverride.fact } : null),
      ...(safeOverride?.phase ? { phase: safeOverride.phase } : null),
      ...(Number.isFinite(safeOverride?.color) ? { color: safeOverride.color } : null),
      ...(safeOverride?.mergeFxId ? { mergeFxId: safeOverride.mergeFxId } : null),
      ...(safeOverride?.collisionFxSameId ? { collisionFxSameId: safeOverride.collisionFxSameId } : null),
      ...(safeOverride?.collisionFxOtherId ? { collisionFxOtherId: safeOverride.collisionFxOtherId } : null),
      ...(Array.isArray(safeOverride?.collisionRules) && safeOverride.collisionRules.length > 0
        ? { collisionRules: safeOverride.collisionRules.map((rule) => ({ ...rule })) }
        : null),
      ...(safeOverride?.mergeFxId && fxProfiles[safeOverride.mergeFxId]
        ? {
            mergeFxProfile: {
              ...fxProfiles[safeOverride.mergeFxId],
              stackEntries: (fxProfiles[safeOverride.mergeFxId]?.stack ?? [])
                .map((id) => fxPrimitives[id])
                .filter(Boolean),
            },
          }
        : null),
      ...(safeOverride?.collisionFxSameId && fxProfiles[safeOverride.collisionFxSameId]
        ? {
            collisionFxSameProfile: {
              ...fxProfiles[safeOverride.collisionFxSameId],
              stackEntries: (fxProfiles[safeOverride.collisionFxSameId]?.stack ?? [])
                .map((id) => fxPrimitives[id])
                .filter(Boolean),
            },
          }
        : null),
      ...(safeOverride?.collisionFxOtherId && fxProfiles[safeOverride.collisionFxOtherId]
        ? {
            collisionFxOtherProfile: {
              ...fxProfiles[safeOverride.collisionFxOtherId],
              stackEntries: (fxProfiles[safeOverride.collisionFxOtherId]?.stack ?? [])
                .map((id) => fxPrimitives[id])
                .filter(Boolean),
            },
          }
        : null),
      visual,
      layers: effectiveLayers,
    });
  }
  return out;
}

function buildEffectiveAtomMap(state) {
  const effective = applyAtomVisualOverrides(ATOM_ELEMENTS, state);
  const byZ = new Map();
  for (const spec of effective) {
    if (!Number.isFinite(spec?.atomicNumber)) continue;
    byZ.set(spec.atomicNumber, spec);
  }
  return byZ;
}

function deriveMoleculeColor(recipe, atomByZ) {
  const fallback = Number(recipe?.color) || 0x88bbff;
  if (!Array.isArray(recipe?.inputs) || recipe.inputs.length <= 0) return fallback;
  const colors = [];
  for (const atomicNumber of recipe.inputs) {
    const spec = atomByZ.get(Number(atomicNumber));
    if (!spec) continue;
    colors.push(Number(spec.color) || fallback);
  }
  return averageColors(colors, fallback);
}

export function applyMoleculeVisualOverrides(recipes, state = loadAtomVisualLabState()) {
  if (!Array.isArray(recipes) || recipes.length === 0) return [];
  const molecules = state?.molecules ?? {};
  const atomByZ = buildEffectiveAtomMap(state);
  const fxPrimitives = sanitizeFxPrimitivesMap(state?.fxPrimitives);
  const fxProfiles = sanitizeFxProfilesMap(state?.fxProfiles);
  const clonePresentation = (presentation) =>
    presentation && typeof presentation === 'object' ? { ...presentation } : undefined;
  const out = [];
  for (const recipe of recipes) {
    if (!recipe || typeof recipe !== 'object') continue;
    const recipeId = typeof recipe.id === 'string' ? recipe.id : '';
    if (!recipeId) continue;
    const override = molecules?.[recipe.id];
    const mergedPresentation = {
      ...(clonePresentation(recipe.presentation) ?? {}),
      ...(override?.presentation && typeof override.presentation === 'object'
        ? override.presentation
        : {}),
    };
    out.push({
      ...recipe,
      inputs: [...(recipe.inputs ?? [])],
      color: deriveMoleculeColor(recipe, atomByZ),
      presentation: Object.keys(mergedPresentation).length > 0 ? mergedPresentation : undefined,
      ...(override?.name ? { name: override.name } : null),
      ...(override?.formula ? { formula: override.formula } : null),
      ...(override?.fact ? { fact: override.fact } : null),
      ...(Number.isFinite(override?.points) ? { points: override.points } : null),
      ...(Number.isFinite(override?.multiplier) ? { multiplier: override.multiplier } : null),
      ...(Number.isFinite(override?.fxIntensity) ? { fxIntensity: override.fxIntensity } : null),
      ...(override?.formationFxId ? { formationFxId: override.formationFxId } : null),
      ...(override?.formationFxId && fxProfiles[override.formationFxId]
        ? {
            formationFxProfile: {
              ...fxProfiles[override.formationFxId],
              stackEntries: (fxProfiles[override.formationFxId]?.stack ?? [])
                .map((id) => fxPrimitives[id])
                .filter(Boolean),
            },
          }
        : null),
    });
  }
  return out;
}

export function resolveFxConfig(state = loadAtomVisualLabState()) {
  return sanitizeFxConfig(state?.fx ?? {});
}

export function resolveFxProfileById(profileId, state = loadAtomVisualLabState()) {
  const id = sanitizeFxProfileId(profileId);
  if (!id) return null;
  const primitives = sanitizeFxPrimitivesMap(state?.fxPrimitives);
  const map = sanitizeFxProfilesMap(state?.fxProfiles);
  return map[id]
    ? {
        ...map[id],
        stackEntries: (map[id]?.stack ?? []).map((primitiveId) => primitives[primitiveId]).filter(Boolean),
      }
    : null;
}
