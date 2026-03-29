import * as THREE from 'three';

/**
 * Merge / molecule VFX.
 * - 3D particles (world-space)
 * - optional 2D wet-screen overlay for water molecules
 */
export function createJuice(scene, options = {}) {
  const isLikelyMobile =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 1100));
  const lowPerfDevice =
    isLikelyMobile ||
    (typeof navigator !== 'undefined' &&
      Number.isFinite(navigator.hardwareConcurrency) &&
      navigator.hardwareConcurrency <= 6);
  const particles = [];
  const ripples = [];
  const timers = new Set();
  const rnd = () => Math.random() * 2 - 1;

  const geoS = new THREE.SphereGeometry(0.065, 5, 4);
  const geoShard = new THREE.TetrahedronGeometry(0.09, 0);
  const geoRipple = new THREE.RingGeometry(0.12, 0.18, 30);

  const MAX_PARTICLES = lowPerfDevice ? 360 : 560;
  const MAX_RIPPLES = 34;
  const MAX_SCREEN_DROPLETS = lowPerfDevice ? 56 : 86;
  const AMBIENT_PARTICLE_COUNT = lowPerfDevice ? 28 : 56;
  const SPARK_POOL_SIZE = lowPerfDevice ? 112 : 180;
  const MAX_TRAIL_EVENTS = lowPerfDevice ? 4 : 8;
  const TRAIL_RAYS_BASE = lowPerfDevice ? 5 : 8;
  const trailEvents = [];

  const overlayRoot =
    options.overlayRoot && typeof options.overlayRoot.appendChild === 'function'
      ? options.overlayRoot
      : null;
  let screenLayer = null;
  let activeScreenDroplets = 0;
  let tintInFlight = false;
  const tmpObj = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  const FX_DEFAULTS = {
    ambientDensity: 1,
    sparkDensity: 1,
    trailDensity: 1,
    dropletDensity: 1,
    bondLinkIntensity: 1,
  };
  const fxConfig = { ...FX_DEFAULTS };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function normalizeFxConfig(next = {}) {
    const read = (key) => {
      const n = Number(next[key]);
      if (!Number.isFinite(n)) return FX_DEFAULTS[key];
      return clamp(n, 0, 2.2);
    };
    return {
      ambientDensity: read('ambientDensity'),
      sparkDensity: read('sparkDensity'),
      trailDensity: read('trailDensity'),
      dropletDensity: read('dropletDensity'),
      bondLinkIntensity: read('bondLinkIntensity'),
    };
  }

  function fxScale(key) {
    return clamp(Number(fxConfig[key] ?? 1), 0, 2.2);
  }

  const ambientGeo = new THREE.IcosahedronGeometry(0.07, 0);
  const ambientOpacity = lowPerfDevice ? 0.26 : 0.34;
  const ambientMat = new THREE.MeshBasicMaterial({
    color: 0x9fdcff,
    transparent: true,
    opacity: ambientOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ambientMesh = new THREE.InstancedMesh(ambientGeo, ambientMat, AMBIENT_PARTICLE_COUNT);
  ambientMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ambientMesh.frustumCulled = false;
  ambientMesh.renderOrder = 16;
  const ambientBounds = {
    minX: -4.05,
    maxX: 4.05,
    minY: 1.1,
    maxY: 9.2,
    minZ: -0.34,
    maxZ: 0.34,
  };
  const ambientParticles = [];

  const sparkGeo = new THREE.IcosahedronGeometry(0.08, 0);
  const sparkMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });
  const sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, SPARK_POOL_SIZE);
  sparkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sparkMesh.frustumCulled = false;
  sparkMesh.renderOrder = 28;
  const sparkSlots = Array.from({ length: SPARK_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    size: 0.1,
    life: 0,
    maxLife: 0.2,
    drag: 0.88,
    gravity: 12,
    color: new THREE.Color(0xffffff),
  }));

  function addToScene(object3d) {
    if (scene?.add) scene.add(object3d);
  }

  function removeFromScene(object3d) {
    if (scene?.remove) scene.remove(object3d);
  }

  function rememberTimer(id) {
    timers.add(id);
    return id;
  }

  function clearRememberedTimer(id) {
    clearTimeout(id);
    timers.delete(id);
  }

  function ensureScreenLayer() {
    if (!overlayRoot) return null;
    if (screenLayer && screenLayer.isConnected) return screenLayer;
    const layer = document.createElement('div');
    layer.className = 'juice-screen-layer';
    Object.assign(layer.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: '2',
    });
    overlayRoot.appendChild(layer);
    screenLayer = layer;
    return layer;
  }

  function hideInstancedSlot(mesh, index) {
    tmpObj.position.set(0, -999, 0);
    tmpObj.scale.setScalar(0.0001);
    tmpObj.updateMatrix();
    mesh.setMatrixAt(index, tmpObj.matrix);
  }

  function initAmbientParticles() {
    for (let i = 0; i < AMBIENT_PARTICLE_COUNT; i += 1) {
      const p = {
        x: THREE.MathUtils.lerp(ambientBounds.minX, ambientBounds.maxX, Math.random()),
        y: THREE.MathUtils.lerp(ambientBounds.minY, ambientBounds.maxY, Math.random()),
        z: THREE.MathUtils.lerp(ambientBounds.minZ, ambientBounds.maxZ, Math.random()),
        vx: rnd() * 0.03,
        vy: 0.02 + Math.random() * 0.065,
        vz: rnd() * 0.02,
        phase: Math.random() * Math.PI * 2,
        pulse: 0.65 + Math.random() * 0.8,
        size: 0.7 + Math.random() * 1.25,
      };
      ambientParticles.push(p);
      tmpObj.position.set(p.x, p.y, p.z);
      tmpObj.scale.setScalar(p.size * (lowPerfDevice ? 0.16 : 0.2));
      tmpObj.updateMatrix();
      ambientMesh.setMatrixAt(i, tmpObj.matrix);
    }
    ambientMesh.instanceMatrix.needsUpdate = true;
    addToScene(ambientMesh);
  }

  function updateAmbientParticles(dt) {
    const ambientDensity = fxScale('ambientDensity');
    ambientMat.opacity = ambientOpacity * ambientDensity;
    if (ambientDensity <= 0.001) {
      for (let i = 0; i < ambientParticles.length; i += 1) hideInstancedSlot(ambientMesh, i);
      ambientMesh.instanceMatrix.needsUpdate = true;
      return;
    }
    for (let i = 0; i < ambientParticles.length; i += 1) {
      const p = ambientParticles[i];
      p.phase += dt * p.pulse;
      p.x += (p.vx + Math.sin(p.phase * 0.9) * 0.012) * dt;
      p.y += p.vy * dt;
      p.z += (p.vz + Math.cos(p.phase) * 0.007) * dt;

      if (p.x < ambientBounds.minX) p.x = ambientBounds.maxX;
      if (p.x > ambientBounds.maxX) p.x = ambientBounds.minX;
      if (p.y > ambientBounds.maxY) p.y = ambientBounds.minY;
      if (p.y < ambientBounds.minY) p.y = ambientBounds.maxY;
      if (p.z < ambientBounds.minZ) p.z = ambientBounds.maxZ;
      if (p.z > ambientBounds.maxZ) p.z = ambientBounds.minZ;

      const pulse = 0.8 + Math.sin(p.phase * 1.3) * 0.22;
      tmpObj.position.set(p.x, p.y, p.z);
      tmpObj.scale.setScalar(p.size * (lowPerfDevice ? 0.16 : 0.2) * pulse * Math.max(0.24, ambientDensity));
      tmpObj.updateMatrix();
      ambientMesh.setMatrixAt(i, tmpObj.matrix);
    }
    ambientMesh.instanceMatrix.needsUpdate = true;
  }

  function initSparkPool() {
    for (let i = 0; i < SPARK_POOL_SIZE; i += 1) {
      hideInstancedSlot(sparkMesh, i);
      sparkMesh.setColorAt(i, new THREE.Color(0x000000));
    }
    sparkMesh.instanceMatrix.needsUpdate = true;
    sparkMesh.instanceColor.needsUpdate = true;
    addToScene(sparkMesh);
  }

  function emitInstancedSparks(worldX, worldY, worldZ, color, count = 12, intensity = 1) {
    const sparkDensity = fxScale('sparkDensity');
    const targetCount = Math.max(0, Math.floor(count * sparkDensity));
    if (targetCount <= 0) return;
    const baseColor = new THREE.Color(color ?? 0xffffff);
    const iScale = Math.max(0.65, Math.min(2.2, intensity * (0.72 + sparkDensity * 0.28)));
    let spawned = 0;
    for (let i = 0; i < sparkSlots.length && spawned < targetCount; i += 1) {
      const s = sparkSlots[i];
      if (s.active) continue;
      const ang = Math.random() * Math.PI * 2;
      const sp = (2.8 + Math.random() * 6.2) * iScale;
      s.active = true;
      s.x = worldX + rnd() * 0.06;
      s.y = worldY + rnd() * 0.05;
      s.z = worldZ + rnd() * 0.08;
      s.vx = Math.cos(ang) * sp * 0.46;
      s.vy = (1.6 + Math.random() * 3.8) * iScale;
      s.vz = rnd() * sp * 0.22;
      s.size = 0.07 + Math.random() * 0.13;
      s.life = 0;
      s.maxLife = 0.12 + Math.random() * 0.18;
      s.drag = 0.86 + Math.random() * 0.08;
      s.gravity = 11 + Math.random() * 6;
      s.color.copy(baseColor).lerp(new THREE.Color(0xffffff), 0.16 + Math.random() * 0.26);
      spawned += 1;
    }
  }

  function updateInstancedSparks(dt) {
    let matrixDirty = false;
    let colorDirty = false;
    for (let i = 0; i < sparkSlots.length; i += 1) {
      const s = sparkSlots[i];
      if (!s.active) continue;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
        hideInstancedSlot(sparkMesh, i);
        sparkMesh.setColorAt(i, new THREE.Color(0x000000));
        matrixDirty = true;
        colorDirty = true;
        continue;
      }

      s.vy -= s.gravity * dt;
      s.vx *= s.drag;
      s.vy *= s.drag;
      s.vz *= s.drag;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;

      const u = s.life / s.maxLife;
      const fade = 1 - u;
      const scale = s.size * (0.5 + fade * 1.2);
      tmpObj.position.set(s.x, s.y, s.z);
      tmpObj.scale.setScalar(Math.max(0.001, scale));
      tmpObj.updateMatrix();
      sparkMesh.setMatrixAt(i, tmpObj.matrix);

      tmpColor.copy(s.color).multiplyScalar(Math.max(0.18, fade * 1.2));
      sparkMesh.setColorAt(i, tmpColor);
      matrixDirty = true;
      colorDirty = true;
    }
    if (matrixDirty) sparkMesh.instanceMatrix.needsUpdate = true;
    if (colorDirty && sparkMesh.instanceColor) sparkMesh.instanceColor.needsUpdate = true;
  }

  function disposeTrailEvent(event) {
    if (!event) return;
    if (event.kind === 'orbit') {
      removeFromScene(event.group);
      if (Array.isArray(event.lines)) {
        for (const item of event.lines) {
          item?.line?.geometry?.dispose?.();
          item?.line?.material?.dispose?.();
        }
      }
      return;
    }
    if (event.kind === 'orbitDots') {
      removeFromScene(event.group);
      if (Array.isArray(event.loops)) {
        for (const item of event.loops) {
          item?.points?.geometry?.dispose?.();
          item?.points?.material?.dispose?.();
        }
      }
      return;
    }
    if (event.kind === 'bond') {
      removeFromScene(event.group);
      if (Array.isArray(event.lines)) {
        for (const item of event.lines) {
          item?.line?.geometry?.dispose?.();
          item?.line?.material?.dispose?.();
        }
      }
      return;
    }
    if (event.kind === 'attractor') {
      removeFromScene(event.group);
      if (Array.isArray(event.loops)) {
        for (const item of event.loops) {
          item?.points?.geometry?.dispose?.();
          item?.points?.material?.dispose?.();
        }
      }
      return;
    }
    removeFromScene(event.lines);
    event.lines.geometry?.dispose?.();
    event.lines.material?.dispose?.();
  }

  function addRayTrailEvent(worldX, worldY, worldZ, color, intensity = 1) {
    const i = Math.max(0.7, Math.min(2.2, intensity));
    while (trailEvents.length >= MAX_TRAIL_EVENTS) {
      disposeTrailEvent(trailEvents.shift());
    }

    const rayCount = Math.max(4, Math.round(TRAIL_RAYS_BASE + i * 2));
    const positions = new Float32Array(rayCount * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: color ?? 0xb7dcff,
      transparent: true,
      opacity: 0.82,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.renderOrder = 29;
    addToScene(lines);

    const rays = [];
    for (let r = 0; r < rayCount; r += 1) {
      const ang = (Math.PI * 2 * r) / rayCount + Math.random() * 0.45;
      const upBias = 0.28 + Math.random() * 0.56;
      const dx = Math.cos(ang) * (1 - upBias * 0.35);
      const dy = upBias;
      const dz = Math.sin(ang) * 0.28;
      const len = 0.36 + Math.random() * (0.34 + i * 0.15);
      const speed = 0.85 + Math.random() * (1.35 + i * 0.5);
      const phase = Math.random() * 0.08;
      rays.push({ dx, dy, dz, len, speed, phase });
    }

    trailEvents.push({
      kind: 'ray',
      lines,
      positions,
      rays,
      life: 0,
      maxLife: 0.44 + Math.min(0.5, i * 0.16),
      origin: new THREE.Vector3(worldX, worldY, worldZ),
      wobble: 0.05 + i * 0.03,
    });
  }

  function buildTrailColorSet(color, vivid) {
    const base = new THREE.Color(color ?? 0xb7dcff);
    return [
      base.clone().offsetHSL(0, 0.08, vivid ? 0.2 : 0.11).getHex(),
      base.clone().offsetHSL(0.03, 0.12, vivid ? 0.16 : 0.08).getHex(),
      (vivid ? new THREE.Color(0xffd75a) : new THREE.Color(0xffc373)).getHex(),
      (vivid ? new THREE.Color(0xff674d) : new THREE.Color(0xff7f68)).getHex(),
      (vivid ? new THREE.Color(0xd968ff) : new THREE.Color(0xb186ff)).getHex(),
    ];
  }

  function addOrbitTrailEvent(worldX, worldY, worldZ, color, intensity = 1, style = 'full', options = {}) {
    const vivid = style !== 'lite';
    const i = Math.max(0.6, Math.min(vivid ? 2.2 : 1.5, intensity));
    while (trailEvents.length >= MAX_TRAIL_EVENTS) {
      disposeTrailEvent(trailEvents.shift());
    }

    const trailCount = vivid
      ? Math.max(5, Math.round((lowPerfDevice ? 4 : 5) + i * 2.4))
      : Math.max(3, Math.round((lowPerfDevice ? 3 : 4) + i * 1.7));
    const segmentCount = vivid ? (lowPerfDevice ? 8 : 10) : lowPerfDevice ? 7 : 9;
    const group = new THREE.Group();
    group.position.set(worldX, worldY, worldZ);
    group.renderOrder = 30;
    addToScene(group);
    const palette = buildTrailColorSet(color, vivid);
    const lines = [];
    const radiusScale = Math.max(0.2, Math.min(3, Number(options.radius) || 1));
    const spreadScale = Math.max(0.2, Math.min(3, Number(options.spread) || 1));
    const speedScale = Math.max(0.2, Math.min(3, Number(options.speed) || 1));
    const durationScale = Math.max(0.2, Math.min(3, Number(options.duration) || 1));

    for (let t = 0; t < trailCount; t += 1) {
      const points = [];
      const start = Math.random() * Math.PI * 2;
      const spinDir = Math.random() < 0.5 ? -1 : 1;
      const sweep = (1.1 + Math.random() * (vivid ? 1.15 : 0.8)) * Math.PI * spinDir;
      const baseRadius = (0.18 + Math.random() * (0.14 + i * 0.1)) * radiusScale;
      const rise = (0.38 + Math.random() * (0.34 + i * 0.2)) * (0.7 + spreadScale * 0.3);
      const zAmp = (0.08 + Math.random() * 0.14) * (0.7 + spreadScale * 0.3);

      for (let s = 0; s <= segmentCount; s += 1) {
        const u = s / segmentCount;
        const ease = Math.sin(u * Math.PI);
        const ang = start + sweep * u;
        const radius = baseRadius + ease * (0.06 + i * 0.07);
        const x = Math.cos(ang) * radius;
        const y = u * rise + Math.sin(u * Math.PI * 2 + start) * 0.035;
        const z = Math.sin(ang) * (zAmp + ease * 0.05);
        points.push(new THREE.Vector3(x, y, z));
      }

      const mat = new THREE.LineDashedMaterial({
        color: palette[t % palette.length],
        transparent: true,
        opacity: vivid ? 0.94 : 0.72,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        dashSize: vivid ? 0.08 : 0.065,
        gapSize: vivid ? 0.058 : 0.075,
      });
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      line.rotation.y = rnd() * 0.32;
      line.rotation.z = rnd() * 0.8;
      line.renderOrder = 30;
      group.add(line);
      lines.push({
        line,
        material: mat,
        spinY: (0.55 + Math.random() * 1.55) * speedScale * (Math.random() < 0.5 ? -1 : 1),
        spinZ: (0.22 + Math.random() * 0.6) * speedScale * (Math.random() < 0.5 ? -1 : 1),
        dashSpeed: (0.5 + Math.random() * (vivid ? 1.5 : 0.9)) * speedScale,
        baseOpacity: mat.opacity,
      });
    }

    trailEvents.push({
      kind: 'orbit',
      group,
      lines,
      life: 0,
      maxLife: (vivid ? 0.76 + Math.min(0.35, i * 0.18) : 0.55 + Math.min(0.2, i * 0.14)) * durationScale,
      rise: vivid ? 0.2 : 0.12,
      grow: vivid ? 0.85 + i * 0.28 : 0.46 + i * 0.2,
      spin: rnd() * 0.5,
    });
  }

  function addElectronOrbitEvent(worldX, worldY, worldZ, color, intensity = 1, options = {}) {
    const i = Math.max(0.55, Math.min(2.2, intensity));
    while (trailEvents.length >= MAX_TRAIL_EVENTS) {
      disposeTrailEvent(trailEvents.shift());
    }

    const group = new THREE.Group();
    group.position.set(worldX, worldY, worldZ);
    group.renderOrder = 30;
    addToScene(group);

    const opacityScale = Math.max(0, Math.min(1, Number(options.opacity) || 1));
    const sizeScale = Math.max(0.2, Math.min(3, Number(options.size) || 1));
    const durationScale = Math.max(0.2, Math.min(3, Number(options.duration) || 1));
    const speedScale = Math.max(0.2, Math.min(3, Number(options.speed) || 1));
    const countScale = Math.max(0.2, Math.min(6, Number(options.count) || 1));
    const baseRadius = Math.max(0.16, Number(options.radius) || (0.18 + sizeScale * 0.14));
    const spreadScale = Math.max(0.2, Math.min(3, Number(options.spread) || 1));
    const loopCount = lowPerfDevice ? 2 : 3;
    const baseColor = new THREE.Color(color ?? 0xb7dcff);
    const loops = [];

    for (let n = 0; n < loopCount; n += 1) {
      const dotCount = Math.max(8, Math.round((10 + n * 3) * countScale));
      const positions = new Float32Array(dotCount * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: baseColor.clone().lerp(new THREE.Color(0xffffff), n === 0 ? 0.34 : 0.16).getHex(),
        transparent: true,
        opacity: (n === 0 ? 0.84 : 0.54) * opacityScale,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        size: (0.028 + sizeScale * 0.018) * (n === 0 ? 1.06 : 0.92),
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geo, mat);
      points.renderOrder = 30;
      points.rotation.set(0.5 + n * 0.34, 0.22 + n * 0.48, n * 0.4);
      group.add(points);
      loops.push({
        points,
        positions,
        material: mat,
        baseOpacity: mat.opacity,
        radiusX: baseRadius * (1 + n * 0.16) * (0.84 + spreadScale * 0.22),
        radiusY: baseRadius * (0.56 + n * 0.1) * (0.8 + spreadScale * 0.28),
        radiusZ: baseRadius * (0.3 + n * 0.06) * (0.72 + spreadScale * 0.34),
        dotCount,
        speed: (1.8 + Math.random() * 1.2 + n * 0.26) * speedScale,
        phase: Math.random() * Math.PI * 2,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 2.4 + Math.random() * 1.6,
      });
    }

    trailEvents.push({
      kind: 'orbitDots',
      group,
      loops,
      life: 0,
      maxLife: (0.3 + Math.min(0.24, i * 0.1)) * durationScale,
      baseScale: 0.98 + i * 0.04,
      rise: 0.035 + i * 0.012,
      pulseSpeed: 8 + Math.random() * 3.2,
    });
  }

  function specialMoleculeTrails(worldX, worldY, worldZ, color, intensity = 1, style = 'full', options = {}) {
    const trailDensity = fxScale('trailDensity');
    if (trailDensity <= 0.001) return;
    const variant = style === 'lite' ? 'lite' : 'full';
    const i = Math.max(0.7, Math.min(2.2, intensity * (0.6 + trailDensity * 0.4)));
    if (variant === 'full') addRayTrailEvent(worldX, worldY, worldZ, color, i);
    addOrbitTrailEvent(worldX, worldY, worldZ, color, i, variant, options);
    if (variant === 'full' && !lowPerfDevice && i > 1.06) {
      addOrbitTrailEvent(worldX, worldY, worldZ, color, i * 0.82, 'lite', options);
    }
  }

  function addBondLinkEvent(ax, ay, az, bx, by, bz, color, intensity = 1) {
    const i = Math.max(0.6, Math.min(2.2, intensity));
    while (trailEvents.length >= MAX_TRAIL_EVENTS) {
      disposeTrailEvent(trailEvents.shift());
    }

    const group = new THREE.Group();
    group.position.set(0, 0, 0);
    group.renderOrder = 31;
    addToScene(group);

    const start = new THREE.Vector3(ax, ay, az);
    const end = new THREE.Vector3(bx, by, bz);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const dir = end.clone().sub(start);
    const len = Math.max(0.08, dir.length());
    if (len <= 0.08) {
      removeFromScene(group);
      return;
    }

    const dirN = dir.clone().normalize();
    const perp = new THREE.Vector3(-dirN.y, dirN.x, 0).normalize();
    const arcCount = lowPerfDevice ? 1 : 2;
    const segCount = lowPerfDevice ? 10 : 14;
    const baseColor = new THREE.Color(color ?? 0xb7dcff);
    const lines = [];

    for (let n = 0; n < arcCount; n += 1) {
      const offset = (n - (arcCount - 1) / 2) * (0.022 + 0.012 * i);
      const lift =
        len * (0.07 + Math.random() * 0.08) * (n % 2 === 0 ? 1 : -1);
      const control = mid
        .clone()
        .add(perp.clone().multiplyScalar(offset + lift))
        .add(new THREE.Vector3(0, 0, 0.014 + Math.random() * 0.018));
      const curve = new THREE.QuadraticBezierCurve3(start, control, end);
      const points = curve.getPoints(segCount);
      const mat = new THREE.LineBasicMaterial({
        color: baseColor.clone().lerp(new THREE.Color(0xffffff), n === 0 ? 0.24 : 0.1).getHex(),
        transparent: true,
        opacity: n === 0 ? 0.58 : 0.34,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, mat);
      line.renderOrder = 31;
      group.add(line);
      lines.push({
        line,
        material: mat,
        baseOpacity: mat.opacity,
      });
    }

    trailEvents.push({
      kind: 'bond',
      group,
      lines,
      life: 0,
      maxLife: 0.34 + Math.min(0.34, i * 0.12),
      pulseSpeed: 9 + Math.random() * 5,
    });
  }

  function moleculeBondLink(ax, ay, az, bx, by, bz, color, intensity = 1) {
    const bondScale = fxScale('bondLinkIntensity');
    if (bondScale <= 0.001) return;
    addBondLinkEvent(ax, ay, az, bx, by, bz, color, intensity * (0.65 + bondScale * 0.35));
  }

  function addPairAttractorEvent(ax, ay, az, bx, by, bz, color, intensity = 1, options = {}) {
    const i = Math.max(0.55, Math.min(2.2, intensity));
    while (trailEvents.length >= MAX_TRAIL_EVENTS) {
      disposeTrailEvent(trailEvents.shift());
    }

    const start = new THREE.Vector3(ax, ay, az);
    const end = new THREE.Vector3(bx, by, bz);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const dir = end.clone().sub(start);
    const len = Math.max(0.08, dir.length());
    if (len <= 0.08) return;

    const group = new THREE.Group();
    group.position.copy(mid);
    group.renderOrder = 31;
    group.rotation.z = Math.atan2(dir.y, dir.x);
    addToScene(group);

    const style = String(options.style ?? 'soft').toLowerCase();
    const opacityScale = Math.max(0, Math.min(1, Number(options.opacity) || 1));
    const sizeScale = Math.max(0.2, Math.min(3, Number(options.size) || 1));
    const durationScale = Math.max(0.2, Math.min(3, Number(options.duration) || 1));
    const loopCount = style === 'clean' || style === 'lite' ? 1 : lowPerfDevice ? 1 : 2;
    const baseColor = new THREE.Color(color ?? 0xb7dcff);
    const loops = [];
    const radiusA = Math.max(0.06, Number(options.radiusA) || len * 0.18);
    const radiusB = Math.max(0.06, Number(options.radiusB) || len * 0.18);
    const avgRadius = (radiusA + radiusB) * 0.5;
    const maxRadius = Math.max(radiusA, radiusB);
    const orbitPadding = Math.max(0.03, avgRadius * 0.16);
    const speedScale = Math.max(0.2, Math.min(3, Number(options.speed) || 1));
    const countScale = Math.max(0.2, Math.min(6, Number(options.count) || 1));
    const radiusScale = Math.max(0.2, Math.min(3, Number(options.radius) || 1));
    const spreadScale = Math.max(0.2, Math.min(3, Number(options.spread) || 1));
    const majorRadius =
      (len * 0.5 + avgRadius * 0.92 + orbitPadding) * (0.88 + sizeScale * 0.24) * radiusScale;
    const minorRadius =
      (maxRadius * 1.28 + orbitPadding + len * 0.04) *
      (0.9 + sizeScale * 0.16) *
      (0.82 + spreadScale * 0.26) *
      (0.92 + i * 0.08);

    for (let n = 0; n < loopCount; n += 1) {
      const sizeJitter = 1 + n * 0.08;
      const zAmp = style === 'clean' ? 0.0025 : 0.004 + n * 0.004;
      const phase = n * 0.6;
      const dotCountBase = style === 'lite' ? 10 : style === 'clean' ? 12 : 16;
      const dotCount = Math.max(6, Math.round(dotCountBase * countScale));
      const positions = new Float32Array(dotCount * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: baseColor.clone().lerp(new THREE.Color(0xffffff), n === 0 ? 0.28 : 0.12).getHex(),
        transparent: true,
        opacity: (n === 0 ? 0.78 : 0.46) * opacityScale,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        size: (0.035 + sizeScale * 0.018) * (n === 0 ? 1 : 0.92),
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geo, mat);
      points.renderOrder = 31;
      group.add(points);
      loops.push({
        points,
        positions,
        material: mat,
        baseOpacity: mat.opacity,
        majorRadius: majorRadius * sizeJitter,
        minorRadius: minorRadius * sizeJitter,
        zAmp,
        phase,
        dotCount,
        speed: (1.1 + Math.random() * 0.9) * speedScale,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 2.1 + Math.random() * 1.8,
      });
    }

    trailEvents.push({
      kind: 'attractor',
      group,
      loops,
      life: 0,
      maxLife: (0.22 + Math.min(0.12, i * 0.06)) * durationScale,
      pulseSpeed: 7.2 + Math.random() * 3.4,
      baseScale: 0.95 + i * 0.04,
    });
  }

  function atomPairAttractor(ax, ay, az, bx, by, bz, color, intensity = 1, options = {}) {
    const bondScale = fxScale('bondLinkIntensity');
    if (bondScale <= 0.001) return;
    addPairAttractorEvent(
      ax,
      ay,
      az,
      bx,
      by,
      bz,
      color,
      intensity * (0.7 + bondScale * 0.3),
      options,
    );
  }

  function updateTrailEvents(dt) {
    for (let i = trailEvents.length - 1; i >= 0; i -= 1) {
      const ev = trailEvents[i];
      ev.life += dt;
      if (ev.kind === 'orbit') {
        const u = Math.min(1, ev.life / ev.maxLife);
        const fade = 1 - u;
        const lift = 1 + u * ev.grow;
        ev.group.scale.setScalar(lift);
        ev.group.position.y += ev.rise * dt;
        ev.group.rotation.y += dt * (0.66 + ev.spin * 0.45);
        ev.group.rotation.z += dt * (0.3 + Math.abs(ev.spin) * 0.22);
        for (const item of ev.lines) {
          item.line.rotation.y += dt * item.spinY;
          item.line.rotation.z += dt * item.spinZ;
          item.material.dashOffset -= dt * item.dashSpeed;
          item.material.opacity = Math.max(0, item.baseOpacity * fade * fade);
        }
        if (u >= 1) {
          disposeTrailEvent(ev);
          trailEvents.splice(i, 1);
        }
        continue;
      }
      if (ev.kind === 'orbitDots') {
        const u = Math.min(1, ev.life / ev.maxLife);
        const fade = 1 - u;
        const pulse = 0.86 + 0.14 * Math.sin(ev.life * ev.pulseSpeed);
        ev.group.scale.setScalar(ev.baseScale * (1 + Math.sin(ev.life * 5.2) * 0.03));
        ev.group.position.y += ev.rise * dt;
        for (const item of ev.loops) {
          const pos = item.positions;
          for (let d = 0; d < item.dotCount; d += 1) {
            const norm = d / Math.max(1, item.dotCount);
            const t = norm * Math.PI * 2 + ev.life * item.speed + item.phase;
            const idx = d * 3;
            pos[idx + 0] = Math.cos(t) * item.radiusX;
            pos[idx + 1] = Math.sin(t * 2 + item.phase) * item.radiusY;
            pos[idx + 2] = Math.sin(t) * item.radiusZ;
          }
          item.points.rotation.y += dt * (0.9 + Math.sin(ev.life + item.wobblePhase) * 0.2);
          item.points.rotation.z += dt * (0.42 + Math.cos(ev.life * item.wobbleSpeed + item.wobblePhase) * 0.18);
          item.points.geometry.attributes.position.needsUpdate = true;
          item.material.opacity = Math.max(0, item.baseOpacity * fade * pulse);
        }
        if (u >= 1) {
          disposeTrailEvent(ev);
          trailEvents.splice(i, 1);
        }
        continue;
      }
      if (ev.kind === 'bond') {
        const u = Math.min(1, ev.life / ev.maxLife);
        const fade = 1 - u;
        const pulse = 0.7 + 0.3 * Math.sin(ev.life * ev.pulseSpeed);
        for (const item of ev.lines) {
          item.material.opacity = Math.max(0, item.baseOpacity * fade * pulse);
        }
        if (u >= 1) {
          disposeTrailEvent(ev);
          trailEvents.splice(i, 1);
        }
        continue;
      }
      if (ev.kind === 'attractor') {
        const u = Math.min(1, ev.life / ev.maxLife);
        const fade = 1 - u;
        const pulse = 0.84 + 0.16 * Math.sin(ev.life * ev.pulseSpeed);
        const wobble = 1 + 0.035 * Math.sin(ev.life * 5.4);
        ev.group.scale.setScalar(ev.baseScale * wobble);
        for (const item of ev.loops) {
          const pos = item.positions;
          for (let d = 0; d < item.dotCount; d += 1) {
            const norm = d / Math.max(1, item.dotCount);
            const t = norm * Math.PI * 2 + ev.life * item.speed + item.phase;
            const sinT = Math.sin(t);
            const cosT = Math.cos(t);
            const x = item.majorRadius * sinT;
            const y = item.minorRadius * sinT * cosT;
            const z = Math.sin(t * 2 + item.phase) * item.zAmp;
            const idx = d * 3;
            pos[idx + 0] = x;
            pos[idx + 1] = y;
            pos[idx + 2] = z;
          }
          item.points.rotation.z = Math.sin(ev.life * item.wobbleSpeed + item.wobblePhase) * 0.035;
          item.points.geometry.attributes.position.needsUpdate = true;
          item.material.opacity = Math.max(0, item.baseOpacity * fade * pulse);
        }
        if (u >= 1) {
          disposeTrailEvent(ev);
          trailEvents.splice(i, 1);
        }
        continue;
      }
      const u = Math.min(1, ev.life / ev.maxLife);
      const fade = 1 - u;
      const stretch = 0.14 + u * 1.1;
      const tail = 0.42 - u * 0.18;
      const wob = Math.sin((ev.life + i) * 15) * ev.wobble;

      for (let r = 0; r < ev.rays.length; r += 1) {
        const ray = ev.rays[r];
        const headD = (ray.phase + stretch) * ray.speed;
        const tailD = Math.max(0, headD - ray.len * tail);
        const bx = ev.origin.x + wob * ray.dz * 0.28;
        const by = ev.origin.y + wob * 0.22;
        const bz = ev.origin.z + wob * ray.dx * 0.16;
        const p = r * 6;
        ev.positions[p + 0] = bx + ray.dx * tailD;
        ev.positions[p + 1] = by + ray.dy * tailD;
        ev.positions[p + 2] = bz + ray.dz * tailD;
        ev.positions[p + 3] = bx + ray.dx * headD;
        ev.positions[p + 4] = by + ray.dy * headD;
        ev.positions[p + 5] = bz + ray.dz * headD;
      }

      ev.lines.geometry.attributes.position.needsUpdate = true;
      ev.lines.material.opacity = Math.max(0, fade * fade * 0.78);

      if (u >= 1) {
        disposeTrailEvent(ev);
        trailEvents.splice(i, 1);
      }
    }
  }

  function spawnRipple(worldX, worldY, worldZ, color, opts = {}) {
    if (ripples.length >= MAX_RIPPLES) return;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: opts.opacity ?? 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geoRipple, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(worldX, worldY, worldZ);
    mesh.scale.setScalar(opts.baseScale ?? 1);
    mesh.renderOrder = 27;
    addToScene(mesh);
    ripples.push({
      mesh,
      mat,
      life: 0,
      maxLife: opts.maxLife ?? 0.48,
      grow: opts.grow ?? 2.8,
      rise: opts.rise ?? 0.18,
    });
  }

  function burst(worldX, worldY, worldZ, color, count = 20, speedBoost = 1, mode = 'merge') {
    const sb = Math.max(0.75, speedBoost);
    const isJackpot = mode === 'jackpot';
    const n = Math.min(count, Math.max(0, MAX_PARTICLES - particles.length));
    if (n <= 0) return;

    const col = new THREE.Color(color);
    const hot = new THREE.Color(0xffffff).lerp(col, 0.35);
    const ringBias = isJackpot ? 0.55 : 0.38;

    for (let i = 0; i < n; i += 1) {
      const shard = Math.random() < (isJackpot ? 0.5 : 0.34);
      const geo = shard ? geoShard : geoS;
      const additive = Math.random() < (isJackpot ? 0.5 : 0.32);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() < 0.28 ? hot.getHex() : col.getHex(),
        transparent: true,
        opacity: additive ? 0.92 : 0.98,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(worldX, worldY, worldZ + rnd() * 0.06);
      mesh.renderOrder = 25;
      addToScene(mesh);

      const ang = Math.random() * Math.PI * 2;
      const ring = Math.random() < ringBias;
      const sp = (isJackpot ? 3.2 : 2.2) + Math.random() * (isJackpot ? 7.5 : 5.8);
      const spf = sp * sb;
      let vx;
      let vy;
      let vz;
      if (ring) {
        vx = Math.cos(ang) * spf * 0.95;
        vy = Math.random() * spf * 0.55 + 0.85;
        vz = Math.sin(ang) * spf * 0.35;
      } else {
        vx = Math.cos(ang) * spf * 0.42;
        vy = Math.random() * spf * 0.95 + 1.35;
        vz = rnd() * spf * 0.32;
      }
      if (isJackpot) {
        vx *= 1.15;
        vy *= 1.08;
        vz *= 1.12;
      }

      particles.push({
        mesh,
        mat,
        vx,
        vy,
        vz,
        life: 0,
        maxLife: (isJackpot ? 0.52 : 0.38) + Math.random() * (isJackpot ? 0.35 : 0.28),
        drag: isJackpot ? 0.94 : 0.955,
        rotAxis: new THREE.Vector3(rnd(), rnd(), rnd()).normalize(),
        rotSpeed: (4 + Math.random() * 10) * (shard ? 1.4 : 0.85),
        baseScale: shard ? 0.75 + Math.random() * 1.1 : 0.55 + Math.random() * 0.95,
        gravity: isJackpot ? 11 : 9.2,
      });
    }
  }

  function smokePuff(worldX, worldY, worldZ, color, count = 22) {
    const col = new THREE.Color(color);
    const mist = new THREE.Color(0xf5f8ff).lerp(col, 0.35);
    const n = Math.min(count, Math.max(0, MAX_PARTICLES - particles.length));
    for (let i = 0; i < n; i += 1) {
      const startOp = 0.42 + Math.random() * 0.28;
      const mat = new THREE.MeshBasicMaterial({
        color: mist.clone().lerp(new THREE.Color(0xffffff), Math.random() * 0.25).getHex(),
        transparent: true,
        opacity: startOp,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(geoS, mat);
      mesh.position.set(
        worldX + rnd() * 0.35,
        worldY + rnd() * 0.22,
        worldZ + rnd() * 0.2 + 0.08,
      );
      mesh.renderOrder = 24;
      addToScene(mesh);
      const ang = Math.random() * Math.PI * 2;
      const sp = 0.85 + Math.random() * 2.1;
      particles.push({
        mesh,
        mat,
        vx: Math.cos(ang) * sp * 0.55,
        vy: 0.6 + Math.random() * 2.4,
        vz: Math.sin(ang) * sp * 0.28 + rnd() * 0.45,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.55,
        drag: 0.965,
        rotAxis: new THREE.Vector3(rnd(), rnd(), rnd()).normalize(),
        rotSpeed: 1 + Math.random() * 3,
        baseScale: 0.35 + Math.random() * 0.55,
        gravity: -2.2,
        isSmoke: true,
        smokeOpacity0: startOp,
      });
    }
  }

  function shatterSpray(worldX, worldY, worldZ, color, count = 16) {
    const col = new THREE.Color(color);
    const n = Math.min(count, Math.max(0, MAX_PARTICLES - particles.length));
    for (let i = 0; i < n; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        color: col.clone().offsetHSL(0, 0, 0.08 + Math.random() * 0.12).getHex(),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geoShard, mat);
      mesh.position.set(worldX + rnd() * 0.12, worldY + rnd() * 0.1, worldZ + rnd() * 0.08);
      mesh.renderOrder = 25;
      addToScene(mesh);
      const ang = Math.random() * Math.PI * 2;
      const sp = 3.5 + Math.random() * 8;
      particles.push({
        mesh,
        mat,
        vx: Math.cos(ang) * sp * 0.55,
        vy: Math.random() * sp * 0.85 + 1.2,
        vz: rnd() * sp * 0.45,
        life: 0,
        maxLife: 0.22 + Math.random() * 0.2,
        drag: 0.91,
        rotAxis: new THREE.Vector3(rnd(), rnd(), rnd()).normalize(),
        rotSpeed: (12 + Math.random() * 22) * 0.9,
        baseScale: 0.5 + Math.random() * 0.85,
        gravity: 12,
      });
    }
  }

  function burstSparks(worldX, worldY, worldZ, color, count = 12) {
    const col = new THREE.Color(color);
    const n = Math.min(count, Math.max(0, MAX_PARTICLES - particles.length));
    emitInstancedSparks(worldX, worldY, worldZ, color, Math.floor(n * 1.5), 1);
    const legacyCount = Math.min(n, 3);
    for (let i = 0; i < legacyCount; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        color: col.getHex(),
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geoS, mat);
      mesh.position.set(worldX + rnd() * 0.08, worldY + rnd() * 0.08, worldZ + 0.04);
      mesh.renderOrder = 26;
      addToScene(mesh);
      const ang = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 9;
      particles.push({
        mesh,
        mat,
        vx: Math.cos(ang) * sp * 0.4,
        vy: Math.random() * sp * 0.5 + 2,
        vz: rnd() * sp * 0.25,
        life: 0,
        maxLife: 0.14 + Math.random() * 0.12,
        drag: 0.88,
        rotAxis: new THREE.Vector3(0, 1, 0),
        rotSpeed: 8,
        baseScale: 0.25 + Math.random() * 0.35,
        gravity: 14,
      });
    }
  }

  function waterSplash(worldX, worldY, worldZ, intensity = 1) {
    const i = Math.max(0.6, Math.min(1.8, intensity));
    const watery = 0x70d8ff;
    burst(worldX, worldY, worldZ, watery, Math.floor(16 * i), 1.02 * i, 'merge');
    burstSparks(worldX, worldY, worldZ + 0.02, 0xcff7ff, Math.floor(8 + i * 8));
    smokePuff(worldX, worldY, worldZ, 0xc8edff, Math.floor(9 + i * 7));
    spawnRipple(worldX, worldY + 0.01, worldZ + 0.05, watery, {
      baseScale: 0.8,
      grow: 3 + i * 1.6,
      maxLife: 0.58,
      opacity: 0.36,
    });
    spawnRipple(worldX, worldY + 0.02, worldZ + 0.06, 0xd8f7ff, {
      baseScale: 0.45,
      grow: 2.4 + i * 1.4,
      maxLife: 0.44,
      opacity: 0.28,
    });
  }

  function triggerScreenTint(background, durationMs = 600) {
    const layer = ensureScreenLayer();
    if (!layer || tintInFlight) return;
    tintInFlight = true;
    const tint = document.createElement('div');
    Object.assign(tint.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      opacity: '0',
      background,
      transition: `opacity ${Math.round(durationMs * 0.34)}ms ease-out`,
    });
    layer.appendChild(tint);
    requestAnimationFrame(() => {
      tint.style.opacity = '1';
    });
    const fadeTimer = rememberTimer(
      setTimeout(() => {
        tint.style.transition = `opacity ${Math.round(durationMs * 0.66)}ms ease-in`;
        tint.style.opacity = '0';
        const removeTimer = rememberTimer(
          setTimeout(() => {
            tint.remove();
            tintInFlight = false;
            timers.delete(removeTimer);
          }, Math.round(durationMs * 0.7)),
        );
        timers.delete(fadeTimer);
      }, Math.round(durationMs * 0.28)),
    );
  }

  function triggerWaterTint(durationMs = 620) {
    triggerScreenTint(
      'radial-gradient(circle at 50% 36%, rgba(185,233,255,0.20), rgba(116,188,235,0.05) 45%, rgba(30,76,120,0.02) 100%)',
      durationMs,
    );
  }

  function triggerWarmTint(durationMs = 800) {
    triggerScreenTint(
      'radial-gradient(circle at 50% 40%, rgba(255,202,128,0.19), rgba(255,143,74,0.08) 42%, rgba(82,35,10,0.03) 100%)',
      durationMs,
    );
  }

  function spawnScreenDroplet(intensity = 1, options = {}) {
    const layer = ensureScreenLayer();
    if (!layer || activeScreenDroplets >= MAX_SCREEN_DROPLETS) return;

    activeScreenDroplets += 1;
    const d = document.createElement('div');
    const soft = !!options.soft;
    const size = soft
      ? 26 + Math.random() * (74 + intensity * 24)
      : 8 + Math.random() * (22 + intensity * 8);
    const xPct = 4 + Math.random() * 92;
    const yStart = -24 - Math.random() * (soft ? 34 : 40);
    const drift = rnd() * (soft ? 18 + intensity * 14 : 8 + intensity * 10);
    const fall = soft
      ? 34 + Math.random() * (82 + intensity * 68)
      : 86 + Math.random() * (178 + intensity * 122);
    const lifeMs = soft
      ? 880 + Math.random() * 980
      : 1200 + Math.random() * 1300;
    const alpha = soft
      ? 0.06 + Math.random() * 0.12
      : 0.2 + Math.random() * 0.35;
    const blur = soft ? 7 + Math.random() * 14 : 0.3 + Math.random() * 0.8;
    const border = soft
      ? '1px solid rgba(205,236,247,0.2)'
      : '1px solid rgba(215,245,255,0.42)';
    const shadow = soft
      ? '0 0 22px rgba(166,226,255,0.18), inset 0 0 12px rgba(245,252,255,0.22)'
      : '0 0 10px rgba(158,224,255,0.24), inset 0 0 5px rgba(255,255,255,0.55), inset -2px -4px 7px rgba(75,132,172,0.22)';
    const bg = soft
      ? 'radial-gradient(circle at 42% 34%, rgba(255,255,255,0.38) 0%, rgba(219,242,255,0.24) 28%, rgba(124,187,214,0.1) 58%, rgba(79,129,156,0.04) 100%)'
      : 'radial-gradient(circle at 30% 26%, rgba(255,255,255,0.92) 0%, rgba(224,245,255,0.75) 24%, rgba(126,187,220,0.28) 60%, rgba(70,127,160,0.08) 100%)';
    const stretch = soft ? 0.96 + Math.random() * 0.2 : 0.92 + Math.random() * 0.22;
    const wobble = soft ? 0.6 : 1;

    Object.assign(d.style, {
      position: 'absolute',
      left: `${xPct}%`,
      top: `${yStart}px`,
      width: `${size}px`,
      height: `${size * stretch}px`,
      borderRadius: '999px',
      transform: 'translate3d(0,0,0)',
      opacity: String(alpha),
      border,
      background: bg,
      boxShadow: shadow,
      backdropFilter: `blur(${blur.toFixed(2)}px) saturate(${soft ? 114 : 126}%)`,
      willChange: 'transform, opacity',
      transition: `transform ${lifeMs}ms ${soft ? 'ease-out' : 'linear'}, opacity ${lifeMs}ms ease-in`,
    });

    if (!soft) {
      const shine = document.createElement('div');
      Object.assign(shine.style, {
        position: 'absolute',
        left: '16%',
        top: '12%',
        width: '34%',
        height: '24%',
        borderRadius: '999px',
        background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95), rgba(255,255,255,0))',
        filter: 'blur(0.4px)',
        opacity: '0.84',
      });
      d.appendChild(shine);
    }

    layer.appendChild(d);
    requestAnimationFrame(() => {
      d.style.transform = `translate3d(${(drift * wobble).toFixed(2)}px, ${fall.toFixed(2)}px, 0)`;
      d.style.opacity = '0';
    });

    const timerId = rememberTimer(
      setTimeout(() => {
        d.remove();
        activeScreenDroplets = Math.max(0, activeScreenDroplets - 1);
        timers.delete(timerId);
      }, lifeMs + 80),
    );
  }

  /**
   * 2D wet-screen effect:
   * lightweight DOM droplets + short cyan tint.
   */
  function waterScreenDroplets(intensity = 1) {
    const dropletDensity = fxScale('dropletDensity');
    if (dropletDensity <= 0.001) return;
    const i = Math.max(0.5, Math.min(2, intensity * (0.62 + dropletDensity * 0.38)));
    const sharpCount = Math.floor((9 + i * 14) * dropletDensity);
    const softCount = Math.floor((3 + i * 5) * dropletDensity);
    for (let n = 0; n < sharpCount; n += 1) {
      const delay = Math.floor(Math.random() * 180);
      if (delay <= 0) {
        spawnScreenDroplet(i);
      } else {
        const id = rememberTimer(
          setTimeout(() => {
            spawnScreenDroplet(i);
            timers.delete(id);
          }, delay),
        );
      }
    }
    for (let n = 0; n < softCount; n += 1) {
      const delay = Math.floor(24 + Math.random() * 220);
      const id = rememberTimer(
        setTimeout(() => {
          spawnScreenDroplet(i * 0.92, { soft: true });
          timers.delete(id);
        }, delay),
      );
    }
    triggerWaterTint(620);
  }

  /**
   * Fire / combustion profile.
   */
  function fireBurst(worldX, worldY, worldZ, intensity = 1) {
    const i = Math.max(0.6, Math.min(1.9, intensity));
    const hot = 0xff8a1c;
    const ember = 0xffd25b;
    burst(worldX, worldY, worldZ, hot, Math.floor(18 + i * 18), 1.05 + i * 0.12, 'jackpot');
    burstSparks(worldX, worldY, worldZ + 0.07, ember, Math.floor(10 + i * 10));
    smokePuff(worldX, worldY + 0.04, worldZ + 0.05, 0xffb073, Math.floor(8 + i * 8));
    spawnRipple(worldX, worldY + 0.01, worldZ + 0.06, hot, {
      baseScale: 0.75,
      grow: 2.7 + i * 1.2,
      maxLife: 0.44,
      opacity: 0.28,
    });
    triggerWarmTint(800);
  }

  /**
   * General gas / chemical smoke profile.
   */
  function moleculeSmoke(worldX, worldY, worldZ, color, intensity = 1) {
    const i = Math.max(0.55, Math.min(1.8, intensity));
    const c = color ?? 0x9ec8ff;
    smokePuff(worldX, worldY, worldZ + 0.03, c, Math.floor(12 + i * 10));
    burstSparks(worldX, worldY + 0.03, worldZ + 0.05, c, Math.floor(4 + i * 6));
    spawnRipple(worldX, worldY + 0.01, worldZ + 0.05, c, {
      baseScale: 0.62,
      grow: 2.2 + i * 0.8,
      maxLife: 0.4,
      opacity: 0.24,
    });
  }

  /**
   * Strong creation blast for special molecules.
   */
  function creationExplosion(worldX, worldY, worldZ, intensity = 1) {
    const i = Math.max(0.6, Math.min(2.1, intensity));
    const c1 = 0xd8f6ff;
    const c2 = 0x8ed2ff;
    burst(worldX, worldY, worldZ, c2, Math.floor(24 + i * 24), 1.18 + i * 0.16, 'jackpot');
    burstSparks(worldX, worldY, worldZ + 0.07, c1, Math.floor(10 + i * 10));
    shatterSpray(worldX, worldY, worldZ + 0.03, c2, Math.floor(7 + i * 9));
    spawnRipple(worldX, worldY + 0.01, worldZ + 0.06, c1, {
      baseScale: 0.9,
      grow: 3.4 + i * 1.8,
      maxLife: 0.55,
      opacity: 0.36,
    });
    spawnRipple(worldX, worldY + 0.02, worldZ + 0.07, c2, {
      baseScale: 0.62,
      grow: 4.2 + i * 2.2,
      maxLife: 0.62,
      opacity: 0.28,
    });
  }

  /**
   * Backward-compatible hook used by previous merge code.
   */
  function moleculeCreationBurst(worldX, worldY, worldZ, moleculeColor, _formula, intensity = 1) {
    const i = Math.max(0.65, Math.min(1.65, intensity));
    creationExplosion(worldX, worldY, worldZ, i);
    moleculeSmoke(worldX, worldY, worldZ + 0.02, moleculeColor ?? 0x8dd3ff, 0.95 + i * 0.25);
  }

  function playFxPrimitive(primitive, context = {}) {
    if (!primitive || typeof primitive !== 'object' || primitive.enabled === false) return;
    const type = String(primitive.type ?? 'burst');
    const baseIntensity = Math.max(0, Number(context.intensity ?? 1) || 1);
    const px = Number.isFinite(context.worldX) ? Number(context.worldX) : 0;
    const py = Number.isFinite(context.worldY) ? Number(context.worldY) : 0;
    const pz = Number.isFinite(context.worldZ) ? Number(context.worldZ) : 0.04;
    const targetX = Number.isFinite(context.targetX) ? Number(context.targetX) : null;
    const targetY = Number.isFinite(context.targetY) ? Number(context.targetY) : null;
    const targetZ = Number.isFinite(context.targetZ) ? Number(context.targetZ) : pz;
    const useContextColor = primitive.useContextColor !== false;
    const color = useContextColor
      ? Number(context.color ?? primitive.color ?? 0x8ed8ff)
      : Number(primitive.color ?? context.color ?? 0x8ed8ff);
    const intensity = Math.max(0, baseIntensity * (Number(primitive.intensity) || 1));
    const size = Math.max(0, Number(primitive.size) || 1);
    const count = Math.max(0, Number(primitive.count) || 1);
    const speed = Math.max(0, Number(primitive.speed) || 1);
    const duration = Math.max(0, Number(primitive.duration) || 1);
    const style = String(primitive.style ?? 'auto').toLowerCase();

    if (type === 'burst') {
      burst(
        px,
        py,
        pz,
        color,
        Math.max(1, Math.floor((8 + count * 10) * size)),
        Math.max(0.1, intensity * (0.5 + size * 0.4)),
        context.variant ?? 'merge',
      );
      return;
    }
    if (type === 'sparks') {
      burstSparks(px, py, pz + 0.03, color, Math.max(1, Math.floor((6 + count * 8) * intensity * size)));
      return;
    }
    if (type === 'sparkStorm') {
      burstSparks(px, py, pz + 0.04, color, Math.max(8, Math.floor((10 + count * 16) * intensity * size)));
      specialMoleculeTrails(
        px,
        py,
        pz + 0.03,
        color,
        intensity * Math.max(0.24, size) * Math.max(0.24, speed),
        style === 'lite' ? 'lite' : 'full',
        { radius: primitive.radius, spread: primitive.spread, speed: primitive.speed, duration: primitive.duration },
      );
      return;
    }
    if (type === 'smoke') {
      smokePuff(px, py, pz, color, Math.max(1, Math.floor((10 + count * 10) * size * duration)));
      return;
    }
    if (type === 'shatter') {
      shatterSpray(px, py, pz, color, Math.max(1, Math.floor((6 + count * 7) * intensity * size)));
      return;
    }
    if (type === 'bond') {
      if (targetX == null || targetY == null) return;
      moleculeBondLink(px, py, pz, targetX, targetY, targetZ ?? pz, color, intensity * Math.max(0.15, size));
      return;
    }
    if (type === 'attractor') {
      if (targetX == null || targetY == null) return;
        atomPairAttractor(px, py, pz, targetX, targetY, targetZ ?? pz, color, intensity, {
          size,
          count,
          speed,
          duration,
          radius: primitive.radius,
          spread: primitive.spread,
          opacity: primitive.opacity,
          style,
        });
        return;
      }
    if (type === 'orbit') {
      addElectronOrbitEvent(px, py, pz + 0.03, color, intensity, {
        size,
          count,
          speed,
          duration,
          spread: primitive.spread,
          opacity: primitive.opacity,
          radius: (Number(context.radius) || undefined) ? (Number(context.radius) * Math.max(0.2, Math.min(3, Number(primitive.radius) || 1))) : undefined,
        });
        return;
      }
      if (type === 'trails') {
        specialMoleculeTrails(
        px,
        py,
          pz + 0.03,
          color,
          intensity * Math.max(0.2, size) * Math.max(0.2, speed),
          style === 'full' ? 'full' : 'lite',
          { radius: primitive.radius, spread: primitive.spread, speed: primitive.speed, duration: primitive.duration },
        );
        return;
      }
    if (type === 'explosion') {
      creationExplosion(px, py, pz, intensity * Math.max(0.2, size));
      return;
    }
    if (type === 'waterSplash') {
      waterSplash(px, py, pz, intensity * Math.max(0.2, size));
      return;
    }
    if (type === 'waterDroplets') {
      waterScreenDroplets(intensity * Math.max(0.2, size) * Math.max(0.2, duration));
      return;
    }
    if (type === 'fire') {
      fireBurst(px, py, pz, intensity * Math.max(0.2, size));
    }
  }

  function playFxProfileStack(profile, context = {}) {
    const stack = Array.isArray(profile?.stackEntries) ? profile.stackEntries : [];
    for (const primitive of stack) {
      playFxPrimitive(primitive, context);
    }
  }

  function updateParticles(dt) {
    updateAmbientParticles(dt);
    updateInstancedSparks(dt);
    updateTrailEvents(dt);

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life += dt;
      const g = p.gravity ?? 10;
      p.vy -= g * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vz *= p.drag;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotateOnAxis(p.rotAxis, p.rotSpeed * dt);

      const u = p.life / p.maxLife;
      const fade = 1 - u;
      const ease = fade * fade;
      let s;
      if (p.isSmoke) {
        const grow = 0.65 + 1.85 * (1 - (1 - u) ** 2);
        s = p.baseScale * grow;
      } else {
        s = p.baseScale * (0.4 + 1.5 * ease);
      }
      p.mesh.scale.setScalar(s);
      if (p.isSmoke) {
        const o0 = p.smokeOpacity0 ?? 0.55;
        p.mat.opacity = Math.max(0, o0 * (1 - u * u * 1.15));
      } else {
        const op =
          p.mat.blending === THREE.AdditiveBlending
            ? Math.max(0, fade * 1.15)
            : Math.max(0, 1 - u * 1.08);
        p.mat.opacity = Math.min(1, op);
      }

      if (p.life >= p.maxLife) {
        removeFromScene(p.mesh);
        p.mat.dispose();
        particles.splice(i, 1);
      }
    }

    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      const ring = ripples[i];
      ring.life += dt;
      const u = Math.min(1, ring.life / ring.maxLife);
      ring.mesh.scale.setScalar(1 + u * ring.grow);
      ring.mesh.position.y += ring.rise * dt;
      ring.mat.opacity = Math.max(0, (1 - u) * (1 - u) * 0.95);
      if (u >= 1) {
        removeFromScene(ring.mesh);
        ring.mat.dispose();
        ripples.splice(i, 1);
      }
    }
  }

  function computePileStress(fruits, FRUITS, gameOverY, band) {
    let s = 0;
    for (const f of fruits) {
      const r = FRUITS[f.type].radius;
      const top = f.body.position.y + r;
      const d = gameOverY - top;
      if (d < band) s = Math.max(s, 1 - Math.max(0, d) / band);
    }
    return Math.min(1, s);
  }

  function updateDangerLine(dangerLineMesh, stress, time) {
    if (!dangerLineMesh?.material) return;
    const m = dangerLineMesh.material;
    const pulse = 0.55 + 0.45 * Math.sin(time * (6.5 + stress * 10));
    m.opacity = 0.28 + stress * 0.52 * pulse;
    const c = new THREE.Color().setHSL(
      0.02 - stress * 0.02,
      0.85 + stress * 0.12,
      0.52 + stress * 0.12,
    );
    m.color.copy(c);
  }

  function setFxConfig(next = {}) {
    Object.assign(fxConfig, normalizeFxConfig(next));
    return { ...fxConfig };
  }

  function getFxConfig() {
    return { ...fxConfig };
  }

  function dispose() {
    for (const event of trailEvents) disposeTrailEvent(event);
    trailEvents.length = 0;
    for (const p of particles) {
      removeFromScene(p.mesh);
      p.mat.dispose();
    }
    particles.length = 0;
    for (const ring of ripples) {
      removeFromScene(ring.mesh);
      ring.mat.dispose();
    }
    ripples.length = 0;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    if (screenLayer) {
      screenLayer.remove();
      screenLayer = null;
    }
    activeScreenDroplets = 0;
    tintInFlight = false;
    removeFromScene(ambientMesh);
    removeFromScene(sparkMesh);
    geoS.dispose();
    geoShard.dispose();
    geoRipple.dispose();
    ambientGeo.dispose();
    ambientMat.dispose();
    sparkGeo.dispose();
    sparkMat.dispose();
  }

  initAmbientParticles();
  initSparkPool();
  setFxConfig(options.fxConfig ?? {});

  return {
    burst,
    burstSparks,
    smokePuff,
    shatterSpray,
    waterSplash,
    waterScreenDroplets,
    fireBurst,
    moleculeSmoke,
    creationExplosion,
    specialMoleculeTrails,
    moleculeBondLink,
    atomPairAttractor,
    moleculeCreationBurst,
    playFxPrimitive,
    playFxProfileStack,
    setFxConfig,
    getFxConfig,
    updateParticles,
    computePileStress,
    updateDangerLine,
    dispose,
  };
}
