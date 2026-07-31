import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  BRIDGE_PROTOCOL_VERSION,
  COMMANDS,
  BridgeContractError,
  validateBridgeRequest,
  createSuccessResponse,
  createErrorResponse,
} from './protocol.js';

test('normalizes a valid bridge request', () => {
  const request = validateBridgeRequest({
    version: BRIDGE_PROTOCOL_VERSION,
    requestId: 'req-1',
    command: COMMANDS.FILES_READ,
    repositoryId: 'repo-1',
    parameters: { path: 'src/index.js' },
    approval: { grantedRiskLevels: ['READ'] },
  });
  assert.deepEqual(request, {
    version: 1,
    requestId: 'req-1',
    command: 'files.read',
    repositoryId: 'repo-1',
    parameters: { path: 'src/index.js' },
    approval: { grantedRiskLevels: ['READ'] },
  });
});

test('rejects unknown commands and malformed parameters', () => {
  assert.throws(
    () => validateBridgeRequest({ version: 1, requestId: 'req', command: 'shell.exec', parameters: {} }),
    (error) => error instanceof BridgeContractError && error.code === 'UNKNOWN_COMMAND',
  );
  assert.throws(
    () => validateBridgeRequest({ version: 1, requestId: 'req', command: COMMANDS.SYSTEM_HEALTH, parameters: [] }),
    (error) => error.code === 'INVALID_PARAMETERS',
  );
});

test('rejects unsupported protocol versions and unsafe identifiers', () => {
  assert.throws(
    () => validateBridgeRequest({ version: 2, requestId: 'req', command: COMMANDS.SYSTEM_HEALTH, parameters: {} }),
    (error) => error.code === 'UNSUPPORTED_VERSION',
  );
  assert.throws(
    () => validateBridgeRequest({ version: 1, requestId: '../req', command: COMMANDS.SYSTEM_HEALTH, parameters: {} }),
    (error) => error.code === 'INVALID_REQUEST_ID',
  );
});

test('rejects non-JSON values and prototype-bearing parameter objects', () => {
  assert.throws(
    () => validateBridgeRequest({ version: 1, requestId: 'req', command: COMMANDS.SYSTEM_HEALTH, parameters: { fn() {} } }),
    (error) => error.code === 'INVALID_JSON_VALUE',
  );
  const parameters = Object.create({ polluted: true });
  parameters.value = 1;
  assert.throws(
    () => validateBridgeRequest({ version: 1, requestId: 'req', command: COMMANDS.SYSTEM_HEALTH, parameters }),
    (error) => error.code === 'INVALID_PARAMETERS',
  );
});

test('creates stable success and error response envelopes', () => {
  assert.deepEqual(createSuccessResponse('req-1', { ok: true }), {
    version: 1,
    requestId: 'req-1',
    ok: true,
    result: { ok: true },
  });
  assert.deepEqual(createErrorResponse('req-2', 'DENIED', 'Approval required'), {
    version: 1,
    requestId: 'req-2',
    ok: false,
    error: { code: 'DENIED', message: 'Approval required' },
  });
});
