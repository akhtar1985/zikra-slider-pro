import { describe, it, expect, afterEach } from 'vitest';
import zikraslider from '../src/zikraslider.js';

const live = [];

function mount(slideCount = 5, options = {}, inner = () => '') {
  const el = document.createElement('div');
  el.className = 'host';
  el.id = 'host';
  el.style.color = 'rgb(1, 2, 3)';
  el.innerHTML = Array.from(
    { length: slideCount },
    (_, i) => `<div class="slide" id="s${i}">Slide ${i + 1}${inner(i)}</div>`
  ).join('');
  document.body.appendChild(el);
  el.getBoundingClientRect = () => ({
    width: 600,
    height: 400,
    top: 0,
    left: 0,
    right: 600,
    bottom: 400,
    x: 0,
    y: 0,
    toJSON() {}
  });
  const options2 = {
    speed: 0,
    arrows: { enabled: false },
    bullets: { enabled: false },
    features: {
      autoplay: { enabled: false },
      keyboard: { enabled: false }
    },
    ...options
  };
  const instance = zikraslider(el, options2);
  live.push({ el, instance });
  return { el, instance };
}

const slideAt = (el, index) => el.querySelector(`[data-zs-index="${index}"]`);
const transformOf = (el, index) => slideAt(el, index).style.transform;

afterEach(() => {
  while (live.length) {
    const { el, instance } = live.pop();
    instance.destroy();
    el.remove();
  }
});

describe('init', () => {
  it('wraps slides and exposes state', () => {
    const { el, instance } = mount();
    const state = instance.getState();
    expect(instance.ready).toBe(true);
    expect(state.index).toBe(0);
    expect(state.total).toBe(5);
    expect(state.type).toBe('slide');
    expect(el.querySelectorAll('.zs-slide').length).toBe(5);
    expect(el.classList.contains('zs-initialized')).toBe(true);
  });

  it('applies accessibility defaults', () => {
    const { el } = mount();
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-roledescription')).toBe('carousel');
    expect(slideAt(el, 0).getAttribute('role')).toBe('group');
    expect(el.querySelector('[aria-live="polite"]')).not.toBeNull();
  });
});

describe('navigation', () => {
  it('moves with next/prev/goTo and emits afterChange', () => {
    const { instance } = mount();
    const events = [];
    instance.on('afterChange', (payload) => events.push(payload));

    instance.next();
    expect(instance.getState().index).toBe(1);

    instance.prev();
    expect(instance.getState().index).toBe(0);

    instance.goTo(3, { reason: 'test' });
    expect(instance.getState().index).toBe(3);
    expect(events.at(-1)).toEqual({ index: 3, previousIndex: 0, reason: 'test' });
  });

  it('cancels navigation when beforeChange returns false', () => {
    const { instance } = mount();
    instance.on('beforeChange', () => false);
    instance.next();
    expect(instance.getState().index).toBe(0);
  });

  it('wraps around in loop mode', () => {
    const { instance } = mount(5, { loop: true });
    instance.goTo(4);
    instance.next();
    expect(instance.getState().index).toBe(0);
    instance.prev();
    expect(instance.getState().index).toBe(4);
  });
});

describe('layouts', () => {
  it('positions slides through transforms', () => {
    const { el, instance } = mount();
    expect(transformOf(el, 0)).toContain('translate3d(0px');
    instance.goTo(1);
    expect(transformOf(el, 1)).toContain('translate3d(0px');
    expect(transformOf(el, 0)).toContain('-600px');
  });

  it('drives parallax inner elements and restores authored styles', () => {
    const { el, instance } = mount(3, { parallax: { enabled: true, selector: '.p', factor: 0.2 } }, () => '<span class="p" style="opacity: 0.9">tag</span>');
    const span = el.querySelector('.p');
    expect(span.style.transform).toContain('translate3d(0px');

    instance.goTo(1);
    expect(span.style.transform).toContain('120px');

    instance.destroy();
    live.pop();
    expect(span.style.transform).toBe('');
    expect(span.style.opacity).toBe('0.9');
  });

  it('honours a custom transform callback', () => {
    const { el, instance } = mount(5, {
      type: 'custom',
      custom: {
        transform: ({ relative }) => ({
          x: relative * 40,
          visible: Math.abs(relative) < 2
        })
      }
    });
    expect(transformOf(el, 0)).toContain('translate3d(0px');
    expect(transformOf(el, 1)).toContain('40px');
    expect(slideAt(el, 2).getAttribute('aria-hidden')).toBe('true');
    expect(slideAt(el, 0).getAttribute('aria-hidden')).toBeNull();
    expect(instance.getState().type).toBe('custom');
  });
});

describe('update and destroy', () => {
  it('applies dir changes and reverts them', () => {
    const { el, instance } = mount();
    instance.update({ dir: 'rtl' });
    expect(instance.getState().dir).toBe('rtl');
    expect(el.getAttribute('dir')).toBe('rtl');
    instance.update({ dir: 'ltr' });
    expect(el.getAttribute('dir')).toBeNull();
  });

  it('restores the host markup on destroy', () => {
    const { el, instance } = mount();
    instance.destroy();
    live.pop();
    expect(el.className).toBe('host');
    expect(el.id).toBe('host');
    expect(el.style.color).toBe('rgb(1, 2, 3)');
    expect(el.children.length).toBe(5);
    expect(el.querySelector('.zs-viewport')).toBeNull();
    const slide = document.getElementById('s0');
    expect(slide.getAttribute('style')).toBeNull();
    expect(slide.getAttribute('role')).toBeNull();
  });

  it('can be re-initialised after destroy', () => {
    const { el, instance } = mount();
    instance.destroy();
    live.pop();
    const again = zikraslider(el, { speed: 0, arrows: { enabled: false }, bullets: { enabled: false } });
    live.push({ el, instance: again });
    expect(again.ready).toBe(true);
    expect(again.getState().total).toBe(5);
    expect(zikraslider.get(el)).toBe(again);
  });
});

describe('autoplay', () => {
  it('toggles play/pause state', () => {
    const { instance } = mount(5, {
      features: { autoplay: { enabled: true, delay: 100000 }, keyboard: { enabled: false } }
    });
    expect(instance.getState().isAutoplay).toBe(true);
    instance.pause();
    expect(instance.getState().isAutoplay).toBe(false);
    instance.play();
    expect(instance.getState().isAutoplay).toBe(true);
    instance.toggleAutoplay();
    expect(instance.getState().isAutoplay).toBe(false);
  });
});
