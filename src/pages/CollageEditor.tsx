import { Download, ImagePlus, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';
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
  /** CSS grid-template-areas style for preview thumb */
  areas: string;
}

const LAYOUT_GROUPS: { count: number; label: string; layouts: CollageLayout[] }[] = [
  {
    count: 2,
    label: '两张',
    layouts: [
      { id: 'two-h', label: '左右', count: 2, cols: 2, rows: 1, areas: '"A B"' },
      { id: 'two-v', label: '上下', count: 2, cols: 1, rows: 2, areas: '"A" "B"' },
      { id: 'two-big-left', label: '左大右小', count: 2, cols: 3, rows: 1, areas: '"A A B"' },
      { id: 'two-big-right', label: '左小右大', count: 2, cols: 3, rows: 1, areas: '"A B B"' },
    ],
  },
  {
    count: 3,
    label: '三张',
    layouts: [
      { id: 'three-h', label: '横排', count: 3, cols: 3, rows: 1, areas: '"A B C"' },
      { id: 'three-v', label: '竖排', count: 3, cols: 1, rows: 3, areas: '"A" "B" "C"' },
      {
        id: 'three-big-top',
        label: '上大下两小',
        count: 3,
        cols: 2,
        rows: 2,
        areas: '"A A" "B C"',
      },
      {
        id: 'three-big-left',
        label: '左大右两小',
        count: 3,
        cols: 2,
        rows: 2,
        areas: '"A B" "A C"',
      },
    ],
  },
  {
    count: 4,
    label: '四张',
    layouts: [
      { id: 'grid2x2', label: '田字', count: 4, cols: 2, rows: 2, areas: '"A B" "C D"' },
      { id: 'four-h', label: '四列', count: 4, cols: 4, rows: 1, areas: '"A B C D"' },
    ],
  },
];

function LayoutThumbnail({ layout, active }: { layout: CollageLayout; active: boolean }) {
  const cols = layout.cols;
  const rows = layout.rows;
  const areaNames = new Set(layout.areas.match(/[A-Z]/g) || []);
  const w = 40;
  const h = rows > cols ? 48 : Math.round((w / cols) * rows);
  return (
    <div
      className={`overflow-hidden rounded border-2 transition-colors ${
        active ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
      }`}
      style={{ width: w, height: h }}
    >
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gridTemplateAreas: layout.areas,
          gap: 1,
        }}
      >
        {Array.from(areaNames)
          .sort()
          .map((name) => (
            <div
              key={`${layout.id}-${name}`}
              className="bg-muted-foreground/25"
              style={{ gridArea: name }}
            />
          ))}
      </div>
    </div>
  );
}

export function CollageEditor() {
  const { photos, importViaDialog } = usePhotos();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [layoutId, setLayoutId] = useState<string>('two-h');
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(2).fill(null));
  const [gap, setGap] = useState(8);
  const [exporting, setExporting] = useState(false);
  const bg = '#ffffff';
  const radius = 0;

  const allLayouts = LAYOUT_GROUPS.flatMap((g) => g.layouts);
  const layout = allLayouts.find((l) => l.id === layoutId) ?? allLayouts[0];
  const slotCount = layout.count;

  const handleLayoutChange = (id: string) => {
    setLayoutId(id);
    const l = allLayouts.find((la) => la.id === id) ?? allLayouts[0];
    setSlots(Array(l.count).fill(null));
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
        exclude: ['.collage-ui-btn'],
      });
    } catch (err) {
      console.error('导出拼图失败:', err);
    } finally {
      setExporting(false);
    }
  };

  const anyPhoto = slots.some((s) => s !== null);
  const areaNames = (layout.areas.match(/[A-Z]/g) || []).sort();

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
    gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
    gridTemplateAreas: layout.areas,
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
            {Array.from({ length: slotCount }).map((_, i) => {
              const pid = slots[i];
              const photo = pid ? photos.find((p) => p.id === pid) : null;
              const areaName = areaNames[i] ?? String(i);
              return (
                <div
                  key={areaName}
                  className="relative flex items-center justify-center overflow-hidden bg-muted/50"
                  style={{ borderRadius: `${radius}px`, gridArea: areaName }}
                >
                  {photo ? (
                    <>
                      <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
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
          <p className="px-2 text-xs text-muted-foreground">点击「添加照片」导入图片</p>
        )}
      </div>
    </div>
  );
}
