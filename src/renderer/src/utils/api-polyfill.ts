import type { WindowAPI } from 'src/types';
import dom2image from 'dom-to-image';

export function apiPolyfill() {
  if (!window.api) {
    const api: WindowAPI = {
      onWinResized: (callback) => {
        window.addEventListener('resize', callback);
        return () => void window.removeEventListener('resize', callback);
      },
      captureDOM: async (options) => {
        const { html, output } = options;
        const { width, height, scale, rem, type } = output[0];

        // 创建隐藏 iframe
        const iframe = document.createElement('div');
        iframe.style.position = 'fixed';
        iframe.style.top = '0px';
        iframe.style.left = '0px';
        iframe.style.zIndex = '-9999';
        iframe.style.width = `${width}px`;
        iframe.style.height = `${height}px`;
        document.body.appendChild(iframe);

        // 写入隔离 HTML 内容
        iframe.innerHTML = (`
        <html>
          <body>
          <style>
              html { font-size: ${rem}px !important; }
              body { margin: 0; padding: 0; background: black; }
            </style>
          ${html}</body>
        </html>
      `);

        try {
          const bgEl = iframe.querySelector<HTMLDivElement>('.background');
          if (bgEl) {
            Object.assign(bgEl.style, {
              width: `${width}px`,
              height: `${height}px`,
              maxWidth: `${width}px`,
              maxHeight: `${height}px`,
            });
          }

          await new Promise(r => setTimeout(r, 300));

          // 生成图片
          const dataUrlFn = type === 'jpeg' ? dom2image.toJpeg : dom2image.toPng;
          const dataUrl = await dataUrlFn(iframe, {
            width,
            height,
            quality: 1,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            },
          });
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${'filename'}.${type}`;
          a.click();

          document.body.removeChild(iframe);

          return [dataUrl];
        }
        catch (err) {
          console.error('captureDOM error:', err);
          document.body.removeChild(iframe);
          return [];
        }
      },
      openDirectoryDialog: async () => {
        return '浏览器不支持';
      },
      showCtxMenu: async (_menus) => {
        return '';
      },
      openTargetPath: async (targetPath) => {
        console.log('openTargetPath', targetPath);
      },
      getAppVersion: async () => {
        return {
          currentVersion: '1.0.0',
          latestVersion: '1.0.0',
          downloadLink: 'https://copicseal.kohai.top/',
        };
      },
    };

    window.api = api;
  }
}
