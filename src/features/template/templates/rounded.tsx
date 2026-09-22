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
 * 旧版 rem → 新版画布比例的换算基准。
 *
 * 旧模板在实际渲染时会把主图高度固定为 4rem（宽度随长宽比，3:2 参考下为 6rem 宽），
 * 因此旧 CSS 里的 rem 值并不是画布宽度：旧版导出的实测结果是「字号 0.1rem ≈ 图片宽度的 1.7%」。
 * 新版画布宽固定为 1 个基准单位、主图占 0.9 单位，于是
 *
 *   1 旧 rem ≈ 0.9 / 6 = 0.15 个画布宽度
 *
 * 下面所有几何都是「旧 rem 值 × 该系数」，量级与极简 / 胶片模板保持一致。
 */
const REM_TO_BASE = 0.15;

/** 旧 rem 值换算为画布比例，并收敛到 4 位小数，避免浮点误差写进 CSS。 */
function fromRem(value: number): number {
  return Number((value * REM_TO_BASE).toFixed(4));
}

/** 画布内边距与主图宽度：留出的空白正好容纳主图投影，与极简模板取同一组值。 */
const CANVAS_PADDING = 0.05;
const IMAGE_WIDTH = 0.9;

/** 旧版信息区：上间距 0.2rem、行间距 0.2em（相对 0.2rem 基准）。 */
const INFO_PADDING_TOP = fromRem(0.2);
const INFO_GAP = fromRem(0.04);

/** 旧版文字：机型与参数文案 0.1rem、时间 0.08rem，时间行额外 0.02rem 上间距。 */
const TEXT_RATIO = fromRem(0.1);
const DATE_RATIO = fromRem(0.08);
const DATE_MARGIN_TOP = fromRem(0.02);

/** 旧版标志盒：高 0.2rem、宽 0.6rem，机型名左间距 0.05rem，标志阴影 0.02rem。 */
const LOGO_HEIGHT = fromRem(0.2);
const LOGO_WIDTH = fromRem(0.6);
const MODEL_GAP = fromRem(0.05);
const LOGO_SHADOW_BLUR = fromRem(0.02);

/**
 * 无框圆角模板的参数声明。
 *
 * 数值字段一律是「相对画布宽度的比例」：无边框，主图带圆角与投影，
 * 品牌标志、机型名与两行文案居中堆叠在图片下方。
 */
const roundedFields = [
  {
    key: 'imageRadius',
    label: '图片圆角',
    description: '相对画布宽度的比例；旧版 0.1rem 换算后约为 0.015。',
    type: 'number',
    default: fromRem(0.1),
    min: 0,
    max: 0.1,
    step: 0.001,
  },
  {
    key: 'shadowBlur',
    label: '图片阴影模糊',
    description: '相对画布宽度的比例，0 表示不投影；旧版 0.2rem 换算后约为 0.03。',
    type: 'number',
    default: fromRem(0.2),
    min: 0,
    max: 0.08,
    step: 0.005,
  },
  { key: 'shadowColor', label: '图片阴影颜色', type: 'color', default: '#000000' },
  {
    key: 'shadowOpacity',
    label: '图片阴影不透明度',
    type: 'number',
    default: 0.8,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'fontScale',
    label: '文字缩放',
    description: '在模板基准字号之上的倍数，标志尺寸同步缩放。',
    type: 'number',
    default: 1,
    min: 0.5,
    max: 2,
    step: 0.1,
  },
  { key: 'textColor', label: '文字颜色', type: 'color', default: '#1a1a1a' },
  {
    key: 'text1',
    label: '文案 1',
    description: '支持 {FocalLength}、{FNumber}、{ExposureTime}、{ISO} 等 EXIF 变量。',
    type: 'text',
    default: '{FocalLength} {FNumber} {ExposureTime}s ISO{ISO}',
  },
  {
    key: 'text2',
    label: '文案 2',
    description: '留空时回落到拍摄时间。',
    type: 'text',
    default: '{DateTaken}',
  },
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
    description: '仅为彩色标志加一层跟随文字颜色的描边阴影。',
    type: 'boolean',
    default: false,
    visibleWhen: { key: 'logoColorAuto', equals: [false] },
  },
] as const satisfies readonly TemplateField[];

type RoundedParams = TemplateParams<typeof roundedFields>;

/** 无框圆角模板：图片自带圆角与投影，下方居中堆叠品牌信息与两行 EXIF 文案。 */
function Rounded({
  photoUrl,
  exif,
  imageRadius,
  shadowBlur,
  shadowColor,
  shadowOpacity,
  fontScale,
  textColor,
  text1,
  text2,
  logoColorAuto,
  logoShadow,
}: TemplateInjectedProps & RoundedParams) {
  const { aspect, handleLoad } = useImageAspect(photoUrl);

  const brand = normalizeBrand(exif?.make);
  const model = normalizeModelName(exif?.model);
  // 单色标志走 SVG + currentColor，彩色标志走位图资源，两者互斥
  const autoLogo = logoColorAuto ? getBrandLogoSvg(exif?.make, exif?.model) : null;
  const coloredLogo = autoLogo ? null : getBrandLogoUrl(exif?.make, exif?.model);
  const hasBrandRow = Boolean(autoLogo || coloredLogo || brand || model);

  const line1 = formatExifText(text1, exif);
  // 文案为空时回落到拍摄时间，与旧版 `replaceTextVars(text2) || DateTimeOriginal` 一致
  const line2 = formatExifText(text2, exif) || (exif?.date_taken ?? '');

  const canvasStyle: TemplateStyle = {
    '--co-font-scale': fontScale,
    boxSizing: 'border-box',
    width: 'calc(var(--co-base) * 1)',
    padding: `calc(var(--co-base) * ${CANVAS_PADDING})`,
    color: textColor,
  };

  const imageStyle: CSSProperties = {
    display: 'block',
    width: `calc(var(--co-base) * ${IMAGE_WIDTH})`,
    aspectRatio: String(aspect),
    objectFit: 'contain',
    borderRadius: `calc(var(--co-base) * ${imageRadius})`,
    // 无框模板里图片就是视觉主体，旧版的 --box-shadow 同样只挂在主图上
    boxShadow:
      shadowBlur > 0
        ? `0 0 calc(var(--co-base) * ${shadowBlur}) 0 color-mix(in srgb, ${shadowColor} ${Math.round(
            shadowOpacity * 100,
          )}%, transparent)`
        : undefined,
  };

  const infoStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: `calc(var(--co-base) * ${INFO_PADDING_TOP})`,
    gap: `calc(var(--co-base) * ${INFO_GAP} * var(--co-font-scale))`,
  };

  // 固定尺寸的标志盒：内部 SVG / 图片按 contain 自适应，不会拉伸变形
  const logoBoxStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `calc(var(--co-base) * ${LOGO_WIDTH} * var(--co-font-scale))`,
    height: `calc(var(--co-base) * ${LOGO_HEIGHT} * var(--co-font-scale))`,
  };

  const brandTextStyle: CSSProperties = {
    fontSize: `calc(var(--co-base) * ${LOGO_HEIGHT} * var(--co-font-scale))`,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  };

  const modelStyle: CSSProperties = {
    marginLeft: `calc(var(--co-base) * ${MODEL_GAP})`,
    fontSize: `calc(var(--co-base) * ${TEXT_RATIO} * var(--co-font-scale))`,
    whiteSpace: 'nowrap',
    lineHeight: 1.3,
  };

  const line1Style: CSSProperties = {
    margin: 0,
    fontSize: `calc(var(--co-base) * ${TEXT_RATIO} * var(--co-font-scale))`,
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
  };

  const line2Style: CSSProperties = {
    margin: 0,
    marginTop: `calc(var(--co-base) * ${DATE_MARGIN_TOP} * var(--co-font-scale))`,
    fontSize: `calc(var(--co-base) * ${DATE_RATIO} * var(--co-font-scale))`,
    lineHeight: 1.3,
    textAlign: 'center',
    color: `color-mix(in srgb, ${textColor} 50%, transparent)`,
    whiteSpace: 'break-spaces',
  };

  return (
    <div className="flex flex-col items-center" style={canvasStyle}>
      <img data-co-photo="" src={photoUrl} alt="" style={imageStyle} onLoad={handleLoad} />

      <div style={infoStyle}>
        {hasBrandRow ? (
          <div className="flex items-center">
            {autoLogo ? (
              <div style={logoBoxStyle}>
                <span
                  className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
                  style={{ color: textColor }}
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: 内容来自打包进应用的 Logo 资产，不经过用户输入
                  dangerouslySetInnerHTML={{ __html: autoLogo }}
                />
              </div>
            ) : coloredLogo ? (
              <div style={logoBoxStyle}>
                <img
                  src={coloredLogo}
                  alt={brand}
                  className="h-full w-full object-contain"
                  style={{
                    filter: logoShadow
                      ? `drop-shadow(0 0 calc(var(--co-base) * ${LOGO_SHADOW_BLUR}) ${textColor}) drop-shadow(0 0 calc(var(--co-base) * ${LOGO_SHADOW_BLUR}) ${textColor})`
                      : undefined,
                  }}
                />
              </div>
            ) : (
              <span style={brandTextStyle}>{brand}</span>
            )}

            {model ? (
              <span className="flex items-end" style={modelStyle}>
                {model}
              </span>
            ) : null}
          </div>
        ) : null}

        {line1 ? <p style={line1Style}>{line1}</p> : null}
        {line2 ? <p style={line2Style}>{line2}</p> : null}
      </div>
    </div>
  );
}

export const ROUNDED_TEMPLATE: RegisteredTemplate = defineTemplate({
  meta: {
    id: 'rounded',
    name: '圆角',
    description: '无框圆角图片，下方居中堆叠品牌标志、机型与两行 EXIF 文案。',
    tags: ['无框', '圆角', '品牌'],
  },
  fields: roundedFields,
  // 模板自身没有边框也没有底色，默认不再叠加背景
  backgroundDefaults: {
    mode: 'none',
  },
  component: Rounded,
});
