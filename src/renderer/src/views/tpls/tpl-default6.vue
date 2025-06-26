<template>
  <div
    class="tpl-card"
    :class="{ 'is-logo-shadow': logoShadow }"
    :style="{
      '--font-scale': fontScale,
      '--text-color': textColor,
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
      class="detail-info"
      :style="datetimeStyle"
    >
      <div class="liquid-glass-effect" />
      <div class="liquid-glass-tint" />
      <div class="liquid-glass-shine" />
      <div class="liquid-glass-text">
        <div class="make-logo">
          <img v-if="utils.getMakeLogo(info.Make)" :src="utils.getMakeLogo(info.Make)" alt="">
          <span v-else>{{ info.Make }}</span>
        </div>
        <div class="model-name">
          {{ utils.getModelName(info.Model) }}
        </div>
        <div class="basie-info">
          <span>{{ info.FocalLength }}</span>
          <span>{{ info.FNumber }}</span>
          <span v-if="info.ExposureTime">{{ info.ExposureTime }}s</span>
          <span v-if="info.ISOSpeedRatings">ISO{{ info.ISOSpeedRatings }}</span>
        </div>
        <div class="date-time">
          {{ datetime }}
        </div>
      </div>
    </div>
    <svg style="display: none">
      <filter
        id="glass-distortion"
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        filterUnits="objectBoundingBox"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.001 0.005"
          numOctaves="1"
          seed="5"
          result="turbulence"
        />
        <!-- Seeds: 14, 17,  -->

        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>

        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />

        <feSpecularLighting
          in="softMap"
          surfaceScale="5"
          specularConstant="1"
          specularExponent="100"
          lighting-color="white"
          result="specLight"
        >
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>

        <feComposite
          in="specLight"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
          result="litImage"
        />

        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale="150"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  </div>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue';
import dayjs from 'dayjs';

defineOptions({
  id: 'tpl-default6',
  name: 'TplDefault6',
  title: '玻璃模板',
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
  dateFormat: {
    type: String,
    default: 'YYYY-MM-DD HH:mm:ss',
    __co: {
      label: '日期格式',
      description: 'YYYY-年份，MM-月份，DD-日期，HH-时，mm-分，ss-秒',
    },
  },
  fontScale: {
    type: Number,
    default: 1,
    __co: {
      label: '文字缩放',
    },
  },
  fontPosition: {
    type: String,
    default: '0,1',
    __co: {
      label: '文字位置',
      type: 'pos9',
    },
  },
  offsetTop: {
    type: Number,
    default: 0.02,
    __co: {
      label: '顶部偏移',
      min: 0,
      max: 50,
      when: props => props.fontPosition?.split(',')[1] === '-1',
    },
  },
  offsetLeft: {
    type: Number,
    default: 0.02,
    __co: {
      label: '左侧偏移',
      min: 0,
      max: 50,
      when: props => props.fontPosition?.split(',')[0] === '-1',
    },
  },
  offsetRight: {
    type: Number,
    default: 0.02,
    __co: {
      label: '右侧偏移',
      min: 0,
      max: 50,
      when: props => props.fontPosition?.split(',')[0] === '1',
    },
  },
  offsetBottom: {
    type: Number,
    default: 0.02,
    __co: {
      label: '底部偏移',
      min: 0,
      max: 50,
      when: props => props.fontPosition?.split(',')[1] === '1',
    },
  },
  textColor: {
    type: String,
    default: '#fff',
    __co: {
      label: '文字颜色',
      type: 'color',
    },
  },
  logoShadow: {
    type: Boolean,
    default: false,
    __co: {
      label: '标志阴影',
    },
  },
});

const datetime = computed(() => {
  return dayjs(props.info.DateTimeOriginal, 'YYYY:MM:DD HH:mm:ss').format(props.dateFormat);
});

const datetimeStyle = computed(() => {
  const style: CSSProperties = {};
  const [x, y] = props.fontPosition.split(',');
  if (x === '-1') {
    style.left = `${props.offsetLeft * 100}%`;
  }
  else if (x === '1') {
    style.right = `${props.offsetRight * 100}%`;
  }
  else {
    style.left = '50%';
    style.transform = 'translateX(-50%)';
  }
  if (y === '-1') {
    style.top = `${props.offsetTop * 100}%`;
  }
  else if (y === '1') {
    style.bottom = `${props.offsetBottom * 100}%`;
  }
  else {
    style.top = '50%';
    style.transform = 'translateY(-50%)';
    if (x === '0') {
      style.transform = 'translate(-50%, -50%)';
    }
  }

  return style;
});
</script>

<style lang="scss" scoped>
.tpl-card {
  --font-scale: 1;
  --text-color: #000;
  position: relative;
  color: var(--text-color);

  &.is-logo-shadow {
    .detail-info .make-logo {
      > img {
        filter: drop-shadow(0 0 0.02rem var(--text-color)) drop-shadow(0 0 0.02rem var(--text-color));
      }
    }
  }

  .main-image {
    /* width: 100%; */
    width: 1rem;
    height: auto;
  }

  .detail-info {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;

    .make-logo {
      display: flex;
      align-items: center;
      font-weight: bold;

      > img {
        max-height: calc(var(--font-scale) * 0.2rem);
        max-width: calc(var(--font-scale) * 0.6rem);
      }
    }

    .model-name {
      display: flex;
      align-items: flex-end;
      margin-left: 0.05rem;
      font-size: calc(var(--font-scale) * 0.1rem);
    }

    .basie-info {
      display: flex;
      align-items: flex-end;
      gap: 0.5em;
      font-size: calc(var(--font-scale) * 0.1rem);
    }
    .date-time {
      margin-top: calc(var(--font-scale) * 0.02rem);
      font-size: calc(var(--font-scale) * 0.08rem);
      text-align: center;
      color: color-mix(in srgb, var(--text-color) 50%, transparent);
    }

    // position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.1rem;
    overflow: hidden;
    box-shadow:
      0 6px 6px rgba(0, 0, 0, 0.2),
      0 0 20px rgba(0, 0, 0, 0.1);
    // transition: all 0.4s;

    &,
    > div {
      border-radius: 0.1rem;
    }

    .liquid-glass-effect {
      position: absolute;
      z-index: 0;
      inset: 0;
      backdrop-filter: blur(3px);
      filter: url(#glass-distortion);
      overflow: hidden;
      isolation: isolate;
    }

    .liquid-glass-tint {
      z-index: 1;
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.25);
    }

    .liquid-glass-shine {
      position: absolute;
      inset: 0;
      z-index: 2;

      overflow: hidden;

      box-shadow:
        inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5),
        inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5);
    }

    .liquid-glass-text {
      z-index: 3;
      display: flex;
      flex-direction: column;
      align-items: center !important;
    }
  }
}
</style>
