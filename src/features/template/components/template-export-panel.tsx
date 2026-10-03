import { Plus, Save, Trash2 } from 'lucide-react';
import { createExportPreset, resolvePresetFileName } from '@/features/template/lib/export-preset';
import type { ExportFormat, ExportPreset } from '@/shared/types/export';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Slider } from '@/shared/ui/slider';

interface TemplateExportPanelProps {
  presets: ExportPreset[];
  /** 当前照片的文件名主干（不含扩展名），用于档位的自动命名 */
  baseName: string;
  /** 档位是否齐备（两轴都为正数）；不齐时导出按钮禁用，由页面统一判定 */
  ready: boolean;
  onPresetsChange: (next: ExportPreset[]) => void;
  /** 把当前这组档位存成设置里的「默认档位」；档位不齐时按钮禁用 */
  onSaveAsDefault: () => void;
}

interface ExportPresetCardProps {
  preset: ExportPreset;
  baseName: string;
  canRemove: boolean;
  onChange: (next: ExportPreset) => void;
  onRemove: () => void;
}

const FORMATS: ExportFormat[] = ['png', 'jpeg'];

/** 清空输入时用 NaN 占位：它既无法通过校验，也能让输入框显示为空。 */
function readSizeInput(raw: string): number {
  return raw === '' ? Number.NaN : Number(raw);
}

function ExportPresetCard({
  preset,
  baseName,
  canRemove,
  onChange,
  onRemove,
}: ExportPresetCardProps) {
  const update = (patch: Partial<ExportPreset>) => onChange({ ...preset, ...patch });

  // 留空即自动命名：名字跟着目标尺寸走；手填之后就不再被覆盖
  const fileName = resolvePresetFileName(preset, baseName);
  const extension = `.${preset.format === 'jpeg' ? 'jpg' : preset.format}`;

  return (
    <div className="space-y-2 border border-border/70 bg-background/60 p-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            value={fileName}
            aria-label="导出文件名"
            onChange={(event) =>
              update({
                fileName: event.target.value.trim() === '' ? undefined : event.target.value,
              })
            }
            className="h-7 pr-11 text-xs"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-muted-foreground">
            {extension}
          </span>
        </div>
        {canRemove ? (
          <Button
            type="button"
            variant="plain"
            size="icon-sm"
            aria-label={`删除 ${fileName}`}
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
  baseName,
  ready,
  onPresetsChange,
  onSaveAsDefault,
}: TemplateExportPanelProps) {
  const updatePreset = (index: number, next: ExportPreset) => {
    onPresetsChange(presets.map((preset, i) => (i === index ? next : preset)));
  };

  const removePreset = (index: number) => {
    if (presets.length <= 1) {
      return;
    }
    onPresetsChange(presets.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {presets.map((preset, index) => (
          <ExportPresetCard
            key={preset.id}
            preset={preset}
            baseName={baseName}
            canRemove={presets.length > 1}
            onChange={(next) => updatePreset(index, next)}
            onRemove={() => removePreset(index)}
          />
        ))}
      </div>

      {/* 竖着排：属性面板会被拖窄，两个按钮并排时「存为默认档位」会被压出格 */}
      <div className="space-y-2">
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!ready}
          onClick={onSaveAsDefault}
        >
          <Save data-icon="inline-start" />
          存为默认档位
        </Button>
      </div>

      {!ready ? (
        <p className="text-[10px] leading-4 text-destructive">
          目标宽与目标高都必须填写正数，否则无法解算导出尺寸。
        </p>
      ) : null}
    </div>
  );
}
