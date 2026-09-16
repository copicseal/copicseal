import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { defineTemplate } from './define-template';
import { formatExifText } from './format-exif-text';
import type {
  RegisteredTemplate,
  TemplateField,
  TemplateInjectedProps,
  TemplateParams,
} from './types';

/**
 * Minimal 的参数声明：只描述排版方向与两行文案，不包含任何边框能力。
 * 字段清单是唯一真相源，组件 props 由它推导。
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
  { key: 'fontScale', label: '字体缩放', type: 'number', default: 1, min: 0.8, max: 2, step: 0.1 },
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
  // 自动方向需要真实长宽比，图片加载完成后才能判定。
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const line1 = formatExifText(textLine1, exif);
  const line2 = formatExifText(textLine2, exif);
  const resolvedOrientation =
    orientation === 'auto'
      ? aspectRatio !== null && aspectRatio < 1
        ? 'vertical'
        : 'horizontal'
      : orientation;

  return (
    <div className="flex flex-col items-center gap-4 bg-white px-8 py-8">
      <img
        src={photoUrl}
        alt=""
        className="block max-h-[60vh] max-w-full object-contain"
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          setAspectRatio(naturalHeight > 0 ? naturalWidth / naturalHeight : null);
        }}
      />
      <div
        className={cn(
          'flex w-full flex-col gap-1',
          resolvedOrientation === 'vertical' ? 'items-center text-center' : 'items-end text-right',
        )}
        style={{ color: textColor }}
      >
        {line1 ? (
          <p className="font-medium tracking-wide" style={{ fontSize: 15 * fontScale }}>
            {line1}
          </p>
        ) : null}
        {line2 ? (
          <p className="font-mono" style={{ fontSize: 11 * fontScale }}>
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
  component: Minimal,
});
