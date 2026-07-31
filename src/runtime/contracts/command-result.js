const COMMAND_STATUSES = new Set([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'denied',
  'unavailable',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function normalizeError(error, fallbackCode = 'COMMAND_FAILED') {
  if (!error) return null;
  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message || 'Command failed',
      details: null,
    };
  }
  if (typeof error === 'string') {
    return { code: fallbackCode, message: error, details: null };
  }
  return {
    code: String(error.code || fallbackCode),
    message: String(error.message || 'Command failed'),
    details: error.details ?? null,
  };
}

function requireText(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
  return value;
}

export function createCommandResult({
  operationId,
  command,
  status,
  data = null,
  artifacts = [],
  warnings = [],
  error = null,
  startedAt = Date.now(),
  completedAt = status === 'pending' || status === 'running' ? null : Date.now(),
} = {}) {
  requireText(operationId, 'operationId');
  requireText(command, 'command');
  if (!COMMAND_STATUSES.has(status)) {
    throw new TypeError(`Unsupported command status: ${String(status)}`);
  }
  if (!Array.isArray(artifacts)) throw new TypeError('artifacts must be an array');
  if (!Array.isArray(warnings)) throw new TypeError('warnings must be an array');

  const normalizedStartedAt = Number(startedAt);
  const normalizedCompletedAt = completedAt == null ? null : Number(completedAt);
  const durationMs = normalizedCompletedAt == null
    ? null
    : Math.max(0, normalizedCompletedAt - normalizedStartedAt);

  return deepFreeze({
    ok: status === 'completed',
    operationId,
    command,
    status,
    data,
    artifacts: [...artifacts],
    warnings: [...warnings],
    error: normalizeError(error),
    startedAt: normalizedStartedAt,
    completedAt: normalizedCompletedAt,
    durationMs,
  });
}

export function createCommandError({
  operationId,
  command,
  error,
  code = 'COMMAND_FAILED',
  status = 'failed',
  data = null,
  artifacts = [],
  warnings = [],
  startedAt = Date.now(),
  completedAt = Date.now(),
} = {}) {
  return createCommandResult({
    operationId,
    command,
    status,
    data,
    artifacts,
    warnings,
    error: normalizeError(error, code),
    startedAt,
    completedAt,
  });
}

export { COMMAND_STATUSES };
