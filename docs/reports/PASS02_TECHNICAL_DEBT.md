# Pass 02 Technical Debt Report

## Critical Trust Boundaries Still Open

1. Background messages and privileged fetch operations need strict schemas and sender policies.
2. `<all_urls>` remains in the current manifest pending endpoint and optional-permission migration.
3. Untrusted Markdown/HTML rendering still requires one sanitization path.
4. Sandbox messages need source, nonce, schema, timeout, cancellation and output limits.
5. The page-accessible remote-config debug mutation path must be removed or development-gated.
6. Archive/folder ingestion needs aggregate budgets, path checks and secret-file exclusions.

These become more important once the Local Bridge can access repositories and tools.

## Local Bridge Work Remaining

- Native Messaging host implementation and installer;
- service-worker connection manager;
- message validation between content script and service worker;
- handshake, version negotiation and installation identity;
- workspace allowlist persistence;
- per-command input schemas;
- process spawning without shell interpolation;
- streaming/bounded output;
- cancellation and process-tree termination;
- local operation log;
- Windows, macOS and Linux packaging;
- Firefox Native Messaging compatibility;
- Android transport decision.

## Runtime Work Remaining

- persisted workflow instances and recovery;
- progress events and user-visible approval UI;
- AI Runtime boundary extraction from `src/content`;
- provider adapter consolidation;
- migration of GitHub, build, test, archive and editor actions to Repository Runtime;
- removal of duplicated prompt/provider/model settings;
- central logging and error codes;
- lifecycle cleanup for observers, timers and listeners.

## Documentation and Branding Debt

The main README preserves substantial Better DeepSeek history and public-store references. A later documentation pass should:

- distinguish current AI Coding Studio architecture from inherited features;
- replace obsolete repository/store links;
- update screenshots and product naming;
- separate private installation from historical public extension instructions;
- remove locale copy for retired public-product surfaces only after UI tracing.

## Test Debt

- the standard dependency install is blocked in this execution environment;
- Chrome and Firefox builds were not run;
- Android builds/tests were not run;
- Vitest and Playwright suites were not run;
- no Native Messaging integration test exists yet;
- no service-worker restart/recovery test exists;
- no provider-page smoke fixtures exist for all supported hosts.

## Consolidation Queue

- GitHub readers: define read-only context fallback versus Local Bridge repository operations;
- search readers: define web research versus local code search;
- code runner: define sandbox snippets versus project build/test execution;
- commands and prompt libraries: converge around workflow definitions;
- settings: group provider, workflow, tool, vault and approval configuration;
- logging: replace scattered console calls with structured local diagnostics.
