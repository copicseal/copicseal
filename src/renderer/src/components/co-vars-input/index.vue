<template>
  <div class="co-vars-input">
    <Editor
      v-model="valueHtml"
      style="height: 200px; overflow-y: hidden;"
      :default-config="editorConfig"
      mode="simple"
      @on-created="handleCreated"
      @custom-paste="customPaste"
      @on-change="handleChange"
    />
    <div class="vars-list">
      可用变量：
      <span
        v-for="item in vars"
        :key="item.value"
        class="var-item"
        @click="insertVariable(item)"
      >
        {{ item.label }},
      </span>
    </div>
    {{ valueHtml }}
    {{ modelValue }}
  </div>
</template>

<script lang="ts" setup>
import type { IDomEditor } from '@wangeditor/editor';
import type { VarsElement } from './editor-plugin-vars/custom-types';
import { Editor } from '@wangeditor/editor-for-vue';
import '@/components/co-vars-input/editor-plugin-vars/index';
import '@wangeditor/editor/dist/css/style.css';

withDefaults(
  defineProps<{
    vars?: { value: string; label: string }[];
  }>(),
  {
    vars: () => [],
  },
);
const editorRef = shallowRef();
const valueHtml = ref('<p></p>');

const editorConfig = {
  placeholder: '请输入内容...',
  MENU_CONF: {
    hoverbar: {
      show: false, // 彻底关闭 hoverbar
    },
  },
};

function customPaste(editor: IDomEditor, event: ClipboardEvent): boolean {
  // event 是 ClipboardEvent 类型，可以拿到粘贴的数据
  // 可参考 https://developer.mozilla.org/zh-CN/docs/Web/API/ClipboardEvent

  // const html = event.clipboardData.getData('text/html') // 获取粘贴的 html
  const text = event.clipboardData?.getData('text/plain'); // 获取粘贴的纯文本
  // const rtf = event.clipboardData.getData('text/rtf') // 获取 rtf 数据（如从 word wsp 复制粘贴）

  // 同步
  editor.insertText((text || '').replace(/[\r\n]+/g, ' ')); // 粘贴时将换行替换为空格
  // 阻止默认的粘贴行为
  event.preventDefault();
  return false;
}

onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null)
    return;
  editor.destroy();
});

function handleCreated(editor) {
  editorRef.value = editor; // 记录 editor 实例，重要！
  editor.getEditableContainer().addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  });
}
const modelValue = defineModel<string>();
let innerValue = '';
watch(modelValue, (val) => {
  if (val === innerValue) {
    return;
  }
  valueHtml.value = `<p>${(val || '').replace(/\{([^{]+)\}/g, (v, v2) => {
    return `<span data-w-e-type="vars" data-value="${v}">${v2}</span>`;
  })}</p>`;
}, { immediate: true });

function handleChange(editor: IDomEditor) {
  const treeToValue = (list: any[]) => {
    return list
      .map((node) => {
        if (node.text) {
          return node.text;
        }
        else if (node.type === 'vars') {
          return node.value;
        }
        else if (node.children) {
          return treeToValue(node.children);
        }
        return '';
      })
      .join('');
  };
  innerValue = treeToValue(editor.children);
  modelValue.value = innerValue;
}

function insertVariable({ label, value }: { value: string; label: string }) {
  const editor = editorRef.value;
  if (editor == null)
    return;

  editor.restoreSelection();
  // 插入节点
  const attachmentElem: VarsElement = {
    type: 'vars',
    label,
    value,
    children: [{ text: '' }],
  };
  editor.insertNode(attachmentElem);
  editor.move(1);
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
