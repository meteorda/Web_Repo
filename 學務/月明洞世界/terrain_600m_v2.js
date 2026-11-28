import * as THREE from 'three';

function getTypedView(binBuf, gltf, accessorIndex) {
  const acc = gltf.accessors[accessorIndex];
  const bv = gltf.bufferViews[acc.bufferView];
  const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const compCount = acc.type === 'VEC3' ? 3 : acc.type === 'VEC2' ? 2 : acc.type === 'VEC4' ? 4 : 1;
  const total = acc.count * compCount;
  if (acc.componentType === 5126) return new Float32Array(binBuf, byteOffset, total);
  if (acc.componentType === 5125) return new Uint32Array(binBuf, byteOffset, total);
  if (acc.componentType === 5123) return new Uint16Array(binBuf, byteOffset, total);
  return new Float32Array(binBuf, byteOffset, total);
}

function loadImageUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createOrganicIco(radius, detail, seed, scale = [1, 1, 1], amp = 0.18, flatBottom = false) {
  const rng = mulberry32(seed);
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  const vMap = new Map();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let n = vMap.get(key);
    if (n === undefined) {
      n = 1.0 - amp * 0.5 + rng() * amp;
      vMap.set(key, n);
    }
    let ny = y * n * scale[1];
    if (flatBottom && ny < 0) ny *= 0.45;
    pos.setXYZ(i, x * n * scale[0], ny, z * n * scale[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

function createRadialMistTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, 'rgba(235, 248, 255, 0.85)');
  g.addColorStop(0.45, 'rgba(235, 248, 255, 0.38)');
  g.addColorStop(1, 'rgba(235, 248, 255, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.Texture(c);
  tex.needsUpdate = true;
  return tex;
}

export const TERRAIN_V2_TEXTURES = [
  { id: 'zelda_map', label: '🎨 薩爾達手繪全圖地表', url: './assets/textures/wolmyeongdong_600m_zelda_2k.jpg?v=2' },
  { id: 'zelda_v2', label: '🗡️ 薩爾達草林地表（搭立體樹林）', url: './assets/textures/wolmyeongdong_600m_v2_ground.jpg?v=2' },
];

export function createWolmyeongdongTerrainV2(opts = {}) {
  const { withMiniPavilion = true, clearZones = [] } = opts;

  // 判斷點 (x, z) 是否落在任何 3D 建物底座或其正面 20m 淨空區內
    const STONE_PATH_EXT_PTS = [
      [-19.0, 1.35], [-19.25, 2.05], [-19.15, 2.70], [-18.95, 3.18],
    ];
    const isNearStonePath = (px, pz) => {
      for (let i = 0; i < STONE_PATH_EXT_PTS.length - 1; i++) {
        const [ax, az] = STONE_PATH_EXT_PTS[i];
        const [bx, bz] = STONE_PATH_EXT_PTS[i + 1];
        const abx = bx - ax, abz = bz - az;
        const lenSq = abx * abx + abz * abz || 1e-6;
        const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lenSq));
        if (Math.hypot(px - (ax + abx * t), pz - (az + abz * t)) < 0.45) return true;
      }
      return false;
    };
    const isInClearZone = (x, z) => {
      if (isNearStonePath(x, z)) return true;
    for (let i = 0; i < clearZones.length; i++) {
      const zDef = clearZones[i];
      const ax = zDef.x;
      const az = zDef.z;
      const bx = ax + Math.sin(zDef.rotY) * (zDef.frontLen || 1.27);
      const bz = az + Math.cos(zDef.rotY) * (zDef.frontLen || 1.27);
      const abx = bx - ax;
      const abz = bz - az;
      const abLenSq = abx * abx + abz * abz;
      const t = abLenSq > 1e-6 ? Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / abLenSq)) : 0;
      const cx = ax + abx * t;
      const cz = az + abz * t;
      const rad = zDef.radius || 1.7;
      if ((x - cx) * (x - cx) + (z - cz) * (z - cz) <= rad * rad) return true;
    }
    return false;
  };
  const group = new THREE.Group();
  let topMaterial = null;
  const textureCache = new Map();
  let lakeMesh = null;
  const mistLayers = [];
  let petalsInst = null;
  const petalBase = [];
  const flyingBirds = [];
  const lakeSwans = [];
  const groundCritters = [];
  let activeTerrainMeshes = [];

  // Solid dark turntable pedestal ring
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(38.5, 39.2, 1.2, 128),
    new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.72, metalness: 0.25 })
  );
  rim.position.y = -6.05;
  rim.receiveShadow = true;
  group.add(rim);

  async function applyTextureUrl(url) {
    if (!topMaterial) return;
    let tex = textureCache.get(url);
    if (!tex) {
      const img = await loadImageUrl(url);
      tex = new THREE.Texture(img);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      textureCache.set(url, tex);
    }
    topMaterial.map = tex;
    topMaterial.needsUpdate = true;
  }

  function build3DWorldProps(data, terrainMeshes = []) {
    activeTerrainMeshes = terrainMeshes;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const rng = mulberry32(20261128);

    // O(1) 快速高度網格（避免對 50 萬面地形執行數千次射線檢測造成手機卡頓）
    const GRID_N = 128;
    const hGrid = new Float32Array(GRID_N * GRID_N).fill(-999);
    for (const m of terrainMeshes) {
      const posAttr = m.geometry?.attributes?.position;
      if (!posAttr) continue;
      for (let i = 0; i < posAttr.count; i += 2) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const vz = posAttr.getZ(i);
        if (vy < 4.5) continue; // 跳過底座裙邊
        const gx = Math.max(0, Math.min(GRID_N - 1, Math.floor(((vx + 38) / 76) * GRID_N)));
        const gz = Math.max(0, Math.min(GRID_N - 1, Math.floor(((vz + 38) / 76) * GRID_N)));
        const idx = gz * GRID_N + gx;
        if (vy > hGrid[idx]) hGrid[idx] = vy;
      }
    }

    const sampleY = (x, z, fallbackY) => {
      const gx = Math.max(0, Math.min(GRID_N - 1, Math.floor(((x + 38) / 76) * GRID_N)));
      const gz = Math.max(0, Math.min(GRID_N - 1, Math.floor(((z + 38) / 76) * GRID_N)));
      const v = hGrid[gz * GRID_N + gx];
      return v > 4.5 ? v : fallbackY;
    };

    // 1. 高密度精細松樹林（大多為層次松樹，比例縮至原本 40~60% 隨機，數量加密 2.4 倍，避開建物與正面 20m）
    const rawTrees = data.trees || [];
    const trees = [];
    for (let i = 0; i < rawTrees.length; i++) {
      const [x, y, z, s, rot, kind] = rawTrees[i];
      if (!isInClearZone(x, z)) {
        trees.push([x, y, z, s * (0.40 + rng() * 0.20), rot, rng() < 0.88 ? 0 : kind]);
      }
      // 周邊加密 1~2 棵鄰近松樹（避開湖面低窪處與建物正面 20m 淨空區）
      const extraCount = i % 3 === 0 ? 2 : 1;
      for (let e = 0; e < extraCount; e++) {
        const ang = rng() * Math.PI * 2;
        const dist = 0.35 + rng() * 0.65;
        const nx = x + Math.cos(ang) * dist;
        const nz = z + Math.sin(ang) * dist;
        if (Math.hypot(nx, nz) > 36.5) continue;
        if (isInClearZone(nx, nz)) continue;
        const ny = sampleY(nx, nz, y);
        if (ny < 8.05) continue; // 不種進湖水裡
        trees.push([nx, ny, nz, s * (0.40 + rng() * 0.20), rng() * Math.PI * 2, rng() < 0.90 ? 0 : 1]);
      }
    }

    if (trees.length > 0) {
      const trunkGeo = new THREE.CylinderGeometry(0.040, 0.092, 0.82, 7);
      trunkGeo.translate(0, 0.41, 0);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3e28, roughness: 0.92, flatShading: true });
      const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
      trunkInst.castShadow = true;
      trunkInst.receiveShadow = true;

      // 松樹側枝叉
      const branchGeo = new THREE.CylinderGeometry(0.016, 0.030, 0.32, 5);
      branchGeo.rotateZ(0.68);
      branchGeo.translate(0.10, 0.64, 0.03);
      const branchInst = new THREE.InstancedMesh(branchGeo, trunkMat, trees.length);

      // 三層松針雲團（底平頂圓松樹輪廓）
      const crownMat = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.02, flatShading: true });
      const cLowGeo = createOrganicIco(0.40, 1, 11, [1.26, 0.44, 1.18], 0.22, true);
      cLowGeo.translate(-0.07, 0.76, 0.05);
      const cMidGeo = createOrganicIco(0.34, 1, 22, [1.18, 0.46, 1.12], 0.22, true);
      cMidGeo.translate(0.12, 0.95, -0.05);
      const cTopGeo = createOrganicIco(0.26, 1, 33, [1.08, 0.56, 1.05], 0.20, true);
      cTopGeo.translate(-0.02, 1.16, 0.02);

      const cLowInst = new THREE.InstancedMesh(cLowGeo, crownMat, trees.length);
      const cMidInst = new THREE.InstancedMesh(cMidGeo, crownMat, trees.length);
      const cTopInst = new THREE.InstancedMesh(cTopGeo, crownMat, trees.length);
      cLowInst.castShadow = true;
      cMidInst.castShadow = true;
      cTopInst.castShadow = true;
      cLowInst.receiveShadow = true;

      const pinePalette = [0x2c783b, 0x388f44, 0x226332, 0x45a14a, 0x317d42, 0x3b853e];
      const accentPalette = [0x678f38, 0x8ea13b, 0xb89335];

      for (let i = 0; i < trees.length; i++) {
        const [x, y, z, s, rot, kind] = trees[i];
        const lean = ((i % 9) - 4) * 0.018;
        dummy.position.set(x, y - 0.05, z);
        dummy.rotation.set(lean, rot, -lean * 0.8);
        dummy.scale.set(s * 0.85, s * 0.95, s * 0.85);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(i, dummy.matrix);
        branchInst.setMatrixAt(i, dummy.matrix);
        cLowInst.setMatrixAt(i, dummy.matrix);
        cMidInst.setMatrixAt(i, dummy.matrix);
        cTopInst.setMatrixAt(i, dummy.matrix);

        const pal = kind === 0 ? pinePalette : accentPalette;
        const baseHex = pal[i % pal.length];
        col.setHex(baseHex).offsetHSL(0, 0, -0.04);
        cLowInst.setColorAt(i, col);
        col.setHex(baseHex);
        cMidInst.setColorAt(i, col);
        col.setHex(baseHex).offsetHSL(0.012, 0.04, 0.06);
        cTopInst.setColorAt(i, col);
      }
      [trunkInst, branchInst, cLowInst, cMidInst, cTopInst].forEach((inst) => {
        inst.instanceMatrix.needsUpdate = true;
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      });
      group.add(trunkInst, branchInst, cLowInst, cMidInst, cTopInst);
    }

    // 2. 精雕花崗岩巨石（80 面位移稜角岩石，避開建物與正面 20m 淨空區）
    const rocks = (data.rocks || []).filter((r) => !isInClearZone(r[0], r[2]));
    if (rocks.length > 0) {
      const rockGeo = createOrganicIco(0.48, 1, 77, [1.22, 0.72, 0.96], 0.34, false);
      const rockMat = new THREE.MeshStandardMaterial({ roughness: 0.90, metalness: 0.04, flatShading: true });
      const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
      rockInst.castShadow = true;
      rockInst.receiveShadow = true;
      const rockCols = [0x968f80, 0x7d776b, 0xa8a090, 0x7a8370];
      for (let i = 0; i < rocks.length; i++) {
        const [x, y, z, s, rot] = rocks[i];
        dummy.position.set(x, y + s * 0.12, z);
        dummy.rotation.set((i % 5) * 0.22, rot, (i % 3) * 0.18);
        dummy.scale.set(s, s * 0.85, s * 1.12);
        dummy.updateMatrix();
        rockInst.setMatrixAt(i, dummy.matrix);
        col.setHex(rockCols[i % rockCols.length]);
        rockInst.setColorAt(i, col);
      }
      rockInst.instanceMatrix.needsUpdate = true;
      if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
      group.add(rockInst);
    }

    // 3. 細緻草叢（多葉片放射草簇）與寧靜公主藍白花朵（陽光草坪內無雜草）
    const SUNLIT_LAWN_POLY = [
      [-17.9, -2.5], [-16.6, -4.0], [-13.7, -4.2], [-12.0, -3.2],
      [-10.4, -1.6], [-8.3, -1.0], [-7.7, -0.2], [-8.2, 0.55],
      [-12.5, 0.35], [-16.8, 0.25], [-18.2, 0.75], [-19.1, 1.45],
      [-18.6, -1.1],
    ];
    const isInSunlitLawn = (px, pz) => {
      let inside = false;
      for (let i = 0, j = SUNLIT_LAWN_POLY.length - 1; i < SUNLIT_LAWN_POLY.length; j = i++) {
        const [xi, zi] = SUNLIT_LAWN_POLY[i];
        const [xj, zj] = SUNLIT_LAWN_POLY[j];
        if (((zi > pz) !== (zj > pz)) && (px < (xj - xi) * (pz - zi) / ((zj - zi) || 1e-7) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    };
    const grass = data.grass || [];
    const blades = grass.filter((g) => !g[4] && !isInSunlitLawn(g[0], g[2]));
    const flowers = grass.filter((g) => g[4] && !isInSunlitLawn(g[0], g[2]));

    if (blades.length > 0) {
      const bladeGeo = new THREE.ConeGeometry(0.065, 0.32, 4);
      bladeGeo.translate(0, 0.16, 0);
      const bladeMat = new THREE.MeshStandardMaterial({ roughness: 0.82, flatShading: true });
      // 每叢草由 2 支交叉微傾葉片組成，看起來蓬鬆自然
      const grassInst = new THREE.InstancedMesh(bladeGeo, bladeMat, blades.length * 2);
      for (let i = 0; i < blades.length; i++) {
        const [x, y, z, s] = blades[i];
        for (let b = 0; b < 2; b++) {
          const idx = i * 2 + b;
          dummy.position.set(x + (b === 0 ? -0.04 : 0.04), y - 0.02, z + (b === 0 ? 0.03 : -0.03));
          dummy.rotation.set((b === 0 ? 0.18 : -0.15), (i * 1.7 + b * 1.4) % 6.28, (b === 0 ? -0.22 : 0.20));
          dummy.scale.set(s * 0.85, s * (0.85 + b * 0.18), s * 0.85);
          dummy.updateMatrix();
          grassInst.setMatrixAt(idx, dummy.matrix);
          col.setHex((i + b) % 2 === 0 ? 0x67c440 : 0x86db52);
          grassInst.setColorAt(idx, col);
        }
      }
      grassInst.instanceMatrix.needsUpdate = true;
      if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
      group.add(grassInst);
    }

    if (flowers.length > 0) {
      const stemGeo = new THREE.CylinderGeometry(0.015, 0.022, 0.26, 4);
      stemGeo.translate(0, 0.13, 0);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x4ca642, roughness: 0.85 });
      const stemInst = new THREE.InstancedMesh(stemGeo, stemMat, flowers.length);

      const bloomGeo = new THREE.DodecahedronGeometry(0.085, 0);
      bloomGeo.scale(1.25, 0.45, 1.25);
      bloomGeo.translate(0, 0.27, 0);
      const bloomMat = new THREE.MeshStandardMaterial({
        emissive: 0x2299dd,
        emissiveIntensity: 0.28,
        roughness: 0.45,
        flatShading: true,
      });
      const bloomInst = new THREE.InstancedMesh(bloomGeo, bloomMat, flowers.length);

      for (let i = 0; i < flowers.length; i++) {
        const [x, y, z, s] = flowers[i];
        dummy.position.set(x, y - 0.02, z);
        dummy.rotation.set(0, (i * 2.1) % 6.28, 0);
        dummy.scale.setScalar(s * 1.05);
        dummy.updateMatrix();
        stemInst.setMatrixAt(i, dummy.matrix);
        bloomInst.setMatrixAt(i, dummy.matrix);
        col.setHex(i % 2 === 0 ? 0x6be6ff : 0xeefaff);
        bloomInst.setColorAt(i, col);
      }
      stemInst.instanceMatrix.needsUpdate = true;
      bloomInst.instanceMatrix.needsUpdate = true;
      if (bloomInst.instanceColor) bloomInst.instanceColor.needsUpdate = true;
      group.add(stemInst, bloomInst);
    }

    // 4. Shimmering Turquoise Moonlight Lake Water
    if (data.lake) {
      const { x, y, z } = data.lake;
      const waterGeo = new THREE.CircleGeometry(1.85, 32);
      waterGeo.rotateX(-Math.PI / 2);
      waterGeo.scale(0.88, 1.0, 1.15);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x1bb8a6,
        emissive: 0x0a4a46,
        emissiveIntensity: 0.35,
        roughness: 0.16,
        metalness: 0.28,
        transparent: true,
        opacity: 0.88,
      });
      lakeMesh = new THREE.Mesh(waterGeo, waterMat);
      lakeMesh.position.set(x, y + 0.08, z);
      lakeMesh.receiveShadow = true;
      group.add(lakeMesh);

      if (withMiniPavilion) {
        const pav = new THREE.Group();
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.36, 0.14, 8),
          new THREE.MeshStandardMaterial({ color: 0xe2dcd0, roughness: 0.7 })
        );
        base.position.y = 0.07;
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(0.44, 0.28, 8),
          new THREE.MeshStandardMaterial({ color: 0x267365, roughness: 0.55 })
        );
        roof.position.y = 0.34;
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 0.22, 8),
          new THREE.MeshStandardMaterial({ color: 0x8c3b2b, roughness: 0.8 })
        );
        pillar.position.y = 0.20;
        pav.add(base, pillar, roof);
        pav.position.set(x, y + 0.08, z);
        group.add(pav);
      }
    }

    // 4b. 陽光草坪南側 3D 薄層石板走道模型（兩側邊緣微微較高）
    {
      const pathPts = [
        [-8.1, 0.45],
        [-10.2, 0.32],
        [-12.4, 0.14],
        [-14.5, -0.02],
        [-16.5, -0.04],
        [-17.2, 0.15],
        [-18.1, 0.65],
        [-19.0, 1.35],
        [-19.25, 2.05],
        [-19.15, 2.70],
        [-18.95, 3.18],
      ];
      const curvePts = [];
      const segDownRay = new THREE.Raycaster();
      const segDownDir = new THREE.Vector3(0, -1, 0);
      for (let i = 0; i < pathPts.length - 1; i++) {
        const [ax, az] = pathPts[i];
        const [bx, bz] = pathPts[i + 1];
        const segLen = Math.hypot(bx - ax, bz - az);
        const steps = Math.max(2, Math.ceil(segLen / 0.25));
        for (let s = 0; s < steps; s++) {
          const u = s / steps;
          curvePts.push([ax + (bx - ax) * u, az + (bz - az) * u]);
        }
      }
      curvePts.push(pathPts[pathPts.length - 1]);

      const stoneSlabGeo = new THREE.BoxGeometry(0.36, 0.032, 0.23);
      const curbStoneGeo = new THREE.BoxGeometry(0.055, 0.068, 0.25);
      const slabMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.78, metalness: 0.04 });
      const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75, metalness: 0.06 });

      const slabInst = new THREE.InstancedMesh(stoneSlabGeo, slabMat, curvePts.length);
      const curbInst = new THREE.InstancedMesh(curbStoneGeo, curbMat, curvePts.length * 2);
      slabInst.receiveShadow = true;
      curbInst.castShadow = false;
      curbInst.receiveShadow = true;
      slabInst.userData.ignoreRaycast = true;
      curbInst.userData.ignoreRaycast = true;

      for (let i = 0; i < curvePts.length; i++) {
        const [px, pz] = curvePts[i];
        const [nx, nz] = curvePts[Math.min(curvePts.length - 1, i + 1)];
        const [ox, oz] = curvePts[Math.max(0, i - 1)];
        const tx = nx - ox;
        const tz = nz - oz;
        const yaw = Math.atan2(tx, tz);
        const tLen = Math.hypot(tx, tz) || 1;
        const perpX = -tz / tLen;
        const perpZ = tx / tLen;

        segDownRay.set(new THREE.Vector3(px, 35, pz), segDownDir);
        const hits = segDownRay.intersectObjects(terrainMeshes, false);
        const py = hits.length > 0 ? hits[0].point.y : 8.5;

        segDownRay.set(new THREE.Vector3(px + (tx / tLen) * 0.15, 35, pz + (tz / tLen) * 0.15), segDownDir);
        const fHits = segDownRay.intersectObjects(terrainMeshes, false);
        const fy = fHits.length > 0 ? fHits[0].point.y : py;
        const pitch = -Math.atan2(fy - py, 0.15);

        dummy.position.set(px, py + 0.016, pz);
        dummy.rotation.set(pitch, yaw, 0, 'YXZ');
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        slabInst.setMatrixAt(i, dummy.matrix);

        for (let side = 0; side < 2; side++) {
          const sign = side === 0 ? -1 : 1;
          const cx = px + perpX * sign * 0.205;
          const cz = pz + perpZ * sign * 0.205;
          dummy.position.set(cx, py + 0.032, cz);
          dummy.rotation.set(pitch, yaw, 0, 'YXZ');
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          curbInst.setMatrixAt(i * 2 + side, dummy.matrix);
        }
      }
      slabInst.instanceMatrix.needsUpdate = true;
      curbInst.instanceMatrix.needsUpdate = true;
      group.add(slabInst, curbInst);
    }

    // 5. 柔邊放射漸層山谷雲霧（消除硬邊圓盤感）
    const mistTex = createRadialMistTexture();
    const mistCoords = [
      [-14, 2.8, -16, 20], [16, 3.2, -12, 22], [-8, 2.2, 16, 24], [18, 3.8, 15, 21], [0, 5.2, -24, 28],
    ];
    const mistMat = new THREE.MeshBasicMaterial({
      map: mistTex,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      side: 2,
    });
    for (const [mx, my, mz, r] of mistCoords) {
      const mGeo = new THREE.PlaneGeometry(r * 2, r * 2);
      mGeo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(mGeo, mistMat);
      m.userData.ignoreRaycast = true;
      m.position.set(mx, my, mz);
      m.userData.baseX = mx;
      m.userData.baseZ = mz;
      mistLayers.push(m);
      group.add(m);
    }

    // 6. Floating Wind Petals / Spores
    const petalCount = 120;
    const pGeo = new THREE.PlaneGeometry(0.16, 0.09);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xf4ffe8, transparent: true, opacity: 0.85, side: 2 });
    petalsInst = new THREE.InstancedMesh(pGeo, pMat, petalCount);
    petalsInst.userData.ignoreRaycast = true;
    for (let i = 0; i < petalCount; i++) {
      const a = (i * 2.39996) % 6.283;
      const rr = Math.sqrt((i + 0.5) / petalCount) * 32;
      const px = Math.cos(a) * rr;
      const pz = Math.sin(a) * rr;
      const py = 2.0 + (i % 9) * 0.9;
      petalBase.push([px, py, pz, (i % 7) * 0.4 + 0.6]);
      dummy.position.set(px, py, pz);
      dummy.updateMatrix();
      petalsInst.setMatrixAt(i, dummy.matrix);
    }
    petalsInst.instanceMatrix.needsUpdate = true;
    group.add(petalsInst);

    // 7. 開源逼真動物 GLB 生態（Parrot.glb / Stork.glb 會拍翅飛翔 + Chipmunk.glb 改色花栗鼠）
    const markIgnoreRay = (root) => {
      root.traverse((o) => { if (o.isMesh) o.userData.ignoreRaycast = true; });
    };

    const parseSimpleGlb = async (url) => {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const view = new DataView(buf);
      const jsonLen = view.getUint32(12, true);
      const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
      const binOff = 20 + jsonLen;
      const binBuf = buf.slice(binOff + 8, binOff + 8 + view.getUint32(binOff, true));
      const prim = gltf.meshes[0].primitives[0];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.attributes.POSITION), 3));
      if (prim.attributes.NORMAL !== undefined) {
        geo.setAttribute('normal', new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.attributes.NORMAL), 3));
      } else {
        geo.computeVertexNormals();
      }
      if (prim.attributes.TEXCOORD_0 !== undefined) {
        geo.setAttribute('uv', new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.attributes.TEXCOORD_0), 2));
      }
      if (prim.attributes.COLOR_0 !== undefined) {
        const cAcc = gltf.accessors[prim.attributes.COLOR_0];
        const comp = cAcc.type === 'VEC4' ? 4 : 3;
        const cRaw = getTypedView(binBuf, gltf, prim.attributes.COLOR_0);
        const cFloat = new Float32Array(cAcc.count * comp);
        const denom = cAcc.componentType === 5121 ? 255 : (cAcc.componentType === 5123 ? 65535 : 1);
        for (let i = 0; i < cAcc.count * comp; i++) cFloat[i] = cRaw[i] / denom;
        geo.setAttribute('color', new THREE.BufferAttribute(cFloat, comp));
      }
      if (prim.indices !== undefined) {
        geo.setIndex(new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.indices), 1));
      }
      // 載入 Morph Target 變形拍翅動畫
      let animTimes = null;
      let animWeights = null;
      let targetCount = 0;
      if (prim.targets && prim.targets.length > 0) {
        targetCount = prim.targets.length;
        geo.morphAttributes.position = prim.targets.map((tg) => {
          const attr = new THREE.BufferAttribute(getTypedView(binBuf, gltf, tg.POSITION), 3);
          return attr;
        });
        if (gltf.animations?.[0]?.samplers?.[0]) {
          const samp = gltf.animations[0].samplers[0];
          animTimes = getTypedView(binBuf, gltf, samp.input);
          animWeights = getTypedView(binBuf, gltf, samp.output);
        }
      }
      return { geo, animTimes, animWeights, targetCount };
    };

    // 恢復為原來的可愛飛鳥群（白色信鴿、青鳥、金雀，於山谷與聖殿上空盤旋）
    const birdColors = [0xf8fafc, 0x38bdf8, 0xfbbf24, 0xf1f5f9];
    const birdFlocks = [
      { cx: 0.0, cz: 2.0, rx: 10.5, rz: 7.5, baseY: 13.5, count: 5, speed: 0.26 },
      { cx: -6.5, cz: 1.5, rx: 8.5, rz: 6.5, baseY: 15.2, count: 4, speed: 0.22 },
      { cx: 6.0, cz: -3.5, rx: 9.5, rz: 8.0, baseY: 14.2, count: 5, speed: 0.24 },
    ];
    const birdBeakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
    birdFlocks.forEach((fl, fIdx) => {
      for (let i = 0; i < fl.count; i++) {
        const col = birdColors[(fIdx + i) % birdColors.length];
        const birdMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 });
        const bird = new THREE.Group();

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), birdMat);
        body.scale.set(0.75, 0.72, 1.55);
        bird.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 6), birdMat);
        head.position.set(0, 0.055, 0.14);
        bird.add(head);

        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.075, 5), birdBeakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.048, 0.21);
        bird.add(beak);

        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 4), birdMat);
        tail.rotation.x = -Math.PI / 2;
        tail.scale.set(1.3, 1.0, 0.35);
        tail.position.set(0, 0.02, -0.18);
        bird.add(tail);

        const wingGeo = new THREE.BoxGeometry(0.28, 0.02, 0.13);
        const leftWing = new THREE.Group();
        leftWing.position.set(-0.06, 0.03, 0.01);
        const lwMesh = new THREE.Mesh(wingGeo, birdMat);
        lwMesh.position.set(-0.14, 0, 0);
        leftWing.add(lwMesh);
        bird.add(leftWing);

        const rightWing = new THREE.Group();
        rightWing.position.set(0.06, 0.03, 0.01);
        const rwMesh = new THREE.Mesh(wingGeo, birdMat);
        rwMesh.position.set(0.14, 0, 0);
        rightWing.add(rwMesh);
        bird.add(rightWing);

        const sc = 0.9 + ((i * 7 + fIdx) % 4) * 0.12;
        bird.scale.setScalar(sc);
        markIgnoreRay(bird);
        group.add(bird);

        flyingBirds.push({
          group: bird,
          leftWing,
          rightWing,
          cx: fl.cx + ((i % 2 === 0 ? 1 : -1) * 1.1),
          cz: fl.cz + ((i % 3) - 1) * 0.9,
          rx: fl.rx + (i % 3) * 1.1,
          rz: fl.rz + ((i + 1) % 3) * 0.9,
          baseY: fl.baseY + (i % 3) * 0.85,
          speed: fl.speed * (0.9 + (i % 3) * 0.08) * (fIdx % 2 === 0 ? 1 : -1),
          phase: (i / fl.count) * Math.PI * 2 + fIdx * 1.3,
          flapSpeed: 7.5 + (i % 4) * 1.1,
        });
      }
    });

    // 8. 月明湖悠游天鵝（3 隻白羽天鵝在水面繞行）
    if (data.lake) {
      const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
      const swanMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
      for (let i = 0; i < 3; i++) {
        const swan = new THREE.Group();
        const sBody = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), swanMat);
        sBody.scale.set(0.85, 0.65, 1.45);
        sBody.position.y = 0.05;
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 0.18, 6), swanMat);
        neck.position.set(0, 0.15, 0.12);
        neck.rotation.x = -0.25;
        const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), swanMat);
        sHead.position.set(0, 0.24, 0.15);
        const sBeak = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 5), beakMat);
        sBeak.rotation.x = Math.PI / 2;
        sBeak.position.set(0, 0.235, 0.20);
        swan.add(sBody, neck, sHead, sBeak);
        swan.scale.setScalar(0.85);
        markIgnoreRay(swan);
        group.add(swan);
        lakeSwans.push({
          group: swan,
          cx: data.lake.x,
          cy: data.lake.y + 0.08,
          cz: data.lake.z,
          rx: 0.55 + i * 0.25,
          rz: 0.65 + i * 0.28,
          speed: 0.35 - i * 0.06,
          phase: i * 2.1,
        });
      }
    }

    // 9. 草地與樹下逼真花栗鼠（開源松鼠模型改花栗鼠條紋毛色，可自由穿越不阻擋）
    Promise.all([
      parseSimpleGlb('./assets/models/animals/Chipmunk.glb'),
      loadImageUrl('./assets/models/animals/chipmunk_tex.jpg'),
    ]).then(([chipData, chipImg]) => {
      const chipTex = new THREE.Texture(chipImg);
      chipTex.flipY = false;
      chipTex.colorSpace = THREE.SRGBColorSpace;
      chipTex.needsUpdate = true;
      const chipMat = new THREE.MeshStandardMaterial({
        map: chipTex,
        roughness: 0.78,
        metalness: 0.04,
        side: 2,
      });

      const animalRand = mulberry32(20261129);
      const downRay = new THREE.Raycaster();
      const downDir = new THREE.Vector3(0, -1, 0);
      const validTrees = (data.trees || []).filter((tr) => !isInClearZone(tr[0], tr[2]) && tr[1] > 6.5 && tr[1] < 12.2);
      let placedCritters = 0;
      for (let attempt = 0; attempt < 160 && placedCritters < 6; attempt++) {
        const ang = animalRand() * Math.PI * 2;
        const rad = 4.2 + animalRand() * 13.5;
        const cx = Math.cos(ang) * rad;
        const cz = Math.sin(ang) * rad;
        if (isInClearZone(cx, cz)) continue;
        if (data.lake && Math.hypot(cx - data.lake.x, cz - data.lake.z) < 2.6) continue;

        downRay.set(new THREE.Vector3(cx, 35, cz), downDir);
        const hits = downRay.intersectObjects(terrainMeshes, false);
        if (hits.length === 0) continue;
        const cy = hits[0].point.y;
        if (cy < 6.8 || cy > 11.5) continue;

        // 找出距離此點最近的 3 棵樹，讓花栗鼠在樹與樹之間快速來回奔跑
        const nearTrees = validTrees
          .map((tr) => ({ x: tr[0] + (animalRand() - 0.5) * 0.5, z: tr[2] + (animalRand() - 0.5) * 0.5, d: Math.hypot(tr[0] - cx, tr[2] - cz) }))
          .filter((tr) => tr.d >= 1.5 && tr.d <= 8.5)
          .sort((a, b) => a.d - b.d)
          .slice(0, 3);
        const waypoints = nearTrees.length >= 2
          ? nearTrees.map((tr) => {
              downRay.set(new THREE.Vector3(tr.x, 35, tr.z), downDir);
              const th = downRay.intersectObjects(terrainMeshes, false);
              return { x: tr.x, y: th.length > 0 ? th[0].point.y : cy, z: tr.z };
            })
          : [{ x: cx, y: cy, z: cz }, { x: cx + 1.8, y: cy, z: cz + 1.2 }, { x: cx - 1.5, y: cy, z: cz + 1.6 }];

        // 預先烘焙路徑每小段的地形高度 y（避免在 update 迴圈內每幀跑高耗能 Raycaster）
        const bakedWaypoints = [];
        for (let wi = 0; wi < waypoints.length; wi++) {
          const a = waypoints[wi];
          const b = waypoints[(wi + 1) % waypoints.length];
          const segSteps = 6;
          for (let s = 0; s < segSteps; s++) {
            const u = s / segSteps;
            const sx = a.x + (b.x - a.x) * u;
            const sz = a.z + (b.z - a.z) * u;
            downRay.set(new THREE.Vector3(sx, 35, sz), downDir);
            const sh = downRay.intersectObjects(terrainMeshes, false);
            bakedWaypoints.push({ x: sx, y: sh.length > 0 ? sh[0].point.y : a.y, z: sz, isTreeStop: s === 0 });
          }
        }

        const chipMesh = new THREE.Mesh(chipData.geo, chipMat);
        chipMesh.scale.setScalar(0.031 + (placedCritters % 2) * 0.006);
        chipMesh.castShadow = false;
        chipMesh.userData.ignoreRaycast = true;
        chipMesh.position.set(bakedWaypoints[0].x, bakedWaypoints[0].y, bakedWaypoints[0].z);
        group.add(chipMesh);
        groundCritters.push({
          group: chipMesh,
          waypoints: bakedWaypoints,
          wpIdx: 0,
          waitTimer: placedCritters * 0.35,
          speed: 2.3 + (placedCritters % 3) * 0.4,
          phase: placedCritters * 1.4,
          lastT: null,
        });
        placedCritters++;
      }
    }).catch((err) => console.warn('Chipmunk GLB load skipped:', err));
  }

  (async () => {
    try {
      const [glbRes, propsRes, groundTexImg] = await Promise.all([
        fetch('./assets/models/wolmyeongdong_600m.glb?v=4'),
        fetch('./assets/data/wolmyeongdong_600m_v2_props.json?v=2'),
        loadImageUrl(TERRAIN_V2_TEXTURES[0].url),
      ]);
      const buf = await glbRes.arrayBuffer();
      const propsData = await propsRes.json();

      const view = new DataView(buf);
      const jsonLen = view.getUint32(12, true);
      const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
      const binOff = 20 + jsonLen;
      const binLen = view.getUint32(binOff, true);
      const binBuf = buf.slice(binOff + 8, binOff + 8 + binLen);

      const v2Tex = new THREE.Texture(groundTexImg);
      v2Tex.flipY = false;
      v2Tex.colorSpace = THREE.SRGBColorSpace;
      v2Tex.anisotropy = 8;
      v2Tex.needsUpdate = true;
      textureCache.set(TERRAIN_V2_TEXTURES[0].url, v2Tex);

      const terrainMeshes = [];
      for (const mesh of gltf.meshes) {
        for (const prim of mesh.primitives) {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.attributes.POSITION), 3));
          if (prim.attributes.NORMAL !== undefined) {
            geo.setAttribute('normal', new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.attributes.NORMAL), 3));
          } else {
            geo.computeVertexNormals();
          }
          if (prim.attributes.TEXCOORD_0 !== undefined) {
            geo.setAttribute('uv', new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.attributes.TEXCOORD_0), 2));
          }
          const hasColor = prim.attributes.COLOR_0 !== undefined;
          if (hasColor) {
            geo.setAttribute('color', new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.attributes.COLOR_0), 3));
          }
          if (prim.indices !== undefined) {
            geo.setIndex(new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.indices), 1));
          }

          const matDef = gltf.materials && prim.material !== undefined ? gltf.materials[prim.material] : null;
          const pbr = matDef?.pbrMetallicRoughness;
          let mat;
          if (pbr?.baseColorTexture !== undefined) {
            mat = new THREE.MeshStandardMaterial({
              map: v2Tex,
              roughness: 0.86,
              metalness: 0.0,
            });
            topMaterial = mat;
          } else {
            mat = new THREE.MeshStandardMaterial({
              vertexColors: hasColor,
              color: hasColor ? 0xffffff : 0x5c5349,
              roughness: 0.92,
              metalness: 0.05,
            });
          }
          const m = new THREE.Mesh(geo, mat);
          m.userData.isTerrainSurface = true;
          m.castShadow = true;
          m.receiveShadow = true;
          group.add(m);
          terrainMeshes.push(m);
        }
      }

      build3DWorldProps(propsData, terrainMeshes);
    } catch (err) {
      console.error('Failed to build Wolmyeongdong Terrain V2:', err);
    }
  })();

  const pDummy = new THREE.Object3D();
  return {
    group,
    setTextureStyle(styleId) {
      const found = TERRAIN_V2_TEXTURES.find((s) => s.id === styleId);
      if (found) applyTextureUrl(found.url);
    },
    update(t) {
      if (lakeMesh) {
        lakeMesh.material.emissiveIntensity = 0.28 + Math.sin(t * 2.0) * 0.1;
      }
      for (let i = 0; i < mistLayers.length; i++) {
        const m = mistLayers[i];
        m.position.x = m.userData.baseX + Math.sin(t * 0.15 + i * 1.4) * 2.2;
        m.position.z = m.userData.baseZ + Math.cos(t * 0.12 + i * 1.1) * 1.8;
      }
      if (petalsInst && petalBase.length > 0) {
        for (let i = 0; i < petalBase.length; i++) {
          const [bx, by, bz, spd] = petalBase[i];
          const px = bx + Math.sin(t * spd * 0.6 + i) * 1.6;
          const py = by + Math.sin(t * spd * 0.9 + i * 0.7) * 0.45;
          const pz = bz + Math.cos(t * spd * 0.5 + i) * 1.4;
          pDummy.position.set(px, py, pz);
          pDummy.rotation.set(t * spd, t * spd * 0.7, i);
          pDummy.updateMatrix();
          petalsInst.setMatrixAt(i, pDummy.matrix);
        }
        petalsInst.instanceMatrix.needsUpdate = true;
      }

      // 空中飛鳥盤旋與拍翅動畫（拍翅與滑翔交替）
      for (let i = 0; i < flyingBirds.length; i++) {
        const b = flyingBirds[i];
        const ang = t * b.speed + b.phase;
        const nx = b.cx + Math.cos(ang) * b.rx;
        const nz = b.cz + Math.sin(ang) * b.rz;
        const ny = b.baseY + Math.sin(t * 0.9 + b.phase) * 0.55;
        const vx = -Math.sin(ang) * b.rx * b.speed;
        const vz = Math.cos(ang) * b.rz * b.speed;
        b.group.position.set(nx, ny, nz);
        b.group.rotation.y = Math.atan2(vx, vz);
        b.group.rotation.z = -Math.sin(ang) * 0.12;

        const glideCycle = Math.sin(t * 1.3 + b.phase);
        const flapAmp = glideCycle > -0.35 ? 0.62 : 0.10;
        const flap = Math.sin(t * b.flapSpeed + b.phase) * flapAmp;
        b.leftWing.rotation.z = -flap;
        b.rightWing.rotation.z = flap;
      }

      // 月明湖天鵝悠游動畫
      for (let i = 0; i < lakeSwans.length; i++) {
        const s = lakeSwans[i];
        const ang = t * s.speed + s.phase;
        const nx = s.cx + Math.cos(ang) * s.rx;
        const nz = s.cz + Math.sin(ang) * s.rz;
        const vx = -Math.sin(ang) * s.rx * s.speed;
        const vz = Math.cos(ang) * s.rz * s.speed;
        s.group.position.set(nx, s.cy + Math.sin(t * 2.2 + s.phase) * 0.015, nz);
        s.group.rotation.y = Math.atan2(vx, vz);
      }

      // 樹林間花栗鼠快速來回奔跑移動動畫（使用預烘焙高度線性插值，零 Raycaster 開銷）
      for (let i = 0; i < groundCritters.length; i++) {
        const c = groundCritters[i];
        const dt = c.lastT !== null ? Math.min(0.05, Math.max(0, t - c.lastT)) : 0.016;
        c.lastT = t;
        if (c.waitTimer > 0) {
          c.waitTimer -= dt;
          c.group.rotation.y += Math.sin(t * 7.0 + c.phase) * 0.04;
          c.group.rotation.x = 0;
          continue;
        }
        const curWp = c.waypoints[c.wpIdx];
        const targetWp = c.waypoints[(c.wpIdx + 1) % c.waypoints.length];
        const dx = targetWp.x - c.group.position.x;
        const dz = targetWp.z - c.group.position.z;
        const dist = Math.hypot(dx, dz);
        const totalSeg = Math.hypot(targetWp.x - curWp.x, targetWp.z - curWp.z) || 1;
        if (dist < 0.08) {
          c.wpIdx = (c.wpIdx + 1) % c.waypoints.length;
          if (targetWp.isTreeStop) {
            c.waitTimer = 0.55 + (i % 3) * 0.25;
          }
        } else {
          const step = Math.min(dist, c.speed * dt);
          const nx = c.group.position.x + (dx / dist) * step;
          const nz = c.group.position.z + (dz / dist) * step;
          const u = 1.0 - (dist - step) / totalSeg;
          const ny = curWp.y + (targetWp.y - curWp.y) * Math.max(0, Math.min(1, u));
          const scurryBob = Math.abs(Math.sin(t * 24.0 + c.phase)) * 0.025;
          c.group.position.set(nx, ny + scurryBob, nz);
          const targetYaw = Math.atan2(dx, dz);
          let ydiff = targetYaw - c.group.rotation.y;
          while (ydiff > Math.PI) ydiff -= Math.PI * 2;
          while (ydiff < -Math.PI) ydiff += Math.PI * 2;
          c.group.rotation.y += ydiff * Math.min(1, dt * 14);
          c.group.rotation.x = Math.sin(t * 24.0 + c.phase) * 0.06;
        }
      }
    },
  };
}
