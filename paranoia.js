/* ============================================================
   PARANOIA — paranoia.js
   Two cards. One real question. Five Acts.
   Requires: questions.js loaded before this script.
   ============================================================ */

(function () {
    'use strict';

    // ── Config ────────────────────────────────────────────────
    const SONGS = [
        { file: 'para1', title: 'SPEAK NO EVIL — szymon227g' },
    ];

    const MAX_SANITY = 100;
    const SANITY_WRONG_CARD = 25;  // chose the decoy card
    const SANITY_WRONG_ANSWER = 15;  // chose right card, wrong answer
    const SANITY_RECOVER = 5;   // correct answer recovery
    const SANITY_HESITATE_INC = 0.4; // per second of no input
    const QUESTIONS_PER_ACT = 5;

    const ACT_LABELS = [
        'ACT 1 — Learn the rules.',
        'ACT 2 — The screen fights back.',
        'ACT 3 — More noise, more questions.',
        'ACT 4 — Everything lies.',
        'ACT 5 — Good luck.',
    ];

    // Per-act hesitation multiplier (how fast the meter climbs)
    const ACT_HESITATE_MULT = [1, 1.4, 1.8, 2.2, 3.0];

    // ── State ─────────────────────────────────────────────────
    let sanity = 0;
    let act = 0;       // 0-indexed
    let questionsInAct = 0;
    let correctCard = 'a';     // 'a' or 'b'
    let usedIndices = new Set();
    let hesitateId = null;
    let audio = null;
    let gameActive = false;
    let locked = false;

    // ── DOM refs ──────────────────────────────────────────────
    const overlay = document.getElementById('pn-overlay');
    const startBtn = document.getElementById('pn-start-btn');
    const elMeterFill = document.getElementById('pn-meter-fill');
    const elMeterPct = document.getElementById('pn-meter-pct');
    const elActLabel = document.getElementById('pn-act-label');
    const pips = document.querySelectorAll('.pn-pip');
    const cardA = document.getElementById('pn-card-a');
    const cardB = document.getElementById('pn-card-b');
    const qA = cardA.querySelector('.pn-question');
    const qB = cardB.querySelector('.pn-question');
    const btnA = cardA.querySelector('.pn-ans-btn');
    const btnB = cardB.querySelector('.pn-ans-btn');

    // ── Helpers ───────────────────────────────────────────────
    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function getQuestion(excludeIdx = -1) {
        if (usedIndices.size >= QUESTION_BANK.length) usedIndices.clear();
        let idx;
        do { idx = Math.floor(Math.random() * QUESTION_BANK.length); }
        while (usedIndices.has(idx) || idx === excludeIdx);
        usedIndices.add(idx);
        return { idx, ...QUESTION_BANK[idx] };
    }

    // ── Sanity meter ──────────────────────────────────────────
    function setSanity(val) {
        sanity = Math.max(0, Math.min(MAX_SANITY, val));
        elMeterFill.style.height = `${sanity}%`;
        elMeterPct.textContent = `${Math.round(sanity)}%`;

        // Colour escalation
        if (sanity >= 75) {
            elMeterFill.style.background = 'linear-gradient(to top, #7b0000, #ff0000)';
        } else if (sanity >= 40) {
            elMeterFill.style.background = 'linear-gradient(to top, #c0392b, #e74c3c, #ff6b35)';
        } else {
            elMeterFill.style.background = 'linear-gradient(to top, #c0392b, #e74c3c, #ff6b35)';
        }

        if (sanity >= MAX_SANITY) endGame(false);
    }

    function startHesitateTimer() {
        stopHesitateTimer();
        hesitateId = setInterval(() => {
            if (!locked && gameActive) {
                setSanity(sanity + SANITY_HESITATE_INC * ACT_HESITATE_MULT[act]);
            }
        }, 1000);
    }

    function stopHesitateTimer() {
        if (hesitateId) { clearInterval(hesitateId); hesitateId = null; }
    }

    // ── Act management ────────────────────────────────────────
    function updateActUI() {
        elActLabel.textContent = ACT_LABELS[act];
        pips.forEach((pip, i) => {
            pip.classList.toggle('active', i === act);
            pip.classList.toggle('done', i < act);
        });

        // Remove old act classes
        document.body.classList.remove('pn-act1', 'pn-act2', 'pn-act3', 'pn-act4', 'pn-act5');
        document.body.classList.add(`pn-act${act + 1}`);
    }

    // ── Music ─────────────────────────────────────────────────
    function startMusic() {
        const song = SONGS[0];
        if (audio) { audio.pause(); audio = null; }
        audio = new Audio(`playlist/PARANOIA/${song.file}.mp3`);
        audio.loop = true;
        audio.volume = 0.55;
        audio.play().catch(() => { });
    }

    // ── Questions ─────────────────────────────────────────────
    function loadRound() {
        if (!gameActive) return;
        locked = false;

        const realQ = getQuestion();
        const fakeQ = getQuestion(realQ.idx);

        // Shuffle real question's answers
        const realPairs = realQ.a.map((text, i) => ({ text, isCorrect: i === realQ.correct }));
        const realShuffled = shuffle(realPairs);

        // Fake question's answers (all wrong — choosing this card is the mistake)
        const fakePairs = fakeQ.a.map((text) => ({ text, isCorrect: false }));
        const fakeShuffled = shuffle(fakePairs);

        // Randomly decide which card is real
        correctCard = Math.random() < 0.5 ? 'a' : 'b';

        const realCard = correctCard === 'a' ? cardA : cardB;
        const fakeCard = correctCard === 'a' ? cardB : cardA;
        const realQ_el = correctCard === 'a' ? qA : qB;
        const fakeQ_el = correctCard === 'a' ? qB : qA;
        const realBtn = correctCard === 'a' ? btnA : btnB;
        const fakeBtn = correctCard === 'a' ? btnB : btnA;

        // Populate real card
        realQ_el.textContent = realQ.q;
        realCard.dataset.isReal = '1';
        realCard.dataset.shuffled = JSON.stringify(realShuffled);

        // Populate fake card
        fakeQ_el.textContent = fakeQ.q;
        fakeCard.dataset.isReal = '0';

        // Store correct answer index on real card's button
        realBtn.dataset.hasAnswers = '1';
        fakeBtn.dataset.hasAnswers = '0';

        // Reset card styles
        [cardA, cardB].forEach(c => {
            c.style.borderColor = '';
            c.style.opacity = '1';
        });
        [btnA, btnB].forEach(b => {
            b.style.background = '';
            b.style.borderColor = '';
        });

        startHesitateTimer();

        // ACT 4: occasionally briefly swap card positions as distraction
        if (act >= 3 && Math.random() < 0.4) {
            setTimeout(() => {
                if (!locked && gameActive) swapCardAppearance();
            }, 800 + Math.random() * 1200);
        }
    }

    // Act 4 visual trick: briefly swap the card border glows
    let swapped = false;
    function swapCardAppearance() {
        if (locked) return;
        swapped = !swapped;
        if (swapped) {
            cardA.style.boxShadow = '0 0 20px rgba(247,215,78,0.3)';
            cardB.style.boxShadow = '0 0 20px rgba(247,215,78,0.3)';
        } else {
            cardA.style.boxShadow = '';
            cardB.style.boxShadow = '';
        }
    }

    // ── Answer handling ───────────────────────────────────────
    function handleCardClick(card, btn) {
        if (locked || !gameActive) return;

        const isRealCard = card.dataset.isReal === '1';

        if (!isRealCard) {
            // Chose the decoy card — big surge
            locked = true;
            stopHesitateTimer();
            card.style.borderColor = '#ff2a2a';
            card.style.boxShadow = '0 0 24px rgba(255,42,42,0.5)';
            setSanity(sanity + SANITY_WRONG_CARD);

            setTimeout(() => {
                card.style.borderColor = '';
                card.style.boxShadow = '';
                if (gameActive) loadRound();
            }, 800);
            return;
        }

        // Correct card — open answer selection UI
        if (btn.dataset.hasAnswers !== '1') return;
        if (btn.dataset.answering === '1') return;

        // Replace button with full answer grid
        showAnswers(card, btn);
    }

    function showAnswers(card, btn) {
        const shuffled = JSON.parse(card.dataset.shuffled);
        stopHesitateTimer();

        // Build inline answer grid inside the card
        const grid = document.createElement('div');
        grid.className = 'pn-answer-grid';
        grid.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 12px;
            width: 100%;
        `;

        shuffled.forEach(opt => {
            const ab = document.createElement('button');
            ab.className = 'pn-ans-btn pn-inline-ans';
            ab.innerHTML = `<span>${opt.text}</span>`;
            ab.style.fontSize = '0.75rem';
            ab.style.padding = '8px 12px';
            ab.addEventListener('click', (e) => {
                e.stopPropagation();
                resolveAnswer(opt.isCorrect, card, grid);
            });
            grid.appendChild(ab);
        });

        btn.style.display = 'none';
        card.appendChild(grid);
        startHesitateTimer(); // hesitation still counts while picking answer
    }

    function resolveAnswer(isCorrect, card, grid) {
        if (locked) return;
        locked = true;
        stopHesitateTimer();

        if (isCorrect) {
            card.style.borderColor = '#4dff91';
            card.style.boxShadow = '0 0 20px rgba(77,255,145,0.3)';
            setSanity(sanity - SANITY_RECOVER);
            questionsInAct++;
        } else {
            card.style.borderColor = '#ff4d4d';
            card.style.boxShadow = '0 0 20px rgba(255,77,77,0.3)';
            setSanity(sanity + SANITY_WRONG_ANSWER);
        }

        setTimeout(() => {
            // Clean up answer grid
            if (grid.parentNode) grid.parentNode.removeChild(grid);
            card.style.borderColor = '';
            card.style.boxShadow = '';
            const origBtn = card.querySelector('.pn-ans-btn');
            if (origBtn) origBtn.style.display = '';

            // Check act progression
            if (questionsInAct >= QUESTIONS_PER_ACT && act < 4) {
                act++;
                questionsInAct = 0;
                updateActUI();
                showActTransition(() => { if (gameActive) loadRound(); });
            } else if (questionsInAct >= QUESTIONS_PER_ACT && act === 4) {
                endGame(true);
            } else {
                if (gameActive) loadRound();
            }
        }, 700);
    }

    // ── Act transition banner ─────────────────────────────────
    function showActTransition(cb) {
        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(3,8,15,0.92);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            z-index: 700;
            animation: blurFadeIn 0.5s ease-out;
        `;
        banner.innerHTML = `
            <div style="font-family:Montserrat,sans-serif;font-size:0.65rem;font-weight:900;
                        letter-spacing:0.26em;color:#2a5cc7;text-transform:uppercase;margin-bottom:14px;">
                ENTERING
            </div>
            <div style="font-family:Montserrat,sans-serif;font-size:2.4rem;font-weight:800;
                        color:#f7d74e;text-shadow:0 0 24px rgba(247,215,78,0.4);letter-spacing:-0.02em;">
                ${ACT_LABELS[act]}
            </div>
        `;
        document.body.appendChild(banner);
        setTimeout(() => {
            banner.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => {
                if (banner.parentNode) banner.parentNode.removeChild(banner);
                cb();
            }, 500);
        }, 1400);
    }

    // ── Game lifecycle ────────────────────────────────────────
    function startGame() {
        overlay.classList.add('hidden');
        sanity = 0;
        act = 0;
        questionsInAct = 0;
        usedIndices.clear();
        locked = false;
        gameActive = true;

        setSanity(0);
        updateActUI();
        startMusic();
        loadRound();
    }

    function endGame(won) {
        gameActive = false;
        locked = true;
        stopHesitateTimer();
        if (audio) { audio.pause(); audio = null; }

        let goOverlay = document.getElementById('pn-gameover');
        if (!goOverlay) {
            goOverlay = document.createElement('div');
            goOverlay.id = 'pn-gameover';
            goOverlay.className = 'pn-overlay';
            document.body.appendChild(goOverlay);
            goOverlay.addEventListener('click', (e) => {
                if (e.target.id === 'pn-retry-btn' || e.target.closest('#pn-retry-btn')) {
                    goOverlay.classList.add('hidden');
                    startGame();
                }
            });
        }

        goOverlay.innerHTML = `
            <div class="pn-overlay-box">
                <div class="pn-mode-tag">${won ? 'YOU SURVIVED' : 'CRACKED'}</div>
                <h2>${won ? 'All five Acts cleared.' : 'Sanity lost.'}</h2>
                <p>${won
                ? 'You kept your cool through everything.<br>Impressive.'
                : `You made it to <strong>${ACT_LABELS[act]}</strong><br>before the meter hit 100%.`
            }</p>
                <button class="pn-start-btn" id="pn-retry-btn"><span>TRY AGAIN</span></button>
            </div>`;
        goOverlay.classList.remove('hidden');
    }

    // ── Event listeners ───────────────────────────────────────
    startBtn.addEventListener('click', startGame);

    cardA.addEventListener('click', () => handleCardClick(cardA, btnA));
    cardB.addEventListener('click', () => handleCardClick(cardB, btnB));

    // Prevent card click from firing when answer buttons inside are clicked
    btnA.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCardClick(cardA, btnA);
    });
    btnB.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCardClick(cardB, btnB);
    });

})();