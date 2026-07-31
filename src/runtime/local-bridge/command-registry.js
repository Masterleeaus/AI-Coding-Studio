import {
  BridgeContractError,
  createErrorResponse,
  createSuccessResponse,
  isKnownCommand,
  validateBridgeRequest,
} from './protocol.js';
import { isRiskApproved, requiresExplicitApproval } from '../safety/approval-policy.js';
import { getCommandDefinition } from './command-catalog.js';
import { createOperationLog } from './operation-log.js';
import { redactSecrets } from './secret-filter.js';

class CommandExecutionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CommandExecutionError';
    this.code = code;
  }
}

export class CommandRegistryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CommandRegistryError';
    this.code = code;
  }
}

function safeErrorMessage(error) {
  const raw = error instanceof Error ? error.message : String(error || 'Command failed.');
  const redacted = redactSecrets(raw);
  return typeof redacted === 'string' && redacted.trim() ? redacted.trim().slice(0, 2000) : 'Command failed.';
}

export function createCommandRegistry(options = {}) {
  const definitions = new Map();
  const operationLog = options.operationLog || createOperationLog();
  const clock = typeof options.clock === 'function' ? options.clock : Date.now;
  const timeoutMs = options.timeoutMs === undefined ? 30000 : options.timeoutMs;
  const maxResultBytes = options.maxResultBytes === undefined ? 1000000 : options.maxResultBytes;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) {
    throw new RangeError('timeoutMs must be an integer between 1 and 300000.');
  }
  if (!Number.isInteger(maxResultBytes) || maxResultBytes < 1 || maxResultBytes > 100000000) {
    throw new RangeError('maxResultBytes must be an integer between 1 and 100000000.');
  }

  function appendLog({ request, definition, startedAt, outcome, error }) {
    const endedAt = clock();
    operationLog.append({
      timestamp: endedAt,
      requestId: request?.requestId ?? null,
      command: request?.command ?? null,
      repositoryId: request?.repositoryId ?? null,
      riskLevel: definition?.riskLevel ?? null,
      outcome,
      durationMs: Math.max(0, endedAt - startedAt),
      parameters: request?.parameters ?? {},
      error: error ?? null,
    });
  }

  return Object.freeze({
    register(definition) {
      if (!definition || typeof definition !== 'object') {
        throw new CommandRegistryError('INVALID_DEFINITION', 'Command definition must be an object.');
      }
      if (!isKnownCommand(definition.command)) {
        throw new CommandRegistryError('UNKNOWN_COMMAND', 'Only approved command identifiers may be registered.');
      }
      const catalogDefinition = getCommandDefinition(definition.command);
      if (!catalogDefinition) {
        throw new CommandRegistryError('UNKNOWN_COMMAND', 'Command has no authoritative catalog definition.');
      }
      if (definitions.has(definition.command)) {
        throw new CommandRegistryError('DUPLICATE_COMMAND', `Command is already registered: ${definition.command}`);
      }
      if (definition.riskLevel !== undefined && definition.riskLevel !== catalogDefinition.riskLevel) {
        throw new CommandRegistryError('RISK_LEVEL_MISMATCH', 'Command risk level cannot override the authoritative catalog.');
      }
      try {
        requiresExplicitApproval(catalogDefinition.riskLevel);
      } catch (error) {
        throw new CommandRegistryError('INVALID_RISK_LEVEL', error.message);
      }
      if (typeof definition.handler !== 'function') {
        throw new CommandRegistryError('INVALID_HANDLER', 'Command handlers must be functions.');
      }
      if (definition.validateParameters !== undefined && typeof definition.validateParameters !== 'function') {
        throw new CommandRegistryError('INVALID_PARAMETER_VALIDATOR', 'validateParameters must be a function.');
      }
      definitions.set(definition.command, Object.freeze({
        command: definition.command,
        riskLevel: catalogDefinition.riskLevel,
        repositoryRequired: catalogDefinition.repositoryRequired,
        validateParameters: definition.validateParameters || ((parameters) => parameters),
        handler: definition.handler,
      }));
      return this;
    },

    has(command) {
      return definitions.has(command);
    },

    list() {
      return [...definitions.values()].map(({ command, riskLevel, repositoryRequired }) => ({ command, riskLevel, repositoryRequired }));
    },

    async dispatch(rawRequest) {
      const startedAt = clock();
      let request = {
        requestId: typeof rawRequest?.requestId === 'string' ? rawRequest.requestId : 'unknown',
        command: typeof rawRequest?.command === 'string' ? rawRequest.command : null,
        repositoryId: typeof rawRequest?.repositoryId === 'string' ? rawRequest.repositoryId : null,
        parameters: rawRequest?.parameters && typeof rawRequest.parameters === 'object' ? rawRequest.parameters : {},
      };
      let definition = null;

      try {
        request = validateBridgeRequest(rawRequest);
      } catch (error) {
        const code = error instanceof BridgeContractError ? error.code : 'INVALID_REQUEST';
        const message = safeErrorMessage(error);
        appendLog({ request, definition, startedAt, outcome: 'error', error: message });
        return createErrorResponse(request.requestId, code, message);
      }

      definition = definitions.get(request.command) || null;
      if (!definition) {
        const message = 'Command has no registered local handler.';
        appendLog({ request, definition, startedAt, outcome: 'error', error: message });
        return createErrorResponse(request.requestId, 'COMMAND_NOT_REGISTERED', message);
      }

      if (definition.repositoryRequired && !request.repositoryId) {
        const message = 'A repositoryId is required for this command.';
        appendLog({ request, definition, startedAt, outcome: 'error', error: message });
        return createErrorResponse(request.requestId, 'REPOSITORY_REQUIRED', message);
      }

      if (!isRiskApproved(definition.riskLevel, request.approval)) {
        const message = `Explicit ${definition.riskLevel} approval is required.`;
        appendLog({ request, definition, startedAt, outcome: 'denied', error: message });
        return createErrorResponse(request.requestId, 'APPROVAL_REQUIRED', message);
      }

      let parameters;
      try {
        parameters = await definition.validateParameters(request.parameters);
        if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
          throw new Error('Parameter validator must return a plain object.');
        }
      } catch (error) {
        const message = safeErrorMessage(error);
        appendLog({ request, definition, startedAt, outcome: 'error', error: message });
        return createErrorResponse(request.requestId, 'INVALID_PARAMETERS', message);
      }

      const controller = new AbortController();
      let timer = null;
      try {
        const handlerPromise = Promise.resolve().then(() => definition.handler(Object.freeze({
          requestId: request.requestId,
          command: request.command,
          repositoryId: request.repositoryId,
          parameters,
          riskLevel: definition.riskLevel,
          signal: controller.signal,
        })));
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new CommandExecutionError('COMMAND_TIMEOUT', `Command exceeded the ${timeoutMs} ms timeout.`));
          }, timeoutMs);
        });
        const result = await Promise.race([handlerPromise, timeoutPromise]);
        const serialized = JSON.stringify(result);
        const byteLength = new TextEncoder().encode(serialized === undefined ? 'null' : serialized).byteLength;
        if (byteLength > maxResultBytes) {
          throw new CommandExecutionError('RESULT_TOO_LARGE', `Command result exceeds the ${maxResultBytes} byte limit.`);
        }
        const response = createSuccessResponse(request.requestId, result);
        appendLog({ request: { ...request, parameters }, definition, startedAt, outcome: 'success' });
        return response;
      } catch (error) {
        const message = safeErrorMessage(error);
        const code = error instanceof CommandExecutionError ? error.code : 'COMMAND_FAILED';
        appendLog({ request: { ...request, parameters }, definition, startedAt, outcome: 'error', error: message });
        return createErrorResponse(request.requestId, code, message);
      } finally {
        if (timer !== null) clearTimeout(timer);
      }
    },

    getOperationLog() {
      return operationLog;
    },
  });
}
