import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowRight,
  Check,
  Download,
  GripVertical,
  History,
  ImagePlus,
  Loader2,
  PencilLine,
  Redo2,
  Replace,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Rnd } from 'react-rnd';
import { toast } from 'sonner';
import { CoDropZone } from '@/components/CoDropZone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePhotos } from '@/hooks/usePhotos';
import { exportSingle } from '@/lib/export-photo';
import { selectPhotosViaDialog } from '@/lib/import-photo';
import type { ImportedPhoto } from '@/lib/photo';
import { cn } from '@/lib/utils';
import { COLLAGE_LAYOUT_COUNT, COLLAGE_LAYOUT_GROUPS, COLLAGE_LAYOUTS } from './layouts';
import {
  COLLAGE_EXPORT_LABELS,
  COLLAGE_RATIO_OPTIONS,
  clamp,
  getAspectRatioText,
  getAspectRatioValue,
  getExportOptions,
  measureImageAsset,
} from './lib';
import { useCollageStore } from './store/use-collage-store';
import type {
  CollageAnnotation,
  CollageLayout,
  CollageShapeAnnotation,
  CollageSlotState,
  CollageTextAnnotation,
} from './types';

const ANNOTATION_HANDLE_CLASSES = {
  top: 'collage-ui-handle',
  right: 'collage-ui-handle',
  bottom: 'collage-ui-handle',
  left: 'collage-ui-handle',
  topRight: 'collage-ui-handle',
  bottomRight: 'collage-ui-handle',
  bottomLeft: 'collage-ui-handle',
  topLeft: 'collage-ui-handle',
};

function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function LayoutThumbnail({ layout, active }: { layout: CollageLayout; active: boolean }) {
  return (
    <div
      className={cn(
        'relative aspect-square rounded-xl border p-2 transition-colors',
        active
          ? 'border-primary bg-primary/8 shadow-[inset_0_0_0_1px_var(--color-primary)]'
          : 'border-border bg-card hover:border-primary/40',
      )}
    >
      <div className="relative h-full w-full rounded-lg bg-muted/35">
        {layout.slots.map((slot) => (
          <div
            key={`${layout.id}-${slot.x}-${slot.y}-${slot.w}-${slot.h}`}
            className="absolute box-border p-[1.5px]"
            style={{
              left: `${(slot.x / 12) * 100}%`,
              top: `${(slot.y / 12) * 100}%`,
              width: `${(slot.w / 12) * 100}%`,
              height: `${(slot.h / 12) * 100}%`,
            }}
          >
            <div className="h-full w-full rounded-[5px] bg-foreground/15" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SortablePhotoCard({
  photo,
  selected,
  onUse,
  onReplace,
  onDelete,
}: {
  photo: ImportedPhoto;
  selected: boolean;
  onUse: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
    data: { type: 'photo' },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        'rounded-2xl border bg-card p-2 shadow-sm transition-colors',
        selected ? 'border-primary' : 'border-border',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          title="拖拽排序"
        >
          <GripVertical className="size-3.5" />
        </button>

        <button type="button" className="min-w-0 flex-1 text-left" onClick={onUse}>
          <div className="overflow-hidden rounded-xl">
            <img
              src={photo.previewUrl}
              alt={photo.name}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{photo.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(photo.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            {selected && <Check className="size-4 text-primary" />}
          </div>
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        <Button type="button" variant="outline" size="xs" className="flex-1" onClick={onReplace}>
          <Replace data-icon="inline-start" />
          替换
        </Button>
        <Button type="button" variant="ghost" size="xs" className="flex-1" onClick={onDelete}>
          <Trash2 data-icon="inline-start" />
          删除
        </Button>
      </div>
    </div>
  );
}

function CollageSlotTile({
  index,
  photo,
  slot,
  layout,
  radius,
  selected,
  exporting,
  photoDimensions,
  onSelect,
  onClear,
  onPan,
  onZoom,
}: {
  index: number;
  photo: ImportedPhoto | null;
  slot: CollageSlotState;
  layout: CollageLayout;
  radius: number;
  selected: boolean;
  exporting: boolean;
  photoDimensions?: { width: number; height: number };
  onSelect: () => void;
  onClear: () => void;
  onPan: (dx: number, dy: number, maxX: number, maxY: number) => void;
  onZoom: (delta: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${index}`,
    data: { type: 'slot', index },
  });

  const handleMouseDown = (event: ReactMouseEvent<HTMLImageElement>) => {
    if (!photo) {
      return;
    }

    event.preventDefault();
    onSelect();

    const image = event.currentTarget;
    const container = image.parentElement?.parentElement;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const slotRatio = rect.width / Math.max(rect.height, 1);
    const photoRatio = photoDimensions ? photoDimensions.width / photoDimensions.height : slotRatio;

    let renderedWidth = rect.width;
    let renderedHeight = rect.height;

    if (photoRatio > slotRatio) {
      renderedHeight = rect.height;
      renderedWidth = renderedHeight * photoRatio;
    } else {
      renderedWidth = rect.width;
      renderedHeight = renderedWidth / Math.max(photoRatio, 0.01);
    }

    const maxX = Math.max(0, (renderedWidth * slot.scale - rect.width) / 2);
    const maxY = Math.max(0, (renderedHeight * slot.scale - rect.height) / 2);
    const startX = event.clientX;
    const startY = event.clientY;

    const onMove = (moveEvent: MouseEvent) => {
      onPan(moveEvent.clientX - startX, moveEvent.clientY - startY, maxX, maxY);
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: slot container includes nested controls and keyboard handling
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      className={cn(
        'group relative overflow-hidden bg-background/75 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]',
        isOver && 'ring-2 ring-primary/45 ring-offset-2 ring-offset-background',
        selected && !exporting && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
      style={{
        gridColumn: `${layout.slots[index].x + 1} / span ${layout.slots[index].w}`,
        gridRow: `${layout.slots[index].y + 1} / span ${layout.slots[index].h}`,
        borderRadius: radius,
      }}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      onWheel={(event) => {
        if (!photo) {
          return;
        }

        event.preventDefault();
        onZoom(event.deltaY < 0 ? 0.06 : -0.06);
      }}
    >
      {photo ? (
        <>
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <img
              src={photo.previewUrl}
              alt={photo.name}
              className="h-full w-full cursor-grab object-cover active:cursor-grabbing"
              style={{
                transform: `translate(${slot.offsetX}px, ${slot.offsetY}px) scale(${slot.scale}) rotate(${slot.rotation}deg)`,
              }}
              draggable={false}
              onMouseDown={handleMouseDown}
            />
          </div>

          {!exporting && (
            <>
              <div className="collage-ui absolute inset-x-2 bottom-2 rounded-full bg-black/52 px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                拖拽平移 · 滚轮缩放
              </div>
              <button
                type="button"
                className="collage-ui absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onClear();
                }}
              >
                <X className="size-4" />
              </button>
            </>
          )}
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <ImagePlus className="size-8 opacity-40" />
          <span className="text-xs">拖拽图片到此处</span>
        </div>
      )}
    </div>
  );
}

function renderAnnotation(annotation: CollageAnnotation, selected: boolean) {
  if (annotation.type === 'text') {
    const item = annotation as CollageTextAnnotation;
    return (
      <div
        className={cn(
          'flex h-full w-full items-center rounded-xl border border-transparent px-3',
          selected && 'bg-background/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]',
        )}
        style={{
          color: item.color,
          fontSize: item.fontSize,
          fontWeight: 600,
          lineHeight: 1.15,
        }}
      >
        {item.text}
      </div>
    );
  }

  if (annotation.type === 'arrow') {
    return (
      <div className="relative h-full w-full">
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 rounded-full"
          style={{
            width: 'calc(100% - 16px)',
            height: annotation.strokeWidth,
            backgroundColor: annotation.color,
          }}
        />
        <div
          className="absolute top-1/2 right-0 -translate-y-1/2"
          style={{
            borderTop: `${annotation.strokeWidth * 1.25}px solid transparent`,
            borderBottom: `${annotation.strokeWidth * 1.25}px solid transparent`,
            borderLeft: `${annotation.strokeWidth * 2.2}px solid ${annotation.color}`,
          }}
        />
      </div>
    );
  }

  const shape = annotation as CollageShapeAnnotation;
  return (
    <div
      className={cn('h-full w-full bg-transparent', shape.type === 'circle' && 'rounded-full')}
      style={{
        border: `${shape.strokeWidth}px solid ${shape.color}`,
      }}
    />
  );
}

function AnnotationLayer({
  annotations,
  stageWidth,
  stageHeight,
  selectedAnnotationId,
  exporting,
  onSelect,
  onChange,
  onDelete,
}: {
  annotations: CollageAnnotation[];
  stageWidth: number;
  stageHeight: number;
  selectedAnnotationId: string | null;
  exporting: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<CollageAnnotation>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {annotations.map((annotation) => {
        const width = stageWidth * annotation.width;
        const height = stageHeight * annotation.height;
        const x = stageWidth * annotation.x;
        const y = stageHeight * annotation.y;
        const selected = selectedAnnotationId === annotation.id;

        return (
          <Rnd
            key={annotation.id}
            className={cn('pointer-events-auto', selected && !exporting && 'z-10')}
            size={{ width, height }}
            position={{ x, y }}
            bounds="parent"
            lockAspectRatio={annotation.type === 'circle'}
            resizeHandleClasses={ANNOTATION_HANDLE_CLASSES}
            disableDragging={exporting}
            enableResizing={!exporting}
            onMouseDown={(event) => {
              event.stopPropagation();
              onSelect(annotation.id);
            }}
            onDragStop={(_, data) => {
              onChange(annotation.id, {
                x: data.x / Math.max(stageWidth, 1),
                y: data.y / Math.max(stageHeight, 1),
              });
            }}
            onResizeStop={(_, __, ref, ___, position) => {
              onChange(annotation.id, {
                x: position.x / Math.max(stageWidth, 1),
                y: position.y / Math.max(stageHeight, 1),
                width: parseFloat(ref.style.width) / Math.max(stageWidth, 1),
                height: parseFloat(ref.style.height) / Math.max(stageHeight, 1),
              });
            }}
          >
            <div
              className={cn(
                'relative h-full w-full',
                selected && !exporting && 'outline-2 outline-primary/80 outline-dashed',
              )}
              style={{
                transform: `rotate(${annotation.rotation}deg)`,
                transformOrigin: 'center',
              }}
            >
              {renderAnnotation(annotation, selected)}
              {selected && !exporting && (
                <button
                  type="button"
                  className="collage-ui absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(annotation.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </Rnd>
        );
      })}
    </div>
  );
}

export function CollageEditor() {
  const {
    photos,
    importViaDialog,
    importViaDrop,
    isDraggingOver,
    removePhoto,
    replacePhoto,
    movePhoto,
  } = usePhotos();

  const {
    past,
    future,
    present,
    selectedSlotIndex,
    selectedAnnotationId,
    undo,
    redo,
    selectSlot,
    selectAnnotation,
    setLayout,
    updateCanvas,
    updateExportSettings,
    assignPhotoToSlot,
    clearSlot,
    swapSlots,
    updateSlot,
    resetSlot,
    removePhotoReferences,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
  } = useCollageStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const stageSize = useElementSize(stageRef);
  const previewViewportSize = useElementSize(previewViewportRef);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [swapFromIndex, setSwapFromIndex] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [photoDimensions, setPhotoDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const layout = useMemo(
    () => COLLAGE_LAYOUTS.find((item) => item.id === present.layoutId) ?? COLLAGE_LAYOUTS[0],
    [present.layoutId],
  );

  const filledSlotCount = present.slotItems.filter((item) => item.photoId).length;
  const selectedSlot =
    selectedSlotIndex !== null ? (present.slotItems[selectedSlotIndex] ?? null) : null;
  const selectedSlotPhoto = selectedSlot?.photoId
    ? (photos.find((photo) => photo.id === selectedSlot.photoId) ?? null)
    : null;
  const selectedAnnotation =
    selectedAnnotationId !== null
      ? (present.annotations.find((item) => item.id === selectedAnnotationId) ?? null)
      : null;
  const activePhoto = activePhotoId
    ? (photos.find((photo) => photo.id === activePhotoId) ?? null)
    : null;
  const ratioValue = getAspectRatioValue(present.canvas);
  const previewFrameWidth = useMemo(() => {
    const availableWidth = Math.max(previewViewportSize.width - 24, 260);
    const availableHeight = Math.max(previewViewportSize.height - 24, 260);
    const widthFromHeight = availableHeight * ratioValue;
    return Math.max(260, Math.min(availableWidth, widthFromHeight));
  }, [previewViewportSize.height, previewViewportSize.width, ratioValue]);

  useEffect(() => {
    let cancelled = false;

    const pending = photos.filter((photo) => !photoDimensions[photo.id]);
    if (!pending.length) {
      return;
    }

    void Promise.all(
      pending.map(async (photo) => {
        try {
          const result = await measureImageAsset(photo.previewUrl);
          return [photo.id, result] as const;
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) {
        return;
      }

      const nextEntries = results.filter(Boolean) as Array<
        [string, { width: number; height: number }]
      >;
      if (!nextEntries.length) {
        return;
      }

      setPhotoDimensions((current) => ({
        ...current,
        ...Object.fromEntries(nextEntries),
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [photos, photoDimensions]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      const metaPressed = event.metaKey || event.ctrlKey;
      if (metaPressed && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (metaPressed && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === 'Escape') {
        selectSlot(null);
        selectAnnotation(null);
        setSwapFromIndex(null);
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedAnnotationId) {
          event.preventDefault();
          removeAnnotation(selectedAnnotationId);
          return;
        }

        if (selectedSlotIndex !== null) {
          event.preventDefault();
          clearSlot(selectedSlotIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    clearSlot,
    redo,
    removeAnnotation,
    selectAnnotation,
    selectSlot,
    selectedAnnotationId,
    selectedSlotIndex,
    undo,
  ]);

  const assignPhotoSmartly = (photoId: string) => {
    if (selectedSlotIndex !== null) {
      assignPhotoToSlot(selectedSlotIndex, photoId);
      return;
    }

    const emptyIndex = present.slotItems.findIndex((item) => item.photoId === null);
    assignPhotoToSlot(emptyIndex === -1 ? 0 : emptyIndex, photoId);
  };

  const handleReplacePhoto = async (photoId: string) => {
    const selected = await selectPhotosViaDialog();
    if (!selected[0]) {
      return;
    }

    replacePhoto(photoId, selected[0]);
    setPhotoDimensions((current) => {
      const next = { ...current };
      delete next[photoId];
      return next;
    });
    toast.success('图片已替换');
  };

  const handleReplaceSelectedSlot = async () => {
    if (!selectedSlotPhoto) {
      return;
    }

    await handleReplacePhoto(selectedSlotPhoto.id);
  };

  const handlePickBackground = async () => {
    const selected = await selectPhotosViaDialog();
    if (!selected[0]) {
      return;
    }

    updateCanvas({
      backgroundImage: selected[0].previewUrl,
    });
  };

  const handleExport = async () => {
    if (!canvasRef.current) {
      return;
    }

    if (!filledSlotCount) {
      toast.error('请先添加至少一张图片');
      return;
    }

    setExporting(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      const exportOptions = getExportOptions(present.exportSettings.quality);
      await exportSingle(canvasRef.current, {
        format: present.exportSettings.format,
        quality: exportOptions.quality,
        dpi: exportOptions.dpi,
        scale: exportOptions.scale,
        preserveExif: false,
        exclude: ['.collage-ui', '.collage-ui-handle'],
      });
      toast.success('拼图导出完成');
    } catch (error) {
      console.error('导出拼图失败:', error);
      toast.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'photo') {
      setActivePhotoId(String(event.active.id));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePhotoId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const overType = over.data.current?.type;
    if (overType === 'photo') {
      movePhoto(String(active.id), String(over.id));
      return;
    }

    if (overType === 'slot') {
      const slotIndex = Number(over.data.current?.index);
      assignPhotoToSlot(slotIndex, String(active.id));
    }
  };

  return (
    <CoDropZone onFilesDrop={importViaDrop} className="m-0 h-full rounded-none border-0">
      <div className="flex h-full flex-col overflow-hidden bg-background">
        <div className="flex items-center gap-2 border-b bg-card/80 px-4 py-3 backdrop-blur-sm">
          <div>
            <h1 className="text-sm font-semibold text-foreground">拼图编辑器</h1>
            <p className="text-xs text-muted-foreground">
              {photos.length} 张图片 · {layout.count} 槽位 · {COLLAGE_LAYOUT_COUNT} 个布局
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => importViaDialog()}>
              <ImagePlus data-icon="inline-start" />
              添加照片
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!past.length}
            >
              <Undo2 data-icon="inline-start" />
              撤销
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!future.length}
            >
              <Redo2 data-icon="inline-start" />
              重做
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExport}
              disabled={exporting || !filledSlotCount}
            >
              {exporting ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Download data-icon="inline-start" />
              )}
              导出拼图
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActivePhotoId(null)}
        >
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="grid h-full grid-cols-[clamp(220px,18vw,300px)_minmax(0,1fr)_clamp(260px,21vw,340px)] overflow-hidden">
              <div className="flex min-h-0 min-w-0 flex-col border-r bg-muted/15">
                <Tabs defaultValue="photos" className="flex min-h-0 flex-1 flex-col gap-0">
                  <div className="border-b px-3 py-3">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="photos">图片</TabsTrigger>
                      <TabsTrigger value="layouts">布局</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="photos" className="min-h-0 flex-1 px-3 pb-3">
                    <div className="flex h-full flex-col gap-3">
                      <div className="rounded-2xl border border-dashed border-border bg-card/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-foreground">图片素材库</p>
                            <p className="text-[11px] text-muted-foreground">
                              支持拖拽导入、批量选择和排序
                            </p>
                          </div>
                          <Button type="button" size="xs" onClick={() => importViaDialog()}>
                            <ImagePlus data-icon="inline-start" />
                            导入
                          </Button>
                        </div>
                      </div>

                      {photos.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 text-center">
                          <Sparkles className="size-10 text-muted-foreground/35" />
                          <p className="mt-3 text-sm font-medium text-foreground">
                            把图片拖到这里开始拼图
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            也可以点击上方按钮批量选择
                          </p>
                        </div>
                      ) : (
                        <div className="min-h-0 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
                          <SortableContext
                            items={photos.map((photo) => photo.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="flex flex-col gap-3">
                              {photos.map((photo) => {
                                const selected = selectedSlotPhoto?.id === photo.id;
                                return (
                                  <SortablePhotoCard
                                    key={photo.id}
                                    photo={photo}
                                    selected={selected}
                                    onUse={() => assignPhotoSmartly(photo.id)}
                                    onReplace={() => handleReplacePhoto(photo.id)}
                                    onDelete={() => {
                                      removePhoto(photo.id);
                                      removePhotoReferences(photo.id);
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </SortableContext>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="layouts" className="min-h-0 flex-1 px-3 pb-3">
                    <div className="min-h-0 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
                      <div className="flex flex-col gap-4">
                        {COLLAGE_LAYOUT_GROUPS.map((group) => (
                          <section key={group.group}>
                            <div className="mb-2 flex items-center justify-between">
                              <h2 className="text-xs font-semibold text-foreground">
                                {group.group}
                              </h2>
                              <span className="text-[11px] text-muted-foreground">
                                {group.layouts.length} 个
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {group.layouts.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  className="text-left"
                                  onClick={() => setLayout(item.id)}
                                >
                                  <LayoutThumbnail layout={item} active={item.id === layout.id} />
                                  <p className="mt-1 text-xs font-medium text-foreground">
                                    {item.name}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex min-h-0 min-w-0 flex-col bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.04),transparent_35%)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <History className="size-3.5" />
                    自动保存已开启，当前画布比例 {getAspectRatioText(present.canvas)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>
                      已填充 {filledSlotCount}/{layout.count}
                    </span>
                    {swapFromIndex !== null && (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                        点击目标槽位完成交换
                      </span>
                    )}
                    {isDraggingOver && (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                        释放即可导入图片
                      </span>
                    )}
                  </div>
                </div>

                <div
                  ref={previewViewportRef}
                  className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-3 xl:p-5 2xl:p-6"
                >
                  <div
                    className="rounded-[32px] border border-white/70 bg-white/45 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm"
                    style={{
                      width: `${previewFrameWidth + 32}px`,
                      maxWidth: '100%',
                    }}
                  >
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: canvas background click clears current selection */}
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape is the primary keyboard shortcut for clearing selection */}
                    <div
                      ref={canvasRef}
                      className="relative w-full overflow-hidden rounded-[28px]"
                      style={{
                        aspectRatio: ratioValue,
                        backgroundColor: present.canvas.backgroundColor,
                        backgroundImage: present.canvas.backgroundImage
                          ? `linear-gradient(rgba(255,255,255,0.16), rgba(255,255,255,0.16)), url(${present.canvas.backgroundImage})`
                          : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                      onClick={() => {
                        selectSlot(null);
                        selectAnnotation(null);
                        setSwapFromIndex(null);
                      }}
                    >
                      <div
                        ref={stageRef}
                        className="absolute inset-0 grid"
                        style={{
                          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                          gridTemplateRows: 'repeat(12, minmax(0, 1fr))',
                          gap: present.canvas.gap,
                          padding: present.canvas.padding,
                        }}
                      >
                        {present.slotItems.map((slotItem, index) => {
                          const photo = slotItem.photoId
                            ? (photos.find((item) => item.id === slotItem.photoId) ?? null)
                            : null;

                          return (
                            <CollageSlotTile
                              key={`${layout.id}-${layout.slots[index]?.x}-${layout.slots[index]?.y}-${layout.slots[index]?.w}-${layout.slots[index]?.h}`}
                              index={index}
                              photo={photo}
                              slot={slotItem}
                              layout={layout}
                              radius={present.canvas.borderRadius}
                              selected={selectedSlotIndex === index}
                              exporting={exporting}
                              photoDimensions={
                                slotItem.photoId ? photoDimensions[slotItem.photoId] : undefined
                              }
                              onSelect={() => {
                                if (swapFromIndex !== null && swapFromIndex !== index) {
                                  swapSlots(swapFromIndex, index);
                                  setSwapFromIndex(null);
                                  selectSlot(index);
                                  return;
                                }

                                if (swapFromIndex === index) {
                                  setSwapFromIndex(null);
                                }

                                selectSlot(index);
                              }}
                              onClear={() => clearSlot(index)}
                              onPan={(dx, dy, maxX, maxY) =>
                                updateSlot(index, {
                                  offsetX: clamp(slotItem.offsetX + dx, -maxX, maxX),
                                  offsetY: clamp(slotItem.offsetY + dy, -maxY, maxY),
                                })
                              }
                              onZoom={(delta) =>
                                updateSlot(index, {
                                  scale: clamp(slotItem.scale + delta, 1, 3),
                                })
                              }
                            />
                          );
                        })}
                      </div>

                      {stageSize.width > 0 && stageSize.height > 0 && (
                        <AnnotationLayer
                          annotations={present.annotations}
                          stageWidth={stageSize.width}
                          stageHeight={stageSize.height}
                          selectedAnnotationId={selectedAnnotationId}
                          exporting={exporting}
                          onSelect={selectAnnotation}
                          onChange={(id, patch) => updateAnnotation(id, patch)}
                          onDelete={removeAnnotation}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-col border-l bg-card/80">
                <Tabs defaultValue="canvas" className="flex min-h-0 flex-1 flex-col gap-0">
                  <div className="border-b px-3 py-3">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="canvas">画布</TabsTrigger>
                      <TabsTrigger value="photo">图片</TabsTrigger>
                      <TabsTrigger value="annotate">标注</TabsTrigger>
                      <TabsTrigger value="export">导出</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="canvas" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                    <div className="flex flex-col gap-5">
                      <section className="pt-4">
                        <h3 className="text-xs font-semibold text-foreground">画布比例</h3>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {COLLAGE_RATIO_OPTIONS.map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() =>
                                updateCanvas({
                                  aspectPreset: item.label,
                                })
                              }
                              className={cn(
                                'rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                                present.canvas.aspectPreset === item.label
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border hover:border-primary/35',
                              )}
                            >
                              {item.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => updateCanvas({ aspectPreset: 'custom' })}
                            className={cn(
                              'rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                              present.canvas.aspectPreset === 'custom'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:border-primary/35',
                            )}
                          >
                            自定义
                          </button>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={present.canvas.customRatioWidth}
                            onChange={(event) =>
                              updateCanvas({
                                aspectPreset: 'custom',
                                customRatioWidth: Math.max(1, Number(event.target.value) || 1),
                              })
                            }
                          />
                          <Input
                            type="number"
                            min="1"
                            value={present.canvas.customRatioHeight}
                            onChange={(event) =>
                              updateCanvas({
                                aspectPreset: 'custom',
                                customRatioHeight: Math.max(1, Number(event.target.value) || 1),
                              })
                            }
                          />
                        </div>
                      </section>

                      <section>
                        <h3 className="text-xs font-semibold text-foreground">背景与间距</h3>
                        <div className="mt-3 flex flex-col gap-4">
                          <label className="flex items-center gap-3 text-xs text-muted-foreground">
                            背景颜色
                            <input
                              type="color"
                              value={present.canvas.backgroundColor}
                              onChange={(event) =>
                                updateCanvas({ backgroundColor: event.target.value })
                              }
                              className="h-9 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1"
                            />
                          </label>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={handlePickBackground}
                            >
                              <ImagePlus data-icon="inline-start" />
                              背景图
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                              onClick={() => updateCanvas({ backgroundImage: null })}
                            >
                              <Trash2 data-icon="inline-start" />
                              清除
                            </Button>
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>图片间距</span>
                              <span>{present.canvas.gap}px</span>
                            </div>
                            <Slider
                              value={[present.canvas.gap]}
                              onValueChange={([value]) => updateCanvas({ gap: value })}
                              min={0}
                              max={48}
                              step={1}
                            />
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>画布边距</span>
                              <span>{present.canvas.padding}px</span>
                            </div>
                            <Slider
                              value={[present.canvas.padding]}
                              onValueChange={([value]) => updateCanvas({ padding: value })}
                              min={0}
                              max={64}
                              step={1}
                            />
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>图片圆角</span>
                              <span>{present.canvas.borderRadius}px</span>
                            </div>
                            <Slider
                              value={[present.canvas.borderRadius]}
                              onValueChange={([value]) => updateCanvas({ borderRadius: value })}
                              min={0}
                              max={48}
                              step={1}
                            />
                          </div>
                        </div>
                      </section>
                    </div>
                  </TabsContent>

                  <TabsContent value="photo" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                    <div className="flex flex-col gap-5 pt-4">
                      <section className="rounded-2xl border bg-muted/15 p-3">
                        <h3 className="text-xs font-semibold text-foreground">当前槽位</h3>
                        {selectedSlotIndex === null ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            先在画布中选择一个图片区域。
                          </p>
                        ) : (
                          <>
                            <p className="mt-2 text-xs text-muted-foreground">
                              第 {selectedSlotIndex + 1} 个区域
                              {selectedSlotPhoto ? ` · ${selectedSlotPhoto.name}` : ' · 未放置图片'}
                            </p>
                            <div className="mt-3 flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="flex-1"
                                onClick={() => setSwapFromIndex(selectedSlotIndex)}
                              >
                                <ArrowRight data-icon="inline-start" />
                                交换位置
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="flex-1"
                                onClick={() => resetSlot(selectedSlotIndex)}
                              >
                                <RotateCcw data-icon="inline-start" />
                                重置
                              </Button>
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="flex-1"
                                onClick={() =>
                                  updateSlot(selectedSlotIndex, {
                                    scale: 1,
                                    offsetX: 0,
                                    offsetY: 0,
                                  })
                                }
                              >
                                <Sparkles data-icon="inline-start" />
                                Cover
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="flex-1"
                                onClick={() => clearSlot(selectedSlotIndex)}
                              >
                                <Trash2 data-icon="inline-start" />
                                清空
                              </Button>
                            </div>
                            <div className="mt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="w-full"
                                onClick={handleReplaceSelectedSlot}
                                disabled={!selectedSlotPhoto}
                              >
                                <Replace data-icon="inline-start" />
                                替换当前图片
                              </Button>
                            </div>
                          </>
                        )}
                      </section>

                      {selectedSlotIndex !== null && selectedSlot && (
                        <section className="flex flex-col gap-4">
                          <div>
                            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>缩放</span>
                              <span>{selectedSlot.scale.toFixed(2)}x</span>
                            </div>
                            <Slider
                              value={[selectedSlot.scale]}
                              onValueChange={([value]) =>
                                updateSlot(selectedSlotIndex, { scale: value })
                              }
                              min={1}
                              max={3}
                              step={0.01}
                            />
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>水平平移</span>
                              <span>{Math.round(selectedSlot.offsetX)}px</span>
                            </div>
                            <Slider
                              value={[selectedSlot.offsetX]}
                              onValueChange={([value]) =>
                                updateSlot(selectedSlotIndex, { offsetX: value })
                              }
                              min={-180}
                              max={180}
                              step={1}
                            />
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>垂直平移</span>
                              <span>{Math.round(selectedSlot.offsetY)}px</span>
                            </div>
                            <Slider
                              value={[selectedSlot.offsetY]}
                              onValueChange={([value]) =>
                                updateSlot(selectedSlotIndex, { offsetY: value })
                              }
                              min={-180}
                              max={180}
                              step={1}
                            />
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>旋转</span>
                              <span>{selectedSlot.rotation}°</span>
                            </div>
                            <Slider
                              value={[selectedSlot.rotation]}
                              onValueChange={([value]) =>
                                updateSlot(selectedSlotIndex, { rotation: value })
                              }
                              min={-180}
                              max={180}
                              step={1}
                            />
                          </div>
                        </section>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="annotate"
                    className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
                  >
                    <div className="flex flex-col gap-5 pt-4">
                      <section>
                        <h3 className="text-xs font-semibold text-foreground">添加标注</h3>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addAnnotation('text')}
                          >
                            <PencilLine data-icon="inline-start" />
                            文字
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addAnnotation('arrow')}
                          >
                            <ArrowRight data-icon="inline-start" />
                            箭头
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addAnnotation('rect')}
                          >
                            矩形
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addAnnotation('circle')}
                          >
                            圆形
                          </Button>
                        </div>
                      </section>

                      <section className="rounded-2xl border bg-muted/15 p-3">
                        <h3 className="text-xs font-semibold text-foreground">当前标注</h3>
                        {!selectedAnnotation ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            在画布中选中一个标注后可继续编辑。
                          </p>
                        ) : (
                          <div className="mt-3 flex flex-col gap-4">
                            {selectedAnnotation.type === 'text' && (
                              <>
                                <div>
                                  <p className="mb-2 text-xs text-muted-foreground">文字内容</p>
                                  <Input
                                    value={selectedAnnotation.text}
                                    onChange={(event) =>
                                      updateAnnotation(selectedAnnotation.id, {
                                        text: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>字号</span>
                                    <span>{selectedAnnotation.fontSize}px</span>
                                  </div>
                                  <Slider
                                    value={[selectedAnnotation.fontSize]}
                                    onValueChange={([value]) =>
                                      updateAnnotation(selectedAnnotation.id, {
                                        fontSize: value,
                                      })
                                    }
                                    min={14}
                                    max={84}
                                    step={1}
                                  />
                                </div>
                              </>
                            )}

                            <label className="flex items-center gap-3 text-xs text-muted-foreground">
                              颜色
                              <input
                                type="color"
                                value={selectedAnnotation.color}
                                onChange={(event) =>
                                  updateAnnotation(selectedAnnotation.id, {
                                    color: event.target.value,
                                  })
                                }
                                className="h-9 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1"
                              />
                            </label>

                            {'strokeWidth' in selectedAnnotation && (
                              <div>
                                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                                  <span>线条粗细</span>
                                  <span>{selectedAnnotation.strokeWidth}px</span>
                                </div>
                                <Slider
                                  value={[selectedAnnotation.strokeWidth]}
                                  onValueChange={([value]) =>
                                    updateAnnotation(selectedAnnotation.id, {
                                      strokeWidth: value,
                                    })
                                  }
                                  min={1}
                                  max={16}
                                  step={1}
                                />
                              </div>
                            )}

                            <div>
                              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                                <span>旋转</span>
                                <span>{selectedAnnotation.rotation}°</span>
                              </div>
                              <Slider
                                value={[selectedAnnotation.rotation]}
                                onValueChange={([value]) =>
                                  updateAnnotation(selectedAnnotation.id, {
                                    rotation: value,
                                  })
                                }
                                min={-180}
                                max={180}
                                step={1}
                              />
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAnnotation(selectedAnnotation.id)}
                            >
                              <Trash2 data-icon="inline-start" />
                              删除标注
                            </Button>
                          </div>
                        )}
                      </section>
                    </div>
                  </TabsContent>

                  <TabsContent value="export" className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                    <div className="flex flex-col gap-5 pt-4">
                      <section className="rounded-2xl border bg-muted/15 p-3">
                        <h3 className="text-xs font-semibold text-foreground">导出设置</h3>
                        <div className="mt-3 flex flex-col gap-4">
                          <div>
                            <p className="mb-2 text-xs text-muted-foreground">格式</p>
                            <Select
                              value={present.exportSettings.format}
                              onValueChange={(value) =>
                                updateExportSettings({
                                  format: value as 'png' | 'jpeg',
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectItem value="png">PNG</SelectItem>
                                  <SelectItem value="jpeg">JPG</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <p className="mb-2 text-xs text-muted-foreground">质量档位</p>
                            <div className="grid grid-cols-3 gap-2">
                              {(['standard', 'high', 'ultra'] as const).map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  className={cn(
                                    'rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                                    present.exportSettings.quality === item
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border hover:border-primary/35',
                                  )}
                                  onClick={() => updateExportSettings({ quality: item })}
                                >
                                  {COLLAGE_EXPORT_LABELS[item]}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl bg-background px-3 py-2 text-xs text-muted-foreground">
                            导出结果会严格按照当前 DOM 预览截图，包含布局、背景和标注。
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            onClick={handleExport}
                            disabled={exporting || !filledSlotCount}
                          >
                            {exporting ? (
                              <Loader2 className="animate-spin" data-icon="inline-start" />
                            ) : (
                              <Download data-icon="inline-start" />
                            )}
                            导出 {present.exportSettings.format === 'png' ? 'PNG' : 'JPG'}
                          </Button>
                        </div>
                      </section>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          <DragOverlay>
            {activePhoto ? (
              <div className="w-40 overflow-hidden rounded-2xl border bg-card p-2 shadow-2xl">
                <img
                  src={activePhoto.previewUrl}
                  alt={activePhoto.name}
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
                <p className="mt-2 truncate text-xs font-medium text-foreground">
                  {activePhoto.name}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </CoDropZone>
  );
}
