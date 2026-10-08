import {
  ChevronDown,
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  COLLAGE_EXPORT_LABEL_KEYS,
  COLLAGE_RATIO_OPTIONS,
  canvasStateFromConfig,
  clamp,
  exportStateFromConfig,
  heightFromRatio,
  isSameCanvasState,
  isSameExportState,
} from '@/features/collage/lib';
import { useCollageStore } from '@/features/collage/store/use-collage-store';
import type { OutputSize } from '@/platform/contracts';
import { CoPanelSection } from '@/shared/components/co-panel-section';
import { usePhotos } from '@/shared/hooks/use-photos';
import { type MessageKey, useTranslate } from '@/shared/i18n';
import { selectPhotosViaDialog } from '@/shared/lib/import-photo';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { Slider } from '@/shared/ui/slider';
import { Switch } from '@/shared/ui/switch';

interface CollagePropertiesPanelProps {
  onExport: () => void;
  exporting: boolean;
  /** 导出比例基准：长图用画布实测比例，其余用设置里的画布比例 */
  canvasRatio: number;
  /** 设置 → 导出里的常用尺寸，和「边框水印」共用同一份配置 */
  sizes: readonly OutputSize[];
  onSizesOpen?: () => void;
}

type PanelTab = 'slot' | 'canvas';

const TARGET_TABS: Array<{ id: PanelTab; labelKey: MessageKey }> = [
  { id: 'slot', labelKey: 'collage.properties.targetSlot' },
  { id: 'canvas', labelKey: 'collage.properties.targetCanvas' },
];

function FieldLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function CollagePropertiesPanel({
  onExport,
  exporting,
  canvasRatio,
  sizes,
  onSizesOpen,
}: CollagePropertiesPanelProps) {
  const t = useTranslate();
  const { photos, replacePhoto } = usePhotos();
  const {
    present,
    selectedSlotIndex,
    updateCanvas,
    updateSlot,
    resetSlot,
    clearSlot,
    moveSlot,
    selectSlot,
    resetCanvas,
    resetExportSettings,
    configDefaults,
    updateExportSettings,
    setAspectPreset,
    setCustomRatio,
  } = useCollageStore();

  const [tab, setTab] = useState<PanelTab>('canvas');
  const [sizeText, setSizeText] = useState({
    width: String(present.exportSettings.width),
    height: String(present.exportSettings.height),
  });
  const [customText, setCustomText] = useState({
    width: String(present.canvas.customRatioWidth),
    height: String(present.canvas.customRatioHeight),
  });

  const mode = present.canvas.layoutMode;
  // 「恢复默认」恢复的是**设置里**的默认值，不是出厂值
  const defaultCanvas = canvasStateFromConfig(configDefaults);
  const defaultExport = exportStateFromConfig(configDefaults);
  const isLong = mode === 'long';
  const slot = selectedSlotIndex !== null ? (present.slotItems[selectedSlotIndex] ?? null) : null;
  const slotPhoto = slot?.photoId
    ? (photos.find((photo) => photo.id === slot.photoId) ?? null)
    : null;

  // 选中画布上的某一格时自动切到「单格」，不用再点一次
  useEffect(() => {
    if (selectedSlotIndex !== null) {
      setTab('slot');
    }
  }, [selectedSlotIndex]);

  useEffect(() => {
    setSizeText({
      width: String(present.exportSettings.width),
      height: String(present.exportSettings.height),
    });
  }, [present.exportSettings.height, present.exportSettings.width]);

  const commitSize = () => {
    const rawWidth = Math.round(Number(sizeText.width));
    const width = clamp(
      Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : present.exportSettings.width,
      64,
      12000,
    );
    const height = present.exportSettings.lockRatio
      ? heightFromRatio(width, canvasRatio)
      : clamp(Math.round(Number(sizeText.height)) || present.exportSettings.height, 64, 12000);

    updateExportSettings({ width, height });
    setSizeText({ width: String(width), height: String(height) });
  };

  const handleLockRatio = (locked: boolean) => {
    updateExportSettings({
      lockRatio: locked,
      height: locked
        ? heightFromRatio(present.exportSettings.width, canvasRatio)
        : present.exportSettings.height,
    });
  };

  const handleReplace = async (photoId: string) => {
    const selectedPhotos = await selectPhotosViaDialog();
    if (!selectedPhotos[0]) {
      return;
    }

    replacePhoto(photoId, selectedPhotos[0]);
  };

  const slotIndex = selectedSlotIndex;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-foreground">
          {t('collage.properties.target')}
        </span>
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          {TARGET_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                tab === item.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'slot' ? (
        <CoPanelSection
          title={t('collage.properties.slotSection.title')}
          description={t('collage.properties.slotSection.description')}
        >
          {!slot || slotIndex === null ? (
            <p className="rounded-lg border border-border/80 bg-background/70 px-4 py-4 text-center text-xs leading-6 text-muted-foreground shadow-sm">
              {t('collage.properties.slotSection.empty')}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 border border-border/70 bg-muted/20 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    {t('collage.properties.slotIndex', { index: slotIndex + 1 })}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {slotPhoto ? slotPhoto.name : t('collage.properties.emptySlot')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {slotPhoto ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleReplace(slotPhoto.id)}
                    >
                      <Upload data-icon="inline-start" />
                      {t('collage.properties.replace')}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!slotPhoto}
                    onClick={() => clearSlot(slotIndex)}
                  >
                    <Trash2 data-icon="inline-start" />
                    {t('collage.properties.clear')}
                  </Button>
                </div>
              </div>

              {mode === 'free' ? (
                <>
                  <div>
                    <FieldLabel
                      label={t('collage.properties.size')}
                      value={`${Math.round(slot.freeW)}%`}
                    />
                    <Slider
                      value={[slot.freeW]}
                      min={4}
                      max={100}
                      step={1}
                      onValueChange={([value]) => updateSlot(slotIndex, { freeW: value })}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label={t('collage.properties.offsetX')}
                      value={`${Math.round(slot.freeX)}%`}
                    />
                    <Slider
                      value={[slot.freeX]}
                      min={-10}
                      max={95}
                      step={1}
                      onValueChange={([value]) => updateSlot(slotIndex, { freeX: value })}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label={t('collage.properties.offsetY')}
                      value={`${Math.round(slot.freeY)}%`}
                    />
                    <Slider
                      value={[slot.freeY]}
                      min={-10}
                      max={95}
                      step={1}
                      onValueChange={([value]) => updateSlot(slotIndex, { freeY: value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <FieldLabel
                      label={t('collage.properties.scale')}
                      value={`${slot.scale.toFixed(2)}x`}
                    />
                    <Slider
                      value={[slot.scale]}
                      min={mode === 'grid' ? 1 : 0.2}
                      max={4}
                      step={0.02}
                      onValueChange={([value]) => updateSlot(slotIndex, { scale: value })}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label={t('collage.properties.offsetX')}
                      value={`${Math.round(slot.offsetX)}%`}
                    />
                    <Slider
                      value={[slot.offsetX]}
                      min={-50}
                      max={50}
                      step={1}
                      onValueChange={([value]) => updateSlot(slotIndex, { offsetX: value })}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label={t('collage.properties.offsetY')}
                      value={`${Math.round(slot.offsetY)}%`}
                    />
                    <Slider
                      value={[slot.offsetY]}
                      min={-50}
                      max={50}
                      step={1}
                      onValueChange={([value]) => updateSlot(slotIndex, { offsetY: value })}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label={t('collage.properties.rotation')}
                      value={`${Math.round(slot.rotation)}°`}
                    />
                    <Slider
                      value={[slot.rotation]}
                      min={-45}
                      max={45}
                      step={1}
                      onValueChange={([value]) => updateSlot(slotIndex, { rotation: value })}
                    />
                  </div>
                  {mode === 'grid' ? (
                    <div>
                      <span className="text-xs font-medium text-foreground">
                        {t('collage.properties.fit')}
                      </span>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {(['cover', 'contain'] as const).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => updateSlot(slotIndex, { fit: item })}
                            className={cn(
                              'border px-3 py-2 text-xs',
                              slot.fit === item
                                ? 'border-primary bg-primary/5 text-foreground'
                                : 'border-border text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {item === 'cover'
                              ? t('collage.properties.fitCover')
                              : t('collage.properties.fitContain')}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                        {slot.fit === 'cover'
                          ? t('collage.properties.fitCoverHint')
                          : t('collage.properties.fitContainHint')}
                      </p>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={slot.flipX ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSlot(slotIndex, { flipX: !slot.flipX })}
                    >
                      <FlipHorizontal2 data-icon="inline-start" />
                      {t('collage.properties.flipHorizontal')}
                    </Button>
                    <Button
                      variant={slot.flipY ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSlot(slotIndex, { flipY: !slot.flipY })}
                    >
                      <FlipVertical2 data-icon="inline-start" />
                      {t('collage.properties.flipVertical')}
                    </Button>
                  </div>
                </>
              )}

              <div>
                <FieldLabel
                  label={t('collage.properties.radius')}
                  value={
                    slot.borderRadius === null
                      ? t('collage.properties.radiusFollowCanvas', {
                          value: present.canvas.borderRadius,
                        })
                      : `${slot.borderRadius}px`
                  }
                />
                <Slider
                  value={[slot.borderRadius ?? present.canvas.borderRadius]}
                  min={0}
                  max={96}
                  step={1}
                  onValueChange={([value]) => updateSlot(slotIndex, { borderRadius: value })}
                />
                {slot.borderRadius !== null ? (
                  <button
                    type="button"
                    className="mt-1 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => updateSlot(slotIndex, { borderRadius: null })}
                  >
                    {t('collage.properties.radiusFollowCanvasReset')}
                  </button>
                ) : null}
              </div>

              {mode === 'free' ? (
                <div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={slotIndex >= present.slotItems.length - 1}
                      onClick={() => {
                        moveSlot(slotIndex, slotIndex + 1);
                        selectSlot(slotIndex + 1);
                      }}
                    >
                      {t('collage.properties.bringForward')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={slotIndex <= 0}
                      onClick={() => {
                        moveSlot(slotIndex, slotIndex - 1);
                        selectSlot(slotIndex - 1);
                      }}
                    >
                      {t('collage.properties.sendBackward')}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                    {t('collage.properties.layerHint')}
                  </p>
                </div>
              ) : null}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => resetSlot(slotIndex)}
              >
                <RotateCcw data-icon="inline-start" />
                {t('collage.properties.resetSlot')}
              </Button>
            </div>
          )}
        </CoPanelSection>
      ) : (
        <CoPanelSection
          title={t('collage.properties.canvasSection.title')}
          description={t('collage.properties.canvasSection.description')}
          actions={
            <Button
              variant="ghost"
              size="sm"
              disabled={isSameCanvasState(present.canvas, defaultCanvas)}
              title={t('collage.properties.canvasSection.resetTooltip')}
              onClick={resetCanvas}
            >
              <RotateCcw data-icon="inline-start" />
              {t('collage.properties.resetDefault')}
            </Button>
          }
        >
          <div className="space-y-4">
            {isLong ? (
              <p className="border border-border/70 bg-muted/20 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
                {t('collage.properties.longHint')}
              </p>
            ) : (
              <div>
                <span className="text-xs font-medium text-foreground">
                  {t('collage.properties.aspect')}
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {COLLAGE_RATIO_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setAspectPreset(option.label, option.width / option.height)}
                      className={cn(
                        'border px-2 py-1 text-[11px]',
                        present.canvas.aspectPreset === option.label
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground">
                      {t('collage.properties.customWidth')}
                    </span>
                    <Input
                      value={customText.width}
                      inputMode="numeric"
                      onChange={(event) =>
                        setCustomText((prev) => ({ ...prev, width: event.target.value }))
                      }
                      onBlur={() =>
                        setCustomRatio(
                          Number(customText.width) || present.canvas.customRatioWidth,
                          Number(customText.height) || present.canvas.customRatioHeight,
                        )
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground">
                      {t('collage.properties.customHeight')}
                    </span>
                    <Input
                      value={customText.height}
                      inputMode="numeric"
                      onChange={(event) =>
                        setCustomText((prev) => ({ ...prev, height: event.target.value }))
                      }
                      onBlur={() =>
                        setCustomRatio(
                          Number(customText.width) || present.canvas.customRatioWidth,
                          Number(customText.height) || present.canvas.customRatioHeight,
                        )
                      }
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            )}

            {mode === 'free' ? null : (
              <div>
                <FieldLabel label={t('collage.properties.gap')} value={`${present.canvas.gap}px`} />
                <Slider
                  value={[present.canvas.gap]}
                  min={0}
                  max={120}
                  step={1}
                  onValueChange={([value]) => updateCanvas({ gap: value })}
                />
              </div>
            )}
            <div>
              <FieldLabel
                label={t('collage.properties.padding')}
                value={`${present.canvas.padding}px`}
              />
              <Slider
                value={[present.canvas.padding]}
                min={0}
                max={160}
                step={1}
                onValueChange={([value]) => updateCanvas({ padding: value })}
              />
            </div>
            <div>
              <FieldLabel
                label={t('collage.properties.radius')}
                value={`${present.canvas.borderRadius}px`}
              />
              <Slider
                value={[present.canvas.borderRadius]}
                min={0}
                max={96}
                step={1}
                onValueChange={([value]) => updateCanvas({ borderRadius: value })}
              />
            </div>
            <div>
              <FieldLabel
                label={t('collage.properties.shadow')}
                value={`${present.canvas.shadow}`}
              />
              <Slider
                value={[present.canvas.shadow]}
                min={0}
                max={40}
                step={1}
                onValueChange={([value]) => updateCanvas({ shadow: value })}
              />
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-foreground">
                {t('collage.properties.background')}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={present.canvas.backgroundColor}
                  onChange={(event) => updateCanvas({ backgroundColor: event.target.value })}
                  className="h-9 w-12 rounded-md border border-border bg-background p-1"
                />
                <Input
                  value={present.canvas.backgroundColor}
                  onChange={(event) => updateCanvas({ backgroundColor: event.target.value })}
                />
              </div>
            </label>
          </div>
        </CoPanelSection>
      )}

      <CoPanelSection
        title={t('collage.export.sectionTitle')}
        description={t('collage.export.sectionDescription')}
        actions={
          <Button
            variant="ghost"
            size="sm"
            disabled={isSameExportState(present.exportSettings, defaultExport)}
            title={t('collage.export.resetTooltip')}
            onClick={resetExportSettings}
          >
            <RotateCcw data-icon="inline-start" />
            {t('collage.export.resetDefault')}
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <span className="text-xs font-medium text-foreground">
              {t('collage.export.format')}
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(['png', 'jpeg'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateExportSettings({ format: item })}
                  className={cn(
                    'border px-3 py-2 text-xs',
                    present.exportSettings.format === item
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item === 'png' ? 'PNG' : 'JPG'}
                </button>
              ))}
            </div>
          </div>

          {present.exportSettings.format === 'jpeg' ? (
            <div>
              <span className="text-xs font-medium text-foreground">
                {t('collage.export.quality')}
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(['standard', 'high', 'ultra'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => updateExportSettings({ quality: item })}
                    className={cn(
                      'border px-2 py-2 text-xs',
                      present.exportSettings.quality === item
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t(COLLAGE_EXPORT_LABEL_KEYS[item])}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <span className="text-xs font-medium text-foreground">{t('collage.export.scale')}</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateExportSettings({ scale: item })}
                  className={cn(
                    'border px-2 py-2 text-xs',
                    present.exportSettings.scale === item
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item}x
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                {t('collage.export.lockRatio')}
              </span>
              <Switch
                checked={present.exportSettings.lockRatio}
                onCheckedChange={handleLockRatio}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground">
                  {t('collage.export.width')}
                </span>
                <Input
                  value={sizeText.width}
                  inputMode="numeric"
                  onChange={(event) =>
                    setSizeText((prev) => ({ ...prev, width: event.target.value }))
                  }
                  onBlur={commitSize}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground">
                  {t('collage.export.height')}
                </span>
                <Input
                  value={sizeText.height}
                  inputMode="numeric"
                  disabled={present.exportSettings.lockRatio}
                  onChange={(event) =>
                    setSizeText((prev) => ({ ...prev, height: event.target.value }))
                  }
                  onBlur={commitSize}
                />
              </div>
            </div>
            <DropdownMenu
              onOpenChange={(open) => {
                if (open) {
                  onSizesOpen?.();
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="w-full">
                  <ChevronDown data-icon="inline-start" />
                  {t('collage.export.commonSizes')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>{t('collage.export.commonSizes')}</DropdownMenuLabel>
                {sizes.length === 0 ? (
                  <DropdownMenuItem disabled>{t('collage.export.noCommonSizes')}</DropdownMenuItem>
                ) : (
                  sizes.map((size, index) => (
                    <DropdownMenuItem
                      key={size.id ?? `${size.label}-${index}`}
                      onSelect={() =>
                        updateExportSettings({
                          width: size.width,
                          height: present.exportSettings.lockRatio
                            ? heightFromRatio(size.width, canvasRatio)
                            : size.height,
                        })
                      }
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

          {/* 画布上还一张图都没有时别让按钮可点：点了只会导出一张空白图（工具条那颗按钮也是这么判的） */}
          <Button
            className="w-full"
            disabled={exporting || !present.slotItems.some((slot) => slot.photoId)}
            onClick={onExport}
          >
            {exporting ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
            {t('collage.export.button')}
          </Button>
        </div>
      </CoPanelSection>
    </div>
  );
}
