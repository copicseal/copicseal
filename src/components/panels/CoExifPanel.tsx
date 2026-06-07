import { Camera, Info } from 'lucide-react';
import { usePhotos } from '@/hooks/usePhotos';

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
      <span className="text-[10px] text-muted-foreground shrink-0">{label}</span>
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

export function CoExifPanel() {
  const { currentPhoto } = usePhotos();

  return (
    <div className="space-y-3 p-3 text-xs">
      <h4 className="font-semibold text-foreground">照片信息</h4>

      {!currentPhoto ? (
        <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
          <Info className="size-8 opacity-20" />
          <p className="text-[10px]">请选择一张照片</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-1.5 py-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted/50">
              <Camera className="size-5 text-muted-foreground" />
            </div>
            <span className="text-[10px] font-medium">{currentPhoto.name}</span>
          </div>

          <div className="space-y-0.5">
            <div className="mb-1 border-b pb-1">
              <span className="text-[10px] font-medium text-muted-foreground">设备</span>
            </div>
            <ExifField label="相机型号" editable />
            <ExifField label="镜头型号" editable />
          </div>

          <div className="space-y-0.5">
            <div className="mb-1 border-b pb-1">
              <span className="text-[10px] font-medium text-muted-foreground">拍摄参数</span>
            </div>
            <ExifField label="光圈" />
            <ExifField label="快门速度" />
            <ExifField label="ISO" />
            <ExifField label="焦距" />
            <ExifField label="曝光补偿" />
          </div>

          <div className="space-y-0.5">
            <div className="mb-1 border-b pb-1">
              <span className="text-[10px] font-medium text-muted-foreground">其他</span>
            </div>
            <ExifField label="拍摄时间" />
            <ExifField label="白平衡" />
            <ExifField label="测光模式" />
          </div>
        </>
      )}
    </div>
  );
}
