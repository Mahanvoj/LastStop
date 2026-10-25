/* ==========================================================================
   Rendering foundation, procedural textures and wet-floor reflection
   ========================================================================== */

function initRenderer() {
  const canvas = dom.canvas;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = false;
  renderer.autoClear = false;
  renderer.setClearColor(0x040708, 1);
  runtime.renderer = renderer;

  const worldScene = new THREE.Scene();
  worldScene.fog = new THREE.FogExp2(THEMES[0].fog, 0.0185);
  const worldCamera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.045, 290);
  worldCamera.position.set(0.4, WORLD.playerEyeHeight, 30);
  worldCamera.rotation.order = 'YXZ';
  runtime.worldScene = worldScene;
  runtime.worldCamera = worldCamera;

  const worldRoot = new THREE.Group();
  worldRoot.name = 'world-root';
  worldScene.add(worldRoot);
  runtime.worldRoot = worldRoot;

  const viewScene = new THREE.Scene();
  const viewCamera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.008, 12);
  viewCamera.position.set(0, 0, 0);
  runtime.viewScene = viewScene;
  runtime.viewCamera = viewCamera;

  // A procedural studio environment gives PBR metals and glossy surfaces somewhere to reflect.
  runtime.envMap = createEnvironmentMap(renderer);
  worldScene.environment = runtime.envMap;
  viewScene.environment = runtime.envMap;

  const hemisphere = new THREE.HemisphereLight(0x8ba0a5, 0x0a0d0b, 0.45);
  worldScene.add(hemisphere);
  const ambient = new THREE.AmbientLight(0x243436, 0.36);
  worldScene.add(ambient);
  const moonlight = new THREE.DirectionalLight(0x91aeb5, 0.36);
  moonlight.position.set(-20, 18, -35);
  worldScene.add(moonlight);

  // Viewmodel lighting: warm practical on one side, cool rim on the other.
  const viewAmbient = new THREE.AmbientLight(0x6d7572, 0.62);
  viewScene.add(viewAmbient);
  const viewHemi = new THREE.HemisphereLight(0xacc7cb, 0x11110f, 0.82);
  viewScene.add(viewHemi);
  const key = new THREE.DirectionalLight(0xffd1a0, 2.25);
  key.position.set(-2.8, 3.4, 2.2);
  viewScene.add(key);
  const rim = new THREE.DirectionalLight(0x78d8d4, 1.5);
  rim.position.set(4.2, 1.0, -2.6);
  viewScene.add(rim);
  const fill = new THREE.PointLight(0xffa85a, 1.1, 6, 1.7);
  fill.position.set(-1.4, -0.6, -0.2);
  viewScene.add(fill);

  window.addEventListener('resize', onWindowResize, { passive: true });
  onWindowResize();

  // Fine dust always helps sell a flashlight-lit interior.
  runtime.dust = createDustField();
  worldRoot.add(runtime.dust.points);

  dom.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return renderer;
}

function onWindowResize() {
  if (!runtime.renderer) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  runtime.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  runtime.renderer.setSize(width, height, false);
  runtime.worldCamera.aspect = width / height;
  runtime.worldCamera.updateProjectionMatrix();
  runtime.viewCamera.aspect = width / height;
  runtime.viewCamera.updateProjectionMatrix();
}

function createEnvironmentMap(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0b1215');
  grad.addColorStop(0.46, '#1b2527');
  grad.addColorStop(0.55, '#101717');
  grad.addColorStop(1, '#020303');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Cold strip lights on the horizon.
  for (let i = 0; i < 9; i++) {
    const x = 70 + i * 112 + Math.random() * 25;
    const y = 202 + Math.random() * 54;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 80);
    g.addColorStop(0, 'rgba(228,243,235,.95)');
    g.addColorStop(0.12, 'rgba(191,223,216,.6)');
    g.addColorStop(0.4, 'rgba(90,144,143,.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 85, y - 85, 170, 170);
  }
  // Warm escalator and sodium bounce.
  const warm = ctx.createRadialGradient(240, 332, 0, 240, 332, 190);
  warm.addColorStop(0, 'rgba(255,190,110,.6)');
  warm.addColorStop(0.3, 'rgba(218,126,55,.16)');
  warm.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(20, 140, 480, 370);

  const teal = ctx.createRadialGradient(790, 305, 0, 790, 305, 200);
  teal.addColorStop(0, 'rgba(72,212,201,.34)');
  teal.addColorStop(0.42, 'rgba(26,108,108,.10)');
  teal.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = teal;
  ctx.fillRect(560, 100, 440, 410);

  // A few overhead hard highlights.
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.globalAlpha = 0.45 - i * 0.06;
    ctx.fillStyle = '#f2f0e4';
    ctx.beginPath();
    ctx.ellipse(170 + i * 235, 68 + (i % 2) * 22, 74, 8, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(tex).texture;
  env.mapping = THREE.CubeUVReflectionMapping;
  tex.dispose();
  pmrem.dispose();
  return env;
}

/* --------------------------------------------------------------------------
   Canvas / texture utilities
   -------------------------------------------------------------------------- */

function makeCanvasTexture(width, height, draw, options = {}) {
  const {
    colorSpace = true,
    repeat = null,
    wrap = THREE.ClampToEdgeWrapping,
    anisotropy = true,
  } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = wrap;
  texture.wrapT = wrap;
  if (repeat) {
    texture.repeat.set(repeat[0], repeat[1]);
  }
  if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  if (anisotropy && runtime.renderer) {
    texture.anisotropy = Math.min(runtime.renderer.capabilities.getMaxAnisotropy(), 8);
  }
  texture.needsUpdate = true;
  return texture;
}

function fillNoise(ctx, width, height, amount, alpha = 0.05) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    data[i] = clamp(data[i] + n, 0, 255);
    data[i + 1] = clamp(data[i + 1] + n, 0, 255);
    data[i + 2] = clamp(data[i + 2] + n, 0, 255);
  }
  ctx.putImageData(image, 0, 0);
  if (alpha > 0) {
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.08})`;
    ctx.fillRect(0, 0, width, height);
  }
}

function hexToRgba(hex, alpha = 1) {
  const color = new THREE.Color(hex);
  return `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${alpha})`;
}

const GLOW_TEXTURE = (() => {
  return makeCanvasTexture(256, 256, (ctx) => {
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.08, 'rgba(255,246,218,.96)');
    grad.addColorStop(0.24, 'rgba(255,210,142,.38)');
    grad.addColorStop(0.55, 'rgba(255,174,96,.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }, { colorSpace: false });
})();

const SOFT_GLOW_TEXTURE = (() => {
  return makeCanvasTexture(256, 256, (ctx) => {
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,255,.95)');
    grad.addColorStop(0.28, 'rgba(255,255,255,.4)');
    grad.addColorStop(0.68, 'rgba(255,255,255,.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }, { colorSpace: false });
})();

const SPARK_TEXTURE = (() => {
  return makeCanvasTexture(64, 64, (ctx) => {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.22, 'rgba(255,224,164,.92)');
    grad.addColorStop(0.58, 'rgba(255,139,49,.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }, { colorSpace: false });
})();

const SMOKE_TEXTURE = (() => {
  return makeCanvasTexture(128, 128, (ctx) => {
    const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 62);
    grad.addColorStop(0, 'rgba(225,220,205,.45)');
    grad.addColorStop(0.45, 'rgba(150,150,140,.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }, { colorSpace: false });
})();

const FLASH_TEXTURE = (() => {
  return makeCanvasTexture(256, 256, (ctx) => {
    ctx.translate(128, 128);
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 118);
    grad.addColorStop(0, 'rgba(255,255,245,1)');
    grad.addColorStop(0.1, 'rgba(255,241,199,.98)');
    grad.addColorStop(0.26, 'rgba(255,176,80,.64)');
    grad.addColorStop(0.6, 'rgba(255,105,30,.13)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    // Spiky star silhouette
    const spikes = 12;
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i / (spikes * 2)) * TAU;
      const radius = i % 2 === 0 ? 118 : 26;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 105, 0, TAU);
    ctx.fill();
  }, { colorSpace: false });
})();

const PUDDLE_TEXTURE = (() => {
  return makeCanvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, 512, 512);
    const blobs = [
      [82, 128, 90, 30], [190, 102, 70, 24], [342, 166, 120, 38], [449, 112, 55, 22],
      [116, 314, 105, 33], [270, 300, 150, 52], [414, 358, 70, 26], [142, 458, 120, 36],
      [332, 460, 90, 30], [40, 230, 46, 16],
    ];
    for (const [x, y, rx, ry] of blobs) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand(-0.5, 0.5));
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, rx);
      grad.addColorStop(0, 'rgba(255,255,255,.85)');
      grad.addColorStop(0.5, 'rgba(230,230,230,.55)');
      grad.addColorStop(0.85, 'rgba(120,120,120,.13)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.scale(1, ry / rx);
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // Thin streaks and pooled water filigree
    for (let i = 0; i < 22; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${rand(0.02, 0.12)})`;
      ctx.lineWidth = rand(1, 5);
      ctx.beginPath();
      const x = rand(0, 512);
      const y = rand(0, 512);
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + rand(-50, 50), y + rand(30, 90), x + rand(20, 100), y + rand(20, 60), x + rand(-30, 30), y + rand(80, 140));
      ctx.stroke();
    }
    fillNoise(ctx, 512, 512, 24, 0);
  }, {
    colorSpace: false,
    repeat: [1, 1],
    wrap: THREE.RepeatWrapping,
    anisotropy: false,
  });
})();

function makeFloorTexture(theme) {
  return makeCanvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = theme.floor;
    ctx.fillRect(0, 0, 512, 512);
    const tile = 64;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const shade = rand(-10, 10);
        ctx.fillStyle = `rgba(${shade > 0 ? 255 : 0},${shade > 0 ? 245 : 0},${shade > 0 ? 225 : 0},${Math.abs(shade) / 120})`;
        ctx.fillRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
        if (chance(0.16)) {
          ctx.strokeStyle = `rgba(0,0,0,${rand(0.07, 0.18)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x * tile + rand(8, 50), y * tile + rand(8, 58));
          ctx.lineTo(x * tile + rand(8, 50), y * tile + rand(8, 58));
          ctx.stroke();
        }
      }
    }
    ctx.strokeStyle = 'rgba(2,4,4,.72)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tile, 0);
      ctx.lineTo(i * tile, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * tile);
      ctx.lineTo(512, i * tile);
      ctx.stroke();
    }
    // Grout highlights and salt blooms from the damp.
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tile + 1, 0);
      ctx.lineTo(i * tile + 1, 512);
      ctx.stroke();
    }
    for (let i = 0; i < 26; i++) {
      const x = rand(0, 512);
      const y = rand(0, 512);
      const r = rand(12, 80);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,248,220,${rand(0.01, 0.035)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Long scuffs left by decades of boots.
    for (let i = 0; i < 28; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${rand(0.05, 0.2)})`;
      ctx.lineWidth = rand(1, 4);
      ctx.beginPath();
      const x = rand(0, 512);
      const y = rand(0, 512);
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + rand(-70, 70), y + rand(-20, 20), x + rand(-60, 80), y + rand(10, 30), x + rand(-100, 100), y + rand(20, 70));
      ctx.stroke();
    }
    fillNoise(ctx, 512, 512, 22, 0);
  }, {
    repeat: [1, 1],
    wrap: THREE.RepeatWrapping,
  });
}

function makeWallTileTexture(theme) {
  return makeCanvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = theme.wall;
    ctx.fillRect(0, 0, 512, 512);
    const cols = 8;
    const rows = 8;
    const w = 512 / cols;
    const h = 512 / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = new THREE.Color(theme.tile);
        const light = rand(-0.11, 0.06);
        c.offsetHSL(rand(-0.014, 0.014), rand(-0.03, 0.03), light);
        ctx.fillStyle = `#${c.getHexString()}`;
        ctx.fillRect(x * w + 2, y * h + 2, w - 4, h - 4);
        ctx.fillStyle = `rgba(255,255,240,${rand(0.015, 0.09)})`;
        ctx.fillRect(x * w + 4, y * h + 4, w - 8, 3);
        ctx.fillStyle = `rgba(0,0,0,${rand(0.01, 0.10)})`;
        ctx.fillRect(x * w + 4, y * h + h - 7, w - 8, 3);
      }
    }
    ctx.strokeStyle = 'rgba(8,10,9,.7)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * w, 0);
      ctx.lineTo(i * w, 512);
      ctx.stroke();
    }
    for (let i = 0; i <= rows; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * h);
      ctx.lineTo(512, i * h);
      ctx.stroke();
    }
    // Dirt rising from the tracks, water staining and graffiti scratches.
    const grime = ctx.createLinearGradient(0, 512, 0, 210);
    grime.addColorStop(0, 'rgba(2,6,5,.68)');
    grime.addColorStop(0.45, 'rgba(7,12,9,.16)');
    grime.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grime;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 14; i++) {
      const x = rand(0, 512);
      const g = ctx.createLinearGradient(x, 0, x + rand(-20, 20), 512);
      g.addColorStop(0, 'rgba(9,12,9,.25)');
      g.addColorStop(0.5, 'rgba(6,9,8,.06)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, rand(10, 40), 512);
    }
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(232,236,218,${rand(0.04, 0.11)})`;
      ctx.lineWidth = rand(1, 2);
      ctx.beginPath();
      const x = rand(40, 450);
      const y = rand(220, 480);
      ctx.moveTo(x, y);
      ctx.lineTo(x + rand(-34, 34), y + rand(20, 70));
      ctx.stroke();
    }
    fillNoise(ctx, 512, 512, 18, 0);
  }, {
    repeat: [1, 1],
    wrap: THREE.RepeatWrapping,
  });
}

function makeConcreteTexture(baseColor = '#303737', contrast = 1) {
  return makeCanvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 700; i++) {
      const alpha = rand(0.008, 0.055) * contrast;
      ctx.fillStyle = chance(0.5) ? `rgba(255,255,240,${alpha})` : `rgba(0,0,0,${alpha * 1.4})`;
      const size = rand(1, 13);
      ctx.fillRect(rand(0, 512), rand(0, 512), size, size);
    }
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${rand(0.05, 0.2) * contrast})`;
      ctx.lineWidth = rand(0.5, 2);
      ctx.beginPath();
      let x = rand(0, 512);
      let y = rand(0, 512);
      ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += rand(-35, 35);
        y += rand(10, 60);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const x = rand(0, 512);
      const y = rand(0, 512);
      const r = rand(30, 130);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(4,8,6,${rand(0.06, 0.25) * contrast})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    fillNoise(ctx, 512, 512, 24, 0);
  }, {
    repeat: [1, 1],
    wrap: THREE.RepeatWrapping,
  });
}

function makePosterTexture(theme, index) {
  return makeCanvasTexture(620, 880, (ctx, w, h) => {
    ctx.fillStyle = '#0b0e0e';
    ctx.fillRect(0, 0, w, h);
    const accent = theme.accent;
    const pale = '#e9e2d0';
    const headingFont = '700 112px "Barlow Condensed", sans-serif';
    const labelFont = '600 20px "Rajdhani", sans-serif';
    const monoFont = '18px monospace';
    const mode = index % 6;

    if (mode === 0) {
      // Fashion / fever dream
      const g = ctx.createRadialGradient(398, 360, 15, 398, 360, 290);
      g.addColorStop(0, hexToRgba(accent, 0.92));
      g.addColorStop(0.2, hexToRgba(accent, 0.45));
      g.addColorStop(0.7, 'rgba(32,26,20,.15)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = hexToRgba(accent, 0.45);
      ctx.lineWidth = 1;
      for (let r = 50; r < 420; r += 37) {
        ctx.beginPath();
        ctx.arc(398, 360, r, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = pale;
      ctx.font = '600 21px "Rajdhani", sans-serif';
      ctx.fillText('NOCTURNE TRANSIT CO.', 48, 62);
      ctx.font = '700 92px "Barlow Condensed", sans-serif';
      ctx.fillText('NIGHT', 42, 690);
      ctx.fillText('BLOOM', 42, 770);
      ctx.fillStyle = accent;
      ctx.fillRect(44, 799, 180, 4);
      ctx.font = monoFont;
      ctx.fillText('FEEL THE CITY AFTER DARK', 44, 840);
    } else if (mode === 1) {
      ctx.fillStyle = pale;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#101413';
      ctx.fillRect(38, 38, w - 76, h - 76);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(90, 235);
      ctx.lineTo(440, 150);
      ctx.lineTo(510, 430);
      ctx.lineTo(140, 520);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = pale;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(130, 600);
      ctx.lineTo(460, 600);
      ctx.stroke();
      ctx.fillStyle = pale;
      ctx.font = '700 92px "Barlow Condensed", sans-serif';
      ctx.fillText('KEEP', 70, 685);
      ctx.fillText('MOVING', 70, 765);
      ctx.font = '600 19px "Rajdhani", sans-serif';
      ctx.fillText('MTA // PLATFORM SAFETY CAMPAIGN', 72, 810);
    } else if (mode === 2) {
      // Bold typographic travel poster
      ctx.fillStyle = '#101615';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.strokeStyle = hexToRgba(accent, 0.5);
      ctx.lineWidth = 2;
      for (let i = 0; i < 11; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 70 + i * 34, Math.PI * 0.1, Math.PI * 1.65);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = pale;
      ctx.font = '600 20px "Rajdhani", sans-serif';
      ctx.fillText('OUTER HARBOR AUTHORITY', 46, 60);
      ctx.font = '700 118px "Barlow Condensed", sans-serif';
      ctx.fillText('THE', 45, 620);
      ctx.fillText('DEEP', 45, 720);
      ctx.fillStyle = accent;
      ctx.fillText('LINE', 45, 820);
      ctx.font = '18px monospace';
      ctx.fillStyle = pale;
      ctx.fillText('DEPARTURES EVERY 04 MIN / NIGHT SERVICE', 48, 856);
    } else if (mode === 3) {
      // Government service warning
      ctx.fillStyle = '#c9c4b5';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, w, 150);
      ctx.fillStyle = '#0c0e0c';
      ctx.font = '700 68px "Barlow Condensed", sans-serif';
      ctx.fillText('CIVIC NOTICE', 42, 100);
      ctx.font = '600 176px "Barlow Condensed", sans-serif';
      ctx.fillText('NO', 40, 400);
      ctx.fillText('RETURN', 40, 550);
      ctx.font = '600 22px "Rajdhani", sans-serif';
      ctx.fillText('PERSONS LEAVING THE PLATFORM', 44, 620);
      ctx.fillText('FORFEIT THEIR RIGHT TO PASSAGE.', 44, 650);
      ctx.strokeStyle = '#0c0e0c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(44, 690);
      ctx.lineTo(560, 690);
      ctx.stroke();
      ctx.font = '17px monospace';
      ctx.fillText('MTA SECURITY DIRECTIVE 47-B / 02:00-05:00', 44, 730);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = `rgba(0,0,0,${rand(0.02, 0.12)})`;
        ctx.fillRect(rand(0, w), rand(0, h), rand(2, 30), rand(2, 7));
      }
    } else if (mode === 4) {
      // Product advertisement
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#111714');
      g.addColorStop(1, '#25332e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = hexToRgba(accent, 0.18);
      ctx.beginPath();
      ctx.arc(420, 300, 180, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(310, 300);
      ctx.rotate(-0.23);
      ctx.fillStyle = '#c8bb9e';
      ctx.fillRect(-105, -145, 210, 310);
      ctx.fillStyle = '#242b27';
      ctx.fillRect(-89, -129, 178, 278);
      ctx.fillStyle = accent;
      ctx.font = '700 64px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SALT', 0, 20);
      ctx.fillText('& IRON', 0, 78);
      ctx.font = '600 14px "Rajdhani", sans-serif';
      ctx.fillStyle = pale;
      ctx.fillText('DISTILLED FOR THE NIGHT SHIFT', 0, 122);
      ctx.restore();
      ctx.fillStyle = pale;
      ctx.font = '700 82px "Barlow Condensed", sans-serif';
      ctx.fillText('STAY', 45, 670);
      ctx.fillText('AWAKE', 45, 744);
      ctx.fillStyle = accent;
      ctx.font = '600 19px "Rajdhani", sans-serif';
      ctx.fillText('AVAILABLE AT ALL LOWER LEVEL KIOSKS', 48, 806);
    } else {
      // Abstract music / event poster
      ctx.fillStyle = '#e7decc';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#121817';
      ctx.fillRect(34, 34, w - 68, h - 68);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.moveTo(70 + i * 35, 120);
        ctx.lineTo(70 + i * 22, 680 - i * 11);
        ctx.stroke();
      }
      ctx.fillStyle = pale;
      ctx.font = '700 105px "Barlow Condensed", sans-serif';
      ctx.fillText('SIGNAL', 60, 275);
      ctx.fillStyle = accent;
      ctx.fillText('STATIC', 60, 375);
      ctx.fillStyle = pale;
      ctx.font = '600 21px "Rajdhani", sans-serif';
      ctx.fillText('LIVE / PLATFORM FOUR / 02:00', 63, 795);
      ctx.font = '16px monospace';
      ctx.fillText('NO CAMERAS. NO SIGNAL. NO EXIT.', 63, 826);
    }

    // Print grain and an illuminated poster sheen.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'rgba(255,255,240,.10)');
    sheen.addColorStop(0.28, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.7, 'rgba(255,255,255,.03)');
    sheen.addColorStop(1, 'rgba(0,0,0,.16)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    fillNoise(ctx, w, h, 10, 0);
  });
}

function makeStationSignTexture(theme, kind = 'main') {
  return makeCanvasTexture(kind === 'main' ? 1024 : 640, kind === 'main' ? 256 : 150, (ctx, w, h) => {
    ctx.fillStyle = '#0a0d0d';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(240,235,217,.22)';
    ctx.lineWidth = 3;
    ctx.strokeRect(9, 9, w - 18, h - 18);
    const pad = kind === 'main' ? 46 : 30;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(pad + (kind === 'main' ? 56 : 35), h / 2, kind === 'main' ? 48 : 32, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#090c0b';
    ctx.textAlign = 'center';
    ctx.font = kind === 'main' ? '700 70px "Barlow Condensed", sans-serif' : '700 44px "Barlow Condensed", sans-serif';
    ctx.fillText(theme.line, pad + (kind === 'main' ? 56 : 35), h / 2 + (kind === 'main' ? 23 : 15));
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f0ead9';
    ctx.font = kind === 'main' ? '600 88px "Barlow Condensed", sans-serif' : '600 46px "Barlow Condensed", sans-serif';
    ctx.fillText(theme.name, pad + (kind === 'main' ? 130 : 82), kind === 'main' ? h * 0.57 : h * 0.56);
    ctx.fillStyle = 'rgba(239,234,219,.42)';
    ctx.font = kind === 'main' ? '600 24px "Rajdhani", sans-serif' : '500 15px "Rajdhani", sans-serif';
    ctx.fillText(kind === 'main' ? `${theme.code}  //  NIGHT SERVICE  //  ALL TRAINS` : `${theme.code} // TOWARD ${theme.destination}`, pad + (kind === 'main' ? 132 : 84), kind === 'main' ? 194 : 112);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(pad, h - (kind === 'main' ? 34 : 23), w - pad * 2, 2);
    // Fine scratches and age.
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rand(0.015, 0.05)})`;
      ctx.fillRect(rand(0, w), rand(0, h), rand(8, 130), 1);
    }
  });
}

function makeWayfindingTexture(theme, label, arrow = '↑', sub = '') {
  return makeCanvasTexture(512, 180, (ctx, w, h) => {
    ctx.fillStyle = '#111615';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = theme.accent;
    ctx.font = '700 90px "Barlow Condensed", sans-serif';
    ctx.fillText(arrow, 28, h * 0.69);
    ctx.fillStyle = '#f0ead9';
    ctx.font = '700 54px "Barlow Condensed", sans-serif';
    ctx.fillText(label, 110, h * 0.57);
    if (sub) {
      ctx.fillStyle = 'rgba(240,234,217,.46)';
      ctx.font = '600 18px "Rajdhani", sans-serif';
      ctx.fillText(sub, 112, h * 0.8);
    }
  });
}

function makeTactileTexture() {
  return makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b58d3b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    for (let i = 0; i < 600; i++) ctx.fillRect(rand(0, w), rand(0, h), rand(1, 3), rand(1, 3));
    ctx.fillStyle = 'rgba(255,225,148,.32)';
    const step = 42;
    for (let y = 20; y < h; y += step) {
      for (let x = 20; x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(10,10,8,.42)';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, w, h);
    fillNoise(ctx, w, h, 22, 0);
  }, {
    repeat: [1, 1],
    wrap: THREE.RepeatWrapping,
  });
}

function makeTrainLiveryTexture(theme) {
  return makeCanvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(0, 196, w, 15);
    ctx.fillStyle = 'rgba(250,246,233,.94)';
    ctx.font = '700 94px "Barlow Condensed", sans-serif';
    ctx.fillText('LINE 13', 46, 126);
    ctx.font = '600 25px "Rajdhani", sans-serif';
    ctx.fillStyle = 'rgba(250,246,233,.58)';
    ctx.fillText('METROPOLITAN TRANSIT AUTHORITY', 50, 167);
    ctx.fillStyle = 'rgba(250,246,233,.96)';
    ctx.beginPath();
    ctx.arc(900, 105, 58, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0e1312';
    ctx.font = '700 68px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('13', 900, 129);
  });
}

function makeTunnelSignTexture(theme) {
  return makeCanvasTexture(512, 180, (ctx, w, h) => {
    ctx.fillStyle = '#121717';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(220,222,205,.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.fillStyle = theme.accent;
    ctx.font = '700 68px "Barlow Condensed", sans-serif';
    ctx.fillText('LINE 13', 34, 84);
    ctx.fillStyle = 'rgba(233,232,216,.55)';
    ctx.font = '600 25px "Rajdhani", sans-serif';
    ctx.fillText('SERVICE TUNNEL / NO TRESPASSING', 35, 128);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(35, 146, 260, 2);
  });
}

function makePosterFrameMaterials(theme) {
  return {
    frame: new THREE.MeshStandardMaterial({ color: 0x121819, metalness: 0.72, roughness: 0.34 }),
    backlight: new THREE.MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
}

function makeGlowSprite(color, opacity = 0.45, scale = 2.5) {
  const material = new THREE.SpriteMaterial({
    map: SOFT_GLOW_TEXTURE,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

function makeLightPoolTexture(color) {
  return makeCanvasTexture(256, 256, (ctx) => {
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 125);
    grad.addColorStop(0, hexToRgba(color, 0.27));
    grad.addColorStop(0.4, hexToRgba(color, 0.10));
    grad.addColorStop(0.78, hexToRgba(color, 0.025));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }, { colorSpace: false });
}

function makeWetFloorUniforms(theme, floorTexture) {
  return {
    tDiffuse: { value: null },
    tFloor: { value: floorTexture },
    tPuddle: { value: PUDDLE_TEXTURE },
    uAccent: { value: new THREE.Color(theme.accentHex) },
    uRepeat: { value: new THREE.Vector2(4, 32) },
    uTime: { value: 0 },
    uReflectionStrength: { value: 0.72 },
  };
}

const WET_FLOOR_VERTEX = /* glsl */`
  uniform mat4 textureMatrix;
  varying vec4 vUv;
  varying vec2 vFloorUv;
  varying vec3 vWorldPosition;
  void main() {
    vFloorUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vUv = textureMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const WET_FLOOR_FRAGMENT = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tFloor;
  uniform sampler2D tPuddle;
  uniform vec3 uAccent;
  uniform vec2 uRepeat;
  uniform float uTime;
  uniform float uReflectionStrength;
  varying vec4 vUv;
  varying vec2 vFloorUv;
  varying vec3 vWorldPosition;

  void main() {
    vec2 floorUv = vFloorUv * uRepeat;
    vec3 base = texture2D(tFloor, floorUv).rgb;

    vec2 puddleUv = vFloorUv * vec2(2.6, 9.0);
    float puddle = texture2D(tPuddle, puddleUv).r;
    puddle = smoothstep(0.20, 0.78, puddle);

    float longWet = smoothstep(0.12, 0.9, 0.5 + 0.5 * sin(vFloorUv.y * 36.0 + sin(vFloorUv.x * 11.0) * 2.0));
    float wet = clamp(puddle * 0.92 + longWet * 0.10 + 0.08, 0.0, 1.0);

    vec2 reflUv = vUv.xy / max(vUv.w, 0.0001);
    float t = uTime;
    vec2 ripple = vec2(
      sin(vWorldPosition.z * 3.1 + t * 0.24) * 0.0009,
      cos(vWorldPosition.x * 4.2 - t * 0.18) * 0.0008
    );
    ripple *= 0.5 + puddle * 1.6;
    vec3 reflected = texture2D(tDiffuse, clamp(reflUv + ripple, 0.002, 0.998)).rgb;
    reflected = pow(reflected, vec3(0.94));

    vec3 eye = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - clamp(eye.y, 0.0, 1.0), 2.4);
    float reflectAmount = wet * (0.20 + fresnel * 0.58) * uReflectionStrength;
    reflectAmount = clamp(reflectAmount, 0.06, 0.82);

    vec3 color = base * vec3(0.82, 0.84, 0.83);
    color = mix(color, reflected * vec3(0.92, 0.97, 0.98), reflectAmount);

    float glint = pow(max(0.0, sin(floorUv.x * 29.0 + sin(floorUv.y * 17.0) * 1.2)), 48.0);
    color += uAccent * glint * 0.018 * wet;

    // A low level of reflected ambient makes the entire floor feel damp.
    color += reflected * 0.045;
    color *= 0.98;

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
  }
`;

class WetFloor extends THREE.Mesh {
  constructor(width, depth, theme, floorTexture) {
    const geometry = new THREE.PlaneGeometry(width, depth);
    const material = new THREE.ShaderMaterial({
      uniforms: makeWetFloorUniforms(theme, floorTexture),
      vertexShader: WET_FLOOR_VERTEX,
      fragmentShader: WET_FLOOR_FRAGMENT,
      side: THREE.FrontSide,
      toneMapped: true,
    });
    super(geometry, material);
    this.rotation.x = -Math.PI / 2;

    this.camera = new THREE.PerspectiveCamera();
    const renderTarget = new THREE.WebGLRenderTarget(512, 320, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    renderTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.renderTarget = renderTarget;
    material.uniforms.tDiffuse.value = renderTarget.texture;

    const scope = this;
    const reflectorPlane = new THREE.Plane();
    const normal = new THREE.Vector3();
    const reflectorWorldPosition = new THREE.Vector3();
    const cameraWorldPosition = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
    const lookAtPosition = new THREE.Vector3(0, 0, -1);
    const clipPlane = new THREE.Vector4();
    const view = new THREE.Vector3();
    const target = new THREE.Vector3();
    const q = new THREE.Vector4();
    const textureMatrix = new THREE.Matrix4();
    const virtualCamera = this.camera;
    const clipBias = 0.0025;

    const textureMatrixUniform = new THREE.Matrix4();
    material.uniforms.textureMatrix = { value: textureMatrixUniform };
    this.textureMatrix = textureMatrix;
    this.renderCount = 0;

    this.onBeforeRender = function (renderer, scene, camera) {
      reflectorWorldPosition.setFromMatrixPosition(scope.matrixWorld);
      cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
      rotationMatrix.extractRotation(scope.matrixWorld);
      normal.set(0, 0, 1);
      normal.applyMatrix4(rotationMatrix);
      view.subVectors(reflectorWorldPosition, cameraWorldPosition);
      if (view.dot(normal) > 0) return;
      view.reflect(normal).negate();
      view.add(reflectorWorldPosition);
      rotationMatrix.extractRotation(camera.matrixWorld);
      lookAtPosition.set(0, 0, -1);
      lookAtPosition.applyMatrix4(rotationMatrix);
      lookAtPosition.add(cameraWorldPosition);
      target.subVectors(reflectorWorldPosition, lookAtPosition);
      target.reflect(normal).negate();
      target.add(reflectorWorldPosition);
      virtualCamera.position.copy(view);
      virtualCamera.up.set(0, 1, 0);
      virtualCamera.up.applyMatrix4(rotationMatrix);
      virtualCamera.up.reflect(normal);
      virtualCamera.lookAt(target);
      virtualCamera.far = camera.far;
      virtualCamera.aspect = camera.aspect;
      virtualCamera.fov = camera.fov;
      virtualCamera.near = camera.near;
      virtualCamera.updateProjectionMatrix();
      virtualCamera.updateMatrixWorld();
      virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

      textureMatrix.set(
        0.5, 0.0, 0.0, 0.5,
        0.0, 0.5, 0.0, 0.5,
        0.0, 0.0, 0.5, 0.5,
        0.0, 0.0, 0.0, 1.0
      );
      textureMatrix.multiply(virtualCamera.projectionMatrix);
      textureMatrix.multiply(virtualCamera.matrixWorldInverse);
      textureMatrix.multiply(scope.matrixWorld);
      textureMatrixUniform.copy(textureMatrix);

      reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
      reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);
      clipPlane.set(reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant);
      const projectionMatrix = virtualCamera.projectionMatrix;
      q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
      q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
      q.z = -1.0;
      q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];
      clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
      projectionMatrix.elements[2] = clipPlane.x;
      projectionMatrix.elements[6] = clipPlane.y;
      projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias;
      projectionMatrix.elements[14] = clipPlane.w;

      scope.visible = false;
      const currentRenderTarget = renderer.getRenderTarget();
      const currentXrEnabled = renderer.xr.enabled;
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
      const currentAutoClear = renderer.autoClear;
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.autoClear = false;
      renderer.setRenderTarget(renderTarget);
      renderer.state.buffers.depth.setMask(true);
      renderer.clear();
      renderer.render(scene, virtualCamera);
      renderer.xr.enabled = currentXrEnabled;
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
      renderer.autoClear = currentAutoClear;
      renderer.setRenderTarget(currentRenderTarget);
      scope.visible = true;
      scope.renderCount++;
    };
  }

  update(time) {
    this.material.uniforms.uTime.value = time;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.renderTarget.dispose();
  }
}

/* --------------------------------------------------------------------------
   Atmosphere
   -------------------------------------------------------------------------- */

function createDustField() {
  const count = 460;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = rand(-11, 7.4);
    positions[i * 3 + 1] = rand(0.2, 5.2);
    positions[i * 3 + 2] = rand(-100, 100);
    speeds[i * 3] = rand(-0.025, 0.025);
    speeds[i * 3 + 1] = rand(0.008, 0.035);
    speeds[i * 3 + 2] = rand(-0.03, 0.03);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xc7c0a9,
    size: 0.034,
    map: SPARK_TEXTURE,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 3;
  return { points, geometry, material, speeds, count };
}

function updateDust(dt, time) {
  if (!runtime.dust) return;
  const pos = runtime.dust.geometry.attributes.position;
  const arr = pos.array;
  const cam = runtime.worldCamera.position;
  const speeds = runtime.dust.speeds;
  for (let i = 0; i < runtime.dust.count; i++) {
    const idx = i * 3;
    arr[idx] += (speeds[idx] + Math.sin(time * 0.15 + i) * 0.012) * dt;
    arr[idx + 1] += speeds[idx + 1] * dt;
    arr[idx + 2] += speeds[idx + 2] * dt;
    if (arr[idx + 1] > 5.3) arr[idx + 1] = 0.2;
    if (arr[idx + 1] < 0.1) arr[idx + 1] = 5.0;
    if (arr[idx] > 8.0) arr[idx] = -11;
    if (arr[idx] < -12.5) arr[idx] = 7.0;
    if (arr[idx + 2] < cam.z - 55) arr[idx + 2] = cam.z + 55;
    if (arr[idx + 2] > cam.z + 55) arr[idx + 2] = cam.z - 55;
  }
  pos.needsUpdate = true;
  runtime.dust.material.opacity = 0.3 + Math.sin(time * 0.7) * 0.03;
}

function disposeGroup(root) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose());
      else obj.material.dispose();
    }
  });
}

function removeTracerObjects() {
  if (!runtime.worldRoot) return;
  for (const item of runtime.tracers) {
    if (item.mesh) item.mesh.removeFromParent();
    if (item.mesh) item.mesh.geometry.dispose();
    if (item.mesh) item.mesh.material.dispose();
  }
  runtime.tracers.length = 0;
}
