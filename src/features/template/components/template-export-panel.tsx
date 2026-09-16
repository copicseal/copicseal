import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { createExportPreset, isValidPreset } from '@/features/template/lib/export-preset';
import type { ExportFormat, ExportOptions, ExportPreset } from '@/shared/types/export';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Slider } from '@/shared/ui/slider';

interface TemplateExportPanelProps {
  presets: ExportPreset[];
  onPresetsChange: (next: ExportPreset[]) => void;
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

/** 清空输入时用 NaN 占位：它既无法通过校验，也能让输入框显示为空。 */
function readSizeInput(raw: string): number {
  return raw === '' ? Number.NaN : Number(raw);
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
            value={Number.isFinite(preset.width) ? preset.width : ''}
            onChange={(event) => update({ width: readSizeInput(event.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">目标高</span>
          <Input
            type="number"
            min={1}
            value={Number.isFinite(preset.height) ? preset.height : ''}
            onChange={(event) => update({ height: readSizeInput(event.target.value) })}
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

export function TemplateExportPanel({
  presets,
  onPresetsChange,
  onExportCurrent,
  onExportBatch,
}: TemplateExportPanelProps) {
  const [exporting, setExporting] = useState<'single' | 'batch' | null>(null);

  // 两轴必填：无背景时目标框是 contain 约束，有背景时它就是画框尺寸
  const ready = presets.every(isValidPreset);

  const buildOptions = (): ExportOptions => ({
    presets,
    dpi: 72,
    preserveExif: true,
  });

  const updatePreset = (index: number, next: ExportPreset) => {
    onPresetsChange(presets.map((preset, i) => (i === index ? next : preset)));
  };

  const removePreset = (index: number) => {
    if (presets.length <= 1) {
      return;
    }
    onPresetsChange(presets.filter((_, i) => i !== index));
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
          每个档位是一组目标尺寸与编码参数。无背景时目标框只作等比约束，有背景时画框精确等于目标尺寸。
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
        onClick={() => onPresetsChange([...presets, createExportPreset()])}
      >
        <Plus data-icon="inline-start" />
        添加档位
      </Button>

      {!ready ? (
        <p className="text-[10px] leading-4 text-destructive">
          目标宽与目标高都必须填写正数，否则无法解算导出尺寸。
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button
          variant="outline"
          disabled={exporting !== null || !ready}
          onClick={() => void handleExportCurrent()}
        >
          {exporting === 'single' ? <Loader2 className="size-3.5 animate-spin" /> : null}
          导出当前
        </Button>
        <Button disabled={exporting !== null || !ready} onClick={() => void handleExportBatch()}>
          {exporting === 'batch' ? <Loader2 className="size-3.5 animate-spin" /> : null}
          批量导出
        </Button>
      </div>
    </div>
  );
}
