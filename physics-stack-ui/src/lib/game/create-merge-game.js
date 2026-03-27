import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createPhysicsWorld, physicsTuning, applyPhysicsPreset } from './physics.js';
import { attachSceneBackground, createRendererAndCamera, addDefaultLights, aimKeyLightAt } from './render.js';
import { applyStudioEnvironment } from './environment.js';
import { createOrthoViewportLayout } from './viewport-ortho.js';
import { worldXFromPointer } from './merge-pointer.js';
import { createPlayfieldCup } from './playfield-cup.js';
import { createJuice } from './effects.js';
import { createTryMerge } from './merge-engine.js';
import { massForFruitSpec } from './ball-mass.js';
import { createSfx } from './sfx.js';
import { vibrateMerge, vibrateJackpot, cancelVibration } from './haptics.js';
import { addAtomPlaySeconds } from './atom-skins.js';
import { getModeSpec } from './mode-specs.js';
import {
  discoveredCount,
  touchDiscoveredAtomicNumber,
  newUnlocksTodayCount,
  discoveredMoleculeCount,
  touchDiscoveredMoleculeId,
} from './atoms-discovery.js';
import { atomName, t } from '../app-i18n';

const BEST_SCORE_PREFIX = 'physics-stack-best-v1:';

function readBestScore(modeId) {
  try {
    const raw = localStorage.getItem(`${BEST_SCORE_PREFIX}${modeId}`);
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  } catch {}
  return 0;
}

function writeBestScore(modeId, value) {
  try {
    localStorage.setItem(`${BEST_SCORE_PREFIX}${modeId}`, String(Math.max(0, Math.floor(value))));
  } catch {}
}

export function createMergeGame(opts) {
  const {
    host,
    mode,
    fxLayer,
    onHud = () => {},
    onToast = () => {},
    onInfo = () => {},
    onMolecule = () => {},
    onGameOver = () => {},
    onCollection = () => {},
  } = opts;

  const modeSpec = getModeSpec(mode);
  const {
    config: {
      ROW_Z,
      GHOST_Z,
      QUEUE_STRIP_SCALE,
      QUEUE_STRIP_LANE,
      QUEUE_TOP_BAND,
      FRUITS,
      MERGE_POINTS,
      MERGEABLE_TYPE_MAX,
      CUP_BASE,
      DROP_COOLDOWN_MS,
      GAME_OVER_DWELL_SEC,
      LEVEL_GOAL_START,
      LEVEL_GOAL_SCALE,
      LEVEL_GOAL_ADD,
      COMBO_CHAIN_SEC,
      COMBO_MAX_MULT,
      COMBO_MULT_PER_TIER,
      DANGER_PULSE_BAND,
      DROP_VY_PER_LEVEL,
      DROP_VY_LEVEL_CAP,
      MERGE_DIST_MULT,
      JACKPOT_MERGE_DIST_MULT,
      GAME_OVER_BELOW_RIM,
      MOLECULE_RECIPES,
      MOLECULE_UNLOCK_LEVEL,
      MOLECULE_UNLOCK_DISCOVERED,
      MOLECULE_DETECT_DIST_MULT,
    },
  } = modeSpec;

  applyPhysicsPreset(physicsTuning, 'realistic');
  if (mode === 'numbers') {
    // Numbers mode: firmer, less floaty, calmer merge impulse response.
    physicsTuning.gravity = 48;
    physicsTuning.linearDamping = 0.25;
    physicsTuning.angularDamping = 0.52;
    physicsTuning.restitutionFruit = 0.008;
    physicsTuning.restitutionDefault = 0.001;
    physicsTuning.mergeVelScale = 0.0049;
    physicsTuning.mergeAngScale = 0.005;
    physicsTuning.dropVy = 0.11;
  }
  if (mode === 'atoms') {
    // Atoms mode: denser "marble" feel, calmer bottom pile, less jelly chain reactions.
    physicsTuning.gravity = 52;
    physicsTuning.restitutionFruit = 0.0018;
    physicsTuning.restitutionDefault = 0.0002;
    physicsTuning.frictionFruit = 0.92;
    physicsTuning.frictionDefault = 0.9;
    physicsTuning.linearDamping = 0.44;
    physicsTuning.angularDamping = 0.72;
    physicsTuning.sleepSpeedLimit = 0.28;
    physicsTuning.sleepTimeLimit = 0.1;
    physicsTuning.mergeVelScale = 0.0019;
    physicsTuning.mergeAngScale = 0.0016;
    physicsTuning.dropVy = 0.1;
    physicsTuning.contactStiffness6 = 760;
    physicsTuning.contactRelaxation = 1.55;
    physicsTuning.solverIterations = 152;
    physicsTuning.frictionEqStiffness7 = 13.5;
    physicsTuning.frictionEqRelaxation = 1.05;
  }

  let destroyed = false;
  let rafId = 0;
  let muted = false;
  let score = 0;
  let bestScore = readBestScore(modeSpec.id);
  let level = 1;
  let levelProgress = 0;
  let levelScoreGoal = Math.floor(
    LEVEL_GOAL_START *
      (mode === 'atoms' ? 1.16 : 1),
  );
  let gameOver = false;
  let mergeCooldown = 0;
  let comboChain = 0;
  let lastMergeAtMs = 0;
  let hitPause = 0;
  let heartbeatAcc = 0;
  let atomPlaySecAcc = 0;
  let lastDropTime = 0;
  let gameOverDwell = 0;
  let panic = 0;
  let moleculeHintCd = 0;
  let lastMoleculeHintKey = '';

  let CUP = { ...CUP_BASE, wallH: 11 };
  let DROP_CENTER_Y = CUP.wallH - 0.55;
  let GAME_OVER_Y = CUP.wallH - GAME_OVER_BELOW_RIM;

  const listeners = [];
  const fruits = [];
  const jackpotVanishes = [];
  const moleculeEntities = [];
  const queuePreviewEntries = [];
  const queueSweepEntries = [];
  const dropQueue = [];
  const ghostPos = new THREE.Vector3(0, DROP_CENTER_Y, GHOST_Z);
  const QUEUE_STRIP_VISIBLE = 2;
  const DROP_QUEUE_SIZE = 1 + QUEUE_STRIP_VISIBLE;

  const scene = new THREE.Scene();
  attachSceneBackground(scene);
  const { renderer, camera, canvasEl } = createRendererAndCamera(host);
  canvasEl.classList.add('merge-canvas');
  const juice = createJuice(scene);
  const { sun: keyLight } = addDefaultLights(scene);
  applyStudioEnvironment(renderer, scene);

  const orthoLayout = createOrthoViewportLayout({ renderer, camera, canvasEl });
  const { world, physicsMaterial, applyPhysicsTuning: applyPhysicsTuningToBodies } =
    createPhysicsWorld();
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;

  const playfield = createPlayfieldCup({
    scene,
    world,
    camera,
    keyLight,
    aimKeyLightAt,
    getViewportSize: orthoLayout.getViewportSize,
    applyCupOrthoFrame: orthoLayout.applyCupOrthoFrame,
    syncCanvasToViewport: orthoLayout.syncCanvasToViewport,
    ROW_Z,
    CUP_BASE,
    CUP,
    getDropCenterY: () => DROP_CENTER_Y,
    setDropCenterY: (value) => {
      DROP_CENTER_Y = value;
    },
    getGameOverY: () => GAME_OVER_Y,
    setGameOverY: (value) => {
      GAME_OVER_Y = value;
    },
    GAME_OVER_BELOW_RIM,
    themeId: modeSpec.themeId,
  });

  const queuePreviewGroup = new THREE.Group();
  queuePreviewGroup.renderOrder = 14;
  scene.add(queuePreviewGroup);

  const Sfx = createSfx();
  muted = Sfx.getMuted();
  const atomSpecByNumber = new Map(FRUITS.map((spec) => [spec.atomicNumber, spec]));

  function listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    listeners.push(() => target.removeEventListener(event, handler, options));
  }

  function comboLabel() {
    const now = performance.now();
    const dead = now - lastMergeAtMs > COMBO_CHAIN_SEC * 1000;
    if (comboChain <= 0 || dead) return t('game.comboReady');
    const nextM = Math.min(COMBO_MAX_MULT, 1 + comboChain * COMBO_MULT_PER_TIER);
    return `x${nextM % 1 === 0 ? String(nextM) : nextM.toFixed(2)}`;
  }

  function emitHud() {
    const remainingGoal = Math.max(0, Math.ceil(levelScoreGoal - levelProgress));
    onHud({
      score,
      level,
      levelGoal: remainingGoal,
      combo: comboLabel(),
      nextLabel: modeSpec.queueLabel(dropQueue[0] ?? 0),
      nextQueue: dropQueue.slice(0, 3).map((type) => ({
        label: modeSpec.queueLabel(type),
        color: FRUITS[type]?.color ?? 0xffffff,
      })),
      tierLabel: modeSpec.levelTag(level),
      panic,
      muted,
      title: modeSpec.title,
      themeId: modeSpec.themeId,
    });
  }

  function emitCollectionSnapshot() {
    onCollection({
      discovered: discoveredCount(),
      molecules: discoveredMoleculeCount(),
      newToday: newUnlocksTodayCount(),
    });
  }

  function popFloatText(text, wx, wy, wz, { jackpot = false, color = '#fff4d8', variant = '' } = {}) {
    if (!fxLayer || !text) return;
    const v = new THREE.Vector3(wx, wy, wz);
    v.project(camera);
    if (v.z >= 1 || v.z <= -1) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = (v.x * 0.5 + 0.5) * rect.width;
    const y = (-v.y * 0.5 + 0.5) * rect.height;
    const el = document.createElement('div');
    const variantClass = variant ? ` ${variant}` : '';
    el.className = jackpot ? `float-pop jackpot${variantClass}` : `float-pop${variantClass}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    fxLayer.appendChild(el);
    el.addEventListener(
      'animationend',
      () => {
        el.remove();
      },
      { once: true },
    );
  }

  function mergeComboMultBeforeBump() {
    const now = performance.now();
    if (now - lastMergeAtMs > COMBO_CHAIN_SEC * 1000) comboChain = 0;
    return Math.min(COMBO_MAX_MULT, 1 + comboChain * COMBO_MULT_PER_TIER);
  }

  function bumpMergeCombo() {
    const now = performance.now();
    if (now - lastMergeAtMs > COMBO_CHAIN_SEC * 1000) comboChain = 0;
    comboChain += 1;
    lastMergeAtMs = now;
    emitHud();
  }

  function queueHitPause(duration = 0.05) {
    hitPause = Math.max(hitPause, duration);
  }

  function effectiveDropVy() {
    const extra = Math.min(DROP_VY_LEVEL_CAP, level * DROP_VY_PER_LEVEL);
    return physicsTuning.dropVy * (1 + extra);
  }

  function addScore(delta) {
    if (delta <= 0) return;
    score += delta;
    levelProgress += delta;
    if (score > bestScore) {
      bestScore = score;
      writeBestScore(modeSpec.id, bestScore);
    }
    let leveled = false;
    while (levelProgress >= levelScoreGoal) {
      levelProgress -= levelScoreGoal;
      level += 1;
      const hardScale = mode === 'atoms' ? 0.06 : 0;
      const hardAdd = mode === 'atoms' ? 24 : 0;
      levelScoreGoal = Math.floor(
        levelScoreGoal * (LEVEL_GOAL_SCALE + hardScale) + LEVEL_GOAL_ADD + hardAdd,
      );
      leveled = true;
    }
    emitHud();
    if (leveled) {
      Sfx.playLevelUp();
      onToast(t('game.levelUnlocked', { level }), 'accent', 'center');
    }
  }

  function moleculeFusionUnlocked() {
    if (mode !== 'atoms') return false;
    const unlockLevel = MOLECULE_UNLOCK_LEVEL ?? 5;
    const unlockDiscovered = MOLECULE_UNLOCK_DISCOVERED ?? 10;
    return level >= unlockLevel || discoveredCount() >= unlockDiscovered;
  }

  function atomSymbolByNumber(atomicNumber) {
    return atomSpecByNumber.get(atomicNumber)?.symbol ?? `Z${atomicNumber}`;
  }

  function summarizeMoleculeAtoms(inputs) {
    const byAtomic = new Map();
    for (const atomic of inputs ?? []) byAtomic.set(atomic, (byAtomic.get(atomic) ?? 0) + 1);
    return [...byAtomic.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 7)
      .map(([atomicNumber, count]) => {
        const spec = atomSpecByNumber.get(atomicNumber);
        return {
          atomicNumber,
          symbol: spec?.symbol ?? `Z${atomicNumber}`,
          color: spec?.color ?? 0xffffff,
          count,
        };
      });
  }

  function findNearMoleculeHint() {
    if (mode !== 'atoms' || !moleculeFusionUnlocked()) return null;
    if (!Array.isArray(MOLECULE_RECIPES) || MOLECULE_RECIPES.length === 0) return null;
    const nextType = dropQueue[0];
    const nextSpec = FRUITS[nextType];
    const nextAtomic = nextSpec?.atomicNumber;
    if (!nextAtomic) return null;
    const levelNow = level;
    const discoveredNow = discoveredCount();

    const haveCounts = new Map();
    for (const f of fruits) {
      const z = FRUITS[f.type]?.atomicNumber;
      if (!z) continue;
      haveCounts.set(z, (haveCounts.get(z) ?? 0) + 1);
    }

    let best = null;
    for (const recipe of MOLECULE_RECIPES) {
      if ((recipe.unlockLevel ?? 1) > levelNow) continue;
      if ((recipe.unlockDiscovered ?? 0) > discoveredNow) continue;
      const need = new Map();
      for (const z of recipe.inputs ?? []) need.set(z, (need.get(z) ?? 0) + 1);
      if (need.size === 0) continue;

      let missingTotal = 0;
      for (const [z, req] of need.entries()) {
        const have = haveCounts.get(z) ?? 0;
        missingTotal += Math.max(0, req - have);
      }
      if (missingTotal !== 1) continue;

      const reqNext = need.get(nextAtomic) ?? 0;
      const haveNext = haveCounts.get(nextAtomic) ?? 0;
      if (reqNext <= haveNext) continue;

      const scoreHint = (recipe.inputs?.length ?? 0) * 100 + (recipe.points ?? 0);
      if (!best || scoreHint > best.scoreHint) {
        best = { recipe, scoreHint };
      }
    }
    return best?.recipe ?? null;
  }

  function maybeEmitMoleculeHint(dt) {
    if (mode !== 'atoms' || gameOver) return;
    if (!moleculeFusionUnlocked()) return;
    moleculeHintCd = Math.max(0, moleculeHintCd - dt);
    if (moleculeHintCd > 0) return;
    const recipe = findNearMoleculeHint();
    if (!recipe) return;
    const nextSpec = FRUITS[dropQueue[0]];
    const nextSymbol = nextSpec?.symbol ?? '?';
    const hintKey = `${recipe.id}:${nextSymbol}`;
    if (hintKey === lastMoleculeHintKey) {
      moleculeHintCd = 2.6;
      return;
    }
    lastMoleculeHintKey = hintKey;
    onToast(`${recipe.formula} • drop ${nextSymbol} for bonus`, 'accent');
    moleculeHintCd = 4.4;
  }

  function applyPhysicsTuning() {
    applyPhysicsTuningToBodies(fruits);
  }

  function relaxPileOverlaps() {
    if (mode !== 'atoms' || fruits.length < 2) return;
    let touchedAny = false;
    for (let pass = 0; pass < 2; pass += 1) {
      let touched = false;
      for (let i = 0; i < fruits.length; i += 1) {
        const a = fruits[i];
        const ra = FRUITS[a.type].radius;
        for (let j = i + 1; j < fruits.length; j += 1) {
          const b = fruits[j];
          const rb = FRUITS[b.type].radius;
          const minDist = ra + rb;
          const dx = a.body.position.x - b.body.position.x;
          const dy = a.body.position.y - b.body.position.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= minDist * minDist * 0.998) continue;

          const dist = Math.max(0.0001, Math.sqrt(d2));
          const overlap = minDist - dist;
          if (overlap <= 0.0015) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          const invA = a.body.invMass ?? 0;
          const invB = b.body.invMass ?? 0;
          const invSum = invA + invB;
          if (invSum <= 0) continue;
          const wa = invA / invSum;
          const wb = invB / invSum;
          const push = Math.min(0.06, overlap * 0.8);
          const up = Math.max(0.24, ny);

          a.body.position.x += nx * push * wa * 0.78;
          a.body.position.y += up * push * wa * 1.02;
          b.body.position.x -= nx * push * wb * 0.78;
          b.body.position.y -= up * push * wb * 1.02;

          const limA = playfield.innerHalfXForRadius(ra);
          const limB = playfield.innerHalfXForRadius(rb);
          a.body.position.x = Math.max(-limA, Math.min(limA, a.body.position.x));
          b.body.position.x = Math.max(-limB, Math.min(limB, b.body.position.x));
          a.body.position.y = Math.max(ra - 0.02, a.body.position.y);
          b.body.position.y = Math.max(rb - 0.02, b.body.position.y);

          a.body.velocity.x *= 0.84;
          b.body.velocity.x *= 0.84;
          a.body.velocity.y = Math.min(a.body.velocity.y, 0.32);
          b.body.velocity.y = Math.min(b.body.velocity.y, 0.32);
          if (Math.abs(a.body.velocity.x) < 0.04) a.body.velocity.x = 0;
          if (Math.abs(b.body.velocity.x) < 0.04) b.body.velocity.x = 0;
          touched = true;
        }
      }
      touchedAny ||= touched;
      if (!touched) break;
    }
    if (!touchedAny) return;
    for (const fruit of fruits) {
      fruit.root.position.copy(fruit.body.position);
    }
  }

  function spawnFruit(type, x, y, z, options = {}) {
    const spec = FRUITS[type];
    const radius = spec.radius;
    const clamped = playfield.clampDropXZ(x, z, radius);
    const visual = modeSpec.createVisual(type, radius, {});
    const body = new CANNON.Body({
      mass: massForFruitSpec(spec) * (mode === 'atoms' ? 0.58 : 1),
      linearDamping: physicsTuning.linearDamping,
      angularDamping: physicsTuning.angularDamping,
      material: physicsMaterial,
    });
    body.addShape(new CANNON.Sphere(radius));
    body.position.set(clamped.x, y, ROW_Z);
    body.sleepSpeedLimit = physicsTuning.sleepSpeedLimit;
    body.sleepTimeLimit = physicsTuning.sleepTimeLimit;
    if (mode === 'atoms') {
      // Keep atom textures visibly alive; atoms feel better with a gentle spin.
      body.angularDamping = Math.max(0.5, physicsTuning.angularDamping + 0.22);
      body.angularVelocity.set((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.7, 0);
    }
    world.addBody(body);
    scene.add(visual.root);
    visual.root.position.copy(body.position);
    visual.rotationTarget.quaternion.copy(body.quaternion);
    const entry = {
      ...visual,
      body,
      type,
      fusionT: options.fusionPop ? 0 : null,
      fusionDur: options.fusionPop ? 0.68 : null,
    };
    fruits.push(entry);

    if (mode === 'atoms') {
      const discovery = touchDiscoveredAtomicNumber(spec.atomicNumber);
      emitCollectionSnapshot();
      if (discovery.firstEver) {
        onToast(t('game.newElement', { symbol: atomName(spec) }), 'success');
      }
    }
  }

  function removeFruit(entry) {
    world.removeBody(entry.body);
    scene.remove(entry.root);
    entry.dispose();
    const index = fruits.indexOf(entry);
    if (index >= 0) fruits.splice(index, 1);
  }

  function beginJackpotVanish(entry) {
    world.removeBody(entry.body);
    const index = fruits.indexOf(entry);
    if (index >= 0) fruits.splice(index, 1);
    jackpotVanishes.push({
      entry,
      t: 0,
      dur: 0.22,
      baseEmissive: entry.glowTarget.material?.emissiveIntensity ?? 0.05,
    });
  }

  function updateJackpotVanishes(dt) {
    for (let i = jackpotVanishes.length - 1; i >= 0; i -= 1) {
      const vanish = jackpotVanishes[i];
      vanish.t += dt;
      const u = Math.min(1, vanish.t / vanish.dur);
      const scale = Math.max(0.0001, 1 - u);
      vanish.entry.root.scale.setScalar(scale);
      if (typeof vanish.entry.glowTarget.material?.emissiveIntensity === 'number') {
        vanish.entry.glowTarget.material.emissiveIntensity = vanish.baseEmissive + 0.8 * u;
      }
      if (u >= 1) {
        scene.remove(vanish.entry.root);
        vanish.entry.dispose();
        jackpotVanishes.splice(i, 1);
      }
    }
  }

  function disposeMoleculeEntity(entry) {
    scene.remove(entry.group);
    entry.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
    });
    entry.coreMat?.dispose?.();
    entry.haloMat?.dispose?.();
    entry.labelMat?.dispose?.();
    entry.labelTex?.dispose?.();
  }

  function createFormulaLabel(formula, colorHex) {
    const w = 384;
    const h = 192;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx2d = canvas.getContext('2d');
    const color = `#${new THREE.Color(colorHex).getHexString()}`;

    ctx2d.clearRect(0, 0, w, h);
    ctx2d.fillStyle = 'rgba(8, 20, 34, 0.62)';
    ctx2d.strokeStyle = 'rgba(255,255,255,0.26)';
    ctx2d.lineWidth = 4;
    const r = 34;
    ctx2d.beginPath();
    ctx2d.moveTo(r, 18);
    ctx2d.lineTo(w - r, 18);
    ctx2d.quadraticCurveTo(w - 18, 18, w - 18, r);
    ctx2d.lineTo(w - 18, h - r);
    ctx2d.quadraticCurveTo(w - 18, h - 18, w - r, h - 18);
    ctx2d.lineTo(r, h - 18);
    ctx2d.quadraticCurveTo(18, h - 18, 18, h - r);
    ctx2d.lineTo(18, r);
    ctx2d.quadraticCurveTo(18, 18, r, 18);
    ctx2d.closePath();
    ctx2d.fill();
    ctx2d.stroke();
    ctx2d.fillStyle = color;
    ctx2d.font = '900 88px "Arial Black", Arial, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText(formula, w * 0.5, h * 0.54);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.2, 1.1, 1);
    return { sprite, tex, mat };
  }

  function spawnMoleculeEntity(recipe, x, y, { sourceCount = 3 } = {}) {
    if (mode !== 'atoms') return;
    const radius = 0.44 + Math.min(1.12, Math.sqrt(Math.max(2, sourceCount)) * 0.24);
    const color = recipe.color ?? 0x7bdfff;

    const group = new THREE.Group();
    const coreMat = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.02,
      roughness: 0.12,
      transmission: 0.86,
      thickness: 1.2,
      clearcoat: 0.84,
      clearcoatRoughness: 0.06,
      emissive: color,
      emissiveIntensity: 0.3,
      envMapIntensity: 1.15,
      transparent: true,
      opacity: 0.96,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 34, 28), coreMat);
    const haloMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.34, 24, 20), haloMat);
    const { sprite, tex: labelTex, mat: labelMat } = createFormulaLabel(recipe.formula, color);
    sprite.position.set(0, radius * 1.6, 0.2);

    group.add(halo);
    group.add(core);
    group.add(sprite);
    group.position.set(x, y + radius * 0.75, ROW_Z + 0.1);
    group.renderOrder = 22;
    scene.add(group);

    moleculeEntities.push({
      group,
      core,
      coreMat,
      halo,
      haloMat,
      label: sprite,
      labelTex,
      labelMat,
      radius,
      baseY: group.position.y,
      t: 0,
      dur: 2.5,
    });
  }

  function updateMoleculeEntities(dt) {
    for (let i = moleculeEntities.length - 1; i >= 0; i -= 1) {
      const item = moleculeEntities[i];
      item.t += dt;
      const u = Math.min(1, item.t / item.dur);
      const pulse = 1 + Math.sin(item.t * 7.8) * 0.06;
      item.group.rotation.y += dt * (0.9 + item.radius * 0.32);
      item.group.position.y = item.baseY + Math.sin(item.t * 2.35) * 0.09 + u * 0.36;
      item.core.scale.setScalar(pulse);
      item.halo.scale.setScalar(1.02 + Math.sin(item.t * 5.4) * 0.08);
      item.label.position.y = item.radius * 1.62 + Math.sin(item.t * 3.8) * 0.04;

      const fade = 1 - Math.max(0, (u - 0.64) / 0.36);
      item.coreMat.opacity = 0.96 * fade;
      item.haloMat.opacity = 0.2 * fade;
      item.labelMat.opacity = fade;
      item.coreMat.emissiveIntensity = 0.24 + (1 - u) * 0.22;

      if (u >= 1) {
        disposeMoleculeEntity(item);
        moleculeEntities.splice(i, 1);
      }
    }
  }

  function buildPreviewEntry(type, previewIndex) {
    const scale = previewIndex === 0 ? 1 : QUEUE_STRIP_SCALE;
    const visual = modeSpec.createVisual(type, FRUITS[type].radius * scale, {
      ghost: previewIndex === 0,
    });
    queuePreviewGroup.add(visual.root);
    queuePreviewEntries[previewIndex] = { ...visual, type };
  }

  function clearPreviewEntry(entry) {
    queuePreviewGroup.remove(entry.root);
    entry.dispose();
  }

  function refillDropQueue() {
    while (dropQueue.length < DROP_QUEUE_SIZE) dropQueue.push(modeSpec.rollDropType(level));
  }

  function syncDropQueuePreviews() {
    refillDropQueue();
    for (let i = queuePreviewEntries.length - 1; i >= DROP_QUEUE_SIZE; i -= 1) {
      const extra = queuePreviewEntries[i];
      if (extra) clearPreviewEntry(extra);
      queuePreviewEntries.splice(i, 1);
    }
    for (let i = 0; i < DROP_QUEUE_SIZE; i += 1) {
      const type = dropQueue[i];
      const existing = queuePreviewEntries[i];
      if (existing && existing.type === type) continue;
      if (existing) clearPreviewEntry(existing);
      buildPreviewEntry(type, i);
    }
    emitHud();
  }

  function layoutQueuePreviewMeshes() {
    const active = queuePreviewEntries[0];
    if (active) active.root.position.copy(ghostPos);

    const innerLeft = -(CUP.halfX - CUP.wallT);
    let radiusMax = 0.18;
    for (let i = 1; i <= QUEUE_STRIP_VISIBLE; i += 1) {
      const entry = queuePreviewEntries[i];
      if (!entry) continue;
      const r = FRUITS[entry.type].radius * QUEUE_STRIP_SCALE;
      radiusMax = Math.max(radiusMax, r);
    }
    const yTop = orthoLayout.state.orthoMidY + orthoLayout.getOrthoAhHalf();
    // Keep queue balls clearly visible inside the cup on tall mobile ratios.
    // Previous top-frustum anchoring could clip them at the very top edge.
    const yRowByFrustum = yTop - radiusMax - QUEUE_TOP_BAND - 0.28;
    const yRowByCup = CUP.wallH - radiusMax - 0.22;
    const yRowByDropLane = DROP_CENTER_Y - radiusMax * 0.28;
    const yRow = Math.min(yRowByFrustum, yRowByCup, yRowByDropLane);
    let cursor = innerLeft + 0.18;
    for (let i = QUEUE_STRIP_VISIBLE; i >= 1; i -= 1) {
      const entry = queuePreviewEntries[i];
      if (!entry) continue;
      const r = FRUITS[entry.type].radius * QUEUE_STRIP_SCALE;
      cursor += r;
      entry.root.position.set(cursor, yRow, GHOST_Z);
      cursor += r + QUEUE_STRIP_LANE;
    }
  }

  function spawnQueueSweep(type, fromPos, toPos) {
    if (!fromPos || !toPos || !Number.isFinite(type)) return;
    const visual = modeSpec.createVisual(type, FRUITS[type].radius, { ghost: true });
    visual.root.position.copy(fromPos);
    visual.root.scale.setScalar(Math.max(0.36, QUEUE_STRIP_SCALE));
    visual.root.renderOrder = 18;
    scene.add(visual.root);
    queueSweepEntries.push({
      ...visual,
      from: fromPos.clone(),
      to: toPos.clone(),
      t: 0,
      dur: 0.17,
    });
  }

  function updateQueueSweep(dt) {
    for (let i = queueSweepEntries.length - 1; i >= 0; i -= 1) {
      const entry = queueSweepEntries[i];
      entry.t += dt;
      const u = Math.min(1, entry.t / entry.dur);
      const eased = 1 - (1 - u) * (1 - u) * (1 - u);
      entry.root.position.lerpVectors(entry.from, entry.to, eased);
      const sweepScale = QUEUE_STRIP_SCALE + (1 - QUEUE_STRIP_SCALE) * eased;
      entry.root.scale.setScalar(sweepScale);
      if (u >= 1) {
        scene.remove(entry.root);
        entry.dispose();
        queueSweepEntries.splice(i, 1);
      }
    }
  }

  function pendingDropType() {
    refillDropQueue();
    return dropQueue[0];
  }

  function updateGhostAt(clientX, clientY) {
    const type = pendingDropType();
    const spec = FRUITS[type];
    const worldX = worldXFromPointer(clientX, clientY, camera, canvasEl, DROP_CENTER_Y);
    const clamped = playfield.clampDropXZ(worldX, ROW_Z, spec.radius);
    ghostPos.set(clamped.x, DROP_CENTER_Y, GHOST_Z);
    layoutQueuePreviewMeshes();
  }

  function dropNext() {
    if (gameOver) return;
    const now = performance.now();
    if (now - lastDropTime < DROP_COOLDOWN_MS) return;
    lastDropTime = now;
    const queuedNext = dropQueue[1];
    const queuedNextPos = queuePreviewEntries[1]?.root.position.clone() ?? null;
    const type = pendingDropType();
    const spec = FRUITS[type];
    const clamped = playfield.clampDropXZ(ghostPos.x, ROW_Z, spec.radius);
    spawnFruit(type, clamped.x, DROP_CENTER_Y, ROW_Z);
    const last = fruits[fruits.length - 1];
    last.body.velocity.set(0, -effectiveDropVy(), 0);
    addScore(mode === 'atoms' ? 1 : 2);
    Sfx.playDrop();
    dropQueue.shift();
    dropQueue.push(modeSpec.rollDropType(level));
    syncDropQueuePreviews();
    if (queuedNextPos && Number.isFinite(queuedNext)) {
      spawnQueueSweep(queuedNext, queuedNextPos, ghostPos);
    }
  }

  function checkGameOver(dt) {
    if (gameOver) return;
    let over = false;
    for (const fruit of fruits) {
      const radius = FRUITS[fruit.type].radius;
      const top = fruit.body.position.y + radius;
      const vy = fruit.body.velocity.y;
      // Ignore transient launch spikes; only sustained pile contact should trigger game-over.
      if (top >= GAME_OVER_Y && vy < 0.52) {
        over = true;
        break;
      }
    }
    if (over) {
      gameOverDwell += dt;
      if (gameOverDwell >= GAME_OVER_DWELL_SEC) {
        gameOver = true;
        Sfx.playGameOver();
        onGameOver({
          open: true,
          score,
          level,
          title: modeSpec.title,
          summary:
            mode === 'atoms'
              ? t('game.elementsDiscovered', { count: discoveredCount() })
              : t('game.comboPeak', { count: comboChain }),
        });
      }
    } else {
      gameOverDwell = 0;
    }
  }

  function fullReset() {
    if (mode === 'atoms' && atomPlaySecAcc > 0) {
      addAtomPlaySeconds(atomPlaySecAcc);
      atomPlaySecAcc = 0;
    }
    while (fruits.length) removeFruit(fruits[0]);
    while (jackpotVanishes.length) {
      const vanish = jackpotVanishes.pop();
      scene.remove(vanish.entry.root);
      vanish.entry.dispose();
    }
    while (moleculeEntities.length) {
      const item = moleculeEntities.pop();
      disposeMoleculeEntity(item);
    }
    while (queuePreviewEntries.length) {
      const entry = queuePreviewEntries.pop();
      if (entry) clearPreviewEntry(entry);
    }
    while (queueSweepEntries.length) {
      const entry = queueSweepEntries.pop();
      scene.remove(entry.root);
      entry.dispose();
    }
    dropQueue.length = 0;
    mergeCooldown = 0;
    score = 0;
    levelProgress = 0;
    level = 1;
    levelScoreGoal = LEVEL_GOAL_START;
    gameOver = false;
    gameOverDwell = 0;
    comboChain = 0;
    lastMergeAtMs = 0;
    hitPause = 0;
    heartbeatAcc = 0;
    panic = 0;
    lastDropTime = 0;
    cancelVibration();
    onGameOver({ open: false });
    if (fxLayer) fxLayer.replaceChildren();
    playfield.applyCupLayout();
    applyPhysicsTuning();
    syncDropQueuePreviews();
    const center = orthoLayout.canvasCenterClient();
    updateGhostAt(center.x, center.y);
    emitHud();
  }

  const tryMerge = createTryMerge(
    {
      getGameOver: () => gameOver,
      getMergeCooldown: () => mergeCooldown,
      setMergeCooldown: (n) => {
        mergeCooldown = n;
      },
      juice,
      getFruits: () => fruits,
      removeFruit,
      spawnFruit,
      innerHalfXForRadius: playfield.innerHalfXForRadius,
      ROW_Z,
      FRUITS,
      MERGE_POINTS,
      MERGEABLE_TYPE_MAX,
      MERGE_DIST_MULT,
      JACKPOT_MERGE_DIST_MULT,
      COMBO_CHAIN_SEC,
      physicsTuning,
      mergeComboMultBeforeBump,
      bumpMergeCombo,
      queueHitPause,
      beginJackpotVanish,
      addScore,
      popFloatText,
      flashHudMerge: () => {},
      scoreEl: null,
      Sfx,
      vibrateJackpot,
      vibrateMerge,
      lastMergeAtMs: () => lastMergeAtMs,
      comboChain: () => comboChain,
      MOLECULE_RECIPES,
      MOLECULE_DETECT_DIST_MULT,
      getMoleculeFusionUnlocked: moleculeFusionUnlocked,
      getLevel: () => level,
      getDiscoveredCount: () => discoveredCount(),
      spawnMoleculeEntity,
      onMoleculeFusion: ({ recipe, points }) => {
        const moleculeDiscovery = touchDiscoveredMoleculeId(recipe.id);
        emitCollectionSnapshot();
        onInfo(`${recipe.name} (${recipe.formula}) - ${recipe.fact}`);
        onMolecule({
          recipe,
          points,
          firstEver: moleculeDiscovery.firstEver,
          atoms: summarizeMoleculeAtoms(recipe.inputs),
        });
        if (moleculeDiscovery.firstEver) {
          onToast(t('game.moleculeUnlocked', { formula: recipe.formula }), 'success');
        } else {
          onToast(`+${points} ${recipe.formula}`, 'accent');
        }
      },
    },
    {
      mergeResult: 'nextTier',
      vfxLevel: 'normal',
      jackpotFloatTier: (points) => modeSpec.jackpotText(points),
      onJackpotTierExtra: () => {
        onToast(t('game.jackpotMerge'), 'success');
      },
      onNormalMergeUi: (points, newType, nx, ny, spec) => {
        popFloatText(modeSpec.mergeFloat(points, spec), nx, ny + spec.radius * 0.42, ROW_Z + 0.48, {
          color: `#${new THREE.Color(spec.color).getHexString()}`,
          variant: mode === 'atoms' ? 'atom' : mode === 'numbers' ? 'number' : 'fruit',
        });
        const toast = modeSpec.mergeToast(newType, spec);
        if (toast) onInfo(toast);
      },
    },
  );

  function onViewportChange() {
    playfield.applyCupLayout();
    layoutQueuePreviewMeshes();
    const center = orthoLayout.canvasCenterClient();
    updateGhostAt(center.x, center.y);
  }

  let aimPointerId = null;

  listen(document.body, 'pointerdown', () => Sfx.resume(), { passive: true });
  listen(canvasEl, 'pointermove', (e) => updateGhostAt(e.clientX, e.clientY), { passive: true });
  listen(canvasEl, 'pointerenter', (e) => updateGhostAt(e.clientX, e.clientY), { passive: true });
  listen(canvasEl, 'pointerdown', (e) => {
    if (gameOver || e.button !== 0) return;
    aimPointerId = e.pointerId;
    try {
      canvasEl.setPointerCapture(e.pointerId);
    } catch {}
    updateGhostAt(e.clientX, e.clientY);
  });
  const finishAimPointer = (e, doDrop) => {
    if (aimPointerId === null || e.pointerId !== aimPointerId) return;
    aimPointerId = null;
    try {
      canvasEl.releasePointerCapture(e.pointerId);
    } catch {}
    if (doDrop && !gameOver) {
      updateGhostAt(e.clientX, e.clientY);
      dropNext();
    }
  };
  listen(canvasEl, 'pointerup', (e) => finishAimPointer(e, true));
  listen(canvasEl, 'pointercancel', (e) => finishAimPointer(e, false));
  listen(window, 'resize', onViewportChange);
  listen(document, 'fullscreenchange', onViewportChange);
  if (window.visualViewport) {
    listen(window.visualViewport, 'resize', onViewportChange);
    listen(window.visualViewport, 'scroll', onViewportChange);
  }
  listen(window, 'keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') fullReset();
    if ((e.key === 'm' || e.key === 'M') && !e.repeat) {
      muted = Sfx.toggleMuted();
      emitHud();
    }
  });

  const timer = new THREE.Timer();
  timer.connect(document);
  timer.reset();
  let acc = 0;
  const fixed = 1 / 120;
  const PHYS_SUBSTEPS = 4;

  function tick(timestamp) {
    if (destroyed) return;
    rafId = requestAnimationFrame(tick);
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    if (mode === 'atoms' && !gameOver) {
      atomPlaySecAcc += dt;
      if (atomPlaySecAcc >= 8) {
        addAtomPlaySeconds(atomPlaySecAcc);
        atomPlaySecAcc = 0;
      }
    }

    if (hitPause > 0) {
      hitPause -= dt;
      renderer.render(scene, camera);
      return;
    }

    if (!gameOver) {
      acc += dt;
      while (acc >= fixed) {
        const step = fixed / PHYS_SUBSTEPS;
        for (let i = 0; i < PHYS_SUBSTEPS; i += 1) world.step(step);
        acc -= fixed;
      }
      tryMerge();
    }

    if (mergeCooldown > 0) mergeCooldown -= 1;

    for (const fruit of fruits) {
      fruit.body.position.z = ROW_Z;
      fruit.body.velocity.z = 0;
      const maxSideVel = 2.35;
      const maxUpVel = 0.82;
      const maxDownVel = 14.2;
      fruit.body.velocity.x = Math.max(-maxSideVel, Math.min(maxSideVel, fruit.body.velocity.x));
      fruit.body.velocity.y = Math.max(-maxDownVel, Math.min(maxUpVel, fruit.body.velocity.y));
      const radius = FRUITS[fruit.type].radius;
      const limit = playfield.innerHalfXForRadius(radius);
      if (fruit.body.position.x > limit) {
        fruit.body.position.x = limit;
        fruit.body.velocity.x *= -physicsTuning.wallVelRetain;
      } else if (fruit.body.position.x < -limit) {
        fruit.body.position.x = -limit;
        fruit.body.velocity.x *= -physicsTuning.wallVelRetain;
      }
      const minY = radius - 0.02;
      if (fruit.body.position.y < minY) {
        fruit.body.position.y = minY;
        fruit.body.velocity.y = Math.max(0, fruit.body.velocity.y);
      }
      const nearFloor = fruit.body.position.y <= minY + Math.max(0.03, radius * 0.05);
      if (nearFloor) {
        const floorVelDamp = mode === 'atoms' ? 0.62 : 0.78;
        const floorAngDamp = mode === 'atoms' ? 0.58 : 0.72;
        fruit.body.velocity.x *= floorVelDamp;
        fruit.body.angularVelocity.x *= floorAngDamp;
        fruit.body.angularVelocity.y *= floorAngDamp;
        fruit.body.angularVelocity.z *= floorAngDamp;
        if (Math.abs(fruit.body.velocity.x) < (mode === 'atoms' ? 0.06 : 0.04)) fruit.body.velocity.x = 0;
        if (Math.abs(fruit.body.velocity.y) < (mode === 'atoms' ? 0.1 : 0.08)) fruit.body.velocity.y = 0;
        const v2 =
          fruit.body.velocity.x * fruit.body.velocity.x +
          fruit.body.velocity.y * fruit.body.velocity.y;
        const w2 =
          fruit.body.angularVelocity.x * fruit.body.angularVelocity.x +
          fruit.body.angularVelocity.y * fruit.body.angularVelocity.y +
          fruit.body.angularVelocity.z * fruit.body.angularVelocity.z;
        const sleepV2 = mode === 'atoms' ? 0.0054 : 0.0024;
        const sleepW2 = mode === 'atoms' ? 0.85 : 0.35;
        if (v2 < sleepV2 && w2 < sleepW2 && fruit.body.sleepState === 0) {
          fruit.body.sleep();
        }
      }
      const topSoftCap = GAME_OVER_Y + radius * 1.24;
      if (fruit.body.position.y > topSoftCap) {
        fruit.body.position.y = topSoftCap;
        fruit.body.velocity.y = Math.min(fruit.body.velocity.y, 0.18);
      }
      fruit.root.position.copy(fruit.body.position);
      fruit.rotationTarget.quaternion.copy(fruit.body.quaternion);
      if (fruit.fusionDur != null) {
        fruit.fusionT += dt;
        const u = Math.min(1, fruit.fusionT / fruit.fusionDur);
        const squash = u < 0.22 ? 1 - u * 0.26 : 0.94 + Math.sin(u * Math.PI) * 0.12;
        const stretch = u < 0.22 ? 1 + u * 0.42 : 1.06 - (u - 0.22) * 0.08;
        fruit.root.scale.set(squash, stretch, squash);
        if (u >= 1) {
          fruit.fusionDur = null;
          fruit.root.scale.setScalar(1);
        }
      }
    }
    relaxPileOverlaps();

    updateJackpotVanishes(dt);
    updateMoleculeEntities(dt);
    maybeEmitMoleculeHint(dt);
    updateQueueSweep(dt);
    layoutQueuePreviewMeshes();

    const stress = juice.computePileStress(fruits, FRUITS, GAME_OVER_Y, DANGER_PULSE_BAND);
    panic = stress;
    if (playfield.dangerLine) {
      juice.updateDangerLine(playfield.dangerLine, stress, performance.now() / 1000);
    }
    if (!gameOver && stress > 0.42) {
      heartbeatAcc += dt;
      if (heartbeatAcc >= Math.max(0.22, 0.9 - stress * 0.55)) {
        heartbeatAcc = 0;
        Sfx.playHeartbeat(stress);
      }
    } else {
      heartbeatAcc = 0;
    }

    checkGameOver(dt);
    juice.updateParticles(dt);
    renderer.render(scene, camera);
    emitHud();
  }

  playfield.applyCupLayout();
  applyPhysicsTuning();
  syncDropQueuePreviews();
  const center = orthoLayout.canvasCenterClient();
  updateGhostAt(center.x, center.y);
  emitHud();
  if (mode === 'atoms') {
    emitCollectionSnapshot();
  }
  tick();

  return {
    restart() {
      Sfx.resume();
      fullReset();
    },
    toggleMuted() {
      muted = Sfx.toggleMuted();
      emitHud();
      return muted;
    },
    getMuted() {
      return muted;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      cancelVibration();
      listeners.splice(0).forEach((off) => off());
      if (mode === 'atoms' && atomPlaySecAcc > 0) {
        addAtomPlaySeconds(atomPlaySecAcc);
        atomPlaySecAcc = 0;
      }
      fullReset();
      renderer.dispose();
      timer.dispose();
      if (scene.environment?.userData?.pmremTarget) {
        scene.environment.userData.pmremTarget.dispose?.();
      }
      host.replaceChildren();
    },
  };
}
