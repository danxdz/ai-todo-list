import * as THREE from 'three';
import * as fruitConfig from './config.js';
import * as numbersConfig from './config-numbers.js';
import * as atomsConfig from './config-atoms.js';
import {
  createNumberDigitPlane,
  placeDigitPlaneInFrontOfSphere,
  setNumberPlaneScale,
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

function createElectronOrbitBand({
  atomRadius,
  orbitRadius,
  thickness,
  colorValue,
  opacity,
  seed = 0,
  ghost = false,
}) {
  const group = new THREE.Group();
  const ringThickness = Math.max(atomRadius * 0.0024, thickness * 0.22);
  const arcCount = Math.max(3, Math.min(6, Math.round(3 + orbitRadius / Math.max(atomRadius * 0.42, 0.01))));
  const arcMaterial = new THREE.MeshBasicMaterial({
    color: colorValue,
    transparent: true,
    opacity: opacity * (ghost ? 0.07 : 0.12),
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (let i = 0; i < arcCount; i += 1) {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(orbitRadius + i * ringThickness * 0.2, ringThickness * 0.82, 8, 48),
      arcMaterial.clone(),
    );
    arc.rotation.z = seed * 0.9 + i * 0.48;
    arc.scale.set(1, 0.96 + i * 0.02, 1);
    group.add(arc);
  }

  const dotCount = Math.max(10, Math.min(22, Math.round(10 + orbitRadius / Math.max(atomRadius * 0.28, 0.01) * 2.4)));
  const dotRadius = Math.max(atomRadius * 0.038, thickness * 0.9, 0.008);
  const glowRadius = dotRadius * 2.2;
  const dotColor = new THREE.Color(colorValue).offsetHSL(0, 0.05, 0.12);
  const arcWindows = [
    [0.04 + seed * 0.011, 0.18 + seed * 0.011],
    [0.28 + seed * 0.009, 0.46 + seed * 0.009],
    [0.58 + seed * 0.007, 0.76 + seed * 0.007],
    [0.84 + seed * 0.005, 0.96 + seed * 0.005],
  ];

  for (let step = 0; step < dotCount; step += 1) {
    const u = step / dotCount;
    const wrapped = ((u % 1) + 1) % 1;
    const inArc = arcWindows.some(([start, end]) => {
      const s = ((start % 1) + 1) % 1;
      const e = ((end % 1) + 1) % 1;
      return s <= e ? wrapped >= s && wrapped <= e : wrapped >= s || wrapped <= e;
    });
    if (!inArc) continue;

    const angle = wrapped * Math.PI * 2;
    const radialJitter = 1 + Math.sin(angle * 3.4 + seed * 4.2) * 0.05;
    const zWobble = Math.sin(angle * 2.4 + seed * 3.1) * thickness * 4.8;
    const x = Math.cos(angle) * orbitRadius * radialJitter;
    const y = Math.sin(angle) * orbitRadius * 0.98 * radialJitter;

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(glowRadius, 8, 6),
      new THREE.MeshBasicMaterial({
        color: dotColor,
        transparent: true,
        opacity: opacity * (ghost ? 0.09 : 0.14),
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.position.set(x, y, zWobble);
    group.add(glow);

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(dotRadius, 8, 6),
      new THREE.MeshBasicMaterial({
        color: dotColor,
        transparent: true,
        opacity: opacity * (ghost ? 0.54 : 0.88),
        depthWrite: false,
      }),
    );
    dot.position.set(x, y, zWobble);
    group.add(dot);
  }

  return group;
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

function mergeAtomSpecForPreview(base, override) {
  if (!override || typeof override !== 'object') return base;
  if (Number(override.atomicNumber) !== Number(base?.atomicNumber)) return base;
  return {
    ...base,
    ...override,
    visual: { ...(base?.visual ?? {}), ...(override?.visual ?? {}) },
  };
}

function createAtomVisual(type, radius, { ghost = false, spec: specOverride } = {}) {
  const baseSpec = atomsConfig.getActiveAtomSpec(type) ?? atomsConfig.FRUITS[type];
  const spec = mergeAtomSpecForPreview(baseSpec, specOverride);
  const skin = getEquippedAtomSkinDef();
  const skinId = skin?.id ?? 'default';
  const visual = atomsConfig.getAtomVisualProfile?.(spec) ?? atomsConfig.ATOM_VISUAL_DEFAULTS;
  const roughnessMap = makeNoiseMap();
  const faceSpec =
    skinId === 'bohr_classic'
      ? {
          ...spec,
          visual: { ...(spec?.visual ?? {}), bohrFace: true },
        }
      : spec;
  const faceMap = makeRadialTexture(faceSpec, (ctx, size, data) => drawElementFace2d(ctx, size, data));
  const style = getAtomBallStyle(type, spec, skinId);
  const spinNodes = [];
  const decorativeSkin = skinId !== 'default';
  const explicitLayers = Array.isArray(spec?.layers) ? spec.layers.filter((layer) => layer?.enabled !== false) : [];
  const coreRadius = radius * (visual.coreScale ?? 0.84);
  const nucleusScale = visual.nucleusScale ?? 0.12;
  const nucleusOpacity = visual.nucleusOpacity ?? 0.8;
  const cloudOpacity = visual.cloudOpacity ?? 0.11;
  const cloudSpin = visual.cloudSpin ?? 0.12;
  const shellRadius = visual.shellRadius ?? 1.08;
  const shellThickness = visual.shellThickness ?? 0.018;
  const shellOpacity = visual.shellOpacity ?? 0.08;
  const shellSpin = visual.shellSpin ?? 0.16;
  const coreColor = Number.isFinite(visual.coreColor) ? Number(visual.coreColor) : style.color;
  /** Body color from data (`spec.color`); outer layers default to this instead of profile whites (electron/halo mix). */
  const primaryChroma =
    Number.isFinite(spec?.color) ? ((Math.floor(Number(spec.color)) >>> 0) & 0xffffff) : coreColor;
  const material = new THREE.MeshPhysicalMaterial({
    color: coreColor,
    map: faceMap,
    roughnessMap,
    roughness: ghost ? Math.min(0.18, style.roughness) : style.roughness,
    metalness: ghost ? style.metalness * 0.6 : style.metalness,
    transmission: ghost ? Math.min(0.82, style.transmission + 0.14) : style.transmission,
    thickness: style.thickness,
    clearcoat: style.clearcoat,
    clearcoatRoughness: style.clearcoatRoughness,
    ior: style.ior,
    attenuationColor: coreColor,
    attenuationDistance: 0.46 + type * 0.06,
    emissive: style.emissive,
    emissiveIntensity: ghost ? (style.emissiveIntensity ?? 0.05) + 0.08 : Math.max(0.04, style.emissiveIntensity ?? 0.03),
    envMapIntensity: style.envMapIntensity,
    transparent: ghost,
    opacity: ghost ? 0.74 : 1,
  });
  const root = new THREE.Group();
  let ball = null;
  let rotationTarget = null;
  let glowTarget = null;

  function buildLayeredAtom() {
    if (explicitLayers.length <= 0) return false;
    const defaultCoreColor = Number.isFinite(visual.coreColor) ? Number(visual.coreColor) : style.color;
    const defaultNucleusColor = primaryChroma;
    const defaultCloudColor = primaryChroma;
    const defaultShellColor = primaryChroma;
    const defaultHaloColor = primaryChroma;

    let primaryCoreAssigned = false;
    for (let index = 0; index < explicitLayers.length; index += 1) {
      const layer = explicitLayers[index];
      const typeName = String(layer?.type ?? '').toLowerCase();
      const sizePct = Math.max(0, Number(layer?.sizePct ?? 100) || 0);
      const layerRadius = radius * (sizePct / 100);
      const opacityBase = Math.max(0, Math.min(1, (Number(layer?.opacityPct ?? 100) || 0) / 100));
      const glowBase = Math.max(0, Math.min(1, (Number(layer?.glowPct ?? 0) || 0) / 100));
      const spinBase = Math.max(0, Number(layer?.spinPct ?? 0) || 0) / 100;
      const copies = Math.max(1, Math.round(Number(layer?.count ?? 1) || 1));
      const colorValue =
        Number.isFinite(layer?.color)
          ? Number(layer.color)
          : typeName === 'outline'
            ? defaultCoreColor
          : typeName === 'nucleus'
            ? defaultNucleusColor
            : typeName === 'cloud'
              ? defaultCloudColor
              : typeName === 'shell'
                ? defaultShellColor
                : typeName === 'halo'
                  ? defaultHaloColor
                  : defaultCoreColor;

      if (typeName === 'outline') {
        const outlineOpacity = ghost ? opacityBase * 0.5 : opacityBase;
        const thicknessPct = Math.max(0, Number(layer?.thicknessPct ?? 35) || 0) / 100;
        const extra = Math.max(radius * 0.004, radius * (0.01 + thicknessPct * 0.06));
        const outlineRadius = Math.max(0.0005, layerRadius + extra);
        const mat = new THREE.MeshBasicMaterial({
          color: colorValue,
          transparent: true,
          opacity: outlineOpacity,
          depthWrite: false,
          side: THREE.BackSide,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
        const outline = new THREE.Mesh(new THREE.SphereGeometry(outlineRadius, 24, 18), mat);
        outline.renderOrder = index * 10;
        root.add(outline);
        if (spinBase > 0.001) {
          spinNodes.push({ node: outline, x: 0, y: spinBase * 0.25, z: 0 });
        }
        continue;
      }

      if (layerRadius <= 0.0005 && typeName !== 'shell') continue;

      if (typeName === 'shell') {
        const shellOpacityPct = ghost ? opacityBase * 0.6 : opacityBase;
        const shellOpacity = shellOpacityPct * 0.52;
        const shellThicknessPct = Math.max(0, Number(layer?.thicknessPct ?? 45) || 0) / 100;
        const shellThickness = Math.max(radius * 0.0035, radius * 0.08 * shellThicknessPct);
        const orbitRadiusMul = Math.max(0, Number(layer?.orbitRadiusPct ?? 100) || 0) / 100;
        const spreadMul = Math.max(0, Number(layer?.spreadPct ?? 36) || 0) / 100;
        const tiltMul = Math.max(0, Number(layer?.tiltPct ?? 58) || 0) / 100;
        for (let i = 0; i < copies; i += 1) {
          const orbitRadius = Math.max(
            radius * 0.08,
            layerRadius * Math.max(0.2, orbitRadiusMul) + radius * i * (0.03 + spreadMul * 0.09),
          );
          const shell = createElectronOrbitBand({
            atomRadius: radius,
            orbitRadius,
            thickness: shellThickness,
            colorValue,
            opacity: shellOpacity,
            seed: i + index * 0.7,
            ghost,
          });
          const tilt = 0.18 + tiltMul * 1.04;
          shell.rotation.x = tilt + i * (0.32 + tiltMul * 0.3) + index * 0.06;
          shell.rotation.y = 0.12 + i * (0.22 + tiltMul * 0.2) + index * 0.05;
          shell.renderOrder = index * 10;
          root.add(shell);
          spinNodes.push({
            node: shell,
            x: 0,
            y: spinBase * (1.25 + spreadMul * 0.8) * (i % 2 === 0 ? 1 : -1),
            z: spinBase * (0.4 + tiltMul * 0.45) * (i % 2 === 0 ? 1 : -1),
          });
        }
        continue;
      }

      const isPrimaryCore = typeName === 'core' && !primaryCoreAssigned;
      const useFaceMap = isPrimaryCore;
      const blendHint =
        layer?.blend === 'additive' || layer?.blend === 'normal' ? layer.blend : null;
      const defaultBlend = typeName === 'halo' ? 'additive' : 'normal';
      const blendMode = blendHint ?? defaultBlend;
      const isAdditive = blendMode === 'additive';
      const opacity =
        ghost
          ? opacityBase * (isAdditive ? 0.6 : 0.74)
          : isAdditive
            ? opacityBase * 0.34
            : opacityBase;
      const useCloudNoiseMask = typeName === 'cloud' && layer?.noiseMask === true;
      const sphereMaterial =
        typeName === 'core'
          ? new THREE.MeshPhysicalMaterial({
              color: colorValue,
              ...(useFaceMap ? { map: faceMap, roughnessMap } : {}),
              roughness: ghost ? Math.min(0.18, style.roughness) : style.roughness,
              metalness: ghost ? style.metalness * 0.6 : style.metalness,
              transmission: ghost ? Math.min(0.82, style.transmission + 0.14) : style.transmission,
              thickness: style.thickness,
              clearcoat: style.clearcoat,
              clearcoatRoughness: style.clearcoatRoughness,
              ior: style.ior,
              attenuationColor: colorValue,
              attenuationDistance: 0.46 + type * 0.06,
              emissive: style.emissive,
              emissiveIntensity: ghost
                ? (style.emissiveIntensity ?? 0.05) + 0.08
                : Math.max(0.04, style.emissiveIntensity ?? 0.03),
              envMapIntensity: style.envMapIntensity,
              transparent: ghost || opacity < 0.999,
              opacity,
              depthWrite: opacity >= 0.999,
            })
          : new THREE.MeshBasicMaterial({
              color: colorValue,
              ...(useCloudNoiseMask ? { alphaMap: roughnessMap } : {}),
              transparent: true,
              opacity,
              depthWrite: false,
              blending: isAdditive ? THREE.AdditiveBlending : THREE.NormalBlending,
            });
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(layerRadius, typeName === 'nucleus' ? 18 : 28, typeName === 'nucleus' ? 14 : 22),
        sphereMaterial,
      );
      sphere.renderOrder = index * 10;
      root.add(sphere);
      if (typeName === 'core') {
        sphere.castShadow = !ghost;
        sphere.receiveShadow = true;
      }
      if (isPrimaryCore) {
        ball = sphere;
        rotationTarget = sphere;
        glowTarget = sphere;
        primaryCoreAssigned = true;
      }
      if (spinBase > 0.001) {
        spinNodes.push({
          node: sphere,
          x: typeName === 'cloud' ? spinBase * 0.08 : 0,
          y: spinBase * (typeName === 'halo' ? 0.8 : 1.12),
          z: spinBase * (typeName === 'cloud' ? 0.14 : 0.06),
        });
      }
      if (glowBase > 0.001) {
        const glowScale =
          typeName === 'halo' ? 1.1 + glowBase * 0.24 : typeName === 'cloud' ? 1.04 + glowBase * 0.18 : 1.02 + glowBase * 0.1;
        const glowOpacity = (ghost ? glowBase * 0.3 : glowBase * 0.22) * (typeName === 'halo' ? 1.5 : 1);
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(layerRadius * glowScale, 18, 14),
          new THREE.MeshBasicMaterial({
            color: colorValue,
            transparent: true,
            opacity: glowOpacity,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        glow.renderOrder = index * 10 + 5;
        root.add(glow);
      }
    }

    if (!ball) {
      ball = new THREE.Mesh(new THREE.SphereGeometry(coreRadius, 32, 24), material);
      ball.castShadow = !ghost;
      ball.receiveShadow = true;
      root.add(ball);
      rotationTarget = ball;
      glowTarget = ball;
    }
    return true;
  }

  const colorBase = new THREE.Color(coreColor);
  const protonColor = new THREE.Color(
    Number.isFinite(visual.protonColor) ? visual.protonColor : colorBase.clone().offsetHSL(0.01, 0.14, 0.06),
  );
  const neutronColor = new THREE.Color(
    Number.isFinite(visual.neutronColor) ? visual.neutronColor : colorBase.clone().offsetHSL(-0.03, -0.04, -0.18),
  );
  const nucleusColor = new THREE.Color(
    Number.isFinite(visual.nucleusColor)
      ? visual.nucleusColor
      : protonColor.clone().lerp(neutronColor, 0.48),
  );
  const cloudColor = new THREE.Color(primaryChroma);
  const cloudScale = Math.max(visual.cloudScale ?? 1, 0.01);
  const shellColor = new THREE.Color(primaryChroma);
  const haloColor = new THREE.Color(primaryChroma);
  const usedLayeredAtom = buildLayeredAtom();

  const nucleus = new THREE.Mesh(
    new THREE.SphereGeometry(coreRadius * nucleusScale, 14, 12),
    new THREE.MeshBasicMaterial({
      color: nucleusColor,
      transparent: true,
      opacity: ghost ? Math.min(0.5, nucleusOpacity * 0.7) : nucleusOpacity,
      depthWrite: false,
    }),
  );
  if (!usedLayeredAtom) root.add(nucleus);

  if (nucleusScale > 0.01) {
    const nucleonRadius = Math.max(coreRadius * nucleusScale * 0.28, radius * 0.024);
    const protonDot = new THREE.Mesh(
      new THREE.SphereGeometry(nucleonRadius, 8, 6),
      new THREE.MeshBasicMaterial({
        color: protonColor,
        transparent: true,
        opacity: ghost ? 0.32 : 0.62,
        depthWrite: false,
      }),
    );
    protonDot.position.set(-nucleonRadius * 0.78, nucleonRadius * 0.42, nucleonRadius * 0.18);
    if (!usedLayeredAtom) root.add(protonDot);
    const neutronDot = new THREE.Mesh(
      new THREE.SphereGeometry(nucleonRadius, 8, 6),
      new THREE.MeshBasicMaterial({
        color: neutronColor,
        transparent: true,
        opacity: ghost ? 0.32 : 0.62,
        depthWrite: false,
      }),
    );
    neutronDot.position.set(nucleonRadius * 0.68, -nucleonRadius * 0.32, -nucleonRadius * 0.16);
    if (!usedLayeredAtom) root.add(neutronDot);
  }

  const electronCloud = new THREE.Mesh(
    new THREE.SphereGeometry(radius * cloudScale, 20, 16),
    new THREE.MeshBasicMaterial({
      color: cloudColor,
      transparent: true,
      opacity: ghost ? cloudOpacity * 0.6 : cloudOpacity,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  );
  if (!usedLayeredAtom) {
    root.add(electronCloud);
    spinNodes.push({
      node: electronCloud,
      x: cloudSpin * 0.07,
      y: cloudSpin,
      z: cloudSpin * 0.12,
    });
  }

  for (let i = 0; !usedLayeredAtom && i < visual.shellCount; i += 1) {
    const rMul = shellRadius + i * 0.085;
    const shell = createElectronOrbitBand({
      atomRadius: radius,
      orbitRadius: radius * rMul,
      thickness: radius * shellThickness,
      colorValue: shellColor,
      opacity: ghost ? shellOpacity * 0.7 : shellOpacity,
      seed: i + type * 0.17,
      ghost,
    });
    shell.rotation.x = 0.6 + i * 0.48;
    shell.rotation.y = 0.3 + i * 0.37;
    root.add(shell);
    const d = i % 2 === 0 ? 1 : -1;
    spinNodes.push({
      node: shell,
      x: 0,
      y: shellSpin * d * (0.84 + i * 0.2),
      z: shellSpin * 0.25 * d,
    });
  }

  if (!usedLayeredAtom && visual.cloudGlow > 0.001) {
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(radius * (cloudScale + 0.06), 18, 14),
      new THREE.MeshBasicMaterial({
        color: cloudColor,
        transparent: true,
        opacity: ghost ? visual.cloudGlow * 0.45 : visual.cloudGlow,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    root.add(glow);
  }

  if (!usedLayeredAtom && visual.nucleusEmissive > 0.001) {
    const coreGlow = new THREE.Mesh(
      new THREE.SphereGeometry(radius * (nucleusScale * 1.55), 12, 10),
      new THREE.MeshBasicMaterial({
        color: nucleusColor.clone().offsetHSL(0, 0.04, 0.24),
        transparent: true,
        opacity: ghost ? visual.nucleusEmissive * 0.42 : visual.nucleusEmissive,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    root.add(coreGlow);
  }

  if (decorativeSkin && spec.phase === 'liquid') {
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

  if (decorativeSkin && (spec.phase === 'gas' || skinId === 'neon_glow' || skinId === 'bio_luminescent')) {
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
              : haloColor,
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

  if (decorativeSkin && spec.family === 'halogen') {
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

  if (!usedLayeredAtom) {
    ball = new THREE.Mesh(new THREE.SphereGeometry(coreRadius, 32, 24), material);
    root.add(ball);
    ball.castShadow = !ghost;
    ball.receiveShadow = true;
    rotationTarget = ball;
    glowTarget = ball;
  }

  return {
    root,
    rotationTarget: rotationTarget ?? ball,
    glowTarget: glowTarget ?? ball,
    spinNodes,
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
      return atomsConfig.getActiveAtomSpec(type)?.symbol ?? `Z${type + 1}`;
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
