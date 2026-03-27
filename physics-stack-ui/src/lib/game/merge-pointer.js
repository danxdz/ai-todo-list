import * as THREE from 'three';

const _plane = new THREE.Plane();
const _hit = new THREE.Vector3();
const _n = new THREE.Vector3(0, 1, 0);

/**
 * World X on horizontal plane y = planeY (drop row), from screen pixel — works for ortho and perspective.
 */
export function worldXFromPointer(clientX, clientY, camera, canvasEl, planeY) {
  const rect = canvasEl.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  const ndcX = ((clientX - rect.left) / w) * 2 - 1;
  const ndcY = -((clientY - rect.top) / h) * 2 + 1;

  if (camera.isOrthographicCamera) {
    const worldX = camera.left + ((ndcX + 1) / 2) * (camera.right - camera.left);
    return worldX;
  }

  const raycaster = new THREE.Raycaster();
  // Gameplay aiming is horizontal-only; keep mapping stable across full screen height.
  const AIM_NDC_Y = 0.84;
  raycaster.setFromCamera(new THREE.Vector2(ndcX, AIM_NDC_Y), camera);
  _plane.set(_n, -planeY);
  if (raycaster.ray.intersectPlane(_plane, _hit)) {
    return _hit.x;
  }
  // Fallback for unusual camera states.
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  if (raycaster.ray.intersectPlane(_plane, _hit)) {
    return _hit.x;
  }
  return 0;
}
