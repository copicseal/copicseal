export type CollageAspectPreset = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '16:10' | 'custom';

export type CollageExportFormat = 'png' | 'jpeg';

export type CollageExportQuality = 'standard' | 'high' | 'ultra';

export type CollageAnnotationType = 'text' | 'arrow' | 'rect' | 'circle';

export interface CollageLayoutSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CollageLayout {
  id: string;
  name: string;
  count: number;
  group: string;
  slots: CollageLayoutSlot[];
}

export interface CollageSlotState {
  photoId: string | null;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  borderRadius: number | null;
}

export interface CollageCanvasState {
  aspectPreset: CollageAspectPreset;
  customRatioWidth: number;
  customRatioHeight: number;
  backgroundColor: string;
  backgroundImage: string | null;
  gap: number;
  padding: number;
  borderRadius: number;
  shadow: number;
}

export interface CollageTextAnnotation {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  text: string;
  fontSize: number;
}

export interface CollageArrowAnnotation {
  id: string;
  type: 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  strokeWidth: number;
}

export interface CollageShapeAnnotation {
  id: string;
  type: 'rect' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  strokeWidth: number;
}

export type CollageAnnotation =
  | CollageTextAnnotation
  | CollageArrowAnnotation
  | CollageShapeAnnotation;

export interface CollageExportState {
  format: CollageExportFormat;
  quality: CollageExportQuality;
}

export interface CollagePresentState {
  layoutId: string;
  canvas: CollageCanvasState;
  exportSettings: CollageExportState;
  slotItems: CollageSlotState[];
  annotations: CollageAnnotation[];
}
