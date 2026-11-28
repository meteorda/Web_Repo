import * as THREE from 'three';

function makePlaidTexture(bg = '#2f415c', line = 'rgba(226, 232, 240, 0.45)') {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  for (let i = 0; i < 128; i += 24) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.lineWidth = 5;
  for (let i = 12; i < 128; i += 24) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
  }
  const tex = new THREE.Texture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export const STUDENT_VARIANTS = {
  boy: {
    label: '👦 學院男孩',
    gender: 'boy',
    hair: '#5c3c28',
    top: '#3b73a8',
    bottom: '#5b626e',
    shoe: '#18181b',
    bag: '#c82829',
    bagTrim: '#e14445',
    outfit: 'blazer_shorts',
    hairStyle: 'spiky',
    hat: null,
  },
  boy_cap: {
    label: '🧢 元氣棒球男孩',
    gender: 'boy',
    hair: '#2a1d17',
    top: '#facc15',
    bottom: '#3b82f6',
    shoe: '#ef4444',
    bag: '#2563eb',
    bagTrim: '#60a5fa',
    outfit: 'hoodie_shorts',
    hairStyle: 'short_cap',
    hat: 'cap',
  },
  boy_bear: {
    label: '🐻 熊耳軟萌男孩',
    gender: 'boy',
    hair: '#6b442a',
    top: '#ffffff',
    bottom: '#34d399',
    shoe: '#78350f',
    bag: '#b45309',
    bagTrim: '#fde68a',
    outfit: 'overalls_shorts',
    hairStyle: 'bob_boy',
    hat: 'bear',
  },
  girl: {
    label: '👧 學院女孩',
    gender: 'girl',
    hair: '#533524',
    top: '#3b73a8',
    bottom: '#2f415c',
    shoe: '#18181b',
    bag: '#c82829',
    bagTrim: '#e14445',
    outfit: 'blazer_skirt',
    hairStyle: 'braids',
    hat: null,
  },
  girl_bunny: {
    label: '🐰 粉嫩兔耳女孩',
    gender: 'girl',
    hair: '#4a2b1d',
    top: '#f472b6',
    bottom: '#fbcfe8',
    shoe: '#ec4899',
    bag: '#ffffff',
    bagTrim: '#f9a8d4',
    outfit: 'dress_puff',
    hairStyle: 'buns',
    hat: 'bunny',
  },
  girl_beret: {
    label: '🎨 貝雷帽文青女孩',
    gender: 'girl',
    hair: '#92592c',
    top: '#a78bfa',
    bottom: '#7c3aed',
    shoe: '#4c1d95',
    bag: '#b45309',
    bagTrim: '#fde047',
    outfit: 'pinafore_skirt',
    hairStyle: 'wavy_long',
    hat: 'beret',
  },
  boy_dino: {
    label: '🦖 恐龍連帽男孩',
    gender: 'boy',
    hair: '#3f2a1d',
    top: '#10b981',
    bottom: '#047857',
    shoe: '#f97316',
    bag: '#059669',
    bagTrim: '#facc15',
    outfit: 'hoodie_shorts',
    hairStyle: 'short_cap',
    hat: 'dino',
  },
  boy_sailor: {
    label: '⚓ 水手服男孩',
    gender: 'boy',
    hair: '#422c1d',
    top: '#f8fafc',
    bottom: '#1e3a8a',
    shoe: '#1d4ed8',
    bag: '#2563eb',
    bagTrim: '#ffffff',
    outfit: 'blazer_shorts',
    hairStyle: 'short_cap',
    hat: 'sailor',
  },
  boy_explorer: {
    label: '🧭 探險家男孩',
    gender: 'boy',
    hair: '#5c3c28',
    top: '#d97706',
    bottom: '#78350f',
    shoe: '#451a03',
    bag: '#92400e',
    bagTrim: '#fde68a',
    outfit: 'overalls_shorts',
    hairStyle: 'short_cap',
    hat: 'explorer',
  },
  boy_prince: {
    label: '👑 小王子男孩',
    gender: 'boy',
    hair: '#784421',
    top: '#f8fafc',
    bottom: '#1d4ed8',
    shoe: '#eab308',
    bag: '#2563eb',
    bagTrim: '#facc15',
    outfit: 'blazer_shorts',
    hairStyle: 'spiky',
    hat: 'crown',
  },
  girl_cat: {
    label: '🐱 貓耳甜心女孩',
    gender: 'girl',
    hair: '#292524',
    top: '#c084fc',
    bottom: '#9333ea',
    shoe: '#db2777',
    bag: '#f472b6',
    bagTrim: '#fef08a',
    outfit: 'dress_puff',
    hairStyle: 'braids',
    hat: 'cat',
  },
  girl_strawberry: {
    label: '🍓 草莓帽女孩',
    gender: 'girl',
    hair: '#5c3c28',
    top: '#fb7185',
    bottom: '#e11d48',
    shoe: '#be123c',
    bag: '#f43f5e',
    bagTrim: '#4ade80',
    outfit: 'pinafore_skirt',
    hairStyle: 'buns',
    hat: 'strawberry',
  },
  girl_angel: {
    label: '👼 天使翅膀女孩',
    gender: 'girl',
    hair: '#92592c',
    top: '#f8fafc',
    bottom: '#e0f2fe',
    shoe: '#bae6fd',
    bag: '#ffffff',
    bagTrim: '#fde047',
    outfit: 'dress_puff',
    hairStyle: 'wavy_long',
    hat: 'angel',
  },
  girl_star: {
    label: '🌟 星星魔法女孩',
    gender: 'girl',
    hair: '#3b2454',
    top: '#38bdf8',
    bottom: '#0284c7',
    shoe: '#facc15',
    bag: '#0ea5e9',
    bagTrim: '#fde047',
    outfit: 'dress_puff',
    hairStyle: 'braids',
    hat: 'star',
  },
};

export function createStudentAvatar(variant = 'boy', options = {}) {
  const { withBase = false } = options;
  const cfg = STUDENT_VARIANTS[variant] || STUDENT_VARIANTS.boy;
  const isBoy = cfg.gender === 'boy';
  const root = new THREE.Group();

  const cSkin = new THREE.MeshStandardMaterial({ color: '#ffdfc4', roughness: 0.65 });
  const cBlush = new THREE.MeshStandardMaterial({ color: '#fb929e', roughness: 0.8 });
  const cHair = new THREE.MeshStandardMaterial({ color: cfg.hair, roughness: 0.72 });
  const cEye = new THREE.MeshStandardMaterial({ color: '#1e1008', roughness: 0.18, metalness: 0.1 });
  const cWhite = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 });
  const cTop = new THREE.MeshStandardMaterial({ color: cfg.top, roughness: 0.72 });
  const cBottom = new THREE.MeshStandardMaterial({ color: cfg.bottom, roughness: 0.80 });
  const cTie = new THREE.MeshStandardMaterial({ color: '#2b4466', roughness: 0.75 });
  const cGold = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.35, metalness: 0.65 });
  const cBag = new THREE.MeshStandardMaterial({ color: cfg.bag, roughness: 0.52 });
  const cBagTrim = new THREE.MeshStandardMaterial({ color: cfg.bagTrim, roughness: 0.55 });
  const cShoe = new THREE.MeshStandardMaterial({ color: cfg.shoe, roughness: 0.35, metalness: 0.15 });
  const cMouth = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.7 });

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
    add(root, new THREE.CylinderGeometry(1.4, 1.5, 0.16, 32), new THREE.MeshStandardMaterial({ color: '#86efac', roughness: 0.9 }), 0, -0.08, 0);
  }

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // 1. 腿部與鞋子（左右腿可擺動）
  function makeLeg(side) {
    const lg = new THREE.Group();
    lg.position.set(side * 0.19, 0.58, 0);
    add(lg, new THREE.CylinderGeometry(0.105, 0.09, 0.28, 10), cSkin, 0, -0.14, 0);
    add(lg, new THREE.CylinderGeometry(0.095, 0.09, 0.16, 10), cWhite, 0, -0.34, 0);
    add(lg, new THREE.SphereGeometry(0.125, 10, 8), cShoe, 0, -0.49, 0.04).scale.set(0.95, 0.65, 1.35);
    add(lg, new THREE.CylinderGeometry(0.11, 0.11, 0.06, 10), cShoe, 0, -0.55, 0.04).scale.set(0.95, 1, 1.35);
    if (!isBoy) {
      add(lg, new THREE.SphereGeometry(0.032, 8, 6), cWhite, 0, -0.44, 0.11);
    }
    return lg;
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);
  bodyGroup.add(legL, legR);

  // 2. 下著（男生短褲 / 女生百褶裙或蓬蓬裙）
  if (isBoy) {
    add(bodyGroup, new THREE.CylinderGeometry(0.30, 0.32, 0.26, 14), cBottom, 0, 0.66, 0);
    add(bodyGroup, new THREE.CylinderGeometry(0.145, 0.15, 0.24, 10), cBottom, -0.18, 0.55, 0);
    add(bodyGroup, new THREE.CylinderGeometry(0.145, 0.15, 0.24, 10), cBottom, 0.18, 0.55, 0);
  } else if (cfg.outfit === 'dress_puff') {
    add(bodyGroup, new THREE.CylinderGeometry(0.27, 0.50, 0.42, 20), cBottom, 0, 0.59, 0);
    add(bodyGroup, new THREE.TorusGeometry(0.46, 0.045, 8, 20), cWhite, 0, 0.40, 0, Math.PI / 2, 0, 0);
  } else {
    const skirtMat = cfg.outfit === 'blazer_skirt'
      ? new THREE.MeshStandardMaterial({ map: makePlaidTexture(), roughness: 0.78 })
      : cBottom;
    add(bodyGroup, new THREE.CylinderGeometry(0.28, 0.45, 0.38, 18), skirtMat, 0, 0.60, 0);
  }

  // 3. 上衣（學院西裝 / 連帽衛衣 / 吊帶褲 / 蓬蓬洋裝 / 背心裙）
  add(bodyGroup, new THREE.CylinderGeometry(0.28, 0.34, 0.56, 14), cTop, 0, 1.00, 0);
  if (cfg.outfit === 'blazer_shorts' || cfg.outfit === 'blazer_skirt') {
    add(bodyGroup, new THREE.ConeGeometry(0.16, 0.28, 6), cWhite, 0, 1.14, 0.21, Math.PI, 0, 0).scale.set(1, 1, 0.35);
    add(bodyGroup, new THREE.BoxGeometry(0.075, 0.22, 0.04), cTie, 0, 1.07, 0.27);
    add(bodyGroup, new THREE.SphereGeometry(0.032, 8, 6), cGold, 0, 0.96, 0.30);
    add(bodyGroup, new THREE.SphereGeometry(0.032, 8, 6), cGold, 0, 0.85, 0.31);
    add(bodyGroup, new THREE.CylinderGeometry(0.055, 0.055, 0.02, 10), cGold, 0.18, 1.08, 0.27, Math.PI / 2, 0, 0);
  } else if (cfg.outfit === 'hoodie_shorts') {
    // 衛衣帽子領圈＋胸前口袋
    add(bodyGroup, new THREE.TorusGeometry(0.22, 0.07, 8, 16), cTop, 0, 1.24, -0.04, Math.PI / 2.2, 0, 0);
    add(bodyGroup, new THREE.BoxGeometry(0.32, 0.18, 0.08), cWhite, 0, 0.88, 0.32);
    add(bodyGroup, new THREE.SphereGeometry(0.04, 8, 6), cBag, 0, 1.08, 0.32);
  } else if (cfg.outfit === 'overalls_shorts') {
    // 吊帶褲胸前圍兜＋兩條肩帶＋黃色大鈕扣
    add(bodyGroup, new THREE.BoxGeometry(0.34, 0.36, 0.10), cBottom, 0, 0.93, 0.27);
    [-0.14, 0.14].forEach((sx) => {
      add(bodyGroup, new THREE.BoxGeometry(0.07, 0.42, 0.06), cBottom, sx, 1.08, 0.22);
      add(bodyGroup, new THREE.SphereGeometry(0.035, 8, 6), cGold, sx, 1.06, 0.31);
    });
  } else if (cfg.outfit === 'dress_puff') {
    // 可愛娃娃領＋胸前蝴蝶結
    add(bodyGroup, new THREE.TorusGeometry(0.22, 0.055, 8, 16), cWhite, 0, 1.24, 0.02, Math.PI / 2.2, 0, 0);
    add(bodyGroup, new THREE.ConeGeometry(0.07, 0.12, 6), cBagTrim, -0.05, 1.15, 0.28, 0, 0, Math.PI / 2);
    add(bodyGroup, new THREE.ConeGeometry(0.07, 0.12, 6), cBagTrim, 0.05, 1.15, 0.28, 0, 0, -Math.PI / 2);
    add(bodyGroup, new THREE.SphereGeometry(0.035, 8, 6), cGold, 0, 1.15, 0.30);
  } else if (cfg.outfit === 'pinafore_skirt') {
    // 白襯衫＋紫色背心吊帶裙＋奶油黃蝴蝶結
    add(bodyGroup, new THREE.CylinderGeometry(0.27, 0.31, 0.22, 14), cWhite, 0, 1.16, 0);
    add(bodyGroup, new THREE.ConeGeometry(0.07, 0.12, 6), cBagTrim, -0.05, 1.15, 0.28, 0, 0, Math.PI / 2);
    add(bodyGroup, new THREE.ConeGeometry(0.07, 0.12, 6), cBagTrim, 0.05, 1.15, 0.28, 0, 0, -Math.PI / 2);
  }

  // 4. 手臂（圓潤肩膀球＋袖子＋手掌）
  const armMat = cfg.outfit === 'pinafore_skirt' ? cWhite : cTop;
  function makeArm(side) {
    const ag = new THREE.Group();
    ag.position.set(side * 0.34, 1.18, 0);
    add(ag, new THREE.SphereGeometry(0.105, 10, 8), armMat, 0, 0, 0);
    add(ag, new THREE.CylinderGeometry(0.095, 0.085, 0.36, 10), armMat, side * 0.02, -0.17, 0, 0, 0, side * 0.18);
    add(ag, new THREE.SphereGeometry(0.09, 10, 8), cSkin, side * 0.06, -0.37, 0.04);
    return ag;
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);
  bodyGroup.add(armL, armR);

  // 跟老師打電話技能用的可愛小手機 (掛於右手腕，平時隱藏)
  const phoneMesh = new THREE.Group();
  const phoneBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.19, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 })
  );
  const phoneScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.14, 0.01),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x7dd3fc, emissiveIntensity: 0.55 })
  );
  phoneScreen.position.z = 0.016;
  phoneMesh.add(phoneBody, phoneScreen);
  phoneMesh.position.set(0.06, -0.35, 0.06);
  phoneMesh.visible = false;
  armR.add(phoneMesh);

  // 5. 背後可愛配件（硬殼書包 / 運動背包 / 毛絨小尾巴＋小背包）
  const bag = new THREE.Group();
  bag.position.set(0, 0.98, -0.32);
  if (variant === 'boy_bear') {
    add(bag, new THREE.SphereGeometry(0.24, 12, 10), cBag, 0, 0.02, 0.02).scale.set(1.0, 1.1, 0.65);
    add(bag, new THREE.SphereGeometry(0.09, 10, 8), cBagTrim, 0, -0.32, 0.04); // 圓圓毛絨小熊尾巴
  } else if (variant === 'girl_bunny') {
    add(bag, new THREE.SphereGeometry(0.23, 12, 10), cBag, 0, 0.04, 0.02).scale.set(1.05, 1.0, 0.65);
    add(bag, new THREE.SphereGeometry(0.085, 10, 8), cBagTrim, 0, -0.28, 0.04); // 粉白圓兔尾
  } else if (variant === 'boy_dino') {
    // 小恐龍背鰭與尾巴
    for (let s = 0; s < 3; s++) {
      add(bag, new THREE.ConeGeometry(0.08, 0.16, 4), cBagTrim, 0, 0.16 - s * 0.16, -0.02, -Math.PI / 2, 0, 0);
    }
    add(bag, new THREE.ConeGeometry(0.11, 0.36, 8), cBag, 0, -0.26, -0.10, -Math.PI * 0.65, 0, 0);
  } else if (variant === 'girl_angel') {
    // 可愛立體雙小翅膀
    [-1, 1].forEach((side) => {
      add(bag, new THREE.SphereGeometry(0.18, 10, 8), cWhite, side * 0.24, 0.08, 0.06, 0, side * -0.35, side * -0.35).scale.set(1.35, 0.68, 0.24);
    });
  } else if (variant === 'girl_cat') {
    // 彎彎小貓尾巴
    add(bag, new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI * 1.1), cHair, 0, -0.24, -0.04, 0, Math.PI / 2, 0.3);
    add(bag, new THREE.SphereGeometry(0.20, 10, 8), cBag, 0, 0.04, 0.04).scale.set(1.0, 1.0, 0.55);
  } else {
    add(bag, new THREE.BoxGeometry(0.46, 0.50, 0.24), cBag, 0, 0, 0);
    add(bag, new THREE.BoxGeometry(0.48, 0.38, 0.08), cBagTrim, 0, 0.05, -0.11);
    add(bag, new THREE.SphereGeometry(0.035, 8, 6), cGold, 0, -0.12, -0.16);
  }
  [-0.18, 0.18].forEach((sx) => {
    add(bodyGroup, new THREE.TorusGeometry(0.18, 0.036, 6, 12, Math.PI * 1.15), cBagTrim, sx, 1.13, 0.02, 0, Math.PI / 2, -0.2);
  });
  bodyGroup.add(bag);

  // 6. Q 版大頭（圓潤臉龐、閃亮大眼、雙高光、腮紅、可愛微笑）
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.66, 0.02);
  bodyGroup.add(headGroup);

  add(headGroup, new THREE.SphereGeometry(0.46, 20, 16), cSkin, 0, 0, 0).scale.set(1.05, 0.94, 0.98);
  add(headGroup, new THREE.SphereGeometry(0.11, 10, 8), cSkin, -0.46, -0.02, -0.02).scale.set(0.65, 1, 0.8);
  add(headGroup, new THREE.SphereGeometry(0.11, 10, 8), cSkin, 0.46, -0.02, -0.02).scale.set(0.65, 1, 0.8);
  [-0.18, 0.18].forEach((ex) => {
    add(headGroup, new THREE.SphereGeometry(0.09, 12, 10), cEye, ex, 0.02, 0.40).scale.set(0.95, 1.12, 0.55);
    add(headGroup, new THREE.SphereGeometry(0.030, 8, 6), cWhite, ex - 0.025, 0.055, 0.436);
    add(headGroup, new THREE.SphereGeometry(0.016, 6, 5), cWhite, ex + 0.025, -0.01, 0.436);
    add(headGroup, new THREE.SphereGeometry(0.09, 10, 8), cBlush, ex * 1.45, -0.10, 0.36).scale.set(1.25, 0.72, 0.35);
  });
  add(headGroup, new THREE.SphereGeometry(0.028, 8, 6), cBlush, 0, -0.05, 0.45);
  add(headGroup, new THREE.SphereGeometry(0.085, 10, 8), cMouth, 0, -0.17, 0.40).scale.set(1.2, 0.85, 0.45);

  // 7. 髮型與可愛頭飾（柔順貼額弧形瀏海，不凸出額頭）
  add(headGroup, new THREE.SphereGeometry(0.485, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), cHair, 0, 0.04, -0.04, -0.14, 0, 0);
  const hasFullCap = cfg.hat === 'cap' || cfg.hat === 'bear' || cfg.hat === 'dino' || cfg.hat === 'sailor' || cfg.hat === 'explorer' || cfg.hat === 'strawberry';
  for (let b = -3; b <= 3; b++) {
    const ab = Math.abs(b);
    const bangY = (hasFullCap ? 0.16 : 0.22) - ab * 0.014;
    const bangH = hasFullCap ? 0.16 : 0.20;
    const bangZ = 0.315 - ab * 0.032;
    const bangMesh = add(headGroup, new THREE.ConeGeometry(0.105, bangH, 8), cHair, b * 0.095, bangY, bangZ, Math.PI + 0.12, b * -0.18, b * 0.10);
    bangMesh.scale.set(1.06, 1.0, 0.36);
  }

  if (cfg.hairStyle === 'spiky') {
    for (let t = 0; t < 6; t++) {
      const a = (t / 6) * Math.PI * 2;
      add(headGroup, new THREE.ConeGeometry(0.12, 0.32, 6), cHair, Math.cos(a) * 0.22, 0.48, Math.sin(a) * 0.18, Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.45);
    }
  } else if (cfg.hairStyle === 'bob_boy') {
    // 呆萌小呆毛
    add(headGroup, new THREE.ConeGeometry(0.07, 0.24, 6), cHair, 0.04, 0.56, 0.06, 0.2, 0, -0.35);
  } else if (cfg.hairStyle === 'braids') {
    [-1, 1].forEach((side) => {
      const braid = new THREE.Group();
      braid.position.set(side * 0.42, -0.06, -0.10);
      braid.rotation.z = side * 0.36;
      add(braid, new THREE.ConeGeometry(0.10, 0.16, 6), cBagTrim, -0.06, 0.06, 0, 0, 0, Math.PI / 2);
      add(braid, new THREE.ConeGeometry(0.10, 0.16, 6), cBagTrim, 0.06, 0.06, 0, 0, 0, -Math.PI / 2);
      add(braid, new THREE.SphereGeometry(0.05, 8, 6), cBag, 0, 0.06, 0.02);
      for (let k = 0; k < 4; k++) {
        add(braid, new THREE.SphereGeometry(0.11 - k * 0.016, 10, 8), cHair, 0, -0.08 - k * 0.13, 0);
      }
      headGroup.add(braid);
    });
  } else if (cfg.hairStyle === 'buns') {
    // 雙丸子包頭
    [-1, 1].forEach((side) => {
      add(headGroup, new THREE.SphereGeometry(0.19, 12, 10), cHair, side * 0.38, 0.36, -0.06);
      add(headGroup, new THREE.TorusGeometry(0.13, 0.032, 6, 12), cBagTrim, side * 0.38, 0.30, -0.04, Math.PI / 2.2, 0, side * -0.4);
    });
  } else if (cfg.hairStyle === 'wavy_long') {
    // 兩側自然波浪長髮
    [-1, 1].forEach((side) => {
      for (let k = 0; k < 4; k++) {
        add(headGroup, new THREE.SphereGeometry(0.14 - k * 0.012, 10, 8), cHair, side * (0.42 + Math.sin(k) * 0.03), -0.05 - k * 0.17, -0.10);
      }
    });
    add(headGroup, new THREE.SphereGeometry(0.38, 12, 10), cHair, 0, -0.24, -0.26).scale.set(1.15, 1.35, 0.55);
  }

  // 帽飾與萌系耳朵
  if (cfg.hat === 'cap') {
    const cCapRed = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.65 });
    const cCapWhite = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.65 });
    add(headGroup, new THREE.SphereGeometry(0.525, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), cCapRed, 0, 0.14, -0.02, -0.15, 0, 0);
    // 反戴帽簷朝後（可愛又俏皮）
    add(headGroup, new THREE.CylinderGeometry(0.36, 0.38, 0.05, 16, 1, false, -Math.PI * 0.45, Math.PI * 0.9), cCapWhite, 0, 0.18, -0.36, 0.18, Math.PI, 0);
    add(headGroup, new THREE.SphereGeometry(0.055, 8, 6), cCapWhite, 0, 0.64, -0.06);
  } else if (cfg.hat === 'bear') {
    const cBear = new THREE.MeshStandardMaterial({ color: '#a16207', roughness: 0.85 });
    const cBearIn = new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.85 });
    add(headGroup, new THREE.SphereGeometry(0.525, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), cBear, 0, 0.14, -0.02, -0.12, 0, 0);
    [-1, 1].forEach((side) => {
      add(headGroup, new THREE.SphereGeometry(0.16, 12, 10), cBear, side * 0.38, 0.50, -0.02).scale.set(1, 1, 0.65);
      add(headGroup, new THREE.SphereGeometry(0.09, 10, 8), cBearIn, side * 0.38, 0.50, 0.04).scale.set(1, 1, 0.45);
    });
  } else if (cfg.hat === 'bunny') {
    const cBand = new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.65 });
    add(headGroup, new THREE.TorusGeometry(0.46, 0.045, 8, 20, Math.PI), cBand, 0, 0.14, 0.04, 0, 0, 0);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Group();
      ear.position.set(side * 0.22, 0.54, 0.02);
      ear.rotation.z = side * -0.18;
      ear.rotation.x = side > 0 ? 0.12 : -0.05; // 一隻耳朵微微俏皮前傾
      add(ear, new THREE.SphereGeometry(0.11, 12, 10), cWhite, 0, 0.22, 0).scale.set(0.82, 2.35, 0.55);
      add(ear, new THREE.SphereGeometry(0.065, 10, 8), cBagTrim, 0, 0.22, 0.035).scale.set(0.75, 1.95, 0.40);
      headGroup.add(ear);
    });
  } else if (cfg.hat === 'beret') {
    const cBeret = new THREE.MeshStandardMaterial({ color: '#fde047', roughness: 0.78 });
    add(headGroup, new THREE.SphereGeometry(0.46, 18, 12), cBeret, 0.08, 0.44, -0.04, 0.1, 0, -0.24).scale.set(1.18, 0.42, 1.15);
    add(headGroup, new THREE.CylinderGeometry(0.03, 0.04, 0.10, 8), cHair, 0.12, 0.62, -0.04, 0, 0, -0.24);
  } else if (cfg.hat === 'dino') {
    add(headGroup, new THREE.SphereGeometry(0.525, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), cTop, 0, 0.14, -0.02, -0.14, 0, 0);
    for (let s = 0; s < 3; s++) {
      add(headGroup, new THREE.ConeGeometry(0.075, 0.18, 5), cBagTrim, 0, 0.62 - s * 0.08, 0.10 - s * 0.22, -0.3 - s * 0.35, 0, 0);
    }
  } else if (cfg.hat === 'sailor') {
    add(headGroup, new THREE.CylinderGeometry(0.38, 0.44, 0.18, 18), cWhite, 0, 0.46, -0.02, -0.08, 0, 0);
    add(headGroup, new THREE.TorusGeometry(0.41, 0.045, 8, 20), cBottom, 0, 0.38, -0.01, Math.PI / 2 - 0.08, 0, 0);
  } else if (cfg.hat === 'explorer') {
    const cHat = new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.85 });
    add(headGroup, new THREE.CylinderGeometry(0.68, 0.72, 0.04, 22), cHat, 0, 0.36, 0, -0.08, 0, 0);
    add(headGroup, new THREE.CylinderGeometry(0.32, 0.40, 0.26, 18), cHat, 0, 0.48, -0.02, -0.08, 0, 0);
  } else if (cfg.hat === 'crown') {
    add(headGroup, new THREE.CylinderGeometry(0.24, 0.20, 0.14, 12), cGold, 0, 0.52, 0, -0.06, 0, 0);
    for (let c = 0; c < 5; c++) {
      const a = (c / 5) * Math.PI * 2;
      add(headGroup, new THREE.ConeGeometry(0.05, 0.14, 5), cGold, Math.cos(a) * 0.20, 0.63, Math.sin(a) * 0.20);
    }
  } else if (cfg.hat === 'cat') {
    add(headGroup, new THREE.TorusGeometry(0.46, 0.04, 8, 20, Math.PI), cBag, 0, 0.14, 0.04);
    [-1, 1].forEach((side) => {
      add(headGroup, new THREE.ConeGeometry(0.13, 0.24, 6), cHair, side * 0.30, 0.56, 0.02, 0, 0, side * -0.32);
      add(headGroup, new THREE.ConeGeometry(0.075, 0.16, 6), cBag, side * 0.30, 0.55, 0.06, 0, 0, side * -0.32);
    });
  } else if (cfg.hat === 'strawberry') {
    const cStraw = new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.75 });
    add(headGroup, new THREE.SphereGeometry(0.525, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), cStraw, 0, 0.14, -0.02, -0.14, 0, 0);
    add(headGroup, new THREE.CylinderGeometry(0.03, 0.03, 0.10, 6), cBagTrim, 0, 0.68, -0.02);
    add(headGroup, new THREE.SphereGeometry(0.10, 8, 6), cBagTrim, 0.08, 0.65, 0.02).scale.set(1.4, 0.4, 0.7);
  } else if (cfg.hat === 'angel') {
    add(headGroup, new THREE.TorusGeometry(0.26, 0.032, 8, 22), cGold, 0, 0.68, -0.04, Math.PI / 2, 0, 0);
  } else if (cfg.hat === 'star') {
    add(headGroup, new THREE.OctahedronGeometry(0.13, 0), cGold, 0.30, 0.44, 0.26).scale.set(1.1, 1.1, 0.5);
    add(headGroup, new THREE.OctahedronGeometry(0.10, 0), cGold, -0.30, 0.44, 0.26).scale.set(1.1, 1.1, 0.5);
  }

  let walkPhase = 0;
  function update(dt, _elapsed, isMoving = false, skillMode = null) {
    phoneMesh.visible = (skillMode === 'phone');
    if (skillMode === 'phone') {
      // 跟老師打電話：右手舉起拿手機貼近耳朵、頭微微傾聽微笑
      armR.rotation.x += (-2.25 - armR.rotation.x) * 0.25;
      armR.rotation.z += (-0.35 - armR.rotation.z) * 0.25;
      armL.rotation.x *= 0.85;
      armL.rotation.z *= 0.85;
      headGroup.rotation.x += (-0.06 - headGroup.rotation.x) * 0.22;
      headGroup.rotation.z += (0.14 + Math.sin(_elapsed * 3.5) * 0.05 - headGroup.rotation.z) * 0.22;
      legL.rotation.x *= 0.85;
      legR.rotation.x *= 0.85;
      bodyGroup.position.y = Math.abs(Math.sin(_elapsed * 3.0)) * 0.025;
      return;
    }
    if (skillMode === 'saiyan') {
      // 超級賽亞人呼喊神：雙手高舉過頭、頭抬起來仰望天空、氣場微微震動
      armL.rotation.x += (-2.85 - armL.rotation.x) * 0.25;
      armR.rotation.x += (-2.85 - armR.rotation.x) * 0.25;
      armL.rotation.z += (-0.32 - armL.rotation.z) * 0.25;
      armR.rotation.z += (0.32 - armR.rotation.z) * 0.25;
      headGroup.rotation.x += (-0.52 - headGroup.rotation.x) * 0.22;
      headGroup.rotation.z *= 0.85;
      legL.rotation.x *= 0.85;
      legR.rotation.x *= 0.85;
      bodyGroup.position.y = 0.03 + Math.sin(_elapsed * 30.0) * 0.015;
      return;
    }
    if (skillMode === 'heart') {
      // 向老師放送愛心攻勢：雙手向前比心揮動、頭微微歪頭微笑
      const pulse = Math.sin(_elapsed * 8.0);
      armL.rotation.x += ((-1.38 + pulse * 0.28) - armL.rotation.x) * 0.28;
      armR.rotation.x += ((-1.38 - pulse * 0.28) - armR.rotation.x) * 0.28;
      armL.rotation.z += (0.32 - armL.rotation.z) * 0.25;
      armR.rotation.z += (-0.32 - armR.rotation.z) * 0.25;
      headGroup.rotation.x += (-0.08 - headGroup.rotation.x) * 0.22;
      headGroup.rotation.z += (Math.sin(_elapsed * 4.5) * 0.14 - headGroup.rotation.z) * 0.22;
      legL.rotation.x *= 0.85;
      legR.rotation.x *= 0.85;
      bodyGroup.position.y = Math.abs(Math.sin(_elapsed * 6.0)) * 0.04;
      return;
    }
    if (skillMode === 'jump') {
      armL.rotation.x += (-0.65 - armL.rotation.x) * 0.25;
      armR.rotation.x += (-0.65 - armR.rotation.x) * 0.25;
      armL.rotation.z += (-0.62 - armL.rotation.z) * 0.25;
      armR.rotation.z += (0.62 - armR.rotation.z) * 0.25;
      legL.rotation.x += (0.32 - legL.rotation.x) * 0.25;
      legR.rotation.x += (-0.32 - legR.rotation.x) * 0.25;
      headGroup.rotation.x *= 0.85;
      headGroup.rotation.z *= 0.85;
      return;
    }

    // 恢復正常姿態
    armL.rotation.z *= 0.82;
    armR.rotation.z *= 0.82;
    headGroup.rotation.x *= 0.82;
    headGroup.rotation.z *= 0.82;

    if (isMoving) {
      walkPhase += dt * 11.0;
      const swing = Math.sin(walkPhase) * 0.55;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.75;
      armR.rotation.x = swing * 0.75;
      bodyGroup.position.y = Math.abs(Math.sin(walkPhase)) * 0.05;
    } else {
      legL.rotation.x *= 0.85;
      legR.rotation.x *= 0.85;
      armL.rotation.x *= 0.85;
      armR.rotation.x *= 0.85;
      bodyGroup.position.y *= 0.85;
    }
  }

  return { group: root, update };
}
