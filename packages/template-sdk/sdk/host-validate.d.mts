import type { RegisteredTemplate } from './index';

/** 校验模板定义的形状；通过时返回警告（非致命）列表。 */
export declare function assertTemplateDefinition(
  definition: unknown,
  context?: { registryId?: string; templateId?: string },
): { warnings: string[] };

/** 按 schema 取一份默认参数。 */
export declare function defaultParamsOf(definition: RegisteredTemplate): Record<string, unknown>;
