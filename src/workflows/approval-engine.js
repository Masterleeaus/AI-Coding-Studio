export const RISK_LEVELS = Object.freeze({
  READ: "READ",
  SAFE_EXECUTION: "SAFE_EXECUTION",
  WRITE: "WRITE",
  DESTRUCTIVE: "DESTRUCTIVE",
  PUBLISH: "PUBLISH",
});

export const APPROVAL_DECISIONS = Object.freeze({
  AUTO_APPROVED: "AUTO_APPROVED",
  APPROVED: "APPROVED",
  REQUIRES_APPROVAL: "REQUIRES_APPROVAL",
  DENIED: "DENIED",
});

const RISK_VALUES = new Set(Object.values(RISK_LEVELS));

function normalizeOptionalTarget(target) {
  if (target === undefined || target === null || target === "") return null;
  return String(target);
}

function exactApprovalMatch(approval, request) {
  return Boolean(
    approval &&
    approval.status === "GRANTED" &&
    approval.consumedAt == null &&
    approval.risk === request.risk &&
    approval.repository === request.repository &&
    approval.operation === request.operation &&
    normalizeOptionalTarget(approval.target) === normalizeOptionalTarget(request.target),
  );
}

export function createApprovalRecord({
  id,
  repository,
  operation,
  target = null,
  risk,
  grantedAt = Date.now(),
}) {
  if (!RISK_VALUES.has(risk)) {
    throw new TypeError(`Unsupported approval risk: ${String(risk)}`);
  }

  const record = {
    id: String(id || "").trim(),
    repository: String(repository || "").trim(),
    operation: String(operation || "").trim(),
    target: normalizeOptionalTarget(target),
    risk,
    status: "GRANTED",
    scope: "ONE_SHOT",
    grantedAt: Number(grantedAt),
    consumedAt: null,
  };

  if (!record.id || !record.repository || !record.operation) {
    throw new TypeError("Approval id, repository and operation are required");
  }
  if (!Number.isFinite(record.grantedAt)) {
    throw new TypeError("grantedAt must be a finite timestamp");
  }

  return record;
}

export function evaluateApproval({
  risk,
  repository,
  operation,
  target = null,
  repositoryApproved = false,
  commandAllowlisted = false,
  approvals = [],
}) {
  if (!RISK_VALUES.has(risk)) {
    return {
      decision: APPROVAL_DECISIONS.DENIED,
      approvalId: null,
      reason: `Unknown risk level: ${String(risk)}`,
    };
  }

  const normalizedRequest = {
    risk,
    repository: String(repository || "").trim(),
    operation: String(operation || "").trim(),
    target: normalizeOptionalTarget(target),
  };

  if (!normalizedRequest.repository || !normalizedRequest.operation) {
    return {
      decision: APPROVAL_DECISIONS.DENIED,
      approvalId: null,
      reason: "Repository and operation are required",
    };
  }

  const approval = Array.isArray(approvals)
    ? approvals.find((entry) => exactApprovalMatch(entry, normalizedRequest))
    : null;

  if (approval) {
    return {
      decision: APPROVAL_DECISIONS.APPROVED,
      approvalId: approval.id,
      reason: "Exact one-shot approval granted",
    };
  }

  if (risk === RISK_LEVELS.READ && repositoryApproved) {
    return {
      decision: APPROVAL_DECISIONS.AUTO_APPROVED,
      approvalId: null,
      reason: "Read operation inside approved repository",
    };
  }

  if (
    risk === RISK_LEVELS.SAFE_EXECUTION &&
    repositoryApproved &&
    commandAllowlisted
  ) {
    return {
      decision: APPROVAL_DECISIONS.AUTO_APPROVED,
      approvalId: null,
      reason: "Allowlisted bounded command inside approved repository",
    };
  }

  return {
    decision: APPROVAL_DECISIONS.REQUIRES_APPROVAL,
    approvalId: null,
    reason: `${risk} operations require explicit approval`,
  };
}
