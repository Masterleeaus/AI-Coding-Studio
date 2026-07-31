import { describe, expect, it } from "vitest";
import {
  APPROVAL_DECISIONS,
  RISK_LEVELS,
  createApprovalRecord,
  evaluateApproval,
} from "./approval-engine.js";

const repository = "Masterleeaus/AI-Coding-Studio";

describe("approval engine", () => {
  it("auto-approves reads only inside an approved repository", () => {
    expect(evaluateApproval({
      risk: RISK_LEVELS.READ,
      repository,
      repositoryApproved: true,
      operation: "files.read",
    }).decision).toBe(APPROVAL_DECISIONS.AUTO_APPROVED);

    expect(evaluateApproval({
      risk: RISK_LEVELS.READ,
      repository,
      repositoryApproved: false,
      operation: "files.read",
    }).decision).toBe(APPROVAL_DECISIONS.REQUIRES_APPROVAL);
  });

  it("auto-approves safe execution only when the command is allowlisted", () => {
    expect(evaluateApproval({
      risk: RISK_LEVELS.SAFE_EXECUTION,
      repository,
      repositoryApproved: true,
      commandAllowlisted: true,
      operation: "tests.run",
    }).decision).toBe(APPROVAL_DECISIONS.AUTO_APPROVED);

    expect(evaluateApproval({
      risk: RISK_LEVELS.SAFE_EXECUTION,
      repository,
      repositoryApproved: true,
      commandAllowlisted: false,
      operation: "tests.run",
    }).decision).toBe(APPROVAL_DECISIONS.REQUIRES_APPROVAL);
  });

  it("requires an exact one-shot approval for writes", () => {
    const approval = createApprovalRecord({
      id: "approval-1",
      repository,
      operation: "files.write",
      target: "src/workflows/workflow-state.js",
      risk: RISK_LEVELS.WRITE,
      grantedAt: 1000,
    });

    const granted = evaluateApproval({
      risk: RISK_LEVELS.WRITE,
      repository,
      operation: "files.write",
      target: "src/workflows/workflow-state.js",
      approvals: [approval],
    });
    expect(granted.decision).toBe(APPROVAL_DECISIONS.APPROVED);
    expect(granted.approvalId).toBe("approval-1");

    const wrongTarget = evaluateApproval({
      risk: RISK_LEVELS.WRITE,
      repository,
      operation: "files.write",
      target: "src/background/index.js",
      approvals: [approval],
    });
    expect(wrongTarget.decision).toBe(APPROVAL_DECISIONS.REQUIRES_APPROVAL);
  });

  it("never auto-approves destructive or publish operations", () => {
    for (const risk of [RISK_LEVELS.DESTRUCTIVE, RISK_LEVELS.PUBLISH]) {
      const result = evaluateApproval({
        risk,
        repository,
        repositoryApproved: true,
        commandAllowlisted: true,
        operation: risk === RISK_LEVELS.PUBLISH ? "release.publish" : "files.delete",
      });
      expect(result.decision).toBe(APPROVAL_DECISIONS.REQUIRES_APPROVAL);
    }
  });

  it("denies unknown risk levels", () => {
    expect(evaluateApproval({
      risk: "ROOT",
      repository,
      operation: "shell.exec",
    }).decision).toBe(APPROVAL_DECISIONS.DENIED);
  });
});
