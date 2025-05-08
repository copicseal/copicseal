import { createApp } from 'vue';
import App from './App.vue';
import { apiPolyfill } from './utils/api-polyfill';
import 'element-plus/theme-chalk/index.css';

apiPolyfill();

const app = createApp(App);

app.mount('#app');
