/* ============================================================
   BLACKOUT — blackout.js
   5 seconds to read the question. Then the lights go out.
   The answers remain. You'd better have been paying attention.
   One wrong answer ends the run (Sudden Death rules apply).
   Requires: questions.js loaded before this script.
   ============================================================ */

(function () {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    const SONGS = [
        { file: 'playlist/BLACKOUT/blackout1.mp3', title: 'OFF WITH YOUR HEAD', artist: 'szymon227g' },
    ];

    const READ_TIME = 5;  // seconds the question is visible

    // ── State ─────────────────────────────────────────────────
    let audio = null;
    let deck = [];
    let deckIdx = 0;
    let depth = 0;
    let locked = false;
    let gameActive = false;
    let readTimerId = null;
    let countdownId = null;

    // ── DOM refs ──────────────────────────────────────────────
    const overlay = document.getElementById('bo-overlay');
    const startBtn = document.getElementById('bo-start-btn');
    const elDepth = document.getElementById('bo-depth');
    const elQNum = document.getElementById('bo-q-num');
    const elQuestion = document.getElementById('bo-question');
    const elCountdown = document.getElementById('bo-countdown');
    const elAnswers = document.getElementById('bo-answers');

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

    function clearTimers() {
        clearTimeout(readTimerId);
        clearInterval(countdownId);
        readTimerId = countdownId = null;
    }

    // ── Music ─────────────────────────────────────────────────
    function startMusic() {
        if (audio) { audio.pause(); audio = null; }
        const song = SONGS[0];
        audio = new Audio(song.file);
        audio.volume = 0.55;
        audio.loop = true;
        audio.play().catch(() => { });
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

        if (elQNum) elQNum.textContent = `#${depth + 1}`;
        if (elQuestion) {
            elQuestion.textContent = q.q;
            elQuestion.classList.remove('blacked-out');
        }

        // Shuffle answers
        const pairs = q.a.map((text, i) => ({ text, correct: i === q.correct }));
        const shuffled = shuffle(pairs);

        if (elAnswers) {
            elAnswers.innerHTML = '';
            shuffled.forEach(function (opt) {
                const btn = document.createElement('button');
                btn.className = 'bo-ans';
                btn.innerHTML = `<span>${opt.text}</span>`;
                btn.addEventListener('click', function () {
                    handleAnswer(opt.correct, btn, shuffled);
                });
                elAnswers.appendChild(btn);
            });
        }

        // Countdown display
        let timeLeft = READ_TIME;
        if (elCountdown) {
            elCountdown.textContent = timeLeft;
            elCountdown.classList.remove('bo-countdown-urgent');
        }

        clearTimers();

        countdownId = setInterval(function () {
            timeLeft--;
            if (elCountdown) {
                elCountdown.textContent = timeLeft;
                if (timeLeft <= 2) elCountdown.classList.add('bo-countdown-urgent');
            }
            if (timeLeft <= 0) clearInterval(countdownId);
        }, 1000);

        // After READ_TIME: black out the question
        readTimerId = setTimeout(function () {
            if (elQuestion) elQuestion.classList.add('blacked-out');
            if (elCountdown) {
                elCountdown.textContent = '✕';
                elCountdown.classList.add('bo-countdown-urgent');
            }
        }, READ_TIME * 1000);
    }

    function handleAnswer(correct, clicked, opts) {
        if (locked || !gameActive) return;
        locked = true;
        clearTimers();

        const allBtns = elAnswers ? elAnswers.querySelectorAll('.bo-ans') : [];

        // Reveal correct answer regardless
        opts.forEach(function (opt, i) {
            if (opt.correct && allBtns[i]) allBtns[i].classList.add('bo-correct');
        });

        if (correct) {
            clicked.classList.add('bo-correct');
            depth++;
            if (elDepth) elDepth.textContent = depth;
            // Restore question text briefly before next question
            if (elQuestion) elQuestion.classList.remove('blacked-out');
            setTimeout(nextQuestion, 750);
        } else {
            clicked.classList.add('bo-wrong');
            // Reveal the question text so they see what they got wrong
            if (elQuestion) elQuestion.classList.remove('blacked-out');
            document.body.classList.add('bo-flash-wrong');
            setTimeout(function () {
                document.body.classList.remove('bo-flash-wrong');
                endGame();
            }, 700);
        }
    }

    // ── Game lifecycle ────────────────────────────────────────
    function startGame() {
        if (noQuestions()) {
            alert('No questions loaded yet. Check questions1000.txt.');
            return;
        }

        depth = deckIdx = 0;
        locked = false;
        gameActive = true;
        deck = buildDeck();

        if (elDepth) elDepth.textContent = '0';
        if (overlay) overlay.classList.add('hidden');
        if (elQuestion) elQuestion.classList.remove('blacked-out');

        startMusic();
        nextQuestion();
    }

    function endGame() {
        gameActive = false;
        clearTimers();
        if (audio) { audio.pause(); audio = null; }

        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <div class="bo-overlay-box">
                    <div class="bo-mode-tag">LIGHTS OUT</div>
                    <h2>You reached #${depth}.</h2>
                    <p>Should've read faster.</p>
                    <button class="bo-start-btn" id="bo-retry-btn"><span>RETRY</span></button>
                </div>`;
            document.getElementById('bo-retry-btn')
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
