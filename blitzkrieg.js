/* ============================================================
   BLITZKRIEG — blitzkrieg.js  (v6 — VISUALIZER REWORK)
   ============================================================ */
(function () {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    const SONGS = [
        { file: 'playlist/BLITZKRIEG/blitzkrieg1.mp3', title: 'Amen',              artist: 'szymon227g' },
        { file: 'playlist/BLITZKRIEG/blitzkrieg2.mp3', title: 'Amen (Reprise)',     artist: 'szymon227g' },
        { file: 'playlist/BLITZKRIEG/blitzkrieg3.mp3', title: 'Carnation',          artist: 'szymon227g' },
        { file: 'playlist/BLITZKRIEG/blitzkrieg4.mp3', title: 'Dark Matter',        artist: 'szymon227g' },
        { file: 'playlist/BLITZKRIEG/blitzkrieg5.mp3', title: 'Inevitability',      artist: 'szymn227g'  },
        { file: 'playlist/BLITZKRIEG/blitzkrieg6.mp3', title: 'For The Greater Goob', artist: 'mich'     },
    ];

    const GAME_MS          = 150000;
    const BLINK_INTERVAL   = 400;
    const BLINK_CYCLES     = 2;
    const BASE_PTS_MAX     = 500;
    const BASE_PTS_MIN     = 50;
    const BASE_PTS_DECAY   = 6;
    const MULT_STEP        = 0.5;
    const MULT_CAP         = 5.0;

    // Score grades — high → low
    const GRADES = [
        { min: 130000, rank: 'SSS', cls: 'bk-rank-sss' },
        { min:  80000, rank: 'SS',  cls: 'bk-rank-ss'  },
        { min:  45000, rank: 'S',   cls: 'bk-rank-s'   },
        { min:  20000, rank: 'A',   cls: 'bk-rank-a'   },
        { min:   8000, rank: 'B',   cls: 'bk-rank-b'   },
        { min:   2000, rank: 'C',   cls: 'bk-rank-c'   },
        { min:      0, rank: 'D',   cls: 'bk-rank-d'   },
    ];

    const PHASE_IDLE    = 'idle';
    const PHASE_BLINK   = 'blink';
    const PHASE_NORMAL  = 'normal';
    const PHASE_WARNING = 'warning';
    const PHASE_FOCUS   = 'focus';
    const PHASE_FINALE  = 'finale';

    // ── State ─────────────────────────────────────────────────
    let audio          = null;
    let audioCtx       = null;
    let analyser       = null;
    let sourceNode     = null;
    let songIndex      = 0;
    let gamePhase      = PHASE_IDLE;
    let startTime      = 0;
    let rafId          = null;
    let visRafId       = null;
    let blinkTimer     = null;
    let score          = 0;
    let streak         = 0;
    let peakStreak     = 0;
    let totalCorrect   = 0;
    let totalAnswered  = 0;
    let totalTimeTaken = 0;
    let questionShownAt = 0;
    let locked         = false;
    let deck           = [];
    let deckIdx        = 0;
    let qCount         = 0;
    let lastSecond     = 150;

    // Particles
    let particles = [];

    // Visualizer peak hold
    let peakHold  = [];
    let peakDecay = [];

    // Banner speed smoothing
    let bannerAmplSmooth = 0;

    // ── DOM refs ──────────────────────────────────────────────
    const overlay        = document.getElementById('bk-overlay');
    const startBtn       = document.getElementById('bk-start-btn');
    const resultsEl      = document.getElementById('bk-results');
    const retryBtn       = document.getElementById('bk-retry-btn');
    const elTimeMain     = document.getElementById('bk-time-main');
    const elTimeMs       = document.getElementById('bk-time-ms');
    const elCornerTimer  = document.getElementById('bk-corner-timer');
    const elScore        = document.getElementById('bk-score');
    const elMult         = document.getElementById('bk-mult');
    const elSong         = document.getElementById('bk-song');
    const elQNum         = document.getElementById('bk-q-num');
    const elQuestion     = document.getElementById('bk-question');
    const elAnswers      = document.getElementById('bk-answers');
    const elHud          = document.getElementById('bk-hud');
    const elStreakBar     = document.getElementById('bk-streak-bar');
    const finaleOverlay  = document.getElementById('bk-finale-overlay');
    const finaleNum      = document.getElementById('bk-finale-num');
    const visCanvas      = document.getElementById('bk-vis-canvas');
    const elParticles    = document.getElementById('bk-particles');
    const bannerTopTrack = document.getElementById('bk-banner-top-track');
    const bannerBotTrack = document.getElementById('bk-banner-bot-track');

    // ── Helpers ───────────────────────────────────────────────
    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function noQuestions() {
        return !window.QUESTION_BANK || window.QUESTION_BANK.length === 0;
    }

    function fmtTime(ms) {
        const t = Math.max(0, ms);
        return {
            main: `${Math.floor(t / 60000)}:${String(Math.floor((t % 60000) / 1000)).padStart(2, '0')}`,
            ms:   `.${String(t % 1000).padStart(3, '0')}`,
        };
    }

    function calcMult(s)       { return Math.min(1 + s * MULT_STEP, MULT_CAP); }
    function calcBase(elapsed) { return Math.max(BASE_PTS_MAX - Math.floor(elapsed / 100) * BASE_PTS_DECAY, BASE_PTS_MIN); }
    function gradeFor(s)       { return GRADES.find(g => s >= g.min) || GRADES[GRADES.length - 1]; }
    function gradeIdxFor(s)    { return GRADES.findIndex(g => s >= g.min); }

    function applyRankClasses(el, grade) {
        GRADES.forEach(g => el.classList.remove(g.cls));
        el.classList.add(grade.cls);
    }

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // ── Chrome ────────────────────────────────────────────────
    const hideChrome = () => document.body.classList.add('bk-game-active');
    const showChrome = () => document.body.classList.remove('bk-game-active');

    // ── Score display bump ────────────────────────────────────
    function bumpScoreEl(el) {
        if (!el) return;
        el.classList.remove('bk-val-bump');
        void el.offsetWidth;
        el.classList.add('bk-val-bump');
    }

    // ── Visualizer setup ──────────────────────────────────────
    function setupAnalyser(audioEl) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (sourceNode) { try { sourceNode.disconnect(); } catch (e) {} }

            sourceNode = audioCtx.createMediaElementSource(audioEl);
            analyser   = audioCtx.createAnalyser();

            analyser.fftSize               = 512;   // 256 bins — denser bars
            analyser.smoothingTimeConstant = 0.78;
            analyser.minDecibels           = -85;
            analyser.maxDecibels           = -10;

            sourceNode.connect(analyser);
            analyser.connect(audioCtx.destination);

            const bins = analyser.frequencyBinCount;
            peakHold   = new Array(bins).fill(0);
            peakDecay  = new Array(bins).fill(0);
        } catch (e) { analyser = null; }
    }

    function resizeCanvases() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (visCanvas)   { visCanvas.width   = vw; visCanvas.height   = vh; }
        if (elParticles) { elParticles.width = vw; elParticles.height = vh; }
    }

    // ── Banner speed control ──────────────────────────────────
    function updateBannerSpeed(amplitude) {
        bannerAmplSmooth = bannerAmplSmooth * 0.88 + amplitude * 0.12;
        const durTop = 14 - bannerAmplSmooth * 11;
        const durBot = 20 - bannerAmplSmooth * 16;
        document.documentElement.style.setProperty('--banner-top-dur', durTop.toFixed(2) + 's');
        document.documentElement.style.setProperty('--banner-bot-dur', durBot.toFixed(2) + 's');
    }

    // ── Particle System ───────────────────────────────────────
    const PARTICLE_COLORS = {
        'D':   ['#787888', '#555565'],
        'C':   ['#4ac44a', '#88ff88'],
        'B':   ['#5a8aff', '#aaccff'],
        'A':   ['#cc66ff', '#ee88ff'],
        'S':   ['#f7e84e', '#ffffa0'],
        'SS':  ['#ff9900', '#ffcc44'],
        'SSS': ['#ff2222', '#ff8888', '#ffff44'],
    };

    function spawnParticles(x, y, count, rank, speed) {
        const colors = PARTICLE_COLORS[rank] || PARTICLE_COLORS['D'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd   = speed * (0.4 + Math.random() * 0.6);
            particles.push({
                x, y,
                vx:      Math.cos(angle) * spd,
                vy:      Math.sin(angle) * spd - speed * 0.3,
                life:    1,
                decay:   0.022 + Math.random() * 0.02,
                size:    2 + Math.random() * 3,
                color:   pick(colors),
                gravity: 0.15 + Math.random() * 0.1,
            });
        }
    }

    function spawnCorrectParticles() {
        const card = document.getElementById('bk-card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        spawnParticles(
            rect.left + rect.width  / 2,
            rect.top  + rect.height / 2,
            18, gradeFor(score).rank, 6
        );
    }

    function spawnAudioParticles(amplitude) {
        if (amplitude < 0.5) return;
        const count = Math.floor((amplitude - 0.5) * 3);
        if (count < 1) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        spawnParticles(
            Math.random() * vw,
            vh - 10,
            count, gradeFor(score).rank, 3 * amplitude
        );
    }

    function drawParticles() {
        if (!elParticles) return;
        const ctx = elParticles.getContext('2d');
        ctx.clearRect(0, 0, elParticles.width, elParticles.height);

        if (gamePhase === PHASE_IDLE || gamePhase === PHASE_BLINK) {
            particles = [];
            return;
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x  += p.vx;
            p.y  += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.97;
            p.life -= p.decay;

            if (p.life <= 0) { particles.splice(i, 1); continue; }

            ctx.save();
            ctx.globalAlpha = p.life * 0.85;
            ctx.fillStyle   = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ── Visualizer draw helpers ───────────────────────────────

    function drawBottomBars(ctx, cw, ch, data, bins, isWarn) {
        const maxH = ch * 0.27;
        const barW = cw / bins;
        for (let i = 0; i < bins; i++) {
            const amp = data[i];
            if (amp < 0.015) continue;
            const barH  = amp * maxH;
            const x     = i * barW;
            const alpha = 0.22 + amp * 0.78;
            ctx.fillStyle = isWarn
                ? `rgba(255,50,50,${alpha.toFixed(3)})`
                : `rgba(255,255,255,${alpha.toFixed(3)})`;
            ctx.fillRect(Math.floor(x), ch - barH, Math.max(barW - 1, 1), barH);
        }
    }

    function drawTopBars(ctx, cw, ch, data, bins, isWarn) {
        const maxH = ch * 0.27;
        const barW = cw / bins;
        for (let i = 0; i < bins; i++) {
            const amp = data[i];
            if (amp < 0.015) continue;
            const barH  = amp * maxH;
            const x     = i * barW;
            const alpha = 0.22 + amp * 0.78;
            ctx.fillStyle = isWarn
                ? `rgba(255,50,50,${alpha.toFixed(3)})`
                : `rgba(255,255,255,${alpha.toFixed(3)})`;
            ctx.fillRect(Math.floor(x), 0, Math.max(barW - 1, 1), barH);
        }
    }

    function drawCircularVis(ctx, cw, ch, data, bins, isWarn) {
        const cx = cw / 2;
        const cy = ch / 2;
        const minDim    = Math.min(cw, ch);
        const innerR    = minDim * 0.11;
        const maxBarLen = minDim * 0.11;

        const ringColor = isWarn ? 'rgba(255,60,60,' : 'rgba(255,255,255,';

        // Decorative dashed rings
        ctx.save();
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 7]);
        const rings = [
            { r: innerR * 0.90,           alpha: 0.07 },
            { r: innerR + maxBarLen * 0.45, alpha: 0.05 },
            { r: innerR + maxBarLen * 0.90, alpha: 0.035 },
        ];
        rings.forEach(({ r, alpha }) => {
            ctx.strokeStyle = ringColor + alpha + ')';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.restore();

        // Frequency bars radiating outward
        ctx.save();
        ctx.lineWidth = 1.5;
        for (let i = 0; i < bins; i++) {
            const amp = data[i];
            if (amp < 0.02) continue;
            const angle  = (i / bins) * Math.PI * 2 - Math.PI / 2;
            const barLen = amp * maxBarLen;
            const alpha  = 0.18 + amp * 0.82;
            const cos    = Math.cos(angle);
            const sin    = Math.sin(angle);

            ctx.strokeStyle = isWarn
                ? `rgba(255,50,50,${alpha.toFixed(3)})`
                : `rgba(255,255,255,${alpha.toFixed(3)})`;

            ctx.beginPath();
            ctx.moveTo(cx + cos * innerR,              cy + sin * innerR);
            ctx.lineTo(cx + cos * (innerR + barLen),   cy + sin * (innerR + barLen));
            ctx.stroke();
        }
        ctx.restore();
    }

    // ── Main visualizer loop ──────────────────────────────────
    function drawVisualizer() {
        visRafId = requestAnimationFrame(drawVisualizer);
        drawParticles();

        if (!visCanvas) return;
        const ctx = visCanvas.getContext('2d');
        const cw  = visCanvas.width;
        const ch  = visCanvas.height;

        if (!analyser || gamePhase === PHASE_IDLE || gamePhase === PHASE_BLINK) {
            ctx.clearRect(0, 0, cw, ch);
            updateBannerSpeed(0);
            return;
        }

        const bins = analyser.frequencyBinCount;
        const raw  = new Uint8Array(bins);
        analyser.getByteFrequencyData(raw);

        const data = new Float32Array(bins);
        let sumAmp = 0;
        for (let i = 0; i < bins; i++) {
            let v = raw[i] / 255;
            v = v * v;

            // Boost low-end to make bass hits more visible
            if      (i <= 3)  v = Math.min(v * 2.2,  1.0);
            else if (i <= 8)  v = Math.min(v * 1.8,  1.0);
            else if (i <= 18) v = Math.min(v * 1.5,  1.0);
            else if (i <= 40) v = Math.min(v * 1.3,  1.0);
            else if (i <= 80) v = Math.min(v * 1.15, 1.0);

            // Peak hold
            if (v > peakHold[i]) {
                peakHold[i]  = v;
                peakDecay[i] = 0;
            } else {
                peakDecay[i]++;
                if (peakDecay[i] > 10) peakHold[i] = Math.max(peakHold[i] - 0.025, 0);
            }
            data[i] = v;
            sumAmp += v;
        }

        const avgAmp = sumAmp / bins;
        updateBannerSpeed(avgAmp);
        if (avgAmp > 0.4) spawnAudioParticles(avgAmp);

        const isWarn = (gamePhase === PHASE_WARNING || gamePhase === PHASE_FINALE);

        ctx.clearRect(0, 0, cw, ch);
        drawBottomBars(ctx, cw, ch, data, bins, isWarn);
        drawTopBars(ctx, cw, ch, data, bins, isWarn);
        drawCircularVis(ctx, cw, ch, data, bins, isWarn);
    }

    // ── Music ─────────────────────────────────────────────────
    function playSong(idx) {
        const song = SONGS[idx % SONGS.length];
        if (!audio) {
            audio = new Audio();
            audio.crossOrigin = 'anonymous';
            audio.volume = 0.6;
            audio.addEventListener('ended', () => {
                if (gamePhase === PHASE_IDLE || gamePhase === PHASE_BLINK) return;
                songIndex = (songIndex + 1) % SONGS.length;
                playSong(songIndex);
            });
            setupAnalyser(audio);
        }
        audio.src = song.file;
        audio.load();
        audio.play().catch(() => {});
        if (elSong) elSong.textContent = `${song.title} — ${song.artist}`;
    }

    function stopMusic() { if (audio) { audio.pause(); audio.src = ''; } }

    // ── Timer ─────────────────────────────────────────────────
    function timerTick() {
        if (gamePhase === PHASE_IDLE || gamePhase === PHASE_BLINK) return;

        const elapsed   = Date.now() - startTime;
        const remaining = Math.max(0, GAME_MS - elapsed);
        const secLeft   = Math.ceil(remaining / 1000);

        if (gamePhase !== PHASE_FOCUS) {
            const { main, ms } = fmtTime(remaining);
            if (elTimeMain) elTimeMain.textContent = main;
            if (elTimeMs)   elTimeMs.textContent   = ms;
        }

        if (secLeft !== lastSecond) { lastSecond = secLeft; onSecondChange(secLeft); }
        if (remaining <= 0) { endGame(); return; }

        rafId = requestAnimationFrame(timerTick);
    }

    function onSecondChange(sec) {
        if (sec === 60 && gamePhase === PHASE_NORMAL) enterWarning();
        if (gamePhase === PHASE_WARNING && sec > 15)   flashTimerRed();
        if (sec === 15 && gamePhase === PHASE_WARNING) enterFocus();
        if (sec === 10 && gamePhase === PHASE_FOCUS)   enterFinale();
        if (gamePhase === PHASE_FINALE && sec <= 10) {
            if (finaleNum) finaleNum.textContent = sec;
        }
    }

    function enterWarning() {
        gamePhase = PHASE_WARNING;
        document.body.classList.add('bk-phase-warning');
    }

    function enterFocus() {
        gamePhase = PHASE_FOCUS;
        document.body.classList.remove('bk-phase-warning');
        document.body.classList.add('bk-phase-focus');
        if (elHud)         elHud.classList.add('bk-hidden');
        if (elCornerTimer) elCornerTimer.classList.add('bk-hidden');
    }

    function enterFinale() {
        gamePhase = PHASE_FINALE;
        document.body.classList.remove('bk-phase-focus');
        document.body.classList.add('bk-phase-finale');
        if (elHud)         elHud.classList.remove('bk-hidden');
        if (elCornerTimer) elCornerTimer.classList.add('bk-hidden');
        if (finaleOverlay) finaleOverlay.classList.remove('hidden');
        if (finaleNum)     finaleNum.textContent = '10';
    }

    function flashTimerRed() {
        if (!elCornerTimer) return;
        elCornerTimer.style.transition = 'none';
        elCornerTimer.style.color      = '#ff2020';
        document.body.classList.add('bk-vis-flash');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            elCornerTimer.style.transition = 'color 0.65s ease';
            elCornerTimer.style.color      = '#f7e84e';
            setTimeout(() => document.body.classList.remove('bk-vis-flash'), 260);
        }));
    }

    // ── GODSPEED blink ────────────────────────────────────────
    function runBlinkSequence(onDone) {
        gamePhase = PHASE_BLINK;
        let n = 0;
        if (elTimeMain)    elTimeMain.textContent = '2:30';
        if (elTimeMs)      elTimeMs.textContent   = '.000';
        if (elCornerTimer) elCornerTimer.classList.remove('bk-hidden');

        blinkTimer = setInterval(function () {
            n++;
            const gs = (n % 2 === 1);
            if (gs) {
                elCornerTimer.classList.add('bk-godspeed');
                if (elTimeMain) elTimeMain.textContent = 'GODSPEED!';
                if (elTimeMs)   elTimeMs.textContent   = '';
            } else {
                elCornerTimer.classList.remove('bk-godspeed');
                if (elTimeMain) elTimeMain.textContent = '2:30';
                if (elTimeMs)   elTimeMs.textContent   = '.000';
            }
            if (n >= BLINK_CYCLES * 2) {
                clearInterval(blinkTimer);
                elCornerTimer.classList.remove('bk-godspeed');
                if (elTimeMain) elTimeMain.textContent = '2:30';
                if (elTimeMs)   elTimeMs.textContent   = '.000';
                setTimeout(onDone, BLINK_INTERVAL);
            }
        }, BLINK_INTERVAL);
    }

    // ── Questions ─────────────────────────────────────────────
    function buildDeck() { return shuffle(window.QUESTION_BANK.slice()); }

    function nextQuestion() {
        if (gamePhase === PHASE_IDLE || gamePhase === PHASE_BLINK) return;
        if (deckIdx >= deck.length) { deck = buildDeck(); deckIdx = 0; }
        const q = deck[deckIdx++];
        locked  = false;
        qCount++;
        questionShownAt = Date.now();

        if (elQNum)     elQNum.textContent    = `Q${qCount}`;
        if (elQuestion) elQuestion.innerHTML  = q.q;

        const shuffled = shuffle(q.a.map((t, i) => ({ text: t, correct: i === q.correct })));
        if (elAnswers) {
            elAnswers.innerHTML = '';
            shuffled.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'bk-ans';
                btn.innerHTML = `<span>${opt.text}</span>`;
                btn.addEventListener('click', () => handleAnswer(opt.correct, btn, shuffled));
                elAnswers.appendChild(btn);
            });
        }
        updateStreakBar();
    }

    function handleAnswer(correct, clicked, opts) {
        if (locked || gamePhase === PHASE_IDLE || gamePhase === PHASE_BLINK) return;
        locked = true;
        const allBtns   = elAnswers ? elAnswers.querySelectorAll('.bk-ans') : [];
        const elapsedMs = Date.now() - questionShownAt;
        totalAnswered++;

        opts.forEach((opt, i) => { if (opt.correct && allBtns[i]) allBtns[i].classList.add('bk-correct'); });

        if (correct) {
            clicked.classList.add('bk-correct');
            totalCorrect++;
            totalTimeTaken += elapsedMs;

            const base = calcBase(elapsedMs);
            const mult = calcMult(streak);
            const pts  = Math.round(base * mult);
            score     += pts;
            streak++;
            peakStreak = Math.max(peakStreak, streak);

            if (elScore) {
                elScore.textContent = score.toLocaleString();
                bumpScoreEl(elScore);
            }
            if (elMult) {
                elMult.textContent = `×${calcMult(streak).toFixed(1)}`;
                bumpScoreEl(elMult);
            }

            showScorePopup(pts, mult, elapsedMs);
            spawnCorrectParticles();

        } else {
            clicked.classList.add('bk-wrong');
            streak = 0;
            if (elMult) elMult.textContent = '×1.0';
            document.body.classList.add('bk-flash-wrong');
            setTimeout(() => document.body.classList.remove('bk-flash-wrong'), 350);
        }
        updateStreakBar();
        setTimeout(nextQuestion, 620);
    }

    function showScorePopup(pts, mult, elapsed) {
        const card = document.getElementById('bk-card');
        if (!card) return;
        const pop = document.createElement('div');
        pop.className = 'bk-score-pop';

        const speedIcon = elapsed < 800  ? '⚡' :
                          elapsed < 1500 ? '🔥' : '';

        pop.innerHTML = `
            <span class="bk-pop-pts">+${pts.toLocaleString()}</span>
            <span class="bk-pop-meta">${speedIcon} ×${mult.toFixed(1)}</span>
        `;
        card.appendChild(pop);
        requestAnimationFrame(() => pop.classList.add('bk-pop-fly'));
        setTimeout(() => { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 1000);
    }

    function updateStreakBar() {
        if (!elStreakBar) return;
        const filled = Math.min(streak, 8);
        elStreakBar.innerHTML = Array.from({ length: 8 }, (_, i) =>
            `<span class="bk-pip${i < filled ? ' bk-pip-on' : ''}"></span>`
        ).join('');
    }

    // ── Game lifecycle ────────────────────────────────────────
    function startGame() {
        if (noQuestions()) { alert('No questions loaded. Check questions1000.js.'); return; }

        score = streak = peakStreak = totalCorrect = totalAnswered = totalTimeTaken = qCount = deckIdx = 0;
        locked     = false;
        lastSecond = 150;
        particles  = [];
        deck       = buildDeck();
        songIndex  = Math.floor(Math.random() * SONGS.length);

        if (elScore) elScore.textContent = '0';
        if (elMult)  elMult.textContent  = '×1.0';
        if (elHud)   elHud.classList.remove('bk-hidden');

        if (finaleOverlay) finaleOverlay.classList.add('hidden');
        document.body.classList.remove('bk-phase-warning', 'bk-phase-focus', 'bk-phase-finale', 'bk-flash-wrong');

        if (overlay)   overlay.classList.add('hidden');
        if (resultsEl) resultsEl.style.display = 'none';

        if (elCornerTimer) { elCornerTimer.style.color = '#f7e84e'; elCornerTimer.style.transition = ''; }
        updateStreakBar();
        hideChrome();

        runBlinkSequence(function () {
            playSong(songIndex);
            gamePhase = PHASE_NORMAL;
            startTime = Date.now();
            rafId     = requestAnimationFrame(timerTick);
            nextQuestion();
        });
    }

    function endGame() {
        gamePhase = PHASE_IDLE;
        locked    = true;
        cancelAnimationFrame(rafId);
        clearInterval(blinkTimer);
        document.body.classList.remove(
            'bk-phase-warning', 'bk-phase-focus', 'bk-phase-finale', 'bk-game-active'
        );

        if (finaleOverlay) finaleOverlay.classList.add('hidden');
        if (elHud)         elHud.classList.remove('bk-hidden');
        if (elCornerTimer) {
            elCornerTimer.classList.remove('bk-hidden');
            elCornerTimer.style.color = '#f7e84e';
        }
        showChrome();
        stopMusic();
        showResults();
    }

    // ── Results ───────────────────────────────────────────────
    function showResults() {
        if (!resultsEl) return;

        const avgSec  = totalCorrect > 0 ? (totalTimeTaken / totalCorrect / 1000).toFixed(2) : '—';
        const peakMul = calcMult(peakStreak).toFixed(1);
        const acc     = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
        const grade   = gradeFor(score);
        const gIdx    = gradeIdxFor(score);
        const nextG   = gIdx > 0 ? GRADES[gIdx - 1] : null;
        const fillPct = nextG ? Math.round(((score - grade.min) / (nextG.min - grade.min)) * 100) : 100;

        const resScore = document.getElementById('bk-res-score');
        const resMeter = document.getElementById('bk-res-meter');
        const resStats = document.getElementById('bk-res-stats');

        if (resScore) resScore.textContent = score.toLocaleString();

        if (resMeter) {
            const pipHtml = [...GRADES].reverse().map(g => {
                const lit = score >= g.min;
                return `<span class="bk-style-pip${lit ? ' bk-pip-lit ' + g.cls : ''}">${g.rank}</span>`;
            }).join('');

            resMeter.innerHTML = `
                <div class="bk-style-section-label">SCORE GRADE</div>
                <div class="bk-style-rank-letter bk-rank-d" id="bk-srl">D</div>
                <div class="bk-style-bar-wrap">
                    <div class="bk-style-bar-fill bk-rank-d" id="bk-sbf" style="width:0%"></div>
                </div>
                <div class="bk-style-pips">${pipHtml}</div>
            `;
            setTimeout(() => animateMeter(gIdx, fillPct, grade), 250);
        }

        if (resStats) {
            resStats.innerHTML = `
                <div class="bk-res-row">
                    <span class="bk-res-key">Correct</span>
                    <span class="bk-res-val">${totalCorrect} / ${totalAnswered}</span>
                </div>
                <div class="bk-res-row">
                    <span class="bk-res-key">Accuracy</span>
                    <span class="bk-res-val">${acc}%</span>
                </div>
                <div class="bk-res-row">
                    <span class="bk-res-key">Best Streak</span>
                    <span class="bk-res-val">${peakStreak}</span>
                </div>
                <div class="bk-res-row">
                    <span class="bk-res-key">Peak Multiplier</span>
                    <span class="bk-res-val bk-res-highlight">×${peakMul}</span>
                </div>
                <div class="bk-res-row">
                    <span class="bk-res-key">Avg Response</span>
                    <span class="bk-res-val">${avgSec}s</span>
                </div>
            `;
        }

        resultsEl.style.display = 'flex';
    }

    function animateMeter(finalGradeIdx, finalFill, finalGrade) {
        const bar    = document.getElementById('bk-sbf');
        const letter = document.getElementById('bk-srl');
        if (!bar || !letter) return;

        const ascending = [...GRADES].reverse();
        const targetIdx = ascending.findIndex(g => g.rank === finalGrade.rank);
        let step = 0;

        function advance() {
            if (step > targetIdx) return;
            const g      = ascending[step];
            const isLast = (step === targetIdx);
            const target = isLast ? finalFill : 100;

            applyRankClasses(letter, g);
            applyRankClasses(bar, g);
            letter.textContent = g.rank;

            letter.classList.remove('bk-rank-pop');
            void letter.offsetWidth;
            letter.classList.add('bk-rank-pop');

            requestAnimationFrame(() => { bar.style.width = target + '%'; });
            step++;

            if (!isLast) {
                setTimeout(() => {
                    bar.style.transition = 'none';
                    bar.style.width      = '0%';
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        bar.style.transition = '';
                        advance();
                    }));
                }, 1250);
            }
        }
        advance();
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        resizeCanvases();
        window.addEventListener('resize', resizeCanvases);
        visRafId = requestAnimationFrame(drawVisualizer);

        if (startBtn) startBtn.addEventListener('click', startGame);
        if (retryBtn) retryBtn.addEventListener('click', () => {
            if (resultsEl) resultsEl.style.display = 'none';
            startGame();
        });
    }

    if (window.questionsLoaded) init();
    else window.addEventListener('questionsReady', init);

})();