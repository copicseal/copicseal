/**
 * 照片主题色提取（中位切分 / median cut）。
 *
 * 采样在渲染层完成：把照片画进一张小画布（直接压成正方形，保证全图均匀取样），
 * 统计按通道量化后的颜色直方图，再反复切分直方图——先按像素数切掉大块，再按色彩
 * 跨度细分——直到拿到目标数量的桶；每个桶取像素加权平均色。结果按占比从高到低
 * 排列，前列就是照片的主色调。
 *
 * 取像素必须走「fetch 字节 → blob URL → 画布」：直接给 `<img>` 设 `crossOrigin`
 * 重新加载在 Tauri 的 asset 协议下会静默失败，而 fetch 该协议是可行的。
 */

/** 采样边长。绘制开销与照片原始尺寸无关，100 × 100 的样本量已足够稳定。 */
const SAMPLE_SIZE = 100;

/** 通道量化位数：每通道保留 5 位，直方图最多 32768 个桶。 */
const QUANTIZE_BITS = 5;
const QUANTIZE_SHIFT = 8 - QUANTIZE_BITS;

/** 相邻主题色的最小欧氏距离，低于该距离视为同一种颜色。 */
const MIN_COLOR_DISTANCE = 30;

/** 一次提取的主题色数量：属性面板只会展示这么多色块。 */
export const PALETTE_SIZE = 5;

interface ColorEntry {
  r: number;
  g: number;
  b: number;
  /** 落在该颜色上的像素数 */
  count: number;
}

interface ColorSpans {
  r: number;
  g: number;
  b: number;
}

function quantizedKey(r: number, g: number, b: number): number {
  return (
    ((r >> QUANTIZE_SHIFT) << (QUANTIZE_BITS * 2)) |
    ((g >> QUANTIZE_SHIFT) << QUANTIZE_BITS) |
    (b >> QUANTIZE_SHIFT)
  );
}

/** 统计颜色直方图：同一量化桶内取真实像素的均值，量化误差不会直接进入结果。 */
function buildHistogram(pixels: Uint8ClampedArray): ColorEntry[] {
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();

  for (let index = 0; index < pixels.length; index += 4) {
    // 全透明像素不参与统计：它们不会成为背景的观感来源
    if (pixels[index + 3] === 0) {
      continue;
    }

    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const key = quantizedKey(r, g, b);
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
      continue;
    }

    buckets.set(key, { r, g, b, count: 1 });
  }

  return Array.from(buckets.values(), (bucket) => ({
    r: Math.round(bucket.r / bucket.count),
    g: Math.round(bucket.g / bucket.count),
    b: Math.round(bucket.b / bucket.count),
    count: bucket.count,
  }));
}

function totalCount(bucket: ColorEntry[]): number {
  return bucket.reduce((sum, entry) => sum + entry.count, 0);
}

/** 三个通道各自的跨度；跨度最大的通道就是下一次切分的轴。 */
function channelSpans(bucket: ColorEntry[]): ColorSpans {
  let minR = 255;
  let maxR = 0;
  let minG = 255;
  let maxG = 0;
  let minB = 255;
  let maxB = 0;

  for (const entry of bucket) {
    minR = Math.min(minR, entry.r);
    maxR = Math.max(maxR, entry.r);
    minG = Math.min(minG, entry.g);
    maxG = Math.max(maxG, entry.g);
    minB = Math.min(minB, entry.b);
    maxB = Math.max(maxB, entry.b);
  }

  return { r: maxR - minR, g: maxG - minG, b: maxB - minB };
}

/** 色彩跨度（最大单通道跨度）：跨度 0 说明桶内是同一个颜色，没有再切的价值。 */
function channelSpan(bucket: ColorEntry[]): number {
  const spans = channelSpans(bucket);
  return Math.max(spans.r, spans.g, spans.b);
}

/** 按像素数中位切分：切点保证两半都非空。 */
function splitBucket(bucket: ColorEntry[]): [ColorEntry[], ColorEntry[]] | null {
  const spans = channelSpans(bucket);
  const channel: keyof ColorSpans =
    spans.r >= spans.g && spans.r >= spans.b ? 'r' : spans.g >= spans.b ? 'g' : 'b';

  if (spans[channel] === 0) {
    return null;
  }

  const sorted = [...bucket].sort((a, b) => a[channel] - b[channel]);
  const half = totalCount(sorted) / 2;

  let accumulated = 0;
  let splitIndex = 1;
  for (let index = 0; index < sorted.length - 1; index += 1) {
    accumulated += sorted[index].count;
    splitIndex = index + 1;
    if (accumulated >= half) {
      break;
    }
  }

  return [sorted.slice(0, splitIndex), sorted.slice(splitIndex)];
}

/** 桶的代表色：按像素数加权平均。 */
function bucketColor(bucket: ColorEntry[]): ColorEntry {
  const total = totalCount(bucket) || 1;

  return {
    r: Math.round(bucket.reduce((sum, entry) => sum + entry.r * entry.count, 0) / total),
    g: Math.round(bucket.reduce((sum, entry) => sum + entry.g * entry.count, 0) / total),
    b: Math.round(bucket.reduce((sum, entry) => sum + entry.b * entry.count, 0) / total),
    count: total,
  };
}

function toHex(color: ColorEntry): string {
  return `#${[color.r, color.g, color.b]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

function colorDistance(a: ColorEntry, b: ColorEntry): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/**
 * 从 RGBA 像素中提取主题色。
 *
 * 返回按占比从高到低排列的十六进制颜色。近似重复的颜色会被丢弃，
 * 因此单色或低饱和的照片可能少于 `count` 个。
 */
export function extractPalette(pixels: Uint8ClampedArray, count = PALETTE_SIZE): string[] {
  const histogram = buildHistogram(pixels);
  if (histogram.length === 0) {
    return [];
  }

  let buckets: ColorEntry[][] = [histogram];
  // 前一半切分按像素数走，把大色块先分开；剩下按色彩跨度细分，避免少量杂色挤掉主色
  const splitsByCount = Math.ceil((count - 1) / 2);

  for (let step = 0; step < count - 1; step += 1) {
    const byCount = step < splitsByCount;
    let targetIndex = -1;
    let bestScore = 0;

    buckets.forEach((bucket, index) => {
      if (bucket.length < 2) {
        return;
      }

      const score = byCount ? totalCount(bucket) : channelSpan(bucket);
      if (score > bestScore) {
        bestScore = score;
        targetIndex = index;
      }
    });

    if (targetIndex < 0) {
      break;
    }

    const split = splitBucket(buckets[targetIndex]);
    if (!split) {
      break;
    }

    buckets = [...buckets.slice(0, targetIndex), ...split, ...buckets.slice(targetIndex + 1)];
  }

  const colors: string[] = [];
  const picked: ColorEntry[] = [];

  for (const bucket of buckets.sort((a, b) => totalCount(b) - totalCount(a))) {
    const color = bucketColor(bucket);
    if (picked.some((item) => colorDistance(item, color) < MIN_COLOR_DISTANCE)) {
      continue;
    }

    picked.push(color);
    colors.push(toHex(color));

    if (colors.length >= count) {
      break;
    }
  }

  return colors;
}

function decodeImage(image: HTMLImageElement): Promise<void> {
  return new Promise((resolve) => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => resolve(), { once: true });
  });
}

/**
 * 读取一张照片的主题色。
 *
 * 走「fetch 字节 → blob URL → 画布」，与快照前的降采样同一条路径，
 * 因此不会污染画布、也不依赖同源。返回空数组表示这张照片提取不出颜色；
 * 读取或解码失败则抛出，由调用方决定如何降级。
 */
export async function readPhotoPalette(src: string, count = PALETTE_SIZE): Promise<string[]> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`读取图片失败: ${response.status}`);
  }

  const objectUrl = URL.createObjectURL(await response.blob());

  try {
    const image = new Image();
    image.src = objectUrl;
    await decodeImage(image);

    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error('图片无法解码');
    }

    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('无法创建画布上下文');
    }

    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

    return extractPalette(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data, count);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
