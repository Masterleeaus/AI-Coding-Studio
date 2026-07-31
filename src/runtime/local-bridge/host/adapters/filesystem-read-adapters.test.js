import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerFilesystemReadAdapters } from './filesystem-read-adapters.js';

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

async function call(definition, repository, parameters) {
  const normalized = definition.validateParameters(parameters);
  return definition.handler({
    repository,
    parameters: normalized,
    signal: new AbortController().signal,
  });
}

test('lists, reads, hashes and searches repository files while excluding sensitive paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'acs-files-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'src', 'index.js'), 'hello world\nsecond line');
  await writeFile(join(root, '.env'), 'TOKEN=secret');
  const repository = { canonicalPath: root };
  const reg = registry();
  registerFilesystemReadAdapters(reg);

  const listed = await call(reg.definitions.get('files.list'), repository, {
    recursive: true,
  });
  assert.equal(listed.entries.some((entry) => entry.path === '.env'), false);
  assert.equal(
    (await call(reg.definitions.get('files.read'), repository, {
      path: 'src/index.js',
    })).content.includes('hello'),
    true,
  );
  assert.equal(
    (await call(reg.definitions.get('files.hash'), repository, {
      path: 'src/index.js',
    })).digest.length,
    64,
  );
  assert.deepEqual(
    (await call(reg.definitions.get('search.files'), repository, {
      query: 'index',
    })).results.map((item) => item.path),
    ['src/index.js'],
  );
  assert.equal(
    (await call(reg.definitions.get('search.text'), repository, {
      query: 'second',
    })).results[0].line,
    2,
  );
  await assert.rejects(
    () => call(reg.definitions.get('files.read'), repository, { path: '.env' }),
    /Sensitive/,
  );
});
