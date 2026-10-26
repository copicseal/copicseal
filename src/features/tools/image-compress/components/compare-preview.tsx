import { ImageIcon, Loader2, Maximize2, RefreshCw, TriangleAlert } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { platformRuntime } from '@/platform/providers/platform-runtime';
import { useElementSize } from '@/shared/hooks/use-element-size';
import { useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import type { CompressTask } from '../types';
import { formatDimensions, formatFileSize, formatPercent, sizeChange } from '../utils/format';

/** 预览统一按长边 1600 生成：大图也能秒开，且足以看清压缩痕迹。 */
const PREVIEW_EDGE = 1600;

type Zoom = 'fit' | 1 | 2;

interface ComparePreviewProps {
  task: CompressTask | null;
  running: boolean;
  resolveCacheDir: () => Promise<string>;
  onReprocess: (id: string) => void;
}

/**
 * 中栏：真实的前后对比。
 *
 * 两张图都是**真实文件**（源图 / 真实编码产物）经 Rust 解码缩放后生成的预览，
 * 不是示意图；分离线可拖动，缩放支持 适应 / 100% / 200%。
 *
 * 放大后**不用原生滚动条**：改成按住拖动平移（`transform` + 夹取边界），
 * 与左/右栏的 Radix ScrollArea 保持一致的自绘滚动条观感。
 */
export function ComparePreview({
  task,
  running,
  resolveCacheDir,
  onReprocess,
}: ComparePreviewProps) {
  const t = useTranslate();
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [panning, setPanning] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);
  const size = useElementSize(containerRef);

  /** 当前布局与视口尺寸：拖动平移时用来夹取边界（避免闭包拿到旧值） */
  const layoutRef = useRef({ displayWidth: 1, displayHeight: 1, viewWidth: 0, viewHeight: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const panStart = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const sourcePath = task?.path ?? null;

  // 原图预览（换图时重置对比状态）
  useEffect(() => {
    let cancelled = false;
    setBeforeUrl(null);
    setNatural(null);
    setSplit(50);
    setImageError(false);

    if (!sourcePath || task?.blockedReason) {
      return () => {
        cancelled = true;
      };
    }

    void resolveCacheDir()
      .then((cacheDir) => platformRuntime.createImagePreview(sourcePath, cacheDir, PREVIEW_EDGE))
      .then((url) => {
        if (!cancelled) {
          // 原生路径必须转成 asset 协议地址，直接给 <img> 是加载不出来的
          setBeforeUrl(platformRuntime.toNativeFileUrl(url));
        }
      })
      .catch((error) => {
        console.warn('生成原图预览失败:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [sourcePath, task?.blockedReason, resolveCacheDir]);

  // 压缩结果预览（真实产物）
  useEffect(() => {
    let cancelled = false;
    setAfterUrl(null);

    // 依赖整个 result：重新压缩后即使目标路径不变（同名覆盖），result 也是新对象，
    // 这个 effect 就会重跑，预览才不会停在旧产物上
    const result = task?.result ?? null;
    const path = result?.output_path ?? null;

    if (!path) {
      return () => {
        cancelled = true;
      };
    }

    void resolveCacheDir()
      .then((cacheDir) => platformRuntime.createImagePreview(path, cacheDir, PREVIEW_EDGE))
      .then((url) => {
        if (!cancelled) {
          setAfterUrl(platformRuntime.toNativeFileUrl(url));
        }
      })
      .catch((error) => {
        console.warn('生成压缩结果预览失败:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [task?.result, resolveCacheDir]);

  // 分割线拖动
  useEffect(() => {
    if (!dragging) {
      return;
    }

    const move = (event: PointerEvent) => {
      const rect = imageRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) {
        return;
      }
      const ratio = ((event.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(100, Math.max(0, ratio)));
    };
    const stop = () => setDragging(false);

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
  }, [dragging]);

  const clampPan = useCallback((x: number, y: number) => {
    const { displayWidth, displayHeight, viewWidth, viewHeight } = layoutRef.current;
    const maxX = Math.max(0, (displayWidth - viewWidth) / 2);
    const maxY = Math.max(0, (displayHeight - viewHeight) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, []);

  // 缩放后按住拖动平移
  useEffect(() => {
    if (!panning) {
      return;
    }

    const move = (event: PointerEvent) => {
      const start = panStart.current;
      if (!start) {
        return;
      }

      const next = clampPan(
        start.x + (event.clientX - start.px),
        start.y + (event.clientY - start.py),
      );
      panRef.current = next;
      setPan(next);
    };
    const stop = () => {
      panStart.current = null;
      setPanning(false);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
  }, [panning, clampPan]);

  // 布局基准：优先用真实加载出来的预览像素；还没加载完先用探测到的尺寸顶上，
  // 避免图片加载期间出现 0×0 的空洞
  const base = natural ?? (task ? { width: task.width, height: task.height } : null);

  const fitScale =
    base && size.width > 0 && size.height > 0
      ? Math.min((size.width - 16) / base.width, (size.height - 16) / base.height)
      : 1;
  const scale = zoom === 'fit' ? Math.max(0.05, fitScale) : zoom;
  const displayWidth = base ? Math.max(1, Math.round(base.width * scale)) : 1;
  const displayHeight = base ? Math.max(1, Math.round(base.height * scale)) : 1;
  const canPan = displayWidth > size.width + 1 || displayHeight > size.height + 1;

  layoutRef.current = {
    displayWidth,
    displayHeight,
    viewWidth: size.width,
    viewHeight: size.height,
  };
  panRef.current = pan;

  // 换图 / 换缩放档位时回到中心（key 变化即重置平移）
  const panResetKey = `${sourcePath ?? ''}:${String(zoom)}`;
  useEffect(() => {
    if (!panResetKey) {
      return;
    }
    panRef.current = { x: 0, y: 0 };
    setPan({ x: 0, y: 0 });
  }, [panResetKey]);

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !canPan) {
      return;
    }

    panStart.current = {
      px: event.clientX,
      py: event.clientY,
      x: panRef.current.x,
      y: panRef.current.y,
    };
    setPanning(true);
  };

  const result = task?.result ?? null;
  const change = task && result ? sizeChange(task.size, result.output_bytes) : null;

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/80 bg-card/40">
      <header className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="truncate text-xs font-medium">
          {task ? task.name : t('compress.preview.empty')}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {(['fit', 1, 2] as Zoom[]).map((option) => (
            <Button
              key={String(option)}
              size="sm"
              variant={zoom === option ? 'secondary' : 'ghost'}
              className="h-6 px-1.5 text-[10px]"
              onClick={() => setZoom(option)}
              disabled={!beforeUrl}
            >
              {option === 'fit' ? <Maximize2 className="size-3" /> : null}
              {option === 'fit'
                ? t('compress.preview.fit')
                : option === 1
                  ? t('compress.preview.zoomActual')
                  : t('compress.preview.zoomDouble')}
            </Button>
          ))}

          {task && !task.blockedReason ? (
            <Button
              size="icon-sm"
              variant="ghost"
              title={t('compress.preview.reprocess')}
              aria-label={t('compress.preview.reprocess')}
              disabled={running}
              onClick={() => onReprocess(task.id)}
            >
              <RefreshCw />
            </Button>
          ) : null}
        </div>
      </header>

      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden bg-muted/20">
        {!task ? (
          <Hint icon={<ImageIcon className="size-5" />} text={t('compress.preview.empty')} />
        ) : task.blockedReason ? (
          <Hint
            icon={<TriangleAlert className="size-5 text-destructive" />}
            text={task.blockedReason}
          />
        ) : !beforeUrl ? (
          <Hint
            icon={<Loader2 className="size-5 animate-spin" />}
            text={
              task.status === 'running'
                ? t('compress.preview.running')
                : t('compress.preview.pending')
            }
          />
        ) : imageError ? (
          <Hint
            icon={<TriangleAlert className="size-5 text-destructive" />}
            text={t('compress.preview.failed')}
          />
        ) : (
          <div
            ref={imageRef}
            className={cn(
              'absolute top-1/2 left-1/2 shrink-0 overflow-hidden rounded select-none',
              canPan && 'cursor-grab',
              panning && 'cursor-grabbing',
            )}
            style={{
              width: displayWidth,
              height: displayHeight,
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
            }}
            onPointerDown={handlePanStart}
          >
            <img
              src={beforeUrl}
              alt={t('compress.preview.before')}
              draggable={false}
              className="absolute inset-0 h-full w-full"
              onLoad={(event) =>
                setNatural({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              onError={() => setImageError(true)}
            />

            {afterUrl ? (
              <>
                <img
                  src={afterUrl}
                  alt={t('compress.preview.after')}
                  draggable={false}
                  className="absolute inset-0 h-full w-full"
                  style={{ clipPath: `inset(0 0 0 ${split}%)` }}
                />
                <div
                  className="absolute inset-y-0 z-10 w-0.5 cursor-ew-resize bg-primary/80"
                  style={{ left: `${split}%` }}
                  onPointerDown={(event) => {
                    // 拖分割线时不要顺带开始平移
                    event.stopPropagation();
                    setDragging(true);
                  }}
                >
                  <span className="absolute top-1/2 left-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-0.5 rounded-full border border-primary/50 bg-background shadow">
                    <span className="block h-2.5 w-0.5 bg-primary" />
                    <span className="block h-2.5 w-0.5 bg-primary" />
                  </span>
                </div>
              </>
            ) : null}

            <span className="pointer-events-none absolute top-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {t('compress.preview.before')}
            </span>
            {afterUrl ? (
              <span className="pointer-events-none absolute top-1 right-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {t('compress.preview.after')}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {task && !task.blockedReason ? (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {t('compress.preview.resolution', {
              width: task.width,
              height: task.height,
            })}{' '}
            · {formatFileSize(task.size)}
          </span>

          {result ? (
            <>
              <span className="text-muted-foreground/60">→</span>
              <span className="tabular-nums">
                {formatDimensions(result.output_width, result.output_height)} ·{' '}
                {formatFileSize(result.output_bytes)}
              </span>
              {change ? (
                <span
                  className={cn(
                    'font-medium tabular-nums',
                    change.bigger
                      ? 'text-destructive'
                      : change.percent > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground',
                  )}
                >
                  {change.bigger ? '+' : ''}
                  {formatPercent(-change.percent)}
                </span>
              ) : null}
              {result.quality_used !== null ? (
                <span>{t('compress.preview.quality', { value: result.quality_used })}</span>
              ) : null}
              {result.elapsed_ms > 0 ? (
                <span className="tabular-nums">
                  {t('compress.preview.elapsed', {
                    value: (result.elapsed_ms / 1000).toFixed(1),
                  })}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground/70">
              {afterUrl ? t('compress.preview.dragHint') : t('compress.preview.pending')}
            </span>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Hint({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-3">
      <div className="flex max-w-[240px] flex-col items-center gap-2 text-center text-[11px] text-muted-foreground">
        {icon}
        <p className="leading-4">{text}</p>
      </div>
    </div>
  );
}
