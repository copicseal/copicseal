import { randomUUID } from 'node:crypto';
import Store from 'electron-store';

export const store = new Store<{
  machineId: string;
}>({ name: import.meta.env.DEV ? 'config.dev' : 'config' });
console.log('store-path: ', store.path);

export function getMachineId() {
  let machineId = store.get('machineId');
  if (!machineId) {
    machineId = randomUUID();
    store.set('machineId', machineId);
  }
  return machineId;
}
