import test from 'node:test';
import assert from 'node:assert/strict';

let api;
try {
  api = await import('./RepositoryRuntime.js');
} catch (error) {
  assert.fail(`RepositoryRuntime.js must exist: ${error.message}`);
}

const { RepositoryRuntime } = api;

test('repository runtime delegates status to the bridge using structured commands', async () => {
  const calls = [];
  const bridge = {
    async execute(command, input, options) {
      calls.push({ command, input, options });
      return { ok: true, status: 'completed', data: { clean: true } };
    },
  };
  const runtime = new RepositoryRuntime({ bridge });
  const result = await runtime.status('/repo');
  assert.equal(result.ok, true);
  assert.deepEqual(calls[0], {
    command: 'git.status',
    input: { repository: '/repo' },
    options: {},
  });
});

test('repository runtime never exposes arbitrary shell execution', () => {
  const runtime = new RepositoryRuntime({ bridge: { execute() {} } });
  assert.equal('executeShell' in runtime, false);
  assert.equal('runCommand' in runtime, false);
});
