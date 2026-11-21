<template>
  <div ref="host" class="zs-slider zs-no-js">
    <slot />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ZikraSlider } from 'zikra-slider-pro';
import 'zikra-slider-pro/css';

const props = defineProps({
  options: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['ready']);
const host = ref(null);
let instance = null;

onMounted(() => {
  if (!host.value) return;
  instance = new ZikraSlider(host.value, props.options);
  emit('ready', instance);
});

watch(
  () => props.options,
  (next) => {
    if (instance) instance.update(next);
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (instance) instance.destroy();
  instance = null;
});

defineExpose({
  get instance() {
    return instance;
  },
  next: (...args) => instance?.next(...args),
  prev: (...args) => instance?.prev(...args),
  goTo: (...args) => instance?.goTo(...args),
  play: () => instance?.play(),
  pause: () => instance?.pause(),
  toggleAutoplay: () => instance?.toggleAutoplay(),
  update: (next) => instance?.update(next),
  recalculate: () => instance?.recalculate(),
  getState: () => instance?.getState() ?? null,
  destroy: () => instance?.destroy()
});
</script>
