import { test } from 'vitest';
import assert from 'node:assert/strict';
import * as host from './index.js';

test('exports the Node-only host security, transport and packaging surface', () => {
  for (const exportName of [
    'resolveRepositoryPath',
    'resolveExistingRepositoryPath',
    'createSessionAuthority',
    'createApprovalGrantAuthority',
    'createJsonRepositoryAllowlistStore',
    'createRepositoryAllowlist',
    'createHostSecurityContext',
    'createSecureHostCommandRegistry',
    'parseNativeCallerIdentity',
    'createNativeMessageDecoder',
    'encodeNativeMessage',
    'createNativeMessagingDispatcher',
    'runNativeMessagingHost',
    'createProcessRunner',
    'createNativeHostManifest',
    'getDefaultHostConfigPath',
    'loadHostConfig',
    'validateHostConfig',
    'createNativeHostRuntime',
    'startNativeHostRuntime',
    'parseHostEntryArguments',
    'runHostEntry',
    'writeFatalDiagnostic',
    'getPerUserManifestLocation',
    'createRegistrationPlan',
    'createUninstallPlan',
    'inspectNativeHostInstallation',
    'parseDoctorArguments',
    'registerReadOnlyAdapters',
  ]) {
    assert.equal(
      typeof host[exportName],
      'function',
      `${exportName} must be exported`,
    );
  }
});
