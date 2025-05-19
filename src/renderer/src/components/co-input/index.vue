<template>
  <div
    class="smart-input"
    @mousedown="onMouseDown"
    @click="enterEditMode"
  >
    <div v-if="!editing" class="smart-input__display">
      {{ displayValue }}
    </div>
    <input
      v-else
      ref="inputRef"
      v-model="inputValue"
      class="smart-input__input"
      type="text"
      @blur="exitEditMode"
      @keydown.enter="exitEditMode"
      @keydown="onKeyDown"
    >
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: number | string;
  mode?: 'percent' | 'number';
  unit?: 'rem' | '%';
  step?: number;
  min?: number;
  max?: number;
}
const props = withDefaults(defineProps<Props>(), {
  mode: 'number',
  step: 1,
});
const emit = defineEmits<{
  (e: 'update:modelValue', value: number | string): void;
}>();

const editing = ref(false);
const inputRef = ref<HTMLInputElement>();
const inputValue = ref('');

// 工具函数
function parseModelValueToPercent(newModelValue?: number | string) {
  newModelValue = newModelValue ?? props.modelValue;
  if (typeof newModelValue === 'string') {
    if (newModelValue.endsWith('%')) {
      return formatNumber(Number.parseFloat(newModelValue));
    }
    if (newModelValue.endsWith('rem')) {
      return formatNumber(Number.parseFloat(newModelValue) * 100);
    }
    return formatNumber(Number.parseFloat(newModelValue) * 100);
  }
  if (typeof newModelValue === 'number') {
    return formatNumber(newModelValue * 100);
  }
  return 0;
}

function formatNumber(num: number, decimalPlaces = 6) {
  let res = Number.parseFloat(num.toFixed(decimalPlaces));
  if (props.min !== undefined) {
    res = Math.max(res, props.min);
  }
  if (props.max !== undefined) {
    res = Math.min(res, props.max);
  }
  return res;
}

// 当前百分比
const currentPercent = computed(() => parseModelValueToPercent());

// 显示内容
const displayValue = computed(() => {
  if (props.mode === 'percent') {
    return `${(currentPercent.value)}%`;
  }
  else {
    return `${props.modelValue}`;
  }
});

// watch 编辑状态
watch(editing, (val) => {
  if (val) {
    if (props.mode === 'percent') {
      inputValue.value = (currentPercent.value).toString();
    }
    else {
      inputValue.value = props.modelValue.toString();
    }
    nextTick(() => {
      inputRef.value?.focus();
      inputRef.value?.select();
    });
  }
});

// 鼠标拖动逻辑
let lastX = 0;
let isDragging = false;
let isUpdated = false;

function onMouseDown(e: MouseEvent) {
  if (editing.value)
    return;
  isDragging = true;
  isUpdated = false;
  lastX = e.clientX;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging)
    return;
  const deltaX = e.clientX - lastX;
  lastX = e.clientX;

  const speed = getSpeedModifier(e);
  const deltaValue = deltaX * props.step * speed;

  updateValue(deltaValue);
  isUpdated = true;
}

function onMouseUp(e: MouseEvent) {
  const preventClick: EventListener = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };
  if (isUpdated) {
    // 如果是拖动操作，阻止后续的 click 事件
    e.target?.addEventListener('click', preventClick, { once: true });
    setTimeout(() => {
      e.target?.removeEventListener('click', preventClick);
    }, 20);
    isUpdated = false;
  }
  isDragging = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

// 键盘操作
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    let delta = props.step;
    if (e.key === 'ArrowDown') {
      delta = -props.step;
    }

    const speed = getSpeedModifier(e);
    updateValue(delta * speed);
  }
}

// 进入编辑
function enterEditMode() {
  if (!editing.value) {
    editing.value = true;
  }
}

// 退出编辑
function exitEditMode() {
  editing.value = false;
  let inputVal = Number.parseFloat(inputValue.value);
  if (Number.isNaN(inputVal))
    inputVal = 0;

  if (props.mode === 'percent') {
    if (typeof props.modelValue === 'string') {
      if (props.modelValue.endsWith('rem') || props.unit === 'rem') {
        emit('update:modelValue', `${formatNumber(inputVal / 100)}rem`);
      }
      else if (props.modelValue.endsWith('%') || props.unit === '%') {
        emit('update:modelValue', `${formatNumber(inputVal)}%`);
      }
      else {
        emit('update:modelValue', formatNumber(inputVal / 100));
      }
    }
    else if (typeof props.modelValue === 'number') {
      emit('update:modelValue', formatNumber(inputVal / 100));
    }
  }
  else {
    emit('update:modelValue', inputVal);
  }
}

// 更新值
function updateValue(deltaValue: number) {
  const newPercent = currentPercent.value + deltaValue;
  let newModelValue: number | string;

  if (props.mode === 'percent') {
    if (typeof props.modelValue === 'string') {
      if (props.modelValue.endsWith('rem') || props.unit === 'rem') {
        newModelValue = `${formatNumber(newPercent / 100)}rem`;
      }
      else if (props.modelValue.endsWith('%') || props.unit === '%') {
        newModelValue = `${formatNumber(newPercent)}%`;
      }
      else {
        newModelValue = formatNumber(newPercent / 100);
      }
    }
    else {
      newModelValue = formatNumber(newPercent / 100);
    }
  }
  else {
    if (typeof props.modelValue === 'number') {
      newModelValue = formatNumber(props.modelValue + deltaValue);
    }
    else {
      newModelValue = props.modelValue;
    }
  }

  emit('update:modelValue', newModelValue);

  // 👉 补上！同时更新 inputValue（如果正在编辑）
  if (editing.value) {
    if (props.mode === 'percent') {
      inputValue.value = (parseModelValueToPercent(newModelValue)).toString();
    }
    else {
      inputValue.value = newModelValue.toString();
    }
  }
}

// 速度倍率
function getSpeedModifier(e: MouseEvent | KeyboardEvent) {
  let speed = 1;
  if (e.shiftKey) {
    speed = 10;
  }
  else if (e.altKey) {
    speed = 0.1;
  }
  return speed;
}
</script>

<style lang="scss" scoped>
.smart-input {
  display: inline-block;
  width: 100%;
  position: relative;
  user-select: none;
  cursor: ew-resize;
  font-size: 14px;
  line-height: 20px;
}

.smart-input__display {
  width: 100%;
  border: 1px dashed #0000;
  border-bottom: 1px dashed transparent;
  padding: 2px 4px;
  line-height: 20px;
  box-sizing: border-box;
  text-decoration: underline dashed #68bbff;
  text-underline-offset: 4px;
  color: #68bbff;
}

.smart-input__input {
  display: block;
  width: 100%;
  padding: 2px 4px;
  font-size: 14px;
  line-height: 20px;
  // border: none;
  // border-bottom: 1px solid #eee;
  outline: none;
  cursor: text;
  box-sizing: border-box;
}
</style>
