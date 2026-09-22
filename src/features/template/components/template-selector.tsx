import { Star } from 'lucide-react';
import { useState } from 'react';
import { listBuiltinTemplates } from '@/features/template/runtime/template-registry';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

interface TemplateSelectorProps {
  activeTemplateId: string;
  onTemplateChange: (templateId: string) => void;
}

/** 收藏排在最近使用之前，其余保持注册顺序。 */
function resolveRank(templateId: string, favorites: string[], recentIds: string[]): number {
  const favoriteIndex = favorites.indexOf(templateId);
  if (favoriteIndex >= 0) {
    return favoriteIndex;
  }

  const recentIndex = recentIds.indexOf(templateId);
  if (recentIndex >= 0) {
    return favorites.length + recentIndex;
  }

  return Number.MAX_SAFE_INTEGER;
}

export function TemplateSelector({ activeTemplateId, onTemplateChange }: TemplateSelectorProps) {
  const templates = listBuiltinTemplates();
  const [favorites, setFavorites] = useState<string[]>(['minimal', 'film']);
  const [recentIds, setRecentIds] = useState<string[]>(['minimal']);

  // 收藏与最近使用只影响下拉里的排序，模板列表本身始终是完整的一份。
  const orderedTemplates = templates
    .map((template, index) => ({ template, index }))
    .sort((left, right) => {
      const delta =
        resolveRank(left.template.meta.id, favorites, recentIds) -
        resolveRank(right.template.meta.id, favorites, recentIds);

      return delta === 0 ? left.index - right.index : delta;
    })
    .map((entry) => entry.template);

  const activeTemplate = templates.find((template) => template.meta.id === activeTemplateId);
  const activeFavorite = favorites.includes(activeTemplateId);

  const toggleFavorite = () => {
    setFavorites((current) =>
      current.includes(activeTemplateId)
        ? current.filter((id) => id !== activeTemplateId)
        : [...current, activeTemplateId],
    );
  };

  const handleSelect = (templateId: string) => {
    onTemplateChange(templateId);
    setRecentIds((current) =>
      [templateId, ...current.filter((id) => id !== templateId)].slice(0, 3),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">模板</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={activeFavorite}
          className={cn('text-muted-foreground', activeFavorite && 'text-primary')}
          onClick={toggleFavorite}
        >
          <Star data-icon="inline-start" className={cn(activeFavorite && 'fill-current')} />
          {activeFavorite ? '已收藏' : '收藏'}
        </Button>
      </div>

      <Select value={activeTemplateId} onValueChange={handleSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="选择模板" />
        </SelectTrigger>
        <SelectContent>
          {orderedTemplates.map((template) => (
            <SelectItem key={template.meta.id} value={template.meta.id}>
              {template.meta.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeTemplate ? (
        <p className="text-xs leading-5 text-muted-foreground">{activeTemplate.meta.description}</p>
      ) : null}
    </div>
  );
}
