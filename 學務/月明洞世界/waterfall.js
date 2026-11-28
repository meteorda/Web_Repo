// 聖靈瀑布 (Holy Spirit Waterfall & Rock Garden) 3D 程式化低多邊形模組
import * as THREE from 'three';

/**
 * 建立聖靈瀑布 3D 群組
 * @param {object} opts { withPlaza: boolean }
 */
export function createHolySpiritWaterfall(opts = {}) {
  const { withPlaza = true } = opts;
  const root = new THREE.Group();

  const matCache = new Map();
  const M = (hex, extra = {}) => {
    const key = hex + JSON.stringify(extra);
    if (!matCache.has(key)) {
      matCache.set(key, new THREE.MeshStandardMaterial({
        color: hex,
        flatShading: true,
        roughness: extra.roughness ?? 0.85,
        metalness: extra.metalness ?? 0.04,
        ...extra,
      }));
    }
    return matCache.get(key);
  };

  const cRockLight = M('#b8b2a6', { roughness: 0.9 });
  const cRockMid = M('#8f8a80', { roughness: 0.92 });
  const cRockDark = M('#5a5751', { roughness: 0.94 });
  const cWetRock = M('#2d3133', { roughness: 0.55, metalness: 0.1 }); // 瀑布濕潤深岩
  const cRimStone = M('#7c8287', { roughness: 0.8 });
  const cPlaza = M('#d99b66', { roughness: 0.88 }); // 圖3前方暖橘沙色廣場
  const cTrunk = M('#5c3d28', { roughness: 0.9 });
  const cPine1 = M('#3f7a38', { roughness: 0.84 });
  const cPine2 = M('#549448', { roughness: 0.82 });
  const cPavWood = M('#9c522b', { roughness: 0.72 });
  const cPavRoof = M('#454c54', { roughness: 0.6 });
  const cWhiteStatue = M('#edeae2', { roughness: 0.7 });

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
  // 1. 前方廣場地坪 & 投出綠光的中央水池
  // =========================================================
  if (withPlaza) {
    // 基底山坡與廣場
    addMesh(root, new THREE.CylinderGeometry(18, 20, 0.8, 36), M('#847f75'), 0, -0.45, -1);
    // 前方橘褐色廣場扇形地面
    addMesh(root, new THREE.CylinderGeometry(11.5, 11.5, 0.14, 28, 1, false, -Math.PI * 0.48, Math.PI * 0.96), cPlaza, 0, 0.02, 2.2, 0, Math.PI, 0);
  }

  // 投出綠光的水池（狹長橢圓形，前圓弧、後接瀑布）
  const poolGroup = new THREE.Group();
  poolGroup.position.set(0, 0.05, 3.2);
  root.add(poolGroup);

  // 灰色石砌池緣（外框）
  const rimGeo = new THREE.CylinderGeometry(2.65, 2.75, 0.34, 24);
  rimGeo.scale(1.0, 1.0, 1.85);
  addMesh(poolGroup, rimGeo, cRimStone, 0, 0.1, 0);

  // 池內發光翡翠綠水面
  const poolWaterMat = new THREE.MeshStandardMaterial({
    color: '#22c59e',
    emissive: '#0ea57a',
    emissiveIntensity: 0.38,
    roughness: 0.14,
    metalness: 0.2,
    transparent: true,
    opacity: 0.92,
  });
  const waterGeo = new THREE.CylinderGeometry(2.35, 2.35, 0.28, 24);
  waterGeo.scale(1.0, 1.0, 1.82);
  const poolWater = new THREE.Mesh(waterGeo, poolWaterMat);
  poolWater.position.y = 0.15;
  poolWater.receiveShadow = true;
  poolGroup.add(poolWater);

  // 池邊小裝飾（圖1右側小熊貓、圖3池畔白色小天鵝/雕像）
  const pandaG = new THREE.Group();
  pandaG.position.set(3.2, 1.15, 1.2);
  addMesh(pandaG, new THREE.SphereGeometry(0.28, 8, 6), cWhiteStatue, 0, 0.2, 0);
  addMesh(pandaG, new THREE.SphereGeometry(0.2, 8, 6), cWhiteStatue, -0.22, 0.35, 0.08);
  addMesh(pandaG, new THREE.BoxGeometry(0.22, 0.18, 0.42), M('#222222'), 0.05, 0.22, 0);
  addMesh(pandaG, new THREE.SphereGeometry(0.07, 6, 5), M('#222222'), -0.28, 0.5, 0.18);
  addMesh(pandaG, new THREE.SphereGeometry(0.07, 6, 5), M('#222222'), -0.28, 0.5, -0.02);
  root.add(pandaG);

  // =========================================================
  // 2. 中央人造瀑布岩壁 + 動態流水條 + 飛濺水花
  // =========================================================
  const wfGroup = new THREE.Group();
  wfGroup.position.set(0, 0, -1.6);
  root.add(wfGroup);

  // 瀑布背後階梯狀濕潤深岩（3 層階梯跌水結構）
  addMesh(wfGroup, new THREE.BoxGeometry(4.2, 1.7, 2.2), cWetRock, 0, 0.85, 0.2);
  addMesh(wfGroup, new THREE.BoxGeometry(3.6, 1.9, 2.2), cWetRock, 0, 2.4, -0.8);
  addMesh(wfGroup, new THREE.BoxGeometry(3.0, 1.8, 2.0), cWetRock, 0, 4.0, -1.7);

  // 瀑布岩石凹凸塊
  [
    [-1.1, 1.1, 1.1, 0.9, 0.9, 0.7],
    [1.1, 1.0, 1.1, 0.95, 0.85, 0.75],
    [-0.8, 2.7, 0.2, 0.8, 0.9, 0.7],
    [0.9, 2.8, 0.15, 0.85, 0.8, 0.7],
    [0, 1.6, 0.9, 0.75, 0.55, 0.6],
  ].forEach(([x, y, z, sx, sy, sz], i) => {
    const g = new THREE.DodecahedronGeometry(0.6, 0);
    g.scale(sx, sy, sz);
    addMesh(wfGroup, g, cWetRock, x, y, z, i, i * 0.7, 0);
  });

  // 動態流動的白色水幕與水條
  const waterStreamMat = new THREE.MeshStandardMaterial({
    color: '#e6fbff',
    emissive: '#67e8f9',
    emissiveIntensity: 0.3,
    roughness: 0.12,
    metalness: 0.08,
    transparent: true,
    opacity: 0.84,
    vertexColors: true,
  });

  const streamDrops = [];
  const makeCascade = (x, yTop, yBot, zTop, zBot, width, count) => {
    const dy = yTop - yBot;
    const dz = zBot - zTop;
    const len = Math.hypot(dy, dz);
    const tilt = Math.atan2(dz, dy);

    // 曲面細分水幕（帶頂點漸層浪花色與弧形瀑面）
    const sheetGeo = new THREE.PlaneGeometry(width, len, 10, 14);
    const pos = sheetGeo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const vNorm = (py + len * 0.5) / len;
      const bulge = Math.sin(vNorm * Math.PI) * 0.18 + Math.sin(px * 5.2 + vNorm * 7.0) * 0.04;
      pos.setZ(i, bulge);
      const foam = 0.52 + 0.48 * Math.pow(Math.cos(vNorm * Math.PI), 2);
      cols[i * 3] = 0.45 + foam * 0.52;
      cols[i * 3 + 1] = 0.84 + foam * 0.15;
      cols[i * 3 + 2] = 0.92 + foam * 0.08;
    }
    sheetGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    sheetGeo.computeVertexNormals();
    const sheet = new THREE.Mesh(sheetGeo, waterStreamMat);
    sheet.position.set(x, (yTop + yBot) / 2, (zTop + zBot) / 2);
    sheet.rotation.x = tilt;
    wfGroup.add(sheet);

    // 流動白色水條與飛沫（沿水幕加速傾瀉）
    const dropMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#a5f3fc',
      emissiveIntensity: 0.35,
      roughness: 0.15,
      transparent: true,
      opacity: 0.88,
    });
    for (let i = 0; i < count; i++) {
      const dropGeo = new THREE.SphereGeometry(0.16, 6, 5);
      dropGeo.scale(1.05, 2.8, 0.75);
      const drop = new THREE.Mesh(dropGeo, dropMat);
      drop.userData = {
        x: x + ((i / Math.max(1, count - 1)) - 0.5) * width * 0.78 + (Math.random() - 0.5) * 0.12,
        yTop, yBot, zTop, zBot,
        phase: (i / count + Math.random() * 0.25) % 1,
        speed: 0.9 + Math.random() * 0.45,
        tilt,
      };
      wfGroup.add(drop);
      streamDrops.push(drop);
    }
  };

  const H_SCALE = 1.25; // 瀑布與山體垂直拉高 1.25 倍（樹與涼亭不拉伸、僅配合抬高位置）
  wfGroup.scale.y = H_SCALE;

  // 三段式瀑布水流（加倍密度的飛沫條）
  makeCascade(0, 4.9, 3.3, -1.3, -0.5, 1.25, 12);
  makeCascade(-0.35, 3.35, 1.7, -0.45, 0.65, 1.4, 12);
  makeCascade(0.4, 3.3, 1.7, -0.45, 0.65, 1.05, 10);
  makeCascade(0, 1.75, 0.25, 0.7, 1.35, 2.3, 16);

  // 瀑布入水口白色泡沫浪花 ＋ 水霧雲團 ＋ 擴散水波紋
  const splashParticles = [];
  const splashMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#a7f3d0',
    emissiveIntensity: 0.4,
    roughness: 0.2,
    transparent: true,
    opacity: 0.82,
  });
  for (let i = 0; i < 28; i++) {
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), splashMat);
    sp.userData = {
      x: (Math.random() - 0.5) * 2.5,
      z: 1.45 + (Math.random() - 0.5) * 0.5,
      phase: Math.random(),
      speed: 1.15 + Math.random() * 0.85,
    };
    wfGroup.add(sp);
    splashParticles.push(sp);
  }

  // 瀑布階梯水霧團
  const mistPuffs = [];
  const mistMat = new THREE.MeshBasicMaterial({
    color: '#e0f7fa',
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  [[0, 0.45, 1.55], [-0.35, 1.85, 0.6], [0.2, 3.35, -0.45]].forEach(([mx, my, mz], idx) => {
    for (let k = 0; k < 3; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), mistMat);
      puff.userData = { bx: mx + (k - 1) * 0.55, by: my, bz: mz, phase: idx * 0.3 + k * 0.25 };
      wfGroup.add(puff);
      mistPuffs.push(puff);
    }
  });

  // 池面擴散水波紋環
  const rippleRings = [];
  const rippleMat = new THREE.MeshBasicMaterial({
    color: '#b2f5ea',
    transparent: true,
    opacity: 0.45,
    side: 2,
    depthWrite: false,
  });
  for (let r = 0; r < 3; r++) {
    const ringGeo = new THREE.RingGeometry(0.4, 0.52, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, rippleMat.clone());
    ring.position.set(0, 0.31, -1.2);
    ring.userData = { phase: r / 3 };
    poolGroup.add(ring);
    rippleRings.push(ring);
  }

  // =========================================================
  // 3. 三面環繞「寫實風化花崗岩巨石」造景（左、後、右三側）
  // =========================================================
  const naturalRockMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.04,
  });

  function createSculptedRockGeo(seed, sx, sy, sz) {
    const geo = new THREE.IcosahedronGeometry(0.76, 2);
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i);
      let vy = pos.getY(i);
      let vz = pos.getZ(i);
      // 多頻率天然岩層凹凸噪點（取代粗糙十二面體）
      const n1 = Math.sin(vx * 3.1 + seed) * Math.cos(vy * 2.7 + seed * 1.3) * Math.sin(vz * 3.3 - seed * 0.7);
      const n2 = Math.cos(vx * 6.4 - seed * 2.1) * Math.sin(vz * 5.8 + vy * 4.2);
      const disp = 1.0 + n1 * 0.22 + n2 * 0.09;
      vx *= disp * sx;
      vy *= disp * sy;
      vz *= disp * sz;
      // 岩塊底部略微收平穩重
      if (vy < -0.35 * sy) vy *= 0.82;
      pos.setXYZ(i, vx, vy, vz);

      // 頂點自然著色：上方帶微苔蘚綠、中段暖灰岩、底部濕潤深岩
      const hNorm = Math.min(1, Math.max(0, (vy / Math.max(0.1, sy) + 0.8) / 1.6));
      const moss = Math.max(0, hNorm - 0.68) * 1.4;
      const shade = 0.72 + n1 * 0.16 + hNorm * 0.22;
      cols[i * 3] = Math.min(1, (0.38 * shade) * (1 - moss * 0.45) + 0.22 * moss);
      cols[i * 3 + 1] = Math.min(1, (0.37 * shade) * (1 - moss * 0.2) + 0.44 * moss);
      cols[i * 3 + 2] = Math.min(1, (0.34 * shade) * (1 - moss * 0.5) + 0.18 * moss);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    return geo;
  }

  let rockSeedCounter = 1;
  function addBoulder(x, y, z, sx, sy, sz, _mat, rx = 0, ry = 0, rz = 0) {
    const geo = createSculptedRockGeo(rockSeedCounter++ * 1.73, sx, sy * H_SCALE, sz);
    return addMesh(root, geo, naturalRockMat, x, y * H_SCALE, z, rx, ry, rz);
  }

  // 輔助：在指定位置堆疊 2~4 層交錯巨石
  function addBoulderStack(x, baseY, z, tiers, baseScale = 1.0, seed = 1) {
    const mats = [cRockLight, cRockMid, cRockDark];
    let curY = baseY;
    for (let t = 0; t < tiers; t++) {
      const shrink = 1 - t * 0.14;
      const sx = (1.1 + ((seed + t * 3) % 4) * 0.18) * baseScale * shrink;
      const sy = (0.72 + ((seed + t * 5) % 3) * 0.14) * baseScale * shrink;
      const sz = (1.0 + ((seed + t * 7) % 4) * 0.16) * baseScale * shrink;
      const ox = (((seed * 7 + t * 11) % 5) - 2) * 0.14;
      const oz = (((seed * 13 + t * 5) % 5) - 2) * 0.14;
      const ry = (seed + t) * 0.9;
      const rx = (((seed + t) % 3) - 1) * 0.16;
      const rz = (((seed * 2 + t) % 3) - 1) * 0.15;
      addBoulder(x + ox, curY + sy * 0.45, z + oz, sx, sy, sz, mats[(seed + t) % 3], rx, ry, rz);
      curY += sy * 0.95;
    }
  }

  // 左側三層交錯巨石堆疊（從水池前端延伸至瀑布左後方，各方位高度均勻飽滿）
  const leftStacks = [
    [-3.5, 0.0, 4.6, 2, 1.05, 1],
    [-4.1, 0.0, 3.0, 3, 1.15, 2],
    [-3.7, 0.0, 1.2, 3, 1.15, 3],
    [-5.1, 0.2, 1.8, 3, 1.25, 4],
    [-3.4, 0.1, -0.6, 4, 1.15, 5],
    [-4.9, 0.3, -1.2, 4, 1.25, 6],
    [-3.0, 0.5, -2.5, 4, 1.2, 7],
    [-4.7, 0.5, -3.2, 4, 1.3, 8],
    [-6.3, 0.1, -0.2, 3, 1.3, 9],
    [-5.8, 0.0, 3.6, 2, 1.1, 10],
  ];
  leftStacks.forEach((s) => addBoulderStack(...s));

  // 右側三層交錯巨石堆疊（高度與左側呼應，包圍水池右側與瀑布右翼）
  const rightStacks = [
    [3.6, 0.0, 4.7, 2, 1.1, 11],
    [4.2, 0.0, 3.0, 3, 1.15, 12],
    [3.7, 0.0, 1.2, 3, 1.15, 13],
    [5.2, 0.2, 1.9, 3, 1.25, 14],
    [3.4, 0.1, -0.6, 4, 1.15, 15],
    [4.9, 0.3, -1.3, 4, 1.25, 16],
    [3.0, 0.5, -2.5, 4, 1.2, 17],
    [4.8, 0.5, -3.2, 4, 1.3, 18],
    [6.4, 0.1, -0.1, 3, 1.3, 19],
    [5.7, 0.0, 3.8, 2, 1.1, 20],
  ];
  rightStacks.forEach((s) => addBoulderStack(...s));

  // 後方寬闊疊石山壁（加高至 5~6 層巨石山體，與瀑布頂端齊高並托住後山松林與涼亭）
  addBoulder(0, 2.2, -5.8, 11.5, 3.6, 3.4, cRockDark, 0, 0, 0); // 紮實後山岩體核心
  const backStacks = [
    [-6.6, 0.8, -4.0, 5, 1.4, 21],
    [-4.3, 1.2, -4.6, 5, 1.4, 22],
    [-2.1, 1.5, -4.8, 5, 1.35, 23],
    [0.0, 1.8, -5.0, 5, 1.4, 24],
    [2.1, 1.5, -4.8, 5, 1.35, 25],
    [4.4, 1.2, -4.6, 5, 1.4, 26],
    [6.6, 0.8, -4.0, 5, 1.4, 27],
  ];
  backStacks.forEach((s) => addBoulderStack(...s));

  // 小熊貓下方專屬綠色平台石塊（對齊右側堆石平台）
  addBoulder(3.2, 0.88, 1.2, 0.9, 0.45, 0.8, cRockMid, 0, 0.3, 0);
  addMesh(root, new THREE.CylinderGeometry(0.55, 0.55, 0.06, 10), M('#229954'), 3.2, 1.14 * H_SCALE, 1.2);

  // =========================================================
  // 4. 蒼勁斜幹松樹（樹幹紮實生根於巨石縫隙間，無懸空）
  // =========================================================
  function addPineTree(x, y, z, scale = 1, leanZ = 0.35, leanX = 0) {
    const pg = new THREE.Group();
    pg.position.set(x, y, z);
    pg.scale.setScalar(scale);

    addMesh(pg, new THREE.CylinderGeometry(0.11, 0.18, 1.9, 6), cTrunk, 0, 0.75, 0, leanX, 0, leanZ);
    const midX = -Math.sin(leanZ) * 1.45;
    const midY = Math.cos(leanZ) * 1.45;
    addMesh(pg, new THREE.CylinderGeometry(0.08, 0.11, 1.3, 6), cTrunk, midX - Math.sin(leanZ * 0.8) * 0.45, midY + 0.35, 0, leanX * 0.5, 0, leanZ * 0.85);

    const tipX = midX - Math.sin(leanZ * 0.8) * 0.9;
    const tipY = midY + 0.8;
    const pads = [
      [tipX, tipY, 0, 1.45, 0.42, 1.2],
      [tipX - Math.sign(leanZ) * 0.7, tipY + 0.35, 0.25, 1.2, 0.38, 1.0],
      [midX, midY + 0.25, -0.25, 1.15, 0.35, 0.95],
    ];
    pads.forEach(([px, py, pz, sx, sy, sz], idx) => {
      const geo = new THREE.IcosahedronGeometry(0.75, 0);
      geo.scale(sx, sy, sz);
      addMesh(pg, geo, idx % 2 === 0 ? cPine1 : cPine2, px, py, pz, 0, idx * 0.8, 0);
    });
    root.add(pg);
  }

  // 左右側大松樹紮根於兩翼堆石中（維持原樹比例，僅隨山高抬升 Y 座標）
  addPineTree(-4.2, 1.8 * H_SCALE, 1.3, 1.15, -0.48, 0.05);
  addPineTree(4.4, 2.0 * H_SCALE, 1.1, 1.18, 0.45, 0.05);
  // 後山高處松林（下移並嵌入後方巨石山體頂部，確保完全不懸空）
  addPineTree(-4.5, 4.3 * H_SCALE, -4.7, 1.0, -0.1, 0);
  addPineTree(-0.5, 4.7 * H_SCALE, -5.2, 1.1, 0.08, 0);
  addPineTree(3.2, 4.4 * H_SCALE, -4.9, 0.95, -0.12, 0);

  // =========================================================
  // 5. 右後方高處石基上的小涼亭（大幅抬高至 y=8.35，清楚露出不被後方巨石遮擋）
  // =========================================================
  const highPav = new THREE.Group();
  highPav.position.set(5.6, 8.35, -4.6);
  // 垂直石柱台基（向下延伸嵌入山石）
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    addMesh(highPav, new THREE.CylinderGeometry(0.22, 0.28, 3.2, 6), cRockDark, Math.cos(a) * 0.75, -1.55, Math.sin(a) * 0.75);
  }
  // 涼亭白色小圍欄平台
  addMesh(highPav, new THREE.CylinderGeometry(1.1, 1.05, 0.22, 6), cWhiteStatue, 0, 0.1, 0);
  addMesh(highPav, new THREE.CylinderGeometry(1.05, 1.05, 0.4, 6, 1, true), cWhiteStatue, 0, 0.4, 0);
  // 木柱與六角小頂
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    addMesh(highPav, new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), cPavWood, Math.cos(a) * 0.82, 0.8, Math.sin(a) * 0.82);
  }
  addMesh(highPav, new THREE.ConeGeometry(1.45, 0.75, 6), cPavRoof, 0, 1.65, 0);
  root.add(highPav);

  // =========================================================
  // 6. 夜間水底發光與瀑布動畫控制
  // =========================================================
  // 夜晚照亮瀑布與水池上方石壁的青綠色補光
  const poolGlowLight = new THREE.DirectionalLight('#10b981', 0);
  poolGlowLight.position.set(0, -4, 8);
  root.add(poolGlowLight);

  function setNightGlow(intensity) {
    // 夜晚時，中央水池投出更耀眼的夢幻翡翠綠光！
    poolWaterMat.emissiveIntensity = 0.35 + intensity * 1.45;
    waterStreamMat.emissiveIntensity = 0.25 + intensity * 0.75;
    splashMat.emissiveIntensity = 0.35 + intensity * 0.85;
    poolGlowLight.intensity = intensity * 1.6;
  }

  function update(dt, elapsed) {
    const tSec = elapsed !== undefined ? elapsed : dt;
    // 1. 瀑布水流飛沫沿弧形水幕前方往下傾瀉動畫
    streamDrops.forEach((drop) => {
      const u = drop.userData;
      const t = (tSec * u.speed + u.phase) % 1;
      const bulge = Math.sin((1 - t) * Math.PI) * 0.22 + 0.12;
      drop.position.set(
        u.x,
        u.yTop + (u.yBot - u.yTop) * t,
        u.zTop + (u.zBot - u.zTop) * t + bulge
      );
      drop.rotation.x = u.tilt;
      drop.scale.setScalar(0.85 + Math.sin(t * Math.PI) * 0.45);
    });

    // 2. 入水處白色水花跳動
    splashParticles.forEach((sp) => {
      const u = sp.userData;
      const t = (tSec * u.speed + u.phase) % 1;
      const jump = 4 * t * (1 - t) * 0.65;
      sp.position.set(u.x, 0.34 + jump, u.z + t * 0.45);
      sp.scale.setScalar((1 - t * 0.55) * 1.25);
    });

    // 3. 池水微幅呼吸波動 ＋ 水霧飄浮 ＋ 擴散水波紋
    poolWater.position.y = 0.15 + Math.sin(tSec * 1.8) * 0.015;

    mistPuffs.forEach((puff) => {
      const u = puff.userData;
      const mt = (tSec * 0.35 + u.phase) % 1;
      puff.position.set(u.bx + Math.sin(tSec + u.phase) * 0.18, u.by + mt * 0.65, u.bz + mt * 0.28);
      puff.scale.setScalar(0.7 + mt * 0.9);
    });

    rippleRings.forEach((ring) => {
      const rt = (tSec * 0.55 + ring.userData.phase) % 1;
      ring.scale.setScalar(0.5 + rt * 3.4);
      ring.material.opacity = (1 - rt) * 0.45;
    });
  }

  return { group: root, update, setNightGlow };
}
