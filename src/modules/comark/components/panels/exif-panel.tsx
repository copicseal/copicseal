import { Info } from 'lucide-react';
import type { ExifData } from '@/api';
import { usePhotos } from '@/hooks/usePhotos';
import { getBrandColors, getBrandInitial } from '../../lib/brand-logo';
import type { ColorPalette } from '../../lib/color-palette';

function ExifField({
  label,
  value,
  editable,
}: {
  label: string;
  value?: string;
  editable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span
        className={`truncate text-right text-[10px] tabular-nums ${
          editable
            ? 'cursor-pointer underline decoration-dotted underline-offset-2 hover:text-foreground'
            : ''
        } ${value ? 'text-foreground' : 'text-muted-foreground/50'}`}
      >
        {value || '—'}
      </span>
    </div>
  );
}

interface CoExifPanelProps {
  exif: ExifData | null;
  loading: boolean;
  palette?: ColorPalette | null;
}

export function CoExifPanel({ exif, loading, palette }: CoExifPanelProps) {
  const { currentPhoto } = usePhotos();
  const hasAnyField = exif && Object.values(exif).some((v) => v != null);
  const brandColors = getBrandColors(exif?.make ?? null);
  const brandInitial = exif?.make ? getBrandInitial(exif.make) : null;

  return (
    <div className="flex flex-col gap-3 p-3 text-xs">
      <h4 className="font-semibold text-foreground">照片信息</h4>

      {!currentPhoto ? (
        <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
          <Info className="size-8 opacity-20" />
          <p className="text-[10px]">请选择一张照片</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
          <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
          <p className="text-[10px]">读取中...</p>
        </div>
      ) : !hasAnyField ? (
        <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
          <Info className="size-8 opacity-20" />
          <p className="text-[10px]">未读取到 EXIF 信息</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-1.5 py-2">
            {brandColors && brandInitial ? (
              <div
                className="flex size-10 items-center justify-center rounded-full text-sm font-bold"
                style={{ backgroundColor: brandColors.bg, color: brandColors.fg }}
              >
                {brandInitial}
              </div>
            ) : (
              <div className="flex size-10 items-center justify-center rounded-full bg-muted/50">
                <Info className="size-5 text-muted-foreground" />
              </div>
            )}
            <span className="text-[10px] font-medium">{currentPhoto.name}</span>
          </div>

          <div className="space-y-0.5">
            <div className="mb-1 border-b pb-1">
              <span className="text-[10px] font-medium text-muted-foreground">设备</span>
            </div>
            <ExifField label="相机型号" value={exif.make ?? exif.model ?? undefined} editable />
            <ExifField label="镜头型号" value={exif.lens_model ?? undefined} editable />
          </div>

          <div className="space-y-0.5">
            <div className="mb-1 border-b pb-1">
              <span className="text-[10px] font-medium text-muted-foreground">拍摄参数</span>
            </div>
            <ExifField label="光圈" value={exif.aperture ?? undefined} />
            <ExifField label="快门速度" value={exif.shutter_speed ?? undefined} />
            <ExifField label="ISO" value={exif.iso ?? undefined} />
            <ExifField label="焦距" value={exif.focal_length ?? undefined} />
            <ExifField label="曝光补偿" value={exif.exposure_compensation ?? undefined} />
          </div>

          <div className="space-y-0.5">
            <div className="mb-1 border-b pb-1">
              <span className="text-[10px] font-medium text-muted-foreground">其他</span>
            </div>
            <ExifField label="拍摄时间" value={exif.date_taken ?? undefined} />
            <ExifField label="白平衡" value={exif.white_balance ?? undefined} />
            <ExifField label="测光模式" value={exif.metering_mode ?? undefined} />
          </div>

          {palette && (
            <div className="space-y-1">
              <div className="mb-1 border-b pb-1">
                <span className="text-[10px] font-medium text-muted-foreground">调色板</span>
              </div>
              <div className="flex gap-1">
                {palette.palette.map((color) => (
                  <div
                    key={color}
                    className="size-4 rounded-sm border"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
