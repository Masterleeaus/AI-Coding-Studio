import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveExistingRepositoryPath } from './realpath-policy.js';

test('resolves existing descendants and rejects traversal and symlink escapes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'acs-realpath-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'src', 'index.js'), 'ok');
  assert.equal(
    (await resolveExistingRepositoryPath(root, 'src/index.js', { type: 'file' })).path,
    join(root, 'src', 'index.js'),
  );
  await assert.rejects(
    () => resolveExistingRepositoryPath(root, '../outside'),
    (error) => error.code === 'PATH_OUTSIDE_REPOSITORY',
  );

  const outside = await mkdtemp(join(tmpdir(), 'acs-outside-'));
  await writeFile(join(outside, 'secret.txt'), 'secret');
  await symlink(join(outside, 'secret.txt'), join(root, 'link.txt'));
  await assert.rejects(
    () => resolveExistingRepositoryPath(root, 'link.txt'),
    (error) => error.code === 'SYMLINK_REJECTED',
  );
});
