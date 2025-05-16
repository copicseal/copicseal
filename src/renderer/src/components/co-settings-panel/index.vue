<template>
  <ElCollapse class="co-settings-panel">
    <ElCollapseItem name="1">
      <template #title>
        <div class="icon">
          <IconArrowDown />
        </div>
        <div class="title">
          {{ title }}
        </div>
        <div style="flex: 1" />
        <CoButton v-if="onUndo" icon title="还原" @click.prevent.stop="onUndo">
          <Undo style="font-size: 20px" />
        </CoButton>
      </template>
      <slot />
    </ElCollapseItem>
  </ElCollapse>
</template>

<script lang="ts" setup>
import CoButton from '../co-button/index.vue';
import { Undo } from '../co-icon';
import IconArrowDown from './components/icon-arrow-down.vue';

defineProps<{
  title: string;
  onUndo?: () => void;
}>();
</script>

<style lang="scss" scoped>
.co-settings-panel {
  margin: 4px;
  border-top: 0;
  border-bottom: 0;

  :deep(.el-collapse-item) {
    --el-collapse-header-height: 36px;
    --el-collapse-header-bg-color: #535353;
    --el-collapse-content-bg-color: #535353;
    --el-collapse-header-text-color: #eee;
    --el-collapse-content-text-color: #eee;

    .el-collapse-item__header {
      --el-color-primary: #eee;
      display: flex;
      justify-content: space-between;
      padding: 0 12px;
      border-bottom: 0;
      color: unset;

      .icon {
        display: flex;
        align-items: center;
        font-size: 20px;
        transform: rotate(-90deg);
        transition: all 0.3s;
      }

      &.is-active {
        .icon {
          transform: rotate(0deg);
        }
      }

      .title {
        margin-left: 4px;
        font-size: 14px;
      }

      .el-collapse-item__arrow {
        display: none;
      }
    }

    .el-collapse-item__wrap {
      border-bottom: 0;
    }

    .el-collapse-item__content {
      padding: 0 12px 12px;
    }
  }
}
</style>
