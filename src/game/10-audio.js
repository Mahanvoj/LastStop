/* ==========================================================================
   Procedural audio — no external samples
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    this.master = null;
    this.sfx = null;
    this.musicBus = null;
    this.reverbInput = null;
    this.whiteNoise = null;
    this.brownNoise = null;
    this.musicMode = 'menu';
    this.musicStep = 0;
    this.nextStepTime = 0;
    this.bpm = 112;
    this.trainRumble = null;
    this.rideRumble = null;
    this.ambientNodes = [];
    this.footToggle = false;
    this.lastHurt = 0;
    this.mutedGain = 0.58;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.mutedGain;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 22;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.28;
    master.connect(compressor);
    compressor.connect(ctx.destination);

    const sfx = ctx.createGain();
    sfx.gain.value = 0.82;
    sfx.connect(master);

    const musicBus = ctx.createGain();
    musicBus.gain.value = 0.55;
    musicBus.connect(master);

    const convolver = ctx.createConvolver();
    convolver.buffer = this._makeImpulse(1.8);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.17;
    const reverbInput = ctx.createGain();
    reverbInput.gain.value = 0.8;
    reverbInput.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(master);

    this.master = master;
    this.sfx = sfx;
    this.musicBus = musicBus;
    this.reverbInput = reverbInput;

    this.whiteNoise = this._makeNoise(2.4, false);
    this.brownNoise = this._makeNoise(3.2, true);
    this.ready = true;

    this._startAmbient();
    this._startTrainBed();
    this.nextStepTime = ctx.currentTime + 0.1;
    this.setMusicMode('menu');

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  }

  _makeNoise(seconds, brown = false) {
    const ctx = this.ctx;
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.018 * white) / 1.018;
        data[i] = last * 3.5;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  _makeImpulse(seconds) {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const decay = Math.pow(1 - t, 2.8);
        data[i] = (Math.random() * 2 - 1) * decay * (channel ? 0.84 : 1);
      }
    }
    return buffer;
  }

  _now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  _connect(node, send = 0, pan = 0) {
    if (!this.ctx) return;
    let tail = node;
    if (pan !== 0 && this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      tail.connect(panner);
      tail = panner;
    }
    tail.connect(this.sfx);
    if (send > 0) {
      const sendGain = this.ctx.createGain();
      sendGain.gain.value = send;
      tail.connect(sendGain);
      sendGain.connect(this.reverbInput);
    }
  }

  _tone({
    freq = 220, endFreq = null, type = 'sine', duration = 0.15, gain = 0.1,
    attack = 0.004, release = null, delay = 0, filterFreq = null,
    filterType = 'lowpass', q = 0.8, send = 0.08, pan = 0, detune = 0,
  } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    }
    if (detune) osc.detune.value = detune;
    const releaseTime = release === null ? duration : release;
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.linearRampToValueAtTime(gain, start + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(attack + 0.01, duration + releaseTime));
    let out = osc;
    if (filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, start);
      filter.Q.value = q;
      out.connect(filter);
      out = filter;
    }
    out.connect(gainNode);
    this._connect(gainNode, send, pan);
    osc.start(start);
    osc.stop(start + duration + releaseTime + 0.05);
  }

  _noise({
    duration = 0.10, gain = 0.1, filterFreq = 1200, filterType = 'bandpass',
    q = 0.8, attack = 0.0015, release = 0.025, delay = 0, send = 0.08,
    pan = 0, playbackRate = 1, brown = false,
  } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = brown ? this.brownNoise : this.whiteNoise;
    src.loop = true;
    src.playbackRate.value = playbackRate;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, start);
    filter.Q.value = q;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.linearRampToValueAtTime(gain, start + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(attack + 0.01, duration + release));
    src.connect(filter);
    filter.connect(gainNode);
    this._connect(gainNode, send, pan);
    src.start(start, Math.random() * 0.8);
    src.stop(start + duration + release + 0.05);
  }

  _startAmbient() {
    if (!this.ready) return;
    const ctx = this.ctx;
    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.32;
    const ambience = ctx.createGain();
    ambience.gain.value = 0.24;
    ambientGain.connect(ambience);
    ambience.connect(this.master);

    const rumble = ctx.createBufferSource();
    rumble.buffer = this.brownNoise;
    rumble.loop = true;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 135;
    rumbleFilter.Q.value = 0.7;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.10;
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(ambientGain);
    rumble.start();

    const drone1 = ctx.createOscillator();
    drone1.type = 'sine';
    drone1.frequency.value = 37;
    const drone2 = ctx.createOscillator();
    drone2.type = 'triangle';
    drone2.frequency.value = 55.5;
    drone2.detune.value = -7;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.017;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 150;
    drone1.connect(droneFilter);
    drone2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(ambientGain);
    drone1.start();
    drone2.start();

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.065;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.013;
    lfo.connect(lfoGain);
    lfoGain.connect(ambientGain.gain);
    lfo.start();

    this.ambientNodes.push(rumble, drone1, drone2, lfo);
  }

  _startTrainBed() {
    if (!this.ready) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.brownNoise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 1.1;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfx);
    src.start();

    const wheel = ctx.createOscillator();
    wheel.type = 'triangle';
    wheel.frequency.value = 32;
    const wheelGain = ctx.createGain();
    wheelGain.gain.value = 0;
    wheel.connect(wheelGain);
    wheelGain.connect(this.sfx);
    wheel.start();

    this.trainRumble = { src, filter, gain, wheel, wheelGain };
  }

  setTrainProximity(proximity, speed = 0) {
    if (!this.ready || !this.trainRumble) return;
    const now = this.ctx.currentTime;
    const target = clamp(proximity, 0, 1) * 0.42;
    this.trainRumble.gain.gain.cancelScheduledValues(now);
    this.trainRumble.gain.gain.setTargetAtTime(target, now, 0.12);
    this.trainRumble.filter.frequency.setTargetAtTime(170 + clamp(speed, 0, 1) * 380, now, 0.2);
    this.trainRumble.wheelGain.gain.setTargetAtTime(clamp(proximity, 0, 1) * 0.035, now, 0.2);
    this.trainRumble.wheel.frequency.setTargetAtTime(25 + clamp(speed, 0, 1) * 22, now, 0.2);
  }

  startTrainApproach() {
    if (!this.ready) return;
    this._tone({ freq: 220, endFreq: 110, type: 'sawtooth', duration: 0.9, gain: 0.06, filterFreq: 520, filterType: 'lowpass', send: 0.32 });
    this._tone({ freq: 277, endFreq: 138, type: 'sawtooth', duration: 1.1, gain: 0.045, filterFreq: 440, filterType: 'lowpass', send: 0.4, delay: 0.13 });
    this._tone({ freq: 92, endFreq: 64, type: 'triangle', duration: 1.5, gain: 0.06, send: 0.14 });
  }

  trainBrake() {
    if (!this.ready) return;
    this._noise({ duration: 2.6, gain: 0.16, filterFreq: 3200, filterType: 'highpass', q: 0.7, attack: 0.1, release: 0.8, send: 0.3 });
    this._tone({ freq: 2800, endFreq: 1500, type: 'sine', duration: 1.4, gain: 0.026, attack: 0.08, release: 0.9, send: 0.42 });
    this._tone({ freq: 4100, endFreq: 2300, type: 'sine', duration: 1.0, gain: 0.012, attack: 0.12, release: 0.7, send: 0.5 });
    this._noise({ duration: 0.6, gain: 0.25, filterFreq: 130, filterType: 'lowpass', q: 0.6, attack: 0.005, send: 0.2, delay: 1.8 });
  }

  trainDoors(open = true) {
    if (!this.ready) return;
    this._noise({ duration: 0.55, gain: 0.12, filterFreq: 2700, filterType: 'highpass', q: 0.55, attack: 0.012, release: 0.3, send: 0.35 });
    this._tone({ freq: open ? 660 : 440, endFreq: open ? 880 : 330, type: 'sine', duration: 0.16, gain: 0.06, send: 0.5, delay: 0.08 });
    this._tone({ freq: open ? 880 : 330, type: 'sine', duration: 0.3, gain: 0.035, send: 0.6, delay: 0.27 });
    this._tone({ freq: 58, endFreq: 40, type: 'sine', duration: 0.3, gain: 0.22, send: 0.2, delay: open ? 0.44 : 0.28 });
    this._noise({ duration: 0.1, gain: 0.12, filterFreq: 900, filterType: 'bandpass', q: 1.2, delay: 0.47, send: 0.2 });
  }

  stationChime() {
    if (!this.ready) return;
    const notes = [523.25, 659.25, 783.99, 659.25];
    notes.forEach((freq, i) => {
      this._tone({ freq, type: 'sine', duration: 0.55, gain: 0.035, attack: 0.02, release: 0.8, send: 0.72, delay: i * 0.26 });
      this._tone({ freq: freq * 2, type: 'sine', duration: 0.32, gain: 0.012, attack: 0.01, release: 0.5, send: 0.5, delay: i * 0.26 + 0.01 });
    });
  }

  shot(kind = 'pistol') {
    if (!this.ready) return;
    if (kind === 'pistol') {
      this._noise({ duration: 0.085, gain: 0.26, filterFreq: 1300, filterType: 'highpass', q: 0.65, attack: 0.001, send: 0.24 });
      this._noise({ duration: 0.13, gain: 0.12, filterFreq: 260, filterType: 'bandpass', q: 1.4, attack: 0.001, send: 0.15 });
      this._tone({ freq: 180, endFreq: 47, type: 'triangle', duration: 0.12, gain: 0.3, attack: 0.001, send: 0.12 });
      this._tone({ freq: 78, endFreq: 34, type: 'sine', duration: 0.2, gain: 0.18, send: 0.1 });
      this._noise({ duration: 0.055, gain: 0.06, filterFreq: 4600, filterType: 'highpass', attack: 0.001, send: 0.45, delay: 0.006 });
    } else if (kind === 'smg') {
      this._noise({ duration: 0.052, gain: 0.21, filterFreq: 1900, filterType: 'highpass', q: 0.7, attack: 0.001, send: 0.16 });
      this._tone({ freq: 160, endFreq: 52, type: 'triangle', duration: 0.07, gain: 0.22, attack: 0.001, send: 0.1 });
      this._tone({ freq: 70, endFreq: 40, type: 'sine', duration: 0.09, gain: 0.12, send: 0.06 });
    } else {
      this._noise({ duration: 0.23, gain: 0.36, filterFreq: 900, filterType: 'lowpass', q: 0.5, attack: 0.001, release: 0.18, send: 0.38 });
      this._noise({ duration: 0.15, gain: 0.2, filterFreq: 2200, filterType: 'highpass', attack: 0.001, send: 0.2 });
      this._tone({ freq: 105, endFreq: 33, type: 'triangle', duration: 0.2, gain: 0.42, attack: 0.001, release: 0.18, send: 0.2 });
      this._tone({ freq: 57, endFreq: 27, type: 'sine', duration: 0.34, gain: 0.26, attack: 0.001, release: 0.25, send: 0.16 });
      this._noise({ duration: 0.34, gain: 0.09, filterFreq: 1700, filterType: 'bandpass', q: 1, attack: 0.005, release: 0.3, send: 0.42, delay: 0.09 });
    }
  }

  dryFire() {
    if (!this.ready) return;
    this._noise({ duration: 0.025, gain: 0.14, filterFreq: 2800, filterType: 'bandpass', q: 3, send: 0.1 });
    this._tone({ freq: 1200, endFreq: 710, type: 'square', duration: 0.018, gain: 0.025, send: 0.1 });
  }

  reload(stage = 'out') {
    if (!this.ready) return;
    if (stage === 'out') {
      this._noise({ duration: 0.04, gain: 0.10, filterFreq: 1500, filterType: 'bandpass', q: 2.5, send: 0.18 });
      this._tone({ freq: 360, endFreq: 170, type: 'square', duration: 0.055, gain: 0.028, send: 0.2, delay: 0.07 });
    } else if (stage === 'mag') {
      this._noise({ duration: 0.08, gain: 0.12, filterFreq: 800, filterType: 'bandpass', q: 1.5, send: 0.2 });
      this._tone({ freq: 180, endFreq: 95, type: 'triangle', duration: 0.09, gain: 0.12, send: 0.15 });
    } else if (stage === 'in') {
      this._noise({ duration: 0.05, gain: 0.14, filterFreq: 1900, filterType: 'bandpass', q: 2, send: 0.2 });
      this._tone({ freq: 280, endFreq: 480, type: 'square', duration: 0.04, gain: 0.035, send: 0.22 });
      this._tone({ freq: 900, endFreq: 400, type: 'triangle', duration: 0.05, gain: 0.05, send: 0.2, delay: 0.09 });
    } else {
      this._noise({ duration: 0.03, gain: 0.13, filterFreq: 2500, filterType: 'highpass', send: 0.15 });
    }
  }

  weaponSwitch() {
    if (!this.ready) return;
    this._noise({ duration: 0.045, gain: 0.08, filterFreq: 1600, filterType: 'bandpass', q: 1.2, send: 0.15 });
    this._tone({ freq: 620, endFreq: 360, type: 'triangle', duration: 0.055, gain: 0.03, send: 0.2, delay: 0.06 });
  }

  footstep(sprint = false) {
    if (!this.ready) return;
    this.footToggle = !this.footToggle;
    this._noise({
      duration: sprint ? 0.08 : 0.11,
      gain: sprint ? 0.055 : 0.036,
      filterFreq: this.footToggle ? 230 : 190,
      filterType: 'lowpass',
      q: 0.8,
      attack: 0.003,
      release: 0.08,
      send: 0.055,
      playbackRate: this.footToggle ? 0.9 : 1.05,
    });
    this._noise({ duration: 0.035, gain: 0.012, filterFreq: 3000, filterType: 'highpass', send: 0.02 });
  }

  jump() {
    if (!this.ready) return;
    this._noise({ duration: 0.08, gain: 0.035, filterFreq: 500, filterType: 'lowpass', send: 0.05 });
    this._tone({ freq: 110, endFreq: 75, type: 'triangle', duration: 0.08, gain: 0.035, send: 0.03 });
  }

  land(hard = false) {
    if (!this.ready) return;
    this._noise({ duration: hard ? 0.16 : 0.10, gain: hard ? 0.10 : 0.06, filterFreq: 200, filterType: 'lowpass', send: 0.06 });
    this._tone({ freq: hard ? 83 : 120, endFreq: 46, type: 'sine', duration: 0.12, gain: hard ? 0.12 : 0.07, send: 0.05 });
  }

  hitMarker(headshot = false) {
    if (!this.ready) return;
    this._tone({ freq: headshot ? 1560 : 1160, endFreq: headshot ? 1080 : 820, type: 'sine', duration: 0.055, gain: headshot ? 0.055 : 0.032, send: 0.1 });
    if (headshot) {
      this._tone({ freq: 2010, type: 'triangle', duration: 0.024, gain: 0.018, send: 0.08, delay: 0.012 });
    }
  }

  enemyHit() {
    if (!this.ready) return;
    this._noise({ duration: 0.055, gain: 0.05, filterFreq: 870, filterType: 'bandpass', q: 1.6, send: 0.08 });
    this._tone({ freq: 190, endFreq: 130, type: 'triangle', duration: 0.055, gain: 0.035, send: 0.06 });
  }

  enemyDeath() {
    if (!this.ready) return;
    this._tone({ freq: 240, endFreq: 42, type: 'sawtooth', duration: 0.45, gain: 0.06, filterFreq: 760, filterType: 'lowpass', send: 0.22 });
    this._noise({ duration: 0.3, gain: 0.10, filterFreq: 400, filterType: 'lowpass', send: 0.2 });
    this._tone({ freq: 90, endFreq: 30, type: 'sine', duration: 0.4, gain: 0.08, send: 0.15, delay: 0.06 });
  }

  enemyAlert(pan = 0) {
    if (!this.ready) return;
    this._tone({ freq: 330, endFreq: 190, type: 'sawtooth', duration: 0.18, gain: 0.026, filterFreq: 900, filterType: 'lowpass', send: 0.25, pan });
    this._tone({ freq: 440, endFreq: 250, type: 'triangle', duration: 0.14, gain: 0.02, send: 0.3, pan, delay: 0.12 });
  }

  enemyShot(pan = 0) {
    if (!this.ready) return;
    this._tone({ freq: 1200, endFreq: 210, type: 'sawtooth', duration: 0.14, gain: 0.06, filterFreq: 2300, filterType: 'lowpass', send: 0.2, pan });
    this._noise({ duration: 0.11, gain: 0.055, filterFreq: 1600, filterType: 'bandpass', q: 1.5, send: 0.13, pan });
  }

  enemyMelee(pan = 0) {
    if (!this.ready) return;
    this._noise({ duration: 0.12, gain: 0.045, filterFreq: 2800, filterType: 'highpass', send: 0.08, pan });
    this._tone({ freq: 180, endFreq: 95, type: 'triangle', duration: 0.1, gain: 0.035, send: 0.06, pan });
  }

  playerHit() {
    if (!this.ready) return;
    const now = this._now();
    if (now - this.lastHurt < 0.09) return;
    this.lastHurt = now;
    this._tone({ freq: 92, endFreq: 38, type: 'sine', duration: 0.22, gain: 0.28, send: 0.16 });
    this._noise({ duration: 0.20, gain: 0.14, filterFreq: 310, filterType: 'lowpass', q: 1.3, send: 0.1 });
    this._noise({ duration: 0.06, gain: 0.08, filterFreq: 1900, filterType: 'highpass', send: 0.08 });
  }

  armorBreak() {
    if (!this.ready) return;
    this._noise({ duration: 0.22, gain: 0.12, filterFreq: 3100, filterType: 'highpass', send: 0.3 });
    this._tone({ freq: 730, endFreq: 240, type: 'square', duration: 0.25, gain: 0.03, filterFreq: 1800, send: 0.24 });
  }

  heartbeat() {
    if (!this.ready) return;
    this._tone({ freq: 68, endFreq: 38, type: 'sine', duration: 0.13, gain: 0.12, send: 0.05 });
    this._tone({ freq: 61, endFreq: 31, type: 'sine', duration: 0.16, gain: 0.08, send: 0.04, delay: 0.22 });
  }

  pickup(kind = 'health') {
    if (!this.ready) return;
    if (kind === 'health') {
      [523, 659, 880].forEach((freq, i) => this._tone({ freq, type: 'sine', duration: 0.24, gain: 0.035, attack: 0.008, send: 0.45, delay: i * 0.065 }));
    } else if (kind === 'armor') {
      [330, 494, 660].forEach((freq, i) => this._tone({ freq, type: 'triangle', duration: 0.17, gain: 0.03, send: 0.35, delay: i * 0.055 }));
    } else {
      this._noise({ duration: 0.07, gain: 0.06, filterFreq: 1700, filterType: 'bandpass', q: 2, send: 0.1 });
      this._tone({ freq: 220, endFreq: 440, type: 'square', duration: 0.06, gain: 0.02, send: 0.2 });
    }
  }

  weaponEmpty() {
    if (!this.ready) return;
    this._tone({ freq: 420, endFreq: 270, type: 'square', duration: 0.06, gain: 0.025, send: 0.16 });
  }

  waveStart() {
    if (!this.ready) return;
    this._tone({ freq: 110, endFreq: 92, type: 'sawtooth', duration: 1.1, gain: 0.06, filterFreq: 400, filterType: 'lowpass', send: 0.5 });
    this._tone({ freq: 164.8, endFreq: 138.6, type: 'sawtooth', duration: 1.2, gain: 0.04, filterFreq: 500, filterType: 'lowpass', send: 0.55, delay: 0.12 });
    this._tone({ freq: 880, type: 'sine', duration: 0.09, gain: 0.025, send: 0.3, delay: 0.02 });
    this._tone({ freq: 880, type: 'sine', duration: 0.09, gain: 0.018, send: 0.3, delay: 0.32 });
  }

  waveClear() {
    if (!this.ready) return;
    const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      this._tone({ freq, type: 'triangle', duration: 0.35, gain: 0.035, attack: 0.01, release: 0.6, send: 0.65, delay: i * 0.105 });
    });
    this._tone({ freq: 98, type: 'sine', duration: 1.4, gain: 0.06, send: 0.3 });
  }

  gameOver() {
    if (!this.ready) return;
    this._tone({ freq: 220, endFreq: 55, type: 'sawtooth', duration: 2.6, gain: 0.075, filterFreq: 680, filterType: 'lowpass', send: 0.7 });
    this._tone({ freq: 55, endFreq: 24, type: 'sine', duration: 2.8, gain: 0.15, send: 0.4 });
    this._noise({ duration: 1.5, gain: 0.09, filterFreq: 300, filterType: 'lowpass', attack: 0.05, release: 1.2, send: 0.5 });
  }

  uiClick() {
    if (!this.ready) return;
    this._tone({ freq: 740, endFreq: 480, type: 'triangle', duration: 0.035, gain: 0.018, send: 0.2 });
  }

  setMusicMode(mode) {
    if (!this.ready) return;
    this.musicMode = mode;
    const target = (mode === 'combat' || mode === 'cleared') ? 0.46 : mode === 'menu' ? 0.34 : mode === 'dead' ? 0.12 : 0.38;
    this.musicBus.gain.setTargetAtTime(target, this.ctx.currentTime, 1.2);
  }

  setPaused(paused) {
    if (!this.ready) return;
    if (paused) {
      this.ctx.suspend().catch(() => {});
    } else {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    if (!this.ready) return false;
    this.muted = !this.muted;
    this.master.gain.setTargetAtTime(this.muted ? 0.0001 : this.mutedGain, this.ctx.currentTime, 0.06);
    return this.muted;
  }

  update() {
    if (!this.ready || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.nextStepTime < now + 0.5) {
      while (this.nextStepTime < now + 0.28) {
        this._scheduleMusicStep(this.musicStep, this.nextStepTime);
        this.musicStep++;
        this.nextStepTime += (60 / this.bpm) / 4;
      }
    }
  }

  _scheduleMusicStep(step, time) {
    const mode = this.musicMode;
    const patternStep = step % 16;
    const combat = mode === 'combat' || mode === 'cleared';
    if (mode === 'menu') {
      if (patternStep % 8 === 0) {
        this._musicTone(55, 0.5, 0.012, time);
        this._musicTone(82.4, 0.45, 0.008, time + 0.04);
      }
      if (patternStep % 8 === 4) this._musicTone(110, 0.7, 0.006, time);
      return;
    }
    if (!combat) {
      if (patternStep === 0) this._musicTone(55, 0.7, 0.01, time);
      if (patternStep === 8) this._musicTone(73.4, 0.55, 0.006, time);
      return;
    }
    const bassPattern = [55, 0, 0, 0, 55, 0, 65.4, 0, 55, 0, 0, 0, 73.4, 0, 65.4, 49];
    if (bassPattern[patternStep]) {
      this._musicTone(bassPattern[patternStep], 0.18, 0.036, time, 'sawtooth', 260);
    }
    if (patternStep % 4 === 0) {
      this._musicKick(time, patternStep === 0 ? 0.12 : 0.085);
    }
    if (patternStep === 6 || patternStep === 14) {
      this._musicNoise(time, 0.09, 0.018, 900, 'bandpass');
    }
    if (patternStep % 2 === 1) {
      this._musicNoise(time, 0.03, 0.0045, 6400, 'highpass');
    }
    if (patternStep === 11 && G.round > 1) {
      this._musicNoise(time, 0.12, 0.011, 340, 'bandpass');
    }
    if (patternStep === 0 && G.round > 2) {
      this._musicTone(110, 1.8, 0.009, time, 'triangle', 700);
    }
  }

  _musicTone(freq, duration, gain, time, type = 'triangle', filter = 0) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + duration + 0.04);
  }

  _musicKick(time, gain = 0.1) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.13);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(g);
    g.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.24);
  }

  _musicNoise(time, duration, gain, filterFreq, filterType) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.whiteNoise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.musicBus);
    src.start(time, Math.random());
    src.stop(time + duration + 0.02);
  }
}
