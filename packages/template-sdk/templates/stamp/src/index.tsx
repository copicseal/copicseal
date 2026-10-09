import {
  defineTemplate,
  formatExifText,
  getBrandLogoSvg,
  getBrandLogoUrl,
  normalizeBrand,
  normalizeModelName,
  type TemplateField,
  type TemplateInjectedProps,
  type TemplateParams,
  useImageAspect,
} from '@copicseal/template-sdk';
import postmarkSource from '../assets/postmark.svg';

/**
 * 邮戳的 CSS 可用 data URL。
 *
 * SVG 是文本资源，esbuild 的 `dataurl` loader 不会替它编码，直接塞进 CSS
 * `url()` 会因为里面的空格和引号变成非法值（遮罩静默失效）。这里显式百分号编码，
 * 并把 `(` `)` 也编码掉，保证放到带引号的 `url("…")` 里一定安全。
 */
const postmarkUrl = `data:image/svg+xml,${encodeURIComponent(postmarkSource)
  .replace(/\(/g, '%28')
  .replace(/\)/g, '%29')}`;

/**
 * 复古邮票（测试模板）。
 *
 * 想验证的东西：
 * - 五种字段类型（number / color / select / boolean / text）都能在宿主属性面板里生成控件；
 * - 品牌工具（单色 SVG 与彩色 Logo 两条路径）能从宿主注入的运行时拿到；
 * - 静态资源（邮戳 SVG）被 esbuild 以 dataurl 打进包内，运行时不需要任何外部请求；
 * - hooks（useImageAspect 内部的 useState）在「宿主内联调用 render」这一契约下工作。
 */
const stampFields = [
  {
    key: 'borderPadding',
    label: '相框边距',
    description: '相对画布宽度的比例。',
    type: 'number',
    default: 0.014,
    min: 0,
    max: 0.06,
    step: 0.002,
  },
  { key: 'borderColor', label: '相框颜色', type: 'color', default: '#f7f4ec' },
  {
    key: 'perforation',
    label: '齿孔强度',
    description: '邮票边缘的虚线齿孔；三档用来演示 select 字段。',
    type: 'select',
    default: 'soft',
    options: [
      { label: '无', value: 'none' },
      { label: '轻微', value: 'soft' },
      { label: '明显', value: 'strong' },
    ],
  },
  { key: 'postmark', label: '盖邮戳', type: 'boolean', default: true },
  {
    key: 'postmarkColor',
    label: '邮戳颜色',
    type: 'color',
    default: '#b03a2e',
    visibleWhen: { key: 'postmark', equals: [true] },
  },
  { key: 'textColor', label: '文字颜色', type: 'color', default: '#1a1a1a' },
  { key: 'fontScale', label: '文字缩放', type: 'number', default: 1, min: 0.5, max: 2, step: 0.1 },
  {
    key: 'text1',
    label: '行程文案',
    type: 'text',
    default: '{FocalLength}  {FNumber}  {ExposureTime}  ISO {ISO}',
  },
  { key: 'text2', label: '时间文案', type: 'text', default: '{DateTaken}' },
] as const satisfies readonly TemplateField[];

type StampParams = TemplateParams<typeof stampFields>;

const TEXT_RATIO = 0.015;
const DATE_RATIO = 0.012;
const LOGO_MAX_HEIGHT_RATIO = 0.03;
const LOGO_MAX_WIDTH_RATIO = 0.09;
const POSTMARK_RATIO = 0.3;

function Stamp({
  photoUrl,
  exif,
  borderPadding,
  borderColor,
  perforation,
  postmark,
  postmarkColor,
  textColor,
  fontScale,
  text1,
  text2,
}: TemplateInjectedProps & StampParams) {
  const { aspect, handleLoad } = useImageAspect(photoUrl);

  const brand = normalizeBrand(exif?.make);
  const model = normalizeModelName(exif?.model);
  const logoSvg = getBrandLogoSvg(exif?.make, exif?.model);
  const logoUrl = logoSvg ? null : getBrandLogoUrl(exif?.make, exif?.model);

  const line1 = formatExifText(text1, exif);
  const line2 = formatExifText(text2, exif);

  const outline =
    perforation === 'none'
      ? undefined
      : `${perforation === 'strong' ? 2 : 1}px dashed color-mix(in srgb, ${textColor} ${
          perforation === 'strong' ? 55 : 28
        }%, transparent)`;

  return (
    <div
      style={{
        position: 'relative',
        boxSizing: 'border-box',
        width: 'calc(var(--co-base) * 1)',
        padding: `calc(var(--co-base) * ${borderPadding})`,
        backgroundColor: borderColor,
        color: textColor,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          outline,
          outlineOffset: `calc(var(--co-base) * ${-borderPadding * 0.45})`,
        }}
      >
        <img
          data-co-photo=""
          src={photoUrl}
          alt=""
          onLoad={handleLoad}
          style={{
            display: 'block',
            width: '100%',
            aspectRatio: String(aspect),
            objectFit: 'cover',
          }}
        />

        {postmark ? (
          <span
            style={{
              position: 'absolute',
              right: '4%',
              bottom: '6%',
              width: `calc(var(--co-base) * ${POSTMARK_RATIO})`,
              height: `calc(var(--co-base) * ${POSTMARK_RATIO})`,
              backgroundColor: postmarkColor,
              opacity: 0.85,
              transform: 'rotate(-12deg)',
              // 编码后的 data URL：整体当遮罩用，颜色由上方的 backgroundColor 决定
              maskImage: `url("${postmarkUrl}")`,
              WebkitMaskImage: `url("${postmarkUrl}")`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
          />
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.5em',
          marginTop: `calc(var(--co-base) * ${borderPadding} * 0.9)`,
          paddingLeft: `calc(var(--co-base) * 0.004)`,
          paddingRight: `calc(var(--co-base) * 0.004)`,
          fontSize: `calc(var(--co-base) * ${TEXT_RATIO} * ${fontScale})`,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.5em', fontWeight: 600 }}>
          {logoSvg ? (
            <span
              style={{ display: 'flex', color: textColor }}
              dangerouslySetInnerHTML={{ __html: logoSvg }}
            />
          ) : logoUrl ? (
            <img
              src={logoUrl}
              alt={brand}
              style={{
                display: 'block',
                height: 'auto',
                width: 'auto',
                maxHeight: `calc(var(--co-base) * ${LOGO_MAX_HEIGHT_RATIO} * ${fontScale})`,
                maxWidth: `calc(var(--co-base) * ${LOGO_MAX_WIDTH_RATIO} * ${fontScale})`,
                objectFit: 'contain',
              }}
            />
          ) : (
            <span>{brand}</span>
          )}
          {model ? <span style={{ whiteSpace: 'nowrap' }}>{model}</span> : null}
        </span>

        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          {line1 ? <span style={{ whiteSpace: 'nowrap', lineHeight: 1.3 }}>{line1}</span> : null}
          {line2 ? (
            <span
              style={{
                fontSize: `calc(var(--co-base) * ${DATE_RATIO} * ${fontScale})`,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                color: `color-mix(in srgb, ${textColor} 55%, transparent)`,
              }}
            >
              {line2}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

export default defineTemplate({
  meta: {
    id: 'stamp',
    name: '复古邮票',
    description: '白边相框 + 齿孔 + 邮戳，左下品牌机型、右下两段 EXIF 文案。',
    tags: ['相框', '复古', '测试模板'],
  },
  fields: stampFields,
  backgroundDefaults: { mode: 'none' },
  component: Stamp,
});
