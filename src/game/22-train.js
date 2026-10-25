/* ==========================================================================
   Train — exterior, lit interior, sliding doors and destination boards
   ========================================================================== */

function makeTrainBrandTexture() {
  return makeCanvasTexture(1024, 320, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(243,237,220,.92)';
    ctx.font = '700 128px "Barlow Condensed", sans-serif';
    ctx.fillText('LINE 13', 34, 154);
    ctx.fillStyle = 'rgba(243,237,220,.46)';
    ctx.font = '600 34px "Rajdhani", sans-serif';
    ctx.fillText('NIGHT SERVICE / MTA', 39, 205);
    ctx.fillStyle = '#ffb554';
    ctx.fillRect(34, 234, 340, 8);
    ctx.fillStyle = 'rgba(243,237,220,.93)';
    ctx.beginPath();
    ctx.arc(862, 134, 92, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#151b18';
    ctx.font = '700 112px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('13', 862, 174);
    ctx.textAlign = 'left';
  });
}

function makeTrainWindowTexture() {
  return makeCanvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = 'rgba(8,12,14,.78)';
    ctx.fillRect(0, 0, 256, 256);
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(138,178,179,.10)');
    grad.addColorStop(0.5, 'rgba(5,8,9,.05)');
    grad.addColorStop(1, 'rgba(0,0,0,.21)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rand(0.012, 0.03)})`;
      ctx.fillRect(rand(0, 256), rand(0, 256), rand(40, 140), rand(1, 3));
    }
  });
}

function buildTrain() {
  const theme = THEMES[0];
  const group = new THREE.Group();
  group.name = 'line-13-train';
  group.position.set(WORLD.trackX, 0, 0);
  group.visible = false;
  runtime.worldRoot.add(group);

  const train = {
    group,
    doors: 0,
    doorTarget: 0,
    doorGroups: [],
    blockers: [],
    interiorLights: [],
    glows: [],
    headlights: [],
    spotlights: [],
    wheels: null,
    destinationTexture: null,
    destinationContext: null,
    doorGlow: null,
    rideCamLocal: new THREE.Vector3(0.38, 1.58, 2.5),
    lightPulse: 0,
    disposed: false,
  };

  const mats = {
    body: new THREE.MeshStandardMaterial({
      color: 0xc7c0ae,
      metalness: 0.48,
      roughness: 0.36,
      envMapIntensity: 0.82,
    }),
    bodyDark: new THREE.MeshStandardMaterial({
      color: 0x1a201e,
      metalness: 0.58,
      roughness: 0.42,
      envMapIntensity: 0.65,
    }),
    bodyAccent: new THREE.MeshStandardMaterial({
      color: 0xd39a49,
      metalness: 0.42,
      roughness: 0.38,
      envMapIntensity: 0.6,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0x89918c,
      metalness: 0.93,
      roughness: 0.24,
      envMapIntensity: 1.1,
    }),
    darkSteel: new THREE.MeshStandardMaterial({
      color: 0x111716,
      metalness: 0.82,
      roughness: 0.34,
      envMapIntensity: 0.75,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x090c0b,
      roughness: 0.92,
      metalness: 0.04,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x182423,
      transparent: true,
      opacity: 0.34,
      roughness: 0.07,
      metalness: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.7,
    }),
    doorGlass: new THREE.MeshStandardMaterial({
      color: 0x1a2827,
      transparent: true,
      opacity: 0.48,
      roughness: 0.09,
      metalness: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.3,
    }),
    interiorWall: new THREE.MeshStandardMaterial({
      color: 0x9f9b88,
      roughness: 0.55,
      metalness: 0.18,
      envMapIntensity: 0.4,
    }),
    interiorDark: new THREE.MeshStandardMaterial({
      color: 0x232a27,
      roughness: 0.62,
      metalness: 0.22,
    }),
    seat: new THREE.MeshStandardMaterial({
      color: 0x77401f,
      roughness: 0.7,
      metalness: 0.04,
      envMapIntensity: 0.25,
    }),
    seatBack: new THREE.MeshStandardMaterial({
      color: 0x5c2e18,
      roughness: 0.78,
      metalness: 0.03,
    }),
    floor: new THREE.MeshStandardMaterial({
      color: 0x131a18,
      roughness: 0.58,
      metalness: 0.25,
      envMapIntensity: 0.5,
    }),
    light: new THREE.MeshStandardMaterial({
      color: 0xfff3d1,
      emissive: 0xffdfa1,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0,
    }),
    headlight: new THREE.MeshStandardMaterial({
      color: 0xfff2d8,
      emissive: 0xffe2ab,
      emissiveIntensity: 3.5,
      roughness: 0.15,
      metalness: 0,
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: 0x5a0d08,
      emissive: 0xff2d16,
      emissiveIntensity: 2.2,
      roughness: 0.3,
    }),
    warning: new THREE.MeshStandardMaterial({
      color: 0xe0b24f,
      emissive: 0x7a4914,
      emissiveIntensity: 0.25,
      roughness: 0.5,
      metalness: 0.25,
    }),
  };
  train.materials = mats;

  const add = (mesh, blocker = false) => {
    group.add(mesh);
    if (blocker) train.blockers.push(mesh);
    return mesh;
  };

  const brandTexture = makeTrainBrandTexture();
  const windowTexture = makeTrainWindowTexture();
  const brandMat = new THREE.MeshBasicMaterial({
    map: brandTexture,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: true,
  });

  const carLength = 14.0;
  const carCenters = [-15, 0, 15];

  // A destination board on the leading cab.
  const destCanvas = document.createElement('canvas');
  destCanvas.width = 512;
  destCanvas.height = 128;
  const destCtx = destCanvas.getContext('2d');
  const destTexture = new THREE.CanvasTexture(destCanvas);
  destTexture.colorSpace = THREE.SRGBColorSpace;
  train.destinationTexture = destTexture;
  train.destinationContext = destCtx;
  drawTrainDestination(train, 'HARBOR HEIGHTS', '#ffb554');

  const destMat = new THREE.MeshBasicMaterial({ map: destTexture, toneMapped: true });

  carCenters.forEach((center, carIndex) => {
    const car = new THREE.Group();
    car.position.z = center;
    car.name = `car-${carIndex}`;
    group.add(car);

    // Main underframe and floor.
    car.add(makeBox(2.94, 0.16, 14.0, mats.floor, 0, 0.16, 0));
    car.add(makeBox(2.68, 0.34, 13.6, mats.darkSteel, 0, -0.13, 0));
    car.add(makeBox(2.4, 0.14, 13.4, mats.rubber, 0, 0.24, 0));

    // Roof shell with a subtle raised centre.
    car.add(makeBox(2.98, 0.16, 13.95, mats.body, 0, 3.02, 0));
    car.add(makeBox(2.38, 0.16, 13.3, mats.body, 0, 3.12, 0));
    car.add(makeBox(2.78, 0.22, 0.18, mats.bodyDark, 0, 3.02, -6.98));
    car.add(makeBox(2.78, 0.22, 0.18, mats.bodyDark, 0, 3.02, 6.98));
    // Roof equipment.
    for (let i = 0; i < 2; i++) {
      const unit = makeBox(1.2, 0.23, 2.1, mats.bodyDark, i === 0 ? -0.48 : 0.48, 3.26, -2.8 + i * 5.6);
      car.add(unit);
      car.add(makeBox(0.75, 0.035, 1.2, mats.steel, unit.position.x, 3.39, unit.position.z));
    }

    // High side fascia above windows.
    for (const side of [-1, 1]) {
      const fascia = makeBox(0.07, 0.48, 13.9, mats.body, side * 1.515, 2.66, 0);
      car.add(fascia);
      // Waistline panels either side of the doors.
      for (const sign of [-1, 1]) {
        const length = 5.9;
        const z = sign * 4.0;
        car.add(makeBox(0.075, 0.78, length, mats.body, side * 1.53, 0.66, z));
        car.add(makeBox(0.075, 0.035, length, mats.bodyAccent, side * 1.575, 1.08, z));
        // Dark sill.
        car.add(makeBox(0.08, 0.16, length, mats.bodyDark, side * 1.535, 0.21, z));
      }
      // Door surround.
      car.add(makeBox(0.09, 2.37, 0.12, mats.bodyDark, side * 1.55, 1.28, -1.0));
      car.add(makeBox(0.09, 2.37, 0.12, mats.bodyDark, side * 1.55, 1.28, 1.0));
      car.add(makeBox(0.09, 0.12, 2.08, mats.bodyDark, side * 1.55, 2.39, 0));
      // Window glass, left and right of the central door.
      for (const sign of [-1, 1]) {
        const zStart = sign * 1.25;
        const zEnd = sign * 6.75;
        const glass = makeBox(0.018, 1.25, Math.abs(zEnd - zStart), mats.glass, side * 1.525, 1.8, (zStart + zEnd) / 2);
        glass.renderOrder = 4;
        car.add(glass);
        // Window mullions.
        for (let z = sign * 1.75; Math.abs(z) < 6.7; z += sign * 1.2) {
          car.add(makeBox(0.095, 1.34, 0.075, mats.bodyDark, side * 1.54, 1.8, z));
        }
      }
      // Upper and lower window trim.
      car.add(makeBox(0.1, 0.08, 11.0, mats.bodyDark, side * 1.55, 2.43, 0));
      car.add(makeBox(0.1, 0.08, 11.0, mats.bodyDark, side * 1.55, 1.19, 0));
      // Brand decal.
      const brand = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.31), brandMat);
      brand.position.set(side * 1.573, 1.87, -4.7);
      brand.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.add(brand);
      // Lower skirt.
      car.add(makeBox(0.1, 0.42, 13.85, mats.bodyDark, side * 1.51, 0.2, 0));
    }

    // End caps.
    for (const sign of [-1, 1]) {
      const end = makeBox(2.7, 2.5, 0.08, mats.interiorDark, 0, 1.53, sign * 6.93);
      car.add(end);
      // Gangway door.
      car.add(makeBox(0.95, 2.05, 0.055, mats.darkSteel, 0, 1.3, sign * 6.88));
      car.add(makeBox(0.5, 0.33, 0.025, mats.glass, 0, 1.88, sign * 6.84));
      car.add(makeBox(0.44, 0.07, 0.04, mats.bodyAccent, 0, 2.35, sign * 6.8));
      if (sign === 1) {
        // Destination readout visible from the interior.
        const interiorDest = new THREE.Mesh(new THREE.PlaneGeometry(1.34, 0.33), destMat);
        interiorDest.position.set(0, 2.7, sign * 6.9);
        interiorDest.rotation.y = Math.PI;
        car.add(interiorDest);
      }
    }

    // Interior ceiling and light panels.
    car.add(makeBox(2.62, 0.055, 13.4, mats.interiorWall, 0, 2.9, 0));
    for (let i = 0; i < 5; i++) {
      const strip = makeBox(0.35, 0.026, 1.5, mats.light, 0, 2.84, -5.1 + i * 2.55);
      car.add(strip);
    }
    const interiorLight = new THREE.PointLight(0xffd8a0, carIndex === 1 ? 1.6 : 1.1, 6.8, 1.7);
    interiorLight.position.set(0, 2.58, 0);
    car.add(interiorLight);
    train.interiorLights.push(interiorLight);
    // Bare fluorescent glow softly reflected in the windows.
    const ceilingGlow = makeGlowSprite(0xffd69a, 0.15, 3.2);
    ceilingGlow.position.set(0, 2.75, 0);
    car.add(ceilingGlow);
    train.glows.push(ceilingGlow);

    // Long seats along both walls.
    for (const side of [-1, 1]) {
      for (const sign of [-1, 1]) {
        const zBase = sign * 3.55;
        // Bench support and seat cushions.
        car.add(makeBox(0.78, 0.1, 2.4, mats.seat, side * 1.0, 0.67, zBase));
        const back = makeBox(0.15, 0.74, 2.4, mats.seatBack, side * 1.32, 1.03, zBase);
        back.rotation.z = side * -0.08;
        car.add(back);
        car.add(makeBox(0.12, 0.55, 2.22, mats.darkSteel, side * 1.31, 0.42, zBase));
        car.add(makeBox(0.54, 0.13, 2.35, mats.darkSteel, side * 1.0, 0.34, zBase));
        car.add(makeBox(0.07, 0.52, 0.07, mats.steel, side * 1.34, 0.46, zBase - 1.09));
        car.add(makeBox(0.07, 0.52, 0.07, mats.steel, side * 1.34, 0.46, zBase + 1.09));
        // Individual seat seams.
        for (let s = -0.8; s <= 0.8; s += 0.8) {
          car.add(makeBox(0.08, 0.095, 0.025, mats.darkSteel, side * 1.0, 0.73, zBase + s));
        }
      }
    }

    // Grab poles and overhead rails.
    for (const side of [-1, 1]) {
      car.add(makeCylinder(0.032, 0.032, 2.68, 8, mats.steel, side * 1.18, 1.68, -0.98));
      car.add(makeCylinder(0.032, 0.032, 2.68, 8, mats.steel, side * 1.18, 1.68, 0.98));
      const rail = makeCylinder(0.025, 0.025, 9.8, 8, mats.steel, side * 0.68, 2.57, 0);
      rail.rotation.x = Math.PI / 2;
      car.add(rail);
    }
    // Yellow hand loops (simple geometry for readability).
    for (let i = 0; i < 4; i++) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 5, 9), mats.warning);
      loop.position.set(-0.68, 2.43, -3.2 + i * 2.1);
      loop.rotation.y = Math.PI / 2;
      car.add(loop);
      const loop2 = loop.clone();
      loop2.position.x = 0.68;
      car.add(loop2);
    }

    // Interior advertising strip above windows.
    const adTex = makeCanvasTexture(768, 96, (ctx, w, h) => {
      ctx.fillStyle = '#1d2724';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffbe6b';
      ctx.font = '700 48px "Barlow Condensed", sans-serif';
      ctx.fillText('YOU ARE ON THE NIGHT LINE', 28, 62);
      ctx.fillStyle = 'rgba(239,234,217,.46)';
      ctx.font = '600 17px "Rajdhani", sans-serif';
      ctx.fillText('MTA / 13 / KEEP YOUR BELONGINGS CLOSE', 466, 57);
    });
    const adMat = new THREE.MeshBasicMaterial({ map: adTex, toneMapped: true, color: 0xcdc9b8 });
    for (const side of [-1, 1]) {
      const ad = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.32), adMat);
      ad.position.set(side * 1.46, 2.52, 3.8);
      ad.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      car.add(ad);
    }

    // Exterior side doors, both sides.
    for (const side of [-1, 1]) {
      for (const leaf of [-1, 1]) {
        const doorGroup = new THREE.Group();
        const closedZ = leaf * 0.475;
        doorGroup.position.set(side * 1.545, 0, closedZ);
        const panel = makeBox(0.06, 2.22, 0.91, mats.body, 0, 1.26, 0);
        doorGroup.add(panel);
        doorGroup.add(makeBox(0.07, 0.18, 0.91, mats.bodyDark, 0, 0.2, 0));
        const doorWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.77), mats.doorGlass);
        doorWindow.position.set(side * 0.035, 1.78, 0);
        doorWindow.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        doorWindow.renderOrder = 5;
        doorGroup.add(doorWindow);
        // Door pull and trim.
        doorGroup.add(makeBox(0.04, 0.08, 0.04, mats.steel, side * 0.055, 1.14, -leaf * 0.35));
        doorGroup.add(makeBox(0.04, 0.32, 0.05, mats.steel, side * 0.055, 1.25, -leaf * 0.35));
        car.add(doorGroup);
        train.doorGroups.push({
          group: doorGroup,
          closedZ,
          openZ: leaf * 1.34,
          side,
          carIndex,
        });
      }
      // Door threshold.
      car.add(makeBox(0.18, 0.05, 1.94, mats.warning, side * 1.5, 0.27, 0));
      // Exterior door lamp.
      const lamp = makeBox(0.18, 0.05, 0.42, mats.warning, side * 1.58, 2.45, 0);
      car.add(lamp);
    }

    // Side car number.
    const numberTex = makeCanvasTexture(256, 96, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(240,234,217,.64)';
      ctx.font = '600 19px "Rajdhani", sans-serif';
      ctx.fillText(`MTA / CAR ${String(carIndex + 1).padStart(2, '0')}`, 12, 35);
      ctx.font = '700 54px "Barlow Condensed", sans-serif';
      ctx.fillStyle = 'rgba(240,234,217,.8)';
      ctx.fillText(`7013-${carIndex + 1}`, 12, 82);
    });
    const numMat = new THREE.MeshBasicMaterial({ map: numberTex, transparent: true, depthWrite: false, toneMapped: true });
    for (const side of [-1, 1]) {
      const num = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.35), numMat);
      num.position.set(side * 1.574, 0.66, 5.9);
      num.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.add(num);
    }

    // Bogies and wheels.
    for (const zSign of [-1, 1]) {
      car.add(makeBox(1.9, 0.36, 1.3, mats.darkSteel, 0, -0.4, zSign * 4.5));
      car.add(makeBox(2.5, 0.14, 0.26, mats.darkSteel, 0, -0.5, zSign * 4.5));
      for (const side of [-1, 1]) {
        for (const zz of [-0.4, 0.4]) {
          const wheel = makeCylinder(0.31, 0.31, 0.16, 12, mats.steel, side * 1.05, -0.55, zSign * 4.5 + zz);
          wheel.rotation.z = Math.PI / 2;
          car.add(wheel);
        }
      }
      // Suspension details.
      car.add(makeCylinder(0.07, 0.07, 0.58, 6, mats.steel, -0.7, -0.28, zSign * 4.5));
      car.add(makeCylinder(0.07, 0.07, 0.58, 6, mats.steel, 0.7, -0.28, zSign * 4.5));
    }
  });

  // Front and rear cab treatment.
  const frontCab = new THREE.Group();
  frontCab.position.z = 22.09;
  group.add(frontCab);
  frontCab.add(makeBox(2.86, 2.6, 0.34, mats.body, 0, 1.57, 0));
  frontCab.add(makeBox(2.65, 1.08, 0.05, mats.darkSteel, 0, 2.15, 0.19));
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 0.96), mats.glass);
  windshield.position.set(0, 2.14, 0.215);
  windshield.renderOrder = 5;
  frontCab.add(windshield);
  frontCab.add(makeBox(2.42, 0.14, 0.2, mats.bodyDark, 0, 1.5, 0.21));
  frontCab.add(makeBox(2.95, 0.28, 0.42, mats.bodyDark, 0, 0.76, 0.12));
  frontCab.add(makeBox(0.42, 0.28, 0.07, mats.bodyAccent, 0, 3.0, 0.17));
  const frontDest = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.44), destMat);
  frontDest.position.set(0, 2.74, 0.205);
  frontCab.add(frontDest);
  for (const side of [-1, 1]) {
    const light = makeBox(0.46, 0.2, 0.055, mats.headlight, side * 0.82, 1.23, 0.2);
    frontCab.add(light);
    const glow = makeGlowSprite(0xffe4b1, 0.28, 2.1);
    glow.position.set(side * 0.82, 1.23, 0.35);
    frontCab.add(glow);
    train.headlights.push({ light, glow });
    const taillight = makeBox(0.24, 0.1, 0.035, mats.taillight, side * 0.55, 0.94, 0.21);
    frontCab.add(taillight);
  }
  // Headlight spot projects into the tunnel ahead of the train.
  const spot = new THREE.SpotLight(0xffe5b5, 4.5, 55, 0.32, 0.55, 1.2);
  spot.position.set(0, 1.2, 0.4);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, 0.2, 20);
  spot.target = spotTarget;
  frontCab.add(spot);
  frontCab.add(spotTarget);
  train.spotlights.push(spot);

  // Rear cap.
  const rearCab = new THREE.Group();
  rearCab.position.z = -22.09;
  group.add(rearCab);
  rearCab.add(makeBox(2.86, 2.6, 0.34, mats.body, 0, 1.57, 0));
  rearCab.add(makeBox(2.65, 0.72, 0.04, mats.darkSteel, 0, 2.24, -0.19));
  rearCab.add(makeBox(2.95, 0.28, 0.42, mats.bodyDark, 0, 0.76, -0.12));
  for (const side of [-1, 1]) {
    const light = makeBox(0.32, 0.15, 0.04, mats.taillight, side * 0.65, 1.15, -0.2);
    rearCab.add(light);
    const glow = makeGlowSprite(0xff2b17, 0.17, 1.3);
    glow.position.set(side * 0.65, 1.15, -0.28);
    rearCab.add(glow);
    train.headlights.push({ light, glow });
  }

  // Bellows between cars.
  for (const z of [-7.5, 7.5]) {
    for (const zz of [-1, 1]) {
      const connector = makeBox(2.22, 2.44, 0.42, mats.rubber, 0, 1.55, z + zz * 0.18);
      group.add(connector);
    }
  }

  // Doorway attention glow at the middle car.
  const glowMat = new THREE.SpriteMaterial({
    map: SOFT_GLOW_TEXTURE,
    color: 0xffc66c,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const doorGlow = new THREE.Sprite(glowMat);
  doorGlow.position.set(1.58, 1.35, 0);
  doorGlow.scale.set(2.7, 2.9, 1);
  group.add(doorGlow);
  train.doorGlow = doorGlow;

  // Small interior signs next to the door.
  const exitTex = makeCanvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#0c1210';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#71e0c5';
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, w - 10, h - 10);
    ctx.fillStyle = '#d9f3e7';
    ctx.font = '700 46px "Barlow Condensed", sans-serif';
    ctx.fillText('MIND THE GAP', 18, 75);
    ctx.fillStyle = '#71e0c5';
    ctx.font = '600 17px "Rajdhani", sans-serif';
    ctx.fillText('MTA / SAFETY FIRST', 19, 103);
  });
  const exitMat = new THREE.MeshBasicMaterial({ map: exitTex, toneMapped: true });
  for (const side of [-1, 1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.46), exitMat);
    sign.position.set(side * 1.09, 2.47, 1.25);
    sign.rotation.y = side > 0 ? Math.PI : 0;
    group.add(sign);
  }

  train.group.visible = false;
  runtime.train = train;
  return train;
}

function drawTrainDestination(train, stationName, color = '#ffb554') {
  if (!train || !train.destinationContext) return;
  const ctx = train.destinationContext;
  const w = 512;
  const h = 128;
  ctx.fillStyle = '#060b09';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,.13)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 10, h);
  ctx.fillStyle = 'rgba(241,235,217,.5)';
  ctx.font = '600 17px "Rajdhani", sans-serif';
  ctx.fillText('LINE 13  /  MIDDLE CAR', 28, 31);
  ctx.fillStyle = color;
  ctx.font = '700 50px "Barlow Condensed", sans-serif';
  ctx.fillText(stationName.toUpperCase().slice(0, 24), 28, 84);
  ctx.fillStyle = 'rgba(241,235,217,.62)';
  ctx.font = '600 17px "Rajdhani", sans-serif';
  ctx.fillText('NIGHT SERVICE', 28, 108);
  ctx.fillStyle = color;
  ctx.font = '700 42px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('13', 477, 87);
  ctx.textAlign = 'left';
  train.destinationTexture.needsUpdate = true;
}

function setTrainDoors(train, amount) {
  const doors = clamp(amount, 0, 1);
  train.doors = doors;
  for (const item of train.doorGroups) {
    const z = lerp(item.closedZ, item.openZ, doors);
    item.group.position.z = z;
  }
  if (train.doorGlow) {
    train.doorGlow.material.opacity = 0.08 + doors * 0.24;
  }
}

function updateTrain(train, dt, time) {
  if (!train) return;
  setTrainDoors(train, damp(train.doors, train.doorTarget, 4.5, dt));
  train.lightPulse += dt;
  for (let i = 0; i < train.interiorLights.length; i++) {
    const light = train.interiorLights[i];
    light.intensity = (i === 1 ? 1.65 : 1.05) + Math.sin(time * 5.1 + i * 2.3) * 0.03;
  }
  for (const item of train.glows) {
    if (item.material) item.material.opacity = 0.13 + Math.sin(time * 1.7 + item.position.z) * 0.016;
  }
  for (const item of train.headlights) {
    if (item.glow && item.glow.material) {
      item.glow.material.opacity = 0.22 + Math.sin(time * 2.0) * 0.025;
    }
  }
  if (train.spotlights.length) {
    train.spotlights[0].intensity = 4.2 + Math.sin(time * 17.3) * 0.12;
  }
}

function getTrainWorldGroup() {
  return runtime.train ? runtime.train.group : null;
}
