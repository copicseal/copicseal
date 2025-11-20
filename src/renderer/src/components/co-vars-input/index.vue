<template>
  <div class="co-vars-input">
    <div
      ref="inputEl"
      class="input-element"
      contenteditable="true"
      @input="handleInput"
      @paste="handlePaste"
      @keydown="handleKeydown"
      @blur="handleBlur"
      @focus="handleFocus"
    />
    <div class="vars-list">
      可用变量：
      <span
        v-for="item in vars"
        :key="item.value"
        class="var-item"
        @click="insertVariable(item)"
        @mousedown="saveCursor"
      >
        {{ item.label }}
      </span>
    </div>
    {{ vars }}
    {{ modelValue }}
  </div>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    vars?: { value: string; label: string }[];
  }>(),
  {
    vars: () => [
      { value: '{username}', label: '用户名' },
      { value: '{date}', label: '日期' },
    ],
  },
);

const emit = defineEmits<{
  (e: 'focus', event: Event): void;
  (e: 'blur', event: Event): void;
}>();

const modelValue = defineModel<string>();

const isFocused = ref(false);
const inputEl = useTemplateRef('inputEl');

onMounted(() => {
  // 初始化时设置可编辑div的innerHTML
  updateDivContent();
});

function handleInput(event: Event) {
  const html = (event.target as HTMLDivElement)?.innerHTML;
  modelValue.value = parseHTMLToText(html);
}
function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const text = event.clipboardData?.getData('text/plain');
  document.execCommand('insertText', false, text);
}
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Backspace' || event.key === 'Delete') {
    handleDeleteKey(event);
  }
}
function handleBlur(event: Event) {
  isFocused.value = false;
  emit('blur', event);
}
function handleFocus(event: Event) {
  isFocused.value = true;
  emit('focus', event);
}

function handleDeleteKey(event: KeyboardEvent) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount)
    return;

  const range = selection.getRangeAt(0);
  const startContainer = range.startContainer;

  // 如果光标在变量标签后面，删除整个变量标签
  if (startContainer.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
    const previousSibling = startContainer.previousSibling as HTMLSpanElement | null;
    if (previousSibling && previousSibling.classList.contains('variable-tag')) {
      event.preventDefault();
      previousSibling.remove();
      handleInput({ target: inputEl.value } as unknown as Event);
    }
  }
}

function updateDivContent() {
  if (inputEl.value) {
    inputEl.value.innerHTML = parseContentToHTML(modelValue.value);
  }
}

function parseContentToHTML(text?: string) {
  if (!text)
    return '';

  // 匹配 {variable} 格式的变量
  const regex = /\{([^}]+)\}/g;
  return text.replace(regex, (match, variableName) => {
    const variable = props.vars.find(v => v.value === match);
    const label = variable ? variable.label : variableName;
    return `<span class="variable-tag" contenteditable="false" data-variable="${match}">${label}</span>`;
  });
}

function parseHTMLToText(html: string) {
  if (!html)
    return '';

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 遍历所有变量标签，恢复为 {variable} 格式
  const variableTags = tempDiv.querySelectorAll('.variable-tag');
  variableTags.forEach((tag) => {
    const variableName = tag.getAttribute('data-variable');
    tag.replaceWith(`${variableName}`);
  });

  // eslint-disable-next-line unicorn/prefer-dom-node-text-content
  return tempDiv.textContent || tempDiv.innerText || '';
}

let lastRange: Range | null = null;

function saveCursor() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    lastRange = sel.getRangeAt(0).cloneRange();
  }
}

async function insertVariable(variable: { value: string; label: string }) {
  if (!inputEl.value)
    return;

  // 确保可编辑区域有焦点
  if (!isFocused.value) {
    inputEl.value.focus();
    await nextTick();
    // await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const variableHTML = `<span class="variable-tag" contenteditable="false" data-variable="${variable.value}">${variable.label}</span>`;

  // 获取当前选区
  const selection = window.getSelection();
  console.log(selection);

  if (selection && selection.rangeCount > 0) {
    const range = lastRange || selection.getRangeAt(0); // todo
    console.log(range, inputEl.value.contains(range.commonAncestorContainer));

    // 检查选区是否在可编辑区域内
    if (!inputEl.value.contains(range.commonAncestorContainer)) {
      // 如果不在，将光标移到末尾
      range.selectNodeContents(inputEl.value);
      range.collapse(false);
    }

    // 删除选区内容（如果有）
    range.deleteContents();

    // 创建变量节点并插入
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = variableHTML;
    const variableNode = tempDiv.firstChild!;

    range.insertNode(variableNode);

    // 将光标移动到变量后面
    const newRange = document.createRange();
    newRange.setStartAfter(variableNode);
    newRange.setEndAfter(variableNode);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
  else {
    // 如果没有选区，则追加到末尾
    inputEl.value.innerHTML += variableHTML;
  }

  // 触发input事件同步数据
  handleInput({ target: inputEl.value } as unknown as Event);

  // 重新聚焦到可编辑区域
  inputEl.value.focus();
}
</script>

<style lang="scss" scoped>
.co-vars-input {
  .input-element {
    min-height: 100px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    padding: 8px;
    line-height: 2;
    outline: none;
    &:focus {
      border-color: #409eff;
    }

    :deep(.variable-tag) {
      /* border: 1px solid #409eff; */
      border-radius: 3px;
      padding: 0px 4px;
      color: #409eff;
      user-select: all;
      white-space: nowrap;
      text-decoration: underline;
    }
  }
}
</style>
