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
