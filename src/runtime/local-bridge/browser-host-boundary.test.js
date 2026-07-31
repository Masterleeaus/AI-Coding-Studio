import { test } from 'vitest';
import assert from 'node:assert/strict';
import * as bridge from './index.js';

test('browser-safe bridge exports exclude Node-only host authorities', () => {
  for (const exportName of [
    'resolveRepositoryPath',
    'createSessionAuthority',
    'createApprovalGrantAuthority',
    'createJsonRepositoryAllowlistStore',
    'createRepositoryAllowlist',
    'createHostSecurityContext',
    'createSecureHostCommandRegistry',
  ]) {
    assert.equal(exportName in bridge, false, `${exportName} must remain host-only`);
  }
});
