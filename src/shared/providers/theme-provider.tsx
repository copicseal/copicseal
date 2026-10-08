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
  applyResolvedTheme,
  DEFAULT_THEME,
  getSystemTheme,
  type ResolvedTheme,
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
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme = resolveTheme(theme, systemTheme);

  // 启动时读一次持久化配置；读不到就沿用首帧脚本按系统上好的色
  useEffect(() => {
    let cancelled = false;

    void platformRuntime
      .getConfig()
      .then((config) => {
        if (!cancelled && config?.theme) {
          setThemeState(config.theme as Theme);
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

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
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
