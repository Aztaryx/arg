/* ============================================================
   OVERLOAD — overload.js
   The board floods with questions. Clear them before it fills.
   Music escalates with board fill percentage.
   Requires: questions.js loaded before this script.

   Board fill thresholds → music tracks:
     0 – 20%   → zeropercent.mp3      (not yet available — silent)
    20 – 40%   → twentypercent.mp3    (not yet available — silent)
    40 – 60%   → fortypercent.mp3     (not yet available — silent)
    60 – 80%   → sixtypercent.mp3     (not yet available — silent)
    80 – 100%  → eightypercent.mp3    ← DECAY (TRUE) — Digital Descendant
   100%        → game over
   ============================================================ */

(function () {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    const MAX_CARDS       = 8;     // board capacity
    const BASE_INTERVAL   = 7000;  // ms between new card spawns
    const MIN_INTERVAL    = 2200;  // floor for spawn rate
    const SPEED_RAMP      = 80;    // ms reduction per card cleared

    const MUSIC_TRACKS = [
        { threshold: 0,  file: 'playlist/OVERLOAD/zeropercent.mp3',   title: null,           artist: null                },
        { threshold: 20, file: 'playlist/OVERLOAD/twentypercent.mp3',  title: null,           artist: null                },
        { threshold: 40, file: 'playlist/OVERLOAD/fortypercent.mp3',   title: null,           artist: null                },
        { threshold: 60, file: 'playlist/OVERLOAD/sixtypercent.mp3',   title: null,           artist: null                },
        { threshold: 80, file: 'playlist/OVERLOAD/eightypercent.mp3',  title: 'DECAY (TRUE)', artist: 'Digital Descendant'},
    ];

    // ── State ─────────────────────────────────────────────────
    let audio         = null;
    let currentTrack  = -1;   // index into MUSIC_TRACKS
    let spawnTimer    = null;
    let spawnInterval = BASE_INTERVAL;
    let cleared       = 0;
    let activeCards   = 0;
    let usedIndices   = new Set();
    let gameActive    = false;

    // ── DOM refs ──────────────────────────────────────────────
    const overlay    = document.getElementById('ol-overlay');
    const startBtn   = document.getElementById('ol-start-btn');
    const elCleared  = document.getElementById('ol-cleared');
    const elFillBar  = document.getElementById('ol-fill-bar');
    const elFillPct  = document.getElementById('ol-fill-pct');
    const elSong     = document.getElementById('ol-song');
    const elBoard    = document.getElementById('ol-board');

    // ── Helpers ───────────────────────────────────────────────
    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function fillPct() {
        return Math.round((activeCards / MAX_CARDS) * 100);
    }

    function noQuestions() {
        return !window.QUESTION_BANK || window.QUESTION_BANK.length === 0;
    }

    // ── Music ─────────────────────────────────────────────────
    function updateMusic() {
        const pct = fillPct();

        // Find the highest threshold that the fill % has crossed
        let newTrackIdx = 0;
        for (let i = 0; i < MUSIC_TRACKS.length; i++) {
            if (pct >= MUSIC_TRACKS[i].threshold) newTrackIdx = i;
        }

        if (newTrackIdx === currentTrack) return;
        currentTrack = newTrackIdx;

        const track = MUSIC_TRACKS[currentTrack];
        if (audio) { audio.pause(); audio = null; }

        if (!track.title) {
            // Track not yet available — play silence
            if (elSong) elSong.textContent = '♪  —';
            return;
        }

        audio = new Audio(track.file);
        audio.volume = 0.6;
        audio.loop   = true;
        audio.play().catch(() => {});
        if (elSong) elSong.textContent = `♪  ${track.title} — ${track.artist}`;
    }

    // ── Board fill UI ─────────────────────────────────────────
    function updateFillUI() {
        const pct = fillPct();
        if (elFillBar) elFillBar.style.width  = `${pct}%`;
        if (elFillPct) elFillPct.textContent  = `${pct}%`;

        // Colour escalation
        if (elFillBar) {
            if (pct >= 80)      elFillBar.style.background = '#ff2a2a';
            else if (pct >= 60) elFillBar.style.background = '#ff6600';
            else if (pct >= 40) elFillBar.style.background = '#ff9900';
            else                elFillBar.style.background = '#32c8c8';
        }

        updateMusic();
    }

    // ── Card management ───────────────────────────────────────
    function getQuestion() {
        if (!window.QUESTION_BANK) return null;
        if (usedIndices.size >= window.QUESTION_BANK.length) usedIndices.clear();
        let idx;
        let attempts = 0;
        do {
            idx = Math.floor(Math.random() * window.QUESTION_BANK.length);
            attempts++;
        } while (usedIndices.has(idx) && attempts < 200);
        usedIndices.add(idx);
        return { idx, ...window.QUESTION_BANK[idx] };
    }

    function spawnCard() {
        if (!gameActive) return;
        if (activeCards >= MAX_CARDS) { endGame(); return; }

        const q = getQuestion();
        if (!q) return;

        activeCards++;
        updateFillUI();

        const pairs    = q.a.map((text, i) => ({ text, correct: i === q.correct }));
        const shuffled = shuffle(pairs);

        // Build card element
        const card = document.createElement('div');
        card.className = 'ol-card';
        card.innerHTML = `
            <p class="ol-q-text">${q.q}</p>
            <div class="ol-ans-grid">
                ${shuffled.map(opt => `
                    <button class="ol-ans">
                        <span>${opt.text}</span>
                    </button>`).join('')}
            </div>`;

        // Animate in
        card.style.opacity   = '0';
        card.style.transform = 'translateY(16px)';
        if (elBoard) elBoard.appendChild(card);
        requestAnimationFrame(() => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity    = '1';
            card.style.transform  = 'translateY(0)';
        });

        // Attach answer handlers
        const ansBtns = card.querySelectorAll('.ol-ans');
        ansBtns.forEach(function (btn, i) {
            btn.addEventListener('click', function () {
                handleAnswer(shuffled[i].correct, btn, card, ansBtns, shuffled);
            });
        });

        scheduleNext();
    }

    function handleAnswer(correct, clicked, card, allBtns, opts) {
        if (!gameActive) return;
        if (card.dataset.locked === '1') return;
        card.dataset.locked = '1';

        // Reveal correct
        opts.forEach(function (opt, i) {
            if (opt.correct) allBtns[i].classList.add('ol-correct');
        });

        if (correct) {
            clicked.classList.add('ol-correct');
            cleared++;
            if (elCleared) elCleared.textContent = cleared;

            // Speed up slightly
            spawnInterval = Math.max(MIN_INTERVAL, BASE_INTERVAL - cleared * SPEED_RAMP);

            // Remove card
            card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            card.style.opacity    = '0';
            card.style.transform  = 'scale(0.95)';
            setTimeout(function () {
                if (card.parentNode) card.parentNode.removeChild(card);
                activeCards--;
                updateFillUI();
            }, 380);
        } else {
            clicked.classList.add('ol-wrong');
            card.classList.add('ol-card-wrong');
            // Wrong answer: card stays, brief lock so player sees result
            setTimeout(function () {
                card.classList.remove('ol-card-wrong');
                card.dataset.locked = '0';
            }, 900);
        }
    }

    // ── Spawn scheduling ──────────────────────────────────────
    function scheduleNext() {
        clearTimeout(spawnTimer);
        spawnTimer = setTimeout(spawnCard, spawnInterval);
    }

    // ── Game lifecycle ────────────────────────────────────────
    function startGame() {
        if (noQuestions()) {
            alert('No questions loaded yet. Check questions1000.txt.');
            return;
        }

        cleared = activeCards = 0;
        currentTrack = -1;
        spawnInterval = BASE_INTERVAL;
        gameActive = true;
        usedIndices.clear();

        if (elCleared) elCleared.textContent = '0';
        if (elBoard)   elBoard.innerHTML     = '';
        if (overlay)   overlay.classList.add('hidden');

        updateFillUI();
        spawnCard();   // spawn first card immediately
    }

    function endGame() {
        gameActive = false;
        clearTimeout(spawnTimer);
        if (audio) { audio.pause(); audio = null; }

        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <div class="ol-overlay-box">
                    <div class="ol-mode-tag">OVERLOADED</div>
                    <h2>The board is full.</h2>
                    <p>You cleared <strong>${cleared}</strong> card${cleared !== 1 ? 's' : ''} before it buried you.</p>
                    <button class="ol-start-btn" id="ol-retry-btn"><span>RETRY</span></button>
                </div>`;
            document.getElementById('ol-retry-btn')
                .addEventListener('click', startGame);
        }
    }

    // ── Init ──────────────────────────────────────────────────
    function init() {
        if (!startBtn) return;
        startBtn.addEventListener('click', startGame);

        const sidebarBtn = document.getElementById('sidebar-play-btn');
        if (sidebarBtn) {
            sidebarBtn.addEventListener('click', function () {
                if (!gameActive && overlay && !overlay.classList.contains('hidden')) startGame();
            });
        }
    }

    if (window.questionsLoaded) {
        init();
    } else {
        window.addEventListener('questionsReady', init);
    }

})();
