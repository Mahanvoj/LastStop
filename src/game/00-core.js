/* ==========================================================================
   LAST STOP — LINE 13
   Core constants, state and utility layer
   ========================================================================== */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;
const inverseLerp = (a, b, value) => clamp((value - a) / (b - a), 0, 1);
const smoothstep = (t) => t * t * (3 - 2 * t);
const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));
const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const chance = (probability) => Math.random() < probability;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp01 = (value) => clamp(value, 0, 1);
const easeInCubic = (t) => t * t * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
const easeInOutQuint = (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function formatCountdown(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `00:${String(s).padStart(2, '0')}`;
}

/* --------------------------------------------------------------------------
   DOM handles
   -------------------------------------------------------------------------- */

const dom = {
  canvas: $('#game-canvas'),
  hud: $('#hud'),
  startScreen: $('#start-screen'),
  startButton: $('#start-button'),
  bootVeil: $('#boot-veil'),
  pauseScreen: $('#pause-screen'),
  resumeButton: $('#resume-button'),
  pauseRestartButton: $('#pause-restart-button'),
  pauseMenuButton: $('#pause-menu-button'),
  gameoverScreen: $('#gameover-screen'),
  restartButton: $('#restart-button'),
  gameoverMenuButton: $('#gameover-menu-button'),
  stationName: $('#station-name'),
  sectorId: $('#sector-id'),
  objective: $('#objective-text'),
  lineNumber: $('#line-number'),
  waveNum: $('#wave-num'),
  waveSummary: $('#enemy-summary'),
  waveStatus: $('#wave-status'),
  waveTrack: $('#threat-fill'),
  waveReadout: $('#wave-readout'),
  threatCode: $('#threat-code'),
  minimap: $('#minimap'),
  mapLine: $('#map-line'),
  objectiveToast: $('#objective-toast'),
  toastTitle: $('#toast-title'),
  toastCopy: $('#toast-copy'),
  killFeed: $('#kill-feed'),
  crosshair: $('#crosshair'),
  hitmarker: $('#hitmarker'),
  interactPrompt: $('#interact-prompt'),
  interactCopy: $('#interact-prompt .prompt-copy span'),
  interactSmall: $('#interact-prompt .prompt-copy small'),
  reloadIndicator: $('#reload-indicator'),
  reloadFill: $('#reload-fill'),
  healthValue: $('#health-value'),
  healthFill: $('#health-fill'),
  armorValue: $('#armor-value'),
  armorFill: $('#armor-fill'),
  vitalsNote: $('#vitals-note'),
  ammoMag: $('#ammo-mag'),
  ammoReserve: $('#ammo-reserve'),
  ammoPanel: $('.ammo-panel'),
  weaponName: $('#weapon-name'),
  weaponClass: $('#weapon-class'),
  fireMode: $('#fire-mode'),
  slots: [$('#slot-0'), $('#slot-1'), $('#slot-2')],
  centerMessage: $('#center-message'),
  centerKicker: $('#center-kicker'),
  centerMain: $('#center-main'),
  pickupNote: $('#pickup-note'),
  damageFlash: $('#damage-flash'),
  lowHealth: $('#low-health'),
  damageIndicators: $$('.dmg-dir'),
  fadeOverlay: $('#fade-overlay'),
  fadeLabel: $('#fade-label'),
  fadeDetail: $('#fade-detail'),
  cinemaBars: $('#cinema-bars'),
  rideHud: $('#ride-hud'),
  rideNext: $('#ride-next'),
  rideMessage: $('#ride-message'),
  rideRouteFill: $('#ride-route-fill'),
  rideStopCode: $('#ride-stop-code'),
  rideDestination: $('#ride-destination'),
  rideEta: $('#ride-eta'),
  lockHint: $('#lock-hint'),
  statWaves: $('#stat-waves'),
  statKills: $('#stat-kills'),
  statAccuracy: $('#stat-accuracy'),
  statTime: $('#stat-time'),
  gameoverCopy: $('#gameover-copy'),
  gameoverBest: $('#gameover-best'),
  pauseSession: $('#pause-session'),
};

function setText(el, value) {
  if (!el) return;
  const text = String(value);
  if (el.textContent !== text) el.textContent = text;
}

function setClass(el, className, active) {
  if (!el) return;
  el.classList.toggle(className, !!active);
}

/* --------------------------------------------------------------------------
   World constants
   -------------------------------------------------------------------------- */

const WORLD = {
  trackX: -7.8,
  platformEdgeX: -5.35,
  wallX: 7.25,
  oppositeWallX: -12.1,
  ceilingY: 5.45,
  stationHalfLength: 46,
  stationGap: 200,
  trainBackOffset: 76,
  trackFloorY: -1.42,
  trainWidth: 3.08,
  trainHeight: 3.02,
  playerEyeHeight: 1.67,
};

const PLAY_LIMITS = {
  minX: -4.9,
  maxX: 6.42,
  minZ: -42,
  maxZ: 42,
};

const THEMES = [
  {
    name: 'HARBOR HEIGHTS',
    code: 'H-04',
    line: '13',
    sector: 'SECTOR 01',
    accent: '#ffbd66',
    accentRGB: '255,189,102',
    accentHex: 0xffbd66,
    light: 0xffd4a0,
    lightCss: '#ffd4a0',
    trackLight: 0xff8540,
    wall: '#5b625e',
    tile: '#85897f',
    upperWall: '#252b2a',
    floor: '#171a18',
    posterTint: '#dd9c51',
    fog: 0x050707,
    destination: 'OUTER HARBOR',
    trainside: '#c3bba7',
  },
  {
    name: 'MERIDIAN EXCHANGE',
    code: 'M-02',
    line: '13',
    sector: 'SECTOR 02',
    accent: '#64e5d1',
    accentRGB: '100,229,209',
    accentHex: 0x64e5d1,
    light: 0xc4f2e7,
    lightCss: '#c4f2e7',
    trackLight: 0x43d2c3,
    wall: '#405554',
    tile: '#708f87',
    upperWall: '#172324',
    floor: '#111a19',
    posterTint: '#56d9c4',
    fog: 0x030708,
    destination: 'MERIDIAN YARD',
    trainside: '#b8c9c3',
  },
  {
    name: 'BLACKWATER',
    code: 'B-07',
    line: '13',
    sector: 'SECTOR 03',
    accent: '#ff6f55',
    accentRGB: '255,111,85',
    accentHex: 0xff6f55,
    light: 0xffb596,
    lightCss: '#ffb596',
    trackLight: 0xe14127,
    wall: '#564b48',
    tile: '#81706a',
    upperWall: '#231a19',
    floor: '#191413',
    posterTint: '#e7644d',
    fog: 0x080404,
    destination: 'BLACKWATER DEPOT',
    trainside: '#c6b8aa',
  },
  {
    name: 'ASH CROSS',
    code: 'A-11',
    line: '13',
    sector: 'SECTOR 04',
    accent: '#b9d86b',
    accentRGB: '185,216,107',
    accentHex: 0xb9d86b,
    light: 0xe2eead,
    lightCss: '#e2eead',
    trackLight: 0x94b13e,
    wall: '#4c5347',
    tile: '#77806c',
    upperWall: '#1c221b',
    floor: '#151914',
    posterTint: '#adc966',
    fog: 0x050704,
    destination: 'ASH CROSS',
    trainside: '#c4c3a8',
  },
  {
    name: 'CIVIC CENTER',
    code: 'C-01',
    line: '13',
    sector: 'SECTOR 05',
    accent: '#91b2ff',
    accentRGB: '145,178,255',
    accentHex: 0x91b2ff,
    light: 0xc8d9ff,
    lightCss: '#c8d9ff',
    trackLight: 0x6b8ee8,
    wall: '#4b535e',
    tile: '#798394',
    upperWall: '#1b222b',
    floor: '#14181d',
    posterTint: '#7f9cdd',
    fog: 0x040609,
    destination: 'CIVIC CENTER',
    trainside: '#c0c4c9',
  },
  {
    name: 'NORTHGATE',
    code: 'N-09',
    line: '13',
    sector: 'SECTOR 06',
    accent: '#f1dfba',
    accentRGB: '241,223,186',
    accentHex: 0xf1dfba,
    light: 0xf4ead4,
    lightCss: '#f4ead4',
    trackLight: 0xc8b386,
    wall: '#57574f',
    tile: '#88867a',
    upperWall: '#22221e',
    floor: '#191916',
    posterTint: '#d4c49f',
    fog: 0x070706,
    destination: 'NORTHGATE TERMINUS',
    trainside: '#cbc5b4',
  },
];

const ENEMY_NAMES = [
  'DRIFTER', 'HOLLOW', 'RAVAGER', 'NIGHTJAR', 'CINDER', 'PALE HORSE',
  'SALT WRAITH', 'REDLINE', 'SIREN', 'TUNNEL HOUND', 'CIVIC GUARD', 'NULL SAINT',
];

const WEAPON_DATA = [
  {
    id: 'p9',
    name: 'VANTAGE P9',
    short: 'P9',
    weaponClass: 'SERVICE PISTOL',
    mode: 'SEMI-AUTO',
    damage: 38,
    headMultiplier: 2.45,
    fireRate: 0.165,
    magazine: 15,
    reserve: 135,
    maxReserve: 240,
    reload: 1.22,
    spread: 0.0034,
    moveSpread: 0.014,
    recoil: 0.019,
    pellets: 1,
    range: 90,
    falloff: 0.28,
    kick: 1,
    ammoPerShot: 1,
    auto: false,
    adsFov: 55,
    color: 0xffbd66,
  },
  {
    id: 'vx7',
    name: 'VX-7 WASP',
    short: 'VX-7',
    weaponClass: 'COMPACT SMG',
    mode: 'FULL-AUTO',
    damage: 17,
    headMultiplier: 2.05,
    fireRate: 0.078,
    magazine: 32,
    reserve: 208,
    maxReserve: 360,
    reload: 1.68,
    spread: 0.0105,
    moveSpread: 0.025,
    recoil: 0.010,
    pellets: 1,
    range: 65,
    falloff: 0.42,
    kick: 0.64,
    ammoPerShot: 1,
    auto: true,
    adsFov: 52,
    color: 0x64e5d1,
  },
  {
    id: 'br12',
    name: 'BREACHER 12',
    short: 'BR-12',
    weaponClass: 'RIOT SHOTGUN',
    mode: 'PUMP ACTION',
    damage: 15,
    headMultiplier: 1.55,
    fireRate: 0.78,
    magazine: 6,
    reserve: 42,
    maxReserve: 72,
    reload: 2.1,
    spread: 0.056,
    moveSpread: 0.035,
    recoil: 0.072,
    pellets: 8,
    range: 31,
    falloff: 0.62,
    kick: 1.9,
    ammoPerShot: 1,
    auto: false,
    adsFov: 58,
    color: 0xff6f55,
  },
];

/* --------------------------------------------------------------------------
   Game state
   -------------------------------------------------------------------------- */

const G = {
  state: 'boot',
  previousState: 'boot',
  menuPreview: true,
  started: false,
  paused: false,
  time: 0,
  runTime: 0,
  round: 1,
  sector: 1,
  themeIndex: 0,
  theme: THEMES[0],
  pointerLocked: false,
  hadPointerLock: false,
  requestLockOnStart: true,
  wave: {
    active: false,
    number: 0,
    queue: [],
    spawned: 0,
    total: 0,
    alive: 0,
    timer: 0,
    spawnDelay: 1.1,
    lastSpawnAt: 0,
    clearedAt: 0,
    intermission: false,
  },
  stats: {
    shots: 0,
    hits: 0,
    kills: 0,
    headshots: 0,
    wavesCleared: 0,
    damageDealt: 0,
    startedAt: 0,
  },
  train: {
    state: 'hidden', // hidden, arriving, open, boarding, riding, unloading
    timer: 0,
    duration: 0,
    progress: 0,
    doors: 0,
    doorTarget: 0,
    startZ: 0,
    targetZ: 0,
    rideT: 0,
    rideDuration: 10.5,
    nextThemeIndex: 0,
  },
  flow: {
    nextStationBuilt: false,
    boarding: false,
    fadeBusy: false,
    nextRoundQueued: false,
    trainWarningAt: 0,
    trainArriveAt: 0,
    currentStationY: 0,
    screenShake: 0,
    xp: 0,
  },
  ui: {
    hitmarkerTimer: 0,
    toastTimer: 0,
    centerTimer: 0,
    pickupTimer: 0,
    reloadShown: false,
    promptShown: false,
    damageDirTimers: [0, 0, 0, 0],
    lastHealth: 100,
    lastAmmo: -1,
    lastReserve: -1,
    lastWeaponIndex: -1,
    lowHealth: false,
  },
  debug: {
    invincible: false,
    showPerf: false,
    freeCamera: false,
  },
  disposed: false,
};

const player = {
  position: new THREE.Vector3(0, 0, 30),
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  targetYaw: 0,
  targetPitch: 0,
  lookDeltaX: 0,
  lookDeltaY: 0,
  health: 100,
  maxHealth: 100,
  armor: 75,
  maxArmor: 100,
  alive: true,
  grounded: true,
  isMoving: false,
  isSprinting: false,
  isAiming: false,
  speed: 0,
  currentWeapon: 0,
  weapons: [],
  radius: 0.36,
  cameraShake: 0,
  bob: 0,
  bobTime: 0,
  landKick: 0,
  stepDistance: 0,
  lastDamageAt: -99,
  lastDamageDirection: 0,
  deathTime: 0,
  deadTilt: 0,
  triggeringReload: false,
  damageSmoothed: 0,
  sprintT: 0,
  aimT: 0,
  recoilPitch: 0,
  recoilYaw: 0,
  recoilKick: 0,
  useCamera: null,
};

const input = {
  keys: Object.create(null),
  forward: 0,
  right: 0,
  fire: false,
  fireQueued: false,
  aim: false,
  sprint: false,
  jumpQueued: false,
  pointerX: 0,
  pointerY: 0,
  lookDeltaX: 0,
  lookDeltaY: 0,
  wheelAccum: 0,
  lastInputAt: 0,
  interactQueued: false,
  mouseDownSince: 0,
  sensitivity: 0.00215,
};

const runtime = {
  renderer: null,
  worldScene: null,
  viewScene: null,
  worldCamera: null,
  viewCamera: null,
  worldRoot: null,
  envMap: null,
  currentStation: null,
  nextStation: null,
  train: null,
  weaponRig: null,
  activeWeapon: null,
  reflection: null,
  audio: null,
  particles: null,
  projectiles: [],
  pickups: [],
  enemyList: [],
  decals: [],
  tracers: [],
  shells: [],
  interactTarget: null,
  raycastBlockerList: [],
  enemyHitMeshes: [],
  temp: {
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    v3: new THREE.Vector3(),
    q1: new THREE.Quaternion(),
    m1: new THREE.Matrix4(),
    color: new THREE.Color(),
  },
  minimapCtx: null,
  minimapAccum: 0,
  frame: 0,
  perfAccum: 0,
  perfFrames: 0,
  fps: 60,
  pausedAt: 0,
  menuCameraT: 0,
  currentPrompt: '',
  lastFrame: performance.now(),
  elapsed: 0,
  runStartedAt: 0,
  lastKillName: '',
  stationBuildSeed: 0,
};

/* --------------------------------------------------------------------------
   Shared materials / geometry helpers
   -------------------------------------------------------------------------- */

function makeBox(w, h, d, material, x = 0, y = 0, z = 0, parent = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  if (parent) parent.add(mesh);
  return mesh;
}

function makePlane(w, h, material, x = 0, y = 0, z = 0, parent = null) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.set(x, y, z);
  if (parent) parent.add(mesh);
  return mesh;
}

function makeCylinder(radiusTop, radiusBottom, height, segments, material, x = 0, y = 0, z = 0, parent = null) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(x, y, z);
  if (parent) parent.add(mesh);
  return mesh;
}

function markSolid(mesh, extra = {}) {
  mesh.userData.solid = true;
  mesh.userData.blocker = true;
  Object.assign(mesh.userData, extra);
  if (!runtime.raycastBlockerList.includes(mesh)) runtime.raycastBlockerList.push(mesh);
  return mesh;
}

function isGameplayVisible() {
  return G.state === 'playing' || G.state === 'cleared' || G.state === 'trainArriving' || G.state === 'trainOpen';
}

function canPlayerControl() {
  return player.alive && (G.state === 'playing' || G.state === 'cleared' || G.state === 'trainArriving' || G.state === 'trainOpen');
}

function isWaveActive() {
  return G.wave.active;
}

/* --------------------------------------------------------------------------
   Screen helpers
   -------------------------------------------------------------------------- */

function showScreen(el) {
  if (!el) return;
  el.classList.remove('ui-hidden');
}

function hideScreen(el) {
  if (!el) return;
  el.classList.add('ui-hidden');
}

function setAccent(theme) {
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--accent-rgb', theme.accentRGB);
  setText(dom.lineNumber, theme.line);
  setText(dom.mapLine, `LINE ${theme.line}`);
}

async function fade(show, { label = '', detail = '', duration = 650, hold = 0, instant = false } = {}) {
  const overlay = dom.fadeOverlay;
  if (instant) {
    overlay.classList.toggle('instant', true);
    overlay.classList.toggle('show', show);
    // Force style flush before re-enabling transitions.
    void overlay.offsetWidth;
    overlay.classList.toggle('instant', false);
  } else {
    if (label) setText(dom.fadeLabel, label);
    if (detail) setText(dom.fadeDetail, detail);
    overlay.classList.toggle('show', show);
  }
  if (show) {
    G.flow.fadeBusy = true;
    await sleep(duration + hold);
  } else {
    await sleep(duration);
    G.flow.fadeBusy = false;
  }
}

function showHitmarker(headshot = false, kill = false) {
  const el = dom.hitmarker;
  el.classList.remove('hit', 'headshot', 'kill');
  void el.offsetWidth;
  el.classList.add('hit');
  if (headshot) el.classList.add('headshot');
  if (kill) el.classList.add('kill');
  G.ui.hitmarkerTimer = kill ? 0.35 : 0.22;
}

function flashDamage(strength = 1) {
  dom.damageFlash.style.opacity = String(clamp(strength, 0, 1));
  setTimeout(() => {
    dom.damageFlash.style.opacity = '0';
  }, 70);
}

function showDamageDirection(angle) {
  const normalized = ((angle % TAU) + TAU) % TAU;
  const index = Math.round(normalized / (Math.PI / 2)) % 4;
  const el = dom.damageIndicators[index];
  if (!el) return;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  G.ui.damageDirTimers[index] = 0.65;
}

function showObjectiveToast(title, copy, kicker = 'PRIORITY TRANSMISSION', duration = 5200) {
  setText($('.toast-kicker', dom.objectiveToast), kicker);
  setText(dom.toastTitle, title);
  setText(dom.toastCopy, copy);
  dom.objectiveToast.classList.add('show');
  clearTimeout(G.ui.toastTimer);
  G.ui.toastTimer = setTimeout(() => dom.objectiveToast.classList.remove('show'), duration);
}

function showCenterMessage(kicker, main, duration = 2600) {
  setText(dom.centerKicker, kicker);
  setText(dom.centerMain, main);
  dom.centerMessage.classList.add('show');
  clearTimeout(G.ui.centerTimer);
  G.ui.centerTimer = setTimeout(() => dom.centerMessage.classList.remove('show'), duration);
}

function showPickupNote(text) {
  setText(dom.pickupNote, text);
  dom.pickupNote.classList.add('show');
  clearTimeout(G.ui.pickupTimer);
  G.ui.pickupTimer = setTimeout(() => dom.pickupNote.classList.remove('show'), 1700);
}

function addKillFeed(enemyName, headshot = false) {
  const item = document.createElement('div');
  item.className = `feed-item${headshot ? ' headshot' : ''}`;
  item.innerHTML = `<span>${headshot ? '<em>HEADSHOT</em>' : 'ELIMINATED'}</span><span class="feed-rule"></span><b>${enemyName}</b>`;
  dom.killFeed.prepend(item);
  setTimeout(() => item.remove(), 4900);
  while (dom.killFeed.children.length > 5) dom.killFeed.lastElementChild.remove();
}

function setInteraction(textSmall, text) {
  if (!dom.interactPrompt) return;
  setText(dom.interactSmall, textSmall);
  setText(dom.interactCopy, text);
  dom.interactPrompt.classList.add('show');
  G.ui.promptShown = true;
}

function clearInteraction() {
  dom.interactPrompt.classList.remove('show');
  G.ui.promptShown = false;
  runtime.interactTarget = null;
}

function setReloadIndicator(show, progress = 0) {
  dom.reloadIndicator.classList.toggle('show', show);
  dom.reloadFill.style.width = `${clamp(progress, 0, 1) * 100}%`;
  dom.hud.classList.toggle('is-reloading', show);
}

function setCinematic(on) {
  dom.cinemaBars.classList.toggle('active', on);
  dom.hud.classList.toggle('ui-hidden', on);
  dom.rideHud.classList.toggle('show', !!on && G.state === 'riding');
}

function updateFadeCopy(label, detail) {
  if (label) setText(dom.fadeLabel, label);
  if (detail) setText(dom.fadeDetail, detail);
}
