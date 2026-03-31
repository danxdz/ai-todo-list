import * as THREE from 'three';

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
const BG_MICRO_1 = `${BASE_URL}background/micro_atoms_1.jpg`;
const BG_MICRO_2 = `${BASE_URL}background/micro_atoms_2.jpg`;
const BG_MICRO_3 = `${BASE_URL}background/micro_atoms_3.jpg`;
const BG_MICRO_4 = `${BASE_URL}background/micro_atoms_4.jpg`;
const BG_SOFT_0 = `${BASE_URL}background/Lucid_Origin_soft_teal_blue_gradient_background_subtle_lightin_0.jpg`;
const BG_SOFT_1 = `${BASE_URL}background/Lucid_Origin_soft_teal_blue_gradient_background_subtle_lightin_1.jpg`;
const BG_SOFT_2 = `${BASE_URL}background/Lucid_Origin_soft_teal_blue_gradient_background_subtle_lightin_2.jpg`;
const BG_SOFT_3 = `${BASE_URL}background/Lucid_Origin_soft_teal_blue_gradient_background_subtle_lightin_3.jpg`;

const BG_IMAGE_URLS = [BG_MICRO_1, BG_MICRO_2, BG_MICRO_3, BG_MICRO_4, BG_SOFT_0, BG_SOFT_1, BG_SOFT_2, BG_SOFT_3];

function getBackgroundForWorld(mode = 'atoms', worldId = '') {
  if (mode === 'atoms') {
    if (worldId === 'reactive') return BG_MICRO_3;
    if (worldId === 'metals') return BG_MICRO_4;
    return BG_MICRO_1;
  }
  if (mode === 'numbers') return BG_SOFT_1;
  if (mode === 'fruit') return BG_MICRO_2;
  return BG_SOFT_0;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawFallback(ctx, width, height, time) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#35577d');
  g.addColorStop(0.25, '#2a4767');
  g.addColorStop(0.55, '#223b56');
  g.addColorStop(1, '#1a2b43');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  const glowX = width * (0.5 + Math.sin(time * 0.05) * 0.09);
  const glowY = height * (0.36 + Math.cos(time * 0.04) * 0.06);
  const rg = ctx.createRadialGradient(glowX, glowY, height * 0.08, width * 0.5, height * 0.52, height * 0.8);
  rg.addColorStop(0, 'rgba(112, 214, 255, 0.2)');
  rg.addColorStop(0.6, 'rgba(54, 125, 176, 0.07)');
  rg.addColorStop(1, 'rgba(20, 36, 58, 0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, width, height);
}

function drawContainImage(ctx, img, width, height, alpha = 1) {
  if (!img || alpha <= 0) return;
  const scale = Math.min(width / img.width, height / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const x = (width - drawW) * 0.5;
  const y = (height - drawH) * 0.5;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x, y, drawW, drawH);
  ctx.restore();
}

/** Cover (crop) — same idea as CSS background-size: cover. */
function drawCoverImage(ctx, img, width, height, alpha = 1) {
  if (!img || alpha <= 0) return;
  const scale = Math.max(width / img.width, height / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const x = (width - drawW) * 0.5;
  const y = (height - drawH) * 0.5;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x, y, drawW, drawH);
  ctx.restore();
}

function createLorenzTrail(seed = 0) {
  const s = seed * 0.17 + 1;
  return {
    sigma: 10,
    beta: 8 / 3,
    rho: 28 + Math.sin(s) * 2.1,
    x: 0.1 + Math.sin(s * 1.7) * 0.02,
    y: 0,
    z: 0,
    points: [],
  };
}

function stepLorenzTrail(trail, dt, historyMax) {
  const { sigma, beta, rho } = trail;
  const dx = sigma * (trail.y - trail.x);
  const dy = trail.x * (rho - trail.z) - trail.y;
  const dz = trail.x * trail.y - beta * trail.z;
  trail.x += dx * dt;
  trail.y += dy * dt;
  trail.z += dz * dt;
  trail.points.push({ x: trail.x, z: trail.z });
  if (trail.points.length > historyMax) trail.points.splice(0, trail.points.length - historyMax);
}

function drawLorenzTrails(ctx, width, height, trails, time, lowPerfDevice) {
  if (!trails?.length) return;
  const cx = width * 0.5;
  const cy = height * 0.38;
  const scale = Math.min(width, height) * (lowPerfDevice ? 0.0051 : 0.0058);
  const hueBase = 192 + Math.sin(time * 0.11) * 10;

  ctx.save();
  for (let i = 0; i < trails.length; i += 1) {
    const pts = trails[i].points;
    if (!pts || pts.length < 3) continue;
    const alpha = lowPerfDevice ? 0.05 : 0.08;
    const hue = hueBase + i * 8;
    ctx.strokeStyle = `hsla(${hue}, 68%, 76%, ${alpha})`;
    ctx.lineWidth = lowPerfDevice ? 0.8 : 1.05;
    ctx.beginPath();
    for (let p = 0; p < pts.length; p += 1) {
      const sx = cx + pts[p].x * scale;
      const sy = cy + pts[p].z * scale;
      if (p === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function attachSceneBackground(scene, options = {}) {
  const initialWidth =
    Math.max(1, Math.floor(Number(options.width) || 0)) ||
    (typeof window !== 'undefined' ? Math.max(1, Math.floor(window.innerWidth)) : 864);
  const initialHeight =
    Math.max(1, Math.floor(Number(options.height) || 0)) ||
    (typeof window !== 'undefined' ? Math.max(1, Math.floor(window.innerHeight)) : 1536);
  const canvas = document.createElement('canvas');
  canvas.width = initialWidth;
  canvas.height = initialHeight;
  const ctx = canvas.getContext('2d');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  scene.background = tex;

  const state = {
    time: 0,
    mode: options.mode ?? 'atoms',
    worldId: options.worldId ?? '',
    level: Math.max(1, Math.floor(Number(options.level) || 1)),
    width: initialWidth,
    height: initialHeight,
    imagesByUrl: new Map(),
    currentUrl: '',
    lowPerfDevice:
      typeof navigator !== 'undefined' &&
      ((/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && window.innerWidth < 1200) ||
        (Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 6)),
    lorenzTrails: [],
  };

  const lorenzCount = state.lowPerfDevice ? 3 : 5;
  const lorenzHistory = state.lowPerfDevice ? 56 : 88;
  for (let i = 0; i < lorenzCount; i += 1) {
    const trail = createLorenzTrail(i + 1);
    for (let warm = 0; warm < 64; warm += 1) stepLorenzTrail(trail, 0.005, lorenzHistory);
    state.lorenzTrails.push(trail);
  }

  function selectBackgroundUrl() {
    return getBackgroundForWorld(state.mode, state.worldId) ?? BG_IMAGE_URLS[0];
  }

  function refreshBackgroundSelection() {
    state.currentUrl = selectBackgroundUrl();
  }

  function drawAnimated() {
    const { time, width, height } = state;
    ctx.clearRect(0, 0, width, height);

    const img = state.imagesByUrl.get(state.currentUrl) ?? null;
    if (!img) {
      drawFallback(ctx, width, height, time);
      return;
    }

    if (state.mode === 'atoms') {
      drawCoverImage(ctx, img, width, height, 1);
      return;
    }

    ctx.fillStyle = '#04080f';
    ctx.fillRect(0, 0, width, height);
    drawContainImage(ctx, img, width, height, 1);

    const hue = 188 + Math.sin(time * 0.058) * 14;
    ctx.globalAlpha = 1;
    ctx.fillStyle = `hsla(${hue}, 56%, 38%, 0.3)`;
    ctx.fillRect(0, 0, width, height);

    const rg = ctx.createRadialGradient(
      width * (0.52 + Math.sin(time * 0.04) * 0.05),
      height * 0.36,
      height * 0.04,
      width * 0.5,
      height * 0.58,
      height * 0.72,
    );
    rg.addColorStop(0, 'rgba(190, 244, 255, 0.17)');
    rg.addColorStop(0.56, 'rgba(124, 193, 224, 0.08)');
    rg.addColorStop(1, 'rgba(38, 66, 100, 0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, width, height);

    const edge = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.28,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72,
    );
    edge.addColorStop(0, 'rgba(0, 0, 0, 0)');
    edge.addColorStop(0.62, 'rgba(0, 0, 0, 0.26)');
    edge.addColorStop(1, 'rgba(0, 0, 0, 0.68)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, width, height);

    drawLorenzTrails(ctx, width, height, state.lorenzTrails, time, state.lowPerfDevice);
  }

  Promise.all(
    BG_IMAGE_URLS.map((url) =>
      loadImage(url)
        .then((img) => ({ url, img }))
        .catch(() => null),
    ),
  ).then((entries) => {
    for (const entry of entries) {
      if (!entry || !entry.url || !entry.img) continue;
      state.imagesByUrl.set(entry.url, entry.img);
    }
  });

  refreshBackgroundSelection();
  drawFallback(ctx, state.width, state.height, 0);
  tex.needsUpdate = true;

  return {
    update(dt = 0.016) {
      state.time += Math.max(0, dt);
      const lorenzSteps = state.lowPerfDevice ? 1 : 2;
      for (const trail of state.lorenzTrails) {
        for (let s = 0; s < lorenzSteps; s += 1) {
          stepLorenzTrail(trail, 0.005, lorenzHistory);
        }
      }
      drawAnimated();
      tex.needsUpdate = true;
    },
    resize(nextWidth, nextHeight) {
      const width = Math.max(1, Math.floor(Number(nextWidth) || 0));
      const height = Math.max(1, Math.floor(Number(nextHeight) || 0));
      if (!width || !height) return;
      if (width === state.width && height === state.height) return;
      state.width = width;
      state.height = height;
      canvas.width = width;
      canvas.height = height;
      drawAnimated();
      tex.needsUpdate = true;
    },
    setLevel(nextLevel) {
      const n = Math.max(1, Math.floor(Number(nextLevel) || 1));
      if (n === state.level) return;
      state.level = n;
      refreshBackgroundSelection();
    },
    setWorld(nextWorldId = '', mode = state.mode) {
      state.worldId = nextWorldId ?? '';
      state.mode = mode ?? state.mode;
      refreshBackgroundSelection();
    },
    getCurrentImageUrl() {
      return state.currentUrl;
    },
    dispose() {
      tex.dispose();
    },
  };
}

export function createRendererAndCamera(container = document.body) {
  /** Perspective default — real depth cues; frustum updated in viewport-ortho */
  const camera = new THREE.PerspectiveCamera(42, 1, 0.2, 120);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const isLikelyMobile =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 1100));
  const lowPerfDevice =
    isLikelyMobile ||
    (typeof navigator !== 'undefined' &&
      Number.isFinite(navigator.hardwareConcurrency) &&
      navigator.hardwareConcurrency <= 6);
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPerfDevice ? 1.25 : 1.7));
  renderer.setClearColor(0x1a2438, 1);
  container.appendChild(renderer.domElement);
  const canvasEl = renderer.domElement;
  canvasEl.style.touchAction = 'none';
  canvasEl.style.zIndex = '1';
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  return { renderer, camera, canvasEl };
}

/**
 * Aim key light at the cup volume so shadows fall forward/down onto the floor and back wall.
 * Call after cup height changes if you need a moving target; y ≈ mid pile height works well.
 */
export function aimKeyLightAt(sun, targetY = 6.5, targetZ = 0) {
  if (!sun?.target) return;
  sun.target.position.set(0, targetY, targetZ);
  sun.target.updateMatrixWorld();
}

export function addDefaultLights(scene) {
  const isLikelyMobile =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 1100));
  const lowPerfDevice =
    isLikelyMobile ||
    (typeof navigator !== 'undefined' &&
      Number.isFinite(navigator.hardwareConcurrency) &&
      navigator.hardwareConcurrency <= 6);
  /** Softer fill so matte marbles don’t get a harsh “pin” spec from point lights */
  scene.add(new THREE.AmbientLight(0xd8e2f2, 0.38));

  /** Mostly top-down → shorter shadows on back wall, softer penumbra */
  const sun = new THREE.DirectionalLight(0xfff8f5, 0.62);
  sun.position.set(0.35, 36, 5.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowPerfDevice ? 1024 : 2048, lowPerfDevice ? 1024 : 2048);
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 52;
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -4;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.065;
  sun.shadow.radius = 9;

  const sunTarget = new THREE.Object3D();
  sunTarget.position.set(0, 6.5, 0);
  scene.add(sunTarget);
  sun.target = sunTarget;
  scene.add(sun);

  scene.add(new THREE.HemisphereLight(0xc4d2ec, 0x283448, 0.45));
  const plasmaFill = new THREE.PointLight(0xffe8d8, 0.14, 52);
  plasmaFill.position.set(5.2, 12, 7);
  scene.add(plasmaFill);
  const coolRim = new THREE.PointLight(0xa8b8e8, 0.11, 50);
  coolRim.position.set(-6, 9, 10);
  scene.add(coolRim);
  return { sun, sunTarget };
}
