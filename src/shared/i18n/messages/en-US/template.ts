/**
 * template 命名空间的文案（en-US）。
 *
 * 约定见 src/shared/i18n/README.md：以 zh-CN 为真相来源，en-US 必须与它同型；
 * 代码注释不翻译，插值写成花括号包住的参数名。
 *
 * 覆盖 `src/features/template/**`：导出面板、导出档位与预设菜单见 templateExport；
 * `meta.*` 是模板定义里的元数据（显示名、参数标签与选项），由 `nameKey` /
 * `labelKey` 这类可选字段引用，模板作者不写 key 时回落到定义里的字面量。
 */
import type { Messages } from '../../translate';

export const template: Messages['template'] = {
  header: {
    title: 'Border watermark',
    description: 'Template rendering and export',
  },
  actions: {
    exportCurrent: 'Export current',
    exportBatch: 'Export all',
  },
  assets: {
    title: 'Photos',
    expand: 'Expand photo panel',
    collapse: 'Collapse photo panel',
    switchTo: 'Switch to {name}',
    importFolder: 'Import folder',
    importPhoto: 'Import photos',
    generatingThumbnail: 'Generating thumbnail',
    remove: 'Remove photo',
    removeAria: 'Remove {name}',
    importing: 'Importing {current} / {total}',
    importingWithName: 'Importing {current} / {total} · {name}',
    preparingImport: 'Preparing import...',
    preparingImportWithName: 'Preparing import... · {name}',
  },
  empty: {
    dropHint: 'Drop photos here to get started',
    importing: 'Importing photos…',
    importingHint: 'Photos join the list as they arrive',
    importHint: 'or import local photos from the top right',
    properties: 'Import a photo to adjust its template, parameters, background and export presets.',
  },
  selector: {
    title: 'Template',
    globalFont: 'Global font',
    noFonts:
      'No fonts imported yet; add them from online, local or file sources in Settings → Fonts.',
    fontHint: 'Only imported fonts are listed; adjust them in Settings → Fonts.',
    placeholder: 'Select a template',
  },
  propsPanel: {
    on: 'On',
    off: 'Off',
  },
  preview: {
    emptyTitle: 'Border watermark preview',
    emptyDescription: 'Pick a photo and the real template render shows up here.',
    exporting: 'Exporting…',
    zoomFit: 'Fit',
  },
  palette: {
    title: 'Photo palette',
    hint: 'Click to apply',
    extracting: 'Extracting…',
    failed: 'Could not extract a palette from this photo; pick a color manually instead.',
    applyAria: 'Apply theme color {color}',
  },
  props: {
    resetHint: 'Double-click to reset',
    expandEditor: 'Expand editor',
    variablesTitle: 'Insert a variable',
    variablesHint: 'Click to insert at the caret',
    editorDone: 'Done',
    sliderHint: 'Drag to adjust, double-click to reset',
  },
  exifFields: {
    hint: 'Fields this template uses. Edit them directly, or use the arrow to restore the photo value.',
    emptyTemplate: 'This template does not use any EXIF variable.',
    emptyPhoto: 'Select a photo to edit the EXIF fields this template uses.',
    resetAll: 'Restore all',
    resetField: 'Restore photo value',
    resetFieldAria: 'Restore “{name}” to the photo value',
    device: {
      title: 'My gear',
      cameraLabel: 'Camera',
      lensLabel: 'Lens',
      none: 'None',
      fillEmpty: 'Fill blanks only',
      applyCurrent: 'Apply to this photo',
      applyCurrentShort: 'Apply here',
      applyAll: 'Apply to all',
      applyAllShort: 'Apply to all',
      applied: 'Written to {count} photos',
      nothingToApply: 'Nothing to fill',
      applyFailed: 'Could not apply the gear profile',
      saveAs: 'Save as gear:',
      saveCamera: 'camera profile',
      saveLens: 'lens profile',
      saved: 'Saved “{name}” — edit it in Settings → Gear',
      saveFailed: 'Could not save the gear profile',
      untitled: 'Untitled gear',
      nothingToSave: 'This photo has no shooting data to save',
      emptyHint: 'No gear profiles yet — add one in Settings → Gear to apply it in one click.',
    },
  },
  exifCard: {
    loading: 'Reading EXIF...',
    noExif: 'No EXIF data found for this photo.',
    empty: 'Import a photo to see its shooting data here.',
    enum: {
      orientation: {
        normal: 'Normal',
        flipHorizontal: 'Mirrored',
        rotate180: 'Rotated 180°',
        flipVertical: 'Upside down',
        transpose: 'Transposed',
        rotate90: 'Rotated 90° CW',
        transverse: 'Mirrored + rotated',
        rotate270: 'Rotated 90° CCW',
      },
      exposureProgram: {
        notDefined: 'Not defined',
        manual: 'Manual',
        normal: 'Program AE',
        aperturePriority: 'Aperture priority',
        shutterPriority: 'Shutter priority',
        creative: 'Depth of field',
        action: 'Action',
        portrait: 'Portrait',
        landscape: 'Landscape',
      },
      flash: {
        notFired: 'Not fired',
        fired: 'Fired',
        firedNoReturn: 'Fired, no return detected',
        firedNoReturnAuto: 'Fired, auto, no return',
        firedAuto: 'Auto flash',
        notFiredAuto: 'Not fired, auto',
        notFiredAutoOff: 'Not fired, auto off',
        firedAutoOff: 'Fired, auto off',
        notFiredNoFunction: 'No flash function',
      },
    },
    field: {
      camera: 'Camera',
      lens: 'Lens',
      shootingParams: 'Shooting settings',
      dateTaken: 'Taken at',
      exposureCompensation: 'Exposure comp.',
      whiteBalance: 'White balance',
      meteringMode: 'Metering',
      dimensions: 'Size',
      gps: 'GPS',
      gpsAltitude: 'Altitude',
      focalLength35mm: '35mm equiv.',
      maxAperture: 'Max aperture',
      orientation: 'Orientation',
      exposureProgram: 'Exposure program',
      flash: 'Flash',
      software: 'Software',
      artist: 'Artist',
      copyright: 'Copyright',
      bodySerial: 'Body serial',
      lensSerial: 'Lens serial',
    },
  },
  panel: {
    templateParams: {
      title: 'Template parameters',
      description:
        'Every template has its own options. Switching templates resets them to the new template defaults.',
    },
    background: {
      title: 'Background',
      description: 'Starting values follow the template; tweak them for the current photo.',
    },
    export: {
      title: 'Export',
      description:
        'Each preset stores one set of dimensions and quality options. Without a background the target size is applied proportionally, so a square canvas with 1280×720 exports as 720×720; with a background the output is exactly the size you set. Once saved as the default, photos imported later use these presets.',
    },
    exifFields: {
      title: 'EXIF fields',
      description:
        'Shooting parameters used by this template. Edit them directly; what you type is what renders.',
    },
    exif: {
      title: 'EXIF',
    },
  },
  applyToOthers: {
    template: 'Apply template and parameters to others',
    background: 'Apply background to others',
    presets: 'Apply export presets to others',
    label: '{label} ({count} photos)',
  },
  applyScope: {
    template: 'template and parameters',
    background: 'background',
    presets: 'export presets',
  },
  toast: {
    savedAsDefault: 'Saved as the default preset; photos imported later will use it.',
    saveDefaultFailed: 'Could not save the default preset',
    saveDefaultFontFailed: 'Could not save the default font',
    appliedToOthers: 'Applied {scope} to the other {count} photos',
    skippedIncomplete: 'Skipped {count} photos with incomplete presets',
  },
  background: {
    mode: {
      label: 'Background mode',
      description:
        'Without a background the frame hugs the template; with one the frame matches the target size and the template sits inside it.',
      option: {
        none: 'No background',
        color: 'Solid color',
        image: 'Blurred photo',
      },
    },
    color: {
      label: 'Background color',
    },
    blur: {
      label: 'Blur strength',
      description: 'Ratio of the frame width.',
    },
    brightness: {
      label: 'Blurred photo brightness',
    },
    paddingHorizontal: {
      label: 'Horizontal padding',
      description: 'Ratio of the frame width.',
    },
    paddingVertical: {
      label: 'Vertical padding',
      description: 'Also relative to the frame width, so it does not depend on frame height.',
    },
  },
  preset: {
    templateLine: 'Template: {name}',
    paramsTitle: 'Template parameters:',
    backgroundTitle: 'Background:',
    backgroundModeLine: '- Mode: {mode}',
    fieldLine: '- {label}: {value}',
    nameLength: 'The name must be {min} - {max} characters',
    limitReached: 'You can save at most {count} template presets; delete one first',
    saveFailed: 'Could not save the template preset',
  },
  meta: {
    exifVariable: {
      make: 'Camera brand',
      model: 'Camera model',
      lensModel: 'Lens model',
      focalLength: 'Focal length',
      fNumber: 'Aperture',
      exposureTime: 'Shutter speed',
      iso: 'ISO',
      latitude: 'Latitude',
      longitude: 'Longitude',
      dateTaken: 'Taken at',
    },
    minimal: {
      name: 'Minimal',
      description: 'Clean white layout that keeps only the photo and two lines of EXIF text.',
      tag: {
        minimal: 'Minimal',
        exif: 'EXIF',
      },
      option: {
        orientation: {
          label: 'Layout direction',
          description: 'Auto picks the text alignment from the photo aspect ratio.',
          auto: 'Auto',
          horizontal: 'Horizontal',
          vertical: 'Vertical',
        },
        fontScale: {
          label: 'Font scale',
          description: 'Multiplier on top of the template base font size.',
        },
        textColor: {
          label: 'Text color',
        },
        textLine1: {
          label: 'Text 1',
        },
        textLine2: {
          label: 'Text 2',
        },
      },
    },
    film: {
      name: 'Film',
      description: 'Wide film-style border with a corner label and shooting info in the footer.',
      tag: {
        film: 'Film',
        frame: 'Border',
      },
      option: {
        frameWidth: {
          label: 'Border width',
          description: 'Ratio of the canvas width; 0.05 is about 5% of the canvas width.',
        },
        frameColor: {
          label: 'Border color',
        },
        textColor: {
          label: 'Text color',
        },
        fontScale: {
          label: 'Font scale',
          description: 'Multiplier on top of the template base font size.',
        },
        cornerLabel: {
          label: 'Corner label',
        },
        caption: {
          label: 'Footer text',
        },
      },
    },
    whiteframe: {
      name: 'White frame',
      description:
        'White card frame with the brand logo, model and two EXIF lines below the photo.',
      tag: {
        frame: 'Frame',
        brand: 'Brand',
        infoBar: 'Info bar',
      },
      option: {
        layout: {
          label: 'Arrangement',
          description: 'Auto moves the info bar beside the photo for portrait orientations.',
          auto: 'Auto',
          vertical: 'Vertical (info below)',
          horizontal: 'Horizontal (info beside)',
        },
        borderPadding: {
          label: 'Frame padding',
          description: 'Ratio of the canvas width.',
        },
        borderColor: {
          label: 'Frame color',
        },
        fontScale: {
          label: 'Text scale',
        },
        textColor: {
          label: 'Text color',
        },
        logoColorAuto: {
          label: 'Logo follows text color',
          description: 'Uses the monochrome logo in the same color as the text.',
        },
        logoShadow: {
          label: 'Logo shadow',
        },
        shadowBlur: {
          label: 'Frame shadow blur',
          description: 'Ratio of the canvas width; 0 means no shadow.',
        },
        shadowColor: {
          label: 'Frame shadow color',
        },
        shadowOpacity: {
          label: 'Frame shadow opacity',
        },
        text1: {
          label: 'Trip text',
        },
        text2: {
          label: 'Date text',
        },
      },
    },
    rounded: {
      name: 'Rounded',
      description:
        'Borderless rounded photo with the brand logo, model and two EXIF lines centered below.',
      tag: {
        borderless: 'Borderless',
        rounded: 'Rounded',
        brand: 'Brand',
      },
      option: {
        imageRadius: {
          label: 'Image corner radius',
          description: 'Ratio of the canvas width; the old 0.1rem works out to about 0.015.',
        },
        shadowBlur: {
          label: 'Image shadow blur',
          description:
            'Ratio of the canvas width; 0 means no shadow. The old 0.2rem works out to about 0.03.',
        },
        shadowColor: {
          label: 'Image shadow color',
        },
        shadowOpacity: {
          label: 'Image shadow opacity',
        },
        fontScale: {
          label: 'Text scale',
          description: 'Multiplier on top of the template base font size; the logo scales with it.',
        },
        textColor: {
          label: 'Text color',
        },
        text1: {
          label: 'Text 1',
          description:
            'Supports EXIF variables such as {FocalLength}, {FNumber}, {ExposureTime} and {ISO}.',
        },
        text2: {
          label: 'Text 2',
          description: 'Falls back to the capture time when left empty.',
        },
        logoColorAuto: {
          label: 'Logo follows text color',
          description: 'Uses the monochrome logo in the same color as the text.',
        },
        logoShadow: {
          label: 'Logo shadow',
          description: 'Adds an outline shadow in the text color to color logos only.',
        },
      },
    },
    overlay: {
      name: 'Overlay',
      description:
        'Prints the brand logo, model and shooting data over the photo with nine-grid placement and four-way offsets.',
      tag: {
        overlay: 'Overlay',
        grid: 'Nine-grid',
        brand: 'Brand',
      },
      option: {
        position: {
          label: 'Text position',
          description: 'Nine-grid placement decides where the info block sticks on the photo.',
          topLeft: 'Top left',
          top: 'Top',
          topRight: 'Top right',
          left: 'Left',
          center: 'Center',
          right: 'Right',
          bottomLeft: 'Bottom left',
          bottom: 'Bottom',
          bottomRight: 'Bottom right',
        },
        offsetTop: {
          label: 'Top offset',
          description: 'Applies when stuck to the top edge; ratio of the canvas width.',
        },
        offsetLeft: {
          label: 'Left offset',
          description: 'Applies when stuck to the left edge; ratio of the canvas width.',
        },
        offsetRight: {
          label: 'Right offset',
          description: 'Applies when stuck to the right edge; ratio of the canvas width.',
        },
        offsetBottom: {
          label: 'Bottom offset',
          description: 'Applies when stuck to the bottom edge; ratio of the canvas width.',
        },
        layout: {
          label: 'Layout',
          description:
            'Auto picks from the photo aspect ratio: side by side for landscape, stacked for portrait.',
          auto: 'Auto',
          vertical: 'Vertical (stacked)',
          horizontal: 'Horizontal (side by side)',
        },
        gapScale: {
          label: 'Layout gap',
          description: 'Multiplier on top of the template base gap; 0 means no gap.',
        },
        fontScale: {
          label: 'Text scale',
          description: 'Multiplier on top of the template base font size.',
        },
        textColor: {
          label: 'Text color',
        },
        logoColorAuto: {
          label: 'Automatic logo color',
          description: 'Uses the monochrome logo in the same color as the text.',
        },
        logoShadow: {
          label: 'Logo shadow',
          description:
            'Color logos blend into light photos; a shadow around them keeps them readable.',
        },
        shadowBlur: {
          label: 'Shadow blur',
          description: 'Ratio of the canvas width; 0 means no shadow.',
        },
        shadowColor: {
          label: 'Shadow color',
        },
        shadowOpacity: {
          label: 'Shadow opacity',
        },
        text1: {
          label: 'Text 1',
          description: 'Parameter text below the model; supports {variable} placeholders.',
        },
        text2: {
          label: 'Text 2',
          description: 'Date text at the bottom; falls back to the capture time when empty.',
        },
      },
    },
    watermark: {
      name: 'Tiled watermark',
      description:
        'The photo fills the canvas with a tiled watermark whose angle and opacity you can adjust.',
      tag: {
        watermark: 'Watermark',
        tiled: 'Tiled',
      },
      option: {
        text: {
          label: 'Watermark text',
          description:
            'Supports EXIF variables such as {Model}; leave it empty to skip the watermark layer.',
        },
        textColor: {
          label: 'Text color',
        },
        textOpacity: {
          label: 'Text opacity',
          description:
            '0 is fully transparent and 1 fully opaque; adjust it separately from the text color.',
        },
        rotate: {
          label: 'Text angle',
          description: 'In degrees; -45 tilts the same way as the old 3.15×100 value.',
        },
        fontSize: {
          label: 'Text size',
          description: 'Ratio of the tile width; 0.2 is about 20% of the tile width.',
        },
        tileWidth: {
          label: 'Tile width',
          description: 'Ratio of the canvas width; 0.15 is roughly the old 1rem tile.',
        },
        tileHeight: {
          label: 'Tile height',
          description:
            'Ratio of the canvas width; together with the tile width it sets the tiling density.',
        },
      },
    },
  },
};
