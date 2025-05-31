<template>
  <div
    class="tpl-card"
  >
    <img
      class="main-image"
      :style="{
        display: 'block',
        margin: '0 auto',
      }"
      :src="imgUrl"
    >
    <CoDigital7
      class="datetime"
      :style="datetimeStyle"
      :value="datetime"
      :size="`${fontScale * 0.1}rem`"
      :color="fontColor"
      :shadow="shadow"
    />
  </div>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue';
import dayjs from 'dayjs';

defineOptions({
  id: 'tpl-default4',
  name: 'TplDefault4',
  title: '老照片（时间戳）',
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
    default: '1,1',
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
  fontColor: {
    type: String,
    default: '#ff4d00',
    __co: {
      label: '文字颜色',
      type: 'color',
    },
  },
  shadow: {
    type: Boolean,
    default: true,
    __co: {
      label: '文字光晕',
    },
  },
});

const datetime = computed(() => {
  return dayjs(props.info.DateTime, 'YYYY:MM:DD HH:mm:ss').format(props.dateFormat);
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
  position: relative;
  color: #000;

  .main-image {
    /* width: 100%; */
    width: 1rem;
    height: auto;
  }

  .datetime {
    position: absolute;
  }
}
</style>
