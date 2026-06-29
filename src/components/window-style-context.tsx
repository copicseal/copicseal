import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';

export type WindowStyleVariant = 'mac' | 'win';

interface WindowStyleContextValue {
  variant: WindowStyleVariant;
}

const WindowStyleContext = createContext<WindowStyleContextValue | null>(null);

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
  const value = useMemo(
    () => ({
      variant: detectWindowStyleVariant(),
    }),
    [],
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
