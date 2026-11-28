// 316 空提紀念館 (316 Memorial Hall) 3D 程式化低多邊形模組
import * as THREE from 'three';

/**
 * 建立 316 空提紀念館 3D 群組
 * @param {object} opts { withLake: boolean }
 */
export function createHall316(opts = {}) {
  const { withLake = true } = opts;
  const root = new THREE.Group();

  const matCache = new Map();
  const M = (hex, extra = {}) => {
    const key = hex + JSON.stringify(extra);
    if (!matCache.has(key)) {
      matCache.set(key, new THREE.MeshStandardMaterial({
        color: hex,
        flatShading: true,
        roughness: extra.roughness ?? 0.78,
        metalness: extra.metalness ?? 0.05,
        ...extra,
      }));
    }
    return matCache.get(key);
  };

  // 材質定義（支援白天 / 雪景切換）
  const cStoneWhite = M('#ece8df', { roughness: 0.78 });
  const cStoneWarm = M('#dfd9cc', { roughness: 0.82 });
  const cStoneBase = M('#cbc4b6', { roughness: 0.86 });
  const cPillar = M('#f4f1ea', { roughness: 0.7 });
  const cTealEave = M('#1b8e85', { roughness: 0.42, metalness: 0.16 });
  const cTealUnder = M('#8ec2be', { roughness: 0.65 });
  const cGlass = M('#477c78', { roughness: 0.22, metalness: 0.45 });
  const cGlassFrame = M('#29383a', { roughness: 0.4, metalness: 0.5 });
  const cDarkInterior = M('#182428', { roughness: 0.9 });
  const cRock = M('#8a857c', { roughness: 0.92 });
  const cPineTrunk = M('#5c3d28', { roughness: 0.9 });
  const cPineLeaf = M('#3b7336', { roughness: 0.85 });

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
  // 1. 湖面與岸邊奇石造景（對應圖 1、圖 2、圖 7）
  // =========================================================
  let waterMesh = null;
  if (withLake) {
    const waterGeo = new THREE.CylinderGeometry(30, 30, 0.3, 48);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#28646e',
      roughness: 0.16,
      metalness: 0.3,
      transparent: true,
      opacity: 0.92,
    });
    waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.35;
    waterMesh.receiveShadow = true;
    root.add(waterMesh);
  }

  // 湖岸護堤與造景巨石
  addMesh(root, new THREE.BoxGeometry(20, 0.9, 13), cStoneBase, 0, 0.2, -1.5);
  // 湖岸邊立石造景（圖 2、圖 7 的岸邊石頭群）
  const shoreRocks = [
    [-7.5, 0.4, 4.8, 0.9, 1.3, 0.8],
    [-5.8, 0.3, 5.1, 1.2, 0.9, 0.9],
    [-3.6, 0.25, 5.2, 1.0, 0.8, 0.8],
    [-1.4, 0.35, 5.1, 1.1, 1.1, 0.7],
    [1.8, 0.3, 5.2, 1.2, 0.9, 0.8],
    [4.4, 0.4, 5.0, 1.0, 1.4, 0.9],
    [6.6, 0.85, 4.9, 0.85, 2.2, 0.8], // 圖 7 右側高聳直立奇石
    [8.2, 0.35, 4.7, 1.1, 1.0, 0.9],
  ];
  shoreRocks.forEach(([x, y, z, sx, sy, sz], i) => {
    const g = new THREE.DodecahedronGeometry(0.65, 0);
    g.scale(sx, sy, sz);
    addMesh(root, g, cRock, x, y, z, 0, i * 0.6, 0);
  });

  // =========================================================
  // 2. 下層開放式露台層（1F 挑高迴廊 ＋ 左側階梯 ＋ 右側觀景露台）
  // =========================================================
  const Y_TERRACE_TOP = 1.85;
  // 1F 主基座內牆
  addMesh(root, new THREE.BoxGeometry(14.5, 1.3, 7.2), cDarkInterior, 0, 1.15, -1.6);
  // 1F 外圍支撐方柱
  [-6.8, -3.5, 0, 3.5, 6.8].forEach((px) => {
    addMesh(root, new THREE.BoxGeometry(0.45, 1.3, 0.45), cStoneWhite, px, 1.15, 2.4);
  });
  // 右側向外突出觀景露台（圖 2、圖 5、圖 7 右側露台）
  addMesh(root, new THREE.BoxGeometry(7.2, 0.28, 3.8), cStoneWhite, 3.6, Y_TERRACE_TOP, 2.5);
  addMesh(root, new THREE.BoxGeometry(7.2, 0.24, 0.08), cStoneWarm, 3.6, Y_TERRACE_TOP + 0.26, 4.35);
  // 右側露台前排支撐小柱
  [0.5, 3.6, 6.8].forEach((px) => {
    addMesh(root, new THREE.CylinderGeometry(0.18, 0.18, 1.25, 8), cStoneWarm, px, 1.15, 4.1);
  });

  // 左側大階梯（從岸邊斜上二樓大平台，對應圖 2、圖 7 左側大階梯）
  for (let s = 0; s < 8; s++) {
    const sy = 0.65 + s * 0.16;
    const sz = 4.2 - s * 0.3;
    addMesh(root, new THREE.BoxGeometry(3.6, 0.18, 0.38), cStoneWhite, -5.2, sy, sz);
  }

  // 主二樓大平台（弧形前緣）
  addMesh(root, new THREE.BoxGeometry(15.6, 0.28, 8.2), cStoneWhite, 0, Y_TERRACE_TOP, -1.2);

  // =========================================================
  // 3. 標誌性弧形正面：10 根高聳白色圓柱 ＋ 微斜玻璃帷幕
  // =========================================================
  const Y_COL_BASE = Y_TERRACE_TOP + 0.14; // 1.99
  const H_COL = 4.35;
  const ARC_RADIUS = 26; // 大半徑圓弧，產生柔和優雅的正面外凸弧線
  const ARC_CENTER_Z = -ARC_RADIUS + 2.55; // 當 x=0 時，z = 2.55

  const arcZ = (x, offset = 0) => {
    const r = ARC_RADIUS + offset;
    return ARC_CENTER_Z + Math.sqrt(Math.max(0, r * r - x * x));
  };

  // 正面 10 根白色大圓柱（均勻沿弧線排列）
  const colXs = [-6.9, -5.36, -3.83, -2.3, -0.76, 0.76, 2.3, 3.83, 5.36, 6.9];
  const makeColumn = (x, z) => {
    // 方形柱礎
    addMesh(root, new THREE.BoxGeometry(0.68, 0.22, 0.68), cStoneWarm, x, Y_COL_BASE + 0.11, z);
    // 圓柱底座環
    addMesh(root, new THREE.CylinderGeometry(0.28, 0.32, 0.12, 12), cPillar, x, Y_COL_BASE + 0.26, z);
    // 圓柱身
    addMesh(root, new THREE.CylinderGeometry(0.23, 0.26, H_COL - 0.5, 12), cPillar, x, Y_COL_BASE + 0.32 + (H_COL - 0.5) / 2, z);
    // 古典柱頭
    addMesh(root, new THREE.CylinderGeometry(0.32, 0.23, 0.18, 12), cPillar, x, Y_COL_BASE + H_COL - 0.1, z);
    addMesh(root, new THREE.BoxGeometry(0.66, 0.14, 0.66), cStoneWhite, x, Y_COL_BASE + H_COL + 0.04, z);
  };

  colXs.forEach((x) => makeColumn(x, arcZ(x, 0)));

  // 左右兩側延伸圓柱（各 2 根）
  [-7.0, 7.0].forEach((x) => {
    makeColumn(x, -0.1);
    makeColumn(x, -2.5);
  });

  // 主體建築背牆與兩側石牆（帶窗戶）
  addMesh(root, new THREE.BoxGeometry(13.6, H_COL, 6.2), cStoneWarm, 0, Y_COL_BASE + H_COL / 2, -2.2);

  // 正面弧形青綠色玻璃帷幕（分段建立弧形玻璃＋窗框）
  const GLASS_SEGS = 9;
  for (let i = 0; i < GLASS_SEGS; i++) {
    const x0 = colXs[i], x1 = colXs[i + 1];
    const xm = (x0 + x1) / 2;
    const z0 = arcZ(x0, -0.75), z1 = arcZ(x1, -0.75);
    const zm = (z0 + z1) / 2;
    const segW = Math.hypot(x1 - x0, z1 - z0);
    const rotY = -Math.atan2(z1 - z0, x1 - x0);

    // 玻璃片（微向內傾斜 rx = -0.045）
    addMesh(root, new THREE.BoxGeometry(segW + 0.04, H_COL - 0.2, 0.12), cGlass, xm, Y_COL_BASE + H_COL / 2 - 0.05, zm, -0.045, rotY, 0);
    // 水平窗框條（分 3 層樓面感）
    [1.4, 2.8, 4.1].forEach((hy) => {
      addMesh(root, new THREE.BoxGeometry(segW + 0.06, 0.08, 0.18), cGlassFrame, xm, Y_COL_BASE + hy, zm + (hy - 2.1) * 0.045, 0, rotY, 0);
    });
  }

  // 正面偏左側挑高主入口門廊框（位於第 2~3 根柱子後方，對應圖 4、圖 6）
  const gateX = -3.06;
  const gateZ = arcZ(gateX, -0.62);
  addMesh(root, new THREE.BoxGeometry(1.7, 3.0, 0.35), cStoneWhite, gateX, Y_COL_BASE + 1.5, gateZ);
  addMesh(root, new THREE.BoxGeometry(1.3, 2.65, 0.4), cDarkInterior, gateX, Y_COL_BASE + 1.32, gateZ + 0.02);

  // =========================================================
  // 4. 標誌性「青綠色／孔雀藍」弧形大幅出挑屋簷
  // =========================================================
  const Y_EAVE = Y_COL_BASE + H_COL + 0.25; // ~6.59
  const EAVE_SEGS = 12;
  const eaveXs = Array.from({ length: EAVE_SEGS + 1 }, (_, i) => -7.7 + (i / EAVE_SEGS) * 15.4);

  for (let i = 0; i < EAVE_SEGS; i++) {
    const x0 = eaveXs[i], x1 = eaveXs[i + 1];
    const xm = (x0 + x1) / 2;
    const zFront0 = arcZ(x0, 0.85), zFront1 = arcZ(x1, 0.85);
    const zMid = ((zFront0 + zFront1) / 2 + -5.6) / 2;
    const depth = Math.abs((zFront0 + zFront1) / 2 - (-5.6));
    const segW = Math.hypot(x1 - x0, zFront1 - zFront0);
    const rotY = -Math.atan2(zFront1 - zFront0, x1 - x0);

    // 青綠色屋簷正面立面壓條（最有辨識度的顏色帶）
    addMesh(root, new THREE.BoxGeometry(segW + 0.08, 0.56, 0.32), cTealEave, xm, Y_EAVE + 0.1, (zFront0 + zFront1) / 2, 0, rotY, 0);
    // 屋簷頂板與淺色底板
    addMesh(root, new THREE.BoxGeometry(segW + 0.1, 0.28, depth), cTealEave, xm, Y_EAVE + 0.24, zMid, 0, rotY, 0);
    addMesh(root, new THREE.BoxGeometry(segW + 0.06, 0.12, depth - 0.1), cTealUnder, xm, Y_EAVE - 0.05, zMid, 0, rotY, 0);
  }
  // 左右兩側屋簷封邊
  addMesh(root, new THREE.BoxGeometry(0.32, 0.56, 9.2), cTealEave, -7.7, Y_EAVE + 0.1, -1.1);
  addMesh(root, new THREE.BoxGeometry(0.32, 0.56, 9.2), cTealEave, 7.7, Y_EAVE + 0.1, -1.1);

  // =========================================================
  // 5. 上方內縮白色三樓 ＋ 左側塔樓 ＋ 頂樓空中列柱廊架
  // =========================================================
  const Y_TOP_FLOOR = Y_EAVE + 0.38; // ~6.97
  const H_TOP = 1.45;
  // 白色三樓主體
  addMesh(root, new THREE.BoxGeometry(13.0, H_TOP, 5.4), cStoneWhite, 0, Y_TOP_FLOOR + H_TOP / 2, -2.0);
  // 三樓正面整齊一排方形小窗（11 扇）
  for (let w = -5; w <= 5; w++) {
    addMesh(root, new THREE.BoxGeometry(0.45, 0.5, 0.1), cGlassFrame, w * 1.05, Y_TOP_FLOOR + 0.78, 0.72);
  }
  // 三樓左側高起樓梯/電梯塔樓（圖 3、圖 5、圖 8 左上方特徵）
  addMesh(root, new THREE.BoxGeometry(2.5, 2.55, 3.2), cStoneWhite, -5.25, Y_TOP_FLOOR + 1.27, -2.6);
  // 塔樓半圓拱窗（圖 3、圖 5 左側半圓窗）
  addMesh(root, new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12, 1, false, 0, Math.PI), cGlassFrame, -6.52, Y_TOP_FLOOR + 0.55, -2.4, 0, 0, Math.PI / 2);

  // 頂樓空中列柱遮陽廊架（Rooftop Pergola）
  const Y_PERGOLA = Y_TOP_FLOOR + H_TOP;
  for (let p = -3; p <= 4; p++) {
    const px = p * 1.25 + 0.3;
    addMesh(root, new THREE.CylinderGeometry(0.08, 0.08, 1.05, 8), cPillar, px, Y_PERGOLA + 0.52, 0.25);
    addMesh(root, new THREE.CylinderGeometry(0.08, 0.08, 1.05, 8), cPillar, px, Y_PERGOLA + 0.52, -3.8);
  }
  // 廊架頂部遮陽水平橫樑與頂棚
  addMesh(root, new THREE.BoxGeometry(9.6, 0.12, 4.4), cStoneWhite, 0.9, Y_PERGOLA + 1.08, -1.78);

  // =========================================================
  // 6. 周邊造景松樹（圖 2、圖 6、圖 7 右前側標誌性大松樹）
  // =========================================================
  const pineMeshes = [];
  function addPineTree(x, y, z, scale = 1, lean = 0.2) {
    const pg = new THREE.Group();
    pg.position.set(x, y, z);
    pg.scale.setScalar(scale);

    addMesh(pg, new THREE.CylinderGeometry(0.1, 0.17, 1.2, 6), cPineTrunk, 0, 0.55, 0, 0, 0, lean);
    addMesh(pg, new THREE.CylinderGeometry(0.08, 0.11, 1.0, 6), cPineTrunk, -Math.sin(lean) * 0.5, 1.25, 0, 0, 0, -lean * 0.7);

    const pads = [
      [-0.45, 1.45, 0.2, 1.2, 0.38, 0.95],
      [0.4, 1.75, -0.15, 1.35, 0.42, 1.1],
      [-0.1, 2.05, 0.05, 1.0, 0.35, 0.85],
    ];
    pads.forEach(([px, py, pz, sx, sy, sz], idx) => {
      const geo = new THREE.IcosahedronGeometry(0.68, 0);
      geo.scale(sx, sy, sz);
      const leaf = addMesh(pg, geo, cPineLeaf, px, py, pz, 0, idx, 0);
      pineMeshes.push(leaf);
    });
    root.add(pg);
  }

  addPineTree(7.2, 1.9, 2.9, 1.1, -0.25);
  addPineTree(-2.2, 0.7, 4.4, 0.85, 0.15);
  addPineTree(1.2, 0.7, 4.5, 0.78, -0.15);

  // =========================================================
  // 7. 夜間／雪景狀態控制（含建築正下方流動漸層向上打光）
  // =========================================================
  const uplightBeams = []; // { mat, fixMat, phase }

  const uplightGroup = new THREE.Group();
  // 正面 10 根白色大圓柱底座投射燈（每根帶微幅相位差，形成空間橫向漸層流動）
  colXs.forEach((x, idx) => {
    const z = arcZ(x, 0.35);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#3b82f6',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const fixMat = new THREE.MeshStandardMaterial({
      color: '#222831',
      emissive: '#3b82f6',
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    addMesh(uplightGroup, new THREE.BoxGeometry(0.28, 0.08, 0.28), fixMat, x, Y_COL_BASE + 0.04, z);

    // 雙層光束（內層較亮核心 + 外層柔和光暈，營造垂直漸層感）
    const innerGeo = new THREE.ConeGeometry(0.45, 4.1, 10, 1, true);
    innerGeo.rotateX(Math.PI);
    const innerBeam = new THREE.Mesh(innerGeo, beamMat);
    innerBeam.position.set(x, Y_COL_BASE + 2.1, z - 0.15);

    const outerGeo = new THREE.ConeGeometry(0.85, 4.35, 10, 1, true);
    outerGeo.rotateX(Math.PI);
    const outerBeam = new THREE.Mesh(outerGeo, beamMat);
    outerBeam.position.set(x, Y_COL_BASE + 2.22, z - 0.15);

    uplightGroup.add(innerBeam, outerBeam);
    uplightBeams.push({ mat: beamMat, fixMat, phase: idx * 0.12 });
  });

  // 下層露台前方向上打光燈
  [-5.0, -2.5, 0, 2.5, 5.0].forEach((x, idx) => {
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#3b82f6',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const beamGeo = new THREE.ConeGeometry(0.85, 2.2, 10, 1, true);
    beamGeo.rotateX(Math.PI);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(x, 1.35, 2.75);
    uplightGroup.add(beam);
    uplightBeams.push({ mat: beamMat, fixMat: null, phase: idx * 0.22 });
  });
  root.add(uplightGroup);

  // 由下往上照的彩色 DirectionalLight
  const upLight = new THREE.DirectionalLight('#3b82f6', 0);
  upLight.position.set(0, -8, 12);
  root.add(upLight);

  const UPLIGHT_COLORS = [
    new THREE.Color('#3b82f6'), // 寶石藍
    new THREE.Color('#06b6d4'), // 湖水青
    new THREE.Color('#10b981'), // 翡翠綠
    new THREE.Color('#f59e0b'), // 金黃琥珀
    new THREE.Color('#ec4899'), // 玫瑰粉
    new THREE.Color('#a855f7'), // 紫羅蘭
  ];
  let nightIntensity = 0;

  function setNightGlow(intensity) {
    nightIntensity = intensity;
    cGlass.emissive.set('#ffd27d');
    cGlass.emissiveIntensity = intensity * 0.5;
    uplightBeams.forEach((b) => {
      b.mat.opacity = intensity * 0.16;
      if (b.fixMat) b.fixMat.emissiveIntensity = intensity * 2.0;
    });
    upLight.intensity = intensity * 1.9;
    if (intensity === 0) {
      cPillar.emissive.set('#000000');
      cPillar.emissiveIntensity = 0;
      cTealUnder.emissive.set('#000000');
      cTealUnder.emissiveIntensity = 0;
    }
  }

  function setSnowMode(isSnow) {
    if (isSnow) {
      cTealEave.color.set('#3ea89f');
      cPineLeaf.color.set('#e8f2f5');
      cStoneBase.color.set('#eef3f7');
    } else {
      cTealEave.color.set('#1b8e85');
      cPineLeaf.color.set('#3b7336');
      cStoneBase.color.set('#cbc4b6');
    }
  }

  const tmpColor = new THREE.Color();
  const sampleGradient = (t, target) => {
    const len = UPLIGHT_COLORS.length;
    const pos = ((t % len) + len) % len;
    const idx0 = Math.floor(pos);
    const idx1 = (idx0 + 1) % len;
    const frac = pos - idx0;
    // 連續余弦平滑插值（漸進無斷層）
    const smooth = 0.5 - 0.5 * Math.cos(Math.PI * frac);
    return target.copy(UPLIGHT_COLORS[idx0]).lerp(UPLIGHT_COLORS[idx1], smooth);
  };

  function update(dt, elapsed) {
    if (waterMesh) {
      waterMesh.position.y = -0.35 + Math.sin(elapsed * 1.2) * 0.02;
    }
    if (nightIntensity > 0.05) {
      const baseCycle = elapsed / 3.2; // 每 ~3.2 秒漸進過渡到下一個色系
      uplightBeams.forEach((b) => {
        sampleGradient(baseCycle + b.phase, tmpColor);
        b.mat.color.copy(tmpColor);
        if (b.fixMat) b.fixMat.emissive.copy(tmpColor);
      });
      // 中央主光束同步漸進染色白柱與屋簷底面
      sampleGradient(baseCycle + 0.5, tmpColor);
      upLight.color.copy(tmpColor);
      cPillar.emissive.copy(tmpColor);
      cPillar.emissiveIntensity = nightIntensity * 0.24;
      cTealUnder.emissive.copy(tmpColor);
      cTealUnder.emissiveIntensity = nightIntensity * 0.26;
    }
  }

  return { group: root, update, setNightGlow, setSnowMode };
}
