import { apiPolyfill } from '@/utils/api-polyfill';
import { createApp } from 'vue';

import 'virtual:uno.css';
// eslint-disable-next-line perfectionist/sort-imports
import 'element-plus/theme-chalk/index.css';

// eslint-disable-next-line perfectionist/sort-imports
import App from './App.vue';
import './theme';

apiPolyfill();

const app = createApp(App);

app.mount('#app');
