/* ============================================================
   QUESTIONS.JS  (v3 — file:// compatible, HTML-safe)
   Loads questions without fetch() so it works when opening
   HTML files directly from disk (no local server needed).

   ── SETUP ──────────────────────────────────────────────────
   Your questions1000.js should wrap its content like this:

       window.QUESTION_BANK_RAW = `
       What is the chemical symbol for gold?|*Au|Ag|Fe|Cu
       Which tag defines a paragraph?|*<p>|<div>|<span>|<br>
       `;

   Rules for each line:
     • Fields separated by a pipe  |
     • The correct answer is prefixed with  *
     • Lines starting with  #  are comments (ignored)
     • Blank lines are ignored
     • HTML characters like < > & are escaped automatically —
       no need to manually write &lt; in your question file.

   ── ALTERNATIVELY (if using VS Code Live Server) ───────────
   Keep questions1000.txt as-is — fetch() works fine through
   Live Server. Right-click your HTML → Open with Live Server.
   ============================================================ */

window.QUESTION_BANK = [];
window.questionsLoaded = false;

(function () {
    'use strict';

    // ── HTML escaper ──────────────────────────────────────────
    // Prevents <tag> answers from being swallowed by the browser
    // when injected via innerHTML in the game scripts.
    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ── Parser ────────────────────────────────────────────────
    function parse(text) {
        var bank = [];
        var lines = text.split(/\r?\n/);

        lines.forEach(function (raw, lineNum) {
            var line = raw.trim();
            if (!line || line.startsWith('#')) return;

            var parts = line.split('|');
            if (parts.length < 3) {
                console.warn('[questions.js] Line ' + (lineNum + 1) + ' skipped — needs question + at least 2 answers.');
                return;
            }

            // Escape the question text
            var q = escapeHtml(parts[0].trim());

            // Process answers: strip *, escape HTML, track correct index
            var answers = parts.slice(1).map(function (a) { return a.trim(); });

            var correctIndex = -1;
            var cleanAnswers = answers.map(function (a, i) {
                var isCorrect = a.startsWith('*');
                if (isCorrect) {
                    correctIndex = i;
                    a = a.slice(1);  // strip the * prefix
                }
                return escapeHtml(a);
            });

            if (correctIndex === -1) {
                console.warn('[questions.js] Line ' + (lineNum + 1) + ' skipped — no answer marked with *.');
                return;
            }

            bank.push({ q: q, a: cleanAnswers, correct: correctIndex });
        });

        return bank;
    }

    function finish(bank) {
        window.QUESTION_BANK = bank;
        window.questionsLoaded = true;
        if (bank.length === 0) {
            console.warn('[questions.js] Loaded 0 questions — check your file format.');
        } else {
            console.log('[questions.js] Loaded ' + bank.length + ' questions.');
        }
        window.dispatchEvent(new Event('questionsReady'));
    }

    // ── PATH 1: <script> tag injection (works on file://) ─────
    function loadViaScriptTag() {
        var script = document.createElement('script');
        script.src = 'questions1000.js';

        script.onload = function () {
            if (typeof window.QUESTION_BANK_RAW === 'string') {
                finish(parse(window.QUESTION_BANK_RAW));
            } else {
                console.warn(
                    '[questions.js] questions1000.js loaded but window.QUESTION_BANK_RAW was not set.\n' +
                    'Wrap your question lines inside:\n' +
                    '  window.QUESTION_BANK_RAW = `...your questions...`;'
                );
                finish([]);
            }
        };

        script.onerror = function () {
            console.warn('[questions.js] questions1000.js not found. Falling back to fetch on questions1000.txt...');
            loadViaFetch();
        };

        document.head.appendChild(script);
    }

    // ── PATH 2: fetch fallback (works on Live Server / hosted) ─
    function loadViaFetch() {
        fetch('questions1000.txt')
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function (text) {
                finish(parse(text));
            })
            .catch(function (err) {
                console.error(
                    '[questions.js] Could not load questions.\n\n' +
                    'You are likely opening the HTML file directly from disk (file:// protocol).\n\n' +
                    'FIX A — Make sure questions1000.js exists and wraps content like:\n' +
                    '  window.QUESTION_BANK_RAW = `...your questions...`;\n\n' +
                    'FIX B — Use VS Code Live Server:\n' +
                    '  Right-click your HTML → Open with Live Server\n\n' +
                    'Error: ' + err
                );
                finish([]);
            });
    }

    // ── Start ─────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadViaScriptTag);
    } else {
        loadViaScriptTag();
    }

})();