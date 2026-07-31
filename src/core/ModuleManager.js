/**
 * ModuleManager: Central orchestrator for the modular extension architecture
 * 
 * Responsibilities:
 * - Register and load modules
 * - Manage module lifecycle (init, enable, disable, destroy)
 * - Handle module dependencies
 * - Provide centralized access to module instances
 * - Emit lifecycle events for module coordination
 */

import { EventEmitter } from './EventEmitter.js';

export class ModuleManager extends EventEmitter {
  constructor() {
    super();
    this.modules = new Map(); // module name -> module instance
    this.moduleConfigs = new Map(); // module name -> config
    this.loadOrder = []; // ordered list of loaded modules
    this.initialized = false;
    this.logger = this._createLogger();
  }

  _createLogger() {
    return {
      debug: (msg, data) => console.debug(`[ModuleManager] ${msg}`, data || ''),
      info: (msg, data) => console.info(`[ModuleManager] ${msg}`, data || ''),
      warn: (msg, data) => console.warn(`[ModuleManager] ${msg}`, data || ''),
      error: (msg, data) => console.error(`[ModuleManager] ${msg}`, data || ''),
    };
  }

  /**
   * Register a module configuration
   * @param {string} name - Unique module identifier
   * @param {Object} config - Module configuration
   * @param {Function} config.factory - Factory function that creates module instance
   * @param {Array<string>} config.dependencies - Array of module names this depends on
   * @param {boolean} config.enabled - Whether module starts enabled (default: true)
   * @param {Object} config.options - Module-specific configuration
   */
  register(name, config) {
    if (this.modules.has(name)) {
      throw new Error(`Module "${name}" is already registered`);
    }

    if (!config.factory || typeof config.factory !== 'function') {
      throw new Error(`Module "${name}" must provide a factory function`);
    }

    this.moduleConfigs.set(name, {
      factory: config.factory,
      dependencies: config.dependencies || [],
      enabled: config.enabled !== false,
      options: config.options || {},
    });

    this.logger.debug(`Registered module: ${name}`, { dependencies: config.dependencies });
  }

  /**
   * Initialize all registered modules in dependency order
   * @param {Object} context - Shared context available to all modules
   * @returns {Promise<void>}
   */
  async init(context = {}) {
    if (this.initialized) {
      this.logger.warn('ModuleManager already initialized');
      return;
    }

    try {
      this.logger.info('Starting module initialization...');
      
      // Resolve dependency order
      const loadOrder = this._resolveDependencies();
      this.loadOrder = loadOrder;

      // Create and initialize modules
      for (const moduleName of loadOrder) {
        const config = this.moduleConfigs.get(moduleName);
        
        if (!config.enabled) {
          this.logger.debug(`Skipping disabled module: ${moduleName}`);
          continue;
        }

        try {
          await this._initializeModule(moduleName, context);
        } catch (error) {
          this.logger.error(`Failed to initialize module "${moduleName}":`, error);
          // Continue with other modules, but emit error event
          this.emit('module:error', { module: moduleName, error });
        }
      }

      this.initialized = true;
      this.emit('initialized');
      this.logger.info('Module initialization complete');
    } catch (error) {
      this.logger.error('Module initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize a single module
   */
  async _initializeModule(name, context) {
    const config = this.moduleConfigs.get(name);
    const dependencies = this._getDependencyInstances(name);

    this.logger.debug(`Initializing module: ${name}`);
    
    const instance = await config.factory({
      dependencies,
      options: config.options,
      moduleManager: this,
      context,
    });

    // Validate module interface
    if (!instance || typeof instance.destroy !== 'function') {
      throw new Error(`Module "${name}" must implement destroy() method`);
    }

    this.modules.set(name, instance);
    
    // Call module's init if available
    if (typeof instance.init === 'function') {
      await instance.init();
    }

    this.emit('module:initialized', { module: name, instance });
    this.logger.debug(`Module initialized: ${name}`);
  }

  /**
   * Get instances of dependent modules
   */
  _getDependencyInstances(moduleName) {
    const config = this.moduleConfigs.get(moduleName);
    const dependencies = {};

    for (const depName of config.dependencies) {
      if (!this.modules.has(depName)) {
        throw new Error(`Module "${moduleName}" depends on "${depName}" which is not initialized`);
      }
      dependencies[depName] = this.modules.get(depName);
    }

    return dependencies;
  }

  /**
   * Resolve module load order using topological sort
   */
  _resolveDependencies() {
    const visited = new Set();
    const stack = [];

    const visit = (moduleName) => {
      if (visited.has(moduleName)) return;
      visited.add(moduleName);

      const config = this.moduleConfigs.get(moduleName);
      if (!config) {
        throw new Error(`Unknown module: ${moduleName}`);
      }

      for (const dep of config.dependencies) {
        visit(dep);
      }

      stack.push(moduleName);
    };

    for (const moduleName of this.moduleConfigs.keys()) {
      visit(moduleName);
    }

    return stack;
  }

  /**
   * Get a module instance by name
   */
  get(name) {
    if (!this.modules.has(name)) {
      throw new Error(`Module "${name}" not found`);
    }
    return this.modules.get(name);
  }

  /**
   * Check if a module is loaded
   */
  has(name) {
    return this.modules.has(name);
  }

  /**
   * Enable a module at runtime
   */
  async enable(name) {
    if (!this.modules.has(name)) {
      throw new Error(`Module "${name}" not found`);
    }

    const instance = this.modules.get(name);
    if (typeof instance.enable === 'function') {
      await instance.enable();
    }

    this.emit('module:enabled', { module: name });
  }

  /**
   * Disable a module at runtime
   */
  async disable(name) {
    if (!this.modules.has(name)) {
      throw new Error(`Module "${name}" not found`);
    }

    const instance = this.modules.get(name);
    if (typeof instance.disable === 'function') {
      await instance.disable();
    }

    this.emit('module:disabled', { module: name });
  }

  /**
   * Get all loaded modules
   */
  getAll() {
    return Array.from(this.modules.entries()).map(([name, instance]) => ({
      name,
      instance,
      config: this.moduleConfigs.get(name),
    }));
  }

  /**
   * Destroy all modules and clean up
   */
  async destroy() {
    this.logger.info('Destroying all modules...');
    
    // Destroy in reverse order
    for (let i = this.loadOrder.length - 1; i >= 0; i--) {
      const moduleName = this.loadOrder[i];
      const instance = this.modules.get(moduleName);
      
      if (instance) {
        try {
          await instance.destroy();
          this.logger.debug(`Module destroyed: ${moduleName}`);
        } catch (error) {
          this.logger.error(`Error destroying module "${moduleName}":`, error);
        }
      }
    }

    this.modules.clear();
    this.initialized = false;
    this.emit('destroyed');
  }

  /**
   * Get module loading status
   */
  getStatus() {
    const status = {
      initialized: this.initialized,
      total: this.moduleConfigs.size,
      loaded: this.modules.size,
      modules: {},
    };

    for (const [name, config] of this.moduleConfigs.entries()) {
      status.modules[name] = {
        loaded: this.modules.has(name),
        enabled: config.enabled,
        dependencies: config.dependencies,
      };
    }

    return status;
  }
}

export default ModuleManager;
