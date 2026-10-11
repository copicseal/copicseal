import type * as ReactNS from 'react';

/**
 * Copicseal 远程模板 SDK —— 作者可见的类型。
 *
 * 这些类型与宿主 `src/features/template/templates/types.ts` 对齐；
 * 打包时 `jsxImportSource` 指向本包，命名空间取值由宿主注入。
 */

/** 宿主读取到的 EXIF（字段与 `src/platform/contracts` 的 ExifData 对齐）。 */
export interface ExifData {
  make: string | null;
  model: string | null;
  lens_model: string | null;
  aperture: string | null;
  shutter_speed: string | null;
  iso: string | null;
  focal_length: string | null;
  exposure_compensation: string | null;
  date_taken: string | null;
  white_balance: string | null;
  metering_mode: string | null;
  latitude: number | null;
  longitude: number | null;
  image_width: number | null;
  image_height: number | null;
}

/** 框架注入的渲染输入：用户不可编辑，模板直接消费。 */
export interface TemplateInjectedProps {
  /** 当前照片的可用 URL（预览或导出源） */
  photoUrl: string;
  /** 当前照片的 EXIF；未读取到时为 null */
  exif: ExifData | null;
  /** 用户选择的字体族；空串表示跟随模板自带的字体栈 */
  font: string;
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
  /** 参数键，与组件 props 字段一一对应 */
  key: TKey;
  /** 属性面板里的标签 */
  label: string;
  /** 可选说明 */
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

/** 单个可调参数的描述：类型、默认值、控件形态与校验规则都在这里。 */
export type TemplateField<TKey extends string = string> =
  | TemplateNumberField<TKey>
  | TemplateColorField<TKey>
  | TemplateTextField<TKey>
  | TemplateSelectField<TKey>
  | TemplateBooleanField<TKey>;

/** 由字段清单推导该参数的值类型。 */
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

/** 由字段清单推导模板参数对象类型。 */
export type TemplateParams<TFields extends readonly TemplateField[]> = {
  [TField in TFields[number] as TField['key']]: TemplateFieldValue<TField>;
};

/** 单个模板可调参数的集合。 */
export interface TemplateSchema {
  fields: readonly TemplateField[];
}

/** 框架级背景参数（与宿主 `background.ts` 的字段清单对齐）。 */
export interface TemplateBackground {
  mode: 'none' | 'color' | 'image';
  color: string;
  blur: number;
  brightness: number;
  paddingHorizontal: number;
  paddingVertical: number;
}

/** 注册表统一视图：模板自带的元信息、schema、默认值与渲染函数。 */
export interface RegisteredTemplate {
  meta: TemplateMeta;
  schema: TemplateSchema;
  backgroundDefaults?: Partial<TemplateBackground>;
  fontDefaults?: string;
  render: (props: TemplateInjectedProps & Record<string, unknown>) => ReactNS.ReactNode;
}

export interface TemplateDefinitionInput<TFields extends readonly TemplateField[]> {
  meta: TemplateMeta;
  fields: TFields;
  backgroundDefaults?: Partial<TemplateBackground>;
  fontDefaults?: string;
  component: ReactNS.ComponentType<TemplateInjectedProps & TemplateParams<TFields>>;
}

/**
 * 定义一个模板。
 *
 * @example
 * ```tsx
 * export default defineTemplate({ meta: { id: 'stamp', name: '复古邮票', description: '…' }, fields, component: Stamp });
 * ```
 */
export declare function defineTemplate<const TFields extends readonly TemplateField[]>(
  input: TemplateDefinitionInput<TFields>,
): RegisteredTemplate;

/** 模板文案里支持的 EXIF 变量（与宿主一致）。 */
export declare const EXIF_TEXT_VARIABLES: readonly { token: string; label: string }[];

/** 把 `{变量}` 替换成当前照片的 EXIF 值；已知变量缺失时替换为空串。 */
export declare function formatExifText(template: string, exif: ExifData | null): string;

/** 读取图片真实长宽比；`src` 变化时自动回退到 `fallback`。 */
export declare function useImageAspect(
  src: string,
  fallback?: number,
): {
  aspect: number;
  /** 直接挂到 `<img onLoad>` 上 */
  handleLoad: (event: ReactNS.SyntheticEvent<HTMLImageElement>) => void;
};

/** 品牌名规范化，例如 `SONY CORPORATION` → `Sony`。 */
export declare function normalizeBrand(make?: string | null): string;

/** 机型名规范化，例如 `ILCE-7M4` → `α7M4`。 */
export declare function normalizeModelName(model?: string | null): string;

/** 品牌单色 Logo 的 SVG 源码（`currentColor` 可上色）；未内置该品牌时为 null。 */
export declare function getBrandLogoSvg(make?: string | null, model?: string | null): string | null;

/** 品牌彩色 Logo 的资源地址；未内置该品牌时为 null。 */
export declare function getBrandLogoUrl(make?: string | null, model?: string | null): string | null;

/** 宿主 React 命名空间。 */
export declare const React: typeof ReactNS;

/** 宿主注入的完整 SDK 面（打包入口的入参）。 */
export interface RemoteTemplateSdk {
  abi: 1;
  reactMajor: number;
  React: typeof ReactNS;
  jsx: typeof import('react/jsx-runtime').jsx;
  jsxs: typeof import('react/jsx-runtime').jsxs;
  Fragment: typeof import('react/jsx-runtime').Fragment;
  defineTemplate: typeof defineTemplate;
  formatExifText: typeof formatExifText;
  EXIF_TEXT_VARIABLES: typeof EXIF_TEXT_VARIABLES;
  normalizeBrand: typeof normalizeBrand;
  normalizeModelName: typeof normalizeModelName;
  getBrandLogoSvg: typeof getBrandLogoSvg;
  getBrandLogoUrl: typeof getBrandLogoUrl;
  useImageAspect: typeof useImageAspect;
  /** 清单里的 assets[].path → 本机可用 URL */
  resolveAsset: (path: string) => string;
  registryId: string;
  templateId: string;
}

/** 模板包默认导出：宿主用它拿到模板定义。 */
export type RemoteTemplateFactory = (sdk: RemoteTemplateSdk) => RegisteredTemplate;

/** 由打包入口调用的绑定函数（作者一般不需要直接用）。 */
export declare function __bindSdk(sdk: RemoteTemplateSdk): void;
