# Agent 2 — Local Bridge, Repository, and CLI Architecture Report

## Pass status

| Field | Value |
|---|---|
| Repository | `Masterleeaus/AI-Coding-Studio` |
| Agent role | `2 — Local Bridge, Repository and CLI Architecture Agent` |
| Branch | `agent-2/local-bridge-tooling` |
| Base branch | `integration/local-first-repair` |
| Draft PR | `#6 — feat(bridge): establish secure local bridge contract foundation` |
| PR target | `integration/local-first-repair` |
| Main modified directly | No |
| Local transport implemented | No — deliberately deferred |
| Unrestricted shell execution introduced | No |

## Executive summary

This pass establishes the security and command-contract foundation for a future AI Coding Studio Local Bridge without creating an unsafe or duplicate executable bridge.

The branch now contains:

- a strict, versioned plain-JSON protocol;
- the approved command catalogue;
- authoritative command risk and repository-scope classification;
- a browser-safe public bridge surface;
- host-only canonical path containment;
- fail-closed trusted approval verification;
- an explicit command registry with no shell fallback;
- timeouts, abort signals, output-size limits, bounded operation logs, and secret redaction;
- repository-ingestion filtering that excludes common secret files while retaining `.github/workflows` for audit evidence.

No HTTP, WebSocket, Native Messaging, process, Git, GitHub CLI, VS Code CLI, filesystem-write, build, test, or archive-execution adapter is included in this pass. Those components must be built only after authentication, extension identity, repository allowlisting, and host-issued approvals are defined.

## Existing bridge assessment

### Current `main`

The production branch does not contain an operational browser-to-local companion transport.

Relevant existing components:

- `src/lib/local-directory-source.js` provides browser-granted, read-only File System Access API ingestion.
- `src/content/files/github-reader.js` downloads and concatenates repository files in memory.
- `src/modules/features/TerminalRuntimeModule.js` simulates execution and reports success without a real local process.
- `src/modules/features/ToolRuntimeModule.js` simulates tool execution and approval.
- `src/modules/features/McpIntegrationModule.js` provides an in-memory tool registry, not a local command bridge.
- `src/core/bootstrap-enhanced.js` registers the simulated runtimes, but the production content entry point uses a different bootstrap path.

### Draft PR #2

Draft PR #2 contains a useful `src/runtime` kernel, Local Bridge client prototype, repository runtime, approval policy, and tool registry. It was reviewed as architectural evidence.

It was not merged wholesale because the bridge prototype did not yet provide all required controls:

- strict plain-JSON request validation;
- authoritative workflow risk levels;
- canonical repository path containment;
- output-size limits;
- secret-redacted operation logs;
- authentication and extension identity contracts;
- trusted host approval verification;
- protection against caller-controlled risk downgrade;
- separation of Node-only filesystem policy from browser bundles.

This pass preserves the `src/runtime` direction rather than creating a parallel application or replacement repository.

## Implemented architecture

### Browser-safe Local Bridge surface

Located under `src/runtime/local-bridge/`:

- `protocol.js`
- `command-catalog.js`
- `command-registry.js`
- `secret-filter.js`
- `operation-log.js`
- `index.js`

The public `index.js` exports no Node built-ins.

### Host-only filesystem boundary

Located under `src/runtime/local-bridge/host/`:

- `path-policy.js`
- `index.js`

This boundary may be imported by a future Node companion, but not by the browser extension bundle.

### Shared safety policy

Located under `src/runtime/safety/`:

- `approval-policy.js`

## Request and response schemas

### Request

```js
{
  version: 1,
  requestId: "req-123",
  command: "files.read",
  repositoryId: "repo-allowlist-id",
  parameters: {
    path: "src/index.js"
  },
  approval: {
    grantedRiskLevels: ["READ"]
  }
}
```

Validation rejects:

- unsupported versions;
- missing or unsafe identifiers;
- unknown commands;
- arrays where objects are required;
- functions and non-JSON values;
- prototype-bearing objects;
- circular structures;
- non-finite numbers;
- excessive nesting;
- `__proto__`, `prototype`, and `constructor` object keys;
- unknown approval risk values.

### Success response

```js
{
  version: 1,
  requestId: "req-123",
  ok: true,
  result: {}
}
```

### Error response

```js
{
  version: 1,
  requestId: "req-123",
  ok: false,
  error: {
    code: "APPROVAL_REQUIRED",
    message: "Trusted WRITE approval is required."
  }
}
```

## Authoritative command catalogue

The catalogue covers:

- `system.health`
- `tools.list`
- repository discovery, GitHub listing, and clone
- file list, read, write, and hash
- text and file search
- patch preview and apply
- Git status, diff, log, branch, fetch, pull, commit, and push
- GitHub pull-request create, view, and checks
- VS Code open repository and open file
- test detect and run
- build detect and run
- archive inspect, extract, create, and delta

### Risk classes

- `READ`
- `SAFE_EXECUTION`
- `WRITE`
- `DESTRUCTIVE`
- `PUBLISH`

Representative classifications:

| Command | Risk |
|---|---|
| `files.read` | `READ` |
| `tests.run` | `SAFE_EXECUTION` |
| `files.write` | `WRITE` |
| `git.push` | `PUBLISH` |
| `github.pr.create` | `PUBLISH` |

A handler cannot override the catalogue risk. Attempted downgrade registration fails with `RISK_LEVEL_MISMATCH`.

## Approval trust boundary

Caller-provided approval claims are not trusted by the registry.

- `READ` commands may execute without approval.
- Every non-read command requires a trusted host `approvalVerifier`.
- Without that verifier, non-read commands fail closed even when the request claims `PUBLISH`, `WRITE`, or another grant.
- A future host verifier must authenticate the caller and validate a host-issued, user-approved grant before returning `true`.

The current branch does not implement host-issued approval tokens because authentication and transport are not yet present.

## Repository boundary

Repository-scoped commands require a stable `repositoryId` rather than a raw absolute repository path in the request envelope.

The host path policy:

- requires an absolute allowlisted root;
- accepts repository-relative requested paths only;
- rejects `..` traversal;
- rejects absolute requested paths;
- rejects NUL bytes;
- prevents sibling-prefix escapes;
- handles Windows and POSIX path rules;
- denies repository-root access unless explicitly permitted.

### Remaining filesystem limitation

The current policy is lexical. A future filesystem adapter must resolve real paths and verify symlink/junction targets remain under the allowlisted root before opening or writing files.

## Execution controls

The command registry provides:

- explicit handler registration only;
- no default execution path;
- no string-to-shell conversion;
- duplicate command rejection;
- repository-scope enforcement;
- parameter validation hooks;
- trusted approval verification hooks;
- per-command timeout;
- `AbortController` cancellation signal;
- configurable result byte limit;
- stable error normalization;
- bounded, redacted operation logging.

## Secret filtering

The redactor handles:

- authorization and proxy-authorization headers;
- bearer tokens;
- GitHub token formats;
- OpenAI-style token formats;
- private-key blocks;
- sensitive environment assignments;
- nested keys containing token, secret, password, private-key, credential, cookie, and related names;
- arrays and nested objects;
- circular and excessively deep structures.

## Repository-ingestion security repair

### Confirmed defect

`src/content/files/github-reader.js` treated environment-style files as ingestible text and discarded the entire `.github` directory.

### Impact

- A repository audit could concatenate `.env` or similar secret-bearing files into AI context.
- CI and workflow evidence under `.github/workflows` was invisible to the audit.

### Repair

`src/content/files/repository-file-policy.js` now excludes common sensitive paths including:

- `.env` and `.env.*`;
- `.npmrc`, `.yarnrc`, `.pypirc`, and `.netrc`;
- common SSH private-key names;
- credential and service-account files;
- private-key and keystore extensions;
- `.ssh`, `.gnupg`, and AWS credential paths.

`github-reader.js` applies this policy before concatenating content and no longer skips `.github` globally.

## Finding register

### F-01 — Incomplete implementation: simulated terminal runtime

- **Affected subsystem:** `TerminalRuntimeModule` and enhanced bootstrap.
- **Evidence:** command execution returns simulated success; no local process or authenticated transport exists.
- **Impact:** UI or orchestration may imply commands were executed when nothing happened.
- **Likely cause:** feature scaffolding was registered before the local companion existed.
- **Repair in this pass:** no simulated executor was promoted; a secure explicit registry foundation was created.
- **Regression risk:** future code may wire the simulator as if it were real.
- **Required test:** integration test proving a real authenticated host executes only a named registered command.

### F-02 — Architectural risk: competing bridge/runtime implementations

- **Affected subsystem:** existing modules, enhanced bootstrap, and draft PR #2 runtime.
- **Evidence:** multiple terminal/tool/bridge concepts exist with different contracts.
- **Impact:** duplicate initialization, inconsistent approvals, and incompatible command semantics.
- **Likely cause:** features evolved in parallel.
- **Repair in this pass:** consolidated the new foundation under `src/runtime/local-bridge`; temporary duplicate namespace removed.
- **Regression risk:** separately merging draft PR #2 without reconciliation could reintroduce overlap.
- **Required test:** one runtime bootstrap test asserting a single Local Bridge contract surface.

### F-03 — Security risk: repository secret ingestion

- **Affected file:** `src/content/files/github-reader.js`.
- **Evidence:** environment extensions were accepted and no sensitive-path policy existed.
- **Impact:** API keys, credentials, and private keys could enter AI context.
- **Likely cause:** text-file inclusion focused on readability, not trust boundaries.
- **Repair:** added sensitive repository-path policy and tests.
- **Regression risk:** new credential naming conventions may evade the policy.
- **Required test:** fixture ZIP containing sensitive and safe files, asserting only safe files are emitted.

### F-04 — Test gap: GitHub Actions hidden from repository audit

- **Affected file:** `src/content/files/github-reader.js`.
- **Evidence:** `.github` was globally skipped.
- **Impact:** agents could not inspect workflow definitions or CI evidence.
- **Likely cause:** `.github` was treated as metadata rather than executable project configuration.
- **Repair:** removed `.github` from the skip set while retaining secret-path filtering.
- **Regression risk:** future broad metadata filters may hide workflows again.
- **Required test:** `.github/workflows/verify.yml` is retained while `.github` credential files remain excluded.

### F-05 — Security risk: caller-controlled command risk downgrade

- **Affected subsystem:** command registration.
- **Evidence:** a handler-supplied risk could classify a publish command as read-only.
- **Impact:** privileged operations could bypass approval policy.
- **Repair:** authoritative command catalogue; mismatched risk registration is rejected.
- **Required test:** registering `git.push` as `READ` fails.

### F-06 — Security risk: caller self-approval

- **Affected subsystem:** command dispatch.
- **Evidence:** an untrusted request can include arbitrary approval claims.
- **Impact:** a compromised page or extension surface could authorize its own write or publish request.
- **Repair:** all non-read execution requires a trusted host verifier; caller claims alone are insufficient.
- **Required test:** `PUBLISH` claim without host verifier remains denied.

### F-07 — Security risk: prototype pollution

- **Affected subsystem:** JSON request cloning.
- **Evidence:** assignment of `__proto__` during cloning can alter the output object's prototype.
- **Impact:** request validation or downstream logic could be manipulated.
- **Repair:** reject `__proto__`, `prototype`, and `constructor` keys.
- **Required test:** parsed JSON containing `__proto__` fails with `INVALID_JSON_KEY`.

### F-08 — Security risk: path traversal and repository escape

- **Affected subsystem:** future host filesystem adapter.
- **Evidence:** no canonical repository-bound path policy existed.
- **Impact:** local file access could escape the selected repository.
- **Repair:** host-only Windows/POSIX lexical containment policy.
- **Remaining risk:** symlinks and junctions require realpath verification in the adapter.
- **Required test:** adapter fixtures containing symlink/junction escapes.

### F-09 — Security risk: secret leakage through logs and failures

- **Affected subsystem:** operation logging and error responses.
- **Evidence:** no common redaction layer existed for a future bridge.
- **Impact:** tokens and credentials could persist in logs or UI errors.
- **Repair:** recursive secret redaction and bounded logs.
- **Required test:** nested token and authorization values never appear in returned errors or stored logs.

### F-10 — Performance and reliability risk: hanging or oversized handlers

- **Affected subsystem:** local command dispatch.
- **Evidence:** a future handler could run indefinitely or return unbounded output.
- **Impact:** resource exhaustion, frozen workflows, or memory pressure.
- **Repair:** abortable timeout and configurable output-byte limit.
- **Required test:** hanging handler returns `COMMAND_TIMEOUT`; oversized result returns `RESULT_TOO_LARGE`.

### F-11 — Compatibility risk: Node built-in exposed to extension bundle

- **Affected subsystem:** public Local Bridge exports.
- **Evidence:** canonical path policy depends on `node:path`, which is unavailable in a browser extension bundle.
- **Impact:** Chrome or Firefox builds could fail if the public bridge index imported the host path module.
- **Repair:** moved path policy under `src/runtime/local-bridge/host` and removed it from browser-safe exports.
- **Required test:** browser-safe index does not expose `resolveRepositoryPath`.

## Files changed

### Documentation

- `docs/superpowers/specs/2026-07-31-agent-2-local-bridge-contracts-design.md`
- `docs/superpowers/plans/2026-07-31-agent-2-local-bridge-contracts.md`
- `docs/agents/agent-2-local-bridge-report.md`

### Repository ingestion

- `src/content/files/github-reader.js`
- `src/content/files/repository-file-policy.js`
- `src/content/files/repository-file-policy.test.js`

### Local Bridge contracts

- `src/runtime/local-bridge/protocol.js`
- `src/runtime/local-bridge/protocol.test.js`
- `src/runtime/local-bridge/command-catalog.js`
- `src/runtime/local-bridge/command-catalog.test.js`
- `src/runtime/local-bridge/command-registry.js`
- `src/runtime/local-bridge/command-registry.test.js`
- `src/runtime/local-bridge/secret-filter.js`
- `src/runtime/local-bridge/secret-filter.test.js`
- `src/runtime/local-bridge/operation-log.js`
- `src/runtime/local-bridge/operation-log.test.js`
- `src/runtime/local-bridge/index.js`
- `src/runtime/local-bridge/index.test.js`

### Host-only boundary

- `src/runtime/local-bridge/host/path-policy.js`
- `src/runtime/local-bridge/host/path-policy.test.js`
- `src/runtime/local-bridge/host/index.js`

### Safety

- `src/runtime/safety/approval-policy.js`
- `src/runtime/safety/approval-policy.test.js`

## Verification evidence

### Passing isolated checks

Fresh isolated Node harness results:

- Local Bridge tests: **29 passed, 0 failed**.
- Repository-ingestion policy tests: **2 passed, 0 failed**.

These checks cover protocol validation, command catalogue, risk downgrade, trusted approvals, repository scope, prototype pollution, Windows/POSIX path containment, redaction, bounded logs, timeouts, output limits, and browser-safe exports.

### GitHub Actions

At the time of this report:

- commit statuses on the PR head: none;
- pull-request workflow runs: none;
- Chrome build: not verified;
- Firefox build: not verified;
- full Vitest suite: not verified;
- Playwright/Selenium: not verified;
- Android build: not verified.

The existing repository workflow coverage does not currently provide the required verification for this PR. Agent 3 owns shared CI repair.

### Environment limitation

A fresh GitHub checkout and raw-file fetch were attempted but failed because the execution environment could not resolve GitHub hosts. No local npm, Vitest, Vite, Chrome, Firefox, Playwright, Selenium, or Android execution is claimed.

## CodeRabbit review

CodeRabbit review was attempted as required:

- CodeRabbit CLI was not installed.
- CLI installation was attempted.
- Installation failed because the environment could not resolve `cli.coderabbit.ai`.
- No CodeRabbit GitHub app comment or review appeared on PR #6 during this pass.

Therefore CodeRabbit review is **blocked, not completed**. Agent 3 should rerun CodeRabbit before integrating the PR.

## Compatibility impact

- No manifest permissions changed.
- No Chrome, Firefox, Android, Svelte, or UI entry point changed.
- No Local Bridge transport is wired into the extension.
- Browser-safe exports contain no `node:path` dependency.
- Host-only filesystem policy remains isolated until a Node companion exists.

## Remaining security and runtime work

1. Authentication token generation, storage, rotation, and comparison.
2. Chrome/Firefox extension identity validation.
3. Repository allowlist persistence mapping stable IDs to canonical roots.
4. Host-issued approval grants and concrete trusted verifier.
5. Native Messaging or loopback-only authenticated transport.
6. Loopback origin policy without wildcard CORS.
7. Request-frame size limits before JSON parsing.
8. Realpath, symlink, and junction containment.
9. Structured Git, GitHub CLI, VS Code, filesystem, search, build, test, and archive adapters.
10. Process cleanup and child-process tree termination.
11. Output streaming/chunking and backpressure.
12. Host installer, native manifest, upgrade, and uninstall documentation.
13. GitHub Actions for unit tests and Chrome/Firefox builds.
14. CodeRabbit review and resolution of confirmed findings.

## Recommended next pass

Implement the repository allowlist and authentication/identity contract before selecting a transport. Do not add command handlers until those controls and a trusted approval-grant model are executable and tested.

## End-of-pass report

| Field | Result |
|---|---|
| Repository | `Masterleeaus/AI-Coding-Studio` |
| Agent role | Agent 2 |
| Branch | `agent-2/local-bridge-tooling` |
| Base branch | `integration/local-first-repair` |
| Files inspected | README, package/build/manifest, core/background/content/injected/platform/sandbox/modules/tests/scripts/workflows/docs paths, plus PR #2 runtime paths |
| Confirmed findings | 11 documented findings |
| Files changed | 23 including this report |
| Tests added or updated | 31 isolated test cases total: 29 bridge + 2 ingestion policy |
| GitHub Actions runs inspected | PR head checked; 0 runs found |
| Checks passing | 29 bridge and 2 ingestion-policy tests in isolated Node harness |
| Checks failing | None in isolated harness |
| Checks absent | Full Vitest, Chrome, Firefox, Playwright/Selenium, Android |
| CodeRabbit findings | No review returned; CLI install blocked by DNS |
| Security risks | Authentication, identity, allowlist persistence, realpath containment, transport, and host approval grants remain |
| Compatibility risks | Repository-wide browser builds not yet executed |
| Remaining work | Transport and executable adapters deliberately deferred |
| Recommended next pass | Authentication + repository allowlist + trusted approval grant design |
| Draft PR | `#6` targeting `integration/local-first-repair` |
