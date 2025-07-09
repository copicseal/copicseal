<template>
  <div
    class="tpl-card" :class="{ 'is-horizontal': isHorizontal, 'is-logo-shadow': logoShadow }"
    :style="{
      '--border-padding': `${borderPadding}rem`,
      '--border-color': borderColor,
      '--box-shadow': shadow,
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
    <div class="card-info">
      <div class="make-model">
        <div class="make-logo">
          <div v-if="logoColorAuto && utils.getMakeLogoSvg(info.Make)" class="svg-logo" v-html="utils.getMakeLogoSvg(info.Make)" />
          <img v-else-if="utils.getMakeLogo(info.Make)" :src="utils.getMakeLogo(info.Make)" alt="">
          <span v-else>{{ info.Make }}</span>
        </div>
        <div class="model-name">
          {{ utils.getModelName(info.Model) }}
        </div>
      </div>
      <div class="details-info">
        <div class="basie-info">
          <span>{{ info.FocalLength }}</span>
          <span>{{ info.FNumber }}</span>
          <span v-if="info.ExposureTime">{{ info.ExposureTime }}s</span>
          <span v-if="info.ISOSpeedRatings">ISO{{ info.ISOSpeedRatings }}</span>
        </div>
        <div class="date-time">
          <span>{{ info.DateTimeOriginal }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  id: 'tpl-default',
  name: 'TplDefault',
  title: '默认模板(白色边框)',
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
  direction: {
    type: Number,
    default: 0,
    __co: {
      label: '排列方向',
      enums: [
        {
          label: '自动',
          value: 0,
        },
        {
          label: '垂直',
          value: 1,
        },
        {
          label: '水平',
          value: -1,
        },
      ],
    },
  },
  borderPadding: {
    type: Number,
    default: 0.04,
    __co: {
      label: '相框边距',
    },
  },
  borderColor: {
    type: String,
    default: '#fff',
    __co: {
      label: '相框颜色',
      type: 'color',
    },
  },
  fontScale: {
    type: Number,
    default: 1,
    __co: {
      label: '文字缩放',
    },
  },
  textColor: {
    type: String,
    default: '#000',
    __co: {
      label: '文字颜色',
      type: 'color',
    },
  },
  logoColorAuto: {
    type: Boolean,
    default: false,
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
  shadow: {
    type: String,
    default: '0 0 0.2rem 0 rgba(0, 0, 0, 0.8)',
    __co: {
      label: '阴影',
      type: 'shadow',
    },
  },
});

const isHorizontal = computed(() => {
  return props.direction === 0 ? props.info.ImageWidth < props.info.ImageHeight : props.direction === -1;
});
</script>

<style lang="scss" scoped>
.tpl-card {
  --border-padding: 0.01rem;
  --border-color: #fff;
  --box-shadow: 0 0 0.2rem rgba(0, 0, 0, 0.8);
  --font-scale: 1;
  --text-color: #000;
  padding: var(--border-padding) var(--border-padding) 0;
  padding: var(--border-padding) var(--border-padding) calc(var(--border-padding) / 2);
  color: var(--text-color);
  background-color: var(--border-color);
  box-shadow: var(--box-shadow);

  &.is-logo-shadow {
    .make-model .make-logo {
      > img {
        filter: drop-shadow(0 0 0.02rem var(--text-color)) drop-shadow(0 0 0.02rem var(--text-color));
      }
    }
  }
}

.card-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 0.4rem;
  padding-left: 0.1rem;
  padding-right: 0.1rem;
  padding-top: calc(var(--border-padding) / 2);
  font-size: calc(var(--font-scale) * 0.1rem);

  .make-model {
    display: flex;
    align-items: center;

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
      margin-left: 0.05rem;
      font-size: calc(var(--font-scale) * 0.1rem);
    }
  }

  .details-info {
    .basie-info {
      display: flex;
      align-items: flex-end;
      gap: 0.5em;
      margin-left: calc(var(--font-scale) * 0.1rem);
      font-size: calc(var(--font-scale) * 0.1rem);
    }

    .date-time {
      display: flex;
      justify-content: flex-end;
      font-size: calc(var(--font-scale) * 0.08rem);
      text-align: right;
      color: color-mix(in srgb, var(--text-color) 50%, transparent);
    }
  }
}

.is-horizontal.tpl-card {
  display: flex;
  padding: var(--border-padding) calc(var(--border-padding) / 2) var(--border-padding) var(--border-padding);

  .card-info {
    flex-direction: column;
    height: unset;
    padding: 0.1rem;
    padding-left: calc(var(--border-padding) / 2 + 0.1rem);

    .make-model {
      flex: 1;
      flex-direction: column;
      justify-content: center;
      gap: 0.1rem;
      // width: 0.1rem;
      // transform: rotate(90deg);
    }
    .details-info {
      .basie-info {
        align-items: center;
        flex-direction: column;
        gap: 0.5em;
        margin-left: 0;
        font-size: calc(var(--font-scale) * 0.1rem);
      }

      .date-time {
        margin-top: 0.1rem;
        word-break: keep-all;
        white-space: break-spaces;
      }
    }
  }
}

.main-image {
  /* width: 100%; */
  width: 1rem;
  height: auto;
}
</style>
