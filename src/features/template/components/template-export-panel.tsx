import { ChevronDown, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  createExportPreset,
  createExportPresetForSize,
  resolvePresetFileName,
} from '@/features/template/lib/export-preset';
import type { OutputSize } from '@/platform/contracts';
import { type MessageKey, useTranslate } from '@/shared/i18n';
import type { ExportFormat, ExportPreset } from '@/shared/types/export';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
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
  /** 下拉里的常用尺寸；空数组表示用户把它们删光了 */
  sizes: readonly OutputSize[];
  /** 下拉打开时触发：让上层重新读一次设置，避免设置页刚改完这里还是旧清单 */
  onSizesOpen?: () => void;
  /**
   * 读取当前照片的像素尺寸，给「原始尺寸」那一项用。
   *
   * 用回调而不是值：面板打开时才知道照片尺寸，且换图后不必重新挂载面板。
   * 读不到（图片没加载完）时该项禁用。
   */
  resolvePhotoSize?: () => { width: number; height: number } | null;
}

interface ExportPresetCardProps {
  preset: ExportPreset;
  baseName: string;
  canRemove: boolean;
  onChange: (next: ExportPreset) => void;
  onRemove: () => void;
}

const FORMATS: ExportFormat[] = ['png', 'jpeg'];

/** 格式按钮上的可读名称：枚举值仍是 `png` / `jpeg`，只有显示走文案 */
const FORMAT_LABEL_KEYS: Record<ExportFormat, MessageKey> = {
  png: 'templateExport.format.png',
  jpeg: 'templateExport.format.jpeg',
};

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
  const t = useTranslate();
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
            aria-label={t('templateExport.panel.fileName')}
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
            aria-label={t('templateExport.panel.removePreset', { name: fileName })}
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
            {t(FORMAT_LABEL_KEYS[format])}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">
            {t('templateExport.preset.targetWidth')}
          </span>
          <Input
            type="number"
            min={1}
            value={Number.isFinite(preset.width) ? preset.width : ''}
            onChange={(event) => update({ width: readSizeInput(event.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">
            {t('templateExport.preset.targetHeight')}
          </span>
          <Input
            type="number"
            min={1}
            value={Number.isFinite(preset.height) ? preset.height : ''}
            onChange={(event) => update({ height: readSizeInput(event.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">
          {t('templateExport.preset.scale', { scale: preset.scale.toFixed(1) })}
        </span>
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
          <span className="text-[10px] text-muted-foreground">
            {t('templateExport.quality.label', { value: preset.quality })}
          </span>
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
  sizes,
  onSizesOpen,
  onPresetsChange,
  onSaveAsDefault,
  resolvePhotoSize,
}: TemplateExportPanelProps) {
  const t = useTranslate();
  const [photoSize, setPhotoSize] = useState<{ width: number; height: number } | null>(null);

  /** 新建档位：带上尺寸时按该尺寸，否则用内置默认尺寸。 */
  const addPreset = (size?: { width: number; height: number }) => {
    // 沿用最后一个档位的格式 / 质量 / 倍率，用户调过的参数不必重设
    const like = presets[presets.length - 1];
    onPresetsChange([
      ...presets,
      size ? createExportPresetForSize(size, like) : createExportPreset(),
    ]);
  };

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
        {/* 添加档位做成组合按钮：右侧倒三角列出常用尺寸，点一下直接按该尺寸建档位 */}
        <div className="flex items-stretch gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-w-0 flex-1"
            onClick={() => addPreset()}
          >
            <Plus data-icon="inline-start" />
            {t('templateExport.panel.addPreset')}
          </Button>
          <DropdownMenu
            onOpenChange={(open) => {
              if (open) {
                setPhotoSize(resolvePhotoSize?.() ?? null);
                onSizesOpen?.();
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={t('templateExport.panel.addPresetBySize')}
              >
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{t('templateExport.size.menuLabel')}</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={!photoSize}
                onSelect={() => {
                  if (photoSize) {
                    addPreset(photoSize);
                  }
                }}
              >
                <span className="flex-1">{t('templateExport.size.original')}</span>
                <span className="text-[10px] text-muted-foreground">
                  {photoSize
                    ? `${photoSize.width}×${photoSize.height}`
                    : t('templateExport.size.photoNotReady')}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {sizes.length === 0 ? (
                <DropdownMenuItem disabled>{t('templateExport.size.empty')}</DropdownMenuItem>
              ) : (
                sizes.map((size, index) => (
                  <DropdownMenuItem
                    key={size.id ?? `${size.label}-${index}`}
                    onSelect={() => addPreset({ width: size.width, height: size.height })}
                  >
                    <span className="flex-1">{size.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {size.width}×{size.height}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!ready}
          onClick={onSaveAsDefault}
        >
          <Save data-icon="inline-start" />
          {t('templateExport.panel.saveAsDefault')}
        </Button>
      </div>

      {!ready ? (
        <p className="text-[10px] leading-4 text-destructive">
          {t('templateExport.error.invalidSize')}
        </p>
      ) : null}
    </div>
  );
}
