<template>
  <div class="tpl-card" :class="{ 'is-horizontal': isHorizontal }">
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
    type: [Number, String],
    default: 0,
  },
});

const isHorizontal = computed(() => {
  return props.info.ImageWidth < props.info.ImageHeight;
});
</script>

<style lang="scss" scoped>
.tpl-card {
  padding: 0.01rem 0.01rem 0;
  color: #000;
  background-color: #fff;
  box-shadow: 0 0 0.2rem rgba(0, 0, 0, 0.8);
}

.card-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 0.1rem;
  padding-left: 0.02rem;
  padding-right: 0.02rem;
  font-size: 0.05rem;

  .make-model {
    display: flex;
    align-items: center;

    .make-logo {
      display: flex;
      align-items: center;
      font-weight: bold;

      > img {
        max-height: 0.08rem;
        max-width: 0.2rem;
      }
    }

    .model-name {
      display: flex;
      align-items: flex-end;
      margin-left: 0.02rem;
      font-size: 0.04rem;
    }
  }

  .details-info {
    .basie-info {
      display: flex;
      align-items: flex-end;
      gap: 0.5em;
      margin-left: 0.03rem;
      font-size: 0.03rem;
    }
  }
}

.is-horizontal.tpl-card {
  display: flex;
  padding: 0.01rem 0 0.01rem 0.01rem;

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
      font-size: 0.03rem;
    }
  }
}

.main-image {
  width: 100%;
  height: auto;
}
</style>
