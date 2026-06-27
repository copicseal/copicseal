import { BUILTIN_TEMPLATES } from '@/modules/comark/templates';
import type { BuiltinTemplate } from '@/modules/comark/templates';

export function listBuiltinTemplates(): BuiltinTemplate[] {
  return BUILTIN_TEMPLATES;
}

export function getBuiltinTemplateById(id: string): BuiltinTemplate | undefined {
  return BUILTIN_TEMPLATES.find((template) => template.meta.id === id);
}
