/**
 * ModuleInterface: Standard contract for all Better DeepSeek modules
 * 
 * All modules must implement this interface:
 */

export class ModuleInterface {
  /**
   * Initialize the module
   * Called after module factory returns, before module is considered "ready"
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error('init() must be implemented');
  }

  /**
   * Enable the module (optional)
   * Called when module should start/resume operations
   * @returns {Promise<void>}
   */
  async enable() {
    // Optional override
  }

  /**
   * Disable the module (optional)
   * Called when module should pause/stop operations
   * @returns {Promise<void>}
   */
  async disable() {
    // Optional override
  }

  /**
   * Clean up and destroy the module
   * Called when extension unloads or module is removed
   * Remove event listeners, timers, DOM nodes, etc.
   * @returns {Promise<void>}
   */
  async destroy() {
    throw new Error('destroy() must be implemented');
  }
}

/**
 * Example module structure:
 * 
 * export function createMyModule({ dependencies, options, moduleManager, context }) {
 *   return {
 *     async init() {
 *       // Set up listeners, start timers, etc.
 *       this.listener = () => handleEvent();
 *       window.addEventListener('click', this.listener);
 *     },
 * 
 *     async enable() {
 *       // Resume operations
 *     },
 * 
 *     async disable() {
 *       // Pause operations
 *     },
 * 
 *     async destroy() {
 *       // Clean up
 *       window.removeEventListener('click', this.listener);
 *     },
 *   };
 * }
 * 
 * And register it in your bootstrap:
 * 
 * moduleManager.register('myModule', {
 *   factory: createMyModule,
 *   dependencies: ['someOtherModule'],
 *   enabled: true,
 *   options: { /* module-specific config * / },
 * });
 */

export default ModuleInterface;
