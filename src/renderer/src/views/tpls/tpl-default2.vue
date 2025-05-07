<template>
  <div
    class="tpl-card" :class="{ 'is-horizontal': isHorizontal, 'is-text-white': textWhite }"
    :style="{ '--box-shadow': shadow }"
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
  textWhite: {
    type: Boolean,
    default: false,
    __co: {
      label: '文字白色',
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
  color: #000;

  &.is-text-white {
    color: #fff;

    .make-model .make-logo {

      > img {
        filter: drop-shadow(0 0 0.02rem white) drop-shadow(0 0 0.02rem white);
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
  font-size: 0.2rem;

  .make-model {
    display: flex;
    align-items: center;

    .make-logo {
      display: flex;
      align-items: center;
      font-weight: bold;

      > img {
        max-height: 0.2rem;
        max-width: 0.6rem;
      }
    }

    .model-name {
      display: flex;
      align-items: flex-end;
      margin-left: 0.05rem;
      font-size: 0.1rem;
    }
  }

  .details-info {
    .basie-info {
      display: flex;
      align-items: flex-end;
      gap: 0.5em;
      margin-left: 0.1rem;
      font-size: 0.1rem;
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
      justify-content: center;
      width: 0.1rem;
      transform: rotate(90deg);
    }
    .details-info .basie-info {
      flex-direction: column;
      gap: 1em;
      margin-left: 0;
      font-size: 0.1rem;
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
