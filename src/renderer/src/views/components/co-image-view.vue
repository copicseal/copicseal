<template>
  <ElScrollbar class="co-image-view">
    <CoRender
      v-if="currentCoPic && currentCoPic.state.isLoaded"
      :img-url="currentCoPic.imgUrl"
      :settings="currentCoPic.state.settings"
      :exif="outputExif"
    />
    <!-- <component :is="currentCoPic.update()" v-if="currentCoPic" /> -->
  </ElScrollbar>
</template>``

<script lang="ts" setup>
import { injectCoPic } from '@renderer/uses/co-pic';
import { ElScrollbar } from 'element-plus';
import { computed } from 'vue';
import CoRender from './co-render.vue';

const { currentCoPic } = injectCoPic();

const outputExif = computed(() => {
  if (currentCoPic.value) {
    return {
      ...currentCoPic.value.state.exif,
      ...currentCoPic.value.state.modifiedExif,
    };
  }
  return {};
});
</script>

<style lang="scss" scoped>
.co-image-view {
  color: #000;
  background-color: #282828;

  :deep(.el-scrollbar__view) {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
  }
}
</style>
