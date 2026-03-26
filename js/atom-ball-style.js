/**
 * Kid-friendly “periodic table” ball looks — stylized, not literal element samples.
 * @param {number} type — index in FRUITS
 * @param {{ atomicNumber: number, symbol: string }} spec
 */
export function getAtomBallStyle(type, spec) {
  const z = spec.atomicNumber ?? type + 1;
  /** Defaults */
  const base = {
    color: 0x8899aa,
    metalness: 0.08,
    roughness: 0.38,
    transmission: 0.22,
    thickness: 0.55,
    clearcoat: 0.35,
    clearcoatRoughness: 0.18,
    emissive: 0x000000,
    emissiveIntensity: 0.04,
    ior: 1.52,
    envMapIntensity: 1.02,
  };

  const byZ = {
    1: {
      color: 0x9ecbff,
      transmission: 0.62,
      thickness: 0.85,
      roughness: 0.14,
      emissive: 0x224466,
      emissiveIntensity: 0.06,
    },
    2: {
      color: 0xfff8c4,
      transmission: 0.42,
      thickness: 0.65,
      roughness: 0.18,
      emissive: 0x443a10,
      emissiveIntensity: 0.05,
    },
    6: {
      color: 0x0a0a0a,
      transmission: 0.04,
      thickness: 0.28,
      roughness: 0.42,
      metalness: 0.18,
      clearcoat: 0.55,
      emissive: 0x111111,
      emissiveIntensity: 0.02,
    },
    8: {
      color: 0xf0f0f8,
      transmission: 0.78,
      thickness: 1.1,
      roughness: 0.12,
      emissive: 0xccddee,
      emissiveIntensity: 0.22,
      metalness: 0,
    },
    11: {
      color: 0xffc928,
      metalness: 0.72,
      roughness: 0.22,
      transmission: 0.06,
      clearcoat: 0.65,
      emissive: 0x332200,
      emissiveIntensity: 0.04,
    },
    79: {
      color: 0xffd54f,
      metalness: 0.85,
      roughness: 0.18,
      transmission: 0.05,
      clearcoat: 0.75,
      emissive: 0x221a00,
      emissiveIntensity: 0.05,
    },
  };

  if (byZ[z]) return { ...base, ...byZ[z] };
  if (z <= 2) return { ...base, ...byZ[1] };
  if (z <= 4) return { ...base, ...byZ[2], color: spec.color };
  if (z <= 10) return { ...base, color: spec.color, transmission: 0.28, roughness: 0.26 };
  return { ...base, color: spec.color, transmission: 0.18, metalness: 0.12, roughness: 0.32 };
}
