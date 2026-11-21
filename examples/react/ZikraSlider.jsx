import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from 'react';
import { ZikraSlider } from 'zikra-slider-pro';
import 'zikra-slider-pro/css';

/**
 * React wrapper for Zikra Slider Pro.
 * The `options` prop is applied on mount and sent through `instance.update()`
 * whenever the object identity changes (memoize it in the parent).
 */
const ZikraSliderReact = forwardRef(function ZikraSliderReact(
  { options = {}, className = '', children, ...rest },
  ref
) {
  const hostRef = useRef(null);
  const instanceRef = useRef(null);
  const appliedOptions = useRef(options);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const instance = new ZikraSlider(hostRef.current, options);
    instanceRef.current = instance;
    appliedOptions.current = options;
    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
    // Options updates are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || options === appliedOptions.current) return;
    appliedOptions.current = options;
    instance.update(options);
  }, [options]);

  useImperativeHandle(ref, () => ({
    get instance() {
      return instanceRef.current;
    },
    next: (...args) => instanceRef.current?.next(...args),
    prev: (...args) => instanceRef.current?.prev(...args),
    goTo: (...args) => instanceRef.current?.goTo(...args),
    play: () => instanceRef.current?.play(),
    pause: () => instanceRef.current?.pause(),
    toggleAutoplay: () => instanceRef.current?.toggleAutoplay(),
    update: (next) => instanceRef.current?.update(next),
    recalculate: () => instanceRef.current?.recalculate(),
    getState: () => instanceRef.current?.getState() ?? null,
    destroy: () => instanceRef.current?.destroy()
  }), []);

  return (
    <div
      ref={hostRef}
      className={`zs-slider zs-no-js ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
});

export default ZikraSliderReact;
