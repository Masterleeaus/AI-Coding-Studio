# AI Coding Studio — Three-Agent Coordination

## Authoritative repository

- Repository: `Masterleeaus/AI-Coding-Studio`
- Default branch: `main`
- Integration branch: `integration/local-first-repair`
- Coordination issue: `#3 — AI Coding Studio — Three-Agent Local-First Repair`

The GitHub repository is the source of truth. Agents must not create replacement applications, source-copy directories, parallel integration repositories, or a `.titan` directory.

## Branch ownership

| Agent | Role | Branch | Pull-request target |
|---|---|---|---|
| Agent 1 | Extension Runtime and AI Platform | `agent-1/extension-runtime-platforms` | `integration/local-first-repair` |
| Agent 2 | Local Bridge, Repository and CLI Architecture | `agent-2/local-bridge-tooling` | `integration/local-first-repair` |
| Agent 3 | Integration, Testing and Quality | `agent-3/workflows-tests-integration` | `integration/local-first-repair` |

The final integration pull request targets `main` and remains draft until the user decides whether to merge it.

## Shared interfaces

Agent 3 owns the shared workflow-state, approval-policy, message-contract and verification interfaces. Agents 1 and 2 may consume these contracts but should not create competing versions.

### Workflow states

```text
DRAFT
PLANNING
AWAITING_APPROVAL
RUNNING
PAUSED
BLOCKED
VERIFYING
COMPLETED
FAILED
CANCELLED
```

### Workflow record requirements

Every persisted workflow record must preserve:

- repository identifier;
- working branch;
- workflow type;
- current state and phase;
- current pass;
- completed and active steps;
- approvals;
- changed files;
- findings;
- test runs;
- errors;
- creation and update timestamps.

### Approval risk levels

```text
READ
SAFE_EXECUTION
WRITE
DESTRUCTIVE
PUBLISH
```

Default policy:

- `READ`: may be auto-approved inside an explicitly approved repository.
- `SAFE_EXECUTION`: may be auto-approved only for an allowlisted structured command with bounded output and timeout.
- `WRITE`: requires owner approval unless an explicit per-workflow approval covers the exact repository and operation.
- `DESTRUCTIVE`: always requires explicit approval for the specific operation.
- `PUBLISH`: always requires explicit approval for the exact target.

Unrestricted shell strings are not a valid shared command contract.

## Integration rules

1. Agent branches start from `integration/local-first-repair`.
2. Agent PRs target the integration branch, never `main`.
3. Agent 3 reviews patches, CI, compatibility and trust boundaries before integration.
4. A PR is not accepted solely because its agent marks it complete.
5. Critical CodeRabbit findings must be verified and resolved or explicitly rejected with evidence.
6. Chrome and Firefox builds must have real CI evidence before the final integration PR is described as verified.
7. Android verification may remain a separate optional workflow when browser-only changes do not affect Android paths.
8. No agent may commit tokens, API keys, local SDK paths or generated secrets.
9. No agent may add wildcard CORS, remote bridge binding, arbitrary shell execution or unrestricted filesystem access.
10. The final integration PR is not merged automatically.

## Existing prior work

Two draft pull requests predate this coordination model:

- PR #1: architecture/runtime audit targeting `main`.
- PR #2: local-AI-development-OS refactor stacked on PR #1.

They are candidate/reference work only. Their changes must be inspected, decomposed and deliberately incorporated into agent branches or the integration branch. They must not be merged blindly.

## Current baseline — Agent 3 initial inspection

### Confirmed defects and gaps

1. `.github/workflows/import-source.yml` is manually triggerable and applies a frozen external archive through `rsync --delete`. It can overwrite later repository work.
2. No non-destructive GitHub Actions verification workflow exists on `main`.
3. `vitest.config.js` references missing `tests/setup.js`.
4. `src/content/parser/character-parser.test.js` imports missing `tests/helpers/app-state.js`.
5. `TESTING.md` documents Chrome, Firefox and Android test directories that repository search does not currently locate.
6. Existing package and manifest versions are inconsistent (`0.1.11` versus `2.1.0`). Version repair belongs in a later coordinated batch because other agents may already change package metadata.
7. Background, injected and sandbox message boundaries are insufficiently validated. Agent 1 owns those runtime repairs; Agent 3 will provide shared contracts and integration tests.

### Build and test status

At creation of this document, no new three-agent GitHub Actions run has executed. No build or test is therefore claimed as passing.

## Progress reporting

Each agent updates issue #3 after every meaningful pass with:

- branch and PR;
- files changed;
- checks run;
- passing and failing checks;
- blockers;
- CodeRabbit findings;
- integration decisions needed.

Issue comments complement, but do not replace, the corresponding report under `docs/agents/`.
