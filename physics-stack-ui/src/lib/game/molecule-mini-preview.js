import * as THREE from 'three';

/**
 * Tiny 3D molecule-like cluster preview for win popup.
 * @param {HTMLElement} host
 * @param {{ atoms?: Array<{symbol: string, color: number, count: number}> }} payload
 */
export function mountMoleculeMiniPreview(host, payload) {
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

  const geo = new THREE.SphereGeometry(0.55, 28, 22);
  const mats = [];
  const nodes = [];
  const entries = Array.isArray(payload?.atoms) ? payload.atoms : [];
  let index = 0;
  for (const atom of entries) {
    const color = atom?.color ?? 0x88bbff;
    const n = Math.max(1, Math.min(3, atom?.count ?? 1));
    for (let i = 0; i < n; i += 1) {
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.2,
        metalness: 0.06,
        transmission: 0.62,
        thickness: 0.9,
        clearcoat: 0.45,
        clearcoatRoughness: 0.1,
        emissive: color,
        emissiveIntensity: 0.1,
        envMapIntensity: 1.05,
      });
      mats.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      const angle = (index / Math.max(1, entries.length * 2)) * Math.PI * 2;
      const radius = 1.1 + (i % 2) * 0.42;
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.3) * 0.55, Math.sin(angle) * 0.5);
      const scale = 0.62 + Math.min(0.3, (atom?.count ?? 1) * 0.07);
      mesh.scale.setScalar(scale);
      cluster.add(mesh);
      nodes.push(mesh);
      index += 1;
    }
  }
  if (nodes.length === 0) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x88bbff,
      roughness: 0.22,
      metalness: 0.05,
      transmission: 0.64,
      thickness: 0.9,
      clearcoat: 0.4,
      emissive: 0x88bbff,
      emissiveIntensity: 0.1,
    });
    mats.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    cluster.add(mesh);
    nodes.push(mesh);
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
    cluster.rotation.y += 0.012;
    cluster.rotation.x = Math.sin(t * 0.8) * 0.1;
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      node.position.y += Math.sin(t * 1.2 + i * 0.7) * 0.0009;
    }
    renderer.render(scene, camera);
  };
  tick();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    host.replaceChildren();
    geo.dispose();
    for (const m of mats) m.dispose();
    renderer.dispose();
  };
}

