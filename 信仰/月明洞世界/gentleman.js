import * as THREE from 'three';

/**
 * Q版和藹可親「白西裝＋白皮帶＋金黃領帶＋白皮鞋」3D 人物
 * 採 2.3 頭身 Q 版比例：大圓臉、溫暖彎笑眼、柔和鼻頭、順滑偏分黑髮與俐落白西裝
 */
export function createWhiteSuitGentleman(options = {}) {
  const { withBase = true } = options;
  const root = new THREE.Group();

  // ── 材質（柔和溫暖膚色＋層次分明白色系西裝／襯衫／皮帶／皮鞋）──
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf6c9a5, roughness: 0.56, metalness: 0.02 });
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xf4aa98, roughness: 0.78 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e2028, roughness: 0.44, metalness: 0.06 });
  const hairSheenMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.36, metalness: 0.10 });
  const eyeDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e1410, roughness: 0.14, metalness: 0.08 });
  const whiteGlossMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.10 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xc2554e, roughness: 0.62 });
  const teethMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.24 });

  const suitMat = new THREE.MeshStandardMaterial({ color: 0xf1f4f9, roughness: 0.54, metalness: 0.03 });
  const suitTrimMat = new THREE.MeshStandardMaterial({ color: 0xdfe5ef, roughness: 0.64 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.44 });
  const tieMat = new THREE.MeshStandardMaterial({ color: 0xf3b826, roughness: 0.36, metalness: 0.12 });
  const tieShadeMat = new THREE.MeshStandardMaterial({ color: 0xd69a16, roughness: 0.42 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0xfcfdff, roughness: 0.28, metalness: 0.04 });
  const buckleMat = new THREE.MeshStandardMaterial({ color: 0xd0d7e2, roughness: 0.20, metalness: 0.85 });
  const buttonMat = new THREE.MeshStandardMaterial({ color: 0xdce3ee, roughness: 0.28, metalness: 0.15 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf9fbff, roughness: 0.26, metalness: 0.06 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xc8d0dc, roughness: 0.58 });

  if (withBase) {
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.60, 0.66, 0.07, 40),
      new THREE.MeshStandardMaterial({ color: 0x263244, roughness: 0.75 })
    );
    ped.position.y = 0.035;
    ped.receiveShadow = true;
    root.add(ped);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.54, 0.59, 40),
      new THREE.MeshBasicMaterial({ color: 0xf3b826, side: 2 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.072;
    root.add(ring);
  }

  const baseOffset = withBase ? 0.07 : 0;
  const charGroup = new THREE.Group();
  charGroup.position.y = baseOffset;
  root.add(charGroup);

  const bodyPivot = new THREE.Group();
  charGroup.add(bodyPivot);

  function part(geo, mat, parent, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.scale.set(scale[0], scale[1], scale[2]);
    m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // ── 1. Q 版短腿與圓潤白皮鞋 ──
  function makeLeg(side) {
    const x = side * 0.105;
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.42, 0);

    // 圓潤短西裝褲管
    part(new THREE.CylinderGeometry(0.088, 0.076, 0.26, 20), suitMat, pivot, [0, -0.13, 0]);
    part(new THREE.CylinderGeometry(0.078, 0.080, 0.024, 18), suitTrimMat, pivot, [0, -0.255, 0]);
    // 白襪腳踝
    part(new THREE.CylinderGeometry(0.052, 0.050, 0.045, 16), shirtMat, pivot, [0, -0.282, 0]);

    // Q 版圓潤白皮鞋
    const shoe = new THREE.Group();
    shoe.position.set(0, -0.34, 0.032);
    pivot.add(shoe);

    part(new THREE.SphereGeometry(0.074, 18, 14), shoeMat, shoe, [0, 0.006, 0.020], [0.95, 0.62, 1.32]);
    part(new THREE.CylinderGeometry(0.068, 0.072, 0.022, 18), soleMat, shoe, [0, -0.026, 0.020], [0.96, 1, 1.30]);
    // 兩道細白鞋帶
    part(new THREE.CylinderGeometry(0.005, 0.005, 0.056, 8), suitTrimMat, shoe, [0, 0.044, 0.022], [1, 1, 1], [0, 0, Math.PI / 2]);
    part(new THREE.CylinderGeometry(0.005, 0.005, 0.050, 8), suitTrimMat, shoe, [0, 0.040, 0.046], [1, 1, 1], [0, 0, Math.PI / 2]);

    bodyPivot.add(pivot);
    return pivot;
  }

  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // ── 2. Q 版褲腰＋白色皮帶＋銀色腰釦 ──
  part(new THREE.CylinderGeometry(0.185, 0.192, 0.12, 24), suitMat, bodyPivot, [0, 0.45, 0], [1.05, 1, 0.85]);

  const beltGroup = new THREE.Group();
  beltGroup.position.set(0, 0.515, 0);
  bodyPivot.add(beltGroup);
  part(new THREE.CylinderGeometry(0.194, 0.194, 0.042, 26), beltMat, beltGroup, [0, 0, 0], [1.05, 1, 0.86]);
  // 金屬銀色皮帶釦
  part(new THREE.BoxGeometry(0.066, 0.052, 0.018), buckleMat, beltGroup, [0, 0, 0.168]);
  part(new THREE.BoxGeometry(0.042, 0.032, 0.020), beltMat, beltGroup, [0, 0, 0.169]);

  // ── 3. Q 版圓潤白西裝上身＋白襯衫＋金黃領帶 ──
  const torso = new THREE.Group();
  torso.position.set(0, 0.72, 0);
  bodyPivot.add(torso);

  // 白襯衫內裡＋領口
  part(new THREE.CylinderGeometry(0.175, 0.185, 0.36, 24), shirtMat, torso, [0, 0, 0.008], [1.04, 1, 0.82]);
  part(new THREE.CylinderGeometry(0.088, 0.098, 0.048, 20), shirtMat, torso, [0, 0.195, 0.006]);
  part(new THREE.BoxGeometry(0.066, 0.046, 0.016), shirtMat, torso, [-0.044, 0.178, 0.098], [1, 1, 1], [-0.30, 0.28, 0.34]);
  part(new THREE.BoxGeometry(0.066, 0.046, 0.016), shirtMat, torso, [0.044, 0.178, 0.098], [1, 1, 1], [-0.30, -0.28, -0.34]);

  // 金黃色領帶（比例放大一些，Q 版更顯眼可愛）
  const tie = new THREE.Group();
  tie.position.set(0, 0.165, 0.154);
  torso.add(tie);
  part(new THREE.CylinderGeometry(0.032, 0.022, 0.042, 6), tieMat, tie, [0, 0, 0.004], [1.05, 1, 0.62]);
  part(new THREE.BoxGeometry(0.034, 0.012, 0.016), tieShadeMat, tie, [0, -0.019, 0.002]);
  part(new THREE.CylinderGeometry(0.020, 0.036, 0.22, 4), tieMat, tie, [0, -0.130, 0.004], [1.15, 1, 0.22], [0, Math.PI / 4, 0]);
  part(new THREE.ConeGeometry(0.036, 0.060, 4), tieMat, tie, [0, -0.270, 0.004], [1.15, 1, 0.22], [0, Math.PI / 4, Math.PI]);

  // 圓滑包覆式 Q 版白西裝外套（敞開正面，清楚露出金黃領帶與白色皮帶）
  part(new THREE.CylinderGeometry(0.192, 0.204, 0.36, 28, 1, false, Math.PI * 0.24, Math.PI * 1.52), suitMat, torso, [0, -0.005, -0.004], [1.08, 1, 0.86]);
  part(new THREE.SphereGeometry(0.192, 22, 16), suitMat, torso, [0, 0.155, -0.004], [1.14, 0.40, 0.84]);
  // 西裝駁頭翻領
  [-1, 1].forEach((s) => {
    part(new THREE.BoxGeometry(0.052, 0.18, 0.016), suitMat, torso, [s * 0.088, 0.08, 0.145], [1, 1, 1], [0.08, s * 0.26, s * 0.22]);
  });
  // 口袋與白釦
  part(new THREE.BoxGeometry(0.054, 0.012, 0.012), suitTrimMat, torso, [0.125, 0.065, 0.144], [1, 1, 1], [0, 0.22, 0.06]);
  part(new THREE.CylinderGeometry(0.012, 0.012, 0.010, 12), buttonMat, torso, [-0.075, -0.06, 0.146], [1, 1, 1], [Math.PI / 2, 0, 0]);
  part(new THREE.CylinderGeometry(0.012, 0.012, 0.010, 12), buttonMat, torso, [-0.075, -0.13, 0.146], [1, 1, 1], [Math.PI / 2, 0, 0]);

  // ── 4. Q 版圓潤短手 ──
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.235, 0.86, 0);
    pivot.rotation.z = side * 0.20;

    part(new THREE.SphereGeometry(0.074, 16, 14), suitMat, pivot, [0, 0, 0]);
    part(new THREE.CylinderGeometry(0.068, 0.058, 0.24, 16), suitMat, pivot, [0, -0.12, 0]);
    part(new THREE.CylinderGeometry(0.054, 0.052, 0.026, 14), shirtMat, pivot, [0, -0.245, 0]);
    // 圓可愛小手掌
    part(new THREE.SphereGeometry(0.052, 16, 14), skinMat, pivot, [0, -0.285, 0.005], [0.95, 1.05, 0.92]);

    bodyPivot.add(pivot);
    return pivot;
  }

  const armL = makeArm(-1);
  const armR = makeArm(1);

  // 老師接電話專用可愛手機 (平時隱藏)
  const phoneMesh = new THREE.Group();
  const pBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.14, 0.022),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
  );
  const pScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.10, 0.008),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.55 })
  );
  pScreen.position.z = 0.012;
  phoneMesh.add(pBody, pScreen);
  phoneMesh.position.set(0.04, -0.44, 0.04);
  phoneMesh.visible = false;
  armR.add(phoneMesh);

  // ── 5. Q 版大圓頭＋和藹可親笑臉＋順滑偏分黑髮 ──
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.91, 0);
  headGroup.scale.setScalar(0.8);
  bodyPivot.add(headGroup);

  part(new THREE.CylinderGeometry(0.075, 0.088, 0.08, 18), skinMat, headGroup, [0, 0.01, 0]);

  const skull = new THREE.Group();
  skull.position.set(0, 0.34, 0.02);
  headGroup.add(skull);

  // 飽滿圓潤 Q 版大頭（單一順滑圓球，完全無尖角凹陷）
  part(new THREE.SphereGeometry(0.345, 36, 30), skinMat, skull, [0, 0, 0], [1.03, 0.97, 0.96]);

  // 溫暖貼面粉嫩腮紅（柔和貼合臉頰）
  [-1, 1].forEach((s) => {
    part(new THREE.SphereGeometry(0.050, 14, 12), blushMat, skull, [s * 0.160, -0.056, 0.282], [1.18, 0.65, 0.14], [0, s * 0.45, 0]);
  });

  // 可愛圓耳
  [-1, 1].forEach((s) => {
    part(new THREE.SphereGeometry(0.058, 16, 14), skinMat, skull, [s * 0.340, -0.020, 0.01], [0.46, 1.05, 0.78]);
  });

  // 小巧圓潤鼻子
  part(new THREE.SphereGeometry(0.026, 16, 14), skinMat, skull, [0, -0.030, 0.340], [1.08, 0.86, 0.85]);

  // 和藹可親大笑眼（亮面黑瞳＋雙高光點＋溫柔上揚眉弧）
  [-1, 1].forEach((s) => {
    // 溫柔對稱拱形眉弧
    part(new THREE.TorusGeometry(0.044, 0.009, 8, 16, Math.PI * 0.56), hairMat, skull, [s * 0.114, 0.068, 0.305], [1.1, 0.65, 0.6], [0.10, s * 0.24, Math.PI * 0.22]);
    // 圓亮微笑大眼
    part(new THREE.SphereGeometry(0.038, 18, 16), eyeDarkMat, skull, [s * 0.112, 0.015, 0.312], [1.05, 1.08, 0.44], [0, s * 0.24, 0]);
    part(new THREE.SphereGeometry(0.013, 10, 10), whiteGlossMat, skull, [s * 0.122, 0.028, 0.326]);
    part(new THREE.SphereGeometry(0.0065, 8, 8), whiteGlossMat, skull, [s * 0.102, 0.003, 0.326]);
  });

  // 親切開朗微笑弧線（嘴角向上彎的溫暖笑口）
  part(new THREE.TorusGeometry(0.054, 0.0095, 10, 20, Math.PI * 0.72), mouthMat, skull, [0, -0.088, 0.308], [1.15, 0.72, 0.40], [-0.18, 0, Math.PI * 1.14]);

  // ── 順滑可愛偏分黑髮（後移上提，完整露出額頭、眉毛與笑眼）──
  const hair = new THREE.Group();
  skull.add(hair);

  part(new THREE.SphereGeometry(0.356, 32, 26), hairMat, hair, [0, 0.125, -0.072], [1.02, 0.92, 1.00]);
  part(new THREE.SphereGeometry(0.332, 26, 20), hairMat, hair, [0, -0.030, -0.092], [0.98, 0.94, 0.94]);
  // 兩側耳旁柔順鬢髮
  [-1, 1].forEach((s) => {
    part(new THREE.SphereGeometry(0.088, 16, 14), hairMat, hair, [s * 0.298, 0.055, -0.015], [0.46, 1.25, 1.02]);
  });
  // 左偏分向右梳大弧度瀏海（柔和上揚露額頭）
  part(new THREE.SphereGeometry(0.255, 24, 18), hairSheenMat, hair, [0.072, 0.248, 0.028], [1.15, 0.52, 0.92], [0.16, 0, -0.18]);
  part(new THREE.SphereGeometry(0.195, 20, 16), hairMat, hair, [-0.140, 0.232, 0.030], [0.95, 0.48, 0.88], [0.18, 0, 0.22]);

  // ── 6. Q 版輕快走路、待機與互動手勢（摸頭 / 揮手掰掰）動畫 ──
  let walkPhase = 0;
  let gestureType = null;
  let gestureTimer = 0;

  function setGesture(type, durationSec = 1.6) {
    gestureType = type;
    gestureTimer = durationSec;
  }

  function update(dt = 0.016, elapsed = 0, isMoving = false) {
    if (gestureTimer > 0) {
      gestureTimer = Math.max(0, gestureTimer - dt);
      if (gestureTimer === 0) gestureType = null;
    }
    phoneMesh.visible = (gestureType === 'phone');

    if (isMoving) {
      walkPhase += dt * 10;
      const s = Math.sin(walkPhase);
      legL.rotation.x = s * 0.52;
      legR.rotation.x = -s * 0.52;
      armL.rotation.x = -s * 0.45;
      armR.rotation.x = s * 0.45;
      armL.rotation.z = -0.20;
      armR.rotation.z = 0.20;
      bodyPivot.position.y = Math.abs(Math.cos(walkPhase)) * 0.032;
      headGroup.rotation.z = s * 0.04;
    } else {
      walkPhase = 0;
      const damp = Math.min(1, dt * 10);
      legL.rotation.x += (0 - legL.rotation.x) * damp;
      legR.rotation.x += (0 - legR.rotation.x) * damp;
      armL.rotation.x += (0 - armL.rotation.x) * damp;
      armL.rotation.z += (-0.20 - armL.rotation.z) * damp;

      if (gestureType === 'pat') {
        // 伸出右手（+X 側，靠近主角）輕輕摸摸主角頭頂兩下
        const patWave = Math.sin(elapsed * 14) * 0.16;
        armR.rotation.z += (1.18 - armR.rotation.z) * Math.min(1, dt * 12);
        armR.rotation.x += (-0.32 + patWave - armR.rotation.x) * Math.min(1, dt * 12);
        headGroup.rotation.z += (-0.08 - headGroup.rotation.z) * damp;
      } else if (gestureType === 'wave') {
        // 高舉手臂並微往前擺動，從鏡頭正面也能清楚看見揮手掰掰
        const wave = Math.sin(elapsed * 13) * 0.36;
        armR.rotation.z += (2.25 + wave - armR.rotation.z) * Math.min(1, dt * 14);
        armR.rotation.x += (-0.45 - armR.rotation.x) * Math.min(1, dt * 14);
        headGroup.rotation.z += (Math.sin(elapsed * 6.5) * 0.06 - headGroup.rotation.z) * damp;
      } else if (gestureType === 'phone') {
        // 停下來拿手機接聽電話，頭微微傾聽點頭
        armR.rotation.x += (-2.25 - armR.rotation.x) * Math.min(1, dt * 14);
        armR.rotation.z += (-0.28 - armR.rotation.z) * Math.min(1, dt * 14);
        headGroup.rotation.z += (0.12 + Math.sin(elapsed * 3.5) * 0.05 - headGroup.rotation.z) * damp;
      } else {
        armR.rotation.x += (0 - armR.rotation.x) * damp;
        armR.rotation.z += (0.20 - armR.rotation.z) * damp;
        headGroup.rotation.z += (Math.sin(elapsed * 1.4) * 0.025 - headGroup.rotation.z) * damp;
      }
      bodyPivot.position.y = Math.sin(elapsed * 2.4) * 0.014;
    }
  }

  return { group: root, update, setGesture };
}
