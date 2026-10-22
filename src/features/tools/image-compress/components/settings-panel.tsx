import { FolderOpen, Save, Trash2, Zap } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import type {
  CompressConflictPolicy,
  CompressMetadataPolicy,
  CompressOptions,
  CompressOutputFormat,
  CompressOutputMode,
  CompressPreset,
  CompressResizeMode,
} from '@/platform/contracts';
import { useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { ScrollArea } from '@/shared/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Slider } from '@/shared/ui/slider';
import type { CompressMode } from '../types';
import { BUILTIN_PRESETS } from '../utils/presets';

type TargetUnit = 'kb' | 'mb';

interface SettingsPanelProps {
  mode: CompressMode;
  options: CompressOptions;
  outputDir: string;
  presets: CompressPreset[];
  running: boolean;
  importing: boolean;
  hasWebp: boolean;
  onModeChange: (mode: CompressMode) => void;
  onOptionChange: <K extends keyof CompressOptions>(key: K, value: CompressOptions[K]) => void;
  onApplyOptions: (patch: Partial<CompressOptions>) => void;
  onApplyPreset: (preset: CompressPreset) => void;
  onSavePreset: (name: string) => Promise<boolean>;
  onDeletePreset: (id: string) => Promise<void>;
  onChooseDir: () => void;
  onQuickStart: () => void;
}

/** 右栏：压缩模式 + 全部参数 + 预设。 */
export function SettingsPanel({
  mode,
  options,
  outputDir,
  presets,
  running,
  importing,
  hasWebp,
  onModeChange,
  onOptionChange,
  onApplyOptions,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onChooseDir,
  onQuickStart,
}: SettingsPanelProps) {
  const t = useTranslate();
  const [targetUnit, setTargetUnit] = useState<TargetUnit>('kb');
  const [saveOpen, setSaveOpen] = useState(false);
  const [draftName, setDraftName] = useState('');

  const usesQuality = options.output_format !== 'png';
  const targetEnabled = options.target_bytes !== null;
  const unitFactor = targetUnit === 'kb' ? 1024 : 1024 * 1024;
  const targetValue = targetEnabled
    ? Math.max(1, Math.round((options.target_bytes ?? 0) / unitFactor))
    : 500;

  const disabled = running || importing;

  const handleSavePreset = async () => {
    const saved = await onSavePreset(draftName);
    if (saved) {
      setSaveOpen(false);
      setDraftName('');
    }
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col overflow-hidden rounded-lg border border-border/80 bg-card/40">
      <div className="border-b border-border/60 px-3 py-2 text-[11px] font-medium text-muted-foreground">
        {t('compress.settings.mode')}
      </div>

      {/*
        用项目自绘的 ScrollArea（不要原生滚动条）。Radix 视口内部默认是 `display: table`，
        参数行会把内容按 min-content 撑宽、被裁掉；viewportClassName 把它改回普通块级布局。
      */}
      <ScrollArea className="min-h-0 flex-1" viewportClassName="[&>div]:!block [&>div]:!w-full">
        <div className="flex w-full min-w-0 flex-col gap-3 p-3 [&_input]:min-w-0">
          <Select value={mode} onValueChange={(value) => onModeChange(value as CompressMode)}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="quick">{t('compress.settings.modeQuick')}</SelectItem>
                <SelectItem value="custom">{t('compress.settings.modeCustom')}</SelectItem>
                <SelectItem value="presets">{t('compress.settings.modeRules')}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {mode === 'quick' ? (
            <div className="space-y-2 rounded-md border border-dashed border-border p-2">
              <p className="text-[11px] leading-4 text-muted-foreground">
                {t('compress.settings.quickHint')}
              </p>
              <Button size="sm" className="w-full" onClick={onQuickStart} disabled={disabled}>
                <Zap data-icon="inline-start" />
                {t('compress.settings.quickAction')}
              </Button>
            </div>
          ) : (
            <>
              {mode === 'presets' ? (
                <div className="space-y-1.5">
                  <FieldLabel>{t('compress.presets.builtin')}</FieldLabel>
                  <div className="flex flex-col gap-1">
                    {BUILTIN_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        size="sm"
                        variant="outline"
                        className="justify-start"
                        disabled={disabled}
                        onClick={() => onApplyOptions(preset.options)}
                      >
                        {t(preset.nameKey)}
                      </Button>
                    ))}
                  </div>

                  <FieldLabel>{t('compress.presets.saved')}</FieldLabel>
                  {presets.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      {t('compress.presets.empty')}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {presets.map((preset) => (
                        <div key={preset.id} className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-w-0 flex-1 justify-start"
                            disabled={disabled}
                            onClick={() => onApplyPreset(preset)}
                          >
                            <span className="truncate">{preset.name}</span>
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t('compress.presets.delete')}
                            title={t('compress.presets.delete')}
                            disabled={disabled}
                            onClick={() => void onDeletePreset(preset.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full justify-start"
                    disabled={disabled}
                    onClick={() => setSaveOpen(true)}
                  >
                    <Save data-icon="inline-start" />
                    {t('compress.presets.save')}
                  </Button>
                </div>
              ) : null}

              <Field label={t('compress.settings.format')}>
                <Select
                  value={options.output_format}
                  onValueChange={(value) =>
                    onOptionChange('output_format', value as CompressOutputFormat)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="keep" disabled={hasWebp}>
                        {t('compress.settings.formatKeep')}
                      </SelectItem>
                      <SelectItem value="jpeg">{t('compress.settings.formatJpeg')}</SelectItem>
                      <SelectItem value="png">{t('compress.settings.formatPng')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {hasWebp && options.output_format === 'keep' ? (
                  <p className="text-[10px] text-destructive">
                    {t('compress.settings.formatKeepBlocked')}
                  </p>
                ) : null}
              </Field>

              {usesQuality ? (
                <Field
                  label={t('compress.settings.quality')}
                  hint={t('compress.settings.qualityHint')}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Slider
                        value={[options.quality]}
                        min={1}
                        max={100}
                        step={1}
                        disabled={disabled}
                        onValueChange={([value]) => onOptionChange('quality', value)}
                      />
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={options.quality}
                      disabled={disabled}
                      className="h-7 w-14 px-1 text-center text-xs"
                      onChange={(event) =>
                        onOptionChange(
                          'quality',
                          Math.min(100, Math.max(1, Number(event.target.value) || 1)),
                        )
                      }
                    />
                  </div>
                </Field>
              ) : null}

              <Field label={t('compress.settings.resize')} hint={t('compress.settings.resizeHint')}>
                <Select
                  value={options.resize_mode}
                  onValueChange={(value) =>
                    onOptionChange('resize_mode', value as CompressResizeMode)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="original">
                        {t('compress.settings.resizeOriginal')}
                      </SelectItem>
                      <SelectItem value="max_edge">
                        {t('compress.settings.resizeMaxEdge')}
                      </SelectItem>
                      <SelectItem value="box">{t('compress.settings.resizeBox')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {options.resize_mode === 'max_edge' ? (
                  <NumberField
                    label={t('compress.settings.maxEdge')}
                    value={options.max_edge}
                    disabled={disabled}
                    onChange={(value) => onOptionChange('max_edge', value)}
                  />
                ) : null}

                {options.resize_mode === 'box' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label={t('compress.settings.boxWidth')}
                      value={options.box_width}
                      disabled={disabled}
                      onChange={(value) => onOptionChange('box_width', value)}
                    />
                    <NumberField
                      label={t('compress.settings.boxHeight')}
                      value={options.box_height}
                      disabled={disabled}
                      onChange={(value) => onOptionChange('box_height', value)}
                    />
                  </div>
                ) : null}
              </Field>

              <Field label={t('compress.settings.target')} hint={t('compress.settings.targetHint')}>
                <Select
                  value={targetEnabled ? 'size' : 'quality'}
                  onValueChange={(value) =>
                    onOptionChange('target_bytes', value === 'size' ? 500 * 1024 : null)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="quality">
                        {t('compress.settings.targetQuality')}
                      </SelectItem>
                      <SelectItem value="size">{t('compress.settings.targetSize')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {targetEnabled ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={targetValue}
                      disabled={disabled}
                      className="h-7 flex-1 px-1 text-xs"
                      onChange={(event) =>
                        onOptionChange(
                          'target_bytes',
                          Math.max(1, Number(event.target.value) || 1) * unitFactor,
                        )
                      }
                    />
                    <Select
                      value={targetUnit}
                      onValueChange={(value) => setTargetUnit(value as TargetUnit)}
                      disabled={disabled}
                    >
                      <SelectTrigger size="sm" className="w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="kb">{t('compress.settings.targetUnitKb')}</SelectItem>
                          <SelectItem value="mb">{t('compress.settings.targetUnitMb')}</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </Field>

              <Field
                label={t('compress.settings.metadata')}
                hint={t('compress.settings.metadataHint')}
              >
                <Select
                  value={options.metadata}
                  onValueChange={(value) =>
                    onOptionChange('metadata', value as CompressMetadataPolicy)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="keep">{t('compress.settings.metadataKeep')}</SelectItem>
                      <SelectItem value="essential">
                        {t('compress.settings.metadataEssential')}
                      </SelectItem>
                      <SelectItem value="strip">{t('compress.settings.metadataStrip')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {usesQuality ? (
                <Field
                  label={t('compress.settings.background')}
                  hint={t('compress.settings.backgroundHint')}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={options.background}
                      disabled={disabled}
                      onChange={(event) => onOptionChange('background', event.target.value)}
                      className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    />
                    <Input
                      value={options.background}
                      disabled={disabled}
                      className="h-7 flex-1 px-1 text-xs"
                      onChange={(event) => onOptionChange('background', event.target.value)}
                    />
                  </div>
                </Field>
              ) : null}

              <Field label={t('compress.settings.suffix')} hint={t('compress.settings.suffixHint')}>
                <Input
                  value={options.suffix}
                  disabled={disabled}
                  className="h-7 px-1 text-xs"
                  onChange={(event) => onOptionChange('suffix', event.target.value)}
                />
              </Field>

              <Field label={t('compress.settings.output')}>
                <Select
                  value={options.output_mode}
                  onValueChange={(value) =>
                    onOptionChange('output_mode', value as CompressOutputMode)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="custom">{t('compress.settings.outputCustom')}</SelectItem>
                      <SelectItem value="source">{t('compress.settings.outputSource')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {options.output_mode === 'custom' ? (
                  <button
                    type="button"
                    onClick={onChooseDir}
                    disabled={disabled}
                    className={cn(
                      'flex w-full items-center gap-1.5 rounded-md border border-border/70 px-2 py-1 text-left text-[11px] transition-colors',
                      'hover:border-primary/40 hover:bg-accent/60 disabled:pointer-events-none disabled:opacity-60',
                    )}
                  >
                    <FolderOpen className="size-3 shrink-0" />
                    <span className="truncate">{outputDir || t('compress.settings.noDir')}</span>
                  </button>
                ) : null}
              </Field>

              <Field
                label={t('compress.settings.conflict')}
                hint={t('compress.settings.conflictHint')}
              >
                <Select
                  value={options.on_conflict}
                  onValueChange={(value) =>
                    onOptionChange('on_conflict', value as CompressConflictPolicy)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="rename">
                        {t('compress.settings.conflictRename')}
                      </SelectItem>
                      <SelectItem value="skip">{t('compress.settings.conflictSkip')}</SelectItem>
                      <SelectItem value="overwrite">
                        {t('compress.settings.conflictOverwrite')}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
        </div>
      </ScrollArea>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('compress.presets.saveTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            value={draftName}
            placeholder={t('compress.presets.savePlaceholder')}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleSavePreset();
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              {t('compress.presets.cancel')}
            </Button>
            <Button onClick={() => void handleSavePreset()} disabled={!draftName.trim()}>
              {t('compress.presets.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint ? (
        <p className="text-[10px] leading-4 break-words text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-medium text-muted-foreground">{children}</div>;
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <Input
        type="number"
        min={1}
        value={value}
        disabled={disabled}
        className="h-7 px-1 text-xs"
        onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
      />
    </div>
  );
}
