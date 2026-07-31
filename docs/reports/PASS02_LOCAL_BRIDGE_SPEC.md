# Pass 02 Local Bridge Specification

## Purpose

The Local Bridge is the only route from the browser extension to operating-system capabilities.

It delegates to installed tools instead of implementing filesystems, Git, terminals, editors, package managers, test runners, build systems, archives, containers, or databases in the extension.

## Transport Decision

Preferred production transport: Chrome Native Messaging.

Reasons:

- the native host is registered for an exact extension origin;
- Chrome starts and supervises the host process;
- transport uses length-prefixed JSON over standard input/output;
- the service worker can maintain a long-lived native port;
- no localhost listener needs to be exposed.

The service worker must own the connection. Content scripts send validated extension messages to the service worker because Native Messaging APIs are not available directly in content scripts.

A loopback service may remain an optional development transport, but it must bind to loopback only and use an installation-specific secret plus replay protection.

## Protocol

Current protocol version: `1`.

Request:

```json
{
  "version": 1,
  "requestId": "uuid",
  "command": "git.status",
  "input": { "repository": "C:/projects/app" },
  "workspaceId": "approved-workspace",
  "approvalLevel": "read",
  "timeoutMs": 60000,
  "createdAt": 0
}
```

Response:

```json
{
  "version": 1,
  "requestId": "uuid",
  "result": {
    "operationId": "uuid",
    "command": "git.status",
    "status": "completed",
    "data": {},
    "artifacts": [],
    "warnings": [],
    "error": null,
    "startedAt": 0,
    "completedAt": 1
  }
}
```

Request IDs and commands must match. Unknown versions and commands fail closed.

## Command Families

```text
tool.*       local tool discovery
repo.*       repository discovery and metadata
file.*       bounded approved-workspace file operations
patch.*      patch validation and application
search.*     ripgrep/git-grep/symbol/TODO/reference search
git.*        Git operations
package.*    npm and Composer operations
framework.*  framework-specific allowlisted operations
build.*      configured build scripts
test.*       configured test scripts
archive.*    ZIP/7-Zip inventory, creation, extraction and verification
scan.*       dependency and security scans
vscode.*     editor launch/reveal/diff actions
workflow.*   GitHub Actions workflow operations
release.*    release operations
docker.*     explicitly approved container actions
workspace.*  workspace allowlist administration
```

There is no general shell command.

## Companion Enforcement

The companion must independently enforce:

- canonical workspace paths;
- repository allowlist;
- command allowlist;
- executable allowlist;
- argument schema per command;
- timeout and cancellation;
- output byte limits;
- artifact path limits;
- environment-variable filtering;
- redaction of tokens and credentials;
- append-only operation logs;
- no direct writes to protected branches by default.

Extension-side approval is not sufficient on its own.

## Tool Detection

The `tool.detect` command returns records such as:

```json
{
  "id": "git",
  "available": true,
  "version": "2.47.3",
  "executable": "C:/Program Files/Git/cmd/git.exe",
  "metadata": {}
}
```

The companion should use direct executable/version probes and never infer availability only from configured paths.

## Output Rules

- stdout and stderr are transport details, not the primary API.
- commands parse tool output into structured `data`.
- raw output may be included only as bounded diagnostic fields.
- large files and archives are returned as artifact metadata, not embedded message bytes.
- secrets are redacted before any result reaches a content script or AI provider.
