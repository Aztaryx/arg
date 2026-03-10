history.scrollRestoration = 'manual';
window.scrollTo(0, 0);


window.onscroll = function () {
    const navbar = document.getElementById("navbar");

    if (document.body.scrollTop > 80 || document.documentElement.scrollTop > 80) {
        navbar.classList.add("shrunk");
    } else {
        navbar.classList.remove("shrunk");
    }
};

// Function to show output with fade-in and rise animation
function showOutput(htmlCode) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: background-color 0.3s ease;
    `;

    // Create output container
    const outputContainer = document.createElement('div');
    outputContainer.style.cssText = `
        background-color: white;
        padding: 30px;
        border-radius: 8px;
        max-width: 80%;
        max-height: 80%;
        overflow: auto;
        position: relative;
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.4s ease, transform 0.4s ease;
    `;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: #ff5f56;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transform: skewX(0deg);
        transition: background-color 0.2s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.backgroundColor = '#ff3b30';
    closeBtn.onmouseout = () => closeBtn.style.backgroundColor = '#ff5f56';
    closeBtn.onclick = () => closeModal();

    // Create output iframe for safe rendering
    const outputFrame = document.createElement('iframe');
    outputFrame.style.cssText = `
        width: 100%;
        min-height: 400px;
        border: 2px solid #ccc;
        border-radius: 4px;
        background-color: white;
    `;

    outputContainer.appendChild(closeBtn);
    outputContainer.appendChild(outputFrame);
    overlay.appendChild(outputContainer);
    document.body.appendChild(overlay);

    // Trigger animation after a brief delay
    setTimeout(() => {
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        outputContainer.style.opacity = '1';
        outputContainer.style.transform = 'translateY(0)';
    }, 10);

    // Write HTML to iframe
    const iframeDoc = outputFrame.contentDocument || outputFrame.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlCode);
    iframeDoc.close();

    // Close modal function with fade-out animation
    function closeModal() {
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        outputContainer.style.opacity = '0';
        outputContainer.style.transform = 'translateY(30px)';

        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 300);
    }

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}


// Page load animation + all DOMContentLoaded logic
document.addEventListener('DOMContentLoaded', function () {
    // Find the main content container
    const contentContainer = document.querySelector('.literallyEverything main') ||
        document.querySelector('main') ||
        document.querySelector('.literallyEverything') ||
        document.querySelector('.page-content') ||
        document.querySelector('.partiallyEverything') ||
        document.querySelector('body > *:not(#navbar):not(#warning-overlay):not(#sidebar):not(#sidebar-toggle):not(#sidebar-overlay):not(#site-footer)');

    if (contentContainer) {
        contentContainer.classList.add('page-content');
        setTimeout(() => {
            contentContainer.classList.add('loaded');
        }, 100);
    }

    // For homepage specifically (if no .literallyEverything exists)
    const homeContent = document.querySelector('#startP');
    if (homeContent && !document.querySelector('.literallyEverything')) {
        const mainContent = homeContent.parentElement;
        mainContent.classList.add('page-content');
        setTimeout(() => {
            mainContent.classList.add('loaded');
        }, 100);
    }

    // ========================================
    // WARNING OVERLAY CLOSE HANDLER
    // ========================================
    const closeBtn = document.getElementById('close-warning');
    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            const overlay = document.getElementById('warning-overlay');
            overlay.classList.add('closing');
            setTimeout(() => {
                overlay.classList.add('hidden');
                document.body.classList.remove('warning-active');
            }, 400);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeBtn.click();
            }
        });
    }

    // ========================================
    // INTERSECTION OBSERVER — MODULE WINDOWS
    // ========================================
    const moduleWindows = document.querySelectorAll('.module-window');
    if (moduleWindows.length > 0) {
        const windowObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    windowObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        moduleWindows.forEach(function (win) {
            windowObserver.observe(win);
        });
    }

    // ========================================
    // 3D ROTATING CAROUSEL
    // ========================================
    const carouselItems = document.querySelectorAll('.carousel-item');
    const dotsContainer = document.getElementById('carousel-dots');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    if (carouselItems.length > 0 && dotsContainer) {
        let currentIndex = 0;

        carouselItems.forEach(function (_, i) {
            const dot = document.createElement('button');
            dot.classList.add('carousel-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', function () {
                goToSlide(i);
            });
            dotsContainer.appendChild(dot);
        });

        function updateCarousel() {
            const total = carouselItems.length;
            carouselItems.forEach(function (item, i) {
                item.classList.remove('active', 'prev', 'next', 'far-prev', 'far-next');

                let diff = i - currentIndex;
                if (diff > total / 2) diff -= total;
                if (diff < -total / 2) diff += total;

                if (diff === 0) {
                    item.classList.add('active');
                } else if (diff === -1) {
                    item.classList.add('prev');
                } else if (diff === 1) {
                    item.classList.add('next');
                } else if (diff < -1) {
                    item.classList.add('far-prev');
                } else {
                    item.classList.add('far-next');
                }
            });

            const dots = dotsContainer.querySelectorAll('.carousel-dot');
            dots.forEach(function (dot, i) {
                dot.classList.toggle('active', i === currentIndex);
            });
        }

        function goToSlide(index) {
            currentIndex = index;
            updateCarousel();
        }

        function nextSlide() {
            currentIndex = (currentIndex + 1) % carouselItems.length;
            updateCarousel();
        }

        function prevSlide() {
            currentIndex = (currentIndex - 1 + carouselItems.length) % carouselItems.length;
            updateCarousel();
        }

        if (prevBtn) prevBtn.addEventListener('click', prevSlide);
        if (nextBtn) nextBtn.addEventListener('click', nextSlide);

        updateCarousel();
    }

    // ========================================
    // MODULE PAGE NAVIGATION
    // ========================================
    initModulePages();
});


// ========================================
// MODULE PAGE NAVIGATION SYSTEM
// ========================================
function initModulePages() {
    const pages = document.querySelectorAll('.module-page');
    if (pages.length === 0) return;

    let currentPage = 0;
    const total = pages.length;

    const prevBtn = document.getElementById('module-prev');
    const nextBtn = document.getElementById('module-next');
    const counter = document.getElementById('module-page-counter');

    function showPage(index) {
        // Clamp index
        index = Math.max(0, Math.min(index, total - 1));
        if (index === currentPage && pages[currentPage].classList.contains('active-page')) {
            return;
        }

        // Fade out current
        pages[currentPage].classList.remove('active-page');
        currentPage = index;

        // Fade in new
        pages[currentPage].classList.add('active-page');

        // Scroll the inner main area back to top on page change
        const mainEl = document.querySelector('.literallyEverything main');
        if (mainEl) mainEl.scrollTop = 0;

        if (counter) counter.textContent = `${currentPage + 1} / ${total}`;
        if (prevBtn) prevBtn.disabled = currentPage === 0;
        if (nextBtn) nextBtn.disabled = currentPage === total - 1;
    }

    if (prevBtn) prevBtn.addEventListener('click', () => showPage(currentPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showPage(currentPage + 1));

    // Keyboard navigation — left/right arrow keys
    document.addEventListener('keydown', function (e) {
        // Don't hijack keys if user is typing in an input or a modal is open
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;
        if (document.body.querySelector('[style*="z-index: 1000"]')) return;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            showPage(currentPage + 1);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            showPage(currentPage - 1);
        }
    });

    // Initialize first page
    showPage(0);
}


// ========================================
// SIDEBAR TOGGLE
// ========================================
(function () {
    function initSidebar() {
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (!toggle || !sidebar || !overlay) return;

        function openSidebar() {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            toggle.classList.add('open');
            toggle.setAttribute('aria-expanded', 'true');
        }

        function closeSidebar() {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        }

        toggle.addEventListener('click', function () {
            sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
        });

        overlay.addEventListener('click', closeSidebar);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }
})();

// ========================================
// QUIZ — SIDEBAR PLAY BUTTON
// Finds the current mode's start button
// and triggers it (scrolls first if needed).
// ========================================
(function () {
    function initSidebarPlayBtn() {
        const btn = document.getElementById('sidebar-play-btn');
        if (!btn) return;

        btn.addEventListener('click', function () {
            const startBtn = document.querySelector(
                '#bk-start-btn, #pn-start-btn, #sd-start-btn, #ol-start-btn, #bo-start-btn'
            );
            if (!startBtn) return;
            startBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(function () { startBtn.click(); }, 420);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebarPlayBtn);
    } else {
        initSidebarPlayBtn();
    }
})();


// ============================================================
//  AMBIENT AUDIO PLAYER + BOTTOM VISUALIZER
//  Plays calm background music on home, about, and module
//  pages. Uses Web Audio API for the frequency visualizer.
//  Respects Page Visibility API — pauses on tab hide/blur,
//  resumes on focus. Credits are displayed in a small pill
//  above the visualizer bar.
// ============================================================
(function () {

    // ---- Track definitions ---------------------------------
    // file: exact filename inside playlist/calm/ (no extension)
    // title: clean display name
    // credit: what to show in the credit pill
    const CALM_TRACKS = [
        {
            file: '14. Welcome to the Green Room (DELTARUNE Chapter 34 Soundtrack) - Toby Fox',
            title: 'Welcome to the Green Room',
            credit: 'Toby Fox · DELTARUNE Ch.34'
        },
        {
            file: '63. The Third Sanctuary (DELTARUNE Chapter 34 Soundtrack) - Toby Fox',
            title: 'The Third Sanctuary',
            credit: 'Toby Fox · DELTARUNE Ch.34'
        },
        {
            file: 'Face to Face - Grace OST (1)',
            title: 'Face to Face',
            credit: 'Grace OST'
        },
        {
            file: 'Hip Shop',
            title: 'Hip Shop',
            credit: 'Unknown · calm playlist'
        },
        {
            file: 'Melancholy - Item Asylum',
            title: 'Melancholy',
            credit: 'Item Asylum'
        },
        {
            file: 'My Castle Town',
            title: 'My Castle Town',
            credit: 'calm playlist'
        },
        {
            file: 'samsonite - Item Asylum Vol. 8',
            title: 'samsonite',
            credit: 'Item Asylum Vol. 8'
        },
        {
            file: 'TAKE YOUR TIME - KEY AFTER KEY  PHIGHTING OST',
            title: 'TAKE YOUR TIME',
            credit: 'KEY AFTER KEY · PHIGHTING OST'
        },
        {
            file: 'The Temple of the Red Sun - Block Tales OST',
            title: 'The Temple of the Red Sun',
            credit: 'Block Tales OST'
        },
        {
            file: 'Your New Prison',
            title: 'Your New Prison',
            credit: 'calm playlist'
        },
        {
            file: 'Your Theme of sin - Grace OST',
            title: 'Your Theme of sin',
            credit: 'Grace OST'
        }
    ];

    const TAKE_CARE = {
        file: 'Take Care (ULTRAKILL_ INFINITE HYPERDEATH)',
        title: 'Take Care',
        credit: 'ULTRAKILL: INFINITE HYPERDEATH'
    };

    // ---- Page type detection --------------------------------
    const pageName = (window.location.pathname.split('/').pop() || 'home.html').toLowerCase();

    const HOME_PAGES = ['home.html', ''];
    const ABOUT_PAGES = ['mission.html', 'aboutus.html', 'changelog.html',
        'howwegothere.html', 'contactinfo.html', 'faq.html', 'generalinfo.html'];
    const MODULE_PAGES = ['module1.html', 'module2.html', 'module3.html'];

    let track = null;
    if (HOME_PAGES.includes(pageName) || ABOUT_PAGES.includes(pageName)) {
        const pool = CALM_TRACKS.filter(t => t.file !== TAKE_CARE.file);
        track = pool[Math.floor(Math.random() * pool.length)];
    } else if (MODULE_PAGES.includes(pageName)) {
        track = TAKE_CARE;
    }

    if (!track) return;  // Quiz pages, visualizer page, etc. get no music.

    // ---- Audio element + Web Audio API --------------------
    const audioSrc = 'playlist/calm/' + encodeURIComponent(track.file) + '.mp3';
    const audio = new Audio(audioSrc);
    audio.loop = true;
    audio.volume = 0.30;
    audio.crossOrigin = 'anonymous';

    let audioCtx = null;
    let analyser = null;
    let mediaNode = null;

    function ensureCtx() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;  // 64 bars
        analyser.smoothingTimeConstant = 0.82;
        mediaNode = audioCtx.createMediaElementSource(audio);
        mediaNode.connect(analyser);
        analyser.connect(audioCtx.destination);
    }

    // ---- State --------------------------------------------
    let isPlaying = false;
    let userPaused = false;   // true when the user manually paused
    let uiBuilt = false;

    // ---- Playback helpers ---------------------------------
    function tryPlay() {
        ensureCtx();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audio.play();
    }

    function pauseAudio() {
        audio.pause();
        isPlaying = false;
        setToggleIcon();
    }

    function resumeAudio() {
        tryPlay().then(() => {
            isPlaying = true;
            setToggleIcon();
        }).catch(() => { });
    }

    // Expose for external pages (e.g. aboutus.html video takeover)
    window.ambientPause = function () { if (isPlaying) pauseAudio(); };
    window.ambientResume = function () { if (!userPaused) resumeAudio(); };

    // ---- Page Visibility: pause on hide, resume on show ---
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            if (isPlaying) pauseAudio();
        } else {
            // Only auto-resume if the user hasn't manually paused
            if (!userPaused && !isPlaying) resumeAudio();
        }
    });

    // ---- Window blur/focus for new-tab link clicks --------
    window.addEventListener('blur', function () {
        if (isPlaying) pauseAudio();
    });

    window.addEventListener('focus', function () {
        if (!userPaused && !isPlaying) resumeAudio();
    });

    // ---- DOM: build visualizer canvas + credit pill -------
    function buildUI() {
        if (uiBuilt) return;
        uiBuilt = true;

        // Mark body so we can add bottom padding
        document.body.classList.add('amb-active');

        // Canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'amb-visualizer';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(canvas);
        setTimeout(() => canvas.classList.add('visible'), 100);

        // Credit strip
        const credit = document.createElement('div');
        credit.id = 'amb-credit';
        credit.innerHTML = `
            <div id="amb-credit-text">
                <span id="amb-credit-note">♪</span>
                <span id="amb-credit-title">${track.title}</span>
                <span id="amb-credit-sep">·</span>
                <span id="amb-credit-source">${track.credit}</span>
            </div>
            <button id="amb-toggle" title="Pause / Resume music" aria-label="Pause or resume background music">
                <span id="amb-toggle-icon">⏸</span>
            </button>
        `;
        document.body.appendChild(credit);
        setTimeout(() => credit.classList.add('visible'), 400);

        // Toggle button handler
        document.getElementById('amb-toggle').addEventListener('click', function () {
            if (isPlaying) {
                userPaused = true;
                pauseAudio();
            } else {
                userPaused = false;
                resumeAudio();
            }
        });

        // Draw loop
        startDrawLoop(canvas);
    }

    function setToggleIcon() {
        const icon = document.getElementById('amb-toggle-icon');
        if (icon) icon.textContent = isPlaying ? '⏸' : '▶';
    }

    // ---- Visualizer draw loop ----------------------------
    function startDrawLoop(canvas) {
        const ctx = canvas.getContext('2d');

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = 28;
        }
        resize();
        window.addEventListener('resize', resize);

        const bufferLength = analyser ? analyser.frequencyBinCount : 64;
        const dataArr = new Uint8Array(bufferLength);

        function barColor(normalizedHeight) {
            if (normalizedHeight > 0.75) return '#f7d74e';
            if (normalizedHeight > 0.45) return '#4a9aff';
            return '#2a5cc7';
        }

        function draw() {
            requestAnimationFrame(draw);

            const W = canvas.width;
            const H = canvas.height;

            ctx.clearRect(0, 0, W, H);

            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, 'rgba(5, 10, 26, 0.0)');
            grad.addColorStop(1, 'rgba(5, 10, 26, 0.72)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            if (!analyser) return;

            analyser.getByteFrequencyData(dataArr);

            const barCount = bufferLength;
            const barW = (W / barCount) * 0.72;
            const gap = (W / barCount) * 0.28;
            const slotW = barW + gap;
            const half = Math.floor(barCount / 2);

            for (let i = 0; i < barCount; i++) {
                const mirrorIdx = i < half ? (half - 1 - i) : (i - half);
                const norm = dataArr[mirrorIdx] / 255;
                const barH = Math.max(2, norm * H * 0.88);
                const x = i * slotW + (W - barCount * slotW) / 2;

                ctx.fillStyle = barColor(norm);
                ctx.globalAlpha = 0.65 + norm * 0.35;
                ctx.fillRect(x, H - barH, barW, barH);

                if (norm > 0.5) {
                    ctx.fillStyle = '#f7d74e';
                    ctx.globalAlpha = (norm - 0.5) * 1.4;
                    ctx.fillRect(x, H - barH - 2, barW, 2);
                }

                ctx.globalAlpha = 1;
            }
        }

        draw();
    }

    // ---- Autoplay prompt (shown if browser blocks it) ----
    function showAutoplayPrompt() {
        const prompt = document.createElement('div');
        prompt.id = 'amb-prompt';
        prompt.innerHTML = '<span>🎵</span><span>Click anywhere to enable background music</span>';
        document.body.appendChild(prompt);
        setTimeout(() => prompt.classList.add('visible'), 100);

        function onInteract() {
            document.removeEventListener('click', onInteract);
            document.removeEventListener('keydown', onInteract);
            prompt.classList.remove('visible');
            setTimeout(() => prompt.remove(), 500);
            tryPlay().then(() => {
                isPlaying = true;
                setToggleIcon();
            });
        }

        document.addEventListener('click', onInteract);
        document.addEventListener('keydown', onInteract);
    }

    // ---- Kick off -----------------------------------------
    // Build UI once DOM is ready, then attempt autoplay.
    function init() {
        buildUI();

        // Slight delay so AudioContext isn't created before any user
        // gesture on the page (the warning overlay close counts).
        setTimeout(function () {
            ensureCtx();
            tryPlay()
                .then(() => {
                    isPlaying = true;
                    setToggleIcon();
                })
                .catch(() => {
                    // Autoplay blocked — wait for first interaction then try again
                    function onFirstInteract() {
                        document.removeEventListener('click', onFirstInteract);
                        document.removeEventListener('keydown', onFirstInteract);
                        const promptEl = document.getElementById('amb-prompt');
                        if (promptEl) {
                            promptEl.classList.remove('visible');
                            setTimeout(() => promptEl.remove(), 500);
                        }
                        tryPlay().then(() => {
                            isPlaying = true;
                            setToggleIcon();
                        });
                    }
                    showAutoplayPrompt();
                    document.addEventListener('click', onFirstInteract);
                    document.addEventListener('keydown', onFirstInteract);
                });
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();