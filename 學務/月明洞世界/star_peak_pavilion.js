// 星峰亭 (Star Peak Pavilion / 별봉정) — 1F/2F 雕花白石欄杆＋半石半木柱＋側面石階＋垂吊金星
import * as THREE from 'three';

export function createStarPeakPavilion(options = {}) {
  const { withBase = true } = options;
  const root = new THREE.Group();

  const cStone = new THREE.MeshStandardMaterial({ color: '#d5dce3', roughness: 0.78 });
  const cStoneDark = new THREE.MeshStandardMaterial({ color: '#9aa4b0', roughness: 0.85 });
  const cWood = new THREE.MeshStandardMaterial({ color: '#d6883c', roughness: 0.66 });
  const cWoodDark = new THREE.MeshStandardMaterial({ color: '#8a4c1d', roughness: 0.76 });
  const cRoof = new THREE.MeshStandardMaterial({ color: '#2f353b', roughness: 0.56, metalness: 0.14 });
  const cRidge = new THREE.MeshStandardMaterial({ color: '#555e68', roughness: 0.50 });
  const cGold = new THREE.MeshStandardMaterial({ color: '#fbbf24', emissive: '#d97706', emissiveIntensity: 0.35, metalness: 0.65, roughness: 0.28 });

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
    add(root, new THREE.CylinderGeometry(6.8, 7.2, 0.35, 36), new THREE.MeshStandardMaterial({ color: '#8c9299', roughness: 0.92 }), 0, -0.175, 0);
    // 左前方石獅造型岩石與周圍松樹剪影
    add(root, new THREE.DodecahedronGeometry(0.75, 1), cStone, -2.6, 0.45, 3.6).scale.set(0.85, 1.0, 1.35);
    const cTrunk = new THREE.MeshStandardMaterial({ color: '#593b28', roughness: 0.9 });
    const cPine = new THREE.MeshStandardMaterial({ color: '#2e6b34', roughness: 0.85, flatShading: true });
    [[-4.2, 0, -1.5], [4.4, 0, 1.2], [3.6, 0, -3.2]].forEach(([px, py, pz]) => {
      add(root, new THREE.CylinderGeometry(0.14, 0.20, 4.6, 7), cTrunk, px, py + 2.3, pz);
      add(root, new THREE.SphereGeometry(1.5, 10, 8), cPine, px, py + 4.8, pz).scale.set(1.2, 0.55, 1.1);
    });
  }

  // ── 1. 一樓花崗岩基台＋6 根石柱＋下層帶星形徽飾白石欄杆 ──
  const R = 1.95;
  add(root, new THREE.CylinderGeometry(2.35, 2.45, 0.36, 6), cStoneDark, 0, 0.18, 0);
  for (let i = 0; i < 6; i++) {
    const ang = (i * Math.PI) / 3 + Math.PI / 6;
    const px = Math.cos(ang) * R;
    const pz = Math.sin(ang) * R;
    add(root, new THREE.BoxGeometry(0.32, 2.35, 0.32), cStone, px, 1.45, pz, 0, -ang, 0);
  }
  // 下層白石欄杆（前側入口除外）
  for (let i = 0; i < 6; i++) {
    if (i === 1) continue; // 留出樓梯側面與入口通道
    const a1 = (i * Math.PI) / 3 + Math.PI / 6;
    const a2 = ((i + 1) * Math.PI) / 3 + Math.PI / 6;
    const mx = (Math.cos(a1) + Math.cos(a2)) * 0.5 * (R + 0.1);
    const mz = (Math.sin(a1) + Math.sin(a2)) * 0.5 * (R + 0.1);
    const len = 2 * (R + 0.1) * Math.sin(Math.PI / 6) - 0.25;
    const rotY = -((a1 + a2) * 0.5) + Math.PI / 2;
    add(root, new THREE.BoxGeometry(len, 0.09, 0.10), cStone, mx, 1.05, mz, 0, rotY, 0);
    add(root, new THREE.BoxGeometry(len * 0.32, 0.42, 0.08), cStone, mx, 0.72, mz, 0, rotY, 0);
    add(root, new THREE.OctahedronGeometry(0.11, 0), cGold, mx, 0.72, mz).scale.set(1, 1, 0.35);
  }

  // ── 2. 側面高聳花崗岩樓梯（弧形石階基座＋十級階梯＋兩側雕花欄杆）──
  const stair = new THREE.Group();
  stair.position.set(-1.35, 0, 2.55);
  stair.rotation.y = 0.22;
  root.add(stair);
  // 弧形兩側入口石護牆
  [-0.68, 0.68].forEach((sx) => {
    add(stair, new THREE.CylinderGeometry(0.58, 0.58, 0.14, 16, 1, false, 0, Math.PI), cStone, sx, 0.42, 1.28, 0, Math.PI / 2, Math.PI / 2);
  });
  for (let s = 0; s < 10; s++) {
    const sy = 0.16 + s * 0.245;
    const sz = 1.20 - s * 0.21;
    add(stair, new THREE.BoxGeometry(1.22, 0.22, 0.28), cStone, 0, sy, sz);
    [-0.62, 0.62].forEach((sx) => {
      add(stair, new THREE.BoxGeometry(0.10, 0.65, 0.10), cStone, sx, sy + 0.38, sz);
    });
  }
  // 斜向樓梯扶手（精準沿各階梯小立柱頂端斜率 +0.862 貼合）
  [-0.62, 0.62].forEach((sx) => {
    add(stair, new THREE.BoxGeometry(0.12, 0.10, 3.05), cStone, sx, 1.97, 0.255, 0.862, 0, 0);
  });

  // ── 3. 二樓白石露台＋星紋白石欄杆＋「半石半木」立柱 ──
  add(root, new THREE.CylinderGeometry(2.42, 2.38, 0.26, 6), cStone, 0, 2.68, 0);
  const railR = 2.22;
  for (let i = 0; i < 6; i++) {
    const a1 = (i * Math.PI) / 3 + Math.PI / 6;
    const a2 = ((i + 1) * Math.PI) / 3 + Math.PI / 6;
    // 半石半木六角立柱（下半白石、上半金木）
    const cx = Math.cos(a1) * R;
    const cz = Math.sin(a1) * R;
    add(root, new THREE.CylinderGeometry(0.15, 0.16, 1.05, 10), cStone, cx, 3.30, cz);
    add(root, new THREE.CylinderGeometry(0.14, 0.15, 1.10, 10), cWood, cx, 4.35, cz);
    add(root, new THREE.BoxGeometry(0.30, 0.24, 0.30), cWoodDark, cx, 4.92, cz);

    if (i === 1) continue; // 樓梯上樓口
    const mx = (Math.cos(a1) + Math.cos(a2)) * 0.5 * railR;
    const mz = (Math.sin(a1) + Math.sin(a2)) * 0.5 * railR;
    const len = 2 * railR * Math.sin(Math.PI / 6);
    const rotY = -((a1 + a2) * 0.5) + Math.PI / 2;
    add(root, new THREE.BoxGeometry(len, 0.10, 0.12), cStone, mx, 3.45, mz, 0, rotY, 0);
    for (let b = -2; b <= 2; b++) {
      const t = b * 0.36;
      add(root, new THREE.BoxGeometry(0.10, 0.58, 0.10), cStone, mx + Math.cos(rotY) * t, 3.12, mz - Math.sin(rotY) * t, 0, rotY, 0);
    }
    add(root, new THREE.OctahedronGeometry(0.12, 0), cGold, mx, 3.12, mz).scale.set(1, 1, 0.35);
  }

  // ── 4. 外露放射椽木＋六角黑瓦飛簷頂＋屋頂下金色吊星 ──
  for (let i = 0; i < 24; i++) {
    const ang = (i * Math.PI * 2) / 24;
    add(root, new THREE.CylinderGeometry(0.035, 0.035, 1.55, 6), cWoodDark, Math.cos(ang) * 2.0, 5.05, Math.sin(ang) * 2.0, 0, -ang, Math.PI / 2 - 0.25);
  }
  add(root, new THREE.ConeGeometry(3.35, 1.48, 6), cRoof, 0, 5.88, 0, 0, Math.PI / 6, 0);
  for (let i = 0; i < 6; i++) {
    const ang = (i * Math.PI) / 3 + Math.PI / 6;
    const rg = new THREE.Group();
    rg.rotation.y = -ang + Math.PI / 2;
    root.add(rg);
    add(rg, new THREE.BoxGeometry(0.12, 0.12, 2.30), cRidge, 0, 5.88, 1.50, 0.44, 0, 0);
    add(rg, new THREE.BoxGeometry(0.24, 0.14, 0.34), cRidge, 0, 5.20, 3.08, -0.28, 0, 0);
  }
  add(root, new THREE.SphereGeometry(0.22, 14, 10), cRidge, 0, 6.70, 0);
  // 亭內正中央金色吊星（呼應星峰亭名稱與照片內金星吊飾）
  add(root, new THREE.CylinderGeometry(0.015, 0.015, 0.42, 6), cGold, 0, 4.78, 0);
  add(root, new THREE.OctahedronGeometry(0.18, 0), cGold, 0, 4.52, 0).scale.set(1, 1.25, 0.4);

  return { group: root, update() {} };
}
