import { createCommandResult } from '../contracts/command-result.js';
import { getCommandDefinition, COMMAND_CATALOG } from './command-catalog.js';

export const BRIDGE_PROTOCOL_VERSION = 1;

export class BridgeContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BridgeContractError';
    this.code = code;
  }
}

export const COMMANDS = Object.freeze(
  Object.fromEntries(
    Object.entries(COMMAND_CATALOG).map(([name]) => [
      name.toUpperCase().replace(/[.-]/g, '_'),
      name,
    ])
  )
);

export const RISK_LEVELS = Object.freeze({
  READ: 'read',
  EXECUTE: 'execute',
  SAFE_EXECUTION: 'execute',
  WRITE: 'write',
  DESTRUCTIVE: 'destructive',
  PUBLISH: 'write',
  PRIVILEGED: 'privileged',
});

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `acs-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createBridgeRequest(command, input = {}, context = {}) {
  const definition = getCommandDefinition(command);
  if (!definition) throw new Error(`Unknown local bridge command: ${command}`);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Local bridge input must be an object');
  }

  return deepFreeze({
    version: BRIDGE_PROTOCOL_VERSION,
    requestId: context.requestId || randomId(),
    command,
    input: structuredClone(input),
    workspaceId: context.workspaceId || null,
    approvalLevel: definition.approvalLevel,
    timeoutMs: context.timeoutMs || definition.timeoutMs,
    createdAt: context.createdAt || Date.now(),
  });
}

export function isKnownCommand(command) {
  return typeof command === 'string' && getCommandDefinition(command) !== null;
}

export function validateBridgeRequest(value) {
  if (!value || typeof value !== 'object') {
    throw new BridgeContractError('INVALID_REQUEST', 'Bridge request must be an object');
  }

  // Validate version
  if (value.version !== BRIDGE_PROTOCOL_VERSION) {
    throw new BridgeContractError('UNSUPPORTED_VERSION', `Unsupported protocol version: ${value.version}`);
  }

  // Validate request ID
  if (!value.requestId || typeof value.requestId !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(value.requestId)) {
    throw new BridgeContractError('INVALID_REQUEST_ID', 'Invalid request ID format');
  }

  // Validate command
  if (!value.command || typeof value.command !== 'string') {
    throw new BridgeContractError('INVALID_COMMAND', 'Command is required');
  }

  if (!getCommandDefinition(value.command)) {
    throw new BridgeContractError('UNKNOWN_COMMAND', `Unknown command: ${value.command}`);
  }

  // Validate parameters
  if (value.parameters !== undefined && (typeof value.parameters !== 'object' || Array.isArray(value.parameters) || value.parameters === null)) {
    throw new BridgeContractError('INVALID_PARAMETERS', 'Parameters must be an object');
  }

  const parameters = value.parameters || {};

  // Check for non-JSON values
  try {
    JSON.stringify(parameters);
  } catch {
    throw new BridgeContractError('INVALID_JSON_VALUE', 'Parameters contain non-JSON values');
  }

  // Check for invalid object prototype
  if (Object.getPrototypeOf(parameters) !== Object.prototype) {
    throw new BridgeContractError('INVALID_PARAMETERS', 'Parameters object has invalid prototype');
  }

  // Check for prototype pollution in keys
  for (const key of Object.keys(parameters)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new BridgeContractError('INVALID_JSON_KEY', 'Invalid object key');
    }
  }

  // Validate authentication if present
  if (value.auth !== undefined) {
    if (typeof value.auth !== 'object' || Array.isArray(value.auth)) {
      throw new BridgeContractError('INVALID_AUTH', 'Auth must be an object');
    }
    if (value.auth.token && (typeof value.auth.token !== 'string' || value.auth.token.length < 43)) {
      throw new BridgeContractError('INVALID_AUTH', 'Token must be a string of at least 43 characters');
    }
  }

  // Validate approval if present
  if (value.approval !== undefined) {
    if (typeof value.approval !== 'object' || Array.isArray(value.approval)) {
      throw new BridgeContractError('INVALID_APPROVAL', 'Approval must be an object');
    }
    if (value.approval.grant && (typeof value.approval.grant !== 'object' || Array.isArray(value.approval.grant))) {
      throw new BridgeContractError('INVALID_APPROVAL', 'Grant must be an object');
    }
  }

  return deepFreeze({
    version: BRIDGE_PROTOCOL_VERSION,
    requestId: value.requestId,
    command: value.command,
    repositoryId: value.repositoryId || undefined,
    parameters,
    auth: value.auth ? deepFreeze({
      sessionId: value.auth.sessionId,
      clientId: value.auth.clientId,
      token: value.auth.token,
    }) : undefined,
    approval: value.approval ? deepFreeze({
      grantedRiskLevels: value.approval.grantedRiskLevels || [],
      grant: value.approval.grant ? deepFreeze(value.approval.grant) : undefined,
    }) : undefined,
  });
}

export function createSuccessResponse(requestId, result) {
  return deepFreeze({
    version: BRIDGE_PROTOCOL_VERSION,
    requestId,
    ok: true,
    result,
  });
}

export function createErrorResponse(requestId, code, message) {
  return deepFreeze({
    version: BRIDGE_PROTOCOL_VERSION,
    requestId,
    ok: false,
    error: { code, message },
  });
}

export function validateBridgeResponse(value, request) {
  if (!value || typeof value !== 'object') throw new Error('Invalid local bridge response');
  if (value.version !== BRIDGE_PROTOCOL_VERSION) throw new Error('Local bridge protocol version mismatch');
  if (value.requestId !== request.requestId) throw new Error('Local bridge response request ID mismatch');
  if (!value.result || typeof value.result !== 'object') throw new Error('Local bridge response is missing result');
  if (value.result.command && value.result.command !== request.command) {
    throw new Error('Local bridge response command mismatch');
  }

  return createCommandResult({
    ...value.result,
    operationId: value.result.operationId || request.requestId,
    command: request.command,
  });
}
