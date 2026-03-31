import * as THREE from 'three';

const _v = new THREE.Vector3();

/**
 * Pin the menu cluster to the screen X of the cup inner-right (matches 3D play area).
 * @param {object} opts
 * @param {import('three').OrthographicCamera} opts.camera
 * @param {HTMLCanvasElement} opts.canvasEl
 * @param {{ halfX: number, wallH: number, wallT: number }} opts.CUP
 * @param {number} opts.ROW_Z
 * @param {HTMLElement | null} opts.menuWrap
 */
export function syncHudMenuToPlayfieldRight(opts) {
  const { camera, canvasEl, CUP, ROW_Z, menuWrap } = opts;
  if (!menuWrap || !camera || !canvasEl) return;

  const innerFace = CUP.halfX - CUP.wallT;
  const midY = CUP.wallH * 0.48;
  _v.set(innerFace, midY, ROW_Z);
  _v.project(camera);

  const rect = canvasEl.getBoundingClientRect();
  const x = rect.left + (_v.x * 0.5 + 0.5) * rect.width;
  const vw = window.innerWidth;
  const inset = 8;
  const rightPx = Math.max(inset, Math.min(vw - inset, vw - x));
  menuWrap.style.left = 'auto';
  menuWrap.style.right = `${rightPx}px`;
}

/**
 * Size a HUD row to match the cup inner-left/right X (so left + right clusters
 * align to the 3D playfield edges instead of the full window).
 *
 * Works for both Ortho and Perspective since we project world points.
 *
 * @param {object} opts
 * @param {import('three').Camera} opts.camera
 * @param {HTMLCanvasElement} opts.canvasEl
 * @param {{ halfX: number, wallH: number, wallT: number }} opts.CUP
 * @param {number} opts.ROW_Z
 * @param {HTMLElement | null} opts.rowEl
 */
export function syncHudRowToPlayfieldX(opts) {
  const { camera, canvasEl, CUP, ROW_Z, rowEl } = opts;
  if (!rowEl || !camera || !canvasEl) return;

  const innerFace = CUP.halfX - CUP.wallT;
  const midY = CUP.wallH * 0.48;
  const rect = canvasEl.getBoundingClientRect();
  const inset = 8;

  _v.set(-innerFace, midY, ROW_Z);
  _v.project(camera);
  const leftX = rect.left + (_v.x * 0.5 + 0.5) * rect.width;

  _v.set(innerFace, midY, ROW_Z);
  _v.project(camera);
  const rightX = rect.left + (_v.x * 0.5 + 0.5) * rect.width;

  const minX = Math.max(inset, Math.min(leftX, rightX));
  const maxX = Math.min(window.innerWidth - inset, Math.max(leftX, rightX));
  const w = Math.max(220, Math.floor(maxX - minX));

  rowEl.style.width = `${w}px`;
}
