import type { RemoteTemplateSdk } from '@copicseal/template-sdk';
import * as React from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import {
  getBrandLogoSvg,
  getBrandLogoUrl,
  normalizeBrand,
  normalizeModelName,
} from '@/features/template/templates/brand';
import { defineTemplate } from '@/features/template/templates/define-template';
import {
  EXIF_TEXT_VARIABLES,
  formatExifText,
} from '@/features/template/templates/format-exif-text';
import { useImageAspect } from '@/features/template/templates/use-image-aspect';

export interface HostSdkOptions {
  registryId: string;
  templateId: string;
  /** 清单里的 assets[].path → 可用 URL；预览的模板都是自包含的，默认原样返回 */
  resolveAsset?: (path: string) => string;
}

/**
 * 浏览器预览用的宿主 SDK。
 *
 * 与真实宿主不同的是：这里**不注入 Tauri 的下载/落盘能力**，只是把
 * 打包好的模板包当作本地文件载入。SDK 面本身与 docs/14 的契约一致，
 * 且各工具函数直接引用仓库 `src/` 的真实实现（不做任何复制）。
 */
export function createHostSdk({
  registryId,
  templateId,
  resolveAsset,
}: HostSdkOptions): RemoteTemplateSdk {
  return {
    abi: 1,
    reactMajor: Number(React.version.split('.')[0]),
    React,
    jsx,
    jsxs,
    Fragment,
    defineTemplate,
    formatExifText,
    EXIF_TEXT_VARIABLES,
    normalizeBrand,
    normalizeModelName,
    getBrandLogoSvg,
    getBrandLogoUrl,
    useImageAspect,
    resolveAsset: resolveAsset ?? ((path: string) => path),
    registryId,
    templateId,
  };
}

/** 预览页顺带暴露真实 React 版本，便于确认「注入的是宿主那一份」。 */
export const HOST_REACT_VERSION = React.version;
