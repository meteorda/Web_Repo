// 月明湖八角亭 (Wolmyeong Lake Octagonal Pavilion) 3D 程式化低多邊形模組
import * as THREE from 'three';

/**
 * 建立月明湖八角亭 3D 群組
 * @param {object} opts { withLake: boolean, withFountain: boolean }
 */
export function createOctagonalPavilion(opts = {}) {
  const { withLake = true, withFountain = true } = opts;
  const root = new THREE.Group();

  // 材質庫（低多邊形 flatShading 風格）
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

  const cRock1 = M('#8f8a81', { roughness: 0.92 });
  const cRock2 = M('#736e65', { roughness: 0.94 });
  const cRock3 = M('#a49c8e', { roughness: 0.88 });
  const cStoneArch = M('#cbc5b9', { roughness: 0.82 });
  const cWhitePillar = M('#e8e2d5', { roughness: 0.75 });
  const cWood = M('#8b4522', { roughness: 0.72 });
  const cWoodDark = M('#5e2d14', { roughness: 0.78 });
  const cWoodBeam = M('#a2542b', { roughness: 0.7 });
  const cRoofTeal = M('#167f87', { roughness: 0.42, metalness: 0.15 });
  const cRoofRidge = M('#249aa2', { roughness: 0.38, metalness: 0.18 });
  const cRoofUnder = M('#4a2614', { roughness: 0.8 });
  const cBridgeMetal = M('#cfd6de', { roughness: 0.35, metalness: 0.65 });
  const cBridgeDeck = M('#b5afa6', { roughness: 0.85 });
  const cPineTrunk = M('#5c3d28', { roughness: 0.9 });
  const cPineLeaf1 = M('#3b7336', { roughness: 0.85 });
  const cPineLeaf2 = M('#4d8c44', { roughness: 0.82 });

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
  // 1. 湖面與噴泉（可選）
  // =========================================================
  let waterMesh = null;
  let fountainParticles = [];
  if (withLake) {
    const waterGeo = new THREE.CylinderGeometry(28, 28, 0.4, 48);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#2a6f75',
      roughness: 0.18,
      metalness: 0.25,
      transparent: true,
      opacity: 0.92,
    });
    waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.35;
    waterMesh.receiveShadow = true;
    root.add(waterMesh);

    // 淺水底層（增加湖水深邃層次）
    const bedGeo = new THREE.CylinderGeometry(28, 28, 0.2, 32);
    const bedMat = new THREE.MeshStandardMaterial({ color: '#143338', roughness: 1 });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.y = -0.7;
    root.add(bed);

    if (withFountain) {
      const fGroup = new THREE.Group();
      fGroup.position.set(-7.5, -0.1, -3.5);
      const sprayMat = new THREE.MeshStandardMaterial({
        color: '#e6f7ff',
        transparent: true,
        opacity: 0.78,
        roughness: 0.1,
      });
      for (let i = 0; i < 18; i++) {
        const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.14 + (i % 3) * 0.04, 0), sprayMat);
        drop.userData = {
          angle: (i / 18) * Math.PI * 2,
          phase: (i * 0.37) % 1,
          speed: 0.7 + (i % 4) * 0.12,
          spread: 0.5 + (i % 3) * 0.35,
        };
        fGroup.add(drop);
        fountainParticles.push(drop);
      }
      root.add(fGroup);
    }
  }

  // =========================================================
  // 2. 天然巨石小島基座 + 半圓石拱橋洞（正前方 z+）
  // =========================================================
  const baseGroup = new THREE.Group();
  root.add(baseGroup);

  // 中央平台土石核心（八角形台基）
  addMesh(baseGroup, new THREE.CylinderGeometry(3.2, 3.8, 1.35, 8), cRock2, 0, 0.4, 0, 0, Math.PI / 8);
  // 頂面淺色鋪石地面
  addMesh(baseGroup, new THREE.CylinderGeometry(3.05, 3.1, 0.14, 8), cStoneArch, 0, 1.1, 0, 0, Math.PI / 8);

  // 周圍堆疊天然巨石（避開正前方橋洞區域 angle ~ 0.15*PI ~ -0.15*PI）
  const rockData = [
    [-2.9, 0.25, 1.4, 1.15, 0.85, 0.9, 0.2],
    [-3.3, 0.1, -0.3, 1.3, 0.9, 1.1, -0.3],
    [-2.5, 0.3, -1.9, 1.25, 0.95, 1.0, 0.5],
    [-1.1, 0.2, -3.1, 1.4, 0.85, 1.0, 0.1],
    [0.8, 0.25, -3.2, 1.35, 0.9, 1.1, -0.4],
    [2.4, 0.2, -2.3, 1.2, 0.95, 1.1, 0.6],
    [3.3, 0.15, -0.5, 1.4, 0.88, 1.2, 0.2],
    [3.0, 0.25, 1.3, 1.2, 0.8, 1.0, -0.2],
    [-1.9, 0.15, 2.5, 1.1, 0.85, 0.95, 0.3],
    [2.0, 0.1, 2.4, 1.05, 0.8, 0.95, -0.5],
    // 外圍水面小礁石
    [-4.1, -0.15, 0.9, 0.9, 0.45, 0.8, 0.4],
    [4.0, -0.15, 0.6, 1.0, 0.5, 0.75, -0.3],
    [-3.5, -0.1, -2.5, 0.85, 0.45, 0.8, 0.2],
  ];
  rockData.forEach(([x, y, z, sx, sy, sz, ry], idx) => {
    const geo = new THREE.DodecahedronGeometry(0.75, 0);
    geo.scale(sx, sy, sz);
    addMesh(baseGroup, geo, idx % 3 === 0 ? cRock1 : (idx % 3 === 1 ? cRock2 : cRock3), x, y, z, 0.1 * idx, ry, 0);
  });

  // 正前方石拱橋洞（位於 z = +2.7 處，呈現水道拱門特徵）
  const archGroup = new THREE.Group();
  archGroup.position.set(0, 0, 2.55);
  // 左、右拱腳石塊
  addMesh(archGroup, new THREE.BoxGeometry(0.7, 1.1, 1.2), cStoneArch, -1.0, 0.45, 0);
  addMesh(archGroup, new THREE.BoxGeometry(0.7, 1.1, 1.2), cStoneArch, 1.0, 0.45, 0);
  // 半圓拱頂石環（由多段石塊組成弧形）
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI;
    const ax = Math.cos(a) * 0.78;
    const ay = 0.65 + Math.sin(a) * 0.58;
    addMesh(archGroup, new THREE.BoxGeometry(0.36, 0.28, 1.22), cStoneArch, ax, ay, 0, 0, 0, a - Math.PI / 2);
  }
  // 拱門上方橫樑壓頂石
  addMesh(archGroup, new THREE.BoxGeometry(2.7, 0.22, 1.24), cStoneArch, 0, 1.15, 0);
  // 橋洞內部暗影（水下深孔感）
  addMesh(archGroup, new THREE.BoxGeometry(1.3, 0.9, 0.9), M('#152629'), 0, 0.35, -0.2);
  baseGroup.add(archGroup);

  // =========================================================
  // 3. 下層：8 根白色雕花石柱（八角形配置）
  // =========================================================
  const R_PILLAR = 2.25;
  const Y_STONE_BASE = 1.17;
  const H_STONE = 1.45;
  const octAngles = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + Math.PI / 8);

  octAngles.forEach((a) => {
    const px = Math.cos(a) * R_PILLAR;
    const pz = Math.sin(a) * R_PILLAR;
    // 石柱礎（八角/圓盤底座）
    addMesh(root, new THREE.CylinderGeometry(0.36, 0.42, 0.18, 8), cStoneArch, px, Y_STONE_BASE + 0.09, pz, 0, a, 0);
    // 白色石柱本體
    addMesh(root, new THREE.CylinderGeometry(0.28, 0.30, H_STONE, 10), cWhitePillar, px, Y_STONE_BASE + 0.18 + H_STONE / 2, pz);
    // 柱身浮雕裝飾環（上、中、下雕刻感）
    addMesh(root, new THREE.CylinderGeometry(0.31, 0.31, 0.14, 10), cStoneArch, px, Y_STONE_BASE + 0.45, pz);
    addMesh(root, new THREE.CylinderGeometry(0.32, 0.32, 0.18, 10), cStoneArch, px, Y_STONE_BASE + 1.45, pz);
  });

  // =========================================================
  // 4. 中層：八角木質平台 ＋ 鏤空木欄杆
  // =========================================================
  const Y_DECK = Y_STONE_BASE + 0.18 + H_STONE; // ~2.80
  // 下層托樑與木地板
  addMesh(root, new THREE.CylinderGeometry(2.55, 2.45, 0.24, 8), cWoodDark, 0, Y_DECK + 0.12, 0, 0, Math.PI / 8);
  addMesh(root, new THREE.CylinderGeometry(2.65, 2.65, 0.12, 8), cWood, 0, Y_DECK + 0.28, 0, 0, Math.PI / 8);

  const Y_FLOOR = Y_DECK + 0.34; // ~3.14

  // 8 邊木欄杆（第 1 邊留作連接銀白鐵橋的入口：angle index 1 & 2 之間，約面向 +X/+Z 側）
  const BRIDGE_SIDE_IDX = 1; // 對應圖二/圖四從右側或左側斜接出來的橋
  for (let i = 0; i < 8; i++) {
    if (i === BRIDGE_SIDE_IDX) continue; // 留出上橋入口
    const a0 = octAngles[i];
    const a1 = octAngles[(i + 1) % 8];
    const x0 = Math.cos(a0) * R_PILLAR, z0 = Math.sin(a0) * R_PILLAR;
    const x1 = Math.cos(a1) * R_PILLAR, z1 = Math.sin(a1) * R_PILLAR;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const sideLen = Math.hypot(x1 - x0, z1 - z0);
    const sideRot = -Math.atan2(z1 - z0, x1 - x0);

    const railGroup = new THREE.Group();
    railGroup.position.set(mx, Y_FLOOR, mz);
    railGroup.rotation.y = sideRot;

    // 欄杆上扶手、下橫桿
    addMesh(railGroup, new THREE.BoxGeometry(sideLen, 0.08, 0.09), cWoodBeam, 0, 0.62, 0);
    addMesh(railGroup, new THREE.BoxGeometry(sideLen, 0.07, 0.08), cWoodDark, 0, 0.16, 0);
    // 垂直欄杆小柱 (5根)
    for (let k = -2; k <= 2; k++) {
      addMesh(railGroup, new THREE.BoxGeometry(0.06, 0.56, 0.06), cWood, k * (sideLen / 6), 0.36, 0);
    }
    root.add(railGroup);
  }

  // =========================================================
  // 5. 上層：8 根紅棕色木柱 ＋ 斗拱橫樑
  // =========================================================
  const H_WOOD_PILLAR = 1.95;
  octAngles.forEach((a) => {
    const px = Math.cos(a) * R_PILLAR;
    const pz = Math.sin(a) * R_PILLAR;
    // 紅棕色圓木柱
    addMesh(root, new THREE.CylinderGeometry(0.17, 0.19, H_WOOD_PILLAR, 10), cWood, px, Y_FLOOR + H_WOOD_PILLAR / 2, pz);
    // 柱頂斗拱造型（層疊方木斗拱）
    const topY = Y_FLOOR + H_WOOD_PILLAR;
    addMesh(root, new THREE.BoxGeometry(0.42, 0.14, 0.42), cWoodDark, px, topY + 0.05, pz, 0, -a, 0);
    addMesh(root, new THREE.BoxGeometry(0.58, 0.12, 0.58), cWoodBeam, px, topY + 0.16, pz, 0, -a, 0);
  });

  // 連接 8 根木柱頂端的橫樑環
  const Y_BEAM = Y_FLOOR + H_WOOD_PILLAR;
  for (let i = 0; i < 8; i++) {
    const a0 = octAngles[i], a1 = octAngles[(i + 1) % 8];
    const x0 = Math.cos(a0) * R_PILLAR, z0 = Math.sin(a0) * R_PILLAR;
    const x1 = Math.cos(a1) * R_PILLAR, z1 = Math.sin(a1) * R_PILLAR;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const rot = -Math.atan2(z1 - z0, x1 - x0);
    addMesh(root, new THREE.BoxGeometry(len, 0.22, 0.22), cWoodDark, (x0 + x1) / 2, Y_BEAM + 0.05, (z0 + z1) / 2, 0, rot, 0);
  }

  // =========================================================
  // 6. 青綠／孔雀藍八角飛簷攢尖屋頂 ＋ 瓦壟條 ＋ 寶頂
  // =========================================================
  const Y_EAVE = Y_BEAM + 0.24;
  const roofGroup = new THREE.Group();
  roofGroup.position.y = Y_EAVE;
  root.add(roofGroup);

  // 建立曲面反宇八角屋頂幾何
  function buildCurvedOctagonRoof(rEave, rTop, rise, lift, thick) {
    const n = 8;
    const NU = 6, NV = 7;
    const rot = Math.PI / 8;

    const getPos = (s, u, v, dy = 0) => {
      const a0 = rot + (s / n) * Math.PI * 2;
      const a1 = rot + ((s + 1) / n) * Math.PI * 2;
      const r = rEave + (rTop - rEave) * v;
      const cx = Math.cos(a0) + (Math.cos(a1) - Math.cos(a0)) * u;
      const cz = Math.sin(a0) + (Math.sin(a1) - Math.sin(a0)) * u;
      const corner = Math.pow(Math.abs(2 * u - 1), 3.6);
      const y = rise * Math.pow(v, 1.55) + lift * Math.pow(1 - v, 2.2) * corner + dy;
      return [cx * r, y, cz * r];
    };

    const topPos = [];
    const underPos = [];
    const pushQuad = (arr, p1, p2, p3, p4) => {
      arr.push(...p1, ...p2, ...p3, ...p1, ...p3, ...p4);
    };

    for (let s = 0; s < n; s++) {
      for (let i = 0; i < NU; i++) {
        const u0 = i / NU, u1 = (i + 1) / NU;
        for (let j = 0; j < NV; j++) {
          const v0 = j / NV, v1 = (j + 1) / NV;
          pushQuad(topPos, getPos(s, u0, v0), getPos(s, u1, v0), getPos(s, u1, v1), getPos(s, u0, v1));
          pushQuad(underPos, getPos(s, u0, v1, -thick), getPos(s, u1, v1, -thick), getPos(s, u1, v0, -thick), getPos(s, u0, v0, -thick));
        }
        // 屋簷封邊
        pushQuad(underPos, getPos(s, u0, 0), getPos(s, u1, 0), getPos(s, u1, 0, -thick), getPos(s, u0, 0, -thick));
      }
    }

    const gTop = new THREE.BufferGeometry();
    gTop.setAttribute('position', new THREE.Float32BufferAttribute(topPos, 3));
    gTop.computeVertexNormals();

    const gUnder = new THREE.BufferGeometry();
    gUnder.setAttribute('position', new THREE.Float32BufferAttribute(underPos, 3));
    gUnder.computeVertexNormals();

    const mTop = new THREE.Mesh(gTop, cRoofTeal);
    mTop.castShadow = true; mTop.receiveShadow = true;
    const mUnder = new THREE.Mesh(gUnder, cRoofUnder);
    mUnder.castShadow = true; mUnder.receiveShadow = true;
    roofGroup.add(mTop, mUnder);

    // 8 條立體飛簷屋脊線 + 翹角裝飾（龍頭/脊獸意象）
    for (let s = 0; s < n; s++) {
      const pStart = new THREE.Vector3(...getPos(s, 0, 0, 0.06));
      const pMid = new THREE.Vector3(...getPos(s, 0, 0.5, 0.08));
      const pEnd = new THREE.Vector3(...getPos(s, 0, 1, 0.08));

      const curve = new THREE.CatmullRomCurve3([pStart, pMid, pEnd]);
      const ridgeGeo = new THREE.TubeGeometry(curve, 12, 0.075, 6, false);
      const ridge = new THREE.Mesh(ridgeGeo, cRoofRidge);
      ridge.castShadow = true;
      roofGroup.add(ridge);

      // 屋角翹起小脊獸
      addMesh(roofGroup, new THREE.ConeGeometry(0.1, 0.22, 5), cRoofRidge, pStart.x * 1.01, pStart.y + 0.1, pStart.z * 1.01);
    }

    // 屋簷下方放射狀椽木（增加細節真實感）
    for (let s = 0; s < n; s++) {
      const a0 = rot + (s / n) * Math.PI * 2;
      const a1 = rot + ((s + 1) / n) * Math.PI * 2;
      for (let k = 1; k <= 5; k++) {
        const u = k / 6;
        const pOut = new THREE.Vector3(...getPos(s, u, 0.03, -0.09));
        const pIn = new THREE.Vector3(...getPos(s, u, 0.45, -0.14));
        const len = pOut.distanceTo(pIn);
        const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), cWoodBeam);
        rafter.position.copy(pOut).lerp(pIn, 0.5);
        rafter.lookAt(pOut);
        roofGroup.add(rafter);
      }
    }
  }

  const ROOF_RISE = 1.95;
  buildCurvedOctagonRoof(3.55, 0.12, ROOF_RISE, 0.35, 0.09);

  // 屋頂正中央「三層青綠寶頂」
  addMesh(roofGroup, new THREE.CylinderGeometry(0.28, 0.36, 0.16, 8), cRoofRidge, 0, ROOF_RISE + 0.06, 0);
  addMesh(roofGroup, new THREE.SphereGeometry(0.22, 8, 6), cRoofRidge, 0, ROOF_RISE + 0.24, 0);
  addMesh(roofGroup, new THREE.SphereGeometry(0.16, 8, 6), cRoofRidge, 0, ROOF_RISE + 0.44, 0);
  addMesh(roofGroup, new THREE.ConeGeometry(0.12, 0.32, 8), cRoofRidge, 0, ROOF_RISE + 0.68, 0);

  // =========================================================
  // 7. 銀白色拱形桁架鐵橋（連接八角亭出口與岸邊）
  // =========================================================
  const aBridge0 = octAngles[BRIDGE_SIDE_IDX];
  const aBridge1 = octAngles[(BRIDGE_SIDE_IDX + 1) % 8];
  const bridgeMidAngle = (aBridge0 + aBridge1) / 2;

  const bridgeGroup = new THREE.Group();
  bridgeGroup.rotation.y = -bridgeMidAngle;
  root.add(bridgeGroup);

  const BRIDGE_START_X = R_PILLAR * Math.cos(Math.PI / 8) - 0.1; // 緊貼平台邊緣
  const BRIDGE_LEN = 11.5;
  const BRIDGE_W = 1.25;
  const SEGMENTS = 14;

  for (let i = 0; i < SEGMENTS; i++) {
    const t0 = i / SEGMENTS;
    const t1 = (i + 1) / SEGMENTS;
    const x0 = BRIDGE_START_X + t0 * BRIDGE_LEN;
    const x1 = BRIDGE_START_X + t1 * BRIDGE_LEN;
    // 先從 Y_FLOOR (3.14) 微微往上拱起 (+0.45)，再優雅弧線往下接到岸邊 (0.65)
    const getBridgeY = (t) => {
      const base = Y_FLOOR * (1 - t * t) + 0.65 * (t * t);
      const hump = Math.sin(t * Math.PI) * 0.85;
      return base + hump;
    };
    const y0 = getBridgeY(t0);
    const y1 = getBridgeY(t1);
    const segLen = Math.hypot(x1 - x0, y1 - y0);
    const pitch = Math.atan2(y1 - y0, x1 - x0);
    const xm = (x0 + x1) / 2;
    const ym = (y0 + y1) / 2;

    // 橋面板
    addMesh(bridgeGroup, new THREE.BoxGeometry(segLen + 0.05, 0.12, BRIDGE_W), cBridgeDeck, xm, ym, 0, 0, 0, pitch);

    // 兩側銀白色桁架欄杆 (上扶手 + 垂直柱 + X型斜撐)
    [-BRIDGE_W / 2 + 0.05, BRIDGE_W / 2 - 0.05].forEach((zSide) => {
      addMesh(bridgeGroup, new THREE.BoxGeometry(segLen + 0.04, 0.07, 0.06), cBridgeMetal, xm, ym + 0.72, zSide, 0, 0, pitch);
      addMesh(bridgeGroup, new THREE.BoxGeometry(0.06, 0.74, 0.06), cBridgeMetal, x0, y0 + 0.37, zSide);
      // 斜撐
      const diagLen = Math.hypot(segLen, 0.68);
      const diagAngle = Math.atan2(0.68, segLen);
      addMesh(bridgeGroup, new THREE.BoxGeometry(diagLen, 0.045, 0.045), cBridgeMetal, xm, ym + 0.37, zSide, 0, 0, diagAngle + pitch);
      addMesh(bridgeGroup, new THREE.BoxGeometry(diagLen, 0.045, 0.045), cBridgeMetal, xm, ym + 0.37, zSide, 0, 0, -diagAngle + pitch);
    });
  }
  // 最後一根終點欄杆柱
  addMesh(bridgeGroup, new THREE.BoxGeometry(0.08, 0.78, 0.08), cBridgeMetal, BRIDGE_START_X + BRIDGE_LEN, 0.65 + 0.37, -BRIDGE_W / 2 + 0.05);
  addMesh(bridgeGroup, new THREE.BoxGeometry(0.08, 0.78, 0.08), cBridgeMetal, BRIDGE_START_X + BRIDGE_LEN, 0.65 + 0.37, BRIDGE_W / 2 - 0.05);

  // =========================================================
  // 8. 造景松樹（岩石小島左右兩側標誌性蒼勁松樹）
  // =========================================================
  function addPineTree(x, y, z, scale = 1, lean = 0.2) {
    const pg = new THREE.Group();
    pg.position.set(x, y, z);
    pg.scale.setScalar(scale);

    // 彎曲主幹
    addMesh(pg, new THREE.CylinderGeometry(0.09, 0.15, 1.1, 6), cPineTrunk, 0, 0.5, 0, 0, 0, lean);
    addMesh(pg, new THREE.CylinderGeometry(0.07, 0.1, 0.9, 6), cPineTrunk, -Math.sin(lean) * 0.45, 1.15, 0, 0, 0, -lean * 0.7);

    // 扁平分層松針葉團
    const pads = [
      [-0.4, 1.35, 0.2, 1.1, 0.38, 0.9],
      [0.35, 1.65, -0.15, 1.25, 0.42, 1.05],
      [-0.1, 1.95, 0.05, 0.95, 0.35, 0.85],
    ];
    pads.forEach(([px, py, pz, sx, sy, sz], idx) => {
      const geo = new THREE.IcosahedronGeometry(0.65, 0);
      geo.scale(sx, sy, sz);
      addMesh(pg, geo, idx % 2 === 0 ? cPineLeaf1 : cPineLeaf2, px, py, pz, 0, idx, 0);
    });
    root.add(pg);
  }

  addPineTree(-2.7, 0.75, 1.5, 1.05, 0.25);
  addPineTree(2.8, 0.75, -1.7, 1.15, -0.2);
  addPineTree(-2.3, 0.65, -2.2, 0.85, 0.15);

  // =========================================================
  // 9. 夜間氣氛燈（點亮屋簷下方與鐵橋溫暖發光燈籠）
  // =========================================================
  // 屋簷下小燈籠（發光球；因 three-lite 未包含 PointLight，改以自發光燈籠＋環境補光呈現）
  const lanternMat = new THREE.MeshStandardMaterial({
    color: '#ffe0a3',
    emissive: '#ffaa33',
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  const lanternBulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lanternMat);
  lanternBulb.position.set(0, Y_BEAM - 0.18, 0);
  root.add(lanternBulb);

  // 動畫更新函數
  function update(dt, elapsed) {
    // 噴泉水花動畫
    fountainParticles.forEach((drop) => {
      const u = drop.userData;
      const t = (elapsed * u.speed + u.phase) % 1;
      const h = 3.2 * t * (1 - t) * 4;
      const r = u.spread * t;
      drop.position.set(Math.cos(u.angle) * r, h, Math.sin(u.angle) * r);
      drop.scale.setScalar(1 - t * 0.6);
    });

    // 湖水微微起伏
    if (waterMesh) {
      waterMesh.position.y = -0.35 + Math.sin(elapsed * 1.4) * 0.025;
    }
  }

  function setNightGlow(intensity) {
    lanternMat.emissiveIntensity = intensity * 2.2;
  }

  return { group: root, update, setNightGlow };
}
