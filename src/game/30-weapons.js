/* ==========================================================================
   Weapons — procedural viewmodels, ballistics and combat effects
   ========================================================================== */

const WEAPON_MATERIALS = {
  metal: new THREE.MeshStandardMaterial({ color: 0x343c3d, metalness: 0.9, roughness: 0.27, envMapIntensity: 1.05 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x151b1c, metalness: 0.82, roughness: 0.37, envMapIntensity: 0.8 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x7b8480, metalness: 0.95, roughness: 0.2, envMapIntensity: 1.25 }),
  black: new THREE.MeshStandardMaterial({ color: 0x080b0b, metalness: 0.55, roughness: 0.48 }),
  polymer: new THREE.MeshStandardMaterial({ color: 0x171d1c, metalness: 0.12, roughness: 0.7 }),
  polymerLight: new THREE.MeshStandardMaterial({ color: 0x29312f, metalness: 0.16, roughness: 0.61 }),
  grip: new THREE.MeshStandardMaterial({ color: 0x101514, metalness: 0.08, roughness: 0.86 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xb68d43, metalness: 0.9, roughness: 0.22, envMapIntensity: 1.15 }),
  glove: new THREE.MeshStandardMaterial({ color: 0x1e2321, roughness: 0.79, metalness: 0.06 }),
  gloveLight: new THREE.MeshStandardMaterial({ color: 0x323b36, roughness: 0.65, metalness: 0.08 }),
  sleeve: new THREE.MeshStandardMaterial({ color: 0x222825, roughness: 0.86, metalness: 0.02 }),
  accentAmber: new THREE.MeshStandardMaterial({ color: 0xffbd66, emissive: 0xff9e36, emissiveIntensity: 0.42, metalness: 0.55, roughness: 0.34 }),
  accentTeal: new THREE.MeshStandardMaterial({ color: 0x64e5d1, emissive: 0x2ba190, emissiveIntensity: 0.5, metalness: 0.52, roughness: 0.3 }),
  accentRed: new THREE.MeshStandardMaterial({ color: 0xff6f55, emissive: 0xaa2d1d, emissiveIntensity: 0.5, metalness: 0.48, roughness: 0.35 }),
  glassAmber: new THREE.MeshStandardMaterial({
    color: 0x331f0a, emissive: 0xd87d1d, emissiveIntensity: 0.36, metalness: 0.64,
    roughness: 0.12, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false,
  }),
  glassTeal: new THREE.MeshStandardMaterial({
    color: 0x0b2724, emissive: 0x2a9e92, emissiveIntensity: 0.42, metalness: 0.6,
    roughness: 0.1, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false,
  }),
  tritium: new THREE.MeshStandardMaterial({ color: 0xd7ffe8, emissive: 0x8dffd8, emissiveIntensity: 2.2, roughness: 0.2 }),
  redDot: new THREE.MeshBasicMaterial({ color: 0xff4f3b, toneMapped: false }),
};

const SHELL_GEO = new THREE.CylinderGeometry(0.009, 0.009, 0.035, 6);
const SHELL_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xc49a45, metalness: 0.94, roughness: 0.19, envMapIntensity: 1.2,
});

const IMPACT_TEXTURE = makeCanvasTexture(128, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.48);
  grad.addColorStop(0, 'rgba(10,8,6,1)');
  grad.addColorStop(0.14, 'rgba(27,24,18,.98)');
  grad.addColorStop(0.32, 'rgba(52,46,36,.72)');
  grad.addColorStop(0.6, 'rgba(20,19,16,.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(10,9,7,.7)';
  for (let i = 0; i < 6; i++) {
    const a = rand(0, TAU);
    const r = rand(13, 38);
    ctx.lineWidth = rand(1, 3);
    ctx.beginPath();
    ctx.moveTo(w / 2 + Math.cos(a) * 7, h / 2 + Math.sin(a) * 7);
    ctx.lineTo(w / 2 + Math.cos(a + rand(-0.18, 0.18)) * r, h / 2 + Math.sin(a + rand(-0.18, 0.18)) * r);
    ctx.stroke();
  }
}, { colorSpace: false, anisotropy: false });

const IMPACT_MATERIAL = new THREE.MeshBasicMaterial({
  map: IMPACT_TEXTURE,
  transparent: true,
  opacity: 0.88,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  toneMapped: true,
});

/* --------------------------------------------------------------------------
   Particle field
   -------------------------------------------------------------------------- */

class CombatParticles {
  constructor(scene, count = 720) {
    this.count = count;
    this.cursor = 0;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);
    this.velocities = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.drag = new Float32Array(count);
    this.gravity = new Float32Array(count);
    this.active = 0;

    for (let i = 0; i < count; i++) this.positions[i * 3 + 1] = -999;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: SPARK_TEXTURE },
      },
      vertexShader: /* glsl */`
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (260.0 / max(0.2, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 textureColor = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vColor, textureColor.a * vAlpha);
          if (gl_FragColor.a < 0.012) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    this.geometry = geometry;
    this.material = material;
    scene.add(this.points);
  }

  spawn(x, y, z, vx, vy, vz, color, size, life, gravity = 4.8, drag = 1.8) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const p = i * 3;
    this.positions[p] = x;
    this.positions[p + 1] = y;
    this.positions[p + 2] = z;
    this.velocities[p] = vx;
    this.velocities[p + 1] = vy;
    this.velocities[p + 2] = vz;
    const c = runtime.temp.color.set(color);
    this.colors[p] = c.r;
    this.colors[p + 1] = c.g;
    this.colors[p + 2] = c.b;
    this.sizes[i] = size;
    this.alphas[i] = 1;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.gravity[i] = gravity;
    this.drag[i] = drag;
  }

  burst(position, normal, kind) {
    if (!position) return;
    const n = normal || new THREE.Vector3(0, 1, 0);
    if (kind === 'blood') {
      for (let i = 0; i < 12; i++) {
        this.spawn(
          position.x + rand(-0.06, 0.06), position.y + rand(-0.06, 0.06), position.z + rand(-0.06, 0.06),
          n.x * rand(0.4, 2.0) + rand(-1.5, 1.5), n.y * rand(0.2, 1.3) + rand(-0.2, 1.1), n.z * rand(0.4, 2.0) + rand(-1.5, 1.5),
          chance(0.35) ? 0xff5b3d : 0x792318, rand(0.06, 0.16), rand(0.25, 0.7), 7, 2.8
        );
      }
      return;
    }
    if (kind === 'dust') {
      for (let i = 0; i < 8; i++) {
        this.spawn(
          position.x + rand(-0.12, 0.12), position.y + rand(-0.04, 0.12), position.z + rand(-0.12, 0.12),
          n.x * rand(0.2, 0.8) + rand(-0.45, 0.45), rand(0.1, 0.55), n.z * rand(0.2, 0.8) + rand(-0.45, 0.45),
          0xbfb9a5, rand(0.15, 0.4), rand(0.5, 1.1), 0.65, 3.4
        );
      }
      return;
    }
    if (kind === 'spawn') {
      for (let i = 0; i < 20; i++) {
        const a = rand(0, TAU);
        const r = rand(0.1, 0.75);
        this.spawn(
          position.x + Math.cos(a) * r, position.y + rand(0.1, 0.8), position.z + Math.sin(a) * r,
          Math.cos(a) * rand(-0.5, 0.5), rand(0.2, 1.8), Math.sin(a) * rand(-0.5, 0.5),
          0xff572f, rand(0.06, 0.18), rand(0.4, 1.0), 1.2, 2.4
        );
      }
      return;
    }
    if (kind === 'pickup') {
      for (let i = 0; i < 12; i++) {
        const a = rand(0, TAU);
        this.spawn(position.x, position.y + 0.4, position.z, Math.cos(a) * rand(0.2, 1.1), rand(0.2, 1.1), Math.sin(a) * rand(0.2, 1.1), 0xffd590, rand(0.06, 0.16), rand(0.3, 0.7), 2.2, 2);
      }
      return;
    }
    // Hot metal sparks with a short smoke plume.
    for (let i = 0; i < 11; i++) {
      this.spawn(
        position.x + rand(-0.04, 0.04), position.y + rand(-0.04, 0.04), position.z + rand(-0.04, 0.04),
        n.x * rand(0.2, 2.6) + rand(-1.8, 1.8), n.y * rand(0.2, 2.2) + rand(-0.6, 1.8), n.z * rand(0.2, 2.6) + rand(-1.8, 1.8),
        chance(0.3) ? 0xffcf84 : 0xff6e2c, rand(0.045, 0.12), rand(0.2, 0.6), 6.4, 2.5
      );
    }
    for (let i = 0; i < 3; i++) {
      this.spawn(
        position.x + rand(-0.03, 0.03), position.y + rand(0, 0.05), position.z + rand(-0.03, 0.03),
        n.x * 0.2 + rand(-0.12, 0.12), rand(0.1, 0.35), n.z * 0.2 + rand(-0.12, 0.12),
        0x777066, rand(0.2, 0.36), rand(0.5, 1.1), -0.25, 2
      );
    }
  }

  update(dt) {
    const positions = this.positions;
    const velocities = this.velocities;
    let active = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) {
        if (this.alphas[i] !== 0) {
          this.alphas[i] = 0;
          positions[i * 3 + 1] = -999;
        }
        continue;
      }
      active++;
      const p = i * 3;
      const drag = Math.exp(-this.drag[i] * dt);
      velocities[p] *= drag;
      velocities[p + 1] = velocities[p + 1] * drag - this.gravity[i] * dt;
      velocities[p + 2] *= drag;
      positions[p] += velocities[p] * dt;
      positions[p + 1] += velocities[p + 1] * dt;
      positions[p + 2] += velocities[p + 2] * dt;
      if (positions[p + 1] < 0.045) {
        positions[p + 1] = 0.045;
        velocities[p + 1] *= -0.22;
        velocities[p] *= 0.6;
        velocities[p + 2] *= 0.6;
      }
      this.life[i] -= dt;
      const t = clamp01(this.life[i] / this.maxLife[i]);
      this.alphas[i] = t * t;
      this.sizes[i] *= 1 + dt * 0.14;
    }
    this.active = active;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
  }

  reset() {
    for (let i = 0; i < this.count; i++) {
      this.life[i] = 0;
      this.alphas[i] = 0;
      this.positions[i * 3 + 1] = -999;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
  }
}

function initCombatParticles() {
  runtime.particles = new CombatParticles(runtime.worldRoot, 780);
}

/* --------------------------------------------------------------------------
   Model building helpers
   -------------------------------------------------------------------------- */

function viewBox(parent, w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

function viewCylinder(parent, radiusTop, radiusBottom, height, segments, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

function addGloveHands(parent, type) {
  const left = new THREE.Group();
  const right = new THREE.Group();

  if (type === 'pistol') {
    // Right hand wrapped around the grip.
    left.position.set(0.003, -0.122, 0.035);
    left.rotation.set(-0.16, 0.02, -0.08);
    viewBox(left, 0.075, 0.125, 0.095, WEAPON_MATERIALS.glove, 0, 0, 0);
    viewBox(left, 0.068, 0.035, 0.095, WEAPON_MATERIALS.gloveLight, 0, 0.044, -0.005);
    for (let i = 0; i < 3; i++) {
      viewBox(left, 0.018, 0.073, 0.085, WEAPON_MATERIALS.glove, -0.02 + i * 0.02, -0.006, -0.048, -0.22);
    }
    const wrist = viewCylinder(left, 0.052, 0.068, 0.24, 8, WEAPON_MATERIALS.sleeve, 0.012, -0.16, 0.12, 1.02, 0, -0.08);
    wrist.scale.set(1, 1, 1);
    // Support hand under the dust cover.
    right.position.set(-0.065, -0.083, -0.07);
    right.rotation.set(0.22, -0.25, 0.22);
    viewBox(right, 0.07, 0.105, 0.09, WEAPON_MATERIALS.glove, 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      viewBox(right, 0.02, 0.035, 0.075, WEAPON_MATERIALS.gloveLight, -0.02 + i * 0.02, 0.045, -0.01);
    }
    const supportWrist = viewCylinder(right, 0.05, 0.065, 0.26, 8, WEAPON_MATERIALS.sleeve, -0.025, -0.02, 0.16, 1.37, 0, 0.38);
    supportWrist.scale.set(1, 1, 1);
  } else if (type === 'smg') {
    // Trigger hand.
    left.position.set(0.008, -0.12, 0.015);
    left.rotation.set(-0.18, 0, -0.08);
    viewBox(left, 0.08, 0.12, 0.1, WEAPON_MATERIALS.glove, 0, 0, 0);
    viewBox(left, 0.072, 0.03, 0.098, WEAPON_MATERIALS.gloveLight, 0, 0.047, 0);
    for (let i = 0; i < 3; i++) viewBox(left, 0.018, 0.07, 0.09, WEAPON_MATERIALS.glove, -0.021 + i * 0.021, 0, -0.049, -0.22);
    viewCylinder(left, 0.054, 0.071, 0.26, 8, WEAPON_MATERIALS.sleeve, 0.01, -0.15, 0.13, 1.04, 0, -0.08);
    // Support hand on the angled foregrip.
    right.position.set(-0.055, -0.092, -0.19);
    right.rotation.set(0.35, 0.1, 0.18);
    viewBox(right, 0.082, 0.1, 0.1, WEAPON_MATERIALS.glove, 0, 0, 0);
    viewBox(right, 0.073, 0.025, 0.095, WEAPON_MATERIALS.gloveLight, 0, 0.044, 0);
    viewCylinder(right, 0.052, 0.068, 0.26, 8, WEAPON_MATERIALS.sleeve, -0.03, -0.08, 0.15, 1.12, 0, 0.27);
  } else {
    // Shotgun fore-end grip.
    right.position.set(-0.012, -0.055, -0.315);
    right.rotation.set(-0.3, 0, -0.03);
    viewBox(right, 0.092, 0.075, 0.15, WEAPON_MATERIALS.glove, 0, 0, 0);
    for (let i = 0; i < 4; i++) viewBox(right, 0.018, 0.035, 0.1, WEAPON_MATERIALS.gloveLight, -0.03 + i * 0.02, 0.045, 0);
    viewCylinder(right, 0.055, 0.075, 0.26, 8, WEAPON_MATERIALS.sleeve, -0.02, -0.03, 0.19, 1.28, 0, 0.2);
    left.position.set(0.012, -0.12, 0.03);
    left.rotation.set(-0.18, 0, -0.07);
    viewBox(left, 0.082, 0.12, 0.1, WEAPON_MATERIALS.glove, 0, 0, 0);
    viewBox(left, 0.073, 0.028, 0.096, WEAPON_MATERIALS.gloveLight, 0, 0.046, 0);
    viewCylinder(left, 0.055, 0.072, 0.28, 8, WEAPON_MATERIALS.sleeve, 0.012, -0.16, 0.15, 1.04, 0, -0.08);
  }

  left.name = 'hand-right';
  right.name = 'hand-left';
  parent.add(left, right);
  return { left, right };
}

function addMuzzle(parent, position, color) {
  const flashMaterial = new THREE.SpriteMaterial({
    map: FLASH_TEXTURE,
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(flashMaterial);
  sprite.position.copy(position);
  sprite.scale.set(0.24, 0.24, 1);
  sprite.visible = false;
  parent.add(sprite);
  const light = new THREE.PointLight(color, 0, 3.2, 2);
  light.position.copy(position);
  parent.add(light);
  return { sprite, light, time: 0 };
}

/* --------------------------------------------------------------------------
   Weapon models
   -------------------------------------------------------------------------- */

function buildPistolModel(config) {
  const group = new THREE.Group();
  group.name = 'view-p9';
  group.userData.base = new THREE.Vector3(0.215, -0.235, -0.38);
  group.userData.ads = new THREE.Vector3(0.0, -0.118, -0.31);
  group.userData.hipRotation = new THREE.Euler(0.012, -0.035, 0.012);

  const metal = WEAPON_MATERIALS.metal;
  const dark = WEAPON_MATERIALS.darkMetal;
  const black = WEAPON_MATERIALS.black;

  // Slide, frame, barrel and rails.
  const slide = viewBox(group, 0.07, 0.073, 0.305, metal, 0, 0.043, -0.167);
  const slideTop = viewBox(group, 0.064, 0.013, 0.29, dark, 0, 0.086, -0.174);
  viewBox(group, 0.058, 0.052, 0.25, dark, 0, -0.002, -0.117);
  viewBox(group, 0.06, 0.025, 0.175, black, 0, -0.036, -0.073);
  const barrel = viewCylinder(group, 0.015, 0.015, 0.105, 10, WEAPON_MATERIALS.steel, 0, 0.041, -0.366, Math.PI / 2);
  barrel.rotation.x = Math.PI / 2;
  viewCylinder(group, 0.022, 0.022, 0.02, 10, WEAPON_MATERIALS.steel, 0, 0.041, -0.418, Math.PI / 2);
  // Frame rail and accent plate.
  viewBox(group, 0.062, 0.015, 0.21, WEAPON_MATERIALS.steel, 0, -0.023, -0.145);
  viewBox(group, 0.006, 0.014, 0.13, WEAPON_MATERIALS.accentAmber, 0.036, 0.039, -0.105);
  viewBox(group, 0.004, 0.005, 0.028, WEAPON_MATERIALS.accentAmber, 0.036, 0.068, -0.245);

  // Slide relief cuts and ejection port.
  for (let i = 0; i < 5; i++) {
    viewBox(group, 0.073, 0.045, 0.005, black, 0, 0.05, -0.045 - i * 0.018);
  }
  viewBox(group, 0.073, 0.029, 0.058, black, 0.002, 0.064, -0.135);
  const extractor = viewBox(group, 0.005, 0.009, 0.04, WEAPON_MATERIALS.steel, 0.038, 0.058, -0.135);
  // Sights with a warm fibre-optic front.
  viewBox(group, 0.038, 0.011, 0.012, black, 0, 0.097, 0.012);
  viewBox(group, 0.006, 0.02, 0.012, black, 0, 0.105, -0.293);
  viewBox(group, 0.0045, 0.006, 0.006, WEAPON_MATERIALS.tritium, 0, 0.111, -0.3);
  viewBox(group, 0.007, 0.007, 0.003, WEAPON_MATERIALS.tritium, -0.012, 0.102, 0.012);
  viewBox(group, 0.007, 0.007, 0.003, WEAPON_MATERIALS.tritium, 0.012, 0.102, 0.012);

  // Grip, trigger and guard.
  const grip = new THREE.Group();
  grip.position.set(0, -0.117, 0.033);
  grip.rotation.x = -0.17;
  viewBox(grip, 0.061, 0.175, 0.085, WEAPON_MATERIALS.grip, 0, 0, 0);
  for (let i = 0; i < 5; i++) viewBox(grip, 0.064, 0.004, 0.077, black, 0, -0.058 + i * 0.022, 0);
  group.add(grip);
  viewBox(group, 0.054, 0.033, 0.087, WEAPON_MATERIALS.grip, 0, -0.2, 0.044, -0.17);
  viewBox(group, 0.005, 0.05, 0.008, black, 0, -0.066, -0.028);
  viewBox(group, 0.005, 0.02, 0.008, WEAPON_MATERIALS.steel, 0.002, -0.053, -0.029, 0.26);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.0055, 5, 12, Math.PI), dark);
  guard.position.set(0, -0.068, -0.045);
  guard.rotation.set(Math.PI / 2, 0, 0);
  group.add(guard);

  // Magazine base and drop animation reference.
  const magazine = viewBox(group, 0.048, 0.05, 0.068, WEAPON_MATERIALS.steel, 0, -0.238, 0.062, -0.17);
  group.userData.magazine = magazine;

  addGloveHands(group, 'pistol');
  const muzzle = addMuzzle(group, new THREE.Vector3(0, 0.042, -0.425), 0xffc077);
  group.userData.muzzle = muzzle;
  group.userData.slide = slide;
  group.userData.slideHomeZ = slide.position.z;
  group.userData.ejectPort = new THREE.Vector3(0.055, 0.06, -0.14);
  group.userData.type = 'pistol';
  return group;
}

function buildSMGModel(config) {
  const group = new THREE.Group();
  group.name = 'view-vx7';
  group.userData.base = new THREE.Vector3(0.235, -0.252, -0.435);
  group.userData.ads = new THREE.Vector3(0.0, -0.142, -0.335);
  group.userData.hipRotation = new THREE.Euler(0.008, -0.028, 0.01);

  const poly = WEAPON_MATERIALS.polymer;
  const polyLight = WEAPON_MATERIALS.polymerLight;
  const metal = WEAPON_MATERIALS.metal;
  const dark = WEAPON_MATERIALS.darkMetal;
  const black = WEAPON_MATERIALS.black;

  // Receiver with angular upper shroud.
  viewBox(group, 0.088, 0.1, 0.335, poly, 0, 0.035, -0.09);
  viewBox(group, 0.077, 0.044, 0.3, metal, 0, 0.094, -0.095);
  viewBox(group, 0.094, 0.02, 0.23, WEAPON_MATERIALS.steel, 0, -0.015, -0.105);
  viewBox(group, 0.056, 0.025, 0.115, WEAPON_MATERIALS.accentTeal, 0.047, 0.024, -0.155);
  viewBox(group, 0.047, 0.012, 0.085, WEAPON_MATERIALS.accentTeal, -0.047, -0.021, -0.085);
  viewBox(group, 0.09, 0.017, 0.065, dark, 0, 0.051, -0.29);
  viewBox(group, 0.09, 0.018, 0.042, black, 0, 0.025, -0.29);

  // Barrel shroud, suppressor and muzzle.
  viewCylinder(group, 0.029, 0.032, 0.16, 10, metal, 0, 0.04, -0.337, Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.004, 5, 12), black);
    ring.position.set(0, 0.04, -0.28 - i * 0.035);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  viewCylinder(group, 0.035, 0.035, 0.15, 12, dark, 0, 0.04, -0.478, Math.PI / 2);
  viewCylinder(group, 0.031, 0.035, 0.03, 12, WEAPON_MATERIALS.steel, 0, 0.04, -0.554, Math.PI / 2);
  viewBox(group, 0.006, 0.005, 0.07, WEAPON_MATERIALS.accentTeal, 0.028, 0.072, -0.48);

  // Folding stock.
  viewBox(group, 0.035, 0.035, 0.21, dark, 0.04, 0.02, 0.16);
  viewBox(group, 0.035, 0.035, 0.21, dark, -0.04, 0.02, 0.16);
  viewBox(group, 0.105, 0.095, 0.04, poly, 0, 0.014, 0.274);
  viewBox(group, 0.086, 0.014, 0.026, black, 0, 0.063, 0.27);

  // Pistol grip and trigger guard.
  const grip = new THREE.Group();
  grip.position.set(0, -0.11, 0.02);
  grip.rotation.x = -0.22;
  viewBox(grip, 0.06, 0.165, 0.078, WEAPON_MATERIALS.grip, 0, 0, 0);
  for (let i = 0; i < 4; i++) viewBox(grip, 0.064, 0.004, 0.07, black, 0, -0.045 + i * 0.022, 0);
  group.add(grip);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.005, 5, 12, Math.PI), polyLight);
  guard.position.set(0, -0.06, -0.02);
  guard.rotation.set(Math.PI / 2, 0, 0);
  group.add(guard);
  // Trigger.
  viewBox(group, 0.005, 0.036, 0.007, metal, 0.002, -0.046, -0.02, 0.12);

  // Magazine, angled in a jungle-style pouch.
  const magGroup = new THREE.Group();
  magGroup.position.set(0, -0.142, -0.075);
  magGroup.rotation.x = 0.2;
  viewBox(magGroup, 0.05, 0.19, 0.076, polyLight, 0, -0.055, -0.015);
  viewBox(magGroup, 0.052, 0.027, 0.08, black, 0, -0.145, 0.003);
  for (let i = 0; i < 4; i++) viewBox(magGroup, 0.054, 0.004, 0.066, dark, 0, -0.025 - i * 0.027, -0.015);
  group.add(magGroup);
  group.userData.magazine = magGroup;

  // Angled foregrip.
  const foregrip = new THREE.Group();
  foregrip.position.set(0, -0.085, -0.245);
  foregrip.rotation.x = -0.3;
  viewBox(foregrip, 0.05, 0.09, 0.055, polyLight, 0, 0, 0);
  for (let i = 0; i < 3; i++) viewBox(foregrip, 0.052, 0.004, 0.05, black, 0, -0.022 + i * 0.017, 0);
  group.add(foregrip);

  // Micro prism optic and glowing reticle.
  viewBox(group, 0.065, 0.024, 0.098, dark, 0, 0.14, -0.08);
  viewBox(group, 0.012, 0.08, 0.022, dark, -0.032, 0.181, -0.08);
  viewBox(group, 0.012, 0.08, 0.022, dark, 0.032, 0.181, -0.08);
  viewBox(group, 0.075, 0.012, 0.025, dark, 0, 0.223, -0.08);
  const opticGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.052), WEAPON_MATERIALS.glassTeal);
  opticGlass.position.set(0, 0.177, -0.103);
  group.add(opticGlass);
  const reticle = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.004), WEAPON_MATERIALS.redDot);
  reticle.position.set(0, 0.177, -0.105);
  group.add(reticle);

  // Charging handle and bolt.
  viewBox(group, 0.014, 0.016, 0.08, WEAPON_MATERIALS.steel, -0.052, 0.075, -0.075);
  viewBox(group, 0.03, 0.023, 0.035, dark, 0.049, 0.051, -0.015);
  // Accent sling loop.
  viewCylinder(group, 0.012, 0.012, 0.035, 6, WEAPON_MATERIALS.steel, 0, -0.03, 0.145, Math.PI / 2);

  addGloveHands(group, 'smg');
  const muzzle = addMuzzle(group, new THREE.Vector3(0, 0.04, -0.578), 0xa8fff0);
  group.userData.muzzle = muzzle;
  group.userData.bolt = group.children.find((child) => child.geometry && child.geometry.parameters && child.geometry.parameters.depth === 0.035 && child.position.x > 0.04);
  group.userData.ejectPort = new THREE.Vector3(0.058, 0.055, -0.04);
  group.userData.type = 'smg';
  return group;
}

function buildShotgunModel(config) {
  const group = new THREE.Group();
  group.name = 'view-br12';
  group.userData.base = new THREE.Vector3(0.245, -0.255, -0.435);
  group.userData.ads = new THREE.Vector3(0.0, -0.143, -0.32);
  group.userData.hipRotation = new THREE.Euler(0.012, -0.022, 0.012);

  const metal = WEAPON_MATERIALS.metal;
  const dark = WEAPON_MATERIALS.darkMetal;
  const poly = WEAPON_MATERIALS.polymer;
  const black = WEAPON_MATERIALS.black;

  // Receiver body.
  viewBox(group, 0.098, 0.105, 0.295, metal, 0, 0.04, -0.105);
  viewBox(group, 0.086, 0.055, 0.17, WEAPON_MATERIALS.steel, 0, 0.104, -0.09);
  viewBox(group, 0.102, 0.022, 0.25, WEAPON_MATERIALS.accentRed, 0, -0.019, -0.105);
  viewBox(group, 0.075, 0.02, 0.2, dark, 0, 0.135, -0.09);
  // Ejection port.
  viewBox(group, 0.104, 0.055, 0.082, black, 0.003, 0.055, -0.06);
  viewBox(group, 0.105, 0.012, 0.09, WEAPON_MATERIALS.steel, 0, 0.09, -0.06);

  // Long barrel and under-barrel tube.
  const barrel = viewCylinder(group, 0.031, 0.031, 0.57, 12, WEAPON_MATERIALS.steel, 0, 0.067, -0.42, Math.PI / 2);
  barrel.rotation.x = Math.PI / 2;
  viewCylinder(group, 0.034, 0.034, 0.05, 12, dark, 0, 0.067, -0.725, Math.PI / 2);
  for (let i = 0; i < 4; i++) viewCylinder(group, 0.035, 0.035, 0.008, 12, black, 0, 0.067, -0.6 - i * 0.033, Math.PI / 2);
  viewCylinder(group, 0.021, 0.021, 0.5, 10, WEAPON_MATERIALS.darkMetal, 0, 0.017, -0.395, Math.PI / 2);
  viewCylinder(group, 0.025, 0.025, 0.06, 10, metal, 0, 0.017, -0.655, Math.PI / 2);
  // Heat shield ribs.
  for (let i = 0; i < 7; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.003, 4, 10), dark);
    rib.position.set(0, 0.067, -0.2 - i * 0.07);
    rib.rotation.x = Math.PI / 2;
    group.add(rib);
  }

  // Pump handle.
  const pump = new THREE.Group();
  pump.position.set(0, 0.012, -0.33);
  viewBox(pump, 0.072, 0.067, 0.195, WEAPON_MATERIALS.grip, 0, 0, 0);
  for (let i = 0; i < 7; i++) viewBox(pump, 0.076, 0.006, 0.012, black, 0, 0.036, -0.075 + i * 0.026);
  viewBox(pump, 0.077, 0.014, 0.17, WEAPON_MATERIALS.accentRed, 0, -0.03, -0.008);
  group.add(pump);
  group.userData.pump = pump;
  group.userData.pumpHomeZ = pump.position.z;

  // Stock with rubber butt pad and comb.
  const stock = new THREE.Group();
  stock.position.set(0, -0.005, 0.165);
  viewBox(stock, 0.083, 0.09, 0.205, poly, 0, 0, 0.06, -0.1);
  viewBox(stock, 0.086, 0.13, 0.035, WEAPON_MATERIALS.grip, 0, -0.02, 0.17, -0.1);
  viewBox(stock, 0.086, 0.035, 0.12, WEAPON_MATERIALS.polymerLight, 0, 0.052, 0.105, -0.1);
  viewBox(stock, 0.01, 0.055, 0.12, WEAPON_MATERIALS.accentRed, 0.047, -0.012, 0.09);
  group.add(stock);

  // Pistol grip and trigger guard.
  const grip = new THREE.Group();
  grip.position.set(0, -0.095, 0.038);
  grip.rotation.x = -0.22;
  viewBox(grip, 0.063, 0.155, 0.079, WEAPON_MATERIALS.grip, 0, 0, 0);
  for (let i = 0; i < 4; i++) viewBox(grip, 0.067, 0.005, 0.071, black, 0, -0.045 + i * 0.022, 0);
  group.add(grip);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.005, 5, 12, Math.PI), WEAPON_MATERIALS.polymerLight);
  guard.position.set(0, -0.07, -0.06);
  guard.rotation.set(Math.PI / 2, 0, 0);
  group.add(guard);
  viewBox(group, 0.007, 0.044, 0.009, WEAPON_MATERIALS.steel, 0.002, -0.057, -0.06, 0.18);

  // Receiver-mounted shell rack with red hulls.
  for (let i = 0; i < 4; i++) {
    viewCylinder(group, 0.014, 0.014, 0.052, 8, i % 2 === 0 ? WEAPON_MATERIALS.accentRed : WEAPON_MATERIALS.brass, 0.061, 0.066, -0.02 - i * 0.055, Math.PI / 2);
  }
  // Ghost ring / bead sight.
  viewBox(group, 0.04, 0.016, 0.06, black, 0, 0.153, 0.015);
  viewCylinder(group, 0.0055, 0.0055, 0.022, 8, WEAPON_MATERIALS.tritium, 0, 0.165, -0.045, 0, 0, 0);
  viewBox(group, 0.004, 0.004, 0.006, WEAPON_MATERIALS.tritium, 0, 0.162, -0.7);
  // Sling.
  const sling = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.007, 5, 20), WEAPON_MATERIALS.grip);
  sling.position.set(0.015, -0.085, 0.03);
  sling.rotation.set(0.45, 0.2, 0.1);
  group.add(sling);

  addGloveHands(group, 'shotgun');
  const muzzle = addMuzzle(group, new THREE.Vector3(0, 0.067, -0.76), 0xffb071);
  group.userData.muzzle = muzzle;
  group.userData.ejectPort = new THREE.Vector3(0.06, 0.07, -0.04);
  group.userData.type = 'shotgun';
  return group;
}

/* --------------------------------------------------------------------------
   Weapon system
   -------------------------------------------------------------------------- */

function initWeapons() {
  const rig = new THREE.Group();
  rig.name = 'weapon-rig';
  runtime.viewScene.add(rig);
  runtime.weaponRig = rig;

  const builders = [buildPistolModel, buildSMGModel, buildShotgunModel];
  player.weapons = WEAPON_DATA.map((config, index) => {
    const model = builders[index](config);
    model.visible = false;
    rig.add(model);
    const state = {
      config,
      model,
      ammo: config.magazine,
      reserve: config.reserve,
      cooldown: 0,
      reloading: false,
      reloadElapsed: 0,
      reloadDuration: config.reload,
      reloadStage: 0,
      equipT: 1,
      triggerHeld: false,
      dryFired: false,
      recoil: 0,
      swayX: 0,
      swayY: 0,
      switchTimer: 0,
      pumpT: 0,
      lastFireAt: -10,
      muzzleLight: model.userData.muzzle.light,
      muzzleSprite: model.userData.muzzle.sprite,
      flashTimer: 0,
    };
    return state;
  });

  player.currentWeapon = 0;
  const first = player.weapons[0];
  first.model.visible = true;
  first.model.position.copy(first.model.userData.base);
  runtime.activeWeapon = first;
  updateWeaponHUD(true);
}

function setWeapon(index, silent = false) {
  if (!player.weapons.length) return;
  index = clamp(index, 0, player.weapons.length - 1);
  if (index === player.currentWeapon && runtime.activeWeapon) return;
  if (G.state === 'menu' || G.state === 'gameover' || G.state === 'riding' || G.state === 'boarding') return;
  const previous = runtime.activeWeapon;
  if (previous) {
    previous.model.visible = false;
    previous.reloading = false;
    previous.triggerHeld = false;
    setReloadIndicator(false, 0);
  }
  player.currentWeapon = index;
  const next = player.weapons[index];
  runtime.activeWeapon = next;
  next.model.visible = true;
  next.equipT = 0;
  next.cooldown = Math.max(next.cooldown, 0.2);
  next.model.position.copy(next.model.userData.base);
  if (!silent && runtime.audio) runtime.audio.weaponSwitch();
  updateWeaponHUD(true);
}

function updateWeaponHUD(force = false) {
  const state = runtime.activeWeapon;
  if (!state) return;
  const config = state.config;
  if (force || G.ui.lastWeaponIndex !== player.currentWeapon) {
    setText(dom.weaponName, config.name);
    setText(dom.weaponClass, config.weaponClass);
    setText(dom.fireMode, config.mode);
    dom.slots.forEach((slot, i) => {
      slot.classList.toggle('active', i === player.currentWeapon);
      const weapon = player.weapons[i];
      slot.classList.toggle('empty', weapon && weapon.ammo <= 0 && weapon.reserve <= 0);
    });
    G.ui.lastWeaponIndex = player.currentWeapon;
  }
  if (force || G.ui.lastAmmo !== state.ammo || G.ui.lastReserve !== state.reserve) {
    setText(dom.ammoMag, String(state.ammo).padStart(2, '0'));
    setText(dom.ammoReserve, String(state.reserve).padStart(3, '0'));
    dom.ammoPanel.classList.toggle('low', state.ammo <= Math.ceil(config.magazine * 0.25));
    G.ui.lastAmmo = state.ammo;
    G.ui.lastReserve = state.reserve;
    dom.slots.forEach((slot, i) => {
      const weapon = player.weapons[i];
      slot.classList.toggle('empty', weapon && weapon.ammo <= 0 && weapon.reserve <= 0);
    });
  }
}

function startReload() {
  const state = runtime.activeWeapon;
  if (!state || state.reloading || state.ammo >= state.config.magazine || state.reserve <= 0) return;
  if (!canPlayerControl() || G.state === 'boarding' || G.state === 'riding') return;
  state.reloading = true;
  state.reloadElapsed = 0;
  state.reloadDuration = state.config.reload;
  state.reloadStage = 0;
  player.triggeringReload = true;
  if (runtime.audio) runtime.audio.reload('out');
  setReloadIndicator(true, 0);
}

function finishReload(state) {
  const config = state.config;
  const needed = config.magazine - state.ammo;
  const moved = Math.min(needed, state.reserve);
  state.ammo += moved;
  state.reserve -= moved;
  state.reloading = false;
  player.triggeringReload = false;
  setReloadIndicator(false, 0);
  updateWeaponHUD(true);
  if (runtime.audio && moved > 0) runtime.audio.reload('in');
}

function addAutomaticReloadIfNeeded() {
  const state = runtime.activeWeapon;
  if (!state || state.ammo > 0) return;
  if (state.reserve > 0) startReload();
}

function updateReload(state, dt) {
  if (!state.reloading) return;
  state.reloadElapsed += dt;
  const progress = clamp01(state.reloadElapsed / state.reloadDuration);
  setReloadIndicator(true, progress);
  const audio = runtime.audio;
  if (state.reloadStage === 0 && progress > 0.22) {
    state.reloadStage = 1;
    if (audio) audio.reload('mag');
  } else if (state.reloadStage === 1 && progress > 0.72) {
    state.reloadStage = 2;
    if (audio) audio.reload('bolt');
  }
  if (progress >= 1) finishReload(state);
}

/* --------------------------------------------------------------------------
   Ballistics
   -------------------------------------------------------------------------- */

function getShootBlockers() {
  const list = [];
  const station = runtime.currentStation;
  if (station) {
    for (const blocker of station.blockers) {
      if (blocker && blocker.visible) list.push(blocker);
    }
  }
  if (runtime.train && runtime.train.group.visible) {
    list.push(runtime.train.group);
  }
  return list;
}

function getEnemyHitMeshes() {
  return runtime.enemyHitMeshes.filter((mesh) => {
    const enemy = mesh.userData.enemyRef;
    return enemy && enemy.alive && !enemy.dying;
  });
}

function getWorldNormal(hit) {
  if (!hit.face) return new THREE.Vector3(0, 1, 0);
  return hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
}

function isUnderTrain(object) {
  let current = object;
  while (current) {
    if (current === (runtime.train && runtime.train.group)) return true;
    current = current.parent;
  }
  return false;
}

function addImpactDecal(point, normal, object) {
  if (!object || !point) return;
  if (isUnderTrain(object)) return;
  if (object === (runtime.currentStation && runtime.currentStation.wetFloor)) return;
  if (object.material && object.material.transparent) return;
  maybeSpawnDecal(point, normal);
}

function maybeSpawnDecal(point, normal) {
  // Each bullet hole needs its own material so its fade timer cannot affect every
  // other decal in the station. The impact texture is still shared.
  const material = IMPACT_MATERIAL.clone();
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(rand(0.07, 0.13), rand(0.07, 0.13)), material);
  decal.position.copy(point).addScaledVector(normal, 0.012);
  decal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  decal.rotation.z = rand(0, TAU);
  decal.renderOrder = 2;
  runtime.worldRoot.add(decal);
  runtime.decals.push({ mesh: decal, life: 28, maxLife: 28, shared: false });
  if (runtime.decals.length > 55) {
    const oldest = runtime.decals.shift();
    oldest.mesh.removeFromParent();
    oldest.mesh.geometry.dispose();
    oldest.mesh.material.dispose();
  }
}

function spawnTracer(start, end, color, width = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 5;
  runtime.worldRoot.add(line);
  runtime.tracers.push({ mesh: line, life: 0.075, maxLife: 0.075, width });
}

function spawnShell(state, hard = false) {
  if (!state.model || !state.model.userData.ejectPort) return;
  const camera = runtime.worldCamera;
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const origin = camera.position.clone()
    .addScaledVector(right, hard ? 0.28 : 0.22)
    .addScaledVector(up, -0.12)
    .addScaledVector(forward, 0.5);
  const mesh = new THREE.Mesh(SHELL_GEO, SHELL_MATERIAL);
  mesh.position.copy(origin);
  mesh.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
  mesh.scale.setScalar(state.config.id === 'br12' ? 1.45 : 1);
  runtime.worldRoot.add(mesh);
  const velocity = right.clone().multiplyScalar(rand(1.2, 2.0))
    .add(up.clone().multiplyScalar(rand(0.7, 1.35)))
    .add(forward.clone().multiplyScalar(rand(-0.25, 0.1)));
  runtime.shells.push({ mesh, velocity, life: 1.5, spin: new THREE.Vector3(rand(-9, 9), rand(-9, 9), rand(-9, 9)) });
}

function triggerMuzzleFlash(state) {
  const flash = state.model.userData.muzzle;
  if (!flash) return;
  state.flashTimer = 0.055;
  flash.sprite.visible = true;
  flash.sprite.material.opacity = 1;
  flash.sprite.material.rotation = rand(0, TAU);
  const s = rand(0.18, 0.34) * (state.config.id === 'br12' ? 1.5 : state.config.id === 'vx7' ? 0.8 : 1);
  flash.sprite.scale.set(s, s, 1);
  flash.light.intensity = state.config.id === 'br12' ? 9 : 5.2;
}

function smoothRandomSpread(direction, amount) {
  if (amount <= 0) return direction;
  const camera = runtime.worldCamera;
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const angle = rand(0, TAU);
  const radius = Math.sqrt(Math.random()) * amount;
  direction.addScaledVector(right, Math.cos(angle) * radius);
  direction.addScaledVector(up, Math.sin(angle) * radius);
  return direction.normalize();
}

function fireWeapon() {
  const state = runtime.activeWeapon;
  if (!state) return;
  const config = state.config;
  if (state.reloading) return;
  if (state.cooldown > 0) return;
  if (state.equipT < 0.16) return;
  if (!canPlayerControl()) return;

  if (state.ammo <= 0) {
    if (runtime.audio) {
      runtime.audio.dryFire();
      runtime.audio.weaponEmpty();
    }
    state.cooldown = 0.28;
    addAutomaticReloadIfNeeded();
    return;
  }

  state.ammo -= config.ammoPerShot;
  state.cooldown = config.fireRate;
  state.recoil = clamp(state.recoil + config.kick * 0.28, 0, 1.4);
  state.lastFireAt = performance.now();
  G.stats.shots++;
  G.stats.startedAt = G.stats.startedAt || performance.now();

  if (runtime.audio) {
    runtime.audio.shot(config.id === 'p9' ? 'pistol' : config.id === 'vx7' ? 'smg' : 'shotgun');
  }
  triggerMuzzleFlash(state);

  const camera = runtime.worldCamera;
  camera.updateMatrixWorld();
  const origin = camera.position.clone();
  const baseDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const movementSpread = config.moveSpread * clamp(player.speed / 5.4, 0, 1.2);
  const spreadCount = config.pellets > 1 ? config.pellets : 1;
  let hitEnemyAny = false;
  let headshotAny = false;
  let killedAny = false;
  let anyWorldHit = false;

  const raycaster = new THREE.Raycaster();
  raycaster.far = config.range;
  const enemies = getEnemyHitMeshes();
  const blockers = getShootBlockers();
  const muzzleWorld = camera.position.clone()
    .addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), 0.17)
    .addScaledVector(new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion), 0.1)
    .addScaledVector(baseDirection, 0.52);

  for (let pellet = 0; pellet < spreadCount; pellet++) {
    const aimSpread = lerp(config.spread + movementSpread, config.spread * 0.32, player.aimT);
    const direction = smoothRandomSpread(baseDirection.clone(), aimSpread * (config.pellets > 1 ? 1.15 : 1));
    raycaster.set(origin, direction);
    const enemyHits = enemies.length ? raycaster.intersectObjects(enemies, false) : [];
    const worldHits = blockers.length ? raycaster.intersectObjects(blockers, true) : [];
    const nearestEnemy = enemyHits.find((hit) => {
      const enemy = hit.object.userData.enemyRef;
      return enemy && enemy.alive && !enemy.dying;
    });
    const nearestWorld = worldHits[0];
    const enemyDistance = nearestEnemy ? nearestEnemy.distance : Infinity;
    const worldDistance = nearestWorld ? nearestWorld.distance : Infinity;

    if (nearestEnemy && enemyDistance <= worldDistance) {
      const enemy = nearestEnemy.object.userData.enemyRef;
      const part = nearestEnemy.object.userData.hitPart || 'body';
      const headshot = part === 'head';
      const distanceFalloff = lerp(1, 1 - config.falloff, clamp(nearestEnemy.distance / config.range, 0, 1));
      const damage = config.damage * (headshot ? config.headMultiplier : 1) * distanceFalloff;
      const result = damageEnemy(enemy, damage, {
        headshot,
        point: nearestEnemy.point,
        direction,
        source: 'player',
      });
      hitEnemyAny = true;
      headshotAny = headshotAny || headshot;
      killedAny = killedAny || (result && result.killed);
      if (runtime.particles) {
        const n = direction.clone().multiplyScalar(-1);
        runtime.particles.burst(nearestEnemy.point, n, 'blood');
      }
      const end = nearestEnemy.point.clone();
      spawnTracer(muzzleWorld, end, headshot ? 0xffe0a8 : 0xffc47a);
      G.stats.damageDealt += Math.round(damage);
    } else if (nearestWorld) {
      anyWorldHit = true;
      const normal = getWorldNormal(nearestWorld);
      const point = nearestWorld.point.clone().addScaledVector(normal, 0.004);
      if (runtime.particles) runtime.particles.burst(point, normal, 'sparks');
      addImpactDecal(point, normal, nearestWorld.object);
      spawnTracer(muzzleWorld, nearestWorld.point, 0xffc47a);
    } else {
      const end = origin.clone().addScaledVector(direction, config.range * 0.72);
      spawnTracer(muzzleWorld, end, 0xffc47a);
    }
  }

  // One hit, hitmarker and confirmation sound per trigger pull. This keeps
  // accuracy meaningful for multi-pellet weapons such as the Breacher.
  if (hitEnemyAny) {
    G.stats.hits++;
    showHitmarker(headshotAny, killedAny);
    if (runtime.audio) {
      runtime.audio.hitMarker(headshotAny);
      runtime.audio.enemyHit();
    }
  }

  // Physical feedback.
  const aimFactor = lerp(1, 0.58, player.aimT);
  player.recoilPitch += config.recoil * aimFactor * rand(0.82, 1.15);
  player.recoilYaw += config.recoil * aimFactor * rand(-0.55, 0.55);
  player.recoilKick = Math.min(1.8, player.recoilKick + config.kick * 0.55);
  player.cameraShake = Math.min(1.5, player.cameraShake + config.kick * 0.24);
  G.flow.screenShake = Math.min(1.2, G.flow.screenShake + config.kick * 0.11);
  spawnShell(state, config.id === 'br12');
  if (config.id === 'br12') state.pumpT = 0.52;
  if (config.id === 'p9' && state.model.userData.slide) {
    state.model.userData.slide.position.z = state.model.userData.slideHomeZ + 0.035;
  }
  updateWeaponHUD();
  if (state.ammo <= 0) {
    setTimeout(() => {
      if (runtime.activeWeapon === state && state.ammo <= 0) startReload();
    }, 180);
  }
}

/* --------------------------------------------------------------------------
   Per-frame weapon animation
   -------------------------------------------------------------------------- */

function updateWeapons(dt) {
  const state = runtime.activeWeapon;
  if (!state) return;
  const config = state.config;

  for (const weapon of player.weapons) {
    if (weapon !== state) continue;
    if (weapon.cooldown > 0) weapon.cooldown = Math.max(0, weapon.cooldown - dt);
    weapon.equipT = Math.min(1, weapon.equipT + dt / 0.34);
    weapon.recoil = damp(weapon.recoil, 0, 9, dt);
    if (weapon.pumpT > 0) weapon.pumpT = Math.max(0, weapon.pumpT - dt);
    updateReload(weapon, dt);

    if (weapon.flashTimer > 0) {
      weapon.flashTimer -= dt;
      const flash = weapon.model.userData.muzzle;
      if (weapon.flashTimer <= 0) {
        flash.sprite.visible = false;
        flash.light.intensity = 0;
      } else {
        flash.light.intensity = damp(flash.light.intensity, 0, 30, dt);
      }
    }

    if (weapon.model.userData.slide) {
      const slide = weapon.model.userData.slide;
      slide.position.z = damp(slide.position.z, weapon.model.userData.slideHomeZ, 24, dt);
    }
    if (weapon.model.userData.pump) {
      const pump = weapon.model.userData.pump;
      const p = weapon.pumpT / 0.52;
      const stroke = Math.sin(clamp01(p) * Math.PI) * 0.06;
      pump.position.z = weapon.model.userData.pumpHomeZ + stroke;
    }

    // Target trigger state. A queued click also covers taps shorter than one
    // frame, so semi-automatic weapons never skip a deliberate shot.
    const canTrigger = canPlayerControl() && !weapon.reloading && weapon.equipT > 0.3;
    const trigger = input.fire && canTrigger;
    const queued = input.fireQueued && canTrigger;
    const shouldFire = (trigger && (config.auto || !weapon.triggerHeld)) || queued;
    weapon.triggerHeld = input.fire;
    input.fireQueued = false;
    if (shouldFire) fireWeapon();

    // Recoil and aiming.
    const aiming = input.aim && canPlayerControl() && !weapon.reloading;
    player.isAiming = aiming;
    player.aimT = damp(player.aimT, aiming ? 1 : 0, 12, dt);
    const aimT = smoothstep(player.aimT);

    const base = weapon.model.userData.base;
    const ads = weapon.model.userData.ads;
    const px = lerp(base.x, ads.x, aimT);
    const py = lerp(base.y, ads.y, aimT);
    const pz = lerp(base.z, ads.z, aimT);

    // Sway is driven by look input and movement.
    const swayTargetX = clamp(-player.lookDeltaX * 0.000035, -0.02, 0.02);
    const swayTargetY = clamp(player.lookDeltaY * 0.000035, -0.018, 0.018);
    weapon.swayX = damp(weapon.swayX, swayTargetX, 8, dt);
    weapon.swayY = damp(weapon.swayY, swayTargetY, 8, dt);

    const moveBob = player.isMoving ? Math.sin(player.bobTime) * 0.004 * (1 - aimT * 0.75) : 0;
    const breathing = Math.sin(G.time * 1.55) * 0.0015 * (1 - aimT * 0.7);
    const equipOffset = Math.sin(clamp01(weapon.equipT) * Math.PI) * -0.28;
    const sprintOffset = lerp(0, 1, player.sprintT) * 0.9;
    const reloadDrop = weapon.reloading ? Math.sin(clamp01(weapon.reloadElapsed / weapon.reloadDuration) * Math.PI) * 0.12 : 0;
    const recoilZ = weapon.recoil * 0.08 * config.kick;
    const recoilPitch = weapon.recoil * 0.12 * config.kick;
    const lowAimOffset = sprintOffset * 0.15;

    weapon.model.position.set(
      px + weapon.swayX + moveBob,
      py + weapon.swayY + breathing + equipOffset - lowAimOffset - reloadDrop,
      pz + recoilZ
    );
    const hipRot = weapon.model.userData.hipRotation;
    const reloadTilt = weapon.reloading ? Math.sin(clamp01(weapon.reloadElapsed / weapon.reloadDuration) * Math.PI) : 0;
    weapon.model.rotation.set(
      lerp(hipRot.x, 0, aimT) + recoilPitch + (weapon.reloading ? reloadTilt * 0.36 : 0),
      lerp(hipRot.y, 0, aimT) + weapon.swayX * 2.8 - (weapon.reloading ? reloadTilt * 0.16 : 0),
      lerp(hipRot.z, 0, aimT) + weapon.swayY * 1.8 + (weapon.reloading ? reloadTilt * 0.22 : 0) - sprintOffset * 0.22,
    );
    weapon.model.position.y -= sprintOffset * 0.1;

    // Magazine drop during reload.
    if (weapon.model.userData.magazine) {
      const mag = weapon.model.userData.magazine;
      const reloadProgress = weapon.reloading ? clamp01(weapon.reloadElapsed / weapon.reloadDuration) : 0;
      const drop = reloadProgress > 0.16 && reloadProgress < 0.58
        ? Math.sin(clamp01((reloadProgress - 0.16) / 0.42) * Math.PI) * 0.16
        : 0;
      mag.position.y = (mag.userData.homeY === undefined ? (mag.userData.homeY = mag.position.y) : mag.userData.homeY) - drop;
      mag.rotation.z = drop * 1.2;
    }

    weapon.muzzleSprite.material.opacity = weapon.flashTimer > 0 ? rand(0.75, 1) : 0;
  }

  // Crosshair spread.
  const currentSpread = config.spread + config.moveSpread * clamp(player.speed / 5.4, 0, 1.2);
  const pixels = clamp(lerp(6 + currentSpread * 780, 2, player.aimT), 2, 22);
  dom.crosshair.style.setProperty('--spread', `${pixels.toFixed(1)}px`);
  dom.hud.classList.toggle('is-aiming', player.isAiming);
  dom.hud.classList.toggle('is-reloading', !!state.reloading);

  // Short-lived ejecta.
  for (let i = runtime.shells.length - 1; i >= 0; i--) {
    const item = runtime.shells[i];
    item.life -= dt;
    item.velocity.y -= 8.2 * dt;
    item.mesh.position.addScaledVector(item.velocity, dt);
    item.mesh.rotation.x += item.spin.x * dt;
    item.mesh.rotation.y += item.spin.y * dt;
    if (item.mesh.position.y < 0.04) {
      item.mesh.position.y = 0.04;
      item.velocity.y *= -0.2;
      item.velocity.x *= 0.5;
      item.velocity.z *= 0.5;
    }
    if (item.life <= 0) {
      item.mesh.removeFromParent();
      runtime.shells.splice(i, 1);
    }
  }

  for (let i = runtime.tracers.length - 1; i >= 0; i--) {
    const item = runtime.tracers[i];
    item.life -= dt;
    item.mesh.material.opacity = clamp01(item.life / item.maxLife) * 0.75;
    if (item.life <= 0) {
      item.mesh.removeFromParent();
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
      runtime.tracers.splice(i, 1);
    }
  }

  for (let i = runtime.decals.length - 1; i >= 0; i--) {
    const item = runtime.decals[i];
    item.life -= dt;
    if (item.life < 4) item.mesh.material.opacity = clamp01(item.life / 4) * 0.88;
    if (item.life <= 0) {
      item.mesh.removeFromParent();
      if (!item.shared) {
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
      }
      runtime.decals.splice(i, 1);
    }
  }

  // Weapon reserve auto-switch is handled by HUD; keep the active weapon even when dry.
  if (state.reloading) {
    dom.hud.classList.add('is-reloading');
  }
  updateWeaponHUD();
}

function resetWeaponSystem() {
  player.currentWeapon = 0;
  player.isAiming = false;
  player.aimT = 0;
  setReloadIndicator(false, 0);
  for (let i = 0; i < player.weapons.length; i++) {
    const weapon = player.weapons[i];
    weapon.ammo = weapon.config.magazine;
    weapon.reserve = weapon.config.reserve;
    weapon.cooldown = 0;
    weapon.reloading = false;
    weapon.reloadElapsed = 0;
    weapon.reloadStage = 0;
    weapon.equipT = 1;
    weapon.triggerHeld = false;
    weapon.recoil = 0;
    weapon.pumpT = 0;
    weapon.flashTimer = 0;
    weapon.model.visible = i === 0;
    weapon.model.position.copy(weapon.model.userData.base);
    weapon.model.rotation.copy(weapon.model.userData.hipRotation);
    const muzzle = weapon.model.userData.muzzle;
    if (muzzle) {
      muzzle.sprite.visible = false;
      muzzle.light.intensity = 0;
    }
    const mag = weapon.model.userData.magazine;
    if (mag && mag.userData.homeY !== undefined) mag.position.y = mag.userData.homeY;
  }
  runtime.activeWeapon = player.weapons[0];
  if (runtime.weaponRig) runtime.weaponRig.visible = true;
  updateWeaponHUD(true);
}

function setWeaponsVisible(visible) {
  if (runtime.weaponRig) runtime.weaponRig.visible = visible;
}
