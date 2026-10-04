import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { RepositoryRuntime } from "../src/runtime/repository/RepositoryRuntime.js";
import {
  APPROVAL_DECISIONS,
  RISK_LEVELS,
  consumeApproval,
  createApprovalRecord,
  evaluateApproval,
} from "../src/workflows/approval-engine.js";
import {
  WORKFLOW_STATES,
  WORKFLOW_TYPES,
  createWorkflowRecord,
  transitionWorkflow,
} from "../src/workflows/workflow-state.js";

const FIXTURE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "recruiter-repository",
);
const REPOSITORY_ID = "fixture-repository";
const TARGET = "src/index.js";

describe("recruiter browser-first fixture", () => {
  it("demonstrates repository analysis, approval, and verification without a provider", async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(FIXTURE_ROOT, "package.json"), "utf8"),
    );
    const source = await readFile(path.join(FIXTURE_ROOT, TARGET), "utf8");
    expect(packageJson).toMatchObject({
      name: "ai-coding-studio-recruiter-fixture",
      private: true,
      scripts: { verify: "node --test" },
    });
    expect(source).toContain("summarizeRepository");

    const calls = [];
    const bridge = {
      async execute(command, input, options) {
        calls.push({ command, input, options });
        if (command === "repo.metadata") {
          return {
            ok: true,
            status: "completed",
            data: {
              repository: input.repository,
              packageName: packageJson.name,
              verification: packageJson.scripts.verify,
              files: ["package.json", TARGET],
            },
          };
        }
        if (command === "patch.apply") {
          return {
            ok: true,
            status: "completed",
            data: { changedFiles: [input.patch.path], applied: false },
          };
        }
        if (command === "test.run") {
          return {
            ok: true,
            status: "completed",
            data: { command: input.command, exitCode: 0, passed: true },
          };
        }
        throw new Error("Unexpected demo command: " + command);
      },
    };

    const repository = new RepositoryRuntime({ bridge });
    const metadata = await repository.metadata(REPOSITORY_ID, {
      source: "fixture",
    });
    expect(metadata.data).toMatchObject({
      repository: REPOSITORY_ID,
      packageName: packageJson.name,
      verification: "node --test",
    });

    let workflow = createWorkflowRecord({
      id: "recruiter-demo-workflow",
      repository: REPOSITORY_ID,
      branch: "fixture-main",
      type: WORKFLOW_TYPES.BUG_FIX,
    }, 1000);
    workflow = transitionWorkflow(workflow, WORKFLOW_STATES.PLANNING, {
      currentPhase: "repository-analysis",
      now: 1100,
    });

    const request = {
      risk: RISK_LEVELS.WRITE,
      repository: REPOSITORY_ID,
      operation: "patch.apply",
      target: TARGET,
    };
    expect(evaluateApproval({ ...request, repositoryApproved: true }).decision)
      .toBe(APPROVAL_DECISIONS.REQUIRES_APPROVAL);

    const approval = createApprovalRecord({
      id: "approval-fixture-1",
      repository: REPOSITORY_ID,
      operation: request.operation,
      target: TARGET,
      risk: RISK_LEVELS.WRITE,
      grantedAt: 1200,
    });
    workflow = transitionWorkflow(workflow, WORKFLOW_STATES.AWAITING_APPROVAL, {
      approvals: [approval],
      currentPhase: "approved-operation",
      now: 1200,
    });
    expect(evaluateApproval({ ...request, approvals: [approval] })).toMatchObject({
      decision: APPROVAL_DECISIONS.APPROVED,
      approvalId: "approval-fixture-1",
    });

    const consumedApproval = consumeApproval(approval, 1300);
    const applied = await repository.applyPatch(
      REPOSITORY_ID,
      { path: TARGET, operation: "replace", content: "fixture change" },
      { approvalId: consumedApproval.id },
    );
    expect(applied.data).toEqual({
      changedFiles: [TARGET],
      applied: false,
    });
    workflow = transitionWorkflow(workflow, WORKFLOW_STATES.RUNNING, {
      approvals: [consumedApproval],
      currentPhase: "approved-operation",
      now: 1300,
    });
    workflow = transitionWorkflow(workflow, WORKFLOW_STATES.VERIFYING, {
      changedFiles: [TARGET],
      currentPhase: "verification",
      now: 1400,
    });

    const verification = await repository.runTests(
      REPOSITORY_ID,
      { command: packageJson.scripts.verify },
      { source: "fixture" },
    );
    expect(verification.data).toEqual({
      command: "node --test",
      exitCode: 0,
      passed: true,
    });
    workflow = transitionWorkflow(workflow, WORKFLOW_STATES.COMPLETED, {
      testRuns: [verification.data],
      now: 1500,
    });

    expect(workflow.state).toBe(WORKFLOW_STATES.COMPLETED);
    expect(workflow.changedFiles).toEqual([TARGET]);
    expect(calls.map(({ command }) => command)).toEqual([
      "repo.metadata",
      "patch.apply",
      "test.run",
    ]);

    const modelEvidence = {
      provider: "fixture-stub",
      modelCalled: false,
      credentialsUsed: false,
      note: "This contract demo exercises local authority only; provider behavior requires a separate browser-session smoke run.",
    };
    expect(modelEvidence).toMatchObject({
      provider: "fixture-stub",
      modelCalled: false,
      credentialsUsed: false,
    });
  });
});
