# Agent 2 Local Bridge Contracts Design

## Status

Approved implementation design derived from the authoritative three-agent repair workflow for `Masterleeaus/AI-Coding-Studio`.

## Existing repository assessment

The repository does not currently contain an operational browser-to-local companion transport. The closest implementations are:

- `src/lib/local-directory-source.js`: browser-granted, read-only File System Access API ingestion.
- `src/content/files/github-reader.js`: in-memory GitHub ZIP ingestion.
- `src/modules/features/TerminalRuntimeModule.js`: simulated command execution that always returns success.
- `src/modules/features/ToolRuntimeModule.js`: simulated tool execution and unconditional approval.
- `src/modules/features/McpIntegrationModule.js`: an in-memory registry without a local process transport.
- `src/core/bootstrap-enhanced.js`: registers the simulated runtimes, but the production content entry point does not invoke this bootstrap.

These files are evidence and integration references; none is a safe local command bridge.

## Goal

Establish a transport-agnostic, security-first contract layer for a future authenticated loopback or Native Messaging companion without enabling arbitrary process execution.

## Chosen approach

Create focused modules under `src/local-bridge/`:

1. `contracts.js` — protocol version, command identifiers, risk levels, request and response validation.
2. `path-policy.js` — canonical repository-root allowlisting and traversal prevention.
3. `secret-filter.js` — conservative redaction for tokens, authorization headers, private keys and sensitive environment assignments.
4. `approval-policy.js` — explicit approval decisions based on risk and caller-provided grants.
5. `operation-log.js` — bounded, redacted operation records.
6. `command-registry.js` — explicit command registration and dispatch; no shell-string fallback.
7. `index.js` — stable public exports.

The first implementation batch deliberately contains no HTTP server, WebSocket server, Native Messaging host, `child_process`, shell, Git, GitHub CLI or VS Code CLI invocation. Those adapters must consume these contracts later and remain independently testable.

## Command model

Every command definition has:

- a unique command identifier;
- one risk level: `READ`, `SAFE_EXECUTION`, `WRITE`, `DESTRUCTIVE` or `PUBLISH`;
- a request validator;
- an asynchronous handler supplied by the eventual local companion;
- an approval requirement derived from risk;
- a redacted operation-log record.

The registry rejects unknown commands, malformed requests, duplicate command registration, missing approvals and non-function handlers.

## Protocol envelope

Requests use this shape:

```js
{
  version: 1,
  requestId: "caller-generated-id",
  command: "files.read",
  repositoryId: "stable-allowlisted-id",
  parameters: {},
  approval: {
    grantedRiskLevels: ["READ"]
  }
}
```

Responses use one of:

```js
{ version: 1, requestId, ok: true, result }
{ version: 1, requestId, ok: false, error: { code, message } }
```

No request field accepts an arbitrary shell command string.

## Repository boundary

The path policy receives an already-authorized repository root and a requested relative path. It:

- rejects empty or non-string roots;
- rejects absolute requested paths;
- rejects traversal segments;
- resolves the requested path canonically;
- verifies the result is the root or a descendant of the root;
- handles Windows and POSIX separators deterministically.

Filesystem access remains impossible until a future companion adapter supplies an allowlisted root.

## Approval model

`READ` operations may run without an explicit grant. `SAFE_EXECUTION`, `WRITE`, `DESTRUCTIVE` and `PUBLISH` require the same risk level to appear in `approval.grantedRiskLevels`. A higher-risk grant does not silently authorize a different category.

Destructive and publish operations remain explicit per request; there is no global auto-approve switch.

## Logging and secret handling

Operation logs contain timestamps, request IDs, command IDs, repository IDs, outcomes and duration. Parameters and errors are recursively redacted before storage. The log has a configurable fixed maximum and evicts oldest records first.

## Initial command catalogue

The contract exports the approved identifiers from the workflow, including health, repository, file, search, patch, Git, GitHub PR, VS Code, test, build and archive commands. Exporting an identifier does not make a command executable; a handler must be explicitly registered.

## Testing

Vitest tests cover:

- valid and malformed request envelopes;
- unknown command rejection;
- duplicate registration rejection;
- exact risk approval behavior;
- traversal and absolute-path rejection;
- Windows and POSIX repository boundaries;
- secret redaction;
- bounded operation logs;
- successful and failed dispatch response envelopes.

## Security invariants

- No unrestricted `exec(command)`.
- No shell strings from webpage content.
- No wildcard CORS policy.
- No remote-network binding.
- No unrestricted filesystem root.
- No force push or destructive operation without explicit approval.
- No secrets in operation logs.
- No hidden command execution.

## Deferred work

A later Agent 2 batch may add a Node companion and one authenticated transport after these contracts are verified. Transport selection must be documented separately and must preserve loopback-only binding or Native Messaging identity controls, authentication, timeouts, output limits and process cleanup.
