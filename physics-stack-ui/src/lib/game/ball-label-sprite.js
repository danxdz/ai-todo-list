/**
 * Billboard sprites so symbols/digits always face the camera (kid-friendly, no UV warp).
 */
import * as THREE from 'three';

function makeCanvasTexture(drawFn) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  drawFn(ctx, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** @param {{ symbol: string, name?: string, color?: number, ghost?: boolean }} spec */
export function createElementSymbolSprite(spec) {
  const tex = makeCanvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const sym = String(spec.symbol || '?').trim();
    const len = sym.length;
    let fs = s * 0.36;
    if (len <= 1) fs = s * 0.42;
    else if (len === 2) fs = s * 0.3;
    else fs = s * 0.24;
    const cx = s / 2;
    const cy = s / 2 + s * 0.018;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = len === 2 ? `${Math.max(0.5, s * 0.006)}px` : '0px';
    ctx.font = `600 ${fs}px "Segoe UI", Roboto, "Helvetica Neue", system-ui, sans-serif`;
    ctx.strokeStyle = 'rgba(0,0,0,0.34)';
    ctx.lineWidth = Math.max(1, s * 0.007);
    ctx.lineJoin = 'round';
    ctx.strokeText(sym, cx, cy);
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = s * 0.016;
    ctx.shadowOffsetY = s * 0.004;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sym, cx, cy);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.letterSpacing = '0px';
    // Minimal atom labels: symbol only.
  });
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: spec.ghost ? 0.78 : 1,
    /** Occlude with other balls so labels don’t look like floating HUD stickers */
    depthTest: true,
    depthWrite: false,
    /** Orthographic + fixed screen size; avoids sprite scale fighting perspective heuristics */
    sizeAttenuation: false,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.setScalar(1);
  spr.renderOrder = 12;
  return spr;
}

/** @param {{ number: number, fact?: string, color: number }} spec */
export function createNumberDigitSprite(spec) {
  const tex = makeCanvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const numStr = String(spec.number);
    const numSize = numStr.length >= 2 ? s * 0.36 : s * 0.44;
    ctx.font = `900 ${numSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = s / 2;
    const cy = s / 2 + s * 0.02;
    ctx.strokeStyle = 'rgba(0,0,0,0.92)';
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.lineJoin = 'round';
    ctx.strokeText(numStr, cx, cy);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(numStr, cx, cy);
  });
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    sizeAttenuation: false,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.setScalar(1);
  spr.renderOrder = 999;
  return spr;
}

/**
 * Sprites already billboard in the vertex shader; do not copy camera.quaternion — that
 * breaks the sprite model matrix under orthographic cameras and can hide labels entirely.
 */
export function updateLabelBillboard(sprite, camera) {
  void sprite;
  void camera;
}

/** World scale for sprite so it reads ~right on sphere radius r */
export function setElementLabelScale(sprite, radius) {
  const w = Math.max(0.22, Math.min(0.72, radius * 0.38));
  sprite.scale.set(w, w, w);
}

export function setNumberLabelScale(sprite, radius) {
  /** sizeAttenuation false → scale is in world units; tie to sphere radius for readability */
  const w = radius * 2.05;
  sprite.scale.set(w, w, w);
}

/** Push digit slightly in front of sphere toward camera (+Z in local space; camera looks from +Z). */
export function placeDigitInFrontOfSphere(label, radius) {
  label.position.set(0, 0, radius * 1.018);
}

/**
 * Flat digit quad — parent under the sphere mesh so it **rotates with the ball**
 * (unlike THREE.Sprite, which always faces the camera).
 */
export function createNumberDigitPlane(spec) {
  const tex = makeCanvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const numStr = String(spec.number);
    const numSize = numStr.length >= 2 ? s * 0.36 : s * 0.44;
    ctx.font = `900 ${numSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = s / 2;
    const cy = s / 2 + s * 0.02;
    ctx.strokeStyle = 'rgba(0,0,0,0.92)';
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.lineJoin = 'round';
    ctx.strokeText(numStr, cx, cy);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(numStr, cx, cy);
  });
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 998;
  return mesh;
}

export function setNumberPlaneScale(mesh, radius) {
  const w = radius * 2.05;
  mesh.scale.set(w, w, w);
}

export function placeDigitPlaneInFrontOfSphere(mesh, radius) {
  mesh.position.set(0, 0, radius * 1.06);
}
