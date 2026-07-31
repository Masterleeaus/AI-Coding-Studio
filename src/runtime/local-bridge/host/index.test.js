import { test } from 'vitest';
import assert from 'node:assert/strict';
import * as host from './index.js';

test('exports the Node-only host security authority surface', () => {
  assert.equal(typeof host.resolveRepositoryPath, 'function');
  assert.equal(typeof host.createSessionAuthority, 'function');
  assert.equal(typeof host.createApprovalGrantAuthority, 'function');
  assert.equal(typeof host.createJsonRepositoryAllowlistStore, 'function');
  assert.equal(typeof host.createRepositoryAllowlist, 'function');
  assert.equal(typeof host.createHostSecurityContext, 'function');
  assert.equal(typeof host.createSecureHostCommandRegistry, 'function');
});
