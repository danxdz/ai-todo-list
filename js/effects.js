import * as THREE from 'three';

/**
 * Merge / jackpot particles + pile stress. Burst modes: merge | jackpot
 */
export function createJuice(scene) {
  const particles = [];
  const rnd = () => Math.random() * 2 - 1;
  const geoS = new THREE.SphereGeometry(0.065, 5, 4);
  const geoShard = new THREE.TetrahedronGeometry(0.09, 0);
  const MAX_PARTICLES = 420;

  function burst(worldX, worldY, worldZ, color, count = 20, speedBoost = 1, mode = 'merge') {
    const sb = Math.max(0.75, speedBoost);
    const isJackpot = mode === 'jackpot';
    const n = Math.min(count, Math.max(0, MAX_PARTICLES - particles.length));
    if (n <= 0) return;

    const col = new THREE.Color(color);
    const hot = new THREE.Color(0xffffff).lerp(col, 0.35);
    const ringBias = isJackpot ? 0.55 : 0.38;

    for (let i = 0; i < n; i++) {
      const shard = Math.random() < (isJackpot ? 0.5 : 0.34);
      const geo = shard ? geoShard : geoS;
      const additive = Math.random() < (isJackpot ? 0.5 : 0.32);
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() < 0.28 ? hot.getHex() : col.getHex(),
        transparent: true,
        opacity: additive ? 0.92 : 0.98,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(worldX, worldY, worldZ + rnd() * 0.06);
      mesh.renderOrder = 25;
      scene.add(mesh);

      const ang = Math.random() * Math.PI * 2;
      const ring = Math.random() < ringBias;
      const sp = (isJackpot ? 3.2 : 2.2) + Math.random() * (isJackpot ? 7.5 : 5.8);
      const spf = sp * sb;
      let vx;
      let vy;
      let vz;
      if (ring) {
        vx = Math.cos(ang) * spf * 0.95;
        vy = Math.random() * spf * 0.55 + 0.85;
        vz = Math.sin(ang) * spf * 0.35;
      } else {
        vx = Math.cos(ang) * spf * 0.42;
        vy = Math.random() * spf * 0.95 + 1.35;
        vz = rnd() * spf * 0.32;
      }
      /** Jackpot: extra outward “pop” */
      if (isJackpot) {
        vx *= 1.15;
        vy *= 1.08;
        vz *= 1.12;
      }

      particles.push({
        mesh,
        mat,
        vx,
        vy,
        vz,
        life: 0,
        maxLife: (isJackpot ? 0.52 : 0.38) + Math.random() * (isJackpot ? 0.35 : 0.28),
        drag: isJackpot ? 0.94 : 0.955,
        rotAxis: new THREE.Vector3(rnd(), rnd(), rnd()).normalize(),
        rotSpeed: (4 + Math.random() * 10) * (shard ? 1.4 : 0.85),
        baseScale: shard ? 0.75 + Math.random() * 1.1 : 0.55 + Math.random() * 0.95,
        gravity: isJackpot ? 11 : 9.2,
      });
    }
  }

  /** Secondary tight sparkle burst (short life, additive) */
  /**
   * Soft smoke / vapor — rises and expands (merge & jackpot polish).
   */
  function smokePuff(worldX, worldY, worldZ, color, count = 22) {
    const col = new THREE.Color(color);
    const mist = new THREE.Color(0xf5f8ff).lerp(col, 0.35);
    const n = Math.min(count, Math.max(0, MAX_PARTICLES - particles.length));
    for (let i = 0; i < n; i++) {
      const startOp = 0.42 + Math.random() * 0.28;
      const mat = new THREE.MeshBasicMaterial({
        color: mist.clone().lerp(new THREE.Color(0xffffff), Math.random() * 0.25).getHex(),
        transparent: true,
        opacity: startOp,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(geoS, mat);
      mesh.position.set(
        worldX + rnd() * 0.35,
        worldY + rnd() * 0.22,
        worldZ + rnd() * 0.2 + 0.08,
      );
      mesh.renderOrder = 24;
      scene.add(mesh);
      const ang = Math.random() * Math.PI * 2;
      const sp = 0.85 + Math.random() * 2.1;
      particles.push({
        mesh,
        mat,
        vx: Math.cos(ang) * sp * 0.55,
        vy: 0.6 + Math.random() * 2.4,
        vz: Math.sin(ang) * sp * 0.28 + rnd() * 0.45,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.55,
        drag: 0.965,
        rotAxis: new THREE.Vector3(rnd(), rnd(), rnd()).normalize(),
        rotSpeed: 1 + Math.random() * 3,
        baseScale: 0.35 + Math.random() * 0.55,
        gravity: -2.2,
        isSmoke: true,
        smokeOpacity0: startOp,
      });
    }
  }

  /**
   * Sharp “disintegrate” chips — short life, high spin (reads like atoms flying apart).
   */
  function shatterSpray(worldX, worldY, worldZ, color, count = 16) {
    const col = new THREE.Color(color);
    const n = Math.min(count, Math.max(0, MAX_PARTICLES - particles.length));
    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: col.clone().offsetHSL(0, 0, 0.08 + Math.random() * 0.12).getHex(),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geoShard, mat);
      mesh.position.set(worldX + rnd() * 0.12, worldY + rnd() * 0.1, worldZ + rnd() * 0.08);
      mesh.renderOrder = 25;
      scene.add(mesh);
      const ang = Math.random() * Math.PI * 2;
      const sp = 3.5 + Math.random() * 8;
      particles.push({
        mesh,
        mat,
        vx: Math.cos(ang) * sp * 0.55,
        vy: Math.random() * sp * 0.85 + 1.2,
        vz: rnd() * sp * 0.45,
        life: 0,
        maxLife: 0.22 + Math.random() * 0.2,
        drag: 0.91,
        rotAxis: new THREE.Vector3(rnd(), rnd(), rnd()).normalize(),
        rotSpeed: (12 + Math.random() * 22) * 0.9,
        baseScale: 0.5 + Math.random() * 0.85,
        gravity: 12,
      });
    }
  }

  function burstSparks(worldX, worldY, worldZ, color, count = 12) {
    const col = new THREE.Color(color);
    const n = Math.min(count, Math.max(0, MAX_PARTICLES - particles.length));
    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: col.getHex(),
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geoS, mat);
      mesh.position.set(worldX + rnd() * 0.08, worldY + rnd() * 0.08, worldZ + 0.04);
      mesh.renderOrder = 26;
      scene.add(mesh);
      const ang = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 9;
      particles.push({
        mesh,
        mat,
        vx: Math.cos(ang) * sp * 0.4,
        vy: Math.random() * sp * 0.5 + 2,
        vz: rnd() * sp * 0.25,
        life: 0,
        maxLife: 0.14 + Math.random() * 0.12,
        drag: 0.88,
        rotAxis: new THREE.Vector3(0, 1, 0),
        rotSpeed: 8,
        baseScale: 0.25 + Math.random() * 0.35,
        gravity: 14,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      const g = p.gravity ?? 10;
      p.vy -= g * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vz *= p.drag;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotateOnAxis(p.rotAxis, p.rotSpeed * dt);

      const u = p.life / p.maxLife;
      const fade = 1 - u;
      const ease = fade * fade;
      let s;
      if (p.isSmoke) {
        const grow = 0.65 + 1.85 * (1 - (1 - u) ** 2);
        s = p.baseScale * grow;
      } else {
        s = p.baseScale * (0.4 + 1.5 * ease);
      }
      p.mesh.scale.setScalar(s);
      let op;
      if (p.isSmoke) {
        const o0 = p.smokeOpacity0 ?? 0.55;
        p.mat.opacity = Math.max(0, o0 * (1 - u * u * 1.15));
      } else {
        op = p.mat.blending === THREE.AdditiveBlending ? Math.max(0, fade * 1.15) : Math.max(0, 1 - u * 1.08);
        p.mat.opacity = Math.min(1, op);
      }

      if (p.life >= p.maxLife) {
        scene.remove(p.mesh);
        p.mat.dispose();
        particles.splice(i, 1);
      }
    }
  }

  function computePileStress(fruits, FRUITS, gameOverY, band) {
    let s = 0;
    for (const f of fruits) {
      const r = FRUITS[f.type].radius;
      const top = f.body.position.y + r;
      const d = gameOverY - top;
      if (d < band) s = Math.max(s, 1 - Math.max(0, d) / band);
    }
    return Math.min(1, s);
  }

  function updateDangerLine(dangerLineMesh, stress, time) {
    if (!dangerLineMesh?.material) return;
    const m = dangerLineMesh.material;
    const pulse = 0.55 + 0.45 * Math.sin(time * (6.5 + stress * 10));
    m.opacity = 0.28 + stress * 0.52 * pulse;
    const c = new THREE.Color().setHSL(0.02 - stress * 0.02, 0.85 + stress * 0.12, 0.52 + stress * 0.12);
    m.color.copy(c);
  }

  return {
    burst,
    burstSparks,
    smokePuff,
    shatterSpray,
    updateParticles,
    computePileStress,
    updateDangerLine,
  };
}
