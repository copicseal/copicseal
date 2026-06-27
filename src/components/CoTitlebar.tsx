import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CoTitlebarProps {
  title?: string;
}

function canUseTauriWindowApi() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function CoTitlebar({ title = 'Copicseal' }: CoTitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauriWindow, setIsTauriWindow] = useState(false);

  useEffect(() => {
    if (!canUseTauriWindowApi()) {
      return;
    }

    const appWindow = getCurrentWindow();
    setIsTauriWindow(true);

    const syncWindowState = async () => {
      try {
        setIsMaximized(await appWindow.isMaximized());
      } catch {
        setIsMaximized(false);
      }
    };

    void syncWindowState();

    let cleanup: (() => void) | undefined;

    try {
      const unlisten = appWindow.onResized(() => {
        void syncWindowState();
      });

      cleanup = () => {
        unlisten.then((fn) => fn());
      };
    } catch {
      cleanup = undefined;
    }

    return () => {
      cleanup?.();
    };
  }, []);

  const handleMinimize = async () => {
    if (!isTauriWindow) {
      return;
    }

    await getCurrentWindow().minimize();
  };

  const handleToggleMaximize = async () => {
    if (!isTauriWindow) {
      return;
    }

    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
    setIsMaximized(await appWindow.isMaximized());
  };

  const handleClose = async () => {
    if (!isTauriWindow) {
      return;
    }

    await getCurrentWindow().close();
  };

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center border-b border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--color-card),white_12%)_0%,color-mix(in_oklch,var(--color-background),var(--color-muted)_18%)_100%)]">
      <div
        className="flex min-w-0 flex-1 items-center gap-3 px-3"
        data-tauri-drag-region={isTauriWindow ? true : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Template-driven desktop image studio
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 px-2">
        <button
          type="button"
          aria-label="最小化窗口"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground',
            !isTauriWindow && 'opacity-50',
          )}
          onClick={() => void handleMinimize()}
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? '还原窗口' : '最大化窗口'}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground',
            !isTauriWindow && 'opacity-50',
          )}
          onClick={() => void handleToggleMaximize()}
        >
          <Square className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="关闭窗口"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/12 hover:text-destructive',
            !isTauriWindow && 'opacity-50',
          )}
          onClick={() => void handleClose()}
        >
          <X className="size-4" />
        </button>
      </div>
    </header>
  );
}
