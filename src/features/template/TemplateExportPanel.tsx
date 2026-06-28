import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import type { ExportFormat, ExportOptions } from '@/lib/export-photo';

interface TemplateExportPanelProps {
  onExportCurrent: (options: ExportOptions) => Promise<void>;
  onExportBatch: (options: ExportOptions) => Promise<void>;
}

export function TemplateExportPanel({ onExportCurrent, onExportBatch }: TemplateExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState([1]);
  const [quality, setQuality] = useState([90]);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [exporting, setExporting] = useState<'single' | 'batch' | null>(null);

  const buildOptions = (): ExportOptions => ({
    format,
    scale: scale[0],
    quality: quality[0],
    dpi: 72,
    preserveExif: true,
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
      <div>
        <h3 className="text-sm font-semibold">导出</h3>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          当前模板结果支持导出当前图片与批量导出资产栏中的全部图片。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['png', 'jpeg', 'webp'] as ExportFormat[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFormat(item)}
            className={`border px-3 py-2 text-xs ${
              format === item ? 'border-primary bg-primary/5 text-foreground' : 'border-border'
            }`}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-foreground">倍率</span>
        <Slider value={scale} onValueChange={setScale} min={0.5} max={3} step={0.1} />
        <span className="text-[10px] text-muted-foreground">{scale[0].toFixed(1)}x</span>
      </div>

      {format !== 'png' ? (
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
            className="h-9 rounded-none text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-foreground">高度</span>
          <Input
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            placeholder="自动"
            className="h-9 rounded-none text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button
          variant="outline"
          className="rounded-none"
          disabled={exporting !== null}
          onClick={() => void handleExportCurrent()}
        >
          {exporting === 'single' ? <Loader2 className="size-3.5 animate-spin" /> : null}
          导出当前
        </Button>
        <Button
          className="rounded-none"
          disabled={exporting !== null}
          onClick={() => void handleExportBatch()}
        >
          {exporting === 'batch' ? <Loader2 className="size-3.5 animate-spin" /> : null}
          批量导出
        </Button>
      </div>
    </div>
  );
}
