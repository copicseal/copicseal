/**
 * 品牌与机型展示工具。
 *
 * Logo 按「规范化后的品牌名 → 大写键」查表；单色版（`*.auto.svg`）使用
 * `currentColor`，可以跟随文字颜色一起上色。
 *
 * 机型/品牌**显示名**的改写规则不在这里：它们已经搬进「设置 → 边框水印 → EXIF」的
 * 字段映射表（默认值见 `exif-format.ts` 的 `DEFAULT_EXIF_MAPPINGS`），用户可以自己增删。
 * 本文件只保留「根据 make / model 挑哪张 Logo」所需的品牌规范化——即使把 Sony 的显示名
 * 改成「索尼」，也仍然能选到 `SONY.svg`。
 */

const logoModules = import.meta.glob('../../../assets/logos/*.svg', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const logoSvgModules = import.meta.glob('../../../assets/logos/*.auto.svg', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

/** 从 `Sony.svg` / `Sony.auto.svg` 这类路径取出大写品牌键。 */
function brandKeyOf(path: string): string {
  const file = path.split('/').pop() ?? '';
  return (file.split('.')[0] ?? '').toUpperCase();
}

const logoUrlMap: Record<string, string> = {};
const logoSvgMap: Record<string, string> = {};

for (const [path, url] of Object.entries(logoModules)) {
  // `*.svg` 也会匹配到单色版，这里排除，避免覆盖彩色版
  if (path.endsWith('.auto.svg')) {
    continue;
  }
  logoUrlMap[brandKeyOf(path)] = url;
}

/**
 * 内联用的 SVG 源码清理。
 *
 * 原始文件带 BOM 与 `<?xml … ?>` 声明：直接塞进 `dangerouslySetInnerHTML` 时，
 * 前者会渲染成一个占位的行内字符、后者变成注释节点，它们和真正的 `<svg>`
 * 会在同一行盒里排布，把标志挤出垂直居中（白框 / 圆角模板里表现为标志下沉）。
 * 这里只保留 `<svg>` 本身，内联结果与普通元素一样可预测。
 */
function toInlineSvg(svg: string): string {
  return svg
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml[\s\S]*?\?>/i, '')
    .trim();
}

for (const [path, svg] of Object.entries(logoSvgModules)) {
  logoSvgMap[brandKeyOf(path)] = toInlineSvg(svg);
}

/** 厂商品牌别名：把 EXIF 里的原始写法映射到统一展示名。 */
const BRAND_ALIASES: Record<string, string> = {
  SONY: 'Sony',
  LEICA: 'Leica',
  OM: 'Olympus',
  OLYMPUS: 'Olympus',
  NIKON: 'Nikon',
  PANASONIC: 'Lumix',
  PENTAX: 'PENTAX',
  RICOH: 'RICOH',
};

/**
 * 品牌名规范化。
 *
 * 先精确匹配别名，再做大小写不敏感的词边界模糊匹配（覆盖 “SONY CORPORATION”
 * 这类写法），最后回退为「保留原词、首字母大写」。对已规范化的输入是幂等的，
 * 因此 Web 与桌面端都套用同一套逻辑也不会二次改写。
 */
export function normalizeBrand(make?: string | null): string {
  const trimmed = (make ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const exact = BRAND_ALIASES[trimmed.toUpperCase()];
  if (exact) {
    return exact;
  }

  const aliasKeys = Object.keys(BRAND_ALIASES);
  const fuzzy = aliasKeys.find((key) => new RegExp(`\\b${key}\\b`, 'i').test(trimmed));
  if (fuzzy) {
    return BRAND_ALIASES[fuzzy];
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** 机型名的展示规则已经搬去设置里的映射表，这里不再参与改写。 */

/** 依次用 make 与 model 尝试命中品牌，返回命中的大写键。 */
function resolveBrandKey(make?: string | null, model?: string | null): string | null {
  for (const candidate of [make, model]) {
    const key = normalizeBrand(candidate).toUpperCase();
    if (key && (logoSvgMap[key] || logoUrlMap[key])) {
      return key;
    }
  }

  return null;
}

/** 品牌彩色 Logo 的资源地址；未内置该品牌时返回 null。 */
export function getBrandLogoUrl(make?: string | null, model?: string | null): string | null {
  const key = resolveBrandKey(make, model);
  return key ? (logoUrlMap[key] ?? null) : null;
}

/** 品牌单色 Logo 的原始 SVG 源码；可配合 `currentColor` 上色。 */
export function getBrandLogoSvg(make?: string | null, model?: string | null): string | null {
  const key = resolveBrandKey(make, model);
  return key ? (logoSvgMap[key] ?? null) : null;
}
