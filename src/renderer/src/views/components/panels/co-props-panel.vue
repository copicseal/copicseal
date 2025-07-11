<template>
  <CoSettingsPanel v-if="currentCoPic" title="参数" @undo="() => currentCoPic.resetModifiedExif()">
    <div class="camera-info">
      <template v-for="key in usedExifKeys" :key="key">
        <div class="label">
          {{ getExifName(key) }}:
        </div>
        <div class="value">
          <input v-model="currentCoPic.state.modifiedExif[key]" type="text">
        </div>
      </template>
    </div>
  </CoSettingsPanel>
</template>

<script lang="ts" setup>
import { getExifName, injectCoPic } from '@/uses/co-pic';

const { currentCoPic } = injectCoPic();

const usedExifKeys = computed(() => {
  return currentCoPic.value?.usedExifKeys.value ?? [];
});
</script>

<style lang="scss" scoped>
.camera-info {
  display: grid;
  /* 关键代码：第一列宽度自适应内容，第二列自动填充 */
  grid-template-columns: max-content 1fr;
  /* 行/列间距 */
  gap: 8px 16px;

  .label {
    color: #ccc;
    text-align: right;
  }

  .value {
    input {
      width: 100%;
    }
  }
}
</style>
