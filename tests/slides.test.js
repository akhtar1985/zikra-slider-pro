import { describe, it, expect, afterEach } from 'vitest';
import zikraslider from '../src/zikraslider.js';

const live = [];

function mount(slideCount = 5, options = {}) {
  const el = document.createElement('div');
  el.className = 'host';
  el.id = 'host';
  el.innerHTML = Array.from(
    { length: slideCount },
    (_, i) => `<div class="slide" id="s${i}">Slide ${i + 1}</div>`
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
  const instance = zikraslider(el, {
    speed: 0,
    arrows: { enabled: false },
    features: {
      autoplay: { enabled: false },
      keyboard: { enabled: false }
    },
    ...options
  });
  live.push({ el, instance });
  return { el, instance };
}

const texts = (el) => Array.from(el.querySelectorAll('.zs-track > [data-zs-index]')).map((s) => s.textContent);

afterEach(() => {
  while (live.length) {
    const { el, instance } = live.pop();
    instance.destroy();
    el.remove();
  }
});

describe('appendSlide / prependSlide', () => {
  it('appends an element and updates count, index attributes and labels', () => {
    const { el, instance } = mount();
    const node = document.createElement('div');
    node.className = 'slide';
    node.textContent = 'Slide 6';
    instance.appendSlide(node);

    expect(instance.getState().total).toBe(6);
    const appended = el.querySelector('[data-zs-index="5"]');
    expect(appended.textContent).toBe('Slide 6');
    expect(appended.getAttribute('aria-label')).toBe('6 of 6');
    expect(el.querySelector('[data-zs-index="0"]').getAttribute('aria-label')).toBe('1 of 6');
  });

  it('appends an HTML string with several slides', () => {
    const { el, instance } = mount(3);
    instance.appendSlide('<div class="slide">Six A</div><div class="slide">Six B</div>');
    expect(instance.getState().total).toBe(5);
    expect(texts(el).slice(-2)).toEqual(['Six A', 'Six B']);
  });

  it('prepends slides and keeps the same slide in view', () => {
    const { el, instance } = mount(3);
    instance.goTo(1);
    const before = instance.getState().index;
    instance.prependSlide('<div class="slide">Zero A</div><div class="slide">Zero B</div>');

    expect(instance.getState().total).toBe(5);
    expect(texts(el).slice(0, 2)).toEqual(['Zero A', 'Zero B']);
    expect(instance.getState().index).toBe(before + 2);
    expect(el.querySelector('.zs-slide-active').textContent).toBe('Slide 2');
  });

  it('ignores duplicates and works on a destroyed instance', () => {
    const { el, instance } = mount(3);
    const node = el.querySelector('[data-zs-index="3"]');
    instance.appendSlide(node);
    expect(instance.getState().total).toBe(3);

    instance.destroy();
    instance.appendSlide('<div class="slide">late</div>');
    expect(el.querySelectorAll('.zs-slide').length).toBe(0);
  });
});

describe('removeSlide', () => {
  it('removes by index and keeps the active slide when it was after the removed one', () => {
    const { el, instance } = mount(5);
    instance.goTo(3);
    instance.removeSlide(1);
    expect(instance.getState().total).toBe(4);
    expect(instance.getState().index).toBe(2);
    expect(el.querySelector('.zs-slide-active').textContent).toBe('Slide 4');
    expect(texts(el)).toEqual(['Slide 1', 'Slide 3', 'Slide 4', 'Slide 5']);
  });

  it('removes several slides given as an array and an element', () => {
    const { el, instance } = mount(5);
    instance.removeSlide([0, 2]);
    expect(texts(el)).toEqual(['Slide 2', 'Slide 4', 'Slide 5']);
    instance.removeSlide(el.querySelector('[data-zs-index="0"]'));
    expect(texts(el)).toEqual(['Slide 4', 'Slide 5']);
    expect(instance.getState().total).toBe(2);
  });

  it('clamps the active index when the active slide is removed', () => {
    const { instance } = mount(4);
    instance.goTo(3);
    instance.removeSlide(3);
    expect(instance.getState().index).toBe(2);
    expect(instance.getState().total).toBe(3);
  });
});

describe('slide changes with loop', () => {
  it('rebuilds clones and keeps wrap navigation working', () => {
    const { el, instance } = mount(4, { loop: true });
    instance.appendSlide('<div class="slide">Slide 5</div>');
    expect(instance.getState().total).toBe(5);
    expect(el.querySelectorAll('[data-zs-clone]').length).toBeGreaterThan(0);

    instance.goTo(4);
    instance.next();
    expect(instance.getState().index).toBe(0);
  });
});

describe('destroy after slide changes', () => {
  it('restores author classes on original and appended slides', () => {
    const { el, instance } = mount(2);
    instance.appendSlide('<div class="slide" id="extra">Extra</div>');
    instance.destroy();

    const extra = el.querySelector('#extra');
    expect(extra).not.toBeNull();
    expect(extra.className).toBe('slide');
    expect(extra.hasAttribute('data-zs-index')).toBe(false);
    expect(extra.getAttribute('aria-label')).toBeNull();
    expect(el.querySelector('.zs-viewport')).toBeNull();
    expect(el.children.length).toBe(3);
  });
});
