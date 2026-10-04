/**
 * 等宽字体栈。
 *
 * 与 Tailwind 默认的 `--font-mono` 取值一致（项目没有覆盖它）：以前模板直接写
 * `font-mono` 类名，接上「全局字体」后改由 `fontDefaults` 声明，两者的观感不变，
 * 用户选了字体时又会被用户的选择覆盖。
 */
export const MONO_FONT_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
