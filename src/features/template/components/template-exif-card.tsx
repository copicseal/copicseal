import { Loader2 } from 'lucide-react';
import type { ExifData } from '@/platform';
import { usePhotos } from '@/shared/hooks/use-photos';
import { type MessageKey, useTranslate } from '@/shared/i18n';
import { usePhotoExif } from '../hooks/use-photo-exif';

/** EXIF 拍摄时间形如 "2024:01:15 14:30:00"，转换为 "2024-01-15 14:30:00" 展示。 */
function formatExifDate(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
}

/** 经纬度：小数 + 半球字母（N/S、E/W），如 `31.230278°N, 121.473889°E`。 */
function formatGps(exif: ExifData): string | null {
  if (exif.latitude === null || exif.longitude === null) return null;

  const latitude = `${Math.abs(exif.latitude).toFixed(6)}°${exif.latitude >= 0 ? 'N' : 'S'}`;
  const longitude = `${Math.abs(exif.longitude).toFixed(6)}°${exif.longitude >= 0 ? 'E' : 'W'}`;

  return `${latitude}, ${longitude}`;
}

function formatDimensions(exif: ExifData): string | null {
  if (exif.image_width === null || exif.image_height === null) return null;
  return `${exif.image_width} × ${exif.image_height}`;
}

/** 枚举值 → 文案；未覆盖的取值直接显示原始数字，避免出现空白。 */
function enumLabel(
  value: number | null,
  labels: Record<number, MessageKey>,
  t: (key: MessageKey) => string,
): string | null {
  if (value === null) {
    return null;
  }

  const key = labels[value];

  return key ? t(key) : String(value);
}

const ORIENTATION_LABELS: Record<number, MessageKey> = {
  1: 'template.exifCard.enum.orientation.normal',
  2: 'template.exifCard.enum.orientation.flipHorizontal',
  3: 'template.exifCard.enum.orientation.rotate180',
  4: 'template.exifCard.enum.orientation.flipVertical',
  5: 'template.exifCard.enum.orientation.transpose',
  6: 'template.exifCard.enum.orientation.rotate90',
  7: 'template.exifCard.enum.orientation.transverse',
  8: 'template.exifCard.enum.orientation.rotate270',
};

const EXPOSURE_PROGRAM_LABELS: Record<number, MessageKey> = {
  0: 'template.exifCard.enum.exposureProgram.notDefined',
  1: 'template.exifCard.enum.exposureProgram.manual',
  2: 'template.exifCard.enum.exposureProgram.normal',
  3: 'template.exifCard.enum.exposureProgram.aperturePriority',
  4: 'template.exifCard.enum.exposureProgram.shutterPriority',
  5: 'template.exifCard.enum.exposureProgram.creative',
  6: 'template.exifCard.enum.exposureProgram.action',
  7: 'template.exifCard.enum.exposureProgram.portrait',
  8: 'template.exifCard.enum.exposureProgram.landscape',
};

const FLASH_LABELS: Record<number, MessageKey> = {
  0: 'template.exifCard.enum.flash.notFired',
  1: 'template.exifCard.enum.flash.fired',
  5: 'template.exifCard.enum.flash.firedNoReturn',
  7: 'template.exifCard.enum.flash.firedNoReturnAuto',
  9: 'template.exifCard.enum.flash.firedAuto',
  16: 'template.exifCard.enum.flash.notFiredAuto',
  24: 'template.exifCard.enum.flash.notFiredAutoOff',
  25: 'template.exifCard.enum.flash.firedAutoOff',
  32: 'template.exifCard.enum.flash.notFiredNoFunction',
};

/** 海拔：带单位展示，负值表示低于海平面。 */
function formatAltitude(value: number | null): string | null {
  return value === null ? null : `${value.toFixed(1)}m`;
}

/** 右侧属性栏最下方的 EXIF 信息卡片，展示当前图片读取到的拍摄参数。 */
export function TemplateExifCard() {
  const t = useTranslate();
  const { currentPhoto } = usePhotos();
  const { exif, loading } = usePhotoExif(currentPhoto);

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
    [t('template.exifCard.field.gpsAltitude'), exif ? formatAltitude(exif.gps_altitude) : null],
    // 以下为补充的拍摄 / 图像信息，读不到就不占行
    [
      t('template.exifCard.field.focalLength35mm'),
      exif?.focal_length_35mm ? `${exif.focal_length_35mm}mm` : null,
    ],
    [t('template.exifCard.field.maxAperture'), exif?.max_aperture ?? null],
    [
      t('template.exifCard.field.orientation'),
      exif ? enumLabel(exif.orientation, ORIENTATION_LABELS, t) : null,
    ],
    [
      t('template.exifCard.field.exposureProgram'),
      exif ? enumLabel(exif.exposure_program, EXPOSURE_PROGRAM_LABELS, t) : null,
    ],
    [t('template.exifCard.field.flash'), exif ? enumLabel(exif.flash, FLASH_LABELS, t) : null],
    [t('template.exifCard.field.software'), exif?.software ?? null],
    [t('template.exifCard.field.artist'), exif?.artist ?? null],
    [t('template.exifCard.field.copyright'), exif?.copyright ?? null],
    [t('template.exifCard.field.bodySerial'), exif?.body_serial ?? null],
    [t('template.exifCard.field.lensSerial'), exif?.lens_serial ?? null],
  ];
  const visibleRows = rows.filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <div className="space-y-3">
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
        <div className="space-y-1.5 text-xs">
          {visibleRows.map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <span className="w-14 shrink-0 text-muted-foreground">{label}</span>
              <span className="min-w-0 flex-1 break-all text-foreground" title={value}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
