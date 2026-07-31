import { describe, expect, it } from "vitest";
import {
  OPERATION_STATUSES,
  createOperationRequest,
  createOperationResult,
  validateOperationRequest,
} from "./message-contracts.js";

describe("shared operation message contracts", () => {
  it("creates a structured request without accepting a shell string", () => {
    const request = createOperationRequest({
      id: "operation-1",
      workflowId: "workflow-1",
      command: "tests.run",
      repository: "Masterleeaus/AI-Coding-Studio",
      payload: { suite: "unit" },
      risk: "SAFE_EXECUTION",
      createdAt: 1000,
    });

    expect(request).toEqual({
      version: 1,
      kind: "workflow.operation.request",
      id: "operation-1",
      workflowId: "workflow-1",
      command: "tests.run",
      repository: "Masterleeaus/AI-Coding-Studio",
      payload: { suite: "unit" },
      risk: "SAFE_EXECUTION",
      approvalId: null,
      createdAt: 1000,
    });
    expect(request).not.toHaveProperty("shell");
  });

  it("rejects arbitrary command strings and unexpected fields", () => {
    expect(validateOperationRequest({
      version: 1,
      kind: "workflow.operation.request",
      id: "operation-1",
      workflowId: "workflow-1",
      command: "rm -rf /",
      repository: "Masterleeaus/AI-Coding-Studio",
      payload: {},
      risk: "DESTRUCTIVE",
      approvalId: null,
      createdAt: 1000,
    }).ok).toBe(false);

    expect(validateOperationRequest({
      version: 1,
      kind: "workflow.operation.request",
      id: "operation-1",
      workflowId: "workflow-1",
      command: "files.read",
      repository: "Masterleeaus/AI-Coding-Studio",
      payload: {},
      risk: "READ",
      approvalId: null,
      createdAt: 1000,
      commandLine: "cat /etc/passwd",
    }).ok).toBe(false);
  });

  it("returns structured operation results", () => {
    expect(createOperationResult({
      id: "operation-1",
      workflowId: "workflow-1",
      status: OPERATION_STATUSES.COMPLETED,
      data: { files: 3 },
      artefacts: ["report.json"],
      warnings: [],
      startedAt: 1000,
      completedAt: 1200,
    })).toEqual({
      version: 1,
      kind: "workflow.operation.result",
      id: "operation-1",
      workflowId: "workflow-1",
      status: OPERATION_STATUSES.COMPLETED,
      data: { files: 3 },
      artefacts: ["report.json"],
      warnings: [],
      error: null,
      startedAt: 1000,
      completedAt: 1200,
    });
  });
});
