import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createJsonRepositoryAllowlistStore,
  createRepositoryAllowlist,
  RepositoryAllowlistError,
} from './repository-allowlist.js';

test('persists canonical repository records and resolves by stable id', async () => {
  const root = await mkdtemp(join(tmpdir(), 'acs-allowlist-'));
  const repo = join(root, 'repo');
  await mkdir(repo);
  const file = join(root, 'allowlist.json');
  const store = createJsonRepositoryAllowlistStore(file);
  const allowlist = createRepositoryAllowlist({ store, clock: () => 1000 });

  await allowlist.load();
  const record = await allowlist.allow({
    repositoryId: 'repo-1',
    path: repo,
    label: 'Example',
  });

  assert.equal(record.repositoryId, 'repo-1');
  assert.equal((await allowlist.require('repo-1')).canonicalPath, record.canonicalPath);
  const persisted = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(persisted.repositories[0].repositoryId, 'repo-1');

  const reloaded = createRepositoryAllowlist({ store, clock: () => 2000 });
  await reloaded.load();
  assert.equal((await reloaded.require('repo-1')).label, 'Example');
});

test('rejects missing paths, duplicate canonical roots and revoked repositories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'acs-allowlist-'));
  const repo = join(root, 'repo');
  await mkdir(repo);
  const allowlist = createRepositoryAllowlist({
    store: createJsonRepositoryAllowlistStore(join(root, 'allowlist.json')),
  });

  await allowlist.load();
  await allowlist.allow({ repositoryId: 'repo-1', path: repo });
  await assert.rejects(
    () => allowlist.allow({ repositoryId: 'repo-2', path: repo }),
    (error) => error instanceof RepositoryAllowlistError && error.code === 'PATH_ALREADY_ALLOWED',
  );

  assert.equal(await allowlist.revoke('repo-1'), true);
  await assert.rejects(
    () => allowlist.require('repo-1'),
    (error) => error.code === 'REPOSITORY_NOT_ALLOWED',
  );
  await assert.rejects(
    () => allowlist.allow({ repositoryId: 'missing', path: join(root, 'missing') }),
    (error) => error.code === 'INVALID_REPOSITORY_PATH',
  );
});
