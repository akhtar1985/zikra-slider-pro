/* Zikra Slider Pro — demo bootstrap (not part of the plugin). */
(function () {
  'use strict';

  const zs = window.zikraslider;
  if (!zs) {
    console.error('[demo] zikraslider UMD build did not load.');
    return;
  }

  const byId = (id) => document.getElementById(id);

  /* ================================================================ hero */

  const hero = zs('#hero', {
    type: 'slide',
    loop: true,
    slidesPerView: 1,
    speed: 640,
    initialSlide: 0,
    arrows: {
      enabled: true,
      prevEl: '#hero-prev',
      nextEl: '#hero-next',
      ariaPrevLabel: 'Previous chapter',
      ariaNextLabel: 'Next chapter'
    },
    bullets: {
      enabled: true,
      el: '#hero-dots',
      type: 'custom',
      clickable: true,
      bulletClass: 'hero-dot',
      activeClass: 'is-active',
      render: ({ index }) => String(index + 1).padStart(2, '0')
    },
    features: {
      autoplay: { enabled: true, delay: 5200, pauseOnHover: true, pauseOnFocus: true, stopOnInteraction: false },
      drag: { enabled: true, threshold: 6 },
      keyboard: { enabled: true, onlyWhenFocused: true },
      a11y: { liveRegion: true }
    },
    animation: { library: 'auto', effect: 'zoom', duration: 760, ease: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fallback: 'css' },
    parallax: { enabled: true, selector: '.hero-copy', factor: 0.35 },
    sync: { with: '#hero-thumbs', mode: 'index', asThumbnails: true }
  });

  const heroThumbs = zs('#hero-thumbs', {
    slidesPerView: 4,
    gap: 10,
    speed: 460,
    slidesToScroll: 1,
    arrows: { enabled: false },
    bullets: { enabled: false },
    features: {
      autoplay: { enabled: false },
      keyboard: { enabled: false },
      a11y: { liveRegion: false, roleDescription: 'thumbnail strip' }
    },
    responsive: {
      0: { slidesPerView: 2.4 },
      620: { slidesPerView: 3.2 },
      980: { slidesPerView: 6 }
    },
    animation: { library: 'none', fallback: 'css' }
  });

  /* ============================================================= gallery */

  const fraction = (current, total) => `${String(current).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

  const gallery = zs('#gallery-main', {
    type: 'slide',
    loop: false,
    slidesPerView: 1,
    gap: 16,
    speed: 620,
    initialSlide: 0,
    arrows: { enabled: true, ariaPrevLabel: 'Previous artwork', ariaNextLabel: 'Next artwork' },
    bullets: {
      enabled: true,
      el: '#gallery-fraction',
      type: 'fraction',
      clickable: false,
      formatFraction: fraction
    },
    features: {
      autoplay: { enabled: false },
      drag: { enabled: true },
      keyboard: { enabled: true, onlyWhenFocused: true },
      lazyLoad: { enabled: true, mode: 'adjacent' },
      a11y: { liveRegion: true }
    },
    animation: { library: 'none', effect: 'slide', fallback: 'css' },
    parallax: { enabled: true, selector: '.gallery-card img', factor: 0.12 },
    sync: { with: '#gallery-thumbs', mode: 'progress', asThumbnails: true }
  });

  zs('#gallery-thumbs', {
    slidesPerView: 4,
    gap: 10,
    speed: 380,
    arrows: { enabled: false },
    bullets: { enabled: false },
    features: {
      autoplay: { enabled: false },
      keyboard: { enabled: false },
      lazyLoad: { enabled: true, mode: 'adjacent' },
      a11y: { liveRegion: false, roleDescription: 'gallery thumbnails' }
    },
    responsive: {
      0: { slidesPerView: 2.4 },
      640: { slidesPerView: 3.4 },
      980: { slidesPerView: 4 }
    },
    animation: { library: 'none', fallback: 'css' }
  });

  /* ============================================================= effects */

  new zs('#fade', {
    type: 'fade',
    loop: true,
    speed: 700,
    arrows: { enabled: false },
    bullets: { enabled: true, clickable: true },
    features: {
      autoplay: { enabled: true, delay: 4600, pauseOnHover: true },
      keyboard: { enabled: false },
      a11y: { liveRegion: false }
    },
    animation: { library: 'none', effect: 'fade', duration: 900, fallback: 'css' }
  });

  const coverflow = zs('#coverflow', {
    type: 'coverflow',
    loop: true,
    slidesPerView: 1.7,
    centeredSlides: true,
    gap: 12,
    speed: 680,
    arrows: { enabled: false },
    bullets: { enabled: true, type: 'progressbar', clickable: true },
    features: {
      autoplay: { enabled: true, delay: 3800, pauseOnHover: true },
      drag: { enabled: true },
      keyboard: { enabled: false },
      a11y: { liveRegion: false }
    },
    // GSAP is not loaded on this page: this must degrade to WAAPI, then CSS.
    animation: { library: 'gsap', effect: 'fade', duration: 680, fallback: 'waapi' }
  });

  const coverflowBackend = byId('coverflow-backend');
  const supportsWaapi = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  if (coverflowBackend) coverflowBackend.textContent = `backend: ${supportsWaapi ? 'waapi' : 'css'} (gsap missing)`;
  coverflow.on('afterChange', () => {
    if (!coverflowBackend) return;
    const backend = coverflow.getState().backend || 'css';
    coverflowBackend.textContent = `backend: ${backend}${backend === 'gsap' ? '' : ' (gsap missing)'}`;
  });

  zs('#stack', {
    type: 'stack',
    loop: true,
    speed: 640,
    arrows: { enabled: false },
    bullets: { enabled: true, clickable: true, dynamicBullets: true },
    features: {
      autoplay: { enabled: true, delay: 3600, pauseOnHover: true },
      keyboard: { enabled: false },
      a11y: { liveRegion: false }
    },
    animation: { library: 'none', effect: 'zoom', duration: 640, fallback: 'css' }
  });

  zs('#flip', {
    loop: true,
    slidesPerView: 1,
    speed: 720,
    arrows: { enabled: false },
    bullets: { enabled: true, clickable: true },
    features: {
      autoplay: { enabled: true, delay: 4200, pauseOnHover: true },
      keyboard: { enabled: false },
      a11y: { liveRegion: false }
    },
    animation: { library: 'none', effect: 'flip', duration: 720, fallback: 'css' }
  });

  zs('#stagger', {
    type: 'cards',
    loop: true,
    speed: 760,
    arrows: { enabled: false },
    bullets: { enabled: true, clickable: true, dynamicBullets: true },
    features: {
      autoplay: { enabled: true, delay: 4400, pauseOnHover: true },
      keyboard: { enabled: false },
      a11y: { liveRegion: false }
    },
    animation: { library: 'none', effect: 'stagger', duration: 760, fallback: 'css' }
  });

  /* ============================================================= engines */

  const engineButtons = Array.from(document.querySelectorAll('[data-engine]'));
  const engineStatus = byId('engine-status');
  const engineSource = byId('engine-source');
  const engineCode = byId('engine-code');
  const engineNote = byId('engine-note');

  const ENGINE_NAMES = { css: 'CSS', waapi: 'WAAPI', anime: 'anime.js', motion: 'Motion One' };
  const ENGINE_SCRIPTS = {
    anime: {
      src: 'https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.umd.min.js',
      ready: () => typeof window.anime === 'function' || !!(window.anime && typeof window.anime.animate === 'function')
    },
    motion: {
      src: 'https://cdn.jsdelivr.net/npm/motion@10.16.4/dist/motion.min.js',
      ready: () => {
        const motion = window.motion || window.Motion;
        return !!(motion && typeof motion.animate === 'function');
      }
    }
  };
  const ENGINE_NOTES = {
    css: "library: 'none' skips every library; transitions run on transform and opacity only. This is the last rung of the ladder.",
    waapi: "library: 'none' with fallback: 'waapi' hands the transition to Element.animate — the browser's own engine, nothing to download.",
    anime: "anime.js is detected as v4 (a namespace with animate()) or v3 (a function). Nothing is bundled; the CDN script loads only when you pick it.",
    motion: "Motion One's UMD build registers the Motion global (module builds can expose motion). Its seconds-based duration is converted by the adapter."
  };

  function engineOptions(name) {
    return {
      library: ENGINE_SCRIPTS[name] ? name : 'none',
      effect: 'slide-up',
      duration: 560,
      fallback: name === 'css' ? 'css' : 'waapi'
    };
  }

  function engineSnippet(name) {
    const options = engineOptions(name);
    const script = ENGINE_SCRIPTS[name]
      ? `<script src="${ENGINE_SCRIPTS[name].src}"></script>\n\n`
      : '';
    return `${script}zikraslider('#slider', {
  animation: {
    library: '${options.library}',
    effect: '${options.effect}',
    duration: ${options.duration},
    fallback: '${options.fallback}'
  }
});`;
  }

  const engineSlider = zs('#engine-slider', {
    type: 'slide',
    loop: true,
    gap: 12,
    initialSlide: 0,
    arrows: { enabled: false },
    bullets: { enabled: true, clickable: true },
    features: {
      autoplay: { enabled: true, delay: 4600, pauseOnHover: true },
      drag: { enabled: true },
      keyboard: { enabled: false },
      a11y: { liveRegion: false }
    },
    animation: engineOptions('css')
  });

  let engineChoice = 'css';
  let engineToken = 0;
  const engineLoads = {};

  function setEnginePressed(name) {
    engineButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-engine') === name));
    });
  }

  function syncEngineStatus() {
    if (!engineStatus) return;
    const backend = engineSlider.getState().backend || '—';
    let text = `backend: ${backend}`;
    if ((engineChoice === 'anime' || engineChoice === 'motion') && backend !== engineChoice) {
      text += ' · fallback';
    }
    engineStatus.textContent = text;
  }

  function loadEngineScript(name) {
    const info = ENGINE_SCRIPTS[name];
    if (!info) return Promise.resolve('none');
    if (info.ready()) return Promise.resolve('ready');
    if (engineLoads[name]) return engineLoads[name];
    engineLoads[name] = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = info.src;
      script.async = true;
      script.onload = () => resolve(info.ready() ? 'ready' : 'unavailable');
      script.onerror = () => resolve('unavailable');
      document.head.appendChild(script);
    });
    return engineLoads[name];
  }

  async function applyEngine(name) {
    const token = ++engineToken;
    engineChoice = name;
    setEnginePressed(name);
    if (engineCode) engineCode.textContent = engineSnippet(name);
    if (engineNote) engineNote.textContent = ENGINE_NOTES[name];
    if (engineSource) {
      engineSource.textContent = ENGINE_SCRIPTS[name]
        ? `script: loading ${ENGINE_NAMES[name]}…`
        : 'script: none needed';
    }

    const result = ENGINE_SCRIPTS[name] ? await loadEngineScript(name) : 'none';
    if (token !== engineToken) return;

    if (engineSource) {
      engineSource.textContent = result === 'ready'
        ? `script: ${ENGINE_NAMES[name]} ready`
        : result === 'unavailable'
          ? `script: ${ENGINE_NAMES[name]} cdn unavailable`
          : 'script: none needed';
    }

    engineSlider.update({ animation: engineOptions(name) });
    engineSlider.next({ reason: 'engine' });
  }

  engineButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyEngine(button.getAttribute('data-engine'));
    });
  });

  document.querySelectorAll('[data-engine-nav]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.getAttribute('data-engine-nav') === 'prev') engineSlider.prev({ reason: 'engine' });
      else engineSlider.next({ reason: 'engine' });
    });
  });

  engineSlider.on('afterChange', syncEngineStatus);
  setEnginePressed(engineChoice);
  if (engineCode) engineCode.textContent = engineSnippet(engineChoice);
  if (engineNote) engineNote.textContent = ENGINE_NOTES[engineChoice];
  syncEngineStatus();

  /* ========================================================== playground */

  const stateEl = byId('state');
  const logEl = byId('log');
  const rebuildBtn = document.querySelector('[data-action="rebuild"]');

  let play = null;
  let autoplayWanted = false;
  let cancelNext = false;

  const stamp = () => {
    const d = new Date();
    return `${d.toLocaleTimeString([], { hour12: false })}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  };

  function addLog(name, detail) {
    if (!logEl) return;
    const li = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = stamp();
    const label = document.createElement('b');
    label.textContent = name;
    li.append(time, label);
    if (detail) li.append(document.createTextNode(` ${detail}`));
    logEl.appendChild(li);
    while (logEl.children.length > 40) logEl.removeChild(logEl.firstChild);
  }

  function renderState() {
    if (!stateEl) return;
    const rows = [];
    if (!play) {
      rows.push(['status', 'destroyed']);
      rows.push(['DOM', 'restored']);
    } else {
      const s = play.getState();
      rows.push(['index', `${s.index + 1} / ${s.total}`]);
      rows.push(['progress', `${Math.round(s.progress * 100)}%`]);
      rows.push(['type', s.type]);
      rows.push(['dir', s.dir]);
      rows.push(['per view', String(s.slidesPerView)]);
      rows.push(['loop', String(s.isLooping)]);
      rows.push(['autoplay', s.isAutoplayRunning ? 'running' : s.isAutoplay ? 'armed' : 'off']);
      rows.push(['animating', String(s.isAnimating)]);
      rows.push(['dragging', String(s.isDragging)]);
      rows.push(['backend', s.backend || 'n/a']);
    }
    stateEl.replaceChildren(...rows.map(([key, value]) => {
      const cell = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = key;
      dd.textContent = value;
      cell.append(dt, dd);
      return cell;
    }));
  }

  function attachPlayEvents(instance) {
    instance.on('beforeChange', ({ index, previousIndex, reason }) => {
      addLog('beforeChange', `#${previousIndex + 1} → #${index + 1} (${reason})`);
      if (cancelNext) {
        cancelNext = false;
        addLog('cancelled', 'listener returned false');
        return false;
      }
      return true;
    });
    instance.on('afterChange', ({ index, previousIndex, reason }) => {
      addLog('afterChange', `#${previousIndex + 1} → #${index + 1} (${reason})`);
      renderState();
    });
    instance.on('destroy', () => addLog('destroy', 'timers, observers and DOM restored'));
    return instance;
  }

  function createPlaySlider() {
    const instance = zs('#play', {
      type: 'slide',
      loop: true,
      slidesPerView: 1,
      gap: 14,
      speed: 520,
      freeMode: true,
      initialSlide: 0,
      arrows: { enabled: true, ariaPrevLabel: 'Previous playground slide', ariaNextLabel: 'Next playground slide' },
      bullets: { enabled: true, clickable: true },
      features: {
        autoplay: { enabled: true, delay: 4000, pauseOnHover: true, stopOnInteraction: false },
        drag: { enabled: true, threshold: 5 },
        wheel: { enabled: true, passive: false },
        keyboard: { enabled: true, onlyWhenFocused: false },
        a11y: { liveRegion: true }
      },
      responsive: {
        0: { slidesPerView: 1 },
        720: { slidesPerView: 1.15 }
      },
      animation: { library: 'auto', effect: 'slide-up', duration: 560, fallback: 'css' }
    });
    instance.pause();
    return attachPlayEvents(instance);
  }

  play = createPlaySlider();
  addLog('init', 'first instance');
  renderState();

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action');

      if (action === 'rebuild') {
        if (play) {
          play.destroy();
          play = null;
          addLog('rebuild', 'destroyed — press Rebuild to recreate');
          if (rebuildBtn) rebuildBtn.textContent = 'Rebuild instance';
        } else {
          play = createPlaySlider();
          autoplayWanted = false;
          addLog('rebuild', 'new instance mounted');
          if (rebuildBtn) rebuildBtn.textContent = 'Destroy / Rebuild';
        }
        renderState();
        return;
      }

      if (!play) {
        addLog('ignored', 'instance is destroyed — rebuild first');
        return;
      }

      switch (action) {
        case 'prev':
          play.prev({ reason: 'button' });
          break;
        case 'next':
          play.next({ reason: 'button' });
          break;
        case 'random': {
          const state = play.getState();
          let target = Math.floor(Math.random() * state.total);
          if (target === state.index) target = (state.index + 1) % state.total;
          addLog('goTo', `#${target + 1}`);
          play.goTo(target, { reason: 'button' });
          break;
        }
        case 'play':
          autoplayWanted = !play.getState().isAutoplay;
          play.toggleAutoplay();
          addLog('autoplay', autoplayWanted ? 'play()' : 'pause()');
          break;
        case 'rtl': {
          const dir = play.getState().dir === 'rtl' ? 'ltr' : 'rtl';
          addLog('update', `dir: ${dir}`);
          play.update({ dir });
          if (!autoplayWanted) play.pause();
          break;
        }
        case 'cancel':
          cancelNext = true;
          addLog('armed', 'the next beforeChange returns false');
          break;
        default:
          break;
      }
      renderState();
    });
  });

  window.setInterval(renderState, 400);
  window.addEventListener('pagehide', () => {
    if (play) play.destroy();
  });

  // Expose for manual poking in DevTools.
  window.demo = { hero, heroThumbs, gallery, coverflow, engineSlider, get play() { return play; } };
})();
