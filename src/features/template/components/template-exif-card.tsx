import { Loader2, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import type { ExifData } from '@/platform';
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

/** EXIF 拍摄时间形如 "2024:01:15 14:30:00"，转换为 "2024-01-15 14:30:00" 展示。 */
function formatExifDate(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
}

function formatGps(exif: ExifData): string | null {
  if (exif.latitude === null || exif.longitude === null) return null;
  return `${exif.latitude.toFixed(6)}, ${exif.longitude.toFixed(6)}`;
}

function formatDimensions(exif: ExifData): string | null {
  if (exif.image_width === null || exif.image_height === null) return null;
  return `${exif.image_width} × ${exif.image_height}`;
}

/**
 * 右侧属性栏最下方的 EXIF 卡片。
 *
 * 上半部分列出**当前模板用到的 EXIF 字段**，可以直接改写；改动值只覆盖用户动过的字段，
 * 其余仍取照片自身的 EXIF（与旧版 `outputExif = { ...exif, ...modifiedExif }` 一致）。
 * 下半部分是照片读到的其它拍摄参数，只读。
 */
export function TemplateExifCard() {
  const t = useTranslate();
  const { currentPhoto } = usePhotos();
  const { exif, loading } = usePhotoExif(currentPhoto);
  const photoId = currentPhoto?.id ?? null;
  // 未编辑过的照片配置存在 defaultConfig 里，必须走带回落的读取
  const photoConfig = useTemplatePhotoConfig(photoId);
  const params = photoConfig.params;
  const modifiedExif = photoConfig.modifiedExif;
  const setModifiedExif = useTemplateStore((state) => state.setModifiedExif);
  const resetModifiedExif = useTemplateStore((state) => state.resetModifiedExif);

  const usedFields = useMemo(() => {
    const used = new Set(collectUsedExifTokens(params ?? {}));

    return EXIF_TEXT_VARIABLES.filter((variable) => used.has(variable.token));
  }, [params]);

  const overrides = modifiedExif ?? {};
  const hasOverride = Object.keys(overrides).length > 0;

  const camera = [exif?.make, exif?.model].filter(Boolean).join(' ') || null;
  const shootingParams =
    [exif?.focal_length, exif?.aperture, exif?.shutter_speed, exif?.iso ? `ISO ${exif.iso}` : null]
      .filter(Boolean)
      .join(' · ') || null;

  const rows: Array<[string, string | null]> = [
    [t('template.exifCard.field.camera'), camera],
    [t('template.exifCard.field.lens'), exif?.lens_model ?? null],
    [t('template.exifCard.field.shootingParams'), shootingParams],
    [t('template.exifCard.field.dateTaken'), formatExifDate(exif?.date_taken ?? null)],
    [t('template.exifCard.field.exposureCompensation'), exif?.exposure_compensation ?? null],
    [t('template.exifCard.field.whiteBalance'), exif?.white_balance ?? null],
    [t('template.exifCard.field.meteringMode'), exif?.metering_mode ?? null],
    [t('template.exifCard.field.dimensions'), exif ? formatDimensions(exif) : null],
    [t('template.exifCard.field.gps'), exif ? formatGps(exif) : null],
  ];
  const visibleRows = rows.filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <div className="space-y-3">
      {usedFields.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] leading-5 text-muted-foreground">
              {photoId ? t('template.exifCard.used.hint') : t('template.exifCard.used.emptyPhoto')}
            </p>
            {photoId && hasOverride ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => resetModifiedExif(photoId)}
              >
                <RotateCcw data-icon="inline-start" />
                {t('template.exifCard.used.resetAll')}
              </Button>
            ) : null}
          </div>

          {photoId
            ? usedFields.map((variable) => {
                const modified = variable.field in overrides;
                const value = modified ? overrides[variable.field] : (exif?.[variable.field] ?? '');
                const label = variable.labelKey ? t(variable.labelKey) : variable.label;

                return (
                  <div key={variable.token} className="flex items-center gap-2">
                    <span
                      className="w-14 shrink-0 text-xs text-muted-foreground"
                      title={variable.token}
                    >
                      {label}
                    </span>
                    <Input
                      aria-label={label}
                      data-exif-field={variable.field}
                      className={cn('h-7 text-xs', modified && 'border-primary/60 bg-primary/5')}
                      value={value ?? ''}
                      onChange={(event) =>
                        setModifiedExif(photoId, variable.field, event.target.value)
                      }
                    />
                    {modified ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        title={t('template.exifCard.used.resetField')}
                        aria-label={t('template.exifCard.used.resetFieldAria', { name: label })}
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
              })
            : null}
        </div>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">
          {t('template.exifCard.used.emptyTemplate')}
        </p>
      )}

      <div className="space-y-1.5 border-t border-border/70 pt-3 text-xs">
        {loading ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {t('template.exifCard.loading')}
          </p>
        ) : visibleRows.length === 0 ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {currentPhoto ? t('template.exifCard.noExif') : t('template.exifCard.empty')}
          </p>
        ) : (
          visibleRows.map(([rowLabel, rowValue]) => (
            <div key={rowLabel} className="flex gap-3">
              <span className="w-14 shrink-0 text-muted-foreground">{rowLabel}</span>
              <span className="min-w-0 flex-1 break-all text-foreground" title={rowValue}>
                {rowValue}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
