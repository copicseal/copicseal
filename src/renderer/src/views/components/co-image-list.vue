<template>
  <ElScrollbar ref="el" class="co-image-list" always :min-size="40" @wheel="handleScroll">
    <div
      v-for="(item, i) in list"
      :key="item.id"
      class="co-image-list-item"
      :class="{ active: item.id === currentCoPic?.id }"
      @click="handleClickItem(i)"
      @contextmenu="handleClickItemCtxMenu(i)"
    >
      <img :src="item.imgUrl" alt="">
    </div>
    <CoFileInput mini @change="handleFileChange" />
  </ElScrollbar>
</template>

<script lang="ts" setup>
import CoFileInput from '@/components/co-file-input/index.vue';
import { injectCoPic } from '@renderer/uses/co-pic';
import { CoPic } from '@/utils/co-pic';
import { ElScrollbar } from 'element-plus';
import { ref } from 'vue';

const { list, push, remove, setCurrentIndex, currentCoPic } = injectCoPic();
const el = ref<InstanceType<typeof ElScrollbar>>();

function handleFileChange(files: File[]) {
  if (!files.length)
    return;

  files.forEach((file) => {
    push(new CoPic(file));
  });
}

function handleClickItem(index: number) {
  setCurrentIndex(index);
}

async function handleClickItemCtxMenu(index: number) {
  const item = list.value[index];
  if (!item)
    return;

  window.api.showCtxMenu([
    {
      label: '关闭',
      click: () => {
        remove([index]);
      },
    },
    ...(list.value.length > 1
      ? [{
          label: '关闭其他',
          click: () => {
            const indexes = list.value.map((_, i) => i).filter(i => i !== index);
            remove(indexes);
          },
        }]
      : []),
    ...(index > 0
      ? [{
          label: '关闭左侧',
          click: () => {
            const indexes = list.value.map((_, i) => i).filter(i => i < index);
            remove(indexes);
          },
        }]
      : []),
    ...(index < list.value.length - 1
      ? [{
          label: '关闭右侧',
          click: () => {
            const indexes = list.value.map((_, i) => i).filter(i => i > index);
            remove(indexes);
          },
        }]
      : []),
    ...(list.value.length > 1
      ? [{
          label: '全部关闭',
          click: () => {
            remove(list.value.map((_, i) => i));
          },
        }]
      : []),
  ]);
}

function handleScroll(e: WheelEvent) {
  if (e.shiftKey || !el.value || !e.deltaY)
    return;

  e.preventDefault();
  let scrollLeft = el.value.wrapRef?.scrollLeft ?? 0;

  scrollLeft += e.deltaY;
  el.value.setScrollLeft(scrollLeft);
}
</script>

<style lang="scss" scoped>
.co-image-list {
  overflow: auto;
  background-color: #333333;

  :deep(.el-scrollbar__view) {
    display: flex;
    width: fit-content;
    height: 100%;
    padding: 8px;
  }

  .co-image-list-item {
    display: flex;
    height: 100%;
    margin-right: 8px;
    cursor: pointer;

    img {
      height: 100%;
      pointer-events: none;
    }

    &.active {
      box-shadow: 0 0 0 3px #fff;
    }
  }
}
</style>
