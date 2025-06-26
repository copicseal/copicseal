<template>
  <div class="co-color-input">
    <input v-model="hex" type="color">
    <div class="alpha" title="透明度">
      <CoInput v-model="alpha" mode="percent" :min="0" :max="100" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import CoInput from './index.vue';

interface Props {
  modelValue: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();

const hex = ref('#000000');
const alpha = ref(1);

// 初始化：解析 rgba()
watch(
  () => props.modelValue,
  (val) => {
    if (val.startsWith('#')) {
      const { r, g, b, a } = hexToRgba(val);
      hex.value = rgbToHex(r, g, b);
      alpha.value = a ?? 1;

      return;
    }
    const match = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    if (match) {
      const [r, g, b, a] = match.slice(1).map(Number);
      hex.value = rgbToHex(r, g, b);
      alpha.value = a ?? 1;
    }
  },
  { immediate: true },
);

const rgba = computed(() => {
  const { r, g, b } = hexToRgba(hex.value);
  return `rgba(${r}, ${g}, ${b}, ${alpha.value})`;
});

watch(rgba, (val) => {
  emit('update:modelValue', val);
});

// utils
function hexToRgba(hex: string) {
  const raw = hex.replace('#', '').toLowerCase();
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 1;

  if (raw.length === 3) {
    // #rgb => #rrggbb
    r = Number.parseInt(raw[0] + raw[0], 16);
    g = Number.parseInt(raw[1] + raw[1], 16);
    b = Number.parseInt(raw[2] + raw[2], 16);
  }
  else if (raw.length === 6) {
    r = Number.parseInt(raw.slice(0, 2), 16);
    g = Number.parseInt(raw.slice(2, 4), 16);
    b = Number.parseInt(raw.slice(4, 6), 16);
  }
  else if (raw.length === 8) {
    r = Number.parseInt(raw.slice(0, 2), 16);
    g = Number.parseInt(raw.slice(2, 4), 16);
    b = Number.parseInt(raw.slice(4, 6), 16);
    a = Number.parseInt(raw.slice(6, 8), 16) / 255;
  }

  return { r, g, b, a };
}

function rgbToHex(r: number, g: number, b: number) {
  return (
    `#${
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? `0${hex}` : hex;
        })
        .join('')}`
  );
}
</script>

<style lang="scss" scoped>
.co-color-input {
  display: flex;
  align-items: center;
  width: 100%;

  > input {
    flex: 1;
    margin-right: 4px;
  }

  .alpha {
    max-width: 60px;
    min-width: 48px;
    overflow: hidden;
  }
}
</style>
