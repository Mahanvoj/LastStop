/* ==========================================================================
   Main — boot, input capture, pause flow and the frame loop
   ========================================================================== */

const INTERACTIVE_STATES = new Set(['playing', 'cleared', 'trainArriving', 'trainOpen']);
const PREVENT_DEFAULT_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyE', 'KeyP',
  'Space', 'ShiftLeft', 'ShiftRight', 'Digit1', 'Digit2', 'Digit3',
]);

let mainBooted = false;
let ignorePointerUnlockUntil = 0;
let lastWeaponWheelAt = 0;

function isInteractiveState() {
  return INTERACTIVE_STATES.has(G.state);
}

function canPauseGame() {
  return G.started && !G.paused && player.alive && isInteractiveState();
}

function ensureAudio() {
  if (!runtime.audio) runtime.audio = new SoundEngine();
  runtime.audio.init();
  return runtime.audio;
}

function hideLockHint() {
  showLockHint(false);
}

function showMouseHint(message = 'CLICK TO CAPTURE MOUSE') {
  if (!dom.lockHint) return;
  setText(dom.lockHint, message);
  showLockHint(true);
}

function releasePointerForUI() {
  ignorePointerUnlockUntil = performance.now() + 450;
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  G.pointerLocked = false;
}

function requestMouseCapture({ quiet = false } = {}) {
  if (!dom.canvas || !dom.canvas.requestPointerLock) {
    if (!quiet) showMouseHint('MOUSE CAPTURE UNAVAILABLE');
    return;
  }
  if (document.pointerLockElement === dom.canvas) {
    hideLockHint();
    return;
  }
  try {
    dom.canvas.focus({ preventScroll: true });
    const result = dom.canvas.requestPointerLock();
    if (result && typeof result.catch === 'function') {
      result.catch(() => {
        if (!quiet && G.started && !G.paused) showMouseHint('CLICK TO CAPTURE MOUSE');
      });
    }
  } catch (error) {
    if (!quiet) showMouseHint('CLICK TO CAPTURE MOUSE');
  }
}

function clearHeldInput() {
  input.fire = false;
  input.fireQueued = false;
  input.aim = false;
  input.sprint = false;
  input.forward = 0;
  input.right = 0;
  input.jumpQueued = false;
  input.interactQueued = false;
  input.lookDeltaX = 0;
  input.lookDeltaY = 0;
  input.wheelAccum = 0;
  for (const code of Object.keys(input.keys)) input.keys[code] = false;
}

function syncPointerLockState() {
  const locked = document.pointerLockElement === dom.canvas;
  G.pointerLocked = locked;
  if (locked) {
    G.hadPointerLock = true;
    hideLockHint();
    return;
  }

  clearHeldInput();
  if (performance.now() < ignorePointerUnlockUntil) return;
  if (!G.started || G.paused || !player.alive) return;
  if (G.state === 'menu' || G.state === 'gameover' || G.state === 'boarding' || G.state === 'riding') {
    return;
  }
  if (isInteractiveState()) {
    pauseGame('MOUSE RELEASED');
  }
}

function pauseGame(reason = 'PAUSE REQUESTED') {
  if (!G.started || G.paused || !player.alive) return;
  if (!isInteractiveState()) return;
  G.paused = true;
  runtime.pausedAt = performance.now();
  clearHeldInput();
  hideLockHint();
  setText(dom.pauseSession, `MTA-13-${String(G.round).padStart(2, '0')}${String(G.stats.kills).padStart(2, '0')}`);
  showScreen(dom.pauseScreen);
  dom.pauseScreen.classList.remove('ui-hidden');
  dom.pauseScreen.setAttribute('aria-label', reason === 'PAUSE REQUESTED' ? 'Game paused' : `Game paused — ${reason}`);
  if (runtime.audio) runtime.audio.setPaused(true);
  releasePointerForUI();
  if (dom.resumeButton) dom.resumeButton.focus({ preventScroll: true });
}

function resumeGame() {
  if (G.paused) {
    G.paused = false;
    clearHeldInput();
    hideScreen(dom.pauseScreen);
    if (runtime.audio) runtime.audio.setPaused(false);
    runtime.lastFrame = performance.now();
    dom.canvas.focus({ preventScroll: true });
    requestMouseCapture();
    if (document.pointerLockElement !== dom.canvas) {
      showMouseHint('CLICK TO CAPTURE MOUSE');
    }
  } else if (G.started && !document.pointerLockElement) {
    requestMouseCapture();
  }
}

function startFromMenu() {
  ensureAudio();
  hideLockHint();
  if (dom.startButton) dom.startButton.blur();
  startGame();
  requestMouseCapture();
}

function restartCurrentRun() {
  ensureAudio();
  if (runtime.audio) runtime.audio.setPaused(false);
  G.paused = false;
  G.state = 'menu';
  hideScreen(dom.pauseScreen);
  hideScreen(dom.gameoverScreen);
  hideScreen(dom.startScreen);
  clearHeldInput();
  startGame();
  requestMouseCapture();
}

function goToMainMenu() {
  if (runtime.audio) runtime.audio.setPaused(false);
  G.paused = false;
  releasePointerForUI();
  returnToMenu();
  hideLockHint();
  if (runtime.audio) {
    runtime.audio.setMusicMode('menu');
    runtime.audio.setTrainProximity(0, 0);
  }
}

function cycleWeapon(direction) {
  if (!player.weapons.length) return;
  const count = player.weapons.length;
  const next = (player.currentWeapon + direction + count) % count;
  setWeapon(next);
}

function onKeyDown(event) {
  const code = event.code;

  if (code === 'Escape') {
    event.preventDefault();
    if (G.paused) {
      resumeGame();
    } else if (canPauseGame()) {
      pauseGame('PAUSE REQUESTED');
    }
    return;
  }

  if (code === 'KeyP' && !event.repeat) {
    if (G.paused) resumeGame();
    else if (canPauseGame()) pauseGame('PAUSE REQUESTED');
    return;
  }

  if (code === 'KeyM' && !event.repeat) {
    if (runtime.audio && runtime.audio.ready) {
      const muted = runtime.audio.toggleMute();
      showCenterMessage('AUDIO', muted ? 'MUTED' : 'RESTORED', 900);
    }
    return;
  }

  if (G.paused || !G.started) return;
  if (PREVENT_DEFAULT_CODES.has(code)) event.preventDefault();
  if (G.state === 'menu' || G.state === 'gameover') return;

  if (code === 'KeyR' && !event.repeat) {
    if (isInteractiveState()) startReload();
    return;
  }
  if (code === 'KeyE' && !event.repeat) {
    if (isInteractiveState()) input.interactQueued = true;
    return;
  }
  if (code === 'Space' && !event.repeat) {
    if (isInteractiveState()) input.jumpQueued = true;
    return;
  }
  if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
    setWeapon(Number(code.slice(-1)) - 1);
    return;
  }
  if (code === 'Tab') return;

  input.keys[code] = true;
}

function onKeyUp(event) {
  input.keys[event.code] = false;
  if (PREVENT_DEFAULT_CODES.has(event.code) && G.started && !G.paused) {
    event.preventDefault();
  }
}

function onMouseMove(event) {
  if (!G.pointerLocked || G.paused || !G.started) return;
  if (G.state === 'menu' || G.state === 'gameover') return;
  const dx = clamp(Number(event.movementX) || 0, -240, 240);
  const dy = clamp(Number(event.movementY) || 0, -240, 240);
  input.lookDeltaX += dx;
  input.lookDeltaY += dy;
}

function onMouseDown(event) {
  if (!G.pointerLocked || G.paused || !G.started) return;
  if (!isInteractiveState()) return;
  if (event.button === 0) {
    if (!input.fire) input.fireQueued = true;
    input.fire = true;
    input.mouseDownSince = performance.now();
  } else if (event.button === 2) {
    input.aim = true;
  }
}

function onMouseUp(event) {
  if (event.button === 0) input.fire = false;
  else if (event.button === 2) input.aim = false;
}

function onWheel(event) {
  if (!G.pointerLocked || G.paused || !G.started) return;
  if (!isInteractiveState()) return;
  if (Math.abs(event.deltaY) < 1) return;
  event.preventDefault();
  const now = performance.now();
  if (now - lastWeaponWheelAt < 120) return;
  lastWeaponWheelAt = now;
  cycleWeapon(event.deltaY > 0 ? 1 : -1);
}

function bindInterface() {
  const start = () => startFromMenu();
  const restart = () => restartCurrentRun();
  const resume = () => {
    ensureAudio();
    resumeGame();
  };
  const menu = () => goToMainMenu();

  dom.startButton?.addEventListener('click', (event) => {
    event.preventDefault();
    start();
  });
  dom.resumeButton?.addEventListener('click', (event) => {
    event.preventDefault();
    resume();
  });
  dom.restartButton?.addEventListener('click', (event) => {
    event.preventDefault();
    restart();
  });
  dom.pauseRestartButton?.addEventListener('click', (event) => {
    event.preventDefault();
    restart();
  });
  dom.pauseMenuButton?.addEventListener('click', (event) => {
    event.preventDefault();
    menu();
  });
  dom.gameoverMenuButton?.addEventListener('click', (event) => {
    event.preventDefault();
    menu();
  });

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  dom.canvas.addEventListener('wheel', onWheel, { passive: false });
  dom.canvas.addEventListener('click', () => {
    if (!G.started || G.paused) return;
    if (document.pointerLockElement !== dom.canvas) requestMouseCapture();
  });

  document.addEventListener('pointerlockchange', syncPointerLockState);
  document.addEventListener('pointerlockerror', () => {
    if (G.started && !G.paused) showMouseHint('CLICK TO CAPTURE MOUSE');
  });

  window.addEventListener('blur', () => {
    clearHeldInput();
    if (canPauseGame() && !document.hidden) pauseGame('FOCUS LOST');
  });
  document.addEventListener('visibilitychange', () => {
    clearHeldInput();
    if (document.hidden && canPauseGame()) pauseGame('TAB HIDDEN');
  });
}

/* --------------------------------------------------------------------------
   Frame simulation and rendering
   -------------------------------------------------------------------------- */

function updateAmbient(dt, time) {
  if (runtime.dust) updateDust(dt, time);
  if (runtime.particles) runtime.particles.update(dt);
  if (runtime.currentStation) updateStationEnvironment(runtime.currentStation, dt, time);
  if (runtime.reflection) runtime.reflection.update(time);
}

function stepFrame(dt) {
  G.time += dt;
  if (G.started) G.stats.runTime = G.time;

  if (G.state === 'menu') {
    updatePlayer(dt);
    updateCamera(dt);
    if (runtime.train) updateTrain(runtime.train, dt, G.time);
    updateAmbient(dt, G.time);
    if (dom.hud.classList.contains('ui-hidden')) {
      runtime.minimapAccum = 0;
    } else {
      updateHUD(dt);
    }
    if (runtime.audio) runtime.audio.update();
    return;
  }

  updatePlayer(dt);
  updateGameFlow(dt);
  if (runtime.train) updateTrain(runtime.train, dt, G.time);
  updateCamera(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updatePickups(dt);
  updateWeapons(dt);
  updateAmbient(dt, G.time);
  updateHUD(dt);
  if (runtime.audio) runtime.audio.update();
}

function renderFrame() {
  const renderer = runtime.renderer;
  if (!renderer) return;
  renderer.setRenderTarget(null);
  renderer.clear(true, true, true);
  renderer.render(runtime.worldScene, runtime.worldCamera);

  if (runtime.weaponRig && runtime.weaponRig.visible && G.state !== 'menu') {
    renderer.clearDepth();
    renderer.render(runtime.viewScene, runtime.viewCamera);
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  if (G.disposed) return;

  const elapsed = Math.max(0, Math.min(0.05, (now - runtime.lastFrame) / 1000));
  runtime.lastFrame = now;
  runtime.effectiveDt = elapsed;

  if (!G.paused && G.state !== 'boot') {
    stepFrame(elapsed);
  }

  renderFrame();

  runtime.frame++;
  runtime.perfAccum += elapsed;
  runtime.perfFrames++;
  if (runtime.perfAccum >= 0.5) {
    runtime.fps = runtime.perfFrames / runtime.perfAccum;
    runtime.perfAccum = 0;
    runtime.perfFrames = 0;
  }
}

function bootGame() {
  if (mainBooted) return;
  mainBooted = true;

  try {
    runtime.audio = new SoundEngine();
    initRenderer();
    initCombatParticles();
    initWeapons();
    initializeGameWorld();
    initHUD();
    bindInterface();

    runtime.lastFrame = performance.now();
    runtime.elapsed = 0;
    G.state = 'menu';
    G.paused = false;
    updateCamera(0);
    renderFrame();

    requestAnimationFrame(() => {
      if (dom.bootVeil) dom.bootVeil.classList.add('loaded');
      setTimeout(() => {
        if (dom.bootVeil && dom.bootVeil.parentNode) dom.bootVeil.remove();
      }, 1300);
    });
    requestAnimationFrame(animate);
  } catch (error) {
    console.error('[LAST STOP] Boot failed:', error);
    if (dom.bootVeil) {
      const copy = dom.bootVeil.querySelector('.boot-copy');
      if (copy) setText(copy, 'PLATFORM INSTRUMENTS OFFLINE — CHECK CONSOLE');
    }
  }
}

/* --------------------------------------------------------------------------
   Debug surface for automated testing and tuning
   -------------------------------------------------------------------------- */

function debugTeleport(x, z, yaw = player.yaw) {
  player.position.x = clamp(x, PLAY_LIMITS.minX, PLAY_LIMITS.maxX);
  player.position.z = z;
  player.position.y = 0;
  player.velocity.set(0, 0, 0);
  player.yaw = yaw;
  player.pitch = -0.03;
  player.grounded = true;
  return { x: player.position.x, z: player.position.z };
}

function debugSnapshot() {
  const station = runtime.currentStation;
  return {
    state: G.state,
    paused: G.paused,
    started: G.started,
    round: G.round,
    sector: G.sector,
    theme: G.theme.name,
    pointerLocked: G.pointerLocked,
    player: {
      x: Number(player.position.x.toFixed(2)),
      y: Number(player.position.y.toFixed(2)),
      z: Number(player.position.z.toFixed(2)),
      health: Math.round(player.health),
      armor: Math.round(player.armor),
      alive: player.alive,
      weapon: player.currentWeapon,
      ammo: runtime.activeWeapon ? runtime.activeWeapon.ammo : 0,
      reserve: runtime.activeWeapon ? runtime.activeWeapon.reserve : 0,
    },
    wave: {
      active: G.wave.active,
      number: G.wave.number,
      queue: G.wave.queue.length,
      alive: G.wave.alive,
      total: G.wave.total,
    },
    train: {
      state: G.train.state,
      z: runtime.train ? Number(runtime.train.group.position.z.toFixed(2)) : null,
      doors: runtime.train ? Number(runtime.train.doors.toFixed(2)) : null,
    },
    station: station ? { centerZ: station.centerZ, code: station.theme.code } : null,
    stats: { ...G.stats },
    enemies: runtime.enemyList.filter((enemy) => enemy.alive && !enemy.dying).length,
    pickups: runtime.pickups.length,
    decals: runtime.decals.length,
    fps: Math.round(runtime.fps || 0),
    audioReady: !!(runtime.audio && runtime.audio.ready),
    ui: {
      startVisible: !dom.startScreen.classList.contains('ui-hidden'),
      pauseVisible: !dom.pauseScreen.classList.contains('ui-hidden'),
      gameoverVisible: !dom.gameoverScreen.classList.contains('ui-hidden'),
      hudVisible: !dom.hud.classList.contains('ui-hidden'),
      fadeVisible: dom.fadeOverlay.classList.contains('show'),
    },
  };
}

function installDebug() {
  window.__subway = {
    version: '0.9.7',
    G,
    player,
    input,
    runtime,
    weapons: WEAPON_DATA,
    start: startFromMenu,
    startGame,
    prepareRun,
    pause: pauseGame,
    resume: resumeGame,
    restart: restartCurrentRun,
    menu: goToMainMenu,
    skipToTrainArrival,
    skipTrainArrival,
    skipBoarding,
    skipRide,
    killAllEnemies,
    spawnEnemy,
    spawnPickup,
    damagePlayer,
    healPlayer,
    refillAmmo,
    setWeapon,
    teleport: debugTeleport,
    captureMouse: requestMouseCapture,
    releaseMouse: releasePointerForUI,
    setInvincible(value = true) {
      G.debug.invincible = !!value;
      return G.debug.invincible;
    },
    setTimeScale(value) {
      G.debug.timeScale = clamp(Number(value) || 1, 0, 5);
      return G.debug.timeScale;
    },
    snapshot: debugSnapshot,
    getHistory() {
      return { shots: G.stats.shots, hits: G.stats.hits, kills: G.stats.kills };
    },
  };
}

installDebug();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame, { once: true });
} else {
  bootGame();
}
