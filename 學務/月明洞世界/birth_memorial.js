// 誕生紀念館 (Birth Memorial Hall / 탄생기념관) — 1F 石柱支撐＋2F 木構青瓦韓屋＋天使低柱＋老鷹高柱
import * as THREE from 'three';

function makeLatticeTex() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9c4e24';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#f8f0e2';
  ctx.fillRect(20, 20, 216, 216);
  ctx.strokeStyle = '#6e3416';
  ctx.lineWidth = 7;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(20 + i * 54, 20);
    ctx.lineTo(20 + i * 54, 236);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, 20 + i * 54);
    ctx.lineTo(236, 20 + i * 54);
    ctx.stroke();
  }
  const tex = new THREE.Texture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createBirthMemorial(options = {}) {
  const { withBase = true } = options;
  const root = new THREE.Group();

  const cStone = new THREE.MeshStandardMaterial({ color: '#d5d8dc', roughness: 0.80 });
  const cStoneDark = new THREE.MeshStandardMaterial({ color: '#a5aab0', roughness: 0.86 });
  const cGlass = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.22, metalness: 0.35 });
  const cWood = new THREE.MeshStandardMaterial({ color: '#cf7434', roughness: 0.70 });
  const cWoodDark = new THREE.MeshStandardMaterial({ color: '#8a441a', roughness: 0.78 });
  const cRoof = new THREE.MeshStandardMaterial({ color: '#147080', roughness: 0.45, metalness: 0.14 });
  const cRidge = new THREE.MeshStandardMaterial({ color: '#2b95a8', roughness: 0.45 });
  const cWhiteStatue = new THREE.MeshStandardMaterial({ color: '#f3f5f8', roughness: 0.62 });
  const cGold = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.55, roughness: 0.32 });
  const cLattice = new THREE.MeshStandardMaterial({ map: makeLatticeTex(), roughness: 0.68 });
  const cWarmGlow = new THREE.MeshStandardMaterial({ color: '#fde68a', emissive: '#f59e0b', emissiveIntensity: 0.25 });

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
    add(root, new THREE.CylinderGeometry(11.0, 11.6, 0.45, 48), new THREE.MeshStandardMaterial({ color: '#c9a679', roughness: 0.94 }), 0.5, -0.225, 0.2);
    // 照片前方橘紅紋理石塊與左側雙幹松樹
    const cOrangeRock = new THREE.MeshStandardMaterial({ color: '#d98c66', roughness: 0.86, flatShading: true });
    add(root, new THREE.DodecahedronGeometry(1.35, 1), cOrangeRock, 4.6, 0.55, 3.8).scale.set(1.5, 0.75, 0.85);
    add(root, new THREE.DodecahedronGeometry(1.10, 1), cOrangeRock, 7.6, 0.45, 3.9).scale.set(1.4, 0.70, 0.80);
    const cTrunk = new THREE.MeshStandardMaterial({ color: '#543825', roughness: 0.90 });
    const cPine = new THREE.MeshStandardMaterial({ color: '#3b7d38', roughness: 0.84, flatShading: true });
    add(root, new THREE.CylinderGeometry(0.16, 0.24, 3.6, 8), cTrunk, -5.8, 1.8, 2.2, 0.05, 0, 0.14);
    add(root, new THREE.CylinderGeometry(0.14, 0.20, 3.3, 8), cTrunk, -5.3, 1.65, 2.0, -0.05, 0, -0.18);
    add(root, new THREE.SphereGeometry(1.9, 12, 9), cPine, -5.5, 3.8, 2.1).scale.set(1.4, 0.52, 1.15);
  }

  // ── 1. 一樓：花崗岩柱支撐＋深色玻璃大廳 ──
  const hall = new THREE.Group();
  hall.position.set(-1.5, 0, -0.4);
  root.add(hall);

  add(hall, new THREE.BoxGeometry(7.8, 0.35, 5.4), cStoneDark, 0, 0.175, 0);
  add(hall, new THREE.BoxGeometry(6.8, 2.35, 4.2), cGlass, 0, 1.50, -0.2);
  // 8 根花崗岩支撐方柱
  [-3.4, -1.15, 1.15, 3.4].forEach((px) => {
    [-2.2, 2.2].forEach((pz) => {
      add(hall, new THREE.BoxGeometry(0.36, 2.45, 0.36), cStone, px, 1.55, pz);
    });
  });

  // ── 2. 二樓：白石雕花欄杆露台＋暖木韓屋＋青瓦飛簷 ──
  add(hall, new THREE.BoxGeometry(8.2, 0.28, 5.8), cStone, 0, 2.88, 0);
  // 二樓四周白石欄杆＋小立柱
  const addRail = (len, x, z, ry) => {
    add(hall, new THREE.BoxGeometry(len, 0.09, 0.10), cStone, x, 3.62, z, 0, ry, 0);
    const n = Math.max(3, Math.round(len / 0.45));
    for (let i = 0; i <= n; i++) {
      const t = (i / n - 0.5) * len;
      add(hall, new THREE.BoxGeometry(0.08, 0.56, 0.08), cStone, x + Math.cos(ry) * t, 3.30, z - Math.sin(ry) * t, 0, ry, 0);
    }
  };
  addRail(8.0, 0, 2.75, 0);
  addRail(8.0, 0, -2.75, 0);
  addRail(5.4, -3.95, 0, Math.PI / 2);
  addRail(5.4, 3.95, 0, Math.PI / 2);

  // 二樓傳統木造主體＋格柵門窗
  add(hall, new THREE.BoxGeometry(6.6, 2.15, 4.0), cWood, 0, 4.10, -0.15);
  [-2.0, 0, 2.0].forEach((wx) => {
    add(hall, new THREE.BoxGeometry(1.45, 1.55, 0.14), cLattice, wx, 4.05, 1.88);
  });
  [-3.2, -1.1, 1.1, 3.2].forEach((px) => {
    add(hall, new THREE.CylinderGeometry(0.14, 0.15, 2.25, 10), cWood, px, 4.12, 2.02);
    add(hall, new THREE.CylinderGeometry(0.14, 0.15, 2.25, 10), cWood, px, 4.12, -2.12);
  });
  // 屋簷下暖光燈條
  add(hall, new THREE.BoxGeometry(6.4, 0.08, 0.12), cWarmGlow, 0, 5.18, 2.05);

  // 韓式青瓦飛簷屋頂 (Paljak-jibung)＋白山牆＋金端飾
  const roof = new THREE.Group();
  roof.position.set(0, 5.20, -0.05);
  hall.add(roof);
  const slopeAngle = 0.44;
  add(roof, new THREE.BoxGeometry(8.8, 0.16, 3.2), cRoof, 0, 0.72, 1.35, slopeAngle, 0, 0);
  add(roof, new THREE.BoxGeometry(8.8, 0.16, 3.2), cRoof, 0, 0.72, -1.35, -slopeAngle, 0, 0);
  add(roof, new THREE.BoxGeometry(9.1, 0.22, 0.26), cRidge, 0, 1.44, 0);
  add(roof, new THREE.BoxGeometry(0.28, 0.30, 0.32), cGold, -4.45, 1.50, 0);
  add(roof, new THREE.BoxGeometry(0.28, 0.30, 0.32), cGold, 4.45, 1.50, 0);
  // 左右白色山牆三角
  const gable = new THREE.ConeGeometry(2.6, 1.4, 3);
  gable.rotateY(Math.PI / 2);
  add(roof, gable, cStone, -4.05, 0.68, 0).scale.set(0.08, 1, 1);
  add(roof, gable, cStone, 4.05, 0.68, 0).scale.set(0.08, 1, 1);

  // ── 3. 靠近紀念館的「較低圓柱」＋「天使石雕像」──
  const angelPillar = new THREE.Group();
  angelPillar.position.set(3.55, 0, 1.55);
  root.add(angelPillar);
  add(angelPillar, new THREE.BoxGeometry(1.15, 0.32, 1.15), cStoneDark, 0, 0.16, 0);
  add(angelPillar, new THREE.CylinderGeometry(0.42, 0.46, 2.35, 20), cStone, 0, 1.48, 0);
  add(angelPillar, new THREE.CylinderGeometry(0.52, 0.52, 0.20, 20), cStone, 0, 2.72, 0);

  // 天使石雕像（長袍＋展翼雙翅＋雙手祈禱／指引）
  const angel = new THREE.Group();
  angel.position.set(0, 2.82, 0);
  angelPillar.add(angel);
  add(angel, new THREE.CylinderGeometry(0.16, 0.30, 1.05, 12), cWhiteStatue, 0, 0.52, 0);
  add(angel, new THREE.SphereGeometry(0.15, 12, 10), cWhiteStatue, 0, 1.16, 0.02);
  // 天使展翅雙翼
  add(angel, new THREE.BoxGeometry(0.52, 0.62, 0.08), cWhiteStatue, -0.32, 0.90, -0.10, 0.15, 0.35, 0.32);
  add(angel, new THREE.BoxGeometry(0.52, 0.62, 0.08), cWhiteStatue, 0.32, 0.90, -0.10, 0.15, -0.35, -0.32);
  // 雙臂
  add(angel, new THREE.CylinderGeometry(0.05, 0.04, 0.44, 8), cWhiteStatue, -0.22, 0.78, 0.12, -0.5, 0, 0.45);
  add(angel, new THREE.CylinderGeometry(0.05, 0.04, 0.44, 8), cWhiteStatue, 0.22, 0.78, 0.12, -0.5, 0, -0.45);

  // ── 4. 距離紀念館較遠的「較高圓柱」＋「老鷹石雕像」──
  const eaglePillar = new THREE.Group();
  eaglePillar.position.set(5.65, 0, 2.45);
  root.add(eaglePillar);
  add(eaglePillar, new THREE.BoxGeometry(1.65, 0.40, 1.65), cStoneDark, 0, 0.20, 0);
  add(eaglePillar, new THREE.CylinderGeometry(0.68, 0.74, 4.65, 24), cStone, 0, 2.70, 0);
  // 中段與柱頂圓環飾
  add(eaglePillar, new THREE.CylinderGeometry(0.80, 0.80, 0.22, 24), cStone, 0, 2.25, 0);
  add(eaglePillar, new THREE.CylinderGeometry(0.84, 0.84, 0.28, 24), cStone, 0, 5.10, 0);

  // 老鷹石雕像（挺立鷹身＋尖喙鷹首＋大幅展開雙翅）
  const eagle = new THREE.Group();
  eagle.position.set(0, 5.24, 0);
  eaglePillar.add(eagle);
  add(eagle, new THREE.CylinderGeometry(0.18, 0.24, 0.72, 10), cWhiteStatue, 0, 0.38, 0, 0.28, 0, 0);
  add(eagle, new THREE.SphereGeometry(0.17, 12, 10), cWhiteStatue, 0, 0.78, 0.16);
  // 鷹喙
  add(eagle, new THREE.ConeGeometry(0.07, 0.22, 6), cWhiteStatue, 0, 0.76, 0.34, Math.PI / 2 + 0.2, 0, 0);
  // 大展雙翅
  add(eagle, new THREE.BoxGeometry(0.85, 0.56, 0.10), cWhiteStatue, -0.48, 0.72, -0.05, 0.22, 0.38, 0.55);
  add(eagle, new THREE.BoxGeometry(0.85, 0.56, 0.10), cWhiteStatue, 0.48, 0.72, -0.05, 0.22, -0.38, -0.55);
  // 尾羽
  add(eagle, new THREE.ConeGeometry(0.20, 0.42, 6), cWhiteStatue, 0, 0.20, -0.25, -0.85, 0, 0);

  return {
    group: root,
    setNightGlow(v) {
      cWarmGlow.emissiveIntensity = 0.25 + v * 1.4;
    },
    update() {},
  };
}
