import { test } from 'vitest';
import assert from 'node:assert/strict';
import { COMMANDS, RISK_LEVELS } from './contracts.js';
import { createOperationLog } from './operation-log.js';
import { CommandRegistryError, createCommandRegistry } from './command-registry.js';

function request(command, overrides = {}) {
  return {
    version: 1,
    requestId: 'req-1',
    command,
    repositoryId: 'repo-1',
    parameters: {},
    ...overrides,
  };
}

test('rejects duplicate registration and non-function handlers', () => {
  const registry = createCommandRegistry();
  registry.register({ command: COMMANDS.SYSTEM_HEALTH, riskLevel: RISK_LEVELS.READ, handler: async () => ({ healthy: true }) });
  assert.throws(
    () => registry.register({ command: COMMANDS.SYSTEM_HEALTH, riskLevel: RISK_LEVELS.READ, handler: async () => ({}) }),
    (error) => error instanceof CommandRegistryError && error.code === 'DUPLICATE_COMMAND',
  );
  assert.throws(
    () => registry.register({ command: COMMANDS.FILES_READ, riskLevel: RISK_LEVELS.READ, handler: 'shell command' }),
    (error) => error.code === 'INVALID_HANDLER',
  );
});

test('fails closed for unregistered commands and missing approvals', async () => {
  const registry = createCommandRegistry();
  let response = await registry.dispatch(request(COMMANDS.FILES_READ));
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'COMMAND_NOT_REGISTERED');

  registry.register({ command: COMMANDS.FILES_WRITE, riskLevel: RISK_LEVELS.WRITE, handler: async () => ({ written: true }) });
  response = await registry.dispatch(request(COMMANDS.FILES_WRITE));
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'APPROVAL_REQUIRED');
});

test('validates parameters, dispatches asynchronously, and logs outcomes', async () => {
  let now = 100;
  const operationLog = createOperationLog({ maxEntries: 10 });
  const registry = createCommandRegistry({ operationLog, clock: () => (now += 5) });
  registry.register({
    command: COMMANDS.FILES_READ,
    riskLevel: RISK_LEVELS.READ,
    validateParameters(parameters) {
      if (typeof parameters.path !== 'string') throw new Error('path required');
      return { path: parameters.path.trim() };
    },
    async handler(context) {
      return { path: context.parameters.path, repositoryId: context.repositoryId };
    },
  });

  const bad = await registry.dispatch(request(COMMANDS.FILES_READ));
  assert.equal(bad.error.code, 'INVALID_PARAMETERS');

  const good = await registry.dispatch(request(COMMANDS.FILES_READ, { parameters: { path: ' src/index.js ' } }));
  assert.deepEqual(good, { version: 1, requestId: 'req-1', ok: true, result: { path: 'src/index.js', repositoryId: 'repo-1' } });
  assert.deepEqual(operationLog.list().map((entry) => entry.outcome), ['error', 'success']);
});

test('normalizes handler failures without leaking secrets', async () => {
  const operationLog = createOperationLog();
  const registry = createCommandRegistry({ operationLog });
  registry.register({
    command: COMMANDS.GIT_STATUS,
    riskLevel: RISK_LEVELS.READ,
    async handler() { throw new Error('Authorization: Bearer super-secret-token'); },
  });
  const response = await registry.dispatch(request(COMMANDS.GIT_STATUS));
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'COMMAND_FAILED');
  assert.equal(response.error.message.includes('super-secret-token'), false);
  assert.equal(operationLog.list()[0].error.includes('super-secret-token'), false);
});

test('times out long-running handlers and aborts their signal', async () => {
  let sawAbort = false;
  const registry = createCommandRegistry({ timeoutMs: 5 });
  registry.register({
    command: COMMANDS.TESTS_RUN,
    riskLevel: RISK_LEVELS.SAFE_EXECUTION,
    async handler({ signal }) {
      signal.addEventListener('abort', () => { sawAbort = true; }, { once: true });
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { finished: true };
    },
  });
  const response = await registry.dispatch(request(COMMANDS.TESTS_RUN, {
    approval: { grantedRiskLevels: [RISK_LEVELS.SAFE_EXECUTION] },
  }));
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'COMMAND_TIMEOUT');
  assert.equal(sawAbort, true);
});

test('rejects oversized command results', async () => {
  const registry = createCommandRegistry({ maxResultBytes: 32 });
  registry.register({
    command: COMMANDS.FILES_READ,
    riskLevel: RISK_LEVELS.READ,
    async handler() { return { content: 'x'.repeat(100) }; },
  });
  const response = await registry.dispatch(request(COMMANDS.FILES_READ));
  assert.equal(response.ok, false);
  assert.equal(response.error.code, 'RESULT_TOO_LARGE');
});
