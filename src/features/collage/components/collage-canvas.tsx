import { ImagePlus, Loader2, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { findCollageLayout } from '@/features/collage/layouts';
import {
  clamp,
  createEmptySlotState,
  getAspectRatioText,
  getAspectRatioValue,
  getCanvasDesignWidth,
  getFreeSlotRect,
  getObjectPosition,
  getPaddedSlotRect,
  getSlotTransform,
} from '@/features/collage/lib';
import { findSlotIndexAtPoint } from '@/features/collage/lib/dom';
import { useCollageAssetDrag } from '@/features/collage/store/use-asset-drag-store';
import type { CollageZoom } from '@/features/collage/store/use-collage-store';
import { useCollageStore } from '@/features/collage/store/use-collage-store';
import { useElementSize } from '@/shared/hooks/use-element-size';
import { usePhotos } from '@/shared/hooks/use-photos';
import { useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import type { CollageSlotState } from '../types';

const SCALE_VAR = '--co-collage-scale';

/** 拖拽判定阈值：小于它只算点击，避免手抖把点击变成换位。 */
const DRAG_THRESHOLD = 4;

/** 预览缩放档位，与「边框水印」模块的预览档位保持一致。 */
const ZOOM_OPTIONS: CollageZoom[] = ['fit', 0.5, 1, 2];

type DragKind = 'reorder' | 'pan' | 'move';

interface DragState {
  kind: DragKind;
  index: number;
  startX: number;
  startY: number;
  /** 拖拽开始时的整个 present 快照，松手后据此提交一次历史 */
  snapshotSlot: CollageSlotState;
  box: { width: number; height: number };
  /**
   * 每个轴可平移的像素范围（图片按 cover 溢出格子的部分 × 缩放）。
   *
   * 取景写的是 `object-position` 百分比，1% 对应的位移是「溢出量」而不是格子宽度；
   * 拿格子宽度换算会让图片只走指针的一半，必须按溢出量算才能 1:1 跟手。
   */
  panRangeX: number;
  panRangeY: number;
  moved: boolean;
  hoverIndex: number | null;
}

/** 设计基准下的像素值 → 当前渲染尺寸下的 CSS 值。 */
function scaled(value: number): string {
  return `calc(${value}px * var(${SCALE_VAR}, 1))`;
}

export function CollageCanvas({
  previewRef,
  exporting = false,
}: {
  previewRef: React.RefObject<HTMLDivElement | null>;
  /** 导出期间画布会被临时放大到输出尺寸，需要盖一层遮罩挡住尺寸跳变 */
  exporting?: boolean;
}) {
  const t = useTranslate();
  const { photos, currentPhoto } = usePhotos();
  const {
    present,
    selectedSlotIndex,
    tool,
    zoom,
    selectSlot,
    assignPhotoToSlot,
    moveSlot,
    updateSlot,
    resetSlot,
    previewSlot,
    applySlotDrag,
    setZoom,
  } = useCollageStore();

  // 素材区拖进来的悬停高亮（原生拖放被桌面端截走，所以拖拽会话在素材区那一侧）
  const assetDragActive = useCollageAssetDrag((state) => state.payload !== null);
  const assetDragOverIndex = useCollageAssetDrag((state) => state.overSlotIndex);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportSize = useElementSize(viewportRef);
  const canvasSize = useElementSize(previewRef);
  const [dragging, setDragging] = useState<{ from: number; over: number | null } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  /** 这一次按下的格子：空格子上松手时用来把当前素材填进去 */
  const pressIndexRef = useRef<number | null>(null);

  const layout = useMemo(() => findCollageLayout(present.layoutId), [present.layoutId]);
  const mode = present.canvas.layoutMode;
  const ratioValue = getAspectRatioValue(present.canvas);
  /** 长图的横轴设计尺寸（竖向导的是宽，横向导的是高）；网格/自由用统一基准宽度。 */
  const crossDesign = getCanvasDesignWidth(present.canvas);
  const horizontalLong = mode === 'long' && present.canvas.longDirection === 'horizontal';

  const photoMap = useMemo(() => new Map(photos.map((photo) => [photo.id, photo])), [photos]);

  /**
   * 画布在设计基准下的尺寸。
   *
   * 网格 / 自由：宽高都由比例决定。
   * 长图：横轴是已知的 `crossDesign`，主轴由内容决定——主轴那一侧只能从**实测宽高比**反推
   * （`实测尺寸 × 已知横轴 ÷ 另一侧实测值`）。不能拿假定倍率去除：那得到的是放大后的长度，
   * fit 会在「撑满宽」与「撑满高」之间来回跳，整条长图永远塞不进视口。
   */
  const designSize = useMemo(() => {
    if (mode !== 'long') {
      return { width: crossDesign, height: crossDesign / ratioValue };
    }

    if (canvasSize.width <= 0 || canvasSize.height <= 0) {
      return { width: crossDesign, height: crossDesign };
    }

    return horizontalLong
      ? { width: (canvasSize.width * crossDesign) / canvasSize.height, height: crossDesign }
      : { width: crossDesign, height: (canvasSize.height * crossDesign) / canvasSize.width };
  }, [canvasSize.height, canvasSize.width, crossDesign, horizontalLong, mode, ratioValue]);

  /** fit 倍率：让设计尺寸正好放进视口。 */
  const fitScale = useMemo(() => {
    const availableWidth = Math.max(viewportSize.width - 64, 120);
    const availableHeight = Math.max(viewportSize.height - 64, 120);
    return clamp(
      Math.min(availableWidth / designSize.width, availableHeight / designSize.height),
      0.05,
      2,
    );
  }, [designSize.height, designSize.width, viewportSize.height, viewportSize.width]);

  const factor = zoom === 'fit' ? fitScale : zoom;

  /**
   * 导出期间冻结预览尺寸。
   *
   * 导出把画布改成目标像素后，元素尺寸变化会触发 `useElementSize` 重新测量 → `fitScale`
   * 重算（长图模式的 fit 依赖实测宽高比）→ React 把宽度改回预览值，导出的那一帧就白改了。
   * 冻结成「开始导出前的值」：React 的 style diff 看到 props 没变，就不会去覆写适配器写进去的尺寸。
   */
  const frozenPreviewRef = useRef({ factor, size: designSize });
  if (!exporting) {
    frozenPreviewRef.current = { factor, size: designSize };
  }
  const appliedFactor = exporting ? frozenPreviewRef.current.factor : factor;
  const appliedSize = exporting ? frozenPreviewRef.current.size : designSize;
  const appliedWidth = appliedSize.width * appliedFactor;
  const appliedHeight = appliedSize.height * appliedFactor;

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>, index: number) => {
    const slot = present.slotItems[index];
    if (!slot) {
      return;
    }

    selectSlot(index);
    pressIndexRef.current = index;

    // 事件挂在 window 上：光标移出这一格（甚至移出画布）时事件目标会变成别的元素，
    // 只靠 setPointerCapture 的重定向一旦不生效，拖动就会断在半路。
    // 空槽位不进入拖拽会话，但同样要等 pointerup 才能判断这是不是一次「点击填充」。
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    // 长图里每行是等比缩放的整张图，没有「取景」可调，拖动一律当换位
    const kind: DragKind =
      mode === 'free' ? 'move' : mode === 'long' ? 'reorder' : tool === 'pan' ? 'pan' : 'reorder';
    // 空格子只能被放入，不能拖走：否则会把空洞推给别的槽位
    if (!slot.photoId) {
      return;
    }

    window.addEventListener('pointermove', handlePointerMove);
    const box = event.currentTarget.getBoundingClientRect();
    const image = event.currentTarget.querySelector('img');
    const natural =
      image && image.naturalWidth > 0
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : null;
    const coverScale = natural
      ? Math.max(box.width / natural.width, box.height / natural.height)
      : 0;

    dragRef.current = {
      kind,
      index,
      startX: event.clientX,
      startY: event.clientY,
      snapshotSlot: { ...slot },
      box,
      panRangeX: natural ? Math.max(slot.scale * (natural.width * coverScale - box.width), 0) : 0,
      panRangeY: natural ? Math.max(slot.scale * (natural.height * coverScale - box.height), 0) : 0,
      moved: false,
      hoverIndex: null,
    };
    setDragging({ from: index, over: null });
  };

  const handlePointerMove = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) {
      return;
    }

    drag.moved = true;

    if (drag.kind === 'pan') {
      // 1:1 跟手：像素位移 ÷ 该轴溢出量 = 百分比增量；本来就没溢出的轴不动，免得存下无意义的值
      previewSlot(drag.index, {
        offsetX:
          drag.panRangeX > 1
            ? clamp(drag.snapshotSlot.offsetX + (deltaX / drag.panRangeX) * 100, -50, 50)
            : drag.snapshotSlot.offsetX,
        offsetY:
          drag.panRangeY > 1
            ? clamp(drag.snapshotSlot.offsetY + (deltaY / drag.panRangeY) * 100, -50, 50)
            : drag.snapshotSlot.offsetY,
      });
      return;
    }

    if (drag.kind === 'move') {
      const canvasBox = previewRef.current?.getBoundingClientRect();
      previewSlot(drag.index, {
        freeX: clamp(
          drag.snapshotSlot.freeX + (deltaX / Math.max(canvasBox?.width ?? 1, 1)) * 100,
          -10,
          95,
        ),
        freeY: clamp(
          drag.snapshotSlot.freeY + (deltaY / Math.max(canvasBox?.height ?? 1, 1)) * 100,
          -10,
          95,
        ),
      });
      return;
    }

    const hoverIndex = findSlotIndexAtPoint(event.clientX, event.clientY);
    drag.hoverIndex = hoverIndex;
    setDragging({ from: drag.index, over: hoverIndex });
  };

  const handlePointerUp = (event: PointerEvent) => {
    const drag = dragRef.current;
    const pressedIndex = pressIndexRef.current;
    dragRef.current = null;
    pressIndexRef.current = null;
    setDragging(null);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);

    if (!drag) {
      // 空格子上的单击：把当前选中的素材填进去（和「点击填充」的提示一致）
      if (
        pressedIndex !== null &&
        !present.slotItems[pressedIndex]?.photoId &&
        currentPhoto &&
        event.type !== 'pointercancel'
      ) {
        assignPhotoToSlot(pressedIndex, currentPhoto.id);
      }
      return;
    }

    if (!drag.moved) {
      return;
    }

    if (drag.kind === 'reorder') {
      if (drag.hoverIndex === null || drag.hoverIndex === drag.index) {
        return;
      }

      moveSlot(drag.index, drag.hoverIndex);
      selectSlot(drag.hoverIndex);
      return;
    }

    // 平移/移动：拖拽过程只改 present，松手时回到起点再提交一次，撤销栈里只留一条
    const current = useCollageStore.getState().present.slotItems[drag.index];
    applySlotDrag(drag.index, drag.snapshotSlot, {
      offsetX: current?.offsetX ?? 0,
      offsetY: current?.offsetY ?? 0,
      freeX: current?.freeX ?? 0,
      freeY: current?.freeY ?? 0,
    });
  };

  const handleDoubleClick = (index: number) => {
    if (mode === 'free') {
      const empty = createEmptySlotState(index);
      updateSlot(index, { freeX: empty.freeX, freeY: empty.freeY, freeW: empty.freeW });
      return;
    }

    resetSlot(index);
  };

  // 缩放只作用于单格：用原生监听才能阻止画布滚动；
  // 连续滚轮只在停下来之后提交一条历史，避免撤销栈被每一格滚动塞满。
  //
  // 监听挂在 window 上而不是视口元素上：没有素材时画布走的是空状态分支，
  // 视口元素根本不存在，effect 里取 ref 会是 null 且之后再也不会重跑——
  // 挂 window、在处理器里判断事件是否落在视口内，才不受挂载时序影响。
  useEffect(() => {
    let gesture: { index: number; slot: CollageSlotState } | null = null;
    let timer: number | undefined;

    const flush = () => {
      if (!gesture) {
        return;
      }

      const { index, slot } = gesture;
      gesture = null;
      const current = useCollageStore.getState().present.slotItems[index];
      if (current) {
        applySlotDrag(index, slot, { scale: current.scale });
      }
    };

    const handleWheel = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !viewportRef.current?.contains(target)) {
        return;
      }

      const slotElement = target.closest<HTMLElement>('[data-collage-slot]');
      if (!slotElement) {
        return;
      }

      const index = Number(slotElement.dataset.collageSlot);
      const slot = useCollageStore.getState().present.slotItems[index];
      if (!slot?.photoId || useCollageStore.getState().tool !== 'pan') {
        return;
      }

      event.preventDefault();
      if (gesture?.index !== index) {
        flush();
        gesture = { index, slot: { ...slot } };
      }

      const step = event.deltaY > 0 ? -0.06 : 0.06;
      previewSlot(index, { scale: clamp(Number((slot.scale + step).toFixed(2)), 0.2, 4) });
      selectSlot(index);
      window.clearTimeout(timer);
      timer = window.setTimeout(flush, 420);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.clearTimeout(timer);
      flush();
      window.removeEventListener('wheel', handleWheel);
    };
  }, [applySlotDrag, previewSlot, selectSlot]);

  const unusedCount = useMemo(() => {
    const used = new Set(present.slotItems.map((slot) => slot.photoId).filter(Boolean));
    return photos.filter((photo) => !used.has(photo.id)).length;
  }, [photos, present.slotItems]);

  if (photos.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
        <ImagePlus className="size-14 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('collage.empty.previewTitle')}
          </h1>
          <p className="mt-2 text-sm leading-6">{t('collage.empty.previewDescription')}</p>
        </div>
      </div>
    );
  }

  const renderPhoto = (slot: CollageSlotState, extraClassName: string) => {
    const photo = slot.photoId ? photoMap.get(slot.photoId) : null;
    if (!photo) {
      return null;
    }

    return (
      <img
        src={photo.previewUrl}
        alt={photo.name}
        draggable={false}
        className={cn(
          'pointer-events-none select-none',
          // 单格可以选「填满」（裁掉超出部分）或「完整显示」（留出背景）
          slot.fit === 'contain' ? 'object-contain' : 'object-cover',
          extraClassName,
        )}
        style={{
          objectPosition: getObjectPosition(slot),
          transform: getSlotTransform(slot),
        }}
      />
    );
  };

  const slotBorderRadius = (slot: CollageSlotState) =>
    scaled(slot.borderRadius ?? present.canvas.borderRadius);

  const slotShadow = () =>
    present.canvas.shadow > 0
      ? `0 ${scaled(14)} ${scaled(28)} ${scaled(-18)} rgba(15, 23, 42, ${Math.min(
          present.canvas.shadow / 100,
          0.35,
        )})`
      : 'none';

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div
        className={cn(
          'relative flex min-h-0 min-w-0 flex-1',
          tool === 'pan' ? 'cursor-grab' : 'cursor-default',
        )}
      >
        <ScrollArea
          viewportRef={viewportRef}
          // 导出期间画布会被临时放大到目标像素，此时不显示滚动条，避免预览抖动
          scrollbarOrientation={exporting ? 'none' : 'both'}
          className="min-h-0 min-w-0 flex-1"
        >
          <div
            className="box-border flex items-center justify-center p-8"
            style={{
              // 最小尺寸等于视口：装得下时居中，装不下时随内容一起增长而不是被裁掉。
              // 向下取整，避免亚像素让滚动区凭空多出 1px 而冒出滚动条
              minWidth: Math.floor(viewportSize.width),
              minHeight: Math.floor(viewportSize.height),
            }}
          >
            <div
              ref={previewRef}
              data-co-collage-canvas
              className={cn(
                'relative shrink-0 overflow-hidden ring-1 ring-border/70',
                mode === 'long' && 'flex',
              )}
              style={
                {
                  // 长图里主轴必须由内容撑开（竖向=高、横向=宽），把它写死会把内容裁掉；
                  // 网格/自由把宽高都写成**显式像素**：只靠 aspect-ratio 时 WebKit 不把派生高度当成
                  // 「确定高度」，格子里 `img` 的 `height:100%` 会失效、图片按原始尺寸渲染
                  //（预览里只看到图片中间一小条，导出却正常——导出适配器本来就会写成显式像素）
                  width: horizontalLong ? undefined : `${appliedWidth}px`,
                  height: mode === 'long' && !horizontalLong ? undefined : `${appliedHeight}px`,
                  backgroundColor: present.canvas.backgroundColor,
                  backgroundImage: present.canvas.backgroundImage
                    ? `linear-gradient(rgba(255,255,255,0.16), rgba(255,255,255,0.16)), url(${present.canvas.backgroundImage})`
                    : undefined,
                  backgroundPosition: 'center',
                  backgroundSize: 'cover',
                  boxShadow: `0 ${scaled(18)} ${scaled(48)} ${scaled(-28)} rgba(15, 23, 42, 0.45)`,
                  ...(mode === 'long'
                    ? {
                        flexDirection:
                          present.canvas.longDirection === 'vertical' ? 'column' : 'row',
                        alignItems:
                          present.canvas.longAlign === 'start'
                            ? 'flex-start'
                            : present.canvas.longAlign === 'center'
                              ? 'center'
                              : 'flex-end',
                        gap: scaled(present.canvas.gap),
                        padding: scaled(present.canvas.padding),
                      }
                    : {}),
                  [SCALE_VAR]: String(appliedFactor),
                } as React.CSSProperties
              }
            >
              {mode === 'grid' ? (
                <div className="absolute inset-0">
                  {present.slotItems.map((slot, index) => {
                    const layoutSlot = layout.slots[index];
                    if (!layoutSlot) {
                      return null;
                    }

                    const photo = slot.photoId ? photoMap.get(slot.photoId) : null;

                    const rect = getPaddedSlotRect(layoutSlot, present.canvas, {
                      width: crossDesign,
                      height: crossDesign / ratioValue,
                    });
                    const active = selectedSlotIndex === index;
                    const dragOver = dragging?.over === index && dragging.from !== index;

                    return (
                      <div
                        key={slot.id}
                        data-collage-slot={index}
                        className="absolute"
                        style={{
                          left: `${rect.left}%`,
                          top: `${rect.top}%`,
                          width: `${rect.width}%`,
                          height: `${rect.height}%`,
                          padding: scaled(present.canvas.gap / 2),
                          boxSizing: 'border-box',
                        }}
                      >
                        <button
                          type="button"
                          onPointerDown={(event) => handlePointerDown(event, index)}
                          onDoubleClick={() => handleDoubleClick(index)}
                          className={cn(
                            'group relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden outline-none',
                            // 空格子只是编辑期的提示：导出时留白，不把 + 和格子编号印进图里
                            photo ? 'bg-muted/30' : exporting ? '' : 'bg-muted/30',
                            active
                              ? 'ring-2 ring-primary'
                              : dragOver || (assetDragActive && assetDragOverIndex === index)
                                ? 'ring-2 ring-primary/60'
                                : 'hover:bg-muted/50',
                            dragging?.from === index && 'opacity-60',
                          )}
                          style={{
                            borderRadius: slotBorderRadius(slot),
                            boxShadow: slotShadow(),
                          }}
                        >
                          {photo ? (
                            renderPhoto(slot, 'h-full w-full')
                          ) : exporting ? null : (
                            <div className="pointer-events-none flex flex-col items-center gap-1.5 text-muted-foreground">
                              <Plus className="size-5" />
                              <span className="text-[10px]">
                                {t('collage.canvas.slotIndex', { index: index + 1 })}
                              </span>
                              <span className="text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
                                {t('collage.canvas.slotPlaceholder')}
                              </span>
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {mode === 'long'
                ? present.slotItems.map((slot, index) => {
                    const active = selectedSlotIndex === index;
                    const cross = present.canvas.longSize * clamp(slot.scale, 0.2, 4);
                    const vertical = present.canvas.longDirection === 'vertical';
                    const photo = slot.photoId ? photoMap.get(slot.photoId) : null;

                    return (
                      <button
                        type="button"
                        key={slot.id}
                        data-collage-slot={index}
                        onPointerDown={(event) => handlePointerDown(event, index)}
                        onDoubleClick={() => handleDoubleClick(index)}
                        className={cn(
                          'relative shrink-0 overflow-hidden outline-none',
                          photo || !exporting ? 'bg-muted/30' : '',
                          active && 'ring-2 ring-primary',
                          assetDragActive &&
                            assetDragOverIndex === index &&
                            'ring-2 ring-primary/60',
                          dragging?.from === index && 'opacity-60',
                        )}
                        style={{
                          borderRadius: slotBorderRadius(slot),
                          width: vertical ? scaled(cross) : undefined,
                          height: vertical ? undefined : scaled(cross),
                          aspectRatio: slot.photoId ? undefined : '1',
                          boxShadow: slotShadow(),
                        }}
                      >
                        {photo ? (
                          renderPhoto(slot, vertical ? 'h-auto w-full' : 'h-full w-auto')
                        ) : exporting ? null : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Plus className="size-5" />
                          </div>
                        )}
                      </button>
                    );
                  })
                : null}

              {mode === 'free'
                ? present.slotItems.map((slot, index) => {
                    const active = selectedSlotIndex === index;
                    const photo = slot.photoId ? photoMap.get(slot.photoId) : null;
                    const rect = getFreeSlotRect(slot, present.canvas, {
                      width: crossDesign,
                      height: crossDesign / ratioValue,
                    });

                    return (
                      <button
                        type="button"
                        key={slot.id}
                        data-collage-slot={index}
                        onPointerDown={(event) => handlePointerDown(event, index)}
                        onDoubleClick={() => handleDoubleClick(index)}
                        className={cn(
                          'absolute cursor-move overflow-hidden outline-none',
                          photo || !exporting ? 'bg-muted/30' : '',
                          active && 'ring-2 ring-primary',
                          assetDragActive &&
                            assetDragOverIndex === index &&
                            'ring-2 ring-primary/60',
                        )}
                        style={{
                          left: `${rect.left}%`,
                          top: `${rect.top}%`,
                          width: `${rect.width}%`,
                          borderRadius: slotBorderRadius(slot),
                          boxShadow: slotShadow(),
                        }}
                      >
                        {photo ? (
                          <img
                            src={photo.previewUrl}
                            alt={photo.name}
                            draggable={false}
                            className="pointer-events-none block h-auto w-full select-none"
                            style={{
                              objectPosition: getObjectPosition(slot),
                              transform: getSlotTransform(slot),
                            }}
                          />
                        ) : exporting ? null : (
                          <div className="flex aspect-4/3 items-center justify-center text-muted-foreground">
                            <Plus className="size-5" />
                          </div>
                        )}
                      </button>
                    );
                  })
                : null}
            </div>
          </div>
        </ScrollArea>

        {exporting ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/85 text-xs text-muted-foreground backdrop-blur-[1px]">
            <Loader2 className="size-4 animate-spin text-primary" />
            {t('collage.canvas.exporting')}
          </div>
        ) : null}
      </div>

      <div className="flex w-full items-center justify-between gap-4 border-t border-border/80 px-4 py-2 text-xs text-muted-foreground">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {mode === 'grid'
              ? t('collage.canvas.statusGrid', {
                  name: layout.nameKey ? t(layout.nameKey, { count: layout.count }) : layout.name,
                  count: layout.count,
                })
              : mode === 'long'
                ? t('collage.canvas.statusLong', {
                    direction: t(
                      present.canvas.longDirection === 'vertical'
                        ? 'collage.canvas.directionVertical'
                        : 'collage.canvas.directionHorizontal',
                    ),
                    count: present.slotItems.length,
                  })
                : t('collage.canvas.statusFree', { count: present.slotItems.length })}
          </p>
          <p className="truncate">
            {unusedCount > 0
              ? t('collage.canvas.unusedHint', { count: unusedCount })
              : t('collage.canvas.allPlaced')}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {ZOOM_OPTIONS.map((option) => {
            const active =
              option === 'fit'
                ? zoom === 'fit'
                : typeof zoom === 'number' && Math.abs(zoom - option) < 0.001;

            return (
              <Button
                key={option.toString()}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                onClick={() => setZoom(option)}
              >
                {option === 'fit' ? t('collage.canvas.zoomFit') : `${option * 100}%`}
              </Button>
            );
          })}
        </div>

        <span className="hidden shrink-0 sm:inline">
          {mode === 'long'
            ? t('collage.canvas.canvasWidth', { value: present.canvas.longSize })
            : t('collage.canvas.canvasRatio', { ratio: getAspectRatioText(present.canvas) })}
        </span>
      </div>
    </div>
  );
}
