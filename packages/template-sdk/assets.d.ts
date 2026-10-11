/**
 * 静态资源在打包时的形态（见 scripts/build.mjs 的 loader 配置）：
 *
 * - `*.svg` 走 `text` loader，默认导出的是 **SVG 源码字符串**；
 *   放进 CSS `url()` 前需要自己百分号编码（esbuild 的 dataurl 不编码文本）。
 * - 位图走 `dataurl` loader，默认导出的是可直接使用的 data URL。
 */
declare module '*.svg' {
  const source: string;
  export default source;
}

declare module '*.png' {
  const url: string;
  export default url;
}

declare module '*.jpg' {
  const url: string;
  export default url;
}

declare module '*.webp' {
  const url: string;
  export default url;
}
