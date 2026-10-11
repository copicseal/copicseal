import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * 预览页的 Vite 配置。
 *
 * 关键点是 `@` 别名指向仓库 `src/`：预览用的宿主 SDK 直接引用仓库里的
 * `formatExifText` / `useImageAspect` / `brand`，因此预览能顺带发现「宿主实现变了、
 * 模板跟不上了」这类漂移（品牌工具还用了 Vite 专有的 import.meta.glob，只能用 Vite 构建）。
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../../../src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('../preview-dist', import.meta.url)),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
  },
});
