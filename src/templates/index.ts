import { FramelessRound } from './FramelessRound';
import { FrameWhite } from './FrameWhite';
import { Minimal } from './Minimal';
import { Modern } from './Modern';
import { PsSplash } from './PsSplash';
import { RetroFilm } from './RetroFilm';
import type { TemplateComponent, TemplateMeta } from './types';

export interface TemplateEntry {
  meta: TemplateMeta;
  component: TemplateComponent;
}

export const BUILTIN_TEMPLATES: TemplateEntry[] = [
  {
    meta: { id: 'frame-white', name: '框架白边', description: '经典白色边框 + 相机参数' },
    component: FrameWhite,
  },
  {
    meta: { id: 'frameless-round', name: '无框圆角', description: '圆角照片 + 底部半透明信息栏' },
    component: FramelessRound,
  },
  {
    meta: { id: 'ps-splash', name: 'PS启动窗', description: 'Photoshop 风格深色窗口' },
    component: PsSplash,
  },
  {
    meta: { id: 'minimal', name: '极简', description: '右下角半透明参数水印' },
    component: Minimal,
  },
  {
    meta: { id: 'retro-film', name: '复古胶片', description: '暗色调 + 胶片齿孔边框' },
    component: RetroFilm,
  },
  {
    meta: { id: 'modern', name: '现代', description: '圆角卡片 + 右侧 ISO 徽章' },
    component: Modern,
  },
];

export function getTemplateById(id: string): TemplateEntry | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.meta.id === id);
}

export type { TemplateComponent, TemplateMeta, TemplateProps } from './types';
