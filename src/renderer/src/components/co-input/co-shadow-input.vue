<template>
  <div class="co-shadow-input">
    <div class="preview" @click="expanded = !expanded">
      <div class="preview-box" :style="{ boxShadow: modelValue, backgroundColor: color }" />
      <!-- <span class="shadow-string">{{ modelValue }}</span> -->
    </div>

    <div v-if="expanded" class="inputs">
      <div class="grid-inputs">
        <!-- <div class="label">
          内阴影：
        </div>
        <div class="input">
          <input v-model="inset" type="checkbox">
        </div> -->
        <div class="label">
          X 偏移：
        </div>
        <div class="input">
          <CoInput v-model="x" mode="percent" unit="rem" />
        </div>
        <div class="label">
          Y 偏移：
        </div>
        <div class="input">
          <CoInput v-model="y" mode="percent" unit="rem" />
        </div>
        <div class="label">
          模糊：
        </div>
        <div class="input">
          <CoInput v-model="blur" mode="percent" unit="rem" :min="0" />
        </div>
        <div class="label">
          扩散：
        </div>
        <div class="input">
          <CoInput v-model="spread" mode="percent" unit="rem" />
        </div>
        <div class="label">
          颜色：
        </div>
        <div class="input">
          <CoColorInput v-model="color" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CoColorInput from './co-color-input.vue';
import CoInput from './index.vue';

interface Props {
  modelValue: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();

const inset = ref(false);
const x = ref('');
const y = ref('');
const blur = ref('');
const spread = ref('');
const color = ref('');
const expanded = ref(false);

/** 解析字符串 */
watch(
  () => props.modelValue,
  (val) => {
    if (!val)
      return;
    const regex
        = /^(inset\s+)?(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(rgba?\([^)]+\)|#[a-fA-F0-9]+|\S+)$/;
    const match = val.match(regex);
    if (match) {
      inset.value = !!match[1];
      x.value = match[2];
      y.value = match[3];
      blur.value = match[4];
      spread.value = match[5];
      color.value = match[6];
    }
  },
  { immediate: true },
);

/** 更新输出值 */
watch([inset, x, y, blur, spread, color], () => {
  const shadow = `${inset.value ? 'inset ' : ''}${x.value} ${y.value} ${blur.value} ${spread.value} ${color.value}`;
  emit('update:modelValue', shadow);
});
</script>

<style lang="scss" scoped>
  .co-shadow-input {
    width: 100%;
    font-size: 14px;
    color: #fff;
  }

  .preview {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .preview-box {
    width: 20px;
    height: 20px;
    border: 1px solid #ccc;
  }

  .shadow-string {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .inputs {
    margin-top: 12px;

    .grid-inputs {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 4px 4px;
        width: 100%;

        .label {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            white-space: nowrap;
            font-size: 12px;
            color: #ccc;
        }

        .input {
            display: flex;
            input {
                width: 100%;
            }
        }
    }
  }
</style>
