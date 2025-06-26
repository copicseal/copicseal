<template>
  <div class="co-pos9-input">
    <CoRadioGroup v-model="modelValue" :options="options" />
  </div>
</template>

<script lang="ts" setup>
const modelValue = defineModel({ default: '' });

const options = [
  {
    label: '左上',
    iconClass: 'i-mdi-arrow-top-left',
    value: '-1,-1',
  },
  {
    label: '正上',
    iconClass: 'i-mdi-arrow-top',
    value: '0,-1',
  },
  {
    label: '右上',
    iconClass: 'i-mdi-arrow-top-right',
    value: '1,-1',
  },
  {
    label: '左中',
    iconClass: 'i-mdi-arrow-left',
    value: '-1,0',
  },
  {
    label: '正中',
    iconClass: 'i-mdi-image-filter-center-focus',
    value: '0,0',
  },
  {
    label: '右中',
    iconClass: 'i-mdi-arrow-right',
    value: '1,0',
  },
  {
    label: '左下',
    iconClass: 'i-mdi-arrow-bottom-left',
    value: '-1,1',
  },
  {
    label: '正下',
    iconClass: 'i-mdi-arrow-bottom',
    value: '0,1',
  },
  {
    label: '右下',
    iconClass: 'i-mdi-arrow-bottom-right',
    value: '1,1',
  },
];
</script>

<style lang="scss" scoped>
.co-pos9-input {
  display: flex;

  .co-radio-group {
    display: grid;
    grid-template-columns: repeat(3, 1fr);

    :deep(.co-radio-group-item) {
      margin-left: 0;
    }
  }
}
</style>
