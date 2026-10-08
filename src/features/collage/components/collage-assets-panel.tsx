import { ChevronDown, ChevronUp, ImageIcon, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { findSlotIndexAtPoint } from '@/features/collage/lib/dom';
import { useCollageAssetDrag } from '@/features/collage/store/use-asset-drag-store';
import { useCollageStore } from '@/features/collage/store/use-collage-store';
import { CoDropZone } from '@/shared/components/co-drop-zone';
import { usePhotos } from '@/shared/hooks/use-photos';
import { useTranslate } from '@/shared/i18n';
import {
  BusinessWorkbenchAssetsPane,
  type BusinessWorkbenchAssetsRenderProps,
} from '@/shared/layouts/business-workbench';
import { selectPhotosViaDialog } from '@/shared/lib/import-photo';
import { cn } from '@/shared/lib/utils';
import type { ImportedPhoto } from '@/shared/types/photo';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

/** 导入进度：导入过程中素材区会逐步出现缩略图，给一条进度比什么都直观。 */
function ImportProgressPanel({
  current,
  total,
  currentName,
}: {
  current: number;
  total: number;
  currentName: string | null;
}) {
  const t = useTranslate();
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  return (
    <div className="border-b border-border/80 bg-muted/20 px-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[11px] text-muted-foreground">
          {total > 0
            ? currentName
              ? t('collage.assets.importingWithName', { current, total, name: currentName })
              : t('collage.assets.importing', { current, total })
            : t('collage.assets.preparing')}
        </p>
        <p className="shrink-0 text-[11px] font-medium text-muted-foreground">
          {Math.round(progress)}%
        </p>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface CollageAssetsPanelProps extends BusinessWorkbenchAssetsRenderProps {}

/**
 * 跟随光标的拖动浮层。
 *
 * 单独一个组件订阅坐标：素材列表本身不订阅拖拽状态，拖动过程中就不会整块重渲染。
 */
function CollageAssetDragGhost() {
  const payload = useCollageAssetDrag((state) => state.payload);
  const x = useCollageAssetDrag((state) => state.x);
  const y = useCollageAssetDrag((state) => state.y);

  if (!payload) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed z-50 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 border border-primary/60 bg-card/95 px-2 py-1 shadow-lg"
      style={{ left: x, top: y }}
    >
      {payload.previewUrl ? (
        <img src={payload.previewUrl} alt="" className="size-9 object-cover" />
      ) : null}
      <span className="max-w-40 truncate text-[11px] text-foreground">{payload.name}</span>
    </div>
  );
}

export function CollageAssetsPanel({ collapsed, toggleCollapsed }: CollageAssetsPanelProps) {
  const t = useTranslate();
  const {
    photos,
    currentIndex,
    currentPhoto,
    setCurrentIndex,
    replacePhoto,
    removePhoto,
    importViaDialog,
    importViaDrop,
    importState,
  } = usePhotos();
  const { present, assignPhotoToSlot, removePhotoReferences } = useCollageStore();
  const dragRef = useRef<null | {
    photoId: string;
    startX: number;
    startY: number;
    moved: boolean;
  }>(null);
  const suppressClickRef = useRef(false);

  /**
   * 素材卡 → 画布槽位的拖拽。
   *
   * 不用 HTML5 拖放：桌面端原生拖放会截走 webview 内的拖放事件（见 `use-asset-drag-store`），
   * 所以整条链路自己用指针事件实现：按下后移动超过阈值才进入拖拽，松手时命中哪个格子就放哪个。
   */
  const stopDragListeners = useCallback(
    (move: (event: PointerEvent) => void, end: (event: Event) => void) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', end);
    },
    [],
  );

  /**
   * 拖拽过程的指针事件挂在 window 上，而不是只靠 `setPointerCapture`。
   *
   * 光标一旦离开素材卡，事件目标就变成画布里的槽位：只依赖卡片自身的指针捕获，
   * 捕获一旦没生效（或宿主 webview 行为有差异），跨组件拖动就会断在半路。
   */
  const handleDragMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      if (!drag.moved) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) {
          return;
        }

        drag.moved = true;
        suppressClickRef.current = true;
        const photo = photos.find((item) => item.id === drag.photoId);
        useCollageAssetDrag.getState().begin(
          {
            photoId: drag.photoId,
            name: photo?.name ?? '',
            previewUrl: photo?.thumbnailReady ? photo.thumbnailUrl : '',
          },
          event.clientX,
          event.clientY,
        );
      }

      useCollageAssetDrag
        .getState()
        .move(event.clientX, event.clientY, findSlotIndexAtPoint(event.clientX, event.clientY));
    },
    [photos],
  );

  const handleDragEnd = useCallback(
    (event: Event) => {
      const drag = dragRef.current;
      dragRef.current = null;
      stopDragListeners(handleDragMove, handleDragEnd);

      if (!drag?.moved) {
        return;
      }

      // 指针取消或窗口失焦（拖到窗口外松手）时只收尾，不落图
      const hasPoint = 'clientX' in event && 'clientY' in event;
      const slotIndex =
        event.type === 'pointercancel' || !hasPoint
          ? null
          : findSlotIndexAtPoint((event as PointerEvent).clientX, (event as PointerEvent).clientY);

      if (slotIndex !== null) {
        assignPhotoToSlot(slotIndex, drag.photoId);
      }

      useCollageAssetDrag.getState().end();
      // 拖拽结束后紧随其后的 click 不该再当作「选中素材」
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    },
    [assignPhotoToSlot, handleDragMove, stopDragListeners],
  );

  const handleCardPointerDown = (
    event: React.PointerEvent<HTMLLIElement>,
    photo: ImportedPhoto,
  ) => {
    if (event.button !== 0) {
      return;
    }

    dragRef.current = {
      photoId: photo.id,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };

    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handleDragEnd);
    window.addEventListener('pointercancel', handleDragEnd);
    window.addEventListener('blur', handleDragEnd);
  };

  // 组件在拖拽途中被卸载时收尾，别把监听留在 window 上
  useEffect(
    () => () => stopDragListeners(handleDragMove, handleDragEnd),
    [handleDragEnd, handleDragMove, stopDragListeners],
  );

  /** 素材 → 槽位：同一张图可能被放进多格，这里只显示第一个位置。 */
  const slotIndexOf = useMemo(() => {
    const map = new Map<string, number>();
    present.slotItems.forEach((slot, index) => {
      if (slot.photoId && !map.has(slot.photoId)) {
        map.set(slot.photoId, index);
      }
    });
    return map;
  }, [present.slotItems]);

  const firstEmptyIndex = useMemo(
    () => present.slotItems.findIndex((slot) => !slot.photoId),
    [present.slotItems],
  );

  const filledCount = useMemo(
    () => present.slotItems.filter((slot) => slot.photoId).length,
    [present.slotItems],
  );

  const handleReplace = async (photoId: string) => {
    const selected = await selectPhotosViaDialog();
    if (!selected[0]) {
      return;
    }

    replacePhoto(photoId, selected[0]);
  };

  const handlePutIntoSlot = (photoId: string) => {
    if (firstEmptyIndex < 0) {
      return;
    }

    assignPhotoToSlot(firstEmptyIndex, photoId);
  };

  return (
    <BusinessWorkbenchAssetsPane className="overflow-visible border-t border-border p-0">
      <TooltipProvider>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="plain"
                size="icon"
                aria-expanded={!collapsed}
                aria-controls="collage-assets-content"
                aria-label={collapsed ? t('collage.assets.expand') : t('collage.assets.collapse')}
                onClick={toggleCollapsed}
              >
                {collapsed ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {collapsed ? t('collage.assets.expand') : t('collage.assets.collapse')}
            </TooltipContent>
          </Tooltip>
        </div>

        <div id="collage-assets-content" className="flex h-full min-h-0 flex-col overflow-hidden">
          {collapsed ? (
            <div className="flex h-full items-center gap-2 px-4 pt-3 text-xs text-muted-foreground">
              <ImageIcon className="size-3.5" />
              <span>
                {t('collage.assets.summary', { total: photos.length, placed: filledCount })}
              </span>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
                <div className="min-w-0">
                  <h2 className="text-xs font-semibold text-foreground">
                    {t('collage.assets.title')}{' '}
                    <span className="text-muted-foreground">({photos.length})</span>
                  </h2>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {t('collage.assets.hint')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void importViaDialog()}>
                  <ImageIcon data-icon="inline-start" />
                  {t('collage.assets.import')}
                </Button>
              </div>

              {importState.active ? (
                <ImportProgressPanel
                  current={importState.current}
                  total={importState.total}
                  currentName={importState.currentName}
                />
              ) : null}

              <div className="min-h-0 flex-1">
                {photos.length === 0 ? (
                  <CoDropZone
                    onFilesDrop={importViaDrop}
                    className="h-full rounded-none border-0 bg-muted/10"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                      <ImageIcon className="size-5" />
                      <p className="text-xs font-medium">
                        {importState.active
                          ? t('collage.empty.importing')
                          : t('collage.empty.dropHint')}
                      </p>
                      <p className="text-[11px]">
                        {importState.active
                          ? t('collage.empty.importProgressHint')
                          : t('collage.empty.importHint')}
                      </p>
                    </div>
                  </CoDropZone>
                ) : (
                  <ScrollArea
                    horizontalWheelScroll
                    scrollbarOrientation="horizontal"
                    // Radix 会在视口里套一层 `display: table`，而表格的 height 只当「最小高度」，
                    // 于是 ul 的 h-full 会解析成内容高度（被图片原始比例撑高），卡片溢出到视口外被裁掉。
                    // 先把那层改成 block，它的 height:100% 才有意义，卡片高度才会真的等于素材区高度。
                    viewportClassName="[&>div]:!block [&>div]:h-full"
                    className="h-full w-full overflow-hidden"
                  >
                    <ul className="flex h-full w-max min-w-full items-stretch gap-3 px-4 py-3">
                      {photos.map((photo, index) => {
                        const active = index === currentIndex || photo.id === currentPhoto?.id;
                        const slotIndex = slotIndexOf.get(photo.id);

                        return (
                          <li
                            key={photo.id}
                            onPointerDown={(event) => handleCardPointerDown(event, photo)}
                            className={cn(
                              'group flex h-full w-36 shrink-0 cursor-grab select-none flex-col border bg-background transition-colors active:cursor-grabbing',
                              active ? 'border-primary ring-1 ring-primary/20' : 'border-border',
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (suppressClickRef.current) {
                                  return;
                                }
                                setCurrentIndex(index);
                              }}
                              onDoubleClick={() => handlePutIntoSlot(photo.id)}
                              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted/20"
                            >
                              {photo.thumbnailReady ? (
                                <img
                                  src={photo.thumbnailUrl}
                                  alt={photo.name}
                                  draggable={false}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="px-2 text-center text-[11px] text-muted-foreground">
                                  {t('collage.assets.thumbnailPending')}
                                </span>
                              )}
                              {slotIndex !== undefined ? (
                                <span className="absolute top-1 left-1 bg-foreground/75 px-1.5 py-0.5 text-[10px] text-background">
                                  {t('collage.assets.slotBadge', { index: slotIndex + 1 })}
                                </span>
                              ) : null}
                            </button>

                            <div className="shrink-0 border-t border-border/80 px-2 py-1.5">
                              <p className="truncate text-[11px] font-medium text-foreground">
                                {photo.name}
                              </p>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>{(photo.size / 1024 / 1024).toFixed(1)} MB</span>
                                <span className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    title={t('collage.assets.replaceTooltip')}
                                    className="hover:text-foreground"
                                    onClick={() => void handleReplace(photo.id)}
                                  >
                                    <Upload className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    title={t('collage.assets.removeTooltip')}
                                    className="hover:text-foreground"
                                    onClick={() => {
                                      removePhotoReferences(photo.id);
                                      removePhoto(photo.id);
                                    }}
                                  >
                                    <X className="size-3" />
                                  </button>
                                </span>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            </>
          )}
        </div>

        <CollageAssetDragGhost />
      </TooltipProvider>
    </BusinessWorkbenchAssetsPane>
  );
}
