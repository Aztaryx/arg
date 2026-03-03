/* ============================================================
   QUESTIONS.JS
   Fetches and parses questions1000.txt into QUESTION_BANK.
   Fires a 'questionsReady' event on window when done.
   All game scripts listen for this before starting.

   ── TEXT FILE FORMAT (questions1000.txt) ─────────────────────
   One question per line. Fields separated by pipe (|).
   The correct answer is prefixed with an asterisk (*).

   Example:
       What is the chemical symbol for gold?|*Au|Ag|Fe|Cu
       Who wrote Hamlet?|*Shakespeare|Dickens|Austen|Tolstoy

   Rules:
     • Lines starting with # are comments and are ignored.
     • Blank lines are ignored.
     • Exactly one answer per question must have the * prefix.
     • Answer order doesn't matter — they are shuffled at runtime.
     • A question must have at least 2 answers (including the correct one).
   ─────────────────────────────────────────────────────────────
   ============================================================ */

window.QUESTION_BANK = [];
window.questionsLoaded = false;

(function () {
    'use strict';

    const SOURCE = 'questions1000.txt';

    // ── Parser ────────────────────────────────────────────────
    function parse(text) {
        const bank = [];
        const lines = text.split(/\r?\n/);

        lines.forEach(function (raw, lineNum) {
            const line = raw.trim();
            if (!line || line.startsWith('#')) return;

            const parts = line.split('|');
            if (parts.length < 3) {
                console.warn(`[questions.js] Line ${lineNum + 1} skipped — needs at least question + 2 answers.`);
                return;
            }

            const q = parts[0].trim();
            const answers = parts.slice(1).map(function (a) { return a.trim(); });

            // Find the correct answer (prefixed with *)
            let correctIndex = -1;
            const cleanAnswers = answers.map(function (a, i) {
                if (a.startsWith('*')) {
                    correctIndex = i;
                    return a.slice(1);   // strip the * prefix
                }
                return a;
            });

            if (correctIndex === -1) {
                console.warn(`[questions.js] Line ${lineNum + 1} skipped — no answer marked with *.`);
                return;
            }

            bank.push({
                q:       q,
                a:       cleanAnswers,
                correct: correctIndex,
            });
        });

        return bank;
    }

    // ── Fetch ─────────────────────────────────────────────────
    fetch(SOURCE)
        .then(function (res) {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
        })
        .then(function (text) {
            window.QUESTION_BANK  = parse(text);
            window.questionsLoaded = true;

            if (window.QUESTION_BANK.length === 0) {
                console.warn('[questions.js] Parsed 0 questions. Check the file format.');
            } else {
                console.log(`[questions.js] Loaded ${window.QUESTION_BANK.length} questions.`);
            }

            window.dispatchEvent(new Event('questionsReady'));
        })
        .catch(function (err) {
            console.error('[questions.js] Failed to load questions:', err);
            // Fire the event anyway so games can show a friendly error
            window.dispatchEvent(new Event('questionsReady'));
        });

})();
