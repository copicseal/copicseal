import { useMemo } from 'react';
import type { TemplateInjectedProps } from '@/features/template/templates';
import type { ExifData } from '@/platform';
import { DEFAULT_TEMPLATE_ID, getBuiltinTemplateById, normalizeParams } from './template-registry';

interface TemplateRuntimeProps {
  templateId?: string;
  photoUrl: string;
  exif: ExifData | null;
  /** 用户当前调整的参数；渲染前会按该模板自己的 schema 归一化 */
  params?: Record<string, unknown>;
}

/**
 * 模板运行入口。
 *
 * 只做两件事：注入框架输入（`photoUrl` / `exif`），以及按模板自己的 schema
 * 把用户参数兜底归一化，确保模板组件永远拿到完整、合法的参数。
 */
export function TemplateRuntime({ templateId, photoUrl, exif, params }: TemplateRuntimeProps) {
  const template =
    getBuiltinTemplateById(templateId ?? DEFAULT_TEMPLATE_ID) ??
    getBuiltinTemplateById(DEFAULT_TEMPLATE_ID);

  const resolvedParams = useMemo(
    () => (template ? normalizeParams(template.schema, params) : {}),
    [template, params],
  );

  if (!template) {
    return null;
  }

  const injected: TemplateInjectedProps = { photoUrl, exif };

  return <>{template.render({ ...injected, ...resolvedParams })}</>;
}
