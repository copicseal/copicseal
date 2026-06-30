import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TemplateProps, TemplateSchema } from '@/features/template/templates';

type EditableTemplateProps = Omit<TemplateProps, 'photoUrl' | 'exif'>;

interface TemplatePropsPanelProps {
  schema: TemplateSchema;
  value: EditableTemplateProps;
  onChange: (next: EditableTemplateProps) => void;
}

export function TemplatePropsPanel({ schema, value, onChange }: TemplatePropsPanelProps) {
  const updateField = <K extends keyof EditableTemplateProps>(
    key: K,
    nextValue: EditableTemplateProps[K],
  ) => {
    onChange({
      ...value,
      [key]: nextValue,
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">模板参数</h3>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          该区域由 propsSchema 自动生成，不再维护手写模板表单。
        </p>
      </div>

      <div className="space-y-3">
        {schema.fields.map((field) => {
          const fieldValue = value[field.key];

          return (
            <div key={field.key} className="space-y-1.5">
              <span className="text-xs font-medium text-foreground">{field.label}</span>
              {field.type === 'select' ? (
                <Select
                  value={String(fieldValue)}
                  onValueChange={(next) =>
                    updateField(field.key, next as EditableTemplateProps[typeof field.key])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {field.options?.map((option) => (
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
                  value={String(fieldValue)}
                  onChange={(event) =>
                    updateField(
                      field.key,
                      Number(event.target.value) as EditableTemplateProps[typeof field.key],
                    )
                  }
                />
              ) : null}

              {field.type === 'color' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={String(fieldValue)}
                    onChange={(event) =>
                      updateField(
                        field.key,
                        event.target.value as EditableTemplateProps[typeof field.key],
                      )
                    }
                    className="h-9 w-12 border border-border bg-background p-1"
                  />
                  <Input
                    value={String(fieldValue)}
                    onChange={(event) =>
                      updateField(
                        field.key,
                        event.target.value as EditableTemplateProps[typeof field.key],
                      )
                    }
                  />
                </div>
              ) : null}

              {field.type === 'text' ? (
                <Input
                  value={String(fieldValue)}
                  onChange={(event) =>
                    updateField(
                      field.key,
                      event.target.value as EditableTemplateProps[typeof field.key],
                    )
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
