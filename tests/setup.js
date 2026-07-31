import { afterEach, beforeEach, vi } from "vitest";

function createEventMock() {
  const listeners = new Set();
  return {
    addListener: vi.fn((listener) => listeners.add(listener)),
    removeListener: vi.fn((listener) => listeners.delete(listener)),
    hasListener: vi.fn((listener) => listeners.has(listener)),
    hasListeners: vi.fn(() => listeners.size > 0),
    _emit: (...args) => {
      for (const listener of listeners) listener(...args);
    },
    _clear: () => listeners.clear(),
  };
}

export function createChromeMock() {
  const storageData = new Map();
  const storageChanged = createEventMock();

  const local = {
    get: vi.fn(async (keys = null) => {
      if (keys === null) return Object.fromEntries(storageData.entries());
      const requested = Array.isArray(keys)
        ? keys
        : typeof keys === "string"
          ? [keys]
          : Object.keys(keys || {});
      const result = {};
      for (const key of requested) {
        if (storageData.has(key)) result[key] = storageData.get(key);
        else if (keys && typeof keys === "object" && !Array.isArray(keys)) {
          result[key] = keys[key];
        }
      }
      return result;
    }),
    set: vi.fn(async (items) => {
      const changes = {};
      for (const [key, value] of Object.entries(items || {})) {
        changes[key] = { oldValue: storageData.get(key), newValue: value };
        storageData.set(key, value);
      }
      if (Object.keys(changes).length) storageChanged._emit(changes, "local");
    }),
    remove: vi.fn(async (keys) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) storageData.delete(key);
    }),
    clear: vi.fn(async () => storageData.clear()),
  };

  return {
    runtime: {
      id: "ai-coding-studio-test",
      getURL: vi.fn((path = "") => `chrome-extension://ai-coding-studio-test/${path}`),
      sendMessage: vi.fn(async () => ({ ok: true, success: true })),
      onMessage: createEventMock(),
      lastError: null,
    },
    storage: {
      local,
      onChanged: storageChanged,
    },
    tabs: {
      query: vi.fn(async () => []),
      create: vi.fn(async (options) => ({ id: 1, ...options })),
      sendMessage: vi.fn(async () => ({ ok: true })),
    },
    downloads: {
      download: vi.fn(async () => 1),
    },
    permissions: {
      contains: vi.fn(async () => false),
      request: vi.fn(async () => false),
    },
  };
}

beforeEach(() => {
  globalThis.chrome = createChromeMock();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete globalThis.chrome;
});
