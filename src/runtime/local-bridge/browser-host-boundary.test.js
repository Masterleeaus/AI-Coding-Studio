import { test } from 'vitest';
import assert from 'node:assert/strict';
import * as bridge from './index.js';

test('browser-safe bridge exports exclude Node-only host authorities', () => {
  assert.equal(typeof bridge.createNativeMessagingClient, 'function');
  for (const exportName of [
    'resolveRepositoryPath',
    'resolveExistingRepositoryPath',
    'createSessionAuthority',
    'createApprovalGrantAuthority',
    'createJsonRepositoryAllowlistStore',
    'createRepositoryAllowlist',
    'createHostSecurityContext',
    'createSecureHostCommandRegistry',
    'createNativeMessageDecoder',
    'createNativeMessagingDispatcher',
    'runNativeMessagingHost',
    'createProcessRunner',
    'createNativeHostManifest',
    'registerReadOnlyAdapters',
  ]) {
    assert.equal(exportName in bridge, false, `${exportName} must remain host-only`);
  }
});
