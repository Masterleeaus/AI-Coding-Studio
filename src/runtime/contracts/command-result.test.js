import test from 'node:test';
import assert from 'node:assert/strict';

let api;
try {
  api = await import('./command-result.js');
} catch (error) {
  assert.fail(`command-result.js must exist: ${error.message}`);
}

const { createCommandResult, createCommandError } = api;

test('createCommandResult returns an immutable normalized completed result', () => {
  const result = createCommandResult({
    operationId: 'op-1',
    command: 'git.status',
    status: 'completed',
    data: { clean: true },
    startedAt: 10,
    completedAt: 20,
  });

  assert.deepEqual(result, {
    ok: true,
    operationId: 'op-1',
    command: 'git.status',
    status: 'completed',
    data: { clean: true },
    artifacts: [],
    warnings: [],
    error: null,
    startedAt: 10,
    completedAt: 20,
    durationMs: 10,
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.data), true);
});

test('createCommandResult rejects unknown statuses', () => {
  assert.throws(
    () => createCommandResult({ operationId: 'op-2', command: 'git.status', status: 'pretend' }),
    /Unsupported command status/,
  );
});

test('createCommandError creates a structured failed result without raw Error objects', () => {
  const result = createCommandError({
    operationId: 'op-3',
    command: 'build.run',
    error: new Error('build failed'),
    startedAt: 10,
    completedAt: 15,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.error, { code: 'COMMAND_FAILED', message: 'build failed', details: null });
  assert.equal(result.durationMs, 5);
});
