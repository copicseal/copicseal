import { snapdom } from '@zumer/snapdom';

export class WebImageAdapter {
  async capture(element: HTMLElement, format: 'png' | 'jpeg' | 'webp', quality: number, scale = 1) {
    return snapdom.toBlob(element, {
      type: format,
      format,
      quality: quality / 100,
      scale,
      backgroundColor: format === 'png' ? undefined : '#ffffff',
    });
  }
}
