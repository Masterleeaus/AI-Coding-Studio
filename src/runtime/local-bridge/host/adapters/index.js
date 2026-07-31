export { registerFilesystemReadAdapters } from './filesystem-read-adapters.js';
export { registerGitReadAdapters } from './git-read-adapters.js';
export { registerSystemReadAdapters } from './system-read-adapters.js';

import { registerFilesystemReadAdapters } from './filesystem-read-adapters.js';
import { registerGitReadAdapters } from './git-read-adapters.js';
import { registerSystemReadAdapters } from './system-read-adapters.js';

export function registerReadOnlyAdapters(registry, options = {}) {
  registerSystemReadAdapters(registry, options);
  registerFilesystemReadAdapters(registry, options);
  registerGitReadAdapters(registry, options);
  return registry;
}
