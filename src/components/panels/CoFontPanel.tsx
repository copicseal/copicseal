import { Search, Star } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MOCK_FONTS = [
  'Inter',
  'Helvetica Neue',
  'PingFang SC',
  'Hiragino Sans GB',
  'Microsoft YaHei',
  'Noto Sans SC',
  'Source Han Sans',
  'Fira Code',
  'JetBrains Mono',
  'SF Mono',
  'Menlo',
  'Georgia',
  'Times New Roman',
  'Baskerville',
  'Palatino',
];

export function CoFontPanel() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (font: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(font)) next.delete(font);
      else next.add(font);
      return next;
    });
  };

  const filtered = MOCK_FONTS.filter((f) => f.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex min-h-0 flex-col space-y-2 p-3 text-xs">
      <h4 className="font-semibold text-foreground">字体</h4>

      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索字体..."
            className="h-7 pl-6 text-[10px]"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-transparent">
        {filtered.map((font) => (
          <div key={font} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelected(font)}
              className={cn(
                'flex-1 truncate rounded px-1.5 py-1 text-left text-[10px] transition-colors hover:bg-muted/50',
                selected === font && 'bg-muted/30 font-medium text-foreground',
              )}
              style={{ fontFamily: font }}
            >
              {font}
            </button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0"
              onClick={() => toggleFavorite(font)}
            >
              <Star
                className={cn(
                  'size-3',
                  favorites.has(font) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground',
                )}
              />
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-2 text-center text-[10px] text-muted-foreground">无匹配字体</p>
        )}
      </div>
    </div>
  );
}
