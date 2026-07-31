# Agent 1 — Extension Runtime and AI Platform Report

## Pass Status

This report covers Agent 1's first implementation batch under the three-agent local-first repair workflow.

The batch is **source-complete but not integration-ready**. Focused source changes and regression tests are committed, but the repository's full Vitest, Chrome, Firefox, Playwright, and Android verification has not run. CodeRabbit review is also blocked by the current execution environment.

## End-of-Pass Summary

| Field | Status |
|---|---|
| Repository | `Masterleeaus/AI-Coding-Studio` |
| Agent role | `1` — Extension Runtime and AI Platform Agent |
| Branch | `agent-1/extension-runtime-platforms` |
| Base branch | `integration/local-first-repair` |
| Branch relationship | 14 commits ahead, 0 behind at report time |
| Confirmed findings | 9 findings classified below |
| Files changed | 12 before this report |
| Tests added or updated | `src/background/runtime-policy.test.js`, `tests/runtime-trust-boundaries.test.js`, `tests/setup.js` |
| GitHub Actions runs inspected | No safe Agent 1 verification run exists yet |
| Checks passing | Local sender-policy smoke check: 7 accepted and 8 rejected cases; `node --check` passed for exact sender-policy and API-proxy replacement text |
| Checks failing | None executed to a test failure result; full dependency-backed checks are unexecuted |
| CodeRabbit findings | None: CLI unavailable and installation failed because `cli.coderabbit.ai` could not be resolved |
| Draft PR | Pending creation at time of this commit |

## Runtime Map

### Build Entry Points

`build.js` produces four independent runtime bundles:

```text
src/content/index.js
    → content script startup

src/background/index.js
    → Manifest V3 background service worker
    → imports src/background/api-proxy.js

src/injected/index.js
    → MAIN-world network interception script

src/sandbox/index.js
    → document-generation sandbox runtime
```

Chrome and Firefox use the extension platform globals entry. Android replaces the platform alias with `src/platform/globals-android.js` and installs the Android `chrome.*` polyfill before the content runtime starts.

### Production Startup Order

The production content startup currently follows this order:

1. wait for `document.body`
2. load persistent state
3. initialise locale
4. request background language refresh
5. inject the MAIN-world hook
6. install content/injected bridge listeners
7. mount the primary Svelte UI
8. initialise deep research
9. bind storage changes
10. start URL, DOM, sidebar, search, status, and theme observers
11. push runtime configuration into the injected network adapter
12. discover MCP schemas and push an updated configuration
13. initialise external pricing data

The production runtime does **not** import `src/core/bootstrap.js` or `src/core/bootstrap-enhanced.js`. Those files define a second module-manager architecture that remains disconnected from the actual build entries.

## Files Inspected

### Repository and Build

- `README.md`
- `package.json`
- `build.js`
- `static/manifest.json`
- `vitest.config.js`
- `.github/workflows/import-source.yml`
- `scripts/check-locales.js`
- `docs/audits/AI-Coding-Studio-v2.1.0-Audit-Issues-Cumulative-Pass5.md`

### Runtime

- `src/content/index.js`
- `src/content/bridge.js`
- `src/content/ui/mount.js`
- `src/content/ui/ConfigDebugPanel.svelte`
- `src/content/files/web-reader.js`
- `src/content/files/search-reader.js`
- `src/background/index.js`
- `src/background/api-proxy.js`
- `src/injected/index.js`
- `src/sandbox/index.js`
- `src/platform/globals-chrome.js`
- `src/platform/globals-android.js`
- `src/lib/constants.js`
- `src/lib/pricing.js`

### Parallel/Modular Runtime

- `src/core/bootstrap.js`
- `src/core/bootstrap-enhanced.js`
- `src/core/ModuleManager.js`
- `src/modules/features/BrowserAutomationModule.js`
- `src/modules/features/AutoContinueModule.js`

### Tests and Documentation

- representative `src/**/*.test.js` results through repository code search
- missing `tests/setup.js` path from `vitest.config.js`
- `extension/remote-config-debug.md`
- coordination issue `#3`

## Findings

### A1-001 — Page-World Remote-Config Mutation Bridge

- **Classification:** Security risk
- **Affected files:** `src/injected/index.js`, `src/content/index.js`
- **Subsystem:** injected/content trust boundary
- **Evidence:** MAIN-world code exposed `window.__BDS_CONFIG__` and dispatched `bds:debug-api-request`. Isolated-world content code accepted that event and could apply, replace, or reset remote configuration and operate storage probes.
- **Impact:** scripts executing in the host page shared the same MAIN world and could invoke a privileged-looking mutation channel.
- **Likely cause:** DevTools convenience API was treated as a trusted extension boundary.
- **Repair:** removed the global API and the request/response bridge from production entries.
- **Regression risk:** DevTools commands using `window.__BDS_CONFIG__` no longer work by design.
- **Required test:** source-boundary regression test proving the global and event bridge remain absent.
- **Status:** Repaired in this branch; execution-level verification pending.

### A1-002 — Mutable Debug Panel Mounted in Host DOM

- **Classification:** Security risk
- **Affected files:** `src/content/ui/mount.js`, `src/content/ui/ConfigDebugPanel.svelte`
- **Subsystem:** visible extension UI / configuration
- **Evidence:** the hidden panel was always mounted into third-party page DOM and directly mutated remote configuration.
- **Impact:** hidden DOM and page-visible events do not provide access control; host scripts could inspect or interact with the panel.
- **Likely cause:** diagnostic UI was embedded beside the production application instead of using an extension-owned page.
- **Repair:** removed the mount and neutralised the component into an inert tombstone. Direct deletion was attempted but blocked by the connector's safety control.
- **Regression risk:** the former host-page config debugger is intentionally unavailable.
- **Required test:** source assertion that `mount.js` contains no panel import or mount root.
- **Status:** Repaired in this branch; approved deletion can remove the inert tombstone later.

### A1-003 — API Proxy Accepted Unvalidated Runtime Senders

- **Classification:** Security risk
- **Affected files:** `src/background/api-proxy.js`
- **Subsystem:** Manifest V3 background API proxy
- **Evidence:** the runtime message listener dispatched DeepSeek API requests without checking `sender.id`, sender URL, or supported host.
- **Impact:** cross-extension or malformed sender contexts were not explicitly rejected before privileged network activity.
- **Likely cause:** reliance on the runtime channel itself as sufficient authentication.
- **Repair:** added `isTrustedRuntimeSender()` and applied it before proxy and abort handling.
- **Regression risk:** messages from unsupported pages or incomplete browser sender metadata now fail closed.
- **Required test:** allow/reject matrix for extension pages and supported content-script hosts.
- **Status:** Repaired in this branch; browser integration verification pending.

### A1-004 — Injected Network-State Event Name Was Undefined

- **Classification:** Confirmed defect
- **Affected file:** `src/injected/index.js`
- **Subsystem:** response/network activity detection
- **Evidence:** `emitNetworkState()` constructed `CustomEvent(EVENTS.networkState, ...)`, but `networkState` was absent from the local event map. The shared content bridge contract defines it as `bds:network-state`.
- **Impact:** network start/end events could be dispatched under an unintended event name, breaking status and completion detection.
- **Likely cause:** duplicated event dictionaries drifted apart.
- **Repair:** restored `networkState: "bds:network-state"` and added a contract assertion.
- **Regression risk:** low; the change aligns the injected emitter with the existing listener.
- **Required test:** assert both sides use the same literal event name.
- **Status:** Repaired in this branch; browser execution verification pending.

### A1-005 — Declared Vitest Setup File Missing

- **Classification:** Test gap
- **Affected files:** `vitest.config.js`, `tests/setup.js`
- **Subsystem:** unit-test startup
- **Evidence:** `vitest.config.js` declares `./tests/setup.js`, but the file did not exist.
- **Impact:** Vitest startup could fail before loading test suites.
- **Likely cause:** incomplete source import or deleted helper.
- **Repair:** added a side-effect-light setup module.
- **Regression risk:** low.
- **Required test:** execute the configured Vitest command in CI.
- **Status:** Source repaired; Vitest not executed.

### A1-006 — Background Router Still Lacks Shared Sender Validation

- **Classification:** Security risk
- **Affected file:** `src/background/index.js`
- **Subsystem:** background message router
- **Evidence:** multiple privileged message handlers accept messages without the sender policy introduced for the API proxy.
- **Impact:** inconsistent trust enforcement remains across background services.
- **Likely cause:** one large multi-responsibility listener accumulated independently implemented handlers.
- **Proposed repair:** extract testable message routing, classify operations, validate senders before every privileged path, and preserve Android/browser compatibility.
- **Regression risk:** high if changed without tracing all content and extension-page call sites.
- **Required test:** per-message sender allow/reject matrix and service-worker restart tests.
- **Status:** Open; recommended next Agent 1 pass.

### A1-007 — Arbitrary-URL Background Fetch Surface

- **Classification:** Security risk
- **Affected file:** `src/background/index.js`
- **Subsystem:** web/search/pricing fetch proxy
- **Evidence:** `bds-fetch-url` combines broad host permission with caller-provided URL and request options, including method, headers, body, credentials, cache, and redirect behaviour.
- **Impact:** a compromised allowed page or unsafe extension caller could potentially abuse privileged cross-origin fetch capability.
- **Likely cause:** generic CORS bypass was shared across unrelated readers and pricing functions.
- **Proposed repair:** bounded GET-only request schema, safe-header allowlist, timeouts, response-size limits, private-network rejection, redirect validation, and purpose-specific destinations where possible.
- **Regression risk:** medium to high because web reader, search reader, YouTube/Twitter readers, and pricing use the surface.
- **Required test:** URL/protocol/private-network rejection and allowed reader cases.
- **Status:** Open; recommended next Agent 1 pass.

### A1-008 — Sandbox Executes Unauthenticated Message Code

- **Classification:** Security risk
- **Affected file:** `src/sandbox/index.js`
- **Subsystem:** PPTX/XLSX/DOCX generation sandbox
- **Evidence:** the sandbox accepts any `message`, executes supplied code with `AsyncFunction`, and posts results to `"*"` without validating source, channel identity, request schema, timeout, or cleanup in all failure paths.
- **Impact:** the null-origin sandbox limits direct privilege, but the message boundary is unauthenticated and generated-code execution remains broad.
- **Likely cause:** isolation was treated as sufficient without a request-channel protocol.
- **Proposed repair:** extension-owned host validation, authenticated `MessageChannel`, strict type/schema validation, request timeouts, output limits, deterministic cleanup, and no wildcard response target where avoidable.
- **Regression risk:** high; document generation requires end-to-end tests.
- **Required test:** foreign source rejection, malformed request rejection, timeout, cleanup, and one success case per document type.
- **Status:** Open; separate Agent 1 pass required.

### A1-009 — Competing Disconnected Runtime Architecture

- **Classification:** Architectural risk / incomplete implementation / documentation drift
- **Affected files:** `src/core/bootstrap.js`, `src/core/bootstrap-enhanced.js`, `src/modules/**`, modular documentation
- **Subsystem:** startup and module lifecycle
- **Evidence:** the production build does not import either core bootstrap. `BrowserAutomationModule` contains a request router that always throws `Handler not implemented`; `AutoContinueModule` contains placeholder completion checks that always return false.
- **Impact:** documentation and source layout can imply features are active when the production runtime never initialises them. Activating the enhanced bootstrap would expose incomplete modules.
- **Likely cause:** parallel architecture work was added without production cutover or retirement plan.
- **Proposed repair:** map each modular capability to production equivalents, classify reachable/dynamic code, migrate one tested subsystem at a time, and only then retire duplicates.
- **Regression risk:** very high if the bootstrap is switched wholesale.
- **Required test:** build-entry reachability, module lifecycle, startup diagnostics, and platform-specific smoke tests.
- **Status:** Open; do not activate or delete blindly.

## Changed Files

- `docs/superpowers/specs/2026-07-31-agent-1-runtime-trust-boundaries-design.md`
- `docs/superpowers/plans/2026-07-31-agent-1-runtime-trust-boundaries.md`
- `extension/remote-config-debug.md`
- `src/background/api-proxy.js`
- `src/background/runtime-policy.js`
- `src/background/runtime-policy.test.js`
- `src/content/index.js`
- `src/content/ui/ConfigDebugPanel.svelte`
- `src/content/ui/mount.js`
- `src/injected/index.js`
- `tests/runtime-trust-boundaries.test.js`
- `tests/setup.js`

## Compatibility Impact

### Chrome / Chromium

- supported content scripts and extension pages remain allowed when the runtime sender ID matches
- unsupported host senders now fail closed for the DeepSeek API proxy
- MAIN-world config injection remains one-way from content to injected code

### Firefox

- `moz-extension:` pages are accepted by the sender policy
- supported HTTPS content hosts are accepted
- stringified `CustomEvent.detail` handling remains intact for Xray boundaries

### Android

- Android content startup and the `chrome.*` polyfill are unchanged
- the Manifest V3 background API proxy is not part of the Android content bundle
- no Android build was executed

### Svelte UI

- the primary Svelte 5 application mount is unchanged
- only the mutable host-page debug panel was removed from startup

## Tests Added or Updated

### `src/background/runtime-policy.test.js`

Covers:

- same-extension Chrome page
- same-extension Firefox page
- Claude, ChatGPT, OpenAI, legacy ChatGPT, and DeepSeek content hosts
- mismatched extension ID
- unsupported host
- missing and malformed sender metadata

### `tests/runtime-trust-boundaries.test.js`

Locks:

- absence of `window.__BDS_CONFIG__`
- absence of `bds:debug-api-request`
- absence of page-world config mutation switch cases
- absence of host-page debug panel mount
- presence of API-proxy sender validation
- injected/content `bds:network-state` event contract

### `tests/setup.js`

Restores the path declared by `vitest.config.js` without installing hidden global mocks.

## Verification Evidence

### Executed

1. GitHub branch comparison:
   - branch ahead of integration base
   - branch not behind integration base at report time
   - changed-file list matched the planned scope
2. Local isolated sender-policy smoke check using the committed policy logic:
   - 7 trusted cases accepted
   - 8 untrusted cases rejected
3. `node --check`:
   - sender-policy replacement text: passed
   - API-proxy replacement text: passed
4. Source review through the GitHub connector confirmed:
   - no page-global debug API in the updated injected entry
   - no debug request handler in the updated content entry
   - no debug panel mount in the updated UI mount
   - sender validation is called before API-proxy work

### Not Executed

- `npm ci`
- complete Vitest suite
- red/green Vitest cycle
- Chrome build
- Firefox build
- Playwright
- Selenium
- Android Gradle build
- packaged extension startup
- real Chrome/Firefox sender metadata integration
- CodeRabbit review

The execution sandbox could not resolve GitHub or CodeRabbit hosts. Agent 3's safe GitHub Actions workflow is required for full verification.

## CodeRabbit Review

Attempted prerequisites:

```text
coderabbit --version
→ command not found

curl -fsSL https://cli.coderabbit.ai/install.sh | sh
→ Could not resolve host: cli.coderabbit.ai
```

No CodeRabbit issues were produced. This is a blocker, not a zero-issue review.

## Remaining Work

1. Agent 3 runs dependency installation, focused tests, full unit tests, Chrome build, and Firefox build.
2. CodeRabbit reviews the draft Agent 1 PR when available.
3. Agent 1 addresses confirmed review findings.
4. Agent 1 hardens the main background router and bounded web-fetch surface.
5. Agent 1 redesigns the sandbox message boundary.
6. Agent 1 traces provider adapters, completion detection, continuation, cancellation, and handoff in the production runtime.
7. Agent 1 reconciles the disconnected module-manager architecture without wholesale activation.

## Recommended Next Pass

**Agent 1 Pass 2: background router and privileged fetch hardening**

The next pass should extract message classification from `src/background/index.js`, apply the shared sender policy consistently, and replace `bds-fetch-url` with a bounded request contract while preserving web/search/pricing functionality.
