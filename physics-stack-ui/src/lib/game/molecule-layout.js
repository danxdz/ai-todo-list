/**
 * Lightweight molecule layout templates used by UI previews.
 * Positions are stylized but chemically inspired (VSEPR-like for small molecules).
 */

const DEG = Math.PI / 180;

function atom(atomicNumber, x, y, z = 0) {
  return { atomicNumber, x, y, z };
}

function centerAndScale(nodes, targetRadius = 1.35) {
  if (!nodes.length) return nodes;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (const n of nodes) {
    cx += n.x;
    cy += n.y;
    cz += n.z;
  }
  cx /= nodes.length;
  cy /= nodes.length;
  cz /= nodes.length;

  let maxR = 0.0001;
  for (const n of nodes) {
    const dx = n.x - cx;
    const dy = n.y - cy;
    const dz = n.z - cz;
    maxR = Math.max(maxR, Math.hypot(dx, dy, dz));
  }
  const k = targetRadius / maxR;
  return nodes.map((n) => ({
    atomicNumber: n.atomicNumber,
    x: (n.x - cx) * k,
    y: (n.y - cy) * k,
    z: (n.z - cz) * k,
  }));
}

function fallbackLayout(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return { nodes: [atom(1, 0, 0, 0)], bonds: [] };
  }
  const nodes = [];
  const bonds = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const total = Math.min(28, inputs.length);
  for (let i = 0; i < total; i += 1) {
    const y = 1 - (i / Math.max(1, total - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    nodes.push(atom(inputs[i], x * 1.05, y * 0.95, z * 0.9));
    if (i > 0) bonds.push([0, i]);
  }
  return { nodes: centerAndScale(nodes), bonds };
}

/**
 * @param {{ id?: string, formula?: string, inputs?: number[] }} recipe
 * @returns {{ nodes: Array<{ atomicNumber:number, x:number, y:number, z:number }>, bonds: number[][] }}
 */
export function buildMoleculeLayout(recipe) {
  const id = String(recipe?.id ?? '').toLowerCase();
  const inputs = Array.isArray(recipe?.inputs) ? recipe.inputs : [];

  if (id === 'water') {
    const a = 52.25 * DEG; // 104.5 / 2
    const d = 1.05;
    const nodes = [
      atom(8, 0, 0, 0),
      atom(1, -Math.sin(a) * d, Math.cos(a) * d, 0.18),
      atom(1, Math.sin(a) * d, Math.cos(a) * d, -0.18),
    ];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1], [0, 2]] };
  }

  if (id === 'carbon_dioxide') {
    const nodes = [atom(8, -1.2, 0, 0), atom(6, 0, 0, 0), atom(8, 1.2, 0, 0)];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1], [1, 2]] };
  }

  if (id === 'carbon_monoxide') {
    const nodes = [atom(6, -0.75, 0, 0), atom(8, 0.75, 0, 0)];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1]] };
  }

  if (id === 'methane') {
    const d = 0.96;
    const nodes = [
      atom(6, 0, 0, 0),
      atom(1, d, d, d),
      atom(1, -d, -d, d),
      atom(1, -d, d, -d),
      atom(1, d, -d, -d),
    ];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] };
  }

  if (id === 'ammonia') {
    const r = 1.0;
    const nodes = [atom(7, 0, 0.35, 0)];
    const bonds = [];
    for (let i = 0; i < 3; i += 1) {
      const a = (Math.PI * 2 * i) / 3;
      nodes.push(atom(1, Math.cos(a) * r, -0.42, Math.sin(a) * r));
      bonds.push([0, i + 1]);
    }
    return { nodes: centerAndScale(nodes), bonds };
  }

  if (id === 'hydrogen_peroxide') {
    const nodes = [
      atom(1, -1.55, 0.28, 0.32),
      atom(8, -0.62, 0, 0),
      atom(8, 0.62, 0, 0),
      atom(1, 1.55, -0.28, -0.32),
    ];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1], [1, 2], [2, 3]] };
  }

  if (id === 'hydrochloric_acid') {
    const nodes = [atom(1, -0.8, 0, 0), atom(17, 0.8, 0, 0)];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1]] };
  }

  if (id === 'sodium_chloride') {
    const nodes = [atom(11, -0.88, 0, 0), atom(17, 0.88, 0, 0)];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1]] };
  }

  if (id === 'nitric_oxide') {
    const nodes = [atom(7, -0.72, 0, 0), atom(8, 0.72, 0, 0)];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1]] };
  }

  if (id === 'nitrogen_dioxide') {
    const a = 67 * DEG; // ~134 deg bent
    const d = 1.1;
    const nodes = [
      atom(7, 0, 0, 0),
      atom(8, -Math.sin(a) * d, Math.cos(a) * d, 0),
      atom(8, Math.sin(a) * d, Math.cos(a) * d, 0),
    ];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1], [0, 2]] };
  }

  if (id === 'sulfur_dioxide') {
    const a = 59 * DEG; // ~118 deg bent
    const d = 1.15;
    const nodes = [
      atom(16, 0, 0, 0),
      atom(8, -Math.sin(a) * d, Math.cos(a) * d, 0),
      atom(8, Math.sin(a) * d, Math.cos(a) * d, 0),
    ];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1], [0, 2]] };
  }

  if (id === 'sulfur_trioxide') {
    const r = 1.2;
    const nodes = [atom(16, 0, 0, 0)];
    const bonds = [];
    for (let i = 0; i < 3; i += 1) {
      const a = (Math.PI * 2 * i) / 3;
      nodes.push(atom(8, Math.cos(a) * r, Math.sin(a) * r, 0));
      bonds.push([0, i + 1]);
    }
    return { nodes: centerAndScale(nodes), bonds };
  }

  if (id === 'sodium_hydroxide') {
    const nodes = [atom(11, -1.22, 0.05, 0), atom(8, 0, 0, 0), atom(1, 1.04, 0.42, 0)];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1], [1, 2]] };
  }

  if (id === 'silicon_dioxide') {
    const nodes = [atom(8, -1.2, 0, 0), atom(14, 0, 0, 0), atom(8, 1.2, 0, 0)];
    return { nodes: centerAndScale(nodes), bonds: [[0, 1], [1, 2]] };
  }

  if (id === 'calcium_carbonate') {
    const r = 1.0;
    const nodes = [atom(20, 0, -0.12, -0.7), atom(6, 0, 0.26, 0)];
    const bonds = [[0, 1]];
    for (let i = 0; i < 3; i += 1) {
      const a = (Math.PI * 2 * i) / 3;
      nodes.push(atom(8, Math.cos(a) * r, -0.32 + Math.sin(a) * 0.34, Math.sin(a) * 0.18));
      bonds.push([1, i + 2]);
    }
    return { nodes: centerAndScale(nodes), bonds };
  }

  if (id === 'ethanol') {
    const nodes = [
      atom(6, -1.2, 0, 0),
      atom(6, -0.2, 0.2, 0),
      atom(8, 0.88, 0.1, 0),
      atom(1, -1.85, 0.65, 0.25),
      atom(1, -1.85, -0.55, -0.22),
      atom(1, -1.0, -0.82, 0.28),
      atom(1, -0.22, 0.95, -0.24),
      atom(1, 0.22, -0.56, 0.32),
      atom(1, 1.52, 0.62, -0.18),
    ];
    const bonds = [[0, 1], [1, 2]];
    for (let i = 3; i < nodes.length; i += 1) {
      bonds.push([i < 6 ? 0 : i < 8 ? 1 : 2, i]);
    }
    return { nodes: centerAndScale(nodes), bonds };
  }

  if (id === 'glucose') {
    const nodes = [];
    const bonds = [];
    const ringR = 1.08;
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI * 2 * i) / 6;
      nodes.push(atom(6, Math.cos(a) * ringR, Math.sin(a) * ringR, (i % 2 === 0 ? 0.12 : -0.12)));
      bonds.push([i, (i + 1) % 6]);
    }
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI * 2 * i) / 6;
      const ox = Math.cos(a) * 1.72;
      const oy = Math.sin(a) * 1.72;
      nodes.push(atom(8, ox, oy, 0));
      bonds.push([i, 6 + i]);
    }
    for (let i = 0; i < 12; i += 1) {
      const a = (Math.PI * 2 * i) / 12;
      nodes.push(atom(1, Math.cos(a) * 2.26, Math.sin(a) * 2.26, i % 2 === 0 ? 0.34 : -0.34));
      bonds.push([i % 6, 12 + i]);
    }
    return { nodes: centerAndScale(nodes, 1.6), bonds };
  }

  return fallbackLayout(inputs);
}

