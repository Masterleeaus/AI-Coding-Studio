# Background Service Progress Tracking Integration

This document shows how progress tracking is integrated into the background service message handlers.

## Quick Start

The background service automatically tracks progress for all operations. Each handler reports its status back to the RuntimeKernel.

### Example: YouTube Transcript Fetching

```javascript
// Before: Without progress tracking
if (message.type === "bds-get-youtube-transcript") {
  fetchTranscript(message.videoId)
    .then((transcript) => {
      sendResponse({ ok: true, transcript });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });
  return true;
}

// After: With progress tracking
if (message.type === "bds-get-youtube-transcript") {
  trackProgress(
    'background-youtube',
    'fetch-transcript',
    `Fetching transcript for video ${message.videoId}`,
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

## Available Helper Functions

### `trackProgress(agentName, actionId, description, handler)`

Wraps any async operation with automatic start/complete/fail logging.

```javascript
await trackProgress(
  'background-github',
  'fetch-commits',
  'Fetching commits from repository',
  () => fetchGithubCommits(owner, repo, branch, count, token)
);
```

**Returns**: The result from the handler function

**Logs**:
- `start`: When operation begins
- `complete`: When operation succeeds with result
- `fail`: When operation throws an error

### `trackedFetch(agentName, actionId, description, fetchFn)`

Specialized wrapper for HTTP fetch operations.

```javascript
const result = await trackedFetch(
  'background-web',
  'fetch-page',
  'Fetching page content from example.com',
  () => fetchPageContent('https://example.com')
);
```

### `createBackgroundWorkflow(workflowType, agentName)`

For complex multi-step operations:

```javascript
const workflow = await createBackgroundWorkflow('BATCH_OPERATION', 'background-batch');

const result = await workflow.execute(repository, 'main', [
  {
    id: 'step-1',
    title: 'Fetch GitHub Data',
    handler: async () => fetchGithubCommits(...)
  },
  {
    id: 'step-2',
    title: 'Process Results',
    handler: async () => processResults(...)
  }
]);
```

### `getProgressSummary(agentName)`

Retrieve progress stats for a specific agent:

```javascript
const summary = getProgressSummary('background-github');
// Returns: { agent, totalActions, completed, failed, recentActions, globalSummary }
```

### `generateReport(agentName)`

Generate a markdown progress report:

```javascript
const report = generateReport('background-github');
console.log(report);
```

## Agent Naming Convention

Background agents use descriptive names:

- `background-youtube` - YouTube transcript operations
- `background-github` - GitHub API operations
- `background-web` - Web page fetching
- `background-mcp` - MCP tool integration
- `background-languages` - Language detection/updates
- `background-tools` - Tool discovery operations

## Integration Pattern

### Before Integration

```javascript
if (message.type === "bds-fetch-github-zip") {
  fetchGithubZip(message.url, message.token)
    .then((base64) => {
      sendResponse({ ok: true, base64 });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });
  return true;
}
```

### After Integration

```javascript
if (message.type === "bds-fetch-github-zip") {
  trackProgress(
    'background-github',
    'fetch-zip',
    `Fetching GitHub repository zip from ${message.url}`,
    () => fetchGithubZip(message.url, message.token)
  )
    .then((base64) => {
      sendResponse({ ok: true, base64 });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });
  return true;
}
```

## What Gets Tracked

For each operation wrapped with `trackProgress()`:

1. **Start Time**: When operation begins
2. **Description**: What operation is doing
3. **Duration**: How long it took
4. **Status**: Success, failure, or in-progress
5. **Error Details**: If operation failed
6. **Agent Name**: Which background service executed it

## Accessing Progress from Content Script

From content scripts or other parts of the extension:

```javascript
import { getRuntimeKernel } from '../runtime/singleton.js';

const kernel = getRuntimeKernel();

// Get progress for background operations
const bgProgress = kernel.progress.getAgentProgress('background-github');
console.log(`Background completed ${bgProgress.length} operations`);

// Get overall progress
const summary = kernel.progress.getProgressSummary();
console.log(`Total actions: ${summary.totalEntries}`);
console.log(`Success rate: ${summary.byStatus.completed}/${summary.totalEntries}`);

// Generate report
const report = kernel.progress.generateProgressReport();
console.log(report);
```

## Real-time Monitoring

The background service automatically persists progress to `chrome.storage.local`, making it available to other parts of the extension.

Example: Monitor background operations in real-time:

```javascript
chrome.storage.local.get(['progressData'], (result) => {
  const progress = result.progressData;
  console.log('Current background operations:', progress);
});
```

## Error Handling

Progress tracking is resilient to errors:

- ✅ Works even if RuntimeKernel is unavailable
- ✅ Works in non-browser environments (graceful degradation)
- ✅ Non-blocking (doesn't slow down operations)
- ✅ Errors in tracking don't affect operations

## Guidelines for Implementation

1. **Wrap at the appropriate level**: Wrap the main operation, not sub-operations
2. **Use descriptive action IDs**: `fetch-commits`, `process-zip`, `detect-tools`
3. **Include context in description**: What is being done and for whom
4. **Group related operations**: Use consistent agent names
5. **Let trackProgress handle errors**: Don't add extra try/catch around it

## Examples for All Message Types

### YouTube Transcript
```javascript
trackProgress(
  'background-youtube',
  'get-transcript',
  `Fetching transcript for YouTube video ${message.videoId}`,
  () => fetchTranscript(message.videoId)
)
```

### GitHub Operations
```javascript
// Fetch zip
trackProgress(
  'background-github',
  'fetch-zip',
  `Fetching repository zip from ${message.url}`,
  () => fetchGithubZip(message.url, message.token)
)

// Fetch commits
trackProgress(
  'background-github',
  'fetch-commits',
  `Fetching commits from ${message.owner}/${message.repo}`,
  () => fetchGithubCommits(message.owner, message.repo, message.branch, message.count, message.token)
)
```

### Web Fetching
```javascript
trackProgress(
  'background-web',
  'fetch-url',
  `Fetching content from ${message.url}`,
  () => fetchUrlContent(message.url)
)
```

### Tool Discovery
```javascript
trackProgress(
  'background-tools',
  'detect-tools',
  'Discovering available tools',
  () => toolDetection()
)
```

### MCP Operations
```javascript
trackProgress(
  'background-mcp',
  'list-tools',
  `Listing tools from ${message.server}`,
  () => mcpListTools(message.server)
)

trackProgress(
  'background-mcp',
  'call-tool',
  `Calling tool ${message.toolName} on ${message.server}`,
  () => mcpCallTool(message.server, message.toolName, message.arguments)
)
```

## Viewing Progress

Progress data is automatically stored and can be viewed through:

1. **Content Script API**: `kernel.progress.getAgentProgress('background-...')`
2. **Storage**: `chrome.storage.local` under `progressData`
3. **Console**: `console.log(kernel.progress.getProgressSummary())`
4. **Reports**: `kernel.progress.generateProgressReport()`

## Next Steps

1. Add progress tracking to all message handlers in `src/background/index.js`
2. Create a background service monitor/dashboard component
3. Add progress visualization to the extension UI
4. Set up alerts for failed background operations
