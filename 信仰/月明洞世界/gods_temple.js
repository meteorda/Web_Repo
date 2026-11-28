// 神的殿 (God's Temple / 하나님의 전) — 1F 花崗岩造＋2F 木造＋U型青瓦飛簷屋頂
import * as THREE from 'three';

function makeLatticeTexture(bgHex = '#9e4728', lineHex = '#f5e6d3') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#3b2116';
  ctx.fillRect(14, 14, 228, 228);
  ctx.fillStyle = '#f8f1e5';
  ctx.fillRect(22, 22, 212, 212);
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 6;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(22 + i * 53, 22);
    ctx.lineTo(22 + i * 53, 234);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(22, 22 + i * 53);
    ctx.lineTo(234, 22 + i * 53);
    ctx.stroke();
  }
  const tex = new THREE.Texture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createGodsTemple(options = {}) {
  const { withBase = true } = options;
  const root = new THREE.Group();

  const cGranite = new THREE.MeshStandardMaterial({ color: '#b8b2a6', roughness: 0.88, flatShading: true });
  const cGraniteDark = new THREE.MeshStandardMaterial({ color: '#8f897e', roughness: 0.90, flatShading: true });
  const cWood = new THREE.MeshStandardMaterial({ color: '#b55632', roughness: 0.72 });
  const cWoodTrim = new THREE.MeshStandardMaterial({ color: '#e6b89c', roughness: 0.65 });
  const cDarkDoor = new THREE.MeshStandardMaterial({ color: '#2b1b14', roughness: 0.78 });
  const cRoof = new THREE.MeshStandardMaterial({ color: '#0891b2', roughness: 0.44, metalness: 0.14 });
  const cRidge = new THREE.MeshStandardMaterial({ color: '#22d3ee', roughness: 0.42, metalness: 0.18 });
  const cWhite = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.55 });
  const cLattice = new THREE.MeshStandardMaterial({ map: makeLatticeTexture('#8c3d22', '#5c2814'), roughness: 0.68 });

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
    add(root, new THREE.CylinderGeometry(13.5, 14.2, 0.5, 48), new THREE.MeshStandardMaterial({ color: '#d8ceb8', roughness: 0.92 }), 0, -0.25, 0.5);
  }

  // ── 1. 花崗岩基座台階與前庭地坪 ──
  add(root, new THREE.BoxGeometry(14.8, 0.45, 10.6), cGraniteDark, 0, 0.22, 0.2);
  add(root, new THREE.BoxGeometry(14.2, 0.30, 10.0), cGranite, 0, 0.52, 0.2);
  // 中央花崗岩階梯
  for (let s = 0; s < 3; s++) {
    add(root, new THREE.BoxGeometry(5.2, 0.18, 0.55), cGranite, 0, 0.10 + s * 0.18, 5.45 - s * 0.42);
  }

  // ── 2. 一樓：花崗岩造主體＋花崗岩柱廊（U 字形配置）──
  // 主殿後排 1F
  add(root, new THREE.BoxGeometry(13.2, 2.35, 4.2), cGranite, 0, 1.85, -2.5);
  // 左、右前伸翼樓 1F
  add(root, new THREE.BoxGeometry(3.8, 2.35, 5.2), cGranite, -4.7, 1.85, 2.0);
  add(root, new THREE.BoxGeometry(3.8, 2.35, 5.2), cGranite, 4.7, 1.85, 2.0);

  // 1F 中庭內側深色門窗 recessed panels
  for (let x = -2.2; x <= 2.2; x += 1.45) {
    add(root, new THREE.BoxGeometry(0.95, 1.65, 0.14), cDarkDoor, x, 1.55, -0.38);
  }
  // 1F 迴廊花崗岩方柱
  const col1F = [
    [-2.7, -0.1], [-0.9, -0.1], [0.9, -0.1], [2.7, -0.1],
    [-2.7, 1.5], [-2.7, 3.1], [-2.7, 4.5],
    [2.7, 1.5], [2.7, 3.1], [2.7, 4.5],
    [-6.5, 4.5], [-4.7, 4.5], [4.7, 4.5], [6.5, 4.5],
  ];
  col1F.forEach(([cx, cz]) => {
    add(root, new THREE.BoxGeometry(0.32, 2.35, 0.32), cGraniteDark, cx, 1.85, cz);
  });

  // 1F 與 2F 分界白色石梁＋二樓走廊地板
  add(root, new THREE.BoxGeometry(14.0, 0.24, 4.9), cWhite, 0, 3.12, -2.4);
  add(root, new THREE.BoxGeometry(4.4, 0.24, 5.6), cWhite, -4.8, 3.12, 2.1);
  add(root, new THREE.BoxGeometry(4.4, 0.24, 5.6), cWhite, 4.8, 3.12, 2.1);

  // ── 3. 二樓：傳統木造主體＋韓式格柵門窗＋木欄杆迴廊 ──
  add(root, new THREE.BoxGeometry(13.0, 2.25, 4.0), cWood, 0, 4.35, -2.5);
  add(root, new THREE.BoxGeometry(3.6, 2.25, 5.0), cWood, -4.7, 4.35, 2.0);
  add(root, new THREE.BoxGeometry(3.6, 2.25, 5.0), cWood, 4.7, 4.35, 2.0);

  // 2F 格柵窗門
  for (let x = -2.2; x <= 2.2; x += 1.45) {
    add(root, new THREE.BoxGeometry(1.05, 1.55, 0.14), cLattice, x, 4.25, -0.45);
  }
  [-4.7, 4.7].forEach((wx) => {
    add(root, new THREE.BoxGeometry(2.4, 1.45, 0.14), cLattice, wx, 4.25, 4.52);
  });

  // 2F 外露木柱與白色陽台欄杆
  col1F.forEach(([cx, cz]) => {
    add(root, new THREE.CylinderGeometry(0.14, 0.15, 2.30, 10), cWoodTrim, cx, 4.35, cz);
  });
  add(root, new THREE.BoxGeometry(5.6, 0.55, 0.10), cWhite, 0, 3.52, -0.05);
  add(root, new THREE.BoxGeometry(0.10, 0.55, 4.6), cWhite, -2.75, 3.52, 2.25);
  add(root, new THREE.BoxGeometry(0.10, 0.55, 4.6), cWhite, 2.75, 3.52, 2.25);

  // ── 4. 鮮明青瓦雙坡＋前後翼樓飛簷屋頂 (Paljak-jibung) ──
  const buildGableRoof = (w, d, h, cx, cy, cz, rotY = 0) => {
    const rg = new THREE.Group();
    rg.position.set(cx, cy, cz);
    rg.rotation.y = rotY;
    const slopeLen = Math.hypot(d * 0.54, h);
    const angle = Math.atan2(h, d * 0.5);
    add(rg, new THREE.BoxGeometry(w, 0.18, slopeLen), cRoof, 0, h * 0.5, d * 0.25, angle, 0, 0);
    add(rg, new THREE.BoxGeometry(w, 0.18, slopeLen), cRoof, 0, h * 0.5, -d * 0.25, -angle, 0, 0);
    // 屋脊與白端帽
    add(rg, new THREE.BoxGeometry(w + 0.35, 0.22, 0.28), cRidge, 0, h + 0.04, 0);
    add(rg, new THREE.BoxGeometry(0.30, 0.28, 0.34), cWhite, -w * 0.5 - 0.12, h + 0.08, 0);
    add(rg, new THREE.BoxGeometry(0.30, 0.28, 0.34), cWhite, w * 0.5 + 0.12, h + 0.08, 0);
    // 兩側白色山牆三角
    const gable = new THREE.ConeGeometry(d * 0.48, h, 3);
    gable.rotateY(Math.PI / 2);
    add(rg, gable, cWhite, -w * 0.48, h * 0.46, 0).scale.set(0.08, 1, 1.0);
    add(rg, gable, cWhite, w * 0.48, h * 0.46, 0).scale.set(0.08, 1, 1.0);
    root.add(rg);
  };

  // 主殿大青瓦屋頂
  buildGableRoof(15.2, 5.8, 2.1, 0, 5.45, -2.5, 0);
  // 左、右前翼青瓦屋頂（垂直交接）
  buildGableRoof(6.2, 5.0, 1.85, -4.8, 5.45, 2.1, Math.PI / 2);
  buildGableRoof(6.2, 5.0, 1.85, 4.8, 5.45, 2.1, Math.PI / 2);

  // 周邊點綴松樹
  if (withBase) {
    const cTrunk = new THREE.MeshStandardMaterial({ color: '#5c3c26', roughness: 0.9 });
    const cPine = new THREE.MeshStandardMaterial({ color: '#3b7b35', roughness: 0.84, flatShading: true });
    [[-8.5, 0.2, 4.5], [8.5, 0.2, 4.0], [-9.2, 0.2, -3.5], [9.2, 0.2, -3.2]].forEach(([px, py, pz]) => {
      add(root, new THREE.CylinderGeometry(0.14, 0.22, 1.8, 7), cTrunk, px, py + 0.9, pz);
      add(root, new THREE.SphereGeometry(1.15, 10, 8), cPine, px, py + 2.1, pz).scale.set(1.2, 0.48, 1.1);
    });
  }

  return { group: root, update() {} };
}
