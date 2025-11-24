import type { IModuleConf } from '@wangeditor/editor';
import { Boot } from '@wangeditor/editor';
import elemToHtmlConf from './elem-to-html';
import parseHtmlConf from './parse-elem-html';
import withVars from './plugin';
import renderElemConf from './render-elem';

const module: Partial<IModuleConf> = {
  editorPlugin: withVars,
  renderElems: [renderElemConf],
  elemsToHtml: [elemToHtmlConf],
  parseElemsHtml: [parseHtmlConf],
  menus: [],
};
Boot.registerModule(module);

export default module;
