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
    <div class="liquid-glass-effect" />
    <div class="liquid-glass-tint" />
    <div class="liquid-glass-shine" />
    <div class="liquid-glass-text" />
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
          <img v-if="utils.getMakeLogo(info.Make)" :src="utils.getMakeLogo(info.Make)" alt="">
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
defineOptions({
  id: 'tpl-default7',
  name: 'TplDefault7',
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
  logoShadow: {
    type: Boolean,
    default: false,
    __co: {
      label: '标志阴影',
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
  position: relative;
  border-radius: 0.1rem;
  padding: var(--border-padding) var(--border-padding) 0;
  padding: var(--border-padding) var(--border-padding) calc(var(--border-padding) / 2);
  color: var(--text-color);
  // background-color: var(--border-color);
  // box-shadow: var(--box-shadow);

  &.is-logo-shadow {
    .make-model .make-logo {
      > img {
        filter: drop-shadow(0 0 0.02rem var(--text-color)) drop-shadow(0 0 0.02rem var(--text-color));
      }
    }
  }
}

.card-info {
  z-index: 2;
  position: relative;
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
      color: color-mix(in srgb, var(--text-color) 50%, #888888ff);
    }
  }
}

.liquid-glass-effect {
  position: absolute;
  z-index: 0;
  inset: 0;
  backdrop-filter: blur(3px);
  filter: url(#glass-distortion);
  overflow: hidden;
  isolation: isolate;
  border-radius: 0.1rem;
}

.liquid-glass-tint {
  z-index: 1;
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 0.1rem;
}

.liquid-glass-shine {
  position: absolute;
  inset: 0;
  z-index: 2;

  overflow: hidden;

  box-shadow:
    inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5),
    inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5);
  border-radius: 0.1rem;
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
  z-index: 2;
  position: relative;
  /* width: 100%; */
  width: 1rem;
  height: auto;
}
</style>
