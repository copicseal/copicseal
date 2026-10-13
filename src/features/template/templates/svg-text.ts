/**
 * SVG 文本处理。
 *
 * 内置资产（`*.auto.svg`）与用户自己导入的 SVG 都要先过这里：
 * 前者需要去掉 BOM 与 XML 声明，后者还要额外清掉可执行内容——它会被内联进
 * `dangerouslySetInnerHTML`，内联的 SVG 里 `<script>` 是会真的跑起来的。
 */

/**
 * 去掉 BOM 与 `<?xml … ?>`，只保留 `<svg>` 本体。
 *
 * 直接塞进 `dangerouslySetInnerHTML` 时，BOM 会渲染成占位字符、XML 声明会变成注释节点，
 * 它们与真正的 `<svg>` 在同一行盒里排布，把标志挤出垂直居中。
 */
export function toInlineSvg(svg: string): string {
  return svg
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml[\s\S]*?\?>/i, '')
    .trim();
}

/**
 * 清理用户导入的 SVG，返回可安全内联的源码；不像 SVG 就返回 null（调用方回落 `<img>`）。
 *
 * 规则：去掉 `<script>` / `<foreignObject>`、`on*` 事件属性、`javascript:` 与
 * `data:text/html` 这类可执行 URL。只做减法，不改动绘图内容。
 */
export function sanitizeCustomSvg(svg: string): string | null {
  const cleaned = toInlineSvg(svg)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    // 事件属性：双引号、单引号、无引号三种写法都要覆盖
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // 可执行 URL（href / xlink:href / src），保留普通外链与 #fragment 引用
    .replace(
      /(href|xlink:href|src)\s*=\s*("\s*(?:javascript|data:text\/html)[^"]*"|'\s*(?:javascript|data:text\/html)[^']*')/gi,
      '',
    )
    // style / CSS 里剩下的 javascript: 也一并去掉
    .replace(/javascript:/gi, '');

  return /<svg[\s>]/i.test(cleaned) ? cleaned : null;
}
