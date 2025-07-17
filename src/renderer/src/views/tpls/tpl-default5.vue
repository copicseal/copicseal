<template>
  <div
    class="tpl-card"
    :class="{ 'is-logo-shadow': logoShadow, 'is-horizontal': layout === 'H' }"
    :style="{
      '--font-scale': fontScale,
      '--gap-scale': gapScale,
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
      <div class="part1">
        <div class="make-logo">
          <div v-if="logoColorAuto && utils.getMakeLogoSvg(info)" class="svg-logo" v-html="utils.getMakeLogoSvg(info)" />
          <img v-else-if="utils.getMakeLogo(info)" :src="utils.getMakeLogo(info)" alt="">
          <span v-else>{{ info.Make }}</span>
        </div>
      </div>
      <div class="part2">
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
  </div>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue';
import dayjs from 'dayjs';

defineOptions({
  id: 'tpl-default5',
  name: 'TplDefault5',
  title: '文字内嵌模板',
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
  layout: {
    type: String,
    default: 'V',
    __co: {
      label: '布局排列',
      enums: [
        { label: '垂直', value: 'V' },
        { label: '水平', value: 'H' },
      ],
    },
  },
  gapScale: {
    type: Number,
    default: 1,
    __co: {
      label: '布局间距',
    },
  },
  dateFormat: {
    type: String,
    default: 'YYYY-MM-DD HH:mm:ss',
    __co: {
      label: '日期格式',
      description: 'YYYY-年份，MM-月份，DD-日期，HH-时，mm-分，ss-秒',
      when: props => props.layout === 'V',
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
  logoColorAuto: {
    type: Boolean,
    default: true,
    __co: {
      label: '标志颜色',
    },
  },
  logoShadow: {
    type: Boolean,
    default: false,
    __co: {
      label: '标志阴影',
      when: props => !props.logoColorAuto,
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
  --gap-scale: 1;
  --text-color: #000;
  --calc-gap-scale: calc(var(--font-scale) * var(--gap-scale));
  position: relative;
  color: var(--text-color);

  &.is-logo-shadow {
    .detail-info .make-logo {
      > img {
        filter: drop-shadow(0 0 0.02rem var(--text-color)) drop-shadow(0 0 0.02rem var(--text-color));
      }
    }
  }

  &.is-horizontal {
    .detail-info {
      display: flex;
      align-items: center;

      .part1,
      .part2 {
        align-items: flex-start;
      }

      .part2 {
        position: relative;
        margin-left: calc(var(--calc-gap-scale) * 0.08rem);
        padding-left: calc(var(--calc-gap-scale) * 0.08rem);

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: calc(var(--font-scale) * 0.05rem);
          bottom: calc(var(--font-scale) * 0.05rem);
          width: calc(var(--font-scale) * 0.005rem);
          background-color: var(--text-color);
        }
      }

      .model-name {
        margin-top: 0;
      }

      .date-time {
        display: none;
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

    .part1,
    .part2 {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .make-logo {
      display: flex;
      align-items: center;
      font-weight: bold;

      .svg-logo {
        display: flex;

        :deep(svg) {
          width: unset;
        }
      }

      > img,
      :deep(svg) {
        height: 100rem;
        max-height: calc(var(--font-scale) * 0.2rem);
        max-width: calc(var(--font-scale) * 0.6rem);
      }
    }

    .model-name {
      display: flex;
      align-items: flex-end;
      margin-top: calc(var(--calc-gap-scale) * 0.01rem);
      font-size: calc(var(--font-scale) * 0.1rem);
    }

    .basie-info {
      display: flex;
      align-items: flex-end;
      gap: 0.5em;
      margin-top: calc(var(--calc-gap-scale) * 0.01rem);
      font-size: calc(var(--font-scale) * 0.1rem);
    }
    .date-time {
      margin-top: calc(var(--calc-gap-scale) * 0.02rem);
      font-size: calc(var(--font-scale) * 0.08rem);
      text-align: center;
      color: color-mix(in srgb, var(--text-color) 50%, transparent);
    }
  }
}
</style>
