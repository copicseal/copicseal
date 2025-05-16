import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import AutoImport from 'unplugin-auto-import/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        include: ['http-proxy-agent'],
      }),
    ],
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        include: ['http-proxy-agent'],
      }),
    ],
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@renderer': resolve('src/renderer/src'),
      },
    },
    plugins: [
      vue(),
      vueJsx(),
      AutoImport({
        imports: ['vue'],
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  },
});
