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
