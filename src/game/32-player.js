/* ==========================================================================
   Player — movement, collisions, camera and vitality
   ========================================================================== */

const PLAYER_SPEEDS = {
  walk: 3.85,
  sprint: 6.25,
  aim: 2.3,
  acceleration: 13.5,
  airControl: 2.2,
};

const damageScratch = {
  source: new THREE.Vector3(),
  local: new THREE.Vector3(),
};

function resetPlayer() {
  player.position.set(-2.2, 0, 30);
  player.velocity.set(0, 0, 0);
  player.yaw = 0;
  player.pitch = -0.025;
  player.targetYaw = 0;
  player.targetPitch = 0;
  player.lookDeltaX = 0;
  player.lookDeltaY = 0;
  player.health = 100;
  player.armor = 75;
  player.alive = true;
  player.grounded = true;
  player.isMoving = false;
  player.isSprinting = false;
  player.isAiming = false;
  player.speed = 0;
  player.bob = 0;
  player.bobTime = 0;
  player.landKick = 0;
  player.stepDistance = 0;
  player.lastDamageAt = -99;
  player.lastDamageDirection = 0;
  player.deathTime = 0;
  player.deadTilt = 0;
  player.triggeringReload = false;
  player.damageSmoothed = 0;
  player.sprintT = 0;
  player.aimT = 0;
  player.recoilPitch = 0;
  player.recoilYaw = 0;
  player.recoilKick = 0;
  player.cameraShake = 0;
  G.ui.lowHealth = false;
  dom.lowHealth.classList.remove('active');
  dom.hud.classList.remove('is-aiming', 'is-reloading');
  setText(dom.vitalsNote, 'VITAL SIGNS STABLE');
  if (runtime.audio) {
    runtime.audio.setTrainProximity(0, 0);
  }
}

function playerCollidesAt(x, z, radius = player.radius) {
  const station = runtime.currentStation;
  if (!station) return false;
  const minX = PLAY_LIMITS.minX + radius * 0.1;
  const maxX = PLAY_LIMITS.maxX;
  const minZ = station.centerZ + PLAY_LIMITS.minZ + radius;
  const maxZ = station.centerZ + PLAY_LIMITS.maxZ - radius;
  if (x < minX || x > maxX || z < minZ || z > maxZ) return true;

  for (const collider of station.colliders) {
    const closestX = clamp(x, collider.minX, collider.maxX);
    const closestZ = clamp(z, collider.minZ, collider.maxZ);
    const dx = x - closestX;
    const dz = z - closestZ;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}

function movePlayerWithCollision(dx, dz) {
  const pos = player.position;
  const nextX = pos.x + dx;
  if (!playerCollidesAt(nextX, pos.z)) {
    pos.x = nextX;
  } else {
    player.velocity.x = 0;
  }
  const nextZ = pos.z + dz;
  if (!playerCollidesAt(pos.x, nextZ)) {
    pos.z = nextZ;
  } else {
    player.velocity.z = 0;
  }
}

function updatePlayer(dt) {
  if (!G.started) return;
  if (G.state === 'gameover') {
    player.deadT = (player.deadT || 0) + dt;
    player.cameraShake = damp(player.cameraShake, 0, 4, dt);
    return;
  }
  if (G.state === 'boarding' || G.state === 'riding') {
    player.cameraShake = damp(player.cameraShake, 0, 5, dt);
    player.isMoving = false;
    player.isSprinting = false;
    player.velocity.set(0, 0, 0);
    player.recoilPitch = damp(player.recoilPitch, 0, 12, dt);
    player.recoilYaw = damp(player.recoilYaw, 0, 12, dt);
    return;
  }

  const canControl = canPlayerControl();

  // Look input is accumulated between frames so the view stays smooth even on
  // low-end devices. Recoil is layered on top of the aim direction.
  const sensitivity = input.sensitivity * (player.isAiming ? 0.68 : 1);
  const lookX = Number.isFinite(input.lookDeltaX) ? input.lookDeltaX : 0;
  const lookY = Number.isFinite(input.lookDeltaY) ? input.lookDeltaY : 0;
  if (canControl) {
    player.yaw -= lookX * sensitivity;
    player.pitch -= lookY * sensitivity;
    player.pitch = clamp(player.pitch, -1.42, 1.36);
    player.lookDeltaX = lookX;
    player.lookDeltaY = lookY;
  } else {
    player.lookDeltaX = 0;
    player.lookDeltaY = 0;
  }
  input.lookDeltaX = 0;
  input.lookDeltaY = 0;

  const forwardInput = (input.keys['KeyW'] ? 1 : 0) - (input.keys['KeyS'] ? 1 : 0);
  const strafeInput = (input.keys['KeyD'] ? 1 : 0) - (input.keys['KeyA'] ? 1 : 0);
  input.forward = forwardInput;
  input.right = strafeInput;

  let moveX = 0;
  let moveZ = 0;
  if (canControl && (forwardInput !== 0 || strafeInput !== 0)) {
    const sin = Math.sin(player.yaw);
    const cos = Math.cos(player.yaw);
    // Forward is -Z at yaw 0, right is +X.
    moveX = -sin * forwardInput + cos * strafeInput;
    moveZ = -cos * forwardInput - sin * strafeInput;
    const length = Math.hypot(moveX, moveZ);
    moveX /= length;
    moveZ /= length;
  }

  const sprintAllowed = canControl && forwardInput > 0 && strafeInput === 0 &&
    (!!input.keys['ShiftLeft'] || !!input.keys['ShiftRight']) && !player.isAiming && !runtime.activeWeapon?.reloading;
  player.isSprinting = sprintAllowed;
  player.sprintT = damp(player.sprintT, sprintAllowed ? 1 : 0, 9, dt);

  const speedTarget = player.isAiming ? PLAYER_SPEEDS.aim : sprintAllowed ? PLAYER_SPEEDS.sprint : PLAYER_SPEEDS.walk;
  const targetVelocityX = moveX * speedTarget;
  const targetVelocityZ = moveZ * speedTarget;
  const accel = player.grounded ? PLAYER_SPEEDS.acceleration : PLAYER_SPEEDS.airControl;
  player.velocity.x = damp(player.velocity.x, targetVelocityX, accel, dt);
  player.velocity.z = damp(player.velocity.z, targetVelocityZ, accel, dt);
  if (Math.abs(player.velocity.x) < 0.01) player.velocity.x = 0;
  if (Math.abs(player.velocity.z) < 0.01) player.velocity.z = 0;

  const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
  player.speed = horizontalSpeed;
  player.isMoving = horizontalSpeed > 0.35 && player.grounded;

  movePlayerWithCollision(player.velocity.x * dt, player.velocity.z * dt);

  // Jump and vertical motion.
  if (canControl && input.jumpQueued && player.grounded) {
    player.velocity.y = 5.15;
    player.grounded = false;
    input.jumpQueued = false;
    if (runtime.audio) runtime.audio.jump();
    player.landKick = -0.02;
  } else {
    input.jumpQueued = false;
  }

  if (!player.grounded) {
    player.velocity.y -= 15.2 * dt;
    player.position.y += player.velocity.y * dt;
    if (player.position.y <= 0) {
      const landingSpeed = -player.velocity.y;
      player.position.y = 0;
      player.velocity.y = 0;
      player.grounded = true;
      player.landKick = clamp(landingSpeed * 0.022, 0.03, 0.13);
      if (runtime.audio) runtime.audio.land(landingSpeed > 5.2);
      if (landingSpeed > 4) player.cameraShake = Math.min(1.2, player.cameraShake + 0.22);
    }
  } else {
    player.position.y = 0;
    player.velocity.y = 0;
  }

  // Footfalls are tied to distance travelled, not time.
  if (player.isMoving) {
    player.stepDistance += horizontalSpeed * dt;
    player.bobTime += dt * (sprintAllowed ? 12.4 : 9.1) * clamp(horizontalSpeed / 3.8, 0.45, 1.6);
    const stepThreshold = sprintAllowed ? 2.15 : 1.7;
    if (player.stepDistance > stepThreshold) {
      player.stepDistance = 0;
      if (runtime.audio) runtime.audio.footstep(sprintAllowed);
    }
  } else {
    player.bobTime += dt * 1.4;
    player.stepDistance = Math.min(player.stepDistance, 1.2);
  }

  const bobTarget = player.isMoving && player.grounded
    ? Math.sin(player.bobTime) * (sprintAllowed ? 0.033 : 0.021) * (1 - player.aimT * 0.7)
    : 0;
  player.bob = damp(player.bob, bobTarget, 12, dt);
  player.landKick = damp(player.landKick, 0, 8, dt);
  player.recoilPitch = damp(player.recoilPitch, 0, 11, dt);
  player.recoilYaw = damp(player.recoilYaw, 0, 11, dt);
  player.recoilKick = damp(player.recoilKick, 0, 10, dt);
  player.cameraShake = damp(player.cameraShake, 0, 6.5, dt);

  // On-screen low-health cue and heartbeat pacing.
  const low = player.health <= 32 && player.alive;
  if (low !== G.ui.lowHealth) {
    G.ui.lowHealth = low;
    dom.lowHealth.classList.toggle('active', low);
  }
  if (low && canControl) {
    G.ui.heartbeatTimer = (G.ui.heartbeatTimer || 0) - dt;
    if (G.ui.heartbeatTimer <= 0) {
      G.ui.heartbeatTimer = player.health < 16 ? 0.75 : 1.15;
      if (runtime.audio) runtime.audio.heartbeat();
    }
  } else {
    G.ui.heartbeatTimer = 0;
  }
}

function updateCamera(dt) {
  const camera = runtime.worldCamera;
  if (!camera) return;

  if (G.state === 'menu') {
    updateMenuCamera(dt);
    return;
  }

  if (G.state === 'boarding') {
    updateBoardingCamera(dt);
    return;
  }

  if (G.state === 'riding') {
    updateRidingCamera(dt);
    return;
  }

  if (G.state === 'gameover' || !player.alive) {
    updateDeathCamera(dt);
    return;
  }

  const aiming = player.isAiming;
  const baseFov = 72;
  const targetFov = aiming ? (runtime.activeWeapon ? runtime.activeWeapon.config.adsFov : 56) : 72 + player.sprintT * 2.4;
  camera.fov = damp(camera.fov, targetFov, 11, dt);
  camera.updateProjectionMatrix();
  if (runtime.viewCamera) {
    const viewFovTarget = aiming ? 48 : 62 - player.sprintT * 1.5;
    runtime.viewCamera.fov = damp(runtime.viewCamera.fov, viewFovTarget, 10, dt);
    runtime.viewCamera.updateProjectionMatrix();
  }

  const shake = player.cameraShake + G.flow.screenShake * 0.45;
  const shakeX = Math.sin(G.time * 77.3) * 0.006 * shake + Math.sin(G.time * 31.7) * 0.003 * shake;
  const shakeY = Math.cos(G.time * 64.1) * 0.005 * shake + Math.cos(G.time * 23.9) * 0.003 * shake;
  const shakeRoll = Math.sin(G.time * 43.7) * 0.01 * shake;
  G.flow.screenShake = damp(G.flow.screenShake, 0, 8, dt);

  const strafeBob = player.isMoving ? Math.sin(player.bobTime * 0.5) * 0.012 * (player.sprintT * 0.4 + 0.6) : 0;
  const strafe = strafeBob * clamp(input.right, -1, 1);
  camera.position.set(
    player.position.x + Math.cos(player.yaw) * strafe,
    player.position.y + WORLD.playerEyeHeight + player.bob + player.landKick - player.recoilKick * 0.014 + shakeY,
    player.position.z - Math.sin(player.yaw) * strafe
  );
  camera.rotation.order = 'YXZ';
  camera.rotation.set(
    player.pitch + player.recoilPitch + shakeX,
    player.yaw + player.recoilYaw + shakeY * 0.7,
    shakeRoll + Math.sin(player.bobTime * 0.5) * 0.0025 * (player.isMoving ? 1 : 0.2)
  );
  camera.updateMatrixWorld();
}

function updateMenuCamera(dt) {
  const camera = runtime.worldCamera;
  runtime.menuCameraT += dt;
  const t = runtime.menuCameraT;
  const station = runtime.currentStation;
  const centerZ = station ? station.centerZ : 0;
  const drift = Math.sin(t * 0.055) * 2.1;
  const driftZ = Math.cos(t * 0.043) * 2.8;
  camera.position.set(1.0 + drift, 1.82 + Math.sin(t * 0.19) * 0.035, centerZ + 29.5 + driftZ);
  const look = new THREE.Vector3(-1.6 + Math.sin(t * 0.07) * 1.2, 2.15 + Math.sin(t * 0.11) * 0.13, centerZ - 9 - Math.sin(t * 0.05) * 2.0);
  camera.rotation.order = 'YXZ';
  camera.lookAt(look);
  camera.fov = 63;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

function updateBoardingCamera(dt) {
  const camera = runtime.worldCamera;
  const train = runtime.train;
  if (!train) return;
  const t = clamp01((G.flow.boardT || 0) / 2.45);
  const u = easeInOutCubic(t);
  const start = G.flow.boardStartCamera || camera.position.clone();
  const startLook = G.flow.boardStartLook || start.clone().add(new THREE.Vector3(0, 0, -5));
  const door = train.group.localToWorld(new THREE.Vector3(1.45, 1.63, 0));
  const inside = train.group.localToWorld(new THREE.Vector3(0.46, 1.62, -1.55));
  const lookInside = train.group.localToWorld(new THREE.Vector3(0.36, 1.5, 6.8));

  let pos;
  if (u < 0.52) {
    const p = smoothstep(u / 0.52);
    pos = start.clone().lerp(door, p);
    pos.y += Math.sin(p * Math.PI) * 0.19;
  } else {
    const p = smoothstep((u - 0.52) / 0.48);
    pos = door.clone().lerp(inside, p);
    pos.y += Math.sin(p * Math.PI) * 0.06;
  }
  const look = startLook.clone().lerp(lookInside, u);
  // Subtle head bob as we step across the threshold.
  pos.y += Math.sin(G.flow.boardT * 8.5) * 0.012 * Math.sin(u * Math.PI);
  camera.position.copy(pos);
  camera.rotation.order = 'YXZ';
  camera.lookAt(look);
  camera.fov = damp(camera.fov, 64, 4, dt);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

function updateRidingCamera(dt) {
  const camera = runtime.worldCamera;
  const train = runtime.train;
  if (!train) return;
  const time = G.time;
  const local = new THREE.Vector3(
    0.46 + Math.sin(time * 1.2) * 0.006,
    1.61 + Math.sin(time * 2.6) * 0.005,
    -1.5 + Math.sin(time * 0.67) * 0.012
  );
  const worldPos = train.group.localToWorld(local);
  camera.position.copy(worldPos);
  const lookLocal = new THREE.Vector3(0.38 + Math.sin(time * 0.4) * 0.06, 1.47, 6.5);
  const look = train.group.localToWorld(lookLocal);
  camera.rotation.order = 'YXZ';
  camera.lookAt(look);
  camera.rotation.z += Math.sin(time * 4.2) * 0.004 + G.flow.rideLurch * 0.014;
  camera.fov = damp(camera.fov, 65, 2.5, dt);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

function updateDeathCamera(dt) {
  const camera = runtime.worldCamera;
  const t = clamp01((player.deadT || 0) / 1.8);
  const fall = easeOutCubic(t);
  camera.position.set(
    player.position.x + Math.sin(G.time * 1.7) * 0.03 * fall,
    player.position.y + lerp(WORLD.playerEyeHeight, 0.38, fall),
    player.position.z + lerp(0, 0.25, fall)
  );
  camera.rotation.order = 'YXZ';
  camera.rotation.set(
    lerp(player.pitch, 0.18, fall),
    player.yaw + Math.sin(t * 2.6) * 0.1,
    Math.sin(t * Math.PI) * 0.16 + t * 0.82
  );
  camera.fov = damp(camera.fov, 58, 2.5, dt);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

function damagePlayer(amount, sourcePosition, damageType = 'melee') {
  if (!player.alive || G.debug.invincible) return;
  if (G.state !== 'playing' && G.state !== 'trainArriving' && G.state !== 'trainOpen' && G.state !== 'cleared') return;
  if (amount <= 0) return;

  let damage = amount;
  let armorAbsorbed = 0;
  if (player.armor > 0) {
    armorAbsorbed = Math.min(player.armor, damage * 0.62);
    player.armor -= armorAbsorbed;
    damage -= armorAbsorbed;
    if (player.armor <= 0 && armorAbsorbed > 0) {
      player.armor = 0;
      if (runtime.audio) runtime.audio.armorBreak();
    }
  }
  player.health = Math.max(0, player.health - damage);
  player.lastDamageAt = G.time;
  player.cameraShake = Math.min(1.65, player.cameraShake + 0.38 + damage * 0.012);
  G.flow.screenShake = Math.min(2.0, G.flow.screenShake + 0.3 + damage * 0.011);
  flashDamage(clamp(0.2 + damage / 35, 0.2, 0.9));

  if (sourcePosition) {
    const dx = sourcePosition.x - player.position.x;
    const dz = sourcePosition.z - player.position.z;
    const rightComponent = dx * Math.cos(player.yaw) - dz * Math.sin(player.yaw);
    const forwardComponent = -dx * Math.sin(player.yaw) - dz * Math.cos(player.yaw);
    const angle = Math.atan2(rightComponent, forwardComponent);
    player.lastDamageDirection = angle;
    showDamageDirection(angle);
  }

  if (runtime.audio) runtime.audio.playerHit();
  if (player.health <= 0) {
    playerDie();
  }
  updateVitalsHUD();
}

function playerDie() {
  if (!player.alive) return;
  player.alive = false;
  player.deathTime = G.time;
  player.deadT = 0;
  player.isMoving = false;
  player.isSprinting = false;
  player.velocity.set(0, 0, 0);
  G.state = 'gameover';
  G.paused = false;
  G.wave.active = false;
  G.stats.runTime = G.time;
  clearInteraction();
  setCinematic(false);
  setReloadIndicator(false, 0);
  G.ui.lowHealth = false;
  dom.lowHealth.classList.remove('active');
  dom.hud.classList.remove('is-aiming', 'is-reloading');
  if (runtime.weaponRig) runtime.weaponRig.visible = false;
  if (runtime.audio) {
    runtime.audio.gameOver();
    runtime.audio.setMusicMode('dead');
    runtime.audio.setTrainProximity(0, 0);
  }
  if (document.pointerLockElement) document.exitPointerLock();
  triggerGameOver();
}

function healPlayer(amount) {
  player.health = Math.min(player.maxHealth, player.health + amount);
  updateVitalsHUD();
}

function refillAmmo() {
  for (const weapon of player.weapons) {
    weapon.reserve = weapon.config.maxReserve;
    weapon.ammo = weapon.config.magazine;
  }
  updateWeaponHUD(true);
}
