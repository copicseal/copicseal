import type { SlateElement } from '@wangeditor/editor';
import type { VarsElement } from './custom-types';

// 生成 html 的函数
function attachmentToHtml(elem: SlateElement): string {
  const { value = '', label = '' } = elem as VarsElement;
  return `<span data-w-e-type="vars" data-value="${value}">${label}</span>`;
}

// 配置
const conf = {
  type: 'vars', // 节点 type ，重要！！！
  elemToHtml: attachmentToHtml,
};

export default conf;
