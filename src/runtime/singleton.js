import { RuntimeKernel } from './RuntimeKernel.js';

let runtimeKernel = null;
let initialization = null;

export async function initRuntimeKernel(options = {}) {
  if (runtimeKernel) return runtimeKernel;
  if (!initialization) {
    initialization = (async () => {
      const kernel = new RuntimeKernel(options);
      await kernel.init();
      runtimeKernel = kernel;
      return kernel;
    })().finally(() => {
      initialization = null;
    });
  }
  return initialization;
}

export function getRuntimeKernel() {
  return runtimeKernel;
}
