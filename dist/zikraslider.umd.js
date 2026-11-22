/*! Zikra Slider Pro v1.3.2 | MIT | zero dependencies */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.zikraslider = factory();
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

/*!
 * Zikra Slider Pro v1.3.2
 * Zero-dependency slider / carousel engine for Vanilla JS, React, Next.js and Vue 3.
 * MIT License.
 *
 * Design notes
 * ------------
 * - Slides are absolutely positioned; a single "_render" step computes the
 *   transform of every slide. That keeps slide/fade/coverflow/cards coherent.
 * - Loop mode for "slide" uses cloned boundary slides and a seamless jump after
 *   the transition (no duplicated ids, clones are inert).
 * - Every animation backend (GSAP, anime.js, Motion One, WAAPI, CSS) receives
 *   the same from/to style descriptors, so falling back is just a strategy swap.
 */
const VERSION = '1.3.2';

const TYPES = ['slide', 'fade', 'scale', 'coverflow', 'stack', 'cards', 'custom'];
const AXES = ['x', 'y'];
const DIRS = ['ltr', 'rtl'];
const ANIM_EFFECTS = ['slide', 'fade', 'zoom', 'slide-up', 'flip', 'stagger'];

const DEFAULTS = {
  type: 'slide',
  axis: 'x',
  dir: 'ltr',
  slidesPerView: 1,
  slidesToScroll: 1,
  gap: 0,
  centeredSlides: false,
  freeMode: false,
  loop: false,
  initialSlide: 0,
  autoHeight: false,
  speed: 480,
  classPrefix: 'zs-',

  parallax: {
    enabled: false,
    selector: '[data-zs-parallax]',
    factor: 0.2
  },

  custom: {
    transform: null
  },

  sync: {
    with: null,
    mode: 'index',
    asThumbnails: false
  },

  arrows: {
    enabled: true,
    prevEl: null,
    nextEl: null,
    container: null,
    className: '',
    prevClass: '',
    nextClass: '',
    prevHtml: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    nextHtml: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
    ariaPrevLabel: 'Previous slide',
    ariaNextLabel: 'Next slide',
    hideAtEdges: false,
    render: null
  },

  bullets: {
    enabled: true,
    el: null,
    type: 'bullets', // bullets | fraction | progressbar | custom
    clickable: true,
    dynamicBullets: false,
    className: '',
    bulletClass: '',
    activeClass: '',
    formatFraction: null,
    render: null
  },

  features: {
    autoplay: {
      enabled: false,
      delay: 4200,
      pauseOnHover: true,
      pauseOnFocus: true,
      pauseOnHiddenTab: true,
      stopOnInteraction: false
    },
    drag: {
      enabled: true,
      threshold: 6,
      velocity: 0.4, // px/ms flick threshold
      rubberband: true
    },
    keyboard: {
      enabled: true,
      onlyWhenFocused: true
    },
    wheel: {
      enabled: false,
      passive: true
    },
    lazyLoad: {
      enabled: false,
      mode: 'adjacent', // onDemand | adjacent | eager
      placeholder: ''
    },
    a11y: {
      enabled: true,
      roleDescription: 'carousel',
      liveRegion: true
    }
  },

  responsive: null,

  animation: {
    library: 'auto', // auto | none | gsap | anime | motion | object
    effect: 'slide',
    duration: null, // falls back to `speed`
    ease: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
    fallback: 'css' // css | waapi
  },

  fallback: {
    disableIfNotEnoughSlides: true,
    reducedMotion: 'fade', // fade | instant | ignore
    noJsClass: 'zs-no-js',
    onMediaError: null
  },

  on: {},
  plugins: []
};

/* --------------------------------------------------------------- helpers */

const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';
const isElement = (v) => !!(v && v.nodeType === 1);
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function mergeOptions(...sources) {
  const out = {};
  for (const source of sources) {
    if (!isPlainObject(source)) continue;
    for (const key of Object.keys(source)) {
      const value = source[key];
      if (value === undefined) continue;
      if (isPlainObject(value)) out[key] = mergeOptions(isPlainObject(out[key]) ? out[key] : {}, value);
      else if (Array.isArray(value)) out[key] = value.slice();
      else out[key] = value;
    }
  }
  return out;
}

function resolveElement(target) {
  if (!canUseDOM()) return null;
  if (isElement(target)) return target;
  if (typeof target === 'string') {
    try {
      return document.querySelector(target);
    } catch (err) {
      return null;
    }
  }
  if (target && target.length && isElement(target[0])) return target[0];
  return null;
}

function createEl(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function addListener(store, target, type, handler, options) {
  if (!target || typeof target.addEventListener !== 'function') return;
  target.addEventListener(type, handler, options);
  store.push({ target, type, handler, options });
}

function removeListeners(store) {
  while (store.length) {
    const { target, type, handler, options } = store.pop();
    try {
      target.removeEventListener(type, handler, options);
    } catch (err) {
      /* listener target may have been removed with the DOM */
    }
  }
}

function prefersReducedMotion() {
  if (!canUseDOM() || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) {
    return false;
  }
}

function flatten(list) {
  return Array.isArray(list) ? list.flat(Infinity).filter(Boolean) : [];
}

// CSS timing functions cannot be handed to GSAP/anime/Motion verbatim, so the
// adapters only forward an ease string that is not a CSS keyword.
const CSS_EASING_RE = /^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|cubic-bezier\(.+\)|steps\(.+\))$/;
function libraryEase(ease, fallback) {
  if (typeof ease !== 'string') return fallback;
  const value = ease.trim();
  return value && !CSS_EASING_RE.test(value) ? value : fallback;
}

/* ------------------------------------------------- animation-library glue */

function adaptGsap(gsap) {
  return {
    name: 'gsap',
    fromTo(el, from, to, opts) {
      return new Promise((resolve) => {
        if (!isElement(el)) return resolve();
        gsap.fromTo(
          el,
          { ...from, x: from.x || 0, y: from.y || 0, z: from.z || 0, scale: from.scale == null ? 1 : from.scale, rotation: from.rotate || 0, rotateY: from.rotateY || 0, opacity: from.opacity == null ? 1 : from.opacity },
          {
            ...to,
            x: to.x || 0,
            y: to.y || 0,
            z: to.z || 0,
            scale: to.scale == null ? 1 : to.scale,
            rotation: to.rotate || 0,
            rotateY: to.rotateY || 0,
            opacity: to.opacity == null ? 1 : to.opacity,
            duration: opts.duration / 1000,
            delay: (opts.delay || 0) / 1000,
            ease: libraryEase(opts.easing, 'power2.out'),
            overwrite: 'auto',
            onComplete: resolve,
            onInterrupt: resolve
          }
        );
      });
    }
  };
}

function adaptAnime(anime) {
  const modern = anime && typeof anime.animate === 'function';
  return {
    name: modern ? 'anime-v4' : 'anime',
    fromTo(el, from, to, opts) {
      return new Promise((resolve) => {
        if (!isElement(el)) return resolve();
        try {
          if (modern) {
            // v4 takes short transform keys and all options in one parameters object.
            const params = {
              x: to.x || 0,
              y: to.y || 0,
              z: to.z || 0,
              scale: to.scale == null ? 1 : to.scale,
              rotate: to.rotate || 0,
              rotateY: to.rotateY || 0,
              opacity: to.opacity == null ? 1 : to.opacity,
              duration: opts.duration,
              delay: opts.delay || 0
            };
            let ease = libraryEase(opts.easing, null);
            // v4 renamed easings: easeOutQuad -> outQuad.
            if (ease && /^ease[A-Z]/.test(ease)) ease = ease.charAt(4).toLowerCase() + ease.slice(5);
            if (ease) params.ease = ease;
            const animation = anime.animate(el, params);
            const settled = animation && (animation.finished || animation);
            if (settled && typeof settled.then === 'function') settled.then(resolve, resolve);
            else resolve();
            return;
          }
          const vars = {
            targets: el,
            duration: opts.duration,
            delay: opts.delay || 0,
            easing: libraryEase(opts.easing, 'easeOutQuad'),
            complete: resolve
          };
          const toVars = {
            translateX: to.x || 0,
            translateY: to.y || 0,
            translateZ: to.z || 0,
            scale: to.scale == null ? 1 : to.scale,
            rotate: `${to.rotate || 0}deg`,
            rotateY: `${to.rotateY || 0}deg`,
            opacity: to.opacity == null ? 1 : to.opacity
          };
          const fromVars = {
            translateX: from.x || 0,
            translateY: from.y || 0,
            translateZ: from.z || 0,
            scale: from.scale == null ? 1 : from.scale,
            rotate: `${from.rotate || 0}deg`,
            rotateY: `${from.rotateY || 0}deg`,
            opacity: from.opacity == null ? 1 : from.opacity
          };
          anime({ ...vars, ...fromVars, keyframes: [{ ...fromVars }, { ...toVars }] });
        } catch (err) {
          resolve();
        }
      });
    }
  };
}

function adaptMotion(motion) {
  return {
    name: 'motion',
    fromTo(el, from, to, opts) {
      if (!isElement(el)) return Promise.resolve();
      const keyframes = {
        x: [from.x || 0, to.x || 0],
        y: [from.y || 0, to.y || 0],
        z: [from.z || 0, to.z || 0],
        scale: [from.scale == null ? 1 : from.scale, to.scale == null ? 1 : to.scale],
        rotate: [from.rotate || 0, to.rotate || 0],
        rotateY: [from.rotateY || 0, to.rotateY || 0],
        opacity: [from.opacity == null ? 1 : from.opacity, to.opacity == null ? 1 : to.opacity]
      };
      const controls = motion.animate(el, keyframes, {
        duration: opts.duration / 1000,
        delay: (opts.delay || 0) / 1000,
        easing: libraryEase(opts.easing, 'ease-out')
      });
      return controls && typeof controls.finished === 'object' ? controls.finished.then(() => {}, () => {}) : Promise.resolve();
    }
  };
}

function adaptCustom(lib) {
  return {
    name: 'custom',
    fromTo(el, from, to, opts) {
      if (typeof lib.fromTo === 'function') {
        return Promise.resolve(lib.fromTo(el, from, to, opts));
      }
      if (typeof lib.animate === 'function') {
        return Promise.resolve(lib.animate(el, { from, to, ...opts }));
      }
      throw new Error('Custom animation library must expose fromTo() or animate().');
    }
  };
}

function resolveAnimationLibrary(setting) {
  if (!canUseDOM() || setting === 'none') return null;
  if (setting && typeof setting === 'object') {
    return { adapter: adaptCustom(setting), label: 'custom' };
  }
  const global = window;
  const candidates = setting === 'auto' ? ['gsap', 'anime', 'motion'] : [setting];
  for (const name of candidates) {
    try {
      if (name === 'gsap' && global.gsap && typeof global.gsap.fromTo === 'function') {
        return { adapter: adaptGsap(global.gsap), label: 'gsap' };
      }
      // v3 UMD exposes a function; the v4 UMD bundle exposes a namespace with animate().
      if (name === 'anime' && (typeof global.anime === 'function' || (global.anime && typeof global.anime.animate === 'function'))) {
        return { adapter: adaptAnime(global.anime), label: 'anime' };
      }
      // Motion One's UMD bundle registers `Motion`; module bundles may use `motion`.
      const motion = global.motion || global.Motion;
      if (name === 'motion' && motion && typeof motion.animate === 'function') {
        return { adapter: adaptMotion(motion), label: 'motion' };
      }
    } catch (err) {
      /* a broken global should never break the slider */
      return null;
    }
  }
  return null;
}

/* --------------------------------------------------------------- instance */

let uid = 0;
const INSTANCES = new WeakMap();
const LIVE = new Set();
const LABELS = {
  'aria-prev': 'Previous slide',
  'aria-next': 'Next slide',
  'fraction': (c, t) => `${c} / ${t}`
};

const ARROW_ATTRS = ['role', 'aria-roledescription', 'aria-label', 'tabindex', 'dir', 'id'];

class ZikraSlider {
  constructor(target, options = {}) {
    this.el = null;
    this.ready = false;
    this.destroyed = false;
    this._events = new Map();
    this._listeners = [];
    this._generated = [];
    this._generatedArrows = [];
    this._syncTargets = [];
    this._syncListeners = [];
    this._syncOrigin = null;
    this._pluginList = [];
    this._breakpointListeners = [];
    this._mediaLoadListeners = [];
    this._mediaMarks = [];
    this._waapi = [];
    this._timers = new Set();
    this._controlListeners = [];
    this._controlSnapshots = [];
    this._slideSnapshots = [];
    this._innerState = new WeakMap();
    this._parallaxCache = new WeakMap();
    this._parallaxTouched = new Map();

    const el = resolveElement(target);
    if (!canUseDOM() || !el) {
      this.params = mergeOptions(DEFAULTS);
      this._cls = this._buildClassNames();
      return; // graceful stub: every public method is a safe no-op
    }

    this.el = el;
    this.id = el.id || `zs-${++uid}`;
    INSTANCES.set(el, this);
    LIVE.add(this);
    this._init(options);
  }

  /* ------------------------------------------------------------- bootstrap */

  _init(options) {
    const el = this.el;
    this._userOptions = mergeOptions(options);
    this._hadId = !!el.id;
    this._original = {
      className: el.className,
      style: el.getAttribute('style'),
      attrs: ARROW_ATTRS.reduce((acc, name) => ({ ...acc, [name]: el.getAttribute(name) }), {}),
      children: Array.from(el.children)
    };

    this.params = this._resolveParams();
    this._cls = this._buildClassNames();
    if (this.params.fallback.noJsClass) el.classList.remove(this.params.fallback.noJsClass);

    this._setupDom();
    this._setupA11y();
    this._connectMedia();
    this._buildControls();
    this._bindEvents();
    this._setupBreakpoints();

    this._activeIndex = this._normalizeIndex(this.params.initialSlide);
    this._renderIndex = this._activeIndex;
    this._offset = 0;
    this._measure();
    this._renderIndex = this._renderIndexFor(this._activeIndex);
    this._offset = this._offsetFor(this._renderIndex);
    this._render({ instant: true });
    this._updateControls();
    this._loadLazy();
    this._initPlugins();
    this._resolveSyncTargets();

    this.ready = true;
    el.classList.add(this._cls.initialized);
    this._emit('init', { instance: this });
    this._startAutoplay();

    // Let sibling sliders created later in the same tick find this instance.
    LIVE.forEach((instance) => {
      if (instance !== this && instance.ready) instance._resolveSyncTargets();
    });
  }

  _buildClassNames() {
    const p = this.params.classPrefix || 'zs-';
    const names = {};
    [
      'slider', 'initialized', 'viewport', 'track', 'slide', 'slide-clone', 'slide-active',
      'slide-visible', 'arrows', 'arrow', 'arrow-prev', 'arrow-next', 'arrow-hidden',
      'bullets', 'bullet', 'bullet-active', 'fraction', 'progressbar', 'progressbar-fill',
      'live', 'dragging', 'drag-enabled', 'disabled', 'animating'
    ].forEach((name) => { names[name] = p + name; });
    TYPES.forEach((type) => { names[`type-${type}`] = `${p}type-${type}`; });
    AXES.forEach((axis) => { names[`axis-${axis}`] = `${p}axis-${axis}`; });
    return names;
  }

  _resolveParams() {
    const params = mergeOptions(DEFAULTS, this._userOptions);
    params.type = TYPES.includes(params.type) ? params.type : 'slide';
    params.axis = AXES.includes(params.axis) ? params.axis : 'x';
    params.dir = DIRS.includes(params.dir) ? params.dir : 'ltr';
    params.slidesPerView = params.slidesPerView === 'auto' ? 'auto' : Math.max(0.1, Number(params.slidesPerView) || 1);
    params.slidesToScroll = Math.max(1, Math.round(Number(params.slidesToScroll) || 1));
    params.gap = Math.max(0, Number(params.gap) || 0);
    params.speed = Math.max(0, Number(params.speed) || 0);
    if (!ANIM_EFFECTS.includes(params.animation.effect)) params.animation.effect = 'slide';
    if (!['css', 'waapi'].includes(params.animation.fallback)) params.animation.fallback = 'css';
    if (![true, false, 'auto'].includes(params.loop)) params.loop = !!params.loop;

    // Responsive overrides: first matching min-width wins (mobile-first cascade).
    if (isPlainObject(params.responsive) && typeof window.matchMedia === 'function') {
      const keys = Object.keys(params.responsive)
        .map((key) => ({ key, min: parseFloat(key) || 0, overrides: params.responsive[key] }))
        .sort((a, b) => b.min - a.min);
      for (const entry of keys) {
        try {
          if (window.matchMedia(`(min-width: ${entry.min}px)`).matches) {
            Object.assign(params, mergeOptions(params, entry.overrides));
            break;
          }
        } catch (err) {
          /* invalid media query: skip */
        }
      }
    }
    return params;
  }

  _snapshotSlide(slide) {
    return {
      className: slide.className,
      style: slide.getAttribute('style'),
      id: slide.getAttribute('id'),
      role: slide.getAttribute('role'),
      'aria-roledescription': slide.getAttribute('aria-roledescription'),
      'aria-label': slide.getAttribute('aria-label'),
      'aria-hidden': slide.getAttribute('aria-hidden'),
      inert: slide.hasAttribute('inert')
    };
  }

  _setupDom() {
    const el = this.el;
    const c = this._cls;
    el.classList.add(c.slider, c.initialized, c[`type-${this.params.type}`], c[`axis-${this.params.axis}`]);
    el.classList.toggle(c['drag-enabled'], !!this.params.features.drag.enabled);
    if (this.params.dir === 'rtl') el.setAttribute('dir', 'rtl');
    if (!el.id) el.id = this.id;
    if (this.params.features.a11y.enabled) el.setAttribute('tabindex', '0');

    this._viewport = createEl('div', `${c.viewport} ${c[`type-${this.params.type}`]}`);
    this._track = createEl('div', c.track);
    this._generated.push(this._viewport);

    this._slides = Array.from(el.children);
    this._slideSnapshots = this._slides.map((slide) => this._snapshotSlide(slide));
    this._slides.forEach((slide, i) => {
      if (!slide.classList.contains(c.slide)) slide.classList.add(c.slide);
      slide.setAttribute('data-zs-index', String(i));
      this._track.appendChild(slide);
    });
    this._realCount = this._slides.length;
    this._viewport.appendChild(this._track);
    el.appendChild(this._viewport);

    this._baseSlideClasses = this._slides.map((slide) => slide.className);
    this._baseSlideStyles = this._slides.map((slide) => slide.getAttribute('style'));
  }

  _setupA11y() {
    const a11y = this.params.features.a11y;
    if (!a11y.enabled) return;
    const el = this.el;
    el.setAttribute('role', 'region');
    el.setAttribute('aria-roledescription', a11y.roleDescription);
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Image carousel');

    this._slides.forEach((slide, i) => {
      if (!slide.id) slide.id = `${this.id}-slide-${i}`;
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} of ${this._realCount}`);
    });

    if (a11y.liveRegion) {
      this._live = createEl('div', this._cls.live);
      this._live.setAttribute('aria-live', 'polite');
      this._live.setAttribute('aria-atomic', 'true');
      this.el.appendChild(this._live);
      this._generated.push(this._live);
    }
  }

  _bindEvents() {
    const el = this.el;
    const f = this.params.features;

    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    addListener(this._listeners, el, 'pointerdown', this._onPointerDown, { passive: true });
    addListener(this._listeners, el, 'pointermove', this._onPointerMove, { passive: false });
    addListener(this._listeners, el, 'pointerup', this._onPointerUp);
    addListener(this._listeners, el, 'pointercancel', this._onPointerUp);

    // Clipboard / mouse drag should not start a native text selection.
    addListener(this._listeners, el, 'dragstart', (event) => {
      if (this._drag && this._drag.started) event.preventDefault();
    });

    if (f.autoplay.pauseOnHover) {
      addListener(this._listeners, el, 'pointerenter', (event) => {
        if (event.pointerType === 'mouse') this._hoverPaused = true;
      });
      addListener(this._listeners, el, 'pointerleave', () => {
        this._hoverPaused = false;
        this._scheduleAutoplay();
      });
    }
    if (f.autoplay.pauseOnFocus) {
      addListener(this._listeners, el, 'focusin', () => { this._focusPaused = true; });
      addListener(this._listeners, el, 'focusout', (event) => {
        if (!el.contains(event.relatedTarget)) {
          this._focusPaused = false;
          this._scheduleAutoplay();
        }
      });
    }
    if (f.autoplay.pauseOnHiddenTab && typeof document !== 'undefined') {
      this._onVisibility = () => {
        if (!document.hidden) this._scheduleAutoplay();
      };
      addListener(this._listeners, document, 'visibilitychange', this._onVisibility);
    }

    // Swallow the synthetic click that follows a drag gesture.
    addListener(this._listeners, el, 'click', (event) => {
      if (this._suppressClickUntil && performance.now() < this._suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    this._onKeyDown = (event) => {
      const keyboard = this.params.features.keyboard;
      if (!keyboard.enabled || this._disabled) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test((target.tagName || '').toUpperCase())) return;
      // Document-level listeners must not hijack keys meant for another slider.
      if (!keyboard.onlyWhenFocused && target && target.closest) {
        const owner = target.closest(`.${this._cls.slider}`);
        if (owner && owner !== this.el) return;
      }

      const rtl = this._rtl;
      let action;
      switch (event.key) {
        case 'ArrowLeft': action = rtl ? 'next' : 'prev'; break;
        case 'ArrowRight': action = rtl ? 'prev' : 'next'; break;
        case 'ArrowUp': action = 'prev'; break;
        case 'ArrowDown': action = 'next'; break;
        case 'Home': action = 'first'; break;
        case 'End': action = 'last'; break;
        case 'PageUp': action = 'prev'; break;
        case 'PageDown': action = 'next'; break;
        default: return;
      }
      event.preventDefault();
      this._userInteracted();
      if (action === 'first') this.goTo(0);
      else if (action === 'last') this.goTo(this._realCount - 1);
      else if (action === 'next') this.next();
      else this.prev();
    };
    const keyboardTarget = this.params.features.keyboard.onlyWhenFocused ? el : document;
    addListener(this._listeners, keyboardTarget, 'keydown', this._onKeyDown);

    this._onWheel = (event) => {
      const wheel = this.params.features.wheel;
      if (!wheel.enabled) return;
      const now = Date.now();
      if (now - (this._wheelAt || 0) < 320) return;
      const delta = this.params.axis === 'x'
        ? Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
        : event.deltaY;
      if (Math.abs(delta) < 12) return;
      this._wheelAt = now;
      if (!wheel.passive) event.preventDefault();
      this._userInteracted();
      if (delta > 0) this.next(); else this.prev();
    };
    addListener(this._listeners, el, 'wheel', this._onWheel, { passive: !!this.params.features.wheel.passive });

    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._requestRecalc());
      this._ro.observe(el);
      this._ro.observe(this._track);
    }
    this._onWindowResize = () => this._requestRecalc();
    addListener(this._listeners, window, 'resize', this._onWindowResize);
    addListener(this._listeners, window, 'orientationchange', this._onWindowResize);

    if (this.params.features.lazyLoad.enabled) {
      addListener(this._listeners, document, 'zs:lazy', (event) => {
        if (event.detail && event.detail.instance === this) this._loadLazy();
      });
    }
  }

  /* ---------------------------------------------------------- measurement */

  _requestRecalc() {
    if (this.destroyed || !this.ready || this._recalcRaf) return;
    this._recalcRaf = requestAnimationFrame(() => {
      this._recalcRaf = null;
      if (!this.destroyed && this.ready) this.recalculate();
    });
  }

  _measure() {
    const el = this.el;
    const axis = this.params.axis;
    const gap = this.params.gap;
    const spv = this.params.slidesPerView;

    if (!this._viewport) return;
    if (!this._realCount) {
      this._empty = true;
      this._disabled = true;
      this._loopActive = false;
      this._renderSlides = [];
      this._pos = [0];
      this._sizes = [];
      this._viewport.style.height = '0px';
      return;
    }

    this._empty = false;
    this._rtl = this.params.dir === 'rtl';
    const rect = el.getBoundingClientRect();
    const viewportSize = Math.max(0, axis === 'x' ? el.clientWidth || rect.width : el.clientHeight || rect.height);

    // Natural sizes only for slidesPerView: 'auto'. Reset inline constraints first.
    this._slides.forEach((slide) => {
      if (spv === 'auto') {
        if (axis === 'x') slide.style.width = 'auto';
        else slide.style.height = 'auto';
      } else if (axis === 'x') {
        slide.style.width = '';
      } else {
        slide.style.height = '';
      }
    });

    // A vertical slider with no CSS height yet: derive one from slide content.
    let naturalHeight = 0;
    if (axis === 'y' && viewportSize < 1) {
      this._slides.forEach((slide) => { naturalHeight = Math.max(naturalHeight, slide.offsetHeight || 0); });
    }

    let sizes = [];
    if (spv === 'auto') {
      sizes = this._slides.map((slide) => {
        const measure = axis === 'x' ? slide.getBoundingClientRect().width : slide.getBoundingClientRect().height;
        return Math.max(40, Math.round(measure * 100) / 100);
      });
      const total = sizes.reduce((sum, size) => sum + size, 0) + gap * Math.max(0, sizes.length - 1);
      // Fallback for off-screen/unstyled slides: distribute the viewport evenly.
      if (total <= 1) sizes = this._slides.map(() => Math.max(40, viewportSize || 300));
    } else {
      const available = viewportSize > 1 ? viewportSize : naturalHeight * Math.ceil(spv) || 300;
      const per = Math.max(1, (available - gap * (spv - 1)) / spv);
      sizes = this._slides.map(() => Math.round(per * 100) / 100);
    }
    this._slideSizes = sizes;

    // Apply intrinsic sizing so transforms can be computed without layout reads.
    this._slides.forEach((slide, i) => {
      if (axis === 'x') {
        slide.style.width = `${sizes[i]}px`;
        slide.style.height = '';
      } else {
        slide.style.height = `${sizes[i]}px`;
        slide.style.width = '';
      }
    });

    // Viewport height (x axis) or fallback height (y axis).
    if (axis === 'x') {
      let maxHeight = 0;
      this._slides.forEach((slide) => {
        maxHeight = Math.max(maxHeight, slide.offsetHeight || 0);
      });
      this._slideHeights = this._slides.map((slide) => slide.offsetHeight || 0);
      const activeHeight = this._slideHeights[this._activeIndex] || maxHeight;
      const targetHeight = this.params.autoHeight ? activeHeight : maxHeight;
      if (targetHeight > 0) {
        this._viewport.style.transition = this.params.autoHeight ? `height ${this._transitionDuration()}ms ${this.params.animation.ease}` : 'none';
        const nextHeight = `${targetHeight}px`;
        if (this._viewport.style.height !== nextHeight) this._viewport.style.height = nextHeight;
      }
    } else {
      this._slideHeights = sizes.slice();
      if (viewportSize < 1) {
        const estimated = sizes[0] * (spv === 'auto' ? 1 : spv) + gap * Math.max(0, (spv === 'auto' ? 1 : Math.ceil(spv)) - 1);
        this._viewport.style.height = `${Math.max(0, estimated)}px`;
      } else {
        this._viewport.style.height = '';
      }
    }

    this._viewportSize = axis === 'y' && viewportSize < 1 ? this._viewport.clientHeight : viewportSize;

    // Real content extent decides loop/disable state before clones are built.
    let realExtent = 0;
    const realSizes = sizes;
    realSizes.forEach((size, i) => {
      realExtent += size + (i < realSizes.length - 1 ? gap : 0);
    });
    this._realExtent = realExtent;

    const needed = spv === 'auto' ? 1 : Math.ceil(spv);
    this._notEnough = this._realCount <= needed && realExtent <= this._viewportSize + 1;
    this._disabled = !!(this.params.fallback.disableIfNotEnoughSlides && this._notEnough);
    this._loopActive = !!this.params.loop && !this._disabled && this._realCount > 1 &&
      (this.params.type !== 'slide' || realExtent > this._viewportSize + 1);

    this._buildRender();

    // Clones share their source slide's box.
    this._renderSlides.forEach((entry) => {
      if (!entry.clone) return;
      if (axis === 'x') {
        entry.el.style.width = `${sizes[entry.real]}px`;
        entry.el.style.height = '';
      } else {
        entry.el.style.height = `${sizes[entry.real]}px`;
        entry.el.style.width = '';
      }
    });

    // Cumulative positions for the active render list.
    this._pos = [];
    this._sizes = [];
    let cursor = 0;
    this._renderSlides.forEach((entry, index) => {
      const size = sizes[entry.real] || 0;
      this._pos[index] = cursor;
      this._sizes[index] = size;
      cursor += size + gap;
    });
    this._renderExtent = Math.max(0, cursor - gap);

    this._clipRenderIndex();
    this._updateSlideClasses();
    this._loadLazy();
  }

  _buildRender() {
    const c = this._cls;
    const n = this._realCount;
    const spv = this.params.slidesPerView;
    const wantsClones = this._loopActive && this.params.type === 'slide' && n > 1;

    // Remove previously generated clones; real slides never disappear.
    Array.from(this._track.querySelectorAll(`[data-zs-clone]`)).forEach((node) => node.remove());

    if (!wantsClones) {
      this._usingClones = false;
      this._pre = 0;
      this._renderSlides = this._slides.map((slide, real) => ({ el: slide, real, clone: false }));
      return;
    }

    const perView = spv === 'auto' ? 2 : Math.ceil(spv);
    const cloneCount = Math.min(n - 1, Math.max(1, perView + (this.params.slidesToScroll > 1 ? 1 : 0)));
    const render = [];

    const makeClone = (real) => {
      const node = this._slides[real].cloneNode(true);
      node.removeAttribute('id');
      node.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
      node.querySelectorAll('a, button, input, select, textarea, [tabindex]').forEach((child) => {
        child.setAttribute('tabindex', '-1');
      });
      node.setAttribute('aria-hidden', 'true');
      if ('inert' in node) node.inert = true;
      node.setAttribute('data-zs-clone', '');
      node.classList.add(c.slide, c['slide-clone']);
      node.classList.remove(c['slide-active']);
      return node;
    };

    for (let i = n - cloneCount; i < n; i += 1) {
      const node = makeClone(i);
      this._track.insertBefore(node, this._slides[0]);
      render.push({ el: node, real: i, clone: true });
    }
    this._pre = cloneCount;
    this._slides.forEach((slide, real) => render.push({ el: slide, real, clone: false }));
    for (let i = 0; i < cloneCount; i += 1) {
      const node = makeClone(i);
      this._track.appendChild(node);
      render.push({ el: node, real: i, clone: true });
    }

    this._usingClones = true;
    this._renderSlides = render;
  }

  _clipRenderIndex() {
    const max = Math.max(0, this._renderSlides.length - 1);
    if (!Number.isFinite(this._renderIndex)) this._renderIndex = this._renderIndexFor(this._activeIndex);
    this._renderIndex = clamp(this._renderIndex, 0, max);
    if (!Number.isFinite(this._offset)) this._offset = this._offsetFor(this._renderIndex);
  }

  _offsetFor(renderIndex) {
    const pos = this._pos[renderIndex] || 0;
    const size = this._sizes[renderIndex] || 0;
    const center = this.params.centeredSlides ? (this._viewportSize - size) / 2 : 0;
    // RTL mirrors the x axis, so the centering padding has to be mirrored too.
    const rtl = this._rtl && this.params.axis === 'x';
    let offset = rtl ? -(pos + center) : -(pos - center);
    // Multi-slide, non-loop layouts must not scroll past the last page.
    const spv = this.params.slidesPerView;
    if (!this.params.centeredSlides && !this._loopActive && (spv === 'auto' || spv > 1)) {
      const maxScroll = Math.max(0, (this._realExtent || 0) - (this._viewportSize || 0));
      offset = Math.max(offset, -maxScroll);
    }
    return offset;
  }

  _renderIndexFor(realIndex) {
    const n = this._realCount;
    if (!n) return 0;
    const real = ((Math.round(realIndex) % n) + n) % n;
    if (!this._usingClones) return real;
    const candidates = [real + this._pre, real + this._pre - n, real + this._pre + n];
    const current = Number.isFinite(this._renderIndex) ? this._renderIndex : this._pre;
    let best = candidates[0];
    let bestDist = Infinity;
    candidates.forEach((candidate) => {
      if (candidate < 0 || candidate >= this._renderSlides.length) return;
      const dist = Math.abs(candidate - current);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    });
    return best;
  }

  _realIndexFor(renderIndex) {
    const n = this._realCount;
    if (!n) return 0;
    return ((renderIndex - this._pre) % n + n) % n;
  }

  _normalizeIndex(index) {
    const n = this._realCount || this._slides.length;
    if (!n) return 0;
    const canLoop = !!this.params.loop && !this._disabled;
    let value = Math.round(Number(index) || 0);
    if (value < 0) value = canLoop ? ((value % n) + n) % n : 0;
    if (value >= n) value = canLoop ? value % n : n - 1;
    return value;
  }

  _normalizeClones() {
    if (!this._usingClones) return false;
    const n = this._realCount;
    const pre = this._pre;
    let r = this._renderIndex;
    if (r < pre) r += n;
    else if (r >= pre + n) r -= n;
    if (r === this._renderIndex) return false;
    this._renderIndex = r;
    this._activeIndex = this._realIndexFor(r);
    this._offset = this._offsetFor(r);
    this._applyInstant(this._computeStyles());
    return true;
  }

  /* ------------------------------------------------------------- rendering */

  _cyclicRel(index, float) {
    const n = this._renderSlides.length || this._realCount;
    let rel = index - float;
    if (!this._loopActive || n <= 1) return rel;
    while (rel > n / 2) rel -= n;
    while (rel < -n / 2) rel += n;
    return rel;
  }

  _warnCustomTransform(err) {
    if (this._customWarned) return;
    this._customWarned = true;
    if (err) console.error('[ZikraSlider] custom.transform failed; falling back to neutral styles.', err);
    else console.warn('[ZikraSlider] type "custom" needs a custom.transform({ ... }) callback.');
  }

  _computeStyles() {
    const type = this.params.type;
    const axis = this.params.axis;
    const rtl = this._rtl;
    const sgn = rtl ? -1 : 1;
    const px = this.params.parallax || {};
    const entries = [];
    const target = this._renderIndex;
    const float = type === 'slide' ? target : (Number.isFinite(this._float) ? this._float : target);
    const spv = this.params.slidesPerView === 'auto' ? 2 : this.params.slidesPerView;

    this._renderSlides.forEach((entry, k) => {
      const size = this._sizes[k] || 0;
      let x = 0;
      let y = 0;
      let z = 0;
      let scale = 1;
      let rotate = 0;
      let rotateY = 0;
      let opacity = 1;
      let zIndex = 1;
      let visible = true;
      let inView = true;
      let parallax = 0;

      if (type === 'slide') {
        const logical = (this._pos[k] || 0) + this._offset;
        if (axis === 'x') x = rtl ? -logical : logical;
        else y = logical;
        if (axis === 'x') {
          const left = rtl ? -logical : logical;
          visible = left < this._viewportSize + 1 && left + size > -1;
          // Focus isolation: a slide sitting exactly at the edge is not reachable.
          inView = left < this._viewportSize - 1 && left + size > 1;
        } else {
          visible = logical < this._viewportSize + 1 && logical + size > -1;
          inView = logical < this._viewportSize - 1 && logical + size > 1;
        }
        if (px.enabled) {
          const rest = this.params.centeredSlides ? (this._viewportSize - size) / 2 : 0;
          parallax = (axis === 'x' ? x : logical) - rest;
        }
        zIndex = k === target ? 3 : 1;
      } else {
        const rel = this._cyclicRel(k, float);
        const abs = Math.abs(rel);
        if (px.enabled) parallax = rel * (this._viewportSize || 0);

        if (type === 'custom') {
          const fn = this.params.custom && this.params.custom.transform;
          let out = null;
          if (typeof fn === 'function') {
            try {
              out = fn({
                index: k,
                realIndex: entry.real,
                relative: rel,
                activeIndex: this._activeIndex,
                total: this._realCount,
                viewportSize: this._viewportSize,
                slideSize: size,
                axis,
                dir: this.params.dir,
                loop: !!this._loopActive
              });
            } catch (err) {
              this._warnCustomTransform(err);
              out = null;
            }
          } else {
            this._warnCustomTransform();
          }
          const o = out && typeof out === 'object' ? out : {};
          x = Number(o.x) || 0;
          y = Number(o.y) || 0;
          z = Number(o.z) || 0;
          scale = o.scale == null ? 1 : Number(o.scale) || 0;
          rotate = Number(o.rotate) || 0;
          rotateY = Number(o.rotateY) || 0;
          opacity = o.opacity == null ? 1 : clamp(Number(o.opacity) || 0, 0, 1);
          zIndex = o.zIndex == null
            ? Math.round((1 - Math.min(abs, 1)) * 100) + 1
            : Math.round(Number(o.zIndex)) || 0;
          visible = o.visible == null ? opacity > 0.02 : !!o.visible;
          inView = o.interactive == null ? visible && opacity > 0.05 : !!o.interactive;
        } else if (type === 'fade') {
          opacity = clamp(1 - abs, 0, 1);
          const drift = (axis === 'x' ? size * 0.08 : size * 0.06) * rel;
          if (axis === 'x') x = sgn * drift;
          else y = drift;
          zIndex = Math.round((1 - abs) * 100) + 1;
          visible = opacity > 0.02;
        } else if (type === 'scale') {
          opacity = clamp(1 - abs * 0.9, 0, 1);
          scale = 1 - Math.min(abs, 1) * 0.14;
          zIndex = Math.round((1 - abs) * 100) + 1;
          visible = opacity > 0.02;
        } else if (type === 'coverflow') {
          const shift = (axis === 'x' ? size * 0.52 : size * 0.4) * rel * sgn;
          if (axis === 'x') x = shift;
          else y = rel * size * 0.3;
          rotateY = clamp(-rel, -1, 1) * 42 * sgn;
          z = -abs * 130;
          scale = 1 - abs * 0.06;
          opacity = abs > 2.4 ? 0 : clamp(1 - abs * 0.2, 0, 1);
          zIndex = 100 - Math.round(abs * 10);
          visible = opacity > 0.02;
        } else if (type === 'stack') {
          y = -Math.max(rel, 0) * 20;
          scale = 1 - Math.max(rel, 0) * 0.07;
          opacity = rel < -0.5 ? 0 : clamp(1 - Math.max(rel, 0) * 0.2, 0, 1);
          zIndex = 60 - Math.round(rel * 10);
          visible = opacity > 0.02;
        } else if (type === 'cards') {
          if (axis === 'x') x = sgn * rel * size * 0.2;
          else y = rel * size * 0.2;
          x += sgn * Math.abs(rel) * 10;
          y += Math.abs(rel) * 20;
          rotate = rel * 4 * sgn;
          scale = 1 - abs * 0.06;
          opacity = abs > 2.2 ? 0 : clamp(1 - abs * 0.28, 0, 1);
          zIndex = 70 - Math.round(abs * 10);
          visible = opacity > 0.02;
        }
        if (type !== 'custom') {
          if (abs < 0.5) zIndex += 50;
          // Keep enough slides in the tree for a full viewport of stacking effects.
          if (abs > spv + 2) visible = false;
          inView = visible && opacity > 0.05;
        }
      }

      entries.push({
        el: entry.el,
        renderIndex: k,
        realIndex: entry.real,
        clone: entry.clone,
        active: k === target || (type !== 'slide' && Math.abs(this._cyclicRel(k, float)) < 0.5),
        visible,
        interactive: inView,
        parallax,
        style: { x, y, z, scale, rotate, rotateY, opacity, zIndex }
      });
    });

    return entries;
  }

  _transformString(style) {
    return `translate3d(${style.x}px, ${style.y}px, ${style.z}px) scale(${style.scale}) rotateZ(${style.rotate}deg) rotateY(${style.rotateY}deg)`;
  }

  /* --------------------------------------------------------------- parallax */

  _parallaxElements(slideEl) {
    let list = this._parallaxCache.get(slideEl);
    if (list) return list;
    list = [];
    const conf = this.params.parallax;
    if (conf && conf.enabled) {
      try {
        slideEl.querySelectorAll(conf.selector || '[data-zs-parallax]').forEach((node) => {
          const raw = node.getAttribute('data-zs-parallax');
          const parsed = raw == null || raw.trim() === '' ? NaN : parseFloat(raw);
          const factor = Number.isFinite(parsed) ? parsed : Number(conf.factor) || 0;
          if (factor) list.push({ el: node, factor });
        });
      } catch (err) {
        // An invalid selector disables parallax instead of breaking the slider.
      }
    }
    this._parallaxCache.set(slideEl, list);
    return list;
  }

  _parallaxShift(edge, factor) {
    const amount = -(Number(edge) || 0) * factor;
    return this.params.axis === 'y' ? { x: 0, y: amount } : { x: amount, y: 0 };
  }

  _touchParallax(node) {
    if (this._parallaxTouched.has(node)) return;
    this._parallaxTouched.set(node, {
      transform: node.style.transform,
      opacity: node.style.opacity,
      transition: node.style.transition,
      transitionDelay: node.style.transitionDelay,
      willChange: node.style.willChange
    });
  }

  _resetParallax() {
    this._parallaxTouched.forEach((original, node) => {
      if (!node || !node.style) return;
      if (original.transform) node.style.transform = original.transform;
      else node.style.removeProperty('transform');
      if (original.opacity) node.style.opacity = original.opacity;
      else node.style.removeProperty('opacity');
      if (original.transition) node.style.transition = original.transition;
      else node.style.removeProperty('transition');
      if (original.transitionDelay) node.style.transitionDelay = original.transitionDelay;
      else node.style.removeProperty('transition-delay');
      if (original.willChange) node.style.willChange = original.willChange;
      else node.style.removeProperty('will-change');
    });
    this._parallaxTouched.clear();
    this._innerState = new WeakMap();
    this._parallaxCache = new WeakMap();
  }

  _applyParallax(entries) {
    const conf = this.params.parallax;
    if (!conf || !conf.enabled) return;
    entries.forEach((entry) => {
      this._parallaxElements(entry.el).forEach(({ el, factor }) => {
        const shift = this._parallaxShift(entry.parallax, factor);
        this._touchParallax(el);
        el.style.transition = 'none';
        el.style.transitionDelay = '0ms';
        el.style.transform = `translate3d(${shift.x}px, ${shift.y}px, 0)`;
        this._innerState.set(el, shift);
      });
    });
  }

  _applyInstant(entries) {
    entries.forEach(({ el, style }) => {
      el.style.transition = 'none';
      el.style.transform = this._transformString(style);
      el.style.opacity = String(style.opacity);
      el.style.zIndex = String(style.zIndex);
      if (this.params.type !== 'slide') el.style.pointerEvents = style.opacity > 0.05 ? 'auto' : 'none';
      else el.style.pointerEvents = '';
    });
    this._applyParallax(entries);
    this._styleState = new Map(entries.map((entry) => [entry.el, entry.style]));
    this._updateSlideClasses(entries);
  }

  _updateSlideClasses(entries) {
    const list = entries || this._computeStyles();
    const c = this._cls;
    const a11y = this.params.features.a11y.enabled;
    list.forEach((entry) => {
      const el = entry.el;
      el.classList.toggle(c['slide-active'], !!entry.active);
      el.classList.toggle(c['slide-visible'], entry.visible);
      if (a11y) {
        if (entry.clone || !entry.visible) el.setAttribute('aria-hidden', 'true');
        else el.removeAttribute('aria-hidden');
        // Keep off-screen slides out of the tab order (clones are inert already).
        if (!entry.clone && 'inert' in el) el.inert = !entry.interactive;
      }
    });
    this._lastEntries = list;
  }

  _announce() {
    if (!this._live || !this.params.features.a11y.liveRegion || !this._realCount) return;
    if (this._announceTimer) {
      clearTimeout(this._announceTimer);
      this._timers.delete(this._announceTimer);
    }
    this._announceTimer = setTimeout(() => {
      if (this.destroyed) return;
      const label = `Slide ${this._activeIndex + 1} of ${this._realCount}`;
      this._live.textContent = label;
    }, 120);
    this._timers.add(this._announceTimer);
  }

  /* ------------------------------------------------------------ lazy load */

  _lazyTargets() {
    if (!this.params.features.lazyLoad.enabled || !this._renderSlides) return [];
    const mode = this.params.features.lazyLoad.mode;
    if (mode === 'eager') return this._renderSlides;
    const radius = mode === 'onDemand' ? 0 : Math.ceil(this.params.slidesPerView === 'auto' ? 2 : this.params.slidesPerView) + 1;
    return this._renderSlides.filter((entry) => {
      const diff = Math.abs(entry.real - this._activeIndex);
      if (!this._loopActive) return diff <= radius;
      return Math.min(diff, this._realCount - diff) <= radius;
    });
  }

  _loadLazy() {
    const lazy = this.params.features.lazyLoad;
    if (!lazy.enabled) return;
    const placeholder = lazy.placeholder;
    const targets = this._lazyTargets();
    targets.forEach(({ el }) => {
      el.querySelectorAll('img').forEach((img) => {
        const source = img.getAttribute('data-zs-src');
        if (!source) return;
        const srcset = img.getAttribute('data-zs-srcset');
        if (!img.getAttribute('src') && placeholder) img.setAttribute('src', placeholder);
        if (img.getAttribute('data-zs-loading') === '1') return;
        img.setAttribute('data-zs-loading', '1');
        const onLoad = () => {
          img.removeAttribute('data-zs-loading');
          this._requestRecalc();
        };
        const onError = () => {
          img.removeAttribute('data-zs-loading');
          const handler = lazy.onMediaError || this.params.fallback.onMediaError;
          if (typeof handler === 'function') {
            try { handler(img, source); } catch (err) { /* merchant callback must not break slider */ }
          }
          img.setAttribute('data-zs-error', source);
        };
        img.addEventListener('load', onLoad, { once: true });
        img.addEventListener('error', onError, { once: true });
        this._mediaLoadListeners.push({ img, onLoad, onError });
        if (srcset) img.setAttribute('srcset', srcset);
        img.setAttribute('src', source);
        img.removeAttribute('data-zs-src');
        img.removeAttribute('data-zs-srcset');
      });
    });
  }

  _connectMedia() {
    if (!this._slides) return;
    this._slides.forEach((slide) => {
      slide.querySelectorAll('img').forEach((img) => {
        if (img.getAttribute('data-zs-media') === '1') return;
        img.setAttribute('data-zs-media', '1');
        this._mediaMarks.push(img);
        const onLoad = () => this._requestRecalc();
        const onError = () => {
          const handler = this.params.fallback.onMediaError;
          if (typeof handler === 'function') {
            try { handler(img, img.currentSrc || img.src); } catch (err) { /* noop */ }
          }
        };
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onError);
        this._mediaLoadListeners.push({ img, onLoad, onError });
      });
    });
  }

  /* -------------------------------------------------------- anim transitions */

  _transitionDuration() {
    if (typeof this._speedOverride === 'number') return Math.max(0, this._speedOverride);
    const configured = this.params.animation.duration;
    const duration = configured == null ? this.params.speed : configured;
    return Math.max(0, Number(duration) || 0);
  }

  _render({ instant = false } = {}) {
    if (this.destroyed || !this._renderSlides || !this._renderSlides.length) return;
    const entries = this._computeStyles();
    this._targetEntries = entries;
    if (instant) {
      this._cancelAnimations();
      this._applyInstant(entries);
      this._updateControls();
      return;
    }
    this._animate(entries);
  }

  _cancelAnimations() {
    this._animSeq = (this._animSeq || 0) + 1;
    this._animating = false;
    if (this._animTimer) {
      clearTimeout(this._animTimer);
      this._timers.delete(this._animTimer);
      this._animTimer = null;
    }
    if (this._progressRaf) {
      cancelAnimationFrame(this._progressRaf);
      this._progressRaf = null;
    }
    this._waapi.forEach((animation) => {
      try { animation.cancel(); } catch (err) { /* already cancelled */ }
    });
    this._waapi = [];
    if (this._cls) this.el.classList.remove(this._cls.animating);
  }

  _planTransition(entries, effect, duration, reduced) {
    const fromMap = this._styleState || new Map();
    const targetIndex = this._renderIndex;
    const forward = this._directionForward !== false;
    const plan = [];

    entries.forEach((entry) => {
      let from = { ...(fromMap.get(entry.el) || entry.style) };
      const to = entry.style;
      const distance = Math.abs(entry.renderIndex - targetIndex);

      if (!reduced) {
        if (effect === 'fade' && entry.active) {
          from.opacity = 0;
        } else if (effect === 'zoom' && entry.active) {
          from.scale = (to.scale == null ? 1 : to.scale) * 0.86;
          from.opacity = Math.min(from.opacity, 0.7);
        } else if (effect === 'slide-up' && entry.active) {
          from.y = (from.y || 0) + 56;
          from.opacity = Math.min(from.opacity, 0.4);
        } else if (effect === 'flip' && entry.active) {
          from.rotateY = (forward ? -1 : 1) * 72;
        }
      }

      if (reduced) {
        // Transforms jump; only opacity cross-fades.
        from = { ...to, opacity: from.opacity };
      }

      const delay = effect === 'stagger'
        ? Math.min(distance, 3) * Math.max(40, Math.round(duration * 0.09))
        : 0;

      plan.push({ el: entry.el, from, to, delay, distance });

      const conf = this.params.parallax;
      if (conf && conf.enabled) {
        this._parallaxElements(entry.el).forEach(({ el, factor }) => {
          const innerTo = this._parallaxShift(entry.parallax, factor);
          const prev = this._innerState.get(el);
          const innerFrom = reduced || !prev ? { ...innerTo } : { x: prev.x, y: prev.y };
          this._touchParallax(el);
          plan.push({ el, inner: true, from: innerFrom, to: innerTo, delay, distance });
        });
      }
    });

    return plan;
  }

  _animate(entries) {
    this._cancelAnimations();
    const id = (this._animSeq += 1);
    let duration = this._transitionDuration();
    const anim = this.params.animation;
    let effect = anim.effect || 'slide';
    const reduced = prefersReducedMotion();

    if (reduced && this.params.fallback.reducedMotion === 'instant') duration = 0;
    if (reduced && this.params.fallback.reducedMotion === 'fade') {
      duration = Math.min(duration, 220);
      effect = 'fade';
    }

    if (duration <= 0) {
      this._applyInstant(entries);
      this._normalizeClones();
      this._emitProgress(this.getProgress());
      this._updateControls();
      this._updateAutoHeight();
      this._loadLazy();
      this._updateSlideClasses(entries);
      this._afterTransition();
      return;
    }

    const plan = this._planTransition(entries, effect, duration, reduced);
    let maxDelay = 0;
    plan.forEach((item) => { maxDelay = Math.max(maxDelay, item.delay); });

    this._animating = true;
    this.el.classList.add(this._cls.animating);
    const progressTo = this.getProgress();
    const progressFrom = this._pendingChange && this._realCount > 1
      ? clamp(this._pendingChange.previousIndex / (this._realCount - 1), 0, 1)
      : progressTo;
    this._emitProgress(progressFrom);
    this._startProgress(duration + maxDelay, id, progressFrom, progressTo);

    const library = resolveAnimationLibrary(anim.library);
    if (library) {
      try {
        const tasks = plan.map(({ el, from, to, delay, inner }) => {
          el.style.transition = 'none';
          if (inner) {
            el.style.transform = `translate3d(${from.x}px, ${from.y}px, 0)`;
            return Promise.resolve(library.adapter.fromTo(
              el,
              { ...from, z: 0, scale: 1, rotate: 0, rotateY: 0, opacity: 1 },
              { ...to, z: 0, scale: 1, rotate: 0, rotateY: 0, opacity: 1 },
              { duration, delay, easing: anim.ease }
            ));
          }
          el.style.transform = this._transformString(from);
          el.style.opacity = String(from.opacity);
          el.style.zIndex = String(to.zIndex);
          return Promise.resolve(library.adapter.fromTo(el, from, to, {
            duration,
            delay,
            easing: anim.ease
          }));
        });
        Promise.all(tasks).then(
          () => this._finishAnimation(id),
          () => this._finishAnimation(id)
        );
        this._scheduleAnimationFinish(id, duration + maxDelay + 320);
        this._backend = library.label;
        return;
      } catch (err) {
        // Broken adapter: dissolve to the CSS path below.
        this._backend = 'css';
      }
    }

    if (anim.fallback === 'waapi' && this._supportsWaapi()) {
      this._backend = 'waapi';
      const animations = plan.map(({ el, from, to, delay, inner }) => {
        el.style.transition = 'none';
        if (inner) {
          el.style.transform = `translate3d(${from.x}px, ${from.y}px, 0)`;
          const animation = el.animate(
            [
              { transform: `translate3d(${from.x}px, ${from.y}px, 0)` },
              { transform: `translate3d(${to.x}px, ${to.y}px, 0)` }
            ],
            { duration, delay, easing: anim.ease || 'ease-out', fill: 'both' }
          );
          this._waapi.push(animation);
          return animation.finished.catch(() => {});
        }
        el.style.zIndex = String(to.zIndex);
        const animation = el.animate(
          [
            { transform: this._transformString(from), opacity: String(from.opacity) },
            { transform: this._transformString(to), opacity: String(to.opacity) }
          ],
          { duration, delay, easing: anim.ease || 'ease-out', fill: 'both' }
        );
        this._waapi.push(animation);
        return animation.finished.catch(() => {});
      });
      Promise.all(animations).then(() => this._finishAnimation(id));
      this._scheduleAnimationFinish(id, duration + maxDelay + 140);
      return;
    }

    this._backend = 'css';
    this._animateCss(plan, duration, anim.ease, id);
  }

  _supportsWaapi() {
    return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  }

  _animateCss(plan, duration, ease, id) {
    const easing = ease || 'ease-out';
    plan.forEach(({ el, from, to, inner }) => {
      el.style.transition = 'none';
      el.style.transitionDelay = '0ms';
      if (inner) {
        el.style.willChange = 'transform';
        el.style.transform = `translate3d(${from.x}px, ${from.y}px, 0)`;
        return;
      }
      el.style.willChange = 'transform, opacity';
      el.style.transform = this._transformString(from);
      el.style.opacity = String(from.opacity);
      el.style.zIndex = String(to.zIndex);
    });

    // Flush the "from" state so the browser has a start value to interpolate.
    void this.el.offsetWidth;

    let maxDelay = 0;
    plan.forEach(({ el, to, delay, inner }) => {
      maxDelay = Math.max(maxDelay, delay);
      if (inner) {
        el.style.transition = `transform ${duration}ms ${easing}`;
        el.style.transitionDelay = `${delay}ms`;
        el.style.transform = `translate3d(${to.x}px, ${to.y}px, 0)`;
        return;
      }
      el.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
      el.style.transitionDelay = `${delay}ms`;
      el.style.transform = this._transformString(to);
      el.style.opacity = String(to.opacity);
      el.style.zIndex = String(to.zIndex);
    });

    this._scheduleAnimationFinish(id, duration + maxDelay + 40);
  }

  _startProgress(total, id, from = 0, to = 1) {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const tick = (now) => {
      if (this.destroyed || this._animSeq !== id || !this._animating) return;
      const elapsed = (now || Date.now()) - start;
      const value = clamp(elapsed / Math.max(1, total), 0, 0.995);
      this._emitProgress(from + (to - from) * value);
      this._progressRaf = requestAnimationFrame(tick);
    };
    this._progressRaf = requestAnimationFrame(tick);
  }

  _scheduleAnimationFinish(id, delay) {
    this._animTimer = setTimeout(() => {
      this._timers.delete(this._animTimer);
      this._animTimer = null;
      this._finishAnimation(id);
    }, Math.max(16, delay));
    this._timers.add(this._animTimer);
  }

  _finishAnimation(id) {
    if (this.destroyed || id !== this._animSeq || !this._animating) return;
    this._animating = false;
    if (this._animTimer) {
      clearTimeout(this._animTimer);
      this._timers.delete(this._animTimer);
      this._animTimer = null;
    }
    if (this._progressRaf) {
      cancelAnimationFrame(this._progressRaf);
      this._progressRaf = null;
    }
    this._waapi.forEach((animation) => {
      try { animation.cancel(); } catch (err) { /* noop */ }
    });
    this._waapi = [];
    this.el.classList.remove(this._cls.animating);

    this._applyInstant(this._targetEntries || this._computeStyles());
    this._emitProgress(this.getProgress());
    this._normalizeClones();
    this._updateControls();
    this._updateAutoHeight();
    this._loadLazy();
    this._announce();
    this._afterTransition();
  }

  _updateAutoHeight() {
    if (!this.params.autoHeight || this.params.axis !== 'x' || !this._slideHeights) return;
    const height = this._slideHeights[this._activeIndex] || 0;
    if (height > 0) this._viewport.style.height = `${height}px`;
  }

  _afterTransition() {
    this._speedOverride = null;
    this._announce();
    const pending = this._pendingChange;
    this._pendingChange = null;
    if (pending) {
      this._emit('afterChange', {
        index: pending.index,
        previousIndex: pending.previousIndex,
        reason: pending.reason
      });
      this._notifyPlugins('onChange', {
        index: pending.index,
        previousIndex: pending.previousIndex,
        reason: pending.reason
      });
      this._notifySync('change');
    }
    this._syncOrigin = null;
    this._scheduleAutoplay();
  }

  _emitProgress(progress) {
    this._emit('progress', { progress, index: this._activeIndex });
    this._notifySync('progress', progress);
  }

  /* --------------------------------------------------------------- events */

  on(event, callback) {
    if (typeof callback !== 'function' || typeof event !== 'string') return this;
    if (!this._events.has(event)) this._events.set(event, new Set());
    this._events.get(event).add(callback);
    return this;
  }

  off(event, callback) {
    if (!this._events.has(event)) return this;
    if (!callback) this._events.delete(event);
    else this._events.get(event).delete(callback);
    return this;
  }

  _eventHandlers(name) {
    const handlers = Array.from(this._events.get(name) || []);
    const configured = this.params.on && this.params.on[name];
    if (typeof configured === 'function') handlers.unshift(configured);
    else if (Array.isArray(configured)) handlers.unshift(...configured.filter((fn) => typeof fn === 'function'));
    return handlers;
  }

  _emit(name, payload) {
    this._eventHandlers(name).forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[ZikraSlider] "${name}" listener failed:`, err);
      }
    });
  }

  _emitCancellable(name, payload) {
    const handlers = this._eventHandlers(name);
    for (const handler of handlers) {
      try {
        if (handler(payload) === false) return false;
      } catch (err) {
        console.error(`[ZikraSlider] "${name}" listener failed:`, err);
      }
    }
    return true;
  }

  _initPlugins() {
    this._pluginList = [];
    flatten(this.params.plugins).forEach((plugin) => {
      if (!plugin || typeof plugin.init !== 'function') return;
      try {
        plugin.init(this);
        this._pluginList.push(plugin);
      } catch (err) {
        console.error(`[ZikraSlider] plugin "${plugin.name || 'unnamed'}" init failed:`, err);
      }
    });
  }

  _notifyPlugins(method, payload) {
    this._pluginList.forEach((plugin) => {
      if (typeof plugin[method] !== 'function') return;
      try {
        plugin[method](this, payload);
      } catch (err) {
        console.error(`[ZikraSlider] plugin "${plugin.name || 'unnamed'}" ${method} failed:`, err);
      }
    });
  }

  /* ------------------------------------------------------------ navigation */

  _settle() {
    if (!this._animating) return;
    this._finishAnimation(this._animSeq);
  }

  goTo(index, opts = {}) {
    if (!this.ready || this.destroyed || !this._realCount) return this;
    if (this._animating) this._settle();
    if (this._momentum) this._stopMomentum();

    const target = this._normalizeIndex(index);
    const previousIndex = this._activeIndex;
    const reason = opts.reason || 'api';

    if (target === previousIndex && !opts.force) {
      this._float = undefined;
      this._snapBack(this._transitionDuration());
      return this;
    }

    if (!opts.silent) {
      const allowed = this._emitCancellable('beforeChange', { index: target, previousIndex, reason });
      if (!allowed) return this;
    }

    this._directionForward = target >= previousIndex;
    this._activeIndex = target;
    this._renderIndex = this._renderIndexFor(target);
    this._offset = this._offsetFor(this._renderIndex);
    this._float = undefined;
    this._pendingChange = { index: target, previousIndex, reason };
    this._speedOverride = typeof opts.speed === 'number' ? opts.speed : null;
    this._updateControls();

    if (this._pendingChange && !this._loopActive && !this.params.loop && target === previousIndex) {
      this._pendingChange = null;
      return this;
    }

    this._render();
    if (this._animating === false) {
      // Duration 0 path already flushed events synchronously in _animate.
      this._speedOverride = null;
    }
    return this;
  }

  next(opts = {}) {
    if (!this.ready || this.destroyed) return this;
    if (this._disabled) return this;
    const step = Math.max(1, this.params.slidesToScroll);
    const canLoop = this._loopActive;
    if (!canLoop && this._activeIndex >= this._realCount - 1) {
      this._snapBack(this._transitionDuration());
      return this;
    }
    return this.goTo(this._activeIndex + step, { ...opts, reason: opts.reason || 'next' });
  }

  prev(opts = {}) {
    if (!this.ready || this.destroyed) return this;
    if (this._disabled) return this;
    const step = Math.max(1, this.params.slidesToScroll);
    const canLoop = this._loopActive;
    if (!canLoop && this._activeIndex <= 0) {
      this._snapBack(this._transitionDuration());
      return this;
    }
    return this.goTo(this._activeIndex - step, { ...opts, reason: opts.reason || 'prev' });
  }

  _snapBack(duration) {
    if (!this._renderSlides.length) return;
    this._offset = this._offsetFor(this._renderIndex);
    this._float = undefined;
    this._speedOverride = typeof duration === 'number' ? duration : null;
    this._render();
    if (!this._animating) this._speedOverride = null;
  }

  _nearestRenderIndex(offset) {
    let best = this._renderIndex;
    let bestDist = Infinity;
    for (let k = 0; k < this._renderSlides.length; k += 1) {
      const dist = Math.abs(this._offsetFor(k) - offset);
      if (dist < bestDist) {
        bestDist = dist;
        best = k;
      }
    }
    return best;
  }

  /* -------------------------------------------------------------- controls */

  _resolveEl(value, root = false) {
    if (!value || !canUseDOM()) return null;
    if (isElement(value)) return value;
    if (typeof value !== 'string') return null;
    try {
      return (root ? this.el : document).querySelector(value);
    } catch (err) {
      return null;
    }
  }

  _buildControls() {
    this._buildArrows();
    this._buildBullets();
  }

  _buildArrows() {
    const conf = this.params.arrows;
    const c = this._cls;
    if (!conf.enabled) return;

    const externalPrev = this._resolveEl(conf.prevEl);
    const externalNext = this._resolveEl(conf.nextEl);
    this._arrowPrev = this._createArrow('prev', externalPrev);
    this._arrowNext = this._createArrow('next', externalNext);

    const needsWrapper = !externalPrev || !externalNext;
    if (needsWrapper) {
      const customContainer = this._resolveEl(conf.container);
      if (customContainer) {
        // Author-provided container: inject only generated arrows, leave its classes alone.
        if (!externalPrev && this._arrowPrev) {
          customContainer.appendChild(this._arrowPrev);
          this._generatedArrows.push(this._arrowPrev);
        }
        if (!externalNext && this._arrowNext) {
          customContainer.appendChild(this._arrowNext);
          this._generatedArrows.push(this._arrowNext);
        }
      } else {
        this._arrowsWrap = createEl('div', `${c.arrows} ${conf.className || ''}`.trim());
        if (!externalPrev && this._arrowPrev) this._arrowsWrap.appendChild(this._arrowPrev);
        if (!externalNext && this._arrowNext) this._arrowsWrap.appendChild(this._arrowNext);
        this.el.appendChild(this._arrowsWrap);
        this._generated.push(this._arrowsWrap);
      }
    }
  }

  _createArrow(direction, external) {
    const conf = this.params.arrows;
    const c = this._cls;
    const base = `${c.arrow} ${c[`arrow-${direction}`]}`;
    const extra = direction === 'prev' ? conf.prevClass : conf.nextClass;
    let el = external;
    if (!el) {
      el = createEl('button', `${base} ${conf.className || ''} ${extra || ''}`.trim());
      el.type = 'button';
      el.innerHTML = direction === 'prev' ? conf.prevHtml : conf.nextHtml;
    } else {
      this._controlSnapshots.push({ el, className: el.className, html: el.innerHTML });
      el.classList.add(...base.split(' ').filter(Boolean));
      if (conf.className) conf.className.split(/\s+/).filter(Boolean).forEach((name) => el.classList.add(name));
      if (extra) extra.split(/\s+/).filter(Boolean).forEach((name) => el.classList.add(name));
      if (!el.innerHTML.trim()) el.innerHTML = direction === 'prev' ? conf.prevHtml : conf.nextHtml;
    }

    el.setAttribute('aria-label', direction === 'prev' ? conf.ariaPrevLabel : conf.ariaNextLabel);
    const handler = (event) => {
      event.preventDefault();
      this._userInteracted();
      if (direction === 'prev') this.prev({ reason: 'arrow' }); else this.next({ reason: 'arrow' });
    };
    if (!this._controlListeners) this._controlListeners = [];
    addListener(this._controlListeners, el, 'click', handler);
    this._arrowEls = this._arrowEls || {};
    this._arrowEls[direction] = el;
    return el;
  }

  _buildBullets() {
    const conf = this.params.bullets;
    const c = this._cls;
    if (!conf.enabled || !this._realCount) return;

    const external = this._resolveEl(conf.el);
    const container = external || createEl('div', '');
    this._bulletsEl = container;
    this._bulletsExternal = !!external;
    this._bulletsSignature = '';

    const classes = [c.bullets, conf.className || ''];
    if (conf.type === 'fraction') classes.push(c.fraction);
    if (conf.type === 'progressbar') classes.push(c.progressbar);
    if (external) {
      this._controlSnapshots.push({ el: container, className: container.className, html: container.innerHTML });
    }
    container.classList.add(...classes.filter(Boolean));

    if (!external) {
      this.el.appendChild(container);
      this._generated.push(container);
    }
    if (!this._controlListeners) this._controlListeners = [];
    this._bulletEls = [];
    this._progressFill = null;
    this._bulletsSignature = '';
    this._ensureBulletContent();
  }

  _ensureBulletContent() {
    const conf = this.params.bullets;
    const type = conf.type;
    if (!this._bulletsEl) return;
    if (type === 'fraction') {
      this._bulletsSignature = 'fraction';
      return;
    }
    if (type === 'progressbar') {
      this._bulletsEl.innerHTML = '';
      const fill = createEl('div', this._cls['progressbar-fill']);
      this._bulletsEl.appendChild(fill);
      this._progressFill = fill;
      this._bulletsEl.setAttribute('role', 'progressbar');
      this._bulletsEl.setAttribute('aria-label', 'Slide progress');
      this._bulletsEl.setAttribute('aria-valuemin', '0');
      this._bulletsEl.setAttribute('aria-valuemax', '100');
      this._bulletsEl.setAttribute('data-orientation', this.params.axis === 'x' ? 'horizontal' : 'vertical');
      this._bulletsSignature = 'progressbar';
      return;
    }

    const signature = `bullets:${this._realCount}:${conf.bulletClass}:${!!conf.render}`;
    if (signature === this._bulletsSignature) return;
    this._bulletsSignature = signature;
    this._bulletsEl.innerHTML = '';
    this._bulletEls = [];

    for (let i = 0; i < this._realCount; i += 1) {
      const bullet = createEl('button', `${this._cls.bullet} ${conf.bulletClass || ''}`.trim());
      bullet.type = 'button';
      bullet.setAttribute('aria-label', `Go to slide ${i + 1}`);
      this._renderBulletContent(bullet, i, false);
      if (conf.clickable) {
        addListener(this._controlListeners, bullet, 'click', () => {
          this._userInteracted();
          this.goTo(i, { reason: 'bullet' });
        });
      } else {
        bullet.setAttribute('disabled', '');
      }
      this._bulletsEl.appendChild(bullet);
      this._bulletEls.push(bullet);
    }
    this._bulletsEl.setAttribute('role', 'group');
    this._bulletsEl.setAttribute('aria-label', 'Slide pagination');
  }

  _renderBulletContent(bullet, index, isActive) {
    const render = this.params.bullets.render;
    if (typeof render !== 'function') {
      bullet.innerHTML = '';
      return;
    }
    let output;
    try {
      output = render({ index, isActive, total: this._realCount });
    } catch (err) {
      return;
    }
    if (typeof output === 'string') bullet.innerHTML = output;
    else if (output && output.nodeType === 1) bullet.replaceChildren(output);
  }

  _updateControls() {
    if (this.destroyed) return;
    const c = this._cls;
    const n = this._realCount || 0;
    const index = Number.isFinite(this._activeIndex) ? this._activeIndex : 0;
    const canLoop = this._loopActive;
    const atStart = index <= 0;
    const atEnd = index >= n - 1;

    const updateArrow = (el, direction) => {
      if (!el) return;
      const conf = this.params.arrows;
      const edge = direction === 'prev' ? atStart : atEnd;
      const disabled = this._disabled || !n || (!canLoop && edge);
      if ('disabled' in el) el.disabled = disabled;
      el.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      if (conf.hideAtEdges) {
        el.classList.toggle(c['arrow-hidden'], !canLoop && edge);
        el.setAttribute('aria-hidden', !canLoop && edge ? 'true' : 'false');
      }
      if (typeof conf.render === 'function') {
        let output;
        try {
          output = conf.render({ direction, index, total: n });
        } catch (err) {
          output = null;
        }
        if (typeof output === 'string') el.innerHTML = output;
        else if (output && output.nodeType === 1) el.replaceChildren(output);
      }
    };
    updateArrow(this._arrowPrev || (this._arrowEls && this._arrowEls.prev), 'prev');
    updateArrow(this._arrowNext || (this._arrowEls && this._arrowEls.next), 'next');

    const conf = this.params.bullets;
    if (!conf.enabled || !this._bulletsEl) return;
    const progress = n > 1 ? index / (n - 1) : 0;

    if (conf.type === 'fraction') {
      const formatter = typeof conf.formatFraction === 'function' ? conf.formatFraction : LABELS.fraction;
      this._bulletsEl.textContent = formatter(index + 1, n);
    } else if (conf.type === 'progressbar') {
      if (this._progressFill) {
        if (this.params.axis === 'x') {
          this._progressFill.style.width = `${(progress * 100).toFixed(2)}%`;
          this._progressFill.style.height = '';
        } else {
          this._progressFill.style.height = `${(progress * 100).toFixed(2)}%`;
          this._progressFill.style.width = '';
        }
      }
      this._bulletsEl.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    } else {
      if (!this._bulletEls || this._bulletEls.length !== n) this._ensureBulletContent();
      const activeClass = conf.activeClass || c['bullet-active'];
      const radius = conf.dynamicBullets ? 2 : Infinity;
      (this._bulletEls || []).forEach((bullet, i) => {
        const isActive = i === index;
        bullet.classList.toggle(activeClass, isActive);
        if (isActive) bullet.setAttribute('aria-current', 'true');
        else bullet.removeAttribute('aria-current');
        bullet.classList.toggle(c['bullet-active'], isActive && activeClass !== c['bullet-active']);
        if (conf.dynamicBullets && n > 7) {
          bullet.hidden = Math.abs(i - index) > radius;
          if (isActive) this._renderBulletContent(bullet, i, true);
        } else {
          bullet.hidden = false;
          this._renderBulletContent(bullet, i, isActive);
        }
      });
    }
  }

  _destroyControls() {
    removeListeners(this._controlListeners || []);
    this._controlListeners = [];
    (this._controlSnapshots || []).forEach(({ el, className, html }) => {
      el.className = className;
      el.innerHTML = html;
    });
    this._controlSnapshots = [];
    this._generatedArrows.forEach((node) => {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    this._generatedArrows = [];
    if (this._arrowsWrap && this._arrowsWrap.isConnected) this._arrowsWrap.remove();
    if (this._bulletsEl && !this._bulletsExternal && this._bulletsEl.isConnected) this._bulletsEl.remove();
    this._arrowPrev = null;
    this._arrowNext = null;
    this._arrowEls = null;
    this._arrowsWrap = null;
    this._bulletsEl = null;
    this._bulletEls = [];
    this._progressFill = null;
    this._bulletsSignature = '';
  }

  /* -------------------------------------------------------------- autoplay */

  _startAutoplay() {
    this._autoplayPlaying = !!this.params.features.autoplay.enabled;
    this._stoppedByUser = false;
    this._scheduleAutoplay();
  }

  play() {
    if (!this.ready || this.destroyed || this._disabled) return this;
    this._autoplayPlaying = true;
    this._stoppedByUser = false;
    this._scheduleAutoplay();
    return this;
  }

  pause() {
    this._autoplayPlaying = false;
    this._clearAutoplay();
    return this;
  }

  toggleAutoplay() {
    return this._autoplayPlaying ? this.pause() : this.play();
  }

  _clearAutoplay() {
    if (this._autoplayTimer) {
      clearTimeout(this._autoplayTimer);
      this._timers.delete(this._autoplayTimer);
      this._autoplayTimer = null;
    }
    this._autoplayRunning = false;
  }

  _canAutoplay() {
    const conf = this.params.features.autoplay;
    if (!this.ready || this.destroyed || !this._autoplayPlaying || this._stoppedByUser) return false;
    if (!conf.enabled || this._disabled || this._realCount < 2) return false;
    if (conf.pauseOnHover && this._hoverPaused) return false;
    if (conf.pauseOnFocus && this._focusPaused) return false;
    if (conf.pauseOnHiddenTab && typeof document !== 'undefined' && document.hidden) return false;
    return true;
  }

  _scheduleAutoplay() {
    this._clearAutoplay();
    if (!this._canAutoplay() || this._animating) return;
    if (!this._loopActive && this._activeIndex >= this._realCount - 1) {
      this._autoplayPlaying = false;
      return;
    }
    const delay = Math.max(250, Number(this.params.features.autoplay.delay) || 4000);
    this._autoplayRunning = true;
    this._autoplayTimer = setTimeout(() => {
      this._timers.delete(this._autoplayTimer);
      this._autoplayTimer = null;
      this._autoplayRunning = false;
      if (!this._canAutoplay() || this._animating) return;
      this.next({ reason: 'autoplay' });
      if (!this._animating) this._scheduleAutoplay();
    }, delay);
    this._timers.add(this._autoplayTimer);
  }

  _userInteracted() {
    if (!this.ready) return;
    if (this.params.features.autoplay.stopOnInteraction) {
      this._stoppedByUser = true;
      this._autoplayPlaying = false;
      this._clearAutoplay();
    }
  }

  /* ------------------------------------------------------------------ drag */

  _stepSize() {
    const index = this._renderIndex || 0;
    const size = (this._sizes && this._sizes[index]) || 0;
    const step = size + this.params.gap;
    return step > 0 ? step : Math.max(1, this._viewportSize);
  }

  _dragProgress() {
    if (!this._realCount || this._realCount < 2) return 0;
    let float;
    if (this.params.type === 'slide') {
      const drag = this._drag;
      const start = drag ? drag.startOffset : this._offsetFor(this._activeIndex);
      float = this._activeIndex - (this._offset - start) / this._stepSize();
    } else {
      float = Number.isFinite(this._float) ? this._float : this._activeIndex;
    }
    return clamp(float / (this._realCount - 1), 0, 1);
  }

  _handlePointerDown(event) {
    if (!this.ready || this.destroyed) return;
    if (!this.params.features.drag.enabled || this._disabled) return;
    if (event.pointerType === 'mouse' && event.button > 0) return;
    if (this._drag) return;
    const controlSelector = `.${this._cls.arrow}, .${this._cls.bullets}, input, select, textarea, [data-zs-nodrag]`;
    const control = event.target && event.target.closest ? event.target.closest(controlSelector) : null;
    if (control) return;

    if (this._momentum) this._stopMomentum();
    if (this._animating) this._settle();

    this._drag = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: this._offset,
      startFloat: this._float,
      lastPrimary: 0,
      lastT: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      vx: 0,
      started: false
    };
  }

  _handlePointerMove(event) {
    const drag = this._drag;
    if (!drag || this.destroyed || event.pointerId !== drag.pointerId) return;
    if (!this.params.features.drag.enabled) {
      this._drag = null;
      return;
    }

    const conf = this.params.features.drag;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const primary = this.params.axis === 'x' ? dx : dy;
    const secondary = this.params.axis === 'x' ? dy : dx;

    if (!drag.started) {
      if (Math.abs(primary) < conf.threshold && Math.abs(secondary) < conf.threshold) return;
      if (Math.abs(secondary) > Math.abs(primary) * 1.2) {
        // The gesture belongs to the page scroll, not the slider.
        this._drag = null;
        return;
      }
      drag.started = true;
      this.el.classList.add(this._cls.dragging);
      try { this.el.setPointerCapture(event.pointerId); } catch (err) { /* optional */ }
      this._applyInstant(this._computeStyles());
      this._userInteracted();
    }

    if (event.cancelable) event.preventDefault();

    const rtlFlip = this.params.axis === 'x' && this._rtl ? -1 : 1;
    let nextOffset = drag.startOffset + primary * rtlFlip;
    const rubber = conf.rubberband ? 0.35 : 0;
    const first = this._offsetFor(0);
    const last = this._offsetFor(this._renderSlides.length - 1);
    const max = Math.max(first, last);
    const min = Math.min(first, last);
    if (nextOffset > max) nextOffset = max + (nextOffset - max) * rubber;
    else if (nextOffset < min) nextOffset = min + (nextOffset - min) * rubber;
    this._offset = nextOffset;

    if (this.params.type !== 'slide') {
      this._float = this._activeIndex - (nextOffset - drag.startOffset) / this._stepSize();
    }

    this._applyInstant(this._computeStyles());
    this._emitProgress(this._dragProgress());

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = now - drag.lastT;
    if (dt > 0) {
      const sample = (primary - drag.lastPrimary) / dt;
      drag.vx = drag.vx * 0.7 + sample * 0.3; // smoothed px/ms
      drag.lastPrimary = primary;
      drag.lastT = now;
    }
  }

  _handlePointerUp(event) {
    const drag = this._drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this._drag = null;
    if (!drag.started) return;

    const conf = this.params.features.drag;
    this.el.classList.remove(this._cls.dragging);
    try {
      if (this.el.hasPointerCapture && this.el.hasPointerCapture(event.pointerId)) {
        this.el.releasePointerCapture(event.pointerId);
      }
    } catch (err) { /* noop */ }
    this._suppressClickUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 140;

    if (event.type === 'pointercancel') {
      this._snapBack(this._transitionDuration());
      return;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const stale = now - drag.lastT > 120;
    const rtlFlip = this.params.axis === 'x' && this._rtl ? -1 : 1;
    const rawVelocity = stale ? 0 : drag.vx * rtlFlip;
    const step = this._stepSize();
    const indexDelta = -(this._offset - drag.startOffset) / step;
    const velocityIndex = -rawVelocity / step;

    if (this._float !== undefined) this._float = undefined;

    if (this.params.freeMode) {
      this._startMomentum(rawVelocity);
      return;
    }

    let direction = 0;
    if (Math.abs(rawVelocity) > conf.velocity) direction = Math.sign(velocityIndex) || Math.sign(-rawVelocity);
    else if (Math.abs(indexDelta) > 0.18) direction = Math.sign(indexDelta);

    if (!direction) {
      this._snapBack(this._transitionDuration());
      return;
    }

    const from = this._activeIndex;
    const target = from + direction * Math.max(1, this.params.slidesToScroll);
    this.goTo(target, { reason: 'drag' });
    if (this._activeIndex === from) this._snapBack(this._transitionDuration());
  }

  _startMomentum(velocity) {
    if (this._drag) this._drag = null;
    let v = velocity;
    let last = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const step = this._stepSize();
    const first = this._offsetFor(0);
    const lastOffset = this._offsetFor(this._renderSlides.length - 1);
    const max = Math.max(first, lastOffset);
    const min = Math.min(first, lastOffset);
    this._momentum = true;

    const tick = () => {
      if (this.destroyed || !this._momentum) return;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const dt = Math.min(48, now - last);
      last = now;
      v *= Math.pow(0.95, dt / 16.7);
      let next = this._offset + v * dt;
      if (next > max || next < min) {
        next = clamp(next, min, max);
        v = 0;
      }
      this._offset = next;
      if (this.params.type !== 'slide') {
        this._float = this._activeIndex - (next - this._offsetFor(this._renderIndex)) / step;
      }
      this._applyInstant(this._computeStyles());
      this._emitProgress(this._dragProgress());

      if (Math.abs(v) < 0.02 || dt === 0) {
        this._momentum = null;
        this._snapToNearest();
        return;
      }
      this._momentum = requestAnimationFrame(tick);
    };
    this._momentum = requestAnimationFrame(tick);
  }

  _stopMomentum() {
    if (this._momentum && typeof this._momentum === 'number') cancelAnimationFrame(this._momentum);
    this._momentum = null;
  }

  _snapToNearest() {
    if (!this._renderSlides.length) return;
    const nearest = this._nearestRenderIndex(this._offset);
    const real = this._realIndexFor(nearest);
    this._renderIndex = nearest;
    this._float = undefined;
    this.goTo(real, { reason: 'drag', speed: this._transitionDuration() });
    if (!this._animating) this._snapBack(this._transitionDuration());
  }

  /* ------------------------------------------------------------------ sync */

  _resolveSyncTargets(force = false) {
    const conf = this.params.sync || {};
    if (!conf.with) {
      if (this._syncTargets.length) this._unbindSync();
      return;
    }
    const entries = Array.isArray(conf.with) ? conf.with.flat(Infinity) : [conf.with];
    const targets = [];
    entries.forEach((entry) => {
      if (entry instanceof ZikraSlider) {
        if (entry !== this) targets.push(entry);
        return;
      }
      const el = resolveElement(entry);
      if (!el) return;
      const instance = INSTANCES.get(el);
      if (instance && instance !== this) targets.push(instance);
    });

    const unique = Array.from(new Set(targets)).filter((target) => target.ready && !target.destroyed);
    const same = !force && unique.length === this._syncTargets.length && unique.every((target, i) => target === this._syncTargets[i]);
    if (same) return;

    this._unbindSync();
    this._syncTargets = unique;
    this._syncListeners = this._syncListeners || [];
    if (!unique.length) return;

    if (conf.asThumbnails) {
      unique.forEach((thumb) => {
        this._thumbHostEl = thumb.el;
        thumb.el.setAttribute('data-zs-thumbnails', '');
        thumb._slides.forEach((slide, index) => {
          const handler = (event) => {
            if (this._suppressClickUntil && performance.now() < this._suppressClickUntil) return;
            event.preventDefault();
            this._userInteracted();
            this.goTo(index, { reason: 'thumbnail' });
          };
          addListener(this._syncListeners, slide, 'click', handler);
        });
      });
      this._notifySync('change');
    }
  }

  _unbindSync() {
    removeListeners(this._syncListeners || []);
    this._syncListeners = [];
    if (this._thumbHostEl) {
      this._thumbHostEl.removeAttribute('data-zs-thumbnails');
      this._thumbHostEl = null;
    }
    this._syncTargets = [];
    this._syncOrigin = null;
  }

  _notifySync(kind, progress) {
    if (!this._syncTargets || !this._syncTargets.length || this.destroyed) return;
    const mode = this.params.sync.mode;
    this._syncTargets.forEach((target) => {
      if (target === this || target.destroyed || !target.ready) return;
      if (target._syncOrigin === this || target._syncingNow) return;
      if (kind === 'progress' && mode !== 'progress') return;
      try {
        if (kind === 'change') target._syncApply(this, this._activeIndex, false);
        else target._syncApply(this, progress, true);
      } catch (err) {
        console.error('[ZikraSlider] sync failed:', err);
      }
    });
  }

  _syncApply(source, value, isProgress) {
    if (this.destroyed || !this.ready) return;
    if (this._syncingNow) return;
    if (this._drag && this._drag.started) return;
    this._syncingNow = true;
    this._syncOrigin = source;
    try {
      if (isProgress) {
        this._syncToProgress(value);
      } else if (value !== this._activeIndex || this._animating) {
        this.goTo(value, { reason: 'sync', silent: true });
      } else {
        this._float = undefined;
        this._snapBack(this._transitionDuration());
      }
    } finally {
      this._syncingNow = false;
      if (!this._animating) this._syncOrigin = null;
    }
  }

  _syncToProgress(progress) {
    if (this._disabled || this._realCount < 2 || !this._renderSlides.length) return;
    const value = clamp(progress, 0, 1);
    if (this._animating) this._settle();
    if (this.params.type === 'slide') {
      const pre = this._pre || 0;
      const first = this._offsetFor(pre);
      const last = this._offsetFor(pre + this._realCount - 1);
      this._offset = first + (last - first) * value;
      this._activeIndex = Math.round(value * (this._realCount - 1));
      this._renderIndex = this._renderIndexFor(this._activeIndex);
      this._float = undefined;
      this._applyInstant(this._computeStyles());
    } else {
      this._float = value * (this._realCount - 1);
      this._activeIndex = Math.round(this._float);
      this._renderIndex = this._renderIndexFor(this._activeIndex);
      this._applyInstant(this._computeStyles());
    }
    this._updateControls();
    this._loadLazy();
    this._syncOrigin = null;
  }

  /* ------------------------------------------------------- responsive/meta */

  _setupBreakpoints() {
    const responsive = this.params.responsive;
    if (!isPlainObject(responsive) || typeof window.matchMedia !== 'function') return;
    Object.keys(responsive).forEach((key) => {
      const min = parseFloat(key) || 0;
      let mql;
      try {
        mql = window.matchMedia(`(min-width: ${min}px)`);
      } catch (err) {
        return;
      }
      const handler = () => {
        clearTimeout(this._bpTimer);
        this._bpTimer = setTimeout(() => {
          this._timers.delete(this._bpTimer);
          this._bpTimer = null;
          this.update({});
        }, 60);
        this._timers.add(this._bpTimer);
      };
      if (mql.addEventListener) mql.addEventListener('change', handler);
      else if (mql.addListener) mql.addListener(handler);
      this._breakpointListeners.push(() => {
        if (mql.removeEventListener) mql.removeEventListener('change', handler);
        else if (mql.removeListener) mql.removeListener(handler);
      });
    });
  }

  _destroyBreakpoints() {
    this._breakpointListeners.forEach((dispose) => {
      try { dispose(); } catch (err) { /* noop */ }
    });
    this._breakpointListeners = [];
    if (this._bpTimer) {
      clearTimeout(this._bpTimer);
      this._timers.delete(this._bpTimer);
      this._bpTimer = null;
    }
  }

  /* ----------------------------------------------------------- public API */

  update(newOptions = {}) {
    if (!this.ready || this.destroyed) return this;
    const previousIndex = this._activeIndex;
    this._drag = null;
    this._syncOrigin = null;
    this._cancelAnimations();
    this._resetParallax();
    this._stopMomentum();
    this._destroyControls();
    this._destroyBreakpoints();

    this._userOptions = mergeOptions(this._userOptions, newOptions);
    this.params = this._resolveParams();
    this._cls = this._buildClassNames();

    const c = this._cls;
    const el = this.el;
    TYPES.forEach((type) => el.classList.remove(c[`type-${type}`]));
    AXES.forEach((axis) => el.classList.remove(c[`axis-${axis}`]));
    el.classList.remove('zs-no-js');
    if (this.params.fallback.noJsClass) el.classList.remove(this.params.fallback.noJsClass);
    el.classList.add(c[`type-${this.params.type}`], c[`axis-${this.params.axis}`]);
    el.classList.toggle(c['drag-enabled'], !!this.params.features.drag.enabled);
    if (this.params.dir === 'rtl') el.setAttribute('dir', 'rtl');
    else if (this._original.attrs.dir == null) el.removeAttribute('dir');
    else el.setAttribute('dir', this._original.attrs.dir);
    this._viewport.className = `${c.viewport} ${c[`type-${this.params.type}`]}`;

    this._buildControls();
    this._activeIndex = previousIndex;
    this._measure();
    this._activeIndex = this._normalizeIndex(previousIndex);
    this._renderIndex = this._renderIndexFor(this._activeIndex);
    this._offset = this._offsetFor(this._renderIndex);
    this._float = undefined;
    this._render({ instant: true });
    this._updateControls();
    this._resolveSyncTargets(true);
    this._setupBreakpoints();
    this._autoplayPlaying = !!this.params.features.autoplay.enabled;
    this._stoppedByUser = false;
    this._scheduleAutoplay();
    return this;
  }

  appendSlide(slides) {
    return this._insertSlides(slides, false);
  }

  prependSlide(slides) {
    return this._insertSlides(slides, true);
  }

  removeSlide(slides) {
    if (!this.ready || this.destroyed || !this._slides.length) return this;
    const requested = (Array.isArray(slides) ? slides : [slides]).map((value) => (
      typeof value === 'number' ? Math.trunc(value) : this._slides.indexOf(value)
    ));
    const indexes = Array.from(new Set(requested.filter((index) => index >= 0 && index < this._slides.length)))
      .sort((a, b) => a - b);
    if (!indexes.length) return this;

    this._cancelAnimations();
    this._resetParallax();
    this._stopMomentum();
    this._drag = null;

    const drop = new Set(indexes);
    this._slides.forEach((slide, index) => {
      if (drop.has(index)) slide.remove();
    });
    this._slides = this._slides.filter((_, index) => !drop.has(index));
    this._slideSnapshots = this._slideSnapshots.filter((_, index) => !drop.has(index));
    const removedBefore = indexes.filter((index) => index < this._activeIndex).length;
    this._activeIndex = Math.min(this._activeIndex - removedBefore, Math.max(0, this._slides.length - 1));
    return this._syncSlideList();
  }

  _toSlideElements(input) {
    if (!input) return [];
    if (typeof input === 'string') {
      const template = document.createElement('template');
      template.innerHTML = input;
      return Array.from(template.content.children);
    }
    if (input instanceof Element) return [input];
    return Array.from(input).filter((node) => node && node.nodeType === 1);
  }

  _insertSlides(input, prepend) {
    if (!this.ready || this.destroyed) return this;
    const fresh = this._toSlideElements(input).filter((node) => !this._slides.includes(node));
    if (!fresh.length) return this;

    this._cancelAnimations();
    this._resetParallax();
    this._stopMomentum();
    this._drag = null;

    const snapshots = fresh.map((node) => this._snapshotSlide(node));
    const c = this._cls;
    if (!this._slides.length) {
      fresh.forEach((node) => this._track.appendChild(node));
    } else if (prepend) {
      const anchor = this._slides[0];
      fresh.forEach((node) => this._track.insertBefore(node, anchor));
    } else {
      const anchor = this._slides[this._slides.length - 1].nextSibling;
      fresh.forEach((node) => this._track.insertBefore(node, anchor));
    }
    fresh.forEach((node) => node.classList.add(c.slide));

    this._slides = prepend ? [...fresh, ...this._slides] : [...this._slides, ...fresh];
    this._slideSnapshots = prepend ? [...snapshots, ...this._slideSnapshots] : [...this._slideSnapshots, ...snapshots];
    // Keep the same content in view when slides are added before it.
    if (prepend) this._activeIndex += fresh.length;
    return this._syncSlideList();
  }

  _syncSlideList() {
    this._realCount = this._slides.length;
    this._baseSlideClasses = this._slides.map((slide) => slide.className);
    this._baseSlideStyles = this._slides.map((slide) => slide.getAttribute('style'));
    const a11y = this.params.features.a11y;
    this._slides.forEach((slide, i) => {
      slide.setAttribute('data-zs-index', String(i));
      if (!a11y.enabled) return;
      if (!slide.id) slide.id = `${this.id}-slide-${i}`;
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} of ${this._realCount}`);
    });
    this.recalculate();
    if (this.params.sync && this.params.sync.with) this._resolveSyncTargets(true);
    return this;
  }

  recalculate() {
    if (!this.ready || this.destroyed) return this;
    const index = this._activeIndex;
    // A cancelled sync transition must not keep the loop-prevention guard.
    this._syncOrigin = null;
    this._measure();
    this._activeIndex = this._normalizeIndex(index);
    this._renderIndex = this._renderIndexFor(this._activeIndex);
    this._offset = this._offsetFor(this._renderIndex);
    this._float = undefined;
    this._render({ instant: true });
    this._updateControls();
    this._loadLazy();
    this._scheduleAutoplay();
    return this;
  }

  getProgress() {
    if (!this._realCount || this._realCount < 2) return 0;
    return clamp(this._activeIndex / (this._realCount - 1), 0, 1);
  }

  getState() {
    return {
      index: this._activeIndex,
      realIndex: this._activeIndex,
      progress: this.getProgress(),
      total: this._realCount,
      slidesPerView: this.params.slidesPerView,
      isLooping: !!this._loopActive,
      isAutoplay: !!this._autoplayPlaying,
      isAutoplayRunning: !!this._autoplayRunning,
      isAnimating: !!this._animating,
      isDragging: !!(this._drag && this._drag.started),
      isDisabled: !!this._disabled,
      isDestroyed: !!this.destroyed,
      isBroken: !this.ready,
      type: this.params.type,
      axis: this.params.axis,
      dir: this.params.dir,
      backend: this._backend || null
    };
  }

  _disconnectMedia() {
    this._mediaLoadListeners.forEach(({ img, onLoad, onError }) => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    });
    this._mediaLoadListeners = [];
  }

  destroy() {
    if (this.destroyed) return this;
    if (!this.el) {
      // Safe stub created without a DOM target: there is nothing to tear down.
      this.destroyed = true;
      return this;
    }
    this._emit('destroy', { instance: this });
    this._clearAutoplay();
    this._cancelAnimations();
    this._resetParallax();
    this._stopMomentum();
    this._destroyBreakpoints();
    this._disconnectMedia();
    this._mediaMarks.forEach((img) => {
      if (img && img.getAttribute('data-zs-media') === '1') img.removeAttribute('data-zs-media');
    });
    this._mediaMarks = [];
    if (this._announceTimer) {
      clearTimeout(this._announceTimer);
      this._timers.delete(this._announceTimer);
      this._announceTimer = null;
    }
    this._timers.forEach((timer) => clearTimeout(timer));
    this._timers.clear();
    if (this._recalcRaf) cancelAnimationFrame(this._recalcRaf);
    if (this._progressRaf) cancelAnimationFrame(this._progressRaf);
    if (this._ro) this._ro.disconnect();

    LIVE.forEach((other) => {
      if (!other || other === this || other.destroyed) return;
      other._syncTargets = (other._syncTargets || []).filter((target) => target !== this);
      if (other._thumbHostEl === this.el) {
        other._thumbHostEl.removeAttribute('data-zs-thumbnails');
        other._thumbHostEl = null;
      }
    });
    this._unbindSync();
    this._notifyPlugins('destroy');
    this._pluginList = [];
    this._destroyControls();
    removeListeners(this._listeners);
    this._waapi = [];

    // Restore author markup.
    const el = this.el;
    const slides = this._slides || [];
    const snapshots = this._slideSnapshots || [];
    slides.forEach((slide, index) => {
      if (slide.parentNode !== el) el.appendChild(slide);
      const snapshot = snapshots[index];
      if (snapshot) {
        slide.className = snapshot.className;
        if (snapshot.id == null) slide.removeAttribute('id');
        else slide.setAttribute('id', snapshot.id);
        ['role', 'aria-roledescription', 'aria-label'].forEach((attr) => {
          if (snapshot[attr] == null) slide.removeAttribute(attr);
          else slide.setAttribute(attr, snapshot[attr]);
        });
        if (snapshot['aria-hidden'] == null) slide.removeAttribute('aria-hidden');
        else slide.setAttribute('aria-hidden', snapshot['aria-hidden']);
        if (snapshot.inert) {
          slide.setAttribute('inert', '');
        } else {
          if ('inert' in slide) slide.inert = false;
          slide.removeAttribute('inert');
        }
      }
      slide.removeAttribute('data-zs-index');
      // Chrome re-creates an empty style attribute if any other attribute is
      // touched after removing it, so the style restore has to go last.
      if (snapshot) {
        if (snapshot.style == null) slide.removeAttribute('style');
        else slide.setAttribute('style', snapshot.style);
      }
    });
    this._slideSnapshots = [];
    this._generated.forEach((node) => {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    this._generated = [];
    if (this._viewport && this._viewport.parentNode) this._viewport.parentNode.removeChild(this._viewport);

    el.className = this._original.className;
    Object.keys(this._original.attrs || {}).forEach((name) => {
      const value = this._original.attrs[name];
      if (value == null) el.removeAttribute(name);
      else el.setAttribute(name, value);
    });
    if (!this._hadId && el.id === this.id) el.removeAttribute('id');
    // Chrome re-creates an empty style attribute if any other attribute is
    // touched after removing it, so the style restore has to go last.
    if (this._original.style == null) el.removeAttribute('style');
    else el.setAttribute('style', this._original.style);

    LIVE.delete(this);
    INSTANCES.delete(el);
    this._events.clear();
    this.ready = false;
    this.destroyed = true;
    return this;
  }
}

/* --------------------------------------------------------------- factory */

function zikraslider(target, options) {
  return new ZikraSlider(target, options);
}

zikraslider.prototype = ZikraSlider.prototype;
zikraslider.VERSION = VERSION;
zikraslider.defaults = DEFAULTS;
zikraslider.ZikraSlider = ZikraSlider;
zikraslider.get = (target) => {
  const el = resolveElement(target);
  return el ? INSTANCES.get(el) || null : null;
};
zikraslider.instances = () => Array.from(LIVE);

  return zikraslider;
});
