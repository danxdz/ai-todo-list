import * as THREE from 'three';

/**
 * Soft studio-style IBL from a generated equirectangular map (no external assets).
 * Assigns scene.environment for MeshPhysical / Standard reflections.
 */
export function applyStudioEnvironment(renderer, scene) {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  const gV = ctx.createLinearGradient(0, 0, 0, h);
  gV.addColorStop(0, '#f5f7ff');
  gV.addColorStop(0.22, '#dce4f5');
  gV.addColorStop(0.45, '#a8b8d8');
  gV.addColorStop(0.68, '#5a6a8a');
  gV.addColorStop(1, '#2a3348');
  ctx.fillStyle = gV;
  ctx.fillRect(0, 0, w, h);

  const gH = ctx.createLinearGradient(0, 0, w, 0);
  gH.addColorStop(0, 'rgba(255, 200, 170, 0.14)');
  gH.addColorStop(0.35, 'rgba(255, 255, 255, 0)');
  gH.addColorStop(0.65, 'rgba(180, 210, 255, 0.12)');
  gH.addColorStop(1, 'rgba(120, 140, 190, 0.18)');
  ctx.fillStyle = gH;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.35})`;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h * 0.55, 0.5 + Math.random() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rt = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();

  scene.environment = rt.texture;
  scene.environment.userData.pmremTarget = rt;
  return rt;
}
