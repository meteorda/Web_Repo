// 自然聖殿耶穌像 (AI Hunyuan3D-2 高解析度 73萬面雕塑 + 程式化實景基座)
import * as THREE from 'three';

/**
 * 輕量零依賴 GLB 解析器（專用於讀取 three-lite 支援的 BufferGeometry）
 */
async function loadGLBMesh(url, material) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const dv = new DataView(buf);
  const magic = dv.getUint32(0, true);
  if (magic !== 0x46546C67) throw new Error('Invalid GLB magic');

  let offset = 12;
  let gltf = null;
  let binBuf = null;
  while (offset < buf.byteLength) {
    const chunkLen = dv.getUint32(offset, true);
    const chunkType = dv.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    if (chunkType === 0x4E4F534A) {
      const jsonStr = new TextDecoder().decode(new Uint8Array(buf, chunkStart, chunkLen));
      gltf = JSON.parse(jsonStr);
    } else if (chunkType === 0x004E4942) {
      binBuf = buf.slice(chunkStart, chunkStart + chunkLen);
    }
    offset = chunkStart + chunkLen;
  }

  const group = new THREE.Group();
  const accessors = gltf.accessors || [];
  const bufferViews = gltf.bufferViews || [];

  const getTypedArray = (accIdx) => {
    const acc = accessors[accIdx];
    const bv = bufferViews[acc.bufferView];
    const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const numComp = acc.type === 'VEC3' ? 3 : (acc.type === 'VEC2' ? 2 : 1);
    const count = acc.count * numComp;
    if (acc.componentType === 5126) return new Float32Array(binBuf, byteOffset, count);
    if (acc.componentType === 5125) return new Uint32Array(binBuf, byteOffset, count);
    if (acc.componentType === 5123) return new Uint16Array(binBuf, byteOffset, count);
    return null;
  };

  for (const meshDef of (gltf.meshes || [])) {
    for (const prim of (meshDef.primitives || [])) {
      const geo = new THREE.BufferGeometry();
      if (prim.attributes.POSITION !== undefined) {
        const pos = getTypedArray(prim.attributes.POSITION);
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      }
      if (prim.attributes.COLOR_0 !== undefined) {
        const col = getTypedArray(prim.attributes.COLOR_0);
        geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      }
      if (prim.indices !== undefined) {
        const idx = getTypedArray(prim.indices);
        geo.setIndex(new THREE.BufferAttribute(idx, 1));
      }
      if (prim.attributes.NORMAL !== undefined) {
        const norm = getTypedArray(prim.attributes.NORMAL);
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
      } else {
        geo.computeVertexNormals();
      }
      geo.computeBoundingBox();
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  return group;
}

/**
 * 建立自然聖殿耶穌像 3D 群組
 * @param {object} opts { withLawn: boolean }
 */
export function createJesusStatue(opts = {}) {
  const { withLawn = true } = opts;
  const root = new THREE.Group();

  const cMarble = new THREE.MeshStandardMaterial({
    color: '#f7f5f0',
    roughness: 0.36,
    metalness: 0.04,
    flatShading: false,
  });
  const cGranite = new THREE.MeshStandardMaterial({ color: '#c8c6bf', roughness: 0.86, flatShading: false });
  const cGraniteDark = new THREE.MeshStandardMaterial({ color: '#95938b', roughness: 0.9, flatShading: false });
  const cGold = new THREE.MeshStandardMaterial({ color: '#d8b244', roughness: 0.28, metalness: 0.72, flatShading: false });
  const cGrass = new THREE.MeshStandardMaterial({ color: '#589e46', roughness: 0.92, flatShading: false });
  const cSand = new THREE.MeshStandardMaterial({ color: '#d6b88d', roughness: 0.9, flatShading: false });
  const cMonument = new THREE.MeshStandardMaterial({ color: '#bfa88c', roughness: 0.88, flatShading: false });
  const cInk = new THREE.MeshStandardMaterial({ color: '#1f1d1b', roughness: 0.75 });
  const cPineTrunk = new THREE.MeshStandardMaterial({ color: '#5c3d28', roughness: 0.9, flatShading: false });
  const cPineLeaf = new THREE.MeshStandardMaterial({ color: '#3b7336', roughness: 0.85, flatShading: true });
  const cShrub = new THREE.MeshStandardMaterial({ color: '#2d5c29', roughness: 0.88, flatShading: false });

  const addMesh = (parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // =========================================================
  // 1. 陽光草皮與前庭地坪
  // =========================================================
  if (withLawn) {
    addMesh(root, new THREE.CylinderGeometry(18, 19, 0.5, 48), cGrass, 0, -0.25, 0);
    addMesh(root, new THREE.CylinderGeometry(7.5, 7.5, 0.08, 36, 1, false, -Math.PI * 0.45, Math.PI * 0.9), cSand, 0, 0.03, 3.5, 0, Math.PI, 0);
    addMesh(root, new THREE.BoxGeometry(16, 1.8, 7), cGrass, 0, 0.4, -7.2, 0.12, 0, 0);
  }

  // =========================================================
  // 2. 花崗岩巨石基座 ＋ 金色奔馬題字浮雕 ＋ 石欄杆
  // =========================================================
  const Y_PED_H = 2.15;
  addMesh(root, new THREE.BoxGeometry(3.8, 0.18, 3.6), cGraniteDark, 0, 0.09, 0);
  addMesh(root, new THREE.CylinderGeometry(1.75, 1.88, Y_PED_H, 4), cGranite, 0, 0.18 + Y_PED_H / 2, 0, 0, Math.PI / 4);
  addMesh(root, new THREE.BoxGeometry(2.62, 0.12, 2.52), cGranite, 0, 0.18 + Y_PED_H, 0);

  const reliefG = new THREE.Group();
  reliefG.position.set(0, 1.18, 1.28);
  const plaqueCanvas = document.createElement('canvas');
  plaqueCanvas.width = 512;
  plaqueCanvas.height = 384;
  const ctx = plaqueCanvas.getContext('2d');
  ctx.fillStyle = '#dcdad5';
  ctx.fillRect(0, 0, 512, 384);
  ctx.strokeStyle = '#c89b2b';
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, 472, 344);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b8861e';
  ctx.font = 'bold 58px "Malgun Gothic", "Noto Sans KR", serif';
  ctx.fillText('예수님', 258, 132);
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('자연성전', 258, 222);
  ctx.font = '600 24px Georgia, serif';
  ctx.fillText('NATURAL TEMPLE', 258, 294);
  ctx.fillStyle = '#e5bd4b';
  ctx.font = 'bold 58px "Malgun Gothic", "Noto Sans KR", serif';
  ctx.fillText('예수님', 256, 130);
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('자연성전', 256, 220);
  ctx.font = '600 24px Georgia, serif';
  ctx.fillText('NATURAL TEMPLE', 256, 292);
  const plaqueTex = new THREE.Texture(plaqueCanvas);
  plaqueTex.colorSpace = THREE.SRGBColorSpace;
  plaqueTex.needsUpdate = true;
  const plaqueMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.72, 1.28),
    new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.45, metalness: 0.25 })
  );
  plaqueMesh.rotation.x = -0.04;
  reliefG.add(plaqueMesh);
  root.add(reliefG);

  const fenceR = 2.1;
  [[-fenceR, fenceR], [-0.75, fenceR], [0.75, fenceR], [fenceR, fenceR],
   [-fenceR, 0], [fenceR, 0], [-fenceR, -fenceR], [0, -fenceR], [fenceR, -fenceR]].forEach(([fx, fz]) => {
    addMesh(root, new THREE.BoxGeometry(0.18, 0.68, 0.18), cGranite, fx, 0.34, fz);
  });
  addMesh(root, new THREE.BoxGeometry(fenceR * 2 + 0.16, 0.1, 0.1), cGranite, 0, 0.6, fenceR);
  addMesh(root, new THREE.BoxGeometry(fenceR * 2 + 0.16, 0.1, 0.1), cGranite, 0, 0.6, -fenceR);
  addMesh(root, new THREE.BoxGeometry(0.1, 0.1, fenceR * 2), cGranite, -fenceR, 0.6, 0);
  addMesh(root, new THREE.BoxGeometry(0.1, 0.1, fenceR * 2), cGranite, fenceR, 0.6, 0);

  // =========================================================
  // 3. 載入 AI Hunyuan3D-2 生成之 73 萬面高精度耶穌像 GLB
  // =========================================================
  const Y_STATUE_BASE = 0.24 + Y_PED_H; // 2.39
  const statueAnchor = new THREE.Group();
  statueAnchor.position.set(0, Y_STATUE_BASE, 0);
  root.add(statueAnchor);

  // 圓盤底座
  addMesh(statueAnchor, new THREE.CylinderGeometry(0.92, 1.0, 0.14, 48), cMarble, 0, 0.07, 0);

  // 載入過程中顯示柔和光柱佔位
  const placeholder = addMesh(statueAnchor, new THREE.CylinderGeometry(0.3, 0.45, 2.8, 16), cMarble, 0, 1.5, 0);

  loadGLBMesh('./assets/models/jesus_statue.glb', cMarble).then((glbGroup) => {
    statueAnchor.remove(placeholder);
    const mesh = glbGroup.children[0];
    const geo = mesh.geometry;
    const box = geo.boundingBox;
    const h = box.max.y - box.min.y;
    const targetH = 3.85;
    const scale = targetH / h;
    glbGroup.scale.setScalar(scale);

    // 以「腳底／裙擺最底端 8% 高度」的頂點質心對齊圓盤正中央，避免雙手前伸拉偏重心
    const posAttr = geo.attributes.position;
    const footCutY = box.min.y + h * 0.08;
    let sumX = 0, sumZ = 0, cnt = 0;
    for (let i = 0; i < posAttr.count; i++) {
      if (posAttr.getY(i) <= footCutY) {
        sumX += posAttr.getX(i);
        sumZ += posAttr.getZ(i);
        cnt++;
      }
    }
    const cx = cnt > 0 ? sumX / cnt : (box.min.x + box.max.x) / 2;
    const cz = cnt > 0 ? sumZ / cnt : (box.min.z + box.max.z) / 2;

    glbGroup.position.set(
      -cx * scale,
      0.12 - box.min.y * scale,
      -cz * scale
    );
    statueAnchor.add(glbGroup);
  }).catch((err) => {
    console.error('載入 jesus_statue.glb 失敗:', err);
  });

  // =========================================================
  // 4. 左後方「자연성전（自然聖殿）」9.8萬面實景雕刻石碑 ＋ 岩石造景 ＋ 松樹
  // =========================================================
  const monument = new THREE.Group();
  monument.position.set(-4.6, 1.65, -3.2);
  monument.rotation.y = 0.25;
  root.add(monument);

  const cStoneVertex = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.04,
    flatShading: false,
  });
  // 下方天然延伸基岩（補齊原本被花草遮住的石碑下半部，紮實插入山坡）
  addMesh(monument, new THREE.CylinderGeometry(1.02, 1.42, 2.2, 10), cMonument, 0, -0.75, 0, 0, 0.3, 0);
  const monPlaceholder = addMesh(monument, new THREE.CylinderGeometry(0.75, 1.15, 4.2, 14), cMonument, 0, 2.1, 0);
  loadGLBMesh('./assets/models/nature_temple_stone.glb', cStoneVertex).then((stoneGroup) => {
    monument.remove(monPlaceholder);
    stoneGroup.scale.set(1.0, 1.18, 1.0);
    monument.add(stoneGroup);
  }).catch((err) => {
    console.error('載入 nature_temple_stone.glb 失敗:', err);
  });

  [
    [-3.6, 0.4, -1.8, 1.0, 0.7, 0.9],
    [-4.8, 0.5, -1.4, 1.1, 0.8, 1.0],
    [-5.8, 0.3, -2.2, 1.2, 0.75, 1.1],
    [-3.2, 0.3, -3.6, 0.9, 0.65, 0.8],
  ].forEach(([x, y, z, sx, sy, sz], i) => {
    const g = new THREE.DodecahedronGeometry(0.65, 1);
    g.scale(sx, sy, sz);
    addMesh(root, g, cGraniteDark, x, y, z, 0, i, 0);
  });
  [[-3.8, 0.5, -0.7, 0.55], [-5.4, 0.6, -0.8, 0.62], [-2.9, 0.45, -2.5, 0.48]].forEach(([x, y, z, r]) => {
    addMesh(root, new THREE.IcosahedronGeometry(r, 2), cShrub, x, y, z);
  });

  function addPineTree(x, y, z, scale = 1, lean = 0.15) {
    const pg = new THREE.Group();
    pg.position.set(x, y, z);
    pg.scale.setScalar(scale);
    addMesh(pg, new THREE.CylinderGeometry(0.11, 0.18, 2.4, 10), cPineTrunk, 0, 1.1, 0, 0, 0, lean);
    const pads = [
      [-0.5, 2.4, 0.2, 1.4, 0.45, 1.1],
      [0.45, 2.75, -0.2, 1.5, 0.48, 1.2],
      [0, 3.15, 0, 1.15, 0.4, 1.0],
    ];
    pads.forEach(([px, py, pz, sx, sy, sz], idx) => {
      const geo = new THREE.IcosahedronGeometry(0.75, 1);
      geo.scale(sx, sy, sz);
      addMesh(pg, geo, cPineLeaf, px, py, pz, 0, idx, 0);
    });
    root.add(pg);
  }
  addPineTree(-6.5, 0.2, -4.5, 1.35, -0.2);
  addPineTree(4.8, 0.3, -4.2, 1.25, 0.22);
  addPineTree(6.8, 0.5, -5.8, 1.15, -0.12);

  // =========================================================
  // 5. 夜間聖潔光暈控制
  // =========================================================
  const haloLight = new THREE.DirectionalLight('#ffe4a3', 0);
  haloLight.position.set(0, 2, 10);
  root.add(haloLight);

  function setNightGlow(intensity) {
    cMarble.emissive.set('#fff3d6');
    cMarble.emissiveIntensity = intensity * 0.28;
    haloLight.intensity = intensity * 1.4;
  }

  function update(dt, elapsed) {
    if (haloLight.intensity > 0.05) {
      cMarble.emissiveIntensity = 0.25 + Math.sin(elapsed * 1.5) * 0.05;
    }
  }

  return { group: root, update, setNightGlow };
}
