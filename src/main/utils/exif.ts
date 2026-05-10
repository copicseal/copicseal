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

    // 文件系统字段
    'SourceFile',
    'FileName',
    'Directory',
    'FileSize',
    'FileModifyDate',
    'FileAccessDate',
    'FileInodeChangeDate',
    'FilePermissions',
    'FileType',
    'FileTypeExtension',
    'MIMEType',

    // 工具字段
    'ExifToolVersion',

    // ICC 配置文件字段
    'ProfileCMMType',
    'ProfileVersion',
    'ProfileClass',
    'ColorSpaceData',
    'ProfileConnectionSpace',
    'ProfileDateTime',
    'ProfileFileSignature',
    'PrimaryPlatform',
    'CMMFlags',
    'DeviceManufacturer',
    'DeviceModel',
    'DeviceAttributes',
    'RenderingIntent',
    'ConnectionSpaceIlluminant',
    'ProfileCreator',
    'ProfileID',
    'ProfileCopyright',
    'ProfileDescription',
    'MediaWhitePoint',
    'MediaBlackPoint',
    'RedMatrixColumn',
    'GreenMatrixColumn',
    'BlueMatrixColumn',
    'DeviceMfgDesc',
    'DeviceModelDesc',
    'ViewingCondDesc',
    'ViewingCondIlluminant',
    'ViewingCondSurround',
    'ViewingCondIlluminantType',
    'Luminance',
    'MeasurementObserver',
    'MeasurementBacking',
    'MeasurementGeometry',
    'MeasurementFlare',
    'MeasurementIlluminant',
    'Technology',
    'RedTRC',
    'GreenTRC',
    'BlueTRC',

    // 二进制字段
    'PhotoshopThumbnail',

    // XMP/Camera Raw 字段
    'XMPToolkit',
    'CreatorTool',
    'MetadataDate',
    'LensDistortInfo',
    'LateralChromaticAberrationCorrectionAlreadyApplied',
    'DocumentID',
    'OriginalDocumentID',
    'InstanceID',
    'RawFileName',
    'Version',
    'ProcessVersion',
    'ColorTemperature',
    'Tint',
    'Exposure2012',
    'Contrast2012',
    'Highlights2012',
    'Shadows2012',
    'Whites2012',
    'Blacks2012',
    'Texture',
    'Clarity2012',
    'Dehaze',
    'Vibrance',
    'ParametricShadows',
    'ParametricDarks',
    'ParametricLights',
    'ParametricHighlights',
    'ParametricShadowSplit',
    'ParametricMidtoneSplit',
    'ParametricHighlightSplit',
    'SharpenRadius',
    'SharpenDetail',
    'SharpenEdgeMasking',
    'LuminanceSmoothing',
    'ColorNoiseReduction',
    'ColorNoiseReductionDetail',
    'ColorNoiseReductionSmoothness',
    'HueAdjustmentRed',
    'HueAdjustmentOrange',
    'HueAdjustmentYellow',
    'HueAdjustmentGreen',
    'HueAdjustmentAqua',
    'HueAdjustmentBlue',
    'HueAdjustmentPurple',
    'HueAdjustmentMagenta',
    'SaturationAdjustmentRed',
    'SaturationAdjustmentOrange',
    'SaturationAdjustmentYellow',
    'SaturationAdjustmentGreen',
    'SaturationAdjustmentAqua',
    'SaturationAdjustmentBlue',
    'SaturationAdjustmentPurple',
    'SaturationAdjustmentMagenta',
    'LuminanceAdjustmentRed',
    'LuminanceAdjustmentOrange',
    'LuminanceAdjustmentYellow',
    'LuminanceAdjustmentGreen',
    'LuminanceAdjustmentAqua',
    'LuminanceAdjustmentBlue',
    'LuminanceAdjustmentPurple',
    'LuminanceAdjustmentMagenta',
    'SplitToningShadowHue',
    'SplitToningShadowSaturation',
    'SplitToningHighlightHue',
    'SplitToningHighlightSaturation',
    'SplitToningBalance',
    'ColorGradeMidtoneHue',
    'ColorGradeMidtoneSat',
    'ColorGradeShadowLum',
    'ColorGradeMidtoneLum',
    'ColorGradeHighlightLum',
    'ColorGradeBlending',
    'ColorGradeGlobalHue',
    'ColorGradeGlobalSat',
    'ColorGradeGlobalLum',
    'AutoLateralCA',
    'LensProfileEnable',
  ];

  removeExifKeys.forEach(k => delete exifData[k]);

  const appVersion = app.getVersion();

  Object.assign(target, {
    ...exifData,
    Software: `Copicseal v${appVersion}`,
  });
}
