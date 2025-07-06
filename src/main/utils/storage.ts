import Store from 'electron-store';

export const store = new Store({ name: import.meta.env.DEV ? 'config.dev' : 'config' });
console.log('store-path: ', store.path);
