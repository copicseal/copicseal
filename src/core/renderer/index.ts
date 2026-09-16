export async function waitForDomStability(frameCount = 2) {
  for (let i = 0; i < frameCount; i += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

export async function prepareElementForSnapshot(element: HTMLElement) {
  if (!element.isConnected) {
    throw new Error('Snapshot target is not mounted');
  }

  await waitForDomStability();
}

/**
 * 等待元素内的图片加载完成。
 *
 * 模板画布高度由图片真实比例决定，若在图片就绪前测量，会拿到占位比例
 * 导致解算出的基准偏差，因此导出前必须先过这一关。
 */
export async function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll('img'));

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          const done = () => resolve();
          image.addEventListener('load', done, { once: true });
          image.addEventListener('error', done, { once: true });
        }),
    ),
  );
}
