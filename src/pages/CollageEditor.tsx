import { Download, ImagePlus, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { usePhotos } from '@/hooks/usePhotos';
import { exportSingle } from '@/lib/export-photo';

const LAYOUTS = [
  { id: 'horizontal', label: '左右', cols: 2, rows: 1 },
  { id: 'vertical', label: '上下', cols: 1, rows: 2 },
  { id: 'grid2x2', label: '田字', cols: 2, rows: 2 },
  { id: 'three-h', label: '三列', cols: 3, rows: 1 },
] as const;

export function CollageEditor() {
  const { photos, importViaDialog } = usePhotos();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layoutId, setLayoutId] = useState<string>('horizontal');
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(2).fill(null));
  const [gap, setGap] = useState(8);
  const [exporting, setExporting] = useState(false);
  const bg = '#ffffff';
  const radius = 0;

  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  const slotCount = layout.cols * layout.rows;

  const handleLayoutChange = (id: string) => {
    setLayoutId(id);
    const l = LAYOUTS.find((la) => la.id === id) ?? LAYOUTS[0];
    setSlots(Array(l.cols * l.rows).fill(null));
  };

  const handlePhotoClick = (photoId: string) => {
    setSlots((prev) => {
      const idx = prev.indexOf(null);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = photoId;
      return next;
    });
  };

  const clearSlot = (index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

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
      });
    } catch (err) {
      console.error('导出拼图失败:', err);
    } finally {
      setExporting(false);
    }
  };

  const anyPhoto = slots.some((s) => s !== null);

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
    gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
    gap: `${gap}px`,
    backgroundColor: bg,
    padding: `${gap}px`,
    borderRadius: `${radius * 2}px`,
    aspectRatio:
      layout.cols === layout.rows
        ? '1'
        : layout.cols > layout.rows
          ? `${layout.cols}/${layout.rows}`
          : `${layout.rows}/${layout.cols}`,
    maxHeight: '70vh',
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
        <div className="flex items-center gap-1">
          {LAYOUTS.map((l) => (
            <Button
              key={l.id}
              variant={layoutId === l.id ? 'default' : 'outline'}
              size="xs"
              className="h-6 text-[10px]"
              onClick={() => handleLayoutChange(l.id)}
            >
              {l.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">间距</span>
          <Slider
            value={[gap]}
            onValueChange={([v]) => setGap(v)}
            min={0}
            max={40}
            step={1}
            className="w-20"
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
        <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/30 p-4">
          <div ref={canvasRef} style={gridStyle} className="w-full max-w-2xl">
            {Array.from({ length: slotCount }).map((_, i) => {
              const pid = slots[i];
              const photo = pid ? photos.find((p) => p.id === pid) : null;
              return (
                <div
                  key={i}
                  className="relative flex items-center justify-center overflow-hidden bg-muted/50"
                  style={{ borderRadius: `${radius}px` }}
                >
                  {photo ? (
                    <>
                      <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                        onClick={() => clearSlot(i)}
                      >
                        <X className="size-3" />
                      </button>
                    </>
                  ) : (
                    <ImagePlus className="size-8 text-muted-foreground/30" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-t p-2 overflow-x-auto">
        {photos.map((photo) => {
          const used = slots.includes(photo.id);
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
          <p className="px-2 text-xs text-muted-foreground">点击上方「添加照片」导入图片</p>
        )}
      </div>
    </div>
  );
}
