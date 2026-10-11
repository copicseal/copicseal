/**
 * 宿主侧对模板定义的形状校验。
 *
 * 与 SDK 垫片是两回事：那里是作者运行时的入口，这里是**宿主**拿到
 * `factory(sdk)` 的返回值之后要做的自检。预览页与打包校验脚本共用这一份，
 * 避免「预览能过、宿主校验却更严/更松」的漂移。
 *
 * 未来会搬到 `src/features/template/remote/validate.ts`（宿主实现）。
 */

const FIELD_TYPES = ['number', 'color', 'select', 'text', 'boolean'];
const ID_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * 校验模板定义。
 *
 * @param {unknown} definition 工厂返回值
 * @param {{ registryId?: string; templateId?: string }} [context]
 * @returns {{ warnings: string[] }} 通过时返回警告列表（非致命问题）
 * @throws {Error} 结构性错误
 */
export function assertTemplateDefinition(definition, context = {}) {
  const where = context.templateId ? `模板「${context.templateId}」` : '模板';

  if (!definition || typeof definition !== 'object') {
    throw new Error(`${where}的工厂没有返回对象`);
  }

  const { meta, schema, render } = definition;

  if (!meta || typeof meta !== 'object') {
    throw new Error(`${where}缺少 meta`);
  }
  if (typeof meta.id !== 'string' || !ID_PATTERN.test(meta.id)) {
    throw new Error(`${where}的 meta.id 非法（只允许字母、数字、. _ -）：${String(meta.id)}`);
  }
  if (typeof meta.name !== 'string' || meta.name.trim() === '') {
    throw new Error(`${where}缺少 meta.name`);
  }
  if (typeof meta.description !== 'string') {
    throw new Error(`${where}的 meta.description 必须是字符串`);
  }
  if (context.templateId && meta.id !== context.templateId) {
    throw new Error(`${where}声明的 meta.id（${meta.id}）与清单不一致`);
  }

  if (!schema || !Array.isArray(schema.fields)) {
    throw new Error(`${where}缺少 schema.fields`);
  }

  const warnings = [];
  const seen = new Set();

  for (const field of schema.fields) {
    if (!field || typeof field !== 'object') {
      throw new Error(`${where}的字段项必须是对象`);
    }
    if (typeof field.key !== 'string' || field.key === '') {
      throw new Error(`${where}存在没有 key 的字段`);
    }
    if (seen.has(field.key)) {
      throw new Error(`${where}的字段 key 重复：${field.key}`);
    }
    seen.add(field.key);

    if (typeof field.label !== 'string' || field.label === '') {
      throw new Error(`${where}的字段 ${field.key} 缺少 label`);
    }
    if (!FIELD_TYPES.includes(field.type)) {
      throw new Error(`${where}的字段 ${field.key} 类型非法：${String(field.type)}`);
    }
    if (field.default === undefined) {
      throw new Error(`${where}的字段 ${field.key} 缺少 default`);
    }
    if (field.type === 'number' && typeof field.default !== 'number') {
      throw new Error(`${where}的字段 ${field.key} 的 default 必须是数字`);
    }
    if (field.type === 'boolean' && typeof field.default !== 'boolean') {
      throw new Error(`${where}的字段 ${field.key} 的 default 必须是布尔值`);
    }
    if (field.type === 'select') {
      if (!Array.isArray(field.options) || field.options.length === 0) {
        throw new Error(`${where}的字段 ${field.key} 是 select，但没有 options`);
      }
      if (!field.options.some((option) => option.value === field.default)) {
        throw new Error(`${where}的字段 ${field.key} 的 default 不在 options 里`);
      }
    }
    if (
      field.visibleWhen &&
      !seen.has(field.visibleWhen.key) &&
      field.visibleWhen.key !== field.key
    ) {
      warnings.push(
        `字段 ${field.key} 的 visibleWhen 引用了尚未出现的字段 ${field.visibleWhen.key}`,
      );
    }
  }

  if (typeof render !== 'function') {
    throw new Error(`${where}缺少 render 函数`);
  }

  return { warnings };
}

/** 按 schema 取一份默认参数（预览与冒烟都用它）。 */
export function defaultParamsOf(definition) {
  const params = {};
  for (const field of definition.schema.fields) {
    params[field.key] = field.default;
  }
  return params;
}
