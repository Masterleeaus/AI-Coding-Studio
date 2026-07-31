# AI Coding Studio Pass 02 — Local AI Development OS Implementation Plan

> **For agentic workers:** Execute task-by-task with test-first development, cohesive commits, and verification before completion.

**Goal:** Simplify AI Coding Studio into a local-first orchestration layer that coordinates mature developer tools instead of simulating or reimplementing them.

**Architecture:** Retain the working Manifest V3/Svelte extension as the Extension Runtime. Remove the disconnected ModuleManager/module-wrapper architecture and replace it with explicit, production-imported runtime boundaries: Local Bridge, Tool Registry, Repository Runtime, Workflow Runtime, and a small Runtime Kernel. All operating-system work is expressed as allowlisted structured commands and delegated to a future authenticated local companion.

**Tech stack:** JavaScript ES modules, Chrome Manifest V3, Firefox WebExtensions, Svelte 5, Node 22 native test runner, Vite 6.

## Global Constraints

- Preserve current extension workflows and UI.
- Do not add an IDE, terminal emulator, Git client, repository browser, or file manager.
- Delegate filesystem, Git, GitHub CLI, VS Code, package-manager, test, build, archive, and scan work to local tools through a safe bridge.
- Do not provide unrestricted shell execution.
- Every command returns structured JSON.
- Every command has an explicit approval level, timeout, and capability requirement.
- Do not activate unavailable tools or report simulated success.
- Keep Chrome, Firefox, Chromium, and Android support.
- Do not merge into `main` without explicit approval.

---

### Task 1: Remove the disconnected modular architecture

**Files:**
- Delete: `src/core/`
- Delete: `src/modules/`
- Delete: `README-MODULAR.md`
- Delete: `README-AI-CODING-STUDIO.md`
- Delete: `COMPLETE_MODULE_INTEGRATION.md`
- Delete: `MODULE_INTEGRATION_MANIFEST.md`
- Delete: `MODULE_INTEGRATION_MANIFEST_v2.1.md`
- Delete: `QUICK_REFERENCE.md`
- Modify: `MULTIPLATFORM_GUIDE.md`

**Verification:**
- Prove no production import targets deleted files.
- Run the repository-relative import checker.
- Run `node --check` over all JavaScript source files.

### Task 2: Define command results and approval policy

**Files:**
- Create: `src/runtime/contracts/command-result.js`
- Create: `src/runtime/contracts/command-result.test.js`
- Create: `src/runtime/safety/approval-policy.js`
- Create: `src/runtime/safety/approval-policy.test.js`

**Interfaces:**
- `createCommandResult(input) -> CommandResult`
- `createCommandError(input) -> CommandResult`
- `classifyCommand(commandName) -> ApprovalLevel`
- `requiresConfirmation(commandName, policy) -> boolean`

**Test cycle:**
1. Tests reject unknown statuses and malformed results.
2. Tests enforce immutable normalized results.
3. Tests classify read, execute, write, destructive, and privileged commands.
4. Tests deny unknown commands by default.

### Task 3: Implement the safe Local Bridge contract

**Files:**
- Create: `src/runtime/local-bridge/command-catalog.js`
- Create: `src/runtime/local-bridge/protocol.js`
- Create: `src/runtime/local-bridge/LocalBridgeClient.js`
- Create: `src/runtime/local-bridge/local-bridge.test.js`

**Interfaces:**
- `getCommandDefinition(name) -> CommandDefinition | null`
- `createBridgeRequest(command, input, context) -> BridgeRequest`
- `validateBridgeResponse(value, request) -> CommandResult`
- `LocalBridgeClient.execute(command, input, options) -> Promise<CommandResult>`

**Rules:**
- No `shell.exec` or arbitrary command string.
- Unknown commands fail closed.
- Write/destructive/privileged commands call the approval provider.
- Transport timeout and cancellation are mandatory.
- Results are structured and bounded.

### Task 4: Add the local Tool Registry

**Files:**
- Create: `src/runtime/tool-registry/tool-definitions.js`
- Create: `src/runtime/tool-registry/ToolRegistry.js`
- Create: `src/runtime/tool-registry/ToolRegistry.test.js`

**Detected tools:**
- Git
- GitHub CLI
- VS Code
- PowerShell
- Node.js
- npm
- PHP
- Composer
- Python
- Docker
- 7-Zip
- ripgrep
- Playwright
- MySQL

**Interfaces:**
- `ToolRegistry.applyDiscovery(discovery)`
- `ToolRegistry.get(toolId)`
- `ToolRegistry.list(options)`
- `ToolRegistry.hasCapability(capability)`
- `ToolRegistry.snapshot()`

### Task 5: Add Repository and Workflow runtimes

**Files:**
- Create: `src/runtime/repository/RepositoryRuntime.js`
- Create: `src/runtime/repository/RepositoryRuntime.test.js`
- Create: `src/runtime/workflow/workflow-definitions.js`
- Create: `src/runtime/workflow/WorkflowRegistry.js`
- Create: `src/runtime/workflow/WorkflowRegistry.test.js`

**Repository operations:**
- discover repositories
- read repository metadata
- status and diff
- branch creation
- patch application
- commit and push
- tests and builds
- delta and archive creation
- VS Code open/reveal/diff operations

**Workflow definitions:**
- Deep Audit
- Bug Fix
- Architecture Review
- Dependency Audit
- Security Audit
- Code Review
- Generate Documentation
- Build Extension
- Build Release
- Create Delta
- Run Tests
- Publish Release

### Task 6: Production-import the Runtime Kernel

**Files:**
- Create: `src/runtime/RuntimeKernel.js`
- Create: `src/runtime/RuntimeKernel.test.js`
- Create: `src/runtime/index.js`
- Modify: `src/content/index.js`
- Modify: `package.json`

**Behavior:**
- The kernel always loads workflow and tool definitions.
- Without a configured bridge transport, local capabilities remain unavailable.
- The extension does not simulate a successful local operation.
- Existing content runtime initialization remains unchanged after kernel startup.

**Verification:**
- `npm run test:architecture`
- `node --check` over JavaScript source.
- JSON parse check.
- Static relative-import resolution.

### Task 7: Document consolidation and migration evidence

**Files:**
- Create: `docs/architecture/LOCAL_AI_DEVELOPMENT_OS.md`
- Create: `docs/reports/PASS02_ARCHITECTURE_SIMPLIFICATION.md`
- Create: `docs/reports/PASS02_DEAD_CODE_REPORT.md`
- Create: `docs/reports/PASS02_LOCAL_BRIDGE_SPEC.md`
- Create: `docs/reports/PASS02_GITHUB_CLI_INTEGRATION.md`
- Create: `docs/reports/PASS02_VSCODE_INTEGRATION.md`
- Create: `docs/reports/PASS02_TECHNICAL_DEBT.md`
- Modify: `README.md`
- Modify: `docs/plans/AI-Coding-Studio-Remediation-Plan-Pass1.md`

**Outputs:**
- Updated directory tree.
- Removed and retained component inventories.
- Migration notes.
- Remaining technical debt.
- Next-pass recommendation.
- Cumulative ZIP and changed-files delta ZIP.
