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
