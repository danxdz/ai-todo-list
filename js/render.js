import * as THREE from 'three';

export function attachSceneBackground(scene) {
  const ch = 640;
  const cw = 8;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, ch);
  g.addColorStop(0, '#3d5280');
  g.addColorStop(0.15, '#304268');
  g.addColorStop(0.35, '#283552');
  g.addColorStop(0.55, '#1f2a44');
  g.addColorStop(0.75, '#162038');
  g.addColorStop(1, '#0e1828');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);
  const rg = ctx.createRadialGradient(cw * 0.5, ch * 0.92, ch * 0.08, cw * 0.5, ch * 0.55, ch * 0.72);
  rg.addColorStop(0, 'rgba(70, 100, 160, 0.22)');
  rg.addColorStop(0.5, 'rgba(30, 45, 80, 0.08)');
  rg.addColorStop(1, 'rgba(8, 12, 22, 0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * cw;
    const y = Math.random() * ch;
    const rr = 0.6 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(230, 240, 255, ${0.08 + Math.random() * 0.12})`;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  scene.background = tex;
}

export function createRendererAndCamera(container = document.body) {
  /** Perspective default — real depth cues; frustum updated in viewport-ortho */
  const camera = new THREE.PerspectiveCamera(42, 1, 0.2, 120);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x1a2438, 1);
  container.appendChild(renderer.domElement);
  const canvasEl = renderer.domElement;
  canvasEl.style.touchAction = 'none';
  canvasEl.style.zIndex = '1';
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
  /** Softer fill so matte marbles don’t get a harsh “pin” spec from point lights */
  scene.add(new THREE.AmbientLight(0xd8e2f2, 0.38));

  /** Mostly top-down → shorter shadows on back wall, softer penumbra */
  const sun = new THREE.DirectionalLight(0xfff8f5, 0.62);
  sun.position.set(0.35, 36, 5.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
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
