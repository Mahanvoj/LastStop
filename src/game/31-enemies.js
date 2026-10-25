/* ==========================================================================
   Hostiles — procedural bodies, AI, projectiles and salvage
   ========================================================================== */

const ENEMY_TYPES = {
  stalker: {
    key: 'stalker',
    label: 'DRIFTER',
    names: ['DRIFTER', 'HOLLOW', 'SALT WRAITH', 'NIGHTJAR', 'CINDER'],
    health: 64,
    speed: 2.65,
    damage: 11,
    range: 1.62,
    cooldown: 1.05,
    windup: 0.34,
    radius: 0.34,
    headHeight: 1.78,
    ranged: false,
    scale: 1,
    accent: 0xff6748,
  },
  gunner: {
    key: 'gunner',
    label: 'HOLLOW',
    names: ['HOLLOW', 'REDLINE', 'CIVIC GUARD', 'SIREN', 'PALE HORSE'],
    health: 92,
    speed: 1.72,
    damage: 9,
    range: 27,
    projectileSpeed: 18.5,
    preferredRange: 10.5,
    cooldown: 2.15,
    windup: 0.5,
    radius: 0.37,
    headHeight: 1.85,
    ranged: true,
    scale: 1,
    accent: 0xff855b,
  },
  brute: {
    key: 'brute',
    label: 'RAVAGER',
    names: ['RAVAGER', 'TUNNEL HOUND', 'NULL SAINT', 'CINDER'],
    health: 265,
    speed: 1.14,
    damage: 25,
    range: 1.95,
    cooldown: 1.8,
    windup: 0.56,
    radius: 0.54,
    headHeight: 2.25,
    ranged: false,
    scale: 1,
    accent: 0xffa25e,
  },
};

const ENEMY_SHADOW_TEXTURE = makeCanvasTexture(128, 128, (ctx, w, h) => {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 3, w / 2, h / 2, w / 2);
  grad.addColorStop(0, 'rgba(0,0,0,.78)');
  grad.addColorStop(0.52, 'rgba(0,0,0,.46)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}, { colorSpace: false, anisotropy: false });

const ENEMY_MATERIALS = {
  cloth: new THREE.MeshStandardMaterial({ color: 0x242522, roughness: 0.85, metalness: 0.04, emissive: 0x110b09, emissiveIntensity: 0.38 }),
  clothLight: new THREE.MeshStandardMaterial({ color: 0x363a34, roughness: 0.72, metalness: 0.08, emissive: 0x120c09, emissiveIntensity: 0.22 }),
  armor: new THREE.MeshStandardMaterial({ color: 0x303735, roughness: 0.52, metalness: 0.56, envMapIntensity: 0.72 }),
  armorDark: new THREE.MeshStandardMaterial({ color: 0x171c1b, roughness: 0.63, metalness: 0.35 }),
  skin: new THREE.MeshStandardMaterial({ color: 0x9b8f77, roughness: 0.78, metalness: 0.03, emissive: 0x1d140e, emissiveIntensity: 0.28 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x4c3729, roughness: 0.77, metalness: 0.28, emissive: 0x180b05, emissiveIntensity: 0.3 }),
  eye: new THREE.MeshStandardMaterial({ color: 0xff5a36, emissive: 0xff3a18, emissiveIntensity: 3.4, roughness: 0.2 }),
  eyeGun: new THREE.MeshStandardMaterial({ color: 0xff9b55, emissive: 0xff5b18, emissiveIntensity: 3.0, roughness: 0.2 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x5e6661, roughness: 0.3, metalness: 0.88, envMapIntensity: 1 }),
  gun: new THREE.MeshStandardMaterial({ color: 0x121716, roughness: 0.4, metalness: 0.7 }),
  wrap: new THREE.MeshStandardMaterial({ color: 0x4a4337, roughness: 0.9, metalness: 0.03 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xbfb39a, roughness: 0.7, metalness: 0.02 }),
};

const ENEMY_SEAM_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xff5c38, toneMapped: false });
const HEALTH_BAR_BG = new THREE.MeshBasicMaterial({ color: 0x070b0a, transparent: true, opacity: 0.82, depthTest: false, depthWrite: false, toneMapped: false });
const HEALTH_BAR_FILL = new THREE.MeshBasicMaterial({ color: 0xff6b4f, transparent: true, opacity: 0.94, depthTest: false, depthWrite: false, toneMapped: false });
const HEALTH_BAR_EDGE = new THREE.MeshBasicMaterial({ color: 0xdbcbb1, transparent: true, opacity: 0.42, depthTest: false, depthWrite: false, toneMapped: false });

const ENEMY_SHADOW_MATERIAL = new THREE.MeshBasicMaterial({
  map: ENEMY_SHADOW_TEXTURE,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
  toneMapped: true,
});

function enemyMesh(parent, geometry, material, position, rotation = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  if (rotation) mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  parent.add(mesh);
  return mesh;
}

function buildEnemyModel(type) {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);
  const hitMeshes = [];
  const rig = {};

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.15), ENEMY_SHADOW_MATERIAL);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.022;
  shadow.renderOrder = 1;
  root.add(shadow);
  rig.shadow = shadow;

  const add = (mesh, part = 'body') => {
    mesh.userData.hitPart = part;
    hitMeshes.push(mesh);
    return mesh;
  };

  const makeLimb = (parent, x, y, z, w, h, d, material, part = 'body') => {
    const mesh = viewBox(parent, w, h, d, material, x, y, z);
    add(mesh, part);
    return mesh;
  };

  if (type.key === 'stalker') {
    const body = new THREE.Group();
    body.position.y = 0;
    visual.add(body);
    rig.body = body;

    // Hips, knees and feet.
    const hips = new THREE.Group();
    hips.position.y = 0.83;
    body.add(hips);
    rig.hips = hips;
    for (const side of [-1, 1]) {
      const thigh = new THREE.Group();
      thigh.position.set(side * 0.15, 0, 0);
      hips.add(thigh);
      makeLimb(thigh, 0, -0.23, 0, 0.13, 0.48, 0.15, ENEMY_MATERIALS.cloth);
      const shin = new THREE.Group();
      shin.position.y = -0.46;
      thigh.add(shin);
      makeLimb(shin, 0, -0.22, 0.01, 0.11, 0.46, 0.13, ENEMY_MATERIALS.wrap);
      makeLimb(shin, 0, -0.47, 0.08, 0.15, 0.09, 0.29, ENEMY_MATERIALS.armorDark);
      if (side === -1) rig.leftLeg = thigh; else rig.rightLeg = thigh;
      if (side === -1) rig.leftShin = shin; else rig.rightShin = shin;
    }

    // Ragged coat panels.
    const coat = new THREE.Group();
    coat.position.y = 0.82;
    body.add(coat);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU;
      const panel = viewBox(coat, 0.17, rand(0.48, 0.74), 0.055, ENEMY_MATERIALS.cloth, Math.cos(angle) * 0.22, -0.26, Math.sin(angle) * 0.18);
      panel.rotation.y = -angle + Math.PI / 2;
      panel.rotation.z = rand(-0.1, 0.1);
      add(panel);
    }
    const torso = new THREE.Group();
    torso.position.y = 1.18;
    torso.rotation.x = 0.14;
    body.add(torso);
    rig.torso = torso;
    makeLimb(torso, 0, 0, 0, 0.48, 0.6, 0.27, ENEMY_MATERIALS.cloth, 'body');
    makeLimb(torso, 0, 0.06, 0.145, 0.36, 0.31, 0.04, ENEMY_MATERIALS.clothLight, 'body');
    makeLimb(torso, 0, -0.09, 0.16, 0.29, 0.06, 0.03, ENEMY_SEAM_MATERIAL, 'body');
    makeLimb(torso, 0.21, 0.09, 0.02, 0.09, 0.18, 0.23, ENEMY_MATERIALS.armor, 'body');
    makeLimb(torso, -0.21, 0.09, 0.02, 0.09, 0.18, 0.23, ENEMY_MATERIALS.armor, 'body');

    // Head, hood and burning eyes.
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.43, 0.02);
    torso.add(headGroup);
    rig.head = headGroup;
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 9, 0, TAU, 0, Math.PI * 0.8), ENEMY_MATERIALS.cloth);
    hood.scale.set(1, 1.08, 1.02);
    headGroup.add(hood);
    add(hood, 'head');
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.17, 11, 8), ENEMY_MATERIALS.armorDark);
    face.position.set(0, -0.015, 0.09);
    face.scale.set(0.87, 1, 0.7);
    headGroup.add(face);
    add(face, 'head');
    for (const sign of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), ENEMY_MATERIALS.eye);
      eye.position.set(sign * 0.065, 0.005, 0.203);
      eye.scale.set(1.2, 0.72, 0.4);
      headGroup.add(eye);
      add(eye, 'head');
    }
    const collar = viewBox(headGroup, 0.38, 0.09, 0.23, ENEMY_MATERIALS.armor, 0, -0.19, 0.03);
    add(collar);

    // Long arms with claw hands.
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.28, 0.25, 0.03);
      shoulder.rotation.z = side * 0.12;
      torso.add(shoulder);
      makeLimb(shoulder, 0, -0.24, 0, 0.13, 0.5, 0.14, ENEMY_MATERIALS.cloth);
      const elbow = new THREE.Group();
      elbow.position.y = -0.48;
      shoulder.add(elbow);
      makeLimb(elbow, 0, -0.23, 0.015, 0.105, 0.46, 0.11, ENEMY_MATERIALS.wrap);
      makeLimb(elbow, 0, -0.47, 0.02, 0.14, 0.15, 0.13, ENEMY_MATERIALS.skin);
      for (let f = 0; f < 3; f++) {
        const finger = makeLimb(elbow, (f - 1) * 0.042, -0.55, 0.055, 0.018, 0.2, 0.025, ENEMY_MATERIALS.bone);
        finger.rotation.x = 0.2;
      }
      if (side === -1) { rig.leftArm = shoulder; rig.leftElbow = elbow; }
      else { rig.rightArm = shoulder; rig.rightElbow = elbow; }
    }

    // Thin luminous seams and a hanging cable.
    makeLimb(body, 0.2, 1.28, 0.14, 0.018, 0.24, 0.02, ENEMY_SEAM_MATERIAL);
    makeLimb(body, -0.17, 1.1, 0.15, 0.016, 0.16, 0.018, ENEMY_SEAM_MATERIAL);
    const cable = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.011, 4, 14, Math.PI * 1.3), ENEMY_MATERIALS.wrap);
    cable.position.set(0.1, 0.9, 0.18);
    cable.rotation.set(0.5, 0.2, 0);
    body.add(cable);
    visual.rotation.x = 0.045;
    rig.weapon = null;
  } else if (type.key === 'gunner') {
    const body = new THREE.Group();
    visual.add(body);
    rig.body = body;

    const hips = new THREE.Group();
    hips.position.y = 0.85;
    body.add(hips);
    rig.hips = hips;
    for (const side of [-1, 1]) {
      const thigh = new THREE.Group();
      thigh.position.set(side * 0.16, 0, 0);
      hips.add(thigh);
      makeLimb(thigh, 0, -0.25, 0, 0.15, 0.5, 0.17, ENEMY_MATERIALS.armorDark);
      const shin = new THREE.Group();
      shin.position.y = -0.49;
      thigh.add(shin);
      makeLimb(shin, 0, -0.23, 0.01, 0.125, 0.47, 0.14, ENEMY_MATERIALS.armor);
      makeLimb(shin, 0, -0.47, 0.08, 0.16, 0.09, 0.31, ENEMY_MATERIALS.armorDark);
      makeLimb(shin, 0, -0.36, 0.09, 0.14, 0.16, 0.06, ENEMY_MATERIALS.armorDark);
      if (side === -1) rig.leftLeg = thigh; else rig.rightLeg = thigh;
      if (side === -1) rig.leftShin = shin; else rig.rightShin = shin;
    }

    const torso = new THREE.Group();
    torso.position.y = 1.2;
    torso.rotation.x = 0.05;
    body.add(torso);
    rig.torso = torso;
    makeLimb(torso, 0, 0, 0, 0.5, 0.62, 0.29, ENEMY_MATERIALS.armor, 'body');
    makeLimb(torso, 0, 0.08, 0.155, 0.36, 0.35, 0.045, ENEMY_MATERIALS.armorDark, 'body');
    makeLimb(torso, 0, -0.05, 0.18, 0.21, 0.32, 0.02, ENEMY_MATERIALS.clothLight, 'body');
    makeLimb(torso, 0.17, 0.08, 0.18, 0.055, 0.23, 0.01, ENEMY_SEAM_MATERIAL, 'body');
    makeLimb(torso, -0.16, 0.015, 0.18, 0.03, 0.11, 0.01, ENEMY_SEAM_MATERIAL, 'body');
    for (const side of [-1, 1]) {
      const plate = makeLimb(torso, side * 0.3, 0.13, 0, 0.1, 0.24, 0.34, ENEMY_MATERIALS.armorDark, 'body');
      plate.rotation.z = side * 0.08;
      makeLimb(torso, side * 0.27, 0.27, 0.03, 0.2, 0.07, 0.25, ENEMY_MATERIALS.rust, 'body');
    }

    // Helmet, respirator, eyes.
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.46, 0);
    torso.add(headGroup);
    rig.head = headGroup;
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 9, 0, TAU, 0, Math.PI * 0.72), ENEMY_MATERIALS.armor);
    helmet.scale.set(0.98, 1.04, 1.02);
    headGroup.add(helmet);
    add(helmet, 'head');
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.25, 0.23), ENEMY_MATERIALS.armorDark);
    face.position.set(0, -0.06, 0.07);
    headGroup.add(face);
    add(face, 'head');
    for (const sign of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.035, 10), ENEMY_MATERIALS.eyeGun);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(sign * 0.075, 0.015, 0.195);
      headGroup.add(lens);
      add(lens, 'head');
    }
    const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.14, 10), ENEMY_MATERIALS.gun);
    filter.rotation.x = Math.PI / 2;
    filter.position.set(0, -0.095, 0.19);
    headGroup.add(filter);
    add(filter, 'head');
    makeLimb(headGroup, 0, 0.19, 0.01, 0.42, 0.06, 0.31, ENEMY_MATERIALS.rust, 'head');

    // Rifle held forward. Facing is local +Z.
    const weapon = new THREE.Group();
    weapon.position.set(0.0, 1.22, 0.31);
    body.add(weapon);
    rig.weapon = weapon;
    makeLimb(weapon, 0, 0, 0.04, 0.12, 0.14, 0.58, ENEMY_MATERIALS.gun, 'body');
    makeLimb(weapon, 0.07, 0.03, 0.12, 0.035, 0.08, 0.18, ENEMY_MATERIALS.steel, 'body');
    const barrel = makeLimb(weapon, 0, 0.04, 0.43, 0.035, 0.035, 0.43, ENEMY_MATERIALS.steel, 'body');
    barrel.rotation.x = Math.PI / 2;
    const mag = makeLimb(weapon, 0, -0.115, 0.1, 0.06, 0.21, 0.1, ENEMY_MATERIALS.armorDark, 'body');
    mag.rotation.x = -0.1;
    const muzzle = new THREE.Group();
    muzzle.position.set(0, 0.04, 0.65);
    weapon.add(muzzle);
    const muzzleGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: SOFT_GLOW_TEXTURE, color: 0xff6b3c, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    muzzleGlow.scale.set(0.55, 0.55, 1);
    muzzle.add(muzzleGlow);
    rig.muzzle = muzzle;
    rig.muzzleGlow = muzzleGlow;
    makeLimb(weapon, 0, 0.14, 0.15, 0.09, 0.035, 0.22, ENEMY_MATERIALS.rust, 'body');

    // Arms: right trigger hand, left support.
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.29, 0.23, 0.01);
      torso.add(shoulder);
      makeLimb(shoulder, 0, -0.2, 0.02, 0.12, 0.42, 0.14, ENEMY_MATERIALS.armor);
      const elbow = new THREE.Group();
      elbow.position.set(0, -0.4, 0.04);
      shoulder.add(elbow);
      makeLimb(elbow, 0, -0.17, 0.05, 0.1, 0.34, 0.12, ENEMY_MATERIALS.armorDark);
      makeLimb(elbow, 0, -0.34, 0.09, 0.1, 0.1, 0.12, ENEMY_MATERIALS.wrap);
      if (side === -1) { rig.leftArm = shoulder; rig.leftElbow = elbow; }
      else { rig.rightArm = shoulder; rig.rightElbow = elbow; }
    }
    rig.weaponBaseRotX = -0.1;
    visual.rotation.x = 0;
  } else {
    const body = new THREE.Group();
    visual.add(body);
    rig.body = body;

    const hips = new THREE.Group();
    hips.position.y = 0.83;
    body.add(hips);
    rig.hips = hips;
    for (const side of [-1, 1]) {
      const thigh = new THREE.Group();
      thigh.position.set(side * 0.22, 0, 0);
      hips.add(thigh);
      makeLimb(thigh, 0, -0.26, 0, 0.22, 0.52, 0.24, ENEMY_MATERIALS.rust);
      const shin = new THREE.Group();
      shin.position.y = -0.51;
      thigh.add(shin);
      makeLimb(shin, 0, -0.23, 0.02, 0.19, 0.46, 0.2, ENEMY_MATERIALS.armorDark);
      makeLimb(shin, 0, -0.47, 0.1, 0.24, 0.12, 0.38, ENEMY_MATERIALS.armor);
      if (side === -1) rig.leftLeg = thigh; else rig.rightLeg = thigh;
      if (side === -1) rig.leftShin = shin; else rig.rightShin = shin;
    }

    const torso = new THREE.Group();
    torso.position.y = 1.35;
    torso.rotation.x = 0.16;
    body.add(torso);
    rig.torso = torso;
    makeLimb(torso, 0, 0.02, 0, 0.78, 0.93, 0.48, ENEMY_MATERIALS.rust, 'body');
    makeLimb(torso, 0, 0.08, 0.26, 0.56, 0.65, 0.08, ENEMY_MATERIALS.armor, 'body');
    makeLimb(torso, 0, -0.18, 0.28, 0.34, 0.12, 0.06, ENEMY_SEAM_MATERIAL, 'body');
    for (const side of [-1, 1]) {
      const pad = makeLimb(torso, side * 0.46, 0.31, 0, 0.26, 0.22, 0.52, ENEMY_MATERIALS.armor, 'body');
      pad.rotation.z = side * -0.18;
      makeLimb(torso, side * 0.4, 0.18, 0.27, 0.1, 0.28, 0.04, ENEMY_MATERIALS.steel, 'body');
      for (let s = 0; s < 3; s++) {
        const spike = makeLimb(torso, side * 0.52, 0.42 + s * 0.045, -0.1 + s * 0.1, 0.08, 0.12, 0.08, ENEMY_MATERIALS.bone, 'body');
        spike.rotation.z = side * 0.4;
      }
    }
    // Open furnace ribs on the chest.
    for (let i = 0; i < 4; i++) {
      makeLimb(torso, 0, -0.1 + i * 0.16, 0.315, 0.37 - i * 0.02, 0.026, 0.025, ENEMY_SEAM_MATERIAL, 'body');
    }
    makeLimb(torso, 0, -0.32, 0.3, 0.24, 0.22, 0.06, ENEMY_MATERIALS.armorDark, 'body');
    makeLimb(torso, 0, -0.32, 0.335, 0.1, 0.1, 0.02, ENEMY_SEAM_MATERIAL, 'body');

    // Small, low head and mask.
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.61, 0.08);
    torso.add(headGroup);
    rig.head = headGroup;
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), ENEMY_MATERIALS.armor);
    helmet.scale.set(1.2, 0.85, 1.05);
    headGroup.add(helmet);
    add(helmet, 'head');
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.17, 0.15), ENEMY_MATERIALS.armorDark);
    face.position.set(0, -0.09, 0.12);
    headGroup.add(face);
    add(face, 'head');
    for (const sign of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.023, 0.012), ENEMY_MATERIALS.eye);
      eye.position.set(sign * 0.08, -0.075, 0.2);
      headGroup.add(eye);
      add(eye, 'head');
    }
    makeLimb(headGroup, 0, 0.11, 0.04, 0.47, 0.06, 0.35, ENEMY_MATERIALS.rust, 'head');

    // Massive wrecking-ball arms.
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.48, 0.25, 0.02);
      shoulder.rotation.z = side * 0.17;
      torso.add(shoulder);
      makeLimb(shoulder, 0, -0.31, 0, 0.23, 0.67, 0.25, ENEMY_MATERIALS.rust);
      const elbow = new THREE.Group();
      elbow.position.y = -0.62;
      shoulder.add(elbow);
      makeLimb(elbow, 0, -0.24, 0.03, 0.18, 0.48, 0.2, ENEMY_MATERIALS.armorDark);
      const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), ENEMY_MATERIALS.armor);
      fist.position.set(0, -0.54, 0.06);
      elbow.add(fist);
      add(fist);
      makeLimb(elbow, 0, -0.65, 0.05, 0.08, 0.16, 0.08, ENEMY_MATERIALS.steel);
      if (side === -1) { rig.leftArm = shoulder; rig.leftElbow = elbow; }
      else { rig.rightArm = shoulder; rig.rightElbow = elbow; }
    }
    visual.rotation.x = 0;
    rig.weapon = null;
  }

  // Per-enemy vital bar, kept separate so it can billboard toward the camera.
  const bar = new THREE.Group();
  const barWidth = type.key === 'brute' ? 0.82 : 0.58;
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(barWidth, 0.043), HEALTH_BAR_BG);
  bar.add(bg);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(barWidth - 0.012, 0.031), HEALTH_BAR_FILL);
  fill.position.z = 0.002;
  bar.add(fill);
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(barWidth + 0.025, 0.004), HEALTH_BAR_EDGE);
  edge.position.set(0, 0.03, 0.001);
  bar.add(edge);
  bar.visible = false;
  bar.renderOrder = 10;
  runtime.worldRoot.add(bar);

  const height = type.key === 'brute' ? 2.5 : 2.12;
  bar.position.set(0, height, 0);

  return {
    root,
    visual,
    rig,
    shadow,
    hitMeshes,
    healthBar: bar,
    healthFill: fill,
    healthBarWidth: barWidth - 0.012,
    barHeight: height,
  };
}

function chooseEnemyName(type) {
  return pick(type.names);
}

function spawnEnemy(typeKey = 'stalker', spawnOverride = null) {
  const type = ENEMY_TYPES[typeKey] || ENEMY_TYPES.stalker;
  const station = runtime.currentStation;
  if (!station) return null;

  const points = station.spawnPoints.map((point) => ({
    x: point.x,
    z: station.centerZ + point.z,
  }));
  let spawnPoint = spawnOverride;
  if (!spawnPoint) {
    const valid = points.filter((point) => {
      const dx = point.x - player.position.x;
      const dz = point.z - player.position.z;
      return dx * dx + dz * dz > 12;
    });
    spawnPoint = pick(valid.length ? valid : points);
  }

  const model = buildEnemyModel(type);
  const roundScale = 1 + Math.max(0, G.round - 1) * 0.095;
  const enemy = {
    type,
    name: chooseEnemyName(type),
    group: model.root,
    visual: model.visual,
    rig: model.rig,
    healthBar: model.healthBar,
    healthFill: model.healthFill,
    healthBarWidth: model.healthBarWidth,
    barHeight: model.barHeight,
    hitMeshes: model.hitMeshes,
    health: type.health * roundScale,
    maxHealth: type.health * roundScale,
    speed: type.speed * (1 + Math.max(0, G.round - 1) * 0.018),
    damage: type.damage * (1 + Math.max(0, G.round - 1) * 0.045),
    attackCooldown: rand(0.4, 1.0),
    attackWindup: 0,
    state: 'spawning',
    spawnT: 0,
    deathT: 0,
    dying: false,
    alive: true,
    walkTime: rand(0, TAU),
    strafeDir: chance(0.5) ? 1 : -1,
    strafeTimer: rand(0.5, 2.0),
    velocity: new THREE.Vector3(),
    lastHitAt: -10,
    hitFlash: 0,
    aimAimTime: 0,
    firing: false,
    headHeight: type.headHeight,
    radius: type.radius,
    grounded: true,
  };

  enemy.group.position.set(spawnPoint.x, 0, spawnPoint.z);
  enemy.group.rotation.y = rand(0, TAU);
  enemy.group.scale.setScalar(0.02);
  runtime.worldRoot.add(enemy.group);
  runtime.enemyList.push(enemy);

  for (const mesh of enemy.hitMeshes) {
    mesh.userData.enemyRef = enemy;
    runtime.enemyHitMeshes.push(mesh);
  }

  enemy.healthBar.position.set(enemy.group.position.x, enemy.barHeight, enemy.group.position.z);
  updateEnemyHealthBar(enemy);

  if (runtime.particles) {
    const p = new THREE.Vector3(enemy.group.position.x, 0.15, enemy.group.position.z);
    runtime.particles.burst(p, new THREE.Vector3(0, 1, 0), 'spawn');
  }
  if (runtime.audio && chance(0.65)) {
    const pan = clamp((enemy.group.position.x - player.position.x) / 7, -0.8, 0.8);
    runtime.audio.enemyAlert(pan);
  }

  if (G.wave.active) {
    G.wave.spawned++;
    G.wave.alive++;
  }
  return enemy;
}

function updateEnemyHealthBar(enemy) {
  if (!enemy.healthBar) return;
  const ratio = clamp01(enemy.health / enemy.maxHealth);
  enemy.healthBar.visible = enemy.alive && !enemy.dying && ratio < 0.999 && G.state !== 'menu';
  const width = enemy.healthBarWidth;
  enemy.healthFill.scale.x = Math.max(0.001, ratio);
  enemy.healthFill.position.x = -width / 2 + (width * ratio) / 2;
  const color = ratio > 0.5 ? 0xff8c5c : ratio > 0.22 ? 0xff6345 : 0xff3b2b;
  if (enemy.healthFill.material === HEALTH_BAR_FILL) {
    // All enemies share the same fill material; keep it at the danger tint.
    HEALTH_BAR_FILL.color.setHex(0xff6b4f);
  } else {
    enemy.healthFill.material.color.setHex(color);
  }
}

function damageEnemy(enemy, amount, hitInfo = {}) {
  if (!enemy || !enemy.alive || enemy.dying) return { killed: false, headshot: false };
  enemy.health -= amount;
  enemy.lastHitAt = G.time;
  enemy.hitFlash = 0.12;
  if (enemy.group) {
    enemy.group.position.x += rand(-0.012, 0.012);
    enemy.group.position.z += rand(-0.012, 0.012);
  }
  updateEnemyHealthBar(enemy);
  const headshot = !!hitInfo.headshot;
  if (enemy.health <= 0) {
    killEnemy(enemy, headshot);
    return { killed: true, headshot };
  }
  // Being shot makes gunners and stalkers react immediately.
  if (enemy.attackCooldown > 0.3) enemy.attackCooldown = Math.min(enemy.attackCooldown, 0.3);
  return { killed: false, headshot };
}

function killEnemy(enemy, headshot = false) {
  if (!enemy.alive || enemy.dying) return;
  enemy.alive = false;
  enemy.dying = true;
  enemy.state = 'dying';
  enemy.deathT = 0;
  enemy.health = 0;
  enemy.healthBar.visible = false;
  if (G.wave.alive > 0) G.wave.alive--;
  G.stats.kills++;
  if (headshot) G.stats.headshots++;
  G.flow.xp += headshot ? 18 : 10;
  addKillFeed(enemy.name, headshot);
  if (runtime.audio) runtime.audio.enemyDeath();
  if (runtime.particles) {
    const point = enemy.group.position.clone().add(new THREE.Vector3(0, 1.25, 0));
    runtime.particles.burst(point, new THREE.Vector3(0, 1, 0), 'blood');
    runtime.particles.burst(point, new THREE.Vector3(0, 1, 0), 'sparks');
  }
  // Remove immediately from manual ray lists.
  runtime.enemyHitMeshes = runtime.enemyHitMeshes.filter((mesh) => mesh.userData.enemyRef !== enemy);

  // Salvage.
  const roll = Math.random();
  if (roll < 0.26) {
    spawnPickup('health', enemy.group.position.clone().add(new THREE.Vector3(rand(-0.2, 0.2), 0.1, rand(-0.2, 0.2))));
  } else if (roll < 0.5) {
    spawnPickup('armor', enemy.group.position.clone().add(new THREE.Vector3(rand(-0.2, 0.2), 0.1, rand(-0.2, 0.2))));
  } else if (roll < 0.86) {
    spawnPickup('ammo', enemy.group.position.clone().add(new THREE.Vector3(rand(-0.2, 0.2), 0.1, rand(-0.2, 0.2))));
  }
}

function updateEnemyDeath(enemy, dt) {
  enemy.deathT += dt;
  const t = clamp01(enemy.deathT / 1.55);
  enemy.visual.rotation.z = damp(enemy.visual.rotation.z, (enemy.group.position.x > player.position.x ? 1 : -1) * 1.35, 3.5, dt);
  enemy.visual.rotation.x = damp(enemy.visual.rotation.x, 0.5, 2.2, dt);
  enemy.group.position.y = damp(enemy.group.position.y, -0.48, 1.7, dt);
  enemy.healthBar.visible = false;
  if (enemy.deathT > 0.55) {
    const fadeScale = clamp01(1 - (enemy.deathT - 0.55) / 1.0);
    enemy.group.scale.setScalar(Math.max(0.02, fadeScale));
  }
  if (enemy.deathT >= 1.6) {
    removeEnemy(enemy);
  }
}

function removeEnemy(enemy) {
  const index = runtime.enemyList.indexOf(enemy);
  if (index >= 0) runtime.enemyList.splice(index, 1);
  runtime.enemyHitMeshes = runtime.enemyHitMeshes.filter((mesh) => mesh.userData.enemyRef !== enemy);
  if (enemy.group) enemy.group.removeFromParent();
  if (enemy.healthBar) enemy.healthBar.removeFromParent();
}

const ENEMY_COLLISION_EPSILON = 0.0001;

function enemyCollidesAt(x, z, radius) {
  const station = runtime.currentStation;
  if (!station) return false;
  if (x < WORLD.platformEdgeX + radius + 0.15 || x > WORLD.wallX - radius - 0.16) return true;
  if (z < station.centerZ - 44.5 || z > station.centerZ + 44.5) return true;
  for (const collider of station.colliders) {
    const closestX = clamp(x, collider.minX, collider.maxX);
    const closestZ = clamp(z, collider.minZ, collider.maxZ);
    const dx = x - closestX;
    const dz = z - closestZ;
    if (dx * dx + dz * dz < (radius + ENEMY_COLLISION_EPSILON) * (radius + ENEMY_COLLISION_EPSILON)) return true;
  }
  return false;
}

function moveEnemy(enemy, dx, dz) {
  const pos = enemy.group.position;
  const nextX = pos.x + dx;
  if (!enemyCollidesAt(nextX, pos.z, enemy.radius)) {
    pos.x = nextX;
  } else {
    enemy.velocity.x *= -0.12;
  }
  const nextZ = pos.z + dz;
  if (!enemyCollidesAt(pos.x, nextZ, enemy.radius)) {
    pos.z = nextZ;
  } else {
    enemy.velocity.z *= -0.12;
  }
}

function hasEnemyLineOfSight(enemy, targetPoint) {
  const origin = enemy.group.position.clone().add(new THREE.Vector3(0, 1.45, 0));
  const direction = targetPoint.clone().sub(origin);
  const distance = direction.length();
  if (distance < 0.1) return true;
  direction.normalize();
  const ray = new THREE.Raycaster(origin, direction, 0.18, distance - 0.35);
  const blockers = getShootBlockers();
  if (!blockers.length) return true;
  const hits = ray.intersectObjects(blockers, true);
  return hits.length === 0;
}

function updateEnemyAnimation(enemy, dt) {
  const { rig } = enemy;
  const speed = enemy.velocity.length();
  const moving = speed > 0.2;
  if (moving) enemy.walkTime += dt * (4.2 + speed * 1.6);
  const swing = moving ? Math.sin(enemy.walkTime) * 0.62 : Math.sin(G.time * 1.5 + enemy.walkTime) * 0.025;
  const swingOpposite = moving ? Math.sin(enemy.walkTime + Math.PI) * 0.62 : -swing;

  if (enemy.state === 'spawning') {
    enemy.spawnT += dt;
    const t = clamp01(enemy.spawnT / 0.55);
    const ease = easeOutCubic(t);
    enemy.group.scale.setScalar(lerp(0.04, 1, ease));
    enemy.visual.position.y = lerp(-0.5, 0, ease);
    if (t >= 1) {
      enemy.state = 'chase';
      enemy.group.scale.setScalar(1);
      enemy.visual.position.y = 0;
    }
    enemy.group.rotation.y = enemy.group.rotation.y;
    enemy.healthBar.position.set(enemy.group.position.x, enemy.barHeight, enemy.group.position.z);
    return;
  }

  const stride = moving ? 1 : 0.12;
  if (rig.leftLeg) rig.leftLeg.rotation.x = swing * stride;
  if (rig.rightLeg) rig.rightLeg.rotation.x = swingOpposite * stride;
  if (rig.leftShin) rig.leftShin.rotation.x = Math.max(0, -swing * 0.55) * stride;
  if (rig.rightShin) rig.rightShin.rotation.x = Math.max(0, -swingOpposite * 0.55) * stride;

  if (rig.torso) {
    rig.torso.position.y += (enemy.type.key === 'brute' ? 1.35 : 1.2) - rig.torso.position.y;
    if (enemy.state === 'attacking') {
      const wind = clamp01(enemy.attackWindup / enemy.type.windup);
      rig.torso.rotation.x = 0.16 + Math.sin(wind * Math.PI) * -0.22;
    } else {
      rig.torso.rotation.x = 0.05 + Math.sin(enemy.walkTime * 2) * (moving ? 0.025 : 0.008);
    }
  }
  if (rig.hips) rig.hips.position.y = (enemy.type.key === 'brute' ? 0.83 : 0.83) + Math.abs(Math.sin(enemy.walkTime)) * 0.025 * stride;
  enemy.visual.position.y = Math.sin(enemy.walkTime * 2) * 0.018 * stride;

  if (enemy.state === 'attacking' && enemy.attackWindup > 0) {
    if (rig.rightArm) rig.rightArm.rotation.x = -0.45 - Math.sin((1 - enemy.attackWindup / enemy.type.windup) * Math.PI) * 1.25;
    if (rig.leftArm) rig.leftArm.rotation.x = 0.2;
    if (rig.torso) rig.torso.rotation.x = 0.2;
  } else if (enemy.type.key === 'gunner') {
    if (rig.rightArm) {
      rig.rightArm.rotation.x = damp(rig.rightArm.rotation.x, -0.62, 8, dt);
      rig.rightArm.rotation.z = damp(rig.rightArm.rotation.z, -0.12, 8, dt);
    }
    if (rig.leftArm) {
      rig.leftArm.rotation.x = damp(rig.leftArm.rotation.x, -0.92, 8, dt);
      rig.leftArm.rotation.z = damp(rig.leftArm.rotation.z, 0.28, 8, dt);
    }
    if (rig.weapon) {
      if (enemy.firing) {
        rig.weapon.position.z = 0.31 + Math.sin(G.time * 45) * 0.012;
      } else {
        rig.weapon.position.z = damp(rig.weapon.position.z, 0.31, 10, dt);
      }
    }
  } else if (enemy.type.key === 'brute') {
    if (rig.leftArm) {
      rig.leftArm.rotation.x = -0.08 + (moving ? swingOpposite * 0.18 : 0) + (enemy.state === 'attacking' ? -0.45 : 0);
      rig.leftArm.rotation.z = -0.17;
    }
    if (rig.rightArm) {
      rig.rightArm.rotation.x = -0.08 + (moving ? swing * 0.18 : 0) + (enemy.state === 'attacking' ? -0.45 : 0);
      rig.rightArm.rotation.z = 0.17;
    }
  } else {
    if (rig.leftArm) rig.leftArm.rotation.x = 0.1 + swingOpposite * 0.55;
    if (rig.rightArm) rig.rightArm.rotation.x = 0.1 + swing * 0.55;
    if (rig.leftElbow) rig.leftElbow.rotation.x = -0.12 + Math.max(0, swingOpposite) * 0.22;
    if (rig.rightElbow) rig.rightElbow.rotation.x = -0.12 + Math.max(0, swing) * 0.22;
  }

  if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
}

function updateEnemyAI(enemy, dt) {
  if (!enemy.alive || enemy.dying || enemy.state === 'spawning') return;
  if (!canPlayerControl()) return;
  const pos = enemy.group.position;
  const toPlayer = new THREE.Vector3(player.position.x - pos.x, 0, player.position.z - pos.z);
  const distance = toPlayer.length();
  if (distance < 0.001) return;
  toPlayer.normalize();

  const type = enemy.type;
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

  // Face the player. Model forward is local +Z.
  const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
  enemy.group.rotation.y = damp(enemy.group.rotation.y, targetYaw, 8, dt);

  let desiredX = 0;
  let desiredZ = 0;
  let wantMove = true;

  if (type.ranged) {
    const preferred = type.preferredRange + Math.sin(G.time * 0.7 + enemy.walkTime) * 1.2;
    enemy.strafeTimer -= dt;
    if (enemy.strafeTimer <= 0) {
      enemy.strafeTimer = rand(1.0, 2.8);
      enemy.strafeDir *= -1;
    }
    if (distance > preferred + 2.0) {
      desiredX = toPlayer.x;
      desiredZ = toPlayer.z;
    } else if (distance < preferred - 3.0) {
      desiredX = -toPlayer.x;
      desiredZ = -toPlayer.z;
    } else {
      desiredX = -toPlayer.z * enemy.strafeDir * 0.8;
      desiredZ = toPlayer.x * enemy.strafeDir * 0.8;
    }
    if (enemy.attackWindup > 0) {
      desiredX *= 0.2;
      desiredZ *= 0.2;
    }
  } else {
    if (distance > enemy.type.range * 0.82) {
      desiredX = toPlayer.x;
      desiredZ = toPlayer.z;
    } else {
      wantMove = false;
    }
    if (enemy.state === 'attacking') {
      wantMove = false;
    }
  }

  // Separation so a pack doesn't collapse into a single silhouette.
  for (const other of runtime.enemyList) {
    if (other === enemy || !other.alive || other.dying) continue;
    const dx = pos.x - other.group.position.x;
    const dz = pos.z - other.group.position.z;
    const d2 = dx * dx + dz * dz;
    const minDist = enemy.radius + other.radius + 0.36;
    if (d2 > 0.0001 && d2 < minDist * minDist) {
      const d = Math.sqrt(d2);
      desiredX += (dx / d) * (1 - d / minDist) * 1.8;
      desiredZ += (dz / d) * (1 - d / minDist) * 1.8;
    }
  }

  // Avoid walking directly through the player.
  if (distance < 0.95) {
    desiredX -= toPlayer.x * 1.8;
    desiredZ -= toPlayer.z * 1.8;
  }

  const desiredLength = Math.hypot(desiredX, desiredZ);
  if (wantMove && desiredLength > 0.001) {
    desiredX /= desiredLength;
    desiredZ /= desiredLength;
  } else {
    desiredX = 0;
    desiredZ = 0;
  }

  const accel = 10;
  enemy.velocity.x = damp(enemy.velocity.x, desiredX * enemy.speed, accel, dt);
  enemy.velocity.z = damp(enemy.velocity.z, desiredZ * enemy.speed, accel, dt);
  moveEnemy(enemy, enemy.velocity.x * dt, enemy.velocity.z * dt);

  // Ranged attack.
  if (type.ranged) {
    if (enemy.attackWindup > 0) {
      enemy.attackWindup -= dt;
      enemy.firing = true;
      if (enemy.attackWindup <= 0) {
        enemy.firing = false;
        if (runtime.audio) runtime.audio.enemyShot(clamp((pos.x - player.position.x) / 8, -0.8, 0.8));
        launchEnemyProjectile(enemy);
        enemy.attackCooldown = type.cooldown + rand(-0.2, 0.5);
      }
    } else if (enemy.attackCooldown <= 0 && distance < type.range && distance > 2.5) {
      const chest = player.position.clone().add(new THREE.Vector3(0, 1.15, 0));
      if (hasEnemyLineOfSight(enemy, chest)) {
        enemy.attackWindup = type.windup;
        enemy.aimAimTime = 0;
      } else {
        enemy.attackCooldown = 0.35;
      }
    }
    // Muzzle glow flickers before firing.
    if (enemy.rig.muzzleGlow) {
      const glow = enemy.attackWindup > 0 ? 0.35 + Math.sin(G.time * 18) * 0.18 : 0.13;
      enemy.rig.muzzleGlow.material.opacity = glow;
    }
    if (enemy.rig.weapon) {
      const aimTilt = enemy.attackWindup > 0 ? -0.06 : 0;
      enemy.rig.weapon.rotation.x = damp(enemy.rig.weapon.rotation.x, aimTilt, 8, dt);
    }
  } else {
    // Melee attack.
    if (enemy.attackWindup > 0) {
      enemy.attackWindup -= dt;
      enemy.state = 'attacking';
      if (enemy.attackWindup <= 0) {
        enemy.state = 'chase';
        if (distance < type.range + 0.7) {
          if (runtime.audio) runtime.audio.enemyMelee(clamp((pos.x - player.position.x) / 8, -0.8, 0.8));
          damagePlayer(enemy.damage, pos, enemy.type.key);
          G.flow.screenShake = Math.min(1.6, G.flow.screenShake + 0.55);
        }
        enemy.attackCooldown = type.cooldown + rand(-0.12, 0.3);
      }
    } else if (enemy.attackCooldown <= 0 && distance < type.range + 0.45) {
      enemy.attackWindup = type.windup;
      enemy.state = 'attacking';
      if (runtime.audio) {
        runtime.audio.enemyMelee(clamp((pos.x - player.position.x) / 10, -0.7, 0.7));
      }
    } else if (enemy.state !== 'attacking') {
      enemy.state = 'chase';
    }
  }

  // A brute's footfalls are felt through the floor.
  if (type.key === 'brute' && enemy.velocity.lengthSq() > 1.2) {
    enemy.footTimer = (enemy.footTimer || 0) + dt;
    if (enemy.footTimer > 0.55) {
      enemy.footTimer = 0;
      G.flow.screenShake = Math.min(1.3, G.flow.screenShake + 0.06);
    }
  }

  // Keep the bar anchored above the body.
  enemy.healthBar.position.set(pos.x, enemy.barHeight, pos.z);
  enemy.healthBar.quaternion.copy(runtime.worldCamera.quaternion);
  updateEnemyHealthBar(enemy);
}

function updateEnemies(dt) {
  for (let i = runtime.enemyList.length - 1; i >= 0; i--) {
    const enemy = runtime.enemyList[i];
    if (enemy.dying) {
      updateEnemyDeath(enemy, dt);
      continue;
    }
    updateEnemyAnimation(enemy, dt);
    if (enemy.alive && G.state === 'playing') updateEnemyAI(enemy, dt);
    if (enemy.healthBar.visible) {
      enemy.healthBar.position.set(enemy.group.position.x, enemy.barHeight, enemy.group.position.z);
      enemy.healthBar.quaternion.copy(runtime.worldCamera.quaternion);
    }
  }
}

/* --------------------------------------------------------------------------
   Projectiles
   -------------------------------------------------------------------------- */

const ENEMY_BULLET_GEO = new THREE.SphereGeometry(0.065, 7, 6);
const ENEMY_BULLET_MAT = new THREE.MeshBasicMaterial({ color: 0xff7148, toneMapped: false });
const ENEMY_BULLET_GLOW = new THREE.SpriteMaterial({
  map: SOFT_GLOW_TEXTURE,
  color: 0xff5d31,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

function launchEnemyProjectile(enemy) {
  if (!enemy || !enemy.alive) return;
  const origin = new THREE.Vector3();
  if (enemy.rig.muzzle) {
    enemy.rig.muzzle.getWorldPosition(origin);
  } else {
    enemy.group.getWorldPosition(origin);
    origin.y += 1.25;
    origin.z += 0.35;
  }
  const target = player.position.clone().add(new THREE.Vector3(rand(-0.22, 0.22), 1.06 + rand(-0.16, 0.12), rand(-0.22, 0.22)));
  const direction = target.sub(origin).normalize();
  const mesh = new THREE.Mesh(ENEMY_BULLET_GEO, ENEMY_BULLET_MAT);
  mesh.position.copy(origin);
  const glow = new THREE.Sprite(ENEMY_BULLET_GLOW);
  glow.scale.set(0.75, 0.75, 1);
  mesh.add(glow);
  runtime.worldRoot.add(mesh);
  runtime.projectiles.push({
    mesh,
    glow,
    velocity: direction.multiplyScalar(enemy.type.projectileSpeed),
    life: 4.0,
    damage: enemy.type.damage,
    type: 'enemy',
  });
  if (runtime.particles) runtime.particles.burst(origin, direction, 'sparks');
}

function updateProjectiles(dt) {
  const playerCenter = player.position.clone().add(new THREE.Vector3(0, 1.05, 0));
  for (let i = runtime.projectiles.length - 1; i >= 0; i--) {
    const projectile = runtime.projectiles[i];
    projectile.life -= dt;
    const previous = projectile.mesh.position.clone();
    projectile.mesh.position.addScaledVector(projectile.velocity, dt);
    const current = projectile.mesh.position;
    if (projectile.life <= 0) {
      removeProjectile(i);
      continue;
    }

    // Hit the player's torso volume using the swept segment.
    const segment = current.clone().sub(previous);
    const segmentLengthSq = Math.max(0.00001, segment.lengthSq());
    const t = clamp01(playerCenter.clone().sub(previous).dot(segment) / segmentLengthSq);
    const closest = previous.clone().addScaledVector(segment, t);
    if (closest.distanceTo(playerCenter) < 0.48) {
      damagePlayer(projectile.damage, previous, 'projectile');
      if (runtime.particles) runtime.particles.burst(current, projectile.velocity.clone().normalize(), 'sparks');
      removeProjectile(i);
      continue;
    }

    let hitWorld = false;
    if (current.x < WORLD.oppositeWallX + 0.2 || current.x > WORLD.wallX - 0.2) hitWorld = true;
    if (current.y < 0.05 || current.y > WORLD.ceilingY - 0.1) hitWorld = true;
    const station = runtime.currentStation;
    if (station) {
      if (current.z < station.centerZ - 96 || current.z > station.centerZ + 96) hitWorld = true;
      if (!hitWorld) {
        for (const collider of station.colliders) {
          if (current.x > collider.minX && current.x < collider.maxX && current.z > collider.minZ && current.z < collider.maxZ && current.y < 2.2) {
            hitWorld = true;
            break;
          }
        }
      }
    }
    if (hitWorld) {
      if (runtime.particles) runtime.particles.burst(current, projectile.velocity.clone().normalize().negate(), 'sparks');
      removeProjectile(i);
      continue;
    }

    projectile.mesh.rotation.x += dt * 8;
    projectile.mesh.rotation.y += dt * 11;
    const pulse = 0.65 + Math.sin(G.time * 40 + i) * 0.16;
    projectile.glow.scale.setScalar(pulse);
  }
}

function removeProjectile(index) {
  const projectile = runtime.projectiles[index];
  if (!projectile) return;
  projectile.mesh.removeFromParent();
  runtime.projectiles.splice(index, 1);
}

/* --------------------------------------------------------------------------
   Salvage pickups
   -------------------------------------------------------------------------- */

const PICKUP_RING_GEO = new THREE.TorusGeometry(0.27, 0.012, 5, 22);
const PICKUP_GLOW_MAT = {
  health: new THREE.SpriteMaterial({ map: SOFT_GLOW_TEXTURE, color: 0x70ffb0, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
  armor: new THREE.SpriteMaterial({ map: SOFT_GLOW_TEXTURE, color: 0x7cc9ff, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
  ammo: new THREE.SpriteMaterial({ map: SOFT_GLOW_TEXTURE, color: 0xffc177, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
};

const PICKUP_MATS = {
  health: new THREE.MeshStandardMaterial({ color: 0x92ffc1, emissive: 0x1b9b55, emissiveIntensity: 0.8, roughness: 0.35, metalness: 0.3 }),
  armor: new THREE.MeshStandardMaterial({ color: 0x9bd4ff, emissive: 0x1f68a0, emissiveIntensity: 0.65, roughness: 0.27, metalness: 0.6 }),
  ammo: new THREE.MeshStandardMaterial({ color: 0xffc477, emissive: 0x8e4d16, emissiveIntensity: 0.56, roughness: 0.43, metalness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x0b1311, roughness: 0.47, metalness: 0.38 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe9f4e4, emissive: 0xb3d9c4, emissiveIntensity: 0.24, roughness: 0.42, metalness: 0.2 }),
};

function buildPickupVisual(kind) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(PICKUP_RING_GEO, new THREE.MeshBasicMaterial({
    color: kind === 'health' ? 0x72ffb5 : kind === 'armor' ? 0x7cc9ff : 0xffc27b,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);

  if (kind === 'health') {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.28, 8), PICKUP_MATS.health);
    can.position.y = 0.24;
    group.add(can);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.172, 0.07, 8), PICKUP_MATS.dark);
    band.position.y = 0.23;
    group.add(band);
    viewBox(group, 0.16, 0.04, 0.05, PICKUP_MATS.dark, 0, 0.28, 0.16);
  } else if (kind === 'armor') {
    const plate = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), PICKUP_MATS.armor);
    plate.scale.set(0.9, 1.2, 0.35);
    plate.position.y = 0.3;
    group.add(plate);
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.03, 0.22), PICKUP_MATS.dark);
    notch.position.y = 0.29;
    group.add(notch);
    viewBox(group, 0.06, 0.18, 0.06, PICKUP_MATS.white, 0, 0.35, 0.1);
  } else {
    const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.23, 0.28), PICKUP_MATS.ammo);
    caseMesh.position.y = 0.23;
    group.add(caseMesh);
    viewBox(group, 0.38, 0.055, 0.3, PICKUP_MATS.dark, 0, 0.22, 0);
    for (let i = 0; i < 3; i++) {
      viewCylinder(group, 0.028, 0.028, 0.15, 8, PICKUP_MATS.white, -0.09 + i * 0.09, 0.38, 0.02, 0, 0, 0.15);
    }
    viewBox(group, 0.12, 0.08, 0.01, PICKUP_MATS.white, 0.07, 0.23, 0.145);
  }

  const glow = new THREE.Sprite(PICKUP_GLOW_MAT[kind]);
  glow.scale.set(1.05, 1.05, 1);
  glow.position.y = 0.3;
  group.add(glow);
  group.userData.ring = ring;
  return group;
}

function spawnPickup(kind, position) {
  if (!position) return;
  const group = buildPickupVisual(kind);
  group.position.copy(position);
  group.position.y = Math.max(0.08, position.y || 0.08);
  runtime.worldRoot.add(group);
  runtime.pickups.push({
    kind,
    group,
    baseY: group.position.y,
    life: 28,
    age: 0,
    bobSeed: rand(0, TAU),
    collected: false,
  });
  if (runtime.particles) {
    runtime.particles.burst(group.position.clone().add(new THREE.Vector3(0, 0.25, 0)), new THREE.Vector3(0, 1, 0), 'pickup');
  }
}

function collectPickup(pickup) {
  if (pickup.collected) return;
  pickup.collected = true;
  let collected = false;
  if (pickup.kind === 'health') {
    if (player.health < player.maxHealth) {
      player.health = Math.min(player.maxHealth, player.health + 28);
      showPickupNote('BIO-GEL APPLIED  +28 HP');
      collected = true;
    }
  } else if (pickup.kind === 'armor') {
    if (player.armor < player.maxArmor) {
      player.armor = Math.min(player.maxArmor, player.armor + 30);
      showPickupNote('PLATE RESTORED  +30');
      collected = true;
    }
  } else {
    const active = runtime.activeWeapon;
    if (active) {
      const amount = Math.ceil(active.config.magazine * 0.55 + active.config.magazine);
      active.reserve = Math.min(active.config.maxReserve, active.reserve + amount);
      // Give a smaller top-up to the other tools so every pickup feels useful.
      player.weapons.forEach((weapon) => {
        if (weapon !== active) weapon.reserve = Math.min(weapon.config.maxReserve, weapon.reserve + Math.ceil(weapon.config.magazine * 0.38));
      });
      updateWeaponHUD(true);
      showPickupNote('AMMUNITION SALVAGED');
      collected = true;
    }
  }
  if (!collected) {
    pickup.collected = false;
    return;
  }
  if (runtime.audio) runtime.audio.pickup(pickup.kind);
  if (runtime.particles) {
    runtime.particles.burst(pickup.group.position.clone().add(new THREE.Vector3(0, 0.4, 0)), new THREE.Vector3(0, 1, 0), 'pickup');
  }
  pickup.group.removeFromParent();
  const index = runtime.pickups.indexOf(pickup);
  if (index >= 0) runtime.pickups.splice(index, 1);
}

function updatePickups(dt) {
  for (let i = runtime.pickups.length - 1; i >= 0; i--) {
    const pickup = runtime.pickups[i];
    pickup.age += dt;
    pickup.life -= dt;
    const bob = Math.sin(pickup.age * 2.9 + pickup.bobSeed) * 0.05;
    pickup.group.position.y = pickup.baseY + 0.28 + bob;
    pickup.group.rotation.y += dt * 1.3;
    if (pickup.group.userData.ring) {
      pickup.group.userData.ring.rotation.z += dt * 0.7;
      pickup.group.userData.ring.material.opacity = 0.44 + Math.sin(pickup.age * 3 + pickup.bobSeed) * 0.16;
    }
    const dist = player.position.distanceTo(pickup.group.position);
    if (dist < 0.95) collectPickup(pickup);
    if (pickup.life < 3) {
      pickup.group.scale.setScalar(clamp01(pickup.life / 3));
    }
    if (pickup.life <= 0) {
      pickup.group.removeFromParent();
      runtime.pickups.splice(i, 1);
    }
  }
}

/* --------------------------------------------------------------------------
   Cleanup and wave helpers
   -------------------------------------------------------------------------- */

function clearCombatEntities() {
  for (const enemy of runtime.enemyList) {
    if (enemy.group) enemy.group.removeFromParent();
    if (enemy.healthBar) enemy.healthBar.removeFromParent();
  }
  runtime.enemyList.length = 0;
  runtime.enemyHitMeshes.length = 0;
  for (const projectile of runtime.projectiles) projectile.mesh.removeFromParent();
  runtime.projectiles.length = 0;
  for (const pickup of runtime.pickups) pickup.group.removeFromParent();
  runtime.pickups.length = 0;
  for (const shell of runtime.shells) shell.mesh.removeFromParent();
  runtime.shells.length = 0;
  removeTracerObjects();
  for (const decal of runtime.decals) {
    decal.mesh.removeFromParent();
    if (!decal.shared) {
      decal.mesh.geometry.dispose();
      decal.mesh.material.dispose();
    }
  }
  runtime.decals.length = 0;
  if (runtime.particles) runtime.particles.reset();
  G.wave.alive = 0;
}

function killAllEnemies() {
  for (const enemy of [...runtime.enemyList]) {
    if (enemy.alive) killEnemy(enemy, false);
  }
}

function chooseWaveType(round, index, total) {
  // A readable escalation: first contact is mostly stalkers, then gunners join,
  // and brutes become the anchor of the later half of each wave.
  const progress = total > 1 ? index / (total - 1) : 0;
  const roll = Math.random();
  if (round <= 1) return progress > 0.82 && roll < 0.16 ? 'gunner' : 'stalker';
  if (round === 2) {
    if (roll < 0.2 + progress * 0.1) return 'gunner';
    return 'stalker';
  }
  if (round === 3) {
    if (roll < 0.12 && progress > 0.55) return 'brute';
    if (roll < 0.42) return 'gunner';
    return 'stalker';
  }
  const bruteWeight = clamp(0.12 + round * 0.018, 0.12, 0.27);
  if (progress > 0.28 && roll < bruteWeight) return 'brute';
  if (roll < bruteWeight + 0.36) return 'gunner';
  return 'stalker';
}

function getEnemyCount(round) {
  return Math.min(24, 5 + round * 2);
}
