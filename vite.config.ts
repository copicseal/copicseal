import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.DRAGGABLE_DEBUG': 'false',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        'process.env.DRAGGABLE_DEBUG': 'false',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        /**
         * ExifTool + zeroperl（WASM 版 Perl 的加载器与 Perl 源码）单独切一个 chunk。
         *
         * 它们只被「快门数查询」用，业务代码里已经是 `import()` 动态引入；但这两个包是 CJS/互操作
         * 形态，Rollup 的 commonjs 插件会把它们并进入口 chunk（构建时也会给出跨 chunk 循环的警告）。
         * 显式切出来后，入口不静态依赖它，于是只在真正查询快门数时才加载。
         */
        manualChunks(id: string) {
          if (id.includes('@uswriting/exiftool') || id.includes('zeroperl')) {
            return 'exiftool';
          }

          return undefined;
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
}));
