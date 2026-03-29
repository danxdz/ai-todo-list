/**
 * 2D element sphere face — matches atoms-merge elementFaceMap layout without Three.js.
 */

import { drawAtomShells2d } from './atom-shells.js';

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbFromHex(hex) {
  const h = typeof hex === 'number' ? hex : parseInt(String(hex).replace('#', ''), 16);
  return { r: (h >> 16) & 255, g: (h >> 8) & 255, b: h & 255 };
}

function rgbStr(rgb) {
  return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
}

function lighten(rgb, t) {
  return {
    r: clampByte(rgb.r + (255 - rgb.r) * t),
    g: clampByte(rgb.g + (255 - rgb.g) * t),
    b: clampByte(rgb.b + (255 - rgb.b) * t),
  };
}

function darken(rgb, t) {
  return {
    r: clampByte(rgb.r * (1 - t)),
    g: clampByte(rgb.g * (1 - t)),
    b: clampByte(rgb.b * (1 - t)),
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size - square edge in px
 * @param {{ color: number, symbol?: string }} spec
 */
export function drawElementFace2d(ctx, size, spec) {
  const s = size;
  const base = rgbFromHex(spec.color);
  const hi = lighten(base, 0.22);
  const mid = base;
  const lo = darken(base, 0.28);
  const g = ctx.createRadialGradient(s * 0.35, s * 0.32, s * 0.06, s * 0.5, s * 0.48, s * 0.58);
  g.addColorStop(0, rgbStr(hi));
  g.addColorStop(0.55, rgbStr(mid));
  g.addColorStop(1, rgbStr(lo));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const showBohrFace = spec?.visual?.bohrFace === true;
  if (showBohrFace) {
    drawAtomShells2d(ctx, s / 2, s / 2, spec.atomicNumber ?? 0, mid);
  }

  const phase = spec.phase ?? 'solid';
  const family = spec.family ?? 'nonmetal';

  if (phase === 'gas') {
    for (let i = 0; i < 7; i += 1) {
      const x = s * (0.22 + Math.random() * 0.56);
      const y = s * (0.22 + Math.random() * 0.56);
      const r = s * (0.05 + Math.random() * 0.12);
      const cloud = ctx.createRadialGradient(x, y, 0, x, y, r);
      cloud.addColorStop(0, 'rgba(255,255,255,0.1)');
      cloud.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cloud;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (phase === 'liquid') {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(s * 0.5, s * 0.32, s * 0.24, s * 0.06, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.ellipse(s * 0.5, s * 0.62, s * 0.2, s * 0.05, 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (family === 'metalloid') {
    for (let i = 0; i < 90; i += 1) {
      const x = s * (0.2 + Math.random() * 0.6);
      const y = s * (0.2 + Math.random() * 0.6);
      const a = 0.04 + Math.random() * 0.08;
      ctx.fillStyle = `rgba(255,255,235,${a})`;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
  }

  if (showBohrFace) {
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.38, 0, Math.PI * 2);
    ctx.stroke();
  }
  const sym = spec.symbol || '?';
  const fs = sym.length > 2 ? s * 0.2 : s * 0.24;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = s * 0.028;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = Math.max(1.1, s * 0.01);
  ctx.fillStyle = 'rgba(248,252,255,0.92)';
  ctx.font = `800 ${fs}px system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(sym, s / 2, s / 2);
  ctx.fillText(sym, s / 2, s / 2);
  ctx.shadowBlur = 0;
  // Keep atom face minimal: symbol only.
}
