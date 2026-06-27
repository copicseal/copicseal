import type { ExifData } from '@/api';

export interface TemplateProps {
  photoUrl: string;
  exif: ExifData | null;
  orientation: 'auto' | 'horizontal' | 'vertical';
  margin: number;
  fontScale: number;
  primaryColor: string;
  borderColor: string;
  textLine1: string;
  textLine2: string;
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  tags?: string[];
}

export type TemplateComponent = React.ComponentType<TemplateProps>;

export interface BuiltinTemplate {
  meta: TemplateMeta;
  component: TemplateComponent;
}
