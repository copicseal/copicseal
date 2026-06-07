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

const SPROCKET_IDS = Array.from({ length: 8 }, (_, i) => `sprocket-${i}`);
const SPROCKET_BOTTOM_IDS = Array.from({ length: 8 }, (_, i) => `sprocket-btm-${i}`);

export function RetroFilm({
  photoUrl,
  exif,
  margin,
  fontScale,
  primaryColor: _primaryColor,
  borderColor,
}: TemplateProps) {
  const pad = `${margin * 20}px`;
  const fontSize = 12 * fontScale;
  const line1 = formatText(DEFAULT_LINE1, exif);
  const line2 = formatText(DEFAULT_LINE2, exif);

  return (
    <div className="flex items-center justify-center bg-stone-900" style={{ padding: pad }}>
      <div className="relative" style={{ background: '#1a1a1a' }}>
        <div className="flex" style={{ gap: '2px', padding: '4px 4px 0' }}>
          {SPROCKET_IDS.map((id) => (
            <div key={id} className="size-3 rounded-sm" style={{ background: '#333' }} />
          ))}
        </div>
        <img
          src={photoUrl}
          alt=""
          className="block max-h-[55vh] object-contain"
          style={{
            padding: `${margin * 8}px`,
            filter: 'sepia(0.15) contrast(1.05) brightness(0.95)',
          }}
        />
        <div className="flex" style={{ gap: '2px', padding: '0 4px 4px' }}>
          {SPROCKET_BOTTOM_IDS.map((id) => (
            <div key={id} className="size-3 rounded-sm" style={{ background: '#333' }} />
          ))}
        </div>
        <div
          className="px-5 py-2 text-center font-mono tracking-wider"
          style={{
            color: '#d4a574',
            fontSize,
            background: 'linear-gradient(180deg, #1a1a1a, #111)',
            borderTop: `1px solid ${borderColor}40`,
          }}
        >
          <div className="leading-tight">{line1 || 'KODAK 400'}</div>
          <div className="mt-0.5 leading-tight" style={{ fontSize: fontSize * 0.8, opacity: 0.7 }}>
            {line2 || '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
