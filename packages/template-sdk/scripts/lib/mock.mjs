/** 校验与冒烟共用的假数据（预览页有浏览器版的同一份，见 preview/mock-data.ts）。 */

export const MOCK_EXIF = {
  make: 'SONY',
  model: 'ILCE-7M4',
  lens_model: 'FE 35mm F1.8',
  aperture: 'f/1.8',
  shutter_speed: '1/200s',
  iso: '100',
  focal_length: '35mm',
  exposure_compensation: '0',
  date_taken: '2026-05-01 18:24',
  white_balance: 'Auto',
  metering_mode: 'Multi',
  latitude: null,
  longitude: null,
  image_width: 1200,
  image_height: 800,
};

const PHOTO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#2b3a55"/><stop offset="0.5" stop-color="#6b4f7a"/><stop offset="1" stop-color="#d97b5a"/>
</linearGradient></defs>
<rect width="1200" height="800" fill="url(#g)"/>
<circle cx="900" cy="220" r="110" fill="#ffd9a0" opacity="0.75"/>
<text x="600" y="700" text-anchor="middle" font-family="monospace" font-size="42" fill="#ffffff" opacity="0.75">MOCK PHOTO 1200x800</text>
</svg>`;

/** 一张自带的假照片（data URL），不需要任何外部文件或网络。 */
export const MOCK_PHOTO_URL = `data:image/svg+xml,${encodeURIComponent(PHOTO_SVG)}`;
