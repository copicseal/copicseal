import type { RegisteredTemplate, RemoteTemplateSdk } from '@copicseal/template-sdk';
import { assertTemplateDefinition, defaultParamsOf } from '../sdk/host-validate.mjs';

export interface LoadedTemplate {
  definition: RegisteredTemplate;
  /** 模板包文本长度（与 sha256 一起用于确认拿到的确实是产物） */
  bytes: number;
  warnings: string[];
}

/**
 * 载入一个打包好的模板包。
 *
 * 步骤刻意与真实宿主完全一致（docs/14 §14.8）：
 * 取文本 → Blob → 动态 import → 默认导出工厂 → 注入 SDK → 校验形状。
 * 预览页因此能在浏览器里验证「宿主将来要走的这条路」是通的。
 */
export async function loadTemplateBundle(
  url: string,
  sdk: RemoteTemplateSdk,
): Promise<LoadedTemplate> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`下载模板包失败：HTTP ${response.status}（${url}）`);
  }

  const source = await response.text();
  const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));

  try {
    // 变量说明符 + @vite-ignore：这是运行时的 Blob URL，不能让打包器去解析
    const mod = (await import(/* @vite-ignore */ blobUrl)) as { default?: unknown };
    if (typeof mod.default !== 'function') {
      throw new Error('模板包没有默认导出工厂函数');
    }

    const factory = mod.default as (injected: RemoteTemplateSdk) => RegisteredTemplate;
    const definition = factory(sdk);
    const { warnings } = assertTemplateDefinition(definition, { templateId: sdk.templateId });

    return { definition, bytes: source.length, warnings };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export { defaultParamsOf };
