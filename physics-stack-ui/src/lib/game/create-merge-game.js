import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createPhysicsWorld, physicsTuning, applyPhysicsPreset } from './physics.js';
import { attachSceneBackground, createRendererAndCamera, addDefaultLights, aimKeyLightAt } from './render.js';
import { syncHudRowToPlayfieldX } from './hud-playfield-align.js';
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
import { formatChemicalFormula } from './chem-format.js';
import { setActiveAtomElements } from './config-atoms.js';
import {
  buildAtomWorldRuntimeConfig,
  getAtomWorld,
  getAtomWorldPhysics,
  recordAtomWorldRun,
  resolvePlayableAtomWorldId,
  rollAtomWorldDropType,
} from './atom-worlds.js';
import {
  ATOM_PHYSICS_PRESETS,
  ATOM_PHYSICS_DEFAULT_PRESET,
  ATOM_PHYSICS_LS_KEY,
  ATOM_PHYSICS_BROADCAST_CHANNEL,
  sanitizeAtomPhysicsLabPayload,
  isAtomPresetName,
} from './atom-physics-lab.js';
import {
  ATOM_VISUAL_LAB_LS_KEY,
  ATOM_VISUAL_LAB_BROADCAST_CHANNEL,
  ATOM_FX_PREVIEW_BROADCAST_CHANNEL,
  sanitizeAtomVisualLabState,
  resolveFxConfig,
  resolveFxProfileById,
} from './atom-visual-lab.js';
import {
  discoveredCount,
  touchDiscoveredAtomicNumber,
  newUnlocksTodayCount,
  discoveredMoleculeCount,
  touchDiscoveredMoleculeId,
} from './atoms-discovery.js';
import { t } from '../app-i18n';

const BEST_SCORE_PREFIX = 'physics-stack-best-v1:';
const RUN_STATE_PREFIX = 'physics-stack-run-v1:';
const RUN_STATE_VERSION = 3;
const ATOM_COLLISION_SCALE = 1.08;

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

function runStateKey(modeId) {
  return `${RUN_STATE_PREFIX}${modeId}`;
}

export function createMergeGame(opts) {
  const {
    host,
    mode,
    worldId = null,
    fxLayer,
    onHud = () => {},
    onToast = () => {},
    onInfo = () => {},
    onMolecule = () => {},
    onGameOver = () => {},
    onCollection = () => {},
    onWorldProgress = () => {},
  } = opts;

  const modeSpec = getModeSpec(mode);
  const atomWorldId = mode === 'atoms' ? resolvePlayableAtomWorldId(worldId) : null;
  const atomWorld = mode === 'atoms' ? getAtomWorld(atomWorldId) : null;
  const runtimeConfig =
    mode === 'atoms' ? buildAtomWorldRuntimeConfig(modeSpec.config, atomWorldId) : modeSpec.config;
  if (mode === 'atoms') {
    setActiveAtomElements(runtimeConfig.FRUITS);
  }
  const isLikelyMobile =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 1100));
  const lowPerfDevice =
    isLikelyMobile ||
    (typeof navigator !== 'undefined' &&
      Number.isFinite(navigator.hardwareConcurrency) &&
      navigator.hardwareConcurrency <= 6);
  const {
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
  } = runtimeConfig;
  const scoreModeKey =
    mode === 'atoms' && atomWorldId ? `${modeSpec.id}:${atomWorldId}` : modeSpec.id;
  const modeTitle = mode === 'atoms' && atomWorld ? `${modeSpec.title} · ${atomWorld.label}` : modeSpec.title;
  let atomPhysicsPreset = mode === 'atoms' ? ATOM_PHYSICS_DEFAULT_PRESET : '';
  const atomWorldPhysics = mode === 'atoms' ? getAtomWorldPhysics(atomWorldId) : null;
  const atomWorldPhysicsOverrides = atomWorldPhysics?.overrides ?? null;
  let atomPhysicsLabSignature = '';
  let atomPhysicsLabChannel = null;
  let atomVisualLabSignature = '';
  let atomVisualLabChannel = null;
  let atomFxPreviewChannel = null;
  let atomVisualLabStateCache = null;

  /** Atoms: pass resolved `FRUITS[type]` into `createVisual` so mesh matches lab config (layers/colors). */
  function atomVisualOpts(type) {
    return mode === 'atoms' && FRUITS[type] ? { spec: FRUITS[type] } : {};
  }

  function applyDeviceAtomPhysicsCaps() {
    physicsTuning.solverIterations = Math.min(physicsTuning.solverIterations, lowPerfDevice ? 72 : 96);
    physicsTuning.contactStiffness6 = Math.min(physicsTuning.contactStiffness6, lowPerfDevice ? 980 : 1200);
    physicsTuning.frictionEqStiffness7 = Math.min(physicsTuning.frictionEqStiffness7, 20);
  }

  function readAtomPhysicsLabPayload() {
    if (mode !== 'atoms') return null;
    try {
      const raw = localStorage.getItem(ATOM_PHYSICS_LS_KEY);
      if (!raw) return null;
      return sanitizeAtomPhysicsLabPayload(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function readAtomVisualLabPayload() {
    if (mode !== 'atoms') return null;
    try {
      const raw = localStorage.getItem(ATOM_VISUAL_LAB_LS_KEY);
      if (!raw) return null;
      return sanitizeAtomVisualLabState(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function applyAtomPhysicsLabPayload(payload, options = {}) {
    if (mode !== 'atoms') return false;
    const clean = sanitizeAtomPhysicsLabPayload(payload);
    if (!clean) return false;
    const signature = JSON.stringify(clean);
    if (!options.force && signature === atomPhysicsLabSignature) return false;
    atomPhysicsLabSignature = signature;

    atomPhysicsPreset = isAtomPresetName(clean.preset) ? clean.preset : ATOM_PHYSICS_DEFAULT_PRESET;
    Object.assign(physicsTuning, ATOM_PHYSICS_PRESETS[atomPhysicsPreset]);
    if (atomWorldPhysicsOverrides) {
      Object.assign(physicsTuning, atomWorldPhysicsOverrides);
    }
    if (clean.enabled !== false) {
      Object.assign(physicsTuning, clean.values);
    }
    applyDeviceAtomPhysicsCaps();

    if (options.applyNow) {
      applyPhysicsTuning();
      if (options.wake) {
        for (const fruit of fruits) {
          if (fruit.body.sleepState === 2) fruit.body.wakeUp();
        }
      }
    }
    return true;
  }

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
    const worldPreset = isAtomPresetName(atomWorldPhysics?.preset)
      ? atomWorldPhysics.preset
      : ATOM_PHYSICS_DEFAULT_PRESET;
    atomPhysicsPreset = worldPreset;
    Object.assign(physicsTuning, ATOM_PHYSICS_PRESETS[atomPhysicsPreset]);
    if (atomWorldPhysicsOverrides) {
      Object.assign(physicsTuning, atomWorldPhysicsOverrides);
    }
    applyDeviceAtomPhysicsCaps();
    const initialLabPayload = readAtomPhysicsLabPayload();
    if (initialLabPayload) {
      applyAtomPhysicsLabPayload(initialLabPayload, { force: true, applyNow: false });
    }
  }

  let destroyed = false;
  let rafId = 0;
  let muted = false;
  let score = 0;
  let bestScore = readBestScore(scoreModeKey);
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
  let nearMergeBondCd = 0;
  let lastNearMergeBondKey = '';
  let lastChemGuideLevel = 0;
  let committedWorldProgress = { level: 0, score: 0 };
  let fpsVisible = false;
  let fpsTextEl = null;
  let fpsSampleSec = 0;
  let fpsSampleFrames = 0;
  let fpsCurrent = 0;

  let CUP = { ...CUP_BASE, wallH: 11 };
  let DROP_CENTER_Y = CUP.wallH - 0.55;
  let GAME_OVER_Y = CUP.wallH - GAME_OVER_BELOW_RIM;

  const listeners = [];
  const fruits = [];
  const collisionFxCooldowns = new Map();
  const jackpotVanishes = [];
  const moleculeEntities = [];
  const queuePreviewEntries = [];
  const queueSweepEntries = [];
  const dropQueue = [];
  const ghostPos = new THREE.Vector3(0, DROP_CENTER_Y, GHOST_Z);
  const QUEUE_STRIP_VISIBLE = 3;
  const QUEUE_PREVIEW_SCALE =
    QUEUE_STRIP_VISIBLE >= 3 ? Math.max(0.42, QUEUE_STRIP_SCALE - 0.1) : QUEUE_STRIP_SCALE;
  const DROP_QUEUE_SIZE = 1 + QUEUE_STRIP_VISIBLE;
  const runStateLsKey = runStateKey(scoreModeKey);
  let saveAcc = 0;

  const scene = new THREE.Scene();
  const backgroundFx = attachSceneBackground(scene, {
    mode,
    worldId: atomWorldId ?? '',
    level,
  });
  const { renderer, camera, canvasEl } = createRendererAndCamera(host);
  canvasEl.classList.add('merge-canvas');
  const juice = createJuice(scene, { overlayRoot: fxLayer });
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
    playfieldBackgroundUrl: backgroundFx?.getCurrentImageUrl?.() ?? '',
  });

  const shell = host?.closest?.('.game-shell') ?? null;
  const topControlsEl = shell?.querySelector?.('.top-controls') ?? null;

  const queuePreviewGroup = new THREE.Group();
  queuePreviewGroup.renderOrder = 14;
  scene.add(queuePreviewGroup);

  const Sfx = createSfx();
  muted = Sfx.getMuted();
  const atomSpecByNumber = new Map(FRUITS.map((spec) => [spec.atomicNumber, spec]));
  const atomTypeByNumber = new Map(FRUITS.map((spec, index) => [spec.atomicNumber, index]));
  let bgCanvasW = 0;
  let bgCanvasH = 0;

  function syncBackgroundSizeToCanvas() {
    const width = Math.max(
      1,
      Math.floor(
        renderer.domElement.width || canvasEl.width || canvasEl.clientWidth || window.innerWidth || 1,
      ),
    );
    const height = Math.max(
      1,
      Math.floor(
        renderer.domElement.height ||
          canvasEl.height ||
          canvasEl.clientHeight ||
          window.innerHeight ||
          1,
      ),
    );
    if (width === bgCanvasW && height === bgCanvasH) return;
    bgCanvasW = width;
    bgCanvasH = height;
    backgroundFx?.resize?.(width, height);
  }

  function rebuildAtomLookups() {
    atomSpecByNumber.clear();
    atomTypeByNumber.clear();
    for (let i = 0; i < FRUITS.length; i += 1) {
      const spec = FRUITS[i];
      atomSpecByNumber.set(spec.atomicNumber, spec);
      atomTypeByNumber.set(spec.atomicNumber, i);
    }
    if (mode === 'atoms') setActiveAtomElements(FRUITS);
  }

  function rebuildFruitVisual(entry) {
    if (!entry || !isValidType(entry.type)) return;
    const drawRadius = FRUITS[entry.type].radius;
    const position = entry.body.position.clone();
    const quat = entry.body.quaternion.clone();
    const oldRoot = entry.root;
    const oldDispose = entry.dispose;
    const visual = modeSpec.createVisual(entry.type, drawRadius, atomVisualOpts(entry.type));
    scene.add(visual.root);
    visual.root.position.copy(position);
    visual.rotationTarget.quaternion.copy(quat);
    scene.remove(oldRoot);
    oldDispose?.();
    entry.root = visual.root;
    entry.rotationTarget = visual.rotationTarget;
    entry.glowTarget = visual.glowTarget;
    entry.spinNodes = visual.spinNodes;
    entry.dispose = visual.dispose;
    entry.collisionRadius = collisionRadiusForType(entry.type);
    const atomMassScale = mode === 'atoms' && usesCalmAtomPreset() ? 0.42 : 0.62;
    entry.body.mass = massForFruitSpec(massSpecForType(entry.type)) * (mode === 'atoms' ? atomMassScale : 1);
    if (entry.body.shapes?.[0]) {
      entry.body.shapes[0].radius = entry.collisionRadius;
      entry.body.updateBoundingRadius();
      entry.body.aabbNeedsUpdate = true;
    }
    entry.body.updateMassProperties();
  }

  function applyAtomVisualLabPayload(payload, options = {}) {
    if (mode !== 'atoms') return false;
    const clean = sanitizeAtomVisualLabState(payload ?? {});
    atomVisualLabStateCache = clean;
    const signature = JSON.stringify(clean);
    if (!options.force && signature === atomVisualLabSignature) return false;
    atomVisualLabSignature = signature;

    const nextRuntime = buildAtomWorldRuntimeConfig(modeSpec.config, atomWorldId, clean);
    if (Array.isArray(nextRuntime.FRUITS) && nextRuntime.FRUITS.length >= 2) {
      FRUITS.splice(0, FRUITS.length, ...nextRuntime.FRUITS);
    }
    if (Array.isArray(nextRuntime.MERGE_POINTS) && nextRuntime.MERGE_POINTS.length > 0) {
      MERGE_POINTS.splice(0, MERGE_POINTS.length, ...nextRuntime.MERGE_POINTS);
    }
    if (Array.isArray(nextRuntime.MOLECULE_RECIPES)) {
      MOLECULE_RECIPES.splice(0, MOLECULE_RECIPES.length, ...nextRuntime.MOLECULE_RECIPES);
    }
    rebuildAtomLookups();
    juice.setFxConfig?.(resolveFxConfig(clean));

    if (options.applyNow) {
      for (const fruit of fruits) rebuildFruitVisual(fruit);
      syncDropQueuePreviews(true);
      layoutQueuePreviewMeshes();
      emitHud();
    }
    return true;
  }

  function runFxPreview(payload) {
    if (mode !== 'atoms' || !payload || typeof payload !== 'object') return;
    const x = 0;
    const y = Math.max(1.8, Math.min(DROP_CENTER_Y - 1.4, 3.2));
    const z = ROW_Z + 0.08;
    const kind = String(payload.kind ?? 'merge').toLowerCase();
    const profile = payload.profile && typeof payload.profile === 'object' ? payload.profile : {};
    const intensity = Math.max(0.2, Math.min(3, Number(payload.intensity) || 1));
    const color = Number.isFinite(payload.color) ? Number(payload.color) : 0x8ed8ff;
    const burstScale = Math.max(0, Math.min(3, Number(profile.burstScale) || 1));
    const sparkScale = Math.max(0, Math.min(3, Number(profile.sparkScale) || 1));
    const dropletScale = Math.max(0, Math.min(3, Number(profile.dropletScale) || 1));
    const bondScale = Math.max(0, Math.min(3, Number(profile.bondScale) || 1));
    const smokeScale = Math.max(0, Math.min(3, Number(profile.smokeScale) || 1));
    const trailScale = Math.max(0, Math.min(3, Number(profile.trailScale) || 1));
    const explosionScale = Math.max(0, Math.min(3, Number(profile.explosionScale) || 1));
    const trailStyle = String(profile.trailStyle ?? 'auto').toLowerCase();
    const resolvedTrailStyle = trailStyle === 'auto' ? 'lite' : trailStyle;

    if (kind === 'water') {
      juice.waterSplash?.(x, y, z, intensity * explosionScale);
      juice.waterScreenDroplets?.(Math.max(0.8, intensity) * dropletScale);
      juice.playFxProfileStack?.(profile, { worldX: x, worldY: y, worldZ: z, radius: 0.46, color, intensity, variant: 'merge' });
      return;
    }
    if (kind === 'fire') {
      juice.fireBurst?.(x, y, z, intensity * explosionScale);
      juice.playFxProfileStack?.(profile, { worldX: x, worldY: y, worldZ: z, radius: 0.46, color, intensity, variant: 'merge' });
      return;
    }
    if (kind === 'explosion') {
      juice.creationExplosion?.(x, y, z, intensity * explosionScale);
      juice.playFxProfileStack?.(profile, { worldX: x, worldY: y, worldZ: z, radius: 0.46, color, intensity, variant: 'merge' });
      return;
    }
    if (kind === 'molecule') {
      juice.creationExplosion?.(x, y, z, intensity * explosionScale);
      juice.burst?.(x, y, z, color, Math.floor(34 * burstScale), 1.1 * intensity, 'jackpot');
      juice.burstSparks?.(x, y, z + 0.04, color, Math.floor(18 * sparkScale));
      juice.moleculeSmoke?.(x, y, z, color, intensity * smokeScale);
      juice.moleculeBondLink?.(x - 0.26, y, z, x + 0.26, y + 0.07, z, color, 1.1 * bondScale);
      if (resolvedTrailStyle !== 'none') {
        juice.specialMoleculeTrails?.(
          x,
          y + 0.05,
          z + 0.06,
          color,
          Math.max(0.4, intensity * trailScale),
          resolvedTrailStyle === 'full' ? 'full' : 'lite',
        );
      }
      juice.playFxProfileStack?.(profile, {
        worldX: x,
        worldY: y,
        worldZ: z,
        targetX: x + 0.26,
        targetY: y + 0.07,
        targetZ: z,
        radius: 0.46,
        color,
        intensity,
        variant: 'jackpot',
      });
      return;
    }

    // default: merge preview
    juice.burst?.(x, y, z, color, Math.floor(28 * burstScale), 0.92 * intensity, 'merge');
    juice.burstSparks?.(x, y, z + 0.04, color, Math.floor(12 * sparkScale));
    juice.moleculeBondLink?.(x - 0.2, y - 0.02, z, x + 0.2, y + 0.02, z, color, 0.82 * bondScale);
    if (smokeScale > 0.01) {
      juice.smokePuff?.(x, y, z, color, Math.floor(12 * smokeScale));
    }
    juice.playFxProfileStack?.(profile, {
      worldX: x,
      worldY: y,
      worldZ: z,
      targetX: x + 0.2,
      targetY: y + 0.02,
      targetZ: z,
      radius: 0.46,
      color,
      intensity,
      variant: 'merge',
    });
  }

  function ensureFpsTextEl() {
    if (fpsTextEl || !host) return fpsTextEl;
    const el = document.createElement('div');
    el.className = 'dev-fps-meter';
    el.style.position = 'absolute';
    el.style.left = '12px';
    el.style.bottom = '12px';
    el.style.zIndex = '12';
    el.style.pointerEvents = 'none';
    el.style.padding = '4px 8px';
    el.style.borderRadius = '10px';
    el.style.border = '1px solid rgba(180, 220, 255, 0.24)';
    el.style.background = 'rgba(3, 15, 30, 0.72)';
    el.style.backdropFilter = 'blur(2px)';
    el.style.color = '#d9ecff';
    el.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    el.style.fontSize = '11px';
    el.style.lineHeight = '1';
    el.style.letterSpacing = '0.04em';
    el.style.opacity = '0';
    el.style.transform = 'translateY(4px)';
    el.style.transition = 'opacity 120ms ease, transform 120ms ease';
    el.textContent = 'FPS --';
    host.appendChild(el);
    fpsTextEl = el;
    return el;
  }

  function setFpsVisible(next) {
    fpsVisible = !!next;
    const el = ensureFpsTextEl();
    if (!el) return;
    if (fpsVisible) {
      fpsSampleSec = 0;
      fpsSampleFrames = 0;
      fpsCurrent = 0;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      el.textContent = 'FPS --';
    } else {
      el.style.opacity = '0';
      el.style.transform = 'translateY(4px)';
    }
  }

  function isValidType(type) {
    return Number.isInteger(type) && type >= 0 && type < FRUITS.length;
  }

  function queueLabel(type) {
    if (mode === 'atoms') return FRUITS[type]?.symbol ?? `Z${type + 1}`;
    return modeSpec.queueLabel(type);
  }

  function rollDropTypeForLevel(nextLevel) {
    if (mode === 'atoms') return rollAtomWorldDropType(atomWorldId, nextLevel, FRUITS.length);
    return modeSpec.rollDropType(nextLevel);
  }

  function collisionRadiusForType(type) {
    const spec = FRUITS[type];
    if (!spec) return 0;
    // Atoms: `radius` is globally scaled in the lab; `physicsRadius` stays unscaled (used for mass).
    // Collision must follow `radius` or spheres look larger than their physics hull and overlap visually.
    const base =
      mode === 'atoms' ? Number(spec.radius) : Number(spec.physicsRadius ?? spec.radius) || 0;
    if (!Number.isFinite(base) || base <= 0) return 0;
    if (mode !== 'atoms') return base;
    return base * ATOM_COLLISION_SCALE;
  }

  function massSpecForType(type) {
    const spec = FRUITS[type];
    if (!spec || mode !== 'atoms') return spec;
    /** Match `spec.radius` (global lab scale + collision) so mass/inertia align with the sphere shape. */
    const r = Number(spec.radius);
    if (!Number.isFinite(r) || r <= 0) return spec;
    return { ...spec, radius: r };
  }

  function collisionRadiusForFruit(fruit) {
    if (mode !== 'atoms') return FRUITS[fruit.type]?.radius ?? 0;
    return fruit?.collisionRadius ?? collisionRadiusForType(fruit.type);
  }

  function mixColors(a, b, t = 0.5) {
    const p = Math.max(0, Math.min(1, Number(t) || 0));
    const ar = (a >> 16) & 255;
    const ag = (a >> 8) & 255;
    const ab = a & 255;
    const br = (b >> 16) & 255;
    const bg = (b >> 8) & 255;
    const bb = b & 255;
    const r = Math.round(ar + (br - ar) * p);
    const g = Math.round(ag + (bg - ag) * p);
    const bch = Math.round(ab + (bb - ab) * p);
    return (r << 16) | (g << 8) | bch;
  }

  function resolveCollisionFxProfile(entry, other) {
    if (mode !== 'atoms' || !entry || !other) return { profile: null, reaction: 'none', intensity: 1 };
    const entrySpec = FRUITS[entry.type];
    const otherSpec = FRUITS[other.type];
    if (!entrySpec || !otherSpec) return { profile: null, reaction: 'none', intensity: 1 };

    const sameType = entry.type === other.type;
    const entryToOtherAtomic = Number(otherSpec.atomicNumber);
    const otherToEntryAtomic = Number(entrySpec.atomicNumber);
    const entryRules = Array.isArray(entrySpec.collisionRules) ? entrySpec.collisionRules : [];
    const otherRules = Array.isArray(otherSpec.collisionRules) ? otherSpec.collisionRules : [];
    const matchedRule =
      entryRules.find((rule) => Number(rule?.targetAtomicNumber) === entryToOtherAtomic) ??
      otherRules.find((rule) => Number(rule?.targetAtomicNumber) === otherToEntryAtomic);
    const sameTypeFxId =
      sameType ? entrySpec.collisionFxSameId ?? otherSpec.collisionFxSameId ?? null : null;
    const fxId =
      matchedRule?.fxId ??
      sameTypeFxId ??
      null;
    const profile = resolveFxProfileById(fxId, atomVisualLabStateCache ?? undefined);
    return {
      profile,
      reaction: String(matchedRule?.reaction ?? 'none').toLowerCase(),
      intensity: Math.max(0.2, Math.min(3, Number(matchedRule?.intensity ?? 1) || 1)),
      hasMatchedRule: !!matchedRule,
      sameType: sameType,
    };
  }

  function maybePlayAtomCollisionFx(entry, event) {
    if (mode !== 'atoms') return;
    const otherBody = event?.body;
    const contact = event?.contact;
    if (!otherBody || !contact || otherBody.mass <= 0) return;
    const other = fruits.find((item) => item.body === otherBody);
    if (!other || other === entry) return;

    const impact = Math.abs(contact.getImpactVelocityAlongNormal?.() ?? 0);
    if (impact < 0.42) return;

    const aId = Math.min(entry.body.id, other.body.id);
    const bId = Math.max(entry.body.id, other.body.id);
    const now = performance.now();
    const cooldownKey = `${aId}:${bId}`;
    if (now - (collisionFxCooldowns.get(cooldownKey) ?? 0) < 180) return;
    collisionFxCooldowns.set(cooldownKey, now);

    const { profile, reaction, intensity: ruleIntensity, hasMatchedRule, sameType } =
      resolveCollisionFxProfile(entry, other);
    if (!profile && reaction === 'none') return;
    if (!hasMatchedRule && !sameType) return;
    if (!hasMatchedRule && sameType && impact < 1.05) return;

    const entryRadius = collisionRadiusForFruit(entry);
    const otherRadius = collisionRadiusForFruit(other);
    const worldX = (entry.body.position.x + other.body.position.x) * 0.5;
    const worldY = (entry.body.position.y + other.body.position.y) * 0.5;
    const worldZ = ROW_Z + 0.03;
    const color = mixColors(Number(FRUITS[entry.type]?.color) || 0x9edcff, Number(FRUITS[other.type]?.color) || 0xffffff, 0.5);
    const intensity = Math.max(0.12, Math.min(0.48, impact * 0.18)) * ruleIntensity;
    const radius = Math.max(entryRadius, otherRadius) * 0.92;

    juice.playFxProfileStack?.(profile, {
      worldX,
      worldY,
      worldZ,
      targetX: other.body.position.x,
      targetY: other.body.position.y,
      targetZ: worldZ,
      radius,
      color,
      intensity,
      variant: 'merge',
    });

    if (reaction === 'bond') {
      juice.atomPairAttractor?.(
        entry.body.position.x,
        entry.body.position.y,
        worldZ,
        other.body.position.x,
        other.body.position.y,
        worldZ,
        color,
        intensity * 0.95,
        { radiusA: entryRadius, radiusB: otherRadius, style: 'electron', count: 0.9, duration: 0.55 },
      );
    } else if (reaction === 'storm') {
      juice.specialMoleculeTrails?.(worldX, worldY, worldZ, color, intensity * 0.88, 'full');
    } else if (reaction === 'ignite') {
      juice.fireBurst?.(worldX, worldY, worldZ, intensity * 0.85);
    } else if (reaction === 'pulse') {
      queueHitPause(Math.min(0.045, 0.015 + impact * 0.012));
    }
  }

  function maybeBoostSmallAtomCollisionBounce(entry, event) {
    if (mode !== 'atoms' || !usesCalmAtomPreset()) return;
    const otherBody = event?.body;
    const contact = event?.contact;
    if (!otherBody || !contact || otherBody.mass <= 0) return;
    const other = fruits.find((item) => item.body === otherBody);
    if (!other || other === entry) return;

    const entryRadius = collisionRadiusForFruit(entry);
    const otherRadius = collisionRadiusForFruit(other);
    const small = entryRadius <= otherRadius ? entry : other;
    const smallRadius = Math.min(entryRadius, otherRadius);
    const largeRadius = Math.max(entryRadius, otherRadius);

    if (small.body.position.y <= smallRadius + 0.16) return;

    const now = performance.now();
    if (now - (small.lastSmallCollisionPopAt ?? 0) < 90) return;

    const impact = Math.abs(contact.getImpactVelocityAlongNormal?.() ?? 0);
    if (impact < 0.42) return;

    const smallFactor = Math.max(0, Math.min(1, (0.19 - smallRadius) / 0.1));
    if (smallFactor <= 0) return;

    const sizeContrast = Math.max(0, Math.min(1, (largeRadius - smallRadius) / Math.max(0.05, largeRadius)));
    const impactFactor = Math.max(0, Math.min(1, (impact - 0.42) / 1.2));
    const pop = (0.05 + smallFactor * 0.12 + sizeContrast * 0.05) * impactFactor;
    if (pop <= 0.015) return;

    small.body.wakeUp?.();
    small.body.velocity.y = Math.min(0.92, Math.max(small.body.velocity.y, pop));
    small.lastSmallCollisionPopAt = now;
  }

  function loadRunState() {
    try {
      const raw = localStorage.getItem(runStateLsKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== RUN_STATE_VERSION) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function clearRunState() {
    try {
      localStorage.removeItem(runStateLsKey);
    } catch {}
  }

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
      nextLabel: queueLabel(dropQueue[0] ?? 0),
      nextQueue: dropQueue.slice(0, 1 + QUEUE_STRIP_VISIBLE).map((type) => ({
        label: queueLabel(type),
        color: FRUITS[type]?.color ?? 0xffffff,
      })),
      tierLabel: modeSpec.levelTag(level),
      panic,
      muted,
      title: modeTitle,
      themeId:
        mode === 'atoms' && atomWorldId ? `${modeSpec.themeId} world-${atomWorldId}` : modeSpec.themeId,
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
      writeBestScore(scoreModeKey, bestScore);
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
      backgroundFx?.setLevel?.(level);
      playfield.setBackdropImage?.(backgroundFx?.getCurrentImageUrl?.() ?? '');
      Sfx.playLevelUp();
      commitWorldProgress({ silent: false });
      emitLevelChemistryBrief('level-up');
    }
  }

  function moleculeFusionUnlocked() {
    if (mode !== 'atoms') return false;
    const unlockLevel = MOLECULE_UNLOCK_LEVEL ?? 5;
    const unlockDiscovered = MOLECULE_UNLOCK_DISCOVERED ?? 10;
    return level >= unlockLevel || discoveredCount() >= unlockDiscovered;
  }

  function moleculeMaxInputsForLevel() {
    if (mode !== 'atoms') return Infinity;
    if (level <= 5) return 2;
    if (level <= 7) return 3;
    if (level <= 9) return 4;
    if (level <= 12) return 6;
    return 24;
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

  function moleculeComboText(inputs) {
    const byAtomic = new Map();
    for (const atomicNumber of inputs ?? []) {
      byAtomic.set(atomicNumber, (byAtomic.get(atomicNumber) ?? 0) + 1);
    }
    return [...byAtomic.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([atomicNumber, count]) => `${atomSymbolByNumber(atomicNumber)}x${count}`)
      .join(' + ');
  }

  function availableMoleculeGuideEntries() {
    if (mode !== 'atoms' || !Array.isArray(MOLECULE_RECIPES)) return [];
    if (!moleculeFusionUnlocked()) return [];
    const maxInputs = moleculeMaxInputsForLevel();
    const discoveredNow = discoveredCount();
    return MOLECULE_RECIPES
      .filter((recipe) => {
        const inputCount = recipe?.inputs?.length ?? 0;
        return (
          inputCount >= 2 &&
          inputCount <= maxInputs &&
          (recipe.unlockLevel ?? 1) <= level &&
          (recipe.unlockDiscovered ?? 0) <= discoveredNow
        );
      })
      .sort((a, b) => {
        if ((a.unlockLevel ?? 1) !== (b.unlockLevel ?? 1)) {
          return (a.unlockLevel ?? 1) - (b.unlockLevel ?? 1);
        }
        if ((a.inputs?.length ?? 0) !== (b.inputs?.length ?? 0)) {
          return (a.inputs?.length ?? 0) - (b.inputs?.length ?? 0);
        }
        return (b.points ?? 0) - (a.points ?? 0);
      })
      .slice(0, 5)
      .map((recipe) => ({
        id: recipe.id,
        formula: formatChemicalFormula(recipe.formula),
        name: recipe.name ?? '',
        combo: moleculeComboText(recipe.inputs),
        points: Math.max(0, Math.round(recipe.points ?? 0)),
      }));
  }

  function emitLevelChemistryBrief(reason = 'level-start') {
    if (mode !== 'atoms') return;
    if (reason !== 'start' && lastChemGuideLevel === level) return;
    lastChemGuideLevel = level;
    const entries = availableMoleculeGuideEntries();
    if (entries.length <= 0) return;
    onInfo({
      kind: 'molecule-guide',
      reason,
      level,
      title: `${t('common.level')} ${level}`,
      subtitle: `Molecule combos available: ${entries.length}`,
      entries,
      durationMs: 5200,
    });
  }

  function commitWorldProgress({ silent = true, force = false } = {}) {
    if (mode !== 'atoms' || !atomWorldId) return;
    if (
      !force &&
      level <= committedWorldProgress.level &&
      score <= committedWorldProgress.score
    ) {
      return;
    }
    committedWorldProgress = {
      level: Math.max(committedWorldProgress.level, level),
      score: Math.max(committedWorldProgress.score, score),
    };
    const { unlockedNow } = recordAtomWorldRun(atomWorldId, { level, score });
    if (!silent && unlockedNow.length > 0) {
      for (const unlockedId of unlockedNow) {
        const unlockedWorld = getAtomWorld(unlockedId);
        onToast(`World unlocked: ${unlockedWorld.label}`, 'success');
      }
    }
    onWorldProgress();
  }

  function hintPairMaxDist(a, b, recipeSize = 2, detectBoost = 1) {
    const ra = collisionRadiusForFruit(a);
    const rb = collisionRadiusForFruit(b);
    const detectMult = MOLECULE_DETECT_DIST_MULT ?? 1.22;
    const sizeBonus = Math.min(0.18, Math.max(0, recipeSize - 2) * 0.01);
    const pairMult = (1.03 + sizeBonus) * detectMult * detectBoost;
    return (ra + rb) * pairMult;
  }

  function buildHintLinks(entries, recipeSize = 2, detectBoost = 1) {
    if (!Array.isArray(entries) || entries.length < 2) return null;
    const links = [];
    const used = new Set([0]);
    const maxLinks = Math.min(4, entries.length - 1);
    while (links.length < maxLinks && used.size < entries.length) {
      let best = null;
      for (const ia of used) {
        const a = entries[ia];
        for (let ib = 0; ib < entries.length; ib += 1) {
          if (used.has(ib) || ia === ib) continue;
          const b = entries[ib];
          const dx = b.body.position.x - a.body.position.x;
          const dy = b.body.position.y - a.body.position.y;
          const d2 = dx * dx + dy * dy;
          if (!best || d2 < best.d2) best = { ia, ib, d2 };
        }
      }
      if (!best) break;
      const a = entries[best.ia];
      const b = entries[best.ib];
      const maxD = hintPairMaxDist(a, b, recipeSize, detectBoost) * 1.18;
      if (best.d2 <= maxD * maxD) {
        links.push({
          ax: a.body.position.x,
          ay: a.body.position.y,
          bx: b.body.position.x,
          by: b.body.position.y,
          d2: best.d2,
          maxD2: maxD * maxD,
        });
      }
      used.add(best.ib);
    }
    if (links.length <= 0) return null;
    let cx = 0;
    let cy = 0;
    for (const entry of entries) {
      cx += entry.body.position.x;
      cy += entry.body.position.y;
    }
    cx /= entries.length;
    cy /= entries.length;
    return { links, cx, cy };
  }

  function pickMoleculeHintCluster(needMap, haveByAtomic, nextAtomic, recipeSize = 2, detectBoost = 1) {
    const candidates = [];
    for (const [z, req] of needMap.entries()) {
      const pool = haveByAtomic.get(z);
      if (!pool?.length) continue;
      let take = Math.min(req, pool.length);
      if (z === nextAtomic && pool.length < req) {
        take = Math.max(0, take - 1);
      }
      if (take <= 0) continue;
      const sorted = [...pool].sort((a, b) => b.body.position.y - a.body.position.y);
      for (let i = 0; i < take; i += 1) candidates.push(sorted[i]);
    }
    return buildHintLinks(candidates, recipeSize, detectBoost);
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
    const maxInputsNow = moleculeMaxInputsForLevel();

    const haveCounts = new Map();
    const haveByAtomic = new Map();
    for (const f of fruits) {
      const z = FRUITS[f.type]?.atomicNumber;
      if (!z) continue;
      haveCounts.set(z, (haveCounts.get(z) ?? 0) + 1);
      if (!haveByAtomic.has(z)) haveByAtomic.set(z, []);
      haveByAtomic.get(z).push(f);
    }

    let best = null;
    for (const recipe of MOLECULE_RECIPES) {
      if ((recipe.inputs?.length ?? 0) > maxInputsNow) continue;
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

      const detectBoost = Number.isFinite(recipe?.detectBoost) ? Math.max(0.86, recipe.detectBoost) : 1;
      const cluster = pickMoleculeHintCluster(
        need,
        haveByAtomic,
        nextAtomic,
        recipe.inputs?.length ?? 2,
        detectBoost,
      );
      const linkCount = cluster?.links?.length ?? 0;
      const scoreHint =
        (recipe.inputs?.length ?? 0) * 100 +
        (recipe.points ?? 0) +
        linkCount * 180;
      if (!best || scoreHint > best.scoreHint) {
        best = { recipe, scoreHint, cluster };
      }
    }
    return best;
  }

  function maybeEmitMoleculeHint(dt) {
    if (mode !== 'atoms' || gameOver) return;
    if (!moleculeFusionUnlocked()) return;
    moleculeHintCd = Math.max(0, moleculeHintCd - dt);
    if (moleculeHintCd > 0) return;
    const hint = findNearMoleculeHint();
    if (!hint?.recipe) return;
    const recipe = hint.recipe;
    const nextSpec = FRUITS[dropQueue[0]];
    const nextSymbol = nextSpec?.symbol ?? '?';
    const hintKey = `${recipe.id}:${nextSymbol}`;
    if (hintKey === lastMoleculeHintKey) {
      moleculeHintCd = 2.6;
      if (hint.cluster?.links?.length) {
        for (const link of hint.cluster.links) {
          const closeness = Math.max(0.4, Math.min(1.05, Math.sqrt((link.maxD2 ?? link.d2) / Math.max(0.0001, link.d2)) * 0.64));
          juice.moleculeBondLink?.(
            link.ax,
            link.ay,
            ROW_Z + 0.095,
            link.bx,
            link.by,
            ROW_Z + 0.095,
            recipe.color ?? nextSpec?.color ?? 0x9ed9ff,
            0.5 * closeness,
          );
        }
      }
      return;
    }
    lastMoleculeHintKey = hintKey;
    moleculeHintCd = 3.2;
    if (hint.cluster?.links?.length) {
      for (const link of hint.cluster.links) {
        const closeness = Math.max(0.6, Math.min(1.2, Math.sqrt((link.maxD2 ?? link.d2) / Math.max(0.0001, link.d2)) * 0.72));
        juice.moleculeBondLink?.(
          link.ax,
          link.ay,
          ROW_Z + 0.1,
          link.bx,
          link.by,
          ROW_Z + 0.1,
          recipe.color ?? nextSpec?.color ?? 0x9ed9ff,
          0.84 * closeness,
        );
      }
      juice.specialMoleculeTrails?.(
        hint.cluster.cx,
        hint.cluster.cy + 0.02,
        ROW_Z + 0.11,
        recipe.color ?? nextSpec?.color ?? 0x9ed9ff,
        0.74,
        'lite',
      );
    }
  }

  function findNearSameTypePairHint() {
    if (mode !== 'atoms') return null;
    if (fruits.length < 2) return null;
    let best = null;
    for (let i = 0; i < fruits.length; i += 1) {
      const a = fruits[i];
      if (a.type > MERGEABLE_TYPE_MAX) continue;
      for (let j = i + 1; j < fruits.length; j += 1) {
        const b = fruits[j];
        if (b.type !== a.type || b.type > MERGEABLE_TYPE_MAX) continue;
        const touch = collisionRadiusForFruit(a) + collisionRadiusForFruit(b);
        const mergeDist = touch * MERGE_DIST_MULT;
        // "Almost merge" window: enough to feel a bond hint, still outside true merge.
        const nearMin = mergeDist * 1.002;
        const nearMax = mergeDist * 1.22;
        const dx = b.body.position.x - a.body.position.x;
        const dy = b.body.position.y - a.body.position.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= nearMin * nearMin || d2 > nearMax * nearMax) continue;
        const d = Math.sqrt(d2);
        const closeness = 1 - (d - nearMin) / Math.max(0.0001, nearMax - nearMin);
        const scoreHint = closeness * 1000 - (a.body.position.y + b.body.position.y) * 6;
        if (!best || scoreHint > best.scoreHint) {
          best = {
            a,
            b,
            scoreHint,
            closeness: Math.max(0, Math.min(1, closeness)),
          };
        }
      }
    }
    return best;
  }

  function maybeEmitNearMergeBondHint(dt) {
    if (mode !== 'atoms' || gameOver) return;
    nearMergeBondCd = Math.max(0, nearMergeBondCd - dt);
    if (nearMergeBondCd > 0) return;
    const hint = findNearSameTypePairHint();
    if (!hint?.a || !hint?.b) return;
    const ida = hint.a.body?.id ?? 0;
    const idb = hint.b.body?.id ?? 0;
    const pairKey = ida < idb ? `${ida}:${idb}` : `${idb}:${ida}`;
    const ax = hint.a.body.position.x;
    const ay = hint.a.body.position.y;
    const bx = hint.b.body.position.x;
    const by = hint.b.body.position.y;
    const color = FRUITS[hint.a.type]?.color ?? 0x9ed9ff;
    const intensity = 0.78 + hint.closeness * 0.56;
    juice.atomPairAttractor?.(
      ax,
      ay,
      ROW_Z + 0.1,
      bx,
      by,
      ROW_Z + 0.1,
      color,
      intensity,
      {
        radiusA: collisionRadiusForFruit(hint.a),
        radiusB: collisionRadiusForFruit(hint.b),
        duration: 0.42 + hint.closeness * 0.32,
        style: 'electron',
        count: 1.1 + hint.closeness * 0.9,
        speed: 0.9 + hint.closeness * 0.5,
      },
    );
    // Keep this subtle and responsive.
    nearMergeBondCd = pairKey === lastNearMergeBondKey ? 0.18 : 0.11;
    lastNearMergeBondKey = pairKey;
  }

  function applyPhysicsTuning() {
    applyPhysicsTuningToBodies(fruits);
  }

  function applyAtomPhysicsPreset(name, options = {}) {
    if (mode !== 'atoms') return false;
    if (!isAtomPresetName(name)) return false;
    const preset = ATOM_PHYSICS_PRESETS[name];
    Object.assign(physicsTuning, preset);
    if (atomWorldPhysicsOverrides) {
      Object.assign(physicsTuning, atomWorldPhysicsOverrides);
    }
    applyDeviceAtomPhysicsCaps();
    atomPhysicsPreset = name;
    atomPhysicsLabSignature = '';
    applyPhysicsTuning();
    if (options.wake) {
      for (const fruit of fruits) {
        if (fruit.body.sleepState === 2) fruit.body.wakeUp();
      }
    }
    if (options.announce) {
      onToast(`Physics: ${name}`, 'accent', 'center');
    }
    return true;
  }

  function cycleAtomPhysicsPreset(dir = 1) {
    if (mode !== 'atoms') return;
    const names = ['stable', 'balanced', 'juicy'];
    const idx = names.indexOf(atomPhysicsPreset);
    const nextIdx = (idx + dir + names.length) % names.length;
    applyAtomPhysicsPreset(names[nextIdx], { wake: true, announce: true });
  }

  function usesCalmAtomPreset(name = atomPhysicsPreset) {
    return typeof name === 'string' && (name === 'balanced' || name.startsWith('config2_pop_'));
  }

  function shouldUseAtomAssist() {
    return true;
  }

  function relaxPileOverlaps() {
    if (mode !== 'atoms' || fruits.length < 2) return;
    const balancedPreset = usesCalmAtomPreset();
    const assistPasses = 1;
    for (let pass = 0; pass < assistPasses; pass += 1) {
      let separated = false;
      for (let i = 0; i < fruits.length; i += 1) {
        const a = fruits[i];
        const ra = collisionRadiusForFruit(a);
        for (let j = i + 1; j < fruits.length; j += 1) {
          const b = fruits[j];
          const rb = collisionRadiusForFruit(b);
          const aSleeping = a.body.sleepState === 2;
          const bSleeping = b.body.sleepState === 2;
          // Do not micro-nudge fully sleeping pairs every frame; this creates
          // visible "vibration" when a new ball is dropped but not touching yet.
          if (aSleeping && bSleeping) continue;
          const nearFloorA = a.body.position.y <= ra + 0.12;
          const nearFloorB = b.body.position.y <= rb + 0.12;
          const bottomPair = nearFloorA && nearFloorB;
          const minDist = ra + rb;
          const dx = a.body.position.x - b.body.position.x;
          const dy = a.body.position.y - b.body.position.y;
          const d2 = dx * dx + dy * dy;
          const floorTolerance = bottomPair
            ? (balancedPreset ? 0.99955 : 0.9989)
            : 0.9968;
          if (d2 >= minDist * minDist * floorTolerance) continue;

          const dist = Math.max(0.0001, Math.sqrt(d2));
          const overlap = minDist - dist;
          const overlapEpsilon = bottomPair
            ? (balancedPreset ? 0.0038 : 0.0065)
            : 0.009;
          if (overlap <= overlapEpsilon) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          const invA = a.body.invMass ?? 0;
          const invB = b.body.invMass ?? 0;
          const invSum = invA + invB;
          if (invSum <= 0) continue;
          const wa = invA / invSum;
          const wb = invB / invSum;
          const corr = bottomPair
            ? Math.min(balancedPreset ? 0.038 : 0.03, overlap * (balancedPreset ? 0.4 : 0.34))
            : Math.min(0.026, overlap * 0.3);
          const xBias = bottomPair ? 0.35 : 1;
          const yBias = bottomPair ? 0.52 : 1;
          a.body.position.x += nx * corr * wa * xBias;
          a.body.position.y += ny * corr * wa * yBias;
          b.body.position.x -= nx * corr * wb * xBias;
          b.body.position.y -= ny * corr * wb * yBias;

          const limA = playfield.innerHalfXForRadius(ra);
          const limB = playfield.innerHalfXForRadius(rb);
          a.body.position.x = Math.max(-limA, Math.min(limA, a.body.position.x));
          b.body.position.x = Math.max(-limB, Math.min(limB, b.body.position.x));
          a.body.position.y = Math.max(ra - 0.006, a.body.position.y);
          b.body.position.y = Math.max(rb - 0.006, b.body.position.y);
          if (bottomPair) {
            const sideDamp = balancedPreset ? 0.6 : 0.88;
            const upCap = balancedPreset ? 0.012 : 0.04;
            const upScale = balancedPreset ? 0.1 : 0.3;
            a.body.velocity.x *= sideDamp;
            b.body.velocity.x *= sideDamp;
            /** Don't kill downward velocity while still falling through overlap (big scaled atoms were "sticking"). */
            function clampBottomPairVy(vy) {
              if (vy < -0.1) return Math.max(vy * 0.62, -0.55);
              return Math.min(upCap, Math.max(0, vy * upScale));
            }
            a.body.velocity.y = clampBottomPairVy(a.body.velocity.y);
            b.body.velocity.y = clampBottomPairVy(b.body.velocity.y);
          }

          separated = true;
        }
      }
      if (!separated) break;
    }
    for (const fruit of fruits) syncFruitVisualPosition(fruit);
  }

  function settlePileBeforeDrop() {
    if (mode !== 'atoms') return;
    for (const fruit of fruits) {
      const radius = collisionRadiusForFruit(fruit);
      const nearFloor = fruit.body.position.y <= radius + 0.62;
      if (!nearFloor) continue;
      const vx = Math.abs(fruit.body.velocity.x);
      const vy = Math.abs(fruit.body.velocity.y);
      const wz = Math.abs(fruit.body.angularVelocity.z);
      const wx = Math.abs(fruit.body.angularVelocity.x);
      const wy = Math.abs(fruit.body.angularVelocity.y);
      if (vx > 0.16 || vy > 0.18 || wz > 0.9 || wx > 0.55 || wy > 0.55) continue;
      fruit.body.velocity.set(0, 0, 0);
      fruit.body.angularVelocity.set(0, 0, 0);
      if (fruit.body.sleepState === 0) fruit.body.sleep();
    }
  }

  function calmDensePile() {
    if (mode !== 'atoms') return;
    const balancedPreset = usesCalmAtomPreset();
    const minFruits = balancedPreset ? 7 : 14;
    if (fruits.length < minFruits) return;

    const baseNeed = balancedPreset ? 5 : 9;
    const nearBasePad = balancedPreset ? 0.66 : 0.34;
    /** Large collision radii (global atom scale) slow-settle at |vy| ~0.2–0.4 — keep gate above that band. */
    const vyGate = balancedPreset ? 0.52 : 0.05;
    const vxGate = balancedPreset ? 0.32 : 0.07;
    const sleepV2 = balancedPreset ? 0.05 : 0.0035;
    const sleepW2 = balancedPreset ? 0.85 : 0.035;

    let baseCount = 0;
    for (const fruit of fruits) {
      const r = collisionRadiusForFruit(fruit);
      if (fruit.body.position.y <= r + 0.26) baseCount += 1;
    }
    if (baseCount < baseNeed) return;

    for (const fruit of fruits) {
      const r = collisionRadiusForFruit(fruit);
      const nearBase = fruit.body.position.y <= r + nearBasePad;
      if (!nearBase) continue;
      if (Math.abs(fruit.body.velocity.y) > vyGate) continue;
      if (Math.abs(fruit.body.velocity.x) > vxGate) continue;
      if (balancedPreset) {
        fruit.body.velocity.x *= 0.76;
        fruit.body.velocity.y *= 0.72;
        fruit.body.angularVelocity.x *= 0.58;
        fruit.body.angularVelocity.y *= 0.58;
        fruit.body.angularVelocity.z *= 0.48;
        if (Math.abs(fruit.body.velocity.x) < 0.024) fruit.body.velocity.x = 0;
        if (Math.abs(fruit.body.velocity.y) < 0.024) fruit.body.velocity.y = 0;
        if (Math.abs(fruit.body.angularVelocity.x) < 0.085) fruit.body.angularVelocity.x = 0;
        if (Math.abs(fruit.body.angularVelocity.y) < 0.085) fruit.body.angularVelocity.y = 0;
        if (Math.abs(fruit.body.angularVelocity.z) < 0.075) fruit.body.angularVelocity.z = 0;
      }

      const v2 =
        fruit.body.velocity.x * fruit.body.velocity.x +
        fruit.body.velocity.y * fruit.body.velocity.y;
      const w2 =
        fruit.body.angularVelocity.x * fruit.body.angularVelocity.x +
        fruit.body.angularVelocity.y * fruit.body.angularVelocity.y +
        fruit.body.angularVelocity.z * fruit.body.angularVelocity.z;
      if (v2 < sleepV2 && w2 < sleepW2 && fruit.body.sleepState === 0) {
        if (balancedPreset) {
          fruit.body.velocity.set(0, 0, 0);
          fruit.body.angularVelocity.set(0, 0, 0);
        }
        fruit.body.sleep();
      }
    }
  }

  function lockDeepPileLayers() {
    if (mode !== 'atoms') return;
    if (fruits.length < 10) return;

    let baseCount = 0;
    for (const fruit of fruits) {
      const r = collisionRadiusForFruit(fruit);
      if (fruit.body.position.y <= r + 0.28) baseCount += 1;
    }
    if (baseCount < 6) return;

    for (const fruit of fruits) {
      const r = collisionRadiusForFruit(fruit);
      const y = fruit.body.position.y;
      const surfaceY = y - r;
      // Only damp when the sphere is truly near the floor and nearly static (large r + global scale were tripping this while falling).
      if (surfaceY > 0.24) continue;
      if (Math.abs(fruit.body.velocity.y) > 0.78) continue;

      fruit.body.velocity.x *= 0.68;
      fruit.body.velocity.y *= 0.74;
      fruit.body.angularVelocity.x *= 0.42;
      fruit.body.angularVelocity.y *= 0.42;
      fruit.body.angularVelocity.z *= 0.36;

      if (Math.abs(fruit.body.velocity.x) < 0.036) fruit.body.velocity.x = 0;
      if (Math.abs(fruit.body.velocity.y) < 0.038) fruit.body.velocity.y = 0;
      if (Math.abs(fruit.body.angularVelocity.x) < 0.08) fruit.body.angularVelocity.x = 0;
      if (Math.abs(fruit.body.angularVelocity.y) < 0.08) fruit.body.angularVelocity.y = 0;
      if (Math.abs(fruit.body.angularVelocity.z) < 0.085) fruit.body.angularVelocity.z = 0;

      const v2 =
        fruit.body.velocity.x * fruit.body.velocity.x +
        fruit.body.velocity.y * fruit.body.velocity.y;
      const w2 =
        fruit.body.angularVelocity.x * fruit.body.angularVelocity.x +
        fruit.body.angularVelocity.y * fruit.body.angularVelocity.y +
        fruit.body.angularVelocity.z * fruit.body.angularVelocity.z;
      if (v2 < 0.0065 && w2 < 0.065 && fruit.body.sleepState === 0) {
        fruit.body.velocity.set(0, 0, 0);
        fruit.body.angularVelocity.set(0, 0, 0);
        fruit.body.sleep();
      }
    }
  }

  /** Physics stays at ROW_Z; nudge mesh Z slightly toward camera so tint matches the drop preview (GHOST_Z). */
  function syncFruitVisualPosition(fruit) {
    fruit.root.position.copy(fruit.body.position);
    if (mode === 'atoms') {
      fruit.root.position.z += 0.12;
    }
  }

  function spawnFruit(type, x, y, z, options = {}) {
    const spec = FRUITS[type];
    const drawRadius = spec.radius;
    const collisionRadius = collisionRadiusForType(type);
    const clamped = playfield.clampDropXZ(x, z, collisionRadius);
    const visual = modeSpec.createVisual(type, drawRadius, atomVisualOpts(type));
    const atomMassScale = mode === 'atoms' && usesCalmAtomPreset() ? 0.42 : 0.62;
    const body = new CANNON.Body({
      mass: massForFruitSpec(massSpecForType(type)) * (mode === 'atoms' ? atomMassScale : 1),
      linearDamping: physicsTuning.linearDamping,
      angularDamping: physicsTuning.angularDamping,
      material: physicsMaterial,
    });
    body.addShape(new CANNON.Sphere(collisionRadius));
    body.position.set(clamped.x, y, ROW_Z);
    // Hard-lock movement to XY plane so bodies cannot tunnel by drifting in Z.
    body.linearFactor.set(1, 1, 0);
    body.angularFactor.set(0, 0, 1);
    body.velocity.z = 0;
    body.allowSleep = true;
    body.sleepSpeedLimit = physicsTuning.sleepSpeedLimit;
    body.sleepTimeLimit = physicsTuning.sleepTimeLimit;
    if (mode === 'atoms') {
      body.angularDamping = Math.max(0.42, physicsTuning.angularDamping);
      // Continuous collision detection for fast contacts in dense piles.
      body.ccdSpeedThreshold = 0.22;
      body.ccdIterations = 12;
      const spinRange = usesCalmAtomPreset() ? 0.22 : 1.15;
      const spinZ = options.silentRestore ? 0 : (Math.random() - 0.5) * spinRange;
      body.angularVelocity.set(0, 0, spinZ);
    }
    world.addBody(body);
    scene.add(visual.root);
    const entry = {
      ...visual,
      body,
      type,
      collisionRadius,
      fusionT: options.fusionPop ? 0 : null,
      fusionDur: options.fusionPop ? 0.68 : null,
      lastSmallCollisionPopAt: 0,
      onCollide: null,
    };
    fruits.push(entry);
    syncFruitVisualPosition(entry);
    visual.rotationTarget.quaternion.copy(body.quaternion);

    if (mode === 'atoms') {
      body.addEventListener('collide', (event) => {
        maybeBoostSmallAtomCollisionBounce(entry, event);
        maybePlayAtomCollisionFx(entry, event);
      });
    }

    if (mode === 'atoms' && !options.silentRestore) {
      const discovery = touchDiscoveredAtomicNumber(spec.atomicNumber);
      emitCollectionSnapshot();
      void discovery;
    }
  }

  function removeFruit(entry) {
    world.removeBody(entry.body);
    scene.remove(entry.root);
    entry.dispose();
    const index = fruits.indexOf(entry);
    if (index >= 0) fruits.splice(index, 1);
  }

  function saveRunState() {
    if (gameOver) {
      clearRunState();
      return;
    }
    try {
      const payload = {
        v: RUN_STATE_VERSION,
        score,
        level,
        levelProgress,
        levelScoreGoal,
        dropQueue: dropQueue.filter((type) => isValidType(type)).slice(0, DROP_QUEUE_SIZE),
        fruits: fruits.map((fruit) => ({
          type: fruit.type,
          x: fruit.body.position.x,
          y: fruit.body.position.y,
          vx: fruit.body.velocity.x,
          vy: fruit.body.velocity.y,
          avx: fruit.body.angularVelocity.x,
          avy: fruit.body.angularVelocity.y,
          avz: fruit.body.angularVelocity.z,
          sleeping: fruit.body.sleepState === 2,
        })),
      };
      localStorage.setItem(runStateLsKey, JSON.stringify(payload));
    } catch {}
  }

  function restoreRunState(state) {
    if (!state || gameOver) return false;
    const restoredQueue = Array.isArray(state.dropQueue)
      ? state.dropQueue.filter((type) => isValidType(type)).slice(0, DROP_QUEUE_SIZE)
      : [];
    const restoredFruits = Array.isArray(state.fruits) ? state.fruits : [];
    if (restoredQueue.length === 0 && restoredFruits.length === 0) return false;

    score = Number.isFinite(state.score) ? Math.max(0, Math.floor(state.score)) : 0;
    level = Number.isFinite(state.level) ? Math.max(1, Math.floor(state.level)) : 1;
    levelProgress = Number.isFinite(state.levelProgress) ? Math.max(0, state.levelProgress) : 0;
    levelScoreGoal = Number.isFinite(state.levelScoreGoal)
      ? Math.max(LEVEL_GOAL_START, Math.floor(state.levelScoreGoal))
      : LEVEL_GOAL_START;

    dropQueue.length = 0;
    dropQueue.push(...restoredQueue);
    while (dropQueue.length < DROP_QUEUE_SIZE) dropQueue.push(rollDropTypeForLevel(level));

    for (const item of restoredFruits) {
      if (!isValidType(item?.type)) continue;
      const collisionRadius = collisionRadiusForType(item.type);
      const lim = playfield.innerHalfXForRadius(collisionRadius);
      const x = Number.isFinite(item.x) ? Math.max(-lim, Math.min(lim, item.x)) : 0;
      const y = Number.isFinite(item.y)
        ? Math.max(collisionRadius - 0.006, item.y)
        : collisionRadius;
      spawnFruit(item.type, x, y, ROW_Z, { silentRestore: true });
      const fruit = fruits[fruits.length - 1];
      if (!fruit) continue;
      fruit.body.velocity.x = Number.isFinite(item.vx) ? item.vx : 0;
      fruit.body.velocity.y = Number.isFinite(item.vy) ? item.vy : 0;
      fruit.body.velocity.z = 0;
      fruit.body.angularVelocity.x = Number.isFinite(item.avx) ? item.avx : 0;
      fruit.body.angularVelocity.y = Number.isFinite(item.avy) ? item.avy : 0;
      fruit.body.angularVelocity.z = Number.isFinite(item.avz) ? item.avz : 0;
      if (item.sleeping) fruit.body.sleep();
    }

    emitCollectionSnapshot();
    return true;
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
    for (const part of entry.parts ?? []) {
      part.visual?.dispose?.();
    }
  }

  function spawnMoleculeEntity(recipe, x, y, { sourceCount = 3 } = {}) {
    if (mode !== 'atoms') return;
    const presentation =
      recipe?.presentation && typeof recipe.presentation === 'object' ? recipe.presentation : {};
    const showWorldEntity = presentation.showWorldEntity === true;
    if (!showWorldEntity) return;
    const fxIntensityRaw = Number(recipe?.fxIntensity);
    const fxIntensity = Number.isFinite(fxIntensityRaw) ? Math.max(0.4, Math.min(2.8, fxIntensityRaw)) : 1;
    const readNumber = (key, fallback, min, max) => {
      const n = Number(presentation[key] ?? fallback);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, n));
    };
    const atomScale = readNumber('atomScale', 0.38 + fxIntensity * 0.04, 0.24, 0.72);
    const maxAtoms = Math.round(readNumber('maxAtoms', 4 + fxIntensity * 0.8, 2, 10));
    const burstRadius = readNumber('burstRadius', 0.44 + fxIntensity * 0.12, 0.18, 1.18);
    const startScale = readNumber('startScale', 0.74, 0.45, 1.4);
    const peakScale = readNumber('peakScale', 1.2 + fxIntensity * 0.1, 0.7, 2.2);
    const duration = readNumber('duration', 0.96 + fxIntensity * 0.08, 0.45, 2.4);
    const rise = readNumber('rise', 0.24 + fxIntensity * 0.06, 0.05, 0.72);
    const floatWave = readNumber('floatWave', 0.05, 0, 0.14);
    const spinSpeed = readNumber('spinSpeed', 1.2 + fxIntensity * 0.26, 0, 4);
    const fadeStart = readNumber('fadeStart', 0.44, 0.15, 0.9);
    const smokeAt = readNumber('smokeAt', 0.54, 0.1, 0.95);
    const smokeCount = Math.round(readNumber('smokeCount', 9 + fxIntensity * 7, 2, 64));
    const finalShatterAt = readNumber('finalShatterAt', 0.8, 0.2, 1);
    const finalShatter = Math.round(readNumber('finalShatter', 8 + fxIntensity * 8, 0, 80));
    const sparkCount = Math.round(readNumber('sparkCount', 10 + fxIntensity * 7, 3, 56));
    let formationZoomInEnd = readNumber('formationZoomInEnd', 0.38, 0.18, 0.52);
    let formationZoomHoldEnd = readNumber('formationZoomHoldEnd', 0.55, 0.35, 0.82);
    if (formationZoomHoldEnd <= formationZoomInEnd) {
      formationZoomHoldEnd = Math.min(0.82, formationZoomInEnd + 0.12);
    }
    const formationZoomPeak = readNumber('formationZoomPeak', 1.14, 1, 1.42);
    const inputs = Array.isArray(recipe?.inputs) ? recipe.inputs : [];
    const rawTypes = inputs
      .map((atomicNumber) => atomTypeByNumber.get(atomicNumber))
      .filter((type) => Number.isInteger(type));
    if (rawTypes.length === 0) return;
    const selectedTypes = [];
    const seen = new Set();
    for (const type of rawTypes) {
      if (selectedTypes.length >= maxAtoms) break;
      if (seen.has(type)) continue;
      selectedTypes.push(type);
      seen.add(type);
    }
    for (const type of rawTypes) {
      if (selectedTypes.length >= maxAtoms) break;
      selectedTypes.push(type);
    }
    if (selectedTypes.length === 0) return;
    const group = new THREE.Group();
    const ringRadius = 0.14 + Math.min(0.3, Math.sqrt(selectedTypes.length) * 0.07);
    const parts = [];
    for (let i = 0; i < selectedTypes.length; i += 1) {
      const type = selectedTypes[i];
      const visual = modeSpec.createVisual(type, FRUITS[type].radius * atomScale, {
        ghost: true,
        ...atomVisualOpts(type),
      });
      const a = (Math.PI * 2 * i) / selectedTypes.length;
      const jitter = (Math.random() - 0.5) * 0.04;
      const local = new THREE.Vector3(
        Math.cos(a) * (ringRadius + jitter),
        Math.sin(a) * (ringRadius * 0.48 + jitter * 0.35),
        (Math.random() - 0.5) * 0.08,
      );
      visual.root.position.copy(local);
      const mats = [];
      visual.root.traverse((obj) => {
        const base = obj.material;
        if (!base) return;
        const arr = Array.isArray(base) ? base : [base];
        for (const mat of arr) {
          if (!mat || mats.some((m) => m.mat === mat)) continue;
          const baseOpacity = Number.isFinite(mat.opacity) ? mat.opacity : 1;
          mat.transparent = true;
          mats.push({ mat, baseOpacity });
        }
      });
      group.add(visual.root);
      parts.push({
        visual,
        root: visual.root,
        mats,
        basePos: local.clone(),
        dir: local.clone().normalize().add(new THREE.Vector3(0, 0.25, 0)).normalize(),
        spin: (Math.random() < 0.5 ? -1 : 1) * (0.7 + Math.random() * 1.2),
      });
    }

    group.position.set(x, y + 0.44 + Math.min(0.18, Math.sqrt(Math.max(2, sourceCount)) * 0.04), ROW_Z + 0.1);
    group.renderOrder = 22;
    scene.add(group);

    moleculeEntities.push({
      group,
      parts,
      startScale,
      peakScale,
      burstRadius,
      color: recipe?.color ?? 0xbde7ff,
      didSmoke: false,
      didShatter: false,
      didFormationSparks: false,
      formationSparkCount: sparkCount + selectedTypes.length * 2,
      baseY: group.position.y,
      rise,
      floatWave,
      spinSpeed,
      fadeStart,
      smokeAt,
      smokeCount,
      finalShatterAt,
      finalShatter,
      formationZoomPeak,
      formationZoomInEnd,
      formationZoomHoldEnd,
      t: 0,
      dur: duration,
    });
  }

  function updateMoleculeEntities(dt) {
    for (let i = moleculeEntities.length - 1; i >= 0; i -= 1) {
      const item = moleculeEntities[i];
      item.t += dt;
      const u = Math.min(1, item.t / item.dur);
      const introPhase = Math.max(0.12, Math.min(0.55, item.formationZoomInEnd ?? 0.38));
      const zoomHold = Math.max(
        introPhase + 0.04,
        Math.min(0.9, item.formationZoomHoldEnd ?? 0.55),
      );
      const zoomPeak = Math.max(1, Math.min(1.42, item.formationZoomPeak ?? 1.14));
      const introT = Math.min(1, u / introPhase);
      const outroT = Math.max(0, (u - introPhase) / (1 - introPhase));
      const introEase = 1 - (1 - introT) * (1 - introT);
      item.group.rotation.y += dt * item.spinSpeed;
      item.group.position.y = item.baseY + Math.sin(item.t * 4.2) * item.floatWave + u * item.rise;
      const groupScale = item.startScale + (item.peakScale - item.startScale) * introEase;
      // Local "zoom" on the formation only (does not move or scale the main camera).
      let formationZoomMul = 1;
      if (u < introPhase) {
        const t = u / introPhase;
        const e = 1 - (1 - t) * (1 - t);
        formationZoomMul = 1 + (zoomPeak - 1) * e;
      } else if (u < zoomHold) {
        formationZoomMul = zoomPeak;
      } else {
        const denom = Math.max(0.05, 1 - zoomHold);
        const t = (u - zoomHold) / denom;
        const e = 1 - (1 - t) * (1 - t);
        formationZoomMul = zoomPeak + (1 - zoomPeak) * e;
      }
      item.group.scale.setScalar(groupScale * formationZoomMul);

      for (const part of item.parts ?? []) {
        part.root.rotation.y += dt * part.spin;
        part.root.rotation.x += dt * part.spin * 0.35;
        // Formation: atoms start spread along `dir`, ease into the ring, then drift outward in the outro.
        const converge = item.burstRadius * (1 - introEase);
        const radial = converge + item.burstRadius * outroT * outroT;
        part.root.position.copy(part.basePos).add(part.dir.clone().multiplyScalar(radial));
      }

      if (!item.didFormationSparks && u >= introPhase * 0.92 && introPhase > 0) {
        item.didFormationSparks = true;
        if (item.formationSparkCount > 0) {
          juice.burstSparks(
            item.group.position.x,
            item.group.position.y + 0.02,
            item.group.position.z + 0.06,
            item.color,
            item.formationSparkCount,
          );
        }
      }

      if (!item.didSmoke && u >= item.smokeAt) {
        item.didSmoke = true;
        juice.smokePuff?.(
          item.group.position.x,
          item.group.position.y + 0.03,
          ROW_Z + 0.08,
          item.color,
          item.smokeCount,
        );
      }

      if (!item.didShatter && item.finalShatter > 0 && u >= item.finalShatterAt) {
        item.didShatter = true;
        juice.shatterSpray?.(
          item.group.position.x,
          item.group.position.y + 0.02,
          ROW_Z + 0.09,
          item.color,
          item.finalShatter,
        );
      }

      const fade = 1 - Math.max(0, (u - item.fadeStart) / (1 - item.fadeStart));
      for (const part of item.parts ?? []) {
        for (const m of part.mats ?? []) {
          m.mat.opacity = m.baseOpacity * Math.max(0, fade);
        }
      }

      if (u >= 1) {
        disposeMoleculeEntity(item);
        moleculeEntities.splice(i, 1);
      }
    }
  }

  function buildPreviewEntry(type, previewIndex) {
    const scale = previewIndex === 0 ? 1 : QUEUE_PREVIEW_SCALE;
    const ghostPreview = mode === 'atoms' ? false : previewIndex === 0;
    const visual = modeSpec.createVisual(type, FRUITS[type].radius * scale, {
      ghost: ghostPreview,
      ...atomVisualOpts(type),
    });
    queuePreviewGroup.add(visual.root);
    queuePreviewEntries[previewIndex] = { ...visual, type };
  }

  function clearPreviewEntry(entry) {
    queuePreviewGroup.remove(entry.root);
    entry.dispose();
  }

  function refillDropQueue() {
    while (dropQueue.length < DROP_QUEUE_SIZE) dropQueue.push(rollDropTypeForLevel(level));
  }

  function syncDropQueuePreviews(forceRebuild = false) {
    refillDropQueue();
    for (let i = queuePreviewEntries.length - 1; i >= DROP_QUEUE_SIZE; i -= 1) {
      const extra = queuePreviewEntries[i];
      if (extra) clearPreviewEntry(extra);
      queuePreviewEntries.splice(i, 1);
    }
    for (let i = 0; i < DROP_QUEUE_SIZE; i += 1) {
      const type = dropQueue[i];
      const existing = queuePreviewEntries[i];
      if (!forceRebuild && existing && existing.type === type) continue;
      if (existing) clearPreviewEntry(existing);
      buildPreviewEntry(type, i);
    }
    emitHud();
  }

  function layoutQueuePreviewMeshes() {
    const active = queuePreviewEntries[0];
    if (active) active.root.position.copy(ghostPos);

    const { width: vpW, height: vpH } = orthoLayout.getViewportSize();
    const portrait = vpH >= vpW;
    const innerLeft = -(CUP.halfX - CUP.wallT);
    let radiusMax = 0.18;
    for (let i = 1; i <= QUEUE_STRIP_VISIBLE; i += 1) {
      const entry = queuePreviewEntries[i];
      if (!entry) continue;
      const r = FRUITS[entry.type].radius * QUEUE_PREVIEW_SCALE;
      radiusMax = Math.max(radiusMax, r);
    }
    const yTop = orthoLayout.state.orthoMidY + orthoLayout.getOrthoAhHalf();
    // Stronger top inset on portrait phones so queued balls never clip into the top edge.
    const topInset = portrait ? 0.58 : 0.42;
    const rimInset = portrait ? 0.34 : 0.26;
    const laneInset = portrait ? 0.1 : 0.04;
    const yRowByFrustum = yTop - radiusMax - QUEUE_TOP_BAND - topInset;
    const yRowByCup = CUP.wallH - radiusMax - rimInset;
    const yRowByDropLane = DROP_CENTER_Y - radiusMax * 0.32 - laneInset;
    const yRow = Math.min(yRowByFrustum, yRowByCup, yRowByDropLane);
    let cursor = innerLeft + 0.18;
    for (let i = QUEUE_STRIP_VISIBLE; i >= 1; i -= 1) {
      const entry = queuePreviewEntries[i];
      if (!entry) continue;
      const r = FRUITS[entry.type].radius * QUEUE_PREVIEW_SCALE;
      cursor += r;
      entry.root.position.set(cursor, yRow, GHOST_Z);
      cursor += r + QUEUE_STRIP_LANE;
    }
  }

  function spawnQueueSweep(type, fromPos, toPos) {
    if (!fromPos || !toPos || !Number.isFinite(type)) return;
    const visual = modeSpec.createVisual(type, FRUITS[type].radius, {
      ghost: mode === 'atoms' ? false : true,
      ...atomVisualOpts(type),
    });
    visual.root.position.copy(fromPos);
    visual.root.scale.setScalar(Math.max(0.34, QUEUE_PREVIEW_SCALE));
    visual.root.renderOrder = 18;
    scene.add(visual.root);
    queueSweepEntries.push({
      ...visual,
      from: fromPos.clone(),
      to: toPos.clone(),
      t: 0,
      dur: 0.072,
    });
  }

  function updateQueueSweep(dt) {
    for (let i = queueSweepEntries.length - 1; i >= 0; i -= 1) {
      const entry = queueSweepEntries[i];
      entry.t += dt;
      const u = Math.min(1, entry.t / entry.dur);
      const eased = u;
      entry.root.position.lerpVectors(entry.from, entry.to, eased);
      const sweepScale = QUEUE_PREVIEW_SCALE + (1 - QUEUE_PREVIEW_SCALE) * eased;
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
    const clamped = playfield.clampDropXZ(worldX, ROW_Z, collisionRadiusForType(type));
    ghostPos.set(clamped.x, DROP_CENTER_Y, GHOST_Z);
    layoutQueuePreviewMeshes();
  }

  function dropNext() {
    if (gameOver) return;
    const now = performance.now();
    if (now - lastDropTime < DROP_COOLDOWN_MS) return;
    lastDropTime = now;
    settlePileBeforeDrop();
    const queuedNext = dropQueue[1];
    const queuedNextPos = queuePreviewEntries[1]?.root.position.clone() ?? null;
    const type = pendingDropType();
    const clamped = playfield.clampDropXZ(ghostPos.x, ROW_Z, collisionRadiusForType(type));
    spawnFruit(type, clamped.x, DROP_CENTER_Y, ROW_Z);
    const last = fruits[fruits.length - 1];
    last.body.velocity.set(0, -effectiveDropVy(), 0);
    addScore(mode === 'atoms' ? 1 : 2);
    Sfx.playDrop();
    dropQueue.shift();
    dropQueue.push(rollDropTypeForLevel(level));
    syncDropQueuePreviews();
    if (queuedNextPos && Number.isFinite(queuedNext)) {
      spawnQueueSweep(queuedNext, queuedNextPos, ghostPos);
    }
  }

  function checkGameOver(dt) {
    if (gameOver) return;
    let over = false;
    for (const fruit of fruits) {
      const radius = collisionRadiusForFruit(fruit);
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
        clearRunState();
        commitWorldProgress({ silent: false, force: true });
        Sfx.playGameOver();
        onGameOver({
          open: true,
          score,
          level,
          title: modeTitle,
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

  function fullReset(clearSavedRun = false, skipBrief = false) {
    if (mode === 'atoms' && atomPlaySecAcc > 0) {
      addAtomPlaySeconds(atomPlaySecAcc);
      atomPlaySecAcc = 0;
    }
    const defaultAtomPreset =
      mode === 'atoms' && isAtomPresetName(atomWorldPhysics?.preset)
        ? atomWorldPhysics.preset
        : ATOM_PHYSICS_DEFAULT_PRESET;
    if (mode === 'atoms' && atomPhysicsPreset !== defaultAtomPreset) {
      applyAtomPhysicsPreset(defaultAtomPreset);
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
    saveAcc = 0;
    lastChemGuideLevel = 0;
    cancelVibration();
    if (clearSavedRun) clearRunState();
    onGameOver({ open: false });
    if (fxLayer) fxLayer.replaceChildren();
    backgroundFx?.setLevel?.(1);
    playfield.setBackdropImage?.(backgroundFx?.getCurrentImageUrl?.() ?? '');
    playfield.applyCupLayout();
    applyPhysicsTuning();
    syncDropQueuePreviews();
    const center = orthoLayout.canvasCenterClient();
    updateGhostAt(center.x, center.y);
    emitHud();
    if (!skipBrief) emitLevelChemistryBrief('start');
  }

  const tryMerge = createTryMerge(
    {
      getGameOver: () => gameOver,
      getMergeCooldown: () => mergeCooldown,
      mode,
      setMergeCooldown: (n) => {
        mergeCooldown = n;
      },
      juice,
      getFruits: () => fruits,
      removeFruit,
      spawnFruit,
      getCollisionRadiusForType: collisionRadiusForType,
      getCollisionRadiusForEntry: collisionRadiusForFruit,
      innerHalfXForRadius: playfield.innerHalfXForRadius,
      ROW_Z,
      FRUITS,
      MERGE_POINTS,
      MERGEABLE_TYPE_MAX,
      MERGE_DIST_MULT,
      // Disable "fusion jackpot" in atoms mode (no max-tier twin bonus).
      JACKPOT_MERGE_DIST_MULT: mode === 'atoms' ? 0 : JACKPOT_MERGE_DIST_MULT,
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
      worldId: atomWorldId,
      worldMechanics: atomWorld?.mechanics ?? [],
      getFxProfileById: (profileId, _scope = 'both') =>
        resolveFxProfileById(profileId, atomVisualLabStateCache ?? undefined),
      MOLECULE_RECIPES,
      MOLECULE_DETECT_DIST_MULT,
      getMoleculeFusionUnlocked: moleculeFusionUnlocked,
      getMoleculeMaxInputs: moleculeMaxInputsForLevel,
      getLevel: () => level,
      getDiscoveredCount: () => discoveredCount(),
      getUiNotifyAnchor: () => ({
        x: 0,
        y: Math.min(
          DROP_CENTER_Y - 0.78,
          Math.max(1.95, GAME_OVER_Y * 0.58 + DROP_CENTER_Y * 0.12),
        ),
      }),
      spawnMoleculeEntity,
      scheduleMoleculeFormationJuice: (fn) => {
        if (mode === 'atoms') setTimeout(fn, 300);
        else fn();
      },
      onMoleculeFusion: ({ recipe, points }) => {
        const displayFormula = formatChemicalFormula(recipe.formula);
        touchDiscoveredMoleculeId(recipe.id);
        emitCollectionSnapshot();
        onMolecule({
          recipe,
          formula: displayFormula,
          points,
          firstEver: false,
          atoms: summarizeMoleculeAtoms(recipe.inputs),
        });
      },
    },
    {
      mergeResult: 'nextTier',
      vfxLevel: 'normal',
      jackpotFloatTier: (points) => modeSpec.jackpotText(points),
      onJackpotTierExtra:
        mode === 'atoms'
          ? null
          : () => {
              onToast(t('game.jackpotMerge'), 'success', 'center');
            },
      onNormalMergeUi: (points, newType, nx, ny, spec) => {
        const baseMergeTextY = ny + spec.radius * 0.42;
        // Keep atom merge text readable above the pile, but avoid pinning it to mid/back-wall area.
        const mergeTextFloor = mode === 'atoms' ? Math.min(DROP_CENTER_Y - 1.1, 1.55) : -Infinity;
        const mergeTextY =
          mode === 'atoms'
            ? Math.max(
                baseMergeTextY,
                mergeTextFloor,
              )
            : baseMergeTextY;
        popFloatText(modeSpec.mergeFloat(points, spec), nx, mergeTextY, ROW_Z + 0.48, {
          color: `#${new THREE.Color(spec.color).getHexString()}`,
          variant: mode === 'atoms' ? 'atom' : mode === 'numbers' ? 'number' : 'fruit',
        });
      },
    },
  );

  function onViewportChange() {
    playfield.applyCupLayout();
    syncBackgroundSizeToCanvas();
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
  listen(window, 'beforeunload', () => {
    saveRunState();
  });
  listen(document, 'visibilitychange', () => {
    if (document.hidden) saveRunState();
  });
  if (mode === 'atoms') {
    listen(window, 'storage', (e) => {
      if (e.key !== ATOM_PHYSICS_LS_KEY || !e.newValue) return;
      try {
        const payload = JSON.parse(e.newValue);
        applyAtomPhysicsLabPayload(payload, { applyNow: true, wake: true });
      } catch {}
    });
    listen(window, 'storage', (e) => {
      if (e.key !== ATOM_VISUAL_LAB_LS_KEY || !e.newValue) return;
      try {
        const payload = JSON.parse(e.newValue);
        applyAtomVisualLabPayload(payload, { applyNow: true });
      } catch {}
    });
    if (typeof BroadcastChannel !== 'undefined') {
      atomPhysicsLabChannel = new BroadcastChannel(ATOM_PHYSICS_BROADCAST_CHANNEL);
      const onLabMessage = (event) => {
        applyAtomPhysicsLabPayload(event?.data, { applyNow: true, wake: true });
      };
      atomPhysicsLabChannel.addEventListener('message', onLabMessage);
      listeners.push(() => {
        atomPhysicsLabChannel?.removeEventListener?.('message', onLabMessage);
        atomPhysicsLabChannel?.close?.();
        atomPhysicsLabChannel = null;
      });

      atomVisualLabChannel = new BroadcastChannel(ATOM_VISUAL_LAB_BROADCAST_CHANNEL);
      const onVisualMessage = (event) => {
        applyAtomVisualLabPayload(event?.data, { applyNow: true });
      };
      atomVisualLabChannel.addEventListener('message', onVisualMessage);
      listeners.push(() => {
        atomVisualLabChannel?.removeEventListener?.('message', onVisualMessage);
        atomVisualLabChannel?.close?.();
        atomVisualLabChannel = null;
      });

      atomFxPreviewChannel = new BroadcastChannel(ATOM_FX_PREVIEW_BROADCAST_CHANNEL);
      const onFxPreviewMessage = (event) => {
        runFxPreview(event?.data ?? {});
      };
      atomFxPreviewChannel.addEventListener('message', onFxPreviewMessage);
      listeners.push(() => {
        atomFxPreviewChannel?.removeEventListener?.('message', onFxPreviewMessage);
        atomFxPreviewChannel?.close?.();
        atomFxPreviewChannel = null;
      });
    }
  }
  listen(window, 'keydown', (e) => {
    const tag = e.target?.tagName?.toLowerCase?.() ?? '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
      return;
    }
    if (e.key === 'r' || e.key === 'R') fullReset(true);
    if ((e.key === 'm' || e.key === 'M') && !e.repeat) {
      muted = Sfx.toggleMuted();
      emitHud();
    }
    if (!e.repeat && e.code === 'Numpad4') {
      setFpsVisible(!fpsVisible);
      onToast(fpsVisible ? 'FPS meter ON' : 'FPS meter OFF', 'accent');
      return;
    }
    if (mode !== 'atoms') return;
    if (!e.repeat && e.key === '1') {
      applyAtomPhysicsPreset('stable', { wake: true, announce: true });
      return;
    }
    if (!e.repeat && e.key === '2') {
      applyAtomPhysicsPreset('balanced', { wake: true, announce: true });
      return;
    }
    if (!e.repeat && e.key === '3') {
      applyAtomPhysicsPreset('juicy', { wake: true, announce: true });
      return;
    }
    if (!e.repeat && e.key === '[') {
      cycleAtomPhysicsPreset(-1);
      return;
    }
    if (!e.repeat && e.key === ']') {
      cycleAtomPhysicsPreset(1);
    }
  });

  const timer = new THREE.Timer();
  timer.connect(document);
  timer.reset();
  let acc = 0;
  const lowPerfAtoms = mode === 'atoms' && lowPerfDevice;
  const fixed = mode === 'atoms' ? (lowPerfAtoms ? 1 / 90 : 1 / 100) : 1 / 120;
  const PHYS_SUBSTEPS = mode === 'atoms' ? (lowPerfAtoms ? 2 : 2) : 3;

  function tick(timestamp) {
    if (destroyed) return;
    rafId = requestAnimationFrame(tick);
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 0.05);
    if (fpsVisible) {
      fpsSampleSec += dt;
      fpsSampleFrames += 1;
      if (fpsSampleSec >= 0.22) {
        fpsCurrent = Math.round(fpsSampleFrames / fpsSampleSec);
        fpsSampleSec = 0;
        fpsSampleFrames = 0;
        if (fpsTextEl) fpsTextEl.textContent = `FPS ${fpsCurrent}`;
      }
    }
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
      saveAcc += dt;
      if (saveAcc >= 0.8) {
        saveAcc = 0;
        saveRunState();
      }
    }

    if (mergeCooldown > 0) mergeCooldown -= 1;

    for (const fruit of fruits) {
      fruit.body.position.z = ROW_Z;
      fruit.body.velocity.z = 0;
      const balancedPreset = mode === 'atoms' && usesCalmAtomPreset();
      const maxSideVel = mode === 'atoms' ? 2.1 : 2.35;
      // Balanced preset: allow a bit more upward response so atom-to-atom hits
      // feel alive (small rebound) while still capped for pile stability.
      const maxUpVel = mode === 'atoms' ? (balancedPreset ? 1.52 : 1.25) : 0.82;
      const maxDownVel = 14.2;
      fruit.body.velocity.x = Math.max(-maxSideVel, Math.min(maxSideVel, fruit.body.velocity.x));
      fruit.body.velocity.y = Math.max(-maxDownVel, Math.min(maxUpVel, fruit.body.velocity.y));
      if (mode === 'atoms') {
        const maxSpin = 1.1;
        fruit.body.angularVelocity.x = Math.max(-maxSpin, Math.min(maxSpin, fruit.body.angularVelocity.x));
        fruit.body.angularVelocity.y = Math.max(-maxSpin, Math.min(maxSpin, fruit.body.angularVelocity.y));
        fruit.body.angularVelocity.z = Math.max(-maxSpin, Math.min(maxSpin, fruit.body.angularVelocity.z));
      }
      const radius = collisionRadiusForFruit(fruit);
      const limit = playfield.innerHalfXForRadius(radius);
      const preClampVx = fruit.body.velocity.x;
      if (fruit.body.position.x > limit) {
        fruit.body.position.x = limit;
        fruit.body.velocity.x *= -physicsTuning.wallVelRetain;
        if (balancedPreset) {
          // Only damp vertical velocity on real wall impact.
          const wallImpact = Math.abs(preClampVx) > 0.11;
          fruit.body.velocity.x = 0;
          if (wallImpact) fruit.body.velocity.y *= 0.9;
          fruit.body.angularVelocity.x *= 0.12;
          fruit.body.angularVelocity.y *= 0.12;
          fruit.body.angularVelocity.z *= 0.1;
        }
      } else if (fruit.body.position.x < -limit) {
        fruit.body.position.x = -limit;
        fruit.body.velocity.x *= -physicsTuning.wallVelRetain;
        if (balancedPreset) {
          // Only damp vertical velocity on real wall impact.
          const wallImpact = Math.abs(preClampVx) > 0.11;
          fruit.body.velocity.x = 0;
          if (wallImpact) fruit.body.velocity.y *= 0.9;
          fruit.body.angularVelocity.x *= 0.12;
          fruit.body.angularVelocity.y *= 0.12;
          fruit.body.angularVelocity.z *= 0.1;
        }
      }
      if (balancedPreset) {
        const nearWall = Math.abs(fruit.body.position.x) > limit - Math.max(0.03, radius * 0.06);
        if (nearWall) {
          fruit.body.velocity.x *= 0.52;
          fruit.body.angularVelocity.x *= 0.5;
          fruit.body.angularVelocity.y *= 0.5;
          fruit.body.angularVelocity.z *= 0.34;
          if (Math.abs(fruit.body.velocity.x) < 0.055) fruit.body.velocity.x = 0;
          if (Math.abs(fruit.body.angularVelocity.z) < 0.08) fruit.body.angularVelocity.z = 0;
        }
      }
      let justBouncedFromFloor = false;
      const minY = radius - 0.006;
      if (fruit.body.position.y < minY) {
        const impactVy = fruit.body.velocity.y;
        fruit.body.position.y = minY;
        if (mode === 'atoms') {
          // Keep a readable "marble hit" on floor contact.
          const impactThreshold = balancedPreset ? -0.44 : -1.25;
          const reboundScale = balancedPreset ? 0.34 : 0.12;
          const reboundCap = balancedPreset ? 0.92 : 0.34;
          if (impactVy < impactThreshold) {
            fruit.body.velocity.y = Math.min(reboundCap, -impactVy * reboundScale);
            justBouncedFromFloor = true;
          } else {
            fruit.body.velocity.y = Math.max(0, impactVy);
          }
        } else {
          fruit.body.velocity.y = Math.max(0, impactVy);
        }
      }
      const nearFloor = fruit.body.position.y <= minY + Math.max(0.03, radius * 0.05);
      if (nearFloor) {
        const floorVelDamp = mode === 'atoms' ? (balancedPreset ? 0.8 : 0.9) : 0.78;
        const floorAngDamp = mode === 'atoms' ? (balancedPreset ? 0.34 : 0.9) : 0.72;
        fruit.body.velocity.x *= floorVelDamp;
        if (mode === 'atoms') {
          // Do not kill rebound immediately: let small hop happen, then settle.
          if (justBouncedFromFloor || fruit.body.velocity.y > 0.06) {
            fruit.body.velocity.y *= balancedPreset ? 1 : 0.92;
          } else {
            fruit.body.velocity.y *= balancedPreset ? 0.74 : 0.86;
          }
        }
        fruit.body.angularVelocity.x *= floorAngDamp;
        fruit.body.angularVelocity.y *= floorAngDamp;
        fruit.body.angularVelocity.z *= floorAngDamp;
        if (balancedPreset) {
          if (Math.abs(fruit.body.angularVelocity.x) < 0.075) fruit.body.angularVelocity.x = 0;
          if (Math.abs(fruit.body.angularVelocity.y) < 0.075) fruit.body.angularVelocity.y = 0;
          if (Math.abs(fruit.body.angularVelocity.z) < 0.09) fruit.body.angularVelocity.z = 0;
        }
        if (Math.abs(fruit.body.velocity.x) < (mode === 'atoms' ? (balancedPreset ? 0.085 : 0.045) : 0.04)) {
          fruit.body.velocity.x = 0;
        }
        if (
          !justBouncedFromFloor &&
          Math.abs(fruit.body.velocity.y) < (mode === 'atoms' ? (balancedPreset ? 0.082 : 0.05) : 0.08)
        ) {
          fruit.body.velocity.y = 0;
        }
        const v2 =
          fruit.body.velocity.x * fruit.body.velocity.x +
          fruit.body.velocity.y * fruit.body.velocity.y;
        const w2 =
          fruit.body.angularVelocity.x * fruit.body.angularVelocity.x +
          fruit.body.angularVelocity.y * fruit.body.angularVelocity.y +
          fruit.body.angularVelocity.z * fruit.body.angularVelocity.z;
        const sleepV2 = mode === 'atoms' ? (balancedPreset ? 0.012 : 0.0026) : 0.0024;
        const sleepW2 = mode === 'atoms' ? (balancedPreset ? 0.18 : 0.12) : 0.35;
        if (!justBouncedFromFloor && v2 < sleepV2 && w2 < sleepW2 && fruit.body.sleepState === 0) {
          if (balancedPreset) {
            fruit.body.velocity.set(0, 0, 0);
            fruit.body.angularVelocity.set(0, 0, 0);
          }
          fruit.body.sleep();
        }
      }
      const topSoftCap = GAME_OVER_Y + radius * 1.24;
      if (fruit.body.position.y > topSoftCap) {
        fruit.body.position.y = topSoftCap;
        fruit.body.velocity.y = Math.min(fruit.body.velocity.y, 0.18);
      }
      syncFruitVisualPosition(fruit);
      fruit.rotationTarget.quaternion.copy(fruit.body.quaternion);
      if (fruit.fusionDur != null) {
        fruit.fusionT += dt;
        const u = Math.min(1, fruit.fusionT / fruit.fusionDur);
        if (mode === 'atoms') {
          const pulse = u < 0.22 ? 1 + u * 0.08 : 1.018 + Math.sin(u * Math.PI) * 0.032;
          fruit.root.scale.setScalar(pulse);
        } else {
          const squash = u < 0.22 ? 1 - u * 0.26 : 0.94 + Math.sin(u * Math.PI) * 0.12;
          const stretch = u < 0.22 ? 1 + u * 0.42 : 1.06 - (u - 0.22) * 0.08;
          fruit.root.scale.set(squash, stretch, squash);
        }
        if (u >= 1) {
          fruit.fusionDur = null;
          fruit.root.scale.setScalar(1);
        }
      }
      if (Array.isArray(fruit.spinNodes) && fruit.spinNodes.length > 0) {
        const spinScale = fruit.body.sleepState === 2 ? 0.18 : 0.35;
        for (const spin of fruit.spinNodes) {
          if (!spin?.node) continue;
          spin.node.rotation.x += dt * (spin.x ?? 0) * spinScale;
          spin.node.rotation.y += dt * (spin.y ?? 0) * spinScale;
          spin.node.rotation.z += dt * (spin.z ?? 0) * spinScale;
        }
      }
    }
    // Atoms mode always runs cleanup assist to keep dense piles stable.
    if (shouldUseAtomAssist()) {
      relaxPileOverlaps();
      calmDensePile();
      lockDeepPileLayers();
    }

    updateJackpotVanishes(dt);
    updateMoleculeEntities(dt);
    maybeEmitMoleculeHint(dt);
    maybeEmitNearMergeBondHint(dt);
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
    syncBackgroundSizeToCanvas();
    backgroundFx?.update?.(dt);
    if (topControlsEl) {
      syncHudRowToPlayfieldX({ camera, canvasEl, CUP, ROW_Z, rowEl: topControlsEl });
    }
    {
      const aimType = pendingDropType();
      const aimSpec = FRUITS[aimType];
      const aimClamp = playfield.clampDropXZ(ghostPos.x, ROW_Z, collisionRadiusForType(aimType));
      juice.updateDropAimSight?.({
        active: !gameOver,
        worldX: aimClamp.x,
        yTop: DROP_CENTER_Y,
        yBottom: 0.06,
        worldZ: ROW_Z + 0.1,
        color: aimSpec?.color ?? 0xe8f4ff,
        dt,
      });
    }
    juice.updateParticles(dt);
    renderer.render(scene, camera);
    emitHud();
  }

  if (mode === 'atoms') {
    applyAtomVisualLabPayload(readAtomVisualLabPayload() ?? {}, {
      force: true,
      applyNow: false,
    });
  }
  playfield.applyCupLayout();
  syncBackgroundSizeToCanvas();
  backgroundFx?.setLevel?.(level);
  playfield.setBackdropImage?.(backgroundFx?.getCurrentImageUrl?.() ?? '');
  applyPhysicsTuning();
  const restored = restoreRunState(loadRunState());
  backgroundFx?.setLevel?.(level);
  playfield.setBackdropImage?.(backgroundFx?.getCurrentImageUrl?.() ?? '');
  syncDropQueuePreviews();
  const center = orthoLayout.canvasCenterClient();
  updateGhostAt(center.x, center.y);
  emitHud();
  if (mode === 'atoms') {
    emitCollectionSnapshot();
    emitLevelChemistryBrief('start');
  }
  if (!restored) {
    saveRunState();
  }
  tick();

  return {
    restart() {
      Sfx.resume();
      commitWorldProgress({ silent: true, force: true });
      fullReset(true);
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
      commitWorldProgress({ silent: true, force: true });
      if (fpsTextEl) {
        fpsTextEl.remove();
        fpsTextEl = null;
      }
      listeners.splice(0).forEach((off) => off());
      if (mode === 'atoms' && atomPlaySecAcc > 0) {
        addAtomPlaySeconds(atomPlaySecAcc);
        atomPlaySecAcc = 0;
      }
      saveRunState();
      fullReset(false, true);
      backgroundFx?.dispose?.();
      juice.dispose?.();
      renderer.dispose();
      timer.dispose();
      if (scene.environment?.userData?.pmremTarget) {
        scene.environment.userData.pmremTarget.dispose?.();
      }
      host.replaceChildren();
    },
    commitProgress(silent = true) {
      commitWorldProgress({ silent: !!silent, force: true });
    },
  };
}
