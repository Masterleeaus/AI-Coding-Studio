import { createCommandResult } from '../contracts/command-result.js';
import { getCommandDefinition } from './command-catalog.js';

export const BRIDGE_PROTOCOL_VERSION = 1;

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
