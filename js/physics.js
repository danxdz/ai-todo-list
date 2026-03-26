import * as CANNON from 'cannon-es';

/** Baseline — heavy, low bounce (not ping-pong) */
const CERAMIC_VALUES = {
  gravity: 32,
  restitutionFruit: 0.22,
  restitutionDefault: 0.022,
  frictionFruit: 0.68,
  frictionDefault: 0.64,
  linearDamping: 0.085,
  angularDamping: 0.36,
  sleepSpeedLimit: 0.22,
  sleepTimeLimit: 0.2,
  wallVelRetain: 0.004,
  /** Lower = calmer merges, less chain-reaction knockback */
  mergeVelScale: 0.048,
  mergeAngScale: 0.02,
  dropVy: 0.22,
  contactStiffness6: 192,
  contactRelaxation: 3.8,
  solverIterations: 48,
  frictionEqStiffness7: 6.8,
  frictionEqRelaxation: 1.95,
};

export const physicsTuning = { ...CERAMIC_VALUES };

export const PHYSICS_PRESETS = {
  ceramic: { ...CERAMIC_VALUES },
  /** Strong gravity, snappy contacts, less bounce — “dense” pile */
  heavy: {
    ...CERAMIC_VALUES,
    gravity: 44,
    restitutionFruit: 0.16,
    restitutionDefault: 0.016,
    frictionFruit: 0.74,
    frictionDefault: 0.76,
    linearDamping: 0.095,
    angularDamping: 0.38,
    sleepSpeedLimit: 0.16,
    sleepTimeLimit: 0.26,
    wallVelRetain: 0.002,
    mergeVelScale: 0.04,
    dropVy: 0.28,
    contactStiffness6: 218,
    contactRelaxation: 3.2,
    solverIterations: 54,
    frictionEqStiffness7: 7.4,
    frictionEqRelaxation: 1.72,
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
    angularDamping: 0.68,
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
