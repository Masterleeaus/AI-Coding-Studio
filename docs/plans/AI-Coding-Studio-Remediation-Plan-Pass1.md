# AI Coding Studio Pass 1 Remediation Implementation Plan

> **Pass 02 architecture amendment:** The ModuleManager migration tasks in this document are superseded by `AI-Coding-Studio-Pass02-Local-AI-Development-OS-Plan.md`. Critical trust-boundary tasks remain valid. The disconnected module-wrapper tree has been removed rather than activated because it duplicated the live content runtime and included no-op or simulated modules.


> **For agentic workers:** Implement this plan task-by-task on dedicated branches. Use test-driven development, cohesive commits, verification before completion, and a fresh review gate between tasks.

**Goal:** Remove the critical trust-boundary defects, restore a reliable verification baseline, and create a safe staged path from the active legacy runtime to the modular runtime.

**Architecture:** Keep `src/content/index.js` as the production entry point during the security passes. Centralize message/network policy, HTML sanitation, sandbox protocol, archive budgets, and lifecycle cleanup behind focused utilities. Correct and test ModuleManager before migrating one legacy subsystem at a time; do not activate scaffold or simulated modules.

**Tech stack:** Chrome Manifest V3, Firefox WebExtensions, Svelte 5, Vite 6, Vitest 3, Playwright, Android bridge/Gradle.

## Global Constraints

- Work only in `Masterleeaus/AI-Coding-Studio`.
- Do not create `.titan` or a parallel project-management structure.
- Preserve Chrome, Firefox, Chromium, and Android support.
- Preserve the Svelte architecture and existing visual language.
- Do not enable an incomplete module or return simulated success.
- Treat page, model, repository, document, remote-config, and sandbox data as untrusted.
- Do not increase permissions without written technical justification.
- Do not merge into `main` without explicit instruction.
- Every task ends with focused tests and a cohesive commit.

---

## Workstream Order

```text
Repository safety
→ verification baseline
→ background/network boundary
→ HTML rendering boundary
→ page/debug boundary
→ sandbox execution boundary
→ archive/file boundary
→ ModuleManager correctness
→ Auto Continue persistence
→ lifecycle/performance
→ version/docs/CI alignment
→ staged module migration
```

Critical security tasks must land before modular runtime migration.

---

### Task 1: Restore a deterministic test baseline

**Files**

- Modify: `package-lock.json`
- Modify: `package.json`
- Create: `src/test-support/app-state.js`
- Modify: `src/content/parser/character-parser.test.js`
- Create: `scripts/check-test-layout.js`
- Modify: `TESTING.md`
- Create: `.github/workflows/verify.yml`

**Interfaces**

- Produces `resetAppState()` from `src/test-support/app-state.js`.
- Produces `npm run check:test-layout`.
- CI runs locale check, version check, Chrome build, Firefox build, and unit tests before later E2E jobs are enabled.

- [ ] **Step 1: reproduce dependency installation from a clean checkout**

Run:

```bash
rm -rf node_modules
npm ci
```

Expected: dependencies install from the normal npm registry or the exact failing package and registry are recorded. Do not edit the lockfile merely to satisfy a broken private mirror.

- [ ] **Step 2: add a failing test-layout check**

Create `scripts/check-test-layout.js` to parse package scripts/config files and assert that every statically configured test directory and imported local helper exists. The script must exit nonzero with a list of missing paths.

Add:

```json
"check:test-layout": "node scripts/check-test-layout.js"
```

Run:

```bash
npm run check:test-layout
```

Expected before fixes: failure naming `tests/helpers/app-state.js` and any absent configured Playwright roots.

- [ ] **Step 3: move the shared state reset helper into source-owned test support**

Create `src/test-support/app-state.js` exporting:

```js
export function resetAppState(state, defaults) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, structuredClone(defaults));
}
```

Adapt the signature to the actual parser test state object, but keep the helper free of browser globals.

Update `character-parser.test.js` to import from:

```js
import { resetAppState } from "../../test-support/app-state.js";
```

- [ ] **Step 4: make test scripts match real suites**

Keep `test:e2e` only after at least one real Playwright test exists. Do not claim Firefox/Android E2E directories that are absent. Add actual smoke tests in Task 12 rather than hiding missing suites with `--passWithNoTests`.

- [ ] **Step 5: run baseline verification**

```bash
npm run check:test-layout
npm run check-locales
npm run test:unit
npm run build:chrome
npm run build:firefox
```

Expected: all pass. If install is externally blocked, commit no dependency workaround; record the exact registry error in the PR.

- [ ] **Step 6: commit**

```bash
git add package.json package-lock.json src/test-support src/content/parser/character-parser.test.js scripts/check-test-layout.js TESTING.md .github/workflows/verify.yml
git commit -m "test: restore deterministic verification baseline"
```

---

### Task 2: Enforce background message schemas and sender policy

**Files**

- Create: `src/background/security/message-schemas.js`
- Create: `src/background/security/sender-policy.js`
- Modify: `src/background/index.js`
- Modify: `src/background/api-proxy.js`
- Create: `src/background/security/message-schemas.test.js`
- Create: `src/background/security/sender-policy.test.js`

**Interfaces**

```js
validateBackgroundMessage(message) -> { ok: true, value } | { ok: false, error }
isTrustedExtensionSender(sender, runtimeId) -> boolean
```

- [ ] **Step 1: write failing schema tests**

Cover every accepted message type. Assert rejection of missing types, unexpected fields, non-string URLs, excessive strings/bodies, invalid methods, and malformed MCP JSON-RPC objects.

- [ ] **Step 2: implement explicit discriminated schemas**

Use plain JavaScript validators to avoid introducing a large runtime dependency. Return normalized immutable objects. Unknown message types must fail closed.

- [ ] **Step 3: write failing sender tests**

Assert that messages are rejected when:

- `sender.id !== chrome.runtime.id`;
- a tab sender URL is outside supported AI hosts for content-originated operations;
- the sender has neither extension URL nor a supported tab URL.

Allow extension pages and the service worker explicitly.

- [ ] **Step 4: gate both background listeners**

At the top of each listener:

```js
if (!isTrustedExtensionSender(sender, chrome.runtime.id)) {
  sendResponse({ ok: false, error: "Untrusted message sender" });
  return false;
}
const parsed = validateBackgroundMessage(message);
if (!parsed.ok) {
  sendResponse({ ok: false, error: parsed.error });
  return false;
}
```

Dispatch only `parsed.value`.

- [ ] **Step 5: run tests**

```bash
npx vitest run src/background/security/message-schemas.test.js src/background/security/sender-policy.test.js
```

Expected: pass.

- [ ] **Step 6: commit**

```bash
git add src/background
git commit -m "security: validate privileged background messages"
```

---

### Task 3: Restrict privileged network access

**Files**

- Create: `src/background/security/url-policy.js`
- Create: `src/background/security/fetch-with-limits.js`
- Modify: `src/background/index.js`
- Modify: `static/manifest.json`
- Create: `src/background/security/url-policy.test.js`
- Create: `src/background/security/fetch-with-limits.test.js`

**Interfaces**

```js
classifyRemoteUrl(rawUrl, policy) -> { ok: true, url: URL } | { ok: false, error }
fetchWithLimits(url, options, limits) -> Promise<ResponsePayload>
```

Limits:

```js
{
  timeoutMs: 15000,
  maxResponseBytes: 5 * 1024 * 1024,
  allowedMethods: ["GET", "HEAD"]
}
```

- [ ] **Step 1: test URL denial rules**

Reject:

- non-HTTPS protocols;
- URLs with credentials;
- localhost and `.local`;
- IPv4 private, loopback, link-local, multicast, and unspecified ranges;
- IPv6 loopback, link-local, unique-local, IPv4-mapped private addresses;
- redirects into denied destinations.

- [ ] **Step 2: implement URL policy**

Parse with `new URL()`. Resolve hostnames before connection where the runtime permits; revalidate every redirect target. Keep fixed GitHub and language endpoints in separate endpoint-specific paths.

- [ ] **Step 3: constrain generic page fetch**

`bds-fetch-url` becomes GET/HEAD-only, strips caller-provided credentials/cookies and unsafe headers, uses `credentials: "omit"`, sets `redirect: "manual"` or validates redirect hops, and aborts at timeout/byte ceiling.

- [ ] **Step 4: add explicit MCP origin approval**

Store approved origins, not raw URLs or API keys, under a versioned storage key. First connection to an origin requires user confirmation in the content UI. API keys remain in extension storage and are sent only to the approved exact origin.

- [ ] **Step 5: reduce manifest hosts**

After tracing all fixed endpoints, replace `<all_urls>` with the minimum static host set plus the narrowest supported runtime permission strategy. If optional-host permissions are required, request them at the user action that needs them.

- [ ] **Step 6: verify**

```bash
npx vitest run src/background/security/url-policy.test.js src/background/security/fetch-with-limits.test.js
npm run build:chrome
npm run build:firefox
```

- [ ] **Step 7: commit**

```bash
git add src/background static/manifest.json
git commit -m "security: restrict privileged network access"
```

---

### Task 4: Centralize safe Markdown rendering

**Files**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/safe-markdown.js`
- Create: `src/lib/safe-markdown.test.js`
- Modify: all components currently using `{@html}` with model/user/imported content

**Interfaces**

```js
renderSafeMarkdown(markdown, options = {}) -> string
sanitizeGeneratedHtml(html, options = {}) -> string
```

- [ ] **Step 1: add failing exploit tests**

Include script tags, inline event attributes, `javascript:`/`data:` links, SVG/MathML payloads, iframes, forms, malformed nesting, CSS URLs, and ordinary Markdown.

- [ ] **Step 2: add DOMPurify**

Use `dompurify` in browser/Svelte contexts. Configure an explicit allowlist for the elements and attributes AI Coding Studio needs. Forbid style, form controls, embedded browsing contexts, event attributes, and dangerous URI schemes unless a documented feature requires a narrower exception.

- [ ] **Step 3: implement one render path**

`renderSafeMarkdown()` calls `marked.parse()` and sanitizes the result. It also forces external links to safe `rel` values and prevents opener access.

- [ ] **Step 4: replace unsafe call sites**

Every `{@html}` used for untrusted content must receive output only from `renderSafeMarkdown()` or `sanitizeGeneratedHtml()`. Static trusted templates may remain but must be documented at the call site.

- [ ] **Step 5: verify**

```bash
npx vitest run src/lib/safe-markdown.test.js
npm run build:chrome
npm run build:firefox
```

- [ ] **Step 6: commit**

```bash
git add package.json package-lock.json src/lib/safe-markdown* src/content
git commit -m "security: sanitize rendered model and imported HTML"
```

---

### Task 5: Remove production remote-config mutation from page context

**Files**

- Modify: `src/content/index.js`
- Modify: `src/injected/index.js`
- Create: `src/lib/debug-bridge.js`
- Create: `src/lib/debug-bridge.test.js`

**Interfaces**

```js
createDebugBridge({ enabled, nonce, readOnlyMethods }) -> { handleRequest, destroy }
```

- [ ] **Step 1: test production denial**

Simulate a page-dispatched `bds:debug-api-request` for `applyRemote`, `replaceRemote`, and `resetToBuiltin`. Production configuration must ignore all three and leave storage unchanged.

- [ ] **Step 2: remove mutating methods from the page bridge**

No production page-context message may call remote-config persistence methods.

- [ ] **Step 3: gate read-only diagnostics**

Enable only in a development build or after an explicit local developer setting. Generate a nonce with `crypto.getRandomValues()` in the isolated world and require it for every request. Expose only read-only diagnostics.

- [ ] **Step 4: verify and commit**

```bash
npx vitest run src/lib/debug-bridge.test.js
git add src/content/index.js src/injected/index.js src/lib/debug-bridge*
git commit -m "security: remove page-accessible config mutation"
```

---

### Task 6: Harden remote configuration parsing and persistence

**Files**

- Create: `src/lib/remote-config-schema.js`
- Create: `src/lib/remote-config-schema.test.js`
- Modify: `src/lib/remote-config.svelte.js`
- Modify: `src/lib/remote-persistence.js`

**Interfaces**

```js
validateRemoteConfig(input) -> { ok: true, value } | { ok: false, errors }
safeDeepMerge(target, source) -> object
```

- [ ] **Step 1: write failing schema and pollution tests**

Test unknown keys, wrong types, excessive depth, excessive array/string sizes, `__proto__`, `prototype`, `constructor`, stale schema versions, and high-risk flags.

- [ ] **Step 2: implement a versioned data-only schema**

Reject unknown keys by default. Use `Object.create(null)` or own-property copies. Reject prototype-related keys at every depth. Cap payload bytes and nesting depth before merge.

- [ ] **Step 3: implement last-known-good behavior**

Only persist a validated config. Keep built-in defaults and last-known-good separately. A failed refresh must not erase either.

- [ ] **Step 4: prevent remote activation of dangerous behavior**

Network config may tune presentation/data values but cannot enable code execution, bypass approval, broaden permissions, or alter trusted origins.

- [ ] **Step 5: verify and commit**

```bash
npx vitest run src/lib/remote-config-schema.test.js
git add src/lib/remote-config*
git commit -m "security: validate and constrain remote configuration"
```

---

### Task 7: Define an authenticated sandbox protocol

**Files**

- Create: `src/sandbox/protocol.js`
- Create: `src/sandbox/protocol.test.js`
- Modify: `src/sandbox/index.js`
- Modify: office export and code-runner Svelte cards
- Modify: `src/lib/utils/html-utils.js`

**Interfaces**

```js
createSandboxRequest(operation, payload, nonce) -> SandboxRequest
validateSandboxRequest(value, expectedNonce) -> ValidationResult
runSandboxRequest(iframe, request, { timeoutMs, signal }) -> Promise<SandboxResponse>
```

- [ ] **Step 1: test source, nonce, schema, and limits**

Reject wrong source, missing/wrong nonce, unknown operation, duplicate request ID, oversized code/payload, and oversized result.

- [ ] **Step 2: use cryptographically strong IDs**

Generate request IDs and per-frame nonces with `crypto.getRandomValues()`.

- [ ] **Step 3: authenticate both directions**

Sandbox accepts only `event.source === window.parent` plus valid nonce/schema. Caller accepts only `event.source === iframe.contentWindow` plus matching nonce/request ID. Use the exact extension origin where supported.

- [ ] **Step 4: add timeout and cancellation**

Default office generation timeout: 60 seconds. Default preview/code timeout: 15 seconds. Always remove listeners and reset UI state on resolve, reject, timeout, abort, or component destroy.

- [ ] **Step 5: restore globals in `finally`**

Every temporary override of PptxGenJS, XLSX, DOCX, fetch, console, or other globals is restored in a `finally` block.

- [ ] **Step 6: verify**

```bash
npx vitest run src/sandbox/protocol.test.js src/lib/utils/html-utils.test.js
npm run build:chrome
npm run build:firefox
```

Add Playwright smoke tests after Task 12.

- [ ] **Step 7: commit**

```bash
git add src/sandbox src/content/ui src/lib/utils/html-utils.js
git commit -m "security: authenticate and bound sandbox execution"
```

---

### Task 8: Bound ZIP, repository, and folder ingestion

**Files**

- Create: `src/content/files/ingestion-policy.js`
- Create: `src/content/files/ingestion-policy.test.js`
- Modify: `src/background/index.js`
- Modify: `src/content/files/github-reader.js`
- Modify: `src/content/files/folder-reader.js`
- Modify: project-ingestion UI summaries

**Interfaces**

```js
DEFAULT_INGESTION_LIMITS = {
  maxArchiveBytes: 25 * 1024 * 1024,
  maxExpandedBytes: 100 * 1024 * 1024,
  maxEntries: 5000,
  maxCompressionRatio: 100,
  maxTextBytes: 10 * 1024 * 1024,
  maxSingleTextBytes: 2 * 1024 * 1024
}
classifyProjectPath(path) -> { include, reason, sensitivity }
```

- [ ] **Step 1: write malicious and large-fixture tests**

Cover `../` traversal, absolute paths, duplicate normalized paths, archive bomb ratios, excessive count, excessive aggregate text, invalid UTF-8, binary masquerading as text, `.env*`, PEM/private keys, credential files, and normal projects.

- [ ] **Step 2: enforce limits before base64/message transfer**

Reject oversized GitHub ZIP responses before reading the full body where `Content-Length` is available, stream/count when possible, and cap runtime message payloads.

- [ ] **Step 3: normalize and classify every path**

Reject traversal and duplicates. Exclude secrets and hidden credential stores by default. Show exclusions with reasons.

- [ ] **Step 4: add user-visible partial-ingestion reporting**

Report included count/bytes, skipped count/bytes, truncation, sensitive exclusions, and cancellation.

- [ ] **Step 5: verify and commit**

```bash
npx vitest run src/content/files/ingestion-policy.test.js src/content/files/project-file-builder.test.js
git add src/background/index.js src/content/files src/content/ui
git commit -m "security: bound repository and folder ingestion"
```

---

### Task 9: Correct ModuleManager invariants before module migration

**Files**

- Modify: `src/core/ModuleManager.js`
- Create: `src/core/ModuleManager.test.js`
- Modify: `src/core/ModuleInterface.js`

**Interfaces**

Module states:

```js
"registered" | "initializing" | "ready" | "failed" | "disabled" | "destroying" | "destroyed"
```

Initialization result:

```js
{
  ok: boolean,
  ready: string[],
  failed: Array<{ name: string, error: Error }>,
  skipped: Array<{ name: string, reason: string }>
}
```

- [ ] **Step 1: write failing invariant tests**

Test duplicate config registration, unknown dependency, direct cycle, indirect cycle, dependency failure, optional-module failure isolation, init twice, destroy order, listener cleanup, and re-init after destroy.

- [ ] **Step 2: fix duplicate detection**

Use:

```js
if (this.moduleConfigs.has(name)) {
  throw new Error(`Module "${name}" is already registered`);
}
```

- [ ] **Step 3: implement cycle detection**

Track `visited` and `visiting`. When revisiting a `visiting` node, throw an error containing the full cycle path.

- [ ] **Step 4: model failure states**

Do not mark the manager globally healthy when required modules fail. Skip dependents with a structured reason. Preserve errors in `getStatus()`.

- [ ] **Step 5: verify and commit**

```bash
npx vitest run src/core/ModuleManager.test.js
git add src/core
git commit -m "fix: enforce module lifecycle invariants"
```

---

### Task 10: Make core module lifecycle cleanup idempotent

**Files**

- Modify: `src/modules/core/StorageModule.js`
- Modify: `src/modules/core/BridgeModule.js`
- Modify: `src/modules/core/EventBusModule.js`
- Create: `src/modules/core/core-modules.test.js`

**Interfaces**

Every module must support safe:

```text
init → destroy → init → destroy
```

without duplicate listeners, timers, observers, or persisted function objects.

- [ ] **Step 1: write listener-count tests**

Use fake Chrome/window event targets to assert exactly one listener after init and zero after destroy.

- [ ] **Step 2: retain exact callback references**

Never register an anonymous listener that cannot be removed. Track initialized state and refuse duplicate registration.

- [ ] **Step 3: validate bridge messages**

Reuse the authenticated bridge protocol from Tasks 2 and 5. Fail closed on unknown schemas.

- [ ] **Step 4: verify and commit**

```bash
npx vitest run src/modules/core/core-modules.test.js
git add src/modules/core
git commit -m "fix: make core module cleanup idempotent"
```

---

### Task 11: Repair Auto Continue state and safety limits

**Files**

- Modify: `src/modules/features/AutoContinueModule.js`
- Create: `src/modules/features/AutoContinueModule.test.js`
- Create: `src/modules/features/auto-continue-schema.js`

**Interfaces**

Persist only:

```js
{
  schemaVersion: 1,
  sessionId: string,
  providerId: string,
  continuationCount: number,
  startedAt: number,
  lastActivityAt: number,
  status: "idle" | "waiting" | "submitting" | "cancelled" | "complete",
  pendingPrompt: string | null
}
```

- [ ] **Step 1: write failing storage/restart tests**

Test exact key round-trip, malformed legacy data, provider rehydration by ID, restart during submission, duplicate event, cancellation, and exhausted limits.

- [ ] **Step 2: unify storage semantics**

Use one versioned map key or explicit per-session keys with matching list/restore logic. Never persist adapter functions/instances.

- [ ] **Step 3: implement provider signals**

Provider adapters return explicit generation/completion/error/continue-control signals. Aggregate them with a documented threshold and avoid inferred false success.

- [ ] **Step 4: enforce passed options**

Use bootstrap/module options for max continuations, max elapsed time, minimum delay, retry backoff, and duplicate-submission lock.

- [ ] **Step 5: verify and commit**

```bash
npx vitest run src/modules/features/AutoContinueModule.test.js
git add src/modules/features/AutoContinueModule.js src/modules/features/auto-continue-schema.js
git commit -m "fix: persist and bound auto-continue sessions"
```

---

### Task 12: Add real extension smoke tests

**Files**

- Create: `tests/e2e/extension-load.spec.js`
- Create: `tests/e2e/content-mount.spec.js`
- Create: `tests/e2e/background-security.spec.js`
- Create: `tests/e2e/sandbox-protocol.spec.js`
- Modify: `playwright.config.js`
- Create or modify: `.github/workflows/verify.yml`

- [ ] **Step 1: load the unpacked Chrome extension**

Build Chrome, launch persistent Chromium with the unpacked extension, and assert the service worker starts without an uncaught exception.

- [ ] **Step 2: mount against controlled host fixtures**

Use local fixture pages that mimic only the supported host contract. Assert one UI mount and graceful fallback when selectors are absent.

- [ ] **Step 3: test privileged boundary rejection**

From a fixture page, attempt invalid background fetch/debug/sandbox requests and assert denial.

- [ ] **Step 4: add Firefox smoke coverage**

Use the repository’s Firefox build and the supported Playwright/WebExtension strategy. Keep Chrome-only assertions behind platform adapters.

- [ ] **Step 5: run**

```bash
npm run build:chrome
npm run build:firefox
npm run test:e2e
npm run test:e2e:firefox
```

- [ ] **Step 6: commit**

```bash
git add tests/e2e playwright.config.js .github/workflows/verify.yml
git commit -m "test: add extension boundary smoke coverage"
```

---

### Task 13: Synchronize release identity

**Files**

- Create: `scripts/check-version-consistency.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `static/manifest.json`
- Modify: `manifest-multiplatform.json`
- Modify: `src/background/index.js`
- Inspect/modify Android version metadata
- Modify: `.github/workflows/verify.yml`

- [ ] **Step 1: write a failing consistency script**

Assert all release surfaces equal the package version. Add:

```json
"check:versions": "node scripts/check-version-consistency.js"
```

- [ ] **Step 2: choose the authoritative release version**

For the current imported release, use `2.1.0` across package, lockfile, manifests, MCP metadata, and Android metadata unless repository history proves a different release contract.

- [ ] **Step 3: derive build metadata**

Where possible, have `build.js` inject the package version instead of maintaining literals.

- [ ] **Step 4: verify and commit**

```bash
npm run check:versions
npm run build:chrome
npm run build:firefox
git add package.json package-lock.json static/manifest.json manifest-multiplatform.json src/background/index.js android scripts/check-version-consistency.js .github/workflows/verify.yml
git commit -m "build: synchronize release version metadata"
```

---

### Task 14: Introduce scoped lifecycle disposables

**Files**

- Create: `src/core/DisposableScope.js`
- Create: `src/core/DisposableScope.test.js`
- Modify: active content subsystems with permanent timers/observers/listeners
- Modify: `src/content/index.js`

**Interfaces**

```js
scope.listen(target, type, listener, options)
scope.timeout(callback, delay)
scope.interval(callback, delay)
scope.observe(observer, target, options)
scope.dispose()
```

- [ ] **Step 1: test disposal**

Assert listeners, timeouts, intervals, and observers are removed exactly once and disposal is idempotent.

- [ ] **Step 2: migrate the active entry point first**

Create one root scope for content initialization. Dispose it on explicit teardown and test reinitialization without duplicate scans.

- [ ] **Step 3: migrate high-frequency subsystems**

Prioritize URL watcher, chat scanner, status monitor, theme watcher, sidebar injectors, and card-level message handlers.

- [ ] **Step 4: add runtime diagnostics**

In developer mode expose counts of active scopes, timers, observers, and listeners without exposing user content.

- [ ] **Step 5: verify and commit**

```bash
npx vitest run src/core/DisposableScope.test.js
npm run test:e2e
git add src/core src/content
git commit -m "refactor: centralize runtime lifecycle cleanup"
```

---

### Task 15: Reconcile documentation and remote ownership

**Files**

- Modify: `README.md`
- Modify: `TESTING.md`
- Modify: `MULTIPLATFORM_GUIDE.md`
- Modify: constants and remote-resource URLs
- Create: `docs/UPSTREAM-ATTRIBUTION.md`
- Create: `scripts/check-project-links.js`

- [ ] **Step 1: inventory every old-project URL**

Classify each as runtime dependency, attribution, release link, support link, or stale documentation.

- [ ] **Step 2: move owned resources**

Point owned remote config/locales/pricing/status resources to `Masterleeaus/AI-Coding-Studio`. Keep original-project credit in attribution, not in operational endpoints.

- [ ] **Step 3: update contributor commands to match verified scripts**

Remove absolute local paths and nonexistent CI/test claims.

- [ ] **Step 4: verify links and offline fallback**

```bash
node scripts/check-project-links.js
npm run build:chrome
```

Disable network during a startup smoke test and confirm built-in config/locales remain usable.

- [ ] **Step 5: commit**

```bash
git add README.md TESTING.md MULTIPLATFORM_GUIDE.md docs scripts src/lib
git commit -m "docs: align project ownership and verified workflows"
```

---

### Task 16: Begin staged module migration

**Files**

- Create: `docs/MODULE_RUNTIME_MIGRATION.md`
- Modify: `src/core/bootstrap-enhanced.js`
- Modify only the first selected target module and its corresponding legacy subsystem
- Add parity and integration tests

- [ ] **Step 1: map active responsibilities**

For each direct call in `src/content/index.js`, document the target module, current owner, dependencies, cleanup behavior, and tests.

- [ ] **Step 2: disable incomplete factories explicitly**

No-op and simulated modules remain disabled and labelled experimental. The build must not advertise them as fully integrated.

- [ ] **Step 3: migrate one low-risk subsystem**

Start with localization or event bus only after its real implementation wraps the existing production behavior. Keep one owner—never initialize both legacy and module paths.

- [ ] **Step 4: add parity tests**

The migrated module must preserve state, UI behavior, storage keys, platform behavior, and cleanup.

- [ ] **Step 5: verify all platforms**

```bash
npm run check-locales
npm run test:unit
npm run build:chrome
npm run build:firefox
npm run test:e2e
```

- [ ] **Step 6: commit**

```bash
git add docs/MODULE_RUNTIME_MIGRATION.md src/core src/modules src/content tests
git commit -m "refactor: migrate first production subsystem to module runtime"
```

---

## Final Verification Gate

Before any production-readiness statement:

```bash
npm ci
npm run check:test-layout
npm run check:versions
npm run check-locales
npm run build:chrome
npm run build:firefox
npm run test:unit
npm run test:e2e
npm run test:e2e:firefox
npm run build:android
npm run android:test
```

Also verify:

- no critical audit finding remains open;
- no no-op/simulated module is advertised as integrated;
- no production page event mutates configuration;
- no wildcard, unauthenticated sandbox bridge remains;
- no generic privileged fetch can reach denied origins;
- repeated mount/destroy cycles leave no listeners, timers, or observers;
- generated DOCX/XLSX/PPTX files open in standard office software.

## Recommended Branch Sequence

```text
fix/repository-import-safety
test/verification-baseline
fix/background-message-validation
fix/privileged-url-policy
fix/safe-markdown-rendering
fix/remote-config-boundary
fix/sandbox-runtime
fix/project-ingestion-limits
fix/module-manager-lifecycle
fix/auto-continue-recovery
test/extension-smoke
build/version-consistency
refactor/runtime-disposables
docs/project-ownership
refactor/module-migration-localization
```

Each branch should open a draft PR and be reviewed before the next security-dependent branch is merged.
