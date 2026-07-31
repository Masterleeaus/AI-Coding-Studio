/**
 * StateModule: Manages application state
 */

export function createStateModule({ dependencies }) {
  const { storage } = dependencies;
  
  const state = {
    platform: 'unknown',
    settings: {},
    cache: {},
  };

  return {
    async init() {
      // Load initial state from storage
      const stored = await storage.get(['platform', 'settings']);
      if (stored.platform) state.platform = stored.platform;
      if (stored.settings) state.settings = stored.settings;
    },

    get(key) {
      return state[key];
    },

    set(key, value) {
      state[key] = value;
      return storage.set({ [key]: value });
    },

    getAll() {
      return { ...state };
    },

    async destroy() {
      // Clean up
    },
  };
}

export default createStateModule;
