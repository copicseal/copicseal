<template>
  <ElScrollbar class="co-image-view">
    <CoRender
      v-if="currentCoPic && currentCoPic.state.isLoaded"
      :tpl="currentCoPic.template.value || TplDefault"
      :tpl-props="currentCoPic.state.templateProps"
      :img-url="currentCoPic.imgUrl"
      :settings="currentCoPic.state.settings"
      :exif="outputExif"
      :font-family="currentCoPic.state.fontFamily"
    />
    <!-- <component :is="currentCoPic.update()" v-if="currentCoPic" /> -->
  </ElScrollbar>
</template>``

<script lang="ts" setup>
import type { ElScrollbar } from 'element-plus';
import { injectCoPic } from '@/uses/co-pic';
import TplDefault from '@/views/tpls/tpl-default.vue';
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
