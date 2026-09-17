import { normalizeFieldValue } from '@/features/template/runtime/template-registry';
import type { TemplateField, TemplateSchema } from '@/features/template/templates';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';

interface TemplatePropsPanelProps {
  schema: TemplateSchema;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** 分区标题，缺省用于模板参数 */
  title?: string;
  description?: string;
}

interface TemplateFieldControlProps {
  field: TemplateField;
  value: unknown;
  onChange: (key: string, next: unknown) => void;
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** 字段条件显示：未声明 `visibleWhen` 时始终可见。 */
function isFieldVisible(field: TemplateField, value: Record<string, unknown>): boolean {
  if (!field.visibleWhen) {
    return true;
  }

  const current = value[field.visibleWhen.key];
  return typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean'
    ? field.visibleWhen.equals.includes(current)
    : false;
}

/** 单个参数的控件；控件形态完全由字段自己的 `type` 决定。 */
function TemplateFieldControl({ field, value, onChange }: TemplateFieldControlProps) {
  // 原生取色器只接受 #rrggbb，非法输入时用黑色占位，右侧文本框仍展示用户原值。
  const colorText = field.type === 'color' ? readString(value, field.default) : '';
  const pickerColor = HEX_COLOR_PATTERN.test(colorText) ? colorText : '#000000';

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-foreground">{field.label}</span>
      {field.description ? (
        <p className="text-[10px] leading-4 text-muted-foreground">{field.description}</p>
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
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : null}

      {field.type === 'number' ? (
        <Input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={typeof value === 'number' ? String(value) : ''}
          onChange={(event) =>
            onChange(field.key, event.target.value === '' ? '' : Number(event.target.value))
          }
          // 失焦时按 schema 校正空值与越界值，输入过程中不做夹取，避免打断连续输入。
          onBlur={() => onChange(field.key, normalizeFieldValue(field, value))}
        />
      ) : null}

      {field.type === 'color' ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={pickerColor}
            onChange={(event) => onChange(field.key, event.target.value)}
            className="h-9 w-12 border border-border bg-background p-1"
          />
          <Input value={colorText} onChange={(event) => onChange(field.key, event.target.value)} />
        </div>
      ) : null}

      {field.type === 'text' ? (
        <Input
          value={readString(value, field.default)}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      ) : null}

      {field.type === 'boolean' ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            {value === true ? '开启' : '关闭'}
          </span>
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => onChange(field.key, checked)}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * 由 schema 生成属性表单，不维护任何专用表单。
 *
 * 模板参数与背景共用这一个生成器：两者的字段描述同构，区别只在数据来源与标题。
 */
export function TemplatePropsPanel({
  schema,
  value,
  onChange,
  title = '模板参数',
  description = '参数由当前模板自己的 propsSchema 生成，切换模板后会重置为该模板的默认值。',
}: TemplatePropsPanelProps) {
  const updateField = (key: string, nextValue: unknown) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-3">
        {schema.fields
          .filter((field) => isFieldVisible(field, value))
          .map((field) => (
            <TemplateFieldControl
              key={field.key}
              field={field}
              value={value[field.key]}
              onChange={updateField}
            />
          ))}
      </div>
    </div>
  );
}
