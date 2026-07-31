/**
 * StorageModule: Manages chrome.storage API and local storage
 */

export function createStorageModule({ options }) {
  const listeners = [];

  return {
    async init() {
      // Initialize storage listeners
      chrome.storage.onChanged.addListener((changes, areaName) => {
        listeners.forEach(listener => listener(changes, areaName));
      });
    },

    // Storage API methods
    async get(keys) {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
      });
    },

    async set(data) {
      return new Promise((resolve) => {
        chrome.storage.local.set(data, resolve);
      });
    },

    async remove(keys) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(keys, resolve);
      });
    },

    async clear() {
      return new Promise((resolve) => {
        chrome.storage.local.clear(resolve);
      });
    },

    // Listener management
    onChange(listener) {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx > -1) listeners.splice(idx, 1);
      };
    },

    async destroy() {
      listeners.length = 0;
    },
  };
}

export default createStorageModule;
