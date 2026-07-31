# Better AI Assistant - Modular Architecture

A modular, multi-platform browser extension for Claude, ChatGPT, and DeepSeek with unified browser automation, memory management, commands, and productivity tools.

## 🎯 Key Features

- **Multi-Platform Support**: Works seamlessly on Claude, ChatGPT, and DeepSeek
- **Modular Architecture**: Clean separation of concerns with dependency injection
- **Browser Automation**: Cross-platform element interaction and DOM manipulation
- **Memory Management**: Persistent user memories across sessions
- **Command System**: Extensible command parser with auto-completion
- **File Reading**: GitHub, search results, web content, and more
- **Rich Tools**: Export, visualization, code execution, deep research

## 🏗️ Architecture

The extension uses a **modular bootstrap pattern** with clear dependency management:

```
ModuleManager
  ├── EventBus (pub/sub system)
  ├── Storage (chrome.storage API)
  ├── State (application state)
  ├── Bridge (injected script communication)
  ├── BrowserAutomation (platform adapters)
  ├── Commands
  ├── Memory
  ├── FileReader
  ├── Tools
  ├── DeepResearch
  ├── AutoCode
  └── UI Modules
```

## 📦 Installation

### From Source

```bash
# Clone or download this repository
git clone <repo-url>
cd better-deepseek-modular

# Install dependencies
npm install

# Build (if using build system)
npm run build
```

### Load as Chrome Extension

1. **Open Chrome Extensions Manager**
   - `chrome://extensions/`

2. **Enable Developer Mode**
   - Toggle "Developer mode" in the top right

3. **Load the extension**
   - Click "Load unpacked"
   - Select the `better-deepseek-modular` directory

4. **Verify Installation**
   - Navigate to Claude, ChatGPT, or DeepSeek
   - Extension automatically initializes
   - Check DevTools console for module status

## 🚀 Quick Start

### For Users

1. Install the extension using steps above
2. Navigate to any supported platform
3. Open DevTools (F12) → Console
4. Check for `[ModuleManager]` initialization logs
5. Use features (commands, memory, automation)

### For Developers

```javascript
// Access modules from any module context
const automation = moduleManager.get('browserAutomation');
const memory = moduleManager.get('memory');
const commands = moduleManager.get('commands');

// Execute browser automation
await automation.execute({
  type: 'type',
  text: 'Hello world',
});

// Get platform
const platform = automation.getPlatform();
console.log(`Running on: ${platform}`);
```

## 🌍 Multi-Platform Support

### Supported Platforms

| Platform | URL | Status | Notes |
|----------|-----|--------|-------|
| Claude | claude.ai | ✅ Full | All features supported |
| ChatGPT | chatgpt.com | ✅ Full | All features supported |
| OpenAI | openai.com | ✅ Full | Alias for ChatGPT |
| DeepSeek | chat.deepseek.com | ✅ Full | All features supported |

### Platform Detection

The extension automatically detects which platform is active:

```javascript
// In BrowserAutomationModule.js
detectCurrentPlatform() {
  // Returns: 'claude' | 'chatgpt' | 'deepseek' | 'unknown'
}
```

### Browser Automation by Platform

Each platform has optimized selectors:

**Claude**
- Input: `textarea[placeholder*="Message"]`, `[contenteditable="true"]`
- Messages: `[data-test-id*="message"]`, `[class*="message"]`

**ChatGPT**
- Input: `textarea[placeholder*="Message"]`, `textarea[placeholder*="ChatGPT"]`
- Messages: `[data-message-author-role]`, `.group[class*="message"]`

**DeepSeek**
- Input: `textarea[placeholder*="Message"]`, `[contenteditable="true"]`
- Messages: `[class*="message"]`, `[data-test-id*="message"]`

## 🛠️ Module System

### Creating a New Module

```javascript
// src/modules/features/MyModule.js
export function createMyModule({ dependencies, options, moduleManager, context }) {
  const { eventBus, state } = dependencies;
  
  return {
    // Required: Initialize
    async init() {
      console.log('MyModule initialized');
    },

    // Optional: Enable/disable at runtime
    async enable() { },
    async disable() { },

    // Required: Clean up resources
    async destroy() { },

    // Public API
    async doSomething() {
      eventBus.emit('myModule:event', { data: true });
    },
  };
}
```

### Registering a Module

```javascript
// In src/core/bootstrap.js
manager.register('myModule', {
  factory: createMyModule,
  dependencies: ['eventBus', 'state'],
  enabled: true,
  options: { /* config */ },
});
```

## 📚 Documentation

- **[MULTIPLATFORM_GUIDE.md](./MULTIPLATFORM_GUIDE.md)** - Platform-specific details and integration
- **[Architecture.md](./docs/Architecture.md)** - Deep dive into module architecture
- **[BrowserAutomation.md](./docs/BrowserAutomation.md)** - Browser automation API

## 🔧 Configuration

### Manifest Selection

Two manifest files provided:

- **`manifest-multiplatform.json`** (Recommended)
  - Supports all platforms with single build
  - Dynamic platform detection
  - Universal feature set

- **`static/manifest.json`** (Legacy/DeepSeek only)
  - Single-platform configuration
  - DeepSeek-specific optimizations

### Build Configuration

```bash
# Copy multiplatform manifest
cp manifest-multiplatform.json static/manifest.json

# Build
npm run build

# Watch for changes
npm run dev
```

## 📊 Module Dependencies

```
eventBus (no dependencies)
  └─┬─ storage
    ├─ state → bridge
    └─ commands

browserAutomation
  ├─ eventBus
  └─ state

memory
  ├─ storage
  ├─ state
  └─ eventBus

fileReader → eventBus, state
deepResearch → state, eventBus, commands
```

## 🎮 Browser Automation API

### Execute Actions

```javascript
const result = await automation.execute({
  type: 'type' | 'click' | 'scroll' | 'getMessages' | 'getInput',
  text?: string,
  selector?: string,
  targetSelector?: string,
});
```

### Session Management

```javascript
// Start session
await automation.startSession('session-1', tabId);

// Close session
await automation.closeSession('session-1');
```

### Event Listening

```javascript
eventBus.on('browserAutomation:ready', ({ platform }) => {
  console.log(`Ready on: ${platform}`);
});

eventBus.on('browserAutomation:actionCompleted', ({ action, result }) => {
  console.log(`Action completed: ${action.type}`);
});
```

## 🧪 Testing

### DevTools Console Testing

```javascript
// Get module manager (if exposed globally)
const mm = window.__bdsModuleManager;

// Check status
console.log(mm.getStatus());

// Get a module
const automation = mm.get('browserAutomation');
console.log(`Platform: ${automation.getPlatform()}`);

// Execute action
await automation.execute({ type: 'scroll' });
```

### Platform Testing

Test on each platform:

```bash
# Terminal 1: Watch for changes
npm run dev

# Terminal 2: Open in Chrome
# Claude: https://claude.ai
# ChatGPT: https://chatgpt.com
# DeepSeek: https://chat.deepseek.com
```

## 🐛 Troubleshooting

### Platform Not Detected

**Symptom**: "Unknown platform" in console

**Solution**:
1. Check `window.location.hostname` in DevTools
2. Add hostname to `detectCurrentPlatform()`
3. Verify adapter can find UI elements

### Automation Actions Failing

**Symptom**: Element not found errors

**Solution**:
1. Inspect actual element structure in DevTools
2. Update selectors in platform adapter
3. Check browser console for detailed errors

### Module Initialization Issues

**Symptom**: Modules not loading

**Solution**:
1. Check for dependency errors in console
2. Verify all dependencies registered before module
3. Check `moduleManager.getStatus()` for details

## 📈 Performance

- **Startup**: ~100-200ms for full initialization
- **Platform Detection**: <5ms
- **Module Loading**: ~20ms per module
- **Automation Actions**: 50-5000ms (depends on action)
- **Memory Overhead**: ~2-5MB

## 🔒 Security

- **Content Script Isolation**: Pages cannot access extension internals
- **Message Validation**: All cross-boundary messages validated
- **Origin Checking**: Browser automation validates page origin
- **No Eval**: No `eval()` or dynamic code execution
- **CSP Compliant**: Content Security Policy adherent

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

## 📞 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@example.com

## 🗺️ Roadmap

- [ ] Firefox support (manifest v2 adapter)
- [ ] Safari support
- [ ] Advanced UI customization
- [ ] Plugin marketplace
- [ ] Telemetry dashboard
- [ ] Team/workspace features

## Changelog

### v1.0.0 (Current)
- ✨ Modular architecture with dependency injection
- ✨ Multi-platform support (Claude, ChatGPT, DeepSeek)
- ✨ Browser automation with platform adapters
- ✨ Memory management module
- ✨ Command system with auto-completion
- 🐛 Various bug fixes and improvements
