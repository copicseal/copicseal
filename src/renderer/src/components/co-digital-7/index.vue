<template>
  <div
    class="co-digital-7" :style="{
      '--font-size': size,
      '--glow-size': `calc(var(--font-size) * 0.05)`, /* 比例可调试 */
      'mixBlendMode': 'screen',
      'color': color,
      'filter': shadow ? `drop-shadow(0 0 var(--glow-size) ${color})
                 drop-shadow(0 0 calc(var(--glow-size) * 2) #ff7a00)` : '',
    }"
  >
    <svg
      v-for="(segments, index) in displaySegments"
      :key="index"
      viewBox="0 0 57 80"
      xmlns="http://www.w3.org/2000/svg"
      width="57"
      height="80"
      :style="{
        display: 'inline-block',
        width: 'auto',
        height: 'var(--font-size)',
      }"
    >
      <defs>
        <polyline id="h-seg" points="11 0, 37 0, 42 5, 37 10, 11 10, 6 5" fill="currentColor" />
        <polyline id="v-seg" points="0 11, 5 6, 10 11, 10 34, 5 39, 0 39" fill="currentColor" />
        <circle id="dot" cx="28" cy="75" r="5" fill="currentColor" />
        <circle id="colon-top" cx="28" cy="25" r="5" fill="currentColor" />
        <circle id="colon-bot" cx="28" cy="55" r="5" fill="currentColor" />
      </defs>
      <g>
        <use v-if="segments.includes('A')" href="#h-seg" x="0" y="0" />
        <use v-if="segments.includes('B')" href="#v-seg" x="-48" y="0" transform="scale(-1,1)" />
        <use v-if="segments.includes('C')" href="#v-seg" x="-48" y="-80" transform="scale(-1,-1)" />
        <use v-if="segments.includes('D')" href="#h-seg" x="0" y="70" />
        <use v-if="segments.includes('E')" href="#v-seg" x="0" y="-80" transform="scale(1,-1)" />
        <use v-if="segments.includes('F')" href="#v-seg" x="0" y="0" />
        <use v-if="segments.includes('G')" href="#h-seg" x="0" y="35" />
        <g v-if="segments.includes('COLON')">
          <use href="#colon-top" />
          <use href="#colon-bot" />
        </g>
        <use v-if="segments.includes('DOT')" href="#dot" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: string;
  size?: string;
  color?: string;
  shadow?: boolean;
}>(), {
  value: '',
  size: '1rem',
  color: '#ff4d00',
  shadow: true,
});

const SEGMENTS = {
  '0': ['A', 'B', 'C', 'D', 'E', 'F'],
  '1': ['B', 'C'],
  '2': ['A', 'B', 'G', 'E', 'D'],
  '3': ['A', 'B', 'G', 'C', 'D'],
  '4': ['F', 'G', 'B', 'C'],
  '5': ['A', 'F', 'G', 'C', 'D'],
  '6': ['A', 'F', 'G', 'E', 'D', 'C'],
  '7': ['A', 'B', 'C'],
  '8': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  '9': ['A', 'B', 'C', 'D', 'F', 'G'],
  '-': ['G'],
  ':': ['COLON'],
  '.': ['DOT'],
} as Record<string, string[]>;

const displaySegments = computed(() => {
  return props.value.split('').map(char => SEGMENTS[char] ?? []);
});
</script>
