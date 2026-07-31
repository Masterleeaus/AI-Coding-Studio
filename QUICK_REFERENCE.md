# Quick Reference

## Module Manager API

```javascript
// Initialize all modules
const manager = new ModuleManager();
manager.register(name, config);
await manager.init(context);

// Get module
const myModule = manager.get('moduleName');

// Check status
const status = manager.getStatus();

// Runtime control
await manager.enable('moduleName');
await manager.disable('moduleName');
await manager.destroy();

// Listen for events
manager.on('module:initialized', ({ module, instance }) => {});
manager.on('module:error', ({ module, error }) => {});
```

## EventBus API

```javascript
const eventBus = moduleManager.get('eventBus');

// Listen
eventBus.on('event:name', (data) => {});

// One-time listen
eventBus.once('event:name', (data) => {});

// Emit
eventBus.emit('event:name', { data });

// Unsubscribe
eventBus.off('event:name', handler);

// Remove all
eventBus.removeAllListeners('event:name');
eventBus.removeAllListeners(); // all events
```

## Browser Automation API

```javascript
const automation = moduleManager.get('browserAutomation');

// Get platform
const platform = automation.getPlatform(); // 'claude' | 'chatgpt' | 'deepseek'

// Execute action
await automation.execute({
  type: 'type' | 'click' | 'scroll' | 'getMessages' | 'getInput',
  text?: 'text to type',
  selector?: '#element-id',
  targetSelector?: 'input.search',
});

// Session management
await automation.startSession('session-id', tabId);
await automation.closeSession('session-id');

// Events
eventBus.on('browserAutomation:ready', ({ platform }) => {});
eventBus.on('browserAutomation:actionCompleted', ({ action, result }) => {});
eventBus.on('browserAutomation:actionFailed', ({ action, error }) => {});
eventBus.on('browserAutomation:enabled', () => {});
eventBus.on('browserAutomation:disabled', () => {});
```

## State Module API

```javascript
const state = moduleManager.get('state');

// Get value
const value = state.get('key');

// Set value (returns promise)
await state.set('key', value);

// Get all
const all = state.getAll();
```

## Storage Module API

```javascript
const storage = moduleManager.get('storage');

// Get (promise-based)
const data = await storage.get(['key1', 'key2']);
const all = await storage.get(null);

// Set
await storage.set({ key: value });

// Remove
await storage.remove(['key1', 'key2']);

// Clear all
await storage.clear();

// Listen for changes
const unsubscribe = storage.onChange((changes, areaName) => {
  console.log(changes);
});
unsubscribe(); // stop listening
```

## Creating a Module

```javascript
export function createMyModule({ dependencies, options, moduleManager, context }) {
  // Access dependencies
  const { eventBus, state, storage } = dependencies;
  
  return {
    async init() {
      // Required: Initialize
    },

    async enable() {
      // Optional: Enable operations
    },

    async disable() {
      // Optional: Pause operations
    },

    async destroy() {
      // Required: Clean up
    },

    // Public API
    async myPublicMethod() {
      return 'result';
    },
  };
}
```

## Registering a Module

```javascript
// In bootstrap.js
manager.register('moduleName', {
  factory: createMyModule,
  dependencies: ['eventBus', 'state'],
  enabled: true,
  options: { /* config */ },
});
```

## Debugging

```javascript
// In DevTools Console

// Get module manager
const mm = window.__bdsModuleManager;

// Get all modules
const modules = mm.getAll();

// Check status
console.table(mm.getStatus());

// Test a module
const test = mm.get('browserAutomation');
await test.execute({ type: 'scroll' });

// Listen to all events
const events = mm.get('eventBus');
const handler = (data) => console.log('EVENT:', data);
events.on('module:initialized', handler);
events.on('module:error', handler);
```

## Platform Detection

```javascript
// Automatic (runs on init)
const platform = automation.getPlatform();

// Manual
function detectCurrentPlatform() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('claude.ai')) return 'claude';
  if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'chatgpt';
  if (hostname.includes('deepseek.com')) return 'deepseek';
  
  return 'unknown';
}
```

## Platform-Specific Selectors

### Claude
```javascript
input: 'textarea[placeholder*="Message"]'
messages: '[data-test-id*="message"]'
```

### ChatGPT
```javascript
input: 'textarea[placeholder*="Message"]'
messages: '[data-message-author-role]'
```

### DeepSeek
```javascript
input: 'textarea[placeholder*="Message"]'
messages: '[class*="message"]'
```

## Common Patterns

### Wait for Module
```javascript
const automation = await new Promise(resolve => {
  const check = () => {
    try {
      resolve(moduleManager.get('browserAutomation'));
    } catch {
      setTimeout(check, 100);
    }
  };
  check();
});
```

### Listen for Initialization
```javascript
eventBus.once('browserAutomation:ready', ({ platform }) => {
  console.log(`Ready on: ${platform}`);
});
```

### Handle Errors
```javascript
eventBus.on('module:error', ({ module, error }) => {
  console.error(`Module ${module} failed:`, error);
});

eventBus.on('browserAutomation:actionFailed', ({ action, error }) => {
  console.error(`Action ${action.type} failed:`, error);
});
```

### Execute with Fallback
```javascript
try {
  await automation.execute({ type: 'click', selector: '.button' });
} catch (error) {
  console.error('Action failed:', error);
  // Handle error
}
```

## File Structure

```
better-deepseek-modular/
├── src/
│   ├── core/
│   │   ├── ModuleManager.js
│   │   ├── EventEmitter.js
│   │   ├── ModuleInterface.js
│   │   └── bootstrap.js
│   └── modules/
│       ├── core/
│       │   ├── StorageModule.js
│       │   ├── StateModule.js
│       │   ├── BridgeModule.js
│       │   └── EventBusModule.js
│       ├── features/
│       │   ├── BrowserAutomationModule.js
│       │   ├── CommandsModule.js
│       │   ├── MemoryModule.js
│       │   └── ...
│       ├── ui/
│       │   └── ...
│       └── config/
│           └── ...
├── manifest-multiplatform.json
├── MULTIPLATFORM_GUIDE.md
├── README.md
└── QUICK_REFERENCE.md
```

## Manifest Configuration

### Universal (Recommended)
```json
{
  "manifest_version": 3,
  "host_permissions": [
    "https://claude.ai/*",
    "https://chatgpt.com/*",
    "https://openai.com/*",
    "https://chat.deepseek.com/*"
  ]
}
```

### Single Platform
```json
{
  "manifest_version": 3,
  "host_permissions": ["https://claude.ai/*"]
}
```

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Platform detected correctly
- [ ] ModuleManager initializes all modules
- [ ] Browser automation available
- [ ] Can execute click action
- [ ] Can execute type action
- [ ] Can scroll to bottom
- [ ] EventBus emitting events
- [ ] Storage persists data
- [ ] State manages application state

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Platform not detected | Check `detectCurrentPlatform()` logic |
| Module not found | Verify module registered before use |
| Selector not matching | Update adapter selectors in browser dev tools |
| Events not firing | Ensure eventBus module initialized |
| Storage returns null | Use `await storage.get(keys)` |
| Action timeout | Increase `timeoutMs` in action |
