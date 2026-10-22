(() => {
    'use strict';

    const api = window.__experience;
    if (!api) return;
    const $ = id => document.getElementById(id);
    const root = document.body;
    const startOverlay = $('start-overlay');
    const startBtn = $('start-btn');
    const canvas = $('tunnel-canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const ambientCanvas = $('ambient-canvas');
    const ambientCtx = ambientCanvas.getContext('2d');
    const petalsCanvas = $('petals-canvas');
    const petalsCtx = petalsCanvas.getContext('2d');
    const flashOverlay = $('flash-overlay');
    const revealEl = $('reveal');
    const cinematicText = $('cinematic-text');
    const toastMsg = $('toast-msg');
    const displayTitle = $('display-title');
    const displayCouple = $('display-couple');
    const displayYears = $('display-years');
    const displayYearsUnit = $('display-years-unit');
    const yearsBadge = $('years-badge');
    const displaySubtitle = $('display-subtitle');
    const displayQuote = $('display-quote');
    const displayDate = $('display-date');
    const displayCaption = $('display-caption');
    const couplePhoto = $('couple-photo');
    const photoFallback = $('photo-fallback');
    const openLetterBtn = $('open-letter-btn');
    const letterModal = $('letter-modal');
    const letterCard = letterModal.querySelector('.letter-card');
    const letterCloseBtn = $('letter-close-btn');
    const letterBody = $('letter-body');
    const continueBtn = $('continue-btn');
    const replayBtn = $('replay-btn');
    const fallback = $('experience-fallback');
    const fallbackContinue = $('fallback-continue');

    const T = { TEXT_IN: 0.6, TEXT_OUT: 2.3, TUNNEL_END: 3, LIGHT_END: 4.6, FLASH_PEAK: 4.95, FLASH_END: 5.5 };
    const NUM_RINGS = 50, NUM_PARTS = 280, NUM_AMB = 80, NUM_PETALS = 45;
    const Z_NEAR = 0.15, Z_FAR = 12, Z_SPAN = Z_FAR - Z_NEAR, FOCAL = 420, TAU = Math.PI * 2;
    const easeIn3 = t => t * t * t;
    const easeOut3 = t => 1 - (1 - t) ** 3;
    const easeOut4 = t => 1 - (1 - t) ** 4;
    const clamp01 = t => Math.max(0, Math.min(1, t));

    let config = {}, W = 1, H = 1, dpr = 1;
    let state = 'idle', reduced = false, hostPaused = false, disposed = false;
    let rafId = null, lastNow = 0, elapsed = 0, revealed = false, textShown = false;
    let rings = [], parts = [], ambient = [], petals = [], ambOp = 0;
    let completeSent = false, nextSent = false, previousFocus = null;
    let resizeObserver = null;
    const listeners = [], timers = new Set(), sounds = new Set();

    const debug = {
        get activeLoops() { return rafId === null ? 0 : 1; },
        get activeTimers() { return timers.size; },
        get audioContexts() { return audioCtx ? 1 : 0; },
        get audioState() { return audioCtx ? audioCtx.state : 'none'; },
        get disposals() { return disposalCount; },
    };
    let disposalCount = 0;
    Object.defineProperty(window, '__heartTunnelDebug', { value: debug, configurable: false });

    function listen(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        listeners.push(() => target.removeEventListener(type, handler, options));
        return handler;
    }
    function setText(element, value) { if (element) element.textContent = value == null ? '' : String(value); }
    function setMultiline(element, value) {
        if (!element) return;
        const fragment = document.createDocumentFragment();
        String(value ?? '').split('\n').forEach((line, index) => {
            if (index) fragment.appendChild(document.createElement('br'));
            fragment.appendChild(document.createTextNode(line));
        });
        element.replaceChildren(fragment);
    }
    function setTheme(theme) {
        Object.entries(theme || {}).forEach(([key, value]) => root.style.setProperty(key, value));
    }

    // Pausable, tracked timeouts: replay/teardown never leave stale callbacks.
    function schedule(callback, delay) {
        const timer = { callback, remaining: delay, started: 0, id: null };
        const run = () => { timers.delete(timer); timer.id = null; if (!disposed) callback(); };
        timer.run = run;
        timers.add(timer);
        if (!disposed && !hostPaused && !document.hidden) {
            timer.started = performance.now(); timer.id = setTimeout(run, delay);
        }
        return timer;
    }
    function clearTimer(timer) {
        if (!timer) return;
        if (timer.id !== null) clearTimeout(timer.id);
        timers.delete(timer); timer.id = null;
    }
    function clearAllTimers() { Array.from(timers).forEach(clearTimer); }
    function pauseTimers() {
        const now = performance.now();
        timers.forEach(timer => {
            if (timer.id !== null) {
                clearTimeout(timer.id); timer.id = null;
                timer.remaining = Math.max(0, timer.remaining - (now - timer.started));
            }
        });
    }
    function resumeTimers() {
        timers.forEach(timer => {
            if (timer.id === null && !disposed && !hostPaused && !document.hidden) {
                timer.started = performance.now(); timer.id = setTimeout(timer.run, timer.remaining);
            }
        });
    }

    // One lazily-created WebAudio context, only unlocked by a user gesture.
    let audioCtx = null, audioActivated = false;
    function ensureAudio() {
        if (disposed || api.muted || hostPaused || document.hidden) return null;
        try {
            if (!audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return null;
                audioCtx = new AudioContext(); audioActivated = true;
            }
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
            return audioCtx;
        } catch (_) { return null; }
    }
    function stopSounds() {
        sounds.forEach(sound => { try { sound.osc.stop(); } catch (_) {} try { sound.osc.disconnect(); sound.gain.disconnect(); } catch (_) {} });
        sounds.clear();
    }
    function suspendAudio() { stopSounds(); if (audioCtx && audioCtx.state === 'running') audioCtx.suspend().catch(() => {}); }
    function resumeAudio() { if (audioActivated && audioCtx && !api.muted && !hostPaused && !document.hidden) audioCtx.resume().catch(() => {}); }
    function tone(frequencies, heartbeat = false) {
        if (!audioCtx || api.muted || hostPaused || document.hidden) return;
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
            const now = audioCtx.currentTime;
            frequencies.forEach((frequency, index) => {
                const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                const at = now + (heartbeat ? 0 : index * 0.12);
                osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, at);
                if (heartbeat) osc.frequency.exponentialRampToValueAtTime(30, at + 0.18);
                gain.gain.setValueAtTime(heartbeat ? 0.3 : 0, at);
                if (heartbeat) gain.gain.exponentialRampToValueAtTime(0.001, at + 0.2);
                else {
                    gain.gain.linearRampToValueAtTime(0.12, at + 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.0001, at + 2.8);
                }
                osc.connect(gain); gain.connect(audioCtx.destination);
                const sound = { osc, gain }; sounds.add(sound);
                osc.onended = () => { sounds.delete(sound); try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
                osc.start(at); osc.stop(at + (heartbeat ? 0.22 : 3));
            });
        } catch (_) { /* Audio is enhancement; visual flow must continue. */ }
    }
    function playChime() { tone([369.99, 466.16, 554.37, 739.99, 932.33]); }
    function playHeartbeat() { tone([60], true); }

    function makeTunnelObjects() {
        rings = Array.from({ length: NUM_RINGS }, (_, i) => ({ z: Z_NEAR + (i / NUM_RINGS) * Z_SPAN, hueOff: (i / NUM_RINGS) * 360 }));
        parts = Array.from({ length: NUM_PARTS }, () => {
            const angle = Math.random() * TAU, dist = Math.random() * 600 + 40;
            return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, z: Z_NEAR + Math.random() * Z_SPAN, sz: Math.random() * 2.5 + 1, hue: Math.random() * 360 };
        });
    }
    function makeRevealObjects() {
        ambient = Array.from({ length: NUM_AMB }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.2 + 0.6, vx: (Math.random() - 0.5) * 0.22, vy: -Math.random() * 0.32 - 0.1, op: Math.random() * 0.3 + 0.06, hue: Math.random() > 0.5 ? 35 + Math.random() * 25 : 330 + Math.random() * 28 }));
        const colors = ['#e74c6f', '#ff6b8b', '#d4af37', '#c92a42', '#f7e5a0'];
        petals = Array.from({ length: NUM_PETALS }, (_, i) => ({ x: Math.random() * W, y: Math.random() * -H * 1.5, size: Math.random() * 12 + 10, speedY: Math.random() * 1.5 + 0.9, speedX: Math.random() * 1.2 - 0.6, rot: Math.random() * TAU, rotSpeed: (Math.random() - 0.5) * 0.04, flip: Math.random() * TAU, flipSpeed: Math.random() * 0.03 + 0.015, color: colors[i % colors.length] }));
        ambOp = 0;
    }
    function sizeCanvas(element, context) {
        element.width = Math.max(1, Math.round(W * dpr)); element.height = Math.max(1, Math.round(H * dpr));
        element.style.width = '100%'; element.style.height = '100%';
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function resize() {
        const rect = root.getBoundingClientRect();
        W = Math.max(1, Math.round(rect.width)); H = Math.max(1, Math.round(rect.height));
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (ctx) sizeCanvas(canvas, ctx);
        if (ambientCtx) sizeCanvas(ambientCanvas, ambientCtx);
        if (petalsCtx) sizeCanvas(petalsCanvas, petalsCtx);
        if (state === 'revealed' && (reduced || hostPaused || document.hidden)) drawReveal(0);
    }

    function heartPath(scale, rotation, beat) {
        const s = scale * beat * 0.95;
        ctx.save(); ctx.rotate(rotation); ctx.beginPath(); ctx.moveTo(0, -s * 0.35);
        ctx.bezierCurveTo(-s * 0.55, -s * 0.85, -s * 1.1, -s * 0.15, 0, s * 0.75);
        ctx.bezierCurveTo(s * 1.1, -s * 0.15, s * 0.55, -s * 0.85, 0, -s * 0.35);
        ctx.closePath(); ctx.restore();
    }
    function drawTunnel(sec, dt) {
        if (!ctx) return;
        if (sec >= T.TEXT_IN && sec < T.TEXT_OUT && !textShown) { textShown = true; cinematicText.classList.add('visible'); }
        if (sec >= T.TEXT_OUT && textShown) { textShown = false; cinematicText.classList.remove('visible'); }
        let speed, trail, colorSpeed, alphaMod;
        if (sec < T.TUNNEL_END) { const p = sec / T.TUNNEL_END; speed = 0.9 + easeIn3(p) * 3.5; trail = 0.18 + p * 0.16; colorSpeed = 50 + p * 40; alphaMod = 1; }
        else if (sec < T.LIGHT_END) { const p = (sec - T.TUNNEL_END) / (T.LIGHT_END - T.TUNNEL_END); speed = 4.4 * (1 - easeOut3(p) * 0.9); trail = 0.34 - p * 0.18; colorSpeed = 90 - p * 45; alphaMod = 1 - easeIn3(p) * 0.9; }
        else { speed = 0.4; trail = 0.14; colorSpeed = 38; alphaMod = 0.1; }
        ctx.fillStyle = `rgba(5,0,12,${trail.toFixed(2)})`; ctx.fillRect(0, 0, W, H);
        let shakeX = 0, shakeY = 0;
        if (!reduced && sec > T.TUNNEL_END + 0.3 && sec < T.FLASH_PEAK) {
            const si = clamp01((sec - T.TUNNEL_END - 0.3) / (T.FLASH_PEAK - T.TUNNEL_END - 0.3));
            const mag = si * si * 6; shakeX = (Math.random() - 0.5) * mag; shakeY = (Math.random() - 0.5) * mag;
        }
        ctx.save(); ctx.translate(W / 2 + shakeX, H / 2 + shakeY); ctx.globalCompositeOperation = 'lighter';
        for (const p of parts) {
            p.z -= speed * dt; if (p.z <= Z_NEAR) p.z += Z_SPAN;
            const sc = FOCAL / p.z, px = p.x * sc / FOCAL, py = p.y * sc / FOCAL;
            const a = clamp01((Z_FAR - p.z) / 3) * clamp01((p.z - Z_NEAR) * 4) * alphaMod;
            if (a > 0.01) { const r = Math.max(0.5, p.sz * sc / 320); ctx.fillStyle = `hsla(${(p.hue + sec * colorSpeed) % 360},100%,75%,${(a * 0.6).toFixed(3)})`; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); }
        }
        rings.sort((a, b) => b.z - a.z);
        for (const ring of rings) {
            ring.z -= speed * dt; if (ring.z <= Z_NEAR) ring.z += Z_SPAN;
            const sc = FOCAL / ring.z, a = clamp01((Z_FAR - ring.z) / 2.5) * clamp01((ring.z - Z_NEAR) * 5) * alphaMod;
            if (a < 0.01) continue;
            const hue = (ring.hueOff + sec * colorSpeed) % 360, rot = Math.sin(sec * 0.5 + ring.z * 0.35) * 0.12;
            const sync = clamp01((sec - T.TUNNEL_END) / 1.2);
            const beat = sec < T.TUNNEL_END ? 1 + Math.sin(sec * 3.5 - ring.z * 0.5) * 0.06 : 1 + Math.sin(sec * 3.5 - ring.z * 0.5) * 0.06 * (1 - sync) + Math.sin(sec * 5.5) * 0.16 * sync;
            const bw = Math.max(1, sc * 0.024);
            heartPath(sc, rot, beat); ctx.strokeStyle = `hsla(${hue},100%,60%,${(a * 0.28).toFixed(3)})`; ctx.lineWidth = bw * 4.5; ctx.stroke();
            heartPath(sc, rot, beat); ctx.strokeStyle = `hsla(${hue},100%,72%,${(a * 0.75).toFixed(3)})`; ctx.lineWidth = bw * 1.8; ctx.stroke();
            heartPath(sc, rot, beat); ctx.strokeStyle = `rgba(255,255,255,${(a * 0.95).toFixed(3)})`; ctx.lineWidth = Math.max(1, bw * 0.6); ctx.stroke();
        }
        if (sec >= T.TUNNEL_END) {
            const rawP = clamp01((sec - T.TUNNEL_END) / (T.LIGHT_END - T.TUNNEL_END)), ep = easeOut4(rawP);
            const maxR = Math.hypot(W, H) * 0.65, baseR = 10 + ep * maxR, hb = 1 + Math.sin(sec * 5.5) * 0.13 * (1 - ep * 0.4), glowR = baseR * hb;
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
            if (ep < 0.4) { g.addColorStop(0, `rgba(255,215,235,${(0.3 + ep * 1.5).toFixed(2)})`); g.addColorStop(0.35, `rgba(255,155,195,${(0.12 + ep * 0.6).toFixed(2)})`); g.addColorStop(0.75, `rgba(200,80,140,${(0.05 + ep * 0.2).toFixed(2)})`); g.addColorStop(1, 'rgba(120,30,80,0)'); }
            else { g.addColorStop(0, `rgba(255,252,240,${(0.5 + ep * 0.5).toFixed(2)})`); g.addColorStop(0.2, `rgba(255,235,180,${(0.4 + ep * 0.5).toFixed(2)})`); g.addColorStop(0.5, `rgba(255,190,110,${(0.15 + ep * 0.35).toFixed(2)})`); g.addColorStop(0.8, `rgba(220,120,50,${(0.03 + ep * 0.12).toFixed(2)})`); g.addColorStop(1, 'rgba(180,70,20,0)'); }
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, glowR, 0, TAU); ctx.fill();
            if (rawP > 0.08) { const ha = clamp01((rawP - 0.08) / 0.4), hs = 16 + ep * 50, hBeat = 1 + Math.sin(sec * 5.5) * 0.13; ctx.shadowBlur = 40 + ep * 30; ctx.shadowColor = `rgba(255,200,150,${(ha * 0.75).toFixed(2)})`; heartPath(hs, 0, hBeat); ctx.fillStyle = `rgba(255,245,225,${(ha * 0.9).toFixed(2)})`; ctx.fill(); ctx.shadowBlur = 0; }
        }
        ctx.restore();
        if (!reduced && sec >= T.LIGHT_END && sec < T.FLASH_PEAK) flashOverlay.style.opacity = easeIn3((sec - T.LIGHT_END) / (T.FLASH_PEAK - T.LIGHT_END));
        else if (!reduced && sec >= T.FLASH_PEAK && sec < T.FLASH_END) flashOverlay.style.opacity = (1 - easeOut4((sec - T.FLASH_PEAK) / (T.FLASH_END - T.FLASH_PEAK))).toFixed(3);
        else flashOverlay.style.opacity = 0;
        if (sec >= T.FLASH_PEAK && !revealed) triggerReveal();
    }
    function drawAmbient(dt) {
        if (!ambientCtx) return;
        ambientCtx.clearRect(0, 0, W, H); ambOp = Math.min(1, ambOp + dt * 0.6);
        for (const p of ambient) {
            p.x += p.vx * 60 * dt; p.y += p.vy * 60 * dt;
            if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
            if (p.x < -12) p.x = W + 12; if (p.x > W + 12) p.x = -12;
            ambientCtx.save(); ambientCtx.globalAlpha = reduced ? p.op : p.op * ambOp; ambientCtx.shadowBlur = 10; ambientCtx.shadowColor = `hsl(${p.hue},70%,60%)`; ambientCtx.fillStyle = `hsl(${p.hue},70%,60%)`; ambientCtx.beginPath(); ambientCtx.arc(p.x, p.y, p.r, 0, TAU); ambientCtx.fill(); ambientCtx.restore();
        }
    }
    function drawPetals(dt) {
        if (!petalsCtx) return;
        petalsCtx.clearRect(0, 0, W, H);
        for (const p of petals) {
            p.y += p.speedY * 60 * dt; p.x += Math.sin(p.y * 0.015) * p.speedX * 60 * dt; p.rot += p.rotSpeed * 60 * dt; p.flip += p.flipSpeed * 60 * dt;
            if (p.y > H + 25) { p.y = -25; p.x = Math.random() * W; }
            petalsCtx.save(); petalsCtx.translate(p.x, p.y); petalsCtx.rotate(p.rot); petalsCtx.scale(1, Math.sin(p.flip)); petalsCtx.fillStyle = p.color; petalsCtx.shadowBlur = 12; petalsCtx.shadowColor = 'rgba(231,76,111,.4)'; petalsCtx.globalAlpha = 0.85; petalsCtx.beginPath(); petalsCtx.moveTo(0, 0); petalsCtx.bezierCurveTo(-p.size * 0.8, -p.size, -p.size, p.size * 0.8, 0, p.size * 1.4); petalsCtx.bezierCurveTo(p.size, p.size * 0.8, p.size * 0.8, -p.size, 0, 0); petalsCtx.fill(); petalsCtx.restore();
        }
    }
    function drawReveal(dt) { drawAmbient(dt); drawPetals(dt); }
    function canAnimate() { return !disposed && !hostPaused && !document.hidden && (state === 'tunnel' || state === 'revealed'); }
    function scheduleFrame() { if (rafId === null && canAnimate() && !reduced) rafId = requestAnimationFrame(frame); }
    function cancelFrame() { if (rafId !== null) cancelAnimationFrame(rafId); rafId = null; lastNow = 0; }
    function frame(now) {
        rafId = null; if (!canAnimate() || reduced) return;
        const dt = lastNow ? Math.min(0.05, Math.max(0, (now - lastNow) / 1000)) : 0;
        lastNow = now;
        if (state === 'tunnel') { elapsed += dt; drawTunnel(elapsed, dt); }
        if (state === 'revealed') drawReveal(dt);
        scheduleFrame();
    }

    function sendComplete() { if (!completeSent) { completeSent = true; api.complete(); } }
    function sendNext() { if (nextSent) return; nextSent = true; continueBtn.disabled = true; fallbackContinue.disabled = true; api.next(); }
    function triggerReveal() {
        if (revealed || disposed) return;
        revealed = true; state = 'revealed';
        canvas.style.transition = reduced ? 'none' : 'opacity .8s ease'; canvas.style.opacity = '0';
        flashOverlay.style.opacity = '0'; cinematicText.classList.remove('visible');
        revealEl.classList.add('visible'); revealEl.setAttribute('aria-hidden', 'false'); revealEl.inert = false;
        makeRevealObjects();
        const items = revealEl.querySelectorAll('.reveal-item');
        items.forEach((element, index) => {
            if (reduced) element.classList.add('show');
            else schedule(() => { if (state === 'revealed') element.classList.add('show'); }, 300 + index * 220);
        });
        setText(toastMsg, String(config.revealTitle || 'Surprise').replace(/\n/g, ' '));
        playChime(); sendComplete();
        if (reduced) drawReveal(0); else scheduleFrame();
    }
    function beginTunnel() {
        if (disposed) return;
        closeLetter(false); cancelFrame(); clearAllTimers(); stopSounds();
        state = 'tunnel'; revealed = false; textShown = false; elapsed = 0; completeSent = false;
        makeTunnelObjects(); startOverlay.classList.add('hidden'); startOverlay.inert = true;
        revealEl.classList.remove('visible'); revealEl.setAttribute('aria-hidden', 'true'); revealEl.inert = true;
        revealEl.querySelectorAll('.reveal-item').forEach(element => element.classList.remove('show'));
        canvas.style.opacity = '1'; flashOverlay.style.opacity = '0'; cinematicText.classList.remove('visible');
        if (reduced) schedule(triggerReveal, 120); else scheduleFrame();
    }
    function resetSceneState() {
        cancelFrame(); clearAllTimers(); stopSounds(); closeLetter(false);
        state = 'idle'; revealed = false; textShown = false; elapsed = 0; completeSent = false;
        startOverlay.classList.remove('hidden'); startOverlay.inert = false;
        revealEl.classList.remove('visible'); revealEl.setAttribute('aria-hidden', 'true'); revealEl.inert = true;
        revealEl.querySelectorAll('.reveal-item').forEach(element => element.classList.remove('show'));
        canvas.style.transition = 'none'; canvas.style.opacity = '1'; flashOverlay.style.opacity = '0'; cinematicText.classList.remove('visible');
        if (ctx) { ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#030008'; ctx.fillRect(0, 0, W, H); }
        if (ambientCtx) ambientCtx.clearRect(0, 0, W, H); if (petalsCtx) petalsCtx.clearRect(0, 0, W, H);
        toastMsg.classList.remove('show'); setText(toastMsg, ''); continueBtn.disabled = nextSent; fallbackContinue.disabled = nextSent;
    }

    function openLetter() {
        if (state !== 'revealed') return;
        ensureAudio(); playChime(); previousFocus = document.activeElement;
        letterModal.classList.add('open'); letterModal.setAttribute('aria-hidden', 'false'); letterModal.inert = false;
        letterCloseBtn.focus({ preventScroll: true });
    }
    function closeLetter(restoreFocus = true) {
        const wasOpen = letterModal.classList.contains('open');
        letterModal.classList.remove('open'); letterModal.setAttribute('aria-hidden', 'true'); letterModal.inert = true;
        if (wasOpen && restoreFocus && previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
        if (wasOpen) previousFocus = null;
    }
    function trapModalKey(event) {
        if (!letterModal.classList.contains('open')) return;
        if (event.key === 'Escape') { event.preventDefault(); closeLetter(); return; }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(letterModal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(element => !element.disabled && element.getClientRects().length);
        if (!focusable.length) { event.preventDefault(); letterCard.focus(); return; }
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    function photoLoaded() { couplePhoto.hidden = false; photoFallback.hidden = true; }
    function photoFailed() { couplePhoto.hidden = true; couplePhoto.removeAttribute('src'); photoFallback.hidden = false; }
    function setConfig(next) {
        config = next || {};
        setText($('start-sub'), config.startSub); setText($('start-main'), config.startMain); setText($('start-subtitle'), config.startSubtitle); setText($('start-button-label'), config.startButton); setText($('start-hint'), config.startHint);
        setText($('cinematic-sub'), config.cinematicSub); setText($('cinematic-main'), config.cinematicMain);
        setMultiline(displayTitle, config.revealTitle); setText(displayCouple, config.coupleNames); setText(displayCaption, config.caption); setText(displaySubtitle, config.subtitle);
        setText(displayYears, config.yearsNumber); setText(displayYearsUnit, config.yearsUnit);
        yearsBadge.hidden = !String(config.yearsNumber || '').trim() || !String(config.yearsUnit || '').trim();
        setMultiline(displayQuote, config.quote); setText(displayDate, config.dateText); displayDate.hidden = !String(config.dateText || '').trim();
        setText($('letter-button-label'), config.letterButton); setText($('letter-title'), config.letterTitle);
        letterBody.replaceChildren(); (Array.isArray(config.letterBody) ? config.letterBody : []).forEach(paragraph => { const p = document.createElement('p'); p.textContent = paragraph; letterBody.appendChild(p); });
        const highlight = document.createElement('p'); highlight.className = 'letter-highlight'; highlight.textContent = config.letterHighlight || ''; letterBody.appendChild(highlight);
        setText($('signature-lead'), config.signatureLead); setText($('letter-sig-name'), config.signatureName);
        setText(continueBtn, config.continueButton || 'Continue'); setText(replayBtn, config.replayButton || 'Replay'); setText(fallbackContinue, config.continueButton || 'Continue');
        couplePhoto.alt = config.caption || 'A special memory'; photoFailed();
        if (config.photoUrl && String(config.photoUrl).trim()) couplePhoto.src = config.photoUrl;
        document.title = String(config.revealTitle || 'A Special Surprise').replace(/\n/g, ' ');
    }
    function setReduced(value) {
        if (reduced === value) return;
        reduced = value; root.classList.toggle('reduced-motion', reduced);
        if (reduced) {
            cancelFrame(); clearAllTimers(); flashOverlay.style.opacity = '0';
            if (state === 'tunnel') schedule(triggerReveal, 120);
            if (state === 'revealed') { revealEl.querySelectorAll('.reveal-item').forEach(element => element.classList.add('show')); drawReveal(0); }
        } else {
            if (state === 'tunnel') clearAllTimers();
            if (!hostPaused && !document.hidden) scheduleFrame();
        }
    }
    function pause() {
        hostPaused = true; root.classList.add('is-paused'); cancelFrame(); pauseTimers(); suspendAudio();
    }
    function resume() {
        if (disposed || document.hidden) { pause(); return; }
        hostPaused = false; root.classList.remove('is-paused'); resumeTimers(); resumeAudio();
        if (state === 'revealed' && reduced) drawReveal(0); else scheduleFrame();
    }
    function resetExperience() {
        const remainPaused = hostPaused || api.paused || document.hidden;
        resetSceneState(); hostPaused = remainPaused; root.classList.toggle('is-paused', hostPaused);
        if (!disposed && !hostPaused) { resumeTimers(); resumeAudio(); }
    }
    function showFatal(code, message) {
        pause(); state = 'error'; fallback.hidden = false;
        startOverlay.classList.add('hidden'); revealEl.classList.remove('visible'); letterModal.classList.remove('open');
        api.error(code, message);
    }
    function dispose() {
        if (disposed) return; disposed = true; disposalCount += 1;
        cancelFrame(); clearAllTimers(); stopSounds();
        if (resizeObserver) resizeObserver.disconnect();
        listeners.splice(0).forEach(remove => { try { remove(); } catch (_) {} });
        if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
        audioCtx = null;
    }

    listen(startBtn, 'click', () => { ensureAudio(); playHeartbeat(); beginTunnel(); });
    listen(openLetterBtn, 'click', openLetter);
    listen(letterCloseBtn, 'click', () => closeLetter());
    listen(letterModal, 'click', event => { if (event.target === letterModal) closeLetter(); });
    listen(continueBtn, 'click', sendNext); listen(fallbackContinue, 'click', sendNext);
    listen(replayBtn, 'click', () => { ensureAudio(); resetExperience(); beginTunnel(); api.replayed(); });
    listen(couplePhoto, 'load', photoLoaded); listen(couplePhoto, 'error', photoFailed);
    listen(document, 'keydown', trapModalKey);
    listen(document, 'visibilitychange', () => { if (document.hidden) pause(); else if (!api.paused) resume(); });
    listen(window, 'pagehide', dispose, { once: true });
    if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(root); }
    else listen(window, 'resize', resize);
    resize();
    listeners.push(api.onInit(current => { setConfig(current.config); setTheme(current.theme); reduced = current.reducedMotion; root.classList.toggle('reduced-motion', reduced); resetExperience(); if (!ctx || !ambientCtx || !petalsCtx) showFatal('CANVAS_UNAVAILABLE', 'This browser could not create the surprise canvas.'); }));
    listeners.push(api.onUpdate(current => { setTheme(current.theme); setReduced(current.reducedMotion); if (current.muted) suspendAudio(); else resumeAudio(); }));
    listeners.push(api.onPause(pause)); listeners.push(api.onResume(resume));
    listeners.push(api.onReplay(() => { resetExperience(); beginTunnel(); api.replayed(); }));
})();
