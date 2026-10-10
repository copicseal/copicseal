import { RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { usePhotos } from '@/shared/hooks/use-photos';
import { useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { usePhotoExif } from '../hooks/use-photo-exif';
import {
  getTemplatePhotoConfig,
  useTemplatePhotoConfig,
  useTemplateStore,
} from '../store/use-template-store';
import { collectUsedExifTokens, EXIF_TEXT_VARIABLES } from '../templates/format-exif-text';

/**
 * 「EXIF 字段」卡片：只列**当前模板用到的**变量，并允许直接改写。
 *
 * 与旧版 `modifiedExif` 的做法一致：改动值只覆盖用户动过的字段，其余仍取照片自身的 EXIF
 * （渲染与导出取 `解析值 ⊕ 改动值`）。照片读到的其它拍摄参数在原来的 EXIF 信息卡片里，只读。
 */
export function TemplateExifFieldsCard() {
  const t = useTranslate();
  const { currentPhoto } = usePhotos();
  const photoId = currentPhoto?.id ?? null;
  const { exif } = usePhotoExif(currentPhoto);
  const photoConfig = useTemplatePhotoConfig(photoId);
  const setModifiedExif = useTemplateStore((state) => state.setModifiedExif);
  const resetModifiedExif = useTemplateStore((state) => state.resetModifiedExif);

  const usedFields = useMemo(() => {
    const used = new Set(collectUsedExifTokens(photoConfig.params ?? {}));

    return EXIF_TEXT_VARIABLES.filter((variable) => used.has(variable.token));
  }, [photoConfig.params]);

  const overrides = photoConfig.modifiedExif;
  const hasOverride = Object.keys(overrides).length > 0;

  if (usedFields.length === 0) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        {t('template.exifFields.emptyTemplate')}
      </p>
    );
  }

  if (!photoId) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        {t('template.exifFields.emptyPhoto')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] leading-5 text-muted-foreground">
          {t('template.exifFields.hint')}
        </p>
        {hasOverride ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => resetModifiedExif(photoId)}
          >
            <RotateCcw data-icon="inline-start" />
            {t('template.exifFields.resetAll')}
          </Button>
        ) : null}
      </div>

      {usedFields.map((variable) => {
        const modified = variable.field in overrides;
        const value = modified ? overrides[variable.field] : (exif?.[variable.field] ?? '');
        const label = variable.labelKey ? t(variable.labelKey) : variable.label;

        return (
          <div key={variable.token} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-muted-foreground" title={variable.token}>
              {label}
            </span>
            <Input
              aria-label={label}
              data-exif-field={variable.field}
              className={cn('h-7 text-xs', modified && 'border-primary/60 bg-primary/5')}
              value={value ?? ''}
              onChange={(event) => setModifiedExif(photoId, variable.field, event.target.value)}
            />
            {modified ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                title={t('template.exifFields.resetField')}
                aria-label={t('template.exifFields.resetFieldAria', { name: label })}
                onClick={() => {
                  // 只还原这一个字段：删掉改动值即可回落到照片原值
                  const next = { ...overrides };
                  delete next[variable.field];
                  useTemplateStore.setState((state) => ({
                    configs: {
                      ...state.configs,
                      [photoId]: { ...getTemplatePhotoConfig(photoId), modifiedExif: next },
                    },
                  }));
                }}
              >
                <RotateCcw className="size-3.5" />
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
