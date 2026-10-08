import {
  BUILTIN_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  type RegisteredTemplate,
  type TemplateField,
  type TemplateFieldOption,
  type TemplateSchema,
} from '@/features/template/templates';
import type { MessageKey } from '@/shared/i18n';

export { DEFAULT_TEMPLATE_ID };

/** 取文案的函数：组件里传 `useTranslate()`，非组件代码传 `translate()`。 */
export type MessageTranslator = (key: MessageKey) => string;

/**
 * 模板显示名。
 *
 * 元数据里的 `name` 是模板作者写的字面量，`nameKey` 是抽取后的文案 key；
 * 有 key 就用当前语言，没有就回落字面量——作者可以对某个模板完全不写 key。
 */
export function resolveTemplateName(template: RegisteredTemplate, t: MessageTranslator): string {
  return template.meta.nameKey ? t(template.meta.nameKey) : template.meta.name;
}

/** 模板说明，规则同显示名。 */
export function resolveTemplateDescription(
  template: RegisteredTemplate,
  t: MessageTranslator,
): string {
  return template.meta.descriptionKey ? t(template.meta.descriptionKey) : template.meta.description;
}

/** 参数标签，规则同显示名。 */
export function resolveFieldLabel(field: TemplateField, t: MessageTranslator): string {
  return field.labelKey ? t(field.labelKey) : field.label;
}

/** 参数补充说明，规则同显示名；字段本身没有说明时返回空串。 */
export function resolveFieldDescription(field: TemplateField, t: MessageTranslator): string {
  return field.descriptionKey ? t(field.descriptionKey) : (field.description ?? '');
}

/** 选项名，规则同显示名。 */
export function resolveOptionLabel(option: TemplateFieldOption, t: MessageTranslator): string {
  return option.labelKey ? t(option.labelKey) : option.label;
}

export function listBuiltinTemplates(): readonly RegisteredTemplate[] {
  return BUILTIN_TEMPLATES;
}

export function getBuiltinTemplateById(id: string): RegisteredTemplate | undefined {
  return BUILTIN_TEMPLATES.find((template) => template.meta.id === id);
}

export function getBuiltinTemplateSchema(id: string): TemplateSchema | undefined {
  return getBuiltinTemplateById(id)?.schema;
}

/** 解析模板：任何非法 ID 都回退到默认模板，保证预览始终有可渲染目标。 */
export function resolveBuiltinTemplate(id?: string): RegisteredTemplate {
  return (id ? getBuiltinTemplateById(id) : undefined) ?? BUILTIN_TEMPLATES[0];
}

/**
 * 字段条件显示：未声明 `visibleWhen` 时始终可见。
 *
 * 属性面板（决定渲染哪些控件）与预设摘要（决定说明里写哪些行）共用同一条规则，
 * 避免两处各写一遍导致摘要里出现当前模式根本用不到的项。
 */
export function isTemplateFieldVisible(
  field: TemplateField,
  value: Record<string, unknown>,
): boolean {
  if (!field.visibleWhen) {
    return true;
  }

  const current = value[field.visibleWhen.key];
  return typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean'
    ? field.visibleWhen.equals.includes(current)
    : false;
}

/**
 * 按 schema 归一化单个字段值。
 *
 * 数值截断到 `min` / `max`，select 校验选项合法性，
 * 类型不符或缺失时回退到字段自带的 `default`。
 */
export function normalizeFieldValue(field: TemplateField, value: unknown): unknown {
  if (field.type === 'number') {
    const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
    if (!Number.isFinite(numeric)) {
      return field.default;
    }

    const min = field.min ?? Number.NEGATIVE_INFINITY;
    const max = field.max ?? Number.POSITIVE_INFINITY;
    return Math.min(Math.max(numeric, min), max);
  }

  if (field.type === 'select') {
    return typeof value === 'string' && field.options.some((option) => option.value === value)
      ? value
      : field.default;
  }

  if (field.type === 'color') {
    return typeof value === 'string' && value.trim() !== '' ? value : field.default;
  }

  if (field.type === 'boolean') {
    return typeof value === 'boolean' ? value : field.default;
  }

  // 余下只有 text：非字符串一律回落默认值
  return typeof value === 'string' ? value : field.default;
}

/**
 * 按 schema 归一化一整套参数：补齐缺失字段并校正越界值。
 *
 * 预览渲染与导出前都经过这里，因此模板组件永远拿到完整、合法的参数。
 */
export function normalizeParams(
  schema: TemplateSchema,
  stored?: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};

  for (const field of schema.fields) {
    next[field.key] = normalizeFieldValue(field, stored?.[field.key]);
  }

  return next;
}

/** 取 schema 的默认参数集合。 */
export function getDefaultParams(schema: TemplateSchema): Record<string, unknown> {
  return normalizeParams(schema);
}
