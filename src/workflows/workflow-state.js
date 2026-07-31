export const WORKFLOW_STATES = Object.freeze({
  DRAFT: "DRAFT",
  PLANNING: "PLANNING",
  AWAITING_APPROVAL: "AWAITING_APPROVAL",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  BLOCKED: "BLOCKED",
  VERIFYING: "VERIFYING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

export const WORKFLOW_TYPES = Object.freeze({
  REPOSITORY_ONBOARDING: "REPOSITORY_ONBOARDING",
  DEEP_AUDIT: "DEEP_AUDIT",
  BUG_FIX: "BUG_FIX",
  ARCHITECTURE_REPAIR: "ARCHITECTURE_REPAIR",
  TEST_EXECUTION: "TEST_EXECUTION",
  CODE_REVIEW: "CODE_REVIEW",
  VERIFICATION: "VERIFICATION",
  RELEASE_PREPARATION: "RELEASE_PREPARATION",
});

const TERMINAL_STATES = new Set([
  WORKFLOW_STATES.COMPLETED,
  WORKFLOW_STATES.CANCELLED,
]);

const TRANSITIONS = Object.freeze({
  [WORKFLOW_STATES.DRAFT]: new Set([
    WORKFLOW_STATES.PLANNING,
    WORKFLOW_STATES.CANCELLED,
  ]),
  [WORKFLOW_STATES.PLANNING]: new Set([
    WORKFLOW_STATES.AWAITING_APPROVAL,
    WORKFLOW_STATES.RUNNING,
    WORKFLOW_STATES.BLOCKED,
    WORKFLOW_STATES.CANCELLED,
  ]),
  [WORKFLOW_STATES.AWAITING_APPROVAL]: new Set([
    WORKFLOW_STATES.RUNNING,
    WORKFLOW_STATES.BLOCKED,
    WORKFLOW_STATES.CANCELLED,
  ]),
  [WORKFLOW_STATES.RUNNING]: new Set([
    WORKFLOW_STATES.PAUSED,
    WORKFLOW_STATES.BLOCKED,
    WORKFLOW_STATES.VERIFYING,
    WORKFLOW_STATES.FAILED,
    WORKFLOW_STATES.CANCELLED,
  ]),
  [WORKFLOW_STATES.PAUSED]: new Set([
    WORKFLOW_STATES.RUNNING,
    WORKFLOW_STATES.BLOCKED,
    WORKFLOW_STATES.CANCELLED,
  ]),
  [WORKFLOW_STATES.BLOCKED]: new Set([
    WORKFLOW_STATES.PLANNING,
    WORKFLOW_STATES.AWAITING_APPROVAL,
    WORKFLOW_STATES.RUNNING,
    WORKFLOW_STATES.FAILED,
    WORKFLOW_STATES.CANCELLED,
  ]),
  [WORKFLOW_STATES.VERIFYING]: new Set([
    WORKFLOW_STATES.COMPLETED,
    WORKFLOW_STATES.FAILED,
    WORKFLOW_STATES.BLOCKED,
  ]),
  [WORKFLOW_STATES.FAILED]: new Set([
    WORKFLOW_STATES.PLANNING,
    WORKFLOW_STATES.CANCELLED,
  ]),
  [WORKFLOW_STATES.COMPLETED]: new Set(),
  [WORKFLOW_STATES.CANCELLED]: new Set(),
});

const WORKFLOW_TYPE_VALUES = new Set(Object.values(WORKFLOW_TYPES));
const WORKFLOW_STATE_VALUES = new Set(Object.values(WORKFLOW_STATES));

function requireNonEmptyString(value, label) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${label} is required`);
  return normalized;
}

function copyArray(value) {
  return Array.isArray(value) ? value.slice() : [];
}

export function createWorkflowRecord(input, now = Date.now()) {
  const type = input?.type;
  if (!WORKFLOW_TYPE_VALUES.has(type)) {
    throw new TypeError(`Unsupported workflow type: ${String(type)}`);
  }

  const timestamp = Number(now);
  if (!Number.isFinite(timestamp)) throw new TypeError("now must be a finite timestamp");

  return {
    id: requireNonEmptyString(input?.id, "workflow id"),
    repository: requireNonEmptyString(input?.repository, "repository"),
    branch: requireNonEmptyString(input?.branch, "branch"),
    type,
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
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function transitionWorkflow(record, nextState, context = {}) {
  if (!record || typeof record !== "object") {
    throw new TypeError("workflow record is required");
  }
  if (!WORKFLOW_STATE_VALUES.has(nextState)) {
    throw new TypeError(`Unsupported workflow state: ${String(nextState)}`);
  }
  if (TERMINAL_STATES.has(record.state)) {
    throw new Error(`Cannot transition workflow from terminal state ${record.state}`);
  }
  if (!TRANSITIONS[record.state]?.has(nextState)) {
    throw new Error(`Invalid workflow transition: ${record.state} -> ${nextState}`);
  }

  const timestamp = context.now === undefined ? Date.now() : Number(context.now);
  if (!Number.isFinite(timestamp)) throw new TypeError("now must be a finite timestamp");

  return {
    ...record,
    state: nextState,
    currentPhase: context.currentPhase === undefined
      ? record.currentPhase
      : context.currentPhase,
    currentPass: context.currentPass === undefined
      ? record.currentPass
      : Number(context.currentPass),
    completedSteps: context.completedSteps === undefined
      ? copyArray(record.completedSteps)
      : copyArray(context.completedSteps),
    activeStep: context.activeStep === undefined
      ? record.activeStep
      : context.activeStep,
    approvals: context.approvals === undefined
      ? copyArray(record.approvals)
      : copyArray(context.approvals),
    changedFiles: context.changedFiles === undefined
      ? copyArray(record.changedFiles)
      : copyArray(context.changedFiles),
    findings: context.findings === undefined
      ? copyArray(record.findings)
      : copyArray(context.findings),
    testRuns: context.testRuns === undefined
      ? copyArray(record.testRuns)
      : copyArray(context.testRuns),
    errors: context.errors === undefined
      ? copyArray(record.errors)
      : copyArray(context.errors),
    updatedAt: timestamp,
  };
}
