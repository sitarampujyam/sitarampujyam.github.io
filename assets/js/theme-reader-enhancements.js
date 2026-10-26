/**
 * Liquid Glass Theme Sub-Modes & Reader Typography Customizer
 * Sitaram Pujyam's Personal Site
 */
(function () {
  'use strict';

  // DOM Elements
  const docEl = document.documentElement;
  const subThemeBtn = document.getElementById('sub-theme-toggle-btn');
  const readerBtn = document.getElementById('reader-customizer-btn');
  const readerOverlay = document.getElementById('reader-overlay');
  const readerBackdrop = document.getElementById('reader-backdrop');
  const readerCloseBtn = document.getElementById('reader-close-btn');
  const readerDoneBtn = document.getElementById('reader-done-btn');
  const readerResetBtn = document.getElementById('reader-reset-btn');

  // Reader Controls
  const fontButtons = document.querySelectorAll('.reader-font-btn');
  const activeFontName = document.getElementById('reader-active-font-name');
  const sizeSlider = document.getElementById('reader-size-slider');
  const sizeBadge = document.getElementById('reader-size-badge');
  const sizeDownBtn = document.getElementById('reader-size-down');
  const sizeUpBtn = document.getElementById('reader-size-up');
  const spacingButtons = document.querySelectorAll('#reader-spacing-group .reader-seg-btn');
  const widthButtons = document.querySelectorAll('#reader-width-group .reader-seg-btn');
  const alignButtons = document.querySelectorAll('#reader-align-group .reader-seg-btn');

  // Font labels map
  const fontLabels = {
    default: 'Default Sans',
    claude: 'Claude Serif (Anthropic)',
    merriweather: 'Editorial Serif',
    inter: 'Modern Sans',
    mono: 'Code Mono'
  };

  /* ==========================================================================
     1. Theme Sub-Modes (Sepia & Lights Out)
     ========================================================================== */

  function getMasterTheme() {
    return docEl.getAttribute('data-bs-theme') || 'light';
  }

  function getLightScheme() {
    return localStorage.getItem('site-light-scheme') || 'sepia';
  }

  function getDarkScheme() {
    return localStorage.getItem('site-dark-scheme') || 'lights-out';
  }

  function applySubThemes() {
    const light = getLightScheme();
    const dark = getDarkScheme();
    docEl.setAttribute('data-light-scheme', light);
    docEl.setAttribute('data-dark-scheme', dark);
    updateSubThemeButtonUI();
  }

  function updateSubThemeButtonUI() {
    if (!subThemeBtn) return;
    const isDark = getMasterTheme() === 'dark';
    const light = getLightScheme();
    const dark = getDarkScheme();

    // Toggle button aria-label & titles
    if (isDark) {
      subThemeBtn.setAttribute(
        'title',
        dark === 'lights-out'
          ? 'Current: Lights Out (OLED Pitch Black) — Click for Subtle Dim'
          : 'Current: Subtle Dim (Charcoal) — Click for Lights Out (OLED Pitch Black)'
      );
    } else {
      subThemeBtn.setAttribute(
        'title',
        light === 'sepia'
          ? 'Current: Kindle Sepia (Warm Parchment) — Click for Pure White'
          : 'Current: Pure White — Click for Kindle Sepia (Warm Parchment)'
      );
    }
  }

  function toggleSubTheme() {
    const isDark = getMasterTheme() === 'dark';

    if (isDark) {
      const currentDark = getDarkScheme();
      const nextDark = currentDark === 'lights-out' ? 'dim' : 'lights-out';
      localStorage.setItem('site-dark-scheme', nextDark);
      docEl.setAttribute('data-dark-scheme', nextDark);
    } else {
      const currentLight = getLightScheme();
      const nextLight = currentLight === 'sepia' ? 'white' : 'sepia';
      localStorage.setItem('site-light-scheme', nextLight);
      docEl.setAttribute('data-light-scheme', nextLight);
    }

    updateSubThemeButtonUI();
  }

  if (subThemeBtn) {
    subThemeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      toggleSubTheme();
    });
  }

  // Observe master theme changes (when user toggles dark/light in sidebar)
  const themeObserver = new MutationObserver(function (mutations) {
    for (let m of mutations) {
      if (m.attributeName === 'data-bs-theme') {
        updateSubThemeButtonUI();
      }
    }
  });
  themeObserver.observe(docEl, { attributes: true });

  window.addEventListener('message', function (e) {
    if (e.data && e.data.id === 'theme-updated') {
      updateSubThemeButtonUI();
    }
  });

  /* ==========================================================================
     2. Reader Typography & Layout Customizer
     ========================================================================== */

  function openReaderModal() {
    if (!readerOverlay) return;
    syncReaderUIFromDOM();
    readerOverlay.classList.remove('d-none');
    // Force reflow for smooth transition
    void readerOverlay.offsetWidth;
    readerOverlay.classList.add('active');
    readerOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('reader-modal-open');
  }

  function closeReaderModal() {
    if (!readerOverlay) return;
    readerOverlay.classList.remove('active');
    readerOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('reader-modal-open');
    setTimeout(function () {
      if (!readerOverlay.classList.contains('active')) {
        readerOverlay.classList.add('d-none');
      }
    }, 280);
  }

  if (readerBtn) {
    readerBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openReaderModal();
    });
  }

  if (readerCloseBtn) readerCloseBtn.addEventListener('click', closeReaderModal);
  if (readerDoneBtn) readerDoneBtn.addEventListener('click', closeReaderModal);
  if (readerBackdrop) readerBackdrop.addEventListener('click', closeReaderModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && readerOverlay && readerOverlay.classList.contains('active')) {
      closeReaderModal();
    }
  });

  // Font Selection
  function setReaderFont(fontKey) {
    docEl.setAttribute('data-reader-font', fontKey);
    localStorage.setItem('reader-font', fontKey);

    fontButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.font === fontKey);
    });

    if (activeFontName) {
      activeFontName.textContent = fontLabels[fontKey] || fontKey;
    }
  }

  fontButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setReaderFont(this.dataset.font);
    });
  });

  // Font Size
  function setReaderSize(val) {
    const size = Math.max(80, Math.min(140, parseInt(val, 10)));
    docEl.setAttribute('data-reader-size', size.toString());
    docEl.style.setProperty('--reader-font-scale', (size / 100).toString());
    localStorage.setItem('reader-size', size.toString());

    if (sizeSlider) sizeSlider.value = size;
    if (sizeBadge) sizeBadge.textContent = size + '%';
  }

  if (sizeSlider) {
    sizeSlider.addEventListener('input', function () {
      setReaderSize(this.value);
    });
  }

  if (sizeDownBtn) {
    sizeDownBtn.addEventListener('click', function () {
      const current = parseInt(sizeSlider ? sizeSlider.value : (docEl.getAttribute('data-reader-size') || 100), 10);
      setReaderSize(current - 5);
    });
  }

  if (sizeUpBtn) {
    sizeUpBtn.addEventListener('click', function () {
      const current = parseInt(sizeSlider ? sizeSlider.value : (docEl.getAttribute('data-reader-size') || 100), 10);
      setReaderSize(current + 5);
    });
  }

  // Line Spacing
  function setReaderSpacing(spacing) {
    docEl.setAttribute('data-reader-spacing', spacing);
    localStorage.setItem('reader-spacing', spacing);

    spacingButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.spacing === spacing);
    });
  }

  spacingButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setReaderSpacing(this.dataset.spacing);
    });
  });

  // Reading Column Width
  function setReaderWidth(width) {
    docEl.setAttribute('data-reader-width', width);
    localStorage.setItem('reader-width', width);

    widthButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.width === width);
    });
  }

  widthButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setReaderWidth(this.dataset.width);
    });
  });

  // Alignment
  function setReaderAlign(align) {
    docEl.setAttribute('data-reader-align', align);
    localStorage.setItem('reader-align', align);

    alignButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.align === align);
    });
  }

  alignButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setReaderAlign(this.dataset.align);
    });
  });

  // Reset to Defaults
  if (readerResetBtn) {
    readerResetBtn.addEventListener('click', function () {
      setReaderFont('default');
      setReaderSize(100);
      setReaderSpacing('normal');
      setReaderWidth('normal');
      setReaderAlign('justify');
    });
  }

  // Sync UI from DOM attributes
  function syncReaderUIFromDOM() {
    const currentFont = docEl.getAttribute('data-reader-font') || 'default';
    const currentSize = docEl.getAttribute('data-reader-size') || '100';
    const currentSpacing = docEl.getAttribute('data-reader-spacing') || 'normal';
    const currentWidth = docEl.getAttribute('data-reader-width') || 'normal';
    const currentAlign = docEl.getAttribute('data-reader-align') || 'justify';

    fontButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.font === currentFont);
    });
    if (activeFontName) {
      activeFontName.textContent = fontLabels[currentFont] || currentFont;
    }

    if (sizeSlider) sizeSlider.value = currentSize;
    if (sizeBadge) sizeBadge.textContent = currentSize + '%';

    spacingButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.spacing === currentSpacing);
    });

    widthButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.width === currentWidth);
    });

    alignButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.align === currentAlign);
    });
  }

  // Initial setup
  applySubThemes();
  syncReaderUIFromDOM();

  // Support URL parameters for testing & direct link presets (e.g. ?theme=light&light=sepia&reader=open)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('theme')) {
      const t = params.get('theme');
      docEl.setAttribute('data-bs-theme', t);
    }
    if (params.has('light')) {
      const l = params.get('light');
      localStorage.setItem('site-light-scheme', l);
      docEl.setAttribute('data-light-scheme', l);
    }
    if (params.has('dark')) {
      const d = params.get('dark');
      localStorage.setItem('site-dark-scheme', d);
      docEl.setAttribute('data-dark-scheme', d);
    }
    if (params.has('font')) {
      setReaderFont(params.get('font'));
    }
    if (params.has('size')) {
      setReaderSize(params.get('size'));
    }
    if (params.has('spacing')) {
      setReaderSpacing(params.get('spacing'));
    }
    if (params.has('width')) {
      setReaderWidth(params.get('width'));
    }
    if (params.has('align')) {
      setReaderAlign(params.get('align'));
    }
    updateSubThemeButtonUI();

    if (params.get('reader') === 'open') {
      setTimeout(openReaderModal, 150);
    }
  } catch (err) {
    console.warn('URL params init error:', err);
  }
})();
