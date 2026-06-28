import { Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { listBuiltinTemplates } from '@/runtime/template/template-registry';

interface TemplateSelectorProps {
  activeTemplateId: string;
  onTemplateChange: (templateId: string) => void;
}

export function TemplateSelector({ activeTemplateId, onTemplateChange }: TemplateSelectorProps) {
  const templates = listBuiltinTemplates();
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(['minimal', 'leica']);
  const [recentIds, setRecentIds] = useState<string[]>(['minimal']);

  const filteredTemplates = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return templates;
    }

    return templates.filter((template) => {
      const haystack = [
        template.meta.name,
        template.meta.description,
        ...(template.meta.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [query, templates]);

  const toggleFavorite = (templateId: string) => {
    setFavorites((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    );
  };

  const handleSelect = (templateId: string) => {
    onTemplateChange(templateId);
    setRecentIds((current) =>
      [templateId, ...current.filter((id) => id !== templateId)].slice(0, 3),
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">模板选择</h3>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          支持模板搜索、收藏和最近使用。
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索模板"
          className="h-9 rounded-none pr-3 pl-9 text-xs"
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="border border-border px-2 py-1">最近使用：{recentIds.join(', ')}</span>
          <span className="border border-border px-2 py-1">收藏：{favorites.length}</span>
        </div>

        <div className="space-y-2">
          {filteredTemplates.map((template) => {
            const active = template.meta.id === activeTemplateId;
            const favorite = favorites.includes(template.meta.id);

            return (
              <div
                key={template.meta.id}
                className={cn(
                  'flex items-start justify-between border px-3 py-3 transition-colors',
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                )}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(template.meta.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-sm font-medium text-foreground">{template.meta.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {template.meta.description}
                  </p>
                </button>
                <button
                  type="button"
                  className={cn(
                    'ml-3 shrink-0 text-muted-foreground transition-colors hover:text-foreground',
                    favorite && 'text-primary',
                  )}
                  onClick={() => toggleFavorite(template.meta.id)}
                >
                  <Star className={cn('size-4', favorite && 'fill-current')} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
