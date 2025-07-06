<template>
  <button class="co-button" :class="{ 'co-button--outline': outline, 'co-button--icon': icon, [`co-button--${type}`]: type }" type="button">
    <slot />
  </button>
</template>

<script lang="ts" setup>
defineProps<{
  outline?: boolean;
  icon?: boolean;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}>();
</script>

<style lang="scss" scoped>
.co-button {
  height: 28px;
  padding: 0 16px;
  color: #fff;
  background-color: transparent;
  cursor: pointer;
  border: none;
  white-space: nowrap;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  &--outline {
    border: 1px solid #fff;
    border-radius: 14px;
  }

  &--icon {
    display: flex;
    height: unset;
    padding: 0;
    &:hover {
      background-color: transparent;
    }
  }

  &--primary {
    background-color: var(--el-color-primary);
    border-color: var(--el-color-primary);

    &:hover {
      background-color: var(--el-color-primary);
    }
  }

  &--danger {
    color: var(--el-color-danger);
    border-color: var(--el-color-danger);
  }

  &--info {
    color: var(--el-color-info);
    border-color: var(--el-color-info);
  }

  + .co-button {
    margin-left: 8px;
  }
}
</style>
