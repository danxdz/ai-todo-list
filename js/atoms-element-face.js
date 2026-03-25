/**
 * 2D element sphere face — matches atoms-merge elementFaceMap layout without Three.js.
 */

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
 * @param {{ color: number, symbol?: string, name?: string }} spec
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
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  const sym = spec.symbol || '?';
  const fs = sym.length > 2 ? s * 0.28 : s * 0.42;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = s * 0.055;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `800 ${fs}px system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sym, s / 2, s / 2 - s * 0.024);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  ctx.font = `600 ${Math.max(8, s * 0.062)}px system-ui, sans-serif`;
  const nm = spec.name || '';
  if (nm) ctx.fillText(nm, s / 2, s * 0.78);
}
