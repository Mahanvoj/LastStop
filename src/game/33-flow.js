/* ==========================================================================
   Run flow — waves, arrivals, boarding, rides and station transitions
   ========================================================================== */

const FLOW = {
  INITIAL_STATION: 0,
  TRAIN_ARRIVAL_TIME: 7.4,
  TRAIN_WAIT_TO_BOARD: 0,
  BOARD_TIME: 2.65,
  RIDE_WAIT: 1.75,
  RIDE_TRAVEL: 12.2,
  RIDE_FADE_START: 0.75,
  RIDE_PROMOTE: 1.55,
  RIDE_REVEAL: 2.55,
  TRAIN_DEPART_DELAY: 1.7,
};

function resetFlowState() {
  G.flow.nextStationBuilt = false;
  G.flow.boarding = false;
  G.flow.fadeBusy = false;
  G.flow.nextRoundQueued = false;
  G.flow.trainWarningAt = 0;
  G.flow.trainArriveAt = Infinity;
  G.flow.screenShake = 0;
  G.flow.xp = 0;
  G.flow.boardT = 0;
  G.flow.boardingDoorClosed = false;
  G.flow.rideT = 0;
  G.flow.rideStart = 0;
  G.flow.rideTarget = 0;
  G.flow.arrivalT = 0;
  G.flow.arrivalFadeStarted = false;
  G.flow.arrivalPromoted = false;
  G.flow.arrivalRevealed = false;
  G.flow.arrivalStationName = '';
  G.flow.travelling = false;
  G.flow.trainBrakePlayed = false;
  G.flow.trainDeparting = false;
  G.flow.trainDepartT = 0;
  G.flow.nextWaveAt = Infinity;
  G.flow.trainDepartAt = Infinity;
  G.flow.boardStartCamera = null;
  G.flow.boardStartLook = null;
  G.flow.rideLurch = 0;
  G.flow.postArrival = false;
  G.flow.transitionToken = (G.flow.transitionToken || 0) + 1;
}

function disposeStation(station) {
  if (!station) return;
  if (station.wetFloor) {
    try {
      station.wetFloor.dispose();
    } catch (error) {
      // Double-disposal is harmless; the group traversal below covers the rest.
    }
  }
  if (station.arrivalBoard && station.arrivalBoard.texture) station.arrivalBoard.texture.dispose();
  station.group.removeFromParent();
  disposeGroup(station.group);
  for (const light of station.pointLights || []) light.dispose?.();
}

function createStation(centerZ, themeIndex, sector) {
  const station = buildStation({ centerZ, themeIndex, sector });
  if (runtime.renderer) {
    station.blockers.forEach((blocker) => {
      blocker.matrixAutoUpdate = false;
      blocker.updateMatrix();
    });
  }
  return station;
}

function applyStationTheme(station) {
  if (!station) return;
  G.themeIndex = ((station.themeIndex % THEMES.length) + THEMES.length) % THEMES.length;
  G.theme = station.theme;
  G.sector = station.sector;
  setAccent(station.theme);
  setText(dom.stationName, station.theme.name);
  setText(dom.sectorId, `SECTOR ${String(station.sector).padStart(2, '0')}`);
  runtime.worldScene.fog.color.setHex(station.theme.fog);
  runtime.worldScene.fog.density = 0.019;
  if (runtime.train) {
    drawTrainDestination(runtime.train, station.theme.destination, station.theme.accent);
  }
  updateArrivalBoard(station, station.theme.destination, '02:47');
  updateStationHUD();
}

function configureTrainForStation(station) {
  const train = runtime.train;
  if (!train) return;
  train.group.position.set(WORLD.trackX, 0, station.centerZ - 155);
  train.group.visible = false;
  train.doors = 0;
  train.doorTarget = 0;
  setTrainDoors(train, 0);
  setStationArrivalMode(station, false);
  updateArrivalBoard(station, station.theme.destination, '02:47');
  G.train.state = 'hidden';
  G.train.timer = 0;
  G.train.progress = 0;
  G.train.doorTarget = 0;
  G.train.rideT = 0;
}

function initializeGameWorld() {
  if (!runtime.train) buildTrain();
  if (runtime.currentStation) {
    disposeStation(runtime.currentStation);
    runtime.currentStation = null;
  }
  if (runtime.nextStation) {
    disposeStation(runtime.nextStation);
    runtime.nextStation = null;
  }
  runtime.currentStation = createStation(0, 0, 1);
  configureTrainForStation(runtime.currentStation);
  applyStationTheme(runtime.currentStation);
  G.state = 'menu';
  G.started = false;
  G.paused = false;
  G.round = 1;
  G.themeIndex = 0;
  G.sector = 1;
  G.wave.active = false;
  G.wave.number = 0;
  G.wave.queue.length = 0;
  G.wave.alive = 0;
  G.wave.total = 0;
  G.wave.spawned = 0;
  G.flow.trainArriveAt = Infinity;
  G.flow.nextWaveAt = Infinity;
  setWeaponsVisible(false);
  resetFlowState();
  setCinematic(false);
  hideScreen(dom.gameoverScreen);
  hideScreen(dom.pauseScreen);
  showScreen(dom.startScreen);
  dom.hud.classList.add('ui-hidden');
  dom.rideHud.classList.remove('show');
  dom.fadeOverlay.classList.remove('show');
  updateArrivalBoard(runtime.currentStation, runtime.currentStation.theme.destination, '02:47');
  updateWaveHUD();
  updateVitalsHUD();
}

function prepareRun() {
  if (runtime.currentStation) {
    disposeStation(runtime.currentStation);
    runtime.currentStation = null;
  }
  if (runtime.nextStation) {
    disposeStation(runtime.nextStation);
    runtime.nextStation = null;
  }
  clearCombatEntities();
  runtime.currentStation = createStation(0, 0, 1);
  runtime.nextStation = null;
  runtime.currentStation.group.visible = true;
  applyStationTheme(runtime.currentStation);
  configureTrainForStation(runtime.currentStation);
  G.round = 1;
  G.sector = 1;
  G.themeIndex = 0;
  G.time = 0;
  G.runTime = 0;
  G.stats.shots = 0;
  G.stats.hits = 0;
  G.stats.kills = 0;
  G.stats.headshots = 0;
  G.stats.wavesCleared = 0;
  G.stats.damageDealt = 0;
  G.stats.startedAt = performance.now();
  G.stats.runTime = 0;
  resetFlowState();
  G.wave.active = false;
  G.wave.number = 0;
  G.wave.queue.length = 0;
  G.wave.alive = 0;
  G.wave.spawned = 0;
  G.wave.total = 0;
  G.wave.clearedAt = 0;
  G.train.state = 'hidden';
  resetPlayer();
  resetWeaponSystem();
  setWeaponsVisible(true);
  setCinematic(false);
  setReloadIndicator(false, 0);
  clearInteraction();
  hideScreen(dom.startScreen);
  hideScreen(dom.pauseScreen);
  hideScreen(dom.gameoverScreen);
  dom.hud.classList.remove('ui-hidden');
  dom.rideHud.classList.remove('show');
  dom.fadeOverlay.classList.remove('show');
  G.started = true;
  G.paused = false;
  G.state = 'playing';
  runtime.menuCameraT = 0;
  G.ui.lastWeaponIndex = -1;
  updateWeaponHUD(true);
  updateArrivalBoard(runtime.currentStation, runtime.currentStation.theme.destination, '02:47');
  updateStationHUD();
  updateWaveHUD();
  updateVitalsHUD();
  if (runtime.audio) {
    runtime.audio.setMusicMode('combat');
    runtime.audio.setTrainProximity(0, 0);
  }
  setInteraction('MISSION UPDATE', 'CLEAR THE PLATFORM');
  setTimeout(() => clearInteraction(), 3600);
}

function startGame() {
  if (G.state === 'playing' || G.state === 'boarding' || G.state === 'riding') return;
  prepareRun();
  fade(true, { instant: true });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fade(false, { duration: 720 });
    });
  });
  showCenterMessage('LINE 13 // NIGHT SERVICE', 'WAVE 01 INBOUND', 2800);
  showObjectiveToast('PLATFORM BREACH', 'Hostile signatures are moving through the service tunnels. Hold the platform and protect the middle-car boarding point.', 'PRIORITY TRANSMISSION', 6200);
  if (dom.centerMessage) dom.centerMessage.classList.add('show');
  startWave();
}

function returnToMenu() {
  if (G.flow.deathTimer) clearTimeout(G.flow.deathTimer);
  if (document.pointerLockElement) document.exitPointerLock();
  clearCombatEntities();
  if (runtime.currentStation) disposeStation(runtime.currentStation);
  if (runtime.nextStation) disposeStation(runtime.nextStation);
  runtime.currentStation = createStation(0, 0, 1);
  runtime.nextStation = null;
  configureTrainForStation(runtime.currentStation);
  applyStationTheme(runtime.currentStation);
  resetFlowState();
  G.state = 'menu';
  G.started = false;
  G.paused = false;
  G.wave.active = false;
  G.wave.queue.length = 0;
  G.wave.alive = 0;
  G.stats.startedAt = 0;
  G.stats.runTime = 0;
  G.train.state = 'hidden';
  setWeaponsVisible(false);
  setCinematic(false);
  clearInteraction();
  setReloadIndicator(false, 0);
  dom.hud.classList.add('ui-hidden');
  dom.rideHud.classList.remove('show');
  hideScreen(dom.pauseScreen);
  hideScreen(dom.gameoverScreen);
  showScreen(dom.startScreen);
  dom.fadeOverlay.classList.remove('show');
  if (runtime.audio) {
    runtime.audio.setMusicMode('menu');
    runtime.audio.setTrainProximity(0, 0);
  }
  updateWaveHUD();
  updateVitalsHUD();
}

function startWave(timeOverride = null) {
  if (!runtime.currentStation) return;
  if (G.wave.active) return;
  G.state = 'playing';
  G.flow.nextWaveAt = Infinity;
  G.flow.trainArriveAt = Infinity;
  G.flow.postArrival = false;
  if (G.flow.trainDeparting) finishTrainDeparture();
  G.train.state = 'hidden';
  G.train.doorTarget = 0;
  if (runtime.train) {
    runtime.train.group.visible = false;
    runtime.train.doorTarget = 0;
  }
  setStationArrivalMode(runtime.currentStation, false);
  if (runtime.audio) runtime.audio.setTrainProximity(0, 0);

  const total = getEnemyCount(G.round);
  const queue = [];
  for (let i = 0; i < total; i++) queue.push(chooseWaveType(G.round, i, total));
  G.wave.active = true;
  G.wave.number = G.round;
  G.wave.queue = queue;
  G.wave.total = total;
  G.wave.spawned = 0;
  G.wave.alive = 0;
  G.wave.nextSpawnAt = G.time + 1.1;
  G.wave.clearedAt = 0;
  G.wave.intermission = false;
  G.wave.lastSpawnAt = 0;
  setCinematic(false);
  clearInteraction();
  dom.hud.classList.remove('ui-hidden');
  updateWaveHUD();
  updateStationHUD();
  setText(dom.objective, 'BREACH CONTAINMENT');
  setText(dom.waveStatus, 'CONTACT PENDING');
  showCenterMessage(`WAVE ${String(G.wave.number).padStart(2, '0')}`, 'HOSTILES INBOUND', 2300);
  if (runtime.audio) {
    runtime.audio.waveStart();
    runtime.audio.setMusicMode('combat');
  }
}

function updateWave(dt) {
  if (!G.wave.active || G.state !== 'playing') return;
  if (G.wave.queue.length > 0 && G.time >= G.wave.nextSpawnAt) {
    const type = G.wave.queue.shift();
    spawnEnemy(type);
    G.wave.nextSpawnAt = G.time + rand(0.52, 1.25);
    updateWaveHUD();
  }
  if (G.wave.queue.length === 0 && G.wave.spawned >= G.wave.total && G.wave.alive <= 0) {
    completeWave();
  }
}

function completeWave() {
  if (!G.wave.active) return;
  G.wave.active = false;
  G.wave.clearedAt = G.time;
  G.wave.intermission = true;
  G.stats.wavesCleared++;
  G.state = 'cleared';
  G.flow.trainArriveAt = G.time + 3.3;
  G.flow.nextWaveAt = Infinity;
  G.flow.postArrival = false;
  if (runtime.audio) {
    runtime.audio.waveClear();
    runtime.audio.setMusicMode('cleared');
  }
  showCenterMessage('SECTOR SECURE', 'TRAIN INBOUND', 2600);
  showObjectiveToast('PLATFORM SECURED', 'The line is moving again. A middle car is being routed to your platform. Stand clear of the edge.', 'SERVICE RESTORED', 6200);
  setText(dom.objective, 'STAND BY FOR TRAIN');
  setText(dom.waveStatus, 'SECTOR CLEAR');
  setCinematic(false);
  updateWaveHUD();
  updateArrivalBoard(runtime.currentStation, 'LINE 13', 'SOON');
}

function beginTrainArrival() {
  if (!runtime.currentStation || !runtime.train) return;
  if (G.state === 'trainArriving' || G.state === 'trainOpen') return;
  G.flow.trainArriveAt = Infinity;
  G.state = 'trainArriving';
  G.train.state = 'arriving';
  G.train.timer = 0;
  G.train.duration = FLOW.TRAIN_ARRIVAL_TIME;
  G.train.startZ = runtime.currentStation.centerZ - 148;
  G.train.targetZ = runtime.currentStation.centerZ;
  G.train.progress = 0;
  G.train.doorTarget = 0;
  if (runtime.train) runtime.train.doorTarget = 0;
  G.flow.trainBrakePlayed = false;
  const nextIndex = (runtime.currentStation.themeIndex + 1) % THEMES.length;
  const nextTheme = THEMES[nextIndex];
  G.train.nextThemeIndex = nextIndex;
  runtime.train.group.visible = true;
  runtime.train.group.position.set(WORLD.trackX, 0, G.train.startZ);
  runtime.train.doors = 0;
  setTrainDoors(runtime.train, 0);
  drawTrainDestination(runtime.train, nextTheme.name, nextTheme.accent);
  setStationArrivalMode(runtime.currentStation, true);
  setText(dom.objective, 'STAND CLEAR OF THE EDGE');
  updateArrivalBoard(runtime.currentStation, 'LINE 13', 'INBOUND');
  clearInteraction();
  showCenterMessage('TRAIN APPROACHING', 'STAND CLEAR OF THE PLATFORM', 3000);
  if (runtime.audio) {
    runtime.audio.startTrainApproach();
    runtime.audio.setMusicMode('cleared');
  }
}

function openTrain() {
  if (!runtime.currentStation || !runtime.train) return;
  G.state = 'trainOpen';
  G.train.state = 'open';
  G.train.timer = 0;
  G.train.doorTarget = 1;
  runtime.train.doorTarget = 1;
  runtime.train.group.position.z = runtime.currentStation.centerZ;
  if (runtime.audio) {
    runtime.audio.trainBrake();
    runtime.audio.trainDoors(true);
    runtime.audio.stationChime();
  }
  setStationArrivalMode(runtime.currentStation, true);
  updateArrivalBoard(runtime.currentStation, 'BOARDING', 'NOW');
  setText(dom.objective, 'BOARD THE MIDDLE CAR');
  setText(dom.waveStatus, 'SERVICE RESTORED');
  showCenterMessage('MIDDLE CAR READY', 'PRESS E TO BOARD', 3600);
  showObjectiveToast('BOARDING CALL', 'The middle car doors are open at the stop marker. Get close to the doorway and press E to board.', 'LINE 13 // CONDUCTOR', 5200);
  updateWaveHUD();
}

function updateTrainArrival(dt) {
  const train = runtime.train;
  if (!train) return;
  G.train.timer += dt;
  const t = clamp01(G.train.timer / G.train.duration);
  const eased = easeOutCubic(t);
  train.group.position.z = lerp(G.train.startZ, G.train.targetZ, eased);
  G.train.progress = eased;
  const proximity = clamp01(0.25 + eased * 0.75);
  const speed = Math.sin(Math.min(1, t) * Math.PI) * 0.85;
  if (runtime.audio) runtime.audio.setTrainProximity(proximity, speed);
  if (t > 0.72) G.flow.screenShake = Math.max(G.flow.screenShake, 0.12);
  if (!G.flow.trainBrakePlayed && t > 0.82) {
    G.flow.trainBrakePlayed = true;
    if (runtime.audio) runtime.audio.trainBrake();
  }
  if (t >= 1) {
    openTrain();
  }
}

function updateTrainPrompt() {
  if (!runtime.train || !runtime.currentStation) return;
  if (G.state !== 'trainOpen') {
    clearInteraction();
    return;
  }
  const nearZ = Math.abs(player.position.z - runtime.currentStation.centerZ) < 3.0;
  const nearEdge = player.position.x < -3.25;
  if (!nearZ || !nearEdge) {
    clearInteraction();
    if (G.ui.promptShown) {
      // Keep a directional hint in the wave readout while the car waits.
    }
    return;
  }
  if (runtime.train.doors < 0.42) {
    setInteraction('MIDDLE CAR // DOORS MOVING', 'STAND BY TO BOARD');
    return;
  }
  setInteraction('MIDDLE CAR // DOORS OPEN', 'BOARD THE TRAIN');
  if (input.interactQueued) {
    input.interactQueued = false;
    startBoarding();
  }
  input.interactQueued = false;
}

function startBoarding() {
  if (G.state !== 'trainOpen' || !runtime.train) return;
  if (runtime.train.doors < 0.35) return;
  G.state = 'boarding';
  G.train.state = 'boarding';
  G.flow.boardT = 0;
  G.flow.boardingDoorClosed = false;
  G.flow.boardStartCamera = runtime.worldCamera.position.clone();
  const lookDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(runtime.worldCamera.quaternion);
  G.flow.boardStartLook = runtime.worldCamera.position.clone().addScaledVector(lookDirection, 6);
  clearInteraction();
  input.interactQueued = false;
  setWeaponsVisible(false);
  setReloadIndicator(false, 0);
  setCinematic(true);
  dom.cinemaBars.classList.add('active');
  if (runtime.audio) runtime.audio.setTrainProximity(1, 0.15);
}

function updateBoarding(dt) {
  G.flow.boardT += dt;
  if (!G.flow.boardingDoorClosed && G.flow.boardT > 1.45) {
    G.flow.boardingDoorClosed = true;
    if (runtime.train) runtime.train.doorTarget = 0;
    if (runtime.audio) runtime.audio.trainDoors(false);
  }
  if (G.flow.boardT >= FLOW.BOARD_TIME) {
    beginRide();
  }
}

function buildNextStation() {
  if (runtime.nextStation) return;
  const nextThemeIndex = (runtime.currentStation.themeIndex + 1) % THEMES.length;
  const nextSector = G.round + 1;
  const nextCenter = runtime.currentStation.centerZ + WORLD.stationGap;
  const station = createStation(nextCenter, nextThemeIndex, nextSector);
  runtime.nextStation = station;
  G.flow.nextStationBuilt = true;
}

function beginRide() {
  if (!runtime.currentStation || !runtime.train) return;
  if (!runtime.nextStation) buildNextStation();
  const target = runtime.nextStation;
  G.state = 'riding';
  G.train.state = 'riding';
  G.train.doorTarget = 0;
  if (runtime.train) runtime.train.doorTarget = 0;
  G.train.timer = 0;
  G.train.rideT = 0;
  G.flow.rideT = 0;
  G.flow.rideStart = runtime.currentStation.centerZ;
  G.flow.rideTarget = target.centerZ;
  G.flow.ridePhase = 'waiting';
  G.flow.arrivalT = 0;
  G.flow.arrivalFadeStarted = false;
  G.flow.arrivalPromoted = false;
  G.flow.arrivalRevealed = false;
  G.flow.arrivalStationName = target.theme.name;
  G.flow.travelling = false;
  G.flow.rideLurch = 0;
  G.flow.postArrival = false;
  drawTrainDestination(runtime.train, target.theme.name, target.theme.accent);
  setStationArrivalMode(runtime.currentStation, true);
  setText(dom.rideNext, target.theme.name);
  setText(dom.rideMessage, 'STAND CLEAR OF THE DOORS');
  setText(dom.rideStopCode, target.theme.code || `S-${String(target.sector).padStart(2, '0')}`);
  setText(dom.rideDestination, target.theme.destination);
  setText(dom.rideEta, formatCountdown(FLOW.RIDE_WAIT + FLOW.RIDE_TRAVEL));
  dom.rideRouteFill.style.width = '0%';
  dom.rideMessage.classList.add('show');
  dom.cinemaBars.classList.add('active');
  setCinematic(true);
  dom.rideHud.classList.add('show');
  dom.hud.classList.add('ui-hidden');
  if (runtime.audio) {
    runtime.audio.trainDoors(false);
    runtime.audio.stationChime();
    runtime.audio.setMusicMode('cleared');
    runtime.audio.setTrainProximity(1, 0.25);
  }
}

function updateRide(dt) {
  if (!runtime.train || !runtime.nextStation) return;
  G.flow.rideT += dt;
  G.train.rideT = G.flow.rideT;
  const wait = FLOW.RIDE_WAIT;
  const travelT = clamp01((G.flow.rideT - wait) / FLOW.RIDE_TRAVEL);
  const elapsedTravel = Math.max(0, G.flow.rideT - wait);
  const eased = easeInOutCubic(travelT);
  if (!G.flow.travelling && travelT > 0) {
    G.flow.travelling = true;
    setText(dom.rideMessage, 'NIGHT SERVICE // LINE 13');
    if (runtime.audio) runtime.audio.startTrainApproach();
  }
  runtime.train.group.position.z = lerp(G.flow.rideStart, G.flow.rideTarget, eased);
  dom.rideRouteFill.style.width = `${(travelT * 100).toFixed(1)}%`;
  const remaining = Math.max(0, FLOW.RIDE_TRAVEL - elapsedTravel);
  setText(dom.rideEta, formatCountdown(remaining));
  const travelSpeed = travelT > 0 && travelT < 1 ? Math.sin(travelT * Math.PI) : 0;
  G.flow.rideLurch = Math.sin(G.time * 7.2) * travelSpeed * 0.6 + Math.sin(G.time * 2.1) * 0.15;
  if (runtime.audio) runtime.audio.setTrainProximity(1, travelSpeed * 0.9);
  G.flow.screenShake = Math.max(G.flow.screenShake, travelSpeed * 0.1);
  if (travelT > 0.82 && travelT < 0.84) {
    setText(dom.rideMessage, `ARRIVING // ${G.flow.arrivalStationName}`);
    dom.rideMessage.classList.add('show');
  }
  if (runtime.train.interiorLights.length) {
    const flicker = travelT > 0.3 && travelT < 0.36 ? 0.7 : 1;
    for (let i = 0; i < runtime.train.interiorLights.length; i++) {
      runtime.train.interiorLights[i].intensity = (i === 1 ? 1.65 : 1.05) * flicker;
    }
  }
  if (travelT >= 1 && !G.flow.arrivalFadeStarted) {
    arriveAtNextStation();
  }
}

function arriveAtNextStation() {
  G.flow.arrivalFadeStarted = true;
  G.flow.arrivalT = 0;
  G.train.state = 'arrived';
  G.train.group.position.z = G.flow.rideTarget;
  G.train.doorTarget = 1;
  if (runtime.train) runtime.train.doorTarget = 1;
  G.train.rideT = 0;
  setText(dom.rideMessage, 'DOORS OPENING');
  dom.rideMessage.classList.add('show');
  dom.rideRouteFill.style.width = '100%';
  if (runtime.audio) {
    runtime.audio.trainBrake();
    runtime.audio.trainDoors(true);
    runtime.audio.stationChime();
    runtime.audio.setTrainProximity(0.75, 0.1);
  }
  const token = G.flow.transitionToken;
  fade(true, {
    label: 'LINE 13 // NOW ARRIVING',
    detail: G.flow.arrivalStationName,
    duration: 700,
    hold: 900,
  });
  setTimeout(() => {
    if (token !== G.flow.transitionToken) return;
    G.flow.screenShake = 0;
  }, FLOW.RIDE_REVEAL * 1000);
}

function updateRideArrival(dt) {
  G.flow.arrivalT += dt;
  if (!G.flow.arrivalPromoted && G.flow.arrivalT > FLOW.RIDE_PROMOTE) {
    promoteNextStation();
  }
  if (!G.flow.arrivalRevealed && G.flow.arrivalT > FLOW.RIDE_REVEAL) {
    G.flow.arrivalRevealed = true;
    G.state = 'cleared';
    G.flow.postArrival = true;
    G.train.state = 'open';
    G.train.doorTarget = 1;
    if (runtime.train) runtime.train.doorTarget = 1;
    G.flow.trainDepartAt = G.time + FLOW.TRAIN_DEPART_DELAY;
    G.flow.nextWaveAt = G.time + 5.4;
    setCinematic(false);
    dom.cinemaBars.classList.remove('active');
    dom.rideHud.classList.remove('show');
    dom.hud.classList.remove('ui-hidden');
    fade(false, { duration: 780 });
    updateWaveHUD();
    updateStationHUD();
    setText(dom.objective, 'SECURE THE NEW SECTOR');
    showCenterMessage(runtime.currentStation.theme.name, 'SECTOR SECURED // TRAIN DEPARTING', 3000);
    showObjectiveToast(
      'ARRIVED // ' + runtime.currentStation.theme.name,
      'New platform, new signatures. Use the moment before the next wave to collect salvage and find cover.',
      'LINE 13 // SERVICE UPDATE',
      5200
    );
    if (runtime.audio) {
      runtime.audio.setMusicMode('cleared');
      runtime.audio.stationChime();
    }
    // Field kit: modest recovery on arrival, never a full reset.
    if (player.health < player.maxHealth) player.health = Math.min(player.maxHealth, player.health + 12);
    if (player.armor < player.maxArmor) player.armor = Math.min(player.maxArmor, player.armor + 10);
    updateVitalsHUD();
  }
}

function promoteNextStation() {
  const next = runtime.nextStation;
  if (!next || G.flow.arrivalPromoted) return;
  G.flow.arrivalPromoted = true;
  const old = runtime.currentStation;
  runtime.currentStation = next;
  runtime.nextStation = null;
  runtime.currentStation.group.visible = true;
  G.round = next.sector;
  applyStationTheme(next);
  setStationArrivalMode(next, true);
  updateArrivalBoard(next, 'BOARDING', 'NOW');
  if (runtime.train) {
    runtime.train.group.position.set(WORLD.trackX, 0, next.centerZ);
    runtime.train.doorTarget = 1;
    G.train.doorTarget = 1;
    drawTrainDestination(runtime.train, next.theme.name, next.theme.accent);
  }
  if (old) {
    disposeStation(old);
  }
  player.position.set(-2.4, 0, next.centerZ + 1.8);
  player.velocity.set(0, 0, 0);
  player.yaw = 0;
  player.pitch = -0.03;
  player.grounded = true;
  player.isMoving = false;
  player.recoilPitch = 0;
  player.recoilYaw = 0;
  player.cameraShake = 0;
  runtime.weaponRig.visible = true;
  if (runtime.audio) runtime.audio.setMusicMode('menu');
  updateWaveHUD();
  updateStationHUD();
  updateVitalsHUD();
  updateArrivalBoard(next, 'LINE 13', 'NOW');
}

function beginTrainDeparture() {
  if (!runtime.train || !runtime.currentStation) return;
  if (G.flow.trainDeparting) return;
  G.flow.trainDeparting = true;
  G.flow.trainDepartT = 0;
  G.flow.trainDepartStart = runtime.currentStation.centerZ;
  const target = runtime.currentStation.centerZ + 145;
  G.flow.trainDepartTarget = target;
  G.train.state = 'departing';
  G.train.doorTarget = 0;
  if (runtime.train) runtime.train.doorTarget = 0;
  if (runtime.audio) runtime.audio.trainDoors(false);
}

function updateTrainDeparture(dt) {
  if (!G.flow.trainDeparting || !runtime.train) return;
  G.flow.trainDepartT += dt;
  const t = clamp01(G.flow.trainDepartT / 4.6);
  const eased = easeInCubic(t);
  runtime.train.group.position.z = lerp(G.flow.trainDepartStart, G.flow.trainDepartTarget, eased);
  if (runtime.audio) runtime.audio.setTrainProximity(clamp01(1 - t), (1 - t) * 0.8);
  if (t >= 1) finishTrainDeparture();
}

function finishTrainDeparture() {
  G.flow.trainDeparting = false;
  G.train.state = 'hidden';
  if (runtime.train) {
    runtime.train.group.visible = false;
    runtime.train.group.position.set(WORLD.trackX, 0, runtime.currentStation.centerZ - 155);
    runtime.train.doorTarget = 0;
    G.train.doorTarget = 0;
    setTrainDoors(runtime.train, 0);
  }
  setStationArrivalMode(runtime.currentStation, false);
  if (runtime.audio) runtime.audio.setTrainProximity(0, 0);
}

function updateGameFlow(dt) {
  updateWave(dt);

  if (G.state === 'cleared' && G.flow.trainArriveAt !== Infinity && G.time >= G.flow.trainArriveAt) {
    beginTrainArrival();
  }
  if (G.state === 'trainArriving') {
    updateTrainArrival(dt);
  } else if (G.state === 'trainOpen') {
    updateTrainPrompt();
  } else if (G.state === 'boarding') {
    updateBoarding(dt);
  } else if (G.state === 'riding') {
    if (!G.flow.arrivalFadeStarted) updateRide(dt);
    else updateRideArrival(dt);
  }

  if (G.flow.trainDeparting) updateTrainDeparture(dt);

  if (G.state === 'cleared' && G.flow.postArrival && !G.flow.trainDeparting) {
    if (G.flow.trainDepartAt !== Infinity && G.time >= G.flow.trainDepartAt && runtime.train && runtime.train.group.visible) {
      G.flow.trainDepartAt = Infinity;
      beginTrainDeparture();
    }
  }

  if (G.state === 'cleared' && G.flow.nextWaveAt !== Infinity && G.time >= G.flow.nextWaveAt) {
    G.flow.nextWaveAt = Infinity;
    startWave();
  }

  if (G.state !== 'trainOpen' && G.state !== 'boarding' && G.state !== 'riding') {
    if (G.ui.promptShown) clearInteraction();
  }

  input.interactQueued = false;

  if (G.state === 'cleared' && runtime.currentStation) {
    setText(dom.objective, G.flow.postArrival ? 'SECURE THE NEW SECTOR' : 'STAND BY FOR TRAIN');
  }
}

function triggerGameOver() {
  if (G.flow.deathTimer) clearTimeout(G.flow.deathTimer);
  const token = G.flow.transitionToken;
  G.flow.deathTimer = setTimeout(() => {
    if (token !== G.flow.transitionToken) return;
    if (G.state !== 'gameover') return;
    const totalSeconds = Math.max(0, Math.floor(G.time));
    const accuracy = G.stats.shots > 0 ? Math.round((G.stats.hits / G.stats.shots) * 100) : 0;
    setText(dom.statWaves, G.stats.wavesCleared);
    setText(dom.statKills, G.stats.kills);
    dom.statAccuracy.innerHTML = `${accuracy}<small>%</small>`;
    setText(dom.statTime, formatTime(totalSeconds));
    const headshotLine = G.stats.headshots > 0 ? `${G.stats.headshots} clean headshots logged. ` : '';
    setText(dom.gameoverCopy, `You held ${G.stats.wavesCleared} sector${G.stats.wavesCleared === 1 ? '' : 's'} before the line went silent. ${headshotLine}The night service remembers.`);
    let best = 0;
    try {
      best = Number(window.localStorage.getItem('lastStopBestWaves') || '0');
      if (G.stats.wavesCleared > best) {
        best = G.stats.wavesCleared;
        window.localStorage.setItem('lastStopBestWaves', String(best));
      }
    } catch (error) {
      best = G.stats.wavesCleared;
    }
    if (dom.gameoverBest) {
      dom.gameoverBest.innerHTML = `BEST RUN <b>${best} SECTOR${best === 1 ? '' : 'S'}</b>`;
    }
    setText(dom.pauseSession, `MTA-13-${String(G.round).padStart(2, '0')}${String(G.stats.kills).padStart(2, '0')}`);
    dom.hud.classList.add('ui-hidden');
    dom.rideHud.classList.remove('show');
    showScreen(dom.gameoverScreen);
    hideScreen(dom.pauseScreen);
    hideScreen(dom.startScreen);
    if (runtime.audio) runtime.audio.setMusicMode('dead');
  }, 1800);
}

function skipToTrainArrival() {
  if (G.state === 'menu') startGame();
  if (G.state === 'playing') {
    killAllEnemies();
    G.wave.active = false;
    G.state = 'cleared';
    G.flow.trainArriveAt = G.time;
    updateWaveHUD();
  } else if (G.state === 'cleared') {
    G.flow.trainArriveAt = G.time;
  }
}

function skipTrainArrival() {
  if (G.state === 'trainArriving') {
    if (runtime.train) runtime.train.group.position.z = runtime.currentStation.centerZ;
    openTrain();
  } else if (G.state === 'cleared') {
    beginTrainArrival();
    if (runtime.train) runtime.train.group.position.z = runtime.currentStation.centerZ;
    openTrain();
  }
}

function skipBoarding() {
  if (G.state === 'trainOpen') startBoarding();
  if (G.state === 'boarding') beginRide();
}

function skipRide() {
  if (G.state !== 'riding') return;
  if (!runtime.nextStation) buildNextStation();
  G.flow.rideT = FLOW.RIDE_WAIT + FLOW.RIDE_TRAVEL;
  if (!G.flow.arrivalFadeStarted) {
    G.train.group.position.z = G.flow.rideTarget;
    arriveAtNextStation();
  }
  G.flow.arrivalT = Math.max(G.flow.arrivalT, FLOW.RIDE_PROMOTE);
  promoteNextStation();
  G.flow.arrivalT = Math.max(G.flow.arrivalT, FLOW.RIDE_REVEAL + 0.01);
}
