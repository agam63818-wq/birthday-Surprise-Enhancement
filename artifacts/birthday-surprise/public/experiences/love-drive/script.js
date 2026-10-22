/**
 * LOVE DRIVE — AUDITED & FIXED GAME IMPLEMENTATION
 * Three.js r128 | Mission State Machine:
 * INTRO -> DRIVING -> COLLECTING -> RETURN_TO_DESTINATION -> COMPLETED
 */
(function () {
  'use strict';

  const STATE = {
    INTRO: 'INTRO',
    DRIVING: 'DRIVING',
    COLLECTING: 'COLLECTING',
    RETURN_TO_DESTINATION: 'RETURN_TO_DESTINATION',
    COMPLETED: 'COMPLETED'
  };

  const api = window.__experience;
  if (!api) return;

  const DEFAULT_CONFIG = {
    recipientName: '', senderName: '', missionLabel: 'MISSION', progressLabel: 'Mission Collectibles Progress',
    objective: 'Find the 3 Hidden Surprises', drivingObjective: 'Crash glowing gold blocks & find 3 Hidden Surprises',
    exploringObjective: 'Keep exploring! {remaining} surprise(s) left to collect',
    allFoundObjective: 'All 3 found! Follow the Golden Hearts to the Postbox 📮', completedObjective: 'Mission Complete! Happy Birthday! 🎉',
    introToast: '✨ Welcome to Love Drive! Find the 3 Hidden Surprises ✨', hintToast: 'Steer & crash through glowing gold blocks! 🚗💨',
    brokenBlockToast: '✨ Secret Block Broken! Drive into the Surprise ahead!',
    collectLabels: { letter: 'Love Letter', gift: 'Birthday Gift', heart: 'Golden Heart' },
    collectedToasts: { letter: '💌 Love Letter Collected!', gift: '🎁 Birthday Gift Collected!', heart: '💛 Golden Heart Collected!' },
    allCollectedToast: '💖 All 3 Surprises Found! Deliver them to the Postbox ahead!',
    deliveryToast: '📮 Postbox Locked! Collect {remaining} more hidden surprise(s) along the road first!',
    finalTitle: 'Happy Birthday! ✨',
    finalMessage: 'You crashed through every obstacle and found all three hidden surprises! Ready for your special birthday message?',
    letterTitle: 'HAPPY BIRTHDAY & I LOVE YOU', letterPrompt: 'Your Special Birthday Surprise Message:',
    letterBody: 'To my favorite person, every road is better with you by my side. You make my heart race more than any engine ever could. Wishing you the happiest birthday filled with love and magic! 💖🎂✨',
    letterFooter: 'Screenshot & cherish this special moment 💌', continueLabel: 'Back to Surprise 💌', replayLabel: 'Replay Mission 🔄',
    letterReplayLabel: 'Keep Driving / Replay 💖', pauseLabel: 'Pause Game', pauseTitle: 'Game Paused',
    pauseBody: 'Take a breath on the magical road.', resumeLabel: 'Resume Drive', restartLabel: 'Restart Mission 🔄',
    skipIntroLabel: 'Skip Intro ➔', skipRevealLabel: 'Skip Reveal ➔', closeLabel: 'Close message',
    steerLeftLabel: 'Steer Left', steerRightLabel: 'Steer Right', brakeLabel: 'Brake or Reverse', accelerateLabel: 'Accelerate'
  };

  function mergeConfig(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const merged = Object.assign({}, DEFAULT_CONFIG, source);
    merged.collectLabels = Object.assign({}, DEFAULT_CONFIG.collectLabels, source.collectLabels || {});
    merged.collectedToasts = Object.assign({}, DEFAULT_CONFIG.collectedToasts, source.collectedToasts || {});
    if (!String(merged.finalTitle || '').trim()) {
      merged.finalTitle = merged.recipientName ? `Happy Birthday, ${merged.recipientName}! ✨` : DEFAULT_CONFIG.finalTitle;
    }
    return merged;
  }
  function setText(element, value) { if (element) element.textContent = value == null ? '' : String(value); }
  function template(value, remaining) { return String(value || '').replace(/\{remaining\}/g, String(remaining)); }
  function focusElement(element) { try { element && element.focus({ preventScroll: true }); } catch (_) {} }

  const counters = { instances: 0, disposals: 0, listenersRemoved: 0, geometries: 0, materials: 0, textures: 0, renderTargets: 0, canvasesRemoved: 0, audioClosed: 0 };
  let gameInstance = null;
  const bridgeSubscriptions = [];
  Object.defineProperty(window, '__loveDriveDebug', { configurable: false, value: {
    get instances() { return counters.instances; }, get disposals() { return counters.disposals; },
    get activeInstances() { return gameInstance && !gameInstance.isDisposed ? 1 : 0; },
    get activeLoops() { return gameInstance && gameInstance.rafId !== null ? 1 : 0; },
    get activeTimers() { return gameInstance ? gameInstance.activeTimeouts.size : 0; },
    get activeListeners() { return gameInstance ? gameInstance.listeners.length : 0; },
    get listenersRemoved() { return counters.listenersRemoved; },
    get geometriesDisposed() { return counters.geometries; }, get materialsDisposed() { return counters.materials; },
    get texturesDisposed() { return counters.textures; }, get renderTargetsDisposed() { return counters.renderTargets; },
    get canvasesRemoved() { return counters.canvasesRemoved; }, get audioClosed() { return counters.audioClosed; },
    get audioState() { return gameInstance && gameInstance.audioCtx ? gameInstance.audioCtx.state : 'none'; }
  } });

  class LoveDriveGame {
    constructor(options = {}) {
      this.container = document.getElementById('ld-canvas-container');
      if (!this.container) throw new Error('Love Drive container is missing.');
      this.config = mergeConfig(options.config);
      this.state = STATE.INTRO;
      this.isDisposed = false;
      this.hostActive = options.hostActive !== false;
      this.pauseReasons = new Set();
      if (!this.hostActive) this.pauseReasons.add('host');
      this.isPaused = this.pauseReasons.size > 0 || document.hidden;
      this.reducedMotion = Boolean(options.reducedMotion);
      this.rafId = null;
      this.lastFrameTime = 0;
      this.time = 0;

      this.collectedItems = new Set();
      this.totalRequired = 3;
      this.introTimer = 0;
      this.endingTriggered = false;
      this.completeSent = false;
      this.nextSent = false;
      this.lastEarlyWarningTime = 0;
      this.lastCollisionSfxTime = 0;

      this.activeTimeouts = new Set();
      this.toastTimeout = null;
      this.revealTimeout = null;
      this.orientationTimer = null;
      this.listeners = [];
      this.resizeObserver = null;
      this.activeModal = null;
      this.modalPreviousFocus = null;

      this.blocks = [];
      this.collectibles = [];
      this.particles = [];
      this.guideTrail = [];
      this.keys = { left: false, right: false, up: false, down: false };
      this.activePointers = new Map();
      this.carVelocity = 0;

      this.audioCtx = null;
      this.audioActivated = false;
      this.gestureUnlocked = false;
      this.audioSounds = new Set();

      try {
        if (!window.THREE) throw new Error('The bundled Three.js renderer did not load.');
        this.carPrevPos = new THREE.Vector3(0, 0, 10);
        this.initDOM();
        this.initSharedResources();
        this.initThree();
        this.buildWorld();
        this.animate = this.animate.bind(this);
        this.bindEvents();
        this.startIntro();
        this.startLoop();
        counters.instances += 1;
      } catch (error) {
        this.dispose();
        throw error;
      }
    }

    /* ==========================================
       TIMER MANAGEMENT
       ========================================== */
    scheduleTimeout(fn, delay) {
      const timer = { fn, remaining: delay, started: 0, id: null };
      timer.run = () => {
        this.activeTimeouts.delete(timer);
        timer.id = null;
        if (!this.isDisposed) fn();
      };
      this.activeTimeouts.add(timer);
      if (!this.isDisposed && !this.isPaused && !document.hidden) {
        timer.started = performance.now();
        timer.id = setTimeout(timer.run, delay);
      }
      return timer;
    }

    clearScheduledTimeout(timer) {
      if (!timer) return;
      if (timer.id !== null) clearTimeout(timer.id);
      timer.id = null;
      this.activeTimeouts.delete(timer);
    }

    clearAllScheduledTimeouts() {
      Array.from(this.activeTimeouts).forEach((timer) => this.clearScheduledTimeout(timer));
      this.toastTimeout = null;
      this.revealTimeout = null;
      this.orientationTimer = null;
    }

    pauseScheduledTimeouts() {
      const now = performance.now();
      this.activeTimeouts.forEach((timer) => {
        if (timer.id !== null) {
          clearTimeout(timer.id);
          timer.id = null;
          timer.remaining = Math.max(0, timer.remaining - (now - timer.started));
        }
      });
    }

    resumeScheduledTimeouts() {
      this.activeTimeouts.forEach((timer) => {
        if (timer.id === null && !this.isDisposed && !this.isPaused && !document.hidden) {
          timer.started = performance.now();
          timer.id = setTimeout(timer.run, timer.remaining);
        }
      });
    }

    /* ==========================================
       GESTURE-GATED SINGLE WEBAUDIO SYSTEM
       ========================================== */
    activateAudioFromGesture() {
      this.gestureUnlocked = true;
      if (this.isDisposed || api.muted || this.isPaused || document.hidden || !this.hostActive) return;
      try {
        if (!this.audioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) return;
          this.audioCtx = new AudioContextClass();
          this.audioActivated = true;
        }
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
      } catch (_) {}
    }

    resumeAudio() {
      if (this.gestureUnlocked && this.audioActivated && this.audioCtx && !api.muted && !this.isPaused && !document.hidden && this.hostActive) {
        this.audioCtx.resume().catch(() => {});
      }
    }

    stopAudioSounds() {
      this.audioSounds.forEach((sound) => {
        try { sound.osc.stop(); } catch (_) {}
        try { sound.osc.disconnect(); sound.gain.disconnect(); } catch (_) {}
      });
      this.audioSounds.clear();
    }

    suspendAudio() {
      this.stopAudioSounds();
      if (this.audioCtx && this.audioCtx.state === 'running') this.audioCtx.suspend().catch(() => {});
    }

    playTone(freq, type = 'sine', duration = 0.18, vol = 0.11, slideFreq = null) {
      if (!this.audioCtx || !this.audioActivated || api.muted || this.isPaused || document.hidden || !this.hostActive) return;
      try {
        const ctx = this.audioCtx;
        if (ctx.state !== 'running') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, ctx.currentTime + duration);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        const sound = { osc, gain };
        this.audioSounds.add(sound);
        osc.onended = () => {
          this.audioSounds.delete(sound);
          try { osc.disconnect(); gain.disconnect(); } catch (_) {}
        };
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (_) {}
    }

    playSfx(type) {
      if (!this.audioCtx || !this.audioActivated || api.muted || this.isPaused || document.hidden || !this.hostActive) return;
      const now = performance.now();
      if (type === 'impact') {
        if (now - this.lastCollisionSfxTime < 220) return;
        this.lastCollisionSfxTime = now;
        this.playTone(155, 'triangle', 0.13, 0.13, 68);
        this.scheduleTimeout(() => this.playTone(310, 'sine', 0.09, 0.07, 175), 35);
      } else if (type === 'sparkle') {
        this.playTone(587.33, 'sine', 0.16, 0.09, 880);
      } else if (type === 'collect') {
        [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => this.scheduleTimeout(() => this.playTone(n, 'sine', 0.24, 0.12), i * 80));
      } else if (type === 'reveal') {
        [440, 554.37, 659.25, 880, 1108.73].forEach((n, i) => this.scheduleTimeout(() => this.playTone(n, 'triangle', 0.45, 0.11), i * 105));
      }
    }

    /* ==========================================
       DOM & HUD MANAGEMENT
       ========================================== */
    initDOM() {
      const byId = (id) => document.getElementById(id);
      this.elWrapper = byId('ld-game-wrapper');
      this.elObjective = byId('ld-objective-text');
      this.elCounter = byId('ld-counter-text');
      this.elToast = byId('ld-toast');
      this.elSkipBtn = byId('ld-btn-skip');
      this.elPauseModal = byId('ld-pause-modal');
      this.elFinalModal = byId('ld-final-modal');
      this.elFinalTitle = byId('ld-final-title');
      this.elFinalMsg = byId('ld-final-msg');
      this.elLoveModal = byId('love-modal');
      this.elMissionLabel = byId('ld-mission-label');
      this.elProgressPill = byId('ld-progress-pill');
      this.elPauseBtn = byId('ld-btn-pause');
      this.elPauseTitle = byId('ld-pause-title');
      this.elPauseBody = byId('ld-pause-body');
      this.elResumeBtn = byId('ld-btn-resume');
      this.elRestartPauseBtn = byId('ld-btn-restart-pause');
      this.elReplayBtn = byId('ld-btn-replay');
      this.elReadLetterBtn = byId('ld-btn-read-letter');
      this.elContinueBtn = byId('ld-btn-open-letter');
      this.elLoveContinueBtn = byId('love-continue-btn');
      this.elLetterReplayBtn = byId('save-modal-btn');
      this.elCloseLoveBtn = byId('close-modal');
      this.elLoveTitle = byId('ld-love-modal-heading');
      this.elLovePrompt = byId('ld-love-prompt');
      this.elLoveMessage = byId('love-message');
      this.elLoveFooter = byId('ld-love-footer');
      this.controlButtons = ['ld-btn-left', 'ld-btn-right', 'ld-btn-gas', 'ld-btn-brake'].map(byId).filter(Boolean);
      this.slots = { LETTER: byId('ld-slot-letter'), GIFT: byId('ld-slot-gift'), HEART: byId('ld-slot-heart') };
      this.applyConfig();
      this.elWrapper.classList.toggle('reduced-motion', this.reducedMotion);
    }

    applyConfig() {
      const c = this.config;
      setText(this.elMissionLabel, c.missionLabel);
      if (this.elProgressPill) this.elProgressPill.setAttribute('aria-label', c.progressLabel || DEFAULT_CONFIG.progressLabel);
      const slotConfig = { LETTER: 'letter', GIFT: 'gift', HEART: 'heart' };
      Object.keys(this.slots).forEach((key) => {
        const slot = this.slots[key];
        if (!slot) return;
        const label = c.collectLabels[slotConfig[key]];
        slot.title = label;
        slot.setAttribute('aria-label', label);
        slot.removeAttribute('aria-hidden');
      });
      setText(this.elFinalTitle, c.finalTitle);
      setText(this.elFinalMsg, c.finalMessage);
      setText(this.elReadLetterBtn, c.letterTitle || c.letterPrompt || 'Read Letter');
      setText(this.elContinueBtn, c.continueLabel || 'Continue');
      setText(this.elLoveContinueBtn, c.continueLabel || 'Continue');
      setText(this.elReplayBtn, c.replayLabel || 'Replay');
      setText(this.elLetterReplayBtn, c.letterReplayLabel || 'Replay');
      setText(this.elPauseTitle, c.pauseTitle);
      setText(this.elPauseBody, c.pauseBody);
      setText(this.elResumeBtn, c.resumeLabel || 'Resume');
      setText(this.elRestartPauseBtn, c.restartLabel || 'Replay');
      setText(this.elLoveTitle, c.letterTitle);
      setText(this.elLovePrompt, c.letterPrompt);
      setText(this.elLoveMessage, c.letterBody);
      setText(this.elLoveFooter, c.letterFooter);
      if (this.elPauseBtn) this.elPauseBtn.setAttribute('aria-label', c.pauseLabel || DEFAULT_CONFIG.pauseLabel);
      if (this.elCloseLoveBtn) this.elCloseLoveBtn.setAttribute('aria-label', c.closeLabel || DEFAULT_CONFIG.closeLabel);
      const labels = { 'ld-btn-left': c.steerLeftLabel || DEFAULT_CONFIG.steerLeftLabel, 'ld-btn-right': c.steerRightLabel || DEFAULT_CONFIG.steerRightLabel, 'ld-btn-brake': c.brakeLabel || DEFAULT_CONFIG.brakeLabel, 'ld-btn-gas': c.accelerateLabel || DEFAULT_CONFIG.accelerateLabel };
      Object.entries(labels).forEach(([id, label]) => { const element = document.getElementById(id); if (element) element.setAttribute('aria-label', label); });
      document.title = String(c.finalTitle || 'Love Drive');
    }

    showToast(msg, duration = 2600) {
      if (!this.elToast || this.isDisposed) return;
      setText(this.elToast, msg);
      this.elToast.classList.remove('ld-hidden');
      this.clearScheduledTimeout(this.toastTimeout);
      const timer = this.scheduleTimeout(() => {
        if (this.toastTimeout !== timer) return;
        if (this.elToast) { this.elToast.classList.add('ld-hidden'); setText(this.elToast, ''); }
        this.toastTimeout = null;
      }, duration);
      this.toastTimeout = timer;
    }

    updateHUD() {
      const count = this.collectedItems.size;
      setText(this.elCounter, `${count}/${this.totalRequired}`);
      Object.keys(this.slots).forEach((key) => {
        if (this.slots[key]) this.slots[key].classList.toggle('ld-collected', this.collectedItems.has(key));
      });
      if (!this.elObjective) return;
      if (this.state === STATE.COMPLETED) setText(this.elObjective, this.config.completedObjective);
      else if (this.state === STATE.INTRO) setText(this.elObjective, this.config.objective);
      else if (count === 0) setText(this.elObjective, this.config.drivingObjective);
      else if (count < this.totalRequired) setText(this.elObjective, template(this.config.exploringObjective, this.totalRequired - count));
      else setText(this.elObjective, this.config.allFoundObjective);
    }

    setReducedMotion(value) {
      this.reducedMotion = Boolean(value);
      if (this.elWrapper) this.elWrapper.classList.toggle('reduced-motion', this.reducedMotion);
      this.MAX_PARTICLES = this.reducedMotion ? 36 : 120;
      while (this.particles.length > this.MAX_PARTICLES) {
        const oldest = this.particles.shift();
        if (oldest && this.scene) this.scene.remove(oldest.mesh);
      }
      if (this.reducedMotion && this.state === STATE.INTRO) this.skipCurrentCinematic();
    }

    /* ==========================================
       SHARED THREE.JS RESOURCES (NO LEAKS)
       ========================================== */
    initSharedResources() {
      this.shared = {
        particleGeo: new THREE.BoxGeometry(0.32, 0.32, 0.32),
        particleMats: {
          pink: new THREE.MeshBasicMaterial({ color: 0xffb3c6 }),
          gold: new THREE.MeshBasicMaterial({ color: 0xffd166 }),
          rose: new THREE.MeshBasicMaterial({ color: 0xff6b9d }),
          white: new THREE.MeshBasicMaterial({ color: 0xfff0f5 })
        },
        blockGeos: {
          ordinary: new THREE.BoxGeometry(1.6, 1.6, 1.6),
          special: new THREE.BoxGeometry(2.2, 2.2, 2.2),
          beaconRing: new THREE.RingGeometry(1.4, 1.85, 24)
        },
        blockMats: {
          palette: [
            new THREE.MeshPhongMaterial({ color: 0xffb3c6, shininess: 30 }),
            new THREE.MeshPhongMaterial({ color: 0xfff3b0, shininess: 30 }),
            new THREE.MeshPhongMaterial({ color: 0xe0bbff, shininess: 30 }),
            new THREE.MeshPhongMaterial({ color: 0xffd6a5, shininess: 30 })
          ],
          special: new THREE.MeshPhongMaterial({
            color: 0xffd166,
            emissive: 0x663d00,
            shininess: 95
          }),
          beacon: new THREE.MeshBasicMaterial({
            color: 0xffd166,
            side: THREE.DoubleSide
          })
        },
        collectibleGeos: {
          letter: new THREE.BoxGeometry(1.6, 1.1, 0.3),
          letterSeal: new THREE.OctahedronGeometry(0.35, 0),
          gift: new THREE.BoxGeometry(1.35, 1.35, 1.35),
          giftRibbonV: new THREE.BoxGeometry(1.42, 1.42, 0.28),
          giftRibbonH: new THREE.BoxGeometry(0.28, 1.42, 1.42),
          heart: new THREE.OctahedronGeometry(1.0, 1),
          auraRing: new THREE.RingGeometry(1.2, 1.6, 24)
        },
        collectibleMats: {
          letter: new THREE.MeshPhongMaterial({ color: 0xfff0f5, emissive: 0xff4d79, emissiveIntensity: 0.35 }),
          letterSeal: new THREE.MeshBasicMaterial({ color: 0xff2d55 }),
          gift: new THREE.MeshPhongMaterial({ color: 0xff6b9d, emissive: 0xffb3c6, emissiveIntensity: 0.25 }),
          ribbon: new THREE.MeshBasicMaterial({ color: 0xffd166 }),
          heart: new THREE.MeshPhongMaterial({ color: 0xffd166, emissive: 0xffaa00, emissiveIntensity: 0.5 }),
          aura: new THREE.MeshBasicMaterial({ color: 0xfff3b0, side: THREE.DoubleSide })
        },
        trailGeo: new THREE.OctahedronGeometry(0.45, 0),
        trailMat: new THREE.MeshBasicMaterial({ color: 0xffd166 })
      };
      this.MAX_PARTICLES = this.reducedMotion ? 36 : 120;
    }

    initThree() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xffdde1);
      this.scene.fog = new THREE.FogExp2(0xffdde1, 0.0075);

      const rect = this.container.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 320);
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      this.container.replaceChildren();
      const canvas = this.renderer.domElement;
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', this.config.objective);
      canvas.setAttribute('role', 'application');
      this.container.appendChild(canvas);

      const ambient = new THREE.AmbientLight(0xfff0f5, 0.9);
      this.scene.add(ambient);
      const dirLight = new THREE.DirectionalLight(0xffe5ec, 0.85);
      dirLight.position.set(25, 45, 30);
      this.scene.add(dirLight);
    }

    /* ==========================================
       WORLD & ENTITIES
       ========================================== */
    buildWorld() {
      const floorGeo = new THREE.PlaneGeometry(240, 600);
      const floorMat = new THREE.MeshLambertMaterial({ color: 0xfce4ec });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.z = -180;
      this.scene.add(floor);

      const roadGeo = new THREE.PlaneGeometry(16, 480);
      const roadMat = new THREE.MeshLambertMaterial({ color: 0xe6ceff });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.02, -210);
      this.scene.add(road);

      const borderGeo = new THREE.BoxGeometry(0.4, 0.25, 480);
      const borderMat = new THREE.MeshLambertMaterial({ color: 0xffd166 });
      const leftBorder = new THREE.Mesh(borderGeo, borderMat);
      leftBorder.position.set(-8.2, 0.12, -210);
      const rightBorder = leftBorder.clone();
      rightBorder.position.x = 8.2;
      this.scene.add(leftBorder, rightBorder);

      this.createPinkCar();
      this.createPostboxDestination();
      this.createGuideTrail();
      this.populateBlocksAndSurprises();
    }

    createPinkCar() {
      this.car = new THREE.Group();

      const bodyGeo = new THREE.BoxGeometry(2.2, 0.8, 3.8);
      const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff6b9d, shininess: 60 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.7;
      this.car.add(body);

      const cabinGeo = new THREE.BoxGeometry(1.8, 0.65, 2.0);
      const cabinMat = new THREE.MeshPhongMaterial({ color: 0xfff0f6 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, 1.35, -0.2);
      this.car.add(cabin);

      const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x4a2545 });
      [
        [-1.15, 0.42, 1.2], [1.15, 0.42, 1.2],
        [-1.15, 0.42, -1.2], [1.15, 0.42, -1.2]
      ].forEach(([x, y, z]) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, y, z);
        this.car.add(w);
      });

      this.car.position.set(0, 0, 10);
      this.carPrevPos.copy(this.car.position);
      this.scene.add(this.car);
    }

    createPostboxDestination() {
      this.postbox = new THREE.Group();
      this.postbox.position.set(0, 0, -290);

      const standGeo = new THREE.CylinderGeometry(0.85, 0.95, 2.8, 16);
      const standMat = new THREE.MeshPhongMaterial({ color: 0xff4d79 });
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.position.y = 1.4;
      this.postbox.add(stand);

      const capGeo = new THREE.SphereGeometry(1.0, 16, 12);
      const capMat = new THREE.MeshPhongMaterial({ color: 0xffd166 });
      this.postboxLid = new THREE.Mesh(capGeo, capMat);
      this.postboxLid.position.y = 2.8;
      this.postbox.add(this.postboxLid);

      const ringGeo = new THREE.RingGeometry(3.0, 3.7, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      this.postbox.add(ring);

      this.scene.add(this.postbox);
    }

    createGuideTrail() {
      // Created once and toggled via .visible on mission progress / replay
      this.guideTrail.forEach((m) => this.scene.remove(m));
      this.guideTrail = [];

      for (let z = -30; z >= -285; z -= 12) {
        const marker = new THREE.Mesh(this.shared.trailGeo, this.shared.trailMat);
        marker.position.set(0, 1.2, z);
        marker.visible = false;
        this.scene.add(marker);
        this.guideTrail.push(marker);
      }
    }

    populateBlocksAndSurprises() {
      // Remove existing blocks & collectibles cleanly (reusing shared geometries/materials)
      this.blocks.forEach((b) => this.scene.remove(b.mesh));
      this.collectibles.forEach((c) => this.scene.remove(c.mesh));
      this.blocks = [];
      this.collectibles = [];

      const specialDefs = [
        { z: -65, x: -2.4, type: 'LETTER', label: this.config.collectedToasts.letter },
        { z: -145, x: 2.6, type: 'GIFT', label: this.config.collectedToasts.gift },
        { z: -225, x: -2.0, type: 'HEART', label: this.config.collectedToasts.heart }
      ];

      for (let z = -25; z >= -260; z -= 20) {
        const special = specialDefs.find((s) => Math.abs(s.z - z) < 5);

        [-4.2, 0, 4.2].forEach((baseX, idx) => {
          const isSpecial = Boolean(special && idx === (special.x < 0 ? 0 : 2));
          // Deterministic reachable positions for special blocks; mild jitter for ordinary
          const xPos = isSpecial ? special.x : baseX + ((Math.abs(z * (idx + 1)) % 10) / 10 - 0.5) * 1.2;
          const size = isSpecial ? 2.2 : 1.6;

          const group = new THREE.Group();
          group.position.set(xPos, 0, z);

          const boxGeo = isSpecial ? this.shared.blockGeos.special : this.shared.blockGeos.ordinary;
          const boxMat = isSpecial
            ? this.shared.blockMats.special
            : this.shared.blockMats.palette[(Math.abs(z) + idx) % this.shared.blockMats.palette.length];

          const boxMesh = new THREE.Mesh(boxGeo, boxMat);
          boxMesh.position.y = size / 2;
          group.add(boxMesh);

          // Subtle ground halo cue under special blocks so search is satisfying
          if (isSpecial) {
            const halo = new THREE.Mesh(this.shared.blockGeos.beaconRing, this.shared.blockMats.beacon);
            halo.rotation.x = -Math.PI / 2;
            halo.position.y = 0.05;
            group.add(halo);
          }

          this.scene.add(group);

          this.blocks.push({
            mesh: group,
            size,
            destroyed: false,
            isSpecial,
            surpriseType: isSpecial ? special.type : null,
            surpriseLabel: isSpecial ? special.label : null
          });
        });
      }
    }

    /**
     * FIX 1: Reliable Collectible Spawning & Detection
     * - Spawns collectible slightly ahead of the broken block along the player's driving path
     *   (clamped safely within the road width) so the player sees it pop out in front of them
     *   and never drives past it during an arbitrary dead-time window.
     * - Collectible is immediately active (0 ms artificial lock) and also magnetizes/collects
     *   reliably with continuous swept-segment + generous radius checks.
     */
    spawnCollectible(blockPos, type, label) {
      // Prevent duplicate spawn for the same surprise type
      if (this.collectedItems.has(type) || this.collectibles.some((c) => c.type === type)) {
        return;
      }

      const group = new THREE.Group();
      // Place 5.5 units ahead on the road (-Z) so moving car sees the pop-out and naturally picks it up
      const spawnX = Math.max(-5.5, Math.min(5.5, blockPos.x));
      const spawnZ = Math.max(-278, blockPos.z - 5.5);
      group.position.set(spawnX, 1.5, spawnZ);

      if (type === 'LETTER') {
        const env = new THREE.Mesh(this.shared.collectibleGeos.letter, this.shared.collectibleMats.letter);
        const seal = new THREE.Mesh(this.shared.collectibleGeos.letterSeal, this.shared.collectibleMats.letterSeal);
        seal.position.z = 0.2;
        group.add(env, seal);
      } else if (type === 'GIFT') {
        const box = new THREE.Mesh(this.shared.collectibleGeos.gift, this.shared.collectibleMats.gift);
        const ribV = new THREE.Mesh(this.shared.collectibleGeos.giftRibbonV, this.shared.collectibleMats.ribbon);
        const ribH = new THREE.Mesh(this.shared.collectibleGeos.giftRibbonH, this.shared.collectibleMats.ribbon);
        group.add(box, ribV, ribH);
      } else {
        const heart = new THREE.Mesh(this.shared.collectibleGeos.heart, this.shared.collectibleMats.heart);
        group.add(heart);
      }

      // Ground indicator ring under collectible so it is always easy to spot
      const ring = new THREE.Mesh(this.shared.collectibleGeos.auraRing, this.shared.collectibleMats.aura);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -1.42;
      group.add(ring);

      this.scene.add(group);
      this.collectibles.push({
        mesh: group,
        type,
        label,
        collected: false,
        collectingAnim: false,
        animProgress: 0
      });
    }

    /* ==========================================
       PARTICLE SYSTEM (SHARED GEOMETRY & CAPPED)
       ========================================== */
    spawnParticles(pos, matKey = 'pink', count = 12) {
      const mat = this.shared.particleMats[matKey] || this.shared.particleMats.pink;
      const particleCount = this.reducedMotion ? Math.min(4, Math.ceil(count * 0.25)) : count;
      for (let i = 0; i < particleCount; i++) {
        if (this.particles.length >= this.MAX_PARTICLES) {
          const oldest = this.particles.shift();
          if (oldest) this.scene.remove(oldest.mesh);
        }
        const p = new THREE.Mesh(this.shared.particleGeo, mat);
        p.position.set(pos.x, Math.max(0.8, pos.y + 0.8), pos.z);
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 0.34,
          Math.random() * 0.3 + 0.08,
          (Math.random() - 0.5) * 0.34
        );
        this.scene.add(p);
        this.particles.push({ mesh: p, vel, life: 1.0 });
      }
    }

    updateParticles(dtScale) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.mesh.position.x += p.vel.x * dtScale;
        p.mesh.position.y += p.vel.y * dtScale;
        p.mesh.position.z += p.vel.z * dtScale;
        p.vel.y -= 0.012 * dtScale;
        p.life -= 0.026 * dtScale;
        p.mesh.scale.setScalar(Math.max(0.01, p.life));

        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          this.particles.splice(i, 1);
        }
      }
    }

    clearParticles() {
      for (let i = 0; i < this.particles.length; i++) {
        this.scene.remove(this.particles[i].mesh);
      }
      this.particles = [];
    }

    /* ==========================================
       COLLISION & PICKUP LOGIC
       ========================================== */
    /**
     * Computes minimum 2D (XZ) distance from point P to segment AB
     * Prevents fast-moving car or frame drops from tunneling past blocks or collectibles.
     */
    distToSegmentXZ(px, pz, ax, az, bx, bz) {
      const dx = bx - ax;
      const dz = bz - az;
      const lenSq = dx * dx + dz * dz;
      let t = 0;
      if (lenSq > 0.00001) {
        t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
        t = Math.max(0, Math.min(1, t));
      }
      const projX = ax + t * dx;
      const projZ = az + t * dz;
      return Math.hypot(px - projX, pz - projZ);
    }

    checkCollisions() {
      const cx = this.car.position.x;
      const cz = this.car.position.z;
      const px = this.carPrevPos.x;
      const pz = this.carPrevPos.z;

      // 1. Destructible Blocks Check
      for (let i = 0; i < this.blocks.length; i++) {
        const b = this.blocks[i];
        if (b.destroyed) continue;

        const bx = b.mesh.position.x;
        const bz = b.mesh.position.z;
        const hitRadius = b.size * 0.75 + 1.35;
        const dist = this.distToSegmentXZ(bx, bz, px, pz, cx, cz);

        if (dist <= hitRadius) {
          b.destroyed = true;
          this.playSfx('impact');
          this.spawnParticles(b.mesh.position, b.isSpecial ? 'gold' : 'pink', b.isSpecial ? 18 : 10);

          // Gentle speed dampening without trapping car
          this.carVelocity *= 0.72;
          this.scene.remove(b.mesh);

          if (b.isSpecial && b.surpriseType) {
            this.spawnCollectible(b.mesh.position, b.surpriseType, b.surpriseLabel);
            this.playSfx('sparkle');
            this.showToast(this.config.brokenBlockToast, 2200);
          }
        }
      }

      // 2. Collectibles Check (Generous 3.4u pickup radius + swept segment check, no artificial delay)
      for (let i = 0; i < this.collectibles.length; i++) {
        const c = this.collectibles[i];
        if (c.collected || c.collectingAnim) continue;

        const ix = c.mesh.position.x;
        const iz = c.mesh.position.z;
        const dist = this.distToSegmentXZ(ix, iz, px, pz, cx, cz);

        if (dist <= 3.4) {
          c.collected = true;
          c.collectingAnim = true;
          c.animProgress = 0;

          if (!this.collectedItems.has(c.type)) {
            this.collectedItems.add(c.type);
            this.playSfx('collect');
            this.spawnParticles(c.mesh.position, 'gold', 22);
            this.spawnParticles(c.mesh.position, 'white', 10);
            this.showToast(`${c.label} (${this.collectedItems.size}/${this.totalRequired})`, 2800);

            if (this.collectedItems.size < this.totalRequired) {
              this.state = STATE.COLLECTING;
            } else {
              this.state = STATE.RETURN_TO_DESTINATION;
              this.guideTrail.forEach((m) => { m.visible = true; });
              this.scheduleTimeout(() => {
                if (this.state === STATE.RETURN_TO_DESTINATION) {
                  this.showToast(this.config.allCollectedToast, 3400);
                }
              }, 1100);
            }
            this.updateHUD();
          }
        }
      }

      // 3. Postbox Delivery Check
      const postX = this.postbox.position.x;
      const postZ = this.postbox.position.z;
      const distToPostbox = this.distToSegmentXZ(postX, postZ, px, pz, cx, cz);

      if (distToPostbox < 4.5 && this.state !== STATE.COMPLETED) {
        if (this.collectedItems.size === this.totalRequired) {
          this.triggerFinalReveal();
        } else {
          const now = performance.now();
          if (now - this.lastEarlyWarningTime > 2800) {
            this.lastEarlyWarningTime = now;
            const remaining = this.totalRequired - this.collectedItems.size;
            this.showToast(template(this.config.deliveryToast, remaining), 3000);
            // Gently bounce car back so they can reverse/drive to remaining blocks
            this.carVelocity = -0.28;
          }
        }
      }
    }

    /* ==========================================
       MISSION FLOW, MODALS & CONTROLS RESET
       ========================================== */
    clearControlStates() {
      this.keys.left = false;
      this.keys.right = false;
      this.keys.up = false;
      this.keys.down = false;
      this.activePointers.forEach((info, pointerId) => {
        try {
          if (info.el.hasPointerCapture && info.el.hasPointerCapture(pointerId)) info.el.releasePointerCapture(pointerId);
        } catch (_) {}
      });
      this.activePointers.clear();
      (this.controlButtons || []).forEach((button) => button.classList.remove('ld-active'));
    }

    startIntro() {
      this.clearControlStates();
      this.state = this.reducedMotion ? STATE.DRIVING : STATE.INTRO;
      this.introTimer = 0;
      if (this.elSkipBtn) {
        setText(this.elSkipBtn, this.config.skipIntroLabel || DEFAULT_CONFIG.skipIntroLabel);
        this.elSkipBtn.classList.toggle('ld-hidden', this.reducedMotion);
      }
      this.showToast(this.config.introToast, 3200);
      this.updateHUD();
    }

    skipCurrentCinematic() {
      if (this.state === STATE.INTRO) {
        this.state = STATE.DRIVING;
        if (this.elSkipBtn) this.elSkipBtn.classList.add('ld-hidden');
        this.showToast(this.config.hintToast, 2500);
        this.updateHUD();
      } else if (this.state === STATE.COMPLETED) {
        this.openFinalModal();
      }
    }

    openModal(modal, initialFocus) {
      if (!modal || this.isDisposed) return;
      if (this.activeModal && this.activeModal !== modal) this.closeModal(this.activeModal, false);
      this.modalPreviousFocus = document.activeElement;
      this.activeModal = modal;
      modal.classList.remove('ld-hidden');
      modal.setAttribute('aria-hidden', 'false');
      modal.inert = false;
      this.clearControlStates();
      focusElement(initialFocus || modal.querySelector('button, [tabindex="-1"]'));
    }

    closeModal(modal, restoreFocus = true) {
      if (!modal) return;
      modal.classList.add('ld-hidden');
      modal.setAttribute('aria-hidden', 'true');
      modal.inert = true;
      if (this.activeModal === modal) {
        const previous = this.modalPreviousFocus;
        this.activeModal = null;
        this.modalPreviousFocus = null;
        if (restoreFocus && previous && previous.isConnected) focusElement(previous);
      }
      this.clearControlStates();
    }

    setPauseReason(reason, shouldPause) {
      if (this.isDisposed) return;
      if (reason === 'user' && shouldPause && this.state === STATE.COMPLETED) return;
      if (shouldPause) this.pauseReasons.add(reason);
      else this.pauseReasons.delete(reason);
      const paused = this.pauseReasons.size > 0 || !this.hostActive || document.hidden;
      if (paused) {
        this.isPaused = true;
        this.clearControlStates();
        this.pauseScheduledTimeouts();
        this.stopLoop();
        this.suspendAudio();
        if (reason === 'user' && shouldPause) this.openModal(this.elPauseModal, this.elResumeBtn);
      } else {
        this.isPaused = false;
        this.clearControlStates();
        if (this.activeModal === this.elPauseModal) this.closeModal(this.elPauseModal);
        this.resumeScheduledTimeouts();
        this.resumeAudio();
        this.startLoop();
      }
      if (this.elWrapper) this.elWrapper.classList.toggle('is-paused', this.isPaused);
    }

    pauseGame() { this.setPauseReason('user', true); }
    resumeGame() { this.setPauseReason('user', false); this.activateAudioFromGesture(); }

    sendNext() {
      if (this.nextSent || this.isDisposed) return;
      this.nextSent = true;
      if (this.elContinueBtn) this.elContinueBtn.disabled = true;
      if (this.elLoveContinueBtn) this.elLoveContinueBtn.disabled = true;
      this.clearControlStates();
      api.next();
    }

    triggerFinalReveal() {
      if (this.endingTriggered || this.isDisposed) return;
      this.endingTriggered = true;
      this.state = STATE.COMPLETED;
      this.carVelocity = 0;
      this.clearControlStates();
      this.updateHUD();
      if (!this.completeSent) {
        this.completeSent = true;
        api.complete();
      }

      this.playSfx('reveal');
      this.spawnParticles(this.postbox.position, 'rose', 30);
      this.spawnParticles(this.postbox.position, 'gold', 30);
      if (this.elSkipBtn) {
        setText(this.elSkipBtn, this.config.skipRevealLabel || DEFAULT_CONFIG.skipRevealLabel);
        this.elSkipBtn.classList.remove('ld-hidden');
      }
      this.revealTimeout = this.scheduleTimeout(() => this.openFinalModal(), this.reducedMotion ? 250 : 2600);
    }

    openFinalModal() {
      if (this.isDisposed) return;
      this.clearScheduledTimeout(this.revealTimeout);
      this.revealTimeout = null;
      if (this.elSkipBtn) this.elSkipBtn.classList.add('ld-hidden');
      this.openModal(this.elFinalModal, this.elContinueBtn);
    }

    openLoveModal() {
      if (this.isDisposed) return;
      this.closeModal(this.elFinalModal, false);
      this.openModal(this.elLoveModal, this.elCloseLoveBtn);
    }

    closeLoveModal() {
      this.closeModal(this.elLoveModal, false);
      this.openFinalModal();
    }

    replayMission() {
      if (this.isDisposed) return;
      this.stopLoop();
      this.clearAllScheduledTimeouts();
      this.clearControlStates();
      this.clearParticles();
      this.stopAudioSounds();
      this.closeModal(this.elFinalModal, false);
      this.closeModal(this.elPauseModal, false);
      this.closeModal(this.elLoveModal, false);
      if (this.elToast) this.elToast.classList.add('ld-hidden');

      this.pauseReasons.delete('user');
      this.isPaused = this.pauseReasons.size > 0 || !this.hostActive || document.hidden;
      this.collectedItems.clear();
      this.endingTriggered = false;
      this.completeSent = false;
      this.lastEarlyWarningTime = 0;
      this.lastCollisionSfxTime = 0;
      this.time = 0;

      this.car.position.set(0, 0, 10);
      this.carPrevPos.copy(this.car.position);
      this.car.rotation.set(0, 0, 0);
      this.carVelocity = 0;
      this.postboxLid.position.y = 2.8;
      this.camera.position.set(0, 6, 22);
      this.camera.lookAt(0, 1.2, 2);
      this.guideTrail.forEach((marker) => { marker.visible = false; marker.rotation.set(0, 0, 0); marker.position.y = 1.2; });
      this.populateBlocksAndSurprises();
      if (this.elContinueBtn) this.elContinueBtn.disabled = this.nextSent;
      if (this.elLoveContinueBtn) this.elLoveContinueBtn.disabled = this.nextSent;
      this.startIntro();
      if (this.isPaused) {
        this.stopLoop();
        this.suspendAudio();
      } else {
        this.resumeScheduledTimeouts();
        this.resumeAudio();
        this.startLoop();
        focusElement(this.reducedMotion ? this.renderer.domElement : this.elSkipBtn);
      }
      if (this.elWrapper) this.elWrapper.classList.toggle('is-paused', this.isPaused);
      api.replayed();
    }

    /* ==========================================
       MAIN LOOP (SINGLE RAF + DELTA CLAMPED)
       ========================================== */
    canRender() {
      return !this.isDisposed && !this.isPaused && this.hostActive && !document.hidden && Boolean(this.renderer);
    }

    startLoop() {
      if (this.rafId !== null || !this.canRender()) return;
      this.rafId = requestAnimationFrame(this.animate);
    }

    stopLoop() {
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.lastFrameTime = 0;
    }

    animate(now) {
      this.rafId = null;
      if (!this.canRender()) return;
      const rawDt = this.lastFrameTime ? (now - this.lastFrameTime) / 1000 : 0;
      this.lastFrameTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      const dtScale = dt / 0.01667;
      this.time += dt;
      const timeMs = this.time * 1000;

      this.updateParticles(dtScale);
      for (let i = this.collectibles.length - 1; i >= 0; i--) {
        const c = this.collectibles[i];
        if (c.collectingAnim) {
          c.animProgress += dt * 3.2;
          c.mesh.position.y += dt * 4.5;
          if (!this.reducedMotion) c.mesh.rotation.y += 0.25 * dtScale;
          const size = Math.max(0.01, 1 - c.animProgress);
          c.mesh.scale.setScalar(size);
          if (c.animProgress >= 1) {
            this.scene.remove(c.mesh);
            c.collectingAnim = false;
          }
        } else if (!c.collected && !this.reducedMotion) {
          c.mesh.rotation.y += 0.045 * dtScale;
          c.mesh.position.y = 1.45 + Math.sin(timeMs * 0.005) * 0.22;
        }
      }

      for (let i = 0; i < this.guideTrail.length; i++) {
        const marker = this.guideTrail[i];
        if (marker.visible && !this.reducedMotion) {
          marker.rotation.y += 0.05 * dtScale;
          marker.position.y = 1.15 + Math.sin(timeMs * 0.006 + i) * 0.2;
        }
      }

      if (this.state === STATE.INTRO) {
        this.introTimer += dt;
        const progress = Math.min(this.introTimer / 4.2, 1);
        this.camera.position.set(Math.sin(progress * Math.PI) * 8, 6 - progress * 1.4, 22 - progress * 3);
        this.camera.lookAt(this.car.position.x, 1.2, this.car.position.z - 8);
        if (progress >= 1) this.skipCurrentCinematic();
      } else if (this.state === STATE.DRIVING || this.state === STATE.COLLECTING || this.state === STATE.RETURN_TO_DESTINATION) {
        this.carPrevPos.copy(this.car.position);
        if (this.keys.up) this.carVelocity = Math.min(this.carVelocity + 0.018 * dtScale, 0.58);
        else if (this.keys.down) this.carVelocity = Math.max(this.carVelocity - 0.022 * dtScale, -0.38);
        else {
          this.carVelocity *= Math.pow(0.95, dtScale);
          if (Math.abs(this.carVelocity) < 0.002) this.carVelocity = 0;
        }
        if (this.keys.left) this.car.position.x -= 0.17 * dtScale;
        if (this.keys.right) this.car.position.x += 0.17 * dtScale;
        this.car.position.x = Math.max(-6.8, Math.min(6.8, this.car.position.x));
        const targetTilt = (this.keys.left ? 0.08 : 0) + (this.keys.right ? -0.08 : 0);
        this.car.rotation.z += (targetTilt - this.car.rotation.z) * Math.min(1, 0.2 * dtScale);
        this.car.position.z -= this.carVelocity * dtScale;
        this.car.position.z = Math.max(-292, Math.min(18, this.car.position.z));

        const camLerp = Math.min(1, 0.14 * dtScale);
        this.camera.position.x += (this.car.position.x * 0.6 - this.camera.position.x) * camLerp;
        this.camera.position.y += (4.8 - this.camera.position.y) * camLerp;
        this.camera.position.z += (this.car.position.z + 10.5 - this.camera.position.z) * camLerp;
        this.camera.lookAt(this.car.position.x * 0.5, 1.2, this.car.position.z - 10);
        this.checkCollisions();
      } else if (this.state === STATE.COMPLETED) {
        this.postboxLid.position.y = Math.min(4.2, this.postboxLid.position.y + 0.03 * dtScale);
        this.camera.position.x = this.reducedMotion ? 0 : Math.sin(timeMs * 0.001) * 7;
        this.camera.position.y = 4.2;
        this.camera.position.z = this.postbox.position.z + 9;
        this.camera.lookAt(this.postbox.position.x, 2.0, this.postbox.position.z);
      }

      this.renderer.render(this.scene, this.camera);
      this.startLoop();
    }

    /* ==========================================
       INPUT & LIFECYCLE EVENTS
       ========================================== */
    listen(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      this.listeners.push(() => target.removeEventListener(type, handler, options));
    }

    handleModalKey(event) {
      if (!this.activeModal) return;
      if (event.code === 'Escape' || (event.code === 'KeyP' && this.activeModal === this.elPauseModal)) {
        if (this.activeModal === this.elPauseModal) {
          event.preventDefault();
          this.resumeGame();
        } else if (this.activeModal === this.elLoveModal && event.code === 'Escape') {
          event.preventDefault();
          this.closeLoveModal();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(this.activeModal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.disabled && element.getClientRects().length);
      if (!focusable.length) {
        event.preventDefault();
        focusElement(this.activeModal.querySelector('.ld-card, .ld-love-modal-card'));
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!this.activeModal.contains(document.activeElement)) {
        event.preventDefault();
        focusElement(event.shiftKey ? last : first);
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        focusElement(last);
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        focusElement(first);
      }
    }

    bindEvents() {
      const keyMap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
      this.onKeyDown = (event) => {
        if (!this.hostActive || !document.hasFocus()) return;
        if (this.activeModal) {
          this.handleModalKey(event);
          return;
        }
        if (event.code === 'Escape' || event.code === 'KeyP') {
          if (event.repeat || this.state === STATE.COMPLETED) return;
          event.preventDefault();
          this.activateAudioFromGesture();
          this.pauseGame();
          return;
        }
        const key = keyMap[event.code];
        if (!key || this.isPaused || this.state === STATE.COMPLETED) return;
        event.preventDefault();
        this.activateAudioFromGesture();
        this.keys[key] = true;
      };
      this.onKeyUp = (event) => {
        const key = keyMap[event.code];
        if (key) this.keys[key] = false;
      };
      this.listen(document, 'keydown', this.onKeyDown, { passive: false });
      this.listen(document, 'keyup', this.onKeyUp);

      this.onBlur = () => this.setPauseReason('blur', true);
      this.onFocus = () => { if (!document.hidden) this.setPauseReason('blur', false); };
      this.onVisibility = () => {
        this.setPauseReason('hidden', document.hidden);
        if (!document.hidden && document.hasFocus()) this.setPauseReason('blur', false);
      };
      this.listen(window, 'blur', this.onBlur);
      this.listen(window, 'focus', this.onFocus);
      this.listen(document, 'visibilitychange', this.onVisibility);
      this.listen(this.elWrapper, 'pointerdown', () => this.activateAudioFromGesture(), { passive: true });
      this.listen(this.renderer.domElement, 'pointerdown', () => focusElement(this.renderer.domElement), { passive: true });

      const bindTouchButton = (id, key) => {
        const element = document.getElementById(id);
        if (!element) return;
        const activate = (event) => {
          event.preventDefault();
          if (this.isPaused || !this.hostActive || this.activeModal || this.state === STATE.COMPLETED) return;
          this.activateAudioFromGesture();
          try {
            if (element.setPointerCapture && event.pointerId !== undefined) element.setPointerCapture(event.pointerId);
          } catch (_) {}
          this.activePointers.set(event.pointerId, { key, el: element });
          this.keys[key] = true;
          element.classList.add('ld-active');
        };
        const deactivate = (event) => {
          if (event && event.cancelable) event.preventDefault();
          if (event && event.pointerId !== undefined) this.activePointers.delete(event.pointerId);
          let stillHeld = false;
          this.activePointers.forEach((value) => { if (value.key === key) stillHeld = true; });
          if (!stillHeld) {
            this.keys[key] = false;
            element.classList.remove('ld-active');
          }
        };
        this.listen(element, 'pointerdown', activate, { passive: false });
        this.listen(element, 'pointerup', deactivate, { passive: false });
        this.listen(element, 'pointercancel', deactivate, { passive: false });
        this.listen(element, 'lostpointercapture', deactivate, { passive: false });
      };
      bindTouchButton('ld-btn-left', 'left');
      bindTouchButton('ld-btn-right', 'right');
      bindTouchButton('ld-btn-gas', 'up');
      bindTouchButton('ld-btn-brake', 'down');

      this.onGlobalPointerEnd = (event) => {
        const info = this.activePointers.get(event.pointerId);
        if (!info) return;
        this.activePointers.delete(event.pointerId);
        let stillHeld = false;
        this.activePointers.forEach((value) => { if (value.key === info.key) stillHeld = true; });
        if (!stillHeld) {
          this.keys[info.key] = false;
          info.el.classList.remove('ld-active');
        }
      };
      this.listen(window, 'pointerup', this.onGlobalPointerEnd);
      this.listen(window, 'pointercancel', this.onGlobalPointerEnd);

      this.listen(this.elSkipBtn, 'click', () => this.skipCurrentCinematic());
      this.listen(this.elPauseBtn, 'click', () => this.pauseGame());
      this.listen(this.elResumeBtn, 'click', () => this.resumeGame());
      this.listen(this.elRestartPauseBtn, 'click', () => this.replayMission());
      this.listen(this.elReplayBtn, 'click', () => this.replayMission());
      this.listen(this.elReadLetterBtn, 'click', () => this.openLoveModal());
      this.listen(this.elContinueBtn, 'click', () => this.sendNext());
      this.listen(this.elLoveContinueBtn, 'click', () => this.sendNext());
      this.listen(this.elCloseLoveBtn, 'click', () => this.closeLoveModal());
      this.listen(this.elLetterReplayBtn, 'click', () => this.replayMission());

      this.onResize = () => {
        if (!this.container || !this.renderer || !this.camera || this.isDisposed) return;
        const rect = this.container.getBoundingClientRect();
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (!w || !h) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      };
      this.onOrientationChange = () => {
        this.clearScheduledTimeout(this.orientationTimer);
        this.orientationTimer = this.scheduleTimeout(() => {
          this.orientationTimer = null;
          this.onResize();
        }, 120);
      };
      this.listen(window, 'resize', this.onResize);
      this.listen(window, 'orientationchange', this.onOrientationChange);
      if (window.visualViewport) this.listen(window.visualViewport, 'resize', this.onResize);
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(this.onResize);
        this.resizeObserver.observe(this.container);
      }
      this.listen(window, 'pagehide', () => this.dispose(), { once: true });
      this.onResize();
    }

    dispose() {
      if (this.isDisposed) return;
      this.isDisposed = true;
      counters.disposals += 1;
      this.stopLoop();
      this.clearAllScheduledTimeouts();
      this.clearControlStates();
      this.listeners.splice(0).forEach((remove) => {
        try { remove(); } catch (_) {}
        counters.listenersRemoved += 1;
      });
      if (this.resizeObserver) this.resizeObserver.disconnect();
      this.resizeObserver = null;
      this.stopAudioSounds();
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        try { this.audioCtx.close().catch(() => {}); counters.audioClosed += 1; } catch (_) {}
      }
      this.audioCtx = null;

      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      const renderTargets = new Set();
      const collectMaterial = (material) => {
        if (!material) return;
        materials.add(material);
        Object.values(material).forEach((value) => {
          if (value && value.isTexture) textures.add(value);
          if (value && value.isWebGLRenderTarget) renderTargets.add(value);
        });
      };
      if (this.scene) {
        this.scene.traverse((object) => {
          if (object.geometry) geometries.add(object.geometry);
          if (Array.isArray(object.material)) object.material.forEach(collectMaterial);
          else collectMaterial(object.material);
        });
        if (this.scene.background && this.scene.background.isTexture) textures.add(this.scene.background);
        if (this.scene.environment && this.scene.environment.isTexture) textures.add(this.scene.environment);
      }
      const collectShared = (value) => {
        if (!value) return;
        if (value.isBufferGeometry) { geometries.add(value); return; }
        if (value.isMaterial) { collectMaterial(value); return; }
        if (value.isTexture) { textures.add(value); return; }
        if (value.isWebGLRenderTarget) { renderTargets.add(value); return; }
        if (Array.isArray(value)) { value.forEach(collectShared); return; }
        if (typeof value === 'object') Object.values(value).forEach(collectShared);
      };
      Object.values(this.shared || {}).forEach(collectShared);
      if (this.renderer && this.renderer.getRenderTarget()) {
        const target = this.renderer.getRenderTarget();
        if (target) renderTargets.add(target);
      }
      renderTargets.forEach((target) => { try { target.dispose(); } catch (_) {} });
      textures.forEach((texture) => { try { texture.dispose(); } catch (_) {} });
      materials.forEach((material) => { try { material.dispose(); } catch (_) {} });
      geometries.forEach((geometry) => { try { geometry.dispose(); } catch (_) {} });
      counters.renderTargets += renderTargets.size;
      counters.textures += textures.size;
      counters.materials += materials.size;
      counters.geometries += geometries.size;

      const canvas = this.renderer && this.renderer.domElement;
      if (this.renderer) {
        try { this.renderer.dispose(); } catch (_) {}
        try { this.renderer.forceContextLoss(); } catch (_) {}
      }
      if (canvas) {
        canvas.remove();
        counters.canvasesRemoved += 1;
      }
      if (this.container) this.container.replaceChildren();

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.shared = null;
      this.car = null;
      this.carPrevPos = null;
      this.postbox = null;
      this.postboxLid = null;
      this.blocks = [];
      this.collectibles = [];
      this.particles = [];
      this.guideTrail = [];
      this.activeModal = null;
      this.modalPreviousFocus = null;
      Object.keys(this).forEach((key) => { if (key.startsWith('el')) this[key] = null; });
      this.slots = null;
      this.controlButtons = [];
      this.container = null;
    }
  }

  function applyTheme(theme) {
    const wrapper = document.getElementById('ld-game-wrapper');
    if (!wrapper) return;
    Object.entries(theme || {}).forEach(([key, value]) => wrapper.style.setProperty(key, value));
  }

  bridgeSubscriptions.push(api.onInit((current) => {
    applyTheme(current.theme);
    if (gameInstance && !gameInstance.isDisposed) return;
    try {
      gameInstance = new LoveDriveGame({
        config: current.config,
        reducedMotion: current.reducedMotion,
        hostActive: !current.paused
      });
    } catch (error) {
      api.error('LOVE_DRIVE_INIT_FAILED', error && error.message ? error.message : 'Love Drive could not start.');
    }
  }));
  bridgeSubscriptions.push(api.onUpdate((current) => {
    applyTheme(current.theme);
    const game = gameInstance;
    if (!game || game.isDisposed) return;
    game.setReducedMotion(current.reducedMotion);
    if (current.muted) game.suspendAudio();
    else game.resumeAudio();
  }));
  bridgeSubscriptions.push(api.onPause(() => {
    const game = gameInstance;
    if (!game || game.isDisposed) return;
    game.hostActive = false;
    game.setPauseReason('host', true);
  }));
  bridgeSubscriptions.push(api.onResume(() => {
    const game = gameInstance;
    if (!game || game.isDisposed) return;
    game.hostActive = true;
    game.setPauseReason('host', false);
  }));
  bridgeSubscriptions.push(api.onReplay(() => {
    if (gameInstance && !gameInstance.isDisposed) gameInstance.replayMission();
  }));

  window.addEventListener('pagehide', () => {
    bridgeSubscriptions.splice(0).forEach((unsubscribe) => {
      try { unsubscribe(); } catch (_) {}
    });
    if (gameInstance) gameInstance.dispose();
    gameInstance = null;
  }, { once: true });
})();
