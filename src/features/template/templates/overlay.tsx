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
 * Overlay 的参数声明。
 *
 * 数值字段一律是「相对画布宽度的比例」：画布与图片等宽，即画布宽度就是 1 个基准单位，
 * 与旧版「主图宽 = 1rem」的基准一致，因此旧值可以 1:1 沿用。
 */
const overlayFields = [
  {
    key: 'position',
    label: '文字位置',
    description: '九宫格定位，决定信息块贴在图片的哪个位置。',
    type: 'select',
    default: 'bottom',
    options: [
      { label: '左上', value: 'top-left' },
      { label: '上', value: 'top' },
      { label: '右上', value: 'top-right' },
      { label: '左', value: 'left' },
      { label: '中', value: 'center' },
      { label: '右', value: 'right' },
      { label: '左下', value: 'bottom-left' },
      { label: '下', value: 'bottom' },
      { label: '右下', value: 'bottom-right' },
    ],
  },
  {
    key: 'offsetTop',
    label: '顶部偏移',
    description: '贴住上边缘时生效，相对画布宽度的比例。',
    type: 'number',
    default: 0.02,
    min: 0,
    max: 0.5,
    step: 0.005,
    visibleWhen: { key: 'position', equals: ['top-left', 'top', 'top-right'] },
  },
  {
    key: 'offsetLeft',
    label: '左侧偏移',
    description: '贴住左边缘时生效，相对画布宽度的比例。',
    type: 'number',
    default: 0.02,
    min: 0,
    max: 0.5,
    step: 0.005,
    visibleWhen: { key: 'position', equals: ['top-left', 'left', 'bottom-left'] },
  },
  {
    key: 'offsetRight',
    label: '右侧偏移',
    description: '贴住右边缘时生效，相对画布宽度的比例。',
    type: 'number',
    default: 0.02,
    min: 0,
    max: 0.5,
    step: 0.005,
    visibleWhen: { key: 'position', equals: ['top-right', 'right', 'bottom-right'] },
  },
  {
    key: 'offsetBottom',
    label: '底部偏移',
    description: '贴住下边缘时生效，相对画布宽度的比例。',
    type: 'number',
    default: 0.02,
    min: 0,
    max: 0.5,
    step: 0.005,
    visibleWhen: { key: 'position', equals: ['bottom-left', 'bottom', 'bottom-right'] },
  },
  {
    key: 'layout',
    label: '布局排列',
    description: '自动模式按图片长宽比决定：横图并排，竖图上下。',
    type: 'select',
    default: 'auto',
    options: [
      { label: '自动', value: 'auto' },
      { label: '垂直（上下）', value: 'vertical' },
      { label: '水平（并排）', value: 'horizontal' },
    ],
  },
  {
    key: 'gapScale',
    label: '布局间距',
    description: '在模板基准间距之上的倍数，0 表示紧贴。',
    type: 'number',
    default: 1,
    min: 0,
    max: 3,
    step: 0.1,
  },
  {
    key: 'fontScale',
    label: '文字缩放',
    description: '在模板基准字号之上的倍数。',
    type: 'number',
    default: 1,
    min: 0.5,
    max: 2,
    step: 0.1,
  },
  { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
  {
    key: 'logoColorAuto',
    label: '标志颜色自动',
    description: '开启后使用单色标志，颜色与文字一致。',
    type: 'boolean',
    default: true,
  },
  {
    key: 'logoShadow',
    label: '标志阴影',
    description: '彩色标志在浅色照片上容易糊掉，加一圈阴影提升可读性。',
    type: 'boolean',
    default: false,
    visibleWhen: { key: 'logoColorAuto', equals: [false] },
  },
  {
    key: 'shadowBlur',
    label: '阴影模糊',
    description: '相对画布宽度的比例，0 表示不投影。',
    type: 'number',
    default: 0.003,
    min: 0,
    max: 0.03,
    step: 0.001,
  },
  { key: 'shadowColor', label: '阴影颜色', type: 'color', default: '#000000' },
  {
    key: 'shadowOpacity',
    label: '阴影不透明度',
    type: 'number',
    default: 0.6,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'text1',
    label: '文本 1',
    description: '机型下方的参数文案，支持 {变量} 占位。',
    type: 'text',
    default: '{FocalLength}  {FNumber}  {ExposureTime}  ISO {ISO}',
  },
  {
    key: 'text2',
    label: '文本 2',
    description: '最下方的时间文案，留空时回退为拍摄时间。',
    type: 'text',
    default: '{DateTaken}',
  },
] as const satisfies readonly TemplateField[];

type OverlayParams = TemplateParams<typeof overlayFields>;

/** 九宫格定位值 → 两轴贴边方式；`center` 表示该轴居中。 */
const POSITION_ANCHORS: Record<
  OverlayParams['position'],
  { x: 'start' | 'center' | 'end'; y: 'start' | 'center' | 'end' }
> = {
  'top-left': { x: 'start', y: 'start' },
  top: { x: 'center', y: 'start' },
  'top-right': { x: 'end', y: 'start' },
  left: { x: 'start', y: 'center' },
  center: { x: 'center', y: 'center' },
  right: { x: 'end', y: 'center' },
  'bottom-left': { x: 'start', y: 'end' },
  bottom: { x: 'center', y: 'end' },
  'bottom-right': { x: 'end', y: 'end' },
};

/** 字体相关尺寸：画布宽度 × 比例 × 文字缩放。 */
function scaleFont(ratio: number): string {
  return `calc(var(--co-base) * ${ratio} * var(--co-font-scale))`;
}

/** 布局间距：画布宽度 × 比例 × 文字缩放 × 布局间距，与旧版 --calc-gap-scale 语义一致。 */
function scaleGap(ratio: number): string {
  return `calc(var(--co-base) * ${ratio} * var(--co-font-scale) * var(--co-gap-scale))`;
}

/** 把九宫格定位换算成绝对定位样式：贴边轴取用户偏移，居中轴取 50% 并回退自身一半尺寸。 */
function resolveAnchorStyle(position: OverlayParams['position']): CSSProperties {
  const anchor = POSITION_ANCHORS[position];
  const style: CSSProperties = {};

  if (anchor.x === 'start') {
    style.left = 'calc(var(--co-base) * var(--co-offset-left))';
  } else if (anchor.x === 'end') {
    style.right = 'calc(var(--co-base) * var(--co-offset-right))';
  } else {
    style.left = '50%';
  }

  if (anchor.y === 'start') {
    style.top = 'calc(var(--co-base) * var(--co-offset-top))';
  } else if (anchor.y === 'end') {
    style.bottom = 'calc(var(--co-base) * var(--co-offset-bottom))';
  } else {
    style.top = '50%';
  }

  // 居中轴必须把自身尺寸的一半移回去，两轴同时居中时用一次 translate 表达
  if (anchor.x === 'center' || anchor.y === 'center') {
    const shiftX = anchor.x === 'center' ? '-50%' : '0';
    const shiftY = anchor.y === 'center' ? '-50%' : '0';
    style.transform = `translate(${shiftX}, ${shiftY})`;
  }

  return style;
}

/**
 * 旧版 rem 与画布宽度的换算系数。
 *
 * 旧运行时 `calcSize` 会把主图覆盖成 `4·aspect rem × 4rem`，即主图高度恒为 4rem、
 * 3:2 时宽度为 6rem；折算到「主图占 0.9 画布宽度」后，1 旧 rem ≈ 0.15 画布宽度比例。
 * 模板家族统一按此系数换算，避免各模板各自取比例导致量级不一致。
 */
const REM_TO_BASE = 0.15;

const MODEL_RATIO = 0.1 * REM_TO_BASE;
const TEXT_RATIO = 0.1 * REM_TO_BASE;
const DATE_RATIO = 0.08 * REM_TO_BASE;
const LOGO_HEIGHT_RATIO = 0.2 * REM_TO_BASE;
const LOGO_WIDTH_RATIO = 0.6 * REM_TO_BASE;
const MODEL_GAP_RATIO = 0.01 * REM_TO_BASE;
const LINE_GAP_RATIO = 0.01 * REM_TO_BASE;
const DATE_GAP_RATIO = 0.02 * REM_TO_BASE;
const DIVIDER_WIDTH_RATIO = 0.005 * REM_TO_BASE;
const DIVIDER_INSET_RATIO = 0.05 * REM_TO_BASE;
const H_SIDE_GAP_RATIO = 0.08 * REM_TO_BASE;

/** 叠字模板：品牌标志、机型与拍摄参数直接叠印在图片上，九宫格定位 + 四向偏移。 */
function Overlay({
  photoUrl,
  exif,
  position,
  offsetTop,
  offsetLeft,
  offsetRight,
  offsetBottom,
  layout,
  gapScale,
  fontScale,
  textColor,
  logoColorAuto,
  logoShadow,
  shadowBlur,
  shadowColor,
  shadowOpacity,
  text1,
  text2,
}: TemplateInjectedProps & OverlayParams) {
  const { aspect, handleLoad } = useImageAspect(photoUrl);

  // 自动模式：横图并排、竖图上下，避免信息块沿着窄边被拉长
  const isHorizontal = layout === 'auto' ? aspect > 1 : layout === 'horizontal';

  const brand = normalizeBrand(exif?.make);
  const model = normalizeModelName(exif?.model);
  const monoLogo = logoColorAuto ? getBrandLogoSvg(exif?.make, exif?.model) : null;
  const coloredLogo = monoLogo ? null : getBrandLogoUrl(exif?.make, exif?.model);

  const line1 = formatExifText(text1, exif);
  // 文案留空时回退到拍摄时间，与旧版 `replaceTextVars(text2) || datetime` 的行为一致
  const line2 = formatExifText(text2, exif) || (exif?.date_taken ?? '');

  const shadowPaint = `color-mix(in srgb, ${shadowColor} ${Math.round(
    shadowOpacity * 100,
  )}%, transparent)`;
  const logoFilter =
    shadowBlur > 0
      ? `drop-shadow(0 0 calc(var(--co-base) * ${shadowBlur}) ${shadowPaint}) drop-shadow(0 0 calc(var(--co-base) * ${shadowBlur}) ${shadowPaint})`
      : undefined;

  const canvasStyle: TemplateStyle = {
    '--co-font-scale': fontScale,
    '--co-gap-scale': gapScale,
    '--co-offset-top': offsetTop,
    '--co-offset-left': offsetLeft,
    '--co-offset-right': offsetRight,
    '--co-offset-bottom': offsetBottom,
    position: 'relative',
    width: 'calc(var(--co-base) * 1)',
    color: textColor,
  };

  const infoStyle: CSSProperties = {
    ...resolveAnchorStyle(position),
    position: 'absolute',
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const logoBoxStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
    height: scaleFont(LOGO_HEIGHT_RATIO),
    maxWidth: scaleFont(LOGO_WIDTH_RATIO),
    fontWeight: 700,
  };

  const logoImageStyle: CSSProperties = {
    maxWidth: '100%',
    filter: logoShadow ? logoFilter : undefined,
  };

  // 水平布局的分隔竖线：旧版是 part2 的伪元素，这里改成一个显式元素
  const dividerStyle: CSSProperties = {
    alignSelf: 'stretch',
    flex: 'none',
    width: scaleFont(DIVIDER_WIDTH_RATIO),
    marginTop: scaleFont(DIVIDER_INSET_RATIO),
    marginBottom: scaleFont(DIVIDER_INSET_RATIO),
    marginLeft: scaleGap(H_SIDE_GAP_RATIO),
    backgroundColor: textColor,
  };

  const textBlockStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: isHorizontal ? 'flex-start' : 'center',
    textAlign: isHorizontal ? 'left' : 'center',
    marginLeft: isHorizontal ? scaleGap(H_SIDE_GAP_RATIO) : undefined,
  };

  const modelStyle: CSSProperties = {
    margin: 0,
    marginTop: isHorizontal ? 0 : scaleGap(MODEL_GAP_RATIO),
    fontSize: scaleFont(MODEL_RATIO),
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  };

  const textStyle: CSSProperties = {
    margin: 0,
    marginTop: scaleGap(LINE_GAP_RATIO),
    fontSize: scaleFont(TEXT_RATIO),
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  };

  const dateStyle: CSSProperties = {
    margin: 0,
    marginTop: scaleGap(DATE_GAP_RATIO),
    fontSize: scaleFont(DATE_RATIO),
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    color: `color-mix(in srgb, ${textColor} 50%, transparent)`,
  };

  return (
    <div style={canvasStyle}>
      <img
        data-co-photo=""
        src={photoUrl}
        alt=""
        className="block object-contain"
        style={{ width: 'calc(var(--co-base) * 1)', aspectRatio: String(aspect) }}
        onLoad={handleLoad}
      />

      <div style={infoStyle}>
        <div style={logoBoxStyle}>
          {monoLogo ? (
            <span
              className="flex h-full [&>svg]:h-full [&>svg]:w-auto [&>svg]:max-w-full"
              // 单色标志是 SVG 源码，靠容器上的 color 让 currentColor 生效
              style={{ color: textColor }}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: 标志是构建期打包的内置 SVG 资源，不是用户输入
              dangerouslySetInnerHTML={{ __html: monoLogo }}
            />
          ) : coloredLogo ? (
            <img
              src={coloredLogo}
              alt={brand}
              className="h-full w-auto object-contain"
              style={logoImageStyle}
            />
          ) : (
            <span style={{ fontSize: scaleFont(MODEL_RATIO), whiteSpace: 'nowrap' }}>{brand}</span>
          )}
        </div>

        {isHorizontal ? <span aria-hidden="true" style={dividerStyle} /> : null}

        <div style={textBlockStyle}>
          {model ? <p style={modelStyle}>{model}</p> : null}
          {line1 ? <p style={textStyle}>{line1}</p> : null}
          {/* 水平布局下时间文案会撑宽整块信息，与旧版 display:none 保持一致 */}
          {!isHorizontal && line2 ? <p style={dateStyle}>{line2}</p> : null}
        </div>
      </div>
    </div>
  );
}

export const OVERLAY_TEMPLATE: RegisteredTemplate = defineTemplate({
  meta: {
    id: 'overlay',
    name: '叠字',
    description: '把品牌标志、机型与拍摄参数叠印在图片之上，九宫格定位配四向偏移。',
    tags: ['叠字', '九宫格', '品牌'],
  },
  fields: overlayFields,
  // 信息直接叠在图片上，画布与图片等宽，不需要额外背景
  backgroundDefaults: {
    mode: 'none',
  },
  component: Overlay,
});
