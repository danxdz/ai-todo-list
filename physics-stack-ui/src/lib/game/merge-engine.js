/**
 * Shared merge / jackpot mechanics for fruit, numbers, and atoms demos.
 */

import { scoreWithMultiplier } from './gameplay.js';
import { formatChemicalFormula } from './chem-format.js';

function radiusForType(ctx, type) {
  return ctx.getCollisionRadiusForType?.(type) ?? ctx.FRUITS[type].radius;
}

function radiusForEntry(ctx, entry) {
  return ctx.getCollisionRadiusForEntry?.(entry) ?? radiusForType(ctx, entry.type);
}

function atomicContactMultiplier(ctx) {
  const configured = Number(ctx.MERGE_DIST_MULT);
  const base = Number.isFinite(configured) ? configured : 1.04;
  if (ctx.mode === 'atoms') return Math.min(base, 1.016);
  return base;
}

function moleculeContactMultiplier(ctx, recipeSize, detectBoost = 1) {
  const detectMult = ctx.MOLECULE_DETECT_DIST_MULT ?? 1.22;
  const sizeBonus = Math.min(0.18, Math.max(0, recipeSize - 2) * 0.01);
  const pairMult = (1.03 + sizeBonus) * detectMult * detectBoost;
  if (ctx.mode === 'atoms') return Math.min(pairMult, 1.085);
  return pairMult;
}

/**
 * Calm chain reactions: slow nearby bodies right after a merge so the pile
 * does not launch balls past the danger line.
 * @param {object} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {object} mergedEntry
 * @param {number} radius
 * @param {number} factor 0–1
 */
function dampMergeNeighbors(ctx, cx, cy, mergedEntry, radius, factor) {
  const r2 = radius * radius;
  for (const f of ctx.getFruits()) {
    if (f === mergedEntry) continue;
    const dx = f.body.position.x - cx;
    const dy = f.body.position.y - cy;
    if (dx * dx + dy * dy > r2) continue;
    f.body.velocity.x *= factor;
    f.body.velocity.y *= factor;
    f.body.velocity.z = 0;
  }
}

/**
 * Iteratively pushes merge spawn away from nearby balls so the new body does not
 * start interpenetrating and visually overlap the pile.
 * @param {object} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} rNew
 * @param {{ anchorX?: number, maxLateralShift?: number, preferVertical?: boolean }} [options]
 * @returns {{ x: number, y: number }}
 */
function resolveMergeSpawnPose(ctx, x, y, rNew, options = {}) {
  const lim = ctx.innerHalfXForRadius(rNew);
  const anchorX = Number.isFinite(options.anchorX) ? options.anchorX : x;
  const maxLateralShift = Number.isFinite(options.maxLateralShift)
    ? Math.max(0.02, options.maxLateralShift)
    : Infinity;
  const lateralMin = Math.max(-lim, anchorX - maxLateralShift);
  const lateralMax = Math.min(lim, anchorX + maxLateralShift);
  const preferVertical = options.preferVertical === true;

  let px = Math.max(lateralMin, Math.min(lateralMax, x));
  let py = Math.max(rNew + 0.012, y);
  const extraGap = Math.min(0.034, rNew * 0.075);

  for (let iter = 0; iter < 7; iter += 1) {
    let changed = false;
    for (const f of ctx.getFruits()) {
      const rf = radiusForEntry(ctx, f);
      const minDist = rNew + rf + extraGap;
      const dx = px - f.body.position.x;
      const dy = py - f.body.position.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minDist * minDist) continue;

      const dist = Math.max(0.0001, Math.sqrt(d2));
      const overlap = minDist - dist;
      const nx = dist > 0.0002 ? dx / dist : 0;
      const ny = dist > 0.0002 ? dy / dist : 1;
      // Upward-biased solver for stable pile insertion.
      px += nx * overlap * (preferVertical ? 0.34 : 0.74);
      py += Math.max(0.24, ny) * overlap * 1.08 + 0.0012;
      px = Math.max(lateralMin, Math.min(lateralMax, px));
      py = Math.max(rNew + 0.012, py);
      changed = true;
    }
    if (!changed) break;
  }
  return { x: px, y: py };
}

/**
 * Final safety pass after spawn; nudges merged body out of any residual overlap.
 * @param {object} ctx
 * @param {object} merged
 * @param {number} rNew
 * @param {{ anchorX?: number, maxLateralShift?: number }} [options]
 */
function settleMergedBody(ctx, merged, rNew, options = {}) {
  const lim = ctx.innerHalfXForRadius(rNew);
  const anchorX = Number.isFinite(options.anchorX) ? options.anchorX : merged.body.position.x;
  const maxLateralShift = Number.isFinite(options.maxLateralShift)
    ? Math.max(0.02, options.maxLateralShift)
    : Infinity;
  const lateralMin = Math.max(-lim, anchorX - maxLateralShift);
  const lateralMax = Math.min(lim, anchorX + maxLateralShift);
  let px = merged.body.position.x;
  let py = merged.body.position.y;
  const eps = Math.min(0.03, rNew * 0.07);

  for (let iter = 0; iter < 6; iter += 1) {
    let changed = false;
    for (const f of ctx.getFruits()) {
      if (f === merged) continue;
      const rf = radiusForEntry(ctx, f);
      const minDist = rNew + rf + eps;
      const dx = px - f.body.position.x;
      const dy = py - f.body.position.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minDist * minDist) continue;

      const dist = Math.max(0.0001, Math.sqrt(d2));
      const overlap = minDist - dist;
      const nx = dist > 0.0002 ? dx / dist : 0;
      const ny = dist > 0.0002 ? dy / dist : 1;
      px += nx * overlap * 0.52;
      py += Math.max(0.3, ny) * overlap * 0.9;
      px = Math.max(lateralMin, Math.min(lateralMax, px));
      py = Math.max(rNew + 0.012, py);
      changed = true;
    }
    if (!changed) break;
  }

  merged.body.position.x = px;
  merged.body.position.y = py;
}

function atomicNumberForEntry(ctx, entry) {
  return ctx.FRUITS?.[entry.type]?.atomicNumber ?? null;
}

function typeIndexForAtomicNumber(ctx, atomicNumber) {
  const target = Number(atomicNumber);
  if (!Number.isFinite(target) || target <= 0 || !Array.isArray(ctx.FRUITS)) return -1;
  for (let i = 0; i < ctx.FRUITS.length; i += 1) {
    if (Number(ctx.FRUITS[i]?.atomicNumber) === target) return i;
  }
  return -1;
}

function moleculeBoardResultType(ctx, recipe) {
  const explicitType = Number(recipe?.boardResultType);
  if (Number.isInteger(explicitType) && ctx.FRUITS?.[explicitType]) return explicitType;

  const explicitAtomicNumber = Number(recipe?.boardResultAtomicNumber);
  if (Number.isFinite(explicitAtomicNumber)) {
    const explicitIndex = typeIndexForAtomicNumber(ctx, explicitAtomicNumber);
    if (explicitIndex >= 0) return explicitIndex;
  }

  const inputs = Array.isArray(recipe?.inputs) ? recipe.inputs : [];
  if (inputs.length <= 0) return null;
  let heaviestAtomic = 0;
  for (const atomicNumber of inputs) {
    const z = Number(atomicNumber);
    if (Number.isFinite(z) && z > heaviestAtomic) heaviestAtomic = z;
  }
  const fallbackIndex = typeIndexForAtomicNumber(ctx, heaviestAtomic);
  return fallbackIndex >= 0 ? fallbackIndex : null;
}

function atomicMassForSpec(spec) {
  const mass = Number(spec?.atomicMass);
  if (Number.isFinite(mass) && mass > 0) return mass;
  const z = Number(spec?.atomicNumber);
  if (Number.isFinite(z) && z > 0) return z;
  return 1;
}

function mergeBasePointsForType(ctx, type) {
  const fallback = Math.max(8, Number(ctx.MERGE_POINTS?.[type] ?? 20));
  if (ctx.mode !== 'atoms') return fallback;
  const spec = ctx.FRUITS?.[type];
  const atomMass = atomicMassForSpec(spec);
  // Mass-driven score curve with blended fallback for stable balancing.
  const massCurve = 10 + Math.pow(atomMass, 0.78) * 12.5;
  return Math.max(10, Math.round(fallback * 0.35 + massCurve * 0.65));
}

function moleculeMassU(ctx, recipe) {
  if (!Array.isArray(recipe?.inputs) || recipe.inputs.length === 0) return 0;
  const byAtomic = new Map((ctx.FRUITS ?? []).map((spec) => [spec.atomicNumber, spec]));
  let sum = 0;
  for (const atomicNumber of recipe.inputs) {
    const spec = byAtomic.get(atomicNumber);
    sum += atomicMassForSpec(spec ?? { atomicNumber });
  }
  return sum;
}

function moleculeBasePoints(ctx, recipe) {
  const fallback = Math.max(80, Number(recipe?.points ?? 0));
  if (ctx.mode !== 'atoms') return fallback;
  const massU = Math.max(1, moleculeMassU(ctx, recipe));
  const complexity = Math.max(2, recipe?.inputs?.length ?? 2);
  const massCurve = 80 + Math.pow(massU, 0.72) * 24 + complexity * 28;
  return Math.max(90, Math.round(fallback * 0.4 + massCurve * 0.6));
}

function countByAtomicNumber(inputs) {
  const map = new Map();
  for (const z of inputs) map.set(z, (map.get(z) ?? 0) + 1);
  return map;
}

function moleculePairDistance(ctx, a, b, recipeSize = 2, detectBoost = 1) {
  const ra = radiusForEntry(ctx, a);
  const rb = radiusForEntry(ctx, b);
  const pairMult = moleculeContactMultiplier(ctx, recipeSize, detectBoost);
  return (ra + rb) * pairMult;
}

function isConnectedMoleculeCluster(ctx, entries, recipeSize, detectBoost) {
  if (!entries?.length) return false;
  if (entries.length <= 1) return true;
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length > 0) {
    const i = queue.shift();
    const a = entries[i];
    for (let j = 0; j < entries.length; j += 1) {
      if (seen.has(j) || j === i) continue;
      const b = entries[j];
      const dx = b.body.position.x - a.body.position.x;
      const dy = b.body.position.y - a.body.position.y;
      const maxD = moleculePairDistance(ctx, a, b, recipeSize, detectBoost);
      if (dx * dx + dy * dy > maxD * maxD) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  return seen.size === entries.length;
}

function detectMoleculeCluster(ctx, recipe, fruits) {
  if (!Array.isArray(recipe?.inputs) || recipe.inputs.length < 2) return null;
  const required = countByAtomicNumber(recipe.inputs);
  const relevant = fruits.filter((f) => required.has(atomicNumberForEntry(ctx, f)));
  if (relevant.length < recipe.inputs.length) return null;

  const detectBoost = Number.isFinite(recipe?.detectBoost) ? Math.max(0.86, recipe.detectBoost) : 1;

  for (const anchor of relevant) {
    const near = [];
    for (const f of relevant) {
      const dx = f.body.position.x - anchor.body.position.x;
      const dy = f.body.position.y - anchor.body.position.y;
      const maxD = moleculePairDistance(ctx, anchor, f, recipe.inputs.length, detectBoost);
      if (dx * dx + dy * dy <= maxD * maxD) near.push(f);
    }
    if (near.length < recipe.inputs.length) continue;

    const chosen = [];
    const used = new Set();
    let ok = true;
    for (const [z, need] of required.entries()) {
      const pool = near
        .filter((f) => !used.has(f) && atomicNumberForEntry(ctx, f) === z)
        .sort((a, b) => {
          const dax = a.body.position.x - anchor.body.position.x;
          const day = a.body.position.y - anchor.body.position.y;
          const dbx = b.body.position.x - anchor.body.position.x;
          const dby = b.body.position.y - anchor.body.position.y;
          return dax * dax + day * day - (dbx * dbx + dby * dby);
        });
      if (pool.length < need) {
        ok = false;
        break;
      }
      for (let i = 0; i < need; i += 1) {
        const pick = pool[i];
        used.add(pick);
        chosen.push(pick);
      }
    }
    if (!ok) continue;

    let cx = 0;
    let cy = 0;
    let totalMass = 0;
    for (const f of chosen) {
      const mass = Math.max(0.0001, Number(f.body.mass) || 0.0001);
      totalMass += mass;
      cx += f.body.position.x * mass;
      cy += f.body.position.y * mass;
    }
    cx /= totalMass;
    cy /= totalMass;
    if (!isConnectedMoleculeCluster(ctx, chosen, recipe.inputs.length, detectBoost)) continue;
    return { entries: chosen, x: cx, y: cy };
  }
  return null;
}

function emitMoleculeLinks(ctx, entries, color, bondScale = 1) {
  if (!entries?.length) return;
  const done = new Set();
  for (let i = 0; i < entries.length; i += 1) {
    const base = entries[i];
    const near = [];
    for (let j = 0; j < entries.length; j += 1) {
      if (j === i) continue;
      const other = entries[j];
      const dx = other.body.position.x - base.body.position.x;
      const dy = other.body.position.y - base.body.position.y;
      near.push({ other, d2: dx * dx + dy * dy });
    }
    near.sort((a, b) => a.d2 - b.d2);
    for (let k = 0; k < Math.min(2, near.length); k += 1) {
      const pair = near[k].other;
      const a = entries.indexOf(base);
      const b = entries.indexOf(pair);
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (done.has(key)) continue;
      done.add(key);
      const radiusA = radiusForEntry(ctx, base);
      const radiusB = radiusForEntry(ctx, pair);
      ctx.juice.atomPairAttractor?.(
        base.body.position.x,
        base.body.position.y,
        ctx.ROW_Z + 0.03,
        pair.body.position.x,
        pair.body.position.y,
        ctx.ROW_Z + 0.03,
        color,
        0.88 * Math.max(0, bondScale),
        {
          radiusA,
          radiusB,
          duration: 0.64,
          style: 'electron',
          count: 1.3,
          speed: 1.05,
        },
      );
    }
  }
}

function isWaterRecipe(recipe) {
  if (!recipe) return false;
  if (recipe.id === 'water') return true;
  const normalized = String(recipe.formula ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  return normalized === 'H2O';
}

function isFireRecipe(recipe) {
  if (!recipe) return false;
  if (recipe.id === 'methane') return true;
  const normalized = String(recipe.formula ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  return normalized === 'CH4';
}

function isSpecialRecipe(recipe) {
  if (!recipe) return false;
  if (recipe.id === 'glucose') return true;
  return Array.isArray(recipe.inputs) && recipe.inputs.length >= 10;
}

function hasWorldMechanic(ctx, mechanicId) {
  if (!Array.isArray(ctx?.worldMechanics) || !mechanicId) return false;
  return ctx.worldMechanics.includes(mechanicId);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function resolveFxProfile(profile, scope = 'both') {
  if (!profile || typeof profile !== 'object') return null;
  if (profile.enabled === false) return null;
  const profileScope = String(profile.scope ?? 'both').toLowerCase();
  if (scope !== 'both' && profileScope !== 'both' && profileScope !== scope) return null;
  return profile;
}

function fxScale(profile, key, fallback = 1) {
  const value = Number(profile?.[key]);
  if (!Number.isFinite(value)) return fallback;
  return clamp(value, 0, 3);
}

function applyWorldMoleculeMechanics(ctx, cluster, recipe, points, baseIntensity) {
  if (!cluster) return;
  if (hasWorldMechanic(ctx, 'reactive_chain')) {
    const chainBonus = Math.max(24, Math.round(points * 0.14));
    ctx.addScore(chainBonus);
    ctx.juice.creationExplosion?.(cluster.x, cluster.y + 0.03, ctx.ROW_Z + 0.06, baseIntensity * 0.92);
    ctx.juice.burstSparks?.(cluster.x, cluster.y + 0.02, ctx.ROW_Z + 0.08, recipe.color ?? 0xff9f62, 9);
    ctx.popFloatText?.(`+${chainBonus} chain`, cluster.x, cluster.y + 0.42, ctx.ROW_Z + 0.36, {
      color: '#ffbf7c',
      variant: 'atom',
    });
  }
  if (hasWorldMechanic(ctx, 'dense_stack')) {
    dampMergeNeighbors(ctx, cluster.x, cluster.y, null, 2.45, 0.9);
  }
}

/**
 * Molecule creation is intentionally one layer below normal same+same merges:
 * this function is called only after all standard merge checks fail.
 * Hook discovery/UI via ctx.onMoleculeFusion and ctx.spawnMoleculeEntity.
 */
function createMolecule(ctx, recipe, cluster, vfxLevel = 'normal') {
  if (!cluster?.entries?.length) return false;
  const color = recipe.color ?? 0xffffff;
  const boardResultType = moleculeBoardResultType(ctx, recipe);
  const moleculeProfile = resolveFxProfile(
    recipe.formationFxProfile ??
      ctx.getFxProfileById?.(recipe.formationFxId, 'molecule'),
    'molecule',
  ) ??
    resolveFxProfile(
      ctx.getFxProfileById?.('molecule_default', 'molecule'),
      'molecule',
    );
  const bondScaleMul = fxScale(moleculeProfile, 'bondScale', 1);
  emitMoleculeLinks(ctx, cluster.entries, color, bondScaleMul);

  for (const f of cluster.entries) {
    if (!ctx.getFruits().includes(f)) return false;
  }

  let carryVx = 0;
  let carryVy = 0;
  for (const f of cluster.entries) {
    carryVx += Number(f?.body?.velocity?.x ?? 0);
    carryVy += Number(f?.body?.velocity?.y ?? 0);
  }
  carryVx /= Math.max(1, cluster.entries.length);
  carryVy /= Math.max(1, cluster.entries.length);

  const comboMult = ctx.mergeComboMultBeforeBump();
  ctx.bumpMergeCombo();
  const basePoints = moleculeBasePoints(ctx, recipe);
  const moleculeMult = recipe.multiplier + (comboMult - 1) * 0.45;
  const points = scoreWithMultiplier(basePoints, moleculeMult);
  const vfxMin = vfxLevel === 'minimal';
  const vfxNorm = vfxLevel === 'normal';
  const countScale = Math.max(1, Math.sqrt(cluster.entries.length));
  const burstScale = fxScale(moleculeProfile, 'burstScale', 1);
  const sparkScaleMul = fxScale(moleculeProfile, 'sparkScale', 1);
  const dropletScaleMul = fxScale(moleculeProfile, 'dropletScale', 1);
  const smokeScaleMul = fxScale(moleculeProfile, 'smokeScale', 1);
  const shatterScaleMul = fxScale(moleculeProfile, 'shatterScale', 1);
  const trailScaleMul = fxScale(moleculeProfile, 'trailScale', 1);
  const explosionScaleMul = fxScale(moleculeProfile, 'explosionScale', 1);
  const hitPauseScale = fxScale(moleculeProfile, 'hitPauseScale', 1);
  const vibrateScale = fxScale(moleculeProfile, 'vibrateScale', 1);
  const burstCount = Math.min(160, Math.floor((vfxNorm ? 46 : 68) * countScale * burstScale));
  const burstBoost = (vfxMin ? 0.9 : vfxNorm ? 1.28 : 1.55) * burstScale;
  const notifyAnchor = ctx.getUiNotifyAnchor?.() ?? { x: cluster.x, y: cluster.y + 0.52 };
  const notifyX = Number.isFinite(notifyAnchor?.x) ? notifyAnchor.x : cluster.x;
  const notifyY = Number.isFinite(notifyAnchor?.y) ? notifyAnchor.y : cluster.y + 0.52;
  const formulaDisplay =
    ctx.formatChemicalFormula?.(recipe.formula) ?? formatChemicalFormula(recipe.formula);

  for (const f of [...cluster.entries]) ctx.removeFruit(f);

  if (boardResultType != null) {
    const boardRadius = radiusForType(ctx, boardResultType);
    const atomMode = ctx.mode === 'atoms';
    const safeSpawn = resolveMergeSpawnPose(ctx, cluster.x, cluster.y, boardRadius, {
      anchorX: cluster.x,
      maxLateralShift: atomMode ? Math.max(0.06, boardRadius * 0.14) : Math.max(0.1, boardRadius * 0.24),
      preferVertical: atomMode,
    });
    ctx.spawnFruit(boardResultType, safeSpawn.x, safeSpawn.y, ctx.ROW_Z, { fusionPop: true });
    const spawned = ctx.getFruits()[ctx.getFruits().length - 1];
    if (spawned?.body) {
      settleMergedBody(ctx, spawned, boardRadius, {
        anchorX: cluster.x,
        maxLateralShift: atomMode ? Math.max(0.07, boardRadius * 0.16) : Math.max(0.12, boardRadius * 0.28),
      });
      spawned.body.velocity.set(carryVx * 0.12, Math.min(0.04, Math.max(-0.03, carryVy * 0.08)), 0);
      spawned.body.angularVelocity.set(0, 0, 0);
      dampMergeNeighbors(ctx, safeSpawn.x, safeSpawn.y, spawned, Math.max(0.3, boardRadius * 2.9), 0.16);
    }
  }

  const fxBoostRaw = Number(recipe?.fxIntensity);
  const fxBoost = Number.isFinite(fxBoostRaw) ? clamp(fxBoostRaw, 0.4, 2.8) : 1;
  const baseIntensity = (vfxMin ? 0.78 : vfxNorm ? 1 : 1.18) * fxBoost * explosionScaleMul;
  const special = isSpecialRecipe(recipe);
  const explosionIntensity = special ? baseIntensity * 1.25 : baseIntensity;

  if (typeof ctx.juice.creationExplosion === 'function') {
    ctx.juice.creationExplosion(cluster.x, cluster.y, ctx.ROW_Z + 0.03, explosionIntensity);
  } else if (typeof ctx.juice.moleculeCreationBurst === 'function') {
    ctx.juice.moleculeCreationBurst(
      cluster.x,
      cluster.y,
      ctx.ROW_Z + 0.03,
      color,
      formulaDisplay,
      explosionIntensity,
    );
  } else {
    ctx.juice.burst(
      cluster.x,
      cluster.y,
      ctx.ROW_Z + 0.03,
      color,
      vfxMin ? Math.max(12, Math.floor(26 * burstScale)) : burstCount,
      Math.max(0.45, burstBoost),
      'jackpot',
    );
    ctx.juice.burstSparks(
      cluster.x,
      cluster.y,
      ctx.ROW_Z + 0.08,
      color,
      vfxMin
        ? Math.max(4, Math.floor(12 * sparkScaleMul))
        : Math.min(64, Math.floor(burstCount * 0.34 * sparkScaleMul)),
    );
    ctx.juice.smokePuff?.(
      cluster.x,
      cluster.y,
      ctx.ROW_Z + 0.03,
      color,
      vfxMin
        ? Math.max(2, Math.floor(12 * smokeScaleMul))
        : Math.min(84, Math.floor(burstCount * 0.46 * smokeScaleMul)),
    );
    if (!vfxNorm) {
      ctx.juice.shatterSpray?.(
        cluster.x,
        cluster.y,
        ctx.ROW_Z + 0.03,
        color,
        Math.min(50, Math.floor(burstCount * 0.24 * shatterScaleMul)),
      );
    }
  }

  const elementalMode = String(moleculeProfile?.elementalMode ?? 'auto').toLowerCase();
  if (elementalMode === 'water' || (elementalMode === 'auto' && isWaterRecipe(recipe))) {
    ctx.juice.waterSplash?.(cluster.x, cluster.y, ctx.ROW_Z + 0.04, baseIntensity);
    ctx.juice.waterScreenDroplets?.((vfxMin ? 0.9 : vfxNorm ? 1.1 : 1.25) * dropletScaleMul);
  } else if (elementalMode === 'fire' || (elementalMode === 'auto' && isFireRecipe(recipe))) {
    ctx.juice.fireBurst?.(cluster.x, cluster.y, ctx.ROW_Z + 0.04, baseIntensity * 1.08);
  } else if (elementalMode === 'explosion') {
    ctx.juice.creationExplosion?.(cluster.x, cluster.y, ctx.ROW_Z + 0.05, baseIntensity * 0.88);
  } else {
    ctx.juice.moleculeSmoke?.(cluster.x, cluster.y, ctx.ROW_Z + 0.04, color, baseIntensity);
  }
  if (!vfxMin) {
    const configuredTrailStyle = String(moleculeProfile?.trailStyle ?? 'auto').toLowerCase();
    const trailStyle =
      configuredTrailStyle === 'auto' ? (special ? 'full' : 'lite') : configuredTrailStyle;
    const trailIntensity = special
      ? 0.98 + Math.min(1.12, cluster.entries.length * 0.06)
      : 0.72 + Math.min(0.42, cluster.entries.length * 0.045);
    if (trailStyle !== 'none') {
      ctx.juice.specialMoleculeTrails?.(
        cluster.x,
        cluster.y + 0.04,
        ctx.ROW_Z + 0.09,
        color,
        trailIntensity * trailScaleMul,
        trailStyle,
      );
    }
  }
  ctx.juice.playFxProfileStack?.(moleculeProfile, {
    worldX: cluster.x,
    worldY: cluster.y,
    worldZ: ctx.ROW_Z + 0.04,
    targetX: cluster.entries[0]?.body?.position?.x,
    targetY: cluster.entries[0]?.body?.position?.y,
    targetZ: ctx.ROW_Z + 0.04,
    color,
    intensity: baseIntensity,
    variant: 'jackpot',
  });
  // Keep in-world molecule entity at real fusion position (not UI center)
  // so we avoid visual duplication with centered popup.
  ctx.spawnMoleculeEntity?.(recipe, cluster.x, cluster.y, {
    sourceCount: cluster.entries.length,
  });
  ctx.addScore(points, { skipScorePulse: true });
  ctx.onMoleculeFusion?.({
    recipe,
    basePoints,
    points,
    x: cluster.x,
    y: cluster.y,
    formula: formulaDisplay,
  });
  applyWorldMoleculeMechanics(ctx, cluster, recipe, points, baseIntensity);
  if (typeof ctx.Sfx.playMolecule === 'function') ctx.Sfx.playMolecule(cluster.entries.length);
  else ctx.Sfx.playJackpot(1.35);
  ctx.vibrateJackpot((1.28 + Math.min(1.1, cluster.entries.length * 0.04)) * vibrateScale);
  const hitPauseDuration = special ? (vfxMin ? 0.08 : 0.14) : vfxMin ? 0.065 : 0.12;
  ctx.queueHitPause(hitPauseDuration * hitPauseScale);
  ctx.setMergeCooldown(18);
  return true;
}

function checkForMolecule(ctx, resolveVfxLevel) {
  if (!ctx.getMoleculeFusionUnlocked?.()) return false;
  if (!Array.isArray(ctx.MOLECULE_RECIPES) || ctx.MOLECULE_RECIPES.length === 0) return false;

  const fruits = ctx.getFruits();
  if (fruits.length < 2) return false;
  const level = ctx.getLevel?.() ?? 1;
  const discoverCount = ctx.getDiscoveredCount?.() ?? 0;
  const maxInputs = Math.max(2, ctx.getMoleculeMaxInputs?.() ?? Number.POSITIVE_INFINITY);
  const recipes = ctx.MOLECULE_RECIPES
    .filter(
      (r) =>
        (r.inputs?.length ?? 0) <= maxInputs &&
        (r.unlockLevel ?? 1) <= level &&
        (r.unlockDiscovered ?? 0) <= discoverCount,
    )
    .sort((a, b) => {
      const pa = Number.isFinite(a.priority) ? a.priority : 0;
      const pb = Number.isFinite(b.priority) ? b.priority : 0;
      if (pb !== pa) return pb - pa;
      if (b.inputs.length !== a.inputs.length) return b.inputs.length - a.inputs.length;
      return (b.points ?? 0) - (a.points ?? 0);
    });

  for (const recipe of recipes) {
    const cluster = detectMoleculeCluster(ctx, recipe, fruits);
    if (!cluster) continue;
    if (createMolecule(ctx, recipe, cluster, resolveVfxLevel())) return true;
  }
  return false;
}

/**
 * @param {object} ctx
 * @param {() => boolean} ctx.getGameOver
 * @param {() => number} ctx.getMergeCooldown
 * @param {(n: number) => void} ctx.setMergeCooldown
 * @param {*} ctx.juice
 * @param {() => Array<{ type: number, body: import('cannon-es').Body, mesh: import('three').Object3D, fusionT?: number, fusionDur?: number }>} ctx.getFruits
 * @param {(a: object, b: object) => void} ctx.removeFruit
 * @param {(type: number, x: number, y: number, z: number, opts?: object) => void} ctx.spawnFruit
 * @param {(r: number) => number} ctx.innerHalfXForRadius
 * @param {number} ctx.ROW_Z
 * @param {*} ctx.FRUITS
 * @param {number[]} ctx.MERGE_POINTS
 * @param {number} ctx.MERGEABLE_TYPE_MAX
 * @param {number} ctx.MERGE_DIST_MULT
 * @param {number} ctx.JACKPOT_MERGE_DIST_MULT
 * @param {number} ctx.COMBO_CHAIN_SEC
 * @param {*} ctx.physicsTuning
 * @param {() => number} ctx.mergeComboMultBeforeBump
 * @param {() => void} ctx.bumpMergeCombo
 * @param {(d?: number) => void} ctx.queueHitPause
 * @param {(e: object) => void} ctx.beginJackpotVanish
 * @param {(n: number, o?: { skipScorePulse?: boolean }) => void} ctx.addScore
 * @param {(t: string, wx: number, wy: number, wz: number, o?: object) => void} ctx.popFloatText
 * @param {(el: HTMLElement | null) => void} ctx.flashHudMerge
 * @param {HTMLElement | null} ctx.scoreEl
 * @param {*} ctx.Sfx
 * @param {(h: number) => void} ctx.vibrateJackpot
 * @param {(h: number) => void} ctx.vibrateMerge
 * @param {() => number} ctx.lastMergeAtMs
 * @param {() => number} ctx.comboChain
 * @param {Array<{ id: string, formula: string, inputs: number[], points: number, multiplier: number, color?: number, name?: string, fact?: string, unlockLevel?: number, unlockDiscovered?: number }>} [ctx.MOLECULE_RECIPES]
 * @param {number} [ctx.MOLECULE_DETECT_DIST_MULT]
 * @param {() => boolean} [ctx.getMoleculeFusionUnlocked]
 * @param {() => number} [ctx.getMoleculeMaxInputs]
 * @param {() => number} [ctx.getLevel]
 * @param {() => number} [ctx.getDiscoveredCount]
 * @param {() => { x: number, y: number }} [ctx.getUiNotifyAnchor]
 * @param {(recipe: object, x: number, y: number, opts?: object) => void} [ctx.spawnMoleculeEntity]
 * @param {(payload: { recipe: object, basePoints?: number, points: number, x: number, y: number, formula: string }) => void} [ctx.onMoleculeFusion]
 * @param {object} flavor
 * @param {'nextTier' | 'sumNumbers'} flavor.mergeResult
 * @param {(n: number) => number} [flavor.typeIndexForNumber]
 * @param {number} [flavor.twinTenType]
 * @param {(jpPts: number) => string} flavor.jackpotFloatTier
 * @param {() => void} [flavor.onJackpotTierExtra]
 * @param {(jpPts: number) => string} [flavor.jackpotFloatTwinTen]
 * @param {() => void} [flavor.onJackpotTwinTenExtra]
 * @param {(mergePts: number, newType: number, nx: number, ny: number, spec: object) => void} flavor.onNormalMergeUi
 * @param {boolean} [flavor.vfxHeavy] — extra particles when vfxLevel is not minimal
 * @param {'minimal' | 'normal' | 'heavy'} [flavor.vfxLevel] — minimal = soft burst only (default)
 */
export function createTryMerge(ctx, flavor) {
  const {
    mergeResult,
    typeIndexForNumber,
    twinTenType = -1,
    jackpotFloatTier,
    onJackpotTierExtra,
    jackpotFloatTwinTen,
    onJackpotTwinTenExtra,
    onNormalMergeUi,
    vfxHeavy = false,
    vfxLevel = 'minimal',
  } = flavor;

  function resolveVfxLevel() {
    const v = flavor.vfxLevel;
    if (typeof v === 'function') return v() ?? 'minimal';
    return v ?? 'minimal';
  }

  return function tryMerge() {
    if (ctx.getMergeCooldown() > 0 || ctx.getGameOver()) return;
    const fruits = ctx.getFruits();
    const MAX_TYPE = ctx.FRUITS.length - 1;
    const JACKPOT_MERGE_PTS = mergeBasePointsForType(ctx, MAX_TYPE) * 5 + 180;

    for (let i = 0; i < fruits.length; i++) {
      for (let j = i + 1; j < fruits.length; j++) {
        const a = fruits[i];
        const b = fruits[j];
        if (a.type !== MAX_TYPE || b.type !== MAX_TYPE) continue;
        const rMax = radiusForType(ctx, MAX_TYPE);
        const touch = rMax + rMax;
        const dx = a.body.position.x - b.body.position.x;
        const dy = a.body.position.y - b.body.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist > touch * ctx.JACKPOT_MERGE_DIST_MULT) continue;
        const nowJp = performance.now();
        const chainJp =
          nowJp - ctx.lastMergeAtMs() <= ctx.COMBO_CHAIN_SEC * 1000 ? ctx.comboChain() : 0;
        const jm = ctx.mergeComboMultBeforeBump();
        ctx.bumpMergeCombo();
        const jx = (a.body.position.x + b.body.position.x) / 2;
        const jy = (a.body.position.y + b.body.position.y) / 2;
        const jackHeat = 1 + chainJp * 0.22 + (jm - 1) * 0.35;
        const jBurst = Math.min(120, 52 + chainJp * 22 + Math.floor((jm - 1) * 18));
        const jBoost = 1 + chainJp * 0.11 + (jm - 1) * 0.14;
        const jpPts = scoreWithMultiplier(JACKPOT_MERGE_PTS, jm);
        const vl = resolveVfxLevel();
        const vfxMin = vl === 'minimal';
        const vfxNorm = vl === 'normal';
        if (vfxMin) {
          ctx.juice.burst(jx, jy, ctx.ROW_Z + 0.02, ctx.FRUITS[MAX_TYPE].color, 22, 0.85, 'jackpot');
        } else {
          const jb = vfxNorm ? Math.min(72, jBurst) : jBurst;
          const jbb = vfxNorm ? Math.min(1.35, jBoost) : jBoost;
          ctx.juice.burst(jx, jy, ctx.ROW_Z + 0.02, ctx.FRUITS[MAX_TYPE].color, jb, jbb, 'jackpot');
          ctx.juice.burstSparks(jx, jy, ctx.ROW_Z + 0.05, ctx.FRUITS[MAX_TYPE].color, vfxNorm ? 14 : 28);
          if (!vfxNorm || vfxHeavy) {
            ctx.juice.smokePuff?.(jx, jy, ctx.ROW_Z + 0.02, ctx.FRUITS[MAX_TYPE].color, vfxHeavy ? 38 : 18);
            ctx.juice.shatterSpray?.(jx, jy, ctx.ROW_Z + 0.02, ctx.FRUITS[MAX_TYPE].color, vfxHeavy ? 22 : 12);
          }
        }
        ctx.queueHitPause(vfxMin ? 0.045 : 0.088);
        ctx.beginJackpotVanish(a);
        ctx.beginJackpotVanish(b);
        ctx.addScore(jpPts, { skipScorePulse: true });
        ctx.popFloatText(jackpotFloatTier(jpPts), jx, jy, ctx.ROW_Z + 0.42, {
          jackpot: true,
          color: '#ffe8a8',
        });
        onJackpotTierExtra?.();
        ctx.flashHudMerge(ctx.scoreEl);
        ctx.Sfx.playJackpot(jackHeat);
        ctx.vibrateJackpot(jackHeat);
        ctx.setMergeCooldown(14);
        return;
      }
    }

    if (twinTenType >= 0 && mergeResult === 'sumNumbers') {
      const TEN_JP_PTS = mergeBasePointsForType(ctx, twinTenType) * 4 + 120;
      const fruits2 = ctx.getFruits();
      for (let i = 0; i < fruits2.length; i++) {
        for (let j = i + 1; j < fruits2.length; j++) {
          const a = fruits2[i];
          const b = fruits2[j];
          if (a.type !== twinTenType || b.type !== twinTenType) continue;
          const r10 = radiusForType(ctx, twinTenType);
          const touch = r10 + r10;
          const dist = Math.hypot(
            a.body.position.x - b.body.position.x,
            a.body.position.y - b.body.position.y,
          );
          if (dist > touch * ctx.JACKPOT_MERGE_DIST_MULT) continue;
          const nowJp = performance.now();
          const chainJp =
            nowJp - ctx.lastMergeAtMs() <= ctx.COMBO_CHAIN_SEC * 1000 ? ctx.comboChain() : 0;
          const jm = ctx.mergeComboMultBeforeBump();
          ctx.bumpMergeCombo();
          const jx = (a.body.position.x + b.body.position.x) / 2;
          const jy = (a.body.position.y + b.body.position.y) / 2;
          const jackHeat = 1 + chainJp * 0.18 + (jm - 1) * 0.28;
          const jBurst = Math.min(100, 44 + chainJp * 18 + Math.floor((jm - 1) * 14));
          const jBoost = 1 + chainJp * 0.09 + (jm - 1) * 0.12;
          const jpPts = scoreWithMultiplier(TEN_JP_PTS, jm);
          const vl = resolveVfxLevel();
          const vfxMin = vl === 'minimal';
          const vfxNorm = vl === 'normal';
          if (vfxMin) {
            ctx.juice.burst(jx, jy, ctx.ROW_Z + 0.02, ctx.FRUITS[twinTenType].color, 20, 0.82, 'jackpot');
          } else {
            const jb = vfxNorm ? Math.min(64, jBurst) : jBurst;
            const jbb = vfxNorm ? Math.min(1.28, jBoost) : jBoost;
            ctx.juice.burst(jx, jy, ctx.ROW_Z + 0.02, ctx.FRUITS[twinTenType].color, jb, jbb, 'jackpot');
            ctx.juice.burstSparks(jx, jy, ctx.ROW_Z + 0.05, ctx.FRUITS[twinTenType].color, vfxNorm ? 12 : 24);
            if (!vfxNorm || vfxHeavy) {
              ctx.juice.smokePuff?.(jx, jy, ctx.ROW_Z + 0.02, ctx.FRUITS[twinTenType].color, vfxHeavy ? 30 : 18);
              ctx.juice.shatterSpray?.(jx, jy, ctx.ROW_Z + 0.02, ctx.FRUITS[twinTenType].color, vfxHeavy ? 18 : 10);
            }
          }
          ctx.queueHitPause(vfxMin ? 0.04 : 0.08);
          ctx.beginJackpotVanish(a);
          ctx.beginJackpotVanish(b);
          ctx.addScore(jpPts, { skipScorePulse: true });
          ctx.popFloatText(
            jackpotFloatTwinTen ? jackpotFloatTwinTen(jpPts) : 'Wow! Big 10!',
            jx,
            jy,
            ctx.ROW_Z + 0.42,
            { jackpot: true, color: '#fff4c8' },
          );
          onJackpotTwinTenExtra?.();
          ctx.flashHudMerge(ctx.scoreEl);
          ctx.Sfx.playJackpot(jackHeat);
          ctx.vibrateJackpot(jackHeat);
          ctx.setMergeCooldown(14);
          return;
        }
      }
    }

    const dynamics = ctx.getFruits().filter((f) => f.type <= ctx.MERGEABLE_TYPE_MAX);
    for (let i = 0; i < dynamics.length; i++) {
      for (let j = i + 1; j < dynamics.length; j++) {
        const a = dynamics[i];
        const b = dynamics[j];
        if (a.type !== b.type) continue;
        const ra = radiusForEntry(ctx, a);
        const rb = radiusForEntry(ctx, b);
        const touch = ra + rb;
        const dist = a.body.position.distanceTo(b.body.position);
        if (dist > touch * atomicContactMultiplier(ctx)) continue;

        let newType;
        if (mergeResult === 'nextTier') {
          newType = a.type + 1;
        } else {
          const newNumber = ctx.FRUITS[a.type].number + ctx.FRUITS[b.type].number;
          newType = typeIndexForNumber(newNumber);
          if (newType === -1) continue;
        }

        const ma = Math.max(0.0001, a.body.mass);
        const mb = Math.max(0.0001, b.body.mass);
        const invSum = 1 / (ma + mb);
        // Deterministic spawn anchor: center-of-mass of the two merged bodies.
        const nx = (a.body.position.x * ma + b.body.position.x * mb) * invSum;
        const ny = (a.body.position.y * ma + b.body.position.y * mb) * invSum;
        const rNew = radiusForType(ctx, newType);
        const lim = ctx.innerHalfXForRadius(rNew);
        const cx = Math.max(-lim, Math.min(lim, nx));
        const bottomA = a.body.position.y - ra;
        const bottomB = b.body.position.y - rb;
        const mergeBottom = Math.min(bottomA, bottomB);
        const nySpawn = Math.max(rNew + 0.01, mergeBottom + rNew + 0.003);

        const va = a.body.velocity;
        const vb = b.body.velocity;
        const s = ctx.physicsTuning.mergeVelScale;
        let mvx = (ma * va.x + mb * vb.x) * invSum * s;
        let mvy = (ma * va.y + mb * vb.y) * invSum * s;
        mvx *= 0.08;
        mvy *= mvy > 0 ? 0.012 : 0.06;

        const nowM = performance.now();
        const chainSnap =
          nowM - ctx.lastMergeAtMs() <= ctx.COMBO_CHAIN_SEC * 1000 ? ctx.comboChain() : 0;
        const mult = ctx.mergeComboMultBeforeBump();
        ctx.bumpMergeCombo();
        const mergeProfile = resolveFxProfile(
          ctx.FRUITS?.[a.type]?.mergeFxProfile ??
            ctx.getFxProfileById?.(ctx.FRUITS?.[a.type]?.mergeFxId, 'merge'),
          'merge',
        ) ??
          resolveFxProfile(
            ctx.getFxProfileById?.('merge_default', 'merge'),
          'merge',
          );
        const mergeBurstScale = fxScale(mergeProfile, 'burstScale', 1);
        const mergeSparkScale = fxScale(mergeProfile, 'sparkScale', 1);
        const mergeSmokeScale = fxScale(mergeProfile, 'smokeScale', 1);
        const mergeShatterScale = fxScale(mergeProfile, 'shatterScale', 1);
        const mergeHitPauseScale = fxScale(mergeProfile, 'hitPauseScale', 1);
        const mergeVibrateScale = fxScale(mergeProfile, 'vibrateScale', 1);
        const mergeIntensity = (1 + mult * 0.18 + chainSnap * 0.07) * mergeVibrateScale;
        const mergePts = scoreWithMultiplier(mergeBasePointsForType(ctx, a.type), mult);
        const vl = resolveVfxLevel();
        const vfxMin = vl === 'minimal';
        const vfxNorm = vl === 'normal';
        if (vfxMin) {
          ctx.juice.burst(
            nx,
            ny,
            ctx.ROW_Z + 0.02,
            ctx.FRUITS[a.type].color,
            Math.max(4, Math.floor(16 * mergeBurstScale)),
            Math.max(0.42, 0.72 * mergeBurstScale),
            'merge',
          );
        } else {
          const pCount = Math.min(
            126,
            Math.floor((38 + chainSnap * 15 + Math.floor((mult - 1) * 12)) * mergeBurstScale),
          );
          const pBoost = (1 + chainSnap * 0.1 + (mult - 1) * 0.16) * mergeBurstScale;
          const pc = vfxNorm ? Math.min(52, pCount) : pCount;
          const pb = vfxNorm ? Math.min(1.25, pBoost) : pBoost;
          ctx.juice.burst(nx, ny, ctx.ROW_Z + 0.02, ctx.FRUITS[a.type].color, pc, pb, 'merge');
          ctx.juice.burstSparks(
            nx,
            ny,
            ctx.ROW_Z + 0.06,
            ctx.FRUITS[a.type].color,
            Math.min(28, Math.floor((8 + Math.floor(pc * 0.2)) * mergeSparkScale)),
          );
          const smCount = Math.min(32, 14 + Math.floor(chainSnap * 6) + Math.floor((mult - 1) * 4));
          const shCount = Math.min(22, 10 + Math.floor(chainSnap * 4) + Math.floor((mult - 1) * 3));
          if (!vfxNorm || vfxHeavy) {
            ctx.juice.smokePuff?.(
              nx,
              ny,
              ctx.ROW_Z + 0.02,
              ctx.FRUITS[a.type].color,
              Math.floor((vfxHeavy ? smCount + 10 : smCount) * mergeSmokeScale),
            );
            ctx.juice.shatterSpray?.(
              nx,
              ny,
              ctx.ROW_Z + 0.02,
              ctx.FRUITS[a.type].color,
              Math.floor((vfxHeavy ? shCount + 6 : shCount) * mergeShatterScale),
            );
          }
        }
        ctx.juice.playFxProfileStack?.(mergeProfile, {
          worldX: nx,
          worldY: ny,
          worldZ: ctx.ROW_Z + 0.03,
          targetX: b.body.position.x,
          targetY: b.body.position.y,
          targetZ: ctx.ROW_Z + 0.03,
          radius: rNew,
          color: ctx.FRUITS[a.type].color,
          intensity: Math.max(0.45, mult + chainSnap * 0.08),
          variant: 'merge',
        });
        const relVx = va.x - vb.x;
        const relVy = va.y - vb.y;
        const relSpeed = Math.hypot(relVx, relVy);
        const impactPauseBoost = Math.min(1.22, 1 + relSpeed * 0.055);
        ctx.queueHitPause((vfxMin ? 0.032 : 0.058) * mergeHitPauseScale * impactPauseBoost);

        ctx.removeFruit(a);
        ctx.removeFruit(b);
        const atomMode = ctx.mode === 'atoms';
        const safeSpawn = resolveMergeSpawnPose(ctx, cx, nySpawn, rNew, {
          anchorX: cx,
          maxLateralShift: atomMode ? Math.max(0.06, rNew * 0.12) : Math.max(0.1, rNew * 0.24),
          preferVertical: atomMode,
        });
        ctx.spawnFruit(newType, safeSpawn.x, safeSpawn.y, ctx.ROW_Z, { fusionPop: true });
        const merged = ctx.getFruits()[ctx.getFruits().length - 1];
        settleMergedBody(ctx, merged, rNew, {
          anchorX: cx,
          maxLateralShift: atomMode ? Math.max(0.07, rNew * 0.14) : Math.max(0.12, rNew * 0.28),
        });
        const cap = 0.24;
        const sp = Math.hypot(mvx, mvy);
        if (sp > cap) {
          const k = cap / sp;
          mvx *= k;
          mvy *= k;
        }
        merged.body.velocity.set(mvx, mvy, 0);
        merged.body.angularVelocity.set(0, 0, 0);
        dampMergeNeighbors(ctx, nx, ny, merged, Math.max(ra, rb) * 3.3, 0.08);
        ctx.addScore(mergePts, { skipScorePulse: true });
        onNormalMergeUi(mergePts, newType, nx, ny, ctx.FRUITS[newType]);
        ctx.flashHudMerge(ctx.scoreEl);
        ctx.Sfx.playMerge(newType, mult);
        ctx.vibrateMerge(mergeIntensity);
        ctx.setMergeCooldown(14);
        return;
      }
    }

    if (mergeResult === 'nextTier' && checkForMolecule(ctx, resolveVfxLevel)) {
      return;
    }
  };
}
