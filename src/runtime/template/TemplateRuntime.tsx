import { BUILTIN_TEMPLATE } from '@/modules/comark/templates';
import type { TemplateProps } from '@/modules/comark/templates';

interface TemplateRuntimeProps {
  templateId?: string;
  props: TemplateProps;
}

export function TemplateRuntime({
  templateId = BUILTIN_TEMPLATE.meta.id,
  props,
}: TemplateRuntimeProps) {
  const template = templateId === BUILTIN_TEMPLATE.meta.id ? BUILTIN_TEMPLATE : BUILTIN_TEMPLATE;
  const Component = template.component;

  return <Component {...props} />;
}
