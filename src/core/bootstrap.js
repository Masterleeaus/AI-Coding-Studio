/**
 * Bootstrap: Extension initialization and module loading
 * 
 * Coordinates the loading of all extension modules in dependency order
 * Provides a centralized place to configure which modules are active
 */

import ModuleManager from './ModuleManager.js';

// Core modules
import { createStorageModule } from '../modules/core/StorageModule.js';
import { createStateModule } from '../modules/core/StateModule.js';
import { createBridgeModule } from '../modules/core/BridgeModule.js';
import { createEventBusModule } from '../modules/core/EventBusModule.js';

// Feature modules
import { createCommandsModule } from '../modules/features/CommandsModule.js';
import { createMemoryModule } from '../modules/features/MemoryModule.js';
import { createFileReaderModule } from '../modules/features/FileReaderModule.js';
import { createToolsModule } from '../modules/features/ToolsModule.js';
import { createDeepResearchModule } from '../modules/features/DeepResearchModule.js';
import { createAutoCodeModule } from '../modules/features/AutoCodeModule.js';
import { createBrowserAutomationModule } from '../modules/features/BrowserAutomationModule.js';

// UI modules
import { createUiModule } from '../modules/ui/UiModule.js';
import { createSettingsPanelModule } from '../modules/ui/SettingsPanelModule.js';
import { createMessageOverlayModule } from '../modules/ui/MessageOverlayModule.js';

// Configuration modules
import { createRemoteConfigModule } from '../modules/config/RemoteConfigModule.js';
import { createLocalizationModule } from '../modules/config/LocalizationModule.js';

/**
 * Create and configure the module manager with all modules
 * @returns {ModuleManager}
 */
export async function bootstrapModules() {
  const manager = new ModuleManager();

  // ============================================================================
  // CORE MODULES (No dependencies)
  // ============================================================================

  manager.register('eventBus', {
    factory: createEventBusModule,
    dependencies: [],
    enabled: true,
  });

  manager.register('storage', {
    factory: createStorageModule,
    dependencies: [],
    enabled: true,
  });

  manager.register('state', {
    factory: createStateModule,
    dependencies: ['storage'],
    enabled: true,
  });

  manager.register('bridge', {
    factory: createBridgeModule,
    dependencies: ['state', 'eventBus'],
    enabled: true,
  });

  // ============================================================================
  // CONFIGURATION MODULES
  // ============================================================================

  manager.register('localization', {
    factory: createLocalizationModule,
    dependencies: ['storage'],
    enabled: true,
  });

  manager.register('remoteConfig', {
    factory: createRemoteConfigModule,
    dependencies: ['eventBus'],
    enabled: true,
  });

  // ============================================================================
  // FEATURE MODULES
  // ============================================================================

  manager.register('commands', {
    factory: createCommandsModule,
    dependencies: ['state', 'eventBus', 'bridge'],
    enabled: true,
  });

  manager.register('memory', {
    factory: createMemoryModule,
    dependencies: ['storage', 'state', 'eventBus'],
    enabled: true,
  });

  manager.register('fileReader', {
    factory: createFileReaderModule,
    dependencies: ['eventBus', 'state'],
    enabled: true,
  });

  manager.register('tools', {
    factory: createToolsModule,
    dependencies: ['state', 'eventBus'],
    enabled: true,
  });

  manager.register('autoCode', {
    factory: createAutoCodeModule,
    dependencies: ['state', 'eventBus', 'tools'],
    enabled: true,
  });

  manager.register('deepResearch', {
    factory: createDeepResearchModule,
    dependencies: ['state', 'eventBus', 'commands'],
    enabled: true,
  });

  manager.register('browserAutomation', {
    factory: createBrowserAutomationModule,
    dependencies: ['eventBus', 'state'],
    enabled: true,
    options: {
      supportsMultiplePlatforms: true,
      platforms: ['claude', 'chatgpt', 'deepseek'],
    },
  });

  // ============================================================================
  // UI MODULES
  // ============================================================================

  manager.register('ui', {
    factory: createUiModule,
    dependencies: ['state', 'eventBus', 'localization'],
    enabled: true,
  });

  manager.register('settingsPanel', {
    factory: createSettingsPanelModule,
    dependencies: ['ui', 'storage', 'state'],
    enabled: true,
  });

  manager.register('messageOverlay', {
    factory: createMessageOverlayModule,
    dependencies: ['ui', 'eventBus'],
    enabled: true,
  });

  // ============================================================================
  // INITIALIZE ALL MODULES
  // ============================================================================

  const context = {
    document,
    window,
    chrome,
    version: chrome.runtime.getManifest?.().version,
  };

  await manager.init(context);

  return manager;
}

export default bootstrapModules;
