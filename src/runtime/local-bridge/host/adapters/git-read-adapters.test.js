import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerGitReadAdapters } from './git-read-adapters.js';

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

async function call(definition, repository, parameters = {}) {
  return definition.handler({
    repository,
    parameters: definition.validateParameters(parameters),
    signal: new AbortController().signal,
  });
}

test('uses fixed non-interactive Git argv for status, diff and log', async () => {
  const root = await mkdtemp(join(tmpdir(), 'acs-git-'));
  await writeFile(join(root, 'README.md'), 'hello');
  const calls = [];
  const runner = {
    async run(input) {
      calls.push(input);
      if (input.args.includes('log')) {
        return {
          code: 0,
          stdout: 'abc\tAlice\t2026-01-01T00:00:00Z\tSubject',
          stderr: '',
        };
      }
      return { code: 0, stdout: 'ok', stderr: '' };
    },
  };
  const reg = registry();
  registerGitReadAdapters(reg, { processRunner: runner });
  const repository = { canonicalPath: root };
  await call(reg.definitions.get('git.status'), repository);
  await call(reg.definitions.get('git.diff'), repository, {
    staged: true,
    path: 'README.md',
  });
  const log = await call(reg.definitions.get('git.log'), repository, { limit: 10 });
  assert.equal(log.commits[0].sha, 'abc');
  assert.equal(calls.every((item) => item.executable === 'git'), true);
  assert.equal(calls.every((item) => item.env.GIT_TERMINAL_PROMPT === '0'), true);
  assert.equal(calls[0].args.includes('core.fsmonitor=false'), true);
  assert.equal(calls[1].args.includes('--no-textconv'), true);
  assert.deepEqual(calls[1].args.slice(-4), [
    '--no-color',
    '--cached',
    '--',
    'README.md',
  ]);
});
