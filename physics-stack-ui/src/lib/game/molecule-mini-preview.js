import * as THREE from 'three';
import { createMoleculePreviewGroup } from './molecule-preview-group.js';

/**
 * Tiny 3D molecule-like cluster preview for win popup/lab.
 * Returns a controller with `update(payload)` and `destroy()`.
 */
export function mountMoleculeMiniPreview(host, initialPayload) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 30);
  camera.position.set(0, 0.2, 5.2);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  host.replaceChildren(renderer.domElement);

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(2.6, 3.2, 4.2);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xcfe9ff, 0.6));

  const cluster = new THREE.Group();
  scene.add(cluster);
  let current = null;

  function setPayload(payload) {
    const next = createMoleculePreviewGroup({
      recipe: payload?.recipe ?? null,
      atoms: Array.isArray(payload?.atoms) ? payload.atoms : [],
      detail: 'card',
      locked: false,
    });
    if (current?.group) {
      cluster.remove(current.group);
      current.dispose?.();
    }
    current = next;
    cluster.add(current.group);
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
    cluster.rotation.y += 0.008;
    cluster.rotation.x = Math.sin(t * 0.62) * 0.06;
    if (current?.spinNodes?.length) {
      for (const spin of current.spinNodes) {
        if (!spin?.node) continue;
        spin.node.rotation.x += (spin.x ?? 0) * 0.016;
        spin.node.rotation.y += (spin.y ?? 0) * 0.016;
        spin.node.rotation.z += (spin.z ?? 0) * 0.016;
      }
    }
    renderer.render(scene, camera);
  };
  setPayload(initialPayload);
  tick();

  return {
    update(nextPayload) {
      setPayload(nextPayload);
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (current?.group) {
        cluster.remove(current.group);
        current.dispose?.();
      }
      host.replaceChildren();
      renderer.dispose();
    },
  };
}

