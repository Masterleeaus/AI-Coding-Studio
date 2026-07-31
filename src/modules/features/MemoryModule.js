export function createMemoryModule({ dependencies, options }) {
  return {
    async init() {},
    async enable() {},
    async disable() {},
    async destroy() {},
  };
}
export default createMemoryModule;
