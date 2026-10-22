(() => {
    'use strict';
    const api = window.__experience;
    if (!api) return;
    const $ = id => document.getElementById(id);
    const root = $('confession-root'), yesBtn = $('yesBtn'), noBtn = $('noBtn');
    const questionScreen = $('question-screen'), questionText = $('question-text'), noReaction = $('no-reaction');
    const climaxScreen = $('climax-screen'), loveBgText = $('love-bg-text');
    const envelopeTrigger = $('envelope-trigger'), envelopeFlap = envelopeTrigger.querySelector('.envelope-icon > span:first-child');
    const envelopeLabel = $('envelope-label'), climaxLine1 = $('climax-line-1'), climaxLine2 = $('climax-line-2');
    const finalActions = $('final-actions'), continueBtn = $('continueBtn'), replayBtn = $('replayBtn');
    const letterOverlay = $('letter-overlay'), letterBox = $('letter-box'), letterTextElement = $('letter-text');
    const letterTitle = $('letter-title'), signature = $('letter-signature'), signatureLead = $('signature-lead'), signatureName = $('signature-name'), closeBtn = $('closeBtn');
    const fallback = $('experience-fallback'), fallbackContinue = $('fallback-continue');
    const canvas = $('c'), ctx = canvas.getContext('2d'), confettiCanvas = $('confetti-canvas'), particlesContainer = $('particles');

    const NUM_POINTS = 220, WORDS = ['I love you', 'i love you', '❤', 'love', 'te amo', "je t'aime", 'forever', 'always', 'you', 'me & you', 'love you', 'sweetheart'];
    const RAIN_DURATION = 1500, ASSEMBLE_DURATION = 1800, ROTATION_SPEED_Y = 0.012;
    let config = {}, W = 1, H = 1, CX = 0.5, CY = 0.5, dpr = 1, scale = 1;
    let state = 'question', reduced = false, hostPaused = false, disposed = false;
    let rafId = null, lastNow = 0, elapsed = 0, time = 0, canvasActive = false;
    let heartParticles = [], bgStars = [], sparkles = [], rotY = 0, rotX = 0.2, beatIntensity = 0;
    let letterOpen = false, typingActive = false, typingIndex = 0, typingTimer = null, previousFocus = null;
    let dodgeCount = 0, noIsAbsolute = false, noTween = null, yesTween = null, completeSent = false, nextSent = false;
    let resizeObserver = null, disposalCount = 0;
    const listeners = [], timers = new Set(), tweens = new Set(), sounds = new Set();
    let audioCtx = null, audioActivated = false;
    let confettiInstance = null, confettiRaf = null, confettiEnd = 0, confettiRemaining = 0;

    const debug = {
        get activeLoops() { return (rafId === null ? 0 : 1) + (confettiRaf === null ? 0 : 1); },
        get activeTimers() { return timers.size; }, get activeTweens() { return tweens.size; },
        get audioContexts() { return audioCtx ? 1 : 0; }, get audioState() { return audioCtx ? audioCtx.state : 'none'; },
        get disposals() { return disposalCount; },
    };
    Object.defineProperty(window, '__loveConfessionDebug', { value: debug, configurable: false });

    function listen(target, type, handler, options) { target.addEventListener(type, handler, options); listeners.push(() => target.removeEventListener(type, handler, options)); }
    function setText(element, value) { if (element) element.textContent = value == null ? '' : String(value); }
    function setTheme(theme) { Object.entries(theme || {}).forEach(([key, value]) => root.style.setProperty(key, value)); }
    function focus(element) { try { element && element.focus({ preventScroll: true }); } catch (_) {} }
    function visible(element, show) { element.classList.toggle('hidden-state', !show); element.setAttribute('aria-hidden', String(!show)); element.inert = !show; }

    function schedule(callback, delay) {
        const timer = { callback, remaining: delay, started: 0, id: null };
        timer.run = () => { timers.delete(timer); timer.id = null; if (!disposed) callback(); };
        timers.add(timer);
        if (!disposed && !hostPaused && !document.hidden) { timer.started = performance.now(); timer.id = setTimeout(timer.run, delay); }
        return timer;
    }
    function clearTimer(timer) { if (!timer) return; if (timer.id !== null) clearTimeout(timer.id); timers.delete(timer); timer.id = null; }
    function clearAllTimers() { Array.from(timers).forEach(clearTimer); typingTimer = null; }
    function pauseTimers() { const now = performance.now(); timers.forEach(timer => { if (timer.id !== null) { clearTimeout(timer.id); timer.id = null; timer.remaining = Math.max(0, timer.remaining - (now - timer.started)); } }); }
    function resumeTimers() { timers.forEach(timer => { if (timer.id === null && !disposed && !hostPaused && !document.hidden) { timer.started = performance.now(); timer.id = setTimeout(timer.run, timer.remaining); } }); }
    function track(tween) {
        tweens.add(tween);
        const onComplete = tween.eventCallback('onComplete');
        tween.eventCallback('onComplete', function (...args) { tweens.delete(tween); if (onComplete) onComplete.apply(this, args); });
        return tween;
    }
    function killAllTweens() { tweens.forEach(tween => { try { tween.kill(); } catch (_) {} }); tweens.clear(); noTween = null; yesTween = null; }
    function pauseTweens() { tweens.forEach(tween => { try { tween.pause(); } catch (_) {} }); }
    function resumeTweens() { tweens.forEach(tween => { try { tween.resume(); } catch (_) {} }); }

    function ensureAudio() {
        if (disposed || api.muted || hostPaused || document.hidden) return null;
        try {
            if (!audioCtx) { const AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return null; audioCtx = new AudioContext(); audioActivated = true; }
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
            return audioCtx;
        } catch (_) { return null; }
    }
    function stopSounds() { sounds.forEach(sound => { try { sound.osc.stop(); } catch (_) {} try { sound.osc.disconnect(); sound.gain.disconnect(); } catch (_) {} }); sounds.clear(); }
    function suspendAudio() { stopSounds(); if (audioCtx && audioCtx.state === 'running') audioCtx.suspend().catch(() => {}); }
    function resumeAudio() { if (audioActivated && audioCtx && !api.muted && !hostPaused && !document.hidden) audioCtx.resume().catch(() => {}); }
    function playChime() {
        if (!audioCtx || api.muted || hostPaused || document.hidden) return;
        try {
            const now = audioCtx.currentTime;
            [523.25, 659.25, 783.99].forEach((frequency, index) => {
                const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(), at = now + index * 0.1;
                osc.type = 'sine'; osc.frequency.value = frequency; gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.1, at + 0.04); gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
                osc.connect(gain); gain.connect(audioCtx.destination); const sound = { osc, gain }; sounds.add(sound);
                osc.onended = () => { sounds.delete(sound); try { osc.disconnect(); gain.disconnect(); } catch (_) {} }; osc.start(at); osc.stop(at + 1.5);
            });
        } catch (_) {}
    }

    function resize() {
        const rect = root.getBoundingClientRect(); W = Math.max(1, Math.round(rect.width)); H = Math.max(1, Math.round(rect.height));
        CX = W / 2; CY = H / 2; scale = Math.min(W, H) * 0.22; dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (ctx) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.width = '100%'; canvas.style.height = '100%'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
        if (noIsAbsolute) resetNoPosition();
        if (canvasActive && reduced) drawScene(0);
    }
    function buildAmbientParticles() {
        particlesContainer.replaceChildren(); killAllTweens();
        for (let i = 0; i < 40; i++) {
            const particle = document.createElement('div'); particle.className = 'particle';
            const size = Math.random() * 4 + 1.5; particle.style.width = `${size}px`; particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`; particle.style.top = `${Math.random() * 100}%`; particle.style.opacity = String(Math.random() * 0.5 + 0.15);
            particlesContainer.appendChild(particle);
            if (!reduced) track(gsap.to(particle, { y: `-=${Math.random() * 180 + 60}`, x: `+=${Math.random() * 80 - 40}`, opacity: 0, duration: Math.random() * 6 + 6, repeat: -1, ease: 'none', onRepeat: () => { particle.style.top = '110%'; particle.style.left = `${Math.random() * 100}%`; particle.style.opacity = String(Math.random() * 0.5 + 0.15); } }));
        }
    }
    function getHeartPoint(t, layer) { const x = Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16, r = Math.sqrt(1 - layer * layer), depthScale = 0.45 + 0.55 * r; return { x: x * depthScale * 1.5, y: (y * depthScale - 0.08) * 1.5, z: layer * 0.7 }; }
    function project3D(point, angleY, angleX) { const cosY = Math.cos(angleY), sinY = Math.sin(angleY), x1 = point.x * cosY - point.z * sinY, z1 = point.x * sinY + point.z * cosY, cosX = Math.cos(angleX), sinX = Math.sin(angleX), y2 = point.y * cosX - z1 * sinX, z2 = point.y * sinX + z1 * cosX, perspective = 3.5 / (3.5 + z2); point.projX = CX + x1 * scale * perspective; point.projY = CY + y2 * scale * perspective - 30; point.projZ = z2; point.projScale = perspective; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; }
    class Particle3D {
        constructor(index) {
            this.text = WORDS[index % WORDS.length]; const spanX = W / scale, spanY = H / scale;
            this.rainX = (Math.random() - 0.5) * spanX * 1.1; this.rainY = -spanY * 0.65 - Math.random() * spanY * 0.5; this.rainZ = (Math.random() - 0.5) * 0.4;
            this.speedY = Math.random() * 0.03 + 0.03; this.speedX = (Math.random() - 0.5) * 0.001;
            const hp = getHeartPoint((index / NUM_POINTS) * Math.PI * 2 * 7, (index / NUM_POINTS) * 2 - 1);
            this.targetX = hp.x; this.targetY = hp.y; this.targetZ = hp.z; this.x = this.rainX; this.y = this.rainY; this.z = this.rainZ; this.trail = []; this.maxTrail = 4; this.assembleDelay = Math.random() * 0.4; this.fontSize = Math.random() < 0.25 ? 13 : (Math.random() < 0.7 ? 11 : 9); this.weight = '600'; this.opacity = Math.random() * 0.3 + 0.7; this.noiseOffset = Math.random() * 100;
        }
        update(phase, progress, angleY, angleX, beatFactor, currentTime, dt) {
            const spanY = H / scale;
            if (phase === 'rain') { this.rainY += this.speedY * 60 * dt; this.rainX += this.speedX * 60 * dt; if (this.rainY > spanY * 0.6) { this.rainY = -spanY * 0.65; this.rainX = (Math.random() - 0.5) * (W / scale) * 1.1; this.trail = []; } this.x = this.rainX; this.y = this.rainY; this.z = this.rainZ; }
            else if (phase === 'assemble') { const adj = Math.max(0, Math.min(1, (progress - this.assembleDelay) / (1 - this.assembleDelay))), t = easeInOutCubic(adj); this.x = lerp(this.rainX, this.targetX * beatFactor, t); this.y = lerp(this.rainY, this.targetY * beatFactor, t); this.z = lerp(this.rainZ, this.targetZ * beatFactor, t); }
            else { const wave = reduced ? 0 : Math.sin(currentTime * 2.5 + this.noiseOffset) * 0.02; this.x = (this.targetX + wave) * beatFactor; this.y = (this.targetY + wave) * beatFactor; this.z = (this.targetZ + wave) * beatFactor; }
            project3D(this, phase === 'rain' ? 0 : angleY, phase === 'rain' ? 0.05 : angleX);
            if (phase !== 'beating') { this.trail.push({ x: this.projX, y: this.projY }); if (this.trail.length > this.maxTrail) this.trail.shift(); } else this.trail = [];
        }
    }
    class Sparkle {
        constructor() { this.x = CX + (Math.random() - 0.5) * 40; this.y = CY + (Math.random() - 0.5) * 40 - 40; const angle = Math.random() * Math.PI * 2, speed = Math.random() * 4 + 2; this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed - Math.random() * 1.2; this.size = Math.random() * 2.5 + 1; this.alpha = 1; this.decay = Math.random() * 0.025 + 0.02; this.isHeart = Math.random() < 0.4; this.color = [{ r: 255, g: 45, b: 85 }, { r: 196, g: 71, b: 245 }, { r: 255, g: 107, b: 157 }][Math.floor(Math.random() * 3)]; }
        update(dt) { this.x += this.vx * 60 * dt; this.y += this.vy * 60 * dt; const damping = Math.pow(0.96, 60 * dt); this.vx *= damping; this.vy = this.vy * damping + 0.04 * 60 * dt; this.alpha -= this.decay * 60 * dt; }
        draw() { if (this.alpha <= 0) return; ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = `rgb(${this.color.r},${this.color.g},${this.color.b})`; if (this.isHeart) { const s = this.size * 2.5; ctx.translate(this.x, this.y); ctx.beginPath(); ctx.moveTo(0, s * 0.3); ctx.bezierCurveTo(-s * 0.5, -s * 0.2, -s, s * 0.1, 0, s); ctx.bezierCurveTo(s, s * 0.1, s * 0.5, -s * 0.2, 0, s * 0.3); ctx.fill(); } else { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
    }
    class BackgroundStar { constructor() { this.x = Math.random() * W; this.y = Math.random() * H; this.size = Math.random() * 1.2 + 0.3; this.baseAlpha = Math.random() * 0.25 + 0.05; this.speed = Math.random() * 0.02 + 0.005; this.offset = Math.random() * Math.PI * 2; } draw(currentTime) { const alpha = this.baseAlpha + Math.sin(currentTime * this.speed + this.offset) * 0.08; ctx.fillStyle = `rgba(255,255,255,${Math.max(0.02, alpha)})`; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); } }
    function buildHeartParticles() { heartParticles = Array.from({ length: NUM_POINTS }, (_, i) => new Particle3D(i)); bgStars = Array.from({ length: 70 }, () => new BackgroundStar()); sparkles = []; rotY = 0; rotX = 0.2; beatIntensity = 0; }
    function triggerBeatExplosion() { if (reduced) return; const count = Math.floor(Math.random() * 5) + 8; for (let i = 0; i < count; i++) sparkles.push(new Sparkle()); }

    function drawScene(dt) {
        if (!ctx) return;
        ctx.clearRect(0, 0, W, H); bgStars.forEach(star => star.draw(time));
        let phase = 'rain', progress = 0;
        if (elapsed < RAIN_DURATION) { phase = 'rain'; progress = elapsed / RAIN_DURATION; }
        else if (elapsed < RAIN_DURATION + ASSEMBLE_DURATION) { phase = 'assemble'; progress = (elapsed - RAIN_DURATION) / ASSEMBLE_DURATION; }
        else { phase = 'beating'; progress = 1; }
        let beatFactor = 1;
        if (phase === 'beating' && !reduced) {
            const cycle = (elapsed - RAIN_DURATION - ASSEMBLE_DURATION) % 1500;
            if (cycle < 140) { const t = cycle / 140; beatFactor = 1 + Math.sin(t * Math.PI) * 0.15; beatIntensity = Math.sin(t * Math.PI); }
            else if (cycle >= 260 && cycle < 410) { const t = (cycle - 260) / 150; beatFactor = 1 + Math.sin(t * Math.PI) * 0.11; beatIntensity = Math.sin(t * Math.PI) * 0.7; }
            else { beatIntensity = Math.max(0, beatIntensity - 0.04 * 60 * dt); }
            if (Math.abs(cycle - 70) < 16 && sparkles.length < 25) triggerBeatExplosion(); if (Math.abs(cycle - 335) < 16 && sparkles.length < 25) triggerBeatExplosion();
        }
        const glowOpacity = phase === 'beating' ? 0.04 + beatIntensity * 0.08 : 0.02, radialGlow = ctx.createRadialGradient(CX, CY - 30, 10, CX, CY - 30, Math.max(W, H) * 0.4);
        radialGlow.addColorStop(0, `rgba(255,45,85,${glowOpacity})`); radialGlow.addColorStop(0.5, `rgba(196,71,245,${glowOpacity * 0.3})`); radialGlow.addColorStop(1, 'transparent'); ctx.fillStyle = radialGlow; ctx.fillRect(0, 0, W, H);
        if (phase !== 'rain') { rotY += ROTATION_SPEED_Y * 60 * dt; rotX = 0.25 + Math.sin(time * 0.8) * 0.1; }
        heartParticles.forEach(particle => particle.update(phase, progress, rotY, rotX, beatFactor, time, dt)); heartParticles.sort((a, b) => a.projZ - b.projZ);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; let lastFont = '', lastColor = '';
        for (const particle of heartParticles) {
            const zNorm = (particle.projZ + 0.8) / 1.6; if (phase === 'beating' && zNorm > 0.55) continue;
            if (phase !== 'beating' && particle.trail.length > 1) { for (let j = 0; j < particle.trail.length - 1; j++) { const trail = particle.trail[j]; ctx.font = `${particle.weight} ${Math.max(5, Math.round(particle.fontSize * 0.7 * particle.projScale))}px 'Plus Jakarta Sans',sans-serif`; ctx.fillStyle = `rgba(255,45,85,${(particle.opacity * (j / particle.trail.length) * 0.2).toFixed(2)})`; ctx.fillText(particle.text, trail.x, trail.y); } lastFont = ''; lastColor = ''; }
            const font = `${particle.weight} ${Math.max(7, Math.round(particle.fontSize * particle.projScale))}px 'Plus Jakarta Sans',sans-serif`; if (font !== lastFont) { ctx.font = font; lastFont = font; }
            let r, g, b; if (phase === 'rain') { r = 255; g = 45; b = 85; } else if (zNorm < 0.5) { const t = zNorm * 2; r = 255; g = Math.round(45 + t * 45); b = Math.round(85 + t * 45); } else { const t = (zNorm - 0.5) * 2; r = Math.round(255 - t * 80); g = Math.round(90 - t * 40); b = Math.round(130 + t * 100); }
            let alpha = particle.opacity * Math.max(0.15, 1.2 - zNorm); if (phase === 'beating' && zNorm > 0.45) alpha *= (0.55 - zNorm) / 0.1;
            const color = `rgba(${r},${g},${b},${alpha.toFixed(2)})`; if (color !== lastColor) { ctx.fillStyle = color; lastColor = color; } ctx.fillText(particle.text, particle.projX, particle.projY);
        }
        sparkles = sparkles.filter(sparkle => { sparkle.update(dt); sparkle.draw(); return sparkle.alpha > 0; });
        const vignette = ctx.createRadialGradient(CX, CY, Math.min(W, H) * 0.3, CX, CY, Math.max(W, H) * 0.8); vignette.addColorStop(0, 'rgba(2,0,5,0)'); vignette.addColorStop(1, 'rgba(2,0,5,.7)'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
    }
    function canAnimate() { return !disposed && !hostPaused && !document.hidden && canvasActive && !reduced; }
    function startMainLoop() { if (rafId === null && canAnimate()) rafId = requestAnimationFrame(frame); }
    function cancelMainLoop() { if (rafId !== null) cancelAnimationFrame(rafId); rafId = null; lastNow = 0; }
    function frame(now) { rafId = null; if (!canAnimate()) return; const dt = lastNow ? Math.min(0.05, Math.max(0, (now - lastNow) / 1000)) : 0; lastNow = now; elapsed += dt * 1000; time += dt; drawScene(dt); startMainLoop(); }

    function stopConfetti() { if (confettiRaf !== null) cancelAnimationFrame(confettiRaf); confettiRaf = null; confettiRemaining = 0; if (confettiInstance) { try { confettiInstance.reset(); } catch (_) {} } }
    function pauseConfetti() { if (confettiRaf !== null) { confettiRemaining = Math.max(0, confettiEnd - performance.now()); cancelAnimationFrame(confettiRaf); confettiRaf = null; } if (confettiInstance) { try { confettiInstance.reset(); } catch (_) {} } }
    function confettiFrame() { confettiRaf = null; if (disposed || hostPaused || document.hidden || reduced || !confettiInstance) return; const now = performance.now(); if (now >= confettiEnd) return; confettiInstance({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ff4f81', '#ff7ca3', '#ffffff', '#ffd7e4'] }); confettiInstance({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ff4f81', '#ff7ca3', '#ffffff', '#ffd7e4'] }); confettiRaf = requestAnimationFrame(confettiFrame); }
    function resumeConfetti() { if (confettiRemaining > 0 && !reduced && !hostPaused && !document.hidden) { confettiEnd = performance.now() + confettiRemaining; confettiRemaining = 0; if (confettiRaf === null) confettiRaf = requestAnimationFrame(confettiFrame); } }
    function fireLetterConfetti() { if (reduced || !window.confetti) return; if (!confettiInstance) confettiInstance = window.confetti.create(confettiCanvas, { resize: true, useWorker: false }); confettiEnd = performance.now() + 2500; confettiRemaining = 0; if (confettiRaf === null) confettiRaf = requestAnimationFrame(confettiFrame); }

    function overlaps(a, b, buffer) { return a.x < b.right + buffer && a.x + a.width > b.left - buffer && a.y < b.bottom + buffer && a.y + a.height > b.top - buffer; }
    function resetNoPosition() { if (noTween) { try { noTween.kill(); } catch (_) {} tweens.delete(noTween); noTween = null; } noBtn.style.position = ''; noBtn.style.left = ''; noBtn.style.top = ''; noBtn.style.width = ''; noBtn.style.margin = ''; noBtn.style.zIndex = ''; noIsAbsolute = false; }
    function moveNoButton() {
        if (state !== 'question' || reduced || dodgeCount >= Number(config.noGiveInAfter || 6)) return;
        const rootRect = root.getBoundingClientRect(), rect = noBtn.getBoundingClientRect();
        if (!noIsAbsolute) { const parent = noBtn.offsetParent || root, parentRect = parent.getBoundingClientRect(); noBtn.style.position = 'absolute'; noBtn.style.left = `${rect.left - parentRect.left}px`; noBtn.style.top = `${rect.top - parentRect.top}px`; noBtn.style.width = `${rect.width}px`; noBtn.style.margin = '0'; noBtn.style.zIndex = '30'; noIsAbsolute = true; }
        const parent = noBtn.offsetParent || root, parentRect = parent.getBoundingClientRect(), yesRect = yesBtn.getBoundingClientRect(), questionRect = questionText.getBoundingClientRect();
        const pad = 12, topPad = Math.min(64, Math.max(12, H * 0.1)), maxX = rootRect.right - rect.width - pad, maxY = rootRect.bottom - rect.height - pad;
        let candidate = null;
        for (let attempt = 0; attempt < 32 && !candidate; attempt++) {
            const x = rootRect.left + pad + Math.random() * Math.max(0, maxX - rootRect.left - pad), y = rootRect.top + topPad + Math.random() * Math.max(0, maxY - rootRect.top - topPad), box = { x, y, width: rect.width, height: rect.height };
            if (!overlaps(box, yesRect, 24) && !overlaps(box, questionRect, 18)) candidate = { x, y };
        }
        if (!candidate) { resetNoPosition(); dodgeCount = Number(config.noGiveInAfter || 6); giveInReaction(); return; }
        dodgeCount += 1; growYes();
        noTween = track(gsap.to(noBtn, { left: candidate.x - parentRect.left, top: candidate.y - parentRect.top, duration: 0.2, ease: 'power2.out' }));
    }
    function growYes() {
        const scale = Math.min(1.35, 1 + dodgeCount * 0.03);
        if (yesTween) { try { yesTween.kill(); } catch (_) {} tweens.delete(yesTween); yesTween = null; }
        if (reduced) gsap.set(yesBtn, { scale }); else yesTween = track(gsap.to(yesBtn, { scale, duration: 0.2, ease: 'back.out(1.4)' }));
    }
    function giveInReaction() {
        if (state !== 'question') return;
        resetNoPosition(); dodgeCount = Number(config.noGiveInAfter || 6); noReaction.hidden = false; setText(noReaction, config.noReaction);
        noBtn.classList.add('no-given-in');
        growYes();
    }
    function canDodgeWithMouse() { return window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches && document.activeElement !== noBtn; }

    function sendComplete() { if (!completeSent) { completeSent = true; api.complete(); } }
    function sendNext() { if (nextSent) return; nextSent = true; continueBtn.disabled = true; fallbackContinue.disabled = true; api.next(); }
    function finishTyping() { clearTimer(typingTimer); typingActive = false; typingTimer = null; setText(letterTextElement, config.letterBody); if (reduced) { signature.style.opacity = '1'; signature.style.transform = 'translateY(0)'; } else track(gsap.to(signature, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' })); }
    function startTypingLetter() {
        if (typingActive) return; typingActive = true; typingIndex = 0; letterTextElement.textContent = ''; signature.style.opacity = '0'; signature.style.transform = 'translateY(16px)';
        if (reduced) { finishTyping(); return; }
        const type = () => { if (!typingActive || !letterOpen) return; if (typingIndex < String(config.letterBody || '').length) { letterTextElement.appendChild(document.createTextNode(String(config.letterBody).charAt(typingIndex))); typingIndex += 1; typingTimer = schedule(type, 35); } else finishTyping(); };
        type();
    }
    function openLetter() {
        if (state !== 'climax' || letterOpen) return;
        ensureAudio(); playChime(); letterOpen = true; state = 'letter'; if (!previousFocus) previousFocus = document.activeElement; sendComplete();
        visible(letterOverlay, true); focus(closeBtn);
        if (reduced) { gsap.set(letterOverlay, { opacity: 1 }); gsap.set(letterBox, { y: 0, scale: 1 }); startTypingLetter(); return; }
        gsap.set(letterOverlay, { opacity: 0 }); gsap.set(letterBox, { y: 120, scale: 0.95 });
        track(gsap.to(letterOverlay, { opacity: 1, duration: 0.4 }));
        track(gsap.to(letterBox, { y: 0, scale: 1, duration: 0.6, ease: 'power3.out', onComplete: () => { if (letterOpen) { startTypingLetter(); fireLetterConfetti(); } } }));
    }
    function closeLetter() {
        if (!letterOpen) return; letterOpen = false; state = 'climax'; typingActive = false; clearTimer(typingTimer); typingTimer = null; stopConfetti();
        const finish = () => { if (letterOpen) return; visible(letterOverlay, false); gsap.set(envelopeFlap, { rotateX: 0 }); if (previousFocus && previousFocus.isConnected) focus(previousFocus); previousFocus = null; };
        if (reduced) finish(); else { track(gsap.to(letterBox, { y: 100, scale: 0.95, duration: 0.5, ease: 'power3.in' })); track(gsap.to(letterOverlay, { opacity: 0, duration: 0.4, onComplete: finish })); }
    }
    function trapModalKey(event) {
        if (!letterOpen) return; if (event.key === 'Escape') { event.preventDefault(); closeLetter(); return; } if (event.key !== 'Tab') return;
        const items = Array.from(letterOverlay.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])')).filter(element => !element.disabled && element.getClientRects().length);
        if (!items.length) { event.preventDefault(); focus(letterBox); return; } const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); focus(last); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); focus(first); }
    }
    function show3DClimax() {
        state = 'climax'; visible(climaxScreen, true); canvas.classList.remove('hidden-state'); visible(finalActions, true); sendComplete();
        canvasActive = true; elapsed = reduced ? RAIN_DURATION + ASSEMBLE_DURATION : 0; time = 0; buildHeartParticles();
        if (reduced) { gsap.set(loveBgText, { scale: 1, opacity: 1, y: -70 }); gsap.set(envelopeTrigger, { scale: 1 }); drawScene(0); return; }
        startMainLoop();
        const timeline = gsap.timeline(); track(timeline); timeline.to(loveBgText, { scale: 1, opacity: 1, y: -120, duration: 1.2, ease: 'back.out(1.2)' }).to(envelopeTrigger, { scale: 1, duration: 0.8, ease: 'back.out(1.5)' }, '-=0.6');
    }
    function setConfig(next) {
        config = next || {}; setText(questionText, config.question); setText(yesBtn, config.yesLabel); setText(noBtn, config.noLabel); setText(climaxLine1, config.climaxLine1); setText(climaxLine2, config.climaxLine2); setText(envelopeLabel, config.envelopeLabel); envelopeTrigger.setAttribute('aria-label', config.envelopeLabel || 'Open secret letter');
        setText(letterTitle, config.letterTitle); setText(signatureLead, config.signatureLead); setText(signatureName, config.signatureName); setText(closeBtn, config.closeLabel || 'Close Letter'); setText(continueBtn, config.continueLabel || 'Continue'); setText(replayBtn, config.replayLabel || 'Replay'); setText(fallbackContinue, config.continueLabel || 'Continue'); setText(noReaction, config.noReaction); document.title = config.question || 'A Little Question';
    }
    function setReduced(value) {
        if (reduced === value) return;
        reduced = value; root.classList.toggle('reduced-motion', reduced);
        if (reduced) {
            cancelMainLoop(); stopConfetti(); killAllTweens(); resetNoPosition(); buildAmbientParticles();
            if (state === 'transition') { questionScreen.style.display = 'none'; show3DClimax(); }
            if (!letterOpen) visible(letterOverlay, false);
            if (state === 'climax' || state === 'letter') { elapsed = RAIN_DURATION + ASSEMBLE_DURATION; gsap.set(loveBgText, { scale: 1, opacity: 1, y: -70 }); gsap.set(envelopeTrigger, { scale: 1 }); if (letterOpen) { gsap.set(letterOverlay, { opacity: 1 }); gsap.set(letterBox, { y: 0, scale: 1 }); finishTyping(); } drawScene(0); }
            return;
        }
        buildAmbientParticles(); if (hostPaused || document.hidden) pauseTweens(); if (canvasActive) startMainLoop();
    }
    function pause() { hostPaused = true; root.classList.add('is-paused'); cancelMainLoop(); pauseConfetti(); pauseTimers(); pauseTweens(); suspendAudio(); }
    function resume() { if (disposed || document.hidden) { pause(); return; } hostPaused = false; root.classList.remove('is-paused'); resumeTimers(); resumeTweens(); resumeAudio(); startMainLoop(); resumeConfetti(); if (reduced && canvasActive) drawScene(0); }
    function resetExperience() {
        const remainPaused = hostPaused || api.paused || document.hidden;
        const restoreQuestionFocus = letterOpen;
        cancelMainLoop(); clearAllTimers(); stopConfetti(); killAllTweens(); stopSounds();
        state = 'question'; letterOpen = false; typingActive = false; typingIndex = 0; canvasActive = false; elapsed = 0; time = 0; completeSent = false; dodgeCount = 0;
        visible(questionScreen, true); questionScreen.style.display = ''; questionScreen.style.opacity = ''; questionScreen.style.transform = ''; visible(climaxScreen, false); canvas.classList.add('hidden-state'); visible(letterOverlay, false); visible(finalActions, false);
        noBtn.disabled = false; noBtn.style.pointerEvents = ''; noBtn.classList.remove('no-given-in'); resetNoPosition(); noReaction.hidden = true; yesBtn.style.transform = '';
        letterTextElement.textContent = ''; signature.style.opacity = '0'; signature.style.transform = 'translateY(16px)'; previousFocus = null;
        gsap.set(loveBgText, { scale: 0.75, opacity: 0, y: 0 }); gsap.set(envelopeTrigger, { scale: 0 });
        gsap.set(letterOverlay, { opacity: 0 }); gsap.set(letterBox, { y: 120, scale: 0.95 }); gsap.set(envelopeFlap, { rotateX: 0 });
        continueBtn.disabled = nextSent; fallbackContinue.disabled = nextSent; hostPaused = remainPaused; root.classList.toggle('is-paused', hostPaused);
        if (ctx) ctx.clearRect(0, 0, W, H); buildAmbientParticles(); if (hostPaused) pauseTweens();
        if (restoreQuestionFocus) focus(yesBtn);
    }
    function showFatal(code, message) { pause(); state = 'error'; visible(questionScreen, false); visible(climaxScreen, false); visible(letterOverlay, false); visible(finalActions, false); fallback.hidden = false; api.error(code, message); }
    function dispose() {
        if (disposed) return; disposed = true; disposalCount += 1; cancelMainLoop(); clearAllTimers(); stopConfetti(); killAllTweens(); stopSounds();
        if (resizeObserver) resizeObserver.disconnect(); listeners.splice(0).forEach(remove => { try { remove(); } catch (_) {} }); if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {}); audioCtx = null;
    }

    listen(yesBtn, 'click', () => {
        if (state !== 'question') return; ensureAudio(); playChime(); state = 'transition'; noBtn.style.pointerEvents = 'none';
        if (reduced) { questionScreen.style.display = 'none'; show3DClimax(); }
        else track(gsap.to(questionScreen, { opacity: 0, scale: 0.8, duration: 0.6, ease: 'power3.inOut', onComplete: () => { questionScreen.style.display = 'none'; show3DClimax(); } }));
    });
    listen(noBtn, 'mouseenter', () => { if (canDodgeWithMouse()) moveNoButton(); });
    listen(noBtn, 'click', event => { if (event.detail === 0 || reduced || dodgeCount >= Number(config.noGiveInAfter || 6)) giveInReaction(); else moveNoButton(); });
    listen(noBtn, 'focus', () => { if (noIsAbsolute) resetNoPosition(); });
    listen(envelopeTrigger, 'click', openLetter); listen(closeBtn, 'click', closeLetter);
    listen(letterOverlay, 'click', event => { if (event.target === letterOverlay) closeLetter(); });
    listen(continueBtn, 'click', sendNext); listen(fallbackContinue, 'click', sendNext); listen(replayBtn, 'click', () => { ensureAudio(); resetExperience(); api.replayed(); });
    listen(document, 'keydown', trapModalKey);
    listen(document, 'visibilitychange', () => { if (document.hidden) pause(); else if (!api.paused) resume(); }); listen(window, 'pagehide', dispose, { once: true });
    if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(root); } else listen(window, 'resize', resize);
    resize();
    listeners.push(api.onInit(current => {
        setConfig(current.config); setTheme(current.theme); reduced = current.reducedMotion; root.classList.toggle('reduced-motion', reduced);
        if (!ctx || !window.gsap) { showFatal('RENDERER_UNAVAILABLE', 'The confession animation could not start in this browser.'); return; }
        resetExperience();
    }));
    listeners.push(api.onUpdate(current => { setTheme(current.theme); setReduced(current.reducedMotion); if (current.muted) suspendAudio(); else resumeAudio(); }));
    listeners.push(api.onPause(pause)); listeners.push(api.onResume(resume)); listeners.push(api.onReplay(() => { resetExperience(); api.replayed(); }));
})();
