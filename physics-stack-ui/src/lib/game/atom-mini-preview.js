import * as THREE from 'three';
import { getModeSpec } from './mode-specs.js';
import { getActiveAtomElements } from './config-atoms.js';

function findAtomTypeByAtomicNumber(atomicNumber) {
  const z = Number(atomicNumber);
  const elements = getActiveAtomElements();
  const idx = elements.findIndex((spec) => Number(spec?.atomicNumber) === z);
  return idx >= 0 ? idx : 0;
}

export function mountAtomMiniPreview(host, initialPayload) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 24);
  camera.position.set(0, 0.08, 3.06);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(1.3, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  host.replaceChildren(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.08);
  key.position.set(2.2, 2.1, 3.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8ec4ff, 0.35);
  fill.position.set(-2.4, -0.6, 1.4);
  scene.add(fill);

  const modeSpec = getModeSpec('atoms');
  const root = new THREE.Group();
  scene.add(root);
  let current = null;
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

  function setPayload(payload) {
    const type = findAtomTypeByAtomicNumber(payload?.spec?.atomicNumber);
    const visual = modeSpec.createVisual(type, 0.88, {});
    if (current?.root) {
      root.remove(current.root);
      current.dispose?.();
    }
    current = visual;
    root.add(current.root);
  }

  function tick(ts) {
    if (!live) return;
    const t = ts * 0.001;
    if (current?.rotationTarget) current.rotationTarget.rotation.y = t * 0.35;
    if (current?.spinNodes?.length) {
      for (const spin of current.spinNodes) {
        if (!spin?.node) continue;
        spin.node.rotation.x += (spin.x ?? 0) * 0.016;
        spin.node.rotation.y += (spin.y ?? 0) * 0.016;
        spin.node.rotation.z += (spin.z ?? 0) * 0.016;
      }
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  resize();
  setPayload(initialPayload);
  raf = requestAnimationFrame(tick);

  return {
    update(nextPayload) {
      setPayload(nextPayload);
    },
    destroy() {
      live = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (current?.root) {
        root.remove(current.root);
        current.dispose?.();
      }
      renderer.dispose();
      host.replaceChildren();
    },
  };
}
