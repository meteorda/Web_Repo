// 禱告山 (Prayer Mountain / 기도산) — 巨型烏石＋凱旋門三石＋純白中央階梯＋兩側立石
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

function createStoneGeo(radius, detail, seed, scale = [1, 1, 1], amp = 0.22) {
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
    pos.setXYZ(i, x * n * scale[0], y * n * scale[1], z * n * scale[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createPrayerMountain(options = {}) {
  const { withBase = true } = options;
  const root = new THREE.Group();
  const rng = mulberry32(20261128);

  const cWhite = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.60 });
  const cWhiteTrim = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.68 });
  const cBlackMonolith = new THREE.MeshStandardMaterial({ color: '#5a626b', roughness: 0.78, flatShading: true });
  const cArchStone = new THREE.MeshStandardMaterial({ color: '#aba396', roughness: 0.86, flatShading: true });
  const cArchCap = new THREE.MeshStandardMaterial({ color: '#8f877a', roughness: 0.88, flatShading: true });
  const cPineBark = new THREE.MeshStandardMaterial({ color: '#9c5233', roughness: 0.88 });
  const cTrunk = new THREE.MeshStandardMaterial({ color: '#5c3c26', roughness: 0.90 });
  const cPine = new THREE.MeshStandardMaterial({ color: '#336e34', roughness: 0.84, flatShading: true });
  const cGreenMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.88 });

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
    add(root, new THREE.CylinderGeometry(14.5, 15.2, 0.5, 48), new THREE.MeshStandardMaterial({ color: '#cfa97a', roughness: 0.94 }), 0, -0.25, 0.5);
  }

  const H_SCALE = 1.65; // 禱告山垂直拉高 1.65 倍呈現雄偉峭壁氣勢（松樹維持原比例僅配合抬高）

  // ── 1. 後方山體核心（退至 z=-4.2 後方，絕不遮擋純白階梯、凱旋門三石與立石群）──
  add(root, createStoneGeo(6.8, 2, 11, [1.48, 0.72 * H_SCALE, 0.42], 0.16), new THREE.MeshStandardMaterial({ color: '#5c6648', roughness: 0.94, flatShading: true }), 0, 2.2 * H_SCALE, -4.2);

  // ── 2. 中央純白色長階梯（18 級直達山頂＋純白兩側護欄）──
  const stairGroup = new THREE.Group();
  stairGroup.position.set(0.8, 0, 0.6);
  stairGroup.scale.y = H_SCALE;
  root.add(stairGroup);
  add(stairGroup, new THREE.BoxGeometry(2.3, 0.08, 0.8), cGreenMat, 0, 0.04, 3.6);
  for (let s = 0; s < 18; s++) {
    const sy = 0.14 + s * 0.255;
    const sz = 3.2 - s * 0.30;
    add(stairGroup, new THREE.BoxGeometry(2.05, 0.26, 0.36), cWhite, 0, sy, sz);
  }
  // 兩側純白階梯護牆（精準沿階梯斜率 +0.705 貼合）
  [-1.08, 1.08].forEach((sx) => {
    add(stairGroup, new THREE.BoxGeometry(0.16, 0.42, 6.9), cWhiteTrim, sx, 2.55, 0.65, 0.705, 0, 0);
  });

  // ── 3. 左側前方「幾層樓高寬厚圓潤烏石」（保留雄偉高度，同時具備寬度方向的飽滿圓潤與鈍圓肩頂）──
  const wooseokGeo = createStoneGeo(1.45, 2, 77, [1.14, 2.08, 0.62], 0.14);
  {
    const wp = wooseokGeo.attributes.position;
    for (let i = 0; i < wp.count; i++) {
      let vx = wp.getX(i);
      let vy = wp.getY(i);
      let vz = wp.getZ(i);
      const yn = (vy + 3.0) / 6.0; // 約 0(底) ~ 1(頂)
      // 下寬上微收、寬度方向圓潤飽滿，頂部做鈍圓平肩（右側略斜）
      const widthTapering = 1.18 - 0.32 * Math.pow(Math.max(0, yn), 1.65);
      vx *= widthTapering;
      if (yn > 0.72) {
        const capT = (yn - 0.72) / 0.28;
        // 修掉最頂端尖角，平滑收成圓弧鈍頂（右側微斜）
        vy -= (capT * capT) * 0.72 + (vx > 0 ? capT * 0.14 : 0);
      }
      if (vz > 0) vz *= 0.82;
      wp.setXYZ(i, vx, vy * H_SCALE, vz);
    }
    wooseokGeo.computeVertexNormals();
  }
  add(root, wooseokGeo, cBlackMonolith, -5.05, 2.58 * H_SCALE, 2.58, -0.05, 0.14, -0.07);

  // ── 4. 烏石上方「凱旋門形狀三顆石頭」（兩根直立石柱＋上方橫跨大蓋石，清楚露於烏石頂端之上）──
  const arch = new THREE.Group();
  arch.position.set(-4.55, 3.65 * H_SCALE, -0.35);
  arch.scale.y = H_SCALE;
  arch.rotation.y = 0.16;
  root.add(arch);
  add(arch, createStoneGeo(0.55, 1, 81, [0.85, 1.85, 0.80], 0.18), cArchStone, -0.85, 0.95, 0);
  add(arch, createStoneGeo(0.58, 1, 82, [0.90, 1.85, 0.85], 0.18), cArchStone, 0.85, 0.95, 0);
  add(arch, createStoneGeo(1.15, 1, 83, [1.85, 0.56, 0.95], 0.18), cArchCap, 0.05, 2.15, 0, 0, 0, -0.04);

  // ── 5. 中央純白階梯兩側「直立高大花崗岩立石」──
  const cTan = new THREE.MeshStandardMaterial({ color: '#c4ab89', roughness: 0.86, flatShading: true });
  const cLightGrey = new THREE.MeshStandardMaterial({ color: '#e2e6eb', roughness: 0.78, flatShading: true });
  const cDarkGrey = new THREE.MeshStandardMaterial({ color: '#787d82', roughness: 0.86, flatShading: true });

  const sideMonoliths = [
    // 階梯左側立石
    [-0.65, 1.85, 1.55, 0.58, 1.85, 0.55, cLightGrey],
    [-0.95, 3.20, 0.45, 0.52, 1.65, 0.50, cTan],
    [-2.45, 3.65, -0.55, 0.62, 1.95, 0.58, cTan],
    [-3.15, 1.85, 1.35, 0.65, 1.70, 0.62, cDarkGrey],
    // 階梯右側立石（含白色波浪型高石）
    [2.35, 1.75, 1.65, 0.68, 1.80, 0.62, cTan],
    [2.25, 3.45, 0.15, 0.58, 1.75, 0.55, cTan],
    [3.35, 4.35, -0.85, 0.56, 1.95, 0.52, cLightGrey],
    [2.75, 4.55, -1.35, 0.54, 1.80, 0.52, cTan],
    [4.65, 3.05, 0.65, 0.78, 1.75, 0.68, cDarkGrey],
    [5.85, 2.35, 1.45, 0.65, 1.55, 0.60, cTan],
  ];
  sideMonoliths.forEach(([mx, my, mz, sx, sy, sz, mat], idx) => {
    add(root, createStoneGeo(0.72, 1, 200 + idx, [sx, sy * H_SCALE, sz], 0.22), mat, mx, my * H_SCALE, mz, 0, idx * 0.6, 0);
  });

  // ── 6. 坡面堆疊花崗岩塊 (InstancedMesh) ──
  const rockGeo = createStoneGeo(0.75, 1, 300, [1.15, 0.82, 0.95], 0.24);
  const rockMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, flatShading: true });
  const rockList = [];
  const rCols = ['#a8a296', '#8d877c', '#bfa88a', '#74787d', '#c7c1b6'];
  for (let tier = 0; tier < 5; tier++) {
    const y = (0.45 + tier * 0.92) * H_SCALE;
    const z = 3.2 - tier * 1.1;
    for (let i = 0; i < 24; i++) {
      const x = -8.5 + (i / 23) * 17.0 + (rng() - 0.5) * 0.4;
      if (x > -0.7 && x < 2.3) continue; // 讓出中央純白階梯
      const sc = 0.65 + rng() * 0.55;
      rockList.push({
        pos: [x, y + (rng() - 0.5) * 0.2, z + (rng() - 0.5) * 0.5],
        scale: [sc * (0.9 + rng() * 0.4), sc * 0.78 * H_SCALE, sc * 0.88],
        rot: [rng() * 0.3, rng() * Math.PI * 2, rng() * 0.3],
        color: rCols[Math.floor(rng() * rCols.length)],
      });
    }
  }
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockList.length);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const tmpCol = new THREE.Color();
  rockList.forEach((rk, i) => {
    dummy.position.set(...rk.pos);
    dummy.scale.set(...rk.scale);
    dummy.rotation.set(...rk.rot);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
    rockInst.setColorAt(i, tmpCol.set(rk.color));
  });
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  root.add(rockInst);

  // ── 7. 照片中經典「左側斜倚紅幹高松」＋山頂松林（連續彎曲樹幹不斷裂）──
  const leanPine = new THREE.Group();
  leanPine.position.set(-2.35, 0, 3.65);
  leanPine.scale.set(1.0, 1.35, 1.0);
  root.add(leanPine);
  const pineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 0.0, 0.0),
    new THREE.Vector3(0.85, 2.35, -0.35),
    new THREE.Vector3(1.85, 4.75, -0.62),
    new THREE.Vector3(2.95, 7.25, -0.92),
  ]);
  const pineTrunkGeo = new THREE.TubeGeometry(pineCurve, 18, 0.17, 8, false);
  const ptPos = pineTrunkGeo.attributes.position;
  for (let i = 0; i < ptPos.count; i++) {
    const py = ptPos.getY(i);
    const taper = Math.max(0.55, 1.25 - (py / 7.5) * 0.72);
    const cPt = pineCurve.getPoint(Math.max(0, Math.min(1, py / 7.25)));
    ptPos.setX(i, cPt.x + (ptPos.getX(i) - cPt.x) * taper);
    ptPos.setZ(i, cPt.z + (ptPos.getZ(i) - cPt.z) * taper);
  }
  pineTrunkGeo.computeVertexNormals();
  add(leanPine, pineTrunkGeo, cPineBark, 0, 0, 0);
  [[2.8, 7.6, -0.9, 1.5], [1.6, 6.8, -0.6, 1.1], [3.8, 6.9, -1.1, 1.2]].forEach(([px, py, pz, r]) => {
    add(leanPine, new THREE.SphereGeometry(r, 10, 8), cPine, px, py, pz).scale.set(1.3, 0.38, 1.1);
  });

  // 山頂後方松樹林
  [[-6.2, 4.6 * H_SCALE, -2.5], [-3.2, 5.2 * H_SCALE, -3.2], [0.8, 5.5 * H_SCALE, -3.6], [4.5, 5.1 * H_SCALE, -2.8], [7.2, 4.2 * H_SCALE, -2.0]].forEach(([px, py, pz]) => {
    add(root, new THREE.CylinderGeometry(0.14, 0.20, 2.0, 7), cTrunk, px, py + 0.9, pz);
    add(root, new THREE.SphereGeometry(1.55, 10, 8), cPine, px, py + 2.1, pz).scale.set(1.3, 0.52, 1.1);
  });

  return { group: root, update() {} };
}
