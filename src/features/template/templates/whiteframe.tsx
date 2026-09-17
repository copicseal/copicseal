import type { CSSProperties } from 'react';
import { getBrandLogoSvg, getBrandLogoUrl, normalizeBrand, normalizeModelName } from './brand';
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
 * 白框卡片。
 *
 * 画布本身就是卡片：底色即相框色，内边距即相框边距，图片下方是一条信息栏
 * （左侧品牌标志与机型，右侧参数文案与时间）。竖构图时信息栏会移到图片右侧，
 * 避免整张卡片被拉得过高。
 *
 * 数值字段一律是「相对画布宽度的比例」。旧运行时会把主图覆盖成 `4·aspect rem × 4rem`
 * （主图高度恒为 4rem），折算到「主图占 0.9 画布宽度」后 1 旧 rem ≈ 0.15 画布宽度比例；
 * 本文件的所有比例都按该系数换算，与同家族模板保持同一量级。
 */
const whiteFrameFields = [
  {
    key: 'layout',
    label: '排列方向',
    description: '自动模式在竖构图时把信息栏移到图片右侧。',
    type: 'select',
    default: 'auto',
    options: [
      { label: '自动', value: 'auto' },
      { label: '纵向（信息在下）', value: 'vertical' },
      { label: '横向（信息在侧）', value: 'horizontal' },
    ],
  },
  {
    key: 'borderPadding',
    label: '相框边距',
    description: '相对画布宽度的比例。',
    type: 'number',
    default: 0.006,
    min: 0,
    max: 0.05,
    step: 0.001,
  },
  { key: 'borderColor', label: '相框颜色', type: 'color', default: '#ffffff' },
  {
    key: 'fontScale',
    label: '文字缩放',
    type: 'number',
    default: 1,
    min: 0.5,
    max: 2,
    step: 0.1,
  },
  { key: 'textColor', label: '文字颜色', type: 'color', default: '#1a1a1a' },
  {
    key: 'logoColorAuto',
    label: '标志跟随文字颜色',
    description: '开启后使用单色标志，颜色与文字一致。',
    type: 'boolean',
    default: false,
  },
  {
    key: 'logoShadow',
    label: '标志阴影',
    type: 'boolean',
    default: false,
    visibleWhen: { key: 'logoColorAuto', equals: [false] },
  },
  {
    key: 'shadowBlur',
    label: '相框阴影模糊',
    description: '相对画布宽度的比例，0 表示不投影。',
    type: 'number',
    default: 0.03,
    min: 0,
    max: 0.08,
    step: 0.005,
  },
  { key: 'shadowColor', label: '相框阴影颜色', type: 'color', default: '#000000' },
  {
    key: 'shadowOpacity',
    label: '相框阴影不透明度',
    type: 'number',
    default: 0.8,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'text1',
    label: '行程文案',
    type: 'text',
    default: '{FocalLength}  {FNumber}  {ExposureTime}  ISO {ISO}',
  },
  { key: 'text2', label: '时间文案', type: 'text', default: '{DateTaken}' },
] as const satisfies readonly TemplateField[];

type WhiteFrameParams = TemplateParams<typeof whiteFrameFields>;

/** 字体与图标的尺寸都以画布宽度为基准，再乘上用户设定的文字缩放。 */
const TEXT_RATIO = 0.015;
const DATE_RATIO = 0.012;
const LOGO_HEIGHT_RATIO = 0.03;
const LOGO_WIDTH_RATIO = 0.09;

function WhiteFrame({
  photoUrl,
  exif,
  layout,
  borderPadding,
  borderColor,
  fontScale,
  textColor,
  logoColorAuto,
  logoShadow,
  shadowBlur,
  shadowColor,
  shadowOpacity,
  text1,
  text2,
}: TemplateInjectedProps & WhiteFrameParams) {
  const { aspect, handleLoad } = useImageAspect(photoUrl);

  // 自动模式：竖构图（宽高比 < 1）时把信息栏放到图片右侧，避免卡片被拉得过高
  const isHorizontal = layout === 'auto' ? aspect < 1 : layout === 'horizontal';

  const brand = normalizeBrand(exif?.make);
  const model = normalizeModelName(exif?.model);
  const autoLogo = logoColorAuto ? getBrandLogoSvg(exif?.make, exif?.model) : null;
  const coloredLogo = autoLogo ? null : getBrandLogoUrl(exif?.make, exif?.model);

  const line1 = formatExifText(text1, exif);
  const line2 = formatExifText(text2, exif) || (exif?.date_taken ?? '');

  const canvasStyle: TemplateStyle = {
    '--co-border-padding': borderPadding,
    '--co-font-scale': fontScale,
    position: 'relative',
    boxSizing: 'border-box',
    width: 'calc(var(--co-base) * 1)',
    padding: `calc(var(--co-base) * var(--co-border-padding))`,
    backgroundColor: borderColor,
    color: textColor,
    display: isHorizontal ? 'flex' : 'block',
    alignItems: isHorizontal ? 'center' : undefined,
    overflow: 'hidden',
    boxShadow:
      shadowBlur > 0
        ? `0 0 calc(var(--co-base) * ${shadowBlur}) 0 color-mix(in srgb, ${shadowColor} ${Math.round(
            shadowOpacity * 100,
          )}%, transparent)`
        : undefined,
  };

  const imageStyle: CSSProperties = {
    display: 'block',
    // 横向排布时按内容盒百分比分配：图片 72% / 信息栏 28%
    width: isHorizontal ? '72%' : '100%',
    flex: 'none',
    aspectRatio: String(aspect),
    objectFit: 'cover',
  };

  const infoStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isHorizontal ? 'column' : 'row',
    justifyContent: isHorizontal ? 'center' : 'space-between',
    alignItems: isHorizontal ? 'flex-start' : 'center',
    gap: isHorizontal ? '0.5em' : undefined,
    width: isHorizontal ? '28%' : '100%',
    flex: 'none',
    boxSizing: 'border-box',
    minHeight: isHorizontal ? undefined : 'calc(var(--co-base) * 0.06)',
    paddingLeft: isHorizontal ? 'calc(var(--co-base) * 0.015)' : undefined,
    paddingRight: isHorizontal ? undefined : 'calc(var(--co-base) * 0.015)',
    paddingTop: isHorizontal ? undefined : 'calc(var(--co-base) * var(--co-border-padding) / 2)',
    fontSize: `calc(var(--co-base) * ${TEXT_RATIO} * var(--co-font-scale))`,
  };

  // 固定尺寸的标志盒；内部 SVG / 图片按 contain 自适应，不会拉伸变形
  const logoStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `calc(var(--co-base) * ${LOGO_WIDTH_RATIO} * var(--co-font-scale))`,
    height: `calc(var(--co-base) * ${LOGO_HEIGHT_RATIO} * var(--co-font-scale))`,
    filter: logoShadow
      ? `drop-shadow(0 0 calc(var(--co-base) * 0.003) ${textColor}) drop-shadow(0 0 calc(var(--co-base) * 0.003) ${textColor})`
      : undefined,
  };

  return (
    <div style={canvasStyle}>
      <img src={photoUrl} alt="" style={imageStyle} onLoad={handleLoad} />

      <div style={infoStyle}>
        <div className="flex items-center" style={{ gap: '0.5em', minWidth: 0, fontWeight: 600 }}>
          {autoLogo ? (
            <div style={logoStyle}>
              <span
                className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
                style={{ color: textColor }}
                // 单色标志是随包内置的 SVG 资产（非用户输入），靠 currentColor 跟随文字颜色
                // biome-ignore lint/security/noDangerouslySetInnerHtml: 内容来自打包进应用的 Logo 资产，不经过用户输入
                dangerouslySetInnerHTML={{ __html: autoLogo }}
              />
            </div>
          ) : coloredLogo ? (
            <div style={logoStyle}>
              <img src={coloredLogo} alt={brand} className="h-full w-full object-contain" />
            </div>
          ) : (
            <span>{brand}</span>
          )}

          {model ? (
            <span
              className="flex items-end"
              style={{ marginLeft: 'calc(var(--co-base) * 0.0075)', whiteSpace: 'nowrap' }}
            >
              {model}
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isHorizontal ? 'flex-start' : 'flex-end',
            textAlign: isHorizontal ? 'left' : 'right',
          }}
        >
          {line1 ? (
            <p style={{ margin: 0, whiteSpace: 'nowrap', lineHeight: 1.3 }}>{line1}</p>
          ) : null}
          {line2 ? (
            <p
              style={{
                margin: 0,
                marginTop: 'calc(var(--co-base) * 0.0015)',
                fontSize: `calc(var(--co-base) * ${DATE_RATIO} * var(--co-font-scale))`,
                lineHeight: 1.3,
                color: `color-mix(in srgb, ${textColor} 50%, transparent)`,
                whiteSpace: isHorizontal ? 'nowrap' : 'break-spaces',
              }}
            >
              {line2}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const WHITE_FRAME_TEMPLATE: RegisteredTemplate = defineTemplate({
  meta: {
    id: 'whiteframe',
    name: '白框',
    description: '白色相框卡片，图片下方是品牌标志、机型与两段 EXIF 文案。',
    tags: ['相框', '品牌', '信息条'],
  },
  fields: whiteFrameFields,
  // 卡片自身就是相框，默认不再叠加背景
  backgroundDefaults: {
    mode: 'none',
  },
  component: WhiteFrame,
});
