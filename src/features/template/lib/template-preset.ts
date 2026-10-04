import type { TemplatePreset } from '@/platform/contracts';
import type { TemplateBackground } from '../background';
import { resolveTemplateBackground, TEMPLATE_BACKGROUND_FIELDS } from '../background';
import {
  getBuiltinTemplateById,
  isTemplateFieldVisible,
  normalizeParams,
} from '../runtime/template-registry';
import type { TemplateField } from '../templates';

/** 预设数量上限，与旧版一致：超出后只能先删再存。 */
export const MAX_TEMPLATE_PRESETS = 10;

/** 名称长度限制：新建与改名走同一套校验。 */
export const TEMPLATE_PRESET_NAME_MIN = 2;
export const TEMPLATE_PRESET_NAME_MAX = 20;

/**
 * 预设要复用的那部分配置。
 *
 * 导出档位刻意不在其中：档位是「这批图怎么输出」，与「这套样式长什么样」是
 * 两件事，混在一起会让应用预设时冲掉用户已经调好的输出尺寸。
 */
export interface TemplatePresetContent {
  templateId: string;
  params: Record<string, unknown>;
  background: TemplateBackground;
  /** 字体族名；空串表示跟随框架默认（模板自带的字体栈） */
  font: string;
}

/** 会话内的预设视图，字段已按当前版本的模板 schema 归一。 */
export interface TemplatePresetRecord extends TemplatePresetContent {
  id: string;
  name: string;
  /** 保存时生成的摘要，设置页的展开行直接用这段文字 */
  description: string;
  /** 模板在当前版本里的显示名；模板已被移除时为 null，此时预设不可应用 */
  templateName: string | null;
}

let presetSeq = 0;

/**
 * 预设 id。
 *
 * 不只用自增序号：序号每次启动都从 0 开始，而 id 是要落库的，
 * 跨会话就可能与既有预设撞号（撞号后「覆盖」会改到别人的条目上）。
 */
function nextTemplatePresetId(): string {
  presetSeq += 1;
  return `template-preset-${Date.now().toString(36)}-${presetSeq}`;
}

/** 名称校验：只做长度检查，前后空白由调用方先裁掉。 */
export function isValidPresetName(name: string): boolean {
  return name.length >= TEMPLATE_PRESET_NAME_MIN && name.length <= TEMPLATE_PRESET_NAME_MAX;
}

/** 模板被移除后预设不可应用，但仍要能删掉或覆盖。 */
export function isPresetUsable(preset: TemplatePresetRecord): boolean {
  return preset.templateName !== null;
}

function describeFields(fields: readonly TemplateField[], value: Record<string, unknown>): string {
  return fields
    .filter((field) => isTemplateFieldVisible(field, value))
    .map((field) => {
      const current = value[field.key];
      const text =
        current === undefined || current === null || current === '' ? '—' : String(current);
      return `- ${field.label}: ${text}`;
    })
    .join('\n');
}

/**
 * 生成预设摘要。
 *
 * 摘要只是给设置页看的说明文字，应用预设时一律以结构化的
 * `params` / `background` 为准，因此这里不必也不该做任何归一化。
 */
export function buildTemplatePresetDescription(record: TemplatePresetContent): string {
  const template = getBuiltinTemplateById(record.templateId);
  const backgroundMode =
    TEMPLATE_BACKGROUND_FIELDS.find((field) => field.key === 'mode')?.options.find(
      (option) => option.value === record.background.mode,
    )?.label ?? record.background.mode;

  const lines = [`模板: ${template?.meta.name ?? record.templateId}`];

  if (template) {
    lines.push('模板参数:', describeFields(template.schema.fields, record.params));
  }

  lines.push('背景:', `- 模式: ${backgroundMode}`);
  if (record.background.mode !== 'none') {
    lines.push(
      describeFields(
        TEMPLATE_BACKGROUND_FIELDS.filter((field) => field.key !== 'mode'),
        { ...record.background },
      ),
    );
  }

  return lines.join('\n');
}

/** 新建预设（按当前照片配置抓取）：调用方负责写库与更新 store。 */
export function createTemplatePresetRecord(
  name: string,
  content: TemplatePresetContent,
): TemplatePresetRecord {
  return {
    ...structuredClone(content),
    id: nextTemplatePresetId(),
    name,
    description: buildTemplatePresetDescription(content),
    templateName: getBuiltinTemplateById(content.templateId)?.meta.name ?? null,
  };
}

/**
 * 用一组新样式覆盖已有预设。
 *
 * id、名称与在列表里的位置保持不变；摘要与模板名重算——覆盖时可能连带换了模板，
 * 沿用旧值会让一条已经修好的预设继续显示「模板已失效」。
 */
export function overwriteTemplatePresetRecord(
  preset: TemplatePresetRecord,
  content: TemplatePresetContent,
): TemplatePresetRecord {
  return {
    ...preset,
    ...structuredClone(content),
    description: buildTemplatePresetDescription(content),
    templateName: getBuiltinTemplateById(content.templateId)?.meta.name ?? null,
  };
}

/** 会话预设 → 配置里的持久化结构。 */
export function toTemplatePreset(record: TemplatePresetRecord): TemplatePreset {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    template_id: record.templateId,
    template_props: record.params,
    background: { ...record.background },
    font: record.font,
  };
}

/**
 * 配置里的预设 → 会话预设。
 *
 * 配置是过去某个版本写下的：模板可能已被移除、参数可能缺字段或越界，
 * 因此这里按模板 schema 补齐参数、按背景字段收敛背景。模板已不存在的
 * 预设保留原始参数（改名/删除仍然可用），只是不允许应用。
 */
export function parseTemplatePresets(list: readonly TemplatePreset[]): TemplatePresetRecord[] {
  return list.map((preset) => {
    const template = getBuiltinTemplateById(preset.template_id);
    const params = template
      ? normalizeParams(template.schema, preset.template_props)
      : { ...preset.template_props };

    return {
      id: preset.id || nextTemplatePresetId(),
      name: preset.name,
      description: preset.description,
      templateId: preset.template_id,
      params,
      background: resolveTemplateBackground(preset.background as Partial<TemplateBackground>),
      font: preset.font ?? '',
      templateName: template?.meta.name ?? null,
    };
  });
}
