<template>
  <div class="co-vars-input">
    <Editor
      v-model="valueHtml"
      style="overflow-y: hidden;"
      :default-config="editorConfig"
      mode="simple"
      @on-created="handleCreated"
      @custom-paste="customPaste"
      @on-change="handleChange"
    />
    <div class="vars-list">
      插入：
      <span
        v-for="item in vars"
        :key="item.value"
        class="var-item"
        @click="insertVariable(item)"
      >
        {{ item.label }}
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { IDomEditor } from '@wangeditor/editor';
import type { VarsElement } from './editor-plugin-vars/custom-types';
import { Editor } from '@wangeditor/editor-for-vue';
import '@/components/co-vars-input/editor-plugin-vars/index';
import '@wangeditor/editor/dist/css/style.css';

const props = withDefaults(
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
  placeholder: '',
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

function handleCreated(editor: IDomEditor) {
  editorRef.value = editor; // 记录 editor 实例，重要！
  editor.getEditableContainer().addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') {
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
  valueHtml.value = modelValueToHtml(val);
}, { immediate: true });

function modelValueToHtml(val?: string) {
  return `<p>${(val || '').replace(/\{([^{]+)\}/g, (v, v2) => {
    const label = props.vars.find(item => item.value === v)?.label || v2;
    return `<span data-w-e-type="vars" data-value="${v}">${label}</span>`;
  })}</p>`;
}

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
  :deep(.w-e-text-container) {
    [data-slate-editor] {
      min-height: 100px;
      padding: 2px 4px 20px;
      line-height: 20px;
      color: #eee;
      background-color: #3e3e3e;
      border: 1px solid #666;
      transition: border-color 0.2s;

      &:focus {
        outline: none;
        border-color: #999;
      }
      p {
        margin: 0;
        line-height: 24px;
      }
      .vars-tag {
        border: 1px solid #68bbff;
        border-radius: 2px;
        padding: 0 4px;
        color: #68bbff;
        white-space: nowrap;
        word-break: break-all;
        line-height: 10px;

        &.is-active {
          outline: 2px solid #fff;
        }
      }
    }
  }
  .vars-list {
    margin-top: 4px;
    font-size: 10px;

    .var-item {
      --color: #ccc;
      margin-right: 4px;
      padding: 0 4px;
      border: 1px solid var(--color);
      border-radius: 2px;
      color: var(--color);
      white-space: nowrap;
      cursor: pointer;

      &:hover {
        --color: #68bbff;
      }
    }
  }
}
</style>
