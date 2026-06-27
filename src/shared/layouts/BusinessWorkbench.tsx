import {
  ChevronDown,
  ChevronUp,
  Download,
  Grid3x3,
  ImageIcon,
  LayoutTemplate,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { CoDropZone } from '@/components/CoDropZone';
import { Button } from '@/components/ui/button';
import {
  TemplateExportPanel,
  TemplatePreview,
  TemplatePropsPanel,
  TemplateSelector,
  useTemplatePreviewState,
} from '@/features/template';
import { usePhotos } from '@/hooks/usePhotos';
import { exportSingle } from '@/lib/export-photo';
import { getBuiltinTemplateSchema } from '@/runtime/template/template-registry';
import { cn } from '@/lib/utils';
import type { AppRoute } from '@/components/CoSidebar';

const PROPERTY_MIN_WIDTH = 280;
const PROPERTY_MAX_WIDTH = 420;
const PROPERTY_DEFAULT_WIDTH = 320;
const ASSETS_MIN_HEIGHT = 132;
const ASSETS_MAX_HEIGHT = 260;
const ASSETS_DEFAULT_HEIGHT = 188;

interface BusinessWorkbenchProps {
  route: Extract<AppRoute, '/template' | '/collage'>;
}

const copy = {
  '/template': {
    badge: 'Template',
    title: 'Template Preview',
    description: 'Workspace 是边框水印的真实渲染区域，后续会由 <TemplateRuntime /> 承载。',
    assetsTitle: 'Template Assets',
    assetsDescription: '当前功能页内的图片缩略图列表，后续接入拖拽、粘贴、文件夹导入和多选。',
    propertySections: [
      {
        title: 'Template Selector',
        body: '模板选择器将支持搜索、收藏与最近使用，并驱动当前预览模板切换。',
      },
      {
        title: 'Template Props',
        body: '该区域会改为由 propsSchema 自动生成，避免维护手写模板表单。',
      },
      {
        title: 'Export',
        body: '导出参数会在这里统一配置，并对接共享的 Export Pipeline。',
      },
    ],
  },
  '/collage': {
    badge: 'Collage',
    title: 'Collage Preview',
    description: 'Workspace 是拼图的真实渲染区域，后续会由 <CollageCanvas /> 承载。',
    assetsTitle: 'Collage Assets',
    assetsDescription: '当前拼图会话的局部素材区，后续接入排序、替换图片和拖入拼图。',
    propertySections: [
      {
        title: 'Layout',
        body: '布局区会负责 Grid / Free Layout 切换，以及间距、边距、背景等参数。',
      },
      {
        title: 'Selection',
        body: '选中图片后，这里会显示缩放、位置、旋转和圆角等单图属性。',
      },
      {
        title: 'Export',
        body: '导出参数结构会与 Template 对齐，但保留 Collage 的独立页面状态。',
      },
    ],
  },
} as const;

function clampWidth(width: number) {
  return Math.min(PROPERTY_MAX_WIDTH, Math.max(PROPERTY_MIN_WIDTH, width));
}

function clampAssetsHeight(height: number) {
  return Math.min(ASSETS_MAX_HEIGHT, Math.max(ASSETS_MIN_HEIGHT, height));
}

function ToolRail({ route }: { route: BusinessWorkbenchProps['route'] }) {
  const isTemplate = route === '/template';

  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-border/80 px-5 py-3">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        {isTemplate ? <LayoutTemplate className="size-3.5" /> : <Grid3x3 className="size-3.5" />}
        {isTemplate ? 'Template' : 'Collage'}
      </div>
      <div className="ml-auto" />
      <Button size="sm" className="rounded-full px-3">
        <Download data-icon="inline-start" />
        导出
      </Button>
    </div>
  );
}

function WorkspacePanel({
  route,
  activeTemplateId,
  templateProps,
  previewRef,
}: {
  route: BusinessWorkbenchProps['route'];
  activeTemplateId: string;
  templateProps: Parameters<typeof TemplatePreview>[0]['templateProps'];
  previewRef: React.RefObject<HTMLDivElement | null>;
}) {
  const content = copy[route];
  const isTemplate = route === '/template';

  return (
    <section className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden border border-r-0 border-b-0 border-border/80 bg-[radial-gradient(circle_at_top,_var(--color-accent),transparent_45%),linear-gradient(180deg,color-mix(in_oklch,var(--color-background),white_55%)_0%,var(--color-background)_100%)] p-6">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--color-border),transparent_35%)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--color-border),transparent_35%)_1px,transparent_1px)] bg-[size:32px_32px] opacity-35" />
      {isTemplate ? (
        <div className="relative flex h-full w-full min-h-0 min-w-0 items-center justify-center">
          <TemplatePreview
            activeTemplateId={activeTemplateId}
            templateProps={templateProps}
            previewRef={previewRef}
          />
        </div>
      ) : (
        <div className="relative flex w-full max-w-4xl flex-col items-center gap-5">
          <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase shadow-sm">
            {content.badge}
          </div>
          <div className="flex aspect-[4/3] w-full max-w-3xl max-h-[min(62vh,760px)] items-center justify-center rounded-[32px] border border-border/80 bg-card/90 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]">
            <div className="flex max-w-xl flex-col items-center gap-4 text-center">
              <Grid3x3 className="size-14 text-primary" />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{content.title}</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{content.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function AssetsPanel({
  route,
  collapsed,
  height,
  onToggleCollapse,
  onResizeStart,
}: {
  route: BusinessWorkbenchProps['route'];
  collapsed: boolean;
  height: number;
  onToggleCollapse: () => void;
  onResizeStart: (clientY: number) => void;
}) {
  const {
    photos,
    currentIndex,
    setCurrentIndex,
    removePhoto,
    importViaDialog,
    importViaDrop,
  } = usePhotos();
  const content = copy[route];
  const isTemplate = route === '/template';
  const cardHeight = Math.max(72, height - 92);

  return (
    <section
      className="relative min-w-0 border border-r-0 border-border/80 bg-card p-4 shadow-sm"
      style={{ height: collapsed ? 74 : height }}
    >
      <div className="absolute top-0 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
        <button
          type="button"
          aria-label="调整素材栏高度"
          className="relative h-3 w-24 cursor-row-resize"
          onMouseDown={(event) => onResizeStart(event.clientY)}
        >
          <span className="absolute top-1/2 left-1/2 h-1 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border transition-colors hover:bg-primary" />
        </button>
        <Button variant="ghost" size="icon-sm" className="rounded-full bg-background/90" onClick={onToggleCollapse}>
          {collapsed ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{content.assetsTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{content.assetsDescription}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full px-3"
          onClick={() => void importViaDialog()}
        >
          <ImageIcon data-icon="inline-start" />
          导入图片
        </Button>
      </div>

      {!collapsed ? (
        <div className="mt-4 h-[calc(100%-64px)]">
          {photos.length === 0 ? (
            <CoDropZone
              onFilesDrop={importViaDrop}
              className="h-full rounded-none border-border/60 bg-muted/20"
            >
              <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <ImageIcon className="size-6" />
                <div>
                  <p className="text-sm font-medium">
                    {isTemplate ? '拖入图片开始边框水印' : '拖入图片开始拼图'}
                  </p>
                  <p className="text-xs">或点击右上角“导入图片”从本地选择</p>
                </div>
              </div>
            </CoDropZone>
          ) : (
            <div className="h-full overflow-x-auto overflow-y-hidden">
              <div className="flex h-full gap-3 pb-3">
                {photos.map((photo, index) => {
                  const active = index === currentIndex;

                  return (
                    <div
                      key={photo.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setCurrentIndex(index)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setCurrentIndex(index);
                        }
                      }}
                      className={cn(
                        'group shrink-0 border bg-card text-left transition-colors',
                        active
                          ? 'border-primary ring-1 ring-primary/20'
                          : 'border-border hover:border-primary/40',
                      )}
                      style={{
                        width: isTemplate ? Math.max(132, cardHeight * (4 / 3)) : 160,
                        height: isTemplate ? cardHeight : undefined,
                      }}
                    >
                      <div className="flex h-full flex-col">
                        <div
                          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-background/80"
                          style={{ aspectRatio: '4 / 3' }}
                        >
                          <img
                            src={photo.previewUrl}
                            alt={photo.name}
                            className="h-full w-full object-cover"
                          />
                          {active ? (
                            <div className="pointer-events-none absolute inset-0 ring-2 ring-primary/60" />
                          ) : null}
                        </div>
                        <div className="border-t border-border/80 px-3 py-2">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-medium text-foreground">
                                {photo.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {(photo.size / 1024 / 1024).toFixed(1)} MB
                              </p>
                            </div>
                            <button
                              type="button"
                              className="shrink-0 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                              onClick={(event) => {
                                event.stopPropagation();
                                removePhoto(photo.id);
                              }}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function PropertiesPanel({
  route,
  width,
  onResizeStart,
  activeTemplateId,
  onTemplateChange,
  templateProps,
  onTemplatePropsChange,
  onExportCurrent,
  onExportBatch,
}: {
  route: BusinessWorkbenchProps['route'];
  width: number;
  onResizeStart: (clientX: number) => void;
  activeTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  templateProps: Parameters<typeof TemplatePreview>[0]['templateProps'];
  onTemplatePropsChange: (next: Parameters<typeof TemplatePreview>[0]['templateProps']) => void;
  onExportCurrent: Parameters<typeof TemplateExportPanel>[0]['onExportCurrent'];
  onExportBatch: Parameters<typeof TemplateExportPanel>[0]['onExportBatch'];
}) {
  const content = copy[route];
  const isTemplate = route === '/template';
  const templateSchema = getBuiltinTemplateSchema(activeTemplateId);

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-l border-border/80 bg-card/90"
      style={{ width }}
    >
      <button
        type="button"
        aria-label="调整属性面板宽度"
        className="absolute top-0 -left-1.5 z-10 h-full w-3 cursor-col-resize"
        onMouseDown={(event) => onResizeStart(event.clientX)}
      >
        <span className="absolute top-1/2 left-1/2 h-16 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border transition-colors hover:bg-primary" />
      </button>

      <div className="border-b border-border/80 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Properties
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          默认宽度 320px，可拖拽调整到 280px - 420px。
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-3">
          {isTemplate ? (
            <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
              <TemplateSelector
                activeTemplateId={activeTemplateId}
                onTemplateChange={onTemplateChange}
              />
            </section>
          ) : null}
          {isTemplate && templateSchema ? (
            <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
              <TemplatePropsPanel
                schema={templateSchema}
                value={templateProps}
                onChange={onTemplatePropsChange}
              />
            </section>
          ) : null}
          {isTemplate ? (
            <section className="border border-border/80 bg-background/70 px-4 py-4 shadow-sm">
              <TemplateExportPanel
                onExportCurrent={onExportCurrent}
                onExportBatch={onExportBatch}
              />
            </section>
          ) : null}
          {content.propertySections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-border/80 bg-background/70 px-4 py-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{section.title}</h3>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                  Accordion
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function BusinessWorkbench({ route }: BusinessWorkbenchProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [propertiesWidth, setPropertiesWidth] = useState(PROPERTY_DEFAULT_WIDTH);
  const [assetsHeight, setAssetsHeight] = useState(ASSETS_DEFAULT_HEIGHT);
  const [assetsCollapsed, setAssetsCollapsed] = useState(false);
  const {
    templateId,
    setTemplateId,
    templateProps,
    setTemplateProps,
  } = useTemplatePreviewState();
  const { photos, currentIndex, setCurrentIndex, currentPhoto } = usePhotos();

  const handleResizeStart = (startX: number) => {
    const startWidth = propertiesWidth;

    const handlePointerMove = (event: MouseEvent) => {
      const nextWidth = clampWidth(startWidth - (event.clientX - startX));
      setPropertiesWidth(nextWidth);
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  const handleAssetsResizeStart = (startY: number) => {
    const startHeight = assetsHeight;

    const handlePointerMove = (event: MouseEvent) => {
      const nextHeight = clampAssetsHeight(startHeight - (event.clientY - startY));
      setAssetsHeight(nextHeight);
    };

    const handlePointerUp = () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  const handleExportCurrent = async (
    options: Parameters<typeof TemplateExportPanel>[0]['onExportCurrent'] extends (
      arg: infer A,
    ) => Promise<void>
      ? A
      : never,
  ) => {
    if (!previewRef.current) {
      return;
    }

    await exportSingle(previewRef.current, options, currentPhoto?.path);
  };

  const handleExportBatch = async (
    options: Parameters<typeof TemplateExportPanel>[0]['onExportBatch'] extends (
      arg: infer A,
    ) => Promise<void>
      ? A
      : never,
  ) => {
    if (!previewRef.current || photos.length === 0) {
      return;
    }

    const originalIndex = currentIndex;

    for (let index = 0; index < photos.length; index += 1) {
      setCurrentIndex(index);
      await new Promise((resolve) => setTimeout(resolve, 120));
      await exportSingle(previewRef.current, options, photos[index]?.path);
    }

    setCurrentIndex(originalIndex);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <ToolRail route={route} />
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
          <WorkspacePanel
            route={route}
            activeTemplateId={templateId}
            templateProps={templateProps}
            previewRef={previewRef}
          />
          <AssetsPanel
            route={route}
            collapsed={assetsCollapsed}
            height={assetsHeight}
            onToggleCollapse={() => setAssetsCollapsed((value) => !value)}
            onResizeStart={handleAssetsResizeStart}
          />
        </div>
        <PropertiesPanel
          route={route}
          width={propertiesWidth}
          onResizeStart={handleResizeStart}
          activeTemplateId={templateId}
          onTemplateChange={setTemplateId}
          templateProps={templateProps}
          onTemplatePropsChange={setTemplateProps}
          onExportCurrent={handleExportCurrent}
          onExportBatch={handleExportBatch}
        />
      </div>
    </div>
  );
}
