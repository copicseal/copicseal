/** 主题偏好：跟随系统 / 浅色 / 深色，与配置里的 `theme` 字段一一对应。 */
export type Theme = 'system' | 'light' | 'dark';

/** 实际生效的外观（一定不是 system）。 */
export type ResolvedTheme = 'light' | 'dark';

export const DEFAULT_THEME: Theme = 'system';

export const THEME_OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: 'system', label: '' },
  { value: 'light', label: '' },
  { value: 'dark', label: '' },
];

/**
 * 首帧前用到的外观缓存。
 *
 * 配置存在数据库里、读出来是异步的，等它回来再切主题会白闪一下；
 * 所以把上一次解析出的外观写进 localStorage，`index.html` 里的内联脚本先按它上色，
 * 配置读回来后再由 ThemeProvider 校正（走 `system` 且系统没变时结果一致，不会闪）。
 */
export const THEME_STORAGE_KEY = 'copicseal-theme';

export const DARK_CLASS = 'dark';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(
  theme: Theme,
  system: ResolvedTheme = getSystemTheme(),
): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') {
    return theme;
  }

  return system;
}

/** 把外观落到 `<html>`：class 供 Tailwind 的 dark 变体识别，color-scheme 让原生控件（滚动条、表单）跟着变。 */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle(DARK_CLASS, resolved === 'dark');
  root.style.colorScheme = resolved;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, resolved);
  } catch (error) {
    // 隐私模式等场景下写不进去也不该影响切换
    console.warn('缓存主题失败:', error);
  }
}

/**
 * 主题色（强调色族）。
 *
 * 只换强调色的色相：`primary` / `ring` / `accent` / `sidebar-*` / `chart-*`。
 * 中性灰与亮暗两套外观不变，所以各主题色之间的对比度、层次完全一致。
 * 取值与 `app.css` 里的 `[data-accent='…']` 块一一对应；`blue` 是默认值，不落属性。
 */
export type AccentTheme =
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'teal'
  | 'emerald'
  | 'amber'
  | 'terracotta'
  | 'graphite';

/** 设置页里的展示顺序（按色相绕一圈）。 */
export const ACCENT_THEMES: readonly AccentTheme[] = [
  'blue',
  'indigo',
  'violet',
  'teal',
  'emerald',
  'amber',
  'terracotta',
  'graphite',
];

export const DEFAULT_ACCENT: AccentTheme = 'blue';

/** 首帧用的主题色缓存（与 `THEME_STORAGE_KEY` 同一套防白闪思路）。 */
export const ACCENT_STORAGE_KEY = 'copicseal-accent';

export function isAccentTheme(value: unknown): value is AccentTheme {
  return typeof value === 'string' && (ACCENT_THEMES as readonly string[]).includes(value);
}

/** 读首帧缓存；没有或非法都回落到默认值。 */
export function readCachedAccent(): AccentTheme {
  if (typeof window === 'undefined') {
    return DEFAULT_ACCENT;
  }

  try {
    const cached = window.localStorage.getItem(ACCENT_STORAGE_KEY);

    return isAccentTheme(cached) ? cached : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

/** 把主题色落到 `<html data-accent>`：默认蓝色由 `:root` 提供，所以默认值要把属性删掉。 */
export function applyAccentTheme(accent: AccentTheme): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;

  if (accent === DEFAULT_ACCENT) {
    delete root.dataset.accent;
  } else {
    root.dataset.accent = accent;
  }

  try {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch (error) {
    console.warn('缓存主题色失败:', error);
  }
}
