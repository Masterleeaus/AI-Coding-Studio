import { test } from 'vitest';
import assert from 'node:assert/strict';
import { registerReadOnlyAdapters } from './index.js';

test('registers only the approved read-only adapter set', () => {
  const commands = [];
  const registry = {
    register(definition) {
      commands.push(definition.command);
      return this;
    },
  };
  registerReadOnlyAdapters(registry, {
    processRunner: { run() {} },
    hostCwd: '/tmp',
  });
  assert.deepEqual(commands.sort(), [
    'files.hash',
    'files.list',
    'files.read',
    'git.diff',
    'git.log',
    'git.status',
    'search.files',
    'search.text',
    'system.health',
    'tools.list',
  ]);
  assert.equal(
    commands.some((command) => /write|apply|push|commit|create|extract/.test(command)),
    false,
  );
});
