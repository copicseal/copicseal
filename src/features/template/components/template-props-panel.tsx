import { Maximize2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  isTemplateFieldVisible,
  normalizeFieldValue,
  resolveFieldDescription,
  resolveFieldLabel,
  resolveOptionLabel,
} from '@/features/template/runtime/template-registry';
import type { TemplateField, TemplateSchema } from '@/features/template/templates';
import type { TemplateNumberField } from '@/features/template/templates/types';
import { useTranslate } from '@/shared/i18n';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Slider } from '@/shared/ui/slider';
import { Switch } from '@/shared/ui/switch';
import { TemplateTextEditorDialog } from './template-text-editor-dialog';

interface TemplatePropsPanelProps {
  schema: TemplateSchema;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /**
   * 字段附加控件：由调用方按字段 key 提供，渲染在该字段控件之后。
   *
   * 生成器只负责 schema 能描述的基础控件；像「照片主题色盘」这类需要外部数据
   * （当前照片）的增强，由持有数据的调用方注入，避免把领域依赖塞进通用面板。
   */
  extras?: Partial<Record<string, ReactNode>>;
}

interface TemplateFieldControlProps {
  field: TemplateField;
  value: unknown;
  onChange: (key: string, next: unknown) => void;
  extra?: ReactNode;
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** 滑块用值：夹进 schema 声明的范围，越界或空值时不至于让滑块位置失控。 */
function clampNumberField(field: TemplateNumberField<string>, input: number): number {
  const min = field.min ?? input;
  const max = field.max ?? input;

  return Math.min(Math.max(input, min), max);
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** 单个参数的控件；控件形态完全由字段自己的 `type` 决定。 */
function TemplateFieldControl({ field, value, onChange, extra }: TemplateFieldControlProps) {
  const t = useTranslate();
  const [editing, setEditing] = useState(false);
  // 原生取色器只接受 #rrggbb，非法输入时用黑色占位，右侧文本框仍展示用户原值。
  const colorText = field.type === 'color' ? readString(value, field.default) : '';
  const pickerColor = HEX_COLOR_PATTERN.test(colorText) ? colorText : '#000000';

  return (
    <div className="space-y-1.5">
      {/* 双击标题复位到模板默认值：对所有字段类型都适用，且不与控件自身交互冲突
          （select 展开、开关切换、输入框双击全选都保持原样），所以标题要禁止选中。
          用 button 而不是 span：既是「可交互元素」的语义，也让键盘可以 Enter 复位 */}
      <button
        type="button"
        className="w-fit text-left text-xs font-medium text-foreground select-none outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        title={t('template.props.resetHint')}
        aria-label={resolveFieldLabel(field, t)}
        onDoubleClick={() => onChange(field.key, field.default)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onChange(field.key, field.default);
          }
        }}
      >
        {resolveFieldLabel(field, t)}
      </button>
      {field.description ? (
        <p className="text-[10px] leading-4 text-muted-foreground">
          {resolveFieldDescription(field, t)}
        </p>
      ) : null}

      {field.type === 'select' ? (
        <Select
          value={readString(value, field.default)}
          onValueChange={(next) => onChange(field.key, next)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {resolveOptionLabel(option, t)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : null}

      {field.type === 'number' ? (
        // 滑块负责快调、输入框负责精确输入：两者共用同一个值，滑块值会夹到 schema 范围内，
        // 输入框在输入过程中保留原样（失焦时才校正），所以随手拖到一半也不会被改写。
        <div className="flex items-center gap-3">
          <Slider
            className="min-w-0 flex-1"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={[clampNumberField(field, typeof value === 'number' ? value : field.default)]}
            onValueChange={([next]) => onChange(field.key, next)}
            // 双击复位到模板默认值：滑块上双击没有原生行为，不会和输入框的双击全选冲突
            onDoubleClick={() => onChange(field.key, field.default)}
            title={t('template.props.sliderHint')}
            aria-label={resolveFieldLabel(field, t)}
          />
          <Input
            type="number"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={typeof value === 'number' ? String(value) : ''}
            aria-label={resolveFieldLabel(field, t)}
            className="h-7 w-20 shrink-0 text-xs"
            onChange={(event) =>
              onChange(field.key, event.target.value === '' ? '' : Number(event.target.value))
            }
            // 失焦时按 schema 校正空值与越界值，输入过程中不做夹取，避免打断连续输入。
            onBlur={() => onChange(field.key, normalizeFieldValue(field, value))}
          />
        </div>
      ) : null}

      {field.type === 'color' ? (
        // 色块做在输入框内部左侧作为前缀：整行只占一个输入框的宽度，比例与其它字段一致，
        // 点色块直接唤起系统取色器；右侧文本框仍可手输任意值（含用户输入的中间态）。
        <div className="relative">
          <input
            type="color"
            value={pickerColor}
            onChange={(event) => onChange(field.key, event.target.value)}
            aria-label={resolveFieldLabel(field, t)}
            className="absolute top-1/2 left-1.5 size-5 -translate-y-1/2 cursor-pointer appearance-none rounded-sm border border-border bg-background p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
          />
          <Input
            className="pl-9"
            value={colorText}
            aria-label={resolveFieldLabel(field, t)}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        </div>
      ) : null}

      {field.type === 'text' ? (
        // 后缀放「展开编辑」：弹框里用 TipTap 编辑，变量以 mention 芯片插到光标位置；
        // 命中区同样是无圆角矩形 + 内层圆角视觉，避免圆角切角点不到
        <div className="relative">
          <Input
            className="pr-8"
            value={readString(value, field.default)}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
          <button
            type="button"
            className="group absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            title={t('template.props.expandEditor')}
            aria-label={t('template.props.expandEditor')}
            onClick={() => setEditing(true)}
          >
            <span className="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-foreground">
              <Maximize2 className="size-3" />
            </span>
          </button>
        </div>
      ) : null}
      {field.type === 'text' && editing ? (
        <TemplateTextEditorDialog
          field={field}
          value={readString(value, field.default)}
          onChange={(next) => onChange(field.key, next)}
          onClose={() => setEditing(false)}
        />
      ) : null}

      {field.type === 'boolean' ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            {value === true ? t('template.propsPanel.on') : t('template.propsPanel.off')}
          </span>
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => onChange(field.key, checked)}
          />
        </div>
      ) : null}

      {extra}
    </div>
  );
}

/**
 * 由 schema 生成属性表单，不维护任何专用表单。
 *
 * 模板参数与背景共用这一个生成器：两者的字段描述同构，区别只在数据来源；
 * 分区标题、描述与折叠由外层的 CoPanelSection 负责。
 */
export function TemplatePropsPanel({ schema, value, onChange, extras }: TemplatePropsPanelProps) {
  const updateField = (key: string, nextValue: unknown) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="space-y-3">
      {schema.fields
        .filter((field) => isTemplateFieldVisible(field, value))
        .map((field) => (
          <TemplateFieldControl
            key={field.key}
            field={field}
            value={value[field.key]}
            onChange={updateField}
            extra={extras?.[field.key]}
          />
        ))}
    </div>
  );
}
