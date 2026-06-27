import type { TemplateProps } from '@/modules/comark/templates';
import { getBuiltinTemplateById } from './template-registry';

interface TemplateRuntimeProps {
  templateId?: string;
  props: TemplateProps;
}

export function TemplateRuntime({
  templateId = 'minimal',
  props,
}: TemplateRuntimeProps) {
  const template = getBuiltinTemplateById(templateId) ?? getBuiltinTemplateById('minimal');
  if (!template) {
    return null;
  }
  const Component = template.component;

  return <Component {...props} />;
}
