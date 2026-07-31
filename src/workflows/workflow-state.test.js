import { describe, expect, it } from "vitest";
import {
  WORKFLOW_STATES,
  WORKFLOW_TYPES,
  createWorkflowRecord,
  transitionWorkflow,
} from "./workflow-state.js";

describe("workflow state", () => {
  it("creates a complete draft record without mutating input", () => {
    const input = {
      id: "workflow-1",
      repository: "Masterleeaus/AI-Coding-Studio",
      branch: "agent-3/workflows-tests-integration",
      type: WORKFLOW_TYPES.DEEP_AUDIT,
    };

    const record = createWorkflowRecord(input, 1000);

    expect(record).toEqual({
      ...input,
      state: WORKFLOW_STATES.DRAFT,
      currentPhase: null,
      currentPass: 1,
      completedSteps: [],
      activeStep: null,
      approvals: [],
      changedFiles: [],
      findings: [],
      testRuns: [],
      errors: [],
      createdAt: 1000,
      updatedAt: 1000,
    });
    expect(input).not.toHaveProperty("state");
  });

  it("rejects unsupported workflow types", () => {
    expect(() => createWorkflowRecord({
      id: "workflow-1",
      repository: "Masterleeaus/AI-Coding-Studio",
      branch: "agent-3/workflows-tests-integration",
      type: "ARBITRARY",
    })).toThrow(/Unsupported workflow type/);
  });

  it("moves through an allowed transition without mutating the prior record", () => {
    const draft = createWorkflowRecord({
      id: "workflow-1",
      repository: "Masterleeaus/AI-Coding-Studio",
      branch: "agent-3/workflows-tests-integration",
      type: WORKFLOW_TYPES.BUG_FIX,
    }, 1000);

    const planning = transitionWorkflow(draft, WORKFLOW_STATES.PLANNING, {
      currentPhase: "trace-defect",
      activeStep: "inspect-runtime",
      now: 2000,
    });

    expect(planning.state).toBe(WORKFLOW_STATES.PLANNING);
    expect(planning.currentPhase).toBe("trace-defect");
    expect(planning.activeStep).toBe("inspect-runtime");
    expect(planning.updatedAt).toBe(2000);
    expect(draft.state).toBe(WORKFLOW_STATES.DRAFT);
    expect(draft.updatedAt).toBe(1000);
  });

  it("rejects invalid and terminal transitions", () => {
    const draft = createWorkflowRecord({
      id: "workflow-1",
      repository: "Masterleeaus/AI-Coding-Studio",
      branch: "agent-3/workflows-tests-integration",
      type: WORKFLOW_TYPES.TEST_EXECUTION,
    });

    expect(() => transitionWorkflow(draft, WORKFLOW_STATES.COMPLETED))
      .toThrow(/Invalid workflow transition/);

    const cancelled = transitionWorkflow(draft, WORKFLOW_STATES.CANCELLED);
    expect(() => transitionWorkflow(cancelled, WORKFLOW_STATES.PLANNING))
      .toThrow(/terminal state/);
  });
});
