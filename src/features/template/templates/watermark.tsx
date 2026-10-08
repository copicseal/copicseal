import { useId } from 'react';
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
 * 平铺水印的参数声明。
 *
 * 数值字段一律是「相对某个基准的比例」：`tileWidth` / `tileHeight` 相对画布宽度，
 * `fontSize` 相对瓦片宽度。旧版用 `rgba()` 同时表达颜色与透明度，这里拆成
 * `textColor` + `textOpacity`；旧版「参数 ×100 才是角度」的隐式编码也改成直接使用角度。
 */
const watermarkFields = [
  {
    key: 'text',
    label: '水印文字',
    labelKey: 'template.meta.watermark.option.text.label',
    description: '支持 {Model} 这类 EXIF 变量，留空即不绘制水印层。',
    descriptionKey: 'template.meta.watermark.option.text.description',
    type: 'text',
    default: '@柯灰',
  },
  {
    key: 'textColor',
    label: '文字颜色',
    labelKey: 'template.meta.watermark.option.textColor.label',
    type: 'color',
    default: '#ffffff',
  },
  {
    key: 'textOpacity',
    label: '文字不透明度',
    labelKey: 'template.meta.watermark.option.textOpacity.label',
    description: '0 为完全透明、1 为完全不透明，与文字颜色分开调整。',
    descriptionKey: 'template.meta.watermark.option.textOpacity.description',
    type: 'number',
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'rotate',
    label: '文字角度',
    labelKey: 'template.meta.watermark.option.rotate.label',
    description: '单位为度，直接填角度；-45 与旧版 3.15×100 的倾斜方向一致。',
    descriptionKey: 'template.meta.watermark.option.rotate.description',
    type: 'number',
    default: -45,
    min: -180,
    max: 180,
    step: 1,
  },
  {
    key: 'fontSize',
    label: '文字大小',
    labelKey: 'template.meta.watermark.option.fontSize.label',
    description: '相对瓦片宽度的比例，0.2 即约占瓦片宽度的 20%。',
    descriptionKey: 'template.meta.watermark.option.fontSize.description',
    type: 'number',
    default: 0.2,
    min: 0.02,
    max: 1,
    step: 0.01,
  },
  {
    key: 'tileWidth',
    label: '瓦片宽度',
    labelKey: 'template.meta.watermark.option.tileWidth.label',
    description: '相对画布宽度的比例，0.15 约等于旧版的 1rem 瓦片。',
    descriptionKey: 'template.meta.watermark.option.tileWidth.description',
    type: 'number',
    default: 0.15,
    min: 0.01,
    max: 1,
    step: 0.005,
  },
  {
    key: 'tileHeight',
    label: '瓦片高度',
    labelKey: 'template.meta.watermark.option.tileHeight.label',
    description: '相对画布宽度的比例，与瓦片宽度共同决定平铺密度。',
    descriptionKey: 'template.meta.watermark.option.tileHeight.description',
    type: 'number',
    default: 0.15,
    min: 0.01,
    max: 1,
    step: 0.005,
  },
] as const satisfies readonly TemplateField[];

type WatermarkParams = TemplateParams<typeof watermarkFields>;

/** 参数兜底：即使被外部写成 0 或负值，也不会塌缩出零尺寸瓦片与零号字。 */
const MIN_TILE_RATIO = 0.001;
const MIN_FONT_RATIO = 0.001;

/**
 * 用户单位：画布宽度记为 1。
 *
 * 瓦片尺寸与字号都是「相对画布宽度」的比例，正好直接当 SVG 用户单位用；SVG 再靠
 * `viewBox` 缩放到画布宽度，所以这里完全不需要知道画布有多少像素。
 */

/**
 * 平铺水印模板：主图铺满画布，上面叠一层可调角度、字号与密度的重复水印。
 *
 * 平铺用**内联 `<svg>` + `<pattern>`**，而不是把瓦片做成 data URL 当背景图：
 * data URL 是独立文档，拿不到页面的字体（用户选的字体、导入的字体都吃不到），
 * 内联 SVG 则属于文档本身，字体直接继承画布根——预览与导出因此都能用上同一个字体，
 * 也不需要把字体字节塞进瓦片里。矢量绘制还顺带保证了导出时任意倍率都清晰。
 */
function Watermark({
  photoUrl,
  exif,
  text,
  textColor,
  textOpacity,
  rotate,
  fontSize,
  tileWidth,
  tileHeight,
}: TemplateInjectedProps & WatermarkParams) {
  const { aspect, handleLoad } = useImageAspect(photoUrl);
  // 同一页面可能同时挂着多个实例（keep-alive 的多个页面），id 必须唯一
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const patternId = `co-watermark-pattern-${uid}`;
  const clipId = `co-watermark-clip-${uid}`;

  // 水印文案同样支持 EXIF 变量，缺字段时会被替换为空串
  const watermarkText = formatExifText(text, exif);
  const tileWidthRatio = Math.max(tileWidth, MIN_TILE_RATIO);
  const tileHeightRatio = Math.max(tileHeight, MIN_TILE_RATIO);
  const fontScale = Math.max(fontSize, MIN_FONT_RATIO);

  // 画布高度按照片比例：坐标系是「宽 1 × 高 1/aspect」。
  // 注意 aspect 是**宽/高**（与 CSS aspect-ratio 同义），别写反——写反后
  // preserveAspectRatio="none" 会把文字整体压扁
  const canvasHeight = Number.isFinite(aspect) && aspect > 0 ? 1 / aspect : 1;
  const centerX = tileWidthRatio / 2;
  const centerY = tileHeightRatio / 2;

  const canvasStyle: TemplateStyle = {
    position: 'relative',
    width: 'calc(var(--co-base) * 1)',
    overflow: 'hidden',
  };

  return (
    <div style={canvasStyle}>
      <img
        data-co-photo=""
        src={photoUrl}
        alt=""
        className="block object-contain"
        style={{
          width: 'calc(var(--co-base) * 1)',
          aspectRatio: String(aspect),
        }}
        onLoad={handleLoad}
      />

      {watermarkText ? (
        <svg
          aria-hidden="true"
          viewBox={`0 0 1 ${canvasHeight}`}
          // 画布宽高比与 viewBox 一致，none 只是为了避免亚像素误差带来的缝隙
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            {/* 内容按瓦片自身坐标裁剪，旋转后的文字不会溢出到相邻瓦片上 */}
            <clipPath id={clipId}>
              <rect width={tileWidthRatio} height={tileHeightRatio} />
            </clipPath>
            <pattern
              id={patternId}
              width={tileWidthRatio}
              height={tileHeightRatio}
              patternUnits="userSpaceOnUse"
            >
              <text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={tileWidthRatio * fontScale}
                fill={textColor}
                fillOpacity={textOpacity}
                clipPath={`url(#${clipId})`}
                transform={`rotate(${rotate} ${centerX} ${centerY})`}
              >
                {watermarkText}
              </text>
            </pattern>
          </defs>
          <rect width={1} height={canvasHeight} fill={`url(#${patternId})`} />
        </svg>
      ) : null}
    </div>
  );
}

export const WATERMARK_TEMPLATE: RegisteredTemplate = defineTemplate({
  meta: {
    id: 'watermark',
    name: '平铺水印',
    nameKey: 'template.meta.watermark.name',
    description: '整图铺满画布，叠加一层可调角度与透明度的平铺水印。',
    descriptionKey: 'template.meta.watermark.description',
    tags: ['水印', '平铺'],
    tagKeys: ['template.meta.watermark.tag.watermark', 'template.meta.watermark.tag.tiled'],
  },
  fields: watermarkFields,
  // 模板自带整图，默认不再叠加外框背景
  backgroundDefaults: {
    mode: 'none',
  },
  component: Watermark,
});
