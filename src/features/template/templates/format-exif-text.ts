import type { ExifData } from '@/platform';
import type { MessageKey } from '@/shared/i18n';

/** 模板文案中支持的内置 EXIF 变量，同时用于属性面板提示。 */
export const EXIF_TEXT_VARIABLES: readonly {
  token: string;
  label: string;
  /** 变量名的文案 key；界面优先用它，缺省回落到 `label` 字面量 */
  labelKey?: MessageKey;
}[] = [
  { token: '{Make}', label: '相机品牌', labelKey: 'template.meta.exifVariable.make' },
  { token: '{Model}', label: '相机型号', labelKey: 'template.meta.exifVariable.model' },
  { token: '{LensModel}', label: '镜头型号', labelKey: 'template.meta.exifVariable.lensModel' },
  { token: '{FocalLength}', label: '焦距', labelKey: 'template.meta.exifVariable.focalLength' },
  { token: '{FNumber}', label: '光圈', labelKey: 'template.meta.exifVariable.fNumber' },
  { token: '{ExposureTime}', label: '快门', labelKey: 'template.meta.exifVariable.exposureTime' },
  { token: '{ISO}', label: '感光度', labelKey: 'template.meta.exifVariable.iso' },
  { token: '{DateTaken}', label: '拍摄时间', labelKey: 'template.meta.exifVariable.dateTaken' },
];

const TOKEN_PATTERN = /\{([A-Za-z]+)\}/g;
const KNOWN_TOKENS = new Set(EXIF_TEXT_VARIABLES.map((variable) => variable.token));

/** 读取单个变量对应的 EXIF 值，未知变量返回 null。 */
function resolveToken(token: string, exif: ExifData): string | null {
  switch (token) {
    case '{Make}':
      return exif.make;
    case '{Model}':
      return exif.model;
    case '{LensModel}':
      return exif.lens_model;
    case '{FocalLength}':
      return exif.focal_length;
    case '{FNumber}':
      return exif.aperture;
    case '{ExposureTime}':
      return exif.shutter_speed;
    case '{ISO}':
      return exif.iso;
    case '{DateTaken}':
      return exif.date_taken;
    default:
      return null;
  }
}

/**
 * 把模板文案里的 `{变量}` 替换成当前照片的 EXIF 值。
 *
 * - 已知变量在字段缺失或未读取到 EXIF 时替换为空串，避免导出结果残留 `{Make}` 这类占位符；
 * - 未知变量原样保留，方便模板作者发现拼写错误；
 * - 替换后合并多余空格并去掉首尾空白，避免空字段在版面上留下大段空隙。
 */
export function formatExifText(template: string, exif: ExifData | null): string {
  const replaced = template.replace(TOKEN_PATTERN, (token) => {
    if (!KNOWN_TOKENS.has(token)) {
      return token;
    }
    return exif ? (resolveToken(token, exif) ?? '') : '';
  });

  return replaced.replace(/\s{2,}/g, ' ').trim();
}
