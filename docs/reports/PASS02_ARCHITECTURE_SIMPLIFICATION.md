# Pass 02 — Architecture Simplification and Local-First Evolution

## Outcome

Pass 02 establishes AI Coding Studio as a local AI development operating system rather than another IDE or Git client.

This pass changes architecture without replacing the working extension UI or host-page workflows.

## Refactored Architecture

Implemented production-imported foundations:

- Runtime Kernel;
- structured command result contract;
- approval policy;
- Local Bridge protocol and client;
- allowlisted local command catalog;
- local Tool Registry;
- Repository Runtime facade;
- Workflow Registry with twelve engineering workflows.

## Removed Components

The following disconnected architecture was removed:

- `src/core/ModuleManager.js`;
- `src/core/ModuleInterface.js`;
- `src/core/EventEmitter.js`;
- both unused bootstrap files;
- 25 module wrappers under `src/modules/`;
- six stale integration/readme documents that described the disconnected 29-module runtime.

The deleted runtime was not imported by any shipped entry point. Several wrappers were no-op factories and the terminal/tool modules returned simulated success.

## Added Components

Twenty runtime source/test files were added under `src/runtime/`, plus an architecture checker and consolidated documentation.

## Preserved Working Functionality

Pass 02 intentionally retains:

- Svelte UI;
- content-script startup;
- provider-page integration;
- existing file/folder and read-only GitHub context import;
- sandbox code runner and office exports;
- memory, skills, projects, context budgeting, research, and parser workflows;
- Chrome, Firefox, and Android build paths.

## Standardization

- Package identity is now `ai-coding-studio` version `2.1.0`.
- `package.json`, lockfile root metadata, static manifest, and multiplatform manifest now agree on version `2.1.0`.
- Local commands return one immutable result shape.
- Approval levels use one vocabulary: read, execute, write, destructive, privileged.
- Local tool availability is represented through one registry.
- Workflow definitions use immutable IDs and ordered steps.

## Tests Added

Twenty native Node tests cover:

- command-result normalization;
- error normalization;
- command status validation;
- approval classification;
- fail-closed unknown commands;
- Local Bridge request/response matching;
- unavailable bridge behavior;
- write approval;
- Tool Registry discovery;
- Repository Runtime delegation;
- absence of arbitrary shell methods;
- required workflow definitions;
- Runtime Kernel initialization and tool discovery.

## Validation

Passed:

- `npm run test:architecture`;
- `npm run check:architecture`;
- JavaScript syntax checks;
- JSON parsing;
- static relative-import resolution.

Blocked:

- dependency installation and Vite/Vitest/Playwright builds remain blocked in this environment by the unavailable package-mirror copy of `zimmerframe@1.1.4`.

No Chrome, Firefox, Android, Vitest, or Playwright success claim is made in this pass.

## Migration Notes

- The Runtime Kernel is initialized from `src/content/index.js`.
- With no configured Local Bridge transport, all local tools remain unavailable.
- The extension never simulates a successful local command.
- The Local Bridge command catalog is an interface contract; the native companion is not implemented in this pass.
- Existing browser-only GitHub import remains a context-ingestion fallback until the companion and GitHub CLI adapter are operational.

## Recommended Next Pass

Implement the service-worker/native-host transport and tool-detection handshake, then migrate repository writes, GitHub operations, builds, tests, archives, and VS Code launch actions behind the Local Bridge.
