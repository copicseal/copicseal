import { Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFontLibrary } from '@/features/fonts/use-font-library';
import {
  listBuiltinTemplates,
  resolveTemplateDescription,
  resolveTemplateName,
} from '@/features/template/runtime/template-registry';
import { CoFontField } from '@/shared/components/co-font-field';
import { CoPanelSection } from '@/shared/components/co-panel-section';
import { useSystemFonts } from '@/shared/hooks/use-system-fonts';
import { useTranslate } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

interface TemplateSelectorProps {
  activeTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  /** 当前生效的字体族；空串表示跟随模板自带的字体栈 */
  font: string;
  onFontChange: (font: string) => void;
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

export function TemplateSelector({
  activeTemplateId,
  onTemplateChange,
  font,
  onFontChange,
}: TemplateSelectorProps) {
  const t = useTranslate();
  const templates = listBuiltinTemplates();
  const [favorites, setFavorites] = useState<string[]>(['minimal', 'film']);
  const [recentIds, setRecentIds] = useState<string[]>(['minimal']);
  const { loading, reload } = useSystemFonts();
  const library = useFontLibrary();

  /**
   * 下拉里列出的字体族。
   *
   * 只列「引入过的字体」（设置 → 字体 里从在线 / 本机 / 文件三种来源引入），
   * 不会把系统里几百个字体一股脑铺出来；重复族名去重。
   */
  const familyOptions = useMemo(() => {
    const families = [...new Set(library.entries.map((entry) => entry.family))];
    return families.map((family) => ({ family, postscript_name: null }));
  }, [library.entries]);

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
    <CoPanelSection
      title={t('template.selector.title')}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={activeFavorite}
          className={cn('text-muted-foreground', activeFavorite && 'text-primary')}
          onClick={toggleFavorite}
        >
          <Star data-icon="inline-start" className={cn(activeFavorite && 'fill-current')} />
          {activeFavorite ? t('template.selector.favorited') : t('template.selector.favorite')}
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-foreground">
            {t('template.selector.globalFont')}
          </span>
          <CoFontField
            value={font}
            onChange={onFontChange}
            fonts={familyOptions}
            loading={loading}
            onRefresh={reload}
            noteOf={(family) => library.notes[family]}
          />
          <p className="text-[10px] leading-4 text-muted-foreground">
            {familyOptions.length === 0
              ? t('template.selector.noFonts')
              : t('template.selector.fontHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Select value={activeTemplateId} onValueChange={handleSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('template.selector.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {/* 下拉项的 4px 内边距来自 SelectGroup（SelectContent 自身没有 p-1），
                  不包一层的话悬浮高亮会贴着弹层边缘。 */}
              <SelectGroup>
                {orderedTemplates.map((template) => (
                  <SelectItem key={template.meta.id} value={template.meta.id}>
                    {resolveTemplateName(template, t)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {activeTemplate ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {resolveTemplateDescription(activeTemplate, t)}
            </p>
          ) : null}
        </div>
      </div>
    </CoPanelSection>
  );
}
