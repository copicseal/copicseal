import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import UnoCSS from 'unocss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        include: ['http-proxy-agent', 'ajv'],
      }),
    ],
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        include: ['http-proxy-agent', 'ajv'],
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
      UnoCSS(),
      AutoImport({
        imports: ['vue'],
        resolvers: [ElementPlusResolver({
          importStyle: 'sass',
        })],
      }),
      Components({
        resolvers: [ElementPlusResolver({
          importStyle: 'sass',
        })],
      }),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData: `@use "@/theme/element/index.scss" as *;`,
        },
      },
    },
    build: {
      assetsInlineLimit: 0, // 禁止将任何资源转换为 data URL
    },
  },
});
