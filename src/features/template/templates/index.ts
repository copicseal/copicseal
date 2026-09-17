import { FILM_TEMPLATE } from './film';
import { MINIMAL_TEMPLATE } from './minimal';
import { OVERLAY_TEMPLATE } from './overlay';
import { ROUNDED_TEMPLATE } from './rounded';
import { WATERMARK_TEMPLATE } from './watermark';
import { WHITE_FRAME_TEMPLATE } from './whiteframe';

export { defineTemplate } from './define-template';
export { FILM_TEMPLATE } from './film';
export { EXIF_TEXT_VARIABLES, formatExifText } from './format-exif-text';
export { MINIMAL_TEMPLATE } from './minimal';
export { OVERLAY_TEMPLATE } from './overlay';
export { ROUNDED_TEMPLATE } from './rounded';
export type {
  RegisteredTemplate,
  TemplateField,
  TemplateFieldOption,
  TemplateFieldType,
  TemplateFieldValue,
  TemplateInjectedProps,
  TemplateMeta,
  TemplateParams,
  TemplateSchema,
  TemplateStyle,
} from './types';
export { WATERMARK_TEMPLATE } from './watermark';
export { WHITE_FRAME_TEMPLATE } from './whiteframe';

/** 内置模板清单：每个模板自带 meta、独立 schema 与独立渲染组件。 */
export const BUILTIN_TEMPLATES = [
  MINIMAL_TEMPLATE,
  FILM_TEMPLATE,
  WHITE_FRAME_TEMPLATE,
  ROUNDED_TEMPLATE,
  OVERLAY_TEMPLATE,
  WATERMARK_TEMPLATE,
] as const;

/** 默认模板 ID：找不到指定模板时回退到它。 */
export const DEFAULT_TEMPLATE_ID = MINIMAL_TEMPLATE.meta.id;
