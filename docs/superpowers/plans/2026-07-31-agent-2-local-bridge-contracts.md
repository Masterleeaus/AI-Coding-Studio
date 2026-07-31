# Agent 2 Local Bridge Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans for later batches. Steps use checkbox syntax for tracking.

**Goal:** Build and verify the transport-independent security and command-contract foundation for AI Coding Studio's future local companion.

**Architecture:** Extend the established `src/runtime` namespace with a browser-safe Local Bridge contract surface and a separate host-only filesystem boundary. No transport or process execution is introduced in this batch.

**Tech Stack:** JavaScript ES modules, Node `path` for host-only policy, Vitest-compatible tests, isolated Node test harness.

## Global constraints

- Preserve Svelte 5, Chrome, Firefox, and Android support.
- Do not create a `.titan` directory.
- Do not add unrestricted shell execution.
- Do not accept shell strings from webpage content.
- Do not bind a local service to `0.0.0.0`.
- Do not use `Access-Control-Allow-Origin: *`.
- Do not add broad extension permissions.
- Do not commit secrets, access tokens, or local SDK paths.
- Branch: `agent-2/local-bridge-tooling`.
- Base: `integration/local-first-repair`.

---

## Task 1: Trace existing implementations

**Inspected:**

- `src/content/bridge.js`
- `src/background/index.js`
- `src/lib/local-directory-source.js`
- `src/content/files/github-reader.js`
- `src/core/bootstrap.js`
- `src/core/bootstrap-enhanced.js`
- `src/modules/features/TerminalRuntimeModule.js`
- `src/modules/features/ToolRuntimeModule.js`
- `src/modules/features/McpIntegrationModule.js`
- Draft PR #2 runtime/local-bridge implementation

- [x] Confirm production `main` has no operational browser-to-local transport.
- [x] Confirm simulated terminal/tool modules are not a safe companion runtime.
- [x] Review PR #2 as architectural evidence rather than duplicating or blindly merging it.
- [x] Select `src/runtime/local-bridge` as the single canonical bridge namespace.

## Task 2: Strict protocol and command catalogue

**Files:**

- `src/runtime/local-bridge/protocol.js`
- `src/runtime/local-bridge/protocol.test.js`
- `src/runtime/local-bridge/command-catalog.js`
- `src/runtime/local-bridge/command-catalog.test.js`

- [x] Define protocol version 1.
- [x] Define the workflow's exact command and risk identifiers.
- [x] Reject unknown commands, unsafe identifiers, non-plain objects, functions, cycles, non-finite values, excessive nesting, and prototype-polluting keys.
- [x] Define stable success and error envelopes.
- [x] Make command risk and repository scope authoritative.
- [x] Classify `git.push` and `github.pr.create` as `PUBLISH`.

## Task 3: Repository and ingestion boundaries

**Files:**

- `src/runtime/local-bridge/host/path-policy.js`
- `src/runtime/local-bridge/host/path-policy.test.js`
- `src/runtime/local-bridge/host/index.js`
- `src/content/files/repository-file-policy.js`
- `src/content/files/repository-file-policy.test.js`
- `src/content/files/github-reader.js`

- [x] Reject traversal, absolute requested paths, NUL bytes, sibling-prefix escapes, and implicit root access.
- [x] Support Windows and POSIX canonical containment.
- [x] Require stable repository IDs for repository-scoped commands.
- [x] Keep `node:path` out of the browser-safe bridge exports.
- [x] Exclude common environment, credential, package-auth, SSH, cloud, and private-key files from repository ingestion.
- [x] Preserve `.github/workflows` for audit and CI evidence.
- [ ] Add realpath/symlink/junction containment when a filesystem adapter exists.

## Task 4: Approval, logging, and secret controls

**Files:**

- `src/runtime/safety/approval-policy.js`
- `src/runtime/safety/approval-policy.test.js`
- `src/runtime/local-bridge/secret-filter.js`
- `src/runtime/local-bridge/secret-filter.test.js`
- `src/runtime/local-bridge/operation-log.js`
- `src/runtime/local-bridge/operation-log.test.js`

- [x] Allow `READ` implicitly.
- [x] Require exact approval for `SAFE_EXECUTION`, `WRITE`, `DESTRUCTIVE`, and `PUBLISH`.
- [x] Prevent one risk grant from silently authorizing another.
- [x] Treat caller-provided approval claims as untrusted.
- [x] Require a trusted host `approvalVerifier` for all non-read commands.
- [x] Redact authorization headers, API tokens, private keys, sensitive environment values, and sensitive object keys.
- [x] Bound operation history and return immutable snapshots.

## Task 5: Explicit command registry

**Files:**

- `src/runtime/local-bridge/command-registry.js`
- `src/runtime/local-bridge/command-registry.test.js`

- [x] Require explicit handler registration.
- [x] Reject duplicate, unknown, malformed, and non-function definitions.
- [x] Reject caller-controlled risk downgrades.
- [x] Reject repository-scoped dispatch without `repositoryId`.
- [x] Reject caller-self-authorized write, destructive, or publish execution.
- [x] Validate parameters before handler invocation.
- [x] Enforce abortable timeouts.
- [x] Enforce output byte limits.
- [x] Redact handler failures and operation records.
- [x] Provide no default handler and no shell-string fallback.

## Task 6: Stable exports and documentation

**Files:**

- `src/runtime/local-bridge/index.js`
- `src/runtime/local-bridge/index.test.js`
- `docs/superpowers/specs/2026-07-31-agent-2-local-bridge-contracts-design.md`
- `docs/agents/agent-2-local-bridge-report.md`

- [x] Export the browser-safe contract surface without Node built-ins.
- [x] Expose host-only path policy through `src/runtime/local-bridge/host/index.js`.
- [x] Remove the temporary parallel `src/local-bridge` namespace.
- [x] Align the design with the final runtime architecture.
- [x] Create the final Agent 2 report.

## Task 7: Verification and review

- [x] Run isolated Local Bridge tests: 29 passing.
- [x] Run repository-ingestion policy tests: 2 passing.
- [x] Inspect the final branch diff against `integration/local-first-repair`.
- [x] Inspect available GitHub Actions evidence: no checks or workflow runs were present.
- [x] Attempt CodeRabbit review: CLI unavailable and installation blocked by DNS; no GitHub app review appeared.
- [x] Address self-review findings: risk downgrade, prototype pollution, caller-self-approval, browser `node:path` exposure, and unrelated reader formatting drift.
- [x] Open draft PR #6 into `integration/local-first-repair`.
- [x] Create the final report and update coordination issue #3.

## Deferred implementation batches

The following are intentionally not implemented until the foundation is reviewed:

1. repository allowlist persistence mapping stable IDs to canonical roots;
2. authentication token and extension identity validation;
3. host-issued approval grants and concrete verifier;
4. Native Messaging or loopback-only authenticated transport;
5. Git, GitHub CLI, VS Code, filesystem, search, test, build, and archive adapters;
6. realpath containment, process lifecycle management, streaming/chunking, and host installation.

No later batch may introduce unrestricted shell execution.
