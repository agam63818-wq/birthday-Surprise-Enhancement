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

  /**
   * Parent Website Audio & Modal Integration Adapter
   * Allows parent Birthday Surprise Website to configure or hook directly via:
   * window.LoveDriveConfig = {
   *   isSoundEnabled: () => !window.mySiteMuted,
   *   playSfx: (type) => window.mySiteAudio?.playSfx(type),
   *   openLoveLetterModal: () => window.openBirthdayModal(),
   *   recipientName: '...',
   *   customBirthdayMessage: '...'
   * }
   */
  const WebsiteAdapter = {
    isSoundEnabled() {
      const cfg = window.LoveDriveConfig || {};
      if (typeof cfg.isSoundEnabled === 'function') {
        return Boolean(cfg.isSoundEnabled());
      }
      // Inspect parent window / document if embedded or same-origin
      const scopes = [window];
      try {
        if (window.parent && window.parent !== window) scopes.push(window.parent);
      } catch (e) { /* Cross-origin parent safe guard */ }

      for (const scope of scopes) {
        if (typeof scope.isSoundMuted === 'boolean') return !scope.isSoundMuted;
        if (typeof scope.isMuted === 'boolean') return !scope.isMuted;
        if (typeof scope.soundEnabled === 'boolean') return scope.soundEnabled;
        if (typeof scope.musicMuted === 'boolean' && typeof scope.sfxMuted === 'boolean') {
          return !scope.sfxMuted;
        }
        try {
          const doc = scope.document;
          if (!doc) continue;
          // Check active audio elements (never pause or restart them, only read state)
          const audios = doc.querySelectorAll('audio');
          for (let i = 0; i < audios.length; i++) {
            if (audios[i].muted || audios[i].volume === 0) return false;
          }
          // Check common sound toggle attributes/classes on host website
          const muteToggle = doc.querySelector(
            '[data-sound="off"], [data-muted="true"], [aria-pressed="true"].mute-btn, .sound-off, .is-muted'
          );
          if (muteToggle) return false;
        } catch (e) {}
      }

      // Check localStorage conventions if parent site persists mute state
      try {
        const storedMute = localStorage.getItem('soundMuted') ?? localStorage.getItem('isMuted');
        if (storedMute === 'true') return false;
        const storedSound = localStorage.getItem('soundEnabled');
        if (storedSound === 'false') return false;
      } catch (e) {}

      return true;
    },

    openLoveLetterModal(fallbackOpenFn) {
      const cfg = window.LoveDriveConfig || {};
      if (typeof cfg.openLoveLetterModal === 'function') {
        cfg.openLoveLetterModal();
        return true;
      }

      const scopes = [window];
      try {
        if (window.parent && window.parent !== window) scopes.push(window.parent);
      } catch (e) {}

      // 1. Check verified global modal functions from original Love Drive or parent website
      const fnNames = [
        'openLoveLetterModal',
        'openLoveModal',
        'showLoveLetter',
        'openSurpriseModal',
        'openBirthdayModal',
        'openModal'
      ];
      for (const scope of scopes) {
        for (const fn of fnNames) {
          if (typeof scope[fn] === 'function') {
            scope[fn]();
            return true;
          }
        }
      }

      // 2. Use built-in #love-modal present in index.html
      if (typeof fallbackOpenFn === 'function') {
        fallbackOpenFn();
        return true;
      }
      return false;
    }
  };

  class LoveDriveGame {
    constructor(options = {}) {
      this.container = document.getElementById(options.containerId || 'ld-canvas-container');
      if (!this.container) return;

      const cfg = window.LoveDriveConfig || {};
      this.recipientName = options.recipientName || cfg.recipientName || window.RECIPIENT_NAME || '';
      this.customMessage = options.customBirthdayMessage || cfg.customBirthdayMessage || '';

      this.state = STATE.INTRO;
      this.isPaused = false;
      this.isDisposed = false;
      this.rafId = null;
      this.lastFrameTime = performance.now();

      // Mission Tracking
      this.collectedItems = new Set();
      this.totalRequired = 3;
      this.introTimer = 0;
      this.endingTriggered = false;
      this.lastEarlyWarningTime = 0;
      this.lastCollisionSfxTime = 0;

      // Active Timeouts (Tracked for clean reset on replay/pause)
      this.activeTimeouts = new Set();
      this.toastTimeout = null;
      this.revealTimeout = null;

      // World Entities
      this.blocks = [];
      this.collectibles = [];
      this.particles = [];
      this.guideTrail = [];

      // Controls & Physics State
      this.keys = { left: false, right: false, up: false, down: false };
      this.activePointers = new Map();
      this.carVelocity = 0;
      this.carPrevPos = new THREE.Vector3(0, 0, 10);

      // Shared AudioContext (Single instance, lazy-initialized on user gesture)
      this.audioCtx = null;

      this.initDOM();
      this.initSharedResources();
      this.initThree();
      this.buildWorld();
      this.bindEvents();
      this.startIntro();

      this.animate = this.animate.bind(this);
      this.startLoop();
    }

    /* ==========================================
       TIMER MANAGEMENT
       ========================================== */
    scheduleTimeout(fn, delay) {
      const id = setTimeout(() => {
        this.activeTimeouts.delete(id);
        if (!this.isDisposed) fn();
      }, delay);
      this.activeTimeouts.add(id);
      return id;
    }

    clearAllScheduledTimeouts() {
      this.activeTimeouts.forEach((id) => clearTimeout(id));
      this.activeTimeouts.clear();
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
        this.toastTimeout = null;
      }
      if (this.revealTimeout) {
        clearTimeout(this.revealTimeout);
        this.revealTimeout = null;
      }
    }

    /* ==========================================
       AUDIO SYSTEM (RESPECTS WEBSITE SOUND)
       ========================================== */
    getAudioContext() {
      if (window.LoveDriveConfig && window.LoveDriveConfig.audioContext) {
        return window.LoveDriveConfig.audioContext;
      }
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    }

    playTone(freq, type = 'sine', duration = 0.18, vol = 0.11, slideFreq = null) {
      if (!WebsiteAdapter.isSoundEnabled()) return;
      try {
        const ctx = this.getAudioContext();
        if (!ctx || ctx.state !== 'running') return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        if (slideFreq) {
          osc.frequency.exponentialRampToValueAtTime(slideFreq, ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {}
    }

    playSfx(type) {
      if (!WebsiteAdapter.isSoundEnabled()) return;
      if (window.LoveDriveConfig && typeof window.LoveDriveConfig.playSfx === 'function') {
        window.LoveDriveConfig.playSfx(type);
        return;
      }

      const now = performance.now();
      if (type === 'impact') {
        if (now - this.lastCollisionSfxTime < 220) return;
        this.lastCollisionSfxTime = now;
        this.playTone(155, 'triangle', 0.13, 0.13, 68);
        this.scheduleTimeout(() => this.playTone(310, 'sine', 0.09, 0.07, 175), 35);
      } else if (type === 'sparkle') {
        this.playTone(587.33, 'sine', 0.16, 0.09, 880);
      } else if (type === 'collect') {
        [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => {
          this.scheduleTimeout(() => this.playTone(n, 'sine', 0.24, 0.12), i * 80);
        });
      } else if (type === 'reveal') {
        [440, 554.37, 659.25, 880, 1108.73].forEach((n, i) => {
          this.scheduleTimeout(() => this.playTone(n, 'triangle', 0.45, 0.11), i * 105);
        });
      }
    }

    /* ==========================================
       DOM & HUD MANAGEMENT
       ========================================== */
    initDOM() {
      this.elObjective = document.getElementById('ld-objective-text');
      this.elCounter = document.getElementById('ld-counter-text');
      this.elToast = document.getElementById('ld-toast');
      this.elSkipBtn = document.getElementById('ld-btn-skip');
      this.elPauseModal = document.getElementById('ld-pause-modal');
      this.elFinalModal = document.getElementById('ld-final-modal');
      this.elFinalTitle = document.getElementById('ld-final-title');
      this.elFinalMsg = document.getElementById('ld-final-msg');
      this.elLoveModal = document.getElementById('love-modal');

      this.slots = {
        LETTER: document.getElementById('ld-slot-letter'),
        GIFT: document.getElementById('ld-slot-gift'),
        HEART: document.getElementById('ld-slot-heart')
      };

      if (this.elFinalTitle && this.recipientName) {
        this.elFinalTitle.textContent = `Happy Birthday, ${this.recipientName}! ✨`;
      }
      if (this.elFinalMsg && this.customMessage) {
        this.elFinalMsg.textContent = this.customMessage;
      }
    }

    showToast(msg, duration = 2600) {
      if (!this.elToast) return;
      this.elToast.textContent = msg;
      this.elToast.classList.remove('ld-hidden');
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        if (this.elToast) this.elToast.classList.add('ld-hidden');
      }, duration);
    }

    updateHUD() {
      const count = this.collectedItems.size;
      if (this.elCounter) this.elCounter.textContent = `${count}/${this.totalRequired}`;

      Object.keys(this.slots).forEach((key) => {
        if (this.slots[key]) {
          this.slots[key].classList.toggle('ld-collected', this.collectedItems.has(key));
        }
      });

      if (!this.elObjective) return;
      if (this.state === STATE.COMPLETED) {
        this.elObjective.textContent = 'Mission Complete! Happy Birthday! 🎉';
      } else if (count === 0) {
        this.elObjective.textContent = 'Crash glowing gold blocks & find 3 Hidden Surprises';
      } else if (count < 3) {
        this.elObjective.textContent = `Keep exploring! ${3 - count} surprise(s) left to collect`;
      } else {
        this.elObjective.textContent = 'All 3 found! Follow the Golden Hearts to the Postbox 📮';
      }
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
      this.MAX_PARTICLES = 120;
    }

    initThree() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xffdde1);
      this.scene.fog = new THREE.FogExp2(0xffdde1, 0.0075);

      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 320);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(w, h);
      // Cap pixel ratio at 1.75 for smooth mid-range mobile performance
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);

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
        { z: -65, x: -2.4, type: 'LETTER', label: '💌 Love Letter Collected!' },
        { z: -145, x: 2.6, type: 'GIFT', label: '🎁 Birthday Gift Collected!' },
        { z: -225, x: -2.0, type: 'HEART', label: '💛 Golden Heart Collected!' }
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
      for (let i = 0; i < count; i++) {
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
            this.showToast('✨ Secret Block Broken! Drive into the Surprise ahead!', 2200);
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
                  this.showToast('💖 All 3 Surprises Found! Deliver them to the Postbox ahead!', 3400);
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
            this.showToast(
              `📮 Postbox Locked! Collect ${remaining} more hidden surprise(s) along the road first!`,
              3000
            );
            // Gently bounce car back so they can reverse/drive to remaining blocks
            this.carVelocity = -0.28;
          }
        }
      }
    }

    /* ==========================================
       MISSION FLOW & CONTROLS RESET
       ========================================== */
    clearControlStates() {
      this.keys.left = false;
      this.keys.right = false;
      this.keys.up = false;
      this.keys.down = false;
      this.activePointers.clear();
      const btns = document.querySelectorAll('.ld-ctrl-btn');
      btns.forEach((b) => b.classList.remove('ld-active'));
    }

    startIntro() {
      this.state = STATE.INTRO;
      this.introTimer = 0;
      if (this.elSkipBtn) {
        this.elSkipBtn.textContent = 'Skip Intro ➔';
        this.elSkipBtn.classList.remove('ld-hidden');
      }
      this.showToast('✨ Welcome to Love Drive! Find the 3 Hidden Surprises ✨', 3200);
      this.updateHUD();
    }

    skipCurrentCinematic() {
      if (this.state === STATE.INTRO) {
        this.state = STATE.DRIVING;
        if (this.elSkipBtn) this.elSkipBtn.classList.add('ld-hidden');
        this.showToast('Steer & crash through glowing gold blocks! 🚗💨', 2500);
        this.updateHUD();
      } else if (this.state === STATE.COMPLETED) {
        this.openFinalModal();
      }
    }

    pauseGame() {
      if (this.state === STATE.COMPLETED || this.isPaused) return;
      this.isPaused = true;
      this.clearControlStates();
      if (this.elPauseModal) this.elPauseModal.classList.remove('ld-hidden');
    }

    resumeGame() {
      if (!this.isPaused) return;
      this.isPaused = false;
      this.clearControlStates();
      this.lastFrameTime = performance.now();
      if (this.elPauseModal) this.elPauseModal.classList.add('ld-hidden');
    }

    triggerFinalReveal() {
      if (this.endingTriggered) return;
      this.endingTriggered = true;
      this.state = STATE.COMPLETED;
      this.carVelocity = 0;
      this.clearControlStates();
      this.updateHUD();

      this.playSfx('reveal');
      this.spawnParticles(this.postbox.position, 'rose', 30);
      this.spawnParticles(this.postbox.position, 'gold', 30);

      if (this.elSkipBtn) {
        this.elSkipBtn.textContent = 'Skip Reveal ➔';
        this.elSkipBtn.classList.remove('ld-hidden');
      }

      this.revealTimeout = this.scheduleTimeout(() => {
        this.openFinalModal();
      }, 2600);
    }

    openFinalModal() {
      if (this.revealTimeout) {
        clearTimeout(this.revealTimeout);
        this.revealTimeout = null;
      }
      if (this.elSkipBtn) this.elSkipBtn.classList.add('ld-hidden');
      if (this.elFinalModal) this.elFinalModal.classList.remove('ld-hidden');
    }

    replayMission() {
      this.clearAllScheduledTimeouts();
      this.clearControlStates();
      this.clearParticles();

      if (this.elFinalModal) this.elFinalModal.classList.add('ld-hidden');
      if (this.elPauseModal) this.elPauseModal.classList.add('ld-hidden');
      if (this.elLoveModal) this.elLoveModal.classList.add('ld-hidden');
      if (this.elToast) this.elToast.classList.add('ld-hidden');

      this.collectedItems.clear();
      this.endingTriggered = false;
      this.isPaused = false;
      this.lastEarlyWarningTime = 0;
      this.lastCollisionSfxTime = 0;

      this.car.position.set(0, 0, 10);
      this.carPrevPos.copy(this.car.position);
      this.car.rotation.set(0, 0, 0);
      this.carVelocity = 0;
      this.postboxLid.position.y = 2.8;

      this.guideTrail.forEach((m) => { m.visible = false; });
      this.populateBlocksAndSurprises();
      this.updateHUD();
      this.lastFrameTime = performance.now();
      this.startIntro();
    }

    /* ==========================================
       MAIN LOOP (SINGLE RAF + DELTA CLAMPED)
       ========================================== */
    startLoop() {
      if (this.rafId !== null) return;
      this.lastFrameTime = performance.now();
      this.rafId = requestAnimationFrame(this.animate);
    }

    animate(now) {
      if (this.isDisposed) {
        this.rafId = null;
        return;
      }
      this.rafId = requestAnimationFrame(this.animate);

      // Clamp delta time so tab switching or frame drops never cause physics jumps
      const rawDt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      if (this.isPaused) return;

      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      const dtScale = dt / 0.01667;

      this.updateParticles(dtScale);

      // Update Collectibles (idle bobbing + pickup rise/scale animation)
      for (let i = this.collectibles.length - 1; i >= 0; i--) {
        const c = this.collectibles[i];
        if (c.collectingAnim) {
          c.animProgress += dt * 3.2;
          c.mesh.position.y += dt * 4.5;
          c.mesh.rotation.y += 0.25 * dtScale;
          const s = Math.max(0.01, 1 - c.animProgress);
          c.mesh.scale.setScalar(s);
          if (c.animProgress >= 1) {
            this.scene.remove(c.mesh);
            c.collectingAnim = false;
          }
        } else if (!c.collected) {
          c.mesh.rotation.y += 0.045 * dtScale;
          c.mesh.position.y = 1.45 + Math.sin(now * 0.005) * 0.22;
        }
      }

      // Animate Guide Trail
      for (let i = 0; i < this.guideTrail.length; i++) {
        const m = this.guideTrail[i];
        if (m.visible) {
          m.rotation.y += 0.05 * dtScale;
          m.position.y = 1.15 + Math.sin(now * 0.006 + i) * 0.2;
        }
      }

      if (this.state === STATE.INTRO) {
        this.introTimer += dt;
        const p = Math.min(this.introTimer / 4.2, 1);
        this.camera.position.set(
          Math.sin(p * Math.PI) * 8,
          6 - p * 1.4,
          22 - p * 3
        );
        this.camera.lookAt(this.car.position.x, 1.2, this.car.position.z - 8);
        if (p >= 1) this.skipCurrentCinematic();
      } else if (
        this.state === STATE.DRIVING ||
        this.state === STATE.COLLECTING ||
        this.state === STATE.RETURN_TO_DESTINATION
      ) {
        this.carPrevPos.copy(this.car.position);

        if (this.keys.up) {
          this.carVelocity = Math.min(this.carVelocity + 0.018 * dtScale, 0.58);
        } else if (this.keys.down) {
          this.carVelocity = Math.max(this.carVelocity - 0.022 * dtScale, -0.38);
        } else {
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

        // Smooth Follow Camera
        const camLerp = Math.min(1, 0.14 * dtScale);
        this.camera.position.x += (this.car.position.x * 0.6 - this.camera.position.x) * camLerp;
        this.camera.position.y += (4.8 - this.camera.position.y) * camLerp;
        this.camera.position.z += (this.car.position.z + 10.5 - this.camera.position.z) * camLerp;
        this.camera.lookAt(this.car.position.x * 0.5, 1.2, this.car.position.z - 10);

        this.checkCollisions();
      } else if (this.state === STATE.COMPLETED) {
        this.postboxLid.position.y = Math.min(4.2, this.postboxLid.position.y + 0.03 * dtScale);
        this.camera.position.x = Math.sin(now * 0.001) * 7;
        this.camera.position.y = 4.2;
        this.camera.position.z = this.postbox.position.z + 9;
        this.camera.lookAt(this.postbox.position.x, 2.0, this.postbox.position.z);
      }

      this.renderer.render(this.scene, this.camera);
    }

    /* ==========================================
       INPUT & LIFECYCLE EVENTS
       ========================================== */
    bindEvents() {
      this.onKeyDown = (e) => {
        if (this.isPaused || this.state === STATE.COMPLETED) return;
        if (['ArrowLeft', 'KeyA'].includes(e.code)) { this.keys.left = true; e.preventDefault(); }
        if (['ArrowRight', 'KeyD'].includes(e.code)) { this.keys.right = true; e.preventDefault(); }
        if (['ArrowUp', 'KeyW'].includes(e.code)) { this.keys.up = true; e.preventDefault(); }
        if (['ArrowDown', 'KeyS'].includes(e.code)) { this.keys.down = true; e.preventDefault(); }
        if (e.code === 'Escape' || e.code === 'KeyP') {
          if (this.isPaused) this.resumeGame();
          else this.pauseGame();
        }
      };

      this.onKeyUp = (e) => {
        if (['ArrowLeft', 'KeyA'].includes(e.code)) this.keys.left = false;
        if (['ArrowRight', 'KeyD'].includes(e.code)) this.keys.right = false;
        if (['ArrowUp', 'KeyW'].includes(e.code)) this.keys.up = false;
        if (['ArrowDown', 'KeyS'].includes(e.code)) this.keys.down = false;
      };

      window.addEventListener('keydown', this.onKeyDown, { passive: false });
      window.addEventListener('keyup', this.onKeyUp);

      // Clear held keys on window blur or visibility change
      this.onBlurOrHide = () => {
        this.clearControlStates();
        if (document.hidden && this.state !== STATE.COMPLETED && !this.isPaused) {
          this.pauseGame();
        }
      };
      window.addEventListener('blur', this.onBlurOrHide);
      document.addEventListener('visibilitychange', this.onBlurOrHide);

      // Reliable Mobile Pointer Controls with setPointerCapture & global release fallback
      const bindTouchButton = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;

        const activate = (e) => {
          e.preventDefault();
          if (this.isPaused || this.state === STATE.COMPLETED) return;
          try {
            if (el.setPointerCapture && e.pointerId !== undefined) {
              el.setPointerCapture(e.pointerId);
            }
          } catch (err) {}
          this.activePointers.set(e.pointerId, { key, el });
          this.keys[key] = true;
          el.classList.add('ld-active');
        };

        const deactivate = (e) => {
          if (e && e.cancelable) e.preventDefault();
          if (e && e.pointerId !== undefined && this.activePointers.has(e.pointerId)) {
            this.activePointers.delete(e.pointerId);
          }
          // Only release key if no other active pointer is holding the same action
          let stillHeld = false;
          this.activePointers.forEach((v) => {
            if (v.key === key) stillHeld = true;
          });
          if (!stillHeld) {
            this.keys[key] = false;
            el.classList.remove('ld-active');
          }
        };

        el.addEventListener('pointerdown', activate);
        el.addEventListener('pointerup', deactivate);
        el.addEventListener('pointercancel', deactivate);
        el.addEventListener('lostpointercapture', deactivate);
      };

      bindTouchButton('ld-btn-left', 'left');
      bindTouchButton('ld-btn-right', 'right');
      bindTouchButton('ld-btn-gas', 'up');
      bindTouchButton('ld-btn-brake', 'down');

      // Global safety listener in case pointerup happens outside captured element
      this.onGlobalPointerEnd = (e) => {
        if (this.activePointers.has(e.pointerId)) {
          const info = this.activePointers.get(e.pointerId);
          this.activePointers.delete(e.pointerId);
          this.keys[info.key] = false;
          info.el.classList.remove('ld-active');
        }
      };
      window.addEventListener('pointerup', this.onGlobalPointerEnd);
      window.addEventListener('pointercancel', this.onGlobalPointerEnd);

      // UI Button Listeners
      document.getElementById('ld-btn-skip')?.addEventListener('click', () => this.skipCurrentCinematic());
      document.getElementById('ld-btn-pause')?.addEventListener('click', () => this.pauseGame());
      document.getElementById('ld-btn-resume')?.addEventListener('click', () => this.resumeGame());
      document.getElementById('ld-btn-restart-pause')?.addEventListener('click', () => this.replayMission());
      document.getElementById('ld-btn-replay')?.addEventListener('click', () => this.replayMission());

      // Final Surprise Modal Integration
      document.getElementById('ld-btn-open-letter')?.addEventListener('click', () => {
        if (this.elFinalModal) this.elFinalModal.classList.add('ld-hidden');
        WebsiteAdapter.openLoveLetterModal(() => {
          if (this.elLoveModal) {
            this.elLoveModal.classList.remove('ld-hidden');
          }
        });
      });

      // Built-in #love-modal close/replay buttons
      document.getElementById('close-modal')?.addEventListener('click', () => {
        if (this.elLoveModal) this.elLoveModal.classList.add('ld-hidden');
        if (this.elFinalModal) this.elFinalModal.classList.remove('ld-hidden');
      });

      document.getElementById('save-modal-btn')?.addEventListener('click', () => {
        if (this.elLoveModal) this.elLoveModal.classList.add('ld-hidden');
        this.replayMission();
      });

      this.onResize = () => {
        if (!this.container || this.isDisposed) return;
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        if (w === 0 || h === 0) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      };
      window.addEventListener('resize', this.onResize);
      window.addEventListener('orientationchange', () => setTimeout(this.onResize, 120));
    }

    dispose() {
      this.isDisposed = true;
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.clearAllScheduledTimeouts();
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('blur', this.onBlurOrHide);
      document.removeEventListener('visibilitychange', this.onBlurOrHide);
      window.removeEventListener('pointerup', this.onGlobalPointerEnd);
      window.removeEventListener('pointercancel', this.onGlobalPointerEnd);
      window.removeEventListener('resize', this.onResize);
      this.renderer?.dispose();
    }
  }

  // Expose singleton initializer so replay or re-mounting never creates duplicate loops
  window.LoveDriveGame = LoveDriveGame;
  window.initLoveDriveGame = function (options) {
    if (window.loveDriveInstance && !window.loveDriveInstance.isDisposed) {
      window.loveDriveInstance.dispose();
    }
    window.loveDriveInstance = new LoveDriveGame(options);
    return window.loveDriveInstance;
  };

  window.addEventListener('DOMContentLoaded', () => {
    window.initLoveDriveGame();
  });
})();
