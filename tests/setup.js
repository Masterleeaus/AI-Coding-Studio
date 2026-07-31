import { beforeEach, vi } from 'vitest';

function createChromeMock() {
  const storageData = new Map();
  const storageListeners = new Set();

  const storageLocal = {
    get: vi.fn(async (keys = null) => {
      if (keys == null) return Object.fromEntries(storageData);
      if (typeof keys === 'string') return { [keys]: storageData.get(keys) };
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.filter((key) => storageData.has(key)).map((key) => [key, storageData.get(key)]));
      }
      if (typeof keys === 'object') {
        return Object.fromEntries(Object.entries(keys).map(([key, fallback]) => [key, storageData.has(key) ? storageData.get(key) : fallback]));
      }
      return {};
    }),
    set: vi.fn(async (values) => {
      const changes = {};
      for (const [key, value] of Object.entries(values || {})) {
        changes[key] = { oldValue: storageData.get(key), newValue: value };
        storageData.set(key, value);
      }
      for (const listener of storageListeners) listener(changes, 'local');
    }),
    remove: vi.fn(async (keys) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) storageData.delete(key);
    }),
    clear: vi.fn(async () => storageData.clear()),
  };

  return {
    runtime: {
      id: 'ai-coding-studio-test',
      sendMessage: vi.fn(async () => ({ success: true })),
      getURL: vi.fn((path) => `chrome-extension://ai-coding-studio-test/${path}`),
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    storage: {
      local: storageLocal,
      onChanged: {
        addListener: vi.fn((listener) => storageListeners.add(listener)),
        removeListener: vi.fn((listener) => storageListeners.delete(listener)),
      },
    },
  };
}

beforeEach(() => {
  const chromeMock = createChromeMock();
  vi.stubGlobal('chrome', chromeMock);
  if (typeof window !== 'undefined') window.chrome = chromeMock;
});
