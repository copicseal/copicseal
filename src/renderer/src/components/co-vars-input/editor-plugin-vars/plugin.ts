import type { IDomEditor } from '@wangeditor/editor';
import { DomEditor } from '@wangeditor/editor';

function withVars<T extends IDomEditor>(editor: T) {
  const { isInline, isVoid } = editor;
  const newEditor = editor;

  // 重写 isInline
  newEditor.isInline = (elem) => {
    const type = DomEditor.getNodeType(elem);
    if (type === 'vars') {
      return true;
    }

    return isInline(elem);
  };

  // 重写 isVoid
  newEditor.isVoid = (elem) => {
    const type = DomEditor.getNodeType(elem);
    if (type === 'vars') {
      return true;
    }

    return isVoid(elem);
  };

  return newEditor;
}

export default withVars;
