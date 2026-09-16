import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ExportFormat, ExportOptions, ExportPreset } from '@/shared/lib/export-photo';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Slider } from '@/shared/ui/slider';

interface TemplateExportPanelProps {
  onExportCurrent: (options: ExportOptions) => Promise<void>;
  onExportBatch: (options: ExportOptions) => Promise<void>;
}

interface ExportPresetCardProps {
  preset: ExportPreset;
  canRemove: boolean;
  onChange: (next: ExportPreset) => void;
  onRemove: () => void;
}

const FORMATS: ExportFormat[] = ['png', 'jpeg', 'webp'];

let presetSeq = 0;

/** 新建一个档位：默认目标框 2000×2000，按 contain 等比命中主导轴。 */
function createPreset(): ExportPreset {
  presetSeq += 1;
  return {
    id: `preset-${presetSeq}`,
    label: `档位 ${presetSeq}`,
    format: 'png',
    width: 2000,
    height: 2000,
    scale: 1,
    quality: 90,
  };
}

function ExportPresetCard({ preset, canRemove, onChange, onRemove }: ExportPresetCardProps) {
  const update = (patch: Partial<ExportPreset>) => onChange({ ...preset, ...patch });

  return (
    <div className="space-y-2 border border-border/70 bg-background/60 p-3">
      <div className="flex items-center gap-2">
        <Input
          value={preset.label}
          onChange={(event) => update({ label: event.target.value })}
          className="h-7 text-xs"
        />
        {canRemove ? (
          <Button
            type="button"
            variant="plain"
            size="icon-sm"
            aria-label={`删除 ${preset.label}`}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {FORMATS.map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => update({ format })}
            className={`border px-2 py-1.5 text-[10px] ${
              preset.format === format
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border text-muted-foreground'
            }`}
          >
            {format.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">目标宽</span>
          <Input
            type="number"
            min={1}
            value={preset.width ?? ''}
            placeholder="自动"
            onChange={(event) =>
              update({ width: event.target.value === '' ? undefined : Number(event.target.value) })
            }
          />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">目标高</span>
          <Input
            type="number"
            min={1}
            value={preset.height ?? ''}
            placeholder="自动"
            onChange={(event) =>
              update({ height: event.target.value === '' ? undefined : Number(event.target.value) })
            }
          />
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">倍率 {preset.scale.toFixed(1)}x</span>
        <Slider
          value={[preset.scale]}
          onValueChange={([value]) => update({ scale: value })}
          min={1}
          max={4}
          step={0.5}
        />
      </div>

      {preset.format !== 'png' ? (
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">质量 {preset.quality}</span>
          <Slider
            value={[preset.quality]}
            onValueChange={([value]) => update({ quality: value })}
            min={1}
            max={100}
            step={1}
          />
        </div>
      ) : null}
    </div>
  );
}

export function TemplateExportPanel({ onExportCurrent, onExportBatch }: TemplateExportPanelProps) {
  const [presets, setPresets] = useState<ExportPreset[]>(() => [createPreset()]);
  const [exporting, setExporting] = useState<'single' | 'batch' | null>(null);

  const buildOptions = (): ExportOptions => ({
    presets,
    dpi: 72,
    preserveExif: true,
  });

  const updatePreset = (index: number, next: ExportPreset) => {
    setPresets((current) => current.map((preset, i) => (i === index ? next : preset)));
  };

  const removePreset = (index: number) => {
    setPresets((current) =>
      current.length <= 1 ? current : current.filter((_, i) => i !== index),
    );
  };

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
          每个档位是一组输出尺寸与编码参数。模板按目标框等比缩放：主导轴精确命中，另一轴按比例推导。
        </p>
      </div>

      <div className="space-y-2">
        {presets.map((preset, index) => (
          <ExportPresetCard
            key={preset.id}
            preset={preset}
            canRemove={presets.length > 1}
            onChange={(next) => updatePreset(index, next)}
            onRemove={() => removePreset(index)}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setPresets((current) => [...current, createPreset()])}
      >
        <Plus data-icon="inline-start" />
        添加档位
      </Button>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button
          variant="outline"
          disabled={exporting !== null}
          onClick={() => void handleExportCurrent()}
        >
          {exporting === 'single' ? <Loader2 className="size-3.5 animate-spin" /> : null}
          导出当前
        </Button>
        <Button disabled={exporting !== null} onClick={() => void handleExportBatch()}>
          {exporting === 'batch' ? <Loader2 className="size-3.5 animate-spin" /> : null}
          批量导出
        </Button>
      </div>
    </div>
  );
}
