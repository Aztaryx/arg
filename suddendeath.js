/* ============================================================
   SUDDEN DEATH — suddendeath.js
   No timer. No meter. One wrong answer ends everything.
   Requires: questions.js loaded before this script.
   ============================================================ */

(function () {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    const SONGS = [
        { file: 'playlist/SUDDEN DEATH/sd1.mp3', title: 'A Delightful New Death',    artist: 'Digital Descendant' },
        { file: 'playlist/SUDDEN DEATH/sd2.mp3', title: 'Fried Calamari (remix)',     artist: 'Aden Mayo'          },
        { file: 'playlist/SUDDEN DEATH/sd3.mp3', title: 'More than Glaggle Life',     artist: 'raleigh.'           },
    ];

    // ── State ─────────────────────────────────────────────────
    let audio      = null;
    let deck       = [];
    let deckIdx    = 0;
    let depth      = 0;   // questions answered correctly in a row
    let locked     = false;
    let gameActive = false;

    // ── DOM refs ──────────────────────────────────────────────
    const overlay  = document.getElementById('sd-overlay');
    const startBtn = document.getElementById('sd-start-btn');
    const elDepth  = document.getElementById('sd-depth');
    const elSong   = document.getElementById('sd-song');
    const elQNum   = document.getElementById('sd-q-num');
    const elQ      = document.getElementById('sd-question');
    const elAns    = document.getElementById('sd-answers');

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

    // ── Music ─────────────────────────────────────────────────
    function playRandomSong() {
        if (audio) { audio.pause(); audio = null; }
        const song = SONGS[Math.floor(Math.random() * SONGS.length)];
        audio = new Audio(song.file);
        audio.volume = 0.55;
        audio.play().catch(() => {});
        audio.addEventListener('ended', function () {
            if (gameActive) playRandomSong();
        });
        if (elSong) elSong.textContent = `♪  ${song.title} — ${song.artist}`;
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
        if (elQ)    elQ.textContent    = q.q;

        const pairs    = q.a.map((text, i) => ({ text, correct: i === q.correct }));
        const shuffled = shuffle(pairs);

        if (elAns) {
            elAns.innerHTML = '';
            shuffled.forEach(function (opt) {
                const btn = document.createElement('button');
                btn.className = 'sd-ans';
                btn.innerHTML = `<span>${opt.text}</span>`;
                btn.addEventListener('click', function () {
                    handleAnswer(opt.correct, btn, shuffled);
                });
                elAns.appendChild(btn);
            });
        }
    }

    function handleAnswer(correct, clicked, opts) {
        if (locked || !gameActive) return;
        locked = true;

        const allBtns = elAns ? elAns.querySelectorAll('.sd-ans') : [];

        opts.forEach(function (opt, i) {
            if (opt.correct && allBtns[i]) allBtns[i].classList.add('sd-correct');
        });

        if (correct) {
            clicked.classList.add('sd-correct');
            depth++;
            if (elDepth) elDepth.textContent = depth;
            setTimeout(nextQuestion, 700);
        } else {
            clicked.classList.add('sd-wrong');
            document.body.classList.add('sd-flash-wrong');
            setTimeout(function () {
                document.body.classList.remove('sd-flash-wrong');
                endGame();
            }, 600);
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

        if (elDepth)  elDepth.textContent  = '0';
        if (overlay)  overlay.classList.add('hidden');

        playRandomSong();
        nextQuestion();
    }

    function endGame() {
        gameActive = false;
        if (audio) { audio.pause(); audio = null; }

        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.innerHTML = `
                <div class="sd-overlay-box">
                    <div class="sd-mode-tag">ELIMINATED</div>
                    <h2>You reached #${depth}.</h2>
                    <p>One wrong answer.<br>That's all it takes.</p>
                    <button class="sd-start-btn" id="sd-retry-btn"><span>TRY AGAIN</span></button>
                </div>`;
            document.getElementById('sd-retry-btn')
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
