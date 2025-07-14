import type { Page } from 'puppeteer-core';
import path, { join } from 'node:path';
import { is } from '@electron-toolkit/utils';
import { app, BrowserWindow } from 'electron';
import { exiftool } from 'exiftool-vendored';
import puppeteer from 'puppeteer-core';
import pie from 'puppeteer-in-electron';

interface Output {
  path: string;
  type?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  width: number;
  height: number;
  scale?: number;
  rem?: number;
}

export interface CaptureOptions {
  html: string;
  dpi?: number;
  output: Output[] | Output;
}

let mainWindow: BrowserWindow | null = null;
let page: Page | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
export async function handleCapture({ html, output, dpi }: CaptureOptions, retry = 1) {
  if (!Array.isArray(output)) {
    output = [output];
  }
  if (!output.length) {
    return [];
  }

  const currentOutput = output[0];

  console.time('capture-div');
  if (timer) {
    clearTimeout(timer);
  }
  if (!page) {
    page = await createWindow();
  }

  try {
    await page.setContent(html);

    const outputPath = currentOutput.path; // 保存截图路径
    console.log(currentOutput);
    await page.evaluate((currentOutput) => {
      if (currentOutput.rem) {
        document.querySelector('html')!.style.fontSize = `${currentOutput.rem}px`;
      }
      const bgEl = document.querySelector<HTMLDivElement>('.background');
      if (bgEl) {
        Object.assign(bgEl.style, {
          width: `${currentOutput.width}px`,
          height: `${currentOutput.height}px`,
          maxWidth: `${currentOutput.width}px`,
          maxHeight: `${currentOutput.height}px`,
        });
      }
    }, currentOutput);

    const vp = page.viewport();
    page.setViewport({
      deviceScaleFactor: currentOutput.scale,
      width: +currentOutput.width,
      height: +currentOutput.height,
    });
    // 截取特定元素
    await page.screenshot({
      path: outputPath,
      type: currentOutput.type,
      quality: currentOutput.type !== 'png' ? Math.max(0, Math.min(100, Math.round((currentOutput.quality ?? 1) * 100))) : undefined,
    });
    if (dpi) {
      if (currentOutput.type === 'png') {
        const PixelsPerUnitX = Math.round(dpi * (11811 / 300));
        await exiftool.write(outputPath, {
          PixelsPerUnitX,
          PixelsPerUnitY: PixelsPerUnitX,
          PixelUnits: 'meters',
        } as any, { writeArgs: ['-overwrite_original'] });
      }
      else {
        await exiftool.write(outputPath, {
          XResolution: dpi,
          YResolution: dpi,
          ResolutionUnit: 'inches',
        }, { writeArgs: ['-overwrite_original'] });
      }
    }
    page.setViewport(vp);
    console.log('截图完成', outputPath);
    timer = setTimeout(() => {
      mainWindow?.close();
      mainWindow?.destroy();
      mainWindow = null;
      page?.close().catch(() => {});
      page = null;
    }, 10 * 1000);
    console.timeEnd('capture-div');

    return [outputPath, ...(await handleCapture({ html, output: output.slice(1), dpi }))].filter(
      Boolean,
    );
  }
  catch (e) {
    console.timeEnd('capture-div');

    console.error(e);
    mainWindow?.destroy();
    page?.close().catch(() => {});
    page = null;
    if (retry > 0) {
      return handleCapture({ html, output }, retry - 1);
    }
  }
  return [];
}

async function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1,
    height: 1,
    show: true,
    autoHideMenuBar: true,
    frame: false,
    opacity: 0, // 窗口不透明度
    focusable: false, // 窗口不可聚焦
    skipTaskbar: true, // 窗口不显示在任务栏中
    hiddenInMissionControl: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.setPosition(0, 0);

  mainWindow.blur();

  // 加载原有页面防止 blob url 图片跨域
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  }
  else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
  await new Promise<BrowserWindow>((resolve) => {
    mainWindow!.webContents.on('did-finish-load', () => {
      resolve(mainWindow!);
    });
  });
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-expect-error
  const browser = await pie.connect(app, puppeteer);
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-expect-error
  const page: Page = await pie.getPage(browser, mainWindow);

  return page;
}
