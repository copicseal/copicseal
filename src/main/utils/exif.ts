import { app } from 'electron';

export function mergeExif(target: Record<string, any>, exif: Record<string, any>) {
  const exifData: Record<string, any> = { };
  // 复制所有原图的 EXIF 数据
  Object.assign(exifData, exif);

  const exifKeyMap: Record<string, string | RegExp | ((data: Record<string, any>) => string)> = {
    ISO: 'ISOSpeedRatings',
    FNumber: /^f\/(\d+)$/,
  };

  Object.keys(exifKeyMap).forEach((key) => {
    const map = exifKeyMap[key];
    if (typeof map === 'string') {
      exifData[key] = exif[map];
    }
    else if (map instanceof RegExp) {
      const v = exif[key]?.match(map)?.[1];
      exifData[key] = v;
    }
    else {
      exifData[key] = map(exif);
    }
  });

  // 只移除尺寸、方向、缩略图这类不应写入的字段
  const removeExifKeys = [
    // 尺寸类
    'ImageWidth',
    'ImageHeight',
    'ExifImageWidth',
    'ExifImageHeight',
    'PixelXDimension',
    'PixelYDimension',

    // 方向（避免旋转错误）
    'Orientation',

    // 缩略图（避免体积增大或写入错误）
    'ThumbnailImage',
    'ThumbnailLength',
    'ThumbnailOffset',

    // 某些解析器会把 JPEG 图片尺寸冗余放在这里
    'JPEGInterchangeFormat',
    'JPEGInterchangeFormatLength',
  ];

  removeExifKeys.forEach(k => delete exifData[k]);

  const appVersion = app.getVersion();

  Object.assign(target, {
    ...exifData,
    Software: `Copicseal v${appVersion}`,
  });
}
