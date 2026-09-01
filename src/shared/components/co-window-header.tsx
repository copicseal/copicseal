import { type LucideIcon, Minus, Square, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { platformRuntime } from '@/platform/providers/platform-runtime';

const {
  closeWindow,
  getWindowMaximized,
  isNativeWindowAvailable,
  minimizeWindow,
  onWindowResize,
  toggleMaximizeWindow,
} = platformRuntime;

import { cn } from '@/shared/lib/utils';
import { useWindowStyle } from '@/shared/providers/window-style-provider';

interface CoWindowHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: ReactNode;
}

function RestoreWindowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className="size-4">
      <title>还原窗口</title>
      <path d="M5.5 4.5H11.5V10.5H5.5z" />
      <path d="M4.5 6.5H3.5V12.5H9.5V11.5" />
    </svg>
  );
}

export function CoWindowHeader({ icon: Icon, title, description, actions }: CoWindowHeaderProps) {
  const { variant, frameMode } = useWindowStyle();
  const [isMaximized, setIsMaximized] = useState(false);
  const showCustomWindowControls =
    isNativeWindowAvailable() && variant === 'win' && frameMode === 'frameless';

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const syncMaximized = async () => {
      try {
        setIsMaximized(await getWindowMaximized());
      } catch (error) {
        console.error('Read window maximize state failed:', error);
      }
    };

    void syncMaximized();

    onWindowResize(() => {
      void syncMaximized();
    })
      .then((cleanup) => {
        unlisten = cleanup;
      })
      .catch((error) => {
        console.error('Listen window resize failed:', error);
      });

    return () => {
      unlisten?.();
    };
  }, []);

  const runWindowAction = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      console.error('Window action failed:', error);
    }
  };

  return (
    <div
      data-tauri-drag-region={frameMode === 'frameless' ? true : undefined}
      className={cn(
        'relative flex items-center gap-3 border-b border-border/80 bg-background/96 px-4 py-2.5 backdrop-blur-sm',
        showCustomWindowControls && 'pr-34',
      )}
    >
      <div
        className="flex min-w-0 flex-1 items-center gap-3"
        data-tauri-drag-region={frameMode === 'frameless' ? true : undefined}
      >
        <div
          className="pointer-events-none flex size-9 shrink-0 items-center justify-center border border-border/80 bg-card text-primary shadow-sm"
          data-tauri-drag-region={frameMode === 'frameless' ? true : undefined}
        >
          <Icon className="size-4" />
        </div>
        <div
          className="pointer-events-none min-w-0"
          data-tauri-drag-region={frameMode === 'frameless' ? true : undefined}
        >
          <h1
            className="truncate text-sm font-semibold tracking-tight text-foreground"
            data-tauri-drag-region={frameMode === 'frameless' ? true : undefined}
          >
            {title}
          </h1>
          <p
            className="truncate text-[11px] text-muted-foreground"
            data-tauri-drag-region={frameMode === 'frameless' ? true : undefined}
          >
            {description}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2" data-tauri-drag-region="false">
        {actions}
        {showCustomWindowControls ? (
          <div
            className="absolute top-0 right-0 flex h-10 items-stretch bg-background/96"
            data-tauri-drag-region="false"
          >
            <button
              type="button"
              aria-label="最小化窗口"
              className="flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              onClick={() => void runWindowAction(minimizeWindow)}
            >
              <Minus className="size-4" />
            </button>
            <button
              type="button"
              aria-label={isMaximized ? '还原窗口' : '最大化窗口'}
              className="flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              onClick={() => void runWindowAction(toggleMaximizeWindow)}
            >
              {isMaximized ? <RestoreWindowIcon /> : <Square className="size-3.5" />}
            </button>
            <button
              type="button"
              aria-label="关闭窗口"
              className="flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-[#e81123] hover:text-white"
              onClick={() => void runWindowAction(closeWindow)}
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
