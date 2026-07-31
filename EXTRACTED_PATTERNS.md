# Extracted Code Patterns from Extensions

## 1. ChromeCode - Side Panel Implementation

```typescript
// manifest.json pattern
{
  "side_panel": {
    "default_path": "panel/panel.html"
  }
}

// Key advantage over popup:
// - Persistent across page navigation
// - More space for complex workflows
// - Better state persistence
// - Can show real-time updates
```

## 2. ChromeCode - Provider Abstraction

```typescript
// Multi-LLM provider pattern
interface ProviderConfig {
  name: string;           // 'claude' | 'chatgpt' | 'gemini'
  apiKey: string;
  model: string;
  baseUrl?: string;
}

class ProviderRouter {
  private providers: Map<string, ProviderConfig> = new Map();
  
  async execute(provider: string, prompt: string) {
    const config = this.providers.get(provider);
    if (!config) throw new Error(`Unknown provider: ${provider}`);
    
    // Route to appropriate API
    return this.routeRequest(config, prompt);
  }
}

// Benefits:
// - Support multiple AI models
// - Easy to add new providers
// - User can choose preferred provider
// - Can compare outputs across models
```

## 3. ChromeCode - Macro Recording Pattern

```typescript
// Macro Recording System
interface MacroStep {
  type: 'click' | 'type' | 'navigate' | 'wait';
  selector?: string;
  value?: string;
  url?: string;
  delay?: number;
  timestamp: number;
}

interface Macro {
  id: string;
  name: string;
  steps: MacroStep[];
  createdAt: Date;
  lastRun?: Date;
}

class MacroRecorder {
  private recording = false;
  private currentMacro: MacroStep[] = [];
  
  start(macroName: string) {
    this.recording = true;
    this.currentMacro = [];
  }
  
  recordStep(step: MacroStep) {
    this.currentMacro.push({
      ...step,
      timestamp: Date.now()
    });
  }
  
  async replay(macro: Macro) {
    for (const step of macro.steps) {
      switch (step.type) {
        case 'click':
          document.querySelector(step.selector!)?.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
          );
          break;
        case 'type':
          const el = document.querySelector(step.selector!) as HTMLInputElement;
          el.value = step.value!;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          break;
        case 'navigate':
          window.location.href = step.url!;
          await new Promise(r => setTimeout(r, step.delay || 1000));
          break;
        case 'wait':
          await new Promise(r => setTimeout(r, step.delay!));
          break;
      }
    }
  }
}

// Benefits:
// - Record user workflows
// - Automate repetitive tasks
// - Test agent behavior
// - Create workflow templates
```

## 4. Memex - React + Storage Pattern

```typescript
// Storage abstraction
interface StorageManager {
  save<T>(key: string, data: T): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

class ChromeStorageManager implements StorageManager {
  async save<T>(key: string, data: T): Promise<void> {
    return chrome.storage.local.set({ [key]: JSON.stringify(data) });
  }
  
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(key);
    return result[key] ? JSON.parse(result[key]) : null;
  }
  
  async delete(key: string): Promise<void> {
    return chrome.storage.local.remove(key);
  }
  
  async list(prefix: string): Promise<string[]> {
    const all = await chrome.storage.local.get(null);
    return Object.keys(all).filter(k => k.startsWith(prefix));
  }
}

// React Hook Integration
function useExtensionStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = React.useState<T>(initialValue);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    chrome.storage.local.get(key, (result) => {
      if (result[key]) {
        setValue(JSON.parse(result[key]));
      }
      setLoading(false);
    });
  }, [key]);
  
  const updateValue = React.useCallback(async (newValue: T) => {
    setValue(newValue);
    await chrome.storage.local.set({
      [key]: JSON.stringify(newValue)
    });
  }, [key]);
  
  return [value, updateValue, loading] as const;
}

// Usage:
// const [notes, setNotes] = useExtensionStorage('notes', []);
```

## 5. prompts.chat - WXT Configuration

```javascript
// wxt.config.ts - Modern extension build
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: ['storage', 'activeTab'],
    host_permissions: ['<all_urls>'],
  },
  
  // Automatic rebuilding
  dev: {
    server: {
      hmr: true,
    },
  },
  
  // Output optimization
  outDir: 'dist',
});

// Benefits:
// - Automatic manifest generation
// - Hot module reload during dev
// - Multi-browser support (Chrome, Firefox, Edge)
// - Built-in TypeScript support
// - Better developer experience
```

## 6. Ooogle.it - Content Script Injection Pattern

```javascript
// content.js - Smart injection pattern
const CONFIG = {
  supportedRegions: [
    'google.com',
    'google.co.in',
    'google.co.uk',
    'google.co.au'
  ]
};

function shouldInject() {
  return CONFIG.supportedRegions.some(domain => 
    window.location.hostname.includes(domain)
  );
}

function injectUI() {
  // Create container
  const container = document.createElement('div');
  container.id = 'chatgpt-widget';
  container.innerHTML = `<div class="search-result-addon">...</div>`;
  
  // Insert after first result
  const firstResult = document.querySelector('[data-sokoban-container]');
  firstResult?.parentNode?.insertBefore(container, firstResult.nextSibling);
  
  // Inject styles
  const style = document.createElement('style');
  style.textContent = INJECTED_CSS;
  document.head.appendChild(style);
}

if (shouldInject()) {
  injectUI();
}

// Benefits:
// - Minimal DOM impact
// - Respects existing structure
// - Easy to enable/disable
// - Supports multiple domains
```

## 7. browser2terminal - Server Bridge Pattern

```javascript
// server.js - Express-based bridge
const express = require('express');
const { spawn } = require('child_process');

const app = express();
app.use(express.json());

// API endpoint for command execution
app.post('/api/execute', async (req, res) => {
  const { command, args } = req.body;
  
  try {
    const result = await executeCommand(command, args);
    res.json({ 
      success: true, 
      output: result,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Extension message listener
chrome.runtime.onMessage.addListener(async (msg, sender, reply) => {
  if (msg.type === 'execute_command') {
    const response = await fetch('http://localhost:3000/api/execute', {
      method: 'POST',
      body: JSON.stringify(msg.payload)
    });
    reply(await response.json());
  }
});

// Benefits:
// - Break out of browser sandbox
// - Direct system access
// - Terminal integration
// - File system operations
```

## 8. ChromeCode - Bridge Protocol

```typescript
// bridge-protocol.ts - Type-safe communication
interface MessagePayload {
  type: 'request' | 'response' | 'notification';
  id?: string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}

class BridgeProtocol {
  private listeners = new Map<string, (msg: MessagePayload) => void>();
  
  async send<T>(method: string, params?: unknown): Promise<T> {
    const id = generateId();
    const promise = this.createPromise<T>(id);
    
    chrome.runtime.sendMessage({
      type: 'request',
      id,
      method,
      params
    });
    
    return promise;
  }
  
  on(method: string, handler: (params: unknown) => void) {
    this.listeners.set(method, handler);
  }
  
  // In background script
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (msg.type === 'request') {
      const handler = this.listeners.get(msg.method);
      Promise.resolve(handler?.(msg.params))
        .then(result => reply({ 
          type: 'response', 
          id: msg.id, 
          result 
        }))
        .catch(error => reply({
          type: 'response',
          id: msg.id,
          error: { code: 1, message: error.message }
        }));
    }
  });
}

// Benefits:
// - Type-safe RPC
// - Auto promise wrapping
// - Error handling
// - Request/response tracking
```

---

## 🚀 Recommended Implementation Priority

### Phase 1: Infrastructure (1-2 weeks)
1. Migrate to WXT framework
2. Add TypeScript for type safety
3. Implement provider abstraction

### Phase 2: UI/UX (2-3 weeks)
1. Add Radix UI components
2. Implement side panel interface
3. Create modern dashboard

### Phase 3: Features (3-4 weeks)
1. Add macro recording system
2. Implement DevTools integration
3. Create workflow templates

### Phase 4: Advanced (Optional)
1. Server bridge for terminal access
2. Offscreen documents for processing
3. Debugger API integration

