# Agent 2 Pass Three Report

Branch: `agent-2/local-bridge-tooling`
Draft pull request: `#6`
Target: `integration/local-first-repair`

## Delivered

- Browser-safe Native Messaging client using a correlated long-lived port.
- Native stdio message framing and incremental decoding.
- Browser-supplied Chrome and Firefox caller-identity parsing.
- Host dispatcher limited to session open, session close and structured bridge requests.
- Bounded process runner using executable-plus-argument arrays with `shell: false`.
- Canonical repository realpath enforcement and symbolic-link rejection.
- Read-only system, tool, filesystem, search and Git inspection adapters.
- Explicit Chrome and Firefox native-host manifest generation.
- Browser-safe and Node-only host exports remain separated.

## Registered read-only commands

- `system.health`
- `tools.list`
- `files.list`
- `files.read`
- `files.hash`
- `search.files`
- `search.text`
- `git.status`
- `git.diff`
- `git.log`

No write, destructive or publish handlers were registered.

## Fresh focused evidence

Command:

```text
node --test src/runtime/local-bridge/native-messaging-client.test.js src/runtime/local-bridge/host/*.test.js src/runtime/local-bridge/host/adapters/*.test.js
```

Result: 19 passed, 0 failed.

All new pass-three JavaScript modules also passed `node --check` with zero syntax errors.

## Security controls

- Native response size capped at one megabyte.
- Process time and output limits enforced.
- Minimal inherited process environment.
- Git inspection disables external diff, text-conversion, pager and filesystem-monitor helpers.
- Repository traversal and resolved-path escapes rejected.
- Sensitive repository files excluded from read/search/hash adapters.
- Recursive repository operations observe cancellation.
- Host manifests require exact extension IDs and absolute executable paths.

## Integration limitations

The transport is not yet packaged or active in the extension. The following remain for Agent 3 and cross-agent integration:

- add the `nativeMessaging` extension permission;
- establish stable Chrome and Firefox extension IDs;
- install/register the native host on each supported operating system;
- wire the production background service worker to the browser client;
- run full Vitest, Chrome, Firefox and Android verification;
- run real browser-to-host Native Messaging integration tests;
- obtain CodeRabbit review.

The draft PR remains unmerged and no production-readiness claim is made.
