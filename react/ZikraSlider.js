import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import zikraslider from '../dist/zikraslider.esm.js';

export const ZikraSlider = forwardRef(function ZikraSlider(props, ref) {
  const { options, className, style, children, onInit, ...rest } = props;
  const hostRef = useRef(null);
  const instanceRef = useRef(null);
  const optionsRef = useRef(options);
  const onInitRef = useRef(onInit);
  optionsRef.current = options;
  onInitRef.current = onInit;

  const apiRef = useRef(null);
  if (!apiRef.current) {
    apiRef.current = {
      get instance() {
        return instanceRef.current;
      },
      goTo: (...args) => instanceRef.current && instanceRef.current.goTo(...args),
      next: (...args) => instanceRef.current && instanceRef.current.next(...args),
      prev: (...args) => instanceRef.current && instanceRef.current.prev(...args),
      play: () => instanceRef.current && instanceRef.current.play(),
      pause: () => instanceRef.current && instanceRef.current.pause(),
      update: (...args) => instanceRef.current && instanceRef.current.update(...args),
      getState: () => (instanceRef.current ? instanceRef.current.getState() : null)
    };
  }

  useEffect(() => {
    const instance = zikraslider(hostRef.current, optionsRef.current || {});
    instanceRef.current = instance;
    if (onInitRef.current) onInitRef.current(instance);
    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => apiRef.current, []);

  return createElement('div', { ref: hostRef, className, style, ...rest }, children);
});

export default ZikraSlider;
