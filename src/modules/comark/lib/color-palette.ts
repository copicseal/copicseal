export interface ColorPalette {
  dominant: string;
  palette: string[];
}

async function getImageData(img: HTMLImageElement): Promise<ImageData | null> {
  const size = 50;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function extractDominant(data: ImageData): string {
  const colorMap = new Map<string, number>();
  const pixels = data.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = Math.round(pixels[i] / 32) * 32;
    const g = Math.round(pixels[i + 1] / 32) * 32;
    const b = Math.round(pixels[i + 2] / 32) * 32;
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  let maxCount = 0;
  let dominantKey = '0,0,0';
  for (const [key, count] of colorMap) {
    if (count > maxCount) {
      maxCount = count;
      dominantKey = key;
    }
  }

  const [r, g, b] = dominantKey.split(',').map(Number);
  return rgbToHex(r, g, b);
}

function extractPalette(data: ImageData, count: number): string[] {
  const colorMap = new Map<string, number>();
  const pixels = data.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = Math.round(pixels[i] / 64) * 64;
    const g = Math.round(pixels[i + 1] / 64) * 64;
    const b = Math.round(pixels[i + 2] / 64) * 64;
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  return Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => {
      const [r, g, b] = key.split(',').map(Number);
      return rgbToHex(r, g, b);
    });
}

export async function extractColorPalette(src: string): Promise<ColorPalette | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const data = await getImageData(img);
      if (!data) {
        resolve(null);
        return;
      }
      resolve({
        dominant: extractDominant(data),
        palette: extractPalette(data, 5),
      });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
