import * as THREE from 'three';
import { createOctagonalPavilion } from './pavilion.js?v=3';
import { createHall316 } from './hall316.js?v=2';
import { createHolySpiritWaterfall } from './waterfall.js?v=8';
import { createGodsWaterfall } from './gods_waterfall.js?v=2';
import { createJesusStatue } from './jesus_statue.js?v=3';
import { createAmbitionRockery } from './rockery.js?v=8';
import { createCheonggiwaHouse } from './cheonggiwa.js';
import { createGodsTemple } from './gods_temple.js';
import { createWonsanPavilion } from './wonsan_pavilion.js';
import { createStarPeakPavilion } from './star_peak_pavilion.js?v=2';
import { createBirthMemorial } from './birth_memorial.js';
import { createPrayerMountain } from './prayer_mountain.js?v=7';
import { createWhiteSuitGentleman } from './gentleman.js?v=10';
import { createWolmyeongdongTerrain600m, TERRAIN_TEXTURES } from './terrain_600m.js?v=8';
import { createWolmyeongdongTerrainV2, TERRAIN_V2_TEXTURES } from './terrain_600m_v2.js?v=20';

export const BASE_MAPS = [
  { id: 'v1', label: '🗺️ 1 版｜實景／薩爾達貼圖沙盤', textures: TERRAIN_TEXTURES },
  { id: 'v2', label: '🗡️ 2 版｜薩爾達 3D 立體世界', textures: TERRAIN_V2_TEXTURES },
];

export const LANDMARK_DEFS = [
  { id: 'jesus', label: '✝️ 自然聖殿耶穌像', create: () => createJesusStatue({ withLawn: false }) },
  { id: 'waterfall', label: '🌊 聖靈瀑布', create: () => createHolySpiritWaterfall({ withPlaza: false }) },
  { id: 'gods_waterfall', label: '🌊 神的瀑布', create: () => createGodsWaterfall({ withPlaza: false }) },
  { id: 'hall316', label: '🏛️ 316 空提紀念館', create: () => createHall316({ withLake: false }) },
  { id: 'pavilion', label: '🏯 月明湖八角亭', create: () => createOctagonalPavilion({ withLake: false, withFountain: true }) },
  { id: 'rockery', label: '🪨 野心作石頭造景', create: () => createAmbitionRockery({ withPlaza: false }) },
  { id: 'cheonggiwa', label: '🏠 青瓦屋', create: () => createCheonggiwaHouse({ withBase: false }) },
  { id: 'gods_temple', label: '🏯 神的殿', create: () => createGodsTemple({ withBase: false }) },
  { id: 'wonsan_pavilion', label: '⛩️ 圓山八角亭', create: () => createWonsanPavilion({ withBase: false }) },
  { id: 'star_peak_pavilion', label: '⭐ 星峰亭', create: () => createStarPeakPavilion({ withBase: false }) },
  { id: 'birth_memorial', label: '🦅 誕生紀念館', create: () => createBirthMemorial({ withBase: false }) },
  { id: 'prayer_mountain', label: '⛰️ 禱告山', create: () => createPrayerMountain({ withBase: false }) },
];

// 版本 1 與版本 2 完全同步共用的建物座標／朝向／比例／白色光環半徑／前方站位距離
export const LANDMARK_PLACEMENTS = {
  jesus:              { pos: [-9.38, 8.64, 1.71],   rotY: 1.836,  scale: 0.18,   ringR: 1.55, frontDist: 2.05 },
  waterfall:          { pos: [6.02, 7.98, -0.70],   rotY: -0.247, scale: 0.221,  ringR: 2.80, frontDist: 2.25 },
  gods_waterfall:     { pos: [-0.34, 7.97, 6.14],   rotY: 2.204,  scale: 0.1768, ringR: 2.24, frontDist: 1.15, snapY: true, yOffset: -0.36 },
  hall316:            { pos: [6.13, 8.03, 5.99],    rotY: -2.008, frontRotY: -2.55, scale: 0.175,  ringR: 1.95, frontDist: 2.35 },
  pavilion:           { pos: [2.64, 7.60, 4.88],    rotY: 1.519,  frontRotY: -2.80, scale: 0.14,   ringR: 1.75, frontDist: 2.15 },
  rockery:            { pos: [-4.53, 7.61, 3.81],   rotY: 2.733,  scale: 0.2763, ringR: 3.15, frontDist: 1.55, snapY: true, yOffset: -0.40 },
  cheonggiwa:         { pos: [-0.79, 8.64, -4.66],  rotY: -0.758, scale: 0.0829, ringR: 1.45, frontDist: 1.85 },
  gods_temple:        { pos: [-3.04, 8.51, -6.29],  rotY: -0.198, frontRotY: 0.32, scale: 0.168,  ringR: 2.20, frontDist: 1.75 },
  wonsan_pavilion:    { pos: [-18.98, 10.57, 3.88], rotY: 1.796,  scale: 0.14,   ringR: 1.35, frontDist: 1.75 },
  star_peak_pavilion: { pos: [-19.03, 8.49, -6.36], rotY: 1.010,  scale: 0.14,   ringR: 1.35, frontDist: 1.75 },
  birth_memorial:     { pos: [-5.49, 8.23, -0.56],  rotY: -0.055, scale: 0.13,   ringR: 1.65, frontDist: 2.05 },
  prayer_mountain:    { pos: [-4.57, 8.28, -2.05],  rotY: 0.990,  scale: 0.1488, ringR: 1.92, frontDist: 1.15 },
};

function createLandmarkGlowRing(radius) {
  const wrap = new THREE.Group();
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.90,
    side: 2,
  });
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.28,
    side: 2,
  });
  const outer = new THREE.Mesh(new THREE.RingGeometry(radius - 0.10, radius, 48), outerMat);
  outer.rotation.x = -Math.PI / 2;
  outer.userData.ignoreRaycast = true;
  const inner = new THREE.Mesh(new THREE.RingGeometry(radius - 0.38, radius - 0.10, 48), innerMat);
  inner.rotation.x = -Math.PI / 2;
  inner.userData.ignoreRaycast = true;
  wrap.add(outer, inner);
  wrap.userData.ignoreRaycast = true;
  return { wrap, outerMat, innerMat };
}

export function createMasterScene(initialState = {}) {
  const group = new THREE.Group();
  let currentBaseId = initialState.baseMapId || 'v2';
  let baseObj = null;
  const landmarkObjs = new Map();
  const landmarkRings = new Map();
  const visibleSet = new Set(initialState.visibleLandmarks || []);
  let lastNight = 0;
  let lastSnow = false;
  let ringsVisible = true;

  const downRay = new THREE.Raycaster();
  const downDir = new THREE.Vector3(0, -1, 0);
  function sampleTerrainY(x, z, fallbackY) {
    if (!baseObj?.group) return fallbackY;
    const targets = [];
    baseObj.group.traverse((obj) => {
      if (obj.isMesh && !obj.userData.ignoreRaycast && obj.userData.isTerrainSurface) targets.push(obj);
    });
    if (targets.length === 0) return fallbackY;
    downRay.set(new THREE.Vector3(x, 60, z), downDir);
    const hits = downRay.intersectObjects(targets, false);
    return hits.length > 0 ? hits[0].point.y : fallbackY;
  }

  function syncLandmarkTransform(id, obj) {
    const cfg = LANDMARK_PLACEMENTS[id] || { pos: [0, 8, 0], rotY: 0, scale: 0.35, ringR: 1.6, frontDist: 2.0 };
    obj.group.position.set(...cfg.pos);
    obj.group.rotation.set(0, cfg.rotY, 0);
    obj.group.scale.setScalar(cfg.scale);
    const ring = landmarkRings.get(id);
    if (ring) {
      const groundY = cfg.groundY !== undefined ? cfg.groundY : cfg.pos[1];
      ring.wrap.position.set(cfg.pos[0], groundY + 0.05, cfg.pos[2]);
    }
  }

  function setBaseMap(baseId) {
    currentBaseId = baseId;
    if (baseObj?.group) group.remove(baseObj.group);
    const clearZones = Object.values(LANDMARK_PLACEMENTS).map((cfg) => ({
      x: cfg.pos[0],
      z: cfg.pos[2],
      rotY: cfg.rotY,
      frontLen: 1.27, // 20 公尺 (20 * 38 / 600)
      radius: Math.max(1.45, cfg.ringR || 1.6),
    }));
    baseObj = baseId === 'v1'
      ? createWolmyeongdongTerrain600m({ defaultStyle: 'zelda' })
      : createWolmyeongdongTerrainV2({ withMiniPavilion: false, clearZones });
    group.add(baseObj.group);

    // 同步確保版本 1 與版本 2 的所有建物座標完全一致
    for (const [id, obj] of landmarkObjs.entries()) {
      syncLandmarkTransform(id, obj);
    }
  }

  function setLandmarkVisible(id, visible) {
    if (visible) {
      visibleSet.add(id);
      let obj = landmarkObjs.get(id);
      if (!obj) {
        const def = LANDMARK_DEFS.find((d) => d.id === id);
        if (!def) return;
        obj = def.create();
        const cfg = LANDMARK_PLACEMENTS[id] || { pos: [0, 8, 0], rotY: 0, scale: 0.35, ringR: 1.6, frontDist: 2.0 };
        obj.group.traverse((m) => {
          if (m.isMesh) {
            m.userData.landmarkId = id;
            m.userData.isBuildingSurface = true;
          }
        });
        landmarkObjs.set(id, obj);

        const ring = createLandmarkGlowRing((cfg.ringR || 1.6) * 0.75);
        landmarkRings.set(id, ring);
        syncLandmarkTransform(id, obj);
      }
      const ring = landmarkRings.get(id);
      if (!obj.group.parent) group.add(obj.group);
      if (ring) {
        if (!ring.wrap.parent) group.add(ring.wrap);
        ring.wrap.visible = ringsVisible;
      }
      if (obj.setNightGlow) obj.setNightGlow(lastNight);
      if (obj.setSnowMode) obj.setSnowMode(lastSnow);
    } else {
      visibleSet.delete(id);
      const obj = landmarkObjs.get(id);
      const ring = landmarkRings.get(id);
      if (obj?.group?.parent) group.remove(obj.group);
      if (ring?.wrap?.parent) group.remove(ring.wrap);
    }
  }

  // Initialize base map and initial landmarks
  setBaseMap(currentBaseId);
  for (const id of visibleSet) {
    setLandmarkVisible(id, true);
  }

  // ── 「老師」白西裝 NPC：整體比例縮小為 80% (0.405 * 0.8 = 0.324)，在地標之間慢慢散步移動（周圍不加白光圈）──
  const teacher = createWhiteSuitGentleman({ withBase: false });
  teacher.group.scale.setScalar(0.324);
  teacher.group.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.userData.isTeacher = true;
    }
  });
  // 隱形放大點擊感應區，讓手機上輕點老師周圍也能輕鬆命中
  const teacherHitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 1.25, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  teacherHitbox.position.y = 0.62;
  teacherHitbox.userData.isTeacher = true;
  teacher.group.add(teacherHitbox);
  const teacherTourIds = ['rockery', 'birth_memorial', 'prayer_mountain', 'jesus', 'star_peak_pavilion', 'wonsan_pavilion', 'gods_temple', 'cheonggiwa', 'hall316', 'pavilion', 'waterfall', 'gods_waterfall'];
  const getFrontPoint = (id) => {
    const cfg = LANDMARK_PLACEMENTS[id];
    const dist = cfg.frontDist || 2.1;
    const fRot = cfg.frontRotY !== undefined ? cfg.frontRotY : cfg.rotY;
    return {
      x: cfg.pos[0] + Math.sin(fRot) * dist,
      y: cfg.pos[1],
      z: cfg.pos[2] + Math.cos(fRot) * dist,
      lookX: cfg.pos[0],
      lookZ: cfg.pos[2],
    };
  };
  let tourIdx = 0;
  let teacherPause = 1.5;
  let photoHoldTimer = 0;
  let photoLookTarget = null;
  const startPt = getFrontPoint(teacherTourIds[0]);
  teacher.group.position.set(startPt.x, startPt.y, startPt.z);
  group.add(teacher.group);

  // ── 地標建物避障系統（供老師 NPC 與主角漫遊共用：扇形 360° 候選掃描 + 繞行側鎖定 + 往後脫困 + 硬碰撞約束）──
  const getActiveObstacles = () => {
    const list = [];
    for (const id of visibleSet) {
      const cfg = LANDMARK_PLACEMENTS[id];
      if (!cfg) continue;
      const frontDist = cfg.frontDist || 2.1;
      const baseR = cfg.ringR || 1.6;
      // 完整包覆 3D 建物核心並將避障半徑縮小為原本的 50%，確保相鄰模型之間通道寬敞不卡住
      let obsR = Math.max(0.75, Math.min(baseR * 0.80, frontDist - 0.30));
      if (id === 'birth_memorial') obsR = Math.min(obsR, 0.78);
      if (id === 'prayer_mountain') obsR = Math.min(obsR, 0.85);
      if (id === 'cheonggiwa') obsR = Math.min(obsR, 0.95);
      obsR *= 0.5;
      list.push({ id, x: cfg.pos[0], z: cfg.pos[2], r: obsR });
    }
    return list;
  };

  function clampOutsideObstacles(x, z, charRadius = 0.18) {
    let cx = x;
    let cz = z;
    const obsList = getActiveObstacles();
    for (let pass = 0; pass < 3; pass++) {
      for (const ob of obsList) {
        const dx = cx - ob.x;
        const dz = cz - ob.z;
        const d = Math.hypot(dx, dz);
        const minR = ob.r + charRadius;
        if (d < minR) {
          if (d < 1e-4) {
            cx = ob.x + minR;
          } else {
            cx = ob.x + (dx / d) * minR;
            cz = ob.z + (dz / d) * minR;
          }
        }
      }
    }
    return { x: cx, z: cz };
  }

  function isSegmentClear(x0, z0, x1, z1, obsList, charRadius, goalX, goalZ) {
    const sdx = x1 - x0;
    const sdz = z1 - z0;
    const lenSq = sdx * sdx + sdz * sdz;
    if (lenSq < 1e-8) return true;
    for (const ob of obsList) {
      // 若終點就在該障礙物圓外緣極近處且比起點更靠近終點，仍需確保不穿過圓心
      const effR = ob.r + charRadius;
      // 如果目標點本身就在這個障礙物的警戒區內，僅當我們離它夠遠才避讓
      const goalDist = Math.hypot(goalX - ob.x, goalZ - ob.z);
      const safeR = goalDist < effR + 0.05 ? Math.max(0.35, goalDist - 0.05) : effR;

      const vx = ob.x - x0;
      const vz = ob.z - z0;
      let t = (vx * sdx + vz * sdz) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = x0 + t * sdx;
      const pz = z0 + t * sdz;
      if (Math.hypot(px - ob.x, pz - ob.z) < safeR) {
        return false;
      }
    }
    return true;
  }

  const SWEEP_ANGLES = [0, 0.28, -0.28, 0.56, -0.56, 0.88, -0.88, 1.22, -1.22, 1.57, -1.57, 1.98, -1.98, 2.38, -2.38, 2.75, -2.75, Math.PI];

  function pickEscapeAngle(curX, curZ, goalX, goalZ, charRadius) {
    const obsList = getActiveObstacles();
    const awayFromGoal = Math.atan2(curX - goalX, curZ - goalZ);
    // 優先從「往後與側後方」12 個方向中，挑選離所有建物最寬敞的安全方向
    let bestAng = awayFromGoal;
    let bestScore = -Infinity;
    for (let i = 0; i < 12; i++) {
      const ang = awayFromGoal + ((i - 6) / 6) * Math.PI * 0.85;
      const dx = Math.sin(ang);
      const dz = Math.cos(ang);
      const tx = curX + dx * 1.4;
      const tz = curZ + dz * 1.4;
      let minClr = Infinity;
      for (const ob of obsList) {
        const vx = ob.x - curX;
        const vz = ob.z - curZ;
        const proj = Math.max(0, Math.min(1.4, vx * dx + vz * dz));
        const px = curX + dx * proj;
        const pz = curZ + dz * proj;
        const clr = Math.hypot(px - ob.x, pz - ob.z) - (ob.r + charRadius);
        if (clr < minClr) minClr = clr;
      }
      const endClr = minClr + Math.hypot(tx - curX, tz - curZ) * 0.05;
      if (endClr > bestScore) {
        bestScore = endClr;
        bestAng = ang;
      }
    }
    return bestAng;
  }

  function stepAroundObstacles(curX, curZ, goalX, goalZ, stepLen, charRadius = 0.18, navState = null) {
    const rawDx = goalX - curX;
    const rawDz = goalZ - curZ;
    const rawDist = Math.hypot(rawDx, rawDz);
    if (rawDist < 1e-5) return { x: curX, z: curZ, dirX: 0, dirZ: 1 };

    const baseAngle = Math.atan2(rawDx, rawDz);
    const obsList = getActiveObstacles();
    const lookDist = Math.min(rawDist, 1.65);

    // 依序檢查扇形候選方向；若 navState 已鎖定繞行側（+1 或 -1），優先嘗試同側角度以消除左右擺盪
    let angles = SWEEP_ANGLES;
    if (navState?.preferSign) {
      const s = navState.preferSign;
      angles = [0, ...SWEEP_ANGLES.filter((a) => a * s > 0), ...SWEEP_ANGLES.filter((a) => a * s < 0)];
    }

    let chosenAngle = baseAngle;
    let foundClear = false;
    for (const offset of angles) {
      const ang = baseAngle + offset;
      const tx = curX + Math.sin(ang) * lookDist;
      const tz = curZ + Math.cos(ang) * lookDist;
      if (isSegmentClear(curX, curZ, tx, tz, obsList, charRadius + 0.04, goalX, goalZ)) {
        chosenAngle = ang;
        foundClear = true;
        if (navState) {
          if (Math.abs(offset) > 0.05) {
            navState.preferSign = offset > 0 ? 1 : -1;
          } else {
            navState.preferSign = 0;
          }
        }
        break;
      }
    }

    // 若近距離前探全被多棟建築擋住，改用短步試探（lookDist * 0.45）尋找縫隙
    if (!foundClear) {
      const shortLook = Math.min(rawDist, 0.65);
      for (const offset of angles) {
        const ang = baseAngle + offset;
        const tx = curX + Math.sin(ang) * shortLook;
        const tz = curZ + Math.cos(ang) * shortLook;
        if (isSegmentClear(curX, curZ, tx, tz, obsList, charRadius + 0.01, goalX, goalZ)) {
          chosenAngle = ang;
          foundClear = true;
          if (navState && Math.abs(offset) > 0.05) {
            navState.preferSign = offset > 0 ? 1 : -1;
          }
          break;
        }
      }
    }

    const dirX = Math.sin(chosenAngle);
    const dirZ = Math.cos(chosenAngle);
    const next = clampOutsideObstacles(
      curX + dirX * stepLen,
      curZ + dirZ * stepLen,
      charRadius
    );
    const moveDx = next.x - curX;
    const moveDz = next.z - curZ;
    const moveLen = Math.hypot(moveDx, moveDz);
    return {
      x: next.x,
      z: next.z,
      dirX: moveLen > 1e-5 ? moveDx / moveLen : dirX,
      dirZ: moveLen > 1e-5 ? moveDz / moveLen : dirZ,
    };
  }

  const teacherNavState = { preferSign: 0 };
  let teacherStuckTimer = 0;
  let teacherEscapeTimer = 0;
  let teacherEscapeAngle = 0;
  let teacherLastPos = { x: startPt.x, z: startPt.z };

  function updateTeacher(dt, t) {
    // 確保老師即使在站立/揮手/接電話期間，只要地形載入完成就立刻精準貼齊地表，絕不半埋地下
    const groundY = sampleTerrainY(teacher.group.position.x, teacher.group.position.z, null);
    if (groundY !== null) {
      teacher.group.position.y = groundY;
    }

    if (photoHoldTimer > 0) {
      photoHoldTimer -= dt;
      if (photoLookTarget) {
        const targetRot = Math.atan2(photoLookTarget.x - teacher.group.position.x, photoLookTarget.z - teacher.group.position.z);
        let diff = targetRot - teacher.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        teacher.group.rotation.y += diff * Math.min(1, dt * 6);
      }
      teacher.update(dt, t, false);
      return;
    }

    if (teacherPause > 0) {
      teacherPause -= dt;
      const curWp = getFrontPoint(teacherTourIds[tourIdx]);
      const targetRot = Math.atan2(curWp.lookX - teacher.group.position.x, curWp.lookZ - teacher.group.position.z);
      let diff = targetRot - teacher.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      teacher.group.rotation.y += diff * Math.min(1, dt * 4);
      teacher.update(dt, t, false);
      if (teacherPause <= 0) {
        tourIdx = (tourIdx + 1) % teacherTourIds.length;
        teacherNavState.preferSign = 0;
        teacherStuckTimer = 0;
        teacherEscapeTimer = 0;
      }
      return;
    }

    const nextWp = getFrontPoint(teacherTourIds[tourIdx]);
    const dx = nextWp.x - teacher.group.position.x;
    const dz = nextWp.z - teacher.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.25) {
      teacherPause = 2.6;
      teacherNavState.preferSign = 0;
      teacherStuckTimer = 0;
      teacherEscapeTimer = 0;
      teacher.update(dt, t, false);
      return;
    }

    // 老師速度降低為原本 70% (0.78 * 0.7 = 0.546 -> 0.55)
    const speed = 0.55;
    const step = Math.min(dist, speed * dt);
    let steered;
    if (teacherEscapeTimer > 0) {
      teacherEscapeTimer -= dt;
      const escGoalX = teacher.group.position.x + Math.sin(teacherEscapeAngle) * 2.0;
      const escGoalZ = teacher.group.position.z + Math.cos(teacherEscapeAngle) * 2.0;
      steered = stepAroundObstacles(
        teacher.group.position.x,
        teacher.group.position.z,
        escGoalX,
        escGoalZ,
        step,
        0.20,
        teacherNavState
      );
    } else {
      steered = stepAroundObstacles(
        teacher.group.position.x,
        teacher.group.position.z,
        nextWp.x,
        nextWp.z,
        step,
        0.20,
        teacherNavState
      );
    }
    const nx = steered.x;
    const nz = steered.z;
    const ny = sampleTerrainY(nx, nz, teacher.group.position.y);
    teacher.group.position.set(nx, ny, nz);

    // 若被模型卡住不會動時，主動繞往後其他方向脫困後再繼續繞行
    const moved = Math.hypot(nx - teacherLastPos.x, nz - teacherLastPos.z);
    if (moved < speed * dt * 0.22) {
      teacherStuckTimer += dt;
      if (teacherStuckTimer > 0.55) {
        teacherEscapeAngle = pickEscapeAngle(nx, nz, nextWp.x, nextWp.z, 0.20);
        teacherEscapeTimer = 1.6;
        teacherNavState.preferSign = teacherNavState.preferSign === 1 ? -1 : 1;
        teacherStuckTimer = 0;
      }
    } else {
      teacherStuckTimer = Math.max(0, teacherStuckTimer - dt * 2);
    }
    teacherLastPos = { x: nx, z: nz };

    const walkRot = Math.atan2(steered.dirX, steered.dirZ);
    let diff = walkRot - teacher.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    teacher.group.rotation.y += diff * Math.min(1, dt * 6);
    teacher.update(dt, t, true);
  }

  return {
    group,
    setBaseMap,
    getBaseMapId: () => currentBaseId,
    setLandmarkVisible,
    isLandmarkVisible: (id) => visibleSet.has(id),
    getLandmarkPlacement: (id) => LANDMARK_PLACEMENTS[id] || null,
    stepAroundObstacles,
    clampOutsideObstacles,
    getTeacherPose: () => {
      const tx = teacher.group.position.x;
      const tz = teacher.group.position.z;
      let backToLandmarkYaw = teacher.group.rotation.y + Math.PI;
      if (teacherPause > 0) {
        const curWp = getFrontPoint(teacherTourIds[tourIdx]);
        backToLandmarkYaw = Math.atan2(tx - curWp.lookX, tz - curWp.lookZ);
      } else {
        let bestD = Infinity;
        for (const id of visibleSet) {
          const cfg = LANDMARK_PLACEMENTS[id];
          if (!cfg) continue;
          const d = Math.hypot(tx - cfg.pos[0], tz - cfg.pos[2]);
          if (d < bestD) {
            bestD = d;
            backToLandmarkYaw = Math.atan2(tx - cfg.pos[0], tz - cfg.pos[2]);
          }
        }
      }
      return {
        x: tx,
        y: teacher.group.position.y,
        z: tz,
        rotY: teacher.group.rotation.y,
        isViewingLandmark: teacherPause > 0,
        backToLandmarkYaw,
      };
    },
    pauseTeacherForPhoto(lookX, lookZ, durationSec = 10) {
      photoHoldTimer = durationSec;
      photoLookTarget = { x: lookX, z: lookZ };
    },
    triggerTeacherPat(durationSec = 1.5) {
      if (teacher?.setGesture) teacher.setGesture('pat', durationSec);
    },
    triggerTeacherWave(lookX, lookZ, durationSec = 1.8) {
      photoHoldTimer = durationSec;
      if (lookX !== undefined && lookZ !== undefined) {
        photoLookTarget = { x: lookX, z: lookZ };
      }
      if (teacher?.setGesture) teacher.setGesture('wave', durationSec);
    },
    triggerTeacherPhone(lookX, lookZ, durationSec = 0.8) {
      photoHoldTimer = durationSec;
      if (lookX !== undefined && lookZ !== undefined) {
        photoLookTarget = { x: lookX, z: lookZ };
      }
      if (teacher?.setGesture) teacher.setGesture('phone', durationSec);
    },
    setRingsVisible(show) {
      ringsVisible = !!show;
      for (const [id, ring] of landmarkRings.entries()) {
        if (ring?.wrap) ring.wrap.visible = ringsVisible && visibleSet.has(id);
      }
    },
    setTextureStyle(styleId) {
      if (baseObj?.setTextureStyle) baseObj.setTextureStyle(styleId);
    },
    setNightGlow(val) {
      lastNight = val;
      for (const id of visibleSet) {
        const obj = landmarkObjs.get(id);
        if (obj?.setNightGlow) obj.setNightGlow(val);
      }
    },
    setSnowMode(val) {
      lastSnow = val;
      for (const id of visibleSet) {
        const obj = landmarkObjs.get(id);
        if (obj?.setSnowMode) obj.setSnowMode(val);
      }
    },
    update(dt, elapsed) {
      const t = elapsed !== undefined ? elapsed : dt;
      if (baseObj?.update) baseObj.update(t);
      for (const id of visibleSet) {
        const obj = landmarkObjs.get(id);
        const cfg = LANDMARK_PLACEMENTS[id];
        if (cfg?.snapY && obj && !cfg._snapped) {
          const sy = sampleTerrainY(cfg.pos[0], cfg.pos[2], null);
          if (sy !== null) {
            cfg.groundY = sy;
            cfg.pos[1] = sy + (cfg.yOffset || 0);
            cfg._snapped = true;
            syncLandmarkTransform(id, obj);
          }
        }
        if (obj?.update) obj.update(dt, t);
        const ring = landmarkRings.get(id);
        if (ring) {
          const pulse = (Math.sin(t * 2.8) + 1) * 0.5;
          ring.outerMat.opacity = 0.72 + pulse * 0.25;
          ring.innerMat.opacity = 0.16 + pulse * 0.18;
          const sc = 0.98 + pulse * 0.04;
          ring.wrap.scale.set(sc, 1, sc);
        }
      }
      updateTeacher(dt, t);
    },
  };
}
