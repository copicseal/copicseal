import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AppConfig, WindowFrameMode } from '@/platform';
import { platformRuntime } from '@/platform/providers/platform-runtime';

const { applyWindowFrameMode, getConfig, updateConfig } = platformRuntime;

export type WindowStyleVariant = 'mac' | 'win';

const DEFAULT_WINDOW_FRAME_MODE: WindowFrameMode = 'frameless';

interface WindowStyleContextValue {
  variant: WindowStyleVariant;
  frameMode: WindowFrameMode;
  frameModePending: boolean;
  setFrameMode: (mode: WindowFrameMode) => Promise<void>;
}

const WindowStyleContext = createContext<WindowStyleContextValue | null>(null);

function normalizeWindowFrameMode(value: string | null | undefined): WindowFrameMode {
  return value === 'native' ? 'native' : DEFAULT_WINDOW_FRAME_MODE;
}

function detectWindowStyleVariant(): WindowStyleVariant {
  if (typeof navigator === 'undefined') {
    return 'win';
  }

  const navigatorWithUserAgentData = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  const platform =
    navigatorWithUserAgentData.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent;
  return /mac/i.test(platform) ? 'mac' : 'win';
}

export function WindowStyleProvider({ children }: PropsWithChildren) {
  const variant = useMemo(() => detectWindowStyleVariant(), []);
  const configRef = useRef<AppConfig | null>(null);
  const [frameMode, setFrameModeState] = useState<WindowFrameMode>(DEFAULT_WINDOW_FRAME_MODE);
  const [frameModePending, setFrameModePending] = useState(false);

  const ensureConfig = useCallback(async () => {
    if (configRef.current) {
      return configRef.current;
    }

    const config = await getConfig();
    configRef.current = config;
    return config;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncWindowFrameMode = async () => {
      try {
        const config = await ensureConfig();
        const nextMode = normalizeWindowFrameMode(config.window_frame_mode);
        if (cancelled) {
          return;
        }

        setFrameModeState(nextMode);
        await applyWindowFrameMode(nextMode);
      } catch (error) {
        console.error('Load window frame mode failed:', error);
      }
    };

    void syncWindowFrameMode();

    return () => {
      cancelled = true;
    };
  }, [ensureConfig]);

  const setFrameMode = useCallback(
    async (mode: WindowFrameMode) => {
      const nextMode = normalizeWindowFrameMode(mode);
      const previousMode = frameMode;

      if (previousMode === nextMode) {
        return;
      }

      setFrameModeState(nextMode);
      setFrameModePending(true);

      try {
        await applyWindowFrameMode(nextMode);

        const config = await ensureConfig();
        const updated: AppConfig = {
          ...config,
          window_frame_mode: nextMode,
        };

        await updateConfig(updated);
        configRef.current = updated;
      } catch (error) {
        console.error('Switch window frame mode failed:', error);
        setFrameModeState(previousMode);
      } finally {
        setFrameModePending(false);
      }
    },
    [ensureConfig, frameMode],
  );

  const value = useMemo(
    () => ({
      variant,
      frameMode,
      frameModePending,
      setFrameMode,
    }),
    [frameMode, frameModePending, setFrameMode, variant],
  );

  return <WindowStyleContext.Provider value={value}>{children}</WindowStyleContext.Provider>;
}

export function useWindowStyle() {
  const context = useContext(WindowStyleContext);
  if (!context) {
    throw new Error('useWindowStyle must be used within WindowStyleProvider');
  }

  return context;
}
