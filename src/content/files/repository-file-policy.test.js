import { test } from 'vitest';
import assert from 'node:assert/strict';
import { isSensitiveRepositoryPath } from './repository-file-policy.js';

test('rejects environment, credential, private-key, and package auth files', () => {
  for (const path of [
    '.env', '.env.local', 'config/.env.production', '.npmrc', '.pypirc', '.netrc',
    'id_rsa', 'keys/id_ed25519', 'credentials.json', 'service-account.json',
    'private.pem', 'certs/server.key',
  ]) {
    assert.equal(isSensitiveRepositoryPath(path), true, path);
  }
});

test('allows ordinary source and GitHub workflow files', () => {
  for (const path of ['src/index.js', '.github/workflows/verify.yml', 'docs/security.md']) {
    assert.equal(isSensitiveRepositoryPath(path), false, path);
  }
});
