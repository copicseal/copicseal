import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { COLLAGE_EXPORT_LABELS, COLLAGE_RATIO_OPTIONS } from '@/features/collage/lib';
import { useCollageStore } from '@/features/collage/store/use-collage-store';
import { usePhotos } from '@/shared/hooks/use-photos';
import type { ExportOptions } from '@/shared/lib/export-photo';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Slider } from '@/shared/ui/slider';

interface CollagePropertiesPanelProps {
  onExportCurrent: (options: ExportOptions) => Promise<void>;
  onExportBatch: (options: ExportOptions) => Promise<void>;
}

export function CollagePropertiesPanel({
  onExportCurrent,
  onExportBatch,
}: CollagePropertiesPanelProps) {
  const { photos } = usePhotos();
  const { present, selectedSlotIndex, updateCanvas, updateSlot, updateExportSettings } =
    useCollageStore();
  const [scale, setScale] = useState([1]);
  const [quality, setQuality] = useState([90]);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [exporting, setExporting] = useState<'single' | 'batch' | null>(null);

  const selectedSlot =
    selectedSlotIndex !== null ? (present.slotItems[selectedSlotIndex] ?? null) : null;

  const buildOptions = (): ExportOptions => ({
    format: present.exportSettings.format,
    scale: scale[0],
    quality: quality[0],
    dpi: 72,
    preserveExif: false,
    width: width ? Number(width) : undefined,
    height: height ? Number(height) : undefined,
  });

  const handleExportCurrent = async () => {
    setExporting('single');
    try {
      await onExportCurrent(buildOptions());
    } finally {
      setExporting(null);
    }
  };

  const handleExportBatch = async () => {
    setExporting('batch');
    try {
      await onExportBatch(buildOptions());
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-3">
      <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold">布局</h3>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            控制画布布局、间距与背景样式。
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <span className="text-xs font-medium text-foreground">画布比例</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {COLLAGE_RATIO_OPTIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => updateCanvas({ aspectPreset: item.label })}
                  className={`border px-3 py-2 text-xs ${
                    present.canvas.aspectPreset === item.label
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>间距</span>
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
              <span>边距</span>
              <span>{present.canvas.padding}px</span>
            </div>
            <Slider
              value={[present.canvas.padding]}
              onValueChange={([value]) => updateCanvas({ padding: value })}
              min={0}
              max={80}
              step={1}
            />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">背景色</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={present.canvas.backgroundColor}
                onChange={(event) => updateCanvas({ backgroundColor: event.target.value })}
                className="h-9 w-12 border border-border bg-background p-1"
              />
              <Input
                value={present.canvas.backgroundColor}
                onChange={(event) => updateCanvas({ backgroundColor: event.target.value })}
              />
            </div>
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>圆角</span>
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

          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>阴影</span>
              <span>{present.canvas.shadow}</span>
            </div>
            <Slider
              value={[present.canvas.shadow]}
              onValueChange={([value]) => updateCanvas({ shadow: value })}
              min={0}
              max={40}
              step={1}
            />
          </div>
        </div>
      </section>

      <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold">选中项</h3>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            {selectedSlotIndex === null
              ? '选择画布中的图片区域后，在这里调整单图属性。'
              : `当前选中第 ${selectedSlotIndex + 1} 个拼图槽位。`}
          </p>
        </div>

        {selectedSlot && selectedSlotIndex !== null ? (
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>缩放</span>
                <span>{selectedSlot.scale.toFixed(2)}x</span>
              </div>
              <Slider
                value={[selectedSlot.scale]}
                onValueChange={([value]) => updateSlot(selectedSlotIndex, { scale: value })}
                min={1}
                max={3}
                step={0.01}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>水平位置</span>
                <span>{Math.round(selectedSlot.offsetX)}px</span>
              </div>
              <Slider
                value={[selectedSlot.offsetX]}
                onValueChange={([value]) => updateSlot(selectedSlotIndex, { offsetX: value })}
                min={-180}
                max={180}
                step={1}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>垂直位置</span>
                <span>{Math.round(selectedSlot.offsetY)}px</span>
              </div>
              <Slider
                value={[selectedSlot.offsetY]}
                onValueChange={([value]) => updateSlot(selectedSlotIndex, { offsetY: value })}
                min={-180}
                max={180}
                step={1}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>旋转</span>
                <span>{Math.round(selectedSlot.rotation)}deg</span>
              </div>
              <Slider
                value={[selectedSlot.rotation]}
                onValueChange={([value]) => updateSlot(selectedSlotIndex, { rotation: value })}
                min={-45}
                max={45}
                step={1}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>圆角</span>
                <span>{selectedSlot.borderRadius ?? present.canvas.borderRadius}px</span>
              </div>
              <Slider
                value={[selectedSlot.borderRadius ?? present.canvas.borderRadius]}
                onValueChange={([value]) => updateSlot(selectedSlotIndex, { borderRadius: value })}
                min={0}
                max={48}
                step={1}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold">导出</h3>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            与边框水印共用导出参数结构，导出内容来自当前拼图工作区。
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['png', 'jpeg'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateExportSettings({ format: item })}
                className={`border px-3 py-2 text-xs ${
                  present.exportSettings.format === item
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border'
                }`}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['standard', 'high', 'ultra'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateExportSettings({ quality: item })}
                className={`border px-3 py-2 text-xs ${
                  present.exportSettings.quality === item
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border'
                }`}
              >
                {COLLAGE_EXPORT_LABELS[item]}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-foreground">倍率</span>
            <Slider value={scale} onValueChange={setScale} min={0.5} max={3} step={0.1} />
            <span className="text-[10px] text-muted-foreground">{scale[0].toFixed(1)}x</span>
          </div>

          {present.exportSettings.format !== 'png' ? (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-foreground">质量</span>
              <Slider value={quality} onValueChange={setQuality} min={1} max={100} step={1} />
              <span className="text-[10px] text-muted-foreground">{quality[0]}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-foreground">宽度</span>
              <Input
                value={width}
                onChange={(event) => setWidth(event.target.value)}
                placeholder="自动"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-foreground">高度</span>
              <Input
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                placeholder="自动"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              disabled={exporting !== null || photos.length === 0}
              onClick={() => void handleExportCurrent()}
            >
              {exporting === 'single' ? <Loader2 className="size-3.5 animate-spin" /> : null}
              导出当前
            </Button>
            <Button
              disabled={exporting !== null || photos.length === 0}
              onClick={() => void handleExportBatch()}
            >
              {exporting === 'batch' ? <Loader2 className="size-3.5 animate-spin" /> : null}
              批量导出
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
