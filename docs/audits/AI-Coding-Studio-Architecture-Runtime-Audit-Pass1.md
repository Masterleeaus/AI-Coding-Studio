# AI Coding Studio v2.1.0 — Architecture and Runtime Audit, Pass 1

**Repository:** `Masterleeaus/AI-Coding-Studio`  
**Branch:** `audit/extension-runtime-pass1`  
**Audit date:** 2026-07-31  
**Scope:** architecture, runtime entry points, Manifest V3 boundaries, module lifecycle, background messaging, sandbox execution, remote configuration, file ingestion, test infrastructure, and repository workflows.

## Executive Summary

The imported source is a substantial multi-platform browser-extension codebase, but the production runtime and the documented modular architecture have materially diverged. The shipped content entry point directly starts the legacy runtime, while both modular bootstrap files are unreachable from the build graph. Eleven advertised module factories are lifecycle-only no-ops, and several “runtime” modules simulate success rather than executing real tools.

The most urgent risks are security and repository integrity rather than cosmetic code quality:

1. A manually triggerable one-shot import workflow can overwrite future repository work with a frozen ZIP.
2. The background service worker exposes a privileged arbitrary-URL fetch path while the manifest grants `<all_urls>`.
3. Model/user/imported Markdown is inserted with Svelte `{@html}` without an HTML sanitizer.
4. A page-dispatchable debug event can apply or replace persisted remote configuration.
5. Sandbox and preview message channels use wildcard targets without source authentication, timeouts, or reliable cleanup.
6. GitHub ZIP/folder ingestion has no aggregate extraction budget and can include `.env`-style secrets in model context.

The extension must **not** be described as production-ready at this point. The JavaScript and JSON sources are syntactically valid, but dependency installation and the advertised build/test suites could not be completed in this environment, and one unit test has a confirmed missing import.

## Audit Method

The audit traced:

```text
manifest
→ build entry points
→ content initialization
→ modular bootstrap paths
→ background messages
→ injected/page boundary
→ sandbox boundary
→ storage and remote configuration
→ repository/file ingestion
→ test and CI definitions
```

Static checks covered 295 files, including 221 JavaScript, TypeScript, and Svelte files.

## Verification Performed

| Check | Result |
|---|---|
| Parse all 11 JSON files | Passed |
| `node --check` across `src/**/*.js` and `scripts/**/*.js` | Passed |
| Relative-import existence scan | Failed: one missing test helper import |
| `npm ci --ignore-scripts` | Blocked: package mirror returned 404 for `zimmerframe@1.1.4` |
| Chrome build | Not run; dependencies unavailable |
| Firefox build | Not run; dependencies unavailable |
| Unit tests | Not run; dependencies unavailable and one known missing test helper |
| Playwright tests | Not run; advertised test directories are absent |
| Android build/tests | Not run; dependencies unavailable |

## Static Risk Inventory

| Pattern | Occurrences | Files |
|---|---:|---:|
| `console.log` | 61 | 16 |
| `console.warn` | 48 | 23 |
| `console.error` | 68 | 37 |
| `innerHTML` | 42 | 13 |
| Svelte `{@html}` | 16 | 11 |
| `MutationObserver` | 12 | 9 |
| `setInterval` | 8 | 8 |
| `setTimeout` | 81 | 37 |
| `new Function` | 4 | 3 |
| `AsyncFunction` references | 4 | 1 |
| wildcard `postMessage(..., "*")` | 8 | 3 |

These counts identify review surfaces; they are not all defects by themselves.

---

# Findings

## ACS-P1-001 — Destructive one-shot import workflow remains runnable

**Classification:** Confirmed defect / data-loss risk  
**Severity:** Critical  
**Affected file:** `.github/workflows/import-source.yml`  
**Affected area:** `workflow_dispatch`, extraction step

**Evidence**

The workflow downloads a fixed historical archive and uses:

```bash
rsync -a --delete ... ./
```

It remains manually runnable through `workflow_dispatch` and has `contents: write`.

**User impact**

A manual rerun can delete or revert legitimate source changes that are not present in the original ZIP.

**Probable cause**

A temporary bootstrap workflow was retained after the initial repository import.

**Required fix**

Delete the workflow after the initial import. Preserve archive provenance in `docs/import/IMPORT-MANIFEST.md` instead.

**Regression risk**

Low. The repository is already populated and Git history retains the import commit.

**Test required**

Confirm the branch no longer contains `.github/workflows/import-source.yml`, and verify no workflow retains a destructive source replacement step.

**Pass 1 action**

Fixed on `audit/extension-runtime-pass1` in commit `5bec7ec847c22a0f8879844a94da4260adf1e0a7`.

---

## ACS-P1-002 — Privileged arbitrary cross-origin request proxy

**Classification:** Confirmed security defect  
**Severity:** Critical  
**Affected files:**

- `static/manifest.json:7-17`
- `src/background/index.js:16-127`
- `src/background/index.js:408-453`
- `src/background/index.js:525-537`

**Affected functions:** background message listener, `fetchPageContent()`, `mcpFetch()`

**Evidence**

The manifest grants `<all_urls>`. A content message with type `bds-fetch-url` supplies an arbitrary URL and options. `fetchPageContent()` accepts caller-provided method, headers, body, credentials, cache, and redirect before calling `fetch()`. MCP calls similarly accept an arbitrary server URL and forward an API key in two authorization headers. The listener validates only that a message has a `type`; it does not validate the sender, URL scheme, host, private-address range, request size, response size, timeout, or content type.

**User impact**

A compromised supported host page, injected script, or extension component could use the extension as a privileged cross-origin request proxy, including attempts against internal/private services. Secrets may be forwarded to an attacker-controlled MCP endpoint.

**Probable cause**

Generic ingestion and MCP support were implemented before a centralized message schema and network policy existed.

**Required fix**

Introduce:

- strict per-message schemas;
- sender ID and supported-tab checks;
- HTTPS-only URL parsing;
- denial of loopback, link-local, private, `.local`, and non-network schemes;
- method/header allowlists;
- explicit MCP server approval and persisted trusted origins;
- request timeout and response byte limits.

Remove `<all_urls>` if functional tracing proves it unnecessary; otherwise document and enforce the runtime allowlist.

**Regression risk**

Medium. Webpage ingestion and user-configured MCP endpoints may require an approval migration and clear errors.

**Test required**

Unit tests for URL classification and message schemas; integration tests proving blocked localhost/private-network access, blocked unapproved MCP origins, allowed supported HTTPS ingestion, and size/timeout enforcement.

---

## ACS-P1-003 — Unsanitized HTML rendered from untrusted Markdown

**Classification:** Confirmed security defect  
**Severity:** Critical  
**Affected files:** 11 Svelte components using 16 `{@html}` directives, including:

- `src/content/ui/components/MessageOverlay.svelte`
- `src/content/ui/components/DeepResearchReportCard.svelte`
- `src/content/ui/components/TodoCard.svelte`
- `src/content/ui/components/ApiResponseViewer.svelte`

**Affected functions/components:** Markdown rendering and response display

**Evidence**

Markdown is converted with `marked` and inserted with Svelte `{@html}`. No DOMPurify or equivalent HTML sanitizer is present. The existing visible-text sanitizer removes control tags, not HTML elements or attributes.

**User impact**

Raw HTML from AI responses, imported repositories, webpages, or documents can be inserted into extension UI. This creates a DOM-injection surface and may permit script-adjacent behavior through unsafe elements, URLs, or event attributes.

**Probable cause**

Markdown parsing was treated as presentation formatting rather than an untrusted-content boundary.

**Required fix**

Create one sanitizer-backed Markdown renderer and replace direct `marked(...)` + `{@html}` call sites. Use a restrictive allowlist, block event attributes and dangerous protocols, and render code/text safely.

**Regression risk**

Medium. Some existing rich Markdown or embedded HTML will be intentionally stripped.

**Test required**

Payload tests covering `<script>`, event attributes, `javascript:` URLs, SVG/MathML edge cases, iframes, malformed HTML, ordinary Markdown, tables, code blocks, and links.

---

## ACS-P1-004 — Host-page events can mutate persisted remote configuration

**Classification:** Confirmed security defect  
**Severity:** Critical  
**Affected files:**

- `src/content/index.js:154-200`
- `src/lib/remote-config.svelte.js`
- `src/injected/index.js`

**Affected area:** `bds:debug-api-request` handler

**Evidence**

The content script listens on `window` for `bds:debug-api-request`. Methods include `applyRemote`, `replaceRemote`, and `resetToBuiltin`. The handler has no development-build gate, shared secret, nonce, source verification, or user confirmation. Supported host-page JavaScript can dispatch custom window events.

**User impact**

A script executing in a supported AI site can attempt to replace extension configuration and persist altered behavior.

**Probable cause**

A development diagnostics bridge was shipped as an unrestricted production API.

**Required fix**

Compile the mutating debug API out of production builds. Keep read-only diagnostics behind an explicit developer setting and an authenticated bridge nonce generated in the isolated world. Never expose remote-config mutation to page context.

**Regression risk**

Low for end users; medium for developer tooling that currently relies on `window.__BDS_CONFIG__`.

**Test required**

Production-build test proving page-dispatched mutation requests are ignored; development-mode test proving authorized diagnostics still work.

---

## ACS-P1-005 — Sandbox and preview message channels are unauthenticated and can hang

**Classification:** Confirmed security and reliability defect  
**Severity:** Critical  
**Affected files:**

- `src/sandbox/index.js:27-95`
- `static/sandbox.html`
- office export cards under `src/content/ui/components/`
- `src/lib/utils/html-utils.js`

**Affected functions:** sandbox message listener, office-code execution, iframe result handlers

**Evidence**

The sandbox accepts `window` message events without checking `event.source`, an operation schema, payload size, or a per-frame nonce. It replies with `window.parent.postMessage(..., "*")`. Calling cards generally validate only a short random request ID, also use wildcard target origins, and do not enforce a timeout or cancellation path. `AsyncFunction` executes supplied code. Global/prototype overrides are restored only on successful completion, so a thrown error may corrupt future executions.

**User impact**

Messages can be spoofed or confused between frames, execution can remain stuck indefinitely, event listeners can leak, and failed office export code can poison later runs.

**Probable cause**

The sandbox was treated as isolated by CSP alone, without a complete application-level protocol.

**Required fix**

Define a typed sandbox protocol containing protocol version, operation, cryptographically strong nonce, request ID, payload byte ceiling, and response status. Require `event.source === parent` in the sandbox and `event.source === iframe.contentWindow` in callers. Use exact extension origins where possible. Add timeouts, cancellation, output ceilings, and `try/finally` restoration of every global override.

**Regression risk**

Medium. All sandbox callers must migrate together.

**Test required**

Spoofed-source tests, invalid-schema tests, timeout tests, thrown-code cleanup tests, oversized-payload tests, and successful DOCX/XLSX/PPTX export smoke tests.

---

## ACS-P1-006 — Repository and folder ingestion lacks aggregate safety budgets and can include secrets

**Classification:** Confirmed security, privacy, and performance defect  
**Severity:** High  
**Affected files:**

- `src/background/index.js` (`fetchGithubZip`)
- `src/content/files/github-reader.js`
- `src/content/files/folder-reader.js`

**Evidence**

GitHub ZIPs are loaded into memory, converted to base64, sent over extension messaging, and decompressed synchronously with `unzipSync`. Per-file limits exist, but there is no aggregate compressed-size, uncompressed-size, entry-count, compression-ratio, or total-context budget. The accepted text names include `env` and `env.local`; `.env`-style files are not comprehensively excluded.

**User impact**

Large or malicious archives can exhaust memory or freeze the page. Repository credentials and local secrets can be copied into model context.

**Probable cause**

Per-file checks were added without a complete archive threat model or secret-file policy.

**Required fix**

Enforce compressed and uncompressed byte ceilings, entry-count and compression-ratio ceilings, path normalization, aggregate text budget, cancellation, and secret-file exclusion by default. Show excluded files and allow deliberate opt-in only after warning.

**Regression risk**

Medium. Very large repositories will be partially ingested instead of fully loaded.

**Test required**

Archive bomb simulation, path traversal, duplicate normalized paths, excessive entry count, large aggregate text, binary files, invalid encodings, `.env`, private keys, and normal repository fixtures.

---

## ACS-P1-007 — Documented modular runtime is disconnected from the production entry point

**Classification:** Confirmed architectural defect / incomplete integration  
**Severity:** High  
**Affected files:**

- `src/core/bootstrap.js`
- `src/core/bootstrap-enhanced.js`
- `src/content/index.js:17-87`
- `build.js`

**Evidence**

Neither `bootstrap.js` nor `bootstrap-enhanced.js` is imported by any production source. `src/content/index.js` directly initializes storage, the page bridge, UI, scanners, research runtime, sidebars, status monitor, and theme watcher. The modular bootstraps therefore do not control shipped initialization or cleanup.

**User impact**

Module options, dependency ordering, lifecycle cleanup, and claimed runtime capabilities are not authoritative. Engineers can fix a module while the active legacy path remains unchanged.

**Probable cause**

A modular rewrite was added beside the legacy runtime but never completed or selected as the production entry point.

**Required fix**

Do not immediately switch production to the modular bootstrap because many modules are incomplete. First document the active runtime, test it, and create a staged migration seam. Each module must replace one verified legacy subsystem with parity tests before being enabled.

**Regression risk**

High if switched wholesale; manageable when migrated subsystem-by-subsystem.

**Test required**

Build-graph assertion for the chosen entry path, module-init integration test, duplicate-initialization test, optional-module failure isolation, and supported-host UI smoke tests.

---

## ACS-P1-008 — Eleven advertised modules are no-op shells; execution modules simulate success

**Classification:** Confirmed incomplete implementation / documentation drift  
**Severity:** High  
**Affected files:**

No-op lifecycle factories:

- `src/modules/config/LocalizationModule.js`
- `src/modules/config/RemoteConfigModule.js`
- `src/modules/features/AutoCodeModule.js`
- `src/modules/features/CommandsModule.js`
- `src/modules/features/DeepResearchModule.js`
- `src/modules/features/FileReaderModule.js`
- `src/modules/features/MemoryModule.js`
- `src/modules/features/ToolsModule.js`
- `src/modules/ui/MessageOverlayModule.js`
- `src/modules/ui/SettingsPanelModule.js`
- `src/modules/ui/UiModule.js`

Simulated implementations:

- `src/modules/features/ToolRuntimeModule.js`
- `src/modules/features/TerminalRuntimeModule.js`
- `src/modules/features/McpIntegrationModule.js`

**Evidence**

The no-op files expose empty `init`, `enable`, `disable`, and `destroy` methods. Tool and terminal runtimes return simulated results; approval functions automatically approve. MCP connection status can be set without a real transport.

**User impact**

The module registry and product description overstate integrated capabilities. If the enhanced bootstrap is enabled, users may receive false-success states rather than real operations.

**Probable cause**

Integration scaffolds were committed as if they were completed modules.

**Required fix**

Mark scaffolds as experimental and disabled until each wraps or replaces a real implementation. Never report connected, approved, or successful without a real operation and user decision.

**Regression risk**

Low while unreachable; high if the enhanced bootstrap is activated prematurely.

**Test required**

Contract tests per module, plus negative tests proving no fake success/connection/approval is returned.

---

## ACS-P1-009 — ModuleManager does not safely enforce registration and dependency invariants

**Classification:** Confirmed defect  
**Severity:** High  
**Affected file:** `src/core/ModuleManager.js`  
**Affected functions:** `register()`, `init()`, `_resolveDependencies()`, `getStatus()`

**Evidence**

- `register()` checks `this.modules.has(name)` instead of `this.moduleConfigs.has(name)`, allowing duplicate pre-init registration to overwrite configuration.
- Dependency resolution marks a module visited before traversing dependencies and has no `visiting` set, so cycles are not explicitly detected.
- `init()` sets `initialized = true` after continuing past module failures.
- Status does not preserve initialization error details.

**User impact**

Configuration can be silently replaced, cyclic graphs can fail unpredictably, and diagnostics can report a completed manager while required modules failed.

**Probable cause**

The manager implements a minimal topological walk without explicit failure-state modeling.

**Required fix**

Reject duplicate configurations, detect cycles with a recursion stack, track module states (`registered`, `initializing`, `ready`, `failed`, `disabled`, `destroyed`), prevent dependents from initializing after dependency failure, and return a structured initialization result.

**Regression risk**

Medium. Existing duplicate registrations or hidden cycles will become visible failures.

**Test required**

Duplicate registration, missing dependency, direct and indirect cycles, optional module failure, required dependency failure, retry after destroy, and status/error reporting.

---

## ACS-P1-010 — Auto Continue module cannot reliably detect completion or restore sessions

**Classification:** Confirmed defect / incomplete implementation  
**Severity:** High  
**Affected file:** `src/modules/features/AutoContinueModule.js`

**Evidence**

Completion-signal methods `_checkTokenLimit`, `_checkResponseQuality`, and `_checkStopToken` return `false`. Session writes use dotted keys such as `autoContinueSessions.<id>`, while restore logic reads the aggregate key `autoContinueSessions`; Chrome storage keys are flat. Provider adapter objects are placed into persisted state even though adapters may contain functions and other non-serializable values. Bootstrap safety options are not consistently applied.

**User impact**

Auto Continue may never recognize the intended completion signals, may not recover after an MV3 service-worker restart, and may lose or corrupt continuation state.

**Probable cause**

The module is partially scaffolded and was not tested against real Chrome storage semantics.

**Required fix**

Define a serializable session schema, store one versioned session map or one explicit key per session with matching read logic, persist provider IDs rather than adapter objects, implement real provider signals, and enforce continuation/time/rate limits.

**Regression risk**

High for existing stored sessions; add a migration that safely ignores malformed legacy data.

**Test required**

Completion-signal matrix, restart/restore, duplicate-submission prevention, cancellation, malformed storage, limit enforcement, provider rehydration, and service-worker suspension simulation.

---

## ACS-P1-011 — Remote configuration is unsigned, weakly validated, and mergeable through unsafe keys

**Classification:** Security risk / architectural risk  
**Severity:** High  
**Affected files:**

- `src/lib/remote-persistence.js`
- `src/lib/remote-config.svelte.js`
- `src/background/index.js`

**Evidence**

Startup fetches JSON from an external upstream repository and persists it. Validation checks the root shape but not a strict schema or key allowlist. Recursive merge assigns arbitrary object keys and does not reject `__proto__`, `prototype`, or `constructor`.

**User impact**

A compromised remote source or unsafe local mutation can change extension behavior. Unsafe merge keys create a prototype-pollution surface.

**Probable cause**

Remote configuration was designed for convenience and backward compatibility rather than trust minimization.

**Required fix**

Use a versioned strict schema, reject unknown and prototype-related keys, cap payload size/depth, retain last-known-good configuration, separate data-only configuration from behavior-enabling flags, and document source ownership. High-risk flags require local user approval and must never activate from remote data alone.

**Regression risk**

Medium. Unknown legacy keys will be rejected and require migration.

**Test required**

Prototype keys, unknown keys, excessive depth/size, invalid types, stale versions, unavailable network, corrupted cache, last-known-good fallback, and high-risk flag rejection.

---

## ACS-P1-012 — Version identity is inconsistent across release surfaces

**Classification:** Confirmed documentation/build defect  
**Severity:** Medium  
**Affected files:**

- `static/manifest.json` — `2.1.0`
- `manifest-multiplatform.json` — `1.0.0`
- `package.json` / `package-lock.json` — `0.1.11`
- `src/background/index.js` MCP client metadata — `0.1.11`

**User impact**

Build artifacts, diagnostics, update behavior, MCP client identity, release notes, and bug reports can refer to different versions.

**Probable cause**

The project was rebranded and repackaged without a single version source.

**Required fix**

Define one package version and have the build generate/validate manifest and client metadata. Add a CI assertion that all release surfaces match.

**Regression risk**

Low.

**Test required**

Version-consistency script across package, lockfile, manifests, build output, Android metadata, and runtime client info.

---

## ACS-P1-013 — Advertised test topology is incomplete and one unit test cannot resolve

**Classification:** Confirmed test gap / documentation drift  
**Severity:** High  
**Affected files:**

- `package.json`
- `TESTING.md`
- `playwright.config.js`
- `src/content/parser/character-parser.test.js:5`

**Evidence**

The repository has 25 co-located unit test files but no advertised `tests/integration`, `tests/e2e`, `tests/e2e-firefox`, or `tests/e2e-android` trees. `character-parser.test.js` imports `../../../tests/helpers/app-state.js`, which does not exist. `TESTING.md` contains stale absolute Windows paths and describes CI jobs not present in the repository.

**User impact**

Clean-checkout testing cannot validate the claims in documentation, and at least one unit suite cannot load.

**Probable cause**

Tests and CI documentation were copied from a different checkout or not included in the source archive.

**Required fix**

Restore or remove stale references, create the missing shared test helper in a stable test-support location, add minimal real Chrome/Firefox Playwright smoke tests, and establish CI only after commands pass locally.

**Regression risk**

Low; failing assumptions will become visible.

**Test required**

Run all package scripts from a clean checkout on supported Node/Java versions and ensure every referenced test path exists.

---

## ACS-P1-014 — Listener cleanup and cross-context bridge validation are inconsistent

**Classification:** Confirmed reliability/security defect  
**Severity:** High  
**Affected files:**

- `src/modules/core/StorageModule.js`
- `src/modules/core/BridgeModule.js`
- content and injected bridge code

**Evidence**

StorageModule registers an anonymous `chrome.storage.onChanged` listener that cannot be removed by `destroy()`. BridgeModule accepts broad window messages and sends with wildcard targets without a complete source/schema/channel-token policy.

**User impact**

Repeated initialization can duplicate callbacks and leak memory. Untrusted or malformed page messages may enter extension logic.

**Probable cause**

Lifecycle interfaces were added after listeners had already been implemented.

**Required fix**

Store exact listener references, remove them on destroy, make registration idempotent, validate source/schema/version/nonce for every bridge message, and expose bridge diagnostics.

**Regression risk**

Medium. Some loosely structured existing messages will need migration.

**Test required**

Init/destroy/init listener-count test, malformed messages, spoofed messages, stale nonce, valid round-trip, and navigation cleanup.

---

## ACS-P1-015 — Timer, observer, and production logging ownership is fragmented

**Classification:** Performance risk / maintainability risk  
**Severity:** Medium  
**Affected surface:** 81 `setTimeout`, 8 `setInterval`, 12 `MutationObserver`, and 177 console calls across runtime source.

**Evidence**

Timers and observers are created across many content/UI modules without one lifecycle registry. Logging is partly gated but many direct console calls remain.

**User impact**

Long AI sessions and SPA navigation can accumulate work, wake background contexts, duplicate scans, or produce noisy logs.

**Probable cause**

Features were integrated independently without shared lifecycle utilities.

**Required fix**

After critical security work, add scoped disposables for timers/observers/listeners, replace permanent polling with events where practical, and route logs through a level-aware logger with production redaction.

**Regression risk**

Medium. Timing-sensitive platform adapters require smoke tests.

**Test required**

Repeated navigation/mount/unmount tests, observer-count diagnostics, timer cleanup, no duplicate scans, and production logging assertions.

---

## ACS-P1-016 — Documentation and remote ownership still point to the previous project

**Classification:** Documentation drift / trust risk  
**Severity:** Medium  
**Affected files:** `README.md`, constants, remote-data URLs, release links, badges, clone instructions

**Evidence**

Several links and runtime remote resources still reference `EdgeTypE/better-deepseek` while the authoritative repository is `Masterleeaus/AI-Coding-Studio`.

**User impact**

Contributors may clone or report against the wrong project. Runtime trust remains dependent on an upstream repository outside the current product’s control.

**Probable cause**

The source was imported and rebranded without a complete ownership migration.

**Required fix**

Inventory every external project URL. Classify it as required upstream dependency, credited source, or stale reference. Move owned configuration to the authoritative repository and preserve attribution separately.

**Regression risk**

Medium for remote data URLs; low for documentation links.

**Test required**

Link scan, remote-data fallback test, and startup test with upstream unavailable.

---

# Architecture Decision for Remediation

Do **not** connect `bootstrap-enhanced.js` to production yet.

The safest sequence is:

1. Harden current production boundaries and restore tests.
2. Make ModuleManager itself correct and observable.
3. Mark incomplete factories as experimental/disabled.
4. Map each legacy subsystem to a target module.
5. Migrate one subsystem at a time with parity and cleanup tests.
6. Remove the legacy path only after every production responsibility has an active tested module.

A wholesale bootstrap switch now would replace real legacy behavior with no-op or simulated modules.

# Files Inspected

The pass directly inspected or traced:

- `package.json`
- `package-lock.json`
- `build.js`
- `static/manifest.json`
- `manifest-multiplatform.json`
- `src/core/**`
- `src/background/**`
- `src/content/index.js`
- `src/content/bridge.js`
- `src/content/state.js`
- `src/content/storage.js`
- `src/content/files/**`
- `src/content/tools/**`
- `src/content/ui/**`
- `src/injected/**`
- `src/sandbox/**`
- `src/modules/**`
- `src/platform/**`
- all detected test files
- Playwright/Vitest configuration
- `TESTING.md`
- `.github/workflows/import-source.yml`

# Pass 1 Changes

- Removed the destructive one-shot import workflow from the audit branch.
- Added this evidence-based audit.
- Added `docs/plans/AI-Coding-Studio-Remediation-Plan-Pass1.md`.

No broad runtime code was changed in this pass because the required first action is to establish trustworthy test and security boundaries before altering the active initialization path.

# Remaining Risks

Critical findings ACS-P1-002 through ACS-P1-005 remain unresolved. High-severity archive, modularity, remote-config, lifecycle, and test defects also remain.

# Recommended Next Pass

**Pass 2: Security Boundary Hardening**

Implement, in order:

1. privileged background message validation and URL policy;
2. safe Markdown/HTML rendering;
3. production removal of remote-config mutation debug APIs;
4. authenticated sandbox protocol with timeout and cleanup;
5. regression tests for each boundary.

# Suggested Pull Request

**Title**

```text
audit: document runtime architecture and remove destructive import workflow
```

**Description**

```text
Performs the first architecture/runtime audit of AI Coding Studio v2.1.0.

- documents production-vs-modular runtime drift
- identifies critical background, HTML-rendering, remote-config, sandbox and archive risks
- records test and version drift
- removes the manually triggerable one-shot import workflow that could overwrite future repository changes
- adds a prioritized remediation plan

No production readiness claim is made. Build and test execution remain blocked until the dependency/test baseline is restored.
```
