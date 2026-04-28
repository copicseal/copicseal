import type { Tags as RawTags } from 'exifreader';
import { ZeroPerl } from '@6over3/zeroperl-ts';
import zeroperl from '@6over3/zeroperl-ts/zeroperl.wasm?url';
// import piexif from 'piexifjs';
import { parseMetadata } from '@uswriting/exiftool';
import dayjs from 'dayjs';

import customParseFormat from 'dayjs/plugin/customParseFormat';
// import Exif from 'exif-js'
import ExifReader from 'exifreader';

export { type ExifDict, ImageIFD, TAGS } from 'piexifjs';
// export type ExifDict = piexif.ExifDict

dayjs.extend(customParseFormat);
// window.n = window.n ?? undefined

export async function getExif(file: File) {
  try {
    await ZeroPerl.create({
      fetch: () => fetch(zeroperl),
      stdout: data => console.log(data),
    });
    // 暂时注释掉 ExifTool，使用 ExifReader 确保应用正常运行
    const result = await parseMetadata(file, {
      args: ['-json', '-n'],
      transform: data => JSON.parse(data),
    });
    console.log(result);
    if (result.success) {
      const exifData = result.data[0]; // ExifTool returns an array
      return formatExifFromExifTool(exifData);
    }
    else {
      console.error('Error reading EXIF with ExifTool:', result.error);
      // Fallback to ExifReader if ExifTool fails
      return formatExif(await ExifReader.load(file));
    }
  }
  catch (error) {
    console.error('Error reading EXIF:', error);
    // Fallback to ExifReader if any error occurs
    return formatExif(await ExifReader.load(file));
  }
}

export async function getExifWithExifTool(file: File) {
  const result = await parseMetadata(file, {
    args: ['-json', '-n'],
    transform: data => JSON.parse(data),
  });

  console.log(result);

  if (result.success) {
    return result.data;
  }
  else {
    console.error('Error reading EXIF with ExifTool:', result.error);
    return null;
  }
}

const exifKeyFormatter: Record<keyof RawTags, (exif: any) => Tags> = {
  'CameraOrientation': (exif) => {
    return {
      Orientation: exif.CameraOrientation || 0,
    };
  },
  'Image Width': (exif) => {
    const val = +(exif['Image Width']?.value || 0);
    if (exif.Orientation?.value && +exif.Orientation.value > 4) {
      return { ImageHeight: val };
    }
    return { ImageWidth: val };
  },
  'Image Height': (exif) => {
    const val = +(exif['Image Height']?.value || 0);
    if (exif.Orientation?.value && +exif.Orientation.value > 4) {
      return { ImageWidth: val };
    }
    return { ImageHeight: val };
  },
  'PixelXDimension': (exif) => {
    const val = +(exif['Image Width']?.value || exif.PixelXDimension?.value || 0);
    if (exif.Orientation?.value && +exif.Orientation.value > 4) {
      return { ImageHeight: val };
    }
    return { ImageWidth: val };
  },
  'PixelYDimension': (exif) => {
    const val = +(exif['Image Height']?.value || exif.PixelYDimension?.value || 0);
    if (exif.Orientation?.value && +exif.Orientation.value > 4) {
      return { ImageWidth: val };
    }
    return { ImageHeight: val };
  },
  'FocalLength': (exif) => {
    return {
      FocalLength: exif.FocalLength?.description.replace(' ', ''),
    };
  },
  'DateTimeOriginal': (exif) => {
    return {
      DateTimeOriginal: dayjs(exif.DateTimeOriginal?.description, 'YYYY:MM:DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'),
    };
  },
};

export const exifPrimaryKeys = [
  'ImageWidth',
  'ImageHeight',
  'Make',
  'Model',
  'Software',
  'DateTimeOriginal',
  'LensModel',
  'FocalLength',
  'FNumber',
  'ExposureTime',
  'ExposureBiasValue',
  'ExposureMode',
  'WhiteBalance',
  'MeteringMode',
  'ISOSpeedRatings',
] as const;

export type ExifPrimaryKeys = (typeof exifPrimaryKeys)[number];

export type Tags = {
  [key in ExifPrimaryKeys]?: string | number;
} & {
  [key: string]: string | number | undefined;
};

function formatExif(exif: RawTags): Tags {
  const tags: Tags = {};
  for (const key in exif) {
    const val = exif[key];

    if (typeof val === 'string') {
      tags[key] = val;
    }
    else if (typeof val.value === 'number') {
      tags[key] = val.value;
    }
    else if (val.description) {
      tags[key] = val.description;
    }
  }
  for (const key in exif) {
    if (exifKeyFormatter[key]) {
      Object.assign(tags, exifKeyFormatter[key](exif));
    }
  }

  return tags;
}

function formatExifFromExifTool(exifData: any): Tags {
  const tags: Tags = {
    ...exifData,
  };

  // 映射 ExifTool 返回的字段到我们的 Tags 格式
  if (exifData) {
    // 日期时间
    if (exifData.DateTimeOriginal) {
      tags.DateTimeOriginal = dayjs(exifData.DateTimeOriginal, 'YYYY:MM:DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
    }
    if (exifData.FocalLength) {
      // 避免浮点尾差（如 35.0000001），统一保留到合理展示精度
      tags.FocalLength = `${parseFloat(Number(exifData.FocalLength).toFixed(2))}mm`;
    }
    if (exifData.ISO) {
      tags.ISOSpeedRatings = exifData.ISO;
    }
    if (exifData.FNumber) {
      // 光圈值同样做精度收敛，防止出现超长小数
      tags.FNumber = `f/${parseFloat(Number(exifData.FNumber).toFixed(2))}`;
    }

    tags.Orientation = exifData.Orientation || exifData.CameraOrientation || 0;

    if (tags.ExposureTime && Number(tags.ExposureTime) < 1) {
      // 小于 1 秒的快门使用 1/x 形式，并对分母做精度收敛
      const denominator = 1 / Number(tags.ExposureTime);
      tags.ExposureTime = `1/${parseFloat(denominator.toFixed(2))}`;
    } else if (tags.ExposureTime) {
      // 大于等于 1 秒时按秒数输出，避免浮点噪声
      tags.ExposureTime = parseFloat(Number(tags.ExposureTime).toFixed(2)).toString();
    }

    // 处理方向
    if (tags.Orientation && +tags.Orientation > 4) {
      // 交换宽高
      const temp = tags.ImageWidth;
      tags.ImageWidth = tags.ImageHeight;
      tags.ImageHeight = temp;
    }
  }

  return tags;
}
