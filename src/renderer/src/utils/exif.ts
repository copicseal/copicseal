import type { Tags as RawTags } from 'exifreader';
// import Exif from 'exif-js'
import ExifReader from 'exifreader';
// import piexif from 'piexifjs';
export { type ExifDict, ImageIFD, TAGS } from 'piexifjs';
// export type ExifDict = piexif.ExifDict

// window.n = window.n ?? undefined

export async function getExif(file: File) {
  // console.log(ExifReader.load(file))
  // console.log(piexif.load(Buffer.from(await file.arrayBuffer()).toString('binary')))

  // const reader = new FileReader()
  // // return new Promise<piexif.ExifDict>((resolve) => {
  //   reader.onload = (e) => {
  //     const data = e.target!.result as string
  //     // console.log(data)

  //     const exifData = piexif.load(data)
  //     // resolve(exifData)
  //     console.log(exifData);

  //   }
  //   reader.readAsDataURL(file)
  // })
  return formatExif(await ExifReader.load(file));

  // return new Promise<Metadata | undefined>((resolve) => {
  //   const res = Exif.getData(file as any, function () {
  //     // eslint-disable-next-line ts/ban-ts-comment
  //     // @ts-expect-error
  //     const res = Exif.getAllTags(this)
  //     resolve(res)
  //   })
  //   !res && resolve(undefined)
  // })
}

const exifKeyFormatter: Record<keyof RawTags, (exif: RawTags) => Tags> = {
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
  'FocalLength': (exif) => {
    return {
      FocalLength: exif.FocalLength?.description.replace(' ', ''),
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
