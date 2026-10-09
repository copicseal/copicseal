import {
  defineTemplate,
  formatExifText,
  type TemplateField,
  type TemplateInjectedProps,
  type TemplateParams,
  useImageAspect,
} from '@copicseal/template-sdk';

/**
 * 胶片条（测试模板）。
 *
 * 主要验证两件事：
 * - `visibleWhen` 条件字段：`gridOpacity` 只在 `showGrid` 打开时出现在属性面板上；
 * - 嵌套布局（照片区 + 信息条）与百分比定位在 `--co-base` 口径下是否稳定。
 */
const filmstripFields = [
  {
    key: 'stripHeight',
    label: '信息条高度',
    description: '相对画布宽度的比例。',
    type: 'number',
    default: 0.11,
    min: 0.04,
    max: 0.24,
    step: 0.005,
  },
  { key: 'stripColor', label: '信息条颜色', type: 'color', default: '#14141a' },
  { key: 'textColor', label: '文字颜色', type: 'color', default: '#f2f2f2' },
  { key: 'showGrid', label: '九宫格', type: 'boolean', default: false },
  {
    key: 'gridOpacity',
    label: '九宫格不透明度',
    type: 'number',
    default: 0.35,
    min: 0,
    max: 1,
    step: 0.05,
    visibleWhen: { key: 'showGrid', equals: [true] },
  },
  { key: 'fontScale', label: '文字缩放', type: 'number', default: 1, min: 0.5, max: 2, step: 0.1 },
  { key: 'caption', label: '标题文案', type: 'text', default: '{Make} {Model}' },
  {
    key: 'meta',
    label: '参数文案',
    type: 'text',
    default: '{FocalLength} · {FNumber} · {ExposureTime} · ISO {ISO}',
  },
] as const satisfies readonly TemplateField[];

type FilmstripParams = TemplateParams<typeof filmstripFields>;

const CAPTION_RATIO = 0.019;
const META_RATIO = 0.013;

function Filmstrip({
  photoUrl,
  exif,
  stripHeight,
  stripColor,
  textColor,
  showGrid,
  gridOpacity,
  fontScale,
  caption,
  meta,
}: TemplateInjectedProps & FilmstripParams) {
  const { aspect, handleLoad } = useImageAspect(photoUrl);

  const captionText = formatExifText(caption, exif);
  const metaText = formatExifText(meta, exif);
  const gridColor = `color-mix(in srgb, #ffffff ${Math.round(gridOpacity * 100)}%, transparent)`;

  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: 'calc(var(--co-base) * 1)',
        backgroundColor: stripColor,
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', lineHeight: 0 }}>
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

        {showGrid ? (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderLeft: `1px solid ${gridColor}`,
              borderRight: `1px solid ${gridColor}`,
              backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
              backgroundSize: '33.333% 33.333%',
              backgroundPosition: 'left top',
            }}
          />
        ) : null}
      </div>

      <div
        style={{
          boxSizing: 'border-box',
          height: `calc(var(--co-base) * ${stripHeight})`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '0.15em',
          paddingLeft: `calc(var(--co-base) * 0.02)`,
          paddingRight: `calc(var(--co-base) * 0.02)`,
          color: textColor,
        }}
      >
        <span
          style={{
            fontSize: `calc(var(--co-base) * ${CAPTION_RATIO} * ${fontScale})`,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontWeight: 600,
          }}
        >
          {captionText}
        </span>
        {metaText ? (
          <span
            style={{
              fontSize: `calc(var(--co-base) * ${META_RATIO} * ${fontScale})`,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: `color-mix(in srgb, ${textColor} 70%, transparent)`,
            }}
          >
            {metaText}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default defineTemplate({
  meta: {
    id: 'filmstrip',
    name: '胶片条',
    description: '照片下方接一条深色信息条，可叠加可选九宫格。',
    tags: ['信息条', '测试模板'],
  },
  fields: filmstripFields,
  backgroundDefaults: { mode: 'none' },
  component: Filmstrip,
});
