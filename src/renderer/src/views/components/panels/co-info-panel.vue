<template>
  <CoSettingsPanel v-if="currentCoPic" title="照片信息">
    <div v-if="currentCoPic?.isLoaded" class="camera-info">
      <template v-for="item in primaryExif" :key="item.key">
        <div class="label">
          {{ item.name }}:
        </div>
        <div class="value">
          {{ currentCoPic.getExif()[item.key] }}
        </div>
      </template>
    </div>
  </CoSettingsPanel>
</template>

<script lang="ts" setup>
import CoSettingsPanel from '@/components/co-settings-panel/index.vue';
import { injectCoPic, primaryExif } from '@renderer/uses/co-pic';

const { currentCoPic } = injectCoPic();
</script>

<style lang="scss" scoped>
.camera-info {
  display: grid;
  /* 关键代码：第一列宽度自适应内容，第二列自动填充 */
  grid-template-columns: max-content 1fr;
  /* 行/列间距 */
  gap: 8px 8px;

  .label {
    color: #ccc;
    text-align: right;
  }

  .value {
  }
}
</style>
