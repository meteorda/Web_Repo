// 神的瀑布 (God's Waterfall / 聖靈瀑布) — 數百個小實體堆疊之精細 3D 模組
import * as THREE from 'three';

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

/**
 * 產生自然多面花崗岩幾何體（具稜角與粗糙質感，無外部貼圖依賴）
 */
function createGraniteGeometry(radius = 1, detail = 1, seed = 42, squash = [1, 0.85, 0.92]) {
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
      n = 0.80 + rng() * 0.36;
      vMap.set(key, n);
    }
    pos.setXYZ(i, x * n * squash[0], y * n * squash[1], z * n * squash[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * 建立神的瀑布 3D 群組
 * @param {object} opts { withPlaza: boolean }
 */
export function createGodsWaterfall(opts = {}) {
  const { withPlaza = true } = opts;
  const root = new THREE.Group();
  const rng = mulberry32(20261129);

  const matCache = new Map();
  const M = (hex, extra = {}) => {
    const key = hex + JSON.stringify(extra);
    if (!matCache.has(key)) {
      matCache.set(key, new THREE.MeshStandardMaterial({
        color: hex,
        flatShading: extra.flatShading ?? true,
        roughness: extra.roughness ?? 0.86,
        metalness: extra.metalness ?? 0.04,
        ...extra,
      }));
    }
    return matCache.get(key);
  };

  const cWetRock = M('#3f464c', { roughness: 0.48, metalness: 0.10 });
  const cTurf = M('#1f9c54', { roughness: 0.88 });
  const cPond = M('#657a3c', { roughness: 0.20, metalness: 0.15, flatShading: false });
  const cBridgeStone = M('#dfd7c8', { roughness: 0.84 });
  const cGlassRail = new THREE.MeshStandardMaterial({
    color: '#2dd4bf',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.56,
    side: 2,
  });
  const cTrunk = M('#5c3c26', { roughness: 0.90 });
  const cPine1 = M('#3b7b35', { roughness: 0.84 });
  const cPine2 = M('#529944', { roughness: 0.82 });
  const cPavWhite = M('#f0eee8', { roughness: 0.65 });
  const cPavWood = M('#c96a32', { roughness: 0.70 });
  const cPavRoof = M('#1f6b7d', { roughness: 0.48, metalness: 0.12 });
  const cPavRidge = M('#388b9e', { roughness: 0.50 });
  const cMetal = M('#9aa3ad', { roughness: 0.42, metalness: 0.65 });

  const addMesh = (parent, geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // =========================================================
  // 1. 基底山坡、綠草皮池畔與月明湖翠綠水面
  // =========================================================
  if (withPlaza) {
    addMesh(root, new THREE.CylinderGeometry(18, 20, 0.9, 36), M('#7d786e'), 0, -0.50, -0.5);
    // 背後綠林山坡基底（置於 z=-8.8 確保完全不遮擋瀑布與涼亭）
    addMesh(root, new THREE.SphereGeometry(11.5, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), M('#4b7b3e'), 0, 0.2, -8.8)
      .scale.set(1.35, 0.95, 0.42);
  }

  // 池水本體
  const pond = addMesh(root, new THREE.CylinderGeometry(11.5, 11.5, 0.14, 36, 1, false, -Math.PI * 0.48, Math.PI * 0.96), cPond, 0, -0.02, 5.2, 0, Math.PI, 0);
  pond.scale.set(1.05, 1, 0.62);

  // 右側池中迷你松樹小石島（照片一右下角）
  const islet = new THREE.Group();
  islet.position.set(6.4, 0.06, 7.6);
  root.add(islet);
  addMesh(islet, createGraniteGeometry(0.65, 1, 88, [1.5, 0.45, 1.0]), M('#9a9488'), 0, 0.08, 0);
  addMesh(islet, createGraniteGeometry(0.45, 1, 89, [1.2, 0.55, 0.9]), M('#7a766d'), -0.45, 0.05, 0.15);
  addMesh(islet, new THREE.CylinderGeometry(0.06, 0.10, 0.65, 7), cTrunk, 0.1, 0.42, 0, 0.1, 0, -0.2);
  addMesh(islet, new THREE.SphereGeometry(0.42, 10, 8), cPine1, 0.18, 0.78, 0).scale.set(1.3, 0.48, 1.1);

  // =========================================================
  // 2. 數百顆「小小實體」花崗岩山壁堆疊 (InstancedMesh)
  // =========================================================
  const rockGeo = createGraniteGeometry(1, 1, 101, [1.0, 0.86, 0.94]);
  const rockMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    flatShading: true,
    roughness: 0.90,
    metalness: 0.04,
  });

  const rockTransforms = [];
  const rockPalette = ['#b8b3a8', '#98948b', '#7b7870', '#a99e8e', '#65696e', '#c5bfb4', '#868d80'];
  const pushRock = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, colHex = null) => {
    rockTransforms.push({
      pos: [x, y, z],
      scale: [sx, sy, sz],
      rot: [rx, ry, rz],
      color: colHex || rockPalette[Math.floor(rng() * rockPalette.length)],
    });
  };

  // 左右兩翼斜坡大中小花崗岩堆疊（~320 顆）
  for (let side of [-1, 1]) {
    // 7 層階梯由下往上堆疊至山頂涼亭兩側
    for (let tier = 0; tier < 7; tier++) {
      const yBase = 0.35 + tier * 1.18;
      const xMin = 2.45 + (tier > 4 ? (tier - 4) * 0.45 : 0);
      const xMax = 10.6 - tier * 0.85;
      const count = Math.max(4, Math.round((xMax - xMin) * 2.3));
      for (let i = 0; i < count; i++) {
        const u = i / Math.max(1, count - 1);
        const x = side * (xMin + u * (xMax - xMin) + (rng() - 0.5) * 0.45);
        const z = 4.4 - tier * 0.95 + (rng() - 0.5) * 1.15 - u * 0.8;
        const y = yBase + (rng() - 0.5) * 0.32;
        const s = 0.42 + rng() * 0.58 - tier * 0.02;
        pushRock(
          x, y, z,
          s * (0.9 + rng() * 0.55),
          s * (0.7 + rng() * 0.45),
          s * (0.85 + rng() * 0.45),
          (rng() - 0.5) * 0.5, rng() * Math.PI * 2, (rng() - 0.5) * 0.4
        );
      }
    }
    // 池畔前排基座大石塊
    for (let i = 0; i < 14; i++) {
      const x = side * (2.5 + i * 0.62 + (rng() - 0.5) * 0.2);
      const z = 4.75 + (rng() - 0.5) * 0.55;
      const s = 0.45 + rng() * 0.42;
      pushRock(x, 0.35 + rng() * 0.25, z, s * 1.25, s * 0.72, s * 0.95, 0, rng() * 3, 0);
    }
  }

  // 山頂涼亭底座正下方「圓潤巨石冠」（照片中涼亭直接座落於一排圓石上）
  [-1.75, -1.05, -0.35, 0.35, 1.05, 1.75].forEach((bx) => {
    pushRock(bx, 8.65 + (rng() - 0.5) * 0.12, -1.65, 0.52, 0.48, 0.55, 0, rng() * 3, 0, '#b5afa4');
  });

  // 直立花崗岩巨柱（선돌：照片中右側山坡與中層瀑布出水口特別明顯！）
  const monolithGeo = createGraniteGeometry(0.32, 1, 202, [0.85, 2.9, 0.78]);
  const monoliths = [
    // 中層玻璃橋正前方 4 根直立石柱（下層瀑布分流口）
    [-1.65, 2.75, 2.45, 0.65, 0.95, 0.65],
    [-0.55, 2.85, 2.50, 0.58, 1.05, 0.58],
    [0.55, 2.82, 2.48, 0.60, 1.00, 0.60],
    [1.68, 2.72, 2.45, 0.68, 0.92, 0.68],
    // 左側山坡立石
    [-3.1, 6.2, -0.7, 0.72, 1.15, 0.72],
    [-4.8, 3.8, 1.6, 0.78, 1.20, 0.78],
    [-6.6, 1.4, 3.8, 0.85, 1.35, 0.85],
    [-8.4, 1.1, 4.1, 0.75, 1.10, 0.75],
    // 右側山坡大量直立石柱（還原照片二右側立石林立景觀）
    [2.9, 6.5, -0.8, 0.70, 1.25, 0.70],
    [4.2, 6.2, -0.5, 0.80, 1.35, 0.80],
    [5.6, 5.4, 0.3, 0.82, 1.45, 0.82],
    [7.2, 6.0, -0.4, 0.95, 1.55, 0.95],
    [6.1, 3.8, 1.5, 0.75, 1.20, 0.75],
    [4.6, 2.2, 2.9, 0.72, 1.10, 0.72],
    [8.6, 2.0, 3.2, 0.85, 1.30, 0.85],
    [3.2, 1.6, 3.6, 0.68, 1.15, 0.68],
  ];

  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockTransforms.length);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const tmpCol = new THREE.Color();
  rockTransforms.forEach((rt, idx) => {
    dummy.position.set(...rt.pos);
    dummy.scale.set(...rt.scale);
    dummy.rotation.set(...rt.rot);
    dummy.updateMatrix();
    rockInst.setMatrixAt(idx, dummy.matrix);
    rockInst.setColorAt(idx, tmpCol.set(rt.color));
  });
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  root.add(rockInst);

  const monoInst = new THREE.InstancedMesh(monolithGeo, rockMat, monoliths.length);
  monoInst.castShadow = true;
  monoInst.receiveShadow = true;
  monoliths.forEach((m, idx) => {
    dummy.position.set(m[0], m[1], m[2]);
    dummy.scale.set(m[3], m[4], m[5]);
    dummy.rotation.set((rng() - 0.5) * 0.12, rng() * Math.PI, (rng() - 0.5) * 0.12);
    dummy.updateMatrix();
    monoInst.setMatrixAt(idx, dummy.matrix);
    monoInst.setColorAt(idx, tmpCol.set(idx % 2 === 0 ? '#afa99d' : '#969289'));
  });
  monoInst.instanceMatrix.needsUpdate = true;
  if (monoInst.instanceColor) monoInst.instanceColor.needsUpdate = true;
  root.add(monoInst);

  // =========================================================
  // 3. 上層垂直多段瀑布岩壁＋中層翠綠玻璃橋＋下層階梯瀑布＋熊貓石
  // =========================================================
  // 上層濕潤深色岩壁（分三層階梯，以雕琢岩石塊堆疊）
  addMesh(root, createGraniteGeometry(2.3, 1, 301, [1.05, 0.68, 0.52]), cWetRock, 0, 7.2, -1.65);
  addMesh(root, createGraniteGeometry(2.5, 1, 302, [1.08, 0.56, 0.58]), cWetRock, 0, 5.1, -0.80);
  addMesh(root, createGraniteGeometry(2.6, 1, 303, [1.10, 0.48, 0.60]), cWetRock, 0, 3.4, 0.05);
  // 中層瀑布岩壁凸石塊（讓水流分股落下）
  [
    [-1.4, 5.6, 0.20, 0.65], [0.2, 5.4, 0.25, 0.55], [1.3, 5.7, 0.20, 0.62],
    [-0.9, 4.0, 0.75, 0.72], [0.8, 4.1, 0.80, 0.68], [0.0, 3.4, 0.95, 0.55],
  ].forEach(([rx, ry, rz, rs]) => {
    addMesh(root, createGraniteGeometry(rs, 1, Math.round(rx * 100 + ry * 10), [1.1, 0.85, 0.85]), cWetRock, rx, ry, rz);
  });

  // 中層石板通道＋翠綠透明玻璃護欄（照片二橫跨瀑布中段）
  addMesh(root, new THREE.BoxGeometry(7.6, 0.24, 1.15), cBridgeStone, 0.4, 2.55, 1.75);
  addMesh(root, new THREE.BoxGeometry(7.5, 0.52, 0.05), cGlassRail, 0.4, 2.92, 2.28);
  for (let gx = -3.2; gx <= 4.0; gx += 1.2) {
    addMesh(root, new THREE.CylinderGeometry(0.03, 0.03, 0.56, 8), cMetal, gx, 2.94, 2.28);
  }

  // 下層階梯岩盤（以多顆濕潤岩塊堆疊成自然階梯）
  [[-1.6, 1.80, 2.85], [0, 1.85, 2.85], [1.6, 1.80, 2.85]].forEach(([rx, ry, rz], i) => {
    addMesh(root, createGraniteGeometry(0.95, 1, 410 + i, [1.25, 0.52, 0.78]), cWetRock, rx, ry, rz);
  });
  [[-1.8, 1.05, 3.65], [0, 1.10, 3.65], [1.8, 1.05, 3.65]].forEach(([rx, ry, rz], i) => {
    addMesh(root, createGraniteGeometry(1.05, 1, 420 + i, [1.25, 0.48, 0.82]), cWetRock, rx, ry, rz);
  });
  [[-1.9, 0.35, 4.45], [0, 0.38, 4.45], [1.9, 0.35, 4.45]].forEach(([rx, ry, rz], i) => {
    addMesh(root, createGraniteGeometry(1.12, 1, 430 + i, [1.28, 0.42, 0.78]), cWetRock, rx, ry, rz);
  });

  // 下層瀑布中央熊貓雕像小島（還原照片二中央可愛黑白熊貓！）
  const pandaRock = new THREE.Group();
  pandaRock.position.set(0.05, 0.88, 4.18);
  pandaRock.scale.setScalar(1.25);
  root.add(pandaRock);
  addMesh(pandaRock, createGraniteGeometry(0.75, 1, 555, [1.25, 0.75, 1.0]), M('#575856'), 0, -0.15, 0);
  const pWhite = M('#f6f6f4', { roughness: 0.6 });
  const pBlack = M('#1f2024', { roughness: 0.7 });
  addMesh(pandaRock, new THREE.SphereGeometry(0.22, 12, 10), pWhite, 0, 0.35, 0.08).scale.set(1.0, 0.85, 1.25);
  addMesh(pandaRock, new THREE.SphereGeometry(0.16, 12, 10), pWhite, 0, 0.48, 0.28);
  addMesh(pandaRock, new THREE.SphereGeometry(0.06, 8, 8), pBlack, -0.12, 0.60, 0.25);
  addMesh(pandaRock, new THREE.SphereGeometry(0.06, 8, 8), pBlack, 0.12, 0.60, 0.25);
  addMesh(pandaRock, new THREE.SphereGeometry(0.075, 8, 8), pBlack, -0.13, 0.26, 0.24);
  addMesh(pandaRock, new THREE.SphereGeometry(0.075, 8, 8), pBlack, 0.13, 0.26, 0.24);

  // =========================================================
  // 4. 動態瀑布水流、白沫瀑簾、水花飛沫與池面漣漪
  // =========================================================
  const waterMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    roughness: 0.14,
    metalness: 0.08,
    transparent: true,
    opacity: 0.74,
    flatShading: false,
  });
  const foamMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#e0f2fe',
    emissiveIntensity: 0.25,
    roughness: 0.32,
    transparent: true,
    opacity: 0.88,
  });

  const waterSheets = [];
  const foamStreams = [];

  const addCascade = (x, yTop, yBot, zTop, zBot, width) => {
    const dy = yTop - yBot;
    const dz = zBot - zTop;
    const len = Math.hypot(dy, dz);
    const tilt = Math.atan2(dz, dy);
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(width, len, 0.10), waterMat);
    sheet.position.set(x, (yTop + yBot) * 0.5, (zTop + zBot) * 0.5);
    sheet.rotation.x = -tilt;
    root.add(sheet);
    waterSheets.push(sheet);

    const strands = Math.max(3, Math.round(width * 3.5));
    for (let s = 0; s < strands; s++) {
      const sx = x + ((s / (strands - 1 || 1)) - 0.5) * width * 0.88;
      const drop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.052, len * (0.28 + (s % 3) * 0.10), 6),
        foamMat
      );
      drop.rotation.x = -tilt;
      root.add(drop);
      foamStreams.push({
        mesh: drop,
        x: sx,
        yTop,
        yBot,
        zTop,
        zBot,
        phase: rng(),
        speed: 0.85 + rng() * 0.55,
      });
    }
  };

  // 上層寬幅水幕
  addCascade(0, 8.45, 6.25, -0.42, -0.30, 3.90);
  // 中層分股瀑布（3 股交織）
  addCascade(-1.15, 6.30, 4.35, -0.18, 0.70, 1.28);
  addCascade(0.05, 6.30, 4.25, -0.18, 0.78, 1.38);
  addCascade(1.25, 6.30, 4.35, -0.18, 0.70, 1.22);
  // 匯流落入中層池
  addCascade(-0.55, 4.35, 2.75, 0.75, 1.52, 1.68);
  addCascade(0.75, 4.35, 2.75, 0.75, 1.52, 1.68);
  // 下層三階寬瀑布（繞過中央熊貓石左右分流，確保位於岩壁前方）
  addCascade(0.0, 2.55, 1.65, 2.58, 3.45, 4.20);
  addCascade(-1.25, 1.70, 0.85, 3.48, 4.25, 1.85);
  addCascade(1.25, 1.70, 0.85, 3.48, 4.25, 1.88);
  addCascade(-1.35, 0.90, 0.05, 4.28, 5.20, 2.08);
  addCascade(1.35, 0.90, 0.05, 4.28, 5.20, 2.12);

  // 池面白色水花與同心波紋
  const splashes = [];
  for (let i = 0; i < 24; i++) {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.11 + rng() * 0.09, 7, 6), foamMat);
    const sx = (rng() - 0.5) * 4.4;
    const sz = 4.95 + (rng() - 0.5) * 0.45;
    sp.position.set(sx, 0.08, sz);
    root.add(sp);
    splashes.push({ mesh: sp, baseX: sx, baseZ: sz, phase: rng() * Math.PI * 2 });
  }
  const ripples = [];
  for (let i = 0; i < 4; i++) {
    const rp = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.55, 24),
      new THREE.MeshBasicMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.48, side: 2 })
    );
    rp.rotation.x = -Math.PI / 2;
    rp.position.set((i % 2 === 0 ? -1.2 : 1.2), 0.065, 5.15);
    root.add(rp);
    ripples.push({ mesh: rp, phase: i * 0.25 });
  }

  // =========================================================
  // 5. 山頂雙層韓式涼亭（下層白石柱欄杆露台＋上層木構青瓦飛簷）
  // =========================================================
  const pav = new THREE.Group();
  pav.position.set(0, 8.85, -1.65);
  root.add(pav);

  // 下層白色柱基與露台＋精細小欄杆柱
  [[-1.25, -1.05], [1.25, -1.05], [-1.25, 1.05], [1.25, 1.05]].forEach(([px, pz]) => {
    addMesh(pav, new THREE.BoxGeometry(0.24, 1.15, 0.24), cPavWhite, px, 0.58, pz);
  });
  addMesh(pav, new THREE.BoxGeometry(3.2, 0.18, 2.8), cPavWhite, 0, 1.18, 0);
  // 四周白欄杆橫桿＋24 根小立柱
  addMesh(pav, new THREE.BoxGeometry(3.1, 0.08, 0.08), cPavWhite, 0, 1.56, 1.32);
  addMesh(pav, new THREE.BoxGeometry(3.1, 0.08, 0.08), cPavWhite, 0, 1.56, -1.32);
  addMesh(pav, new THREE.BoxGeometry(0.08, 0.08, 2.7), cPavWhite, -1.50, 1.56, 0);
  addMesh(pav, new THREE.BoxGeometry(0.08, 0.08, 2.7), cPavWhite, 1.50, 1.56, 0);
  for (let rx = -1.45; rx <= 1.46; rx += 0.36) {
    addMesh(pav, new THREE.BoxGeometry(0.055, 0.34, 0.055), cPavWhite, rx, 1.38, 1.32);
    addMesh(pav, new THREE.BoxGeometry(0.055, 0.34, 0.055), cPavWhite, rx, 1.38, -1.32);
  }
  for (let rz = -1.0; rz <= 1.01; rz += 0.40) {
    addMesh(pav, new THREE.BoxGeometry(0.055, 0.34, 0.055), cPavWhite, -1.50, 1.38, rz);
    addMesh(pav, new THREE.BoxGeometry(0.055, 0.34, 0.055), cPavWhite, 1.50, 1.38, rz);
  }

  // 上層傳統木柱與青瓦飛簷屋頂
  [[-1.12, -0.92], [1.12, -0.92], [-1.12, 0.92], [1.12, 0.92]].forEach(([px, pz]) => {
    addMesh(pav, new THREE.CylinderGeometry(0.10, 0.11, 1.25, 10), cPavWood, px, 1.88, pz);
  });
  addMesh(pav, new THREE.BoxGeometry(2.6, 0.16, 2.2), cPavWood, 0, 2.48, 0);
  // 雙層青瓦屋頂＋正脊與飛簷翹角
  addMesh(pav, new THREE.ConeGeometry(2.45, 0.95, 4), cPavRoof, 0, 2.98, 0, 0, Math.PI / 4, 0).scale.set(1.12, 1, 0.95);
  addMesh(pav, new THREE.BoxGeometry(1.55, 0.12, 0.14), cPavRidge, 0, 3.42, 0);
  // 四角微微翹起的飛簷端點
  [[-1.65, -1.38], [1.65, -1.38], [-1.65, 1.38], [1.65, 1.38]].forEach(([ex, ez]) => {
    addMesh(pav, new THREE.BoxGeometry(0.32, 0.10, 0.24), cPavRidge, ex, 2.66, ez, 0, Math.atan2(ex, ez), 0.22);
  });

  // =========================================================
  // 6. 松樹林、紅／粉紫杜鵑花叢、右側高聳照明燈柱
  // =========================================================
  const addPine = (x, y, z, scale = 1) => {
    const t = new THREE.Group();
    t.position.set(x, y, z);
    t.scale.setScalar(scale);
    addMesh(t, new THREE.CylinderGeometry(0.08, 0.14, 1.15, 7), cTrunk, 0, 0.55, 0, (rng() - 0.5) * 0.18, 0, (rng() - 0.5) * 0.22);
    const pads = [
      [0, 1.22, 0, 0.72, 0.34, cPine1],
      [-0.36, 1.05, 0.20, 0.52, 0.28, cPine2],
      [0.38, 1.12, -0.14, 0.48, 0.26, cPine1],
      [0.08, 1.48, 0.05, 0.45, 0.25, cPine2],
    ];
    pads.forEach(([px, py, pz, r, sy, mat]) => {
      const m = addMesh(t, new THREE.SphereGeometry(r, 10, 7), mat, px, py, pz);
      m.scale.set(1.25, sy / r, 1.08);
    });
    root.add(t);
  };

  [
    [-8.8, 1.1, 3.8, 1.15], [-6.2, 2.3, 2.5, 1.05], [-4.5, 4.4, 0.6, 0.95],
    [-3.4, 6.8, -0.9, 0.90], [-7.4, 4.2, 0.8, 1.12],
    [3.8, 3.2, 1.8, 1.10], [6.8, 2.4, 2.8, 1.18], [9.2, 1.5, 3.6, 1.22],
    [5.2, 5.8, -0.2, 0.98], [8.0, 5.2, 0.2, 1.10],
    // 涼亭後方高大松樹剪影
    [-2.5, 8.2, -3.2, 1.45], [2.8, 8.1, -3.4, 1.40], [5.8, 7.6, -2.5, 1.55],
  ].forEach((p) => addPine(...p));

  // 數十叢鮮紅與粉紫杜鵑花叢 (InstancedMesh)
  const bushGeo = new THREE.DodecahedronGeometry(0.30, 1);
  const bushMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.78 });
  const azaleaColors = ['#e11d48', '#db2777', '#dc2626', '#f43f5e', '#be185d'];
  const bushes = [];
  for (let i = 0; i < 78; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const tier = Math.floor(rng() * 6);
    const x = side * (2.6 + rng() * (7.2 - tier * 0.65));
    const y = 0.55 + tier * 1.12 + rng() * 0.35;
    const z = 4.65 - tier * 0.88 + (rng() - 0.5) * 0.65;
    bushes.push({
      pos: [x, y, z],
      scale: [0.8 + rng() * 0.7, 0.55 + rng() * 0.35, 0.8 + rng() * 0.6],
      color: azaleaColors[Math.floor(rng() * azaleaColors.length)],
    });
  }
  const bushInst = new THREE.InstancedMesh(bushGeo, bushMat, bushes.length);
  bushInst.castShadow = true;
  bushes.forEach((b, idx) => {
    dummy.position.set(...b.pos);
    dummy.scale.set(...b.scale);
    dummy.rotation.set(0, rng() * 3, 0);
    dummy.updateMatrix();
    bushInst.setMatrixAt(idx, dummy.matrix);
    bushInst.setColorAt(idx, tmpCol.set(b.color));
  });
  bushInst.instanceMatrix.needsUpdate = true;
  if (bushInst.instanceColor) bushInst.instanceColor.needsUpdate = true;
  root.add(bushInst);

  // 右後方高聳照明燈塔柱（照片一與二右上角）
  const pole = new THREE.Group();
  pole.position.set(7.4, 5.2, -1.8);
  root.add(pole);
  addMesh(pole, new THREE.CylinderGeometry(0.06, 0.11, 6.2, 8), cMetal, 0, 3.1, 0);
  addMesh(pole, new THREE.BoxGeometry(0.95, 0.32, 0.22), cMetal, 0, 6.2, 0.08);

  // =========================================================
  // 7. 動畫循環
  // =========================================================
  function update(dt = 0.016, elapsed = 0) {
    waterSheets.forEach((w, idx) => {
      w.material.opacity = 0.70 + Math.sin(elapsed * 5.2 + idx * 0.9) * 0.08;
    });
    foamStreams.forEach((f) => {
      f.phase = (f.phase + dt * f.speed) % 1;
      const p = f.phase;
      f.mesh.position.set(
        f.x + Math.sin(elapsed * 7 + f.x * 2) * 0.025,
        f.yTop + (f.yBot - f.yTop) * p,
        f.zTop + (f.zBot - f.zTop) * p + 0.08
      );
    });
    splashes.forEach((s) => {
      const k = (Math.sin(elapsed * 6.5 + s.phase) + 1) * 0.5;
      s.mesh.position.y = 0.08 + k * 0.20;
      s.mesh.scale.setScalar(0.65 + k * 0.55);
    });
    ripples.forEach((r) => {
      const p = (elapsed * 0.55 + r.phase) % 1;
      const sc = 0.8 + p * 3.8;
      r.mesh.scale.set(sc, sc, 1);
      r.mesh.material.opacity = (1 - p) * 0.45;
    });
  }

  return { group: root, update };
}
