import type {
  CSSProperties,
  ForwardRefExoticComponent,
  HTMLAttributes,
  ReactNode,
  RefAttributes
} from 'react';
import type {
  ZikraSlider as ZikraSliderInstance,
  ZikraSliderNavigationOptions,
  ZikraSliderOptions,
  ZikraSliderState
} from '../dist/zikraslider.js';

export interface ZikraSliderApi {
  readonly instance: ZikraSliderInstance | null;
  goTo(index: number, options?: ZikraSliderNavigationOptions): void;
  next(options?: ZikraSliderNavigationOptions): void;
  prev(options?: ZikraSliderNavigationOptions): void;
  play(): void;
  pause(): void;
  update(options?: ZikraSliderOptions): void;
  getState(): ZikraSliderState | null;
}

export interface ZikraSliderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Engine options; read once at mount. */
  options?: ZikraSliderOptions;
  /** Receives the instance right after it is created. */
  onInit?: (instance: ZikraSliderInstance) => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const ZikraSlider: ForwardRefExoticComponent<
  ZikraSliderProps & RefAttributes<ZikraSliderApi>
>;

export default ZikraSlider;
