import { ImageIcon, LayoutTemplate } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TemplateRuntime } from '@/features/template/runtime';
import {
  getDefaultParams,
  resolveBuiltinTemplate,
} from '@/features/template/runtime/template-registry';
import { DEFAULT_TEMPLATE_ID } from '@/features/template/templates';
import { usePhotos } from '@/shared/hooks/use-photos';
import { Button } from '@/shared/ui/button';
import { usePhotoExif } from '../hooks/use-photo-exif';

type TemplateZoomMode = 'fit' | 50 | 100 | 200;

const ZOOM_OPTIONS: TemplateZoomMode[] = ['fit', 50, 100, 200];

interface TemplatePreviewProps {
  templateId: string;
  /** 当前用户参数，渲染前由 TemplateRuntime 按模板自己的 schema 兜底归一 */
  params: Record<string, unknown>;
  previewRef?: React.RefObject<HTMLDivElement | null>;
}

export function TemplatePreview({ templateId, params, previewRef }: TemplatePreviewProps) {
  const { currentPhoto } = usePhotos();
  const { exif } = usePhotoExif(currentPhoto);
  const [zoomMode, setZoomMode] = useState<TemplateZoomMode>('fit');

  const template = resolveBuiltinTemplate(templateId);

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

  const scale = zoomMode === 'fit' ? 1 : zoomMode / 100;

  return (
    <div className="flex h-full w-full flex-col items-center gap-5">
      <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-auto">
        <div
          ref={previewRef}
          className="origin-center transition-transform duration-200"
          style={{
            transform: `scale(${scale})`,
            maxWidth: zoomMode === 'fit' ? '100%' : undefined,
          }}
        >
          <TemplateRuntime
            templateId={templateId}
            photoUrl={currentPhoto.previewUrl}
            exif={exif}
            params={params}
          />
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
