import type { ReactNode } from 'react';
import { usePhotos } from '@/shared/hooks/use-photos';
import { useTranslate } from '@/shared/i18n';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/shared/ui/context-menu';

/**
 * 素材库缩略图的右键菜单：关闭当前 / 关闭其他 / 关闭左边 / 关闭右边。
 *
 * 语义与编辑器标签页一致：「关闭左边」指删掉这张**之前**的全部素材，当前这张与其右侧保留；
 * 没有可关闭的一侧时对应项**不显示**。关闭后照片列表与当前索引由 PhotoProvider 统一维护，
 * 拼图里被关闭素材占用的格子由它自己的同步逻辑清掉。
 */
/** 最小一档的菜单条目：24px 高、字号收紧，与项目里最紧凑的控件同档。 */
const ITEM_CLASS = 'min-h-6 px-2 py-0.5 text-[11px]/relaxed';

export function PhotoContextMenu({
  index,
  children,
}: {
  /** 这张素材在列表中的下标 */
  index: number;
  children: ReactNode;
}) {
  const t = useTranslate();
  const { photos, removePhotos } = usePhotos();

  const close = (ids: readonly string[]) => {
    removePhotos(ids);
  };

  // 不可用的项直接隐藏（用户要求不显示置灰项）
  const hasOthers = photos.length > 1;
  const hasLeft = index > 0;
  const hasRight = index < photos.length - 1;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      {/* 尺寸取项目里最小的一档：条目 24px、内边距收紧，宽度按内容自适应（不写死宽度） */}
      <ContextMenuContent className="min-w-0 p-0.5">
        <ContextMenuItem className={ITEM_CLASS} onSelect={() => close([photos[index].id])}>
          {t('common.photo.close')}
        </ContextMenuItem>
        {hasOthers ? (
          <ContextMenuItem
            className={ITEM_CLASS}
            onSelect={() =>
              close(photos.filter((_, itemIndex) => itemIndex !== index).map((photo) => photo.id))
            }
          >
            {t('common.photo.closeOthers')}
          </ContextMenuItem>
        ) : null}
        {/* 没有可关闭的一侧时整项隐藏（不置灰）；两侧都没有，分隔线也一起省掉 */}
        {hasLeft || hasRight ? <ContextMenuSeparator className="my-0.5" /> : null}
        {hasLeft ? (
          <ContextMenuItem
            className={ITEM_CLASS}
            onSelect={() => close(photos.slice(0, index).map((photo) => photo.id))}
          >
            {t('common.photo.closeLeft')}
          </ContextMenuItem>
        ) : null}
        {hasRight ? (
          <ContextMenuItem
            className={ITEM_CLASS}
            onSelect={() => close(photos.slice(index + 1).map((photo) => photo.id))}
          >
            {t('common.photo.closeRight')}
          </ContextMenuItem>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}
