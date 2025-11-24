import type { IDomEditor, SlateElement } from '@wangeditor/editor';
import type { VNode } from 'snabbdom';
import type { VarsElement } from './custom-types';
import { DomEditor } from '@wangeditor/editor';
import { h } from 'snabbdom';

function renderVars(elem: SlateElement, children: VNode[] | null, editor: IDomEditor): VNode {
  const isDisabled = editor.isDisabled();

  // 当前节点是否选中
  const selected = DomEditor.isNodeSelected(editor, elem);

  // 构建 vnode
  const { value = '', label = '' } = elem as VarsElement;
  const vnode = h(
    'span',
    {
      props: {
        contentEditable: false, // 不可编辑
      },
      dataset: {
        value,
      },
      style: {
        display: 'inline-block', // inline
        marginLeft: '3px',
        marginRight: '3px',
        border:
          selected && !isDisabled
            ? '2px solid var(--w-e-textarea-selected-border-color)' // wangEditor 提供了 css var https://www.wangeditor.com/v5/theme.html
            : '2px solid transparent',
        borderRadius: '3px',
        padding: '0 3px',
        backgroundColor: '#f1f1f1',
        cursor: isDisabled ? 'pointer' : 'inherit',
      },
    },
    [
      label,
    ],
  );

  return vnode;
}

const conf = {
  type: 'vars', // 节点 type ，重要！！！
  renderElem: renderVars,
};

export default conf;
