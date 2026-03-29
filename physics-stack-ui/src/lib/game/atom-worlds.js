import { ELEMENTS as ATOM_ELEMENTS, MOLECULE_RECIPES as ALL_MOLECULE_RECIPES } from './config-atoms.js';
import { ATOM_PHYSICS_DEFAULT_PRESET } from './atom-physics-lab.js';
import {
  applyAtomVisualOverrides,
  applyMoleculeVisualOverrides,
  loadAtomVisualLabState,
} from './atom-visual-lab.js';

const ATOM_BY_NUMBER = new Map(ATOM_ELEMENTS.map((spec) => [spec.atomicNumber, spec]));
const RECIPE_BY_ID = new Map(ALL_MOLECULE_RECIPES.map((recipe) => [recipe.id, recipe]));

export const ATOM_WORLD_PROGRESS_LS_KEY = 'atom-world-progress-v1';

function withDefaults(recipe, extra = {}) {
  const base = RECIPE_BY_ID.get(recipe.id) ?? recipe;
  return {
    id: base.id,
    name: base.name,
    formula: base.formula,
    inputs: [...(base.inputs ?? [])],
    points: base.points ?? 420,
    multiplier: base.multiplier ?? 3.2,
    color: base.color ?? 0x88bbff,
    fxIntensity: base.fxIntensity ?? 1,
    presentation:
      base.presentation && typeof base.presentation === 'object' ? { ...base.presentation } : undefined,
    fact: base.fact ?? '',
    unlockLevel: base.unlockLevel ?? 1,
    ...extra,
  };
}

function localRecipe(recipe) {
  return withDefaults(recipe, { id: recipe.id });
}

export const WORLDS = {
  basics: {
    id: 'basics',
    label: 'Basics Lab',
    description: 'Starter chemistry with stable behavior.',
    elements: [1, 2, 3, 4, 5, 6, 7, 8],
    molecules: [
      localRecipe({
        id: 'hydrogen_gas',
        name: 'Hydrogen',
        formula: 'H2',
        inputs: [1, 1],
        points: 280,
        multiplier: 2.2,
        color: 0xe4f5ff,
        fact: 'Hydrogen gas is the lightest molecule in the universe.',
        unlockLevel: 3,
        spawnFusionPop: false,
      }),
      localRecipe({
        id: 'oxygen_gas',
        name: 'Oxygen',
        formula: 'O2',
        inputs: [8, 8],
        points: 340,
        multiplier: 2.4,
        color: 0xffa3a3,
        fact: 'Molecular oxygen is what we breathe.',
        unlockLevel: 3,
        spawnFusionPop: false,
      }),
      withDefaults({ id: 'water' }, { points: 520, multiplier: 3.5, unlockLevel: 5 }),
      withDefaults({ id: 'carbon_dioxide' }, { points: 560, multiplier: 3.7, unlockLevel: 5 }),
      withDefaults({ id: 'ammonia' }, { points: 620, multiplier: 3.8, unlockLevel: 6 }),
      withDefaults({ id: 'methane' }, { points: 680, multiplier: 4.0, unlockLevel: 7 }),
    ],
    physics: {
      preset: ATOM_PHYSICS_DEFAULT_PRESET,
      overrides: {
        gravity: 47,
        restitutionFruit: 0.034,
        frictionFruit: 0.75,
        linearDamping: 0.2,
        angularDamping: 0.46,
      },
    },
    energy: {
      mergePointScale: 1,
      levelGoalStart: 320,
      levelGoalScale: 1.17,
      levelGoalAdd: 52,
      dropStartMax: 2,
      dropUnlockEvery: 2,
      moleculeUnlockLevel: 4,
      moleculeUnlockDiscovered: 6,
      moleculeDetectDistMult: 1.2,
    },
    mechanics: ['guided_stability'],
    visualTheme: { accent: '#7de5ff', glow: '#80caff', fog: '#0f2f38' },
  },
  reactive: {
    id: 'reactive',
    label: 'Reactive Zone',
    description: 'Chain-friendly chemistry with hotter reactions.',
    unlock: { afterWorld: 'basics', reachLevel: 6 },
    elements: [1, 6, 7, 8, 9, 16, 17, 35, 53],
    molecules: [
      withDefaults({ id: 'hydrogen_fluoride' }, { points: 560, multiplier: 3.8, unlockLevel: 4 }),
      withDefaults({ id: 'hydrochloric_acid' }, { points: 610, multiplier: 4.1, unlockLevel: 5 }),
      withDefaults({ id: 'carbon_monoxide' }, { points: 640, multiplier: 4.2, unlockLevel: 5 }),
      withDefaults({ id: 'nitric_oxide' }, { points: 700, multiplier: 4.4, unlockLevel: 6 }),
      localRecipe({
        id: 'chlorine_gas',
        name: 'Chlorine',
        formula: 'Cl2',
        inputs: [17, 17],
        points: 760,
        multiplier: 4.4,
        color: 0x8cf26f,
        fact: 'Chlorine gas is highly reactive and should be handled carefully.',
        unlockLevel: 6,
        spawnFusionPop: false,
      }),
      withDefaults({ id: 'nitrogen_dioxide' }, { points: 820, multiplier: 4.6, unlockLevel: 7 }),
      withDefaults({ id: 'sulfur_dioxide' }, { points: 900, multiplier: 4.8, unlockLevel: 8 }),
      withDefaults({ id: 'sulfur_trioxide' }, { points: 980, multiplier: 5.0, unlockLevel: 9 }),
    ],
    physics: {
      preset: 'juicy',
      overrides: {
        gravity: 46,
        restitutionFruit: 0.048,
        restitutionDefault: 0.012,
        frictionFruit: 0.68,
        linearDamping: 0.17,
        angularDamping: 0.4,
      },
    },
    energy: {
      mergePointScale: 1.08,
      levelGoalStart: 360,
      levelGoalScale: 1.21,
      levelGoalAdd: 58,
      dropStartMax: 3,
      dropUnlockEvery: 2,
      moleculeUnlockLevel: 3,
      moleculeUnlockDiscovered: 4,
      moleculeDetectDistMult: 1.25,
    },
    mechanics: ['reactive_chain'],
    visualTheme: { accent: '#ffb677', glow: '#ff6d57', fog: '#31241a' },
  },
  metals: {
    id: 'metals',
    label: 'Metal Forge',
    description: 'Dense heavy stacks with low bounce and compression.',
    unlock: { afterWorld: 'reactive', reachLevel: 7 },
    elements: [1, 3, 6, 8, 11, 12, 13, 14, 17, 20, 26, 29],
    molecules: [
      withDefaults({ id: 'sodium_chloride' }, { points: 860, multiplier: 4.5, unlockLevel: 4 }),
      withDefaults({ id: 'magnesium_oxide' }, { points: 940, multiplier: 4.8, unlockLevel: 5 }),
      withDefaults({ id: 'silicon_dioxide' }, { points: 1020, multiplier: 5, unlockLevel: 6 }),
      withDefaults({ id: 'silicon_carbide' }, { points: 1080, multiplier: 5.1, unlockLevel: 7 }),
      withDefaults({ id: 'calcium_carbonate' }, { points: 1180, multiplier: 5.3, unlockLevel: 8 }),
      withDefaults({ id: 'lithium_hydride' }, { points: 980, multiplier: 4.9, unlockLevel: 6 }),
      localRecipe({
        id: 'iron_oxide',
        name: 'Iron Oxide',
        formula: 'FeO',
        inputs: [26, 8],
        points: 980,
        multiplier: 4.7,
        color: 0xb07f66,
        fact: 'Iron oxide forms when iron reacts with oxygen.',
        unlockLevel: 6,
      }),
    ],
    physics: {
      preset: 'stable',
      overrides: {
        gravity: 52,
        restitutionFruit: 0.02,
        restitutionDefault: 0.004,
        frictionFruit: 0.82,
        linearDamping: 0.25,
        angularDamping: 0.54,
      },
    },
    energy: {
      mergePointScale: 1.16,
      levelGoalStart: 410,
      levelGoalScale: 1.23,
      levelGoalAdd: 66,
      dropStartMax: 2,
      dropUnlockEvery: 3,
      moleculeUnlockLevel: 4,
      moleculeUnlockDiscovered: 5,
      moleculeDetectDistMult: 1.18,
    },
    mechanics: ['dense_stack'],
    visualTheme: { accent: '#c8d2df', glow: '#8ca3c8', fog: '#1f2c37' },
  },
};

export const ATOM_WORLD_ORDER = Object.keys(WORLDS);
export const ATOM_WORLD_DEFAULT = ATOM_WORLD_ORDER[0];

function cloneElementByAtomicNumber(atomicNumber) {
  const spec = ATOM_BY_NUMBER.get(atomicNumber);
  if (!spec) return null;
  return { ...spec };
}

function resolveElements(world) {
  const out = [];
  for (const atomicNumber of world?.elements ?? []) {
    const spec = cloneElementByAtomicNumber(atomicNumber);
    if (spec) out.push(spec);
  }
  return out;
}

function resolveMolecules(world) {
  const out = [];
  for (const recipe of world?.molecules ?? []) {
    if (!recipe?.id || !Array.isArray(recipe.inputs)) continue;
    out.push({
      ...recipe,
      inputs: [...recipe.inputs],
    });
  }
  return out;
}

function buildMergePoints(elements, pointScale = 1) {
  return elements.map((spec, idx) => {
    const base = spec.atomicNumber * 12 + spec.atomicMass * 0.45 + idx * 0.6;
    return Math.max(12, Math.round(base * pointScale));
  });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function getAtomWorld(worldId) {
  return WORLDS[worldId] ?? WORLDS[ATOM_WORLD_DEFAULT];
}

export function listAtomWorlds() {
  return ATOM_WORLD_ORDER.map((id) => getAtomWorld(id));
}

export function buildAtomWorldRuntimeConfig(baseConfig, worldId, visualStateOverride = null) {
  const world = getAtomWorld(worldId);
  const visualState =
    visualStateOverride && typeof visualStateOverride === 'object'
      ? visualStateOverride
      : loadAtomVisualLabState();
  const elements = applyAtomVisualOverrides(resolveElements(world), visualState);
  const molecules = applyMoleculeVisualOverrides(resolveMolecules(world), visualState);
  if (elements.length < 2) return baseConfig;

  const mergePointScale = world.energy?.mergePointScale ?? 1;
  const mergePoints = buildMergePoints(elements, mergePointScale);
  const maxRadius = elements[elements.length - 1]?.radius ?? baseConfig.MAX_RADIUS;
  const cupBase = {
    halfX: baseConfig.CUP_BASE?.halfX ?? 5,
    halfZ: Math.max(0.52, maxRadius + 0.08),
    wallT: baseConfig.CUP_BASE?.wallT ?? 0.14,
  };
  const dropTypeMax =
    world.energy?.dropTypeMax ??
    clamp(world.energy?.dropStartMax ?? 3, 0, Math.max(0, elements.length - 2));

  return {
    ...baseConfig,
    ELEMENTS: elements,
    FRUITS: elements,
    MERGE_POINTS: mergePoints,
    MERGEABLE_TYPE_MAX: Math.max(0, elements.length - 2),
    MAX_RADIUS: maxRadius,
    CUP_BASE: cupBase,
    DROP_TYPE_MAX: clamp(dropTypeMax, 0, Math.max(0, elements.length - 2)),
    MOLECULE_RECIPES: molecules,
    LEVEL_GOAL_START: world.energy?.levelGoalStart ?? baseConfig.LEVEL_GOAL_START,
    LEVEL_GOAL_SCALE: world.energy?.levelGoalScale ?? baseConfig.LEVEL_GOAL_SCALE,
    LEVEL_GOAL_ADD: world.energy?.levelGoalAdd ?? baseConfig.LEVEL_GOAL_ADD,
    DROP_VY_PER_LEVEL: world.energy?.dropVyPerLevel ?? baseConfig.DROP_VY_PER_LEVEL,
    DROP_VY_LEVEL_CAP: world.energy?.dropVyLevelCap ?? baseConfig.DROP_VY_LEVEL_CAP,
    MOLECULE_UNLOCK_LEVEL: world.energy?.moleculeUnlockLevel ?? baseConfig.MOLECULE_UNLOCK_LEVEL,
    MOLECULE_UNLOCK_DISCOVERED:
      world.energy?.moleculeUnlockDiscovered ?? baseConfig.MOLECULE_UNLOCK_DISCOVERED,
    MOLECULE_DETECT_DIST_MULT:
      world.energy?.moleculeDetectDistMult ?? baseConfig.MOLECULE_DETECT_DIST_MULT,
  };
}

export function getAtomWorldPhysics(worldId) {
  const world = getAtomWorld(worldId);
  return world.physics ?? { preset: ATOM_PHYSICS_DEFAULT_PRESET, overrides: {} };
}

export function rollAtomWorldDropType(worldId, level, elementCount) {
  const world = getAtomWorld(worldId);
  const maxIndex = Math.max(0, elementCount - 2);
  if (maxIndex <= 0) return 0;
  const start = clamp(world.energy?.dropStartMax ?? 3, 0, maxIndex);
  const every = Math.max(1, Math.floor(world.energy?.dropUnlockEvery ?? 2));
  const unlocked = clamp(start + Math.floor(Math.max(0, level - 1) / every), 0, maxIndex);
  return Math.floor(Math.random() * (unlocked + 1));
}

function defaultProgress() {
  return {
    selectedWorldId: ATOM_WORLD_DEFAULT,
    unlockedWorldIds: [ATOM_WORLD_DEFAULT],
    bestLevelByWorld: {},
    bestScoreByWorld: {},
  };
}

function sanitizeProgress(raw) {
  const base = defaultProgress();
  if (!raw || typeof raw !== 'object') return base;

  const unlockedSet = new Set(
    Array.isArray(raw.unlockedWorldIds) ? raw.unlockedWorldIds.filter((id) => WORLDS[id]) : [],
  );
  unlockedSet.add(ATOM_WORLD_DEFAULT);
  const unlockedWorldIds = ATOM_WORLD_ORDER.filter((id) => unlockedSet.has(id));

  const bestLevelByWorld = {};
  for (const id of ATOM_WORLD_ORDER) {
    const val = raw.bestLevelByWorld?.[id];
    if (Number.isFinite(val) && val > 0) bestLevelByWorld[id] = Math.floor(val);
  }

  const bestScoreByWorld = {};
  for (const id of ATOM_WORLD_ORDER) {
    const val = raw.bestScoreByWorld?.[id];
    if (Number.isFinite(val) && val >= 0) bestScoreByWorld[id] = Math.floor(val);
  }

  const selectedWorldId = unlockedSet.has(raw.selectedWorldId)
    ? raw.selectedWorldId
    : unlockedWorldIds[0] ?? ATOM_WORLD_DEFAULT;

  return {
    selectedWorldId,
    unlockedWorldIds,
    bestLevelByWorld,
    bestScoreByWorld,
  };
}

function writeProgress(progress) {
  try {
    localStorage.setItem(ATOM_WORLD_PROGRESS_LS_KEY, JSON.stringify(progress));
  } catch {}
}

export function loadAtomWorldProgress() {
  try {
    const raw = localStorage.getItem(ATOM_WORLD_PROGRESS_LS_KEY);
    if (!raw) return defaultProgress();
    return sanitizeProgress(JSON.parse(raw));
  } catch {
    return defaultProgress();
  }
}

export function isAtomWorldUnlocked(worldId, progress = loadAtomWorldProgress()) {
  return progress.unlockedWorldIds.includes(worldId);
}

export function resolvePlayableAtomWorldId(worldId, progress = loadAtomWorldProgress()) {
  if (worldId && isAtomWorldUnlocked(worldId, progress)) return worldId;
  if (isAtomWorldUnlocked(progress.selectedWorldId, progress)) return progress.selectedWorldId;
  return progress.unlockedWorldIds[0] ?? ATOM_WORLD_DEFAULT;
}

export function selectAtomWorld(worldId) {
  const progress = loadAtomWorldProgress();
  if (!isAtomWorldUnlocked(worldId, progress)) return progress;
  const next = { ...progress, selectedWorldId: worldId };
  writeProgress(next);
  return next;
}

function tryUnlockWorlds(progress) {
  const unlockedNow = [];
  const unlocked = new Set(progress.unlockedWorldIds);
  for (const id of ATOM_WORLD_ORDER) {
    if (unlocked.has(id)) continue;
    const world = WORLDS[id];
    const req = world.unlock;
    if (!req?.afterWorld) continue;
    const reqLevel = Math.max(1, req.reachLevel ?? 1);
    const reached = progress.bestLevelByWorld?.[req.afterWorld] ?? 0;
    if (reached >= reqLevel) {
      unlocked.add(id);
      unlockedNow.push(id);
    }
  }
  if (unlockedNow.length > 0) {
    progress.unlockedWorldIds = ATOM_WORLD_ORDER.filter((id) => unlocked.has(id));
  }
  return unlockedNow;
}

export function recordAtomWorldRun(worldId, { level = 1, score = 0 } = {}) {
  const progress = loadAtomWorldProgress();
  const id = WORLDS[worldId] ? worldId : ATOM_WORLD_DEFAULT;
  const nextLevel = Math.max(1, Math.floor(level));
  const nextScore = Math.max(0, Math.floor(score));
  progress.bestLevelByWorld[id] = Math.max(progress.bestLevelByWorld[id] ?? 0, nextLevel);
  progress.bestScoreByWorld[id] = Math.max(progress.bestScoreByWorld[id] ?? 0, nextScore);
  const unlockedNow = tryUnlockWorlds(progress);
  if (!isAtomWorldUnlocked(progress.selectedWorldId, progress)) {
    progress.selectedWorldId = progress.unlockedWorldIds[0] ?? ATOM_WORLD_DEFAULT;
  }
  writeProgress(progress);
  return { progress, unlockedNow };
}

export function getAtomWorldCards(progress = loadAtomWorldProgress()) {
  return ATOM_WORLD_ORDER.map((id) => {
    const world = getAtomWorld(id);
    const unlocked = isAtomWorldUnlocked(id, progress);
    const req = world.unlock;
    const reqLevel = req?.reachLevel ?? 1;
    const reqWorld = req?.afterWorld ? getAtomWorld(req.afterWorld) : null;
    return {
      id,
      label: world.label,
      description: world.description,
      mechanic: world.mechanics?.[0] ?? 'standard',
      unlocked,
      selected: progress.selectedWorldId === id,
      unlockHint:
        unlocked || !reqWorld ? '' : `Reach level ${reqLevel} in ${reqWorld.label} to unlock`,
    };
  });
}
