import type { ExifData, ExifSettings } from '@/platform';
import type { MessageKey } from '@/shared/i18n';
import {
  applyExifMapping,
  effectiveMappings,
  formatExifCoordinate,
  formatExifDate,
  formatExifFocalLength,
  formatExifGpsPair,
  normalizeExifSettings,
} from './exif-format';

/** 模板文案中支持的内置 EXIF 变量，同时用于属性面板提示与「按模板用到的字段」编辑。 */
/** 可被用户改写的 EXIF 字段（只含模板变量用到的字符串字段）。 */
export type ExifOverrideField =
  | 'make'
  | 'model'
  | 'lens_model'
  | 'focal_length'
  | 'aperture'
  | 'shutter_speed'
  | 'iso'
  | 'date_taken'
  // GPS：ExifData 里是 number，改动值仍按字符串存（用户输入），合并时再转数值
  | 'latitude'
  | 'longitude';

export interface ExifVariable {
  token: string;
  /** 对应的 ExifData 字段名，改动值按键覆盖 */
  field: ExifOverrideField;
  label: string;
  /** 变量名的文案 key；界面优先用它，缺省回落到 `label` 字面量 */
  labelKey?: MessageKey;
}

export const EXIF_TEXT_VARIABLES: readonly ExifVariable[] = [
  {
    token: '{Make}',
    field: 'make',
    label: '相机品牌',
    labelKey: 'template.meta.exifVariable.make',
  },
  {
    token: '{Model}',
    field: 'model',
    label: '相机型号',
    labelKey: 'template.meta.exifVariable.model',
  },
  {
    token: '{LensModel}',
    field: 'lens_model',
    label: '镜头型号',
    labelKey: 'template.meta.exifVariable.lensModel',
  },
  {
    token: '{FocalLength}',
    field: 'focal_length',
    label: '焦距',
    labelKey: 'template.meta.exifVariable.focalLength',
  },
  {
    token: '{FNumber}',
    field: 'aperture',
    label: '光圈',
    labelKey: 'template.meta.exifVariable.fNumber',
  },
  {
    token: '{ExposureTime}',
    field: 'shutter_speed',
    label: '快门',
    labelKey: 'template.meta.exifVariable.exposureTime',
  },
  { token: '{ISO}', field: 'iso', label: '感光度', labelKey: 'template.meta.exifVariable.iso' },
  {
    token: '{Latitude}',
    field: 'latitude',
    label: '纬度',
    labelKey: 'template.meta.exifVariable.latitude',
  },
  {
    token: '{Longitude}',
    field: 'longitude',
    label: '经度',
    labelKey: 'template.meta.exifVariable.longitude',
  },
  {
    token: '{DateTaken}',
    field: 'date_taken',
    label: '拍摄时间',
    labelKey: 'template.meta.exifVariable.dateTaken',
  },
];

/** 用户改动值：按照片存，键是 EXIF 字段名。 */
export type ExifOverrides = Partial<Record<ExifOverrideField, string>>;

const EMPTY_EXIF: ExifData = {
  make: null,
  model: null,
  lens_model: null,
  aperture: null,
  shutter_speed: null,
  iso: null,
  focal_length: null,
  exposure_compensation: null,
  date_taken: null,
  white_balance: null,
  metering_mode: null,
  latitude: null,
  longitude: null,
  image_width: null,
  image_height: null,
  orientation: null,
  exposure_program: null,
  flash: null,
  focal_length_35mm: null,
  max_aperture: null,
  software: null,
  artist: null,
  copyright: null,
  body_serial: null,
  lens_serial: null,
  gps_altitude: null,
};

/**
 * 合并「解析到的 EXIF」与「用户改动值」：改动值优先。
 *
 * 与旧版 `outputExif = { ...state.exif, ...modifiedExif }` 一致；没有改动值时直接返回原对象，
 * 保持引用稳定（渲染侧可以安全地按引用比较）。
 */
export function resolveOutputExif(
  exif: ExifData | null,
  overrides: ExifOverrides | undefined,
): ExifData | null {
  if (!overrides || Object.keys(overrides).length === 0) {
    return exif;
  }

  const next: ExifData = { ...(exif ?? EMPTY_EXIF) };

  for (const variable of EXIF_TEXT_VARIABLES) {
    const raw = overrides[variable.field];
    if (raw === undefined) {
      continue;
    }

    switch (variable.field) {
      case 'latitude':
      case 'longitude': {
        // 数值字段：用户填的字符串在这里转回 number，空串或非法输入按「清空」处理
        const parsed = Number(raw.trim());
        next[variable.field] = raw.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
        break;
      }
      default:
        next[variable.field] = raw;
    }
  }

  return next;
}

/**
 * 模板参数值里写到了哪些 EXIF 变量（按变量表顺序返回，便于界面稳定排列）。
 *
 * 只处理文案变量这条来源：模板**结构上**直读 EXIF 的情况（品牌 logo 取 Make/Model）
 * 由 `lib/used-exif-fields.ts` 的运行时探测负责，两处结果在卡片里取并集。
 */
export function collectUsedExifTokens(params: Record<string, unknown>): string[] {
  const used = new Set<string>();

  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      for (const match of value.matchAll(TOKEN_PATTERN)) {
        if (KNOWN_TOKENS.has(match[0])) {
          used.add(match[0]);
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    if (value && typeof value === 'object') {
      for (const item of Object.values(value)) {
        visit(item);
      }
    }
  };

  visit(params);

  return EXIF_TEXT_VARIABLES.map((variable) => variable.token).filter((token) => used.has(token));
}

const TOKEN_PATTERN = /\{([A-Za-z]+)\}/g;
const KNOWN_TOKENS = new Set<string>(EXIF_TEXT_VARIABLES.map((variable) => variable.token));

/** 读取单个变量对应的 EXIF 值（按设置格式化），未知变量返回 null。 */
function resolveToken(token: string, exif: ExifData, settings: ExifSettings): string | null {
  const variable = EXIF_TEXT_VARIABLES.find((item) => item.token === token);
  if (!variable) {
    return null;
  }

  const mappings = effectiveMappings(settings);

  switch (variable.field) {
    case 'make':
      return applyExifMapping(exif.make, 'make', mappings) || null;
    case 'model':
      return applyExifMapping(exif.model, 'model', mappings) || null;
    case 'lens_model':
      return applyExifMapping(exif.lens_model, 'lens_model', mappings) || null;
    case 'date_taken':
      return formatExifDate(exif.date_taken, settings.date_format) || null;
    case 'latitude':
      return exif.latitude === null
        ? null
        : formatExifCoordinate(exif.latitude, 'latitude', settings.gps_format);
    case 'longitude':
      return exif.longitude === null
        ? null
        : formatExifCoordinate(exif.longitude, 'longitude', settings.gps_format);
    case 'focal_length':
      return formatExifFocalLength(exif, settings.focal_length_35mm) || null;
    default: {
      // 剩下的都是字符串字段（数值型的经纬度与焦距已在上面的分支处理）
      return exif[variable.field];
    }
  }
}

/**
 * 把模板文案里的 `{变量}` 替换成当前照片的 EXIF 值。
 *
 * - 已知变量在字段缺失或未读取到 EXIF 时替换为空串，避免导出结果残留 `{Make}` 这类占位符；
 * - 未知变量原样保留，方便模板作者发现拼写错误；
 * - 替换后合并多余空格并去掉首尾空白，避免空字段在版面上留下大段空隙；
 * - 时间/经纬度/机型品牌按「设置 → 边框水印 → EXIF」里的口径输出。
 */
export function formatExifText(
  template: string,
  exif: ExifData | null,
  settings?: ExifSettings | null,
): string {
  const resolved = normalizeExifSettings(settings);
  const replaced = template.replace(TOKEN_PATTERN, (token) => {
    if (!KNOWN_TOKENS.has(token)) {
      return token;
    }
    return exif ? (resolveToken(token, exif, resolved) ?? '') : '';
  });

  return replaced.replace(/\s{2,}/g, ' ').trim();
}

/**
 * 渲染期用的 EXIF 格式化器：把设置与当前照片绑在一起，模板只调用方法、不关心口径。
 *
 * 由 `TemplateRuntime` 每张照片构造一次并随注入 props 传给模板；「EXIF 信息」卡片
 * 也用它，保证照片上的文字与卡片显示的是同一个值。
 */
export interface ExifFormatter {
  /** 生效后的设置（缺字段已补齐），设置页示例预览也会用 */
  settings: ExifSettings;
  /** 把文案里的 `{变量}` 换成格式化后的值 */
  text(template: string): string;
  /** logo 旁的品牌名（走映射表） */
  brand(): string;
  /** logo 旁的机型名（走映射表） */
  model(): string;
  /** 拍摄时间（按格式串） */
  date(): string;
  /** 经纬度成对展示，任一为空时返回 null */
  gps(): string | null;
}

export function createExifFormatter(
  settings: ExifSettings | null | undefined,
  exif: ExifData | null,
): ExifFormatter {
  const resolved = normalizeExifSettings(settings);
  const mappings = effectiveMappings(resolved);

  return {
    settings: resolved,
    text: (template) => formatExifText(template, exif, resolved),
    brand: () => applyExifMapping(exif?.make, 'make', mappings),
    model: () => applyExifMapping(exif?.model, 'model', mappings),
    date: () => formatExifDate(exif?.date_taken, resolved.date_format),
    gps: () => formatExifGpsPair(exif, resolved.gps_format),
  };
}
