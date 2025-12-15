/* global Reveal */
(function () {
  // Slide-Vibing runtime (no-build)
  // --- Minimal reactive core (signals/memos/effects), no build required ---
  // Inspired by Solid's fine-grained reactivity; intentionally tiny.
  let _currentComputation = null;
  let _batchDepth = 0;
  const _pendingComputations = new Set();

  function _scheduleComputation(computation) {
    if (_batchDepth > 0) {
      _pendingComputations.add(computation);
      return;
    }
    computation._run();
  }

  function batch(fn) {
    _batchDepth++;
    try {
      return fn();
    } finally {
      _batchDepth--;
      if (_batchDepth === 0 && _pendingComputations.size) {
        const toRun = Array.from(_pendingComputations);
        _pendingComputations.clear();
        for (const c of toRun) c._run();
      }
    }
  }

  function untrack(fn) {
    const prev = _currentComputation;
    _currentComputation = null;
    try {
      return fn();
    } finally {
      _currentComputation = prev;
    }
  }

  function createSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    function read() {
      if (_currentComputation) {
        subscribers.add(_currentComputation);
        _currentComputation._sources.add(subscribers);
      }
      return value;
    }

    function write(nextValue) {
      value = nextValue;
      for (const sub of Array.from(subscribers)) _scheduleComputation(sub);
    }

    return [read, write];
  }

  function createEffect(fn) {
    const computation = {
      _sources: new Set(),
      _run() {
        for (const source of this._sources) source.delete(this);
        this._sources.clear();
        const prev = _currentComputation;
        _currentComputation = this;
        try {
          fn();
        } finally {
          _currentComputation = prev;
        }
      }
    };
    computation._run();
    return computation;
  }

  function createMemo(fn) {
    const [value, setValue] = createSignal(undefined);
    createEffect(() => setValue(fn()));
    return value;
  }

  function generateCuid() {
    if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') {
      return `c${crypto.randomUUID().replaceAll('-', '')}`;
    }
    return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }

  function generateSlideId() {
    return `slide-${generateCuid()}`;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (Number.isNaN(seconds)) return '';
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function hasReveal() {
    return typeof Reveal !== 'undefined' && Reveal && typeof Reveal.on === 'function';
  }

  function isPrintPdfMode() {
    return window.location.search.includes('print-pdf');
  }

  function createLocalCommentsStore(storageKey) {
    return {
      // Synchronous for immediate response
      list() {
        try {
          return JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch {
          return [];
        }
      },
      putAll(comments) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(comments));
        } catch (e) {
          console.warn('Failed to save comments to localStorage:', e);
        }
      },
      // Store pending changes separately for robust sync
      getPending() {
        try {
          return JSON.parse(localStorage.getItem(`${storageKey}:pending`) || '{}');
        } catch {
          return {};
        }
      },
      setPending(pending) {
        try {
          localStorage.setItem(`${storageKey}:pending`, JSON.stringify(pending));
        } catch (e) {
          console.warn('Failed to save pending changes:', e);
        }
      }
    };
  }

  // Generate a content hash for conflict detection
  function commentContentHash(c) {
    return `${c.text}|${c.resolved}|${c.x?.toFixed(2)}|${c.y?.toFixed(2)}`;
  }

  // Check if two comments are meaningfully different
  function commentsAreDifferent(a, b) {
    if (!a || !b) return true;
    return a.text !== b.text ||
           a.resolved !== b.resolved ||
           Math.abs((a.x || 0) - (b.x || 0)) > 0.01 ||
           Math.abs((a.y || 0) - (b.y || 0)) > 0.01;
  }

  function createPowerAutomateCommentsApi({ readUrl, writeUrl, updateUrl, deleteUrl, apiKey }) {
    if (!readUrl || !writeUrl || !updateUrl || !deleteUrl) {
      throw new Error('Power Automate comment API requires readUrl/writeUrl/updateUrl/deleteUrl');
    }
    if (!apiKey) {
      throw new Error('Power Automate comment API requires apiKey (X-Api-Key)');
    }

    function apiRequest(url, body = null) {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey
        }
      };
      if (body) options.body = JSON.stringify(body);
      return fetch(url, options);
    }

    function mapServerItemsToComments(items) {
      return (items || [])
        .map((item) => {
          let authorName = item.Author;
          if (typeof authorName === 'object' && authorName !== null) {
            authorName = authorName.Title || authorName.DisplayName || authorName.Email || '';
          }
          if (!authorName || authorName === 'Ludo Fourrage') {
            authorName = item.CommentAuthor || item.commentauthor || item.author || '';
          }
          return {
            id: item.CommentId || item.ID?.toString(),
            parentId: item.ParentId || '',
            author: authorName || '',
            text: item.CommentText || '',
            x: parseFloat(item.PositionX) || 0,
            y: parseFloat(item.PositionY) || 0,
            slideId: item.SlideId || undefined,
            resolved: item.Resolved || false,
            createdAt: item.CreatedAt || item.Created,
            updatedAt: item.UpdatedAt || item.Modified || item.CreatedAt || item.Created
          };
        })
        .filter((c) => c.id);
    }

    return {
      async list() {
        const response = await apiRequest(readUrl);
        if (!response.ok) throw new Error(`Failed to load: ${response.status}`);
        const data = await response.json();
        const items = data?.value || data || [];
        return mapServerItemsToComments(items);
      },
      async create(comment, defaultSlideId) {
        const now = new Date().toISOString();
        const response = await apiRequest(writeUrl, {
          id: comment.id,
          parentId: comment.parentId || '',
          author: comment.author,
          text: comment.text,
          x: comment.x || 0,
          y: comment.y || 0,
          slideId: comment.slideId || defaultSlideId,
          resolved: comment.resolved || false,
          createdAt: comment.createdAt || now,
          updatedAt: comment.updatedAt || now
        });
        if (!response.ok) throw new Error(`Save failed: ${response.status}`);
        return { ...comment, updatedAt: now };
      },
      async update({ id, text, resolved, x, y }) {
        const now = new Date().toISOString();
        const payload = { id, updatedAt: now };
        if (typeof text === 'string') payload.text = text;
        if (typeof resolved === 'boolean') payload.resolved = resolved;
        if (typeof x === 'number') payload.x = x;
        if (typeof y === 'number') payload.y = y;
        const response = await apiRequest(updateUrl, payload);
        if (!response.ok) throw new Error(`Update failed: ${response.status}`);
        return { updatedAt: now };
      },
      async delete(id) {
        const response = await apiRequest(deleteUrl, { id });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
      }
    };
  }

  function getSlideSurfaces(selector) {
    let nodes;
    // Use Reveal.getSlides() when available for consistency with Reveal's internal state
    if (hasReveal() && typeof Reveal.getSlides === 'function') {
      const slides = Reveal.getSlides();
      // Each Reveal slide is a <section>, find nested elements with data-slide-id
      nodes = slides.map((section) => {
        const surfaceEl = section.querySelector('[data-slide-id]');
        return surfaceEl || section;
      });
    } else {
      nodes = Array.from(document.querySelectorAll(selector));
    }
    return nodes
      .map((el) => ({
        el,
        id: el.getAttribute('data-slide-id') || el.id || '',
        title: el.getAttribute('data-slide-title') || ''
      }))
      .filter((s) => s.id);
  }

  function getNumberedSurfaces(surfaces) {
    return surfaces.filter((s) => {
      const section = s.el.closest('section');
      return !(section && section.getAttribute('data-slide-kind') === 'cover');
    });
  }

  function findSurfaceByViewportCenter(surfaces) {
    // Prefer Reveal.js API when available for accurate current slide detection
    if (hasReveal() && typeof Reveal.getCurrentSlide === 'function') {
      const currentSlide = Reveal.getCurrentSlide();
      if (currentSlide) {
        const slideEl = currentSlide.querySelector('[data-slide-id]') || currentSlide;
        const slideId = slideEl.getAttribute('data-slide-id');
        if (slideId) {
          const match = surfaces.find((s) => s.id === slideId);
          if (match) return match;
        }
      }
    }

    // Fallback: manual viewport center detection
    const viewportCenter = window.innerHeight / 2;
    let best = null;
    let bestDistance = Infinity;
    for (const surface of surfaces) {
      const rect = surface.el.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) continue;
      if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) return surface;
      const surfaceCenter = (rect.top + rect.bottom) / 2;
      const distance = Math.abs(surfaceCenter - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = surface;
      }
    }
    return best;
  }

  function initNav({ surfaces }) {
    const byId = new Map(surfaces.map((s) => [s.id, s]));

    function isScrollView() {
      if (!hasReveal() || typeof Reveal.getConfig !== 'function') return false;
      const config = Reveal.getConfig();
      return config.view === 'scroll';
    }

    function scrollToId(id) {
      const surface = byId.get(id);
      if (!surface) return;
      // In scroll view mode, use native scroll (Reveal.slide() doesn't scroll properly)
      if (isScrollView()) {
        surface.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // Use Reveal.js slide() for traditional view
      if (hasReveal() && typeof Reveal.slide === 'function') {
        const idx = surfaces.findIndex((s) => s.id === id);
        if (idx >= 0) {
          Reveal.slide(idx);
          return;
        }
      }
      // Fallback to native scroll
      surface.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function currentIndex() {
      // Use Reveal.js getIndices() if available
      if (hasReveal() && typeof Reveal.getIndices === 'function') {
        const indices = Reveal.getIndices();
        if (indices) return indices.h;
      }
      // Fallback to viewport detection
      const cur = findSurfaceByViewportCenter(surfaces);
      if (!cur) return 0;
      return Math.max(0, surfaces.findIndex((s) => s.id === cur.id));
    }

    function scrollToIndex(i) {
      const idx = clamp(i, 0, surfaces.length - 1);
      const surface = surfaces[idx];
      if (!surface) return;
      // In scroll view mode, use native scroll (Reveal.slide() doesn't scroll properly)
      if (isScrollView()) {
        surface.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // Use Reveal.js slide() for traditional view
      if (hasReveal() && typeof Reveal.slide === 'function') {
        Reveal.slide(idx);
        return;
      }
      // Fallback to native scroll
      surface.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-sv-nav],[data-sv-scroll-to]');
      if (!target) return;

      if (target.hasAttribute('data-sv-scroll-to')) {
        e.preventDefault();
        scrollToId(target.getAttribute('data-sv-scroll-to'));
        return;
      }

      const action = target.getAttribute('data-sv-nav');
      if (!action) return;
      e.preventDefault();

      // Use Reveal.js navigation methods when available (next/prev work in scroll view)
      if (hasReveal()) {
        if (action === 'next' && typeof Reveal.next === 'function') { Reveal.next(); return; }
        if (action === 'prev' && typeof Reveal.prev === 'function') { Reveal.prev(); return; }
      }
      // Use scrollToIndex for first/last (handles scroll view properly via native scroll)
      if (action === 'first') { scrollToIndex(0); return; }
      if (action === 'last') { scrollToIndex(surfaces.length - 1); return; }

      // Fallback to index-based navigation
      const idx = currentIndex();
      if (action === 'next') scrollToIndex(idx + 1);
      if (action === 'prev') scrollToIndex(idx - 1);
    });

    return { scrollToId, currentIndex };
  }

  function initNumbering({ surfaces, numberedSurfaces }) {
    // Use Reveal.getTotalSlides() if available, but fall back to counted surfaces
    // Note: numberedSurfaces excludes cover slides, so we use our own count
    const total = numberedSurfaces.length;
    const numberedIndexMap = new Map(numberedSurfaces.map((s, idx) => [s.id, idx + 1]));

    function updateSurface(surface) {
      const isCover = surface.el.closest('section')?.getAttribute('data-slide-kind') === 'cover';
      const indexEl = surface.el.querySelector('[data-sv-slide-index]');
      const totalEl = surface.el.querySelector('[data-sv-slide-total]');

      if (isCover) {
        if (indexEl) indexEl.textContent = '';
        if (totalEl) totalEl.textContent = '';
        return;
      }

      // Get slide number from pre-computed map (excludes cover)
      const slideNum = numberedIndexMap.get(surface.id) || 0;
      if (indexEl) indexEl.textContent = String(slideNum);
      if (totalEl) totalEl.textContent = String(total);
    }

    function updateAll() {
      for (const s of surfaces) updateSurface(s);
    }

    updateAll();
    return { updateAll };
  }

  function initPdf({ deckId, pdf, surfaces }) {
    const button = document.getElementById(pdf.buttonId);
    if (!button) return { updateUnlock: () => {} };

    // If custom unlockKey provided, use it as-is; otherwise namespace with deckId
    const unlockKey = pdf.unlockKey || `svDeckCompleted:${deckId}`;
    if (localStorage.getItem(unlockKey) === 'true') button.classList.remove('sv-hidden');

    function openPrint() {
      const url = new URL(window.location.href);
      url.searchParams.set('print-pdf', '');
      window.open(url.toString(), '_blank');
    }

    button.addEventListener('click', () => {
      button.disabled = true;
      // Update text - prefer nested span/text element to preserve icons
      const textEl = button.querySelector('span') || button;
      const originalText = textEl.textContent;
      textEl.textContent = 'Preparing...';
      openPrint();
      setTimeout(() => {
        button.disabled = false;
        textEl.textContent = originalText || 'Download PDF';
      }, 600);
    });

    if (isPrintPdfMode()) {
      setTimeout(() => {
        window.print();
        setTimeout(() => window.close(), 800);
      }, 700);
    }

    function updateUnlock(currentSurfaceId) {
      if (!pdf.unlockOnLastSlide) return;

      let isAtEnd = false;

      // Use Reveal.getProgress() when available for accurate progress detection
      if (hasReveal() && typeof Reveal.getProgress === 'function') {
        isAtEnd = Reveal.getProgress() >= 0.99;
      } else {
        // Fallback: check if current surface is the last one
        const last = surfaces[surfaces.length - 1];
        isAtEnd = last && currentSurfaceId === last.id;
      }

      if (isAtEnd) {
        localStorage.setItem(unlockKey, 'true');
        button.classList.remove('sv-hidden');
      }
    }

    return { updateUnlock };
  }

  function initCanvasControllers({ controllers, getCurrentSurfaceId }) {
    const instances = [];

    for (const controller of controllers || []) {
      const canvas = document.getElementById(controller.canvasId);
      if (!canvas) continue;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      let isPlaying = false;
      let rafId = null;
      let startTime = null;
      let pausedAt = 0;
      let showFinalState = true;

      function drawFrame(now) {
        if (startTime == null) startTime = now;
        const elapsed = isPlaying ? (now - startTime) : pausedAt;
        const t = showFinalState ? 10_000 : elapsed;

        controller.draw({
          ctx,
          width: canvas.width,
          height: canvas.height,
          t,
          isPlaying
        });

        if (isPlaying) rafId = requestAnimationFrame(drawFrame);
      }

      function stop() {
        isPlaying = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      }

      function start() {
        showFinalState = false;
        isPlaying = true;
        startTime = performance.now() - pausedAt;
        if (!rafId) rafId = requestAnimationFrame(drawFrame);
      }

      canvas.style.cursor = 'pointer';
      canvas.addEventListener('click', () => {
        if (isPrintPdfMode()) return;
        if (!isPlaying) start();
        else {
          stop();
          pausedAt = performance.now() - (startTime || performance.now());
          requestAnimationFrame(drawFrame);
        }
      });

      function onActiveSurfaceChanged(activeSurfaceId) {
        if (!controller.slideId) return;
        if (activeSurfaceId !== controller.slideId) {
          stop();
          showFinalState = true;
          pausedAt = 0;
          startTime = null;
          requestAnimationFrame(drawFrame);
        }
      }

      instances.push({ onActiveSurfaceChanged });
      requestAnimationFrame(drawFrame);
    }

    function update() {
      const active = getCurrentSurfaceId();
      for (const inst of instances) inst.onActiveSurfaceChanged(active);
    }

    return { update };
  }

  // Default UI element IDs for comment system
  const DEFAULT_COMMENT_UI = {
    toggleId: 'svCommentToggle',
    countId: 'svCommentCount',
    syncDotId: 'svSyncDot',
    syncStatusId: 'svSyncStatus',
    markersId: 'svCommentMarkers',
    inlineId: 'svInlineComments',
    panelId: 'svCommentPanel',
    panelTitleId: 'svPanelTitle',
    panelBodyId: 'svPanelBody',
    closePanelId: 'svClosePanel',
    nameModalId: 'svNameModal',
    nameInputId: 'svNameInput',
    nameSubmitId: 'svNameSubmit',
    confirmModalId: 'svConfirmModal',
    confirmTitleId: 'svConfirmTitle',
    confirmMessageId: 'svConfirmMessage',
    confirmDeleteId: 'svConfirmDelete',
    confirmCancelId: 'svConfirmCancel'
  };

  // Inject comment UI HTML if not present in document
  function injectCommentUI() {
    // Check if UI already exists
    if (document.getElementById(DEFAULT_COMMENT_UI.toggleId)) return;

    const html = `
      <!-- Slide-Vibing Comment UI (auto-injected) -->
      <div class="sv-ui">
        <button id="${DEFAULT_COMMENT_UI.toggleId}" class="sv-btn sv-btn-comments" type="button" title="Toggle comments">
          <span id="${DEFAULT_COMMENT_UI.syncDotId}" class="sv-sync-dot"></span>
          <span>Comments</span>
          <span id="${DEFAULT_COMMENT_UI.countId}" class="sv-badge">0</span>
        </button>
        <span id="${DEFAULT_COMMENT_UI.syncStatusId}" class="sv-hidden"></span>
      </div>

      <div id="${DEFAULT_COMMENT_UI.markersId}"></div>
      <div id="${DEFAULT_COMMENT_UI.inlineId}"></div>

      <div id="${DEFAULT_COMMENT_UI.panelId}" class="sv-panel" aria-hidden="true">
        <div class="sv-panel-header">
          <div id="${DEFAULT_COMMENT_UI.panelTitleId}" class="sv-panel-title">Comment</div>
          <button id="${DEFAULT_COMMENT_UI.closePanelId}" class="sv-panel-close" type="button" aria-label="Close">&times;</button>
        </div>
        <div id="${DEFAULT_COMMENT_UI.panelBodyId}" class="sv-panel-body"></div>
      </div>

      <div id="${DEFAULT_COMMENT_UI.nameModalId}" class="sv-modal sv-hidden" role="dialog" aria-modal="true" aria-label="Enter your name">
        <div class="sv-modal-content">
          <div class="sv-modal-header">
            <h3 class="sv-modal-title">Enter your name</h3>
            <button id="svNameClose" class="sv-modal-close" type="button" aria-label="Close">&times;</button>
          </div>
          <input id="${DEFAULT_COMMENT_UI.nameInputId}" class="sv-input" type="text" placeholder="Your name..." />
          <button id="${DEFAULT_COMMENT_UI.nameSubmitId}" class="sv-btn sv-btn-primary" type="button">Continue</button>
        </div>
      </div>

      <div id="${DEFAULT_COMMENT_UI.confirmModalId}" class="sv-modal sv-hidden" role="dialog" aria-modal="true" aria-label="Confirm action">
        <div class="sv-modal-content">
          <div class="sv-modal-header">
            <h3 class="sv-modal-title" id="${DEFAULT_COMMENT_UI.confirmTitleId}">Delete comment?</h3>
            <button class="sv-modal-close" id="svConfirmClose" type="button" aria-label="Close">&times;</button>
          </div>
          <p id="${DEFAULT_COMMENT_UI.confirmMessageId}" class="sv-confirm-message">This will delete the comment and all its replies. This action cannot be undone.</p>
          <div class="sv-confirm-actions">
            <button id="${DEFAULT_COMMENT_UI.confirmCancelId}" class="sv-btn sv-btn-secondary" type="button">Cancel</button>
            <button id="${DEFAULT_COMMENT_UI.confirmDeleteId}" class="sv-btn sv-btn-danger" type="button">Delete</button>
          </div>
        </div>
      </div>
    `;

    // Insert at beginning of body
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  function initComments({ deckId, surfaces, numberedSurfaces, commentsConfig }) {
    const noopReturn = { updateOnActiveSurfaceChange: () => {}, onSlideChange: () => {} };
    if (!commentsConfig?.enabled) return noopReturn;
    if (isPrintPdfMode()) return noopReturn;

    // Auto-inject comment UI HTML if not present
    injectCommentUI();

    // Merge user-provided UI IDs with defaults
    const ui = { ...DEFAULT_COMMENT_UI, ...(commentsConfig.ui || {}) };
    const toggleBtn = document.getElementById(ui.toggleId);
    const countEl = document.getElementById(ui.countId);
    const syncDotEl = ui.syncDotId ? document.getElementById(ui.syncDotId) : null;
    const markersEl = document.getElementById(ui.markersId);
    const inlineEl = document.getElementById(ui.inlineId);
    const panelEl = document.getElementById(ui.panelId);
    const panelTitleEl = document.getElementById(ui.panelTitleId);
    const panelBodyEl = document.getElementById(ui.panelBodyId);
    const closePanelEl = document.getElementById(ui.closePanelId);
    const nameModalEl = document.getElementById(ui.nameModalId);
    const nameInputEl = document.getElementById(ui.nameInputId);
    const nameSubmitEl = document.getElementById(ui.nameSubmitId);
    const nameCloseEl = nameModalEl?.querySelector('.sv-modal-close');
    const syncStatusEl = document.getElementById(ui.syncStatusId);

    // Confirm modal elements
    const confirmModalEl = document.getElementById(ui.confirmModalId);
    const confirmTitleEl = document.getElementById(ui.confirmTitleId);
    const confirmMessageEl = document.getElementById(ui.confirmMessageId);
    const confirmDeleteEl = document.getElementById(ui.confirmDeleteId);
    const confirmCancelEl = document.getElementById(ui.confirmCancelId);
    const confirmCloseEl = confirmModalEl?.querySelector('.sv-modal-close');

    if (!toggleBtn || !countEl || !markersEl || !inlineEl || !panelEl || !panelTitleEl || !panelBodyEl || !closePanelEl) {
      return noopReturn;
    }

    const storeKey = `sv:comments:${deckId}`;
    const cacheStore = createLocalCommentsStore(storeKey);

    const storageCfg = commentsConfig.storage || { type: 'local' };
    const requireBackend = storageCfg.requireBackend === true;
    let remote = null;
    if (storageCfg.type === 'powerAutomate') {
      try {
        remote = createPowerAutomateCommentsApi({
          readUrl: storageCfg.readUrl,
          writeUrl: storageCfg.writeUrl,
          updateUrl: storageCfg.updateUrl,
          deleteUrl: storageCfg.deleteUrl,
          apiKey: storageCfg.apiKey
        });
      } catch (err) {
        console.error('Comments backend misconfigured; falling back to local mode.', err);
      }
    }

    const pollIntervalMs = storageCfg.pollIntervalMs || 1000;
    const errorAfter = storageCfg.errorAfter || 3;
    const fallbackAfter = storageCfg.fallbackAfter || 10;

    const [comments, setComments] = createSignal([]);
    const [hydrated, setHydrated] = createSignal(false);
    const [activeSurfaceId, setActiveSurfaceId] = createSignal(surfaces[0]?.id || '');

    const [currentUser, setCurrentUser] = createSignal(localStorage.getItem('svCommentUser') || '');
    const [inlineVisible, setInlineVisible] = createSignal(false);
    const [focusedInlineId, setFocusedInlineId] = createSignal(null);
    const [panelState, setPanelState] = createSignal(null); // null | {mode:'new',...} | {mode:'thread', id}
    const [nameModalOpen, setNameModalOpen] = createSignal(false);
    const [pendingAction, setPendingAction] = createSignal(null); // {type:'new'|'reply', ...}
    const [confirmModalOpen, setConfirmModalOpen] = createSignal(false);
    const [pendingDelete, setPendingDelete] = createSignal(null); // { commentId, replyIds }

    let dragState = null;
    let justFinishedDrag = false;
    let isSyncing = false;
    let syncFailCount = 0;
    let useLocalMode = !remote;
    let skipPollUntil = 0;
    let lastSyncHash = '';  // Track if server data actually changed
    let isInitialSync = true;  // First sync shows indicator, subsequent ones are silent

    const bySurfaceId = new Map(surfaces.map((s) => [s.id, s]));
    const numberedIndexById = new Map(numberedSurfaces.map((s, idx) => [s.id, idx + 1]));

    function generateId() {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function setPanelActive(active) {
      panelEl.classList.toggle('sv-active', active);
      panelEl.setAttribute('aria-hidden', active ? 'false' : 'true');
    }

    function positionPanel(screenX, screenY) {
      const panelWidth = 340;
      const panelHeight = 400;
      const margin = 14;

      let left = screenX + 20;
      let top = screenY - 20;

      // Keep panel within viewport
      if (left + panelWidth > window.innerWidth - margin) {
        left = screenX - panelWidth - 20;
      }
      if (left < margin) left = margin;

      if (top + panelHeight > window.innerHeight - margin) {
        top = window.innerHeight - panelHeight - margin;
      }
      if (top < margin) top = margin;

      panelEl.style.left = `${left}px`;
      panelEl.style.top = `${top}px`;
    }

    function getSurfaceRect(surfaceId) {
      const s = bySurfaceId.get(surfaceId);
      if (!s) return null;
      return s.el.getBoundingClientRect();
    }

    const unresolvedCount = createMemo(() => comments().filter((c) => !c.parentId && !c.resolved).length);
    const totalRootCount = createMemo(() => comments().filter((c) => !c.parentId).length);

    function setSyncUI({ dot, text, title } = {}) {
      if (syncDotEl) {
        syncDotEl.classList.remove('sv-syncing', 'sv-error', 'sv-offline');
        if (dot === 'syncing') syncDotEl.classList.add('sv-syncing');
        else if (dot === 'error') syncDotEl.classList.add('sv-error');
        else if (dot === 'offline') syncDotEl.classList.add('sv-offline');
      }
      // Update button title for status tooltip
      if (toggleBtn && typeof text === 'string') {
        toggleBtn.title = text;
      }
    }

    function addExportImportButtons() {
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:14px;right:360px;display:flex;gap:8px;z-index:999;';

      const exportBtn = document.createElement('button');
      exportBtn.textContent = 'Export';
      exportBtn.className = 'sv-btn sv-btn-success';
      exportBtn.onclick = () => {
        const data = JSON.stringify(comments(), null, 2);
        navigator.clipboard.writeText(data).then(() => {
          exportBtn.textContent = 'Copied!';
          setTimeout(() => { exportBtn.textContent = 'Export'; }, 2000);
        });
      };

      const importBtn = document.createElement('button');
      importBtn.textContent = 'Import';
      importBtn.className = 'sv-btn sv-btn-primary';
      importBtn.onclick = async () => {
        try {
          const text = await navigator.clipboard.readText();
          const imported = JSON.parse(text);
          if (Array.isArray(imported)) {
            const existingIds = new Set(comments().map((c) => c.id));
            const next = comments().slice();
            for (const c of imported) {
              if (c && c.id && !existingIds.has(c.id)) next.push(c);
            }
            setComments(next);
            importBtn.textContent = 'Imported!';
            setTimeout(() => { importBtn.textContent = 'Import'; }, 2000);
          }
        } catch {
          alert('Invalid JSON in clipboard');
        }
      };

      container.appendChild(exportBtn);
      container.appendChild(importBtn);
      document.body.appendChild(container);
    }

    function canSyncRemote() {
      return !!remote && !useLocalMode;
    }

    function canWrite() {
      if (requireBackend) return canSyncRemote();
      return true;
    }

    function ensureWritableOrWarn() {
      if (canWrite()) return true;
      setSyncUI({ dot: 'offline', text: 'Offline - comments disabled' });
      alert('Comments require a connection to the backend. Please reload when online.');
      return false;
    }

    // Generate a hash of comments array to detect actual changes
    function computeCommentsHash(commentsList) {
      return commentsList
        .map((c) => `${c.id}:${c.updatedAt || c.createdAt}:${c.text?.length}:${c.resolved}`)
        .sort()
        .join('|');
    }

    // Smart merge: only update comments that actually changed
    function mergeServerComments(serverComments, localComments) {
      const serverMap = new Map(serverComments.map((c) => [c.id, c]));
      const localMap = new Map(localComments.map((c) => [c.id, c]));
      const pendingChanges = cacheStore.getPending();
      const result = [];
      const conflicts = [];

      // Process server comments
      for (const serverComment of serverComments) {
        const localComment = localMap.get(serverComment.id);
        const pending = pendingChanges[serverComment.id];

        if (pending) {
          // We have a pending local change for this comment
          const serverTime = new Date(serverComment.updatedAt || serverComment.createdAt).getTime();
          const pendingTime = new Date(pending.updatedAt || pending.createdAt).getTime();

          if (serverTime > pendingTime) {
            // Server is newer - check for conflict
            if (commentsAreDifferent(pending, serverComment)) {
              conflicts.push({ local: pending, server: serverComment });
            }
            result.push(serverComment);
          } else {
            // Local change is newer or same - keep local version
            result.push({ ...serverComment, ...pending });
          }
        } else if (localComment && commentsAreDifferent(localComment, serverComment)) {
          // Server changed, no pending local change - use server version
          result.push(serverComment);
        } else {
          // No change or no local version - use server
          result.push(serverComment);
        }
      }

      // Add local-only comments (not on server yet) - but only if truly pending
      const deletedFromServer = [];

      for (const localComment of localComments) {
        if (!serverMap.has(localComment.id)) {
          const hasPendingCreate = !!pendingChanges[localComment.id];

          // Only keep if it has a pending change (not yet confirmed by server)
          // Once server has seen it (and it's no longer in pending), trust server state
          if (hasPendingCreate) {
            result.push(localComment);
          } else {
            // Server doesn't have it and no pending local create = deleted from server
            deletedFromServer.push(localComment.id);
          }
        }
      }

      return { merged: result, conflicts, deletedFromServer };
    }

    async function loadRemote(options = {}) {
      const { silent = false, force = false } = options;
      if (!remote || useLocalMode) return;
      if (isSyncing && !force) return;

      isSyncing = true;

      // Only show sync indicator on initial load or explicit refresh, not routine polls
      if (!silent && isInitialSync) {
        setSyncUI({ dot: 'syncing', text: 'Syncing comments...' });
      }

      try {
        const serverComments = await remote.list();

        // Compute hash to check if server data actually changed
        const newHash = computeCommentsHash(serverComments);
        if (newHash === lastSyncHash && !force) {
          // Server data unchanged - skip update to avoid unnecessary re-renders
          syncFailCount = 0;
          return;
        }
        lastSyncHash = newHash;

        // Smart merge with conflict detection
        const { merged, conflicts, deletedFromServer } = mergeServerComments(serverComments, comments());

        // Only update state if something actually changed
        const currentHash = computeCommentsHash(comments());
        const mergedHash = computeCommentsHash(merged);
        if (mergedHash !== currentHash) {
          setComments(merged);
        }

        // Handle conflicts (log for now, could show UI later)
        if (conflicts.length > 0) {
          console.warn('Comment sync conflicts detected:', conflicts);
          // Future: Show conflict resolution UI
        }

        // Log server-side deletions
        if (deletedFromServer.length > 0) {
          console.log('Comments deleted from server:', deletedFromServer);
        }

        // Clear pending changes for synced AND deleted comments
        const serverIds = new Set(serverComments.map((c) => c.id));
        const pendingChanges = cacheStore.getPending();
        let pendingUpdated = false;

        for (const id of Object.keys(pendingChanges)) {
          // Clear if synced to server OR deleted from server
          if (serverIds.has(id) || deletedFromServer.includes(id)) {
            delete pendingChanges[id];
            pendingUpdated = true;
          }
        }
        if (pendingUpdated) {
          cacheStore.setPending(pendingChanges);
        }

        syncFailCount = 0;
        isInitialSync = false;
        if (requireBackend) toggleBtn.disabled = false;
        if (!silent) {
          setSyncUI({ dot: null, text: 'Comments synced' });
        }
      } catch (err) {
        console.error('Load error:', err);
        syncFailCount++;
        if (syncFailCount >= errorAfter) {
          setSyncUI({ dot: 'error', text: 'Sync failed - changes may not be saved' });
        }
        if (requireBackend) toggleBtn.disabled = true;
        if (!requireBackend && syncFailCount >= fallbackAfter && !useLocalMode) {
          useLocalMode = true;
          setSyncUI({
            dot: null,
            text: 'Local mode',
            title: 'Power Automate unavailable. Using local storage. Use Export/Import to share.'
          });
          addExportImportButtons();
        }
      } finally {
        isSyncing = false;
      }
    }

    // Track a pending local change (for conflict detection)
    function trackPendingChange(comment) {
      const pending = cacheStore.getPending();
      pending[comment.id] = {
        ...comment,
        updatedAt: new Date().toISOString()
      };
      cacheStore.setPending(pending);
    }

    // Clear a pending change after successful sync
    function clearPendingChange(commentId) {
      const pending = cacheStore.getPending();
      if (pending[commentId]) {
        delete pending[commentId];
        cacheStore.setPending(pending);
      }
    }

    function rootCommentsForSurface(surfaceId) {
      return comments().filter((c) => !c.parentId && c.slideId === surfaceId);
    }

    function repliesFor(commentId) {
      return comments().filter((c) => c.parentId === commentId);
    }

    function isInViewport(rect) {
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.height > 0;
    }

    function renderMarkers() {
      markersEl.innerHTML = '';

      // Render markers for ALL visible surfaces, not just active one
      for (const surface of surfaces) {
        const rect = surface.el.getBoundingClientRect();
        if (!isInViewport(rect)) continue;

        const surfaceId = surface.id;
        const roots = rootCommentsForSurface(surfaceId);
        roots.forEach((c, index) => {
        const marker = document.createElement('div');
        marker.className = 'sv-marker';
        if (c.resolved) marker.classList.add('sv-marker-resolved');
        if (repliesFor(c.id).length) marker.classList.add('sv-marker-has-replies');

        marker.textContent = String(index + 1);
        marker.style.left = `${rect.left + (c.x / 100) * rect.width}px`;
        marker.style.top = `${rect.top + (c.y / 100) * rect.height}px`;
        marker.dataset.commentId = c.id;

        marker.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          dragState = { commentId: c.id, hasMoved: false };
          marker.classList.add('sv-marker-dragging');
          e.preventDefault();
        });

        marker.addEventListener('click', (e) => {
          e.stopPropagation();
          if (justFinishedDrag) return;
          setPanelState({ mode: 'thread', id: c.id, screenX: e.clientX, screenY: e.clientY });
        });

        markersEl.appendChild(marker);
        });
      }
    }

    function renderInline(surfaceId) {
      inlineEl.innerHTML = '';
      if (!inlineVisible()) return;

      const rect = getSurfaceRect(surfaceId);
      if (!rect) return;

      const roots = rootCommentsForSurface(surfaceId);
      roots.forEach((c, index) => {
        const el = document.createElement('div');
        el.className = 'sv-inline';
        if (c.resolved) el.classList.add('sv-inline-resolved');
        if (focusedInlineId() === c.id) el.classList.add('sv-inline-focused');
        el.style.left = `${rect.left + (c.x / 100) * rect.width + 14}px`;
        el.style.top = `${rect.top + (c.y / 100) * rect.height}px`;
        el.style.zIndex = focusedInlineId() === c.id ? '900' : String(650 + index);
        const replyCount = repliesFor(c.id).length;

        el.innerHTML = `
          <div class="sv-inline-header">
            <div>${escapeHtml(c.author || 'Unknown')}</div>
            <div class="sv-inline-meta">${escapeHtml(timeAgo(c.createdAt))}</div>
          </div>
          <div class="sv-inline-text">${escapeHtml(c.text)}</div>
          ${replyCount ? `<div class="sv-inline-replies">${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}</div>` : ''}
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setFocusedInlineId(c.id);
        });

        inlineEl.appendChild(el);
      });
    }

    function renderNewCommentPanel({ slideId, x, y, quotedText }) {
      panelTitleEl.textContent = 'New Comment';
      panelBodyEl.innerHTML = `
        ${quotedText ? `<div class="sv-comment sv-comment-reply"><div class="sv-text">"${escapeHtml(quotedText)}"</div></div>` : ''}
        <textarea id="svNewCommentInput" class="sv-input" rows="4" placeholder="Write your comment..."></textarea>
        <div class="sv-actions">
          <button id="svCreateCommentBtn" class="sv-btn sv-btn-primary" type="button">Add Comment</button>
          <button id="svCancelCommentBtn" class="sv-btn sv-btn-secondary" type="button">Cancel</button>
        </div>
      `;
      setPanelActive(true);

      document.getElementById('svCancelCommentBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.getSelection()?.removeAllRanges();
        setPanelState(null);
      });
      document.getElementById('svCreateCommentBtn')?.addEventListener('click', () => {
        if (!ensureWritableOrWarn()) return;
        const input = document.getElementById('svNewCommentInput');
        const text = input?.value.trim() || '';
        if (!text) return;
        const now = new Date().toISOString();
        const comment = {
          id: generateId(),
          parentId: '',
          slideId,
          author: currentUser(),
          text,
          x,
          y,
          resolved: false,
          createdAt: now,
          updatedAt: now
        };

        // Optimistic update - UI updates immediately
        const next = comments().slice();
        next.push(comment);
        batch(() => {
          setComments(next);
          setPanelState(null);
        });

        // Track as pending until confirmed by server
        trackPendingChange(comment);

        if (canSyncRemote()) {
          skipPollUntil = Date.now() + 5000;  // Extended to 5s for reliability
          setSyncUI({ dot: 'syncing', text: 'Saving...' });
          void remote.create(comment, slideId).then(() => {
            clearPendingChange(comment.id);
            setSyncUI({ dot: null, text: 'Saved' });
          }).catch((err) => {
            console.error('Save error:', err);
            setSyncUI({ dot: 'error', text: 'Save error - will retry' });
            // Keep pending change for retry on next sync
          });
        }
      });
    }

    function renderThreadPanel(commentId) {
      const c = comments().find((x) => x.id === commentId);
      if (!c) {
        setPanelState(null);
        return;
      }
      const surfaceId = c.slideId;
      const isResolved = c.resolved;

      const roots = rootCommentsForSurface(surfaceId);
      const idx = roots.findIndex((x) => x.id === commentId);
      const slideNo = numberedIndexById.get(surfaceId);
      const slideLabel = slideNo ? `Slide ${slideNo}` : 'Cover';

      panelTitleEl.textContent = `Comment #${idx + 1} • ${slideLabel}${isResolved ? ' ✓' : ''}`;

      // Apply resolved styling to panel
      panelEl.classList.toggle('sv-panel-resolved', isResolved);

      const replies = repliesFor(commentId);
      let html = '';
      html += renderCommentBlock(c, false, isResolved);
      for (const r of replies) html += renderCommentBlock(r, true, isResolved);

      html += `
        <textarea id="svReplyInput" class="sv-input" rows="2" placeholder="Write a reply..."></textarea>
        <div class="sv-actions">
          <button id="svReplyBtn" class="sv-btn sv-btn-primary" type="button">Reply</button>
          ${isResolved ? '' : '<button id="svResolveBtn" class="sv-btn sv-btn-success" type="button">Resolve</button>'}
          <button id="svDeleteBtn" class="sv-btn sv-btn-danger" type="button">Delete</button>
        </div>
      `;

      panelBodyEl.innerHTML = html;
      setPanelActive(true);

      panelBodyEl.querySelectorAll('[data-sv-edit]').forEach((btn) => {
        btn.addEventListener('click', () => showEditInline(btn.getAttribute('data-sv-edit')));
      });

      document.getElementById('svReplyBtn')?.addEventListener('click', () => {
        const input = document.getElementById('svReplyInput');
        const text = input?.value.trim() || '';
        if (!text) return;
        if (!ensureWritableOrWarn()) return;
        if (!currentUser()) {
          batch(() => {
            setPendingAction({ type: 'reply', commentId, text });
            setNameModalOpen(true);
          });
          return;
        }
        const reply = createReply(commentId, text);
        if (reply) {
          trackPendingChange(reply);
          if (canSyncRemote()) {
            skipPollUntil = Date.now() + 5000;
            setSyncUI({ dot: 'syncing', text: 'Saving...' });
            void remote.create(reply, reply.slideId).then(() => {
              clearPendingChange(reply.id);
              setSyncUI({ dot: null, text: 'Saved' });
            }).catch((err) => {
              console.error('Save error:', err);
              setSyncUI({ dot: 'error', text: 'Save error - will retry' });
            });
          }
        }
        setPanelState({ mode: 'thread', id: commentId });
      });

      document.getElementById('svResolveBtn')?.addEventListener('click', () => {
        if (!ensureWritableOrWarn()) return;
        const root = comments().find((x) => x.id === commentId);
        if (!root) return;

        // Optimistic update
        root.resolved = true;
        root.updatedAt = new Date().toISOString();
        batch(() => {
          setComments(comments().slice());
          setPanelState(null);
        });

        trackPendingChange(root);

        if (canSyncRemote()) {
          skipPollUntil = Date.now() + 5000;
          setSyncUI({ dot: 'syncing', text: 'Updating...' });
          void remote.update({ id: root.id, resolved: true, text: root.text }).then(() => {
            clearPendingChange(root.id);
            setSyncUI({ dot: null, text: 'Saved' });
          }).catch((err) => {
            console.error('Update error:', err);
            setSyncUI({ dot: 'error', text: 'Update error - will retry' });
          });
        }
      });

      document.getElementById('svDeleteBtn')?.addEventListener('click', () => {
        if (!ensureWritableOrWarn()) return;
        skipPollUntil = Date.now() + 5000;
        const replyIds = comments().filter((x) => x.parentId === commentId).map((x) => x.id);
        const replyCount = replyIds.length;

        // Show confirm modal instead of browser confirm()
        const message = replyCount > 0
          ? `This will delete the comment and ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}. This action cannot be undone.`
          : 'This will delete the comment. This action cannot be undone.';

        batch(() => {
          setPendingDelete({ commentId, replyIds });
          setConfirmModalOpen(true);
        });
        showConfirmModal('Delete comment?', message);
      });
    }

    function showNameModal() {
      if (!nameModalEl || !nameInputEl) return;
      nameModalEl.classList.remove('sv-hidden');
      nameInputEl.value = currentUser() || '';
      nameInputEl.focus();
    }

    function hideNameModal() {
      nameModalEl?.classList.add('sv-hidden');
    }

    function showConfirmModal(title, message) {
      if (!confirmModalEl) return;
      if (confirmTitleEl) confirmTitleEl.textContent = title || 'Confirm';
      if (confirmMessageEl) confirmMessageEl.textContent = message || 'Are you sure?';
      confirmModalEl.classList.remove('sv-hidden');
    }

    function hideConfirmModal() {
      confirmModalEl?.classList.add('sv-hidden');
      setPendingDelete(null);
    }

    function executeDelete() {
      const deleteInfo = pendingDelete();
      if (!deleteInfo) return;

      const { commentId, replyIds } = deleteInfo;
      const idsToDelete = [commentId, ...replyIds];

      batch(() => {
        setComments(comments().filter((x) => x.id !== commentId && x.parentId !== commentId));
        setPanelState(null);
        setConfirmModalOpen(false);
      });

      if (canSyncRemote()) {
        setSyncUI({ dot: 'syncing', text: 'Deleting...' });
        void Promise.all(idsToDelete.map((id) => remote.delete(id))).then(() => {
          setSyncUI({ dot: null, text: 'Comments synced' });
        }).catch((err) => {
          console.error('Delete error:', err);
          setSyncUI({ dot: 'error', text: 'Sync failed - changes may not be saved' });
        });
      }
    }

    function handleNameSubmit() {
      if (!nameInputEl) return;
      const name = nameInputEl.value.trim();
      if (!name) return;
      batch(() => {
        setCurrentUser(name);
        setNameModalOpen(false);
      });
      localStorage.setItem('svCommentUser', name);

      const a = pendingAction();
      if (a) {
        setPendingAction(null);
        if (a.type === 'new') setPanelState({ mode: 'new', slideId: a.slideId, x: a.x, y: a.y, quotedText: a.quotedText, screenX: a.screenX, screenY: a.screenY });
        if (a.type === 'reply') setPanelState({ mode: 'thread', id: a.commentId, screenX: a.screenX, screenY: a.screenY });
      }
    }

    function renderCommentBlock(comment, isReply, isResolved = false) {
      const author = escapeHtml(comment.author || 'Unknown');
      const when = escapeHtml(timeAgo(comment.createdAt));
      const text = escapeHtml(comment.text || '');
      const resolvedClass = isResolved ? 'sv-comment-resolved' : '';
      return `
        <div class="sv-comment ${isReply ? 'sv-comment-reply' : ''} ${resolvedClass}">
          <div class="sv-comment-top">
            <div><span class="sv-author">${author}</span> <span class="sv-time">${when}</span></div>
            <button class="sv-btn sv-btn-secondary" type="button" data-sv-edit="${escapeHtml(comment.id)}">Edit</button>
          </div>
          <div class="sv-text" data-sv-text-for="${escapeHtml(comment.id)}">${text}</div>
        </div>
      `;
    }

    function showEditInline(commentId) {
      const c = comments().find((x) => x.id === commentId);
      if (!c) return;
      const selector = `[data-sv-text-for="${CSS.escape(commentId)}"]`;
      const textEl = panelBodyEl.querySelector(selector);
      if (!textEl) return;

      const textarea = document.createElement('textarea');
      textarea.className = 'sv-input';
      textarea.rows = 3;
      textarea.value = c.text || '';
      textEl.replaceWith(textarea);

      const wrap = document.createElement('div');
      wrap.className = 'sv-actions';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'sv-btn sv-btn-primary';
      saveBtn.type = 'button';
      saveBtn.textContent = 'Save edit';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'sv-btn sv-btn-secondary';
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';

      wrap.appendChild(saveBtn);
      wrap.appendChild(cancelBtn);
      textarea.insertAdjacentElement('afterend', wrap);
      textarea.focus();

      cancelBtn.addEventListener('click', () => {
        const state = panelState();
        if (state?.mode === 'thread') setPanelState({ mode: 'thread', id: state.id });
      });
      saveBtn.addEventListener('click', () => {
        const newText = textarea.value.trim();
        if (!newText || newText === c.text) {
          const state = panelState();
          if (state?.mode === 'thread') setPanelState({ mode: 'thread', id: state.id });
          return;
        }
        if (!ensureWritableOrWarn()) return;

        // Optimistic update
        c.text = newText;
        c.updatedAt = new Date().toISOString();
        setComments(comments().slice());

        trackPendingChange(c);

        if (canSyncRemote()) {
          skipPollUntil = Date.now() + 5000;
          setSyncUI({ dot: 'syncing', text: 'Updating...' });
          void remote.update({ id: c.id, text: newText }).then(() => {
            clearPendingChange(c.id);
            setSyncUI({ dot: null, text: 'Saved' });
          }).catch((err) => {
            console.error('Update error:', err);
            setSyncUI({ dot: 'error', text: 'Update error - will retry' });
          });
        }
        const state = panelState();
        if (state?.mode === 'thread') setPanelState({ mode: 'thread', id: state.id });
      });
    }

    function createReply(parentId, text) {
      const parent = comments().find((x) => x.id === parentId);
      if (!parent) return;
      if (!ensureWritableOrWarn()) return null;
      const now = new Date().toISOString();
      const reply = {
        id: generateId(),
        parentId,
        slideId: parent.slideId,
        author: currentUser(),
        text,
        x: parent.x,
        y: parent.y,
        resolved: false,
        createdAt: now,
        updatedAt: now
      };
      const next = comments().slice();
      next.push(reply);
      setComments(next);
      return reply;
    }

    function showNewCommentForm(draft) {
      setPanelState(draft);
    }

    // Expand selected text to full sentence(s)
    function expandToFullSentence(text, container) {
      // Walk up to find a meaningful text container
      let element = container;
      while (element && element.nodeType !== 1) {
        element = element.parentNode;
      }

      // Get full text from the element or its parent block
      const blockTags = ['P', 'DIV', 'LI', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'LABEL'];
      while (element && !blockTags.includes(element.tagName)) {
        element = element.parentNode;
      }
      if (!element) return text;

      const fullText = element.textContent || '';
      const selectionStart = fullText.indexOf(text);
      if (selectionStart === -1) return text;
      const selectionEnd = selectionStart + text.length;

      // Sentence boundary patterns
      const sentenceEnders = /[.!?]/;
      const bulletPattern = /^[\s]*[•\-\*\d]+[.\):]?\s*/;

      // Find the start of the sentence
      let sentenceStart = selectionStart;
      for (let i = selectionStart - 1; i >= 0; i--) {
        const char = fullText[i];
        if (sentenceEnders.test(char)) {
          sentenceStart = i + 1;
          while (sentenceStart < selectionStart && /\s/.test(fullText[sentenceStart])) {
            sentenceStart++;
          }
          break;
        }
        if (i === 0) {
          sentenceStart = 0;
        }
      }

      // Find the end of the sentence
      let sentenceEnd = selectionEnd;
      for (let i = selectionEnd; i < fullText.length; i++) {
        const char = fullText[i];
        if (sentenceEnders.test(char)) {
          sentenceEnd = i + 1;
          break;
        }
        if (i === fullText.length - 1) {
          sentenceEnd = fullText.length;
        }
      }

      // Extract and clean up
      let sentence = fullText.substring(sentenceStart, sentenceEnd).trim();
      sentence = sentence.replace(bulletPattern, '');

      // If too long, fall back to context around selection
      if (sentence.length > 200) {
        const contextStart = Math.max(0, selectionStart - 30);
        const contextEnd = Math.min(fullText.length, selectionEnd + 30);
        sentence = fullText.substring(contextStart, contextEnd).trim();
        if (contextStart > 0) sentence = '...' + sentence;
        if (contextEnd < fullText.length) sentence = sentence + '...';
      }

      return sentence || text;
    }

    function selectionToComment() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const selectedText = selection.toString().trim();
      if (!selectedText) return;

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
      if (!container) return;
      if (container.closest?.('.sv-panel') || container.closest?.('.sv-ui') || container.closest?.('.sv-modal')) return;

      const surfaceEl = container.closest?.('[data-slide-id]') || container.closest?.('.sv-slide-surface');
      if (!surfaceEl) return;
      const slideId = surfaceEl.getAttribute('data-slide-id') || surfaceEl.id;
      if (!slideId) return;

      const rect = range.getBoundingClientRect();
      const slideRect = surfaceEl.getBoundingClientRect();
      if (slideRect.width <= 0 || slideRect.height <= 0) return;

      const x = ((rect.right - slideRect.left) / slideRect.width) * 100;
      const y = ((rect.bottom - slideRect.top) / slideRect.height) * 100;

      // Expand selection to full sentence
      const quotedText = expandToFullSentence(selectedText, container);

      if (!ensureWritableOrWarn()) return;
      if (!currentUser()) {
        setPendingAction({ type: 'new', slideId, x, y, quotedText, screenX: rect.right, screenY: rect.bottom });
        setNameModalOpen(true);
        return;
      }

      setPanelState({ mode: 'new', slideId, x, y, quotedText, screenX: rect.right, screenY: rect.bottom });
    }

    function onMouseMove(e) {
      if (!dragState) return;
      const marker = markersEl.querySelector(`[data-comment-id="${CSS.escape(dragState.commentId)}"]`);
      const c = comments().find((x) => x.id === dragState.commentId);
      if (!marker || !c) return;
      dragState.hasMoved = true;

      const rect = getSurfaceRect(c.slideId);
      if (!rect) return;

      const percentX = ((e.clientX - rect.left) / rect.width) * 100;
      const percentY = ((e.clientY - rect.top) / rect.height) * 100;
      c.x = clamp(percentX, 0, 100);
      c.y = clamp(percentY, 0, 100);

      marker.style.left = `${rect.left + (c.x / 100) * rect.width}px`;
      marker.style.top = `${rect.top + (c.y / 100) * rect.height}px`;
      e.preventDefault();
    }

    function onMouseUp() {
      if (!dragState) return;

      // Remove dragging class from marker
      const marker = markersEl.querySelector(`[data-comment-id="${CSS.escape(dragState.commentId)}"]`);
      if (marker) marker.classList.remove('sv-marker-dragging');

      // Only update if actually moved
      if (dragState.hasMoved) {
        const c = comments().find((x) => x.id === dragState.commentId);
        if (c) {
          c.updatedAt = new Date().toISOString();
          setComments(comments().slice());

          trackPendingChange(c);

          if (canSyncRemote()) {
            skipPollUntil = Date.now() + 5000;
            setSyncUI({ dot: 'syncing', text: 'Updating...' });
            void remote.update({ id: c.id, x: c.x, y: c.y }).then(() => {
              clearPendingChange(c.id);
              setSyncUI({ dot: null, text: 'Saved' });
            }).catch((err) => {
              console.error('Position update error:', err);
              setSyncUI({ dot: 'error', text: 'Update error - will retry' });
            });
          }
        }

        justFinishedDrag = true;
        setTimeout(() => (justFinishedDrag = false), 120);
      }

      dragState = null;
    }

    function closePanel() {
      setPanelState(null);
    }

    toggleBtn.addEventListener('click', () => {
      if (requireBackend && !canSyncRemote()) {
        ensureWritableOrWarn();
        return;
      }
      const next = !inlineVisible();
      setInlineVisible(next);
      if (!next) {
        inlineEl.style.display = 'none';
        setFocusedInlineId(null);
        closePanel();
      } else {
        inlineEl.style.display = 'block';
      }
    });

    closePanelEl.addEventListener('click', (e) => {
      e.stopPropagation();
      window.getSelection()?.removeAllRanges();
      closePanel();
    });
    nameSubmitEl?.addEventListener('click', handleNameSubmit);
    nameCloseEl?.addEventListener('click', () => {
      setNameModalOpen(false);
      setPendingAction(null);
    });
    nameInputEl?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleNameSubmit();
    });

    // Confirm modal event listeners
    confirmDeleteEl?.addEventListener('click', () => {
      executeDelete();  // Must run before hideConfirmModal() which clears pendingDelete
      hideConfirmModal();
    });
    confirmCancelEl?.addEventListener('click', hideConfirmModal);
    confirmCloseEl?.addEventListener('click', hideConfirmModal);

    document.addEventListener('mouseup', () => setTimeout(selectionToComment, 10));
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('click', (e) => {
      if (!panelEl.classList.contains('sv-active')) return;
      const t = e.target;
      if (t.closest('.sv-panel') || t.closest('.sv-marker') || t.closest('.sv-inline') || t.closest('.sv-modal')) return;
      const sel = window.getSelection();
      if (sel && sel.toString().trim()) return;
      closePanel();
    });

    function load() {
      // Load cached comments immediately (synchronous for instant UI)
      const cached = cacheStore.list();
      setComments(cached);
      setHydrated(true);

      if (remote && !useLocalMode) {
        // Initial sync - will show indicator
        void loadRemote({ silent: false });
      } else {
        setSyncUI({ dot: requireBackend ? 'offline' : null, text: requireBackend ? 'Offline - comments disabled' : 'Comments (local mode)' });
        if (requireBackend) toggleBtn.disabled = true;
      }
    }

    load();

    // Re-render markers after a short delay to ensure layout has settled
    setTimeout(() => {
      const surfaceId = activeSurfaceId();
      renderMarkers();
      if (inlineVisible()) renderInline(surfaceId);
    }, 100);

    createEffect(() => {
      const total = totalRootCount();
      const unresolved = unresolvedCount();

      if (total === 0) {
        // No comments - hide badge
        countEl.textContent = '';
        countEl.classList.add('sv-hidden');
        countEl.classList.remove('sv-badge-resolved');
      } else if (unresolved === 0) {
        // All resolved - green badge with checkmark + total
        countEl.textContent = '✓ ' + total;
        countEl.classList.remove('sv-hidden');
        countEl.classList.add('sv-badge-resolved');
      } else {
        // Some unresolved - amber badge with unresolved/total
        countEl.textContent = unresolved + '/' + total;
        countEl.classList.remove('sv-hidden', 'sv-badge-resolved');
      }
    });

    createEffect(() => {
      if (!hydrated()) return;
      cacheStore.putAll(comments());
    });

    createEffect(() => {
      const open = nameModalOpen();
      if (!nameModalEl) return;
      if (open) showNameModal();
      else hideNameModal();
    });

    createEffect(() => {
      const state = panelState();
      if (!state) {
        setPanelActive(false);
        return;
      }
      if (state.screenX != null && state.screenY != null) {
        positionPanel(state.screenX, state.screenY);
      }
      if (state.mode === 'new') {
        renderNewCommentPanel(state);
        return;
      }
      if (state.mode === 'thread') {
        untrack(() => renderThreadPanel(state.id));
        return;
      }
      setPanelActive(false);
    });

    createEffect(() => {
      const surfaceId = activeSurfaceId();
      comments();
      focusedInlineId();
      inlineVisible();
      renderMarkers();
      if (inlineVisible()) renderInline(surfaceId);
      else inlineEl.innerHTML = '';
    });

    // Re-render markers on scroll/resize since they use fixed positioning
    // Use debounce to wait for scroll animation to settle before re-rendering
    let scrollDebounceId = null;
    function scheduleMarkerRender(delay = 100) {
      if (scrollDebounceId) clearTimeout(scrollDebounceId);
      scrollDebounceId = setTimeout(() => {
        scrollDebounceId = null;
        renderMarkers();
        if (inlineVisible()) renderInline(activeSurfaceId());
      }, delay);
    }
    function onScrollOrResize() {
      scheduleMarkerRender(100);
    }
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    // Note: Reveal.js events are registered centrally in initCore() to avoid duplicate listeners

    if (remote && pollIntervalMs > 0) {
      setInterval(() => {
        if (!canSyncRemote()) return;
        if (Date.now() < skipPollUntil) return;
        // Use silent mode for routine polling to avoid UI flicker
        void loadRemote({ silent: true });
      }, pollIntervalMs);
    }

    return {
      updateOnActiveSurfaceChange(newSurfaceId) {
        setActiveSurfaceId(newSurfaceId);
      },
      // Called by initCore on Reveal slidechanged/ready events
      onSlideChange(slideId) {
        if (slideId) setActiveSurfaceId(slideId);
        // Schedule render with delay (400ms matches Reveal.js scroll animation duration)
        scheduleMarkerRender(400);
      }
    };
  }

  function initCore(config) {
    const deckId = config.deckId || 'default';
    const slideSelector = config.selectors?.slideSurface || '[data-slide-id]';
    const surfaces = getSlideSurfaces(slideSelector);
    const numberedSurfaces = getNumberedSurfaces(surfaces);

    const nav = initNav({ surfaces });
    initNumbering({ surfaces, numberedSurfaces });
    const pdf = initPdf({ deckId, pdf: config.pdf || {}, surfaces });

    let activeSurfaceId = surfaces[0]?.id || '';

    const comments = initComments({
      deckId,
      surfaces,
      numberedSurfaces,
      commentsConfig: config.comments
    });

    const canvas = initCanvasControllers({
      controllers: config.canvas?.controllers || [],
      getCurrentSurfaceId: () => activeSurfaceId
    });

    function setActiveSurface(surfaceId) {
      if (!surfaceId || surfaceId === activeSurfaceId) return;
      activeSurfaceId = surfaceId;
      pdf.updateUnlock(activeSurfaceId);
      comments.updateOnActiveSurfaceChange(activeSurfaceId);
      canvas.update();
    }

    let rafPending = false;
    function scheduleActiveUpdate() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const s = findSurfaceByViewportCenter(surfaces);
        if (s) setActiveSurface(s.id);
      });
    }

    window.addEventListener('scroll', scheduleActiveUpdate, { passive: true });
    window.addEventListener('resize', scheduleActiveUpdate, { passive: true });

    // Centralized Reveal.js event registration (single source of truth)
    if (hasReveal()) {
      Reveal.on('ready', () => {
        scheduleActiveUpdate();
        comments.onSlideChange(activeSurfaceId);
      });

      Reveal.on('slidechanged', (event) => {
        // Extract slide ID from the current slide
        const slideEl = event.currentSlide?.querySelector('[data-slide-id]') || event.currentSlide;
        const slideId = slideEl?.getAttribute('data-slide-id');

        scheduleActiveUpdate();
        // Update active surface and schedule render (scroll events will reschedule)
        comments.onSlideChange(slideId || activeSurfaceId);
      });
    }

    scheduleActiveUpdate();
    canvas.update();

    return {
      getActiveSurfaceId: () => activeSurfaceId,
      scrollToId: nav.scrollToId
    };
  }

  window.SlideVibing = {
    version: '1.0.0',
    init: initCore,
    generateCuid,
    generateSlideId,
    // Minimal fine-grained state (no build): signals/memos/effects.
    state: { createSignal, createMemo, createEffect, batch, untrack }
  };
})();
