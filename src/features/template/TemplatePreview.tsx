import { ImageIcon, LayoutTemplate } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { type ExifData, readExif } from '@/bridge/assets.api';
import { getBuiltinTemplateById } from '@/bridge/template.api';
import { Button } from '@/components/ui/button';
import { usePhotos } from '@/hooks/usePhotos';
import type { TemplateProps } from '@/modules/comark/templates';
import { TemplateRuntime } from '@/runtime/template';

type TemplateZoomMode = 'fit' | 50 | 100 | 200;

const ZOOM_OPTIONS: TemplateZoomMode[] = ['fit', 50, 100, 200];

interface TemplatePreviewProps {
  activeTemplateId: string;
  templateProps: Omit<TemplateProps, 'photoUrl' | 'exif'>;
  previewRef?: React.RefObject<HTMLDivElement | null>;
}

export function TemplatePreview({
  activeTemplateId,
  templateProps,
  previewRef,
}: TemplatePreviewProps) {
  const { currentPhoto } = usePhotos();
  const [exif, setExif] = useState<ExifData | null>(null);
  const [zoomMode, setZoomMode] = useState<TemplateZoomMode>('fit');

  const loadExif = useCallback(async (path: string) => {
    try {
      const data = await readExif(path);
      setExif(data);
    } catch {
      setExif(null);
    }
  }, []);

  useEffect(() => {
    if (currentPhoto?.path) {
      void loadExif(currentPhoto.path);
      return;
    }

    setExif(null);
  }, [currentPhoto?.path, loadExif]);

  const template = getBuiltinTemplateById(activeTemplateId);

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
      <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase shadow-sm">
        当前模板
      </div>

      <div className="flex gap-2">
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
            templateId={activeTemplateId}
            props={{
              photoUrl: currentPhoto.previewUrl,
              exif,
              ...templateProps,
            }}
          />
        </div>
      </div>

      <div className="flex w-full max-w-xl items-center justify-between border-t border-border/80 pt-3 text-xs text-muted-foreground">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{currentPhoto.name}</p>
          <p>{(currentPhoto.size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
        <div className="flex items-center gap-2">
          <ImageIcon className="size-3.5" />
          <span>{template?.meta.name ?? activeTemplateId}</span>
        </div>
      </div>
    </div>
  );
}

export function useTemplatePreviewState() {
  const [templateId, setTemplateId] = useState('minimal');
  const [templateProps, setTemplateProps] = useState<Omit<TemplateProps, 'photoUrl' | 'exif'>>(
    () => ({
      orientation: 'auto',
      margin: 1,
      fontScale: 1,
      primaryColor: '#1a1a1a',
      borderColor: '#1a1a1a',
      textLine1: '{Make} {Model}',
      textLine2: '{FocalLength}  f/{FNumber}  {ExposureTime}s  ISO{ISO}',
    }),
  );

  useEffect(() => {
    const template = getBuiltinTemplateById(templateId);
    if (!template) {
      return;
    }

    setTemplateProps(template.schema.defaults);
  }, [templateId]);

  return {
    templateId,
    setTemplateId,
    templateProps,
    setTemplateProps,
  };
}
