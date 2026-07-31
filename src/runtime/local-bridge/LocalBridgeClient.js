import { createCommandError } from '../contracts/command-result.js';
import { requiresConfirmation } from '../safety/approval-policy.js';
import { getCommandDefinition } from './command-catalog.js';
import { createBridgeRequest, validateBridgeResponse } from './protocol.js';

export class LocalBridgeClient {
  constructor({
    transport = null,
    approve = null,
    approvalPolicy = { autoApprove: ['read'] },
    requestIdFactory = null,
  } = {}) {
    this.transport = transport;
    this.approve = approve;
    this.approvalPolicy = approvalPolicy;
    this.requestIdFactory = requestIdFactory;
  }

  get available() {
    return Boolean(this.transport && typeof this.transport.request === 'function');
  }

  async execute(command, input = {}, options = {}) {
    const startedAt = Date.now();
    const operationId = options.requestId || this.requestIdFactory?.() || globalThis.crypto?.randomUUID?.() || `acs-${startedAt}`;
    const definition = getCommandDefinition(command);

    if (!definition) {
      return createCommandError({
        operationId,
        command,
        code: 'UNKNOWN_COMMAND',
        error: `Command is not allowlisted: ${command}`,
        startedAt,
      });
    }

    if (!this.available) {
      return createCommandError({
        operationId,
        command,
        status: 'unavailable',
        code: 'BRIDGE_UNAVAILABLE',
        error: 'Local Bridge is not configured',
        startedAt,
      });
    }

    if (requiresConfirmation(command, options.approvalPolicy || this.approvalPolicy)) {
      const approved = this.approve
        ? await this.approve({ command, input, definition, operationId })
        : false;
      if (!approved) {
        return createCommandError({
          operationId,
          command,
          status: 'denied',
          code: 'APPROVAL_REQUIRED',
          error: 'Command was not approved',
          startedAt,
        });
      }
    }

    const request = createBridgeRequest(command, input, {
      requestId: operationId,
      workspaceId: options.workspaceId,
      timeoutMs: options.timeoutMs,
    });

    const timeoutMs = request.timeoutMs;
    const controller = new AbortController();
    const onAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener?.('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('Local Bridge request timed out')), timeoutMs);

    try {
      const response = await this.transport.request(request, {
        signal: controller.signal,
        timeoutMs,
      });
      return validateBridgeResponse(response, request);
    } catch (error) {
      const aborted = controller.signal.aborted;
      return createCommandError({
        operationId,
        command,
        status: aborted ? 'cancelled' : 'failed',
        code: aborted ? 'COMMAND_CANCELLED' : 'BRIDGE_REQUEST_FAILED',
        error,
        startedAt,
      });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener?.('abort', onAbort);
    }
  }
}

export default LocalBridgeClient;
