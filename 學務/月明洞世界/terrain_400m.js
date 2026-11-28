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

async function loadTexturedGLB(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GLB HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const view = new DataView(buf);
  const jsonLen = view.getUint32(12, true);
  const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
  const binOff = 20 + jsonLen;
  const binLen = view.getUint32(binOff, true);
  const binBuf = buf.slice(binOff + 8, binOff + 8 + binLen);

  const loadedTextures = [];
  if (gltf.textures && gltf.images) {
    for (const texDef of gltf.textures) {
      const img = await loadEmbeddedImage(binBuf, gltf, texDef.source);
      const tex = new THREE.Texture(img);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      loadedTextures.push(tex);
    }
  }

  const root = new THREE.Group();
  for (const mesh of gltf.meshes) {
    for (const prim of mesh.primitives) {
      const geo = new THREE.BufferGeometry();
      const pos = getTypedView(binBuf, gltf, prim.attributes.POSITION);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
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
      if (pbr?.baseColorTexture !== undefined && loadedTextures[pbr.baseColorTexture.index]) {
        mat = new THREE.MeshStandardMaterial({
          map: loadedTextures[pbr.baseColorTexture.index],
          roughness: pbr.roughnessFactor ?? 0.88,
          metalness: pbr.metallicFactor ?? 0.0,
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          vertexColors: hasColor,
          color: hasColor ? 0xffffff : 0x6b6054,
          roughness: pbr?.roughnessFactor ?? 0.92,
          metalness: pbr?.metallicFactor ?? 0.05,
        });
      }

      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      root.add(m);
    }
  }
  return root;
}

export function createWolmyeongdongTerrain() {
  const group = new THREE.Group();

  // Dark turntable rim ring under diorama
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(38.4, 38.8, 0.9, 96),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.2 })
  );
  rim.position.y = -2.65;
  rim.receiveShadow = true;
  group.add(rim);

  loadTexturedGLB('./assets/models/wolmyeongdong_400m.glb')
    .then((terrain) => {
      group.add(terrain);
    })
    .catch((err) => {
      console.error('Failed to load wolmyeongdong_400m.glb:', err);
    });

  return {
    group,
    update(t) {},
  };
}
