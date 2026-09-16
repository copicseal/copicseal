import { normalizeParams } from './runtime/template-registry';
import type { TemplateField, TemplateParams } from './templates/types';

/**
 * 背景的字段清单。
 *
 * 背景是框架级能力，与模板自身的参数体系相互独立：模板有没有自己的边框，
 * 都不影响这组字段的含义。这里沿用同一套字段描述，属性面板与模板参数共用生成器。
 */
export const TEMPLATE_BACKGROUND_FIELDS = [
  {
    key: 'mode',
    label: '背景模式',
    description: '无背景时画框贴合模板；有背景时画框等于目标尺寸，模板内嵌其中。',
    type: 'select',
    default: 'none',
    options: [
      { label: '无背景', value: 'none' },
      { label: '纯色背景', value: 'color' },
      { label: '照片模糊', value: 'image' },
    ],
  },
  {
    key: 'color',
    label: '背景颜色',
    type: 'color',
    default: '#ffffff',
    visibleWhen: { key: 'mode', equals: ['color'] },
  },
  {
    key: 'blur',
    label: '模糊强度',
    description: '相对画框宽度的比例。',
    type: 'number',
    default: 0.02,
    min: 0,
    max: 0.2,
    step: 0.005,
    visibleWhen: { key: 'mode', equals: ['image'] },
  },
  {
    key: 'brightness',
    label: '模糊图亮度',
    type: 'number',
    default: 1,
    min: 0,
    max: 2,
    step: 0.05,
    visibleWhen: { key: 'mode', equals: ['image'] },
  },
  {
    key: 'paddingHorizontal',
    label: '水平内边距',
    description: '相对画框宽度的比例。',
    type: 'number',
    default: 0.05,
    min: 0,
    max: 0.3,
    step: 0.005,
    visibleWhen: { key: 'mode', equals: ['color', 'image'] },
  },
  {
    key: 'paddingVertical',
    label: '垂直内边距',
    description: '同样以画框宽度为基准，因此不依赖画框高度。',
    type: 'number',
    default: 0.05,
    min: 0,
    max: 0.3,
    step: 0.005,
    visibleWhen: { key: 'mode', equals: ['color', 'image'] },
  },
] as const satisfies readonly TemplateField[];

/** 背景参数由字段清单推导，字段即唯一真相源。 */
export type TemplateBackground = TemplateParams<typeof TEMPLATE_BACKGROUND_FIELDS>;

/**
 * 合并模板自带的背景默认值，产出一份完整可用的背景参数。
 *
 * `normalizeParams` 的返回是擦除后的键值对，这里收敛为一次断言；
 * 因为类型本身由字段清单推导，不存在"字段与类型不一致"的漂移空间。
 */
export function resolveTemplateBackground(
  defaults?: Partial<TemplateBackground>,
): TemplateBackground {
  return normalizeParams({ fields: TEMPLATE_BACKGROUND_FIELDS }, defaults) as TemplateBackground;
}

/** 框架兜底背景：无背景。 */
export const DEFAULT_TEMPLATE_BACKGROUND = resolveTemplateBackground();

/**
 * 把属性面板产出的键值对收敛回背景参数。
 *
 * 属性面板只认 `Record<string, unknown>`，这里是唯一需要断言的地方；
 * 断言之后立刻按 schema 归一，越界值与非法选项都会被修正。
 */
export function toTemplateBackground(value: Record<string, unknown>): TemplateBackground {
  return resolveTemplateBackground(value as Partial<TemplateBackground>);
}
