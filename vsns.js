/* ============================================================
   VSNS.JS — Visualizer Setup & Settings
   Handles: playlist, audio player, BPM tap/metronome,
            lap timer (synced to audio), frequency band mapper,
            visualizer preview (real audio or sim signal)
   ============================================================ */
(function () {
    'use strict';

    // ── Placeholder Playlist ─────────────────────────────────
    // Replace title / artist / file once real tracks are confirmed.
    const SONGS = [
        { file: 'playlist/BLITZKRIEG/blitzkrieg1.mp3', title: 'Track 1', artist: '—' },
        { file: 'playlist/BLITZKRIEG/blitzkrieg2.mp3', title: 'Track 2', artist: '—' },
        { file: 'playlist/BLITZKRIEG/blitzkrieg3.mp3', title: 'Track 3', artist: '—' },
        { file: 'playlist/BLITZKRIEG/blitzkrieg4.mp3', title: 'Track 4', artist: '—' },
        { file: 'playlist/BLITZKRIEG/blitzkrieg5.mp3', title: 'Track 5', artist: '—' },
        { file: 'playlist/BLITZKRIEG/blitzkrieg6.mp3', title: 'Track 6', artist: '—' },
    ];

    // ── Audio Engine ──────────────────────────────────────────
    let audioEl = null;
    let audioCtx = null;
    let audioSrc = null;
    let analyser = null;
    let audioLoaded = false;
    let seekDragging = false;

    // ── Frequency conversion constants ────────────────────────
    // Must be defined before getDefaultBands() / configs init.
    const FREQ_MIN = 20;
    const FREQ_MAX = 8000;  // cut off above 8kHz — signal is dead past here
    const FREQ_RATIO = FREQ_MAX / FREQ_MIN;

    function hzToNorm(hz) {
        return Math.log(Math.max(hz, FREQ_MIN) / FREQ_MIN) / Math.log(FREQ_RATIO);
    }
    function normToHz(norm) {
        return Math.round(FREQ_MIN * Math.pow(FREQ_RATIO, Math.max(0, Math.min(1, norm))));
    }
    function fmtHz(hz) {
        return hz >= 1000 ? (hz / 1000).toFixed(1) + 'kHz' : hz + 'Hz';
    }
    function binToNorm(binIdx, totalBins) {
        const NYQUIST = 22050;
        const hz = Math.max(FREQ_MIN, (binIdx / totalBins) * NYQUIST);
        return Math.min(1, Math.log(hz / FREQ_MIN) / Math.log(FREQ_RATIO));
    }
    function fmtHz(hz) {
        return hz >= 1000 ? (hz / 1000).toFixed(1) + 'kHz' : hz + 'Hz';
    }

    // ── Per-track config storage ─────────────────────────────
    // Keyed by song index. Each entry:
    // {
    //   bpm: number,
    //   marks: [ { time: ms, label: string }, ... ],
    //   bands: [ { name, color, lo, hi, strength }, ... ],
    //   notes: string,
    //   visMode: string,
    //   visColor: string,
    //   visPeakColor: string,
    // }
    let configs = SONGS.map(() => ({
        bpm: null,
        marks: [],
        bands: getDefaultBands(),
        notes: '',
        visMode: 'bottom',
        visColor: '#f7e84e',
        visPeakColor: '#ffffff',
    }));

    let activeTrack = 0;

    // ────────────────────────────────────────────────────────
    // SECTION 1 — PLAYLIST
    // ────────────────────────────────────────────────────────

    function buildTrackList() {
        const list = document.getElementById('vsns-track-list');
        list.innerHTML = '';
        SONGS.forEach((s, i) => {
            const el = document.createElement('div');
            el.className = 'vsns-track-item' + (i === activeTrack ? ' active' : '');
            el.innerHTML = `<span class="track-title">${s.title}</span>
                            <span class="track-artist">${s.artist}</span>`;
            el.addEventListener('click', () => selectTrack(i));
            list.appendChild(el);
        });
    }

    function selectTrack(i) {
        saveCurrentTrackUI();
        activeTrack = i;
        buildTrackList();
        loadTrackUI();
        setStatus(`TRACK ${i + 1}: ${SONGS[i].title.toUpperCase()}`);
    }

    function setStatus(text, loaded = true) {
        const el = document.getElementById('vsns-status');
        el.textContent = text;
        el.classList.toggle('loaded', loaded);
    }

    // ────────────────────────────────────────────────────────
    // SECTION 2 — LOAD UI / SAVE UI
    // ────────────────────────────────────────────────────────

    function loadTrackUI() {
        const cfg = configs[activeTrack];

        // BPM
        if (cfg.bpm) {
            document.getElementById('bpm-display').textContent = cfg.bpm;
            document.getElementById('metro-bpm-input').value = cfg.bpm;
        } else {
            document.getElementById('bpm-display').textContent = '--';
        }

        // Marks
        renderMarks();

        // Bands
        renderBands();

        // Notes
        const notesLabel = document.getElementById('notes-track-label');
        notesLabel.textContent = `Editing: ${SONGS[activeTrack].title}`;
        document.getElementById('notes-textarea').value = cfg.notes || '';

        // Vis settings
        const visMode = cfg.visMode || 'bottom';
        document.querySelectorAll('.vis-mode-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === visMode);
        });
        activeVisMode = visMode;

        document.getElementById('vis-color').value = cfg.visColor || '#f7e84e';
        document.getElementById('vis-peak-color').value = cfg.visPeakColor || '#ffffff';
    }

    function saveCurrentTrackUI() {
        const cfg = configs[activeTrack];
        const bpmVal = parseInt(document.getElementById('metro-bpm-input').value, 10);
        if (!isNaN(bpmVal)) cfg.bpm = bpmVal;
        cfg.notes = document.getElementById('notes-textarea').value;
        cfg.visMode = activeVisMode;
        cfg.visColor = document.getElementById('vis-color').value;
        cfg.visPeakColor = document.getElementById('vis-peak-color').value;
    }

    // ────────────────────────────────────────────────────────
    // SECTION 3 — TABS
    // ────────────────────────────────────────────────────────

    document.querySelectorAll('.vsns-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.vsns-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.vsns-tabpanel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        });
    });

    // ────────────────────────────────────────────────────────
    // SECTION 4 — BPM TAP COUNTER
    // ────────────────────────────────────────────────────────

    let tapTimes = [];
    const TAP_WINDOW = 3000; // ms — taps older than this reset the streak

    document.getElementById('bpm-tap-btn').addEventListener('click', handleTap);
    document.getElementById('bpm-tap-btn').addEventListener('keydown', e => {
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); handleTap(); }
    });

    document.addEventListener('keydown', e => {
        if (e.code === 'Space' && document.activeElement === document.getElementById('bpm-tap-btn')) return;
        if (e.code === 'KeyT' && document.getElementById('tab-bpm').classList.contains('active')) {
            e.preventDefault();
            handleTap();
        }
    });

    function handleTap() {
        const now = performance.now();
        // Remove stale taps
        tapTimes = tapTimes.filter(t => now - t < TAP_WINDOW);
        tapTimes.push(now);

        const display = document.getElementById('bpm-display');
        const countEl = document.getElementById('bpm-tap-count');
        countEl.textContent = `Taps: ${tapTimes.length}`;

        if (tapTimes.length < 2) {
            display.textContent = '--';
            return;
        }

        // Average interval
        let totalInterval = 0;
        for (let i = 1; i < tapTimes.length; i++) totalInterval += tapTimes[i] - tapTimes[i - 1];
        const avgInterval = totalInterval / (tapTimes.length - 1);
        const bpm = Math.round(60000 / avgInterval);

        display.textContent = bpm;
        document.getElementById('metro-bpm-input').value = bpm;
        configs[activeTrack].bpm = bpm;

        // Flash the tap button
        const btn = document.getElementById('bpm-tap-btn');
        btn.style.background = 'var(--yellow)';
        btn.style.color = '#000';
        setTimeout(() => { btn.style.background = ''; btn.style.color = ''; }, 80);
    }

    document.getElementById('bpm-reset-btn').addEventListener('click', () => {
        tapTimes = [];
        document.getElementById('bpm-display').textContent = '--';
        document.getElementById('bpm-tap-count').textContent = 'Taps: 0';
        configs[activeTrack].bpm = null;
    });

    // ────────────────────────────────────────────────────────
    // SECTION 5 — METRONOME
    // ────────────────────────────────────────────────────────

    let metroAudioCtx = null;
    let metroRunning = false;
    let metroNextBeat = 0;
    let metroBeatIdx = 0;
    let metroScheduleId = null;
    let metroTimeSig = 4;
    const METRO_LOOKAHEAD = 0.1;   // seconds
    const METRO_SCHEDULE_INTERVAL = 25; // ms

    function getMetroBPM() {
        return Math.max(20, Math.min(300, parseInt(document.getElementById('metro-bpm-input').value, 10) || 120));
    }

    function buildBeatRow() {
        const sig = parseInt(document.getElementById('metro-timesig').value, 10);
        metroTimeSig = sig;
        const row = document.getElementById('metro-beat-row');
        row.innerHTML = '';
        for (let i = 0; i < sig; i++) {
            const b = document.createElement('div');
            b.className = 'metro-beat' + (i === 0 ? ' accent' : '');
            b.id = `metro-beat-${i}`;
            b.textContent = i + 1;
            row.appendChild(b);
        }
    }

    document.getElementById('metro-timesig').addEventListener('change', () => {
        buildBeatRow();
        if (metroRunning) stopMetronome();
    });

    function startMetronome() {
        if (!metroAudioCtx) metroAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (metroAudioCtx.state === 'suspended') metroAudioCtx.resume();

        metroRunning = true;
        metroBeatIdx = 0;
        metroNextBeat = metroAudioCtx.currentTime + 0.05;
        document.getElementById('metro-start-btn').querySelector('span').textContent = 'STOP METRONOME';
        scheduleMetro();
    }

    function stopMetronome() {
        metroRunning = false;
        clearTimeout(metroScheduleId);
        document.getElementById('metro-start-btn').querySelector('span').textContent = 'START METRONOME';
        // Clear active beats
        document.querySelectorAll('.metro-beat').forEach(b => b.classList.remove('active'));
    }

    function scheduleMetro() {
        if (!metroRunning) return;

        const bpm = getMetroBPM();
        const interval = 60 / bpm;
        const vol = parseFloat(document.getElementById('metro-vol').value);

        while (metroNextBeat < metroAudioCtx.currentTime + METRO_LOOKAHEAD) {
            const isAccent = metroBeatIdx % metroTimeSig === 0;
            scheduleClick(metroNextBeat, isAccent, vol);
            scheduleBeatHighlight(metroNextBeat, metroBeatIdx % metroTimeSig);
            metroBeatIdx++;
            metroNextBeat += interval;
        }

        metroScheduleId = setTimeout(scheduleMetro, METRO_SCHEDULE_INTERVAL);
    }

    function scheduleClick(time, isAccent, vol) {
        const osc = metroAudioCtx.createOscillator();
        const gain = metroAudioCtx.createGain();
        osc.connect(gain);
        gain.connect(metroAudioCtx.destination);

        osc.frequency.value = isAccent ? 1100 : 800;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        osc.start(time);
        osc.stop(time + 0.05);
    }

    function scheduleBeatHighlight(time, beatIdx) {
        const delay = Math.max(0, (time - metroAudioCtx.currentTime) * 1000);
        setTimeout(() => {
            if (!metroRunning) return;
            document.querySelectorAll('.metro-beat').forEach((b, i) => {
                b.classList.toggle('active', i === beatIdx);
            });
        }, delay);
    }

    document.getElementById('metro-start-btn').addEventListener('click', () => {
        if (metroRunning) stopMetronome(); else startMetronome();
    });

    document.getElementById('metro-sync-btn').addEventListener('click', () => {
        const bpm = configs[activeTrack].bpm;
        if (bpm) {
            document.getElementById('metro-bpm-input').value = bpm;
            document.getElementById('bpm-display').textContent = bpm;
        }
    });

    // ────────────────────────────────────────────────────────
    // SECTION 6 — LAP TIMER
    // ────────────────────────────────────────────────────────

    let lapRunning = false;
    let lapStartTime = 0;
    let lapElapsed = 0;
    let lapRafId = null;
    let lapMarkCounter = 0;

    function formatLapTime(ms) {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        const msec = Math.floor(ms % 1000);
        return `${min}:${String(sec).padStart(2, '0')}.${String(msec).padStart(3, '0')}`;
    }

    function lapTick() {
        lapElapsed = performance.now() - lapStartTime;
        document.getElementById('lap-clock').textContent = formatLapTime(lapElapsed);
        if (lapRunning) lapRafId = requestAnimationFrame(lapTick);
    }

    function startLap() {
        lapStartTime = performance.now() - lapElapsed;
        lapRunning = true;
        lapRafId = requestAnimationFrame(lapTick);
        document.getElementById('lap-start-btn').querySelector('span').textContent = 'PAUSE';
        document.getElementById('lap-mark-btn').disabled = false;
    }

    function pauseLap() {
        lapRunning = false;
        cancelAnimationFrame(lapRafId);
        document.getElementById('lap-start-btn').querySelector('span').textContent = 'RESUME';
    }

    document.getElementById('lap-start-btn').addEventListener('click', () => {
        if (audioLoaded && audioEl) {
            // Delegate entirely to audio player when a file is loaded
            playerPlayPause.click();
        } else {
            if (lapRunning) pauseLap(); else startLap();
        }
    });

    document.getElementById('lap-mark-btn').addEventListener('click', addMark);

    document.addEventListener('keydown', e => {
        if (e.code === 'KeyM' && document.getElementById('tab-lap').classList.contains('active') && lapRunning) {
            e.preventDefault();
            addMark();
        }
    });

    function addMark() {
        const label = document.getElementById('lap-mark-label').value.trim() || 'mark';
        // Use audio position if available, otherwise use stopwatch
        const timeMs = audioLoaded && audioEl
            ? Math.round(audioEl.currentTime * 1000)
            : Math.round(lapElapsed);
        lapMarkCounter++;
        configs[activeTrack].marks.push({ id: lapMarkCounter, time: timeMs, label });
        renderMarks();
        // Flash clock
        const clk = document.getElementById('lap-clock');
        clk.style.color = '#ffffff';
        setTimeout(() => { clk.style.color = ''; }, 120);
    }

    function renderMarks() {
        const list = document.getElementById('lap-list');
        const marks = configs[activeTrack].marks;
        if (!marks.length) {
            list.innerHTML = '<div class="lap-empty">No marks yet. Start the timer and press MARK.</div>';
            return;
        }
        list.innerHTML = '';
        marks.forEach((m, i) => {
            const row = document.createElement('div');
            row.className = 'lap-mark-row';
            row.innerHTML = `<span class="lap-mark-idx">#${String(i + 1).padStart(3, '0')}</span>
                             <span class="lap-mark-time">${formatLapTime(m.time)}</span>
                             <span class="lap-mark-label-text">${escHtml(m.label)}</span>
                             <button class="lap-mark-del" data-id="${m.id}" title="Delete"><span>✕</span></button>`;
            list.appendChild(row);
        });
        list.querySelectorAll('.lap-mark-del').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id, 10);
                configs[activeTrack].marks = configs[activeTrack].marks.filter(m => m.id !== id);
                renderMarks();
            });
        });
        // Auto-scroll to bottom
        list.scrollTop = list.scrollHeight;
    }

    document.getElementById('lap-reset-btn').addEventListener('click', () => {
        if (audioLoaded && audioEl) {
            playerRewind.click();
        } else {
            lapRunning = false;
            cancelAnimationFrame(lapRafId);
            lapElapsed = 0;
            document.getElementById('lap-clock').textContent = '0:00.000';
            document.getElementById('lap-start-btn').querySelector('span').textContent = 'START';
            document.getElementById('lap-mark-btn').disabled = true;
        }
    });

    document.getElementById('lap-clear-btn').addEventListener('click', () => {
        configs[activeTrack].marks = [];
        lapMarkCounter = 0;
        renderMarks();
    });

    // ────────────────────────────────────────────────────────
    // SECTION 7 — FREQUENCY BAND MAPPER
    // ────────────────────────────────────────────────────────

    // Each band: { name, color, lo, hi, strength }
    // lo/hi are 0–1 (normalized across the freq canvas width = 20Hz–50kHz log scale)

    function getDefaultBands() {
        return [
            { name: 'Sub Bass', color: '#e84e4e', lo: hzToNorm(20), hi: hzToNorm(80) },
            { name: 'Bass / Kick', color: '#e87d2a', lo: hzToNorm(80), hi: hzToNorm(300) },
            { name: 'Low Mid', color: '#f7e84e', lo: hzToNorm(300), hi: hzToNorm(800) },
            { name: 'Vocals', color: '#7de84e', lo: hzToNorm(800), hi: hzToNorm(3000) },
            { name: 'Chiptune', color: '#4ebbe8', lo: hzToNorm(3000), hi: hzToNorm(7000) },
            { name: 'Highs', color: '#ae4ee8', lo: hzToNorm(7000), hi: hzToNorm(14000) },
        ];
    }

    const freqCanvas = document.getElementById('freq-canvas');
    const freqCtx = freqCanvas.getContext('2d');

    let freqDragState = null; // { bandIdx, edge: 'lo'|'hi'|'move', startX, startLo, startHi }

    function resizeFreqCanvas() {
        freqCanvas.width = freqCanvas.offsetWidth;
        drawFreqCanvas();
    }

    function hzLabel(norm) {
        const hz = normToHz(norm);
        return hz >= 1000 ? (hz / 1000).toFixed(1) + 'k' : hz + '';
    }

    function drawFreqCanvas() {
        const W = freqCanvas.width;
        const H = freqCanvas.height;
        freqCtx.clearRect(0, 0, W, H);

        // Background
        freqCtx.fillStyle = '#0a0a08';
        freqCtx.fillRect(0, 0, W, H);

        // Frequency grid lines
        freqCtx.strokeStyle = '#1e1e18';
        freqCtx.lineWidth = 1;
        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].forEach(t => {
            const x = Math.round(t * W) + 0.5;
            freqCtx.beginPath();
            freqCtx.moveTo(x, 0);
            freqCtx.lineTo(x, H);
            freqCtx.stroke();
        });

        const bands = configs[activeTrack].bands;

        // Draw bands
        bands.forEach((b, i) => {
            const x1 = b.lo * W;
            const x2 = b.hi * W;
            const bw = x2 - x1;
            const strength = b.strength || 0.7;

            // Fill
            const col = b.color || '#f7e84e';
            freqCtx.globalAlpha = 0.18 + strength * 0.22;
            freqCtx.fillStyle = col;
            freqCtx.fillRect(x1, 16, bw, H - 32);
            freqCtx.globalAlpha = 1;

            // Top bar (strength indicator)
            freqCtx.fillStyle = col;
            freqCtx.globalAlpha = 0.4 + strength * 0.5;
            freqCtx.fillRect(x1, 0, bw, 8);
            freqCtx.globalAlpha = 1;

            // Borders
            freqCtx.strokeStyle = col;
            freqCtx.lineWidth = 1.5;
            freqCtx.globalAlpha = 0.7;
            freqCtx.strokeRect(x1 + 0.75, 16, bw - 1.5, H - 32);
            freqCtx.globalAlpha = 1;

            // Label
            freqCtx.fillStyle = col;
            freqCtx.font = `600 9px 'Share Tech Mono', monospace`;
            freqCtx.textAlign = 'center';
            freqCtx.globalAlpha = 0.9;
            const cx = (x1 + x2) / 2;
            if (bw > 30) freqCtx.fillText(b.name, cx, H / 2 + 4);
            freqCtx.globalAlpha = 1;

            // Drag handles
            [x1, x2].forEach((hx, hi) => {
                freqCtx.fillStyle = col;
                freqCtx.globalAlpha = 0.9;
                freqCtx.fillRect(hx - 3, 0, 6, H);
                freqCtx.globalAlpha = 1;
            });
        });

        // Hz labels at bottom
        freqCtx.fillStyle = '#555540';
        freqCtx.font = '8px monospace';
        freqCtx.textAlign = 'center';
        freqCtx.globalAlpha = 0.7;
        [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].forEach(t => {
            freqCtx.fillText(hzLabel(t), t * W, H - 2);
        });
        freqCtx.globalAlpha = 1;
    }

    function freqCanvasHitTest(x) {
        const W = freqCanvas.width;
        const bands = configs[activeTrack].bands;
        const HANDLE_RADIUS = 6;
        for (let i = bands.length - 1; i >= 0; i--) {
            const b = bands[i];
            const x1 = b.lo * W;
            const x2 = b.hi * W;
            if (Math.abs(x - x1) < HANDLE_RADIUS) return { bandIdx: i, edge: 'lo' };
            if (Math.abs(x - x2) < HANDLE_RADIUS) return { bandIdx: i, edge: 'hi' };
            if (x > x1 && x < x2) return { bandIdx: i, edge: 'move' };
        }
        return null;
    }

    freqCanvas.addEventListener('mousedown', e => {
        const rect = freqCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const hit = freqCanvasHitTest(x);
        if (hit) {
            const b = configs[activeTrack].bands[hit.bandIdx];
            freqDragState = { ...hit, startX: x, startLo: b.lo, startHi: b.hi };
            e.preventDefault();
        }
    });

    window.addEventListener('mousemove', e => {
        if (!freqDragState) return;
        const rect = freqCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const W = freqCanvas.width;
        const dx = (x - freqDragState.startX) / W;
        const b = configs[activeTrack].bands[freqDragState.bandIdx];
        const MIN_WIDTH = 0.02;

        if (freqDragState.edge === 'lo') {
            b.lo = Math.max(0, Math.min(b.hi - MIN_WIDTH, freqDragState.startLo + dx));
        } else if (freqDragState.edge === 'hi') {
            b.hi = Math.min(1, Math.max(b.lo + MIN_WIDTH, freqDragState.startHi + dx));
        } else {
            const width = freqDragState.startHi - freqDragState.startLo;
            let newLo = freqDragState.startLo + dx;
            newLo = Math.max(0, Math.min(1 - width, newLo));
            b.lo = newLo;
            b.hi = newLo + width;
        }

        drawFreqCanvas();
        syncBandSliders();
        renderBands();
    });

    window.addEventListener('mouseup', () => {
        freqDragState = null;
        syncBandSliders();
    });

    freqCanvas.addEventListener('mousemove', e => {
        if (freqDragState) return;
        const rect = freqCanvas.getBoundingClientRect();
        const hit = freqCanvasHitTest(e.clientX - rect.left);
        if (!hit) freqCanvas.style.cursor = 'crosshair';
        else if (hit.edge === 'move') freqCanvas.style.cursor = 'grab';
        else freqCanvas.style.cursor = 'ew-resize';
    });

    // Syncs the center-position sliders in the band list to current lo/hi values.
    // Called after canvas drags so the sliders stay accurate.
    function syncBandSliders() {
        document.querySelectorAll('.freq-band-center').forEach(inp => {
            const idx = parseInt(inp.dataset.idx, 10);
            const b = configs[activeTrack].bands[idx];
            if (!b) return;
            inp.value = Math.round(((b.lo + b.hi) / 2) * 1000);
        });
        // Also refresh the Hz range readouts
        document.querySelectorAll('.freq-band-range').forEach(span => {
            const idx = parseInt(span.dataset.idx, 10);
            const b = configs[activeTrack].bands[idx];
            if (!b) return;
            span.textContent = fmtHz(normToHz(b.lo)) + ' – ' + fmtHz(normToHz(b.hi));
        });
    }

    function renderBands() {
        const list = document.getElementById('freq-band-list');
        const bands = configs[activeTrack].bands;
        list.innerHTML = '';
        bands.forEach((b, i) => {
            const row = document.createElement('div');
            row.className = 'freq-band-row';

            const center = Math.round(((b.lo + b.hi) / 2) * 1000);

            row.innerHTML = `
                <div class="freq-band-swatch" style="background:${b.color}"></div>
                <span class="freq-band-name">${escHtml(b.name)}</span>
                <span class="freq-band-range" data-idx="${i}">${fmtHz(normToHz(b.lo))} – ${fmtHz(normToHz(b.hi))}</span>
                <input class="freq-band-center vsns-range" type="range"
                    min="0" max="1000" step="1" value="${center}"
                    title="Slide to move band position" data-idx="${i}">
                <button class="freq-band-del" data-idx="${i}" title="Delete"><span>✕</span></button>
            `;
            list.appendChild(row);
        });

        list.querySelectorAll('.freq-band-center').forEach(inp => {
            inp.addEventListener('input', () => {
                const idx = parseInt(inp.dataset.idx, 10);
                const b = configs[activeTrack].bands[idx];
                const newCenter = parseInt(inp.value, 10) / 1000;
                const halfW = (b.hi - b.lo) / 2;
                b.lo = Math.max(0, Math.min(1 - halfW * 2, newCenter - halfW));
                b.hi = b.lo + halfW * 2;
                drawFreqCanvas();
                // Update just this row's range readout without full re-render
                const rangeEl = inp.closest('.freq-band-row').querySelector('.freq-band-range');
                if (rangeEl) rangeEl.textContent = fmtHz(normToHz(b.lo)) + ' – ' + fmtHz(normToHz(b.hi));
            });
        });

        list.querySelectorAll('.freq-band-del').forEach(btn => {
            btn.addEventListener('click', () => {
                configs[activeTrack].bands.splice(parseInt(btn.dataset.idx, 10), 1);
                renderBands();
                drawFreqCanvas();
            });
        });
    }

    document.getElementById('freq-add-btn').addEventListener('click', () => {
        const name = document.getElementById('freq-new-name').value.trim();
        const color = document.getElementById('freq-new-color').value;
        if (!name) return;
        configs[activeTrack].bands.push({ name, color, lo: hzToNorm(800), hi: hzToNorm(2000) });
        document.getElementById('freq-new-name').value = '';
        renderBands();
        drawFreqCanvas();
    });

    window.addEventListener('resize', () => {
        resizeFreqCanvas();
        resizeVisCanvas();
    });

    // ────────────────────────────────────────────────────────
    // SECTION 8 — NOTES
    // ────────────────────────────────────────────────────────

    document.getElementById('notes-save-btn').addEventListener('click', () => {
        configs[activeTrack].notes = document.getElementById('notes-textarea').value;
        const msg = document.getElementById('notes-saved-msg');
        msg.textContent = 'Saved.';
        msg.style.opacity = '1';
        setTimeout(() => { msg.style.opacity = '0'; }, 1800);
    });

    // ────────────────────────────────────────────────────────
    // SECTION 9 — VISUALIZER PREVIEW
    // ────────────────────────────────────────────────────────

    const visCanvas = document.getElementById('vsns-vis-canvas');
    const visCtx = visCanvas.getContext('2d');
    let activeVisMode = 'bottom';
    let visRafId = null;
    let simTime = 0;
    let scrollOffset = 0;
    let rotAngle = 0;

    function resizeVisCanvas() {
        visCanvas.width = visCanvas.offsetWidth;
        visCanvas.height = visCanvas.offsetHeight;
    }

    function getSignal(bins) {
        // ── Real audio path ──────────────────────────────────
        if (audioLoaded && analyser && audioEl && !audioEl.paused) {
            const raw = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(raw);
            const out = new Float32Array(bins);
            const NYQUIST = 22050;
            for (let i = 0; i < bins; i++) {
                const hzLo = FREQ_MIN * Math.pow(FREQ_RATIO, i / bins);
                const hzHi = FREQ_MIN * Math.pow(FREQ_RATIO, (i + 1) / bins);
                const idxLo = Math.max(0, Math.floor(hzLo / NYQUIST * raw.length));
                const idxHi = Math.min(raw.length, Math.ceil(hzHi / NYQUIST * raw.length));
                const hi = Math.max(idxLo + 1, idxHi); // always at least 1 bin
                // Use peak, not average — far more responsive for sparse low-freq bins
                let peak = 0;
                for (let j = idxLo; j < hi; j++) if (raw[j] > peak) peak = raw[j];
                out[i] = Math.min(1, (peak / 255) * 0.9); // reduced boost
            }
            return out;
        }
        // ── Simulated signal path ────────────────────────────
        return getSimSignal(bins);
    }

    function getSimSignal(bins) {
        const type = document.getElementById('vis-sim-type').value;
        const intensity = parseFloat(document.getElementById('vis-intensity').value);
        const data = new Float32Array(bins);
        simTime += 0.03;

        for (let i = 0; i < bins; i++) {
            const t = i / bins;
            let val = 0;

            switch (type) {
                case 'noise':
                    val = Math.random();
                    break;
                case 'bass':
                    val = Math.max(0, 1 - t * 3) * (0.6 + 0.4 * Math.abs(Math.sin(simTime * 4)));
                    val += Math.random() * 0.05;
                    break;
                case 'mid':
                    val = Math.max(0, 1 - Math.abs(t - 0.4) * 4) * (0.6 + 0.4 * Math.abs(Math.sin(simTime * 3)));
                    val += Math.random() * 0.05;
                    break;
                case 'high':
                    val = Math.max(0, t * 2 - 0.5) * (0.5 + 0.5 * Math.abs(Math.sin(simTime * 5)));
                    val += Math.random() * 0.05;
                    break;
                case 'sweep': {
                    const center = (Math.sin(simTime * 0.7) + 1) / 2;
                    val = Math.max(0, 1 - Math.abs(t - center) * 6);
                    val = val * val;
                    val += Math.random() * 0.06;
                    break;
                }
                case 'pulse': {
                    const pulse = Math.abs(Math.sin(simTime * 3));
                    val = (0.4 + 0.6 * pulse) * (Math.random() * 0.3 + 0.7 * Math.max(0, 1 - t * 2));
                    break;
                }
            }

            data[i] = Math.min(1, val * intensity);
        }
        return data;
    }

    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }

    // ── Band helpers ──────────────────────────────────────────
    // Returns a per-bin color array based on active bands.
    // Bins with no band coverage fall back to the global bar color.
    function getBinColors(bins, fallback) {
        const bands = configs[activeTrack].bands;
        const colors = new Array(bins).fill(fallback);
        for (let i = 0; i < bins; i++) {
            const norm = binToNorm(i, bins); // convert linear FFT bin → log-normalized Hz position
            for (let b = 0; b < bands.length; b++) {
                if (norm >= bands[b].lo && norm < bands[b].hi) {
                    colors[i] = bands[b].color;
                    break;
                }
            }
        }
        return colors;
    }

    // Scales each bin's amplitude by whether it falls inside any band (1.0) or not (0.25 = dimmed).
    // Bands no longer have a separate strength slider — presence in a band = full reactivity.
    function applyBandStrength(data, bins) {
        const bands = configs[activeTrack].bands;
        const out = new Float32Array(bins);
        for (let i = 0; i < bins; i++) {
            const norm = binToNorm(i, bins);
            let inBand = false;
            for (let b = 0; b < bands.length; b++) {
                if (norm >= bands[b].lo && norm < bands[b].hi) { inBand = true; break; }
            }
            // Bins outside any defined band are dimmed to 25% so they don't dominate
            out[i] = data[i] * (inBand ? 1.0 : 0.25);
        }
        return out;
    }

    function colorStr(hex, alpha) {
        const { r, g, b } = hexToRgb(hex);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function drawVis() {
        visRafId = requestAnimationFrame(drawVis);

        const W = visCanvas.width;
        const H = visCanvas.height;
        const BINS = 64;
        const rawData = getSignal(BINS);
        const data = applyBandStrength(rawData, BINS); // strength-scaled
        const barColor = document.getElementById('vis-color').value;
        const peakColor = document.getElementById('vis-peak-color').value;
        const colors = getBinColors(BINS, barColor); // per-bin colors

        visCtx.clearRect(0, 0, W, H);
        visCtx.fillStyle = '#000';
        visCtx.fillRect(0, 0, W, H);

        switch (activeVisMode) {
            case 'bottom': drawModeBottom(W, H, data, BINS, colors, peakColor); break;
            case 'top': drawModeTop(W, H, data, BINS, colors, peakColor); break;
            case 'sides': drawModeSides(W, H, data, BINS, colors, peakColor); break;
            case 'circle': drawModeCircle(W, H, data, BINS, colors, peakColor); break;
            case 'rotate': drawModeRotate(W, H, data, BINS, colors, peakColor); break;
            case 'scroll': drawModeScroll(W, H, data, BINS, colors, peakColor, barColor); break;
            case 'mirror': drawModeMirror(W, H, data, BINS, colors, peakColor); break;
        }
    }

    // Pre-compute equal-width bar X positions for a given canvas width.
    function getBarRects(bins, W) {
        const rects = [];
        for (let i = 0; i < bins; i++) {
            const x0 = binToNorm(i, bins) * W;
            const x1 = binToNorm(i + 1, bins) * W;
            if (x0 >= W) break; // above FREQ_MAX cutoff — stop
            rects.push({ i, x: x0, w: Math.max(Math.min(x1, W) - x0 - 0.5, 0.5) });
        }
        return rects;
    }

    // ── MODE: BOTTOM ──
    function drawModeBottom(W, H, data, bins, colors, pcol) {
        const rects = getBarRects(bins, W);
        for (const { i, x, w } of rects) {
            const barH = data[i] * H * 0.9;
            visCtx.fillStyle = colorStr(colors[i], 0.85);
            visCtx.fillRect(x, H - barH, w, barH);
            visCtx.fillStyle = pcol;
            visCtx.fillRect(x, H - barH - 2, w, 2);
        }
    }

    // ── MODE: TOP ──
    function drawModeTop(W, H, data, bins, colors, pcol) {
        const rects = getBarRects(bins, W);
        for (const { i, x, w } of rects) {
            const barH = data[i] * H * 0.9;
            visCtx.fillStyle = colorStr(colors[i], 0.85);
            visCtx.fillRect(x, 0, w, barH);
            visCtx.fillStyle = pcol;
            visCtx.fillRect(x, barH, w, 2);
        }
    }

    // ── MODE: SIDES ──
    function drawModeSides(W, H, data, bins, colors, pcol) {
        const rects = getBarRects(bins, W); // reuse count from rects
        const n = rects.length;
        const slotH = Math.max(H / n - 0.5, 0.5);
        for (let ri = 0; ri < n; ri++) {
            const { i } = rects[ri];
            const barW = data[i] * W * 0.45;
            const y = (ri / n) * H;
            visCtx.fillStyle = colorStr(colors[i], 0.85);
            visCtx.fillRect(0, y, barW, slotH);
            visCtx.fillStyle = pcol;
            visCtx.fillRect(barW, y, 2, slotH);
            visCtx.fillStyle = colorStr(colors[i], 0.85);
            visCtx.fillRect(W - barW, y, barW, slotH);
            visCtx.fillStyle = pcol;
            visCtx.fillRect(W - barW - 2, y, 2, slotH);
        }
    }

    // ── MODE: CIRCLE ──
    function drawModeCircle(W, H, data, bins, colors, pcol) {
        const cx = W / 2, cy = H / 2;
        const innerR = Math.min(W, H) * 0.22;
        const maxLen = Math.min(W, H) * 0.28;
        const rects = getBarRects(bins, W);
        const n = rects.length;
        for (let ri = 0; ri < n; ri++) {
            const { i } = rects[ri];
            const angle = (ri / n) * Math.PI * 2 - Math.PI / 2;
            const len = data[i] * maxLen;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            visCtx.strokeStyle = colorStr(colors[i], 0.8);
            visCtx.lineWidth = Math.max((W / n) * 0.7, 1);
            visCtx.beginPath();
            visCtx.moveTo(cx + cos * innerR, cy + sin * innerR);
            visCtx.lineTo(cx + cos * (innerR + len), cy + sin * (innerR + len));
            visCtx.stroke();
            visCtx.fillStyle = pcol;
            visCtx.beginPath();
            visCtx.arc(cx + cos * (innerR + len), cy + sin * (innerR + len), 1.5, 0, Math.PI * 2);
            visCtx.fill();
        }
        visCtx.strokeStyle = colorStr(colors[0], 0.2);
        visCtx.lineWidth = 1;
        visCtx.beginPath();
        visCtx.arc(cx, cy, innerR, 0, Math.PI * 2);
        visCtx.stroke();
    }

    // ── MODE: ROTATE ──
    function drawModeRotate(W, H, data, bins, colors, pcol) {
        rotAngle += 0.012;
        const cx = W / 2, cy = H / 2;
        const innerR = Math.min(W, H) * 0.18;
        const maxLen = Math.min(W, H) * 0.30;
        const rects = getBarRects(bins, W);
        const n = rects.length;
        visCtx.save();
        visCtx.translate(cx, cy);
        visCtx.rotate(rotAngle);
        for (let ri = 0; ri < n; ri++) {
            const { i } = rects[ri];
            const angle = (ri / n) * Math.PI * 2;
            const len = data[i] * maxLen;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            visCtx.strokeStyle = colorStr(colors[i], 0.8);
            visCtx.lineWidth = Math.max((W / n) * 0.6, 1);
            visCtx.beginPath();
            visCtx.moveTo(cos * innerR, sin * innerR);
            visCtx.lineTo(cos * (innerR + len), sin * (innerR + len));
            visCtx.stroke();
        }
        visCtx.restore();
    }

    // ── MODE: SCROLL ──
    const scrollBuf = [];
    function drawModeScroll(W, H, data, bins, colors, pcol, fallbackColor) {
        const rects = getBarRects(bins, W);
        const n = rects.length;
        const snap = new Float32Array(n).map((_, ri) => data[rects[ri].i]);
        const snapCol = rects.map(({ i }) => colors[i]);
        scrollBuf.push({ data: snap, colors: snapCol });
        if (scrollBuf.length > W) scrollBuf.shift();

        const rowH = Math.max(H / n, 0.5);
        for (let xi = 0; xi < scrollBuf.length; xi++) {
            const frame = scrollBuf[xi];
            const alpha = xi / W;
            for (let ri = 0; ri < frame.data.length; ri++) {
                const y0 = (ri / n) * H;
                visCtx.fillStyle = colorStr(frame.colors[ri], alpha * frame.data[ri]);
                visCtx.fillRect(xi, y0, 1, rowH);
            }
        }
    }

    // ── MODE: MIRROR ──
    function drawModeMirror(W, H, data, bins, colors, pcol) {
        const rects = getBarRects(bins, W);
        for (const { i, x, w } of rects) {
            const barH = data[i] * H * 0.45;
            const midY = H / 2;
            visCtx.fillStyle = colorStr(colors[i], 0.85);
            visCtx.fillRect(x, midY - barH, w, barH);
            visCtx.fillRect(x, midY, w, barH);
            visCtx.fillStyle = pcol;
            visCtx.fillRect(x, midY - barH - 2, w, 2);
            visCtx.fillRect(x, midY + barH, w, 2);
        }
        visCtx.strokeStyle = colorStr(colors[Math.floor(bins / 2)], 0.15);
        visCtx.lineWidth = 1;
        visCtx.beginPath();
        visCtx.moveTo(0, H / 2);
        visCtx.lineTo(W, H / 2);
        visCtx.stroke();
    }

    // ── Vis mode buttons ──
    document.querySelectorAll('.vis-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.vis-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeVisMode = btn.dataset.mode;
            configs[activeTrack].visMode = activeVisMode;
            scrollBuf.length = 0; // reset scroll buffer on mode change
        });
    });

    // ────────────────────────────────────────────────────────
    // SECTION 10 — AUDIO ENGINE + PLAYER
    // ────────────────────────────────────────────────────────

    const playerPlayPause = document.getElementById('player-playpause');
    const playerRewind = document.getElementById('player-rewind');
    const playerSeek = document.getElementById('player-seek');
    const playerTimeCur = document.getElementById('player-time-cur');
    const playerTimeDur = document.getElementById('player-time-dur');
    const playerVol = document.getElementById('player-vol');
    const playerName = document.getElementById('player-track-name');
    const playerBadge = document.getElementById('player-source-badge');
    const simSignalNote = document.getElementById('sim-signal-note');

    function formatPlayerTime(sec) {
        const s = Math.floor(sec);
        const ms = Math.floor((sec - s) * 1000);
        const min = Math.floor(s / 60);
        const rem = s % 60;
        return `${min}:${String(rem).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    function initAudioContext() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    function connectAnalyser() {
        if (!audioEl || !audioCtx) return;
        // Only connect once
        if (!audioSrc) {
            audioSrc = audioCtx.createMediaElementSource(audioEl);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.78;
            analyser.minDecibels = -100;
            analyser.maxDecibels = -10;
            audioSrc.connect(analyser);
            analyser.connect(audioCtx.destination);
        }
    }

    function loadAudioFile(file) {
        initAudioContext();

        // Create or reuse audio element
        if (!audioEl) {
            audioEl = new Audio();
            audioEl.crossOrigin = 'anonymous';
        } else {
            audioEl.pause();
        }

        const url = URL.createObjectURL(file);
        audioEl.src = url;
        audioEl.volume = parseFloat(playerVol.value);

        audioEl.addEventListener('loadedmetadata', () => {
            playerSeek.max = Math.floor(audioEl.duration * 1000);
            playerTimeDur.textContent = formatPlayerTime(audioEl.duration);
            playerSeek.disabled = false;
            playerPlayPause.disabled = false;
            connectAnalyser();
            audioLoaded = true;
            updateAudioUI(false);
        }, { once: false });

        audioEl.addEventListener('timeupdate', () => {
            if (seekDragging) return;
            const cur = audioEl.currentTime;
            playerTimeCur.textContent = formatPlayerTime(cur);
            playerSeek.value = Math.floor(cur * 1000);
            updateSeekTrack();
            // Sync lap timer display to audio when audio is loaded
            if (audioLoaded) {
                lapElapsed = cur * 1000;
                document.getElementById('lap-clock').textContent = formatLapTime(lapElapsed);
            }
        });

        audioEl.addEventListener('ended', () => {
            updateAudioUI(false);
            // Stop lap timer tracking
            if (audioLoaded) {
                lapRunning = false;
                document.getElementById('lap-start-btn').querySelector('span').textContent = 'PLAY';
                document.getElementById('lap-mark-btn').disabled = true;
            }
        });

        audioEl.load();
        document.getElementById('vsns-file-name').textContent = file.name;
        playerName.textContent = SONGS[activeTrack].title + ' — ' + file.name;
        setStatus(`LOADED: ${SONGS[activeTrack].title.toUpperCase()}`, true);
    }

    function updateAudioUI(playing) {
        if (playing) {
            playerPlayPause.querySelector('span').textContent = '⏸';
            playerPlayPause.classList.add('playing');
        } else {
            playerPlayPause.querySelector('span').textContent = '▶';
            playerPlayPause.classList.remove('playing');
        }
        // Update source badge
        if (audioLoaded) {
            playerBadge.textContent = 'LIVE';
            playerBadge.classList.add('live');
            simSignalNote.textContent = '(inactive — reacting to audio)';
            simSignalNote.classList.add('audio-live');
            document.getElementById('lap-sync-note').classList.add('visible');
            document.getElementById('lap-start-btn').querySelector('span').textContent = playing ? 'PAUSE' : 'PLAY';
            document.getElementById('lap-mark-btn').disabled = !playing;
        }
    }

    function updateSeekTrack() {
        const pct = (playerSeek.value / playerSeek.max * 100).toFixed(2);
        playerSeek.style.setProperty('--seek-pct', pct + '%');
    }

    // Play / Pause
    playerPlayPause.addEventListener('click', () => {
        if (!audioEl || !audioLoaded) return;
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

        if (audioEl.paused) {
            audioEl.play().then(() => {
                updateAudioUI(true);
                lapRunning = true;
            }).catch(() => { });
        } else {
            audioEl.pause();
            lapRunning = false;
            updateAudioUI(false);
        }
    });

    // Rewind
    playerRewind.addEventListener('click', () => {
        if (!audioEl) return;
        audioEl.pause();
        audioEl.currentTime = 0;
        lapElapsed = 0;
        lapRunning = false;
        updateAudioUI(false);
        document.getElementById('lap-clock').textContent = '0:00.000';
    });

    // Seek bar
    playerSeek.addEventListener('mousedown', () => { seekDragging = true; });
    playerSeek.addEventListener('input', () => {
        updateSeekTrack();
        playerTimeCur.textContent = formatPlayerTime(playerSeek.value / 1000);
    });
    playerSeek.addEventListener('change', () => {
        seekDragging = false;
        if (audioEl) {
            audioEl.currentTime = playerSeek.value / 1000;
            lapElapsed = audioEl.currentTime * 1000;
            if (!audioEl.paused) lapRunning = true;
        }
    });

    // Volume
    playerVol.addEventListener('input', () => {
        if (audioEl) audioEl.volume = parseFloat(playerVol.value);
    });

    // Keyboard shortcuts: Space = play/pause, Left/Right arrow = seek ±5s
    document.addEventListener('keydown', e => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        if (e.code === 'Space' && audioLoaded) {
            e.preventDefault();
            playerPlayPause.click();
        }
        if (e.code === 'ArrowLeft' && audioEl) {
            audioEl.currentTime = Math.max(0, audioEl.currentTime - 5);
        }
        if (e.code === 'ArrowRight' && audioEl) {
            audioEl.currentTime = Math.min(audioEl.duration || 0, audioEl.currentTime + 5);
        }
    });

    // File input
    document.getElementById('vsns-file-input').addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        loadAudioFile(file);
    });

    // ────────────────────────────────────────────────────────
    // SECTION 11 — EXPORT / IMPORT
    // ────────────────────────────────────────────────────────

    document.getElementById('vsns-export-btn').addEventListener('click', () => {
        saveCurrentTrackUI();
        const output = SONGS.map((s, i) => ({
            title: s.title,
            artist: s.artist,
            file: s.file,
            bpm: configs[i].bpm,
            marks: configs[i].marks,
            bands: configs[i].bands,
            notes: configs[i].notes,
            visMode: configs[i].visMode,
            visColor: configs[i].visColor,
            visPeakColor: configs[i].visPeakColor,
        }));

        const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vsns_config.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('vsns-import-btn').addEventListener('click', () => {
        document.getElementById('vsns-import-input').click();
    });

    document.getElementById('vsns-import-input').addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                data.forEach((entry, i) => {
                    if (!configs[i]) return;
                    configs[i] = {
                        bpm: entry.bpm ?? null,
                        marks: entry.marks ?? [],
                        bands: entry.bands ?? getDefaultBands(),
                        notes: entry.notes ?? '',
                        visMode: entry.visMode ?? 'bottom',
                        visColor: entry.visColor ?? '#f7e84e',
                        visPeakColor: entry.visPeakColor ?? '#ffffff',
                    };
                    if (entry.title) SONGS[i].title = entry.title;
                    if (entry.artist) SONGS[i].artist = entry.artist;
                    if (entry.file) SONGS[i].file = entry.file;
                });
                buildTrackList();
                loadTrackUI();
                alert('Config imported successfully.');
            } catch (err) {
                alert('Failed to parse config: ' + err.message);
            }
        };
        reader.readAsText(file);
    });

    // ────────────────────────────────────────────────────────
    // SECTION 12 — UTILITY
    // ────────────────────────────────────────────────────────

    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ────────────────────────────────────────────────────────
    // INIT
    // ────────────────────────────────────────────────────────

    buildTrackList();
    loadTrackUI();
    buildBeatRow();
    resizeVisCanvas();
    resizeFreqCanvas();
    drawFreqCanvas();
    renderBands();
    drawVis();
    setStatus('NO TRACK LOADED', false);

})();