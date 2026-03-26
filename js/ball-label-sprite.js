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

/** @param {{ symbol: string, name?: string, color: number }} spec */
export function createElementSymbolSprite(spec) {
  const tex = makeCanvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const sym = spec.symbol || '?';
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = s * 0.06;
    ctx.fillStyle = '#ffffff';
    const fs = sym.length > 2 ? s * 0.28 : s * 0.38;
    ctx.font = `800 ${fs}px system-ui, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sym, s / 2, s / 2 - s * 0.02);
    ctx.shadowBlur = 0;
    if (spec.name) {
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = `600 ${s * 0.065}px system-ui, sans-serif`;
      ctx.fillText(spec.name, s / 2, s * 0.78);
    }
  });
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    /** Orthographic + fixed screen size; avoids sprite scale fighting perspective heuristics */
    sizeAttenuation: false,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.setScalar(1);
  spr.renderOrder = 999;
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
  const w = radius * 1.55;
  sprite.scale.set(w, w, w);
}

export function setNumberLabelScale(sprite, radius) {
  /** sizeAttenuation false → scale is in world units; tie to sphere radius for readability */
  const w = radius * 2.05;
  sprite.scale.set(w, w, w);
}

/** Push digit slightly in front of sphere toward camera (+Z in local space; camera looks from +Z). */
export function placeDigitInFrontOfSphere(label, radius) {
  label.position.set(0, 0, radius * 1.06);
}
