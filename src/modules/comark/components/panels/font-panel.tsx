import { Search, Star } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type AppConfig, type FontInfo, getConfig, listSystemFonts, updateConfig } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function CoFontPanel() {
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const configRef = useRef<AppConfig | null>(null);

  useEffect(() => {
    Promise.all([listSystemFonts(), getConfig().catch(() => null)]).then(([result, config]) => {
      setFonts(result);
      if (config) {
        configRef.current = config;
        setFavorites(new Set(config.fonts.favorites));
      }
      setLoading(false);
    });
  }, []);

  const saveFavorites = useCallback(async (favs: Set<string>) => {
    const config = configRef.current;
    if (!config) return;
    const updated = {
      ...config,
      fonts: {
        ...config.fonts,
        favorites: [...favs],
      },
    };
    try {
      await updateConfig(updated);
      configRef.current = updated;
    } catch {
      // silently fail: favorites stay in-memory
    }
  }, []);

  const toggleFavorite = useCallback(
    (font: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(font)) next.delete(font);
        else next.add(font);
        saveFavorites(next);
        return next;
      });
    },
    [saveFavorites],
  );

  const filtered = fonts.filter((f) => f.family.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-2 p-3 text-xs">
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

      <div className="max-h-[42vh] space-y-0.5 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-transparent">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
          </div>
        ) : (
          <>
            {filtered.map((font) => (
              <div key={font.family} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelected(font.family)}
                  className={cn(
                    'flex-1 truncate rounded px-1.5 py-1 text-left text-[10px] transition-colors hover:bg-muted/50',
                    selected === font.family && 'bg-muted/30 font-medium text-foreground',
                  )}
                  style={{ fontFamily: font.family }}
                >
                  {font.family}
                </button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0"
                  onClick={() => toggleFavorite(font.family)}
                >
                  <Star
                    className={cn(
                      'size-3',
                      favorites.has(font.family)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground',
                    )}
                  />
                </Button>
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <p className="py-2 text-center text-[10px] text-muted-foreground">无匹配字体</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
