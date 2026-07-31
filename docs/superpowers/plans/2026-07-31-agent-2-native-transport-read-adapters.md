# Agent 2 Native Transport and Read Adapters Plan

> **For agentic workers:** Execute test-first and keep all write, destructive, publish and arbitrary-shell capabilities disabled.

**Goal:** Add an authenticated Native Messaging transport foundation and bounded read-only Local Bridge adapters.

**Architecture:** The extension-facing client remains browser-safe and can only run from an extension page or service worker. Node-only stdio framing, caller identity parsing, repository realpath enforcement and adapters remain under `src/runtime/local-bridge/host/`. Every process uses a fixed executable plus argv array with `shell: false`; no caller-controlled command strings are accepted.

**Tech stack:** JavaScript ES modules, WebExtension runtime ports, Node streams/filesystem/crypto/child_process, Vitest-compatible tests.

## Constraints

- Branch: `agent-2/local-bridge-tooling`.
- Base: `integration/local-first-repair`.
- Do not merge or modify `main`.
- Do not add unrestricted shell or terminal execution.
- Do not register write, destructive or publish handlers.
- Do not expose host-only modules through the browser-safe index.
- Do not add wildcard native-host origins/extensions.
- Do not claim packaged Native Messaging works until manifest permission, stable extension IDs, host installation and browser integration are verified.

## Tasks

### 1. Browser Native Messaging client

Create a long-lived `runtime.connectNative()` client with request correlation, pending-request limits, timeout/abort cleanup, disconnect failure propagation and strict response-envelope checks.

### 2. Native stdio framing

Implement four-byte little-endian length framing, incremental decoding, JSON-object validation and a one-megabyte host-response limit.

### 3. Caller identity and host dispatch

Parse Chrome extension origins and Firefox add-on IDs from browser-supplied launch arguments. Support only `session.open`, `session.close` and `bridge.request` envelopes. Route authenticated bridge requests through the secure command registry.

### 4. Process runner

Implement fixed executable-plus-argv execution using `spawn(..., { shell: false })`, bounded stdout/stderr, explicit cwd, timeout/abort cleanup and a minimal inherited environment.

### 5. Repository path and read-only filesystem adapters

Resolve existing paths through `realpath`, reject escapes and unsupported file types, skip symbolic links during traversal, cap depth/entries/file sizes, exclude sensitive repository paths, and register list/read/hash/file-search/text-search handlers.

### 6. Read-only Git and system adapters

Register health/tool discovery and Git status/diff/log handlers with fixed argv shapes and bounded results. Do not accept arbitrary Git arguments.

### 7. Native host manifest generation

Generate Chrome and Firefox host manifests only from explicit absolute executable paths and explicit extension IDs. Never emit wildcard allowlists.

### 8. Verification and reporting

Run focused tests and syntax checks from a fresh isolated harness, inspect the complete PR diff, update the Agent 2 report and PR #6, and leave the PR draft and unmerged for Agent 3 integration verification.
