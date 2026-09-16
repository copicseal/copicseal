import type { ComponentType } from 'react';
import type { TemplateBackground } from '../background';
import type {
  RegisteredTemplate,
  TemplateField,
  TemplateInjectedProps,
  TemplateMeta,
  TemplateParams,
} from './types';

interface TemplateDefinitionInput<TFields extends readonly TemplateField[]> {
  meta: TemplateMeta;
  /** 该模板的参数声明：既是属性面板的来源，也是组件 props 类型的来源 */
  fields: TFields;
  /** 该模板推荐的默认背景，缺省表示无背景 */
  backgroundDefaults?: Partial<TemplateBackground>;
  component: ComponentType<TemplateInjectedProps & TemplateParams<TFields>>;
}

/**
 * 定义一个模板。
 *
 * 这是「有类型的模板参数」与「注册表可统一分发的擦除视图」之间唯一的转换入口：
 * 组件拿到的是 `TemplateInjectedProps & TemplateParams<TFields>`，
 * 而注册表只看到 `TemplateInjectedProps & Record<string, unknown>`，
 * 两者之间的断言被限制在本函数内，不会扩散到调用方或属性面板。
 */
export function defineTemplate<const TFields extends readonly TemplateField[]>(
  input: TemplateDefinitionInput<TFields>,
): RegisteredTemplate {
  const { meta, fields, backgroundDefaults, component: Component } = input;

  return {
    meta,
    schema: { fields },
    backgroundDefaults,
    render: (props) => (
      <Component {...(props as unknown as TemplateInjectedProps & TemplateParams<TFields>)} />
    ),
  };
}
