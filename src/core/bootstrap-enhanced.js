/**
 * Enhanced Bootstrap: Complete AI Coding Studio Integration
 * 
 * Integrates all modules in proper dependency order:
 * 1. Core infrastructure (storage, state, events)
 * 2. Configuration (config, localization, remote config)
 * 3. Prompt Library (foundation for content generation)
 * 4. Tool Runtime & Terminal Runtime (execution engines)
 * 5. Context Budget & Handoff (conversation management)
 * 6. Browser Automation (UI interaction)
 * 7. Markdown Skills & MCP Integration (advanced features)
 * 8. UI & Presentation (user interface)
 */

import ModuleManager from './ModuleManager.js';

// ============================================================================
// CORE INFRASTRUCTURE MODULES
// ============================================================================

import { createEventBusModule } from '../modules/core/EventBusModule.js';
import { createStorageModule } from '../modules/core/StorageModule.js';
import { createStateModule } from '../modules/core/StateModule.js';
import { createBridgeModule } from '../modules/core/BridgeModule.js';

// ============================================================================
// CONFIGURATION MODULES
// ============================================================================

import { createLocalizationModule } from '../modules/config/LocalizationModule.js';
import { createRemoteConfigModule } from '../modules/config/RemoteConfigModule.js';

// ============================================================================
// PROMPT LIBRARY & CONTENT GENERATION
// ============================================================================

import { createPromptLibraryModule } from '../modules/features/PromptLibraryModule.js';
import { createMarkdownSkillsModule } from '../modules/features/MarkdownSkillsModule.js';
import { createRetrievalContextModule } from '../modules/features/RetrievalContextModule.js';

// ============================================================================
// EXECUTION ENGINES
// ============================================================================

import { createToolRuntimeModule } from '../modules/features/ToolRuntimeModule.js';
import { createTerminalRuntimeModule } from '../modules/features/TerminalRuntimeModule.js';
import { createBrowserAutomationModule } from '../modules/features/BrowserAutomationModule.js';

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

import { createContextBudgetModule } from '../modules/features/ContextBudgetModule.js';
import { createHandoffModule } from '../modules/features/HandoffModule.js';

// ============================================================================
// INTEGRATION & PROTOCOL
// ============================================================================

import { createMcpIntegrationModule } from '../modules/features/McpIntegrationModule.js';

// ============================================================================
// LEGACY FEATURE MODULES
// ============================================================================

import { createCommandsModule } from '../modules/features/CommandsModule.js';
import { createMemoryModule } from '../modules/features/MemoryModule.js';
import { createFileReaderModule } from '../modules/features/FileReaderModule.js';
import { createDeepResearchModule } from '../modules/features/DeepResearchModule.js';
import { createAutoCodeModule } from '../modules/features/AutoCodeModule.js';
import { createAutoContinueModule } from '../modules/features/AutoContinueModule.js';

// ============================================================================
// UI MODULES
// ============================================================================

import { createUiModule } from '../modules/ui/UiModule.js';
import { createSettingsPanelModule } from '../modules/ui/SettingsPanelModule.js';
import { createMessageOverlayModule } from '../modules/ui/MessageOverlayModule.js';

/**
 * Create and configure the module manager with ALL modules
 * @returns {Promise<ModuleManager>}
 */
export async function bootstrapModules() {
  const manager = new ModuleManager();

  // ============================================================================
  // TIER 0: CORE INFRASTRUCTURE (No dependencies)
  // ============================================================================

  manager.register('eventBus', {
    factory: createEventBusModule,
    dependencies: [],
    enabled: true,
    options: { maxListeners: 100 },
  });

  manager.register('storage', {
    factory: createStorageModule,
    dependencies: [],
    enabled: true,
    options: { namespace: 'bds-ai-studio' },
  });

  // ============================================================================
  // TIER 1: CONFIGURATION (Depends: storage)
  // ============================================================================

  manager.register('state', {
    factory: createStateModule,
    dependencies: ['storage'],
    enabled: true,
  });

  manager.register('localization', {
    factory: createLocalizationModule,
    dependencies: ['storage'],
    enabled: true,
    options: { defaultLanguage: 'en' },
  });

  manager.register('remoteConfig', {
    factory: createRemoteConfigModule,
    dependencies: ['eventBus'],
    enabled: true,
    options: { refreshInterval: 3600000 },
  });

  // ============================================================================
  // TIER 2: CORE SERVICES (Depends: state, eventBus)
  // ============================================================================

  manager.register('bridge', {
    factory: createBridgeModule,
    dependencies: ['state', 'eventBus'],
    enabled: true,
  });

  // ============================================================================
  // TIER 3: PROMPT LIBRARY & CONTENT GENERATION
  // ============================================================================

  manager.register('promptLibrary', {
    factory: createPromptLibraryModule,
    dependencies: ['storage', 'state', 'eventBus'],
    enabled: true,
    options: {
      autoSync: true,
      cacheSuperPowers: true,
    },
  });

  manager.register('markdownSkills', {
    factory: createMarkdownSkillsModule,
    dependencies: ['promptLibrary', 'storage', 'eventBus'],
    enabled: true,
    options: {
      enableValidation: true,
      autoCompile: true,
    },
  });

  manager.register('retrievalContext', {
    factory: createRetrievalContextModule,
    dependencies: ['promptLibrary', 'eventBus'],
    enabled: true,
    options: {
      rankingModel: 'semantic-relevance',
      maxContextItems: 20,
    },
  });

  // ============================================================================
  // TIER 4: EXECUTION ENGINES
  // ============================================================================

  manager.register('toolRuntime', {
    factory: createToolRuntimeModule,
    dependencies: ['state', 'eventBus', 'promptLibrary'],
    enabled: true,
    options: {
      enableApprovalWorkflow: true,
      maxConcurrentTools: 5,
      timeoutMs: 30000,
    },
  });

  manager.register('terminalRuntime', {
    factory: createTerminalRuntimeModule,
    dependencies: ['state', 'eventBus', 'toolRuntime'],
    enabled: true,
    options: {
      enableLocalBridge: true,
      enableApproval: true,
      supportedPlatforms: ['Claude', 'ChatGPT', 'DeepSeek'],
    },
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
  // TIER 5: CONVERSATION MANAGEMENT
  // ============================================================================

  manager.register('contextBudget', {
    factory: createContextBudgetModule,
    dependencies: ['state', 'eventBus', 'promptLibrary'],
    enabled: true,
    options: {
      enableEstimation: true,
      enableTrimming: true,
      defaultProvider: 'claude-3-opus',
    },
  });

  manager.register('handoff', {
    factory: createHandoffModule,
    dependencies: ['contextBudget', 'state', 'eventBus'],
    enabled: true,
    options: {
      enableConversationTransition: true,
      maxHandoffChain: 3,
    },
  });

  // ============================================================================
  // TIER 6: INTEGRATION & PROTOCOLS
  // ============================================================================

  manager.register('mcpIntegration', {
    factory: createMcpIntegrationModule,
    dependencies: ['toolRuntime', 'eventBus', 'state'],
    enabled: true,
    options: {
      enableToolIntegration: true,
      enableServerConfig: true,
      supportedTransports: ['stdio', 'sse'],
    },
  });

  // ============================================================================
  // TIER 7: LEGACY FEATURE MODULES
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

  manager.register('deepResearch', {
    factory: createDeepResearchModule,
    dependencies: ['state', 'eventBus', 'commands'],
    enabled: true,
  });

  manager.register('autoCode', {
    factory: createAutoCodeModule,
    dependencies: ['state', 'eventBus', 'toolRuntime'],
    enabled: true,
  });

  manager.register('autoContinue', {
    factory: createAutoContinueModule,
    dependencies: ['eventBus', 'state', 'storage'],
    enabled: true,
    options: {
      policy: 'manual', // 'manual' | 'automatic' | 'policy-controlled'
      safetyLimits: {
        maxRetries: 3,
        maxBackoffMs: 30000,
        maxContinuations: 10,
      },
    },
  });

  // ============================================================================
  // TIER 8: USER INTERFACE
  // ============================================================================

  manager.register('ui', {
    factory: createUiModule,
    dependencies: ['state', 'eventBus', 'localization'],
    enabled: true,
  });

  manager.register('settingsPanel', {
    factory: createSettingsPanelModule,
    dependencies: ['ui', 'storage', 'state', 'remoteConfig'],
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
    platform: detectCurrentPlatform(),
  };

  await manager.init(context);

  // ============================================================================
  // CROSS-MODULE INITIALIZATION
  // ============================================================================

  // Set up inter-module communication bridges
  setupModuleBridges(manager);

  return manager;
}

/**
 * Detect current platform
 */
function detectCurrentPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('claude.ai')) return 'claude';
  if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'chatgpt';
  if (hostname.includes('deepseek.com')) return 'deepseek';
  return 'unknown';
}

/**
 * Set up communication bridges between related modules
 */
function setupModuleBridges(manager) {
  try {
    const eventBus = manager.get('eventBus');
    const toolRuntime = manager.get('toolRuntime');
    const terminalRuntime = manager.get('terminalRuntime');
    const mcpIntegration = manager.get('mcpIntegration');
    const browserAutomation = manager.get('browserAutomation');
    const promptLibrary = manager.get('promptLibrary');

    // Tool Runtime → MCP Integration
    eventBus.on('toolRuntime:toolRegistered', (data) => {
      eventBus.emit('mcpIntegration:toolAvailable', data);
    });

    // Tool Runtime → Terminal Runtime
    eventBus.on('toolRuntime:executionStarted', (data) => {
      eventBus.emit('terminalRuntime:toolExecution', data);
    });

    // Browser Automation → Tool Runtime
    eventBus.on('browserAutomation:actionCompleted', (data) => {
      eventBus.emit('toolRuntime:uiInteractionComplete', data);
    });

    // Prompt Library → Tool Runtime (prompts available)
    eventBus.on('promptLibrary:ready', (data) => {
      eventBus.emit('toolRuntime:promptsAvailable', data);
    });

    // MCP Integration ↔ Tool Runtime bidirectional
    eventBus.on('mcpIntegration:ready', (data) => {
      eventBus.emit('toolRuntime:mcpReady', data);
    });

    // Auto Continue ↔ Browser Automation (for response detection)
    eventBus.on('autoContinue:completionDetected', (data) => {
      eventBus.emit('browserAutomation:continuationNeeded', data);
    });

    // Auto Continue → Tool Runtime (for continuation execution)
    eventBus.on('autoContinue:continuationRequested', (data) => {
      eventBus.emit('toolRuntime:continuationRequest', data);
    });

    console.log('[Bootstrap] Module bridges initialized');
  } catch (error) {
    console.warn('[Bootstrap] Some module bridges could not be established:', error);
  }
}

export default bootstrapModules;
