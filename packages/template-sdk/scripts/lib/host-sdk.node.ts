import * as React from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { defineTemplate } from '@/features/template/templates/define-template';
import {
  EXIF_TEXT_VARIABLES,
  formatExifText,
} from '@/features/template/templates/format-exif-text';
import { useImageAspect } from '@/features/template/templates/use-image-aspect';

export { renderToStaticMarkup } from 'react-dom/server';

export interface NodeHostSdkOptions {
  registryId?: string;
  templateId?: string;
  resolveAsset?: (path: string) => string;
}

/**
 * Node 侧的精简宿主 SDK。
 *
 * 只用于**校验脚本与冒烟渲染**（不参与浏览器预览）：
 * - React / jsx 运行时来自仓库真实依赖，保证与模板里的 hooks 是同一份实例；
 * - `formatExifText` / `useImageAspect` / `defineTemplate` 直接用宿主实现；
 * - 品牌工具里 `brand.ts` 用了 Vite 的 `import.meta.glob`（esbuild 不支持），
 *   因此这里退化为只做去空格，Logo 返回 null —— 品牌展示由浏览器预览负责验证。
 */
export function createNodeHostSdk(options: NodeHostSdkOptions = {}) {
  return {
    abi: 1 as const,
    reactMajor: 19,
    React,
    jsx,
    jsxs,
    Fragment,
    defineTemplate,
    formatExifText,
    EXIF_TEXT_VARIABLES,
    normalizeBrand: (make?: string | null) => (make ?? '').trim(),
    normalizeModelName: (model?: string | null) => (model ?? '').trim(),
    getBrandLogoSvg: (_make?: string | null, _model?: string | null) => null,
    getBrandLogoUrl: (_make?: string | null, _model?: string | null) => null,
    useImageAspect,
    resolveAsset: options.resolveAsset ?? ((path: string) => path),
    registryId: options.registryId ?? 'local',
    templateId: options.templateId ?? 'unknown',
  };
}
