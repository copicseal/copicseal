import { defineTemplate } from './define-template';
import { formatExifText } from './format-exif-text';
import type {
  RegisteredTemplate,
  TemplateField,
  TemplateInjectedProps,
  TemplateParams,
} from './types';

/**
 * Film 的参数声明：以边框为核心，没有 Minimal 的排版方向参数，
 * 用来验证不同模板的 schema 彼此完全独立。
 */
const filmFields = [
  {
    key: 'frameWidth',
    label: '边框宽度',
    description: '图片四周留白宽度，单位为像素。',
    type: 'number',
    default: 28,
    min: 0,
    max: 120,
    step: 2,
  },
  { key: 'frameColor', label: '边框颜色', type: 'color', default: '#f5f2ec' },
  { key: 'textColor', label: '文字颜色', type: 'color', default: '#3b3630' },
  { key: 'fontScale', label: '字体缩放', type: 'number', default: 1, min: 0.8, max: 2, step: 0.1 },
  { key: 'cornerLabel', label: '角标文字', type: 'text', default: '{Model}' },
  {
    key: 'caption',
    label: '底栏文案',
    type: 'text',
    default: '{FocalLength}  {FNumber}  {ExposureTime}  ISO {ISO}',
  },
] as const satisfies readonly TemplateField[];

type FilmParams = TemplateParams<typeof filmFields>;

/** 给十六进制颜色附加透明度；非十六进制输入时保持原值，避免拼出非法 CSS。 */
function withAlpha(color: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alpha}` : color;
}

/** 胶片模板：宽边框 + 角标 + 底栏信息，边框宽度与颜色都由 schema 驱动。 */
function Film({
  photoUrl,
  exif,
  frameWidth,
  frameColor,
  textColor,
  fontScale,
  cornerLabel,
  caption,
}: TemplateInjectedProps & FilmParams) {
  const cornerText = formatExifText(cornerLabel, exif);
  const captionText = formatExifText(caption, exif);

  return (
    <div
      className="inline-block bg-white"
      style={{ backgroundColor: frameColor, padding: frameWidth }}
    >
      <div className="relative">
        <img src={photoUrl} alt="" className="block max-h-[58vh] max-w-full object-contain" />
        {cornerText ? (
          <span
            className="absolute top-2 left-2 px-1.5 py-0.5 font-mono tracking-[0.2em]"
            style={{
              fontSize: 10 * fontScale,
              color: textColor,
              backgroundColor: withAlpha(frameColor, 'cc'),
            }}
          >
            {cornerText}
          </span>
        ) : null}
      </div>
      <div
        className="flex items-end justify-between gap-4"
        style={{ marginTop: frameWidth * 0.5, color: textColor }}
      >
        <span className="font-mono tracking-[0.35em]" style={{ fontSize: 9 * fontScale }}>
          FILM
        </span>
        {captionText ? (
          <span className="text-right font-mono" style={{ fontSize: 11 * fontScale }}>
            {captionText}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const FILM_TEMPLATE: RegisteredTemplate = defineTemplate({
  meta: {
    id: 'film',
    name: 'Film',
    description: '胶片风格宽边框，带角标与底栏拍摄信息。',
    tags: ['胶片', '边框'],
  },
  fields: filmFields,
  component: Film,
});
