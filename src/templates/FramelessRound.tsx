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

export function FramelessRound({
  photoUrl,
  exif,
  margin,
  fontScale,
  primaryColor,
  borderColor,
}: TemplateProps) {
  const pad = `${margin * 16}px`;
  const radius = `${margin * 12}px`;
  const fontSize = 12 * fontScale;
  const line1 = formatText(DEFAULT_LINE1, exif);
  const line2 = formatText(DEFAULT_LINE2, exif);

  return (
    <div className="flex items-center justify-center bg-white" style={{ padding: pad }}>
      <div className="relative">
        <img
          src={photoUrl}
          alt=""
          className="block max-h-[65vh] object-contain shadow-lg"
          style={{ borderRadius: radius, border: `1px solid ${borderColor}20` }}
        />
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg px-5 py-2 text-center backdrop-blur-md"
          style={{ backgroundColor: `${borderColor}99`, color: primaryColor, fontSize }}
        >
          <div className="font-medium leading-tight">{line1 || ' '}</div>
          <div
            className="mt-0.5 font-mono leading-tight"
            style={{ fontSize: fontSize * 0.85, opacity: 0.9 }}
          >
            {line2 || ' '}
          </div>
        </div>
      </div>
    </div>
  );
}
