import Store from 'electron-store';

export const store = new Store();
console.log('store-path: ', store.path);
