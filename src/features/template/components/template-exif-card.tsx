import { Loader2 } from 'lucide-react';
import type { ExifData } from '@/platform';
import { usePhotos } from '@/shared/hooks/use-photos';
import { usePhotoExif } from '../hooks/use-photo-exif';

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

/** 右侧属性栏最下方的 EXIF 信息卡片，展示当前图片读取到的拍摄参数。 */
export function TemplateExifCard() {
  const { currentPhoto } = usePhotos();
  const { exif, loading } = usePhotoExif(currentPhoto);

  const camera = [exif?.make, exif?.model].filter(Boolean).join(' ') || null;
  const shootingParams =
    [exif?.focal_length, exif?.aperture, exif?.shutter_speed, exif?.iso ? `ISO ${exif.iso}` : null]
      .filter(Boolean)
      .join(' · ') || null;

  const rows: Array<[string, string | null]> = [
    ['相机', camera],
    ['镜头', exif?.lens_model ?? null],
    ['拍摄参数', shootingParams],
    ['拍摄时间', formatExifDate(exif?.date_taken ?? null)],
    ['曝光补偿', exif?.exposure_compensation ?? null],
    ['白平衡', exif?.white_balance ?? null],
    ['测光模式', exif?.metering_mode ?? null],
    ['尺寸', exif ? formatDimensions(exif) : null],
    ['GPS', exif ? formatGps(exif) : null],
  ];
  const visibleRows = rows.filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">EXIF 信息</h3>
      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          正在读取 EXIF...
        </p>
      ) : visibleRows.length === 0 ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {currentPhoto ? '当前图片未读取到 EXIF 信息。' : '导入图片后在这里查看拍摄参数。'}
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
