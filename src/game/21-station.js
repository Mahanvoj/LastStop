/* ==========================================================================
   Subway station construction
   ========================================================================== */

const themeAssetCache = new Map();

function makeHazardTexture() {
  return makeCanvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#b68d35';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#121512';
    for (let x = -h; x < w + h; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + 20, 0);
      ctx.lineTo(x + 40, 0);
      ctx.lineTo(x + 20, h);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rand(0.05, 0.2)})`;
      ctx.fillRect(rand(0, w), rand(0, h), rand(1, 8), rand(1, 3));
    }
  }, { repeat: [1, 1], wrap: THREE.RepeatWrapping });
}

const HAZARD_TEXTURE = makeHazardTexture();

function makeLineMapTexture(theme) {
  return makeCanvasTexture(512, 760, (ctx, w, h) => {
    ctx.fillStyle = '#0c1212';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(230,235,218,.2)';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(26, 25, 46, 4);
    ctx.fillStyle = '#f0ead9';
    ctx.font = '700 44px "Barlow Condensed", sans-serif';
    ctx.fillText('NIGHT NETWORK', 26, 79);
    ctx.fillStyle = 'rgba(240,234,217,.45)';
    ctx.font = '600 17px "Rajdhani", sans-serif';
    ctx.fillText('LINE 13 / LOWER CITY LOOP', 27, 107);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(122, 168);
    ctx.lineTo(122, 275);
    ctx.lineTo(285, 340);
    ctx.lineTo(285, 487);
    ctx.lineTo(170, 552);
    ctx.lineTo(170, 684);
    ctx.stroke();
    const stops = [
      [122, 168, 'NORTHGATE'],
      [122, 275, 'CIVIC CENTER'],
      [285, 340, 'HARBOR HEIGHTS'],
      [285, 487, 'MERIDIAN'],
      [170, 552, 'ASH CROSS'],
      [170, 684, 'BLACKWATER'],
    ];
    for (const [x, y, name] of stops) {
      const isCurrent = name.includes(theme.name.split(' ')[0]);
      ctx.fillStyle = isCurrent ? theme.accent : '#0d1313';
      ctx.strokeStyle = isCurrent ? '#f4edda' : theme.accent;
      ctx.lineWidth = isCurrent ? 5 : 3;
      ctx.beginPath();
      ctx.arc(x, y, isCurrent ? 14 : 9, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isCurrent ? '#f5efde' : 'rgba(240,234,217,.66)';
      ctx.font = isCurrent ? '700 24px "Barlow Condensed", sans-serif' : '600 20px "Rajdhani", sans-serif';
      ctx.fillText(name, x + 26, y + 7);
      if (isCurrent) {
        ctx.fillStyle = theme.accent;
        ctx.font = '600 14px "Rajdhani", sans-serif';
        ctx.fillText('YOU ARE HERE', x + 26, y + 27);
      }
    }
    ctx.fillStyle = 'rgba(240,234,217,.4)';
    ctx.font = '600 16px "Rajdhani", sans-serif';
    ctx.fillText('INTERCHANGE', 316, 340);
    ctx.fillText('NIGHT TERMINAL', 316, 487);
    ctx.fillStyle = 'rgba(240,234,217,.2)';
    for (let i = 0; i < 8; i++) ctx.fillRect(26, 718 + i * 3, rand(40, 300), 1);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(26, 703, 44, 2);
    ctx.fillStyle = 'rgba(240,234,217,.5)';
    ctx.font = '15px monospace';
    ctx.fillText('MTA / EFFECTIVE 02:00-05:30', 150, 724);
  });
}

function makeVendingTexture(theme) {
  return makeCanvasTexture(360, 600, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a2724');
    grad.addColorStop(1, '#080d0c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#0b1110';
    ctx.fillRect(26, 30, w - 52, 126);
    ctx.fillStyle = theme.accent;
    ctx.font = '700 58px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SALT & IRON', w / 2, 88);
    ctx.fillStyle = 'rgba(240,234,217,.6)';
    ctx.font = '600 19px "Rajdhani", sans-serif';
    ctx.fillText('NIGHT SHIFT SUSTENANCE', w / 2, 121);
    ctx.strokeStyle = 'rgba(240,234,217,.17)';
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 174, w - 52, 330);
    const colors = [theme.accent, '#d7cdb6', '#7a3630', '#9cb66f'];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const x = 46 + col * 68;
        const y = 202 + row * 95;
        ctx.fillStyle = colors[(row + col) % colors.length];
        ctx.globalAlpha = 0.68;
        ctx.fillRect(x, y, 40, 63);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(8,10,9,.38)';
        ctx.fillRect(x + 9, y + 14, 22, 6);
        ctx.fillRect(x + 9, y + 31, 22, 3);
      }
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(28, 530, w - 56, 44);
    ctx.fillStyle = theme.accent;
    ctx.font = '600 18px "Rajdhani", sans-serif';
    ctx.fillText('TOUCH TO SELECT', 43, 558);
    ctx.fillStyle = 'rgba(240,234,217,.28)';
    ctx.font = '15px monospace';
    ctx.fillText('MTA-VEND / 13', 218, 558);
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rand(0.01, 0.04)})`;
      ctx.fillRect(rand(0, w), rand(0, h), rand(10, 80), 1);
    }
  });
}

function makeGraffitiTexture(theme) {
  return makeCanvasTexture(700, 300, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(36, 200);
    ctx.rotate(-0.08);
    ctx.globalAlpha = 0.46;
    ctx.strokeStyle = 'rgba(239,235,214,.75)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.font = 'italic 700 102px "Barlow Condensed", sans-serif';
    ctx.fillStyle = 'rgba(239,235,214,.15)';
    ctx.strokeText('NO EXIT', 10, 0);
    ctx.fillText('NO EXIT', 10, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(408, 231);
    ctx.rotate(0.11);
    ctx.globalAlpha = 0.33;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 7;
    ctx.font = 'italic 600 58px "Rajdhani", sans-serif';
    ctx.strokeText('the line owns us', 0, 0);
    ctx.restore();
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = `rgba(238,234,218,${rand(0.04, 0.18)})`;
      ctx.lineWidth = rand(1, 4);
      ctx.beginPath();
      ctx.moveTo(rand(0, w), rand(0, h));
      ctx.lineTo(rand(0, w), rand(0, h));
      ctx.stroke();
    }
    // Spray halo
    for (let i = 0; i < 140; i++) {
      const x = rand(80, 560);
      const y = rand(80, 250);
      ctx.fillStyle = `rgba(230,225,211,${rand(0.005, 0.035)})`;
      ctx.beginPath();
      ctx.arc(x, y, rand(0.5, 2.5), 0, TAU);
      ctx.fill();
    }
  });
}

function makeTrainStopDecal(theme) {
  return makeCanvasTexture(512, 340, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(256, 128, 86, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.font = '700 96px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('13', 256, 157);
    ctx.fillStyle = 'rgba(245,238,220,.86)';
    ctx.font = '700 45px "Barlow Condensed", sans-serif';
    ctx.fillText('BOARD HERE', 256, 250);
    ctx.fillStyle = 'rgba(245,238,220,.4)';
    ctx.font = '600 20px "Rajdhani", sans-serif';
    ctx.fillText('MIDDLE CAR / DOORS AT PLATFORM EDGE', 256, 285);
    ctx.restore();
  });
}

function makeServiceDoorTexture() {
  return makeCanvasTexture(512, 620, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#272e2c');
    g.addColorStop(0.45, '#171e1d');
    g.addColorStop(1, '#0b0f0e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(225,229,213,.12)';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = 'rgba(5,8,7,.52)';
    for (let y = 54; y < h - 36; y += 48) {
      ctx.fillRect(24, y, w - 48, 4);
    }
    ctx.fillStyle = 'rgba(225,229,213,.35)';
    ctx.font = '600 22px "Rajdhani", sans-serif';
    ctx.fillText('MTA / SERVICE ACCESS', 30, 36);
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(140, 225, 232, 134);
    ctx.strokeStyle = 'rgba(220,214,190,.22)';
    ctx.strokeRect(146, 231, 220, 122);
    ctx.fillStyle = 'rgba(225,220,200,.52)';
    ctx.font = '700 25px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AUTHORIZED', 256, 280);
    ctx.fillText('PERSONNEL ONLY', 256, 311);
    ctx.font = '600 15px "Rajdhani", sans-serif';
    ctx.fillStyle = 'rgba(225,220,200,.32)';
    ctx.fillText('SECTOR LOCK / 47-B', 256, 337);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(235,206,117,.65)';
    ctx.fillRect(38, h - 90, w - 76, 8);
    for (let x = 38; x < w - 38; x += 32) {
      ctx.fillStyle = 'rgba(9,12,11,.8)';
      ctx.beginPath();
      ctx.moveTo(x, h - 90);
      ctx.lineTo(x + 12, h - 90);
      ctx.lineTo(x + 2, h - 82);
      ctx.lineTo(x - 10, h - 82);
      ctx.fill();
    }
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${rand(0.01, 0.05)})`;
      ctx.beginPath();
      ctx.moveTo(rand(0, w), rand(0, h));
      ctx.lineTo(rand(0, w), rand(0, h));
      ctx.stroke();
    }
  });
}

function getThemeAssets(themeIndex) {
  const index = ((themeIndex % THEMES.length) + THEMES.length) % THEMES.length;
  if (themeAssetCache.has(index)) return themeAssetCache.get(index);
  const theme = THEMES[index];
  const wallTex = makeWallTileTexture(theme);
  wallTex.repeat.set(25, 1.15);
  const concreteTex = makeConcreteTexture(theme.upperWall, 1);
  concreteTex.repeat.set(8, 2);
  const darkConcreteTex = makeConcreteTexture('#171d1c', 1.3);
  darkConcreteTex.repeat.set(12, 3);
  const assets = {
    theme,
    floor: makeFloorTexture(theme),
    wall: wallTex,
    concrete: concreteTex,
    darkConcrete: darkConcreteTex,
    posters: [
      makePosterTexture(theme, index % 6),
      makePosterTexture(theme, (index + 2) % 6),
      makePosterTexture(theme, (index + 4) % 6),
      makePosterTexture(theme, (index + 1) % 6),
    ],
    mainSign: makeStationSignTexture(theme, 'main'),
    hangingSign: makeStationSignTexture(theme, 'hang'),
    lineMap: makeLineMapTexture(theme),
    wayfindingExit: makeWayfindingTexture(theme, 'EXIT', '↑', 'STREET LEVEL / ESCALATORS'),
    wayfindingTrains: makeWayfindingTexture(theme, 'ALL TRAINS', '→', 'PLATFORM EDGE'),
    tunnelSign: makeTunnelSignTexture(theme),
    trainLivery: makeTrainLiveryTexture(theme),
    vending: makeVendingTexture(theme),
    graffiti: makeGraffitiTexture(theme),
    stopDecal: makeTrainStopDecal(theme),
    lightPool: makeLightPoolTexture(theme.lightCss),
    serviceDoor: makeServiceDoorTexture(),
  };
  themeAssetCache.set(index, assets);
  return assets;
}

function makeSignPlane(tex, width, height, { basic = true, opacity = 1, transparent = false, side = THREE.FrontSide } = {}) {
  const material = basic
    ? new THREE.MeshBasicMaterial({ map: tex, transparent, opacity, side, depthWrite: !transparent, toneMapped: true })
    : new THREE.MeshStandardMaterial({ map: tex, transparent, opacity, side, roughness: 0.48, metalness: 0.16 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.frustumCulled = true;
  return mesh;
}

function buildStation({ centerZ = 0, themeIndex = 0, sector = 1 } = {}) {
  const theme = THEMES[((themeIndex % THEMES.length) + THEMES.length) % THEMES.length];
  const assets = getThemeAssets(themeIndex);
  const group = new THREE.Group();
  group.name = `station-${theme.code}-${centerZ}`;
  group.position.z = centerZ;
  runtime.worldRoot.add(group);

  const station = {
    group,
    centerZ,
    sector,
    theme,
    themeIndex,
    assets,
    pointLights: [],
    glowSprites: [],
    flickers: [],
    hostiles: [],
    colliders: [],
    blockers: [],
    spawnPoints: [
      { x: -2.2, z: -38.4 },
      { x: 4.1, z: -37.6 },
      { x: -1.2, z: 38.1 },
      { x: 4.7, z: 37.4 },
      { x: 1.6, z: -32.5 },
      { x: 5.2, z: 31.4 },
    ],
    trainMarker: null,
    arrivalLamps: [],
    wetFloor: null,
    disposed: false,
  };

  const add = (mesh, { blocker = false } = {}) => {
    // Meshes may already belong to a sub-group (a bench, a column, etc.).
    // Only attach root-level objects to the station group.
    if (!mesh.parent) group.add(mesh);
    if (blocker) station.blockers.push(mesh);
    return mesh;
  };

  const mats = {
    wallTile: new THREE.MeshStandardMaterial({
      map: assets.wall,
      color: 0xd6d2c8,
      roughness: 0.67,
      metalness: 0.15,
      envMapIntensity: 0.38,
    }),
    concrete: new THREE.MeshStandardMaterial({
      map: assets.concrete,
      color: 0x9fa29b,
      roughness: 0.86,
      metalness: 0.04,
      envMapIntensity: 0.24,
    }),
    darkConcrete: new THREE.MeshStandardMaterial({
      map: assets.darkConcrete,
      color: 0x838781,
      roughness: 0.9,
      metalness: 0.03,
      envMapIntensity: 0.2,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0x202829,
      metalness: 0.82,
      roughness: 0.33,
      envMapIntensity: 0.85,
    }),
    darkSteel: new THREE.MeshStandardMaterial({
      color: 0x0c1111,
      metalness: 0.72,
      roughness: 0.46,
      envMapIntensity: 0.55,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0x796140,
      metalness: 0.72,
      roughness: 0.32,
      envMapIntensity: 0.75,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: 0x463321,
      roughness: 0.62,
      metalness: 0.08,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x0c0f0e,
      roughness: 0.9,
      metalness: 0.02,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: theme.accentHex,
      emissive: theme.accentHex,
      emissiveIntensity: 0.85,
      roughness: 0.37,
      metalness: 0.24,
    }),
    lightTube: new THREE.MeshStandardMaterial({
      color: 0xf9f1dc,
      emissive: new THREE.Color(theme.light),
      emissiveIntensity: 1.7,
      roughness: 0.2,
      metalness: 0,
      toneMapped: true,
    }),
    rail: new THREE.MeshStandardMaterial({
      color: 0x5b6563,
      metalness: 0.93,
      roughness: 0.24,
      envMapIntensity: 1.1,
    }),
    sleeper: new THREE.MeshStandardMaterial({
      color: 0x29231b,
      roughness: 0.86,
      metalness: 0.03,
    }),
    hazard: new THREE.MeshStandardMaterial({
      map: HAZARD_TEXTURE,
      color: 0xe4c263,
      roughness: 0.56,
      metalness: 0.22,
    }),
    tactile: new THREE.MeshStandardMaterial({
      map: (() => {
        const tex = makeTactileTexture();
        tex.repeat.set(1, 45);
        return tex;
      })(),
      color: 0xe1bd61,
      roughness: 0.64,
      metalness: 0.22,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x9fb9b5,
      transparent: true,
      opacity: 0.18,
      roughness: 0.08,
      metalness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.4,
    }),
    black: new THREE.MeshStandardMaterial({ color: 0x060909, roughness: 0.52, metalness: 0.2 }),
    posterFrame: new THREE.MeshStandardMaterial({ color: 0x111817, metalness: 0.74, roughness: 0.3 }),
  };
  station.materials = mats;

  /* ---------------------------------------------------------------- floor */
  const wetFloor = new WetFloor(
    WORLD.wallX - WORLD.platformEdgeX,
    WORLD.stationHalfLength * 2,
    theme,
    assets.floor
  );
  wetFloor.position.set((WORLD.wallX + WORLD.platformEdgeX) / 2, 0.018, 0);
  wetFloor.receiveShadow = false;
  add(wetFloor);
  station.wetFloor = wetFloor;
  station.blockers.push(wetFloor);

  // Platform slab and edge.
  add(makeBox(WORLD.wallX - WORLD.platformEdgeX, 1.2, 92, mats.darkConcrete,
    (WORLD.wallX + WORLD.platformEdgeX) / 2, -0.62, 0), { blocker: true });
  add(makeBox(0.22, 1.42, 92, mats.darkConcrete, WORLD.platformEdgeX - 0.06, -0.71, 0));

  // Tactile warning strip, the only warm thing at the edge.
  const tactile = makePlane(0.54, 92, mats.tactile, WORLD.platformEdgeX + 0.32, 0.034, 0);
  tactile.rotation.x = -Math.PI / 2;
  tactile.rotation.z = Math.PI / 2;
  add(tactile);
  add(makeBox(0.075, 0.02, 92, mats.brass, WORLD.platformEdgeX + 0.63, 0.045, 0));
  add(makeBox(0.11, 0.06, 92, mats.steel, WORLD.platformEdgeX - 0.02, 0.028, 0));

  // Painted stop point.
  const stopMaterial = new THREE.MeshBasicMaterial({
    map: assets.stopDecal,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    toneMapped: true,
  });
  const stopDecal = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1.3), stopMaterial);
  stopDecal.rotation.x = -Math.PI / 2;
  stopDecal.position.set(-4.15, 0.055, 0.55);
  stopDecal.renderOrder = 2;
  add(stopDecal);
  station.stopDecal = stopDecal;

  const markerMat = new THREE.MeshBasicMaterial({
    color: theme.accentHex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const marker = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.2), markerMat);
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(-4.5, 0.061, 0.5);
  marker.renderOrder = 3;
  add(marker);
  station.trainMarker = marker;

  /* --------------------------------------------------------------- walls */
  const wallLength = 92;
  const wallHeight = WORLD.ceilingY;
  // Right-hand platform wall.
  add(makeBox(0.5, wallHeight, wallLength, mats.concrete, WORLD.wallX + 0.18, wallHeight / 2, 0), { blocker: true });
  const rightTiles = makePlane(wallLength, 2.6, mats.wallTile, WORLD.wallX - 0.085, 1.3, 0);
  rightTiles.rotation.y = -Math.PI / 2;
  add(rightTiles);
  const rightUpper = makePlane(wallLength, 2.85, mats.concrete, WORLD.wallX - 0.085, 4.02, 0);
  rightUpper.rotation.y = -Math.PI / 2;
  add(rightUpper);
  add(makeBox(0.16, 0.11, wallLength, mats.steel, WORLD.wallX - 0.13, 2.58, 0));
  add(makeBox(0.09, 0.035, wallLength, mats.accent, WORLD.wallX - 0.15, 2.65, 0));

  // Opposite track wall.
  add(makeBox(0.6, wallHeight, wallLength, mats.darkConcrete, WORLD.oppositeWallX - 0.3, wallHeight / 2, 0), { blocker: true });
  const leftTiles = makePlane(wallLength, 2.7, mats.wallTile, WORLD.oppositeWallX + 0.02, 1.35, 0);
  leftTiles.rotation.y = Math.PI / 2;
  add(leftTiles);
  const leftUpper = makePlane(wallLength, 2.75, mats.darkConcrete, WORLD.oppositeWallX + 0.02, 4.07, 0);
  leftUpper.rotation.y = Math.PI / 2;
  add(leftUpper);
  add(makeBox(0.14, 0.09, wallLength, mats.steel, WORLD.oppositeWallX + 0.06, 2.65, 0));

  // End walls closing the passenger platform, leaving the track mouth open.
  for (const s of [-1, 1]) {
    const wall = makeBox(12.6, wallHeight, 0.48, mats.concrete, 0.95, wallHeight / 2, s * 45.95);
    add(wall, { blocker: true });
    // Damp band at floor level.
    add(makeBox(12.6, 0.18, 0.04, mats.steel, 0.95, 0.08, s * 45.7));
    const gateGroup = new THREE.Group();
    gateGroup.position.set(1.85, 0, s * 45.66);
    gateGroup.rotation.y = s > 0 ? Math.PI : 0;
    const doorMat = new THREE.MeshStandardMaterial({
      map: assets.serviceDoor,
      color: 0xb5b2a4,
      roughness: 0.64,
      metalness: 0.4,
      envMapIntensity: 0.4,
    });
    const door = makeBox(3.7, 3.0, 0.08, doorMat, 0, 1.5, 0);
    gateGroup.add(door);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0x5d1e17,
      emissive: 0xff3c24,
      emissiveIntensity: 0.7,
      roughness: 0.4,
    });
    const lamp = makeBox(0.5, 0.12, 0.12, lampMat, 0, 3.27, 0.12);
    gateGroup.add(lamp);
    const lampGlow = makeGlowSprite(0xff4f30, 0.26, 1.2);
    lampGlow.position.set(0, 3.27, 0.28);
    gateGroup.add(lampGlow);
    station.hostiles.push({ material: lampMat, glow: lampGlow.material, base: 0.7 });
    add(gateGroup);
    // A weathered yellow guide line to the gate.
    const paint = new THREE.MeshBasicMaterial({ color: 0xb69440, transparent: true, opacity: 0.32, depthWrite: false });
    const line = makePlane(3.3, 0.025, paint, 1.85, 0.049, s * 43.6);
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = Math.PI / 2;
    add(line);
  }

  /* -------------------------------------------------------------- ceiling */
  add(makeBox(19.65, 0.4, 92, mats.darkConcrete, -2.35, WORLD.ceilingY + 0.15, 0), { blocker: true });
  for (let z = -42; z <= 42; z += 12) {
    add(makeBox(19.6, 0.25, 0.35, mats.steel, -2.35, WORLD.ceilingY - 0.12, z));
  }
  // Pipe runs above the platform.
  for (let i = 0; i < 3; i++) {
    const pipe = makeCylinder(0.055, 0.055, 88, 7, i === 1 ? mats.brass : mats.darkSteel, 5.55 + i * 0.23, WORLD.ceilingY - 0.33 - i * 0.08, 0);
    pipe.rotation.x = Math.PI / 2;
    add(pipe);
  }
  // Cable tray and duct across track side.
  const tray = makeBox(0.44, 0.11, 86, mats.darkSteel, -5.85, WORLD.ceilingY - 0.58, 0);
  add(tray);
  for (let z = -40; z <= 40; z += 8) {
    add(makeBox(0.12, 0.65, 0.12, mats.steel, 5.4, WORLD.ceilingY - 0.6, z));
  }

  /* --------------------------------------------------------------- lights */
  const fixtureZ = [-36, -24, -12, 0, 12, 24, 36];
  const fixtureGlowMaterial = new THREE.SpriteMaterial({
    map: SOFT_GLOW_TEXTURE,
    color: theme.light,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const coneMaterial = new THREE.MeshBasicMaterial({
    color: theme.light,
    transparent: true,
    opacity: 0.024,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  fixtureZ.forEach((z, i) => {
    add(makeBox(0.16, 0.08, 2.5, mats.steel, 2.45, WORLD.ceilingY - 0.12, z));
    const tube = makeBox(0.12, 0.055, 2.28, mats.lightTube, 2.45, WORLD.ceilingY - 0.17, z);
    add(tube);
    add(makeBox(0.02, 0.13, 0.02, mats.steel, 2.45, WORLD.ceilingY - 0.06, z - 0.9));
    add(makeBox(0.02, 0.13, 0.02, mats.steel, 2.45, WORLD.ceilingY - 0.06, z + 0.9));
    const glow = new THREE.Sprite(fixtureGlowMaterial.clone());
    glow.position.set(2.45, WORLD.ceilingY - 0.28, z);
    glow.scale.set(3.8, 1.1, 1);
    add(glow);
    station.glowSprites.push(glow);
    if (i % 2 === 0) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 2.25, 4.65, 16, 1, true), coneMaterial);
      cone.position.set(2.45, 2.7, z);
      add(cone);
    }
    if (i % 2 === 0 && i > 0 && i < 6) {
      const poolMat = new THREE.MeshBasicMaterial({
        map: assets.lightPool,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 8.5), poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(0.9, 0.066, z + 2);
      pool.renderOrder = 2;
      add(pool);
    }
  });

  // Actual illumination: fewer, stronger lights than fixtures.
  for (const z of [-31, -10, 12, 33]) {
    const light = new THREE.PointLight(theme.light, 2.25, 22, 1.7);
    light.position.set(2.0, 4.35, z);
    group.add(light);
    station.pointLights.push(light);
  }
  const fillLight = new THREE.PointLight(theme.trackLight, 1.1, 17, 1.8);
  fillLight.position.set(-10.8, 3.0, 8);
  group.add(fillLight);
  station.pointLights.push(fillLight);
  // One practical over the boarding point.
  const boardingLight = new THREE.PointLight(theme.light, 1.7, 13, 1.7);
  boardingLight.position.set(-2.6, 3.5, 0);
  group.add(boardingLight);
  station.pointLights.push(boardingLight);

  // Sparse tunnel service lights within the station shoulders.
  const shoulderZ = [-73, 73];
  for (const zBase of shoulderZ) {
    for (let i = 0; i < 4; i++) {
      const z = zBase + (zBase < 0 ? 1 : -1) * (i * 13 - 20);
      const lampMat = new THREE.MeshStandardMaterial({
        color: 0x1a201f,
        emissive: theme.light,
        emissiveIntensity: 0.65,
        roughness: 0.36,
      });
      add(makeBox(0.18, 0.18, 0.65, lampMat, -5.08, 3.7, z));
      const glow = makeGlowSprite(theme.light, 0.15, 1.5);
      glow.position.set(-5.0, 3.7, z);
      add(glow);
      if (i === 2) {
        const pl = new THREE.PointLight(theme.light, 0.65, 9, 2);
        pl.position.set(-6.4, 3.4, z);
        group.add(pl);
      }
    }
  }

  /* -------------------------------------------------------------- columns */
  const columnZ = [-33, -13, 13, 33];
  for (const z of columnZ) {
    const col = new THREE.Group();
    col.position.set(4.05, 0, z);
    add(makeBox(0.72, 0.22, 0.72, mats.steel, 0, 0.11, 0, col));
    const shaft = makeBox(0.54, 4.7, 0.54, mats.concrete, 0, 2.56, 0, col);
    shaft.material = mats.concrete;
    add(shaft);
    add(makeBox(0.7, 0.16, 0.7, mats.steel, 0, 4.94, 0, col));
    add(makeBox(0.57, 0.055, 0.57, mats.accent, 0, 1.18, 0, col));
    const colGlow = makeBox(0.59, 0.012, 0.59, mats.accent, 0, 1.24, 0, col);
    col.add(colGlow);
    add(col);
    station.colliders.push({ minX: 3.55, maxX: 4.55, minZ: centerZ + z - 0.5, maxZ: centerZ + z + 0.5 });
    // A small number placard on the center-facing side.
    if (z === 13) {
      const num = makeSignPlane(makeCanvasTexture(128, 128, (ctx) => {
        ctx.fillStyle = '#0b0f0e';
        ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, 120, 120);
        ctx.fillStyle = theme.accent;
        ctx.font = '700 64px "Barlow Condensed", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('13', 64, 88);
      }), 0.38, 0.38);
      num.position.set(3.74, 2.15, z);
      num.rotation.y = -Math.PI / 2;
      add(num);
    }
  }

  /* --------------------------------------------------------------- props */
  const benchZ = [-27, 7, 28];
  for (const z of benchZ) {
    const bench = new THREE.Group();
    bench.position.set(6.2, 0, z);
    // Seat slats run the length of the bench.
    for (let i = 0; i < 3; i++) {
      add(makeBox(0.16, 0.045, 3.8, mats.wood, -0.22 + i * 0.22, 0.47, 0, bench));
    }
    // Backrest, slightly reclined.
    const back = makeBox(0.11, 0.75, 3.8, mats.wood, 0.35, 0.86, 0, bench);
    back.rotation.z = -0.09;
    add(back);
    for (const zz of [-1.7, 1.7]) {
      add(makeBox(0.6, 0.08, 0.09, mats.steel, 0, 0.42, zz, bench));
      add(makeBox(0.06, 0.55, 0.08, mats.steel, -0.23, 0.17, zz, bench));
      add(makeBox(0.06, 0.55, 0.08, mats.steel, 0.25, 0.17, zz, bench));
    }
    add(bench);
    station.colliders.push({ minX: 5.55, maxX: 6.75, minZ: centerZ + z - 2.05, maxZ: centerZ + z + 2.05 });
  }

  // Vending machine.
  const vending = new THREE.Group();
  vending.position.set(6.65, 0, 18.2);
  add(makeBox(1.08, 2.35, 1.6, mats.darkSteel, 0, 1.18, 0, vending));
  const vendFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.28, 2.12),
    new THREE.MeshBasicMaterial({ map: assets.vending, toneMapped: true })
  );
  vendFace.rotation.y = -Math.PI / 2;
  vendFace.position.set(-0.56, 1.17, 0);
  vending.add(vendFace);
  const vendGlow = makePlane(1.42, 2.28, new THREE.MeshBasicMaterial({
    map: assets.vending, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false,
  }), -0.62, 1.17, 0, vending);
  vendGlow.rotation.y = -Math.PI / 2;
  add(vending);
  station.colliders.push({ minX: 5.6, maxX: 7.2, minZ: centerZ + 17.1, maxZ: centerZ + 19.3 });

  // Trash cans, cones and boxes.
  for (const [x, z] of [[5.62, -35], [5.55, 24], [-3.8, -12.5]]) {
    const bin = new THREE.Group();
    bin.position.set(x, 0, z);
    add(makeCylinder(0.27, 0.24, 0.75, 12, mats.steel, 0, 0.375, 0, bin));
    add(makeCylinder(0.3, 0.3, 0.07, 12, mats.brass, 0, 0.77, 0, bin));
    add(makeCylinder(0.19, 0.19, 0.03, 12, mats.black, 0, 0.81, 0, bin));
    add(bin);
    station.colliders.push({ minX: x - 0.34, maxX: x + 0.34, minZ: centerZ + z - 0.34, maxZ: centerZ + z + 0.34 });
  }

  const crateGroup = new THREE.Group();
  crateGroup.position.set(5.2, 0, -19.5);
  add(makeBox(1.15, 0.9, 1.0, mats.wood, 0, 0.45, 0, crateGroup));
  add(makeBox(0.8, 0.7, 0.9, mats.wood, 0.15, 1.22, -0.04, crateGroup));
  add(makeBox(0.12, 0.05, 1.01, mats.steel, -0.4, 0.67, 0, crateGroup));
  add(makeBox(0.12, 0.05, 1.01, mats.steel, 0.4, 0.67, 0, crateGroup));
  add(crateGroup);
  station.colliders.push({ minX: 4.5, maxX: 5.9, minZ: centerZ - 20.1, maxZ: centerZ - 18.8 });

  // A wide maintenance barrier adds cover near the south end.
  const barrier = new THREE.Group();
  barrier.position.set(-2.5, 0, 25);
  for (let i = 0; i < 4; i++) {
    add(makeBox(0.08, 0.92, 0.5, mats.steel, -1.75 + i * 1.2, 0.54, 0, barrier));
  }
  add(makeBox(3.8, 0.16, 0.1, mats.hazard, 0, 0.97, 0, barrier));
  add(makeBox(3.8, 0.16, 0.1, mats.hazard, 0, 0.5, 0, barrier));
  add(barrier);
  station.colliders.push({ minX: -4.4, maxX: -0.6, minZ: centerZ + 24.72, maxZ: centerZ + 25.28 });

  /* ----------------------------------------------------------- wall decor */
  // Main illuminated station name.
  const mainSignGroup = new THREE.Group();
  mainSignGroup.position.set(WORLD.wallX - 0.11, 3.55, 0);
  mainSignGroup.rotation.y = -Math.PI / 2;
  const mainSign = makeSignPlane(assets.mainSign, 5.65, 1.41);
  mainSignGroup.add(mainSign);
  const mainFrame = makeBox(5.85, 1.61, 0.1, mats.posterFrame, 0, 0, -0.055);
  mainSignGroup.add(mainFrame);
  const signWash = makePlane(7.2, 2.6, new THREE.MeshBasicMaterial({
    map: SOFT_GLOW_TEXTURE,
    color: theme.accent,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), 0, 0, -0.09);
  mainSignGroup.add(signWash);
  add(mainSignGroup);

  // Hanging platform signs facing both ways.
  for (const signZ of [24.5, -15.5]) {
    const holder = new THREE.Group();
    holder.position.set(1.3, 0, signZ);
    const hangY = 3.85;
    for (const xx of [-1.6, 1.6]) {
      const rod = makeCylinder(0.018, 0.018, 1.5, 6, mats.steel, xx, 4.8, 0, holder);
      holder.add(rod);
    }
    const signBody = makeBox(4.35, 1.08, 0.1, mats.posterFrame, 0, hangY, 0);
    holder.add(signBody);
    const front = makeSignPlane(assets.hangingSign, 4.25, 1.0);
    front.position.set(0, hangY, 0.055);
    holder.add(front);
    const back = makeSignPlane(assets.hangingSign, 4.25, 1.0);
    back.position.set(0, hangY, -0.055);
    back.rotation.y = Math.PI;
    holder.add(back);
    add(holder);
  }

  // Poster frames: platform wall.
  const posterSpots = [
    { x: WORLD.wallX - 0.105, z: -31, w: 2.7, h: 3.9, idx: 0, side: 1 },
    { x: WORLD.wallX - 0.105, z: -6.15, w: 2.25, h: 3.3, idx: 1, side: 1 },
    { x: WORLD.wallX - 0.105, z: 35.2, w: 2.55, h: 3.7, idx: 2, side: 1 },
  ];
  for (const spot of posterSpots) {
    const poster = makeSignPlane(assets.posters[spot.idx], spot.w, spot.h);
    poster.position.set(spot.x, 2.75, spot.z);
    poster.rotation.y = -Math.PI / 2;
    add(poster);
    const frame = makeBox(0.11, spot.h + 0.18, spot.w + 0.18, mats.posterFrame, spot.x + 0.07, 2.75, spot.z);
    add(frame);
    const glow = makePlane(spot.w + 0.5, spot.h + 0.55, new THREE.MeshBasicMaterial({
      map: SOFT_GLOW_TEXTURE, color: theme.accent, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }), spot.x - 0.04, 2.75, spot.z);
    glow.rotation.y = -Math.PI / 2;
    add(glow);
  }

  // Posters across the tracks, mostly seen above the train roof.
  for (let i = 0; i < 4; i++) {
    const z = -30 + i * 19;
    const poster = makeSignPlane(assets.posters[(i + 1) % assets.posters.length], 2.55, 3.7);
    poster.position.set(WORLD.oppositeWallX + 0.04, 2.8, z);
    poster.rotation.y = Math.PI / 2;
    add(poster);
    const frame = makeBox(0.1, 3.9, 2.75, mats.posterFrame, WORLD.oppositeWallX - 0.02, 2.8, z);
    add(frame);
    const glow = makePlane(2.9, 4.05, new THREE.MeshBasicMaterial({
      map: SOFT_GLOW_TEXTURE, color: theme.accent, transparent: true, opacity: 0.05,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }), WORLD.oppositeWallX + 0.045, 2.8, z);
    glow.rotation.y = Math.PI / 2;
    add(glow);
  }

  // Line map and wayfinding.
  const mapBoard = makeSignPlane(assets.lineMap, 2.0, 2.98);
  mapBoard.position.set(WORLD.wallX - 0.105, 2.9, 14);
  mapBoard.rotation.y = -Math.PI / 2;
  add(mapBoard);
  add(makeBox(0.1, 3.14, 2.16, mats.posterFrame, WORLD.wallX - 0.03, 2.9, 14));

  const exitSign = makeSignPlane(assets.wayfindingExit, 2.8, 0.98);
  exitSign.position.set(WORLD.wallX - 0.105, 2.65, 40);
  exitSign.rotation.y = -Math.PI / 2;
  add(exitSign);
  const trainSign = makeSignPlane(assets.wayfindingTrains, 2.8, 0.98);
  trainSign.position.set(WORLD.wallX - 0.105, 2.65, -39);
  trainSign.rotation.y = -Math.PI / 2;
  add(trainSign);

  // Arrival board with changing display.
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 512;
  boardCanvas.height = 180;
  const boardCtx = boardCanvas.getContext('2d');
  const arrivalTexture = new THREE.CanvasTexture(boardCanvas);
  arrivalTexture.colorSpace = THREE.SRGBColorSpace;
  function drawArrivalBoard(nextName, minutes) {
    boardCtx.fillStyle = '#06100d';
    boardCtx.fillRect(0, 0, 512, 180);
    boardCtx.strokeStyle = 'rgba(114,221,190,.35)';
    boardCtx.strokeRect(3, 3, 506, 174);
    boardCtx.fillStyle = theme.accent;
    boardCtx.font = '600 22px "Rajdhani", sans-serif';
    boardCtx.fillText('NEXT TRAIN', 24, 34);
    boardCtx.fillStyle = '#dcffe9';
    boardCtx.font = '700 44px "Barlow Condensed", sans-serif';
    boardCtx.fillText(nextName, 24, 80);
    boardCtx.fillStyle = 'rgba(172,236,211,.55)';
    boardCtx.font = '600 18px "Rajdhani", sans-serif';
    boardCtx.fillText('LINE 13 / MIDDLE CAR', 24, 110);
    boardCtx.fillStyle = theme.accent;
    boardCtx.font = '700 67px "Barlow Condensed", sans-serif';
    boardCtx.textAlign = 'right';
    boardCtx.fillText(minutes, 485, 92);
    boardCtx.textAlign = 'left';
    boardCtx.fillStyle = 'rgba(172,236,211,.28)';
    boardCtx.font = '15px monospace';
    boardCtx.fillText('MTA / LIVE ARRIVALS', 24, 154);
    arrivalTexture.needsUpdate = true;
  }
  drawArrivalBoard(theme.name, '02:47');
  const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.84), new THREE.MeshBasicMaterial({
    map: arrivalTexture,
    transparent: false,
    toneMapped: true,
  }));
  boardMesh.position.set(WORLD.wallX - 0.12, 3.55, 8.0);
  boardMesh.rotation.y = -Math.PI / 2;
  add(boardMesh);
  add(makeBox(0.1, 0.98, 2.56, mats.posterFrame, WORLD.wallX - 0.02, 3.55, 8.0));
  station.arrivalBoard = { canvas: boardCanvas, ctx: boardCtx, texture: arrivalTexture, draw: drawArrivalBoard };

  // Wall clock.
  const clockTexture = makeCanvasTexture(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#0b100f';
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(231,225,204,.65)';
    ctx.lineWidth = 6;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * TAU;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(231,225,204,.9)' : 'rgba(231,225,204,.38)';
      ctx.lineWidth = i % 3 === 0 ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(angle) * 90, 128 + Math.sin(angle) * 90);
      ctx.lineTo(128 + Math.cos(angle) * 102, 128 + Math.sin(angle) * 102);
      ctx.stroke();
    }
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.cos(-1.1) * 50, 128 + Math.sin(-1.1) * 50);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(240,234,218,.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.cos(-2.1) * 74, 128 + Math.sin(-2.1) * 74);
    ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(128, 128, 8, 0, TAU);
    ctx.fill();
  });
  const clock = makeSignPlane(clockTexture, 0.72, 0.72);
  clock.position.set(WORLD.wallX - 0.105, 3.7, 20.3);
  clock.rotation.y = -Math.PI / 2;
  add(clock);

  // A little graffiti on the end wall and below the adverts.
  const graffiti = makeSignPlane(assets.graffiti, 4.4, 1.88, { transparent: true, opacity: 0.68, side: THREE.DoubleSide });
  graffiti.position.set(3.3, 1.45, -45.68);
  graffiti.rotation.y = 0;
  add(graffiti);

  // Track hazard sign on the platform edge.
  const hazardSignTex = makeCanvasTexture(512, 220, (ctx, w, h) => {
    ctx.fillStyle = '#0b0e0c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c8a045';
    ctx.fillRect(0, 0, w, 16);
    ctx.fillRect(0, h - 16, w, 16);
    ctx.fillStyle = '#efe3c2';
    ctx.font = '700 43px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DANGER — LIVE TRACK', w / 2, 90);
    ctx.fillStyle = 'rgba(239,227,194,.5)';
    ctx.font = '600 22px "Rajdhani", sans-serif';
    ctx.fillText('750V THIRD RAIL / KEEP CLEAR', w / 2, 129);
    ctx.fillStyle = '#d1a744';
    ctx.font = '700 27px "Rajdhani", sans-serif';
    ctx.fillText('MTA SAFETY', w / 2, 173);
  });
  const hazardSign = makeSignPlane(hazardSignTex, 1.5, 0.64);
  hazardSign.position.set(WORLD.platformEdgeX - 0.01, 1.55, -10);
  hazardSign.rotation.y = Math.PI / 2;
  add(hazardSign);

  /* --------------------------------------------------------------- track */
  add(makeBox(6.7, 0.3, 200, mats.darkConcrete, -8.65, -1.5, 0), { blocker: true });
  // Sleepers as a single instanced mesh.
  const sleeperGeo = new THREE.BoxGeometry(2.55, 0.12, 0.22);
  const sleepers = new THREE.InstancedMesh(sleeperGeo, mats.sleeper, 250);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 250; i++) {
    dummy.position.set(WORLD.trackX, -1.33, -100 + i * 0.8);
    dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  sleepers.instanceMatrix.needsUpdate = true;
  group.add(sleepers);
  for (const side of [-1, 1]) {
    const rail = makeBox(0.085, 0.14, 200, mats.rail, WORLD.trackX + side * 0.72, -1.18, 0);
    add(rail, { blocker: true });
    add(makeBox(0.11, 0.028, 200, mats.rail, WORLD.trackX + side * 0.72, -1.095, 0));
  }
  // Third rail with a protective cover.
  add(makeBox(0.14, 0.1, 200, mats.brass, WORLD.trackX - 1.55, -0.85, 0));
  add(makeBox(0.36, 0.06, 200, mats.wood, WORLD.trackX - 1.55, -0.72, 0));
  for (let i = -96; i <= 96; i += 8) {
    add(makeBox(0.5, 0.8, 0.08, mats.steel, WORLD.trackX - 1.55, -1.2, i));
  }

  // Painted line on the platform and scattered paper.
  for (let i = 0; i < 13; i++) {
    const paper = makePlane(rand(0.12, 0.3), rand(0.16, 0.4), new THREE.MeshBasicMaterial({
      color: chance(0.5) ? 0x9d998b : 0x6f6b60,
      transparent: true,
      opacity: rand(0.18, 0.42),
      side: THREE.DoubleSide,
      depthWrite: false,
    }), rand(-4.6, 6.1), 0.052, rand(-40, 40));
    paper.rotation.x = -Math.PI / 2;
    paper.rotation.z = rand(0, TAU);
    add(paper);
  }

  /* ----------------------------------------------------- tunnel shoulders */
  buildTunnelShoulders(station, mats, add);

  // Subtle point light to keep the station's shadowed foreground readable.
  const nearLight = new THREE.PointLight(theme.light, 0.8, 18, 1.9);
  nearLight.position.set(0.6, 2.8, 29);
  group.add(nearLight);
  station.pointLights.push(nearLight);

  // The tiles are the main readable normal-mapped-ish surface. Add faint dropout chest high.
  const wallGrimeTex = makeCanvasTexture(512, 128, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.62, 'rgba(5,9,7,.26)');
    grad.addColorStop(1, 'rgba(3,6,4,.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rand(0.03, 0.12)})`;
      ctx.beginPath();
      ctx.ellipse(rand(0, w), h - rand(0, 40), rand(8, 60), rand(5, 26), 0, 0, TAU);
      ctx.fill();
    }
  });
  const grime = makeSignPlane(wallGrimeTex, 90, 2.4, { transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  grime.position.set(WORLD.wallX - 0.095, 1.3, 0);
  grime.rotation.y = -Math.PI / 2;
  add(grime);

  return station;
}

function buildTunnelShoulders(station, mats, add) {
  const theme = station.theme;
  const group = station.group;
  for (const side of [-1, 1]) {
    const start = side * 46;
    const end = side * 100;
    const mid = (start + end) / 2;
    const length = Math.abs(end - start);
    // Walls, floor walkway, ceiling.
    add(makeBox(0.45, 6.1, length, mats.darkConcrete, WORLD.oppositeWallX - 0.2, 1.63, mid), { blocker: true });
    add(makeBox(0.35, 6.1, length, mats.darkConcrete, -4.75, 1.63, mid), { blocker: true });
    add(makeBox(7.45, 0.34, length, mats.darkConcrete, -8.35, 4.77, mid));
    const walkway = makeBox(0.9, 0.16, length, mats.darkConcrete, -5.05, -0.89, mid);
    add(walkway);
    const walkwayEdge = makeBox(0.1, 0.08, length, mats.brass, -4.62, -0.8, mid);
    add(walkwayEdge);
    // Concrete arch ribs.
    for (let i = 0; i < 5; i++) {
      const z = start + side * (i * (length / 5) + 5);
      add(makeBox(7.2, 0.22, 0.22, mats.steel, -8.35, 4.57, z));
      add(makeBox(0.24, 4.4, 0.24, mats.steel, -11.75, 2.15, z));
      add(makeBox(0.24, 4.4, 0.24, mats.steel, -4.95, 2.15, z));
    }
    // Hanging cables / pipes.
    for (let p = 0; p < 2; p++) {
      const pipe = makeCylinder(0.045, 0.045, length, 6, p === 0 ? mats.steel : mats.brass, -10.95 + p * 0.25, 4.18, mid);
      pipe.rotation.x = Math.PI / 2;
      add(pipe);
    }
    // Track-side lamps.
    for (let i = 0; i < 4; i++) {
      const z = start + side * (i * 13 + 8);
      const lampMat = new THREE.MeshStandardMaterial({
        color: 0x121817,
        emissive: theme.light,
        emissiveIntensity: 0.56,
        roughness: 0.4,
      });
      add(makeBox(0.12, 0.22, 0.5, lampMat, -4.93, 3.55, z));
      const glow = makeGlowSprite(theme.light, 0.12, 1.1);
      glow.position.set(-4.85, 3.55, z);
      add(glow);
    }
    // One maintenance sign deep in the tunnel.
    if (side === -1) {
      const sign = makeSignPlane(station.assets.tunnelSign, 2.1, 0.74);
      sign.position.set(-4.76, 2.35, mid + 6);
      sign.rotation.y = Math.PI / 2;
      add(sign);
    }
    // Loose cable on the wall.
    const cable = makeCylinder(0.03, 0.03, length - 4, 5, mats.black, -4.92, 2.85, mid);
    cable.rotation.x = Math.PI / 2;
    add(cable);
  }

  // Signal lights by both tunnel mouths.
  for (const side of [-1, 1]) {
    const signalGroup = new THREE.Group();
    signalGroup.position.set(-10.7, 1.5, side * 43.5);
    signalGroup.rotation.y = side * Math.PI / 2;
    add(makeBox(0.22, 1.65, 0.22, mats.steel, 0, 0, 0, signalGroup));
    const redMat = new THREE.MeshStandardMaterial({ color: 0x150a08, emissive: 0xff3c24, emissiveIntensity: 1.2, roughness: 0.3 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x08140c, emissive: 0x5cff9b, emissiveIntensity: 0.05, roughness: 0.3 });
    add(makeCylinder(0.13, 0.13, 0.09, 12, redMat, 0, 0.47, 0.14, signalGroup));
    add(makeCylinder(0.13, 0.13, 0.09, 12, greenMat, 0, 0.1, 0.14, signalGroup));
    const redGlow = makeGlowSprite(0xff3d22, 0.25, 1.2);
    redGlow.position.set(0, 0.47, 0.25);
    signalGroup.add(redGlow);
    const greenGlow = makeGlowSprite(0x5cff9b, 0.04, 1.0);
    greenGlow.position.set(0, 0.1, 0.25);
    signalGroup.add(greenGlow);
    add(signalGroup);
    station.arrivalLamps.push({ redMat, greenMat, redGlow: redGlow.material, greenGlow: greenGlow.material, side });
  }
}

function setStationArrivalMode(station, arriving = false) {
  if (!station) return;
  for (const light of station.arrivalLamps || []) {
    light.redMat.emissiveIntensity = arriving ? 0.1 : 1.2;
    light.greenMat.emissiveIntensity = arriving ? 1.7 : 0.05;
    light.redGlow.opacity = arriving ? 0.02 : 0.25;
    light.greenGlow.opacity = arriving ? 0.28 : 0.04;
  }
}

function updateArrivalBoard(station, text, minutes) {
  if (!station || !station.arrivalBoard) return;
  station.arrivalBoard.draw(text, minutes);
}

function updateStationEnvironment(station, dt, time) {
  if (!station) return;
  if (station.wetFloor) station.wetFloor.update(time);
  const flicker = Math.sin(time * 11.4) * Math.sin(time * 3.21) + Math.sin(time * 31.7) * 0.17;
  const dim = flicker < -0.78 ? 0.82 : 1;
  // Each station has a couple of lights that seem to have a bad ballast.
  station.pointLights.forEach((light, i) => {
    const target = i % 3 === 1 ? (0.85 + (dim - 0.82) * 0.7) : 1;
    light.intensity = light.userData.baseIntensity === undefined
      ? (light.userData.baseIntensity = light.intensity, light.intensity * target)
      : light.userData.baseIntensity * target;
  });

  for (const glow of station.glowSprites) {
    if (glow.material) glow.material.opacity = 0.22 + Math.sin(time * 1.1 + glow.position.z) * 0.025;
  }

  for (const light of station.hostiles) {
    const active = isWaveActive() || G.state === 'cleared';
    if (active) {
      const pulse = 0.55 + Math.sin(time * 3.1 + light.material.emissiveIntensity) * 0.35;
      light.material.emissiveIntensity = pulse;
      light.glow.opacity = 0.12 + pulse * 0.18;
    } else {
      light.material.emissiveIntensity = 0.5;
      light.glow.opacity = 0.14;
    }
  }

  for (const light of station.arrivalLamps || []) {
    const activeTrain = G.train.state === 'arriving' || G.train.state === 'open' || G.train.state === 'riding';
    if (activeTrain) {
      const pulse = 0.8 + Math.sin(time * 4.4) * 0.35;
      light.redMat.emissiveIntensity = 0.18;
      light.greenMat.emissiveIntensity = 1.5 + pulse;
      light.greenGlow.opacity = 0.18 + pulse * 0.18;
    }
  }

  if (station.trainMarker) {
    const trainOpen = G.train.state === 'open' && G.train.doors > 0.7;
    const target = trainOpen ? 0.09 + Math.sin(time * 2.4) * 0.025 : 0;
    station.trainMarker.material.opacity = damp(station.trainMarker.material.opacity, target, 4, dt);
  }

  if (station.stopDecal) {
    const near = player.position.distanceToSquared(new THREE.Vector3(station.centerZ ? -4.15 + 0 : -4.15, 0, station.centerZ + 0.55));
    // The decal is always faintly visible; proximity makes it a little brighter.
    const target = near < 30 ? 0.88 : 0.5;
    station.stopDecal.material.opacity = damp(station.stopDecal.material.opacity, target, 3, dt);
  }
}
