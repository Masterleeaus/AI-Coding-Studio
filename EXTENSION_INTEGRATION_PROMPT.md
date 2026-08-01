# Browser Extension Integration Prompt

Complete guide for integrating extracted code and patterns from the scanned extensions into the AI-Coding-Studio.

---

## Context

Five extensions were analyzed and documented in EXTRACTED_PATTERNS.md:
1. **prompts.chat** - WXT framework, Radix UI, TanStack Query, React patterns
2. **ChromeCode** - Side panel, macro recording, provider abstraction
3. **Ooogle.it** - DevTools integration, ChatGPT API patterns
4. **Memex** - React, TypeScript, Webpack patterns
5. **browser2terminal** - Server bridge, IPC patterns

Each extension is included in `usable-extensions.zip` with the most extractable/stable code patterns.

---

## Integration Tasks (Delegable to Agents)

### INTEGRATION TASK 1: WXT Framework Setup

**What it does**: Build system supporting Chrome, Firefox, Safari manifests from single codebase

**Files to extract from**: `prompts.chat/wxt.config.ts`

**Integration steps**:

1. **Update wxt.config.ts** (if not already using WXT):
   ```typescript
   import { defineConfig } from 'wxt';

   export default defineConfig({
     manifest: {
       name: 'AI Coding Studio',
       version: '1.0.0',
       permissions: ['scripting', 'tabs', 'storage', 'sidePanel'],
     },
     builder: {
       viteOptions: {
         build: {
           outDir: '.output',
         },
       },
     },
   });
   ```

2. **Add build scripts to package.json**:
   ```json
   {
     "scripts": {
       "dev": "wxt",
       "build": "wxt build",
       "build:chrome": "wxt build --browser=chrome",
       "build:firefox": "wxt build --browser=firefox",
       "zip:chrome": "wxt zip --browser=chrome",
       "zip:firefox": "wxt zip --browser=firefox"
     }
   }
   ```

3. **Install**: `npm install wxt` (already in package.json likely)

4. **Result**: Single source code, multiple browser builds

**Value**: Deploy to Chrome Web Store and Firefox Add-ons simultaneously with one codebase

---

### INTEGRATION TASK 2: Radix UI Component Library

**What it does**: Unstyled, accessible component primitives (Button, Dialog, Tabs, Badge, etc.)

**Files to extract from**: `prompts.chat/src/components/radix-ui/`

**Integration steps**:

1. **Install Radix UI packages**:
   ```bash
   npm install @radix-ui/react-button @radix-ui/react-dialog @radix-ui/react-tabs \
               @radix-ui/react-dropdown-menu @radix-ui/react-popover \
               @radix-ui/react-slot @radix-ui/primitive
   ```

2. **Create wrapper components in src/ui/components/radix/**:
   ```javascript
   // Button.jsx
   import * as Primitive from '@radix-ui/react-button';
   export const Button = Primitive.Root;
   
   // Dialog.jsx
   import * as Dialog from '@radix-ui/react-dialog';
   export { Dialog };
   
   // Add more as needed...
   ```

3. **Add CSS variables** in src/ui/theme/index.css:
   ```css
   :root {
     --color-primary: #3b82f6;
     --color-success: #10b981;
     --color-error: #ef4444;
     --color-warning: #f59e0b;
     --radius: 6px;
   }
   
   @media (prefers-color-scheme: dark) {
     :root {
       --color-primary: #60a5fa;
       /* adjust for dark mode */
     }
   }
   ```

4. **Use in components**:
   ```javascript
   import { Button } from './radix/Button';
   
   export function MyComponent() {
     return <Button onClick={() => console.log('clicked')}>Click me</Button>;
   }
   ```

5. **Result**: Consistent, accessible UI across all views

**Value**: Standardized components prevent UI inconsistency, Radix is unstyled so you own the look

---

### INTEGRATION TASK 3: Side Panel Implementation

**What it does**: Persistent right-side panel in browser (like DevTools) for extension UI

**Files to extract from**: `ChromeCode/src/ui/SidePanel.jsx` and manifest config

**Integration steps**:

1. **Update manifest.json**:
   ```json
   {
     "side_panel": {
       "default_path": "src/ui/pages/side-panel.html"
     },
     "permissions": ["sidePanel"]
   }
   ```

2. **Create side-panel.html**:
   ```html
   <!DOCTYPE html>
   <html>
     <head>
       <meta charset="UTF-8" />
       <style>
         body {
           width: 400px;
           height: 100vh;
           margin: 0;
           font-family: system-ui;
         }
       </style>
     </head>
     <body>
       <div id="root"></div>
       <script type="module" src="./pages/side-panel.jsx"></script>
     </body>
   </html>
   ```

3. **Create side-panel.jsx**:
   ```javascript
   import { createRoot } from 'react-dom/client';
   import { ProgressDashboard } from '../components/ProgressDashboard';
   
   const root = createRoot(document.getElementById('root'));
   root.render(<ProgressDashboard />);
   ```

4. **Open side panel programmatically**:
   ```javascript
   chrome.sidePanel.open({ tabId: currentTab.id });
   ```

5. **Result**: Beautiful persistent UI in side panel

**Value**: Users see progress dashboard without opening popups or new tabs

---

### INTEGRATION TASK 4: Provider Abstraction Pattern

**What it does**: Support multiple LLMs (Claude, ChatGPT, Gemini) with single interface

**Files to extract from**: `ChromeCode/src/providers/`

**Integration steps**:

1. **Create provider interface** in src/runtime/providers/base.js:
   ```javascript
   export class BaseProvider {
     name = 'unknown';
     
     async initialize(apiKey) {
       throw new Error('Not implemented');
     }
     
     async generateText(prompt, options = {}) {
       throw new Error('Not implemented');
     }
     
     async generateEmbedding(text) {
       throw new Error('Not implemented');
     }
   }
   ```

2. **Implement providers**:
   ```javascript
   // src/runtime/providers/claude.js
   export class ClaudeProvider extends BaseProvider {
     name = 'claude';
     
     async generateText(prompt, options = {}) {
       const response = await fetch('https://api.anthropic.com/v1/messages', {
         method: 'POST',
         headers: { 'x-api-key': this.apiKey },
         body: JSON.stringify({
           model: options.model || 'claude-3-sonnet',
           messages: [{ role: 'user', content: prompt }],
           max_tokens: options.maxTokens || 1024,
         }),
       });
       return response.json();
     }
   }
   ```

3. **Create provider registry**:
   ```javascript
   export class ProviderRegistry {
     static providers = new Map();
     
     static register(provider) {
       this.providers.set(provider.name, provider);
     }
     
     static get(name) {
       return this.providers.get(name);
     }
   }
   ```

4. **Usage**:
   ```javascript
   const provider = ProviderRegistry.get('claude');
   const result = await provider.generateText(prompt);
   ```

5. **Result**: Switch LLM providers without changing caller code

**Value**: Support multiple APIs, test with mocks, future-proof for new providers

---

### INTEGRATION TASK 5: Macro Recording System

**What it does**: Record and replay user interactions (clicks, typing, navigation)

**Files to extract from**: `ChromeCode/src/features/macro-recording/`

**Integration steps**:

1. **Create macro recorder** in src/runtime/macros/recorder.js:
   ```javascript
   export class MacroRecorder {
     constructor() {
       this.recording = false;
       this.events = [];
     }
     
     start() {
       this.recording = true;
       this.events = [];
       this.attachListeners();
     }
     
     stop() {
       this.recording = false;
       this.detachListeners();
       return this.events;
     }
     
     attachListeners() {
       document.addEventListener('click', this.onEvent.bind(this));
       document.addEventListener('input', this.onEvent.bind(this));
       document.addEventListener('keydown', this.onEvent.bind(this));
     }
     
     onEvent(event) {
       if (!this.recording) return;
       this.events.push({
         type: event.type,
         target: event.target.selector || event.target.tagName,
         value: event.target.value,
         timestamp: Date.now(),
       });
     }
   }
   ```

2. **Create macro player** in src/runtime/macros/player.js:
   ```javascript
   export class MacroPlayer {
     async play(events, speed = 1) {
       for (const event of events) {
         const element = document.querySelector(event.target);
         if (element) {
           this.simulateEvent(element, event);
           await this.delay((event.timestamp || 100) / speed);
         }
       }
     }
     
     simulateEvent(element, event) {
       if (event.type === 'click') {
         element.click();
       } else if (event.type === 'input') {
         element.value = event.value;
         element.dispatchEvent(new Event('input', { bubbles: true }));
       }
     }
     
     delay(ms) {
       return new Promise(resolve => setTimeout(resolve, ms));
     }
   }
   ```

3. **Add UI controls**:
   ```javascript
   <Button onClick={() => recorder.start()}>Record</Button>
   <Button onClick={() => recorder.stop()}>Stop</Button>
   <Button onClick={() => player.play(recorder.events)}>Replay</Button>
   ```

4. **Persist macros**:
   ```javascript
   chrome.storage.sync.set({ macros: recorder.events });
   ```

5. **Result**: Users can record and replay workflows

**Value**: Automate repetitive tasks, testing, demonstrations

---

### INTEGRATION TASK 6: TanStack Query for Data Fetching

**What it does**: Automatic caching, background refetching, synchronization for API calls

**Files to extract from**: `prompts.chat/src/hooks/useQuery.js`

**Integration steps**:

1. **Install**:
   ```bash
   npm install @tanstack/react-query
   ```

2. **Setup QueryClient** in src/ui/root.jsx:
   ```javascript
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   
   const queryClient = new QueryClient();
   
   export function Root() {
     return (
       <QueryClientProvider client={queryClient}>
         <App />
       </QueryClientProvider>
     );
   }
   ```

3. **Use in components**:
   ```javascript
   import { useQuery } from '@tanstack/react-query';
   
   export function MyComponent() {
     const { data, isLoading, error } = useQuery({
       queryKey: ['progressData'],
       queryFn: () => kernel.progress.getProgressSummary(),
       refetchInterval: 1000, // Update every second
     });
     
     if (isLoading) return <div>Loading...</div>;
     if (error) return <div>Error: {error.message}</div>;
     
     return <div>{/* Render data */}</div>;
   }
   ```

4. **Result**: Automatic background updates, cache management, deduplication

**Value**: Real-time progress dashboard with zero manual state management

---

### INTEGRATION TASK 7: Content Script Injection

**What it does**: Inject scripts into web pages for integration with page content

**Files to extract from**: `prompts.chat/src/content-scripts/` + manifest config

**Integration steps**:

1. **Update manifest.json**:
   ```json
   {
     "content_scripts": [
       {
         "matches": ["<all_urls>"],
         "js": ["src/content-scripts/inject.js"],
         "run_at": "document_start"
       }
     ]
   }
   ```

2. **Create content script** src/content-scripts/inject.js:
   ```javascript
   // This runs in the page context
   window.AIStudio = {
     recordAction: (action) => {
       console.log('Action recorded:', action);
     }
   };
   ```

3. **Communicate with background service**:
   ```javascript
   // In content script
   chrome.runtime.sendMessage({
     type: 'page-action',
     action: 'selection-copied'
   });
   
   // In background
   if (message.type === 'page-action') {
     console.log('Page action:', message.action);
   }
   ```

4. **Result**: Can hook into page events

**Value**: Integrate with existing web pages without their knowledge

---

### INTEGRATION TASK 8: DevTools Integration

**What it does**: Add custom DevTools panel for debugging

**Files to extract from**: `Ooogle.it/src/devtools/`

**Integration steps**:

1. **Update manifest.json**:
   ```json
   {
     "devtools_page": "src/devtools/devtools.html",
     "permissions": ["devtools"]
   }
   ```

2. **Create devtools.html**:
   ```html
   <!DOCTYPE html>
   <html>
     <head>
       <script src="devtools.js"></script>
     </head>
   </html>
   ```

3. **Create devtools.js**:
   ```javascript
   chrome.devtools.panels.create(
     'AI Studio',
     'icon.png',
     'devtools-panel.html'
   );
   ```

4. **Create devtools-panel.html**:
   ```html
   <!DOCTYPE html>
   <html>
     <body>
       <h1>AI Studio DevTools</h1>
       <div id="root"></div>
       <script type="module" src="devtools-panel.jsx"></script>
     </body>
   </html>
   ```

5. **Result**: Custom debugging panel in Chrome DevTools

**Value**: Low-friction debugging, direct access to kernel state

---

## Implementation Priority

### Phase 1 (Foundation) - 1-2 hours
- [x] Task 1 (progress handlers) - Already delegable
- [ ] WXT Framework Setup
- [ ] Radix UI Components

### Phase 2 (UI/UX) - 2-3 hours
- [ ] Side Panel Implementation
- [ ] TanStack Query Integration
- [ ] Progress Dashboard (already started)

### Phase 3 (Features) - 2-3 hours
- [ ] Provider Abstraction Pattern
- [ ] Content Script Injection
- [ ] DevTools Integration

### Phase 4 (Advanced) - 2-4 hours
- [ ] Macro Recording System
- [ ] Advanced macro editing UI
- [ ] Macro marketplace/sharing

---

## Code Quality Checklist

For each integration task:

- [ ] Copy code from `usable-extensions.zip`
- [ ] Adapt to this repository's structure
- [ ] Update imports to match project layout
- [ ] Add TypeScript types if needed
- [ ] Write unit tests for core logic
- [ ] Add to CHANGELOG.md
- [ ] Update README.md with usage examples
- [ ] Test in Chrome browser
- [ ] Test in Firefox if using WXT

---

## File Structure After Integration

```
src/
├── runtime/
│   ├── providers/          # (NEW) Provider abstraction
│   │   ├── base.js
│   │   ├── claude.js
│   │   └── registry.js
│   └── macros/             # (NEW) Macro recording/playback
│       ├── recorder.js
│       └── player.js
├── ui/
│   ├── components/
│   │   ├── radix/          # (NEW) Radix UI wrappers
│   │   │   ├── Button.jsx
│   │   │   └── Dialog.jsx
│   │   └── ProgressDashboard.jsx
│   ├── theme/              # (NEW) CSS variables
│   │   └── index.css
│   └── pages/
│       └── side-panel.html # (NEW)
└── content-scripts/        # (NEW) Page injection
    └── inject.js

manifest.json              # Updated with side_panel, devtools_page, content_scripts
wxt.config.ts             # (NEW or updated) Multi-browser build config
package.json              # Updated scripts and dependencies
```

---

## Testing Integration

Each integration should include:

1. **Unit tests** for core logic (providers, macros)
2. **Component tests** for UI (ProgressDashboard, Radix wrappers)
3. **Integration tests** for cross-component communication
4. **E2E tests** in actual browser (manual)

```bash
npm test -- src/runtime/providers/
npm test -- src/ui/components/
npm test -- src/content-scripts/

# Manual testing
npm run dev
# Open Chrome → chrome://extensions → Load unpacked → dist-chrome/
```

---

## Recommended Agent Prompts

These tasks are ready to delegate:

```
Agent Task 1: "Implement WXT framework setup using EXTRACTED_PATTERNS.md"
Agent Task 2: "Add Radix UI component library following pattern in usable-extensions.zip"
Agent Task 3: "Implement side panel using ChromeCode pattern from usable-extensions.zip"
Agent Task 4: "Implement provider abstraction supporting Claude, ChatGPT, Gemini APIs"
Agent Task 5: "Implement macro recording and playback system"
Agent Task 6: "Integrate TanStack Query for real-time progress dashboard updates"
Agent Task 7: "Add content script injection for page integration"
Agent Task 8: "Implement DevTools panel for AI Studio debugging"
```

Each prompt should include reference to the extracted pattern in `usable-extensions.zip`.
