# Agent 1 — Extension Runtime and AI Platform Report

## Current Status

Agent 1 has completed two source-level repair passes on:

```text
agent-1/extension-runtime-platforms
    →
integration/local-first-repair
```

Draft pull request: **#5 — `fix(runtime): harden extension trust boundaries`**

The branch is currently mergeable and remains draft. It is not integration-ready because Agent 1's exact head has no GitHub Actions run and CodeRabbit has not produced a review.

## End-of-Pass Summary

| Field | Status |
|---|---|
| Repository | `Masterleeaus/AI-Coding-Studio` |
| Agent role | `1` — Extension Runtime and AI Platform Agent |
| Branch | `agent-1/extension-runtime-platforms` |
| Base branch | `integration/local-first-repair` |
| Draft PR | `#5` |
| PR state | Open, draft, mergeable |
| Completed passes | 2 |
| Confirmed/classified findings | 13 |
| Production files changed | background, content, injected and diagnostic UI/runtime files listed below |
| Tests added or updated | sender policy, page fetch policy, runtime boundaries, background router boundaries and shared setup |
| GitHub Actions runs on Agent 1 head | None |
| Narrow executed checks | sender-policy smoke; page-fetch smoke; JavaScript syntax checks |
| Full Vitest/build/browser checks | Not executed on Agent 1 head |
| CodeRabbit | Requested/attempted; no review result |
| Known integration baseline failure | Agent 3 reports dependency audit red with 9 vulnerabilities, tracked in issue #7 |

## Runtime Map

### Build Entry Points

`build.js` builds four independent runtime bundles:

```text
src/content/index.js
    → content script startup

src/background/index.js
    → Manifest V3 background service worker
    → imports src/background/api-proxy.js

src/injected/index.js
    → MAIN-world network interception

src/sandbox/index.js
    → document-generation sandbox runtime
```

Chrome and Firefox use the extension platform globals entry. Android replaces the platform alias with `src/platform/globals-android.js` and starts the content runtime through the native WebView bridge.

### Production Content Startup

The production content runtime currently performs:

1. document readiness
2. persistent state load
3. locale initialisation
4. language-refresh request
5. MAIN-world injection
6. content/injected bridge registration
7. primary Svelte UI mount
8. deep-research initialisation
9. storage, URL, DOM, sidebar, search, status and theme observers
10. runtime configuration push to injected code
11. MCP schema discovery and configuration refresh
12. pricing update

### Competing Bootstrap Tree

The production build does **not** import:

- `src/core/bootstrap.js`
- `src/core/bootstrap-enhanced.js`

Those files define a second module-manager architecture. Several modules remain incomplete or simulated. Agent 1 did not activate or delete that tree because dynamic registration and capability migration require a separate traced cutover.

## Pass 1 — Runtime Trust Boundaries

### Implemented

- removed page-global `window.__BDS_CONFIG__`
- removed `bds:debug-api-request` / `bds:debug-api-response`
- removed page-triggered remote-config apply, replace and reset operations
- removed page-triggered storage probes
- removed `ConfigDebugPanel` from the production host-page UI mount
- neutralised the component into an inert tombstone after direct deletion was blocked by the connector
- added `isTrustedRuntimeSender()`
- validated DeepSeek API-proxy senders
- restored the missing `bds:network-state` event key in the injected runtime
- restored and later aligned `tests/setup.js` with Agent 3's shared test harness

## Pass 2 — Background Router and Page Fetch Hardening

### Implemented

- classified every message type owned by the main background listener
- applied sender validation before YouTube, GitHub, generic fetch, locale, startup and MCP handlers
- left API-proxy messages to the separate API listener
- extracted `bds-fetch-url` into `src/background/page-fetch.js`
- forced GET-only requests
- rejected request bodies and URL credentials
- filtered request headers to `Accept`, `Accept-Language`, `Cache-Control` and `Pragma`
- stripped authorization, cookie and unknown headers
- forced credentials to `omit`
- restricted cache mode to `default` or caller-requested `no-store`
- forced browser-standard redirect following
- validated the final response URL before status processing or body consumption
- rejected obvious local, private, link-local, multicast, reserved and metadata targets
- added a 15-second timeout
- added a 5 MiB response cap enforced by `Content-Length` and actual streamed bytes
- preserved header/meta charset detection and UTF-8 fallback

### Redirect Correction

The initial Pass 2 design proposed manual redirect following. Standards verification showed that `redirect: "manual"` produces an opaque redirect response with status `0`, empty headers and no body, so portable Chrome/Firefox code cannot inspect and manually follow `Location` that way.

The implementation was corrected before review:

- browser redirects remain functional with fixed `redirect: "follow"`
- callers cannot choose redirect policy
- initial destinations are validated before fetch
- final `response.url` is validated before reading the body

This does not prevent the browser from connecting to a redirected destination before final-URL validation and does not solve DNS rebinding. The code and documentation do not claim otherwise.

## Finding Register

### A1-001 — Page-World Remote-Config Mutation Bridge

- **Classification:** Security risk
- **Affected files:** `src/injected/index.js`, `src/content/index.js`
- **Evidence:** MAIN-world global and CustomEvent request bridge reached isolated-world configuration and storage operations.
- **Impact:** host-page scripts shared the request surface.
- **Repair:** removed the global and request/response bridge.
- **Regression test:** `tests/runtime-trust-boundaries.test.js`.
- **Status:** Repaired in source; browser verification pending.

### A1-002 — Mutable Debug Panel in Host DOM

- **Classification:** Security risk
- **Affected files:** `src/content/ui/mount.js`, `src/content/ui/ConfigDebugPanel.svelte`
- **Evidence:** privileged-looking mutable UI was always present in third-party page DOM.
- **Impact:** hidden host DOM is not access control.
- **Repair:** removed mount; component neutralised.
- **Regression test:** source assertion that no debug panel is imported or mounted.
- **Status:** Repaired in source; tombstone deletion remains cleanup.

### A1-003 — API Proxy Accepted Unvalidated Senders

- **Classification:** Security risk
- **Affected file:** `src/background/api-proxy.js`
- **Evidence:** listener performed DeepSeek API requests without sender checks.
- **Repair:** fail-closed runtime sender policy.
- **Required integration test:** real Chrome/Firefox sender metadata.
- **Status:** Repaired in source.

### A1-004 — Injected Network-State Event Drift

- **Classification:** Confirmed defect
- **Affected file:** `src/injected/index.js`
- **Evidence:** emitted `EVENTS.networkState` while the key was undefined.
- **Impact:** network activity and completion status events could be lost.
- **Repair:** restored `networkState: "bds:network-state"`.
- **Status:** Repaired in source.

### A1-005 — Missing Vitest Setup Entry

- **Classification:** Test gap
- **Affected file:** `tests/setup.js`
- **Evidence:** `vitest.config.js` referenced a missing file.
- **Repair:** restored and aligned byte-for-byte with Agent 3's shared Chrome/storage test harness.
- **Status:** Repaired; Agent 1 head not yet run by Vitest.

### A1-006 — Main Background Router Accepted Unvalidated Senders

- **Classification:** Security risk
- **Affected file:** `src/background/index.js`
- **Evidence:** every privileged handler was reachable before sender validation.
- **Repair:** exact message ownership set plus shared sender guard before handler dispatch.
- **Regression test:** `tests/background-router-security.test.js`.
- **Status:** Repaired in source.

### A1-007 — Generic Fetch Forwarded Arbitrary Request Capabilities

- **Classification:** Security risk
- **Affected file:** former inline fetch in `src/background/index.js`
- **Evidence:** caller controlled method, headers, body, credentials, cache and redirect.
- **Impact:** broad host permission amplified a generic CORS-bypass primitive.
- **Repair:** bounded structured page reader.
- **Status:** Repaired in source.

### A1-008 — Generic Fetch Had No Time or Output Bounds

- **Classification:** Performance risk / security risk
- **Affected subsystem:** background page retrieval
- **Evidence:** entire response was loaded with `arrayBuffer()` without timeout or size limit.
- **Impact:** service-worker stalls and memory pressure.
- **Repair:** abort timeout, Content-Length pre-check and streamed byte cap.
- **Status:** Repaired in source.

### A1-009 — Local/Private Page Targets Were Not Rejected

- **Classification:** Security risk
- **Affected subsystem:** generic privileged page fetch
- **Evidence:** any HTTP(S) URL allowed by broad host permissions was accepted.
- **Repair:** hostname/IP literal checks for loopback, private, link-local, reserved, multicast and metadata targets; URL credentials rejected.
- **Remaining limitation:** DNS names that resolve privately and redirect connections cannot be pre-resolved in this browser implementation.
- **Status:** Partially mitigated and honestly bounded.

### A1-010 — Manual Redirect Design Was Browser-Incompatible

- **Classification:** Compatibility risk
- **Affected file:** `src/background/page-fetch.js`
- **Evidence:** manual redirects are exposed as opaque redirect responses.
- **Impact:** redirected public pages would fail.
- **Repair:** fixed browser follow mode plus final-URL validation.
- **Status:** Corrected before Agent 1 report closure.

### A1-011 — Sandbox Message and Generated-Code Boundary

- **Classification:** Security risk
- **Affected file:** `src/sandbox/index.js`
- **Evidence:** broad `message` acceptance, `AsyncFunction` execution and wildcard reply target without an authenticated channel protocol.
- **Proposed repair:** extension-owned host validation, authenticated `MessageChannel`, schema checks, timeout/output bounds and deterministic cleanup.
- **Status:** Open.

### A1-012 — MCP Destination and API-Key Transport Policy

- **Classification:** Security risk / incomplete implementation
- **Affected file:** `src/background/index.js`
- **Evidence:** user-supplied MCP server URL receives POST requests and optional API key; destination validation and response bounds are separate from the generic page reader.
- **Impact:** sensitive-key transport and arbitrary endpoint risks remain despite sender validation.
- **Proposed repair:** explicit allowed protocols/hosts, local-vs-remote policy, authentication boundary, timeouts, response limits and secret-safe diagnostics.
- **Status:** Open; requires product decision and Agent 2 interface coordination.

### A1-013 — Disconnected and Incomplete Module Architecture

- **Classification:** Architectural risk / incomplete implementation / documentation drift
- **Affected files:** `src/core/**`, `src/modules/**`
- **Evidence:** production entries do not initialise the module manager; some modules throw not-implemented errors or always return false.
- **Impact:** apparent capabilities differ from reachable runtime behaviour.
- **Proposed repair:** capability-by-capability migration with reachability and lifecycle tests.
- **Status:** Open; do not switch bootstrap wholesale.

## Files Changed

### Runtime and Security

- `src/background/api-proxy.js`
- `src/background/index.js`
- `src/background/page-fetch.js`
- `src/background/runtime-policy.js`
- `src/content/index.js`
- `src/content/ui/mount.js`
- `src/content/ui/ConfigDebugPanel.svelte`
- `src/injected/index.js`

### Tests

- `src/background/page-fetch.test.js`
- `src/background/runtime-policy.test.js`
- `tests/background-router-security.test.js`
- `tests/runtime-trust-boundaries.test.js`
- `tests/setup.js`

### Documentation

- `docs/superpowers/specs/2026-07-31-agent-1-runtime-trust-boundaries-design.md`
- `docs/superpowers/plans/2026-07-31-agent-1-runtime-trust-boundaries.md`
- `docs/superpowers/specs/2026-07-31-agent-1-background-fetch-hardening-design.md`
- `docs/superpowers/plans/2026-07-31-agent-1-background-fetch-hardening.md`
- `extension/remote-config-debug.md`
- this report

## Tests Added or Updated

### Sender Policy

Covers:

- Chrome and Firefox extension pages
- exact supported content-script hosts
- mismatched extension ID
- unsupported and look-alike hosts
- HTTP downgrade
- missing tab context
- missing/malformed metadata

### Page Fetch Policy

Covers:

- public HTTP/HTTPS
- safe headers
- stripped sensitive/unknown headers
- GET-only and no body
- URL credentials and unsupported protocols
- local/private/reserved IPv4 and IPv6 targets
- metadata hostnames
- response byte caps
- browser-follow redirect mode
- public final URL acceptance
- blocked final URL rejection before body read
- timeout abort

### Runtime/Router Boundaries

Source assertions lock:

- removed page-global config bridge
- removed debug UI mount
- API-proxy sender validation
- injected network-state contract
- main-router sender validation before privileged handlers
- removal of arbitrary inline fetch-option forwarding

## Verification Evidence

### Executed

1. `node --check` on exact proposed/committed JavaScript text for:
   - runtime sender policy
   - API proxy update
   - bounded page-fetch module
   - reconstructed background entry applied to GitHub
2. isolated sender-policy behavioural smoke:
   - 7 trusted cases accepted
   - 8 untrusted cases rejected
3. isolated page-fetch behavioural smoke:
   - expanded run passed 45 assertions
   - included numeric/octal/hex loopback URL normalization, IPv4/IPv6 target classification, safe headers, fixed redirect mode, final URL checks, byte cap and timeout
4. GitHub source inspection of committed branch files
5. GitHub branch comparison:
   - Agent 1 branch ahead of integration base
   - zero commits behind at last comparison
6. PR #5 mergeability recalculated as true

### Not Executed on Agent 1 Head

- `npm ci`
- Vitest suite
- Chrome build
- Firefox build
- Playwright
- Selenium
- Android Gradle/build tests
- packaged extension startup
- real Chrome/Firefox sender integration
- real redirected-page browser fetch
- CodeRabbit review

### Agent 3 Evidence Not Attributable to Agent 1

Agent 3 reported successful Chrome, Firefox, unit, service-worker, Firefox-install and Android runs on **PR #4's head**, plus a failing dependency audit. Those results demonstrate its CI design but do not prove PR #5 passes. PR #5 currently has no workflow runs.

## CodeRabbit

Attempts/results:

- local `coderabbit` command unavailable
- CLI installation failed because `cli.coderabbit.ai` could not be resolved
- GitHub CodeRabbit review is requested separately on PR #5
- no review, thread or finding has been received

No CodeRabbit findings are recorded as zero; review remains unresolved.

## Compatibility Impact

### Chrome / Chromium

- supported content scripts and extension pages remain accepted
- background messages from unsupported sender contexts fail closed
- public page redirects remain browser-followed
- main Svelte UI and ordinary config delivery remain intact

### Firefox

- `moz-extension:` pages are accepted
- supported HTTPS content hosts are accepted
- Firefox stringified CustomEvent handling remains intact
- redirect mode follows the standard browser implementation

### Android

- Android native bridge and Kotlin code are unchanged
- shared message shapes remain compatible
- Agent 1 did not run Android verification

## Remaining Work

1. Agent 3 runs PR #5 through its verified workflows after the workflow foundation is available to the integration process.
2. CodeRabbit reviews PR #5.
3. Agent 1 addresses confirmed review or CI findings.
4. Agent 1 and Agent 2 coordinate MCP destination/authentication boundaries.
5. Agent 1 redesigns sandbox messaging and generated-code execution.
6. Agent 1 traces production provider adapters, response detection, continuation, cancellation, context budgeting and handoff.
7. Agent 1 maps modular features to production equivalents before any bootstrap migration.
8. Agent 3 handles the known dependency-audit issue and combined integration verification.

## Recommended Next Agent 1 Pass

**Provider runtime and continuation/handoff trace**, while MCP trust decisions are coordinated with Agent 2 and sandbox changes remain isolated behind explicit tests.
