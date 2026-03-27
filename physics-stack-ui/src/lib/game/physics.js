import * as CANNON from 'cannon-es';

/** Baseline — heavy, low bounce (not ping-pong) */
const CERAMIC_VALUES = {
  gravity: 44,
  restitutionFruit: 0.012,
  restitutionDefault: 0.0012,
  frictionFruit: 0.88,
  frictionDefault: 0.86,
  linearDamping: 0.24,
  /** Lower = visible roll on pile (sprites still billboard in atoms) */
  angularDamping: 0.32,
  sleepSpeedLimit: 0.13,
  sleepTimeLimit: 0.3,
  wallVelRetain: 0.00035,
  /** Lower = calmer merges, less chain-reaction knockback */
  mergeVelScale: 0.0062,
  mergeAngScale: 0.005,
  dropVy: 0.118,
  /** Stiffer contacts = less visual overlap / sinking into neighbors */
  contactStiffness6: 500,
  contactRelaxation: 1.94,
  solverIterations: 108,
  frictionEqStiffness7: 11.8,
  frictionEqRelaxation: 1.04,
};

export const physicsTuning = { ...CERAMIC_VALUES };

export const PHYSICS_PRESETS = {
  ceramic: { ...CERAMIC_VALUES },
  /** Strong gravity, snappy contacts, less bounce — “dense” pile */
  heavy: {
    ...CERAMIC_VALUES,
    gravity: 50,
    restitutionFruit: 0.05,
    restitutionDefault: 0.007,
    frictionFruit: 0.95,
    frictionDefault: 0.92,
    linearDamping: 0.2,
    angularDamping: 0.4,
    sleepSpeedLimit: 0.1,
    sleepTimeLimit: 0.34,
    wallVelRetain: 0.001,
    mergeVelScale: 0.015,
    dropVy: 0.18,
    contactStiffness6: 312,
    contactRelaxation: 2.1,
    solverIterations: 68,
    frictionEqStiffness7: 8.8,
    frictionEqRelaxation: 1.35,
  },
  realistic: {
    ...CERAMIC_VALUES,
    gravity: 46,
    restitutionFruit: 0.008,
    restitutionDefault: 0.0008,
    frictionFruit: 0.86,
    frictionDefault: 0.85,
    linearDamping: 0.27,
    angularDamping: 0.3,
    sleepSpeedLimit: 0.14,
    sleepTimeLimit: 0.24,
    wallVelRetain: 0.00024,
    mergeVelScale: 0.0048,
    mergeAngScale: 0.0038,
    dropVy: 0.108,
    contactStiffness6: 560,
    contactRelaxation: 1.9,
    solverIterations: 116,
    frictionEqStiffness7: 12.4,
    frictionEqRelaxation: 1.02,
  },
  /** Low gravity, high drag & friction — slow, mushy, “swimming” */
  underwater: {
    ...CERAMIC_VALUES,
    gravity: 10,
    restitutionFruit: 0.28,
    restitutionDefault: 0.012,
    frictionFruit: 0.82,
    frictionDefault: 0.9,
    linearDamping: 0.55,
    angularDamping: 0.5,
    sleepSpeedLimit: 0.42,
    sleepTimeLimit: 0.26,
    wallVelRetain: 0.002,
    mergeVelScale: 0.048,
    dropVy: 0.11,
    contactStiffness6: 95,
    contactRelaxation: 7.2,
    solverIterations: 36,
    frictionEqStiffness7: 4.6,
    frictionEqRelaxation: 3.2,
  },
};

export function applyPhysicsPreset(target, presetKey) {
  const src = PHYSICS_PRESETS[presetKey];
  if (!src) return;
  for (const k of Object.keys(CERAMIC_VALUES)) {
    target[k] = src[k];
  }
}

export function createPhysicsWorld() {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -physicsTuning.gravity, 0),
  });
  world.allowSleep = true;
  world.solver.iterations = physicsTuning.solverIterations;
  world.solver.tolerance = 0.0008;

  const physicsMaterial = new CANNON.Material('fruit');
  const fruitContact = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, {
    friction: physicsTuning.frictionFruit,
    restitution: physicsTuning.restitutionFruit,
  });
  world.addContactMaterial(fruitContact);

  function applyPhysicsTuning(fruits) {
    const t = physicsTuning;
    const stiff = t.contactStiffness6 * 1e6;
    world.gravity.set(0, -t.gravity, 0);
    world.solver.iterations = Math.round(t.solverIterations);
    world.defaultContactMaterial.friction = t.frictionDefault;
    world.defaultContactMaterial.restitution = t.restitutionDefault;
    world.defaultContactMaterial.contactEquationStiffness = stiff;
    world.defaultContactMaterial.contactEquationRelaxation = t.contactRelaxation;
    fruitContact.friction = t.frictionFruit;
    fruitContact.restitution = t.restitutionFruit;
    fruitContact.contactEquationStiffness = stiff;
    fruitContact.contactEquationRelaxation = t.contactRelaxation;
    const frStiff = t.frictionEqStiffness7 * 1e7;
    const frRelax = t.frictionEqRelaxation;
    fruitContact.frictionEquationStiffness = frStiff;
    fruitContact.frictionEquationRelaxation = frRelax;
    world.defaultContactMaterial.frictionEquationStiffness = frStiff;
    world.defaultContactMaterial.frictionEquationRelaxation = frRelax;
    for (const f of fruits) {
      f.body.linearDamping = t.linearDamping;
      f.body.angularDamping = t.angularDamping;
      f.body.sleepSpeedLimit = t.sleepSpeedLimit;
      f.body.sleepTimeLimit = t.sleepTimeLimit;
    }
  }

  return { world, physicsMaterial, fruitContact, applyPhysicsTuning };
}

/**
 * Small random spin so pile balls visibly roll (ortho + shared damping otherwise hides rotation).
 * @param {import('cannon-es').Body} body
 */
export function nudgeSpawnSpin(body) {
  if (!body?.angularVelocity) return;
  const s = 2.2;
  body.angularVelocity.set(
    (Math.random() - 0.5) * s,
    (Math.random() - 0.5) * s * 0.6,
    (Math.random() - 0.5) * s * 0.45,
  );
}
