import * as THREE from 'three';

function getTypedView(binBuf, gltf, accessorIndex) {
  const acc = gltf.accessors[accessorIndex];
  const bv = gltf.bufferViews[acc.bufferView];
  const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const compCount = acc.type === 'VEC3' ? 3 : acc.type === 'VEC2' ? 2 : acc.type === 'VEC4' ? 4 : 1;
  const total = acc.count * compCount;
  if (acc.componentType === 5126) return new Float32Array(binBuf, byteOffset, total);
  if (acc.componentType === 5125) return new Uint32Array(binBuf, byteOffset, total);
  if (acc.componentType === 5123) return new Uint16Array(binBuf, byteOffset, total);
  return new Float32Array(binBuf, byteOffset, total);
}

function loadImageUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

function loadEmbeddedImage(binBuf, gltf, imgIndex) {
  const imgMeta = gltf.images[imgIndex];
  const bv = gltf.bufferViews[imgMeta.bufferView];
  const slice = new Uint8Array(binBuf, bv.byteOffset || 0, bv.byteLength);
  const blob = new Blob([slice], { type: imgMeta.mimeType || 'image/jpeg' });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

export const TERRAIN_TEXTURES = [
  { id: 'zelda', label: '🗡️ 薩爾達曠野風格（去建築）', url: './assets/textures/wolmyeongdong_600m_zelda_2k.jpg?v=2' },
  { id: 'satellite', label: '🛰️ 原版衛星實景', url: './assets/textures/wolmyeongdong_600m_sat_2k.jpg?v=2' },
];

export function createWolmyeongdongTerrain600m(opts = {}) {
  const group = new THREE.Group();
  let topMaterial = null;
  let pendingStyleId = opts.defaultStyle || 'zelda';
  const textureCache = new Map();

  // Solid dark turntable pedestal ring below the 600m terrain block
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(38.5, 39.2, 1.2, 128),
    new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.72, metalness: 0.25 })
  );
  rim.position.y = -6.05;
  rim.receiveShadow = true;
  group.add(rim);

  async function applyTextureUrl(url) {
    if (!topMaterial) return;
    let tex = textureCache.get(url);
    if (!tex) {
      const img = await loadImageUrl(url);
      tex = new THREE.Texture(img);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      textureCache.set(url, tex);
    }
    topMaterial.map = tex;
    topMaterial.needsUpdate = true;
  }

  (async () => {
    try {
      const initTexDef = TERRAIN_TEXTURES.find((s) => s.id === pendingStyleId) || TERRAIN_TEXTURES[0];
      const [res, initImg] = await Promise.all([
        fetch('./assets/models/wolmyeongdong_600m.glb?v=3'),
        loadImageUrl(initTexDef.url).catch(() => null),
      ]);
      if (!res.ok) throw new Error(`GLB HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const view = new DataView(buf);
      const jsonLen = view.getUint32(12, true);
      const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
      const binOff = 20 + jsonLen;
      const binLen = view.getUint32(binOff, true);
      const binBuf = buf.slice(binOff + 8, binOff + 8 + binLen);

      let embeddedTex = null;
      if (initImg) {
        embeddedTex = new THREE.Texture(initImg);
        embeddedTex.flipY = false;
        embeddedTex.colorSpace = THREE.SRGBColorSpace;
        embeddedTex.anisotropy = 8;
        embeddedTex.needsUpdate = true;
        textureCache.set(initTexDef.url, embeddedTex);
      } else if (gltf.textures && gltf.images && gltf.textures.length > 0) {
        const img = await loadEmbeddedImage(binBuf, gltf, gltf.textures[0].source);
        embeddedTex = new THREE.Texture(img);
        embeddedTex.flipY = false;
        embeddedTex.colorSpace = THREE.SRGBColorSpace;
        embeddedTex.anisotropy = 8;
        embeddedTex.needsUpdate = true;
        textureCache.set(TERRAIN_TEXTURES[0].url, embeddedTex);
      }

      for (const mesh of gltf.meshes) {
        for (const prim of mesh.primitives) {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.attributes.POSITION), 3));
          if (prim.attributes.NORMAL !== undefined) {
            geo.setAttribute('normal', new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.attributes.NORMAL), 3));
          } else {
            geo.computeVertexNormals();
          }
          if (prim.attributes.TEXCOORD_0 !== undefined) {
            geo.setAttribute('uv', new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.attributes.TEXCOORD_0), 2));
          }
          const hasColor = prim.attributes.COLOR_0 !== undefined;
          if (hasColor) {
            geo.setAttribute('color', new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.attributes.COLOR_0), 3));
          }
          if (prim.indices !== undefined) {
            geo.setIndex(new THREE.BufferAttribute(getTypedView(binBuf, gltf, prim.indices), 1));
          }

          const matDef = gltf.materials && prim.material !== undefined ? gltf.materials[prim.material] : null;
          const pbr = matDef?.pbrMetallicRoughness;
          let mat;
          if (pbr?.baseColorTexture !== undefined && embeddedTex) {
            mat = new THREE.MeshStandardMaterial({
              map: embeddedTex,
              roughness: pbr.roughnessFactor ?? 0.88,
              metalness: pbr.metallicFactor ?? 0.0,
            });
            topMaterial = mat;
          } else {
            mat = new THREE.MeshStandardMaterial({
              vertexColors: hasColor,
              color: hasColor ? 0xffffff : 0x5c5349,
              roughness: pbr?.roughnessFactor ?? 0.92,
              metalness: pbr?.metallicFactor ?? 0.05,
            });
          }

          const m = new THREE.Mesh(geo, mat);
          m.userData.isTerrainSurface = true;
          m.castShadow = true;
          m.receiveShadow = true;
          group.add(m);
        }
      }
    } catch (err) {
      console.error('Failed to load wolmyeongdong_600m.glb:', err);
    }
    if (pendingStyleId && topMaterial) {
      const found = TERRAIN_TEXTURES.find((s) => s.id === pendingStyleId);
      if (found) applyTextureUrl(found.url);
    }
  })();

  return {
    group,
    update(t) {},
    setTextureStyle(styleId) {
      pendingStyleId = styleId;
      const found = TERRAIN_TEXTURES.find((s) => s.id === styleId);
      if (found && topMaterial) applyTextureUrl(found.url);
    },
  };
}
