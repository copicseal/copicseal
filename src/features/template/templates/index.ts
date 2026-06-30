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
      label: '照片方向',
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
      label: '主文字颜色',
      type: 'color',
    },
    {
      key: 'borderColor',
      label: '边框颜色',
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
    name: '简约',
    description: '适合展示 EXIF 与轻量文字信息的基础模板。',
    tags: ['极简', '基础'],
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
      description: '沿用极简排版，偏向相机品牌署名和经典器材展示。',
      tags: ['器材感', '品牌署名'],
    },
    component: Minimal,
    schema: minimalSchema,
  },
  {
    meta: {
      id: 'film',
      name: 'Film',
      description: '偏胶片风格的文字信息组织，适合复古导出效果。',
      tags: ['胶片', '复古'],
    },
    component: Minimal,
    schema: minimalSchema,
  },
  {
    meta: {
      id: 'instagram',
      name: 'Instagram',
      description: '适合社交媒体分享的轻量信息模板。',
      tags: ['社媒', '分享'],
    },
    component: Minimal,
    schema: minimalSchema,
  },
];
