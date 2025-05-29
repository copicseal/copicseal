import { getFonts } from 'font-list';

export function getSysFonts() {
  return getFonts({ disableQuoting: true });
}
