/**
 * BrowserAutomationModule: Multi-platform browser automation
 * 
 * Supports Claude (claude.ai), ChatGPT (openai.com), and DeepSeek (chat.deepseek.com)
 * 
 * Platform detection strategy:
 * 1. Check window.location.hostname
 * 2. Detect platform-specific UI elements
 * 3. Fall back to content script messaging
 */

export function createBrowserAutomationModule({ dependencies, options, moduleManager, context }) {
  const { eventBus, state } = dependencies;
  
  let platformAdapter = null;
  let automationEngine = null;
  const listeners = [];

  return {
    async init() {
      // Detect current platform
      const platform = detectCurrentPlatform();
      console.log(`[BrowserAutomation] Detected platform: ${platform}`);

      // Create platform-specific adapter
      platformAdapter = createPlatformAdapter(platform);
      
      // Initialize automation engine
      automationEngine = new BrowserAutomationEngine({
        adapter: platformAdapter,
        eventBus,
        state,
        platform,
      });

      // Listen for browser automation requests from content scripts
      const messageHandler = (message, sender, sendResponse) => {
        if (message.namespace === 'browser-automation') {
          handleAutomationRequest(message, sender, sendResponse);
        }
      };

      chrome.runtime.onMessage.addListener(messageHandler);
      listeners.push(() => chrome.runtime.onMessage.removeListener(messageHandler));

      // Emit initialization event
      eventBus.emit('browserAutomation:ready', { platform });
    },

    async enable() {
      if (automationEngine) {
        automationEngine.setEnabled(true);
      }
      eventBus.emit('browserAutomation:enabled');
    },

    async disable() {
      if (automationEngine) {
        automationEngine.setEnabled(false);
      }
      eventBus.emit('browserAutomation:disabled');
    },

    // Public API
    async execute(action) {
      if (!automationEngine) throw new Error('Automation engine not initialized');
      return automationEngine.execute(action);
    },

    async startSession(sessionId, tabId) {
      if (!automationEngine) throw new Error('Automation engine not initialized');
      return automationEngine.startSession(sessionId, tabId);
    },

    async closeSession(sessionId) {
      if (!automationEngine) throw new Error('Automation engine not initialized');
      return automationEngine.closeSession(sessionId);
    },

    getPlatform() {
      return platformAdapter?.platform || 'unknown';
    },

    async destroy() {
      listeners.forEach(unsubscribe => unsubscribe());
      listeners.length = 0;
      
      if (automationEngine) {
        await automationEngine.destroy();
      }
    },
  };
}

/**
 * Detect which AI platform we're running on
 */
function detectCurrentPlatform() {
  const hostname = window.location.hostname;

  if (hostname.includes('claude.ai')) {
    return 'claude';
  } else if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
    return 'chatgpt';
  } else if (hostname.includes('deepseek.com')) {
    return 'deepseek';
  }

  // Fallback: detect by UI elements
  if (document.querySelector('[data-testid*="claude"]')) {
    return 'claude';
  }
  if (document.querySelector('[data-testid*="openai"]')) {
    return 'chatgpt';
  }

  return 'unknown';
}

/**
 * Create platform-specific adapter
 */
function createPlatformAdapter(platform) {
  const adapters = {
    claude: createClaudeAdapter,
    chatgpt: createChatGPTAdapter,
    deepseek: createDeepSeekAdapter,
  };

  const factory = adapters[platform];
  if (!factory) {
    console.warn(`[BrowserAutomation] Unknown platform: ${platform}, using generic adapter`);
    return createGenericAdapter(platform);
  }

  return factory();
}

/**
 * Claude platform adapter
 */
function createClaudeAdapter() {
  return {
    platform: 'claude',
    
    async getActiveChat() {
      // Find Claude's active conversation element
      const chatContainer = document.querySelector('[data-test-id="chat"]') ||
                           document.querySelector('[class*="chat"][class*="container"]');
      return chatContainer ? { id: 'claude-chat', visible: true } : null;
    },

    async findInputField() {
      // Claude's input field selectors
      return document.querySelector('textarea[placeholder*="Message"]') ||
             document.querySelector('[contenteditable="true"]') ||
             document.querySelector('input[type="text"]');
    },

    async findMessageElements() {
      // Find all message elements in Claude's interface
      return Array.from(document.querySelectorAll(
        '[data-test-id*="message"], [class*="message"][class*="container"]'
      ));
    },

    async clickElement(selector) {
      const element = typeof selector === 'string' 
        ? document.querySelector(selector)
        : selector;
      
      if (!element) throw new Error(`Element not found: ${selector}`);
      
      element.click();
      // Wait for potential UI updates
      await new Promise(r => setTimeout(r, 100));
    },

    async typeText(text, targetSelector) {
      const target = typeof targetSelector === 'string'
        ? document.querySelector(targetSelector)
        : targetSelector || await this.findInputField();

      if (!target) throw new Error('Input field not found');

      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        target.value = text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (target.contentEditable) {
        target.textContent = text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }

      await new Promise(r => setTimeout(r, 50));
    },

    async scrollToBottom() {
      const container = document.querySelector('[data-test-id="chat"]') ||
                       document.querySelector('[class*="messages"][class*="container"]');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },
  };
}

/**
 * ChatGPT platform adapter
 */
function createChatGPTAdapter() {
  return {
    platform: 'chatgpt',

    async getActiveChat() {
      const chatArea = document.querySelector('[class*="chat-container"]') ||
                      document.querySelector('main');
      return chatArea ? { id: 'chatgpt-chat', visible: true } : null;
    },

    async findInputField() {
      // ChatGPT's input field
      return document.querySelector('textarea[placeholder*="Message"]') ||
             document.querySelector('textarea[placeholder*="ChatGPT"]') ||
             document.querySelector('textarea');
    },

    async findMessageElements() {
      // OpenAI's message structure
      return Array.from(document.querySelectorAll(
        '[data-message-author-role], .group[class*="message"]'
      ));
    },

    async clickElement(selector) {
      const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

      if (!element) throw new Error(`Element not found: ${selector}`);

      element.click();
      await new Promise(r => setTimeout(r, 100));
    },

    async typeText(text, targetSelector) {
      const target = typeof targetSelector === 'string'
        ? document.querySelector(targetSelector)
        : targetSelector || await this.findInputField();

      if (!target) throw new Error('Input field not found');

      target.value = text;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.focus();

      await new Promise(r => setTimeout(r, 50));
    },

    async scrollToBottom() {
      const container = document.querySelector('main') ||
                       document.querySelector('[role="main"]');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },
  };
}

/**
 * DeepSeek platform adapter
 */
function createDeepSeekAdapter() {
  return {
    platform: 'deepseek',

    async getActiveChat() {
      const chatArea = document.querySelector('[class*="chat"]');
      return chatArea ? { id: 'deepseek-chat', visible: true } : null;
    },

    async findInputField() {
      // DeepSeek's input selector
      return document.querySelector('textarea[placeholder*="Message"]') ||
             document.querySelector('[contenteditable="true"]') ||
             document.querySelector('textarea');
    },

    async findMessageElements() {
      return Array.from(document.querySelectorAll(
        '[class*="message"], [data-test-id*="message"]'
      ));
    },

    async clickElement(selector) {
      const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

      if (!element) throw new Error(`Element not found: ${selector}`);

      element.click();
      await new Promise(r => setTimeout(r, 100));
    },

    async typeText(text, targetSelector) {
      const target = typeof targetSelector === 'string'
        ? document.querySelector(targetSelector)
        : targetSelector || await this.findInputField();

      if (!target) throw new Error('Input field not found');

      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        target.value = text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (target.contentEditable) {
        target.textContent = text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }

      await new Promise(r => setTimeout(r, 50));
    },

    async scrollToBottom() {
      const container = document.querySelector('[class*="messages"]');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },
  };
}

/**
 * Generic fallback adapter
 */
function createGenericAdapter(platform) {
  return {
    platform,

    async getActiveChat() {
      return { id: 'generic-chat', visible: true };
    },

    async findInputField() {
      return document.querySelector('textarea') ||
             document.querySelector('input[type="text"]') ||
             document.querySelector('[contenteditable="true"]');
    },

    async findMessageElements() {
      return Array.from(document.querySelectorAll('[class*="message"]'));
    },

    async clickElement(selector) {
      const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

      if (element) element.click();
    },

    async typeText(text, targetSelector) {
      const target = typeof targetSelector === 'string'
        ? document.querySelector(targetSelector)
        : targetSelector || await this.findInputField();

      if (target) {
        if (target.tagName === 'TEXTAREA') {
          target.value = text;
          target.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (target.contentEditable) {
          target.textContent = text;
        }
      }
    },

    async scrollToBottom() {
      document.documentElement.scrollTop = document.documentElement.scrollHeight;
    },
  };
}

/**
 * Browser Automation Engine
 */
class BrowserAutomationEngine {
  constructor(config) {
    this.adapter = config.adapter;
    this.eventBus = config.eventBus;
    this.state = config.state;
    this.platform = config.platform;
    this.enabled = true;
    this.sessions = new Map();
  }

  async execute(action) {
    if (!this.enabled) {
      throw new Error('Browser automation is disabled');
    }

    try {
      const result = await this._executeAction(action);
      this.eventBus.emit('browserAutomation:actionCompleted', { action, result });
      return result;
    } catch (error) {
      this.eventBus.emit('browserAutomation:actionFailed', { action, error });
      throw error;
    }
  }

  async _executeAction(action) {
    switch (action.type) {
      case 'click':
        return this.adapter.clickElement(action.selector);

      case 'type':
        return this.adapter.typeText(action.text, action.targetSelector);

      case 'scroll':
        return this.adapter.scrollToBottom();

      case 'getMessages':
        return this.adapter.findMessageElements();

      case 'getInput':
        return this.adapter.findInputField();

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async startSession(sessionId, tabId) {
    this.sessions.set(sessionId, {
      id: sessionId,
      tabId,
      startedAt: Date.now(),
      actions: [],
    });
    return this.sessions.get(sessionId);
  }

  async closeSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  async destroy() {
    this.sessions.clear();
  }
}

/**
 * Handle incoming automation requests
 */
async function handleAutomationRequest(message, sender, sendResponse) {
  try {
    // Validate sender origin
    if (!message.sessionId || !message.action) {
      sendResponse({ ok: false, error: { code: 'INVALID_REQUEST' } });
      return;
    }

    // Route to appropriate handler
    const result = await routeAutomationRequest(message);
    sendResponse({ ok: true, data: result });
  } catch (error) {
    sendResponse({
      ok: false,
      error: {
        code: error.code || 'AUTOMATION_ERROR',
        message: error.message,
      },
    });
  }
}

/**
 * Route automation requests to handlers
 */
async function routeAutomationRequest(message) {
  // This would be implemented by the actual BrowserAutomationEngine
  throw new Error('Handler not implemented');
}

export default createBrowserAutomationModule;
