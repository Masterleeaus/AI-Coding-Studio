import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createSessionAuthority } from './session-authority.js';
import { createApprovalGrantAuthority } from './approval-grant-authority.js';
import { createSecureHostCommandRegistry } from './security-context.js';
import { COMMANDS, RISK_LEVELS } from '../protocol.js';

const identity = {
  type: 'chrome-extension',
  id: 'abcdefghijklmnopabcdefghijklmnop',
};

test('secure registry requires identity, allowlisted repository, and a single-use host grant', async () => {
  let sequence = 1;
  const sessionAuthority = createSessionAuthority({
    allowedIdentities: [identity],
    ttlMs: 5000,
    randomBytes: (size) => Buffer.alloc(size, sequence++),
  });
  const approvalGrantAuthority = createApprovalGrantAuthority({
    ttlMs: 5000,
    secret: Buffer.alloc(32, 8),
    randomBytes: (size) => Buffer.alloc(size, sequence++),
  });
  const repository = { repositoryId: 'repo-1', canonicalPath: '/safe/repo' };
  const repositoryAllowlist = {
    async require(repositoryId) {
      if (repositoryId !== 'repo-1') throw new Error('denied');
      return repository;
    },
  };
  const registry = createSecureHostCommandRegistry({
    sessionAuthority,
    approvalGrantAuthority,
    repositoryAllowlist,
  });
  registry.register({
    command: COMMANDS.GIT_PUSH,
    async handler(context) {
      return {
        sessionId: context.identity.sessionId,
        path: context.repository.canonicalPath,
      };
    },
  });

  const session = sessionAuthority.issue({ identity, clientId: 'client-1' });
  const baseRequest = {
    version: 1,
    requestId: 'req-1',
    command: COMMANDS.GIT_PUSH,
    repositoryId: 'repo-1',
    parameters: {},
    auth: {
      sessionId: session.sessionId,
      clientId: session.clientId,
      token: session.token,
    },
  };

  let response = await registry.dispatch(baseRequest, { identity });
  assert.equal(response.error.code, 'APPROVAL_REQUIRED');

  const grant = approvalGrantAuthority.issue({
    sessionId: session.sessionId,
    requestId: 'req-1',
    command: COMMANDS.GIT_PUSH,
    repositoryId: 'repo-1',
    riskLevel: RISK_LEVELS.PUBLISH,
  });
  response = await registry.dispatch({
    ...baseRequest,
    approval: { grantedRiskLevels: [RISK_LEVELS.PUBLISH], grant },
  }, { identity });

  assert.equal(response.ok, true);
  assert.equal(response.result.path, '/safe/repo');

  const replay = await registry.dispatch({
    ...baseRequest,
    approval: { grantedRiskLevels: [RISK_LEVELS.PUBLISH], grant },
  }, { identity });
  assert.equal(replay.error.code, 'APPROVAL_VERIFICATION_FAILED');
});

test('secure registry rejects missing sessions and non-allowlisted repositories', async () => {
  let sequence = 20;
  const sessionAuthority = createSessionAuthority({
    allowedIdentities: [identity],
    ttlMs: 5000,
    randomBytes: (size) => Buffer.alloc(size, sequence++),
  });
  const approvalGrantAuthority = createApprovalGrantAuthority({
    ttlMs: 5000,
    secret: Buffer.alloc(32, 8),
    randomBytes: (size) => Buffer.alloc(size, sequence++),
  });
  const repositoryAllowlist = {
    async require() {
      throw new Error('denied');
    },
  };
  const registry = createSecureHostCommandRegistry({
    sessionAuthority,
    approvalGrantAuthority,
    repositoryAllowlist,
  });
  registry.register({ command: COMMANDS.FILES_READ, async handler() { return {}; } });

  let response = await registry.dispatch({
    version: 1,
    requestId: 'req-no-auth',
    command: COMMANDS.FILES_READ,
    repositoryId: 'repo-x',
    parameters: {},
  }, { identity });
  assert.equal(response.error.code, 'AUTHENTICATION_FAILED');

  const session = sessionAuthority.issue({ identity, clientId: 'client' });
  response = await registry.dispatch({
    version: 1,
    requestId: 'req-denied-repo',
    command: COMMANDS.FILES_READ,
    repositoryId: 'repo-x',
    parameters: {},
    auth: {
      sessionId: session.sessionId,
      clientId: session.clientId,
      token: session.token,
    },
  }, { identity });
  assert.equal(response.error.code, 'REPOSITORY_NOT_ALLOWED');
});
