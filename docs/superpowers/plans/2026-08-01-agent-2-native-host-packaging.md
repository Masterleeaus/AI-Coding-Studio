# Agent 2 Native Host Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the read-only Local Bridge host runnable, configurable, diagnosable and ready for explicit per-user browser registration.

**Architecture:** Add focused Node-only modules for strict configuration, runtime composition, registration planning, diagnostics and uninstall planning. Keep browser runtime and production extension entry points untouched.

**Tech Stack:** JavaScript ES modules, Node.js built-ins, Vitest-compatible tests, Native Messaging JSON manifests.

## Global Constraints

- Do not modify `src/background/index.js` or extension manifests.
- Do not apply registry or filesystem registration automatically.
- Do not register write, destructive or publish handlers.
- Do not use shell execution.
- Keep stdout reserved for framed Native Messaging responses.
- Require exact extension IDs and absolute host paths.

---

### Task 1: Strict Host Configuration

**Files:**
- Create: `src/runtime/local-bridge/host/host-config.js`
- Test: `src/runtime/local-bridge/host/host-config.test.js`

**Interfaces:**
- Produces: `getDefaultHostConfigPath(options)`, `validateHostConfig(value)`, `loadHostConfig(filePath)`.

- [ ] Write tests for OS-specific defaults, unknown-key rejection, exact identity validation, absolute allowlist path enforcement and symlink rejection.
- [ ] Run the focused test and confirm it fails because the module does not exist.
- [ ] Implement the minimal immutable version-1 configuration loader.
- [ ] Run the focused test and confirm all cases pass.
- [ ] Commit the module and test.

### Task 2: Runtime Composition

**Files:**
- Create: `src/runtime/local-bridge/host/host-runtime.js`
- Test: `src/runtime/local-bridge/host/host-runtime.test.js`

**Interfaces:**
- Consumes: existing session authority, grant authority, repository allowlist, secure registry, read-only adapter catalogue, native dispatcher and host pump.
- Produces: `createNativeHostRuntime(options)` and `startNativeHostRuntime(options)`.

- [ ] Write tests proving caller identity enforcement, allowlist loading, read-only command registration and stderr-only fatal reporting.
- [ ] Run the focused test and confirm it fails because the module does not exist.
- [ ] Implement composition without adding write-capable handlers.
- [ ] Run the focused test and confirm all cases pass.
- [ ] Commit the module and test.

### Task 3: Registration Locations and Plans

**Files:**
- Create: `src/runtime/local-bridge/host/installer/native-host-locations.js`
- Create: `src/runtime/local-bridge/host/installer/registration-plan.js`
- Test: `src/runtime/local-bridge/host/installer/registration-plan.test.js`

**Interfaces:**
- Produces: `getPerUserManifestLocation(options)`, `createRegistrationPlan(options)`, `createUninstallPlan(options)`.

- [ ] Write tests for Chrome and Firefox locations on Windows, macOS and Linux.
- [ ] Add tests for per-user Windows registry keys, exact manifest contents, `.exe` enforcement for Windows Chrome and non-recursive uninstall actions.
- [ ] Run the focused test and confirm it fails because the modules do not exist.
- [ ] Implement immutable deterministic plans only; do not perform machine changes.
- [ ] Run the focused test and confirm all cases pass.
- [ ] Commit the modules and test.

### Task 4: Installation Doctor

**Files:**
- Create: `src/runtime/local-bridge/host/installer/native-host-doctor.js`
- Test: `src/runtime/local-bridge/host/installer/native-host-doctor.test.js`

**Interfaces:**
- Produces: `inspectNativeHostInstallation(options)` returning structured findings and summary counts.

- [ ] Write tests for missing executable, malformed manifest, identity mismatch, missing allowlist and a valid installation.
- [ ] Run the focused test and confirm it fails because the module does not exist.
- [ ] Implement read-only diagnostics using injected filesystem and registry readers.
- [ ] Run the focused test and confirm all cases pass.
- [ ] Commit the module and test.

### Task 5: Host Entry and Export Surface

**Files:**
- Create: `scripts/local-bridge-host.mjs`
- Create: `scripts/local-bridge-doctor.mjs`
- Modify: `src/runtime/local-bridge/host/index.js`
- Modify: `src/runtime/local-bridge/host/index.test.js`
- Test: `tests/local-bridge-host-entry.test.js`

**Interfaces:**
- Host entry loads the default or explicit configuration and starts the host.
- Doctor entry prints JSON diagnostics to stdout only when run manually, never during Native Messaging.

- [ ] Write source-boundary tests proving production background and manifests are unchanged and browser-safe exports contain no Node installer modules.
- [ ] Run tests and confirm they fail before entry files and exports exist.
- [ ] Implement the two Node entry points and host-only exports.
- [ ] Run focused tests and syntax checks.
- [ ] Commit the entry points, exports and tests.

### Task 6: Documentation and Final Verification

**Files:**
- Create: `docs/agents/agent-2-pass4-report.md`
- Update PR #6 and issue #15 with evidence.

- [ ] Run every pass-four focused test in one command.
- [ ] Run `node --check` on every new or modified JavaScript module.
- [ ] Inspect the branch diff for background, manifest, write-handler or shell-execution drift.
- [ ] Record exact results and unresolved packaging/integration limitations.
- [ ] Keep PR #6 draft and unmerged.
