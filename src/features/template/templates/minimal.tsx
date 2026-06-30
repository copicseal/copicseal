import type { TemplateProps } from './types';

const DEFAULT_LINE2 = '{FocalLength}  f/{FNumber}  {ExposureTime}s  ISO{ISO}';

function formatText(template: string, exif: TemplateProps['exif']): string {
  if (!exif) return template;
  return template
    .replace('{Make}', exif.make ?? '')
    .replace('{Model}', exif.model ?? '')
    .replace('{FocalLength}', exif.focal_length ?? '')
    .replace('{FNumber}', exif.aperture ?? '')
    .replace('{ExposureTime}', exif.shutter_speed ?? '')
    .replace('{ISO}', exif.iso ?? '');
}

export function Minimal({ photoUrl, exif, fontScale, primaryColor }: TemplateProps) {
  const fontSize = 12 * fontScale;
  const line2 = formatText(DEFAULT_LINE2, exif);

  return (
    <div className="flex items-center justify-center bg-white">
      <div className="relative">
        <img src={photoUrl} alt="" className="block max-h-[70vh] object-contain" />
        {line2 && (
          <div
            className="absolute bottom-4 right-4 rounded-md px-3 py-1.5 text-right font-mono leading-tight"
            style={{
              color: primaryColor,
              fontSize: fontSize * 0.85,
              background: 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {line2}
          </div>
        )}
      </div>
    </div>
  );
}
