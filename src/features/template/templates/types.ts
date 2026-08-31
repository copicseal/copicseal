import type { ExifData } from '@/platform';

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

export type TemplateFieldType = 'number' | 'color' | 'select' | 'text';

export interface TemplateFieldOption {
  label: string;
  value: string;
}

export interface TemplateSchemaField {
  key: keyof Omit<TemplateProps, 'photoUrl' | 'exif'>;
  label: string;
  type: TemplateFieldType;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: TemplateFieldOption[];
}

export interface TemplateSchema {
  fields: TemplateSchemaField[];
  defaults: Omit<TemplateProps, 'photoUrl' | 'exif'>;
}

export interface BuiltinTemplate {
  meta: TemplateMeta;
  component: TemplateComponent;
  schema: TemplateSchema;
}
