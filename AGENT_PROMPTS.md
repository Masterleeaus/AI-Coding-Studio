# Agent Task Prompts

Complete delegation prompts for all remaining tasks. Copy and paste these into separate Agent calls.

---

## TASK 1: Wire ProgressRuntime into All Background Handlers

**Agent Type**: `claude` (general-purpose)

**Prompt**:
```
Task: Integrate progress tracking into ALL background service message handlers.

Location: src/background/index.js

Current state: Only the 'bds-get-youtube-transcript' handler is wrapped with trackProgress(). 
You need to wrap ALL remaining handlers.

Required handlers to update (these are all the message.type handlers that need wrapping):
1. bds-fetch-github-zip → agent:'background-github', action:'fetch-zip'
2. bds-fetch-github-commits → agent:'background-github', action:'fetch-commits'
3. bds-fetch-url-content → agent:'background-web', action:'fetch-url'
4. bds-detect-tools → agent:'background-tools', action:'detect-tools'
5. bds-mcp-list-tools → agent:'background-mcp', action:'list-tools'
6. bds-mcp-call-tool → agent:'background-mcp', action:'call-tool'
7. bds-detect-languages → agent:'background-languages', action:'detect-languages'

Pattern to follow (this is already done for YouTube, copy this pattern):
```javascript
if (message.type === "bds-get-youtube-transcript") {
  trackProgress(
    'background-youtube',
    'get-transcript',
    `Fetching transcript for YouTube video ${message.videoId}`,
    () => fetchTranscript(message.videoId)
  )
    .then((transcript) => {
      sendResponse({ ok: true, transcript });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });
  return true;
}
```

Make sure:
- import { trackProgress } is at the top
- Each handler wraps its operation with trackProgress()
- Use descriptive action IDs (fetch-zip, fetch-commits, etc)
- Include context in description (which video, which repo, which URL, etc)
- Don't change error handling logic, just wrap the operation
- Don't add extra try/catch around trackProgress (let it handle errors)

After updating all handlers:
1. Verify the file compiles
2. Test that messages still receive responses
3. Commit with message: "feat: add progress tracking to all background service handlers"
4. Push to branch: claude/repo-branch-merge-audit-5rr1f0
```

---

## TASK 2: Create Progress Dashboard UI

**Agent Type**: `claude` (general-purpose)

**Prompt**:
```
Task: Create a real-time progress dashboard UI component for the extension.

Location: Create new files in src/ui/components/

Requirements:
1. Build a side panel component (ProgressDashboard) using Radix UI primitives
   - Use patterns from EXTRACTED_PATTERNS.md for Radix UI component structure
   - Make it compatible with chrome side panel API
   
2. Display sections (all real-time, pulling from kernel.progress):
   - Current Activity: Shows running operations (agent, action, description, elapsed time)
   - Repository Status: Branch, commits ahead, dirty state
   - Agent Statistics: Per-agent success/fail counts, total actions
   - Recent Operations: Last 10 completed operations with timestamps
   - Workflow State: Current workflow (if any) with step progress
   
3. Features:
   - Auto-refresh every 1 second from kernel.progress API
   - Color coding: green=success, red=failed, blue=running, gray=pending
   - Expandable operation details (click to see error messages, durations)
   - Clear All button to reset progress data
   - Export Report button to download markdown report
   - Responsive design that works in narrow side panel
   
4. Code structure:
   - ProgressDashboard.jsx - Main component (100-150 lines)
   - useProgressData.js - Hook for real-time progress data (50-75 lines)
   - styles.css - Radix UI styling (50-75 lines)
   - index.js - Exports
   
5. Technology:
   - React functional components with hooks
   - Radix UI components (use Card, Table, Badge, Button from Radix)
   - Real-time updates via kernel.progress.getProgressSummary()
   - TypeScript for type safety

Reference EXTRACTED_PATTERNS.md "Radix UI Component Pattern" section for structure.

After creating:
1. Create test file: ProgressDashboard.test.jsx
2. Test that it renders without errors
3. Test that it displays mock progress data
4. Commit with message: "feat: add real-time progress dashboard UI"
5. Push to branch: claude/repo-branch-merge-audit-5rr1f0
```

---

## TASK 3: Fix Local-Bridge Test Failures

**Agent Type**: `claude` (general-purpose)

**Prompt**:
```
Task: Diagnose and fix failing tests in the local-bridge layer.

Location: src/runtime/local-bridge/*.test.js

Current state: 17 test files have failures. Most are pre-existing (not caused by progress tracking).

Steps:
1. Run tests: npm test -- src/runtime/local-bridge/
2. List all failures with their error messages
3. Group failures by category:
   - Contract validation errors (in protocol.test.js)
   - Command handler errors (in command-registry.test.js, command-handler.test.js)
   - Integration errors (in local-bridge.test.js)
   - Other (categorize)
4. For each category:
   - Identify root cause
   - Check if it's a real bug or a brittle test expectation
   - Fix the actual code or update the test appropriately
5. Re-run tests until all pass

Note: We prioritized progress tracking over fixing these pre-existing issues, so some may be from earlier work. Focus on:
- Tests that were passing before (regression)
- Tests that verify contract correctness (these are important for safety)
- Skip tests for optional features if they're complex

After fixes:
1. Run full test suite
2. Commit with message: "fix: resolve local-bridge test failures"
3. Push to branch: claude/repo-branch-merge-audit-5rr1f0
```

---

## TASK 4: Add Persistent Session Cleanup

**Agent Type**: `claude` (general-purpose)

**Prompt**:
```
Task: Implement automatic cleanup of old progress data to prevent unbounded storage growth.

Location: src/runtime/progress/progress-runtime.js

Requirement: Remove workflow entries older than 24 hours from chrome.storage.local

Implementation:
1. Add function: cleanupOldData(maxAgeHours = 24)
   - Gets all workflows from workflowStore
   - Filters out ones where completedAt is older than maxAgeHours
   - Deletes old workflows from storage
   - Returns { deleted: count, remaining: count }

2. Add function: scheduleAutoCleanup()
   - Runs cleanupOldData every 6 hours using setInterval
   - Logs cleanup results
   - Returns function to cancel the interval

3. Call scheduleAutoCleanup() in the init() method of ProgressRuntime
   - Cleanup should not block initialization
   - Handle errors gracefully (log and continue)

4. Add configuration constant at top:
   - CLEANUP_MAX_AGE_HOURS = 24
   - CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000 (6 hours)

5. Add these methods to ProgressRuntime public API:
   - cleanupOldData(maxAgeHours) - Manual cleanup trigger
   - getStorageStats() - Returns { totalWorkflows, totalSize, oldestEntry }

Code safety:
- Wrap chrome.storage calls in try/catch
- Never throw in cleanup (errors should be logged only)
- Test with mock storage

After implementation:
1. Write test covering cleanup logic
2. Verify old workflows are deleted, new ones kept
3. Commit with message: "feat: add automatic session cleanup for old progress data"
4. Push to branch: claude/repo-branch-merge-audit-5rr1f0
```

---

## TASK 5: Implement Extracted Browser Extension Features (Optional)

**Agent Type**: `claude` (general-purpose)

**Prompt**:
```
Task: Implement Phase 1 of the extracted features roadmap (optional enhancement).

Location: src/

Phase 1 focuses on infrastructure and UI foundation (1-1.5 hours):

1. WXT Framework Integration
   - Update wxt.config.ts with support for multiple manifest targets
   - Add build scripts: npm run build:chrome, npm run build:firefox
   - Configure dist-chrome/, dist-firefox/ outputs
   - Add manifest.json version sync script
   
2. Radix UI Component Library
   - Add @radix-ui/react-* dependencies (Button, Card, Dialog, Tabs, Badge, etc)
   - Create src/ui/components/radix/ folder with wrapped Radix primitives
   - Add color scheme support (light/dark mode via css variables)
   - Create component showcase/storybook file
   
3. Setup Foundation
   - Create src/ui/theme/colors.js with CSS variables
   - Create src/ui/hooks/ for common hooks (useProgressData, useStorageSync, etc)
   - Create src/ui/layout/SidePanel.jsx as base layout
   - Add src/ui/styles/base.css with reset and theme

Reference: EXTRACTED_PATTERNS.md for exact implementations

Success criteria:
- WXT builds successfully for both Chrome and Firefox
- Radix UI components render without errors
- Dark mode toggle works
- No runtime warnings in console

After implementation:
1. Test build: npm run build:chrome && npm run build:firefox
2. Verify component storybook renders
3. Commit with message: "feat(phase1): add WXT framework and Radix UI foundation"
4. Push to branch: claude/repo-branch-merge-audit-5rr1f0

Note: Phases 2-4 (Side Panel, Macro Recording, Multi-LLM) are separate tasks after this.
```

---

## TASK 6: Fix OpenBrowser Security Vulnerabilities

**Agent Type**: `claude` (general-purpose)

**Prompt**:
```
Task: Implement 4 critical security fixes for OpenBrowser endpoints.

Location: src/runtime/open-browser/ (or wherever OpenBrowser handlers are)

Fixes required:

1. Rate Limiting on /browser/claim and /browser/heartbeat
   - Add rate limiter: max 10 requests per 10 seconds per IP
   - Use in-memory store (not redis needed for this size)
   - Return 429 Too Many Requests if exceeded
   
2. Chunk Text Length Validation in /browser/chunk
   - Validate chunk.text length <= 10KB
   - Reject with 400 Bad Request if exceeds
   - Prevents memory exhaustion attacks

3. Fix EDIT_FILE Regex Character Escaping
   - Current code likely uses basic string.replace() with regex
   - Change to replaceAll() with proper character escaping
   - Test with filenames containing regex special chars: . * + ? [ ] { } ( ) ^ $ |
   - Example: "src/file[1].js" should not be treated as regex pattern

4. Add Session Expiration Cleanup
   - Sessions in browser state map older than 24 hours should be deleted
   - Cleanup runs every 6 hours
   - Prevents unbounded memory growth

Implementation pattern:
```javascript
// Rate limiter
const rateLimiter = new Map(); // IP → { count, resetTime }
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + 10000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}
```

After implementation:
1. Write tests for each fix
2. Verify rate limiting works
3. Verify escape characters don't break regex
4. Commit with message: "security: fix OpenBrowser endpoint vulnerabilities"
5. Push to branch: claude/repo-branch-merge-audit-5rr1f0
```

---

## Summary

- **Tasks 1-4**: High priority, core integration and stability
- **Task 5**: Optional enhancement with extractable patterns
- **Task 6**: Security fixes for separate component

Each prompt is self-contained and can be assigned to independent agents in parallel.

**Recommended execution order**:
1. Task 1 (wire progress handlers) - unlocks testing progress system
2. Task 2 (dashboard UI) - provides visibility into system
3. Task 3 (fix tests) - improves code quality
4. Task 4 (cleanup) - prevents storage bloat
5. Tasks 5-6 in parallel (optional features and security)

All commits push to: `claude/repo-branch-merge-audit-5rr1f0`
