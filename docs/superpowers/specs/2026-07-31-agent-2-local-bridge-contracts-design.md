# Agent 2 Local Bridge Contracts Design

## Status

Implemented foundation on `agent-2/local-bridge-tooling`, based on the authoritative three-agent repair workflow for `Masterleeaus/AI-Coding-Studio`.

## Existing repository assessment

The `main` branch did not contain an operational browser-to-local companion transport. The closest implementations were:

- `src/lib/local-directory-source.js`: browser-granted, read-only File System Access API ingestion.
- `src/content/files/github-reader.js`: in-memory GitHub ZIP ingestion.
- `src/modules/features/TerminalRuntimeModule.js`: simulated command execution that always reports success.
- `src/modules/features/ToolRuntimeModule.js`: simulated tool execution and unconditional approval.
- `src/modules/features/McpIntegrationModule.js`: an in-memory registry without a local process transport.
- `src/core/bootstrap-enhanced.js`: registers the simulated runtimes, but the production content entry point does not invoke this bootstrap.

Draft PR #2 introduced a useful `src/runtime` kernel and Local Bridge client prototype. It was used as architectural evidence, not merged unchanged, because it lacked strict JSON request validation, canonical repository-path enforcement, output-size limits, secret-redacted operation logs, authentication/identity contracts, and the workflow's required risk taxonomy.

## Goal

Establish a transport-agnostic, security-first contract layer for a future authenticated loopback or Native Messaging companion without enabling arbitrary process execution.

## Chosen architecture

The browser-safe contract surface lives under the existing runtime namespace:

1. `src/runtime/local-bridge/protocol.js` — protocol version, approved command identifiers, risk identifiers, strict request validation, and response envelopes.
2. `src/runtime/local-bridge/command-catalog.js` — authoritative command risk and repository-scope classification.
3. `src/runtime/local-bridge/secret-filter.js` — recursive secret and credential redaction.
4. `src/runtime/local-bridge/operation-log.js` — bounded, redacted operation records.
5. `src/runtime/safety/approval-policy.js` — exact fail-closed approval decisions for use by a trusted host verifier.
6. `src/runtime/local-bridge/command-registry.js` — explicit command registration and dispatch, trusted approval verification, timeouts, abort signals, output-size limits, and logging.
7. `src/runtime/local-bridge/index.js` — browser-safe public exports with no Node built-ins.

Host-only filesystem policy lives separately:

8. `src/runtime/local-bridge/host/path-policy.js` — canonical repository-root boundary and traversal prevention using `node:path`.
9. `src/runtime/local-bridge/host/index.js` — host-only exports.

There is one Local Bridge namespace. A temporary `src/local-bridge` implementation used during development was removed after consolidation.

## Command model

Every approved command has an authoritative catalogue definition containing:

- a unique command identifier;
- one risk level: `READ`, `SAFE_EXECUTION`, `WRITE`, `DESTRUCTIVE`, or `PUBLISH`;
- whether a stable `repositoryId` is required.

Handlers cannot downgrade catalogue risk. Registration rejects unknown commands, duplicate handlers, non-function handlers, invalid validators, and risk mismatches.

The initial catalogue covers health, tool discovery, repositories, files, search, patches, Git, GitHub pull requests, VS Code, tests, builds, and archives. `git.push` and `github.pr.create` are classified as `PUBLISH`.

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

Requests accept plain JSON-compatible data only. Functions, prototype-bearing objects, cycles, non-finite numbers, excessive nesting, prototype-polluting keys, unknown commands, unsafe identifiers, and malformed approval data are rejected.

## Repository boundary

Repository-scoped commands require a stable `repositoryId`; raw absolute repository paths are not part of the bridge envelope.

The host-only path policy receives an already-authorized repository root and a requested relative path. It rejects:

- non-absolute or empty repository roots;
- absolute requested paths;
- `..` traversal;
- NUL bytes;
- sibling-prefix escapes;
- repository-root access without an explicit option.

It handles Windows and POSIX paths deterministically. A future filesystem adapter must additionally resolve real paths before access so symlink and junction escapes cannot bypass the lexical boundary.

## Approval model

`READ` operations may run without approval. `SAFE_EXECUTION`, `WRITE`, `DESTRUCTIVE`, and `PUBLISH` require a trusted `approvalVerifier` supplied by the local host.

Caller-provided `approval.grantedRiskLevels` values are untrusted context and do not authorize execution by themselves. The host verifier must validate a user-approved, host-issued grant before returning `true`. Without a verifier, all non-read commands fail closed.

The exported `isRiskApproved()` helper may be used inside the trusted verifier only after authentication and grant authenticity have been established.

## Execution controls

The registry:

- has no default handler or string-to-shell conversion;
- rejects unregistered commands;
- rejects repository-scoped commands without `repositoryId`;
- requires trusted host approval verification for non-read commands;
- applies per-command execution timeouts through `AbortController`;
- rejects results exceeding a configurable byte limit;
- normalizes failures into stable response envelopes;
- redacts secrets from returned errors and operation logs.

## Repository-ingestion boundary

`src/content/files/repository-file-policy.js` blocks environment files, package-manager auth files, credential files, private keys, and common cloud/SSH credential paths before repository content is concatenated for AI use.

`src/content/files/github-reader.js` now applies that policy and no longer discards `.github/workflows`, allowing audits to inspect CI evidence without ingesting common secrets.

## Security invariants

- No unrestricted `exec(command)`.
- No shell strings received from webpage content.
- No HTTP, WebSocket, Native Messaging, or process transport in this batch.
- No wildcard CORS policy.
- No remote-network binding.
- No unrestricted filesystem root.
- No caller-controlled command-risk downgrade.
- No caller-self-authorized write, destructive, or publish execution.
- No repository-scoped execution without a repository ID.
- No Node built-ins exported through the browser-safe bridge index.
- No prototype-polluting JSON keys.
- No hidden command execution.
- No secrets in operation logs.

## Verification

The isolated Node harness currently passes:

- 29 Local Bridge contract, catalogue, host-path, approval, logging, redaction, timeout, output-limit, trust-boundary, and registry tests.
- 2 repository-ingestion policy tests.

Full Vitest, Chrome, Firefox, Playwright, and Android verification remain dependent on GitHub Actions or a usable repository checkout.

## Deferred work

A later Agent 2 batch must add, in order:

1. repository allowlist storage mapping `repositoryId` to canonical roots;
2. authentication-token and extension-identity contracts;
3. host-issued approval grants and a concrete `approvalVerifier`;
4. one transport: Native Messaging or loopback-only authenticated HTTP;
5. structured adapters for Git, GitHub CLI, VS Code, filesystem, search, tests, builds, and archives;
6. realpath/symlink/junction containment, process cleanup, output streaming/chunking, cancellation propagation, and host installation documentation.

No adapter may introduce unrestricted shell execution.
