import { Minimal } from './minimal';
import type { BuiltinTemplate } from './types';

export { Minimal } from './minimal';
export type { BuiltinTemplate, TemplateComponent, TemplateMeta, TemplateProps } from './types';

export const BUILTIN_TEMPLATE: BuiltinTemplate = {
  meta: {
    id: 'minimal',
    name: 'Minimal',
    description: '右下角半透明参数水印',
    tags: ['clean', 'watermark'],
  },
  component: Minimal,
};

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  BUILTIN_TEMPLATE,
  {
    meta: {
      id: 'leica',
      name: 'Leica',
      description: '强调器材信息与简洁底标的经典模板。',
      tags: ['camera', 'editorial'],
    },
    component: Minimal,
  },
  {
    meta: {
      id: 'film',
      name: 'Film',
      description: '偏胶片展示风格，保留较强的参数存在感。',
      tags: ['film', 'retro'],
    },
    component: Minimal,
  },
  {
    meta: {
      id: 'instagram',
      name: 'Instagram',
      description: '偏社交媒体展示的轻量模板。',
      tags: ['social', 'mobile'],
    },
    component: Minimal,
  },
];
