import type { CSSProperties } from 'vue';

interface ImageFilter {
  type: 'blur' | 'brightness' | 'contrast' | 'grayscale' | 'hue-rotate' | 'invert' | 'saturate';
  value: number | string;
}

type Style = CSSProperties & {
  light?: CSSProperties;
  dark?: CSSProperties;
  horizontal?: CSSProperties;
  vertical?: CSSProperties;
  order?: ('light' | 'dark' | 'horizontal' | 'vertical')[];
};

interface Field {
  type: 'text' | 'image' | 'brand' | 'rect' | 'main-image' | 'container';
  style?: Style;
  children?: Field[];
}

export interface Output {
  scale: number;
  type?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  width: number;
  height: number;
  isOriginal?: boolean;
}

export interface Settings {
  background: {
    mode: 'none' | 'color' | 'image';
    padding?: [number, number];
    color?: {
      rgba: string;
    };
    image?: {
      customUrl?: string;
      filters?: ImageFilter[];
    };
    style?: Style;
  };
  outputs: Output[];
  outputPath?: string;
}

export interface SettingsField {
  type: 'text' | 'image' | 'brand' | 'rect' | 'main-image' | 'container';
  label?: string;
  description?: string;
  expression?: string;
  style?: Style;
  children?: SettingsField[];
}

type ExportPreset = Output & {
  id: string;
  name: string;
};

interface TemplatePreset {
  id: string; // 唯一 ID，比如 uuid 或自定义名称
  name: string; // 展示名称，比如“微博图·白边”
  templateId: string; // 所基于的原始模板 ID（如 TplDefault）
  templateProps?: Record<string, any>; // 模板参数
  background?: Settings['background']; // 背景设置
  fontFamily?: string; // 使用字体
}

interface UserDevice {
  id: string;
  name: string;
  type: 'camera' | 'lens';
  exif: Record<string, string>;
}

export interface AppConfig {
  output: {
    presets: Output[]; // 用户配置的常用导出尺寸
    defaultPath: string; // 默认导出路径
  };
  templatePresets: TemplatePreset[];
  fonts: {
    favorites: string[]; // 用户收藏的字体
    defaultFont: string;
  };
  exportPresets: ExportPreset[]; // 导出尺寸预设（带名称）
  templateList: {
    enabled: {
      templateId: string;
      name: string;
    }[]; // 启用的模板 ID
    installedDir: string; // 本地模板存储路径
    remoteRegistry: string[]; // 模板远程仓库地址（支持多个）
  };
  userDevices: UserDevice[];
}
