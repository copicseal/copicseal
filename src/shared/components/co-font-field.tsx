import { RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import type { FontInfo } from '@/platform';
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

/**
 * 代表「不指定字体」的哨兵值。
 *
 * Radix Select 不允许 `SelectItem` 用空串作 value（空串是它的清空语义），
 * 所以这里用一个不可能与真实字体族重名的值来承载「跟随模板默认」。
 */
const FOLLOW_TEMPLATE_FONT = '__co-follow-template-font__';

interface CoFontFieldProps {
  /** 当前字体族；空串表示跟随模板自带的字体栈 */
  value: string;
  onChange: (font: string) => void;
  /** 系统字体清单；由调用方用 `useSystemFonts` 取，便于把刷新按钮放在同一行 */
  fonts: FontInfo[];
  loading?: boolean;
  /** 省略则不渲染刷新按钮 */
  onRefresh?: () => void;
  /** 族名 → 备注：下拉项显示成「字体 · 备注」，方便按用途挑（如「手写」） */
  noteOf?: (family: string) => string | undefined;
}

/**
 * 字体选择行：字体下拉 + 刷新。
 *
 * 标题与描述由调用方负责（模板页是自己的分区标题，设置页是 `SettingField`），
 * 这里只负责控件本身，保证两个入口的字体选项与哨兵值语义完全一致。
 */
export function CoFontField({
  value,
  onChange,
  fonts,
  loading,
  onRefresh,
  noteOf,
}: CoFontFieldProps) {
  const t = useTranslate();

  const labelOf = (family: string) => {
    const note = noteOf?.(family);
    return note ? `${family} · ${note}` : family;
  };

  // 当前字体可能不在系统清单里（别的机器存下的配置、枚举失败）：补一条同名项，
  // 否则下拉会因为找不到对应选项而显示成空白
  const families = useMemo(() => {
    const list = fonts.map((item) => item.family);
    return value && !list.includes(value) ? [value, ...list] : list;
  }, [fonts, value]);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value || FOLLOW_TEMPLATE_FONT}
        onValueChange={(next) => onChange(next === FOLLOW_TEMPLATE_FONT ? '' : next)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('common.font.selectPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={FOLLOW_TEMPLATE_FONT}>{t('common.font.followTemplate')}</SelectItem>
            {families.map((family) => (
              <SelectItem key={family} value={family}>
                {labelOf(family)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {onRefresh ? (
        <Button
          type="button"
          variant="plain"
          size="icon-sm"
          className="shrink-0"
          aria-label={t('common.font.refresh')}
          disabled={loading}
          onClick={onRefresh}
        >
          <RefreshCw className={cn(loading && 'animate-spin')} />
        </Button>
      ) : null}
    </div>
  );
}
