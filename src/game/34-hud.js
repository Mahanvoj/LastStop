/* ==========================================================================
   HUD — wave state, vitals, interaction feedback and the station minimap
   ========================================================================== */

const MINIMAP = {
  width: 440,
  height: 302,
  left: 22,
  right: 418,
  top: 38,
  bottom: 266,
  zMin: -50,
  zMax: 50,
  xMin: -13.2,
  xMax: 9.2,
};

function initHUD() {
  if (dom.minimap) {
    runtime.minimapCtx = dom.minimap.getContext('2d');
    if (runtime.minimapCtx) runtime.minimapCtx.imageSmoothingEnabled = true;
  }
  G.ui.hudTick = 0;
  updateWaveHUD();
  updateStationHUD();
  updateVitalsHUD();
}

function hudRgba(hex, alpha = 1) {
  if (typeof hex !== 'string' || hex.charAt(0) !== '#' || hex.length < 7) {
    return `rgba(255,255,255,${alpha})`;
  }
  const value = parseInt(hex.slice(1, 7), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function hudPad(value, length = 2) {
  return String(value).padStart(length, '0');
}

function updateStationHUD() {
  const theme = G.theme || THEMES[0];
  setText(dom.stationName, theme.name);
  setText(dom.sectorId, `SECTOR ${hudPad(G.sector)}`);
  setText(dom.lineNumber, theme.line);
  setText(dom.mapLine, `LINE ${theme.line}`);
}

function updateWaveHUD() {
  const wave = G.wave;
  const active = wave.active;
  const number = Math.max(1, active ? wave.number : G.round);
  const remaining = active ? Math.max(0, wave.queue.length + wave.alive) : 0;
  const total = Math.max(1, wave.total || 0);
  const threatRatio = active ? clamp01(remaining / total) : 0;
  const singular = remaining === 1;

  let status = 'CONTACT PENDING';
  let code = `${G.theme.code || 'MTA-13'} / DARK`;

  switch (G.state) {
    case 'playing':
      if (remaining <= 0) status = 'SECTOR CLEAR';
      else if (wave.spawned <= 0) status = 'CONTACT PENDING';
      else if (remaining > 8) status = 'HEAVY CONTACT';
      else status = 'HOSTILES ENGAGED';
      break;
    case 'cleared':
      status = G.flow.postArrival ? 'SECTOR SECURED' : 'SECTOR CLEAR';
      break;
    case 'trainArriving':
      status = 'TRAIN INBOUND';
      code = 'LINE 13 / INBOUND';
      break;
    case 'trainOpen':
      status = 'BOARD MIDDLE CAR';
      code = 'LINE 13 / BOARDING';
      break;
    case 'boarding':
      status = 'BOARDING';
      code = 'LINE 13 / DOORS';
      break;
    case 'riding':
      status = 'IN TRANSIT';
      code = 'LINE 13 / NIGHT SERVICE';
      break;
    case 'gameover':
      status = 'SIGNAL LOST';
      code = 'MTA-13 / NO SIGNAL';
      break;
    case 'menu':
      status = 'STANDBY';
      code = `${G.theme.code || 'MTA-13'} / STANDBY`;
      break;
    default:
      break;
  }

  setText(dom.waveNum, `WAVE ${hudPad(number)}`);
  if (dom.waveSummary) {
    dom.waveSummary.innerHTML = `<strong>${remaining}</strong> HOSTILE${singular ? '' : 'S'}`;
  }
  if (dom.waveTrack) {
    const transform = `scaleX(${clamp(threatRatio, 0.001, 1).toFixed(3)})`;
    if (dom.waveTrack.style.transform !== transform) dom.waveTrack.style.transform = transform;
    dom.waveTrack.style.opacity = active ? '1' : '0.6';
  }
  setText(dom.waveStatus, status);
  setText(dom.threatCode, code);
}

function updateVitalsHUD() {
  const health = Math.max(0, Math.round(player.health));
  const armor = Math.max(0, Math.round(player.armor));
  const healthRatio = clamp01(player.health / Math.max(1, player.maxHealth));
  const armorRatio = clamp01(player.armor / Math.max(1, player.maxArmor));
  const low = health <= 32;

  setText(dom.healthValue, String(health));
  setText(dom.armorValue, String(armor));
  dom.healthFill.style.transform = `scaleX(${healthRatio.toFixed(3)})`;
  dom.armorFill.style.transform = `scaleX(${armorRatio.toFixed(3)})`;
  dom.healthFill.classList.toggle('low', low);
  dom.healthValue.classList.toggle('hurt', low);

  let note = 'VITAL SIGNS STABLE';
  if (!player.alive) note = 'SIGNAL TERMINATED';
  else if (health <= 15) note = 'CRITICAL // SEEK BIO-GEL';
  else if (health <= 32) note = 'HEMORRHAGIC SHOCK // FALL BACK';
  else if (health <= 58) note = 'WOUNDED // PLATE DEGRADED';
  else if (armor <= 0) note = 'PLATE DESTROYED';
  else if (armor < 25) note = 'PLATE COMPROMISED';
  else if (armor < player.maxArmor * 0.65) note = 'PLATE HOLDING';
  setText(dom.vitalsNote, note);

  G.ui.lastHealth = health;
  G.ui.lastArmor = armor;
}

function updateWeaponPanelState() {
  const state = runtime.activeWeapon;
  if (!state) return;
  const config = state.config;
  const low = state.ammo <= Math.ceil(config.magazine * 0.25);
  dom.ammoMag.classList.toggle('empty', state.ammo <= 0);
  dom.ammoMag.classList.toggle('low', state.ammo > 0 && low);
  dom.ammoPanel.classList.toggle('low', low);
  dom.slots.forEach((slot, i) => {
    const weapon = player.weapons[i];
    slot.classList.toggle('active', i === player.currentWeapon);
    slot.classList.toggle('empty', !!weapon && weapon.ammo <= 0 && weapon.reserve <= 0);
  });
}

function updateHUDTimers(dt) {
  for (let i = 0; i < G.ui.damageDirTimers.length; i++) {
    if (G.ui.damageDirTimers[i] <= 0) continue;
    G.ui.damageDirTimers[i] = Math.max(0, G.ui.damageDirTimers[i] - dt);
    if (G.ui.damageDirTimers[i] === 0) dom.damageIndicators[i].classList.remove('show');
  }

  if (G.ui.hitmarkerTimer > 0) {
    G.ui.hitmarkerTimer = Math.max(0, G.ui.hitmarkerTimer - dt);
    if (G.ui.hitmarkerTimer === 0) {
      dom.hitmarker.classList.remove('hit', 'headshot', 'kill');
    }
  }
}

function updateHUD(dt) {
  updateHUDTimers(dt);
  updateWeaponPanelState();

  G.ui.hudTick = (G.ui.hudTick || 0) - dt;
  if (G.ui.hudTick <= 0) {
    G.ui.hudTick = 0.18;
    updateWaveHUD();
    const health = Math.max(0, Math.round(player.health));
    const armor = Math.max(0, Math.round(player.armor));
    if (health !== G.ui.lastHealth || armor !== G.ui.lastArmor || !player.alive) {
      updateVitalsHUD();
    }
  }

  runtime.minimapAccum += dt;
  if (runtime.minimapAccum >= 1 / 24) {
    runtime.minimapAccum = 0;
    drawMinimap(G.time);
  }
}

function showLockHint(show) {
  if (!dom.lockHint) return;
  dom.lockHint.classList.toggle('show', !!show);
}

/* --------------------------------------------------------------------------
   Station minimap
   -------------------------------------------------------------------------- */

function minimapPoint(station, worldZ, worldX) {
  const zt = clamp01((worldZ - (station.centerZ + MINIMAP.zMin)) / (MINIMAP.zMax - MINIMAP.zMin));
  const xt = clamp01((worldX - MINIMAP.xMin) / (MINIMAP.xMax - MINIMAP.xMin));
  return {
    x: lerp(MINIMAP.left, MINIMAP.right, zt),
    y: lerp(MINIMAP.top, MINIMAP.bottom, xt),
  };
}

function minimapPathRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function minimapDrawRect(ctx, station, minZ, maxZ, minX, maxX) {
  const a = minimapPoint(station, minZ, minX);
  const b = minimapPoint(station, maxZ, maxX);
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

function drawMinimap(time) {
  const ctx = runtime.minimapCtx;
  const station = runtime.currentStation;
  if (!ctx || !station) return;

  const accent = (G.theme && G.theme.accent) || '#ffbd66';
  const W = MINIMAP.width;
  const H = MINIMAP.height;
  ctx.clearRect(0, 0, W, H);

  // Dark instrument face.
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, 'rgba(8,15,16,.96)');
  base.addColorStop(1, 'rgba(3,7,8,.98)');
  ctx.fillStyle = base;
  minimapPathRoundRect(ctx, 1, 1, W - 2, H - 2, 9);
  ctx.fill();

  ctx.save();
  minimapPathRoundRect(ctx, 8, 8, W - 16, H - 16, 4);
  ctx.clip();

  // Faint survey grid.
  ctx.strokeStyle = 'rgba(223,235,225,.045)';
  ctx.lineWidth = 1;
  for (let z = Math.ceil(MINIMAP.zMin / 10) * 10; z <= MINIMAP.zMax; z += 10) {
    const p = minimapPoint(station, station.centerZ + z, MINIMAP.xMin);
    ctx.beginPath();
    ctx.moveTo(p.x, MINIMAP.top - 4);
    ctx.lineTo(p.x, MINIMAP.bottom + 4);
    ctx.stroke();
  }
  for (let x = -12; x <= 8; x += 4) {
    const p = minimapPoint(station, station.centerZ, x);
    ctx.beginPath();
    ctx.moveTo(MINIMAP.left - 4, p.y);
    ctx.lineTo(MINIMAP.right + 4, p.y);
    ctx.stroke();
  }

  // Track bed.
  const track = minimapDrawRect(ctx, station, -49, 49, WORLD.oppositeWallX, WORLD.platformEdgeX);
  ctx.fillStyle = 'rgba(2,5,5,.8)';
  ctx.fillRect(track.x, track.y, track.w, track.h);
  ctx.strokeStyle = 'rgba(230,239,226,.10)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const rail1 = minimapPoint(station, station.centerZ, WORLD.trackX - 1.15);
  const rail2 = minimapPoint(station, station.centerZ, WORLD.trackX + 1.15);
  ctx.moveTo(MINIMAP.left, rail1.y);
  ctx.lineTo(MINIMAP.right, rail1.y);
  ctx.moveTo(MINIMAP.left, rail2.y);
  ctx.lineTo(MINIMAP.right, rail2.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(230,239,226,.055)';
  for (let z = -48; z <= 48; z += 3.6) {
    const p = minimapPoint(station, station.centerZ + z, WORLD.trackX);
    ctx.beginPath();
    ctx.moveTo(p.x, rail1.y - 3);
    ctx.lineTo(p.x, rail2.y + 3);
    ctx.stroke();
  }

  // Platform slab.
  const platform = minimapDrawRect(ctx, station, -46, 46, WORLD.platformEdgeX, WORLD.wallX);
  const platformGradient = ctx.createLinearGradient(0, platform.y, 0, platform.y + platform.h);
  platformGradient.addColorStop(0, 'rgba(136,148,134,.21)');
  platformGradient.addColorStop(1, 'rgba(64,74,67,.12)');
  ctx.fillStyle = platformGradient;
  ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
  ctx.strokeStyle = 'rgba(223,235,225,.16)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(platform.x, platform.y, platform.w, platform.h);

  // Platform edge and tactile strip.
  const edge = minimapPoint(station, station.centerZ, WORLD.platformEdgeX);
  const edgeEnd = minimapPoint(station, station.centerZ + 46, WORLD.platformEdgeX);
  ctx.strokeStyle = hudRgba(accent, 0.72);
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 7]);
  ctx.beginPath();
  ctx.moveTo(edge.x, edge.y);
  ctx.lineTo(edgeEnd.x, edgeEnd.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Far wall.
  const wall = minimapPoint(station, station.centerZ, WORLD.wallX);
  ctx.strokeStyle = 'rgba(226,236,225,.20)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(MINIMAP.left, wall.y);
  ctx.lineTo(MINIMAP.right, wall.y);
  ctx.stroke();

  // Station furniture and column footprints.
  for (const collider of station.colliders) {
    const minZ = Math.max(station.centerZ - 49, collider.minZ);
    const maxZ = Math.min(station.centerZ + 49, collider.maxZ);
    if (maxZ <= minZ) continue;
    const r = minimapDrawRect(ctx, station, minZ, maxZ, collider.minX, collider.maxX);
    if (r.w < 1 || r.h < 1) continue;
    ctx.fillStyle = 'rgba(210,222,208,.13)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(225,235,221,.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }

  // Tunnel mouths at either end of the platform.
  for (const end of [-1, 1]) {
    const p = minimapPoint(station, station.centerZ + end * 47, WORLD.trackX);
    ctx.fillStyle = 'rgba(0,0,0,.66)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = hudRgba(accent, 0.30);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(230,239,226,.15)';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 15);
    ctx.lineTo(p.x, p.y + 15);
    ctx.stroke();
  }

  // Waiting train, drawn over the track.
  if (runtime.train && runtime.train.group.visible) {
    const tz = runtime.train.group.position.z;
    const train = minimapDrawRect(
      ctx,
      station,
      tz - 22.1,
      tz + 22.1,
      WORLD.trackX - WORLD.trainWidth / 2,
      WORLD.trackX + WORLD.trainWidth / 2
    );
    if (train.w > 0) {
      ctx.fillStyle = hudRgba(accent, 0.12);
      minimapPathRoundRect(ctx, train.x, train.y, train.w, train.h, 5);
      ctx.fill();
      ctx.strokeStyle = hudRgba(accent, 0.72);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.strokeStyle = hudRgba(accent, 0.24);
      ctx.lineWidth = 1;
      for (const carOffset of [-7.5, 7.5]) {
        const p = minimapPoint(station, tz + carOffset, WORLD.trackX);
        ctx.beginPath();
        ctx.moveTo(p.x, train.y);
        ctx.lineTo(p.x, train.y + train.h);
        ctx.stroke();
      }
      if (runtime.train.doors > 0.35) {
        const door = minimapPoint(station, tz, WORLD.platformEdgeX);
        ctx.fillStyle = hudRgba(accent, 0.9);
        ctx.fillRect(door.x - 1.5, train.y + train.h - 4, 3, 4);
      }
    }
  }

  // Stop marker.
  const stop = minimapPoint(station, station.centerZ + 0.55, -4.15);
  ctx.strokeStyle = hudRgba(accent, 0.55);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(stop.x, stop.y, 7, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(stop.x - 10, stop.y);
  ctx.lineTo(stop.x - 4, stop.y);
  ctx.moveTo(stop.x + 4, stop.y);
  ctx.lineTo(stop.x + 10, stop.y);
  ctx.stroke();

  // Salvage.
  for (const pickup of runtime.pickups) {
    if (!pickup.group) continue;
    const p = minimapPoint(station, pickup.group.position.z, pickup.group.position.x);
    ctx.fillStyle = pickup.kind === 'health' ? '#82ffc1' : pickup.kind === 'armor' ? '#8fd4ff' : '#ffc477';
    ctx.globalAlpha = 0.55 + Math.sin(time * 4 + pickup.bobSeed) * 0.25;
    ctx.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2);
  }
  ctx.globalAlpha = 1;

  // Hostiles.
  for (const enemy of runtime.enemyList) {
    if (!enemy.alive || enemy.dying) continue;
    const p = minimapPoint(station, enemy.group.position.z, enemy.group.position.x);
    const pulse = 0.7 + Math.sin(time * 5 + enemy.walkTime) * 0.3;
    ctx.fillStyle = `rgba(255,86,63,${0.12 + pulse * 0.12})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, enemy.type.key === 'brute' ? 9 : 6.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = enemy.type.key === 'brute' ? '#ffb25e' : enemy.type.key === 'gunner' ? '#ff9270' : '#ff5d43';
    ctx.beginPath();
    ctx.arc(p.x, p.y, enemy.type.key === 'brute' ? 3.6 : 2.7, 0, TAU);
    ctx.fill();
  }

  // Player heading cone and arrow.
  const pp = minimapPoint(station, player.position.z, player.position.x);
  const dirX = -Math.sin(player.yaw);
  const dirZ = -Math.cos(player.yaw);
  const angle = Math.atan2(dirX, dirZ);
  ctx.save();
  ctx.translate(pp.x, pp.y);
  ctx.rotate(angle + Math.PI / 2);
  const cone = ctx.createLinearGradient(0, 0, 0, -26);
  cone.addColorStop(0, 'rgba(243,236,220,.13)');
  cone.addColorStop(1, 'rgba(243,236,220,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-12, -25);
  ctx.lineTo(12, -25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(pp.x, pp.y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = '#f3ecdc';
  ctx.strokeStyle = 'rgba(5,9,10,.9)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(-5, 5);
  ctx.lineTo(0, 2.4);
  ctx.lineTo(5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = hudRgba(accent, 0.34 + Math.sin(time * 2.4) * 0.08);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 10.5 + Math.sin(time * 2.4) * 1.2, 0, TAU);
  ctx.stroke();

  // Instrument sweep.
  const sweepT = ((time * 0.16) % 1.35) - 0.18;
  const sweepX = lerp(MINIMAP.left, MINIMAP.right, sweepT);
  const sweep = ctx.createLinearGradient(sweepX - 32, 0, sweepX + 6, 0);
  sweep.addColorStop(0, 'rgba(255,255,255,0)');
  sweep.addColorStop(1, hudRgba(accent, 0.10));
  ctx.fillStyle = sweep;
  ctx.fillRect(sweepX - 32, MINIMAP.top, 38, MINIMAP.bottom - MINIMAP.top);

  // Labels.
  ctx.fillStyle = 'rgba(230,239,226,.24)';
  ctx.font = '600 10px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TRACK 13', MINIMAP.left + 7, MINIMAP.top + 14);
  ctx.fillStyle = hudRgba(accent, 0.42);
  ctx.fillText('PLATFORM', MINIMAP.left + 7, platform.y + platform.h - 8);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(230,239,226,.22)';
  ctx.font = '600 9px "Rajdhani", sans-serif';
  ctx.fillText(`${station.theme.code || 'MTA-13'} // S-${hudPad(station.sector)}`, MINIMAP.right - 7, MINIMAP.top + 14);

  ctx.restore();

  // Frame ticks.
  ctx.strokeStyle = hudRgba(accent, 0.58);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W - 36, 8);
  ctx.lineTo(W - 8, 8);
  ctx.lineTo(W - 8, 36);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, H - 24);
  ctx.lineTo(8, H - 8);
  ctx.lineTo(24, H - 8);
  ctx.stroke();
}
