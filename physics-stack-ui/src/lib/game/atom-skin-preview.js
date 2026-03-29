import * as THREE from 'three';
import { ELEMENTS } from './config-atoms.js';
import { getAtomBallStyle } from './atom-ball-style.js';
import { drawElementFace2d } from './atoms-element-face.js';

function disposeMaterial(mat) {
  if (!mat) return;
  if (Array.isArray(mat)) {
    mat.forEach(disposeMaterial);
    return;
  }
  mat.map?.dispose?.();
  mat.roughnessMap?.dispose?.();
  mat.dispose?.();
}

function makeNoiseMap() {
  const size = 96;
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
  tex.repeat.set(2.4, 2.4);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function makeFaceMap(spec) {
  const size = 192;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawElementFace2d(ctx, size, spec);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addSkinOverlays(root, skinId, spec, radius) {
  const overlays = [];
  const add = (mesh) => {
    root.add(mesh);
    overlays.push(mesh);
  };

  if (spec.phase === 'gas' || skinId === 'neon_glow' || skinId === 'bio_luminescent') {
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.25, 20, 16),
      new THREE.MeshBasicMaterial({
        color: skinId === 'neon_glow' ? 0x6f8cff : skinId === 'bio_luminescent' ? 0x69ffc7 : spec.color,
        transparent: true,
        opacity: skinId === 'neon_glow' ? 0.2 : skinId === 'bio_luminescent' ? 0.18 : 0.09,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    add(halo);
  }

  if (skinId === 'plasma_core' || skinId === 'fire_plasma') {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.46, 16, 12),
      new THREE.MeshBasicMaterial({
        color: skinId === 'fire_plasma' ? 0xff5e33 : 0xffbb82,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      }),
    );
    add(core);
  }

  if (skinId === 'bohr_classic' || skinId === 'golden_ratio') {
    const ringColor = skinId === 'golden_ratio' ? 0xffcc66 : 0xa8c9ff;
    const mat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.16, radius * 0.02, 10, 72), mat);
    const ringB = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.16, radius * 0.02, 10, 72),
      mat.clone(),
    );
    ringA.rotation.x = 0.85;
    ringB.rotation.y = 0.72;
    add(ringA);
    add(ringB);
  }

  if (skinId === 'quantum_wave' || skinId === 'electron_cloud' || skinId === 'ice_lattice') {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.24, 18, 14),
      new THREE.MeshBasicMaterial({
        color: skinId === 'ice_lattice' ? 0x8fd9ff : 0xb8c8ff,
        transparent: true,
        opacity: skinId === 'electron_cloud' ? 0.16 : 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    add(cloud);
  }

  if (skinId === 'stellar_nucleosynthesis' || skinId === 'dark_matter') {
    const starColor = skinId === 'dark_matter' ? 0x9fa8ff : 0xb7dcff;
    for (let i = 0; i < 4; i += 1) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.06, 7, 5),
        new THREE.MeshBasicMaterial({
          color: starColor,
          transparent: true,
          opacity: 0.74,
          depthWrite: false,
        }),
      );
      const a = (Math.PI * 2 * i) / 4;
      star.position.set(Math.cos(a) * radius * 1.2, Math.sin(a) * radius * 0.5, radius * 0.2);
      add(star);
    }
  }

  return overlays;
}

/**
 * Lightweight live 3D preview used by skin cards in Shop/Skins Lab.
 * One renderer per card keeps integration simple and isolated.
 */
export function mountAtomSkinPreview(host, skinId) {
  const spec = ELEMENTS[7] ?? ELEMENTS[0];
  const style = getAtomBallStyle(7, spec, skinId);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
  camera.position.set(0, 0.08, 2.95);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(1.3, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  host.replaceChildren(renderer.domElement);

  const roughnessMap = makeNoiseMap();
  const faceMap = makeFaceMap(spec);
  const sphereMat = new THREE.MeshPhysicalMaterial({
    color: style.color,
    map: faceMap,
    roughnessMap,
    roughness: style.roughness,
    metalness: style.metalness,
    transmission: style.transmission,
    thickness: style.thickness,
    clearcoat: style.clearcoat,
    clearcoatRoughness: style.clearcoatRoughness,
    ior: style.ior,
    attenuationColor: style.color,
    attenuationDistance: 0.74,
    emissive: style.emissive,
    emissiveIntensity: style.emissiveIntensity ?? 0.03,
    envMapIntensity: style.envMapIntensity ?? 1,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.88, 28, 22), sphereMat);
  scene.add(sphere);
  const overlays = addSkinOverlays(scene, skinId, spec, 0.88);

  const amb = new THREE.AmbientLight(0xffffff, 0.9);
  const key = new THREE.DirectionalLight(0xffffff, 1.12);
  key.position.set(2.1, 1.9, 3.2);
  const fill = new THREE.DirectionalLight(0x7cb2ff, 0.4);
  fill.position.set(-2.4, -0.7, 1.8);
  scene.add(amb, key, fill);

  let raf = 0;
  let live = true;
  const ro = new ResizeObserver(() => resize());
  ro.observe(host);

  function resize() {
    const w = Math.max(1, Math.floor(host.clientWidth));
    const h = Math.max(1, Math.floor(host.clientHeight));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function tick(ts) {
    if (!live) return;
    const t = ts * 0.001;
    sphere.rotation.y = t * 0.42;
    sphere.rotation.x = Math.sin(t * 0.92) * 0.08;
    for (let i = 0; i < overlays.length; i += 1) {
      const ov = overlays[i];
      ov.rotation.y += 0.004 + i * 0.0007;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  resize();
  raf = requestAnimationFrame(tick);

  return () => {
    live = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) disposeMaterial(obj.material);
    });
    roughnessMap.dispose();
    faceMap.dispose();
    renderer.dispose();
    host.replaceChildren();
  };
}
