import { defineConfig, presetIcons } from 'unocss';

export default defineConfig({
  presets: [
    // presetWind4({ }),
    presetIcons({ }),
  ],
  preflights: [
    {
      getCSS: () => `
        :root {
          --co-base-size: 4px;
        }
      `,
    },
  ],
  rules: [
    [/^([mp])([trbl])?-(\d+)$/, ([, m, v, d]) => {
      return {
        [`${
          { m: 'margin', p: 'padding' }[m]
        }${
          { t: '-top', r: '-right', b: '-bottom', l: '-left' }[v] || ''
        }`]: `calc(var(--co-base-size) * ${d})`,
      };
    }],
  ],
});
