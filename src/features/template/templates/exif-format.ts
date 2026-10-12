import type {
  ExifData,
  ExifFieldMapping,
  ExifGpsFormat,
  ExifMappingField,
  ExifSettings,
} from '@/platform';
import { DEFAULT_EXIF_MAPPINGS, EXIF_DATE_DEFAULT } from '@/shared/lib/exif-defaults';

export { DEFAULT_EXIF_MAPPINGS, EXIF_DATE_DEFAULT };

/**
 * EXIF 显示口径的纯函数与默认值。
 *
 * 这里只做「值 → 展示字符串」的转换，不碰 React、不读全局状态：模板渲染、EXIF 信息卡片
 * 与设置页的示例预览都用同一套函数，保证三处口径一致。
 */

/** EXIF 设置的默认值：新装用户与「恢复默认」都拿到这张表。 */
export const DEFAULT_EXIF_SETTINGS: ExifSettings = {
  date_format: EXIF_DATE_DEFAULT,
  gps_format: 'letter',
  focal_length_35mm: false,
  mappings: [...DEFAULT_EXIF_MAPPINGS],
};

/**
 * 生效的映射表。
 *
 * `mappings` 是数组就用它——**显式的空数组表示「不做任何映射」**，这是用户可以主动选的
 * 状态（删光所有条目即可）。只有键整个缺失（老配置、整对象替换的 Web 端存储）才回落到
 * 内置表，与 Rust 侧 `ExifConfig::default()` 的默认值保持一致。
 */
export function effectiveMappings(
  settings?: Partial<ExifSettings> | null,
): readonly ExifFieldMapping[] {
  return Array.isArray(settings?.mappings) ? settings.mappings : DEFAULT_EXIF_MAPPINGS;
}

/** 补齐配置缺字段的情况：老配置里没有 `exif`，或只有其中几项。 */
export function normalizeExifSettings(settings?: Partial<ExifSettings> | null): ExifSettings {
  return {
    date_format: settings?.date_format?.trim() || EXIF_DATE_DEFAULT,
    gps_format: settings?.gps_format === 'chinese' ? 'chinese' : 'letter',
    focal_length_35mm: Boolean(settings?.focal_length_35mm),
    mappings: [...effectiveMappings(settings)],
  };
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * 拍摄时间解析（宽容）。
 *
 * 两个读取器给的写法不同：Rust 侧（`exif` crate）是 `2024-01-15 14:30:00`，
 * Web 侧（ExifTool）是 `2024:01:15 14:30:00`；部分文件还带 `T` 分隔符、子秒或时区后缀。
 * 只取到秒，其余部分忽略；解析不出来时调用方原样展示。
 */
function parseExifDate(raw: string): DateParts | null {
  const match = /^(\d{4})[-:](\d{1,2})[-:](\d{1,2})[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/.exec(
    raw.trim(),
  );
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: match[6] ? Number(match[6]) : 0,
  };
}

/** 占位符按「长的排前面」匹配，否则 `YYYY` 会被 `YY` 吃掉一半。 */
const DATE_PATTERN = /YYYY|YY|MM|DD|HH|mm|ss|M|D|H|m|s/g;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function fillDateToken(token: string, parts: DateParts): string {
  switch (token) {
    case 'YYYY':
      return pad(parts.year, 4);
    case 'YY':
      return pad(parts.year % 100);
    case 'MM':
      return pad(parts.month);
    case 'M':
      return String(parts.month);
    case 'DD':
      return pad(parts.day);
    case 'D':
      return String(parts.day);
    case 'HH':
      return pad(parts.hour);
    case 'H':
      return String(parts.hour);
    case 'mm':
      return pad(parts.minute);
    case 'm':
      return String(parts.minute);
    case 'ss':
      return pad(parts.second);
    default:
      return String(parts.second);
  }
}

/**
 * 按用户给的格式串输出拍摄时间。
 *
 * 格式串里非占位符的字符原样保留（`YYYY年MM月DD日` 这类写法直接可用）；
 * 源串解析不出来时原样返回，宁可显示原始值也不吞掉内容。
 */
export function formatExifDate(raw: string | null | undefined, pattern: string): string {
  const value = (raw ?? '').trim();
  if (!value) {
    return '';
  }

  const parts = parseExifDate(value);
  if (!parts) {
    return value;
  }

  return pattern.replace(DATE_PATTERN, (token) => fillDateToken(token, parts));
}

export type ExifAxis = 'latitude' | 'longitude';

const HEMISPHERE_LETTER: Record<ExifAxis, [string, string]> = {
  latitude: ['N', 'S'],
  longitude: ['E', 'W'],
};

const HEMISPHERE_CHINESE: Record<ExifAxis, [string, string]> = {
  latitude: ['北纬', '南纬'],
  longitude: ['东经', '西经'],
};

/**
 * 经纬度展示：度数+半球字母（6 位小数）或度数+中文（度分秒）。
 *
 * 中文档的秒四舍五入后要把进位带回分与度，否则会出现 `121°59'60"` 这种写法。
 */
export function formatExifCoordinate(
  value: number | null | undefined,
  axis: ExifAxis,
  format: ExifGpsFormat,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '';
  }

  const positive = value >= 0;
  const absolute = Math.abs(value);
  const index = positive ? 0 : 1;

  if (format !== 'chinese') {
    return `${absolute.toFixed(6)}°${HEMISPHERE_LETTER[axis][index]}`;
  }

  let degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  let minutes = Math.floor(minutesFloat);
  let seconds = Math.round((minutesFloat - minutes) * 60);
  if (seconds === 60) {
    seconds = 0;
    minutes += 1;
  }
  if (minutes === 60) {
    minutes = 0;
    degrees += 1;
  }

  return `${HEMISPHERE_CHINESE[axis][index]} ${degrees}°${pad(minutes)}'${pad(seconds)}"`;
}

/** 经纬度成对展示（「EXIF 信息」卡片那一行），如 `31.230278°N, 121.473889°E`。 */
export function formatExifGpsPair(exif: ExifData | null, format: ExifGpsFormat): string | null {
  if (!exif || exif.latitude === null || exif.longitude === null) {
    return null;
  }

  const latitude = formatExifCoordinate(exif.latitude, 'latitude', format);
  const longitude = formatExifCoordinate(exif.longitude, 'longitude', format);
  return latitude && longitude ? `${latitude}, ${longitude}` : null;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 词边界只在片段自身以词字符开头/结尾时才加。
 *
 * 像 `ILCE-` 这种以 `-` 收尾的片段，硬加 `\b` 会因为前后都是非词字符而永远匹配不上。
 */
function matchPattern(match: string): RegExp {
  const prefix = /^\w/.test(match) ? '\\b' : '';
  const suffix = /\w$/.test(match) ? '\\b' : '';
  return new RegExp(`${prefix}${escapeRegExp(match)}${suffix}`, 'i');
}

/**
 * 按映射表改写一个字段的显示值。
 *
 * 同一字段首个命中生效；`replace` 为空串表示删除该片段（顺手收掉多余空格，
 * 避免 `Canon EOS R5` 变成 ` EOS R5`）；没命中就原样返回——表是唯一口径，
 * 删掉某条内置映射就能恢复原始写法。
 */
export function applyExifMapping(
  value: string | null | undefined,
  field: ExifMappingField,
  mappings: readonly ExifFieldMapping[],
): string {
  const raw = (value ?? '').trim();
  if (!raw) {
    return '';
  }

  for (const rule of mappings) {
    if (rule.field !== field) {
      continue;
    }

    // 不能 trim 掉 match：内置规则里 `NIKON Z ` 末尾那个空格是有意的
    //（`NIKON Z 6` → `ℤ6`，去掉空格会变成 `ℤ 6`），只用 trim 判断本条是否为空
    const match = rule.match;
    if (!match.trim() || !matchPattern(match).test(raw)) {
      continue;
    }

    return raw
      .replace(new RegExp(escapeRegExp(match), 'i'), rule.replace)
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  return raw;
}

/**
 * 焦距展示：开关打开且原图有等效 35mm 值时用它，否则用普通焦距。
 *
 * 两个来源形状不同：普通焦距读出来就是 `122mm` 这样的字符串，等效焦段是数字。
 */
export function formatExifFocalLength(exif: ExifData | null, use35mm: boolean): string {
  if (!exif) {
    return '';
  }

  if (use35mm && typeof exif.focal_length_35mm === 'number') {
    return `${exif.focal_length_35mm}mm`;
  }

  return (exif.focal_length ?? '').trim();
}
