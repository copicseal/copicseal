import { Minimal } from './minimal';
import type { BuiltinTemplate, TemplateSchema } from './types';

export { Minimal } from './minimal';
export type {
  BuiltinTemplate,
  TemplateComponent,
  TemplateMeta,
  TemplateProps,
  TemplateSchema,
  TemplateSchemaField,
} from './types';

const minimalSchema: TemplateSchema = {
  fields: [
    {
      key: 'orientation',
      label: '排版方向',
      type: 'select',
      options: [
        { label: '自动', value: 'auto' },
        { label: '横向', value: 'horizontal' },
        { label: '竖向', value: 'vertical' },
      ],
    },
    {
      key: 'fontScale',
      label: '字体缩放',
      type: 'number',
      min: 0.8,
      max: 2,
      step: 0.1,
    },
    {
      key: 'primaryColor',
      label: '主色',
      type: 'color',
    },
    {
      key: 'borderColor',
      label: '边框色',
      type: 'color',
    },
    {
      key: 'textLine1',
      label: '文案 1',
      type: 'text',
    },
    {
      key: 'textLine2',
      label: '文案 2',
      type: 'text',
    },
  ],
  defaults: {
    orientation: 'auto',
    margin: 1,
    fontScale: 1,
    primaryColor: '#1a1a1a',
    borderColor: '#1a1a1a',
    textLine1: '{Make} {Model}',
    textLine2: '{FocalLength}  f/{FNumber}  {ExposureTime}s  ISO{ISO}',
  },
};

export const BUILTIN_TEMPLATE: BuiltinTemplate = {
  meta: {
    id: 'minimal',
    name: '极简',
    description: '右下角半透明参数水印',
    tags: ['简洁', '水印'],
  },
  component: Minimal,
  schema: minimalSchema,
};

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  BUILTIN_TEMPLATE,
  {
    meta: {
      id: 'leica',
      name: 'Leica',
      description: '强调器材信息与简洁底标的经典模板。',
      tags: ['相机', '编辑风格'],
    },
    component: Minimal,
    schema: minimalSchema,
  },
  {
    meta: {
      id: 'film',
      name: 'Film',
      description: '偏胶片展示风格，保留较强的参数存在感。',
      tags: ['胶片', '复古'],
    },
    component: Minimal,
    schema: minimalSchema,
  },
  {
    meta: {
      id: 'instagram',
      name: '社媒',
      description: '偏社交媒体展示的轻量模板。',
      tags: ['社交', '移动端'],
    },
    component: Minimal,
    schema: minimalSchema,
  },
];
