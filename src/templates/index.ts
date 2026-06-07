import { Minimal } from './Minimal';
import type { TemplateMeta } from './types';

export { Minimal } from './Minimal';
export type { TemplateComponent, TemplateMeta, TemplateProps } from './types';

export const BUILTIN_TEMPLATE: { meta: TemplateMeta; component: typeof Minimal } = {
  meta: { id: 'minimal', name: '极简', description: '右下角半透明参数水印' },
  component: Minimal,
};
