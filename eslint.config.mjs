import antfu from '@antfu/eslint-config';
import unocss from '@unocss/eslint-config/flat';

export default antfu({
  plugins: [unocss],
  rules: {
    'no-console': 'off',
    'vue/block-order': ['error', {
      order: ['template', 'script', 'style'],
    }],
    'node/prefer-global/process': 'off',
  },
  stylistic: {
    indent: 2, // 4, or 'tab'
    quotes: 'single', // or 'double'
    semi: true,
  },
  ignores: ['node_modules', '**/node_modules/**', 'dist', '**/dist/**', 'out', '**/out/**', '.gitignore', '**/.gitignore/**'],
});
