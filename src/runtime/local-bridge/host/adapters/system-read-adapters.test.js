import { test } from 'vitest';
import assert from 'node:assert/strict';
import { registerSystemReadAdapters } from './system-read-adapters.js';

function registry() {
  const definitions = new Map();
  return {
    definitions,
    register(definition) {
      definitions.set(definition.command, definition);
      return this;
    },
  };
}

test('reports bounded health and fixed tool probes', async () => {
  const calls = [];
  const reg = registry();
  registerSystemReadAdapters(reg, {
    hostCwd: '/tmp',
    hostVersion: '1.2.3',
    processRunner: {
      async run(input) {
        calls.push(input);
        return {
          code: input.executable === 'git' ? 0 : 1,
          stdout: input.executable === 'git' ? 'git version 2.50' : '',
          stderr: '',
        };
      },
    },
  });
  const health = await reg.definitions.get('system.health').handler({});
  assert.equal(health.mode, 'read-only');
  const tools = await reg.definitions.get('tools.list').handler({ signal: new AbortController().signal });
  assert.equal(tools.tools.find((tool) => tool.id === 'git').available, true);
  assert.deepEqual(calls.map((call) => [call.executable, call.args]), [
    ['git', ['--version']],
    ['code', ['--version']],
    ['rg', ['--version']],
  ]);
});
