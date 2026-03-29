export const ATOM_PHYSICS_DEFAULT_PRESET = 'balanced';
export const ATOM_PHYSICS_LS_KEY = 'physics-stack-atoms-physics-lab-v1';
export const ATOM_PHYSICS_BROADCAST_CHANNEL = 'physics-stack-atoms-physics-lab';

const CONFIG2_BASE = {
  gravity: 28,
  restitutionFruit: 0.016,
  restitutionDefault: 0.0024,
  frictionFruit: 0.23,
  frictionDefault: 0.575,
  linearDamping: 0.1,
  angularDamping: 0.42,
  sleepSpeedLimit: 0.2,
  sleepTimeLimit: 0.18,
  mergeVelScale: 0.0055,
  mergeAngScale: 0.0035,
  dropVy: 0.255,
  contactStiffness6: 958,
  contactRelaxation: 7.64,
  solverIterations: 24,
  frictionEqStiffness7: 20,
  frictionEqRelaxation: 4,
};

export const ATOM_PHYSICS_PRESETS = {
  stable: {
    gravity: 52,
    restitutionFruit: 0.016,
    restitutionDefault: 0.0024,
    frictionFruit: 0.8,
    frictionDefault: 0.82,
    linearDamping: 0.1,
    angularDamping: 0.42,
    sleepSpeedLimit: 0.2,
    sleepTimeLimit: 0.18,
    mergeVelScale: 0.0055,
    mergeAngScale: 0.0035,
    dropVy: 0.255,
    contactStiffness6: 720,
    contactRelaxation: 1.72,
    solverIterations: 128,
    frictionEqStiffness7: 14.0,
    frictionEqRelaxation: 0.96,
  },
  balanced: {
    gravity: 52,
    restitutionFruit: 0.022,
    restitutionDefault: 0.0032,
    frictionFruit: 0.74,
    frictionDefault: 0.8,
    linearDamping: 0.1,
    angularDamping: 0.42,
    sleepSpeedLimit: 0.2,
    sleepTimeLimit: 0.18,
    mergeVelScale: 0.0055,
    mergeAngScale: 0.0035,
    dropVy: 0.255,
    contactStiffness6: 780,
    contactRelaxation: 1.94,
    solverIterations: 112,
    frictionEqStiffness7: 14.6,
    frictionEqRelaxation: 1.02,
  },
  juicy: {
    gravity: 52,
    restitutionFruit: 0.028,
    restitutionDefault: 0.004,
    frictionFruit: 0.58,
    frictionDefault: 0.64,
    linearDamping: 0.15,
    angularDamping: 0.34,
    sleepSpeedLimit: 0.18,
    sleepTimeLimit: 0.2,
    mergeVelScale: 0.007,
    mergeAngScale: 0.005,
    dropVy: 0.24,
    contactStiffness6: 420,
    contactRelaxation: 2.2,
    solverIterations: 90,
    frictionEqStiffness7: 10.0,
    frictionEqRelaxation: 1.2,
  },
  config2_pop_01: {
    gravity: 33.5,
    restitutionFruit: 0.022,
    restitutionDefault: 0.0038,
    frictionFruit: 0.54,
    frictionDefault: 0.66,
    linearDamping: 0.118,
    angularDamping: 0.62,
    sleepSpeedLimit: 0.18,
    sleepTimeLimit: 0.19,
    mergeVelScale: 0.0061,
    mergeAngScale: 0.0037,
    dropVy: 0.272,
    contactStiffness6: 760,
    contactRelaxation: 3.5,
    solverIterations: 44,
    frictionEqStiffness7: 11.8,
    frictionEqRelaxation: 1.5,
  },
  config2_pop_02: {
    gravity: 34.2,
    restitutionFruit: 0.024,
    restitutionDefault: 0.0042,
    frictionFruit: 0.5,
    frictionDefault: 0.64,
    linearDamping: 0.116,
    angularDamping: 0.6,
    sleepSpeedLimit: 0.185,
    sleepTimeLimit: 0.19,
    mergeVelScale: 0.0064,
    mergeAngScale: 0.0038,
    dropVy: 0.278,
    contactStiffness6: 790,
    contactRelaxation: 3.7,
    solverIterations: 46,
    frictionEqStiffness7: 12.2,
    frictionEqRelaxation: 1.58,
  },
  config2_pop_03: {
    gravity: 35,
    restitutionFruit: 0.026,
    restitutionDefault: 0.0048,
    frictionFruit: 0.46,
    frictionDefault: 0.62,
    linearDamping: 0.114,
    angularDamping: 0.58,
    sleepSpeedLimit: 0.19,
    sleepTimeLimit: 0.195,
    mergeVelScale: 0.0067,
    mergeAngScale: 0.0039,
    dropVy: 0.284,
    contactStiffness6: 830,
    contactRelaxation: 3.9,
    solverIterations: 48,
    frictionEqStiffness7: 12.8,
    frictionEqRelaxation: 1.66,
  },
  config2_pop_04: {
    gravity: 35.8,
    restitutionFruit: 0.028,
    restitutionDefault: 0.0053,
    frictionFruit: 0.42,
    frictionDefault: 0.6,
    linearDamping: 0.112,
    angularDamping: 0.565,
    sleepSpeedLimit: 0.195,
    sleepTimeLimit: 0.2,
    mergeVelScale: 0.007,
    mergeAngScale: 0.0041,
    dropVy: 0.289,
    contactStiffness6: 870,
    contactRelaxation: 4.15,
    solverIterations: 50,
    frictionEqStiffness7: 13.4,
    frictionEqRelaxation: 1.76,
  },
  config2_pop_05: {
    gravity: 36.7,
    restitutionFruit: 0.03,
    restitutionDefault: 0.0058,
    frictionFruit: 0.39,
    frictionDefault: 0.585,
    linearDamping: 0.11,
    angularDamping: 0.55,
    sleepSpeedLimit: 0.2,
    sleepTimeLimit: 0.205,
    mergeVelScale: 0.0074,
    mergeAngScale: 0.0043,
    dropVy: 0.295,
    contactStiffness6: 910,
    contactRelaxation: 4.35,
    solverIterations: 52,
    frictionEqStiffness7: 14,
    frictionEqRelaxation: 1.88,
  },
  config2_pop_06: {
    gravity: 37.8,
    restitutionFruit: 0.0325,
    restitutionDefault: 0.0063,
    frictionFruit: 0.36,
    frictionDefault: 0.57,
    linearDamping: 0.108,
    angularDamping: 0.535,
    sleepSpeedLimit: 0.2,
    sleepTimeLimit: 0.21,
    mergeVelScale: 0.0078,
    mergeAngScale: 0.0045,
    dropVy: 0.3,
    contactStiffness6: 950,
    contactRelaxation: 4.6,
    solverIterations: 55,
    frictionEqStiffness7: 14.6,
    frictionEqRelaxation: 2.0,
  },
  config2_pop_07: {
    gravity: 38.9,
    restitutionFruit: 0.0345,
    restitutionDefault: 0.0069,
    frictionFruit: 0.33,
    frictionDefault: 0.555,
    linearDamping: 0.106,
    angularDamping: 0.52,
    sleepSpeedLimit: 0.205,
    sleepTimeLimit: 0.215,
    mergeVelScale: 0.0082,
    mergeAngScale: 0.0047,
    dropVy: 0.306,
    contactStiffness6: 990,
    contactRelaxation: 4.85,
    solverIterations: 58,
    frictionEqStiffness7: 15.2,
    frictionEqRelaxation: 2.12,
  },
  config2_pop_08: {
    gravity: 40.1,
    restitutionFruit: 0.0365,
    restitutionDefault: 0.0075,
    frictionFruit: 0.3,
    frictionDefault: 0.54,
    linearDamping: 0.104,
    angularDamping: 0.505,
    sleepSpeedLimit: 0.21,
    sleepTimeLimit: 0.22,
    mergeVelScale: 0.0086,
    mergeAngScale: 0.0049,
    dropVy: 0.311,
    contactStiffness6: 1030,
    contactRelaxation: 5.1,
    solverIterations: 61,
    frictionEqStiffness7: 15.8,
    frictionEqRelaxation: 2.24,
  },
  config2_pop_09: {
    gravity: 41.5,
    restitutionFruit: 0.039,
    restitutionDefault: 0.0081,
    frictionFruit: 0.28,
    frictionDefault: 0.525,
    linearDamping: 0.102,
    angularDamping: 0.49,
    sleepSpeedLimit: 0.215,
    sleepTimeLimit: 0.225,
    mergeVelScale: 0.009,
    mergeAngScale: 0.0051,
    dropVy: 0.314,
    contactStiffness6: 1070,
    contactRelaxation: 5.4,
    solverIterations: 65,
    frictionEqStiffness7: 16.4,
    frictionEqRelaxation: 2.36,
  },
  config2_pop_10: {
    gravity: 43,
    restitutionFruit: 0.0415,
    restitutionDefault: 0.0088,
    frictionFruit: 0.26,
    frictionDefault: 0.51,
    linearDamping: 0.1,
    angularDamping: 0.475,
    sleepSpeedLimit: 0.22,
    sleepTimeLimit: 0.23,
    mergeVelScale: 0.0094,
    mergeAngScale: 0.0053,
    dropVy: 0.318,
    contactStiffness6: 1120,
    contactRelaxation: 5.7,
    solverIterations: 70,
    frictionEqStiffness7: 17,
    frictionEqRelaxation: 2.5,
  },
};

export const ATOM_PHYSICS_FIELDS = [
  { key: 'gravity', label: 'Gravity', min: 10, max: 80, step: 0.1, help: 'Downward acceleration. Higher = faster drops and stronger compression at the bottom.' },
  { key: 'restitutionFruit', label: 'Ball Restitution', min: 0, max: 0.2, step: 0.001, help: 'How much balls bounce when colliding with each other.' },
  { key: 'restitutionDefault', label: 'World Restitution', min: 0, max: 0.05, step: 0.0005, help: 'How much balls bounce on walls and floor.' },
  { key: 'frictionFruit', label: 'Ball Friction', min: 0, max: 1.4, step: 0.005, help: 'Sliding resistance between balls. Higher = stickier pile.' },
  { key: 'frictionDefault', label: 'World Friction', min: 0, max: 1.4, step: 0.005, help: 'Sliding resistance against cup walls and floor.' },
  { key: 'linearDamping', label: 'Linear Damping', min: 0, max: 0.95, step: 0.005, help: 'Velocity drain over time. Higher = motion dies faster.' },
  { key: 'angularDamping', label: 'Angular Damping', min: 0, max: 0.98, step: 0.005, help: 'Spin drain over time. Higher = less endless spinning.' },
  { key: 'sleepSpeedLimit', label: 'Sleep Speed Limit', min: 0, max: 1, step: 0.005, help: 'Bodies below this speed can go to sleep.' },
  { key: 'sleepTimeLimit', label: 'Sleep Time Limit', min: 0.02, max: 2, step: 0.01, help: 'Time needed under speed limit before sleep.' },
  { key: 'mergeVelScale', label: 'Merge Velocity Scale', min: 0, max: 0.08, step: 0.0005, help: 'How much momentum merged balls keep. Lower = calmer merges.' },
  { key: 'mergeAngScale', label: 'Merge Angular Scale', min: 0, max: 0.05, step: 0.0005, help: 'How much spin merged balls keep.' },
  { key: 'dropVy', label: 'Drop Initial VY', min: 0, max: 0.5, step: 0.001, help: 'Initial downward speed when dropping a new ball.' },
  { key: 'contactStiffness6', label: 'Contact Stiffness x1e6', min: 40, max: 1800, step: 1, help: 'Contact hardness. Higher = less overlap, but can jitter if too high.' },
  { key: 'contactRelaxation', label: 'Contact Relaxation', min: 0.8, max: 12, step: 0.01, help: 'Solver softness for contacts. Higher = softer but less precise contacts.' },
  { key: 'solverIterations', label: 'Solver Iterations', min: 8, max: 220, step: 1, help: 'Physics solve accuracy per frame. Higher = more stable but heavier CPU.' },
  { key: 'frictionEqStiffness7', label: 'Friction Eq Stiffness x1e7', min: 0.4, max: 26, step: 0.01, help: 'How strongly friction constraints are enforced.' },
  { key: 'frictionEqRelaxation', label: 'Friction Eq Relaxation', min: 0.2, max: 8, step: 0.01, help: 'Softness of friction constraints. Too low can feel jittery.' },
];

const FIELD_KEYS = new Set(ATOM_PHYSICS_FIELDS.map((f) => f.key));

export function isAtomPresetName(name) {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(ATOM_PHYSICS_PRESETS, name);
}

export function cloneAtomPreset(name = ATOM_PHYSICS_DEFAULT_PRESET) {
  const preset = ATOM_PHYSICS_PRESETS[name] ?? ATOM_PHYSICS_PRESETS[ATOM_PHYSICS_DEFAULT_PRESET];
  return { ...preset };
}

export function formatPhysicsFieldValue(key, value) {
  if (key === 'solverIterations' || key === 'contactStiffness6') return String(Math.round(value));
  if (key === 'gravity') return Number(value).toFixed(1);
  if (key.includes('Scale')) return Number(value).toFixed(4);
  return Number(value).toFixed(3);
}

export function sanitizeAtomPhysicsValues(values) {
  const out = {};
  for (const field of ATOM_PHYSICS_FIELDS) {
    const raw = values?.[field.key];
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    const clamped = Math.max(field.min, Math.min(field.max, n));
    out[field.key] = field.key === 'solverIterations' ? Math.round(clamped) : clamped;
  }
  return out;
}

export function sanitizeAtomPhysicsLabPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const preset = isAtomPresetName(payload.preset) ? payload.preset : ATOM_PHYSICS_DEFAULT_PRESET;
  const enabled = payload.enabled !== false;
  const values = sanitizeAtomPhysicsValues(payload.values ?? {});
  const filtered = {};
  for (const [key, value] of Object.entries(values)) {
    if (!FIELD_KEYS.has(key)) continue;
    filtered[key] = value;
  }
  return { preset, enabled, values: filtered };
}
