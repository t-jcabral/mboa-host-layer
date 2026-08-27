import type { StorageEngine } from '@mboa/core';

/** The subset of `@react-native-async-storage/async-storage` the engine needs. */
export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}

/**
 * Adapts AsyncStorage to the core `StorageEngine`.
 *
 * Injected by the app rather than imported here, so `@mboa/host-layer` stays
 * runnable under plain Node in tests.
 */
export function createAsyncStorageEngine(asyncStorage: AsyncStorageLike): StorageEngine {
  return {
    getItem: (key) => asyncStorage.getItem(key),
    setItem: (key, value) => asyncStorage.setItem(key, value),
    removeItem: (key) => asyncStorage.removeItem(key),
    getAllKeys: () => asyncStorage.getAllKeys(),
  };
}
