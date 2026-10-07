/**
 * 命中测试：视口坐标落在哪个拼图槽位上。
 *
 * 槽位是画布里的 `[data-collage-slot]` 元素，画布换位与素材拖入共用这一份判定，
 * 保证「看到的落点」和「真正落到的格子」不会各算各的。
 */
export function findSlotIndexAtPoint(x: number, y: number): number | null {
  const element = document.elementFromPoint(x, y);
  const slotElement = element?.closest<HTMLElement>('[data-collage-slot]');
  if (!slotElement) {
    return null;
  }

  const index = Number(slotElement.dataset.collageSlot);
  return Number.isFinite(index) ? index : null;
}
