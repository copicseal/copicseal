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

export function PsSplash({
  photoUrl,
  exif,
  margin,
  fontScale,
  primaryColor,
  borderColor,
}: TemplateProps) {
  const pad = `${margin * 32}px`;
  const fontSize = 12 * fontScale;
  const line1 = formatText(DEFAULT_LINE1, exif);
  const line2 = formatText(DEFAULT_LINE2, exif);

  return (
    <div
      className="flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${borderColor}20 25%, ${borderColor}08 75%)`,
        padding: pad,
      }}
    >
      <div
        className="relative overflow-hidden shadow-xl"
        style={{
          background: `linear-gradient(180deg, #2a2a2e 0%, #1c1c1e 40%, #2a2a2e 100%)`,
          borderRadius: '12px',
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-red-400" />
            <div className="size-2.5 rounded-full bg-yellow-400" />
            <div className="size-2.5 rounded-full bg-green-400" />
          </div>
          <span className="text-[10px] text-white/60">PS</span>
        </div>
        <img
          src={photoUrl}
          alt=""
          className="block max-h-[50vh] object-contain"
          style={{ padding: `${margin * 12}px ${margin * 12}px 0` }}
        />
        <div
          className="px-6 py-3 text-center"
          style={{
            color: primaryColor,
            fontSize,
            background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.4))',
          }}
        >
          <div className="font-medium leading-tight tracking-wide">{line1 || ' '}</div>
          <div
            className="mt-1 font-mono leading-tight tracking-wider"
            style={{ fontSize: fontSize * 0.85, opacity: 0.8 }}
          >
            {line2 || ' '}
          </div>
        </div>
      </div>
    </div>
  );
}
