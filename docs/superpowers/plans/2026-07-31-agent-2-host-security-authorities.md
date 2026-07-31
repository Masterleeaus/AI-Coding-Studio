# Agent 2 Host Security Authorities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add host-only identity sessions, persistent repository allowlisting, and single-use signed approval grants to the existing Local Bridge contract foundation.

**Architecture:** Keep browser-facing protocol and command contracts free of Node built-ins. Add Node-only authorities under `src/runtime/local-bridge/host/`, then compose them into the browser-safe command registry through explicit authentication, repository-authorization, and approval-verification hooks. No transport or process execution is introduced.

**Tech Stack:** JavaScript ES modules, Node crypto/fs/path APIs, Vitest, existing Local Bridge registry.

## Global Constraints

- Work only on `agent-2/local-bridge-tooling`.
- Target `integration/local-first-repair`, never `main`.
- No unrestricted shell execution.
- No HTTP/WebSocket listener in this pass.
- No wildcard CORS or non-loopback binding.
- Browser-safe exports must not import Node built-ins.
- Session tokens and approval secrets must never enter operation logs.
- Repository paths must be resolved by the host from stable repository IDs.

---

### Task 1: Session identity authority

**Files:**
- Create: `src/runtime/local-bridge/host/session-authority.js`
- Create: `src/runtime/local-bridge/host/session-authority.test.js`

- [x] Write failing tests for identity allowlisting, token validation, observed identity binding, expiry and revocation.
- [x] Implement short-lived sessions that retain only token hashes.
- [x] Verify the focused tests pass in an isolated Node harness.

### Task 2: Persistent repository allowlist

**Files:**
- Create: `src/runtime/local-bridge/host/repository-allowlist.js`
- Create: `src/runtime/local-bridge/host/repository-allowlist.test.js`

- [x] Write failing tests for canonical paths, stable IDs, persistence, duplicate roots and revocation.
- [x] Implement atomic mode-0600 JSON persistence and realpath directory validation.
- [x] Verify the focused tests pass in an isolated Node harness.

### Task 3: Single-use approval grants

**Files:**
- Create: `src/runtime/local-bridge/host/approval-grant-authority.js`
- Create: `src/runtime/local-bridge/host/approval-grant-authority.test.js`

- [x] Write failing tests for exact operation binding, tampering, expiry and replay.
- [x] Implement HMAC-signed, short-lived, single-use grants.
- [x] Verify the focused tests pass in an isolated Node harness.

### Task 4: Secure registry composition

**Files:**
- Create: `src/runtime/local-bridge/host/security-context.js`
- Create: `src/runtime/local-bridge/host/security-context.test.js`
- Modify: `src/runtime/local-bridge/protocol.js`
- Modify: `src/runtime/local-bridge/protocol.test.js`
- Modify: `src/runtime/local-bridge/command-registry.js`
- Modify: `src/runtime/local-bridge/command-registry.test.js`
- Modify: `src/runtime/local-bridge/host/index.js`

- [x] Add optional validated session authentication and signed grant fields to protocol requests.
- [x] Add request-authentication and repository-authorization hooks to dispatch.
- [x] Bind grants to authenticated sessions, exact commands, repositories, request IDs and risk levels.
- [x] Pass authenticated identity and allowlisted repository records to handlers.
- [x] Verify an end-to-end secure dispatch in the isolated Node harness.

### Task 5: Verification and reporting

- [ ] Run focused repository tests when CI or a dependency-capable checkout is available.
- [ ] Run Chrome and Firefox builds.
- [ ] Run CodeRabbit.
- [ ] Update PR #6 and coordination issue #3 with exact evidence and remaining transport work.
