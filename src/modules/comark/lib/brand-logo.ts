const BRAND_COLORS: Record<string, { bg: string; fg: string }> = {
  Sony: { bg: '#f5f5f5', fg: '#1a1a1a' },
  Canon: { bg: '#c00', fg: '#fff' },
  Nikon: { bg: '#ffe100', fg: '#000' },
  Fujifilm: { bg: '#006641', fg: '#fff' },
  Olympus: { bg: '#215296', fg: '#fff' },
  Panasonic: { bg: '#00429b', fg: '#fff' },
  Leica: { bg: '#e3000b', fg: '#fff' },
  Ricoh: { bg: '#d50032', fg: '#fff' },
  Pentax: { bg: '#666', fg: '#fff' },
  Sigma: { bg: '#1a1a1a', fg: '#fff' },
  Hasselblad: { bg: '#c8ae7e', fg: '#1a1a1a' },
  Samsung: { bg: '#1428a0', fg: '#fff' },
  Apple: { bg: '#1a1a1a', fg: '#fff' },
  Google: { bg: '#4285f4', fg: '#fff' },
  Huawei: { bg: '#cf0a2c', fg: '#fff' },
  Xiaomi: { bg: '#ff6900', fg: '#fff' },
  DJI: { bg: '#1a1a1a', fg: '#fff' },
  GoPro: { bg: '#00a3e0', fg: '#fff' },
  Insta360: { bg: '#ffcc00', fg: '#000' },
  OnePlus: { bg: '#f5010c', fg: '#fff' },
  OPPO: { bg: '#1e7834', fg: '#fff' },
  vivo: { bg: '#415fff', fg: '#fff' },
  Nokia: { bg: '#124191', fg: '#fff' },
  Zeiss: { bg: '#00529b', fg: '#fff' },
};

export function getBrandColors(brand: string | null): { bg: string; fg: string } | null {
  if (!brand) return null;
  for (const [key, colors] of Object.entries(BRAND_COLORS)) {
    if (brand.toLowerCase().startsWith(key.toLowerCase())) {
      return colors;
    }
  }
  return null;
}

export function getBrandInitial(brand: string): string {
  const clean = brand.trim();
  return clean.charAt(0).toUpperCase();
}
