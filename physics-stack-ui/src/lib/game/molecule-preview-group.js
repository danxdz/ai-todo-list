import * as THREE from 'three';
import { ELEMENTS } from './config-atoms.js';
import { buildMoleculeLayout } from './molecule-layout.js';
import { getAtomBallStyle } from './atom-ball-style.js';
import { getEquippedAtomSkinDef } from './atom-skins.js';
import { applyAtomVisualOverrides, loadAtomVisualLabState, sanitizeAtomVisualLabState } from './atom-visual-lab.js';

function buildPreviewAtomMaps(visualStateOverride = null) {
  const visualState =
    visualStateOverride && typeof visualStateOverride === 'object'
      ? sanitizeAtomVisualLabState(visualStateOverride)
      : loadAtomVisualLabState();
  const elements = applyAtomVisualOverrides(ELEMENTS, visualState);
  const byAtomic = new Map(elements.map((s, index) => [s.atomicNumber, { spec: s, type: index }]));
  const bySymbol = new Map(
    elements.map((s, index) => [String(s.symbol).toUpperCase(), { spec: s, type: index }]),
  );
  return { elements, byAtomic, bySymbol };
}

function radiusForAtom(spec, detail) {
  const minR = ELEMENTS[0]?.radius ?? 0.34;
  const maxR = ELEMENTS[ELEMENTS.length - 1]?.radius ?? 2.6;
  const base = spec?.radius ?? minR;
  const t = Math.max(0, Math.min(1, (base - minR) / Math.max(0.001, maxR - minR)));
  if (detail === 'popup') return 0.17 + t * 0.19;
  return 0.14 + t * 0.13;
}

function expandInputsFromAtoms(atoms) {
  const { bySymbol } = buildPreviewAtomMaps();
  const out = [];
  for (const a of atoms ?? []) {
    let z = Number(a?.atomicNumber);
    if (!Number.isFinite(z) || z <= 0) {
      const symbol = String(a?.symbol ?? '').toUpperCase();
      z = bySymbol.get(symbol)?.spec?.atomicNumber ?? NaN;
    }
    if (!Number.isFinite(z) || z <= 0) continue;
    const n = Math.max(1, Math.min(10, Number(a?.count ?? 1)));
    for (let i = 0; i < n; i += 1) out.push(z);
  }
  return out;
}

/**
 * Shared molecule preview group for both album cards and win popup.
 * @param {{
 *  recipe?: { id?: string, inputs?: number[] },
 *  atoms?: Array<{ atomicNumber?: number, count?: number }>,
 *  detail?: 'card' | 'popup',
 *  locked?: boolean,
 *  visualState?: object | null — if set (e.g. live Physics Lab state), overrides localStorage for atom colors/layers
 * }} options
 */
export function createMoleculePreviewGroup(options = {}) {
  const { elements, byAtomic } = buildPreviewAtomMaps(options?.visualState ?? null);
  const recipe = options?.recipe ?? null;
  const detail = options?.detail === 'popup' ? 'popup' : 'card';
  const locked = !!options?.locked;
  const showBonds = options?.showBonds ?? true;
  const skinId = getEquippedAtomSkinDef?.()?.id ?? 'default';
  const fallbackInputs = expandInputsFromAtoms(options?.atoms);
  const layout = buildMoleculeLayout({
    id: recipe?.id ?? '',
    formula: recipe?.formula ?? '',
    inputs: Array.isArray(recipe?.inputs) && recipe.inputs.length ? recipe.inputs : fallbackInputs,
  });

  const group = new THREE.Group();
  const spinNodes = [];
  const materials = [];
  const geometries = [];
  // Shared compact spacing for Album + popup + in-world molecule preview.
  const nodeCount = Math.max(1, layout.nodes?.length ?? 1);
  const spacingBase = detail === 'popup' ? 0.6 : 0.58;
  const spacing = nodeCount > 8 ? spacingBase * 0.9 : spacingBase;

  if (showBonds) {
    const bondMat = new THREE.MeshBasicMaterial({
      color: 0xc7defa,
      transparent: true,
      opacity: locked ? 0.24 : detail === 'popup' ? 0.34 : 0.24,
      depthWrite: false,
    });
    materials.push(bondMat);

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vMid = new THREE.Vector3();
    const vDir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    for (const [ia, ib] of layout.bonds ?? []) {
      const a = layout.nodes?.[ia];
      const b = layout.nodes?.[ib];
      if (!a || !b) continue;
      vA.set(a.x * spacing, a.y * spacing, a.z * spacing);
      vB.set(b.x * spacing, b.y * spacing, b.z * spacing);
      vDir.copy(vB).sub(vA);
      const len = vDir.length();
      if (len < 0.001) continue;
      const g = new THREE.CylinderGeometry(
        detail === 'popup' ? 0.02 : 0.016,
        detail === 'popup' ? 0.02 : 0.016,
        len,
        8,
      );
      geometries.push(g);
      const bond = new THREE.Mesh(g, bondMat);
      vMid.copy(vA).add(vB).multiplyScalar(0.5);
      bond.position.copy(vMid);
      bond.quaternion.setFromUnitVectors(up, vDir.normalize());
      group.add(bond);
    }
  }

  for (const node of layout.nodes ?? []) {
    const entry = byAtomic.get(node.atomicNumber) ?? { spec: elements[0] ?? ELEMENTS[0], type: 0 };
    const spec = entry.spec;
    const atomType = entry.type;
    const style = getAtomBallStyle(atomType, spec, skinId);
    const r = radiusForAtom(spec, detail);
    const p = new THREE.Vector3(node.x * spacing, node.y * spacing, node.z * spacing);
    const color = style?.color ?? spec?.color ?? 0x88bbff;
    const phase = spec?.phase ?? 'solid';

    const coreMat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: locked ? Math.min(0.2, style.roughness ?? 0.2) : (style.roughness ?? 0.2),
      metalness: locked ? (style.metalness ?? 0.02) * 0.6 : (style.metalness ?? 0.02),
      transmission: locked
        ? Math.min(0.82, (style.transmission ?? 0.3) + 0.12)
        : (style.transmission ?? 0.3),
      thickness: style.thickness ?? 0.72,
      clearcoat: style.clearcoat ?? 0.44,
      clearcoatRoughness: style.clearcoatRoughness ?? 0.08,
      ior: style.ior ?? 1.52,
      emissive: style.emissive ?? color,
      emissiveIntensity: locked
        ? Math.min(0.08, (style.emissiveIntensity ?? 0.04) * 0.5)
        : Math.max(0.04, style.emissiveIntensity ?? 0.06),
      envMapIntensity: style.envMapIntensity ?? 1.05,
      transparent: locked,
      opacity: locked ? 0.62 : 1,
    });
    materials.push(coreMat);
    const coreGeo = new THREE.SphereGeometry(r, 22, 18);
    geometries.push(coreGeo);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.copy(p);
    group.add(core);

    const nucleusMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).offsetHSL(0, 0.06, -0.32),
      transparent: true,
      opacity: locked ? 0.3 : 0.55,
      depthWrite: false,
    });
    materials.push(nucleusMat);
    const nucleusGeo = new THREE.SphereGeometry(r * 0.22, 12, 10);
    geometries.push(nucleusGeo);
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    nucleus.position.copy(p);
    group.add(nucleus);

    const cloudMul = phase === 'gas' ? 1.42 : 1.24;
    const cloudMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).offsetHSL(0, 0.03, 0.2),
      transparent: true,
      opacity: locked ? 0.08 : phase === 'gas' ? 0.16 : 0.11,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    materials.push(cloudMat);
    const cloudGeo = new THREE.SphereGeometry(r * cloudMul, 18, 14);
    geometries.push(cloudGeo);
    const cloud = new THREE.Mesh(cloudGeo, cloudMat);
    cloud.position.copy(p);
    group.add(cloud);
    spinNodes.push({
      node: cloud,
      x: 0.01,
      y: phase === 'gas' ? 0.24 : 0.16,
      z: 0.02,
    });
  }

  return {
    group,
    spinNodes,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
