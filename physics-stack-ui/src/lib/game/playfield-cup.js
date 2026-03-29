/**
 * Shared cup / playfield visuals + static colliders + camera fit for merge demos.
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const PLAYFIELD_BG_IMAGE_CACHE = new Map();

function loadPlayfieldBackdropImage(url) {
  if (!url) return Promise.resolve(null);
  if (PLAYFIELD_BG_IMAGE_CACHE.has(url)) return Promise.resolve(PLAYFIELD_BG_IMAGE_CACHE.get(url));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      PLAYFIELD_BG_IMAGE_CACHE.set(url, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function drawBackdropCover(ctx, img, width, height, alpha = 0.22, zoom = 1) {
  if (!img) return;
  const scale = Math.min(width / img.width, height / img.height) * zoom;
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const x = (width - drawW) * 0.5;
  const y = (height - drawH) * 0.5;
  ctx.save();
  ctx.fillStyle = '#050a11';
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x, y, drawW, drawH);
  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    Math.min(width, height) * 0.32,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.75,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.64, 'rgba(0, 0, 0, 0.22)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** @typedef {'marble' | 'numbers' | 'atoms'} PlayfieldThemeId */

/**
 * Straight horizontal alignment (no side yaw) with enough downward tilt for stable aiming.
 * @param {import('three').Camera} camera
 * @param {number} midY — matches layout orthoMidY from fitCameraToCup
 */
export function applyMergeOrthoCameraPose(camera, midY) {
  const lookYFocus = midY + 0.86;
  if (camera.isPerspectiveCamera) {
    const dist = 17.1;
    camera.position.set(0, midY + 2.85, dist);
  } else {
    camera.position.set(0, midY + 2.15, 19.8);
  }
  camera.up.set(0, 1, 0);
  camera.lookAt(0, lookYFocus, 0);
}

/** @type {Record<PlayfieldThemeId, { backGrad: string[]; backRadial: string; floorGrad: string[]; zoneEmissive: number; floorEmissive: number; baseColor: number; glassColor: number }>} */
export const PLAYFIELD_THEMES = {
  marble: {
    backGrad: ['#4a6088', '#3d4f72', '#2c3a58', '#242e48', '#1a2238'],
    backRadial: 'rgba(120, 160, 220, 0.22)',
    floorGrad: ['#5a6e90', '#3d4d68', '#2a3548'],
    zoneEmissive: 0x1a2238,
    floorEmissive: 0x151a28,
    baseColor: 0x252b3a,
    glassColor: 0xa8c0e8,
  },
  numbers: {
    backGrad: ['#4a6088', '#3d4f72', '#2c3a58', '#242e48', '#1a2238'],
    backRadial: 'rgba(120, 160, 220, 0.22)',
    floorGrad: ['#5a6e90', '#3d4d68', '#2a3548'],
    zoneEmissive: 0x1a2238,
    floorEmissive: 0x151a28,
    baseColor: 0x252b3a,
    glassColor: 0xa8c0e8,
  },
  atoms: {
    backGrad: ['#2d4a42', '#243838', '#1a2e28', '#14221c', '#0c1612'],
    backRadial: 'rgba(120, 220, 180, 0.18)',
    floorGrad: ['#4a7068', '#2d4540', '#1a2e28'],
    zoneEmissive: 0x0a1814,
    floorEmissive: 0x0a1410,
    baseColor: 0x1a2824,
    glassColor: 0xa8e0d0,
  },
};

/**
 * @param {object} opts
 * @param {import('three').Scene} opts.scene
 * @param {import('cannon-es').World} opts.world
 * @param {import('three').PerspectiveCamera | import('three').OrthographicCamera} opts.camera
 * @param {*} opts.keyLight
 * @param {typeof import('./render.js').aimKeyLightAt} opts.aimKeyLightAt
 * @param {() => { width: number, height: number }} opts.getViewportSize
 * @param {(p: { halfW: number, halfSpanY: number, midY: number }) => void} opts.applyCupOrthoFrame
 * @param {() => void} opts.syncCanvasToViewport
 * @param {number} opts.ROW_Z
 * @param {object} opts.CUP_BASE
 * @param {{ wallH: number, halfX: number, halfZ: number, wallT: number }} opts.CUP
 * @param {() => number} opts.getDropCenterY
 * @param {(v: number) => void} opts.setDropCenterY
 * @param {() => number} opts.getGameOverY
 * @param {(v: number) => void} opts.setGameOverY
 * @param {number} opts.GAME_OVER_BELOW_RIM
 * @param {PlayfieldThemeId} [opts.themeId]
 * @param {string} [opts.playfieldBackgroundUrl]
 */
export function createPlayfieldCup(opts) {
  const {
    scene,
    world,
    camera,
    keyLight,
    aimKeyLightAt,
    getViewportSize,
    applyCupOrthoFrame,
    syncCanvasToViewport,
    ROW_Z,
    CUP_BASE,
    CUP,
    getDropCenterY,
    setDropCenterY,
    getGameOverY,
    setGameOverY,
    GAME_OVER_BELOW_RIM,
    themeId = 'marble',
    playfieldBackgroundUrl = '',
  } = opts;

  const theme = PLAYFIELD_THEMES[themeId] ?? PLAYFIELD_THEMES.marble;

  let playfieldMaps = null;
  let activeBackdropUrl = typeof playfieldBackgroundUrl === 'string' ? playfieldBackgroundUrl : '';

  function repaintBackMap() {
    if (!playfieldMaps?.backCtx || !playfieldMaps?.backCanvas || !playfieldMaps?.backMap) return;
    const bx = playfieldMaps.backCtx;
    const cb = playfieldMaps.backCanvas;
    const bw = cb.width;
    const bh = cb.height;

    bx.clearRect(0, 0, bw, bh);
    const gStops = theme.backGrad;
    const vg = bx.createLinearGradient(0, 0, 0, bh);
    const n = gStops.length - 1;
    gStops.forEach((c, i) => vg.addColorStop(i / n, c));
    bx.fillStyle = vg;
    bx.fillRect(0, 0, bw, bh);

    drawBackdropCover(bx, playfieldMaps.backdropImage, bw, bh, 0.22, 1.1);
    bx.fillStyle = 'rgba(8, 18, 30, 0.42)';
    bx.fillRect(0, 0, bw, bh);

    const rg = bx.createRadialGradient(bw * 0.5, bh * 0.35, bh * 0.08, bw * 0.45, bh * 0.42, bh * 0.62);
    rg.addColorStop(0, theme.backRadial);
    rg.addColorStop(0.45, 'rgba(60, 90, 140, 0.08)');
    rg.addColorStop(1, 'rgba(20, 28, 48, 0)');
    bx.fillStyle = rg;
    bx.fillRect(0, 0, bw, bh);

    bx.globalAlpha = 0.14;
    for (let i = 0; i < 900; i += 1) {
      bx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.06})`;
      bx.fillRect(Math.random() * bw, Math.random() * bh, 1.2, 2.2 + Math.random() * 3);
    }
    bx.globalAlpha = 1;
    playfieldMaps.backMap.needsUpdate = true;
  }

  function setBackdropImage(url = '') {
    activeBackdropUrl = typeof url === 'string' ? url : '';
    if (!playfieldMaps) return;
    if (!activeBackdropUrl) {
      playfieldMaps.backdropImage = null;
      repaintBackMap();
      return;
    }
    const token = activeBackdropUrl;
    loadPlayfieldBackdropImage(activeBackdropUrl)
      .then((img) => {
        if (!playfieldMaps || activeBackdropUrl !== token) return;
        playfieldMaps.backdropImage = img;
        repaintBackMap();
      })
      .catch(() => {
        if (!playfieldMaps || activeBackdropUrl !== token) return;
        playfieldMaps.backdropImage = null;
        repaintBackMap();
      });
  }

  function ensurePlayfieldMaps() {
    if (playfieldMaps) return playfieldMaps;
    const bw = 384;
    const bh = 640;
    const cb = document.createElement('canvas');
    cb.width = bw;
    cb.height = bh;
    const bx = cb.getContext('2d');
    const backMap = new THREE.CanvasTexture(cb);
    backMap.colorSpace = THREE.SRGBColorSpace;

    const fs = 256;
    const cf = document.createElement('canvas');
    cf.width = fs;
    cf.height = fs;
    const fx = cf.getContext('2d');
    const fg = fx.createRadialGradient(fs * 0.5, fs * 0.5, 0, fs * 0.5, fs * 0.5, fs * 0.72);
    const [f0, f1, f2] = theme.floorGrad;
    fg.addColorStop(0, f0);
    fg.addColorStop(0.55, f1);
    fg.addColorStop(1, f2);
    fx.fillStyle = fg;
    fx.fillRect(0, 0, fs, fs);
    fx.strokeStyle = 'rgba(255,255,255,0.04)';
    fx.lineWidth = 1;
    const step = 32;
    for (let x = 0; x <= fs; x += step) {
      fx.beginPath();
      fx.moveTo(x, 0);
      fx.lineTo(x, fs);
      fx.stroke();
    }
    for (let y = 0; y <= fs; y += step) {
      fx.beginPath();
      fx.moveTo(0, y);
      fx.lineTo(fs, y);
      fx.stroke();
    }
    fx.globalAlpha = 0.12;
    for (let i = 0; i < 4000; i++) {
      fx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.05})`;
      fx.fillRect(Math.random() * fs, Math.random() * fs, 1.5, 1.5);
    }
    fx.globalAlpha = 1;
    const floorMap = new THREE.CanvasTexture(cf);
    floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
    floorMap.repeat.set(2.2, 2.2);
    floorMap.colorSpace = THREE.SRGBColorSpace;

    playfieldMaps = { backMap, floorMap, backCanvas: cb, backCtx: bx, backdropImage: null };
    repaintBackMap();
    setBackdropImage(activeBackdropUrl);
    return playfieldMaps;
  }

  const cupGroup = new THREE.Group();
  scene.add(cupGroup);

  let floorVis = null;
  /** @type {THREE.Mesh | null} */
  let dangerLine = null;

  const staticBodies = [];

  function clearCupVisuals() {
    while (cupGroup.children.length) {
      const o = cupGroup.children.pop();
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const m = o.material;
        m.map = null;
        m.roughnessMap = null;
        m.normalMap = null;
        m.dispose?.();
      }
    }
    floorVis = null;
    dangerLine = null;
  }

  function buildCupVisuals() {
    clearCupVisuals();
    const maps = ensurePlayfieldMaps();
    const wh = CUP.wallH;
    const hx = CUP.halfX;
    const hz = CUP.halfZ;
    const wt = CUP.wallT;
    const backZ = ROW_Z - 0.52;
    const innerX = hx - wt;
    const frontZ = hz - 0.02;

    const backW = hx * 2 + wt * 2 + 0.55;
    const backH = wh + 0.75;
    const zoneBackMat = new THREE.MeshStandardMaterial({
      map: maps.backMap,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.04,
      emissive: theme.zoneEmissive,
      emissiveIntensity: 0.14,
      envMapIntensity: 0.35,
    });
    const zoneBack = new THREE.Mesh(new THREE.PlaneGeometry(backW, backH), zoneBackMat);
    zoneBack.position.set(0, wh * 0.5 - 0.08, backZ);
    zoneBack.receiveShadow = true;
    cupGroup.add(zoneBack);

    const floorMat = new THREE.MeshStandardMaterial({
      map: maps.floorMap,
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.08,
      emissive: theme.floorEmissive,
      emissiveIntensity: 0.08,
      envMapIntensity: 0.4,
    });
    const floorGeo = new THREE.PlaneGeometry(innerX * 2 + 0.08, hz * 2 + 0.08);
    floorVis = new THREE.Mesh(floorGeo, floorMat);
    floorVis.rotation.x = -Math.PI / 2;
    floorVis.position.y = 0.002;
    floorVis.receiveShadow = true;
    cupGroup.add(floorVis);

    const baseMat = new THREE.MeshStandardMaterial({
      color: theme.baseColor,
      roughness: 0.9,
      metalness: 0.18,
      envMapIntensity: 0.45,
    });
    const baseH = 0.16;
    const baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(innerX * 2 + 0.28, baseH, hz * 2 + 0.28),
      baseMat,
    );
    baseMesh.position.set(0, -baseH * 0.5 + 0.01, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    cupGroup.add(baseMesh);

    const glassHex = theme.glassColor;
    const makeWallGlass = () =>
      new THREE.MeshPhysicalMaterial({
        color: glassHex,
        metalness: 0,
        roughness: 0.11,
        transmission: 0.38,
        thickness: 0.26,
        ior: 1.48,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
        envMapIntensity: 0.72,
      });
    const wallH = wh + 0.45;
    const wallWz = hz * 2 + 0.06;
    const addWall = (x, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wallWz, wallH), makeWallGlass());
      m.position.set(x, wallH * 0.48, 0);
      m.rotation.y = ry;
      m.receiveShadow = true;
      cupGroup.add(m);
    };
    addWall(-innerX + 0.012, Math.PI / 2);
    addWall(innerX - 0.012, -Math.PI / 2);

    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(innerX * 2 - 0.04, wallH),
      makeWallGlass(),
    );
    frontWall.position.set(0, wallH * 0.48, frontZ);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    cupGroup.add(frontWall);

    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xff5566,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const lineGeo = new THREE.PlaneGeometry(innerX * 2 - 0.02, 0.1);
    dangerLine = new THREE.Mesh(lineGeo, lineMat);
    dangerLine.rotation.x = -Math.PI / 2;
    dangerLine.position.set(0, getGameOverY() + 0.01, ROW_Z + 0.02);
    cupGroup.add(dangerLine);
  }

  function clearStaticPhysics() {
    for (const b of staticBodies) world.removeBody(b);
    staticBodies.length = 0;
  }

  function addStaticBox(hx, hy, hz, x, y, z) {
    const shape = new CANNON.Box(new CANNON.Vec3(hx, hy, hz));
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(shape);
    body.position.set(x, y, z);
    world.addBody(body);
    staticBodies.push(body);
  }

  function buildStaticPhysics() {
    clearStaticPhysics();
    const hx = CUP.halfX;
    const hz = CUP.halfZ;
    const wt = CUP.wallT;
    const wh = CUP.wallH;
    /** Thicker floor slab — reduces tunneling at high speed / heavy masses */
    addStaticBox(hx + wt, 0.14, hz + wt, 0, -0.14, 0);
    addStaticBox(wt / 2, wh / 2, hz + wt, -hx - wt / 2, wh / 2, 0);
    addStaticBox(wt / 2, wh / 2, hz + wt, hx + wt / 2, wh / 2, 0);
    addStaticBox(hx, wh / 2, wt / 2, 0, wh / 2, -hz - wt / 2);
    addStaticBox(hx, wh / 2, wt / 2, 0, wh / 2, hz + wt / 2);
  }

  function innerHalfXForRadius(radius) {
    const innerFace = CUP.halfX - CUP.wallT;
    const pad = 0.019 + Math.min(0.024, radius * 0.011);
    return Math.max(0.05, innerFace - radius - pad);
  }

  function clampDropXZ(x, _z, radius) {
    const lim = innerHalfXForRadius(radius);
    return {
      x: Math.max(-lim, Math.min(lim, x)),
      z: ROW_Z,
    };
  }

  function computeCupHeightForViewport(viewportW, viewportH) {
    const minH = 8.8;
    const maxH = 14.8;
    const t = Math.min(1, viewportH / 620);
    const portrait = viewportH / Math.max(1, viewportW);
    const portraitTrim = portrait > 1.6 ? Math.min(2.4, (portrait - 1.6) * 2.4) : 0;
    return minH + (maxH - minH) * t - portraitTrim;
  }

  function fitCameraToCup() {
    const { width: vpW, height: vpH } = getViewportSize();
    const portrait = vpH >= vpW;
    const wh = CUP.wallH;
    const hx = CUP.halfX;
    const wt = CUP.wallT;
    const rimTop = Math.max(wh, getDropCenterY(), getGameOverY());
    const backW = hx * 2 + wt * 2 + 0.55;
    // Slight zoom-in so gameplay area feels tighter and less empty.
    const halfWRaw = backW / 2 + 0.04;
    const halfW = Math.max(hx + 0.26, halfWRaw * (portrait ? 0.935 : 0.95));

    const floorY = 0;
    const backH = wh + 0.75;
    const backCenterY = wh * 0.5 - 0.08;
    const panelTop = backCenterY + backH / 2;
    const panelBot = backCenterY - backH / 2;
    // Keep stronger vertical safe zones on phone ratios so top queue and bottom pile are fully visible.
    const padBelow = portrait ? 2.1 : 1.34;
    const padAbove = portrait ? 0.36 : 0.24;
    const contentLow = Math.min(panelBot - 0.06, floorY - padBelow);
    const contentHigh =
      Math.max(panelTop + 0.12, rimTop + 0.62, getDropCenterY() + 0.72 + padAbove) + 0.55;

    const vMargin = 0.22;
    const lowWorld = contentLow - vMargin;
    const highWorld = contentHigh + vMargin;
    // Small bias only; large lift can crop both queue/top and bottom pile on tall phones.
    const frameLift = 0;
    const midY = (lowWorld + highWorld) / 2 + frameLift;
    const halfSpanY = (highWorld - lowWorld) / 2;
    applyCupOrthoFrame({ halfW, halfSpanY, midY });

    applyMergeOrthoCameraPose(camera, midY);
    camera.near = 0.35;
    camera.far = 95;
  }

  function applyCupLayout() {
    const { width: vw, height: vh } = getViewportSize();
    const portrait = vh >= vw;
    // Slightly lower the whole cup so we keep cleaner headroom at the top.
    const cupTopLower = portrait ? 0.24 : 0.16;
    CUP.wallH = computeCupHeightForViewport(vw, vh) - cupTopLower;
    // Lower active drop lane too, so incoming ball starts a bit lower than before.
    setDropCenterY(CUP.wallH + (portrait ? -0.08 : -0.8));
    setGameOverY(CUP.wallH - GAME_OVER_BELOW_RIM);
    buildCupVisuals();
    buildStaticPhysics();
    fitCameraToCup();
    aimKeyLightAt(keyLight, CUP.wallH * 0.36 + 0.35, ROW_Z);
    syncCanvasToViewport();
    if (dangerLine) dangerLine.position.y = getGameOverY() + 0.012;
  }

  return {
    cupGroup,
    ensurePlayfieldMaps,
    innerHalfXForRadius,
    clampDropXZ,
    computeCupHeightForViewport,
    fitCameraToCup,
    applyCupLayout,
    setBackdropImage,
    get dangerLine() {
      return dangerLine;
    },
    get floorVis() {
      return floorVis;
    },
  };
}
