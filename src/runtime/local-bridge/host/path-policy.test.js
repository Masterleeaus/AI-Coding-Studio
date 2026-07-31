import { test } from 'vitest';
import assert from 'node:assert/strict';
import { RepositoryPathError, resolveRepositoryPath } from './path-policy.js';

test('resolves a POSIX path inside the repository', () => {
  assert.equal(resolveRepositoryPath('/work/repo', 'src/index.js'), '/work/repo/src/index.js');
});

test('rejects traversal, absolute paths, and sibling-prefix escapes', () => {
  for (const requestedPath of ['../secret', 'src/../../secret', '/etc/passwd', '\\server\share']) {
    assert.throws(
      () => resolveRepositoryPath('/work/repo', requestedPath),
      (error) => error instanceof RepositoryPathError,
    );
  }
});

test('handles Windows roots and rejects drive-qualified requests', () => {
  assert.equal(
    resolveRepositoryPath('C:\\work\\repo', 'src\\index.js'),
    'C:\\work\\repo\\src\\index.js',
  );
  assert.throws(
    () => resolveRepositoryPath('C:\\work\\repo', 'D:\\secret.txt'),
    (error) => error.code === 'ABSOLUTE_PATH_NOT_ALLOWED',
  );
});

test('root access requires an explicit option', () => {
  assert.throws(
    () => resolveRepositoryPath('/work/repo', ''),
    (error) => error.code === 'ROOT_ACCESS_NOT_ALLOWED',
  );
  assert.equal(resolveRepositoryPath('/work/repo', '', { allowRoot: true }), '/work/repo');
});
