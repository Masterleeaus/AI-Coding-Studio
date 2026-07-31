# Agent 1 Runtime Trust-Boundary Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the page-accessible remote-config mutation bridge and add fail-closed sender validation to the production DeepSeek API proxy.

**Architecture:** Preserve the monolithic production entry points while extracting a pure sender-policy helper that can be tested without loading the service worker. Remove the unsafe MAIN-world debug API and its host-page DOM panel rather than attempting to authenticate a capability inside the untrusted page world.

**Tech Stack:** JavaScript ES modules, Chrome/Firefox WebExtensions, Svelte 5, Vitest.

## Global Constraints

- Branch: `agent-1/extension-runtime-platforms`.
- Base branch: `integration/local-first-repair`.
- Do not commit directly to `main`.
- Preserve Chrome, Firefox, Android, Svelte 5, Vite, Vitest and Playwright support.
- Do not weaken Content Security Policy.
- Do not introduce unrestricted shell execution or broad new host permissions.
- Treat host pages and page-world scripts as untrusted.
- Do not claim tests passed without execution evidence.

---

### Task 1: Restore the declared Vitest setup entry

**Files:**
- Create: `tests/setup.js`

**Interfaces:**
- Consumes: `vitest.config.js` `setupFiles: ["./tests/setup.js"]`.
- Produces: an existing, side-effect-safe setup module that Vitest can load.

- [ ] **Step 1: Create the missing setup module**

```js
/**
 * Shared Vitest setup.
 *
 * Keep this file intentionally side-effect-light. Individual suites install
 * their own DOM, browser API, and storage mocks so they remain explicit.
 */
```

- [ ] **Step 2: Verify the file is addressable by the configured path**

Run in GitHub Actions:

```bash
test -f tests/setup.js
```

Expected: exit status 0.

- [ ] **Step 3: Commit**

```bash
git add tests/setup.js
git commit -m "test(runtime): restore Vitest setup entry"
```

### Task 2: Write failing sender-policy tests

**Files:**
- Create: `src/background/runtime-policy.test.js`
- Create later: `src/background/runtime-policy.js`

**Interfaces:**
- Consumes: future `isTrustedRuntimeSender(sender, runtimeId)`.
- Produces: an executable specification for accepted extension and content-script senders.

- [ ] **Step 1: Write the failing tests**

```js
import { describe, expect, it } from "vitest";
import { isTrustedRuntimeSender } from "./runtime-policy.js";

const RUNTIME_ID = "extension-id";

describe("isTrustedRuntimeSender", () => {
  it("accepts a Chrome extension page from the same extension", () => {
    expect(isTrustedRuntimeSender({
      id: RUNTIME_ID,
      url: `chrome-extension://${RUNTIME_ID}/settings.html`,
    }, RUNTIME_ID)).toBe(true);
  });

  it("accepts a Firefox extension page from the same extension", () => {
    expect(isTrustedRuntimeSender({
      id: RUNTIME_ID,
      url: "moz-extension://generated-uuid/settings.html",
    }, RUNTIME_ID)).toBe(true);
  });

  it.each([
    "https://claude.ai/chat/1",
    "https://chatgpt.com/c/1",
    "https://openai.com/",
    "https://chat.openai.com/c/1",
    "https://chat.deepseek.com/a/chat/s/1",
  ])("accepts supported content-script URL %s", (url) => {
    expect(isTrustedRuntimeSender({ id: RUNTIME_ID, url, tab: { id: 1 } }, RUNTIME_ID)).toBe(true);
  });

  it("rejects a sender from another extension", () => {
    expect(isTrustedRuntimeSender({
      id: "other-extension",
      url: "chrome-extension://other-extension/page.html",
    }, RUNTIME_ID)).toBe(false);
  });

  it("rejects an unsupported host page", () => {
    expect(isTrustedRuntimeSender({
      id: RUNTIME_ID,
      url: "https://example.com/",
      tab: { id: 1 },
    }, RUNTIME_ID)).toBe(false);
  });

  it.each([null, {}, { id: RUNTIME_ID }, { id: RUNTIME_ID, url: "not a url" }])(
    "rejects incomplete or malformed sender metadata",
    (sender) => {
      expect(isTrustedRuntimeSender(sender, RUNTIME_ID)).toBe(false);
    },
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run in GitHub Actions:

```bash
npx vitest run src/background/runtime-policy.test.js
```

Expected: FAIL because `src/background/runtime-policy.js` does not exist.

- [ ] **Step 3: Commit the failing specification**

```bash
git add src/background/runtime-policy.test.js
git commit -m "test(background): specify trusted runtime senders"
```

### Task 3: Write failing production-boundary regression tests

**Files:**
- Create: `tests/runtime-trust-boundaries.test.js`

**Interfaces:**
- Consumes: production source files as text.
- Produces: regression protection against restoring the page-global debug bridge or removing API-proxy sender validation.

- [ ] **Step 1: Write the failing architecture test**

```js
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("production runtime trust boundaries", () => {
  it("does not expose the remote-config debug bridge to the page world", () => {
    const injected = source("src/injected/index.js");
    const content = source("src/content/index.js");

    expect(injected).not.toContain("__BDS_CONFIG__");
    expect(injected).not.toContain("bds:debug-api-request");
    expect(content).not.toContain("bds:debug-api-request");
    expect(content).not.toContain("applyRemote\");
    expect(content).not.toContain("replaceRemote\");
    expect(content).not.toContain("resetToBuiltin\");
  });

  it("does not mount the mutable config debug panel into the host page", () => {
    const mount = source("src/content/ui/mount.js");
    expect(mount).not.toContain("ConfigDebugPanel");
    expect(mount).not.toContain("bds-config-debug");
  });

  it("validates senders before executing API proxy requests", () => {
    const proxy = source("src/background/api-proxy.js");
    expect(proxy).toContain("isTrustedRuntimeSender");
    expect(proxy).toMatch(/if\s*\(\s*!isTrustedRuntimeSender\(sender/);
  });
});
```

Note: when writing the real file, use the literal strings `applyRemote`, `replaceRemote`, and `resetToBuiltin` without the Markdown escaping shown above.

- [ ] **Step 2: Run the test and verify RED**

Run in GitHub Actions:

```bash
npx vitest run tests/runtime-trust-boundaries.test.js
```

Expected: FAIL because the current production source still contains the debug bridge and API proxy lacks sender validation.

- [ ] **Step 3: Commit the failing specification**

```bash
git add tests/runtime-trust-boundaries.test.js
git commit -m "test(runtime): lock privileged page boundaries"
```

### Task 4: Implement the pure runtime sender policy

**Files:**
- Create: `src/background/runtime-policy.js`
- Test: `src/background/runtime-policy.test.js`

**Interfaces:**
- Produces: `isTrustedRuntimeSender(sender, runtimeId): boolean`.

- [ ] **Step 1: Implement the minimal policy**

```js
const TRUSTED_CONTENT_HOSTS = new Set([
  "claude.ai",
  "chatgpt.com",
  "openai.com",
  "chat.openai.com",
  "chat.deepseek.com",
]);

const EXTENSION_PROTOCOLS = new Set([
  "chrome-extension:",
  "moz-extension:",
  "safari-web-extension:",
]);

export function isTrustedRuntimeSender(sender, runtimeId) {
  if (!sender || !runtimeId || sender.id !== runtimeId) return false;

  const rawUrl = sender.url || sender.origin;
  if (!rawUrl) return false;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (EXTENSION_PROTOCOLS.has(url.protocol)) return true;
  if (url.protocol !== "https:") return false;
  if (!sender.tab) return false;

  return TRUSTED_CONTENT_HOSTS.has(url.hostname);
}
```

- [ ] **Step 2: Run the sender-policy tests**

Run in GitHub Actions:

```bash
npx vitest run src/background/runtime-policy.test.js
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/background/runtime-policy.js
git commit -m "fix(background): add runtime sender policy"
```

### Task 5: Apply sender validation to the API proxy

**Files:**
- Modify: `src/background/api-proxy.js`
- Test: `tests/runtime-trust-boundaries.test.js`

**Interfaces:**
- Consumes: `isTrustedRuntimeSender(sender, chrome.runtime.id)`.
- Produces: structured fail-closed rejection for untrusted API-proxy messages.

- [ ] **Step 1: Import the policy**

```js
import { isTrustedRuntimeSender } from "./runtime-policy.js";
```

- [ ] **Step 2: Guard the listener before calling `proxyApiRequest`**

```js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "bds-api-proxy" && message?.type !== "bds-api-proxy-abort") {
    return false;
  }

  if (!isTrustedRuntimeSender(sender, chrome.runtime.id)) {
    sendResponse({
      ok: false,
      error: "Untrusted runtime sender.",
      status: 0,
    });
    return false;
  }

  // Existing message handling follows.
});
```

- [ ] **Step 3: Run focused tests**

Run in GitHub Actions:

```bash
npx vitest run src/background/runtime-policy.test.js tests/runtime-trust-boundaries.test.js
```

Expected: sender-policy test passes; architecture test still fails only on the debug bridge until Task 6.

- [ ] **Step 4: Commit**

```bash
git add src/background/api-proxy.js
git commit -m "fix(background): validate API proxy senders"
```

### Task 6: Remove the page-accessible remote-config mutation bridge

**Files:**
- Modify: `src/content/index.js`
- Modify: `src/injected/index.js`
- Modify: `src/content/ui/mount.js`
- Delete: `src/content/ui/ConfigDebugPanel.svelte`
- Modify: `extension/remote-config-debug.md`
- Test: `tests/runtime-trust-boundaries.test.js`

**Interfaces:**
- Removes: `window.__BDS_CONFIG__` and the `bds:debug-api-request` / `bds:debug-api-response` bridge.
- Preserves: ordinary remote-config loading, `REMOTE_CONFIG_EVENT`, model detection used by production UI, and the main Svelte application mount.

- [ ] **Step 1: Remove the debug request handler and storage probe from `src/content/index.js`**

Remove the `detectModelType` import when no longer used. Delete the entire storage-probe/debug-request block while preserving `REMOTE_CONFIG_EVENT` synchronization and subsequent pricing initialization.

- [ ] **Step 2: Remove the MAIN-world debug API IIFE from `src/injected/index.js`**

Delete the block beginning with:

```js
// ── Debug API: inspect/override remote config from DevTools ──
```

and ending immediately before the config-update listener.

- [ ] **Step 3: Stop mounting the debug panel**

Remove the `ConfigDebugPanel` import and the `bds-config-debug` mount block from `src/content/ui/mount.js`.

- [ ] **Step 4: Delete the unreachable component**

Delete `src/content/ui/ConfigDebugPanel.svelte` after confirming no remaining imports.

- [ ] **Step 5: Replace the debug documentation with a security retirement note**

Document that the page-world API was removed because MAIN-world globals and host-page DOM are not privileged boundaries. State that a future debug interface must use an extension-owned surface.

- [ ] **Step 6: Run focused tests**

Run in GitHub Actions:

```bash
npx vitest run src/background/runtime-policy.test.js tests/runtime-trust-boundaries.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/content/index.js src/injected/index.js src/content/ui/mount.js extension/remote-config-debug.md tests/runtime-trust-boundaries.test.js
git rm src/content/ui/ConfigDebugPanel.svelte
git commit -m "fix(runtime): remove page-world config mutation bridge"
```

### Task 7: Document the pass and request integration verification

**Files:**
- Create or update: `docs/agents/agent-1-runtime-report.md`
- Update: GitHub issue #3

**Interfaces:**
- Produces: evidence-based findings, changed-file inventory, compatibility assessment, unverified checks, and next-pass scope.

- [ ] **Step 1: Record finding classifications**

Include at least:

- Security risk: page-world remote-config mutation bridge.
- Security risk: unvalidated API-proxy runtime sender.
- Test gap: missing `tests/setup.js`.
- Architectural risk: disconnected core bootstraps.
- Security risk: unvalidated handlers and unrestricted fetch options in `src/background/index.js` remain deferred.
- Security risk: unauthenticated sandbox message execution remains deferred.

- [ ] **Step 2: Record verification honestly**

State that local execution was blocked because the sandbox could not resolve GitHub and that no tests are claimed as passing until Agent 3 runs a safe GitHub Actions workflow.

- [ ] **Step 3: Update coordination issue #3**

Comment with branch, completed batch, tests added, and exact blockers.

- [ ] **Step 4: Open a draft PR**

Target:

```text
agent-1/extension-runtime-platforms
    →
integration/local-first-repair
```

- [ ] **Step 5: Request CodeRabbit review**

Review for browser-extension trust boundaries, MV3 behaviour, regressions, missing tests, unsafe permissions, message handling, and maintainability.
