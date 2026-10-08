import type { Messages } from '../../translate';
import { app } from './app';
import { collage } from './collage';
import { common } from './common';
import { fonts } from './fonts';
import { settings } from './settings';
import { template } from './template';
import { templateExport } from './templateExport';

/**
 * English.
 *
 * 就地标注成 `Messages`：漏翻或结构与中文不一致时，这里直接编译报错。
 */
export const enUS: Messages = {
  common,
  app,
  settings,
  collage,
  template,
  templateExport,
  fonts,
};
