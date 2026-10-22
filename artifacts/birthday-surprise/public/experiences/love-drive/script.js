/**
 * LOVE DRIVE — premium neon night-drive (Three.js r128, vendored)
 * 3-lane runner: dodge heartbreak barriers, chain heart combos, collect the
 * 3 hidden surprises (missed ones come around again), reach the Love Gate.
 * State machine: INTRO -> DRIVING -> COLLECTING -> RETURN_TO_DESTINATION -> COMPLETED
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
    objective: 'Collect the 3 hidden surprises', drivingObjective: 'Dodge 💔 barriers & catch the glowing surprises',
    exploringObjective: '{remaining} surprise(s) left — keep your hearts safe!',
    allFoundObjective: 'All 3 found! Race to the Love Gate 💖', completedObjective: 'Mission Complete! Happy Birthday! 🎉',
    introToast: 'Switch lanes ‹ › · hold ⚡ to boost', hintToast: 'Dodge the 💔 barriers — grab 💗 for combos!',
    brokenBlockToast: '✨ A surprise is glowing ahead — catch it!',
    collectLabels: { letter: 'Love Letter', gift: 'Birthday Gift', heart: 'Golden Heart' },
    collectedToasts: { letter: '💌 Love Letter Collected!', gift: '🎁 Birthday Gift Collected!', heart: '💛 Golden Heart Collected!' },
    allCollectedToast: '💖 All 3 surprises found! The Love Gate is open!',
    deliveryToast: 'Missed it! It will come around again ({remaining} left)',
    finalTitle: 'Happy Birthday! ✨',
    finalMessage: 'You dodged every heartbreak and found all three surprises! Ready for your special birthday message?',
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
    get audioState() { return gameInstance && gameInstance.audioCtx ? gameInstance.audioCtx.state : 'none'; },
    // Read-only diagnostics let release QA drive the real mechanics without
    // exposing the renderer/game object or adding a teleport/mutation hook.
    get state() { return gameInstance && !gameInstance.isDisposed ? gameInstance.state : 'disposed'; },
    get carPosition() { return gameInstance && gameInstance.car ? { x: gameInstance.car.position.x, y: gameInstance.car.position.y, z: -gameInstance.distance } : null; },
    get lives() { return gameInstance ? gameInstance.lives : 0; },
    get score() { return gameInstance ? Math.round(gameInstance.score) : 0; },
    get lane() { return gameInstance ? gameInstance.lane : 0; },
    get collectedCount() { return gameInstance ? gameInstance.collectedItems.size : 0; },
    get heldControls() { const keys = gameInstance ? gameInstance.keys : {}; return { left: Boolean(keys.left), right: Boolean(keys.right), up: Boolean(keys.up), down: Boolean(keys.down) }; },
    get activePointers() { return gameInstance ? gameInstance.activePointers.size : 0; },
    get activeModal() { return gameInstance && gameInstance.activeModal ? gameInstance.activeModal.id : null; },
    get renderCalls() { return gameInstance && gameInstance.renderer ? gameInstance.renderer.info.render.calls : 0; },
    get canvasSize() { const canvas = gameInstance && gameInstance.renderer ? gameInstance.renderer.domElement : null; return canvas ? { width: canvas.width, height: canvas.height } : null; },
    get pixelRatio() { return gameInstance && gameInstance.renderer ? gameInstance.renderer.getPixelRatio() : 0; },
    get particleCount() { return gameInstance ? gameInstance.particles.length : 0; },
    get reducedMotion() { return gameInstance ? gameInstance.reducedMotion : false; }
  } });

  // ── Tunables ─────────────────────────────────────────────────
  const LANES = [-3.4, 0, 3.4];
  const TRACK_LENGTH = 1400;          // distance to the Love Gate
  const SURPRISE_AT = [0.22, 0.5, 0.8]; // fraction of track for each surprise
  const BASE_SPEED = 26;              // units / second
  const MAX_SPEED = 46;
  const BOOST_SPEED = 58;
  const MIN_SPEED = 12;
  const START_LIVES = 3;
  const SEGMENT = 18;                 // obstacle row spacing
  const SPAWN_AHEAD = 150;            // how far ahead rows are generated
  const SURPRISE_TYPES = ['LETTER', 'GIFT', 'HEART'];

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
      this.endingTriggered = false;
      this.completeSent = false;
      this.nextSent = false;
      this.started = false;
      this.countdownLeft = 0;

      this.activeTimeouts = new Set();
      this.toastTimeout = null;
      this.revealTimeout = null;
      this.orientationTimer = null;
      this.comboTimeout = null;
      this.listeners = [];
      this.resizeObserver = null;
      this.activeModal = null;
      this.modalPreviousFocus = null;

      this.rows = [];
      this.particles = [];
      this.scenery = [];
      this.keys = { left: false, right: false, up: false, down: false };
      this.activePointers = new Map();
      this.resetRunState();

      this.audioCtx = null;
      this.audioActivated = false;
      this.gestureUnlocked = false;
      this.audioSounds = new Set();
      this.sfxEnabled = true;
      this.engine = null;

      try {
        if (!window.THREE) throw new Error('The bundled Three.js renderer did not load.');
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

    resetRunState() {
      this.distance = 0;
      this.speed = 0;
      this.lane = 1;
      this.laneX = 0;
      this.lives = START_LIVES;
      this.score = 0;
      this.combo = 0;
      this.bestCombo = 0;
      this.hits = 0;
      this.invulnerable = 0;
      this.shake = 0;
      this.nextRowZ = 40;
      this.surpriseQueue = SURPRISE_TYPES.map((type, i) => ({ type, at: SURPRISE_AT[i] * TRACK_LENGTH, spawned: false }));
      this.runTime = 0;
    }

    /* ── Timers (pause-aware) ─────────────────────────────────── */
    scheduleTimeout(fn, delay) {
      const timer = { fn, remaining: delay, started: 0, id: null };
      timer.run = () => { this.activeTimeouts.delete(timer); timer.id = null; if (!this.isDisposed) fn(); };
      this.activeTimeouts.add(timer);
      if (!this.isDisposed && !this.isPaused && !document.hidden) { timer.started = performance.now(); timer.id = setTimeout(timer.run, delay); }
      return timer;
    }
    clearScheduledTimeout(timer) {
      if (!timer) return;
      if (timer.id !== null) clearTimeout(timer.id);
      timer.id = null;
      this.activeTimeouts.delete(timer);
    }
    clearAllScheduledTimeouts() {
      Array.from(this.activeTimeouts).forEach((t) => this.clearScheduledTimeout(t));
      this.toastTimeout = null; this.revealTimeout = null; this.orientationTimer = null; this.comboTimeout = null;
    }
    pauseScheduledTimeouts() {
      const now = performance.now();
      this.activeTimeouts.forEach((t) => { if (t.id !== null) { clearTimeout(t.id); t.id = null; t.remaining = Math.max(0, t.remaining - (now - t.started)); } });
    }
    resumeScheduledTimeouts() {
      this.activeTimeouts.forEach((t) => { if (t.id === null && !this.isDisposed && !this.isPaused && !document.hidden) { t.started = performance.now(); t.id = setTimeout(t.run, t.remaining); } });
    }

    /* ── Audio: one gesture-gated context, synthesised SFX ────── */
    canSound() { return this.audioCtx && this.audioActivated && this.sfxEnabled && !api.muted && !this.isPaused && !document.hidden && this.hostActive; }
    activateAudioFromGesture() {
      this.gestureUnlocked = true;
      if (this.isDisposed || api.muted || this.isPaused || document.hidden || !this.hostActive) return;
      try {
        if (!this.audioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) return;
          this.audioCtx = new AudioContextClass();
          this.master = this.audioCtx.createGain();
          this.master.gain.value = 0.7;
          this.master.connect(this.audioCtx.destination);
          this.audioActivated = true;
        }
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
      } catch (_) {}
    }
    resumeAudio() {
      if (this.gestureUnlocked && this.audioActivated && this.audioCtx && !api.muted && !this.isPaused && !document.hidden && this.hostActive) this.audioCtx.resume().catch(() => {});
    }
    stopAudioSounds() {
      this.audioSounds.forEach((s) => { try { s.osc.stop(); } catch (_) {} try { s.osc.disconnect(); s.gain.disconnect(); } catch (_) {} });
      this.audioSounds.clear();
      this.stopEngine();
    }
    suspendAudio() {
      this.stopAudioSounds();
      if (this.audioCtx && this.audioCtx.state === 'running') this.audioCtx.suspend().catch(() => {});
    }
    playTone(freq, type = 'sine', duration = 0.18, vol = 0.1, slideFreq = null, delay = 0) {
      if (!this.canSound()) return;
      try {
        const ctx = this.audioCtx;
        if (ctx.state !== 'running') return;
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, t);
        if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, t + duration);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(gain); gain.connect(this.master);
        const sound = { osc, gain }; this.audioSounds.add(sound);
        osc.onended = () => { this.audioSounds.delete(sound); try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
        osc.start(t); osc.stop(t + duration + 0.02);
      } catch (_) {}
    }
    startEngine() {
      if (!this.canSound() || this.engine) return;
      try {
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator(); const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter(); const gain = ctx.createGain();
        osc.type = 'sawtooth'; osc2.type = 'triangle';
        filter.type = 'lowpass'; filter.frequency.value = 420;
        gain.gain.value = 0.0001;
        osc.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(this.master);
        osc.start(); osc2.start();
        this.engine = { osc, osc2, filter, gain };
      } catch (_) { this.engine = null; }
    }
    updateEngine() {
      if (!this.engine) { if (this.canSound() && this.isDrivingState()) this.startEngine(); return; }
      if (!this.canSound()) { this.stopEngine(); return; }
      const ctx = this.audioCtx; const t = ctx.currentTime;
      const k = Math.min(1, this.speed / BOOST_SPEED);
      this.engine.osc.frequency.setTargetAtTime(48 + k * 70, t, 0.08);
      this.engine.osc2.frequency.setTargetAtTime(96 + k * 140, t, 0.08);
      this.engine.filter.frequency.setTargetAtTime(300 + k * 900, t, 0.1);
      this.engine.gain.gain.setTargetAtTime(this.isDrivingState() ? 0.018 + k * 0.03 : 0.0001, t, 0.15);
    }
    stopEngine() {
      const e = this.engine; this.engine = null;
      if (!e) return;
      try { e.osc.stop(); e.osc2.stop(); } catch (_) {}
      try { e.osc.disconnect(); e.osc2.disconnect(); e.filter.disconnect(); e.gain.disconnect(); } catch (_) {}
    }
    playSfx(type) {
      if (!this.canSound()) return;
      if (type === 'impact') { this.playTone(140, 'sawtooth', 0.28, 0.16, 50); this.playTone(70, 'square', 0.22, 0.08, 40, 0.02); }
      else if (type === 'heart') { const n = 660 + Math.min(this.combo, 10) * 40; this.playTone(n, 'sine', 0.12, 0.08, n * 1.5); }
      else if (type === 'whoosh') { this.playTone(900, 'triangle', 0.12, 0.03, 300); }
      else if (type === 'sparkle') { this.playTone(587.33, 'sine', 0.18, 0.08, 1174); }
      else if (type === 'collect') { [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => this.playTone(n, 'sine', 0.26, 0.1, null, i * 0.08)); }
      else if (type === 'count') { this.playTone(520, 'square', 0.14, 0.06); }
      else if (type === 'go') { this.playTone(1040, 'square', 0.32, 0.07); }
      else if (type === 'reveal') { [440, 554.37, 659.25, 880, 1108.73].forEach((n, i) => this.playTone(n, 'triangle', 0.5, 0.09, null, i * 0.1)); }
    }

    /* ── DOM & HUD ────────────────────────────────────────────── */
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
      this.elFinalStats = byId('ld-final-stats');
      this.elStars = byId('ld-stars');
      this.elLoveModal = byId('love-modal');
      this.elMissionLabel = byId('ld-mission-label');
      this.elProgressPill = byId('ld-progress-pill');
      this.elPauseBtn = byId('ld-btn-pause');
      this.elSoundBtn = byId('ld-btn-sound');
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
      this.elStart = byId('ld-start');
      this.elStartBtn = byId('ld-btn-start');
      this.elStartSub = byId('ld-start-sub');
      this.elStartControls = byId('ld-start-controls');
      this.elCountdown = byId('ld-countdown');
      this.elCombo = byId('ld-combo');
      this.elLives = byId('ld-lives');
      this.elScore = byId('ld-score');
      this.elSpeed = byId('ld-speed');
      this.elDistanceFill = byId('ld-distance-fill');
      this.elTrackCar = byId('ld-track-car');
      this.elHitFlash = byId('ld-hit-flash');
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
        const slot = this.slots[key]; if (!slot) return;
        const label = c.collectLabels[slotConfig[key]];
        slot.title = label; slot.setAttribute('aria-label', label); slot.removeAttribute('aria-hidden');
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
      setText(this.elStartSub, c.recipientName ? `${c.recipientName}, ${c.objective.charAt(0).toLowerCase()}${c.objective.slice(1)} on a road made just for you.` : `${c.objective} on a road made just for you.`);
      const touch = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
      setText(this.elStartControls, touch ? 'Tap ‹ › to switch lanes · hold ⚡ to boost · ▼ to brake' : 'Keyboard: ← → switch lanes · ↑ / Space boost · ↓ brake · P pause');
      if (this.elPauseBtn) this.elPauseBtn.setAttribute('aria-label', c.pauseLabel || DEFAULT_CONFIG.pauseLabel);
      if (this.elCloseLoveBtn) this.elCloseLoveBtn.setAttribute('aria-label', c.closeLabel || DEFAULT_CONFIG.closeLabel);
      const labels = { 'ld-btn-left': c.steerLeftLabel || DEFAULT_CONFIG.steerLeftLabel, 'ld-btn-right': c.steerRightLabel || DEFAULT_CONFIG.steerRightLabel, 'ld-btn-brake': c.brakeLabel || DEFAULT_CONFIG.brakeLabel, 'ld-btn-gas': c.accelerateLabel || DEFAULT_CONFIG.accelerateLabel };
      Object.entries(labels).forEach(([id, label]) => { const el = document.getElementById(id); if (el) el.setAttribute('aria-label', label); });
      document.title = String(c.finalTitle || 'Love Drive');
    }

    showToast(msg, duration = 2600) {
      if (!this.elToast || this.isDisposed) return;
      setText(this.elToast, msg);
      this.elToast.classList.remove('ld-hidden');
      // restart entrance animation
      this.elToast.style.animation = 'none'; void this.elToast.offsetWidth; this.elToast.style.animation = '';
      this.clearScheduledTimeout(this.toastTimeout);
      const timer = this.scheduleTimeout(() => {
        if (this.toastTimeout !== timer) return;
        if (this.elToast) { this.elToast.classList.add('ld-hidden'); setText(this.elToast, ''); }
        this.toastTimeout = null;
      }, duration);
      this.toastTimeout = timer;
    }

    showCombo(text, bad = false) {
      if (!this.elCombo) return;
      setText(this.elCombo, text);
      this.elCombo.classList.toggle('bad', bad);
      this.elCombo.classList.remove('ld-hidden');
      this.elCombo.style.animation = 'none'; void this.elCombo.offsetWidth; this.elCombo.style.animation = '';
      this.clearScheduledTimeout(this.comboTimeout);
      this.comboTimeout = this.scheduleTimeout(() => { if (this.elCombo) this.elCombo.classList.add('ld-hidden'); this.comboTimeout = null; }, 700);
    }

    updateHUD() {
      const count = this.collectedItems.size;
      setText(this.elCounter, `${count}/${this.totalRequired}`);
      Object.keys(this.slots).forEach((key) => { if (this.slots[key]) this.slots[key].classList.toggle('ld-collected', this.collectedItems.has(key)); });
      if (this.elLives) {
        this.elLives.replaceChildren(...Array.from({ length: START_LIVES }, (_, i) => {
          const s = document.createElement('span'); s.textContent = '❤️'; if (i >= this.lives) s.className = 'lost'; return s;
        }));
        this.elLives.setAttribute('aria-label', `${this.lives} of ${START_LIVES} lives`);
      }
      if (!this.elObjective) return;
      if (this.state === STATE.COMPLETED) setText(this.elObjective, this.config.completedObjective);
      else if (this.state === STATE.INTRO) setText(this.elObjective, this.config.objective);
      else if (count === 0) setText(this.elObjective, this.config.drivingObjective);
      else if (count < this.totalRequired) setText(this.elObjective, template(this.config.exploringObjective, this.totalRequired - count));
      else setText(this.elObjective, this.config.allFoundObjective);
    }

    updateLiveHUD() {
      const p = Math.min(1, this.distance / TRACK_LENGTH);
      if (this.elDistanceFill) this.elDistanceFill.style.width = `${(p * 100).toFixed(1)}%`;
      if (this.elTrackCar) this.elTrackCar.style.left = `${(p * 100).toFixed(1)}%`;
      if (this.elScore) setText(this.elScore, Math.round(this.score).toLocaleString('en-US'));
      if (this.elSpeed) {
        const kmh = Math.round(this.speed * 4.2);
        if (this._lastKmh !== kmh) { this._lastKmh = kmh; this.elSpeed.replaceChildren(document.createTextNode(String(kmh)), Object.assign(document.createElement('small'), { textContent: 'km/h' })); }
      }
    }

    setReducedMotion(value) {
      this.reducedMotion = Boolean(value);
      if (this.elWrapper) this.elWrapper.classList.toggle('reduced-motion', this.reducedMotion);
      this.MAX_PARTICLES = this.reducedMotion ? 36 : 140;
      while (this.particles.length > this.MAX_PARTICLES) { const o = this.particles.shift(); if (o && this.scene) this.scene.remove(o.mesh); }
    }

    /* ── Shared three.js resources ────────────────────────────── */
    makeGlowTexture() {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c); return tex;
    }
    makeSkyTexture() {
      const c = document.createElement('canvas'); c.width = 16; c.height = 256;
      const g = c.getContext('2d'); const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, '#070216'); grd.addColorStop(0.45, '#2a0b4a'); grd.addColorStop(0.72, '#8a1f6e'); grd.addColorStop(0.86, '#ff6a8f'); grd.addColorStop(1, '#ffb38a');
      g.fillStyle = grd; g.fillRect(0, 0, 16, 256);
      return new THREE.CanvasTexture(c);
    }
    makeRoadTexture() {
      const c = document.createElement('canvas'); c.width = 256; c.height = 512;
      const g = c.getContext('2d');
      g.fillStyle = '#140a24'; g.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`; g.fillRect(Math.random() * 256, Math.random() * 512, 1.5, 1.5); }
      g.fillStyle = 'rgba(255,255,255,0.55)';
      [256 / 3, 512 / 3].forEach((x) => { for (let y = 0; y < 512; y += 128) g.fillRect(x - 2, y + 20, 4, 70); });
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 30);
      tex.anisotropy = 4;
      return tex;
    }

    initSharedResources() {
      const glow = this.makeGlowTexture();
      this.shared = {
        glowTex: glow,
        particleGeo: new THREE.PlaneGeometry(0.5, 0.5),
        particleMats: {
          pink: new THREE.MeshBasicMaterial({ map: glow, color: 0xff5fa2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
          gold: new THREE.MeshBasicMaterial({ map: glow, color: 0xffd36b, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
          rose: new THREE.MeshBasicMaterial({ map: glow, color: 0xff2d6f, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
          white: new THREE.MeshBasicMaterial({ map: glow, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
          cyan: new THREE.MeshBasicMaterial({ map: glow, color: 0x6ff3ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
        },
        barrierGeo: new THREE.BoxGeometry(2.6, 1.3, 0.6),
        barrierStripeGeo: new THREE.BoxGeometry(2.7, 0.16, 0.64),
        barrierMat: new THREE.MeshStandardMaterial({ color: 0x2a0d24, emissive: 0xff1f5a, emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.3 }),
        barrierStripeMat: new THREE.MeshBasicMaterial({ color: 0xff3b74 }),
        brokenHeartGeo: new THREE.PlaneGeometry(1.1, 1.1),
        heartGeo: null,
        heartMat: new THREE.MeshStandardMaterial({ color: 0xff4f9a, emissive: 0xff2d7a, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.2 }),
        haloMat: new THREE.MeshBasicMaterial({ map: glow, color: 0xff5fa2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
        goldHaloMat: new THREE.MeshBasicMaterial({ map: glow, color: 0xffd36b, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
        haloGeo: new THREE.PlaneGeometry(3.2, 3.2),
        beamGeo: new THREE.CylinderGeometry(0.9, 0.9, 14, 16, 1, true),
        beamMat: new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
        collectibleGeos: {
          letter: new THREE.BoxGeometry(1.5, 1.0, 0.18),
          letterSeal: new THREE.CircleGeometry(0.22, 20),
          gift: new THREE.BoxGeometry(1.25, 1.25, 1.25),
          giftRibbonV: new THREE.BoxGeometry(1.3, 1.3, 0.22),
          giftRibbonH: new THREE.BoxGeometry(0.22, 1.3, 1.3)
        },
        collectibleMats: {
          letter: new THREE.MeshStandardMaterial({ color: 0xfff3f8, emissive: 0xffc2dc, emissiveIntensity: 0.45, roughness: 0.5 }),
          letterSeal: new THREE.MeshBasicMaterial({ color: 0xff2d55, side: THREE.DoubleSide }),
          gift: new THREE.MeshStandardMaterial({ color: 0xff4f9a, emissive: 0xb0216a, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.2 }),
          ribbon: new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xffa800, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.25 }),
          heart: new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xffaa00, emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.2 })
        }
      };
      this.shared.heartGeo = this.makeHeartGeometry(0.55, 0.32);
      this.shared.bigHeartGeo = this.makeHeartGeometry(0.95, 0.5);
      this.MAX_PARTICLES = this.reducedMotion ? 36 : 140;
    }

    makeHeartGeometry(s, depth) {
      const shape = new THREE.Shape();
      shape.moveTo(0, s * 0.35);
      shape.bezierCurveTo(0, s * 0.7, -s * 0.9, s * 0.8, -s * 0.95, s * 0.2);
      shape.bezierCurveTo(-s, -s * 0.3, -s * 0.3, -s * 0.6, 0, -s);
      shape.bezierCurveTo(s * 0.3, -s * 0.6, s, -s * 0.3, s * 0.95, s * 0.2);
      shape.bezierCurveTo(s * 0.9, s * 0.8, 0, s * 0.7, 0, s * 0.35);
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: s * 0.12, bevelSegments: 3, curveSegments: 14 });
      geo.center();
      return geo;
    }

    initThree() {
      this.scene = new THREE.Scene();
      this.scene.background = this.makeSkyTexture();
      this.scene.fog = new THREE.Fog(0x3a0f4f, 60, 230);

      const rect = this.container.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      this.camera = new THREE.PerspectiveCamera(62, w / h, 0.1, 400);
      this.camera.position.set(0, 4.2, 9);
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      this.container.replaceChildren();
      const canvas = this.renderer.domElement;
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', this.config.objective);
      canvas.setAttribute('role', 'application');
      this.container.appendChild(canvas);

      this.scene.add(new THREE.HemisphereLight(0xffb3d9, 0x1a0630, 0.75));
      const key = new THREE.DirectionalLight(0xffe0f0, 0.9);
      key.position.set(-8, 14, 10);
      this.scene.add(key);
      this.carLight = new THREE.PointLight(0xff4f9a, 1.4, 14, 2);
      this.scene.add(this.carLight);
    }

    /* ── World ────────────────────────────────────────────────── */
    buildWorld() {
      // Groups that travel with the car (sky + road), so the world feels endless.
      this.sky = new THREE.Group(); this.scene.add(this.sky);
      this.track = new THREE.Group(); this.scene.add(this.track);
      // Synthwave sun
      const sunCanvas = document.createElement('canvas'); sunCanvas.width = sunCanvas.height = 256;
      const sg = sunCanvas.getContext('2d');
      const grad = sg.createLinearGradient(0, 0, 0, 256); grad.addColorStop(0, '#ffe08a'); grad.addColorStop(0.55, '#ff6a9a'); grad.addColorStop(1, '#b8206f');
      sg.fillStyle = grad; sg.beginPath(); sg.arc(128, 128, 126, 0, Math.PI * 2); sg.fill();
      sg.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 7; i++) { const y = 150 + i * 15; sg.fillRect(0, y, 256, 3 + i * 1.3); }
      this.sunTex = new THREE.CanvasTexture(sunCanvas);
      this.sun = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ map: this.sunTex, transparent: true, fog: false, depthWrite: false }));
      this.sun.position.set(0, 22, -300);
      this.sky.add(this.sun);
      const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshBasicMaterial({ map: this.shared.glowTex, color: 0xff4f9a, transparent: true, opacity: 0.55, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      sunGlow.position.set(0, 18, -310);
      this.sky.add(sunGlow);
      this.sunGlow = sunGlow;

      // Stars
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(600 * 3);
      for (let i = 0; i < 600; i++) { starPos[i * 3] = (Math.random() - 0.5) * 600; starPos[i * 3 + 1] = 30 + Math.random() * 160; starPos[i * 3 + 2] = -150 - Math.random() * 200; }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
      this.sky.add(this.stars);

      // Neon grid ground (scrolls)
      const grid = new THREE.GridHelper(600, 150, 0xff4f9a, 0x7a2bbd);
      grid.material.transparent = true; grid.material.opacity = 0.35;
      grid.position.set(0, -0.02, -150);
      this.grid = grid;
      this.scene.add(grid);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x12051f }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, -150);
      this.track.add(ground);

      // Road with scrolling texture
      this.roadTex = this.makeRoadTexture();
      const road = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 420), new THREE.MeshStandardMaterial({ map: this.roadTex, roughness: 0.55, metalness: 0.25 }));
      road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -170);
      this.track.add(road);

      // Neon edge rails
      const railGeo = new THREE.BoxGeometry(0.22, 0.22, 420);
      [[-5.5, 0xff4f9a], [5.5, 0x6ff3ff]].forEach(([x, col]) => {
        const rail = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial({ color: col }));
        rail.position.set(x, 0.14, -170); this.track.add(rail);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 420), new THREE.MeshBasicMaterial({ map: this.shared.glowTex, color: col, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.rotation.x = -Math.PI / 2; glow.position.set(x, 0.03, -170); this.track.add(glow);
      });

      // Roadside light posts + floating hearts (recycled as you drive)
      const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.2, 8);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x2b1240, metalness: 0.6, roughness: 0.4 });
      const bulbGeo = new THREE.SphereGeometry(0.22, 12, 8);
      for (let i = 0; i < 16; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const g = new THREE.Group();
        const post = new THREE.Mesh(postGeo, postMat); post.position.y = 2.1; g.add(post);
        const bulb = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff7ab8 : 0x9ff7ff })); bulb.position.set(-side * 0.5, 4.15, 0); g.add(bulb);
        const halo = new THREE.Mesh(this.shared.haloGeo, side < 0 ? this.shared.haloMat : new THREE.MeshBasicMaterial({ map: this.shared.glowTex, color: 0x6ff3ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        halo.position.copy(bulb.position); g.add(halo);
        g.position.set(side * 7.4, 0, -i * 13);
        this.scene.add(g);
        this.scenery.push({ mesh: g, spacing: 13 * 16, halo });
      }
      for (let i = 0; i < 14; i++) {
        const heart = new THREE.Mesh(this.shared.bigHeartGeo, new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffd36b : 0xff4f9a, transparent: true, opacity: 0.55 }));
        const side = i % 2 === 0 ? -1 : 1;
        heart.position.set(side * (14 + Math.random() * 18), 3 + Math.random() * 8, -i * 22);
        heart.scale.setScalar(1 + Math.random() * 1.6);
        this.scene.add(heart);
        this.scenery.push({ mesh: heart, spacing: 22 * 14, float: Math.random() * 6 });
      }

      this.createCar();
      this.createGate();
      this.resetRows();
    }

    createCar() {
      const car = new THREE.Group();
      const paint = new THREE.MeshStandardMaterial({ color: 0xff3d8b, metalness: 0.65, roughness: 0.28, emissive: 0x4a0628, emissiveIntensity: 0.4 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x140a1f, metalness: 0.4, roughness: 0.5 });
      const glass = new THREE.MeshStandardMaterial({ color: 0x1b1036, metalness: 0.9, roughness: 0.08, emissive: 0x3a2a7a, emissiveIntensity: 0.35 });

      // Low body with tapered nose (lathe-free: stacked boxes + wedge)
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 4.2), paint); body.position.y = 0.55; car.add(body);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 1.2), paint);
      hood.rotation.x = 0.16; hood.position.set(0, 0.62, -2.35); car.add(hood);
      const side = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.22, 3.4), dark); side.position.y = 0.32; car.add(side);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.7), glass); cabin.position.set(0, 1.07, 0.2); car.add(cabin);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.2), paint); roof.position.set(0, 1.36, 0.25); car.add(roof);
      // Spoiler
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.5), dark); wing.position.set(0, 1.18, 2.0); car.add(wing);
      [-0.8, 0.8].forEach((x) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.2), dark); s.position.set(x, 0.98, 2.0); car.add(s); });
      // Neon underglow
      const under = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.6), new THREE.MeshBasicMaterial({ map: this.shared.glowTex, color: 0xff4f9a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
      under.rotation.x = -Math.PI / 2; under.position.y = 0.04; car.add(under);
      this.underglow = under;
      // Tail lights + light bar
      const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2050 });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.06), tailMat); bar.position.set(0, 0.72, 2.12); car.add(bar);
      [-0.85, 0.85].forEach((x) => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.06), tailMat); tl.position.set(x, 0.66, 2.12); car.add(tl);
        const tg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ map: this.shared.glowTex, color: 0xff2050, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        tg.position.set(x, 0.66, 2.16); car.add(tg);
      });
      // Headlight beams
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8 });
      [-0.75, 0.75].forEach((x) => { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.06), hlMat); hl.position.set(x, 0.62, -2.12); car.add(hl); });
      // Wheels with neon rims
      this.wheels = [];
      const tire = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 20);
      const rimMat = new THREE.MeshBasicMaterial({ color: 0x6ff3ff });
      const rim = new THREE.TorusGeometry(0.3, 0.04, 6, 20);
      [[-1.12, 1.35], [1.12, 1.35], [-1.12, -1.35], [1.12, -1.35]].forEach(([x, z]) => {
        const wg = new THREE.Group();
        const t = new THREE.Mesh(tire, dark); t.rotation.z = Math.PI / 2; wg.add(t);
        const r = new THREE.Mesh(rim, rimMat); r.rotation.y = Math.PI / 2; r.position.x = x > 0 ? 0.18 : -0.18; wg.add(r);
        wg.position.set(x, 0.42, z); car.add(wg); this.wheels.push(wg);
      });
      // Boost flames
      const flameMat = new THREE.MeshBasicMaterial({ map: this.shared.glowTex, color: 0x6ff3ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      this.flames = [-0.55, 0.55].map((x) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.4), flameMat); f.rotation.x = -Math.PI / 2; f.position.set(x, 0.5, 3.0); car.add(f); return f; });
      this.flameMat = flameMat;

      car.position.set(0, 0, 0);
      this.car = car;
      this.carBodyMat = paint;
      this.scene.add(car);
    }

    createGate() {
      const gate = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd36b });
      const heart = new THREE.Mesh(this.makeHeartGeometry(5.5, 0.6), new THREE.MeshStandardMaterial({ color: 0xff4f9a, emissive: 0xff2d7a, emissiveIntensity: 1, metalness: 0.3, roughness: 0.3 }));
      heart.position.y = 7.5; gate.add(heart);
      [-5.8, 5.8].forEach((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), mat); p.position.set(x, 3.5, 0); gate.add(p); });
      const arch = new THREE.Mesh(new THREE.TorusGeometry(5.8, 0.18, 8, 40, Math.PI), mat); arch.position.y = 7; gate.add(arch);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: this.shared.glowTex, color: 0xff6aa8, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.position.set(0, 7, -0.6); gate.add(glow);
      gate.visible = false;
      this.gate = gate; this.gateHeart = heart;
      this.scene.add(gate);
    }

    /* ── Obstacle rows ────────────────────────────────────────── */
    clearRows() {
      this.rows.forEach((r) => r.items.forEach((it) => this.scene.remove(it.mesh)));
      this.rows = [];
    }
    resetRows() {
      this.clearRows();
      this.nextRowZ = 46;
      this.rowCount = 0;
    }
    rand() { this._seed = (this._seed || 1234567) * 16807 % 2147483647; return this._seed / 2147483647; }

    makeBarrier(laneIdx, z) {
      const g = new THREE.Group();
      const block = new THREE.Mesh(this.shared.barrierGeo, this.shared.barrierMat); block.position.y = 0.65; g.add(block);
      [0.25, 1.05].forEach((y) => { const s = new THREE.Mesh(this.shared.barrierStripeGeo, this.shared.barrierStripeMat); s.position.y = y; g.add(s); });
      const broken = new THREE.Mesh(this.shared.heartGeo, this.shared.barrierStripeMat); broken.rotation.z = 0.35; broken.scale.setScalar(0.9); broken.position.set(0, 1.9, 0); g.add(broken);
      const halo = new THREE.Mesh(this.shared.haloGeo, new THREE.MeshBasicMaterial({ map: this.shared.glowTex, color: 0xff1f5a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.rotation.x = -Math.PI / 2; halo.position.y = 0.04; halo.scale.set(1.2, 0.7, 1); g.add(halo);
      g.position.set(LANES[laneIdx], 0, -z);
      this.scene.add(g);
      return { kind: 'barrier', lane: laneIdx, z, mesh: g, hit: false, spin: broken };
    }
    makeHeart(laneIdx, z, yOffset = 0) {
      const g = new THREE.Group();
      const h = new THREE.Mesh(this.shared.heartGeo, this.shared.heartMat); g.add(h);
      const halo = new THREE.Mesh(this.shared.haloGeo, this.shared.haloMat); halo.scale.setScalar(0.6); g.add(halo);
      g.position.set(LANES[laneIdx], 1.3 + yOffset, -z);
      this.scene.add(g);
      return { kind: 'heart', lane: laneIdx, z, mesh: g, hit: false, spin: h };
    }
    makeSurprise(laneIdx, z, type) {
      const g = new THREE.Group();
      const s = this.shared;
      const inner = new THREE.Group();
      if (type === 'LETTER') {
        inner.add(new THREE.Mesh(s.collectibleGeos.letter, s.collectibleMats.letter));
        const seal = new THREE.Mesh(s.collectibleGeos.letterSeal, s.collectibleMats.letterSeal); seal.position.z = 0.1; inner.add(seal);
      } else if (type === 'GIFT') {
        inner.add(new THREE.Mesh(s.collectibleGeos.gift, s.collectibleMats.gift));
        inner.add(new THREE.Mesh(s.collectibleGeos.giftRibbonV, s.collectibleMats.ribbon));
        inner.add(new THREE.Mesh(s.collectibleGeos.giftRibbonH, s.collectibleMats.ribbon));
      } else {
        const h = new THREE.Mesh(s.bigHeartGeo, s.collectibleMats.heart); inner.add(h);
      }
      g.add(inner);
      const halo = new THREE.Mesh(s.haloGeo, s.goldHaloMat); halo.scale.setScalar(1.3); g.add(halo);
      const beam = new THREE.Mesh(s.beamGeo, s.beamMat); beam.position.y = 5; g.add(beam);
      g.position.set(LANES[laneIdx], 1.5, -z);
      this.scene.add(g);
      return { kind: 'surprise', type, lane: laneIdx, z, mesh: g, hit: false, spin: inner };
    }

    /** Generates rows ahead of the car; always leaves at least one free lane. */
    spawnRows() {
      const horizon = this.distance + SPAWN_AHEAD;
      while (this.nextRowZ < horizon && this.nextRowZ < TRACK_LENGTH - 30) {
        const z = this.nextRowZ;
        const progress = z / TRACK_LENGTH;
        const items = [];
        const due = this.surpriseQueue.find((q) => !q.spawned && !this.collectedItems.has(q.type) && z >= q.at);
        if (due) {
          due.spawned = true;
          const lane = Math.floor(this.rand() * 3);
          items.push(this.makeSurprise(lane, z, due.type));
          // flank it with barriers sometimes (later = harder), never both sides
          if (progress > 0.45) items.push(this.makeBarrier(lane === 0 ? 2 : 0, z - 6));
          this.showToast(this.config.brokenBlockToast, 2000);
          this.playSfx('sparkle');
        } else {
          const difficulty = Math.min(1, 0.25 + progress * 0.9);
          const blocked = [];
          const r = this.rand();
          const n = r < 0.18 * difficulty ? 2 : r < 0.85 ? 1 : 0;
          while (blocked.length < n) { const l = Math.floor(this.rand() * 3); if (!blocked.includes(l)) blocked.push(l); }
          blocked.forEach((l) => items.push(this.makeBarrier(l, z)));
          const free = [0, 1, 2].filter((l) => !blocked.includes(l));
          if (free.length && this.rand() < 0.75) {
            const l = free[Math.floor(this.rand() * free.length)];
            const trail = 3 + Math.floor(this.rand() * 3);
            for (let k = 0; k < trail; k++) items.push(this.makeHeart(l, z + 3 + k * 2.6, Math.sin(k) * 0.15));
          }
        }
        this.rows.push({ z, items });
        const gap = SEGMENT * (1.15 - Math.min(0.4, progress * 0.45)) + this.rand() * 4;
        this.nextRowZ += gap;
        this.rowCount++;
      }
    }

    recycleRows() {
      for (let i = this.rows.length - 1; i >= 0; i--) {
        const row = this.rows[i];
        row.items = row.items.filter((it) => {
          if (it.z < this.distance - 12) {
            this.scene.remove(it.mesh);
            if (it.kind === 'surprise' && !it.hit) this.missSurprise(it.type);
            return false;
          }
          return true;
        });
        if (!row.items.length) this.rows.splice(i, 1);
      }
    }

    missSurprise(type) {
      const q = this.surpriseQueue.find((s) => s.type === type);
      if (!q || this.collectedItems.has(type)) return;
      // Comes around again ~260 units later (looping the final stretch if needed).
      q.spawned = false;
      q.at = Math.min(TRACK_LENGTH - 60, this.distance + 220);
      this.showToast(template(this.config.deliveryToast, this.totalRequired - this.collectedItems.size), 2400);
    }

    /* ── Particles (additive glow sprites, capped) ────────────── */
    spawnParticles(pos, matKey = 'pink', count = 12, spread = 0.4) {
      const mat = this.shared.particleMats[matKey] || this.shared.particleMats.pink;
      const n = this.reducedMotion ? Math.min(4, Math.ceil(count * 0.25)) : count;
      for (let i = 0; i < n; i++) {
        if (this.particles.length >= this.MAX_PARTICLES) { const o = this.particles.shift(); if (o) this.scene.remove(o.mesh); }
        const p = new THREE.Mesh(this.shared.particleGeo, mat);
        p.position.set(pos.x, Math.max(0.6, pos.y), pos.z);
        const vel = new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * 0.32 + 0.06, (Math.random() - 0.5) * spread);
        p.scale.setScalar(0.6 + Math.random() * 1.2);
        this.scene.add(p);
        this.particles.push({ mesh: p, vel, life: 1, base: p.scale.x });
      }
    }
    updateParticles(dtScale) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.mesh.position.x += p.vel.x * dtScale; p.mesh.position.y += p.vel.y * dtScale; p.mesh.position.z += p.vel.z * dtScale;
        p.vel.y -= 0.01 * dtScale; p.life -= 0.024 * dtScale;
        p.mesh.scale.setScalar(Math.max(0.01, p.life * p.base));
        p.mesh.quaternion.copy(this.camera.quaternion);
        if (p.life <= 0) { this.scene.remove(p.mesh); this.particles.splice(i, 1); }
      }
    }
    clearParticles() { this.particles.forEach((p) => this.scene.remove(p.mesh)); this.particles = []; }

    /* ── Collisions (lane-based, swept along Z) ───────────────── */
    isDrivingState() { return this.state === STATE.DRIVING || this.state === STATE.COLLECTING || this.state === STATE.RETURN_TO_DESTINATION; }

    checkCollisions(prevDistance) {
      const carX = this.car.position.x;
      for (const row of this.rows) {
        for (const it of row.items) {
          if (it.hit) continue;
          // swept: item passed between previous and current frame (+/- body length)
          if (it.z < prevDistance - 1.6 || it.z > this.distance + 2.2) continue;
          const dx = Math.abs(it.mesh.position.x - carX);
          if (it.kind === 'barrier') {
            if (dx < 2.2 && this.invulnerable <= 0) this.hitBarrier(it);
          } else if (it.kind === 'heart') {
            if (dx < 2.0) this.collectHeart(it);
          } else if (it.kind === 'surprise') {
            if (dx < 2.6) this.collectSurprise(it);
          }
        }
      }
    }

    hitBarrier(it) {
      it.hit = true;
      this.hits += 1;
      this.lives = Math.max(0, this.lives - 1);
      this.combo = 0;
      this.invulnerable = 1.6;
      this.speed = Math.max(MIN_SPEED, this.speed * 0.45);
      this.shake = this.reducedMotion ? 0 : 0.6;
      this.playSfx('impact');
      this.spawnParticles(it.mesh.position, 'rose', 22, 0.7);
      it.mesh.visible = false;
      if (this.elHitFlash) {
        this.elHitFlash.classList.add('on');
        this.scheduleTimeout(() => this.elHitFlash && this.elHitFlash.classList.remove('on'), 120);
      }
      this.showCombo('💔 Ouch!', true);
      if (this.lives <= 0) {
        // Gentle, never punishing: hearts refill and you keep your surprises.
        this.lives = START_LIVES;
        this.score = Math.max(0, this.score - 500);
        this.showToast('Out of hearts! Refilled ❤️ — your surprises are safe', 2600);
      }
      this.updateHUD();
    }

    collectHeart(it) {
      it.hit = true;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const mult = Math.min(5, 1 + Math.floor(this.combo / 5));
      this.score += 50 * mult;
      it.mesh.visible = false;
      this.playSfx('heart');
      this.spawnParticles(it.mesh.position, 'pink', 6, 0.3);
      if (this.combo > 0 && this.combo % 5 === 0) this.showCombo(`x${mult} COMBO!`);
    }

    collectSurprise(it) {
      it.hit = true;
      it.mesh.visible = false;
      if (this.collectedItems.has(it.type)) return;
      this.collectedItems.add(it.type);
      this.score += 1000;
      this.playSfx('collect');
      this.spawnParticles(it.mesh.position, 'gold', 26, 0.6);
      this.spawnParticles(it.mesh.position, 'white', 12, 0.5);
      const key = it.type === 'LETTER' ? 'letter' : it.type === 'GIFT' ? 'gift' : 'heart';
      this.showToast(`${this.config.collectedToasts[key]} (${this.collectedItems.size}/${this.totalRequired})`, 2600);
      if (this.collectedItems.size < this.totalRequired) this.state = STATE.COLLECTING;
      else {
        this.state = STATE.RETURN_TO_DESTINATION;
        this.gate.visible = true;
        this.scheduleTimeout(() => { if (this.state === STATE.RETURN_TO_DESTINATION) this.showToast(this.config.allCollectedToast, 3000); }, 900);
      }
      this.updateHUD();
    }

    /** Reached the end without everything: loop the last stretch so missed surprises return. */
    loopStretch() {
      this.clearRows();
      const back = 420;
      const before = this.distance;
      this.distance = Math.max(80, this.distance - back);
      const shift = before - this.distance;
      this.scenery.forEach((sc) => { sc.mesh.position.z += shift; });
      this.car.position.z = -this.distance;
      this.camera.position.z = -this.distance + 9;
      this.nextRowZ = this.distance + 40;
      let offset = 60;
      this.surpriseQueue.forEach((q) => { if (!this.collectedItems.has(q.type)) { q.spawned = false; q.at = this.distance + offset; offset += 70; } });
      this.showToast(template(this.config.deliveryToast, this.totalRequired - this.collectedItems.size), 2800);
    }

    /* ── Flow, modals ─────────────────────────────────────────── */
    clearControlStates() {
      this.keys.left = false; this.keys.right = false; this.keys.up = false; this.keys.down = false;
      this.activePointers.forEach((info, pointerId) => { try { if (info.el.hasPointerCapture && info.el.hasPointerCapture(pointerId)) info.el.releasePointerCapture(pointerId); } catch (_) {} });
      this.activePointers.clear();
      (this.controlButtons || []).forEach((b) => b.classList.remove('ld-active'));
    }

    startIntro() {
      this.clearControlStates();
      this.state = STATE.INTRO;
      this.started = false;
      this.countdownLeft = 0;
      if (this.elSkipBtn) this.elSkipBtn.classList.add('ld-hidden');
      if (this.elCountdown) this.elCountdown.classList.add('ld-hidden');
      if (this.elStart) { this.elStart.classList.remove('ld-hidden'); this.elStart.setAttribute('aria-hidden', 'false'); this.elStart.inert = false; }
      if (this.elWrapper) this.elWrapper.classList.add('ld-modal-open');
      this.updateHUD(); this.updateLiveHUD();
      // Reduced motion / automation: start immediately, no countdown.
      if (this.reducedMotion) this.beginRace(true);
      else focusElement(this.elStartBtn);
    }

    beginRace(instant = false) {
      if (this.started || this.isDisposed) return;
      this.started = true;
      if (this.elStart) { this.elStart.classList.add('ld-hidden'); this.elStart.setAttribute('aria-hidden', 'true'); this.elStart.inert = true; }
      if (this.elWrapper) this.elWrapper.classList.remove('ld-modal-open');
      focusElement(this.renderer && this.renderer.domElement);
      if (instant) { this.goRace(); return; }
      this.countdownLeft = 3;
      const tick = () => {
        if (this.isDisposed || this.state !== STATE.INTRO) return;
        if (this.countdownLeft > 0) {
          this.renderCountdown(String(this.countdownLeft)); this.playSfx('count');
          this.countdownLeft -= 1;
          this.scheduleTimeout(tick, 800);
        } else {
          this.renderCountdown('GO!', true); this.playSfx('go');
          this.scheduleTimeout(() => this.elCountdown && this.elCountdown.classList.add('ld-hidden'), 650);
          this.goRace();
        }
      };
      tick();
    }
    renderCountdown(text, go = false) {
      if (!this.elCountdown) return;
      const span = document.createElement('span'); span.textContent = text; if (go) span.className = 'go';
      this.elCountdown.replaceChildren(span); this.elCountdown.classList.remove('ld-hidden');
    }
    goRace() {
      this.state = this.collectedItems.size ? STATE.COLLECTING : STATE.DRIVING;
      this.speed = Math.max(this.speed, BASE_SPEED * 0.7);
      this.showToast(this.config.hintToast, 2400);
      this.updateHUD();
    }

    skipCurrentCinematic() {
      if (this.state === STATE.INTRO) this.beginRace(true);
      else if (this.state === STATE.COMPLETED) this.openFinalModal();
    }

    openModal(modal, initialFocus) {
      if (!modal || this.isDisposed) return;
      if (this.activeModal && this.activeModal !== modal) this.closeModal(this.activeModal, false);
      this.modalPreviousFocus = document.activeElement;
      this.activeModal = modal;
      modal.classList.remove('ld-hidden'); modal.setAttribute('aria-hidden', 'false'); modal.inert = false;
      if (this.elWrapper) this.elWrapper.classList.add('ld-modal-open');
      this.clearControlStates();
      focusElement(initialFocus || modal.querySelector('button, [tabindex="-1"]'));
    }
    closeModal(modal, restoreFocus = true) {
      if (!modal) return;
      modal.classList.add('ld-hidden'); modal.setAttribute('aria-hidden', 'true'); modal.inert = true;
      if (this.activeModal === modal) {
        const previous = this.modalPreviousFocus;
        this.activeModal = null; this.modalPreviousFocus = null;
        if (this.elWrapper && this.state !== STATE.INTRO) this.elWrapper.classList.remove('ld-modal-open');
        if (restoreFocus && previous && previous.isConnected) focusElement(previous);
      }
      this.clearControlStates();
    }

    setPauseReason(reason, shouldPause) {
      if (this.isDisposed) return;
      if (reason === 'user' && shouldPause && this.state === STATE.COMPLETED) return;
      if (shouldPause) this.pauseReasons.add(reason); else this.pauseReasons.delete(reason);
      const paused = this.pauseReasons.size > 0 || !this.hostActive || document.hidden;
      if (paused) {
        this.isPaused = true;
        this.clearControlStates(); this.pauseScheduledTimeouts(); this.stopLoop(); this.suspendAudio();
        if (reason === 'user' && shouldPause) this.openModal(this.elPauseModal, this.elResumeBtn);
      } else {
        this.isPaused = false;
        this.clearControlStates();
        if (this.activeModal === this.elPauseModal) this.closeModal(this.elPauseModal);
        this.resumeScheduledTimeouts(); this.resumeAudio(); this.startLoop();
      }
      if (this.elWrapper) this.elWrapper.classList.toggle('is-paused', this.isPaused);
    }
    pauseGame() { this.setPauseReason('user', true); }
    resumeGame() { this.setPauseReason('user', false); this.activateAudioFromGesture(); }

    toggleSfx() {
      this.sfxEnabled = !this.sfxEnabled;
      if (this.elSoundBtn) { this.elSoundBtn.setAttribute('aria-pressed', String(this.sfxEnabled)); setText(this.elSoundBtn, this.sfxEnabled ? '🔊' : '🔇'); }
      if (!this.sfxEnabled) this.stopAudioSounds(); else this.activateAudioFromGesture();
    }

    sendNext() {
      if (this.nextSent || this.isDisposed) return;
      this.nextSent = true;
      if (this.elContinueBtn) this.elContinueBtn.disabled = true;
      if (this.elLoveContinueBtn) this.elLoveContinueBtn.disabled = true;
      this.clearControlStates();
      api.next();
    }

    starRating() {
      let stars = 1;
      if (this.hits <= 2) stars++;
      if (this.hits === 0 || this.bestCombo >= 15) stars++;
      return Math.min(3, stars);
    }

    triggerFinalReveal() {
      if (this.endingTriggered || this.isDisposed) return;
      this.endingTriggered = true;
      this.state = STATE.COMPLETED;
      this.clearControlStates();
      this.stopEngine();
      this.updateHUD();
      if (!this.completeSent) { this.completeSent = true; api.complete(); }
      this.playSfx('reveal');
      const p = this.gate.position;
      this.spawnParticles({ x: p.x, y: 7, z: p.z }, 'rose', 40, 1.1);
      this.spawnParticles({ x: p.x, y: 7, z: p.z }, 'gold', 40, 1.1);
      const stars = this.starRating();
      if (this.elStars) this.elStars.replaceChildren(...[0, 1, 2].map((i) => { const el = document.createElement(i < stars ? 'b' : 'span'); el.textContent = '★'; return el; }));
      if (this.elFinalStats) {
        const stat = (label, value) => { const d = document.createElement('div'); const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value; d.append(dt, dd); return d; };
        this.elFinalStats.replaceChildren(stat('Score', Math.round(this.score).toLocaleString('en-US')), stat('Combo', `x${this.bestCombo}`), stat('Hits', String(this.hits)), stat('Time', `${Math.round(this.runTime)}s`));
      }
      if (this.elSkipBtn) { setText(this.elSkipBtn, this.config.skipRevealLabel || DEFAULT_CONFIG.skipRevealLabel); this.elSkipBtn.classList.remove('ld-hidden'); }
      this.revealTimeout = this.scheduleTimeout(() => this.openFinalModal(), this.reducedMotion ? 250 : 2400);
    }
    openFinalModal() {
      if (this.isDisposed) return;
      this.clearScheduledTimeout(this.revealTimeout); this.revealTimeout = null;
      if (this.elSkipBtn) this.elSkipBtn.classList.add('ld-hidden');
      this.openModal(this.elFinalModal, this.elReadLetterBtn);
    }
    openLoveModal() { if (this.isDisposed) return; this.closeModal(this.elFinalModal, false); this.openModal(this.elLoveModal, this.elCloseLoveBtn); }
    closeLoveModal() { this.closeModal(this.elLoveModal, false); this.openFinalModal(); }

    replayMission() {
      if (this.isDisposed) return;
      this.stopLoop(); this.clearAllScheduledTimeouts(); this.clearControlStates(); this.clearParticles(); this.stopAudioSounds();
      this.closeModal(this.elFinalModal, false); this.closeModal(this.elPauseModal, false); this.closeModal(this.elLoveModal, false);
      if (this.elToast) this.elToast.classList.add('ld-hidden');
      if (this.elCombo) this.elCombo.classList.add('ld-hidden');
      this.pauseReasons.delete('user');
      this.isPaused = this.pauseReasons.size > 0 || !this.hostActive || document.hidden;
      this.collectedItems.clear();
      this.endingTriggered = false; this.completeSent = false; this.time = 0;
      this.resetRunState();
      this.car.position.set(0, 0, 0); this.car.rotation.set(0, 0, 0);
      this.camera.position.set(0, 4.2, 9);
      this.gate.visible = false;
      this.resetRows();
      if (this.elContinueBtn) this.elContinueBtn.disabled = this.nextSent;
      if (this.elLoveContinueBtn) this.elLoveContinueBtn.disabled = this.nextSent;
      this.startIntro();
      if (this.isPaused) { this.stopLoop(); this.suspendAudio(); }
      else { this.resumeScheduledTimeouts(); this.resumeAudio(); this.startLoop(); }
      if (this.elWrapper) this.elWrapper.classList.toggle('is-paused', this.isPaused);
      api.replayed();
    }

    /* ── Main loop ────────────────────────────────────────────── */
    canRender() { return !this.isDisposed && !this.isPaused && this.hostActive && !document.hidden && Boolean(this.renderer); }
    startLoop() { if (this.rafId !== null || !this.canRender()) return; this.rafId = requestAnimationFrame(this.animate); }
    stopLoop() { if (this.rafId !== null) cancelAnimationFrame(this.rafId); this.rafId = null; this.lastFrameTime = 0; }

    animate(now) {
      this.rafId = null;
      if (!this.canRender()) return;
      const rawDt = this.lastFrameTime ? (now - this.lastFrameTime) / 1000 : 0;
      this.lastFrameTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      const dtScale = dt / 0.01667;
      this.time += dt;
      const t = this.time;

      // Speed model: auto-cruise; boost (up) / brake (down)
      if (this.isDrivingState()) {
        this.runTime += dt;
        const progress = this.distance / TRACK_LENGTH;
        const cruise = Math.min(MAX_SPEED, BASE_SPEED + progress * (MAX_SPEED - BASE_SPEED));
        const target = this.keys.up ? BOOST_SPEED : this.keys.down ? MIN_SPEED : cruise;
        const accel = target > this.speed ? 18 : 30;
        this.speed += Math.sign(target - this.speed) * Math.min(Math.abs(target - this.speed), accel * dt);
        const prev = this.distance;
        this.distance += this.speed * dt;
        this.score += this.speed * dt * (this.keys.up ? 1.6 : 1);
        if (this.invulnerable > 0) this.invulnerable -= dt;
        this.spawnRows();
        this.checkCollisions(prev);
        this.recycleRows();
        if (this.state === STATE.RETURN_TO_DESTINATION && this.distance >= TRACK_LENGTH - 2) {
          this.distance = TRACK_LENGTH - 2; this.triggerFinalReveal();
        } else if (this.state !== STATE.RETURN_TO_DESTINATION && this.distance >= TRACK_LENGTH - 25) {
          this.loopStretch();
        }
      } else if (this.state === STATE.COMPLETED) {
        this.speed = Math.max(0, this.speed - 40 * dt);
        this.distance = Math.min(TRACK_LENGTH + 6, this.distance + this.speed * dt);
      }

      // Lane steering: smooth glide toward target lane
      const targetX = LANES[this.lane];
      this.laneX += (targetX - this.laneX) * Math.min(1, (this.reducedMotion ? 22 : 13) * dt);
      const carZ = -this.distance;
      this.car.position.set(this.laneX, 0, carZ);
      this.car.rotation.y = this.reducedMotion ? 0 : (this.laneX - targetX) * 0.09;
      this.car.rotation.z = this.reducedMotion ? 0 : (this.laneX - targetX) * 0.05;
      const blink = this.invulnerable > 0 && !this.reducedMotion ? (Math.sin(t * 40) > 0 ? 1 : 0.35) : 1;
      this.carBodyMat.emissiveIntensity = 0.4 * blink;
      this.car.visible = blink > 0.3;
      this.wheels.forEach((w) => { w.rotation.x -= this.speed * dt * 2.3; });
      const boosting = this.keys.up && this.isDrivingState();
      this.flameMat.opacity += ((boosting ? 0.9 : 0) - this.flameMat.opacity) * Math.min(1, 10 * dt);
      this.flames.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(t * 50 + i) * 0.25; });
      this.underglow.material.opacity = 0.7 + Math.sin(t * 4) * 0.15;
      this.carLight.position.set(this.laneX, 1.2, carZ + 0.5);
      if (boosting && !this.reducedMotion && Math.random() < 0.5) this.spawnParticles({ x: this.laneX + (Math.random() - 0.5) * 1.2, y: 0.6, z: carZ + 2.8 }, 'cyan', 1, 0.1);

      // World follows the car
      this.track.position.z = carZ;
      this.sky.position.z = carZ;
      this.roadTex.offset.y = (this.distance / 14) % 1;
      this.grid.position.z = carZ - 150 + (this.distance % 4);
      this.scenery.forEach((s) => {
        if (s.mesh.position.z > carZ + 12) s.mesh.position.z -= s.spacing;
        if (s.float !== undefined && !this.reducedMotion) s.mesh.position.y += Math.sin(t + s.float) * 0.01;
      });
      if (this.gate.visible) this.gate.position.set(0, 0, -TRACK_LENGTH);
      if (this.gateHeart && !this.reducedMotion) this.gateHeart.rotation.y = Math.sin(t * 1.4) * 0.35;

      // Animate collectibles
      for (const row of this.rows) for (const it of row.items) {
        if (it.hit) continue;
        if (it.kind === 'heart') { if (!this.reducedMotion) it.spin.rotation.y += 3 * dt; }
        else if (it.kind === 'surprise') { if (!this.reducedMotion) { it.spin.rotation.y += 1.6 * dt; it.mesh.position.y = 1.6 + Math.sin(t * 3) * 0.25; } }
        else if (it.kind === 'barrier' && !this.reducedMotion) it.spin.position.y = 1.9 + Math.sin(t * 4 + it.z) * 0.12;
      }
      this.updateParticles(dtScale);

      // Camera: chase cam with speed FOV + impact shake
      if (this.state === STATE.INTRO) {
        const orbit = this.reducedMotion ? 0 : Math.sin(t * 0.5) * 3;
        const introFov = 62 + (this.baseFovBoost || 0);
        if (Math.abs(this.camera.fov - introFov) > 0.05) { this.camera.fov = introFov; this.camera.updateProjectionMatrix(); }
        this.camera.position.set(orbit, 3.4, carZ + 8.5);
        this.camera.lookAt(this.laneX, 1, carZ - 6);
      } else if (this.state === STATE.COMPLETED) {
        const gz = -TRACK_LENGTH;
        const orbit = this.reducedMotion ? 0 : Math.sin(t * 0.6) * 9;
        this.camera.position.x += (orbit - this.camera.position.x) * Math.min(1, 2 * dt);
        this.camera.position.y += (5 - this.camera.position.y) * Math.min(1, 2 * dt);
        this.camera.position.z += (gz + 16 - this.camera.position.z) * Math.min(1, 2 * dt);
        this.camera.lookAt(0, 5, gz);
      } else {
        const lerp = Math.min(1, 8 * dt);
        this.camera.position.x += (this.laneX * 0.55 - this.camera.position.x) * lerp;
        this.camera.position.y += ((this.baseFovBoost ? 4.6 : 3.9) - this.camera.position.y) * lerp;
        this.camera.position.z = carZ + (this.baseFovBoost ? 10.2 : 8.8);
        if (this.shake > 0) {
          this.camera.position.x += (Math.random() - 0.5) * this.shake;
          this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.6;
          this.shake = Math.max(0, this.shake - dt * 1.8);
        }
        this.camera.lookAt(this.laneX * 0.7, 1.1, carZ - 9);
        const fov = 62 + (this.baseFovBoost || 0) + (this.reducedMotion ? 0 : Math.min(14, Math.max(0, this.speed - BASE_SPEED) * 0.45));
        if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov += (fov - this.camera.fov) * Math.min(1, 4 * dt); this.camera.updateProjectionMatrix(); }
      }

      this.updateEngine();
      this.updateLiveHUD();
      this.renderer.render(this.scene, this.camera);
      this.startLoop();
    }

    steer(dir) {
      if (!this.isDrivingState() || this.isPaused) return;
      const next = Math.max(0, Math.min(2, this.lane + dir));
      if (next !== this.lane) { this.lane = next; this.playSfx('whoosh'); }
    }

    /* ── Input & lifecycle ────────────────────────────────────── */
    listen(target, type, handler, options) {
      if (!target) return;
      target.addEventListener(type, handler, options);
      this.listeners.push(() => target.removeEventListener(type, handler, options));
    }

    handleModalKey(event) {
      if (!this.activeModal) return;
      if (event.code === 'Escape' || (event.code === 'KeyP' && this.activeModal === this.elPauseModal)) {
        if (this.activeModal === this.elPauseModal) { event.preventDefault(); this.resumeGame(); }
        else if (this.activeModal === this.elLoveModal && event.code === 'Escape') { event.preventDefault(); this.closeLoveModal(); }
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(this.activeModal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')).filter((el) => !el.disabled && el.getClientRects().length);
      if (!focusable.length) { event.preventDefault(); focusElement(this.activeModal.querySelector('.ld-card, .ld-love-modal-card')); return; }
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (!this.activeModal.contains(document.activeElement)) { event.preventDefault(); focusElement(event.shiftKey ? last : first); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); focusElement(last); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); focusElement(first); }
    }

    bindEvents() {
      // Left/right are discrete lane switches (tap or hold-to-repeat); up/down are held.
      const keyMap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down' };
      this.onKeyDown = (event) => {
        if (!this.hostActive) return;
        if (this.activeModal) { this.handleModalKey(event); return; }
        if (this.state === STATE.INTRO && !this.started && (event.code === 'Enter' || event.code === 'Space')) {
          event.preventDefault(); this.activateAudioFromGesture(); this.beginRace(); return;
        }
        if (event.code === 'Escape' || event.code === 'KeyP') {
          if (event.repeat || this.state === STATE.COMPLETED) return;
          event.preventDefault(); this.activateAudioFromGesture(); this.pauseGame(); return;
        }
        if (event.code === 'KeyM') { event.preventDefault(); this.toggleSfx(); return; }
        const key = keyMap[event.code];
        if (!key || this.isPaused || this.state === STATE.COMPLETED) return;
        event.preventDefault();
        this.activateAudioFromGesture();
        if (key === 'left' || key === 'right') {
          if (!this.keys[key] || event.repeat) this.steer(key === 'left' ? -1 : 1);
        }
        this.keys[key] = true;
      };
      this.onKeyUp = (event) => { const key = keyMap[event.code]; if (key) this.keys[key] = false; };
      this.listen(document, 'keydown', this.onKeyDown, { passive: false });
      this.listen(document, 'keyup', this.onKeyUp);

      this.onBlur = () => this.setPauseReason('blur', true);
      this.onFocus = () => { if (!document.hidden) this.setPauseReason('blur', false); };
      this.onVisibility = () => { this.setPauseReason('hidden', document.hidden); if (!document.hidden && document.hasFocus()) this.setPauseReason('blur', false); };
      this.listen(window, 'blur', this.onBlur);
      this.listen(window, 'focus', this.onFocus);
      this.listen(document, 'visibilitychange', this.onVisibility);
      this.listen(this.elWrapper, 'pointerdown', () => this.activateAudioFromGesture(), { passive: true });

      // Swipe / tap on the road: swipe left/right = lane, swipe up = boost burst, tap side = lane.
      const canvas = this.renderer.domElement;
      this.swipe = null;
      this.listen(canvas, 'pointerdown', (e) => {
        focusElement(canvas);
        if (this.state === STATE.INTRO && !this.started) return;
        this.swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
      }, { passive: true });
      this.listen(canvas, 'pointermove', (e) => {
        const s = this.swipe; if (!s || s.id !== e.pointerId) return;
        const dx = e.clientX - s.x; const dy = e.clientY - s.y;
        if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) { this.steer(dx < 0 ? -1 : 1); s.x = e.clientX; s.y = e.clientY; s.moved = true; }
        else if (dy < -40 && Math.abs(dy) > Math.abs(dx)) { this.keys.up = true; s.boost = true; s.moved = true; }
      }, { passive: true });
      const endSwipe = (e) => {
        const s = this.swipe; if (!s || s.id !== e.pointerId) return;
        if (s.boost) this.keys.up = false;
        if (!s.moved && performance.now() - s.t < 260) {
          const rect = canvas.getBoundingClientRect();
          this.steer(e.clientX < rect.left + rect.width / 2 ? -1 : 1);
        }
        this.swipe = null;
      };
      this.listen(canvas, 'pointerup', endSwipe);
      this.listen(canvas, 'pointercancel', endSwipe);

      const bindTouchButton = (id, key) => {
        const element = document.getElementById(id);
        if (!element) return;
        let repeat = null;
        const stopRepeat = () => { if (repeat) { clearInterval(repeat); repeat = null; } };
        const activate = (event) => {
          event.preventDefault();
          if (this.isPaused || !this.hostActive || this.activeModal || this.state === STATE.COMPLETED) return;
          this.activateAudioFromGesture();
          try { if (element.setPointerCapture && event.pointerId !== undefined) element.setPointerCapture(event.pointerId); } catch (_) {}
          this.activePointers.set(event.pointerId, { key, el: element });
          this.keys[key] = true;
          element.classList.add('ld-active');
          if (key === 'left' || key === 'right') {
            const dir = key === 'left' ? -1 : 1;
            this.steer(dir);
            stopRepeat();
            repeat = setInterval(() => { if (this.keys[key]) this.steer(dir); else stopRepeat(); }, 260);
          }
        };
        const deactivate = (event) => {
          if (event && event.cancelable) event.preventDefault();
          if (event && event.pointerId !== undefined) this.activePointers.delete(event.pointerId);
          let stillHeld = false;
          this.activePointers.forEach((v) => { if (v.key === key) stillHeld = true; });
          if (!stillHeld) { this.keys[key] = false; element.classList.remove('ld-active'); stopRepeat(); }
        };
        this.listen(element, 'pointerdown', activate, { passive: false });
        this.listen(element, 'pointerup', deactivate, { passive: false });
        this.listen(element, 'pointercancel', deactivate, { passive: false });
        this.listen(element, 'lostpointercapture', deactivate, { passive: false });
        this.listen(element, 'contextmenu', (e) => e.preventDefault());
        this.listeners.push(stopRepeat);
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
        this.activePointers.forEach((v) => { if (v.key === info.key) stillHeld = true; });
        if (!stillHeld) { this.keys[info.key] = false; info.el.classList.remove('ld-active'); }
      };
      this.listen(window, 'pointerup', this.onGlobalPointerEnd);
      this.listen(window, 'pointercancel', this.onGlobalPointerEnd);

      this.listen(this.elStartBtn, 'click', () => { this.activateAudioFromGesture(); this.beginRace(); });
      this.listen(this.elSkipBtn, 'click', () => this.skipCurrentCinematic());
      this.listen(this.elPauseBtn, 'click', () => this.pauseGame());
      this.listen(this.elSoundBtn, 'click', () => this.toggleSfx());
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
        const w = Math.round(rect.width); const h = Math.round(rect.height);
        if (!w || !h) return;
        this.camera.aspect = w / h;
        // Portrait phones: widen FOV a little so all three lanes stay visible.
        this.baseFovBoost = w / h < 0.75 ? 10 : 0;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        if (!this.isDrivingState() && this.scene) this.renderer.render(this.scene, this.camera);
      };
      this.onOrientationChange = () => {
        this.clearScheduledTimeout(this.orientationTimer);
        this.orientationTimer = this.scheduleTimeout(() => { this.orientationTimer = null; this.onResize(); }, 120);
      };
      this.listen(window, 'resize', this.onResize);
      this.listen(window, 'orientationchange', this.onOrientationChange);
      if (window.visualViewport) this.listen(window.visualViewport, 'resize', this.onResize);
      if (typeof ResizeObserver !== 'undefined') { this.resizeObserver = new ResizeObserver(this.onResize); this.resizeObserver.observe(this.container); }
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
      this.listeners.splice(0).forEach((remove) => { try { remove(); } catch (_) {} counters.listenersRemoved += 1; });
      if (this.resizeObserver) this.resizeObserver.disconnect();
      this.resizeObserver = null;
      this.stopAudioSounds();
      if (this.audioCtx && this.audioCtx.state !== 'closed') { try { this.audioCtx.close().catch(() => {}); counters.audioClosed += 1; } catch (_) {} }
      this.audioCtx = null;

      const geometries = new Set(); const materials = new Set(); const textures = new Set(); const renderTargets = new Set();
      const collectMaterial = (material) => {
        if (!material) return;
        materials.add(material);
        Object.values(material).forEach((v) => { if (v && v.isTexture) textures.add(v); if (v && v.isWebGLRenderTarget) renderTargets.add(v); });
      };
      const sceneRef = this.scene;
      if (sceneRef) {
        // Include detached row items/particles too.
        this.rows.forEach((r) => r.items.forEach((it) => sceneRef.add(it.mesh)));
        sceneRef.traverse((o) => { if (o.geometry) geometries.add(o.geometry); if (Array.isArray(o.material)) o.material.forEach(collectMaterial); else collectMaterial(o.material); });
        if (sceneRef.background && sceneRef.background.isTexture) textures.add(sceneRef.background);
      }
      const collectShared = (v) => {
        if (!v) return;
        if (v.isBufferGeometry || v.isGeometry) { geometries.add(v); return; }
        if (v.isMaterial) { collectMaterial(v); return; }
        if (v.isTexture) { textures.add(v); return; }
        if (Array.isArray(v)) { v.forEach(collectShared); return; }
        if (typeof v === 'object') Object.values(v).forEach(collectShared);
      };
      Object.values(this.shared || {}).forEach(collectShared);
      [this.roadTex, this.sunTex].forEach((tx) => tx && textures.add(tx));
      renderTargets.forEach((x) => { try { x.dispose(); } catch (_) {} });
      textures.forEach((x) => { try { x.dispose(); } catch (_) {} });
      materials.forEach((x) => { try { x.dispose(); } catch (_) {} });
      geometries.forEach((x) => { try { x.dispose(); } catch (_) {} });
      counters.renderTargets += renderTargets.size; counters.textures += textures.size; counters.materials += materials.size; counters.geometries += geometries.size;

      const canvas = this.renderer && this.renderer.domElement;
      if (this.renderer) { try { this.renderer.dispose(); } catch (_) {} try { this.renderer.forceContextLoss(); } catch (_) {} }
      if (canvas) { canvas.remove(); counters.canvasesRemoved += 1; }
      if (this.container) this.container.replaceChildren();

      this.scene = null; this.camera = null; this.renderer = null; this.shared = null;
      this.car = null; this.gate = null; this.track = null; this.sky = null;
      this.rows = []; this.particles = []; this.scenery = [];
      this.activeModal = null; this.modalPreviousFocus = null;
      Object.keys(this).forEach((key) => { if (key.startsWith('el')) this[key] = null; });
      this.slots = null; this.controlButtons = []; this.container = null;
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
