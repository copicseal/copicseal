import type { SlateElement } from '@wangeditor/editor';
import type { VarsElement } from './custom-types';

function parseHtml(
  elem: Element,
): SlateElement {
  const value = (elem as HTMLSpanElement).dataset.value || '';
  const label = elem.textContent || '';
  console.log(elem, { value, label });

  return {
    type: 'vars',
    value,
    label,
    children: [{ text: '' }], // void node 必须有一个空白 text
  } as VarsElement;
}

const parseHtmlConf = {
  selector: 'span[data-w-e-type="vars"]',
  parseElemHtml: parseHtml,
};

export default parseHtmlConf;
