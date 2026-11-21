import { describe, it, expect, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ZikraSlider } from '../react/ZikraSlider.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('react wrapper', () => {
  it('mounts, exposes the api and destroys on unmount', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const ref = React.createRef();
    let instance = null;

    await act(async () => {
      root.render(
        React.createElement(
          ZikraSlider,
          {
            ref,
            options: {
              speed: 0,
              arrows: { enabled: false },
              bullets: { enabled: false },
              features: { autoplay: { enabled: false }, keyboard: { enabled: false } }
            },
            onInit: (created) => {
              instance = created;
            }
          },
          React.createElement('div', null, 'One'),
          React.createElement('div', null, 'Two'),
          React.createElement('div', null, 'Three')
        )
      );
    });

    expect(instance).toBeTruthy();
    expect(instance.getState().total).toBe(3);
    expect(ref.current.instance).toBe(instance);
    expect(ref.current.getState().total).toBe(3);

    await act(async () => {
      ref.current.next();
    });
    expect(instance.getState().index).toBe(1);

    await act(async () => {
      root.unmount();
    });
    expect(instance.destroyed).toBe(true);
    expect(host.querySelector('.zs-viewport')).toBeNull();
  });
});
