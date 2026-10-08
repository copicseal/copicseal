import {
  ChevronDown,
  ChevronUp,
  Copy,
  FolderOpen,
  ImageIcon,
  LayoutTemplate,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { prepareElementForSnapshot, waitForDomStability, waitForImages } from '@/core/renderer';
import { runScheduledExports } from '@/core/scheduler';
import {
  DEFAULT_TEMPLATE_BACKGROUND,
  TEMPLATE_BACKGROUND_FIELDS,
  type TemplateBackground,
  toTemplateBackground,
} from '@/features/template/background';
import {
  isValidPreset,
  parseDefaultPresets,
  toDefaultPresets,
} from '@/features/template/lib/export-preset';
import { applyRenderSize } from '@/features/template/lib/render-size';
import { getBuiltinTemplateSchema } from '@/features/template/runtime/template-registry';
import {
  type ExportOptions,
  type ExportRunContext,
  exportSingle,
  resolveDefaultFont,
  resolveDefaultOutputPresets,
  resolveExportDirectory,
  resolveExportSizes,
  saveDefaultFont,
  saveDefaultOutputPresets,
} from '@/platform';
import { CoDropZone } from '@/shared/components/co-drop-zone';
import {
  notifyExportedDirectory,
  notifyExportFailed,
} from '@/shared/components/co-open-directory-link';
import { CoPanelSection } from '@/shared/components/co-panel-section';
import { CoWindowHeader } from '@/shared/components/co-window-header';
import { usePhotos } from '@/shared/hooks/use-photos';
import { type MessageKey, useTranslate } from '@/shared/i18n';
import {
  BusinessWorkbench,
  BusinessWorkbenchAssetsPane,
  BusinessWorkbenchPropertiesPane,
  BusinessWorkbenchWorkspace,
} from '@/shared/layouts/business-workbench';
import { cn } from '@/shared/lib/utils';
import { usePageActive } from '@/shared/providers/page-activity-provider';
import { setImportSelectionSuspended } from '@/shared/providers/photo-provider';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import {
  PhotoPalettePicker,
  TemplateExifCard,
  TemplateExportPanel,
  TemplatePresetMenu,
  TemplatePreview,
  TemplatePropsPanel,
  TemplateSelector,
} from '../exports';
import { ensurePhotoExif } from '../hooks/use-photo-exif';
import { type PhotoPaletteState, usePhotoPalette } from '../hooks/use-photo-palette';
import {
  getTemplatePhotoConfig,
  type TemplateApplyScope,
  useTemplatePhotoConfig,
  useTemplateStore,
} from '../store/use-template-store';

function ImportProgressPanel({
  current,
  total,
  currentName,
}: {
  current: number;
  total: number;
  currentName: string | null;
}) {
  const t = useTranslate();
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  // 有文件名时把「当前在导哪一张」一并写进去：用户数据只作插值参数，不参与拼接
  let label: string;
  if (total > 0) {
    label = currentName
      ? t('template.assets.importingWithName', { current, total, name: currentName })
      : t('template.assets.importing', { current, total });
  } else {
    label = currentName
      ? t('template.assets.preparingImportWithName', { name: currentName })
      : t('template.assets.preparingImport');
  }

  return (
    <div className="flex h-6 shrink-0 items-center gap-3 rounded-full border border-border/80 bg-muted/30 px-2">
      <p className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">{label}</p>
      <div className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="w-7 shrink-0 text-right text-[10px] font-medium text-muted-foreground">
        {Math.round(progress)}%
      </p>
    </div>
  );
}

/** 导出动作的两种模式：当前照片 / 全部照片。 */
type ExportMode = 'single' | 'batch';

interface TemplateExportActionsProps {
  /** 正在进行的导出；null 表示空闲，两个按钮都可点 */
  exporting: ExportMode | null;
  /** 档位是否齐备；不齐时禁用导出并提示去补目标宽高 */
  ready: boolean;
  onExport: (mode: ExportMode) => void;
}

function TemplateExportActions({ exporting, ready, onExport }: TemplateExportActionsProps) {
  const t = useTranslate();
  const busy = exporting !== null || !ready;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={() => onExport('single')}>
        {exporting === 'single' ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : null}
        {t('template.actions.exportCurrent')}
      </Button>
      <Button size="sm" disabled={busy} onClick={() => onExport('batch')}>
        {exporting === 'batch' ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : null}
        {t('template.actions.exportBatch')}
      </Button>
    </div>
  );
}

function TemplateHeader({ exporting, ready, onExport }: TemplateExportActionsProps) {
  const t = useTranslate();

  return (
    <CoWindowHeader
      icon={LayoutTemplate}
      title={t('template.header.title')}
      description={t('template.header.description')}
      actions={<TemplateExportActions exporting={exporting} ready={ready} onExport={onExport} />}
    />
  );
}

function TemplateAssetsPanel({
  collapsed,
  toggleCollapsed,
}: {
  collapsed: boolean;
  toggleCollapsed: () => void;
}) {
  const {
    photos,
    currentIndex,
    setCurrentIndex,
    removePhoto,
    importViaDialog,
    importViaDirectory,
    importViaDrop,
    importState,
  } = usePhotos();
  const t = useTranslate();
  const pageActive = usePageActive();
  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    // 隐藏时注销粘贴监听，避免后台页面响应前台操作。
    if (!pageActive) {
      return;
    }

    const handlePaste = async (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        event.preventDefault();
        await importViaDrop(files);
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [importViaDrop, pageActive]);

  return (
    <BusinessWorkbenchAssetsPane className="overflow-visible border-t border-border p-0">
      <TooltipProvider>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="plain"
                size="icon"
                aria-expanded={!collapsed}
                aria-controls="template-assets-content"
                aria-label={collapsed ? t('template.assets.expand') : t('template.assets.collapse')}
                onClick={toggleCollapsed}
              >
                {collapsed ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {collapsed ? t('template.assets.expand') : t('template.assets.collapse')}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {collapsed && photos.length > 0 ? (
            <div id="template-assets-content" className="h-full min-h-0 pt-4 pb-2">
              <ScrollArea
                horizontalWheelScroll
                scrollbarOrientation="none"
                viewportClassName="[&>div]:h-full"
                className="h-full w-full overflow-hidden"
              >
                <div className="flex h-full w-max min-w-full items-center gap-1.5 px-3">
                  {photos.map((photo, index) => {
                    const active = index === currentIndex;

                    return (
                      <Tooltip key={photo.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={t('template.assets.switchTo', { name: photo.name })}
                            aria-current={active ? 'true' : undefined}
                            className={cn(
                              'relative flex size-6 shrink-0 items-center justify-center overflow-hidden border bg-background/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                              active
                                ? 'border-primary ring-2 ring-primary/70'
                                : 'border-border/70 hover:border-primary/50',
                            )}
                            onClick={() => setCurrentIndex(index)}
                          >
                            {photo.thumbnailReady ? (
                              <img
                                src={photo.thumbnailUrl}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <ImageIcon
                                aria-hidden="true"
                                className="size-3 text-muted-foreground"
                              />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          {photo.name}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  {importState.active ? (
                    <ImportProgressPanel
                      current={importState.current}
                      total={importState.total}
                      currentName={importState.currentName}
                    />
                  ) : (
                    <div className="flex h-6 min-w-0 flex-col justify-center">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="shrink-0 text-xs/3 font-semibold">
                          {t('template.assets.title')}
                        </h2>
                        {currentPhoto ? (
                          <span className="shrink-0 text-[10px]/3 font-medium text-muted-foreground tabular-nums">
                            {currentIndex + 1} / {photos.length}
                          </span>
                        ) : null}
                      </div>
                      {currentPhoto ? (
                        <p
                          className="truncate text-[10px]/3 text-muted-foreground"
                          title={currentPhoto.name}
                        >
                          {currentPhoto.name}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                {!collapsed ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => void importViaDirectory()}>
                      <FolderOpen data-icon="inline-start" />
                      {t('template.assets.importFolder')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void importViaDialog()}>
                      <ImageIcon data-icon="inline-start" />
                      {t('template.assets.importPhoto')}
                    </Button>
                  </div>
                ) : null}
              </div>

              {!collapsed ? (
                <div id="template-assets-content" className="h-[140px] min-h-0 shrink-0">
                  {photos.length === 0 ? (
                    <div className="h-full px-3 pb-3">
                      <CoDropZone
                        onFilesDrop={importViaDrop}
                        className="h-full rounded-none border-border/60 bg-muted/20"
                      >
                        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                          <ImageIcon className="size-5" />
                          <div>
                            <p className="text-xs font-medium">
                              {importState.active
                                ? t('template.empty.importing')
                                : t('template.empty.dropHint')}
                            </p>
                            <p className="text-[10px]">
                              {importState.active
                                ? t('template.empty.importingHint')
                                : t('template.empty.importHint')}
                            </p>
                          </div>
                        </div>
                      </CoDropZone>
                    </div>
                  ) : (
                    <ScrollArea
                      horizontalWheelScroll
                      scrollbarOrientation="horizontal"
                      viewportClassName="[&>div]:h-full"
                      className="h-full w-full overflow-hidden"
                    >
                      <div className="flex h-full w-max min-w-full gap-2 px-3 pb-3">
                        {photos.map((photo, index) => {
                          const active = index === currentIndex;

                          return (
                            <div
                              key={photo.id}
                              className={cn(
                                'group relative size-32 shrink-0 overflow-hidden border bg-card transition-colors',
                                active
                                  ? 'border-primary ring-1 ring-primary/20'
                                  : 'border-border hover:border-primary/40',
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => setCurrentIndex(index)}
                                className="flex h-full w-full min-h-0 flex-col text-left"
                              >
                                <div className="relative flex min-h-8 flex-1 items-center justify-center overflow-hidden bg-background/80">
                                  {photo.thumbnailReady ? (
                                    <img
                                      src={photo.thumbnailUrl}
                                      alt={photo.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-muted/40 px-2 text-center">
                                      <span className="text-[9px] text-muted-foreground">
                                        {t('template.assets.generatingThumbnail')}
                                      </span>
                                    </div>
                                  )}
                                  {active ? (
                                    <div className="pointer-events-none absolute inset-0 ring-2 ring-primary/60" />
                                  ) : null}
                                </div>
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-popover/90 px-2 py-1.5 opacity-0 backdrop-blur-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                  <p className="truncate text-[10px] font-medium text-popover-foreground">
                                    {photo.name}
                                  </p>
                                </div>
                              </button>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="icon-sm"
                                    className="absolute top-1.5 right-1.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                                    aria-label={t('template.assets.removeAria', {
                                      name: photo.name,
                                    })}
                                    onClick={() => removePhoto(photo.id)}
                                  >
                                    <Trash2 />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={6}>
                                  {t('template.assets.remove')}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </TooltipProvider>
    </BusinessWorkbenchAssetsPane>
  );
}

/** 一键应用提示里的范围名，与按钮文案保持一致。 */
const APPLY_SCOPE_LABEL_KEYS: Record<TemplateApplyScope, MessageKey> = {
  template: 'template.applyScope.template',
  background: 'template.applyScope.background',
  presets: 'template.applyScope.presets',
};

/**
 * 一键应用按钮。
 *
 * 模板与参数合并成一个动作：参数脱离所属模板没有意义，分开应用只会得到
 * 一份与模板不匹配的残值。
 */
function ApplyToOthersButton({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  const t = useTranslate();

  return (
    <Button type="button" variant="outline" size="sm" className="w-full" onClick={onClick}>
      <Copy data-icon="inline-start" />
      {t('template.applyToOthers.label', { label, count })}
    </Button>
  );
}

function TemplatePropertiesPanel({
  activeTemplateId,
  onTemplateChange,
  templateParams,
  onTemplateParamsChange,
  background,
  onBackgroundChange,
  font,
  onFontChange,
  presets,
  onPresetsChange,
  onSaveAsDefault,
  exportReady,
  hasPhoto,
  baseName,
  otherPhotoCount,
  onApplyToOthers,
  palette,
  sizes,
  onSizesOpen,
  resolvePhotoSize,
}: {
  activeTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  templateParams: Record<string, unknown>;
  onTemplateParamsChange: (next: Record<string, unknown>) => void;
  background: TemplateBackground;
  onBackgroundChange: (next: TemplateBackground) => void;
  /** 当前生效的字体族；空串表示跟随模板自带的字体栈 */
  font: string;
  onFontChange: (next: string) => void;
  presets: Parameters<typeof TemplateExportPanel>[0]['presets'];
  onPresetsChange: Parameters<typeof TemplateExportPanel>[0]['onPresetsChange'];
  onSaveAsDefault: Parameters<typeof TemplateExportPanel>[0]['onSaveAsDefault'];
  sizes: Parameters<typeof TemplateExportPanel>[0]['sizes'];
  /** 打开常用尺寸下拉时重新读一次设置，避免设置页改完这里还是旧清单 */
  onSizesOpen: () => void;
  /** 档位是否齐备；导出按钮在顶栏，这里只用它决定要不要提示补目标宽高 */
  exportReady: boolean;
  hasPhoto: boolean;
  /** 当前照片名（不含扩展名），供档位自动命名使用 */
  baseName: string;
  otherPhotoCount: number;
  onApplyToOthers: (scope: TemplateApplyScope) => void;
  palette: PhotoPaletteState;
  /** 读取当前照片像素尺寸（给档位的「原始尺寸」用）；由页面提供 */
  resolvePhotoSize: () => { width: number; height: number } | null;
}) {
  const t = useTranslate();
  const templateSchema = getBuiltinTemplateSchema(activeTemplateId);

  if (!hasPhoto) {
    return (
      <BusinessWorkbenchPropertiesPane>
        <ScrollArea className="min-h-0 min-w-0 flex-1" viewportClassName="[&>div]:!block">
          <div className="px-3 py-3">
            <section className="border border-border/80 bg-background/70 px-4 py-4 text-xs leading-6 text-muted-foreground shadow-sm">
              {t('template.empty.properties')}
            </section>
          </div>
        </ScrollArea>
      </BusinessWorkbenchPropertiesPane>
    );
  }

  return (
    <BusinessWorkbenchPropertiesPane>
      <ScrollArea className="min-h-0 min-w-0 flex-1" viewportClassName="[&>div]:!block">
        <div className="space-y-3 px-3 py-3">
          <TemplatePresetMenu
            content={{ templateId: activeTemplateId, params: templateParams, background, font }}
          />
          <TemplateSelector
            activeTemplateId={activeTemplateId}
            onTemplateChange={onTemplateChange}
            font={font}
            onFontChange={onFontChange}
          />
          {templateSchema ? (
            <CoPanelSection
              title={t('template.panel.templateParams.title')}
              description={t('template.panel.templateParams.description')}
              defaultOpen={false}
            >
              <div className="space-y-3">
                <TemplatePropsPanel
                  schema={templateSchema}
                  value={templateParams}
                  onChange={onTemplateParamsChange}
                />
                {otherPhotoCount > 0 ? (
                  <ApplyToOthersButton
                    label={t('template.applyToOthers.template')}
                    count={otherPhotoCount}
                    onClick={() => onApplyToOthers('template')}
                  />
                ) : null}
              </div>
            </CoPanelSection>
          ) : null}
          <CoPanelSection
            title={t('template.panel.background.title')}
            description={t('template.panel.background.description')}
            defaultOpen={false}
          >
            <div className="space-y-3">
              <TemplatePropsPanel
                schema={{ fields: TEMPLATE_BACKGROUND_FIELDS }}
                value={background}
                onChange={(next) => onBackgroundChange(toTemplateBackground(next))}
                extras={{
                  // 主题色盘只挂在颜色字段下：该字段本身只在纯色模式可见
                  color: (
                    <PhotoPalettePicker
                      colors={palette.colors}
                      selected={background.color}
                      loading={palette.loading}
                      failed={palette.failed}
                      onPick={(color) => onBackgroundChange({ ...background, color })}
                    />
                  ),
                }}
              />
              {otherPhotoCount > 0 ? (
                <ApplyToOthersButton
                  label={t('template.applyToOthers.background')}
                  count={otherPhotoCount}
                  onClick={() => onApplyToOthers('background')}
                />
              ) : null}
            </div>
          </CoPanelSection>
          <CoPanelSection
            title={t('template.panel.export.title')}
            description={t('template.panel.export.description')}
          >
            <div className="space-y-3">
              <TemplateExportPanel
                presets={presets}
                baseName={baseName}
                ready={exportReady}
                onPresetsChange={onPresetsChange}
                onSaveAsDefault={onSaveAsDefault}
                sizes={sizes}
                onSizesOpen={onSizesOpen}
                resolvePhotoSize={resolvePhotoSize}
              />
              {otherPhotoCount > 0 ? (
                <ApplyToOthersButton
                  label={t('template.applyToOthers.presets')}
                  count={otherPhotoCount}
                  onClick={() => onApplyToOthers('presets')}
                />
              ) : null}
            </div>
          </CoPanelSection>
          <CoPanelSection title={t('template.panel.exif.title')} defaultOpen={false}>
            <TemplateExifCard />
          </CoPanelSection>
        </div>
      </ScrollArea>
    </BusinessWorkbenchPropertiesPane>
  );
}

/** 去掉扩展名，作为导出文件名主干。 */
function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

export function TemplatePage() {
  const t = useTranslate();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { photos, currentIndex, setCurrentIndex, currentPhoto } = usePhotos();
  // 模板、参数、背景与档位都取自当前照片自己的配置
  const config = useTemplatePhotoConfig(currentPhoto?.id);
  const setTemplate = useTemplateStore((state) => state.setTemplate);
  const setParams = useTemplateStore((state) => state.setParams);
  const setBackground = useTemplateStore((state) => state.setBackground);
  const setPresets = useTemplateStore((state) => state.setPresets);
  const applyToOthers = useTemplateStore((state) => state.applyToOthers);
  const setDefaultPresets = useTemplateStore((state) => state.setDefaultPresets);
  const setFont = useTemplateStore((state) => state.setFont);
  const setDefaultFont = useTemplateStore((state) => state.setDefaultFont);
  const exportSizes = useTemplateStore((state) => state.exportSizes);
  const setExportSizes = useTemplateStore((state) => state.setExportSizes);
  const defaultFont = useTemplateStore((state) => state.defaultConfig.font);
  const prune = useTemplateStore((state) => state.prune);
  // 导出期间挂起预览自适应，否则它会覆盖导出解算出的 --co-base
  const [capturing, setCapturing] = useState(false);
  // 导出入口在顶栏，状态放页面级，保证按钮的转圈与禁用是同一份
  const [exporting, setExporting] = useState<ExportMode | null>(null);
  const otherPhotoCount = Math.max(photos.length - (currentPhoto ? 1 : 0), 0);

  /**
   * 启动时把设置里存的「默认档位」与「全局字体」装进 store。
   *
   * 没存过就保持框架内置的单个 2000×2000 与模板自带的字体栈：
   * 空清单不等于「默认没有档位」，空字体也不等于「没有字体」。
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [presets, font, sizes] = await Promise.all([
        resolveDefaultOutputPresets(),
        resolveDefaultFont(),
        resolveExportSizes(),
      ]);
      if (cancelled) {
        return;
      }

      const parsed = parseDefaultPresets(presets);
      if (parsed.length > 0) {
        setDefaultPresets(parsed);
      }
      if (font) {
        setDefaultFont(font);
      }
      setExportSizes(sizes);
    })();

    return () => {
      cancelled = true;
    };
  }, [setDefaultFont, setDefaultPresets, setExportSizes]);

  // 素材被移除后回收它的配置；prune 在无变化时返回原 state，不会引起额外渲染
  useEffect(() => {
    prune(photos.map((photo) => photo.id));
  }, [photos, prune]);

  const palette = usePhotoPalette(currentPhoto);

  /**
   * 纯色背景的默认色。
   *
   * 首次在某张照片上进入纯色模式时，直接把照片的第一个主题色写进背景色：用户不必
   * 点色盘就已经拿到主色调。颜色一旦不等于默认值（说明用户自己挑过），或这张照片
   * 已经补过一次，就不再介入，避免覆盖用户的选择。
   */
  const paletteAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    const photoId = currentPhoto?.id;

    // 导出期间不写配置：批量导出会逐张切换照片，此时必须让导出严格按各自配置渲染
    if (capturing || !photoId) {
      return;
    }

    if (palette.colors.length === 0 || paletteAppliedRef.current === photoId) {
      return;
    }

    if (
      config.background.mode !== 'color' ||
      config.background.color !== DEFAULT_TEMPLATE_BACKGROUND.color
    ) {
      return;
    }

    paletteAppliedRef.current = photoId;
    setBackground(photoId, { ...config.background, color: palette.colors[0] });
  }, [capturing, currentPhoto?.id, palette.colors, config.background, setBackground]);

  /**
   * 构造模板导出上下文。
   *
   * 基准读写落在 snapshot 目标元素上：模板几何全部是 `--co-base` 的倍数，
   * 测量用布局尺寸（offsetWidth/offsetHeight），不受任何外层变换影响。
   * 背景按目标照片自己的配置解算——批量导出时每张图的画框语义可能不同。
   */
  const createRunContext = (
    name: string | undefined,
    outputDir: string | null,
    photoBackground: TemplateBackground,
    extraFontText?: string,
  ): ExportRunContext => ({
    baseName: name ? stripExtension(name) : undefined,
    outputDir,
    extraFontText,
    sizeAdapter: {
      prepare: async (target) => {
        const element = previewRef.current;
        if (!element) {
          return;
        }
        applyRenderSize(element, photoBackground, target);
        await waitForDomStability();
      },
    },
  });

  /**
   * 切换全局字体。
   *
   * 全局字体是「新导入与没单独调过的图片用哪个字体」，因此只写配置里的默认值；
   * 当前图片若被预设钉过字体，顺手解除钉住——否则用户在这里选完会发现当前图片
   * 纹丝不动，像是开关失灵。
   */
  const handleFontChange = (next: string) => {
    if (currentPhoto && config.font) {
      setFont(currentPhoto.id, '');
    }

    setDefaultFont(next);
    void saveDefaultFont(next).catch((error) => {
      console.error('保存默认字体失败:', error);
      toast.error(t('template.toast.saveDefaultFontFailed'));
    });
  };

  const handleApplyToOthers = (scope: TemplateApplyScope) => {
    if (!currentPhoto || otherPhotoCount === 0) {
      return;
    }

    applyToOthers(
      photos.map((photo) => photo.id),
      currentPhoto.id,
      scope,
    );
    toast.success(
      t('template.toast.appliedToOthers', {
        scope: t(APPLY_SCOPE_LABEL_KEYS[scope]),
        count: otherPhotoCount,
      }),
    );
  };

  const handleExportCurrent = async (options: ExportOptions) => {
    if (!previewRef.current) {
      return;
    }

    setCapturing(true);
    setImportSelectionSuspended(true);
    try {
      // 直接写到配置里的「保存目录」，不再弹保存对话框
      const outputDir = await resolveExportDirectory();
      await waitForImages(previewRef.current);
      await prepareElementForSnapshot(previewRef.current);
      await exportSingle(
        previewRef.current,
        options,
        currentPhoto?.sourceFile ?? currentPhoto?.path,
        createRunContext(currentPhoto?.name, outputDir, config.background),
      );
      notifyExportedDirectory(outputDir);
    } catch (error) {
      notifyExportFailed(error);
    } finally {
      setCapturing(false);
      setImportSelectionSuspended(false);
    }
  };

  const handleExportBatch = async (options: ExportOptions) => {
    if (!previewRef.current || photos.length === 0) {
      return;
    }

    const originalIndex = currentIndex;

    setCapturing(true);
    setImportSelectionSuspended(true);
    try {
      // 直接写到配置里的「保存目录」，不再弹保存对话框
      const outputDir = await resolveExportDirectory();
      // 各张图的 EXIF 与参数文案都不同，先取并集：这样每族每批只子集化一次，
      // 后面几张图直接命中缓存（否则每张都要重新解析一遍字体文件）。
      // EXIF 本来就要在循环里逐张读取，这里提前取齐不算额外开销
      const batchFontText = (
        await Promise.all(
          photos.map(async (photo) => {
            const exif = await ensurePhotoExif(photo);
            const photoConfig = getTemplatePhotoConfig(photo.id);
            const paramText = Object.values(photoConfig.params)
              .filter((value) => typeof value === 'string')
              .join(' ');
            const exifText = Object.values(exif ?? {})
              .filter((value) => typeof value === 'string' || typeof value === 'number')
              .join(' ');
            return `${paramText} ${exifText}`;
          }),
        )
      ).join(' ');
      let skipped = 0;
      let exported = 0;

      await runScheduledExports({
        items: photos,
        runner: async (photo, index) => {
          const photoConfig = getTemplatePhotoConfig(photo.id);
          const presets = photoConfig.presets.filter(isValidPreset);
          if (presets.length === 0) {
            skipped += 1;
            return;
          }

          // 先切到目标照片，预览会按它自己的模板与参数重渲染
          setCurrentIndex(index);
          await new Promise((resolve) => setTimeout(resolve, 120));
          // EXIF 未就绪就抓图，模板里的机型与拍摄参数会是空的
          await ensurePhotoExif(photo);
          if (!previewRef.current) {
            return;
          }
          await waitForImages(previewRef.current);
          await prepareElementForSnapshot(previewRef.current);
          await exportSingle(
            previewRef.current,
            { ...options, presets },
            photo.sourceFile ?? photo.path,
            createRunContext(photo.name, outputDir, photoConfig.background, batchFontText),
          );
          exported += 1;
        },
      });

      if (skipped > 0) {
        toast.warning(t('template.toast.skippedIncomplete', { count: skipped }));
      }
      if (exported > 0) {
        notifyExportedDirectory(outputDir);
      }
    } catch (error) {
      notifyExportFailed(error);
    } finally {
      setCapturing(false);
      setImportSelectionSuspended(false);
      setCurrentIndex(originalIndex);
    }
  };

  // 两轴必填：无背景时目标框是 contain 约束，有背景时它就是画框尺寸
  const exportReady = config.presets.every(isValidPreset);
  // 预设可以给单张图片钉一个字体；没钉过就跟随全局字体，再没有则由模板自己兜底
  const resolvedFont = config.font || defaultFont;

  const buildExportOptions = (): ExportOptions => ({
    presets: config.presets,
    dpi: 72,
    preserveExif: true,
  });

  /** 顶栏导出入口：统一在这里组装档位参数并维护进行中的状态。 */
  const handleExport = (mode: ExportMode) => {
    if (exporting !== null || !exportReady) {
      return;
    }

    setExporting(mode);
    void (
      mode === 'single'
        ? handleExportCurrent(buildExportOptions())
        : handleExportBatch(buildExportOptions())
    ).finally(() => setExporting(null));
  };

  /**
   * 把当前照片的档位存成设置里的「默认档位」。
   *
   * 会话内的默认值一起换掉，这样没动过档位的照片（含之后导入的）立刻跟上；
   * 已经调过档位的照片不受影响。
   */
  const handleSaveAsDefault = async () => {
    if (!exportReady) {
      return;
    }

    try {
      const presets = toDefaultPresets(config.presets);
      await saveDefaultOutputPresets(presets);
      setDefaultPresets(parseDefaultPresets(presets));
      toast.success(t('template.toast.savedAsDefault'));
    } catch (error) {
      console.error('Save default export presets failed:', error);
      toast.error(t('template.toast.saveDefaultFailed'));
    }
  };

  return (
    <BusinessWorkbench
      header={<TemplateHeader exporting={exporting} ready={exportReady} onExport={handleExport} />}
      assetsResizable={false}
      // 属性面板里内容偏宽（档位的文件名输入框、目录路径等），再窄就会被挤到换行
      propertiesMinSize={260}
      workspace={
        <BusinessWorkbenchWorkspace>
          <div className="flex h-full w-full min-h-0 min-w-0 items-center justify-center">
            <TemplatePreview
              templateId={config.templateId}
              params={config.params}
              background={config.background}
              font={resolvedFont}
              previewRef={previewRef}
              suspendAutoFit={capturing}
            />
          </div>
        </BusinessWorkbenchWorkspace>
      }
      assets={(assetsState) => <TemplateAssetsPanel {...assetsState} />}
      properties={() => (
        <TemplatePropertiesPanel
          sizes={exportSizes}
          onSizesOpen={() => {
            void resolveExportSizes().then(setExportSizes);
          }}
          // 直接从预览里的图片取像素尺寸：与导入格式无关，也不必再读一次 EXIF
          resolvePhotoSize={() => {
            const img = previewRef.current?.querySelector<HTMLImageElement>('[data-co-photo]');
            if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
              return null;
            }
            return { width: img.naturalWidth, height: img.naturalHeight };
          }}
          activeTemplateId={config.templateId}
          onTemplateChange={(templateId) => {
            if (currentPhoto) {
              setTemplate(currentPhoto.id, templateId);
            }
          }}
          templateParams={config.params}
          onTemplateParamsChange={(next) => {
            if (currentPhoto) {
              setParams(currentPhoto.id, next);
            }
          }}
          background={config.background}
          onBackgroundChange={(next) => {
            if (currentPhoto) {
              setBackground(currentPhoto.id, next);
            }
          }}
          font={resolvedFont}
          onFontChange={handleFontChange}
          presets={config.presets}
          onPresetsChange={(next) => {
            if (currentPhoto) {
              setPresets(currentPhoto.id, next);
            }
          }}
          onSaveAsDefault={() => void handleSaveAsDefault()}
          exportReady={exportReady}
          hasPhoto={currentPhoto !== null}
          baseName={currentPhoto ? stripExtension(currentPhoto.name) : 'copicseal-export'}
          otherPhotoCount={otherPhotoCount}
          onApplyToOthers={handleApplyToOthers}
          palette={palette}
        />
      )}
    />
  );
}
