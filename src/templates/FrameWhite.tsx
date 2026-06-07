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

export function FrameWhite({
  photoUrl,
  exif,
  margin,
  fontScale,
  primaryColor,
  borderColor,
}: TemplateProps) {
  const pad = `${margin * 40}px`;
  const borderW = `${margin * 24}px`;
  const fontSize = 12 * fontScale;
  const line1 = formatText(DEFAULT_LINE1, exif);
  const line2 = formatText(DEFAULT_LINE2, exif);

  return (
    <div className="flex items-center justify-center bg-white" style={{ padding: pad }}>
      <div
        className="relative flex flex-col items-center"
        style={{ border: `${borderW} solid ${borderColor}`, background: 'white' }}
      >
        <img src={photoUrl} alt="" className="block max-h-[60vh] object-contain" />
        <div className="w-full px-4 py-2 text-center" style={{ color: primaryColor, fontSize }}>
          <div className="font-medium leading-tight">{line1 || ' '}</div>
          <div
            className="mt-0.5 font-mono opacity-80 leading-tight"
            style={{ fontSize: fontSize * 0.85 }}
          >
            {line2 || ' '}
          </div>
        </div>
      </div>
    </div>
  );
}
