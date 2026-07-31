# Agent 2 Native Host Packaging Design

## Goal

Make the existing read-only Local Bridge host runnable, configurable, diagnosable and ready for per-user Chrome and Firefox registration without changing the production background service worker or extension manifests.

## Scope

This pass owns:

- validated host configuration;
- native-host bootstrap composition;
- deterministic per-user registration plans for Windows, macOS and Linux;
- installation diagnostics;
- reversible uninstall plans;
- focused tests and documentation.

This pass does not:

- add `nativeMessaging` to extension manifests;
- modify `src/background/index.js`;
- perform system-wide installation;
- silently mutate the Windows registry;
- package a Windows executable;
- enable write, destructive or publish handlers.

## Architecture

### Host configuration

A versioned JSON configuration records the exact allowed Chrome and Firefox identities, repository allowlist file, and bounded runtime limits. The loader accepts only an absolute regular-file path, rejects symbolic links, unexpected keys, malformed identities and unsafe limit values, and returns an immutable normalized object.

Default per-user configuration paths are derived from the operating system. No raw signing secret is persisted; session and approval authorities generate process-local secrets.

### Runtime bootstrap

`createNativeHostRuntime()` composes:

1. browser-provided caller identity parsing;
2. validated host configuration;
3. persistent repository allowlist loading;
4. session and approval authorities;
5. the secure command registry;
6. the existing read-only adapters;
7. the native dispatcher and stdio host pump.

Fatal diagnostics go only to stderr. Standard output remains reserved for framed native messages.

### Registration planner

The planner produces an immutable list of exact actions instead of applying them automatically.

- Windows plans contain the manifest write plus a per-user registry key/value operation.
- macOS and Linux plans contain the exact per-user manifest path and manifest content.
- Chrome and Firefox plans are separate because their manifest permission fields and discovery locations differ.
- Every plan requires an exact extension ID and an absolute host executable path.
- Windows Chrome plans require a packaged `.exe`; Node scripts and command files are rejected as production host executables.

### Doctor

The doctor checks configuration, executable, manifest content, manifest location, extension identity alignment and repository allowlist readability. It reports structured `pass`, `warning` or `fail` findings and never modifies the machine.

### Uninstall planner

The uninstall planner returns only exact known manifest-file and per-user registry-key removals. It never proposes recursive directory deletion.

## Security invariants

- no wildcard extension identities;
- no caller-controlled executable or command arguments;
- no shell execution;
- no stdout logging;
- no system-wide mutation in this pass;
- no recursive uninstall;
- no write/destructive/publish adapter registration;
- caller identity must be allowed by both browser registration and host configuration;
- all persisted paths are absolute and revalidated.

## Testing

Focused tests cover:

- strict configuration parsing and symlink rejection;
- default path derivation on Windows, macOS and Linux;
- runtime composition with only read-only commands;
- exact Chrome and Firefox per-user registration locations;
- Windows registry plan generation;
- Windows executable requirement;
- immutable uninstall actions;
- doctor findings for missing, mismatched and valid installations;
- stdout/stderr separation at bootstrap.

## Integration handoff

Agent 1 and Agent 3 must later provide stable extension IDs, manifest permission changes, production service-worker routing and packaged-browser integration tests. Agent 2 will not activate Native Messaging before those inputs are available.
