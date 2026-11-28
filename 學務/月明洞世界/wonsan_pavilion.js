// 圓山八角亭 (Wonsan Octagonal Pavilion / 원산 팔각정) — 花崗岩柱基＋2F 橘木雕欄＋八角飛簷瓦頂
import * as THREE from 'three';

export function createWonsanPavilion(options = {}) {
  const { withBase = true } = options;
  const root = new THREE.Group();

  const cStone = new THREE.MeshStandardMaterial({ color: '#dcd9d0', roughness: 0.82 });
  const cRock = new THREE.MeshStandardMaterial({ color: '#8f897d', roughness: 0.92, flatShading: true });
  const cWood = new THREE.MeshStandardMaterial({ color: '#cf7d34', roughness: 0.68 });
  const cWoodDark = new THREE.MeshStandardMaterial({ color: '#8a481a', roughness: 0.78 });
  const cRoof = new THREE.MeshStandardMaterial({ color: '#32383e', roughness: 0.56, metalness: 0.14 });
  const cRidge = new THREE.MeshStandardMaterial({ color: '#525b63', roughness: 0.50 });

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
    // 岩石山丘底座＋左右大松樹與木長椅（還原照片構圖）
    add(root, new THREE.DodecahedronGeometry(4.6, 1), cRock, 0, -1.6, 0).scale.set(1.4, 0.45, 1.25);
    [[-2.2, 0.15, 2.0, 0.7], [2.0, 0.1, 1.8, 0.65], [0.4, 0.15, 2.5, 0.55]].forEach(([rx, ry, rz, rs]) => {
      add(root, new THREE.DodecahedronGeometry(rs, 1), cRock, rx, ry, rz).scale.set(1.3, 0.7, 1.1);
    });
    const cTrunk = new THREE.MeshStandardMaterial({ color: '#4d3221', roughness: 0.92 });
    const cPine = new THREE.MeshStandardMaterial({ color: '#2f6e33', roughness: 0.84, flatShading: true });
    add(root, new THREE.CylinderGeometry(0.22, 0.34, 4.2, 8), cTrunk, -4.4, 2.1, 0.6, 0.05, 0, -0.15);
    add(root, new THREE.SphereGeometry(2.1, 12, 9), cPine, -4.6, 4.4, 0.5).scale.set(1.2, 0.78, 1.1);
    add(root, new THREE.CylinderGeometry(0.16, 0.24, 3.0, 7), cTrunk, 3.9, 1.4, 1.2, -0.05, 0, 0.22);
    add(root, new THREE.SphereGeometry(1.6, 12, 9), cPine, 4.3, 2.9, 1.2).scale.set(1.3, 0.65, 1.1);
  }

  // ── 1. 一樓 8 根白色石柱 ──
  const R = 2.05;
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 + Math.PI / 8;
    const px = Math.cos(ang) * R;
    const pz = Math.sin(ang) * R;
    add(root, new THREE.CylinderGeometry(0.15, 0.17, 2.25, 12), cStone, px, 1.12, pz);
    add(root, new THREE.CylinderGeometry(0.20, 0.22, 0.18, 12), cRock, px, 0.09, pz);
  }

  // ── 2. 二樓金橘木構平台與八角雕花木欄杆 ──
  add(root, new THREE.CylinderGeometry(2.55, 2.45, 0.26, 8), cWood, 0, 2.35, 0, 0, Math.PI / 8, 0);
  const railR = 2.32;
  for (let i = 0; i < 8; i++) {
    const a1 = (i * Math.PI) / 4 + Math.PI / 8;
    const a2 = ((i + 1) * Math.PI) / 4 + Math.PI / 8;
    const mx = (Math.cos(a1) + Math.cos(a2)) * 0.5 * railR;
    const mz = (Math.sin(a1) + Math.sin(a2)) * 0.5 * railR;
    const sideLen = 2 * railR * Math.sin(Math.PI / 8);
    const rotY = -((a1 + a2) * 0.5) + Math.PI / 2;

    // 欄杆上下橫條＋垂直小木柵欄
    add(root, new THREE.BoxGeometry(sideLen, 0.08, 0.08), cWood, mx, 3.05, mz, 0, rotY, 0);
    add(root, new THREE.BoxGeometry(sideLen, 0.10, 0.08), cWood, mx, 2.55, mz, 0, rotY, 0);
    for (let b = -2; b <= 2; b++) {
      const t = b * 0.28;
      const bx = mx + Math.cos(rotY) * t;
      const bz = mz - Math.sin(rotY) * t;
      add(root, new THREE.BoxGeometry(0.06, 0.48, 0.06), cWood, bx, 2.80, bz, 0, rotY, 0);
    }

    // 2F 八根圓木柱
    add(root, new THREE.CylinderGeometry(0.13, 0.14, 2.05, 10), cWood, Math.cos(a1) * R, 3.45, Math.sin(a1) * R);
    // 斗拱承托
    add(root, new THREE.BoxGeometry(0.32, 0.24, 0.32), cWoodDark, Math.cos(a1) * R, 4.48, Math.sin(a1) * R);
  }

  // ── 3. 外露放射椽木 (서까래) 與深灰八角飛簷瓦頂 ──
  for (let i = 0; i < 24; i++) {
    const ang = (i * Math.PI * 2) / 24;
    const rx = Math.cos(ang) * 2.1;
    const rz = Math.sin(ang) * 2.1;
    add(root, new THREE.CylinderGeometry(0.035, 0.035, 1.55, 6), cWoodDark, rx, 4.62, rz, 0, -ang, Math.PI / 2 - 0.25);
  }
  add(root, new THREE.ConeGeometry(3.45, 1.45, 8), cRoof, 0, 5.42, 0, 0, Math.PI / 8, 0);
  // 八道屋脊與飛簷翹角（先繞 Y 軸對齊各角，再沿屋坡傾角下壓）
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 + Math.PI / 8;
    const rg = new THREE.Group();
    rg.rotation.y = -ang + Math.PI / 2;
    root.add(rg);
    add(rg, new THREE.BoxGeometry(0.12, 0.12, 2.35), cRidge, 0, 5.44, 1.55, 0.42, 0, 0);
    add(rg, new THREE.BoxGeometry(0.24, 0.14, 0.36), cRidge, 0, 4.78, 3.18, -0.26, 0, 0);
  }
  // 寶頂
  add(root, new THREE.SphereGeometry(0.22, 14, 10), cRidge, 0, 6.22, 0);

  return { group: root, update() {} };
}
