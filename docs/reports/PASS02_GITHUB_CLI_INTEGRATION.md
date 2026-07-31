# Pass 02 GitHub CLI Integration Report

## Decision

Repository and GitHub operations should be delegated to Git and GitHub CLI through the Local Bridge.

The extension should not implement a second Git client or broad write-capable GitHub REST client.

## Retained Browser Capability

The current GitHub ZIP/commit readers remain temporarily as read-only context ingestion for public or token-authorized repositories.

They are not the future repository-management runtime.

## Planned GitHub CLI Operations

```text
Authentication
- inspect authenticated account and hosts
- report missing or insufficient authentication
- never return stored credentials

Repository
- list and inspect repositories
- clone or fork into an approved workspace
- view repository metadata

Issues and pull requests
- list, view, create and comment
- create draft pull requests from pushed branches
- read checks and review comments

Actions
- list workflows and runs
- trigger workflow_dispatch workflows
- inspect run state and bounded failure logs
- download selected artifacts into an approved workspace

Releases
- list releases
- create a release from an approved tag/commit
- upload explicitly selected verified artifacts
```

## Structured Adapter Mapping

Examples:

```text
repo.clone             -> gh repo clone
github.issue.list      -> gh issue list --json ...
github.pr.create       -> gh pr create with explicit head/base/body
github.pr.checks       -> gh pr checks
github.workflow.list   -> gh workflow list --json ...
github.workflow.run    -> gh workflow run
github.run.list        -> gh run list --json ...
github.run.view        -> gh run view --json ...
github.release.create  -> gh release create
```

The exact command line is built by the companion from validated fields. The extension never supplies an arbitrary string.

## Safety Rules

- repository operations are restricted to approved repository/workspace IDs;
- clone destinations are canonicalized beneath approved roots;
- default branch writes are denied unless separately approved;
- force push is destructive and requires high-risk confirmation;
- pull-request creation requires an already pushed explicit head branch;
- workflow inputs are schema checked and displayed before approval;
- release assets must pass archive verification and hash calculation;
- `gh auth token` output must never be requested or returned;
- results use `--json` where available and are parsed into the common command result.

## CodeRabbit Flow

```text
push branch
→ create draft pull request
→ read review/check state through GitHub CLI or GitHub API
→ import CodeRabbit comments
→ classify actionable findings
→ create repair workflow
→ apply approved fixes
→ rerun tests and checks
```

A separate CodeRabbit credential is not required when review comments are available through the pull request.
