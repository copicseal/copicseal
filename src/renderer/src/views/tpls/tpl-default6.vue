<template>
  <div
    class="tpl-card"
    :style="{
      '--font-scale': fontScale,
    }"
  >
    <img
      class="main-image"
      :style="{
        display: 'block',
        margin: '0 auto',
      }"
      :src="imgUrl"
    >
    <div
      class="watermark"
      :style="{
        backgroundImage: `url(${bgImg})`,
      }"
    />
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  id: 'tpl-default6',
  name: 'TplDefault6',
  title: '真·水印',
});

const props = defineProps({
  utils: {
    type: Object,
    default: () => ({}),
  },
  imgUrl: String,
  info: {
    type: Object,
    default: () => ({}),
  },
  fontFamily: {
    type: String,
  },
  text: {
    type: String,
    default: '@柯灰',
    __co: {
      label: '水印文字',
    },
  },
  textColor: {
    type: String,
    default: 'rgba(255,255,255,0.5)',
    __co: {
      label: '文字颜色',
      type: 'color',
    },
  },
  textRotate: {
    type: Number,
    default: 3.15,
    __co: {
      label: '文字方向',
      max: 360,
    },
  },
  fontScale: {
    type: Number,
    default: 1,
    __co: {
      label: '文字缩放',
    },
  },
  widthScale: {
    type: Number,
    default: 1,
    __co: {
      label: '瓦片宽度',
    },
  },
  heightScale: {
    type: Number,
    default: 1,
    __co: {
      label: '瓦片高度',
    },
  },
});

function genWatermark(
  text: string,
  color: string = '#000000',
  rotate: number = -45,
  width: number = 80,
  height: number = 80,
  fontSize: number = 16,
  fontFamily: string = 'Inter, sans-serif',
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <text
        x="50%" y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        fill="${color}"
        font-size="${fontSize}"
        font-family="${fontFamily}"
        transform="rotate(${rotate}, ${width / 2}, ${height / 2})"
        opacity="1"
      >
        ${text}
      </text>
    </svg>
  `.trim();

  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

const bgImg = computed(() => {
  return genWatermark(
    props.text,
    props.textColor,
    props.textRotate * 100,
    props.widthScale * 80,
    props.heightScale * 80,
    16,
    props.fontFamily,
  );
});
</script>

<style lang="scss" scoped>
.tpl-card {
  --font-scale: 1;
  position: relative;

  .main-image {
    width: 1rem;
    height: auto;
  }

  .watermark {
    position: absolute;
    inset: 0;
    background-repeat: repeat;
    background-size: calc(1rem * var(--font-scale));
  }
}
</style>
