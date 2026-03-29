import * as THREE from 'three';
import { createJuice } from './effects.js';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function profileScale(profile, key, fallback = 1) {
  const value = Number(profile?.[key]);
  return Number.isFinite(value) ? clamp(value, 0, 3) : fallback;
}

function makeAtom(materialColor, radius = 0.3) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 36, 28),
    new THREE.MeshPhysicalMaterial({
      color: materialColor,
      roughness: 0.18,
      metalness: 0.02,
      transmission: 0.24,
      clearcoat: 0.55,
      clearcoatRoughness: 0.14,
      transparent: true,
      opacity: 0.96,
    }),
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.18, 24, 18),
    new THREE.MeshBasicMaterial({
      color: materialColor,
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(halo);
  group.add(core);
  return { group, core, halo };
}

export function mountFxMiniPreview(host, initialPayload = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 24);
  camera.position.set(0, 0.15, 4.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.pointerEvents = 'none';
  host.replaceChildren(renderer.domElement);

  const prevPosition = host.style.position;
  if (!prevPosition) host.style.position = 'relative';

  scene.add(new THREE.AmbientLight(0xdaf2ff, 1));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2.8, 3, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x77c8ff, 0.46);
  fill.position.set(-2.2, -0.4, 2.2);
  scene.add(fill);

  const stage = new THREE.Group();
  scene.add(stage);

  const atomA = makeAtom(0x90d5ff, 0.34);
  const atomB = makeAtom(0x90d5ff, 0.34);
  const atomC = makeAtom(0x90d5ff, 0.22);
  const product = makeAtom(0x90d5ff, 0.46);
  stage.add(atomA.group, atomB.group, atomC.group, product.group);

  const juice = createJuice(scene, {
    overlayRoot: host,
    fxConfig: initialPayload?.fxConfig ?? {},
  });

  let live = true;
  let raf = 0;
  let lastTs = 0;
  let pulse = 0;
  let moleculeRest = null;
  let moleculeFormStart = null;
  let moleculeFormation = null;
  let payload = {
    kind: 'merge',
    intensity: 1,
    color: 0x90d5ff,
    profile: null,
    fxConfig: {},
    ...(initialPayload ?? {}),
  };

  const ro = new ResizeObserver(() => resize());
  ro.observe(host);

  function resize() {
    const w = Math.max(1, Math.floor(host.clientWidth));
    const h = Math.max(1, Math.floor(host.clientHeight));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function setColor(color) {
    for (const atom of [atomA, atomB, atomC, product]) {
      atom.core.material.color.setHex(color);
      atom.halo.material.color.setHex(color);
    }
  }

  function layout(kind) {
    atomA.group.visible = true;
    atomB.group.visible = true;
    atomC.group.visible = false;
    product.group.visible = true;
    product.group.position.set(0, 0.02, 0);
    product.core.material.opacity = 0.18;
    product.halo.material.opacity = 0.06;

    if (kind === 'molecule' || kind === 'water' || kind === 'fire' || kind === 'explosion') {
      atomA.group.position.set(-0.54, -0.12, 0.03);
      atomB.group.position.set(0.54, -0.12, 0.03);
      atomC.group.visible = true;
      atomC.group.position.set(0, 0.42, 0.02);
      product.group.position.set(0, 0.04, -0.04);
      moleculeRest = {
        a: new THREE.Vector3(-0.54, -0.12, 0.03),
        b: new THREE.Vector3(0.54, -0.12, 0.03),
        c: new THREE.Vector3(0, 0.42, 0.02),
        p: new THREE.Vector3(0, 0.04, -0.04),
      };
      return;
    }

    atomA.group.position.set(-0.64, 0, 0.03);
    atomB.group.position.set(0.64, 0, 0.03);
    atomC.group.visible = false;
    moleculeRest = null;
    moleculeFormation = null;
    moleculeFormStart = null;
  }

  function applyPayload(nextPayload = {}) {
    moleculeFormation = null;
    moleculeFormStart = null;
    payload = {
      ...payload,
      ...(nextPayload ?? {}),
    };
    juice.setFxConfig?.(payload.fxConfig ?? {});
    const color = Number.isFinite(payload.color) ? Number(payload.color) : 0x90d5ff;
    setColor(color);
    layout(String(payload.kind ?? 'merge').toLowerCase());
  }

  function spreadMoleculeAtomsForFormation() {
    if (!moleculeRest) return;
    const cx = (moleculeRest.a.x + moleculeRest.b.x + moleculeRest.c.x) / 3;
    const cy = (moleculeRest.a.y + moleculeRest.b.y + moleculeRest.c.y) / 3;
    const cz = (moleculeRest.a.z + moleculeRest.b.z + moleculeRest.c.z) / 3;
    const spread = 0.94;
    const push = (v) => {
      const dx = v.x - cx;
      const dy = v.y - cy;
      const dz = v.z - cz;
      const len = Math.max(0.0001, Math.hypot(dx, dy, dz));
      return new THREE.Vector3(v.x + (dx / len) * spread, v.y + (dy / len) * spread, v.z + (dz / len) * spread);
    };
    moleculeFormStart = {
      a: push(moleculeRest.a),
      b: push(moleculeRest.b),
      c: push(moleculeRest.c),
    };
    atomA.group.position.copy(moleculeFormStart.a);
    atomB.group.position.copy(moleculeFormStart.b);
    atomC.group.position.copy(moleculeFormStart.c);
  }

  function runTriggerEffects() {
    const kind = String(payload.kind ?? 'merge').toLowerCase();
    const profile = payload.profile && typeof payload.profile === 'object' ? payload.profile : {};
    const hasStack = Array.isArray(profile?.stackEntries) && profile.stackEntries.length > 0;
    const intensity = clamp(Number(payload.intensity) || 1, 0.2, 3);
    const color = Number.isFinite(payload.color) ? Number(payload.color) : 0x90d5ff;
    const burstScale = profileScale(profile, 'burstScale', 1);
    const sparkScale = profileScale(profile, 'sparkScale', 1);
    const dropletScale = profileScale(profile, 'dropletScale', 1);
    const bondScale = profileScale(profile, 'bondScale', 1);
    const smokeScale = profileScale(profile, 'smokeScale', 1);
    const trailScale = profileScale(profile, 'trailScale', 1);
    const explosionScale = profileScale(profile, 'explosionScale', 1);
    const trailStyle = String(profile?.trailStyle ?? 'auto').toLowerCase();
    const resolvedTrailStyle = trailStyle === 'auto' ? 'lite' : trailStyle;
    pulse = 0.32;

    if (kind === 'water') {
      if (!hasStack) {
        juice.waterSplash?.(0, 0.02, 0.05, intensity * explosionScale);
        juice.waterScreenDroplets?.(Math.max(0.8, intensity) * dropletScale);
        juice.moleculeBondLink?.(-0.54, -0.12, 0.05, 0, 0.42, 0.05, color, 0.78 * bondScale);
        juice.moleculeBondLink?.(0.54, -0.12, 0.05, 0, 0.42, 0.05, color, 0.78 * bondScale);
      }
      juice.playFxProfileStack?.(profile, {
        worldX: 0,
        worldY: 0.02,
        worldZ: 0.05,
        targetX: 0,
        targetY: 0.42,
        targetZ: 0.05,
        radius: 0.46,
        color,
        intensity,
        variant: 'merge',
      });
      return;
    }
    if (kind === 'fire') {
      if (!hasStack) juice.fireBurst?.(0, 0.02, 0.05, intensity * explosionScale);
      juice.playFxProfileStack?.(profile, { worldX: 0, worldY: 0.02, worldZ: 0.05, radius: 0.46, color, intensity, variant: 'merge' });
      return;
    }
    if (kind === 'explosion') {
      if (!hasStack) juice.creationExplosion?.(0, 0.02, 0.05, intensity * explosionScale);
      juice.playFxProfileStack?.(profile, { worldX: 0, worldY: 0.02, worldZ: 0.05, radius: 0.46, color, intensity, variant: 'jackpot' });
      return;
    }
    if (kind === 'molecule') {
      if (!hasStack) {
        juice.creationExplosion?.(0, 0.02, 0.05, intensity * explosionScale);
        juice.moleculeSmoke?.(0, 0.02, 0.05, color, intensity * smokeScale);
        juice.burst?.(0, 0.02, 0.05, color, Math.floor(30 * burstScale), 1.04 * intensity, 'jackpot');
        juice.burstSparks?.(0, 0.02, 0.09, color, Math.floor(16 * sparkScale));
        juice.moleculeBondLink?.(-0.54, -0.12, 0.05, 0, 0.42, 0.05, color, 0.92 * bondScale);
        juice.moleculeBondLink?.(0.54, -0.12, 0.05, 0, 0.42, 0.05, color, 0.92 * bondScale);
      }
      if (!hasStack && resolvedTrailStyle !== 'none') {
        juice.specialMoleculeTrails?.(
          0,
          0.08,
          0.1,
          color,
          Math.max(0.45, intensity * trailScale),
          resolvedTrailStyle === 'full' ? 'full' : 'lite',
        );
      }
      juice.playFxProfileStack?.(profile, {
        worldX: 0,
        worldY: 0.02,
        worldZ: 0.05,
        targetX: 0,
        targetY: 0.42,
        targetZ: 0.05,
        radius: 0.46,
        color,
        intensity,
        variant: 'jackpot',
      });
      return;
    }

    if (!hasStack) {
      juice.burst?.(0, 0.01, 0.05, color, Math.floor(20 * burstScale), 0.86 * intensity, 'merge');
      juice.burstSparks?.(0, 0.01, 0.09, color, Math.floor(8 * sparkScale));
      juice.atomPairAttractor?.(-0.64, 0, 0.05, 0.64, 0, 0.05, color, 0.76 * bondScale, {
        style: 'electron',
        radiusA: 0.34,
        radiusB: 0.34,
        duration: 0.56,
        count: 1.2,
        speed: 1,
      });
      if (smokeScale > 0.01) {
        juice.smokePuff?.(0, 0.01, 0.05, color, Math.floor(6 * smokeScale));
      }
    }
    juice.playFxProfileStack?.(profile, {
      worldX: 0,
      worldY: 0.01,
      worldZ: 0.05,
      targetX: 0.64,
      targetY: 0,
      targetZ: 0.05,
      radius: 0.46,
      color,
      intensity,
      variant: 'merge',
    });
  }

  function trigger(nextPayload = {}) {
    applyPayload(nextPayload);
    const kind = String(payload.kind ?? 'merge').toLowerCase();
    if ((kind === 'molecule' || kind === 'water') && moleculeRest) {
      spreadMoleculeAtomsForFormation();
      moleculeFormation = { t: 0, fired: false };
      pulse = 0.14;
      return;
    }
    runTriggerEffects();
  }

  function tick(ts) {
    if (!live) return;
    const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;
    pulse = Math.max(0, pulse - dt);
    const t = ts * 0.001;
    stage.rotation.y = Math.sin(t * 0.5) * 0.08;

    if (moleculeFormation && moleculeRest && moleculeFormStart) {
      moleculeFormation.t += dt;
      const dur = 0.42;
      const te = Math.min(1, moleculeFormation.t / dur);
      const ease = 1 - (1 - te) * (1 - te);
      atomA.group.position.lerpVectors(moleculeFormStart.a, moleculeRest.a, ease);
      atomB.group.position.lerpVectors(moleculeFormStart.b, moleculeRest.b, ease);
      atomC.group.position.lerpVectors(moleculeFormStart.c, moleculeRest.c, ease);
      if (!moleculeFormation.fired && moleculeFormation.t >= 0.2) {
        moleculeFormation.fired = true;
        runTriggerEffects();
      }
      if (te >= 1) {
        moleculeFormation = null;
        moleculeFormStart = null;
      }
    }

    product.core.material.opacity = 0.18 + pulse * 0.32;
    product.halo.material.opacity = 0.06 + pulse * 0.14;
    product.group.scale.setScalar(1 + pulse * 0.22);
    atomA.group.rotation.y += dt * 0.22;
    atomB.group.rotation.y -= dt * 0.2;
    atomC.group.rotation.y += dt * 0.18;
    juice.updateParticles?.(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  resize();
  applyPayload(initialPayload);
  raf = requestAnimationFrame(tick);

  return {
    update(nextPayload = {}) {
      applyPayload(nextPayload);
    },
    trigger(nextPayload = {}) {
      trigger(nextPayload);
    },
    destroy() {
      live = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      juice.dispose?.();
      for (const atom of [atomA, atomB, atomC, product]) {
        atom.core.geometry.dispose();
        atom.core.material.dispose();
        atom.halo.geometry.dispose();
        atom.halo.material.dispose();
      }
      renderer.dispose();
      host.replaceChildren();
      if (!prevPosition) host.style.position = '';
    },
  };
}
