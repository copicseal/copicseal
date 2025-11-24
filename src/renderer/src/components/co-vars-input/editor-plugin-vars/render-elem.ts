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
      attrs: {
        class: [
          'vars-tag',
          selected && !isDisabled ? 'is-active' : '',
        ].join(' '),
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
