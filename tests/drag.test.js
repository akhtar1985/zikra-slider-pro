import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import zikraslider from '../src/zikraslider.js';

const live = [];

function mount(options = {}, slideCount = 4) {
  const el = document.createElement('div');
  el.className = 'host';
  el.innerHTML = Array.from({ length: slideCount }, (_, i) => `<div class="slide">Slide ${i + 1}</div>`).join('');
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
  const instance = zikraslider(el, {
    speed: 0,
    slidesPerView: 1,
    arrows: { enabled: false },
    bullets: { enabled: false },
    features: {
      autoplay: { enabled: false },
      keyboard: { enabled: false }
    },
    ...options
  });
  live.push({ el, instance });
  return { el, instance };
}

function fire(target, type, x, y = 0, pointerId = 1) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    clientX: { value: x },
    clientY: { value: y },
    pointerId: { value: pointerId },
    pointerType: { value: 'touch' },
    button: { value: 0 },
    isPrimary: { value: true }
  });
  target.dispatchEvent(event);
  return event;
}

const activeSlide = (el) => el.querySelector('[data-zs-index="0"]');

beforeEach(() => {
  let now = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});

afterEach(() => {
  while (live.length) {
    const { el, instance } = live.pop();
    instance.destroy();
    el.remove();
  }
});

describe('drag gestures', () => {
  it('ignores movement below the threshold', () => {
    const { el, instance } = mount();
    fire(el, 'pointerdown', 0);
    fire(el, 'pointermove', -4);
    expect(el.classList.contains('zs-dragging')).toBe(false);
    expect(instance.getState().isDragging).toBe(false);
    fire(el, 'pointerup', -4);
    expect(instance.getState().index).toBe(0);
  });

  it('follows the pointer and commits the next slide on release', () => {
    const { el, instance } = mount();
    const changes = [];
    instance.on('afterChange', (payload) => changes.push(payload));

    fire(el, 'pointerdown', 0);
    fire(el, 'pointermove', -20);
    expect(el.classList.contains('zs-dragging')).toBe(true);
    expect(instance.getState().isDragging).toBe(true);
    expect(activeSlide(el).style.transform).toContain('-20px');

    fire(el, 'pointermove', -300);
    fire(el, 'pointerup', -300);

    expect(el.classList.contains('zs-dragging')).toBe(false);
    expect(instance.getState().index).toBe(1);
    expect(changes.at(-1)).toEqual({ index: 1, previousIndex: 0, reason: 'drag' });
  });

  it('snaps back when released under the distance threshold', () => {
    const { el, instance } = mount();
    fire(el, 'pointerdown', 0);
    fire(el, 'pointermove', -50);
    fire(el, 'pointerup', -50);

    expect(instance.getState().index).toBe(0);
    expect(activeSlide(el).style.transform).toContain('translate3d(0px');
  });

  it('abandons vertical gestures so the page can scroll', () => {
    const { el, instance } = mount();
    fire(el, 'pointerdown', 0, 0);
    fire(el, 'pointermove', 4, 40);
    expect(el.classList.contains('zs-dragging')).toBe(false);
    fire(el, 'pointermove', 4, 120);
    fire(el, 'pointerup', 4, 120);
    expect(instance.getState().index).toBe(0);
  });

  it('ignores drags that start on generated controls', () => {
    const { el, instance } = mount({ arrows: { enabled: true } });
    const arrow = el.querySelector('.zs-arrow');
    expect(arrow).not.toBeNull();
    fire(arrow, 'pointerdown', 0);
    fire(arrow, 'pointermove', -300);
    expect(el.classList.contains('zs-dragging')).toBe(false);
    fire(arrow, 'pointerup', -300);
    expect(instance.getState().index).toBe(0);
  });

  it('snaps back on pointercancel', () => {
    const { el, instance } = mount();
    fire(el, 'pointerdown', 0);
    fire(el, 'pointermove', -300);
    fire(el, 'pointercancel', -300);

    expect(instance.getState().index).toBe(0);
    expect(el.classList.contains('zs-dragging')).toBe(false);
    expect(activeSlide(el).style.transform).toContain('translate3d(0px');
  });

  it('inverts the direction in RTL', () => {
    const { el, instance } = mount({ dir: 'rtl', initialSlide: 1 });
    fire(el, 'pointerdown', 0);
    fire(el, 'pointermove', -300);
    fire(el, 'pointerup', -300);
    expect(instance.getState().index).toBe(0);
  });

  it('does nothing when drag is disabled', () => {
    const { el, instance } = mount({ features: { drag: { enabled: false } } });
    fire(el, 'pointerdown', 0);
    fire(el, 'pointermove', -300);
    fire(el, 'pointerup', -300);
    expect(el.classList.contains('zs-dragging')).toBe(false);
    expect(instance.getState().index).toBe(0);
  });
});
