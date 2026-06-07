import type { TemplateProps } from './types';

const DEFAULT_LINE1 = '{Make} {Model}';
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

export function Modern({
  photoUrl,
  exif,
  margin,
  fontScale,
  primaryColor,
  borderColor,
}: TemplateProps) {
  const pad = `${margin * 28}px`;
  const fontSize = 12 * fontScale;
  const line1 = formatText(DEFAULT_LINE1, exif);
  const line2 = formatText(DEFAULT_LINE2, exif);

  return (
    <div className="flex items-center justify-center bg-white" style={{ padding: pad }}>
      <div
        className="relative overflow-hidden shadow-2xl"
        style={{ borderRadius: '20px', border: `1px solid ${borderColor}30` }}
      >
        <img src={photoUrl} alt="" className="block max-h-[60vh] object-cover" />
        <div
          className="flex items-center justify-between"
          style={{ padding: `${margin * 6}px ${margin * 10}px` }}
        >
          <div style={{ color: primaryColor, fontSize }}>
            <div className="font-semibold leading-tight">{line1 || ' '}</div>
            <div
              className="mt-0.5 font-mono leading-tight"
              style={{ fontSize: fontSize * 0.85, opacity: 0.7 }}
            >
              {line2 || ' '}
            </div>
          </div>
          <div
            className="flex size-10 items-center justify-center rounded-full"
            style={{
              border: `2px solid ${borderColor}`,
              color: borderColor,
              fontSize: fontSize * 0.7,
            }}
          >
            <span className="font-bold">{exif?.iso ?? 'ISO'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
