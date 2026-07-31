/**
 * BridgeModule: Manages communication with injected scripts
 */

export function createBridgeModule({ dependencies }) {
  const { state, eventBus } = dependencies;
  const listeners = [];

  return {
    async init() {
      // Set up message listener
      const handler = (msg) => {
        if (msg.type === 'bridge:message') {
          eventBus.emit('bridge:message', msg.data);
        }
      };
      window.addEventListener('message', handler);
      listeners.push(() => window.removeEventListener('message', handler));
    },

    async send(message) {
      window.postMessage({ type: 'bridge:message', data: message }, '*');
    },

    async destroy() {
      listeners.forEach(u => u());
      listeners.length = 0;
    },
  };
}

export default createBridgeModule;
