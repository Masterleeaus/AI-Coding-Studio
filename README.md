# AI Coding Studio

AI Coding Studio is a modular, multi-platform AI development environment delivered as a browser extension, with additional Firefox and Android support. It extends supported AI chat platforms with persistent memory, project context, file and repository ingestion, code execution, browser automation, deep research, document generation and reusable prompt and skill systems.

Repository: `https://github.com/Masterleeaus/AI-Coding-Studio`

> AI Coding Studio is an independent project. It is not affiliated with, endorsed by or sponsored by OpenAI, Anthropic, DeepSeek, Google, Mozilla or any other AI or browser vendor. Product names and trademarks belong to their respective owners.

## Current Product Scope

AI Coding Studio is more than a popup extension. The codebase includes:

- Manifest V3 Chrome and Chromium builds
- Firefox WebExtension builds
- Android WebView packaging and bridge support
- Svelte 5 user-interface components
- Vite-based multi-target builds
- Background service-worker runtime
- Content scripts and page-context injected scripts
- Sandboxed document and code-generation runtime
- Modular feature registration and lifecycle management
- Persistent memory and project context
- Context budgeting and handoff support
- Retrieval and RAG-style context systems
- Deep-research workflows
- File, folder, webpage and GitHub repository ingestion
- Browser automation and tool runtimes
- DOCX, XLSX and PPTX generation
- Remote configuration and localisation
- Unit, integration and end-to-end tests

## Supported AI Platforms

The extension currently targets supported web interfaces for:

- ChatGPT
- Claude
- DeepSeek
- OpenAI web applications

Host-page markup can change without notice. Platform-specific selectors and adapters should remain isolated, defensive and easy to update.

## Main Features

### Persistent Memory and Skills

Store reusable user facts, project knowledge, instructions, prompt libraries, personas and skills locally. Memory and project context can be attached selectively to AI requests.

### Project and File Context

Import local files, folders, webpages and GitHub repositories. The extension prepares source material for use as model context while managing token and context limits.

### Long-Running Project Work

Collect multi-file output into structured projects and downloadable archives. Long-running workflows expose progress and should support cancellation, recovery and safe retry behaviour.

### Code and Tool Runtime

Render previews, run supported code, process generated files and expose tool results inside the host AI interface. Execution must remain isolated, bounded and visible to the user.

### Office Document Generation

Generate:

- Word documents with DOCX
- Spreadsheets with XLSX
- Presentations with PPTX
- Downloadable source files and project archives

### Voice and Accessibility

The extension includes speech-to-text, text-to-speech and configurable language support. UI changes should preserve keyboard access, focus management and screen-reader compatibility.

### Multi-Platform Support

The project contains shared and platform-specific layers for Chrome, Firefox and Android. Shared code must not assume Chrome-only APIs without a compatibility adapter.

## Architecture

```text
AI-Coding-Studio/
├── src/
│   ├── android/       # Android-facing JavaScript integration
│   ├── background/    # Manifest V3 service worker and privileged operations
│   ├── content/       # Host-page integration and primary application runtime
│   ├── core/          # Module contracts, manager and bootstrap logic
│   ├── injected/      # Code executed in the host page's main JavaScript world
│   ├── lib/           # Shared utilities
│   ├── locales/       # Translation resources
│   ├── modules/       # Modular application capabilities
│   ├── platform/      # Browser and Android compatibility layers
│   ├── sandbox/       # Isolated execution and document generation
│   └── styles/        # Shared styling
├── static/            # Manifest, sandbox page and static extension assets
├── extension/         # Product images and extension resources
├── android/           # Native Android wrapper and Gradle project
├── scripts/           # Build, validation and maintenance scripts
├── tests/             # Unit, integration and end-to-end tests
├── docs/              # Developer and system documentation
├── build.js           # Multi-target Vite build configuration
└── package.json       # Scripts and dependencies
```

## Core Runtime

Important entry points include:

```text
src/core/ModuleInterface.js
src/core/ModuleManager.js
src/core/bootstrap.js
src/core/bootstrap-enhanced.js
src/background/
src/content/index.js
src/content/bridge.js
src/content/state.js
src/content/storage.js
src/injected/
src/sandbox/
```

Before changing a feature, trace:

1. Module registration and initialization order.
2. Dependencies and event subscriptions.
3. State and storage ownership.
4. Content, background, injected and sandbox boundaries.
5. Platform-specific adapters.
6. Build inclusion and feature flags.
7. Existing tests and documentation.

Do not treat a file as dead code until dynamic registration, runtime discovery, event subscriptions and build transforms have been checked.

## Installation for Development

### Prerequisites

- Node.js 18 or later
- npm
- A current Chrome or Chromium browser

### Clone and Install

```bash
git clone https://github.com/Masterleeaus/AI-Coding-Studio.git
cd AI-Coding-Studio
npm install
```

### Build

```bash
npm run build
```

Target-specific scripts may also be available:

```bash
npm run build:chrome
npm run build:firefox
npm run build:android
```

Check `package.json` for the authoritative script list before running commands.

### Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the generated Chrome build directory.
5. Reload the extension after rebuilding.

### Firefox

Build the Firefox target, then load the generated manifest or packaged extension through `about:debugging`.

### Android

The Android project is stored under `android/`. Build the JavaScript Android target before assembling the Gradle application. Local SDK paths belong in `android/local.properties` and must not be committed.

## Testing and Validation

Run the smallest relevant test set while developing, followed by broader verification before completion.

Common project commands include:

```bash
npm run check-locales
npm run test:unit
npm run test:e2e
npm run test:e2e:firefox
npm run build:chrome
npm run build:firefox
npm run build:android
npm run android:test
```

Use the scripts actually defined in `package.json`. Do not claim a change is complete when required tests were not run; record the exact limitation instead.

Minimum validation for extension changes:

- Production build succeeds
- Manifest remains valid
- Extension loads without startup errors
- Background and content messaging works
- Injected-page communication is validated
- Sandbox messaging is validated
- Storage survives reload and service-worker restart
- Supported host platforms fail gracefully when their DOM changes
- No new console errors or unhandled promise rejections appear

## Security Principles

Treat host pages, imported repositories, webpages, model output and generated code as untrusted input.

Review all changes for:

- Cross-site scripting and unsafe HTML rendering
- Arbitrary code execution
- `eval()` and `new Function()` usage
- Content Security Policy compatibility
- Missing message source or origin validation
- Extension message spoofing
- Exposed web-accessible resources
- Path traversal and malicious archives
- Secret or token leakage
- Unsafe remote configuration
- Prompt injection from imported content
- Overbroad permissions and host access

Do not weaken CSP or add broad permissions without a documented technical reason.

## Performance Principles

Pay particular attention to:

- Bundle size
- Initial injection time
- MutationObserver lifecycle
- Duplicate timers and polling
- Service-worker wakeups
- Large conversation processing
- File and repository ingestion
- Memory growth
- Svelte component mounting and cleanup
- Document-generation memory usage

Prefer event-driven behaviour. Disconnect observers and clear timers when features are disposed.

## Engineering Agent Instructions

This section defines how coding agents must work in this repository.

### Repository Authority

The authoritative repository is:

`https://github.com/Masterleeaus/AI-Coding-Studio`

Use the GitHub plugin as the primary repository interface.

The repository is the single source of truth. Search and read the implementation before modifying it. Do not create a parallel application or duplicate existing systems.

Do not create a `.titan` directory for this project.

Use the existing repository documentation structure, including `README.md`, `docs/`, testing guides and architecture files.

### Required Agent Workflow

For every task:

1. Inspect the relevant repository files.
2. Trace the complete runtime path.
3. Identify dependencies and platform boundaries.
4. Classify confirmed defects separately from risks and improvement ideas.
5. Create a focused implementation plan for broad changes.
6. Make the smallest coherent fix that preserves architecture.
7. Add or update tests.
8. Run relevant builds and tests.
9. Review the resulting diff for regressions.
10. Report evidence, changed files, tests and remaining risks.

### Plugins and Tools

#### GitHub

Use for repository inspection, branches, commits, issues, pull requests and reviews.

#### Superpowers

Use for systematic debugging, implementation planning, test-driven development, verification and high-risk refactoring.

#### CodeRabbit

Use after meaningful code changes to review defects, security, architecture, maintainability and missing tests.

#### Build Web Apps

Use only for substantial UI or responsive-layout work. Adapt output to the existing Svelte architecture; never regenerate the whole application.

#### Tavily AI

Use only when current external technical research is required. Prefer official Chrome, Mozilla, Svelte, Vite and Web API documentation.

#### MiniUp

Use only when a preview, demo or distributable test artefact needs to be published. It does not replace GitHub.

Do not use Build MCP Apps or Hugging Face as part of this repository workflow.

### Audit Priorities

Prioritise issues in this order:

1. Extension-breaking defects
2. Security defects
3. Data-loss risks
4. Messaging and execution-boundary defects
5. Manifest V3 service-worker lifecycle defects
6. Host-platform compatibility defects
7. Broken or disconnected modules
8. Failing tests and builds
9. Performance problems
10. Maintainability improvements

### Finding Classification

Every audit finding should be classified as one of:

- Confirmed defect
- Probable defect
- Security risk
- Architectural risk
- Performance risk
- Compatibility risk
- Dead or unreachable code
- Incomplete implementation
- Documentation drift
- Test gap

Include the affected file, evidence, impact, likely cause, recommended fix, regression risk and required test.

### Git Workflow

For significant changes:

- Create a focused branch.
- Keep commits cohesive.
- Do not mix unrelated fixes.
- Open a draft pull request.
- Do not merge into `main` unless explicitly instructed.

Suggested branch formats:

```text
audit/extension-runtime
fix/background-message-validation
fix/platform-dom-adapters
refactor/module-lifecycle
test/sandbox-runtime
```

### Prohibited Changes

Do not:

- Create `.titan`
- Replace Svelte with another framework
- Remove Firefox or Android support without explicit instruction
- Remove apparently unused modules without tracing runtime registration
- Weaken CSP for convenience
- Add broad permissions without justification
- Bypass tests
- Create temporary integration or source-copy folders
- Add duplicate implementations
- Silently delete user features or stored data
- Commit secrets, access tokens or local SDK paths

### End-of-Pass Report

Every engineering pass should report:

- Repository and branch
- Files inspected
- Confirmed findings
- Files changed
- Tests added or updated
- Commands run
- Tests passing and failing
- Security or compatibility risks
- Remaining work
- Recommended next pass
- Suggested pull-request title and description

Do not state that the extension is production-ready unless all relevant builds and tests pass and no unresolved critical defect remains.

## Contributing

Keep changes focused, tested and compatible with the existing architecture. Open an issue or draft pull request for large refactors before replacing core runtime behaviour.

## License

See [LICENSE](LICENSE) for the repository's licence terms.
