/* ============================================================
   BLITZKRIEG — blitzkrieg.js
   Race the clock. Four tracks. 2 minutes 30 seconds.
   Requires: questions.js loaded before this script.
   ============================================================ */

(function () {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    const SONGS = [
        { file: 'playlist/BLITZKRIEG/blitzkrieg1.mp3', title: 'Amen',           artist: 'szymon227g'      },
        { file: 'playlist/BLITZKRIEG/blitzkrieg2.mp3', title: 'Amen (Reprise)', artist: 'szymon227g'      },
        { file: 'playlist/BLITZKRIEG/blitzkrieg3.mp3', title: 'Carnation',      artist: 'szymon227g'      },
        { file: 'playlist/BLITZKRIEG/blitzkrieg4.mp3', title: 'Dark Matter',    artist: 'szymon227g'      },
    ];

    const GAME_DURATION = 150;         // seconds
    const RING_C        = 2 * Math.PI * 52;  // SVG ring circumference (r=52)

    // ── State ─────────────────────────────────────────────────
    let audio       = null;
    let songIndex   = 0;
    let timerId     = null;
    let timeLeft    = GAME_DURATION;
    let score       = 0;
    let streak      = 0;
    let deck        = [];
    let deckIdx     = 0;
    let qCount      = 0;
    let locked      = false;
    let gameActive  = false;

    // ── DOM refs ──────────────────────────────────────────────
    const overlay    = document.getElementById('bk-overlay');
    const startBtn   = document.getElementById('bk-start-btn');
    const elScore    = document.getElementById('bk-score');
    const elStreak   = document.getElementById('bk-streak');
    const elTime     = document.getElementById('bk-time');
    const elRingArc  = document.getElementById('bk-ring-arc');
    const elSong     = document.getElementById('bk-song');
    const elQNum     = document.getElementById('bk-q-num');
    const elQuestion = document.getElementById('bk-question');
    const elAnswers  = document.getElementById('bk-answers');

    // ── Helpers ───────────────────────────────────────────────
    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function fmt(s) {
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }

    function updateRing() {
        if (!elRingArc) return;
        const pct = timeLeft / GAME_DURATION;
        elRingArc.style.strokeDasharray  = RING_C;
        elRingArc.style.strokeDashoffset = RING_C * (1 - pct);
        // Colour shift: green → yellow → red
        if (pct > 0.5)      elRingArc.style.stroke = '#f7e84e';
        else if (pct > 0.2) elRingArc.style.stroke = '#ff9900';
        else                elRingArc.style.stroke = '#ff3a3a';
    }

    function noQuestions() {
        return !window.QUESTION_BANK || window.QUESTION_BANK.length === 0;
    }

    // ── Music ─────────────────────────────────────────────────
    function playSong(idx) {
        if (audio) { audio.pause(); audio = null; }
        const song = SONGS[idx % SONGS.length];
        audio = new Audio(song.file);
        audio.volume = 0.6;
        audio.play().catch(() => {});
        audio.addEventListener('ended', function () {
            if (!gameActive) return;
            songIndex = (songIndex + 1) % SONGS.length;
            playSong(songIndex);
        });
        if (elSong) elSong.textContent = `♪  Now Playing: ${song.title} — ${song.artist}`;
    }

    // ── Question logic ────────────────────────────────────────
    function buildDeck() {
        return shuffle(window.QUESTION_BANK.slice());
    }

    function nextQuestion() {
        if (!gameActive) return;
        if (deckIdx >= deck.length) { deck = buildDeck(); deckIdx = 0; }
        const q = deck[deckIdx++];
        locked = false;
        qCount++;

        if (elQNum)     elQNum.textContent     = `Q${qCount}`;
        if (elQuestion) elQuestion.textContent = q.q;

        // Build shuffled answer buttons
        const pairs    = q.a.map((text, i) => ({ text, correct: i === q.correct }));
        const shuffled = shuffle(pairs);

        if (elAnswers) {
            elAnswers.innerHTML = '';
            shuffled.forEach(function (opt) {
                const btn = document.createElement('button');
                btn.className = 'bk-ans';
                btn.innerHTML = `<span>${opt.text}</span>`;
                btn.addEventListener('click', function () {
                    handleAnswer(opt.correct, btn, shuffled);
                });
                elAnswers.appendChild(btn);
            });
        }
    }

    function handleAnswer(correct, clicked, opts) {
        if (locked || !gameActive) return;
        locked = true;

        const allBtns = elAnswers ? elAnswers.querySelectorAll('.bk-ans') : [];

        // Reveal correct answer
        opts.forEach(function (opt, i) {
            if (opt.correct && allBtns[i]) allBtns[i].classList.add('bk-correct');
        });

        if (correct) {
            clicked.classList.add('bk-correct');
            score++;
            streak++;
        } else {
            clicked.classList.add('bk-wrong');
            streak = 0;
            document.body.classList.add('bk-flash-wrong');
            setTimeout(() => document.body.classList.remove('bk-flash-wrong'), 350);
        }

        if (elScore)  elScore.textContent  = score;
        if (elStreak) elStreak.textContent = streak > 0 ? `${streak} 🔥` : '0';

        setTimeout(nextQuestion, 600);
    }

    // ── Timer ─────────────────────────────────────────────────
    function startTimer() {
        timeLeft = GAME_DURATION;
        if (elTime) elTime.textContent = fmt(timeLeft);
        updateRing();

        timerId = setInterval(function () {
            timeLeft--;
            if (elTime) elTime.textContent = fmt(timeLeft);
            updateRing();

            if (timeLeft <= 30) document.body.classList.add('bk-warning');
            else                document.body.classList.remove('bk-warning');

            if (timeLeft <= 0) endGame();
        }, 1000);
    }

    // ── Game lifecycle ────────────────────────────────────────
    function startGame() {
        if (noQuestions()) {
            alert('No questions loaded yet. Check questions1000.txt.');
            return;
        }

        // Reset
        score = streak = qCount = deckIdx = 0;
        gameActive = true;
        locked = false;
        deck = buildDeck();
        songIndex = Math.floor(Math.random() * SONGS.length);

        if (elScore)  elScore.textContent  = '0';
        if (elStreak) elStreak.textContent = '0';
        document.body.classList.remove('bk-warning');

        if (overlay) overlay.classList.add('hidden');

        playSong(songIndex);
        startTimer();
        nextQuestion();
    }

    function endGame() {
        gameActive = false;
        locked     = true;
        clearInterval(timerId);
        if (audio) { audio.pause(); audio = null; }
        document.body.classList.remove('bk-warning');

        // Reuse overlay for game-over
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <div class="bk-overlay-box">
                    <div class="bk-mode-tag">TIME'S UP</div>
                    <h2>You scored ${score}.</h2>
                    <p>Streak peak doesn't save you now.<br>The clock always wins.</p>
                    <button class="bk-start-btn" id="bk-retry-btn"><span>RETRY</span></button>
                </div>`;
            document.getElementById('bk-retry-btn')
                .addEventListener('click', startGame);
        }
    }

    // ── Questions readiness ───────────────────────────────────
    function init() {
        if (!startBtn) return;
        startBtn.addEventListener('click', startGame);

        // Sidebar play button support
        const sidebarBtn = document.getElementById('sidebar-play-btn');
        if (sidebarBtn) {
            sidebarBtn.addEventListener('click', function () {
                if (!gameActive && overlay && !overlay.classList.contains('hidden')) {
                    startGame();
                }
            });
        }
    }

    if (window.questionsLoaded) {
        init();
    } else {
        window.addEventListener('questionsReady', init);
    }

})();
