
(() => {
    'use strict';

    
    const startOverlay   = document.getElementById('start-overlay');
    const startBtn       = document.getElementById('start-btn');
    const canvas         = document.getElementById('tunnel-canvas');
    const ctx            = canvas.getContext('2d', { alpha: false });
    const flashOverlay   = document.getElementById('flash-overlay');
    const revealEl       = document.getElementById('reveal');
    const cinematicText  = document.getElementById('cinematic-text');
    const toastMsg       = document.getElementById('toast-msg');

    
    const displayTitle    = document.getElementById('display-title');
    const displayCouple   = document.getElementById('display-couple');
    const displayYears    = document.getElementById('display-years');
    const displayYearsUnit= document.getElementById('display-years-unit');
    const displaySubtitle = document.getElementById('display-subtitle');
    const displayQuote    = document.getElementById('display-quote');
    const displayDate     = document.getElementById('display-date');
    const displayCaption  = document.getElementById('display-caption');
    const couplePhoto     = document.getElementById('couple-photo');

    
    const openLetterBtn   = document.getElementById('open-letter-btn');
    const letterModal     = document.getElementById('letter-modal');
    const letterCloseBtn  = document.getElementById('letter-close-btn');

    
    const editBtn         = document.getElementById('edit-btn');
    const replayBtn       = document.getElementById('replay-btn');
    const shareBtn        = document.getElementById('share-btn');
    const editModal       = document.getElementById('edit-modal');
    const modalCloseBtn   = document.getElementById('modal-close-btn');
    const saveCustomBtn   = document.getElementById('save-custom-btn');

    const polaroidBox     = document.getElementById('polaroid-box');
    const photoFileInput  = document.getElementById('photo-file-input');

    let W = 0, H = 0;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    
    const T = {
        TEXT_IN    : 0.6,
        TEXT_OUT   : 2.3,
        TEXT_GONE  : 2.8,
        TUNNEL_END : 3.0,
        LIGHT_END  : 4.6,
        FLASH_PEAK : 4.95,
        FLASH_END  : 5.5,
    };

    
    let audioCtx = null;

    function initAudio() {
        if (audioCtx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }

    function playRomanticChime() {
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const freqs = [369.99, 466.16, 554.37, 739.99, 932.33];

        freqs.forEach((f, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + idx * 0.12);

            gain.gain.setValueAtTime(0, now + idx * 0.12);
            gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.12 + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 2.8);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 3.0);
        });
    }

    function playHeartbeatSound() {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    
    const NUM_RINGS = 50;
    const Z_NEAR    = 0.15;
    const Z_FAR     = 12.0;
    const Z_SPAN    = Z_FAR - Z_NEAR;
    const FOCAL     = 420;

    const rings = [];
    for (let i = 0; i < NUM_RINGS; i++) {
        rings.push({
            z      : Z_NEAR + (i / NUM_RINGS) * Z_SPAN,
            hueOff : (i / NUM_RINGS) * 360,
        });
    }

    const NUM_PARTS = 280;
    const parts = [];
    for (let i = 0; i < NUM_PARTS; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = Math.random() * 600 + 40;
        parts.push({
            x   : Math.cos(angle) * dist,
            y   : Math.sin(angle) * dist,
            z   : Z_NEAR + Math.random() * Z_SPAN,
            sz  : Math.random() * 2.5 + 1.0,
            hue : Math.random() * 360,
        });
    }

    
    const easeIn3  = t => t * t * t;
    const easeOut3 = t => 1 - (1 - t) ** 3;
    const easeOut4 = t => 1 - (1 - t) ** 4;
    const clamp01  = t => Math.max(0, Math.min(1, t));
    const TAU      = Math.PI * 2;

    function heartPath(scale, rot, beat) {
        const s = scale * beat * 0.95;
        ctx.save();
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.35);
        ctx.bezierCurveTo(-s * 0.55, -s * 0.85, -s * 1.1, -s * 0.15, 0, s * 0.75);
        ctx.bezierCurveTo( s * 1.1, -s * 0.15,  s * 0.55, -s * 0.85, 0, -s * 0.35);
        ctx.closePath();
        ctx.restore();
    }

    
    let animationStarted = false;
    let t0       = null;
    let revealed = false;
    let textShown = false;

    
    function render(now) {
        if (!animationStarted) return;
        requestAnimationFrame(render);

        if (t0 === null) t0 = now;
        const sec = (now - t0) / 1000;

        if (revealed && sec > T.FLASH_END + 3) return;

        
        if (sec >= T.TEXT_IN && sec < T.TEXT_OUT) {
            if (!textShown) {
                textShown = true;
                cinematicText.classList.add('visible');
            }
        } else if (sec >= T.TEXT_OUT) {
            if (textShown) {
                textShown = false;
                cinematicText.classList.remove('visible');
            }
        }

        
        let speed, trail, colorSpeed, alphaMod;

        if (sec < T.TUNNEL_END) {
            const p = sec / T.TUNNEL_END;
            speed      = 0.9 + easeIn3(p) * 3.5;
            trail      = 0.18 + p * 0.16;
            colorSpeed = 50 + p * 40;
            alphaMod   = 1.0;
        } else if (sec < T.LIGHT_END) {
            const p = (sec - T.TUNNEL_END) / (T.LIGHT_END - T.TUNNEL_END);
            speed      = 4.4 * (1 - easeOut3(p) * 0.9);
            trail      = 0.34 - p * 0.18;
            colorSpeed = 90 - p * 45;
            alphaMod   = 1.0 - easeIn3(p) * 0.9;
        } else {
            speed      = 0.4;
            trail      = 0.14;
            colorSpeed = 38;
            alphaMod   = 0.1;
        }

        
        ctx.fillStyle = `rgba(5, 0, 12, ${trail.toFixed(2)})`;
        ctx.fillRect(0, 0, W, H);

        
        let shakeX = 0, shakeY = 0;
        if (sec > T.TUNNEL_END + 0.3 && sec < T.FLASH_PEAK) {
            const si = clamp01((sec - T.TUNNEL_END - 0.3) / (T.FLASH_PEAK - T.TUNNEL_END - 0.3));
            const mag = si * si * 6;
            shakeX = (Math.random() - 0.5) * mag;
            shakeY = (Math.random() - 0.5) * mag;
        }

        ctx.save();
        ctx.translate(W / 2 + shakeX, H / 2 + shakeY);
        ctx.globalCompositeOperation = 'lighter';

        const dt = 0.028;

        
        for (let i = 0; i < NUM_PARTS; i++) {
            const p = parts[i];
            p.z -= speed * dt;
            if (p.z <= Z_NEAR) p.z += Z_SPAN;

            const sc = FOCAL / p.z;
            const px = p.x * sc / FOCAL;
            const py = p.y * sc / FOCAL;
            let a = clamp01((Z_FAR - p.z) / 3) * clamp01((p.z - Z_NEAR) * 4) * alphaMod;

            if (a > 0.01) {
                const r = Math.max(0.5, p.sz * sc / 320);
                ctx.fillStyle = `hsla(${(p.hue + sec * colorSpeed) % 360},100%,75%,${(a * 0.6).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, TAU);
                ctx.fill();
            }
        }

        
        rings.sort((a, b) => b.z - a.z);

        for (let i = 0; i < rings.length; i++) {
            const ring = rings[i];
            ring.z -= speed * dt;
            if (ring.z <= Z_NEAR) ring.z += Z_SPAN;

            const sc = FOCAL / ring.z;
            let a = clamp01((Z_FAR - ring.z) / 2.5) * clamp01((ring.z - Z_NEAR) * 5) * alphaMod;
            if (a < 0.01) continue;

            const hue = (ring.hueOff + sec * colorSpeed) % 360;
            const rot = Math.sin(sec * 0.5 + ring.z * 0.35) * 0.12;

            let beat;
            if (sec < T.TUNNEL_END) {
                beat = 1 + Math.sin(sec * 3.5 - ring.z * 0.5) * 0.06;
            } else {
                const sync = clamp01((sec - T.TUNNEL_END) / 1.2);
                beat = 1 + Math.sin(sec * 3.5 - ring.z * 0.5) * 0.06 * (1 - sync)
                         + Math.sin(sec * 5.5) * 0.16 * sync;
            }

            const bw = Math.max(1, sc * 0.024);

            heartPath(sc, rot, beat);
            ctx.strokeStyle = `hsla(${hue},100%,60%,${(a * 0.28).toFixed(3)})`;
            ctx.lineWidth = bw * 4.5;
            ctx.stroke();

            heartPath(sc, rot, beat);
            ctx.strokeStyle = `hsla(${hue},100%,72%,${(a * 0.75).toFixed(3)})`;
            ctx.lineWidth = bw * 1.8;
            ctx.stroke();

            heartPath(sc, rot, beat);
            ctx.strokeStyle = `rgba(255,255,255,${(a * 0.95).toFixed(3)})`;
            ctx.lineWidth = Math.max(1, bw * 0.6);
            ctx.stroke();
        }

        
        if (sec >= T.TUNNEL_END) {
            const rawP = clamp01((sec - T.TUNNEL_END) / (T.LIGHT_END - T.TUNNEL_END));
            const ep   = easeOut4(rawP);

            const maxR = Math.hypot(W, H) * 0.65;
            const baseR = 10 + ep * maxR;
            const hb = 1 + Math.sin(sec * 5.5) * 0.13 * (1 - ep * 0.4);
            const glowR = baseR * hb;

            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);

            if (ep < 0.4) {
                g.addColorStop(0,    `rgba(255,215,235,${(0.3 + ep * 1.5).toFixed(2)})`);
                g.addColorStop(0.35, `rgba(255,155,195,${(0.12 + ep * 0.6).toFixed(2)})`);
                g.addColorStop(0.75, `rgba(200,80,140,${(0.05 + ep * 0.2).toFixed(2)})`);
                g.addColorStop(1,     'rgba(120,30,80,0)');
            } else {
                g.addColorStop(0,    `rgba(255,252,240,${(0.5 + ep * 0.5).toFixed(2)})`);
                g.addColorStop(0.2,  `rgba(255,235,180,${(0.4 + ep * 0.5).toFixed(2)})`);
                g.addColorStop(0.5,  `rgba(255,190,110,${(0.15 + ep * 0.35).toFixed(2)})`);
                g.addColorStop(0.8,  `rgba(220,120,50,${(0.03 + ep * 0.12).toFixed(2)})`);
                g.addColorStop(1,     'rgba(180,70,20,0)');
            }

            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, glowR, 0, TAU);
            ctx.fill();

            if (rawP > 0.08) {
                const ha = clamp01((rawP - 0.08) / 0.4);
                const hs = 16 + ep * 50;
                const hBeat = 1 + Math.sin(sec * 5.5) * 0.13;

                ctx.shadowBlur  = 40 + ep * 30;
                ctx.shadowColor = `rgba(255,200,150,${(ha * 0.75).toFixed(2)})`;
                heartPath(hs, 0, hBeat);
                ctx.fillStyle = `rgba(255,245,225,${(ha * 0.9).toFixed(2)})`;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        ctx.restore();

        
        if (sec >= T.LIGHT_END && sec < T.FLASH_PEAK) {
            const fp = (sec - T.LIGHT_END) / (T.FLASH_PEAK - T.LIGHT_END);
            flashOverlay.style.opacity = easeIn3(fp);
        } else if (sec >= T.FLASH_PEAK && sec < T.FLASH_END) {
            const fp = (sec - T.FLASH_PEAK) / (T.FLASH_END - T.FLASH_PEAK);
            flashOverlay.style.opacity = (1 - easeOut4(fp)).toFixed(3);
        } else if (sec >= T.FLASH_END) {
            flashOverlay.style.opacity = 0;
        }

        
        if (sec >= T.FLASH_PEAK && !revealed) {
            revealed = true;
            triggerReveal();
        }
    }

    
    function triggerReveal() {
        canvas.style.transition = 'opacity 0.8s ease';
        canvas.style.opacity = '0';

        playRomanticChime();

        revealEl.classList.add('visible');

        const items = revealEl.querySelectorAll('.reveal-item');
        items.forEach((el, i) => {
            setTimeout(() => el.classList.add('show'), 300 + i * 220);
        });

        startAmbientParticles();
        startRosePetals();
    }

    
    function startAmbientParticles() {
        const ac  = document.getElementById('ambient-canvas');
        const atx = ac.getContext('2d');

        function resizeAC() {
            ac.width  = window.innerWidth;
            ac.height = window.innerHeight;
        }
        resizeAC();

        const NUM_AMB = 80;
        const amb = [];
        for (let i = 0; i < NUM_AMB; i++) {
            amb.push({
                x  : Math.random() * ac.width,
                y  : Math.random() * ac.height,
                r  : Math.random() * 2.2 + 0.6,
                vx : (Math.random() - 0.5) * 0.22,
                vy : -Math.random() * 0.32 - 0.1,
                op : Math.random() * 0.3 + 0.06,
                hue: Math.random() > 0.5 ? 35 + Math.random() * 25 : 330 + Math.random() * 28,
            });
        }

        let ambOp = 0;

        function anim() {
            atx.clearRect(0, 0, ac.width, ac.height);
            if (ambOp < 1) ambOp = Math.min(1, ambOp + 0.01);

            for (const p of amb) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.y < -12) { p.y = ac.height + 12; p.x = Math.random() * ac.width; }
                if (p.x < -12) p.x = ac.width + 12;
                if (p.x > ac.width + 12) p.x = -12;

                atx.save();
                atx.globalAlpha = p.op * ambOp;
                atx.shadowBlur  = 10;
                atx.shadowColor = `hsl(${p.hue},70%,60%)`;
                atx.fillStyle   = `hsl(${p.hue},70%,60%)`;
                atx.beginPath();
                atx.arc(p.x, p.y, p.r, 0, TAU);
                atx.fill();
                atx.restore();
            }

            requestAnimationFrame(anim);
        }
        anim();
    }

    
    function startRosePetals() {
        const pc  = document.getElementById('petals-canvas');
        const ptx = pc.getContext('2d');

        function resizePC() {
            pc.width  = window.innerWidth;
            pc.height = window.innerHeight;
        }
        resizePC();
        window.addEventListener('resize', resizePC);

        const NUM_PETALS = 45;
        const petals = [];

        const colors = [
            '#e74c6f', 
            '#ff6b8b', 
            '#d4af37', 
            '#c92a42', 
            '#f7e5a0'  
        ];

        for (let i = 0; i < NUM_PETALS; i++) {
            petals.push({
                x       : Math.random() * pc.width,
                y       : Math.random() * -pc.height * 1.5,
                size    : Math.random() * 12 + 10,
                speedY  : Math.random() * 1.5 + 0.9,
                speedX  : Math.random() * 1.2 - 0.6,
                rot     : Math.random() * TAU,
                rotSpeed: (Math.random() - 0.5) * 0.04,
                flip    : Math.random() * TAU,
                flipSpeed: Math.random() * 0.03 + 0.015,
                color   : colors[i % colors.length]
            });
        }

        function drawPetal(p) {
            ptx.save();
            ptx.translate(p.x, p.y);
            ptx.rotate(p.rot);
            const flipScale = Math.sin(p.flip);
            ptx.scale(1, flipScale);

            ptx.fillStyle = p.color;
            ptx.shadowBlur = 12;
            ptx.shadowColor = 'rgba(231, 76, 111, 0.4)';
            ptx.globalAlpha = 0.85;

            ptx.beginPath();
            ptx.moveTo(0, 0);
            ptx.bezierCurveTo(-p.size * 0.8, -p.size, -p.size, p.size * 0.8, 0, p.size * 1.4);
            ptx.bezierCurveTo(p.size, p.size * 0.8, p.size * 0.8, -p.size, 0, 0);
            ptx.fill();
            ptx.restore();
        }

        function animPetals() {
            ptx.clearRect(0, 0, pc.width, pc.height);

            for (const p of petals) {
                p.y += p.speedY;
                p.x += Math.sin(p.y * 0.015) * p.speedX;
                p.rot += p.rotSpeed;
                p.flip += p.flipSpeed;

                if (p.y > pc.height + 25) {
                    p.y = -25;
                    p.x = Math.random() * pc.width;
                }

                drawPetal(p);
            }

            requestAnimationFrame(animPetals);
        }
        animPetals();
    }

    
    function loadFromUrl() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('couple') && displayCouple) displayCouple.textContent = params.get('couple');
        if (params.has('title') && displayTitle) displayTitle.innerHTML = params.get('title').replace('\n', '<br>');
        if (params.has('years') && displayYears) displayYears.textContent = params.get('years');
        if (params.has('yearsUnit') && displayYearsUnit) displayYearsUnit.textContent = params.get('yearsUnit');
        if (params.has('date') && displayDate) displayDate.textContent = params.get('date');
        if (params.has('quote') && displayQuote) displayQuote.innerHTML = params.get('quote').replace('\n', '<br>');
        if (params.has('photo') && couplePhoto) couplePhoto.src = params.get('photo');
    }

    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            initAudio();
            playHeartbeatSound();
            if (startOverlay) startOverlay.classList.add('hidden');

            animationStarted = true;
            t0 = null;
            requestAnimationFrame(render);
        });
    }

    
    if (openLetterBtn && letterModal) {
        openLetterBtn.addEventListener('click', () => {
            playRomanticChime();
            letterModal.classList.add('open');
        });
    }

    if (letterCloseBtn && letterModal) {
        letterCloseBtn.addEventListener('click', () => {
            letterModal.classList.remove('open');
        });
    }

    if (letterModal) {
        letterModal.addEventListener('click', (e) => {
            if (e.target === letterModal) {
                letterModal.classList.remove('open');
            }
        });
    }

    
    if (polaroidBox && photoFileInput) {
        polaroidBox.addEventListener('click', () => {
            photoFileInput.click();
        });

        photoFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    if (couplePhoto) couplePhoto.src = evt.target.result;
                    showToast("Photo updated! 📷💖");
                };
                reader.readAsDataURL(file);
            }
        });
    }

    
    if (editBtn && editModal) {
        editBtn.addEventListener('click', () => {
            editModal.classList.add('open');
        });
    }

    if (modalCloseBtn && editModal) {
        modalCloseBtn.addEventListener('click', () => {
            editModal.classList.remove('open');
        });
    }

    if (replayBtn) {
        replayBtn.addEventListener('click', () => {
            revealEl.classList.remove('visible');
            revealEl.querySelectorAll('.reveal-item').forEach(el => el.classList.remove('show'));
            canvas.style.opacity = '1';

            t0 = null;
            revealed = false;
            textShown = false;
            cinematicText.classList.remove('visible');

            playHeartbeatSound();
            requestAnimationFrame(render);
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const url = window.location.href;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => {
                    showToast("Link Copied! Share with your partner 💖");
                });
            } else {
                showToast("Shareable URL Ready! 🔗");
            }
        });
    }

    function showToast(msg) {
        if (!toastMsg) return;
        toastMsg.textContent = msg;
        toastMsg.classList.add('show');
        setTimeout(() => {
            toastMsg.classList.remove('show');
        }, 3000);
    }

    loadFromUrl();

})();
