/* Type definitions for Zikra Slider Pro. */

export type ZikraSliderType = 'slide' | 'fade' | 'scale' | 'coverflow' | 'stack' | 'cards' | 'custom';
export type ZikraSliderAxis = 'x' | 'y';
export type ZikraSliderDir = 'ltr' | 'rtl';
export type ZikraSliderEffect = 'slide' | 'fade' | 'zoom' | 'slide-up' | 'flip' | 'stagger';
export type ZikraSliderAnimationLibrary = 'auto' | 'none' | 'gsap' | 'anime' | 'motion' | 'object';
export type ZikraSliderBackend = 'gsap' | 'anime' | 'motion' | 'object' | 'waapi' | 'css' | null;
export type ZikraSliderTarget = string | HTMLElement | ArrayLike<HTMLElement>;

export interface ZikraSliderParallaxOptions {
  enabled?: boolean;
  selector?: string;
  factor?: number;
}

export interface ZikraSliderCustomFrame {
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  rotate?: number;
  rotateY?: number;
  opacity?: number;
  zIndex?: number;
  visible?: boolean;
  interactive?: boolean;
}

export interface ZikraSliderCustomContext {
  index: number;
  realIndex: number;
  relative: number;
  activeIndex: number;
  total: number;
  viewportSize: number;
  slideSize: number;
  axis: ZikraSliderAxis;
  dir: ZikraSliderDir;
  loop: boolean;
}

export interface ZikraSliderCustomOptions {
  transform?: ((context: ZikraSliderCustomContext) => ZikraSliderCustomFrame | null | void) | null;
}

export interface ZikraSliderSyncOptions {
  with?: ZikraSliderTarget | null;
  mode?: 'index' | 'progress';
  asThumbnails?: boolean;
}

export interface ZikraSliderArrowsOptions {
  enabled?: boolean;
  prevEl?: string | HTMLElement | null;
  nextEl?: string | HTMLElement | null;
  container?: string | HTMLElement | null;
  className?: string;
  prevClass?: string;
  nextClass?: string;
  prevHtml?: string;
  nextHtml?: string;
  ariaPrevLabel?: string;
  ariaNextLabel?: string;
  hideAtEdges?: boolean;
  render?: ((context: { direction: 'prev' | 'next'; index: number; total: number }) => string | HTMLElement | null) | null;
}

export interface ZikraSliderBulletsOptions {
  enabled?: boolean;
  el?: string | HTMLElement | null;
  type?: 'bullets' | 'fraction' | 'progressbar' | 'custom';
  clickable?: boolean;
  dynamicBullets?: boolean;
  className?: string;
  bulletClass?: string;
  activeClass?: string;
  formatFraction?: ((current: number, total: number) => string) | null;
  render?: ((context: { index: number; isActive: boolean; total: number }) => string | HTMLElement | null) | null;
}

export interface ZikraSliderFeatureOptions {
  autoplay?: {
    enabled?: boolean;
    delay?: number;
    pauseOnHover?: boolean;
    pauseOnFocus?: boolean;
    pauseOnHiddenTab?: boolean;
    stopOnInteraction?: boolean;
  };
  drag?: {
    enabled?: boolean;
    threshold?: number;
    velocity?: number;
    rubberband?: boolean;
  };
  keyboard?: {
    enabled?: boolean;
    onlyWhenFocused?: boolean;
  };
  wheel?: {
    enabled?: boolean;
    passive?: boolean;
  };
  lazyLoad?: {
    enabled?: boolean;
    mode?: 'onDemand' | 'adjacent' | 'eager';
    placeholder?: string;
  };
  a11y?: {
    enabled?: boolean;
    roleDescription?: string;
    liveRegion?: boolean;
  };
}

export interface ZikraSliderAnimationOptions {
  library?: ZikraSliderAnimationLibrary | { fromTo: (...args: unknown[]) => unknown };
  effect?: ZikraSliderEffect;
  duration?: number | null;
  ease?: string;
  fallback?: 'css' | 'waapi';
}

export interface ZikraSliderFallbackOptions {
  disableIfNotEnoughSlides?: boolean;
  reducedMotion?: 'fade' | 'instant' | 'ignore';
  noJsClass?: string;
  onMediaError?: ((error: unknown) => void) | null;
}

export interface ZikraSliderChangePayload {
  index: number;
  previousIndex: number;
  reason: string;
}

export interface ZikraSliderEventMap {
  init: { instance: ZikraSlider };
  beforeChange: ZikraSliderChangePayload;
  afterChange: ZikraSliderChangePayload;
  progress: { progress: number; index: number };
  destroy: { instance: ZikraSlider };
}

export type ZikraSliderEventName = keyof ZikraSliderEventMap;

export type ZikraSliderEventHandler<K extends ZikraSliderEventName> = (
  payload: ZikraSliderEventMap[K]
) => K extends 'beforeChange' ? boolean | void : void;

export type ZikraSliderEvents = {
  [K in ZikraSliderEventName]?: ZikraSliderEventHandler<K> | ZikraSliderEventHandler<K>[];
};

export interface ZikraSliderPlugin {
  name?: string;
  init?(instance: ZikraSlider): void;
  onChange?(instance: ZikraSlider, payload: ZikraSliderChangePayload): void;
  destroy?(instance: ZikraSlider): void;
}

export interface ZikraSliderOptions {
  type?: ZikraSliderType;
  axis?: ZikraSliderAxis;
  dir?: ZikraSliderDir;
  slidesPerView?: number | 'auto';
  slidesToScroll?: number;
  gap?: number;
  centeredSlides?: boolean;
  freeMode?: boolean;
  loop?: boolean;
  initialSlide?: number;
  autoHeight?: boolean;
  speed?: number;
  classPrefix?: string;
  parallax?: ZikraSliderParallaxOptions;
  custom?: ZikraSliderCustomOptions;
  sync?: ZikraSliderSyncOptions;
  arrows?: ZikraSliderArrowsOptions;
  bullets?: ZikraSliderBulletsOptions;
  features?: ZikraSliderFeatureOptions;
  responsive?: Record<number | string, ZikraSliderOptions> | null;
  animation?: ZikraSliderAnimationOptions;
  fallback?: ZikraSliderFallbackOptions;
  on?: ZikraSliderEvents;
  plugins?: ZikraSliderPlugin | ZikraSliderPlugin[];
}

export interface ZikraSliderNavigationOptions {
  reason?: string;
  force?: boolean;
  silent?: boolean;
  speed?: number;
}

export interface ZikraSliderState {
  index: number;
  realIndex: number;
  progress: number;
  total: number;
  slidesPerView: number | 'auto';
  isLooping: boolean;
  isAutoplay: boolean;
  isAutoplayRunning: boolean;
  isAnimating: boolean;
  isDragging: boolean;
  isDisabled: boolean;
  isDestroyed: boolean;
  isBroken: boolean;
  type: ZikraSliderType;
  axis: ZikraSliderAxis;
  dir: ZikraSliderDir;
  backend: ZikraSliderBackend;
}

export type ZikraSliderSlidesInput = string | Element | Element[] | NodeListOf<Element>;

export declare class ZikraSlider {
  constructor(target: ZikraSliderTarget, options?: ZikraSliderOptions);

  el: HTMLElement | null;
  id: string;
  params: ZikraSliderOptions;
  ready: boolean;
  destroyed: boolean;

  on<K extends ZikraSliderEventName>(event: K, callback: ZikraSliderEventHandler<K>): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (payload: any) => unknown): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: ZikraSliderEventName | string, callback?: (payload: any) => unknown): this;

  goTo(index: number, options?: ZikraSliderNavigationOptions): this;
  next(options?: ZikraSliderNavigationOptions): this;
  prev(options?: ZikraSliderNavigationOptions): this;
  appendSlide(slides: ZikraSliderSlidesInput): this;
  prependSlide(slides: ZikraSliderSlidesInput): this;
  removeSlide(slides: number | number[] | Element | Element[]): this;
  play(): this;
  pause(): this;
  toggleAutoplay(): this;
  update(options?: ZikraSliderOptions): this;
  recalculate(): this;
  getProgress(): number;
  getState(): ZikraSliderState;
  destroy(): this;
}

export interface ZikraSliderFactory {
  (target: ZikraSliderTarget, options?: ZikraSliderOptions): ZikraSlider;
  VERSION: string;
  defaults: ZikraSliderOptions;
  ZikraSlider: typeof ZikraSlider;
  get(target: ZikraSliderTarget): ZikraSlider | null;
  instances(): ZikraSlider[];
}

declare const zikraslider: ZikraSliderFactory;

export default zikraslider;
