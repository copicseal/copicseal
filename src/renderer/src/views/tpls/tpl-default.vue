<template>
  <div
    class="tpl-card" :class="{ 'is-horizontal': isHorizontal }"
    :style="{ '--border-padding': `${borderPadding}rem`, '--box-shadow': shadow, '--font-scale': fontScale }"
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
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

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
  borderPadding: {
    type: Number,
    default: 0.04,
    __co: {
      label: '相框边距',
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
      label: '字体缩放',
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
  --box-shadow: 0 0 0.2rem rgba(0, 0, 0, 0.8);
  --font-scale: 1;
  padding: var(--border-padding) var(--border-padding) 0;
  color: #000;
  background-color: #fff;
  box-shadow: var(--box-shadow);
}

.card-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 0.4rem;
  padding-left: 0.1rem;
  padding-right: 0.1rem;
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
  }
}

.is-horizontal.tpl-card {
  display: flex;
  padding: var(--border-padding) 0 var(--border-padding) var(--border-padding);

  .card-info {
    flex-direction: column;
    height: unset;
    padding: 0.1rem;

    .make-model {
      flex: 1;
      justify-content: center;
      width: 0.1rem;
      transform: rotate(90deg);
    }
    .details-info .basie-info {
      flex-direction: column;
      gap: 0.5em;
      margin-left: 0;
      font-size: calc(var(--font-scale) * 0.1rem);
    }
  }
}

.main-image {
  /* width: 100%; */
  width: 1rem;
  height: auto;
}
</style>
