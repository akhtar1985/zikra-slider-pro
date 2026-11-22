import zikraslider, { ZikraSlider, type ZikraSliderOptions, type ZikraSliderState } from '../src/zikraslider.js';
import { ZikraSlider as ReactZikraSlider, type ZikraSliderApi } from '../react/ZikraSlider.js';

const options: ZikraSliderOptions = {
  type: 'custom',
  loop: true,
  parallax: { enabled: true, factor: 0.3 },
  custom: {
    transform: ({ relative, viewportSize }) => ({
      x: relative * viewportSize * 0.1,
      visible: Math.abs(relative) < 2
    })
  },
  on: {
    beforeChange: (payload) => {
      if (payload.index === 3) return false;
    },
    afterChange: (payload) => {
      console.log(payload.previousIndex, payload.reason);
    }
  }
};

const instance: ZikraSlider = zikraslider(document.createElement('div'), options);
instance.next({ reason: 'test' }).prev().goTo(2, { speed: 0 });
instance.update({ dir: 'rtl' });
instance.appendSlide('<div class="slide">new</div>').prependSlide(document.createElement('div'));
instance.removeSlide([0, 1]).removeSlide(document.createElement('div'));

const state: ZikraSliderState = instance.getState();
const backend: string | null = state.backend;

type Api = ZikraSliderApi;
type Props = Parameters<typeof ReactZikraSlider>;

export { backend, instance, zikraslider };
export type { Api, Props };
