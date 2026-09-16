import { cn } from '@/shared/lib/utils';
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
 * Minimal 的参数声明。
 *
 * 数值字段一律是「相对画布宽度的比例」，模板内不出现任何带单位的字面量；
 * 颜色类字段直接透传给内联样式。
 */
const minimalFields = [
  {
    key: 'orientation',
    label: '排版方向',
    description: '自动模式按图片长宽比决定文案对齐方式。',
    type: 'select',
    default: 'auto',
    options: [
      { label: '自动', value: 'auto' },
      { label: '横向', value: 'horizontal' },
      { label: '竖向', value: 'vertical' },
    ],
  },
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
  { key: 'textColor', label: '文字颜色', type: 'color', default: '#1a1a1a' },
  { key: 'textLine1', label: '文案 1', type: 'text', default: '{Make} {Model}' },
  {
    key: 'textLine2',
    label: '文案 2',
    type: 'text',
    default: '{FocalLength}  {FNumber}  {ExposureTime}  ISO {ISO}',
  },
] as const satisfies readonly TemplateField[];

type MinimalParams = TemplateParams<typeof minimalFields>;

/** 极简模板：白底无边框，图片下方按排版方向对齐两行文字。 */
function Minimal({
  photoUrl,
  exif,
  orientation,
  fontScale,
  textColor,
  textLine1,
  textLine2,
}: TemplateInjectedProps & MinimalParams) {
  const { aspect, handleLoad } = useImageAspect(photoUrl);

  const line1 = formatExifText(textLine1, exif);
  const line2 = formatExifText(textLine2, exif);
  const resolvedOrientation =
    orientation === 'auto' ? (aspect < 1 ? 'vertical' : 'horizontal') : orientation;

  const canvasStyle: TemplateStyle = {
    '--co-font-scale': fontScale,
    width: 'calc(var(--co-base) * 1)',
    padding: 'calc(var(--co-base) * 0.05)',
    gap: 'calc(var(--co-base) * 0.03)',
  };

  return (
    <div className="flex flex-col items-center bg-white" style={canvasStyle}>
      <img
        src={photoUrl}
        alt=""
        className="block object-contain"
        style={{
          width: 'calc(var(--co-base) * 0.9)',
          aspectRatio: String(aspect),
        }}
        onLoad={handleLoad}
      />
      <div
        className={cn(
          'flex w-full flex-col',
          resolvedOrientation === 'vertical' ? 'items-center text-center' : 'items-end text-right',
        )}
        style={{ gap: 'calc(var(--co-base) * 0.008)', color: textColor }}
      >
        {line1 ? (
          <p
            className="font-medium tracking-wide"
            style={{ fontSize: 'calc(var(--co-base) * 0.022 * var(--co-font-scale))' }}
          >
            {line1}
          </p>
        ) : null}
        {line2 ? (
          <p
            className="font-mono"
            style={{ fontSize: 'calc(var(--co-base) * 0.015 * var(--co-font-scale))' }}
          >
            {line2}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const MINIMAL_TEMPLATE: RegisteredTemplate = defineTemplate({
  meta: {
    id: 'minimal',
    name: 'Minimal',
    description: '白底极简排版，只保留图片与两行 EXIF 文案。',
    tags: ['极简', 'EXIF'],
  },
  fields: minimalFields,
  // 极简排版配一圈纯色留白，导出时目标尺寸会被完整保留
  backgroundDefaults: {
    mode: 'color',
    color: '#ffffff',
    paddingHorizontal: 0.06,
    paddingVertical: 0.06,
  },
  component: Minimal,
});
