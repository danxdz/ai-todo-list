/**
 * Shared merge / jackpot mechanics for fruit, numbers, and atoms demos.
 */

import { scoreWithMultiplier } from './gameplay.js';

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
 * @returns {{ x: number, y: number }}
 */
function resolveMergeSpawnPose(ctx, x, y, rNew) {
  const lim = ctx.innerHalfXForRadius(rNew);
  let px = Math.max(-lim, Math.min(lim, x));
  let py = Math.max(rNew + 0.012, y);
  const extraGap = Math.min(0.034, rNew * 0.075);

  for (let iter = 0; iter < 7; iter += 1) {
    let changed = false;
    for (const f of ctx.getFruits()) {
      const rf = ctx.FRUITS[f.type].radius;
      const minDist = rNew + rf + extraGap;
      const dx = px - f.body.position.x;
      const dy = py - f.body.position.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= minDist * minDist) continue;

      const dist = Math.max(0.0001, Math.sqrt(d2));
      const overlap = minDist - dist;
      const nx = dist > 0.0002 ? dx / dist : 0;
      const ny = dist > 0.0002 ? dy / dist : 1;
      // Upward bias avoids sideways ejection chains while still separating contacts.
      px += nx * overlap * 0.74;
      py += Math.max(0.24, ny) * overlap * 1.08 + 0.0012;
      px = Math.max(-lim, Math.min(lim, px));
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
 */
function settleMergedBody(ctx, merged, rNew) {
  const lim = ctx.innerHalfXForRadius(rNew);
  let px = merged.body.position.x;
  let py = merged.body.position.y;
  const eps = Math.min(0.03, rNew * 0.07);

  for (let iter = 0; iter < 6; iter += 1) {
    let changed = false;
    for (const f of ctx.getFruits()) {
      if (f === merged) continue;
      const rf = ctx.FRUITS[f.type].radius;
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
      px = Math.max(-lim, Math.min(lim, px));
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

function countByAtomicNumber(inputs) {
  const map = new Map();
  for (const z of inputs) map.set(z, (map.get(z) ?? 0) + 1);
  return map;
}

function detectMoleculeCluster(ctx, recipe, fruits) {
  if (!Array.isArray(recipe?.inputs) || recipe.inputs.length < 2) return null;
  const required = countByAtomicNumber(recipe.inputs);
  const relevant = fruits.filter((f) => required.has(atomicNumberForEntry(ctx, f)));
  if (relevant.length < recipe.inputs.length) return null;

  const detectMult = ctx.MOLECULE_DETECT_DIST_MULT ?? 1.22;
  const detectRadius = (0.95 + Math.sqrt(recipe.inputs.length) * 0.48) * detectMult;
  const compactRadius = detectRadius * 1.02 + 0.28;

  for (const anchor of relevant) {
    const near = [];
    for (const f of relevant) {
      const dx = f.body.position.x - anchor.body.position.x;
      const dy = f.body.position.y - anchor.body.position.y;
      if (dx * dx + dy * dy <= detectRadius * detectRadius) near.push(f);
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
    for (const f of chosen) {
      cx += f.body.position.x;
      cy += f.body.position.y;
    }
    cx /= chosen.length;
    cy /= chosen.length;

    let compact = true;
    for (const f of chosen) {
      const dx = f.body.position.x - cx;
      const dy = f.body.position.y - cy;
      if (dx * dx + dy * dy > compactRadius * compactRadius) {
        compact = false;
        break;
      }
    }
    if (!compact) continue;
    return { entries: chosen, x: cx, y: cy };
  }
  return null;
}

function emitMoleculeLinks(ctx, entries, color) {
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
      const mx = (base.body.position.x + pair.body.position.x) * 0.5;
      const my = (base.body.position.y + pair.body.position.y) * 0.5;
      ctx.juice.burst(mx, my, ctx.ROW_Z + 0.03, color, 3, 0.62, 'merge');
      ctx.juice.burstSparks(mx, my, ctx.ROW_Z + 0.08, color, 2);
    }
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
  emitMoleculeLinks(ctx, cluster.entries, color);

  for (const f of cluster.entries) {
    if (!ctx.getFruits().includes(f)) return false;
  }

  const comboMult = ctx.mergeComboMultBeforeBump();
  ctx.bumpMergeCombo();
  const moleculeMult = recipe.multiplier + (comboMult - 1) * 0.45;
  const points = scoreWithMultiplier(recipe.points, moleculeMult);
  const vfxMin = vfxLevel === 'minimal';
  const vfxNorm = vfxLevel === 'normal';
  const countScale = Math.max(1, Math.sqrt(cluster.entries.length));
  const burstCount = Math.min(140, Math.floor((vfxNorm ? 46 : 68) * countScale));
  const burstBoost = vfxMin ? 0.9 : vfxNorm ? 1.28 : 1.55;

  for (const f of [...cluster.entries]) ctx.removeFruit(f);

  ctx.juice.burst(cluster.x, cluster.y, ctx.ROW_Z + 0.03, color, vfxMin ? 26 : burstCount, burstBoost, 'jackpot');
  ctx.juice.burstSparks(cluster.x, cluster.y, ctx.ROW_Z + 0.08, color, vfxMin ? 12 : Math.min(44, Math.floor(burstCount * 0.34)));
  ctx.juice.smokePuff?.(cluster.x, cluster.y, ctx.ROW_Z + 0.03, color, vfxMin ? 12 : Math.min(56, Math.floor(burstCount * 0.46)));
  if (!vfxNorm) {
    ctx.juice.shatterSpray?.(cluster.x, cluster.y, ctx.ROW_Z + 0.03, color, Math.min(30, Math.floor(burstCount * 0.24)));
  }
  ctx.spawnMoleculeEntity?.(recipe, cluster.x, cluster.y, {
    sourceCount: cluster.entries.length,
  });
  ctx.addScore(points, { skipScorePulse: true });
  ctx.popFloatText(`${recipe.formula} +${points}`, cluster.x, cluster.y + 0.52, ctx.ROW_Z + 0.46, {
    jackpot: true,
    color: `#${color.toString(16).padStart(6, '0')}`,
    variant: 'atom',
  });
  ctx.onMoleculeFusion?.({
    recipe,
    points,
    x: cluster.x,
    y: cluster.y,
    formula: recipe.formula,
  });
  if (typeof ctx.Sfx.playMolecule === 'function') ctx.Sfx.playMolecule(cluster.entries.length);
  else ctx.Sfx.playJackpot(1.35);
  ctx.vibrateJackpot(1.28 + Math.min(1.1, cluster.entries.length * 0.04));
  ctx.queueHitPause(vfxMin ? 0.065 : 0.12);
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
  const recipes = ctx.MOLECULE_RECIPES
    .filter((r) => (r.unlockLevel ?? 1) <= level && (r.unlockDiscovered ?? 0) <= discoverCount)
    .sort((a, b) => a.inputs.length - b.inputs.length);

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
 * @param {() => number} [ctx.getLevel]
 * @param {() => number} [ctx.getDiscoveredCount]
 * @param {(recipe: object, x: number, y: number, opts?: object) => void} [ctx.spawnMoleculeEntity]
 * @param {(payload: { recipe: object, points: number, x: number, y: number, formula: string }) => void} [ctx.onMoleculeFusion]
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
    const JACKPOT_MERGE_PTS = ctx.MERGE_POINTS[MAX_TYPE] * 5 + 180;

    for (let i = 0; i < fruits.length; i++) {
      for (let j = i + 1; j < fruits.length; j++) {
        const a = fruits[i];
        const b = fruits[j];
        if (a.type !== MAX_TYPE || b.type !== MAX_TYPE) continue;
        const rMax = ctx.FRUITS[MAX_TYPE].radius;
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
      const TEN_JP_PTS = ctx.MERGE_POINTS[twinTenType] * 4 + 120;
      const fruits2 = ctx.getFruits();
      for (let i = 0; i < fruits2.length; i++) {
        for (let j = i + 1; j < fruits2.length; j++) {
          const a = fruits2[i];
          const b = fruits2[j];
          if (a.type !== twinTenType || b.type !== twinTenType) continue;
          const r10 = ctx.FRUITS[twinTenType].radius;
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
        const ra = ctx.FRUITS[a.type].radius;
        const rb = ctx.FRUITS[b.type].radius;
        const touch = ra + rb;
        const dist = a.body.position.distanceTo(b.body.position);
        if (dist > touch * ctx.MERGE_DIST_MULT) continue;

        let newType;
        if (mergeResult === 'nextTier') {
          newType = a.type + 1;
        } else {
          const newNumber = ctx.FRUITS[a.type].number + ctx.FRUITS[b.type].number;
          newType = typeIndexForNumber(newNumber);
          if (newType === -1) continue;
        }

        const nx = (a.body.position.x + b.body.position.x) / 2;
        const ny = (a.body.position.y + b.body.position.y) / 2;
        const rNew = ctx.FRUITS[newType].radius;
        const lim = ctx.innerHalfXForRadius(rNew);
        const cx = Math.max(-lim, Math.min(lim, nx));
        const bottomA = a.body.position.y - ra;
        const bottomB = b.body.position.y - rb;
        const mergeBottom = Math.min(bottomA, bottomB);
        const nySpawn = Math.max(rNew + 0.01, mergeBottom + rNew + 0.003);

        const va = a.body.velocity;
        const vb = b.body.velocity;
        const ma = a.body.mass;
        const mb = b.body.mass;
        const invSum = 1 / (ma + mb);
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
        const mergeIntensity = 1 + mult * 0.18 + chainSnap * 0.07;
        const mergePts = scoreWithMultiplier(ctx.MERGE_POINTS[a.type] ?? 20, mult);
        const vl = resolveVfxLevel();
        const vfxMin = vl === 'minimal';
        const vfxNorm = vl === 'normal';
        if (vfxMin) {
          ctx.juice.burst(nx, ny, ctx.ROW_Z + 0.02, ctx.FRUITS[a.type].color, 16, 0.72, 'merge');
        } else {
          const pCount = Math.min(96, 38 + chainSnap * 15 + Math.floor((mult - 1) * 12));
          const pBoost = 1 + chainSnap * 0.1 + (mult - 1) * 0.16;
          const pc = vfxNorm ? Math.min(52, pCount) : pCount;
          const pb = vfxNorm ? Math.min(1.25, pBoost) : pBoost;
          ctx.juice.burst(nx, ny, ctx.ROW_Z + 0.02, ctx.FRUITS[a.type].color, pc, pb, 'merge');
          ctx.juice.burstSparks(
            nx,
            ny,
            ctx.ROW_Z + 0.06,
            ctx.FRUITS[a.type].color,
            Math.min(20, 8 + Math.floor(pc * 0.2)),
          );
          const smCount = Math.min(32, 14 + Math.floor(chainSnap * 6) + Math.floor((mult - 1) * 4));
          const shCount = Math.min(22, 10 + Math.floor(chainSnap * 4) + Math.floor((mult - 1) * 3));
          if (!vfxNorm || vfxHeavy) {
            ctx.juice.smokePuff?.(nx, ny, ctx.ROW_Z + 0.02, ctx.FRUITS[a.type].color, vfxHeavy ? smCount + 10 : smCount);
            ctx.juice.shatterSpray?.(nx, ny, ctx.ROW_Z + 0.02, ctx.FRUITS[a.type].color, vfxHeavy ? shCount + 6 : shCount);
          }
        }
        ctx.queueHitPause(vfxMin ? 0.028 : 0.052);

        ctx.removeFruit(a);
        ctx.removeFruit(b);
        const safeSpawn = resolveMergeSpawnPose(ctx, cx, nySpawn, rNew);
        ctx.spawnFruit(newType, safeSpawn.x, safeSpawn.y, ctx.ROW_Z, { fusionPop: true });
        const merged = ctx.getFruits()[ctx.getFruits().length - 1];
        settleMergedBody(ctx, merged, rNew);
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
