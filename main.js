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
