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
  /** 用户选择的字体族；空串表示跟随模板自带的字体栈 */
  font?: string;
}

/**
 * 模板运行入口。
 *
 * 只做三件事：注入框架输入（`photoUrl` / `exif` / `font`），按模板自己的
 * schema 把用户参数兜底归一化，以及把最终字体挂在画布根上——模板里的
 * HTML 文本靠继承拿到它，不需要每个模板自己声明字体。
 */
export function TemplateRuntime({
  templateId,
  photoUrl,
  exif,
  params,
  font = '',
}: TemplateRuntimeProps) {
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

  // 用户选的字体优先；没选时用模板自己的字体栈，再没有就让画布继承外层
  const resolvedFont = font || template.fontDefaults || '';
  /**
   * 画布上写的字体栈。
   *
   * 整条栈末尾再补一个通用族：导出的快照是在独立的 SVG 图片文档里栅格化的，系统
   * 字体可能取不到，没有兜底时浏览器会退到「标准字体」（衬线），字宽一大就会溢出
   * 画框、把本该一行的文案挤成两行。模板自带的字体栈（如等宽栈）排在前面，先命中
   * 的仍是它，补在末尾不影响原有观感。
   */
  const pick = font ? `"${font.replace(/"/g, '')}"` : resolvedFont;
  const canvasFont = pick ? `${pick}, sans-serif` : '';
  // 内联输入给原始族名：模板自己拼 SVG 时会写进属性，不能带引号与逗号
  const injected: TemplateInjectedProps = { photoUrl, exif, font: resolvedFont };

  // 画布盒子只作为稳定句柄，尺寸由模板根自己按 --co-base 决定
  return (
    <div data-co-canvas-box="" style={canvasFont ? { fontFamily: canvasFont } : undefined}>
      {template.render({ ...injected, ...resolvedParams })}
    </div>
  );
}
