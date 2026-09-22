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
    description: '支持 {Model} 这类 EXIF 变量，留空即不绘制水印层。',
    type: 'text',
    default: '@柯灰',
  },
  { key: 'textColor', label: '文字颜色', type: 'color', default: '#ffffff' },
  {
    key: 'textOpacity',
    label: '文字不透明度',
    description: '0 为完全透明、1 为完全不透明，与文字颜色分开调整。',
    type: 'number',
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'rotate',
    label: '文字角度',
    description: '单位为度，直接填角度；-45 与旧版 3.15×100 的倾斜方向一致。',
    type: 'number',
    default: -45,
    min: -180,
    max: 180,
    step: 1,
  },
  {
    key: 'fontSize',
    label: '文字大小',
    description: '相对瓦片宽度的比例，0.2 即约占瓦片宽度的 20%。',
    type: 'number',
    default: 0.2,
    min: 0.02,
    max: 1,
    step: 0.01,
  },
  {
    key: 'tileWidth',
    label: '瓦片宽度',
    description: '相对画布宽度的比例，0.15 约等于旧版的 1rem 瓦片。',
    type: 'number',
    default: 0.15,
    min: 0.01,
    max: 1,
    step: 0.005,
  },
  {
    key: 'tileHeight',
    label: '瓦片高度',
    description: '相对画布宽度的比例，与瓦片宽度共同决定平铺密度。',
    type: 'number',
    default: 0.15,
    min: 0.01,
    max: 1,
    step: 0.005,
  },
] as const satisfies readonly TemplateField[];

type WatermarkParams = TemplateParams<typeof watermarkFields>;

/**
 * SVG 内部坐标系的边长。
 *
 * 瓦片的 SVG `width` / `height` / `viewBox` 与 CSS `background-size` 都由同一组
 * `tileWidth` / `tileHeight` 比例乘以这个常量得到，因此两者长宽比永远一致，瓦片不会变形。
 */
const SVG_TILE_UNITS = 100;

/** 参数兜底：即使被外部写成 0 或负值，也不会塌缩出零尺寸瓦片与零号字。 */
const MIN_TILE_RATIO = 0.001;
const MIN_FONT_RATIO = 0.001;

/** 水印字体栈：不跟随 EXIF 变化，直接用跨平台的无衬线字体。 */
const WATERMARK_FONT_FAMILY = 'Inter, Helvetica Neue, Arial, sans-serif';

/** 转义 XML 特殊字符，避免用户文案里的 `&`、`<` 破坏 SVG 结构。 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 收敛浮点误差，让 data URL 里的坐标保持短小可读。 */
function round(value: number): number {
  return Number(value.toFixed(3));
}

interface WatermarkTileOptions {
  text: string;
  color: string;
  opacity: number;
  rotate: number;
  /** 相对瓦片宽度的字号比例 */
  fontSize: number;
  /** SVG 坐标系下的瓦片宽度 */
  width: number;
  /** SVG 坐标系下的瓦片高度 */
  height: number;
}

/**
 * 把一段文字渲染成单个平铺瓦片的 SVG data URL。
 *
 * 文字以瓦片中心为锚点旋转，`dominant-baseline` 与 `text-anchor` 保证垂直居中，
 * 因此旋转后仍落在瓦片正中，平铺时接缝均匀。
 */
function buildWatermarkTile({
  text,
  color,
  opacity,
  rotate,
  fontSize,
  width,
  height,
}: WatermarkTileOptions): string {
  const centerX = round(width / 2);
  const centerY = round(height / 2);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}"` +
    ` viewBox="0 0 ${round(width)} ${round(height)}">` +
    `<text x="${centerX}" y="${centerY}" fill="${color}" fill-opacity="${round(opacity)}"` +
    ` font-size="${round(width * fontSize)}" font-family="${WATERMARK_FONT_FAMILY}"` +
    ` text-anchor="middle" dominant-baseline="middle"` +
    ` transform="rotate(${round(rotate)} ${centerX} ${centerY})">${escapeXml(text)}</text>` +
    '</svg>';

  // 用 percent-encoding 而不是 base64：无需 btoa，中文文案与 `#` 颜色都能安全入 URL
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 平铺水印模板：主图铺满画布，上面叠一层可调角度、字号与密度的重复水印。 */
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

  // 水印文案同样支持 EXIF 变量，缺字段时会被替换为空串
  const watermarkText = formatExifText(text, exif);
  const tileWidthRatio = Math.max(tileWidth, MIN_TILE_RATIO);
  const tileHeightRatio = Math.max(tileHeight, MIN_TILE_RATIO);
  const fontScale = Math.max(fontSize, MIN_FONT_RATIO);

  const tileUrl = watermarkText
    ? buildWatermarkTile({
        text: watermarkText,
        color: textColor,
        opacity: textOpacity,
        rotate,
        fontSize: fontScale,
        width: tileWidthRatio * SVG_TILE_UNITS,
        height: tileHeightRatio * SVG_TILE_UNITS,
      })
    : null;

  const canvasStyle: TemplateStyle = {
    '--co-tile-width': tileWidthRatio,
    '--co-tile-height': tileHeightRatio,
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

      {tileUrl ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${tileUrl}")`,
            backgroundRepeat: 'repeat',
            backgroundSize:
              'calc(var(--co-base) * var(--co-tile-width)) ' +
              'calc(var(--co-base) * var(--co-tile-height))',
          }}
        />
      ) : null}
    </div>
  );
}

export const WATERMARK_TEMPLATE: RegisteredTemplate = defineTemplate({
  meta: {
    id: 'watermark',
    name: '平铺水印',
    description: '整图铺满画布，叠加一层可调角度与透明度的平铺水印。',
    tags: ['水印', '平铺'],
  },
  fields: watermarkFields,
  // 模板自带整图，默认不再叠加外框背景
  backgroundDefaults: {
    mode: 'none',
  },
  component: Watermark,
});
