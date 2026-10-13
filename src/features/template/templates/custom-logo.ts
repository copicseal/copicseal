import type { CustomLogo } from '@/platform/contracts';
import { getBrandLogoSvg, getBrandLogoUrl } from './brand';

/**
 * 已经解析好的自定义 Logo：配置条目 + 能在画布上直接用的资源。
 *
 * `url` 走 asset 协议（工作区 `Logos/` 下的文件）；`svg` 只有自定义 SVG 才有，
 * 用于内联渲染（这样用 `currentColor` 的 SVG 能跟随文字颜色）。
 */
export interface CustomLogoEntry extends CustomLogo {
  url: string;
  svg: string | null;
}

/** 模板注入用的 Logo 覆盖：命中自定义条目时用它顶替内置品牌图。 */
export interface CustomLogoOverride {
  url: string;
  svg: string | null;
  /** 这条是兜底条目（没有关键字命中时才用，且不抢内置品牌） */
  fallback: boolean;
}

/** 关键字比较用：去掉首尾空白并转小写。 */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** 候选品牌串：EXIF 的 make 与 model，与内置 logo 的选图口径一致。 */
function candidates(make?: string | null, model?: string | null): string[] {
  return [make, model].filter((value): value is string => Boolean(value?.trim()));
}

/**
 * 按 EXIF 的品牌 / 机型挑自定义 Logo。
 *
 * - 关键字的匹配方式是**包含**（大小写不敏感）：填 `SONY` 时 `SONY CORPORATION` 也能命中
 * - 数组顺序即优先级，命中多条时取第一条（设置页可以上移调整）
 * - 都没有命中时，才轮到 `catch_all` 的兜底条目
 */
export function matchCustomLogo(
  entries: readonly CustomLogoEntry[],
  make?: string | null,
  model?: string | null,
): CustomLogoOverride | null {
  if (entries.length === 0) {
    return null;
  }

  const values = candidates(make, model).map(normalize);

  if (values.length > 0) {
    for (const entry of entries) {
      const keywords = entry.keywords.map(normalize).filter(Boolean);
      const hit = keywords.some((keyword) => values.some((value) => value.includes(keyword)));

      if (hit) {
        return { url: entry.url, svg: entry.svg, fallback: false };
      }
    }
  }

  const fallback = entries.find((entry) => entry.catch_all);

  return fallback ? { url: fallback.url, svg: fallback.svg, fallback: true } : null;
}

export interface LogoRender {
  /** 内联渲染的 SVG 源码（含 `currentColor` 的会跟随文字颜色） */
  autoLogo: string | null;
  /** 按原色渲染的图片地址 */
  coloredLogo: string | null;
}

/**
 * 决定这次渲染用哪张 Logo：自定义关键字命中优先，其次内置，最后才轮到兜底条目。
 *
 * 兜底条目的语义就是字面意思——**品牌没被认出来**时才用：所以它不抢内置品牌，
 * 例如加了兜底图之后，SONY 的照片仍然用内置的 SONY 标志；没有品牌（常见于手动镜头、
 * 不写 EXIF 的机身）才落到兜底图。想让某个品牌用自定义图，给它加关键字即可。
 *
 * 「logo 跟随文字颜色」只对能内联的 SVG 有意义：
 * 关掉开关时自定义 SVG 也走 `<img>`（保持原色），自定义位图则始终按原色渲染。
 */
export function resolveLogoRender(options: {
  override: CustomLogoOverride | null;
  logoColorAuto: boolean;
  make?: string | null;
  model?: string | null;
}): LogoRender {
  const { override, logoColorAuto, make, model } = options;

  const builtInSvg = logoColorAuto ? getBrandLogoSvg(make, model) : null;
  const builtInUrl = getBrandLogoUrl(make, model);
  // 兜底条目在内置品牌能认出来时让位
  const custom = override?.fallback && (builtInSvg || builtInUrl) ? null : override;

  const customSvg = logoColorAuto ? (custom?.svg ?? null) : null;
  const autoLogo = customSvg ?? builtInSvg;
  const coloredLogo = autoLogo ? null : (custom?.url ?? builtInUrl);

  return { autoLogo, coloredLogo };
}
