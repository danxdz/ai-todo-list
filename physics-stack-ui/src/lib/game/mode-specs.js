import * as THREE from 'three';
import * as fruitConfig from './config.js';
import * as numbersConfig from './config-numbers.js';
import * as atomsConfig from './config-atoms.js';
import {
  createNumberDigitPlane,
  setNumberPlaneScale,
  placeDigitPlaneInFrontOfSphere,
} from './ball-label-sprite.js';
import { drawElementFace2d } from './atoms-element-face.js';
import { getAtomBallStyle } from './atom-ball-style.js';
import { getEquippedAtomSkinDef } from './atom-skins.js';
import { atomFact, atomName, fruitLabel, numberFact, t } from '../app-i18n';

function disposeMaterial(mat) {
  if (!mat) return;
  if (Array.isArray(mat)) {
    mat.forEach(disposeMaterial);
    return;
  }
  mat.map?.dispose?.();
  mat.roughnessMap?.dispose?.();
  mat.normalMap?.dispose?.();
  mat.dispose?.();
}

function disposeObject(root) {
  root?.traverse?.((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) disposeMaterial(obj.material);
  });
}

function makeNoiseMap() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 124 + Math.random() * 108;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function makeRadialTexture(spec, drawExtra) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const color = new THREE.Color(spec.color);
  const hi = color.clone().offsetHSL(0, 0, 0.16);
  const lo = color.clone().offsetHSL(0, 0.03, -0.22);
  const g = ctx.createRadialGradient(size * 0.34, size * 0.3, size * 0.06, size * 0.5, size * 0.52, size * 0.64);
  g.addColorStop(0, `#${hi.getHexString()}`);
  g.addColorStop(0.52, `#${color.getHexString()}`);
  g.addColorStop(1, `#${lo.getHexString()}`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  if (spec.phase === 'liquid') {
    const shine = ctx.createLinearGradient(size * 0.2, size * 0.2, size * 0.8, size * 0.74);
    shine.addColorStop(0, 'rgba(255,255,255,0.2)');
    shine.addColorStop(0.5, 'rgba(255,255,255,0.03)');
    shine.addColorStop(1, 'rgba(255,255,255,0.16)');
    ctx.fillStyle = shine;
    ctx.fillRect(size * 0.16, size * 0.16, size * 0.68, size * 0.68);
  } else if (spec.family === 'metalloid') {
    ctx.fillStyle = 'rgba(245, 235, 190, 0.12)';
    for (let i = 0; i < 120; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillRect(x, y, 1.2, 1.2);
    }
  }

  drawExtra?.(ctx, size, spec);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFruitVisual(type, radius, { ghost = false } = {}) {
  const spec = fruitConfig.FRUITS[type];
  const material = new THREE.MeshPhysicalMaterial({
    color: spec.color,
    roughness: ghost ? 0.14 : 0.28,
    metalness: 0.04,
    transmission: ghost ? 0.82 : 0.16,
    thickness: ghost ? 1.05 : 0.5,
    clearcoat: 0.42,
    clearcoatRoughness: 0.18,
    emissive: spec.color,
    emissiveIntensity: ghost ? 0.2 : 0.06 + type * 0.015,
    envMapIntensity: 1,
    transparent: ghost,
    opacity: ghost ? 0.68 : 1,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), material);
  ball.castShadow = !ghost;
  ball.receiveShadow = true;
  return {
    root: ball,
    rotationTarget: ball,
    glowTarget: ball,
    dispose: () => disposeObject(ball),
  };
}

function createNumberVisual(type, radius, { ghost = false } = {}) {
  const spec = numbersConfig.FRUITS[type];
  const roughnessMap = makeNoiseMap();
  const faceMap = makeRadialTexture(spec);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: faceMap,
    roughnessMap,
    roughness: ghost ? 0.16 : 0.24,
    metalness: 0,
    transmission: ghost ? 0.76 : 0.24,
    thickness: ghost ? 0.95 : 0.62,
    clearcoat: 0.36,
    clearcoatRoughness: 0.1,
    attenuationColor: spec.color,
    attenuationDistance: 0.52 + type * 0.04,
    emissive: spec.color,
    emissiveIntensity: ghost ? 0.16 : 0.03 + type * 0.01,
    envMapIntensity: 1.05,
    transparent: ghost,
    opacity: ghost ? 0.72 : 1,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), material);
  const label = createNumberDigitPlane(spec);
  setNumberPlaneScale(label, radius);
  placeDigitPlaneInFrontOfSphere(label, radius);
  ball.add(label);
  ball.castShadow = !ghost;
  ball.receiveShadow = true;
  const root = new THREE.Group();
  root.add(ball);
  return {
    root,
    rotationTarget: ball,
    glowTarget: ball,
    dispose: () => {
      roughnessMap.dispose();
      faceMap.dispose();
      disposeObject(root);
    },
  };
}

function createAtomVisual(type, radius, { ghost = false } = {}) {
  const spec = atomsConfig.FRUITS[type];
  const skin = getEquippedAtomSkinDef();
  const skinId = skin?.id ?? 'default';
  const roughnessMap = makeNoiseMap();
  const faceMap = makeRadialTexture(spec, (ctx, size, data) => drawElementFace2d(ctx, size, data));
  const style = getAtomBallStyle(type, spec, skinId);
  const material = new THREE.MeshPhysicalMaterial({
    color: style.color,
    map: faceMap,
    roughnessMap,
    roughness: ghost ? Math.min(0.18, style.roughness) : style.roughness,
    metalness: ghost ? style.metalness * 0.6 : style.metalness,
    transmission: ghost ? Math.min(0.82, style.transmission + 0.14) : style.transmission,
    thickness: style.thickness,
    clearcoat: style.clearcoat,
    clearcoatRoughness: style.clearcoatRoughness,
    ior: style.ior,
    attenuationColor: style.color,
    attenuationDistance: 0.46 + type * 0.06,
    emissive: style.emissive,
    emissiveIntensity: ghost ? (style.emissiveIntensity ?? 0.05) + 0.08 : Math.max(0.04, style.emissiveIntensity ?? 0.03),
    envMapIntensity: style.envMapIntensity,
    transparent: ghost,
    opacity: ghost ? 0.74 : 1,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), material);
  const root = new THREE.Group();
  if (spec.phase === 'liquid') {
    const flowBand = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.84, radius * 0.055, 10, 54),
      new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: ghost ? 0.16 : 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    flowBand.rotation.x = 1.08;
    flowBand.rotation.y = 0.42;
    root.add(flowBand);
  }

  if (spec.phase === 'gas' || skinId === 'neon_glow' || skinId === 'bio_luminescent') {
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(
        radius *
          (skinId === 'neon_glow'
            ? 1.48
            : skinId === 'bio_luminescent'
              ? 1.4
              : spec.family === 'noble-gas'
                ? 1.28
                : 1.18),
        22,
        18,
      ),
      new THREE.MeshBasicMaterial({
        color:
          skinId === 'neon_glow'
            ? 0x6f8cff
            : skinId === 'bio_luminescent'
              ? 0x69ffc7
              : spec.color,
        transparent: true,
        opacity:
          ghost
            ? 0.12
            : skinId === 'neon_glow'
              ? 0.2
              : skinId === 'bio_luminescent'
                ? 0.18
                : spec.family === 'noble-gas'
                  ? 0.09
                  : 0.06,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    root.add(halo);
  }

  if (spec.family === 'transition-metal' && spec.phase !== 'gas') {
    const sheen = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.03, 20, 16),
      new THREE.MeshBasicMaterial({
        color: 0xfff0cc,
        transparent: true,
        opacity: ghost ? 0.07 : 0.11,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    root.add(sheen);
  }

  if (spec.family === 'halogen') {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.06, radius * 0.018, 8, 60),
      new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: ghost ? 0.18 : 0.24,
        depthWrite: false,
      }),
    );
    rim.rotation.x = 0.86;
    root.add(rim);
  }

  if (skinId === 'plasma_core' || skinId === 'fire_plasma') {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.46, 20, 16),
      new THREE.MeshBasicMaterial({
        color: skinId === 'fire_plasma' ? 0xff5e33 : 0xffbb82,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      }),
    );
    root.add(core);
  }

  if (skinId === 'bohr_classic' || skinId === 'golden_ratio') {
    const ringColor = skinId === 'golden_ratio' ? 0xffcc66 : 0xa8c9ff;
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.18, radius * 0.022, 10, 80), ringMat);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.18, radius * 0.022, 10, 80), ringMat.clone());
    ringA.rotation.x = 0.8;
    ringB.rotation.y = 0.72;
    root.add(ringA);
    root.add(ringB);
  }

  if (skinId === 'quantum_wave' || skinId === 'electron_cloud' || skinId === 'ice_lattice') {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.28, 20, 16),
      new THREE.MeshBasicMaterial({
        color: skinId === 'ice_lattice' ? 0x8fd9ff : 0xb8c8ff,
        transparent: true,
        opacity: skinId === 'electron_cloud' ? 0.17 : 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    root.add(cloud);
  }

  if (skinId === 'stellar_nucleosynthesis' || skinId === 'dark_matter') {
    const starColor = skinId === 'dark_matter' ? 0x9fa8ff : 0xb7dcff;
    for (let i = 0; i < 4; i += 1) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.06, 8, 6),
        new THREE.MeshBasicMaterial({
          color: starColor,
          transparent: true,
          opacity: 0.74,
          depthWrite: false,
        }),
      );
      const a = (Math.PI * 2 * i) / 4 + (type % 3) * 0.35;
      star.position.set(Math.cos(a) * radius * 1.22, Math.sin(a) * radius * 0.52, radius * 0.22);
      root.add(star);
    }
  }

  root.add(ball);
  ball.castShadow = !ghost;
  ball.receiveShadow = true;
  return {
    root,
    rotationTarget: ball,
    glowTarget: ball,
    dispose: () => {
      roughnessMap.dispose();
      faceMap.dispose();
      disposeObject(root);
    },
  };
}

const SPECS = {
  fruit: {
    id: 'fruit',
    get title() {
      return t('mode.fruit.title');
    },
    themeId: 'marble',
    config: fruitConfig,
    createVisual: createFruitVisual,
    levelTag(level) {
      if (level >= 10) return t('mode.fruit.tier.crown');
      if (level >= 7) return t('mode.fruit.tier.meteor');
      if (level >= 4) return t('mode.fruit.tier.turbo');
      return t('mode.fruit.tier.warmup');
    },
    queueLabel(type) {
      return fruitLabel(type);
    },
    jackpotText(points) {
      return t('mode.fruit.jackpot', { points });
    },
    mergeToast(_type, spec) {
      const label = fruitLabel(fruitConfig.FRUITS.indexOf(spec));
      return label;
    },
    mergeFloat(points) {
      return `+${points}`;
    },
    rollDropType() {
      return Math.floor(Math.random() * (fruitConfig.DROP_TYPE_MAX + 1));
    },
  },
  numbers: {
    id: 'numbers',
    get title() {
      return t('mode.numbers.title');
    },
    themeId: 'numbers',
    config: numbersConfig,
    createVisual: createNumberVisual,
    levelTag(level) {
      return t('mode.numbers.wave', { level });
    },
    queueLabel(type) {
      return `${numbersConfig.FRUITS[type]?.number ?? type + 1}`;
    },
    jackpotText(points) {
      return t('mode.numbers.jackpot', { points });
    },
    mergeToast(_type, spec) {
      return `${spec.number}`;
    },
    mergeFloat(points, spec) {
      return `+${points} -> ${spec.number}`;
    },
    rollDropType(level) {
      const unlocked = Math.min(numbersConfig.DROP_TYPE_MAX, numbersConfig.DROP_START_MAX_INDEX + Math.floor(level / 2));
      return Math.floor(Math.random() * (unlocked + 1));
    },
  },
  atoms: {
    id: 'atoms',
    get title() {
      return t('mode.atoms.title');
    },
    themeId: 'atoms',
    config: atomsConfig,
    createVisual: createAtomVisual,
    levelTag(level) {
      if (level >= 10) return t('mode.atoms.tier.apex');
      if (level >= 7) return t('mode.atoms.tier.fusion');
      if (level >= 4) return t('mode.atoms.tier.growth');
      return t('mode.atoms.tier.discovery');
    },
    queueLabel(type) {
      return atomsConfig.FRUITS[type]?.symbol ?? `Z${type + 1}`;
    },
    jackpotText(points) {
      return t('mode.atoms.jackpot', { points });
    },
    mergeToast(_type, spec) {
      return `${spec.symbol}`;
    },
    mergeFloat(points, spec) {
      return `+${points} ${spec.symbol}`;
    },
    rollDropType() {
      return Math.floor(Math.random() * (atomsConfig.DROP_TYPE_MAX + 1));
    },
  },
};

export function getModeSpec(mode) {
  return SPECS[mode] ?? SPECS.fruit;
}
