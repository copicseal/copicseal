<template>
  <div
    class="tpl-card"
    :class="{ 'is-crop-pic': isCropPic }"
  >
    <div class="card-info">
      <div class="header">
        <div class="logo">
          <template v-if="isPs">
            Ps
          </template>
          <template v-else>
            <img v-if="utils.getMakeLogo(info.Make)" :src="utils.getMakeLogo(info.Make)" alt="">
            <span v-else>{{ info.Make }}</span>
          </template>
        </div>
        <div class="make-model">
          <template v-if="isPs">
            Adobe Photoshop
          </template>
          <template v-else>
            {{ info.Make }}
            {{ utils.getModelName(info.Model) }}
          </template>
        </div>
      </div>
      <div class="placeholder" />
      <div class="copyright">
        {{ copyright }}
      </div>
      <div class="website">
        {{ website }}
      </div>
      <div class="loading-text">
        {{ loadingText }}
      </div>
      <div class="details">
        <span>Make Model: {{ info.Make }} {{ info.Model }}</span>
        <span>Focal Length: {{ info.FocalLength }}</span>
        <span>F Number: {{ info.FNumber }}</span>
        <span v-if="info.ExposureTime">Exposure Time: {{ info.ExposureTime }}s</span>
        <span v-if="info.ISOSpeedRatings">ISO: {{ info.ISOSpeedRatings }}</span>
        <span v-if="info.DateTime">Date Time: {{ info.DateTime }}</span>
      </div>
      <div class="lens-info">
        <div class="lens-logo" />
        <div class="lens-name">
          {{ info.Lens }}
        </div>
      </div>
    </div>
    <img
      class="main-image"
      :style="{
        display: 'block',
        objectPosition: `${imgOffsetX} ${imgOffsetY}`,
      }"
      :src="imgUrl"
    >
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  id: 'tpl-ps-boot',
  name: 'TplPsBoot',
  title: 'PS 启动窗模板',
});

defineProps({
  utils: {
    type: Object,
    default: () => ({}),
  },
  imgUrl: String,
  info: {
    type: Object,
    default: () => ({}),
  },
  isCropPic: {
    type: Boolean,
    default: true,
    __co: {
      label: '裁剪图片',
    },
  },
  imgOffsetX: {
    type: String,
    default: '50%',
    __co: {
      when: 'isCropPic',
      label: '水平偏移',
      type: Number,
      min: 0,
      max: 100,
    },
  },
  imgOffsetY: {
    type: String,
    default: '50%',
    __co: {
      when: 'isCropPic',
      label: '垂直偏移',
      type: Number,
      min: 0,
      max: 100,
    },
  },
  copyright: {
    type: String,
    default: '© 2025 KOHAI. All rights reserved.',
    __co: {
      label: '版权信息',
    },
  },
  website: {
    type: String,
    default: '柯灰 作品。有关更多详情和法律声明，请转至 “https://kohai.top” 页面。',
    __co: {
      label: '网站链接',
    },
  },
  loadingText: {
    type: String,
    default: '正在读取参数信息...',
    __co: {
      label: '加载提示',
    },
  },
  isPs: {
    type: Boolean,
    default: false,
    __co: {
      label: 'Ps 标志',
    },
  },
});
</script>

<style lang="scss" scoped>
.tpl-card {
  --base-size: calc(4rem / 9.36);
  display: flex;
  height: calc(var(--base-size) * 10);
  padding: calc(var(--base-size) * 0.32);
  border-radius: calc(var(--base-size) * 0.4);
  background-color: #fff;
}

.card-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: calc(var(--base-size) * 5.76);
  padding: calc(var(--base-size) * 0.32);
  font-size: calc(var(--base-size) * 0.28);
  color: #8f8c8e;

  .header {
    display: flex;
    align-items: center;
    margin-bottom: calc(var(--base-size) * 0.4);
    font-size: calc(var(--base-size) * 0.4);
    font-weight: bold;

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: calc(var(--base-size) * 1.1);
      height: calc(var(--base-size) * 1.1);
      font-size: calc(var(--base-size) * 0.5);
      color: #4b96f7;
      background-color: #071125;
      border-radius: calc(var(--base-size) * 0.2);
      overflow: hidden;

      img, svg {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: drop-shadow(0 0 0.02rem #4b96f7) drop-shadow(0 0 0.02rem #4b96f7);
      }
    }

    .make-model {
      margin-left: calc(var(--base-size) * 0.2);
      color: #000;
    }
  }

  .lens-info {
    display: flex;
    align-items: center;
    margin-top: calc(var(--base-size) * 0.3);

    .lens-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: calc(var(--base-size) * 0.5);
      height: calc(var(--base-size) * 0.5);
      border-radius: calc(var(--base-size) * 0.1);
      background:
        radial-gradient(at 20% 30%, #ff4d4d, transparent 60%),
        radial-gradient(at 80% 20%, #ffa500, transparent 60%),
        radial-gradient(at 50% 70%, #00ffcc, transparent 60%),
        radial-gradient(at 30% 80%, #8f00ff, transparent 60%),
        radial-gradient(at 70% 60%, #ffff00, transparent 60%),
        radial-gradient(at 90% 90%, #00bfff, transparent 60%),
        #000; /* 背景基色 */
      background-blend-mode: screen;
    }

    .lens-name {
      margin-left: calc(var(--base-size) * 0.2);
      color: #000;
      font-size: calc(var(--base-size) * 0.32);
      font-weight: bold;
    }
  }

  .placeholder {
    flex: 1;
  }

  .website, .details {
    margin-top: calc(var(--base-size) * 0.4);
  }

  .details {
    span {
      display: block;
    }
  }

  .loading-text {
    margin-top: calc(var(--base-size) * 0.7);
  }
}

.main-image {
  margin-left: calc(var(--base-size) * 0.32);
  /* width: 100%; */
  border-radius: calc(var(--base-size) * 0.2);
  width: 1rem;
  height: auto;
  object-fit: cover;
}

.is-crop-pic {
  .main-image {
    width: calc(var(--base-size) * 8.28) !important;
  }
}
</style>
