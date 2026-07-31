# AI Coding Studio — Local AI Development Operating System

## Product Role

AI Coding Studio is an AI orchestration layer above mature developer tools.

It does not attempt to replace:

- Visual Studio Code;
- Git or GitHub Desktop;
- GitHub CLI;
- PowerShell or the operating-system shell;
- Node.js, npm, PHP, Composer, Python, Docker, MySQL, Playwright, ripgrep, or 7-Zip;
- ChatGPT, Claude, or DeepSeek.

The extension coordinates these tools, maintains workflow state, requests approval, and returns structured evidence to the active AI conversation.

## Five-System Architecture

```text
AI Coding Studio
├── AI Runtime
│   ├── conversation coordination
│   ├── planning and reasoning state
│   ├── patch proposals
│   ├── prompt templates
│   └── multi-pass session state
├── Local Bridge
│   ├── authenticated native transport
│   ├── allowlisted commands
│   ├── workspace restrictions
│   ├── cancellation and timeouts
│   └── structured command results
├── Repository Runtime
│   ├── repository discovery and metadata
│   ├── Git status, history and diffs
│   ├── branch and patch operations
│   ├── build and test delegation
│   └── archive and release delegation
├── Workflow Runtime
│   ├── audit
│   ├── fix
│   ├── review
│   ├── test
│   ├── build
│   └── publish workflows
└── Extension Runtime
    ├── Manifest V3 lifecycle
    ├── provider page adapters
    ├── browser messaging
    ├── Svelte UI
    └── notifications and approvals
```

## Pass 02 Implemented Boundary

Pass 02 removes the disconnected `ModuleManager` and module-wrapper tree. The production content entry now initializes `RuntimeKernel`, which owns:

- `LocalBridgeClient`;
- `ToolRegistry`;
- `RepositoryRuntime`;
- `WorkflowRegistry`.

The working content-script subsystems remain in place while responsibilities are migrated incrementally. This avoids a flag-day rewrite.

## Runtime Directory

```text
src/runtime/
├── RuntimeKernel.js
├── singleton.js
├── index.js
├── contracts/
│   └── command-result.js
├── local-bridge/
│   ├── LocalBridgeClient.js
│   ├── command-catalog.js
│   └── protocol.js
├── repository/
│   └── RepositoryRuntime.js
├── safety/
│   └── approval-policy.js
├── tool-registry/
│   ├── ToolRegistry.js
│   └── tool-definitions.js
└── workflow/
    ├── WorkflowRegistry.js
    └── workflow-definitions.js
```

## Command Contract

Every operating-system operation is a named command, not a raw shell string.

```js
{
  version: 1,
  requestId: "uuid",
  command: "git.status",
  input: { repository: "C:/projects/app" },
  workspaceId: "approved-workspace",
  approvalLevel: "read",
  timeoutMs: 60000,
  createdAt: 0
}
```

Every result is normalized:

```js
{
  ok: true,
  operationId: "uuid",
  command: "git.status",
  status: "completed",
  data: {},
  artifacts: [],
  warnings: [],
  error: null,
  startedAt: 0,
  completedAt: 1,
  durationMs: 1
}
```

Unknown commands are denied. The catalog deliberately contains no unrestricted `shell.exec` operation.

## Approval Levels

```text
read
  repository status, diff, history, search, archive inspection, editor opens

execute
  tests, builds, package managers, framework commands and remote workflows

write
  file writes, patch application, branches, commits, pushes, installs, archives, releases

destructive
  deletion, hard reset, force push, overwrite

privileged
  workspace expansion, privileged containers, any unknown command
```

The default private-owner policy may auto-approve read operations. All other levels require an approval provider.

## Tool Registry

Tool availability is discovered by the Local Bridge. A definition existing in the registry does not mean the tool is installed.

Initial definitions:

- Git;
- GitHub CLI;
- Visual Studio Code;
- PowerShell;
- Node.js and npm;
- PHP and Composer;
- Python;
- Docker;
- 7-Zip;
- ripgrep;
- Playwright;
- MySQL.

A tool is enabled only after discovery supplies an executable, availability state, and optional version.

## Repository Runtime

The Repository Runtime is an orchestration facade. It does not implement Git.

Examples:

```js
repositoryRuntime.status(repository)
repositoryRuntime.diff(repository, options)
repositoryRuntime.createBranch(repository, branch)
repositoryRuntime.applyPatch(repository, patch)
repositoryRuntime.commit(repository, message)
repositoryRuntime.push(repository)
repositoryRuntime.runTests(repository)
repositoryRuntime.build(repository)
repositoryRuntime.createArchive(repository)
repositoryRuntime.openInVsCode(repository)
```

Each method delegates to an allowlisted Local Bridge command.

## Workflow Runtime

Pass 02 registers reusable definitions for:

- Deep Audit;
- Bug Fix;
- Architecture Review;
- Dependency Audit;
- Security Audit;
- Code Review;
- Generate Documentation;
- Build Extension;
- Build Release;
- Create Delta;
- Run Tests;
- Publish Release.

Definitions are immutable ordered steps. Execution state persistence is reserved for a later pass.

## Extension Runtime Boundary

The extension remains responsible for:

- host-page integration;
- provider adapters;
- content scripts and injected scripts;
- background/service-worker messaging;
- Svelte UI and approvals;
- extension notifications.

The service worker will own Native Messaging because content scripts cannot connect to a native host directly. Content scripts will send validated structured requests to the service worker, which will relay them to the companion.

## Migration Rule

A legacy subsystem is removed only when all of the following are true:

1. its production registration and imports are traced;
2. its user-visible responsibility is identified;
3. the replacement boundary is implemented;
4. relevant tests exist;
5. migration notes name the retained and removed behavior.

The read-only GitHub repository importer and sandbox code runner are retained during Pass 02 because they are active user workflows, not the disconnected simulated module tree.
