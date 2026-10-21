import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import {
  type AccentTheme,
  applyAccentTheme,
  applyResolvedTheme,
  DEFAULT_THEME,
  getSystemTheme,
  isAccentTheme,
  type ResolvedTheme,
  readCachedAccent,
  resolveTheme,
  type Theme,
} from '@/shared/lib/theme';

type ThemeContextValue = {
  /** 偏好，可能是 `system`；持久化由调用方负责（设置页写配置） */
  theme: Theme;
  /** 实际生效的外观 */
  resolvedTheme: ResolvedTheme;
  /** 只切当前会话（立即生效） */
  setTheme: (theme: Theme) => void;
  /** 主题色：强调色的色相 */
  accent: AccentTheme;
  /** 只切当前会话（立即生效） */
  setAccent: (accent: AccentTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [accent, setAccentState] = useState<AccentTheme>(readCachedAccent);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme = resolveTheme(theme, systemTheme);

  // 启动时读一次持久化配置；读不到就沿用首帧脚本按系统上好的色
  useEffect(() => {
    let cancelled = false;

    void platformRuntime
      .getConfig()
      .then((config) => {
        if (cancelled) {
          return;
        }

        if (config?.theme) {
          setThemeState(config.theme as Theme);
        }

        if (isAccentTheme(config?.accent)) {
          setAccentState(config.accent);
        }
      })
      .catch((error) => {
        console.warn('读取主题配置失败:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 跟随系统时盯着系统外观变化
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemTheme(query.matches ? 'dark' : 'light');

    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  // 主题色落后于配置之后生效；首帧由 index.html 的内联脚本先按缓存上色
  useEffect(() => {
    applyAccentTheme(accent);
  }, [accent]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const setAccent = useCallback((next: AccentTheme) => {
    setAccentState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ accent, resolvedTheme, setAccent, setTheme, theme }),
    [accent, resolvedTheme, setAccent, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme 必须在 ThemeProvider 内使用');
  }

  return context;
}
