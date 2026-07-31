# Pass 02 Dead Code and Duplicate Architecture Report

## Confirmed Unreachable Runtime Removed

Repository-wide import tracing found no production import of:

- `src/core/bootstrap.js`;
- `src/core/bootstrap-enhanced.js`;
- `src/core/ModuleManager.js`;
- any file under `src/modules/` outside the unused bootstrap files.

The Vite entries remain:

- `src/content/index.js`;
- `src/background/index.js`;
- `src/injected/index.js`;
- `src/sandbox/index.js`.

Therefore removal does not alter the shipped bundle entry graph.

## Removed JavaScript Components

```text
src/core/                         5 files
src/modules/config/               2 files
src/modules/core/                 4 files
src/modules/features/            16 files
src/modules/ui/                   3 files
```

Total removed runtime JavaScript files: **30**.

## Removed Stale Documentation

- `COMPLETE_MODULE_INTEGRATION.md`;
- `MODULE_INTEGRATION_MANIFEST.md`;
- `MODULE_INTEGRATION_MANIFEST_v2.1.md`;
- `QUICK_REFERENCE.md`;
- `README-AI-CODING-STUDIO.md`;
- `README-MODULAR.md`.

These files documented `window.__bdsModuleManager`, 29 initialized modules, and bootstrap behavior that was not present in the production entry point.

## Simulated or Empty Implementations Removed

Examples included:

- Tool Runtime returning success after a timer without executing a tool;
- Terminal Runtime returning `Executed: <command>` without running a command;
- MCP servers being marked connected without a transport;
- eleven nine-line modules containing empty lifecycle methods.

Removing them prevents future code from mistaking scaffolding for operational capability.

## Duplicated Responsibilities Retained Temporarily

The following working systems remain and require later consolidation rather than immediate deletion:

- browser-based GitHub ZIP reader versus future GitHub CLI repository operations;
- sandbox code runner versus future Local Bridge test/build commands;
- existing command/tag systems versus future Workflow Runtime execution;
- multiple settings surfaces and provider configuration paths;
- browser search readers versus future Tavily and ripgrep adapters.

They remain because they are active user-facing workflows. Deleting them in Pass 02 would break functionality before replacements exist.

## Candidate Review Queue

Future dead-code analysis should inspect:

- unmounted Svelte components;
- unused locale keys after stale documentation/UI removal;
- provider selectors no longer used by supported sites;
- duplicate GitHub commit helper files in `src/content/files/` and `src/lib/`;
- obsolete Better DeepSeek branding and store links;
- generated or historical extension screenshots;
- unreferenced command and tool tags;
- legacy Android compatibility paths after companion transport selection.
