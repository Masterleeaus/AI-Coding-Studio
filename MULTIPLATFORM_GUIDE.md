# Multi-Platform Integration Guide

This modular architecture supports Claude, ChatGPT, and DeepSeek with a single codebase.

## Platform Support

### ✅ Claude (claude.ai)
- **Status**: Full support
- **Input Detection**: textarea, contenteditable
- **Message Selectors**: `[data-test-id*="message"]`, `[class*="message"]`
- **Features**: Commands, memory, file reading, browser automation

### ✅ ChatGPT (chatgpt.com, openai.com)
- **Status**: Full support
- **Input Detection**: textarea with "Message" placeholder
- **Message Selectors**: `[data-message-author-role]`, `.group[class*="message"]`
- **Features**: Commands, memory, file reading, browser automation

### ✅ DeepSeek (chat.deepseek.com)
- **Status**: Full support
- **Input Detection**: textarea, contenteditable
- **Message Selectors**: `[class*="message"]`, `[data-test-id*="message"]`
- **Features**: Commands, memory, file reading, browser automation

## How Platform Detection Works

The browser automation module automatically detects which platform is active:

```javascript
// In BrowserAutomationModule.js
function detectCurrentPlatform() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('claude.ai')) return 'claude';
  if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) return 'chatgpt';
  if (hostname.includes('deepseek.com')) return 'deepseek';
  
  // Fallback to UI element detection
  return 'unknown';
}
```

## Browser Automation API

Each platform adapter implements the same interface:

### Standard Methods

```javascript
// Get active chat
await adapter.getActiveChat()
// Returns: { id, visible }

// Find input field
const inputField = await adapter.findInputField()
// Returns: HTMLElement

// Find all messages
const messages = await adapter.findMessageElements()
// Returns: HTMLElement[]

// Click element
await adapter.clickElement(selector)

// Type text
await adapter.typeText(text, targetSelector)

// Scroll to bottom
await adapter.scrollToBottom()
```

### Usage Example

```javascript
// Get browser automation module
const automation = moduleManager.get('browserAutomation');

// Execute automation action
const result = await automation.execute({
  type: 'type',
  text: 'Hello, world!',
  targetSelector: null  // Uses default input field
});

// Or click an element
await automation.execute({
  type: 'click',
  selector: 'button[data-testid="send"]'
});
```

## Adding a New Platform

To add support for a new platform:

1. Create a platform adapter in `BrowserAutomationModule.js`:

```javascript
function createNewPlatformAdapter() {
  return {
    platform: 'newplatform',
    
    async getActiveChat() {
      // Return active chat info
    },
    
    async findInputField() {
      // Return the input element
    },
    
    async findMessageElements() {
      // Return array of message elements
    },
    
    async clickElement(selector) {
      // Implement click logic
    },
    
    async typeText(text, targetSelector) {
      // Implement typing logic
    },
    
    async scrollToBottom() {
      // Implement scroll logic
    },
  };
}
```

2. Register it in the adapter factory:

```javascript
const adapters = {
  claude: createClaudeAdapter,
  chatgpt: createChatGPTAdapter,
  deepseek: createDeepSeekAdapter,
  newplatform: createNewPlatformAdapter,  // ADD HERE
};
```

3. Update the platform detection:

```javascript
function detectCurrentPlatform() {
  const hostname = window.location.hostname;
  
  // Add your platform
  if (hostname.includes('newplatform.com')) {
    return 'newplatform';
  }
  
  // ... rest of detection
}
```

## Manifest Configuration

The modular architecture provides two manifest files:

### `manifest-multiplatform.json`
Universal manifest supporting all platforms (recommended).

**Host permissions:**
- `https://claude.ai/*`
- `https://chatgpt.com/*`
- `https://openai.com/*`
- `https://chat.deepseek.com/*`

**Content scripts** run on all supported platforms with unified initialization.

### Platform-Specific Customization

You can create platform-specific manifests if needed:

```json
{
  "manifest_version": 3,
  "name": "Better Claude",
  "host_permissions": ["https://claude.ai/*"],
  "content_scripts": [{
    "matches": ["https://claude.ai/*"],
    "js": ["content.js"]
  }]
}
```

## Module Dependencies

```
eventBus (no dependencies)
  ↓
browserAutomation
  ├→ eventBus
  └→ state

commands
  ├→ state
  ├→ eventBus
  └→ bridge

memory
  ├→ storage
  ├→ state
  └→ eventBus
```

## Platform-Specific Events

Each module emits platform-agnostic events:

```javascript
// Listen for browser automation
eventBus.on('browserAutomation:ready', ({ platform }) => {
  console.log(`Automation ready on ${platform}`);
});

eventBus.on('browserAutomation:actionCompleted', ({ action, result }) => {
  console.log(`Completed: ${action.type}`);
});

eventBus.on('browserAutomation:actionFailed', ({ action, error }) => {
  console.error(`Failed: ${action.type}`, error);
});
```

## Testing Multi-Platform

To test on different platforms:

1. **Claude**: Navigate to https://claude.ai
2. **ChatGPT**: Navigate to https://chatgpt.com or https://openai.com
3. **DeepSeek**: Navigate to https://chat.deepseek.com

The extension automatically loads the appropriate adapter for each platform.

## Troubleshooting

### Platform Not Detected
- Check browser console for platform detection logs
- Verify hostname matches detection logic
- Check if UI elements used for fallback exist

### Automation Actions Failing
- Verify element selectors for current platform
- Use browser DevTools to inspect actual element structure
- Update adapter selectors if platform UI changed

### Runtime Initialization Issues
- Check the content-script console for the first initialization error.
- Verify the Runtime Kernel loaded workflow definitions without reporting local tools as available.
- Verify provider-specific selectors and the active page adapter independently.
- Local filesystem, Git, build, test, and editor capabilities remain unavailable until an authenticated Local Bridge is configured.

## Performance Considerations

- **Platform detection**: Runs once at initialization (~1ms)
- **Adapter creation**: ~2-5ms per adapter
- **Runtime kernel loading**: definitions only; local tool discovery occurs only when a Local Bridge is configured
- **Action execution**: Varies by action type (50-5000ms)

## Browser Support

- ✅ Chrome/Chromium 90+
- ✅ Edge 90+
- ✅ Firefox (with manifest adaptation)
- ⚠️ Safari (limited MV3 support)

## Security Considerations

1. **Origin validation**: All actions validated against current page origin
2. **Content script isolation**: Extensions boundary prevents page injection
3. **Message validation**: All messages include session and action validation
4. **Rate limiting**: Consider implementing per-platform rate limits
5. **Approval workflows**: High-risk actions require explicit approval

## Next Steps

1. Customize selectors for better element detection
2. Add platform-specific features as needed
3. Implement approval workflows for sensitive actions
4. Add analytics/logging for debugging
5. Create platform-specific UI overlays
