# Agent 2 Local Bridge Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and test the transport-independent security and command-contract foundation for AI Coding Studio's future local companion.

**Architecture:** Add small ES modules under `src/local-bridge/` that define protocol envelopes, command/risk identifiers, approval rules, repository-path boundaries, secret redaction, bounded logging and explicit handler dispatch. No transport or process execution is introduced in this batch.

**Tech Stack:** JavaScript ES modules, Node `path`, Vitest, existing repository test configuration.

## Global Constraints

- Preserve Svelte 5, Chrome, Firefox and Android support.
- Do not create a `.titan` directory.
- Do not add unrestricted shell execution.
- Do not accept shell strings from webpage content.
- Do not bind a local service to `0.0.0.0`.
- Do not use `Access-Control-Allow-Origin: *`.
- Do not add broad permissions.
- Do not commit secrets, access tokens or local SDK paths.
- Agent branch: `agent-2/local-bridge-tooling`.
- Base branch: `integration/local-first-repair`.

---

### Task 1: Protocol and command catalogue

**Files:**
- Create: `src/local-bridge/contracts.test.js`
- Create: `src/local-bridge/contracts.js`

**Interfaces:**
- Produces: `BRIDGE_PROTOCOL_VERSION`, `RISK_LEVELS`, `COMMANDS`, `BridgeContractError`, `validateBridgeRequest()`, `createSuccessResponse()`, `createErrorResponse()`.

- [ ] **Step 1: Write failing tests**

Cover valid request normalization, non-object requests, unsupported versions, missing IDs, unknown commands, non-object parameters and stable success/error envelopes.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:unit -- src/local-bridge/contracts.test.js`

Expected: FAIL because `contracts.js` does not exist.

- [ ] **Step 3: Implement the minimal contract module**

Define the exact approved command identifiers and reject every command not present in that catalogue. Preserve request parameters as plain JSON-compatible data; do not accept functions or prototype-bearing objects.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm run test:unit -- src/local-bridge/contracts.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/local-bridge/contracts.js src/local-bridge/contracts.test.js
git commit -m "feat(bridge): define command and protocol contracts"
```

### Task 2: Repository path boundary

**Files:**
- Create: `src/local-bridge/path-policy.test.js`
- Create: `src/local-bridge/path-policy.js`

**Interfaces:**
- Produces: `RepositoryPathError`, `resolveRepositoryPath(repositoryRoot, requestedPath, options)`.

- [ ] **Step 1: Write failing tests**

Cover POSIX descendants, root access when allowed, `..` traversal, absolute requested paths, sibling-prefix escapes, Windows separators, Windows drive-qualified paths and empty roots.

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:unit -- src/local-bridge/path-policy.test.js`

Expected: FAIL because `path-policy.js` does not exist.

- [ ] **Step 3: Implement canonical boundary checks**

Use `node:path` `posix` and `win32` helpers selected from the repository root format. Reject traversal before resolution, resolve canonically, and compare with a separator-terminated root to prevent `/repo-other` prefix escapes.

- [ ] **Step 4: Run and verify GREEN**

Run: `npm run test:unit -- src/local-bridge/path-policy.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/local-bridge/path-policy.js src/local-bridge/path-policy.test.js
git commit -m "feat(bridge): enforce repository path boundaries"
```

### Task 3: Secret filtering and bounded operation log

**Files:**
- Create: `src/local-bridge/secret-filter.test.js`
- Create: `src/local-bridge/secret-filter.js`
- Create: `src/local-bridge/operation-log.test.js`
- Create: `src/local-bridge/operation-log.js`

**Interfaces:**
- Produces: `redactSecrets(value)`, `createOperationLog({ maxEntries })`.

- [ ] **Step 1: Write failing redaction tests**

Cover authorization headers, API keys, GitHub tokens, OpenAI-style tokens, private-key blocks, sensitive environment assignments, nested objects, arrays and non-sensitive values.

- [ ] **Step 2: Run redaction test and verify RED**

Run: `npm run test:unit -- src/local-bridge/secret-filter.test.js`

Expected: FAIL because `secret-filter.js` does not exist.

- [ ] **Step 3: Implement recursive conservative redaction**

Replace sensitive values with `[REDACTED]`; never mutate caller-owned data.

- [ ] **Step 4: Write failing operation-log tests**

Cover fixed-size FIFO eviction, redacted parameters/errors, immutable returned snapshots and clear behavior.

- [ ] **Step 5: Run log test and verify RED**

Run: `npm run test:unit -- src/local-bridge/operation-log.test.js`

Expected: FAIL because `operation-log.js` does not exist.

- [ ] **Step 6: Implement bounded logging**

Store only normalized metadata and redacted payloads. Return copies from `list()`.

- [ ] **Step 7: Run both tests and verify GREEN**

Run: `npm run test:unit -- src/local-bridge/secret-filter.test.js src/local-bridge/operation-log.test.js`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/local-bridge/secret-filter.js src/local-bridge/secret-filter.test.js src/local-bridge/operation-log.js src/local-bridge/operation-log.test.js
git commit -m "feat(bridge): redact secrets in bounded operation logs"
```

### Task 4: Approval policy and command registry

**Files:**
- Create: `src/local-bridge/approval-policy.test.js`
- Create: `src/local-bridge/approval-policy.js`
- Create: `src/local-bridge/command-registry.test.js`
- Create: `src/local-bridge/command-registry.js`

**Interfaces:**
- Consumes: `RISK_LEVELS`, `validateBridgeRequest()`, response helpers and operation log.
- Produces: `requiresExplicitApproval(riskLevel)`, `isRiskApproved(riskLevel, approval)`, `createCommandRegistry({ operationLog, clock })`.

- [ ] **Step 1: Write failing approval tests**

Verify `READ` is implicit, all other levels require an exact grant, malformed grants fail closed and one risk level does not authorize another.

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:unit -- src/local-bridge/approval-policy.test.js`

Expected: FAIL because `approval-policy.js` does not exist.

- [ ] **Step 3: Implement fail-closed approval rules**

Return booleans only; unknown risk levels throw during command registration.

- [ ] **Step 4: Write failing registry tests**

Cover explicit registration, duplicate rejection, unknown dispatch, malformed request rejection, missing approval, successful asynchronous dispatch, normalized handler errors and operation logging.

- [ ] **Step 5: Run registry test and verify RED**

Run: `npm run test:unit -- src/local-bridge/command-registry.test.js`

Expected: FAIL because `command-registry.js` does not exist.

- [ ] **Step 6: Implement minimal explicit dispatch**

Registry definitions require `{ command, riskLevel, validateParameters, handler }`. There is no default handler and no string-to-shell conversion.

- [ ] **Step 7: Run both tests and verify GREEN**

Run: `npm run test:unit -- src/local-bridge/approval-policy.test.js src/local-bridge/command-registry.test.js`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/local-bridge/approval-policy.js src/local-bridge/approval-policy.test.js src/local-bridge/command-registry.js src/local-bridge/command-registry.test.js
git commit -m "feat(bridge): add approved command registry"
```

### Task 5: Public API and Agent 2 report

**Files:**
- Create: `src/local-bridge/index.js`
- Create: `docs/agents/agent-2-local-bridge-report.md`

**Interfaces:**
- Consumes: all prior modules.
- Produces: stable exports for future transports and adapters.

- [ ] **Step 1: Add an import smoke test to `contracts.test.js`**

Import from `./index.js` and assert the public API exposes the protocol version, command catalogue, path resolver, redactor, operation log and registry.

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:unit -- src/local-bridge/contracts.test.js`

Expected: FAIL because `index.js` does not exist.

- [ ] **Step 3: Create the public barrel file**

Export only documented APIs; keep internal helpers private.

- [ ] **Step 4: Document findings and limitations**

Record the simulated/unreachable runtimes, absence of a real local transport, security controls implemented, tests added, unverified commands and deferred transport/adapters.

- [ ] **Step 5: Run focused and full verification**

Run:

```bash
npm run test:unit -- src/local-bridge
npm run test:unit
npm run build:chrome
npm run build:firefox
```

Expected: all pass. If GitHub Actions cannot execute a command, record it as not verified.

- [ ] **Step 6: Commit**

```bash
git add src/local-bridge/index.js src/local-bridge/contracts.test.js docs/agents/agent-2-local-bridge-report.md
git commit -m "docs(agent-2): report local bridge contract foundation"
```

### Task 6: Review and draft pull request

**Files:**
- Review all files changed on `agent-2/local-bridge-tooling`.

- [ ] **Step 1: Compare against `integration/local-first-repair`**

Confirm no unrelated extension runtime, UI, workflow or Agent 3 approval-engine files changed.

- [ ] **Step 2: Inspect GitHub Actions evidence**

Record exact passing, failing and absent checks.

- [ ] **Step 3: Run CodeRabbit**

Review security boundaries, browser-extension trust assumptions, path handling, redaction, missing tests and architecture drift.

- [ ] **Step 4: Address confirmed review issues**

Apply only relevant findings with tests first. Document rejected recommendations and reasons.

- [ ] **Step 5: Open a draft PR**

Target: `integration/local-first-repair`.

Include existing bridge assessment, architecture, components, schemas, security controls, changed files, tests, Actions evidence, CodeRabbit outcome and remaining local-runtime work.

## Plan self-review

- Spec coverage: the first safe contract layer is fully covered; transport and process adapters are explicitly deferred to a separate design and plan.
- Placeholder scan: no implementation placeholders are present.
- Type consistency: command, risk, request, response, approval, log and registry names are consistent across tasks.
