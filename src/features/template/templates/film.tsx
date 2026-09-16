import { defineTemplate } from './define-template';
import { formatExifText } from './format-exif-text';
import type {
  RegisteredTemplate,
  TemplateField,
  TemplateInjectedProps,
  TemplateParams,
  TemplateStyle,
} from './types';
import { useImageAspect } from './use-image-aspect';

/**
 * Film 的参数声明：以边框为核心，与 Minimal 的参数集合完全独立。
 * 数值字段同样是「相对画布宽度的比例」。
 */
const filmFields = [
  {
    key: 'frameWidth',
    label: '边框宽度',
    description: '相对画布宽度的比例，0.05 即约占画布宽度的 5%。',
    type: 'number',
    default: 0.05,
    min: 0,
    max: 0.2,
    step: 0.005,
  },
  { key: 'frameColor', label: '边框颜色', type: 'color', default: '#f5f2ec' },
  { key: 'textColor', label: '文字颜色', type: 'color', default: '#3b3630' },
  {
    key: 'fontScale',
    label: '字体缩放',
    description: '在模板基准字号之上的倍数。',
    type: 'number',
    default: 1,
    min: 0.5,
    max: 2,
    step: 0.1,
  },
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
  const { aspect, handleLoad } = useImageAspect(photoUrl);

  const cornerText = formatExifText(cornerLabel, exif);
  const captionText = formatExifText(caption, exif);

  const canvasStyle: TemplateStyle = {
    '--co-frame-width': frameWidth,
    '--co-font-scale': fontScale,
    width: 'calc(var(--co-base) * 1)',
    padding: 'calc(var(--co-base) * var(--co-frame-width))',
    backgroundColor: frameColor,
  };

  return (
    <div className="bg-white" style={canvasStyle}>
      <div className="relative">
        <img
          src={photoUrl}
          alt=""
          className="block object-contain"
          style={{
            width: 'calc(var(--co-base) * (1 - var(--co-frame-width) * 2))',
            aspectRatio: String(aspect),
          }}
          onLoad={handleLoad}
        />
        {cornerText ? (
          <span
            className="absolute font-mono tracking-[0.2em]"
            style={{
              top: 'calc(var(--co-base) * var(--co-frame-width) * 0.5)',
              left: 'calc(var(--co-base) * var(--co-frame-width) * 0.5)',
              padding: 'calc(var(--co-base) * 0.01) calc(var(--co-base) * 0.018)',
              fontSize: 'calc(var(--co-base) * 0.014 * var(--co-font-scale))',
              color: textColor,
              backgroundColor: withAlpha(frameColor, 'cc'),
            }}
          >
            {cornerText}
          </span>
        ) : null}
      </div>
      <div
        className="flex items-end justify-between"
        style={{
          marginTop: 'calc(var(--co-base) * var(--co-frame-width) * 0.6)',
          gap: 'calc(var(--co-base) * 0.02)',
          color: textColor,
        }}
      >
        <span
          className="font-mono tracking-[0.35em]"
          style={{ fontSize: 'calc(var(--co-base) * 0.012 * var(--co-font-scale))' }}
        >
          FILM
        </span>
        {captionText ? (
          <span
            className="text-right font-mono"
            style={{ fontSize: 'calc(var(--co-base) * 0.015 * var(--co-font-scale))' }}
          >
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
