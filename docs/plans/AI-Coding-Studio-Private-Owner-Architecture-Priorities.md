# AI Coding Studio — Private-Owner Architecture and Revised Priorities

## Decision

AI Coding Studio is a private, single-owner extension for Jason's own development workflow. It is not currently intended to be a public SaaS product, a multi-tenant platform, or a public browser-extension marketplace.

This changes the product architecture and delivery priorities substantially.

The extension should optimize for:

- personal power and convenience;
- local-first operation;
- narrow, owner-controlled credentials;
- direct tool integrations;
- reliable coding workflows;
- explicit approval for destructive actions;
- recoverable long-running work;
- minimal hosted infrastructure.

It should not spend engineering effort on public-product systems that do not serve the owner.

---

## Removed or Deferred Product Requirements

The following are not required for the private-owner architecture:

- multi-user OAuth account flows;
- tenant isolation;
- SaaS account administration;
- public plugin marketplace infrastructure;
- enterprise token delegation;
- app-store-grade onboarding funnels;
- public integration permission dashboards;
- a hosted backend for every integration;
- billing, subscription, or organization management;
- compatibility layers intended only for unknown third-party extension users.

These remain deferred unless the product direction changes.

---

## Security Requirements That Still Apply

Private ownership does **not** make browser trust boundaries safe by default.

The following Pass 1 findings remain high priority because hostile or malformed content may still originate from AI pages, imported repositories, webpages, archives, model output, remote services, or compromised credentials:

- background messages must be validated;
- privileged URL fetching must reject local/private-network and unsafe destinations;
- model and imported HTML must be sanitized before rendering;
- page-context messages must not mutate privileged extension state without authentication;
- sandbox messages need source, nonce, schema, timeout, and output limits;
- archive and folder ingestion needs aggregate size, path, file-count, and secret-file controls;
- credentials must not be exposed to host-page JavaScript;
- destructive filesystem, Git, terminal, publish, and remote-write actions need explicit approval;
- local-companion communication must be mutually authenticated;
- actions must be logged locally so the owner can inspect what occurred.

The threat model changes from "protect many unknown users" to "protect one owner from untrusted content, compromised webpages, accidental automation, leaked tokens, and runaway tools."

---

## Target Architecture

```text
AI Coding Studio
│
├── Agent Workflow Engine
│   ├── Brainstorm
│   ├── Plan
│   ├── Implement
│   ├── Debug
│   ├── Audit
│   ├── Test
│   ├── Review
│   ├── Verify
│   └── Publish
│
├── Direct Tool Adapters
│   ├── GitHub
│   ├── Tavily
│   ├── Google Drive / Docs
│   └── MiniUp
│
├── AI Page Adapters
│   ├── ChatGPT
│   ├── Claude
│   └── DeepSeek
│
├── Local Companion
│   ├── Filesystem
│   ├── Git
│   ├── Terminal
│   ├── npm / package managers
│   ├── Test runners
│   ├── ZIP and diff generation
│   ├── Docker / build tools
│   └── Local databases
│
└── Personal Tool Vault
    ├── API keys
    ├── Access tokens
    ├── OAuth refresh tokens
    ├── Tool settings
    └── Approval policies
```

The browser extension remains the user interface, workflow coordinator, provider integration layer, and approval surface.

The local companion becomes the trusted execution boundary for filesystem, terminal, Git, builds, tests, archives, Docker, and other operating-system capabilities.

---

## Architectural Boundaries

### 1. Agent Workflow Engine

The workflow engine should be native to AI Coding Studio rather than dependent on external ChatGPT plugins.

Each workflow is a state machine with:

- explicit phases;
- persisted progress;
- required inputs;
- approval checkpoints;
- cancellation;
- retry rules;
- evidence and artefact collection;
- completion criteria;
- recovery after reload or service-worker suspension.

Initial workflow modes:

```text
Brainstorm → Plan → Implement → Test → Review → Verify → Publish
                     ↘ Debug ↗
              Audit → Repair Plan
```

The workflow engine must distinguish:

- proposed actions;
- approved actions;
- running actions;
- completed actions;
- failed actions;
- cancelled actions;
- actions requiring owner intervention.

It must never report simulated success as a completed tool operation.

### 2. Direct Tool Adapters

Direct adapters are the primary machine-readable tool interface.

Every adapter must expose a stable internal contract:

```js
{
  id,
  capabilities,
  connect(),
  disconnect(),
  validateConfig(),
  execute(operation, input, context),
  cancel(operationId),
  healthCheck(),
  dispose()
}
```

Adapters return structured results rather than prose-only responses:

```js
{
  ok,
  operationId,
  data,
  artefacts,
  warnings,
  error,
  startedAt,
  completedAt
}
```

### 3. AI Page Adapters

ChatGPT, Claude, and DeepSeek page integrations remain provider adapters, not the core tool API.

They may:

- discover prompt inputs;
- insert structured prompts;
- submit prompts;
- detect generation state;
- read completed responses;
- detect continuation controls;
- monitor confirmation surfaces;
- return response text and metadata to the workflow engine.

They must fail gracefully when provider DOM structures change.

Tool invocation through a ChatGPT webpage is an optional convenience layer. AI Coding Studio must not depend on ChatGPT deciding to invoke a connected plugin, preserving a particular tool name, or returning a stable tool-result format.

### 4. Local Companion

The preferred companion transport is either:

- Chrome Native Messaging; or
- a localhost service bound only to loopback and authenticated with an installation-specific secret.

The companion must:

- accept only authenticated requests;
- enforce a configured workspace allowlist;
- canonicalize paths before access;
- deny traversal outside approved roots;
- use operation-specific schemas;
- stream bounded output;
- support cancellation and timeouts;
- maintain an append-only local action log;
- require owner approval for destructive or privilege-expanding operations;
- never expose its authentication secret to host-page JavaScript.

Example approval classes:

```text
AUTO-APPROVED
- read approved repository files
- run configured read-only diagnostics
- calculate diffs
- run approved test commands

CONFIRM EACH TIME
- modify files
- install dependencies
- create commits
- push branches
- publish artefacts
- access a new repository or directory

HIGH-RISK CONFIRMATION
- delete files
- force push
- modify main/master directly
- run arbitrary shell commands
- Docker privileged operations
- write outside configured workspaces
```

### 5. Personal Tool Vault

Preferred secret location: the local companion using operating-system credential storage where available.

Fallback: an encrypted extension vault using Web Crypto with:

- an owner-provided master password;
- a strong password-derived key;
- AES-GCM authenticated encryption;
- a unique random salt;
- a unique nonce per encrypted record;
- automatic vault locking;
- no plaintext secret logging;
- no secret inclusion in exports, prompts, crash reports, or telemetry.

`chrome.storage.local` may hold ciphertext and non-sensitive metadata only.

The vault must support per-tool records, revocation, replacement, last-used metadata, and export of non-secret configuration separately from secret material.

---

## Integration Decisions

### GitHub

GitHub is the first direct integration.

For private use, a fine-grained personal access token is acceptable when it is restricted to explicitly selected repositories and the minimum required permissions.

Initial repository scope:

```text
Masterleeaus/AI-Coding-Studio
```

Initial capabilities:

- inspect repository metadata and trees;
- read files and commits;
- create branches;
- create or update files on a working branch;
- create cohesive commits;
- open draft pull requests;
- read issues and pull-request comments;
- read workflow status;
- read CodeRabbit review comments.

The adapter must not default to all repositories or direct writes to `main`.

### Tavily

Tavily is the first research adapter after GitHub and local execution are stable.

Use cases:

- current browser-extension documentation;
- API and framework changes;
- error research;
- security guidance;
- official documentation discovery;
- version comparison.

Research results are untrusted context and must never automatically become executable instructions.

### Google Drive and Docs

Google integration is document context and export infrastructure, not a core execution dependency.

Initial capabilities:

- select Drive files or folders;
- import Docs as project context;
- read Sheets used as plans or inventories;
- export audit reports and architecture documents;
- avoid broad Drive access when file-specific access is sufficient.

### CodeRabbit

CodeRabbit integration should operate through GitHub:

```text
push branch
→ open pull request
→ wait for review
→ read GitHub review comments
→ classify findings
→ create repair plan
→ apply owner-approved fixes
→ verify
```

No separate CodeRabbit credential path is required unless GitHub cannot expose a needed capability.

### MiniUp

MiniUp remains a publishing adapter for:

- generated web applications;
- static reports;
- UI previews;
- demos;
- test interfaces;
- distributable artefacts.

It follows GitHub and local-companion stability. It is not a replacement for repository source control.

---

## Revised Delivery Order

### Pass 2 — Trust-Boundary Foundation

Before adding more power:

1. validate privileged background messages;
2. restrict arbitrary URL fetching and remove unsafe network defaults;
3. centralize safe Markdown/HTML rendering;
4. authenticate sandbox messages and add timeouts/cancellation;
5. remove page-accessible privileged mutation APIs;
6. add archive and secret-file ingestion limits;
7. define the approval-policy model used by direct tools and the local companion.

### Pass 3 — Workflow Engine and GitHub Adapter

1. implement persisted workflow state;
2. add Brainstorm, Plan, Implement, Audit, Test, Review, Verify, and Publish modes;
3. implement the personal vault abstraction;
4. implement repository-scoped GitHub credentials;
5. add branch, file, commit, pull-request, issue, review-comment, and workflow operations;
6. require approval before writes, pushes, or publishing;
7. add GitHub adapter tests with mocked API responses.

### Pass 4 — Local Companion

1. select Native Messaging or authenticated localhost transport;
2. implement authenticated handshake and version negotiation;
3. add workspace allowlists and path canonicalization;
4. implement filesystem, Git, terminal, npm, test, diff, and ZIP operations;
5. add cancellation, output limits, and operation logs;
6. add destructive-action approval classes;
7. add end-to-end extension-to-companion tests.

### Pass 5 — Tavily and Provider Orchestration

1. implement Tavily direct API adapter;
2. centralize provider selectors and capability detection;
3. make ChatGPT, Claude, and DeepSeek page adapters resilient and independent;
4. connect page responses to workflow state;
5. support multi-pass continuation without making DOM automation the core tool transport.

### Pass 6 — Google, CodeRabbit Loop, and MiniUp

1. add selected-file Google Drive/Docs access;
2. implement CodeRabbit feedback ingestion through GitHub;
3. convert review findings into selectable repair tasks;
4. add MiniUp publishing with explicit artefact selection;
5. verify exported and published artefacts.

### Later Passes

- Android companion integration;
- voice control;
- advanced workflow scheduling;
- reusable personal skills;
- local semantic search across approved workspaces;
- optional remote access with a separate, explicit threat model.

---

## Changes to Pass 1 Recommendations

### Deprioritized

- public onboarding architecture;
- tenant and organization models;
- public integration marketplace;
- multi-user credential delegation;
- generalized permission dashboards for unknown users;
- hosted orchestration services;
- public-store compliance work that does not affect private installation reliability.

### Elevated

- built-in workflow state machines;
- direct GitHub integration;
- personal vault abstraction;
- local companion architecture;
- local filesystem, Git, terminal, build, test, diff, and ZIP operations;
- recovery of long-running personal workflows;
- convenient but optional AI-page orchestration;
- CodeRabbit feedback through GitHub;
- owner-controlled publishing through MiniUp.

### Unchanged

- background message validation;
- safe rendering;
- sandbox isolation;
- page/extension context authentication;
- secret protection;
- path and archive safety;
- cancellation and timeouts;
- no simulated tool success;
- no unapproved destructive actions;
- no direct commits to `main` by default.

---

## Acceptance Criteria for the Private-Owner Foundation

The architecture is ready for implementation when:

- the workflow engine has a versioned persisted state model;
- tool adapters share one structured operation contract;
- secrets are held behind a vault abstraction;
- GitHub access can be limited to selected repositories;
- every write operation has an approval policy;
- the local companion has an authenticated protocol and workspace allowlist;
- provider-page automation is optional and replaceable;
- long operations survive extension worker suspension or page reload;
- logs distinguish proposed, approved, executed, failed, cancelled, and simulated operations;
- no module can report success without evidence from the underlying tool.

---

## Immediate Recommendation

Continue with the critical trust-boundary fixes first, because the private architecture will add more powerful credentials and local execution capabilities.

Then build the workflow engine and GitHub adapter before attempting broad module migration. The local companion should be the next major subsystem after GitHub, because it supplies the real filesystem, terminal, build, test, diff, and ZIP capabilities that a browser extension cannot safely provide alone.
