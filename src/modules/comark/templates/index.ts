import { Minimal } from './minimal';
import type { TemplateMeta } from './types';

export { Minimal } from './minimal';
export type { TemplateComponent, TemplateMeta, TemplateProps } from './types';

export const BUILTIN_TEMPLATE: { meta: TemplateMeta; component: typeof Minimal } = {
  meta: { id: 'minimal', name: '极简', description: '右下角半透明参数水印' },
  component: Minimal,
};
