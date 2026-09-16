import {
  BUILTIN_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  type RegisteredTemplate,
  type TemplateField,
  type TemplateSchema,
} from '@/features/template/templates';

export { DEFAULT_TEMPLATE_ID };

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
