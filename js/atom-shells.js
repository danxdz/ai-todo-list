/**
 * Stylized Bohr-model shells for element spheres (education-friendly, not QM-accurate).
 * Electrons fill shells n=1,2,… with capacity 2n² until Z is placed.
 */

function shellCapacities(maxShells) {
  const caps = [];
  for (let n = 1; n <= maxShells; n++) caps.push(2 * n * n);
  return caps;
}

/**
 * @param {number} z - atomic number 1..118
 * @param {number} maxShells
 * @returns {number[]} electron count per shell index 0 = n=1
 */
export function electronShellsForZ(z, maxShells = 7) {
  const caps = shellCapacities(maxShells);
  const counts = caps.map(() => 0);
  let left = Math.max(0, Math.min(118, Math.floor(z)));
  for (let i = 0; i < caps.length && left > 0; i++) {
    const take = Math.min(left, caps[i]);
    counts[i] = take;
    left -= take;
  }
  return counts;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - center x
 * @param {number} cy - center y (nucleus)
 * @param {number} z
 * @param {{ r: number, g: number, b: number }} accentRgb - element color for electrons
 */
export function drawAtomShells2d(ctx, cx, cy, z, accentRgb) {
  const counts = electronShellsForZ(z, 6);
  const active = counts.filter((c) => c > 0).length;
  if (active === 0) return;

  const maxR = Math.min(cx, cy) * 0.88;
  const innerGap = maxR / (active + 1.15);

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(120,200,255,0.45)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(2.5, innerGap * 0.14), 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  let shellIdx = 0;
  for (let n = 0; n < counts.length; n++) {
    const ec = counts[n];
    if (ec <= 0) continue;
    shellIdx++;
    const orbitR = innerGap * (shellIdx + 0.35);

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = Math.max(1, orbitR * 0.035);
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const er = Math.max(2.2, Math.min(5.5, orbitR * 0.11));
    for (let e = 0; e < ec; e++) {
      const ang = (e / ec) * Math.PI * 2 - Math.PI / 2;
      const ex = cx + Math.cos(ang) * orbitR;
      const ey = cy + Math.sin(ang) * orbitR;
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, er * 1.8);
      g.addColorStop(0, `rgba(255,255,255,0.95)`);
      g.addColorStop(0.45, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.88)`);
      g.addColorStop(1, `rgba(${Math.floor(accentRgb.r * 0.35)},${Math.floor(accentRgb.g * 0.35)},${Math.floor(accentRgb.b * 0.35)},0.5)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
  ctx.restore();
}
