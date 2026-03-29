import * as THREE from 'three';
import { ELEMENTS } from './config-atoms.js';
import { getModeSpec } from './mode-specs.js';
import { createMoleculePreviewGroup } from './molecule-preview-group.js';

const atomsMode = getModeSpec('atoms');
const typeByAtomicNumber = new Map(ELEMENTS.map((spec, index) => [spec.atomicNumber, index]));

/**
 * Shared atom preview renderer for Album cards.
 * Uses the same `mode-specs` visual factory as live gameplay.
 *
 * @param {HTMLElement} host
 * @param {{ typeIndex?: number, recipe?: { inputs?: number[] }, locked?: boolean }} options
 */
export function mountAtomAlbumPreview(host, options = {}) {
  const { typeIndex = 0, recipe = null, locked = false } = options;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 24);
  camera.position.set(0, 0.05, 4.1);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(1.35, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  host.replaceChildren(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.84));
  const key = new THREE.DirectionalLight(0xffffff, 1.04);
  key.position.set(2.4, 1.8, 3.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88ccff, 0.34);
  rim.position.set(-2.8, -0.5, 1.9);
  scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);
  const visuals = [];
  let moleculePreview = null;

  function addVisual(type, radiusScale, position) {
    const baseR = ELEMENTS[type]?.radius ?? 0.8;
    const radius = Math.max(0.18, baseR * radiusScale);
    const visual = atomsMode.createVisual(type, radius, { ghost: locked });
    visual.root.position.copy(position);
    group.add(visual.root);
    visuals.push(visual);
  }

  if (recipe?.inputs?.length) {
    moleculePreview = createMoleculePreviewGroup({ recipe, detail: 'card', locked });
    group.add(moleculePreview.group);
  } else {
    addVisual(typeIndex, 0.3, new THREE.Vector3(0, 0, 0));
  }

  function resize() {
    const w = Math.max(1, Math.floor(host.clientWidth));
    const h = Math.max(1, Math.floor(host.clientHeight));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let raf = 0;
  let t = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    t += 0.016;
    group.rotation.y += 0.012;
    group.rotation.x = Math.sin(t * 0.75) * 0.08;
    for (let i = 0; i < visuals.length; i += 1) {
      visuals[i].root.rotation.y += 0.003 + i * 0.0009;
    }
    if (moleculePreview?.spinNodes?.length) {
      for (const spin of moleculePreview.spinNodes) {
        if (!spin?.node) continue;
        spin.node.rotation.x += (spin.x ?? 0) * 0.016;
        spin.node.rotation.y += (spin.y ?? 0) * 0.016;
        spin.node.rotation.z += (spin.z ?? 0) * 0.016;
      }
    }
    renderer.render(scene, camera);
  };
  tick();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    for (const visual of visuals) {
      group.remove(visual.root);
      visual.dispose?.();
    }
    if (moleculePreview) {
      group.remove(moleculePreview.group);
      moleculePreview.dispose?.();
      moleculePreview = null;
    }
    renderer.dispose();
    host.replaceChildren();
  };
}
