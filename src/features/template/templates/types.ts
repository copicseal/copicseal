import type { CSSProperties, ReactNode } from 'react';
import type { ExifData } from '@/platform';
import type { TemplateBackground } from '../background';

/**
 * 框架注入的渲染输入。
 *
 * 由 `TemplateRuntime` 提供，不属于 propsSchema，用户不可编辑；
 * 模板组件可以直接消费，但不能把它暴露成可调参数。
 */
export interface TemplateInjectedProps {
  photoUrl: string;
  exif: ExifData | null;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  tags?: string[];
}

export type TemplateFieldType = 'number' | 'color' | 'select' | 'text' | 'boolean';

export interface TemplateFieldOption {
  label: string;
  value: string;
}

interface TemplateFieldBase<TKey extends string> {
  /** 参数键，与模板组件消费的 props 字段一一对应 */
  key: TKey;
  /** 属性面板中展示的标签 */
  label: string;
  /** 可选补充说明，用于解释该参数的作用 */
  description?: string;
  /** 仅当同一表单内另一字段取到给定值之一时才显示 */
  visibleWhen?: { key: TKey; equals: readonly (string | number | boolean)[] };
}

export interface TemplateNumberField<TKey extends string> extends TemplateFieldBase<TKey> {
  type: 'number';
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface TemplateColorField<TKey extends string> extends TemplateFieldBase<TKey> {
  type: 'color';
  default: string;
}

export interface TemplateTextField<TKey extends string> extends TemplateFieldBase<TKey> {
  type: 'text';
  default: string;
}

export interface TemplateBooleanField<TKey extends string> extends TemplateFieldBase<TKey> {
  type: 'boolean';
  default: boolean;
}

export interface TemplateSelectField<TKey extends string> extends TemplateFieldBase<TKey> {
  type: 'select';
  default: string;
  options: readonly TemplateFieldOption[];
}

/**
 * 单个可调参数的描述。
 *
 * 类型、默认值、控件形态与校验范围全部集中在这里，
 * 属性面板只按它生成控件，不再维护手写表单。
 */
export type TemplateField<TKey extends string = string> =
  | TemplateNumberField<TKey>
  | TemplateColorField<TKey>
  | TemplateTextField<TKey>
  | TemplateSelectField<TKey>
  | TemplateBooleanField<TKey>;

/** 由字段描述推导该参数的值类型；`select` 取 `options` 的字面量联合。 */
export type TemplateFieldValue<TField extends TemplateField> = TField extends { type: 'number' }
  ? number
  : TField extends { type: 'color' }
    ? string
    : TField extends { type: 'text' }
      ? string
      : TField extends { type: 'boolean' }
        ? boolean
        : TField extends { options: readonly (infer TOption)[] }
          ? TOption extends { value: infer TValue }
            ? TValue
            : never
          : never;

/**
 * 由字段清单推导模板参数对象类型。
 *
 * 字段清单是参数的唯一真相源：组件 props 由它推导，属性面板也由它生成，
 * 因此「组件消费了未声明的参数」会在编译期报错，结构性漂移不再可能发生。
 */
export type TemplateParams<TFields extends readonly TemplateField[]> = {
  [TField in TFields[number] as TField['key']]: TemplateFieldValue<TField>;
};

/** 单个模板的可调参数描述集合。 */
export interface TemplateSchema {
  fields: readonly TemplateField[];
}

/**
 * 模板画布的内联样式。
 *
 * 除常规 CSS 属性外，还允许写入由 schema 参数派生的自定义变量
 * （如 `--co-frame-width`），供 `calc()` 在模板内部消费。
 */
export type TemplateStyle = CSSProperties & Record<`--${string}`, string | number>;

/**
 * 注册表统一视图。
 *
 * 泛型在 `defineTemplate` 内部一次性擦除：不同模板的参数集合互不兼容，
 * 只有先经 `normalizeParams` 按各自 schema 归一后，才能安全传入组件。
 */
export interface RegisteredTemplate {
  meta: TemplateMeta;
  schema: TemplateSchema;
  /**
   * 该模板推荐的默认背景。
   *
   * 背景是框架级能力，独立于模板自身的参数；模板只负责给出自己认为最佳的默认值，
   * 用户可以在属性面板覆盖。
   */
  backgroundDefaults?: Partial<TemplateBackground>;
  /**
   * 渲染模板。
   *
   * DOM 契约：呈现照片的那个 `<img>` 必须带 `data-co-photo`——框架靠它把缩放档位
   * 换算成照片的原始像素宽度，并在图片加载完成后重新解算尺寸。框架只按该句柄定位
   * 元素，不依赖类名或标签顺序。
   */
  render: (props: TemplateInjectedProps & Record<string, unknown>) => ReactNode;
}
