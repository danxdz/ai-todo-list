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
        mvx *= 0.52;
        mvy *= mvy > 0 ? 0.16 : 0.48;

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
        ctx.spawnFruit(newType, cx, nySpawn, ctx.ROW_Z, { fusionPop: true });
        const merged = ctx.getFruits()[ctx.getFruits().length - 1];
        const cap = 3.0;
        const sp = Math.hypot(mvx, mvy);
        if (sp > cap) {
          const k = cap / sp;
          mvx *= k;
          mvy *= k;
        }
        merged.body.velocity.set(mvx, mvy, 0);
        merged.body.angularVelocity.set(0, 0, 0);
        dampMergeNeighbors(ctx, nx, ny, merged, Math.max(ra, rb) * 3.2, 0.38);
        ctx.addScore(mergePts, { skipScorePulse: true });
        onNormalMergeUi(mergePts, newType, nx, ny, ctx.FRUITS[newType]);
        ctx.flashHudMerge(ctx.scoreEl);
        ctx.Sfx.playMerge(newType, mult);
        ctx.vibrateMerge(mergeIntensity);
        ctx.setMergeCooldown(14);
        return;
      }
    }
  };
}
