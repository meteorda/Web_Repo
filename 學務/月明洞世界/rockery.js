import * as THREE from 'three';

function createGraniteStoneGeo(seed, mode = 'pillar') {
  const geo = new THREE.IcosahedronGeometry(0.72, 2);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Cleaved granite planes + strata ridges
    const n1 = Math.sin(x * 3.8 + seed) * Math.cos(y * 2.4 + seed * 1.3) * Math.sin(z * 3.6 - seed * 0.7);
    const n2 = Math.cos(x * 7.2 - seed * 1.9) * Math.sin(z * 6.4 + y * 5.0);
    const strata = Math.sin(y * 11.0 + x * 2.5 + seed) * 0.06;

    if (mode === 'pillar') {
      // 厚實穩重的韓國花崗岩立石（寬厚比約 1:2.2，平頂或微收，絕非細長尖刺）
      const taper = 1.0 - Math.max(0, y) * 0.22;
      x *= taper * (0.88 + n1 * 0.14);
      z *= taper * (0.68 + n2 * 0.12);
      y *= 1.15 + n1 * 0.10;
      x = Math.sign(x) * Math.pow(Math.abs(x), 0.90);
    } else if (mode === 'wall') {
      // 厚實方正的階梯擋土花崗岩塊
      x *= 1.25 + n1 * 0.14;
      y *= 0.66 + strata;
      z *= 0.92 + n2 * 0.14;
      y = Math.max(-0.48, Math.min(0.48, y));
    } else {
      // Weathered rounded boulder
      const d = 1.0 + n1 * 0.18 + n2 * 0.08 + strata;
      x *= d * 1.05;
      y *= d * 0.78;
      z *= d * 0.92;
    }

    if (y < -0.35) y *= 0.82;
    pos.setXYZ(i, x, y, z);

    // Granite quartz-vein vertex shading
    const vein = Math.max(0, Math.sin(x * 8.0 + y * 5.0 + seed * 2.0) - 0.65) * 0.8;
    const hNorm = Math.min(1, Math.max(0, (y + 0.9) / 1.8));
    const shade = 0.68 + n1 * 0.16 + hNorm * 0.24 + vein * 0.35;
    cols[i * 3] = Math.min(1, shade);
    cols[i * 3 + 1] = Math.min(1, shade * 0.98);
    cols[i * 3 + 2] = Math.min(1, shade * 0.94);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  return geo;
}

function createCrescentBladeGeo(side) {
  // Custom 3D curved crescent-moon wing blade (facing inward like twin parentheses)
  const segY = 24;
  const segX = 8;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let iy = 0; iy <= segY; iy++) {
    const t = iy / segY; // 0 = bottom, 1 = tip
    // 寬厚飽滿的雙半月形大理石碑輪廓
    const outerX = side * (0.42 + Math.sin(t * Math.PI * 0.85) * 0.48 - Math.pow(t, 2.2) * 0.62);
    const innerX = side * (0.06 + Math.sin(t * Math.PI * 0.75) * 0.30 - Math.pow(t, 1.8) * 0.28);
    const y = t * 2.45;
    const thick = (1.0 - Math.pow(t, 1.6) * 0.68) * 0.18;

    for (let ix = 0; ix <= segX; ix++) {
      const u = ix / segX; // 0..1 around cross-section
      const ang = u * Math.PI * 2;
      const cx = (innerX + outerX) * 0.5;
      const hw = Math.max(0.02, Math.abs(outerX - innerX) * 0.5);
      const px = cx + Math.cos(ang) * hw * side;
      const pz = Math.sin(ang) * thick;
      positions.push(px, y, pz);
      uvs.push(u, t);
    }
  }

  const stride = segX + 1;
  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeInscriptionTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 30, 256, 256, 280);
  g.addColorStop(0, '#dbc6a6');
  g.addColorStop(1, '#a99170');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(60,45,30,0.08)' : 'rgba(255,245,230,0.08)';
    ctx.fillRect((i * 73) % 512, (i * 137) % 512, 3, 3);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#241c14';
  ctx.font = 'bold 62px "Malgun Gothic", "Noto Sans KR", serif';
  ctx.fillText('생명을', 256, 200);
  ctx.fillText('사랑하라', 256, 290);

  const tex = new THREE.Texture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createAmbitionRockery(options = {}) {
  const { withPlaza = false } = options;
  const root = new THREE.Group();

  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.04 });
  const cWhite = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.62 });
  const cWood = new THREE.MeshStandardMaterial({ color: '#6b4226', roughness: 0.88 });
  const cPine1 = new THREE.MeshStandardMaterial({ color: '#2b6a33', roughness: 0.82 });
  const cPine2 = new THREE.MeshStandardMaterial({ color: '#42853b', roughness: 0.80 });
  const cPole = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.45, metalness: 0.65 });
  const cLamp = new THREE.MeshStandardMaterial({ color: '#fef9c3', emissive: '#fde047', emissiveIntensity: 0.15 });

  const add = (parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  if (withPlaza) {
    add(root, new THREE.CylinderGeometry(14.0, 14.8, 0.5, 48), new THREE.MeshStandardMaterial({ color: '#d2b488', roughness: 0.94 }), 0, -0.25, 0.5);
  }

  // 1. 紮實階梯核心土丘（置於石牆後方 z=-1.65，絕不遮擋前方階梯花崗岩）
  add(root, new THREE.CylinderGeometry(2.8, 10.6, 4.5, 16), new THREE.MeshStandardMaterial({ color: '#445e32', roughness: 0.95, flatShading: true }), 0, 2.15, -1.65)
    .scale.set(1.02, 1.0, 0.35);

  // 2. 高密度 GPU Instanced 階梯擋土牆巨石（上窄 40%、下寬 120%）＋ 尖銳直立花崗岩柱
  const wallGeo = createGraniteStoneGeo(12, 'wall');
  const pillarGeo = createGraniteStoneGeo(37, 'pillar');
  const instMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.04 });

  const wallTransforms = [];
  const pillarTransforms = [];
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  const stoneColors = [0x8c8a84, 0xa89275, 0x6f6e6a, 0xc4bfb6, 0x9c8265, 0x7d8085];

  // 6 層緊密堆疊的厚實階梯花崗岩擋土牆（下方調寬 120%、上方逐層收窄至 40%）
  const wallTiers = [
    { y: 0.35, zBase: 3.45, count: 40, wSpan: 22.8, sMin: 0.62, sMax: 1.05 },
    { y: 1.10, zBase: 2.35, count: 35, wSpan: 19.2, sMin: 0.62, sMax: 1.05 },
    { y: 1.92, zBase: 1.25, count: 29, wSpan: 15.6, sMin: 0.65, sMax: 1.08 },
    { y: 2.80, zBase: 0.10, count: 24, wSpan: 11.8, sMin: 0.68, sMax: 1.12 },
    { y: 3.75, zBase: -1.05, count: 18, wSpan: 8.4,  sMin: 0.68, sMax: 1.12 },
    { y: 4.70, zBase: -2.15, count: 14, wSpan: 5.4,  sMin: 0.70, sMax: 1.15 },
  ];

  let s = 1.0;
  wallTiers.forEach((tier, tIdx) => {
    for (let i = 0; i < tier.count; i++) {
      s += 1.73;
      const frac = i / Math.max(1, tier.count - 1) - 0.5;
      const x = frac * tier.wSpan + Math.sin(s * 2.3) * 0.22;
      const z = tier.zBase - Math.pow(frac * 1.35, 2) * 0.95 + Math.cos(s * 1.9) * 0.16;
      const sc = tier.sMin + ((s * 0.41) % (tier.sMax - tier.sMin));
      wallTransforms.push({
        x, y: tier.y, z,
        sx: sc * (1.05 + (s % 0.45)),
        sy: sc * (0.88 + (s % 0.32)),
        sz: sc * (0.90 + (s % 0.35)),
        ry: (s * 0.7) % 6.28,
        c: stoneColors[(i + tIdx) % stoneColors.length],
      });
    }
  });

  // 依照片金字塔形配置花崗岩立石：下方加寬至 120%，上方收窄至 40%
  const pillarRows = [
    { y: 1.55, zBase: 2.25, count: 15, wSpan: 19.4, wMin: 0.72, wMax: 0.92, hMin: 0.85, hMax: 1.15 },
    { y: 2.45, zBase: 1.15, count: 14, wSpan: 15.6, wMin: 0.75, wMax: 0.95, hMin: 0.95, hMax: 1.30 },
    { y: 3.45, zBase: -0.05, count: 12, wSpan: 11.8, wMin: 0.78, wMax: 0.98, hMin: 1.00, hMax: 1.38 },
    { y: 4.55, zBase: -1.35, count: 9,  wSpan: 8.2,  wMin: 0.75, wMax: 0.96, hMin: 1.05, hMax: 1.40 },
    { y: 5.35, zBase: -2.40, count: 7,  wSpan: 4.6,  wMin: 0.72, wMax: 0.94, hMin: 0.95, hMax: 1.32 },
  ];
  pillarRows.forEach((row, rIdx) => {
    for (let i = 0; i < row.count; i++) {
      s += 1.91;
      const frac = i / Math.max(1, row.count - 1) - 0.5;
      const x = frac * row.wSpan + Math.sin(s * 2.1) * 0.25;
      // 保留正中央「雙半月白碑」與「생명을 사랑하라」前方視線空間
      if (Math.abs(x + 0.25) < 1.15 && (rIdx === 1 || rIdx === 4)) continue;
      const z = row.zBase - Math.pow(frac * 1.35, 2) * 0.95 + Math.cos(s * 1.7) * 0.20;
      const pw = row.wMin + ((s * 0.37) % (row.wMax - row.wMin));
      const ph = row.hMin + ((s * 0.53) % (row.hMax - row.hMin));
      pillarTransforms.push({
        x, y: row.y + ph * 0.42, z,
        sx: pw, sy: ph, sz: pw * 0.80,
        rx: Math.sin(s) * 0.05, ry: (s * 0.9) % 6.28, rz: Math.cos(s) * 0.05,
        c: stoneColors[(i + rIdx * 2) % stoneColors.length],
      });
    }
  });

  const wallInst = new THREE.InstancedMesh(wallGeo, instMat, wallTransforms.length);
  wallInst.castShadow = true;
  wallInst.receiveShadow = true;
  wallTransforms.forEach((w, idx) => {
    dummy.position.set(w.x, w.y, w.z);
    dummy.rotation.set(0, w.ry, 0);
    dummy.scale.set(w.sx, w.sy, w.sz);
    dummy.updateMatrix();
    wallInst.setMatrixAt(idx, dummy.matrix);
    wallInst.setColorAt(idx, col.setHex(w.c));
  });
  wallInst.instanceMatrix.needsUpdate = true;
  if (wallInst.instanceColor) wallInst.instanceColor.needsUpdate = true;
  root.add(wallInst);

  const pillarInst = new THREE.InstancedMesh(pillarGeo, instMat, pillarTransforms.length);
  pillarInst.castShadow = true;
  pillarInst.receiveShadow = true;
  pillarTransforms.forEach((p, idx) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(p.rx, p.ry, p.rz);
    dummy.scale.set(p.sx, p.sy, p.sz);
    dummy.updateMatrix();
    pillarInst.setMatrixAt(idx, dummy.matrix);
    pillarInst.setColorAt(idx, col.setHex(p.c));
  });
  pillarInst.instanceMatrix.needsUpdate = true;
  if (pillarInst.instanceColor) pillarInst.instanceColor.needsUpdate = true;
  root.add(pillarInst);

  // 3. 前排左右標誌性超大立石（厚實寬廣：左灰石、右白石）與右中排白立石
  add(root, createGraniteStoneGeo(31, 'pillar'), rockMat, -5.0, 1.65, 3.65, 0, 0.15, 0).scale.set(1.45, 1.55, 1.05);
  add(root, createGraniteStoneGeo(47, 'pillar'), rockMat, 5.6, 1.60, 3.60, 0, -0.2, 0).scale.set(1.55, 1.48, 1.08);
  add(root, createGraniteStoneGeo(63, 'pillar'), cWhite, 3.3, 2.45, 2.05, 0, -0.35, 0).scale.set(0.88, 1.05, 0.48);

  // 4. 正中央刻字主石「생명을 사랑하라」（弧面石體直接貼字）
  const heartStone = new THREE.Group();
  heartStone.position.set(-0.25, 3.35, 0.95);
  const hsMat = new THREE.MeshStandardMaterial({ map: makeInscriptionTexture(), roughness: 0.85 });
  const hsBody = add(heartStone, createGraniteStoneGeo(88, 'boulder'), hsMat, 0, 0, 0);
  hsBody.scale.set(1.25, 1.25, 0.72);
  // 投影平面（確保字跡從正面清晰可讀）
  const insPlane = add(heartStone, new THREE.CircleGeometry(0.62, 24), hsMat, 0, 0.05, 0.48, -0.15, 0, 0);
  insPlane.scale.set(1.05, 1.0, 1.0);
  root.add(heartStone);

  // 5. 山頂正中央「雙半月形白碑」（左右對稱彎月弧刀造型，非三角錐）
  const twinMonument = new THREE.Group();
  twinMonument.position.set(-0.35, 5.75, -2.15);
  add(twinMonument, createCrescentBladeGeo(-1), cWhite, -0.14, 0.15, 0);
  add(twinMonument, createCrescentBladeGeo(1), cWhite, 0.14, 0.15, 0);
  add(twinMonument, new THREE.BoxGeometry(1.45, 0.28, 0.62), cWhite, 0, 0.12, 0);
  root.add(twinMonument);

  // 6. 多簇立體杜鵑花叢（每叢 4 顆高低花球＋綠葉托底，取代平滑單球）
  const azaleaCols = ['#db2777', '#ec4899', '#dc2626', '#f8fafc'];
  const azaleaMats = azaleaCols.map((hx) => new THREE.MeshStandardMaterial({ color: hx, roughness: 0.82 }));
  const azaleaLeafMat = new THREE.MeshStandardMaterial({ color: '#2e5d2b', roughness: 0.88 });
  const azaleaCoords = [
    [-6.6, 0.65, 3.7, 0.52], [-2.5, 0.82, 3.4, 0.60], [1.4, 0.88, 3.3, 0.58], [3.9, 0.70, 3.6, 0.55],
    [-4.1, 1.60, 2.3, 0.52], [-1.2, 1.80, 2.2, 0.62], [2.4, 1.72, 2.1, 0.56], [4.9, 1.62, 2.3, 0.52],
    [-2.8, 2.85, 0.8, 0.55], [1.5, 2.75, 0.7, 0.58], [4.1, 2.85, 0.9, 0.50],
    [-3.5, 4.10, -0.8, 0.52], [2.2, 4.20, -0.7, 0.52], [-1.6, 5.30, -1.9, 0.54],
  ];
  azaleaCoords.forEach(([ax, ay, az, as], idx) => {
    const fg = new THREE.Group();
    fg.position.set(ax, ay - 0.1, az);
    const mat = azaleaMats[idx % azaleaMats.length];
    [
      [-0.45, 0.02, 0.18, 0.48], [0.42, 0.04, -0.15, 0.46], [0, 0.14, -0.25, 0.54],
      [-0.18, 0.12, 0.28, 0.45], [0.22, 0.16, 0.22, 0.44], [0, 0.0, 0, 0.55],
    ].forEach(([ox, oy, oz, r], j) => {
      const pG = new THREE.IcosahedronGeometry(as * r, 1);
      pG.scale(1.15, 0.72, 1.05);
      add(fg, pG, j === 5 ? azaleaLeafMat : mat, ox * as, oy * as, oz * as, j, idx, 0);
    });
    root.add(fg);
  });

  // 7. 造景蒼勁斜幹松樹與後方山坡松林
  function addPineTree(x, y, z, scale = 1, lean = 0.25) {
    const pg = new THREE.Group();
    pg.position.set(x, y, z);
    pg.scale.setScalar(scale);
    add(pg, new THREE.CylinderGeometry(0.10, 0.16, 1.9, 7), cWood, 0, 0.9, 0, 0, 0, lean);
    const tx = -Math.sin(lean) * 1.4;
    const ty = Math.cos(lean) * 1.4;
    [
      [tx, ty + 0.35, 0, 1.45, 0.42, 1.15],
      [tx - Math.sign(lean || 1) * 0.65, ty + 0.65, 0.2, 1.15, 0.36, 0.95],
      [tx * 0.5, ty - 0.1, -0.2, 1.05, 0.34, 0.90],
    ].forEach(([px, py, pz, sx, sy, sz], idx) => {
      const g = new THREE.IcosahedronGeometry(0.75, 1);
      g.scale(sx, sy, sz);
      add(pg, g, idx % 2 === 0 ? cPine1 : cPine2, px, py, pz, 0, idx * 0.8, 0);
    });
    root.add(pg);
  }
  addPineTree(-6.2, 1.5, 2.2, 1.25, -0.28);
  addPineTree(-1.8, 2.3, 1.4, 1.05, 0.32);
  addPineTree(6.3, 1.9, 1.6, 1.20, 0.24);
  addPineTree(1.9, 3.6, -0.4, 1.0, -0.20);
  addPineTree(-4.2, 5.4, -2.5, 1.15, 0.15);
  addPineTree(3.5, 5.5, -2.4, 1.10, -0.15);

  // 8. 左側高聳運動場照明燈桿
  const lightPole = new THREE.Group();
  lightPole.position.set(-8.4, 0, 0.8);
  add(lightPole, new THREE.CylinderGeometry(0.10, 0.16, 8.8, 8), cPole, 0, 4.4, 0, 0, 0, -0.05);
  add(lightPole, new THREE.CylinderGeometry(0.65, 0.55, 0.32, 10), cLamp, 0.22, 8.75, 0, 0.25, 0, -0.15);
  root.add(lightPole);

  function setNightGlow(intensity) {
    cLamp.emissiveIntensity = 0.15 + intensity * 1.45;
  }

  return { group: root, update() {}, setNightGlow };
}
