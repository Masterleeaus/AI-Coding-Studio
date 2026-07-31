import { RISK_LEVELS } from "./approval-engine.js";

export const OPERATION_STATUSES = Object.freeze({
  PENDING: "PENDING",
  AWAITING_APPROVAL: "AWAITING_APPROVAL",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

const REQUEST_KIND = "workflow.operation.request";
const RESULT_KIND = "workflow.operation.result";
const CONTRACT_VERSION = 1;
const REQUEST_KEYS = new Set([
  "version",
  "kind",
  "id",
  "workflowId",
  "command",
  "repository",
  "payload",
  "risk",
  "approvalId",
  "createdAt",
]);
const RISK_VALUES = new Set(Object.values(RISK_LEVELS));
const STATUS_VALUES = new Set(Object.values(OPERATION_STATUSES));
const COMMAND_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/;
const MAX_PAYLOAD_BYTES = 1024 * 1024;

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function payloadSize(value) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function validateOperationRequest(value) {
  if (!isPlainObject(value)) {
    return { ok: false, error: "Operation request must be a plain object" };
  }

  for (const key of Object.keys(value)) {
    if (!REQUEST_KEYS.has(key)) {
      return { ok: false, error: `Unexpected operation request field: ${key}` };
    }
  }

  if (value.version !== CONTRACT_VERSION || value.kind !== REQUEST_KIND) {
    return { ok: false, error: "Unsupported operation request contract" };
  }
  if (!nonEmptyString(value.id) || !nonEmptyString(value.workflowId)) {
    return { ok: false, error: "Operation and workflow ids are required" };
  }
  if (!nonEmptyString(value.repository)) {
    return { ok: false, error: "Repository is required" };
  }
  if (!COMMAND_PATTERN.test(value.command || "")) {
    return { ok: false, error: "Command must be a structured dotted identifier" };
  }
  if (!RISK_VALUES.has(value.risk)) {
    return { ok: false, error: "Unsupported operation risk" };
  }
  if (!isPlainObject(value.payload)) {
    return { ok: false, error: "Operation payload must be a plain object" };
  }
  if (payloadSize(value.payload) > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: "Operation payload exceeds the size limit" };
  }
  if (value.approvalId !== null && !nonEmptyString(value.approvalId)) {
    return { ok: false, error: "approvalId must be null or a non-empty string" };
  }
  if (!Number.isFinite(value.createdAt)) {
    return { ok: false, error: "createdAt must be a finite timestamp" };
  }

  return { ok: true, value };
}

export function createOperationRequest({
  id,
  workflowId,
  command,
  repository,
  payload = {},
  risk,
  approvalId = null,
  createdAt = Date.now(),
}) {
  const request = {
    version: CONTRACT_VERSION,
    kind: REQUEST_KIND,
    id,
    workflowId,
    command,
    repository,
    payload,
    risk,
    approvalId,
    createdAt: Number(createdAt),
  };

  const validation = validateOperationRequest(request);
  if (!validation.ok) throw new TypeError(validation.error);
  return request;
}

export function createOperationResult({
  id,
  workflowId,
  status,
  data = null,
  artefacts = [],
  warnings = [],
  error = null,
  startedAt,
  completedAt = null,
}) {
  if (!nonEmptyString(id) || !nonEmptyString(workflowId)) {
    throw new TypeError("Operation and workflow ids are required");
  }
  if (!STATUS_VALUES.has(status)) {
    throw new TypeError(`Unsupported operation status: ${String(status)}`);
  }
  if (!Array.isArray(artefacts) || !Array.isArray(warnings)) {
    throw new TypeError("artefacts and warnings must be arrays");
  }
  if (!Number.isFinite(startedAt)) {
    throw new TypeError("startedAt must be a finite timestamp");
  }
  if (completedAt !== null && !Number.isFinite(completedAt)) {
    throw new TypeError("completedAt must be null or a finite timestamp");
  }

  return {
    version: CONTRACT_VERSION,
    kind: RESULT_KIND,
    id,
    workflowId,
    status,
    data,
    artefacts: artefacts.slice(),
    warnings: warnings.slice(),
    error,
    startedAt,
    completedAt,
  };
}
