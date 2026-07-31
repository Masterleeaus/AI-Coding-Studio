# Agent 2 Pass Four Report

Branch: `agent-2/local-bridge-tooling`
Original Local Bridge PR: `#6` (merged during this pass at the design/plan checkpoint)
Target: `integration/local-first-repair`
Tracker: `#15`

## Delivered

- Strict versioned native-host configuration with exact extension identities.
- Per-user default configuration paths for Windows, macOS and Linux.
- Configuration symlink, unknown-field, duplicate-identity and unsafe-limit rejection.
- Native-host runtime composition using the existing session, approval, repository and read-only adapter layers.
- Immutable Chrome and Firefox registration plans for Windows, macOS and Linux.
- Explicit per-user Windows registry plans using `HKCU` only.
- Reversible uninstall plans that remove only known manifest files and registry keys.
- Windows Chrome `.exe` requirement; scripts are not represented as production executables.
- Read-only installation doctor for executable, manifest, configuration, repository allowlist and optional registry checks.
- Native host and manual doctor entry points.
- Fatal host diagnostics restricted to stderr; Native Messaging stdout remains frame-only.
- Source-boundary tests proving this pass does not activate Native Messaging in the extension manifest or production background router.

## Fresh focused verification

Combined pass-four harness:

```text
20 passed, 0 failed
```

All new or modified pass-four JavaScript and MJS modules passed `node --check` with zero syntax errors.

Direct CLI smoke evidence:

```text
doctor_exit=1 doctor_stdout_bytes=113 doctor_stderr_bytes=0
host_exit=1 host_stdout_bytes=0 host_stderr_bytes=95
cli_smoke=pass
```

The doctor intentionally emits manual JSON diagnostics on stdout. The native host emitted zero stdout bytes when startup failed and wrote its diagnostic to stderr.

## Safety boundaries

- No machine registration is performed automatically.
- No system-wide installation actions are generated.
- No recursive uninstall action is generated.
- No shell execution is introduced.
- No write, destructive or publish command handler is registered.
- No extension manifest or production background activation is included.
- Exact extension IDs and absolute executable paths remain mandatory.

## Repository-state event

PR #6 was merged into `integration/local-first-repair` while pass four was in progress, at commit `d73795b4c833e5f48cbd16ff0faaa940fb56bff1`. Pass-four implementation commits were created afterward and therefore require a separate draft PR.

## Limitations and blockers

Not claimed as verified:

- repository-wide Vitest suite on the combined integration tree;
- Chrome or Firefox builds;
- Android verification;
- real browser-to-host Native Messaging integration;
- Windows executable packaging and signing;
- actual OS registration/unregistration;
- stable Chrome and Firefox extension IDs;
- production service-worker wiring;
- CodeRabbit review.

The packaging delta must remain draft until Agent 3 rebases or merges it with the current integration branch and runs the complete cross-agent verification suite.
