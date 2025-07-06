<template>
  <div
    class="tpl-card" :class="{ 'is-horizontal': isHorizontal, 'is-logo-shadow': logoShadow }"
    :style="{
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
        borderRadius: `${radius}rem`,
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
  id: 'tpl-default2',
  name: 'TplDefault2',
  title: '默认模板(无框圆角)',
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
  radius: {
    type: Number,
    default: 0.1,
    __co: {
      label: '图片圆角',
    },
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
  --box-shadow: 0 0 0.2rem rgba(0, 0, 0, 0.8);
  --font-scale: 1;
  --text-color: #000;
  color: var(--text-color);

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
  flex-direction: column;
  align-items: center;
  gap: 0.2em;
  padding-top: 0.2rem;
  font-size: calc(var(--font-scale) * 0.2rem);

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
          height: unset;
        }
      }

      > img,
      :deep(svg) {
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
      font-size: calc(var(--font-scale) * 0.1rem);
    }
    .date-time {
      margin-top: calc(var(--font-scale) * 0.02rem);
      font-size: calc(var(--font-scale) * 0.08rem);
      text-align: center;
      color: color-mix(in srgb, var(--text-color) 50%, transparent);
    }
  }
}

.is-horizontal.tpl-card {
  display: flex;

  .card-info {
    flex-direction: column;
    height: unset;
    padding: 0.02rem;

    .make-model {
      flex: 1;
      flex-direction: column;
      justify-content: center;
      gap: 0.1rem;
    }
    .details-info {
      .basie-info {
        align-items: center;
        flex-direction: column;
        gap: 1em;
        margin-left: 0;
        font-size: calc(var(--font-scale) * 0.1rem);
      }
    }
  }
}

.main-image {
  width: 1rem;
  height: auto;
  border-radius: 0.05rem;
  box-shadow: var(--box-shadow);
}
</style>
