export function createEventBusModule() {
  const listeners = new Map();

  return {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(handler);
      return () => this.off(event, handler);
    },

    off(event, handler) {
      if (!listeners.has(event)) return;
      const idx = listeners.get(event).indexOf(handler);
      if (idx > -1) listeners.get(event).splice(idx, 1);
    },

    emit(event, data) {
      if (!listeners.has(event)) return;
      listeners.get(event).forEach(h => h(data));
    },

    async init() {},
    async destroy() {
      listeners.clear();
    },
  };
}

export default createEventBusModule;
