export const BRIDGE_PROTOCOL_VERSION = 1;

export const RISK_LEVELS = Object.freeze({
  READ: 'READ',
  SAFE_EXECUTION: 'SAFE_EXECUTION',
  WRITE: 'WRITE',
  DESTRUCTIVE: 'DESTRUCTIVE',
  PUBLISH: 'PUBLISH',
});

export const COMMANDS = Object.freeze({
  SYSTEM_HEALTH: 'system.health',
  TOOLS_LIST: 'tools.list',
  REPOSITORIES_DISCOVER: 'repositories.discover',
  REPOSITORIES_LIST_GITHUB: 'repositories.listGithub',
  REPOSITORIES_CLONE: 'repositories.clone',
  FILES_LIST: 'files.list',
  FILES_READ: 'files.read',
  FILES_WRITE: 'files.write',
  FILES_HASH: 'files.hash',
  SEARCH_TEXT: 'search.text',
  SEARCH_FILES: 'search.files',
  PATCH_PREVIEW: 'patch.preview',
  PATCH_APPLY: 'patch.apply',
  GIT_STATUS: 'git.status',
  GIT_DIFF: 'git.diff',
  GIT_LOG: 'git.log',
  GIT_BRANCH_CREATE: 'git.branch.create',
  GIT_BRANCH_SWITCH: 'git.branch.switch',
  GIT_FETCH: 'git.fetch',
  GIT_PULL: 'git.pull',
  GIT_COMMIT: 'git.commit',
  GIT_PUSH: 'git.push',
  GITHUB_PR_CREATE: 'github.pr.create',
  GITHUB_PR_VIEW: 'github.pr.view',
  GITHUB_PR_CHECKS: 'github.pr.checks',
  VSCODE_OPEN_REPOSITORY: 'vscode.openRepository',
  VSCODE_OPEN_FILE: 'vscode.openFile',
  TESTS_DETECT: 'tests.detect',
  TESTS_RUN: 'tests.run',
  BUILD_DETECT: 'build.detect',
  BUILD_RUN: 'build.run',
  ARCHIVE_INSPECT: 'archive.inspect',
  ARCHIVE_EXTRACT: 'archive.extract',
  ARCHIVE_CREATE: 'archive.create',
  ARCHIVE_DELTA: 'archive.delta',
});

const KNOWN_COMMANDS = new Set(Object.values(COMMANDS));
const KNOWN_RISK_LEVELS = new Set(Object.values(RISK_LEVELS));
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class BridgeContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BridgeContractError';
    this.code = code;
  }
}

function isPlainRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneJsonValue(value, seen = new WeakSet(), depth = 0) {
  if (depth > 30) {
    throw new BridgeContractError('INVALID_JSON_VALUE', 'JSON value exceeds the maximum nesting depth.');
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BridgeContractError('INVALID_JSON_VALUE', 'Numbers must be finite.');
    }
    return value;
  }
  if (typeof value !== 'object') {
    throw new BridgeContractError('INVALID_JSON_VALUE', 'Only JSON-compatible values are allowed.');
  }
  if (seen.has(value)) {
    throw new BridgeContractError('INVALID_JSON_VALUE', 'Circular values are not allowed.');
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry) => cloneJsonValue(entry, seen, depth + 1));
    }
    if (!isPlainRecord(value)) {
      throw new BridgeContractError('INVALID_JSON_VALUE', 'Only plain objects are allowed.');
    }
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = cloneJsonValue(entry, seen, depth + 1);
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function validateIdentifier(value, field, required = true) {
  if (value === undefined || value === null || value === '') {
    if (!required) return null;
    throw new BridgeContractError(`INVALID_${field.toUpperCase()}`, `${field} is required.`);
  }
  if (typeof value !== 'string' || !SAFE_IDENTIFIER.test(value)) {
    throw new BridgeContractError(`INVALID_${field.toUpperCase()}`, `${field} contains unsupported characters.`);
  }
  return value;
}

export function isKnownCommand(command) {
  return KNOWN_COMMANDS.has(command);
}

export function isKnownRiskLevel(riskLevel) {
  return KNOWN_RISK_LEVELS.has(riskLevel);
}

export function validateBridgeRequest(input) {
  if (!isPlainRecord(input)) {
    throw new BridgeContractError('INVALID_REQUEST', 'Request must be a plain object.');
  }
  if (input.version !== BRIDGE_PROTOCOL_VERSION) {
    throw new BridgeContractError('UNSUPPORTED_VERSION', `Bridge protocol version ${BRIDGE_PROTOCOL_VERSION} is required.`);
  }

  const requestId = validateIdentifier(input.requestId, 'request_id');
  if (!isKnownCommand(input.command)) {
    throw new BridgeContractError('UNKNOWN_COMMAND', 'Command is not in the approved command catalogue.');
  }
  const repositoryId = validateIdentifier(input.repositoryId, 'repository_id', false);

  const parametersInput = input.parameters === undefined ? {} : input.parameters;
  if (!isPlainRecord(parametersInput)) {
    throw new BridgeContractError('INVALID_PARAMETERS', 'parameters must be a plain object.');
  }
  const parameters = cloneJsonValue(parametersInput);

  const approvalInput = input.approval === undefined ? { grantedRiskLevels: [] } : input.approval;
  if (!isPlainRecord(approvalInput)) {
    throw new BridgeContractError('INVALID_APPROVAL', 'approval must be a plain object.');
  }
  const granted = approvalInput.grantedRiskLevels === undefined ? [] : approvalInput.grantedRiskLevels;
  if (!Array.isArray(granted) || granted.some((risk) => typeof risk !== 'string' || !isKnownRiskLevel(risk))) {
    throw new BridgeContractError('INVALID_APPROVAL', 'grantedRiskLevels contains an unknown risk level.');
  }
  const approval = { grantedRiskLevels: [...new Set(granted)] };

  return {
    version: BRIDGE_PROTOCOL_VERSION,
    requestId,
    command: input.command,
    repositoryId,
    parameters,
    approval,
  };
}

export function createSuccessResponse(requestId, result) {
  return {
    version: BRIDGE_PROTOCOL_VERSION,
    requestId: validateIdentifier(requestId, 'request_id'),
    ok: true,
    result: cloneJsonValue(result),
  };
}

export function createErrorResponse(requestId, code, message) {
  const safeRequestId = typeof requestId === 'string' && SAFE_IDENTIFIER.test(requestId) ? requestId : 'unknown';
  const safeCode = typeof code === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(code) ? code : 'BRIDGE_ERROR';
  const safeMessage = typeof message === 'string' && message.trim() ? message.trim().slice(0, 2000) : 'Bridge request failed.';
  return {
    version: BRIDGE_PROTOCOL_VERSION,
    requestId: safeRequestId,
    ok: false,
    error: { code: safeCode, message: safeMessage },
  };
}
