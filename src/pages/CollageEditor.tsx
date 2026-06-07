import { Download, ImagePlus, Loader2, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePhotos } from '@/hooks/usePhotos';
import { exportSingle } from '@/lib/export-photo';

interface CollageLayout {
  id: string;
  label: string;
  count: number;
  cols: number;
  rows: number;
}

const LAYOUT_GROUPS: { count: number; label: string; layouts: CollageLayout[] }[] = [
  {
    count: 2,
    label: '两张',
    layouts: [
      { id: 'two-h', label: '左右', count: 2, cols: 2, rows: 1 },
      { id: 'two-v', label: '上下', count: 2, cols: 1, rows: 2 },
    ],
  },
  {
    count: 3,
    label: '三张',
    layouts: [
      { id: 'three-h', label: '横排', count: 3, cols: 3, rows: 1 },
      { id: 'three-v', label: '竖排', count: 3, cols: 1, rows: 3 },
    ],
  },
  {
    count: 4,
    label: '四张',
    layouts: [
      { id: 'grid2x2', label: '田字', count: 4, cols: 2, rows: 2 },
      { id: 'four-h', label: '四列', count: 4, cols: 4, rows: 1 },
    ],
  },
];

interface SlotData {
  photoId: string | null;
  offsetX: number;
  offsetY: number;
}

function LayoutThumbnail({ layout, active }: { layout: CollageLayout; active: boolean }) {
  const w = Math.round(32 * (layout.cols / Math.max(layout.cols, layout.rows)));
  return (
    <div
      className={`grid overflow-hidden rounded border-2 transition-colors ${
        active ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
      }`}
      style={{
        width: w,
        height: 32,
        gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
        gap: 1,
      }}
    >
      {Array.from({ length: layout.count }).map((_, i) => (
        <div key={`${layout.id}-t-${i}`} className="bg-muted-foreground/25" />
      ))}
    </div>
  );
}

export function CollageEditor() {
  const { photos, importViaDialog } = usePhotos();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layoutId, setLayoutId] = useState<string>('two-h');
  const [slots, setSlots] = useState<SlotData[]>(() =>
    Array(2).fill({ photoId: null, offsetX: 0, offsetY: 0 }),
  );
  const [gap, setGap] = useState(8);
  const [ratio, setRatio] = useState(50);
  const [exporting, setExporting] = useState(false);
  const bg = '#ffffff';
  const radius = 0;

  const allLayouts = LAYOUT_GROUPS.flatMap((g) => g.layouts);
  const layout = allLayouts.find((l) => l.id === layoutId) ?? allLayouts[0];

  const handleLayoutChange = (id: string) => {
    setLayoutId(id);
    const l = allLayouts.find((la) => la.id === id) ?? allLayouts[0];
    setSlots(Array(l.count).fill({ photoId: null, offsetX: 0, offsetY: 0 }));
  };

  const handlePhotoClick = (photoId: string) => {
    setSlots((prev) => {
      const idx = prev.findIndex((s) => s.photoId === null);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { photoId, offsetX: 0, offsetY: 0 };
      return next;
    });
  };

  const clearSlot = (index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { photoId: null, offsetX: 0, offsetY: 0 };
      return next;
    });
  };

  const updateOffset = useCallback((index: number, dx: number, dy: number, maxX: number, maxY: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        offsetX: Math.max(-maxX, Math.min(maxX, next[index].offsetX + dx)),
        offsetY: Math.max(-maxY, Math.min(maxY, next[index].offsetY + dy)),
      };
      return next;
    });
  }, []);

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      await exportSingle(canvasRef.current, {
        format: 'jpeg',
        quality: 90,
        dpi: 72,
        scale: 1,
        preserveExif: false,
        exclude: ['.collage-ui-btn'],
      });
    } catch (err) {
      console.error('导出拼图失败:', err);
    } finally {
      setExporting(false);
    }
  };

  const anyPhoto = slots.some((s) => s.photoId !== null);
  const cols = layout.cols;
  const rows = layout.rows;
  const colTracks =
    cols === 1 ? '1fr' : cols === 2 ? `${ratio}fr ${100 - ratio}fr` : `repeat(${cols}, 1fr)`;
  const rowTracks =
    rows === 1 ? '1fr' : rows === 2 ? `${ratio}fr ${100 - ratio}fr` : `repeat(${rows}, 1fr)`;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: colTracks,
    gridTemplateRows: rowTracks,
    gap: `${gap}px`,
    backgroundColor: bg,
    padding: `${gap}px`,
    borderRadius: `${radius * 2}px`,
    aspectRatio: cols === rows ? '1' : cols > rows ? `${cols}/${rows}` : `${rows}/${cols}`,
    maxHeight: '65vh',
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex items-center gap-2 border-b p-2">
        <span className="text-sm font-medium text-foreground">拼图</span>
        <Button
          size="xs"
          variant="outline"
          className="h-6 text-[10px]"
          onClick={() => importViaDialog()}
        >
          添加照片
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {(cols > 1 || rows > 1) && (
            <>
              <span className="text-[10px] text-muted-foreground">比例</span>
              <Slider
                value={[ratio]}
                onValueChange={([v]) => setRatio(v)}
                min={20}
                max={80}
                step={1}
                className="w-16"
              />
            </>
          )}
          <span className="text-[10px] text-muted-foreground">间距</span>
          <Slider
            value={[gap]}
            onValueChange={([v]) => setGap(v)}
            min={0}
            max={40}
            step={1}
            className="w-16"
          />
          <Button
            size="xs"
            className="h-6 gap-1 text-[10px]"
            onClick={handleExport}
            disabled={exporting || !anyPhoto}
          >
            {exporting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Download className="size-3" />
            )}
            导出
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="w-28 shrink-0 overflow-y-auto border-r p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
          {LAYOUT_GROUPS.map((group) => (
            <div key={group.count} className="mb-3">
              <span className="text-[10px] font-medium text-muted-foreground">{group.label}</span>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {group.layouts.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleLayoutChange(l.id)}
                    title={l.label}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <LayoutThumbnail layout={l} active={layoutId === l.id} />
                    <span className="text-[9px] text-muted-foreground">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/30 p-4">
          <div ref={canvasRef} style={gridStyle} className="w-full max-w-2xl">
            {slots.map((slot, i) => {
              const photo = slot.photoId ? photos.find((p) => p.id === slot.photoId) : null;
              const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
                e.preventDefault();
                const img = e.currentTarget;
                const slotEl = img.parentElement;
                if (!slotEl) return;
                const slotRect = slotEl.getBoundingClientRect();
                // scale 1.07 gives ~3.5% extra on each side
                const maxX = slotRect.width * 0.035;
                const maxY = slotRect.height * 0.035;
                const startX = e.clientX;
                const startY = e.clientY;
                const startOffX = slot.offsetX;
                const startOffY = slot.offsetY;
                const onMove = (ev: MouseEvent) => {
                  updateOffset(
                    i,
                    startOffX + ev.clientX - startX,
                    startOffY + ev.clientY - startY,
                    maxX,
                    maxY,
                  );
                };
                const onUp = () => {
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              };

              return (
                <div
                  key={`${layout.id}-s-${i}`}
                  className="relative flex items-center justify-center overflow-hidden bg-muted/50"
                  style={{ borderRadius: `${radius}px` }}
                >
                  {photo ? (
                    <>
                      <img
                        src={photo.previewUrl}
                        alt=""
                        role="button"
                        className="h-full w-full cursor-grab object-cover active:cursor-grabbing"
                        style={{
                          transform: `translate(${slot.offsetX}px, ${slot.offsetY}px) scale(1.07)`,
                        }}
                        draggable={false}
                        onMouseDown={handleMouseDown}
                      />
                      <button
                        type="button"
                        className="collage-ui-btn absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                        onClick={() => clearSlot(i)}
                      >
                        <X className="size-3" />
                      </button>
                    </>
                  ) : (
                    <ImagePlus className="collage-ui-btn size-8 text-muted-foreground/30" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-t p-2 overflow-x-auto">
        {photos.map((photo) => {
          const used = slots.some((s) => s.photoId === photo.id);
          return (
            <button
              key={photo.id}
              type="button"
              className={`relative shrink-0 cursor-pointer overflow-hidden rounded border-2 transition-opacity ${
                used ? 'pointer-events-none opacity-20' : 'hover:border-primary/50'
              }`}
              style={{
                width: 48,
                height: 48,
                borderColor: used ? 'var(--color-primary)' : 'var(--color-border)',
              }}
              onClick={() => handlePhotoClick(photo.id)}
            >
              <img src={photo.previewUrl} alt={photo.name} className="h-full w-full object-cover" />
            </button>
          );
        })}
        {photos.length === 0 && (
          <p className="px-2 text-xs text-muted-foreground">点击「添加照片」导入图片</p>
        )}
      </div>
    </div>
  );
}
