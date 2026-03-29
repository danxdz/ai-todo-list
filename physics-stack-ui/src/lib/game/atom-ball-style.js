/**
 * More readable atom looks by rough real-world behavior:
 * gases = softer / glowing / airy, metals = denser / shinier, metalloids = glassy.
 * @param {number} type
 * @param {{ atomicNumber?: number, symbol?: string, phase?: string, family?: string, color?: number }} spec
 * @param {string} [skinId='default']
 */
export function getAtomBallStyle(type, spec, skinId = 'default') {
  const z = spec.atomicNumber ?? type + 1;
  const phase = spec.phase ?? 'solid';
  const family = spec.family ?? 'nonmetal';
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const base = {
    color: spec.color ?? 0x8899aa,
    metalness: 0.08,
    roughness: 0.3,
    transmission: 0.28,
    thickness: 0.58,
    clearcoat: 0.35,
    clearcoatRoughness: 0.16,
    emissive: 0x000000,
    emissiveIntensity: 0.028,
    ior: 1.52,
    envMapIntensity: 1.02,
  };

  let style;

  if (phase === 'gas') {
    style = {
      ...base,
      roughness: family === 'noble-gas' ? 0.06 : 0.1,
      metalness: 0,
      transmission: family === 'noble-gas' ? 0.92 : 0.82,
      thickness: family === 'noble-gas' ? 1.26 : 1.04,
      clearcoat: 0.16,
      emissive: spec.color ?? 0x9ecbff,
      emissiveIntensity: family === 'noble-gas' ? 0.2 : 0.14,
      envMapIntensity: 0.9,
    };
  } else if (phase === 'liquid') {
    style = {
      ...base,
      roughness: 0.045,
      metalness: 0.02,
      transmission: 0.9,
      thickness: 1.16,
      clearcoat: 0.9,
      clearcoatRoughness: 0.04,
      emissive: spec.color ?? 0x88c8ff,
      emissiveIntensity: 0.12,
      envMapIntensity: 1.24,
    };
  } else if (
    family === 'alkali-metal' ||
    family === 'alkaline-earth' ||
    family === 'post-transition-metal'
  ) {
    style = {
      ...base,
      metalness: 0.74,
      roughness: 0.17,
      transmission: 0.04,
      thickness: 0.22,
      clearcoat: 0.6,
      emissive: 0x17110a,
      emissiveIntensity: 0.03,
      envMapIntensity: 1.15,
    };
  } else if (family === 'metalloid') {
    style = {
      ...base,
      metalness: 0.18,
      roughness: 0.24,
      transmission: 0.32,
      thickness: 0.82,
      clearcoat: 0.58,
      emissive: spec.color ?? 0x000000,
      emissiveIntensity: 0.07,
      envMapIntensity: 1.12,
    };
  } else if (z === 6) {
    style = {
      ...base,
      color: 0x3d3d3d,
      roughness: 0.44,
      transmission: 0.04,
      thickness: 0.24,
      metalness: 0.16,
      clearcoat: 0.42,
      emissive: 0x090909,
      emissiveIntensity: 0.02,
    };
  } else if (z === 8) {
    style = {
      ...base,
      color: spec.color ?? 0xff3b30,
      roughness: 0.1,
      transmission: 0.78,
      thickness: 1.08,
      metalness: 0,
      emissive: 0xffd0d0,
      emissiveIntensity: 0.18,
    };
  } else {
    style = {
      ...base,
      transmission: 0.24,
      metalness: 0.04,
      roughness: 0.24,
    };
  }

  const tint = (hex, mul = 1) => {
    const r = Math.min(255, Math.max(0, Math.round(((hex >> 16) & 255) * mul)));
    const g = Math.min(255, Math.max(0, Math.round(((hex >> 8) & 255) * mul)));
    const b = Math.min(255, Math.max(0, Math.round((hex & 255) * mul)));
    return (r << 16) | (g << 8) | b;
  };
  const hueShift = (hex, shift = 0) => {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    const t = shift % 3;
    if (t < 1) return (g << 16) | (b << 8) | r;
    if (t < 2) return (b << 16) | (r << 8) | g;
    return (r << 16) | (g << 8) | b;
  };

  switch (skinId) {
    case 'neon_glow':
      style.emissive = hueShift(style.color, type % 2);
      style.emissiveIntensity = Math.max(0.24, (style.emissiveIntensity ?? 0.05) + 0.12);
      style.clearcoat = Math.max(0.6, style.clearcoat ?? 0.35);
      break;
    case 'plasma_core':
      style.emissive = tint(style.color, 1.25);
      style.emissiveIntensity = Math.max(0.3, (style.emissiveIntensity ?? 0.05) + 0.2);
      style.transmission = Math.max(0.72, style.transmission ?? 0.2);
      break;
    case 'crystal_lattice':
      style.roughness = Math.min(0.13, style.roughness ?? 0.3);
      style.transmission = Math.max(0.9, style.transmission ?? 0.2);
      style.thickness = Math.max(1.22, style.thickness ?? 0.5);
      break;
    case 'metallic_sheen':
      style.metalness = Math.max(0.82, style.metalness ?? 0.2);
      style.roughness = Math.min(0.18, style.roughness ?? 0.3);
      style.transmission = Math.min(0.08, style.transmission ?? 0.2);
      style.emissiveIntensity = Math.min(0.08, style.emissiveIntensity ?? 0.05);
      break;
    case 'stellar_nucleosynthesis':
      style.emissive = 0x88c9ff;
      style.emissiveIntensity = Math.max(0.34, style.emissiveIntensity ?? 0.06);
      style.transmission = Math.max(0.8, style.transmission ?? 0.2);
      break;
    case 'quantum_wave':
      style.color = hueShift(style.color, 1);
      style.emissive = tint(style.color, 1.15);
      style.emissiveIntensity = Math.max(0.26, style.emissiveIntensity ?? 0.05);
      style.transmission = Math.max(0.84, style.transmission ?? 0.2);
      break;
    case 'fire_plasma':
      style.color = 0xff7c57;
      style.emissive = 0xff6a3a;
      style.emissiveIntensity = 0.34;
      style.roughness = Math.min(0.16, style.roughness ?? 0.3);
      break;
    case 'ice_lattice':
      style.color = 0x8ad5ff;
      style.emissive = 0xb8f2ff;
      style.emissiveIntensity = 0.24;
      style.transmission = Math.max(0.88, style.transmission ?? 0.2);
      break;
    case 'bio_luminescent':
      style.color = 0x7effc8;
      style.emissive = 0x42ffaf;
      style.emissiveIntensity = 0.3;
      break;
    case 'golden_ratio':
      style.color = 0xffd26e;
      style.metalness = Math.max(0.6, style.metalness ?? 0.2);
      style.roughness = Math.min(0.2, style.roughness ?? 0.3);
      style.emissive = 0xffdc88;
      style.emissiveIntensity = Math.max(0.14, style.emissiveIntensity ?? 0.05);
      break;
    case 'bohr_classic':
      style.roughness = 0.2;
      style.clearcoat = 0.48;
      style.emissiveIntensity = Math.max(0.14, style.emissiveIntensity ?? 0.05);
      break;
    case 'electron_cloud':
      style.roughness = Math.min(0.18, style.roughness ?? 0.3);
      style.transmission = Math.max(0.9, style.transmission ?? 0.2);
      style.emissive = 0xaed6ff;
      style.emissiveIntensity = 0.2;
      break;
    case 'rainbow_fusion':
      style.color = hueShift(style.color, type % 3);
      style.emissive = tint(style.color, 1.12);
      style.emissiveIntensity = Math.max(0.2, style.emissiveIntensity ?? 0.05);
      break;
    case 'dark_matter':
      style.color = 0x19142c;
      style.emissive = 0x4534a8;
      style.emissiveIntensity = 0.2;
      style.roughness = 0.38;
      style.metalness = 0.34;
      style.transmission = 0.14;
      break;
    default:
      break;
  }

  // Subtle deterministic per-element signature so spheres are unique without chaos.
  const seedA = ((z * 73) % 17) / 17;
  const seedB = ((z * 97) % 23) / 23;
  const seedC = ((z * 41) % 19) / 19;
  style.roughness = clamp((style.roughness ?? 0.24) + (seedA - 0.5) * 0.07, 0.04, 0.52);
  style.metalness = clamp((style.metalness ?? 0.08) + (seedB - 0.5) * 0.08, 0, 0.92);
  style.transmission = clamp((style.transmission ?? 0.24) + (seedC - 0.5) * 0.12, 0.02, 0.96);
  style.clearcoat = clamp((style.clearcoat ?? 0.35) + (seedB - 0.5) * 0.16, 0.08, 0.95);
  style.emissiveIntensity = clamp(
    (style.emissiveIntensity ?? 0.03) + seedA * 0.035,
    0.02,
    phase === 'gas' ? 0.34 : 0.24,
  );

  const visualOverride = spec?.visual && typeof spec.visual === 'object' ? spec.visual : null;
  if (visualOverride) {
    const overrideNumber = (key, min, max) => {
      const n = Number(visualOverride[key]);
      if (!Number.isFinite(n)) return;
      style[key] = clamp(n, min, max);
    };
    overrideNumber('roughness', 0, 1);
    overrideNumber('metalness', 0, 1);
    overrideNumber('transmission', 0, 1);
    overrideNumber('clearcoat', 0, 1);
    overrideNumber('clearcoatRoughness', 0, 1);
    overrideNumber('ior', 1, 2.5);
    overrideNumber('envMapIntensity', 0, 3);
    overrideNumber('emissiveIntensity', 0, 1);
  }

  return style;
}
