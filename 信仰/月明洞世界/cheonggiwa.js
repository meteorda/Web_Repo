import * as THREE from 'three';

function makeLatticeTexture(cols = 4, rows = 8) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');
  // Warm Hanji paper base
  ctx.fillStyle = '#f8efd8';
  ctx.fillRect(0, 0, 256, 512);
  // Subtle paper fiber gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, 'rgba(255,250,235,0.4)');
  grad.addColorStop(1, 'rgba(220,195,150,0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  // Outer cedar frame
  ctx.strokeStyle = '#8b5a2b';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, 238, 494);

  // Fine lattice grid
  ctx.lineWidth = 6;
  for (let i = 1; i < cols; i++) {
    const x = (i / cols) * 256;
    ctx.beginPath();
    ctx.moveTo(x, 12);
    ctx.lineTo(x, 500);
    ctx.stroke();
  }
  for (let j = 1; j < rows; j++) {
    const y = (j / rows) * 512;
    ctx.beginPath();
    ctx.moveTo(12, y);
    ctx.lineTo(244, y);
    ctx.stroke();
  }
  // Lower kickboard panel
  ctx.fillStyle = '#9c6635';
  ctx.fillRect(14, 390, 228, 108);
  ctx.strokeRect(14, 390, 228, 108);

  const tex = new THREE.Texture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createSculptedStone(seed, sx, sy, sz, colorHex = '#8d8b86') {
  const geo = new THREE.IcosahedronGeometry(0.75, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const n = Math.sin(x * 3.4 + seed) * Math.cos(y * 2.9 + seed * 1.3) * Math.sin(z * 3.1 - seed);
    const d = 1.0 + n * 0.18;
    x *= d * sx;
    y *= d * sy;
    z *= d * sz;
    if (y < -0.35 * sy) y *= 0.8;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9, metalness: 0.04 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createCheonggiwaHouse(options = {}) {
  const { withBase = false } = options;
  const root = new THREE.Group();

  const cGranite = new THREE.MeshStandardMaterial({ color: '#aba79e', roughness: 0.9 });
  const cGraniteDark = new THREE.MeshStandardMaterial({ color: '#78746c', roughness: 0.92 });
  const cWood = new THREE.MeshStandardMaterial({ color: '#8c582b', roughness: 0.78 });
  const cWoodDark = new THREE.MeshStandardMaterial({ color: '#5c381a', roughness: 0.82 });
  const cDeck = new THREE.MeshStandardMaterial({ color: '#b8864d', roughness: 0.75 });
  const cWall = new THREE.MeshStandardMaterial({ color: '#f3ede0', roughness: 0.92 });
  const cTile = new THREE.MeshStandardMaterial({ color: '#0d7a78', roughness: 0.34, metalness: 0.18 });
  const cTileRidge = new THREE.MeshStandardMaterial({ color: '#085e5c', roughness: 0.32, metalness: 0.2 });
  const cWhiteTip = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.65 });

  const add = (parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  if (withBase) {
    // 預覽用草地＋石階平台
    add(root, new THREE.CylinderGeometry(11.5, 12.2, 0.5, 48), new THREE.MeshStandardMaterial({ color: '#648a46', roughness: 0.95 }), 0, -0.25, 0);
  }

  // 1. 花崗岩基壇 (Granite Foundation) + 石階 + 實木地板 (Daecheongmaru)
  const W = 9.4, D = 5.4, H_BASE = 0.62;
  add(root, new THREE.BoxGeometry(W + 0.7, H_BASE, D + 1.0), cGranite, 0, H_BASE / 2, 0.15);
  // 前方石階
  add(root, new THREE.BoxGeometry(2.6, 0.24, 0.75), cGraniteDark, 0, 0.12, D / 2 + 0.85);
  add(root, new THREE.BoxGeometry(2.4, 0.24, 0.45), cGranite, 0, 0.36, D / 2 + 0.65);

  // 走廊木地板（前側與兩側繞廊）
  const Y_DECK = H_BASE + 0.12;
  add(root, new THREE.BoxGeometry(W + 0.3, 0.16, D + 0.5), cDeck, 0, H_BASE + 0.08, 0.1);

  // 2. 韓屋主體白牆＋木樑架構
  const H_WALL = 2.65;
  const WALL_W = W - 1.0;
  const WALL_D = D - 1.1;
  add(root, new THREE.BoxGeometry(WALL_W, H_WALL, WALL_D), cWall, 0, Y_DECK + H_WALL / 2, -0.15);

  // 門窗材質（夜間可透暖光）
  const latticeTex = makeLatticeTexture(4, 8);
  const cWindow = new THREE.MeshStandardMaterial({
    map: latticeTex,
    emissive: '#ffb74d',
    emissiveIntensity: 0.06,
    roughness: 0.6,
  });

  // 正面四組大格子拉門
  [-2.8, -0.95, 0.95, 2.8].forEach((wx) => {
    add(root, new THREE.PlaneGeometry(1.35, 1.95), cWindow, wx, Y_DECK + 1.08, WALL_D / 2 - 0.14);
  });
  // 左右兩側格子窗（如圖二右側雙開格窗）
  const smallWinTex = makeLatticeTexture(4, 5);
  const cSmallWin = new THREE.MeshStandardMaterial({ map: smallWinTex, emissive: '#ffb74d', emissiveIntensity: 0.06, roughness: 0.6 });
  [-1, 1].forEach((side) => {
    const m = add(root, new THREE.PlaneGeometry(1.45, 1.25), cSmallWin, side * (WALL_W / 2 + 0.01), Y_DECK + 1.38, -0.15, 0, side * Math.PI / 2, 0);
  });

  // 走廊圓木柱（前排 6 根＋後排 6 根＋兩側柱）與石柱礎
  const colXs = [-4.4, -2.64, -0.88, 0.88, 2.64, 4.4];
  const colZs = [-2.35, 2.45];
  colXs.forEach((cx) => {
    colZs.forEach((cz) => {
      add(root, new THREE.CylinderGeometry(0.18, 0.21, 0.14, 10), cGraniteDark, cx, Y_DECK + 0.07, cz);
      add(root, new THREE.CylinderGeometry(0.13, 0.14, H_WALL, 12), cWood, cx, Y_DECK + 0.14 + H_WALL / 2, cz);
    });
    // 前後貫通木樑
    add(root, new THREE.BoxGeometry(0.20, 0.22, 5.1), cWoodDark, cx, Y_DECK + H_WALL + 0.05, 0.05);
  });
  // 橫向額枋木樑
  colZs.forEach((cz) => {
    add(root, new THREE.BoxGeometry(9.2, 0.24, 0.22), cWoodDark, 0, Y_DECK + H_WALL + 0.05, cz);
  });

  // 3. 細膩青瓦韓屋飛簷屋頂（下垂弧度＋翹角＋密排木椽＋白頭瓦當＋3D 瓦壟）
  const ROOF_BASE_Y = Y_DECK + H_WALL + 0.18;
  const ROOF_H = 2.45;
  const ROOF_HALF_W = 6.0;
  const ROOF_HALF_D = 3.85;
  const RIDGE_HALF_W = 4.1; // 歇山頂（八作屋頂）山脊寬度

  // 屋頂曲面（前後坡 + 左右坡）
  const nx = 32, nz = 16;
  function buildRoofSlope(sideZ) {
    const geo = new THREE.PlaneGeometry(ROOF_HALF_W * 2, ROOF_HALF_D, nx, nz);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i); // -ROOF_HALF_D/2 .. +ROOF_HALF_D/2
      const tSlope = (vz + ROOF_HALF_D / 2) / ROOF_HALF_D; // 0=屋脊, 1=屋簷 (for sideZ=+1)
      const u = sideZ > 0 ? tSlope : (1 - tSlope); // 0 at ridge, 1 at eave
      // 韓屋經典凹弧屋面 + 兩側飛簷翹角 (귀솟음)
      const sag = Math.pow(u, 1.65);
      const xNorm = Math.abs(vx) / ROOF_HALF_W;
      const cornerLift = Math.pow(Math.max(0, xNorm - 0.55) / 0.45, 2) * 0.48 * u;
      const y = ROOF_H * (1 - sag) + cornerLift;
      // 屋脊兩端略收窄成歇山頂輪廓
      const ridgeNarrow = 1.0 - (1.0 - u) * (1.0 - RIDGE_HALF_W / ROOF_HALF_W);
      pos.setXYZ(i, vx * ridgeNarrow, y, (u * ROOF_HALF_D) * sideZ);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, cTile);
    m.position.y = ROOF_BASE_Y;
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
  buildRoofSlope(1);
  buildRoofSlope(-1);

  // 左右兩側歇山斜坡＋三角山牆 (Gable)
  [-1, 1].forEach((sx) => {
    const gablePts = new Float32Array([
      sx * RIDGE_HALF_W, ROOF_BASE_Y + ROOF_H, 0,
      sx * (ROOF_HALF_W - 0.25), ROOF_BASE_Y + 0.25, -ROOF_HALF_D * 0.86,
      sx * (ROOF_HALF_W - 0.25), ROOF_BASE_Y + 0.25, ROOF_HALF_D * 0.86,
    ]);
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute('position', new THREE.BufferAttribute(gablePts, 3));
    gGeo.computeVertexNormals();
    const gMat = new THREE.MeshStandardMaterial({ color: '#e8e0cf', side: 2, roughness: 0.9 });
    add(root, gGeo, gMat);
  });

  // 3D 立體青瓦壟條 (26 條前後屋瓦溝槽) ＋ 屋簷白色圓形瓦當（막새）＋ 屋簷下方木椽（서까래）
  const RIBS = 25;
  for (let i = 0; i <= RIBS; i++) {
    const rx = -ROOF_HALF_W + 0.35 + (i / RIBS) * (ROOF_HALF_W * 2 - 0.7);
    const xNorm = Math.abs(rx) / ROOF_HALF_W;
    const cornerLift = Math.pow(Math.max(0, xNorm - 0.55) / 0.45, 2) * 0.48;
    const ridgeX = rx * (RIDGE_HALF_W / ROOF_HALF_W);
    [-1, 1].forEach((sz) => {
      const p0 = new THREE.Vector3(ridgeX, ROOF_BASE_Y + ROOF_H + 0.04, 0);
      const p1 = new THREE.Vector3((ridgeX + rx) * 0.5, ROOF_BASE_Y + ROOF_H * 0.42 + cornerLift * 0.4, sz * ROOF_HALF_D * 0.52);
      const p2 = new THREE.Vector3(rx, ROOF_BASE_Y + cornerLift + 0.05, sz * ROOF_HALF_D);
      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      const ribGeo = new THREE.TubeGeometry(curve, 10, 0.055, 6, false);
      add(root, ribGeo, cTile);

      // 屋簷末端的白色瓦當圓點（圖二最顯眼特徵！）
      add(root, new THREE.CylinderGeometry(0.065, 0.065, 0.08, 8), cWhiteTip, rx, ROOF_BASE_Y + cornerLift + 0.02, sz * (ROOF_HALF_D + 0.02), Math.PI / 2, 0, 0);

      // 屋簷下方露出的木椽 (Rafters)
      const rafGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.35, 6);
      add(root, rafGeo, cWoodDark, rx, ROOF_BASE_Y + cornerLift - 0.05, sz * (ROOF_HALF_D - 0.55), sz * 1.18, 0, 0);
    });
  }

  // 主屋脊（용마루）與四條垂脊（내림마루）
  add(root, new THREE.BoxGeometry(RIDGE_HALF_W * 2 + 0.2, 0.24, 0.26), cTileRidge, 0, ROOF_BASE_Y + ROOF_H + 0.12, 0);
  [-1, 1].forEach((sx) => {
    add(root, new THREE.BoxGeometry(0.28, 0.34, 0.34), cWhiteTip, sx * (RIDGE_HALF_W + 0.1), ROOF_BASE_Y + ROOF_H + 0.22, 0);
    [-1, 1].forEach((sz) => {
      const p0 = new THREE.Vector3(sx * RIDGE_HALF_W, ROOF_BASE_Y + ROOF_H + 0.08, 0);
      const p1 = new THREE.Vector3(sx * (ROOF_HALF_W - 0.1), ROOF_BASE_Y + 0.52, sz * ROOF_HALF_D);
      const hipCurve = new THREE.QuadraticBezierCurve3(p0, new THREE.Vector3(sx * (RIDGE_HALF_W + 1.0), ROOF_BASE_Y + ROOF_H * 0.45, sz * ROOF_HALF_D * 0.5), p1);
      add(root, new THREE.TubeGeometry(hipCurve, 10, 0.085, 6, false), cTileRidge);
    });
  });

  // 4. 青瓦屋前方的標誌性「多孔灰岩立石（洞穴石）」
  const holeStone = new THREE.Group();
  holeStone.position.set(-2.9, 0.0, 4.15);
  holeStone.rotation.y = 0.2;
  // 低座石台
  add(holeStone, new THREE.BoxGeometry(1.45, 0.24, 1.05), cGraniteDark, 0, 0.12, 0);
  // 高聳多孔灰岩主體（分塊疊塑出天然孔洞感）
  const hsMain = createSculptedStone(11, 0.92, 2.35, 0.58, '#7b7d80');
  hsMain.position.set(0, 1.75, 0);
  holeStone.add(hsMain);
  // 石面天然孔洞深影
  [[0.18, 2.35, 0.35, 0.22], [-0.16, 1.45, 0.36, 0.26], [0.22, 1.05, 0.34, 0.16]].forEach(([hx, hy, hz, hr]) => {
    add(holeStone, new THREE.SphereGeometry(hr, 10, 8), new THREE.MeshStandardMaterial({ color: '#24272b', roughness: 0.95 }), hx, hy, hz);
  });
  root.add(holeStone);

  // 兩側楓葉／松樹點綴（如圖一左右兩側紅楓與青松）
  const addAccentTree = (tx, tz, leafColor, scale = 1) => {
    const tg = new THREE.Group();
    tg.position.set(tx, 0, tz);
    tg.scale.setScalar(scale);
    add(tg, new THREE.CylinderGeometry(0.11, 0.16, 2.1, 7), cWoodDark, 0, 1.05, 0, 0, 0, tx > 0 ? -0.1 : 0.1);
    const lMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.82 });
    [[0, 2.45, 0, 1.15, 0.72, 1.05], [-0.55, 2.15, 0.25, 0.85, 0.58, 0.8], [0.55, 2.25, -0.2, 0.9, 0.6, 0.85]].forEach(([lx, ly, lz, sx, sy, sz], idx) => {
      const g = new THREE.IcosahedronGeometry(0.75, 1);
      g.scale(sx, sy, sz);
      add(tg, g, lMat, lx, ly, lz, 0, idx * 0.7, 0);
    });
    root.add(tg);
  };
  addAccentTree(5.4, 2.8, '#a8382b', 1.05);   // 右側紅楓
  addAccentTree(-5.5, 2.2, '#437a3a', 1.0);   // 左側青松

  function setNightGlow(intensity) {
    cWindow.emissiveIntensity = 0.06 + intensity * 0.85;
    cSmallWin.emissiveIntensity = 0.06 + intensity * 0.85;
  }

  return { group: root, update() {}, setNightGlow };
}
