import { ImageIcon, LayoutTemplate } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TemplateRuntime } from '@/features/template/runtime';
import {
  getDefaultParams,
  resolveBuiltinTemplate,
} from '@/features/template/runtime/template-registry';
import { DEFAULT_TEMPLATE_ID } from '@/features/template/templates';
import { useElementSize } from '@/shared/hooks/use-element-size';
import { usePhotos } from '@/shared/hooks/use-photos';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { usePhotoExif } from '../hooks/use-photo-exif';

type TemplateZoomMode = 'fit' | 50 | 100 | 200;

const ZOOM_OPTIONS: TemplateZoomMode[] = ['fit', 50, 100, 200];

/** 百分比档位对应的画布宽度基准：100% 即 800px 画布。 */
const ZOOM_REFERENCE_WIDTH = 800;

/** 自适应探针基准与画布宽度下限 */
const FIT_PROBE_BASE = 1000;
const MIN_PREVIEW_BASE = 60;

interface TemplatePreviewProps {
  templateId: string;
  /** 当前用户参数，渲染前由 TemplateRuntime 按模板自己的 schema 兜底归一 */
  params: Record<string, unknown>;
  previewRef?: React.RefObject<HTMLDivElement | null>;
  /** 导出期间挂起自适应，避免覆盖导出解算出的基准 */
  suspendAutoFit?: boolean;
}

export function TemplatePreview({
  templateId,
  params,
  previewRef,
  suspendAutoFit = false,
}: TemplatePreviewProps) {
  const { currentPhoto } = usePhotos();
  const { exif } = usePhotoExif(currentPhoto);
  const [zoomMode, setZoomMode] = useState<TemplateZoomMode>('fit');
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewport = useElementSize(viewportRef);

  const template = resolveBuiltinTemplate(templateId);

  /**
   * 影响画布尺寸的全部输入。
   *
   * 这些值不直接参与测量计算，但任何一个变化都必须重新自适应；
   * 作为指纹既表达了这层真实依赖，也避免同一状态下重复测量。
   */
  const fitKey = [
    suspendAutoFit ? 'suspend' : 'fit',
    zoomMode,
    templateId,
    currentPhoto?.id ?? '',
    `${Math.round(viewport.width)}x${Math.round(viewport.height)}`,
    JSON.stringify(params),
  ].join('|');

  /**
   * 预览自适应：直接改写 `--co-base`，不叠加任何 CSS transform。
   *
   * 画布高度由内容比例决定，所以先用探针基准量一次比例，再线性反解出
   * 能装进预览区的基准值。整个过程在 paint 之前完成，探针值不会被看到。
   */
  useLayoutEffect(() => {
    const element = previewRef?.current;
    const viewportElement = viewportRef.current;
    if (suspendAutoFit || !element || !viewportElement || element.dataset.fitKey === fitKey) {
      return;
    }

    if (zoomMode !== 'fit') {
      element.dataset.fitKey = fitKey;
      element.style.setProperty('--co-base', `${(ZOOM_REFERENCE_WIDTH * zoomMode) / 100}px`);
      return;
    }

    // 直接读实时尺寸而不是等 ResizeObserver：首帧也要拿到正确可用区
    const availableWidth = viewportElement.clientWidth;
    const availableHeight = viewportElement.clientHeight;
    if (availableWidth <= 0 || availableHeight <= 0) {
      return;
    }

    element.style.setProperty('--co-base', `${FIT_PROBE_BASE}px`);

    // offsetWidth/offsetHeight 是布局尺寸，不受任何外层变换影响
    const canvas = (element.firstElementChild as HTMLElement | null) ?? element;
    const measuredWidth = canvas.offsetWidth;
    const measuredHeight = canvas.offsetHeight;
    if (measuredWidth <= 0 || measuredHeight <= 0) {
      return;
    }

    const fit = Math.min(availableWidth / measuredWidth, availableHeight / measuredHeight);
    const base = Math.max(MIN_PREVIEW_BASE, Math.round(FIT_PROBE_BASE * fit));
    element.style.setProperty('--co-base', `${base}px`);
    element.dataset.fitKey = fitKey;
  }, [fitKey, previewRef, suspendAutoFit, zoomMode]);

  if (!currentPhoto) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center text-muted-foreground">
        <LayoutTemplate className="size-14 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">边框水印预览</h1>
          <p className="mt-2 text-sm leading-6">选择一张图片后，这里会显示真实模板渲染结果。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center gap-5">
      <div
        ref={viewportRef}
        className={cn(
          'flex min-h-0 w-full flex-1 items-center justify-center',
          // 导出期间画布会临时放大到目标尺寸，此时不跟随滚动，避免视口乱跳
          suspendAutoFit ? 'overflow-hidden' : 'overflow-auto',
        )}
      >
        {/* 内边距放在内层：viewportRef 的 clientWidth/Height 就是可用区域 */}
        <div className="p-4">
          <div ref={previewRef}>
            <TemplateRuntime
              templateId={templateId}
              photoUrl={currentPhoto.previewUrl}
              exif={exif}
              params={params}
            />
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-4 border-t border-border/80 px-4 py-2 text-xs text-muted-foreground">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{currentPhoto.name}</p>
          <p>{(currentPhoto.size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ZOOM_OPTIONS.map((option) => {
            const active = zoomMode === option;

            return (
              <Button
                key={option.toString()}
                variant={active ? 'default' : 'outline'}
                size="sm"
                onClick={() => setZoomMode(option)}
              >
                {option === 'fit' ? '适应' : `${option}%`}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <ImageIcon className="size-3.5" />
          <span>{template.meta.name}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Template 页的模板选择与参数状态。
 *
 * 切换模板时按新模板自己的 schema 重置参数：不同模板的参数集合互不兼容，
 * 保留旧值只会让属性面板出现与当前模板无关的残留字段。
 */
export function useTemplatePreviewState() {
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID);
  const [templateParams, setTemplateParams] = useState<Record<string, unknown>>(() =>
    getDefaultParams(resolveBuiltinTemplate(DEFAULT_TEMPLATE_ID).schema),
  );

  useEffect(() => {
    setTemplateParams(getDefaultParams(resolveBuiltinTemplate(templateId).schema));
  }, [templateId]);

  return {
    templateId,
    setTemplateId,
    templateParams,
    setTemplateParams,
  };
}
