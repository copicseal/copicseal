<template>
  <div class="co-radio-group">
    <div
      v-for="opt in options"
      :key="opt.value"
      :title="opt.label"
      class="co-radio-group-item"
      :class="{ 'is-icon': !!opt.icon, 'is-select': modelValue === opt.value }"
      @click="emit('update:modelValue', opt.value)"
    >
      <component :is="opt.icon" v-if="opt.icon" />
      <span v-else>{{ opt.label }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Component } from 'vue';

export interface Option {
  icon?: Component;
  label?: string;
  value?: string | number;
}

defineProps<{
  modelValue?: string | number;
  options: Option[];
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', val?: string | number): void;
}>();
</script>

<style lang="scss" scoped>
.co-radio-group {
  display: flex;
  flex-wrap: wrap;

  .co-radio-group-item {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 25px;
    height: 25px;
    border-radius: 2px;
    cursor: pointer;

    + .co-radio-group-item {
      margin-left: 4px;
    }

    &:active,
    &.is-select {
      padding-top: 1px;
      background-color: #2f2f2f;
    }

    &.is-select {
      box-shadow: inset 0 0 0 1px #1588eb;
    }

    &.is-icon {
      width: 25px;
      font-size: 24px;
    }

    span {
      padding: 0 4px;
    }
  }
}
</style>
